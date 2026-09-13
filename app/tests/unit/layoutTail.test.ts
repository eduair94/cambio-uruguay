import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from '@vue/compiler-sfc'
import { describe, expect, it } from 'vitest'

// Lo que el layout agrega debajo de cada página —ampliaciones, "Seguí leyendo" y el pedido del
// newsletter— es lectura, no parte de la página. Las rutas que liberan el tope global de
// `.container_custom` (directorios, mapas, la tabla de todas las casas) lo liberan para SU grilla;
// sin una columna propia estos bloques heredaban el ancho entero. Medido en producción a 1958 px:
// en /alquileres-uruguay "Seguí leyendo" arrancaba a 12 px del borde y medía 1919 px, mientras en
// cualquier ruta con tope mide 1256 y queda centrado.

type TemplateNode = {
  type: number
  tag?: string
  props?: { type: number; name: string; value?: { content: string } }[]
  children?: TemplateNode[]
}

const ELEMENT = 1
const ATTRIBUTE = 6
const TAIL = ['PageAddenda', 'RelatedPages', 'NewsletterCapture']

const filename = resolve(__dirname, '../../layouts/default.vue')
const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
const root = descriptor.template!.ast as unknown as TemplateNode
const css = descriptor.styles.map(style => style.content).join('\n')

function elements(node: TemplateNode, out: TemplateNode[] = []): TemplateNode[] {
  if (node.type === ELEMENT) out.push(node)
  for (const child of node.children ?? []) elements(child, out)
  return out
}

function hasClass(node: TemplateNode, name: string): boolean {
  return (node.props ?? []).some(
    prop =>
      prop.type === ATTRIBUTE &&
      prop.name === 'class' &&
      (prop.value?.content ?? '').split(/\s+/).includes(name)
  )
}

/** Declaration block of the rule whose whole selector is `selector`. */
function block(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = css.match(
    new RegExp(`(?:^|\\})\\s*(?:\\/\\*[\\s\\S]*?\\*\\/\\s*)*${escaped}\\s*\\{([^}]*)\\}`)
  )
  return match?.[1] ?? ''
}

function px(declarations: string, property: string): number[] {
  const value = declarations.match(new RegExp(`(?:^|;|\\s)${property}\\s*:\\s*([^;]+)`))?.[1] ?? ''
  return [...value.matchAll(/(\d+(?:\.\d+)?)px/g)].map(m => Number(m[1]))
}

describe('layout tail', () => {
  it('keeps the blocks the layout appends after the page inside one column of their own', () => {
    const all = elements(root)
    const tails = all.filter(node => hasClass(node, 'layout-tail'))
    expect(tails).toHaveLength(1)

    const inside = elements(tails[0]!).map(node => node.tag)
    for (const tag of TAIL) {
      expect(
        all.filter(node => node.tag === tag),
        tag
      ).toHaveLength(1)
      expect(inside, tag).toContain(tag)
    }
  })

  it('caps that column at the width it has on every capped route', () => {
    const container = block('.container_custom')
    const [cap] = px(container, 'max-width')
    const padding = px(container, 'padding')
    const inline = padding[1] ?? padding[0] ?? 0
    expect(cap).toBeGreaterThan(0)

    const tail = block('.layout-tail')
    expect(px(tail, 'max-width')).toEqual([cap! - 2 * inline])
    expect(tail).toMatch(/margin(?:-inline)?\s*:\s*(?:0\s+)?auto/)
    // Y el margen interior del <VContainer> de cada página (DESIGN.md → "The Page Brings Its
    // Container Rule"): 12 del layout + 16 = la misma columna que el contenido, 28 px del borde.
    expect(px(tail, 'padding-inline')).toEqual([16])
  })

  it('is never released by the routes that release the page cap', () => {
    const rules = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    const lifted = rules.filter(
      ([, selector, body]) =>
        selector!.includes('.layout-tail') && /max-width\s*:\s*none/.test(body!)
    )
    expect(lifted.map(([, selector]) => selector!.trim())).toEqual([])
  })
})
