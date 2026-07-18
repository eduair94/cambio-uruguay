# Self-updating import / aduana regime (Gemini + web search), October-decree-ready

**Date:** 2026-07-18
**Branch:** `feat/aduana-self-updating`
**Status:** design approved (user auto-approved full scope)

## Problem

Uruguay's personal-import regime (Ley 20.446 → Decreto 50/026 → RG DNA 09/2026 → RG 21/2026) is on a
clock. The seller-registration requirement for the US IVA exoneration has already been postponed
twice (RG 12/2026 → 2026-07-01; RG 21/2026 → 2026-10-01) and a **third decree/prórroga is expected
around October 2026**. When it drops it may: move the enforcement date, change amounts
(USD 800 / USD 200 / USD 20 / 60%), or add rules.

Today the site cannot follow that automatically:

1. **Discovery gap** — the weekly `currency-aduana` job only *re-reads facts it already knows against
   the source URLs it already has* (`classes/aduana/norms.ts`). A brand-new decree published at a new
   URL is invisible to it.
2. **Alerting gap** — even when the re-check flags a change, it only `console.warn`s on the VPS
   (`sync_aduana.ts`). No human is notified. The "hard check 2026-09-25" watchdog is a manual note,
   not automation.
3. **Drift gap** — the calculator + franquicia semáforo read **static** constants in
   `app/utils/importRules.ts`, which the app may never feed from Gemini (`noGeminiInApp.test.ts`).
   The backend and the app hold two independent copies of the same numbers.
4. **The critical datum isn't even watchable** — `SELLER_REGISTRY_ENFORCED_FROM = '2026-10-01'`
   exists only as an app constant + prose. It is not a structured backend fact, so the re-check
   cannot track it at all.

## Decisions (locked with user)

- **Auto-publish** changed figures, **not** notice-and-wait — but behind a hard guardrail so it can
  never republish the known-repealed numbers.
- **Guardrail = denylist + 2 independent official sources agree + in-range/valid + not-homepage.**
- Auto-published values render with a **"sin verificación humana"** badge and keep the previous value
  for rollback; a Telegram ping fires on every publish.
- **Both surfaces** update from one source of truth: the aduana hub *and* the calculator/semáforo
  read live values from `/api/aduana` with a static baseline fallback.

## Non-goals

- No new admin UI. The human's control surface stays `baseline.ts` (edit = confirm/overrule/rollback).
- The calculator still does not price the *general* regime (> USD 800). Unchanged.
- Reddit corpus harvesting/labelling is untouched — this spec is only the norms + discovery path.
- We do not auto-publish from an unreadable scanned PDF; that always defers to a human.

## Architecture

```
Aduanas RG-2026 index + IMPO decretos index        ← NEW deterministic discovery sweep
        │  extract norm links, diff vs known sources[].url
        ▼
   candidates (new norm URLs)  ──────────────┐
                                             ├─► Gemini grounded read → proposals
   existing facts re-check (as today)  ──────┘        {id, value, sourceUrl, corroborationUrl}
        │
        ▼
   GUARDRAIL GATE  (pure, synchronous, unit-tested — the whole safety story)
     · denylist?  · ≥2 independent official sources agree?  · in-range / valid date?
     · not a homepage & on the fact's own host?  · unreadable scan → refuse
        │
   pass ┴ fail
    │      └────► doc.pendingReview += id   +   🟡 Telegram
    ▼
   doc.overrides[]  { id, value, publishedAt, basedOnValue, sources:[2], prevValue }
        │            (+ 🟢 Telegram)
        ▼
   saveAduanaDoc → Mongo `aduana_data`
        │
        ▼
   GET /aduana (backend, buildAduanaPayload)  ──►  /api/aduana (app proxy, cached, baseline fallback)
        │                                                 │
        ▼                                                 ▼
   hub page (/problemas-con-la-aduana-uruguay)      calculator + /franquicia-aduana-uruguay
        facts render with origin/badge              importRules overlay (fallback = static consts)
```

All Gemini stays in the root Express backend. The app only ever fetches its own `/api/aduana`
proxy, so `noGeminiInApp.test.ts` stays green.

## Components

### 1. New structured facts (backend `classes/aduana/baseline.ts`)

