---
name: Cambio Uruguay
description: A dark-first, evidence-led interface for understanding Uruguay's exchange market.
colors:
  midnight-canvas: "#0a0e1a"
  navy-surface: "#121a2e"
  paper-canvas: "#f6f7f9"
  paper-surface: "#ffffff"
  white: "#ffffff"
  action-blue: "#1976d2"
  link-sky: "#64b5f6"
  ink-blue: "#1565c0"
  accent-blue: "#448aff"
  amber-signal: "#ff8f00"
  amber-deep: "#ff6f00"
  teal-context: "#26a69a"
  teal-deep: "#00897b"
  success-green: "#00e676"
  light-success: "#2e7d32"
  warning-amber: "#ffc107"
  error-orange: "#dd2c00"
  light-error: "#bf360c"
  sentiment-positive: "#35d07f"
  sentiment-neutral: "#7d8aa3"
  sentiment-negative: "#ff655d"
typography:
  display:
    fontFamily: "Open Sans, sans-serif"
    fontSize: "clamp(1.55rem, 4.4vw, 2.5rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  content-title:
    fontFamily: "Open Sans, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 2.125rem)"
    fontWeight: 300
    lineHeight: 1.14
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Open Sans, sans-serif"
    fontSize: "clamp(1.35rem, 3vw, 1.75rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Open Sans, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 500
    lineHeight: 1.6
    letterSpacing: "0.0125em"
  body:
    fontFamily: "Open Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.03125em"
  label:
    fontFamily: "Open Sans, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.0333em"
  eyebrow:
    fontFamily: "Open Sans, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.18em"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.action-blue}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    padding: "0 20px"
    height: "40px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.link-sky}"
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    padding: "0 16px"
    height: "40px"
  card:
    backgroundColor: "{colors.navy-surface}"
    textColor: "{colors.white}"
    rounded: "{rounded.lg}"
    padding: "24px"
  card-compact:
    backgroundColor: "{colors.navy-surface}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
    padding: "16px"
  input:
    backgroundColor: "{colors.navy-surface}"
    textColor: "{colors.white}"
    rounded: "{rounded.xs}"
    padding: "0 16px"
    height: "48px"
  chip:
    backgroundColor: "{colors.action-blue}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "32px"
  eyebrow:
    backgroundColor: "transparent"
    textColor: "{colors.link-sky}"
    typography: "{typography.eyebrow}"
---

# Design System: Cambio Uruguay

## Overview

**Creative North Star: "La Mesa de Mercado"**

Cambio Uruguay feels like a well-run market desk after dark: many live signals, one calm frame, and
no ambiguity about what is actionable. Deep navy surfaces establish continuity while blue, amber,
teal, green, and orange communicate roles rather than decorate.

The system is information-dense but never cramped. Familiar Material controls, generous container
spacing, short transitions, and visible provenance make complex financial content easy to scan on a
phone moments before a decision.

The implementation is Vuetify 4 running a restored Material 2 look: the v3 type ramp, elevation
scale, and uppercase button/overline casing are pinned back in `app/assets/variables.scss` and
`app/assets/css/legacy-vuetify.css`. Theme tokens come from a two-theme Vuetify definition
(`app/plugins/vuetify.ts`); dark is the SSR default and `useThemeMode` swaps to the persisted or
system preference after hydration.

**Key Characteristics:**

- Dark-first, with a fully usable light counterpart rather than an inverted afterthought.
- Evidence and freshness stay close to every comparison or recommendation.
- Color carries meaning; hierarchy comes from type, spacing, and tonal layering.
- Responsive layouts recompose instead of merely shrinking.
- Motion acknowledges state changes without delaying access to content.
- Every token has a light-theme counterpart chosen for contrast, not for symmetry.

## Colors

The palette combines a midnight financial canvas with cool blue actions and semantically reserved
signal colors. Each semantic role is defined twice — the light theme deepens the hue rather than
reusing the dark one, because the same swatch cannot clear 4.5:1 on both `#0a0e1a` and `#ffffff`.

### Primary

- **Action Blue** (`#1976d2`): The main action, active navigation, selected state, focus ring, and
  the skip link. Identical in both themes.
