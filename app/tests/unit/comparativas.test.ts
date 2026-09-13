import { describe, expect, it } from 'vitest'
import {
  COMPARATIVA_FAMILIES,
  COMPARATIVA_FAMILY_META,
  COURIER_REFERENCE_KG,
  TIE_MARGIN,
  allComparativaPairs,
  comparativaDescription,
  comparativaFamilySlugs,
  comparativaHeading,
  comparativaPaths,
  comparativaSummary,
  comparativaTitle,
  compareEntities,
  courierReferenceCost,
  familyPairs,
  getComparativaFamily,
  getComparativaPair,
  pairSlug,
  relatedPairs,
  shortenEntityName,
  type ComparableEntity,
  type ComparativaPair,
} from '../../utils/comparativas'
import { allCourierPages } from '../../utils/courierPages'
import { COURIERS, courierParcelQuote } from '../../utils/courierShipping'

const allPairs = allComparativaPairs()

describe('families', () => {
  it('exposes one meta per declared family, in order', () => {
    expect(COMPARATIVA_FAMILY_META.map(family => family.slug)).toEqual([...COMPARATIVA_FAMILIES])
    expect(comparativaFamilySlugs()).toEqual([...COMPARATIVA_FAMILIES])
  })

  it('resolves a family by slug and rejects an unknown one', () => {
    expect(getComparativaFamily('bancos')?.label).toContain('bancos')
    expect(getComparativaFamily('zzz')).toBeUndefined()
  })

  it('gives every family entities, a hub and an intro', () => {
    for (const family of COMPARATIVA_FAMILY_META) {
      expect(family.entities.length).toBeGreaterThanOrEqual(2)
      expect(family.hub.startsWith('/')).toBe(true)
      expect(family.intro.length).toBeGreaterThan(80)
      expect(family.icon).toMatch(/^mdi-/)
    }
  })

  it('sorts scored families by overall, best first', () => {
    for (const family of COMPARATIVA_FAMILY_META) {
      if (!family.dimensions.length) continue
      const overalls = family.entities.map(entity => entity.overall ?? 0)
      expect([...overalls].sort((a, b) => b - a)).toEqual(overalls)
    }
  })

  it('gives every dimension a short label for running prose', () => {
    for (const family of COMPARATIVA_FAMILY_META) {
      for (const dimension of family.dimensions) {
        expect(dimension.short.trim()).not.toBe('')
        expect(dimension.short).toBe(dimension.short.toLowerCase())
      }
    }
  })

  it('keeps the credit-card family from swamping every other one', () => {
    const cards = getComparativaFamily('tarjetas-de-credito')
    expect(cards?.entities.length).toBeLessThanOrEqual(20)
  })
})

