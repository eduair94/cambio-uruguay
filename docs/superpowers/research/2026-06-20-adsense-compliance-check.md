# AdSense Readiness Phase-1 Compliance Audit

**Branch**: `feat/adsense-readiness`  
**Audited**: 2026-06-20 (files read via `git show` — no checkout needed)  
**Auditor**: Claude Code (read-only; no app files modified)

---

## Checklist

| # | Item | Result | Evidence (file:line) |
|---|------|--------|----------------------|
| 1a | `privacidad.vue` exists, has `<h1>` | PASS | `app/pages/privacidad.vue:10` — `<h1 class="text-h4...">{{ t('legal.privacy.h1') }}</h1>` |
| 1b | `privacidad.vue` has `useSeoMeta` | PASS | `app/pages/privacidad.vue:192` |
| 1c | `privacidad.vue` has `useHead` canonical, no trailing slash | PASS | `app/pages/privacidad.vue:202-204` — `href: 'https://cambio-uruguay.com/privacidad'` |
| 1d | `terminos.vue` exists | **FAIL** | File absent from branch (`git ls-tree feat/adsense-readiness app/pages/` returns no match) |
| 1e | `contacto.vue` exists | **FAIL** | File absent from branch (`git ls-tree feat/adsense-readiness app/pages/` returns no match) |
| 2a | `Footer.vue` links `/privacidad` via `legal.privacyNav` | PASS | `app/components/Footer.vue:145` — `NuxtLink :to="localePath('/privacidad')"` |
| 2b | `Footer.vue` links `/terminos` via `legal.termsNav` | PASS | `app/components/Footer.vue:149` — link present (route missing, see item 1d) |
| 2c | `Footer.vue` links `/contacto` via `legal.contactNav` | PASS | `app/components/Footer.vue:153` — link present (route missing, see item 1e) |
| 2d | Footer has "Configurar cookies" button calling `useConsent().reopen()` | PASS | `app/components/Footer.vue:176-181` — `@click="reopenConsent"`, `$t('consent.settings')`; script at line 216-217 calls `reopen()` |
| 3 | Privacy policy discloses GA4, AdSense, Google Ads, Firebase, opt-out link | PASS | `app/pages/privacidad.vue:78-110` — all five items present: GA4 (l.78), AdSense (l.80), Google Ads (l.83), Firebase (l.85), `google.com/settings/ads` opt-out link (l.106) |
| 4 | `terminos.vue` has YMYL disclaimer | **FAIL** | File does not exist on this branch |
| 5 | `contacto.vue` has `admin@cambio-uruguay.com` mailto + ContactPage JSON-LD | **FAIL** | File does not exist on this branch |
| 6a | `nuxt.config.ts` gtag `initCommands` with all four signals denied + `wait_for_update` | PASS | `app/nuxt.config.ts:307-316` — `['consent','default',{ad_user_data:'denied', ad_personalization:'denied', ad_storage:'denied', analytics_storage:'denied', wait_for_update:500}]` |
| 6b | Legacy `additionalAccounts` gone; Ads tag under `tags` | PASS | `app/nuxt.config.ts:325-334` — `tags:[{id:'AW-972399920',...}]`; no `additionalAccounts` key found in file |
| 6c | `useConsent.ts` flips signals to granted on accept | PASS | `app/composables/useConsent.ts:38-40`; `app/utils/consent.ts:18-27` — `consentSignals()` sets all four to the decision value |
| 6d | Cookie banner mounted in `default.vue` | PASS | `app/layouts/default.vue:267` — `<ClientOnly><CookieConsent /></ClientOnly>` |
| 7 | `app.vue` injects adsbygoogle loader + `google-adsense-account` meta, guarded by `adsensePubId` | **FAIL** | `app/app.vue` has NO AdSense injection code at all — `useHead`, `adsbygoogle`, and `adsensePubId` are entirely absent from this file |
| 7b | `runtimeConfig.public.adsensePubId` configured in `nuxt.config.ts` | PASS | `app/nuxt.config.ts:623` — `adsensePubId: process.env.NUXT_PUBLIC_ADSENSE_PUB_ID \|\| ''` |
| 8 | `app/public/ads.txt` exists | **FAIL** | File absent from branch (`git ls-tree feat/adsense-readiness app/public/` — no ads.txt entry) |
| 9 | Sitemap adds `/privacidad`, `/terminos`, `/contacto` | PASS | `app/server/api/__sitemap__/urls.get.ts:137-139` — all three via `addUrlsForAllLocales` |
| 10a | `es.json` has `consent.*` and `legal.*` (incl. `legal.privacy.*`) | PASS | `app/i18n/locales/json/es.json` — `consent.{message,accept,reject,more,title,settings}`, `legal.{privacyNav,termsNav,contactNav,privacy.{metaTitle,metaDescription,h1}}` |
| 10b | `en.json` has `consent.*` and `legal.*` | PASS | `app/i18n/locales/json/en.json` — same structure confirmed |
| 10c | `pt.json` has `consent.*` and `legal.*` | PASS | `app/i18n/locales/json/pt.json` — same structure confirmed |
| 10d | `legal.terms.*` sub-keys exist in all three locales | **FAIL** | Absent in all three locale JSON files — only `legal.privacy` sub-object is present; `legal.terms` and `legal.contact` objects are missing |
| 10e | `legal.contact.*` sub-keys exist in all three locales | **FAIL** | Same as above — `legal.contact` sub-object absent from all three locales |
| 11 | No dead-end links: privacy CTA links to `/contacto` (route exists?) | **FAIL** | `app/pages/privacidad.vue:159` links to `/contacto` but `contacto.vue` is absent (item 1e) — link is broken |
| 11b | Terms links to `/privacidad` (route exists?) | N/A | `terminos.vue` is absent; cannot verify |

