// Las doce señales: lo que un ingeniero mira para decidir qué arreglar. Puro.
//
// REGLAS QUE VALEN PARA TODAS:
// - Un dato que falta nunca se convierte en una afirmación negativa: una fuente sin datos deja la señal
//   `unavailable` (con el motivo), una fuente vieja la deja `stale` con severidad tope "baja".
// - Una tasa sólo es un veredicto sobre una página MEDIDA (`readMeasured`, `measured`) y sobre muestras
//   reales (`realSamples`, personas distintas, sesiones afectadas).
// - El `summary` va a los logs de pm2 y a Telegram: nunca cita un término del buscador del sitio ni una
//   consulta de Bing o de Search Console. Esos valores viven sólo en las filas.
import { SIGNAL_GROUPS, SIGNAL_ROWS, STATE_SIGNAL_KEYS_MAX } from "./caps";
import { insightFamily } from "./paths";
import { SIGNAL_IDS } from "./types";
import type { ConsentCheck, InsightSources, Signal, SignalId, SignalRow, SourceBlock, SourceId, UsageInsightSnapshot } from "./types";

export const THRESHOLDS = {
  CG_MIN_DAYS: 7,
  CG_MIN_VISITS: 100,
  CG_MIN_SAMPLES: 20,
  CG_REL: 0.6,
  CG_INTERNAL_GAP: 0.15,
  MW_MIN_MOBILE: 100,
  MW_MIN_DESKTOP: 50,
  MW_GAP: 0.15,
  MW_TIME_RATIO: 0.5,
  LR_MIN_MEASURED: 20,
  LR_MIN_VIEWS: 200,
  LR_MAX_RATE: 0.1,
  LR_SCROLL: 25,
  PV_MIN_SAMPLES: 30,
  PV_POOR_SHARE: 0.25,
  SN_MIN_TERM: 5,
  SN_MIN_PAGE: 5,
  SN_MEDIUM_RATIO: 0.3,
  OR_MIN_MEASURED: 20,
  OR_MIN_VIEWS: 100,
  OR_MIN_RATE: 0.25,
  NI_GRACE_DAYS: 14,
  NI_MIN_CHECKED: 10,
  NI_FAMILY_SHARE: 0.2,
  NI_FAMILY_HIGH: 0.4,
  NI_TOP_PAGES: 20,
  HN_MIN_NO: 3,
  HN_MIN_ANSWERS: 10,
  HN_SHARE: 0.5,
  FR_MIN_SESSIONS: 100,
  FR_RAGE: 0.03,
  FR_DEAD: 0.1,
  FR_QUICKBACK: 0.15,
  FR_ERRORS: 0.05,
  FR_MIN_AFFECTED: 5,
  BQ_MIN_IMPR: 30,
  BQ_MEDIUM_ROWS: 10,
  BQ_MEDIUM_IMPR: 100,
  AI_MIN_ERR: 3,
  AI_MIN_REDIR: 10,
  AI_MEDIUM_ERR_SHARE: 0.1,
  AI_HIGH_ERR_SHARE: 0.25,
  EE_MIN: 20,
  SEV_HIGH: 0.05,
  SEV_MEDIUM: 0.01,
} as const;
const T = THRESHOLDS;

export const MAX_AGE_HOURS: Record<SourceId, number> = {
  cloudflareRum: 50,
  ga4Behavior: 50,
  feedback: 50,
  clarity: 50,
  cloudflareZone: 50,
  indexation: 192,
  crux: 192,
  bing: 384,
};

export const SIGNAL_TEXT: Record<SignalId, { title: string; question: string }> = {
  "consent-gap": {
    title: "Páginas que Google Analytics ve mucho menos que Cloudflare",
    question: "¿Qué páginas ve Google Analytics mucho menos que Cloudflare?",
  },
  "mobile-worse": {
    title: "Páginas donde el celular rinde mucho peor",
    question: "¿Dónde el celular rinde mucho peor que la computadora?",
  },
  "low-reading": { title: "Páginas que casi nadie lee hasta la mitad", question: "¿Qué páginas casi nadie lee hasta la mitad?" },
  "poor-vitals": {
    title: "Páginas con LCP, INP o CLS malos",
    question: "¿Qué páginas tienen LCP, INP o CLS malos y qué elemento los causa?",
  },
  "search-no-results": { title: "Búsquedas del sitio sin resultado", question: "¿Qué buscan en el sitio y no encuentran?" },
  "outbound-rate": { title: "Páginas que mandan a la gente afuera", question: "¿Qué páginas mandan a la gente afuera?" },
  "not-indexed": { title: "Páginas no indexadas y por qué", question: "¿Qué páginas no están indexadas y por qué?" },
  "helpful-no": {
    title: "Páginas donde contestan «No» al «¿Te sirvió?»",
    question: "¿Dónde contestan «No» al «¿Te sirvió?»?",
  },
  friction: {
    title: "Clics de bronca, clics muertos y vueltas atrás",
    question: "¿Dónde hay clics de bronca, clics muertos o vueltas atrás?",
  },
  "bing-only-queries": {
    title: "Búsquedas de Bing que Google no manda",
    question: "¿Por qué búsquedas aparece en Bing y Google no manda nadie?",
  },
  "ai-crawler-errors": {
    title: "Rastreadores de IA que reciben errores o redirecciones",
    question: "¿Qué rastreadores de IA piden páginas que dan error o redirigen?",
  },
  "edge-errors": {
    title: "URLs que contestan error en el borde (personas y bots)",
    question: "¿Qué URLs contestan error en el borde, a personas o a bots?",
  },
};

// ---- formato (es-UY) ----------------------------------------------------------------------------

export const fmtInt = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n) ? "—" : Math.round(n).toLocaleString("es-UY");
export const fmtPct = (x: number | null | undefined, digits = 0) =>
  x === null || x === undefined || !Number.isFinite(x) ? "—" : `${(x * 100).toFixed(digits).replace(".", ",")} %`;
const r4 = (x: number | null) => (x === null || !Number.isFinite(x) ? null : Math.round(x * 10000) / 10000);
const ratio = (a: number, b: number) => (b > 0 ? r4(a / b) : null);
const ddmm = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "—");

