import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  COURIER_REFERENCE_KG,
  getComparativaFamily,
  getComparativaPair,
} from '../../utils/comparativas'
import {
  COURIER_CHECKS,
  COURIER_CHECKED_AT,
  courierCheck,
  verifiedCourier,
} from '../../utils/courierChecks'
import {
  allCourierPages,
  courierEstimate,
  courierReferenceTable,
  getCourierPage,
  type CourierPageModel,
} from '../../utils/courierPages'
import {
  COURIERS,
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
/** The row each page prices: the catalogue with its site's reading on top. */
const courierOf = (page: CourierPageModel) =>
  verifiedCourier(COURIERS.find(courier => courier.id === page.id)!)
const courier = (id: string): Courier =>
  verifiedCourier(COURIERS.find(candidate => candidate.id === id)!)
const pageOf = (id: string) => pages.find(page => page.id === id)!
/** `usxcargo.com` and `https://usxcargo.com/` are one page. */
const bareUrl = (url: string) =>
  url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')

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
      // The figure opens the description, so it is what survives the SERP's cut. A courier that is
      // not flying opens with that instead: a price for a service it is not giving is not news.
      if (page.reference && page.operating) {
        expect(page.description.indexOf('US$'), page.description).toBeLessThan(45)
      }
      if (!page.operating) expect(page.description).toContain('suspendió sus vuelos')
    }
  })

  // "usx cargo", "urubox", "soycourier": the name is the query, the price is why the result wins.
  it('puts the figure in the title of every courier that is flying, right after the name', () => {
    for (const page of pages.filter(p => p.operating)) {
      expect(page.title, page.title).toMatch(new RegExp(`^${page.name}: .*US\\$ \\d`))
    }
  })

  it('dates every description with the day the courier’s site was read', () => {
    for (const page of pages) {
      expect(page.description, page.id).toContain(dateLabel(COURIER_CHECKED_AT))
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

// The typed fields restate each note; they may never say more than it does. The catalogue rows are
// pinned to their notes below; the readings in utils/courierChecks.ts get their own block.
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

  // Its FAQ calls US$ 14,99 a kilo all-inclusive; its calculator, read on 2026-10-19, adds US$ 9,99
  // of handling and a delivery charge that depends on how you receive it. The page follows both:
  // no surcharge on top, the handling fee in, the delivery next to the total and no ranking.
  it('adds nothing on top of an all-inclusive rate, but adds what its calculator charges (SoyCourier)', () => {
    const c = courier('soycourier')
    const page = pageOf('soycourier')
    expect(page.reference?.surchargeUsd).toBe(0)
    expect(page.reference?.totalUsd).toBeCloseTo(c.perKgUsd! * COURIER_REFERENCE_KG + c.baseUsd!, 9)
    expect(page.reference?.complete).toBe(false)
    expect(page.reference?.rank).toBeNull()
    expect(page.reference!.rows.filter(row => row.kind === 'aside').map(row => row.value)).toEqual([
      formatUsd(1.99),
      formatUsd(4.99),
    ])
    // With the pick-up charge, the worked total is exactly what its calculator printed.
    expect(page.reference!.totalUsd + 1.99).toBeCloseTo(page.calculator!.referenceUsd!, 9)
    expect(page.surcharge.included).toBe(true)
    expect(page.description).toContain('cargo de entrega')
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

  it.each(['usxcargo', 'puntomio'])(
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
    for (const page of pages.filter(p => p.reference?.complete && p.operating)) {
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
      expect(page.estimator).toBeNull()
      expect(page.quoteNote).toBeTruthy()
      // The only dollar figures it may print are the ones its own calculator printed.
      const printed = page.calculator?.readings.map(reading => reading.value) ?? []
      for (const amount of page.description.match(/US\$ [\d.,]+\d/g) ?? []) {
        expect(printed, page.description).toContain(amount)
      }
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

  it('dates the figures with the day each courier’s site was read', () => {
    for (const page of pages) {
      const checkedAt = courierCheck(page.id)!.checkedAt
      expect(page.verifiedAt).toBe(checkedAt)
      expect(page.verifiedLabel).toBe(dateLabel(checkedAt))
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
      expect(ids.includes('mas-barato')).toBe(page.reference?.rank != null)
      expect(ids.includes('casillero')).toBe(Boolean(page.originsText))
      expect(ids.includes('calculadora')).toBe(Boolean(page.calculatorUrl))
      expect(ids.includes('pago')).toBe(Boolean(page.payment))
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

  it('cites the courier, every page read on the check date and the law behind the surcharge', () => {
    for (const page of pages) {
      const urls = page.sources.map(source => source.url)
      const bare = urls.map(bareUrl)
      expect(bare, page.id).toContain(bareUrl(courierOf(page).source))
      for (const read of courierCheck(page.id)!.sources) expect(urls).toContain(read)
      expect(urls).toContain(POSTAL_SURCHARGE.sourceUrl)
      expect(new Set(bare).size, page.id).toBe(bare.length)
      for (const url of urls) expect(url).toMatch(/^https:\/\//)
    }
  })
})

describe('each courier’s site, as read on the check date', () => {
  it('has a reading for every catalogue courier and none for an unknown one', () => {
    expect(Object.keys(COURIER_CHECKS).sort()).toEqual(COURIERS.map(c => c.id).sort())
    for (const check of Object.values(COURIER_CHECKS)) {
      expect(check.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(check.sources.length).toBeGreaterThan(0)
      for (const url of [...check.sources, check.calculatorUrl ?? 'https://x']) {
        expect(url).toMatch(/^https:\/\//)
      }
      expect(check.origins.length).toBeGreaterThan(0)
    }
  })

  // An override is a contradiction the site showed that day. One that restates the catalogue is
  // noise that would survive the day the catalogue is corrected.
  it('only overrides what the site contradicted', () => {
    for (const [id, check] of Object.entries(COURIER_CHECKS)) {
      const row = COURIERS.find(c => c.id === id)!
      for (const [field, value] of Object.entries(check.tariff ?? {})) {
        expect(JSON.stringify(value), `${id}.${field}`).not.toBe(
          JSON.stringify(row[field as keyof Courier])
        )
      }
    }
  })

  it('pins the overridden typed fields to the overridden note, like the catalogue', () => {
    for (const id of Object.keys(COURIER_CHECKS)) {
      const c = courier(id)
      const note = c.note ?? ''
      expect(Boolean(c.rateIncludesSurcharge), id).toBe(/todo incluido/i.test(note))
      expect(Boolean(c.baseIvaExcluded), id).toBe(/manejo US\$\s*[\d,]+\s*\+\s*IVA/i.test(note))
      for (const fee of c.extraFees ?? []) {
        expect(note, `${id}: ${fee.label}`).toContain(`US$${formatNumberEs(fee.usd)}`)
        expect(Boolean(fee.approximate), `${id}: ${fee.label}`).toBe(
          note.includes(`~US$${formatNumberEs(fee.usd)}`)
        )
      }
    }
  })

  it('records each calculator answer with its own breakdown, adding up to what it printed', () => {
    for (const [id, check] of Object.entries(COURIER_CHECKS)) {
      if (!check.calculator) continue
      expect(check.calculatorUrl, id).toBeTruthy()
      const reference = check.calculator.readings.find(r => r.kg === COURIER_REFERENCE_KG)
      expect(reference, id).toBeDefined()
      const sum = check.calculator.lines.reduce((total, line) => total + line.usd, 0)
      expect(sum, id).toBeCloseTo(reference!.totalUsd, 9)
    }
  })

  // A per-kilo rate read off a calculator has to give back what the calculator printed, at every
  // weight it was asked about: plus, at most, the optional fees the calculator also included.
  it('derives a calculator-sourced rate that reproduces every reading', () => {
    for (const [id, check] of Object.entries(COURIER_CHECKS)) {
      if (check.rateSource !== 'calculadora') continue
      const c = courier(id)
      const optional = (c.extraFees ?? [])
        .filter(fee => fee.kind === 'optional')
        .reduce((total, fee) => total + fee.usd, 0)
      for (const reading of check.calculator!.readings) {
        const flat = c.perKgUsd! * reading.kg + (c.baseUsd ?? 0)
        const matches = [flat, flat + optional].some(
          candidate => Math.abs(candidate - reading.totalUsd) < 0.005
        )
        expect(matches, `${id} ${reading.kg} kg`).toBe(true)
      }
    }
  })

  // An office is where to pick up a parcel; a phone number or an inbox is a contact, and contacts
  // are not copied here.
  it('carries addresses but no phone number, e-mail or WhatsApp', () => {
    const text = JSON.stringify(COURIER_CHECKS)
    expect(text).not.toMatch(/@|whatsapp|\+598|\+1 ?\(/i)
    expect(text).not.toMatch(/\b\d{4} ?\d{4}\b/)
    expect(text).not.toMatch(/\b09\d ?\d{3} ?\d{3}\b/)
  })
})

describe('the calculator by weight', () => {
  it('offers whole kilos inside the tier, always including the reference parcel', () => {
    for (const page of pages) {
      if (!page.estimator) continue
      expect(page.estimator.options[0]).toBe(page.estimator.minKg)
      expect(page.estimator.options.at(-1)).toBe(page.estimator.maxKg)
      expect(page.estimator.options).toContain(COURIER_REFERENCE_KG)
    }
  })

  it('prices the reference weight exactly like the worked parcel', () => {
    for (const page of pages.filter(p => p.estimator)) {
      const estimate = courierEstimate(page.id, COURIER_REFERENCE_KG)!
      expect(estimate.totalUsd).toBeCloseTo(page.reference!.totalUsd, 9)
      expect(estimate.rows).toEqual(page.reference!.rows)
    }
  })

  it('refuses a weight outside the tier or between kilos', () => {
    for (const page of pages.filter(p => p.estimator)) {
      const { minKg, maxKg } = page.estimator!
      expect(courierEstimate(page.id, minKg - 1)).toBeNull()
      expect(courierEstimate(page.id, maxKg + 1)).toBeNull()
      expect(courierEstimate(page.id, minKg + 0.5)).toBeNull()
      const top = courierEstimate(page.id, maxKg)!
      expect(top.rows.find(row => row.kind === 'total')?.value).toBe(formatUsd(top.totalUsd))
    }
    expect(courierEstimate('no-existe', 2)).toBeNull()
  })

  it('has one for every courier that is flying with a per-kilo rate', () => {
    for (const page of pages) {
      expect(Boolean(page.estimator), page.id).toBe(page.operating && page.perKgUsd !== null)
    }
  })
})

describe('a courier that says it is not flying', () => {
  const grounded = pages.filter(page => !page.operating)

  it('exists in the readings, and is said first: title, heading, notice', () => {
    expect(grounded.map(page => page.id)).toEqual(['uruguaycargo'])
    for (const page of grounded) {
      expect(page.title).toContain('vuelos suspendidos')
      expect(page.heading).toContain('vuelos suspendidos')
      expect(page.notice).toBeTruthy()
      expect(page.facts[0]?.label).toBe('Aviso del courier')
    }
  })

  it('is never ranked on price', () => {
    for (const page of grounded) {
      expect(page.reference?.rank).toBeNull()
      expect(courierReferenceTable().some(row => row.courier.id === page.id)).toBe(false)
      expect(page.reference?.position).toContain('suspendió los vuelos')
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
