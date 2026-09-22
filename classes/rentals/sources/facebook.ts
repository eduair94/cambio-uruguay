// Facebook Marketplace, read through the browser service on the 104 box (pm2
// `facebook_marketplace`, :9657) that owns the logged-in Chrome profile — the same bridge the
// chair directory uses.
//
// Marketplace can add adverts from private owners, frequently without an address beyond the
// city. Neither the portal nor a city label proves ownership, commission terms or unit identity.
// Without an exact address its adverts remain separate: barrio, price and bedroom counts alone
// never establish a cross-advert match. The limited search is always partial coverage.
//
// The bridge needs a live browser session. When it has none it answers
// `FB_MARKETPLACE_SESSION_UNAVAILABLE`, and this harvester reports `ok: false` so the run keeps
// yesterday's Marketplace rows instead of declaring them gone.
import { fetchJson } from "../net";
import {
  flatten,
  inferPropertyType,
  isPlausibleRent,
  looksLikeRentalAdvert,
  parseAttributes,
  parseLocationLine,
} from "../normalize";
import { appDbConfigured } from "../../appdb";
import type { RentalFacebookDetailDocument } from "../../models/RentalFacebookDetail";
import { rentalOfferDetails } from "../details";
import { locateFacebookRental } from "../facebookDetail";
import { guaranteesFromText } from "../guarantees";
import type { RawRental, RentalCurrency } from "../types";
import type { RentalSourceResult } from "./types";

const API_BASE = (process.env.RENTALS_FB_API || "http://104.234.204.107:9657/facebook/marketplace").replace(
  /\/+$/,
  ""
);

const QUERIES = ["alquiler apartamento", "alquiler casa", "alquilo apartamento", "alquiler habitacion"];

/** Search anchors, not geographic coverage: Marketplace can also return suggested distant ads.
 * Colonia was corroborated 2026-09-07 by 11 cards explicitly located in Colonia del Sacramento.
 */
const LOCATIONS = (process.env.RENTALS_FB_LOCATIONS || "montevideo,ciudad-de-la-costa,maldonado,salto,paysandu,colonia-del-sacramento")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

interface FbListing {
  id?: string;
  title?: string;
  url?: string;
  price?: { amount?: number; currency?: string };
  image?: string | null;
  location?: string | null;
  seller?: string | null;
}

interface FbResponse {
  ok?: boolean;
  error?: string;
  code?: string;
  results?: FbListing[];
}

/** What the item page said, when currency-rentals-detail already read it (see facebookDetail.ts). */
export type FbRentalDetailInput = Pick<RentalFacebookDetailDocument, "description" | "pinCity" | "latitude" | "longitude">;

export function toRawRental(item: FbListing, _locationHint: string, detail?: FbRentalDetailInput | null): RawRental | null {
  const id = String(item.id || "").trim();
  const title = String(item.title || "").trim();
  const amount = Number(item.price?.amount);
  const currency = String(item.price?.currency || "UYU").toUpperCase();
  if (!id || !title || !Number.isFinite(amount) || amount <= 0) return null;
  if (currency !== "UYU" && currency !== "USD") return null;
  if (!looksLikeRentalAdvert(title)) return null;
  // Search suggestions include sale cards and generated titles such as "4 habitaciones Casa".
  // The query is not the advert's operation. With no description in this bridge, abstain unless
  // the card itself declares renting; do not remove older adverts based on this partial sample.
  const rentalText = flatten(title)
    .replace(/\b(?:ya no|no)\s+(?:(?:se|lo|la)\s+)?(?:alquila(?:n)?|alquilo|alquiler|arrienda(?:n)?|arriendo)\b/g, "")
    .replace(/\b(?:no (?:es|esta) (?:en|para)|sin opcion (?:de|a))\s+alquiler\b/g, "");
  if (!/\b(?:alquiler(?:es)?|alquilo|alquila(?:n|mos)?|alquilar|arriendo|arrienda(?:n)?|arrendamiento)\b|\balq(?:uil)?(?:\.|(?=\s|:|$))/.test(rentalText)) return null;

  // The card's location is a city ("Montevideo", "Ciudad de la Costa"), never a street.
  // The search anchor is not evidence of where an individual suggested advert is located.
  const location = parseLocationLine(String(item.location || ""));
  // The barrio is in the TITLE, in the DESCRIPTION the detail job read, or nowhere: the bridge
  // returns no description, and the item page's pin is a ~1 km grid point 3–6 km from the property
  // (see neighborhoods.ts / facebookDetail.ts). A title naming a barrio of the card's department
  // refines the card's town; a unique locality names the department when the card gave none; the
  // pin's city only fills a missing department. Anything less stays "sin informar".
  const description = detail?.description || "";
  const { neighborhood, department } = locateFacebookRental({
    title, description, department: location.department, cardNeighborhood: location.neighborhood, pinCity: detail?.pinCity ?? null,
  });
  const attributes = parseAttributes(description ? [title, description] : [title]);
  // A coordinate only ever comes from a corner or numbered address the seller wrote, geocoded and
  // validated by the detail job; the card and the pin never place an advert.
  const located = !!detail && typeof detail.latitude === "number" && typeof detail.longitude === "number";

  return {
    parkingSpaces: null,
    furnished: null,
    source: "facebook",
    listingId: `facebook:${id}`,
    url: String(item.url || `https://www.facebook.com/marketplace/item/${id}`),
    title,
    price: amount,
    currency: currency as RentalCurrency,
    commonExpenses: null,
    commonExpensesCurrency: null,
    sellerName: String(item.seller || "").trim() || "Facebook Marketplace",
    // Marketplace has no agency flag we can trust; most posters are private, but "most" is not a
    // fact about any given row.
    sellerType: "desconocido",
    image: String(item.image || "").trim() || null,
    publishedAt: null,
    propertyType: inferPropertyType(title),
    department,
    neighborhood,
    address: "",
    street: "",
    streetNumber: "",
    latitude: located ? detail!.latitude : null,
    longitude: located ? detail!.longitude : null,
    bedrooms: attributes.bedrooms,
    bathrooms: attributes.bathrooms,
    area: attributes.area,
    // El puente devuelve id,title,url,price,image,location,condition: no hay campo de mascotas.
    // Y el titulo no alcanza: 3 de 1.947 ofertas de Facebook lo mencionan (0,15 %, medido 2026-09-04).
    // La descripción tampoco cuenta: la política es sólo dato ESTRUCTURADO.
    petsAllowed: null,
    // Las garantías sí salen del texto, como en InfoCasas: la ficha es la única fuente en Facebook.
    guarantees: description ? guaranteesFromText(description) : [],
    ...(description ? {
      description,
      details: rentalOfferDetails({ description, images: item.image ? [item.image] : [] }),
    } : {}),
  };
}

