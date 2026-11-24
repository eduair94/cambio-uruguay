import { readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'vue/compiler-sfc'
import { describe, expect, it } from 'vitest'
import { glob } from 'glob'

// A Vuetify spacing utility (`mt-4`, `pa-5`, `mb-md-2`…) on an element whose OWN class sets the same
// side of margin or padding in the component's styles: the utility silently loses. Vuetify's
// utilities carry no `!important` here, and a scoped rule (`.x[data-v-…]`) outranks a bare `.mt-4`,
// so the template says 16px and the page draws 0. Measured 2026-11-24 on /cuenta/sin-publicidad:
// `class="sin-publicidad__trust mt-4"` with `.sin-publicidad__trust { margin: 0 }` glued the
// guarantees to the payment button on every phone, and no test saw it. Own the side in one place:
// either the utility or the component's CSS, never both.

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const KNOWN: string[] = JSON.parse(
  readFileSync(resolve(appRoot, 'tests/unit/utilitySpacingConflict.known.json'), 'utf8')
)

type Side = 'top' | 'right' | 'bottom' | 'left'
const ALL: Side[] = ['top', 'right', 'bottom', 'left']

/** The sides a CSS property sets, for margin or padding. */
export function cssSides(property: string): { box: 'margin' | 'padding'; sides: Side[] } | null {
  const m =
    /^(margin|padding)(?:-(top|right|bottom|left|block|inline|block-start|block-end|inline-start|inline-end))?$/.exec(
      property.trim().toLowerCase()
    )
  if (!m) return null
  const box = m[1] as 'margin' | 'padding'
  const map: Record<string, Side[]> = {
    '': ALL,
    top: ['top'],
    right: ['right'],
    bottom: ['bottom'],
    left: ['left'],
    block: ['top', 'bottom'],
    inline: ['left', 'right'],
    'block-start': ['top'],
    'block-end': ['bottom'],
    'inline-start': ['left', 'right'],
    'inline-end': ['left', 'right'],
  }
  return { box, sides: map[m[2] ?? '']! }
}

/** The box and sides a Vuetify spacing utility class sets (`mt-4`, `pa-md-2`, `mx-auto`), or null. */
export function utilitySides(
  cls: string
): { box: 'margin' | 'padding'; sides: Side[]; value: string } | null {
  const m = /^([mp])([atbselrxy])-(?:(?:sm|md|lg|xl|xxl)-)?(n?)(\d+|auto)$/.exec(cls)
  if (!m) return null
  const box = m[1] === 'm' ? 'margin' : 'padding'
  // Vuetify's spacer is 4px: mt-4 = 16px, mt-n2 = -8px.
  const value = m[4] === 'auto' ? 'auto' : `${(m[3] ? -1 : 1) * Number(m[4]) * 4}px`
  const sides: Record<string, Side[]> = {
    a: ALL,
    t: ['top'],
    b: ['bottom'],
    s: ['left', 'right'],
    e: ['left', 'right'],
    l: ['left'],
    r: ['right'],
    x: ['left', 'right'],
    y: ['top', 'bottom'],
  }
  return { box, sides: sides[m[2]!]!, value }
}

/** `0`, `16px`, `1rem` → `0px`/`16px`; anything else (var(), calc(), %) stays as written. */
function normalizeLength(raw: string): string {
  const v = raw.trim().toLowerCase()
  if (/^-?0(?:\.0+)?(?:px|rem|em)?$/.test(v)) return '0px'
  const px = /^(-?(?:\d+(?:\.\d+)?|\.\d+))px$/.exec(v)
  if (px) return `${Number(px[1])}px`
  const rem = /^(-?(?:\d+(?:\.\d+)?|\.\d+))rem$/.exec(v)
  if (rem) return `${Number(rem[1]) * 16}px`
  return v
}

/** `0 calc(1px + 2px) 8px` → three parts: whitespace inside parentheses does not split. */
function splitTopLevel(value: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of value) {
    if (ch === '(') depth++
    if (ch === ')') depth = Math.max(0, depth - 1)
    if (/\s/.test(ch) && depth === 0) {
      if (current) parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current) parts.push(current)
  return parts
}

/** The value a declaration gives each side (`margin: 0 0 12px` → top 0px, bottom 12px…). */
export function sideValues(property: string, value: string): Map<Side, string> {
  const out = new Map<Side, string>()
  const found = cssSides(property)
  if (!found) return out
  const parts = splitTopLevel(value.replace(/!important/i, '').trim())
  if (found.sides.length === 4 && parts.length > 1) {
    const [t, r = t, b = t, l = r] = parts as [string, string?, string?, string?]
    out.set('top', normalizeLength(t)).set('right', normalizeLength(r!))
    out.set('bottom', normalizeLength(b!)).set('left', normalizeLength(l!))
    return out
  }
  if (found.sides.length === 2 && parts.length > 1 && /block|inline/.test(property)) {
    const [a, b2 = a] = parts as [string, string?]
    const [first, second] = found.sides as [Side, Side]
    out.set(first, normalizeLength(a)).set(second, normalizeLength(b2!))
    return out
  }
  for (const side of found.sides) out.set(side, normalizeLength(parts[0] ?? ''))
  return out
}

/** Class → sides of margin/padding its own rules set, from selectors that are exactly `.class`. */
export function ownSpacing(css: string): Map<string, Map<string, string>> {
  const out = new Map<string, Map<string, string>>()
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
  for (const rule of plain.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = rule[1]!.split(',').map(s => s.trim())
    const declared: [string, string][] = []
    for (const decl of rule[2]!.split(';')) {
      const at = decl.indexOf(':')
      if (at < 0) continue
      const property = decl.slice(0, at).trim().toLowerCase()
      const found = cssSides(property)
      if (!found) continue
      for (const [side, value] of sideValues(property, decl.slice(at + 1))) {
        declared.push([`${found.box}-${side}`, value])
      }
    }
    if (!declared.length) continue
    for (const selector of selectors) {
      // Only a rule whose whole selector is the element's own class: that is the one that outranks
      // or ties the utility on the same element. Descendant and modifier rules are out of scope.
      const own = /^\.([A-Z][\w-]*)$/i.exec(selector)
      if (!own) continue
      const map = out.get(own[1]!) ?? new Map<string, string>()
      for (const [key, value] of declared) map.set(key, value)
      out.set(own[1]!, map)
    }
  }
  return out
}

interface TemplateNode {
  type: number
  props?: { type: number; name: string; value?: { content: string } }[]
  children?: TemplateNode[]
}

function staticClasses(node: TemplateNode): string[] {
  const attr = node.props?.find(p => p.type === 6 && p.name === 'class')
  return attr?.value?.content.split(/\s+/).filter(Boolean) ?? []
}

export function conflictsIn(source: string): string[] {
  const { descriptor } = parse(source)
  const css = descriptor.styles.map(s => s.content).join('\n')
  const own = ownSpacing(css)
  if (!own.size || !descriptor.template) return []
  const found: string[] = []
  const walk = (node: TemplateNode) => {
    if (node.type === 1) {
      const classes = staticClasses(node)
      for (const cls of classes) {
        const util = utilitySides(cls)
        if (!util) continue
        for (const other of classes) {
          const sides = own.get(other)
          if (!sides) continue
          // Same value on both sides of the fight draws the same page: redundant, not broken.
          const clash = util.sides.filter(side => {
            const css = sides.get(`${util.box}-${side}`)
            return css !== undefined && css !== util.value
          })
          if (clash.length) found.push(`.${other} + ${cls} (${util.box}-${clash.join('/')})`)
        }
      }
    }
    for (const child of node.children ?? []) walk(child)
  }
  walk(descriptor.template.ast as unknown as TemplateNode)
  return found
}

const sfcs = await glob('{pages,components,layouts}/**/*.vue', { cwd: appRoot, absolute: true })

describe('a spacing utility never fights the element’s own CSS', () => {
  it('reads utilities and properties the way Vuetify and CSS do', () => {
    expect(utilitySides('mt-4')).toEqual({ box: 'margin', sides: ['top'], value: '16px' })
    expect(utilitySides('pa-md-6')).toEqual({ box: 'padding', sides: ALL, value: '24px' })
    expect(utilitySides('mt-n2')?.value).toBe('-8px')
    expect(utilitySides('mx-auto')).toEqual({
      box: 'margin',
      sides: ['left', 'right'],
      value: 'auto',
    })
    expect(sideValues('margin', '0 0 12px').get('bottom')).toBe('12px')
    expect(sideValues('margin', '0 0 12px').get('top')).toBe('0px')
    expect(sideValues('margin-block', '1rem 0').get('top')).toBe('16px')
    expect(utilitySides('text-h6')).toBeNull()
    expect(cssSides('margin')).toEqual({ box: 'margin', sides: ALL })
    expect(cssSides('margin-block-start')).toEqual({ box: 'margin', sides: ['top'] })
    expect(cssSides('color')).toBeNull()
  })

  it('catches the case that shipped: a utility on a class that resets the same side', () => {
    const sfc = `<template><ul class="trust mt-4" /></template>
<style scoped>.trust { margin: 0; list-style: none; }</style>`
    expect(conflictsIn(sfc)).toEqual(['.trust + mt-4 (margin-top)'])
  })

  it('lets a utility that repeats the class value pass: same page either way', () => {
    const sfc = `<template><ul class="list mb-0" /></template>
<style scoped>.list { margin: 0; }</style>`
    expect(conflictsIn(sfc)).toEqual([])
  })

  it('leaves a utility alone when the class does not touch that side', () => {
    const sfc = `<template><p class="lead mb-4" /></template>
<style scoped>.lead { margin-top: 8px; }</style>`
    expect(conflictsIn(sfc)).toEqual([])
  })

  // The debt that was already there on 2026-11-24, declared one by one. SÓLO PUEDE BAJAR: a new
  // conflict fails, and fixing one fails too until its line leaves the list, so the list is always
  // the real one. Most are dead utilities (the page draws the CSS value and looked right to whoever
  // shipped it); fix one by deleting the losing utility or the CSS side, never with `!important`.
  it('holds across the app, apart from the declared debt', () => {
    const offenders: string[] = []
    for (const file of sfcs) {
      for (const hit of conflictsIn(readFileSync(file, 'utf8'))) {
        offenders.push(`${relative(appRoot, file).replace(/\\/g, '/')}: ${hit}`)
      }
    }
    expect(offenders.sort()).toEqual([...KNOWN].sort())
  })
})
