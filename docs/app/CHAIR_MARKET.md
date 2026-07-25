# Desk-chair market directory (`/sillas-escritorio-uruguay`)

A daily harvest of every desk chair on sale in Uruguay, merged into **one row per chair** with the
price of each platform beside it, rated from the review evidence that actually exists.

It sits next to the older r/CharruaDevs tier list (`sync_chair_tiers.ts`, weekly) and reuses it as
one of four rating signals. See [CHAIR_TIERS.md](CHAIR_TIERS.md) for that one.

## Pipeline

```
sync_chairs.ts                      pm2 currency-chairs, 41 11 * * * UTC (≈08:41 Montevideo)
├── classes/chairs/sources/
│   ├── mercadolibre.ts   → MLU via the scraper service on 104:9656 (8 queries + category MLU77709)
│   ├── fenicio.ts        → Bertoni, Divino, Electroventas, La Cueva, Clemur
│   ├── shopify.ts        → Armo, Grassi, Cover Company
│   ├── facebook.ts       → Marketplace via the browser service on 104:9657
│   └── reddit_global.ts  → r/OfficeChairs, r/ergonomics, r/BuyItForLife, r/homeoffice
├── normalize.ts          → is this a desk chair? which chair is it?
├── catalog.ts            → group listings, dedupe offers, price stats, price history
├── ratings.ts            → 1-5 stars from up to four independent signals
├── reviews.ts            → verdict + sourced pros/cons (reuses the tier list's, else Gemini)
└── store.ts              → APP Mongo: chaircatalogproducts, chaircatalogmeta
```

The Nuxt app reads `/api/chairs` (whole catalogue + facets) and `/api/chairs/[slug]` (one chair +
related). Nothing on the request path calls Reddit, Gemini or any storefront.

## Adapters, not scrapers-per-store

Adding a store is a few lines in `sources/registry.ts` because almost every Uruguayan retailer runs
one of two platforms:

| adapter | contract used | stores |
|---|---|---|
| `fenicio` | `/sitemap/catalogo-articulos.xml` + schema.org microdata on each PDP | Bertoni, Divino, Electroventas, La Cueva, Clemur |
| `shopify` | `/products.json` (paginated, public) | Armo, Grassi, Cover Company |

Both read published contracts rather than markup, so a theme change does not break them. Fenicio is
the Montevideo-built SaaS behind most local chains — its assets are served from `f.fcdn.app`, which
is the fastest way to recognise one.

**Currency is never assumed.** Shopify's `products.json` omits it, so it is read from the storefront
at run time and a store whose currency cannot be established is skipped. A USD price published as
UYU is a 40× error.

## Deduplication: the whole point

The merge key is `normalised brand | normalised model` and never mentions the source, so a Herman
Miller Aeron at Bertoni, at four MercadoLibre sellers and on Marketplace is **one product with six
offers**. Rules that keep this honest:

- Two listings merge only when brand *and* model agree. A description ("silla ergonómica negra")
  identifies nothing and is dropped rather than pooled.
- A MercadoLibre `catalog_product_id` overrides the text: listings sharing one are the same chair.
- Trademarked model names (Aeron, Embody, Sayl, Leap…) override the brand a store declares for
  itself — a Uruguayan store listing an "Embody" is reselling a Herman Miller.
- A store may stand in as the brand for its own unbranded line ("Michigan" at Bertoni). That keeps
  the chair in the directory while making sure it cannot merge with a same-named chair elsewhere.
- Within a product, offers are deduped to one row per seller **per condition** — so a used
  Marketplace Aeron still shows next to the new retail one.

## The star rating

Up to four signals, each shrunk toward 3.5 by its own sample size (Bayesian), then combined with a
saturating weight. Every signal and its share stay visible on the chair page.

| signal | source | notes |
|---|---|---|
| `mercadolibre` | buyer reviews | counted **once per catalogue product** — ten sellers share one review pool |
| `reddit` | r/CharruaDevs tier list | the 0-100 sentiment score mapped onto stars |
| `expert` | international chair subreddits | for models Uruguay never discusses (Steelcase, Ergohuman) |
| `store` | storefront review widgets | wired, no store currently exposes them |

