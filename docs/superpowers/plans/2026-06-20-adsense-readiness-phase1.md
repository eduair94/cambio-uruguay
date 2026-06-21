# AdSense Readiness — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make cambio-uruguay.com eligible to apply for Google AdSense — add legal pages, a cookie-consent banner wired to Google Consent Mode v2 (gating GA4 + the existing Google Ads tag), config-driven AdSense snippet plumbing, `ads.txt`, footer legal links, and a compliance pass.

**Architecture:** Pure consent logic in `app/utils/consent.ts` (unit-tested), a Nuxt composable `useConsent` + early client plugin that apply Consent Mode v2 signals via `nuxt-gtag`, a `CookieConsent.vue` banner mounted in the default layout, three new legal pages following the existing `acerca.vue` page pattern, and a runtime-config-gated AdSense `<head>` snippet. No ad slots in Phase 1 (those need an approved publisher ID — Phase 2).

**Tech Stack:** Nuxt 4, Vue 3 `<script setup>`, Vuetify 3, `@nuxtjs/i18n` (es/en/pt), `nuxt-gtag` ^3.0.3, `@nuxtjs/sitemap`, Vitest (unit, node env), Playwright (e2e on :3311).

## Global Constraints

- Locales: **es (default), en, pt**. i18n JSON at `app/i18n/locales/json/{es,en,pt}.json`. New chrome keys (banner, footer, nav, meta) MUST exist in all three.
- Legal page **prose** is authored in **Spanish inline in the template**, matching the established `app/pages/acerca.vue` precedent (its body prose is Spanish-only). i18n is used for meta title/description, nav labels, and section headings only. *(Deviation from the design spec's "full en/pt prose"; rationale: codebase precedent + ES is the primary market. Flag to user at review.)*
- Contact email (public): **`admin@cambio-uruguay.com`** (already the `contactPoint.email` in the Organization JSON-LD in `app/layouts/default.vue`).
- Canonical host: `https://cambio-uruguay.com` (no trailing slash on canonicals).
- Consent cookie name: **`cu_consent`**, values `granted` | `denied`, `maxAge` 1 year, `sameSite: 'lax'`, `path: '/'`.
- Consent Mode v2 signals (all four): `ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`. Default **denied**; flip all to **granted** only on accept.
- AdSense snippet is **config-driven** via `runtimeConfig.public.adsensePubId` (env `NUXT_PUBLIC_ADSENSE_PUB_ID`). Empty default → nothing injected (no code change needed to apply later).
- Unit tests live in `app/tests/unit/**` (Vitest, `environment: 'node'`, `globals: true`) and must NOT import Nuxt auto-imports. E2E in `app/tests/e2e/**` (Playwright, dev server :3311).
- Run commands from the `app/` directory. Lint+typecheck before each commit: `npm run lint && npm run typecheck`.
- Commit after each task with a `feat(adsense): ...` / `feat(legal): ...` message. Branch: `feat/adsense-readiness`.

---

## File Structure

| File | Responsibility |
|---|---|
| `app/utils/consent.ts` (new) | Pure consent logic: cookie name/version, parse/serialize, signal maps. Unit-tested. |
| `app/tests/unit/consent.test.ts` (new) | Unit tests for `consent.ts`. |
| `app/composables/useConsent.ts` (new) | Reactive consent state (cookie) + banner open state + accept/reject/reopen, applies gtag signals. |
| `app/plugins/consent.client.ts` (new) | On client boot, re-apply `granted` update for returning users whose cookie says granted. |
| `app/nuxt.config.ts` (modify) | Migrate gtag to v3 shape: Consent Mode v2 `initCommands` default-denied + AW tag via `tags`; add `runtimeConfig.public.adsensePubId`. |
| `app/components/CookieConsent.vue` (new) | Banner UI; shown until decided or when re-opened. |
| `app/layouts/default.vue` (modify) | Mount `<CookieConsent>` in `<ClientOnly>`. |
| `app/components/Footer.vue` (modify) | Legal links row + "Configurar cookies" button (reopen banner). |
| `app/pages/privacidad.vue` (new) | Privacy Policy page. |
| `app/pages/terminos.vue` (new) | Terms of Use page. |
| `app/pages/contacto.vue` (new) | Contact page (email + social). |
| `app/server/api/__sitemap__/urls.get.ts` (modify) | Add /privacidad, /terminos, /contacto. |
| `app/public/ads.txt` (new) | Placeholder until publisher ID exists. |
| `app/app.vue` (modify) | Inject AdSense loader + `google-adsense-account` meta when `adsensePubId` set. |
| `app/i18n/locales/json/{es,en,pt}.json` (modify) | `consent.*`, `legal.*`, footer/nav keys. |
| `app/tests/e2e/consent.spec.ts` (new) | Banner accept/reject/persist/reopen. |
| `app/tests/e2e/legal.spec.ts` (new) | Legal pages reachable + render. |

---

### Task 1: Consent core logic (pure, TDD)

**Files:**
- Create: `app/utils/consent.ts`
- Test: `app/tests/unit/consent.test.ts`

**Interfaces:**
- Produces:
  - `CONSENT_COOKIE_NAME: 'cu_consent'`
  - `CONSENT_MAX_AGE: number` (seconds in 365 days)
  - `type ConsentDecision = 'granted' | 'denied'`
  - `parseConsent(raw: string | null | undefined): ConsentDecision | null`
  - `serializeConsent(decision: ConsentDecision): string`
  - `consentSignals(decision: ConsentDecision): Record<'ad_storage' | 'analytics_storage' | 'ad_user_data' | 'ad_personalization', 'granted' | 'denied'>`

- [ ] **Step 1: Write the failing test**

```ts
// app/tests/unit/consent.test.ts
import { describe, it, expect } from 'vitest'
import {
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE,
  parseConsent,
  serializeConsent,
  consentSignals,
} from '../../utils/consent'

describe('consent core', () => {
  it('exposes the cookie name and a ~1y max-age', () => {
    expect(CONSENT_COOKIE_NAME).toBe('cu_consent')
    expect(CONSENT_MAX_AGE).toBe(60 * 60 * 24 * 365)
  })

  it('parses only the two valid decisions, else null', () => {
    expect(parseConsent('granted')).toBe('granted')
    expect(parseConsent('denied')).toBe('denied')
    expect(parseConsent('')).toBeNull()
    expect(parseConsent(undefined)).toBeNull()
    expect(parseConsent(null)).toBeNull()
    expect(parseConsent('GRANTED')).toBeNull()
    expect(parseConsent('yes')).toBeNull()
  })

  it('round-trips serialize/parse', () => {
    expect(parseConsent(serializeConsent('granted'))).toBe('granted')
    expect(parseConsent(serializeConsent('denied'))).toBe('denied')
  })

  it('maps granted to all-granted signals', () => {
    expect(consentSignals('granted')).toEqual({
      ad_storage: 'granted',
      analytics_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    })
  })

  it('maps denied to all-denied signals', () => {
    expect(consentSignals('denied')).toEqual({
      ad_storage: 'denied',
      analytics_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- consent`
Expected: FAIL — cannot resolve `../../utils/consent`.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/utils/consent.ts
// Framework-agnostic consent logic. No Nuxt auto-imports here so it stays
// unit-testable under Vitest's node environment.

export const CONSENT_COOKIE_NAME = 'cu_consent'
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365 // 1 year, in seconds

export type ConsentDecision = 'granted' | 'denied'

type ConsentSignalKey =
  | 'ad_storage'
  | 'analytics_storage'
  | 'ad_user_data'
  | 'ad_personalization'

export function parseConsent(raw: string | null | undefined): ConsentDecision | null {
  return raw === 'granted' || raw === 'denied' ? raw : null
}

export function serializeConsent(decision: ConsentDecision): string {
  return decision
}

export function consentSignals(
  decision: ConsentDecision
): Record<ConsentSignalKey, 'granted' | 'denied'> {
  return {
    ad_storage: decision,
    analytics_storage: decision,
    ad_user_data: decision,
    ad_personalization: decision,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- consent`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add app/utils/consent.ts app/tests/unit/consent.test.ts
git commit -m "feat(adsense): consent core logic (cookie + Consent Mode v2 signals)"
```

---

### Task 2: Consent composable + early client plugin

**Files:**
- Create: `app/composables/useConsent.ts`
- Create: `app/plugins/consent.client.ts`

**Interfaces:**
- Consumes: `consent.ts` (`CONSENT_COOKIE_NAME`, `CONSENT_MAX_AGE`, `parseConsent`, `consentSignals`, `ConsentDecision`).
- Produces (`useConsent()` returns):
  - `decision: ComputedRef<ConsentDecision | null>`
  - `hasDecided: ComputedRef<boolean>`
  - `bannerOpen: Ref<boolean>` (true when banner should show)
  - `accept(): void` — persist `granted`, push gtag consent update granted, close banner
  - `reject(): void` — persist `denied`, close banner (signals already denied by default)
  - `reopen(): void` — set `bannerOpen = true`

**Note on `nuxt-gtag` API (verified against installed ^3.0.3 README):** `useGtag()` returns `{ gtag, initialize, disableAnalytics, enableAnalytics }`. Update consent via `gtag('consent', 'update', {...})`. Default denied is set in `nuxt.config` (Task 3), not here.

- [ ] **Step 1: Write the composable**

```ts
// app/composables/useConsent.ts
import {
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE,
  parseConsent,
  consentSignals,
  type ConsentDecision,
} from '~/utils/consent'

// Single source of truth for the user's cookie-consent decision. Backed by a
// first-party cookie (cu_consent). Applies Google Consent Mode v2 updates to
// gtag when the user accepts; the denied default is configured in nuxt.config.
export function useConsent() {
  const cookie = useCookie<string | null>(CONSENT_COOKIE_NAME, {
    maxAge: CONSENT_MAX_AGE,
    sameSite: 'lax',
    path: '/',
  })

  const decision = computed<ConsentDecision | null>(() => parseConsent(cookie.value))
  const hasDecided = computed(() => decision.value !== null)

  // Banner visibility. Open by default until a decision exists; the footer
  // "Configurar cookies" control re-opens it via reopen().
  const bannerOpen = useState<boolean>('cu_consent_banner_open', () => false)

  const apply = (d: ConsentDecision) => {
    if (!import.meta.client) return
    try {
      const { gtag } = useGtag()
      gtag('consent', 'update', consentSignals(d))
    } catch {
      // gtag not available (module disabled / SSR) — cookie still records intent.
    }
  }

  const accept = () => {
    cookie.value = 'granted'
    apply('granted')
    bannerOpen.value = false
  }

  const reject = () => {
    cookie.value = 'denied'
    apply('denied')
    bannerOpen.value = false
  }

  const reopen = () => {
    bannerOpen.value = true
  }

  return { decision, hasDecided, bannerOpen, accept, reject, reopen }
}
```

- [ ] **Step 2: Write the client plugin**

```ts
// app/plugins/consent.client.ts
import { parseConsent, consentSignals, CONSENT_COOKIE_NAME } from '~/utils/consent'

// Re-apply a stored "granted" decision on every client boot so returning users
// keep full consent without re-prompting. The denied default is set via
// nuxt-gtag initCommands in nuxt.config, so no action is needed for denied.
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const cookie = useCookie<string | null>(CONSENT_COOKIE_NAME)
  const decision = parseConsent(cookie.value)
  if (decision !== 'granted') return

  try {
    const { gtag } = useGtag()
    gtag('consent', 'update', consentSignals('granted'))
  } catch {
    // gtag unavailable — nothing to upgrade.
  }
})
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run typecheck`
Expected: PASS (no type errors in the new files).

- [ ] **Step 4: Commit**

```bash
git add app/composables/useConsent.ts app/plugins/consent.client.ts
git commit -m "feat(adsense): useConsent composable + returning-user consent plugin"
```

---

### Task 3: Wire Google Consent Mode v2 in nuxt.config + AdSense runtime config

**Files:**
- Modify: `app/nuxt.config.ts` (the `nuxt-gtag` module entry at ~lines 299–317; and the `runtimeConfig.public` block)

**Interfaces:**
- Produces: `runtimeConfig.public.adsensePubId` (string, default `''`); gtag now boots with Consent Mode v2 default-denied and the AW tag migrated to v3 `tags`.

- [ ] **Step 1: Replace the `nuxt-gtag` module options**

Find the existing entry:

```ts
    [
      'nuxt-gtag',
      {
        id: 'G-F97PNVRMRF',
        loadingStrategy: 'defer', // Defer loading for better performance
        config: {
          page_title: 'Cambio Uruguay',
          page_location: 'https://cambio-uruguay.com',
        },
        additionalAccounts: [
          {
            id: 'AW-972399920',
            config: {
              send_page_view: true, // optional configurations
            },
          },
        ],
      },
    ], // Replace with your Google Analytics ID
```

Replace it with (migrate `additionalAccounts` → v3 `tags`; add Consent Mode v2 default-denied via `initCommands`):

```ts
    [
      'nuxt-gtag',
      {
        id: 'G-F97PNVRMRF',
        loadingStrategy: 'defer', // Defer loading for better performance
        // Google Consent Mode v2: deny all storage by default until the user
        // accepts via the cookie banner (useConsent flips these to granted).
        // wait_for_update gives the banner a moment before tags fire.
        initCommands: [
          [
            'consent',
            'default',
            {
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              ad_storage: 'denied',
              analytics_storage: 'denied',
              wait_for_update: 500,
            },
          ],
        ],
        config: {
          page_title: 'Cambio Uruguay',
          page_location: 'https://cambio-uruguay.com',
        },
        // Google Ads conversion tag (v3 multi-destination syntax). Inherits the
        // consent default above — closes the previously ungated tag.
        tags: [
          {
            id: 'AW-972399920',
            config: {
              send_page_view: true,
            },
          },
        ],
      },
    ],
```

- [ ] **Step 2: Add `adsensePubId` to `runtimeConfig.public`**

Locate the existing `runtimeConfig: { public: { ... } }` block (it already contains `clarityId`). Add this key alongside the others (do NOT remove existing keys):

```ts
      // Google AdSense publisher id (ca-pub-XXXXXXXXXXXXXXXX). Empty until the
      // AdSense account is created; when set, app.vue injects the loader script.
      adsensePubId: process.env.NUXT_PUBLIC_ADSENSE_PUB_ID || '',
```

If no `runtimeConfig` block exists, add one at the top level of `defineNuxtConfig`:

```ts
  runtimeConfig: {
    public: {
      adsensePubId: process.env.NUXT_PUBLIC_ADSENSE_PUB_ID || '',
    },
  },
```

- [ ] **Step 3: Verify config loads**

Run: `npm run typecheck`
Expected: PASS. (If `tags`/`initCommands` types error, confirm nuxt-gtag ^3.0.3 — the README documents both options for v3.)

- [ ] **Step 4: Commit**

```bash
git add app/nuxt.config.ts
git commit -m "feat(adsense): Consent Mode v2 default-denied + migrate Ads tag to v3 tags + adsensePubId config"
```

---

### Task 4: CookieConsent banner component + mount + i18n

**Files:**
- Create: `app/components/CookieConsent.vue`
- Modify: `app/layouts/default.vue` (mount the banner)
- Modify: `app/i18n/locales/json/es.json`, `app/i18n/locales/json/en.json`, `app/i18n/locales/json/pt.json` (add `consent.*`)

**Interfaces:**
- Consumes: `useConsent()` (`hasDecided`, `bannerOpen`, `accept`, `reject`), `useLocalePath()`, `useI18n()`.

- [ ] **Step 1: Add i18n keys** — add this top-level `consent` object to each locale file (translate values per locale).

es.json:
```json
  "consent": {
    "message": "Usamos cookies propias y de terceros (Google Analytics, Google AdSense y Google Ads) para medir el tráfico, personalizar contenido y mostrar anuncios. Podés aceptarlas o rechazarlas.",
    "accept": "Aceptar",
    "reject": "Rechazar",
    "more": "Más información",
    "title": "Tu privacidad",
    "settings": "Configurar cookies"
  },
```

en.json:
```json
  "consent": {
    "message": "We use first- and third-party cookies (Google Analytics, Google AdSense and Google Ads) to measure traffic, personalize content and show ads. You can accept or reject them.",
    "accept": "Accept",
    "reject": "Reject",
    "more": "Learn more",
    "title": "Your privacy",
    "settings": "Cookie settings"
  },
```

pt.json:
```json
  "consent": {
    "message": "Usamos cookies próprios e de terceiros (Google Analytics, Google AdSense e Google Ads) para medir o tráfego, personalizar conteúdo e exibir anúncios. Você pode aceitá-los ou recusá-los.",
    "accept": "Aceitar",
    "reject": "Recusar",
    "more": "Saiba mais",
    "title": "Sua privacidade",
    "settings": "Configurar cookies"
  },
```

- [ ] **Step 2: Create the banner component**

```vue
<!-- app/components/CookieConsent.vue -->
<template>
  <VFadeTransition>
    <div v-if="visible" class="cookie-consent" role="dialog" aria-live="polite" :aria-label="t('consent.title')">
      <VCard class="cookie-consent__card pa-4" elevation="12">
        <div class="d-flex flex-column flex-md-row align-md-center ga-3">
          <div class="cookie-consent__text text-body-2">
            {{ t('consent.message') }}
            <NuxtLink :to="localePath('/privacidad')" class="cookie-consent__link">
              {{ t('consent.more') }}
            </NuxtLink>
          </div>
          <div class="d-flex ga-2 flex-shrink-0">
            <VBtn variant="text" color="grey-lighten-1" @click="reject">
              {{ t('consent.reject') }}
            </VBtn>
            <VBtn color="primary" variant="elevated" @click="accept">
              {{ t('consent.accept') }}
            </VBtn>
          </div>
        </div>
      </VCard>
    </div>
  </VFadeTransition>
</template>

<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const { hasDecided, bannerOpen, accept, reject } = useConsent()

// Show until a decision is made, or when the user re-opens it from the footer.
const visible = computed(() => !hasDecided.value || bannerOpen.value)
</script>

<style scoped>
.cookie-consent {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 2000;
  display: flex;
  justify-content: center;
  padding: 12px;
  pointer-events: none;
}
.cookie-consent__card {
  pointer-events: auto;
  max-width: 920px;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
}
.cookie-consent__text {
  line-height: 1.6;
}
.cookie-consent__link {
  color: #64b5f6;
  text-decoration: none;
  font-weight: 600;
}
.cookie-consent__link:hover {
  text-decoration: underline;
}
</style>
```

- [ ] **Step 3: Mount in the default layout**

In `app/layouts/default.vue`, inside the `<VApp>` template, add the banner near the other `<ClientOnly>` mounts (e.g. right after `<Footer />`):

```vue
    <Footer />
    <ClientOnly><CookieConsent /></ClientOnly>
    <JoinTwitter />
```

- [ ] **Step 4: Verify**

Run: `npm run lint && npm run typecheck`
Expected: PASS.

Manual (if dev server available): `npm run dev`, open `http://localhost:3311` in a fresh profile → banner appears at bottom; Accept hides it.

- [ ] **Step 5: Commit**

```bash
git add app/components/CookieConsent.vue app/layouts/default.vue app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json
git commit -m "feat(adsense): cookie consent banner wired to Consent Mode v2"
```

---

### Task 5: Footer legal links + "Configurar cookies" reopen

**Files:**
- Modify: `app/components/Footer.vue`
- Modify: `app/i18n/locales/json/{es,en,pt}.json` (add `legal.*` nav labels)

**Interfaces:**
- Consumes: `useConsent()` (`reopen`), existing `useLocalePath()`.

- [ ] **Step 1: Add i18n nav labels** — add a top-level `legal` object to each locale file.

es.json:
```json
  "legal": {
    "privacyNav": "Privacidad",
    "termsNav": "Términos",
    "contactNav": "Contacto"
  },
```
en.json:
```json
  "legal": {
    "privacyNav": "Privacy",
    "termsNav": "Terms",
    "contactNav": "Contact"
  },
```
pt.json:
```json
  "legal": {
    "privacyNav": "Privacidade",
    "termsNav": "Termos",
    "contactNav": "Contato"
  },
```

- [ ] **Step 2: Add legal links + cookie-settings control to the footer nav**

In `app/components/Footer.vue`, inside the existing `<nav class="d-flex align-center flex-wrap ga-3 footer-links">`, after the `/acerca` link, add:

```vue
          <NuxtLink :to="localePath('/privacidad')" class="footer-link text-caption">
            {{ $t('legal.privacyNav') }}
          </NuxtLink>
          <NuxtLink :to="localePath('/terminos')" class="footer-link text-caption">
            {{ $t('legal.termsNav') }}
          </NuxtLink>
          <NuxtLink :to="localePath('/contacto')" class="footer-link text-caption">
            {{ $t('legal.contactNav') }}
          </NuxtLink>
          <button type="button" class="footer-link footer-link--btn text-caption" @click="reopenConsent">
            {{ $t('consent.settings') }}
          </button>
```

- [ ] **Step 3: Wire `reopenConsent` in the script block**

Replace the existing `<script setup lang="ts">` body in `Footer.vue`:

```ts
const localePath = useLocalePath()
```

with:

```ts
const localePath = useLocalePath()
const { reopen } = useConsent()
const reopenConsent = () => reopen()
```

- [ ] **Step 4: Add button reset style** — append to the `<style lang="scss" scoped>` block:

```scss
.footer-link--btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font: inherit;
}
```

- [ ] **Step 5: Verify**

Run: `npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/components/Footer.vue app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json
git commit -m "feat(legal): footer legal links + cookie-settings reopen"
```

---

### Task 6: Privacy Policy page (`/privacidad`)

**Files:**
- Create: `app/pages/privacidad.vue`
- Modify: `app/i18n/locales/json/{es,en,pt}.json` (add `legal.privacy.*` meta + nav)
- Modify: `app/server/api/__sitemap__/urls.get.ts` (add route)

**Interfaces:**
- Consumes: `useI18n()`, `useLocalePath()`, `useSeoMeta()`, `useHead()`, `defineOgImageComponent()`.

- [ ] **Step 1: Add i18n meta keys** — into the `legal` object of each locale file add a `privacy` sub-object.

es.json (`legal.privacy`):
```json
    "privacy": {
      "metaTitle": "Política de Privacidad | Cambio Uruguay",
      "metaDescription": "Cómo Cambio Uruguay recopila, usa y protege tus datos: cookies, Google Analytics, Google AdSense, Google Ads, autenticación y tus opciones de privacidad.",
      "h1": "Política de Privacidad"
    }
```
en.json (`legal.privacy`):
```json
    "privacy": {
      "metaTitle": "Privacy Policy | Cambio Uruguay",
      "metaDescription": "How Cambio Uruguay collects, uses and protects your data: cookies, Google Analytics, Google AdSense, Google Ads, authentication and your privacy choices.",
      "h1": "Privacy Policy"
    }
```
pt.json (`legal.privacy`):
```json
    "privacy": {
      "metaTitle": "Política de Privacidade | Cambio Uruguay",
      "metaDescription": "Como o Cambio Uruguay coleta, usa e protege seus dados: cookies, Google Analytics, Google AdSense, Google Ads, autenticação e suas opções de privacidade.",
      "h1": "Política de Privacidade"
    }
```

> Note: nest `privacy` inside the existing `legal` object created in Task 5. Do the same for `terms` (Task 7) and `contact` (Task 8).

- [ ] **Step 2: Create the page** (Spanish prose inline, per Global Constraints)

```vue
<!-- app/pages/privacidad.vue -->
<template>
  <div class="legal-page">
    <VContainer>
      <header class="text-center py-8 py-md-12">
        <VChip class="mb-4" color="primary" size="small" variant="tonal">
          <VIcon start size="small">mdi-shield-lock-outline</VIcon>
          {{ t('legal.privacyNav') }}
        </VChip>
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">{{ t('legal.privacy.h1') }}</h1>
        <p class="text-caption text-grey-darken-1">
          Última actualización: {{ lastUpdatedDisplay }}
        </p>
      </header>

      <VRow justify="center">
        <VCol cols="12" md="9" lg="8">
          <section class="mb-8">
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              En Cambio Uruguay respetamos tu privacidad. Esta política explica qué datos
              recopilamos, con qué fin, con quién los compartimos y qué opciones tenés sobre ellos.
              Cambio Uruguay es un servicio informativo y gratuito; no vendemos divisas ni operamos
              cuentas bancarias.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">1. Responsable</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              El responsable del sitio es el equipo de Cambio Uruguay. Para cualquier consulta sobre
              privacidad podés escribirnos a
              <a class="legal-link" href="mailto:admin@cambio-uruguay.com">admin@cambio-uruguay.com</a>.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">2. Datos que recopilamos</h2>
            <ul class="legal-list text-body-1 text-grey-lighten-1">
              <li>
                <strong>Datos de uso y dispositivo:</strong> páginas visitadas, tiempo en el sitio,
                tipo de navegador, sistema operativo, idioma y país aproximado, recogidos de forma
                agregada mediante herramientas de analítica.
              </li>
              <li>
                <strong>Cookies y tecnologías similares:</strong> ver la sección 4.
              </li>
              <li>
                <strong>Datos de cuenta (opcional):</strong> si iniciás sesión (Google, correo,
                enlace mágico o Discord), guardamos un identificador y los datos mínimos para
                ofrecerte favoritos y alertas de cotización. La autenticación se gestiona con
                Firebase (Google).
              </li>
              <li>
                <strong>Datos que nos envías:</strong> si nos escribís por correo, conservamos tu
                mensaje para responderte.
              </li>
            </ul>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">3. Cómo usamos los datos</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              Usamos la información para operar y mejorar el sitio, medir su audiencia de forma
              agregada, personalizar contenido y mostrar publicidad, recordar tus preferencias
              (como el idioma y tu elección de cookies) y, si tenés cuenta, brindarte favoritos y
              alertas.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">4. Cookies y servicios de terceros</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1 mb-3">
              Usamos cookies propias (por ejemplo, para recordar tu idioma y tu decisión sobre
              cookies) y de terceros con fines de analítica y publicidad. Los principales terceros
              son:
            </p>
            <ul class="legal-list text-body-1 text-grey-lighten-1">
              <li>
                <strong>Google Analytics (GA4):</strong> métricas de audiencia agregadas.
              </li>
              <li>
                <strong>Google AdSense:</strong> publicidad. Proveedores externos, incluido Google,
                usan cookies para mostrar anuncios según tus visitas a este y otros sitios.
              </li>
              <li>
                <strong>Google Ads:</strong> medición de campañas y conversiones.
              </li>
              <li>
                <strong>Firebase (Google):</strong> autenticación y notificaciones, solo si usás esas
                funciones.
              </li>
            </ul>
            <VAlert type="info" variant="tonal" density="comfortable" class="mt-3 legal-prose">
              Aplicamos el Modo de Consentimiento de Google (Consent Mode v2): hasta que aceptás,
              las cookies de analítica y publicidad permanecen desactivadas. Podés cambiar tu
              elección en cualquier momento desde el enlace «Configurar cookies» del pie de página.
            </VAlert>
            <p class="legal-prose text-body-1 text-grey-lighten-1 mt-3">
              Más información sobre cómo Google usa los datos:
              <a class="legal-link" href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
                policies.google.com/technologies/partner-sites
              </a>. Podés gestionar la personalización de anuncios en
              <a class="legal-link" href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">
                google.com/settings/ads
              </a>.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">5. Base legal y conservación</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              Tratamos los datos sobre la base de tu consentimiento (cookies de analítica y
              publicidad) y de nuestro interés legítimo en operar el sitio. Conservamos los datos solo
              el tiempo necesario para los fines descritos o el que exija la ley.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">6. Tus derechos y opciones</h2>
            <ul class="legal-list text-body-1 text-grey-lighten-1">
              <li>Aceptar o rechazar cookies desde el banner o el enlace «Configurar cookies».</li>
              <li>Bloquear o borrar cookies desde la configuración de tu navegador.</li>
              <li>
                Solicitar acceso, rectificación o eliminación de tus datos escribiendo a
                <a class="legal-link" href="mailto:admin@cambio-uruguay.com">admin@cambio-uruguay.com</a>.
              </li>
            </ul>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">7. Menores</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              El sitio no está dirigido a menores de 13 años y no recopilamos datos de ellos de forma
              consciente.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">8. Cambios</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              Podemos actualizar esta política. Publicaremos los cambios en esta página con su nueva
              fecha de actualización.
            </p>
          </section>

          <VCard class="legal-cta pa-6 text-center" variant="flat">
            <p class="text-body-2 text-grey-lighten-1 mb-4">
              ¿Dudas sobre tus datos? Escribinos y te respondemos.
            </p>
            <VBtn :to="localePath('/contacto')" color="primary" variant="elevated">
              <VIcon start>mdi-email-outline</VIcon>
              {{ t('legal.contactNav') }}
            </VBtn>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()

const LAST_UPDATED = '2026-06-20'
const lastUpdatedDisplay = computed(() =>
  new Date(LAST_UPDATED).toLocaleDateString(locale.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
)

const canonicalUrl = 'https://cambio-uruguay.com/privacidad'

defineOgImageComponent('Cambio', {
  title: () => t('legal.privacy.h1'),
  subtitle: 'Cambio Uruguay',
  tag: 'PRIVACIDAD',
  locale: locale.value as 'es' | 'en' | 'pt',
})

useSeoMeta({
  title: () => t('legal.privacy.metaTitle'),
  description: () => t('legal.privacy.metaDescription'),
  ogTitle: () => t('legal.privacy.metaTitle'),
  ogDescription: () => t('legal.privacy.metaDescription'),
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
})
</script>

<style scoped>
.legal-prose {
  line-height: 1.75;
}
.legal-list {
  line-height: 1.8;
  padding-left: 1.2rem;
}
.legal-list li {
  margin: 0.5rem 0;
}
.legal-link {
  color: #64b5f6;
  text-decoration: none;
  font-weight: 600;
}
.legal-link:hover {
  text-decoration: underline;
}
.legal-cta {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}
</style>
```

- [ ] **Step 3: Add to sitemap**

In `app/server/api/__sitemap__/urls.get.ts`, after the `addUrlsForAllLocales('/acerca', 0.6, 'monthly')` line, add:

```ts
    addUrlsForAllLocales('/privacidad', 0.4, 'yearly') // Privacy policy
    addUrlsForAllLocales('/terminos', 0.4, 'yearly') // Terms of use
    addUrlsForAllLocales('/contacto', 0.5, 'monthly') // Contact
```

(All three legal routes added here so Tasks 7 and 8 don't re-touch this file.)

- [ ] **Step 4: Verify**

Run: `npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/pages/privacidad.vue app/server/api/__sitemap__/urls.get.ts app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json
git commit -m "feat(legal): privacy policy page + sitemap entries for legal pages"
```

---

### Task 7: Terms of Use page (`/terminos`)

**Files:**
- Create: `app/pages/terminos.vue`
- Modify: `app/i18n/locales/json/{es,en,pt}.json` (add `legal.terms.*`)

**Interfaces:**
- Consumes: same Nuxt composables as Task 6. Sitemap entry already added in Task 6 Step 3.

- [ ] **Step 1: Add i18n meta keys** — add `terms` sub-object inside `legal` in each locale.

es.json (`legal.terms`):
```json
    "terms": {
      "metaTitle": "Términos de Uso | Cambio Uruguay",
      "metaDescription": "Términos y condiciones de uso de Cambio Uruguay: naturaleza informativa de las cotizaciones, limitación de responsabilidad y propiedad intelectual.",
      "h1": "Términos de Uso"
    }
```
en.json (`legal.terms`):
```json
    "terms": {
      "metaTitle": "Terms of Use | Cambio Uruguay",
      "metaDescription": "Terms and conditions for using Cambio Uruguay: informational nature of the rates, limitation of liability and intellectual property.",
      "h1": "Terms of Use"
    }
```
pt.json (`legal.terms`):
```json
    "terms": {
      "metaTitle": "Termos de Uso | Cambio Uruguay",
      "metaDescription": "Termos e condições de uso do Cambio Uruguay: natureza informativa das cotações, limitação de responsabilidade e propriedade intelectual.",
      "h1": "Termos de Uso"
    }
```

- [ ] **Step 2: Create the page**

```vue
<!-- app/pages/terminos.vue -->
<template>
  <div class="legal-page">
    <VContainer>
      <header class="text-center py-8 py-md-12">
        <VChip class="mb-4" color="primary" size="small" variant="tonal">
          <VIcon start size="small">mdi-file-document-outline</VIcon>
          {{ t('legal.termsNav') }}
        </VChip>
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">{{ t('legal.terms.h1') }}</h1>
        <p class="text-caption text-grey-darken-1">
          Última actualización: {{ lastUpdatedDisplay }}
        </p>
      </header>

      <VRow justify="center">
        <VCol cols="12" md="9" lg="8">
          <section class="mb-8">
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              Al usar Cambio Uruguay aceptás estos términos. Si no estás de acuerdo, por favor no
              utilices el sitio.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">1. Qué es Cambio Uruguay</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              Cambio Uruguay es una plataforma informativa y gratuita que reúne y compara
              cotizaciones de divisas publicadas por el Banco Central del Uruguay y por casas de
              cambio. No somos una casa de cambio, no operamos divisas ni intermediamos
              transacciones.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">2. Las cotizaciones son informativas</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              Las cotizaciones, indicadores y cálculos que mostramos tienen carácter exclusivamente
              informativo y de referencia. Pueden tener demoras o diferencias respecto del precio
              real de cada entidad en el momento de operar. No constituyen asesoramiento financiero,
              de inversión ni de ningún otro tipo. Verificá siempre el precio final directamente con
              la casa de cambio o entidad antes de operar.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">3. Limitación de responsabilidad</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              El sitio se ofrece «tal cual». En la medida que la ley lo permita, no nos
              responsabilizamos por decisiones tomadas en base a la información del sitio, ni por
              errores, interrupciones o falta de disponibilidad del servicio.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">4. Uso aceptable</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              Te comprometés a no usar el sitio de forma que afecte su funcionamiento, vulnere
              derechos de terceros o infrinja la ley, incluido el raspado masivo que degrade el
              servicio. Para acceso a datos de forma programática ofrecemos una API pública.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">5. Propiedad intelectual</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              La marca, el diseño y el contenido editorial de Cambio Uruguay pertenecen a sus
              autores. Las cotizaciones provienen de sus fuentes respectivas. Podés compartir
              enlaces al sitio y usar nuestro widget de cotización con la atribución correspondiente.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">6. Publicidad y enlaces de terceros</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              El sitio puede mostrar publicidad (por ejemplo, Google AdSense) y enlaces a sitios de
              terceros. No controlamos ni respaldamos su contenido y no somos responsables de ellos.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">7. Privacidad</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              El tratamiento de tus datos se rige por nuestra
              <NuxtLink :to="localePath('/privacidad')" class="legal-link">Política de Privacidad</NuxtLink>.
            </p>
          </section>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">8. Cambios y ley aplicable</h2>
            <p class="legal-prose text-body-1 text-grey-lighten-1">
              Podemos actualizar estos términos; los cambios se publican en esta página. Estos
              términos se rigen por las leyes de la República Oriental del Uruguay.
            </p>
          </section>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()

const LAST_UPDATED = '2026-06-20'
const lastUpdatedDisplay = computed(() =>
  new Date(LAST_UPDATED).toLocaleDateString(locale.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
)

const canonicalUrl = 'https://cambio-uruguay.com/terminos'

defineOgImageComponent('Cambio', {
  title: () => t('legal.terms.h1'),
  subtitle: 'Cambio Uruguay',
  tag: 'TERMINOS',
  locale: locale.value as 'es' | 'en' | 'pt',
})

useSeoMeta({
  title: () => t('legal.terms.metaTitle'),
  description: () => t('legal.terms.metaDescription'),
  ogTitle: () => t('legal.terms.metaTitle'),
  ogDescription: () => t('legal.terms.metaDescription'),
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
})
</script>

<style scoped>
.legal-prose {
  line-height: 1.75;
}
.legal-link {
  color: #64b5f6;
  text-decoration: none;
  font-weight: 600;
}
.legal-link:hover {
  text-decoration: underline;
}
</style>
```

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/pages/terminos.vue app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json
git commit -m "feat(legal): terms of use page"
```

---

### Task 8: Contact page (`/contacto`)

**Files:**
- Create: `app/pages/contacto.vue`
- Modify: `app/i18n/locales/json/{es,en,pt}.json` (add `legal.contact.*`)

**Interfaces:**
- Consumes: same Nuxt composables. Sitemap entry already added in Task 6 Step 3.

- [ ] **Step 1: Add i18n meta keys** — add `contact` sub-object inside `legal` in each locale.

es.json (`legal.contact`):
```json
    "contact": {
      "metaTitle": "Contacto | Cambio Uruguay",
      "metaDescription": "Ponete en contacto con el equipo de Cambio Uruguay por correo electrónico o redes sociales.",
      "h1": "Contacto",
      "intro": "¿Tenés una consulta, una corrección o una propuesta? Escribinos y te respondemos.",
      "emailTitle": "Correo electrónico",
      "socialTitle": "Redes sociales"
    }
```
en.json (`legal.contact`):
```json
    "contact": {
      "metaTitle": "Contact | Cambio Uruguay",
      "metaDescription": "Get in touch with the Cambio Uruguay team by email or social media.",
      "h1": "Contact",
      "intro": "Have a question, a correction or a proposal? Write to us and we'll get back to you.",
      "emailTitle": "Email",
      "socialTitle": "Social media"
    }
```
pt.json (`legal.contact`):
```json
    "contact": {
      "metaTitle": "Contato | Cambio Uruguay",
      "metaDescription": "Entre em contato com a equipe do Cambio Uruguay por e-mail ou redes sociais.",
      "h1": "Contato",
      "intro": "Tem uma dúvida, uma correção ou uma proposta? Escreva para nós e responderemos.",
      "emailTitle": "E-mail",
      "socialTitle": "Redes sociais"
    }
```

- [ ] **Step 2: Create the page**

```vue
<!-- app/pages/contacto.vue -->
<template>
  <div class="legal-page">
    <VContainer>
      <header class="text-center py-8 py-md-12">
        <VChip class="mb-4" color="primary" size="small" variant="tonal">
          <VIcon start size="small">mdi-email-outline</VIcon>
          {{ t('legal.contactNav') }}
        </VChip>
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">{{ t('legal.contact.h1') }}</h1>
        <p class="text-body-1 text-grey-lighten-1 mx-auto contact-intro">
          {{ t('legal.contact.intro') }}
        </p>
      </header>

      <VRow justify="center">
        <VCol cols="12" md="8" lg="6">
          <VCard class="pa-6 mb-6" variant="tonal" color="primary">
            <h2 class="text-h6 font-weight-bold mb-2">{{ t('legal.contact.emailTitle') }}</h2>
            <a class="contact-email text-h6" href="mailto:admin@cambio-uruguay.com">
              admin@cambio-uruguay.com
            </a>
          </VCard>

          <VCard class="pa-6" variant="outlined">
            <h2 class="text-h6 font-weight-bold mb-4">{{ t('legal.contact.socialTitle') }}</h2>
            <div class="d-flex flex-wrap ga-2">
              <VBtn
                v-for="s in socials"
                :key="s.label"
                :href="s.href"
                target="_blank"
                rel="noopener noreferrer"
                variant="tonal"
                color="primary"
              >
                <VIcon start>{{ s.icon }}</VIcon>
                {{ s.label }}
              </VBtn>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()

const socials = [
  { label: 'Twitter / X', icon: 'mdi-twitter', href: 'https://twitter.com/cambio_uruguay' },
  { label: 'Telegram', icon: 'mdi-telegram', href: 'https://t.me/cambio_uruguay' },
  { label: 'LinkedIn', icon: 'mdi-linkedin', href: 'https://www.linkedin.com/company/cambio-uruguay/' },
]

const canonicalUrl = 'https://cambio-uruguay.com/contacto'

defineOgImageComponent('Cambio', {
  title: () => t('legal.contact.h1'),
  subtitle: 'Cambio Uruguay',
  tag: 'CONTACTO',
  locale: locale.value as 'es' | 'en' | 'pt',
})

useSeoMeta({
  title: () => t('legal.contact.metaTitle'),
  description: () => t('legal.contact.metaDescription'),
  ogTitle: () => t('legal.contact.metaTitle'),
  ogDescription: () => t('legal.contact.metaDescription'),
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        url: canonicalUrl,
        name: 'Contacto - Cambio Uruguay',
        inLanguage: 'es-UY',
        isPartOf: { '@type': 'WebSite', name: 'Cambio Uruguay', url: 'https://cambio-uruguay.com' },
        mainEntity: {
          '@type': 'Organization',
          name: 'Cambio Uruguay',
          email: 'admin@cambio-uruguay.com',
          url: 'https://cambio-uruguay.com',
        },
      }),
    },
  ],
})
</script>

