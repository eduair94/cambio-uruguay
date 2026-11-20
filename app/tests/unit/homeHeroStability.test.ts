// El hero de la home: lo que se movía solo y lo que era chico para el dedo.
//
// Medido en producción el 2026-11-19 con los anuncios BLOQUEADOS (wf/ui/home.md, F2/F3/F9/F10), o
// sea que todo lo que se movía era de la página:
// - 0,778 de CLS a 390 px y 0,29 a 360 px con un único origen, `.hero-section::before`. Su `top` y
//   su `height` eran porcentajes de un hero de ~4.500 px, así que cualquier cambio de alto del hero
//   lo movía, y Chrome contaba la caja transparente entera (390x657) como desplazada.
// - DollarMomentum, la fila del tour y SavingsHighlight estaban en <ClientOnly> SIN fallback:
//   aparecían después de hidratar y empujaban el conversor (0,345 en una visita que vuelve).
// - El H1 y el subtítulo entraban desde opacity 0: el LCP esperaba a la animación.
// - El botón de sentido medía 23-28 px de ancho, apretado por una columna de 2/12.
// - Las tarjetas de cotización partían «estadounidens-es» por la mitad en el teléfono.
// - Los atajos de monto y de par medían 26 px de alto, «Copiar resultado» 28 y «Ver detalle» 20:
//   los objetivos más tocados de la página.
//
// La página no se puede montar acá (3.500 líneas de Nuxt + Vuetify): la plantilla se lee como AST
// y el CSS como reglas. DollarMomentum y su esqueleto sí se renderizan de verdad.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  parse,
  type AttributeNode,
  type DirectiveNode,
  type ElementNode,
  type TemplateChildNode,
} from '@vue/compiler-sfc'
import * as vue from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'
import { compileComponent, evaluateComponent, registerStubs } from './helpers/sfc'

const APP = join(__dirname, '..', '..')

// @vue/compiler-core's NodeTypes (a const enum, not exported at runtime by compiler-sfc).
const NodeTypes = { ELEMENT: 1, SIMPLE_EXPRESSION: 4, ATTRIBUTE: 6, DIRECTIVE: 7 } as const