- **Link Sky** (`#64b5f6`): Anchors, small blue labels, and kickers on dark surfaces.
- **Ink Blue** (`#1565c0`): The light theme's `link` token. Small bold blue text (12–14px kickers,
  channel labels, "from" prices) must use the link token, not Action Blue — Action Blue measures
  ~4.2:1 at 12px on tinted panels.
- **Accent Blue** (`#448aff`): The light theme's `accent`; reserved for rare emphasis, not actions.

### Secondary

- **Amber Signal** (`#ff8f00`) / **Amber Deep** (`#ff6f00`): Rankings, attention markers, ruler
  ticks, and secondary emphasis. Amber Deep is the light-theme `secondary`.
- **Teal Context** (`#26a69a`) / **Teal Deep** (`#00897b`): Supporting information and contextual
  data that is neither success nor warning. Teal Deep is the light-theme `info`.

### Tertiary

- **Success Green** (`#00e676`) / **Light Success** (`#2e7d32`), **Warning Amber** (`#ffc107`),
  **Error Orange** (`#dd2c00`) / **Light Error** (`#bf360c`): Status colors, always with a label or
  icon. The light variants exist because `deepOrange darken-1` (3.47:1) and `green darken-2`
  (4.11:1) both failed on the `/estado` status chips.
- **Sentiment Positive / Neutral / Negative** (`#35d07f`, `#7d8aa3`, `#ff655d`): the three-way
  opinion split on Reddit-mined pages. These are **fill** colors for distribution bars and dots. As
  text they must be mixed toward the surface ink — `color-mix(in srgb, var(--tone) 45%,
  rgb(var(--v-theme-on-surface)))` — because the raw hues measure 2.0–2.9:1 on white.

### Neutral

- **Midnight Canvas** (`#0a0e1a`): The dark application background.
- **Navy Surface** (`#121a2e`): Cards, menus, fields, and elevated dark surfaces.
- **Paper Canvas** (`#f6f7f9`) and **Paper Surface** (`#ffffff`): The light theme's background and
  content surfaces.
- **White** (`#ffffff`): Primary dark-theme text and text on strong filled actions.
- Muted dark text is drawn from the canvas ramps (`#b3bdcc`, `#b5bdc9`, `#818da0`), not from grey.

### Named Rules

**The Signal Has a Job Rule.** Saturated colors must communicate action, selection, tier, or status;
large decorative color fields are reserved for authored feature surfaces.

**The Paired Contrast Rule.** Every colored surface must be checked in both themes; permanent dark
slabs use the shared `.on-dark` treatment.

**The Link Token Rule.** Blue text below 16px uses `rgb(var(--v-theme-link))`. `--v-theme-primary`
is for fills, strokes, and focus rings — as small text on a tinted panel it fails AA.

**The Ramp Not Grey Rule.** Secondary text on a colored surface is tinted from that surface's own
hue ramp. A grey (`#9e9e9e`, `#757575`) on either canvas fails AA and is remapped away globally in
`critical.css`.

## Typography

**Display Font:** Open Sans (sans-serif fallback)
**Body Font:** Open Sans (sans-serif fallback)

**Character:** A single workhorse family keeps rates, labels, tools, and long-form explanations in
the same practical voice. Hierarchy relies on weight, scale, measure, and rhythm — not decorative
font switching.

### Hierarchy

- **Display** (800, `clamp(1.55rem, 4.4vw, 2.5rem)`, 1.1, -0.02em, `text-wrap: balance`): the page
  thesis. This is the `.hero-title` idiom shared by the landing heroes; the tracking tightens as the
  size grows.
- **Content Title** (300, `clamp(1.5rem, 3vw, 2.125rem)`, 1.14, -0.02em, `text-wrap: balance`): a
  heading whose text is *content* rather than a written label — a product name, a full sentence, a
  question. It is capped below Display because its length is not ours to control: the same rule at
  Display size turned a 62-character section heading into four lines and a quarter of the viewport.
  Pair it with a measure of 24–28ch so it breaks at two lines, never four.
