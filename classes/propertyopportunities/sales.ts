import { rentalDescription, rentalImages, rentalOfferDetails } from "../rentals/details";
import { fetchText } from "../rentals/net";
import { canonicalDepartment, DEPARTMENTS, flatten, parseCurrency } from "../rentals/normalize";
import { extractNextData } from "../rentals/sources/infocasas";
import type { OpportunityListing, OpportunityMoney, OpportunityRisk } from "./types";

const ORIGIN = "https://www.infocasas.com.uy";
const USER_AGENT = "CambioUruguayBot/1.0 (+https://cambio-uruguay.com; property price index; contact via site)";
type HousingType = "apartamentos" | "casas";
const MONTEVIDEO_NEIGHBORHOODS = ["Pocitos", "Cordón", "Centro", "Tres Cruces", "Parque Rodó"] as const;

interface SourceMoney {
  amount?: unknown;
  hidePrice?: unknown;
  currency?: { name?: unknown } | null;
}

interface SourceLocation {
  id?: unknown;
  name?: unknown;
  slug?: unknown;
}

/** Whitelist of public advert facts. Contact fields and portal-generated valuations are absent. */
export interface InfoCasasSaleRow {
  id?: unknown;
  operation_type_id?: unknown;
  property_type?: { name?: unknown } | null;
  title?: unknown;
  description?: unknown;
  link?: unknown;
  img?: unknown;
  images?: Array<{ image?: unknown }> | null;
  price?: SourceMoney | null;
  commonExpenses?: SourceMoney | null;
  bedrooms?: unknown;
  bathrooms?: unknown;
  garage?: unknown;
  m2?: unknown;
  m2Built?: unknown;
  m2Terrain?: unknown;
  m2Terrace?: unknown;
  created_at?: unknown;
  showAddress?: unknown;
  address?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  active?: unknown;
  deleted?: unknown;
  sold?: unknown;
  isProject?: unknown;
  isProjectUnit?: unknown;
  hidePrice?: unknown;
  owner?: { name?: unknown } | null;
  facilities?: Array<{ name?: unknown }> | null;
  locations?: {
    country?: Array<{ name?: unknown }>;
    state?: Array<{ name?: unknown }>;
    city?: Array<{ name?: unknown }>;
    neighbourhood?: SourceLocation[];
  } | null;
}

