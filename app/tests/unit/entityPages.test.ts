// The routing contract of the three per-entity page families (/couriers-uruguay/<courier>,
// /tarjetas-de-credito-uruguay/<programa>, /tarjetas-de-debito-uruguay/<tarjeta>) and the shared
// helpers their page models are built with.
//
// The slug maps repeat catalogue ids as plain strings on purpose (so linking to a detail page does
// not drag a catalogue into the bundle), which makes these tests the only thing keeping the two in
// step: an id added without a slug, a slug left behind by a removed id, a guard reading another
// family's map or a sitemap template that drifted from the route all turn CI red here.

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { CARD_PROGRAMS } from '../../utils/cardRewards'
import { getComparativaPair, type ComparativaFamily } from '../../utils/comparativas'
import { COURIERS } from '../../utils/courierShipping'
import { DEBIT_CARDS } from '../../utils/debitCards'
import {
  ENTITY_PAGE_FAMILIES,
  ENTITY_PAGE_ROUTES,
  cardProgramPagePath,
  courierPagePath,
  debitCardPagePath,
  entityIdForSlug,
  entityPagePath,
  entityPagePaths,
  entityPageSlugs,
  type EntityPageFamily,
} from '../../utils/entityPageSlugs'
import {
  BRAND_SUFFIX,
  MAX_DESCRIPTION,
  MAX_TITLE,
  TITLE_BUDGET,
  fitDescription,
  comparisonLinks,
  dateLabel,
  ensurePeriod,
  fitTitle,
  formatNumberEs,
  formatRating,
  formatUsd,
  hostOf,
  joinSpanishList,
  lowerFirst,
  nearest,
  scoreExtremes,
  scoreSummary,
  uniqueSources,
} from '../../utils/entityPages'
import { DYNAMIC_ROUTE_KEYS } from '../../utils/siteNav'

const APP = join(__dirname, '..', '..')
const PAGES = join(APP, 'pages')
const SITEMAP = readFileSync(join(APP, 'server', 'api', '__sitemap__', 'urls.get.ts'), 'utf8')
const read = (rel: string) => readFileSync(join(PAGES, rel), 'utf8')

const CATALOGUE_IDS: Record<EntityPageFamily, string[]> = {
  couriers: COURIERS.map(courier => courier.id),
  'tarjetas-de-credito': CARD_PROGRAMS.map(program => program.id),
  'tarjetas-de-debito': DEBIT_CARDS.map(card => card.id),
}

/** The detail page of each family, its route param and the helper its index links with. */
const FAMILY_FILES: Record<EntityPageFamily, { detail: string; param: string; linker: string }> = {
  couriers: {
    detail: 'couriers-uruguay/[courier].vue',
    param: 'courier',
    linker: 'courierPagePath',
  },
  'tarjetas-de-credito': {
    detail: 'tarjetas-de-credito-uruguay/[programa].vue',
    param: 'programa',
    linker: 'cardProgramPagePath',
  },
  'tarjetas-de-debito': {
    detail: 'tarjetas-de-debito-uruguay/[tarjeta].vue',
    param: 'tarjeta',
    linker: 'debitCardPagePath',
  },
}

