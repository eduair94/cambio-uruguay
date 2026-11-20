import { describe, expect, it } from 'vitest'
import type { RentalZoneScores } from '../../utils/rentalZoneTypes'
import {
  IM_CLAIM_FAMILIES,
  IM_CLAIM_SOURCES,
  bestImClaimRows,
  buildImClaimRanking,
  formatClaimRate,
  formatClaimRateLabel,
  imClaimDescription,
  imClaimFamily,
  imClaimTitle,
  worstImClaimRows,
} from '../../utils/imClaimRanking'

/**
 * El ranking de reclamos a la Intendencia de `/reclamos-a-la-intendencia-por-barrio-uruguay`.
 *
 * Lo que se vigila acá no es el formato: son las cinco reglas que hacen publicable una página hecha
 * de reclamos ajenos. Que una familia con un solo barrio no se publique (un «ranking» de uno no
 * compara nada), que la ausencia de una capa no se convierta en cero, que las tres familias se
 * cuenten por separado y que el snippet entre en el SERP con la cifra adelante.
 */
const BUDGET_TITLE = 60
const BUDGET_DESCRIPTION = 155

type Row = { attribute: string; value: number; betterThan: number; zones: number }

function scores(
  zones: Record<string, Row[]>,
  periods: Partial<RentalZoneScores['periods']> = {}
): RentalZoneScores {
  return {
    generatedAt: '2026-10-29T06:00:00.000Z',
    zones: Object.fromEntries(
      Object.entries(zones).map(([id, rows]) => [
        id,
        { name: id.replace('mvd:', 'Barrio '), department: 'Montevideo', rows },
      ])
    ),
    resolver: { ine: {}, aliases: {}, localities: {} },
    periods: {
      power: null,
      water: null,
      claims: { from: '2025-10-01', to: '2026-09-30' },
      crimeTo: null,
      servicesAsOf: null,
      ...periods,
    },
  } as unknown as RentalZoneScores
}

const row = (attribute: string, value: number, betterThan = 0.5): Row => ({
  attribute,
  value,
  betterThan,
  zones: 62,
})

const tresBarrios = () =>
  scores({
    'mvd:1': [row('alumbrado', 40, 1), row('saneamiento', 8, 1), row('limpieza', 3, 1)],
    'mvd:2': [row('alumbrado', 90, 0.5), row('saneamiento', 20, 0.5), row('limpieza', 9, 0.5)],
    'mvd:3': [row('alumbrado', 210, 0), row('saneamiento', 44, 0), row('limpieza', 30, 0)],
  })

describe('buildImClaimRanking', () => {
  it('arma una familia por servicio, ordenada de menos a más reclamos', () => {
    const ranking = buildImClaimRanking(tresBarrios())!
    expect(ranking.families.map(family => family.id)).toEqual([
      'alumbrado',
      'saneamiento',
      'limpieza',
    ])
    const alumbrado = imClaimFamily(ranking, 'alumbrado')!
    expect(alumbrado.rows.map(entry => entry.rate)).toEqual([40, 90, 210])
    expect(alumbrado.median).toBe(90)
    expect(alumbrado.best.rate).toBe(40)
    expect(alumbrado.worst.rate).toBe(210)
    expect(ranking.barrios).toBe(3)
  })

  // La ventana nunca es un literal: doce meses salen de las dos fechas que trae el propio libro.
  it('cuenta los meses de la ventana desde sus dos fechas', () => {
    expect(buildImClaimRanking(tresBarrios())!.periodMonths).toBe(12)
  })

  it('no publica nada sin ventana de reclamos', () => {
    expect(buildImClaimRanking(scores({ 'mvd:1': [row('alumbrado', 40)] }, { claims: null }))).toBe(
      null
    )
    expect(buildImClaimRanking(null)).toBe(null)
    expect(buildImClaimRanking(undefined)).toBe(null)
  })

  // Una familia con un solo barrio no compara nada: no entra, y si no entra ninguna no hay página.
  it('descarta la familia con menos de dos barrios y devuelve null si no queda ninguna', () => {
    const uno = buildImClaimRanking(
      scores({
        'mvd:1': [row('alumbrado', 40), row('limpieza', 3)],
        'mvd:2': [row('alumbrado', 90)],
      })
    )!
    expect(uno.families.map(family => family.id)).toEqual(['alumbrado'])
    expect(imClaimFamily(uno, 'limpieza')).toBe(null)
    expect(buildImClaimRanking(scores({ 'mvd:1': [row('alumbrado', 40)] }))).toBe(null)
  })

  // AUSENCIA NO ES CERO: un barrio sin fila en una familia no entra a esa tabla con 0 reclamos.
  it('deja fuera al barrio sin fila en vez de contarlo como cero', () => {
    const ranking = buildImClaimRanking(
      scores({
        'mvd:1': [row('alumbrado', 40), row('limpieza', 3)],
        'mvd:2': [row('alumbrado', 90), row('limpieza', 9)],
        'mvd:3': [row('alumbrado', 210)],
      })
    )!
    const limpieza = imClaimFamily(ranking, 'limpieza')!
    expect(limpieza.rows.map(entry => entry.id)).toEqual(['mvd:1', 'mvd:2'])
    expect(limpieza.rows.some(entry => entry.rate === 0)).toBe(false)
    // Y el conteo de barrios es el de los que tienen dato en alguna familia, no la suma de filas.
    expect(ranking.barrios).toBe(3)
  })

  it('ignora un valor que no es una tasa', () => {
    const ranking = buildImClaimRanking(
      scores({
        'mvd:1': [row('alumbrado', Number.NaN), row('limpieza', 3)],
        'mvd:2': [row('alumbrado', 90), row('limpieza', 9)],
        'mvd:3': [row('alumbrado', -1), row('limpieza', 30)],
      })
    )
    expect(imClaimFamily(ranking, 'alumbrado')).toBe(null)
    expect(imClaimFamily(ranking, 'limpieza')!.rows).toHaveLength(3)
  })

  it('las calles no se publican aunque vengan en la respuesta', () => {
    const ranking = buildImClaimRanking(
      scores({
        'mvd:1': [row('alumbrado', 40), row('calles', 12)],
        'mvd:2': [row('alumbrado', 90), row('calles', 30)],
      })
    )!
    expect(ranking.families.map(family => family.id)).toEqual(['alumbrado'])
  })
})