- **Headline** (700, `clamp(1.35rem, 3vw, 1.75rem)`, 1.2): major section openings inside a page.
- **Title** (500, 1.25rem, 1.6): card, tool, and dialog titles. Matches Vuetify `text-h6`.
- **Body** (400, 1rem, 1.5): reading text; prose stays within 65–75ch.
- **Label** (700, 0.75rem, 0.0333em): metadata, compact controls, status labels, table meta.
- **Eyebrow** (700, 0.75rem, 0.18em, uppercase): the small colored kicker above a display heading or
  a section title. One per section at most.

Vuetify's Material 2 ramp (`text-h1` 6rem … `text-overline` 0.75rem) remains available for stock
components; authored page surfaces use the roles above.

### Named Rules

**The Number Breathes Rule.** Important rates and scores get surrounding quiet and tabular
alignment (`font-variant-numeric: tabular-nums`); they are not crowded with competing labels.

**The Four Steps Rule.** Dense data surfaces get four micro sizes and no more: 0.75rem (label),
0.8rem (meta), 0.875rem (list text), 0.95rem (secondary body). Nothing renders below 0.75rem. A
page that grows a fifth step is drifting, not designing.

**The One Eyebrow Rule.** A kicker marks a section that earns one. An eyebrow above every block is
grammar nobody chose.

## Layout

Content sits in a single centred column: `.container_custom` caps the page at **1280px** with 12px
gutters, and full-bleed routes (home, `/mapa`, `/sucursales`, `/avanzado`) opt out by route class
rather than by page-local CSS. The app bar is fixed; `VMain` reserves 64px (56px under 768px).

Breakpoints are pinned to the Vuetify 3 thresholds in **both** `useDisplay()` and
`$grid-breakpoints` — xs 0, sm 600px, md 960px, lg 1280px, xl 1920px, xxl 2560px — so JS reflow and
CSS reflow happen at the same width. Vuetify 4's narrower defaults (md 840, lg 1145) are explicitly
overridden; keep the two lists in sync.

Spacing runs on a 4/8/16/24/40px rhythm. Desktop can support side rails, sticky markers, wide
comparison regions, and dense controls; mobile reorders the same evidence into one readable column
with 44px-or-larger interactive targets. Wide tables either use Vuetify's native `:mobile` mode or
the `cu-mobile-cards` contract: put the class on the table, give every `<td>` a `data-label`, and
below 600px each row stacks into a labelled card.

### Named Rules

**The Min-Width Zero Rule.** Any grid or flex item that can contain an image, a long thread title,
or a URL carries `min-width: 0`. Without it the item's min-content floor silently widens the whole
row past the viewport — the single most common responsive defect in this codebase.

## Elevation & Depth

Depth is a hybrid of tonal layering and restrained Material 2 elevation. Most surfaces separate
through navy-on-midnight or white-on-paper contrast; shadows identify menus, dialogs, interactive
hover states, and transient layers rather than decorating every card. The full `.elevation-0`…`-24`
scale is restored in `legacy-vuetify.css`, so stock Vuetify components keep their MD2 shadows.

### Shadow Vocabulary

- **Quiet Lift** (`0 6px 16px rgba(0, 0, 0, 0.35)` dark / `0 6px 16px rgba(0, 0, 0, 0.15)` light):
  interactive cards and compact menus, paired with a −3px `translateY` on hover.
- **Overlay Depth** (`0 16px 40px rgba(0, 0, 0, 0.32)`): dark menus and dialogs; light mode uses a
  softer `rgba(20, 25, 40, 0.14)`.
- **Feature Cast** (`16px 24px 48px rgba(0, 0, 0, 0.28)`): the offset cast under an authored feature
  panel that sits on a dark slab.

### Named Rules

**The Flat Until Needed Rule.** Content cards are tonal at rest. Depth arrives when a surface can be
opened, moved, selected, or hovered.

**The Offset And Blur Rule.** Every shadow carries both an offset and a blur. A zero-offset colored
halo is decoration, not depth.

## Shapes

Gently curved rectangular surfaces on a five-step scale: **4px** for stock Vuetify controls, **8px**
for compact records and list rows, **12px** for cards and inner panels (the most-used radius in the
codebase), **16px** for feature surfaces, hero slabs, and dialogs. Pills (`999px`) are reserved for
chips, filters, tier badges, and status dots; circles (`50%`) for icon-only actions and dots.

