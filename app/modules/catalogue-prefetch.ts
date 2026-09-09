import { defineNuxtModule } from '@nuxt/kit'
import { deferCataloguePrefetch } from './catalogue-prefetch/policy'

/** Local modules are discovered by Nuxt; no runtime plugin or config override is needed. */
export default defineNuxtModule({
  meta: { name: 'catalogue-prefetch' },
  setup(_options, nuxt) {
    nuxt.hook('build:manifest', deferCataloguePrefetch)
  },
})
