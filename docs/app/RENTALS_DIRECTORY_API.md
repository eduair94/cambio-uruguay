# Rentals directory API — `GET /api/rentals`

The list of `/alquileres-uruguay` (and of the MCP's rental tools, `/api/datos/alquileres` and the
directory hub) is one route: `app/server/api/rentals/index.get.ts`. This page says which passes it
runs against `rentallistings`, what each one costs, and what each part of the response contains.
The map (`/api/rentals/mapa`) is a separate route and is not described here yet.

## Why it is shaped like this

Every pass that reads the search runs `rentalPublicStages` first (`app/utils/rentals.ts`): it
re-derives each property's current offers, sources, freshness and price before anything can filter
on them, so it cannot use an index past the location and specification prefilter. Each such pass
is a scan of the public inventory (~89,700 documents, ~71,900 public on 2026-11-20).

Until 2026-11-20 the page was one pass that carried each public property's whole card (95
projected paths) into Mongo's blocking sort, and a scroll page also paid the facet pass it did not
read. Measured from outside that day (uncached GETs, browser user agent): `/api/rentals?page=5`
took 8.0 s on its first request and ~4.3 s after; a filtered search 1.4–5.0 s.

## The passes

Since P5 (2026-11-20) the route issues no aggregation itself: everything that reaches
`rentallistings` lives in `server/utils/rentalDirectoryData.ts`, behind the per-worker memo
(`server/utils/rentalMemo.ts`). Every aggregation goes through one helper there,
`createRentalDirectoryAggregate`, which chains disk use, then
`.option({ maxTimeMS, comment: 'rentals:<role>' })`, then the collation (`RENTAL_COLLATION`, last).
The comment is what lets mongod's slow-operation log count the passes by role after a deploy.

| role     | what it reads                                                                                                                                                                                         | `maxTimeMS` | disk | memo                                                            | when                                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `win`    | the whole search, projected to the key and the sort keys only, sorted; the 480 keys (`perPage × 20`) of one window, and for windows 0–4 the count of the search in the same pass (`$facet {n, keys}`) | 20,000      | yes  | `win`, per search and window                                    | `all`, `items`, when the window is not stored                                                                         |
| `cards`  | the page's documents by `key: {$in}` (index `rental_key_es_v1`), the single-pass pipeline on page 1                                                                                                   | 10,000      | no   | never: read on every request                                    | after the window, only if the page has a key                                                                          |
| `facet`  | the whole search: count, types, sources, max price, median, and the department/barrio counts when their filter is the search's own                                                                    | 20,000      | no   | `facet`, per filter (the order and the page are not part of it) | `all`, `facets`                                                                                                       |
| `dept`   | the search without its location, grouped by department                                                                                                                                                | 20,000      | no   | `dept`, under the search without its location                   | `all`, `facets`, when the search has a location filter AND the facet of the search without its location is not stored |
| `barrio` | the search without its barrio choice, grouped by barrio                                                                                                                                               | 20,000      | no   | `barrio`, under the search without its barrio                   | `all`, `facets`, when the search filters by barrio AND the facet of the search without its barrio is not stored       |
| `legacy` | today's single pass (whole search, whole card, sorted, paged)                                                                                                                                         | 20,000      | yes  | never                                                           | only as the fallback below                                                                                            |

The coverage of the catalogue has no pass any more: see "Coverage" below.

### Windows (`win`)

A page `p` of `perPage` cards is in window `w = ⌊(p − 1) / 20⌋`, at offset
`((p − 1) mod 20) · perPage`. A window holds `perPage × 20` keys (480 at the default 24, ≈ 35 KB
of memo), each built as the keys pass with `skip = w · W`, `limit = W`. So a scroll page served from
a stored window costs the cards pass alone (24 documents by key), and the whole search is sorted
once per window and worker, not once per page.

- Windows 0–4 (pages 1–100) carry their own count `n`, from the same pass as their keys.
- A page of window 5 or later reads window 0 first (with its count), is clamped by that count
  (below) before anything else runs, and only then builds its own window without a count, storing
  window 0's `n`.
- `total` of `all` and `items` is the `n` of the window that served the page (window 0's for
  `w ≥ 5`): the page count and the pages come from one snapshot, and `items` never reads a facet.
- **Clamp.** With `n` known (for `w ≥ 1` also from a stored window 0–4 of the search, window 0
  first, without building anything), a page past `max(1, ⌈n / perPage⌉)` answers `items: []` with
  that total and runs no further pass. So a crafted `page=10000` (the most `normalizeRentalQuery`
  accepts) costs at most one window-0 build per worker and TTL, and two identical such requests at
  most one aggregation in total.