- `franquicia.registro_vendedor_desde` — value `"2026-10-01"`, `kind: 'norma'`, sourced to
  RG 21/2026 (`aduanas.gub.uy/innovaportal/file/28613/1/rg-21-2026.pdf`). **This is the Oct datum.**
  It is a *date string* fact, so it gets a date-window validator, not a numeric `FACT_RANGES` entry.
- `usa.iva_umbral_usd` — value `200`, sourced to Ley 18.761 art. 7 g / Ley 20.446 art. 628, with a
  `FACT_RANGES` entry `[1, 500]` — **only if** it is not already present (verify during impl; do not
  duplicate).
- Confirm `franquicia.tope_anual_usd` (800), `prestacion_unica.tasa_pct`, `prestacion_unica.minimo_usd`
  already exist (they do) — the overlay maps onto them.

### 2. Denylist (backend `classes/aduana/baseline.ts`)

```ts
// Official pages that publish REPEALED numbers (Decreto 356/014: USD 10 min, USD 200/envío cap).
// A citation to any of these is discarded — not counted toward the 2-source requirement.
export const DENYLIST_URLS: string[] = [
  'https://www.aduanas.gub.uy/innovaportal/v/27950/8/innova.front/encomiendas-postales',
  // add any page found echoing the 10 / 200-per-envío figures
]
```
Matching is by normalized `host + pathname` prefix so query strings / trailing slashes don't evade it.

### 3. Date validator (backend `classes/aduana/baseline.ts` + `norms.ts`)

```ts
// Facts whose value is a date string get a plausible window instead of a numeric range.
export const FACT_DATE_RANGES: Record<string, [string, string]> = {
  'franquicia.registro_vendedor_desde': ['2026-07-01', '2027-12-31'],
}
```
`inRange()` in `norms.ts` gains a branch: a fact with a `FACT_DATE_RANGES` entry validates its value
as `YYYY-MM-DD` within `[min, max]`; a numeric value proposed for a date fact is rejected, and vice
versa (mirrors the existing "DNA lock").

### 4. Guardrail gate (backend `classes/aduana/norms.ts` — extend `applyProposals`)

The current gate publishes **only unchanged** values (re-stamps `aiCheckedAt`). It gains a second,
stricter path that may **publish a changed** value into `doc.overrides`:

A proposal whose value **differs** from what we publish is auto-published **iff all hold**:
1. **≥2 independent official citations agree** on the value. "Independent" = distinct normalized
   `(host, path)`, both **grounded** (host appears in `groundingUris`), both **official**
   (`OFFICIAL_HOSTS`), **neither denylisted**. Proposals therefore carry a `sourceUrl` **and** a
   `corroborationUrl` (second source); a batch may also aggregate multiple proposals for the same id.
2. **In range / valid date** (`FACT_RANGES` or `FACT_DATE_RANGES`).
3. Each citation is a real page (`pathname.length > 1`), on an official host, not denylisted.

If it differs but fails any check → **not published**, `id → pendingReview` (unchanged behaviour,
now the safety net rather than the only path).

Why 2 independent sources kills the repealed-page trap: `v/27950` says USD 10 / USD 200-cap, but the
current law's real sources (impo decreto, MEF FAQ) say USD 20 / no-cap. The repealed numbers can
never assemble a 2nd *independent, non-denylisted, official* source that agrees, so they can never be
published. And `v/27950` is denylisted outright as belt-and-suspenders.

`applyProposals` stays **pure and synchronous** — it returns `{ facts, overrides, pendingReview }`.
It still never writes `verifiedAt`. An auto-published override sets `origin: 'ai'`.

### 5. Override merge & precedence (backend `classes/aduana/store.ts`, `types.ts`, `payload.ts`)

New Mongo-owned field on `AduanaDoc`:
```ts
export interface AduanaOverride {
  id: string
  value: number | string
  publishedAt: string      // ISO date the AI published it
  basedOnValue: string     // baseline value at publish time (String()-normalized)
  sources: string[]        // the 2 corroborating official URLs
  prevValue: number | string
}
// AduanaDoc gains:  overrides: AduanaOverride[]
```

