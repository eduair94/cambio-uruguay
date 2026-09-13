import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  courierReferenceCost,
  getComparativaFamily,
  getComparativaPair,
} from '../../utils/comparativas'
import {
  allCourierPages,
  courierReferenceTable,
  getCourierPage,
  type CourierPageModel,
} from '../../utils/courierPages'
import { COURIERS, COURIER_RATES_VERIFIED_AT, POSTAL_SURCHARGE } from '../../utils/courierShipping'
import { courierPagePath } from '../../utils/entityPageSlugs'
import { BRAND_SUFFIX, MAX_TITLE, dateLabel, formatUsd } from '../../utils/entityPages'

const APP = join(__dirname, '..', '..')
const PAGES = join(APP, 'pages')
const pages = allCourierPages()
const courierOf = (page: CourierPageModel) => COURIERS.find(courier => courier.id === page.id)!

/** A link target the router can answer: a page file, or a family of the comparativas. */
function routeExists(path: string): boolean {
  const clean = (path.split('#')[0] ?? '').split('?')[0] ?? ''
  const family = clean.match(/^\/comparativas\/([^/]+)$/)?.[1]
  if (family) return Boolean(getComparativaFamily(family))
  const rel = clean.replace(/^\//, '')
  return existsSync(join(PAGES, `${rel}.vue`)) || existsSync(join(PAGES, rel, 'index.vue'))
}

/** The copy this module writes itself, as opposed to catalogue text it quotes verbatim. */
const generated = (page: CourierPageModel) => [
  page.title,
  page.description,
  page.heading,
  page.lead,
]

describe('every courier gets a page', () => {
  it('builds one model per courier, reachable by its slug', () => {
    expect(pages).toHaveLength(COURIERS.length)
    for (const page of pages) {
      expect(getCourierPage(page.slug)?.id).toBe(page.id)
      expect(page.path).toBe(courierPagePath(page.id))
    }
    expect(getCourierPage('no-existe')).toBeUndefined()
    expect(getCourierPage('')).toBeUndefined()
  })

  it('fits every title in the SERP with the brand appended', () => {
    for (const page of pages) {
      const rendered = `${page.title}${BRAND_SUFFIX}`
      expect(rendered.length, rendered).toBeLessThanOrEqual(MAX_TITLE)
      expect(page.title.startsWith(page.name)).toBe(true)
    }
  })

  it('keeps titles, headings and descriptions distinct across the family', () => {
    for (const pick of [(p: CourierPageModel) => p.title, (p: CourierPageModel) => p.heading]) {
      expect(new Set(pages.map(pick)).size).toBe(pages.length)
    }
    expect(new Set(pages.map(page => page.description)).size).toBe(pages.length)
  })

  it('writes a description a SERP can show, naming the courier', () => {
    for (const page of pages) {
      expect(page.description.length, page.description).toBeGreaterThanOrEqual(100)
      expect(page.description.length, page.description).toBeLessThanOrEqual(230)
      expect(page.description).toContain(page.name)
      expect(page.heading).toContain(page.name)
    }
  })

  it('never prints a placeholder artefact', () => {
    for (const page of pages) {
      const text = [
        ...generated(page),
        page.verificationNote,
        page.quoteNote ?? '',
        page.reference?.comparison ?? '',
        ...page.facts.map(fact => fact.value),
        ...page.faq.flatMap(item => [item.question, item.answer]),
      ].join(' ')
      expect(text).not.toMatch(/\bundefined\b|\bNaN\b|\bnull\b/)
      for (const line of generated(page)) expect(line).not.toMatch(/\s{2,}/)
    }
  })
})

describe('figures come from the catalogue, never from a guess', () => {
  const entities = getComparativaFamily('couriers')?.entities ?? []

  it('prices the reference parcel with the same arithmetic as the comparativas', () => {
    for (const page of pages.filter(p => courierOf(p).perKgUsd !== null)) {
      const entity = entities.find(candidate => candidate.id === page.id)!
      expect(page.reference, page.id).not.toBeNull()
      expect(page.reference!.totalUsd).toBeCloseTo(courierReferenceCost(entity)!, 9)
      expect(page.reference!.tariffUsd + page.reference!.surchargeUsd).toBeCloseTo(
        page.reference!.totalUsd,
        9
      )
      expect(page.reference!.rows.at(-1)?.value).toBe(formatUsd(page.reference!.totalUsd))
    }
  })

  it('ranks the parcel consistently: ties share a place and the cheapest is first', () => {
    const table = courierReferenceTable()
    for (const page of pages.filter(p => p.reference)) {
      expect(page.reference!.of).toBe(table.length)
      expect(page.reference!.rank).toBeGreaterThanOrEqual(1)
      expect(page.reference!.rank).toBeLessThanOrEqual(table.length)
    }
    expect(
      getCourierPage(courierPagePath(table[0]!.courier.id)!.split('/').pop()!)?.reference?.rank
    ).toBe(1)
  })

  it('never invents a price for a courier that only quotes online', () => {
    const quoteOnly = pages.filter(page => courierOf(page).perKgUsd === null)
    expect(quoteOnly.length).toBeGreaterThan(0)
    for (const page of quoteOnly) {
      expect(page.reference).toBeNull()
      expect(page.quoteNote).toBeTruthy()
      expect(page.description).not.toContain('US$')
      const perKg = page.facts.find(fact => fact.label.startsWith('Tarifa por kilo'))
      expect(perKg?.value).not.toContain('US$')
      const ids = page.faq.map(item => item.id)
      expect(ids).not.toContain('paquete-de-referencia')
      expect(ids).not.toContain('mas-barato')
    }
  })

  it('says an unpublished transit time is unpublished', () => {
    for (const page of pages) {
      const transit = courierOf(page).transit
      const fact = page.facts.find(item => item.label === 'Demora típica')
      expect(fact?.value).toBe(transit ?? 'No la publica')
      expect(page.faq.some(item => item.id === 'demora')).toBe(Boolean(transit))
    }
  })

  it('dates the figures with the module verification date', () => {
    for (const page of pages) {
      expect(page.verifiedAt).toBe(COURIER_RATES_VERIFIED_AT)
      expect(page.verifiedLabel).toBe(dateLabel(COURIER_RATES_VERIFIED_AT))
      expect(page.verificationNote).toContain(page.verifiedLabel)
    }
  })

  it('answers "usx cargo" with its own published tariff', () => {
    const usx = COURIERS.find(courier => courier.id === 'usxcargo')!
    const page = getCourierPage('usx-cargo')
    expect(page?.name).toBe(usx.name)
    expect(page?.title).toContain('USX Cargo')
    expect(page?.description).toContain(formatUsd(usx.perKgUsd!))
  })
})

describe('the FAQ asks only what the catalogue can answer', () => {
  it('opens with the price question and keeps ids unique', () => {
    for (const page of pages) {
      expect(page.faq[0]?.id).toBe('precio-por-kilo')
      const ids = page.faq.map(item => item.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const item of page.faq) {
        expect(item.question.startsWith('¿') && item.question.endsWith('?')).toBe(true)
        expect(item.answer.length).toBeGreaterThan(40)
      }
    }
  })

  it('covers the worked parcel and the reputation only when the data exists', () => {
    for (const page of pages) {
      const courier = courierOf(page)
      const ids = page.faq.map(item => item.id)
      expect(ids.includes('paquete-de-referencia')).toBe(courier.perKgUsd !== null)
      expect(ids.includes('opiniones')).toBe(Boolean(courier.reviewsNote))
    }
  })

  it('explains the statutory surcharge from POSTAL_SURCHARGE', () => {
    for (const page of pages) {
      const answer = page.faq.find(item => item.id === 'recargo-de-ley')?.answer ?? ''
      expect(answer).toContain(POSTAL_SURCHARGE.name)
      expect(answer).toContain(POSTAL_SURCHARGE.source)
      for (const alias of POSTAL_SURCHARGE.aliases) expect(answer).toContain(alias)
    }
  })
})

describe('links', () => {
  it('links every head-to-head the courier takes part in', () => {
    for (const page of pages) {
      expect(page.comparisons).toHaveLength(COURIERS.length - 1)
      for (const link of page.comparisons) {
        const [, , family, slug] = link.to.split('/')
        expect(getComparativaPair(family as string, slug as string), link.to).toBeDefined()
      }
    }
  })

  it('links three to five other couriers, never itself', () => {
    for (const page of pages) {
      expect(page.siblings.length).toBeGreaterThanOrEqual(3)
      expect(page.siblings.length).toBeLessThanOrEqual(5)
      for (const link of page.siblings) {
        expect(link.to).not.toBe(page.path)
        expect(pages.some(other => other.path === link.to)).toBe(true)
      }
    }
  })

  it('sends readers only to routes that exist', () => {
    for (const page of pages) {
      for (const link of page.tools) expect(routeExists(link.to), link.to).toBe(true)
      expect(page.tools.map(link => link.to)).toContain(
        '/herramientas/calculadora-impuestos-importacion'
      )
      expect(page.tools.map(link => link.to)).toContain('/franquicia-aduana-uruguay')
    }
  })

  it('cites the courier and the law behind the surcharge', () => {
    for (const page of pages) {
      const urls = page.sources.map(source => source.url)
      expect(urls).toContain(courierOf(page).source)
      expect(urls).toContain(POSTAL_SURCHARGE.sourceUrl)
      expect(new Set(urls).size).toBe(urls.length)
      for (const url of urls) expect(url).toMatch(/^https:\/\//)
    }
  })
})

// Same guard as importTax.test.ts places on /couriers-uruguay: one 10% under ONE name. Comments may
// name the acronym, that is how the bug gets explained; code and markup may not.
describe('the surcharge acronym is only ever read from POSTAL_SURCHARGE', () => {
  const strip = (source: string) =>
    source
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')

  it.each([
    join(APP, 'utils', 'courierPages.ts'),
    join(PAGES, 'couriers-uruguay', '[courier].vue'),
  ])('%s', file => {
    expect(strip(readFileSync(file, 'utf8')).match(/\bT?F?SPU\b/g) ?? []).toEqual([])
  })
})
