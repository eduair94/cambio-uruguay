# AdSense Readiness + Google Ads Compliance — Design

**Date:** 2026-06-20
**Status:** Approved (brainstorming) — pending spec review
**Author:** Eduardo Airaudo (with Claude)

## Goal

Make cambio-uruguay.com suitable for Google ads across four fronts the user
selected: (1) AdSense approval, (2) ad-slot placement, (3) Google Ads (PPC)
landing-page compliance, and (4) a policy/compliance audit.

The site already has abundant original content (cotizaciones, herramientas,
guías, glosario, blog, indicadores) — the strong base AdSense requires. The
gaps are legal pages, cookie consent, the AdSense snippet plumbing, `ads.txt`,
and footer legal links.

## Constraints & current state

- Nuxt 3 app under `app/`. i18n locales: **es / en / pt** (`app/i18n/locales/json/`).
- Analytics: `nuxt-gtag` loads GA4 (`G-F97PNVRMRF`) **and** a Google Ads
  conversion tag (`AW-972399920`) — both currently fire **without consent
  gating** (compliance gap to fix).
- No legal pages exist. Only `/acerca` (about). Footer has no legal links.
- No `ads.txt`. No cookie consent. No AdSense snippet.
- Traffic is Uruguay / LatAm-heavy; minimal EEA/UK.

## Key decisions (from brainstorming)

| Decision | Choice |
|---|---|
| AdSense status | Not applied yet → **phased**: prerequisites → apply → slots |
| Consent | **Custom Vue banner + Google Consent Mode v2**; Google's certified CMP added later via AdSense console (no code) for EEA |
| Legal copy | **Claude drafts** es + en/pt translations; user reviews. *Not legal advice.* |
| Contact | **Email + social links** (no form) |
| Contact email | `admin@cambio-uruguay.com` |

## Why phased

You apply to AdSense *with* the AdSense snippet already live → Google crawls →
approves → ads serve. Therefore legal pages, consent, and content must exist
**before** applying. Ad slots can only carry a real publisher ID **after**
approval. PPC compliance and audit fixes ride in Phase 1 because they reuse the
same legal pages and consent gating.

---

## Phase 1 — Approval prerequisites (this cycle)

### 1. Legal pages

New routed pages, each with i18n (es/en/pt), SEO meta (title/description,
`robots: index,follow`), and inclusion in the sitemap (`app/server/api/__sitemap__/urls.get.ts`).

