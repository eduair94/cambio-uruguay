import { describe, expect, it } from 'vitest'
import {
  ARMADORES_DEFAULT_STATE,
  type ArmadorEntry,
  type ArmadorPrice,
  armadorBarrioCounts,
  armadorMapBin,
  armadorMoney,
  armadorPriceText,
  armadoresCompact,
  armadoresGroups,
  armadoresQueryFromState,
  armadoresSort,
  armadoresStateFromQuery,
  armadorFromPrice,
  armadorPriceReference,
  armadorShownPrice,
  armadorZoneCounts,
} from '../../utils/armadores'

const DAY = '2026-11-11'

function price(over: Partial<ArmadorPrice> = {}): ArmadorPrice {
  return {
    item: 'ropero',
    label: 'Ropero',
    amount: 1000,
    amountMax: null,
    currency: 'UYU',
    kind: 'exact',
    conditions: null,
    sourceUrl: 'https://x',
    observedAt: DAY,
    origin: 'table',
    ...over,
  }
}

function entry(id: string, over: Partial<ArmadorEntry> = {}): ArmadorEntry {
  return {
    id,
    source: 'editorial',
    kind: 'empresa',
    name: id,
    summary: null,
    url: `https://x/${id}`,
    website: null,
    image: null,
    base: { barrio: null, zone: null, department: 'Montevideo', basis: null },
    coverage: { allMontevideo: false, barrios: [], zones: [], outside: [] },
    services: ['armado'],
    prices: [],
    symbolicPrice: false,
    rating: null,
    placeId: null,
    contacts: [],
    storeOnly: false,
    sources: [],
    firstSeen: DAY,
    lastSeen: DAY,
    ...over,
  }
}

describe('estado en la URL', () => {
  it('lee sólo valores válidos y omite los predeterminados al escribir', () => {
    const state = armadoresStateFromQuery({
      zona: 'costa-este',
      mueble: 'ropero',
      fuente: 'nope',
      precio: '1',
      orden: 'raro',
      q: '  roperos  ',
    })
    expect(state).toEqual({
      ...ARMADORES_DEFAULT_STATE,
      zona: 'costa-este',
      mueble: 'ropero',
      precio: true,
      q: 'roperos',
    })
    expect(armadoresQueryFromState(state)).toEqual({
      zona: 'costa-este',
      mueble: 'ropero',
      precio: '1',
      q: 'roperos',
    })
    expect(armadoresQueryFromState(ARMADORES_DEFAULT_STATE)).toEqual({})
  })

  it('un barrio desconocido no se acepta y uno conocido fija su zona', () => {
    expect(armadoresStateFromQuery({ barrio: 'Narnia' }).barrio).toBeNull()
    expect(armadoresStateFromQuery({ barrio: 'Pocitos', zona: 'oeste' })).toMatchObject({
      barrio: 'Pocitos',
      zona: 'costa-este',
    })
  })
})

describe('grupos por zona', () => {
  const pocitos = entry('base-pocitos', {
    base: { barrio: 'Pocitos', zone: 'costa-este', department: 'Montevideo', basis: 'coordinates' },
  })
  const dice = entry('dice-buceo', {
    coverage: { allMontevideo: false, barrios: ['Buceo'], zones: ['costa-este'], outside: [] },
  })
  const todo = entry('todo-mvd', {
    coverage: { allMontevideo: true, barrios: [], zones: [], outside: [] },
  })
  const cerro = entry('cerro', {
    base: { barrio: 'Cerro', zone: 'oeste', department: 'Montevideo', basis: 'ml-city' },
  })
  const nada = entry('sin-zona')

  it('pone primero la base en la zona, después quien dice cubrirla y aparte toda la ciudad', () => {
    const groups = armadoresGroups([todo, dice, cerro, nada, pocitos], {
      ...ARMADORES_DEFAULT_STATE,
      zona: 'costa-este',
    })
    expect(groups.local.map(e => e.id)).toEqual(['base-pocitos', 'dice-buceo'])
    expect(groups.citywide.map(e => e.id)).toEqual(['todo-mvd'])
    expect(groups.hiddenWithoutZone).toBe(1)
  })

  it('la búsqueda de texto filtra también ordenando por precio de un mueble', () => {
    const state = {
      ...ARMADORES_DEFAULT_STATE,
      mueble: 'ropero' as const,
      orden: 'precio-asc' as const,
      q: 'pocitos',
    }
    expect(armadoresGroups([todo, dice, cerro, nada, pocitos], state).local.map(e => e.id)).toEqual(
      ['base-pocitos']
    )
  })

  it('sin zona elegida muestra todo en un solo grupo', () => {
    const groups = armadoresGroups([todo, dice, cerro, nada, pocitos], ARMADORES_DEFAULT_STATE)
    expect(groups.local).toHaveLength(5)
    expect(groups.citywide).toEqual([])
  })

  it('cuenta por zona base y cobertura, sin sumar toda la ciudad', () => {
    expect(armadorZoneCounts([todo, dice, cerro, pocitos])).toMatchObject({
      'costa-este': 2,
      oeste: 1,
      centro: 0,
    })
  })

  it('el área metropolitana no hereda «todo Montevideo»', () => {
    const groups = armadoresGroups([todo], { ...ARMADORES_DEFAULT_STATE, zona: 'metropolitana' })
    expect(groups.citywide).toEqual([])
  })
})