function sfc(path: string) {
  const filename = join(APP, path)
  const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
  const css = descriptor.styles
    .map(style => style.content.replace(/\/\*[\s\S]*?\*\//g, ''))
    .join('\n')
  return { ast: descriptor.template!.ast!, template: descriptor.template!.content, css }
}

type Rule = { selectors: string[]; body: string }

/** Every innermost `selector { body }` of the stylesheet (native nesting included). */
function rules(css: string): Rule[] {
  const out: Rule[] = []
  for (const match of css.matchAll(/([^{};]+)\{([^{}]*)\}/g)) {
    out.push({
      selectors: match[1]!
        .split(',')
        .map(s => s.trim().replace(/\s+/g, ' '))
        .filter(Boolean),
      body: match[2]!,
    })
  }
  return out
}

/** The bodies of every rule whose selector list contains `selector` exactly. */
function bodiesFor(css: string, selector: string): string[] {
  return rules(css)
    .filter(rule => rule.selectors.includes(selector))
    .map(rule => rule.body)
}

function declaration(bodies: string[], property: string): string | undefined {
  for (const body of bodies) {
    const match = body.match(new RegExp(`(?:^|[;\\s])${property}\\s*:\\s*([^;]+)`))
    if (match)
      return match[1]!.trim().replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')
  }
  return undefined
}

/** The body of `@keyframes name { ... }`, braces balanced. */
function keyframes(css: string, name: string): string {
  const start = css.search(new RegExp(`@keyframes\\s+${name}\\s*\\{`))
  expect(start, `@keyframes ${name}`).toBeGreaterThanOrEqual(0)
  let depth = 0
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++
    if (css[i] === '}' && --depth === 0) return css.slice(css.indexOf('{', start) + 1, i)
  }
  throw new Error(`unbalanced @keyframes ${name}`)
}

/** The inside of every `@media <query> { ... }` block, braces balanced. */
function media(css: string, query: string): string {
  const out: string[] = []
  const head = new RegExp(`@media\\s*${query.replace(/[()]/g, '\\$&')}\\s*\\{`, 'g')
  for (const match of css.matchAll(head)) {
    const open = match.index! + match[0].length - 1
    let depth = 0
    for (let i = open; i < css.length; i++) {
      if (css[i] === '{') depth++
      if (css[i] === '}' && --depth === 0) {
        out.push(css.slice(open + 1, i))
        break
      }
    }
  }
  expect(out.length, `@media ${query}`).toBeGreaterThan(0)
  return out.join('\n')
}

function isElement(node: TemplateChildNode): node is ElementNode {
  return node.type === NodeTypes.ELEMENT
}

function* elements(node: { children?: TemplateChildNode[] }): Generator<ElementNode> {
  for (const child of node.children ?? []) {
    if (!isElement(child)) continue
    yield child
    yield* elements(child)
  }
}

function attr(el: ElementNode, name: string): string | undefined {
  const found = el.props.find(
    (p): p is AttributeNode => p.type === NodeTypes.ATTRIBUTE && p.name === name
  )
  return found ? (found.value?.content ?? '') : undefined
}

function classes(el: ElementNode): string[] {
  return (attr(el, 'class') ?? '').split(/\s+/).filter(Boolean)
}

function hasSlot(el: ElementNode, slot: string): boolean {
  return el.children.some(
    child =>
      isElement(child) &&
      child.tag === 'template' &&
      child.props.some(
        (p): p is DirectiveNode =>
          p.type === NodeTypes.DIRECTIVE &&
          p.name === 'slot' &&
          p.arg?.type === NodeTypes.SIMPLE_EXPRESSION &&
          p.arg.content === slot
      )
  )
}

const home = sfc('pages/index.vue')
const hero = [...elements(home.ast)].find(
  el => el.tag === 'section' && classes(el).includes('hero-section')
)!

describe('the hero spotlight does not follow the hero height', () => {
  it('the hero section exists', () => {
    expect(hero).toBeDefined()
  })

  it('there is no positioned pseudo-element sized in percentages of the hero', () => {
    for (const pseudo of ['::before', '::after']) {
      const bodies = bodiesFor(home.css, `.hero-section${pseudo}`)
      for (const property of ['top', 'inset', 'height', 'bottom']) {
        const value = declaration(bodies, property)
        expect(value ?? '', `.hero-section${pseudo} ${property}`).not.toMatch(/%/)
      }
    }
    expect(bodiesFor(home.css, '.hero-section::before')).toEqual([])
  })

  it('the same gradient is a background of the section with a size and offset in px', () => {
    const bodies = bodiesFor(home.css, '.hero-section')
    const image = declaration(bodies, 'background-image') ?? ''
    expect(image).toMatch(/radial-gradient\(58% 100% at 50% 0%, rgba\(99, 102, 241, 0\.2\)/)
    expect(declaration(bodies, 'background-repeat')).toBe('no-repeat')
    // Width follows the section (it did: 120 % of it), height and offset never do.
    expect(declaration(bodies, 'background-size')).toMatch(/^120% \d+px$/)
    expect(declaration(bodies, 'background-position')).toMatch(/^50% -\d+px$/)
    for (const body of rules(home.css)
      .filter(r => r.selectors.includes('.hero-section'))
      .map(r => r.body)) {
      const size = body.match(/background-size\s*:\s*([^;]+)/)?.[1]
      if (size) expect(size.trim()).toMatch(/^120% \d+px$/)
    }
  })
})

describe('nothing inside the hero pops in after hydration', () => {
  const clientOnly = [...elements(hero)].filter(el => el.tag === 'ClientOnly')

  it('every <ClientOnly> inside section.hero-section has a #fallback', () => {
    expect(clientOnly.length).toBeGreaterThan(0)
    for (const el of clientOnly) expect(hasSlot(el, 'fallback'), el.loc.source).toBe(true)
  })

  it('DollarMomentum falls back to its own skeleton, inside the animated wrapper', () => {
    const wrapper = [...elements(hero)].find(el => classes(el).includes('hero-live'))!
    expect(classes(wrapper)).toEqual(expect.arrayContaining(['hero-live', 'hero-anim', 'mb-6']))
    // The animation lives on a node that survives hydration: on the swapped node it would run
    // twice (the card would vanish and fade in again).
    expect(wrapper.tag).toBe('div')
    const only = [...elements(wrapper)].find(el => el.tag === 'ClientOnly')!
    expect([...elements(only)].map(el => el.tag)).toEqual(
      expect.arrayContaining(['DollarMomentum', 'DollarMomentumSkeleton'])
    )
  })

  it('the tour button and the savings card are rendered by the server', () => {
    for (const el of clientOnly) {
      const inside = [...elements(el)].map(child => child.tag)
      expect(inside).not.toContain('SiteTour')
      expect(inside).not.toContain('SavingsHighlight')
    }
    const tags = [...elements(hero)].map(el => el.tag)
    expect(tags).toContain('SiteTour')
    expect(tags).toContain('SavingsHighlight')
  })
})

describe('the H1 and the subtitle are visible from the first paint', () => {
  for (const name of ['title', 'subtitle']) {
    it(`.hero-${name} animates transform only`, () => {
      const animation =
        declaration(bodiesFor(home.css, `.hero-${name}.hero-anim`), 'animation-name') ??
        declaration(bodiesFor(home.css, `.hero-${name}.hero-anim`), 'animation')?.split(/\s+/)[0]
      expect(animation, `.hero-${name}.hero-anim animation`).toBeDefined()
      const frames = keyframes(home.css, animation!)
      expect(frames).not.toMatch(/opacity/)
      expect(frames).toMatch(/transform/)
    })
  }

  it('the other hero items keep their fade', () => {
    expect(declaration(bodiesFor(home.css, '.hero-anim'), 'animation')).toMatch(/^fadeInUp /)
  })
})

describe('the direction toggle is not squeezed', () => {
  const row = [...elements(hero)].find(el => classes(el).includes('conversion-display-row'))!
  const cols = row.children.filter(isElement)

  it('its column takes its own width on xs, the two amounts share the rest', () => {
    expect(cols).toHaveLength(3)
    const middle = cols[1]!
    expect([...elements(middle)].some(el => el.tag === 'DirectionToggle')).toBe(true)
    expect(attr(middle, 'cols')).toBe('auto')
    for (const side of [cols[0]!, cols[2]!]) {
      // No `cols`: Vuetify's bare `.v-col` grows into the space the toggle leaves.
      expect(attr(side, 'cols')).toBeUndefined()
      expect(attr(side, 'sm')).toBe('4')
      expect(classes(side)).toContain('conversion-side')
    }
    expect(attr(middle, 'sm')).toBe('4')
  })

  it('below sm the three stay on one line and the text wraps inside its own column', () => {
    // A grow column's Vuetify min-width is its min-content and `.v-row` wraps: without this the
    // answer dropped onto a second line at 320 and 360 px.
    const phone = media(home.css, '(max-width: 600px)')
    const at = (selector: string, property: string) =>
      declaration(bodiesFor(phone, selector), property)
    expect(at('.conversion-result .conversion-display-row', 'flex-wrap')).toBe('nowrap')
    expect(at('.conversion-result .conversion-display-row', '--v-col-gap-x')).toBe('8px')
    expect(at('.conversion-result .conversion-side', 'min-width')).toBe('0')
    expect(at('.conversion-result .conversion-display', 'min-width')).toBe('0')
    expect(at('.conversion-result .conversion-display .amount-text', 'overflow-wrap')).toBe(
      'anywhere'
    )
    expect(at('.conversion-result .conversion-display .currency-name', 'overflow-wrap')).toBe(
      'anywhere'
    )
    expect(at('.conversion-result .conversion-display .currency-name', 'hyphens')).toBe('auto')
  })

  it('the button cannot shrink under 44 px', () => {
    const { css } = sfc('components/DirectionToggle.vue')
    const bodies = bodiesFor(css, '.direction-toggle')
    expect(declaration(bodies, 'flex-shrink')).toBe('0')
    expect(parseFloat(declaration(bodies, 'min-width') ?? '0')).toBeGreaterThanOrEqual(44)
    expect(parseFloat(declaration(bodies, 'min-height') ?? '0')).toBeGreaterThanOrEqual(44)
  })
})

describe('the rate cards do not break a word in half on a phone', () => {
  const rateTypes = [...elements(hero)].filter(el => classes(el).includes('rate-type'))

  it('the code below sm, the full name from sm up', () => {
    expect(rateTypes).toHaveLength(2)
    for (const el of rateTypes) {
      const spans = el.children.filter(isElement)
      const code = spans.find(s => classes(s).includes('d-sm-none'))!
      const name = spans.find(s => classes(s).includes('d-sm-inline'))!
      expect(code.loc.source).toMatch(/\{\{\s*subjectCode\s*\}\}/)
      expect(classes(name)).toContain('d-none')
      expect(name.loc.source).toMatch(/t\('codes\.' \+ subjectCode\)/)
      // Whitespace condense drops the newline between the two spans: without a space of its
      // own the server text read «vender USDDólares estadounidenses».
      expect(name.loc.source).toMatch(/\{\{\s*' ' \+ t\('codes\./)
    }
  })

  it('the converter card pads 12 px on xs and 24 from sm up, with no override undoing it', () => {
    const card = [...elements(hero)].find(el => classes(el).includes('exchange-card'))!
    expect(classes(card)).toEqual(expect.arrayContaining(['pa-3', 'pa-sm-6']))
    expect(classes(card)).not.toContain('pa-6')
    expect(declaration(bodiesFor(home.css, '.exchange-card'), 'padding')).toBeUndefined()
  })

  it('the BCU badge is small (12 px), not x-small (10 px)', () => {
    const badges = [...elements(home.ast)].filter(el => classes(el).includes('house-badge'))
    expect(badges.length).toBeGreaterThan(0)
    for (const badge of badges) expect(attr(badge, 'size')).toBe('small')
  })
})

const VUETIFY = join(APP, 'node_modules', 'vuetify', 'lib', 'components')

type Library = { file: string; root: string; parts: string[] }
type HitArea = {
  /** The component's shipped stylesheet and root class, when the element is a Vuetify component. */
  library?: Library
  /** `centred`, or anchored to `top: -Npx` with N no larger than the row gap it sits in. */
  placement: 'centred' | { rowGap: number }
}

/** A transparent pseudo-element of at least 44 px that takes the tap, without touching the box. */
function expectHitArea(css: string, selector: string, { library, placement }: HitArea) {
  const own = bodiesFor(css, selector)
  const pseudo = (['::before', '::after'] as const).find(
    p => declaration(bodiesFor(css, `${selector}${p}`), 'content') === "''"
  )
  expect(pseudo, `${selector}::before or ::after with content ''`).toBeDefined()
  const area = bodiesFor(css, `${selector}${pseudo}`)
  expect(declaration(area, 'position')).toBe('absolute')
  // Explicit, so the area takes the tap even where a library rule would turn it off.
  expect(declaration(area, 'pointer-events')).toBe('auto')
  for (const side of ['width', 'height']) {
    const value = declaration(area, side) ?? ''
    const px = value.match(/^max\(100%,\s*(\d+)px\)$/)?.[1]
    expect(Number(px), `${selector}${pseudo} ${side} = ${value}`).toBeGreaterThanOrEqual(44)
  }
  expect(declaration(area, 'left')).toBe('50%')
  if (placement === 'centred') {
    expect(declaration(area, 'top')).toBe('50%')
    expect(declaration(area, 'transform')).toBe('translate(-50%, -50%)')
  } else {
    const top = declaration(area, 'top') ?? ''
    expect(top, `${selector}${pseudo} top`).toMatch(/^-\d+px$/)
    // Upward it may fill the gap above, never reach the chip of the row above.
    expect(-parseFloat(top)).toBeLessThanOrEqual(placement.rowGap)
    expect(declaration(area, 'transform')).toBe('translateX(-50%)')
  }
  // The visual box is untouched: no padding, height or margin on the element itself.
  for (const property of ['padding', 'padding-block', 'height', 'min-height', 'margin']) {
    expect(declaration(own, property), `${selector} ${property}`).toBeUndefined()
  }
  if (!library) {
    expect(declaration(own, 'position')).toBe('relative')
    return
  }
  // The library's own pseudo-element is not reused (VBtn draws its focus ring on `::after`, with
  // `pointer-events: none`), and no library rule reaches the one used here.
  const shipped = readFileSync(join(VUETIFY, library.file), 'utf8')
  const root = library.root.slice(1)
  expect(shipped, `${library.file} styles ${library.root}${pseudo}`).not.toMatch(
    new RegExp(`\\.${root}(?:[:.\\w-]|\\([^)]*\\))*${pseudo}`)
  )
  // `overflow: hidden` on the component also clips hit-testing of the pseudo-element. Lifting it
  // un-clips the overlay/underlay, which have no radius of their own: here they inherit it.
  expect(declaration(own, 'overflow')).toBe('visible')
  for (const part of library.parts) {
    expect(
      declaration(bodiesFor(css, `${selector} :deep(${part})`), 'border-radius'),
      `${selector} :deep(${part})`
    ).toBe('inherit')
  }
}

const CHIP: Library = {
  file: 'VChip/VChip.css',
  root: '.v-chip',
  parts: ['.v-chip__overlay', '.v-chip__underlay'],
}
const BTN: Library = {
  file: 'VBtn/VBtn.css',
  root: '.v-btn',
  parts: ['.v-btn__overlay', '.v-btn__underlay'],
}

describe('the hit-area check sees what the library ships', () => {
  it('VBtn draws its focus ring on ::after with pointer-events none; VChip uses neither', () => {
    const btn = readFileSync(join(VUETIFY, BTN.file), 'utf8')
    expect(btn).toMatch(/\.v-btn::after\s*\{[^}]*pointer-events:\s*none/)
    expect(btn).not.toMatch(/::before/)
    expect(readFileSync(join(VUETIFY, CHIP.file), 'utf8')).not.toMatch(/::(?:before|after)/)
  })

  it('their overlay and underlay are absolute boxes with no radius of their own', () => {
    for (const lib of [CHIP, BTN]) {
      const shipped = readFileSync(join(VUETIFY, lib.file), 'utf8')
      for (const part of lib.parts) {
        // Every rule that ends on the part (`.v-chip .v-chip__underlay`, variants included).
        const bodies = rules(shipped)
          .filter(rule => rule.selectors.some(s => s.endsWith(part)))
          .map(rule => rule.body)
        expect(bodies.length, part).toBeGreaterThan(0)
        expect(declaration(bodies, 'position'), part).toBe('absolute')
        expect(declaration(bodies, 'border-radius'), part).toBeUndefined()
      }
    }
  })
})

describe('the most tapped targets of the hero are 44 px for the finger', () => {
  it('the preset amount chips and the pair shortcuts', () => {
    // Both rows wrap with `ga-2` (8 px).
    expectHitArea(home.css, '.preset-chip', { library: CHIP, placement: { rowGap: 8 } })
    expectHitArea(home.css, '.shortcut-chip', { library: CHIP, placement: { rowGap: 8 } })
  })

  it('«Copiar resultado»', () => {
    expectHitArea(home.css, '.copy-result-btn', { library: BTN, placement: 'centred' })
  })

  it('«Ver detalle» of DollarMomentum', () => {
    expectHitArea(sfc('components/DollarMomentumSkeleton.vue').css, '.see-more', {
      placement: 'centred',
    })
  })

  it('the chips keep their visual size', () => {
    const chips = [...elements(hero)].filter(
      el => classes(el).includes('preset-chip') || classes(el).includes('shortcut-chip')
    )
    expect(chips).toHaveLength(2)
    for (const chip of chips) expect(attr(chip, 'size')).toBe('small')
    const copy = [...elements(hero)].find(el => classes(el).includes('copy-result-btn'))!
    expect(attr(copy, 'size')).toBe('small')
  })
})

describe('DollarMomentum and its skeleton render the same card while loading', () => {
  const skeletonSource = compileComponent(
    'components/DollarMomentumSkeleton.vue',
    'dollar-momentum-skeleton'
  )
  const momentumSource = compileComponent('components/DollarMomentum.vue', 'dollar-momentum')
    // The only import besides vue; injected below as a global.
    .replace(/^import \{ formatUYU \} from '~\/utils\/format'\s*$/m, '')

  const stub = (tag: string, cls: string) => ({
    setup:
      (_props: unknown, { slots }: { slots: Record<string, () => unknown> }) =>
      () =>
        vue.h(tag, { class: cls }, slots.default?.() as vue.VNodeArrayChildren),
  })

  async function render(which: 'skeleton' | 'momentum', pending: boolean) {
    const globals = {
      useLocalePath: () => (path: string) => path,
      useI18n: () => ({ t: (key: string) => key }),
      useDollarTrend: () => ({
        pending: vue.ref(pending),
        momentum: vue.ref({
          latest: 40.5,
          direction: 'up',
          changePct: 0.4,
          sparkline: [40, 40.2, 40.5],
        }),
      }),
      useExchangeRates: () => ({
        bestBuy: () => 40.5,
        bestSell: () => 41.03,
      }),
      formatUYU: (n: number) => `$ ${n.toFixed(2)}`,
    }
    const Skeleton = evaluateComponent(skeletonSource, globals)
    const Momentum = evaluateComponent(momentumSource, globals)
    const app = vue.createSSRApp(which === 'skeleton' ? Skeleton : Momentum)
    registerStubs(app)
    app.component('VCard', stub('div', 'v-card'))
    app.component('VChip', stub('span', 'v-chip'))
    app.component('Sparkline', stub('svg', 'sparkline'))
    app.component('DollarMomentumSkeleton', Skeleton)
    return renderToString(app)
  }

  it('the skeleton is the card shell: the Hoy row with its link, and the placeholder bars', async () => {
    const html = await render('skeleton', true)
    expect(html).toContain('dollar-momentum')
    expect(html).toContain('dolarHoy.today')
    expect(html).toContain('href="/dolar-hoy"')
    expect(html).toContain('see-more')
    expect(html).toContain('dm-skel')
    expect(html).toContain('aria-hidden="true"')
  })

  it('while pending, DollarMomentum is byte for byte its skeleton (the ClientOnly swap moves nothing)', async () => {
    expect(await render('momentum', true)).toBe(await render('skeleton', true))
  })

  it('loaded, it keeps the shell and replaces only the bars with the figures', async () => {
    const html = await render('momentum', false)
    expect(html).not.toContain('dm-skel')
    expect(html).toContain('href="/dolar-hoy"')
    expect(html).toContain('$ 40.50 / $ 41.03')
    expect(html).toContain('sparkline')
  })

  it('DollarMomentum no longer carries the skeleton markup or its styles', () => {
    const momentum = sfc('components/DollarMomentum.vue')
    expect(momentum.template).not.toMatch(/dm-skel/)
    expect(momentum.css).not.toMatch(/dm-skel/)
    expect(momentum.template).toMatch(/<DollarMomentumSkeleton/)
    expect(sfc('components/DollarMomentumSkeleton.vue').css).toMatch(/\.dm-skel-spark/)
  })
})
