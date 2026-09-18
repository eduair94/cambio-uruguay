// Fenicio storefronts (Usados Fidocar, Motorlider): the published sitemap lists every car page
// (<base>/<path>/<slug>_<id>_<id>) and each page carries schema.org microdata (price, currency,
// availability, brand, name) plus a spec sheet. The page's own description quotes the dealer's
// phone numbers, so it is never read.
//
// The microdata price is NOT always the car's: Motorlider sells the booking deposit as the product
// (USD 500 for a USD 13.990 car), and only its spec sheet ("precio-ficha") states the car's price.
import { fold, fuelOf, transmissionOf } from "../normalize";
import type { CarCurrency, CarSource, CarSourceResult } from "../types";
import { addCar, autosFetchText, buildWebCar, decodeEntities, htmlText, sourceResult, type WebCarContext } from "./common";
import { CAR_SOURCES } from "./registry";

export interface FenicioStore {
  source: CarSource;
  base: string;
  /** The path segment its product pages live under. */
  path: string;
  sellerId: string;
}

export const FENICIO_STORES: readonly FenicioStore[] = [
  { source: "fidocar", base: "https://www.usadosfidocar.com.uy", path: "modelo", sellerId: "fidocar" },
  { source: "motorlider", base: "https://motorlider.com.uy", path: "catalogo", sellerId: "motorlider" },
];

export const fenicioStore = (source: CarSource): FenicioStore => FENICIO_STORES.find(store => store.source === source)!;

/** A deposit is not a used car: a dealer's cheapest real stock is still worth more than this. */
const PRICE_FLOOR: Readonly<Record<CarCurrency, number>> = { USD: 1_000, UYU: 40_000 };

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const fenicioPagePattern = (store: FenicioStore): RegExp =>
  new RegExp(`^${escape(store.base)}/${escape(store.path)}/[\\w-]+_(\\d+)_\\d+$`);

export function fenicioUrls(sitemapXml: string, store: FenicioStore): string[] {
  const pattern = fenicioPagePattern(store);
  const urls = new Set<string>();
  const loc = /<loc>\s*([^<\s]+)\s*<\/loc>/g;
  let match: RegExpExecArray | null;
  while ((match = loc.exec(sitemapXml))) {
    const url = decodeEntities(match[1]!);
    if (pattern.test(url)) urls.add(url);
  }
  return [...urls];
}

const first = (html: string, pattern: RegExp): string | null => {
  const match = pattern.exec(html);
  return match ? decodeEntities(match[1]!).trim() : null;
};

/** Both spec-sheet themes at once: Fidocar's `<h5>/<p>` rows and Motorlider's `data-codigo` blocks. */
export function fenicioSpecs(html: string): Map<string, string> {
  const specs = new Map<string, string>();
  const add = (label: string, value: string) => {
    const key = fold(decodeEntities(label)).trim();
    if (key && !specs.has(key)) specs.set(key, decodeEntities(value).trim());
  };
  const rows = /<h5>([^<]+)<\/h5>\s*<p>([^<]*)<\/p>/g;
  let match: RegExpExecArray | null;
  while ((match = rows.exec(html))) add(match[1]!, match[2]!);
  const coded = /data-codigo="([\w-]+)">\s*<span class="tit">[^<]*<\/span>\s*<span class="val">([^<]*)<\/span>/g;
  while ((match = coded.exec(html))) add(match[1]!, match[2]!);
  return specs;
}

const specNumber = (specs: Map<string, string>, ...keys: string[]): number | null => {
  for (const key of keys) {
    const digits = (specs.get(key) ?? "").replace(/[^\d]/g, "");
    if (digits) return Number(digits);
  }
  return null;
};

export function fenicioPdpToCar(html: string, url: string, store: FenicioStore, context: WebCarContext): ReturnType<typeof buildWebCar> {
  const id = fenicioPagePattern(store).exec(url)?.[1];
  if (!id) return null;
  if (first(html, /itemprop="availability"\s+href="[^"]*\/(\w+)"/) !== "InStock") return null;
  const specs = fenicioSpecs(html);
  const listed = first(html, /<del class="precio lista">\s*<span class="sim">([^<]+)<\/span>/);
  const fichaPrice = specNumber(specs, "precio-ficha");
  const price = fichaPrice ?? Number(first(html, /<meta itemprop="price" content="(\d+(?:\.\d+)?)"/));
  const currency = fichaPrice && listed ? (fold(listed).includes("$u") || fold(listed) === "$" ? "UYU" : "USD") : first(html, /itemprop="priceCurrency" content="(\w+)"/);
  if (currency !== "USD" && currency !== "UYU") return null;
  if (!(price > 0) || price < PRICE_FLOOR[currency]) return null;
  const name = htmlText(first(html, /itemprop="name">([^<]+)</) ?? first(html, /<h1 class="tit">([^<]+)</) ?? "");
  const year = specNumber(specs, "ano");
  return buildWebCar({
    source: store.source,
    id,
    title: name,
    // "3,5 Limited": Fenicio names write the engine with a decimal comma.
    specText: name.replace(/(\d),(\d)/g, "$1.$2"),
    permalink: url,
    picture: first(html, /<meta property="og:image" content="([^"]+)"/),
    price,
    currency,
    brand: first(html, /itemprop="brand">([^<]+)</),
    model: null,
    year: year && year > 1900 ? year : null,
    km: specNumber(specs, "kilometros", "kilometraje-ficha", "kilometraje"),
    transmission: transmissionOf(specs.get("transmision") ?? ""),
    fuel: fuelOf(specs.get("combustible") ?? name),
    sellerType: "dealer",
    sellerId: store.sellerId,
    dealerName: CAR_SOURCES[store.source].dealerName,
    department: null,
    description: "",
    context,
  });
}

export async function harvestFenicio(
  store: FenicioStore,
  context: WebCarContext,
  options: { fetchPage?: (url: string) => Promise<string | null>; maxPdp?: number } = {},
): Promise<CarSourceResult> {
  const result = sourceResult(store.source, new Date().toISOString());
  const fetchPage = options.fetchPage ?? (async (url: string) => (await autosFetchText(url, 30_000, store.source)).body);
  const maxPdp = options.maxPdp ?? 300;
  const sitemap = await fetchPage(`${store.base}/sitemap/catalogo-articulos.xml`);
  result.requests++;
  const urls = sitemap ? fenicioUrls(sitemap, store) : [];
  if (!urls.length) {
    result.ok = false;
    result.complete = false;
    result.note = "sitemap vacío o sin respuesta";
    result.finishedAt = new Date().toISOString();
    return result;
  }
  let failed = 0;
  for (const url of urls.slice(0, maxPdp)) {
    const html = await fetchPage(url);
    result.requests++;
    if (!html) {
      failed++;
      continue;
    }
    addCar(result, fenicioPdpToCar(html, url, store, context));
  }
  if (failed) result.note = `${failed} fichas sin respuesta`;
  else if (urls.length > maxPdp) result.note = "tope de fichas alcanzado";
  result.complete = !failed && urls.length <= maxPdp;
  result.finishedAt = new Date().toISOString();
  return result;
}
