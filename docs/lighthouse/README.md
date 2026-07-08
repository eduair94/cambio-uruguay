# Lighthouse — home page (`/`)

Run against a **production preview** (not the dev server, which is unrepresentative):

```bash
cd app
npm run build
PORT=3313 HOST=127.0.0.1 node .output/server/index.mjs &   # serve the built output
npm run lighthouse                                          # writes docs/lighthouse/home.report.{html,json}
# desktop preset:
npx lighthouse http://127.0.0.1:3313/ --preset=desktop --output=html --output-path=../docs/lighthouse/home-desktop
```

## Baseline — 2026-06-21 (this branch)

| Category | Mobile | Desktop |
| --- | --- | --- |
| Performance | 42 | 79 |
| Accessibility | 85 | 85 |
| Best practices | 96 | 100 |
| SEO | 92 | 92 |

Reports: [`home-mobile.report.html`](home-mobile.report.html), [`home-desktop.report.html`](home-desktop.report.html).

## Notes on the remaining gaps

- **Performance (mobile 42 / desktop 79).** Dominated by the Vuetify + chart bundle
  and the live-rate hydration on the hero converter — a known ceiling for this
  stack (see the `frontend-seo-perf` project memory). The engagement work added
  this branch is CSS-only (scroll-reveal, count-up, theme cross-fade) with no JS
  library, so it does not move performance.
- **Accessibility (85).** The failing audits are all inside Vuetify component
  internals on the hero converter:
  - `aria-required-attr` / `aria-input-field-name` — the `VAutocomplete` /
    `VSelect` `role="combobox"`/`role="listbox"` markup.
  - `aria-tooltip-name` — empty `role="tooltip"` overlays rendered by `VTooltip`.
  This branch's own additions are clean: a skip-to-content link, a visible
  `:focus-visible` ring, `#main` landmark target, and `aria-label`s on the new
  icon buttons (the theme toggle uses a native `title` instead of `VTooltip` to
  avoid adding an empty tooltip node). Score is unchanged from the documented
  pre-existing ceiling — no regression.
- **SEO (92).** `link-text` (a non-descriptive/icon-only link) is the lone gap;
  pre-existing.

The accessibility ceiling is structural to Vuetify's form components; lifting it
would require overriding that markup, which is out of scope for this change.