Earlier surfaces also use 10px and 14px; those are the legacy midpoints. Round new work to the
nearest scale step rather than adding a sixth. Borders are one-pixel, quiet, and theme-aware
(`rgba(var(--v-border-color), var(--v-border-opacity))`), never a thick colored edge.

### Named Rules

**The No Side Tab Rule.** A card, list item, or callout never carries a colored border above 1px on
one side. State goes in a labelled chip, not in a stripe.

## Components

### Buttons

- **Shape:** Compact Vuetify controls (4px radius) with at least a 40px visual height.
- **Primary:** Action Blue, white text, a clear verb, uppercase (`.v-btn` casing is restored) at
  weight 600.
- **Hover / Focus:** 150–200ms tonal or lift response; `:focus-visible` always shows the 2px Action
  Blue outline with a 2px offset from `critical.css`.
- **Ghost:** Transparent, using the theme's accessible link blue.

### Chips

- **Style:** Pill-shaped, concise, and semantic; filled for selected states, quiet tonal treatments
  for metadata. Weight 600.
- **State:** Never use hue alone — retain text, icon, or tier letter.

### Cards / Containers

- **Corner Style:** 16px for feature surfaces, 12px for cards and inner panels, 8px for compact
  records.
- **Background:** Navy Surface in dark mode, Paper Surface in light mode.
- **Shadow Strategy:** Tonal by default, Quiet Lift for interactive cards.
- **Border:** One-pixel low-contrast border when adjacent surfaces would otherwise merge.
- **Internal Padding:** 16px compact, 24px standard, 32–40px for feature surfaces.

### Inputs / Fields

- **Style:** Filled or outlined Vuetify fields with explicit labels; 48px tall.
- **Focus:** Primary-color stroke plus the global focus-visible outline.
- **Error / Disabled:** Semantic color plus readable copy; light-theme labels, hints, and messages
  are forced to `rgba(0, 0, 0, 0.6)` at full opacity so Vuetify's emphasis multiplier cannot wash
  them below AA.

### Navigation

Medium-weight Open Sans, rounded active regions, short tonal transitions. Desktop exposes broad
wayfinding in the app bar and mega menu; mobile consolidates the same source of truth into a drawer
built from `utils/siteNav.ts`, so a route can never exist in one and be missing from the other. A
skip link is the first focusable element on every page.

### Permanently Dark Slab (`.on-dark`)

Used on 27 pages. A hero or feature slab whose dark/colored background does **not** flip with the
theme is tagged `.on-dark` on its root; a global block in `critical.css` then keeps its descendant
text light in the light theme, overriding the grey/`text-white` remaps that would otherwise darken
text onto a dark surface. Marking the slab is the contract — nothing else is needed.

### Evidence Card

Evidence cards bind a result to sample size, date, provenance, and a direct source link. The score
may lead visually, but its method and uncertainty remain one gesture away. Sentiment is carried by a
labelled tone tag (dot + word), never by hue alone.

### Share Row

`ShareButtons` closes 41 pages: a single row of share targets in the page's own voice, placed with
the closing call to action rather than floating over the content.

## Do's and Don'ts

### Do:

- **Do** keep source, freshness, and uncertainty adjacent to consequential rankings.
- **Do** compose a distinct mobile reading order rather than scale down a desktop grid.
- **Do** use shared Vuetify semantics and the existing theme tokens for controls and states.
- **Do** preserve readable content and meaning when reduced motion is requested — the global
  `prefers-reduced-motion` block already flattens durations; do not fight it.
- **Do** put `min-width: 0` on grid and flex items that can hold media or long unbroken strings.
- **Do** register every new route in `utils/siteNav.ts` so nav, sitemap, search, and the command
  palette stay in agreement.

### Don't:

- **Don't** add a second generic stylesheet or import `vuetify/styles`.
- **Don't** use glass, glow, gradients, or icon tiles as substitutes for authored information.
- **Don't** make permanently dark sections depend on dark-theme inheritance.
- **Don't** hide a ranking's sample size or present AI prose as the underlying measurement.
- **Don't** use `--v-theme-primary` for small blue text, or a raw sentiment hue for any text.
- **Don't** invent a sixth radius step or a fifth micro type size for one surface.
