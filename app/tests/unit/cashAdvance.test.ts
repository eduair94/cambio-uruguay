// app/tests/unit/cashAdvance.test.ts
import { describe, expect, it } from 'vitest'

import {
  ALTERNATIVES,
  BBVA_TNA_ADELANTO_UYU,
  BCU_CAPS,
  BRACKET_PESOS,
  CONS,
  FAQS,
  GAPS,
  ISSUERS,
  ADVANCE_IVA_RATE,
  PROS,
  ADVANCE_SOURCES,
  ADVANCE_UI_VALUE,
  USURY_MARKUP,
  capFor,
  getIssuer,
  prorateTea,
  resolveTea,
  simulateAdvance,
  simulateCrypto,
  teaConIva,
  tnaToTea,
} from '../../utils/cashAdvance'

describe('BCU caps are arithmetically consistent with Ley 18.212', () => {
  // The law says the cap is the published average plus 55 % (capital under
  // 2.000.000 UI) and the default cap is the average plus 80 %. If our
  // transcription of the BCU table were wrong, this would not close.
  it('every ordinary cap is the average × 1,55', () => {
    for (const row of BCU_CAPS) {
      expect(row.tope, `${row.bracket}/${row.currency}/${row.cortoPlazo}`).toBeCloseTo(
        row.media * (1 + USURY_MARKUP.menor2M),
        6
      )
    }
  })

  it('every peso default cap is the average × 1,80', () => {
    for (const row of BCU_CAPS.filter(r => r.currency === 'UYU')) {
      expect(row.topeMora, row.bracket).toBeCloseTo(row.media * (1 + USURY_MARKUP.menor2MMora), 6)
    }
  })

  it('caps the small-ticket short-term peso advance at 130,9285 %', () => {
    const row = capFor(20_000)
    expect(row.bracket).toBe('menor10kUI')
    expect(row.tope).toBeCloseTo(1.309285, 6)
  })

  it('is much cheaper above the 10.000 UI line', () => {
    const chico = capFor(BRACKET_PESOS - 1)
    const grande = capFor(BRACKET_PESOS + 1)
    expect(chico.bracket).toBe('menor10kUI')
    expect(grande.bracket).toBe('mayor10kUI')
    expect(grande.tope).toBeLessThan(chico.tope)
    expect(grande.tope).toBeCloseTo(0.63581, 6)
  })

  it('places the bracket boundary at 10.000 UI', () => {
    expect(BRACKET_PESOS).toBe(Math.round(10_000 * ADVANCE_UI_VALUE))
  })

  it('always resolves a row, including in dollars', () => {
    expect(capFor(1_000_000, 'USD').currency).toBe('USD')
    expect(capFor(1_000_000, 'USD', false).tope).toBeCloseTo(0.19003, 6)
  })
})