describe('mapa', () => {
  it('cuenta por barrio INE la base y los barrios nombrados, sin «todo Montevideo»', () => {
    const counts = armadorBarrioCounts(
      [
        entry('g', {
          base: {
            barrio: 'Parque Batlle, Villa Dolores',
            zone: 'costa-este',
            department: 'Montevideo',
            basis: 'coordinates',
          },
        }),
        entry('ml', {
          base: {
            barrio: 'Parque Batlle',
            zone: 'costa-este',
            department: 'Montevideo',
            basis: 'ml-city',
          },
        }),
        entry('fb', {
          coverage: {
            allMontevideo: true,
            barrios: ['Pocitos', 'Villa Dolores'],
            zones: ['costa-este'],
            outside: [],
          },
        }),
        entry('todo', { coverage: { allMontevideo: true, barrios: [], zones: [], outside: [] } }),
      ],
      ['Parque Batlle, Villa Dolores', 'Pocitos', 'Cerro']
    )
    expect(counts).toEqual({ 'Parque Batlle, Villa Dolores': 3, Pocitos: 1, Cerro: 0 })
  })

  it('reparte los conteos en cinco tramos fijos', () => {
    expect([0, 1, 2, 3, 4, 5, 12].map(armadorMapBin)).toEqual([0, 1, 2, 3, 3, 4, 4])
  })
})

describe('precios', () => {
  it('con un mueble elegido ordena por su precio y deja sin precio al final', () => {
    const a = entry('a', { prices: [price({ amount: 1500 })] })
    const b = entry('b', { prices: [price({ amount: 900 }), price({ item: 'cama', amount: 300 })] })
    const c = entry('c', { prices: [price({ item: 'cama', amount: 200 })] })
    expect(armadoresSort([a, b, c], 'precio-asc', 'ropero').map(e => e.id)).toEqual(['b', 'a', 'c'])
  })

  it('sin mueble usa el precio más bajo publicado, sin visita ni hora', () => {
    const e = entry('e', {
      prices: [price({ item: 'visita', amount: 200 }), price({ item: 'mesa-de-luz', amount: 350 })],
    })
    expect(armadorFromPrice(e, null)?.amount).toBe(350)
  })

  it('la referencia exige tres prestadores distintos, en pesos, y no usa la tarjeta del aviso', () => {
    const ref = armadorPriceReference([
      entry('a', { prices: [price({ amount: 1000 }), price({ amount: 1400 })] }),
      entry('b', { prices: [price({ amount: 1200 })] }),
      entry('c', { prices: [price({ amount: 2000 })] }),
      entry('d', { prices: [price({ amount: 50, currency: 'USD' })] }),
      entry('e', {
        source: 'facebook',
        prices: [price({ item: null, amount: 500, kind: 'ad', origin: 'ad-card' })],
      }),
      entry('f', {
        prices: [price({ item: 'cama', amount: 600 }), price({ item: 'cama', amount: 700 })],
      }),
    ])
    const ropero = ref.items.find(row => row.item === 'ropero')
    expect(ropero).toMatchObject({ n: 3, min: 1000, median: 1200, max: 2000 })
    expect(ref.items.find(row => row.item === 'cama')).toBeUndefined()
  })

  it('una tarifa idéntica publicada por dos prestadores (la misma lista de referencia) cuenta una vez', () => {
    const table = [price({ amount: 740 }), price({ item: 'cama', amount: 500 })]
    const ref = armadorPriceReference([
      entry('divino', { prices: table }),
      entry('emporio', { prices: table.map(p => ({ ...p, sourceUrl: 'https://otra' })) }),
      entry('b', { prices: [price({ amount: 1200 })] }),
    ])
    expect(ref.items.find(row => row.item === 'ropero')).toBeUndefined()
  })

  it('la mediana de la tarjeta de los avisos va aparte y sin montos simbólicos', () => {
    const card = (id: string, amount: number) =>
      entry(id, {
        source: 'facebook',
        kind: 'aviso',
        prices: [price({ item: null, amount, kind: 'ad', origin: 'ad-card' })],
      })
    const ref = armadorPriceReference([
      card('a', 400),
      card('b', 600),
      card('c', 800),
      entry('s', { source: 'facebook', symbolicPrice: true }),
    ])
    expect(ref.adCard).toMatchObject({ n: 3, median: 600 })
  })
})