// ---- contexto -----------------------------------------------------------------------------------

export interface SignalContext {
  sources: InsightSources;
  consentCheck: ConsentCheck | null;
  previous: UsageInsightSnapshot | null;
  now: Date;
  /** Cargas uruguayas de Cloudflare del sitio en 28 días: el denominador de la severidad. */
  siteLoadsUy: number | null;
  /** Consultas de Search Console de 28 días por consulta normalizada (null = no se pudo leer). */
  gscQueries: Map<string, { clicks: number; impressions: number }> | null;
  /** Por qué `gscQueries` es null cuando hay datos de Bing (sin base, o la lectura falló). */
  gscUnavailable?: string | null;
  /**
   * TODAS las claves de filas de la corrida anterior por señal (estado `signalKeys`), no las 20 que
   * guarda el snapshot. Sin esto, una fila del puesto 21 para abajo sale "nueva" todos los días y una
   * señal alta con más de 20 filas manda Telegram a diario.
   */
  previousKeys?: Partial<Record<SignalId, string[]>> | null;
  /** Si se pasa, `finish()` deja acá las claves de cada señal disponible, para guardarlas. */
  keysOut?: Map<SignalId, string[]>;
}

/** Una fila antes de marcar `isNew`. */
export type DraftRow = { key: string; path: string | null; family: string | null; impact: number } & Record<
  string,
  string | number | boolean | null
>;

interface Status {
  status: Signal["status"];
  reason: string | null;
  dataAsOf: string | null;
}

/** Disponibilidad y frescura según las fuentes que la señal NECESITA (no las de contexto). */
export function inputStatus(blocks: SourceBlock<any>[], now: Date): Status {
  for (const b of blocks) {
    if (!b || b.data === null || b.data === undefined) {
      return { status: "unavailable", reason: b?.enableHint || b?.note || "todavía sin datos de esta fuente", dataAsOf: null };
    }
  }
  const dates = blocks.map((b) => b.fetchedAt).filter(Boolean) as string[];
  const oldest = dates.sort()[0] || null;
  for (const b of blocks) {
    const age = b.fetchedAt ? now.getTime() - Date.parse(b.fetchedAt) : Infinity;
    if (!(age <= MAX_AGE_HOURS[b.id] * 3600000)) {
      return { status: "stale", reason: `datos de ${b.id} del ${ddmm(b.fetchedAt)}${b.note ? ` (${b.note})` : ""}`, dataAsOf: oldest };
    }
  }
  return { status: "ok", reason: null, dataAsOf: oldest };
}

/**
 * El denominador de la severidad, en la MISMA unidad que el impacto: vistas de GA4 contra las vistas de
 * GA4 del sitio, cargas de Cloudflare contra las cargas de Cloudflare. GA4 ve una porción del tráfico
 * que depende del consentimiento: dividir vistas de GA4 por cargas de Cloudflare dejaba más bajas, y
 * siempre, a las señales medidas con GA4.
 */
export function severityDenominator(ctx: SignalContext, unit: Signal["impactUnit"]): number | null {
  if (unit === "ga4-views") {
    const v = ctx.sources.ga4Behavior?.data?.totals?.views;
    return v && v > 0 ? v : null;
  }
  return ctx.siteLoadsUy;
}

export function pageSeverity(impact: number, siteLoads: number | null, count: number): Signal["severity"] {
  if (!count) return "none";
  if (!siteLoads || siteLoads <= 0) return "low";
  const share = impact / siteLoads;
  if (share >= T.SEV_HIGH) return "high";
  if (share >= T.SEV_MEDIUM) return "medium";
  return "low";
}

const SEV_RANK: Record<Signal["severity"], number> = { high: 3, medium: 2, low: 1, none: 0 };
const capSeverity = (s: Signal["severity"], cap: Signal["severity"]) => (SEV_RANK[s] > SEV_RANK[cap] ? cap : s);

interface Draft {
  id: SignalId;
  required: SourceBlock<any>[];
  sources: SourceId[];
  rows: DraftRow[];
  impactUnit: Signal["impactUnit"];
  thresholds: Record<string, number>;
  severity?: (rows: DraftRow[], impact: number) => Signal["severity"];
  groups?: Signal["groups"];
  summary: (rows: DraftRow[], impact: number) => string;
  reason?: string | null;
  /** Fuerza `unavailable` con este motivo (p. ej. consentimiento no comparable). */
  unavailable?: string | null;
  window?: Signal["window"];
  severityCap?: Signal["severity"];
}

function finish(ctx: SignalContext, d: Draft): Signal {
  const text = SIGNAL_TEXT[d.id];
  const st = d.unavailable ? { status: "unavailable" as const, reason: d.unavailable, dataAsOf: null } : inputStatus(d.required, ctx.now);
  const window = d.window ?? d.required[0]?.window ?? null;
  if (st.status === "unavailable") {
    return {
      id: d.id,
      ...text,
      status: "unavailable",
      reason: st.reason,
      severity: "none",
      impact: 0,
      impactUnit: d.impactUnit,
      sources: d.sources,
      dataAsOf: null,
      window,
      thresholds: d.thresholds,
      count: 0,
      newRows: 0,
      rows: [],
      groups: [],
      summary: `Sin datos: ${st.reason}`.slice(0, 300),
    };
  }
  const sorted = [...d.rows].sort((a, b) => b.impact - a.impact || String(a.key).localeCompare(String(b.key)));
  const impact = sorted.reduce((s, r) => s + (Number(r.impact) || 0), 0);
  const prevKeys = previousKeySet(ctx, d.id);
  // Sólo se compara dentro de lo que la corrida anterior pudo guardar entero.
  const comparable = prevKeys ? Math.min(sorted.length, prevKeys.limit) : 0;
  const withNew = sorted.map((r, i) => ({ ...r, isNew: !!prevKeys && i < comparable && !prevKeys.keys.has(r.key) })) as SignalRow[];
  ctx.keysOut?.set(
    d.id,
    sorted.slice(0, STATE_SIGNAL_KEYS_MAX).map((r) => String(r.key))
  );
  let severity = d.severity ? d.severity(sorted, impact) : pageSeverity(impact, severityDenominator(ctx, d.impactUnit), sorted.length);
  if (!sorted.length) severity = "none";
  if (d.severityCap) severity = capSeverity(severity, d.severityCap);
  let summary = d.summary(sorted, impact);
  if (st.status === "stale") {
    severity = capSeverity(severity, "low");
    summary = `Datos del ${ddmm(st.dataAsOf)}. ${summary}`;
  }
  return {
    id: d.id,
    ...text,
    status: st.status,
    reason: st.status === "stale" ? st.reason : (d.reason ?? null),
    severity,
    impact,
    impactUnit: d.impactUnit,
    sources: d.sources,
    dataAsOf: st.dataAsOf,
    window,
    thresholds: d.thresholds,
    count: sorted.length,
    newRows: withNew.filter((r) => r.isNew).length,
    rows: withNew.slice(0, SIGNAL_ROWS),
    groups: (d.groups || []).slice(0, SIGNAL_GROUPS),
    summary: summary.slice(0, 400),
  };
}

