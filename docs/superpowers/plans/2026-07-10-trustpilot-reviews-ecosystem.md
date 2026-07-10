# Trustpilot Review Carousel + Ecosystem Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two sections to the home page — a Trustpilot review carousel (lazily mounted, theme-synced, soft-failing) and an honest "Open source & ecosystem" link strip.

**Architecture:** Two pure, unit-tested `app/utils/*.ts` modules hold all configuration and data. Two presentational Vue components consume them. The carousel wraps the `trustpilot-iframe-widget` **vanilla UMD** entry, mounted client-side only when scrolled into view, and removes its own section if the third-party service fails.

**Tech Stack:** Nuxt 3, Vue 3 `<script setup>`, Vuetify, `@nuxtjs/i18n` (es default / en / pt), Vitest (node env), Playwright.

## Global Constraints

- **Never import `trustpilot-iframe-widget` root entry.** `dist/index.esm.js` does `import ... from 'react'`; React is not a dependency and the build will fail. Always import `trustpilot-iframe-widget/vanilla` (→ `dist/vanilla.umd.js`, 24 KB, zero React refs, no external requires).
- The `/vanilla` subpath ships **no type declarations** (`dist/vanilla.d.ts` → 404). A local `.d.ts` shim is required.
- **Never set a `rating` or `sort` option** on the widget. Both are documented upstream but are verified no-ops against `trustpilot.checkleaked.com` (`?rating=5` and `?rating=1` return byte-identical pages). Setting them would mislead the next reader.
- Show **all 5 reviews** (`maxReviews: 5`). Default sort is `latest`, so truncating would drop a genuine 5★ review and keep the content-free 4★ one.
- Always set `hideTopBanner: true` and `hideGlobalReviews: true` — this suppresses the "3.8" TrustScore, which is an age-decay artifact (the five reviews mean 4.8).
- **No `aggregateRating` / `Review` structured data.** Google disallows self-serving review markup on your own site.
- Never link `/api-reference` — it is robots-disallowed. The canonical developer entry is `/desarrolladores`.
- `npm run typecheck` is broken repo-wide (vue-tsc crash). Gate on `npm run lint` and `npm run test:unit`.
- All commands run from the `app/` directory unless stated otherwise.
- All user-facing strings go through `useI18n()` `t()` with keys in all three locales (`en.json`, `es.json`, `pt.json`).

## File Structure

| File | Responsibility |
|---|---|
| `app/utils/trustpilot.ts` | **Create.** Pure widget config + Trustpilot URLs. No DOM, no package import. |
| `app/utils/ecosystem.ts` | **Create.** Typed `EcosystemLink[]` — single source of truth for the strip. |
| `app/types/trustpilot-iframe-widget-vanilla.d.ts` | **Create.** Type shim for the untyped `/vanilla` subpath. |
| `app/components/TrustpilotReviews.vue` | **Create.** Section shell: heading, lazy widget mount, two CTAs, failure hiding. |
| `app/components/EcosystemStrip.vue` | **Create.** Renders `ECOSYSTEM_LINKS` as a pill row. |
| `app/pages/index.vue` | **Modify.** Two section inserts. |
| `app/i18n/locales/json/{en,es,pt}.json` | **Modify.** New `reviews.*` and `ecosystem.*` keys. |
| `app/package.json` | **Modify.** Add `trustpilot-iframe-widget@^1.0.2`. |
| `app/tests/unit/trustpilot.test.ts` | **Create.** |
| `app/tests/unit/ecosystem.test.ts` | **Create.** |
| `app/tests/e2e/trustpilot.spec.ts` | **Create.** |

---

### Task 1: Widget config module

**Files:**
- Create: `app/utils/trustpilot.ts`
- Test: `app/tests/unit/trustpilot.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `TRUSTPILOT_DOMAIN: string`
  - `TRUSTPILOT_PROFILE_URL: string`
  - `TRUSTPILOT_REVIEW_URL: string`
  - `TRUSTPILOT_WIDGET_HEIGHT: number`
  - `interface WidgetOpts { theme: 'light' | 'dark'; reducedMotion: boolean }`
  - `interface TrustpilotWidgetConfig { domain, theme, autoplay, interval, maxReviews, showRating, showDate, showAvatar, showReply, hideGlobalReviews, hideTopBanner, height }`
  - `buildWidgetConfig(opts: WidgetOpts): TrustpilotWidgetConfig`

- [ ] **Step 1: Write the failing test**

Create `app/tests/unit/trustpilot.test.ts`:

```ts
// The widget service silently ignores `rating` and `sort` (verified: ?rating=5
// and ?rating=1 return byte-identical pages). These tests pin the config we
// actually rely on, and fail loudly if someone re-adds a filter that does
// nothing but read as though it works.

import { describe, expect, it } from 'vitest'

import {
  buildWidgetConfig,
  TRUSTPILOT_DOMAIN,
  TRUSTPILOT_PROFILE_URL,
  TRUSTPILOT_REVIEW_URL,
  TRUSTPILOT_WIDGET_HEIGHT,
} from '../../utils/trustpilot'