describe.each(ENTITY_PAGE_FAMILIES)('the %s family', family => {
  const route = ENTITY_PAGE_ROUTES[family]
  const ids = CATALOGUE_IDS[family]
  const files = FAMILY_FILES[family]

  it('gives every catalogue id a slug, and no slug outlives its id', () => {
    expect(Object.keys(route.slugs).sort()).toEqual([...ids].sort())
  })

  it('uses unique, canonical slugs', () => {
    const slugs = entityPageSlugs(family)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  })

  it('round-trips id → path → slug → id', () => {
    for (const id of ids) {
      const path = entityPagePath(family, id)
      expect(path, id).toBeDefined()
      const slug = (path as string).slice(route.index.length + 1)
      expect(entityIdForSlug(family, slug)).toBe(id)
    }
  })

  it('resolves nothing it does not know, prototype keys included', () => {
    for (const probe of ['no-existe', '', 'constructor', '__proto__', 'toString']) {
      expect(entityIdForSlug(family, probe), probe).toBeUndefined()
      expect(entityPagePath(family, probe), probe).toBeUndefined()
    }
  })

  it('emits one path per catalogue row, under its index', () => {
    const paths = entityPagePaths(family)
    expect(paths).toHaveLength(ids.length)
    expect(new Set(paths).size).toBe(paths.length)
    for (const path of paths) expect(path.startsWith(`${route.index}/`)).toBe(true)
  })

  it('has its index at <dir>/index.vue and no flat sibling that would turn it into a layout', () => {
    expect(existsSync(join(PAGES, route.index.slice(1), 'index.vue'))).toBe(true)
    expect(existsSync(join(PAGES, `${route.index.slice(1)}.vue`))).toBe(false)
    expect(existsSync(join(PAGES, files.detail))).toBe(true)
  })

  it('guards the route with its own slug map, so an unknown slug is a real 404', () => {
    const source = read(files.detail)
    expect(source).toMatch(/definePageMeta\(\{\s*validate:/)
    expect(source).toContain(`entityIdForSlug('${family}'`)
    expect(source).toContain(`route.params.${files.param}`)
    // The 404 is decided before any await: a throw after one answers 200 with an error body.
    const script = source.split('<script setup lang="ts">')[1] ?? ''
    const throwAt = script.indexOf('throw createError')
    expect(throwAt).toBeGreaterThan(-1)
    expect(script.slice(0, throwAt)).not.toMatch(/\bawait\b/)
  })

  it('is declared as a dynamic route in the navigation model', () => {
    expect(DYNAMIC_ROUTE_KEYS[files.detail.replace(/\.vue$/, '')]).toBeTruthy()
  })

  it('is submitted by the sitemap under the path the router resolves', () => {
    expect(SITEMAP).toContain(`entityPageSlugs('${family}')`)
    expect(SITEMAP).toContain(`\`${route.index}/\${slug}\``)
  })

  it('links every row of its index page to the detail page', () => {
    expect(read(join(route.index.slice(1), 'index.vue'))).toContain(files.linker)
  })
})

describe('the per-family path helpers', () => {
  it('read the way people search', () => {
    expect(courierPagePath('usxcargo')).toBe('/couriers-uruguay/usx-cargo')
    expect(courierPagePath('miami-box')).toBe('/couriers-uruguay/miami-box')
    expect(cardProgramPagePath('oca-oca-blue')).toBe('/tarjetas-de-credito-uruguay/oca-metraje')
    expect(cardProgramPagePath('itau-volar-black')).toBe(
      '/tarjetas-de-credito-uruguay/itau-volar-black'
    )
    expect(debitCardPagePath('prex')).toBe('/tarjetas-de-debito-uruguay/prex')
    expect(debitCardPagePath('no-existe')).toBeUndefined()
  })
})

describe('the shared copy helpers', () => {
  it('budgets titles for the brand the title template appends', () => {
    expect(TITLE_BUDGET).toBe(MAX_TITLE - BRAND_SUFFIX.length)
  })

  it('takes the richest description that fits the SERP', () => {
    const long = 'y'.repeat(MAX_DESCRIPTION + 1)
    expect(fitDescription([long, 'Corta y con la cifra'])).toBe('Corta y con la cifra')
    expect(fitDescription([false, 'Única'])).toBe('Única')
    expect(fitDescription([long])).toBe(long)
  })

  it('takes the richest title that fits, and never drops the name', () => {
    const long = 'x'.repeat(TITLE_BUDGET + 1)
    expect(fitTitle([long, 'Corto: con detalle', 'Corto'])).toBe('Corto: con detalle')
    expect(fitTitle([false, null, undefined, 'Nombre'])).toBe('Nombre')
    expect(fitTitle([long])).toBe(long)
    expect(fitTitle(['  a   b  '])).toBe('a b')
  })

  it('formats dates, numbers and money the es-UY way', () => {
    expect(dateLabel('2026-06-18')).toBe('18/06/2026')
    expect(formatUsd(17.5)).toBe('US$ 17,50')
    expect(formatUsd(0)).toBe('US$ 0,00')
    expect(formatNumberEs(2.5)).toBe('2,5')
    expect(formatRating(4)).toBe('4,0')
  })

  it('writes Spanish prose', () => {
    expect(joinSpanishList(['a', 'b', 'c'])).toBe('a, b y c')
    expect(joinSpanishList(['a', 'b'], 'o')).toBe('a o b')
    expect(joinSpanishList(['a'])).toBe('a')
    expect(joinSpanishList([])).toBe('')
    expect(ensurePeriod('Sí — Inversión Violeta (pesos)')).toBe('Sí — Inversión Violeta (pesos).')
    expect(ensurePeriod('Listo.')).toBe('Listo.')
  })

  it('lowers a capitalised word but never an acronym or a symbol', () => {
    expect(lowerFirst('Desde EE.UU.')).toBe('desde EE.UU.')
    expect(lowerFirst('US$2,20/100 g')).toBe('US$2,20/100 g')
    expect(lowerFirst('BROU')).toBe('BROU')
    expect(lowerFirst('Ídem')).toBe('ídem')
  })

  it('strips a URL down to its host', () => {
    expect(hostOf('https://www.gripper.com.uy/tarifas')).toBe('gripper.com.uy')
    expect(hostOf('https://glicglobal.com/uy/')).toBe('glicglobal.com')
  })

  it('drops repeated source URLs, keeping the first label', () => {
    const sources = uniqueSources([
      { label: 'a', url: 'https://x' },
      { label: 'b', url: 'https://x' },
      { label: 'c', url: 'https://y' },
    ])
    expect(sources.map(source => source.label)).toEqual(['a', 'c'])
  })

  it('orders neighbours by distance, ties in input order', () => {
    expect(nearest([10, 4, 6, 5], n => Math.abs(n - 5), 3)).toEqual([5, 4, 6])
  })

  it('finds the strongest and weakest axis and states the weights', () => {
    const rows = [
      { id: 'a', label: 'Alfa', weight: 60, score: 40, what: '' },
      { id: 'b', label: 'Beta', weight: 40, score: 90, what: '' },
    ]
    expect(scoreExtremes(rows)).toEqual({ best: rows[1], worst: rows[0] })
    expect(scoreExtremes([])).toBeNull()
    const summary = scoreSummary(rows)
    expect(summary).toContain('beta (90)')
    expect(summary).toContain('alfa (40)')
    expect(summary).toContain('alfa 60% y beta 40%')
  })

  it('links only head-to-heads that exist, and only ones the entity is in', () => {
    const families: ComparativaFamily[] = ['couriers', 'tarjetas-de-credito', 'tarjetas-de-debito']
    for (const family of families) {
      const id = CATALOGUE_IDS[family as EntityPageFamily][0] as string
      for (const link of comparisonLinks(family, id)) {
        const [, , linkFamily, slug] = link.to.split('/')
        const pair = getComparativaPair(linkFamily as string, slug as string)
        expect(pair, link.to).toBeDefined()
        expect(pair?.a.id === id || pair?.b.id === id).toBe(true)
        expect(link.label.startsWith('vs ')).toBe(true)
      }
    }
    expect(comparisonLinks('couriers', 'no-existe')).toEqual([])
  })
})
