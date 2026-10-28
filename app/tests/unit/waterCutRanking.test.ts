import { describe, expect, it } from 'vitest'
import type { RentalZoneScores } from '../../utils/rentalZoneTypes'
import {
  bestWaterCutRows,
  buildWaterCutRanking,
  formatWaterCutDay,
  formatWaterCuts,
  formatWaterCutsLabel,
  monthsBetween,
  waterCutDescription,
  waterCutTitle,
  worstWaterCutRows,
} from '../../utils/waterCutRanking'

type Water = NonNullable<RentalZoneScores['periods']['water']>

function scores(
  agua: Array<[string, string, number]>,
  period: Partial<Water> | null = {},
  withWaterRow = true
): RentalZoneScores {
  const zones: RentalZoneScores['zones'] = {}
  for (const [id, name, value] of agua)
    zones[id] = {
      name,
      department: id.startsWith('mvd:') ? 'Montevideo' : 'Canelones',
      rows: [
        // La fila de luz viaja siempre: es la que prueba que el constructor no lee el atributo
        // equivocado cuando las dos capas están publicadas.
        { attribute: 'luz', value: 999, betterThan: 0.1, zones: agua.length },
        ...(withWaterRow
          ? ([{ attribute: 'agua', value, betterThan: 0.5, zones: agua.length }] as const)
          : []),
      ],
    }
  return {
    generatedAt: '2026-10-28T06:00:00.000Z',
    zones,
    resolver: { ine: {}, aliases: {}, localities: {} },
    periods: {
      power: null,
      water: period ? { from: '2024-10-01', to: '2026-09-30', ...period } : null,
      claims: null,
      crimeTo: null,
      servicesAsOf: null,
    },
  }
}

const THREE: Array<[string, string, number]> = [
  ['mvd:1', 'Centro', 31],
  ['mvd:2', 'Carrasco', 4],
  ['ute:9', 'Las Piedras', 12],
]

describe('formatWaterCuts', () => {
  it('writes the count with a Spanish decimal comma and no trailing zero', () => {
    expect(formatWaterCuts(7)).toBe('7')
    expect(formatWaterCuts(12.5)).toBe('12,5')
    expect(formatWaterCuts(0)).toBe('0')
  })

  it('never renders a figure it does not have', () => {
    expect(formatWaterCuts(Number.NaN)).toBe('—')
    expect(formatWaterCuts(-1)).toBe('—')
  })

  it('concuerda el singular y lleva el adjetivo adentro', () => {
    expect(formatWaterCutsLabel(1)).toBe('1 corte programado')
    expect(formatWaterCutsLabel(2)).toBe('2 cortes programados')
    expect(formatWaterCutsLabel(Number.NaN)).toBe('—')
  })
})

describe('monthsBetween', () => {
  it('counts the months of the measured window from its two days', () => {
    expect(monthsBetween('2024-10-01', '2026-09-30')).toBe(24)
    expect(monthsBetween('2026-09-01', '2026-09-30')).toBe(1)
    expect(monthsBetween('2026-09-01', '2026-09-02')).toBe(0)
  })

  it('never invents a window it cannot read', () => {
    expect(monthsBetween(null, '2026-09-30')).toBe(0)
    expect(monthsBetween('en curso', '2026-09-30')).toBe(0)
  })
})

