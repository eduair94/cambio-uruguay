import { describe, expect, it } from 'vitest'
import type { RentalZoneScores } from '../../utils/rentalZoneTypes'
import {
  POWER_OUTAGE_BENCHMARK_MINUTES,
  formatOutageDay,
  bestPowerOutageRows,
  buildPowerOutageRanking,
  formatOutageMinutes,
  powerOutageDescription,
  powerOutageTitle,
  worstPowerOutageRows,
} from '../../utils/powerOutageRanking'

type Period = NonNullable<RentalZoneScores['periods']['power']>

function scores(
  luz: Array<[string, string, number]>,
  period: Partial<Period> = {},
  extraRows = true
): RentalZoneScores {
  const zones: RentalZoneScores['zones'] = {}
  for (const [id, name, value] of luz)
    zones[id] = {
      name,
      department: id.startsWith('mvd:') ? 'Montevideo' : 'Canelones',
      rows: [
        { attribute: 'luz', value, betterThan: 0.5, zones: luz.length },
        ...(extraRows
          ? ([{ attribute: 'agua', value: 1, betterThan: 0.5, zones: luz.length }] as const)
          : []),
      ],
    }
  return {
    generatedAt: '2026-10-03T06:00:00.000Z',
    zones,
    resolver: { ine: {}, aliases: {}, localities: {} },
    periods: {
      power: {
        from: '2026-09-20',
        to: '2026-10-02',
        status: 'ready',
        observedDays: 13.7,
        preliminaryDays: 3,
        minDays: 14,
        ...period,
      },
      water: null,
      claims: null,
      crimeTo: null,
      servicesAsOf: null,
    },
  }
}

describe('formatOutageMinutes', () => {
  it('says minutes under the hour and hours above it', () => {
    expect(formatOutageMinutes(0.2)).toBe('menos de 1 min')
    expect(formatOutageMinutes(36)).toBe('36 min')
    expect(formatOutageMinutes(59.6)).toBe('1 h')
    expect(formatOutageMinutes(96)).toBe('1 h 36 min')
    expect(formatOutageMinutes(120)).toBe('2 h')
  })

  it('never renders a figure it does not have', () => {
    expect(formatOutageMinutes(Number.NaN)).toBe('—')
    expect(formatOutageMinutes(-1)).toBe('—')
  })
})

describe('formatOutageDay', () => {
  it('writes the day as the rest of the site does, without Intl', () => {
    expect(formatOutageDay('2026-09-30')).toBe('30/9/2026')
    expect(formatOutageDay('2026-10-03T06:00:00.000Z')).toBe('3/10/2026')
  })

  it('never invents a date it cannot read', () => {
    expect(formatOutageDay(null)).toBe('—')
    expect(formatOutageDay('')).toBe('—')
    expect(formatOutageDay('en curso')).toBe('en curso')
  })
})

