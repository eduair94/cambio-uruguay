// El relevamiento de repuestos (sync_autos_parts.ts): seis búsquedas por modelo en Mercado Libre
// Uruguay a través del puente del 104 (`:9656`), el mismo que usan autos, sillas y alquileres.
//
// El puente castiga a TODOS sus consumidores diez minutos ante un 429 (docs/app/AUTOS.md), así que
// este job pide de a uno, con pausa, con tope de reloj, y se corta a los tres pedidos sin respuesta
// en vez de insistir. Un modelo se guarda sólo si sus seis búsquedas contestaron: un modelo a medias
// parecería no tener repuestos cuando lo que no tuvo fue respuesta.
import { fetchJson } from "../rentals/net";
import {
  CAR_PARTS, PART_INDEX_MIN_PARTS, partTitleMatches, partsModelTokens, summarizePart, type CarPart, type CarPartsRecord,
} from "./repuestos";
import { mlCarsApiBase } from "./sources/mercadolibre";
import { fold } from "./normalize";

export interface CarPartsTarget {
  marketSlug: string;
  brand: string;
  model: string;
  adverts: number;
  /** Los otros modelos de la misma marca: un título que nombra uno más largo no es de este. */
  siblings?: string[];
}

export interface MlPartResult {
  id?: string;
  title?: string;
  condition?: string;
  price?: { amount?: number; currency?: string };
  seller?: { id?: number; name?: string };
}

export interface MlPartsPage {
  paging?: { total?: number };
  filters?: Array<{ id?: string; values?: Array<{ id?: string }> }>;
  results?: MlPartResult[];
}

export type PartsPageFetcher = (url: string) => Promise<MlPartsPage | null>;

/** Un modelo leído hace menos que esto no se relee: el precio de un repuesto no se mueve en días. */
export const PARTS_MAX_AGE_DAYS = 14;
const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Una página vale como lectura sólo si trae su lista de resultados y, si trae algo, la categoría que
 * se pidió aplicada. Una respuesta degradada del puente leída como "cero ofertas" dejaría al modelo
 * sin repuestos dos semanas; una sin categoría cotizaría un filtro de aire como filtro de aceite.
 */
function pageIsReading(page: MlPartsPage | null, category: string): page is MlPartsPage {
  if (!page || !Array.isArray(page.results)) return false;
  if (!page.results.length) return true;
  const applied = (page.filters ?? []).find(filter => filter.id === "category")?.values?.map(value => value.id) ?? [];
  return applied.includes(category);
}

/** Una lectura flaca no pisa una buena: si antes había índice y ahora no, se conserva lo anterior. */
export function shouldReplacePartsRecord(previous: CarPartsRecord | undefined, next: CarPartsRecord): boolean {
  return !previous || previous.parts.length < PART_INDEX_MIN_PARTS || next.parts.length >= PART_INDEX_MIN_PARTS;
}

const searchWords = (text: string): string => text.replace(/[^\p{L}\p{N}.]+/gu, " ").trim();

export function partsSearchUrl(part: CarPart, brand: string, model: string, apiBase = mlCarsApiBase()): string {
  const params = new URLSearchParams({
    country: "UY",
    limit: "50",
    q: `${part.query} ${searchWords(brand)} ${searchWords(model)}`.replace(/\s+/g, " ").trim(),
    category: part.category,
  });
  return `${apiBase}/search?${params}`;
}

export function planPartsTargets(
  models: readonly CarPartsTarget[],
  previous: ReadonlyMap<string, CarPartsRecord>,
  now: Date,
  maxAgeDays = PARTS_MAX_AGE_DAYS,
): CarPartsTarget[] {
  const cutoff = now.getTime() - maxAgeDays * 86_400_000;
  const readAt = (slug: string): number => {
    const time = Date.parse(previous.get(slug)?.readAt ?? "");
    return Number.isFinite(time) ? time : -Infinity;
  };
  return models
    .filter(model => readAt(model.marketSlug) < cutoff)
    .sort((a, b) => readAt(a.marketSlug) - readAt(b.marketSlug) || b.adverts - a.adverts);
}

const isUsed = (condition: string | undefined): boolean => /usad|used/.test(fold(condition ?? ""));

function recordFrom(target: CarPartsTarget, pages: ReadonlyMap<CarPart["key"], MlPartsPage>, usdUyu: number, readAt: string): CarPartsRecord {
  const tokens = partsModelTokens(target.brand, target.model, target.siblings ?? []);
  const parts: CarPartsRecord["parts"] = [];
  for (const part of CAR_PARTS) {
    const seen = new Set<string>();
    const prices: number[] = [];
    const sellers: string[] = [];
    for (const result of pages.get(part.key)?.results ?? []) {
      const id = String(result.id ?? "");
      const amount = Number(result.price?.amount);
      const currency = String(result.price?.currency ?? "").toUpperCase();
      if (!id || seen.has(id) || !(amount > 0) || isUsed(result.condition)) continue;
      if (currency !== "UYU" && currency !== "USD") continue;
      if (!partTitleMatches(String(result.title ?? ""), tokens, part)) continue;
      seen.add(id);
      prices.push(currency === "USD" ? amount * usdUyu : amount);
      // Sin vendedor identificado, todas cuentan como uno: si no, el mínimo de dos vendedores no mide nada.
      sellers.push(String(result.seller?.id ?? result.seller?.name ?? "?"));
    }
    const summary = summarizePart(prices, sellers);
    if (summary) parts.push({ key: part.key, ...summary });
  }
  return { marketSlug: target.marketSlug, brand: target.brand, model: target.model, readAt, parts };
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function harvestParts(
  targets: readonly CarPartsTarget[],
  options: { usdUyu: number; gapMs: number; maxDurationMs: number; now: Date; fetchPage?: PartsPageFetcher; apiBase?: string },
): Promise<{ records: CarPartsRecord[]; requests: number; note: string | null }> {
  const fetchPage: PartsPageFetcher = options.fetchPage
    ?? (url => fetchJson<MlPartsPage>(url, { timeoutMs: 45_000, retries: 0, unthrottled: true }));
  const started = Date.now();
  const records: CarPartsRecord[] = [];
  let requests = 0;
  let failures = 0;
  for (const target of targets) {
    if (Date.now() - started >= options.maxDurationMs) return { records, requests, note: "presupuesto agotado" };
    const pages = new Map<CarPart["key"], MlPartsPage>();
    for (const part of CAR_PARTS) {
      // El reloj se mira en cada pedido: un modelo con el puente colgado puede tardar minutos.
      if (Date.now() - started >= options.maxDurationMs) return { records, requests, note: "presupuesto agotado" };
      if (requests > 0 && options.gapMs > 0) await sleep(options.gapMs);
      const page = await fetchPage(partsSearchUrl(part, target.brand, target.model, options.apiBase));
      requests++;
      if (!pageIsReading(page, part.category)) {
        if (++failures >= MAX_CONSECUTIVE_FAILURES) return { records, requests, note: "puente sin respuesta" };
        continue;
      }
      failures = 0;
      pages.set(part.key, page);
    }
    if (pages.size === CAR_PARTS.length) records.push(recordFrom(target, pages, options.usdUyu, options.now.toISOString()));
  }
  return { records, requests, note: null };
}
