# Rental reference point and address search

Implemented 2026-09-07 for `/alquileres-uruguay`.

The user can choose a point in the map or type an address/intersection, inspect an official
suggestion, and confirm the point. Choosing a reference is a presentation preference: it
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
   never used. The response must contain fewer than five rows; a capped, ambiguous or malformed
   result cannot select a city for the user. Exact names take priority over the limited native
   correction described below.
2. `candidates?q=HOCQUART esquina Democracia, MONTEVIDEO, MONTEVIDEO&limit=5` returns the measured
   crossing. Its native locality/department and street ID must agree, as must both street names
   and their ID orientation. It still must be a successful, non-approximate `ESQUINA` point.

This supports entering exactly `Hocquart y Democracia` without first filtering rentals to
Montevideo. There is no default city: ambiguous names still need a locality or a chosen map point.
A street/locality centroid is never substituted for an unresolved crossing. Every point suggestion
requires user selection and map confirmation.

Native spelling suggestions use the same two requests. On 2026-09-07, the exact user input
`candidates?q=Hoqcuart&limit=5` returned the unique native street `HOCQUART`, ID 8294, locality
3180 and department 1, with valid state and scope. When no exact-name row exists, a name with at
least six letters may match one adjacent letter transposition. Numbers, spaces and the rest of the
name must remain unchanged; deletions, insertions and substitutions are not accepted. This is a
comparison against names the official service returned, never a guessed correction or city.
The selected correction must have one complete native street/scope, in a non-truncated response.
Any matching row with unresolved state/scope vetoes the suggestion. The second response must still
prove both street names, their native IDs and an exact intersection in that same scope. Only then
does the result carry `suggested: true`; exact searches omit this field. The UI identifies the
suggestion and requires the existing selection and map confirmation. Property identity matching,
rental coordinates and filter criteria are unaffected. No additional endpoint or semantic lookup is used.

### Autocomplete and street refinements (2026-09-08)

The shared address field used by rental filters and the household planner searches after a
600 ms pause, with at least four characters. Explicit submission searches immediately. Aborted or
outdated client responses cannot replace the current suggestions or select a point. Editing a
previous selection invalidates its draft point; dismissing the list retains the entered text.

The field sends `autocomplete=1`. This opt-in mode retains `items` and can additionally return
`refinements: [{ label, query }]`. A refinement is a native `CALLE` name plus its explicit locality
and department, for example `HOCQUART, MONTEVIDEO, MONTEVIDEO`. It contains no coordinates or
native IDs. It requires successful state and complete native street/locality/department IDs;
the entered name must match, prefix the native name or satisfy the limited transposition rule.
Up to five native alternatives let the user choose a locality rather than silently assuming one.
Choosing a refinement fills the text and places the caret before the locality suffix so the user
can add a number or crossing. It never selects a map point. Street centroid coordinates remain
ineligible even when the source includes them.

Autocomplete can complete the final street in a crossing when the entered prefix has at least
four letters and preserves the exact native prefix, including numbers. Thus `18 de Ju` can match
`18 de Julio`, but `19 de Ju` cannot. Incomplete `y`/`esquina` entries cannot fall through to an
unrelated point. Both street names and native IDs must support the returned `ESQUINA`, with the
known first-street ID and unique scope retained in unscoped searches. Explicit locality/department
constraints are respected. Completions carry `suggested: true` and still require confirmation.
Legacy requests without `autocomplete=1` retain the exact-name behavior and response shape.

Live source checks on 2026-09-08 returned the native Hocquart street for `Hocq`, and the previously
verified Hocquart/Democracia intersection for scoped `Demo` and `Democ` prefixes. These measured
responses are fixtures, not hardcoded street rules or coordinates.

Upstream requests use one fixed HTTPS host/path, encoded query parameters, no redirects and an
8-second deadline per semantic lookup. One additional GET attempt is allowed only for explicit
transient network codes (`ECONNRESET`, `EAI_AGAIN`, `ETIMEDOUT`, `UND_ERR_SOCKET` or
`UND_ERR_CONNECT_TIMEOUT`). Both attempts share the original abort signal and deadline; two
semantic lookups therefore use at most four physical GETs, normally one or two. HTTP failures,
redirects, invalid/oversized responses, certificate failures, unknown codes and mixed transient/
permanent aggregate failures are not retried. Partial response buffers are discarded before a
retry. This is bounded recovery, not evidence that a particular connection fault caused an incident.
A transport regression accepts a valid response at six seconds and aborts a hung request at eight
seconds. Responses are bounded at 128 KiB per attempt. No API key, browser identity,
private property location, login or third-party account is involved.

