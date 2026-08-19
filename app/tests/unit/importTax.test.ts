import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ADUANA_FAQS } from '../../utils/aduanaFaq'
import { courierImport, generalImport } from '../../utils/importTax'
import {
  COURIER_RATES_VERIFIED_AT,
  COURIERS,
  POSTAL_SURCHARGE,
  shippingCostUsd,
  getCourier,
} from '../../utils/courierShipping'

// The courier regime as Ley 20.446 art. 627 + Decreto 50/026 actually define it. Several of
// these replace tests that encoded a regime which does not exist — see `importRules.ts`.
const TODAY = new Date('2026-07-11T00:00:00Z')

describe('courierImport', () => {
  it('charges IVA (22%) on a franchised non-US shipment', () => {
    // 150 fits the franchise: exempt from aranceles, but IVA 22% = 33.
    const r = courierImport({ value: 150, origin: 'other', useFranchise: true, today: TODAY })
    expect(r.regime).toBe('franquicia')
    expect(r.totalTax).toBe(33)
    expect(r.landedCost).toBe(183)
  })

  it('exonerates IVA for a US invoice up to USD 200', () => {
    const r = courierImport({ value: 150, origin: 'usa', useFranchise: true, today: TODAY })
    expect(r.ivaExempt).toBe(true)
    expect(r.totalTax).toBe(0)
  })

  it('taxes the WHOLE US shipment one dollar over the threshold', () => {
    // All-or-nothing: 250 -> IVA on the full 250 = 55, not on the excess.
    const r = courierImport({ value: 250, origin: 'usa', useFranchise: true, today: TODAY })
    expect(r.ivaExempt).toBe(false)
    expect(r.totalTax).toBe(55)
  })

  it('never splits a shipment between the franchise and the 60% rate', () => {
    // The old model franchised USD 100 and charged 60% on the remaining 400. Decreto art. 15:
    // a shipment the franchise cannot cover goes ENTIRELY to the prestación única.
    const r = courierImport({
      value: 500,
      origin: 'other',
      useFranchise: true,
      franchiseAvailable: 100,
      today: TODAY,
    })
    expect(r.regime).toBe('simplificado')
    expect(r.totalTax).toBe(300) // 60% of 500 — not 22% of 100 + 60% of 400
  })

  it('applies the 60% rate when the franchise is not used', () => {
    const r = courierImport({ value: 100, useFranchise: false, today: TODAY })
    expect(r.regime).toBe('simplificado')
    expect(r.totalTax).toBe(60)
  })

  it('floors the simplified regime at USD 20, not the repealed USD 10', () => {
    // 60% of 10 = 6 -> floored to the statutory minimum of 20.
    const r = courierImport({ value: 10, useFranchise: false, today: TODAY })
    expect(r.totalTax).toBe(20)
  })

  it('counts the seller shipping and US sales tax INSIDE the USD 200 threshold', () => {
    // Decreto art. 5: the threshold is the invoice TOTAL. 180 + 25 + 10 = 215 > 200, so this
    // pays IVA — the old model saw only the 180 and wrongly called it exempt.
    const r = courierImport({
      value: 180,
      sellerShipping: 25,
      salesTax: 10,
      origin: 'usa',
      useFranchise: true,
      today: TODAY,
    })
    expect(r.ivaExempt).toBe(false)
    expect(r.totalTax).toBe(47.3) // 22% of 215
  })

  it("keeps the courier's own freight out of the threshold and out of every tax base", () => {
    // The courier's separately-billed freight is not on the seller's invoice: 190 stays under
    // the 200 threshold and the freight is added to the landed cost untaxed.
    const r = courierImport({
      value: 190,
      shipping: 40,
      origin: 'usa',
      useFranchise: true,
      today: TODAY,
    })
    expect(r.ivaExempt).toBe(true)
    expect(r.totalTax).toBe(0)
    expect(r.landedCost).toBe(230)
  })

  it('refuses to price a shipment over USD 800 instead of inventing a number', () => {
    const r = courierImport({ value: 1000, origin: 'other', useFranchise: true, today: TODAY })
    expect(r.regime).toBe('general')
    expect(r.totalTax).toBe(0)
    expect(r.reasons?.join(' ')).toMatch(/supera/i)
  })

  it('refuses to price a parcel over 20 kg even when the invoice is tiny', () => {
    // The bug this fixes: the calculator charged 60% (US$ 36) on a 25 kg parcel that cannot enter
    // by courier at all — it needs DUA and despachante.
    const r = courierImport({
      value: 60,
      weightKg: 25,
      origin: 'other',
      useFranchise: false,
      today: TODAY,
    })
    expect(r.regime).toBe('general')
    expect(r.overWeight).toBe(true)
    expect(r.totalTax).toBe(0)
    expect(r.breakdown.some(l => /20 kg/.test(l.label))).toBe(true)
  })

  it('still prices a 20 kg parcel — the ceiling is inclusive', () => {
    const r = courierImport({
      value: 100,
      weightKg: 20,
      origin: 'other',
      useFranchise: false,
      today: TODAY,
    })
    expect(r.regime).toBe('simplificado')
    expect(r.totalTax).toBe(60)
  })

  it('keeps pricing normally when no weight is declared', () => {
    const r = courierImport({ value: 100, origin: 'other', useFranchise: false, today: TODAY })
    expect(r.regime).toBe('simplificado')
    expect(r.overWeight).toBeUndefined()
  })

  it('sends the 4th shipment of the year to the simplified regime', () => {
    const r = courierImport({
      value: 100,
      origin: 'usa',
      useFranchise: true,
      shipmentsUsed: 3,
      today: TODAY,
    })
    expect(r.regime).toBe('simplificado')
    expect(r.totalTax).toBe(60)
  })

  it('from 2026-10-01 an unregistered US seller loses the IVA exoneration', () => {
    const after = new Date('2026-10-01T00:00:00Z')
    const exempt = courierImport({
      value: 150,
      origin: 'usa',
      useFranchise: true,
      sellerRegistered: true,
      today: after,
    })
    const taxed = courierImport({
      value: 150,
      origin: 'usa',
      useFranchise: true,
      sellerRegistered: false,
      today: after,
    })
    expect(exempt.totalTax).toBe(0)
    expect(taxed.totalTax).toBe(33)
  })

  it('shows the merchandise and the courier freight as separate lines', () => {
    const r = courierImport({ value: 100, shipping: 20, useFranchise: false, today: TODAY })
    expect(r.breakdown[0]).toEqual({ label: 'Mercadería', amount: 100 })
    expect(r.breakdown.find(l => /flete/i.test(l.label))?.amount).toBe(20)
  })

  it('omits the freight line when there is no courier freight', () => {
    const r = courierImport({ value: 100, useFranchise: false, today: TODAY })
    expect(r.breakdown.some(l => /flete/i.test(l.label))).toBe(false)
  })

  // The r/uruguay case (oct-2025): USD 118 from AliExpress by Correo, franquicia available and
  // USD 75 charged anyway — the old USD 50 non-express cap. That cap died on 30/04/2026, so the
  // same parcel today prices identically whichever way it arrives; what survives is the warning.
  it('prices a non-express parcel exactly like a courier one, and flags the repealed cap', () => {
    const postal = courierImport({
      value: 118,
      origin: 'other',
      useFranchise: true,
      channel: 'postal-simple',
      today: TODAY,
    })
    const byCourier = courierImport({
      value: 118,
      origin: 'other',
      useFranchise: true,
      channel: 'courier',
      today: TODAY,
    })
    expect(postal.regime).toBe('franquicia')
    expect(postal.totalTax).toBe(byCourier.totalTax)
    expect(postal.legacyChannelCap).toEqual({ channel: 'postal-simple', capUsd: 50 })
    expect(byCourier.legacyChannelCap).toBeUndefined()
  })
})

