import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { BcuCapRow } from '../../utils/cashAdvance'
import {
  BCU_CAPS_IN_FORCE_SINCE,
  BCU_CAPS_PERIOD,
  NOPAYSLIP_CAPS,
  NOPAYSLIP_DOORS,
  SOLO_CEDULA_LABELS,
  SOLO_CEDULA_LENDERS,
  SOLO_CEDULA_REVIEWED,
  USURY_EXCLUDED_COSTS,
  buildNoPayslipFaq,
  mergeNoPayslipCaps,
  noPayslipLenders,
  pctEs,
  teaLabelOf,
  teaSpread,
} from '../../utils/loanNoPayslip'
import { LENDER_TIERLIST, type LenderEntity } from '../../utils/loanTierlist'

const byId = (id: string): LenderEntity => {
  const l = LENDER_TIERLIST.find(x => x.id === id)
  if (!l) throw new Error(`missing lender ${id}`)
  return l
}

describe('noPayslipLenders', () => {
  const rows = noPayslipLenders(LENDER_TIERLIST)

  it('keeps lenders that serve independents or take collateral, and nobody else', () => {
    for (const r of rows) {
      const l = byId(r.id)
      expect(l.audiences.includes('independiente') || l.segment === 'prendario', r.id).toBe(true)
    }
    const ids = rows.map(r => r.id)
    expect(ids).toContain('brou')
    expect(ids).toContain('oca')
    expect(ids).toContain('pronto')
    // Itaú only lends to employees: it must not appear on a page for people without a payslip.
    expect(ids).not.toContain('itau')
  })

  it('orders by representative TEA, lenders without a published rate last', () => {
    const rated = rows.filter(r => r.teaSort != null)
    for (let i = 1; i < rated.length; i++) {
      expect(rated[i]!.teaSort!).toBeGreaterThanOrEqual(rated[i - 1]!.teaSort!)
    }
    const firstUnrated = rows.findIndex(r => r.teaSort == null)
    if (firstUnrated !== -1) {
      expect(rows.slice(firstUnrated).every(r => r.teaSort == null)).toBe(true)
    }
  })

  it('treats a 0 % promotional rate as unrated', () => {
    const fake = { ...byId('brou'), id: 'promo', teaPct: 0, teaMaxPct: null } as LenderEntity
    expect(noPayslipLenders([fake])[0]!.teaSort).toBeNull()
  })
})

describe('teaLabelOf', () => {
  it('formats ranges, single rates, ceilings and gaps in Uruguayan notation', () => {
    expect(teaLabelOf(26, 31)).toBe('26–31 %')
    expect(teaLabelOf(49, 123.43)).toBe('49–123,43 %')
    expect(teaLabelOf(36.8, null)).toBe('36,8 %')
    expect(teaLabelOf(null, 129.92)).toBe('hasta 129,92 %')
    expect(teaLabelOf(null, null)).toBe('No la publica')
    expect(teaLabelOf(31, 31)).toBe('31 %')
  })

  it('pctEs uses a comma', () => {
    expect(pctEs(130.93)).toBe('130,93 %')
  })
})

describe('teaSpread', () => {
  it('spans the lowest "desde" to the highest ceiling of the listed lenders', () => {
    const rows = noPayslipLenders(LENDER_TIERLIST)
    const spread = teaSpread(LENDER_TIERLIST, rows)
    expect(spread.min).not.toBeNull()
    expect(spread.max!).toBeGreaterThan(spread.min!)
    expect(spread.min!).toBeLessThanOrEqual(byId('brou').teaPct!)
    expect(spread.withRate).toBeGreaterThan(0)
  })
})

