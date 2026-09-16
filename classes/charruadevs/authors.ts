// Ranking de autores por la orientación de sus opiniones sobre el mercado IT. Puro.
//
// Dos decisiones que cambian quién encabeza:
//
//  1. **Media encogida, no media cruda.** `score = (media·n + prior·K) / (n + K)` con `prior` la
//     media del sub y `K = 30`. Sin esto el ranking lo gana una cuenta con cuatro opiniones: con
//     n chico la media es ruido, y el encogimiento la devuelve al promedio hasta que haya evidencia.
//     El umbral `MIN_OPS` es OTRA cosa y hace falta igual: uno ordena, el otro decide quién entra.
//  2. **Sin ponderar por mes.** El resto del análisis pesa cada comentario por
//     candidatos/clasificados de su mes, que corrige la COBERTURA de la clasificación. Acá se cuenta
//     gente, y un mes con huecos no hace que alguien haya opinado 1,3 veces.
//
// Karma: se mira el karma de las opiniones negativas y el de las positivas por separado (`negK` /
// `posK`). El karma total mezcla las dos y hace que "pesimismo más votado" lo encabece un optimista
// con un comentario viral.
import type { Theme } from "./types";

/** Mínimo de opiniones para entrar en una tabla con nombre y apellido. */
export const AUTHOR_MIN_OPS = 25;
/** Opiniones "promedio" que hacen falta antes de creerle la media a alguien. */
export const AUTHOR_SHRINK_K = 30;
/** Mínimo para contar a alguien en los agregados de orientación y de karma. */
const MIN_ORIENT_OPS = 20;
/** Mínimo por ventana para decir que alguien se movió. */
const MIN_WINDOW_OPS = 15;
/** Un autor es "mayormente" negativo o positivo recién con esta diferencia de porcentajes. */
const LEAN = 0.1;
/** Δ de media entre ventanas que deja de ser ruido. */
const SHIFT = 0.1;

const YEAR = 365 * 86400000;

/** Ni bots ni cuentas borradas: no son voces del sub. */
export function isRankableAuthor(author: string | null | undefined): boolean {
  if (!author) return false;
  const a = author.trim();
  if (!a) return false;
  return a !== "AutoModerator" && a !== "[deleted]" && a !== "[removed]";
}

export interface AuthorUnit {
  author?: string | null;
  kind: "post" | "comment";
  rel: boolean;
  stance: number | null;
  score: number;
  themes: Theme[];
  t: number;
}

export interface AuthorRow {
  a: string;
  /** Opiniones: textos del mercado con postura. */
  n: number;
  /** Todos sus textos clasificados, opinen o no. */
  texts: number;
  neg: number;
  pos: number;
  /** Proporción de −2, la postura de catástrofe. */
  doom: number;
  mean: number;
  /** La media encogida con la que se ordena. */
  score: number;
  karma: number;
  negK: number;
  posK: number;
  first: string;
  last: string;
  themes: Array<{ th: Theme; n: number }>;
}

export interface AuthorShift extends AuthorRow {
  oldN: number;
  oldMean: number;
  recentN: number;
  recentMean: number;
  delta: number;
}

export interface AuthorsBlock {
  minOps: number;
  k: number;
  prior: number;
  authors: number;
  opinions: number;
  negatives: number;
  concentration: {
    top1: number;
    top1Neg: number;
    top5: number;
    top10: number;
    top10Neg: number;
    top25: number;
    top20Abs: number;
    single: number;
    singleShare: number;
    gini: number;
    /** Qué parte de las negativas escriben los 10 con nombre de la tabla de arriba. */
    tableNegShare: number;
  };
  mix: { minOps: number; n: number; negative: number; positive: number; mixed: number };
  /** Karma medio por comentario según la orientación del AUTOR. Sólo comentarios: los posts juntan
   *  mucho más voto y el promedio mezclado mediría cuántos posts abrió cada grupo. */
  karmaByOrientation: { negative: number | null; mixed: number | null; positive: number | null; n: number };
  shift: { both: number; morePessimistic: number; moreOptimistic: number; window: string };
  negative: AuthorRow[];
  positive: AuthorRow[];
  doomers: AuthorRow[];
  loudest: AuthorRow[];
  mostUpvotedNeg: AuthorRow[];
  mostUpvotedPos: AuthorRow[];
  pessimistic: AuthorShift[];
  optimistic: AuthorShift[];
}

