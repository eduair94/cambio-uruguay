// Search Console URL Inspection: qué NO está indexado y por qué, por familia de páginas.
//
// CUOTA: 2.000 inspecciones por día y por propiedad, compartidas con `currency-gsc` (20 por día) y con
// lo que se mire a mano. Este job usa ≤ 400 por DÍA DE GOOGLE (hora del Pacífico) sumando todas sus
// corridas: antes de cada llamada reserva una unidad en la base (`store.reserveQuota`), así que una
// segunda corrida el mismo día (un deploy, un pm2 resurrect, una corrida a mano) sólo usa lo que quedó.
//
// LA MUESTRA ROTA (R7, decisión c): primero las rutas nuevas del sitemap (≤ 14 días), después las más
// visitadas que no se miraron en 7 días, y el resto una tajada al azar por familia. Las tres capas se
// guardan separadas (`r`) porque sólo la de AZAR estima la proporción de una familia: las nuevas son en
// su mayoría páginas que Google todavía no procesó, y las más visitadas tiran a indexadas.
//
// NADA ES UN VEREDICTO POR AUSENCIA: una cuota agotada, un permiso faltante o el reloj cortan la
// muestra y las URLs no inspeccionadas no tienen resultado. Una URL con menos de 14 días en el sitemap
// que Google todavía no indexó es "pendiente", nunca "no indexada".
import { addDays } from "../../site-analytics/refresh";
import type { InspectionOutcome, UrlInspection } from "../../gsc/client";
import type { BlockOutcome } from "../blocks";
import {
  IDX_FAMILIES,
  IDX_ROWS,
  INSPECTION_RETENTION_DAYS,
  INSPECT_COOLDOWN_NEW_DAYS,
  INSPECT_COOLDOWN_RANDOM_DAYS,
  INSPECT_COOLDOWN_TOP_DAYS,
  INSPECT_MAX_CONSECUTIVE_ERRORS,
  INSPECT_NEW_DAYS,
  INSPECT_NEW_MAX,
  INSPECT_TOP_MAX,
  INSPECT_TOP_POOL,
  STATE_INSPECTIONS_MAX,
} from "../caps";
import { daysBetween, insightFamily, sitePath, stripLocale } from "../paths";
import { ACTIONABLE_CLASSES, BY_DESIGN_CLASSES } from "../types";
import type { CompactInspection, CoverageClass, IndexationData, InspectionRow, InspectionStratum } from "../types";

export const INDEXATION_PERMISSION_HINT = "la cuenta de servicio necesita permiso «Completo» en Search Console";
/** Resultados que, con menos de 14 días en el sitemap, son "pendiente" y no "no indexada". */
export const NI_GRACE_DAYS = 14;
export const PENDING_CLASSES: CoverageClass[] = ["crawled-not-indexed", "discovered-not-indexed", "unknown-to-google"];

/**
 * El estado de cobertura → clase, por PALABRA CLAVE (nunca por igualdad: el texto es el del informe de
 * indexación y cambia de redacción). Se pide `languageCode: "en-US"` para que no cambie de idioma.
 */
export function classifyCoverage(
  verdict: string | null | undefined,
  coverageState: string | null | undefined,
  pageFetchState?: string | null,
  indexingState?: string | null
): CoverageClass {
  const s = String(coverageState || "").toLowerCase();
  const pf = String(pageFetchState || "").toUpperCase();
  if (/indexed, though blocked|indexed without content/.test(s)) return "indexed-warning";
  if (/submitted and indexed|indexed, not submitted/.test(s)) return "indexed";
  if (/crawled - currently not indexed|crawled – currently not indexed/.test(s)) return "crawled-not-indexed";
  if (/discovered - currently not indexed|discovered – currently not indexed/.test(s)) return "discovered-not-indexed";
  if (/google chose different canonical/.test(s)) return "duplicate-google-chose";
  if (/duplicate without user-selected canonical/.test(s)) return "duplicate-no-canonical";
  if (/alternate page with proper canonical/.test(s)) return "alternate-canonical";
  if (/page with redirect/.test(s)) return "redirect";
  if (/noindex/.test(s) || (!s && /BLOCKED_BY_(META_TAG|HTTP_HEADER)/.test(String(indexingState || "")))) return "noindex";
  if (/not found \(404\)/.test(s) || pf === "NOT_FOUND") return "not-found";
  if (/soft 404/.test(s)) return "soft-404";
  if (/server error/.test(s)) return "server-error";
  if (/redirect error/.test(s)) return "redirect-error";
  if (/blocked by robots\.txt/.test(s)) return "blocked-robots";
  if (/\(401\)|\(403\)|other 4xx/.test(s)) return "blocked-4xx";
  if (/unknown to google/.test(s)) return "unknown-to-google";
  if (!s && String(verdict || "").toUpperCase() === "PASS") return "indexed";
  return "other";
}

