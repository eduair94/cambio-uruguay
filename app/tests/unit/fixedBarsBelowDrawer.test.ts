import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from '@vue/compiler-sfc'
import { describe, expect, it } from 'vitest'

// The menu has to cover the page. Measured in production on 2026-11-20 (m390 probe of a
// /alquileres/<key> sheet with the hamburger open): the fixed "$ 44.000 · VER AVISO" bar of the
// rental sheet (z-index 1900) was painted OVER the open drawer and its scrim, hid the last menu
// entries and stayed tappable while the menu was open. The map card of /alquileres-uruguay
// (z-index 1850 on phones) used the same pattern.
//
// Vuetify's layout stacks its items from ROOT_ZINDEX = 1000 (composables/layout.js): with the
// app bar as the only measured layout item it gets 1004, and the temporary drawer, which takes no
// layout space, sits one step above it: scrim 1005, drawer 1006. A fixed bar of a page therefore
// stays at 1003 or less (below the app bar, the scrim and the drawer), and the map card stays
// above Leaflet's control corners (`.leaflet-top, .leaflet-bottom { z-index: 1000 }`).

const APP = resolve(__dirname, '../..')
const FILES = ['pages/alquileres/[key].vue', 'components/rentals/MapPropertyDetail.vue']
const BELOW_APP_BAR = 1003
const LEAFLET_CONTROLS = 1000

interface Rule {
  selector: string
  body: string
}

/** Every innermost rule of a component's CSS (rules inside @media included). */
function rulesOf(file: string): Rule[] {
  const filename = resolve(APP, file)
  const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
  return descriptor.styles.flatMap(style =>
    [...style.content.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
      ([, selector, body]) => ({ selector: selector!.replace(/\s+/g, ' ').trim(), body: body! })
    )
  )
}

function declaration(body: string, property: string): string | undefined {
  return body.match(new RegExp(`(?:^|;|\\s)${property}\\s*:\\s*([^;]+)`))?.[1]?.trim()
}

const fixedRules = FILES.flatMap(file =>
  rulesOf(file)
    .filter(rule => declaration(rule.body, 'position') === 'fixed')
    .map(rule => ({ file, ...rule, zIndex: Number(declaration(rule.body, 'z-index')) }))
)

describe('fixed bars of the rental pages stay below the navigation drawer', () => {
  it('finds the two fixed bars it guards', () => {
    expect(fixedRules.map(r => r.selector).sort()).toEqual([
      '.rental-map-detail',
      '.rental-page__mobile-action',
    ])
  })

  it.each(fixedRules.map(r => [r.selector, r] as const))(
    '%s has a z-index below the app bar, scrim and drawer',
    (_selector, rule) => {
      expect(Number.isFinite(rule.zIndex), `${rule.file}: ${rule.selector}`).toBe(true)
      expect(rule.zIndex).toBeLessThanOrEqual(BELOW_APP_BAR)
    }
  )

  it('keeps the map card above the Leaflet controls and the rental bar above the sticky sections', () => {
    const mapCard = fixedRules.find(r => r.selector === '.rental-map-detail')!
    expect(mapCard.zIndex).toBeGreaterThan(LEAFLET_CONTROLS)

    const sections = rulesOf('pages/alquileres/[key].vue')
      .map(rule => Number(declaration(rule.body, 'z-index')))
      .filter(Number.isFinite)
      .filter(z => z < LEAFLET_CONTROLS)
    const bar = fixedRules.find(r => r.selector === '.rental-page__mobile-action')!
    expect(bar.zIndex).toBeGreaterThan(Math.max(...sections))
  })

  it('rests on the z-index Vuetify and Leaflet actually ship', () => {
    const layout = readFileSync(
      resolve(APP, 'node_modules/vuetify/lib/composables/layout.js'),
      'utf8'
    )
    expect(layout).toMatch(/const ROOT_ZINDEX = 1000;/)
    const leaflet = readFileSync(resolve(APP, 'node_modules/leaflet/dist/leaflet.css'), 'utf8')
    expect(leaflet).toMatch(/\.leaflet-top,\s*\.leaflet-bottom\s*\{[^}]*z-index:\s*1000;/)
  })
})
