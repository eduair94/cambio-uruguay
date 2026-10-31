// app/tests/unit/plazoFijoBancos.test.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { BROU_DEPOSIT_BOARD, daysForMonths } from '../../utils/investments'
import {
  BROU_MINIMUMS,
  PLAZO_FIJO_BANCOS,
  PLAZO_FIJO_BANCOS_FUERA,
  PLAZO_FIJO_BANCOS_REVIEWED,
  POINT_TERM_TOLERANCE_DAYS,
  bandCovers,
  comparePlazoFijo,
  readOnText,
  termCovers,
  vigenciaText,
  type PlazoFijoBank,
} from '../../utils/plazoFijoBancos'

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const bank = (id: string) => PLAZO_FIJO_BANCOS.find(b => b.id === id)!

describe('el dataset', () => {
  it('lleva fecha de lectura y cada banco enlaza su fuente oficial', () => {
    expect(PLAZO_FIJO_BANCOS_REVIEWED).toMatch(ISO_DAY)
    const hosts: Record<string, string> = {
      brou: 'www.brou.com.uy',
      itau: 'www.itau.com.uy',
      bbva: 'www.bbva.com.uy',
      scotiabank: 'www.scotiabank.com.uy',
      heritage: 'www.heritage.com.uy',
    }
    for (const b of PLAZO_FIJO_BANCOS) {
      expect(b.readOn, `${b.id} sin fecha de lectura`).toMatch(ISO_DAY)
      expect(b.readOn <= PLAZO_FIJO_BANCOS_REVIEWED, `${b.id} leído después de la revisión`).toBe(
        true
      )
      // La fuente es la página o el documento del propio banco, nunca un agregador.
      expect(new URL(b.sourceUrl).host, `${b.id} cita una fuente que no es el banco`).toBe(
        hosts[b.id]
      )
      expect(b.sourceTitle.trim()).not.toBe('')
    }
    expect(new Set(PLAZO_FIJO_BANCOS.map(b => b.id)).size).toBe(PLAZO_FIJO_BANCOS.length)
  })

  it('ninguna vigencia es posterior al día en que se leyó', () => {
    for (const b of PLAZO_FIJO_BANCOS) {
      for (const board of b.boards) {
        const v = board.vigencia
        if (v.kind === 'sin-fecha') {
          expect(v.date).toBeNull()
          continue
        }
        expect(v.date, `${b.id} sin fecha`).toMatch(/^\d{4}-\d{2}(-\d{2})?$/)
        expect(v.date! <= b.readOn, `${b.id} con vigencia futura`).toBe(true)
      }
    }
  })

  it('las tasas son porcentajes plausibles y los plazos y montos son coherentes', () => {
    for (const b of PLAZO_FIJO_BANCOS) {
      expect(b.boards.length, `${b.id} sin pizarras`).toBeGreaterThan(0)
      for (const board of b.boards) {
        expect(board.bands.length).toBeGreaterThan(0)
        let prevMax: number | null | undefined
        for (const band of board.bands) {
          expect(band.min).toBeGreaterThan(0)
          if (band.max != null) expect(band.max).toBeGreaterThan(band.min)
          // Los tramos de monto no se pisan: cada uno arranca después del anterior.
          if (prevMax != null) expect(band.min).toBeGreaterThan(prevMax)
          prevMax = band.max
          expect(band.terms.length).toBeGreaterThan(0)
          let prevEnd = -1
          for (const t of band.terms) {
            expect(t.rate, `${b.id} ${t.label}`).toBeGreaterThanOrEqual(0)
            expect(t.rate, `${b.id} ${t.label}: ¿un 20 % en un plazo fijo?`).toBeLessThan(10)
            expect(t.maxDays).toBeGreaterThanOrEqual(t.minDays)
            expect(t.minDays, `${b.id}: plazos fuera de orden`).toBeGreaterThan(prevEnd)
            prevEnd = t.maxDays
            expect(t.label).toMatch(/días$/)
          }
        }
      }
    }
  })

  it('cada banco incluido publica pesos y dólares; la UI sólo donde existe', () => {
    for (const b of PLAZO_FIJO_BANCOS) {
      const currencies = new Set(b.boards.map(x => x.currency))
      expect(currencies.has('UYU'), `${b.id} sin pesos`).toBe(true)
      expect(currencies.has('USD'), `${b.id} sin dólares`).toBe(true)
    }
    expect(bank('bbva').boards.some(x => x.currency === 'UI')).toBe(false)
    expect(bank('heritage').boards.some(x => x.currency === 'UI')).toBe(false)
  })

  it('el BROU no se duplica: sale de la pizarra que ya publica investments.ts', () => {
    const brou = bank('brou')
    expect(brou.sourceUrl).toBe(BROU_DEPOSIT_BOARD.pdfUrl)
    for (const c of ['UYU', 'USD', 'UI'] as const) {
      const series = BROU_DEPOSIT_BOARD.series[c]
      const online = brou.boards.find(x => x.currency === c && x.channel === 'online')!
      const branch = brou.boards.find(x => x.currency === c && x.channel === 'sucursal')!
      expect(online.bands[0]!.terms.map(t => t.rate)).toEqual(series.tranches.map(t => t.online))
      expect(branch.bands[0]!.terms.map(t => t.rate)).toEqual(series.tranches.map(t => t.branch))
      // El mínimo numérico tiene que ser el que imprime la pizarra ("$ 5.000", "U$S 500").
      expect(series.minimum.replace(/\D/g, '')).toBe(String(BROU_MINIMUMS[c]))
      // Y la vigencia es la de ESA moneda, no la del documento.
      const [d, m, y] = series.vigenciaMoneda.split('/')
      expect(online.vigencia).toEqual({ kind: 'rige-desde', date: `${y}-${m}-${d}` })
    }
  })

  it('pinea las cifras leídas el 31/10/2026 en cada fuente', () => {
    const rate = (id: string, c: string, channel: string, bandIdx: number, label: string) =>
      bank(id)
        .boards.find(x => x.currency === c && x.channel === channel)!
        .bands[bandIdx]!.terms.find(t => t.label === label)!.rate
    // Itaú, manual de tarifas versión 01/10/2026, sección 2.1.
    expect(rate('itau', 'UYU', 'online', 0, '367 días')).toBe(4.75)
    expect(rate('itau', 'UYU', 'online', 0, '732 días')).toBe(5.25)
    expect(rate('itau', 'USD', 'online', 0, '367 días')).toBe(3.0)
    expect(rate('itau', 'UI', 'sucursal', 0, '547 días')).toBe(1.0)
    // BBVA, tablas vigentes desde el 04/08/2026.
    expect(rate('bbva', 'USD', 'online', 0, '367 días')).toBe(2.8)
    expect(rate('bbva', 'UYU', 'online', 1, '367 días')).toBe(4.75)
    expect(rate('bbva', 'UYU', 'sucursal', 0, '30 días')).toBe(2.0)
    // Scotiabank, sin fecha impresa.
    expect(rate('scotiabank', 'UYU', 'sin-distincion', 0, '181 – 366 días')).toBe(1.6)
    expect(rate('scotiabank', 'UYU', 'sin-distincion', 4, '181 – 366 días')).toBe(4.6)
    expect(rate('scotiabank', 'USD', 'sin-distincion', 0, '367 – 999 días')).toBe(1.8)
    // Heritage, documento de 02/2026.
    expect(rate('heritage', 'USD', 'sin-distincion', 1, '367 días')).toBe(2.5)
    expect(rate('heritage', 'UYU', 'sin-distincion', 0, '91 días')).toBe(3.25)
  })

  it('Scotiabank no publica fecha y la promoción oculta en su HTML no entra', () => {
    const scotia = bank('scotiabank')
    expect(scotia.boards.every(x => x.vigencia.kind === 'sin-fecha')).toBe(true)
    const rates = scotia.boards.flatMap(x => x.bands.flatMap(b => b.terms.map(t => t.rate)))
    expect(rates).not.toContain(7.2)
    expect(rates).not.toContain(7.5)
  })

  it('los bancos que no entran dicen por qué y enlazan dónde se buscó', () => {
    const ids = PLAZO_FIJO_BANCOS_FUERA.map(b => b.id)
    expect(ids).toEqual(expect.arrayContaining(['santander', 'btg-pactual', 'bandes', 'bhu']))
    for (const b of PLAZO_FIJO_BANCOS_FUERA) {
      expect(b.reason.length, `${b.id} sin motivo`).toBeGreaterThan(40)
      expect(b.sourceUrl).toMatch(/^https:\/\//)
      expect(b.readOn).toMatch(ISO_DAY)
      expect(
        PLAZO_FIJO_BANCOS.some(x => x.id === b.id),
        `${b.id} está adentro y afuera`
      ).toBe(false)
    }
  })
})

describe('termCovers y bandCovers', () => {
  it('un plazo puntual cubre los meses de la calculadora que caen a ±5 días', () => {
    const t367 = { label: '367 días', minDays: 367, maxDays: 367, rate: 1 }
    expect(termCovers(t367, daysForMonths(12))).toBe(true) // 365 días
    expect(termCovers(t367, 367 + POINT_TERM_TOLERANCE_DAYS)).toBe(true)
    expect(termCovers(t367, 367 + POINT_TERM_TOLERANCE_DAYS + 1)).toBe(false)
    expect(termCovers(t367, daysForMonths(11))).toBe(false)
    const t270 = { label: '270 días', minDays: 270, maxDays: 270, rate: 1 }
    expect(termCovers(t270, daysForMonths(9))).toBe(true) // 274 días
  })

  it('un tramo cubre sus extremos y nada afuera', () => {
    const t = { label: '181 – 366 días', minDays: 181, maxDays: 366, rate: 1 }
    expect(termCovers(t, 181)).toBe(true)
    expect(termCovers(t, 366)).toBe(true)
    expect(termCovers(t, 180)).toBe(false)
    expect(termCovers(t, 367)).toBe(false)
    expect(termCovers(t, 0)).toBe(false)
    expect(termCovers(t, Number.NaN)).toBe(false)
  })

  it('el tramo de monto incluye sus extremos y redondea centavos', () => {
    const band = { label: 'x', min: 10_000, max: 150_000, terms: [] }
    expect(bandCovers(band, 10_000)).toBe(true)
    expect(bandCovers(band, 150_000)).toBe(true)
    expect(bandCovers(band, 150_000.4)).toBe(true)
    expect(bandCovers(band, 150_001)).toBe(false)
    expect(bandCovers(band, 9_999)).toBe(false)
    expect(bandCovers({ ...band, max: null }, 99_000_000)).toBe(true)
    expect(bandCovers(band, 0)).toBe(false)
  })
})

describe('comparePlazoFijo', () => {
  it('pesos, 12 meses, $ 100.000: el orden lo da la tasa y cada fila trae su fuente', () => {
    const { offers, misses } = comparePlazoFijo('UYU', daysForMonths(12), 100_000)
    const rates = offers.map(o => o.rate)
    expect([...rates].sort((a, b) => b - a)).toEqual(rates)
    const row = (id: string, channel: string) =>
      offers.find(o => o.bankId === id && o.channel === channel)
    expect(row('brou', 'online')?.rate).toBe(5.6)
    expect(row('brou', 'sucursal')?.rate).toBe(4.2)
    expect(row('itau', 'online')?.rate).toBe(4.75)
    // $ 100.000 no llega al mínimo de las agencias de Itaú ($ 200.000).
    expect(row('itau', 'sucursal')).toBeUndefined()
    expect(row('bbva', 'online')?.rate).toBe(4.25)
    // La pizarra de sucursal de BBVA arranca justo en $ 100.000.
    expect(row('bbva', 'sucursal')?.rate).toBe(3.0)
    expect(row('scotiabank', 'sin-distincion')?.rate).toBe(1.6)
    expect(row('heritage', 'sin-distincion')?.rate).toBe(3.75)
    expect(misses).toEqual([])
    for (const o of offers) {
      expect(o.sourceUrl).toMatch(/^https:\/\//)
      expect(o.readOn).toBe(PLAZO_FIJO_BANCOS_REVIEWED)
    }
  })

  it('la fila es la del tramo de monto del visitante, nunca la mejor del banco', () => {
    const chico = comparePlazoFijo('UYU', daysForMonths(6), 100_000)
    const grande = comparePlazoFijo('UYU', daysForMonths(6), 6_000_000)
    const scotia = (c: typeof chico) => c.offers.find(o => o.bankId === 'scotiabank')!
    expect(scotia(chico).rate).toBe(1.6)
    expect(scotia(chico).bandLabel).toBe('$ 25.000 a $ 250.000')
    expect(scotia(grande).rate).toBe(4.6)
    expect(scotia(grande).bandLabel).toBe('más de $ 5.000.001')
  })

  it('dólares, 12 meses, USD 10.000: lo que busca "plazo fijo brou dólares"', () => {
    const { offers } = comparePlazoFijo('USD', daysForMonths(12), 10_000)
    const brou = offers.find(o => o.bankId === 'brou' && o.channel === 'online')!
    expect(brou.rate).toBe(2.6)
    expect(brou.termLabel).toBe('181 – 366 días')
    expect(vigenciaText(brou.vigencia)).toBe('rige desde el 26/03/2026')
    // Itaú publica 367 días: 12 meses (365 días) caen ahí y la fila lo dice tal cual.
    const itau = offers.find(o => o.bankId === 'itau' && o.channel === 'online')!
    expect(itau.termLabel).toBe('367 días')
    expect(itau.rate).toBe(3.0)
    // Mismo monto, mismo plazo: agencias de Itaú (desde U$S 10.000) con la misma tasa.
    expect(offers.find(o => o.bankId === 'itau' && o.channel === 'sucursal')?.rate).toBe(3.0)
  })

  it('un banco sin el plazo dice qué plazos publica, no inventa un número', () => {
    // 4 meses ≈ 122 días: BBVA publica 91 y 181, Heritage 91 y 181.
    const { offers, misses } = comparePlazoFijo('UYU', daysForMonths(4), 100_000)
    expect(offers.some(o => o.bankId === 'bbva')).toBe(false)
    const bbva = misses.find(m => m.bankId === 'bbva')!
    expect(bbva.reason).toBe('plazo')
    expect(bbva.detail).toBe('para ese monto publica 30, 91, 181 y 367 días')
    // Itaú sí publica 120 días.
    expect(offers.find(o => o.bankId === 'itau')?.termLabel).toBe('120 días')
  })

  it('un monto bajo el mínimo dice el mínimo; una moneda que no se ofrece, eso', () => {
    const chico = comparePlazoFijo('USD', daysForMonths(12), 1_500)
    const heritage = chico.misses.find(m => m.bankId === 'heritage')!
    expect(heritage.reason).toBe('monto')
    expect(heritage.detail).toBe('el mínimo publicado es USD 5.000')
    expect(chico.misses.find(m => m.bankId === 'scotiabank')?.detail).toBe(
      'el mínimo publicado es USD 2.000'
    )

    const ui = comparePlazoFijo('UI', daysForMonths(12), 100_000)
    expect(ui.misses.find(m => m.bankId === 'bbva')).toMatchObject({
      reason: 'moneda',
      detail: 'no publica plazo fijo en unidades indexadas',
    })
    // En UI el BROU arranca en 181 días y a 12 meses publica 1,60 % por e-BROU.
    expect(ui.offers.find(o => o.bankId === 'brou' && o.channel === 'online')?.rate).toBe(1.6)
  })

  it('un monto por encima de todos los topes lo dice', () => {
    const solo: PlazoFijoBank[] = [
      {
        ...bank('itau'),
        boards: bank('itau').boards.filter(b => b.channel === 'online'),
      },
    ]
    const { misses } = comparePlazoFijo('UYU', daysForMonths(12), 5_000_000, solo)
    expect(misses[0]).toMatchObject({ reason: 'monto', detail: 'publica tasas hasta $ 3.000.000' })
  })

  it('sin plazo o sin monto no hay filas', () => {
    expect(comparePlazoFijo('UYU', 0, 100_000).offers).toEqual([])
    expect(comparePlazoFijo('UYU', 365, 0).offers).toEqual([])
  })
})

describe('textos', () => {
  it('vigenciaText y readOnText', () => {
    expect(vigenciaText({ kind: 'rige-desde', date: '2026-08-04' })).toBe(
      'rige desde el 04/08/2026'
    )
    expect(vigenciaText({ kind: 'version', date: '2026-10-01' })).toBe('versión del 01/10/2026')
    expect(vigenciaText({ kind: 'documento', date: '2026-02' })).toBe('documento de 02/2026')
    expect(vigenciaText({ kind: 'sin-fecha', date: null })).toBe('sin fecha de vigencia impresa')
    expect(readOnText('2026-10-31')).toBe('31 de octubre de 2026')
    expect(readOnText('2026-09-01')).toBe('1 de setiembre de 2026')
  })
})

describe('la página', () => {
  const page = readFileSync(
    resolve(__dirname, '../../pages/herramientas/calculadora-plazo-fijo.vue'),
    'utf8'
  )

  it('muestra la fecha de lectura y nunca se presenta como dato en vivo', () => {
    expect(page).toMatch(/PLAZO_FIJO_BANCOS_REVIEWED/)
    expect(page).toMatch(/[Cc]onsultad[oa]s? el/)
    expect(page).not.toMatch(/en vivo|tiempo real/i)
  })

  it('cada fila deja usar la tasa y enlaza su fuente; los bancos de afuera se nombran', () => {
    expect(page).toMatch(/comparePlazoFijo\(/)
    expect(page).toMatch(/applyRate\(offer\.rate\)/)
    expect(page).toMatch(/offer\.sourceUrl/)
    expect(page).toMatch(/PLAZO_FIJO_BANCOS_FUERA/)
    expect(page).toMatch(/cu-mobile-cards/)
  })

  it('no agrega unidades de anuncio: la calculadora conserva la única de ToolShell', () => {
    expect(page).not.toMatch(/<AdSlot/)
  })
})
