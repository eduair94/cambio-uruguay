# Trustpilot review carousel + open-source ecosystem strip

**Date:** 2026-07-10
**Status:** Approved, ready for implementation plan
**Scope:** Home page (`app/pages/index.vue`) — two new sections

## Problem

The home page has no visitor-voiced social proof. `TrustBar.vue` links to Trustpilot but shows no reviews. There is also no surface pointing at the project's open-source assets (GitHub repo, npm MCP package, public API), which are real credibility signals for a small independent tool.

## Facts established during design (verified 2026-07-09/10)

### The review data

Fetched live from `https://trustpilot.checkleaked.com/?domain=cambio-uruguay.com`, then confirmed in a real browser:

| Date | Stars | Title | Body |
|---|---|---|---|
| Oct 21, 2024 | 4★ | Soy nueva | "Soy nueva , hola 👋 😏" |
| Jan 30, 2023 | 5★ | Excelente app. | "Excelente app." |
| Jan 30, 2023 | 5★ | Recomiendo! | "Recomiendo!" |
| Jan 29, 2023 | 5★ | Muy buena app | "Muy buena app, recomiendo" |
| Jan 29, 2023 | 5★ | Ya no pierdo más dinero! | "Ya no pierdo más dinero!" |

Trustpilot's public **TrustScore is 3.8**, while the arithmetic mean of these five reviews is **4.8**. The gap is Trustpilot's time-weighted, bayesian TrustScore formula — four of five reviews are over two years old. The 3.8 is an *age* artifact, not a quality signal, and it is not a number worth surfacing on the home page.

### What the widget service actually supports

`trustpilot-iframe-widget@1.0.2` documents a `rating` (minimum-rating filter) and `sort` option. **Both are no-ops** against `trustpilot.checkleaked.com`, verified by probing:

| Param | Honored? | Evidence |
|---|---|---|
| `hideTopBanner` | yes | browser: no banner rendered |
| `hideGlobalReviews` | yes | browser: no "3.8" rendered |
| `maxReviews` | yes | browser: `1 / 5` … `5 / 5` groups |
| `theme`, `showDate`, `showAvatar` | yes | |
| **`rating`** | **no** | `?rating=5` and `?rating=1` return byte-identical pages (33434 B), both containing all five reviews |
| **`sort=rating`** | **no** | ordering unchanged; the 4★ review still renders first |

Consequence: the 4★ "Soy nueva" review **cannot be excluded** by configuration. Because the default sort is `latest` and that review is the newest, `maxReviews: 4` would drop "Ya no pierdo más dinero!" and *keep* the junk one — strictly worse. So we show all five.

This is a genuine bug in a package the repo owner publishes. Fixing `rating`/`sort` upstream in `eduair94/trustpilot-carrousel` is worthwhile, but is **out of scope for this change** and must not block it.

### Third-party mentions

**Zero external editorial mentions exist today:**

| Channel | Status (verified) |
|---|---|
| `punkpeye/awesome-mcp-servers` PR #9525 | OPEN, not merged |
| Glama MCP directory | 404 |
| Official MCP Registry (`search=cambio`) | 0 servers |
| npm `cambio-uruguay-mcp` | live, 156 downloads/month |

An "As featured in" strip would therefore be dishonest and is out of scope. The second section is framed as **"Open source & ecosystem"** — our own published assets, labelled as ours.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Review presentation | All 5 reviews. `hideGlobalReviews: true`, `hideTopBanner: true` | No "3.8" surfaced. The 4★ entry can't be filtered out, and it is positive and harmless — just noise. Zero curation, nothing hidden that reflects badly. |
| Integration | npm package, vanilla class, mounted client-side | Dogfoods our own package; gets auto-resize via iframe-resizer. No CDN script tag. |
| Second section | "Open source & ecosystem" strip | Honest. No "featured in" claim until a real mention exists. |
| Placement | Reviews after `how-it-works`; ecosystem between `internal-links` and footer | Social proof lands after the visitor understands the product; outbound links sit where outbound links belong. |
| Review CTA | "Write a review" + "See all reviews" | The only way the 5-review baseline and the age-decayed 3.8 ever improve. |
| Structured data | **None** | Google disallows self-serving `aggregateRating` markup on your own site (2019 policy). Risks a manual action, and 3.8 is not a number to surface in a SERP. |