/**
 * Las claves de la corrida anterior contra las que se marca `isNew`, o null cuando no se sabe: no hubo
 * corrida anterior disponible, o el snapshot anterior guardó menos filas de las que tenía la señal y no
 * hay estado con el conjunto entero. Sin saber, no se afirma que nada sea nuevo.
 */
function previousKeySet(ctx: SignalContext, id: SignalId): { keys: Set<string>; limit: number } | null {
  const stored = ctx.previousKeys?.[id];
  if (Array.isArray(stored)) {
    // Una lista que llegó al tope pudo haberse cortado: más allá del tope no se compara.
    return { keys: new Set(stored), limit: stored.length >= STATE_SIGNAL_KEYS_MAX ? STATE_SIGNAL_KEYS_MAX : Infinity };
  }
  const prev = ctx.previous?.signals?.find((s) => s.id === id);
  if (!prev || prev.status === "unavailable") return null;
  const rows = prev.rows || [];
  if (prev.count > rows.length) return null;
  return { keys: new Set(rows.map((r) => r.key)), limit: Infinity };
}

/** Cargas uruguayas de 28 días por ruta (y por ruta × dispositivo). */
function cfLoads(ctx: SignalContext) {
  const pages = new Map((ctx.sources.cloudflareRum.data?.pages || []).map((p) => [p.path, p]));
  return {
    of: (path: string) => pages.get(path)?.loads || 0,
    device: (path: string, device: string) => {
      const p = pages.get(path) as any;
      return p ? Number(p[device]) || 0 : 0;
    },
  };
}

const pick = <K extends keyof typeof THRESHOLDS>(...keys: K[]) =>
  Object.fromEntries(keys.map((k) => [k, THRESHOLDS[k]])) as Record<string, number>;

// ---- 1. consent-gap -----------------------------------------------------------------------------

export function consentGap(ctx: SignalContext): Signal {
  const cf = ctx.sources.cloudflareRum;
  const ga = ctx.sources.ga4Behavior;
  const cc = ctx.consentCheck;
  const loads = cfLoads(ctx);
  const rows: DraftRow[] = [];
  let skippedTruncated = 0;
  const usable = !!cc?.usable;
  if (usable && cf.data?.consent && ga.data?.consent) {
    const gaPages = new Map(ga.data.consent.pages.map((p) => [p.path, p]));
    const gaTruncated = !!ga.data.consent.truncated;
    const site = cc!.siteCoverage ?? 0;
    for (const p of cf.data.consent.pages) {
      if (p.visits < T.CG_MIN_VISITS || p.realVisits < T.CG_MIN_SAMPLES) continue;
      const g = gaPages.get(p.path);
      // Con la lista de GA4 cortada (2.500 filas por reporte), una ruta que no está NO es una ruta con
      // cero entradas: no se sabe. Se salta en vez de inventar un hueco.
      if (!g && gaTruncated) {
        skippedTruncated++;
        continue;
      }
      const landing = g?.landingSessions || 0;
      const cov = landing / p.visits;
      if (!(cov < site * T.CG_REL)) continue;
      rows.push({
        key: p.path,
        path: p.path,
        family: insightFamily(p.path),
        impact: loads.of(p.path) || p.loads,
        cfVisits: p.visits,
        cfRealVisits: p.realVisits,
        ga4LandingSessions: landing,
        landingCoverage: r4(cov),
        siteCoverage: r4(site),
        cfLoads: p.loads,
        ga4Views: g?.views || 0,
        loadsCoverage: ratio(g?.views || 0, p.loads),
      });
    }
  }
  return finish(ctx, {
    id: "consent-gap",
    required: [cf, ga],
    sources: ["cloudflareRum", "ga4Behavior"],
    rows,
    impactUnit: "cf-loads",
    thresholds: pick("CG_MIN_DAYS", "CG_MIN_VISITS", "CG_MIN_SAMPLES", "CG_REL"),
    unavailable: usable ? null : cc?.reason || "la comparación de consentimiento todavía no es posible",
    window: cc?.cfRange ? { start: cc.cfRange.start, end: cc.cfRange.end, days: cc.days, tz: "America/Montevideo" } : null,
    summary: (r) => {
      let s = `Google Analytics ve el ${fmtPct(cc?.siteCoverage)} de las entradas que cuenta Cloudflare (${cc?.days ?? 0} días)`;
      s += r.length
        ? `; ${r.length} páginas quedan por debajo del ${fmtPct((cc?.siteCoverage ?? 0) * T.CG_REL)}.`
        : "; ninguna página queda muy por debajo.";
      const a = cc?.cfInternalShare;
      const b = cc?.ga4InternalShare;
      if (a !== null && a !== undefined && b !== null && b !== undefined && Math.abs(a - b) > T.CG_INTERNAL_GAP) {
        s += ` Internas: Cloudflare ${fmtPct(a)} · GA4 ${fmtPct(b)}: el cociente por cargas puede estar inflado.`;
      }
      if (skippedTruncated) s += ` ${skippedTruncated} rutas sin comparar: la lista de GA4 vino cortada.`;
      if (cc?.cfPagesTruncated) s += " La lista de páginas de Cloudflare vino cortada algún día: las cifras por ruta son un piso.";
      return s;
    },
  });
}

