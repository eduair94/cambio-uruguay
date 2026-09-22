// Cuánto rinde cada página, que es la mitad de la pregunta que nadie podía contestar.
//
// POR QUÉ ES UN ARCHIVO APARTE Y UNA COLECCIÓN APARTE. `/estadisticas-del-sitio` es una página
// PÚBLICA: publica cuánta gente entra y qué lee, a propósito. Cuánto factura el sitio no es lo
// mismo, y un campo de ingreso dentro del documento que sirve esa página es un campo que un
// `.select()` mal escrito publica sin que nadie lo note. Así que el ingreso vive en
// `siterevenuesnapshots`, que ninguna ruta pública lee, y se sirve sólo por
// `/api/site-revenue` con `requireAdmin`. tests/site_analytics/revenue_privacy.test.ts falla si
// alguien mete un campo de plata en el snapshot público.
//
// DE DÓNDE SALEN LOS NÚMEROS. Del enlace AdSense↔GA4 (Admin → Vinculaciones de productos), creado
// el 2026-09-02. No hace falta ninguna credencial nueva: las métricas `totalAdRevenue`,
// `publisherAdImpressions` y `publisherAdClicks` aparecen en la misma Data API que el job ya lee.
// Google avisa que tarda hasta 24 h en empezar a devolver datos, y mientras tanto contesta ceros —
// por eso `revenueIsEmpty()` existe y el job trata el vacío como "todavía no", no como un error.
// Lo que no contesta es SÓLO ceros: el enlace no rellena hacia atrás, así que una ventana de 28
// días que empezó antes del enlace vuelve con las horas sueltas que alcanzó a medir. Ver el
// comentario de los dos pisos, abajo.
//
// LA MÉTRICA DE GOBIERNO es el RPM por FAMILIA de página, no por URL. Una URL suelta no dice nada;
// 46 páginas de `/convertir` medidas juntas dicen que la familia entera rinde 0,05 % de CTR en
// búsqueda, y el RPM dice si además de no traer clics tampoco paga. La familia se calcula con el
// MISMO `bucketOf` que usa el pipeline de Search Console, para que las dos tablas se puedan cruzar
// fila a fila.
import { bucketOf } from "../gsc/opportunities";
import { exactDimension, runReports } from "./ga4";
import type { Ga4Report, Ga4ReportRequest } from "./ga4";

/** Tamaño de página, NO un límite de cobertura: las URLs sin ingreso también cuentan vistas. */
const PAGE_LIMIT = 2000;
/** Como máximo 50 peticiones de páginas. Si no alcanza, no se guarda una foto recortada. */
const MAX_PAGE_ROWS = 100000;

/**
 * El país del segundo total, como código ISO 3166-1 alfa-2.
 *
 * Se filtra por `countryId` y no por `country` a propósito: `country` es el NOMBRE localizado
 * ("Uruguay" en la cuenta de servicio de hoy), que es lo que guarda el snapshot público
 * (`refresh.ts`, reporte 5) y que cambia si algún día cambia el idioma de la cuenta. El código no.
 *
 * POR QUÉ EXISTE UN SEGUNDO TOTAL. La lectura del 21/9 (`docs/seo/data/revenue-2026-09-21/`,
 * gitignored) mostró vistas que no ven anuncios: tráfico automatizado que infla el denominador del
 * RPM y no aporta ni una impresión. Medir el mismo total sólo sobre visitas uruguayas —donde
 * está la audiencia real del sitio— da una segunda lectura que ese tráfico no puede mover. Es una
 * lectura DIAGNÓSTICA, publicada AL LADO del total del sitio: no reemplaza a `totals`, no decide
 * `pending` y no excluye a nadie. Regla de `docs/seo/adsense-growth-loop.md`: «No bloquear países
 * por suposición».
 */
export const UY_COUNTRY_ID = "UY";

export interface RevenueTotals {
  /** En la moneda de la propiedad (la informa GA4 en `metadata.currencyCode`). */
  adRevenue: number;
  adImpressions: number;
  adClicks: number;
  screenPageViews: number;
  sessions: number;
  /** Ingreso por cada 1.000 vistas de página. La comparación honesta entre familias. */
  rpm: number;
}

