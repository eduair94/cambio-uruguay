import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from '@vue/compiler-sfc'
import { describe, expect, it } from 'vitest'

// /historico/<casa>/<moneda> (las 16 páginas, ~600 vistas en 28 días, prex/usd y brou/usd entre las
// seis más vistas del sitio). Medido en producción el 2026-11-19 a 390 px: las columnas Compra y
// Venta de la tabla salían en blanco. La regla scoped `.v-chip { background: rgba(255,255,255,.15)
// !important }` era el "vidrio" de los dos chips del encabezado azul, pero un estilo scoped alcanza
// también al contenido de los slots que este mismo archivo le pasa a VDataTable: los chips `flat`
// de compra y venta perdían su fondo rojo/naranja/verde y quedaban con texto blanco sobre la tarjeta
// blanca. El chip "usd" del encabezado tampoco se leía (naranja sobre vidrio). La misma corrida de axe
// marcó el selector de período sin nombre (`label`, crítico) y el <canvas role="img"> del gráfico sin
// nombre (`role-img-alt`), porque el nombre estaba en el div que lo envuelve.

const filename = resolve(__dirname, '../../pages/historico/[origin]/[currency]/[[type]].vue')
const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })

interface Rule {
  selectors: string[]
  body: string
  scoped: boolean
}

const rules: Rule[] = descriptor.styles.flatMap(style =>
  [
    ...style.content
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // @keyframes nests braces; its steps are not selectors.
      .replace(/@keyframes[^{]*\{(?:[^{}]*\{[^}]*\})*\s*\}/g, '')
      .matchAll(/([^{}]+)\{([^}]*)\}/g),
  ].map(([, selector, body]) => ({
    selectors: selector!
      .split(',')
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean),
    body: body!,
    scoped: Boolean(style.scoped),
  }))
)

interface El {
  tag: string
  props: any[]
  children: any[]
}

const ELEMENT = 1
const ATTRIBUTE = 6
const DIRECTIVE = 7

function elements(node: any = descriptor.template!.ast): El[] {
  const out: El[] = []
  for (const child of node.children ?? []) {
    if (child.type === ELEMENT) out.push(child, ...elements(child))
    else if (child.children) out.push(...elements(child))
    // v-if / v-for branches
    if (child.branches) for (const b of child.branches) out.push(...elements(b))
  }
  return out
}

const all = elements()
const isTag = (el: El, ...names: string[]) =>
  names.some(n => el.tag.toLowerCase().replace(/-/g, '') === n.toLowerCase())
const attr = (el: El, name: string): string | undefined =>
  el.props.find(p => p.type === ATTRIBUTE && p.name === name)?.value?.content
const bound = (el: El, name: string): string | undefined =>
  el.props.find(p => p.type === DIRECTIVE && p.name === 'bind' && p.arg?.content === name)?.exp
    ?.content
const hasAttrOrBind = (el: El, name: string) =>
  attr(el, name) !== undefined || bound(el, name) !== undefined
const classes = (el: El) => (attr(el, 'class') ?? '').split(/\s+/).filter(Boolean)

/** All descendant elements of `root`. */
const inside = (root: El) => elements(root)

describe('historico detail: chips', () => {
  it('no scoped rule targets every chip of the page through a bare .v-chip', () => {
    const offenders = rules
      .filter(r => r.scoped)
      .flatMap(r => r.selectors)
      // a compound that is `.v-chip` alone (optionally with pseudo-classes) anywhere in the selector
      .filter(s =>
        s.split(/\s*[>+~]\s*|\s+/).some(c => /^\.v-chip(?::[\w-]+(?:\(.*\))?)*$/.test(c))
      )
    expect(offenders).toEqual([])
  })

  it('keeps the glass look on the header chips only, with white text', () => {
    const rule = rules.find(r => r.scoped && r.selectors.includes('.hero-chip'))
    expect(rule).toBeDefined()
    expect(rule!.body).toMatch(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.15\)\s*!important/)
    // The tonal chip's colour comes from `.text-secondary` / `.text-accent`, both !important.
    expect(rule!.body).toMatch(/color:\s*#fff\s*!important/)
  })

  it('marks exactly the two header chips with hero-chip', () => {
    const chips = all.filter(el => isTag(el, 'vchip'))
    const hero = chips.filter(el => classes(el).includes('hero-chip'))
    expect(hero.map(el => attr(el, 'color'))).toEqual(['secondary', 'accent'])
  })

  it('leaves the table chips (buy, sell, type) without hero-chip', () => {
    const table = all.find(el => isTag(el, 'vdatatable'))
    expect(table).toBeDefined()
    const tableChips = inside(table!).filter(el => isTag(el, 'vchip'))
    expect(tableChips.length).toBe(3)
    for (const chip of tableChips) expect(classes(chip)).not.toContain('hero-chip')
  })
})

describe('historico detail: names for the period select and the chart', () => {
  it('the period select has an accessible name', () => {
    const selects = all.filter(el => isTag(el, 'vselect'))
    expect(selects.length).toBe(1)
    expect(attr(selects[0]!, 'aria-label')).toBe('Período de análisis')
  })

  it('the canvas (Line and Bar) carries the name, the wrapper has no role', () => {
    const line = all.find(el => el.tag === 'Line')
    const bar = all.find(el => el.tag === 'Bar')
    expect(line).toBeDefined()
    expect(bar).toBeDefined()
    expect(bound(line!, 'aria-label')).toBeTruthy()
    expect(bound(bar!, 'aria-label')).toBe(bound(line!, 'aria-label'))

    const wrapper = all.find(
      el =>
        classes(el).includes('chart-container') ||
        (bound(el, 'class') ?? '').includes('chart-container')
    )
    expect(wrapper).toBeDefined()
    expect(hasAttrOrBind(wrapper!, 'role')).toBe(false)
    expect(hasAttrOrBind(wrapper!, 'aria-label')).toBe(false)
  })
})

describe('historico detail: phone layout', () => {
  it('the chart title text sits in a wrapping span (v-card-title is nowrap)', () => {
    const chartBlock = all.find(el => el.tag === 'Line')
    expect(chartBlock).toBeDefined()
    const titles = all.filter(el => isTag(el, 'vcardtitle'))
    const chartTitle = titles.find(t => inside(t).some(el => isTag(el, 'vbtntoggle')))
    expect(chartTitle).toBeDefined()
    const span = chartTitle!.children.find(
      (c: any) => c.type === ELEMENT && c.tag === 'span' && classes(c).includes('text-wrap')
    )
    expect(span).toBeDefined()
    // no loose text or interpolation left directly in the title
    const loose = chartTitle!.children.filter(
      (c: any) => (c.type === 2 && c.content.trim()) || c.type === 5
    )
    expect(loose).toEqual([])
  })

  it('the source buttons share one wrapping row instead of a full-width column', () => {
    const rows = all.filter(el =>
      inside(el).some(
        c => isTag(c, 'vbtn') && (bound(c, 'href') ?? '').includes('BCU_HISTORY_SOURCE')
      )
    )
    const row = rows.at(-1)
    expect(row).toBeDefined()
    expect(classes(row!)).toEqual(expect.arrayContaining(['d-flex', 'flex-row', 'flex-wrap']))
    expect(classes(row!)).not.toContain('flex-column')
  })
})
