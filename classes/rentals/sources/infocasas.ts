// InfoCasas Uruguay.
//
// The listing pages are Next.js with `getServerSideProps`, so every advert on a page is already in
// the `__NEXT_DATA__` blob: id, address, lat/lon, dormitorios, baños, m², gastos comunes, the
// agency, and the publication date. No headless browser, no HTML scraping of card markup that
// changes with the next deploy — we read the same JSON their own page renders from.
//
// Two rules this file must not break:
//   * robots.txt disallows `/alquiler/*-y-*` (their combined-filter URLs). We only ever build
//     `/alquiler/pagina<N>`, and `assertAllowed` refuses anything with `-y-` in the path so a
//     future "treinta-y-tres" slug can never sneak past.
//   * we read the NATIONWIDE list sorted by "más recientes" (`order=3`). Sorting by newest is what
//     makes a truncated run still correct: whatever the page cap cuts off is the oldest tail, never
//     today's adverts.
import { guaranteesFromField, guaranteesFromText, mergeGuarantees } from "../guarantees";
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
const PAGE_SIZE = 21;

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
  link?: string | null;
  img?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  garage?: number | null;
  m2?: number | null;
  m2Built?: number | null;
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
  hasMorePages: boolean;
  total: number;
}

/** robots.txt: `/alquiler/*-y-*` is disallowed. Never build such a URL, and never follow one. */
export function assertAllowed(path: string): boolean {
  return !/-y-/.test(path);
}

function pageUrl(page: number): string {
  const path = page <= 1 ? "/alquiler" : `/alquiler/pagina${page}`;
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
  if (!search || !Array.isArray(search.data)) return null;
  return {
    rows: search.data as IcRow[],
    hasMorePages: Boolean(search.paginatorInfo?.hasMorePages),
    total: Number(search.paginatorInfo?.total || 0),
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
  const addressLine = String(row.address ?? "")
    .split(",")[0]!
    .trim();
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
    latitude: Number.isFinite(Number(row.latitude)) && Number(row.latitude) !== 0 ? Number(row.latitude) : null,
    longitude: Number.isFinite(Number(row.longitude)) && Number(row.longitude) !== 0 ? Number(row.longitude) : null,
    bedrooms: Number.isFinite(bedrooms as number) ? (bedrooms as number) : null,
    bathrooms: Number.isFinite(bathrooms as number) && (bathrooms as number) > 0 ? (bathrooms as number) : null,
    area: Number.isFinite(area) && area > 0 ? area : null,
  };
}

export async function harvestInfoCasas(mode: "full" | "fast", usdUyu: number): Promise<RentalSourceResult> {
  const maxPages =
    mode === "fast"
      ? Number(process.env.RENTALS_IC_FAST_PAGES || 10)
      : Number(process.env.RENTALS_IC_MAX_PAGES || 900);

  const byId = new Map<string, RawRental>();
  let pages = 0;
  let total = 0;
  let truncated = false;
  let lastError = "";

  for (let page = 1; page <= maxPages; page++) {
    const url = pageUrl(page);
    if (!assertAllowed(new URL(url).pathname)) break;
    let html = await fetchText(url, { timeoutMs: 40_000, retries: 1 });
    if (!html) {
      lastError = `sin respuesta en la página ${page}`;
      // One bad page is a hiccup; two in a row means the host has had enough of us.
      html = await fetchText(url, { timeoutMs: 40_000, retries: 0 });
      if (!html) break;
    }
    const parsed = readPage(extractNextData(html) ?? {});
    if (!parsed) {
      lastError = `la página ${page} no trajo el payload de búsqueda`;
      break;
    }
    pages++;
    total = parsed.total || total;

    for (const row of parsed.rows) {
      const listing = toRawRental(row);
      if (!listing) continue;
      const priceUyu = listing.currency === "USD" ? listing.price * usdUyu : listing.price;
      if (!isPlausibleRent(priceUyu, listing.propertyType)) continue;
      byId.set(listing.listingId, listing);
    }

    if (!parsed.hasMorePages) break;
    if (page === maxPages && parsed.hasMorePages) truncated = true;
  }

  const ok = pages > 0 && byId.size > 0;
  // Why the unique count is well below `pages * 21`: the list is sorted by "más recientes" and it
  // is LIVE — adverts published while we walk it push the rest down a page, so we see some of them
  // twice. That is not a leak, and it is not a reason to stop sorting by newest: coverage
  // accumulates across runs, because a row nobody re-published is kept (and only pruned after
  // three weeks) instead of being deleted for missing one sweep.
  const note = ok
    ? `${pages} páginas, ${byId.size} avisos únicos de ${total || "?"} publicados` +
      (truncated ? ` — CORTADO en el tope de ${maxPages} páginas` : "") +
      (lastError ? ` — con reintentos: ${lastError}` : "")
    : `sin datos utilizables${lastError ? `: ${lastError}` : ""}`;

  return { key: "infocasas", ok, complete: mode === "full" && !truncated && !lastError, listings: [...byId.values()], note };
}
