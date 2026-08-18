// La memoria del pase de comentarios comunes.
//
// Dos preguntas que no puede contestar el ledger del bot de respuestas: "¿en qué hilos ya hablé sin
// enlace?" y "¿este sub me está borrando?". La segunda es la que dirige el trabajo: no hay forma de
// saber de antemano qué AutoModerator filtra cuentas nuevas, y preguntarle a Reddit por las reglas
// devuelve prosa, no umbrales. Se aprende comentando y mirando si el comentario sigue ahí.

import { RedditSocialCommentModel, type RedditSocialCommentDoc } from "../../models/RedditSocialComment";
import { RedditBotReplyModel } from "../../models/RedditBotReply";
import type { SocialConfig } from "./config";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SocialSnapshot {
  postedLast24h: Array<{ sub: string; author: string; postedAt: Date }>;
  lastPostedAt: Date | null;
}

export async function socialSnapshot(cfg?: SocialConfig): Promise<SocialSnapshot> {
  // La ventana tiene que cubrir el freno más largo que se calcula sobre ella. El cooldown por
  // autor es de 48 h y el snapshot traía 24: la mitad del freno no existía, y nadie lo iba a notar
  // porque el síntoma es "le comentó dos veces a la misma persona", que se ve como casualidad.
  const span = Math.max(DAY_MS, (cfg?.authorCooldownHours ?? 0) * 3_600_000);
  const since = new Date(Date.now() - span);
  const rows = await RedditSocialCommentModel.find({ status: "posted", postedAt: { $gte: since } })
    .select({ sub: 1, author: 1, postedAt: 1 })
    .lean<Array<{ sub: string; author: string; postedAt: Date }>>();
  const [latest] = await RedditSocialCommentModel.find({ status: "posted" })
    .sort({ postedAt: -1 })
    .limit(1)
    .select({ postedAt: 1 })
    .lean<Array<{ postedAt: Date }>>();
  return { postedLast24h: rows, lastPostedAt: latest?.postedAt ?? null };
}

/**
 * Hilos donde la cuenta ya habló, por cualquiera de las dos vías.
 *
 * Consulta las DOS colecciones. Son caminos separados con reglas separadas, pero para la persona
 * que lee el hilo hay una sola cuenta, y verla comentar dos veces —una con un chiste y otra con un
 * enlace— es la definición de la cuenta que uno reporta.
 */
export async function alreadyEngaged(postIds: readonly string[]): Promise<Set<string>> {
  if (!postIds.length) return new Set();
  const ids = [...postIds];
  // status "posted" en las DOS, y no cualquier fila.
  //
  // El ledger de respuestas guarda una fila por cada hilo que ese bot DECIDIÓ, y la enorme mayoría
  // son rechazos: "no es tema nuestro", "muy viejo", "el sitio no lo cubre". Contarlas como "ya
  // comentamos" descartó 172 de 175 hilos en el primer ensayo — casi todo Reddit, por no haberle
  // contestado. Es el mismo error que ya se arregló una vez del otro lado: "lo miré" y "hablé" son
  // preguntas distintas, y sólo la segunda es la que no puede contestarse dos veces.
  const [social, replies] = await Promise.all([
    // "failed" también: un comentario que Reddit no confirmó puede existir igual, y volver a
    // escribir sobre ese hilo es el único error de este pase que el lector ve como spam evidente.
    RedditSocialCommentModel.find({ postId: { $in: ids }, status: { $in: ["posted", "dry_run", "failed"] } })
      .select({ postId: 1 })
      .lean<Array<{ postId: string }>>(),
    RedditBotReplyModel.find({ postId: { $in: ids }, status: "posted" })
      .select({ postId: 1 })
      .lean<Array<{ postId: string }>>(),
  ]);
  return new Set([...social, ...replies].map((r) => r.postId));
}

export type SocialWrite = Partial<RedditSocialCommentDoc> & { postId: string };

