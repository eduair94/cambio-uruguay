// Mercado Libre Uruguay, category MLU1744 "Autos y Camionetas", read through the scraper bridge on
// the 104 box (pm2 `mercadolibre`, :9656) — the bridge rentals and chairs already use. The RAW
// search payload carries polycards with "2017 | 111111 km", transmission, fuel, location and seller
// type. Two facts measured on 2026-09-16 shape this file:
//   * an offset >= 4000 silently answers page 0, so every page is checked against paging.offset;
//   * no model has more than 4000 used adverts, so brand -> model partitions cover the category and
//     brand/model come from the APPLIED filter, never from guessing the title.
import { fetchJson } from "../../rentals/net";
import { collectPolycards } from "../../rentals/sources/mercadolibre";
import { fold, fuelOf, parseCarLocation, parsePrimaryAttribute, transmissionOf } from "../normalize";
import type { CarHarvestGap, CarHarvestResult, RawCarListing } from "../types";

export const ML_CARS_CATEGORY = "MLU1744";
export const ML_USED_CONDITION = "2230581";
export const ML_PAGE_SIZE = 20;
export const ML_OFFSET_CEILING = 4_000;
const PARTITION_KEYS = ["ITEM_CONDITION", "BRAND", "MODEL", "VEHICLE_YEAR"];

export interface MLFacetValue { id?: unknown; name?: unknown; results?: unknown }
export interface MLFacet { id?: unknown; values?: MLFacetValue[] }
export interface MLCarPage {
  paging?: { total?: unknown; offset?: unknown };
  filters?: MLFacet[];
  available_filters?: MLFacet[];
  components?: unknown;
}
export interface MLCarCard {
  metadata?: { id?: string; category_id?: string; url_params?: string; is_pad?: string };
  pictures?: { quantity?: unknown };
  components?: Array<{
    type?: string;
    title?: { text?: string };
    price?: { current_price?: { value?: number; currency?: string } };
    labels?: { labels?: Array<{ text?: string }> };
    location?: { text?: string };
  }>;
}

export function mlCarsApiBase(): string {
  return (process.env.AUTOS_ML_API || "http://104.234.204.107:9656/mercadolibre").replace(/\/+$/, "");
}

export function carSearchUrl(filters: Readonly<Record<string, string>>, offset: number, apiBase = mlCarsApiBase()): string {
  const params = new URLSearchParams({
    country: "UY", q: "autos", category: ML_CARS_CATEGORY, "q.category": ML_CARS_CATEGORY,
    ITEM_CONDITION: ML_USED_CONDITION, raw: "true", limit: String(ML_PAGE_SIZE),
    ...filters, offset: String(offset),
  });
  return `${apiBase}/search?${params}`;
}

