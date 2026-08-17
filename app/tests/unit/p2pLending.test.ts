import { describe, expect, it } from 'vitest'

import {
  BORROWER_ALTERNATIVES,
  BORROWER_CHECKLIST,
  INFLATION_YOY_PCT,
  LENDER_ALTERNATIVES,
  LENDER_CHECKLIST,
  MINTOS_NET_RETURNS,
  P2P_CALC_DEFAULTS,
  P2P_FAQ,
  P2P_IRPF_PCT,
  P2P_LIMITS,
  P2P_RULES,
  P2P_SOURCES,
  P2P_TIMELINE,
  P2P_VERIFIED_AT,
  UI_VALUE,
  USURY_CAPS,
  UY_CASES,
  WORLD_CASES,
  computeP2PReturn,
  minBorrowersToUseCap,
  uiToPesos,
} from '../../utils/p2pLending'

describe('computeP2PReturn', () => {
  it('sin mora, sin comisión y sin impuesto devuelve exactamente la tasa pactada', () => {
    const r = computeP2PReturn({
      teaPct: 40,
      platformFeePct: 0,
      defaultPct: 0,
      recoveryPct: 0,
      taxPct: 0,
      inflationPct: 0,
    })
    expect(r.netNominalPct).toBeCloseTo(40, 10)
    expect(r.netRealPct).toBeCloseTo(40, 10)
    expect(r.gapVsHeadlinePct).toBeCloseTo(0, 10)
  })

  it('descuenta el interés que los créditos en default no pagan, no sólo el capital', () => {
    const r = computeP2PReturn({
      teaPct: 50,
      platformFeePct: 0,
      defaultPct: 20,
      recoveryPct: 0,
      taxPct: 0,
      inflationPct: 0,
    })
    // interés = 50 × 0,8 = 40; capital perdido = 20 → neto 20
    expect(r.interestCollected).toBeCloseTo(40, 10)
    expect(r.capitalLost).toBeCloseTo(20, 10)
    expect(r.netNominalPct).toBeCloseTo(20, 10)
  })

  it('el recupero reduce la pérdida de capital en la proporción declarada', () => {
    const r = computeP2PReturn({
      teaPct: 0,
      platformFeePct: 0,
      defaultPct: 10,
      recoveryPct: 40,
      taxPct: 0,
      inflationPct: 0,
    })
    expect(r.capitalLost).toBeCloseTo(6, 10)
    expect(r.netNominalPct).toBeCloseTo(-6, 10)
  })

  it('el impuesto grava el interés cobrado y no compensa la pérdida de capital', () => {
    const r = computeP2PReturn({
      teaPct: 30,
      platformFeePct: 0,
      defaultPct: 50,
      recoveryPct: 0,
      taxPct: 12,
      inflationPct: 0,
    })
    // interés = 30 × 0,5 = 15; impuesto = 1,8; capital perdido = 50 → neto −36,8
    expect(r.tax).toBeCloseTo(1.8, 10)
    expect(r.netNominalPct).toBeCloseTo(-36.8, 10)
  })

  it('pasa de nominal a real con la fórmula de Fisher, no restando', () => {
    const r = computeP2PReturn({
      teaPct: 10,
      platformFeePct: 0,
      defaultPct: 0,
      recoveryPct: 0,
      taxPct: 0,
      inflationPct: 5,
    })
    expect(r.netRealPct).toBeCloseTo((1.1 / 1.05 - 1) * 100, 10)
    expect(r.netRealPct).toBeLessThan(5)
  })

  it('la mora de equilibrio deja el resultado nominal en cero', () => {
    const input = {
      teaPct: 60,
      platformFeePct: 5,
      defaultPct: 0,
      recoveryPct: 20,
      taxPct: 12,
      inflationPct: 0,
    }
    const be = computeP2PReturn(input).breakEvenDefaultPct
    expect(be).not.toBeNull()
    const atBreakEven = computeP2PReturn({ ...input, defaultPct: be as number })
    expect(atBreakEven.netNominalPct).toBeCloseTo(0, 8)
  })

  it('si la comisión se come todo el interés, la mora de equilibrio es cero', () => {
    const r = computeP2PReturn({
      teaPct: 5,
      platformFeePct: 10,
      defaultPct: 0,
      recoveryPct: 0,
      taxPct: 12,
      inflationPct: 0,
    })
    expect(r.breakEvenDefaultPct).toBe(0)
    expect(r.netNominalPct).toBeLessThan(0)
  })

  it('con los valores por defecto el neto queda muy por debajo del titular', () => {
    const r = computeP2PReturn(P2P_CALC_DEFAULTS)
    expect(r.netNominalPct).toBeLessThan(P2P_CALC_DEFAULTS.teaPct)
    expect(r.gapVsHeadlinePct).toBeGreaterThan(20)
    // y sigue siendo un negocio si la mora es la supuesta
    expect(r.netNominalPct).toBeGreaterThan(0)
  })

  it('acota entradas fuera de rango en lugar de devolver disparates', () => {
    const r = computeP2PReturn({
      teaPct: Number.NaN,
      platformFeePct: -10,
      defaultPct: 500,
      recoveryPct: 200,
      taxPct: 12,
      inflationPct: 4,
    })
    expect(Number.isFinite(r.netNominalPct)).toBe(true)
    expect(r.capitalLost).toBe(0) // recupero acotado a 100%
    expect(r.fee).toBe(0) // comisión negativa acotada a 0
  })
})