<style scoped>
.contact-intro {
  max-width: 640px;
  line-height: 1.7;
}
.contact-email {
  color: #fff;
  text-decoration: none;
  font-weight: 700;
  word-break: break-all;
}
.contact-email:hover {
  text-decoration: underline;
}
</style>
```

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/pages/contacto.vue app/i18n/locales/json/es.json app/i18n/locales/json/en.json app/i18n/locales/json/pt.json
git commit -m "feat(legal): contact page with email + social links"
```

---

### Task 9: ads.txt placeholder

**Files:**
- Create: `app/public/ads.txt`

- [ ] **Step 1: Create the file**

```text
# ads.txt for cambio-uruguay.com
# Authorized Digital Sellers (IAB). No publisher account yet.
# After AdSense approval, replace the line below with:
# google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
#
# (placeholder — intentionally empty of seller lines until approved)
```

- [ ] **Step 2: Verify it serves** (if dev server available)

Run: `npm run dev` then fetch `http://localhost:3311/ads.txt`.
Expected: returns the file contents (200, `text/plain`).

- [ ] **Step 3: Commit**

```bash
git add app/public/ads.txt
git commit -m "feat(adsense): ads.txt placeholder (populate after approval)"
```

---

### Task 10: Config-driven AdSense snippet injection

