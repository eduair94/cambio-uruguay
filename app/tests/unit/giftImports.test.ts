import { describe, expect, it } from 'vitest'
import {
  buildSenderInstructions,
  CUSTOMS_FORM_FIELDS,
  GIFT_BLOCKER_GROUPS,
  GIFT_SOURCES,
  type GiftBlockerTier,
} from '../../utils/giftImports'
import {
  FRANCHISE_ANNUAL_USD,
  FRANCHISE_MAX_SHIPMENTS,
  MAX_WEIGHT_KG,
} from '../../utils/importRules'

const args = {
  franchiseAnnualUsd: FRANCHISE_ANNUAL_USD,
  maxShipments: FRANCHISE_MAX_SHIPMENTS,
  maxWeightKg: MAX_WEIGHT_KG,
} as const

describe('GIFT_BLOCKER_GROUPS', () => {
  it('covers the four severities, most severe first', () => {
    const tiers = GIFT_BLOCKER_GROUPS.map(g => g.tier)
    expect(tiers).toEqual<GiftBlockerTier[]>(['prohibido', 'fuera-regimen', 'permiso', 'tramite'])
  })

  it('gives every blocker an effect and a way out', () => {
    for (const group of GIFT_BLOCKER_GROUPS) {
      expect(group.items.length).toBeGreaterThan(0)
      for (const item of group.items) {
        expect(item.title.length).toBeGreaterThan(3)
        expect(item.effect.length).toBeGreaterThan(20)
        // Sin `fix` la lista sólo asusta: cada bloqueo tiene que decir qué hacer en su lugar.
        expect(item.fix.length).toBeGreaterThan(10)
        expect(item.icon).toMatch(/^mdi-/)
        expect(item.tier).toBe(group.tier)
      }
    }
  })

  it('keeps the retention causes that most often trap a gift', () => {
    const all = GIFT_BLOCKER_GROUPS.flatMap(g => g.items)
      .map(i => `${i.title} ${i.effect} ${i.fix}`.toLowerCase())
      .join(' | ')
    for (const needle of [
      'litio',
      'aerosol',
      'imesi',
      'ursec',
      'msp',
      'mgap',
      'menor',
      'subdeclarad',
      'factura',
    ]) {
      expect(all).toContain(needle)
    }
  })

  it('does not repeat a blocker title across groups', () => {
    const titles = GIFT_BLOCKER_GROUPS.flatMap(g => g.items).map(i => i.title)
    expect(new Set(titles).size).toBe(titles.length)
  })
})

describe('CUSTOMS_FORM_FIELDS', () => {
  it('explains how to fill every field it names', () => {
    expect(CUSTOMS_FORM_FIELDS.length).toBeGreaterThanOrEqual(6)
    for (const f of CUSTOMS_FORM_FIELDS) {
      expect(f.field.length).toBeGreaterThan(3)
      expect(f.how.length).toBeGreaterThan(20)
    }
  })

  it('tells the sender to tick the gift box', () => {
    const category = CUSTOMS_FORM_FIELDS[0]
    expect(category?.good).toMatch(/gift/i)
  })
})

describe('buildSenderInstructions', () => {
  it('carries the live regime figures instead of hard-coded ones', () => {
    const es = buildSenderInstructions({ lang: 'es', ...args })
    expect(es).toContain(`USD ${FRANCHISE_ANNUAL_USD}`)
    expect(es).toContain(`${MAX_WEIGHT_KG} kg`)
    expect(es).toContain(`${FRANCHISE_MAX_SHIPMENTS} envíos`)

    const withOtherRules = buildSenderInstructions({
      lang: 'es',
      franchiseAnnualUsd: 1200,
      maxShipments: 4,
      maxWeightKg: 30,
    })
    expect(withOtherRules).toContain('USD 1200')
    expect(withOtherRules).toContain('30 kg')
    expect(withOtherRules).not.toContain(`USD ${FRANCHISE_ANNUAL_USD}`)
  })

  it('names every blocker the sender controls, in both languages', () => {
    const es = buildSenderInstructions({ lang: 'es', ...args }).toLowerCase()
    for (const needle of ['perfume', 'litio', 'aerosol', 'cédula', 'obsequio', 'factura']) {
      expect(es).toContain(needle)
    }

    const en = buildSenderInstructions({ lang: 'en', ...args }).toLowerCase()
    for (const needle of ['perfume', 'lithium', 'aerosol', 'gift', 'invoice', 'realistic value']) {
      expect(en).toContain(needle)
    }
  })

  it('reads as a numbered list the sender can follow', () => {
    for (const lang of ['es', 'en'] as const) {
      const lines = buildSenderInstructions({ lang, ...args })
        .split('\n')
        .filter(l => /^\d+\./.test(l))
      expect(lines).toHaveLength(10)
    }
  })
})

describe('GIFT_SOURCES', () => {
  it('links only primary or official sources over https', () => {
    for (const s of GIFT_SOURCES) {
      expect(s.url).toMatch(/^https:\/\//)
      expect(s.org.length).toBeGreaterThan(2)
      expect(s.label.length).toBeGreaterThan(15)
    }
  })

  it('does not cite the Aduanas page that still publishes the repealed figures', () => {
    // aduanas.gub.uy/innovaportal/v/27950 keeps serving Decreto 356/014 (USD 10 mínimo,
    // USD 200 por envío), derogado por el Decreto 50/026.
    for (const s of GIFT_SOURCES) expect(s.url).not.toContain('/v/27950')
  })

  it('backs the two claims the page leads with', () => {
    const urls = GIFT_SOURCES.map(s => s.url).join(' ')
    expect(urls).toContain('impo.com.uy/bases/decretos/50-2026/3')
    expect(urls).toContain('upu.int')
  })

  it('does not list the same URL twice', () => {
    const urls = GIFT_SOURCES.map(s => s.url)
    expect(new Set(urls).size).toBe(urls.length)
  })
})
