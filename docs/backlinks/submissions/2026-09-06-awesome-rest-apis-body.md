Adds Cambio Uruguay, a public REST API for exchange rates published by Uruguayan exchange houses and banks, to Business and finance. It provides buy/sell quotes, historical series and branch metadata without registration or an API key.

Disclosure: I maintain Cambio Uruguay.

The entry follows the documentation-plus-JSON-example format and alphabetical ordering. The wording describes the source of the quotes without promising that every publisher updates its rates on the same schedule.

Validation on September 6, 2026:

- Both repository validators pass on the new entry: documentation HTTP 200; unauthenticated example contains a JSON array of 200 quote records.
- `tools/check-examples` across the complete README checks 20 entries and reports 3 failures on unchanged services: FilingFirehose times out, api.myip.com returns HTTP 522, and the World Cup example fails the Windows TLS revocation check. The new entry passes in that full run.
- `tools/check-urls` across the complete README checks 32 URLs and reports 1 failure: the unchanged FilingFirehose OpenAPI URL times out. The new documentation URL passes.
- `git diff --check` passes.
