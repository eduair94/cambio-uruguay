// Todos los topes de filas y los límites de cuota de `currency-usage-insights`, en un solo lugar.
//
// `tests/insights/budget.test.ts` arma el snapshot y el documento del día con ESTOS números, así que
// la tabla de tamaños de docs/analytics/USAGE_INSIGHTS.md y el test no se pueden separar: si un tope
// cambia, el test mide el documento nuevo.

// ---- snapshot (`usageinsightsnapshots`, key: site) ----------------------------------------------
export const CF_PAGES = 150;
export const CF_VITALS = 80;
export const CF_ELEMENTS_PER_METRIC = 30;
export const CF_REFERRERS = 40;
export const CF_COUNTRIES = 25;
export const CF_DEVICES = 6;
export const CF_DAILY = 28;
/** 150 y no 200: medido al tope, 200 dejaba el snapshot a 920 KB, sin el 10 % de margen. */
export const CONSENT_PAGES = 150;

export const GA4_PAGES = 80;
export const GA4_TEMPLATES = 40;
export const GA4_FLOWS = 100;
export const GA4_LINK_AREAS = 80;
export const GA4_NAV_TARGETS = 80;
export const GA4_OUTBOUND = 100;
export const GA4_PLACEMENTS = 40;
export const GA4_NO_RESULT_TERMS = 60;
export const GA4_SELECT_TERMS = 40;
export const GA4_PAGE_TERMS = 40;
export const GA4_NO_RESULT_PAGES = 30;
export const GA4_DAILY = 28;

export const IDX_ROWS = 80;
export const IDX_FAMILIES = 80;

export const FEEDBACK_PAGES = 150;
export const FEEDBACK_DAILY = 28;

export const CLARITY_URLS = 50;
export const CLARITY_URLS_UY = 40;
export const CLARITY_URL_DEVICE = 50;
export const CLARITY_DEVICE_BROWSER = 30;
export const CLARITY_CHANNEL_DEVICE = 30;
export const CLARITY_UNKNOWN_KEYS = 30;
/** Filas de una respuesta de Clarity: sin paginación, la cola se corta en silencio. */
export const CLARITY_ROW_LIMIT = 1000;

export const BING_TRAFFIC = 26;
export const BING_QUERIES = 200;
export const BING_PAGES = 150;
export const BING_CRAWL = 30;
export const BING_ISSUES = 100;
export const BING_BUCKETS = 4;

export const ZONE_CRAWLERS = 14;
export const ZONE_CRAWLER_PATHS = 150;
export const ZONE_ERRORS = 100;
export const ZONE_CACHE = 100;
export const ZONE_STATUS_TOTALS = 40;

export const CRUX_URLS = 200;
export const CRUX_HISTORY_PERIODS = 25;

export const INSIGHT_PAGES = 150;
export const SIGNAL_ROWS = 20;
export const SIGNAL_GROUPS = 12;
export const TREND_DAYS = 28;

// ---- archivo por día (`usageinsightdays`) -------------------------------------------------------
export const DAY_CF_PAGES_BY_DEVICE = 500;
export const DAY_CF_REFERRERS = 150;
export const DAY_CF_COUNTRIES = 60;
export const DAY_CF_VITALS = 250;
export const DAY_CF_ELEMENTS_PER_METRIC = 100;
export const DAY_GA4_PAGES = 100;
export const DAY_SIGNAL_KEYS = 30;

// ---- documento de estado (`usageinsightsnapshots`, key: state) ----------------------------------
export const STATE_FIRST_SEEN_MAX = 60_000;
export const STATE_INSPECTIONS_MAX = 6_000;
/** Una inspección más vieja que esto se olvida. */
export const INSPECTION_RETENTION_DAYS = 35;
/** Una ruta que salió del sitemap se recuerda este tiempo y después se borra. */
export const SITEMAP_GONE_DAYS = 35;
/**
 * Claves de filas guardadas por señal para marcar `isNew`. Por encima de cualquier `count` posible:
 * todas las entradas de las señales están topadas por debajo de 300 filas (CONSENT_PAGES, CF_VITALS × 3,
 * BING_QUERIES, ZONE_CRAWLER_PATHS…). Doce señales × 1.000 claves cortas son unos cientos de KB.
 */
export const STATE_SIGNAL_KEYS_MAX = 1000;

// ---- cuotas y pacing ----------------------------------------------------------------------------
/** Cloudflare: 300 consultas GraphQL cada 5 minutos por token. 1,1 s entre una y otra deja ~270. */
export const CF_MIN_INTERVAL_MS = 1100;
export const CF_MAX_QUERIES_PER_RUN = 200;
/** Días de RUM que todavía no están muestreados (la API conserva 7 días enteros). */
export const CF_RECENT_DAYS = 7;
export const CF_BACKFILL_MAX_DAYS = 28;

export const INSPECT_MAX_DEFAULT = 400;
export const INSPECT_MAX_CEILING = 1000;
export const INSPECT_MINUTES_DEFAULT = 20;
export const INSPECT_NEW_MAX = 150;
export const INSPECT_TOP_MAX = 100;
export const INSPECT_TOP_POOL = 300;
export const INSPECT_NEW_DAYS = 14;
export const INSPECT_COOLDOWN_NEW_DAYS = 3;
export const INSPECT_COOLDOWN_TOP_DAYS = 7;
export const INSPECT_COOLDOWN_RANDOM_DAYS = 28;
export const INSPECT_MAX_CONSECUTIVE_ERRORS = 5;

export const CLARITY_MAX_CALLS_DEFAULT = 6;
export const CLARITY_MAX_CALLS_CEILING = 8;
/** Clarity y CrUX no se vuelven a leer dentro de esta ventana después de una lectura buena. */
export const REREAD_GUARD_HOURS = 20;

export const CRUX_URLS_DEFAULT = 100;
export const CRUX_URLS_CEILING = 300;
export const CRUX_PACE_MS = 500;
export const CRUX_WALL_MS = 5 * 60_000;
export const CRUX_HISTORY_EVERY_DAYS = 7;

/** GA4: debajo de esto de cuota horaria restante no se corren los reportes de dimensiones propias. */
export const GA4_MIN_QUOTA_REMAINING = 2000;

/** Una caída bajo este factor del valor guardado es una falla de origen, no un día flojo. */
export const THIN_FACTOR = 0.3;
/** Los días que un rechazo por "flaco" se sostiene antes de aceptar el valor nuevo. */
export const THIN_REFUSAL_MAX_DAYS = 7;
/** Una ventana de sitemap con menos URLs que esto es una lectura rota. */
export const SITEMAP_MIN_URLS = 200;

/** Lee un entero de una variable de entorno y lo sujeta a [lo, hi]. */
export function envInt(name: string, fallback: number, lo: number, hi: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}
