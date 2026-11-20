import { readFileSync } from 'node:fs'
import { register } from 'node:module'
import { join } from 'node:path'
import { createSSRApp, h, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createMemoryHistory, createRouter } from 'vue-router'
import { en, es, pt } from 'vuetify/locale'
import { beforeAll, describe, expect, it } from 'vitest'
import { dateLocale } from '../../utils/format'
import { EXTRA_LOCALE_CODES, RTL_LOCALE_CODES } from '../../utils/locales'
import {
  VUETIFY_DATE_LOCALES,
  VUETIFY_MESSAGE_LOCALES,
  followRouteLocale,
  vuetifyLocaleFor,
} from '../../utils/vuetifyLocale'

// Vuetify ran in 'en' with no messages on every page, so the Spanish site printed "Items per page:"
// and "1-10 of 185" under its tables (server HTML included) and named its buttons "Next page" for
// screen readers. These pin the rule, what it renders, and how the plugin wires it.

const APP = join(__dirname, '..', '..')
const withoutComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '')
const plugin = withoutComments(readFileSync(join(APP, 'plugins/vuetify.ts'), 'utf8'))

// Vitest hands node_modules to Node itself, and every Vuetify component imports its own .css, which
// Node cannot load. A loader hook turns those into empty modules so a real VDataTable renders here.
const EMPTY_CSS = `export async function load(url, context, next) {
  if (url.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true }
  return next(url, context)
}`
let createVuetify: typeof import('vuetify').createVuetify
let VDataTable: typeof import('vuetify/components/VDataTable').VDataTable
beforeAll(async () => {
  register(`data:text/javascript,${encodeURIComponent(EMPTY_CSS)}`)
  ;({ createVuetify } = await import('vuetify'))
  ;({ VDataTable } = await import('vuetify/components/VDataTable'))
})

describe('vuetifyLocaleFor', () => {
  it('speaks Spanish on unprefixed (Spanish) paths', () => {
    expect(vuetifyLocaleFor('/')).toBe('es')
    expect(vuetifyLocaleFor('/historico/prex/usd')).toBe('es')
    expect(vuetifyLocaleFor('/sucursales/brou')).toBe('es')
    // A first segment that only starts like a prefix is still Spanish.
    expect(vuetifyLocaleFor('/enlaces')).toBe('es')
    expect(vuetifyLocaleFor('/pto')).toBe('es')
    expect(vuetifyLocaleFor('/arbitraje')).toBe('es')
  })

  it('speaks English and Portuguese on their own prefixes', () => {
    expect(vuetifyLocaleFor('/en')).toBe('en')
    expect(vuetifyLocaleFor('/en/x')).toBe('en')
    expect(vuetifyLocaleFor('/pt')).toBe('pt')
    expect(vuetifyLocaleFor('/pt/historico')).toBe('pt')
  })

  it('keeps every right-to-left code, so Vuetify still mirrors those pages', () => {
    expect(vuetifyLocaleFor('/ar/x')).toBe('ar')
    for (const code of RTL_LOCALE_CODES) {
      expect(vuetifyLocaleFor(`/${code}`)).toBe(code)
      expect(vuetifyLocaleFor(`/${code}/historico`)).toBe(code)
    }
  })

  it('leaves the other machine-translated locales in English, as before', () => {
    for (const code of EXTRA_LOCALE_CODES.filter(code => !RTL_LOCALE_CODES.includes(code))) {
      expect(vuetifyLocaleFor(`/${code}/historico`), code).toBe('en')
    }
  })

  it('only ever returns a locale with messages, or an RTL code that falls back to them', () => {
    const paths = ['/', '/x', '/en/x', '/pt/x', ...EXTRA_LOCALE_CODES.map(code => `/${code}/x`)]
    for (const path of paths) {
      const code = vuetifyLocaleFor(path)
      const known = (VUETIFY_MESSAGE_LOCALES as readonly string[]).includes(code)
      expect(known || RTL_LOCALE_CODES.includes(code), path).toBe(true)
    }
  })
})

