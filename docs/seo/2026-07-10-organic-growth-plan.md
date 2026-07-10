<!-- Generated 2026-07-10 from a 207-agent workflow: 13 diagnostic specialists -> 117 findings -> 62 high/critical findings each refuted by 3 adversarial verifiers (correctness / impact-realism / Google-policy) -> 30 survived, 32 refuted -> 3 competing strategies -> 3-judge panel -> completeness critic -> synthesis. 18 of 186 verifier agents failed to return structured output, so a handful of findings were judged on 1-2 votes rather than 3; treat any finding not independently spot-checked as PLAUSIBLE, not CONFIRMED. The wrong-rate bug (P0.1) was independently verified against the live site. -->

# Plan de Crecimiento Orgánico — cambio-uruguay.com

**One document. Foundation-first, moat-extending. Merges the Data-Moat strategy (the panel winner) with the graftable pillars the judges selected from Demand-Capture and Reset & Concentrate, honours the completeness critic, and never resurrects a refuted finding.**

Baseline (GSC, trailing 3 months, exported 2026-07-06): **439,785 impressions → 3,828 clicks = 0.87% CTR, avg position 8.3** (≈1,276 clicks/month).

---

## 1. Diagnosis — what is actually wrong, in order of traffic cost

### The load-bearing insight (lead)

**The prior analysis's headline conclusion — "the problem is CTR, not rankings" — is incomplete, and acting on it shipped a live data-correctness bug that stamps the *same wrong dollar rate* onto 40+ casa pages.** `app/pages/historico/[origin]/index.vue:563-568` computes `usdToday` from the *unfiltered all-casas* array with no `route.params.origin` filter, so `/historico/itau`, `/historico/prex`, `/historico/bcu` and every other origin render the byte-identical meta description *"Dólar en {X} hoy: compra $37,15, venta $39,55"*. BCU's reference rate, Prex's fintech spread and Itaú's bank spread cannot all be 37,15/39,55. This is both an E-E-A-T defect (users click "Itaú $37,15" and see a different table) and 40 near-duplicate snippets.

The deeper structural problem the CTR-only lens missed: **the pages that rank do so on content Google's snippet and every JS-less AI crawler cannot see.** The top-traffic template `app/pages/historico/[origin]/[currency]/[[type]].vue` fetches its numbers via `useLazyAsyncData` (client-only, lines ~523/531), so the server HTML is a spinner, the meta description is number-less/generic (`es.json:651-652`, 122 chars), and there is **no `<h1>` at all** — the top heading is a generic emoji `<h2>📈 Histórico de Cotizaciones</h2>` (line 15) with the casa name demoted to `<h3>`. The site's single biggest content page, `/historico/brou/usd` (64,559 imp / 883 clicks), ships Googlebot a generic description with no rate and no casa-named H1.

So the real bottleneck is a **stack**, not a single lever: (1) a wrong-rate bug, (2) client-only rendering that starves snippets + AI citations + thin-page indexation, (3) an orphaned canonical hub, (4) genuinely un-served demand pools. CTR is a symptom of #1–#3, not the disease.

### The itau/prex vs brou/principal/bcu CTR anomaly — resolved

Four origin pages ship the **identical** (buggy) meta yet GSC CTR varies 75×:

| Page | Imp | Clicks | CTR | Position | Why |
|---|---|---|---|---|---|
| `/historico/prex` | 3,800 | 231 | **6.08%** | 5.89 | App-only fintech, **no official rate page competes**; product/brand intent |
| `/historico/itau` | 9,363 | 421 | **4.50%** | 4.53 | Itaú's rates live only in a machine XML feed, **no consumer rate page competes**; top-of-page-1 |
| `/historico/cambio_principal` | 5,335 | 9 | **0.17%** | 5.91 | Navigational — casa's own site (cambioprincipal.com.uy) + map pack absorb the click |
| `/historico/bcu` | 15,496 | 13 | **0.08%** | 9.12 | Official bcu.gub.uy (which *does* render an H1 + static USD rate) + Google finance box; position 9 = below fold |
| `/historico/brou/usd` | 64,559 | 883 | 1.37% | 8.16 | On-curve for pos 8 vs BROU.com + finance box |

**Conclusion: with meta held constant, CTR tracks POSITION + SERP features + query intent, not the meta string.** The winnable tier is *fintech/bank pages where no official indexable rate page exists* (itau, prex) and *histórico/evolución-qualified queries* (`cotización del dólar brou histórico` — 820 imp / 105 clicks / **12.8%** / pos 4.49; `dolar itau` — 8.31% / pos 3.04), where there is no answer box and no map pack, so organic #1–3 gets the click. This is the pattern to systematize — **not** meta tweaks on SERP-feature-capped pages (bcu, cambio_principal), and **not** the head terms.

### The 1,162 "not indexed" URLs — resolved

857 "Discovered – currently not indexed" + 305 "Crawled – currently not indexed" = 1,162. (The 124 "Alternate page with proper canonical" is *healthy* hreflang consolidation, not a problem — do not touch it.) This is **Google's quality/demand judgment on thin programmatic pages**, driven by: the client-only rendering (SSR = spinner), the near-duplicate templates, and BROU-mirror casas (`cambio_romantico/federal/argentino` return BROU's rows verbatim). It is **not** crawl budget — that is a myth below ~1M URLs and this site is ~2,000. The two buckets need different fixes: the 305 *Crawled*-not-indexed pages need **unique server-rendered content per URL** (which flips them to indexed); the 857 *Discovered*-not-crawled majority is a priority/internal-link problem, addressed by feeding the canonical hub and pruning duplicates — **not** by mass noindex (which yields ~0 clicks and risks an hreflang backfire).