`mergeAduanaDoc` precedence, applied per fact (generalizes the existing `pendingReview` discharge):
1. **Human wins.** If `String(baseline.value) !== override.basedOnValue`, the human edited
   `baseline.ts` since the AI published → **discharge** the override (drop it). Editing the file *is*
   the promotion (set value + `verifiedAt`) or the rollback (own value) or the overrule.
2. **AI-published.** Else serve `override.value`, `origin: 'ai'`, carry `publishedAt`/`sources`/
   `prevValue` through to the payload so the page can badge it and offer context.
3. **Baseline default** otherwise.

`aiCheckedAt` handling is unchanged (only survives when stored value matches the served value). The
`overrides` array is Mongo-owned exactly like `quotes`/`counts` — the baseline file never carries it.
`buildAduanaPayload` exposes, per fact: `origin`, and when overridden, `autoPublished: true` +
`publishedAt` + `sources` + `prevValue`.

### 6. Discovery stage (backend `classes/aduana/discover.ts` — NEW)

```
discoverNewNorms(knownUrls: string[]): Promise<Candidate[]>
```
- Fetch the **Aduanas 2026 RG index** and the **IMPO decretos index** (exact index URLs pinned in the
  plan; the RG index lists `/innovaportal/file/NNNNN/1/*.pdf` links, IMPO lists `/bases/decretos/...`).
- Extract candidate norm links, normalize, **diff against `doc.sources[].url`** and against already-seen
  candidates → new URLs only.
- A new URL is a **candidate**, not a fact. It is: (a) 🔵 Telegram-pinged, (b) added to the batch
  Gemini is asked to read/interpret against the affected fact ids.
- **Deterministic** — Gemini cannot invent a URL that isn't on the official index, closing the
  "hallucinated new decree" hole.
- Scanned PDF with no text layer (RG 09 style): discovery records it but the gate **refuses to
  auto-publish** from it → pendingReview + 🟡 Telegram (a human renders/reads it).

`sync_aduana.ts` runs discovery **before** the norms re-check, as an independent stage (same
credential-gated, never-blank-good-data pattern as the existing stages; a discovery failure logs and
keeps going).

### 7. Alerting (backend — reuse `classes/cluster.ts` Telegram admin ping)

`sync_aduana.ts` sends, after the run:
- 🟢 **auto-published**: `<factId> = <value>` (antes `<prevValue>`), 2 fuentes, "revisar/revertir".
- 🟡 **needs a human**: `pendingReview` ids (the AI saw a change it could not safely publish).
- 🔵 **new norm found**: candidate URL(s) from discovery.

Replaces the silent `console.warn`. Failure to send Telegram must not fail the job.

### 8. Cadence (backend `ecosystem.config.js`)

- Keep the weekly baseline (`currency-aduana`, Mondays 09:30 UTC).
- **Daily** during the decree window **2026-09-01 → 2026-11-01**. Implemented as a date-gated cron:
  a `currency-aduana-daily` app on `30 9 * * *` whose entrypoint no-ops (`process.exit(0)`) when
  today is outside the window, so no code change is needed to turn it off after November. Cheap now
  that Gemini billing is enabled; the guardrails make daily safe.

### 9. App: one source of truth (`app/utils/importRules.ts` + `app/server/*`)

- `resolveRegime(input, rules?)` and `isSellerRegistryEnforced(today, rules?)` take an optional
  `rules` overlay; the current top-level `const`s become the overlay's **baseline default**
  (`DEFAULT_REGIME_RULES`). Consumers that read bare constants keep working (fallback).
- `RegimeRules` overlay shape:
  ```ts
  interface RegimeRules {
    franchiseAnnualUsd: number
    simplifiedRatePct: number
    simplifiedMinUsd: number
    usaIvaExemptionUsd: number
    sellerRegistryEnforcedFrom: string   // YYYY-MM-DD
  }
  ```
- The app maps `/api/aduana` fact ids → `RegimeRules` (`franquicia.tope_anual_usd` →
  `franchiseAnnualUsd`, etc.; `franquicia.registro_vendedor_desde` → `sellerRegistryEnforcedFrom`),
  **deep-merged over `DEFAULT_REGIME_RULES`** so a missing/garbage field can never drop a key
  (same self-healing lesson as `costOfLiving`).