describe('importes', () => {
  it('nunca separa el signo del número (espacio duro)', () => {
    expect(armadorMoney(1490)).toBe('$ 1.490')
    expect(armadorPriceText(price({ kind: 'range', amount: 800, amountMax: 1500 }))).toBe(
      '$ 800 a $ 1.500'
    )
    expect(armadorPriceText(price({ kind: 'from', amount: 900 }))).toBe('desde $ 900')
  })
})

describe('armadoresCompact', () => {
  it('un documento ausente da null (la página muestra el estado vacío, no un 500)', () => {
    expect(armadoresCompact(null)).toBeNull()
  })

  it('no publica el detalle interno de las fuentes más allá de URL y etiqueta', () => {
    const payload = armadoresCompact({
      key: 'mvd',
      capturedAt: new Date('2026-11-11T18:05:00Z'),
      googleAt: DAY,
      editorialReviewedAt: DAY,
      entries: [
        entry('a', { sources: [{ url: 'https://x', consultedAt: DAY, label: 'Google Maps' }] }),
      ],
      counts: { total: 1 },
      notes: ['facebook: sesión no válida'],
    })
    expect(payload?.capturedAt).toBe('2026-11-11T18:05:00.000Z')
    expect(payload?.entries[0]?.sources).toEqual([
      { url: 'https://x', consultedAt: DAY, label: 'Google Maps' },
    ])
    expect(payload).not.toHaveProperty('notes')
  })
})

describe('hallazgos de la revisión final', () => {
  it('con un barrio elegido, quien sólo está en la misma zona va en su propio grupo', () => {
    const colon = entry('colon', {
      base: { barrio: 'Colón', zone: 'norte', department: 'Montevideo', basis: 'ml-city' },
    })
    const prado = entry('prado', {
      base: { barrio: 'Prado', zone: 'norte', department: 'Montevideo', basis: 'ml-city' },
    })
    const groups = armadoresGroups([colon, prado], {
      ...ARMADORES_DEFAULT_STATE,
      zona: 'norte',
      barrio: 'Prado',
    })
    expect(groups.local.map(e => e.id)).toEqual(['prado'])
    expect(groups.nearby.map(e => e.id)).toEqual(['colon'])
  })

  it('una base con etiqueta INE compuesta cuenta para cualquiera de sus partes', () => {
    const pb = entry('pb', {
      base: {
        barrio: 'Parque Batlle, Villa Dolores',
        zone: 'costa-este',
        department: 'Montevideo',
        basis: 'coordinates',
      },
    })
    const groups = armadoresGroups([pb], {
      ...ARMADORES_DEFAULT_STATE,
      zona: 'costa-este',
      barrio: 'Villa Dolores',
    })
    expect(groups.local.map(e => e.id)).toEqual(['pb'])
  })

  it('la misma lista de precios publicada en varios avisos cuenta una vez en la referencia', () => {
    const list = (id: string) =>
      entry(id, {
        source: 'facebook',
        kind: 'aviso',
        prices: [price({ amount: 900, origin: 'ad-text' })],
      })
    const ref = armadorPriceReference([list('a'), list('b'), list('c')])
    expect(ref.items.find(row => row.item === 'ropero')).toBeUndefined()
  })

  it('un prestador que sólo publica en dólares muestra ese precio y cuenta como «con precio»', () => {
    const usd = entry('usd', { prices: [price({ amount: 80, currency: 'USD', item: 'ropero' })] })
    expect(armadorShownPrice(usd, null)?.currency).toBe('USD')
    expect(armadorFromPrice(usd, null)).toBeNull()
    const groups = armadoresGroups([usd], { ...ARMADORES_DEFAULT_STATE, precio: true })
    expect(groups.local.map(e => e.id)).toEqual(['usd'])
  })

  it('pasa la fecha de lectura de cada fuente a la página', () => {
    const payload = armadoresCompact({
      key: 'mvd',
      capturedAt: new Date('2026-11-12T18:05:00Z'),
      googleAt: '2026-11-10',
      editorialReviewedAt: '2026-11-11',
      sourcesAt: { facebook: '2026-11-09', mercadolibre: '2026-11-12' },
      entries: [],
      counts: {},
      notes: [],
    })
    expect(payload?.sourcesAt).toEqual({ facebook: '2026-11-09', mercadolibre: '2026-11-12' })
  })
})
