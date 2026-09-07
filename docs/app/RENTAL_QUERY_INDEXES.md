# Rental query indexes — explicit deployment

The production planner checked on 2026-09-07 showed `COLLSCAN` for a rental key lookup using
the app's `{ locale: 'es', strength: 1 }` collation. Its existing unique `key_1` and other five
indexes use simple collation. These indexes address repeated directory/detail queries; they
are separate from the SSR memory incident caused by an absent production environment setting.

## Reviewed additions

All three use `{ locale: 'es', strength: 1 }`, are **nonunique**, and leave all existing indexes,
documents, filters, freshness rules, identity checks, comparable sets and pagination unchanged.

| Index | Key | Query served |
| --- | --- | --- |
| `rental_key_es_v1` | `{ key: 1 }` | Detail lookup and the six selected similar properties |
| `rental_advert_id_es_v1` | `{ 'offers.listingId': 1 }` | Initial identity candidate restriction |
| `rental_cohort_es_v1` | `{ department: 1, neighborhood: 1, propertyType: 1, bedrooms: 1 }` | Same-area/type/bedroom comparable cohort |

The identity index is multikey because `offers` is an array. It does not infer identity or move
the same-offer check earlier: `rentalPublicStages` removes expired offers and only then checks the
source/listing-ID association. Only `offers.listingId` remains in its initial match, so adding
`offers.source` to this index would not narrow the current identity query further. These indexes
are not claimed to eliminate calculated distance sorts or make entire queries covered.

Definitions intentionally live in `app/scripts/rental-query-indexes.mjs`, outside active Mongoose
schemas. Adding them to a schema would let `autoIndex` start database writes on application startup,
before this separate operation is reviewed. The script uses the native driver without loading models.

## Plan and apply

From `app/`, using the app's own `.env` and Node's environment-file support:

```sh
node --env-file=.env scripts/rental-query-indexes.mjs --plan
```

The default is also `--plan`. It reads `listIndexes` only, prints the target database and exact
definitions, and refuses to proceed unless the existing simple unique key index is present.
Review the database, collection and three planned additions. After the coordinated deployment
decision, run the same script with the explicit mutation flag:

```sh
node --env-file=.env scripts/rental-query-indexes.mjs --apply
```

Only `NUXT_MONGO_URI` or `MONGO_URI` is accepted; there is no fallback to the backend database.
Credentials and raw driver exception messages are not printed. The script verifies all reserved
names before writing, builds missing indexes sequentially (60 seconds maximum per index command),
and reads definitions again afterward. Equivalent indexes already present are reused. A second
apply creates nothing. Conflicting key/options/collation fail closed; no index is dropped,
replaced or modified. Existing unique-key enforcement remains active.

If a build fails or times out, inspect `listIndexes` and rerun `--plan`; do not drop a useful index
or assume that an interrupted command did not finish.

## Production application

After review, the explicit script was applied on 2026-09-07 at approximately 22:06 UTC to the app
database `cambio-uruguay`, collection `rentallistings`. It created exactly the three nonunique
indexes above. The existing simple unique key index passed preflight before and after; no documents
or existing indexes were changed. A subsequent `--plan` reported all three as `present`.

The real detail, identity and cohort pipelines were captured from the current application code
and checked with `queryPlanner` before and after, without hints or `executionStats`:

| Pipeline | Before | After |
| --- | --- | --- |
| Detail | `COLLSCAN` | `IXSCAN rental_key_es_v1` |
| Identity | `COLLSCAN` | `IXSCAN rental_advert_id_es_v1` |
| Cohort | `COLLSCAN` | `IXSCAN rental_cohort_es_v1` |

The planner timings measure planning only, not end-user latency. Sanitized operational reports
were retained as `.sdd-rental-index-production-apply.json`, `.sdd-rental-index-plans-before.json`,
`.sdd-rental-index-plans-after.json` and `.sdd-rental-index-production-plan-after.json` in the
deployment worktree; none contains listing bodies or credentials.

## Verification

`rentalQueryIndexes.test.ts` runs plan/preflight guard checks without a database. Its optional
Mongo regression only accepts a localhost URI ending in `/rental-index-qa`; it creates and removes
one synthetic collection, never the real rental collection. With 905 synthetic properties, it
executes the actual detail, identity and evidence pipelines before/after index creation, checks
identical results, and verifies `COLLSCAN` becomes the intended `IXSCAN` without a hint. It also
checks multiple offers, wrong sources, expired offers, idempotent reapplication, preservation of
simple uniqueness, and allowance of keys that differ only in case/accent.

```sh
RENTALS_INDEX_TEST_MONGO_URI=mongodb://127.0.0.1:27022/rental-index-qa npx vitest run tests/unit/rentalQueryIndexes.test.ts
```

After application, inspect real `queryPlanner` results for these same shapes and observe detail
latency under ordinary traffic. Planner improvements do not by themselves establish a memory leak
or remove the need for the production SSR environment setting.
