// InfoCasas Uruguay.
//
// The listing pages are Next.js with `getServerSideProps`, so every advert on a page is already in
// the `__NEXT_DATA__` blob: id, address, lat/lon, dormitorios, baños, m², gastos comunes, the
// agency, and the publication date. No headless browser, no HTML scraping of card markup that
// changes with the next deploy — we read the same JSON their own page renders from.
//
// Two rules this file must not break:
//   * robots.txt disallows `/alquiler/*-y-*` (their combined-filter URLs). We only ever build
//     single price ranges, and `assertAllowed` refuses anything with `-y-` in the path so a
//     future "treinta-y-tres" slug can never sneak past.
//   * newest-first does NOT make the nationwide tail accessible. On 2026-09-07 pages 600 and 850
//     returned the same 21 IDs despite different paginator numbers. Full runs partition the public
//     search into overlapping price ranges below that depth; fast runs keep the newest-first feed.
import { guaranteesFromField, guaranteesFromText, mergeGuarantees } from "../guarantees";
import { rentalDescription, rentalOfferDetails } from "../details";
import { fetchText } from "../net";
import {
  canonicalDepartment,
  inferPropertyType,
  isPlausibleRent,
  looksLikeRentalAdvert,
  parseCurrency,
  parseStreet,
} from "../normalize";
import type { RawRental, RentalCurrency, RentalSellerType } from "../types";
import type { RentalSourceResult } from "./types";

const ORIGIN = "https://www.infocasas.com.uy";

/** Newest-first. Their `order` values: 2 = popularidad (default), 3 = más recientes. */
const ORDER_NEWEST = "3";

/**
 * "Se aceptan mascotas" en la lista de facilities de InfoCasas.
 *
 * Medido el 2026-09-04 sobre 210 avisos: `facilities` viene en el 100 % de las filas, la 222 es
 * exactamente {"id":222,"name":"Se aceptan mascotas","group":"Confort de la casa"}, el id y el
 * nombre coincidieron 210/210, y es la unica facility con "mascota" en el nombre. La trae el
 * 14,8 %. Cero requests extra: el sweep ya baja estas filas.
 *
 * Se acepta el id O el nombre: si el dia de manana renumeran, el nombre sigue sirviendo, y si le
 * cambian el texto, sigue el id. Que las dos señales sean redundantes es a proposito.
 */
const PETS_FACILITY_ID = 222;

function petsFromFacilities(facilities: IcFacility[] | null | undefined): true | null {
  if (!Array.isArray(facilities)) return null;
  for (const facility of facilities) {
    if (Number(facility?.id) === PETS_FACILITY_ID) return true;
    if (/se aceptan mascotas/i.test(String(facility?.name || ""))) return true;
  }
  // Ausente = el aviso no lo dice. NUNCA false: InfoCasas no publica la negativa.
  return null;
}

interface IcCurrency {
  id?: number | null;
  name?: string | null;
  rate?: number | null;
}

interface IcMoney {
  amount?: number | null;
  admin_included?: number | null;
  hidePrice?: boolean;
  currency?: IcCurrency | null;
}

interface IcLocationEntry {
  name?: string | null;
}

interface IcFacility {
  id?: number | null;
  name?: string | null;
  group?: string | null;
}

interface IcRow {
  id?: number | string;
  facilities?: IcFacility[] | null;
  /** Texto libre del aviso. La mitad de las descripciones nombran la garantia. */
  description?: string | null;
  /** Campo DEDICADO a la garantia. Viene cargado en ~5-10 % de las filas, no siempre null. */
  guarantee?: string | null;
  /**
   * OJO: NO es la negacion de `facilities`. Es un booleano del propio aviso (42 true / 168 false
   * sobre 210 medidos el 2026-09-04) y 12 avisos lo traen en `true` Y traen la facility 222. Se
   * declara para que nadie lo lea como "no acepta mascotas".
   */
  facilitiesNotApply?: boolean | null;
  title?: string | null;
  address?: string | null;
  showAddress?: boolean | null;
  link?: string | null;
  img?: string | null;
  images?: Array<{ image?: string | null }> | null;
  latitude?: number | null;
  longitude?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  garage?: number | null;
  m2?: number | null;
  m2Built?: number | null;
  m2Terrain?: number | null;
  m2Terrace?: number | null;
  created_at?: string | null;
  price?: IcMoney | null;
  commonExpenses?: IcMoney | null;
  property_type?: { id?: number; name?: string } | null;
  operation_type_id?: number | null;
  owner?: { name?: string | null; type?: string | null; particular?: boolean | null } | null;
  locations?: {
    state?: IcLocationEntry[] | null;
    neighbourhood?: IcLocationEntry[] | null;
    city?: IcLocationEntry[] | null;
  } | null;
}

