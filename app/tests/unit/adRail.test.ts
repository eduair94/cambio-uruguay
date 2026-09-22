import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as vue from 'vue'
import { describe, expect, it } from 'vitest'
import * as ads from '../../utils/ads'
import { adDensityForPath, maxAdSlots } from '../../utils/ads'

// El riel de escritorio (DESIGN.md → "The Rail Is Not The Column Rule") y la unidad editorial de
// las guías. Nada de esto se ve en local ni en CI —acá no se cargan anuncios—, así que lo único que
// lo mantiene son estas lecturas del código fuente:
//
//   1. la guarda: el riel sólo con publisher + id de unidad + densidad `normal` (useAds.ts);
//   2. la plantilla: el riel es el ÚLTIMO hijo de `.container_custom`, `<slot />` sigue siendo hijo
//      directo detrás de FamiliaNav, y la grilla se enciende con la misma guarda;
//   3. la grilla: sólo desde 1280 px, sin scope, y TODO lo que no es el riel va a la columna 1 —
//      incluido el `div.google-auto-placed` que Google inserta, que sin la regla auto-ubicaría en
//      la primera celda libre, o sea la del riel (components/cars/SidebarLayout.vue tuvo el mismo
//      bug con un VRow);
//   4. AdSlot: 300x600 reservados (anti-CLS), sin `full-width-responsive`, invisible bajo 1280 (una
//      caja `display: none` nunca intersecta: cero pedidos desde un teléfono);
//   5. las guías: una unidad `in-article` después de la primera sección, y con el cierre del layout
//      exactamente el tope de `maxAdSlots('normal')`.

type Node = {
  type: number
  tag?: string
  props?: any[]
  children?: Node[]
  loc?: { source: string }
}

const ELEMENT = 1
const ATTRIBUTE = 6
const DIRECTIVE = 7

function readSfc(path: string) {
  const filename = resolve(__dirname, '../..', path)
  return parse(readFileSync(filename, 'utf8'), { filename }).descriptor
}

/** Element nodes only, in document order, each with its parent. */
function walk(
  node: Node,
  parent: Node | null = null,
  out: { node: Node; parent: Node | null }[] = []
) {
  if (node.type === ELEMENT) out.push({ node, parent })
  for (const child of node.children ?? []) walk(child, node.type === ELEMENT ? node : parent, out)
  return out
}

function attr(node: Node, name: string): string | undefined {
  return (node.props ?? []).find(prop => prop.type === ATTRIBUTE && prop.name === name)?.value
    ?.content
}

function hasClass(node: Node, name: string): boolean {
  return (attr(node, 'class') ?? '').split(/\s+/).includes(name)
}

/** The raw source of `v-<name>` / `:<arg>` on the node, or ''. */
function directive(node: Node, name: string, arg?: string): string {
  const prop = (node.props ?? []).find(
    p => p.type === DIRECTIVE && p.name === name && (arg === undefined || p.arg?.content === arg)
  )
  return prop?.exp?.content ?? prop?.loc?.source ?? ''
}

function elementChildren(node: Node): Node[] {
  return (node.children ?? []).filter(child => child.type === ELEMENT)
}

/** The body of the FIRST `@media <query> { … }` block in `css`, braces balanced. */
function mediaBlock(css: string, query: string): string {
  const start = css.indexOf(`@media ${query}`)
  if (start < 0) return ''
  const open = css.indexOf('{', start)
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i)
  }
  return ''
}

/** `css` with every `@media` block removed: what applies at every width. */
function outsideMedia(css: string): string {
  let out = css
  for (;;) {
    const start = out.indexOf('@media')
    if (start < 0) return out
    const open = out.indexOf('{', start)
    let depth = 0
    let end = out.length
    for (let i = open; i < out.length; i++) {
      if (out[i] === '{') depth++
      else if (out[i] === '}' && --depth === 0) {
        end = i + 1
        break
      }
    }
    out = out.slice(0, start) + out.slice(end)
  }
}