**Files:**
- Modify: `app/app.vue` (inject loader + meta when `adsensePubId` set)

**Interfaces:**
- Consumes: `useRuntimeConfig().public.adsensePubId` (added in Task 3).

- [ ] **Step 1: Add the injection to `app.vue`'s `<script setup>`**

Near the top of the `<script setup lang="ts">` block in `app/app.vue` (after `defineOgImageComponent('Cambio')`), add:

```ts
// Google AdSense: inject the loader + account meta only when a publisher id is
// configured (NUXT_PUBLIC_ADSENSE_PUB_ID). Empty by default so nothing loads
// until the AdSense account exists — applying later is a config change, not a
// code change. Personalized-ads behaviour follows the Consent Mode v2 signals
// set by the cookie banner.
const adsensePubId = useRuntimeConfig().public.adsensePubId as string
if (adsensePubId) {
  useHead({
    meta: [{ name: 'google-adsense-account', content: adsensePubId }],
    script: [
      {
        src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsensePubId}`,
        async: true,
        crossorigin: 'anonymous',
      },
    ],
  })
}
```

- [ ] **Step 2: Verify the no-op default**

Run: `npm run lint && npm run typecheck`
Expected: PASS. With `NUXT_PUBLIC_ADSENSE_PUB_ID` unset, no AdSense script/meta is emitted (the `if` guards it).

- [ ] **Step 3: Commit**

```bash
git add app/app.vue
git commit -m "feat(adsense): config-driven AdSense loader + account meta (no-op until pub id set)"
```

---

### Task 11: E2E tests — consent flow + legal pages

**Files:**
- Create: `app/tests/e2e/consent.spec.ts`
- Create: `app/tests/e2e/legal.spec.ts`

**Note:** Playwright starts/uses the dev server at `http://localhost:3311` (see `playwright.config.ts`). The consent decision is stored in the `cu_consent` cookie; default-denied consent is configured in `nuxt.config`.

