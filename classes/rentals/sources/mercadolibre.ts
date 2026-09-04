// MercadoLibre Uruguay, read through the scraper service on the 104 box (pm2 `mercadolibre`,
// :9656) — the same bridge the chair directory uses. We do not re-implement the MLU client here.
//
// The catch that shapes this file: the bridge's TRIMMED response drops the fields a rental needs
// (address, dormitorios, m²) because it was built for products. The RAW response keeps them, but
// only inside ML's "polycard" search layout — a nested UI payload, 20 cards per page regardless of
// `limit`. So we ask for `raw=true`, walk the tree for polycards, and read the card the way the
// search page renders it: `attributes_list` for "2 dormitorios | 1 baño | 40 m² cubiertos" and
// `location` for "Av. Garzón 1975 Bis, Colón, Montevideo".
import { fetchJson } from "../net";
import { inferPropertyType, isPlausibleRent, looksLikeRentalAdvert, parseAttributes, parseLocationLine } from "../normalize";
import type { RawRental, RentalCurrency } from "../types";
import type { RentalSourceResult } from "./types";

const API_BASE = (process.env.RENTALS_ML_API || "http://104.234.204.107:9656/mercadolibre").replace(/\/+$/, "");

/** "Inmuebles > Alquiler" on MLU. Every rental advert lives under it. */
const RENT_CATEGORY = "MLU1473";

/** ML's search page returns 20 cards per request whatever `limit` says. */
const PAGE_SIZE = 20;

/**
 * The bridge requires a text query, and one query does not see the whole category: `alquiler`
 * misses adverts whose text never uses the word. Several broad queries inside the rental category,
 * deduped by item id, cover far more than any single one.
 */
const QUERIES = ["alquiler", "apartamento", "casa", "habitacion", "monoambiente", "local", "oficina"];

interface Polycard {
  metadata?: {
    id?: string;
    url_params?: string;
    category_id?: string;
    domain_id?: string;
  };
  components?: Array<{
    type?: string;
    title?: { text?: string };
    price?: { current_price?: { value?: number; currency?: string } };
    attributes_list?: { texts?: string[] };
    location?: { text?: string };
  }>;
}

/** Walks the search layout for every polycard, wherever ML decided to nest them this week. */
export function collectPolycards(payload: unknown): Polycard[] {
  const found: Polycard[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (record.polycard && typeof record.polycard === "object") found.push(record.polycard as Polycard);
    for (const value of Object.values(record)) visit(value);
  };
  visit(payload);
  return found;
}

const componentOf = (card: Polycard, type: string) => card.components?.find((component) => component.type === type);

export function toRawRental(card: Polycard): RawRental | null {
  const id = String(card.metadata?.id || "").trim();
  if (!id) return null;

  const params = new URLSearchParams(String(card.metadata?.url_params || "").replace(/^\?/, ""));
  const title = String(componentOf(card, "title")?.title?.text || params.get("title") || "").trim();
  const permalink = String(params.get("permalink") || "").trim();
  const priceValue = Number(componentOf(card, "price")?.price?.current_price?.value ?? params.get("price"));
  const currencyRaw = String(
    componentOf(card, "price")?.price?.current_price?.currency || params.get("currency_id") || ""
  ).toUpperCase();

  if (!title || !permalink || !Number.isFinite(priceValue) || priceValue <= 0) return null;
  if (currencyRaw !== "UYU" && currencyRaw !== "USD") return null;
  if (!looksLikeRentalAdvert(title)) return null;

  const attributes = parseAttributes(componentOf(card, "attributes_list")?.attributes_list?.texts || []);
  const location = parseLocationLine(
    componentOf(card, "location")?.location?.text || params.get("location") || ""
  );

  return {
    source: "mercadolibre",
    listingId: `mercadolibre:${id}`,
    url: permalink,
    title,
    price: priceValue,
    currency: currencyRaw as RentalCurrency,
    // ML's search card never states gastos comunes. Saying "0" would be inventing a number, so the
    // field stays null and the page shows "no informa".
    commonExpenses: null,
    commonExpensesCurrency: null,
    sellerName: "Mercado Libre",
    sellerType: "desconocido",
    image: String(params.get("picture") || params.get("thumbnail") || "").trim() || null,
    publishedAt: null,
    propertyType: inferPropertyType(title, card.metadata?.domain_id || null),
    department: location.department,
    neighborhood: location.neighborhood,
    address: location.address,
    street: location.street,
    streetNumber: location.number,
    latitude: null,
    longitude: null,
    bedrooms: attributes.bedrooms,
    bathrooms: attributes.bathrooms,
    area: attributes.area,
    // La pasada principal no sabe: el dato NO viene por aviso. Lo pone `markPetFriendly`.
    petsAllowed: null,
    // MercadoLibre no publica la garantia: ni por aviso ni como filtro de busqueda.
    guarantees: [],
  };
}

