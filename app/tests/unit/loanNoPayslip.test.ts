import { describe, expect, it } from 'vitest'
import {
  NOPAYSLIP_DOORS,
  buildNoPayslipFaq,
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
})
