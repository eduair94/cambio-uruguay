// La ficha propia de cada aviso de moto. Medido el 2026-11-23: `moto.mercadolibre.com.uy/MLU-…`
// contesta 200 con la UA del bot, igual que la de autos (`classes/autos/detail.ts`), y trae la tabla
// «Características principales» que la tarjeta de búsqueda no trae. En una muestra de 21 fichas:
// Cilindrada 19, Color 21, Tipo de moto 21, Motor (2/4 tiempos) 17, Frenos 16, Único dueño 15,
// Potencia 11 (con unidades disparatadas) y Acepta permuta 4.
//
// La lectura reusa las piezas de autos que no son de autos: el lector de la tabla (`detailSpecs`),
// el de la galería (`detailPictures`) y la red con su freno por host (`fetchText`).
import { detailPictures } from "../autos/detail";
import { detailSpecs } from "../autos/specs";
import { fetchText, sleep } from "../rentals/net";
import { parseFichaDisplacement } from "./displacement";
import { ML_MOTOS_PERMALINK_PREFIX } from "./sources/mercadolibre";
import type { MotoDetail } from "./types";

export const MOTOS_USER_AGENT =
  process.env.MOTOS_USER_AGENT ||
  "CambioUruguayBot/1.0 (+https://cambio-uruguay.com/motos-usadas-uruguay; used-motorcycle price index; contact via site)";

const STRING = '"((?:[^"\\\\]|\\\\.)*)"';

function decode(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw;
  }
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
      // Otros bloques ld+json pueden venir rotos; sólo importa el del vehículo.
    }
  }
  return null;
}

/** La descripción del vendedor: el blob JSON en unas entregas, el HTML del servidor en otras. */
function descriptionOf(html: string): string {
  const json = new RegExp(`"type":"description","state":"VISIBLE","title":${STRING},"content":${STRING}`).exec(html);
  if (json) return decode(json[2]!);
  const block = /<div id="description" class="ui-pdp-description">[\s\S]*?<p class="ui-pdp-description__content">([\s\S]*?)<\/p>/.exec(html);
  return block ? block[1]!.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim() : "";
}

export function parseMotoDetail(html: string, readAt: string): MotoDetail | null {
  const vehicle = vehicleLd(html);
  const price = Number(vehicle?.offers?.price);
  const currency = String(vehicle?.offers?.priceCurrency || "");
  if (!vehicle || !(price > 0) || (currency !== "USD" && currency !== "UYU")) return null;
  const specs = detailSpecs(html);
  const status = /"item_status":"([a-z_]+)"/.exec(html)?.[1] ?? null;
  const ldColor = typeof vehicle.color === "string" ? vehicle.color.trim() : "";
  return {
    readAt,
    price,
    currency,
    // Sin estado en la página se asume activa: la ficha contestó con precio y oferta "InStock".
    active: status ? status === "active" : true,
    specs,
    displacement: parseFichaDisplacement(specs["Cilindrada"]),
    typeText: specs["Tipo de moto"]?.trim() || null,
    color: specs["Color"]?.trim() || ldColor || null,
    pictures: detailPictures(html, 8),
    description: descriptionOf(html).slice(0, 5_000),
  };
}

export interface MotoDetailFetchResult {
  details: Map<string, MotoDetail>;
  gone: string[];
  failed: Array<{ key: string; reason: string }>;
}

export async function fetchMotoDetails(
  targets: ReadonlyArray<{ key: string; permalink: string }>,
  options: { max: number; maxDurationMs: number; gapMs: number; now?: () => Date }
): Promise<MotoDetailFetchResult> {
  const clock = options.now ?? (() => new Date());
  const started = Date.now();
  const result: MotoDetailFetchResult = { details: new Map(), gone: [], failed: [] };
  let reads = 0;
  for (const target of targets) {
    if (reads >= options.max || Date.now() - started >= options.maxDurationMs) break;
    if (!target.permalink.startsWith(ML_MOTOS_PERMALINK_PREFIX)) continue;
    if (reads > 0 && options.gapMs > 0) await sleep(options.gapMs);
    reads++;
    let failure = "";
    const html = await fetchText(target.permalink, {
      timeoutMs: 25_000,
      retries: 1,
      headers: { "user-agent": MOTOS_USER_AGENT },
      onFailure: reason => {
        failure = reason;
      },
    });
    if (!html) {
      if (/^HTTP (404|410)$/.test(failure)) result.gone.push(target.key);
      else result.failed.push({ key: target.key, reason: failure || "sin respuesta" });
      continue;
    }
    const detail = parseMotoDetail(html, clock().toISOString());
    // Una página 200 sin ficha (un desafío, el muro de login) es una falla, no un aviso borrado.
    if (detail) result.details.set(target.key, detail);
    else result.failed.push({ key: target.key, reason: "página sin ficha" });
  }
  return result;
}
