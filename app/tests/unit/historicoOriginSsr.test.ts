import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import { createError } from 'h3'
import ts from 'typescript'
import * as vue from 'vue'
import { describe, expect, it, vi } from 'vitest'
import * as rates from '../../utils/rateSource'

// Run the real page setup: an exception in its items computed used to turn the
// intended 404 into an undefined .filter() while Unhead evaluated the SEO tags.
const filename = resolve(__dirname, '../../pages/historico/[origin]/index.vue')
const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
const script = compileScript(descriptor, { id: 'historico-origin-ssr-test' })
const { outputText } = ts.transpileModule(script.content, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})

function setupHistory(origin: string, payload: unknown) {
  const seo = vi.fn()
  const head = vi.fn()
  const route = { params: { origin }, query: {}, path: `/historico/${origin}` }
  const context = {
    exports: {} as any,
    require: (name: string) => {
      if (name === 'vue') {
        return {
          ...vue,
          onMounted: () => {},
          watch: () => {},
          withAsyncContext: (fn: () => unknown) => [fn(), () => {}],
        }
      }
      if (name === 'vue-router') {
        return { useRoute: () => route, useRouter: () => ({ replace: vi.fn() }) }
      }
      if (name === 'vue-i18n') {
        return {
          useI18n: () => ({
            t: (key: string, params?: { origin: string }) => `${key} ${params?.origin ?? ''}`,
            locale: vue.ref('es'),
          }),
        }
      }
      if (name === 'vuetify') return { useDisplay: () => ({ smAndDown: vue.ref(false) }) }
      if (name === '@/utils/rateSource') return rates
      throw new Error(`Unexpected import: ${name}`)
    },
    useApiService: () => ({ getExchangeData: async () => payload }),
    useAsyncData: async (
      _key: string,
      fetch: () => Promise<unknown>,
      options: { default: () => unknown }
    ) => {
      const data = vue.ref(options.default())
      const error = vue.ref<unknown>(null)
      try {
        data.value = await fetch()
      } catch (cause) {
        error.value = cause
      }
      return { data, error, pending: vue.ref(false), refresh: vi.fn() }
    },
    useLocalePath: () => (path: string) => path,
    useSeoMeta: seo,
    useHead: head,
    defineOgImageComponent: vi.fn(),
    createError,
  }
  runInNewContext(outputText, context)
  const setup = context.exports.default.setup({}, { expose: () => {} })
  return { setup, seo, head }
}

const quotes = [
  { origin: 'itau', code: 'USD', type: '', buy: 39, sell: 43, name: 'Dólar' },
  { origin: 'brou', code: 'USD', type: 'BILLETE', buy: 40, sell: 42, name: 'Dólar' },
  { origin: 'bcu', code: 'UI', type: '', buy: 6.5, sell: 6.5, name: 'Unidad Indexada' },
]

describe('historical origin SSR and metadata', () => {
  it('rejects an unknown origin with 404 before registering reactive head entries', async () => {
    const { setup, seo, head } = setupHistory('no-existe', quotes)
    await expect(setup).rejects.toMatchObject({ statusCode: 404 })
    expect(seo).not.toHaveBeenCalled()
    expect(head).not.toHaveBeenCalled()
  })

  it('renders the chosen origin and evaluates its SEO repeatedly without using another rate', async () => {
    const { setup, seo, head } = setupHistory('brou', quotes)
    const page = await setup
    expect(page.filteredItems.value).toEqual([{ ...quotes[1], spread: 5 }])
    for (let i = 0; i < 2; i++) {
      expect(page.usdToday.value).toEqual({ buy: 40, sell: 42 })
      expect(seo.mock.calls[0][0].description()).toContain('Dólar en BROU hoy: compra $40,00')
      expect(head.mock.calls[0][0]().link[0].href).toBe('https://cambio-uruguay.com/historico/brou')
    }
  })

  it('keeps the indexed-unit fallback for an origin without a dollar quote', async () => {
    const { setup, seo } = setupHistory('bcu', quotes)
    const page = await setup
    expect(page.usdToday.value).toBeNull()
    expect(seo.mock.calls[0][0].description()).toContain('BCU hoy: UI $6,50')
  })

  it.each([[], { error: 'Backend unavailable' }])(
    'does not infer an unknown origin from an unavailable or empty price board: %j',
    async payload => {
      const { setup, seo } = setupHistory('brou', payload)
      const page = await setup
      expect(page.filteredItems.value).toEqual([])
      expect(page.usdToday.value).toBeNull()
      expect(seo.mock.calls[0][0].description()).toBe('seo.historicalOriginDescription BROU')
    }
  )
})