- [ ] **Step 1: Write the consent e2e**

```ts
// app/tests/e2e/consent.spec.ts
import { test, expect } from '@playwright/test'

test.describe('cookie consent', () => {
  test('shows the banner on first visit and accepting hides it + persists', async ({ page }) => {
    await page.goto('/')
    const accept = page.getByRole('button', { name: /Aceptar/i })
    await expect(accept).toBeVisible()

    await accept.click()
    await expect(accept).toBeHidden()

    const cookies = await page.context().cookies()
    expect(cookies.find(c => c.name === 'cu_consent')?.value).toBe('granted')

    // Reload: banner must not reappear.
    await page.reload()
    await expect(page.getByRole('button', { name: /Aceptar/i })).toBeHidden()
  })

  test('rejecting persists denied and hides the banner', async ({ page }) => {
    await page.goto('/')
    const reject = page.getByRole('button', { name: /Rechazar/i })
    await expect(reject).toBeVisible()
    await reject.click()

    const cookies = await page.context().cookies()
    expect(cookies.find(c => c.name === 'cu_consent')?.value).toBe('denied')
    await expect(reject).toBeHidden()
  })

  test('footer "Configurar cookies" re-opens the banner after a decision', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Aceptar/i }).click()
    await expect(page.getByRole('button', { name: /Aceptar/i })).toBeHidden()

    await page.getByRole('button', { name: /Configurar cookies/i }).click()
    await expect(page.getByRole('button', { name: /Aceptar/i })).toBeVisible()
  })
})
```

