import { describe, expect, it } from 'vitest'

import {
  amountForeignCode,
  buildSearchIndex,
  parseAmountQuery,
  parseEsNumber,
} from '../../utils/searchIndex'
import { buildResultGroups, scoreDocs } from '../../utils/siteNav'

const ctx = { locale: 'es', t: (key: string) => key }

describe('buildSearchIndex', () => {
  const docs = buildSearchIndex(ctx)

  it('covers every catalogue', () => {
    const byId = new Map(docs.map(d => [d.id, d]))
    expect(byId.get('page:/historico')?.to).toBe('/historico')
    expect(byId.get('tool:conversor-de-monedas')?.to).toBe('/herramientas/conversor-de-monedas')
    expect(byId.get('currency:dolar')?.to).toBe('/cotizacion/dolar')
    expect(byId.get('convert:100-dolares-a-pesos-uruguayos')?.to).toBe(
      '/convertir/100-dolares-a-pesos-uruguayos'
    )
    expect(byId.get('casa:brou')?.to).toBe('/casa/brou')
    expect(docs.some(d => d.type === 'glossary')).toBe(true)
    expect(docs.some(d => d.type === 'guide')).toBe(true)
    expect(docs.some(d => d.type === 'indicator')).toBe(true)
    expect(docs.some(d => d.type === 'action')).toBe(true)
  })

  it('indexes more than 180 documents', () => {
    expect(docs.length).toBeGreaterThan(180)
  })

  it('assigns unique ids', () => {
    expect(new Set(docs.map(d => d.id)).size).toBe(docs.length)
  })

  it('precomputes folded haystacks', () => {
    for (const doc of docs) {
      expect(doc._title).toBe(doc._title.toLowerCase())
      expect(doc._hay).not.toMatch(/\p{Diacritic}/u)
      expect(doc.keywords.every(k => k === k.toLowerCase())).toBe(true)
    }
  })

  it('is deterministic, so the palette and /buscar score an identical corpus', () => {
    expect(buildSearchIndex(ctx)).toEqual(buildSearchIndex(ctx))
  })

  it('needs no live rate rows', () => {
    expect(() => buildSearchIndex({ locale: 'en', t: (k: string) => k })).not.toThrow()
  })
})

describe('searching the real index', () => {
  const docs = buildSearchIndex(ctx)

  it('finds the loans page by a Spanish synonym', () => {
    const [top] = scoreDocs('credito', docs)
    expect(top?.doc.to).toBe('/prestamos-uruguay')
  })

  it('finds the investments page', () => {
    const [top] = scoreDocs('invertir', docs)
    expect(top?.doc.to).toBe('/inversiones-uruguay')
  })

  // The pages the user called out as unreachable must be the FIRST hit for the
  // word a person would actually type, and must render first, not just score first.
  it.each([
    ['prestamo', '/prestamos-uruguay'],
    ['prestamos', '/prestamos-uruguay'],
    ['inversiones', '/inversiones-uruguay'],
    ['couriers', '/couriers-uruguay'],
    ['preguntas frecuentes', '/preguntas-frecuentes'],
  ])('ranks and renders %s first', (query, route) => {
    const [top] = scoreDocs(query, docs)
    expect(top?.doc.to).toBe(route)

    const { groups, docs: flat } = buildResultGroups(scoreDocs(query, docs), 8)
    expect(flat[0]?.to).toBe(route)
    expect(groups[0]?.items[0]?.doc.to).toBe(route)
  })

  it('finds a casa de cambio by name', () => {
    const hit = scoreDocs('brou', docs).find(r => r.doc.type === 'casa')
    expect(hit?.doc.to).toBe('/casa/brou')
  })

  it('ranks the dollar page above an incidental glossary mention', () => {
    const [top] = scoreDocs('dolar hoy', docs)
    expect(top?.doc.to).toBe('/dolar-hoy')
  })
})

describe('parseEsNumber', () => {
  it('reads es-UY thousands and decimal separators', () => {
    expect(parseEsNumber('1.000,50')).toBe(1000.5)
    expect(parseEsNumber('1000')).toBe(1000)
    expect(parseEsNumber('1,5')).toBe(1.5)
    expect(parseEsNumber('10.5')).toBe(10.5)
    expect(parseEsNumber('1 000')).toBe(1000)
  })

  it('rejects non-numeric and non-positive input', () => {
    expect(parseEsNumber('hola')).toBeNull()
    expect(parseEsNumber('')).toBeNull()
    expect(parseEsNumber('0')).toBeNull()
  })
})

describe('parseAmountQuery', () => {
  it('resolves a prebaked amount to its /convertir page', () => {
    expect(parseAmountQuery('100 usd')).toMatchObject({
      amount: 100,
      from: 'USD',
      to: 'UYU',
      slug: '100-dolares-a-pesos-uruguayos',
      navTo: '/convertir/100-dolares-a-pesos-uruguayos',
      prebaked: true,
    })
  })

  it('falls back to the currency page for a non-prebaked amount', () => {
    expect(parseAmountQuery('137 usd')).toMatchObject({
      amount: 137,
      prebaked: false,
      navTo: '/cotizacion/dolar',
    })
  })

  it('understands the other currencies', () => {
    expect(parseAmountQuery('50 euros')).toMatchObject({ from: 'EUR', to: 'UYU' })
    expect(parseAmountQuery('1000 pesos argentinos')).toMatchObject({ from: 'ARS', to: 'UYU' })
    expect(parseAmountQuery('200 reales')).toMatchObject({ from: 'BRL', to: 'UYU' })
    expect(parseAmountQuery('5000 uyu')).toMatchObject({ from: 'UYU', to: 'USD' })
    expect(parseAmountQuery('5000 pesos')).toMatchObject({ from: 'UYU', to: 'USD' })
  })

  it('is accent- and case-insensitive', () => {
    expect(parseAmountQuery('100 DÓLARES')).toMatchObject({ from: 'USD' })
    expect(parseAmountQuery('100 U$S')).toMatchObject({ from: 'USD' })
  })

  it('returns null for anything that is not an amount', () => {
    expect(parseAmountQuery('hola')).toBeNull()
    expect(parseAmountQuery('usd')).toBeNull()
    expect(parseAmountQuery('')).toBeNull()
    expect(parseAmountQuery('100 xyz')).toBeNull()
    expect(parseAmountQuery('prestamo 100')).toBeNull()
  })

  it('reports the foreign side of the pair', () => {
    expect(amountForeignCode(parseAmountQuery('100 usd')!)).toBe('USD')
    expect(amountForeignCode(parseAmountQuery('5000 uyu')!)).toBe('USD')
    expect(amountForeignCode(parseAmountQuery('50 euros')!)).toBe('EUR')
  })
})