### What the prior analysis got wrong

1. **"The problem is CTR, not rankings."** Incomplete. It is CTR *and* indexability (client-only SSR) *and* a data-correctness bug *and* internal-link architecture. Treat it as a hypothesis that was ~40% of the story.
2. **The "add the live rate to casa descriptions" fix shipped a bug** — one global wrong number on 40+ pages instead of per-casa rates.
3. **The late-June impression doubling (36k → 81k → 91k/week) while CTR halved (1.03% → 0.49%)** is impression *dilution* from the June content deploy, not a regression. **Site-wide CTR is diagnostically useless right now** — segment by page type (GSC Pages regex) and ignore the aggregate until the tail is deduped.

---

## 2. The bet

**People will choose this site because it answers the questions BROU, BCU, an answer box, and dolaruruguay.uy structurally cannot: "which of 40+ casas is cheapest for me right now and how much do I save," "how has *this specific* casa's dollar moved over years," and "what's the real/peso rate at the actual Rivera/Salto border house today." The moat is the archive: years of daily buy AND sell quotes across ~37 casas, banks, fintechs and BCU, keyed by date in one Mongo collection, cross-referenced to the BCU registry, plus branch geodata and weekly Google-review snapshots.** A competitor can clone the comparison table in a weekend but cannot retroactively manufacture "the median spread Gales charged over the last 365 days," "Prex's all-time dollar high and when it happened," or a live 40-casa "cheapest today, ahorrás $Z vs el promedio" leaderboard — every one of those requires the history they never collected, and single-source publishers (BROU, BCU, Itaú, El País, an answer box) can each render only ONE number. The moat protects everything *historical, comparative and per-institution*; it explicitly does **not** protect the commoditized zero-click "dólar hoy" number, which we concede by design.

---

## 3. Traffic model

Modeled in 3-month (quarter) units to match GSC. Every increment is a pool where a click is *observed* to still happen; the ~72k-impression zero-click head pool (`dolar hoy` 30,285 @ 0.05%, `cotizacion brou` 10,113 @ 0.03%, `bcu cotizaciones` 4,706 @ 0.08%) is **excluded as structurally unwinnable**. Pools are defined disjointly to avoid double-counting.

| WS | Pool (3mo imp) | Baseline CTR | Target CTR | Δ clicks/qtr (central) | Confidence |
|---|---|---|---|---|---|
| **P0** Foundation (bug + SSR + H1 + answer) | historico detail family ~90–105k (brou/usd 64.5k + itau 9.4k + prex 3.8k + indumex 5.3k + varlix 2.5k + others) | 1.65% blended | 2.0% | **+370** | Med — position-capped by BROU.com; indexation-dependent |
| **P1** Consolidate brand cluster | 37,275 (gales 7,602 + fenix 6,984 + principal 12,929 + matriz 2,229 + indumex 1,351 + maiorano 1,183 + misiones 1,029 + cambio 18 1,520 + fortex 1,196 + principal rivera 1,252) | 0.31% (117 clk) | 0.7% | **+145** | Med — several SERPs capped by casa's own site + map pack |
| **P2** Records/streaks + unique SSR prose | ~305 Crawled-not-indexed + underperforming casa/origin tail, ~40k imp | 0.15% | 0.5% | **+140** | Low-Med — softest line; needs Google to re-index |
| **P3a** Decision hub `/mejor-casa-de-cambio` | ~8k **NEW** | — | 2.0% | **+160** | **GUESS** — no baseline; contested by comparalatam/datosuruguay |
| **P3b** Frontera BRL/ARS + pt Rivera | ~11k existing pt/border repackaged + ~5k NEW | 0.13% / — | 1.2% / 2% | **+160** | **GUESS** — demand inferred from country aggregates (Brasil 13,746 / Argentina 5,825), not observed queries |
| **P3c** Opening-hours "abierto ahora" | ~5k **NEW** | — | 1.5% | **+75** | **GUESS** — map pack caps "near me" share |
| **P3d** Tools exposure | ~6k new+recovered | — | 1.2% | **+70** | Med — proof: `/herramientas/conversor-unidad-indexada` already 5,214 imp with ~0 internal links |
| **P4** Authority / GEO / dataset | — | — | — | **+0 direct** (booked) | Upside only — no editorial link has converted to date |
| | | | | **Central sum ≈ +1,120/qtr** | |

**Conservative discount:** apply −35% for indexation risk + inferred-demand risk on P2/P3 → **+~730/qtr floor.**

**Targets (labelling all guesses):**

- **6-month (central):** P0–P2 mature, P3 half-indexed → **≈ 4,700 clicks/qtr (+23%)**; floor ≈ 4,300 (+12%); stretch ≈ 5,000 (+31%).
- **12-month (central):** full maturity + a second content wave + compounding indexation → **≈ 5,800 clicks/qtr (+52%)**; floor ≈ 4,900 (+28%); stretch ≈ 6,500 (+70%).
- **Authority upside (unbooked):** if the P4 spread league table converts 2–3 editorial `.uy` links over 6–12 months, it lifts head-term positions site-wide — this is real but **not in the number**; treat as the path to doubling, not the plan.

**Single biggest assumptions, stated:** (1) brou/usd is position-capped at 1.8–2.2%, **not** the 4.5% itau ceiling; (2) P2's +140 requires Google to re-index recovered pages — the softest number; (3) P3a/b/c CTRs (1.5–2%) reflect click-available intents but the impression volumes are estimates to validate at day 60 before scaling; (4) all head-term pools booked at ~0.

---

## 4. The plan — P0 … P4, ordered by impact/effort