interface IcPage {
  rows: IcRow[];
  currentPage: number;
  lastPage: number;
  hasMorePages: boolean;
  total: number;
}

/** robots.txt: `/alquiler/*-y-*` is disallowed. Never build such a URL, and never follow one. */
export function assertAllowed(path: string): boolean {
  return !/-y-/.test(path);
}

export interface InfoCasasPriceRange { min?: number; max?: number }

/** Inclusive boundaries deliberately overlap: exact-boundary adverts must never fall in a gap. */
export const INFOCASAS_PRICE_RANGES: readonly InfoCasasPriceRange[] = [
  { max: 13_000 }, { min: 13_000, max: 25_000 }, { min: 25_000, max: 40_000 },
  { min: 40_000, max: 70_000 }, { min: 70_000 },
];

export function infoCasasPageUrl(page: number, range: InfoCasasPriceRange = {}): string {
  if (!Number.isInteger(page) || page < 1 || [range.min, range.max].some(value =>
    value !== undefined && (!Number.isSafeInteger(value) || value <= 0)) ||
    (range.min !== undefined && range.max !== undefined && range.min >= range.max)) {
    throw new Error("invalid InfoCasas page/range");
  }
  const prices = `${range.min ? `/desde-${range.min}` : ""}${range.max ? `/hasta-${range.max}` : ""}`;
  const path = `/alquiler${prices}${prices ? "/pesos" : ""}${page > 1 ? `/pagina${page}` : ""}`;
  return `${ORIGIN}${path}?order=${ORDER_NEWEST}`;
}

/**
 * Pulls the `__NEXT_DATA__` payload out of a listing page. Written as a bounded scan rather than a
 * greedy regex over 600 KB of HTML: the blob is the last script on the page and a `.*?` across that
 * much text is measurably slower.
 */
export function extractNextData(html: string): unknown | null {
  const marker = '<script id="__NEXT_DATA__"';
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const open = html.indexOf(">", start);
  const end = html.indexOf("</script>", open);
  if (open === -1 || end === -1) return null;
  try {
    return JSON.parse(html.slice(open + 1, end));
  } catch {
    return null;
  }
}

export function readPage(payload: unknown): IcPage | null {
  const search = (payload as any)?.props?.pageProps?.fetchResult?.searchFast;
  const pagination = search?.paginatorInfo;
  if (!search || !Array.isArray(search.data) || !pagination ||
    !Number.isInteger(pagination.currentPage) || pagination.currentPage < 1 ||
    !Number.isInteger(pagination.lastPage) || pagination.lastPage < 0 ||
    !Number.isInteger(pagination.total) || pagination.total < 0 ||
    typeof pagination.hasMorePages !== "boolean" ||
    (pagination.hasMorePages && pagination.currentPage >= pagination.lastPage) ||
    (!pagination.hasMorePages && pagination.lastPage > pagination.currentPage)) return null;
  return {
    rows: search.data as IcRow[],
    currentPage: pagination.currentPage,
    lastPage: pagination.lastPage,
    hasMorePages: pagination.hasMorePages,
    total: pagination.total,
  };
}

const currencyOf = (currency: IcCurrency | null | undefined): RentalCurrency | null =>
  parseCurrency(currency?.name || "");