export const isActionable = (c: CoverageClass) => ACTIONABLE_CLASSES.includes(c);
export const isIndexed = (c: CoverageClass) => c === "indexed" || c === "indexed-warning";
export const isByDesign = (c: CoverageClass) => BY_DESIGN_CLASSES.includes(c);

/** FNV-1a de 32 bits: el orden "al azar" reproducible de un día. */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export interface PlanInput {
  sitemapPaths: string[];
  firstSeenOf: (path: string) => string | null;
  seededAt: string;
  /** Última inspección por ruta (YYYY-MM-DD). */
  lastInspected: Map<string, string>;
  /** Rutas de más a menos visitadas (cargas uruguayas de Cloudflare, o vistas de GA4). */
  trafficRank: string[];
  budget: number;
  day: string;
}

export interface PlannedInspection {
  path: string;
  reason: InspectionStratum;
}

/** El plan del día: nuevas → más visitadas → al azar por familia. Puro y determinista. */
export function planInspections(input: PlanInput): PlannedInspection[] {
  const { day, budget } = input;
  if (budget <= 0) return [];
  const inSitemap = new Set(input.sitemapPaths);
  const picked = new Set<string>();
  const out: PlannedInspection[] = [];
  const cooled = (path: string, days: number) => {
    const last = input.lastInspected.get(path);
    return !!last && daysBetween(last, day) < days;
  };

  // 1. nuevas, sólo en castellano. Una ruta traducida toma la fecha de su par en castellano: cuando el
  // traductor publica una página en 38 idiomas, las 38 copias serían "nuevas" el mismo día y llenarían
  // la capa. Las traducciones entran por la capa al azar, con su propia familia "(traducidas)".
  const fresh = input.sitemapPaths
    .filter((path) => stripLocale(path).locale === null)
    .map((path) => ({ path, seen: input.firstSeenOf(path) }))
    .filter((x) => x.seen && x.seen !== input.seededAt && x.seen >= addDays(day, -INSPECT_NEW_DAYS))
    .filter((x) => !cooled(x.path, INSPECT_COOLDOWN_NEW_DAYS))
    .sort((a, b) => (a.seen === b.seen ? a.path.localeCompare(b.path) : a.seen! < b.seen! ? 1 : -1));
  for (const x of fresh) {
    if (out.length >= Math.min(INSPECT_NEW_MAX, budget)) break;
    picked.add(x.path);
    out.push({ path: x.path, reason: "new" });
  }

  // 2. las más visitadas que están en el sitemap
  let top = 0;
  for (const path of input.trafficRank.slice(0, INSPECT_TOP_POOL)) {
    if (out.length >= budget || top >= INSPECT_TOP_MAX) break;
    if (!inSitemap.has(path) || picked.has(path) || cooled(path, INSPECT_COOLDOWN_TOP_DAYS)) continue;
    picked.add(path);
    out.push({ path, reason: "top" });
    top++;
  }

  // 3. al azar, una por familia por vuelta
  const families = new Map<string, string[]>();
  for (const path of input.sitemapPaths) {
    if (picked.has(path) || cooled(path, INSPECT_COOLDOWN_RANDOM_DAYS)) continue;
    const f = insightFamily(path);
    const list = families.get(f) || [];
    list.push(path);
    families.set(f, list);
  }
  const queues = [...families.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, list]) => list.sort((a, b) => fnv1a(day + a) - fnv1a(day + b) || a.localeCompare(b)));
  let round = 0;
  while (out.length < budget) {
    let added = false;
    for (const q of queues) {
      if (out.length >= budget) break;
      if (round < q.length) {
        out.push({ path: q[round], reason: "random" });
        added = true;
      }
    }
    if (!added) break;
    round++;
  }
  return out;
}

/** `"="` si es la misma ruta, la ruta si es del sitio, la URL entera si no. */
export function canonicalForm(value: string | null | undefined, path: string): string | null {
  if (!value) return null;
  const p = sitePath(value);
  if (p === path) return "=";
  if (p) return p;
  return String(value);
}

export function compactOf(path: string, r: InspectionStratum, at: string, res: UrlInspection): CompactInspection {
  return {
    path,
    at,
    r,
    v: res.verdict || "UNKNOWN",
    cs: res.coverageState || "",
    cls: classifyCoverage(res.verdict, res.coverageState, res.pageFetchState, res.indexingState),
    pf: res.pageFetchState || null,
    ix: res.indexingState || null,
    rb: res.robotsTxtState || null,
    lc: res.lastCrawlTime || null,
    gc: canonicalForm(res.googleCanonical, path),
    uc: canonicalForm(res.userCanonical, path),
    ca: res.crawledAs || null,
  };
}

