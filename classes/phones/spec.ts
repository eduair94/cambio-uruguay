// What the phone directory asks the shared retail harvester for.
//
// Mirrors classes/chairs/spec.ts and classes/equipar/registry.ts: this file is the whole of
// "celular" as far as the plumbing is concerned. Everything else in `classes/retail` (sitemap
// reading, the WooCommerce Store API client, the MercadoLibre bridge) is category-blind — the same
// storefront sweep that feeds `classes/equipar` (household goods) or `classes/chairs` (desk chairs)
// feeds this one, at the cost of one more `accept()` call per product, never a second fetch.
import { identifyPhone, isPhoneTitle } from "./identify";
import type { CategorySpec } from "../retail/types";

/**
 * Cheap pre-filter over product URLs/slugs before any PDP is fetched — a cost control, not a
 * filter (see `CategorySpec.urlHint`'s own doc comment): a Fenicio sitemap can hold thousands of
 * URLs and opening every one to learn it is a laptop charger is the expensive mistake this exists
 * to avoid. It only needs to be permissive enough that no real phone URL is skipped; `accept()` is
 * what actually decides once the page is fetched.
 */
const PHONE_URL_HINT = /(celular|iphone|galaxy-(s|a|z|m)\d|moto-g\d|motorola|redmi|poco-[xmcf]\d|honor-(x|magic|\d{3}|play))/i;

/**
 * The whole contract with a storefront adapter, shared between `accept` and `acceptFromCategory`:
 * a title only counts once it both LOOKS like a phone (brand present, no accessory/clone/tablet/
 * wearable word — `isPhoneTitle`) and actually resolves to a full model+storage identity
 * (`identifyPhone`). A listing whose title never says how much storage it has cannot be compared
 * to any other listing — the catalogue merge and every price band key off `identity.key` — so it is
 * not worth harvesting at all, not even as an unidentified row to fix up later.
 */
const accept = (title: string): boolean => isPhoneTitle(title) && identifyPhone(title) !== null;

export const PHONE_SPEC: CategorySpec = {
  key: "celulares",
  accept,
  urlHint: PHONE_URL_HINT,
  storeQueries: ["celular", "iphone", "samsung galaxy", "motorola", "xiaomi redmi", "honor"],
  // Sillas de Oficina has one category; celulares has one too (MLU1055), searched alongside the
  // text queries below so nothing a query happens to miss (a seller who wrote "Cel" instead of
  // "Celular", say) is lost.
  mlCategories: ["MLU1055"],
  mlCategoryQuery: "celular",
  // Interleaved by family, not brand-then-brand-then-brand: `planScans` in
  // `classes/retail/sources/mercadolibre.ts` round-robins ACROSS specs, but within one spec (this
  // one) it walks the array in order, so a run cut short by a query budget loses the tail of this
  // exact list — Honor and the older iPhone/Galaxy generations, not a whole brand up front. The
  // families themselves are the ones actually selling new in Uruguay as of 2026-09-16 (see
  // docs/superpowers/plans/2026-09-16-celulares-titulos-muestra.txt).
  mlQueries: [
    "iphone 17 pro max",
    "iphone 17 pro",
    "iphone 17",
    "iphone air",
    "iphone 16",
    "iphone 16e",
    "iphone 15",
    "samsung galaxy s26 ultra",
    "samsung galaxy s26",
    "samsung galaxy s26 fe",
    "samsung galaxy a56",
    "samsung galaxy a36",
    "samsung galaxy a17",
    "motorola edge 70",
    "moto g17",
    "moto g06",
    "motorola razr 70",
    "xiaomi redmi note 15",
    "xiaomi redmi 15c",
    "xiaomi poco x8 pro",
    "honor magic 8 lite",
    "honor x7e",
    "honor x5c plus",
  ],
  // The MLU1055 category page is already phone-only, so a row only needs the same identity check
  // that a text-search row needs — unlike `classes/chairs`, there is no laxer category-only test
  // here, because "looks like a phone" and "is a phone we can price" are the same bar for celulares.
  acceptFromCategory: accept,
  // Facebook Marketplace titles almost never carry brand+family+storage all three the way a store
  // or ML listing does ("iPhone 13 en buen estado", no GB anywhere), so nothing here could ever
  // pass `accept` reliably. Used units still reach the catalogue — through ML's own `used`
  // condition — without Marketplace's unreliable titles poisoning the identity match.
  fbQueries: [],
};

/**
 * Stores worth reading for celulares, so `sync_phones.ts` (a later task) never sweeps a furniture
 * chain's sitemap looking for a phone that is never there. Verified 2026-09-17 (platform reachable,
 * currency read from a real product, at least one phone URL/listing found) before being added here:
 *
 *  - claro        fenicio, UYU  — 85 URLs matching {@link PHONE_URL_HINT} in the sitemap (92 on
 *                 2026-09-16, brief's count; catalogues change daily). Sample PDP priceCurrency=UYU.
 *  - zonatecno    fenicio, USD  — 245 matching URLs (brief measured 387 the day before). Sample PDP
 *                 (an outlet iPhone 17 Pro) priceCurrency=USD.
 *  - nstore       fenicio, USD  — 76 matching URLs; sample PDP (iPhone 17 Pro Max) priceCurrency=USD.
 *  - zonalaptop   fenicio, USD  — 4 matching URLs (small phone selection; mostly laptops). Sample
 *                 PDP (Oppo Reno 11) priceCurrency=USD.
 *  - market       fenicio, UYU  — 233 matching URLs. Sample PDP (Redmi 17) priceCurrency=UYU.
 *  - magiccenter  fenicio, USD  — 9 matching URLs (mostly appliances; a handful of iPhones). Sample
 *                 PDP (iPhone 13) priceCurrency=USD.
 *  - digitalworld woocommerce, USD — Store API `search=iphone` returns real iPhone 16/16 Plus rows
 *                 (plus phone-stand ACCESSORIES that `isPhoneTitle` already rejects); `currency_code`
 *                 USD with `currency_minor_unit: 2` ("155900" -> USD 1 559,00).
 *
 * `thotcomputacion` (in the brief's list) and `tyt` (already registered for chairs/equipar) were
 * BOTH measured out: `thotcomputacion`'s Store API is reachable and answers `search=` for every
 * term below, but returns zero phones — only monitors, tablets and a Razer controller — across
 * every one of `storeQueries` plus `redmi`/`poco`/`galaxy`/`smartphone`. `tyt` came back the same
 * way across a near-complete sample (500 of its ~515 products, `search=` per term): appliances,
 * hand tools and phone ACCESSORIES, never a phone itself. Neither is a platform or reachability
 * failure — both APIs work — the stores simply do not carry phones today, so neither is added here
 * (an adapter with nothing to accept is a wasted daily sweep, not a harmless no-op: it is one more
 * store whose "0 aceptados" a human has to read past every day to see the ones that matter).
 * `dimm` and `covercompany` (also already registered) DO carry phones — measured 300 matching
 * sitemap URLs (dimm) and 51 of 250 sampled Shopify products (Cover Company) — and both stay.
 */
export const PHONE_STORE_KEYS: readonly string[] = [
  "claro",
  "zonatecno",
  "nstore",
  "zonalaptop",
  "market",
  "magiccenter",
  "digitalworld",
  "dimm",
  "covercompany",
];
