import { describe, expect, it } from 'vitest'
import {
  DEBIT_CARDS,
  DEBIT_RUBRIC,
  DEBIT_SOURCES,
  KIND_LABELS,
  NETWORK_LABELS,
  PREX_CASE,
  computeOverall,
  estimateIntlCost,
  getDebitCard,
  medalFor,
  rankedCards,
  type CardKind,
  type CardNetwork,
  type DimId,
} from '../../utils/debitCards'

const DIM_IDS = new Set<DimId>([
  'comisionExterior',
  'spreadCambio',
  'saldoUSD',
  'costo',
  'aceptacion',
  'recarga',
])
const KINDS = new Set<CardKind>(['banco', 'prepaga', 'fintech'])
const NETWORKS = new Set<CardNetwork>(['visa', 'mastercard', 'otro'])

describe('debitCards - rubric', () => {
  it('weights sum to 100', () => {
    expect(DEBIT_RUBRIC.reduce((s, d) => s + d.weight, 0)).toBe(100)
  })

  it('has unique dimension ids, all in DimId', () => {
    const ids = DEBIT_RUBRIC.map(d => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(DIM_IDS.has(id)).toBe(true)
  })

  it('every dimension has label, short, icon and description', () => {
    for (const d of DEBIT_RUBRIC) {
      expect(d.label.trim().length).toBeGreaterThan(2)
      expect(d.short.trim().length).toBeGreaterThan(2)
      expect(d.icon).toMatch(/^mdi-/)
      expect(d.what.trim().length).toBeGreaterThan(20)
    }
  })
})

describe('debitCards - catalogue integrity', () => {
  it('has a solid, comprehensive set of cards', () => {
    expect(DEBIT_CARDS.length).toBeGreaterThanOrEqual(10)
  })

  it('every card has unique id, non-empty prose and valid enums', () => {
    const ids = DEBIT_CARDS.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const c of DEBIT_CARDS) {
      expect(c.name.trim().length).toBeGreaterThan(1)
      expect(c.issuer.trim().length).toBeGreaterThan(1)
      expect(c.bestFor.trim().length).toBeGreaterThan(10)
      expect(c.verdict.trim().length).toBeGreaterThan(20)
      expect(c.fxSpreadNote.trim().length).toBeGreaterThan(10)
      expect(c.feeNote.trim().length).toBeGreaterThan(10)
      expect(KINDS.has(c.kind)).toBe(true)
      expect(c.networks.length).toBeGreaterThan(0)
      for (const n of c.networks) expect(NETWORKS.has(n)).toBe(true)
    }
  })

  it('every card scores all six dimensions in 0–100', () => {
    for (const c of DEBIT_CARDS) {
      for (const d of DEBIT_RUBRIC) {
        const v = c.scores[d.id]
        expect(typeof v).toBe('number')
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(100)
      }
    }
  })

  it('flags booleans exist and estimate/unknown figures are marked, not asserted', () => {
    for (const c of DEBIT_CARDS) {
      expect(typeof c.verified).toBe('boolean')
      expect(typeof c.estimate).toBe('boolean')
      expect(typeof c.ivaSobreComision).toBe('boolean')
      expect(typeof c.fundeaEnUsd).toBe('boolean')
      // a card without an official commission figure must not read as verified fact
      if (c.comisionExteriorPct === null) {
        expect(c.estimate || !c.verified).toBe(true)
      }
    }
  })

  it('every card cites at least one https source', () => {
    for (const c of DEBIT_CARDS) {
      expect(c.sources.length).toBeGreaterThan(0)
      for (const s of c.sources) {
        expect(s.url).toMatch(/^https:\/\/\S+$/)
        expect(s.label.trim().length).toBeGreaterThan(3)
        expect(s.publisher.trim().length).toBeGreaterThan(1)
      }
    }
  })

  it('has no duplicate source urls within a card', () => {
    for (const c of DEBIT_CARDS) {
      const urls = c.sources.map(s => s.url)
      expect(new Set(urls).size).toBe(urls.length)
    }
  })

  it('covers both bank debit and prepaid/fintech', () => {
    const kinds = new Set(DEBIT_CARDS.map(c => c.kind))
    expect(kinds.has('banco')).toBe(true)
    expect(kinds.has('prepaga') || kinds.has('fintech')).toBe(true)
  })

  it('metadata maps cover every used enum value', () => {
    for (const c of DEBIT_CARDS) {
      expect(KIND_LABELS[c.kind]).toBeTruthy()
      for (const n of c.networks) expect(NETWORK_LABELS[n]).toBeTruthy()
    }
  })
})