async function searchPage(query: string, offset: number, since?: string): Promise<Polycard[] | null> {
  const params = new URLSearchParams({
    country: "UY",
    category: RENT_CATEGORY,
    q: query,
    offset: String(offset),
    limit: String(PAGE_SIZE),
    raw: "true",
  });
  if (since) params.set("since", since);
  const payload = await fetchJson<unknown>(`${API_BASE}/search?${params}`, {
    timeoutMs: 45_000,
    retries: 2,
    // Deliberately THROTTLED even though the bridge is ours: a full sweep is ~800 requests, and
    // every one of them is a request the bridge makes to MercadoLibre. The chair harvester can
    // afford `unthrottled` because it asks for 36 pages; this one would be a burst.
  });
  if (!payload) return null;
  return collectPolycards((payload as any).components ?? payload);
}


/**
 * El valor del filtro "Admite mascotas" de MercadoLibre.
 *
 * Medido el 2026-09-04 contra el puente: en la categoria de alquiler, `IS_SUITABLE_FOR_PETS=242085`
 * baja `paging.total` de 15.456 a 6.349. El filtro tiene UN SOLO valor: no existe el bucket
 * contrario, asi que de aca sale un `true` o nada — nunca un `false`.
 *
 * El dato NO viene por aviso: en la respuesta compacta los items traen `attributes: []`, y en el
 * crudo las cadenas "mascota" y "PET" aparecen cero veces. Por eso hace falta esta segunda pasada.
 */
const PETS_FILTER_ID = "IS_SUITABLE_FOR_PETS";
const PETS_FILTER_VALUE = "242085";

/**
 * MercadoLibre deja de paginar a los ~4.000 y NO avisa: vuelve a servir la primera pagina.
 *
 * Medido: los offsets 4.000, 4.500, 5.000 y 8.000 devuelven los MISMOS 20 ids que el offset 0. O
 * sea que `cards.length < PAGE_SIZE` nunca corta el bucle, y sin este tope la pasada giraria
 * releyendo la pagina uno hasta agotar `maxPages`.
 */
const ML_OFFSET_CEILING = 4_000;

interface SearchResult {
  cards: Polycard[];
  total: number | null;
}

async function searchRaw(params: URLSearchParams): Promise<SearchResult | null> {
  const payload = await fetchJson<unknown>(`${API_BASE}/search?${params}`, { timeoutMs: 45_000, retries: 2 });
  if (!payload) return null;
  const paging = (payload as { paging?: { total?: unknown } }).paging;
  const total = Number(paging?.total);
  return {
    cards: collectPolycards((payload as any).components ?? payload),
    total: Number.isFinite(total) ? total : null,
  };
}

function filterParams(query: string, offset: number, filter?: [string, string]): URLSearchParams {
  const params = new URLSearchParams({
    country: "UY",
    category: RENT_CATEGORY,
    q: query,
    offset: String(offset),
    limit: String(PAGE_SIZE),
    raw: "true",
  });
  if (filter) params.set(filter[0], filter[1]);
  return params;
}

/**
 * Recorre una busqueda FILTRADA de MercadoLibre y aplica `apply` a cada aviso ya cosechado.
 *
 * LA GUARDA QUE JUSTIFICA TODO ESTO: antes de tocar nada comprueba que el filtro se APLICO,
 * comparando el total filtrado contra el sin filtrar de la misma consulta. No es paranoia: medido
 * el 2026-09-04, un valor INVENTADO en `seller_type` devuelve el total COMPLETO (15.416), o sea que
 * el filtro se ignora en silencio. Sin esta comparacion marcariamos los 15.416 avisos de la
 * categoria. Tampoco alcanza con buscar el nombre del filtro en la respuesta: ML tambien lista los
 * filtros DISPONIBLES, asi que aparece igual sin aplicar.
 *
 * Ante cualquier duda no marca nada: el precio de no marcar es que un aviso quede como "no se
 * sabe"; el de marcar mal es publicar algo falso.
 */
