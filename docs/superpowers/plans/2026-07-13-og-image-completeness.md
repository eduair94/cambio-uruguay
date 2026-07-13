# OG Image Completeness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the one genuinely missing OG image (`buscar.vue`) and add a QA script that hits every real route's OG image URL so a future gap is caught automatically instead of by someone noticing a bad social preview.

**Architecture:** Two independent, additive changes. (1) One `defineOgImageComponent` call added to `app/pages/buscar.vue`, matching the existing per-page pattern used by ~60 other pages. (2) A new pure-logic library (`app/scripts/lib/og-image-check.mjs`) covered by unit tests, plus a thin CLI entry point (`app/scripts/check-og-images.mjs`) that fetches the site's own live sitemap endpoint, builds each route's OG image URL, and reports pass/fail with a non-zero exit code on any failure.

**Tech Stack:** Vue 3 `<script setup>` / Nuxt 3 auto-imports (`defineOgImageComponent`, `useI18n`), plain Node.js ESM (global `fetch`, no new dependency), Vitest for the unit tests (existing `tests/unit/**/*.test.ts` convention).

## Global Constraints

- No new npm dependencies (spec: "plain Node, no new dependency").
- No static PNGs generated or committed — site is SSR (pm2), on-demand render + cache is the production path (spec "Out of scope").
- No manifest/config file introduced for OG page wiring — the existing per-page inline `defineOgImageComponent` call is the established convention (spec "Out of scope").
- Route source for the QA script must be the live `/api/__sitemap__/urls` endpoint, never a hand-maintained list (spec Part B — `lightmode-axe.mjs`'s hand-list already drifted, listing noindex `/cuenta`, `/widget`, `/offline`).
- QA script checks default-locale (`es`, unprefixed) paths only — one locale is a representative sample of the same satori template (spec Part B).
- `npm run lint` is the project's working static-check gate; `npm run typecheck` is separately known-broken (`vue-tsc` crash) and must not be relied on (see project memory `typecheck-broken`).

---

### Task 1: Wire the missing OG image on `buscar.vue`

**Files:**
- Modify: `app/pages/buscar.vue:135-137`

**Interfaces:**
- Consumes: `t` and `locale` from `useI18n()`, already destructured at `app/pages/buscar.vue:96`. i18n keys `search.pageTitle` and `search.pageDescription`, already used by this file's existing `useSeoMeta` block at lines 137-146.
- Produces: nothing consumed by later tasks — this task is self-contained.

- [ ] **Step 1: Add the `defineOgImageComponent` call**

Open `app/pages/buscar.vue`. Immediately before the existing `useSeoMeta({...})` call (which starts at line 137), insert:

```ts
defineOgImageComponent('Cambio', {
  title: () => t('search.pageTitle'),
  subtitle: () => t('search.pageDescription'),
  tag: 'BÚSQUEDA',
  locale: locale.value as 'es' | 'en' | 'pt',
})
```

The surrounding code (lines 135-147) should read:

```ts
const canonicalUrl = 'https://cambio-uruguay.com/buscar'

defineOgImageComponent('Cambio', {
  title: () => t('search.pageTitle'),
  subtitle: () => t('search.pageDescription'),
  tag: 'BÚSQUEDA',
  locale: locale.value as 'es' | 'en' | 'pt',
})

useSeoMeta({
  title: () =>
    query.value
      ? `${t('search.resultsFor', { q: query.value })} | Cambio Uruguay`
      : `${t('search.pageTitle')} | Cambio Uruguay`,
  description: () => t('search.pageDescription'),
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})
```

- [ ] **Step 2: Lint**

Run: `cd app && npm run lint -- pages/buscar.vue`
Expected: no errors.

- [ ] **Step 3: Manual check against the dev server**

Run: `cd app && npm run dev` (leave running)

In a second terminal: `curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://localhost:3000/__og-image__/image/buscar/og.png`
Expected: `200 image/png` (first hit renders live and may take a couple seconds; a second identical `curl` should be fast, served from cache).

Stop the dev server (Ctrl+C) once confirmed.

- [ ] **Step 4: Commit**

```bash
git add app/pages/buscar.vue
git commit -m "feat(seo): add OG image to /buscar landing page"
```

---

### Task 2: Pure OG-image-check library + unit tests

**Files:**
- Create: `app/scripts/lib/og-image-check.mjs`
- Test: `app/tests/unit/og-image-check.test.ts`

**Interfaces:**
- Produces (consumed by Task 3):
  - `ogImageUrl(base: string, path: string): string`
  - `filterDefaultLocalePaths(urls: Array<{ loc: string }>): string[]`
  - `evaluateOgImageResponse(input: { ok: boolean, status: number, contentType: string | null, byteLength: number }): { ok: boolean, reason?: string }`
  - `MIN_OG_IMAGE_BYTES: number` (exported constant, currently `1000`)

- [ ] **Step 1: Write the failing tests**

Create `app/tests/unit/og-image-check.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  evaluateOgImageResponse,
  filterDefaultLocalePaths,
  ogImageUrl,
} from '../../scripts/lib/og-image-check.mjs'

describe('ogImageUrl', () => {
  it('builds the nuxt-og-image URL for a normal path', () => {
    expect(ogImageUrl('http://localhost:3000', '/buscar')).toBe(
      'http://localhost:3000/__og-image__/image/buscar/og.png'
    )
  })

  it('handles a nested path', () => {
    expect(ogImageUrl('http://localhost:3000', '/herramientas/calculadora-iva')).toBe(
      'http://localhost:3000/__og-image__/image/herramientas/calculadora-iva/og.png'
    )
  })

  it('avoids a double slash for the root path', () => {
    expect(ogImageUrl('http://localhost:3000', '/')).toBe(
      'http://localhost:3000/__og-image__/image/og.png'
    )
  })
})

describe('filterDefaultLocalePaths', () => {
  it('drops /en and /pt prefixed duplicates, keeps default-locale paths', () => {
    const urls = [
      { loc: '/buscar' },
      { loc: '/en/buscar' },
      { loc: '/pt/buscar' },
      { loc: '/herramientas/calculadora-iva' },
    ]
    expect(filterDefaultLocalePaths(urls)).toEqual(['/buscar', '/herramientas/calculadora-iva'])
  })

  it('dedupes repeated paths', () => {
    const urls = [{ loc: '/buscar' }, { loc: '/buscar' }]
    expect(filterDefaultLocalePaths(urls)).toEqual(['/buscar'])
  })

  it('does not drop paths that merely contain "en" or "pt" as a substring', () => {
    const urls = [{ loc: '/entretenimiento' }, { loc: '/prestamos-uruguay' }]
    expect(filterDefaultLocalePaths(urls)).toEqual(['/entretenimiento', '/prestamos-uruguay'])
  })
})

describe('evaluateOgImageResponse', () => {
  it('passes a healthy PNG response', () => {
    expect(
      evaluateOgImageResponse({ ok: true, status: 200, contentType: 'image/png', byteLength: 5000 })
    ).toEqual({ ok: true })
  })

  it('fails on non-2xx status', () => {
    expect(
      evaluateOgImageResponse({ ok: false, status: 500, contentType: 'image/png', byteLength: 5000 })
    ).toEqual({ ok: false, reason: 'HTTP 500' })
  })

  it('fails on non-image content-type', () => {
    expect(
      evaluateOgImageResponse({ ok: true, status: 200, contentType: 'text/html', byteLength: 5000 })
    ).toEqual({ ok: false, reason: 'bad content-type: text/html' })
  })

  it('fails on a missing content-type', () => {
    expect(
      evaluateOgImageResponse({ ok: true, status: 200, contentType: null, byteLength: 5000 })
    ).toEqual({ ok: false, reason: 'bad content-type: (none)' })
  })

  it('fails on a suspiciously small body', () => {
    expect(
      evaluateOgImageResponse({ ok: true, status: 200, contentType: 'image/png', byteLength: 40 })
    ).toEqual({ ok: false, reason: 'body too small: 40 bytes' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run tests/unit/og-image-check.test.ts`
Expected: FAIL — `Cannot find module '../../scripts/lib/og-image-check.mjs'` (file doesn't exist yet).

- [ ] **Step 3: Write the library implementation**

Create `app/scripts/lib/og-image-check.mjs`:

```js
// Pure helpers for checking OG images render correctly, extracted from the
// CLI script so they're independently unit-testable without a network call.

export const MIN_OG_IMAGE_BYTES = 1000

/**
 * Build the nuxt-og-image URL for a given site-relative path. The module's
 * default URL pattern is `/__og-image__/image<path>/og.png`; the root path
 * ("/") would otherwise produce a double slash.
 */
export function ogImageUrl(base, path) {
  const suffix = path === '/' ? '' : path
  return `${base}/__og-image__/image${suffix}/og.png`
}

/**
 * Reduce the sitemap's full URL list (which repeats every path once per
 * locale, e.g. "/buscar", "/en/buscar", "/pt/buscar") down to unique
 * default-locale (unprefixed) paths. The satori OG template renders the same
 * layout for all three locales from the same props, so the default locale is
 * a representative sample.
 */
export function filterDefaultLocalePaths(urls) {
  const paths = new Set()
  for (const { loc } of urls) {
    if (/^\/(en|pt)(\/|$)/.test(loc)) continue
    paths.add(loc)
  }
  return [...paths]
}

/**
 * Decide whether a fetched OG image response looks healthy, without parsing
 * the PNG itself: right status, right content-type, non-trivial size.
 */
export function evaluateOgImageResponse({ ok, status, contentType, byteLength }) {
  if (!ok) return { ok: false, reason: `HTTP ${status}` }
  if (!contentType || !contentType.startsWith('image/')) {
    return { ok: false, reason: `bad content-type: ${contentType ?? '(none)'}` }
  }
  if (byteLength < MIN_OG_IMAGE_BYTES) {
    return { ok: false, reason: `body too small: ${byteLength} bytes` }
  }
  return { ok: true }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run tests/unit/og-image-check.test.ts`
Expected: PASS, all 11 tests green.

- [ ] **Step 5: Commit**

```bash
git add app/scripts/lib/og-image-check.mjs app/tests/unit/og-image-check.test.ts
git commit -m "test(og-images): pure helpers for the OG image QA check"
```

---

### Task 3: CLI script + npm script entry

**Files:**
- Create: `app/scripts/check-og-images.mjs`
- Modify: `app/package.json` (`scripts` block)

**Interfaces:**
- Consumes: `ogImageUrl`, `filterDefaultLocalePaths`, `evaluateOgImageResponse` from `app/scripts/lib/og-image-check.mjs` (Task 2).
- Produces: nothing consumed by later tasks — Task 4 runs this script as a black box.

- [ ] **Step 1: Write the CLI script**

Create `app/scripts/check-og-images.mjs`:

```js
// Smoke-checks that every real route's OG image actually renders.
// Route list comes from the site's own live sitemap endpoint, so it can
// never drift from what's actually deployed (unlike a hand-maintained list).
//
// Usage:
//   node scripts/check-og-images.mjs
//   BASE=https://cambio-uruguay.com node scripts/check-og-images.mjs
import { evaluateOgImageResponse, filterDefaultLocalePaths, ogImageUrl } from './lib/og-image-check.mjs'

const BASE = process.env.BASE || 'http://localhost:3000'
const CONCURRENCY = 5

async function fetchSitemapPaths() {
  const res = await fetch(`${BASE}/api/__sitemap__/urls`)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${BASE}/api/__sitemap__/urls: HTTP ${res.status}`)
  }
  const urls = await res.json()
  return filterDefaultLocalePaths(urls)
}

