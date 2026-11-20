// Las utilidades y las páginas de modelo de bicicleta eléctrica (4/11/2026): mismo catálogo que
// monopatines (`category: bicicleta-electrica`), con su propio texto, ficha y comparador.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  bicicletaCompareRows,
  bicicletaModelDescription,
  bicicletaModelFaq,
  bicicletaModelTitle,
  bicicletaRealRangeKm,
  bicicletaSpecTableRows,
} from '../../utils/bicicletaModelos'
import type { MonopatinModelDoc, MonopatinModelSummary } from '../../utils/monopatinModelos'

const values = (over: Record<string, unknown> = {}) =>
  ({
    rangeKm: null,
    maxSpeedKmh: null,
    motorW: null,
    motorPeakW: null,
    batteryV: null,
    batteryAh: null,
    batteryWh: null,
    chargeHours: null,
    maxLoadKg: null,
    weightKg: null,
    wheelInches: null,
    minAge: null,
    foldable: null,
    suspension: null,
    discBrake: null,
    bluetooth: null,
    brakes: null,
    ipRating: null,
    gears: null,
    removableBattery: null,
    throttle: null,
    centralMotor: null,
    ...over,
  }) as MonopatinModelDoc['specs'] extends infer S
    ? S extends { values: infer V }
      ? V
      : never
    : never

const doc = (over: Partial<MonopatinModelDoc> = {}): MonopatinModelDoc => ({
  slug: 'gyroor-c3',
  name: 'Gyroor C3',
  brandKey: 'gyroor',
  brandLabel: 'Gyroor',
  modelLabel: 'C3',
  variant: 'plegable',
  image: null,
  offers: [],
  newBand: { min: 31_110, median: 33_099, max: 35_000, n: 18, sellers: 3 },
  usedBand: null,
  specs: {
    values: values({
      wheelInches: 14,
      rangeKm: 35,
      motorW: 350,
      weightKg: 21,
      maxLoadKg: 120,
      removableBattery: true,
      foldable: true,
    }),
    agree: { wheelInches: { n: 5, of: 5 }, rangeKm: { n: 2, of: 3 } },
    spread: { rangeKm: { min: 30, max: 35 } },
  },
  fichas: 5,
  listings: 18,
  sellers: 3,
  indexable: true,
  firstSeen: '2026-10-01',
  lastSeen: '2026-11-04',
  generatedAt: '2026-11-04T06:01:00Z',
  history: [],
  ...over,
})

describe('título, descripción y preguntas de una bici', () => {
  it('el título nombra que es una bici eléctrica y lleva la cifra, en 60 con la marca del sitio', () => {
    // "Bicicleta eléctrica Gyroor C3: desde $ 31.110 | Cambio Uruguay" son 61: entra la forma corta.
    // El monto lleva espacio duro ($ y cifra nunca se separan): se compara con espacio común.
    const plain = (text: string) => text.replace(/\u00A0/g, ' ')
    const title = bicicletaModelTitle(doc())
    expect(plain(title)).toBe('Bici eléctrica Gyroor C3: desde $ 31.110')
    expect((title + ' | Cambio Uruguay').length).toBeLessThanOrEqual(60)
    expect(plain(bicicletaModelTitle(doc({ brandLabel: 'Ado', modelLabel: 'A20' })))).toBe(
      'Bicicleta eléctrica Ado A20: desde $ 31.110'
    )
  })

  it('sin oferta nueva, sin cifra y sin perder que es una bici', () => {
    expect(bicicletaModelTitle(doc({ newBand: null }))).toBe(
      'Bici eléctrica Gyroor C3: precio en Uruguay'
    )
  })

  it('la descripción entra en 155 y pone el rodado primero', () => {
    const description = bicicletaModelDescription(doc())
    expect(description.length).toBeLessThanOrEqual(155)
    expect(description).toContain('rodado 14')
    expect(description.startsWith('Bicicleta eléctrica Gyroor C3 nueva desde')).toBe(true)
  })

  it('la autonomía real es el 60 % de la declarada', () => {
    expect(bicicletaRealRangeKm(35)).toBe(21)
    expect(bicicletaRealRangeKm(null)).toBeNull()
  })

  it('las preguntas usan lo que la ficha dice y nada más', () => {
    const faq = bicicletaModelFaq(doc())
    expect(faq.map(item => item.id)).toEqual([
      'bicicleta-modelo-precio',
      'bicicleta-modelo-autonomia',
      'bicicleta-modelo-carga',
      'bicicleta-modelo-peso',
    ])
    expect(faq[1]!.answer).toContain('unos 21 km')
    expect(faq[2]!.answer).toContain('La batería se saca')
    expect(
      faq
        .map(item => item.answer)
        .join(' ')
        .toLowerCase()
    ).not.toContain('ilegal')
  })
})

