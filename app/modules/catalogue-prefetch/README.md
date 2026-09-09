# Route catalogue prefetch

Nuxt automatically discovers `../catalogue-prefetch.ts` under the application's `modules/`
directory. Its `build:manifest` hook changes only `prefetch` on the five data catalogues used
by dynamic route validators and their three dependent data catalogues. No config override or
runtime HTML rewriting is needed.

The validators already use dynamic imports. On 2026-09-08, production HTML still emitted
speculative script hints for their dependencies through `vue-bundle-renderer` 2.1.2:
`getAllDependencies()` adds the entry's dynamic imports to `prefetch`. Those hints requested
the guide, import and exchange-house catalogues before rental analysis hydrated. They were
not NuxtLink's later visibility prefetches.

The policy identifies Vite dynamic entries by their original `utils/` source and shared chunks
by their preserved module basename, never by deployment-specific output hashes. Its allowlist
does not traverse into the common application entry, unrelated routes, styles or images.
`preload`, `imports`, `dynamicImports` and script execution remain unchanged: a guide still
preloads its catalogue when that guide is rendered, and its route validator can still load it.

`tests/unit/cataloguePrefetch.test.ts` uses the installed renderer to verify both the absence of
speculative hints and the presence of required module preloads. After deployment, inspect the
analysis HTML and a cold network trace: the eight catalogues must no longer occur among SSR
`rel="prefetch" as="script"` links. Separate cache reuse from transferred bytes when comparing
ResourceTiming entries, and continue to verify valid/invalid route slugs.
