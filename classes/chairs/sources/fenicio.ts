// Fenicio storefronts (the Uruguayan ecommerce SaaS behind Bertoni, Divino, Electroventas,
// La Cueva, Clemur…). Two published contracts do all the work:
//   /sitemap                        -> index, one entry per section
//   /sitemap/catalogo-articulos.xml -> every product URL in the catalogue
// and each PDP carries schema.org microdata with price, currency, stock and condition.
//
// So we never crawl category pages (they are client-rendered) and never parse markup.
import { fetchText, mapLimit, readSitemap } from "../net";
import { isDeskChair } from "../normalize";
import type { ChairListing } from "../types";
import type { ChairStore } from "./registry";
import { parseStructuredProduct } from "./structured";
import type { ChairSourceResult } from "./mercadolibre";

/** URLs worth opening: the slug has to mention a chair. Keeps PDP fetches in the dozens. */
const CHAIR_URL = /(silla|sillon|butaca)/i;
const MAX_PDP = Number(process.env.CHAIR_STORE_MAX_PDP || 260);
const PDP_CONCURRENCY = 3;

async function productUrls(store: ChairStore): Promise<string[]> {
  const direct = await readSitemap(`${store.baseUrl}/sitemap/catalogo-articulos.xml`);
  if (direct.length) return direct;
  // Fall back to the index (some stores split the catalogue across several files).
  const index = await readSitemap(`${store.baseUrl}/sitemap`);
  return index.filter((url) => /catalogo|articulo|producto/i.test(url));
}

export async function harvestFenicioStore(store: ChairStore): Promise<ChairSourceResult> {
  const observedAt = new Date().toISOString();
  const urls = await productUrls(store);
  if (!urls.length) {
    return { listings: [], ok: false, note: "sitemap vacío o inaccesible" };
  }

  const candidates = urls.filter((url) => CHAIR_URL.test(url)).slice(0, MAX_PDP);
  const parsed = await mapLimit(candidates, PDP_CONCURRENCY, async (url) => {
    const html = await fetchText(url, { retries: 1 });
    if (!html) return null;
    const product = parseStructuredProduct(html);
    if (!product) return null;

    const title = product.name;
    // A furniture catalogue names a task chair "Silla LZ" and a dining chair "Silla Nórdica" —
    // only the description and the URL tell them apart.
    if (!isDeskChair(title, `${product.description} ${decodeURIComponent(url)}`)) return null;
    const currency = product.currency === "USD" ? "USD" : product.currency === "UYU" ? "UYU" : null;
    if (!currency) return null;

    const listing: ChairListing = {
      listingId: `store:${store.key}:${product.sku || url.split("/").pop() || title}`,
      source: "store",
      sellerKey: store.key,
      sellerName: store.name,
      channel: store.channel,
      title,
      url,
      price: product.price!,
      currency,
      condition: product.condition === "unknown" ? "new" : product.condition,
      available: product.available !== false,
      image: product.image,
      brand: product.brand,
      model: "",
      catalogId: null,
      attributes: product.description ? { DESCRIPTION: product.description } : {},
      rating: null,
      ratingCount: 0,
      location: null,
      freeShipping: null,
      officialStore: true,
      observedAt,
    };
    return listing;
  });

  const listings = parsed.filter((listing): listing is ChairListing => Boolean(listing));
  const mismatched =
    store.expectCurrency && listings.length
      ? listings.filter((listing) => listing.currency !== store.expectCurrency).length
      : 0;

  return {
    listings,
    ok: true,
    note: `${urls.length} productos en sitemap, ${candidates.length} candidatos, ${listings.length} sillas${
      mismatched ? `, ${mismatched} en moneda distinta a la esperada` : ""
    }`,
  };
}
