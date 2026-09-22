// El cruce: oportunidades de Search Console × precio del clic por familia. Puro, sin I/O.
import type { Opportunity, PageTypeRow } from "../gsc/types";
import type { RevenueSnapshot } from "../site-analytics/revenue";
import type { FamilyLedgerRow, PricedAction, RevenuePlanAlert } from "./types";
import {
  MIN_FAMILY_AD_IMPRESSIONS,
  MIN_FAMILY_VIEWS,
  TIER_DRIFT,
  UY_RPM_DIVERGENCE,
  bucketOfUrl,
  tierOf,
  valueOf,
} from "./value";
import type { ValueTable } from "./value";

/**
 * Los tipos de oportunidad cuyo `potentialClicks` es un clic que HOY NO EXISTE y podría existir.
 *
 * Quedan afuera a propósito: `rising` (su `potentialClicks` son clics ya ganados, no una promesa),
 * `new-query` y `dead-weight` (valen 0 por construcción, son contexto) y `falling`, que tiene su
 * propia cola porque no es lo mismo ganar un peso que dejar de perderlo.
 */
export const UPSIDE_KINDS = new Set(["striking-distance", "ctr-below-curve", "cannibalisation"]);

/** Lo que ya se estaba cobrando y se está yendo. */
export const DEFEND_KINDS = new Set(["falling"]);

/** Tope de filas que guarda el snapshot. Más abajo la estimación ya no distingue una fila de otra. */
export const MAX_ACTIONS = 60;
export const MAX_DEFEND = 30;

/** Vistas o clics a partir de los cuales una familia sin clasificar deja de ser un detalle. */
export const UNCLASSIFIED_MIN_VIEWS = 300;

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

/**
 * Le pone precio a una lista de oportunidades y la reordena.
 *
 * `rankByClicks` guarda el puesto que la fila tenía en el orden viejo. No es decorativo: es la
 * única forma de ver, sin rehacer la cuenta, que la cola cambió — y si NUNCA cambia, este job no
 * hace falta y hay que decirlo en vez de mantenerlo.
 */
export function priceActions(opportunities: Opportunity[], table: ValueTable, kinds: Set<string>): PricedAction[] {
  const eligible = opportunities
    .filter((o) => kinds.has(o.kind))
    .filter((o) => o.potentialClicks > 0)
    .sort((a, b) => b.potentialClicks - a.potentialClicks);

  return eligible
    .map((o, index) => {
      const url = o.urls && o.urls.length ? o.urls[0] : null;
      const bucket = bucketOfUrl(url);
      const value = valueOf(table, bucket);
      return {
        kind: o.kind,
        subject: o.subject,
        note: o.note,
        impressions: o.impressions,
        clicks: o.clicks,
        position: o.position,
        potentialClicks: o.potentialClicks,
        url,
        bucket,
        usdPerClick: round4(value.usdPerClick),
        basis: value.basis,
        expectedUsd: round2(o.potentialClicks * value.usdPerClick),
        weightedClicks: round2(o.potentialClicks * value.multiplier),
        rankByClicks: index + 1,
      };
    })
    .sort((a, b) => b.weightedClicks - a.weightedClicks || b.potentialClicks - a.potentialClicks);
}

/**
 * La tabla que contesta la pregunta de fondo: qué porción del tráfico se lleva cada familia y qué
 * porción de la plata deja.
 *
 * `gap` es la resta de las dos porciones. Una familia con -30 puntos no es una familia que haya que
 * apagar: es una familia desde la cual conviene que el lector siga a otra cosa. Esa decisión la
 * toma una persona; acá sólo queda la evidencia ordenada.
 */