describe('ficha y comparador de una bici', () => {
  it('la ficha empieza por el rodado y muestra el rango cuando las fichas no coinciden', () => {
    const rows = bicicletaSpecTableRows({
      values: values({ wheelInches: 20, rangeKm: 35, removableBattery: true, gears: 7 }),
      agree: { rangeKm: { n: 1, of: 3 } },
      spread: { rangeKm: { min: 30, max: 70 } },
    })
    expect(rows[0]).toMatchObject({ key: 'wheelInches', value: '20"' })
    expect(rows.find(row => row.key === 'rangeKm')).toMatchObject({
      note: 'Las fichas no coinciden',
    })
    expect(rows.find(row => row.key === 'removableBattery')?.value).toBe('Sí')
    // Empate (1 de 2): también el rango, no una de las dos.
    const tie = bicicletaSpecTableRows({
      values: values({ rangeKm: 15 }),
      agree: { rangeKm: { n: 1, of: 2 } },
      spread: { rangeKm: { min: 15, max: 30 } },
    })
    expect(tie[0]).toMatchObject({ key: 'rangeKm', note: 'Las fichas no coinciden' })
    expect(tie[0]!.value.replace(/\u00A0/g, ' ')).toBe('15 a 30 km')
    expect(rows.find(row => row.key === 'gears')?.value).toBe('7')
  })

  it('el comparador no premia el rodado y sí la autonomía', () => {
    const summary = (slug: string, v: Record<string, unknown>): MonopatinModelSummary => ({
      slug,
      name: slug,
      brandLabel: 'X',
      modelLabel: slug,
      variant: 'urbana',
      image: null,
      newMin: 40_000,
      newMedian: 40_000,
      usedMin: null,
      sellers: 2,
      listings: 2,
      indexable: true,
      specs: values(v),
    })
    const rows = bicicletaCompareRows([
      summary('a', { wheelInches: 20, rangeKm: 40 }),
      summary('b', { wheelInches: 29, rangeKm: 80 }),
    ])
    expect(rows.find(row => row.key === 'wheelInches')?.best).toEqual([])
    expect(rows.find(row => row.key === 'rangeKm')?.best).toEqual([1])
  })
})

const read = (...parts: string[]) => readFileSync(join(__dirname, '..', '..', ...parts), 'utf8')

describe('las páginas de modelo y comparador de bici', () => {
  const page = read('pages', 'bicicletas-electricas-uruguay', '[modelo].vue')
  const compare = read('pages', 'bicicletas-electricas-uruguay', 'comparar.vue')

  it('la página de modelo pide SU categoría (un slug de monopatín acá es 404)', () => {
    expect(page).toContain("query: { categoria: 'bicicleta-electrica' }")
    expect(page).toContain('key: () => `bicicleta-modelo-${slug.value}`')
    expect(page).toContain(
      '`https://cambio-uruguay.com/bicicletas-electricas-uruguay/${slug.value}`'
    )
    expect(page).toContain(
      "robots: () => (model.value.indexable ? 'index, follow' : 'noindex, follow')"
    )
    expect(page).toContain('bicicletaModelTitle(model.value)')
    // Ningún enlace al hub de monopatines (el comentario de cabecera sí lo nombra, como familia).
    expect(page).not.toMatch(/['"`]\/monopatines-electricos-uruguay/)
  })

  it('el comparador es noindex, pide su categoría y usa las filas de bici', () => {
    expect(compare).toContain("robots: 'noindex, follow'")
    expect(compare).toContain("query: { categoria: 'bicicleta-electrica' }")
    expect(compare).toContain('bicicletaCompareRows(chosen.value)')
    expect(compare).not.toMatch(/['"`]\/monopatines-electricos-uruguay/)
  })

  it('las dos son sólo en español y la de modelo avisa cuando el modelo quedó retirado', () => {
    expect(page).toContain("defineI18nRoute({ locales: ['es'] })")
    expect(compare).toContain("defineI18nRoute({ locales: ['es'] })")
    expect(page).toContain('v-if="model.retired"')
  })

  it('ninguna de las dos dice "ilegal"', () => {
    expect(page.toLowerCase()).not.toContain('ilegal')
    expect(compare.toLowerCase()).not.toContain('ilegal')
  })
})