function number(value: unknown): number | null {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function integer(value: unknown, minimum: number): number | null {
  const parsed = number(value);
  return parsed !== null && Number.isInteger(parsed) && parsed >= minimum && parsed <= 100 ? parsed : null;
}

function sourceMoney(value: SourceMoney | null | undefined, allowZero: boolean): OpportunityMoney | null {
  if (!value || value.hidePrice === true || value.hidePrice === 1) return null;
  const amount = number(value.amount);
  const currency = parseCurrency(String(value.currency?.name || ""));
  return amount !== null && amount >= (allowZero ? 0 : Number.MIN_VALUE) && currency
    ? { amount, currency } : null;
}

function originalDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

function saleLocality(row: InfoCasasSaleRow, department: string, neighborhood: string): string {
  const explicit = rentalDescription(row.locations?.city?.[0]?.name, 160);
  if (explicit) return explicit;
  if (department === "Montevideo") return "Montevideo";
  // Verified 2026-09-06 in the advert's own JSON-LD breadcrumb (IC 194216102):
  // "Roosevelt, Punta del Este". The search payload represents that hierarchy as two
  // neighbourhood nodes. Other two-node arrays did NOT publish that hierarchy in breadcrumbs;
  // they remain unknown until separately verified, rather than becoming guessed localities.
  const nodes = row.locations?.neighbourhood;
  if (department !== "Maldonado" || !Array.isArray(nodes) || nodes.length !== 2 || neighborhood !== "Roosevelt") return "";
  const [child, parent] = nodes;
  if (child?.id !== "cd94e021-359e-4c4e-8bb5-53c6ccb213ee" || parent?.id !== "89049a8e-eb92-465c-bd44-830fa12c3ccb" ||
    child.name !== "Roosevelt" || parent.name !== "Punta del Este" ||
    !Array.isArray(child.slug) || !child.slug.includes("neighbourhood-maldonado-roosevelt") ||
    !Array.isArray(parent.slug) || !parent.slug.includes("neighbourhood-maldonado-punta-del-este")) return "";
  return "Punta del Este";
}

/** A sale is never inferred from a rental URL, a price threshold or an ambiguous operation. */
export function toInfoCasasSale(row: InfoCasasSaleRow, readAt: string): OpportunityListing | null {
  if (row.operation_type_id !== 1 && row.operation_type_id !== "1") return null;
  if (row.active === false || row.active === 0 || row.deleted === true || row.deleted === 1 ||
    row.sold === true || row.sold === 1 || row.hidePrice === true || row.hidePrice === 1) return null;
  const id = String(row.id || "");
  if (!/^\d{1,18}$/.test(id)) return null;
  const title = rentalDescription(row.title, 500).replace(/\s+/g, " ");
  const description = rentalDescription(row.description);
  const sourceType = flatten(String(row.property_type?.name || ""));
  const propertyType = sourceType === "apartamento" ? "apartamento" : sourceType === "casa" ? "casa" : null;
  const price = sourceMoney(row.price, false);
  if (!title || !price || !propertyType || !Number.isFinite(Date.parse(readAt))) return null;
  let url: URL;
  try {
    url = new URL(String(row.link || ""), ORIGIN);
    if (url.origin !== ORIGIN || url.username || url.password || url.pathname.split("/").filter(Boolean).pop() !== id) return null;
    url.search = "";
    url.hash = "";
  } catch { return null; }
  const country = flatten(String(row.locations?.country?.[0]?.name || ""));
  if (country && country !== "uruguay") return null;
  const department = canonicalDepartment(String(row.locations?.state?.[0]?.name || ""));
  if (!department) return null;
  const rawNeighborhood = rentalDescription(row.locations?.neighbourhood?.[0]?.name, 160);
  const neighborhood = flatten(rawNeighborhood) === flatten(department) ? "" : rawNeighborhood;
  const locality = saleLocality(row, department, neighborhood);
  const details = rentalOfferDetails({ builtArea: row.m2Built, totalArea: row.m2, landArea: row.m2Terrain,
    terraceArea: row.m2Terrace,
    amenities: Array.isArray(row.facilities) ? row.facilities.map(facility => facility?.name) : [],
  }, `${title}\n${description}`, propertyType);
  // A house's general m² may be its plot. Without a built area we preserve the report as unknown
  // basis, which the comparison engine excludes. Apartment total area is compared only to total.
  const area = details.builtArea !== null ? { value: details.builtArea, basis: "built" as const }
    : details.totalArea !== null ? { value: details.totalArea, basis: propertyType === "apartamento" ? "total" as const : "reported" as const }
      : null;
  const listingId = `infocasas:${id}`;
  const images = rentalImages([row.img, ...(Array.isArray(row.images) ? row.images.map(item => item?.image) : [])]);
  const riskFlags: OpportunityRisk[] = [];
  const latitude = number(row.latitude), longitude = number(row.longitude);
  const geo = row.showAddress === true && latitude !== null && longitude !== null &&
    latitude >= -35.5 && latitude <= -30 && longitude >= -58.6 && longitude <= -53
    ? { lat: latitude, lng: longitude, precision: "approximate" as const } : null;
  if (row.isProject === true || row.isProject === 1 || row.isProjectUnit === true || row.isProjectUnit === 1) riskFlags.push("project");
  if (propertyType === "apartamento" && details.builtArea !== null && details.totalArea !== null &&
    details.builtArea > details.totalArea * 1.05 && details.builtArea - details.totalArea > 2) riskFlags.push("attribute_conflict");
  return {
    id: `sale:${listingId}`, operation: "sale", source: "infocasas", listingId,
    url: url.href, title, description, image: images[0] || null, images, geo,
    areas: { built: details.builtArea, total: propertyType === "apartamento" ? details.totalArea : null,
      land: details.landArea, terrace: details.terraceArea,
      reported: propertyType === "casa" ? details.totalArea : null },
    sellerName: rentalDescription(row.owner?.name, 160).replace(/\s+/g, " "),
    department, locality, neighborhood, propertyType,
    bedrooms: integer(row.bedrooms, 0), bathrooms: integer(row.bathrooms, 1), area, landArea: details.landArea, price,
    // admin_included is never used: a sale price and monthly expenses are different concepts.
    expenses: sourceMoney(row.commonExpenses, true), lastSeen: new Date(readAt).toISOString(),
    publishedAt: originalDate(row.created_at), parkingSpaces: integer(row.garage, 1),
    furnished: Array.isArray(row.facilities) && row.facilities.some(item => /^(?:amueblado|amoblado|amueblada|amoblada)$/i.test(String(item?.name || "").trim())) ? true : null,
    riskFlags, amenities: details.amenities,
    ...(row.showAddress === true ? { address: rentalDescription(row.address, 300) } : {}),
  };
}

export interface InfoCasasSalePage {
  rows: InfoCasasSaleRow[];
  currentPage: number;
  lastPage: number;
  total: number;
  hasMorePages: boolean;
}

export function readInfoCasasSalePage(html: string): InfoCasasSalePage | null {
  const payload = extractNextData(html) as { props?: { pageProps?: { fetchResult?: { searchFast?: {
    data?: InfoCasasSaleRow[];
    paginatorInfo?: { currentPage?: unknown; lastPage?: unknown; total?: unknown; hasMorePages?: unknown };
  } } } } } | null;
  const search = payload?.props?.pageProps?.fetchResult?.searchFast;
  const paginator = search?.paginatorInfo;
  const currentPage = number(paginator?.currentPage);
  const lastPage = number(paginator?.lastPage);
  const total = number(paginator?.total);
  if (!Array.isArray(search?.data) || currentPage === null || !Number.isInteger(currentPage) || currentPage < 1 ||
    lastPage === null || !Number.isInteger(lastPage) || lastPage < 0 ||
    total === null || !Number.isInteger(total) || total < 0 || typeof paginator?.hasMorePages !== "boolean") return null;
  return { rows: search.data, currentPage, lastPage, total, hasMorePages: paginator.hasMorePages };
}

/** robots.txt forbids /venta/*-y-*; never build combined filters or the Treinta-y-Tres path. */
export function salePageUrl(type: HousingType, page: number, department = "", neighborhood = ""): string {
  if (!["apartamentos", "casas"].includes(type) || !Number.isInteger(page) || page < 1) throw new Error("invalid sales page");
  if (department && (!DEPARTMENTS.includes(department) || department === "Treinta y Tres")) throw new Error("unsupported sales department path");
  if (neighborhood && (department !== "Montevideo" || type !== "apartamentos" ||
    !MONTEVIDEO_NEIGHBORHOODS.some(value => value === neighborhood))) throw new Error("unsupported sales neighborhood path");
  const slug = department ? `/${flatten(department).replace(/\s+/g, "-")}` : "";
  const neighborhoodSlug = neighborhood ? `/${flatten(neighborhood).replace(/\s+/g, "-")}` : "";
  return `${ORIGIN}/venta/${type}${slug}${neighborhoodSlug}${page > 1 ? `/pagina${page}` : ""}?order=3`;
}

/** Uniform positions through the public newest-first list. No price ordering or cheap-only feed. */
export function uniformSalePages(lastPage: number, budget: number): number[] {
  const end = Math.max(1, Math.floor(lastPage));
  const count = Math.min(end, Math.max(1, Math.floor(budget)));
  if (count === 1) return [1];
  return Array.from({ length: count }, (_, index) => 1 + Math.round(index * (end - 1) / (count - 1)));
}

export interface SaleHarvestOptions {
  /** Includes discovery pages. At least 2; production default 500, hard cap 600. */
  maxPages?: number;
  /** End the source before it can keep a daily job alive indefinitely. */
  maxDurationMs?: number;
  /** false is a national-only diagnostic; production stratifies by department. */
  geographicSeeds?: boolean;
  /** Optional bounded regional supplement, without touching or refreshing an earlier capture. */
  departments?: readonly string[];
  /** Daily default includes five Montevideo apartment neighborhoods; regional diagnostics opt in. */
  neighborhoodSamples?: boolean;
  now?: () => Date;
  fetchPage?: (url: string) => Promise<string | null>;
  onProgress?: (pages: number, listings: number) => void;
}

export interface SaleHarvestResult {
  operation: "sale";
  source: "infocasas";
  ok: boolean;
  complete: boolean;
  listings: OpportunityListing[];
  /** Explicit own-source withdrawal only. Missing IDs in a partial sample never qualify. */
  unavailableIds?: string[];
  readAt: string;
  /** Read evidence, not part of the public opportunity payload. Original captures may omit it. */
  pageReads?: Array<{ path: string; readAt: string; ids: string[]; newIds: number; ok: boolean }>;
  coverage: {
    strategy: "uniform-national-with-department-seeds" | "uniform-national" | "stratified-departments-with-national-sample";
    pagesRead: number;
    pagesRequested: number;
    pagesAvailable: number;
    rawRows: number;
    uniqueAccepted: number;
    advertisedByType: Record<HousingType, number>;
    byDepartment: Record<string, number>;
    failedPages: number;
    capped: boolean;
    repeatedDepths?: Array<{ type: HousingType; department: string; neighborhood?: string; advertisedLastPage: number; depthLimit: number }>;
  };
  note: string;
}

/** Read-only: callers own the separate sales collection, snapshot, clock, lock and retention policy. */
export async function harvestSalesInfoCasas(options: SaleHarvestOptions = {}): Promise<SaleHarvestResult> {
  const maxPages = Math.min(600, Math.max(2, Math.floor(options.maxPages || 500)));
  const maxDurationMs = Math.min(30 * 60_000, Math.max(1000, options.maxDurationMs || 20 * 60_000));
  const now = options.now || (() => new Date());
  const started = now();
  const fetchPage = options.fetchPage || ((url: string) => fetchText(url, { timeoutMs: 30_000, retries: 0, headers: { "user-agent": USER_AGENT } }));
  const byId = new Map<string, OpportunityListing>();
  const unavailableIds = new Set<string>();
  interface Stream {
    type: HousingType; department: string; neighborhood: string; total: number; lastPage: number; limit: number;
    visited: Set<number>; succeeded: Set<number>; ids: Set<string>; repeats: number[];
    depthLimited: boolean; failed: boolean; queue: number[]; weight: number;
  }
  const streams: Stream[] = [];
  const createStream = (type: HousingType, department = "", neighborhood = ""): Stream => {
    const stream: Stream = { type, department, neighborhood, total: 0, lastPage: 0, limit: 0,
      visited: new Set(), succeeded: new Set(), ids: new Set(), repeats: [], depthLimited: false,
      failed: false, queue: [], weight: 0 };
    streams.push(stream);
    return stream;
  };
  const national = [createStream("apartamentos"), createStream("casas")];
  const advertisedByType: Record<HousingType, number> = { apartamentos: 0, casas: 0 };
  const pageReads: NonNullable<SaleHarvestResult["pageReads"]> = [];
  let pagesRequested = 0, pagesRead = 0, rawRows = 0, failedPages = 0;
  let capped = false;
  const read = async (stream: Stream, page: number): Promise<InfoCasasSalePage | null> => {
    const { type, department, neighborhood } = stream;
    const url = salePageUrl(type, page, department, neighborhood);
    if (stream.visited.has(page) || (stream.depthLimited && page > stream.limit)) return null;
    if (pagesRequested >= maxPages || now().getTime() - started.getTime() >= maxDurationMs) { capped = true; return null; }
    stream.visited.add(page);
    pagesRequested++;
    let html: string | null = null;
    try { html = await fetchPage(url); } catch { /* Source failure does not write or blank anything. */ }
    const parsed = html ? readInfoCasasSalePage(html) : null;
    const inScope = (row: InfoCasasSaleRow) => (!department || canonicalDepartment(String(row.locations?.state?.[0]?.name || "")) === department) &&
      (!neighborhood || (flatten(String(row.locations?.neighbourhood?.[0]?.name || "")) === flatten(neighborhood) &&
        flatten(String(row.property_type?.name || "")) === "apartamento"));
    if (!parsed || parsed.currentPage !== page || (department && parsed.rows.length > 0 && !parsed.rows.some(inScope))) {
      failedPages++;
      stream.failed = true;
      pageReads.push({ path: new URL(url).pathname, readAt: now().toISOString(), ids: [], newIds: 0, ok: false });
      return null;
    }
    pagesRead++;
    stream.succeeded.add(page);
    stream.lastPage = Math.max(stream.lastPage, parsed.lastPage, page + (parsed.hasMorePages ? 1 : 0));
    if (!stream.depthLimited) stream.limit = stream.lastPage;
    stream.total = Math.max(stream.total, parsed.total);
    rawRows += parsed.rows.length;
    const readAt = now().toISOString();
    for (const row of parsed.rows) {
      const id = String(row.id || "");
      if ((row.operation_type_id === 1 || row.operation_type_id === "1") && /^\d{1,18}$/.test(id) &&
        (row.active === false || row.active === 0 || row.deleted === true || row.deleted === 1 || row.sold === true || row.sold === 1 ||
          row.hidePrice === true || row.hidePrice === 1 || row.price?.hidePrice === true || row.price?.hidePrice === 1)) {
        unavailableIds.add(`sale:infocasas:${id}`);
      }
    }
    const ids = parsed.rows.map(row => String(row?.id || "")).filter(id => /^\d+$/.test(id));
    const newIds = ids.filter(id => !stream.ids.has(id)).length;
    ids.forEach(id => stream.ids.add(id));
    pageReads.push({ path: new URL(url).pathname, readAt, ids, newIds, ok: true });
    if (page > 1 && newIds === 0) stream.repeats.push(page);
    else stream.repeats = [];
    if (stream.repeats.length >= 3) {
      // The portal can report thousands of pages while repeating its deepest accessible rows.
      // Stop that tail; use the budget for unread positions inside the range or another stream.
      stream.limit = Math.max(1, Math.min(stream.limit, ...stream.repeats) - 1);
      stream.depthLimited = true;
      stream.repeats = [];
    }
    for (const row of parsed.rows) {
      const listing = row && typeof row === "object" ? toInfoCasasSale(row, readAt) : null;
      if (listing && inScope(row)) byId.set(listing.id, listing);
    }
    options.onProgress?.(pagesRead, byId.size);
    return parsed;
  };
  for (const stream of national) {
    const first = await read(stream, 1);
    if (first) advertisedByType[stream.type] = first.total;
  }
  const regional: Stream[] = [];
  if (options.geographicSeeds !== false) {
    const departments = options.departments || DEPARTMENTS.filter(value => value !== "Treinta y Tres");
    for (const department of [...new Set(departments)]) {
      for (const type of ["apartamentos", "casas"] as const) {
        const stream = createStream(type, department);
        regional.push(stream);
        await read(stream, 1);
      }
      if (capped) break;
    }
  }
  const neighborhoods: Stream[] = [];
  if (!capped && options.geographicSeeds !== false && (options.neighborhoodSamples ?? !options.departments)) {
    for (const neighborhood of MONTEVIDEO_NEIGHBORHOODS) {
      const stream = createStream("apartamentos", "Montevideo", neighborhood);
      neighborhoods.push(stream);
      await read(stream, 1);
      if (capped) break;
    }
  }

  const plan = (group: Stream[], budget: number): void => {
    const candidates = group.filter(stream => !stream.failed && stream.limit > 1);
    const weights = candidates.reduce((sum, stream) => sum + stream.weight, 0);
    let remaining = budget;
    for (let index = 0; index < candidates.length; index++) {
      const stream = candidates[index]!;
      const share = index === candidates.length - 1 ? remaining : Math.min(remaining, Math.round(budget * stream.weight / (weights || 1)));
      remaining -= share;
      stream.queue = uniformSalePages(stream.limit, share + 1).filter(page => !stream.visited.has(page));
    }
  };
  const runQueues = async (group: Stream[]): Promise<void> => {
    while (!capped && group.some(stream => stream.queue.length)) {
      for (const stream of group) {
        const page = stream.queue.shift();
        if (page !== undefined && page <= stream.limit) await read(stream, page);
        if (capped) break;
      }
    }
  };
  national.forEach(stream => { stream.weight = stream.total; });
  const nationalBudget = regional.length ? Math.min(18, Math.max(0, maxPages - pagesRequested)) : Math.max(0, maxPages - pagesRequested);
  plan(national, nationalBudget);
  await runQueues(national);
  // Public neighborhood lists expose advertisers missed by deep department pagination. Keep
  // 150 pages inside the same daily budget, allocated by listing counts and date positions.
  neighborhoods.forEach(stream => { stream.weight = stream.total; });
  plan(neighborhoods, Math.min(Math.max(0, 150 - neighborhoods.reduce((sum, stream) => sum + stream.visited.size, 0)),
    Math.max(0, maxPages - pagesRequested)));
  await runQueues(neighborhoods);
  // More observations where the original locality is available, while retaining every legal
  // department and both housing types. This is a declared sample; no prices enter allocation.
  regional.forEach(stream => { stream.weight = stream.total * (stream.department === "Montevideo" ? 3 : 1); });
  plan(regional, Math.max(0, maxPages - pagesRequested));
  await runQueues(regional);

  const nextUnseen = (stream: Stream): number | null => {
    if (stream.failed || stream.limit < 2) return null;
    const points = [0, ...[...stream.visited].filter(page => page <= stream.limit).sort((a, b) => a - b), stream.limit + 1];
    let best: number | null = null, gap = 1;
    for (let index = 1; index < points.length; index++) {
      const size = points[index]! - points[index - 1]!;
      if (size > gap) { gap = size; best = Math.floor((points[index]! + points[index - 1]!) / 2); }
    }
    return best;
  };
  // A repeated deep tail does not justify spending the remaining run on the same IDs. Fill the
  // widest unread date gaps within accessible department ranges, maintaining weighted breadth.
  const supplements = regional.length ? regional : national;
  while (!capped && pagesRequested < maxPages) {
    const choices = supplements.map(stream => ({ stream, page: nextUnseen(stream) }))
      .filter((choice): choice is { stream: Stream; page: number } => choice.page !== null)
      .sort((a, b) => b.stream.weight / (b.stream.visited.size + 1) - a.stream.weight / (a.stream.visited.size + 1));
    if (!choices.length) break;
    await read(choices[0]!.stream, choices[0]!.page);
  }
  // Conflicting source states in the same run are withheld until a later active observation.
  const listings = [...byId.values()].filter(row => !unavailableIds.has(row.id));
  const repeatedDepths = streams.filter(stream => stream.depthLimited).map(stream => ({ type: stream.type,
    department: stream.department, ...(stream.neighborhood ? { neighborhood: stream.neighborhood } : {}),
    advertisedLastPage: stream.lastPage, depthLimit: stream.limit }));
  const complete = failedPages === 0 && repeatedDepths.length === 0 &&
    national.every(stream => stream.lastPage > 0 && stream.succeeded.size === stream.lastPage);
  const totalAvailable = national.reduce((sum, stream) => sum + stream.lastPage, 0);
  const byDepartment = Object.fromEntries(DEPARTMENTS.map(department => [department, listings.filter(item => item.department === department).length]));
  return {
    operation: "sale", source: "infocasas", ok: listings.length > 0, complete, listings, unavailableIds: [...unavailableIds], readAt: now().toISOString(), pageReads,
    coverage: { strategy: regional.length ? "stratified-departments-with-national-sample" : "uniform-national",
      pagesRead, pagesRequested, pagesAvailable: totalAvailable, rawRows, uniqueAccepted: listings.length,
      advertisedByType, byDepartment, failedPages, capped: capped || !complete, repeatedDepths },
    note: `${complete ? "Lectura completa" : "Muestra"} de ventas de InfoCasas: ${pagesRead} páginas leídas, ${listings.length} avisos de casas/apartamentos. ` +
      `${regional.length ? `Muestra por departamento, reforzada en Montevideo${neighborhoods.length ? " y cinco barrios de apartamentos" : ""}, y una muestra nacional` : "Muestra nacional"}, por fecha y sin ordenar por precio. ` +
      `${failedPages} páginas fallidas; ${repeatedDepths.length} listas con cola repetida limitada. ` +
      "Los totales del portal incluyen proyectos y publicaciones repetidas; no equivalen a viviendas únicas ni a cobertura de todo el mercado.",
  };
}
