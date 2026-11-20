// app/tests/unit/inversionesResumen.test.ts
// Ata lo que /inversiones-uruguay publica por monto y "cuánto paga hoy" a las constantes que el
// repo ya verifica: ninguna tasa se escribe a mano en la página ni en el módulo.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  BROU_USD_BOARD_PUBLISHED,
  COPAB_CAP_UI,
  COPAB_CAP_USD,
  COPAB_CAP_UYU,
  COPAB_UI_VALUE,
  COPAB_UI_VALUE_AT,
  CUENTA_REMUNERADA_PATH,
  GLETIR_US_MIN_USD,
  GLETIR_US_PCT,
  PREX_BUY_FIXED_USD,
  PREX_BUY_PCT,
  PREX_DAILY_CAP_USD,
  PREX_MONTHLY_CAP_USD,
  RESUMEN_AMOUNTS_USD,
  RESUMEN_AMOUNT_UYU,
  USD_MINIMUM_LABELS,
  amountCards,
  brouUsdBoardIsCurrent,
  buildInversionesFaq,
  gletirUsCommission,
  lowRiskCaption,
  lowRiskRows,
  prexBuyCost,
  usdDeposit,
} from '../../utils/inversionesResumen'
import {
  BROU_DEPOSIT_BOARD,
  CUSTODY_INSOLVENCY,
  GLETIR_SAFETY_ANALYSIS,
  INVESTMENTS,
  getInvestment,
  netOfIrpf,
} from '../../utils/investments'
import {
  LRM_BASELINE,
  LRM_PATH,
  depositOutcome,
  latestFor,
  lrmOutcome,
  usableSnapshot,
  type LrmSnapshotDoc,
} from '../../utils/lrm'
import { BROU_MINIMUMS, PLAZO_FIJO_BANCOS } from '../../utils/plazoFijoBancos'
import { TRADEMARK_UI_VALUE, TRADEMARK_UI_VALUE_AT } from '../../utils/trademarkRegistry'
import { getYieldProduct } from '../../utils/yieldAccounts'

const here = dirname(fileURLToPath(import.meta.url))
const pageSrc = readFileSync(resolve(here, '../../pages/inversiones-uruguay.vue'), 'utf8')
/** `formatUYU` separa el signo con un espacio duro. */
const norm = (s: string) => s.replace(/\xA0/g, ' ')

/** Todo el texto que la página imprime a partir del módulo. */
function allText(snapshot: LrmSnapshotDoc): string {
  const cards = amountCards(snapshot)
    .flatMap(c => [c.title, ...c.lines.map(l => `${l.label} ${l.text}`)])
    .join(' ')
  const rows = lowRiskRows(snapshot)
    .flatMap(r => [r.option, ...r.pays, r.irpf, r.minimum, r.exit])
    .join(' ')
  const faq = buildInversionesFaq(snapshot)
    .map(f => `${f.question} ${f.answer}`)
    .join(' ')
  return norm(`${cards} ${rows} ${faq}`)
}

/** Una pizarra igual a la compartida pero con la de dólares que el BROU publica desde el 01/11/2026. */
const freshBoard = {
  pdfUrl: BROU_DEPOSIT_BOARD.pdfUrl,
  series: {
    ...BROU_DEPOSIT_BOARD.series,
    USD: {
      ...BROU_DEPOSIT_BOARD.series.USD,
      vigenciaMoneda: '01/11/2026',
      tranches: BROU_DEPOSIT_BOARD.series.USD.tranches.map(t =>
        t.label === '181 – 366' ? { ...t, online: 2.8 } : t
      ),
    },
  },
}

describe('montos', () => {
  it('son los de las consultas', () => {
    expect([...RESUMEN_AMOUNTS_USD]).toEqual([1000, 5000, 10000])
    expect(RESUMEN_AMOUNT_UYU).toBe(2_000_000)
    const cards = amountCards(LRM_BASELINE)
    expect(cards.map(c => norm(c.title))).toEqual([
      'Con US$ 1.000',
      'Con US$ 5.000',
      'Con US$ 10.000',
      'Con $ 2.000.000',
    ])
  })
})

