// El buzón del sitio (`sitefeedbacks`, base del app): las respuestas del "¿Te sirvió?" y cuántas
// sugerencias, errores y elogios llegaron por página.
//
// SIN MODELO EN EL BACKEND, A PROPÓSITO: un espejo de `SiteFeedback` traería `message` y `email` a la
// superficie del backend. Se agrega con el driver y cada pipeline proyecta justo después del `$match`.
// `message`, `email`, `userAgent` y `tech` no se leen nunca. `clientId` (un id al azar por navegador)
// sólo entra al `$group` de `byPath` y sale de ahí convertido en un CONTEO de personas distintas (R20):
// ninguna etapa posterior lo nombra y ningún documento devuelto lo lleva. Todas las respuestas con
// `clientId` nulo cuentan como UNA persona, que es errar hacia no marcar.
import type { BlockOutcome } from "../blocks";
import { FEEDBACK_DAILY, FEEDBACK_PAGES } from "../caps";
import { dayBoundsUtc, insightFamily, sitePath } from "../paths";
import type { DayWindow, FeedbackData } from "../types";

export const BY_PATH_PROJECT = { _id: 0, path: 1, kind: 1, helpful: 1, createdAt: 1, clientId: 1 } as const;
export const BY_DAY_PROJECT = { _id: 0, kind: 1, helpful: 1, createdAt: 1 } as const;
export const BY_PATH_FINAL = { _id: 1, n: 1, last: 1, distinct: { $size: "$ids" } } as const;

export const FEEDBACK_PIPELINES = {
  byPath: (from: Date, to: Date): any[] => [
    { $match: { createdAt: { $gte: from, $lt: to } } },
    { $project: { ...BY_PATH_PROJECT } },
    {
      $group: {
        _id: { path: "$path", kind: "$kind", helpful: "$helpful" },
        n: { $sum: 1 },
        last: { $max: "$createdAt" },
        ids: { $addToSet: { $ifNull: ["$clientId", "__sin_id__"] } },
      },
    },
    { $project: { ...BY_PATH_FINAL } },
  ],
  byDay: (from: Date, to: Date): any[] => [
    { $match: { createdAt: { $gte: from, $lt: to } } },
    { $project: { ...BY_DAY_PROJECT } },
    {
      $group: {
        _id: {
          day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "America/Montevideo" } },
          kind: "$kind",
          helpful: "$helpful",
        },
        n: { $sum: 1 },
      },
    },
  ],
};

export interface FeedbackGroupRow {
  _id: { path?: string; kind?: string; helpful?: string | null; day?: string };
  n: number;
  last?: Date | string;
  distinct?: number;
}

const iso = (v: Date | string | undefined) => (v ? new Date(v as any).toISOString() : "");

/** Puro: las filas agrupadas → el bloque. Las rutas que `sitePath` une suman `n` y se quedan con el `distinct` mayor. */
export function buildFeedbackBlock(byPath: FeedbackGroupRow[], byDay: FeedbackGroupRow[]): FeedbackData {
  const totals = { helpfulYes: 0, helpfulNo: 0, suggestion: 0, bug: 0, praise: 0 };
  type P = FeedbackData["pages"][number];
  const pages = new Map<string, P>();
  for (const row of byPath) {
    const path = sitePath(row._id?.path || "/") || "/";
    const kind = String(row._id?.kind || "");
    const helpful = row._id?.helpful ?? null;
    const n = Number(row.n) || 0;
    const distinct = Number(row.distinct) || 0;
    const p =
      pages.get(path) ||
      ({
        path,
        family: insightFamily(path),
        helpfulYes: 0,
        helpfulNo: 0,
        distinctYes: 0,
        distinctNo: 0,
        suggestion: 0,
        bug: 0,
        praise: 0,
        last: "",
      } as P);
    if (kind === "helpful" && helpful === "yes") {
      p.helpfulYes += n;
      p.distinctYes = Math.max(p.distinctYes, distinct);
      totals.helpfulYes += n;
    } else if (kind === "helpful" && helpful === "no") {
      p.helpfulNo += n;
      p.distinctNo = Math.max(p.distinctNo, distinct);
      totals.helpfulNo += n;
    } else if (kind === "suggestion" || kind === "bug" || kind === "praise") {
      p[kind] += n;
      totals[kind] += n;
    } else continue;
    const last = iso(row.last);
    if (last > p.last) p.last = last;
    pages.set(path, p);
  }
  const days = new Map<string, FeedbackData["daily"][number]>();
  for (const row of byDay) {
    const day = String(row._id?.day || "");
    if (!day) continue;
    const e = days.get(day) || { day, helpfulYes: 0, helpfulNo: 0, written: 0 };
    const kind = String(row._id?.kind || "");
    const n = Number(row.n) || 0;
    if (kind === "helpful" && row._id?.helpful === "yes") e.helpfulYes += n;
    else if (kind === "helpful" && row._id?.helpful === "no") e.helpfulNo += n;
    else if (kind === "suggestion" || kind === "bug" || kind === "praise") e.written += n;
    days.set(day, e);
  }
  return {
    totals,
    pages: [...pages.values()]
      .sort(
        (a, b) =>
          b.helpfulYes + b.helpfulNo + b.suggestion + b.bug + b.praise - (a.helpfulYes + a.helpfulNo + a.suggestion + a.bug + a.praise)
      )
      .slice(0, FEEDBACK_PAGES),
    daily: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)).slice(-FEEDBACK_DAILY),
  };
}

export type Aggregate = (pipeline: any[]) => Promise<FeedbackGroupRow[]>;

export async function runFeedback(window: DayWindow, aggregate: Aggregate | null): Promise<BlockOutcome<FeedbackData>> {
  if (!aggregate) return { kind: "skipped", note: "sin APP_MONGO_URI (dry run)" };
  const from = new Date(dayBoundsUtc(window.start).geq);
  const to = new Date(dayBoundsUtc(window.end).lt);
  const [byPath, byDay] = await Promise.all([
    aggregate(FEEDBACK_PIPELINES.byPath(from, to)),
    aggregate(FEEDBACK_PIPELINES.byDay(from, to)),
  ]);
  // Cero filas es una respuesta real (nadie contestó), así que no hay guarda de "flaco".
  return { kind: "ok", data: buildFeedbackBlock(byPath, byDay), window, rowsSeen: { byPath: byPath.length, byDay: byDay.length } };
}