- **A window is never older than the window before it.** The key of window `w ≥ 1` ends in
  `@<builtAt of window w − 1>` (`@0` when that one is not stored; `windowKeys` in
  `server/utils/rentalDirectoryData.ts`), so rebuilding window `w − 1` (its TTL, or the warm-up at
  :51 and :56, which forces window 0 only) changes window `w`'s key and window `w` is rebuilt after
  it, down the chain. Without it, window 1 built at :44 and window 0 rebuilt at :51 after the :47
  harvest put 30 homes on top skipped old positions 450–479 at the page 20 → 21 boundary
  (review of 2026-11-20; test "never skips a property at a window boundary…" in
  `tests/unit/rentalDirectoryData.test.ts`). With a newer window `w`, a property added on top is a
  repeat at the boundary, which the feed drops by key. A property REMOVED from above the boundary
  between the two builds can still shift one past it, as between any two offset pages; the
  clamp's peeks use the same chained keys.
- No server prefetch of the next window.

### Facets (`facet`, `dept`, `barrio`)

One `facet` entry per filter (`{ total, medianUyu, types, sources, priceMaxUyu }` plus
`departments`/`neighborhoods` when they fold into it). A located search reads its department counts
from the facet entry of the same search without its location (`widenRentalLocation`), and its
barrio counts from the one without its barrio (`widenRentalBarrio`), when that entry is stored; a
stale one is served and refreshed in the background. That is exact, not an approximation:
`buildRentalFilter(widen(q)).filter` is `buildRentalFilter(q).nonLocation`, and
`buildRentalFilter(widenBarrio(q)).filter` is `.withoutNeighborhood`
(`app/tests/unit/rentalDirectoryData.test.ts` checks both over a matrix of 14 searches). Only
without it the `dept`/`barrio` pass runs, memoised under the wider search, so every barrio of
Montevideo shares one department entry. Pocitos by price, with the directory's and Montevideo's
facets stored, costs its own facet pass and nothing else.

### Coverage

The coverage of the catalogue (`coverage` in `all` responses) is the default search's facet entry
(`rentalCoverageFromFacet`, `server/utils/rentalCoverage.ts`): `{ computedAt: when that facet was
read, properties: its total, sources: every portal with its count }`. The default search has no
filter and its availability (`all`) never excludes an advert, so its public stages are exactly the
old coverage pass's (`app/tests/unit/rentalsCoverage.test.ts` compares them on the pipeline the
module issues). The 2.06 s coverage pass, every minute on every worker, is gone from the request
path. While the entry is absent (the first seconds of a fresh worker) the answer carries the last
coverage this worker computed, or `null` (allowed by the type), and the default facet is built in
the background slot, at most once a minute.

### Keys, then cards

`server/utils/rentalDirectoryOrder.ts`:

- `rentalSortKeyProjection(query)`: `{ _id: 0, key: 1 }` plus every key of `rentalMongoSort(sort)`,
  with the recency expressions of `rentalRecentSortProjection` (homes-first tier, hour, hash of the
  key) or `1` for a field the stages before already computed. Every `$sort` key has to survive this
  projection: a missing one sorts as null and the order silently falls to the next key.
- `rentalDirectoryKeysPipeline(query, publicStages, offerStages, { skip, limit, count })`: the
  same public and offer stages as the single pass, the distance stages only for the distance sort and
  the per-m² stages only for that sort (both only `$set`), the projection, then `$sort`, `$skip`,
  `$limit`, `{ key }`. With `count` the tail is one `$facet` `{ n, keys }` (windows 0–4).