### P0 — Foundation & truth (do first; unblocks everything) — impact/effort: **highest**

**Problem it solves:** the wrong-rate bug, the SSR-invisibility of the winning content, the missing H1/dated answer, no measurement, and four unverified load-bearing assumptions the critic flagged.

**Deliverables:**

**P0.1 — Fix the wrong-rate bug** (`app/pages/historico/[origin]/index.vue:563-568`). Effort **S**.
```js
// was: items.value.filter(i => i.code === 'USD' ...)   // unfiltered, global first row
const rows = items.value.filter(i =>
  i.origin === route.params.origin && i.code === 'USD' && i.buy > 0 && i.sell > 0);
const usdToday = rows.find(x => x.type === 'BILLETE' || !x.type) ?? rows[0];
```
Verify each casa renders a distinct, correct compra/venta before deploy (curl 5 origins, diff the `<meta name="description">`).

**P0.2 — GA4 key events** (unblocks all measurement). Effort **S**.
- `app/components/NewsletterSignup.vue` submit (~line 66, after successful `$fetch`): `track('newsletter_signup', { source: route.path })`.
- `app/components/account/AlertsPanel.vue` `create()` (~line 169, after the `authFetch` to `/api/me/alerts`): `track('alert_created', { currency, kind, op, target })` (payload matches the real form — **not** per-casa).
- In GA4 UI mark 5 key events: `outbound_click` (already global via `track-clicks.client.ts` — primary "went to change money" proxy), `alert_created`, `newsletter_signup`, `where_to_change` (`WhereToChange.vue:312`), `convert` (`index.vue:1765`).