- The **calculator page** and **/franquicia-aduana-uruguay** fetch `/api/aduana` (already proxied),
  build the overlay, pass it to `resolveRegime`. Garbage/missing → static baseline. Show an
  "actualizado el X" chip and, when a value is `autoPublished`, a subtle "sin verificación humana"
  note consistent with the hub.

## Data flow (worked example: 3rd prórroga to 2027-01-01)

1. Discovery finds a new RG PDF on the Aduanas 2026 index → 🔵 Telegram, added to batch.
2. Gemini reads it + the MEF FAQ → proposes `franquicia.registro_vendedor_desde = "2027-01-01"`
   with `sourceUrl` = new RG PDF, `corroborationUrl` = MEF FAQ (both grounded, official, not denylisted).
3. Gate: 2 independent official sources agree, value is a valid date in `[2026-07-01, 2027-12-31]`,
   real pages → **auto-publish** into `doc.overrides` (prevValue `"2026-10-01"`) → 🟢 Telegram.
4. `/aduana` payload serves the fact with `value:"2027-01-01"`, `origin:'ai'`, `autoPublished:true`.
5. App calculator overlay picks up `sellerRegistryEnforcedFrom:"2027-01-01"` →
   `isSellerRegistryEnforced(today)` now returns false until 2027 → semáforo + calc update, no code change.
6. Human confirms by editing `baseline.ts` (`value:"2027-01-01"`, fresh `verifiedAt`) → next merge
   discharges the override (baseline now == basedOnValue diverges) → fact serves as human-verified.

## Testing (TDD)

Backend (`tests/aduana/`):
- **Guardrail**: changed value with 2 independent official grounded sources → published; with only 1
  → pendingReview; denylisted url is discarded and cannot be the 2nd source; **repealed-numbers
  scenario** (a source says 10, real sources say 20 → 20 published/kept, 10 never published);
  homepage/off-host citation rejected; date fact validator (in-window date accepted, out-of-window
  and numeric-for-date rejected); numeric fact still rejects a date.
- **Merge/precedence** (`store.test.ts`): override applies over baseline; human baseline edit
  discharges the override; `verifiedAt` promotion path; rollback via baseline revert; override never
  overrides a fact the human changed.
- **Discovery** (`discover.test.ts`, fixtured index HTML): new url surfaced, known url ignored,
  malformed index tolerated; unreadable-scan candidate → refused for auto-publish.
- **Existing invariants stay green**: `norms.test.ts`, `baseline.test.ts` (orphan-range), the
  connect tripwire, etc.

App (`app/tests/unit/`):
- `importRules.test.ts`: overlay overrides baseline; garbage/missing overlay → baseline; deep-merge
  cannot drop a key; live date drives `isSellerRegistryEnforced`; `resolveRegime` decisions match the
  existing suite under the default overlay (no behavioral regression).
- `noGeminiInApp.test.ts` unchanged and green.

## Deploy / ops

- Backend self-deploys on push to main (path-filtered CI). Ensure **both** `currency-aduana` and the
  new `currency-aduana-daily` are in `OTHER_APPS` in `scripts/deploy-backend.sh` (or they never start
  on the VPS — documented trap).
- `GEMINI_API_KEY` is set on the VPS (2026-07-18). Gemini billing being enabled removes the free-tier
  RPM ceiling; leave `GEMINI_MIN_INTERVAL_MS` unset once active.
- No new env vars required beyond the existing Gemini + Telegram admin config.

## Risks & mitigations

- **Republishing repealed numbers** → denylist + 2-independent-source rule (double defense); unit test
  locks it.
- **Hallucinated new decree** → discovery is a deterministic index diff; Gemini interprets, never invents.
- **Scanned PDF misread** → never auto-publish from an unreadable scan; defer to human.
- **App/backend drift** → single overlay source; app deep-merges over baseline and self-heals.
- **Stale-on-fresh-deploy** → app baseline fallback + cached self-healing proxy (existing pattern).
- **Alert fatigue** → pendingReview discharge already prevents weekly re-nagging; overrides discharge
  on human edit; Telegram only on real state changes.
```
