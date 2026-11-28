import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The home on a phone, measured 2026-11-28 at 412 px: the two "mejores lugares" rankings were a
// 2×2 of 133 px cards inside a card inside the converter card, 40 px apart (Vuetify 4's 24 px row
// gap plus the Vuetify 3 gutter the columns still carried as `pa-2 pa-sm-3`), 730 px for four
// casas; and every section stood 112 px from the next. These pin the fixes.

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const home = readFileSync(resolve(appRoot, 'pages/index.vue'), 'utf8')

describe('home spacing on a phone', () => {
  it('spaces the rankings with the row gap only, never with a column gutter on top', () => {
    const grids = home.match(/<VRow class="rate-grid">[\s\S]*?<nuxt-link/g) ?? []
    expect(grids).toHaveLength(2)
    for (const grid of grids) {
      const col = /<VCol[\s\S]*?>/.exec(grid)![0]
      expect(col).not.toMatch(/\bclass="[^"]*\bp[axy]?-/)
      expect(col).toMatch(/cols="12"/)
    }
    expect(home).toMatch(/\.rate-grid\s*\{[^}]*--v-col-gap-x/)
  })

  it('turns each ranking into rows inside the converter card below 600 px', () => {
    const xs = home.slice(home.indexOf('@media (max-width: 599.98px)'))
    expect(xs).toMatch(/\.best-rates-card\s*\{[\s\S]*?background: transparent/)
    expect(xs).toMatch(/\.rate-item\s*\{\s*display: grid;/)
    expect(home).toMatch(/best-rates-card pa-0 pa-sm-4/)
  })

  it('keeps the section rhythm at 32 px on a phone', () => {
    expect(home).toMatch(/--section-pad: clamp\(32px,/)
    expect(home).not.toMatch(/class="section-head mb-8"/)
    // A section padded by a bare `py-12` is 48 px on a phone again.
    const bare = [...home.matchAll(/<section[^>]*>/g)].filter(m => / py-12[ "]/.test(m[0]))
    expect(bare).toEqual([])
  })
})
