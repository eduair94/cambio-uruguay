// Qué contestó el bot de Reddit, contado y guardado.
//
// La fuente es el ledger, que ya tiene una fila por hilo evaluado. Lo que este módulo agrega no es
// información nueva: es DURABILIDAD y forma. El ledger es memoria operativa —existe para que el bot
// no re-evalúe lo mismo— y el día que alguien borre las filas rechazadas viejas, cosa perfectamente
// razonable, el histórico se iría con ellas. Por eso los días se MEZCLAN contra lo ya guardado en
// vez de recalcularse enteros: un día registrado sobrevive a la desaparición de sus filas.
//
// La otra mitad de la decisión es qué se publica. La página es pública, así que acá se elige, una
// sola vez y en un solo lugar, qué sale: el sub, el título del hilo, su enlace, la página que
// enlazamos y el texto de nuestro comentario. NO sale el autor del hilo. Es información que Reddit
// ya publica, pero republicar la lista de quiénes preguntaron por plata, agrupada y buscable, es
// otra cosa que enlazar un hilo — y no hace falta para nada de lo que la página quiere mostrar.

import { RedditBotReplyModel, type RedditBotReplyDoc } from "../models/RedditBotReply";
import { RedditBotStatsModel, type RedditStatsAnswer, type RedditStatsCount, type RedditStatsDay } from "../models/RedditBotStats";
import { botConfig } from "../redditbot/config";

/** Cuántos hilos contestados listar. Suficiente para auditar sin volver la página un volcado. */
const MAX_ANSWERS = 60;
/** Cuántas preguntas sin respuesta mostrar. Son el material de las páginas que faltan. */
const MAX_OPEN = 25;
/** Tope de cada ranking. */
const MAX_COUNTS = 20;

export const dayKey = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Fusionar los días recién calculados con los ya guardados.
 *
 * El recién calculado gana cuando existe: es el que vio las filas. El guardado sobrevive cuando el
 * nuevo no lo trae, que es exactamente el caso de un día cuyas filas ya no están.
 *
 * Exportada porque es la regla entera de "esto es un registro" y merece su propio test.
 */
export function mergeDays(stored: readonly RedditStatsDay[], fresh: readonly RedditStatsDay[]): RedditStatsDay[] {
  const byDate = new Map<string, RedditStatsDay>();
  for (const day of stored) byDate.set(day.date, day);
  for (const day of fresh) byDate.set(day.date, day);
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Un ranking a partir de un contador, más grande primero. */
function rank(counts: Map<string, number>, limit = MAX_COUNTS): RedditStatsCount[] {
  return [...counts.entries()]
    .filter(([name]) => name)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

const bump = (map: Map<string, number>, key: string, by = 1): void => {
  map.set(key, (map.get(key) ?? 0) + by);
};

export interface StatsResult {
  answered: number;
  evaluated: number;
  days: number;
}

/**
 * Recalcular la foto y guardarla.
 *
 * Lee TODAS las filas: son unas pocas miles y crecen unos cientos por día, así que paginar sería
 * complejidad sin beneficio. Si algún día deja de ser cierto, el cambio es acotado — el histórico ya
 * está guardado y sólo haría falta limitar la ventana que se recalcula.
 */
export async function refreshRedditStats(): Promise<StatsResult> {
  const rows = await RedditBotReplyModel.find({ postId: { $not: /^__paused__/ } })
    .select({
      account: 1,
      sub: 1,
      status: 1,
      rejectReason: 1,
      pagePath: 1,
      postTitle: 1,
      postPermalink: 1,
      postCreatedUtc: 1,
      postedAt: 1,
      commentScore: 1,
      removed: 1,
      selfDeleted: 1,
      replyText: 1,
      createdAt: 1,
    })
    .lean<Array<RedditBotReplyDoc & { createdAt?: Date }>>();

  const perDay = new Map<string, RedditStatsDay>();
  const dayOf = (date: string): RedditStatsDay => {
    let day = perDay.get(date);
    if (!day) {
      day = { date, posted: 0, rejected: 0, gaps: 0, score: 0, removed: 0 };
      perDay.set(date, day);
    }
    return day;
  };

  const bySub = new Map<string, number>();
  const byPage = new Map<string, number>();
  const byReason = new Map<string, number>();
  const answers: RedditStatsAnswer[] = [];
  const open: Array<{ title: string; sub: string; permalink: string; createdUtc: number }> = [];

  let answered = 0;
  let gaps = 0;
  let score = 0;
  let removed = 0;

  for (const row of rows) {
    // La fecha del hecho, no la de la fila: un comentario se cuenta el día que se publicó.
    const when = row.postedAt ?? row.createdAt ?? null;
    const date = when ? dayKey(new Date(when)) : "";

    // Un comentario que retiramos nosotros no cuenta como nada: no fue contestado (lo deshicimos) y
    // no fue borrado por nadie. Contarlo entre los `removed` le atribuiría a un moderador una
    // decisión nuestra, justo en la página cuyo punto es no mentir sobre esto.
    if (row.status === "posted" && (row as { selfDeleted?: boolean }).selfDeleted) continue;

    if (row.status === "posted") {
      answered++;
      score += row.commentScore ?? 0;
      if (row.removed) removed++;
      bump(bySub, row.sub);
      bump(byPage, row.pagePath);
      if (date) {
        const day = dayOf(date);
        day.posted++;
        day.score += row.commentScore ?? 0;
        if (row.removed) day.removed++;
      }
      answers.push({
        postTitle: row.postTitle ?? "",
        postPermalink: row.postPermalink ?? "",
        sub: row.sub ?? "",
        pagePath: row.pagePath ?? "",
        postedAt: row.postedAt ?? null,
        score: row.commentScore ?? 0,
        removed: Boolean(row.removed),
        replyText: row.replyText ?? "",
      });
      continue;
    }

    if (row.status === "rejected") {
      const reason = row.rejectReason || "sin motivo";
      bump(byReason, reason);
      if (date) dayOf(date).rejected++;

      // Un `gap:` no es un descarte cualquiera: es una pregunta que el sitio no supo contestar, que
      // es lo único de esta página que dice qué escribir después.
      if (reason.startsWith("gap:")) {
        gaps++;
        if (date) dayOf(date).gaps++;
        open.push({
          title: row.postTitle ?? "",
          sub: row.sub ?? "",
          permalink: row.postPermalink ?? "",
          createdUtc: row.postCreatedUtc ?? 0,
        });
      }
    }
  }

  answers.sort((a, b) => (b.postedAt?.getTime?.() ?? 0) - (a.postedAt?.getTime?.() ?? 0));
  open.sort((a, b) => b.createdUtc - a.createdUtc);

  const stored = await RedditBotStatsModel.findOne({ key: "reddit" }).select({ days: 1 }).lean<{ days?: RedditStatsDay[] }>();
  const days = mergeDays(stored?.days ?? [], [...perDay.values()]);

  const doc = {
    key: "reddit",
    asOf: new Date(),
    account: botConfig().username,
    totals: {
      answered,
      evaluated: rows.length,
      gaps,
      subs: bySub.size,
      pages: byPage.size,
      score,
      removed,
      alive: Math.max(0, answered - removed),
    },
    since: days[0]?.date ?? "",
    days,
    bySub: rank(bySub),
    byPage: rank(byPage),
    byRejectReason: rank(byReason),
    answers: answers.slice(0, MAX_ANSWERS),
    openQuestions: open.slice(0, MAX_OPEN),
  };

  await RedditBotStatsModel.updateOne({ key: "reddit" }, { $set: doc }, { upsert: true });

  return { answered, evaluated: rows.length, days: days.length };
}
