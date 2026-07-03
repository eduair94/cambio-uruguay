# BCU SOAP Backfill + Scraper Hardening — Design

**Date:** 2026-06-23
**Status:** Approved
**Repo:** root (`cambio-uruguay`) — backend only. The `app/` Nuxt project is **unchanged**; it reads `/evolution`, which reads the same Mongo collection this work writes to.

## Problem

The `/comparar` chart's "Banco Central del Uruguay" series shows a flat, straight green segment from ~mid-March to ~mid-June 2026. The line is Chart.js (`spanGaps: true`) connecting the last data point before the gap directly to the first point after it. The gap is real: no BCU history documents exist for those dates.

Root cause: [`classes/cambios/bcu.ts`](../../../classes/cambios/bcu.ts) scrapes only the **current** BCU cotizaciones HTML page. BCU did a "2025 redesign" of that page; the CSS selectors broke, so the daily scrape saved zero BCU rows for the affected period. The selector was later fixed (`td.Moneda`), so data resumed — leaving a hole in the middle.

## Goals

1. **Backfill** the missing BCU history for all currencies BCU maps, using the BCU SOAP cotizaciones web service (supports historical date-range queries).
2. **Harden** the scraper: make BCU SOAP the primary source going forward, with the existing HTML scrape as fallback, so a future HTML redesign can't silently blank the series again.

## Non-goals

- No changes to the `app/` Nuxt project.
- No change to the evolution API, chart, or `spanGaps` behaviour.
- No backfill of non-BCU houses.

## Data model (existing, unchanged)

