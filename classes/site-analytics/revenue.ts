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
import { runReports } from "./ga4";
import type { Ga4Report } from "./ga4";

/** Cuántas URLs se piden antes de agrupar. Muy por encima de las que tienen ingreso. */
const PAGE_LIMIT = 2000;

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
 * Trae el ingreso publicitario de la ventana pedida y lo agrupa por familia.
 *
 * Tres reportes en una sola llamada (`batchRunReports` acepta hasta cinco): totales, por página y
 * por día.
 */
export async function fetchRevenue(
  start: string,
  end: string,
  asOf: string
): Promise<RevenueSnapshot> {
  const dateRanges = [{ startDate: start, endDate: end }];
  const adMetrics = [{ name: "totalAdRevenue" }, { name: "publisherAdImpressions" }, { name: "publisherAdClicks" }];

  const reports = await runReports([
    {
      dateRanges,
      metrics: [...adMetrics, { name: "screenPageViews" }, { name: "sessions" }],
    },
    {
      dateRanges,
      dimensions: [{ name: "pagePath" }],
      metrics: [...adMetrics, { name: "screenPageViews" }],
      limit: PAGE_LIMIT,
      orderBys: [{ metric: { metricName: "totalAdRevenue" }, desc: true }],
    },
    {
      dateRanges,
      dimensions: [{ name: "date" }],
      metrics: [{ name: "totalAdRevenue" }, { name: "publisherAdImpressions" }],
      limit: 400,
    },
  ]);

  const currency = reports[0]?.metadata?.currencyCode || "USD";
  const totalRow = rows(reports[0])[0];
  const totals: RevenueTotals = {
    adRevenue: num(totalRow?.metricValues?.[0]?.value),
    adImpressions: num(totalRow?.metricValues?.[1]?.value),
    adClicks: num(totalRow?.metricValues?.[2]?.value),
    screenPageViews: num(totalRow?.metricValues?.[3]?.value),
    sessions: num(totalRow?.metricValues?.[4]?.value),
    rpm: 0,
  };
  totals.rpm = rpmOf(totals.adRevenue, totals.screenPageViews);

  // ---- por página, y de ahí por familia ----
  const pageRows: RevenuePageRow[] = [];
  const families = new Map<string, RevenueFamilyRow>();

  for (const row of rows(reports[1])) {
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
    families: familyRows,
    topPages: pageRows.filter((p) => p.adRevenue > 0).slice(0, 40),
    daily,
    // Se calcula abajo con `revenueIsEmpty` y no acá: cuando `pending` tenía su propia copia de la
    // regla, las dos se separaron y la lectura de una impresión salió publicada como definitiva.
    pending: false,
  };

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
 * 1 impresión y USD 0,000122 sobre 4.131 vistas de página — un cero disfrazado que pasaba las tres
 * puertas y quedaba guardado como "el sitio no factura nada". El guardarraíl estaba escrito para el
 * cero y no atajaba el casi-cero.
 */
export function revenueIsEmpty(snapshot: RevenueSnapshot): boolean {
  const { adImpressions, screenPageViews } = snapshot.totals;
  if (adImpressions < MIN_AD_IMPRESSIONS) return true;
  // Sin vistas no hay tasa que calcular; el piso absoluto ya decidió.
  return screenPageViews > 0 && adImpressions < screenPageViews * MIN_IMPRESSIONS_PER_VIEW;
}
