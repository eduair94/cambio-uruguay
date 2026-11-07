import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from '@vue/compiler-sfc'
import { describe, expect, it } from 'vitest'

// The footer and the blocks the layout appends after every page were ~700 of the 870-1.900
// component instances each page hydrated on load (measured in production, 2026-11-07: the footer
// alone is 570, 258 links). They hydrate when they near the viewport instead. Two ways to get it
// wrong without any visible failure: dropping the lazy prop (the cost silently comes back), and
// lazy-hydrating a component whose root is <ClientOnly> — the server renders nothing for it, so
// there is no element to watch and it never hydrates, i.e. it disappears for good.

type Node = {
  type: number
  tag?: string
  props?: { type: number; name: string; rawName?: string; arg?: { content: string } }[]
  children?: Node[]
}

const ROOT = resolve(__dirname, '../..')
const layout = parse(readFileSync(resolve(ROOT, 'layouts/default.vue'), 'utf8')).descriptor
const nodes: Node[] = []
const walk = (node: Node) => {
  if (node.type === 1) nodes.push(node)
  for (const child of node.children ?? []) walk(child)
}
walk(layout.template!.ast as unknown as Node)

/** Attribute or binding names on a node, e.g. `hydrate-on-visible`, `key`. */
const attrs = (node: Node) =>
  (node.props ?? []).map(prop => (prop.type === 6 ? prop.name : (prop.arg?.content ?? prop.name)))

const LAZY = ['PageAddenda', 'DirectorioAnalisis', 'TemaVecinos', 'RelatedPages', 'Footer']

describe('layout lazy hydration', () => {
  it('hydrates the footer and the tail blocks when they near the viewport, keyed', () => {
    for (const name of LAZY) {
      const found = nodes.filter(node => node.tag === name || node.tag === `Lazy${name}`)
      expect(found, name).toHaveLength(1)
      expect(found[0]!.tag, name).toBe(`Lazy${name}`)
      expect(attrs(found[0]!), name).toEqual(expect.arrayContaining(['hydrate-on-visible', 'key']))
    }
  })

  it('never lazy-hydrates a component whose root is <ClientOnly>', () => {
    const lazyHydrated = nodes.filter(
      node => node.tag?.startsWith('Lazy') && attrs(node).some(a => a.startsWith('hydrate-'))
    )
    expect(lazyHydrated.length).toBeGreaterThan(0)
    for (const node of lazyHydrated) {
      const name = node.tag!.slice('Lazy'.length)
      const sfc = parse(readFileSync(resolve(ROOT, `components/${name}.vue`), 'utf8')).descriptor
      const roots = ((sfc.template!.ast as unknown as Node).children ?? []).filter(
        c => c.type === 1
      )
      expect(
        roots.map(r => r.tag),
        name
      ).not.toContain('ClientOnly')
    }
    // The one tail block that must stay eager, for exactly that reason.
    expect(nodes.some(node => node.tag === 'NewsletterCapture')).toBe(true)
  })
})