describe('buildPowerOutageRanking', () => {
  it('ranks the measured barrios from fewest minutes to most', () => {
    const ranking = buildPowerOutageRanking(
      scores([
        ['mvd:1', 'Ciudad Vieja', 90],
        ['mvd:2', 'Centro', 10],
        ['ute:7', 'Las Piedras', 50],
      ])
    )!
    expect(ranking.rows.map(row => row.name)).toEqual(['Centro', 'Las Piedras', 'Ciudad Vieja'])
    expect(ranking.median).toBe(50)
    expect(worstPowerOutageRows(ranking, 2).map(row => row.name)).toEqual([
      'Ciudad Vieja',
      'Las Piedras',
    ])
    expect(bestPowerOutageRows(ranking, 1).map(row => row.name)).toEqual(['Centro'])
    expect(ranking.departments).toEqual(['Canelones', 'Montevideo'])
    // Tranqueras y Chuy no son barrios: la mitad de las áreas con dato son localidades del
    // interior y la fila lo dice, para que la página no las llame a todas «barrio».
    expect(ranking.barrios).toBe(2)
    expect(ranking.localidades).toBe(1)
    expect(ranking.rows.map(row => row.kind)).toEqual(['barrio', 'localidad', 'barrio'])
  })

  it('averages the two middle barrios for an even count', () => {
    const ranking = buildPowerOutageRanking(
      scores([
        ['mvd:1', 'A', 10],
        ['mvd:2', 'B', 20],
        ['mvd:3', 'C', 30],
        ['mvd:4', 'D', 60],
      ])
    )!
    expect(ranking.median).toBe(25)
  })

  // Lo que la página no puede publicar mal: un barrio sin fila de luz NO entra con cero, porque
  // encabezaría «los que menos cortes tienen» sin haber sido medido.
  it('leaves out a barrio with no power row instead of reading it as zero', () => {
    const base = scores([
      ['mvd:1', 'Medido', 30],
      ['mvd:2', 'Otro', 40],
    ])
    base.zones['mvd:3'] = {
      name: 'Sin dato',
      department: 'Montevideo',
      rows: [{ attribute: 'agua', value: 2, betterThan: 0.5, zones: 3 }],
    }
    const ranking = buildPowerOutageRanking(base)!
    expect(ranking.rows.map(row => row.name)).toEqual(['Medido', 'Otro'])
  })

  it('counts how many barrios sit above the URSEA reference without judging any of them', () => {
    const ranking = buildPowerOutageRanking(
      scores([
        ['mvd:1', 'A', POWER_OUTAGE_BENCHMARK_MINUTES - 1],
        ['mvd:2', 'B', POWER_OUTAGE_BENCHMARK_MINUTES],
        ['mvd:3', 'C', POWER_OUTAGE_BENCHMARK_MINUTES + 1],
      ])
    )!
    expect(ranking.aboveBenchmark).toBe(1)
    expect(ranking.rows.every(row => !('verdict' in row))).toBe(true)
  })

  it('marks a preliminary window as provisional and floors the measured days', () => {
    const ranking = buildPowerOutageRanking(
      scores(
        [
          ['mvd:1', 'A', 10],
          ['mvd:2', 'B', 20],
        ],
        { status: 'preliminary', observedDays: 4.9 }
      )
    )!
    expect(ranking.provisional).toBe(true)
    expect(ranking.stale).toBe(false)
    expect(ranking.observedDays).toBe(4)
  })

  it('publishes nothing while the ledger is still collecting, unavailable or absent', () => {
    const rows: Array<[string, string, number]> = [
      ['mvd:1', 'A', 10],
      ['mvd:2', 'B', 20],
    ]
    expect(buildPowerOutageRanking(null)).toBeNull()
    expect(buildPowerOutageRanking(scores(rows, { status: 'collecting' }))).toBeNull()
    expect(buildPowerOutageRanking(scores(rows, { status: 'unavailable' }))).toBeNull()
    const without = scores(rows)
    without.periods.power = null
    expect(buildPowerOutageRanking(without)).toBeNull()
  })

  // La guarda que costó: la capa de luz de producción estaba `stale` el 2026-10-03 (snapshot del
  // 30/9) con los 143 barrios medidos, y rechazarla dejaba la página en blanco teniendo el dato.
  // Se publica, marcada, igual que hace el `usable()` del directorio.
  it('publishes a stale window marked as such instead of blanking the page', () => {
    const ranking = buildPowerOutageRanking(
      scores(
        [
          ['mvd:1', 'A', 10],
          ['mvd:2', 'B', 30],
        ],
        { status: 'stale', to: '2026-09-30' }
      )
    )!
    expect(ranking.stale).toBe(true)
    expect(ranking.provisional).toBe(false)
    expect(ranking.observedTo).toBe('2026-09-30')
    expect(ranking.rows).toHaveLength(2)
  })

  it('refuses to call one barrio a ranking', () => {
    expect(buildPowerOutageRanking(scores([['mvd:1', 'Solo', 10]]))).toBeNull()
  })
})

describe('el snippet', () => {
  const ranking = buildPowerOutageRanking(
    scores([
      ['mvd:1', 'Casavalle', 124],
      ['mvd:2', 'Centro', 8],
      ['mvd:3', 'Punta Carretas', 20],
    ])
  )!

  it('pone la cifra adelante y entra en el SERP', () => {
    const description = powerOutageDescription(ranking)
    expect(description.startsWith('Mediana de 20 min')).toBe(true)
    expect(description).toContain('Casavalle')
    expect(description).toContain('3 barrios y localidades')
    expect(description.length).toBeLessThanOrEqual(155)
    expect(`${powerOutageTitle(ranking)} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
  })

  it('entra en el SERP incluso con el nombre de barrio más largo y cifras de tres dígitos', () => {
    const long = buildPowerOutageRanking(
      scores([
        ['mvd:1', 'Villa García - Manga Rural', 998],
        ['mvd:2', 'Nuevo París', 777],
        ['mvd:3', 'Jacinto Vera', 666],
      ])
    )!
    expect(powerOutageDescription(long).length).toBeLessThanOrEqual(155)
  })

  // Sin ranking no se inventa una medición: la descripción cae en la afirmación que la página
  // sostiene igual (la cadencia de lectura y que URSEA no desagrega por barrio), y el título
  // pierde el número en vez de publicar uno falso. La cadencia SÍ puede ir: es una propiedad del
  // método, no un minuto sin luz medido.
  it('no publica ninguna medición cuando no hay ranking', () => {
    expect(powerOutageTitle(null)).toBe('Cortes de luz por barrio en Uruguay')
    const description = powerOutageDescription(null)
    expect(description).not.toMatch(/mediana|al mes|sin luz al mes|días medidos/i)
    expect(description).toContain('cada 10 minutos')
    expect(description.length).toBeLessThanOrEqual(155)
  })
})