---

## Summary counts

- PASS: 14
- FAIL: 8 (items 1d, 1e, 4, 5, 7, 8, 10d/10e counted as 8 individual failures)

---

## Known / Accepted Items (do not fail the audit on these)

- **Spanish-only prose**: Legal page body text is Spanish inline, matching the `acerca.vue` precedent. Chrome/meta is tri-lingual. Acceptable by design.
- **`npm run typecheck` crash**: Pre-existing vue-tsc failure on this branch. Not a feature defect.
- **Pre-existing lint errors**: `app/components/account/TelegramLink.vue` and `app/tests/unit/auth-store.test.ts` — not introduced by this feature.
- **`ads.txt` no seller line**: Intentional placeholder until a publisher ID exists. Marked FAIL above only because the file itself is absent (not just empty of seller lines).

---

## FAIL Item Details

| # | File | What is missing |
|---|------|-----------------|
| 1d / 4 | `app/pages/terminos.vue` | Entire page missing — no YMYL disclaimer, no `useSeoMeta`, no canonical, no `<h1>` |
| 1e / 5 | `app/pages/contacto.vue` | Entire page missing — no mailto link, no ContactPage JSON-LD, no `<h1>` |
| 7 | `app/app.vue` | AdSense snippet plumbing not implemented — `useHead` block injecting `adsbygoogle` loader script and `google-adsense-account` meta tag (guarded by `adsensePubId`) is absent; only `runtimeConfig` key exists |
| 8 | `app/public/ads.txt` | File absent from branch entirely |
| 10d | `app/i18n/locales/json/{es,en,pt}.json` | `legal.terms` sub-object missing (needed once `terminos.vue` is built) |
| 10e | `app/i18n/locales/json/{es,en,pt}.json` | `legal.contact` sub-object missing (needed once `contacto.vue` is built) |
| 11 | `app/pages/privacidad.vue:159` | CTA button links to `/contacto` which does not exist — broken internal link |

---

## Ready to apply?

**NOT READY** — 6 distinct work items must be completed before the branch can be merged and submitted to AdSense:

1. **Create `app/pages/terminos.vue`** with: `<h1>`, `useSeoMeta`, `useHead` canonical (`https://cambio-uruguay.com/terminos`, no trailing slash), and a YMYL disclaimer stating rates are informational / not financial advice. Add a link back to `/privacidad`.
2. **Create `app/pages/contacto.vue`** with: `<h1>`, `useSeoMeta`, `useHead` canonical, `admin@cambio-uruguay.com` as a `mailto:` link, and ContactPage JSON-LD schema.
3. **Wire AdSense snippet in `app/app.vue`**: read `useRuntimeConfig().public.adsensePubId`; when non-empty call `useHead` to inject `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=<id>">` and `<meta name="google-adsense-account" content="<id>">`. Guard the `useHead` call so it is a no-op when the env var is empty.
4. **Create `app/public/ads.txt`** (placeholder content, e.g. `# Placeholder — populate after AdSense approval`).
5. **Add `legal.terms.*` and `legal.contact.*` i18n sub-objects** to `es.json`, `en.json`, and `pt.json` (at minimum `metaTitle`, `metaDescription`, and `h1` keys for each, matching the `legal.privacy.*` pattern already present).
6. **After AdSense account creation**: set `NUXT_PUBLIC_ADSENSE_PUB_ID=ca-pub-XXXXXXXXXXXXXXXX` in production env; populate `ads.txt` with the official seller line (`google.com, ca-pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`).