// ---- 2. mobile-worse ----------------------------------------------------------------------------

function cwvString(
  r: { lcp: { rating: string | null }; inp: { rating: string | null }; cls: { rating: string | null } } | undefined
): string | null {
  if (!r) return null;
  const w = (x: string | null) => (x === "good" ? "bien" : x === "ni" ? "regular" : x === "poor" ? "mal" : "—");
  return `LCP ${w(r.lcp.rating)} · INP ${w(r.inp.rating)} · CLS ${w(r.cls.rating)}`;
}

export function mobileWorse(ctx: SignalContext): Signal {
  const ga = ctx.sources.ga4Behavior;
  const vitals = new Map((ctx.sources.cloudflareRum.data?.vitals || []).map((v) => [`${v.path}|${v.device}`, v]));
  const clarity = new Map(
    (ctx.sources.clarity.data?.urlDevice || []).filter((u) => u.device === "mobile").map((u) => [u.path, u.rage?.sessionsShare ?? null])
  );
  const crux = new Map((ctx.sources.crux.data?.urls || []).filter((u) => u.formFactor === "PHONE").map((u) => [u.path, u]));
  const rows: DraftRow[] = [];
  for (const p of ga.data?.pages || []) {
    const mo = p.mobile;
    const de = p.desktop;
    if (!mo || !de || mo.views < T.MW_MIN_MOBILE || de.views < T.MW_MIN_DESKTOP) continue;
    const gap = mo.engagementRate !== null && de.engagementRate !== null ? de.engagementRate - mo.engagementRate : null;
    const slow =
      mo.avgEngagementSec !== null &&
      de.avgEngagementSec !== null &&
      de.avgEngagementSec > 0 &&
      mo.avgEngagementSec <= de.avgEngagementSec * T.MW_TIME_RATIO;
    if (!((gap !== null && gap >= T.MW_GAP) || slow)) continue;
    const cr = crux.get(p.path);
    rows.push({
      key: p.path,
      path: p.path,
      family: p.family,
      impact: mo.views,
      mobileViews: mo.views,
      desktopViews: de.views,
      mobileEngagement: mo.engagementRate,
      desktopEngagement: de.engagementRate,
      gapPoints: gap === null ? null : Math.round(gap * 1000) / 10,
      mobileAvgSec: mo.avgEngagementSec,
      desktopAvgSec: de.avgEngagementSec,
      mobileCwv: cwvString(vitals.get(`${p.path}|mobile`)),
      clarityRageMobile: clarity.get(p.path) ?? null,
      cruxPhone: cr ? cwvString({ lcp: { rating: cr.rating.lcp }, inp: { rating: cr.rating.inp }, cls: { rating: cr.rating.cls } }) : null,
    });
  }
  return finish(ctx, {
    id: "mobile-worse",
    required: [ga],
    sources: ["ga4Behavior", "cloudflareRum", "clarity", "crux"],
    rows,
    impactUnit: "ga4-views",
    thresholds: pick("MW_MIN_MOBILE", "MW_MIN_DESKTOP", "MW_GAP", "MW_TIME_RATIO"),
    summary: (r) =>
      r.length
        ? `${r.length} páginas con el celular ${Math.round(T.MW_GAP * 100)} puntos o más debajo de la computadora (o la mitad del tiempo); ${fmtInt(
            r.reduce((s, x) => s + Number(x.mobileViews || 0), 0)
          )} vistas desde celular.`
        : "Ninguna página con muestra suficiente rinde mucho peor en el celular.",
  });
}

// ---- 3. low-reading -----------------------------------------------------------------------------

export function lowReading(ctx: SignalContext): Signal {
  const ga = ctx.sources.ga4Behavior;
  const cl = ctx.sources.clarity.data;
  const scroll = new Map(((cl?.urlsUy?.length ? cl.urlsUy : cl?.urls) || []).map((u) => [u.path, u.scrollDepth]));
  const rows: DraftRow[] = [];
  let unmeasured = 0;
  let unmeasuredViews = 0;
  /** Medidas (hay eventos de lectura) pero sin el porcentaje: el reporte de read_percent no llegó. */
  let noPercent = 0;
  let eligible = 0;
  const consider = (key: string, path: string, family: string, views: number, ev: any, rates: any, template: boolean) => {
    if (views < T.LR_MIN_VIEWS) return;
    if (!rates?.readMeasured) {
      unmeasured++;
      unmeasuredViews += views;
      return;
    }
    eligible++;
    if (rates.read50 === null || rates.read50 === undefined) {
      noPercent++;
      return;
    }
    if (!(rates.read50 < T.LR_MAX_RATE)) return;
    const sc = scroll.get(path);
    rows.push({
      key,
      path,
      family,
      impact: views,
      views,
      read50: ev.read50,
      readAny: ev.readAny,
      read50Rate: rates.read50,
      read90Rate: rates.read90,
      clarityScroll: sc ?? null,
      template,
    });
  };
  for (const p of ga.data?.pages || []) if (!p.template) consider(p.path, p.path, p.family, p.views, p.events, p.rates, false);
  for (const t of ga.data?.templates || []) consider(t.template, t.template, t.family, t.views, t.events, t.rates, true);
  const groups: Signal["groups"] = unmeasured
    ? [{ key: "sin-medicion", label: "sin medición de lectura", count: unmeasured, share: null }]
    : [];
  if (noPercent) groups.push({ key: "sin-porcentaje", label: "con lectura medida pero sin read_percent", count: noPercent, share: null });
  // Un dato que falta nunca es "ninguna página": si no llegó el porcentaje de NINGUNA página medida, la
  // señal no está disponible; si llegó de algunas, las que faltan se cuentan aparte y se dice.
  const dims = ga.data?.customDimensions || [];
  const registered = dims.includes("customEvent:content_path") && dims.includes("customEvent:read_percent");
  const carriedRead = (ga.carried || []).includes("read");
  let unavailable: string | null = null;
  if (ga.data && eligible > 0 && noPercent === eligible) {
    unavailable = registered
      ? "faltan los eventos de read_percent (cuota de GA4 baja o reporte fallido)"
      : "la propiedad GA4 no tiene registradas content_path y read_percent";
  }
  return finish(ctx, {
    id: "low-reading",
    required: [ga],
    sources: ["ga4Behavior", "clarity"],
    rows,
    groups,
    unavailable,
    reason: carriedRead && !unavailable ? "porcentajes de lectura de la corrida anterior (el reporte de hoy no llegó)" : null,
    severityCap: carriedRead ? "low" : undefined,
    impactUnit: "ga4-views",
    thresholds: pick("LR_MIN_MEASURED", "LR_MIN_VIEWS", "LR_MAX_RATE", "LR_SCROLL"),
    summary: (r) => {
      const quarter = r.filter((x) => x.clarityScroll !== null && Number(x.clarityScroll) < T.LR_SCROLL).length;
      let s = r.length
        ? `${r.length} páginas medidas donde menos del ${fmtPct(T.LR_MAX_RATE)} de las vistas llega a la mitad`
        : "Ninguna página medida queda debajo del umbral de lectura";
      if (quarter) s += ` (${quarter} ni un cuarto según Clarity)`;
      if (unmeasured) s += `; ${unmeasured} páginas populares sin medición de lectura (${fmtInt(unmeasuredViews)} vistas)`;
      s += noPercent ? `; ${noPercent} medidas sin el porcentaje de lectura (no se sabe).` : ".";
      if (carriedRead) s += " Porcentajes de la corrida anterior.";
      return s;
    },
  });
}

