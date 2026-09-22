import { describe, expect, it } from 'vitest'
import {
  REWARD_RUBRIC,
  ISSUER_TYPE_LABELS,
  NETWORK_LABELS,
  CARD_PROGRAMS,
  CARD_REWARDS_FAQ,
  CARD_REWARDS_LAST_REVIEWED,
  CARD_REWARDS_REVIEW_CHANGES,
  CARD_REWARDS_SOURCES,
  PROGRAM_REDDIT_ENTITY,
  UI_VALUE_UYU,
  computeOverall,
  rankedPrograms,
  medalFor,
  getCardProgram,
  billPayWorthIt,
  type CardProgram,
  type RubricId,
} from '../../utils/cardRewards'

const ZERO: Record<RubricId, number> = {
  acumulacion: 0,
  canje: 0,
  descuentos: 0,
  costo: 0,
  flexibilidad: 0,
  cobertura: 0,
}
const full = (n: number): Record<RubricId, number> => ({
  acumulacion: n,
  canje: n,
  descuentos: n,
  costo: n,
  flexibilidad: n,
  cobertura: n,
})

const stub = (id: string, scores: Record<RubricId, number>): CardProgram => ({
  id,
  name: id,
  issuer: 'x',
  issuerType: 'banco',
  networks: ['visa'],
  pointsProgramName: 'p',
  earnRateNote: 'n',
  redemptionNote: 'n',
  discountNote: 'n',
  feeNote: 'n',
  pros: [],
  cons: [],
  bestFor: 'n',
  scores,
  verified: true,
})