describe('debitCards - general sources', () => {
  it('has general sources, all https', () => {
    expect(DEBIT_SOURCES.length).toBeGreaterThan(0)
    for (const s of DEBIT_SOURCES) {
      expect(s.url).toMatch(/^https:\/\/\S+$/)
      expect(s.label.trim().length).toBeGreaterThan(3)
    }
  })
})

describe('debitCards - scoring', () => {
  const zero: Record<DimId, number> = {
    comisionExterior: 0,
    spreadCambio: 0,
    saldoUSD: 0,
    costo: 0,
    aceptacion: 0,
    recarga: 0,
  }
  const full: Record<DimId, number> = {
    comisionExterior: 100,
    spreadCambio: 100,
    saldoUSD: 100,
    costo: 100,
    aceptacion: 100,
    recarga: 100,
  }

  it('computeOverall maps 0→0 and 100→100', () => {
    expect(computeOverall(zero)).toBe(0)
    expect(computeOverall(full)).toBe(100)
  })

  it('computeOverall is the weighted average', () => {
    // only the top-weighted dimension at 100, rest 0 → weight/100 * 100 = weight
    const onlyComision = { ...zero, comisionExterior: 100 }
    const w = DEBIT_RUBRIC.find(d => d.id === 'comisionExterior')!.weight
    expect(computeOverall(onlyComision)).toBe(w)
  })

  it('rankedCards sorts by overall desc with 1-indexed rank', () => {
    const ranked = rankedCards()
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1]!.overall).toBeGreaterThanOrEqual(ranked[i]!.overall)
    }
    expect(ranked[0]?.rank).toBe(1)
    if (ranked.length) expect(ranked[ranked.length - 1]!.rank).toBe(ranked.length)
  })

  it('medalFor gives medals only to the top three', () => {
    expect(medalFor(1)).toBe('🥇')
    expect(medalFor(2)).toBe('🥈')
    expect(medalFor(3)).toBe('🥉')
    expect(medalFor(4)).toBeNull()
  })

  it('getDebitCard round-trips a real id', () => {
    const first = DEBIT_CARDS[0]
    if (first) expect(getDebitCard(first.id)?.id).toBe(first.id)
    expect(getDebitCard('__nope__')).toBeUndefined()
  })
})

describe('debitCards - estimateIntlCost reproduces the Prex case', () => {
  const card = {
    comisionExteriorPct: PREX_CASE.comisionPct,
    cargoFijoUsd: PREX_CASE.cargoFijoUsd,
    ivaSobreComision: true,
  }

  it('total in pesos reconstructs the ~$2.168 the user was charged', () => {
    const r = estimateIntlCost({
      purchaseUsd: PREX_CASE.purchaseUsd,
      card,
      fxVenta: PREX_CASE.fxVenta,
    })
    // 2,5% + USD 0,50 + IVA on the commission → ~52,12 USD → × 41,6 ≈ 2.168
    expect(r.subtotalUsd).toBeCloseTo(52.12, 1)
    expect(Math.abs(r.totalPesos - PREX_CASE.observedPesos)).toBeLessThanOrEqual(2)
  })

  it('with the wholesale mid rate, effective cost captures commission + spread (~6–7%)', () => {
    const r = estimateIntlCost({
      purchaseUsd: PREX_CASE.purchaseUsd,
      card,
      fxVenta: PREX_CASE.fxVenta,
      fxMid: PREX_CASE.fxMid,
    })
    expect(r.costoEfectivoPct).toBeGreaterThan(6)
    expect(r.costoEfectivoPct).toBeLessThan(8)
    expect(r.spreadPesos).not.toBeNull()
    expect(r.spreadPesos!).toBeGreaterThan(40)
  })

  it('without a mid rate, effective cost reflects only the commission (~4%) and spread is null', () => {
    const r = estimateIntlCost({
      purchaseUsd: PREX_CASE.purchaseUsd,
      card,
      fxVenta: PREX_CASE.fxVenta,
    })
    expect(r.costoEfectivoPct).toBeGreaterThan(3.5)
    expect(r.costoEfectivoPct).toBeLessThan(5)
    expect(r.spreadPesos).toBeNull()
  })

  it('never invents a fee for a card without an official commission figure', () => {
    const r = estimateIntlCost({
      purchaseUsd: 50,
      card: { comisionExteriorPct: null, cargoFijoUsd: null, ivaSobreComision: false },
      fxVenta: 41,
    })
    expect(r.comisionUsd).toBe(0)
    expect(r.ivaUsd).toBe(0)
    expect(r.totalPesos).toBe(Math.round(50 * 41))
  })
})