async function checkPath(path) {
  const url = ogImageUrl(BASE, path)
  try {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    const verdict = evaluateOgImageResponse({
      ok: res.ok,
      status: res.status,
      contentType: res.headers.get('content-type'),
      byteLength: buf.byteLength,
    })
    return { path, url, ...verdict }
  } catch (error) {
    return { path, url, ok: false, reason: error.message }
  }
}

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length)
  let next = 0
  async function runWorker() {
    while (next < items.length) {
      const index = next++
      results[index] = await worker(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker))
  return results
}

async function main() {
  console.log(`Fetching route list from ${BASE}/api/__sitemap__/urls ...`)
  const paths = await fetchSitemapPaths()
  console.log(
    `Checking ${paths.length} default-locale OG images (concurrency ${CONCURRENCY}) ...`
  )

  const results = await runPool(paths, checkPath, CONCURRENCY)
  const failures = results.filter(r => !r.ok)

  console.log(`\n${results.length - failures.length}/${results.length} OG images OK`)

  if (failures.length) {
    console.log('\nFailures:')
    for (const f of failures) {
      console.log(`  ${f.path}  ->  ${f.reason}  (${f.url})`)
    }
    process.exitCode = 1
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
```

- [ ] **Step 2: Add the npm script**

In `app/package.json`, in the `"scripts"` block (after `"lintfix"`, before `"typecheck"` to keep check-style scripts grouped), add:

```json
    "check:og-images": "node scripts/check-og-images.mjs",
```

- [ ] **Step 3: Lint**

Run: `cd app && npm run lint -- scripts/check-og-images.mjs scripts/lib/og-image-check.mjs`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/scripts/check-og-images.mjs app/package.json
git commit -m "feat(scripts): add check:og-images QA script"
```

---

### Task 4: End-to-end verification

**Files:** none (verification only, no code changes)

**Interfaces:**
- Consumes: Task 1's wired `buscar.vue`, Task 3's `npm run check:og-images`.

- [ ] **Step 1: Start the dev server**

Run: `cd app && npm run dev` (leave running in its own terminal)

- [ ] **Step 2: Run the QA script against it**

In a second terminal: `cd app && npm run check:og-images`

Expected: exits 0, prints `N/N OG images OK` with no failures table — including `/buscar`, confirming Task 1's wiring actually renders. `N` should match the site's real route count (dozens, not the old `lightmode-axe.mjs` list of ~40).

If any failures print, investigate before proceeding — do not mark this task done with a failing run. (`/cuenta`, `/widget`, `/offline` should NOT appear in the list at all, since they're excluded from the sitemap already — if they do appear, that means `filterDefaultLocalePaths` or the sitemap itself regressed.)

- [ ] **Step 3: Stop the dev server**

Ctrl+C in the dev server terminal.

- [ ] **Step 4: Update the design spec's status**

Add a one-line status note at the top of `docs/superpowers/specs/2026-07-13-og-image-completeness-design.md` (right after the `Date:` line):

```markdown
**Status:** Implemented 2026-07-13 — `buscar.vue` wired, `npm run check:og-images` added and passing against local dev.
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-07-13-og-image-completeness-design.md
git commit -m "docs(og-images): mark spec implemented"
```