function count(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

export function facetValues(page: MLCarPage, id: string): Array<{ id: string; name: string; results: number }> {
  const facet = (page.available_filters || []).find(filter => filter?.id === id);
  const values: Array<{ id: string; name: string; results: number }> = [];
  for (const value of facet?.values || []) {
    const valueId = typeof value?.id === "string" ? value.id : "";
    const name = typeof value?.name === "string" ? value.name.trim() : "";
    const results = count(value?.results);
    if (valueId && name && results) values.push({ id: valueId, name, results });
  }
  return values;
}

/** Only APPLIED partition filters and the exact offset prove the page is the one we asked for. */
export function pageMatches(page: MLCarPage, filters: Readonly<Record<string, string>>, offset: number): boolean {
  if (count(page.paging?.offset) !== offset) return false;
  const expected: Record<string, string> = { ITEM_CONDITION: ML_USED_CONDITION, ...filters };
  return Object.entries(expected)
    .filter(([id]) => PARTITION_KEYS.includes(id))
    .every(([id, value]) => (page.filters || []).some(filter =>
      filter?.id === id && (filter.values || []).some(item => item?.id === value)));
}

export interface CardContext {
  brandId: string;
  brand: string;
  modelId: string;
  model: string;
  observedAt: string;
  maxYear: number;
}

export function toRawCar(card: MLCarCard, context: CardContext): RawCarListing | null {
  const id = String(card.metadata?.id || "");
  if (!/^MLU\d{6,14}$/.test(id) || card.metadata?.category_id !== ML_CARS_CATEGORY || card.metadata?.is_pad === "true") return null;
  const query = String(card.metadata?.url_params || "");
  if (!query) return null;
  const params = new URLSearchParams(query.replace(/^\?/, ""));
  const condition = params.get("condition");
  if (condition && fold(condition) !== "usado") return null;
  const part = (type: string) => card.components?.find(component => component.type === type);
  const title = String(params.get("title") || part("title")?.title?.text || "").replace(/\s+/g, " ").trim();
  const price = Number(part("price")?.price?.current_price?.value ?? params.get("price"));
  const currency = String(part("price")?.price?.current_price?.currency || params.get("currency_id") || "").toUpperCase();
  const permalink = String(params.get("permalink") || "");
  const primary = parsePrimaryAttribute(params.get("primary_attribute") || "", context.maxYear);
  if (!title || !(price > 0) || (currency !== "USD" && currency !== "UYU") || primary.year === null) return null;
  if (!permalink.startsWith("https://auto.mercadolibre.com.uy/MLU-")) return null;
  const labels = (part("labels")?.labels?.labels || [])
    .map(label => String(label?.text || "").replace(/\{[^}]*\}/g, "").trim())
    .filter(Boolean);
  const kmLabel = labels.find(label => /\bkm\b/i.test(label));
  const labelKm = kmLabel ? Number(kmLabel.replace(/[^\d]/g, "")) : NaN;
  const location = parseCarLocation(part("location")?.location?.text || params.get("location") || "");
  const sellerId = params.get("seller_id") || "";
  const picture = (params.get("picture") || params.get("thumbnail") || "").replace(/^http:\/\//, "https://");
  let transmission: RawCarListing["transmission"] = null;
  let fuel: RawCarListing["fuel"] = null;
  for (const label of labels) {
    transmission = transmission ?? transmissionOf(label);
    fuel = fuel ?? fuelOf(label);
  }
  return {
    id,
    source: "mercadolibre",
    brandId: context.brandId,
    brand: context.brand,
    modelId: context.modelId,
    model: context.model,
    title: title.slice(0, 200),
    year: primary.year,
    km: primary.km ?? (Number.isFinite(labelKm) ? labelKm : null),
    price,
    currency,
    transmission,
    fuel,
    neighborhood: location.neighborhood,
    department: location.department,
    sellerType: location.sellerType,
    sellerId: /^\d{1,15}$/.test(sellerId) ? sellerId : null,
    picture: /^https:\/\/http2\.mlstatic\.com\//.test(picture) ? picture : null,
    pictureCount: count(card.pictures?.quantity),
    permalink,
    observedAt: context.observedAt,
  };
}

type Task = () => Promise<Task[]>;

/**
 * A dynamic work queue: a task may enqueue more tasks; `concurrency` bridge calls at a time.
 * A task that throws (network is caught inside `read()`; this is for bugs downstream of a
 * successful read — `accept`/`facetValues`/gap bookkeeping) is reported via `onError` and the
 * rest of the queue keeps draining. Silently swallowing it would let a brand look "complete"
 * (`completeBrands`) despite having lost data mid-walk, and `completeBrands` gates whether an
 * unseen advert is later treated as retired.
 */
export async function drainTasks(initial: Task[], concurrency: number, onError?: (error: unknown) => void): Promise<void> {
  const queue = [...initial];
  let active = 0;
  await new Promise<void>(resolve => {
    const pump = (): void => {
      if (!queue.length && active === 0) {
        resolve();
        return;
      }
      while (active < concurrency && queue.length) {
        const task = queue.shift()!;
        active++;
        task()
          .then(more => { queue.push(...more); }, error => { onError?.(error); })
          .finally(() => { active--; pump(); });
      }
    };
    pump();
  });
}

export interface CarHarvestOptions {
  mode: "full" | "fast";
  maxRequests: number;
  maxDurationMs: number;
  concurrency: number;
  apiBase?: string;
  now?: () => Date;
  onProgress?: (message: string) => void;
}

interface Named { id: string; name: string }

export async function harvestMercadoLibreCars(options: CarHarvestOptions): Promise<CarHarvestResult> {
  const clock = options.now ?? (() => new Date());
  const startedAt = clock().toISOString();
  const started = Date.now();
  const maxYear = new Date(startedAt).getUTCFullYear() + 1;
  const base: Record<string, string> = options.mode === "fast" ? { since: "today" } : {};
  const listings = new Map<string, RawCarListing>();
  const vocabularies = new Map<string, Set<string>>();
  const failedBrands = new Set<string>();
  const gaps: CarHarvestGap[] = [];
  let requests = 0;
  let pages = 0;
  let failedPages = 0;
  let rejectedCards = 0;
  let budgetCut = false;
  let taskErrors = 0;

  async function read(filters: Record<string, string>, offset: number): Promise<MLCarPage | null> {
    if (requests >= options.maxRequests || Date.now() - started >= options.maxDurationMs) {
      budgetCut = true;
      return null;
    }
    requests++;
    const page = await fetchJson<MLCarPage>(carSearchUrl({ ...base, ...filters }, offset, options.apiBase), {
      timeoutMs: 45_000, retries: 1, unthrottled: true,
    });
    if (!page || typeof page !== "object" || !pageMatches(page, filters, offset)) {
      failedPages++;
      return null;
    }
    pages++;
    return page;
  }

  function accept(page: MLCarPage, brand: Named, model: Named): void {
    const observedAt = clock().toISOString();
    const cards = collectPolycards(page.components ?? page) as unknown as MLCarCard[];
    for (const card of cards) {
      const raw = toRawCar(card, { brandId: brand.id, brand: brand.name, modelId: model.id, model: model.name, observedAt, maxYear });
      if (!raw) {
        rejectedCards++;
        continue;
      }
      if (!listings.has(raw.id)) listings.set(raw.id, raw);
    }
  }

  const modelTask = (brand: Named, model: Named, extra: Record<string, string> = {}): Task => async () => {
    const filters = { BRAND: brand.id, MODEL: model.id, ...extra };
    const first = await read(filters, 0);
    if (!first) {
      failedBrands.add(brand.id);
      return [];
    }
    accept(first, brand, model);
    const vocabularyKey = `${brand.id}|${model.id}`;
    const trims = vocabularies.get(vocabularyKey) ?? new Set<string>();
    for (const value of facetValues(first, "SHORT_VERSION")) trims.add(value.name);
    vocabularies.set(vocabularyKey, trims);
    const total = count(first.paging?.total) ?? 0;
    if (total > ML_OFFSET_CEILING && !extra.VEHICLE_YEAR) {
      const years = facetValues(first, "VEHICLE_YEAR");
      const covered = years.reduce((sum, year) => sum + year.results, 0);
      if (covered < total) gaps.push({ brandId: brand.id, brand: `${brand.name} ${model.name} (sin año)`, missing: total - covered });
      return years.map(year => modelTask(brand, model, { VEHICLE_YEAR: year.id }));
    }
    if (total > ML_OFFSET_CEILING) gaps.push({ brandId: brand.id, brand: `${brand.name} ${model.name}`, missing: total - ML_OFFSET_CEILING });
    const tasks: Task[] = [];
    for (let offset = ML_PAGE_SIZE; offset < Math.min(total, ML_OFFSET_CEILING); offset += ML_PAGE_SIZE) {
      tasks.push(async () => {
        const next = await read(filters, offset);
        if (next) accept(next, brand, model);
        else failedBrands.add(brand.id);
        return [];
      });
    }
    return tasks;
  };

  const brandTask = (brand: Named): Task => async () => {
    const first = await read({ BRAND: brand.id }, 0);
    if (!first) {
      failedBrands.add(brand.id);
      return [];
    }
    const models = facetValues(first, "MODEL");
    const total = count(first.paging?.total) ?? 0;
    const covered = models.reduce((sum, model) => sum + model.results, 0);
    if (covered < total) gaps.push({ brandId: brand.id, brand: brand.name, missing: total - covered });
    options.onProgress?.(`[autos] ${brand.name}: ${models.length} modelos, ${total} avisos`);
    return models.map(model => modelTask(brand, model));
  };

  const root = await read({}, 0);
  const brands = root ? facetValues(root, "BRAND") : [];
  const reportedTotal = root ? count(root.paging?.total) : null;
  if (root && reportedTotal !== null) {
    const covered = brands.reduce((sum, brand) => sum + brand.results, 0);
    if (covered < reportedTotal) gaps.push({ brandId: "*", brand: "(sin marca)", missing: reportedTotal - covered });
  }
  if (brands.length) {
    await drainTasks(brands.map(brandTask), Math.max(1, options.concurrency), () => { taskErrors++; });
  }

  const note = !root
    ? "el puente de Mercado Libre no respondió"
    : budgetCut
      ? "presupuesto de pedidos o de tiempo agotado: cosecha parcial"
      : taskErrors > 0
        ? `${taskErrors} tareas fallaron por un error inesperado: cosecha parcial`
        : failedPages
          ? `${failedPages} páginas sin respuesta válida`
          : null;
  return {
    mode: options.mode,
    startedAt,
    finishedAt: clock().toISOString(),
    listings: [...listings.values()].sort((a, b) => a.id.localeCompare(b.id)),
    vocabularies: [...vocabularies]
      .map(([key, trims]) => {
        const [brandId = "", modelId = ""] = key.split("|");
        return { brandId, modelId, trims: [...trims].sort() };
      })
      .sort((a, b) => `${a.brandId}|${a.modelId}`.localeCompare(`${b.brandId}|${b.modelId}`)),
    requests,
    pages,
    failedPages,
    rejectedCards,
    // A task error means we cannot tell which brand lost data mid-walk, so none of them count as complete.
    completeBrands: taskErrors > 0 ? [] : brands.map(brand => brand.id).filter(id => !failedBrands.has(id)).sort(),
    gaps,
    reportedTotal,
    note,
  };
}