describe('límites de la Circular 2.307', () => {
  it('obliga a repartir entre al menos cuatro deudores para agotar el tope', () => {
    expect(minBorrowersToUseCap()).toBe(4)
  })

  it('convierte UI a pesos con la UI declarada', () => {
    expect(uiToPesos(100000)).toBeCloseTo(100000 * UI_VALUE, 6)
    expect(uiToPesos(25000)).toBeCloseTo(165875, 0)
  })

  it('tiene topes para las dos puntas de la operación', () => {
    const sides = new Set(P2P_LIMITS.map(l => l.who))
    expect(sides.has('deudor')).toBe(true)
    expect(sides.has('prestamista')).toBe(true)
  })
})

describe('topes de usura', () => {
  it('el tope es la media más el margen legal que corresponde a cada régimen', () => {
    const libre = USURY_CAPS.filter(
      c => c.segment.includes('sin autorización de descuento') || c.segment.includes('dólares')
    )
    for (const row of libre) {
      expect(row.capPct).toBeCloseTo(row.meanPct * 1.55, 3)
    }
  })

  it('la banda declarada por la plataforma cae dentro de los topes vigentes', () => {
    const caps = USURY_CAPS.filter(c => c.currency === 'UYU').map(c => c.capPct)
    expect(Math.max(...caps)).toBeGreaterThanOrEqual(130)
    const consumoGrande = USURY_CAPS.find(c =>
      c.segment.startsWith('Consumo, UI 10.000 o más, hasta 366 días')
    )
    expect(consumoGrande?.capPct).toBeCloseTo(63.581, 3)
  })
})

describe('catálogos', () => {
  it('ningún caso de fracaso uruguayo se presenta como plataforma P2P inscripta', () => {
    for (const c of UY_CASES) expect(c.wasEappp).toBe(false)
  })

  it('cada caso, alternativa y fuente trae una URL', () => {
    const urls = [
      ...UY_CASES.map(c => c.source),
      ...WORLD_CASES.map(c => c.source),
      ...LENDER_ALTERNATIVES.map(a => a.source),
      ...BORROWER_ALTERNATIVES.map(a => a.source),
      ...P2P_SOURCES.map(s => s.url),
    ]
    for (const url of urls) expect(url).toMatch(/^https:\/\//)
  })

  it('las alternativas del prestamista declaran cobertura del seguro de depósitos', () => {
    for (const alt of LENDER_ALTERNATIVES) expect(['sí', 'no']).toContain(alt.copab)
    const p2p = LENDER_ALTERNATIVES.find(a => a.id === 'p2p')
    expect(p2p?.copab).toBe('no')
  })

  it('la línea de tiempo está ordenada y cubre el arco 2015–2026', () => {
    expect(P2P_TIMELINE[0].date).toContain('2015')
    expect(P2P_TIMELINE[P2P_TIMELINE.length - 1].date).toContain('2026')
    expect(P2P_TIMELINE.length).toBeGreaterThanOrEqual(10)
  })

  it('Mintos muestra al menos un año de rendimiento negativo', () => {
    expect(MINTOS_NET_RETURNS.some(r => r.pct < 0)).toBe(true)
    expect(MINTOS_NET_RETURNS.length).toBe(10)
  })

  it('las reglas citan artículo y consecuencia práctica', () => {
    expect(P2P_RULES.length).toBeGreaterThanOrEqual(12)
    for (const rule of P2P_RULES) {
      expect(rule.article).toMatch(/\d/)
      expect(rule.says.length).toBeGreaterThan(40)
      expect(rule.meaning.length).toBeGreaterThan(20)
    }
  })

  it('las FAQ y los checklists tienen contenido real', () => {
    expect(P2P_FAQ.length).toBeGreaterThanOrEqual(10)
    for (const f of P2P_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.answer.length).toBeGreaterThan(80)
    }
    expect(LENDER_CHECKLIST.length).toBeGreaterThanOrEqual(6)
    expect(BORROWER_CHECKLIST.length).toBeGreaterThanOrEqual(3)
  })

  it('las constantes fiscales y de contexto son las verificadas', () => {
    expect(P2P_IRPF_PCT).toBe(12)
    expect(INFLATION_YOY_PCT).toBeCloseTo(4.27, 5)
    expect(P2P_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