describe('Gletir', () => {
  it('reproduce los ejemplos de la sección de Gletir', () => {
    for (const ex of GLETIR_SAFETY_ANALYSIS.costExamples) {
      expect(gletirUsCommission(ex.orderAmount)).toBeCloseTo(ex.commission, 6)
    }
    expect(gletirUsCommission(5000)).toBeCloseTo(37.5, 6)
  })
  it('las constantes son las de la fila del catálogo', () => {
    const note = getInvestment('gletir-global')!.feesNote
    expect(note).toContain(`${String(GLETIR_US_PCT).replace('.', ',')}%`)
    expect(note).toContain(`USD ${GLETIR_US_MIN_USD}`)
  })
})

describe('Prex', () => {
  it('cuesta lo que dice su ayuda', () => {
    expect(prexBuyCost(1000)).toMatchObject({ orders: 1, months: 1 })
    expect(prexBuyCost(1000).fee).toBeCloseTo(20.99, 6)
    expect(prexBuyCost(5000)).toMatchObject({ orders: 5, months: 2 })
    expect(prexBuyCost(5000).fee).toBeCloseTo(104.95, 6)
    expect(prexBuyCost(10000)).toMatchObject({ orders: 10, months: 4 })
    expect(prexBuyCost(10000).fee).toBeCloseTo(209.9, 6)
  })
  it('las constantes son las de la fila del catálogo', () => {
    const note = getInvestment('prex-us-stocks-etfs')!.feesNote
    expect(PREX_BUY_FIXED_USD).toBe(0.99)
    expect(PREX_BUY_PCT).toBe(2)
    expect(note).toContain('USD 0,99 + 2%')
    expect(note).toContain(`tope diario USD ${PREX_DAILY_CAP_USD.toLocaleString('es-UY')}`)
    expect(note).toContain(`tope mensual USD ${PREX_MONTHLY_CAP_USD.toLocaleString('es-UY')}`)
  })
})

describe('seguro de depósitos', () => {
  it('los topes son los de la sección de custodia', () => {
    const text = JSON.stringify(CUSTODY_INSOLVENCY)
    expect(text).toContain(`USD ${COPAB_CAP_USD.toLocaleString('es-UY')}`)
    expect(text).toContain(`UI ${COPAB_CAP_UI.toLocaleString('es-UY')}`)
  })
})

describe('plazo fijo en dólares', () => {
  it('con la pizarra guardada vieja no publica una tasa; al día, la publica', () => {
    expect(BROU_USD_BOARD_PUBLISHED).toBe('2026-11-01')
    const d = usdDeposit(5000)
    const text = allText(LRM_BASELINE)
    // Quien actualice BROU_DEPOSIT_BOARD.series.USD pasa a la segunda rama sin tocar este test.
    if (!brouUsdBoardIsCurrent()) {
      expect(d.pending).toBe(true)
      if (d.pending) {
        expect(d.minimum).toBe(BROU_DEPOSIT_BOARD.series.USD.minimum)
        expect(d.pdfUrl).toBe(BROU_DEPOSIT_BOARD.pdfUrl)
        expect(d.irpfPct).toBe(netOfIrpf(1, 'USD', 12).taxPct)
      }
      // Ninguna tasa en dólares de la pizarra vieja llega al texto.
      const stale = BROU_DEPOSIT_BOARD.series.USD.tranches.map(t =>
        t.online.toLocaleString('es-UY', { minimumFractionDigits: 2 })
      )
      for (const rate of new Set(stale)) {
        if (['1,50', '2,00'].includes(rate)) continue // también son tasas en pesos o UI
        expect(text).not.toContain(`${rate} %`)
      }
      expect(text).toContain('rige desde el 01/11/2026')
    } else {
      expect(d.pending).toBe(false)
      const year = BROU_DEPOSIT_BOARD.series.USD.tranches.find(t => t.label === '181 – 366')!
      const rate = year.online.toLocaleString('es-UY', { minimumFractionDigits: 2 })
      const card = amountCards(LRM_BASELINE).find(c => c.id === 'usd-5000')!
      expect(norm(card.lines.find(l => l.id === 'plazo-fijo')!.text)).toContain(`${rate} %`)
    }
    // La pizarra escribe «U$S»; la página, «US$».
    expect(text).not.toContain('U$S')
  })
  it('con la pizarra al día, las cifras aparecen solas', () => {
    expect(brouUsdBoardIsCurrent(freshBoard)).toBe(true)
    const d = usdDeposit(5000, 365, freshBoard)
    expect(d.pending).toBe(false)
    if (!d.pending) {
      expect(d.ratePct).toBe(2.8)
      expect(d.gross).toBeCloseTo(140, 6)
      expect(d.irpfPct).toBe(netOfIrpf(2.8, 'USD', 12).taxPct)
      expect(d.net).toBeCloseTo(123.2, 6)
      expect(d.vigencia).toBe('01/11/2026')
    }
  })
})