- [ ] **Step 2: Write the legal-pages e2e**

```ts
// app/tests/e2e/legal.spec.ts
import { test, expect } from '@playwright/test'

const pages = [
  { path: '/privacidad', heading: /Política de Privacidad/i },
  { path: '/terminos', heading: /Términos de Uso/i },
  { path: '/contacto', heading: /Contacto/i },
]

test.describe('legal pages', () => {
  for (const p of pages) {
    test(`${p.path} renders with its H1`, async ({ page }) => {
      const res = await page.goto(p.path)
      expect(res?.status()).toBeLessThan(400)
      await expect(page.getByRole('heading', { level: 1, name: p.heading })).toBeVisible()
    })
  }

  test('contact page exposes the admin email', async ({ page }) => {
    await page.goto('/contacto')
    await expect(page.getByRole('link', { name: /admin@cambio-uruguay\.com/i })).toBeVisible()
  })

  test('footer links reach the legal pages', async ({ page }) => {
    await page.goto('/')
    // dismiss banner so it doesn't overlap footer clicks
    await page.getByRole('button', { name: /Aceptar/i }).click()
    await page.getByRole('link', { name: /^Privacidad$/ }).click()
    await expect(page).toHaveURL(/\/privacidad$/)
  })
})
```

- [ ] **Step 3: Run the e2e suite**