async function sweepFiltered(
  filter: [string, string],
  label: string,
  byId: Map<string, RawRental>,
  maxPages: number,
  apply: (listing: RawRental) => void,
): Promise<number> {
  const control = await searchRaw(filterParams("alquiler", 0));
  const filtered = await searchRaw(filterParams("alquiler", 0, filter));
  if (!control?.total || !filtered?.total) return 0;
  if (filtered.total >= control.total) {
    console.warn(
      `[rentals] ML: el filtro de ${label} no se aplico (total ${filtered.total} >= ${control.total}); no se marca nada`,
    );
    return 0;
  }

  const seen = new Set<string>();
  let marked = 0;
  for (let page = 0; page < maxPages; page++) {
    const offset = page * PAGE_SIZE;
    if (offset >= ML_OFFSET_CEILING) break;
    const result = page === 0 ? filtered : await searchRaw(filterParams("alquiler", offset, filter));
    if (!result || result.cards.length === 0) break;

    let fresh = 0;
    for (const card of result.cards) {
      const listing = toRawRental(card);
      if (!listing) continue;
      if (seen.has(listing.listingId)) continue;
      seen.add(listing.listingId);
      fresh++;
      const known = byId.get(listing.listingId);
      if (known) {
        apply(known);
        marked++;
      }
    }
    // Cero ids nuevos = ML volvio a servir una pagina ya vista.
    if (fresh === 0) break;
    if (result.cards.length < PAGE_SIZE) break;
  }
  return marked;
}

/**
 * Quien alquila SIN inmobiliaria de por medio.
 *
 * Medido el 2026-09-04: `seller_type` parte la categoria en private_seller 944 y
 * real_estate_agency 14.472, que suman EXACTO el total sin filtrar — es una particion exhaustiva.
 * El directorio venia detectando 52 "dueno directo" sobre 14.744 propiedades (0,35 %) porque este
 * parser ponia `desconocido` en todo y el dato solo salia de InfoCasas.
 *
 * Importa mas que un chip: alquilar al dueno evita la comision de la inmobiliaria, que en Uruguay
 * es un mes de alquiler mas IVA.
 *
 * Se marca SOLO el lado particular. El otro lado se podria derivar —la particion es exhaustiva—
 * pero solo para los avisos que la pasada llego a ver, y el tope de 4.000 deja fuera a la mayoria
 * de los 14.472: decir "inmobiliaria" por no haberlo visto seria inventar.
 */
const PRIVATE_SELLER_FILTER: [string, string] = ["seller_type", "private_seller"];

export async function harvestMercadoLibre(mode: "full" | "fast", usdUyu: number): Promise<RentalSourceResult> {
  const maxPages =
    mode === "fast" ? Number(process.env.RENTALS_ML_FAST_PAGES || 12) : Number(process.env.RENTALS_ML_MAX_PAGES || 120);
  // Fast runs read the same category filtered to today's publications: ~500 adverts, 25 pages.
  const since = mode === "fast" ? "today" : undefined;
  const queries = mode === "fast" ? ["alquiler"] : QUERIES;

  const byId = new Map<string, RawRental>();
  let pages = 0;
  let reachable = false;
  let rejected = 0;

  for (const query of queries) {
    for (let page = 0; page < maxPages; page++) {
      const cards = await searchPage(query, page * PAGE_SIZE, since);
      if (cards === null) break;
      pages++;
      if (cards.length) reachable = true;

      for (const card of cards) {
        const listing = toRawRental(card);
        if (!listing) {
          rejected++;
          continue;
        }
        const priceUyu = listing.currency === "USD" ? listing.price * usdUyu : listing.price;
        if (!isPlausibleRent(priceUyu, listing.propertyType)) {
          rejected++;
          continue;
        }
        byId.set(listing.listingId, listing);
      }

      if (cards.length < PAGE_SIZE) break;
    }
  }

  // Solo en la corrida COMPLETA: la rapida mira lo recien publicado y esta pasada es una consulta
  // aparte que no comparte ese recorte, asi que no le corresponde.
  let pets = 0;
  let particulares = 0;
  if (mode === "full" && byId.size > 0) {
    pets = await sweepFiltered([PETS_FILTER_ID, PETS_FILTER_VALUE], "mascotas", byId, maxPages, (listing) => {
      listing.petsAllowed = true;
    });
    particulares = await sweepFiltered(PRIVATE_SELLER_FILTER, "vendedor particular", byId, maxPages, (listing) => {
      listing.sellerType = "particular";
      listing.sellerName = "Particular";
    });
  }

  return {
    key: "mercadolibre",
    ok: reachable && byId.size > 0,
    listings: [...byId.values()],
    note: reachable
      ? `${pages} páginas, ${byId.size} avisos, ${rejected} descartados, ${pets} admiten mascotas, ${particulares} de particular`
      : `sin respuesta de ${API_BASE}`,
  };
}
