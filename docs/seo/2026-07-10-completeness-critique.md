# Completeness critique — adversarial review of the growth plan

_Companion to [2026-07-10-organic-growth-plan.md](./2026-07-10-organic-growth-plan.md). This is the critic agent's unedited output; the plan already incorporates it._

Ruthless completeness critique. Where I cite, I use the corpus's own file:line and GSC figures.

## 1. What was not investigated that materially affects traffic

**Google Maps / the local pack was asserted, never observed.** The diagnosis repeatedly explains away low CTR on brand+city queries ("cambio principal rivera" 1,252 imp/0.08%, "cambio gales" split across leaves) by invoking a map pack that "absorbs the click" — but *nobody ran a single live SERP for those queries to confirm a map pack is even present*, and nobody looked at whether the casas have Google Business Profiles at all. The `seo-maps` and `seo-local` skills exist and were not used. This matters because two "critical" findings (the LocalBusiness/ItemList schema push and the "abandon brand+city terms" recommendation) both hinge on an unverified map-pack assumption. If there is *no* map pack on "cambio maiorano" (which already converts at 1.78%, pos 3.98), the whole "navigational is unwinnable" thesis is wrong for a slice of the brand cluster.

**Google Discover was never measured.** The corpus has the Search-performance export but not the **Discover performance report** — a separate GSC tab. For a daily-updating finance site in a single country, Discover can dwarf classic search, and the entire freshness/news pillar (48 daily AI posts, news-sitemap) is justified by a Discover upside *that was never quantified from the data that already exists in the property.*

**No competitor backlink data.** The whole authority thesis — "editorial links are what let head terms rank" — was argued without pulling a single competitor's referring-domain profile. Nobody asked *why* dolaruruguay.uy outranks the site: is it DA, links, age, or freshness display? `seo-backlinks` was available (free Moz/Common Crawl tier). Without competitor link data the "backlink engine" pillars are flying blind.

**No CrUX / Core Web Vitals field data.** Multiple plans recommend converting the top-traffic template from `useLazyAsyncData` to blocking SSR (raising TTFB on the busiest route), and one finding warns this "can hurt INP/CWV" — yet nobody pulled the actual CrUX field baseline. You are about to make the site's biggest page slower with no idea whether it's already in the "poor" bucket.

**No Bing Webmaster data.** IndexNow is recommended to feed Bing→ChatGPT, but nobody checked Bing's actual index coverage or query data — the one place you'd validate the "AI-answer-engine hedge."

## 2. The load-bearing claim still unverified — and the one check

**Claim:** the homepage (not `/dolar-hoy`) is the URL ranking for "dolar hoy," the two cannibalize, and the ~72k head-term pool is answer-box-suppressed at *any* rank. Nearly every "concede the head terms" decision and the entire cannibalization architecture rests on this. The corpus repeatedly excuses itself with "GSC gives no page×query intersection" — **that is false.** In GSC Search Analytics you filter by the exact query `dolar hoy` and open the **Pages** tab; it returns precisely which URLs took the impressions and their per-URL position. **That single filtered query settles** (a) whether home or `/dolar-hoy` ranks, (b) whether they truly co-rank (cannibalization) or Google already consolidated, and (c) the real position — which tells you if 0.05% CTR is an answer-box floor or just a pos-9 artifact. It is a two-minute check that was skipped, and three or four "critical/high" findings depend on its answer.

## 3. Strongest argument against the consensus winner

The winner (Data-Moat) won on **split decisions** (7.85 vs 7.30; 8.05 vs 8.00; and one judge *picked Demand-Capture* 7.73 over 7.60). The killer argument: **the pillars that differentiate Data-Moat from the two losers are exactly the ones booked at ~0 clicks.** Its click engine — Pillar 1 (bug fix + SSR), Pillar 2 (systematize historical), Pillar 3 (decision hub) — is *shared verbatim* with both losing plans. What's unique to it, Pillar 4 (spread league table) and Pillar 6 (dataset/DOI/Dataset Search), the verified diagnosis **refuted** and the plan itself concedes produce ~0 direct clicks, resting entirely on journalist outreach that "has converted zero editorial links to date." So the plan won on a *defensibility narrative* (scored 8.5–9) that, by its own traffic model, produces nothing measurable in 90 days — while Demand-Capture's differentiators (opening-hours "abierto ahora"; surfacing the 14 calculators, one of which already pulls 5,214 imp with near-zero internal linking) are **proven-adjacent net-new demand the winner omits entirely**, and it scores far higher on feasibility (8.5 vs 6.5) for a one-person team. The safer, higher-EV bet for the actual 90-day window is the runner-up.