describe('tarjeta de $ 2.000.000', () => {
  it('plazo fijo e-BROU a 365 y 367 días', () => {
    const d365 = depositOutcome(2_000_000, 365)!
    const d367 = depositOutcome(2_000_000, 367)!
    expect(d365.grossPct).toBe(5.6)
    expect(d365.grossGain).toBeCloseTo(112000, 2)
    expect(d365.netGain).toBeCloseTo(105840, 2)
    expect(d365.irpfPct).toBe(5.5)
    expect(d367.grossPct).toBe(5.7)
    expect(d367.irpfPct).toBe(2.5)
    expect(d367.netGain).toBeCloseTo(111776.17, 1)
    const card = amountCards(LRM_BASELINE).find(c => c.id === 'uyu-2000000')!
    const pf = norm(card.lines.find(l => l.id === 'plazo-fijo')!.text)
    expect(pf).toContain('$ 112.000')
    expect(pf).toContain('$ 105.840')
    expect(pf).toContain('$ 111.776')
  })
  it('LRM de un año contra el plazo fijo al mismo plazo, con los dos números', () => {
    const year = latestFor(LRM_BASELINE, 360)!
    const o = lrmOutcome(2_000_000, year, 'brou')
    const same = depositOutcome(2_000_000, year.days)!
    expect(o.commission).toBeCloseTo(21178.32, 1)
    expect(o.netGain).toBeCloseTo(102471.66, 1)
    expect(same.netGain).toBeCloseTo(105542.08, 1)
    const line = amountCards(LRM_BASELINE)
      .find(c => c.id === 'uyu-2000000')!
      .lines.find(l => l.id === 'lrm')!
    expect(norm(line.text)).toContain('$ 21.178')
    expect(norm(line.text)).toContain('$ 102.472')
    expect(norm(line.text)).toContain('$ 105.542')
    expect(line.text).not.toMatch(/conviene|gana/)
    expect(line.link?.to).toBe(LRM_PATH)
    expect(line.text).toContain('a través del BROU (en sucursal)')
  })
  it('dice que $ 2.000.000 en un banco superan el tope del seguro', () => {
    expect(COPAB_UI_VALUE).toBe(TRADEMARK_UI_VALUE)
    expect(COPAB_UI_VALUE_AT).toBe(TRADEMARK_UI_VALUE_AT)
    expect(COPAB_CAP_UYU).toBe(Math.round(250_000 * 6.685))
    expect(COPAB_CAP_UYU).toBeLessThan(RESUMEN_AMOUNT_UYU)
    const seguro = amountCards(LRM_BASELINE)
      .find(c => c.id === 'uyu-2000000')!
      .lines.find(l => l.id === 'seguro')!
    const text = norm(seguro.text)
    expect(text).toContain('unos $ 1.671.250 con la UI a $ 6,685 del 1/11/2026')
    expect(text).toContain('$ 2.000.000 en un solo banco superan ese tope')
  })
})

describe('qué mínimos alcanza', () => {
  it('sólo cuenta mínimos publicados en dólares', () => {
    const withUsdMin = INVESTMENTS.filter(i => i.minInvestment?.currency === 'USD')
    for (const i of withUsdMin) expect(USD_MINIMUM_LABELS[i.id]).toBeTruthy()
    const line = (amount: number) =>
      amountCards(LRM_BASELINE)
        .find(c => c.id === `usd-${amount}`)!
        .lines.find(l => l.id === 'minimos')!.text
    expect(line(1000)).toContain('Alcanza el mínimo de las acciones y ETF de Prex (US$ 10)')
    expect(line(1000)).toContain('los fondos de Itaú (US$ 1.000)')
    expect(line(1000)).toContain('No alcanza el de una compra de valores en Santander (US$ 10.000)')
    expect(line(5000)).toContain('No alcanza el de una compra de valores en Santander (US$ 10.000)')
  })
})