const sellerTypeOf = (owner: IcRow["owner"]): RentalSellerType => {
  if (owner?.particular) return "particular";
  const type = String(owner?.type || "").toLowerCase();
  if (type.includes("inmobiliaria") || type.includes("constructora")) return "inmobiliaria";
  if (type.includes("particular") || type.includes("dueno") || type.includes("dueño")) return "particular";
  return "desconocido";
};

export function toRawRental(row: IcRow): RawRental | null {
  const id = String(row.id ?? "").trim();
  const title = String(row.title ?? "").trim();
  const link = String(row.link ?? "").trim();
  if (!id || !title || !link) return null;
  // operation_type_id 2 is "Alquiler". A row that says anything else reached us by accident.
  if (row.operation_type_id != null && Number(row.operation_type_id) !== 2) return null;
  if (!looksLikeRentalAdvert(title, row.description || "")) return null;
  if (row.price?.hidePrice) return null;

  const price = Number(row.price?.amount);
  const currency = currencyOf(row.price?.currency);
  if (!Number.isFinite(price) || price <= 0 || !currency) return null;

  const department = canonicalDepartment(
    row.locations?.state?.[0]?.name || row.address || ""
  );
  // Their `city` fallback is often the department itself ("Montevideo, Montevideo"). A barrio that
  // repeats the department is not a barrio, and leaving it in splits one building across two
  // buckets — which is exactly how the same office at 25 de Mayo 500 showed up twice.
  const rawNeighborhood = String(row.locations?.neighbourhood?.[0]?.name || row.locations?.city?.[0]?.name || "").trim();
  const neighborhood = canonicalDepartment(rawNeighborhood) === department ? "" : rawNeighborhood;
  // Search JSON includes address/coordinates even when the publisher hides the street.
  // That flag must survive the import: do not reveal the hidden address or use it as identity.
  const hidesAddress = row.showAddress === false;
  const addressLine = hidesAddress ? "" : String(row.address ?? "").split(",")[0]!.trim();
  const { street, number } = parseStreet(addressLine);

  // `admin_included` is price + gastos comunes. When the explicit field is missing we recover the
  // difference rather than publishing "sin gastos comunes", which would be a claim we cannot make.
  const explicitExpenses = row.commonExpenses?.amount == null ? NaN : Number(row.commonExpenses.amount);
  const derived = Number(row.price?.admin_included) - price;
  const commonExpenses = Number.isFinite(explicitExpenses) && explicitExpenses >= 0
    ? explicitExpenses
    : Number.isFinite(derived) && derived > 0
      ? derived
      : null;

  const area = Number(row.m2Built || row.m2);
  const bedrooms = row.bedrooms == null ? null : Number(row.bedrooms);
  const bathrooms = row.bathrooms == null ? null : Number(row.bathrooms);

  return {
    locality: String(row.locations?.city?.[0]?.name || "").trim() || undefined,
    ...(row.showAddress === false ? { addressHidden: true as const } : {}),
    description: rentalDescription(row.description),
    details: rentalOfferDetails({
      description: row.description,
      images: [row.img, ...(Array.isArray(row.images) ? row.images.map(image => image?.image) : [])],
      builtArea: row.m2Built,
      totalArea: row.m2,
      landArea: row.m2Terrain,
      terraceArea: row.m2Terrace,
      amenities: Array.isArray(row.facilities) ? row.facilities.map(facility => facility?.name) : [],
      guaranteeText: row.guarantee,
    }),
    // InfoCasas fills missing garages with 0, so only a positive count is evidence.
    parkingSpaces: Number.isInteger(row.garage) && Number(row.garage) > 0 ? Number(row.garage) : null,
    furnished: row.facilities?.some((facility) => /^(?:amueblado|amoblado|amueblada|amoblada)$/i.test(String(facility.name || "").trim())) ? true : null,
    source: "infocasas",
    listingId: `infocasas:${id}`,
    url: link.startsWith("http") ? link : `${ORIGIN}${link.startsWith("/") ? "" : "/"}${link}`,
    title,
    price,
    currency,
    commonExpenses,
    commonExpensesCurrency: commonExpenses === null ? null
      : Number.isFinite(explicitExpenses) && explicitExpenses >= 0 ? currencyOf(row.commonExpenses?.currency) : currency,
    sellerName: String(row.owner?.name || "").trim() || "InfoCasas",
    sellerType: sellerTypeOf(row.owner),
    petsAllowed: petsFromFacilities(row.facilities),
    guarantees: mergeGuarantees([guaranteesFromField(row.guarantee), guaranteesFromText(row.description)]),
    image: String(row.img || "").trim() || null,
    publishedAt: /^\d{4}-\d{2}-\d{2}$/.test(String(row.created_at || "")) ? String(row.created_at) : null,
    propertyType: inferPropertyType(title, row.property_type?.name || null),
    department,
    neighborhood,
    address: addressLine,
    street,
    streetNumber: number,
    latitude: !hidesAddress && Number.isFinite(Number(row.latitude)) && Number(row.latitude) !== 0 ? Number(row.latitude) : null,
    longitude: !hidesAddress && Number.isFinite(Number(row.longitude)) && Number(row.longitude) !== 0 ? Number(row.longitude) : null,
    bedrooms: Number.isFinite(bedrooms as number) ? (bedrooms as number) : null,
    bathrooms: Number.isFinite(bathrooms as number) && (bathrooms as number) > 0 ? (bathrooms as number) : null,
    area: Number.isFinite(area) && area > 0 ? area : null,
  };
}

