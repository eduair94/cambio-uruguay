# Route catalogue prefetch

Nuxt automatically discovers `../catalogue-prefetch.ts` under the application's `modules/`
directory. Its `build:manifest` hook changes only the `prefetch` flag of chunks (and of their
stylesheets) that are loaded on demand. No config override or runtime HTML rewriting is needed.

## Why

`vue-bundle-renderer` (2.1.2 when this started, 2.4.0 on 2026-11-20) emits a `<link rel="prefetch">`
for every dynamic import of every rendered module (the entry, the layout, the page): the chunk,
every chunk it imports statically, and their stylesheets. Those hints are not NuxtLink's later
visibility prefetches: they are in the SSR HTML of every page. On 2026-09-08 they requested the
guide, import and exchange-house catalogues before rental analysis hydrated. Before #342 production
emitted 53-58 script hints per page, 49 of them (218 KB gzip) on every page: the route validators
moved to `await import('~/utils/...')` in #254, and the Firebase and session code that #260 made on
demand.

## The rules

1. **Named catalogues** (the original 2026-09-08 list in `policy.ts`): their `utils/` module or a
   hashed shared chunk whose preserved module `name` is in the list. Kept as a guard.
2. **On-demand roots**, found structurally:
   - an `utils/` module that the **entry** imports dynamically. Nuxt hoists
     `definePageMeta({ validate })` into the entry's route table, so these are the route
     validators (27 `await import('~/utils/...')` today). Each page also imports its own catalogue
     statically, so the page that needs it still gets it as a `modulepreload`. The rule applies
     only to the entry: an `utils/` module imported lazily by a component (the search index of
     `SearchPalette`) keeps its hint;
   - a `services/` module imported dynamically from **any** chunk (`firebaseAuthApi`,
     `firebaseAuthSync`, `firebaseMessagingApi`, `clarityRuntime`);
   - a `firebase` or `@firebase` package imported dynamically from any chunk;
   - a chunk **without a facade** (below) whose `name` is the basename of an `utils/` module
     (imported by the entry) or of a `services/` module, or of a page that has no chunk of its own.
     The module reads both directories and the page list in the build.

   Pages are never roots, and no other `node_modules` path is. Every script in the static closure
   of a root loses its hint unless it is in the **protected set**: the static closure of the
   entry plus that of every entry dynamic import that is neither a root, nor a page, nor a chunk
   without a facade (layouts, the i18n config loader, workbox-window, the auth middleware). A
   chunk that a deferred catalogue shares with something the whole site keeps therefore keeps its
   hint.

3. **Stylesheets**: the renderer hints a dynamic import's CSS by the stylesheet's own flag, so a
   stylesheet whose every owning script lost its hint loses its own. One that a hinted script
   still lists keeps it.

Sources are matched on Vite's `src` (or the manifest key), with backslashes and queries
normalised, never on deployment-specific output hashes. `preload`, `imports`, `dynamicImports`,
scripts and rendered stylesheets are never changed. The trade-off: a chunk shared only between a
deferred root and a page-level or layout-level lazy component loses its speculative hint, never its
preload. A new `import('~/utils/...')` placed in app-wide code (plugin, layout, entry) is treated as
on demand too; if it must be warm right after hydration, import it statically.

## A chunk without a facade