export interface HarvestFacebookOptions {
  /** The stored item-page reads for these listingIds (`facebook:<id>`); defaults to the app DB. */
  details?: (listingIds: readonly string[]) => Promise<ReadonlyMap<string, FbRentalDetailInput>>;
}

async function storedDetails(listingIds: readonly string[]): Promise<ReadonlyMap<string, FbRentalDetailInput>> {
  if (!listingIds.length || !appDbConfigured()) return new Map();
  const { loadFacebookDetails } = await import("../facebookDetailStore");
  return loadFacebookDetails(listingIds);
}

export async function harvestFacebookMarketplace(mode: "full" | "fast", usdUyu: number, options: HarvestFacebookOptions = {}): Promise<RentalSourceResult> {
  if (process.env.RENTALS_FB_ENABLED === "0") {
    return { key: "facebook", ok: true, complete: false, listings: [], note: "deshabilitado por configuración" };
  }

  const configuredLimit = Number(process.env.RENTALS_FB_LIMIT || 40);
  const perQuery = Number.isFinite(configuredLimit) ? Math.min(120, Math.max(1, Math.floor(configuredLimit))) : 40;
  const locations = mode === "fast" ? LOCATIONS.slice(0, 1) : LOCATIONS;
  const queries = mode === "fast" ? QUERIES.slice(0, 2) : QUERIES;

  const cards = new Map<string, FbListing>();
  let successful = 0;
  let failed = 0;
  let rawRows = 0;
  let rejected = 0;
  let lastError = "";

  for (const location of locations) {
    for (const query of queries) {
      const url = `${API_BASE}/search?${new URLSearchParams({
        q: query,
        location,
        limit: String(perQuery),
      })}`;
      let transport = "";
      const payload = await fetchJson<FbResponse>(url, {
        timeoutMs: 120_000, retries: 1, unthrottled: true, onFailure: (reason) => { transport = reason; },
      });
      if (!payload) {
        failed++;
        // A dead bridge (connection refused) and a slow one (timeout) need different fixes.
        lastError = `sin respuesta del servicio${transport ? ` (${transport})` : ""}`;
        continue;
      }
      if (payload.ok !== true || payload.error || !Array.isArray(payload.results)) {
        failed++;
        // Provider errors may contain internal URLs or account diagnostics. Report only a code.
        lastError = /^FB_MARKETPLACE_[A-Z_]{1,60}$/.test(payload.code || "")
          ? payload.code! : "respuesta inválida del servicio";
        continue;
      }
      successful++;
      rawRows += payload.results.length;

      for (const item of payload.results) {
        const id = String(item?.id || "").trim();
        if (id && !cards.has(id)) cards.set(id, item);
      }
    }
  }

  // The item pages already read by currency-rentals-detail: a re-harvest must keep the barrio,
  // the coordinate and the description learned there, or it would rebuild the identity from the
  // bare card and forget them.
  const details = await (options.details ?? storedDetails)([...cards.keys()].map(id => `facebook:${id}`));
  const byId = new Map<string, RawRental>();
  for (const [id, item] of cards) {
    const listing = toRawRental(item, "", details.get(`facebook:${id}`) ?? null);
    if (!listing) { rejected++; continue; }
    const priceUyu = listing.currency === "USD" ? listing.price * usdUyu : listing.price;
    if (!isPlausibleRent(priceUyu, listing.propertyType)) { rejected++; continue; }
    byId.set(listing.listingId, listing);
  }

  return {
    key: "facebook",
    // The bridge returns a limited set per city/query, never the entire live marketplace.
    complete: false,
    ok: successful > 0,
    listings: [...byId.values()],
    note: `${byId.size} avisos únicos de ${rawRows} lecturas; ${rejected} descartados; `
      + `${successful}/${locations.length * queries.length} consultas respondidas, ${failed} fallidas; `
      + `cobertura parcial: ${locations.length} ciudades de búsqueda, hasta ${perQuery} tarjetas por consulta, con sugerencias de otras zonas`
      + (failed ? `; último fallo: ${lastError}` : ""),
  };
}
