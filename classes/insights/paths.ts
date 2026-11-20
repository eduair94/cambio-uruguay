// Rutas y familias de `currency-usage-insights`. Puro.
//
// Toda ruta que entra al snapshot pasa por `sitePath()`: sin query string (un `?q=` es lo que alguien
// escribió), sin fragmento, y sólo del sitio (Clarity y GA4 reciben hits de servidores de desarrollo).
import { bucketOf } from "../gsc/opportunities";
import { addDays, publicPath } from "../site-analytics/refresh";
import { SITE_HOSTS } from "../site-analytics/sourceKinds";

/**
 * Los prefijos de idioma del sitio: los códigos con prefijo de `app/utils/locales.ts` (todos menos
 * `es`). `tests/insights/locale_parity.test.ts` lee ese archivo como texto y exige la misma lista.
 */
export const LOCALE_PREFIXES: readonly string[] = Object.freeze([
  "en",
  "pt",
  "fr",
  "de",
  "it",
  "nl",
  "ca",
  "ro",
  "pl",
  "cs",
  "sk",
  "hu",
  "sv",
  "da",
  "no",
  "fi",
  "el",
  "bg",
  "hr",
  "sl",
  "lt",
  "lv",
  "et",
  "ru",
  "uk",
  "tr",
  "zh",
  "ja",
  "ko",
  "hi",
  "id",
  "ms",
  "vi",
  "th",
  "ar",
  "fa",
  "ur",
  "he",
]);
const LOCALE_SET = new Set(LOCALE_PREFIXES);

export function isSiteHost(host: string): boolean {
  return SITE_HOSTS.includes(String(host || "").toLowerCase());
}

/**
 * La ruta como se guarda: `publicPath()` de una ruta o de una URL absoluta del sitio. Una URL de otro
 * host (un servidor de desarrollo, otro sitio) devuelve `null` y el que llama la descarta.
 */
export function sitePath(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  // Una barra invertida o un carácter de control no es una ruta del sitio: `/\otro.com` el navegador
  // lo abre como `//otro.com`. Las rutas vienen de beacons que cualquiera puede falsificar.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return publicPath(value);
  const absolute = value.startsWith("//") ? `https:${value}` : value;
  if (!/^https?:\/\//i.test(absolute)) return null;
  try {
    const url = new URL(absolute);
    if (!isSiteHost(url.hostname)) return null;
    return publicPath(url.pathname || "/");
  } catch {
    return null;
  }
}

/** `/fr/guias/x` → `{ path: "/guias/x", locale: "fr" }`; una ruta en castellano lleva locale null. */
export function stripLocale(path: string): { path: string; locale: string | null } {
  const segs = String(path || "/")
    .split("/")
    .filter(Boolean);
  if (segs.length && LOCALE_SET.has(segs[0])) {
    const rest = segs.slice(1).join("/");
    return { path: rest ? `/${rest}` : "/", locale: segs[0] };
  }
  return { path: String(path || "/"), locale: null };
}

/**
 * La familia de una ruta para este tablero. `bucketOf` (el mismo de GSC y del plan de ingreso) sin
 * tocarlo, con dos arreglos: se saca el prefijo de idioma antes (bucketOf sólo conoce `/en` y `/pt`)
 * y una ruta de dos o más segmentos que bucketOf deja entera se pliega a `/<seg0>/*`: si no, cada
 * ficha de alquiler sería una familia.
 */
export function insightFamily(path: string): string {
  const p = stripLocale(path).path;
  const b = bucketOf(p);
  const segs = b.split("/").filter(Boolean);
  if (segs.length >= 2 && !b.endsWith("/*")) return `/${segs[0]}/*`;
  return b;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** `/alquileres/:item` → regex que acepta un segmento cualquiera en cada `:item`. */
export function templateMatcher(template: string): RegExp {
  const parts = template.split(":item").map(escapeRe);
  return new RegExp(`^${parts.join("[^/]+")}$`);
}

export interface FoldResult {
  /** Plantilla → vistas sumadas de las rutas reales plegadas y cuántas son. */
  templates: Map<string, { views: number; realPaths: number }>;
  /** Ruta real → plantilla, sólo para las que se plegaron. */
  assignment: Map<string, string>;
}

/**
 * Los eventos propios del sitio llegan con la ruta de MEDICIÓN (`/x/:item`), y `page_view` con la
 * real. Una ruta real `p` se pliega en la plantilla `t` sii `p` no aparece entre las rutas de medición
 * (si aparece, es una página estática con eventos propios) y calza con `t`.
 *
 * Aproximación documentada: una hermana estática que nunca mandó un evento propio y calza con una
 * plantilla infla el denominador de la plantilla.
 */
export function foldToTemplates(realRows: { path: string; views: number }[], measurementPaths: Iterable<string>): FoldResult {
  const measured = new Set<string>(measurementPaths);
  const templates = [...measured]
    .filter((p) => p.includes(":item"))
    // La plantilla con más texto fijo gana cuando dos calzan.
    .sort((a, b) => b.replace(/:item/g, "").length - a.replace(/:item/g, "").length || a.localeCompare(b))
    .map((t) => ({ t, re: templateMatcher(t) }));
  const out: FoldResult = { templates: new Map(), assignment: new Map() };
  for (const { t } of templates) out.templates.set(t, { views: 0, realPaths: 0 });
  for (const row of realRows) {
    if (measured.has(row.path)) continue;
    const hit = templates.find(({ re }) => re.test(row.path));
    if (!hit) continue;
    const agg = out.templates.get(hit.t)!;
    agg.views += row.views;
    agg.realPaths += 1;
    out.assignment.set(row.path, hit.t);
  }
  return out;
}

/** Minutos que `tz` le suma a UTC en el instante `at` (Montevideo: −180). */
export function tzOffsetMinutes(at: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

/**
 * Los límites en UTC del día local `day`. Uruguay no tiene horario de verano desde 2015, pero el
 * desfase se calcula con `Intl` igual: `2026-11-20` en Montevideo es `[2026-11-20T03:00Z, 2026-11-21T03:00Z)`.
 */
export function dayBoundsUtc(day: string, tz: string = "America/Montevideo"): { geq: string; lt: string } {
  const start = (d: string) => {
    const [y, m, dd] = d.split("-").map(Number);
    const guess = Date.UTC(y, m - 1, dd, 12, 0, 0);
    const offset = tzOffsetMinutes(new Date(guess), tz);
    return new Date(Date.UTC(y, m - 1, dd, 0, 0, 0) - offset * 60000).toISOString().replace(".000Z", "Z");
  };
  return { geq: start(day), lt: start(addDays(day, 1)) };
}

/** Días calendario entre dos `YYYY-MM-DD` (b − a). */
export function daysBetween(a: string, b: string): number {
  const toUtc = (d: string) => {
    const [y, m, dd] = d.slice(0, 10).split("-").map(Number);
    return Date.UTC(y, (m || 1) - 1, dd || 1);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86400000);
}

/** Los días de `start` a `end`, inclusive, ascendente. */
export function dayRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end && out.length < 4000; d = addDays(d, 1)) out.push(d);
  return out;
}
