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

Every aggregation goes through one helper, `aggregateRentals(role, pipeline, allowDiskUse)`, which
chains `.allowDiskUse(bool).option({ maxTimeMS, comment: 'rentals:<role>' }).collation(RENTAL_COLLATION)`.
The comment is what lets mongod's slow-operation log count the passes by role after a deploy.

| role | what it reads | `maxTimeMS` | disk | when |
| --- | --- | --- | --- | --- |
| `keys` | the whole search, projected to the key and the sort keys only, sorted, `$skip`/`$limit` of the page | 20,000 | yes | `all`, `items` |
| `cards` | the page's documents by `key: {$in}` (index `rental_key_es_v1`), the route's own single-pass pipeline on page 1 | 10,000 | no | after `keys`, only if it returned a key |
| `facet` | the whole search: count, types, sources, max price, median, and the department/barrio counts when their filter is the search's own | 20,000 | no | `all`, `facets` |
| `dept` | the search without its location, grouped by department | 20,000 | no | `all`, `facets`, when the search has a location filter (its filter differs from the search's own without location: a department, a barrio or an excluded barrio) |
| `barrio` | the search without its barrio choice, grouped by barrio | 20,000 | no | `all`, `facets`, when the search filters by barrio (a barrio chosen, or one excluded) |
| `legacy` | today's single pass (whole search, whole card, sorted, paged) | 20,000 | yes | only as the fallback below |

So a barrio-only search runs `dept` too, and the filters drawer's `parts=facets` request for a
department (it reads only the barrio list) runs `facet` + `dept`: the barrio counts fold into the
facet pass because that search has no barrio, while the department counts do not because it has a
department.

The coverage of the catalogue (`getRentalCoverage`, `server/utils/rentalCoverage.ts`) is read in
`all` responses only.

### Keys, then cards

`server/utils/rentalDirectoryOrder.ts`:

- `rentalSortKeyProjection(query)`: `{ _id: 0, key: 1 }` plus every key of `rentalMongoSort(sort)`,
  with the recency expressions of `rentalRecentSortProjection` (homes-first tier, hour, hash of the
  key) or `1` for a field the stages before already computed. Every `$sort` key has to survive this
  projection: a missing one sorts as null and the order silently falls to the next key.
- `rentalDirectoryKeysPipeline(query, publicStages, offerStages, { skip, limit, count })`: the same
  public and offer stages as the single pass, the distance stages only for the distance sort and
  the per-m² stages only for that sort (both only `$set`), the projection, then `$sort`, `$skip`,
  `$limit`, `{ key }`. With `count` the tail is one `$facet` `{ n, keys }` (not used by the route
  yet).
- `rentalDirectoryCardsPipeline(query, publicStagesForKeys, offerStages, n, itemsPipeline)`: the
  route's exported `rentalDirectoryItemsPipeline`, unchanged, on `{ page: 1, perPage: n }`, over
  `rentalDirectoryCardsStages(publicStages, keys)`: the keys pass's OWN public stages with
  `key: { $in: keys }` added to their first `$match` (the indexed prefilter) and their last (the
  whole filter), everything in between kept by reference. Never a second `rentalPublicStages` call:
  it computes the current-offer cutoff from the clock, and a cards pass that started after midnight
  UTC would drop an offer seen exactly on the old cutoff day — the cheaper one the keys pass placed
  the property by — and show another price at that position. The builder is passed in rather than
  imported so the util does not load a route file. Same stages, so a card cannot differ from the
  card the single pass returned.
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

- A `keys` or `cards` pass that fails with anything but `MaxTimeMSExpired` (code 50): the route
  logs `[api/rentals] fallback` and runs the `legacy` single pass once. Kept for one release.
- `MaxTimeMSExpired` in any pass, or a failed fallback, or a failed facet pass: `503` with
  `cache-control: no-store`, as before. A saturated database is not given a second full pass.

## `parts`

`app/utils/rentalDirectoryParts.ts`, `normalizeRentalDirectoryParts(v)`: `items`, `facets`, anything
else is `all`.

| `parts` | passes | response |
| --- | --- | --- |
| `all` (default) | `keys`, `cards`, `facet` (+ `dept`, `barrio`), coverage | `RentalsResponse` (`app/utils/rentals.ts`), unchanged shape |
| `items` | `keys`, `cards` | `{ parts: 'items', items, total: null, page, perPage }` |
| `facets` | `facet` (+ `dept`, `barrio`) | `{ parts: 'facets', total, medianUyu, facets }` |

`items` carries `total: null` for now: the count rides the facet pass, which `items` skips. The
page already holds page 1's count.

Callers in the page (`app/pages/alquileres-uruguay.vue`): the infinite scroll's `fetchPage` asks
for `parts=items`; `loadNeighborhoods` (the barrio list of another department in the filters)
asks for `parts=facets` instead of a six-card page. Every other caller (SSR of the page, MCP,
`/api/datos/alquileres`, `/api/directorios`) asks for the whole response.

## Outer memo

`defineCachedEventHandler` with the same options as before (`maxAge` 300 s, `staleMaxAge` 3600 s,
`swr`, bypassed in development and when `availabilityRevision` is present). Its key,
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

The warm-up task (`rentals:directory-warm`, :51 and :56) warms `{}`, Montevideo, Canelones,
Maldonado and `{ page: '2', parts: 'items' }`, which lands on `items_page=2`, the key the scroll's
request for page 2 mints.

## Not changed here

The derivation (`rentalPublicStages`, `rentalOfferStages`), the filter (`buildRentalFilter`, shared
with the map), the facet pipelines, the card projection, the response shape of `all`, indexes and
the map route.
