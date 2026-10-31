// La unidad intermedia de las páginas de contenido vive en FaqSection.
//
// Hasta el 2026-10-31 sólo las guías y dos páginas sueltas ponían una unidad `in-article`; el resto
// de las páginas de contenido —el tramo que mejor paga— llegaba al pie con una sola, la del cierre
// del layout. FaqSection es el corte de sección que comparten setenta páginas, así que la unidad va
// ahí, antes de las preguntas. Este test vigila las dos cosas que pueden salir mal:
//   1. que la unidad deje de estar, o quede después de las preguntas;
//   2. que una página que YA pone su propia unidad `in-article` sume la de FaqSection y pase el
//      tope de `maxAdSlots('normal')`. Esa página tiene que pasar `:ad="false"`.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { parse } from '@vue/compiler-sfc'
import { describe, expect, it } from 'vitest'
import { adDensityForPath, maxAdSlots } from '../../utils/ads'

type Node = {
  type: number
  tag?: string
  props?: any[]
  children?: Node[]
}

const ELEMENT = 1
const ATTRIBUTE = 6
const DIRECTIVE = 7
const APP = resolve(__dirname, '../..')

function readTemplate(path: string): Node | null {
  const filename = resolve(APP, path)
  const tpl = parse(readFileSync(filename, 'utf8'), { filename }).descriptor.template
  return tpl ? (tpl.ast as unknown as Node) : null
}

function elements(node: Node): Node[] {
  const own = node.type === ELEMENT ? [node] : []
  return [...own, ...(node.children ?? []).flatMap(elements)]
}

function attr(node: Node, name: string): string | undefined {
  return (node.props ?? []).find(prop => prop.type === ATTRIBUTE && prop.name === name)?.value
    ?.content
}

/** El valor de `:name="..."` (v-bind con argumento). */
function bound(node: Node, name: string): string | undefined {
  const prop = (node.props ?? []).find(
    p => p.type === DIRECTIVE && p.name === 'bind' && p.arg?.content === name
  )
  return prop?.exp?.content
}

function vueFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return vueFiles(full)
    return entry.endsWith('.vue') ? [relative(APP, full)] : []
  })
}

describe('FaqSection: la unidad intermedia de las páginas de contenido', () => {
  const root = readTemplate('components/Faq/FaqSection.vue')!
  const section = elements(root).find(node => node.tag === 'section')!
  const children = (section.children ?? []).filter(child => child.type === ELEMENT)

  it('abre la sección con UNA unidad in-article, antes del título y de las preguntas', () => {
    const units = elements(section).filter(node => node.tag === 'AdSlot')
    expect(units).toHaveLength(1)
    expect(attr(units[0]!, 'placement')).toBe('in-article')
    expect(children[0]).toBe(units[0])
  })

  it('se apaga con :ad="false"', () => {
    const unit = children[0]!
    const vIf = (unit.props ?? []).find(p => p.type === DIRECTIVE && p.name === 'if')
    expect(vIf?.exp?.content).toBe('ad')
  })

  it('el tope de una página de contenido sigue siendo dos: esta y el cierre del layout', () => {
    expect(maxAdSlots(adDensityForPath('/alquilar-estando-en-clearing'))).toBe(2)
  })
})

// Parsear los ~800 componentes del app con el compilador de Vue tarda más que el timeout de un test
// cuando corre la suite entera. Sólo importan los que nombran FaqSection o una unidad in-article:
// se filtran por texto y se parsean una vez, al cargar el módulo.
const CANDIDATES = [...vueFiles(resolve(APP, 'pages')), ...vueFiles(resolve(APP, 'components'))]
  .filter(file => file.split('\\').join('/') !== 'components/Faq/FaqSection.vue')
  .filter(file => {
    const src = readFileSync(resolve(APP, file), 'utf8')
    return src.includes('<FaqSection') || src.includes('in-article')
  })
  .map(file => ({ file, nodes: elements(readTemplate(file) ?? { type: 0 }) }))

describe('ninguna página suma la unidad de FaqSection a una propia', () => {
  it('quien pone su propia unidad in-article apaga la de FaqSection', () => {
    const offenders: string[] = []
    for (const { file, nodes } of CANDIDATES) {
      const ownInArticle = nodes.some(
        node => node.tag === 'AdSlot' && attr(node, 'placement') === 'in-article'
      )
      if (!ownInArticle) continue
      for (const faq of nodes.filter(node => node.tag === 'FaqSection')) {
        if (bound(faq, 'ad') !== 'false') offenders.push(file)
      }
    }
    expect(offenders).toEqual([])
  })

  it('ninguna página dibuja dos FaqSection con unidad', () => {
    const offenders = CANDIDATES.filter(
      ({ nodes }) =>
        nodes.filter(node => node.tag === 'FaqSection' && bound(node, 'ad') !== 'false').length > 1
    ).map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  it('el filtro por texto encuentra las páginas que usan el bloque', () => {
    expect(
      CANDIDATES.filter(({ nodes }) => nodes.some(n => n.tag === 'FaqSection')).length
    ).toBeGreaterThan(50)
  })
})