// ---- 4. poor-vitals -----------------------------------------------------------------------------

export function poorVitals(ctx: SignalContext): Signal {
  const cf = ctx.sources.cloudflareRum;
  const loads = cfLoads(ctx);
  const elements = cf.data?.elements || [];
  const crux = new Map((ctx.sources.crux.data?.urls || []).map((u) => [`${u.path}|${u.formFactor}`, u]));
  const rows: DraftRow[] = [];
  for (const v of cf.data?.vitals || []) {
    if (v.realSamples < T.PV_MIN_SAMPLES) continue;
    for (const metric of ["lcp", "inp", "cls"] as const) {
      const r = v[metric];
      if (r.rating !== "poor") continue;
      const els = elements
        .filter((e) => e.metric === metric && e.path === v.path && e.device === v.device)
        .sort((a, b) => b.events - a.events);
      const total = els.reduce((s, e) => s + e.events, 0);
      const top = els[0];
      const cr = crux.get(`${v.path}|${v.device === "desktop" ? "DESKTOP" : "PHONE"}`);
      const p75 = v.p75Approx ? (metric === "lcp" ? v.p75Approx.lcpMs : metric === "inp" ? v.p75Approx.inpMs : v.p75Approx.cls) : null;
      rows.push({
        key: `${v.path}|${v.device}|${metric}`,
        path: v.path,
        family: insightFamily(v.path),
        impact: loads.device(v.path, v.device) || loads.of(v.path),
        device: v.device,
        metric,
        samples: v.samples,
        realSamples: v.realSamples,
        poorShare: r.poorShare,
        goodShare: r.total ? r4(r.good / r.total) : null,
        p75Approx: p75,
        element: top ? top.element || "sin atribuir" : null,
        elementShare: top && total ? r4(top.events / total) : null,
        inpName: metric === "inp" && top ? top.inpName : null,
        cruxP75: cr ? (metric === "lcp" ? cr.lcpMs : metric === "inp" ? cr.inpMs : cr.cls) : null,
      });
    }
  }
  // Sin ninguna fila de Web Vitals con páginas cargadas, "ninguna página tiene LCP malo" sería una
  // afirmación sacada de la nada: la consulta de vitals falló o no trajo nada.
  const noVitals = !!cf.data && !(cf.data.vitals || []).length && (cf.data.pages || []).length > 0;
  const vitalDaysMissing = cf.data?.partialDays?.vitals || 0;
  return finish(ctx, {
    id: "poor-vitals",
    required: [cf],
    sources: ["cloudflareRum", "crux"],
    rows,
    unavailable: noVitals ? "Cloudflare no devolvió Web Vitals en la ventana (consulta fallida o vacía)" : null,
    reason: vitalDaysMissing ? `${vitalDaysMissing} días sin Web Vitals quedan afuera de las calificaciones` : null,
    impactUnit: "cf-loads",
    thresholds: pick("PV_MIN_SAMPLES", "PV_POOR_SHARE"),
    summary: (r) => {
      if (!r.length) return "Ninguna página con muestra suficiente tiene LCP, INP o CLS malos.";
      const byMetric = (m: string) => r.filter((x) => x.metric === m).length;
      const counts = new Map<string, number>();
      for (const x of r)
        if (x.element && x.element !== "sin atribuir") counts.set(String(x.element), (counts.get(String(x.element)) || 0) + 1);
      const topEl = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      return (
        `${r.length} combinaciones página × dispositivo con más del ${fmtPct(T.PV_POOR_SHARE)} malo (LCP ${byMetric("lcp")}, INP ${byMetric("inp")}, CLS ${byMetric("cls")})` +
        (topEl ? `; el elemento más repetido es ${topEl[0].slice(0, 120)}.` : ".")
      );
    },
  });
}

// ---- 5. search-no-results -----------------------------------------------------------------------

export function searchNoResults(ctx: SignalContext): Signal {
  const ga = ctx.sources.ga4Behavior;
  const s = ga.data?.search;
  const rows: DraftRow[] = [];
  const q = !!s?.qRegistered;
  if (s && q) {
    for (const t of s.noResultTerms)
      if (t.events >= T.SN_MIN_TERM) rows.push({ key: t.term, path: null, family: null, impact: t.events, term: t.term, events: t.events });
  } else if (s) {
    for (const p of s.noResultPages)
      if (p.events >= T.SN_MIN_PAGE)
        rows.push({ key: p.path, path: p.path, family: insightFamily(p.path), impact: p.events, events: p.events });
  }
  return finish(ctx, {
    id: "search-no-results",
    required: [ga],
    sources: ["ga4Behavior"],
    rows,
    impactUnit: "events",
    thresholds: pick("SN_MIN_TERM", "SN_MIN_PAGE", "SN_MEDIUM_RATIO"),
    reason: s && !q ? "registrar la dimensión q (paso 5.6) para ver qué se buscó" : null,
    severity: (r) => (!r.length ? "none" : s && s.opens > 0 && s.noResults / s.opens >= T.SN_MEDIUM_RATIO ? "medium" : "low"),
    summary: () =>
      s
        ? `${fmtInt(s.noResults)} búsquedas sin resultado de ${fmtInt(s.opens)} aperturas del buscador` +
          (q ? `; ${rows.length} términos con ${T.SN_MIN_TERM} o más.` : "; sin la dimensión q sólo se sabe en qué páginas.")
        : "Sin datos del buscador.",
  });
}

