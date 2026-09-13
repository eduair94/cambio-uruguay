import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  COURIER_REFERENCE_KG,
  getComparativaFamily,
  getComparativaPair,
} from '../../utils/comparativas'
import {
  allCourierPages,
  courierReferenceTable,
  getCourierPage,
  type CourierPageModel,
} from '../../utils/courierPages'
import {
  COURIERS,
  COURIER_RATES_VERIFIED_AT,
  POSTAL_SURCHARGE,
  courierParcelQuote,
  type Courier,
} from '../../utils/courierShipping'
import { courierPagePath } from '../../utils/entityPageSlugs'
import {
  BRAND_SUFFIX,
  MAX_DESCRIPTION,
  MAX_TITLE,
  dateLabel,
  formatNumberEs,
  formatUsd,
} from '../../utils/entityPages'
import { IVA_TASA_BASICA } from '../../utils/ivaTarjeta'

const APP = join(__dirname, '..', '..')
const PAGES = join(APP, 'pages')
const pages = allCourierPages()
const courierOf = (page: CourierPageModel) => COURIERS.find(courier => courier.id === page.id)!
const courier = (id: string): Courier => COURIERS.find(candidate => candidate.id === id)!
const pageOf = (id: string) => pages.find(page => page.id === id)!

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

/** Every string the page renders from the model. */
const everything = (page: CourierPageModel) =>
  [
    ...generated(page),
    page.verificationNote,
    page.quoteNote ?? '',
    page.reference?.comparison ?? '',
    ...(page.reference?.rows ?? []).flatMap(row => [row.label, row.value]),
    ...page.facts.map(fact => `${fact.label} ${fact.value}`),
    ...page.faq.flatMap(item => [item.question, item.answer]),
  ].join(' ')

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

  it('fits the description in the SERP and leads with the price when there is one', () => {
    for (const page of pages) {
      expect(page.description.length, page.description).toBeLessThanOrEqual(MAX_DESCRIPTION)
      expect(page.description.length, page.description).toBeGreaterThanOrEqual(80)
      expect(page.description.startsWith(page.name)).toBe(true)
      expect(page.heading).toContain(page.name)
      // The figure opens the description, so it is what survives the SERP's cut.
      if (page.reference) expect(page.description.indexOf('US$'), page.description).toBeLessThan(45)
    }
  })

  it('never prints a placeholder artefact', () => {
    for (const page of pages) {
      expect(everything(page)).not.toMatch(/\bundefined\b|\bNaN\b|\bnull\b/)
      for (const line of generated(page)) expect(line).not.toMatch(/\s{2,}/)
    }
  })

  // Thin couriers stay indexed; what makes them worth a page is shown, not left in the catalogue.
  it('shows everything the catalogue has on the courier: note, rating and review', () => {
    for (const page of pages) {
      const c = courierOf(page)
      if (c.note) expect(page.facts.some(fact => fact.value === c.note)).toBe(true)
      if (typeof c.rating === 'number') expect(page.ratingLabel).toBeTruthy()
      expect(page.reviewsNote).toBe(c.reviewsNote ?? null)
    }
  })
})

// The typed fields restate each note; they may never say more than it does.
describe('the note-derived courier fields match their notes', () => {
  it('marks a rate all-inclusive exactly when its note says "todo incluido"', () => {
    for (const c of COURIERS) {
      expect(Boolean(c.rateIncludesSurcharge), c.id).toBe(/todo incluido/i.test(c.note ?? ''))
    }
  })

  it('marks IVA on the handling fee exactly when its note says "manejo US$…+IVA"', () => {
    for (const c of COURIERS) {
      expect(Boolean(c.baseIvaExcluded), c.id).toBe(
        /manejo US\$\s*[\d,]+\s*\+\s*IVA/i.test(c.note ?? '')
      )
    }
  })

  it('lists extra fees only with the amounts their note publishes', () => {
    for (const c of COURIERS) {
      const note = c.note ?? ''
      expect(Boolean(c.extraFees?.length), c.id).toBe(/interior|despacho de aduana/i.test(note))
      for (const fee of c.extraFees ?? []) {
        expect(note, `${c.id}: ${fee.label}`).toContain(`US$${formatNumberEs(fee.usd)}`)
        expect(Boolean(fee.approximate), `${c.id}: ${fee.label}`).toBe(
          note.includes(`~US$${formatNumberEs(fee.usd)}`)
        )
      }
    }
  })
})