- `rentalDirectoryCardsPipeline(query, publicStagesForKeys, offerStages, n, itemsPipeline)`: the
  single pass `rentalDirectoryItemsPipeline` (in `rentalDirectoryOrder.ts` since P5, re-exported by
  the route), unchanged, on `{ page: 1, perPage: n }`, over
  `rentalDirectoryCardsStages(publicStages, keys)`: the keys pass's OWN public stages with
  `key: { $in: keys }` added to their first `$match` (the indexed prefilter) and their last (the
  whole filter), everything in between kept by reference. Never a second `rentalPublicStages` call:
  it computes the current-offer cutoff from the clock, and a cards pass that started after midnight
  UTC would drop an offer seen exactly on the old cutoff day — the cheaper one the keys pass placed
  the property by — and show another price at that position. Same stages, so a card cannot differ
  from the card the single pass returned. Since P5 the window can be minutes old (the memo's TTL)
  while the cards are read now: a card is always today's card, at a position at most one TTL old.
- `orderByKeys(rows, keys)`: the cards in the keys pass's order. A key the cards pass no longer
  returns (the hourly harvest wrote between the two passes) is dropped: the page is one card short,
  never a wrong card.

Measured on production during the design (2026-11-20, read-only, median of 3): default page 5,
keys pass 2,353 ms against ~4,000 ms for the single pass; cards pass 10 ms (24 documents, IXSCAN on
`rental_key_es_v1`); the 24 rows identical to the single pass's on the two searches compared.
Re-measured on this code before merging (production, read-only, 2026-11-20, 1-minute load 9.8–18.8
on 32 cores): 264 cases (the eight sorts × eight filters × pages 1, 2, 5 and the last, plus eight
more searches) gave the same key sequence and deep-equal rows as the single pass, all 264; the
default page 5 keys pass took 2,438 ms (median of 3) against 4,136 ms for the single pass, and the
cards pass 3–14 ms (slowest run 18 ms, IXSCAN `rental_key_es_v1`, 24 documents examined). Some
other sorts' keys pass is still at 2.7–3.2 s on a single run (by total, by distance, a last page):
the whole search is still derived and sorted, only lighter.

The equality is tested, not assumed: `app/tests/unit/rentalDirectoryOrderMongo.test.ts` runs the
route file twice per page over synthetic `$documents` fixtures (both answers from the route itself:
the two passes, and the single pass as its fallback) for the eight sorts × twelve filters × pages
1, 2 and the last, and requires deep-equal rows. It needs `RENTALS_TEST_MONGO_URI` pointing at a
disposable local MongoDB ≥ 6, so CI skips it.

### Failure

- A memo build that fails, or that the memo refuses (`RentalMemoBusyError`: its build queue is
  full or would not finish within 8 s), while the key holds an entry younger than an hour: that
  entry, as `stale`. Nothing failed is ever stored.
- Without such an entry, a `win` or `cards` pass that fails with anything but `MaxTimeMSExpired`
  (code 50): `[api/rentals] fallback` is logged and the `legacy` single pass runs once; `total` is
  then the facet's for `all` and `null` for `items`. Kept for one release.
- `MaxTimeMSExpired` in any pass, a refused build without an entry, a failed fallback, or a failed
  facet pass: `503` with `cache-control: no-store`, as before. A saturated database is not given a
  second full pass.

### Freshness

TTL only, no generation in any key (`server/utils/rentalMemo.ts`): an entry is fresh for
270–330 s, served stale while one background refresh runs, and never served past 15 minutes from
its build while the database answers (only a failed or refused rebuild falls back to an entry up to
an hour old). That bound is the inner entries'. The outer `all` answer (below) is Nitro SWR with no
server-side age bound: with `swr: true` Nitro stores the entry without a TTL and, on read, returns
an expired entry at once and revalidates it in the background
(`nitropack/dist/runtime/internal/cache.mjs`, 2.13.4, lines 70 and 83–95); `staleMaxAge` only
writes the `stale-while-revalidate` header (lines 272–273). So the first `all` request after a quiet
spell of any length gets the last stored answer, whatever its age, and starts one background
rebuild. An hour as a real bound would need a code change (for example, the outer wrapper checking
the stored answer's age and bypassing past 3600 s); not done in P5, and true before P5 too. Neither the UTC cutoff day nor the exchange rate is in a key, so midnight and the :47
harvest empty nothing at once. The hidden adverts of the reader's availability filter and the
service zones ARE in every key, so a report shows on the next request.

## `parts`

`app/utils/rentalDirectoryParts.ts`, `normalizeRentalDirectoryParts(v)`: `items`, `facets`, anything
else is `all`.

| `parts`         | lookups (each a pass only on a memo miss)                                        | response                                                    |
| --------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `all` (default) | window, `cards`, facet (+ departments, barrios), coverage from the default facet | `RentalsResponse` (`app/utils/rentals.ts`), unchanged shape |
| `items`         | window (window 0 first past page 100), `cards`                                   | `{ parts: 'items', items, total, page, perPage }`           |
| `facets`        | facet (+ departments, barrios)                                                   | `{ parts: 'facets', total, medianUyu, facets }`             |

`items` carries the window's count (`null` only after the fallback) and never calls a facet
function, so a page on the worker that does not hold the search waits for one window pass, never a
facet pass. For `all` the window, the facet and the sub-facets are looked up in parallel and the
cards pass waits only for the window.

Callers in the page (`app/pages/alquileres-uruguay.vue`): the infinite scroll's `fetchPage` asks
for `parts=items`; `loadNeighborhoods` (the barrio list of another department in the filters)
asks for `parts=facets` instead of a six-card page. Every other caller (SSR of the page, MCP,
`/api/datos/alquileres`, `/api/directorios`) asks for the whole response.

## Outer memo

`defineCachedEventHandler`, for whole (`all`) answers only: `maxAge` 60 s (300 s before P5; a
rebuild from inner hits costs about 40 ms), `staleMaxAge` 3600 s and `swr` unchanged, bypassed in
development, when `availabilityRevision` is present, and for `parts=items`/`parts=facets` (they are
slices of the inner memo, and storing each scroll page added an ≈ 85 KB entry to Nitro's unbounded
memory driver) **while the inner memo is on**. With `"memo":"off"` in `.data/flags/rentals.json` the
inner memo stores nothing, peeks nothing and skips the semaphore, so the parts go through the outer
memo again, as before P5: otherwise the switch meant to restore known-safe behaviour would cost
every scroll page its counted window pass (a full scan) with no admission control. Its key,
`rentalDirectoryCacheKey` (`server/utils/rentalDirectoryWarm.ts`), is the normalised search
(`default` when empty) and, when not `all`, that string with the part as a PREFIX: `items_page=2`,
`facets_department=Montevideo`. So an items-only or facets-only answer never answers a request for
the whole page, nor the reverse.

It is a prefix and not a trailing `&parts=` because Nitro stores the entry under the key with every
non-word character stripped (`escapeKey`, `/\W/g`): `department=Montevideo&parts=facets` and a
whole request for a department typed as "Montevideo parts facets" both became
`departmentMontevideopartsfacets`, so one crafted URL could serve a 0-result answer to the drawer,
`items: []` to the scroll, or an answer without `facets` to the page's SSR, for five minutes. A whole
key always starts with a parameter name of `rentalQueryToParams` (`availability`, `q`,
`department`, …) or is `default`, and none starts with `items` or `facets`
(`app/tests/unit/rentalDirectoryWarm.test.ts` applies the escape to both keys of each pair).

## Headers of the memo

Every answer carries `x-rentals-memo` and `x-rentals-worker` (`NODE_APP_INSTANCE`, `na` outside
pm2), set by the outer wrapper and never inside the cached handler (Nitro replays a cached
handler's headers on a hit). `x-rentals-memo` lists the inner lookups of the request in the order
they resolved (`win=hit`; `win=miss,win=miss` for a deep page that built window 0 and its own;
`facet=miss,facet=hit` for the drawer of a department whose wider facet is stored), or `outer=hit`
when Nitro's outer memo answered and no inner lookup ran (a stale outer answer revalidated in the
background also says `outer=hit`: its lookups are handed over only when that run ends). They are
for the after-deploy classification of samples, never for the browser; neither value is personal.

## Warm-up

The list is `{}`, Montevideo, Canelones and Maldonado (`RENTAL_DIRECTORY_WARM_QUERIES`; the scroll
page 2 left it in P5: `parts=items` no longer goes through the outer memo, and its window is the
entry page 1 warms). For each, in order and one at a time: the inner memo's window 0 and facet,
forced and in the background slot (`rentalDirectoryData.warm`), then `$fetch('/api/rentals')` for
the outer memo (`rentalDirectoryWarmFetcher`).

- The task `rentals:directory-warm` runs it at :51 and :56, after the :47 harvest.
- The plugin `server/plugins/rental-directory-warm.ts` runs it once at boot, `5 s + instance × 25 s`
  after start, with a one-shot `unref`ed timer (no interval: the API process runs no recurring
  scheduler), so a `pm2 reload` does not leave the first visitors on cold workers. Never in dev,
  prerender, tests or the deploy preflight (`rentalDirectoryBootWarmDelay`: `scripts/check-staging.cjs`
  forks the candidate build with `NODE_ENV=production`, `CU_DEPLOY_PREFLIGHT=1` and no
  `NODE_APP_INSTANCE`; without the guard every deploy would send whole-inventory passes to
  production from the probe process).

## Not changed here

The derivation (`rentalPublicStages`, `rentalOfferStages`), the filter (`buildRentalFilter`, shared
with the map), the facet pipelines, the card projection, the response shape of `all`, indexes and
the map route. Not yet measured on production for P5: the window with its count against the same
window without it (the spec's gate is ≤ 1.15×; if it costs more, `n` falls back to the facet
total), the parallel factor of a cold request's window and facet builds, and the latency of a warm
scroll page.