describe('issuer data integrity', () => {
  it('has unique ids', () => {
    const ids = ISSUERS.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every issuer at least one source with a URL and a date', () => {
    for (const issuer of ISSUERS) {
      expect(issuer.sources.length, issuer.id).toBeGreaterThan(0)
      for (const s of issuer.sources) {
        expect(s.url, `${issuer.id} · ${s.label}`).toMatch(/^https:\/\//)
        expect(s.date.length, `${issuer.id} · ${s.label}`).toBeGreaterThan(0)
      }
    }
  })

  it('never leaves an issuer without an editorial reading', () => {
    for (const issuer of ISSUERS) {
      expect(issuer.lectura.length, issuer.id).toBeGreaterThan(40)
      expect(issuer.comisionUyuNota.length, issuer.id).toBeGreaterThan(10)
    }
  })

  it('agrees that no issuer grants an interest-free window on an advance', () => {
    expect(ISSUERS.every(i => i.graciaSinInteres === false)).toBe(true)
  })

  it('keeps OCA as the only issuer publishing a numeric advance TEA', () => {
    // The page's whole argument rests on this contrast being real.
    const oca = getIssuer('oca')
    expect(oca?.teaAdelanto).toBe(0.8)
    expect(oca?.teaSaldos).toBe(0.63)
    expect(oca!.teaAdelanto!).toBeGreaterThan(oca!.teaSaldos!)
  })

  it('declares how each issuer expresses its rate, consistently with the numbers', () => {
    // Guards a real bug this page shipped once: BBVA and BROU DO publish a rate,
    // so inferring "remite al tope legal" from a null `teaAdelanto` mislabelled
    // them — and attributed "tasa máxima permitida" to Santander, whose source
    // says no such thing.
    for (const i of ISSUERS) {
      expect(i.teaNota.length, i.id).toBeGreaterThan(40)
      if (i.teaKind === 'tea-adelanto') expect(i.teaAdelanto, i.id).not.toBeNull()
      if (i.teaKind === 'tea-tarjeta') {
        expect(i.teaAdelanto, i.id).toBeNull()
        expect(i.teaSaldos, i.id).not.toBeNull()
      }
      if (i.teaKind === 'tope-legal' || i.teaKind === 'no-publica') {
        expect(i.teaAdelanto, i.id).toBeNull()
        expect(i.teaSaldos, i.id).toBeNull()
      }
    }
    expect(ISSUERS.filter(i => i.teaKind === 'tope-legal').map(i => i.id)).toEqual([
      'itau',
      'scotiabank',
    ])
    expect(getIssuer('bbva')!.teaKind).toBe('tna-adelanto')
    expect(getIssuer('brou')!.teaKind).toBe('tea-tarjeta')
    expect(getIssuer('santander')!.teaKind).toBe('no-publica')
  })

  it('resolves "tasa máxima permitida" issuers to the BCU cap', () => {
    const itau = getIssuer('itau')!
    const r = resolveTea(itau, 20_000)
    expect(r.fuente).toBe('tope-bcu')
    expect(r.tea).toBeCloseTo(1.309285, 6)

    const oca = getIssuer('oca')!
    expect(resolveTea(oca, 20_000)).toEqual({ tea: 0.8, fuente: 'publicada' })
  })
})

describe('rate maths', () => {
  it('converts BBVA’s published TNA to a TEA with monthly capitalisation', () => {
    const tea = tnaToTea(BBVA_TNA_ADELANTO_UYU, 12)
    expect(tea).toBeGreaterThan(BBVA_TNA_ADELANTO_UYU)
    expect(tea).toBeCloseTo(0.7011, 3)
  })

  it('leaves a TNA alone when there is no capitalisation', () => {
    expect(tnaToTea(0.5, 0)).toBe(0.5)
  })

  it('prorates an annual effective rate compounding, not linearly', () => {
    const anual = prorateTea(0.8, 365)
    expect(anual).toBeCloseTo(0.8, 10)
    const mes = prorateTea(0.8, 30)
    expect(mes).toBeGreaterThan(0)
    // Compounding a month twelve times must land back on the annual rate.
    expect((1 + prorateTea(0.8, 365 / 12)) ** 12 - 1).toBeCloseTo(0.8, 10)
    // …and must be strictly below the naive 80/12 = 6,67 %.
    expect(mes).toBeLessThan(0.8 / 12)
  })

  it('returns zero interest for zero days', () => {
    expect(prorateTea(0.8, 0)).toBe(0)
    expect(prorateTea(0.8, -5)).toBe(0)
  })

  it('grosses a published TEA up by IVA', () => {
    expect(teaConIva(0.8)).toBeCloseTo(0.976, 10)
    expect(teaConIva(1.309285)).toBeCloseTo(1.5973277, 6)
  })
})

describe('simulateAdvance', () => {
  const base = { montoPesos: 20_000, dias: 30, comisionFija: 0, comisionPct: 0, tea: 0.8 }

  it('charges interest from day one even with a zero commission', () => {
    const r = simulateAdvance(base)
    expect(r.comisionSinIva).toBe(0)
    expect(r.interesSinIva).toBeGreaterThan(0)
    expect(r.costoTotal).toBeGreaterThan(0)
  })

  it('adds IVA on top of the interest', () => {
    const r = simulateAdvance(base)
    expect(r.ivaInteres).toBeCloseTo(r.interesSinIva * ADVANCE_IVA_RATE, 10)
    expect(r.costoTotal).toBeCloseTo(r.interesSinIva * (1 + ADVANCE_IVA_RATE), 10)
  })

  it('is worth roughly 6 % of the cash over one month at OCA’s 80 % TEA', () => {
    const r = simulateAdvance(base)
    expect(r.costoPct).toBeGreaterThan(0.055)
    expect(r.costoPct).toBeLessThan(0.065)
  })

  it('annualises the total cost above the published TEA, because of IVA', () => {
    const r = simulateAdvance(base)
    expect(r.costoAnualizado).toBeGreaterThan(0.8)
  })

  it('adds a fixed commission with its own IVA', () => {
    const r = simulateAdvance({ ...base, comisionFija: 55 })
    expect(r.comisionSinIva).toBe(55)
    expect(r.ivaComision).toBeCloseTo(55 * ADVANCE_IVA_RATE, 10)
  })

  it('scales the commission percentage with the amount', () => {
    const a = simulateAdvance({ ...base, comisionPct: 0.0033 })
    expect(a.comisionSinIva).toBeCloseTo(20_000 * 0.0033, 10)
  })

  it('charges the monthly balance insurance pro rata', () => {
    const con = simulateAdvance({ ...base, seguroMensualPct: 0.004 })
    const sin = simulateAdvance(base)
    expect(con.seguro).toBeCloseTo(20_000 * 0.004 * (30 / 30), 10)
    expect(con.costoTotal).toBeGreaterThan(sin.costoTotal)
  })

  it('costs more the longer you take to pay', () => {
    const corto = simulateAdvance({ ...base, dias: 15 })
    const largo = simulateAdvance({ ...base, dias: 60 })
    expect(largo.costoTotal).toBeGreaterThan(corto.costoTotal)
  })

  it('degrades safely on empty input', () => {
    const r = simulateAdvance({ montoPesos: 0, dias: 0, comisionFija: 0, comisionPct: 0, tea: 0.8 })
    expect(r.costoTotal).toBe(0)
    expect(r.costoPct).toBe(0)
    expect(r.costoAnualizado).toBe(0)
  })
})

describe('simulateCrypto', () => {
  const base = {
    montoPesos: 20_000,
    dias: 30,
    recargoExterior: 0.03,
    adicionalTipoCambio: 0,
    comisionCompraCripto: 0.02,
    comisionVentaP2p: 0.0025,
    spreadCompraVenta: 0.01,
    tratadoComoAdelanto: false,
    tea: 0.8,
    comisionFija: 0,
  }

  it('always leaves the target cash in hand and charges the card more', () => {
    const r = simulateCrypto(base)
    expect(r.pesosEnMano).toBe(20_000)
    expect(r.deudaTarjeta).toBeGreaterThan(20_000)
    expect(r.costoTotal).toBeCloseTo(r.deudaTarjeta - 20_000, 8)
  })

  it('breaks the cost into layers that add up to the total', () => {
    const r = simulateCrypto(base)
    const suma = r.capas.reduce((n, c) => n + c.pesos, 0)
    expect(suma).toBeCloseTo(r.costoTotal, 6)
  })

  it('is strictly worse when the issuer flags it quasi-cash', () => {
    const limpio = simulateCrypto(base)
    const marcado = simulateCrypto({ ...base, tratadoComoAdelanto: true })
    expect(marcado.costoTotal).toBeGreaterThan(limpio.costoTotal)
    expect(marcado.capas.some(c => c.id === 'interes')).toBe(true)
    expect(limpio.capas.some(c => c.id === 'interes')).toBe(false)
  })

  it('beats a quasi-cash-flagged detour with a plain cash advance', () => {
    // The headline verdict of the page: if it is flagged, walking to the ATM wins.
    const adelanto = simulateAdvance({
      montoPesos: 20_000,
      dias: 30,
      comisionFija: 0,
      comisionPct: 0,
      tea: 0.8,
    })
    const cripto = simulateCrypto({ ...base, tratadoComoAdelanto: true })
    expect(cripto.costoTotal).toBeGreaterThan(adelanto.costoTotal)
  })

  it('adds the non-dollar FX surcharge as its own layer', () => {
    const sin = simulateCrypto(base)
    const con = simulateCrypto({ ...base, adicionalTipoCambio: 0.06 })
    expect(con.costoTotal).toBeGreaterThan(sin.costoTotal)
    expect(con.capas.find(c => c.id === 'fx')?.pesos).toBeGreaterThan(0)
  })

  it('charges IVA on the foreign-purchase surcharge', () => {
    const r = simulateCrypto(base)
    const recargo = r.capas.find(c => c.id === 'recargo')!.pesos
    const iva = r.capas.find(c => c.id === 'ivaRecargo')!.pesos
    expect(iva).toBeCloseTo(recargo * ADVANCE_IVA_RATE, 8)
  })

  it('degrades safely on empty input', () => {
    const r = simulateCrypto({ ...base, montoPesos: 0, dias: 0 })
    expect(r.costoTotal).toBe(0)
    expect(r.costoPct).toBe(0)
  })
})

describe('editorial content', () => {
  it('lists pros and cons with detail', () => {
    for (const item of [...PROS, ...CONS]) {
      expect(item.text.length).toBeGreaterThan(5)
      expect(item.detail.length).toBeGreaterThan(40)
    }
    expect(CONS.length).toBeGreaterThanOrEqual(PROS.length)
  })

  it('answers the question that prompted the page', () => {
    expect(FAQS.some(f => /Ita.*tarifario/i.test(f.q))).toBe(true)
    expect(FAQS.some(f => /Binance/i.test(f.q))).toBe(true)
  })

  it('gives every FAQ a real answer', () => {
    for (const f of FAQS) {
      expect(f.a.length, f.q).toBeGreaterThan(80)
    }
  })

  it('publishes what it could not confirm', () => {
    expect(GAPS.length).toBeGreaterThanOrEqual(5)
    for (const g of GAPS) expect(g.length).toBeGreaterThan(40)
  })

  it('cites only https sources, with no duplicates', () => {
    for (const s of ADVANCE_SOURCES) expect(s.url, s.label).toMatch(/^https:\/\//)
    const urls = ADVANCE_SOURCES.map(s => s.url)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('links every issuer source from the global source list', () => {
    const known = new Set(ADVANCE_SOURCES.map(s => s.url))
    for (const issuer of ISSUERS) {
      for (const s of issuer.sources) {
        expect(known.has(s.url), `${issuer.id} → ${s.url}`).toBe(true)
      }
    }
  })

  it('ranks alternatives against the advance honestly', () => {
    expect(ALTERNATIVES.some(a => a.tono === 'mejor')).toBe(true)
    expect(ALTERNATIVES.some(a => a.tono === 'peor')).toBe(true)
    // Anything billed as cheaper than a cash advance must actually be cheaper
    // than OCA's published 80 % — the only numeric advance TEA we have.
    for (const alt of ALTERNATIVES.filter(a => a.tono === 'mejor' && a.tea !== null)) {
      expect(alt.tea!, alt.id).toBeLessThan(0.8)
    }
  })
})
