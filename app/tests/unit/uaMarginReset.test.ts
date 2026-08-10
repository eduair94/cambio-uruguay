import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Vuetify 4 ships no reset for text-block margins, so <p>/<h*>/<ul>/<pre> keep the
// browser's `margin-block: 1em`. Where it cannot collapse — the first child of a
// padded box or of a flex/grid item, i.e. every callout and alert head on the site —
// it renders as a gap nobody authored: the title lands ~16px below its own icon.
// critical.css closes that case globally. This test is what keeps it closed: the rule
// is three lines of CSS in a 300-line file and reads like dead weight to anyone who
// doesn't know it repaired 194 elements across 20 pages.
//
// The zero-specificity :where() wrapper is part of the contract, not decoration — it
// makes the reset lose to every rule we author, including an `mt-*` utility.
const CRITICAL_CSS = path.resolve(__dirname, '..', '..', 'assets', 'css', 'critical.css')

describe('text-block margin reset', () => {
  const css = fs.readFileSync(CRITICAL_CSS, 'utf8')
  const rule = css.match(/:where\(([^)]*)\):first-child\s*\{[^}]*\}/)

  it('neutralises the UA margin on the first child of a box', () => {
    expect(rule, 'critical.css lost its `:where(...):first-child` margin reset').not.toBeNull()
    expect(rule![0]).toMatch(/margin-block-start:\s*0/)
  })

  it('covers every element the browser gives a default block margin', () => {
    const covered = rule![1].split(',').map(s => s.trim())
    for (const tag of [
      'p',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'dl',
      'blockquote',
      'pre',
      'figure',
    ])
      expect(covered, `<${tag}> is missing from the reset`).toContain(tag)
  })

  it('keeps zero specificity so authored margins still win', () => {
    // `p:first-child { … }` (0,1,1) would beat a single-class rule like `.hero-lead`
    // and silently delete spacing pages had declared for themselves.
    expect(rule![0].startsWith(':where(')).toBe(true)
    expect(rule![0]).not.toMatch(/!important/)
  })
})