Rollup keeps a module that a lazy import needs inside the importer's chunk when the importer is
sure to be loaded already. The chunk then exports something that is not the module's own export,
so Rollup cannot make it the module's "facade": Vite keys it `_<file>`, with no `src`, and only its
`name` (the module's basename) says what it is. Measured in the build of 2026-11-20 (#342):

- Three validator catalogues (`comparativas`, `equiparCategoryPages`, `monopatinModelos`) had no
  `src`, so rule 2 did not see them, and as "entry dynamic imports that are neither roots nor
  pages" they went into the protected set: eleven script hints on every page. Rule 2's last bullet
  and the protected-set exclusion are for them.
- **The page `/alquileres-uruguay`**. #342 loaded `MapPropertyDetail` with `import()`; it uses
  `PropertyPhotoCarousel`, which nothing outside that page uses, so the carousel stayed in the page's
  chunk and `MapPropertyDetail`'s chunk imported it from there. The page lost its manifest key
  (`pages/alquileres-uruguay.vue` became `_Bww13dD9.js`), with three effects in production:
  - On its own route, Nuxt registers `pages/alquileres-uruguay.vue`, which the manifest no longer
    had: the page shipped **without its 19 stylesheets** (6 `<link rel="stylesheet">` instead of 25) and without the `modulepreload` of its code. The fall from 67 to 22 modulepreloads was
    this, not the lazy loading.
  - Nuxt's pages hook drops pages from the entry's dynamic imports by `src`; this chunk had none,
    so every page of the site prefetched the rental page: 39 scripts and 16 stylesheets.
  - This policy took it for app-wide lazy code and protected all of it.

  The page imports `MapPropertyDetail` statically again; `ReferenceAddress` stays lazy because its
  chunk shares nothing with the page's. Before lazy-loading a component of a page, check that it
  uses nothing that only that page uses. The build warns (`[catalogue-prefetch] ... has no chunk of
its own`) when a page has no manifest key, and rule 2 treats such a page as on demand so that it
  does not reach every other page; its own route stays broken until the import is fixed.

## Checks

`tests/unit/cataloguePrefetch.test.ts` uses the installed renderer on three fixtures: two made by
hand and `tests/unit/fixtures/client-manifest-2026-11-20.json`, cut from the client manifest of the
production build of 2026-11-20 (the entry with 20 of its 77 dynamic imports, the layout and its
lazy components, `/dolar-hoy`, and every static import of those). With the policy of #342 that cut
gives `/dolar-hoy` the 61 script hints production served. The tests verify that the hints are gone,
that preload, scripts and stylesheets are identical before and after, that each page still
preloads its own catalogue, that the entry's static code and the app-wide lazy code keep their
hints, that the page without a chunk is reported, and that the policy is idempotent.

Measured on the production manifest of 2026-11-20 with the vue-bundle-renderer it runs (the
renderer reproduces the four pages' HTML hint for hint), hints per page, script + style:

| page                            | #342 in production | this policy, same build | this policy + page fix (simulated) |
| ------------------------------- | ------------------ | ----------------------- | ---------------------------------- |
| home                            | 60 + 21            | 11 + 6                  | 12 + 6 (28 KB gzip)                |
| `/dolar-hoy`                    | 61 + 22            | 11 + 6                  | 12 + 6 (22 KB)                     |
| `/herramientas/calculadora-iva` | 62 + 22            | 13 + 6                  | 14 + 6 (24 KB)                     |
| `/alquileres-uruguay`           | 67 + 22            | 13 + 6                  | 15 + 8 (31 KB)                     |

Hints common to the four pages: 79 (264 KB gzip) in production, 16 (21 KB) after: ten scripts
(auth middleware, widget layout, i18n config, the locale helper, workbox, the search palette and
its results, the feedback block and its form, the login dialog) and their six stylesheets. The
`modulepreload` count of every page is the same with and without the policy. The last column
rebuilds the page's manifest entry by hand from the real one; only a build shows the real chunks.

After deployment, count the hints on those four pages: about 16-20 per page, no prefetched chunk
containing `@firebase` or `firebaseLocalStorageDb`, no `alquileres-uruguay.*.css` prefetched
anywhere, and on `/alquileres-uruguay` about 25 `<link rel="stylesheet">` including
`alquileres-uruguay.*.css` and about 66 modulepreloads. The build log must not show the
`has no chunk of its own` warning. Then check that validator routes
(`/comparativas/<familia>/<par>`, `/descuentos-con-tarjeta-uruguay/rubro/<rubro>`,
`/celulares-uruguay/<modelo>`) answer 200 with a valid slug and 404 with an invalid one, that SPA
navigation to them renders, and that login and an existing session still work. Separate cache
reuse from transferred bytes when comparing ResourceTiming entries.