/** Declaration block of the first rule whose whole selector is `selector`. */
function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return (
    css
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .match(new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
  )
}

function declaration(block: string, property: string): string {
  return block.match(new RegExp(`(?:^|;|\\s)${property}\\s*:\\s*([^;]+)`))?.[1]?.trim() ?? ''
}

// ---------------------------------------------------------------------------------------------
// 1. La guarda. The composable runs against a fake route and runtimeConfig; the policy module is
//    the real one, so a route moved between densities changes this test's answer too.
// ---------------------------------------------------------------------------------------------

const composableSource = readFileSync(resolve(__dirname, '../../composables/useAds.ts'), 'utf8')

function useAdsAt(
  path: string,
  config: { adsensePubId?: string; adsenseSlots?: Record<string, string> } = {},
  meta: Record<string, unknown> = {}
) {
  const { outputText } = ts.transpileModule(composableSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const context = {
    exports: {} as any,
    require: (name: string) => {
      if (name === '~/utils/ads') return ads
      throw new Error(`Unexpected import: ${name}`)
    },
    computed: vue.computed,
    useRoute: () => ({ path, meta }),
    useRuntimeConfig: () => ({ public: { adsensePubId: 'ca-pub-test', ...config } }),
  }
  runInNewContext(outputText, context)
  return context.exports.useAds() as {
    canRender: (placement: string) => boolean
    slotIdFor: (placement: string) => string
  }
}

const RAIL = { adsenseSlots: { contentEnd: 'close', inArticle: 'inside', sidebar: 'rail' } }

describe('el riel: la guarda', () => {
  it('renders on a normal-density read once its unit id exists', () => {
    const { canRender, slotIdFor } = useAdsAt('/franquicia-aduana-uruguay', RAIL)
    expect(canRender('sidebar')).toBe(true)
    expect(slotIdFor('sidebar')).toBe('rail')
  })

  it('is inert until NUXT_PUBLIC_ADSENSE_SLOT_SIDEBAR exists, even where the close renders', () => {
    const { canRender } = useAdsAt('/franquicia-aduana-uruguay', {
      adsenseSlots: { contentEnd: 'close', inArticle: 'inside' },
    })
    expect(canRender('content-end')).toBe(true)
    expect(canRender('sidebar')).toBe(false)
  })

  it('never renders on light routes (a quote, a map), with or without locale prefix', () => {
    for (const path of ['/dolar-hoy', '/en/dolar-hoy', '/mapa', '/']) {
      const { canRender } = useAdsAt(path, RAIL)
      expect(canRender('sidebar'), path).toBe(false)
      // …and the same rule still holds for the in-flow article unit.
      expect(canRender('in-article'), path).toBe(false)
    }
  })

  it('never renders where no ad is allowed at all', () => {
    for (const path of ['/contacto', '/herramientas/calculadora-irpf', '/widget']) {
      expect(useAdsAt(path, RAIL).canRender('sidebar'), path).toBe(false)
    }
    expect(useAdsAt('/franquicia-aduana-uruguay', RAIL, { ads: false }).canRender('sidebar')).toBe(
      false
    )
    expect(
      useAdsAt('/franquicia-aduana-uruguay', { ...RAIL, adsensePubId: '' }).canRender('sidebar')
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------------------------
// 2 + 3. El layout.
// ---------------------------------------------------------------------------------------------

const layout = readSfc('layouts/default.vue')
const layoutNodes = walk(layout.template!.ast as unknown as Node)
const container = layoutNodes.find(({ node }) => hasClass(node, 'container_custom'))!.node
const containerChildren = elementChildren(container)
const unscopedCss = layout.styles
  .filter(style => !style.scoped)
  .map(style => style.content)
  .join('\n')
const scopedCss = layout.styles
  .filter(style => style.scoped)
  .map(style => style.content)
  .join('\n')

describe('el riel: la plantilla del layout', () => {
  it('turns the container into the rail grid with the same gate that renders the rail', () => {
    expect(directive(container, 'bind', 'class')).toMatch(/'container_custom--rail':\s*railOn/)
    expect(layout.scriptSetup!.content).toMatch(
      /const railOn = computed\(\(\) => canRenderAd\('sidebar'\)\)/
    )
    expect(layout.scriptSetup!.content).toMatch(/const \{ canRender: canRenderAd \} = useAds\(\)/)
  })

  it('is the LAST child of .container_custom, after the content-end unit', () => {
    const last = containerChildren[containerChildren.length - 1]!
    expect(last.tag).toBe('ClientOnly')
    expect(directive(last, 'if')).toBe('railOn')
    const [rail] = elementChildren(last)
    expect(rail?.tag).toBe('AdSlot')
    expect(attr(rail!, 'placement')).toBe('sidebar')
    expect(hasClass(rail!, 'cu-ad-rail')).toBe(true)

    const closeIndex = containerChildren.findIndex(node =>
      elementChildren(node).some(
        child => child.tag === 'AdSlot' && attr(child, 'placement') === 'content-end'
      )
    )
    expect(closeIndex).toBeGreaterThan(-1)
    expect(closeIndex).toBeLessThan(containerChildren.length - 1)
  })

  it('leaves <slot /> a direct child right behind the family bar', () => {
    // FamiliaNav.vue reaches the page with `+` selectors and the top rule with `:first-child`:
    // neither survives a wrapper around the slot or anything inserted before it.
    expect(containerChildren.slice(0, 2).map(node => node.tag)).toEqual(['FamiliaNav', 'slot'])
  })

  it('carries exactly one rail', () => {
    const rails = layoutNodes.filter(
      ({ node }) => node.tag === 'AdSlot' && attr(node, 'placement') === 'sidebar'
    )
    expect(rails).toHaveLength(1)
  })
})

describe('el riel: la grilla', () => {
  const grid = mediaBlock(unscopedCss, '(min-width: 1280px)')

  it('exists only from 1280px, in an UNSCOPED block, and leaves .container_custom itself alone', () => {
    expect(grid).toContain('.container_custom--rail')
    // The page root is rendered by NuxtPage and Google's div by Google: neither carries the
    // layout's scope attribute, so a scoped rule compiles dead (no error) and the auto-placed
    // unit lands in the rail column.
    expect(scopedCss).not.toContain('container_custom--rail')
    expect(outsideMedia(unscopedCss)).not.toContain('container_custom--rail')
    // Not a grid at any width without the modifier: margins between the container's children
    // keep collapsing and the cap/padding the other layout tests derive from stay untouched.
    expect(declaration(rule(scopedCss, '.container_custom'), 'display')).toBe('')
    expect(declaration(rule(scopedCss, '.container_custom'), 'max-width')).toBe('1280px')
  })

  it('splits the cap into reading column + gap + 300px instead of widening it', () => {
    const body = rule(grid, '.container_custom--rail')
    expect(declaration(body, 'display')).toBe('grid')
    expect(declaration(body, 'grid-template-columns')).toBe('minmax(0, 1fr) 300px')
    expect(declaration(body, 'column-gap')).toBe('24px')
  })

  it('pins everything that is not the rail — including .google-auto-placed — to column 1', () => {
    const others = rule(grid, '.container_custom--rail > :not(.cu-ad-rail)')
    expect(declaration(others, 'grid-column')).toBe('1')
    // Nothing else in the grid may claim column 2: a second rule doing so would be the exact
    // hole the auto-placed unit falls through.
    const column2 = [...grid.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^}]*)\}/g)]
      .filter(([, , body]) => /grid-column\s*:\s*2\b/.test(body!))
      .map(([, selector]) => selector!.trim())
    expect(column2).toEqual(['.container_custom--rail > .cu-ad-rail'])
  })

  it('gives the rail the whole height of column 2 so sticky can travel it', () => {
    const rail = rule(grid, '.container_custom--rail > .cu-ad-rail')
    expect(declaration(rail, 'grid-column')).toBe('2')
    // `1 / -1` would be one row: with no grid-template-rows the explicit grid has a single line.
    expect(declaration(rail, 'grid-row')).toMatch(/^1 \/ span \d+$/)
    expect(declaration(rail, 'align-self')).toBe('start')
  })
})

// ---------------------------------------------------------------------------------------------
// 4. AdSlot.
// ---------------------------------------------------------------------------------------------

describe('el riel: AdSlot', () => {
  const slot = readSfc('components/AdSlot.vue')
  const css = slot.styles.map(style => style.content).join('\n')
  const ins = walk(slot.template!.ast as unknown as Node).find(
    ({ node }) => node.tag === 'ins'
  )!.node

  it('is a fixed unit: no responsive format and no full-width-responsive', () => {
    expect(directive(ins, 'bind', 'data-ad-format')).toMatch(/placement === 'sidebar' \? undefined/)
    expect(directive(ins, 'bind', 'data-full-width-responsive')).toBe(
      "placement === 'sidebar' ? undefined : 'true'"
    )
  })

  it('is hidden below 1280px, so a phone never observes it and never requests it', () => {
    expect(declaration(rule(outsideMedia(css), '.cu-ad--sidebar'), 'display')).toBe('none')
  })

  it('reserves 300x600 and sticks 80px under the bar from 1280px', () => {
    const desktop = mediaBlock(css, '(min-width: 1280px)')
    const body = rule(desktop, '.cu-ad--sidebar')
    expect(declaration(body, 'display')).toBe('block')
    expect(declaration(body, 'width')).toBe('300px')
    expect(declaration(body, 'min-height')).toBe('600px')
    expect(declaration(body, 'position')).toBe('sticky')
    expect(declaration(body, 'top')).toBe('80px')
    const unit = rule(desktop, '.cu-ad--sidebar :deep(.adsbygoogle)')
    expect(declaration(unit, 'width')).toBe('300px')
    expect(declaration(unit, 'height')).toBe('600px')
  })
})

// ---------------------------------------------------------------------------------------------
// 5. Las guías.
// ---------------------------------------------------------------------------------------------

describe('la unidad editorial de las guías', () => {
  const page = readSfc('pages/guias/[slug].vue')
  const nodes = walk(page.template!.ast as unknown as Node)
  const units = nodes.filter(({ node }) => node.tag === 'AdSlot')

  it('is one in-article unit, client-only, right after the first section', () => {
    expect(units).toHaveLength(1)
    const { node, parent } = units[0]!
    expect(attr(node, 'placement')).toBe('in-article')
    expect(parent?.tag).toBe('ClientOnly')
    expect(directive(parent!, 'if')).toBe('i === 0 && adsOn')
    // Sibling of the section, inside the same v-for over the guide's sections: between the
    // first and the second, never inside one.
    const loop = nodes.find(({ node: n }) => n === parent)!.parent!
    expect(loop.tag).toBe('template')
    expect(directive(loop, 'for')).toContain('guide.sections')
    const siblings = elementChildren(loop)
    expect(siblings.map(sibling => sibling.tag)).toEqual(['section', 'ClientOnly'])
    const article = nodes.find(({ node: n }) => n === loop)!.parent!
    expect(hasClass(article, 'guide-article')).toBe(true)
  })

  it('uses the same adsOn idiom as the other editorial pages', () => {
    expect(page.scriptSetup!.content).toMatch(
      /const adsOn = computed\(\(\) => adDensityForPath\(route\.path\) !== 'none'\)/
    )
  })

  it('reaches, with the layout close, exactly the ceiling of a normal-density read', () => {
    const density = adDensityForPath('/guias/como-comprar-dolares')
    expect(density).toBe('normal')
    const inFlowLayoutUnits = layoutNodes.filter(
      ({ node }) => node.tag === 'AdSlot' && attr(node, 'placement') !== 'sidebar'
    )
    expect(units.length + inFlowLayoutUnits.length).toBe(maxAdSlots(density))
  })
})