// ---- 6. outbound-rate ---------------------------------------------------------------------------

export function outboundRate(ctx: SignalContext): Signal {
  const ga = ctx.sources.ga4Behavior;
  const out = ga.data?.outbound || [];
  const rows: DraftRow[] = [];
  let unmeasured = 0;
  const consider = (key: string, family: string, views: number, ev: any, rates: any, template: boolean) => {
    if (views < T.OR_MIN_VIEWS) return;
    if (!rates?.measured) {
      unmeasured++;
      return;
    }
    const rate = rates.outbound;
    if (rate === null || rate === undefined || rate < T.OR_MIN_RATE) return;
    const domains = out.filter((o) => o.path === key).sort((a, b) => b.events - a.events);
    const total = domains.reduce((s, o) => s + o.events, 0);
    rows.push({
      key,
      path: key,
      family,
      impact: views,
      views,
      outbound: ev.outbound,
      outboundRate: rate,
      topDomain: domains[0]?.domain ?? null,
      topDomainShare: domains[0] && total ? r4(domains[0].events / total) : null,
      template,
    });
  };
  for (const p of ga.data?.pages || []) if (!p.template) consider(p.path, p.family, p.views, p.events, p.rates, false);
  for (const t of ga.data?.templates || []) consider(t.template, t.family, t.views, t.events, t.rates, true);
  return finish(ctx, {
    id: "outbound-rate",
    required: [ga],
    sources: ["ga4Behavior"],
    rows,
    groups: unmeasured ? [{ key: "sin-medicion", label: "sin medición de clics", count: unmeasured, share: null }] : [],
    impactUnit: "ga4-views",
    thresholds: pick("OR_MIN_MEASURED", "OR_MIN_VIEWS", "OR_MIN_RATE"),
    summary: (r) =>
      (r.length
        ? `${r.length} páginas medidas con ${fmtPct(T.OR_MIN_RATE)} o más de salidas por vista (aproximación de "se va y no vuelve")`
        : "Ninguna página medida manda afuera a más de un cuarto de sus vistas") + (unmeasured ? `; ${unmeasured} sin medición.` : "."),
  });
}

// ---- 7. not-indexed -----------------------------------------------------------------------------

export function notIndexed(ctx: SignalContext): Signal {
  const ix = ctx.sources.indexation;
  const loads = cfLoads(ctx);
  const data = ix.data;
  const rows: DraftRow[] = (data?.rows || []).map((r) => ({
    key: r.path,
    path: r.path,
    family: r.family,
    impact: loads.of(r.path),
    class: r.class,
    reason: r.reason,
    coverageState: r.coverageState,
    checkedAt: r.checkedAt,
    lastCrawlTime: r.lastCrawlTime,
    googleCanonical: r.googleCanonical,
    pageFetchState: r.pageFetchState,
  }));
  const fams = (data?.families || []).filter((f) => f.randomChecked >= T.NI_MIN_CHECKED && f.shareActionable !== null);
  const groups: Signal["groups"] = fams
    .sort((a, b) => (b.shareActionable || 0) - (a.shareActionable || 0))
    .map((f) => ({
      key: `${f.family}${f.localized ? "|traducidas" : ""}`,
      label: `${f.family}${f.localized ? " (traducidas)" : ""}: ${f.randomActionable} de ${f.randomChecked} al azar con problema`,
      count: f.randomActionable,
      share: f.shareActionable,
    }));
  if (data?.newUrls?.checked) {
    const n = data.newUrls;
    groups.push({
      key: "nuevas",
      label: `nuevas: ${n.indexed} de ${n.checked} indexadas a los ${n.medianAgeDays === null ? "—" : Math.round(n.medianAgeDays)} días`,
      count: n.checked,
      share: ratio(n.indexed, n.checked),
    });
  }
  const top20 = new Set(
    [...(ctx.sources.cloudflareRum.data?.pages || [])]
      .sort((a, b) => b.loads - a.loads)
      .slice(0, T.NI_TOP_PAGES)
      .map((p) => p.path)
  );
  return finish(ctx, {
    id: "not-indexed",
    required: [ix],
    sources: ["indexation"],
    rows,
    groups,
    impactUnit: "cf-loads",
    thresholds: pick("NI_GRACE_DAYS", "NI_MIN_CHECKED", "NI_FAMILY_SHARE", "NI_FAMILY_HIGH"),
    severity: (r) => {
      if (!r.length) return "none";
      if (fams.some((f) => (f.shareActionable || 0) >= T.NI_FAMILY_HIGH) || r.some((x) => x.path && top20.has(String(x.path))))
        return "high";
      if (fams.some((f) => (f.shareActionable || 0) >= T.NI_FAMILY_SHARE)) return "medium";
      return "low";
    },
    summary: (r) => {
      const t = data?.totals28d;
      const worst = fams.sort((a, b) => (b.shareActionable || 0) - (a.shareActionable || 0))[0];
      return (
        `${fmtInt(t?.checked)} URLs inspeccionadas en 28 días, ${fmtInt(t?.indexed)} indexadas, ${r.length} con un problema que se puede arreglar` +
        (worst ? `; la peor familia al azar es ${worst.family} (${worst.randomActionable} de ${worst.randomChecked}).` : ".")
      );
    },
  });
}

// ---- 8. helpful-no ------------------------------------------------------------------------------