History lives in the mongoose model `cambio-uy` (see [`classes/cambio.ts`](../../../classes/cambio.ts#L96)). One document per quote:

```
{ origin, date, code, type, name, buy, sell }
```

- `origin` for BCU = `"bcu"` (see [`classes/origins.ts`](../../../classes/origins.ts#L81)).
- `date` = `moment.tz(d, "America/Montevideo").startOf("day").toDate()`.
- Upsert key = `{ origin, date, code, type }` (see [`save()`](../../../classes/cambio.ts#L180)). **`type` must match the existing scraper's values exactly** so backfilled rows merge into the same series instead of creating parallel dupes.

The evolution endpoint reads this collection by `{origin, code, [type], date range}` ([`cambioInfo.get_currency_evolution`](../../../classes/cambioInfo.ts#L151)).

## Currency code map

BCU SOAP identifies currencies by numeric `Moneda` codes. Map (mirrors the existing [`bcu.ts conversions`](../../../classes/cambios/bcu.ts#L16) so `code`/`type` align with already-stored docs):

| BCU `Moneda` | BCU name          | `code` | `type`         |
|--------------|-------------------|--------|----------------|
| 2225         | USA BILLETE       | USD    | BILLETE        |
| 2224         | USA CABLE         | USD    | CABLE          |
| 2230         | USA PROMED. FONDO | USD    | PROMED.FONDO   |
| 0501         | PESO ARG. BILLETE | ARS    | BILLETE        |
| 1001         | REAL BILLETE      | BRL    | BILLETE        |
| 9800         | UNIDAD INDEXADA   | UI     | "" (empty)     |
| (lookup)     | UNIDAD REAJUSTAB  | UR     | "" (empty)     |
| (lookup)     | UNIDAD PREVISIONAL| UP     | "" (empty)     |

Codes 2225/2224/2230/0501/1001/9800 are confirmed from BCU's official code table
(`https://www.bcu.gub.uy/Documents/cotizacion.txt`). UR/UP are not in the local-market
file; their codes are resolved at implementation time via the `awsbcumonedas` SOAP
operation (read-only probe). **If SOAP does not expose UR/UP, they are dropped from the
backfill** and continue to be filled by the HTML scraper going forward — noted as a known
limitation, not a blocker.

## SOAP service

- WSDL: `https://cotizaciones.bcu.gub.uy/wscotizaciones/servlet/awsbcucotizaciones?wsdl`
- Operation: `Execute` with input `{ Moneda: int[], FechaDesde: date, FechaHasta: date, Grupo: byte }`.
- Output: `respuestastatus { status, codigoerror, mensaje }` + `datoscotizaciones[]`, each
  `{ Fecha, Moneda, Nombre, CodigoISO, Emisor, TCC, TCV, ArbAct, FormaArbitrar }`.
- **`TCC` → `buy`, `TCV` → `sell`.**
- A single call returns **all business days in the date range** for the requested codes — one call backfills the whole gap, not one call per day.
- `Grupo`: `0` = todas las monedas. Exact value for the local market (0 vs 2) is confirmed
  against the live service during the read-only probe before any write.

## Components

### 1. `classes/bcu_soap.ts` (new) — thin SOAP client

- Wraps the `soap` npm package over the WSDL.
- `getCotizaciones(codes: number[], desde: Date, hasta: Date, grupo?: number): Promise<BcuRow[]>`
  returns normalized rows `{ date, code, type, name, buy, sell }`.
- Validates `respuestastatus`; throws on `status`/`codigoerror` failure.
- Skips rows where `buy === 0 && sell === 0`.
- `getMonedas()` (optional) wraps `awsbcumonedas` for code discovery / UR-UP resolution.
- Pure normalization logic (`mapRow`, `CODE_MAP`) is separated from the network call so it's unit-testable with a fixture SOAP response.

### 2. Refactor `classes/cambios/bcu.ts` → SOAP-primary

- `get_data()`: try SOAP for the current cotización (today / last cierre) → map → return `CambioObj[]`.
- On SOAP throw or empty result → fall back to the existing cheerio HTML scrape (kept intact).
- Output shape and `conversions` mapping unchanged → saved docs identical to today's.
- Net effect: robust against **both** a BCU HTML redesign and a SOAP outage.

### 3. `classes/bcu_backfill.ts` + `bcu_backfill.ts` runner (new) — one-off

- Runner follows the repo convention: a top-level `ts-node` script, added to `package.json`
  scripts as `"bcu_backfill": "ts-node bcu_backfill.ts"`.
- Steps:
  1. Connect Mongo via `MongooseServer.startConnectionPromise()` (URI from `MONGODB_URI`).
  2. Determine date range: auto-detect the gap by scanning existing `bcu` docs (min/max +
     missing span); `--from YYYY-MM-DD` / `--to YYYY-MM-DD` CLI args override.
  3. One SOAP range call for all mapped codes.
  4. Build upsert operations keyed by `{ origin: "bcu", date, code, type }`, value
     `{ name, buy, sell }`, `date` normalized to Montevideo `startOf("day")`.
  5. Apply via `MongooseServer.bulkUpsert(ops)` ([database.ts](../../../classes/database.ts#L295)) — idempotent; re-running is a no-op for already-present rows.
- `--dry` flag: prints the full upsert plan (counts per date/currency, sample rows) and writes nothing. **You review the dry-run output before the real run.**
- Pure functions (`detectGap`, `buildUpsertOps`) separated from I/O for unit testing.

## Data flow

```
BCU SOAP (date-range query)
  → normalize rows (TCC→buy, TCV→sell, Moneda→code/type)
  → buildUpsertOps (date @ MVD startOfDay, key origin/date/code/type)
  → bulkUpsert into `cambio-uy`
  → /evolution returns a continuous BCU series
  → green line fills in
```

## Error handling

- SOAP: validate `respuestastatus`, throw with `mensaje` on error; skip 0/0 rows.
- `bcu.ts`: SOAP failure → HTML fallback (no user-visible change).
- Backfill: per-run summary (inserted / updated / skipped); idempotent so safe to re-run;
  `--dry` proves correctness before writing.
- BCU only publishes business days → weekend/holiday micro-gaps remain after backfill; these
  are small and handled by `spanGaps` (the large gap closes).

## Testing (TDD)

Add `vitest` to the root `devDependencies` (the repo currently has no test runner; `app/`
already uses vitest). Unit tests cover pure functions only — no live network or DB:

- `bcu_soap`: `mapRow` / `CODE_MAP` produce correct `{code,type,buy,sell}` from a fixture
  SOAP response; `respuestastatus` error → throws; 0/0 row skipped.
- `bcu.ts`: `get_data()` returns SOAP-mapped data; on SOAP throw, falls back to HTML (both mocked).
- `bcu_backfill`: `detectGap` finds the right missing span from fixture docs;
  `buildUpsertOps` yields correct filters/values and dedupes; re-applying is idempotent.

Integration verification (manual, read-only): one live SOAP probe to confirm `Grupo` value,
UR/UP codes, and response shape — no DB write.

## Run plan

1. Build + TDD locally with mocked SOAP/DB.
2. Read-only live SOAP probe → confirm `Grupo`, UR/UP, response shape.
3. Ship `bcu.ts` refactor via normal push → `main` (CI deploy).
4. Backfill: **you** run `npm run bcu_backfill -- --dry` on the deploy server, review the
   plan, then run `npm run bcu_backfill` for the real write against prod Mongo.

## Dependencies

- Add `soap` to root `package.json` dependencies.
- Add `vitest` to root `package.json` devDependencies.
