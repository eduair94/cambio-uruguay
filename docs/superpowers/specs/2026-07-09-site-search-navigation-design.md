# Navegación del sitio: command palette, IA unificada, /buscar y /mapa-del-sitio

**Fecha:** 2026-07-09  ·  **Estado:** aprobado

## Problem

cambio-uruguay has ~60 routes but three hand-maintained, already-drifted navigation surfaces (`primaryNav`/`moreNav` arrays and a separate 156-line hardcoded mobile drawer in `default.vue`, plus a flat 20-link `Footer.vue`), and a fourth hand-listed route set in the XML sitemap (`urls.get.ts`). The drift has produced:

- **True orphans** (no nav, no footer, and in two cases not even in the sitemap): `/preguntas-frecuentes`, `/por-que-sube-el-dolar`, `/dolar/records`.
- **Footer-only** (invisible on desktop nav, mobile drawer, and search): `/casas-de-cambio`, `/casa-de-cambio-cerca-de-mi`, `/couriers-uruguay`, `/prestamos-uruguay`, `/inversiones-uruguay`, `/desarrolladores`, `/newsletter`, `/privacidad`, `/terminos`, `/contacto`.
- **Hub-only long tail**: 14 `/herramientas/*` calculators, ~66 `/convertir/*`, 15 `/cotizacion/*`, ~60 `/glosario/*`, ~20 `/guias/*`, 3 `/indicadores/*`, 37+ `/casa/*` — reachable only by knowing the URL.
- **Desktop-only** (missing from the mobile drawer entirely): `/mapa`, `/estado`.
- **No site search at all**, and the `WebSite` JSON-LD `SearchAction` (in **two** places: `default.vue:460` and `index.vue:1930`) points at a dead `/avanzado?search=` target.

There is no mechanism preventing the *next* page from being orphaned the same way (`/por-que-sube-el-dolar` etc. got orphaned precisely by someone dropping a `.vue` and moving on).

## Goals / Non-goals

**Goals**

1. One typed **single source of truth** (`siteNav.ts`) that renders the desktop header, the desktop "Más" menu, the regenerated collapsible mobile drawer, the footer, `/mapa-del-sitio`, and seeds the search index — killing the four-way drift permanently.
2. A **command palette** (Ctrl/Cmd+K + a magnifier in the app-bar next to the hamburger, fullscreen on mobile) that searches static pages + all six catalogs + 37 casas + quick actions (theme, language, inline "100 usd" conversion), with zero new runtime dependencies.
3. A real **SSR `/buscar?q=`** route that renders the *same* results (indexable landing, `noindex` on result pages) and doubles as the pre-hydration fallback.
4. A new **`/mapa-del-sitio`** HTML hub giving every orphan/long-tail page a crawlable inbound link.
5. **Drift becomes a CI failure**: a unit test walks `app/pages/**` and fails if any route is neither in the source of truth, an explicit exclusion, nor a declared dynamic/catalog route.
6. **Zero every-page bundle regression** for the ~95% of sessions that never open search; correct WCAG-AA combobox a11y; correct behavior under SSR + `useLocalePath()` + `prefix_except_default` (EN/PT never break).
7. Fix **both** `SearchAction` JSON-LD blocks and make the **XML sitemap survive API failure**.

**Non-goals**

- No server-side/full-text search engine, no Algolia/Elastic, no fuse.js, no `@vueuse/core`.
- No bottom nav (D3 forbids). No changes to the 60 existing page bodies beyond `index.vue`'s one JSON-LD line.
- No fuzzy matching beyond a bounded (≤2) 0-hit "did you mean" pass; no synonym learning, no click/popularity weighting.
- No live casa-name overlay in the index (static names only; live rates stay on casa pages).
- Individual blog posts are **not** indexed by the palette/`/buscar` (see The search index).

## Information architecture