- **`/privacidad`** — Privacy Policy. Must disclose:
  - Google AdSense and third-party vendor cookies; link to Google's
    "How Google uses information from sites that use our services".
  - GA4 analytics and the Google Ads conversion tag.
  - Firebase authentication data (login/favorites/alerts).
  - User opt-out paths (Google Ads Settings, browser cookie controls,
    the site's own "Configurar cookies" control).
  - Contact for privacy requests: `admin@cambio-uruguay.com`.
  - This page is the **hard AdSense requirement**.
- **`/terminos`** — Terms of Use. Includes a YMYL disclaimer: rates are
  informational, aggregated from public sources, not financial advice.
- **`/contacto`** — `admin@cambio-uruguay.com` (mailto) plus the existing
  social links (Twitter/Telegram/LinkedIn). No form, no backend.

Copy is drafted by Claude in Spanish, then translated to en/pt. The user
reviews before publishing. Explicit non-legal-advice note in the spec and PR.

### 2. Footer legal links

Add a legal row to `app/components/Footer.vue`:
Privacidad · Términos · Contacto · Acerca · **Configurar cookies** (the last
re-opens the consent banner). i18n keys for each label.

### 3. Cookie consent + Google Consent Mode v2

- Set `gtag('consent', 'default', …)` = **denied** for `ad_storage`,
  `analytics_storage`, `ad_user_data`, `ad_personalization` **before** any tag
  fires. `nuxt-gtag` is switched to manual/consent init so no tag loads until
  default consent is registered.
- A Vue banner component (`CookieConsent.vue`) with **Aceptar / Rechazar /
  Configurar**. On accept → `consent update` = granted; on reject → stays
  denied. Choice persisted in a first-party cookie (1-year) and re-openable via
  the footer "Configurar cookies" link.
- Gates **both** the GA4 tag and the existing `AW-972399920` Ads tag — closes
  the current ungated-tag compliance gap.
- Consent-state → gtag-params mapping is a **pure function** (unit-testable).
- The exact `nuxt-gtag` consent API (`initMode: 'manual'`, `grantConsent` /
  `revokeConsent` / `updateConsent`, or `useGtag().consent`) is verified
  against the installed version during implementation (TDD).

### 4. AdSense snippet plumbing (config-driven)

- New config/env var `ADSENSE_PUB_ID` (e.g. `ca-pub-XXXXXXXXXXXXXXXX`).
  - Empty (default) → nothing injected.
  - Set → the AdSense loader `<script>` is injected site-wide via `useHead`
    (in a plugin or `app.vue`/layout), so applying to AdSense later is a config
    change, **not** a code change.
- AdSense's own script may load to enable the review crawl; personalized ads
  remain gated by Consent Mode (non-personalized served under denied consent).

### 5. ads.txt

- Served at `/ads.txt` (static `app/public/ads.txt` or a server route).
- Until a publisher ID exists: a placeholder comment line.
- Post-approval (Phase 2): one line —
  `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`.

### 6. Compliance audit pass

A read-only audit producing a short report + targeted fixes only:
navigation completeness (no orphan/dead-end pages), presence of legal pages in
nav + sitemap, YMYL disclaimers, mobile (already optimized), and confirmation
of no prohibited content. Out-of-scope refactors are not done.

---

## Phase 2 — After approval (separate cycle, not built now)

- `<AdSlot>` component: loads `adsbygoogle` once, **reserves height to avoid
  CLS**, responsive, consent-aware, renders nothing when `ADSENSE_PUB_ID` is
  empty.
- Manual placements on high-traffic content pages only (cotizacion, guías,
  blog, dolar-hoy) between sections, respecting ad-density policy. **Not** on
  thin/utility/error/auth pages.
- Populate `ads.txt` with the real publisher line.

---

## Testing strategy

**Unit (TDD):**
- Consent-state → gtag-consent-params pure mapping (granted/denied/partial).
- Consent persistence read/write (cookie serialize/parse).
- i18n: required legal keys present in all three locales.

**Integration / route:**
- `/privacidad`, `/terminos`, `/contacto` render with correct meta and are
  reachable from the footer.
- Sitemap output includes the three legal routes.

**E2E (Playwright):**
- Banner appears on first visit; Aceptar flips gtag consent to granted and
  hides the banner; Rechazar keeps denied; choice persists across reload;
  footer "Configurar cookies" re-opens it.

## Out of scope (YAGNI)

- Auto Ads (start with manual slots in Phase 2).
- Third-party CMP (Cookiebot etc.).
- Contact form + email backend.
- IAB TCF v2.2 string handling — Google's certified CMP covers EEA later via
  the AdSense console toggle.

## Open items

- None blocking. Real `ca-pub` ID and the `ads.txt` publisher line are filled
  in once the AdSense account is created / approved.

## Files touched (Phase 1, anticipated)

- `app/pages/privacidad.vue`, `app/pages/terminos.vue`, `app/pages/contacto.vue` (new)
- `app/components/Footer.vue` (legal links)
- `app/components/CookieConsent.vue` (new)
- consent + gtag wiring: plugin under `app/plugins/` and `app/nuxt.config.ts`
- `app/public/ads.txt` (new) or server route
- `app/server/api/__sitemap__/urls.get.ts` (add legal routes)
- `app/i18n/locales/json/{es,en,pt}.json` (legal + consent + footer keys)
- unit/e2e tests under `app/tests/`