describe('courierShipping', () => {
  it('cost = base fee + per-kg rate × weight', () => {
    expect(shippingCostUsd(22, 5, 2)).toBe(49) // 5 + 22*2
  })

  it('clamps negative weight to zero', () => {
    expect(shippingCostUsd(22, 5, -3)).toBe(5)
  })

  it('falls back to the first courier for an unknown id', () => {
    expect(getCourier('nope').id).toBe('gripper')
  })

  it('names the 10% surcharge one way across every note', () => {
    // It used to appear as "+10% TSPU", "+10% postal" and "+10% URSEC" in the same file, which
    // read like three separate charges piling onto the freight. One surcharge, one label.
    const notes = COURIERS.map(courier => courier.note ?? '')
    const surcharged = notes.filter(note => note.includes('10%'))

    expect(surcharged.length).toBeGreaterThan(0)
    for (const note of surcharged) {
      expect(note).toContain(`10% ${POSTAL_SURCHARGE.label}`)
    }
    for (const alias of ['10% TSPU', '10% postal', '10% URSEC']) {
      expect(notes.filter(note => note.includes(alias))).toEqual([])
    }
  })

  it('explains the surcharge once, against the statute that sets it', () => {
    expect(POSTAL_SURCHARGE.name).toBe('Tasa de Financiamiento del Servicio Postal Universal')
    expect(POSTAL_SURCHARGE.ratePct).toBe(10)
    expect(POSTAL_SURCHARGE.base).toContain('excluido el IVA')
    expect(POSTAL_SURCHARGE.sourceUrl).toBe('https://www.impo.com.uy/bases/leyes/19009-2012/15')
    expect(POSTAL_SURCHARGE.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('carries the acronyms the user reads on the invoice, so a page can show both', () => {
    // Standardising the notes on URSEC's own acronym left the reader worse off on its own: the
    // courier's price list says "TSPU", nothing on the page expanded "TFSPU", and one tax looked
    // like two. The aliases travel with the surcharge so whatever renders it can print the full
    // name plus the words the invoice actually uses.
    expect(POSTAL_SURCHARGE.aliases).toContain('TSPU')
    expect(POSTAL_SURCHARGE.aliases).toContain('URSEC')
    expect(POSTAL_SURCHARGE.aliases).not.toContain(POSTAL_SURCHARGE.label)
  })

  it('points faqPath at an anchor the FAQ page actually renders', () => {
    // The hash was the FAQ's data id (`#que-es-la-tspu`), but the DOM id is `pregunta-${faq.id}`
    // and nothing on that page normalises the hash — so the "read the long explanation" link
    // dropped the reader at the top of a 90+ question page, which is the opposite of the point.
    const [path, hash] = POSTAL_SURCHARGE.faqPath.split('#')
    expect(path).toBe('/preguntas-frecuentes-aduana-uruguay')
    expect(hash).toBeTruthy()

    const faqPage = readFileSync(
      fileURLToPath(
        new URL('../../pages/preguntas-frecuentes-aduana-uruguay.vue', import.meta.url)
      ),
      'utf8'
    )
    // Read the prefix off the page itself, so renaming the id template breaks this test loudly
    // instead of silently breaking the link again.
    const prefix = faqPage.match(/:id="`([a-z-]+)-\$\{faq\.id\}`"/)?.[1]
    expect(prefix).toBe('pregunta')

    expect(hash).toMatch(new RegExp(`^${prefix}-`))
    const faqId = hash!.slice(prefix!.length + 1)
    expect(ADUANA_FAQS.map(faq => faq.id)).toContain(faqId)
  })

  it('keeps one verification date for the rates instead of two that disagree', () => {
    // courierShipping.ts documented "verified 2026-06-19" while /couriers-uruguay printed
    // 18/06/2026 for the same check. One constant now owns the fact, and it is the earlier of the
    // two: a verification date may lag the data, never lead it.
    expect(COURIER_RATES_VERIFIED_AT).toBe('2026-06-18')

    const page = readFileSync(
      fileURLToPath(new URL('../../pages/couriers-uruguay.vue', import.meta.url)),
      'utf8'
    )
    // The page must READ the constant, not retype the date — the "either/or" version of this
    // check let a second hand-kept copy live on as long as it happened to agree today.
    expect(page).toContain('COURIER_RATES_VERIFIED_AT')
    const [yyyy, mm, dd] = COURIER_RATES_VERIFIED_AT.split('-')
    const printed = page.match(/\b\d{2}\/\d{2}\/\d{4}\b/g) ?? []
    for (const date of printed) expect(date).toBe(`${dd}/${mm}/${yyyy}`)
  })

  it('renders the surcharge from the module instead of hardcoding any acronym', () => {
    // The previous guard accepted every known alias, so it BLESSED the bug it was written for:
    // the disclaimer said "TSPU" while all seven notes said "TFSPU", one 10% reading as two
    // charges. There is no correct hardcoded sigla here — the page must print POSTAL_SURCHARGE,
    // which carries the official label, the full name and the words the invoice uses.
    const page = readFileSync(
      fileURLToPath(new URL('../../pages/couriers-uruguay.vue', import.meta.url)),
      'utf8'
    )

    // Comments may name the sigla — that is how the bug gets explained. Code and markup may not.
    const code = page
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    expect(code.match(/\bT?F?SPU\b/g) ?? []).toEqual([])
    // And it must expand the acronym, carry the invoice's own words and link to the explanation —
    // "TFSPU" alone leaves the reader with four bare letters and no way to reach the long answer.
    for (const field of ['label', 'name', 'aliases', 'faqPath'] as const) {
      expect(page, `the page never reads POSTAL_SURCHARGE.${field}`).toContain(
        `POSTAL_SURCHARGE.${field}`
      )
    }
  })
})

describe('generalImport', () => {
  // Título 10 del T.O. 2023, art. 13 lit. B): la base del IVA en la importación es "el valor
  // normal de aduana más el arancel" — la tasa consular NO entra — y "si la importación se
  // efectuara … por no contribuyentes, la referida suma será incrementada en un 50%".
  it('leaves the tasa consular OUT of the IVA base and upgrades the base 50% for a private importer', () => {
    // CIF 1000; arancel 0; tasa consular 5% = 50 (fuera de la base);
    // base IVA = 1000 × 1,5 = 1500; IVA 22% = 330; total = 380.
    const r = generalImport({ value: 1000, arancelPct: 0, tasaConsularPct: 5, ivaPct: 22 })
    expect(r.taxableBase).toBe(1500)
    expect(r.totalTax).toBe(380)
    expect(r.landedCost).toBe(1380)
  })

  it('drops the 50% uplift when the importer is an IVA taxpayer', () => {
    // Misma operación con RUT: base 1000, IVA 220, total 270.
    const r = generalImport({
      value: 1000,
      arancelPct: 0,
      tasaConsularPct: 5,
      ivaPct: 22,
      contribuyente: true,
    })
    expect(r.taxableBase).toBe(1000)
    expect(r.totalTax).toBe(270)
  })

  it('adds the arancel into the IVA base before the uplift', () => {
    const r = generalImport({
      value: 1000,
      arancelPct: 10,
      tasaConsularPct: 0,
      imesiPct: 0,
      ivaPct: 22,
    })
    // arancel 100; base (1000 + 100) × 1,5 = 1650; IVA 363; total 463.
    expect(r.taxableBase).toBe(1650)
    expect(r.totalTax).toBe(463)
  })

  it('keeps IMESI out of the IVA base and prices it on the same uplifted base', () => {
    // Decreto 96/990 art. 11 num. I: cosméticos/vehículos/lubricantes importados por un no
    // contribuyente liquidan IMESI sobre (valor en aduana + arancel) +50%. El IMESI no integra
    // la base del IVA: el art. 13 lit. B) sólo nombra el valor en aduana y el arancel.
    const r = generalImport({
      value: 1000,
      arancelPct: 0,
      tasaConsularPct: 0,
      imesiPct: 10,
      ivaPct: 22,
    })
    // base 1500; IMESI 150; IVA 330; total 480.
    expect(r.totalTax).toBe(480)
  })

  it('returns zero for merchandise exonerated of every national tax (books)', () => {
    // Título 10 art. 41 y Ley 15.913 art. 8: la importación de obras literarias y material
    // educativo está exonerada de todo tributo nacional, aranceles y tasas consulares.
    const r = generalImport({
      value: 500,
      arancelPct: 10,
      tasaConsularPct: 5,
      ivaPct: 0,
      exemptAllTaxes: true,
    })
    expect(r.totalTax).toBe(0)
    expect(r.landedCost).toBe(500)
  })

  it('reports an effective rate over the goods value', () => {
    const r = generalImport({ value: 1000, tasaConsularPct: 5, ivaPct: 22 })
    expect(r.effectiveRatePct).toBeCloseTo(38, 1)
  })
})