export interface InfoCasasHarvestOptions {
  maxPages?: number;
  maxDurationMs?: number;
  /** Read-only diagnostics can isolate a range; production uses all ranges. */
  ranges?: readonly InfoCasasPriceRange[];
  fetchPage?: (url: string) => Promise<string | null>;
  onProgress?: (progress: { pages: number; uniqueRows: number; accepted: number; range: InfoCasasPriceRange }) => void;
}

function boundedInteger(value: unknown, fallback: number, max: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(max, Math.max(1, Math.floor(n))) : fallback;
}

/** A price-filter redirect must not quietly turn five small searches into five national samples. */
function matchesPriceRange(payload: unknown, range: InfoCasasPriceRange): boolean {
  if (range.min === undefined && range.max === undefined) return true;
  const filters = (payload as any)?.props?.pageProps?.params?.filters;
  return !!filters && Number(filters.operation_type_id?.value) === 2 &&
    Number(filters.currencyID?.value) === 2 && Number(filters.order?.value) === 3 &&
    (range.min === undefined ? !filters.minPrice : Number(filters.minPrice?.value) === range.min) &&
    (range.max === undefined ? !filters.maxPrice : Number(filters.maxPrice?.value) === range.max);
}

export async function harvestInfoCasas(
  mode: "full" | "fast", usdUyu: number, options: InfoCasasHarvestOptions = {}
): Promise<RentalSourceResult> {
  const maxPages = boundedInteger(options.maxPages ?? (mode === "fast"
    ? process.env.RENTALS_IC_FAST_PAGES : process.env.RENTALS_IC_MAX_PAGES), mode === "fast" ? 10 : 900, 1800);
  const maxDurationMs = boundedInteger(options.maxDurationMs ?? process.env.RENTALS_IC_MAX_DURATION_MS, 40 * 60_000, 60 * 60_000);
  const started = Date.now();
  const fetchPage = options.fetchPage || ((url: string) => fetchText(url, { timeoutMs: 40_000, retries: 1 }));
  const queue = [...(options.ranges || (mode === "fast" ? [{}] : INFOCASAS_PRICE_RANGES))];
  const byId = new Map<string, RawRental>();
  const seenIds = new Set<string>();
  const rejectedIds = new Set<string>();
  let pages = 0, rawRows = 0, repeatedRows = 0, repeatedTails = 0, failedPages = 0, completedRanges = 0;
  let truncated = false, missingIds = false;
  const issues: string[] = [];

  for (let stream = 0; stream < queue.length; stream++) {
    const range = queue[stream]!;
    const rangeIds = new Set<string>();
    let advertised = 0, noNewPages = 0;
    for (let page = 1; ; page++) {
      if (pages >= maxPages || Date.now() - started >= maxDurationMs) { truncated = true; break; }
      const url = infoCasasPageUrl(page, range);
      if (!assertAllowed(new URL(url).pathname)) throw new Error("disallowed InfoCasas path");
      let html: string | null = null;
      try { html = await fetchPage(url); } catch { /* Preserve prior data when one stream fails. */ }
      pages++;
      const payload = html ? extractNextData(html) : null;
      const parsed = readPage(payload);
      if (!parsed || parsed.currentPage !== page || !matchesPriceRange(payload, range) ||
        (!parsed.rows.length && parsed.hasMorePages)) {
        failedPages++;
        issues.push(`búsqueda ${stream + 1}, página ${page}: respuesta incompleta o distinta`);
        break;
      }
      advertised = Math.max(advertised, parsed.total);
      // Keep each stream below the observed ~10,000-result deep-pagination ceiling. If the
      // market grows, split this range before wasting hundreds of requests on its repeated tail.
      if (mode === "full" && page === 1 && parsed.total > 9000 && queue.length < 32) {
        const min = range.min || 0;
        const mid = range.max ? Math.floor((min + range.max) / 2) : Math.max(13_000, min * 2);
        if (mid > min && (range.max === undefined || mid < range.max)) {
          queue.splice(stream + 1, 0, { ...range, max: mid }, { min: mid, ...(range.max ? { max: range.max } : {}) });
          break;
        }
      }
      let newIds = 0;
      rawRows += parsed.rows.length;
      for (const row of parsed.rows) {
        if (!row || typeof row !== "object" || !/^\d+$/.test(String(row.id || ""))) continue;
        const id = String(row.id);
        if (!rangeIds.has(id)) { newIds++; rangeIds.add(id); }
        if (seenIds.has(id)) repeatedRows++;
        seenIds.add(id);
        const listing = toRawRental(row);
        if (!listing) { rejectedIds.add(id); continue; }
        const priceUyu = listing.currency === "USD" ? listing.price * usdUyu : listing.price;
        if (!isPlausibleRent(priceUyu, listing.propertyType, listing)) { rejectedIds.add(id); continue; }
        rejectedIds.delete(id);
        byId.set(listing.listingId, listing);
      }
      options.onProgress?.({ pages, uniqueRows: seenIds.size, accepted: byId.size, range });
      noNewPages = newIds ? 0 : noNewPages + 1;
      if (noNewPages >= 3 && parsed.hasMorePages) {
        repeatedTails++;
        issues.push(`búsqueda ${stream + 1}: cola repetida desde página ${page - 2}`);
        break;
      }
      if (!parsed.hasMorePages) {
        completedRanges++;
        // Counting HTTP pages does not prove completeness. Stable boundaries can still omit
        // IDs when the source changes order within one publication date.
        if (rangeIds.size < advertised) missingIds = true;
        break;
      }
    }
    if (truncated) break;
  }
  const ok = byId.size > 0;
  // Even a fully walked, overlapping set of price filters is not a transactional snapshot:
  // adverts can move between ranges while we read. Never expire unseen offers on this evidence.
  const complete = false;
  const note = `${pages} páginas, ${seenIds.size} IDs únicos leídos, ${byId.size} avisos aceptados; ` +
    `${rejectedIds.size} descartados, ${repeatedRows} lecturas repetidas de ${rawRows}; ` +
    `${completedRanges} búsquedas terminadas` +
    (mode === "full" ? " por franjas de precio" : " — repaso de novedades") +
    (truncated ? ` — CORTADO por presupuesto (${maxPages} páginas / ${Math.round(maxDurationMs / 60_000)} min)` : "") +
    (missingIds ? " — el portal omitió IDs entre páginas" : "") +
    (failedPages ? ` — ${failedPages} páginas fallidas` : "") +
    (repeatedTails ? ` — ${repeatedTails} colas repetidas` : "") +
    (issues.length ? `; ${issues.slice(0, 3).join("; ")}` : "") +
    "; cobertura parcial: se conservan avisos no vistos";
  return { key: "infocasas", ok, complete, listings: [...byId.values()], note };
}