**P0.3 — Verification checks (the critic's must-dos; run before building)** Effort **S** total.
- **The 2-minute load-bearing check:** GSC → Search Analytics → filter query `dolar hoy` → **Pages** tab. This returns whether `/` or `/dolar-hoy` takes the impressions and each URL's real position — settling home-vs-dolar-hoy cannibalization and whether 0.05% is an answer-box floor or a pos-9 artifact. Every "concede the head terms" decision depends on this. *(Do NOT skip on the false premise that "GSC gives no page×query intersection" — the Pages tab under a query filter does exactly that.)*
- **Map-pack live SERP** (skill: `seo-maps` / `seo-local`): run `cambio maiorano`, `cambio principal rivera`, `cambio gales` — confirm a map pack is actually present before touching the local/brand pillar. `cambio maiorano` already converts at 1.78% (pos 3.98), so the "navigational is unwinnable" thesis may be false for a slice.
- **Discover report:** GSC → Search results **→ Discover** tab (separate from Search). Baseline it — the freshness/news pillar's entire upside is here and was never quantified.
- **CrUX baseline** (skill: `seo-google`): pull field LCP/INP/CLS for `/historico/brou/usd` **before** any SSR-blocking change.
- **seo-drift baseline** (skill: `seo-drift`): snapshot on-page SEO of the top 20 URLs before P1 consolidation, so a reprocessing J-curve dip is distinguishable from a regression.

**P0.4 — SSR the historico detail numbers + add H1 + dated answer block** (the structural unlock; the critic's #1). `app/pages/historico/[origin]/[currency]/[[type]].vue`. Effort **L**.
- Convert the current-rate + period-summary fetch from `useLazyAsyncData` → blocking `useAsyncData` so the number and prose ship in SSR HTML. **Load-test TTFB/INP after** (this is the busiest route; CrUX baseline from P0.3 is the guardrail). Keep the heavy `/api/drivers` overlay lazy/client-only — do not SSR-serialize it.
- Add a real `<h1>` from `exchangeHouseName` + currency label (not hardcoded "dólar" — the route serves EUR/BRL/ARS/XAU): **"Cotización del dólar en {Casa} hoy e histórico"** (e.g. `Cotización del dólar en BROU hoy e histórico`).
- Insert a visible SSR answer block above the table (use the *selected* period label — `periodOptions` are 3/6/12/24 months, there is **no** 30-day series, so say "en los últimos {período}", never "últimos 30 días"):
```html
<section class="cu-answer">
  <p>Hoy 10/07/2026, el dólar en BROU cotiza a <strong>$40,20 venta</strong> /
  <strong>$39,55 compra</strong>. En los últimos 6 meses varió <strong>+3,1 %</strong>;
  máximo del período $41,80, mínimo $38,20. Fuente: BCU.
  <time datetime="2026-07-10T14:35:00-03:00">Actualizado 14:35 (hora de Montevideo)</time>.</p>
</section>
```
- Port the origin-filtered live-rate prefix into `seo.historicalDetailDescription` (es/en/pt in `es.json:651-652`), ≤155 chars: **"Dólar {origin} hoy: compra $X, venta $Y. Evolución, gráfico y récords de {currency}. Compará con 40+ casas de cambio."**

**P0.5 — SSR ExchangeRateSpecification + remove the misleading $0 Offer** (schema hygiene; booked ~0 clicks but cheap manual-action-risk cleanup). Effort **S**.
- Compute `exchangeRateSchema` from the already-resolved rows so it ships in SSR; `dateModified` = the **real scrape timestamp**, not `new Date()`:
```json
{"@context":"https://schema.org","@type":"ExchangeRateSpecification","currency":"USD",
 "currentExchangeRate":{"@type":"UnitPriceSpecification","price":40.20,"priceCurrency":"UYU"},
 "url":"https://cambio-uruguay.com/historico/brou/usd","dateModified":"2026-07-10T14:35:00-03:00"}
```
- Remove the `offers:{price:'0',priceCurrency:'USD',availability:'InStock'}` block from `index.vue:1845-1851`, `ToolShell.vue:199`, and the dead `seo-utils.ts` helpers (`generateWebApplicationData`, `generateExchangeHouseData`). *(This will NOT recover the 11,852 Product-snippet impressions — that claim is refuted — it is correctness hygiene only.)*

**Expected clicks:** +370/qtr (central). **Measured:** GSC page-regex `^/historico/` blended CTR 1.65% → 1.9%+; URL Inspection "rendered HTML" of `/historico/brou/usd` contains the dated answer + `<h1>`; CrUX INP not regressed.

**Dependencies:** none. P0.4 must precede P2 (records/prose need the blocking fetch).

---

### P1 — Consolidate the brand cluster onto one canonical hub — impact/effort: **high**

**Problem:** for each of ~43 origins, `/casa/[origin]`, `/historico/[origin]`, `/historico/[origin]/[currency]`, `/sucursales/[origin]`, `/sucursales/[origin]/[location]` are all `index,follow` + self-canonical with titles overlapping on "cotización"+"dólar". Google splits equity: the branch leaf `/sucursales/gales/montevideo` (pos 5.08) ranks for `cambio gales` while the intended hub `/casa/gales` earns ~0 impressions and is a nav orphan (`siteNav.ts:468-469`, `DYNAMIC_ROUTE_KEYS` only).

**Deliverables** (effort **M**):

**P1.1 — Fatten `/casa/[origin]` and make it the single canonical brand hub** (`app/pages/casa/[origin].vue`; `ratesForOrigin` is already correctly origin-scoped here). SSR today's USD compra/venta + branch count + Google rating + per-currency history links, so it satisfies the SERP without the other four pages. *(Fatten so it deserves to win — do not add a thin third competitor.)*

**P1.2 — De-conflict by intent, not by cloning titles** (`app/i18n/locales/json/es.json` + en/pt):

| URL pattern | Decision | Canonical | New title (≤60) |
|---|---|---|---|
| `/casa/[origin]` | **KEEP — canonical hub** | self | `Cambio {X}: cotización dólar hoy, sucursales y opiniones` |
| `/historico/[origin]` | KEEP, **retitle** | self | `Cotizaciones históricas de todas las monedas — {origin}` |
| `/historico/[origin]/[currency]` | **KEEP (traffic driver)** | self | keep `{origin} {currency} hoy: cotización y evolución` + new H1 (P0.4) |
| `/historico/[origin]/BILLETE\|CABLE\|INTERBANCARIO` | **canonical → base** | `/historico/[origin]/usd` | — |
| `/historico/[origin]/usd/ebrou` | **KEEP self-canonical** (10,717 imp) | self | — |
| `/sucursales/[origin]` | KEEP, **retitle** (strip "cotización") | self | `Sucursales, horarios y direcciones de {origin}` |
| `/sucursales/[origin]/[location]` | KEEP high-demand; noindex <2-branch leaves | self/noindex | fix lowercase (`formatOriginName` + title-case) |

**CRITICAL:** do **not** strip "histórico/evolución" from `/historico/[origin]/[currency]` — those keywords win the site's best converters (`dolar itau` 8.31%, `brou histórico` 12.8%). **Trap:** the type-variant canonical must target the `billete/cable/interbancario` params specifically; verify against the sitemap type-pair logic (`urls.get.ts:147-149,184`) so you never noindex a sitemapped URL (the hreflang↔noindex conflict). Keep EBROU.

**P1.3 — Rebuild the internal-link graph to feed the hub** (effort **M**):
- Homepage block linking the top-20 casas by impression, anchor **"Cambio {X}: cotización y sucursales hoy"** (augment/replace the generic cards at `index.vue:725-806`).
- Add an up-link to `/casa/[origin]` from every `/historico/[origin]/[currency]` leaf — replace the dead "Volver al inicio" button (`[[type]].vue:366-373`). *(The sucursales up-link already exists at both origin and location views; the historico currency leaf is the one genuinely missing up-link.)*

**Expected clicks:** +145/qtr. **Measured:** `/casa/{gales,fenix,principal}` appears in GSC top-pages with >0 imp by day 60; brand-cluster blended CTR 0.31% → 0.6%+. **Dependency:** P0 (bug fix must land first so the hub's SSR rate is correct).

---

### P2 — Extend the proven moat pattern (records + unique SSR prose) — impact/effort: **high**

**Problem:** the proven demand is per-casa historical facts (itau 4.50%, prex 6.08%, brou-histórico 12.8%), but the pattern isn't systematized and the thin pages lack the unique per-URL content that flips "Crawled – not indexed" to indexed.

**Deliverables** (effort **M**):

**P2.1 — Unique, data-derived SSR prose per `/historico/[origin]/[currency]`** computed from the series: 30/90-day change (using the real selected period), this casa's spread vs the 40-casa median today, its rank cheapest-to-buy today, days-since-high. **Genuinely varied wording per page** (avoid scaled-content signals). This is the concrete lever on the 305 Crawled-not-indexed pages.

**P2.2 — "Récords y rachas" enrichment block** on `/casa/[origin]` and `/historico/[origin]/[currency]` (page-*enrichment* of existing URLs, **not** new pages — does not add to the unindexed pile): all-time max/min with dates, biggest single-day move, current up/down streak, vs-one-year-ago.
- Requires **new** logic: `computeRecords` (`rateStats.ts:41`) only does max/min/yearAgo — add streak + day-delta functions and a **new all-time Mongo query** (the evolution API is period-capped at 3/6/12/24 months).
- **Guard every published record** with `rate>0` + gap/outlier detection and the `/estado` live/stale/silent signal, so a scraper gap (BCU backfill, Prex cookie break, stale dist) never surfaces a false headline fact on a finance page. Note "evergreen" applies only to all-time high/low; streak + vs-one-year-ago are live and need daily recompute.

**P2.3 — Canonicalize the BROU-mirror casas** (`cambio_romantico/federal/argentino`, which return BROU's rows verbatim per `classes/cambios/cambio_romantico.ts`) → BROU, so their records/prose/league rows are never byte-identical duplicates.

**Expected clicks:** +140/qtr (softest line — indexation-dependent). **Measured:** URL Inspection on a named 15-URL cohort at day 30/60/90 shows movement from "Crawled/Discovered – not indexed" to "Indexed". **Dependency:** P0.4 (blocking SSR fetch).

---

### P3 — Open new click-available pools — impact/effort: **medium-high**

*Validate-before-scale discipline (grafted from Demand-Capture): ship a thin first batch of each, instrument, and gate the second wave on measured impressions at day 60.*

**P3a — Decision hub `/mejor-casa-de-cambio`** (the ONE intent an answer box cannot satisfy). Effort **M**.
- **Problem:** "today the cheapest casa for USD is X at $Y, saving $Z vs the 40-casa average" is already computed (`recommendation.ts:83` `rankExchanges` with `marketAverage`/`savingsVsAvg`; the answers in `faqAnswers.ts:126-135`) but lives only in the home widget with no query-matched URL; `/comparar` is mis-pointed at historical evolution.
- **Deliverable:** new `app/pages/mejor-casa-de-cambio.vue` (register in `siteNav.ts` or the coverage test fails). Blocking `useAsyncData` (so the named winner is in crawlable HTML). Reuse `rankExchanges` + `computeSavings` + `faqAnswers.ts` — **do not** author net-new answer prose.
  - Title (58): **`Mejor casa de cambio hoy en Uruguay: dólar más barato | UY`**
  - H1: **`¿Dónde conviene cambiar dólares hoy en Uruguay?`**
  - Desc (≤155): **`Hoy la casa más barata para comprar dólares es {Casa} a $Y. Compará las 40+ casas y ahorrá $Z frente al promedio del mercado. Actualizado cada 10 min.`**
  - Retarget `/comparar` from over-time evolution → a live best-buy/best-sell leaderboard ("mejor cotización del dólar hoy").
  - Neighborhood (Ciudad Vieja/Centro) cuts as **on-page sections**, never new URLs.
  - Internal-link from the home hero and every `/casa` + `/historico` page (so it is not crawl-starved given the 1,162 unindexed pile).
- **Expected:** +160/qtr (**GUESS** — no baseline). **Measured:** indexed + >500 imp by day 90; **kill scale** if <150 imp after 60 days indexed.

**P3b — Frontera BRL/ARS + pt Rivera** (a niche competitors own with thin single-rate pages; the frontera live-casa rates are uncopyable). Effort **L**.
- **Problem:** `dolar/[departamento].vue:229-231` hard-filters `if (row.code !== 'USD') continue`, so no page answers "real en Rivera hoy" / "peso argentino en Salto", despite `currencyPages.ts:26-42` already mapping real→BRL, peso-argentino→ARS with frontera copy.
- **Deliverables:**
  1. **FIRST fix the accent-dedup bug** in `app/utils/departments.ts:95-138`: `slugifyDepartment` strips accents while `housesInDepartment` matches exact uppercase, so PAYSANDÚ/RÍO NEGRO/SAN JOSÉ/TACUAREMBÓ silently miss casas. Normalize (strip accents) both sides before matching.
  2. Generalize `dolar/[departamento].vue` (or add `[moneda]/[departamento].vue`) to loop USD/BRL/ARS. Ship **ONLY curated combos with ≥3 casas** (verified live): `real-en-rivera` (8), `real-en-rocha` (Chuy, 5), `real-en-cerro-largo` (Río Branco, 4), `real-en-artigas` (3), `peso-argentino-en-salto` (4), `peso-argentino-en-rio-negro`, `peso-argentino-en-paysandu`. Reframe Chuy/Fray Bentos as their departments (Rocha, Río Negro) — they are cities, not departments. **Do NOT** loop all 19 departments × 4 currencies (mints ~200 near-duplicate URLs into the unindexed pile; exotic non-frontier BRL/ARS mirror BROU/BCU).
     - Title (58): **`Real en Rivera hoy: cotización y dónde cambiar reales | UY`**
     - H1: **`Cotización del real brasileño en Rivera hoy`**
     - Desc: **`Real en Rivera hoy: la casa que mejor paga es {Casa} a $X BRL/UYU. Compará las {N} casas de cambio de Rivera y cambiá reales al mejor precio.`**
  3. Gate the new combos into the sitemap via an allowlist in `app/server/api/__sitemap__/urls.get.ts` (mirror the `SITEMAP_CURRENCIES` pattern at line 26 with a curated frontera-department list) — never a blanket cross-product.
  4. Hand-authored **`/pt/cambio-em-rivera`** (pt locale) using a `withdrawCash.ts`-style typed content tree: live best real→peso and dólar→peso at the Rivera casas, the **loja-franca land-border purchase limit (verify US$300/person/month — this is the *land* border figure; US$500 is the air/sea baggage exemption, easy to conflate)**, cartão-vs-dinheiro break-even (~4.4%), "aceita real?" guidance, a map. Internal-link the existing `/pt/historico` and `/pt/sucursales` Rivera pages into it.
  5. Add a Spanish "turistas argentinos: dónde cambiar en Salto, Colonia y Punta del Este" **section** to `/cotizacion/peso-argentino` (not a new URL) naming the cheapest border casa + live ARS.
- **Expected:** +160/qtr (**GUESS** — demand inferred from country aggregates). **Measured:** repackaged pt/border pages (`/pt/sucursales/cambio_fenix/rivera` 3,757 imp) CTR 0.13% → 1%+; new frontera pages indexed + >300 imp by day 90.

**P3c — Opening-hours "abierto ahora"** (habit-forming local intent; grafted from Demand-Capture). Effort **M**.
- **Problem:** "casas de cambio abiertas ahora / cambio 24 horas montevideo / horarios domingo" has no on-site answer, though the data exists in `casasDirectory.ts` horario strings.
- **Deliverables:** add a typed `hours` field + `isOpenNow(America/Montevideo)` helper (parse the existing natural-language horarios). Build `/casas-de-cambio-abiertas-ahora` and `/cambio-24-horas-montevideo` (register in `siteNav.ts`): list currently-open casas ranked by rate with "Abierto ahora / Cierra HH:MM" badges. Add the badge + hours to `sucursales` branch rows.
  - Title (56): **`Casas de cambio abiertas ahora en Montevideo | Cambio UY`**
  - H1: **`Casas de cambio abiertas ahora en Montevideo`**
- **Honest ceiling:** the Google map pack (GBP-owned, proximity-ranked) caps "near me" — this is a blue-link + informational play, not a local-pack takeover. **Expected:** +75/qtr (**GUESS**). **Measured:** indexed + >200 imp by day 90; verify a map pack exists on these queries (P0.3) first.

**P3d — Tools/calculators exposure** (proven-adjacent demand; grafted). Effort **S**.
- **Problem:** 14 calculators are under-linked; `/herramientas/conversor-unidad-indexada` already pulls 5,214 imp with near-zero internal linking = found money.
- **Deliverables:** retitle `app/pages/herramientas/calculadora-spread.vue` → **`Cuánto perdés al cambiar dólares en Uruguay (calculadora de spread)`**; add a homepage "Herramientas" block linking all 14 with keyword-matched anchors; build a "cuánto ahorrás eligiendo la mejor casa" tool (reuse `rankExchanges` + `computeSavings`) as **ONE interactive page**, never per-amount URLs (avoid the refuted `/convertir` thin-page trap); cross-link the strongest guides (comprar-dolares-mejor-precio, casas-de-cambio-vs-bancos, evitar-comisiones-cambio) into P3a.
- **Expected:** +70/qtr. **Measured:** GSC imp on `/herramientas/*` and the spread tool.

**P3e — Guest retention CTA** (grafted from Reset/Demand-Capture; an OWNED-channel lever, **not** organic clicks). Effort **M**.
- Inline **"Avisame cuando el dólar en {Casa} baje de $__"** (email or Telegram, **no forced login**, **double opt-in / confirmation email** for CAN-SPAM/GDPR) placed *after* the SSR answer on `/historico/[origin]/[currency]`, `/dolar-hoy` and the home secondary band; reuse `AlertsPanel` logic. Lazy/below-the-fold (no LCP/CLS risk). **Measured:** subscriber count + direct-return rate, **not** organic clicks.

---

### P4 — Authority & GEO (upside; booked at ~0 direct clicks) + scoped hygiene — impact/effort: **low (but compounding)**

**P4.1 — Historical spread league table** (the "según cambio-uruguay.com" citation asset). Effort **M**. **Fold INTO `/casas-de-cambio`** (not a new `/ranking` URL — avoids cannibalizing the existing live-snapshot spread sort). New Mongo aggregation: median USD spread per casa over 30/90/365 days, sortable, with a **dated, permalinked methodology**. Exclude BROU-mirror + stale/silent casas via the `/estado` signal so the "más cara/más barata" verdict is defensible. Publish a quarterly data-story; pitch to UY finance desks via `docs/backlinks/tracker.csv`. **Book authority at 0 until a link actually lands** (zero editorial links converted to date). Small direct on `mejor casa de cambio uruguay` (~+30/qtr).

**P4.2 — GEO/AI-citation plumbing** (de-scoped per the critic — do the cheap, real parts only). Effort **S–M**.
- Extract a reusable `<AnswerBlock>` component (ExchangeRateSpecification + visible `<time>` + a `<dl>` of best-buy/best-sell with casa names; visible text === schema) and mount on `/`, `/dolar-hoy`, `/historico/*`, `/cotizacion/*` with a matching `SpeakableSpecification` selector.
- Port the `usdHeadline` dated answer block (`index.vue:1006-1027`) to `/dolar-hoy` (currently no prose, no timestamp, only official BCU rates); add `routeRules['/dolar-hoy']={swr:300}` and replace the home's `s-maxage=3600` with `swr:300`.
- Extend `app/components/Updated.vue` (real `/health` `sync.lastSync`) to home, `/dolar-hoy`, `/cotizacion/dolar` and the historico detail, with an explicit HH:MM Montevideo clock.
- **Deprioritize** the Zenodo/Kaggle dataset push and the "quién mueve primero vs BCU" rate-lag story (see §5).

**P4.3 — Scoped hygiene** (grafted from Reset; booked ~0 clicks — a **health** metric). Effort **M**.
- IndexNow: key file in `app/public` + Nitro hook on `blog:daily` publish + a daily batch of live rate pages. **Honest framing: Bing/Yandex only → an AI-answer-engine hedge, NOT a Google-unindexed fix.**
- Fix `/sitemap.xml` (currently an HTML meta-refresh) → real 301 to `sitemap_index.xml` or drop it from robots.txt.
- Optional, low-priority: noindex only genuinely thin single-branch department leaves below an impression threshold (keep demand leaves like `cambio_principal/rivera` 3,354 imp) and trim the ~46 low-value `/convertir` permutations to ~8 round amounts. **If any locale variant is noindexed, its reciprocal hreflang (emitted centrally by `useLocaleHead` in `layouts/default.vue:381`) MUST be stripped in the same deploy via a per-route suppression map** — otherwise the ES cluster is distrusted and DEGRADES. Because this is high-effort/near-zero-payoff with a real backfire mode, **it stays optional and last.**
- News/Discover (gated on content-quality): emit `<news:news>` for posts <48h old in `/news-sitemap.xml`; give `blog/[slug].vue` a named `Person` author + `/acerca` bio + `NewsArticle` schema + distinct `dateModified`. **HARD PREREQUISITE:** make the twice-daily AI posts materially unique (real numbers, chart, source line) first, or they stay unindexed regardless of markup.

---

## 5. What NOT to do

**Refuted findings — do not resurrect:**

- **Mass-prune the 3× en/pt locale mirrors / total crawl surface for "crawl budget."** Refuted — crawl budget is a myth at ~2,000 URLs; pruning yields ~0 clicks; some pt/en pages earn real impressions (`/pt/historico/cambio_principal/brl` 4,189; `/en/convertir/50000-...` 2,837).
- **Add LocalBusiness/FinancialService schema to win the map pack.** Refuted — aggregator schema produces no map pack/rich card and is not a ranking signal; ~0 clicks. (Optional entity hygiene only, and only if the fetch is `useAsyncData` so the ItemList isn't empty in SSR.)
- **Publish the dataset to Zenodo/Kaggle/HuggingFace + Google Dataset Search as a traffic play.** Refuted + critic's #1 waste — Dataset schema already ships; Dataset Search is a negligible-traffic research vertical; repo links mostly nofollow; booked at ~0 clicks by the plan's own hand.
- **The "¿quién mueve primero cuando cambia el BCU?" rate-lag story (L effort).** Refuted/critic waste — no search demand, defamation/accuracy risk on regulated entities, and the cross-house lag analysis doesn't exist in the code (`alignByDate` is a same-day join).
- **Add Santander (or shotgun BBVA/Scotiabank/HSBC) as an "itau-clone."** Refuted — Itaú wins *because* it has a scrapeable public XML feed; Santander's equivalent is login-gated, so there is no source.
- **Abandon all brand + brand-city terms.** Refuted — CTR tracks position, not a blanket map pack (`cambio maiorano` pos 3.98 = 1.78%); move pos-5-8 pages up instead. (Verify the map pack live per P0.3.)
- **A new dated `/dolar-hoy/DD-MM-AAAA` URL every day + NewsArticle.** Refuted — scaled-content/doorway risk minting ~365 near-duplicates/year into the unindexed pile; keep ONE evergreen `/dolar-hoy`.
- **Build a "cuanto esta el dolar" FAQ / answer block "the site lacks."** Refuted — it already ships SSR via `faqAnswers.ts` on the home + historico + `/preguntas-frecuentes`; the query stays ~0% CTR because of position 9 + answer box.
- **Per-amount `/cuanto-pierdo/{amount}` programmatic pages.** Refuted — the ranking is amount-invariant (loss scales linearly), so every page is a near-duplicate; use one interactive tool (P3d).
- **A remittances (Wise/WU/Remitly) fee comparator.** Refuted — the site has no live fee data (only UYU rates); stale fees on a YMYL page are a ranking + liability risk.
- **A widget with a dofollow, keyword-rich "Cotización del dólar en Uruguay" anchor distributed across sites.** Refuted — textbook Google widget-link scheme; use `rel=nofollow` + a brand-only anchor, framed as attribution/referral.
- **Swap pt-PT → pt-BR "to increase traffic."** Refuted — hreflang region is not a ranking signal and there's a single pt variant; it's cosmetic, not a lever.
- **Treat the freshness timestamp / IndexNow as top traffic levers.** Refuted on impact — cheap trust/hygiene, not 300-click movers.
- **Chase the head cluster (`dolar hoy`, `cotizacion brou`, `bcu cotizaciones`, `precio del dolar`) — ~72k imp.** Structurally zero-click (finance widget + BROU/BCU entity). Conceded by design.

**Also do not:** SSR-serialize the `/api/drivers` overlay (perf hygiene, mislabeled as an indexation fix — keep it lazy); count the `/casas-de-cambio` comparativa as "un-built" (it already targets "donde cambiar / comparativa / mejor casa"); or put a volatile live rate in any ≤60-char `<title>` (stale-cached-snippet/trust risk — rate goes in the description, which Google can refresh).

---

## 6. Instrumentation

**GA4 key events (P0.2):** `outbound_click` (primary money-action proxy), `alert_created` `{currency,kind,op,target}`, `newsletter_signup` `{source}`, `where_to_change`, `convert`. Build a **landing-page → key-event Exploration** to see which templates convert.

**GSC checks (P0.3, recurring):**
1. Query `dolar hoy` → Pages tab (home vs `/dolar-hoy` — resolves cannibalization).
2. CTR **segmented by page-type regex** (`^/historico/`, `^/sucursales/`, `^/casa/`, `^/mejor-casa`, `^/(real\|peso-argentino)-en-`) — the aggregate is useless while the tail dilutes.
3. Discover performance tab — baseline + monthly.
4. URL Inspection on a named 15-URL indexation cohort (5 records pages, 5 frontera, 5 hub) at day 30/60/90.
5. Branded-search volume for `cambio uruguay` — the only measurable proxy for the GEO/AI pillar; baseline it now.

**Baselines before shipping:** CrUX (`seo-google`) for `/historico/brou/usd` before P0.4; `seo-drift` snapshot of top-20 URLs before P1.

**30 / 60 / 90-day scoreboard (prove-or-kill thresholds):**

| Day | Workstream | Metric | Prove | Kill |
|---|---|---|---|---|
| 30 | P0 | `/historico/brou/usd` rendered HTML | contains dated answer + `<h1>` + correct per-casa rate | not shipped → block everything |
| 30 | P0 | CrUX INP (historico) | not regressed vs baseline | INP into "poor" → revert blocking fetch, server-compute lede instead |
| 60 | P1 | `/casa/{gales,fenix,principal}` in GSC top-pages | >0 imp, trending up | still ~0 imp → consolidation/link-graph failing |
| 60 | P2 | 15-URL cohort URL Inspection | ≥5 moved to "Indexed" | 0 moved → unique prose insufficient; stop scaling P2 |
| 60 | P3b | frontera pages | indexed + >100 imp | <100 imp indexed → **do not ship the second frontera batch** |
| 90 | P0+P2 | `^/historico/` blended CTR | 1.65% → ≥1.9% | flat → SSR/answer not moving snippets |
| 90 | P1 | brand-cluster blended CTR | 0.31% → ≥0.55% | flat → SERP-feature-capped; redirect effort |
| 90 | P3a | `/mejor-casa-de-cambio` | indexed + >500 imp | <150 imp → decision-hub demand not real; freeze |
| 90 | P3e | subscribers (alert+newsletter) | >40/mo new | <10/mo → retention UX not working |
| 90 | Site | total clicks/qtr | ≥4,300 (+12% floor) | <4,000 → re-baseline the model |

---

## 7. Sequenced backlog — first 10 tasks (one commit each)

1. **Fix the wrong-rate meta bug.** `app/pages/historico/[origin]/index.vue` (origin+type filter on `usdToday`). — *P0.1, S*
2. **Add GA4 `newsletter_signup` + `alert_created` events.** `app/components/NewsletterSignup.vue`, `app/components/account/AlertsPanel.vue`. — *P0.2, S* (then mark 5 key events in the GA4 UI — manual)
3. **Run the P0.3 verification checks** (GSC `dolar hoy`→Pages; map-pack live SERP; Discover baseline; CrUX + seo-drift snapshots). No code — record results in `docs/seo/`. — *P0.3, S*
4. **Convert historico detail to blocking SSR + add `<h1>` + dated answer block.** `app/pages/historico/[origin]/[currency]/[[type]].vue`; load-test TTFB/INP after. — *P0.4, L*
5. **Port origin-filtered live-rate into the detail description (es/en/pt).** `app/i18n/locales/json/es.json` (+ en/pt). — *P0.4, S*
6. **SSR ExchangeRateSpecification + remove the $0 Offer blocks.** `app/pages/index.vue`, `app/components/ToolShell.vue`, `app/plugins/seo-utils.ts`. — *P0.5, S*
7. **Fatten `/casa/[origin]` + retitle the 4 sibling templates by intent + canonical the billete/cable/interbancario variants.** `app/pages/casa/[origin].vue`, `app/i18n/locales/json/es.json`, `app/pages/historico/[origin]/[currency]/[[type]].vue` (canonical). — *P1.1/P1.2, M*
8. **Add the up-link to `/casa/[origin]` from the historico currency leaf + the top-20-casas homepage block.** `app/pages/historico/[origin]/[currency]/[[type]].vue`, `app/pages/index.vue`. — *P1.3, M*
9. **Add `computeStreaks` + all-time query + "Récords y rachas" block, with `/estado` outlier guards + BROU-mirror canonicalization.** `app/utils/rateStats.ts`, new server query, `app/pages/casa/[origin].vue`, `app/pages/historico/[origin]/[currency]/[[type]].vue`, `classes/cambios/cambio_romantico.ts`. — *P2, M*
10. **Fix the accent-dedup bug in departments, then ship `/mejor-casa-de-cambio` + register it in nav.** `app/utils/departments.ts`, new `app/pages/mejor-casa-de-cambio.vue`, `app/utils/siteNav.ts`. — *P3a + P3b prerequisite, M* (unblocks the frontera batch as task 11)

**Concurrency note (from repo memory):** multiple Claude/worktree sessions run on this repo in parallel and `app/` must not be mutated mid-build. Re-check `main` immediately before merging each commit, register every new page in `siteNav.ts` (or the coverage test fails), and land tasks 1–6 (foundation) before any P1–P3 page work, since they determine whether the new pages are correct and indexable.

---

**Key file references (open-and-execute):** `app/pages/historico/[origin]/index.vue:563-568` · `app/pages/historico/[origin]/[currency]/[[type]].vue:15,366-373,523-531,1047-1076` · `app/pages/casa/[origin].vue:270-293,348-393` · `app/pages/sucursales/[origin]/[[location]].vue:216-241,306-343` · `app/pages/index.vue:466,725-806,1006-1027,1845-1851,2008-2036` · `app/pages/dolar-hoy.vue:1-71,128-144` · `app/pages/dolar/[departamento].vue:229-231` · `app/utils/departments.ts:95-138` · `app/utils/currencyPages.ts:26-42,107-108` · `app/utils/faqAnswers.ts:126-135` · `app/utils/recommendation.ts:83-137` · `app/utils/rateStats.ts:41,77` · `app/utils/siteNav.ts:468-469` · `app/components/Updated.vue` · `app/components/NewsletterSignup.vue:58-70` · `app/components/account/AlertsPanel.vue:~169` · `app/server/api/__sitemap__/urls.get.ts:20-26,147-149,184` · `app/i18n/locales/json/es.json:643,651-652,725,746` · `app/layouts/default.vue:381` · `classes/cambios/cambio_romantico.ts`.