# Rental reference point and address search

Implemented 2026-09-07 for `/alquileres-uruguay`.

The user can choose a point in the map or explicitly submit an address/intersection, inspect the
official candidate, and confirm the point. Choosing a reference is a presentation preference: it
does not impose a radius, change active property/offer filters, exclude unlocated adverts, or change
the search count, coverage, facets and base-rent median.

The address lookup is independent of the rental department filter. A user looking for homes in
Canelones can choose Hocquart and Democracia in Montevideo as their reference without changing
the home search. Arriving map results never reframe an explicitly selected point or interrupt
point selection.

## Query and distances

- `refLat` and `refLng` are a strict finite pair within the existing Uruguay map bounds, normalized
  to five decimal places. Invalid pairs are discarded together. `sort=distancia` without a valid
  point falls back to `recientes`.
- Optional `refLabel` is plain text, at most 160 characters, retained only with a valid point.
- The point, label and sort survive shared URLs and locally saved searches. Subscriptions ignore
  them as presentation, while retaining all actual criteria (including property types and existing
  hospital-radius filters).
- `distanceKm` is approximate straight-line distance, not walking/driving distance or time. The
  server calculates it after filtering current offers and before projection, sort and pagination.
  It remains visible if the user changes to another ordering while keeping the reference.
- Distance uses the same ownership evidence as nearby services: an active `identity.version: 1`
  advert must own the exact property point, without `addressHidden`, and no visible own point may
  contradict it by over 100 m. Legacy/group-only points, hidden points and malformed coordinates
  yield `null`, never zero. A real point exactly at the reference remains distance zero.
- Unknown distances sort last with a stable property-key tie-break. They remain in the list. The
  existing map only draws rows with coordinates, and retains its separate `total`/`located` counts.
- Rich source descriptions, galleries and private identity evidence are projected out before
  Mongo's blocking sort. Only the optional scalar distance is public; temporary sort keys are not.
  List and map sorts may spill to temporary disk storage after that projection: the final page of
  a large catalogue must retain far more sort rows than page one and can exceed Mongo's 100 MiB
  memory limit even with the compact public projection.

No collection migration or new geospatial index is required. Arithmetic is protected with Mongo
`$cond`; sibling `$and` guards alone cannot prevent malformed historic Mixed data causing a 500.

The list and map aggregate explicitly enable `allowDiskUse(true)` after retaining the early public
projection. Production verification on 2026-09-07 reached 21,061 matching apartments/offices and
page 1,756 at 12 rows per page: Mongo's top-k sort retains the preceding rows too, so even public
offer text exceeded its 100 MiB memory limit. Disk spill preserves the complete filtered order
instead of returning a 503 or truncating results. The Mongo regression reproduces error 292 with
spill disabled on a 21,061-row fixture and verifies the exact final page, same-offer prices,
unknown distances last and private-field exclusion with the endpoint's actual spill setting.

## Official address search

`GET /api/rentals/geocode?q=Hocquart%20y%20Democracia&department=Montevideo` returns
`{ items: [{ label, lat, lng }], source: 'IDE Uruguay' }`.

The official source is [IDE Uruguay's address API](https://direcciones.ide.uy/swagger-ui.html),
`GET https://direcciones.ide.uy/api/v1/geocode/candidates?q=…&limit=5`.
The published [OpenAPI specification](https://direcciones.ide.uy/v2/api-docs) explains that
`stateMsg` can identify an approximate portal or a street centroid. Such results are not returned
as confirmed reference candidates. We accept only successful (`state: 1`, empty `stateMsg`)
`ESQUINA`, `CALLEyPORTAL` or `POI` points inside Uruguay. An intersection query requires `ESQUINA`.

Live verification on 2026-09-07 returned `HOCQUART ESQ DEMOCRACIA, MONTEVIDEO, MONTEVIDEO` at
`-34.88974051732336, -56.1768286423287`, with native street IDs 8294 and 9738. The app confirms the
normalized point `-34.88974, -56.17683`; it does not geocode rental addresses or rewrite listing data.

Natural `y` inputs try the original text first, then at most one conservative `esquina` variant if
no valid intersection was found, when a department/locality was supplied. `Treinta y Tres` remains
one street name. Without a supplied scope, the IDE crossing endpoints return no result even for
`Hocquart esquina Democracia` (v0, v1 unique and fuzzy variants checked on 2026-09-07). In that case
the two-request budget instead resolves the first street and then its actual crossing:

1. `candidates?q=Hocquart&limit=5` returns the unique exact-name native street 8294, locality 3180,
   department 1, with explicit locality/department names `MONTEVIDEO`. Its zero coordinates are
   never used. The response must contain fewer than five rows; a capped, ambiguous, malformed or
   fuzzy-name result cannot select a city for the user.
2. `candidates?q=HOCQUART esquina Democracia, MONTEVIDEO, MONTEVIDEO&limit=5` returns the measured
   crossing. Its native locality/department and street ID must agree, as must both street names
   and their ID orientation. It still must be a successful, non-approximate `ESQUINA` point.

This supports entering exactly `Hocquart y Democracia` without first filtering rentals to
Montevideo. There is no default city: ambiguous names still need a locality or a chosen map point.
A street/locality centroid is never substituted for an unresolved crossing. Every suggestion
requires user selection and map confirmation; there is no geocoder request on each keystroke.

Upstream requests use one fixed HTTPS host/path, encoded query parameters, no redirects and an
8-second timeout per request (at most two requests, no automatic retry). This allows occasional
provider latency beyond the original 4-second deadline; it does not treat all upstream failures
as timeouts. A transport regression accepts a valid response at six seconds and aborts a hung request
at eight seconds. Responses are bounded at 128 KiB. No API key, browser identity,
private property location, login or third-party account is involved.

Process-local safeguards: identical pending searches coalesce; at most four different searches run
concurrently; at most 30 new searches per minute and 10 requests per client per minute. Client
rate records expire after one minute and are capped at 2,048. The response cache holds at most 128
queries, for 15 minutes on success or one minute on a valid empty answer. These are per-instance
bounds, not a claimed distributed rate limiter. Address responses use `no-store` at the HTTP layer
and the app does not log submitted address text.

Invalid input returns 400, capacity/rate limits 429 with a retry delay, and upstream failures 503.
A timeout or invalid payload never appears as a successful empty address search.

Failed lookups emit only an allowlisted stage, failure category, elapsed milliseconds and an
upstream HTTP status when relevant. Submitted text, request URLs, client identifiers, raw error
messages and stacks are excluded. A failed diagnostic reporter cannot change the public response.

## Validation

`rentalDistance.test.ts`, `rentalDistanceMongo.test.ts`, `rentalsSortMemory.test.ts` and
`rentalsMapProjection.test.ts` exercise normalization, saved links, subscription semantics,
coordinate ownership, hidden/legacy/malformed/stale coordinates, same-offer filtering, stable
global sorting, pagination and public projection. Mongo fixtures use read-only `$documents`.

`rentalGeocode.test.ts` and `rentalGeocodeApi.test.ts` cover the measured Hocquart/Democracia
response, conservative intersection parsing, invalid/approximate candidates, cache/coalescing,
bounded concurrency, rate windows and distinct error states without contacting IDE in CI.