describe('the messages Vuetify prints', () => {
  it('has the Spanish table footer the task measured for', () => {
    expect(es.dataFooter.itemsPerPageText).toBe('Elementos por página:')
    expect(es.dataFooter.pageText).toBe('{0}-{1} de {2}')
    expect(pt.dataFooter.itemsPerPageText).toBe('Itens por página:')
    expect(en.dataFooter.itemsPerPageText).toBe('Items per page:')
  })

  function renderTable(locale: string) {
    const vuetify = createVuetify({
      ssr: true,
      locale: {
        locale,
        fallback: 'en',
        messages: { en, es, pt },
        rtl: Object.fromEntries(RTL_LOCALE_CODES.map(code => [code, true])),
      },
    })
    const items = Array.from({ length: 185 }, (_, index) => ({ id: index + 1 }))
    const app = createSSRApp({
      render: () => h(VDataTable, { items, headers: [{ title: 'Id', key: 'id' }] }),
    })
    app.use(vuetify)
    return renderToString(app)
  }

  it('renders the footer of a Spanish page in Spanish on the server', async () => {
    const html = await renderTable(vuetifyLocaleFor('/historico/prex/usd'))
    expect(html).toContain('Elementos por página:')
    expect(html).toContain('1-10 de 185')
    expect(html).not.toContain('Items per page')
    expect(html).not.toContain(' of 185')
  })

  it('renders /en in English and /pt in Portuguese', async () => {
    expect(await renderTable(vuetifyLocaleFor('/en/historico'))).toContain('Items per page:')
    expect(await renderTable(vuetifyLocaleFor('/pt/historico'))).toContain('Itens por página:')
  })

  it('still lays out a right-to-left page right to left, with the English fallback text', async () => {
    const html = await renderTable(vuetifyLocaleFor('/ar/historico'))
    expect(html).toContain('v-locale--is-rtl')
    expect(html).toContain('Items per page:')
    expect(await renderTable('es')).toContain('v-locale--is-ltr')
  })

  it('formats dates with the same tags as dateLocale(): setiembre, not septiembre', () => {
    expect(VUETIFY_DATE_LOCALES.es).toBe(dateLocale('es'))
    expect(VUETIFY_DATE_LOCALES.pt).toBe(dateLocale('pt'))
  })
})

describe('followRouteLocale: a language switch inside the SPA', () => {
  function setup(start: string) {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:all(.*)*', component: { render: () => null } }],
    })
    const current = ref(vuetifyLocaleFor(start))
    followRouteLocale(router, current)
    return { router, current }
  }

  it('follows /x → /en/x → /pt/x → /x', async () => {
    const { router, current } = setup('/x')
    await router.push('/x')
    expect(current.value).toBe('es')
    await router.push('/en/x')
    expect(current.value).toBe('en')
    await router.push('/pt/x')
    expect(current.value).toBe('pt')
    await router.push('/x')
    expect(current.value).toBe('es')
  })

  it('keeps the locale when the navigation is cancelled (the reload to a translated locale)', async () => {
    const { router, current } = setup('/x')
    await router.push('/x')
    router.beforeEach(to => !to.path.startsWith('/fr'))
    await router.push('/fr/x')
    expect(router.currentRoute.value.path).toBe('/x')
    expect(current.value).toBe('es')
  })
})

describe('plugins/vuetify.ts wiring', () => {
  it('imports exactly the bundles the rule needs, by name (never the whole locale index)', () => {
    const imported = plugin.match(/import \{([^}]*)\} from 'vuetify\/locale'/)?.[1] ?? ''
    expect(
      imported
        .split(',')
        .map(name => name.trim())
        .filter(Boolean)
        .sort()
    ).toEqual([...VUETIFY_MESSAGE_LOCALES].sort())
    expect(plugin).not.toMatch(/import \* as \w+ from 'vuetify\/locale'/)
    expect(plugin).not.toMatch(/from 'vuetify\/locale\/(?!adapters)/)
    expect(plugin).toMatch(/messages:\s*\{\s*en,\s*es,\s*pt\s*\}/)
  })

  it('takes the locale from the rule and keeps the RTL map and the English fallback', () => {
    expect(plugin).toMatch(/locale:\s*vuetifyLocaleFor\(path\)/)
    expect(plugin).toMatch(/fallback:\s*'en'/)
    expect(plugin).toMatch(
      /rtl:\s*Object\.fromEntries\(RTL_LOCALE_CODES\.map\(code => \[code, true\]\)\)/
    )
    expect(plugin).toMatch(/date:\s*\{\s*locale:\s*\{\s*\.\.\.VUETIFY_DATE_LOCALES\s*\}\s*\}/)
  })

  it('reads the same path on the server and the client, and follows the router only in the browser', () => {
    expect(plugin).toMatch(
      /import\.meta\.server \? useRequestURL\(\)\.pathname : window\.location\.pathname/
    )
    const follow = plugin.indexOf('followRouteLocale(')
    expect(follow).toBeGreaterThan(-1)
    expect(plugin.slice(0, follow)).toMatch(/if \(import\.meta\.client\)\s*$/)
    expect(plugin).toMatch(/followRouteLocale\(useRouter\(\), vuetify\.locale\.current\)/)
  })
})