describe('buildWaterCutRanking', () => {
  it('ranks every measured zone, fewest notices first', () => {
    const ranking = buildWaterCutRanking(scores(THREE))!
    expect(ranking.rows.map(row => row.name)).toEqual(['Carrasco', 'Las Piedras', 'Centro'])
    expect(ranking.rows.map(row => row.kind)).toEqual(['barrio', 'localidad', 'barrio'])
    expect(ranking.barrios).toBe(2)
    expect(ranking.localidades).toBe(1)
    expect(ranking.median).toBe(12)
    expect(ranking.attributedNotices).toBe(47)
    expect(ranking.periodMonths).toBe(24)
    expect(ranking.departments).toEqual(['Canelones', 'Montevideo'])
  })

  it('reads the water attribute and not the power one', () => {
    const ranking = buildWaterCutRanking(scores(THREE))!
    expect(ranking.rows.every(row => row.notices !== 999)).toBe(true)
  })

  it('publishes nothing without a water layer, a period or two zones', () => {
    expect(buildWaterCutRanking(null)).toBeNull()
    expect(buildWaterCutRanking(undefined)).toBeNull()
    expect(buildWaterCutRanking(scores(THREE, null))).toBeNull()
    expect(buildWaterCutRanking(scores(THREE, {}, false))).toBeNull()
    expect(buildWaterCutRanking(scores([['mvd:1', 'Centro', 3]]))).toBeNull()
  })

  it('leaves a zone with no water figure out instead of entering it with zero', () => {
    const input = scores(THREE)
    input.zones['mvd:3'] = { name: 'Pocitos', department: 'Montevideo', rows: [] }
    const ranking = buildWaterCutRanking(input)!
    expect(ranking.rows.map(row => row.name)).not.toContain('Pocitos')
    expect(ranking.rows).toHaveLength(3)
  })

  it('breaks a tie by name so the table does not reshuffle between renders', () => {
    const ranking = buildWaterCutRanking(
      scores([
        ['mvd:1', 'Sayago', 5],
        ['mvd:2', 'Belvedere', 5],
        ['mvd:3', 'Capurro, Bella Vista', 5],
      ])
    )!
    expect(ranking.rows.map(row => row.name)).toEqual([
      'Belvedere',
      'Capurro, Bella Vista',
      'Sayago',
    ])
  })
})

describe('worst/best rows', () => {
  it('takes the ends of the same ranking', () => {
    const ranking = buildWaterCutRanking(scores(THREE))!
    expect(worstWaterCutRows(ranking, 2).map(row => row.name)).toEqual(['Centro', 'Las Piedras'])
    expect(bestWaterCutRows(ranking, 2).map(row => row.name)).toEqual(['Carrasco', 'Las Piedras'])
  })

  it('does not mutate the ranking it reads', () => {
    const ranking = buildWaterCutRanking(scores(THREE))!
    worstWaterCutRows(ranking)
    expect(ranking.rows[0]!.name).toBe('Carrasco')
  })
})

describe('el snippet entra en el SERP y lleva la cifra del día', () => {
  const withBrand = (title: string) => `${title} | Cambio Uruguay`

  it('pone la mediana en el título y entra en los 60 con la marca', () => {
    const title = waterCutTitle(buildWaterCutRanking(scores(THREE)))
    expect(title).toBe('Cortes de agua: mediana de 12 en 24 meses')
    expect(withBrand(title).length).toBeLessThanOrEqual(60)
  })

  it('suelta la cifra antes que publicar un título cortado', () => {
    const ranking = buildWaterCutRanking(scores(THREE))!
    const long = { ...ranking, median: 1234.5, periodMonths: 1234 }
    expect(waterCutTitle(long)).toBe('Cortes de agua programados por barrio')
    expect(withBrand(waterCutTitle(long)).length).toBeLessThanOrEqual(60)
  })

  it('pone la cifra adelante en la descripción y entra en los 155', () => {
    const description = waterCutDescription(buildWaterCutRanking(scores(THREE)))
    expect(description).toContain('Mediana de 12 cortes programados de agua en 24 meses')
    expect(description).toContain('Centro')
    expect(description.length).toBeLessThanOrEqual(155)
  })

  it('cae al dato menos escaso cuando el nombre propio no entra', () => {
    const ranking = buildWaterCutRanking(scores(THREE))!
    const long = {
      ...ranking,
      rows: ranking.rows.map(row => ({ ...row, name: row.name.padEnd(90, 'x') })),
    }
    const description = waterCutDescription(long)
    expect(description.length).toBeLessThanOrEqual(155)
    expect(description).toContain('Avisos de OSE')
  })

  it('no inventa una cifra cuando no hay ranking', () => {
    expect(waterCutTitle(null)).toBe('Cortes de agua programados por barrio')
    const description = waterCutDescription(null)
    expect(description.length).toBeLessThanOrEqual(155)
    expect(description).not.toMatch(/\d/)
  })
})

describe('formatWaterCutDay', () => {
  it('reuses the power page formatter instead of a second one', () => {
    expect(formatWaterCutDay('2026-09-30')).toBe('30/9/2026')
    expect(formatWaterCutDay(null)).toBe('—')
  })
})