Run: `npm run test:e2e -- consent legal`
Expected: PASS. (Playwright boots the dev server if not already running; first run may take up to ~3 min.)

If a test fails for timing, prefer fixing the component/selector over loosening the assertion. Use systematic-debugging.

- [ ] **Step 4: Commit**

```bash
git add app/tests/e2e/consent.spec.ts app/tests/e2e/legal.spec.ts
git commit -m "test(adsense): e2e for consent flow + legal pages"
```

---

### Task 12: Compliance audit + final verification

**Files:** (fixes only where the audit finds issues — no speculative changes)

- [ ] **Step 1: Run the full unit suite + typecheck + lint**

Run: `npm run test:unit && npm run typecheck && npm run lint`
Expected: all PASS.

- [ ] **Step 2: Manual AdSense-policy checklist** (verify, fix if broken)

- [ ] Legal pages reachable from the footer on every page (es/en/pt): `/privacidad`, `/terminos`, `/contacto`.
- [ ] Banner appears for a new visitor; Accept/Reject both work; choice persists; footer re-opens it.
- [ ] With `NUXT_PUBLIC_ADSENSE_PUB_ID` unset, no AdSense script in page source; with it set (test value), the loader + `google-adsense-account` meta appear in `<head>`.
- [ ] `GET /ads.txt` returns the placeholder.
- [ ] `GET /sitemap.xml` (or the sitemap index) includes `/privacidad`, `/terminos`, `/contacto`.
- [ ] No broken internal links introduced; nav has no dead ends.
- [ ] Privacy policy explicitly mentions third-party/Google AdSense cookies (AdSense hard requirement) — confirmed in Task 6 copy.
- [ ] Terms page carries the "informational, not financial advice" YMYL disclaimer — confirmed in Task 7 copy.

