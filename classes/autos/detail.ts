// The advert's own page is the last gate before a car is called an opportunity. Measured
// 2026-09-16: auto.mercadolibre.com.uy item pages answer 200 from the VPS with our own UA, robots.txt
// does not block them, and they carry what the search card cannot — the "Versión" spec row, the
// seller's description ("motor a reparar"), the dealer name and whether the advert is active. Only
// candidates are read (hundreds a day, spaced by the shared per-host throttle).
import { fetchText } from "../rentals/net";
import { descriptionFlags } from "./normalize";
import { detailSpecs } from "./specs";
import type { CarDetail } from "./types";

export const AUTOS_USER_AGENT = process.env.AUTOS_USER_AGENT ||
  "CambioUruguayBot/1.0 (+https://cambio-uruguay.com/autos-usados-uruguay; used-car price index; contact via site)";

const STRING = '"((?:[^"\\\\]|\\\\.)*)"';

function decode(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw;
  }
}

/** Matches "Año" whether the page ships it raw or as a JSON \u escape. */
function nameAlternatives(name: string): string {
  const escaped = name.replace(/[^\x00-\x7f]/g, char => `\\\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);
  return escaped === name ? name : `${name}|${escaped}`;
}

// Measured 2026-09-16 against a real MLU-700355317 pull: the page ships specs as a JSON blob on
// some renders and as the visible `andes-table` (Principales) on others — both are read, JSON first.
function attribute(html: string, name: string): string | null {
  const jsonMatch = new RegExp(`\\{"id":"(?:${nameAlternatives(name)})","text":${STRING}\\}`).exec(html);
  if (jsonMatch) return decode(jsonMatch[1]!).trim() || null;
  const tableMatch = new RegExp(
    `<div class="andes-table__header__container">(?:${name})</div></th><td[^>]*>\\s*<span[^>]*class="andes-table__column--value"[^>]*>([^<]*)</span>`
  ).exec(html);
  return tableMatch ? decode(tableMatch[1]!).trim() || null : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function vehicleLd(html: string): any | null {
  const pattern = /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    try {
      const data = JSON.parse(match[1]!);
      for (const node of Array.isArray(data) ? data : [data]) if (node?.["@type"] === "Vehicle") return node;
    } catch {
      // Other ld+json blocks may be malformed; only the vehicle one matters.
    }
  }
  return null;
}

/**
 * The advert's OWN gallery. `data-zoom` is what the page hands the zoom viewer, one per photo and at
 * the size Mercado Libre itself serves; anything not on its image host is somebody else's picture.
 */
export function detailPictures(html: string, max = 6): string[] {
  const pictures = new Set<string>();
  const pattern = /data-zoom="(https:\/\/http2\.mlstatic\.com\/[^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) && pictures.size < max) pictures.add(match[1]!);
  return [...pictures];
}

export function parseCarDetail(html: string, readAt: string): CarDetail | null {
  const vehicle = vehicleLd(html);
  const price = Number(vehicle?.offers?.price);
  const currency = String(vehicle?.offers?.priceCurrency || "");
  if (!vehicle || !(price > 0) || (currency !== "USD" && currency !== "UYU")) return null;
  const status = /"item_status":"([a-z_]+)"/.exec(html)?.[1] ?? null;
  const descriptionMatch = new RegExp(`"type":"description","state":"VISIBLE","title":${STRING},"content":${STRING}`).exec(html);
  // The server-rendered fallback: `<div id="description" class="ui-pdp-description">…<p
  // class="ui-pdp-description__content">…</p></div>` — real text with real newlines, never JSON,
  // so it is taken as-is rather than run through `decode`.
  const htmlDescriptionMatch = descriptionMatch
    ? null
    : /<div id="description" class="ui-pdp-description">[\s\S]*?<p class="ui-pdp-description__content">([\s\S]*?)<\/p>/.exec(html);
  const description = descriptionMatch ? decode(descriptionMatch[2]!) : htmlDescriptionMatch ? htmlDescriptionMatch[1]!.trim() : "";
  const kmText = attribute(html, "Kilómetros");
  const yearText = attribute(html, "Año");
  const sellerJson = new RegExp(`"seller_name":\\{"title":\\{"text":${STRING}`).exec(html)?.[1];
  // Fallback: the dealer's own profile link, `…info-link" …><h3 …><span>Name</span></h3>`.
  const sellerHtml = sellerJson ? undefined : /ui-vip-profile-info__info-link"[^>]*>[\s\S]{0,200}?<span>([^<]+)<\/span>/.exec(html)?.[1];
  const seller = sellerJson ?? sellerHtml;
  const doors = Number(vehicle.numberOfDoors);
  const ldBrand = typeof vehicle.brand === "string" ? vehicle.brand : typeof vehicle.brand?.name === "string" ? vehicle.brand.name : null;
  // The whole spec table, plus the two figures only the ld+json states: gears (no table row names
  // them) and the tank when the table left it out.
  const specs = detailSpecs(html);
  const gears = Number(vehicle.numberOfForwardGears);
  if (!("Marchas" in specs) && Number.isInteger(gears) && gears > 0) specs["Marchas"] = String(gears);
  if (!("Capacidad del tanque" in specs) && typeof vehicle.fuelCapacity === "string" && vehicle.fuelCapacity.trim()) {
    specs["Capacidad del tanque"] = vehicle.fuelCapacity.trim().slice(0, 80);
  }
  return {
    readAt,
    price,
    currency,
    active: status === "active",
    brand: attribute(html, "Marca") ?? ldBrand,
    model: attribute(html, "Modelo"),
    year: yearText && /^\d{4}$/.test(yearText) ? Number(yearText) : null,
    km: kmText && /\d/.test(kmText) ? Number(kmText.replace(/[^\d]/g, "")) : null,
    version: attribute(html, "Versión"),
    engineText: attribute(html, "Motor"),
    sellerName: seller ? decode(seller).trim().slice(0, 120) || null : null,
    bodyType: typeof vehicle.bodyType === "string" ? vehicle.bodyType : null,
    color: typeof vehicle.color === "string" ? vehicle.color : null,
    doors: Number.isInteger(doors) && doors > 0 && doors < 10 ? doors : null,
    pictures: detailPictures(html),
    specs,
    flags: descriptionFlags(description),
    description: description.slice(0, 5_000),
  };
}

export interface DetailFetchResult {
  details: Map<string, CarDetail>;
  gone: string[];
  failed: number;
}

export async function fetchCarDetails(
  targets: ReadonlyArray<{ key: string; permalink: string }>,
  options: { max: number; maxDurationMs: number; now?: () => Date },
): Promise<DetailFetchResult> {
  const clock = options.now ?? (() => new Date());
  const started = Date.now();
  const result: DetailFetchResult = { details: new Map(), gone: [], failed: 0 };
  let reads = 0;
  for (const target of targets) {
    if (reads >= options.max || Date.now() - started >= options.maxDurationMs) break;
    if (!target.permalink.startsWith("https://auto.mercadolibre.com.uy/MLU-")) continue;
    reads++;
    let failure = "";
    const html = await fetchText(target.permalink, {
      timeoutMs: 25_000,
      retries: 1,
      headers: { "user-agent": AUTOS_USER_AGENT },
      onFailure: reason => {
        failure = reason;
      },
    });
    if (!html) {
      if (/^HTTP (404|410)$/.test(failure)) result.gone.push(target.key);
      else result.failed++;
      continue;
    }
    const detail = parseCarDetail(html, clock().toISOString());
    if (detail) result.details.set(target.key, detail);
    else result.failed++;
  }
  return result;
}
