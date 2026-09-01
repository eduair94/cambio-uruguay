// The brain of the pipeline: turns Search Console rows into a ranked list of things worth doing.
//
// Pure functions, no I/O, no Mongo — so tests/gsc/opportunities.test.ts can pin the arithmetic and
// the thresholds without a network. refresh.ts does the fetching; this file does the thinking.
//
// THE ONE IDEA THAT MAKES THIS DIFFERENT FROM AN SEO TOOL: the click-through curve is derived from
// THIS SITE'S OWN DATA, not from an industry table. A generic table says position 3 earns ~10%; the
// live August 2026 numbers say a *click-available* query at position 3 on cambio-uruguay.com earns a
// few percent, because half this site's impressions sit under an answer box that satisfies the
// searcher in place. Ranking opportunities against a borrowed curve produces a list whose top entry
// is always "dolar hoy: 30.000 impresiones, 4 clics — arreglar el CTR", which is not a defect to fix
// but a market to concede. So the zero-click pool is identified FIRST and excluded from the curve
// and from every opportunity that follows.

import type { CtrCurvePoint, GscKeyed, GscMetrics, GscPageQuery, Opportunity, PageTypeRow, GscAlert } from "./types";

// ---------------------------------------------------------------------------------------------
// Thresholds. Every one of them is a judgement call, so each says what it is protecting against.
// ---------------------------------------------------------------------------------------------

/** Below this, a query's CTR is noise: one accidental click swings it by whole percentage points. */
export const MIN_IMPRESSIONS_FOR_CTR = 150;
/** A query with this many impressions and essentially no clicks is being answered by the SERP. */
export const ZERO_CLICK_MIN_IMPRESSIONS = 400;
export const ZERO_CLICK_MAX_CTR = 0.0015; // 0,15 %
/** Where a striking-distance query is assumed to land if the work succeeds. Not position 1: that
 *  would inflate every estimate by 3× and this list has to survive being checked in 90 days. */
export const TARGET_POSITION = 3;
/** A curve point needs this many impressions behind it before it is trusted rather than interpolated. */
export const CURVE_MIN_IMPRESSIONS = 2000;
/** Positions the curve covers. Past 20 the sample is thin and the answer is "rank first, then talk". */
export const CURVE_MAX_POSITION = 20;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const ctrOf = (m: { clicks: number; impressions: number }) => (m.impressions ? m.clicks / m.impressions : 0);

// ---------------------------------------------------------------------------------------------
// Page families
// ---------------------------------------------------------------------------------------------

/**
 * The template a URL belongs to. Prioritisation happens per family, never per URL: one `/convertir/`
 * page tells you nothing, and 46 of them measured together tell you the whole family earns 0,05 %.
 */