No evidence at all → `stars: null` and the page says "sin reseñas suficientes". It never invents 3.5.

## Identifying a chair from its photo

A listing nothing can name is a listing the directory has to drop, and Marketplace titles are
routinely just "silla de escritorio". `classes/chairs/vision.ts` gives those one last chance: the
product photo goes to the cheapest Gemini model, which is asked to report only what is legible —
a logo, a tag, an unmistakable silhouette.

Three rules stop it inventing chairs:

1. Only listings text identification already failed on are sent, Marketplace first.
2. A guess is accepted only above `CHAIR_VISION_MIN_CONFIDENCE` **and** only when the brand is one
   the Uruguayan market actually has (`KNOWN_CHAIR_BRANDS`). A confident "ErgoMax Pro 3000" is
   discarded, because that chair does not exist here.
3. Every guess — accepted or not — is stored in `chairvisionguesses` keyed by the image, so the
   same photo is never paid for twice and any chair named this way can be traced to its source.

`npm run chair_vision_probe` prints what the model reads off real listings without writing the
catalogue, which is how to check it is still worth its cost.

## What it refuses to do

- Publish a price outside 900–900 000 UYU (typos, deposits, spare parts).
- Publish an empty catalogue over a good one — a total outage keeps yesterday's data.
- Show a rating without showing what it is made of.
- Present AI prose as measurement: pros and cons need a quotable source id or they are dropped.
- Hide a broken source: `chaircatalogmeta.sources` records every adapter's result and the page
  renders it.

## Facebook Marketplace

The scraper lives in the **trustpilot** repo (`classes/FacebookMarketplace/`,
`servers/facebook-marketplace-server.ts`, pm2 `facebook_marketplace`, port 9657). It attaches over
CDP to the already-authenticated Chrome that `facebook_profile_browser` keeps on port 9224 — it must
never launch its own Chrome on the same `--user-data-dir`.

It only produces data while that Facebook profile has a valid session. When the session is expired
the service answers `FB_MARKETPLACE_LOGGED_OUT`, the harvest records the gap, and the directory
carries on without Marketplace offers.

## Environment

| var | default | meaning |
|---|---|---|
| `CHAIR_ML_API` | `http://104.234.204.107:9656/mercadolibre` | MercadoLibre scraper service |
| `CHAIR_FB_API` | `http://104.234.204.107:9657/facebook/marketplace` | Marketplace service |
| `CHAIR_FB_ENABLED` | `1` | `0` skips Marketplace without failing the run |
| `CHAIR_STORE_MAX_PDP` | `260` | product pages opened per Fenicio store |
| `CHAIR_ML_MAX_PAGES` | `4` | pages per MercadoLibre query (50 results each) |
| `CHAIR_GLOBAL_MODELS` | `24` | chairs queried against the international subreddits |
| `CHAIR_REVIEW_LIMIT` | `40` | chairs sent to Gemini for pros/cons per run |
| `CHAIR_ANALYSIS_LOCAL_ONLY` | — | `1` disables Gemini entirely |
| `CHAIR_USD_UYU` | — | pins the reference rate instead of reading the public API |
| `CHAIR_VISION_ENABLED` | `1` | `0` skips image identification |
| `CHAIR_VISION_LIMIT` | `40` | photos sent to the model per run |
| `CHAIR_VISION_MIN_CONFIDENCE` | `0.7` | floor for accepting a reading |

## Debugging

```bash
npm run chair_probe                 # every source, no DB writes
npm run chair_probe -- bertoni      # one registry key ("mercadolibre" / "facebook" too)
npm run sync_chairs                 # full run (writes the app DB)
npm run chair_vision_probe          # what the model reads off real photos, no writes
npm run chair_prune                 # delete stored rows today's rules would reject
npx ts-node scripts/oneoff/chair_inspect.ts   # what is stored, multi-platform chairs first
```