export function helpfulNo(ctx: SignalContext): Signal {
  const fb = ctx.sources.feedback;
  const gaPages = new Map((ctx.sources.ga4Behavior.data?.pages || []).map((p) => [p.path, p]));
  const loads = cfLoads(ctx);
  const rows: DraftRow[] = [];
  for (const p of fb.data?.pages || []) {
    const answers = p.helpfulYes + p.helpfulNo;
    if (p.distinctNo < T.HN_MIN_NO || answers < T.HN_MIN_ANSWERS) continue;
    const share = p.helpfulNo / answers;
    if (share < T.HN_SHARE) continue;
    const g = gaPages.get(p.path);
    const exposures = g?.events?.helpfulViews ?? null;
    // Las respuestas son de TODOS los países (sitefeedbacks no guarda el país) y las vistas del widget
    // sólo de Uruguay (GA4 filtrado): el cociente es una cota, con tope en 1, y la columna lo dice.
    const answerRate = exposures ? ratio(answers, exposures) : null;
    rows.push({
      key: p.path,
      path: p.path,
      family: p.family,
      // Una sola unidad para toda la señal: cargas uruguayas de Cloudflare (no depende del consentimiento).
      impact: loads.of(p.path),
      yes: p.helpfulYes,
      no: p.helpfulNo,
      distinctNo: p.distinctNo,
      noShare: r4(share),
      ga4Views: g?.views ?? null,
      helpfulViews: exposures,
      answerRate: answerRate === null ? null : Math.min(1, answerRate),
    });
  }
  return finish(ctx, {
    id: "helpful-no",
    required: [fb],
    sources: ["feedback", "ga4Behavior", "cloudflareRum"],
    rows,
    impactUnit: "cf-loads",
    thresholds: pick("HN_MIN_NO", "HN_MIN_ANSWERS", "HN_SHARE"),
    severityCap: "medium",
    summary: (r) =>
      r.length
        ? `${r.length} páginas donde la mitad o más de las respuestas al «¿Te sirvió?» es «No» (con ${T.HN_MIN_NO} o más personas distintas).`
        : "Ninguna página con respuestas suficientes tiene mayoría de «No».",
  });
}

// ---- 9. friction --------------------------------------------------------------------------------

export function friction(ctx: SignalContext): Signal {
  const cl = ctx.sources.clarity;
  const loads = cfLoads(ctx);
  const rows: DraftRow[] = [];
  const consider = (path: string, device: string, m: any, population: string) => {
    // `sessions` de Clarity es totalSessionCount e incluye bots: cuentan sólo las de personas.
    const total = Number(m.sessions) || 0;
    const bots = Number(m.botSessions);
    const sessions = Number.isFinite(bots) && bots > 0 ? Math.max(0, total - bots) : total;
    if (sessions < T.FR_MIN_SESSIONS) return;
    const checks: [string, any, number][] = [
      ["rage", m.rage, T.FR_RAGE],
      ["dead", m.dead, T.FR_DEAD],
      ["quickback", m.quickback, T.FR_QUICKBACK],
      ["scriptErrors", m.scriptErrors, T.FR_ERRORS],
    ];
    const which = checks
      .filter(([, f, th]) => f && f.sessionsShare !== null && f.sessionsShare >= th && f.sessionsShare * sessions >= T.FR_MIN_AFFECTED)
      .map(([name]) => name);
    if (!which.length) return;
    rows.push({
      key: `${path}|${device}`,
      path,
      family: insightFamily(path),
      impact: sessions,
      device,
      population,
      sessions,
      rageRate: m.rage?.sessionsShare ?? null,
      deadRate: m.dead?.sessionsShare ?? null,
      quickbackRate: m.quickback?.sessionsShare ?? null,
      scriptErrorRate: m.scriptErrors?.sessionsShare ?? null,
      excessiveScrollRate: m.excessiveScroll?.sessionsShare ?? null,
      scrollDepth: m.scrollDepth ?? null,
      which: which.join(","),
    });
  };
  const uy = !!cl.data?.urlsUy?.length;
  const base = uy ? cl.data!.urlsUy! : cl.data?.urls || [];
  for (const u of base) consider(u.path, "todos", u, uy ? "Uruguay" : "todos los países");
  // Clarity no cruza URL × dispositivo × país en una misma llamada: estas filas son de todos los países.
  for (const u of cl.data?.urlDevice || []) consider(u.path, u.device, u, "todos los países");
  return finish(ctx, {
    id: "friction",
    required: [cl],
    sources: ["clarity"],
    rows,
    impactUnit: "events",
    thresholds: pick("FR_MIN_SESSIONS", "FR_RAGE", "FR_DEAD", "FR_QUICKBACK", "FR_ERRORS", "FR_MIN_AFFECTED"),
    severity: (r) => {
      if (!r.length) return "none";
      const paths = [...new Set(r.map((x) => String(x.path)))];
      const affected = paths.reduce((s, p) => s + loads.of(p), 0);
      return pageSeverity(affected, ctx.siteLoadsUy, r.length);
    },
    summary: (r) =>
      r.length
        ? `${r.length} URLs (o URL × dispositivo) con clics de bronca, clics muertos, vueltas atrás o errores por encima del umbral en las últimas 24 h (sesiones sin bots; las filas por dispositivo son de todos los países).`
        : "Ninguna URL con sesiones suficientes pasa los umbrales de fricción.",
  });
}

// ---- 10. bing-only-queries ----------------------------------------------------------------------

export function bingOnlyQueries(ctx: SignalContext): Signal {
  const bing = ctx.sources.bing;
  const gsc = ctx.gscQueries;
  const rows: DraftRow[] = [];
  if (gsc) {
    for (const q of bing.data?.queries || []) {
      if (q.impressions < T.BQ_MIN_IMPR) continue;
      const g = gsc.get(q.query);
      if (g && g.clicks > 0) continue;
      rows.push({
        key: q.query,
        path: null,
        family: null,
        impact: q.impressions,
        query: q.query,
        bingImpressions: q.impressions,
        bingClicks: q.clicks,
        bingPosition: q.avgPosition,
        gscImpressions: g?.impressions ?? 0,
        gscClicks: g?.clicks ?? 0,
      });
    }
  }
  return finish(ctx, {
    id: "bing-only-queries",
    required: [bing],
    sources: ["bing"],
    rows,
    impactUnit: "impressions",
    thresholds: pick("BQ_MIN_IMPR", "BQ_MEDIUM_ROWS", "BQ_MEDIUM_IMPR"),
    unavailable: bing.data && !gsc ? ctx.gscUnavailable || "no se pudo leer el archivo de Search Console (searchconsoledays)" : null,
    severity: (r) =>
      !r.length ? "none" : r.filter((x) => Number(x.bingImpressions) >= T.BQ_MEDIUM_IMPR).length >= T.BQ_MEDIUM_ROWS ? "medium" : "low",
    summary: (r) =>
      `${r.length} búsquedas con ${T.BQ_MIN_IMPR} o más impresiones en Bing sin clics de Google en 28 días (Search Console anonimiza las consultas raras).`,
  });
}

