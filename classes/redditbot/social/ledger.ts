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

export async function socialSnapshot(): Promise<SocialSnapshot> {
  const since = new Date(Date.now() - DAY_MS);
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
  const [social, replies] = await Promise.all([
    RedditSocialCommentModel.find({ postId: { $in: ids } }).select({ postId: 1 }).lean<Array<{ postId: string }>>(),
    RedditBotReplyModel.find({ postId: { $in: ids }, status: { $ne: "waiting_page" } })
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
  const rows = await RedditSocialCommentModel.find({ status: "posted", postedAt: { $gte: since } })
    .sort({ postedAt: -1 })
    .select({ sub: 1, visible: 1 })
    .lean<Array<{ sub: string; visible: boolean | null }>>();

  const streak = new Map<string, number>();
  const done = new Set<string>();
  for (const row of rows) {
    if (done.has(row.sub) || row.visible === null || row.visible === undefined) continue;
    if (row.visible) {
      done.add(row.sub);
      continue;
    }
    streak.set(row.sub, (streak.get(row.sub) ?? 0) + 1);
  }
  return new Map([...streak].filter(([, n]) => n >= cfg.subBlockStrikes));
}