describe('las puntas de cada familia', () => {
  const ranking = buildImClaimRanking(tresBarrios())!
  const alumbrado = imClaimFamily(ranking, 'alumbrado')!

  it('las peores salen de mayor a menor y las mejores al revés', () => {
    expect(worstImClaimRows(alumbrado).map(entry => entry.rate)).toEqual([210, 90, 40])
    expect(bestImClaimRows(alumbrado).map(entry => entry.rate)).toEqual([40, 90, 210])
  })

  it('respeta el tope pedido', () => {
    expect(worstImClaimRows(alumbrado, 2).map(entry => entry.rate)).toEqual([210, 90])
    expect(bestImClaimRows(alumbrado, 1).map(entry => entry.rate)).toEqual([40])
  })
})

describe('formato de la tasa', () => {
  it('escribe el decimal con coma y redondea a uno', () => {
    expect(formatClaimRate(96.94)).toBe('96,9')
    expect(formatClaimRate(12)).toBe('12')
    expect(formatClaimRate(Number.NaN)).toBe('—')
    expect(formatClaimRate(-3)).toBe('—')
  })

  it('concuerda el singular', () => {
    expect(formatClaimRateLabel(1)).toBe('1 reclamo cada 1.000')
    expect(formatClaimRateLabel(2)).toBe('2 reclamos cada 1.000')
    expect(formatClaimRateLabel(96.9)).toBe('96,9 reclamos cada 1.000')
  })
})

describe('el snippet', () => {
  const brand = (title: string) => `${title} | Cambio Uruguay`

  it('entra en el SERP con la cifra adelante', () => {
    const ranking = buildImClaimRanking(tresBarrios())
    const title = imClaimTitle(ranking)
    const description = imClaimDescription(ranking)
    expect(brand(title).length).toBeLessThanOrEqual(BUDGET_TITLE)
    expect(description.length).toBeLessThanOrEqual(BUDGET_DESCRIPTION)
    expect(title).toContain('90')
    expect(description).toContain('Barrio 3')
  })

  // El título lleva una cifra que no se conoce al escribirlo, así que lo que se vigila es el
  // presupuesto para CUALQUIER cifra: primero se cae la cifra, nunca la palabra por la que se
  // busca. Un título cortado no dice ni una cosa ni la otra.
  it('entra en el presupuesto con cualquier cifra, y suelta la cifra antes de pasarse', () => {
    for (const value of [0, 1, 96.9, 210.35, 9_999.9, 1_234_567_890.5]) {
      const ranking = buildImClaimRanking(
        scores({ 'mvd:1': [row('alumbrado', value)], 'mvd:2': [row('alumbrado', value)] })
      )
      expect(brand(imClaimTitle(ranking)).length).toBeLessThanOrEqual(BUDGET_TITLE)
    }
    const absurda = buildImClaimRanking(
      scores({
        'mvd:1': [row('alumbrado', 1_234_567_890.5)],
        'mvd:2': [row('alumbrado', 1_234_567_890.5)],
      })
    )
    expect(imClaimTitle(absurda)).toBe('Reclamos a la Intendencia por barrio')
    expect(imClaimTitle(buildImClaimRanking(tresBarrios()))).toContain('90')
  })

  it('sin ventana no inventa una cifra', () => {
    const title = imClaimTitle(null)
    const description = imClaimDescription(null)
    expect(title).toBe('Reclamos a la Intendencia por barrio')
    expect(description).not.toMatch(/\d/)
    expect(brand(title).length).toBeLessThanOrEqual(BUDGET_TITLE)
    expect(description.length).toBeLessThanOrEqual(BUDGET_DESCRIPTION)
  })

  // Si alumbrado no publica, la frase usa la primera familia que sí, nunca un cero.
  it('cae a la familia que sí tiene dato', () => {
    const ranking = buildImClaimRanking(
      scores({
        'mvd:1': [row('limpieza', 3)],
        'mvd:2': [row('limpieza', 9)],
      })
    )
    expect(imClaimDescription(ranking)).toContain('limpieza')
  })
})

describe('el registro de familias y fuentes', () => {
  it('nombra las tres familias que el endpoint publica', () => {
    expect(IM_CLAIM_FAMILIES.map(family => family.id)).toEqual([
      'alumbrado',
      'saneamiento',
      'limpieza',
    ])
    for (const family of IM_CLAIM_FAMILIES) {
      expect(family.label.trim()).not.toBe('')
      expect(family.blurb.trim()).not.toBe('')
      expect(family.icon).toMatch(/^mdi-/)
    }
  })

  // La página publica tasas ajenas: sin la URL del volcado no se puede contrastar ni una.
  it('cita el volcado de datos abiertos de la Intendencia', () => {
    expect(IM_CLAIM_SOURCES).toHaveLength(1)
    expect(IM_CLAIM_SOURCES[0]!.url).toMatch(/^https:\/\/catalogodatos\.gub\.uy\//)
    expect(IM_CLAIM_SOURCES[0]!.label).toMatch(/Intendencia de Montevideo/)
  })
})