export async function recordSocial(row: SocialWrite): Promise<void> {
  await RedditSocialCommentModel.updateOne({ postId: row.postId }, { $set: row }, { upsert: true });
}

/** Comentarios publicados cuya visibilidad pública todavía no se confirmó (o se miró hace rato). */
export async function needsVisibilityCheck(limit = 20): Promise<Array<{ postId: string; sub: string; commentFullname: string }>> {
  const stale = new Date(Date.now() - 6 * 60 * 60 * 1000);
  return RedditSocialCommentModel.find({
    status: "posted",
    commentFullname: { $ne: "" },
    $or: [{ visible: null }, { checkedAt: null }, { checkedAt: { $lt: stale }, visible: true }],
  })
    .sort({ postedAt: -1 })
    .limit(limit)
    .select({ postId: 1, sub: 1, commentFullname: 1 })
    .lean<Array<{ postId: string; sub: string; commentFullname: string }>>();
}

export async function markVisibility(postId: string, visible: boolean, score: number): Promise<void> {
  await RedditSocialCommentModel.updateOne({ postId }, { $set: { visible, score, checkedAt: new Date() } });
}

/**
 * Subs que están borrando lo que escribimos.
 *
 * Se miran los últimos comentarios de cada sub, más nuevos primero: `subBlockStrikes` invisibles
 * seguidos y ese sub queda afuera por `subBlockDays`. Los que todavía no se verificaron no cuentan
 * ni a favor ni en contra — un `visible: null` es "no sé", y tratarlo como borrado apagaría un sub
 * sano en la primera corrida.
 */
export async function blockedSubs(cfg: SocialConfig): Promise<Map<string, number>> {
  const since = new Date(Date.now() - cfg.subBlockDays * DAY_MS);

  // La evidencia de los DOS bots, no la de uno.
  //
  // Un sub que borra por AutoModerator borra todo lo que escribe la cuenta, no sólo lo de este
  // pase. r/uruguay ya había borrado la respuesta con fuentes del otro bot cuando este llegó a
  // gastar un comentario ahí para descubrir lo mismo. El vigilante ya marca `removed` en esas
  // filas; leerlas cuesta una consulta y ahorra un comentario por sub.
  const [propios, ajenos] = await Promise.all([
    RedditSocialCommentModel.find({ status: "posted", postedAt: { $gte: since } })
      .sort({ postedAt: -1 })
      .select({ sub: 1, visible: 1, postedAt: 1 })
      .lean<Array<{ sub: string; visible: boolean | null; postedAt: Date }>>(),
    RedditBotReplyModel.find({ status: "posted", postedAt: { $gte: since }, checkedAt: { $ne: null } })
      .sort({ postedAt: -1 })
      .select({ sub: 1, removed: 1, postedAt: 1 })
      .lean<Array<{ sub: string; removed: boolean; postedAt: Date }>>(),
  ]);

  const rows = [...propios, ...ajenos.map((row) => ({ sub: row.sub, visible: !row.removed, postedAt: row.postedAt }))].sort(
    (a, b) => (b.postedAt?.getTime() ?? 0) - (a.postedAt?.getTime() ?? 0)
  );

  // Claves en minúscula: r/AskUruguayan y "askuruguayan" son el mismo sub, y la lista de la env
  // no tiene por qué venir con la grafía exacta de Reddit. Comparar tal cual dejaba activo un sub
  // que nos estaba borrando sólo por una mayúscula.
  const streak = new Map<string, number>();
  const done = new Set<string>();
  for (const row of rows) {
    const key = (row.sub || "").toLowerCase();
    if (done.has(key) || row.visible === null || row.visible === undefined) continue;
    if (row.visible) {
      done.add(key);
      continue;
    }
    streak.set(key, (streak.get(key) ?? 0) + 1);
  }
  return new Map([...streak].filter(([, n]) => n >= cfg.subBlockStrikes));
}
