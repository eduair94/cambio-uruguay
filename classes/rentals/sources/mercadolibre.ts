import { advertiserClassification, ownerDirectDeclaration } from "../advertiser";
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
import {
  ML_RENTAL_CATEGORIES, ML_PAGE_SIZE as PAGE_SIZE, ML_OFFSET_CEILING,
  mlBoundedNumber, mlCount, mlPageMatches, mlParams, mlPartitions, mlPartitionRemainder,
  type MLFilters, type MLSearchEvidence,
} from "./mercadolibreSearch";

const API_BASE = (process.env.RENTALS_ML_API || "http://104.234.204.107:9656/mercadolibre").replace(/\/+$/, "");

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

export function toRawRental(card: Polycard, observedAt = new Date().toISOString()): RawRental | null {
  const id = String(card.metadata?.id || "").trim();
  const category = ML_RENTAL_CATEGORIES.find(row => row.id === card.metadata?.category_id && row.domain === card.metadata?.domain_id);
  if (!/^MLU\d+$/.test(id) || !category) return null;

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
    parkingSpaces: null,
    furnished: null,
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
    sellerType: advertiserClassification({ title }).sellerType,
    ownerDirect: ownerDirectDeclaration({ title }, permalink, observedAt) ?? undefined,
    image: String(params.get("picture") || params.get("thumbnail") || "").trim() || null,
    publishedAt: null,
    propertyType: category.propertyType === "otro" && inferPropertyType(title) === "garaje"
      ? "garaje" : category.propertyType,
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

interface SearchResult extends MLSearchEvidence { cards: Polycard[] }
interface SearchTask {
  filters: MLFilters;
  offset: number;
  depth: number;
  seen: Set<string>;
  parentTotal?: number;
  fallback?: boolean;
}

/** A bounded, interleaved frontier: apartments cannot spend the whole run before houses are read.
 * Larger slices are partitioned by the portal's own location/price facets, never by invented
 * state IDs or seven equivalent words inside the apartment-only category. */
export async function harvestMercadoLibre(mode: "full" | "fast", usdUyu: number): Promise<RentalSourceResult> {
  const full = mode === "full";
  const maxPages = mlBoundedNumber(
    full ? process.env.RENTALS_ML_MAX_PAGES : process.env.RENTALS_ML_FAST_PAGES,
    full ? 120 : 12, 1, ML_OFFSET_CEILING / PAGE_SIZE,
  );
  const requestLimit = mlBoundedNumber(process.env.RENTALS_ML_REQUEST_BUDGET, full ? 1600 : 100, 1, 3000);
  const timeLimit = mlBoundedNumber(process.env.RENTALS_ML_TIME_BUDGET_MS, full ? 2_400_000 : 240_000, 1000, 3_600_000);
  // Enrichment has a small reservation, and cannot consume the primary coverage budget.
  const reserve = full ? Math.min(100, Math.floor(requestLimit / 10)) : 0;
  const primaryLimit = requestLimit - reserve;
  // ...and the same share of the clock. Reserving requests alone was not enough: on 2026-09-12 a
  // slow bridge let the catalogue run out all 40 minutes with 180 requests unspent, and the pets
  // pass got a single request (602 adverts marked that morning, 20 that afternoon, same code).
  const primaryTimeLimit = timeLimit - Math.floor(timeLimit * reserve / requestLimit);
  const started = Date.now();
  const byId = new Map<string, RawRental>();
  const categoryTotals = new Map<string, number>();
  const cuts = { failed: 0, filters: 0, repeated: 0, pages: 0, budget: 0, unpartitioned: 0, residual: 0, shortUnknown: 0, empty: 0 };
  let requests = 0;
  let pages = 0;
  let rejected = 0;
  let duplicates = 0;
  let reachable = false;
  const pets = new Set<string>();
  const particulars = new Set<string>();
  const phaseNotes: string[] = [];

  /** `deadline` is ms since `started`: each stage stops at its own share of the clock. */
  const canRead = (limit: number, deadline = timeLimit) => requests < limit && Date.now() - started < deadline;
  async function read(filters: MLFilters, offset: number, limit: number, deadline: number): Promise<SearchResult | null> {
    for (let attempt = 0; attempt < 2 && canRead(limit, deadline); attempt++) {
      requests++;
      const payload = await fetchJson<MLSearchEvidence & { components?: unknown }>(
        `${API_BASE}/search?${mlParams(filters, offset)}`,
        { timeoutMs: Math.max(1, Math.min(45_000, deadline - (Date.now() - started))), retries: 0 },
      );
      if (payload && typeof payload === "object") {
        pages++;
        return { ...payload, cards: collectPolycards(payload.components ?? payload) };
      }
    }
    cuts.failed++;
    return null;
  }

  function accept(cards: Polycard[], category: string): void {
    for (const card of cards) {
      const listing = card.metadata?.category_id === category ? toRawRental(card) : null;
      if (!listing) { rejected++; continue; }
      const priceUyu = listing.currency === "USD" ? listing.price * usdUyu : listing.price;
      // Search cards do not provide descriptions. The live 3–8k sample includes annual luxury
      // titles with suspicious UYU prices, so it does NOT justify lowering this source's floor.
      if (!isPlausibleRent(priceUyu, listing.propertyType)) { rejected++; continue; }
      if (byId.has(listing.listingId)) { duplicates++; continue; }
      byId.set(listing.listingId, listing);
    }
  }

  async function walk(initial: SearchTask[], limit: number, deadline: number, enrichment?: "pets" | "particular"): Promise<void> {
    const before = { requests, filters: cuts.filters, pages: cuts.pages, residual: cuts.residual };
    const queue = [...initial];
    const scheduled = new Set(queue.map(task => JSON.stringify(task.filters)));
    while (queue.length && canRead(limit, deadline)) {
      const task = queue.shift()!;
      const result = await read(task.filters, task.offset, limit, deadline);
      if (!result) continue;
      // The upstream can silently reset an offset or discard a category/invalid facet.
      // In either case the response is not evidence for this slice (including pets/owner).
      if (!mlPageMatches(result, task.filters, task.offset)) { cuts.filters++; continue; }
      reachable = true;
      const total = mlCount(result.paging?.total);
      if (task.offset === 0 && task.parentTotal !== undefined && (total === null || total >= task.parentTotal)) {
        cuts.filters++;
        continue;
      }
      if (!enrichment && task.depth === 0 && task.offset === 0 && total !== null) {
        categoryTotals.set(task.filters.category!, total);
      }
      if (total === 0) {
        if (result.cards.length) cuts.filters++;
        continue;
      }
      if (total !== null && result.cards.length > Math.max(0, total - task.offset)) {
        cuts.filters++;
        // Recommendations can remain in an empty/nearly exhausted search layout. Native rental
        // cards may still extend primary coverage, but cannot prove pets/private for this filter.
        if (enrichment) continue;
      }
      if (!result.cards.length) {
        if (total === null || total > task.offset) cuts.empty++;
        continue;
      }
      let fresh = 0;
      for (const card of result.cards) {
        const id = String(card.metadata?.id || "");
        if (id && !task.seen.has(id)) { task.seen.add(id); fresh++; }
      }
      // Count raw IDs, not accepted rentals: a page of rejected prices must not hide the next page.
      if (!fresh) { cuts.repeated++; continue; }
      if (!enrichment) accept(result.cards, task.filters.category!);
      else for (const card of result.cards) {
        if (card.metadata?.category_id !== task.filters.category) continue;
        const listing = toRawRental(card);
        const known = listing && byId.get(listing.listingId);
        if (!known) continue;
        if (enrichment === "pets") { known.petsAllowed = true; pets.add(known.listingId); }
        else if (known.sellerType !== "inmobiliaria") {
          known.sellerType = "particular";
          known.sellerName = "Particular";
          particulars.add(known.listingId);
        }
      }
      const leafLimit = Math.min(maxPages * PAGE_SIZE, ML_OFFSET_CEILING);
      if (full && !task.offset && !task.fallback && total !== null && total > leafLimit && task.depth < 6) {
        const children = mlPartitions(result, task.filters, leafLimit).filter(filters => !scheduled.has(JSON.stringify(filters)));
        if (children.length) {
          for (const filters of children) {
            scheduled.add(JSON.stringify(filters));
            queue.push({ filters, offset: 0, depth: task.depth + 1, seen: new Set(), parentTotal: total });
          }
          if (mlPartitionRemainder(result, task.filters, children) !== 0) {
            cuts.residual++;
            // Retain the parent's initial cards and sample up to ten further pages for adverts
            // omitted from facets. It shares the global budget and never displaces a whole slice.
            if (PAGE_SIZE < leafLimit) queue.push({ ...task, offset: PAGE_SIZE, fallback: true });
            else cuts.pages++;
          }
          continue;
        }
        cuts.unpartitioned++;
      }
      const next = task.offset + PAGE_SIZE;
      if (total !== null && next >= total) continue;
      if (total === null && result.cards.length < PAGE_SIZE) { cuts.shortUnknown++; continue; }
      if (next >= ML_OFFSET_CEILING || next >= (task.fallback ? Math.min(maxPages, 11) : maxPages) * PAGE_SIZE) { cuts.pages++; continue; }
      queue.push({ ...task, offset: next });
    }
    cuts.budget += queue.length;
    // Attribute pending work to its stage: a partial pets/private scan is not a hole in
    // the primary advert catalogue. Keep aggregate counters for existing diagnostics.
    phaseNotes.push(`${enrichment === "pets" ? "mascotas" : enrichment === "particular" ? "particulares" : "catálogo"}:` +
      `solicitudes=${requests - before.requests},filtro=${cuts.filters - before.filters},` +
      `tope=${cuts.pages - before.pages},pendientes=${queue.length},residual=${cuts.residual - before.residual}`);
  }

  const roots = ML_RENTAL_CATEGORIES.map(category => ({
    filters: { category: category.id, ...(full ? {} : { since: "today" }) } as MLFilters,
    offset: 0, depth: 0, seen: new Set<string>(),
  }));
  await walk(roots, primaryLimit, primaryTimeLimit);
  if (full && byId.size && canRead(requestLimit)) {
    // Both effective filter presence AND a reduced total are required. Never infer the opposite
    // side from absence, and a private seller flag alone does not declare ownerDirect.
    const enrichedRoots = (id: string, value: string) => roots.filter(root => categoryTotals.get(root.filters.category!)! > 0)
      .map(root => ({ ...root, filters: { ...root.filters, [id]: value }, seen: new Set<string>(),
        parentTotal: categoryTotals.get(root.filters.category!) }));
    const enrichmentEnd = Math.min(requestLimit, requests + reserve);
    const middle = Math.min(enrichmentEnd, requests + Math.ceil(reserve / 2));
    // The clock is split the way the requests are, so the owners pass cannot starve pets either.
    const elapsed = Date.now() - started;
    const middleTime = elapsed + Math.ceil((timeLimit - elapsed) / 2);
    await walk(enrichedRoots("seller_type", "private_seller"), middle, middleTime, "particular");
    await walk(enrichedRoots("IS_SUITABLE_FOR_PETS", "242085"), enrichmentEnd, timeLimit, "pets");
  }
  const totals = ML_RENTAL_CATEGORIES.map(category => `${category.name}:${categoryTotals.get(category.id) ?? "?"}`).join(",");
  const detail = `categorías[${totals}]; cortes[falla:${cuts.failed},filtro:${cuts.filters},repetida:${cuts.repeated},tope:${cuts.pages},presupuesto:${cuts.budget},sinPartición:${cuts.unpartitioned},residual:${cuts.residual},totalDesconocido:${cuts.shortUnknown},vacía:${cuts.empty}]; etapas[${phaseNotes.join(";")}]`;
  console.log(`[rentals] ML ${mode}: ${pages} páginas/${requests} solicitudes, ${byId.size} IDs, ${duplicates} repetidos, ${detail}`);
  return {
    key: "mercadolibre", complete: false,
    ok: reachable && byId.size > 0,
    listings: [...byId.values()],
    note: `${pages} páginas, ${byId.size} avisos, ${rejected} descartados, ${pets.size} admiten mascotas, ${particulars.size} de particular; cobertura parcial; ${detail}`,
  };
}
