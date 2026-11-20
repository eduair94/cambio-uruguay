// @vitest-environment jsdom
// Regiones repetidas en componentes propios (axe `landmark-unique` y
// `landmark-complementary-is-top-level`, sondas del 19/11/2026). Ninguna es un anuncio de AdSense:
//  - ConLaTuyaBanner era un `<aside aria-label="Publicidad">`, el mismo nombre que cada unidad de
//    anuncio, así que la lista de regiones del lector de pantalla decía "Publicidad" una vez más. La
//    etiqueta VISIBLE "Publicidad" sigue adentro y es la que lo anuncia.
//  - AssistantCta era un `<aside>` montado DENTRO de la sección de resultados de /alquileres-uruguay
//    y de /monopatines-electricos-uruguay: un complementario tiene que ser de primer nivel. Una
//    `<section>` con nombre es una región, y una región sí puede ir anidada.
//  - ZoneBars era una `<section aria-label="Datos del barrio X">` por tarjeta: 22 regiones en la
//    página, Malvín siete veces con el mismo nombre. Un grupo con nombre no entra en la lista.
//  - PriceHistoryBlock, en las fichas de alquiler y venta, era una `<section>` nombrada por el h2 de
//    la sección que lo contiene: dos regiones con un nombre. Con `labelledBy` el padre ya es la región.
//  - /alquilar-estando-en-clearing usaba ContentTaskLinks dos veces con el mismo rótulo: dos `nav`
//    con un nombre.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as vue from 'vue'
import { afterEach, describe, expect, it } from 'vitest'

const APP = resolve(__dirname, '../..')
const read = (path: string) => readFileSync(resolve(APP, path), 'utf8')
const template = (path: string) => {
  const source = read(path)
  return source.slice(source.indexOf('<template>'), source.lastIndexOf('</template>'))
}
/** The first element of the template: the component's root. */
const rootTag = (path: string) => /<template>\s*(<[a-zA-Z][^>]*>)/.exec(template(path))?.[1] ?? ''

describe('root elements of the components axe flagged', () => {
  it('ConLaTuyaBanner is a plain block with no accessible name, and still SAYS it is an ad', () => {
    const root = rootTag('components/ConLaTuyaBanner.vue')
    expect(root).toMatch(/^<div\b/)
    expect(root).toContain('class="conlatuya-banner on-dark"')
    // The IntersectionObserver that counts the view still finds its element.
    expect(root).toContain('ref="banner"')
    expect(root).not.toMatch(/aria-label/)
    expect(template('components/ConLaTuyaBanner.vue')).not.toMatch(/<\/?aside\b/)
    expect(template('components/ConLaTuyaBanner.vue')).toContain(
      `<span class="conlatuya-banner__label">{{ $t('ads.label') }}</span>`
    )
  })

  it('AssistantCta is a named section (a region may nest), not a complementary landmark', () => {
    const root = rootTag('components/AssistantCta.vue')
    expect(root).toMatch(/^<section\b/)
    expect(root).toContain(`:aria-label="t('aria')"`)
    expect(root).toContain('data-testid="assistant-cta"')
    expect(template('components/AssistantCta.vue')).not.toMatch(/<\/?aside\b/)
  })

  it('ZoneBars is a named group, so 22 cards do not add 22 regions', () => {
    const root = rootTag('components/rentals/ZoneBars.vue')
    expect(root).toMatch(/^<div\b/)
    expect(root).toContain('role="group"')
    expect(root).toContain(`:aria-label="t('region', { name: zone.name })"`)
    expect(root).toContain('data-testid="rental-zone-bars"')
    expect(template('components/rentals/ZoneBars.vue')).not.toMatch(/<\/?section\b/)
  })

  it('the clearing page names its two navigations differently', () => {
    const page = read('pages/alquilar-estando-en-clearing.vue')
    const labels = [...page.matchAll(/<ContentTaskLinks[\s\S]*?:label="([^"]+)"/g)].map(m => m[1])
    expect(labels).toHaveLength(2)
    expect(new Set(labels).size).toBe(2)
    // The second one sits under the h2 "clearing.nextTitle" and takes that name.
    expect(labels[1]).toBe(`t('clearing.nextTitle')`)
    // An existing key, written in every language the page carries.
    const messages = read('utils/growthEntryMessages.ts')
    const clearingBlocks = [...messages.matchAll(/\n {4}clearing: \{([\s\S]*?)\n {4}\}/g)]
    expect(clearingBlocks.length).toBeGreaterThanOrEqual(3)
    for (const block of clearingBlocks) expect(block[1]).toMatch(/\n\s+nextTitle: '[^']+'/)
  })
})

