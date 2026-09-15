// Filas clasificadas → el snapshot que dibuja /mercado-it-uruguay. Puro.
//
// Ponderación: los posts son la población entera (peso 1). Los comentarios pesan
// candidatos/clasificados de su mes, así un mes con huecos de clasificación (Gemini caído) no pesa
// menos de lo que pesa. Con el corpus completo el peso es ~1.
import { LEX_KEYS, RATE_THEMES } from "./types";
import type { AiView, CharruaText, LexKey, LifeEvent, MonthRow, Theme } from "./types";
import type { FredPoint } from "./fred";
import type { ValidationSet } from "./validation";

export interface AnalyzeRow {
  rid: string;
  kind: "post" | "comment";
  createdAt: Date;
  month: string;
  score: number;
  rel: boolean;
  stance: number | null;
  themes: Theme[];
  ai: AiView | null;
  event: LifeEvent;
  persona?: string | null;
  gone: boolean;
  title?: string;
  url?: string;
  comments?: number;
  flair?: string | null;
}

export interface SnapshotInput {
  rows: AnalyzeRow[];
  months: MonthRow[];
  quotePool: CharruaText[];
  fred: FredPoint[];
  validation: ValidationSet;
  now: Date;
  model: string;
}

type Unit = AnalyzeRow & { w: number; t: number };
type StanceKey = "-2" | "-1" | "0" | "1" | "2";
const STANCE_KEYS: StanceKey[] = ["-2", "-1", "0", "1", "2"];
const DAY = 86400000;

const round = (x: number | null | undefined, d = 3): number | null =>
  x == null || !Number.isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d;
const yq = (t: number): string => {
  const d = new Date(t);
  return `${d.getUTCFullYear()}-T${Math.floor(d.getUTCMonth() / 3) + 1}`;
};
const yr = (t: number): number => new Date(t).getUTCFullYear();

export function median(a: number[]): number | null {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export interface Bucket {
  n: number;
  raw: number;
  dist: Record<StanceKey, number>;
  mean: number | null;
  neg: number | null;
  pos: number | null;
  net: number | null;
  negOfOpinion: number | null;
}

export function bucketStats(list: ReadonlyArray<{ stance: number | null; w: number }>): Bucket {
  const dist: Record<StanceKey, number> = { "-2": 0, "-1": 0, "0": 0, "1": 0, "2": 0 };
  let n = 0;
  let raw = 0;
  let sum = 0;
  for (const x of list) {
    if (x.stance == null) continue;
    const s = Math.max(-2, Math.min(2, x.stance));
    dist[String(s) as StanceKey] += x.w;
    n += x.w;
    raw++;
    sum += s * x.w;
  }
  const neg = dist["-2"] + dist["-1"];
  const pos = dist["1"] + dist["2"];
  return {
    n,
    raw,
    dist,
    mean: n ? sum / n : null,
    neg: n ? neg / n : null,
    pos: n ? pos / n : null,
    net: n ? (pos - neg) / n : null,
    negOfOpinion: neg + pos ? neg / (neg + pos) : null,
  };
}

const out = (b: Bucket) => ({
  n: round(b.n, 0),
  raw: b.raw,
  mean: round(b.mean),
  neg: round(b.neg),
  pos: round(b.pos),
  net: round(b.net),
  negOfOpinion: round(b.negOfOpinion),
});
const sumW = (l: Unit[]): number => l.reduce((a, x) => a + x.w, 0);
const has = (x: { themes: Theme[] }, th: Theme): boolean => (x.themes || []).includes(th);

function groupBy<T>(list: T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of list) {
    const k = key(x);
    const arr = m.get(k);
    if (arr) arr.push(x);
    else m.set(k, [x]);
  }
  return m;
}

export interface Quote {
  rid: string;
  date: string;
  score: number;
  stance: number;
  themes: Theme[];
  ai: AiView | null;
  event: LifeEvent;
  text: string;
  thread: string;
  url: string;
}