const r3 = (x: number): number => Math.round(x * 1000) / 1000;
const month = (t: number): string => new Date(t).toISOString().slice(0, 7);

/** Gini de la distribución de opiniones por autor: 0 = todos opinan lo mismo, 1 = habla uno solo. */
export function gini(values: number[]): number {
  if (values.length < 2) return 0;
  const v = [...values].sort((a, b) => a - b);
  const total = v.reduce((a, b) => a + b, 0);
  if (!total) return 0;
  let acc = 0;
  for (let i = 0; i < v.length; i++) acc += (i + 1) * v[i]!;
  return r3((2 * acc) / (v.length * total) - (v.length + 1) / v.length);
}

type Agg = {
  a: string;
  texts: number;
  first: number;
  last: number;
  ops: AuthorUnit[];
};

export function buildAuthorRanking(units: AuthorUnit[], now: number): AuthorsBlock {
  const by = new Map<string, Agg>();
  for (const u of units) {
    const a = (u.author || "").trim();
    if (!isRankableAuthor(a)) continue;
    let agg = by.get(a);
    if (!agg) {
      agg = { a, texts: 0, first: u.t, last: u.t, ops: [] };
      by.set(a, agg);
    }
    agg.texts++;
    if (u.t < agg.first) agg.first = u.t;
    if (u.t > agg.last) agg.last = u.t;
    if (u.rel && u.stance != null) agg.ops.push(u);
  }

  // La media del sub, que es hacia donde se encoge cada autor.
  let sum = 0;
  let count = 0;
  for (const agg of by.values()) {
    for (const o of agg.ops) {
      sum += o.stance as number;
      count++;
    }
  }
  const prior = count ? sum / count : 0;

  const rows: AuthorRow[] = [];
  const shifts: AuthorShift[] = [];
  for (const agg of by.values()) {
    const ops = agg.ops;
    if (!ops.length) continue;
    const n = ops.length;
    let neg = 0;
    let pos = 0;
    let doom = 0;
    let stanceSum = 0;
    let karma = 0;
    let negK = 0;
    let posK = 0;
    const themeCount = new Map<Theme, number>();
    for (const o of ops) {
      const s = o.stance as number;
      stanceSum += s;
      karma += o.score;
      if (s < 0) {
        neg++;
        negK += o.score;
      }
      if (s > 0) {
        pos++;
        posK += o.score;
      }
      if (s === -2) doom++;
      for (const th of o.themes || []) themeCount.set(th, (themeCount.get(th) || 0) + 1);
    }
    const mean = stanceSum / n;
    const row: AuthorRow = {
      a: agg.a,
      n,
      texts: agg.texts,
      neg: r3(neg / n),
      pos: r3(pos / n),
      doom: r3(doom / n),
      mean: r3(mean),
      score: r3((mean * n + prior * AUTHOR_SHRINK_K) / (n + AUTHOR_SHRINK_K)),
      karma,
      negK,
      posK,
      first: month(agg.first),
      last: month(agg.last),
      themes: [...themeCount.entries()]
        .sort((x, y) => y[1] - x[1])
        .slice(0, 3)
        .map(([th, c]) => ({ th, n: c })),
    };
    rows.push(row);

    const old = ops.filter((o) => o.t < now - 2 * YEAR);
    const recent = ops.filter((o) => o.t >= now - YEAR);
    if (old.length >= MIN_WINDOW_OPS && recent.length >= MIN_WINDOW_OPS) {
      const oldMean = old.reduce((a, o) => a + (o.stance as number), 0) / old.length;
      const recentMean = recent.reduce((a, o) => a + (o.stance as number), 0) / recent.length;
      shifts.push({
        ...row,
        oldN: old.length,
        oldMean: r3(oldMean),
        recentN: recent.length,
        recentMean: r3(recentMean),
        delta: r3(recentMean - oldMean),
      });
    }
  }

  const totalOps = rows.reduce((a, u) => a + u.n, 0);
  const totalNeg = rows.reduce((a, u) => a + u.n * u.neg, 0);
  const byVolume = [...rows].sort((x, y) => y.n - x.n);
  const byNegVolume = [...rows].sort((x, y) => y.n * y.neg - x.n * x.neg);
  const share = (k: number): number =>
    totalOps ? r3(byVolume.slice(0, k).reduce((a, u) => a + u.n, 0) / totalOps) : 0;
  const shareNeg = (k: number): number =>
    totalNeg ? r3(byNegVolume.slice(0, k).reduce((a, u) => a + u.n * u.neg, 0) / totalNeg) : 0;
  const pctOf = (p: number): number => Math.max(1, Math.round(rows.length * p));
  const single = rows.filter((u) => u.n === 1).length;

  const eligible = rows.filter((u) => u.n >= AUTHOR_MIN_OPS);
  const byScore = (x: AuthorRow, y: AuthorRow) => x.score - y.score || y.n - x.n;
  const negative = [...eligible].sort(byScore).slice(0, 25);
  const positive = [...eligible].sort((x, y) => -byScore(x, y)).slice(0, 25);

  // Orientación de la GENTE, no de los textos.
  const orientable = rows.filter((u) => u.n >= MIN_ORIENT_OPS);
  const leansNeg = (u: AuthorRow) => u.neg > u.pos + LEAN;
  const leansPos = (u: AuthorRow) => u.pos > u.neg + LEAN;
  const mixN = orientable.filter((u) => !leansNeg(u) && !leansPos(u)).length;

  // Karma por orientación, sólo comentarios.
  const orientOf = new Map<string, "negative" | "mixed" | "positive">();
  for (const u of orientable) orientOf.set(u.a, leansNeg(u) ? "negative" : leansPos(u) ? "positive" : "mixed");
  const karmaAgg = {
    negative: [0, 0],
    mixed: [0, 0],
    positive: [0, 0],
  } as Record<"negative" | "mixed" | "positive", [number, number]>;
  for (const u of units) {
    if (u.kind !== "comment" || !u.rel || u.stance == null) continue;
    const o = orientOf.get((u.author || "").trim());
    if (!o) continue;
    karmaAgg[o][0] += u.score;
    karmaAgg[o][1]++;
  }
  const karmaMean = (k: "negative" | "mixed" | "positive"): number | null =>
    karmaAgg[k][1] ? r3(karmaAgg[k][0] / karmaAgg[k][1]) : null;

  return {
    minOps: AUTHOR_MIN_OPS,
    k: AUTHOR_SHRINK_K,
    prior: r3(prior),
    authors: rows.length,
    opinions: totalOps,
    negatives: Math.round(totalNeg),
    concentration: {
      top1: share(pctOf(0.01)),
      top1Neg: shareNeg(pctOf(0.01)),
      top5: share(pctOf(0.05)),
      top10: share(pctOf(0.1)),
      top10Neg: shareNeg(pctOf(0.1)),
      top25: share(pctOf(0.25)),
      top20Abs: share(20),
      single,
      singleShare: rows.length ? r3(single / rows.length) : 0,
      gini: gini(rows.map((u) => u.n)),
      tableNegShare: totalNeg ? r3(negative.slice(0, 10).reduce((a, u) => a + u.n * u.neg, 0) / totalNeg) : 0,
    },
    mix: {
      minOps: MIN_ORIENT_OPS,
      n: orientable.length,
      negative: orientable.length ? r3(orientable.filter(leansNeg).length / orientable.length) : 0,
      positive: orientable.length ? r3(orientable.filter(leansPos).length / orientable.length) : 0,
      mixed: orientable.length ? r3(mixN / orientable.length) : 0,
    },
    karmaByOrientation: {
      negative: karmaMean("negative"),
      mixed: karmaMean("mixed"),
      positive: karmaMean("positive"),
      n: karmaAgg.negative[1] + karmaAgg.mixed[1] + karmaAgg.positive[1],
    },
    shift: {
      both: shifts.length,
      morePessimistic: shifts.filter((u) => u.delta < -SHIFT).length,
      moreOptimistic: shifts.filter((u) => u.delta > SHIFT).length,
      window: `${MIN_WINDOW_OPS}+ opiniones antes de ${month(now - 2 * YEAR)} y ${MIN_WINDOW_OPS}+ desde ${month(now - YEAR)}`,
    },
    negative,
    positive,
    doomers: [...eligible].sort((x, y) => y.doom - x.doom || y.n - x.n).slice(0, 15),
    loudest: byVolume.slice(0, 25),
    mostUpvotedNeg: [...eligible].sort((x, y) => y.negK - x.negK).slice(0, 15),
    mostUpvotedPos: [...eligible].sort((x, y) => y.posK - x.posK).slice(0, 15),
    pessimistic: [...shifts].sort((x, y) => x.delta - y.delta).slice(0, 12),
    optimistic: [...shifts].sort((x, y) => y.delta - x.delta).slice(0, 12),
  };
}
