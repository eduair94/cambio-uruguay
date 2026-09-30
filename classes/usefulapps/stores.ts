// Las dos fichas públicas que lee el job `currency-useful-apps`, y NADA más:
//   Google Play: https://play.google.com/store/apps/details?id=<paquete>&hl=es_419&gl=UY
//   App Store:   https://apps.apple.com/uy/app/id<id>
// Las dos rutas están permitidas por el robots.txt de cada tienda. itunes.apple.com (las API de
// búsqueda y de lookup) está en Disallow, así que no se usa aunque sería más cómoda: misma regla
// que classes/mercadopago/, no se hace un cron contra un Disallow.
//
// Qué se lee y de dónde (medido el 29–30/9/2026 con esta misma UA):
//   - las dos fichas traen JSON-LD `SoftwareApplication`: nombre, desarrollador (author.name),
//     nota (aggregateRating), cantidad de opiniones e ícono;
//   - la fecha de la última versión NO está en el JSON-LD: Play la rotula "Actualización" en el
//     HTML ("10 ago 2026"); el App Store la trae en el bloque `versionHistory`
//     (`secondarySubtitle`, fecha completa) y en un `<time datetime>` junto al número de versión;
//   - las descargas, sólo en Play ("100 k+", rotulado "Descargas").
// Un 404 es una ausencia EXPLÍCITA, pero no dice lo mismo en las dos tiendas. El App Store en /uy/
// contesta 404 si la app no se ofrece en Uruguay. Google Play NO: con `gl=UY` contesta 200, con
// JSON-LD y todo, aunque la app no esté disponible acá (medido el 30/9/2026 con PayPay, Venmo y
// Cash App, que en el App Store /uy/ dan 404). En Android un 404 sólo significa que la ficha ya
// no existe en ningún país. Cualquier otra cosa —red, 5xx, un 200 sin JSON-LD— es un error y la
// corrida conserva lo que ya sabía (refresh.ts), después de los reintentos.
import type { StoreListing, StoreName } from "./types";

export const USEFUL_APPS_UA = "cambio-uruguay.com apps bot (+https://cambio-uruguay.com)";

export function playListingUrl(pkg: string): string {
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}&hl=es_419&gl=UY`;
}

export function appStoreListingUrl(id: string): string {
  return `https://apps.apple.com/uy/app/id${encodeURIComponent(id)}`;
}

const MONTHS: Record<string, number> = {
  ene: 0,
  feb: 1,
  mar: 2,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  sep: 8,
  sept: 8,
  set: 8,
  oct: 9,
  nov: 10,
  dic: 11,
};

/** "10 ago 2026" / "3 sept. 2025" (es_419) → "2026-08-10"; `null` si no es una fecha real. */
export function parsePlayDate(text: string): string | null {
  const m = text
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[2]];
  if (month === undefined) return null;
  const day = Number(m[1]);
  const date = new Date(Date.UTC(Number(m[3]), month, day));
  if (date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

interface SoftwareApplicationLd {
  "@type"?: string;
  name?: string;
  image?: string;
  author?: { name?: string };
  aggregateRating?: {
    ratingValue?: string | number;
    ratingCount?: string | number;
    reviewCount?: string | number;
  };
}

function softwareApplication(html: string): SoftwareApplicationLd | null {
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    try {
      const data = JSON.parse(match[1]) as SoftwareApplicationLd;
      if (data && data["@type"] === "SoftwareApplication") return data;
    } catch {
      // Un bloque roto no invalida la ficha: puede haber otro.
    }
  }
  return null;
}

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) ? n : null;
}

const ICON_PLAY = /^https:\/\/play-lh\.googleusercontent\.com\//;
const ICON_APPLE = /^https:\/\/[a-z0-9-]+\.mzstatic\.com\//;

/** Ícono de Play en 128 px: la URL acepta un sufijo de tamaño (`=s128`) que reemplaza al que traiga. */
export function playIcon(raw: string | null | undefined): string | null {
  if (!raw || !ICON_PLAY.test(raw)) return null;
  return `${raw.replace(/=[a-z0-9-]+$/i, "")}=s128`;
}

