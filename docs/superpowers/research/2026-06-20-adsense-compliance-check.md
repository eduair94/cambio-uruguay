# AdSense Readiness Phase-1 Compliance Audit

**Branch**: AdSense Phase-1 work landed on `feat/exchange-map` (all 12 task commits reachable from its HEAD). `feat/adsense-readiness` is a stale pointer at `5621298` and is missing the last six tasks — do not treat it as the source of truth.
**Audited**: 2026-06-21 (re-verified by the controller after a first automated pass produced false negatives — that pass ran during a concurrent branch switch and read a transient/dirty tree; its conclusions are void).
**Auditor**: Claude Code (read-only; no app files modified).

---

## Checklist (re-verified, authoritative)

| # | Item | Result | Evidence |
|---|------|--------|----------|
| 1 | Legal pages exist, each with `<h1>` + `useSeoMeta` + canonical (no trailing slash) | PASS | `app/pages/privacidad.vue`, `app/pages/terminos.vue`, `app/pages/contacto.vue` all present; canonicals `…/privacidad`, `…/terminos`, `…/contacto` |
| 2 | Footer links to /privacidad, /terminos, /contacto + "Configurar cookies" → `reopen()` | PASS | `app/components/Footer.vue` (i18n `legal.*Nav`; button calls `useConsent().reopen()`) |
| 3 | Privacy policy discloses Google AdSense + third-party cookies, GA4, Google Ads, Firebase, opt-out link | PASS | `app/pages/privacidad.vue` §4 (names all four services + `google.com/settings/ads` + `policies.google.com/technologies/partner-sites`) |
| 4 | Terms YMYL disclaimer ("informational, not financial advice") | PASS | `app/pages/terminos.vue` §2 |
| 5 | Contact exposes `admin@cambio-uruguay.com` (mailto) + ContactPage JSON-LD | PASS | `app/pages/contacto.vue` |
| 6 | Consent Mode v2: gtag `initCommands` default-denied (4 signals) + `wait_for_update`; AW tag under `tags` (no `additionalAccounts`); accept flips to granted; banner mounted | PASS | `app/nuxt.config.ts` gtag block; `app/composables/useConsent.ts`; `app/layouts/default.vue` mounts `<CookieConsent>` |
| 7 | AdSense snippet config-driven via `runtimeConfig.public.adsensePubId` (default `''`); `app.vue` injects loader + `google-adsense-account` meta only when set | PASS | `app/nuxt.config.ts` (`adsensePubId`); `app/app.vue:28-40` (guarded `if (adsensePubId)`) |
| 8 | `app/public/ads.txt` exists (placeholder) | PASS | `app/public/ads.txt` |
| 9 | Sitemap adds /privacidad, /terminos, /contacto | PASS | `app/server/api/__sitemap__/urls.get.ts:137-139` |
| 10 | `consent` + `legal` (incl. nested `privacy`/`terms`/`contact`) keys in es/en/pt | PASS | `node JSON.parse` confirms all keys in all three locale files |
| 11 | No broken internal links from new pages | PASS | privacy CTA → /contacto (exists); terms → /privacidad (exists) |

**Tests:** unit 403/403 pass; e2e consent+legal 8/8 pass (real Chrome run).

## Known / accepted (not defects of this feature)

- Legal page **prose** is Spanish-only inline by design (matches `acerca.vue` precedent); chrome/meta is tri-lingual. *Deviation from the design spec's "full en/pt prose" — flagged for the human.*
- `npm run typecheck` is **broken pre-existing** on this branch (vue-tsc internal crash, confirmed on base before any AdSense change). Verification gate was switched to `npm run lint`.
- 2 **pre-existing** lint errors in unrelated files — NOT introduced here: `app/components/account/TelegramLink.vue` (no-unused-expressions) and `app/tests/unit/auth-store.test.ts` (no-extraneous-class).
- `ads.txt` intentionally has no seller line until a publisher id exists.
- Repo tooling conflict: prettier vs `vue/max-attributes-per-line` + `vue/first-attribute-linebreak` for wrapped anchors. Resolved with localized `eslint-disable` comments on two mailto anchors in `privacidad.vue` (config left untouched). Recommend the human decide whether to drop those two vue rules (redundant under `eslint-config-prettier`) repo-wide.

## Bug found & fixed during e2e

`JoinTwitter` bottom-sheet (high z-index Vuetify overlay) could cover the consent banner for a 20–79 s window, blocking accept/reject. Fixed: the nudge is deferred until the consent decision is made (`app/components/JoinTwitter.vue`, commit `8f8276f`).

## Ready to apply?

**Yes — the site meets Phase-1 AdSense prerequisites.** Remaining human actions:

1. Create the AdSense account, get the `ca-pub-XXXXXXXXXXXXXXXX` id.
2. Set `NUXT_PUBLIC_ADSENSE_PUB_ID=ca-pub-…` in the deploy env → the loader + `google-adsense-account` meta auto-inject site-wide (no code change). Deploy.
3. Submit the site for AdSense review.
4. After approval: replace the placeholder line in `app/public/ads.txt` with `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`, and proceed to Phase 2 (ad slots).
5. (Optional) Decide on the eslint rule conflict noted above.