describe('cuánto paga hoy lo de bajo riesgo', () => {
  it('seis filas, cada una con fecha y fuente', () => {
    const rows = lowRiskRows(LRM_BASELINE)
    expect(rows).toHaveLength(6)
    for (const r of rows) {
      expect(r.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(r.sourceUrl).toMatch(/^https:\/\//)
      expect(r.pays.length).toBeGreaterThan(0)
      expect(r.minimum).toBeTruthy()
    }
  })
  it('las LRM son las de la foto', () => {
    const live = usableSnapshot({
      ...LRM_BASELINE,
      capturedAt: '2026-11-19T23:31:04.470Z',
    })!
    const lrm = lowRiskRows(live).find(r => r.id === 'lrm')!
    expect(lrm.pays).toHaveLength(live.latest.length)
    expect(lowRiskCaption(live)).toContain('leída el 19/11/2026')
    expect(lowRiskCaption(LRM_BASELINE)).toContain('leída a mano el 19/10/2026')
  })
  it('sin API usa la planilla de respaldo', () => {
    const snap = usableSnapshot(null) ?? LRM_BASELINE
    expect(lowRiskRows(snap)).toHaveLength(6)
  })
  it('una moneda de Notas que no está se omite', () => {
    const onlyUi = {
      ...LRM_BASELINE,
      treasury: LRM_BASELINE.treasury.filter(t => t.currency === 'UI'),
    }
    const notes = lowRiskRows(onlyUi).find(r => r.id === 'notas-tesoro')!
    expect(notes.pays).toHaveLength(1)
    expect(notes.pays[0]).toMatch(/^en UI:/)
  })
  it('mínimos y alícuotas salen de sus módulos', () => {
    const rows = lowRiskRows(LRM_BASELINE)
    const prex = getYieldProduct('prex-inversion-violeta')!
    expect(norm(rows[0]!.minimum)).toContain(`$ ${prex.minFirstUyu!.toLocaleString('es-UY')}`)
    expect(getYieldProduct('mercadopago-rendimientos')!.userFees).toMatch(/Sin monto mínimo/)
    expect(rows.find(r => r.id === 'plazo-fijo-pesos')!.irpf).toBe(
      '5,5 % hasta un año; 2,5 % de uno a tres años'
    )
    expect(rows.find(r => r.id === 'plazo-fijo-ui')!.irpf).toBe(
      '10 % hasta un año; 7 % de uno a tres años'
    )
    expect(rows.find(r => r.id === 'plazo-fijo-pesos')!.minimum).toBe(
      BROU_DEPOSIT_BOARD.series.UYU.minimum
    )
  })
})

describe('preguntas frecuentes', () => {
  const faq = buildInversionesFaq(LRM_BASELINE)
  it('ids únicos y preguntas fijas', () => {
    expect(new Set(faq.map(f => f.id)).size).toBe(faq.length)
    expect(faq.map(f => f.question)).toEqual([
      '¿En qué invertir 5.000 dólares en Uruguay?',
      '¿En qué invertir 1.000 dólares en Uruguay?',
      'Tengo 2 millones de pesos: ¿en qué puedo invertir?',
      '¿Cuánto paga hoy una inversión de bajo riesgo en Uruguay?',
      '¿Dónde puedo invertir mi dinero en Uruguay?',
      '¿Cuál es la opción de menor riesgo para invertir en Uruguay?',
      '¿Es seguro invertir mediante Gletir en Uruguay?',
      'Si el corredor de bolsa quiebra, ¿qué pasa con mis títulos? ¿Hay algo tipo COPAB para inversiones?',
      '¿Cómo se pagan impuestos por invertir en Uruguay?',
    ])
    // Las preguntas no dependen de la foto: la clave del JSON-LD sale de ellas.
    const other = buildInversionesFaq({ ...LRM_BASELINE, latest: LRM_BASELINE.latest.slice(0, 1) })
    expect(other.map(f => f.question)).toEqual(faq.map(f => f.question))
  })
  it('texto plano y respuestas recortadas', () => {
    for (const f of faq) {
      expect(f.answer).not.toContain('<')
      expect(f.answer.length).toBeLessThanOrEqual(1100)
    }
    for (const id of ['inversiones-gletir', 'inversiones-custodia', 'inversiones-impuestos']) {
      expect(faq.find(f => f.id === id)!.answer.length).toBeLessThanOrEqual(900)
    }
  })
  it('la de US$ 5.000 dice lo mismo que su tarjeta', () => {
    const card = amountCards(LRM_BASELINE).find(c => c.id === 'usd-5000')!
    const answer = faq.find(f => f.id === 'inversiones-5000-dolares')!.answer
    for (const line of card.lines) expect(answer).toContain(line.text.slice(1))
    expect(answer).toContain('US$ 37,50')
    expect(answer).toMatch(/Es información, no una recomendación\.$/)
    // La etiqueta no se repite en el texto que sigue.
    expect(answer).not.toMatch(/Seguro de depósitos: [^.]*seguro de depósitos/)
  })
  it('la de cuánto paga hoy abre con una tasa y no le pone IRPF a las letras', () => {
    const answer = faq.find(f => f.id === 'inversiones-bajo-riesgo-hoy')!.answer
    expect(answer).toMatch(/^Letras de Regulación Monetaria/)
    expect(answer.indexOf('Letras')).toBeLessThan(answer.indexOf('Cuenta que rinde'))
    expect(answer).not.toContain('antes de IRPF')
    expect(answer).toContain('que no pagan IRPF, es antes de la comisión')
    expect(answer).toContain('Mercado Pago): no publican tasa')
  })
  it('Gletir conserva las medidas correctivas junto a la multa', () => {
    const answer = faq.find(f => f.id === 'inversiones-gletir')!.answer
    expect(answer).toContain('La resolución también recoge medidas correctivas de Gletir.')
  })
})

describe('catálogo', () => {
  const pf = getInvestment('plazo-fijo-bancario')!
  it('el mínimo del plazo fijo es el del BROU', () => {
    expect(pf.minInvestment).toEqual({ amount: BROU_MINIMUMS.UYU, currency: 'UYU' })
  })
  it('la nota de mínimos coincide con las pizarras de cada banco', () => {
    const n = (v: number) => v.toLocaleString('es-UY')
    expect(pf.feesNote).toContain(
      `BROU $ ${n(BROU_MINIMUMS.UYU)}, US$ ${n(BROU_MINIMUMS.USD)} o UI ${n(BROU_MINIMUMS.UI)}`
    )
    const lowestOnline = (bankId: string, currency: 'UYU' | 'USD') =>
      Math.min(
        ...PLAZO_FIJO_BANCOS.find(b => b.id === bankId)!
          .boards.filter(b => b.channel === 'online' && b.currency === currency)
          .flatMap(b => b.bands.map(band => band.min))
      )
    for (const bank of ['itau', 'bbva']) {
      expect(lowestOnline(bank, 'UYU')).toBe(10_000)
      expect(lowestOnline(bank, 'USD')).toBe(1_000)
    }
    expect(pf.feesNote).toContain('$ 10.000 o US$ 1.000')
    expect(pf.feesNote).not.toContain('Itaú sugiere')
  })
  it('"Sin mínimo" sólo donde la fila lo afirma', () => {
    const flagged = INVESTMENTS.filter(i => i.noMinimum).map(i => i.id)
    expect(flagged.sort()).toEqual(['balanz', 'xtb'])
    for (const i of INVESTMENTS.filter(i => i.noMinimum)) expect(i.minInvestment).toBeNull()
  })
})

describe('página', () => {
  it('muestra las preguntas con FaqSection, sin su propia unidad ni un FAQPage a mano', () => {
    expect(pageSrc).toMatch(/<FaqSection[^>]*:ad="false"/)
    expect(pageSrc).not.toMatch(/['"]@type['"]:\s*['"]FAQPage['"]/)
  })
  it('enlaza las letras y las cuentas que rinden', () => {
    const links = [
      ...amountCards(LRM_BASELINE).flatMap(c => c.lines.map(l => l.link?.to)),
      ...lowRiskRows(LRM_BASELINE).map(r => r.link.to),
    ]
    expect(links).toContain(LRM_PATH)
    expect(links).toContain(CUENTA_REMUNERADA_PATH)
    // Y la página dibuja esos enlaces.
    expect(pageSrc).toContain('line.link.label')
    expect(pageSrc).toContain('row.link.label')
  })
  it('lee las licitaciones con una clave propia, no la de la página de LRM', () => {
    expect(pageSrc).toContain("key: 'lrm-resumen'")
    expect(pageSrc).not.toMatch(/key: 'lrm'[,\s]/)
  })
  it('no escribe tasas a mano', () => {
    for (const literal of ['5,60', '5,70', '2,80', '6,49']) {
      expect(pageSrc).not.toContain(literal)
    }
  })
})