export interface RevenueFamilyRow {
  /** `/guias/*`, `/convertir/*`, `/` … mismo criterio que el tablero de Search Console. */
  bucket: string;
  urls: number;
  adRevenue: number;
  adImpressions: number;
  adClicks: number;
  screenPageViews: number;
  rpm: number;
  /** Porcentaje del ingreso total que aporta la familia, 0..1. */
  shareOfRevenue: number;
}

export interface RevenuePageRow {
  path: string;
  adRevenue: number;
  adImpressions: number;
  screenPageViews: number;
  rpm: number;
}

export interface RevenueSnapshot {
  key: string;
  asOf: string;
  currency: string;
  range: { start: string; end: string };
  totals: RevenueTotals;
  /**
   * El mismo total, sólo sobre visitas desde Uruguay (`countryId = UY`). Lectura resistente al
   * tráfico automatizado, que casi nunca sale de acá. Diagnóstica y aditiva: no alimenta `pending`
   * ni el guardarraíl de regresión, y las familias siguen sin filtrar (ver `UY_COUNTRY_ID`).
   */
  totalsUy: RevenueTotals;
  families: RevenueFamilyRow[];
  /** Las páginas que más facturan, para el caso en que una sola cargue una familia entera. */
  topPages: RevenuePageRow[];
  /** Serie diaria, para ver si un cambio de colocación movió algo. */
  daily: Array<{ date: string; adRevenue: number; adImpressions: number }>;
  /** Cuando el enlace es nuevo o no existe, Google contesta ceros. Esto lo dice en la pantalla. */
  pending: boolean;
}

export const SITE_REVENUE_KEY = "site";

const num = (value?: string) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const rpmOf = (revenue: number, views: number) => (views > 0 ? (revenue / views) * 1000 : 0);

function rows(report: Ga4Report | undefined) {
  return report?.rows || [];
}

/**
 * Completa el desglose antes de calcular cualquier RPM. Ordenar sólo por ingreso y tomar las
 * primeras URLs quitaba del denominador miles de páginas sin anuncios. `rowCount` describe el
 * informe entero, no esta página; un corte o un cambio de informe conserva el snapshot anterior.
 */
async function allPageRows(request: Ga4ReportRequest, first: Ga4Report | undefined) {
  const count = first?.rowCount ?? (first && !rows(first).length ? 0 : NaN);
  if (!Number.isInteger(count) || count < 0 || count > MAX_PAGE_ROWS) {
    throw new Error("GA4 revenue: page report has missing or out-of-budget rowCount");
  }
  const complete: NonNullable<Ga4Report["rows"]> = [];
  const seen = new Set<string>();
  let page = first;
  do {
    const chunk = rows(page);
    const pageCount = page?.rowCount ?? (page && !chunk.length ? 0 : NaN);
    if (pageCount !== count || chunk.length !== Math.min(PAGE_LIMIT, count - complete.length)) {
      throw new Error("GA4 revenue: incomplete or changing page report");
    }
    for (const row of chunk) {
      const path = row.dimensionValues?.[0]?.value;
      if (typeof path !== "string" || seen.has(path)) {
        throw new Error("GA4 revenue: missing or repeated page path");
      }
      seen.add(path);
      complete.push(row);
    }
    if (complete.length === count) return complete;
    [page] = await runReports([{ ...request, offset: complete.length }]);
  } while (complete.length < count);
  return complete;
}

/** Lee un reporte de totales (sin dimensiones) con el orden de métricas de `totalMetrics`. */
function totalsOf(report: Ga4Report | undefined): RevenueTotals {
  const row = rows(report)[0];
  const totals: RevenueTotals = {
    adRevenue: num(row?.metricValues?.[0]?.value),
    adImpressions: num(row?.metricValues?.[1]?.value),
    adClicks: num(row?.metricValues?.[2]?.value),
    screenPageViews: num(row?.metricValues?.[3]?.value),
    sessions: num(row?.metricValues?.[4]?.value),
    rpm: 0,
  };
  totals.rpm = rpmOf(totals.adRevenue, totals.screenPageViews);
  return totals;
}