## Architecture

### New files

| File | Responsibility | Depends on |
|---|---|---|
| `app/utils/trustpilot.ts` | Pure `buildWidgetConfig(opts)` → widget config object. No DOM, no import of the widget package. | nothing |
| `app/utils/ecosystem.ts` | Typed `EcosystemLink[]`, single source of truth for the strip. | nothing |
| `app/components/TrustpilotReviews.vue` | Section shell: heading, lazily-mounted widget, two CTAs, failure hiding. | `trustpilot.ts`, `useThemeMode`, `IntersectionWrapper` |
| `app/components/EcosystemStrip.vue` | Renders `ecosystem.ts` as a link row. | `ecosystem.ts` |

### Modified files

- `app/pages/index.vue` — two section inserts.
- `app/i18n/locales/json/{en,es,pt}.json` — new `reviews.*` and `ecosystem.*` keys.
- `app/package.json` — add `trustpilot-iframe-widget@^1.0.2`.

### `app/utils/trustpilot.ts`

```ts
export const TRUSTPILOT_DOMAIN = 'cambio-uruguay.com'
export const TRUSTPILOT_PROFILE_URL = `https://www.trustpilot.com/review/${TRUSTPILOT_DOMAIN}`
export const TRUSTPILOT_REVIEW_URL = `https://www.trustpilot.com/evaluate/${TRUSTPILOT_DOMAIN}`

export interface WidgetOpts {
  theme: 'light' | 'dark'
  reducedMotion: boolean
}

export function buildWidgetConfig(opts: WidgetOpts) { /* ... */ }
```

Returned config, fixed:

- `domain: TRUSTPILOT_DOMAIN`
- `hideGlobalReviews: true`, `hideTopBanner: true` — no "3.8" anywhere
- `maxReviews: 5` — all reviews; do **not** set `rating` (no-op) or truncate
- `showRating: true`, `showDate: true`, `showAvatar: true`, `showReply: false`
- `theme: opts.theme`
- `autoplay: !opts.reducedMotion`, `interval: 6000`
- `height: 320`

Do not add a `rating` key even "for future-proofing" — it silently does nothing and would mislead the next reader. Add it when upstream implements it.

### `TrustpilotReviews.vue` — data flow

```
<section v-if="!failed">
  heading + subtitle (real, indexable text)
  IntersectionWrapper (rootMargin: 200px, showPlaceholder)
    └─ ClientOnly
         └─ <div ref="mount"> reserved min-height: 320px
  CTA row: "Write a review" | "See all reviews"
</section>
```

- `onMounted` → dynamic `import('trustpilot-iframe-widget')`, then `createTrustpilotWidget({ target: mount, ...buildWidgetConfig({ theme: applied, reducedMotion }), onReady, onError })`.
- `watch(applied)` (from `useThemeMode()`) → `widget.updateConfig({ theme })`, so the carousel follows the site's dark/light toggle.
- `onBeforeUnmount` → `widget.destroy()`.
- Reserved `min-height` on the mount div → zero CLS.
- The iframe is only constructed once the section scrolls into view, so it costs nothing on LCP or the home-page Lighthouse run.

The iframe already renders its own "Powered by Trustpilot" link to the public profile. Our "See all reviews" CTA is still worth having outside the frame, where it is styled and tracked.

Outbound CTA clicks are already captured by the global `track-clicks` plugin. No new analytics code.

### `app/utils/ecosystem.ts`

```ts
export interface EcosystemLink {
  id: string          // stable key + i18n key suffix
  url: string         // absolute https, or an internal path resolved via localePath
  icon: string        // mdi-*
  internal?: boolean  // true → localePath(), no target=_blank
}
```

Entries (all verified live):

| id | url | note |
|---|---|---|
| `github` | `https://github.com/eduair94/cambio-uruguay` | 200 |
| `npm` | `https://www.npmjs.com/package/cambio-uruguay-mcp` | live, 156 dl/mo |
| `mcp` | `https://mcp.cambio-uruguay.com` | `/health` → 200 |
| `api` | `/desarrolladores` (internal) | canonical dev entry. **Do not link `/api-reference`** — it is robots-disallowed to avoid duplicate-content indexing |
| `medium-es` | `https://cambio-uruguay.medium.com/c%C3%B3mo-saber-el-mejor-precio-del-d%C3%B3lar-en-uruguay-hoy-sin-recorrer-casas-de-cambio-27d3669d3839` | |
| `medium-en` | `https://cambio-uruguay.medium.com/currency-exchange-in-uruguay-how-to-find-the-best-rate-before-you-trade-3a5fd46e3fc4` | |