Seven sections. **Every** route is assigned to exactly one section (dynamic routes inherit their hub's section). One boolean flag `primary` decides the desktop inline bar; everything else is a projection.

| Section (`id`) | Routes | Rationale |
|---|---|---|
| **Cotización y mercado** (`market`) | `/` ᴾ, `/dolar-hoy` ᴾ, `/historico` ᴾ, `/comparar` ᴾ, `/avanzado`, `/por-que-sube-el-dolar` ⚠, `/dolar/records` ⚠ · *dyn:* `/historico/[origin]/[currency]/[[type]]`, `/dolar/[departamento]` | The live and historical dollar/market-movement cluster. |
| **Casas de cambio** (`houses`) | `/sucursales` ᴾ, `/mapa` ᴰ, `/casas-de-cambio` ᶠ, `/casa-de-cambio-cerca-de-mi` ᶠ, `/estado` ᴰ · *dyn:* `/casa/[origin]`, `/sucursales/[origin]/[[location]]` | Finding, comparing, locating, and checking the status of physical/rated houses. |
| **Conversores y herramientas** (`tools`) | `/herramientas` (+14 tool leaves), `/convertir`, `/cotizacion`, `/indicadores` · *dyn:* `/convertir/[slug]`, `/cotizacion/[moneda]`, `/indicadores/[indicador]` | "Compute a number" — calculators, amount/currency conversion, economic indicators. |
| **Guías y aprendizaje** (`learn`) | `/guias`, `/glosario`, `/blog`, `/noticias`, `/preguntas-frecuentes` ⚠ · *dyn:* `/guias/[slug]`, `/glosario/[termino]`, `/blog/[slug]` | Editorial/educational content. |
| **Servicios financieros** (`services`) | `/couriers-uruguay` ᶠ, `/prestamos-uruguay` ᶠ, `/inversiones-uruguay` ᶠ, `/retirar-efectivo-uruguay` | Adjacent money services/guides beyond pure FX. |
| **Datos y conexiones** (`connect`) | `/conectar`, `/desarrolladores` ᶠ, `/newsletter` ᶠ | API / MCP / bots / newsletter — programmatic + subscription channels. |
| **Sitio** (`site`) | `/acerca`, `/contacto` ᶠ, `/privacidad` ᶠ, `/terminos` ᶠ, `/mapa-del-sitio` 🆕, + externals (ko-fi, Twitter, LinkedIn) | Institutional/legal/meta + external links. |

ᴾ = `primary` (inline desktop bar) · ᴰ = was desktop-only · ᶠ = was footer-only · ⚠ = was a true orphan · 🆕 = new page.

**Excluded from all nav + search + XML sitemap** (`EXCLUDED_ROUTES`, asserted to be exactly this set): `/offline`, `/widget`, `/cuenta`.

**What changes in the "Más" dropdown.** The flat `moreNav` list is deleted and replaced by a **section-grouped** menu rendered from `NAV_SECTIONS`:

- **Stays inline (never in "Más")** — the primary 6, unchanged: `/`, `/dolar-hoy`, `/historico`, `/sucursales`, `/mapa`, `/comparar`.
- **Moves INTO the grouped "Más" menu + drawer + footer** (previously footer-only or orphaned, so previously *unreachable* from the desktop bar area): `/por-que-sube-el-dolar`, `/dolar/records`, `/preguntas-frecuentes`, `/casas-de-cambio`, `/casa-de-cambio-cerca-de-mi`, `/couriers-uruguay`, `/prestamos-uruguay`, `/inversiones-uruguay`, `/desarrolladores`, `/newsletter`, `/contacto`, `/privacidad`, `/terminos`, `/mapa-del-sitio`.
- **Moves OUT of every menu** (was cluttering nowhere, but must never enter a menu): the catalog **leaves** — 14 tool pages, 15 currency pages, ~66 convert pages, ~60 glossary terms, ~20 guides, 3 indicators, 37+ casas. These are reachable **only** via the palette/`/buscar` and `/mapa-del-sitio`. Nav surfaces list **hubs only**.

Nothing that was reachable becomes unreachable.

## Architecture

### Resolved contentions (where the panel split)

1. **Base skeleton → Design 1 (minimal surface).** Lowest file count, and its graceful-degradation anchor trigger is the exact thing Judges 1 and 3 told the other two designs to graft in; the other lenses are satisfied by targeted grafts, not by adopting a heavier base.
2. **Anti-drift → graft Design 2's filesystem-walking coverage test; reject its 18-file `nav/` registry + 3 composables.** The test is the value; the registry is the tax.
3. **A11y → graft Design 3's full combobox pattern, but render the listbox as plain `<ul role="listbox">/<li role="option">`, not Vuetify `VList`.** This removes the role/focus collision the a11y judge called Design 3's fatal flaw.
4. **Hydration → Design 1's real-anchor trigger; drop Design 3's document-level delegated-click plugin.** The anchor already wins the pre-hydration race by degrading to the SSR `/buscar` page, so the plugin's double-open footgun buys nothing.
5. **Bundle → Design 3's code-split (`LazySearchPalette` + dynamic `import()` of the index); reject Design 2's `useState`-serialize-the-index-into-every-page** (that taxes the 95% who never search).
6. **Index purity/parity → build the index as a pure function of `{locale, t}` with NO live rows and NO live casa-name overlay,** so the palette and `/buscar` corpora are identical by construction (kills the SSR/client divergence flagged in Design 3).
7. **Sitemap → graft Design 2's registry-derived `urls.get.ts` and move the static backbone OUTSIDE the try/catch** so an API failure can no longer zero the sitemap.
8. **SearchAction → fix BOTH JSON-LD blocks** (`default.vue:460` and `index.vue:1930`) — the SEO judge's non-negotiable that all three designs missed.
9. **Blog → hub-only in search; individual posts reachable via `/blog` + the XML sitemap.** Posts are runtime-generated server-fs content, already crawlable, and not orphans; indexing them would force a server route and break client parity.
10. **Composable → none.** Open-state is one `ref` in the layout; Design 2's three composables were indirection with single consumers.

### Module map

| File | New/Modified | Purpose | Public API |
|---|---|---|---|
| `app/utils/siteNav.ts` | **New** (light lane — no catalog imports) | IA taxonomy + the pure scorer. Imported on every page by the header/drawer/footer/trigger; cheap. | `NAV_SECTIONS: readonly NavSection[]`; `EXCLUDED_ROUTES`, `DYNAMIC_ROUTE_KEYS`, `POPULAR` (curated empty-state suggestions); `interface NavEntry {to?;href?;labelKey;icon;primary?;exact?;keywords?}`; `interface NavSection {id;titleKey;entries}`; `navLabel(e, t)`; `navToDocs(t, locale): SearchDoc[]`; types `SearchDoc`/`SearchResult`/`SearchType`; `fold(s)`, `tokenize(q)`, `levenshtein(a,b,max)`, `scoreDocs(query, docs): SearchResult[]` |
| `app/utils/searchIndex.ts` | **New** (heavy lane — imports catalogs) | Assembles `navToDocs()` + all six catalogs + casas into `SearchDoc[]`; owns the numeric parser. Imported only by `SearchPalette` (dynamic), `buscar.vue`, `mapa-del-sitio.vue`. | `buildSearchIndex(ctx: {locale; t}): SearchDoc[]`; `parseAmountQuery(q): AmountHit \| null`; `interface AmountHit {amount;from;to;slug;navTo;title;prebaked}`; `parseEsNumber(s): number \| null`; `CURRENCY_ALIASES` |
| `app/components/SearchPalette.vue` | **New** (loaded as `LazySearchPalette`, wrapped in `ClientOnly`) | The palette dialog. Static-imports only light deps (scorer, `convert.ts`, `SearchResults`); dynamic-imports `searchIndex.ts` on first open. Owns no global state. | props: `modelValue: boolean`; emits `update:modelValue` |
| `app/components/SearchResults.vue` | **New** | The ONE results renderer shared by palette and `/buscar` (prevents markup/label drift). | props: `{groups; activeId?; mode: 'listbox' \| 'links'; query}`; emits `('select', doc)`, `('activate', id)` |
| `app/pages/buscar.vue` | **New** | SSR indexable search route; runs the SAME `buildSearchIndex + scoreDocs` server-side; pre-hydration fallback target. | reads `useRoute().query.q` |
| `app/pages/mapa-del-sitio.vue` | **New** | HTML sitemap hub: `NAV_SECTIONS` skeleton + catalog long-tail + casas, all `localePath` anchors. | — |
| `app/layouts/default.vue` | **Modified** | Delete `primaryNav`/`moreNav`/the 156-line drawer block; render header + grouped "Más" + collapsible drawer from `NAV_SECTIONS`. Add both magnifier triggers, `paletteOpen` ref, Ctrl+K/`/` listeners, mount `LazySearchPalette`. Fix JSON-LD line 460. | — |
| `app/components/Footer.vue` | **Modified** | Replace the flat 20-link block with a `v-for` over `NAV_SECTIONS`; social/icon row unchanged; add `/mapa-del-sitio`. | — |
| `app/pages/index.vue` | **Modified** | Fix the second `SearchAction` `urlTemplate` at **line 1930**. | — |
| `app/server/api/__sitemap__/urls.get.ts` | **Modified** | Derive the static-route backbone from `siteNav.ts`; emit it **outside** the try/catch so API failure no longer returns `[]`. | returns `{loc,...}[]` (shape unchanged) |
| `app/plugins/vuetify.ts` | **Modified** | Register `VListGroup` + `VListSubheader` (collapsible drawer sections + grouped "Más" subheaders). | — |
| `app/i18n/locales/json/{es,en,pt}.json` | **Modified** | Add `search.*` namespace + `nav.*` label keys; retire every `raw:true` literal. | — |

No composable, no store, no Pinia. Open-state = `const paletteOpen = ref(false)` in `default.vue`.

### Data flow

Two lanes, one scorer.

- **Lane A (every page, cheap):** `siteNav.ts::NAV_SECTIONS` → `default.vue` (header + "Más" + drawer), `Footer.vue`, `mapa-del-sitio.vue`. No catalog code enters the layout/entry bundle. `siteNav.ts` also carries the pure scorer (small).
- **Lane B (search only, code-split):** the six catalog modules + `CASAS_REPUTATION` → `searchIndex.ts::buildSearchIndex({locale, t})` → `SearchDoc[]` with folded haystacks precomputed once.

The query path is shared **verbatim** by both consumers:

```
buildSearchIndex({locale, t})  →  SearchDoc[]        (identical array in palette & /buscar)
scoreDocs(query, docs)         →  SearchResult[]     (same tiered pass + 0-hit Levenshtein)
```

- **Palette (client):** `LazySearchPalette` dynamic-imports `searchIndex.ts` on first open, builds the index once (memoized in a `computed`), and runs `scoreDocs` per keystroke over the in-memory array. `parseAmountQuery(q)` runs first and, on a hit, prepends a synthetic convert row (with an optional live preview from `useExchangeRates()`).
- **`/buscar` (SSR):** imports the same `buildSearchIndex + scoreDocs` **statically**, runs them during SSR over `route.query.q`, and renders `SearchResults` as real anchors into the HTML. Because both call the identical pure functions with a `{locale, t}`-only context, the palette and `/buscar` return **the same results by construction** — `/buscar` is the palette's server-rendered twin. The palette's "ver todos los resultados" simply deep-links to `localePath('/buscar') + ?q=`.

`buildSearchIndex` takes **no `rows` argument**: casas seed from static `CASAS_REPUTATION` in both surfaces, so scoring corpus + routes are byte-identical server/client. The only place live data touches search is the numeric quick-action's inline preview number (palette-only, best-effort), which never changes which results appear.

## The search index

`SearchDoc` (in `siteNav.ts`, so both lanes share the type):

```ts
export type SearchType =
  | 'page' | 'tool' | 'currency' | 'convert'
  | 'glossary' | 'guide' | 'indicator' | 'casa' | 'action'

export interface SearchDoc {
  id: string                 // stable unique key: 'page:/historico', 'tool:calculadora-iva', 'casa:brou'
  type: SearchType
  section: string            // NAV_SECTIONS id
  title: string              // localized for page/action; ES for catalog content
  description: string        // one-line snippet, may be ''
  icon: string               // MDI name
  to?: string                // internal route, PRE-localePath (e.g. '/glosario/spread-cambiario')
  href?: string              // external URL (external nav docs only)
  keywords: readonly string[]        // synonyms/aliases
  action?: { kind: 'theme' | 'lang'; arg?: string }  // type:'action' only
  // precomputed once by buildSearchIndex (fold = NFD + strip diacritics + lowercase):
  _slug: string              // folded last path segment
  _title: string             // folded title
  _hay: string               // folded (title + ' ' + description + ' ' + keywords.join(' '))
}
```

**Catalog → doc mapping** (each catalog exposes `…Slugs()` / `get…`, so iteration is clean):

| Source | `type` | `to` | `title` | `description` | `keywords` |
|---|---|---|---|---|---|
| `navToDocs(t, locale)` from `NAV_SECTIONS` | `page` (+ `action`) | `entry.to` | `t(entry.labelKey)` | `''` | `entry.keywords ?? []` |
| `tools.ts` (`tools`) | `tool` | `/herramientas/${slug}` | `title` | `description` | `keywords` (already present) |
| `glossary.ts` | `glossary` | `/glosario/${slug}` | `term` | `short` | `[term, ...]` |
| `guides.ts` | `guide` | `/guias/${slug}` | `title` | `description` | `[tag]` |
| `indicators.ts` | `indicator` | `/indicadores/${slug}` | `name` | `shortDef` | `[abbr, name]` |
| `convert.ts` (`convertEntries`) | `convert` | `/convertir/${slug}` | `convertTitle(entry)` | `''` | `[from, to, amount]` folded |
| `currencyPages.ts` (`CURRENCY_SLUG_TO_CODE`) | `currency` | `/cotizacion/${slug}` | `currencyDisplayName(code, locale)` | `currencyContext(code)` | `CURRENCY_ALIASES[code]` |
| `casasDirectory.ts` (`CASAS_REPUTATION`, 42) | `casa` | `/casa/${code}` | `name` | `''` | `[code, category]` |

**Casas injection.** There is no casas store/logo; the live API returns `[]` on failure. Casas therefore seed from the **static, always-available** `CASAS_REPUTATION` (`code → name`, `category`), route `/casa/${code}` — identical on SSR and client. No live-rate/`localData` overlay in the index (kills rebuild churn and SSR/client divergence). Cards fall back to a `mdi-bank` icon or the name initial (no logo asset exists anywhere).

**Blog posts.** The palette/`/buscar` index the **`/blog` hub only** (a `page` doc). Individual posts are deliberately excluded because (1) `listPosts()` is server-fs-only and importing it into a client-navigable component/page breaks the client bundle; (2) posts are runtime-generated, so a build-time manifest goes stale; (3) they are already crawlable via the XML sitemap (`urls.get.ts` enumerates `/blog/${slug}`) and linked from the `/blog` hub — they are **not orphans**. This keeps the palette and `/buscar` corpora exactly equal.

**Keyword/alias fields for Spanish synonyms.** Aliases are folded at build time into `_hay` and matched with a scoring bonus (see The scorer). Co-located with the route in `NAV_SECTIONS.entries[].keywords`, plus `CURRENCY_ALIASES` in `searchIndex.ts`. Concrete seed set (extend freely; all lowercased/unaccented at build):

- `/prestamos-uruguay`: `prestamo, préstamo, credito, crédito, financiamiento, cuota, loan`
- `/couriers-uruguay`: `courier, envios, importar, aliexpress, amazon, ebay, compras exterior`
- `/inversiones-uruguay`: `inversion, invertir, ahorro, fci, bonos, cripto, plazo fijo`
- `/retirar-efectivo-uruguay`: `retirar, efectivo, cajero, atm, turista, sacar plata`
- `/historico`: `historico, historia, evolucion, grafico, tendencia`
- `/mapa` / `/casa-de-cambio-cerca-de-mi`: `mapa, ubicacion, cerca, donde, sucursal`
- `/estado`: `estado, salud, scraper, operativo, caido, health`
- `CURRENCY_ALIASES`: `USD → [dolar, dólar, usd, u$s, billete]`, `EUR → [euro, eur]`, `BRL → [real, reales, reais, brl]`, `ARS → [peso argentino, ars, arg]`, `GBP → [libra, gbp]`, `XAU → [oro, gold, xau]`, … (one row per `CURRENCY_SLUG_TO_CODE` code)
- theme action: `tema, theme, modo, oscuro, claro, dark, light`
- lang actions: `idioma, language, ingles, english, portugues, português, espanol, español, en, pt, es`

## The scorer

Pure, zero-dep, deterministic. Diacritic normalization reuses `convert.ts`'s exact rule.

```
fold(s)     = s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim()
tokenize(q) = fold(q).split(/\s+/).filter(Boolean)
wordStarts(hay, t) = hay.split(/[\s-]+/).some(w => w.startsWith(t))

scoreDocs(query, docs):
  raw = fold(query).replace(/\s+/g,' ')
  if raw === '' return []
  tokens = tokenize(query)
  hits = []
  for doc of docs:
    s = 0
    if      doc._slug === raw || doc._slug === raw.replace(/ /g,'-')  s = 100   // TIER 1 exact slug
    else if doc._title === raw                                        s = 92    // TIER 2 title exact
    else if doc._title.startsWith(raw)                                s = 74    // TIER 3 title prefix
    else if tokens.every(t => wordStarts(doc._title, t))              s = 56    // TIER 4 word prefix
    else if doc._title.includes(raw)                                  s = 40    // TIER 5 title substring
    else if tokens.every(t => doc._hay.includes(t))                   s = 26    // TIER 6 all tokens in haystack
    if tokens.some(t => doc.keywords.includes(t))                     s += 30   // alias bonus (stacks)
    if s === 0 continue                                                          // textual/alias gate
    s += TYPE_BOOST[doc.type]
    hits.push({ doc, score: s })
  hits.sort((a,b) => b.score - a.score
                  || TYPE_ORDER[a.doc.type] - TYPE_ORDER[b.doc.type]
                  || a.doc._title.localeCompare(b.doc._title))
  return hits.length ? hits : didYouMean(tokens, docs)
```

- `TYPE_BOOST = { action:15, page:12, tool:10, currency:9, convert:8, indicator:7, guide:6, glossary:5, casa:4 }`. `TYPE_ORDER` is the same ranking for deterministic tie-breaks. The boost **never rescues** a doc with no textual/alias signal (the `s === 0` gate runs first).
- **Alias bonus** is why keyword-only matches (e.g. `tema`, `usd`) surface: tier score `0` + `30` passes the gate, then `+TYPE_BOOST`.
- **0-hit Levenshtein fallback** (`didYouMean`) runs **only** when the tiered pass returns empty:

```
didYouMean(tokens, docs):
  q = longest token
  out = []
  for doc of docs:
    d = min over doc._title words w of levenshtein(q, w, 2)   // bounded, early-exit > 2
    if d <= 2 out.push({ doc, score: 2 - d, suggestion: true })
  return out.sort(by score desc, then TYPE_ORDER).slice(0, 5)
```

`levenshtein(a,b,max)` early-exits (returns `max+1`) once the row minimum exceeds `max`, so a ≥3-edit typo costs almost nothing and yields `[]`. Palette shows top **8** + "ver todos"; `/buscar` shows top **50** grouped by section.

**Why not fuse.js.** (1) Explicitly banned by project constraints. (2) ~15 KB on a mobile-perf-capped bundle. (3) Generic fuzzy ranking cannot express the domain tiering (exact-slug ≫ title ≫ alias) or the per-type boost that makes `dolar` surface the cotización page over an incidental glossary mention. (4) The hand-rolled scorer is ~70 lines of pure, unit-tested, explainable code with a *controlled* single typo pass — a better fit than an opaque similarity score for ~220 curated docs.

## Quick actions

Two mechanisms, one unified result stream.

**Theme + language** are ordinary `type:'action'` `SearchDoc`s emitted by `navToDocs(t, locale)`, so they flow through `scoreDocs` and are keyword-gated:

- Theme: `{ id:'action:theme', type:'action', action:{kind:'theme'}, title: t('search.action.theme',{mode}), keywords:['tema','theme','oscuro','claro','modo','dark','light'] }`. On select → `useThemeMode().cycle()` (the documented module-singleton shared with the app-bar toggle); the palette **stays open** and re-announces.
- Language: up to two docs for the locales `!== locale.value`: `{ action:{kind:'lang', arg:'en'}, title: t('search.action.lang',{lang}), keywords:['idioma','language','english','en',…] }`. On select → `navigateTo(useSwitchLocalePath()(arg))` (locale switch is navigation-based) and close.

**Numeric currency conversion** — `parseAmountQuery(q)` (pure, in `searchIndex.ts`), run *before* `scoreDocs`; on a hit it is prepended as a pinned row:

```ts
// applied to fold(q):
const RE = /^\s*([\d][\d.,\s]*)\s*(usd|u\$s|us\$|dolar(?:es)?|dollars?|eur|euros?|brl|real(?:es)?|reais|ars|pesos?\s*arg(?:entinos?)?|uyu|pesos?\s*(?:uruguayos?)?|pesos?|\$)\s*$/

parseAmountQuery(q):
  m = RE.exec(fold(q)); if !m return null
  amount = parseEsNumber(m[1]); if amount == null return null
  from   = tokenToCode(m[2])                     // usd/dolar/dollar→USD; eur/euro→EUR; brl/real/reais→BRL; peso arg→ARS; uyu/peso/$→UYU
  to     = from === 'UYU' ? 'USD' : 'UYU'
  slug   = convertSlug(amount, from, to)          // e.g. '100-dolares-a-pesos-uruguayos'
  prebaked = !!getConvertEntry(slug)              // strict lookup over the ~66 frozen entries
  foreign  = from === 'UYU' ? to : from
  navTo    = prebaked ? `/convertir/${slug}`      // exact prebaked page
                      : `/cotizacion/${currencySlug(foreign)}`   // live currency page — NEVER an empty page
  return { amount, from, to, slug, navTo, title: `¿Cuánto es ${amountLabel(amount, from)} en ${CONVERT_CURRENCIES[to].plural}?`, prebaked }
```

`parseEsNumber` uses the es-UY convention (`.`=thousands, `,`=decimal): `s.replace(/\s/g,'')`; if it matches `/^\d+\.\d{1,2}$/` treat the dot as a decimal (`10.5`), else `replace(/\./g,'').replace(',', '.')` then `parseFloat` (`1.000,50 → 1000.5`). Returns `null` for non-numeric.

**This resolves the D2-vs-facts conflict:** D2's literal `/convertir/usd-a-uyu` is not a real route; the verified canonical slug is `100-dolares-a-pesos-uruguayos`, and non-prebaked amounts (`137 usd`) would render an empty `v-if="entry"` page. So Enter navigates to the exact prebaked page when it exists, otherwise to the always-substantive `/cotizacion/{currency}` page. The **inline preview** (`amountLabel(amount, from) + ' ≈ ' + convertAmount(...)` over `useExchangeRates().bestSell/bestBuy` for `foreign`) always shows the *exact* typed amount and is the payload; it renders even when the destination is the cotización fallback, and degrades to the label-only string if rates haven't loaded.

## Components + UX

**Dialog shape** (`SearchPalette.vue`) — fullscreen on mobile via `const { mobile } = useDisplay()`:

```html
<VDialog v-model="open" :fullscreen="mobile" width="640" scrollable
         @after-enter="focusInput" @after-leave="restoreFocus">
  <VCard class="search-palette">
    <div class="sp-input-row">
      <VIcon>mdi-magnify</VIcon>
      <input ref="inputEl" v-model="query" type="text"
             role="combobox" aria-autocomplete="list" aria-haspopup="listbox"
             :aria-expanded="String(hasResults)" aria-controls="cu-search-listbox"
             :aria-activedescendant="activeId" :aria-label="t('search.ariaInput')"
             :placeholder="t('search.placeholder')" @keydown="onKey" />
      <VBtn icon variant="text" :aria-label="t('search.close')" @click="open = false">
        <VIcon>mdi-close</VIcon>
      </VBtn>
    </div>
    <VDivider />
    <SearchResults mode="listbox" :groups="groups" :active-id="activeId" :query="query"
                   @activate="activeId = $event" @select="onSelect" />
    <p class="sr-only" role="status" aria-live="polite">{{ liveMsg }}</p>
  </VCard>
</VDialog>
```

**ARIA combobox pattern** (APG combobox-with-listbox-popup, virtual focus). Real DOM focus **never leaves the input**; a virtual cursor (`activeIndex` → `activeId = 'cu-search-opt-'+i`) drives `aria-activedescendant`. The results list is **plain semantic HTML, not `VList`** (deliberate — avoids Vuetify's implicit `role="list"/"listitem"` colliding with `listbox/option` and avoids two focus systems fighting):

```html
<!-- SearchResults.vue, mode='listbox' -->
<ul id="cu-search-listbox" role="listbox" :aria-label="t('search.ariaListbox')">
  <template v-for="g in groups" :key="g.id">
    <li role="presentation" class="sp-group">{{ t('search.section.'+g.id) }}</li>
    <li v-for="row in g.items" :key="row.id" :id="'cu-search-opt-'+row.idx"
        role="option" :aria-selected="row.idx === activeIndex"
        @mousemove="$emit('activate', row.id)" @click="$emit('select', row.doc)">
      <VIcon>{{ row.doc.icon }}</VIcon>
      <span class="sp-title">{{ row.doc.title }}</span>
      <VChip size="x-small" variant="tonal">{{ t('search.type.'+row.doc.type) }}</VChip>
    </li>
  </template>
</ul>
```

`mode='links'` (on `/buscar`) renders the identical grouping as `<h2>` + `<NuxtLink :to="localePath(doc.to)">` anchors (crawlable, no listbox semantics).

**Focus trap / restore.** `VDialog` provides the modal trap. On open: capture `triggerEl = document.activeElement` and focus the input after `@after-enter`. On close (`@after-leave`): `triggerEl?.focus()`. `Escape` closes and restores.

**Keyboard map.** `ArrowDown/Up` move `activeIndex` (wrap); `Home/End` first/last; `Enter` activates the active row, or — if the row set is empty and `parseAmountQuery(query)` hit — the pinned convert row; `Escape` close+restore; `Tab` trapped by `VDialog`; typing edits the query.

**Recents.** `localStorage` key `cu_search_recents` — array of the last **5** selected `{id,to,title,type,icon}`, `unshift` + dedupe-by-`id` + cap. Read on mount (guarded by `import.meta.client`); a "Borrar" button clears it. Rendered in the empty state.

**States.**
- *Empty (`query===''`)*: `search.recents` (if any) → `search.suggestions` from `POPULAR` (`/dolar-hoy`, `/historico`, `/cotizacion/dolar`, `/herramientas/conversor-de-monedas`, `/comparar`) → `search.quickActions` hints (theme, idioma).
- *No results (`query!==''` and 0 tier hits)*: if `didYouMean` returned rows → `search.didYouMean` list; else `search.empty` (`No encontramos resultados para "{q}"`) + a "ver todos" link to `/buscar?q=` + `search.browseSitemap` → `/mapa-del-sitio`.
- *Loading (first open, index chunk in flight)*: quick actions render instantly (they need only `convert.ts`); the results region shows a 3-row skeleton until `buildSearchIndex` resolves. The input is focusable immediately.

**Dark-first styling.** SSR renders dark; the palette inherits it. Provide `.v-theme--light` overrides (scoped in the component, mirroring the `critical.css` idiom) for the input surface, listbox background, the active-row highlight, and group headers, using `rgb(var(--v-theme-*))` tokens. The forced-black overlay scrim (`critical.css:118`) applies in both themes — acceptable, no new flash beyond the site's existing behavior.

**Triggers (CLS-safe).** Both are **real `NuxtLink`s** rendered in SSR HTML with fixed footprints (no layout shift on hydration):

```html
<!-- desktop, inside .nav-actions — faux search field, reserves ~200px -->
<NuxtLink :to="localePath('/buscar')" class="search-trigger d-none d-lg-flex"
          :aria-label="t('search.triggerLabel')" aria-keyshortcuts="Control+K"
          data-cta="search-open-desktop" @click.prevent="paletteOpen = true"
          @pointerenter="paletteActivated = true">
  <VIcon>mdi-magnify</VIcon><span>{{ t('search.triggerLabel') }}</span>
  <kbd class="search-kbd">{{ t('search.triggerHint') }}</kbd>
</NuxtLink>

<!-- mobile, sibling of VAppBarNavIcon (after line 205) -->
<NuxtLink :to="localePath('/buscar')" class="search-trigger-icon d-flex d-lg-none"
          :aria-label="t('search.triggerLabel')" data-cta="search-open-mobile"
          @click.prevent="paletteOpen = true" @pointerenter="paletteActivated = true">
  <VIcon>mdi-magnify</VIcon>
</NuxtLink>
```

`@pointerenter="paletteActivated = true"` warms the `LazySearchPalette` chunk before the click resolves.

## Hydration strategy

This app has a known pre-hydration first-click no-op (the latent Suspense bug also in `/mapa.vue`). Neutralized by **not depending on JS for the trigger's baseline behavior**:

- Each magnifier is a genuine `<a href="{localePath('/buscar')}">` carrying `@click.prevent="paletteOpen = true"`. **Pre-hydration:** the listener isn't attached yet, so a click is a native, locale-correct anchor navigation to the SSR `/buscar` page (fully functional search — works with JS disabled too). **Post-hydration:** `@click.prevent` fires; Vue Router's `guardEvent` sees `defaultPrevented` and skips SPA navigation, so our handler opens the dialog instead. No dead click, no Suspense-gating, no `toPass` hack. The href goes through `localePath()`, so an EN/PT user can never be dropped on the unprefixed ES route.
- **`Ctrl/Cmd+K` and `/`** are registered in `default.vue`'s `onMounted` (client-only by definition) via `window.addEventListener('keydown', …)` with `onUnmounted` cleanup. `/` is ignored while focus is in an `input/textarea/[contenteditable]`. Keyboard shortcuts are inherently post-hydration — a keyboard user is already on a hydrated page — which is acceptable.
- The palette mounts as `<ClientOnly><LazySearchPalette v-if="paletteActivated" v-model="paletteOpen" /></ClientOnly>` (matching the existing `AuthDialog`/`CookieConsent` pattern). `paletteActivated` flips on first trigger `pointerenter`/click or first `Ctrl+K`, so the ~220-doc index chunk and Vuetify dialog subtree are **never in the initial bundle** — the 95% who never search pay nothing. First open shows the dialog shell instantly (light static deps) and swaps in results when the dynamic `searchIndex.ts` import resolves; `/buscar` covers the no-JS/slow-cold case.

**No document-level delegated-click plugin** (Design 3's approach) — the anchor already wins the race, and a second open-path is a double-open footgun.

## `/buscar` page

- SSR page; reads `q = String(useRoute().query.q ?? '')`.
- Runs the shared code path **synchronously in setup** over in-memory catalogs (no async data, no server round-trip, no `listPosts`): `const docs = buildSearchIndex({ locale, t }); const results = q ? scoreDocs(q, docs) : []`. Results are grouped by section and rendered via `<SearchResults mode="links" …>` into the SSR HTML (indexable, crawlable anchors). Empty `q` renders an indexable landing: an `<h1>`, a `<form method="get">` with a text input named `q`, and a link to `/mapa-del-sitio`.
- **SEO meta** (`useHead`): canonical `…/buscar` (no query); `robots` = **`noindex, follow` when `q` is non-empty** (result pages are noindex), and indexable (default) when `q` is empty (the landing form). Trilingual via `localePath`/`useI18n`.
- Numeric quick action: if `parseAmountQuery(q)` hits, render the convert result card at top with a `NuxtLink` to `navTo`.

**JSON-LD `SearchAction` fix (D5).** Both `WebSite` nodes get the corrected `EntryPoint`. `default.vue` lines 458-461 **and** `index.vue` lines 1928-1931 become:

```jsonc
"potentialAction": {
  "@type": "SearchAction",
  "target": {
    "@type": "EntryPoint",
    "urlTemplate": "https://cambio-uruguay.com/buscar?q={search_term_string}"
  },
  "query-input": "required name=search_term_string"
}
```

Fixing `index.vue:1930` is non-negotiable — that node is the `WebSite` entity Google uses for the sitelinks searchbox on the homepage; leaving it at `/avanzado?search=` would ship D5 only half-done on the one page that matters most.

## `/mapa-del-sitio` page

- SSR, indexable (canonical + no `noindex`). Iterates `NAV_SECTIONS` for the seven `<section><h2>` groups; under each, renders every `NavEntry` (hubs) as `localePath` anchors, then **expands the long tail** under its owning section by importing the catalog enumerators directly (`toolSlugs`/`glossarySlugs`/`guideSlugs`/`convertSlugs`/`listCurrencySlugs`/`listIndicatorSlugs`) plus casas from `CASAS_REPUTATION` (`/casa/{code}`). Plain anchors, no per-item components (the DOM is large by design; keep it cheap).
- The three former orphans (`/preguntas-frecuentes`, `/por-que-sube-el-dolar`, `/dolar/records`), all footer-only routes, `/mapa`, and `/estado` each get a crawlable inbound link here.
- Linked from `Footer.vue` (section `site`) and from the palette's no-result state. Emits `BreadcrumbList` JSON-LD.
- **SEO value:** a command palette does nothing for crawlers; this hub + the regenerated section-grouped footer are what mint the internal anchors Google follows to reach the long tail (complementing, and more reliable than, the XML sitemap).

**Sitemap resilience (`urls.get.ts`).** Refactor so the **static backbone is derived from `siteNav.ts` and emitted outside the try/catch**: enumerate `NAV_SECTIONS` internal entries (with per-route `priority`/`changefreq`/`fresh` carried on the entry) + the pure catalog slug lists (`toolSlugs`/`glossarySlugs`/`guideSlugs`/`convertSlugs`/`listCurrencySlugs`/`listIndicatorSlugs`) first — these never need the API and never throw. Only the **dynamic slices** (origins, historico pairs, sucursales, `/casa/{origin}`, departments) and blog posts stay inside try/catch, appended on success. On API failure the handler now returns the full static + catalog + blog URL set instead of `[]`. This also fixes the current omissions (`/por-que-sube-el-dolar`, `/dolar/records`, `/casa-de-cambio-cerca-de-mi`, `/newsletter`) automatically and makes the sitemap a fourth projection of the one source of truth. `/estado`, `/offline`, `/widget`, `/cuenta` carry a `sitemap:false` flag and stay out of the XML (in-nav internal links suffice for `/estado`).

## i18n plan

New top-level `search` namespace (confirmed unclaimed — no root/`historical` collision). Full key list (added to `es`, `en`, `pt`):

```jsonc
"search": {
  "triggerLabel": "Buscar",
  "triggerHint": "Ctrl K",
  "placeholder": "Buscar páginas, herramientas, casas de cambio…",
  "ariaInput": "Buscar en el sitio",
  "ariaListbox": "Resultados de búsqueda",
  "close": "Cerrar",
  "recents": "Búsquedas recientes",
  "clearRecents": "Borrar",
  "suggestions": "Sugerencias",
  "quickActions": "Acciones rápidas",
  "resultsCount": "{n} resultados",
  "oneResult": "1 resultado",
  "noResultsAria": "Sin resultados",
  "empty": "No encontramos resultados para “{q}”.",
  "didYouMean": "¿Quisiste decir…?",
  "seeAll": "Ver todos los resultados",
  "browseSitemap": "Explorar el mapa del sitio",
  "section": { "market":"Cotización y mercado", "houses":"Casas de cambio", "tools":"Conversores y herramientas", "learn":"Guías y aprendizaje", "services":"Servicios financieros", "connect":"Datos y conexiones", "site":"Sitio" },
  "action": { "theme":"Cambiar tema (actual: {mode})", "lang":"Cambiar idioma a {lang}", "convert":"Convertir {amount}" },
  "type": { "page":"Página","tool":"Herramienta","currency":"Cotización","convert":"Conversión","glossary":"Glosario","guide":"Guía","indicator":"Indicador","casa":"Casa de cambio","action":"Acción" }
}
```

**`raw:true` cleanup.** The `raw:true` mechanism and `navLabel`'s raw branch are deleted; every `NavEntry` carries a `labelKey` and `navLabel(e,t) = t(e.labelKey)`. Reuse existing keys where present (`inicio`, `dolarHoy.nav`, `historico`, `sucursalesMenu`, `map.nav`, `compare.nav`, `avanzado`, `noticias.nav`, `guias.nav`, `estado.nav`, `acerca.nav`, `conectar.nav`, `dev.nav`, `newsletter.nav`, `legal.privacyNav`, `legal.termsNav`, `legal.contactNav`, `donar`); add a `nav.*` block for the rest — **in all three JSON files** (fixing the current EN/PT gap where `Herramientas`/`Glosario`/`Convertir`/`Cotizaciones`/`Indicadores`/`Blog`/`Retirar efectivo` render as Spanish literals):

```
nav.herramientas, nav.convertir, nav.cotizacion, nav.indicadores, nav.glosario, nav.blog,
nav.retirar, nav.faq, nav.porQueSube, nav.records, nav.casasDirectory, nav.nearby,
nav.couriers, nav.prestamos, nav.inversiones, nav.sitemap, nav.twitter, nav.linkedin
```

`NAV_SECTIONS.titleKey` reuses `search.section.*`.

## Analytics

`useTrack()` → `track(event, params)`; the plugin auto-fires a click event for any `data-cta` element.

- **Triggers:** `data-cta="search-open-desktop"` / `search-open-mobile` on the two magnifiers (auto-tracked click). Keyboard opens fire explicitly: `track('search_open', { source: 'hotkey' })` (Ctrl+K) / `{ source: 'hotkey_slash' }` (`/`). No `data-cta` on keyboard path (no double count).
- **Result select:** `track('search_select', { q, to, type, rank })` on choosing any result row.
- **Numeric convert:** `track('search_convert', { q, from, to, amount, prebaked })` on selecting the pinned convert row.
- **Language action:** `track('search_action', { kind: 'lang', to: code })`. (Theme relies on `useThemeMode.setMode`'s existing `theme_change` event — no duplicate.)
- **No results:** `track('search_no_results', { q })` (debounced 400 ms, non-empty query, 0 tier hits).
- **`/buscar` view:** `track('search_results_view', { q, count })` on mount.
- **`data-cta`:** `"search-see-all"` on the "ver todos los resultados" link; `"footer-sitemap"` on the footer `/mapa-del-sitio` link.

## Test plan

Gate on `npm run lint` + vitest + Playwright (**not** `vue-tsc` — `typecheck` is broken per project memory).

**Unit (vitest, `app/tests/unit`, node env, pure):**

1. `siteNav-scorer.test.ts` — `fold('Histórico')==='historico'`, `fold('DÓLAR')==='dolar'`; `tokenize('  100  USD ')` `== ['100','usd']`; tier ordering on a fixture (exact-slug 100 > title-exact 92 > title-prefix 74 > word-prefix 56 > title-substring 40 > all-tokens-in-hay 26); alias bonus (+30) surfaces a keyword doc; **textual gate** drops a doc with no textual/alias hit regardless of `TYPE_BOOST`; page beats glossary on equal textual tier; `scoreDocs('', docs) === []`; Levenshtein fallback fires **only** at 0 hits (`scoreDocs('histrico', docs)` yields a `/historico` suggestion; `scoreDocs('historico', docs)` yields tier hits and **no** suggestion rows); a ≥3-edit typo → `[]`; `levenshtein` early-exits above `max`.
2. `siteNav-coverage.test.ts` — **the no-orphan test.** Glob `app/pages/**/*.vue`; classify each file static/dynamic and normalize to a route. Assert: (a) every bracket-free route ∈ `NAV_SECTIONS.to` ∪ `EXCLUDED_ROUTES` ∪ `toolSlugs().map(s=>'/herramientas/'+s)`; (b) every bracketed page's dir-key ∈ `DYNAMIC_ROUTE_KEYS`; (c) **reverse** — every `NAV_SECTIONS` internal `to`, every `DYNAMIC_ROUTE_KEYS` key, and every `EXCLUDED_ROUTES` entry resolves to an existing page file (no dead nav links / stale keys; `/mapa-del-sitio` must exist); (d) `EXCLUDED_ROUTES` deep-equals `['/offline','/widget','/cuenta']` exactly; (e) `toolSlugs()` set **equals** the filesystem `herramientas` leaf-slug set in **both** directions. Assertion (e) **is expected to fail on day one** — it documents the verified `tools.ts` 15-entries-vs-14-pages gap and must be reconciled (add the missing page or remove/rename the slug); do **not** silence it. The filesystem is the source of truth, so a future dropped `.vue` turns CI red — orphaning becomes impossible by construction. (This is grafted from Design 2, hardened per Judge 1: the dynamic assertion keys on the page **file path**, not a normalized route string, so the nasty `historico/[origin]/[currency]/[[type]]` cases cannot false-pass.)
3. `searchIndex-build.test.ts` — `buildSearchIndex({locale:'es', t:k=>k})` contains a doc for every `NAV_SECTIONS` entry, a tool (`/herramientas/conversor-de-monedas`), a currency (`/cotizacion/dolar`), a convert entry (`/convertir/100-dolares-a-pesos-uruguayos`), a glossary term, a guide, an indicator, and a casa (`casa:brou → /casa/brou`) **with no `rows` argument**; ids unique; `_slug/_title/_hay` all folded/lowercase; count > 180; two calls deep-equal (determinism/parity — the palette and `/buscar` get identical arrays).
4. `searchIndex-quickactions.test.ts` — `parseAmountQuery('100 usd')` → `{amount:100,from:'USD',to:'UYU',slug:'100-dolares-a-pesos-uruguayos',navTo:'/convertir/100-dolares-a-pesos-uruguayos',prebaked:true}`; `'50 euros'`→EUR, `'1000 pesos argentinos'`→ARS, `'5000 uyu'`→`{from:'UYU',to:'USD'}`; `'137 usd'` (non-prebaked) → `prebaked:false`, `navTo:'/cotizacion/dolar'`; `parseEsNumber` on `'1.000,50'`→1000.5, `'10.5'`→10.5, `'1,5'`→1.5, `'1000'`→1000; `'hola'`/`'usd'`/`''`/`'100 xyz'`→`null`.
5. `sitemap-urls.test.ts` — invoke the handler with a **mocked failing** `$fetch`; assert it returns the full static + catalog URL set (not `[]`) including `/por-que-sube-el-dolar`, `/dolar/records`, `/casa-de-cambio-cerca-de-mi`, `/newsletter`; with a healthy mock, snapshot that existing routes keep their prior `priority`/`changefreq`.

**E2E (Playwright, `app/tests/e2e`, every interaction gated via `expect(async()=>{…}).toPass()`):**

6. `search-palette.spec.ts` (desktop + 375 px) — after hydration, click the magnifier → dialog visible, input has `role="combobox"` and focus; assert the magnifier's `href` `=== localePath('/buscar')` (pre-hydration fallback contract); type `glosario` → first option is `/glosario`, `ArrowDown` moves `aria-activedescendant`, `Enter` → URL is `localePath('/glosario')`; `Ctrl+K` opens; `Escape` closes and focus returns to the trigger; type `100 usd` → pinned convert row, `Enter` → URL ends `/convertir/100-dolares-a-pesos-uruguayos`; type `tema` → theme row, `Enter` cycles `html[data-theme]` and the palette stays open; type `histrico` → "¿Quisiste decir…?" with `/historico`; **axe** scan in both themes → 0 violations, and assert `aria-expanded`, `aria-controls`→listbox id, and the `aria-live` node exist.
7. `buscar-ssr.spec.ts` — `goto('/buscar?q=dolar')` with `javaScriptEnabled:false` → result anchors present in raw HTML; `<meta name="robots">` contains `noindex` when `q` set and is absent when `q` empty; run on an `/en/buscar?q=…` route to confirm EN-prefixed result links; `goto('/')` and assert **both** `WebSite` JSON-LD blocks' `urlTemplate` contain `/buscar?q={search_term_string}` and neither contains `/avanzado?search=`.
8. `mapa-del-sitio.spec.ts` — renders 7 section headings; contains anchors for the 3 former orphans, ≥14 tool links, ≥40 casa links, and a footer-only route (`/couriers-uruguay`); indexable (no `noindex`).
9. `nav-drawer.spec.ts` (375 px) — open the drawer → `/mapa` **and** `/estado` links present (drift regression lock); sections are collapsible (`VListGroup`); a `services` link (`/prestamos-uruguay`) and a `site` link (`/contacto`) are present (former footer-only now in the drawer).

## Rollout / risks

- **High blast radius:** rewriting `default.vue`'s nav+drawer and `Footer.vue` from one model touches every page; a typo in `NAV_SECTIONS` drops a link from four surfaces at once — the coverage + drawer e2e are the load-bearing gate. Smoke both themes + mobile before merge.
- **Concurrent sessions** routinely touch `default.vue`/`Footer.vue` (per project memory) — re-check `main`'s state immediately before merging and expect real conflicts in `default.vue`.
- **The `tools.ts` 15-vs-14 discrepancy** will surface as a failing coverage assertion (test 2e) — reconcile it (add the missing `/herramientas/*` page or drop/rename the extra slug) before merge; do not skip the assertion.
- **Sitemap refactor:** verify emitted URL counts/priorities for existing routes are unchanged (snapshot) and that the mocked-failure test proves the static backbone survives (test 5).
- **SSR dark-first:** the palette's first paint is dark; ship the `.v-theme--light` overrides and re-run the existing `app/scripts/lightmode-axe.mjs` sweep over the two new routes (`/buscar`, `/mapa-del-sitio`) — target 0 contrast violations both themes.
- **First cold open** on a slow connection shows a brief skeleton while the index chunk loads; quick actions render instantly and `/buscar` covers the no-JS/slow path, so search is never dead.
- **i18n:** filling `nav.*` in all three locales is required or EN/PT show a raw key; `navLabel` returns `t(labelKey)` so a missing key renders the key (visible, not a crash) — the coverage of keys is a manual review item.
- Register `VListGroup`/`VListSubheader` in `vuetify.ts` before using them (only registered components render).

## Explicitly out of scope

- No server-side/full-text search API, no Algolia/Elastic, no fuse.js, no `@vueuse/core`, no new composable/store (open-state is one layout `ref`).
- No individual blog-post entries in the palette or `/buscar` index (hub only; posts remain reachable via `/blog` and the XML sitemap).
- No live casa-name/rate overlay in the index (static `CASAS_REPUTATION` names only; live rates stay on casa pages).
- No fuzzy matching beyond the bounded (≤2) 0-hit pass; no synonyms learning, no popularity/click weighting, no per-locale keyword tuning beyond the seeded alias lists.
- No new `/convertir/{arbitrary-amount}` pages — the numeric action falls back to `/cotizacion/{currency}` for non-prebaked amounts.
- No bottom navigation bar.
- No changes to the 60 existing page bodies beyond `index.vue`'s single JSON-LD `urlTemplate` line and the two shared components (`default.vue`, `Footer.vue`).

---

**Files inspected to finalize this spec (all absolute):** `C:\Users\airau\Documents\GitHub\cambio-uruguay\app\utils\convert.ts`, `app\pages\convertir\[slug].vue`, `app\server\api\__sitemap__\urls.get.ts`, `app\pages\index.vue` (JSON-LD block ~1923-1934), `app\layouts\default.vue` (nav model + mount points), and a full `app/pages/**/*.vue` enumeration (60 files) driving the IA table and the coverage test.