describe('buildWidgetConfig', () => {
  it('suppresses the TrustScore banner and the global review summary', () => {
    const cfg = buildWidgetConfig({ theme: 'dark', reducedMotion: false })
    expect(cfg.hideTopBanner).toBe(true)
    expect(cfg.hideGlobalReviews).toBe(true)
  })

  it('never sets rating or sort, which are no-ops upstream', () => {
    const cfg = buildWidgetConfig({ theme: 'dark', reducedMotion: false })
    expect('rating' in cfg).toBe(false)
    expect('sort' in cfg).toBe(false)
  })

  it('shows every review rather than truncating from the newest end', () => {
    expect(buildWidgetConfig({ theme: 'dark', reducedMotion: false }).maxReviews).toBe(5)
  })

  it('disables autoplay when the visitor prefers reduced motion', () => {
    expect(buildWidgetConfig({ theme: 'dark', reducedMotion: true }).autoplay).toBe(false)
    expect(buildWidgetConfig({ theme: 'dark', reducedMotion: false }).autoplay).toBe(true)
  })

  it('passes the theme through unchanged', () => {
    expect(buildWidgetConfig({ theme: 'light', reducedMotion: false }).theme).toBe('light')
    expect(buildWidgetConfig({ theme: 'dark', reducedMotion: false }).theme).toBe('dark')
  })

  it('reserves the same height the component reserves, so there is no CLS', () => {
    expect(buildWidgetConfig({ theme: 'dark', reducedMotion: false }).height).toBe(
      TRUSTPILOT_WIDGET_HEIGHT
    )
  })

  it('points every URL at our own Trustpilot profile', () => {
    expect(TRUSTPILOT_DOMAIN).toBe('cambio-uruguay.com')
    expect(TRUSTPILOT_PROFILE_URL).toBe('https://www.trustpilot.com/review/cambio-uruguay.com')
    expect(TRUSTPILOT_REVIEW_URL).toBe('https://www.trustpilot.com/evaluate/cambio-uruguay.com')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run tests/unit/trustpilot.test.ts`
Expected: FAIL — `Failed to resolve import "../../utils/trustpilot"`.

- [ ] **Step 3: Write minimal implementation**

Create `app/utils/trustpilot.ts`:

```ts
// Config for the Trustpilot review carousel (trustpilot-iframe-widget).
//
// Two upstream options are deliberately absent. `rating` (minimum-rating
// filter) and `sort` are documented in the package README but are no-ops
// against trustpilot.checkleaked.com — `?rating=5` and `?rating=1` return
// byte-identical pages. Adding them would look like curation while doing
// nothing. Consequently every review renders, including one content-free 4★
// entry that cannot be filtered out.
//
// `hideTopBanner` + `hideGlobalReviews` suppress the 3.8 TrustScore. That
// number is an age-decay artifact of Trustpilot's time-weighted formula (four
// of the five reviews are from January 2023); the reviews themselves mean 4.8.

export const TRUSTPILOT_DOMAIN = 'cambio-uruguay.com'
export const TRUSTPILOT_PROFILE_URL = `https://www.trustpilot.com/review/${TRUSTPILOT_DOMAIN}`
export const TRUSTPILOT_REVIEW_URL = `https://www.trustpilot.com/evaluate/${TRUSTPILOT_DOMAIN}`

/** Kept in lockstep with the min-height the component reserves, so the iframe never shifts layout. */
export const TRUSTPILOT_WIDGET_HEIGHT = 320

export interface WidgetOpts {
  theme: 'light' | 'dark'
  reducedMotion: boolean
}

export interface TrustpilotWidgetConfig {
  domain: string
  theme: 'light' | 'dark'
  autoplay: boolean
  interval: number
  maxReviews: number
  showRating: boolean
  showDate: boolean
  showAvatar: boolean
  showReply: boolean
  hideGlobalReviews: boolean
  hideTopBanner: boolean
  height: number
}

export function buildWidgetConfig({ theme, reducedMotion }: WidgetOpts): TrustpilotWidgetConfig {
  return {
    domain: TRUSTPILOT_DOMAIN,
    theme,
    autoplay: !reducedMotion,
    interval: 6000,
    maxReviews: 5,
    showRating: true,
    showDate: true,
    showAvatar: true,
    showReply: false,
    hideGlobalReviews: true,
    hideTopBanner: true,
    height: TRUSTPILOT_WIDGET_HEIGHT,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run tests/unit/trustpilot.test.ts`
Expected: PASS — 7 passed.

- [ ] **Step 5: Lint**

Run: `cd app && npx eslint utils/trustpilot.ts tests/unit/trustpilot.test.ts`
Expected: no output (exit 0).

- [ ] **Step 6: Commit**

```bash
git add app/utils/trustpilot.ts app/tests/unit/trustpilot.test.ts
git commit -m "feat(reviews): add pure Trustpilot widget config module"
```

---

### Task 2: Ecosystem link data + i18n keys

**Files:**
- Create: `app/utils/ecosystem.ts`
- Modify: `app/i18n/locales/json/en.json`, `app/i18n/locales/json/es.json`, `app/i18n/locales/json/pt.json`
- Test: `app/tests/unit/ecosystem.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface EcosystemLink { id: string; url: string; icon: string; internal?: boolean }`
  - `ECOSYSTEM_LINKS: EcosystemLink[]` — ids: `github`, `npm`, `mcp`, `api`, `mediumEs`, `mediumEn`
  - i18n keys `ecosystem.title`, `ecosystem.subtitle`, `ecosystem.links.<id>`

- [ ] **Step 1: Write the failing test**

Create `app/tests/unit/ecosystem.test.ts`:

```ts
// The ecosystem strip links out to our own published assets. It must never
// claim third-party endorsement, must never link the robots-disallowed
// /api-reference page, and must stay translated in all three locales.

import { describe, expect, it } from 'vitest'

import en from '../../i18n/locales/json/en.json'
import es from '../../i18n/locales/json/es.json'
import pt from '../../i18n/locales/json/pt.json'
import { ECOSYSTEM_LINKS } from '../../utils/ecosystem'

const LOCALES = { en, es, pt } as Record<string, Record<string, unknown>>

function labels(locale: Record<string, unknown>): Record<string, string> {
  const eco = locale.ecosystem as { links?: Record<string, string> } | undefined
  return eco?.links ?? {}
}

describe('ECOSYSTEM_LINKS', () => {
  it('has at least one link', () => {
    expect(ECOSYSTEM_LINKS.length).toBeGreaterThan(0)
  })

  it('uses unique ids', () => {
    const ids = ECOSYSTEM_LINKS.map(l => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('external links are absolute https and internal links are root-relative', () => {
    for (const link of ECOSYSTEM_LINKS) {
      if (link.internal) expect(link.url.startsWith('/')).toBe(true)
      else expect(link.url.startsWith('https://')).toBe(true)
    }
  })

  it('never links the robots-disallowed /api-reference page', () => {
    expect(ECOSYSTEM_LINKS.some(l => l.url.includes('/api-reference'))).toBe(false)
  })

  it('gives every link an icon', () => {
    for (const link of ECOSYSTEM_LINKS) expect(link.icon).toMatch(/^mdi-/)
  })

  it.each(Object.keys(LOCALES))('has a label for every link in %s', localeName => {
    const locale = LOCALES[localeName]!
    const eco = locale.ecosystem as { title?: string; subtitle?: string } | undefined
    expect(eco?.title, `${localeName}: ecosystem.title`).toBeTruthy()
    expect(eco?.subtitle, `${localeName}: ecosystem.subtitle`).toBeTruthy()
    for (const link of ECOSYSTEM_LINKS) {
      expect(labels(locale)[link.id], `${localeName}: ecosystem.links.${link.id}`).toBeTruthy()
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run tests/unit/ecosystem.test.ts`
Expected: FAIL — `Failed to resolve import "../../utils/ecosystem"`.

- [ ] **Step 3: Write the data module**

Create `app/utils/ecosystem.ts`:

```ts
// Links to assets we publish ourselves: source, package, MCP server, API docs,
// long-form guides. This is deliberately NOT an "as featured in" strip — as of
// 2026-07-10 no third-party editorial mention of the site exists (the
// awesome-mcp-servers PR is unmerged, the MCP registry returns zero results).
// When a genuine third-party mention lands, it belongs in its own section, not
// mixed in here.

export interface EcosystemLink {
  /** Stable key; also the i18n key suffix under `ecosystem.links`. */
  id: string
  /** Absolute https URL, or a root-relative path when `internal`. */
  url: string
  icon: string
  internal?: boolean
}

export const ECOSYSTEM_LINKS: EcosystemLink[] = [
  { id: 'github', url: 'https://github.com/eduair94/cambio-uruguay', icon: 'mdi-github' },
  { id: 'npm', url: 'https://www.npmjs.com/package/cambio-uruguay-mcp', icon: 'mdi-npm' },
  { id: 'mcp', url: 'https://mcp.cambio-uruguay.com', icon: 'mdi-robot-outline' },
  // /desarrolladores, never /api-reference — the latter is robots-disallowed to
  // avoid duplicate-content indexing of the Scalar reference.
  { id: 'api', url: '/desarrolladores', icon: 'mdi-api', internal: true },
  {
    id: 'mediumEs',
    url: 'https://cambio-uruguay.medium.com/c%C3%B3mo-saber-el-mejor-precio-del-d%C3%B3lar-en-uruguay-hoy-sin-recorrer-casas-de-cambio-27d3669d3839',
    icon: 'mdi-post-outline',
  },
  {
    id: 'mediumEn',
    url: 'https://cambio-uruguay.medium.com/currency-exchange-in-uruguay-how-to-find-the-best-rate-before-you-trade-3a5fd46e3fc4',
    icon: 'mdi-post-outline',
  },
]
```

- [ ] **Step 4: Add the i18n keys**

Add this top-level block to `app/i18n/locales/json/en.json` (insert alphabetically near the other top-level objects; the file is a flat map of nested objects):

```json
  "ecosystem": {
    "title": "Open source & ecosystem",
    "subtitle": "Everything we build around Cambio Uruguay is public.",
    "links": {
      "github": "Source on GitHub",
      "npm": "npm package",
      "mcp": "MCP server",
      "api": "Public API",
      "mediumEs": "Guide (Spanish)",
      "mediumEn": "Guide (English)"
    }
  },
```

Add to `app/i18n/locales/json/es.json`:

```json
  "ecosystem": {
    "title": "Código abierto y ecosistema",
    "subtitle": "Todo lo que construimos alrededor de Cambio Uruguay es público.",
    "links": {
      "github": "Código en GitHub",
      "npm": "Paquete npm",
      "mcp": "Servidor MCP",
      "api": "API pública",
      "mediumEs": "Guía (español)",
      "mediumEn": "Guía (inglés)"
    }
  },
```

Add to `app/i18n/locales/json/pt.json`:

```json
  "ecosystem": {
    "title": "Código aberto e ecossistema",
    "subtitle": "Tudo o que construímos em torno do Cambio Uruguay é público.",
    "links": {
      "github": "Código no GitHub",
      "npm": "Pacote npm",
      "mcp": "Servidor MCP",
      "api": "API pública",
      "mediumEs": "Guia (espanhol)",
      "mediumEn": "Guia (inglês)"
    }
  },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd app && npx vitest run tests/unit/ecosystem.test.ts`
Expected: PASS — 8 passed (the `it.each` contributes 3).

- [ ] **Step 6: Lint**

Run: `cd app && npx eslint utils/ecosystem.ts tests/unit/ecosystem.test.ts`
Expected: no output (exit 0).

- [ ] **Step 7: Commit**

```bash
git add app/utils/ecosystem.ts app/tests/unit/ecosystem.test.ts app/i18n/locales/json/en.json app/i18n/locales/json/es.json app/i18n/locales/json/pt.json
git commit -m "feat(ecosystem): add open-source link catalogue + i18n keys"
```

---

### Task 3: Install the widget package + type shim

**Files:**
- Modify: `app/package.json`
- Create: `app/types/trustpilot-iframe-widget-vanilla.d.ts`

**Interfaces:**
- Consumes: `TrustpilotWidgetConfig` from Task 1.
- Produces: module `trustpilot-iframe-widget/vanilla` exporting `createTrustpilotWidget(config): TrustpilotWidgetHandle`, and `interface TrustpilotWidgetHandle { updateConfig(c): void; destroy(): void; isWidgetReady(): boolean }`.

**Why a shim:** the package's export map declares `types` only for the root entry. `./vanilla` resolves to `dist/vanilla.umd.js` with no `.d.ts` (verified: `dist/vanilla.d.ts` → HTTP 404).

- [ ] **Step 1: Install the dependency**

Run: `cd app && npm install trustpilot-iframe-widget@^1.0.2`

No flag is needed: the package declares `react` / `react-dom` under `peerDependenciesMeta` with `optional: true`, so npm does not auto-install them. Do **not** add `--legacy-peer-deps` — it disables required-peer auto-install tree-wide, not just for this package, and will silently drop unrelated required peers already in the tree (it dropped `pinia` when tried during this task's original implementation).

Expected: `package.json` gains `"trustpilot-iframe-widget": "^1.0.2"` under `dependencies`.

- [ ] **Step 2: Verify the vanilla entry is React-free and self-contained**

Run:

```bash
cd app && node -e "const s=require('fs').readFileSync('node_modules/trustpilot-iframe-widget/dist/vanilla.umd.js','utf8'); console.log('react refs:', (s.match(/react/gi)||[]).length); console.log('has createTrustpilotWidget:', s.includes('createTrustpilotWidget'))"
```

Expected:
```
react refs: 0
has createTrustpilotWidget: true
```

If `react refs` is non-zero, stop — the wrong entry is being read.

- [ ] **Step 3: Write the type shim**

Create `app/types/trustpilot-iframe-widget-vanilla.d.ts`:

```ts
// The package's export map declares `types` only for the root entry, and the
// root entry imports React (which we do not depend on). We import the vanilla
// UMD subpath instead, which ships no declarations — hence this shim.
declare module 'trustpilot-iframe-widget/vanilla' {
  import type { TrustpilotWidgetConfig } from '~/utils/trustpilot'

  export interface TrustpilotWidgetHandle {
    updateConfig(config: Partial<TrustpilotWidgetConfig>): void
    destroy(): void
    isWidgetReady(): boolean
  }

  export interface CreateWidgetOptions extends TrustpilotWidgetConfig {
    target: HTMLElement | string
    onReady?: () => void
    onError?: (error: unknown) => void
  }

  export function createTrustpilotWidget(options: CreateWidgetOptions): TrustpilotWidgetHandle
}
```

- [ ] **Step 4: Verify lint still passes**

Run: `cd app && npx eslint types/trustpilot-iframe-widget-vanilla.d.ts`
Expected: no output (exit 0).

- [ ] **Step 5: Commit**

```bash
git add app/package.json app/package-lock.json app/types/trustpilot-iframe-widget-vanilla.d.ts
git commit -m "chore(deps): add trustpilot-iframe-widget + vanilla type shim"
```

---

### Task 4: TrustpilotReviews component

**Files:**
- Create: `app/components/TrustpilotReviews.vue`
- Modify: `app/i18n/locales/json/en.json`, `app/i18n/locales/json/es.json`, `app/i18n/locales/json/pt.json`

**Interfaces:**
- Consumes: `buildWidgetConfig`, `TRUSTPILOT_PROFILE_URL`, `TRUSTPILOT_REVIEW_URL`, `TRUSTPILOT_WIDGET_HEIGHT` (Task 1); `createTrustpilotWidget` (Task 3); `useThemeMode()` → `{ applied }` (existing, `app/composables/useThemeMode.ts:75`); `IntersectionWrapper` (existing component, props `showPlaceholder`, `rootMargin`, `threshold`).
- Produces: auto-imported component `<TrustpilotReviews />`.

This task has no unit test: it is a presentational shell whose only logic (the config) is already tested in Task 1, and whose behaviour depends on a third-party iframe. Task 6 covers it end-to-end.

- [ ] **Step 1: Add the i18n keys**

Add to `app/i18n/locales/json/en.json`:

```json
  "reviews": {
    "title": "What people say",
    "subtitle": "Real, unedited reviews from Trustpilot.",
    "write": "Write a review",
    "seeAll": "See all reviews on Trustpilot",
    "a11yRegion": "Trustpilot customer reviews"
  },
```

Add to `app/i18n/locales/json/es.json`:

```json
  "reviews": {
    "title": "Lo que dice la gente",
    "subtitle": "Reseñas reales de Trustpilot, sin editar.",
    "write": "Escribir una reseña",
    "seeAll": "Ver todas las reseñas en Trustpilot",
    "a11yRegion": "Reseñas de clientes en Trustpilot"
  },
```

Add to `app/i18n/locales/json/pt.json`:

```json
  "reviews": {
    "title": "O que as pessoas dizem",
    "subtitle": "Avaliações reais do Trustpilot, sem edição.",
    "write": "Escrever uma avaliação",
    "seeAll": "Ver todas as avaliações no Trustpilot",
    "a11yRegion": "Avaliações de clientes no Trustpilot"
  },
```

- [ ] **Step 2: Write the component**

Create `app/components/TrustpilotReviews.vue`:

> Note: use the shared Vuetify typography utilities (`text-h4 font-weight-bold` /
> `text-body-1 text-grey-lighten-1`) for the heading and subtitle, and do NOT add
> `section-band`/`section-title`/`section-subtitle`. Those three classes are private
> to `app/pages/index.vue`'s `<style scoped>` block: Vue's scoped CSS only tags the
> parent's own elements (and a child's root node), so a child component's nested
> `<h2>`/`<p>` never receive that scope hash and would render unstyled. Standalone
> section components (`AIInsights.vue`, `WhereToChange.vue`) all follow this same
> convention.

```vue
<template>
  <!-- Removed entirely if the third-party widget fails: a heading with an empty
       box under it is worse than no social proof at all. -->
  <section v-if="!failed" v-reveal class="reviews-section py-12">
    <VContainer>
      <VRow>
        <VCol cols="12" md="10" lg="8" class="mx-auto text-center mb-8">
          <h2 class="text-h4 font-weight-bold mb-4">{{ t('reviews.title') }}</h2>
          <p class="text-body-1 text-grey-lighten-1">{{ t('reviews.subtitle') }}</p>
        </VCol>
      </VRow>

      <VRow justify="center">
        <VCol cols="12" md="10" lg="8">
          <IntersectionWrapper root-margin="200px" show-placeholder>
            <template #placeholder>
              <div class="reviews-skeleton" :style="heightStyle" />
            </template>

            <ClientOnly>
              <div
                ref="mountEl"
                class="reviews-widget"
                :style="heightStyle"
                role="region"
                :aria-label="t('reviews.a11yRegion')"
              />
              <template #fallback>
                <div class="reviews-skeleton" :style="heightStyle" />
              </template>
            </ClientOnly>
          </IntersectionWrapper>
        </VCol>
      </VRow>

      <div class="d-flex justify-center flex-wrap ga-3 mt-6">
        <VBtn
          :href="TRUSTPILOT_REVIEW_URL"
          target="_blank"
          rel="noopener noreferrer"
          color="primary"
          variant="elevated"
          data-cta="trustpilot-write"
        >
          <VIcon start>mdi-star-outline</VIcon>
          {{ t('reviews.write') }}
        </VBtn>
        <VBtn
          :href="TRUSTPILOT_PROFILE_URL"
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
          data-cta="trustpilot-all"
        >
          {{ t('reviews.seeAll') }}
        </VBtn>
      </div>
    </VContainer>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import type { TrustpilotWidgetHandle } from 'trustpilot-iframe-widget/vanilla'
import {
  buildWidgetConfig,
  TRUSTPILOT_PROFILE_URL,
  TRUSTPILOT_REVIEW_URL,
  TRUSTPILOT_WIDGET_HEIGHT,
} from '~/utils/trustpilot'

const { t } = useI18n()
const { applied } = useThemeMode()

/** The iframe is third-party; if it never signals ready, we assume it never will. */
const READY_TIMEOUT_MS = 8_000

const mountEl = ref<HTMLElement>()
const failed = ref(false)
const heightStyle = { minHeight: `${TRUSTPILOT_WIDGET_HEIGHT}px` }

let widget: TrustpilotWidgetHandle | null = null
let readyTimer: ReturnType<typeof setTimeout> | null = null
let mounting = false
let unmounted = false

function clearReadyTimer() {
  if (readyTimer) {
    clearTimeout(readyTimer)
    readyTimer = null
  }
}

// Single teardown path. The soft-fail below removes the section via `v-if`
// WITHOUT unmounting this component (the parent still renders it), so
// `onBeforeUnmount` alone never runs on that path — the widget's autoplay
// interval and listeners would leak for the rest of the visit. Every exit
// (fail, unmount) must route through here to actually release the widget.
function teardown() {
  clearReadyTimer()
  widget?.destroy()
  widget = null
}

function fail() {
  teardown()
  failed.value = true
}

async function mountWidget(target: HTMLElement) {
  if (widget || mounting || unmounted) return
  mounting = true
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  try {
    // The root entry imports React. Always the /vanilla subpath.
    const { createTrustpilotWidget } = await import('trustpilot-iframe-widget/vanilla')
    // The import is uncancellable; if we were torn down while it was in flight,
    // do not create a widget attached to an orphaned node with an unclearable timer.
    if (unmounted) return
    readyTimer = setTimeout(fail, READY_TIMEOUT_MS)
    widget = createTrustpilotWidget({
      target,
      ...buildWidgetConfig({ theme: applied.value, reducedMotion }),
      onReady: clearReadyTimer,
      onError: fail,
    })
    // createTrustpilotWidget is synchronous and can invoke onError from inside the
    // constructor — before this assignment lands, so teardown()'s destroy() would
    // have no-opped on a still-null handle. Re-check and release the zombie.
    if (unmounted || failed.value) teardown()
  } catch {
    // Chunk fetch blocked (ad-blockers routinely match "trustpilot"), or the
    // service is down. Either way: no section.
    fail()
  } finally {
    mounting = false
  }
}

// IntersectionWrapper only renders its slot once scrolled into view, so the ref
// arrives late. Watching it is what defers the iframe past LCP.
watch(mountEl, el => {
  if (el) void mountWidget(el)
})

watch(applied, theme => widget?.updateConfig({ theme }))

onBeforeUnmount(() => {
  unmounted = true
  teardown()
})
</script>

<style scoped>
.reviews-widget,
.reviews-skeleton {
  width: 100%;
}

.reviews-skeleton {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.v-theme--light .reviews-skeleton {
  background: rgba(15, 23, 42, 0.03);
  border-color: rgba(15, 23, 42, 0.1);
}
</style>
```

- [ ] **Step 3: Verify it compiles and lints**

Run: `cd app && npx eslint components/TrustpilotReviews.vue`
Expected: no output (exit 0).

- [ ] **Step 4: Verify the React entry was not pulled in**

Run: `cd app && grep -rn "from 'trustpilot-iframe-widget'" components/ utils/ || echo "OK: no root-entry import"`
Expected: `OK: no root-entry import`

- [ ] **Step 5: Commit**

```bash
git add app/components/TrustpilotReviews.vue app/i18n/locales/json/en.json app/i18n/locales/json/es.json app/i18n/locales/json/pt.json
git commit -m "feat(reviews): add lazily-mounted, soft-failing Trustpilot carousel"
```

---

### Task 5: EcosystemStrip component

**Files:**
- Create: `app/components/EcosystemStrip.vue`

**Interfaces:**
- Consumes: `ECOSYSTEM_LINKS`, `EcosystemLink` (Task 2); i18n keys `ecosystem.*` (Task 2); `localePath()` (Nuxt i18n auto-import).
- Produces: auto-imported component `<EcosystemStrip />`.

- [ ] **Step 1: Write the component**

Create `app/components/EcosystemStrip.vue`:

```vue
<template>
  <section v-reveal class="ecosystem-section py-10">
    <VContainer>
      <VRow>
        <VCol cols="12" class="text-center mb-6">
          <h2 class="text-h4 font-weight-bold mb-4">{{ t('ecosystem.title') }}</h2>
          <p class="text-body-1 text-grey-lighten-1">{{ t('ecosystem.subtitle') }}</p>
        </VCol>
      </VRow>

      <ul class="ecosystem-list">
        <li v-for="link in ECOSYSTEM_LINKS" :key="link.id" class="ecosystem-item">
          <NuxtLink v-if="link.internal" :to="localePath(link.url)" class="ecosystem-link">
            <VIcon size="18" class="ecosystem-icon">{{ link.icon }}</VIcon>
            <span>{{ t(`ecosystem.links.${link.id}`) }}</span>
          </NuxtLink>
          <a
            v-else
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="ecosystem-link"
          >
            <VIcon size="18" class="ecosystem-icon">{{ link.icon }}</VIcon>
            <span>{{ t(`ecosystem.links.${link.id}`) }}</span>
          </a>
        </li>
      </ul>
    </VContainer>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { ECOSYSTEM_LINKS } from '~/utils/ecosystem'

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<style scoped>
.ecosystem-list {
  list-style: none;
  padding: 0;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;
  max-width: 860px;
}

.ecosystem-item {
  display: inline-flex;
}

/* Mirrors the hero trust pills (see TrustBar.vue) so the two credibility
   surfaces read as one system. */
.ecosystem-link {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.95rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1;
  color: rgba(255, 255, 255, 0.92);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  text-decoration: none;
  white-space: nowrap;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.ecosystem-link:hover,
.ecosystem-link:focus-visible {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.28);
  transform: translateY(-2px);
  outline: none;
}

.ecosystem-icon {
  flex-shrink: 0;
}

.v-theme--light .ecosystem-link {
  color: #16233b;
  background: rgba(255, 255, 255, 0.72);
  border-color: rgba(15, 23, 42, 0.12);
}

.v-theme--light .ecosystem-link:hover,
.v-theme--light .ecosystem-link:focus-visible {
  background: #ffffff;
  border-color: rgba(37, 99, 235, 0.4);
}

@media (max-width: 600px) {
  .ecosystem-link {
    font-size: 0.78rem;
    padding: 0.4rem 0.75rem;
  }
}
</style>
```

- [ ] **Step 2: Lint**

Run: `cd app && npx eslint components/EcosystemStrip.vue`
Expected: no output (exit 0).

- [ ] **Step 3: Commit**

```bash
git add app/components/EcosystemStrip.vue
git commit -m "feat(ecosystem): add open-source link strip component"
```

---

### Task 6: Wire both sections into the home page

**Files:**
- Modify: `app/pages/index.vue`

**Interfaces:**
- Consumes: `<TrustpilotReviews />` (Task 4), `<EcosystemStrip />` (Task 5). Both are auto-imported by Nuxt; no `import` statement is needed.
- Produces: the rendered home page.

- [ ] **Step 1: Insert the reviews section**

In `app/pages/index.vue`, find the end of the "How It Works Section" (it closes just before the line `    <!-- AI Insights Section -->`, around line 645). Insert between them so the file reads:

```vue
    </section>

    <!-- Social proof: real Trustpilot reviews. Lazily mounted and self-removing
         on failure, so a third-party outage never leaves an empty box here. -->
    <TrustpilotReviews />

    <!-- AI Insights Section -->
    <AIInsights />
```

- [ ] **Step 2: Insert the ecosystem strip**

Find the line `    <!-- CTA Section -->` (around line 902), which follows the internal-links section. Insert immediately before it:

```vue
    <!-- Our own published assets. Not an "as featured in" claim: no third-party
         editorial mention exists yet. -->
    <EcosystemStrip />

    <!-- CTA Section -->
```

- [ ] **Step 3: Lint**

Run: `cd app && npx eslint pages/index.vue`
Expected: no output (exit 0).

- [ ] **Step 4: Verify both sections render in the running app**

Start the dev server (`cd app && npm run dev`), then run:

```bash
cd app && npx playwright screenshot --channel=chrome --full-page \
  --wait-for-timeout=8000 http://localhost:3311/ /tmp/home.png
```

Open `/tmp/home.png` and confirm, by eye:
1. A "Lo que dice la gente" section appears after the how-it-works steps, containing a review carousel with reviewer names and star ratings.
2. **No "3.8" appears anywhere** in that section.
3. An ecosystem pill row appears above the blue CTA band.

- [ ] **Step 5: Commit**

```bash
git add app/pages/index.vue
git commit -m "feat(home): mount review carousel and ecosystem strip"
```

---

### Task 7: End-to-end test

**Files:**
- Create: `app/tests/e2e/trustpilot.spec.ts`

**Interfaces:**
- Consumes: the rendered home page (Task 6).
- Produces: nothing.

- [ ] **Step 1: Write the test**

Create `app/tests/e2e/trustpilot.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test.setTimeout(120_000)

// Default Accept-Language is `en`, which makes @nuxtjs/i18n redirect `/` to
// `/en`. Pin Spanish: it is the default, unprefixed locale.
test.use({ locale: 'es-UY' })

test('the review carousel mounts with the TrustScore banner suppressed', async ({ page }) => {
  await page.goto('/')

  const section = page.locator('.reviews-section')
  await section.scrollIntoViewIfNeeded()

  // The widget only mounts after hydration AND after the section intersects, and
  // the dev server hydrates slowly. Retry rather than asserting once.
  const frame = page.locator('.reviews-widget iframe')
  await expect(async () => {
    await section.scrollIntoViewIfNeeded()
    await expect(frame).toHaveCount(1, { timeout: 2_000 })
  }).toPass({ timeout: 60_000 })

  const src = (await frame.getAttribute('src')) ?? ''
  expect(src).toContain('domain=cambio-uruguay.com')
  expect(src).toContain('hideTopBanner=true')
  expect(src).toContain('hideGlobalReviews=true')

  // `rating` is a no-op upstream; setting it would be a lie. We never set it, so
  // the library never puts it in the URL.
  expect(src).not.toContain('rating=')

  // NOTE: `sort=latest` DOES appear here, along with `page=1&limit=20`. Those are
  // the library's own defaults, injected by its buildIframeUrl — we do not set
  // them. The constraint is that our config never *sets* `sort`, which
  // tests/unit/trustpilot.test.ts asserts directly. Do not assert its absence
  // from the URL; verified against the live dev server, it is always present.
  expect(src).toContain('sort=latest')
})

test('both review CTAs point at Trustpilot and open in a new tab', async ({ page }) => {
  await page.goto('/')
  await page.locator('.reviews-section').scrollIntoViewIfNeeded()

  const write = page.locator('[data-cta="trustpilot-write"]')
  const seeAll = page.locator('[data-cta="trustpilot-all"]')

  await expect(write).toHaveAttribute(
    'href',
    'https://www.trustpilot.com/evaluate/cambio-uruguay.com'
  )
  await expect(seeAll).toHaveAttribute(
    'href',
    'https://www.trustpilot.com/review/cambio-uruguay.com'
  )
  await expect(write).toHaveAttribute('target', '_blank')
  await expect(seeAll).toHaveAttribute('rel', /noopener/)
})

test('the ecosystem strip renders safe external links', async ({ page }) => {
  await page.goto('/')

  const strip = page.locator('.ecosystem-section')
  await strip.scrollIntoViewIfNeeded()
  await expect(strip).toBeVisible()

  const links = strip.locator('.ecosystem-link')
  await expect(links).toHaveCount(6)

  // Never link the robots-disallowed Scalar reference.
  await expect(strip.locator('a[href*="/api-reference"]')).toHaveCount(0)

  const external = strip.locator('a.ecosystem-link[target="_blank"]')
  const count = await external.count()
  expect(count).toBe(5) // 5 external + 1 internal /desarrolladores

  for (let i = 0; i < count; i++) {
    await expect(external.nth(i)).toHaveAttribute('rel', /noopener/)
  }
})
```

- [ ] **Step 2: Run the e2e suite**

Run: `cd app && npx playwright test tests/e2e/trustpilot.spec.ts`
Expected: PASS — 3 passed. (Playwright starts the dev server itself; `reuseExistingServer` is on.)

If the first test fails because no iframe ever appears, check the browser console: an ad-blocking extension or a DNS failure on `trustpilot.checkleaked.com` triggers the intended soft-fail, and the whole `.reviews-section` is removed. That is correct behaviour, not a test bug — verify by loading the URL directly.

- [ ] **Step 3: Lint**

Run: `cd app && npx eslint tests/e2e/trustpilot.spec.ts`
Expected: no output (exit 0).

- [ ] **Step 4: Commit**

```bash
git add app/tests/e2e/trustpilot.spec.ts
git commit -m "test(reviews): e2e cover carousel config, CTAs, ecosystem links"
```

---

### Task 8: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Lint the files this branch touches**

`npm run lint` is ALREADY RED on `main`: 443 prettier errors across files this branch never opens (e.g. `utils/nearbyRates.ts`, and 360 in `pages/index.vue` alone, identical before and after our two-line insertion). Do not try to fix them — that is unrelated repo debt, and `--fix` would produce a huge unreviewable diff.

Gate on the files we actually changed instead:

Run:
```
cd app && npx eslint utils/trustpilot.ts utils/ecosystem.ts \
  components/TrustpilotReviews.vue components/EcosystemStrip.vue \
  types/trustpilot-iframe-widget-vanilla.d.ts \
  tests/unit/trustpilot.test.ts tests/unit/ecosystem.test.ts tests/e2e/trustpilot.spec.ts
```
Expected: exit 0, no output.

Then confirm we added no new errors to `pages/index.vue`:
```
cd app && npx eslint pages/index.vue 2>&1 | tail -2
```
Expected: `360 problems` — the same count as on `main`. A higher number means our insertion introduced errors.

- [ ] **Step 2: Run the full unit suite**

Run: `cd app && npm run test:unit`
Expected: all suites pass, including `trustpilot.test.ts` and `ecosystem.test.ts`. No pre-existing suite regresses.

- [ ] **Step 3: Run the full e2e suite**

Run: `cd app && npm run test:e2e`
Expected: all pass. Pay attention to `search.spec.ts` — it also asserts on the home page and is the canary for a layout-shift regression.

- [ ] **Step 4: Measure Lighthouse**

Build and serve a production build, then:

Run: `cd app && npm run lighthouse`

Open `docs/lighthouse/home.report.html`. Compare against the previous committed run. Accept only if:
- **CLS has not regressed** — the reserved `min-height: 320px` is what protects it. A regression means the reservation and `TRUSTPILOT_WIDGET_HEIGHT` disagree, or the iframe grew past it.
- Performance has not dropped more than 1 point. The iframe is lazily mounted below the fold, so it should not affect LCP at all.

If CLS regressed, do not "fix" it by removing the section — reconcile `TRUSTPILOT_WIDGET_HEIGHT` with the widget's real rendered height and re-measure.

- [ ] **Step 5: Verify the soft-fail path by hand**

With the dev server running, block the widget host and confirm the section vanishes rather than rendering an empty box:

```bash
cd app && node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await b.newPage({ locale: 'es-UY' });
  await p.route('**trustpilot.checkleaked.com**', r => r.abort());
  await p.goto('http://localhost:3311/');
  await p.locator('.reviews-section, .ecosystem-section').last().scrollIntoViewIfNeeded();
  await p.waitForTimeout(10000);
  console.log('reviews sections still in DOM:', await p.locator('.reviews-section').count());
  await b.close();
})();
"
```

Expected: `reviews sections still in DOM: 0`

This exercises the 8-second `READY_TIMEOUT_MS` path. If it prints `1`, the timeout or the `onError` wiring is broken.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore(reviews): verify lint, unit, e2e, lighthouse and soft-fail path"
```

---

## Self-Review Notes

**Spec coverage:** every spec section maps to a task — widget config (1), ecosystem data + i18n (2), dependency + shim (3), carousel component (4), strip component (5), page wiring (6), tests (1, 2, 7), verification gates and CLS/soft-fail risks (8). The spec's "no `aggregateRating` markup" and "no `rating` key" constraints are enforced by tests in Tasks 1 and 7, not merely documented.

**Follow-ups explicitly deferred** (from the spec, not in this plan): fixing `rating`/`sort` upstream in `eduair94/trustpilot-carrousel`; reporting the content-free review to Trustpilot; splitting out a "featured in" section once a third-party mention exists.