/**
 * Trae el ingreso publicitario de la ventana pedida y lo agrupa por familia.
 *
 * Cuatro reportes en una sola llamada (`batchRunReports` acepta hasta cinco): totales, por página,
 * por día y los totales sólo de Uruguay. Después se pagina el desglose por URL hasta completarlo.
 * El de Uruguay va ÚLTIMO a propósito: los índices 0/1/2 están fijados por
 * `tests/site_analytics/revenue_pagination.test.ts` y por la paginación, que relee el índice 1.
 */
export async function fetchRevenue(
  start: string,
  end: string,
  asOf: string
): Promise<RevenueSnapshot> {
  const dateRanges = [{ startDate: start, endDate: end }];
  const adMetrics = [{ name: "totalAdRevenue" }, { name: "publisherAdImpressions" }, { name: "publisherAdClicks" }];
  const pageRequest: Ga4ReportRequest = {
    dateRanges,
    dimensions: [{ name: "pagePath" }],
    metrics: [...adMetrics, { name: "screenPageViews" }],
    limit: PAGE_LIMIT,
    // Cada URL tiene un lugar estable, incluso cuando miles empatan con ingreso cero.
    orderBys: [{ dimension: { dimensionName: "pagePath", orderType: "ALPHANUMERIC" } }],
  };

  const totalMetrics = [...adMetrics, { name: "screenPageViews" }, { name: "sessions" }];

  const reports = await runReports([
    { dateRanges, metrics: totalMetrics },
    pageRequest,
    {
      dateRanges,
      dimensions: [{ name: "date" }],
      metrics: [{ name: "totalAdRevenue" }, { name: "publisherAdImpressions" }],
      limit: 400,
    },
    // Mismas métricas y misma ventana que el total, recortadas a Uruguay. Sin dimensiones: es UNA
    // fila, y si el reporte falta (fixture viejo, GA4 caído) queda en ceros en vez de romper.
    { dateRanges, metrics: totalMetrics, dimensionFilter: exactDimension("countryId", UY_COUNTRY_ID) },
  ]);
  const completePages = await allPageRows(pageRequest, reports[1]);

  const currency = reports[0]?.metadata?.currencyCode || "USD";
  const totals = totalsOf(reports[0]);
  const totalsUy = totalsOf(reports[3]);
  if (!completePages.length && (totals.screenPageViews > 0 || totals.adRevenue > 0 || totals.adImpressions > 0 || totals.adClicks > 0)) {
    throw new Error("GA4 revenue: empty page report contradicts totals");
  }

  // ---- por página, y de ahí por familia ----
  const pageRows: RevenuePageRow[] = [];
  const families = new Map<string, RevenueFamilyRow>();

  for (const row of completePages) {
    // El query string se descarta igual que en el snapshot público: `/buscar?q=...` no debe quedar
    // guardado en ningún lado.
    const path = (row.dimensionValues?.[0]?.value || "").split("?")[0] || "/";
    const adRevenue = num(row.metricValues?.[0]?.value);
    const adImpressions = num(row.metricValues?.[1]?.value);
    const adClicks = num(row.metricValues?.[2]?.value);
    const screenPageViews = num(row.metricValues?.[3]?.value);

    pageRows.push({ path, adRevenue, adImpressions, screenPageViews, rpm: rpmOf(adRevenue, screenPageViews) });

    const bucket = bucketOf(path);
    const acc =
      families.get(bucket) ||
      ({
        bucket,
        urls: 0,
        adRevenue: 0,
        adImpressions: 0,
        adClicks: 0,
        screenPageViews: 0,
        rpm: 0,
        shareOfRevenue: 0,
      } as RevenueFamilyRow);
    acc.urls += 1;
    acc.adRevenue += adRevenue;
    acc.adImpressions += adImpressions;
    acc.adClicks += adClicks;
    acc.screenPageViews += screenPageViews;
    families.set(bucket, acc);
  }

  const familyRows = [...families.values()].map((f) => ({
    ...f,
    rpm: rpmOf(f.adRevenue, f.screenPageViews),
    shareOfRevenue: totals.adRevenue > 0 ? f.adRevenue / totals.adRevenue : 0,
  }));
  // Por ingreso mientras haya; por vistas cuando todavía no hay plata, para que la tabla sirva
  // igual el primer día.
  familyRows.sort((a, b) => b.adRevenue - a.adRevenue || b.screenPageViews - a.screenPageViews);

  const daily = rows(reports[2])
    .map((row) => {
      const raw = row.dimensionValues?.[0]?.value || "";
      return {
        date: raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw,
        adRevenue: num(row.metricValues?.[0]?.value),
        adImpressions: num(row.metricValues?.[1]?.value),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const snapshot: RevenueSnapshot = {
    key: SITE_REVENUE_KEY,
    asOf,
    currency,
    range: { start, end },
    totals,
    totalsUy,
    families: familyRows,
    topPages: pageRows
      .filter((p) => p.adRevenue > 0)
      .sort((a, b) => b.adRevenue - a.adRevenue || b.screenPageViews - a.screenPageViews || a.path.localeCompare(b.path))
      .slice(0, 40),
    daily,
    // Se calcula abajo con `revenueIsEmpty` y no acá: cuando `pending` tenía su propia copia de la
    // regla, las dos se separaron y la lectura de una impresión salió publicada como definitiva.
    pending: false,
  };

  // Sólo `totals` decide. `totalsUy` queda deliberadamente fuera de esta regla y de
  // `revenueWouldRegress`: un segundo eje haría irrazonable la negativa a sobrescribir.
  snapshot.pending = revenueIsEmpty(snapshot);
  return snapshot;
}

/**
 * Piso absoluto de impresiones para que la ventana cuente como medida.
 *
 * La ventana es de 28 días: un solo día sano del sitio ya deja miles de impresiones, así que 50 en
 * cuatro semanas está dos órdenes de magnitud por debajo de lo normal y no puede confundirse con un
 * mes flojo. Existe además de la tasa porque con muy pocas vistas la tasa es ruido: 10 impresiones
 * sobre 40 vistas da 25 % y sigue sin decir nada.
 */
export const MIN_AD_IMPRESSIONS = 50;

/**
 * Piso de impresiones por vista de página.
 *
 * La lectura que motivó todo esto: 4.131 vistas → 1 impresión, o sea 0,024 %. Del otro lado, lo que
 * el sitio debería dar: `utils/ads.ts` declara hasta dos unidades en las rutas que llevan anuncios,
 * y aun descontando las rutas sin anuncios, el consentimiento rechazado y que `AdSlot` es lazy (sin
 * scroll no carga), la cobertura real cae en el orden de las decenas por ciento. 1 % es un piso
 * cuarenta veces por encima del artefacto y cien veces por debajo de lo esperable: cualquier día de
 * poco tráfico pero con anuncios sirviendo lo pasa sobrado.
 */
export const MIN_IMPRESSIONS_PER_VIEW = 0.01;

/**
 * True mientras la lectura no sea todavía una medición.
 *
 * Empezó preguntando por el cero exacto, que es lo que contesta un enlace AdSense↔GA4 inexistente.
 * No es lo que contesta un enlace RECIÉN creado: el del 2026-09-02 no rellena hacia atrás y devolvió
 * una sola impresión sobre miles de vistas de página — un cero disfrazado que pasaba las tres
 * puertas y quedaba guardado como "el sitio no factura nada". El guardarraíl estaba escrito para el
 * cero y no atajaba el casi-cero.
 */
export function revenueIsEmpty(snapshot: RevenueSnapshot): boolean {
  const { adImpressions, screenPageViews } = snapshot.totals;
  if (adImpressions < MIN_AD_IMPRESSIONS) return true;
  // Sin vistas no hay tasa que calcular; el piso absoluto ya decidió.
  return screenPageViews > 0 && adImpressions < screenPageViews * MIN_IMPRESSIONS_PER_VIEW;
}