describe('the doors quote what the catalogue says', () => {
  it('every quote names a real lender and an https source', () => {
    for (const door of NOPAYSLIP_DOORS) {
      for (const q of door.quotes) {
        expect(() => byId(q.lenderId)).not.toThrow()
        expect(q.sourceUrl).toMatch(/^https:\/\//)
      }
    }
    expect(new Set(NOPAYSLIP_DOORS.map(d => d.id)).size).toBe(NOPAYSLIP_DOORS.length)
  })

  it('a quote that says "clean Clearing" must match the lender stance in the ranking', () => {
    // If the weekly refresh flips OCA or BROU to lending with marks, these quotes are stale and
    // have to be re-read against the source, not edited.
    expect(byId('oca').clearing).toBe('no')
    expect(byId('brou').clearing).toBe('no')
  })

  it('the "sólo con la cédula" door now quotes Creditel with its three-bills alternative', () => {
    const door = NOPAYSLIP_DOORS.find(d => d.id === 'solo-cedula')!
    const creditel = door.quotes.find(q => q.lenderId === 'creditel')!
    expect(creditel.text).toMatch(/tres facturas/)
    expect(creditel.text).toMatch(/22 de setiembre de 2026/)
  })
})

describe('buildNoPayslipFaq', () => {
  const rows = noPayslipLenders(LENDER_TIERLIST)
  const spread = teaSpread(LENDER_TIERLIST, rows)
  const faq = buildNoPayslipFaq({
    rows,
    spread,
    capLabel: '99,99%',
    capSince: '1 de enero de 2030',
  })

  it('takes the usury cap by parameter and never hand-types one', () => {
    const text = faq.map(f => f.answer).join(' ')
    expect(text).toContain('99,99%')
    expect(text).toContain('1 de enero de 2030')
    expect(text).not.toMatch(/130,93|133,49|63,58|84,47/)
  })

  it('counts lenders from the data', () => {
    const clearing = faq.find(f => f.id === 'clearing')!
    const withClearing = rows.filter(r => r.clearing === 'si').length
    expect(clearing.answer).toContain(`${withClearing} de las ${rows.length}`)
  })

  it('has unique ids and non-empty answers', () => {
    expect(new Set(faq.map(f => f.id)).size).toBe(faq.length)
    for (const f of faq) expect(f.answer.length).toBeGreaterThan(60)
  })

  it('names the literal search phrase and separates "sin comprobante" from "sin clearing"', () => {
    const q = faq.find(f => f.id === 'solo-cedula')!
    expect(q.question.toLowerCase()).toContain('préstamos solo con cédula')
    expect(q.answer).toMatch(/OCA y Pronto!/)
    expect(q.answer).toMatch(/no sin mirar el clearing/)
    expect(q.answer).not.toMatch(/septiembre/)
  })
})

// ── "Sólo con cédula" + topes vigentes (leídos el 2026-09-22) ────────────────────────────────

describe('SOLO_CEDULA_LENDERS: sin comprobante no es sin clearing', () => {
  it('cada fila está fechada, con fuente https y un id del ranking cuando existe', () => {
    expect(SOLO_CEDULA_REVIEWED).toMatch(/^2026-09-\d\d$/)
    for (const l of SOLO_CEDULA_LENDERS) {
      expect(l.sourceUrl).toMatch(/^https:\/\//)
      if (l.lenderId) expect(() => byId(l.lenderId!)).not.toThrow()
      expect(SOLO_CEDULA_LABELS[l.soloCedula]).toBeTruthy()
      for (const text of [l.pide, l.clearing, l.tasa, l.montos]) {
        expect(text.length).toBeGreaterThan(10)
        expect(text).not.toMatch(/septiembre/i)
      }
    }
    expect(new Set(SOLO_CEDULA_LENDERS.map(l => l.name)).size).toBe(SOLO_CEDULA_LENDERS.length)
  })

  it('sólo OCA y Pronto! anuncian la cédula sola; Creditel pide otro papel', () => {
    const si = SOLO_CEDULA_LENDERS.filter(l => l.soloCedula === 'si').map(l => l.lenderId)
    expect(si.sort()).toEqual(['oca', 'pronto'])
    expect(SOLO_CEDULA_LENDERS.find(l => l.lenderId === 'creditel')!.soloCedula).toBe('parcial')
  })

  it('las que exigen clearing limpio lo dicen en su fila, con la corrección de Compra Ágil', () => {
    const oca = SOLO_CEDULA_LENDERS.find(l => l.lenderId === 'oca')!
    expect(oca.clearing).toMatch(/no figurar actualmente en el clearing/)
    // OCA publica un rango en la web y otro en la cartilla: las dos TEA y los gastos viajan juntos.
    expect(oca.tasa).toMatch(/29 % y 87 %/)
    expect(oca.tasa).toMatch(/62 %/)
    expect(oca.tasa).toMatch(/86 %/)
    expect(oca.tasa).toMatch(/40 UI/)
    expect(oca.tasa).toMatch(/80 UI/)
    expect(oca.tasa).toMatch(/0,25 %/)
    const cdlc = SOLO_CEDULA_LENDERS.find(l => l.lenderId === 'credito-de-la-casa')!
    expect(cdlc.soloCedula).toBe('no')
    expect(cdlc.pide).toMatch(/23 a 84 años/)
    expect(cdlc.clearing).toMatch(/Infocred o Clearing/)
    expect(cdlc.clearing).toMatch(/MOCASIST/)
    const rmf = SOLO_CEDULA_LENDERS.find(l => /Microfinanzas/.test(l.name))!
    expect(rmf.soloCedula).toBe('no')
    expect(rmf.clearing).toMatch(/Sin morosidad vigente en Clearing/)
    const pronto = SOLO_CEDULA_LENDERS.find(l => l.lenderId === 'pronto')!
    expect(pronto.clearing).toMatch(/estando en el clearing/)
  })

  it('la postura del ranking y la de la tabla no se contradicen', () => {
    for (const l of SOLO_CEDULA_LENDERS) {
      if (!l.lenderId) continue
      const stance = byId(l.lenderId).clearing
      if (/exige|no figurar|sin incumplimientos|sin morosidad/i.test(l.clearing)) {
        expect(stance, l.name).toBe('no')
      }
    }
  })
})

describe('NOPAYSLIP_CAPS: la tabla del BCU cierra con la Ley 18.212', () => {
  it('período y vigencia fechados, sin "septiembre"', () => {
    expect(BCU_CAPS_PERIOD).toBe('mayo–julio de 2026')
    expect(BCU_CAPS_IN_FORCE_SINCE).toBe('2026-09-01')
  })

  it('tope = media × 1,55 / 1,30 / 1,20 y mora = media × 1,80 según la fila', () => {
    for (const row of NOPAYSLIP_CAPS) {
      const factor = /retención de haberes/.test(row.segment)
        ? 1.3
        : /nómina/.test(row.segment)
          ? 1.2
          : 1.55
      expect(row.capPct, row.id).toBeCloseTo(row.meanPct * factor, 1)
      if (row.moraPct != null) expect(row.moraPct, row.id).toBeCloseTo(row.meanPct * 1.8, 1)
    }
  })

  it('en dólares hay una sola categoría de consumo, sin tramo de UI', () => {
    const usd = NOPAYSLIP_CAPS.filter(r => r.currency === 'USD')
    expect(usd).toHaveLength(2)
    for (const r of usd) {
      expect(r.segment).toMatch(/única categoría/)
      expect(r.segment).not.toMatch(/10\.000 UI/)
    }
  })

  it('las seis filas de consumo se refrescan con la grilla viva; las otras quedan fechadas', () => {
    const live = [
      {
        bracket: 'menor10kUI',
        cortoPlazo: true,
        currency: 'UYU',
        media: 0.9,
        tope: 1.395,
        topeMora: 1.62,
      },
    ] as BcuCapRow[]
    const merged = mergeNoPayslipCaps(NOPAYSLIP_CAPS, live)
    const fresh = merged.find(r => r.id === 'sin-descuento-chico-corto')!
    expect(fresh.live).toBe(true)
    expect(fresh.meanPct).toBeCloseTo(90, 6)
    expect(fresh.capPct).toBeCloseTo(139.5, 6)
    expect(fresh.moraPct).toBeCloseTo(162, 6)
    const manual = merged.find(r => r.id === 'retencion-chico-corto')!
    expect(manual.live).toBe(false)
    expect(manual.capPct).toBe(27.37)
    expect(NOPAYSLIP_CAPS.filter(r => r.grid).length).toBe(6)
  })

  it('una fila viva con error de unidad no reemplaza la lectura del PDF', () => {
    const bad = [
      {
        bracket: 'menor10kUI',
        cortoPlazo: true,
        currency: 'UYU',
        media: 86.12,
        tope: 133.486,
        topeMora: 155,
      },
    ] as BcuCapRow[]
    const merged = mergeNoPayslipCaps(NOPAYSLIP_CAPS, bad)
    const row = merged.find(r => r.id === 'sin-descuento-chico-corto')!
    expect(row.live).toBe(false)
    expect(row.capPct).toBe(133.486)
  })

  it('sin grilla viva devuelve la lectura fechada entera', () => {
    const merged = mergeNoPayslipCaps(NOPAYSLIP_CAPS, null)
    expect(merged).toHaveLength(NOPAYSLIP_CAPS.length)
    expect(merged.every(r => r.live === false)).toBe(true)
  })
})

describe('gastos excluidos del cálculo de usura (art. 14)', () => {
  it('trae el literal D de 120 UI, que es el del préstamo sin retención, y no sólo los 30 UI', () => {
    const d = USURY_EXCLUDED_COSTS.find(c => c.id === 'd')!
    expect(d.text).toMatch(/120 UI/)
    expect(d.text).toMatch(/40 UI/)
    expect(d.text).toMatch(/8 UI/)
    expect(d.text).toMatch(/60 días/)
    const b = USURY_EXCLUDED_COSTS.find(c => c.id === 'b')!
    expect(b.text).toMatch(/30 UI/)
    expect(b.text).toMatch(/retención de sueldo o débito automático/)
  })
})

describe('la página lee la tabla y los topes del util, no a mano', () => {
  const page = readFileSync(
    join(__dirname, '..', '..', 'pages', 'prestamo-sin-recibo-de-sueldo-uruguay.vue'),
    'utf8'
  )

  it('monta la sección "Sólo con cédula" con la tabla y los topes, sin cifras sueltas', () => {
    expect(page).toContain('Sólo con cédula: quién presta y a qué tasa')
    expect(page).toContain('SOLO_CEDULA_LENDERS')
    expect(page).toContain('mergeNoPayslipCaps(NOPAYSLIP_CAPS')
    expect(page).toContain('BCU_CAPS_SOURCE_URL')
    expect(page).not.toMatch(/septiembre/)
    // La corrección del BROU viaja con la frase, no suelta: sin comisión de concesión ni seguro,
    // PERO con comisión por cancelación anticipada.
    expect(page).toMatch(
      /No cobra comisión de concesión ni seguro[\s\S]{0,200}cancelación anticipada/
    )
    // Y el BCU republica mensualmente, no "cada trimestre".
    expect(page).not.toMatch(/cada trimestre/)
  })
})
