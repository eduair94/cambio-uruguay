# Casas de Cambio — comparison/directory page (`/casas-de-cambio`)

**Date:** 2026-07-04 · **Status:** approved (user delegated design decisions: "everything upon your consideration")

## Goal

One page that fairly compares every exchange house the site tracks (34 origins + banks + Prex), combining:

1. **Reputation** — Google-review ratings, press coverage, strengths/weaknesses researched from the public internet (snapshot, dated, source-cited).
2. **Live rate competitiveness** — USD buy/sell/spread from our own API (objective, timestamped).
3. **Facts** — coverage (departments), services, BCU regulation link, founded year.

Target queries: "casas de cambio uruguay", "mejor casa de cambio uruguay", "donde cambiar dólares en uruguay" (+ EN/PT variants for tourists).

## Approaches considered

- **A (chosen): static curated reputation dataset + live rate layer.** Research once (multi-agent web sweep with adversarial verification), store in a pure util with `checkedAt` date and per-claim sources; page layers live USD rates from the existing API at render. Fast SSR, verifiable, no runtime scraping of Google (TOS-safe). Refresh = re-run research, update one file.
- B: runtime Google Places API — cost, key management, quota, and ratings markup we couldn't legitimately use anyway. Rejected.
- C: pure editorial article, no data — weaker utility and SEO. Rejected.

## Fairness rules (stated on-page)

- Ratings are a **dated snapshot** of public Google reviews, always shown with review count; low-sample (<30 reviews) flagged; missing → "sin datos", never guessed.
- Every reputation claim carries a source URL; full source list on page.
- Rate data comes from our own scraper API and is timestamped live — not editorial opinion.
- No single editorial "winner": multi-dimension table + objective "best for X" picks (best live rate, best rated with sample threshold, widest coverage). Sort controls exposed; default sort documented.
- No affiliation/paid placement; corrections invited via /contacto.
- No `aggregateRating` JSON-LD (third-party reviews violate Google's self-serving review-markup guidelines). Stars appear only in UI with citation.

## Components

- **`app/utils/casasDirectory.ts`** (pure, testable):
  - `LAST_RESEARCHED` ISO date.
  - `CASAS_REPUTATION: CasaReputation[]` — per origin: `code, category ('casa'|'banco'|'fintech'), googleRating|null, googleReviewCount|null, ratingSource|null, branchNote|null, founded|null, services: string[], strengths/weaknesses (es strings), press/sources: {label,url}[]`.
  - `getCasasContent(locale)` — trilingual content tree (hero, methodology, table labels, category/context copy, FAQ, disclaimer), pattern copied from `withdrawCash.ts`.
  - `usdSnapshotByOrigin(rows)` — pure: processed exchange rows → per-origin `{buy, sell, spreadPct, gapToBestSellPct, gapToBestBuyPct}` for USD cash quotes (exclude interbank/ewallet types mirroring existing `isInterBank` logic).
- **`app/pages/casas-de-cambio.vue`**: breadcrumb → hero (h1 + dated intro + ShareButtons) → "best for" picks → methodology alert → comparison table (desktop) / stacked cards (mobile) with department filter + sort control → per-casa expandable details (only casas with researched content) → context sections (bancos vs casas vs fintech; frontera; regulación BCU) → FAQ → disclaimer → sources → CTA (home, /mapa, /sucursales).
- Row links: `/casa/[origin]`, `/sucursales/[origin]`, `/historico/[origin]`, official site (`rel="noopener noreferrer"`, outbound tracked by existing plugin).

## Data flow

SSR: `useAsyncData` → `getProcessedExchangeData('')` (already cached composable) → `usdSnapshotByOrigin` → merge with `CASAS_REPUTATION` + `localData` (branch departments). Static content from util. No new server endpoints.

## SEO

- Trilingual meta via content tree; per-locale canonical (`localePath`); hreflang from layout; OG image component (tag `COMPARATIVA`).
- JSON-LD `@graph`: `Article` (datePublished = LAST_RESEARCHED, dateModified today-ish), `ItemList` of `FinancialService` (name, url → `/casa/[origin]`, `sameAs` official site), `FAQPage`, `BreadcrumbList`, `speakable`.
- Sitemap: `addUrlsForAllLocales('/casas-de-cambio', 0.8, 'weekly')`.
- Discovery links: Footer, sucursales/index cross-link, casa/[origin] backlink if trivial.
- Add route to `app/scripts/lightmode-axe.mjs` sweep list.

## Error handling

- API down → table renders reputation/facts columns with "—" for rates (no crash, no empty page).
- Casa present in API but absent from reputation dataset → row still renders with nulls.

## Testing

- Unit (vitest): `usdSnapshotByOrigin` (spread math, gap-to-best, interbank exclusion, missing USD rows); `getCasasContent` returns complete tree for es/en/pt (keys parity).
- E2E smoke: page loads, table has >20 rows, hydration-gated via `toPass` retries (per repo convention).
- `npm run lint` (typecheck is broken repo-wide); prod-build axe sweep both themes for the new route.

## Maintenance

Reputation snapshot refresh: re-run the research workflow, update `CASAS_REPUTATION` + `LAST_RESEARCHED`. Note added to auto-memory.