// ---- 11. ai-crawler-errors ----------------------------------------------------------------------

/** "en 7 días", o lo que de verdad cubrió la consulta (el plan gratis puede acortarla a un día). */
function zoneDays(z: SourceBlock<any>): string {
  const n = z.window?.days;
  if (!n || !Number.isFinite(n)) return "en la ventana consultada";
  return n === 1 ? "en 1 día" : `en ${n} días`;
}

export function aiCrawlerErrors(ctx: SignalContext): Signal {
  const z = ctx.sources.cloudflareZone;
  const rows: DraftRow[] = [];
  for (const c of z.data?.crawlerPaths || []) {
    const isErr = c.status >= 400 && c.requests >= T.AI_MIN_ERR;
    const isRedir = [301, 302, 307, 308].includes(c.status) && c.requests >= T.AI_MIN_REDIR;
    if (!isErr && !isRedir) continue;
    rows.push({
      key: `${c.crawler}|${c.path}|${c.status}`,
      path: c.path,
      family: insightFamily(c.path),
      impact: c.requests,
      crawler: c.crawler,
      status: c.status,
      requests: c.requests,
      kind: isErr ? "error" : "redirect",
    });
  }
  const crawlers = z.data?.crawlers || [];
  const errShare = (c: (typeof crawlers)[number]) => (c.requests ? (c.errors4xx + c.errors5xx) / c.requests : 0);
  return finish(ctx, {
    id: "ai-crawler-errors",
    required: [z],
    sources: ["cloudflareZone"],
    rows,
    groups: crawlers.map((c) => ({
      key: c.crawler,
      label: `${c.crawler} (declarado, user-agent)`,
      count: c.requests,
      share: ratio(c.requests - c.ok2xx, c.requests),
    })),
    impactUnit: "requests",
    thresholds: pick("AI_MIN_ERR", "AI_MIN_REDIR", "AI_MEDIUM_ERR_SHARE", "AI_HIGH_ERR_SHARE"),
    severity: (r) => {
      if (!r.length) return "none";
      if (crawlers.some((c) => errShare(c) >= T.AI_HIGH_ERR_SHARE)) return "high";
      if (crawlers.some((c) => errShare(c) >= T.AI_MEDIUM_ERR_SHARE)) return "medium";
      return "low";
    },
    summary: (r) =>
      `${r.length} pares rastreador × URL con error o redirección ${zoneDays(z)} (user-agent declarado); ${r.filter((x) => x.kind === "error").length} son errores.`,
  });
}

// ---- 12. edge-errors ----------------------------------------------------------------------------

export function edgeErrors(ctx: SignalContext): Signal {
  const z = ctx.sources.cloudflareZone;
  const rows: DraftRow[] = (z.data?.errors || [])
    .filter((e) => e.status >= 400 && e.requests >= T.EE_MIN)
    .map((e) => ({
      key: `${e.path}|${e.status}`,
      path: e.path,
      family: insightFamily(e.path),
      impact: e.requests,
      status: e.status,
      requests: e.requests,
      crawlerShare: e.crawlerShare,
    }));
  return finish(ctx, {
    id: "edge-errors",
    required: [z],
    sources: ["cloudflareZone"],
    rows,
    impactUnit: "requests",
    thresholds: pick("EE_MIN"),
    summary: (r) => {
      const total = r.reduce((s, x) => s + Number(x.requests || 0), 0);
      const fromCrawlers = r.reduce((s, x) => s + Number(x.requests || 0) * (Number(x.crawlerShare) || 0), 0);
      return (
        `${r.length} URL × código con ${T.EE_MIN} o más respuestas de error ${zoneDays(z)}: ${fmtInt(total)} pedidos de personas y bots` +
        (total ? `, ${fmtPct(fromCrawlers / total)} de rastreadores declarados.` : ".")
      );
    },
  });
}

// ---- todas --------------------------------------------------------------------------------------

const BUILDERS: Record<SignalId, (ctx: SignalContext) => Signal> = {
  "consent-gap": consentGap,
  "mobile-worse": mobileWorse,
  "low-reading": lowReading,
  "poor-vitals": poorVitals,
  "search-no-results": searchNoResults,
  "outbound-rate": outboundRate,
  "not-indexed": notIndexed,
  "helpful-no": helpfulNo,
  friction,
  "bing-only-queries": bingOnlyQueries,
  "ai-crawler-errors": aiCrawlerErrors,
  "edge-errors": edgeErrors,
};

/**
 * El orden de la página y del digest: `ok` con filas (por severidad y después impacto), `ok` sin
 * filas, `stale`, `unavailable`. Dentro de cada grupo, el orden de `SIGNAL_IDS`.
 */
export function orderSignals(signals: Signal[]): Signal[] {
  const idx = (id: SignalId) => SIGNAL_IDS.indexOf(id);
  const group = (s: Signal) => (s.status === "ok" ? (s.rows.length ? 0 : 1) : s.status === "stale" ? 2 : 3);
  return [...signals].sort((a, b) => {
    const g = group(a) - group(b);
    if (g) return g;
    if (group(a) === 0) {
      const sv = SEV_RANK[b.severity] - SEV_RANK[a.severity];
      if (sv) return sv;
      if (b.impact !== a.impact) return b.impact - a.impact;
    }
    return idx(a.id) - idx(b.id);
  });
}

export function buildSignals(ctx: SignalContext): Signal[] {
  return orderSignals(SIGNAL_IDS.map((id) => BUILDERS[id](ctx)));
}