- [ ] **Step 3: Write a short audit note**

Create `docs/superpowers/research/2026-06-20-adsense-compliance-check.md` summarizing the checklist results (pass/fail per item) and any fixes made.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs(adsense): phase 1 compliance check notes"
```

---

## Self-Review

**Spec coverage:**
- Legal pages (privacy/terms/contact) → Tasks 6, 7, 8. ✅
- Footer legal links + reopen → Task 5. ✅
- Cookie consent + Consent Mode v2 (gating GA4 **and** AW tag) → Tasks 1–4 (default-denied in Task 3 covers both tags). ✅
- AdSense snippet plumbing (config-driven, no-op default) → Tasks 3 (config) + 10 (injection). ✅
- ads.txt → Task 9. ✅
- Compliance audit → Task 12. ✅
- i18n es/en/pt for all chrome → Tasks 4, 5, 6, 7, 8. ✅
- Testing (unit pure logic + e2e) → Tasks 1, 11. ✅
- Out of scope (ad slots, 3rd-party CMP, contact form) → correctly deferred. ✅

**Placeholder scan:** ads.txt contains an intentional placeholder *by design* (no pub id yet) — documented, not a plan gap. No "TODO/TBD" in code steps. ✅

**Type consistency:** `consentSignals` / `parseConsent` / `serializeConsent` / `CONSENT_COOKIE_NAME` / `CONSENT_MAX_AGE` signatures match between Task 1 (definition), Task 2 (consumer), and the plugin. `useConsent()` return shape (`decision`, `hasDecided`, `bannerOpen`, `accept`, `reject`, `reopen`) matches consumers in Tasks 4 and 5. gtag usage matches the installed nuxt-gtag ^3.0.3 API. ✅

**Known deviation from spec:** legal **prose** is Spanish-only inline (chrome/meta is tri-lingual), matching the `acerca.vue` precedent. Flagged for user review.
