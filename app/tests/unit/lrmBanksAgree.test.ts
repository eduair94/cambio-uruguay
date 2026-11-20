// /inversiones-uruguay (utils/investments.ts) y /letras-de-regulacion-monetaria-uruguay
// (utils/lrm.ts) hablan de los mismos cinco bancos. El 20/11/2026 se publicaron el mismo día
// diciendo cosas distintas: el catálogo de inversiones decía que Scotiabank mandaba a comprar las
// LRM a un corredor externo, que las comisiones de Santander y BBVA no estaban publicadas, que el
// BROU las vendía por e-BROU y que el mínimo de $ 100.000 no lo fijaba el BCU; la tabla de las
// letras, leída en las páginas de cada banco, decía lo contrario, y tenía razón. investments.ts no
// puede importar lrm.ts (lrm.ts lo importa al cargar), así que repite el dato y esto lo ata.
import { describe, expect, it } from 'vitest'
import { INVESTMENTS, getInvestment, type InvestmentOption } from '../../utils/investments'
import {
  LRM_MIN_BID,
  LRM_SOURCES,
  LRM_TARIFFS_VERIFIED_AT,
  LRM_WHERE_TO_BUY,
  type LrmSeller,
} from '../../utils/lrm'

const bankRows = INVESTMENTS.filter(i => i.lrm != null)
const rowFor = (seller: LrmSeller): InvestmentOption =>
  bankRows.find(i => i.lrm!.seller === seller.id)!
/** Lo que la fila le dice al lector y lo que respalda: comisiones y nota. */
const rowText = (i: InvestmentOption) => `${i.feesNote} ${i.note ?? ''}`
/** Las cifras de un texto: «1,50 %», «$ 9.999.999» y «USD 50» dan 1,50, 9.999.999 y 50. */
const numbers = (text: string): string[] => text.match(/\d+(?:[.,]\d+)*/g) ?? []
/** 2026-11-20 → 20/11/2026, como lo escribe el catálogo. */
const dmy = (iso: string) => iso.split('-').reverse().join('/')

describe('las dos páginas dicen lo mismo de cada banco que vende LRM', () => {
  it('los mismos bancos venden letras a sus clientes en las dos', () => {
    const sellers = bankRows.map(i => i.lrm!.seller)
    expect(new Set(sellers).size).toBe(sellers.length)
    expect([...sellers].sort()).toEqual(LRM_WHERE_TO_BUY.map(s => s.id).sort())
    for (const i of bankRows) expect(i.category, i.id).toBe('banco_broker')
  })

  it('la misma respuesta a si el banco publica una comisión para las letras', () => {
    for (const s of LRM_WHERE_TO_BUY) {
      expect(rowFor(s).lrm!.publishedFee, s.id).toBe(s.publishedFee)
    }
  })

  it('con una comisión publicada, el catálogo trae sus cifras y no dice «no publicado»', () => {
    for (const s of LRM_WHERE_TO_BUY.filter(s => s.publishedFee !== 'none')) {
      const row = rowFor(s)
      const own = new Set(numbers(row.feesNote))
      for (const n of numbers(s.commission)) {
        expect(own.has(n), `${row.id}: falta ${n} de «${s.commission}»`).toBe(true)
      }
      expect(row.feesNote, row.id).not.toMatch(
        /no publicad|no verificad|no fueron extra[ií]bles|no se encontr/i
      )
    }
  })

  it('sin comisión publicada, las dos lo dicen', () => {
    for (const s of LRM_WHERE_TO_BUY.filter(s => s.publishedFee === 'none')) {
      expect(s.commission, s.id).toMatch(/no encontramos|no publicad/i)
      expect(rowFor(s).feesNote, s.id).toMatch(/^No publicad/)
    }
  })

  it('el mínimo que publica el banco para las letras aparece en el catálogo', () => {
    for (const s of LRM_WHERE_TO_BUY) {
      const own = new Set(numbers(rowText(rowFor(s))))
      for (const n of numbers(s.minimum)) {
        expect(own.has(n), `${s.id}: falta ${n} de «${s.minimum}»`).toBe(true)
      }
    }
  })

  it('ninguna fila manda a comprarlas a otro lado ni deja de nombrarlas', () => {
    for (const i of bankRows) {
      expect(rowText(i), i.id).toMatch(/Letras de Regulación Monetaria|LRM/)
      expect(rowText(i), i.id).not.toMatch(/corredor de bolsa autorizado externo|remite/i)
      expect(rowText(i), i.id).not.toMatch(/no ofrece canal de compra/i)
    }
  })

  it('el catálogo cita las mismas páginas del banco, leídas el mismo día', () => {
    for (const s of LRM_WHERE_TO_BUY) {
      const row = rowFor(s)
      const cited = `${rowText(row)} ${row.source}`
      for (const src of s.sources) expect(cited, `${row.id}: ${src.url}`).toContain(src.url)
      expect(rowText(row), row.id).toContain(dmy(LRM_TARIFFS_VERIFIED_AT))
    }
  })

  it('el BROU las vende en sucursal en las dos: ninguna dice e-BROU', () => {
    const brou = getInvestment('brou-instrumentos-financieros')!
    expect(brou.online).toBe(false)
    expect(brou.note).not.toMatch(/v[ií]a (Cuenta Cliente|e-BROU)/i)
    const seller = LRM_WHERE_TO_BUY.find(s => s.id === 'brou')!
    expect(seller.how).toMatch(/sucursales/)
  })
})

describe('el mínimo de una letra', () => {
  it('es el del sistema del BCU en las dos, con el documento del BCU como fuente', () => {
    const lrm = getInvestment('letras-regulacion-monetaria')!
    expect(lrm.minInvestment).toEqual({ amount: LRM_MIN_BID, currency: 'UYU' })
    expect(lrm.note).toContain(LRM_SOURCES.characteristicsUrl)
    expect(lrm.note).not.toMatch(/no (es )?un mínimo fijo publicado por el BCU/i)
  })
})