export interface RunDeps {
  inspect: (url: string) => Promise<InspectionOutcome>;
  /** `store.reserveQuota("inspection", día de Google, máximo)`: el nuevo `used`, o null si ya está lleno. */
  reserve: () => Promise<number | null>;
  now: () => number;
  maxMinutes: number;
  siteBase: string;
  day: string;
}

export interface RunResult {
  results: CompactInspection[];
  links: Map<string, string>;
  stoppedBy: IndexationData["today"]["stoppedBy"];
  minutes: number;
  errors: number;
}

export async function runInspections(plan: PlannedInspection[], deps: RunDeps): Promise<RunResult> {
  const started = deps.now();
  const results: CompactInspection[] = [];
  const links = new Map<string, string>();
  let stoppedBy: RunResult["stoppedBy"] = null;
  let consecutive = 0;
  let errors = 0;
  for (const item of plan) {
    if (deps.now() - started >= deps.maxMinutes * 60000) {
      stoppedBy = "time";
      break;
    }
    // La unidad se reserva ANTES de la llamada y no se devuelve aunque la llamada falle.
    const used = await deps.reserve();
    if (used === null) {
      stoppedBy = "counter";
      break;
    }
    let outcome: InspectionOutcome;
    try {
      outcome = await deps.inspect(`${deps.siteBase}${item.path === "/" ? "/" : item.path}`);
    } catch {
      errors++;
      consecutive++;
      if (consecutive >= INSPECT_MAX_CONSECUTIVE_ERRORS) {
        stoppedBy = "errors";
        break;
      }
      continue;
    }
    if (outcome.ok === false) {
      stoppedBy = (outcome as { kind: "permission" | "quota" }).kind;
      break;
    }
    consecutive = 0;
    const result = (outcome as { ok: true; result: UrlInspection }).result;
    results.push(compactOf(item.path, item.reason, deps.day, result));
    if (result.inspectionResultLink) links.set(item.path, result.inspectionResultLink);
  }
  return { results, links, stoppedBy, minutes: Math.round(((deps.now() - started) / 60000) * 10) / 10, errors };
}

/** El último resultado por ruta, sin lo de más de 35 días, con tope de 6.000 (los más nuevos). */
export function mergeInspections(prev: CompactInspection[], today: CompactInspection[], day: string): CompactInspection[] {
  const byPath = new Map<string, CompactInspection>();
  for (const r of prev || []) {
    if (!r?.path || daysBetween(r.at, day) > INSPECTION_RETENTION_DAYS) continue;
    const cur = byPath.get(r.path);
    if (!cur || cur.at <= r.at) byPath.set(r.path, r);
  }
  for (const r of today) byPath.set(r.path, r);
  return [...byPath.values()]
    .sort((a, b) => (a.at === b.at ? a.path.localeCompare(b.path) : a.at < b.at ? 1 : -1))
    .slice(0, STATE_INSPECTIONS_MAX);
}

export const NI_MIN_CHECKED = 10;

export interface BuildIndexationInput {
  inspections: CompactInspection[];
  firstSeenOf: (path: string) => string | null;
  seededAt: string;
  /** Cargas (o vistas) por ruta, para ordenar las filas. */
  traffic: Map<string, number>;
  day: string;
  today: IndexationData["today"];
  sitemap: IndexationData["sitemap"];
  links?: Map<string, string>;
}

