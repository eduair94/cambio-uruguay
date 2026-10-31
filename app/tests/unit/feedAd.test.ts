// La unidad de los directorios: una celda de la grilla después del aviso número FEED_AD_AFTER.
//
// Hasta el 2026-10-31 un directorio llegaba al pie con una sola unidad, la del cierre del layout,
// debajo de 24 tarjetas y de la paginación: ~0,3 impresiones por vista contra 5 en una guía. Este
// test vigila lo que puede salir mal con la unidad nueva:
//   1. que deje de estar dentro del `v-for` (o quede fuera de los dos FeedEdge, donde no es una
//      celda de la grilla);
//   2. que se dibuje en modo "cargar más al bajar", donde el composable cuenta los hijos entre los
//      dos bordes y una celda que no es aviso le rompe la cuenta;
//   3. que una página que embebe un directorio sume además la unidad de FaqSection o una propia y
//      pase el tope de `maxAdSlots('normal')`.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { parse } from '@vue/compiler-sfc'
import { describe, expect, it } from 'vitest'
import { adDensityForPath, FEED_AD_AFTER, maxAdSlots } from '../../utils/ads'

type Node = {
  type: number
  tag?: string
  props?: any[]
  children?: Node[]
}

const ELEMENT = 1
const DIRECTIVE = 7
const APP = resolve(__dirname, '../..')

function template(path: string): Node {
  const filename = resolve(APP, path)
  const tpl = parse(readFileSync(filename, 'utf8'), { filename }).descriptor.template
  if (!tpl) throw new Error(`${path} sin template`)
  return tpl.ast as unknown as Node
}

function elements(node: Node): Node[] {
  const own = node.type === ELEMENT ? [node] : []
  return [...own, ...(node.children ?? []).flatMap(elements)]
}

function directive(node: Node, name: string, arg?: string) {
  return (node.props ?? []).find(
    p => p.type === DIRECTIVE && p.name === name && (arg === undefined || p.arg?.content === arg)
  )
}

/** Los directorios con tarjetas en grilla y su ruta pública de ejemplo. */
const DIRECTORIES: Record<string, string> = {
  'pages/alquileres-uruguay.vue': '/alquileres-uruguay',
  'pages/autos-usados-uruguay/index.vue': '/autos-usados-uruguay',
  'pages/autos-chocados-y-con-deuda-uruguay.vue': '/autos-chocados-y-con-deuda-uruguay',
  'pages/oportunidades-autos-usados-uruguay.vue': '/oportunidades-autos-usados-uruguay',
  'pages/inmobiliarias-uruguay/index.vue': '/inmobiliarias-uruguay',
  'pages/oportunidades-inmobiliarias-uruguay.vue': '/oportunidades-inmobiliarias-uruguay',
  'components/equipar/Directorio.vue': '/equipar-casa-uruguay/productos',
  'components/property-sales/Directory.vue': '/venta-viviendas-uruguay',
  'components/rentals/BudgetRentals.vue': '/oportunidades-inmobiliarias-uruguay',
}

/** Componentes de directorio que una página puede embeber. */
const EMBEDDED = ['EquiparDirectorio', 'PropertySalesDirectory', 'RentalsBudgetRentals']

describe('FeedAd: la unidad de los directorios', () => {
  it('va a los cuatro avisos: después de lo que la persona vino a ver, no antes', () => {
    expect(FEED_AD_AFTER).toBe(4)
  })

  it('el componente sólo dibuja en modo páginas y en el aviso que le toca', () => {
    const ast = template('components/feed/Ad.vue')
    const slot = elements(ast).find(el => el.tag === 'AdSlot')
    expect(slot).toBeTruthy()
    expect(directive(slot!, 'if')?.exp?.content).toBe('shown')
    const src = readFileSync(resolve(APP, 'components/feed/Ad.vue'), 'utf8')
    expect(src).toContain('props.index === FEED_AD_AFTER && !props.feed.active')
    expect((slot!.props ?? []).find(p => p.name === 'placement')?.value?.content).toBe('in-article')
  })

  for (const [file, route] of Object.entries(DIRECTORIES)) {
    describe(file, () => {
      const ast = template(file)
      const all = elements(ast)
      const ads = all.filter(el => el.tag === 'FeedAd')

      it('tiene una sola unidad, dentro del v-for de los avisos', () => {
        expect(ads).toHaveLength(1)
        const loop = all.find(
          el =>
            el.tag === 'template' &&
            /\bin feed\.items$/.test(directive(el, 'for')?.exp?.content ?? '') &&
            (el.children ?? []).includes(ads[0]!)
        )
        expect(loop, 'la unidad tiene que ser hija directa del <template v-for>').toBeTruthy()
        expect(directive(ads[0]!, 'if')).toBeUndefined()
        expect(directive(ads[0]!, 'bind', 'index')?.exp?.content).toBe('index')
        expect(directive(ads[0]!, 'bind', 'feed')?.exp?.content).toBe('feed')
      })

      it('queda entre los dos FeedEdge, como una celda más de la lista', () => {
        const list = all.find(el =>
          (el.children ?? []).some(c => c.tag === 'FeedEdge' && c.type === ELEMENT)
        )
        expect(list).toBeTruthy()
        const kids = (list!.children ?? []).filter(c => c.type === ELEMENT)
        const top = kids.findIndex(c => c.tag === 'FeedEdge')
        const bottom = kids.findLastIndex(c => c.tag === 'FeedEdge')
        const loop = kids.findIndex(c => elements(c).includes(ads[0]!))
        expect(top).toBeLessThan(loop)
        expect(loop).toBeLessThan(bottom)
      })

      it('la ruta tiene presupuesto para dos unidades', () => {
        expect(maxAdSlots(adDensityForPath(route))).toBe(2)
      })
    })
  }

  it('una página que embebe un directorio no suma la unidad de FaqSection ni una propia', () => {
    const pages = (function walk(dir: string): string[] {
      return readdirSync(dir).flatMap(entry => {
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) return walk(full)
        return entry.endsWith('.vue') ? [relative(APP, full)] : []
      })
    })(resolve(APP, 'pages'))
    const offenders: string[] = []
    for (const page of pages) {
      const source = readFileSync(resolve(APP, page), 'utf8')
      const hostsFeedAd =
        source.includes('<FeedAd') || EMBEDDED.some(name => source.includes(`<${name}`))
      if (!hostsFeedAd) continue
      const all = elements(template(page))
      for (const faq of all.filter(el => el.tag === 'FaqSection')) {
        if (directive(faq, 'bind', 'ad')?.exp?.content !== 'false')
          offenders.push(`${page}: FaqSection`)
      }
      const ownInArticle = all.filter(
        el =>
          el.tag === 'AdSlot' &&
          (el.props ?? []).some(p => p.name === 'placement' && p.value?.content === 'in-article')
      )
      if (ownInArticle.length) offenders.push(`${page}: AdSlot in-article propio`)
    }
    expect(offenders).toEqual([])
  })
})
