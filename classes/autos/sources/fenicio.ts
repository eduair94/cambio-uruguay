// Usados Fidocar, a Fenicio storefront: the published sitemap lists every car page
// (/modelo/<slug>_<id>_<id>) and each page carries schema.org microdata (price, currency,
// availability, brand, name) plus a spec table (Año, Kilometros, Transmisión). The page's own
// description quotes the dealer's phone numbers, so it is never read.
import { fold, fuelOf, transmissionOf } from "../normalize";
import type { CarSourceResult } from "../types";
import { addCar, autosFetchText, buildWebCar, decodeEntities, htmlText, sourceResult, type WebCarContext } from "./common";
import { CAR_SOURCES } from "./registry";

export const FIDOCAR_BASE = "https://www.usadosfidocar.com.uy";
const MODEL_PAGE = /^https:\/\/www\.usadosfidocar\.com\.uy\/modelo\/[\w-]+_(\d+)_\d+$/;

export function fidocarUrls(sitemapXml: string): string[] {
  const urls = new Set<string>();
  const pattern = /<loc>\s*([^<\s]+)\s*<\/loc>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sitemapXml))) {
    const url = decodeEntities(match[1]!);
    if (MODEL_PAGE.test(url)) urls.add(url);
  }
  return [...urls];
}

const first = (html: string, pattern: RegExp): string | null => {
  const match = pattern.exec(html);
  return match ? decodeEntities(match[1]!).trim() : null;
};

export function fidocarPdpToCar(html: string, url: string, context: WebCarContext): ReturnType<typeof buildWebCar> {
  const id = MODEL_PAGE.exec(url)?.[1];
  if (!id) return null;
  if (first(html, /itemprop="availability"\s+href="[^"]*\/(\w+)"/) !== "InStock") return null;
  const price = Number(first(html, /<meta itemprop="price" content="(\d+(?:\.\d+)?)"/));
  const currency = first(html, /itemprop="priceCurrency" content="(\w+)"/);
  if (currency !== "USD" && currency !== "UYU") return null;
  const name = htmlText(first(html, /itemprop="name">([^<]+)</) ?? first(html, /<h1 class="tit">([^<]+)</) ?? "");
  const specs = new Map<string, string>();
  const row = /<h5>([^<]+)<\/h5>\s*<p>([^<]*)<\/p>/g;
  let match: RegExpExecArray | null;
  while ((match = row.exec(html))) {
    const label = fold(decodeEntities(match[1]!)).trim();
    if (!specs.has(label)) specs.set(label, decodeEntities(match[2]!).trim());
  }
  const year = Number(specs.get("ano"));
  const kmDigits = (specs.get("kilometros") ?? "").replace(/[^\d]/g, "");
  return buildWebCar({
    source: "fidocar",
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
    year: Number.isInteger(year) && year > 1900 ? year : null,
    km: kmDigits ? Number(kmDigits) : null,
    transmission: transmissionOf(specs.get("transmision") ?? ""),
    fuel: fuelOf(specs.get("combustible") ?? name),
    sellerType: "dealer",
    sellerId: "fidocar",
    dealerName: CAR_SOURCES.fidocar.dealerName,
    department: null,
    description: "",
    context,
  });
}

export async function harvestFidocar(
  context: WebCarContext,
  options: { fetchPage?: (url: string) => Promise<string | null>; maxPdp?: number } = {},
): Promise<CarSourceResult> {
  const result = sourceResult("fidocar", new Date().toISOString());
  const fetchPage = options.fetchPage ?? (async (url: string) => (await autosFetchText(url)).body);
  const maxPdp = options.maxPdp ?? 300;
  const sitemap = await fetchPage(`${FIDOCAR_BASE}/sitemap/catalogo-articulos.xml`);
  result.requests++;
  const urls = sitemap ? fidocarUrls(sitemap) : [];
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
    addCar(result, fidocarPdpToCar(html, url, context));
  }
  if (failed) result.note = `${failed} fichas sin respuesta`;
  else if (urls.length > maxPdp) result.note = "tope de fichas alcanzado";
  result.complete = !failed && urls.length <= maxPdp;
  result.finishedAt = new Date().toISOString();
  return result;
}