export interface TopPost {
  rid: string;
  date: string;
  title: string;
  score: number;
  comments: number;
  stance: number;
  themes: Theme[];
  url: string;
}

export function buildSnapshot(input: SnapshotInput) {
  const { rows, months, now } = input;
  const NOW = now.getTime();
  const monthsByKey = new Map(months.map((m) => [m.m, m]));
  const classifiedComments = new Map<string, number>();
  for (const r of rows) if (r.kind === "comment") classifiedComments.set(r.month, (classifiedComments.get(r.month) || 0) + 1);
  const weightOf = (m: string): number => {
    const c = classifiedComments.get(m) || 0;
    const cand = monthsByKey.get(m)?.candidates || 0;
    return c && cand > c ? cand / c : 1;
  };
  const units: Unit[] = rows.map((r) => ({
    ...r,
    t: new Date(r.createdAt).getTime(),
    w: r.kind === "comment" ? weightOf(r.month) : 1,
  }));
  const rel = units.filter((x) => x.rel && x.stance != null);
  const since = (days: number) => NOW - days * DAY;

  // ---- monthly ----
  const monthKeys = [...new Set([...months.map((m) => m.m), ...units.map((u) => u.month)])].sort();
  const relByM = groupBy(rel, (x) => x.month);
  const unitsByM = groupBy(units, (x) => x.month);
  const postsByM = groupBy(
    units.filter((u) => u.kind === "post"),
    (x) => x.month
  );
  const current = new Date(NOW).toISOString().slice(0, 7);
  const monthly = monthKeys.map((m, i) => {
    const r = relByM.get(m) || [];
    const s = bucketStats(r);
    const win = monthKeys.slice(Math.max(0, i - 2), i + 1).flatMap((k) => relByM.get(k) || []);
    const s3 = bucketStats(win);
    const u = unitsByM.get(m) || [];
    return {
      m,
      partial: m === current,
      posts: monthsByKey.get(m)?.posts ?? (postsByM.get(m) || []).length,
      comments: monthsByKey.get(m)?.comments ?? 0,
      rel: s.raw,
      relShare: round(sumW(r) / (sumW(u) || 1)),
      neg: round(s.neg),
      pos: round(s.pos),
      net: round(s.net),
      negOfOpinion: round(s.negOfOpinion),
      rel3: s3.raw,
      neg3: round(s3.neg),
      pos3: round(s3.pos),
      net3: round(s3.net),
      negOfOpinion3: round(s3.negOfOpinion),
      aiShare3: win.length ? round(sumW(win.filter((x) => has(x, "ia"))) / sumW(win)) : null,
      offers: (postsByM.get(m) || []).filter((p) => /oferta/i.test(p.flair || "")).length,
    };
  });

  // ---- yearly ----
  const years = [...new Set(rel.map((x) => yr(x.t)))].sort();
  const yearly = years.map((y) => {
    const r = rel.filter((x) => yr(x.t) === y);
    const s = bucketStats(r);
    return {
      y,
      ...out(s),
      dist: Object.fromEntries(STANCE_KEYS.map((k) => [k, round(s.dist[k], 1)])) as Record<StanceKey, number | null>,
      aiShare: round(sumW(r.filter((x) => has(x, "ia"))) / (sumW(r) || 1)),
      negPosts: round(bucketStats(r.filter((x) => x.kind === "post")).neg),
      negComments: round(bucketStats(r.filter((x) => x.kind === "comment")).neg),
    };
  });

  // ---- quarterly ----
  const quarters = [...new Set(units.map((x) => yq(x.t)))].sort();
  const quarterly = quarters.map((q) => {
    const all = units.filter((x) => yq(x.t) === q);
    const r = rel.filter((x) => yq(x.t) === q);
    const ev = { busca: 0, consiguio: 0, despedido: 0, contrata: 0 };
    for (const x of all) if (x.event !== "ninguno") ev[x.event] += x.w;
    const themeShare: Record<string, number | null> = {};
    for (const th of RATE_THEMES) themeShare[th] = r.length ? round(sumW(r.filter((x) => has(x, th))) / sumW(r)) : null;
    const ai = { amenaza: 0, herramienta: 0, hype: 0, mixto: 0 };
    let aiRaw = 0;
    for (const x of all) {
      if (!x.ai) continue;
      ai[x.ai] += x.w;
      aiRaw++;
    }
    return {
      q,
      ...out(bucketStats(r)),
      all: round(sumW(all), 0),
      ev: {
        busca: round(ev.busca, 1),
        consiguio: round(ev.consiguio, 1),
        despedido: round(ev.despedido, 1),
        contrata: round(ev.contrata, 1),
      },
      themeShare,
      ai: {
        n: round(ai.amenaza + ai.herramienta + ai.hype + ai.mixto, 0),
        raw: aiRaw,
        amenaza: round(ai.amenaza, 1),
        herramienta: round(ai.herramienta, 1),
        hype: round(ai.hype, 1),
        mixto: round(ai.mixto, 1),
      },
    };
  });

  // ---- themes ----
  const rel12 = rel.filter((x) => x.t >= since(365));
  const themes = RATE_THEMES.map((th) => {
    const r = rel.filter((x) => has(x, th));
    const r12 = r.filter((x) => x.t >= since(365));
    const byYear: Record<string, number | null> = {};
    const byYearNeg: Record<string, number | null> = {};
    for (const y of years) {
      const ry = rel.filter((x) => yr(x.t) === y);
      byYear[y] = ry.length ? round(sumW(ry.filter((x) => has(x, th))) / sumW(ry)) : null;
      const rt = r.filter((x) => yr(x.t) === y);
      byYearNeg[y] = rt.length >= 30 ? round(bucketStats(rt).neg) : null;
    }
    const s = bucketStats(r);
    const s12 = bucketStats(r12);
    return {
      th,
      n: s.raw,
      neg: round(s.neg),
      net: round(s.net),
      n12: s12.raw,
      neg12: round(s12.neg),
      net12: round(s12.net),
      share12: rel12.length ? round(sumW(r12) / sumW(rel12)) : null,
      byYear,
      byYearNeg,
    };
  });

  // ---- persona (posts) ----
  const personas = groupBy(
    rel.filter((x) => x.kind === "post"),
    (x) => x.persona || "desconocido"
  );
  const persona = [...personas.entries()].map(([k, r]) => {
    const r12 = r.filter((x) => x.t >= since(365));
    const s = bucketStats(r);
    return { persona: k, n: r.length, neg: round(s.neg), net: round(s.net), n12: r12.length, neg12: round(bucketStats(r12).neg) };
  });

  // ---- engagement (¿el sub premia el pesimismo?) ----
  const engagement = (kind: "post" | "comment") =>
    Object.fromEntries(
      [-2, -1, 0, 1, 2].map((s) => {
        const sc = rel.filter((x) => x.kind === kind && x.stance === s).map((x) => x.score);
        return [
          String(s),
          { n: sc.length, median: median(sc), mean: round(sc.reduce((a, b) => a + b, 0) / (sc.length || 1), 1) },
        ];
      })
    ) as Record<StanceKey, { n: number; median: number | null; mean: number | null }>;

  // ---- lexicon control ----
  const lexMonthly = months.map((mr) => {
    const rowOut: Record<string, number | string | null> = { m: mr.m, n: mr.lexN };
    for (const k of LEX_KEYS) rowOut[k] = mr.lexN ? round(((mr.lex[k as LexKey] || 0) / mr.lexN) * 1000, 1) : null;
    return rowOut as { m: string; n: number } & Record<LexKey, number | null>;
  });

  // ---- windows ----
  const windowStats = (from: number, to: number) => {
    const r = rel.filter((x) => x.t >= from && x.t < to);
    const ai = r.filter((x) => has(x, "ia"));
    return {
      ...out(bucketStats(r)),
      aiShare: r.length ? round(sumW(ai) / sumW(r)) : null,
      aiNeg: round(bucketStats(ai).neg),
      negPosts: round(bucketStats(r.filter((x) => x.kind === "post")).neg),
      negComments: round(bucketStats(r.filter((x) => x.kind === "comment")).neg),
    };
  };
  const Y = (y: number) => Date.UTC(y, 0, 1);
  const thisYear = new Date(NOW).getUTCFullYear();
  const windows: Record<string, ReturnType<typeof windowStats>> = {
    last90: windowStats(since(90), NOW + 1),
    prev90: windowStats(since(180), since(90)),
    sameLastYear: windowStats(since(365 + 90), since(365)),
    last365: windowStats(since(365), NOW + 1),
    all: windowStats(0, NOW + 1),
  };
  for (let y = 2022; y <= thisYear; y++) windows[`y${y}`] = windowStats(Y(y), Math.min(Y(y + 1), NOW + 1));

  // ---- quotes & top posts (nunca autores, nunca lo borrado) ----
  const quote = (q: CharruaText): Quote => ({
    rid: q.rid,
    date: new Date(q.createdAt).toISOString().slice(0, 10),
    score: q.score,
    stance: q.stance as number,
    themes: q.themes,
    ai: q.ai,
    event: q.event,
    text: (q.body || "").slice(0, 700),
    thread: q.title || "",
    url: q.url,
  });
  const pool = input.quotePool.filter(
    (q) => !q.gone && q.rel && q.stance != null && q.stance !== 0 && new Date(q.createdAt).getTime() >= since(365)
  );
  const byScore = (a: { score: number }, b: { score: number }) => b.score - a.score;
  const quotesNeg = pool
    .filter((q) => (q.stance as number) < 0)
    .sort(byScore)
    .slice(0, 30)
    .map(quote);
  const quotesPos = pool
    .filter((q) => (q.stance as number) > 0)
    .sort(byScore)
    .slice(0, 15)
    .map(quote);
  const topPost = (x: Unit): TopPost => ({
    rid: x.rid,
    date: new Date(x.t).toISOString().slice(0, 10),
    title: x.title || "",
    score: x.score,
    comments: x.comments || 0,
    stance: x.stance as number,
    themes: x.themes,
    url: x.url || "",
  });
  const posts12 = rel.filter((x) => x.kind === "post" && !x.gone && x.t >= since(365));
  const postsNeg12 = posts12
    .filter((x) => (x.stance as number) < 0)
    .sort(byScore)
    .slice(0, 20)
    .map(topPost);
  const postsPos12 = posts12
    .filter((x) => (x.stance as number) > 0)
    .sort(byScore)
    .slice(0, 10)
    .map(topPost);

  let minT = Infinity;
  let maxT = -Infinity;
  for (const u of units) {
    if (u.t < minT) minT = u.t;
    if (u.t > maxT) maxT = u.t;
  }
  return {
    generatedAt: now.toISOString(),
    model: input.model,
    corpus: {
      posts: months.reduce((a, m) => a + m.posts, 0),
      comments: months.reduce((a, m) => a + m.comments, 0),
      candidates: months.reduce((a, m) => a + m.candidates, 0),
      texts: rows.length,
      classifiedPosts: rows.filter((r) => r.kind === "post").length,
      classifiedComments: rows.filter((r) => r.kind === "comment").length,
      relPosts: rel.filter((x) => x.kind === "post").length,
      relComments: rel.filter((x) => x.kind === "comment").length,
      from: units.length ? new Date(minT).toISOString().slice(0, 10) : null,
      to: units.length ? new Date(maxT).toISOString().slice(0, 10) : null,
    },
    windows,
    monthly,
    yearly,
    quarterly,
    themes,
    persona,
    engagementPosts: engagement("post"),
    engagementComments: engagement("comment"),
    lexMonthly,
    quotesNeg,
    quotesPos,
    postsNeg12,
    postsPos12,
    fred: input.fred,
    validation: input.validation,
  };
}

export type CharruaSnapshot = ReturnType<typeof buildSnapshot>;
