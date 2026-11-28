import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { pizarraStrip } from '../../utils/pizarraRoll'

/**
 * The motion system and the engravings (DESIGN.md → Engravings, Motion), 2026-11-28.
 *
 * - Nothing the server rendered may be hidden by CSS waiting for a script: the old `.reveal`
 *   rule set `opacity: 0` on every element at mount, so a section on screen blinked out and
 *   faded back in, and a page whose script failed would have stayed blank below the fold.
 * - The site has ONE animation library, Motion; @vueuse/motion (+ popmotion, ~30 KB) is gone.
 * - Every engraving a page points at exists, is ink-only WebP and stays light.
 */
const APP = join(__dirname, '..', '..')
const read = (path: string) => readFileSync(join(APP, path), 'utf8')

describe('scripted arrivals never hide content from CSS', () => {
  const critical = read('assets/css/critical.css')

  it('critical.css has no reveal state that starts transparent', () => {
    expect(critical).not.toMatch(/\.reveal\s*\{/)
    expect(critical).not.toMatch(/\.is-revealed/)
  })

  it('v-reveal leaves anything already on screen, and reduced motion, untouched', () => {
    const plugin = read('plugins/reveal.ts')
    expect(plugin).toMatch(/motionReduced\(\)\)\s*return/)
    expect(plugin).toMatch(/getBoundingClientRect\(\)\.top < window\.innerHeight\) return/)
    // Not a ratio threshold: a section taller than ten screens could never reach it.
    expect(plugin).not.toMatch(/threshold:/)
    // A library that never arrives (offline, failed chunk) shows the element instead.
    expect(plugin).toMatch(/Promise\.race\(\[ready, grace\]\)/)
    // The inline priming is removed once the tween ends, so CSS hovers work again.
    expect(plugin).toMatch(/removeProperty\('opacity'\)/)
  })

  it('the page arrival animates opacity only', () => {
    const plugin = read('plugins/page-arrive.client.ts')
    const call = plugin.slice(plugin.indexOf('animate('))
    expect(call).toMatch(/\{ opacity: \[0\.35, 1\] \}/)
    expect(call).not.toMatch(/transform|filter/)
  })
})

describe('the entry chunk carries no animation library', () => {
  it('the universal plugin and the arrival plugin import Motion on demand only', () => {
    for (const file of ['plugins/reveal.ts', 'plugins/page-arrive.client.ts']) {
      const source = read(file)
      expect(source, file).not.toMatch(/^import .* from 'motion/m)
      expect(source, file).toMatch(/import\('motion\/mini'\)/)
    }
  })
})

describe('one animation library', () => {
  it('@vueuse/motion is not a dependency, Motion is', () => {
    const pkg = JSON.parse(read('package.json')) as { dependencies: Record<string, string> }
    expect(pkg.dependencies['@vueuse/motion']).toBeUndefined()
    expect(pkg.dependencies.motion).toBeDefined()
  })

  it('no source file imports it or uses its directive', () => {
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(join(APP, dir))) {
        const rel = join(dir, name)
        if (statSync(join(APP, rel)).isDirectory()) walk(rel)
        else if (
          /\.(?:vue|ts)$/.test(name) &&
          /from '@vueuse\/motion|<[^>]*\sv-motion[\s>]/.test(read(rel))
        )
          offenders.push(rel)
      }
    }
    for (const dir of ['pages', 'components', 'layouts', 'plugins', 'composables', 'utils'])
      walk(dir)
    expect(offenders).toEqual([])
  })
})

describe('la pizarra', () => {
  it('a column turns once and lands on its digit', () => {
    const strip = pizarraStrip(4)
    expect(strip[0]).toBe('0')
    expect(strip.at(-1)).toBe('4')
    expect(strip).toHaveLength(15)
  })

  it('zero still turns a full lap', () => {
    expect(pizarraStrip(0)).toHaveLength(11)
    expect(pizarraStrip(0).at(-1)).toBe('0')
  })
})

describe('the engravings', () => {
  const sources = ['pages/index.vue', 'error.vue'].map(read).join('\n')
  const referenced = [...new Set(sources.match(/\/img\/grabados\/[a-z0-9-]+\.webp/g) ?? [])]

  it('the home and the error page use them', () => {
    expect(referenced.length).toBeGreaterThanOrEqual(8)
  })

  for (const url of referenced) {
    it(`${url} exists, is WebP and weighs under 100 KB`, () => {
      const file = join(APP, 'public', url)
      const bytes = readFileSync(file)
      expect(bytes.subarray(0, 4).toString('latin1')).toBe('RIFF')
      expect(bytes.subarray(8, 12).toString('latin1')).toBe('WEBP')
      expect(statSync(file).size).toBeLessThan(100 * 1024)
    })
  }
})