describe('reward rubric', () => {
  it('has unique ids and weights that sum to 100', () => {
    const ids = REWARD_RUBRIC.map(d => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(REWARD_RUBRIC.reduce((s, d) => s + d.weight, 0)).toBe(100)
    for (const d of REWARD_RUBRIC) {
      expect(d.label.trim()).not.toBe('')
      expect(d.what.trim().length).toBeGreaterThan(10)
    }
  })
})

describe('overall score', () => {
  it('is 0 for all-zero and 100 for all-100', () => {
    expect(computeOverall(ZERO)).toBe(0)
    expect(computeOverall(full(100))).toBe(100)
    expect(computeOverall(full(50))).toBe(50)
  })

  it('weights the dimensions (acumulación pulls harder than cobertura)', () => {
    const a = computeOverall({ ...ZERO, acumulacion: 100 }) // weight 25
    const b = computeOverall({ ...ZERO, cobertura: 100 }) // weight 7
    expect(a).toBeGreaterThan(b)
    expect(a).toBe(25)
    expect(b).toBe(7)
  })
})

describe('ranking', () => {
  it('sorts by overall desc and assigns 1-indexed ranks', () => {
    const ranked = rankedPrograms([
      stub('low', full(30)),
      stub('high', full(90)),
      stub('mid', full(60)),
    ])
    expect(ranked.map(p => p.id)).toEqual(['high', 'mid', 'low'])
    expect(ranked.map(p => p.rank)).toEqual([1, 2, 3])
    expect(ranked[0].overall).toBe(90)
  })

  it('gives medals to the top three only', () => {
    expect(medalFor(1)).toBe('🥇')
    expect(medalFor(2)).toBe('🥈')
    expect(medalFor(3)).toBe('🥉')
    expect(medalFor(4)).toBeNull()
  })
})

describe('bill-pay worth-it calculator', () => {
  it('nets positive when reward beats surcharge', () => {
    const r = billPayWorthIt({ monthlyBills: 10000, rewardRatePct: 1, surchargePct: 0 })
    expect(r.yearlyReward).toBe(1200) // 120000 * 1%
    expect(r.yearlySurcharge).toBe(0)
    expect(r.net).toBe(1200)
    expect(r.worthIt).toBe(true)
  })

  it('nets negative when surcharge beats reward', () => {
    const r = billPayWorthIt({ monthlyBills: 10000, rewardRatePct: 0.5, surchargePct: 3 })
    expect(r.net).toBeLessThan(0)
    expect(r.worthIt).toBe(false)
  })

  it('clamps invalid/negative inputs to zero', () => {
    const r = billPayWorthIt({ monthlyBills: -5, rewardRatePct: -1, surchargePct: -2 })
    expect(r).toEqual({ yearlyReward: 0, yearlySurcharge: 0, net: 0, worthIt: false })
  })
})

describe('card programs catalogue invariants', () => {
  it('has unique ids and valid, in-range scores', () => {
    const ids = CARD_PROGRAMS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    const rubricIds = REWARD_RUBRIC.map(d => d.id)
    for (const p of CARD_PROGRAMS) {
      expect(p.name.trim()).not.toBe('')
      expect(p.issuer.trim()).not.toBe('')
      expect(Object.keys(ISSUER_TYPE_LABELS)).toContain(p.issuerType)
      expect(p.networks.length).toBeGreaterThan(0)
      for (const n of p.networks) expect(Object.keys(NETWORK_LABELS)).toContain(n)
      for (const dim of rubricIds) {
        expect(p.scores[dim]).toBeGreaterThanOrEqual(0)
        expect(p.scores[dim]).toBeLessThanOrEqual(100)
      }
      expect(p.pros.length + p.cons.length).toBeGreaterThan(0)
    }
  })

  it('resolves by id', () => {
    if (CARD_PROGRAMS.length) {
      expect(getCardProgram(CARD_PROGRAMS[0]!.id)).toBeDefined()
    }
    expect(getCardProgram('definitely-not-real')).toBeUndefined()
  })

  it('ranks no prepaid card: those belong to the debit ranking', () => {
    // This page is titled "Ranking de tarjetas de crédito". Prepaid cards are
    // ranked in utils/debitCards.ts. A card cannot sit in both, so a product
    // whose NAME is the prepaid card itself must not appear here. Mentioning a
    // prepaid sibling in the body is fine — BROU Recompensa, Puntos BBVA, OCA
    // Metraje and ANDA all do while ranking the credit card.
    for (const p of CARD_PROGRAMS) {
      const name = p.name.toLowerCase()
      // The rule is not "never say prepaid" — ANDA bundles its Prepaga DEANDA
      // into a name that leads with "Tarjeta de crédito ANDA". The rule is that
      // a name mentioning a prepaid product must ALSO name a credit card, which
      // is exactly what "Prex (tarjeta prepaga Mastercard)" failed to do.
      if (/prepag/.test(name)) expect(name).toMatch(/cr[ée]dito/)
    }
  })

  it('keeps out the three issuers removed on 2026-08-17 for having no credit card', () => {
    // Mercado Pago Uruguay issues no credit card at all (the credit card is
    // Argentine); Prex and MiDinero are prepaid by their own product name. A
    // research pass that re-adds any of them turns this red.
    const gone = ['mercado-pago-uruguay', 'prex-uruguay', 'midinero-uruguay']
    const ids = CARD_PROGRAMS.map(p => p.id)
    for (const id of gone) {
      expect(ids).not.toContain(id)
      expect(Object.keys(PROGRAM_REDDIT_ENTITY)).not.toContain(id)
    }
    for (const p of CARD_PROGRAMS) {
      expect(`${p.name} ${p.issuer}`.toLowerCase()).not.toContain('mercado pago')
    }
  })

  it('every Reddit entity mapping points at a programme that still exists', () => {
    const ids = new Set(CARD_PROGRAMS.map(p => p.id))
    for (const id of Object.keys(PROGRAM_REDDIT_ENTITY)) expect(ids).toContain(id)
  })
})

// Reverificación del 22/9/2026 contra los tarifarios, cartillas y bases de cada emisor. Los
// bloques de abajo fijan lo que esa ronda corrigió, para que una próxima "actualización" no
// vuelva a publicar la cifra vieja por copiar de la ficha anterior.
const programText = (p: CardProgram) =>
  [
    p.name,
    p.issuer,
    p.pointsProgramName,
    p.earnRateNote,
    p.pointValueNote ?? '',
    p.redemptionNote,
    p.discountNote,
    p.feeNote,
    p.note ?? '',
    p.rationale ?? '',
    p.verifiedNote ?? '',
    ...p.pros,
    ...p.cons,
    p.bestFor,
  ].join(' ')

const allText = () =>
  [
    ...CARD_PROGRAMS.map(programText),
    ...CARD_REWARDS_FAQ.map(f => `${f.question} ${f.answer}`),
    ...CARD_REWARDS_REVIEW_CHANGES.map(c => `${c.issuer} ${c.what} ${c.sourceLabel}`),
    ...CARD_REWARDS_SOURCES.map(s => s.label),
  ].join('\n')

describe('reverificación del 22/9/2026', () => {
  it('fija la fecha global y la UI del INE de ese día', () => {
    expect(CARD_REWARDS_LAST_REVIEWED).toBe('2026-09-22')
    // INE, "Unidad Indexada Setiembre 2026": 22/9/2026 = 6,6468.
    expect(UI_VALUE_UYU).toBe(6.6468)
  })

  it('cada ficha reverificada lleva fecha ISO no posterior a la ronda y dice qué se leyó', () => {
    const dated = CARD_PROGRAMS.filter(p => p.verifiedOn)
    expect(dated.length).toBeGreaterThanOrEqual(20)
    for (const p of dated) {
      expect(p.verifiedOn, p.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(p.verifiedOn! <= CARD_REWARDS_LAST_REVIEWED, p.id).toBe(true)
      expect((p.verifiedNote ?? '').trim().length, p.id).toBeGreaterThan(40)
    }
  })

  it('no vuelve a publicar las cifras que la ronda refutó', () => {
    const text = allText()
    // PassCard: $78,58 + IVA mensual, 113% TEA, 128% mora y 6 por mil eran la cartilla anterior.
    expect(text).not.toMatch(/78,58 \+ IVA (MENSUAL|mensual)/)
    expect(text).not.toMatch(/\b113% TEA\b(?! y|\))/)
    // ANDA financia al 27,30% + IVA, no 27,40%.
    expect(text).not.toMatch(/27,40% \+ IVA, la más baja/)
    // OCA Blue: 1 Metro cada $U 120 desde el 15/09/2026, y la cartilla de crédito es del 01/09/2026.
    expect(text).not.toMatch(/1 Metro cada \$U 104 de consumo/)
    expect(text).not.toMatch(/vigente desde el 04\/08\/2026/)
    // Itaú: el tarifario en línea es la versión setiembre 2026.
    expect(text).not.toMatch(/vigente desde el 1\/8\/2026/)
    // BBVA: última actualización 3/9/2026, no 20/7/2026.
    expect(text).not.toMatch(/actualizado el 20 de julio de 2026/)
    // BTG: la cartilla no tiene Excellence, Mastercard Internacional ni tarifa Visa no residente.
    expect(text).not.toMatch(/Mastercard Excellence \$U/)
    expect(text).not.toMatch(/\$U 4\.702|\$U 5\.676|US\$ 122/)
    // Santander: la anualidad SÍ está publicada; el segmento se llama Banca Privada en las bases.
    expect(text).not.toMatch(/no confirmado en fuente oficial \(varía por producto/)
    expect(text).not.toMatch(/Private Banking/)
    // Conversiones: la UI del 17/8/2026 ya no convierte nada.
    expect(text).not.toMatch(/con la UI del 17\/8\/2026/)
    // es-UY.
    expect(text).not.toMatch(/septiembre/i)
  })

  it('publica las cifras nuevas con su documento', () => {
    const santander = getCardProgram('santander-soy-santander-puntos')!
    expect(santander.feeNote).toMatch(/UI 895/)
    expect(santander.feeNote).toMatch(/UI 1\.085/)
    expect(santander.feeNote).toMatch(/UI 1\.560/)
    expect(santander.feeNote).toMatch(/22\/09\/2026/)
    expect(santander.earnRateNote).toMatch(/Select .*1 cada \$U 80/)
    expect(santander.earnRateNote).toMatch(/Banca Privada 1 cada \$U 70/)

    const passcard = getCardProgram('passcard-puntos-pass')!
    expect(passcard.feeNote).toMatch(/133,75 \+ IVA/)
    expect(passcard.feeNote).toMatch(/107% TEA/)
    expect(passcard.feeNote).toMatch(/2,5 por mil/)

    const oca = getCardProgram('oca-oca-blue')!
    expect(oca.earnRateNote).toMatch(/1 Metro cada \$U 120/)
    expect(oca.earnRateNote).toMatch(/15\/09\/2026/)
    expect(oca.feeNote).toMatch(/64% TEA/)
    expect(oca.feeNote).toMatch(/63%/)
    expect(oca.pointValueNote).toMatch(/2\.000 Metros/)

    const anda = getCardProgram('tarjeta-anda')!
    expect(anda.feeNote).toMatch(/27,30% \+ IVA/)
    expect(anda.earnRateNote).toMatch(/01\/01\/2026/)

    const itau = getCardProgram('itau-volar')!
    expect(itau.feeNote).toMatch(/versión setiembre 2026/)
    expect(itau.feeNote).toMatch(/Oro UI 961/)
    expect(itau.feeNote).toMatch(/Infinite UI 1\.454/)

    const btg = getCardProgram('btg-uruguay-tdc')!
    expect(btg.feeNote).toMatch(/Classic US\$ 85/)
    expect(btg.feeNote).toMatch(/\$U 7\.294/)
    expect(btg.name).not.toMatch(/Excellence/)

    const scotia = getCardProgram('scotia-puntos')!
    expect(scotia.earnRateNote).toMatch(/500 puntos/)
    expect(scotia.feeNote).toMatch(/adicional tipo de cambio/)
  })

  it('convierte cada UI con el valor del 22/9/2026 (redondeo a pesos)', () => {
    const pesos = (ui: number) => Math.round(ui * UI_VALUE_UYU).toLocaleString('es-UY')
    expect(pesos(895)).toBe('5.949')
    expect(pesos(864)).toBe('5.743')
    expect(pesos(1000)).toBe('6.647')
    expect(pesos(743)).toBe('4.939')
    expect(getCardProgram('itau-volar')!.feeNote).toContain(`$U ${pesos(864)}`)
    expect(getCardProgram('scotia-puntos')!.feeNote).toContain(`$U ${pesos(1000)}`)
    expect(getCardProgram('bbva-puntos-bbva')!.feeNote).toContain(`$U ${pesos(743)}`)
    expect(getCardProgram('santander-soy-santander-puntos')!.feeNote).toContain(`$U ${pesos(895)}`)
  })

  it('el registro de cambios y las FAQ están fechados y con fuente https', () => {
    expect(CARD_REWARDS_REVIEW_CHANGES.length).toBeGreaterThanOrEqual(6)
    for (const c of CARD_REWARDS_REVIEW_CHANGES) {
      expect(c.sourceUrl).toMatch(/^https:\/\//)
      expect(c.seenOn).toBe(CARD_REWARDS_LAST_REVIEWED)
      expect(c.what.trim().length).toBeGreaterThan(40)
    }
    const ids = CARD_REWARDS_FAQ.map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const f of CARD_REWARDS_FAQ) {
      expect(f.id).toMatch(/^[a-z0-9-]+$/)
      expect(f.question.endsWith('?')).toBe(true)
      // Cada respuesta nombra el documento o la fecha de la fuente: nada sin fecha.
      expect(f.answer).toMatch(/2026|Ley|guía DGI|cartilla|bases|tarifario|Manual/)
    }
    // Las preguntas reales de la gente (r/uruguay 2026): anualidad, IVA, financiar, sin costo.
    const qs = CARD_REWARDS_FAQ.map(f => f.question.toLowerCase()).join(' ')
    expect(qs).toMatch(/cuánto cuesta por año/)
    expect(qs).toMatch(/descuenta iva/)
    expect(qs).toMatch(/más barata para financiar/)
    expect(qs).toMatch(/no tiene costo anual/)
  })

  it('cada fuente apunta a un programa vigente y ninguna URL se repite', () => {
    const ids = new Set(CARD_PROGRAMS.map(p => p.id))
    const urls = CARD_REWARDS_SOURCES.map(s => s.url)
    expect(new Set(urls).size).toBe(urls.length)
    for (const s of CARD_REWARDS_SOURCES) {
      expect(s.url).toMatch(/^https:\/\//)
      for (const id of s.programs) expect(ids.has(id), `${s.label}: ${id}`).toBe(true)
    }
    // Las cifras del 22/9/2026 citan el documento exacto, no la home del banco.
    expect(urls).toContain(
      'https://www.santander.com.uy/sites/default/files/manual-de-tarifas/Manual_de_Tarifas_20260922.pdf'
    )
    expect(urls).toContain('https://www.passcard.com.uy/descargar/Cartilla%20Passcard')
    expect(urls).toContain('https://oca.uy/download/Cartilla_OCABlue.pdf')
    expect(urls).not.toContain('https://www.santander.com.uy/')
    expect(urls).not.toContain('https://www.brou.com.uy/')
  })
})