Process-local safeguards: identical pending searches coalesce; at most four different searches run
concurrently; at most 60 new searches per minute and 60 requests per client per minute. Client
rate records expire after one minute and are capped at 2,048. The response cache holds at most 128
queries, for 15 minutes on point/refinement success or one minute on a valid empty answer. Legacy
and autocomplete queries use separate cache keys, including explicit department constraints.
First-street lookups also coalesce across changing final-street prefixes and cache at most 128
bounded native metadata results, using the same positive/empty durations. That cache retains no
point geometry or arbitrary source fields, preserves capped/invalid rows so ambiguity checks still
fail safely, and does not cache transport errors. These are per-instance
bounds, not a claimed distributed rate limiter. Address responses use `no-store` at the HTTP layer
and the app does not log submitted address text.

Invalid input returns 400, capacity/rate limits 429 with a retry delay, and upstream failures 503.
A timeout or invalid payload never appears as a successful empty address search.

Failed lookups emit only an allowlisted stage, failure category, elapsed milliseconds, an
upstream HTTP status when relevant and at most four allowlisted network codes. Codes can be read
from bounded nested causes/aggregate errors, but those objects are never retained or reported.
Submitted text, request URLs, client identifiers, raw error messages and stacks are excluded. A
failed diagnostic reporter cannot change the public response.

Production browser checks at 01:01–01:02 UTC on 2026-09-08 reproduced two 503s despite earlier
successful public and isolated official requests. The corresponding worker recorded network
failures in the street/query stages at 822/1,743 ms, without a worker restart or an eight-second
timeout. Historical diagnostics had no network codes, so they cannot establish socket, DNS or TLS
causality. New recovery/diagnostics must be verified through the public worker; isolated successes
alone do not prove that this intermittent failure has disappeared.

### IDE connection-family correction (2026-09-08)

The first autocomplete deployment exposed the previously hidden connection codes. Three of four
public API checks failed, and the interactive browser failed on its second query; the same online
worker recorded `ETIMEDOUT` together with `ENETUNREACH`. Neither worker restarted. Read-only
connectivity checks on the serving host found one A and one AAAA record for `direcciones.ide.uy`:
IPv4 connected, while IPv6 failed with `ENETUNREACH`. Node 22.14.0 used address-family selection
with a 250 ms connection-attempt timeout. Its [versioned implementation](https://github.com/nodejs/node/blob/v22.14.0/lib/net.js#L1620)
closes the current attempt before trying the next address. That explains how an IPv4 attempt that
exceeds the short connection window can be discarded before an unreachable IPv6 attempt. The
isolated successful IPv4 sample itself took 150 ms after DNS; its 329 ms total must not be treated
as proof that this individual TCP attempt exceeded 250 ms.

Only requests to the fixed IDE endpoint now use a reusable Undici Agent with `connect.family: 4`
and `autoSelectFamily: false`. Its pool is limited to four connections, one active request per
connection, four seconds of idle keep-alive and a ten-second maximum idle extension. DNS still
resolves the official hostname; no address is pinned. The global dispatcher and other services
are unaffected. Default TLS certificate/hostname verification, refused redirects, the eight-second
shared deadline, conditional single retry and 128 KiB response limit remain intact. Undici 7.22.0
is an exact direct dependency, promoted from the existing locked version; its Node minimum
20.18.1 is below the serving host's 22.14.0.

Before publication, two isolated HTTPS GETs from that host using the exact Agent settings returned
200 in 1,120/1,887 ms, with the crossing point correct, the Agent closed and the global dispatcher
unchanged. Public worker verification is still required: these two successes validate the chosen
transport but do not certify that an external service can never fail.

## Validation

`rentalDistance.test.ts`, `rentalDistanceMongo.test.ts`, `rentalsSortMemory.test.ts` and
`rentalsMapProjection.test.ts` exercise normalization, saved links, subscription semantics,
coordinate ownership, hidden/legacy/malformed/stale coordinates, same-offer filtering, stable
global sorting, pagination and public projection. Mongo fixtures use read-only `$documents`.

`rentalGeocode.test.ts` and `rentalGeocodeApi.test.ts` cover the measured Hocquart/Democracia
response, conservative intersection parsing, invalid/approximate candidates, cache/coalescing,
bounded concurrency, rate windows and distinct error states without contacting IDE in CI.
`rentalGeocodeAutocomplete.test.ts` covers street refinements, explicit scopes, incomplete crossings,
numbered prefixes and first-street coalescing. `rentalGeocodeRetry.test.ts` and the native deadline
transport/diagnostic suites cover recovery, no-retry cases, shared budgets and private-field exclusion.
`rentalGeocodeDispatcher.test.ts` additionally verifies the bounded, reused IDE-only Agent and
unchanged global transport, hostname resolution and TLS defaults.

Public mobile verification on 2026-09-07 (390 × 844, fresh browser) used the exact reported
`Hoqcuart y Democracia` query. The official suggestion required explicit selection and confirmation;
the map reached zoom 16 at the verified intersection. Applying it preserved Canelones and the
Viviendas/Oficinas/Garajes union, and the first 24 results had ascending distances. No horizontal
overflow or uncaught page error was observed. The first filter group was also checked on desktop
and mobile in both themes: its heading no longer overlaps the Departamento label.