export function familyLedger(
  pageTypes: PageTypeRow[],
  revenue: RevenueSnapshot | null,
  table: ValueTable
): FamilyLedgerRow[] {
  const search = new Map(pageTypes.map((p) => [p.bucket, p]));
  const totalViews = (revenue?.families || []).reduce((s, f) => s + f.screenPageViews, 0);
  const buckets = new Set<string>([...search.keys(), ...table.byBucket.keys()]);

  const rows: FamilyLedgerRow[] = [];
  for (const bucket of buckets) {
    const value = valueOf(table, bucket);
    const familyRevenue = (revenue?.families || []).find((f) => f.bucket === bucket);
    const sc = search.get(bucket);
    const shareOfViews = totalViews > 0 ? value.views / totalViews : 0;
    const shareOfRevenue = familyRevenue?.shareOfRevenue || 0;
    rows.push({
      ...value,
      usdPerClick: round4(value.usdPerClick),
      measuredRpm: round4(value.measuredRpm),
      measuredMultiplier: round2(value.measuredMultiplier),
      multiplier: round2(value.multiplier),
      adRevenue: round4(value.adRevenue),
      searchClicks: sc?.clicks || 0,
      searchImpressions: sc?.impressions || 0,
      shareOfViews,
      shareOfRevenue,
      gap: shareOfRevenue - shareOfViews,
    });
  }
  // Por tráfico: la fila que más importa leer es la que más gente recibe, tenga o no ingreso.
  rows.sort((a, b) => b.views - a.views || b.searchClicks - a.searchClicks);

  // Y se recorta. `bucketOf` deja cada página suelta con su path entero, así que la primera corrida
  // real contra producción devolvió 830 "familias": una cola larguísima de páginas con dos
  // impresiones que nadie va a leer y que se guardaría entera en Mongo todos los días. Se conservan
  // las que tienen tráfico o plata, y el resto se cae.
  const kept = rows.slice(0, MAX_FAMILIES);
  const extra = rows.slice(MAX_FAMILIES).filter((r) => r.adRevenue > 0 || r.searchClicks > 0);
  return kept.concat(extra).slice(0, MAX_FAMILIES * 2);
}

/** Filas de la tabla de familias que el snapshot guarda. Ver el comentario en `familyLedger`. */
export const MAX_FAMILIES = 120;

export interface PlanAlertInput {
  table: ValueTable;
  families: FamilyLedgerRow[];
  actions: PricedAction[];
  /** `asOf` del snapshot de Search Console del que salieron las oportunidades. */
  gscAsOf: string | null;
  /** `asOf` del snapshot de ingreso. */
  revenueAsOf: string | null;
  /** Hoy, `YYYY-MM-DD`. */
  today: string;
}

const daysBetween = (from: string, to: string): number | null => {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
};