export function bucketOf(rawUrl: string): string {
  const path = rawUrl.replace(/^https?:\/\/[^/]+/, "").replace(/[?#].*$/, "");
  const seg = path.split("/").filter(Boolean);
  if (!seg.length) return "/";
  if (seg[0] === "en" || seg[0] === "pt") {
    return seg.length === 1 ? `/${seg[0]}` : `/${seg[0]}/${seg[1]}/*`;
  }
  // Families that fan out into many URLs are folded; a standalone page keeps its own path so a
  // single strong article is never hidden inside an average.
  const FAMILIES = [
    "historico",
    "casa",
    "sucursal",
    "sucursales",
    "cotizacion",
    "dolar",
    "convertir",
    "casas-de-cambio",
    "guias",
    "blog",
    "newsletter",
    "temas",
    "herramientas",
    "comparativas",
    "importar",
    "descuentos",
    "indicadores",
    "glosario",
  ];
  if (FAMILIES.includes(seg[0])) return seg.length > 1 ? `/${seg[0]}/*` : `/${seg[0]}`;
  return path.replace(/\/$/, "") || "/";
}

export function pageTypes(pages: GscKeyed[]): PageTypeRow[] {
  const agg = new Map<string, { clicks: number; impressions: number; urls: number; posWeight: number }>();
  for (const p of pages) {
    const b = bucketOf(p.key);
    const e = agg.get(b) || { clicks: 0, impressions: 0, urls: 0, posWeight: 0 };
    e.clicks += p.clicks;
    e.impressions += p.impressions;
    e.urls += 1;
    e.posWeight += p.position * p.impressions;
    agg.set(b, e);
  }
  return [...agg.entries()]
    .map(([bucket, e]) => ({
      bucket,
      urls: e.urls,
      clicks: e.clicks,
      impressions: e.impressions,
      ctr: e.impressions ? e.clicks / e.impressions : 0,
      position: e.impressions ? e.posWeight / e.impressions : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions);
}

// ---------------------------------------------------------------------------------------------
// Zero-click pool — identified first, because everything else is measured net of it
// ---------------------------------------------------------------------------------------------

export function isZeroClick(row: GscMetrics): boolean {
  return row.impressions >= ZERO_CLICK_MIN_IMPRESSIONS && ctrOf(row) < ZERO_CLICK_MAX_CTR;
}

export function zeroClickPool(queries: GscKeyed[]) {
  const pool = queries.filter(isZeroClick);
  const totalImpressions = queries.reduce((s, q) => s + q.impressions, 0);
  const impressions = pool.reduce((s, q) => s + q.impressions, 0);
  return {
    queries: pool.length,
    impressions,
    clicks: pool.reduce((s, q) => s + q.clicks, 0),
    shareOfImpressions: totalImpressions ? impressions / totalImpressions : 0,
    rows: pool.slice().sort((a, b) => b.impressions - a.impressions),
  };
}

// ---------------------------------------------------------------------------------------------
// The site's own click-through curve
// ---------------------------------------------------------------------------------------------

/**
 * Impression-weighted CTR per integer position, computed over CLICK-AVAILABLE queries only.
 *
 * Points with too few impressions behind them are interpolated from their neighbours and flagged
 * `derived: false` so the dashboard can say so. The curve is then forced monotonically
 * non-increasing: a sample that says position 7 beats position 4 is sampling noise, and letting it
 * through would make every position-7 page look finished.
 */
export function ctrCurve(queries: GscKeyed[]): CtrCurvePoint[] {
  const usable = queries.filter((q) => !isZeroClick(q) && q.impressions > 0 && q.position > 0);
  const buckets = new Map<number, { clicks: number; impressions: number }>();
  for (const q of usable) {
    const p = clamp(Math.round(q.position), 1, CURVE_MAX_POSITION);
    const e = buckets.get(p) || { clicks: 0, impressions: 0 };
    e.clicks += q.clicks;
    e.impressions += q.impressions;
    buckets.set(p, e);
  }

  const raw: CtrCurvePoint[] = [];
  for (let p = 1; p <= CURVE_MAX_POSITION; p++) {
    const b = buckets.get(p);
    const enough = !!b && b.impressions >= CURVE_MIN_IMPRESSIONS;
    raw.push({
      position: p,
      ctr: enough ? b!.clicks / b!.impressions : 0,
      impressions: b?.impressions || 0,
      derived: enough,
    });
  }

  // Fill the untrusted points by interpolating between the nearest trusted neighbours; extrapolate
  // flat at the edges rather than inventing a slope from one sample.
  const trusted = raw.filter((p) => p.derived);
  if (!trusted.length) return raw;
  for (const point of raw) {
    if (point.derived) continue;
    const before = [...trusted].reverse().find((t) => t.position < point.position);
    const after = trusted.find((t) => t.position > point.position);
    if (before && after) {
      const w = (point.position - before.position) / (after.position - before.position);
      point.ctr = before.ctr + (after.ctr - before.ctr) * w;
    } else {
      point.ctr = (before || after)!.ctr;
    }
  }

  // Monotonic non-increasing, applied from the top down.
  for (let i = 1; i < raw.length; i++) {
    if (raw[i].ctr > raw[i - 1].ctr) raw[i].ctr = raw[i - 1].ctr;
  }
  return raw;
}

export function curveAt(curve: CtrCurvePoint[], position: number): number {
  if (!curve.length) return 0;
  const p = clamp(position, 1, CURVE_MAX_POSITION);
  const lo = curve[Math.floor(p) - 1];
  const hi = curve[Math.min(Math.ceil(p), CURVE_MAX_POSITION) - 1];
  if (!lo) return hi?.ctr ?? 0;
  if (!hi || lo === hi) return lo.ctr;
  const w = p - Math.floor(p);
  return lo.ctr + (hi.ctr - lo.ctr) * w;
}

// ---------------------------------------------------------------------------------------------
// Opportunity detectors
// ---------------------------------------------------------------------------------------------

const round = (n: number) => Math.round(n * 10) / 10;
const pctStr = (n: number) => `${(n * 100).toFixed(2)} %`;

/**
 * Queries close enough to page one that moving them is a content/link job rather than a miracle.
 *
 * Zero-click queries are excluded twice over: by the pool test, and by the "already high and still
 * not clicked" test — a query sitting at position 4 with 0,05 % CTR has no click to win, whatever
 * its impression count says.
 */
export function strikingDistance(queries: GscKeyed[], curve: CtrCurvePoint[], minImpressions = MIN_IMPRESSIONS_FOR_CTR): Opportunity[] {
  const target = curveAt(curve, TARGET_POSITION);
  return queries
    .filter((q) => q.impressions >= minImpressions)
    .filter((q) => q.position > TARGET_POSITION && q.position <= 15)
    .filter((q) => !isZeroClick(q))
    .filter((q) => !(q.position <= 5 && ctrOf(q) < ZERO_CLICK_MAX_CTR))
    .map((q) => {
      const potential = Math.max(0, q.impressions * target - q.clicks);
      return {
        kind: "striking-distance" as const,
        subject: q.key,
        impressions: q.impressions,
        clicks: q.clicks,
        position: round(q.position),
        potentialClicks: Math.round(potential),
        note:
          `posición ${round(q.position)} con ${q.impressions} impresiones y ${q.clicks} clics. ` +
          `A la posición ${TARGET_POSITION} la curva del propio sitio paga ${pctStr(target)}.`,
      };
    })
    .filter((o) => o.potentialClicks >= 5)
    .sort((a, b) => b.potentialClicks - a.potentialClicks);
}

/**
 * Pages earning far less than their own position normally pays. This is the title/description/
 * snippet problem — same rank, fewer clicks — as distinct from striking distance, which is a rank
 * problem.
 */
export function ctrBelowCurve(pages: GscKeyed[], curve: CtrCurvePoint[], minImpressions = 300): Opportunity[] {
  return pages
    .filter((p) => p.impressions >= minImpressions && p.position >= 1 && p.position <= 15)
    // A page whose own numbers have the zero-click shape is not a snippet problem. Without this the
    // ranker's second entry was "/convertir/300-dolares-a-pesos-uruguayos: CTR 0,00 % en posición
    // 4,4 — arreglá el título", for a page whose answer Google prints in the results list. It would
    // send somebody to rewrite 46 titles for nothing, and the same URL was ALSO being listed as
    // peso muerto three rows below, which is the contradiction that gave it away.
    .filter((p) => !isZeroClick(p))
    .map((p) => {
      const expected = curveAt(curve, p.position);
      const actual = ctrOf(p);
      const potential = Math.max(0, p.impressions * (expected - actual));
      return { p, expected, actual, potential };
    })
    .filter((x) => x.expected > 0 && x.actual < x.expected * 0.5 && x.potential >= 8)
    .map(({ p, expected, actual, potential }) => ({
      kind: "ctr-below-curve" as const,
      subject: p.key,
      impressions: p.impressions,
      clicks: p.clicks,
      position: round(p.position),
      potentialClicks: Math.round(potential),
      note:
        `CTR ${pctStr(actual)} en posición ${round(p.position)}, donde el sitio suele sacar ` +
        `${pctStr(expected)}. Título, meta y snippet, no ranking.`,
      urls: [p.key],
    }))
    .sort((a, b) => b.potentialClicks - a.potentialClicks);
}

/**
 * One query, several of our URLs. Two costs: the impressions split between them, and Google picking
 * the wrong one — which is how `/historico/brou/usd/ebrou` ended up outranking `/historico/brou/usd`
 * for "cotizacion brou" (5.186 impresiones, 0 clics, agosto 2026).
 */
export function cannibalisation(pairs: GscPageQuery[], minImpressions = 300): Opportunity[] {
  const byQuery = new Map<string, GscPageQuery[]>();
  for (const row of pairs) {
    const list = byQuery.get(row.query) || [];
    list.push(row);
    byQuery.set(row.query, list);
  }
  const out: Opportunity[] = [];
  for (const [query, rows] of byQuery) {
    const impressions = rows.reduce((s, r) => s + r.impressions, 0);
    if (impressions < minImpressions) continue;
    // Only URLs with a real share count as competitors: a page with 3 of 5.000 impressions is not
    // splitting anything, it is a rounding error.
    const serious = rows.filter((r) => r.impressions >= impressions * 0.1).sort((a, b) => b.impressions - a.impressions);
    if (serious.length < 2) continue;
    const clicks = rows.reduce((s, r) => s + r.clicks, 0);
    const best = serious[0];
    out.push({
      kind: "cannibalisation",
      subject: query,
      impressions,
      clicks,
      position: round(best.position),
      // Consolidating typically recovers the impressions of the losing URLs at the winner's CTR.
      potentialClicks: Math.round(
        serious.slice(1).reduce((s, r) => s + r.impressions, 0) * Math.max(ctrOf(best), 0.005)
      ),
      note: `${serious.length} URLs propias compiten por la misma consulta; gana ${best.page.replace(/^https?:\/\/[^/]+/, "")}.`,
      urls: serious.map((r) => r.page),
    });
  }
  return out.sort((a, b) => b.impressions - a.impressions);
}

/** Queries that gained or lost clicks against the previous window of the same length. */
export function movers(current: GscKeyed[], previous: GscKeyed[], minDelta = 3) {
  const prev = new Map(previous.map((p) => [p.key, p]));
  const rows = current.map((c) => {
    const p = prev.get(c.key);
    return {
      key: c.key,
      clicks: c.clicks,
      impressions: c.impressions,
      position: c.position,
      deltaClicks: c.clicks - (p?.clicks || 0),
      deltaPosition: p ? c.position - p.position : null,
      isNew: !p,
    };
  });
  const rising: Opportunity[] = rows
    .filter((r) => r.deltaClicks >= minDelta)
    .sort((a, b) => b.deltaClicks - a.deltaClicks)
    .map((r) => ({
      kind: "rising" as const,
      subject: r.key,
      impressions: r.impressions,
      clicks: r.clicks,
      position: round(r.position),
      potentialClicks: r.deltaClicks,
      note: r.isNew
        ? `consulta nueva: ${r.clicks} clics donde antes no aparecía.`
        : `+${r.deltaClicks} clics contra la ventana anterior (posición ${round(r.position)}).`,
    }));
  const falling: Opportunity[] = rows
    .filter((r) => r.deltaClicks <= -minDelta)
    .sort((a, b) => a.deltaClicks - b.deltaClicks)
    .map((r) => ({
      kind: "falling" as const,
      subject: r.key,
      impressions: r.impressions,
      clicks: r.clicks,
      position: round(r.position),
      potentialClicks: Math.abs(r.deltaClicks),
      note:
        `${r.deltaClicks} clics contra la ventana anterior` +
        (r.deltaPosition !== null ? `, posición ${r.deltaPosition > 0 ? "+" : ""}${round(r.deltaPosition)}.` : "."),
    }));
  return { rising, falling };
}

/** Queries the site did not appear for in the previous window and now does, with real volume. */
export function newQueries(current: GscKeyed[], previous: GscKeyed[], minImpressions = 100): Opportunity[] {
  const prev = new Set(previous.map((p) => p.key));
  return current
    .filter((c) => !prev.has(c.key) && c.impressions >= minImpressions)
    // "Demanda nueva: precio del dólar, 738 impresiones" is not demand to serve — it is the head
    // term arriving under a different accent, and it is answered by Google's own currency box. New
    // AND click-available is the pair that means something.
    .filter((c) => !isZeroClick(c))
    .sort((a, b) => b.impressions - a.impressions)
    .map((c) => ({
      kind: "new-query" as const,
      subject: c.key,
      impressions: c.impressions,
      clicks: c.clicks,
      position: round(c.position),
      potentialClicks: 0,
      note: `demanda nueva: ${c.impressions} impresiones, posición ${round(c.position)}. Todavía sin página propia dedicada.`,
    }));
}

/**
 * URLs Google shows a lot and nobody clicks. Not automatically a page to delete — half of these are
 * the converter family, whose answer Google prints in the SERP — but every one of them is a page
 * carrying crawl cost and, if it also carries ads, an impression that will never earn.
 */
export function deadWeight(pages: GscKeyed[], minImpressions = 800, maxClicks = 2): Opportunity[] {
  return pages
    .filter((p) => p.impressions >= minImpressions && p.clicks <= maxClicks)
    .sort((a, b) => b.impressions - a.impressions)
    .map((p) => ({
      kind: "dead-weight" as const,
      subject: p.key,
      impressions: p.impressions,
      clicks: p.clicks,
      position: round(p.position),
      potentialClicks: 0,
      note: `${p.impressions} impresiones y ${p.clicks} clics en posición ${round(p.position)}: la SERP contesta sola.`,
      urls: [p.key],
    }));
}

// ---------------------------------------------------------------------------------------------
// Alerts — the part that wakes somebody up
// ---------------------------------------------------------------------------------------------

export interface DailyPoint {
  day: string;
  clicks: number;
  impressions: number;
  position: number;
}

/**
 * Week-over-week regression detection on the day series.
 *
 * Compares the last 7 final days against the 7 before them. Thresholds are deliberately loose:
 * this site does ~600 clicks a week, so a 15 % move is inside the weekly noise and paging somebody
 * for it trains them to ignore the channel.
 */
export function buildAlerts(daily: DailyPoint[]): GscAlert[] {
  const alerts: GscAlert[] = [];
  if (daily.length < 14) return alerts;
  const sorted = daily.slice().sort((a, b) => a.day.localeCompare(b.day));
  const last7 = sorted.slice(-7);
  const prev7 = sorted.slice(-14, -7);
  const sum = (rows: DailyPoint[], f: (r: DailyPoint) => number) => rows.reduce((s, r) => s + f(r), 0);

  const c1 = sum(last7, (r) => r.clicks);
  const c0 = sum(prev7, (r) => r.clicks);
  const i1 = sum(last7, (r) => r.impressions);
  const i0 = sum(prev7, (r) => r.impressions);

  if (c0 >= 50) {
    const drop = (c0 - c1) / c0;
    if (drop >= 0.4) {
      alerts.push({
        level: "critical",
        code: "clicks-collapse",
        message: `Clics -${Math.round(drop * 100)} % semana contra semana (${c0} → ${c1}).`,
      });
    } else if (drop >= 0.25) {
      alerts.push({
        level: "warn",
        code: "clicks-drop",
        message: `Clics -${Math.round(drop * 100)} % semana contra semana (${c0} → ${c1}).`,
      });
    }
  }
  if (i0 >= 5000) {
    const drop = (i0 - i1) / i0;
    if (drop >= 0.4) {
      alerts.push({
        level: "critical",
        code: "impressions-collapse",
        message: `Impresiones -${Math.round(drop * 100)} % semana contra semana (${i0} → ${i1}). Suele ser desindexación o penalización, no estacionalidad.`,
      });
    }
  }
  // A day with literally zero clicks in a site that averages ~90 is a tracking or serving failure.
  const zeroDays = last7.filter((d) => d.clicks === 0 && d.impressions === 0);
  if (zeroDays.length) {
    alerts.push({
      level: "warn",
      code: "empty-days",
      message: `${zeroDays.length} día(s) sin datos en la última semana (${zeroDays.map((d) => d.day).join(", ")}).`,
    });
  }
  return alerts;
}

/**
 * The ranked list the dashboard shows. Interleaves the kinds rather than concatenating them: a list
 * sorted purely by potential clicks is 40 striking-distance rows before the first cannibalisation,
 * and the reader stops at 10.
 */
export function rankOpportunities(groups: Opportunity[][], limitPerKind = 25): Opportunity[] {
  const trimmed = groups.map((g) => g.slice(0, limitPerKind));
  const out: Opportunity[] = [];
  const cursor = new Array(trimmed.length).fill(0);
  for (;;) {
    let progressed = false;
    for (let i = 0; i < trimmed.length; i++) {
      const row = trimmed[i][cursor[i]];
      if (row) {
        out.push(row);
        cursor[i]++;
        progressed = true;
      }
    }
    if (!progressed) return out;
  }
}