## 4. What a competitor does to beat this plan

The moat protects *historical facts*, but ~90% of the traffic model is *current-rate* clicks. A competitor ignores the archive and attacks the click engine: (1) **clone the "cheapest casa today, ahorrás $X" leaderboard in a weekend** — the plan admits the template is copyable — and out-execute on the visible freshness stamp and GBP/citation signals; (2) **go buy the editorial links** the plan hopes to earn for free, instantly winning the authority race the plan's volunteer outreach has lost 0-for-however-many; (3) **kill the /historico/itau (4.50%) and /historico/prex (6.08%) anomaly at the source** — those convert only because no official rate page competes. Itaú already publishes a public XML feed (`itau.com.uy/inst/aci/cotiz.xml`); a competitor partnering with Prex/Itaú for an official rate page, or those institutions launching one, evaporates the site's two best converters overnight. The plan has no defense for that single-point-of-failure.

## 5. Measurement gaps — you could not tell in 90 days if it worked

**GA4 has zero key events**, so today you cannot attribute a single money-action (outbound-to-casa, alert, signup) to any landing page. This is the foundational gap: without marking `outbound_click`, `alert_created`, `newsletter_signup` as key events (the `alert_created` payload is `{currency,kind,op,target}`, not per-casa — corrected in the diagnosis), *nothing else in the plan is judgeable*. Beyond that, missing:
- **No pre-ship seo-drift baseline snapshot** — the consolidation/canonical work produces a J-curve dip, and without a baseline you can't distinguish reprocessing noise from a real regression.
- **No CrUX baseline** — SSR-blocking changes could regress INP and you'd never trace which deploy did it.
- **No branded-search KPI** — the GEO/AI pillar's *only* measurable proxy is "cambio uruguay" query volume in GSC; nobody defined or baselined it.
- **No named cohort to watch for indexation** — the core bet is "unique SSR prose flips 'Crawled – not indexed' to indexed." Nobody listed the specific URLs to URL-Inspect at day 30/60/90 to confirm it.
- **No week-6 validation instrument for inferred demand** — both plans *say* "validate frontera/decision demand before scaling" but define no saved GSC query filter or sheet to do it.

## 6. Highest-leverage actions, and the one waste

**Highest leverage:**
1. **Convert the top-traffic `/historico/[origin]/[currency]` numbers from client-only `useLazyAsyncData` to blocking SSR + add the missing `<h1>` + a dated answer block** (`[[type]].vue`, currently 0 `<h1>`, emoji `<h2>` at line 15). This is the single structural unlock: it makes the 64,559-imp page's content crawlable/AI-citable *and* every downstream pillar (frontera, decision hub, records) is only indexable because of it. (Pair with the CrUX baseline from §5.)
2. **Fix the confirmed wrong-rate meta bug** (`historico/[origin]/index.vue:563-568`, unfiltered `usdToday` stamps identical `$37,15/$39,55` on ~40 casas). Near-zero effort, fixes a live E-E-A-T/correctness defect. Best effort:risk ratio in the corpus.
3. **Instrument the three GA4 key events** — cheap, and it is the precondition that makes the other 89 days measurable.

**Most likely waste of time:** the **dataset-to-Zenodo/Kaggle/HuggingFace + Google Dataset Search push** (Data-Moat Pillar 6 / the offpage-authority finding). The verified diagnosis refuted it on every axis: Dataset schema *already ships* (`index.vue:2008`, historico `1047`), Dataset Search is a negligible-traffic research vertical for consumer FX queries, the repo links are mostly nofollow, and the site's best queries already win *without* it — it's booked at ~0 clicks by the plan's own hand. Runner-up waste: the L-effort **"¿quién mueve primero vs BCU?" rate-lag story** — no search demand, defamation/accuracy risk on regulated entities, and it depends on a cross-house lag analysis that doesn't yet exist in the code.