describe('entities', () => {
  const entities: ComparableEntity[] = COMPARATIVA_FAMILY_META.flatMap(family => family.entities)

  it('has slugs unique within each family', () => {
    for (const family of COMPARATIVA_FAMILY_META) {
      const slugs = family.entities.map(entity => entity.slug)
      expect(new Set(slugs).size).toBe(slugs.length)
    }
  })

  it('uses canonical slugs', () => {
    for (const entity of entities) {
      expect(entity.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    }
  })

  it('gives every entity a name, a short name and facts to compare', () => {
    for (const entity of entities) {
      expect(entity.name.trim()).not.toBe('')
      expect(entity.shortName.trim()).not.toBe('')
      expect(entity.shortName.length).toBeLessThanOrEqual(entity.name.length)
      expect(entity.facts.length).toBeGreaterThanOrEqual(3)
      for (const fact of entity.facts) {
        expect(fact.label.trim()).not.toBe('')
        expect(String(fact.value).trim()).not.toBe('')
      }
    }
  })

  it('scores every rubric dimension of its own family', () => {
    for (const family of COMPARATIVA_FAMILY_META) {
      for (const entity of family.entities) {
        for (const dimension of family.dimensions) {
          expect(typeof entity.scores[dimension.id]).toBe('number')
        }
      }
    }
  })
})

describe('shortenEntityName', () => {
  it('drops the em-dash tail and the trailing parenthetical', () => {
    expect(shortenEntityName('Pronto! — Tarjeta Visa Pronto+ (puntos + beneficios)')).toBe(
      'Pronto!'
    )
    expect(shortenEntityName('MiDinero (tarjeta prepaga Mastercard)')).toBe('MiDinero')
  })

  it('drops the card-type prefix every program repeats', () => {
    expect(shortenEntityName('Tarjeta de Crédito BBVA Comunidad Plus')).toBe('BBVA Comunidad Plus')
  })

  it('leaves a name that is already short alone', () => {
    expect(shortenEntityName('BROU')).toBe('BROU')
    expect(shortenEntityName('Mercado Pago')).toBe('Mercado Pago')
  })

  // Trimming must never leave a stub: "OCA - Visa" would become "OCA", but a
  // name that is ONLY a tail would become empty, and an empty heading is worse
  // than a long one.
  it('falls back to the full name when trimming leaves nothing usable', () => {
    expect(shortenEntityName('X — algo largo')).toBe('X — algo largo')
  })
})

describe('pairs', () => {
  it('orders a pair slug canonically, so a-vs-b and b-vs-a are one URL', () => {
    expect(pairSlug('itau', 'brou')).toBe('brou-vs-itau')
    expect(pairSlug('brou', 'itau')).toBe('brou-vs-itau')
  })

  it('builds every unordered pair of a family exactly once', () => {
    for (const family of COMPARATIVA_FAMILY_META) {
      const n = family.entities.length
      expect(familyPairs(family)).toHaveLength((n * (n - 1)) / 2)
    }
  })

  it('never pairs an entity with itself', () => {
    for (const pair of allPairs) expect(pair.a.slug).not.toBe(pair.b.slug)
  })

  it('never crosses families', () => {
    for (const pair of allPairs) {
      expect(pair.a.family).toBe(pair.family)
      expect(pair.b.family).toBe(pair.family)
    }
  })

  it('has globally unique paths', () => {
    const paths = comparativaPaths()
    expect(new Set(paths).size).toBe(paths.length)
    expect(paths.length).toBe(allPairs.length)
  })

  it('resolves a pair by its route params and rejects the reversed slug', () => {
    const sample = allPairs[0] as ComparativaPair
    expect(getComparativaPair(sample.family, sample.slug)?.slug).toBe(sample.slug)
    const reversed = `${sample.b.slug}-vs-${sample.a.slug}`
    if (reversed !== sample.slug) {
      expect(getComparativaPair(sample.family, reversed)).toBeUndefined()
    }
    expect(getComparativaPair('zzz', sample.slug)).toBeUndefined()
  })

  it('relates only pairs sharing a side, and never itself', () => {
    const sample = allPairs.find(pair => pair.family === 'bancos') as ComparativaPair
    const related = relatedPairs(sample)
    expect(related.length).toBeGreaterThan(0)
    for (const other of related) {
      expect(other.slug).not.toBe(sample.slug)
      const shares =
        other.a.slug === sample.a.slug ||
        other.b.slug === sample.a.slug ||
        other.a.slug === sample.b.slug ||
        other.b.slug === sample.b.slug
      expect(shares).toBe(true)
    }
  })
})

describe('the comparison', () => {
  it('scores every rubric dimension for both sides', () => {
    for (const family of COMPARATIVA_FAMILY_META) {
      const pair = familyPairs(family)[0]
      if (!pair) continue
      const comparison = compareEntities(pair)
      expect(comparison.rows).toHaveLength(family.dimensions.length)
    }
  })

  it('calls a gap under the tie margin a tie', () => {
    const pair = allPairs.find(candidate => candidate.family === 'bancos') as ComparativaPair
    const comparison = compareEntities(pair)
    for (const row of comparison.rows) {
      const gap = Math.abs(row.a - row.b)
      if (gap < TIE_MARGIN) expect(row.winner).toBe('tie')
      else expect(row.winner).toBe(row.a > row.b ? 'a' : 'b')
    }
  })

  it('splits strengths and ties without double counting', () => {
    for (const pair of allPairs.slice(0, 60)) {
      const comparison = compareEntities(pair)
      const total =
        comparison.aStrengths.length + comparison.bStrengths.length + comparison.ties.length
      expect(total).toBe(comparison.rows.length)
    }
  })

  it('leaves the overall verdict null for a family with no rubric', () => {
    const courierPair = allPairs.find(pair => pair.family === 'couriers') as ComparativaPair
    expect(compareEntities(courierPair).overallWinner).toBeNull()
  })
})

describe('courier arithmetic', () => {
  const courierPairs = allPairs.filter(pair => pair.family === 'couriers')

  // The flat `(base + perKg·kg) × 1,1` this replaced added the surcharge to SoyCourier's "todo
  // incluido" rate and left out Aerobox's "+IVA": the parcel is priced by the courier's own note.
  it('prices the reference parcel through courierParcelQuote', () => {
    const entities = COMPARATIVA_FAMILY_META.find(f => f.slug === 'couriers')?.entities ?? []
    expect(entities.length).toBeGreaterThan(0)
    for (const entity of entities) {
      const courier = COURIERS.find(candidate => candidate.id === entity.id)!
      expect(courierReferenceCost(entity), entity.id).toBe(
        courierParcelQuote(courier, COURIER_REFERENCE_KG)?.totalUsd ?? null
      )
    }
  })

  // A courier that only quotes through its own calculator has no published
  // tariff. Inventing one to keep the table full is exactly what this family
  // must not do.
  it('returns null rather than a guess when there is no published rate', () => {
    const quoteOnly = COMPARATIVA_FAMILY_META.find(f => f.slug === 'couriers')?.entities.find(
      entity => entity.metrics?.perKgUsd === null
    )
    if (!quoteOnly) return
    expect(courierReferenceCost(quoteOnly)).toBeNull()
  })

  it('never prints NaN or undefined in a courier verdict', () => {
    for (const pair of courierPairs) {
      const summary = comparativaSummary(pair)
      expect(summary.length).toBeGreaterThan(120)
      expect(summary).not.toContain('NaN')
      expect(summary).not.toContain('undefined')
    }
  })

  it('says plainly when a side does not publish a tariff', () => {
    const mixed = courierPairs.find(pair => {
      const a = courierReferenceCost(pair.a)
      const b = courierReferenceCost(pair.b)
      return (a === null) !== (b === null)
    })
    if (!mixed) return
    expect(comparativaSummary(mixed)).toContain('calculadora')
  })
})

// A pair page and a courier page must never show two totals for the same parcel. Both price it
// through courierParcelQuote; this pins that, pair by pair, against what each page actually prints.
describe('courier pairs show the parcel exactly like the courier pages', () => {
  const courierFamily = getComparativaFamily('couriers')!
  const courierPairs = familyPairs(courierFamily)
  const detailPages = allCourierPages()
  const usd = (value: number) =>
    `USD ${value.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const courierOf = (entity: ComparableEntity) =>
    COURIERS.find(courier => courier.id === entity.id)!
  const entityOf = (id: string) => courierFamily.entities.find(entity => entity.id === id)!
  const parcelFact = (entity: ComparableEntity) =>
    entity.facts.find(fact => fact.label === `Paquete de ${COURIER_REFERENCE_KG} kg`)?.value ?? ''
  const pairsWith = (id: string) =>
    courierPairs.filter(pair => pair.a.id === id || pair.b.id === id)

  it('gives every pair, on both sides, the total the courier’s own page shows', () => {
    expect(courierPairs.length).toBeGreaterThan(0)
    for (const pair of courierPairs) {
      const summary = comparativaSummary(pair)
      for (const side of [pair.a, pair.b]) {
        const detail = detailPages.find(page => page.id === side.id)!
        const total = courierReferenceCost(side)
        expect(total, `${pair.slug}: ${side.id}`).toBe(detail.reference?.totalUsd ?? null)
        if (total === null) continue
        // …and the pair page prints that same total, in its facts and in its verdict.
        expect(parcelFact(side), `${pair.slug}: ${side.id}`).toContain(usd(total))
        expect(summary, `${pair.slug}: ${side.id}`).toContain(usd(total))
      }
    }
  })

  it('adds nothing on top of SoyCourier’s all-inclusive rate, and says so', () => {
    expect(parcelFact(entityOf('soycourier'))).toContain('todo incluido')
    for (const pair of pairsWith('soycourier')) {
      const summary = comparativaSummary(pair)
      expect(summary, pair.slug).not.toContain('Los dos suman el mismo recargo')
      expect(summary, pair.slug).toContain('todo incluido')
    }
  })

  it('says "los dos suman el mismo recargo" only when it is true of both couriers', () => {
    for (const pair of courierPairs) {
      const both = [pair.a, pair.b].every(
        side => courierReferenceCost(side) !== null && !courierOf(side).rateIncludesSurcharge
      )
      expect(
        comparativaSummary(pair).includes('Los dos suman el mismo recargo de ley'),
        pair.slug
      ).toBe(both)
    }
  })

  it.each(['aerobox', 'starbox'])('shows the IVA of a handling fee published "+IVA" (%s)', id => {
    const entity = entityOf(id)
    expect(entity.facts.find(fact => fact.label === 'Cargo fijo por envío')?.value).toBe(
      'USD 5,00 + IVA'
    )
    expect(parcelFact(entity)).toContain('IVA del cargo fijo')
  })

  it('never crowns a total that leaves out a fee the courier publishes (Casilla Mía)', () => {
    expect(parcelFact(entityOf('casillamia'))).toContain('sin despacho de aduana')
    const pairs = pairsWith('casillamia')
    expect(pairs.length).toBeGreaterThan(0)
    for (const pair of pairs) {
      const summary = comparativaSummary(pair)
      expect(summary, pair.slug).not.toContain('sale más barato')
      expect(summary, pair.slug).not.toContain('prácticamente lo mismo')
      expect(summary, pair.slug).toContain('despacho de aduana')
      expect(summary, pair.slug).toContain(usd(75))
      expect(summary, pair.slug).toContain(usd(135))
    }
  })

  it('says a missing handling fee is unpublished (Grinbox, Glic), never "caso a caso"', () => {
    for (const id of ['grinbox', 'glic']) {
      expect(entityOf(id).facts.find(fact => fact.label === 'Cargo fijo por envío')?.value).toBe(
        'No publica cargo fijo'
      )
    }
    for (const pair of courierPairs) {
      const text = [
        comparativaSummary(pair),
        ...pair.a.facts.map(fact => fact.value),
        ...pair.b.facts.map(fact => fact.value),
      ].join(' ')
      expect(text, pair.slug).not.toContain('caso a caso')
    }
  })
})

describe('generated copy', () => {
  it('gives every pair a distinct heading, title and description', () => {
    const headings = allPairs.map(comparativaHeading)
    const titles = allPairs.map(comparativaTitle)
    const descriptions = allPairs.map(comparativaDescription)
    expect(new Set(headings).size).toBe(allPairs.length)
    expect(new Set(titles).size).toBe(allPairs.length)
    expect(new Set(descriptions).size).toBe(allPairs.length)
  })

  it('never emits a placeholder artefact', () => {
    for (const pair of allPairs) {
      const text = `${comparativaTitle(pair)} ${comparativaDescription(pair)} ${comparativaSummary(pair)}`
      expect(text).not.toContain('NaN')
      expect(text).not.toContain('undefined')
      expect(text).not.toContain('null')
      expect(text).not.toMatch(/\s{2,}/)
    }
  })

  it('keeps descriptions inside what a SERP will show', () => {
    for (const pair of allPairs) {
      const description = comparativaDescription(pair)
      expect(description.length).toBeGreaterThan(80)
      expect(description.length).toBeLessThanOrEqual(300)
    }
  })

  it('names both sides in every summary', () => {
    for (const pair of allPairs) {
      const summary = comparativaSummary(pair)
      expect(summary).toContain(pair.a.shortName)
      expect(summary).toContain(pair.b.shortName)
    }
  })

  it('writes a substantive verdict for every scored pair', () => {
    for (const pair of allPairs) {
      expect(comparativaSummary(pair).length).toBeGreaterThan(120)
    }
  })
})
