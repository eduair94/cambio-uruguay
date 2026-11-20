# Route catalogue prefetch

Nuxt automatically discovers `../catalogue-prefetch.ts` under the application's `modules/`
directory. Its `build:manifest` hook changes only the `prefetch` flag of chunks that are loaded on
demand. No config override or runtime HTML rewriting is needed.

## Why

`vue-bundle-renderer` (2.1.2 when this started, 2.4.0 on 2026-11-20) emits a
`<link rel="prefetch" as="script">` for every dynamic import of every rendered module (the
entry, the layout) and for their static imports. Those hints are not NuxtLink's later visibility
prefetches: they are in the SSR HTML of every page. On 2026-09-08 they requested the guide,
import and exchange-house catalogues before rental analysis hydrated. On 2026-11-20 production
emitted 53-58 such hints per page (222-234 KB gzip), 49 of them (218 KB gzip) on every page: the
22 route validators moved to `await import('~/utils/...')` in #254, and the Firebase and session
code that #260 made on demand.

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
   - a `firebase` or `@firebase` package imported dynamically from any chunk.

   Pages are never roots, and no other `node_modules` path is. Every script in the static closure
   of a root loses its hint unless it is in the **protected set**: the static closure of the
   entry plus that of every entry dynamic import that is neither a root nor a page (layouts, the
   i18n config loader, workbox-window, lazy components hoisted to the entry). A chunk that a
   deferred catalogue shares with something the whole site keeps therefore keeps its hint.

Sources are matched on Vite's `src` (or the manifest key), with backslashes and queries
normalised, never on deployment-specific output hashes. `preload`, `imports`, `dynamicImports`,
scripts and CSS are never changed. The trade-off: a chunk shared only between a deferred root and
a page-level lazy component loses its speculative hint, never its preload. A new
`import('~/utils/...')` placed in app-wide code (plugin, layout, entry) is treated as on demand
too; if it must be warm right after hydration, import it statically.

## Checks

`tests/unit/cataloguePrefetch.test.ts` uses the installed renderer on two fixtures, one shaped like
the production graph. It verifies that the hints are gone, that preload and scripts are identical
before and after, that each page still preloads its own catalogue, that the entry's static code is
never touched, and that the policy is idempotent.

After deployment, count the hints on three or four pages (home, `/dolar-hoy`, a tool,
`/alquileres-uruguay`): the hints common to every page should fall from 49 to about 10-16 (about
20-30 KB gzip), the `modulepreload` count of each page should not change, and no prefetched chunk
should contain `@firebase` or `firebaseLocalStorageDb`. Then check that validator routes
(`/comparativas/<familia>/<par>`, `/descuentos-con-tarjeta-uruguay/rubro/<rubro>`,
`/celulares-uruguay/<modelo>`) answer 200 with a valid slug and 404 with an invalid one, that SPA
navigation to them renders, and that login and an existing session still work. Separate cache
reuse from transferred bytes when comparing ResourceTiming entries.
