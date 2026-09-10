// Fenicio storefronts (the Uruguayan ecommerce SaaS behind Bertoni, Divino, Electroventas,
// La Cueva, Clemur…). Two published contracts do all the work:
//   /sitemap                        -> index, one entry per section
//   /sitemap/catalogo-articulos.xml -> every product URL in the catalogue
// and each PDP carries schema.org microdata with price, currency, stock and condition.
//
// So we never crawl category pages (they are client-rendered) and never parse markup.
import { fetchText, mapLimit, readSitemap } from "../net";
import type { CategorySpec, RetailListing, RetailSourceResult, RetailStore } from "../types";
import { parseStructuredProduct } from "./structured";

const MAX_PDP = Number(process.env.RETAIL_STORE_MAX_PDP || process.env.CHAIR_STORE_MAX_PDP || 260);
const PDP_CONCURRENCY = 3;

async function productUrls(store: RetailStore): Promise<string[]> {
  const direct = await readSitemap(`${store.baseUrl}/sitemap/catalogo-articulos.xml`);
  if (direct.length) return direct;
  // Fall back to the index (some stores split the catalogue across several files).
  const index = await readSitemap(`${store.baseUrl}/sitemap`);
  return index.filter((url) => /catalogo|articulo|producto/i.test(url));
}

/**
 * One sweep of a storefront, classified against one or more categories.
 *
 * Passing several specs is the whole reason this takes an array: a sitemap of 40k URLs costs the
 * same to read once whether we are looking for chairs or for thirty-eight household categories, and
 * fetching a PDP twice for two callers would be the expensive mistake. The first spec whose
 * `accept` says yes claims the listing.
 */
export async function harvestFenicioStore(
  store: RetailStore,
  specs: readonly CategorySpec[]
): Promise<RetailSourceResult> {
  const observedAt = new Date().toISOString();
  const urls = await productUrls(store);
  if (!urls.length) {
    return { listings: [], ok: false, note: "sitemap vacío o inaccesible" };
  }

  // The hint is a cost control, not a filter: a spec without one wants every PDP looked at.
  const openEverything = specs.some((spec) => !spec.urlHint);
  const candidates = urls
    .filter((url) => openEverything || specs.some((spec) => spec.urlHint!.test(url)))
    .slice(0, MAX_PDP);

  const parsed = await mapLimit(candidates, PDP_CONCURRENCY, async (url) => {
    const html = await fetchText(url, { retries: 1 });
    if (!html) return null;
    const product = parseStructuredProduct(html);
    if (!product) return null;

    const title = product.name;
    // A furniture catalogue names a task chair "Silla LZ" and a dining chair "Silla Nórdica" —
    // only the description and the URL tell them apart.
    const context = `${product.description} ${decodeURIComponent(url)}`;
    const spec = specs.find((candidate) => candidate.accept(title, context));
    if (!spec) return null;
    const currency = product.currency === "USD" ? "USD" : product.currency === "UYU" ? "UYU" : null;
    if (!currency) return null;

    const listing: RetailListing = {
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
      attributes: {
        ...(product.description ? { DESCRIPTION: product.description } : {}),
        CATEGORY_SPEC: spec.key,
      },
      rating: null,
      ratingCount: 0,
      location: null,
      freeShipping: null,
      officialStore: true,
      observedAt,
    };
    return listing;
  });

  const listings = parsed.filter((listing): listing is RetailListing => Boolean(listing));
  const mismatched =
    store.expectCurrency && listings.length
      ? listings.filter((listing) => listing.currency !== store.expectCurrency).length
      : 0;

  return {
    listings,
    ok: true,
    note: `${urls.length} productos en sitemap, ${candidates.length} candidatos, ${listings.length} aceptados${
      mismatched ? `, ${mismatched} en moneda distinta a la esperada` : ""
    }`,
  };
}
