import { existsSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { defineNuxtModule } from '@nuxt/kit'
import type { NuxtPage } from 'nuxt/schema'
import {
  deferCataloguePrefetch,
  moduleNames,
  pagesWithoutChunk,
  type CataloguePrefetchOptions,
} from './catalogue-prefetch/policy'

const namesIn = (dir: string): string[] => (existsSync(dir) ? moduleNames(readdirSync(dir)) : [])

function pageSources(pages: NuxtPage[], srcDir: string): string[] {
  const sources: string[] = []
  for (const page of pages) {
    if (page.file && page.mode !== 'server')
      sources.push(relative(srcDir, page.file).replace(/\\/g, '/'))
    if (page.children?.length) sources.push(...pageSources(page.children, srcDir))
  }
  return sources
}

/** Local modules are discovered by Nuxt; no runtime plugin or config override is needed. */
export default defineNuxtModule({
  meta: { name: 'catalogue-prefetch' },
  setup(_options, nuxt) {
    nuxt.hook('build:manifest', manifest => {
      const { srcDir } = nuxt.options
      const options: CataloguePrefetchOptions = {
        utilsModules: namesIn(join(srcDir, 'utils')),
        servicesModules: namesIn(join(srcDir, 'services')),
        pageSources: pageSources(nuxt.apps.default?.pages ?? [], srcDir),
      }
      deferCataloguePrefetch(manifest, options)
      // The dev manifest lists only the entry: there is nothing to check there.
      if (nuxt.options.dev) return
      for (const page of pagesWithoutChunk(manifest, options.pageSources ?? []))
        console.warn(
          `[catalogue-prefetch] ${page} has no chunk of its own: on its route its CSS is not` +
            ' linked and its JS is not preloaded, and every page prefetches it. Usually a lazy' +
            ' import in it uses a module that only this page uses (see' +
            ' modules/catalogue-prefetch/README.md, "A chunk without a facade").'
        )
    })
  },
})