describe('the worked parcel follows each courier’s own note', () => {
  it('prices every published tariff with courierParcelQuote', () => {
    for (const page of pages.filter(p => courierOf(p).perKgUsd !== null)) {
      const quote = courierParcelQuote(courierOf(page), COURIER_REFERENCE_KG)!
      expect(page.reference, page.id).not.toBeNull()
      expect(page.reference!.totalUsd).toBeCloseTo(quote.totalUsd, 9)
      expect(
        page.reference!.tariffUsd + page.reference!.surchargeUsd + page.reference!.baseIvaUsd
      ).toBeCloseTo(page.reference!.totalUsd, 9)
      const total = page.reference!.rows.find(row => row.kind === 'total')
      expect(total?.value).toBe(formatUsd(page.reference!.totalUsd))
    }
  })

  it('adds nothing on top of an all-inclusive rate (SoyCourier)', () => {
    const c = courier('soycourier')
    const page = pageOf('soycourier')
    expect(page.reference?.surchargeUsd).toBe(0)
    expect(page.reference?.totalUsd).toBeCloseTo(c.perKgUsd! * COURIER_REFERENCE_KG, 9)
    expect(page.surcharge.included).toBe(true)
    expect(page.description).toContain('todo incluido')
    expect(page.description).not.toContain(`${POSTAL_SURCHARGE.ratePct}% de`)
    const faq = page.faq.find(item => item.id === 'recargo-de-ley')
    expect(faq?.question).not.toContain('que se suma')
    expect(faq?.answer).toContain('no le suma')
  })

  it.each(['aerobox', 'starbox'])('adds the IVA of a handling fee published "+IVA" (%s)', id => {
    const c = courier(id)
    const page = pageOf(id)
    const iva = (c.baseUsd! * IVA_TASA_BASICA) / 100
    const tariff = c.perKgUsd! * COURIER_REFERENCE_KG + c.baseUsd!
    expect(page.reference?.baseIvaUsd).toBeCloseTo(iva, 9)
    expect(page.reference?.totalUsd).toBeCloseTo(
      tariff * (1 + POSTAL_SURCHARGE.ratePct / 100) + iva,
      9
    )
    expect(page.reference?.rows.some(row => row.label.includes('IVA'))).toBe(true)
    expect(page.facts.find(fact => fact.label === 'Cargo fijo por envío')?.value).toBe(
      `${formatUsd(c.baseUsd!)} + IVA`
    )
    expect(page.lead).toContain('+ IVA')
    expect(page.lead).not.toContain(`${formatUsd(c.baseUsd!)} fijos`)
  })

  it('shows a fee it cannot price next to the total and leaves the courier unranked (Casilla Mía)', () => {
    const page = pageOf('casillamia')
    expect(page.reference?.complete).toBe(false)
    expect(page.reference?.rank).toBeNull()
    expect(courierReferenceTable().some(row => row.courier.id === 'casillamia')).toBe(false)
    const asides = page.reference!.rows.filter(row => row.kind === 'aside')
    expect(asides.map(row => row.value)).toEqual([formatUsd(75), formatUsd(135)])
    expect(page.reference!.rows.find(row => row.kind === 'total')?.label).toContain('despacho')
    expect(page.reference!.comparison).toContain('despacho de aduana')
    expect(page.description).toContain('despacho de aduana')
    expect(page.faq.some(item => item.id === 'mas-barato')).toBe(false)
    expect(page.faq.find(item => item.id === 'paquete-de-referencia')?.answer).toContain(
      'sin contar despacho de aduana'
    )
  })

  it.each(['usxcargo', 'starbox'])(
    'shows an optional fee next to the total without adding it or unranking (%s)',
    id => {
      const c = courier(id)
      const page = pageOf(id)
      const fee = c.extraFees![0]!
      expect(page.reference?.complete).toBe(true)
      expect(page.reference?.rank).not.toBeNull()
      const aside = page.reference!.rows.find(row => row.kind === 'aside')
      expect(aside?.value).toContain(formatUsd(fee.usd))
      const quote = courierParcelQuote(c, COURIER_REFERENCE_KG)!
      expect(quote.totalUsd).toBeCloseTo(quote.tariffUsd + quote.surchargeUsd + quote.baseIvaUsd, 9)
    }
  )

  it.each(['grinbox', 'glic'])(
    'says a missing handling fee is unpublished, not quoted (%s)',
    id => {
      const page = pageOf(id)
      expect(page.facts.find(fact => fact.label === 'Cargo fijo por envío')?.value).toBe(
        'No publica cargo fijo'
      )
      expect(everything(page)).not.toContain('caso a caso')
      expect(page.lead).toContain('no publica cargo fijo')
    }
  )

  it('ranks only complete prices: ties share a place and the cheapest is first', () => {
    const table = courierReferenceTable()
    for (const page of pages.filter(p => p.reference?.complete)) {
      expect(page.reference!.of).toBe(table.length)
      expect(page.reference!.rank).toBeGreaterThanOrEqual(1)
      expect(page.reference!.rank).toBeLessThanOrEqual(table.length)
    }
    expect(pageOf(table[0]!.courier.id).reference?.rank).toBe(1)
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
    const usx = courier('usxcargo')
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

  it('covers the parcel, the ranking and the reputation only when the data exists', () => {
    for (const page of pages) {
      const c = courierOf(page)
      const ids = page.faq.map(item => item.id)
      expect(ids.includes('paquete-de-referencia')).toBe(c.perKgUsd !== null)
      expect(ids.includes('mas-barato')).toBe(Boolean(page.reference?.complete))
      expect(ids.includes('opiniones')).toBe(Boolean(c.reviewsNote))
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
