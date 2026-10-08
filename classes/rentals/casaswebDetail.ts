// El punto del mapa de las fichas de Casasweb del directorio de alquileres.
//
// La tarjeta de búsqueda de Casasweb no trae dirección ni coordenada: el 2026-10-08 sus 2.696
// propiedades vigentes tenían 0 % de coordenadas, así que no salían en el mapa ni en "más cerca de".
// La ficha propia sí dibuja un mapa (Leaflet) con un marcador rotulado con la referencia del aviso:
// `L.marker([-34.910033, -56.198587], {icon: cwIcon}).addTo(map).bindTooltip('CW222638', …)`.
//
// Medido antes de creerle, como el de Mercado Libre: en 60 fichas de Montevideo, 59 con marcador y
// 59 puntos distintos (no es el centroide del barrio), y el barrio que declara el aviso coincide con
// el de sus 15 vecinos con coordenada de El País/InfoCasas en el 83 % de los casos — esas mismas
// fuentes, contra sí mismas, dan 79 %. Los desacuerdos son nombres ("Puerto del Buceo" contra
// "Puerto Buceo") o bordes entre barrios.
//
// Lo escribe `sync_rentals_casasweb_detail.ts` (pm2 `currency-rentals-casasweb-detail`) en la
// colección privada `rentalcasaswebdetails`, y la cosecha lo reaplica (detailPins.ts).
import * as cheerio from "cheerio";
import { appConnection } from "../appdb";
import { casaswebReference, casaswebTitleNames } from "./casaswebContacts";
import { inUruguay, PIN_SOURCES, type RentalPin } from "./detailPins";

export const CASASWEB_DETAIL_COLLECTION = PIN_SOURCES.find(row => row.source === "casasweb")!.collection;
/** A listing's pin does not move; a month between reads only catches an agency that corrects it. */
export const CASASWEB_DETAIL_REFRESH_DAYS = 30;

export interface CasaswebRentalDetail {
  listingId: string;
  readAt: string;
  /** null = the advert's own page has no map marker. */
  latitude: number | null;
  longitude: number | null;
  /** Always true for a stored row: failed reads are not stored, so the advert is read again. */
  ok: true;
}

/**
 * The marker of the advert page's map. `undefined` = not this advert's page (an error, a redirect to
 * the search, another listing): nothing is concluded. `null` = its page, with no usable marker. A
 * marker labelled with ANOTHER reference is refused: it would be someone else's home.
 */
export function parseCasaswebPin(html: string, listingId: string): RentalPin | null | undefined {
  const reference = casaswebReference(listingId);
  if (!reference) return undefined;
  const $ = cheerio.load(html);
  if (!casaswebTitleNames($("title").text(), reference)) return undefined;
  const match = /L\.marker\(\[\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,2}\.\d+)\s*\]([^;]{0,300})/.exec(html);
  if (!match) return null;
  const label = /bindTooltip\(\s*['"]([A-Z]{2,4}\d{1,18})['"]/.exec(match[3]!);
  if (label && label[1] !== reference) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return inUruguay(latitude, longitude) ? { latitude, longitude } : null;
}

export interface CasaswebDetailTarget {
  key: string;
  listingId: string;
  url: string;
  department: string;
  propertyType: string;
  lastSeen: string;
}

const HOMES = new Set(["apartamento", "casa"]);

/** Montevideo homes first (where "near" and the map are used most), then homes, freshest first. */
export function prioritizeCasaswebDetailTargets(rows: readonly CasaswebDetailTarget[], budget: number): CasaswebDetailTarget[] {
  const score = (row: CasaswebDetailTarget) => (HOMES.has(row.propertyType) ? 2 : 0) + (row.department === "Montevideo" ? 1 : 0);
  return [...rows]
    .sort((a, b) => score(b) - score(a) || b.lastSeen.localeCompare(a.lastSeen) || a.listingId.localeCompare(b.listingId))
    .slice(0, Math.max(0, budget));
}

const details = () => appConnection().collection(CASASWEB_DETAIL_COLLECTION);
const listings = () => appConnection().collection("rentallistings");

/**
 * Live Casasweb adverts of properties WITHOUT a coordinate whose page was never read, or read more
 * than a month ago. A property another portal already located gains nothing from the read.
 */
export async function casaswebDetailTargets(now: Date, budget: number, days = 10): Promise<CasaswebDetailTarget[]> {
  const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
  const rows = await listings()
    .find(
      { latitude: null, offers: { $elemMatch: { source: "casasweb", lastSeen: { $gte: cutoff } } } },
      { projection: { key: 1, department: 1, propertyType: 1, "offers.source": 1, "offers.listingId": 1, "offers.url": 1, "offers.lastSeen": 1 } }
    )
    .toArray();
  const targets: CasaswebDetailTarget[] = [];
  for (const row of rows) {
    for (const offer of Array.isArray(row.offers) ? row.offers : []) {
      if (offer?.source !== "casasweb" || typeof offer.listingId !== "string" || String(offer.lastSeen || "") < cutoff) continue;
      if (!/^https:\/\/(?:www\.)?casasweb\.com\//.test(String(offer.url || ""))) continue;
      targets.push({
        key: String(row.key),
        listingId: offer.listingId,
        url: String(offer.url),
        department: String(row.department || ""),
        propertyType: String(row.propertyType || ""),
        lastSeen: String(offer.lastSeen || ""),
      });
    }
  }
  const fresh = new Date(now.getTime() - CASASWEB_DETAIL_REFRESH_DAYS * 86_400_000).toISOString();
  const read = new Set<string>();
  for (let i = 0; i < targets.length; i += 5_000) {
    const ids = targets.slice(i, i + 5_000).map(target => target.listingId);
    const docs = await details().find({ listingId: { $in: ids }, ok: true, readAt: { $gte: fresh } }, { projection: { listingId: 1 } }).toArray();
    for (const doc of docs) read.add(String(doc.listingId));
  }
  return prioritizeCasaswebDetailTargets(targets.filter(target => !read.has(target.listingId)), budget);
}

export async function saveCasaswebDetails(rows: readonly CasaswebRentalDetail[]): Promise<void> {
  if (!rows.length) return;
  await details().createIndex({ listingId: 1 }, { unique: true });
  await details().bulkWrite(
    rows.map(row => ({ updateOne: { filter: { listingId: row.listingId }, update: { $set: row }, upsert: true } })),
    { ordered: false }
  );
}