/** Ícono del App Store en 128 px: el último segmento es el tamaño (`1200x630wa.png` en el JSON-LD). */
export function appStoreIcon(raw: string | null | undefined): string | null {
  if (!raw || !ICON_APPLE.test(raw)) return null;
  return raw.replace(/\/[^/]+$/, "/128x128bb.png");
}

const PLAY_UPDATED = />(?:Actualización|Actualizado el|Updated on)<\/div>\s*<div[^>]*>([^<]+)<\/div>/;
const PLAY_INSTALLS = />([0-9][0-9.,]*\s?(?:[kKmMbB]|mil)?\s?\+)<\/div>\s*<div[^>]*>Descargas</;

export function parsePlayListing(html: string): StoreListing | null {
  const app = softwareApplication(html);
  if (!app) return null;
  const updated = html.match(PLAY_UPDATED);
  const installs = html.match(PLAY_INSTALLS);
  return {
    name: app.name ?? null,
    developer: app.author?.name ?? null,
    updated: updated ? parsePlayDate(updated[1]) : null,
    rating: num(app.aggregateRating?.ratingValue),
    ratingCount: num(app.aggregateRating?.ratingCount),
    installs: installs ? installs[1].replace(/\s+/g, " ").trim() : null,
    icon: playIcon(app.image),
  };
}

const APPLE_VERSION_TIME =
  /<span[^>]*>(?:Version |Versión )?\d+(?:\.\d+)+<\/span>\s*<time datetime="(\d{4}-\d{2}-\d{2})"/;

export function parseAppStoreListing(html: string): StoreListing | null {
  const app = softwareApplication(html);
  if (!app) return null;
  let updated: string | null = null;
  const history = html.indexOf('"versionHistory"');
  if (history >= 0) {
    const m = html.slice(history, history + 4000).match(/"secondarySubtitle":"([^"]+)"/);
    if (m) {
      const date = new Date(m[1].replace(/\s*\(.*\)$/, ""));
      if (!isNaN(date.getTime())) updated = date.toISOString().slice(0, 10);
    }
  }
  if (!updated) {
    const time = html.match(APPLE_VERSION_TIME);
    if (time) updated = time[1];
  }
  const rating = app.aggregateRating;
  return {
    name: app.name ?? null,
    developer: app.author?.name ?? null,
    updated,
    rating: num(rating?.ratingValue),
    ratingCount: num(rating?.reviewCount ?? rating?.ratingCount),
    installs: null,
    icon: appStoreIcon(app.image),
  };
}

export type ReadOutcome =
  | { kind: "ok"; listing: StoreListing }
  | { kind: "missing" }
  | { kind: "error"; message: string; retryAfterMs?: number };

/** `Retry-After` en segundos o como fecha HTTP; `undefined` si no vino o no se entiende. */
export function retryAfterMs(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value.trim());
  if (value.trim() !== "" && Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, at - now);
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Lee una ficha. Nunca tira: todo termina en ok, missing o error.
 *
 * `AbortSignal.timeout` y no un timeout estilo axios: un connect colgado nunca crea el socket y un
 * timer atado al socket no se dispara (la trampa del proxy que este repo ya pagó).
 */
export async function readListing(
  store: StoreName,
  id: string,
  fetchImpl: FetchLike = fetch,
  timeoutMs = 20000
): Promise<ReadOutcome> {
  const url = store === "android" ? playListingUrl(id) : appStoreListingUrl(id);
  let res: Response;
  try {
    res = await fetchImpl(url, {
      headers: {
        "user-agent": USEFUL_APPS_UA,
        accept: "text/html,application/xhtml+xml",
        "accept-language": "es-419,es;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : String(err) };
  }
  if (res.status === 404) return { kind: "missing" };
  if (!res.ok) {
    return {
      kind: "error",
      message: `HTTP ${res.status}`,
      retryAfterMs: retryAfterMs(res.headers.get("retry-after")),
    };
  }
  let html: string;
  try {
    html = await res.text();
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : String(err) };
  }
  const listing = store === "android" ? parsePlayListing(html) : parseAppStoreListing(html);
  return listing ? { kind: "ok", listing } : { kind: "error", message: "la ficha no trae JSON-LD" };
}