External links render `target="_blank" rel="noopener noreferrer"`. The internal one uses `localePath()`.

Adding a genuine third-party mention later means appending one object. Splitting the strip into "ours" vs "featured in" is a follow-up, not this change.

## Error handling

The widget is hosted on third-party infrastructure. The section must never degrade into a broken or empty box.

- `onError` → `failed = true` → `v-if` removes the **entire section**, heading included.
- No `onReady` within **8 seconds** → same hide path. Covers ad-blockers, DNS failure, and `trustpilot.checkleaked.com` being down.
- Between mount and ready → skeleton placeholder at the reserved height.
- `widget.destroy()` on unmount; the 8s timer is cleared on both `onReady` and unmount.

`EcosystemStrip` has no runtime dependencies and cannot fail.

## Testing

**Unit — `app/tests/unit/trustpilot.test.ts`**
- `hideGlobalReviews === true` and `hideTopBanner === true`.
- Config has **no `rating` key** (documents the upstream no-op; fails loudly if someone re-adds it).
- `maxReviews === 5`.
- `autoplay === false` when `reducedMotion` is true, `true` otherwise.
- `theme` passes through unchanged for both `'light'` and `'dark'`.
- `TRUSTPILOT_REVIEW_URL` and `TRUSTPILOT_PROFILE_URL` point at the `cambio-uruguay.com` domain.

**Unit — `app/tests/unit/ecosystem.test.ts`**
- Every `id` is unique.
- Every external `url` starts with `https://`; every internal `url` starts with `/`.
- No entry points at `/api-reference` (robots-disallowed).
- Every `id` has a matching label key in `en.json`, `es.json` and `pt.json`.

**E2E — `app/tests/e2e/trustpilot.spec.ts`**
- Scroll to the reviews section; gate on hydration with `expect(...).toPass()` retries (per the import-cart lesson — never assert immediately after `goto`).
- The iframe's `src` contains `hideTopBanner=true` and `hideGlobalReviews=true`, and does **not** contain `rating=`.
- Both CTAs resolve to `trustpilot.com/evaluate/...` and `trustpilot.com/review/...`.
- Ecosystem links are present; external ones carry `target="_blank"` and `rel` containing `noopener`.

**Verification gates**

`npm run typecheck` is broken repo-wide (vue-tsc crash — see the `typecheck-broken` note). Gate on:

```
cd app && npm run lint && npm run test:unit && npm run test:e2e
```

Then `npm run lighthouse` on the home page and compare against the previous run — a regression in CLS or performance means the lazy mount or the reserved height is wrong.

## Risks and accepted tradeoffs

1. **The 4★ "Soy nueva , hola 👋 😏" review will rotate through the carousel.** It cannot be filtered (see above). It is positive and harmless, merely content-free. Accepted in exchange for zero curation.
2. **Reviews are stale.** The newest genuine one is January 2023, and the carousel shows dates. Mitigated only by the "Write a review" CTA.
3. **Five reviews is thin.** It reads as an honest small-site signal rather than a fabricated one.
4. **A third-party iframe on a Lighthouse-tuned page.** Bounded by lazy mount plus reserved height; re-measured before merge.
5. **`trustpilot.checkleaked.com` uptime becomes home-page uptime.** Mitigated by soft-failing the whole section.

## Follow-ups (separate tasks, not blocking)

- Implement `rating` and `sort` server-side in `eduair94/trustpilot-carrousel`, publish `1.0.3`, redeploy `trustpilot.checkleaked.com`. Then revisit whether to filter.
- Report the "Soy nueva" review to Trustpilot as content-free, if their policy allows.
- Revisit the "featured in" split once `punkpeye/awesome-mcp-servers` PR #9525 merges or the MCP registry indexes the server.

## Out of scope

- Any "As featured in" / press claim.
- `aggregateRating` or `Review` structured data.
- Review moderation, or an in-repo fix to the upstream widget.
- Automated discovery of new mentions.