export function isPending(r: CompactInspection, firstSeen: string | null, seededAt: string): boolean {
  if (!PENDING_CLASSES.includes(r.cls)) return false;
  if (!firstSeen || firstSeen === seededAt) return false;
  return daysBetween(firstSeen, r.at) < NI_GRACE_DAYS;
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function buildIndexationBlock(input: BuildIndexationInput): IndexationData {
  const recent = input.inspections.filter((r) => daysBetween(r.at, input.day) < 28);
  type Fam = IndexationData["families"][number] & { reasons: Map<CoverageClass, number> };
  const fams = new Map<string, Fam>();
  const totals = { checked: 0, indexed: 0, byDesign: 0, actionable: 0, pending: 0, randomChecked: 0, randomActionable: 0 };
  const newAges: number[] = [];
  const newUrls = { checked: 0, indexed: 0, pending: 0, medianAgeDays: null as number | null };
  const rows: InspectionRow[] = [];

  for (const r of recent) {
    const seen = input.firstSeenOf(r.path);
    const pending = isPending(r, seen, input.seededAt);
    const actionable = isActionable(r.cls) && !pending;
    const localized = stripLocale(r.path).locale !== null;
    const family = insightFamily(r.path);
    const key = `${family}|${localized ? 1 : 0}`;
    const f =
      fams.get(key) ||
      ({
        family,
        localized,
        checked: 0,
        indexed: 0,
        byDesign: 0,
        actionable: 0,
        pending: 0,
        randomChecked: 0,
        randomActionable: 0,
        shareActionable: null,
        newChecked: 0,
        newIndexed: 0,
        topReason: null,
        reasons: new Map(),
      } as Fam);
    f.checked++;
    totals.checked++;
    if (isIndexed(r.cls)) {
      f.indexed++;
      totals.indexed++;
    }
    if (isByDesign(r.cls)) {
      f.byDesign++;
      totals.byDesign++;
    }
    if (pending) {
      f.pending++;
      totals.pending++;
    }
    if (actionable) {
      f.actionable++;
      totals.actionable++;
      f.reasons.set(r.cls, (f.reasons.get(r.cls) || 0) + 1);
    }
    if (r.r === "random") {
      f.randomChecked++;
      totals.randomChecked++;
      if (actionable) {
        f.randomActionable++;
        totals.randomActionable++;
      }
    }
    if (r.r === "new") {
      f.newChecked++;
      newUrls.checked++;
      if (isIndexed(r.cls)) {
        f.newIndexed++;
        newUrls.indexed++;
      }
      if (pending) newUrls.pending++;
      if (seen) newAges.push(Math.max(0, daysBetween(seen, r.at)));
    }
    fams.set(key, f);
    if (actionable) {
      rows.push({
        path: r.path,
        family,
        checkedAt: r.at,
        reason: r.r,
        verdict: r.v,
        coverageState: r.cs,
        class: r.cls,
        pending: false,
        pageFetchState: r.pf,
        indexingState: r.ix,
        robotsTxtState: r.rb,
        lastCrawlTime: r.lc,
        googleCanonical: r.gc,
        userCanonical: r.uc,
        crawledAs: r.ca,
        firstSeenInSitemap: seen,
        resultLink: input.links?.get(r.path) || null,
      });
    }
  }
  newUrls.medianAgeDays = median(newAges);

  const families = [...fams.values()]
    .map(({ reasons, ...f }) => {
      let top: CoverageClass | null = null;
      let best = 0;
      for (const [cls, n] of reasons) if (n > best) ((best = n), (top = cls));
      return {
        ...f,
        // La proporción SÓLO de la capa al azar, y sólo con 10 o más: nunca de una muestra sesgada o de cero.
        shareActionable: f.randomChecked >= NI_MIN_CHECKED ? Math.round((f.randomActionable / f.randomChecked) * 10000) / 10000 : null,
        topReason: top,
      };
    })
    .sort((a, b) => b.checked - a.checked || a.family.localeCompare(b.family))
    .slice(0, IDX_FAMILIES);

  rows.sort(
    (a, b) =>
      (input.traffic.get(b.path) || 0) - (input.traffic.get(a.path) || 0) ||
      (a.checkedAt < b.checkedAt ? 1 : a.checkedAt > b.checkedAt ? -1 : 0)
  );
  return {
    today: input.today,
    sitemap: input.sitemap,
    totals28d: totals,
    families,
    newUrls,
    rows: rows.slice(0, IDX_ROWS),
  };
}

/** El plan resumido por capa, para `today.picked`. */
export function pickedOf(plan: PlannedInspection[]): IndexationData["today"]["picked"] {
  const out = { new: 0, top: 0, random: 0 };
  for (const p of plan) out[p.reason]++;
  return out;
}

/** El estado del bloque según cómo terminó la corrida (2.3.5). */
export function indexationOutcome(
  run: RunResult,
  planned: number,
  data: IndexationData,
  quota: { used: number; max: number; day: string }
): BlockOutcome<IndexationData> {
  const n = run.results.length;
  if (n === 0) {
    if (run.stoppedBy === "counter") {
      return { kind: "skipped", note: `cupo diario de inspección ya usado (${quota.used} de ${quota.max}, día de Google ${quota.day})` };
    }
    if (run.stoppedBy === "permission") return { kind: "inactive", enableHint: INDEXATION_PERMISSION_HINT };
    if (planned === 0) return { kind: "skipped", note: "nada para inspeccionar hoy" };
    return { kind: "failed", note: `indexation: 0 inspecciones (${run.stoppedBy || "sin resultado"})` };
  }
  if (run.stoppedBy && n < planned) {
    return { kind: "partial", data, carried: [], note: `cortado por ${run.stoppedBy} tras ${n} de ${planned}` };
  }
  return { kind: "ok", data, note: null };
}