export function buildPlanAlerts(input: PlanAlertInput): RevenuePlanAlert[] {
  const alerts: RevenuePlanAlert[] = [];
  const { table, families, actions, gscAsOf, revenueAsOf, today } = input;

  if (table.siteRpm <= 0) {
    alerts.push({
      level: "warn",
      code: "revenue-pending",
      message:
        "Todavía no hay ingreso medido (el enlace AdSense↔GA4 contesta ceros o el job de GA4 no corrió). " +
        "La cola de abajo sigue ordenada por el multiplicador del tramo, que es lo que decide el orden; " +
        "la columna en USD queda en cero hasta que haya medición.",
    });
  } else if (table.provisional) {
    alerts.push({
      level: "info",
      code: "revenue-provisional",
      message:
        "El ingreso de la ventana es tan chico que cualquier RPM por familia es provisional: el orden " +
        "vale, el monto en USD es una escala, no una previsión.",
    });
  }

  // Vistas que no ven anuncios. El RPM del sitio y el RPM sólo-Uruguay comparten la plata y
  // difieren en cuántas vistas la dividen; cuando el uruguayo se despega por más de
  // `UY_RPM_DIVERGENCE`, el denominador del sitio trae vistas que no cargan ni una unidad —
  // tráfico automatizado, que la lectura del 21/9 vio y que casi nunca sale de Uruguay. Exige la
  // misma muestra que una familia: con cuarenta vistas uruguayas y un clic el cociente es ruido.
  // AVISA, NO FILTRA: `siteRpm` sigue sin recortar a propósito y nada se excluye por país.
  const uyRatio = table.siteRpm > 0 ? table.siteRpmUy / table.siteRpm : 0;
  const uySampled = table.uyViews >= MIN_FAMILY_VIEWS && table.uyAdImpressions >= MIN_FAMILY_AD_IMPRESSIONS;
  if (uySampled && uyRatio >= UY_RPM_DIVERGENCE) {
    alerts.push({
      level: "warn",
      code: "views-without-impressions",
      message:
        `El RPM medido sólo sobre visitas de Uruguay es ${uyRatio.toFixed(1)}× el del sitio entero: hay vistas ` +
        `que no ven anuncios (Uruguay es el ${(table.uyShareOfViews * 100).toFixed(0)} % de las vistas; el sitio ` +
        `sirve ${(table.impressionsPerView * 100).toFixed(1)} impresiones cada 100 vistas). Casi seguro tráfico ` +
        "automatizado inflando el denominador. El RPM del sitio y los multiplicadores se publican SIN filtrar a " +
        "propósito — no se bloquea ningún país por suposición; la lectura uruguaya va al lado. Montos en " +
        "docs/seo/data/.",
    });
  }

  const gscAge = gscAsOf ? daysBetween(gscAsOf, today) : null;
  if (gscAsOf === null) {
    alerts.push({
      level: "critical",
      code: "gsc-missing",
      message: "No hay snapshot de Search Console: sin él no hay oportunidades que valuar. Mirá `currency-gsc`.",
    });
  } else if (gscAge !== null && gscAge > 3) {
    alerts.push({
      level: "warn",
      code: "gsc-stale",
      message: `El snapshot de Search Console es del ${gscAsOf} (${gscAge} días). El plan está valuando una foto vieja.`,
    });
  }

  const revenueAge = revenueAsOf ? daysBetween(revenueAsOf, today) : null;
  if (revenueAge !== null && revenueAge > 3) {
    alerts.push({
      level: "warn",
      code: "revenue-stale",
      message: `El snapshot de ingreso es del ${revenueAsOf} (${revenueAge} días). Mirá \`currency-site-analytics\`.`,
    });
  }

  // Familias sin clasificar con tráfico de verdad. Es la lista de mantenimiento de este módulo:
  // mientras tenga filas, el plan está valuando algo al promedio por no saber qué es.
  const unclassified = families
    .filter((f) => f.tier === "otro" && (f.views >= UNCLASSIFIED_MIN_VIEWS || f.searchClicks >= 20))
    .slice(0, 10);
  if (unclassified.length) {
    alerts.push({
      level: "info",
      code: "unclassified-families",
      message:
        `${unclassified.length} familia(s) con tráfico no están en ningún tramo y valen 1× por defecto: ` +
        `${unclassified.map((f) => f.bucket).join(", ")}. Clasificarlas en classes/revenueplan/value.ts.`,
    });
  }

  // El tramo contra la medición. Cuando una familia junta muestra propia y contradice al tramo, el
  // que está mal es el tramo — y lo que hay que corregir es la tabla, no la medición.
  const drifted = families.filter(
    (f) =>
      f.basis === "medido" &&
      f.tierMultiplier > 0 &&
      (f.measuredMultiplier > f.tierMultiplier * TIER_DRIFT || f.measuredMultiplier * TIER_DRIFT < f.tierMultiplier)
  );
  for (const f of drifted.slice(0, 5)) {
    alerts.push({
      level: "info",
      code: "tier-drift",
      message:
        `${f.bucket} mide ${f.measuredMultiplier}× el RPM del sitio y su tramo «${f.tier}» asume ` +
        `${f.tierMultiplier}×. La medición manda para esa familia; el tramo hay que corregirlo.`,
    });
  }

  // ¿Este job cambia algo? Si la cola por plata es la misma que la cola por clics, sobra.
  const top = actions.slice(0, 10);
  const moved = top.filter((a) => a.rankByClicks > 10).length;
  if (top.length >= 5) {
    alerts.push({
      level: "info",
      code: "reorder",
      message:
        `${moved} de las 10 primeras acciones por plata NO estaban entre las 10 primeras por clics. ` +
        (moved === 0
          ? "Con este dato, ordenar por plata y ordenar por clics dan lo mismo."
          : "Ese es exactamente el trabajo que una cola ordenada por clics mandaba a hacer último."),
    });
  }

  return alerts;
}

/** Suma de lo estimado. Se publica como suma de estimaciones, jamás como una previsión de ingreso. */
export function totalUpside(actions: PricedAction[]): number {
  return round2(actions.reduce((s, a) => s + a.expectedUsd, 0));
}

/** Re-exportado para que el entrypoint no tenga que importar de dos módulos. */
export { tierOf };
export const CAPS = { MAX_ACTIONS, MAX_DEFEND };
