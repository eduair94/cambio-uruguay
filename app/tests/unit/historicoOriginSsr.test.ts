import * as bcuHistory from '../../utils/bcuHistory'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import { createError } from 'h3'
import ts from 'typescript'
import * as vue from 'vue'
import { describe, expect, it, vi } from 'vitest'
import * as format from '../../utils/format'
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
  // Records every key + params the page asks i18n for, so the test can prove the
  // description lead goes through a locale key (it used to be a Spanish literal).
  const t = vi.fn(
    (key: string, params?: Record<string, unknown>) => `${key} ${params?.origin ?? ''}`
  )
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
        return { useI18n: () => ({ t, locale: vue.ref('es') }) }
      }
      if (name === 'vuetify') return { useDisplay: () => ({ smAndDown: vue.ref(false) }) }
      if (name === '@/utils/rateSource') return rates
      if (name === '@/utils/bcuHistory') return bcuHistory
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
    // Nuxt auto-import (utils/format.ts): the page formats its SEO figures in the
    // reader's locale through it, so the VM context needs the real one.
    dateLocale: format.dateLocale,
    createError,
  }
  runInNewContext(outputText, context)
  const setup = context.exports.default.setup({}, { expose: () => {} })
  return { setup, seo, head, t }
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
    const { setup, seo, head, t } = setupHistory('brou', quotes)
    const page = await setup
    expect(page.filteredItems.value).toEqual([{ ...quotes[1], spread: 5 }])
    for (let i = 0; i < 2; i++) {
      expect(page.usdToday.value).toEqual({ buy: 40, sell: 42 })
      // The lead is a locale key with the casa's own figures, followed by the base
      // sentence — never a Spanish literal in front of an English/Portuguese base.
      expect(seo.mock.calls[0][0].description()).toBe(
        'seo.historicalOriginLead BROU seo.historicalOriginDescription BROU'
      )
      expect(t).toHaveBeenCalledWith('seo.historicalOriginLead', {
        origin: 'BROU',
        buy: '40,00',
        sell: '42,00',
      })
      expect(head.mock.calls[0][0]().link[0].href).toBe('https://cambio-uruguay.com/historico/brou')
    }
  })

  it('keeps the indexed-unit fallback for an origin without a dollar quote', async () => {
    const { setup, seo } = setupHistory('bcu', quotes)
    const page = await setup
    expect(page.usdToday.value).toBeNull()
    expect(seo.mock.calls[0][0].description()).toBe(bcuHistory.bcuHistoryCopy('es').hubDescription)
    expect(page.headers.value.map((header: { key: string }) => header.key)).toEqual([
      'code',
      'type',
      'reference',
      'date',
      'name',
    ])
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

// Medido el 2026-09-22: /en/historico/itau salía en Google con «Dólar en Itaú hoy:
// compra $38,77, venta $41,37.» delante de una frase en inglés — el único trozo de
// la meta que no pasaba por i18n. Ahora cada trozo del encabezado es una clave.
describe('la primera frase de la descripción sale de claves i18n, no de un literal', () => {
  it('un origen sin dólar describe lo que publica, pieza por pieza, con claves', async () => {
    const board = [
      ...quotes,
      { origin: 'gales', code: 'EUR', type: '', buy: 45, sell: 47, name: 'Euro' },
      { origin: 'gales', code: 'UI', type: '', buy: 6.5, sell: 6.5, name: 'Unidad Indexada' },
    ]
    const { setup, seo, t } = setupHistory('gales', board)
    const page = await setup
    expect(page.usdToday.value).toBeNull()
    const description = seo.mock.calls[0][0].description()
    expect(description.startsWith('seo.historicalOriginLeadOther ')).toBe(true)
    expect(description).not.toMatch(/hoy|compra|venta/)
    expect(t).toHaveBeenCalledWith('seo.historicalOriginPairPart', {
      code: 'EUR',
      buy: '45,00',
      sell: '47,00',
    })
    // A unit has one value: no invented spread.
    expect(t).toHaveBeenCalledWith('seo.historicalOriginUnitPart', { code: 'UI', value: '6,50' })
    expect(t).toHaveBeenCalledWith(
      'seo.historicalOriginLeadOther',
      expect.objectContaining({ parts: expect.stringContaining(' · ') })
    )
  })

  it('la cifra se formatea en el idioma de la página, no en es-UY fijo', () => {
    // The page derives its number locale from `dateLocale(locale)`; pin the mapping
    // the description depends on so a change there is a deliberate one.
    expect(format.dateLocale('en')).toBe('en-US')
    expect((40).toLocaleString(format.dateLocale('en'), { minimumFractionDigits: 2 })).toBe('40.00')
    expect((40).toLocaleString(format.dateLocale('es'), { minimumFractionDigits: 2 })).toBe('40,00')
  })
})
