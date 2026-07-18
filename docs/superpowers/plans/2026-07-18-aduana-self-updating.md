# Self-updating import/aduana regime — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the import/aduana figures current automatically via grounded Gemini — auto-publishing changed values behind a hard guardrail, feeding both the aduana hub and the calculator/semáforo from one source of truth, and making the October seller-registry date a watchable, auto-updatable fact.

**Architecture:** The root Express backend's weekly `currency-aduana` job gains (a) a deterministic discovery sweep of the Aduanas/IMPO norm indices, and (b) an auto-publish path in the norms gate that writes a changed value into a Mongo-owned `overrides[]` array only when a denylist + 2-independent-official-source + range/date guardrail passes. `mergeAduanaDoc` serves overrides with human-baseline precedence. The Nuxt app reads the resulting `/api/aduana` payload and feeds an overlay into `importRules.ts`, whose static constants become the fallback baseline. All Gemini stays server-side (backend), so `noGeminiInApp` stays green.

**Tech Stack:** TypeScript, Node/Express backend (`classes/`, `sync_*.ts`, pm2 `ecosystem.config.js`), Mongoose single-doc store, Vitest; Nuxt 3 app (`app/`), Vue 3, Vuetify 4.

## Global Constraints

- **No Gemini under `app/`** — `app/tests/unit/noGeminiInApp.test.ts` greps for `generativelanguage.googleapis.com`, `geminiApiKey`, `NUXT_GEMINI_API_KEY` and fails the build. The app may only fetch its own `/api/aduana` proxy.
- **`applyProposals` stays pure and synchronous** and **never writes `verifiedAt`** (human-only). Auto-published values set `origin: 'ai'` and `aiCheckedAt`, never `verifiedAt`.
- **The baseline FILE (`classes/aduana/baseline.ts`) is authoritative** for `facts`/`problems`/`sources`. Mongo owns only `aiCheckedAt`, `quotes`, `counts`, `updatedAt`, `pendingReview`, and (new) `overrides`.
- **Official hosts** = `["gub.uy", "impo.com.uy"]` (`OFFICIAL_HOSTS`). A source outside them is never law.
- **Never auto-publish from an unreadable scan** (RG 09/2026 has no text layer) — defer to `pendingReview` + Telegram.
- **Every new pm2 app must be listed in `OTHER_APPS` in `scripts/deploy-backend.sh`** or it never starts on the VPS.
- Backend Telegram/Gemini creds live in the **root `.env`** only. Telegram failures must never fail a sync job.
- Fact-id ↔ app-constant mapping is locked by `tests/aduana/baseline.test.ts` — keep it green.

---

## File structure

**Backend (root):**
- `classes/aduana/types.ts` — *modify*: add `AduanaOverride`, `AduanaDoc.overrides`, `AduanaFact` payload extras via payload only.
- `classes/aduana/baseline.ts` — *modify*: add date fact, `FACT_DATE_RANGES`, `DENYLIST_URLS`, `overrides: []` on `BASELINE`.
- `classes/aduana/norms.ts` — *modify*: date validator, denylist, 2-source independence, auto-publish path; `applyProposals` returns `overrides`.
- `classes/aduana/store.ts` — *modify*: `mergeAduanaDoc` applies `overrides` with human precedence.
- `classes/aduana/payload.ts` — *modify*: expose `origin` + `autoPublished`/`publishedAt`/`prevValue`/`sources` per fact.
- `classes/aduana/discover.ts` — *create*: deterministic index-diff discovery.
- `classes/notify.ts` — *create*: backend admin Telegram ping (degrades gracefully).
- `sync_aduana.ts` — *modify*: run discovery, thread overrides, send Telegram alerts.
- `sync_aduana_daily.ts` — *create*: date-gated wrapper for the decree window.
- `ecosystem.config.js` — *modify*: `currency-aduana-daily` app.
- `scripts/deploy-backend.sh` — *modify*: add both aduana apps to `OTHER_APPS`.
- Tests: `tests/aduana/{norms,store,discover,baseline}.test.ts`, `tests/notify.test.ts`.

**App:**
- `app/utils/importRules.ts` — *modify*: `RegimeRules`, `DEFAULT_REGIME_RULES`, `resolveRegime(input, rules?)`, `isSellerRegistryEnforced(today, rules?)`.
- `app/utils/regimeOverlay.ts` — *create*: map `/api/aduana` payload → `RegimeRules` (deep-merge over defaults).
- `app/server/utils/aduanaFallback.ts` — *modify*: extend `PublicAduanaPayload` type with new per-fact fields.
- `app/pages/herramientas/calculadora-impuestos-importacion.vue` — *modify*: fetch overlay, pass to engine, chip/badge.
- `app/pages/franquicia-aduana-uruguay.vue` — *modify*: same overlay.
- `app/pages/problemas-con-la-aduana-uruguay.vue` — *modify*: badge auto-published facts.
- Tests: `app/tests/unit/{importRules,regimeOverlay}.test.ts`.

---

## Task 1: Types + baseline (date fact, denylist, date-range, overrides field)

**Files:**
- Modify: `classes/aduana/types.ts`
- Modify: `classes/aduana/baseline.ts`
- Test: `tests/aduana/baseline.test.ts`

**Interfaces:**
- Produces: `AduanaOverride`, `AduanaDoc.overrides: AduanaOverride[]`, `DENYLIST_URLS: string[]`, `FACT_DATE_RANGES: Record<string,[string,string]>`, baseline fact `franquicia.registro_vendedor_desde` (value `"2026-10-01"`, string).

- [ ] **Step 1: Write the failing test** — add to `tests/aduana/baseline.test.ts`:

```ts
import { BASELINE, FACT_RANGES, OFFICIAL_HOSTS, FACT_DATE_RANGES, DENYLIST_URLS } from "../../classes/aduana/baseline";

/** Read a `export const NAME = '...'` string constant from the app's rules module. */
function appStringConstant(name: string): string {
  const src = fs.readFileSync(path.join(__dirname, "..", "..", "app", "utils", "importRules.ts"), "utf8");
  const m = new RegExp(`export const ${name} = '([^']+)'`).exec(src);
  if (!m) throw new Error(`${name} not found in app/utils/importRules.ts`);
  return m[1];
}

describe("aduana baseline — seller-registry date fact", () => {
  it("carries the Oct seller-registry date as a string fact, matching the app constant", () => {
    const f = BASELINE.facts.find((x) => x.id === "franquicia.registro_vendedor_desde");
    expect(f, "date fact missing").toBeDefined();
    expect(typeof f!.value).toBe("string");
    expect(f!.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(f!.value).toBe(appStringConstant("SELLER_REGISTRY_ENFORCED_FROM"));
  });

  it("gives the date fact a plausibility window, not a numeric range", () => {
    expect(FACT_DATE_RANGES["franquicia.registro_vendedor_desde"]).toEqual(["2026-07-01", "2027-12-31"]);
    expect(FACT_RANGES["franquicia.registro_vendedor_desde"]).toBeUndefined(); // no orphan numeric range
  });

  it("denylists the repealed-numbers page", () => {
    expect(DENYLIST_URLS.some((u) => u.includes("/v/27950"))).toBe(true);
  });

  it("initialises overrides as an empty array", () => {
    expect(BASELINE.overrides).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/aduana/baseline.test.ts`
Expected: FAIL — `FACT_DATE_RANGES`/`DENYLIST_URLS` not exported, date fact missing.

- [ ] **Step 3: Implement** — in `classes/aduana/types.ts`, add:

```ts
/**
 * A value the weekly grounded re-check auto-published because it PASSED the guardrail
 * (denylisted-source-free, ≥2 independent official sources agreeing, in range/valid date).
 * Mongo-owned, exactly like quotes/counts — never carried by the baseline file. Serves over the
 * baseline value UNLESS a human has since edited baseline.ts (then basedOnValue diverges and the
 * override is discharged; editing the file IS the confirm/overrule/rollback).
 */
export interface AduanaOverride {
  id: string;
  value: number | string;
  publishedAt: string;   // ISO date
  basedOnValue: string;  // String()-normalized baseline value at publish time
  sources: string[];     // the 2 corroborating official URLs
  prevValue: number | string;
}
```
and add `overrides: AduanaOverride[];` to the `AduanaDoc` interface.

In `classes/aduana/baseline.ts`:
- add `export const DENYLIST_URLS: string[] = ["https://www.aduanas.gub.uy/innovaportal/v/27950/8/innova.front/encomiendas-postales"];`
- add `export const FACT_DATE_RANGES: Record<string, [string, string]> = { "franquicia.registro_vendedor_desde": ["2026-07-01", "2027-12-31"] };`
- add a `Source` for RG 21/2026 if not present (id `rg-21-2026`, url `https://www.aduanas.gub.uy/innovaportal/file/28613/1/rg-21-2026.pdf`, kind `"norma"`), then a fact:
```ts
{
  id: "franquicia.registro_vendedor_desde",
  label: "Fecha desde la que la exoneración de IVA de EE.UU. exige vendedor registrado ante la DNA",
  value: "2026-10-01",
  sourceId: "rg-21-2026",
  article: "num. 1",
  verifiedAt: "2026-07-11",
  origin: "baseline",
},
```
- add `overrides: [],` to the `BASELINE` object literal.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/aduana/baseline.test.ts`
Expected: PASS (all existing baseline tests + the 4 new ones). The orphan-range test still passes because the date fact is a string.

- [ ] **Step 5: Commit**

```bash
git add classes/aduana/types.ts classes/aduana/baseline.ts tests/aduana/baseline.test.ts
git commit -m "feat(aduana): seller-registry date fact + denylist + date-range + overrides field"
```

---

## Task 2: Guardrail gate — date validator, denylist, 2-source auto-publish

**Files:**
- Modify: `classes/aduana/norms.ts`
- Test: `tests/aduana/norms.test.ts`

**Interfaces:**
- Consumes: `FACT_RANGES`, `FACT_DATE_RANGES`, `DENYLIST_URLS`, `OFFICIAL_HOSTS` (baseline); `AduanaFact`, `AduanaOverride`, `Source` (types).
- Produces: `applyProposals(current, raw, groundingUris, sources) => { facts, overrides, pendingReview }`. `Proposal` gains optional `corroborationUrl?: string`. New pure helpers `isDenylisted(url)`, `inDateRange(id, value)`, `independentOfficialCitations(urls, groundingUris)`.

- [ ] **Step 1: Write the failing tests** — add to `tests/aduana/norms.test.ts`:

```ts
import { BASELINE, DENYLIST_URLS } from "../../classes/aduana/baseline";

const dateFact = { id: "franquicia.registro_vendedor_desde", label: "", value: "2026-10-01",
  sourceId: "rg-21-2026", article: "num.1", verifiedAt: "2026-07-11", origin: "baseline" as const };
const rgSrc = { id: "rg-21-2026", title: "", norm: "RG 21/2026",
  url: "https://www.aduanas.gub.uy/innovaportal/file/28613/1/rg-21-2026.pdf", checkedAt: "2026-07-11", kind: "norma" as const };
const mefUrl = "https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/guia";

it("auto-publishes a CHANGED date when 2 independent official grounded sources agree", () => {
  const raw = [{ id: dateFact.id, value: "2027-01-01", sourceUrl: rgSrc.url, corroborationUrl: mefUrl }];
  const grounding = [rgSrc.url, mefUrl];
  const { overrides, facts, pendingReview } = applyProposals([dateFact], raw, grounding, [rgSrc]);
  expect(overrides).toHaveLength(1);
  expect(overrides[0]).toMatchObject({ id: dateFact.id, value: "2027-01-01", basedOnValue: "2026-10-01", prevValue: "2026-10-01" });
  expect(overrides[0].sources.sort()).toEqual([mefUrl, rgSrc.url].sort());
  expect(pendingReview).not.toContain(dateFact.id); // published, not flagged
  expect(facts[0].value).toBe("2026-10-01"); // applyProposals never mutates the baseline fact value
});

it("does NOT auto-publish a changed value with only ONE source — flags instead", () => {
  const raw = [{ id: dateFact.id, value: "2027-01-01", sourceUrl: rgSrc.url }];
  const { overrides, pendingReview } = applyProposals([dateFact], raw, [rgSrc.url], [rgSrc]);
  expect(overrides).toHaveLength(0);
  expect(pendingReview).toContain(dateFact.id);
});

it("never lets a denylisted page be one of the 2 sources (repealed-numbers trap)", () => {
  const minFact = BASELINE.facts.find((f) => f.id === "prestacion_unica.minimo_usd")!; // value 20
  const src = BASELINE.sources.find((s) => s.id === minFact.sourceId)!;
  const denyUrl = DENYLIST_URLS[0]; // v/27950 says USD 10
  const raw = [{ id: minFact.id, value: 10, sourceUrl: denyUrl, corroborationUrl: denyUrl + "?x=1" }];
  const { overrides, pendingReview } = applyProposals([minFact], raw, [denyUrl, denyUrl + "?x=1"], [src]);
  expect(overrides).toHaveLength(0);        // the repealed 10 can never publish
  expect(pendingReview).toContain(minFact.id);
});

it("rejects an out-of-window date and a number proposed for a date fact", () => {
  const bad = [{ id: dateFact.id, value: "2099-01-01", sourceUrl: rgSrc.url, corroborationUrl: mefUrl }];
  expect(applyProposals([dateFact], bad, [rgSrc.url, mefUrl], [rgSrc]).overrides).toHaveLength(0);
  const numeric = [{ id: dateFact.id, value: 800, sourceUrl: rgSrc.url, corroborationUrl: mefUrl }];
  expect(applyProposals([dateFact], numeric, [rgSrc.url, mefUrl], [rgSrc]).overrides).toHaveLength(0);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/aduana/norms.test.ts`
Expected: FAIL — `applyProposals` has no `overrides` in its return.

- [ ] **Step 3: Implement** in `classes/aduana/norms.ts`:

Add imports `FACT_DATE_RANGES, DENYLIST_URLS` and `AduanaOverride`. Add helpers:
```ts
const normPath = (url: string): string | null => {
  const u = safeUrl(url); if (!u) return null;
  return `${hostOf(url)}${u.pathname.replace(/\/+$/, "")}`.toLowerCase();
};
const isDenylisted = (url: string): boolean => {
  const p = normPath(url); if (!p) return true;
  return DENYLIST_URLS.some((d) => { const dp = normPath(d); return dp !== null && p.startsWith(dp); });
};
const inDateRange = (id: string, value: number | string): boolean => {
  const win = FACT_DATE_RANGES[id]; if (!win) return false;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return value >= win[0] && value <= win[1];
};
/** distinct (host,path), grounded, official, not denylisted — the corroboration count. */
function independentOfficialCitations(urls: string[], groundingUris: string[]): string[] {
  const seen = new Set<string>(); const out: string[] = [];
  for (const url of urls) {
    if (!url) continue;
    const u = safeUrl(url); if (!u || u.pathname.length <= 1) continue;
    if (!isOfficial(url) || isDenylisted(url) || !isGrounded(url, groundingUris)) continue;
    const key = normPath(url); if (!key || seen.has(key)) continue;
    seen.add(key); out.push(url);
  }
  return out;
}
```
Extend `Proposal` with `corroborationUrl?: string`; keep it in `parseProposals`.

In `applyProposals`, change the accumulator to also build `overrides`. For a proposal whose value **differs** from the fact, replace the current unconditional `pendingReview.push` with:
```ts
if (String(p.value) !== String(fact.value)) {
  const cites = independentOfficialCitations([p.sourceUrl, p.corroborationUrl].filter(Boolean) as string[], groundingUris);
  const isDate = fact.id in FACT_DATE_RANGES;
  const valid = isDate ? inDateRange(fact.id, p.value) : inRange(fact.id, p.value);
  if (cites.length >= 2 && valid) {
    overrides.push({ id: fact.id, value: p.value, publishedAt: today, basedOnValue: String(fact.value),
      sources: cites.slice(0, 2), prevValue: fact.value });
    return fact; // never mutate the baseline fact's value
  }
  pendingReview.push(fact.id);
  return fact;
}
```
Keep the unchanged/`aiCheckedAt` path as-is (but route date facts through `inDateRange` there too). Return `{ facts, overrides, pendingReview }`. In `refreshNorms`, collect `overrides` across batches (`overrides.push(...result.overrides)`) and return `{ ...doc, facts, overrides: [...existing-minus-superseded, ...new], pendingReview }` — dedupe overrides by id (last write wins).

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/aduana/norms.test.ts`
Expected: PASS. Existing norms tests still pass (the unchanged path is unchanged).

- [ ] **Step 5: Commit**

```bash
git add classes/aduana/norms.ts tests/aduana/norms.test.ts
git commit -m "feat(aduana): auto-publish gate — 2 independent official sources + denylist + date validator"
```

---

## Task 3: Override merge & precedence + payload exposure

**Files:**
- Modify: `classes/aduana/store.ts`, `classes/aduana/payload.ts`
- Test: `tests/aduana/store.test.ts`

**Interfaces:**
- Consumes: `AduanaOverride`, `AduanaDoc.overrides`.
- Produces: `mergeAduanaDoc` applies overrides; `PublicAduanaPayload.facts[]` gains `autoPublished?`, `publishedAt?`, `prevValue?`, `overrideSources?` (via a wrapped fact type in payload).

- [ ] **Step 1: Write the failing tests** — add to `tests/aduana/store.test.ts`:

```ts
it("serves an AI override over the baseline value", () => {
  const base = emptyAduanaDoc();
  const f = base.facts.find((x) => x.id === "franquicia.registro_vendedor_desde")!;
  const merged = mergeAduanaDoc(
    { overrides: [{ id: f.id, value: "2027-01-01", publishedAt: "2026-09-30", basedOnValue: String(f.value), sources: ["a", "b"], prevValue: f.value }] },
    base
  );
  expect(merged.facts.find((x) => x.id === f.id)!.value).toBe("2027-01-01");
});

it("discharges the override once a human edits baseline.ts (basedOnValue diverges)", () => {
  const base = emptyAduanaDoc();
  const f = base.facts.find((x) => x.id === "franquicia.registro_vendedor_desde")!;
  f.value = "2027-01-01"; f.verifiedAt = "2026-10-05"; // human promoted it in the file
  const merged = mergeAduanaDoc(
    { overrides: [{ id: f.id, value: "2027-01-01", publishedAt: "2026-09-30", basedOnValue: "2026-10-01", sources: ["a", "b"], prevValue: "2026-10-01" }] },
    base
  );
  const got = merged.facts.find((x) => x.id === f.id)!;
  expect(got.value).toBe("2027-01-01");
  expect(got.origin).toBe("baseline"); // human-verified, NOT the AI override
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/aduana/store.test.ts`
Expected: FAIL — overrides not applied.

- [ ] **Step 3: Implement** in `classes/aduana/store.ts` `mergeAduanaDoc`, after building `facts` from the aiCheckedAt merge, apply overrides:
```ts
const overrideById = new Map((stored.overrides ?? []).map((o) => [o.id, o]));
const withOverrides = facts.map((f) => {
  const o = overrideById.get(f.id);
  // human wins: if the baseline value moved since the AI published, the override is discharged.
  if (o && String(f.value) === o.basedOnValue) {
    return { ...f, value: o.value, origin: "ai" as const, aiCheckedAt: o.publishedAt };
  }
  return f;
});
```
Return `withOverrides` as `facts`, and carry `overrides: (stored.overrides ?? []).filter((o) => { const bf = baseFactById.get(o.id); return bf && String(bf.value) === o.basedOnValue; })` so discharged overrides don't linger. In `emptyAduanaDoc`, `overrides` comes from BASELINE (`[]`).

In `classes/aduana/payload.ts`, widen the `facts` field: for each fact, if a live (non-discharged) override exists, attach `autoPublished: true, publishedAt, prevValue, overrideSources`. Build that from `doc.overrides` keyed by id.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/aduana/store.test.ts`
Expected: PASS. Existing store tests (aiCheckedAt/pendingReview discharge) still pass.

- [ ] **Step 5: Commit**

```bash
git add classes/aduana/store.ts classes/aduana/payload.ts tests/aduana/store.test.ts
git commit -m "feat(aduana): merge AI overrides with human-baseline precedence + expose in payload"
```

---

## Task 4: Discovery stage (deterministic index diff)

**Files:**
- Create: `classes/aduana/discover.ts`
- Test: `tests/aduana/discover.test.ts`

**Interfaces:**
- Produces: `extractNormLinks(html: string, baseUrl: string): string[]` (pure); `discoverNewNorms(knownUrls: string[], fetchImpl?): Promise<{url:string,title?:string}[]>`.

- [ ] **Step 1: Write the failing test:**

```ts
import { extractNormLinks, discoverNewNorms } from "../../classes/aduana/discover";

const html = `<a href="/innovaportal/file/28428/1/resolucion-9_2026.pdf">RG 9</a>
<a href="/innovaportal/file/29000/1/rg-30-2026.pdf">RG 30</a>
<a href="/algo/otra-cosa">no</a>`;

it("extracts only norm-document links, absolutised", () => {
  const links = extractNormLinks(html, "https://www.aduanas.gub.uy");
  expect(links).toContain("https://www.aduanas.gub.uy/innovaportal/file/29000/1/rg-30-2026.pdf");
  expect(links.some((l) => l.includes("otra-cosa"))).toBe(false);
});

it("returns only URLs not already known", async () => {
  const fakeFetch = (async () => ({ ok: true, text: async () => html })) as any;
  const known = ["https://www.aduanas.gub.uy/innovaportal/file/28428/1/resolucion-9_2026.pdf"];
  const found = await discoverNewNorms(known, fakeFetch);
  expect(found.map((f) => f.url)).toContain("https://www.aduanas.gub.uy/innovaportal/file/29000/1/rg-30-2026.pdf");
  expect(found.map((f) => f.url)).not.toContain(known[0]);
});

it("tolerates a broken index without throwing", async () => {
  const boom = (async () => { throw new Error("network"); }) as any;
  await expect(discoverNewNorms([], boom)).resolves.toEqual([]);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/aduana/discover.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `classes/aduana/discover.ts`:
```ts
// Deterministic discovery: read the official norm indices, diff their document links against the
// URLs we already cite. A candidate is a NEW official norm URL — Gemini interprets it downstream but
// cannot invent one, because it must appear on an index we fetched.
const INDEX_URLS = [
  "https://www.aduanas.gub.uy/innovaportal/v/27953/8/innova.front/resoluciones-generales-2026",
  "https://www.impo.com.uy/bases/decretos/50-2026", // IMPO decreto hub; sibling links surface new decretos
];
const NORM_LINK = /href="([^"]*\/innovaportal\/file\/\d+\/[^"]+\.pdf|[^"]*\/bases\/decretos\/[\w-]+)"/gi;

export function extractNormLinks(html: string, baseUrl: string): string[] {
  const out = new Set<string>(); let m: RegExpExecArray | null;
  while ((m = NORM_LINK.exec(html))) { try { out.add(new URL(m[1], baseUrl).toString()); } catch {} }
  return [...out];
}
export async function discoverNewNorms(knownUrls: string[], fetchImpl: typeof fetch = fetch) {
  const known = new Set(knownUrls.map((u) => u.replace(/\/+$/, "")));
  const found = new Map<string, { url: string; title?: string }>();
  for (const index of INDEX_URLS) {
    try {
      const res = await fetchImpl(index);
      if (!res.ok) continue;
      for (const url of extractNormLinks(await res.text(), index)) {
        const key = url.replace(/\/+$/, "");
        if (!known.has(key)) found.set(key, { url });
      }
    } catch { /* an index being down must not sink the sweep */ }
  }
  return [...found.values()];
}
```
(Exact `INDEX_URLS` verified live during Step 4 — open each and confirm it lists the 2026 norm links; adjust the regex/URL if the markup differs. Do not ship an index URL you have not fetched successfully.)

- [ ] **Step 4: Verify indices are real** — `curl -s <INDEX_URL> | grep -o 'innovaportal/file/[0-9]*' | head`. Confirm links appear; fix `INDEX_URLS`/regex if not. Then `npx vitest run tests/aduana/discover.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add classes/aduana/discover.ts tests/aduana/discover.test.ts
git commit -m "feat(aduana): deterministic discovery sweep of Aduanas/IMPO norm indices"
```

---

## Task 5: Backend admin Telegram util

**Files:**
- Create: `classes/notify.ts`
- Test: `tests/notify.test.ts`

**Interfaces:**
- Produces: `notifyAdmin(text: string, fetchImpl?): Promise<boolean>` — reads `process.env.TELEGRAM_BOT_TOKEN` + `TELEGRAM_ADMIN_CHAT_ID`; returns `false` (never throws) when unconfigured or on error.

- [ ] **Step 1: Write the failing test:**

```ts
import { notifyAdmin } from "../classes/notify";
it("returns false when unconfigured, without throwing", async () => {
  const old = process.env.TELEGRAM_BOT_TOKEN; delete process.env.TELEGRAM_BOT_TOKEN;
  await expect(notifyAdmin("hi")).resolves.toBe(false);
  if (old) process.env.TELEGRAM_BOT_TOKEN = old;
});
it("posts to the Bot API when configured", async () => {
  process.env.TELEGRAM_BOT_TOKEN = "t"; process.env.TELEGRAM_ADMIN_CHAT_ID = "1";
  let hit = ""; const fake = (async (u: string) => { hit = u; return { json: async () => ({ ok: true }) }; }) as any;
  await expect(notifyAdmin("hi", fake)).resolves.toBe(true);
  expect(hit).toContain("/bott/sendMessage");
});
```

- [ ] **Step 2: Run** → FAIL (module missing).

- [ ] **Step 3: Implement** `classes/notify.ts` (mirror `app/server/utils/telegram.ts`):
```ts
export async function notifyAdmin(text: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) { console.warn("[notify] no TELEGRAM creds — skipping admin ping"); return false; }
  try {
    const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown", link_preview_options: { is_disabled: true } }),
    });
    const data: any = await (res as any).json().catch(() => ({}));
    return Boolean(data?.ok);
  } catch (e) { console.warn("[notify] telegram failed:", e); return false; }
}
```

- [ ] **Step 4: Run** → PASS.

- [ ] **Step 5: Commit**

```bash
git add classes/notify.ts tests/notify.test.ts
git commit -m "feat(backend): graceful admin Telegram notifier for sync jobs"
```

---

## Task 6: Wire sync_aduana.ts — discovery stage + overrides + Telegram alerts

**Files:**
- Modify: `sync_aduana.ts`

**Interfaces:**
- Consumes: `discoverNewNorms`, `notifyAdmin`, `refreshNorms` (now returns overrides via the doc).

- [ ] **Step 1: Write the failing test** — `tests/aduana/sync_summary.test.ts` (unit-test the alert-message builder, extracted for testability):

```ts
import { buildAlerts } from "../../classes/aduana/alerts";
it("builds one line per state change, and nothing when quiet", () => {
  expect(buildAlerts({ published: [], flagged: [], discovered: [] })).toEqual([]);
  const msgs = buildAlerts({
    published: [{ id: "franquicia.registro_vendedor_desde", value: "2027-01-01", prevValue: "2026-10-01" }],
    flagged: ["prestacion_unica.minimo_usd"],
    discovered: [{ url: "https://x/rg-30.pdf" }],
  });
  expect(msgs.join("\n")).toContain("2027-01-01");
  expect(msgs.join("\n")).toContain("prestacion_unica.minimo_usd");
  expect(msgs.join("\n")).toContain("rg-30");
});
```

- [ ] **Step 2: Run** → FAIL (`alerts` missing).

- [ ] **Step 3: Implement** `classes/aduana/alerts.ts` with `buildAlerts({published, flagged, discovered})` returning `string[]` (🟢/🟡/🔵 lines). Then in `sync_aduana.ts`:
- Before the norms stage, add a discovery stage:
```ts
let discovered: { url: string; title?: string }[] = [];
try {
  discovered = await discoverNewNorms(doc.sources.map((s) => s.url));
  if (discovered.length) discoveryRan = true;
} catch (e) { console.error("[aduana] discovery failed", e); }
```
Feed `discovered` urls into `refreshNorms` (extend its prompt builder to append "posibles normas nuevas: <urls>" so Gemini reads them) — pass as a second arg `refreshNorms(doc, discovered.map(d=>d.url))`.
- After the run, compute `published` from `doc.overrides` whose `publishedAt === today`, `flagged` from `doc.pendingReview`, and send:
```ts
const msgs = buildAlerts({ published, flagged: doc.pendingReview, discovered });
for (const m of msgs) await notifyAdmin(m);
```
- Include `discoveryRan` in the `ranAnyStage` OR.

- [ ] **Step 4: Run** `npx vitest run tests/aduana/` → all PASS. Then smoke-run the entrypoint offline: `GEMINI_API_KEY= npx tsx sync_aduana.ts` should log "discovery" + "no GEMINI_API_KEY" and exit without touching prod (no creds → no writes beyond corpus). Confirm no crash.

- [ ] **Step 5: Commit**

```bash
git add sync_aduana.ts classes/aduana/alerts.ts tests/aduana/sync_summary.test.ts
git commit -m "feat(aduana): sync runs discovery, threads overrides, and Telegram-alerts state changes"
```

---

## Task 7: Cadence — daily during the decree window

**Files:**
- Create: `sync_aduana_daily.ts`
- Modify: `ecosystem.config.js`

- [ ] **Step 1: Write the failing test** — `tests/aduana/window.test.ts`:

```ts
import { inDecreeWindow } from "../../classes/aduana/window";
it("is open Sept–Oct 2026 and closed outside", () => {
  expect(inDecreeWindow(new Date("2026-09-15T12:00:00Z"))).toBe(true);
  expect(inDecreeWindow(new Date("2026-10-31T12:00:00Z"))).toBe(true);
  expect(inDecreeWindow(new Date("2026-08-31T12:00:00Z"))).toBe(false);
  expect(inDecreeWindow(new Date("2026-11-02T12:00:00Z"))).toBe(false);
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement** `classes/aduana/window.ts`:
```ts
export function inDecreeWindow(today: Date): boolean {
  const d = today.toISOString().slice(0, 10);
  return d >= "2026-09-01" && d <= "2026-11-01";
}
```
`sync_aduana_daily.ts`:
```ts
import { inDecreeWindow } from "./classes/aduana/window";
if (!inDecreeWindow(new Date())) { console.log("[aduana-daily] outside decree window — skip"); process.exit(0); }
import("./sync_aduana"); // runs the same job
```
`ecosystem.config.js`: add app `currency-aduana-daily`, `script: "dist/sync_aduana_daily.js"`, `cron_restart: "30 9 * * *"`, `autorestart: false`.

- [ ] **Step 4: Run** `npx vitest run tests/aduana/window.test.ts` → PASS. `npx tsx sync_aduana_daily.ts` today (2026-07-18, outside window) → logs skip, exits 0.

- [ ] **Step 5: Commit**

```bash
git add sync_aduana_daily.ts classes/aduana/window.ts ecosystem.config.js tests/aduana/window.test.ts
git commit -m "feat(aduana): daily cadence during the 2026-09→11 decree window"
```

---

## Task 8: Deploy — register both apps

**Files:**
- Modify: `scripts/deploy-backend.sh`

- [ ] **Step 1: Read** `scripts/deploy-backend.sh`, find `OTHER_APPS`.
- [ ] **Step 2: Add** `currency-aduana` (if missing) and `currency-aduana-daily` to the `OTHER_APPS` list.
- [ ] **Step 3: Verify** `grep -n "currency-aduana" scripts/deploy-backend.sh` shows both.
- [ ] **Step 4: Commit**

```bash
git add scripts/deploy-backend.sh
git commit -m "chore(deploy): register currency-aduana + currency-aduana-daily in OTHER_APPS"
```

---

## Task 9: App importRules — injectable overlay with static fallback

**Files:**
- Modify: `app/utils/importRules.ts`
- Test: `app/tests/unit/importRules.test.ts`

**Interfaces:**
- Produces: `RegimeRules`, `DEFAULT_REGIME_RULES: RegimeRules`, `resolveRegime(input, rules?: RegimeRules)`, `isSellerRegistryEnforced(today, rules?: RegimeRules)`. The existing top-level `const`s stay (consumed by `DEFAULT_REGIME_RULES` and by the drift-guard test).

- [ ] **Step 1: Write the failing tests** — add to `app/tests/unit/importRules.test.ts`:

```ts
import { resolveRegime, DEFAULT_REGIME_RULES, isSellerRegistryEnforced, type RegimeRules } from "~/utils/importRules";

it("uses the live overlay date, not the static constant", () => {
  const rules: RegimeRules = { ...DEFAULT_REGIME_RULES, sellerRegistryEnforcedFrom: "2027-01-01" };
  expect(isSellerRegistryEnforced(new Date("2026-11-01"), rules)).toBe(false); // pushed to 2027
  expect(isSellerRegistryEnforced(new Date("2026-11-01"))).toBe(true);         // static default = 2026-10-01
});

it("prices with an overlaid minimum", () => {
  const rules: RegimeRules = { ...DEFAULT_REGIME_RULES, simplifiedMinUsd: 25 };
  const d = resolveRegime({ valueUsd: 30, origin: "other", franchiseAvailableUsd: 0, shipmentsUsed: 0, useFranchise: false }, rules);
  expect(d.regime).toBe("simplificado");
  expect(d.reasons.join(" ")).toContain("25");
});

it("falls back to the static baseline when no overlay is passed (no regression)", () => {
  const d = resolveRegime({ valueUsd: 100, origin: "usa", franchiseAvailableUsd: 800, shipmentsUsed: 0, useFranchise: true, today: new Date("2026-07-01") });
  expect(d.regime).toBe("franquicia"); expect(d.ivaExempt).toBe(true);
});
```

- [ ] **Step 2: Run** `cd app && npx vitest run tests/unit/importRules.test.ts` → FAIL.

- [ ] **Step 3: Implement** in `app/utils/importRules.ts`:
```ts
export interface RegimeRules {
  franchiseAnnualUsd: number; simplifiedRatePct: number; simplifiedMinUsd: number;
  usaIvaExemptionUsd: number; sellerRegistryEnforcedFrom: string;
}
export const DEFAULT_REGIME_RULES: RegimeRules = {
  franchiseAnnualUsd: FRANCHISE_ANNUAL_USD, simplifiedRatePct: SIMPLIFIED_RATE_PCT,
  simplifiedMinUsd: SIMPLIFIED_MIN_USD, usaIvaExemptionUsd: USA_IVA_EXEMPTION_USD,
  sellerRegistryEnforcedFrom: SELLER_REGISTRY_ENFORCED_FROM,
};
export function isSellerRegistryEnforced(today: Date, rules: RegimeRules = DEFAULT_REGIME_RULES): boolean {
  return toISODate(today) >= rules.sellerRegistryEnforcedFrom;
}
export function resolveRegime(input: RegimeInput, rules: RegimeRules = DEFAULT_REGIME_RULES): RegimeDecision {
  // replace every bare constant in the body with rules.<field>; call isSellerRegistryEnforced(today, rules)
  ...
}
```
Keep the exported `const`s (the drift-guard test + `DEFAULT_REGIME_RULES` read them). Update every internal use of `FRANCHISE_ANNUAL_USD`/`SIMPLIFIED_*`/`USA_IVA_EXEMPTION_USD` inside `resolveRegime` to `rules.*`.

- [ ] **Step 4: Run** `cd app && npx vitest run tests/unit/importRules.test.ts` → PASS. Then run the whole app unit suite `npx vitest run tests/unit/importTax.test.ts tests/unit/importRules.test.ts` → PASS (no regression; `importTax.ts` still calls `resolveRegime(input)` with the default overlay).

- [ ] **Step 5: Commit**

```bash
git add app/utils/importRules.ts app/tests/unit/importRules.test.ts
git commit -m "feat(app): injectable RegimeRules overlay with static baseline fallback"
```

---

## Task 10: App overlay mapping (payload → RegimeRules, deep-merge)

**Files:**
- Create: `app/utils/regimeOverlay.ts`
- Modify: `app/server/utils/aduanaFallback.ts` (extend `PublicAduanaPayload` fact type: `origin?`, `autoPublished?`, `publishedAt?`, `prevValue?`)
- Test: `app/tests/unit/regimeOverlay.test.ts`

**Interfaces:**
- Consumes: `PublicAduanaPayload`, `DEFAULT_REGIME_RULES`.
- Produces: `regimeRulesFromPayload(payload): { rules: RegimeRules; asOf: string | null; autoPublished: string[] }`.

- [ ] **Step 1: Write the failing test:**

```ts
import { regimeRulesFromPayload } from "~/utils/regimeOverlay";
import { DEFAULT_REGIME_RULES } from "~/utils/importRules";

const payload = (facts: any[]) => ({ facts, problems: [], sources: [], updatedAt: "2026-09-30", stale: false, pendingReview: [] });

it("maps fact ids onto RegimeRules", () => {
  const { rules } = regimeRulesFromPayload(payload([
    { id: "franquicia.registro_vendedor_desde", value: "2027-01-01" },
    { id: "prestacion_unica.minimo_usd", value: 25 },
  ]) as any);
  expect(rules.sellerRegistryEnforcedFrom).toBe("2027-01-01");
  expect(rules.simplifiedMinUsd).toBe(25);
  expect(rules.franchiseAnnualUsd).toBe(DEFAULT_REGIME_RULES.franchiseAnnualUsd); // untouched key kept
});

it("never drops a key on a garbage payload", () => {
  const { rules } = regimeRulesFromPayload({ facts: null } as any);
  expect(rules).toEqual(DEFAULT_REGIME_RULES);
});

it("reports which values are auto-published", () => {
  const { autoPublished } = regimeRulesFromPayload(payload([
    { id: "prestacion_unica.minimo_usd", value: 25, autoPublished: true },
  ]) as any);
  expect(autoPublished).toContain("prestacion_unica.minimo_usd");
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement** `app/utils/regimeOverlay.ts`:
```ts
import { DEFAULT_REGIME_RULES, type RegimeRules } from "./importRules";
const MAP: Record<string, keyof RegimeRules> = {
  "franquicia.tope_anual_usd": "franchiseAnnualUsd",
  "prestacion_unica.tasa_pct": "simplifiedRatePct",
  "prestacion_unica.minimo_usd": "simplifiedMinUsd",
  "tifa.exoneracion_usd": "usaIvaExemptionUsd",
  "franquicia.registro_vendedor_desde": "sellerRegistryEnforcedFrom",
};
export function regimeRulesFromPayload(payload: any): { rules: RegimeRules; asOf: string | null; autoPublished: string[] } {
  const rules: RegimeRules = { ...DEFAULT_REGIME_RULES }; // deep-merge base: never drops a key
  const autoPublished: string[] = [];
  const facts = Array.isArray(payload?.facts) ? payload.facts : [];
  for (const f of facts) {
    const key = MAP[f?.id]; if (!key) continue;
    const isDate = key === "sellerRegistryEnforcedFrom";
    if (isDate && typeof f.value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(f.value)) rules[key] = f.value as any;
    else if (!isDate && typeof f.value === "number" && Number.isFinite(f.value)) (rules[key] as any) = f.value;
    else continue;
    if (f.autoPublished) autoPublished.push(f.id);
  }
  return { rules, asOf: typeof payload?.updatedAt === "string" ? payload.updatedAt : null, autoPublished };
}
```
Extend `PublicAduanaPayload`'s fact type in `aduanaFallback.ts` with the optional fields.

- [ ] **Step 4: Run** → PASS.

- [ ] **Step 5: Commit**

```bash
git add app/utils/regimeOverlay.ts app/server/utils/aduanaFallback.ts app/tests/unit/regimeOverlay.test.ts
git commit -m "feat(app): map /api/aduana payload to a self-healing RegimeRules overlay"
```

---

## Task 11: Wire the calculator + franquicia pages to the overlay

**Files:**
- Modify: `app/pages/herramientas/calculadora-impuestos-importacion.vue`
- Modify: `app/pages/franquicia-aduana-uruguay.vue`

- [ ] **Step 1:** Read both pages; find where they call `resolveRegime` / read the constants (directly or via `importTax`/`calculators`).
- [ ] **Step 2:** In each page's `<script setup>`, add:
```ts
const { data: aduana } = await useFetch("/api/aduana", { key: "aduana-overlay" });
const overlay = computed(() => regimeRulesFromPayload(aduana.value));
```
Pass `overlay.value.rules` into `resolveRegime(input, rules)` (thread `rules` through `importTax`/`calculators` if they wrap it — add an optional `rules` param there too, defaulting to `DEFAULT_REGIME_RULES`, mirroring Task 9).
- [ ] **Step 3:** Add an "actualizado el {{ overlay.asOf }}" chip, and when `overlay.autoPublished.length`, a small "actualización automática sin verificación humana" note (match the hub's badge copy).
- [ ] **Step 4: Verify** — `cd app && npx nuxi prepare && npx vitest run` (unit) then drive the page (see Task 12 verify) — the calculator's seller-registry behaviour follows the live date. Confirm SSR renders with the baseline when `/api/aduana` is unreachable (stop backend, reload → still renders, static numbers).
- [ ] **Step 5: Commit**

```bash
git add app/pages/herramientas/calculadora-impuestos-importacion.vue app/pages/franquicia-aduana-uruguay.vue app/utils/importTax.ts app/utils/calculators.ts
git commit -m "feat(app): calculator + franquicia semaforo read the live regime overlay"
```

---

## Task 12: Hub badge for auto-published facts + full verification

**Files:**
- Modify: `app/pages/problemas-con-la-aduana-uruguay.vue`

- [ ] **Step 1:** Read the page; find where facts render with the `verificado`/`aiCheckedAt` badges.
- [ ] **Step 2:** For a fact with `autoPublished`, render a distinct chip: "Actualizado automáticamente el {{ publishedAt }} — sin verificación humana" + (optional) "antes: {{ prevValue }}". Never render an auto-published fact as "verificado contra la norma".
- [ ] **Step 3: Verify end-to-end** (the `verify` skill):
  - Backend: `npx vitest run tests/aduana tests/notify.test.ts` → all green.
  - App: `cd app && npx vitest run` → green incl. `noGeminiInApp` + `baseline.test.ts` drift-guard.
  - Drive it: run the app, open `/problemas-con-la-aduana-uruguay`, `/franquicia-aduana-uruguay`, `/herramientas/calculadora-impuestos-importacion` — pages render with baseline; temporarily seed a Mongo override (or a stubbed `/api/aduana`) for `franquicia.registro_vendedor_desde = 2027-01-01` and confirm the calculator's IVA-enforcement date and the hub badge both move.
- [ ] **Step 4: Commit**

```bash
git add app/pages/problemas-con-la-aduana-uruguay.vue
git commit -m "feat(app): badge auto-published aduana facts as machine-updated, unverified"
```

---

## Ops / post-merge checklist (not code)

- Set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ADMIN_CHAT_ID` in the **root `.env` on the VPS** (backend admin pings; without them alerts silently no-op — acceptable, but you get no notice).
- Confirm `GEMINI_API_KEY` present on the VPS (set 2026-07-18) and billing active.
- After deploy: `pm2 start ecosystem.config.js --only currency-aduana-daily`; confirm `pm2 list` shows both aduana apps.
- First run populates `overrides`/discovery; watch `pm2 logs currency-aduana` for the 🟢/🟡/🔵 lines.

## Self-review notes

- **Spec coverage:** discovery (T4), auto-publish guardrail w/ denylist+2-source+date (T2), override precedence (T3), Oct date as fact (T1), app one-source-of-truth (T9–T11), hub badge (T12), Telegram (T5–T6), cadence (T7), deploy (T8). All spec sections mapped.
- **Placeholder scan:** the only deferred concrete is `INDEX_URLS` in T4, gated by a live-verify step (Step 4) that forbids shipping an unfetched index — a verification task, not a placeholder.
- **Type consistency:** `RegimeRules` fields, `AduanaOverride` fields, `regimeRulesFromPayload` return shape, and `applyProposals` return `{facts, overrides, pendingReview}` are used identically across tasks.