// PriceHistoryBlock has logic (which tag, which name), so it is rendered for real.
function priceHistoryBlock() {
  const filename = resolve(APP, 'components/PriceHistoryBlock.vue')
  const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
  const source = compileScript(descriptor, { id: 'price-history-block', inlineTemplate: true })
  const { outputText } = ts.transpileModule(source.content, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const context = {
    exports: {} as { default?: vue.Component },
    require: (name: string) => {
      if (name === 'vue') return vue
      if (name === '~/utils/priceHistoryMessages') return { priceHistoryMessages: {} }
      throw new Error(`Unexpected import: ${name}`)
    },
    ...vue,
    useI18n: () => ({ t: (key: string) => key }),
  }
  runInNewContext(outputText, context)
  return context.exports.default as vue.Component
}

const SERIES = {
  currency: 'UYU',
  firstSeen: '2026-09-22',
  changePct: -5,
  currencySwitched: false,
  points: [
    { d: '2026-09-22', p: 20000 },
    { d: '2026-10-22', p: 19000 },
  ],
}

const apps: vue.App[] = []
afterEach(() => {
  apps.splice(0).forEach(app => app.unmount())
  document.body.replaceChildren()
})

function mount(props: Record<string, unknown>) {
  const root = document.createElement('div')
  document.body.append(root)
  const app = vue.createApp(priceHistoryBlock(), props)
  app.component('Sparkline', { render: () => vue.h('svg') })
  apps.push(app)
  app.mount(root)
  return root.firstElementChild as HTMLElement
}

describe('PriceHistoryBlock', () => {
  it('on its own it is a region named by its own h3', () => {
    const el = mount({ series: SERIES, id: 'car-price-history', title: 'Lo que pidió' })
    expect(el.tagName).toBe('SECTION')
    expect(el.getAttribute('aria-labelledby')).toBe('car-price-history-title')
    expect(el.querySelector('h3#car-price-history-title')?.textContent?.trim()).toBe('Lo que pidió')
    expect(el.classList.contains('price-history')).toBe(true)
  })

  it('inside a section that already names it, it is a plain block with no second name', () => {
    const el = mount({
      series: SERIES,
      id: 'rental-price-history',
      bare: true,
      labelledBy: 'rental-price-history-title',
    })
    expect(el.tagName).toBe('DIV')
    expect(el.hasAttribute('aria-labelledby')).toBe(false)
    expect(el.querySelector('h3')).toBeNull()
    // Same classes, so the same look.
    expect(el.classList.contains('price-history')).toBe(true)
    expect(el.classList.contains('price-history--bare')).toBe(true)
    // Same content: the lead, the plot and the method note are all still there.
    expect(el.querySelector('.price-history__lead strong.is-down')).not.toBeNull()
    expect(el.querySelector('.price-history__plot svg')).not.toBeNull()
    expect(el.querySelector('.price-history__note')).not.toBeNull()
  })

  it('renders nothing without a series', () => {
    const root = document.createElement('div')
    document.body.append(root)
    const app = vue.createApp(priceHistoryBlock(), { series: null })
    apps.push(app)
    app.mount(root)
    expect(root.querySelector('section, div')).toBeNull()
  })
})
