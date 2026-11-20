// La foto de `rentalPublicStages` TAL COMO ES HOY, para que reescribirla no cambie ni un byte.
//
// `rentalPublicStages` (utils/rentals.ts) arma las etapas que deciden qué oferta de cada vivienda
// está vigente, y la usan trece rutas. La parte P6b del plan de la API rápida de alquileres la va a
// rearmar desde piezas exportadas (`rentalPublicStageParts`) y promete que la salida queda IDÉNTICA
// para todas esas rutas. Esa promesa se verifica acá: este archivo y su `.snap` se commitearon
// ANTES del refactor, con el código sin tocar, sobre una matriz de filtros armados por
// `buildRentalFilter` que pasa por cada campo de la consulta (tabla §2.1 del plan) con y sin avisos
// excluidos, más los filtros que arman a mano las otras rutas.
//
// La guarda del final es lo que hace que la foto no se pueda "arreglar" en silencio: un `vitest -u`
// que la reescriba deja el `.snap` con otro sha256, y la corrida siguiente (la de CI) falla hasta
// que alguien cambia `SNAPSHOT_SHA256` en ESTE archivo — que el PR del refactor no puede tocar, y
// cuya ausencia de su diff se muestra en el cuerpo de ese PR.
//
// Si la foto cambia por otra razón legítima (otra forma de un filtro de `buildRentalFilter`, una
// comodidad nueva en `rentalAmenities.ts`, una sede movida en `mutualistaSedes.ts`): `vitest -u`
// sobre este archivo, el sha256 nuevo en la constante, y las dos cosas en un PR que NO toque
// `rentalPublicStages`.
//
// Estable entre máquinas y corridas: el reloj está fijo (el corte de `lastSeen` sale de
// `Date.now()`), todo se calcula en UTC, no hay rutas absolutas en la foto, y el serializador de
// vitest ordena las claves. Como ordenar las claves esconde un reordenamiento, el orden de inserción
// se fotografía aparte (`keyOrder`) en los casos que tienen más claves, con y sin avisos excluidos.
// La hora fija esconde un corte mal calculado que caiga el mismo día; por eso el corte se fija
// además a cada lado de la medianoche UTC.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  RENTAL_STALE_DAYS,
  buildRentalFilter,
  normalizeRentalQuery,
  rentalPublicStages,
} from '../../utils/rentals'

/** sha256 del `.snap` con `\r\n` llevado a `\n` (el repo es `eol=lf`, así que CI lee LF). */
const SNAPSHOT_SHA256 = 'd1035f8a175f2db71a232ff008cd432f2108a0b54b20fda49c4b3c85bfa9c8ff'

const SNAP_FILE = join(__dirname, '__snapshots__', 'rentalPublicStagesSnapshot.test.ts.snap')

const NOW = new Date('2026-03-15T23:30:00.000Z')
const USD_UYU = 41.5
/** Avisos ocultos por la disponibilidad reportada, en la forma de `rentalAvailabilityAdvertId`. */
const EXCLUDED_ADVERTS = [
  'rent:mercadolibre:MLU900100',
  'rent:facebook:fb-aviso',
  'rent:elpais:ep-7',
]
/** El área oficial que `loadRentalServiceZoneIds` devolvería para `servicios`. */
const SERVICE_ZONES = ['montevideo:pocitos', 'montevideo:buceo']
/** Dos sedes reales de `MUTUALISTA_SEDES` (por id de OSM). */
const SEDE_A = '7120487210'
const SEDE_B = '11510019745'

type Filter = Record<string, unknown>
type BuiltFilter = ReturnType<typeof buildRentalFilter>

interface FilterCase {
  name: string
  /** La consulta cruda, como llega en la URL, o el filtro armado a mano por otra ruta. */
  build: () => Filter | BuiltFilter
}

const fromQuery =
  (
    input: Record<string, unknown>,
    { usdUyu = USD_UYU, zones }: { usdUyu?: number; zones?: readonly string[] | null } = {}
  ) =>
  (): BuiltFilter =>
    buildRentalFilter(normalizeRentalQuery(input), RENTAL_STALE_DAYS, usdUyu, zones)

const EVERYTHING: Record<string, unknown> = {
  availability: 'hide_multiple',
  q: 'pocitos (vista',
  department: 'montevideo',
  neighborhoods: 'Pocitos,Punta Carretas',
  sinBarrios: 'Centro',
  types: 'vivienda',
  sinTipos: 'habitacion',
  sinPortales: 'facebook,tiktok',
  sinPalabras: 'garaje,monoambiente',
  residencias: 'ocultar',
  dias: '7',
  bajo: '1',
  bedrooms: '2',
  bathrooms: '1',
  areaMin: '40',
  areaMax: '120',
  currency: 'UYU',
  priceMin: '15000',
  priceMax: '45000',
  monthlyMax: '50000',
  expensesMax: '8000',
  multi: '1',
  pets: '1',
  parking: '1',
  furnished: '1',
  plazo: 'anual',
  garantia: 'anda,aseguradora',
  comodidades: 'piscina,gimnasio',
  gc: '1',
  sinNoche: '1',
  dueno: '1',
  agency: 'infocasas:inmo-pocitos',
  servicios: 'denuncias:120,agua',
  sedes: `${SEDE_A},${SEDE_B}`,
  radio: '2',
  refLat: '-34.9058',
  refLng: '-56.1913',
  sort: 'precio',
  page: '3',
}

/**
 * Cada campo de la consulta por separado (tabla §2.1 del plan), los que no cambian el filtro
 * (disponibilidad, punto de referencia, orden) incluidos, una combinación de todos, y los filtros
 * que arman a mano las otras rutas que llaman a `rentalPublicStages`.
 */
const CASES: FilterCase[] = [
  { name: 'default', build: fromQuery({}) },
  { name: 'availability hide_any', build: fromQuery({ availability: 'hide_any' }) },
  { name: 'department', build: fromQuery({ department: 'Montevideo' }) },
  {
    name: 'department + neighborhood',
    build: fromQuery({ department: 'Montevideo', neighborhood: 'Pocitos' }),
  },
  { name: 'neighborhoods', build: fromQuery({ neighborhoods: 'Pocitos,Punta Carretas' }) },
  { name: 'sinBarrios', build: fromQuery({ sinBarrios: 'Centro,Cerro' }) },
  {
    name: 'sinBarrios + neighborhoods',
    build: fromQuery({ neighborhoods: 'Pocitos,Buceo', sinBarrios: 'Centro' }),
  },
  { name: 'type', build: fromQuery({ type: 'apartamento' }) },
  { name: 'types', build: fromQuery({ types: 'apartamento,casa' }) },
  { name: 'sinTipos', build: fromQuery({ sinTipos: 'habitacion,local' }) },
  { name: 'types - sinTipos', build: fromQuery({ types: 'vivienda', sinTipos: 'habitacion' }) },
  { name: 'bedrooms', build: fromQuery({ bedrooms: '2' }) },
  { name: 'bedrooms 0', build: fromQuery({ bedrooms: '0' }) },
  { name: 'bedrooms exact', build: fromQuery({ bedrooms: '3', bedroomsExact: '1' }) },
  { name: 'bathrooms', build: fromQuery({ bathrooms: '2' }) },
  { name: 'area range', build: fromQuery({ areaMin: '40', areaMax: '120' }) },
  { name: 'area min', build: fromQuery({ areaMin: '60' }) },
  { name: 'q', build: fromQuery({ q: 'pocitos (vista' }) },
  { name: 'sinPalabras', build: fromQuery({ sinPalabras: 'garaje,monoambiente' }) },
  {
    name: 'servicios',
    build: fromQuery({ servicios: 'denuncias:120,agua' }, { zones: SERVICE_ZONES }),
  },
  {
    name: 'servicios without snapshot',
    build: fromQuery({ servicios: 'luz' }, { zones: null }),
  },
  { name: 'servicios not applied', build: fromQuery({ servicios: 'luz' }) },
  { name: 'sede', build: fromQuery({ sedes: SEDE_A, radio: '2' }) },
  { name: 'sedes', build: fromQuery({ sedes: `${SEDE_A},${SEDE_B}` }) },
  {
    name: 'reference point, sort distancia',
    build: fromQuery({ refLat: '-34.9058', refLng: '-56.1913', sort: 'distancia' }),
  },
  { name: 'source', build: fromQuery({ source: 'mercadolibre' }) },
  { name: 'sinPortales', build: fromQuery({ sinPortales: 'facebook,tiktok' }) },
  { name: 'sinNoche', build: fromQuery({ sinNoche: '1' }) },
  { name: 'currency', build: fromQuery({ currency: 'USD' }) },
  { name: 'priceMin', build: fromQuery({ priceMin: '15000' }) },
  { name: 'priceMax', build: fromQuery({ priceMax: '30000' }) },
  { name: 'price range', build: fromQuery({ priceMin: '15000', priceMax: '30000' }) },
  { name: 'gc', build: fromQuery({ gc: '1' }) },
  { name: 'monthlyMax', build: fromQuery({ monthlyMax: '40000' }) },
  { name: 'monthlyMax without rate', build: fromQuery({ monthlyMax: '40000' }, { usdUyu: 0 }) },
  { name: 'expensesMax 0', build: fromQuery({ expensesMax: '0' }) },
  { name: 'dueno', build: fromQuery({ dueno: '1' }) },
  { name: 'agency', build: fromQuery({ agency: 'infocasas:inmo-pocitos' }) },
  { name: 'pets', build: fromQuery({ pets: '1' }) },
  { name: 'parking', build: fromQuery({ parking: '1' }) },
  { name: 'furnished', build: fromQuery({ furnished: '1' }) },
  { name: 'sinMuebles', build: fromQuery({ sinMuebles: '1' }) },
  { name: 'plazo invernal', build: fromQuery({ plazo: 'invernal' }) },
  { name: 'plazo anual', build: fromQuery({ plazo: 'anual' }) },
  { name: 'garantia', build: fromQuery({ garantia: 'anda,contaduria' }) },
  { name: 'multi', build: fromQuery({ multi: '1' }) },
  { name: 'dias', build: fromQuery({ dias: '7' }) },
  { name: 'bajo', build: fromQuery({ bajo: '1' }) },
  { name: 'residencias ocultar', build: fromQuery({ residencias: 'ocultar' }) },
  { name: 'residencias solo', build: fromQuery({ residencias: 'solo' }) },
  { name: 'comodidades', build: fromQuery({ comodidades: 'piscina,gimnasio' }) },
  { name: 'sort total', build: fromQuery({ gc: '1', sort: 'total' }) },
  { name: 'sort precio-m2', build: fromQuery({ sort: 'precio-m2' }) },
  { name: 'everything', build: fromQuery(EVERYTHING, { zones: SERVICE_ZONES }) },
  {
    name: 'map located box',
    build: () => ({
      ...fromQuery({ department: 'Montevideo', bedrooms: '2' })().filter,
      latitude: { $type: 'number', $gte: -35.5, $lte: -30 },
      longitude: { $type: 'number', $gte: -58.6, $lte: -53 },
    }),
  },
  { name: 'hand-built: empty', build: () => ({}) },
  { name: 'hand-built: key list', build: () => ({ key: { $in: ['casa-pocitos', 'apto-buceo'] } }) },
  {
    name: 'hand-built: offers dotted path',
    build: () => ({ 'offers.agency.key': 'infocasas:inmo-pocitos' }),
  },
  {
    name: 'hand-built: rooms under a price',
    build: () => ({ propertyType: 'habitacion', priceUyu: { $lte: 25000 } }),
  },
  {
    name: 'hand-built: every derived key',
    build: () => ({
      key: { $ne: 'casa-pocitos' },
      offers: { $elemMatch: { source: 'infocasas' } },
      'offers.listingId': { $in: ['infocasas:uno', 'infocasas:dos'] },
      sources: 'infocasas',
      'sources.1': { $exists: true },
      petsAllowed: true,
      furnished: false,
      terms: 'invernal',
      parkingSpaces: { $gte: 1 },
      guarantees: { $in: ['anda'] },
      priceUyu: { $lte: 30000 },
      $expr: { $gt: [{ $size: '$offers' }, 0] },
      freshAt: { $gte: '2026-03-01' },
      'priceDrop.at': { $gte: '2026-02-13' },
      lastSeen: { $gte: '2026-03-05' },
    }),
  },
]

const isBuilt = (value: Filter | BuiltFilter): value is BuiltFilter =>
  'filter' in value && 'nonLocation' in value && 'withoutNeighborhood' in value

/** Las claves de cada objeto en orden de inserción (si tiene dos o más), ruta por ruta. */
function keyOrder(value: unknown, path = '$', out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((item, index) => keyOrder(item, `${path}[${index}]`, out))
  else if (value && typeof value === 'object' && !(value instanceof RegExp)) {
    const keys = Object.keys(value)
    if (keys.length > 1) out.push(`${path}: ${keys.join(', ')}`)
    for (const key of keys) keyOrder((value as Filter)[key], `${path}.${key}`, out)
  }
  return out
}

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})
afterAll(() => {
  vi.useRealTimers()
})

describe('rentalPublicStages: the stages every filter shares', () => {
  // Las etapas 2 a 5 (ofertas vigentes, "tiene alguna", campos derivados, precio del titular) no
  // dependen del filtro: se fotografían una vez por (staleDays, avisos excluidos), y cada caso de
  // abajo se compara contra ellas con igualdad estricta.
  it('without excluded adverts', () => {
    const stages = rentalPublicStages({}, RENTAL_STALE_DAYS)
    expect(stages).toHaveLength(6)
    expect(rentalPublicStages({}, RENTAL_STALE_DAYS, [])).toStrictEqual(stages)
    expect(stages.slice(1, 5)).toMatchSnapshot()
  })

  it('with excluded adverts', () => {
    const stages = rentalPublicStages({}, RENTAL_STALE_DAYS, EXCLUDED_ADVERTS)
    expect(stages).toHaveLength(6)
    expect(stages.slice(1, 5)).toMatchSnapshot()
  })

  it('one excluded advert', () => {
    const stages = rentalPublicStages({}, RENTAL_STALE_DAYS, EXCLUDED_ADVERTS.slice(0, 1))
    expect(stages[1]).toMatchSnapshot()
  })

  it('another staleDays moves only the cutoff', () => {
    const plain = rentalPublicStages({}, 4)
    const excluded = rentalPublicStages({}, 4, EXCLUDED_ADVERTS)
    expect([plain[1], excluded[1]]).toMatchSnapshot()
    expect(plain.slice(2)).toStrictEqual(rentalPublicStages({}, RENTAL_STALE_DAYS).slice(2))
    expect(excluded.slice(2)).toStrictEqual(
      rentalPublicStages({}, RENTAL_STALE_DAYS, EXCLUDED_ADVERTS).slice(2)
    )
  })

  it('the cutoff is the UTC date of now minus staleDays, on both sides of UTC midnight', () => {
    // El único reloj de `rentalPublicStages` es el corte de `lastSeen`. A las 23:30 de `NOW` un corte
    // corrido unas horas (en hora de Montevideo, con un día que no mide 86.400.000 ms, con un
    // redondeo) da la misma fecha y pasaría; un milisegundo antes y uno después de la medianoche UTC,
    // cualquier corrimiento de 1 ms o más en cualquier dirección cambia la fecha en uno de los dos.
    const cutoffs = (stage: unknown) => [
      ...new Set(JSON.stringify(stage).match(/\d{4}-\d{2}-\d{2}/g) ?? []),
    ]
    const expected: Record<string, Record<number, string>> = {
      '2026-03-15T23:59:59.999Z': { [RENTAL_STALE_DAYS]: '2026-03-05', 4: '2026-03-11' },
      '2026-03-16T00:00:00.000Z': { [RENTAL_STALE_DAYS]: '2026-03-06', 4: '2026-03-12' },
    }
    const atNow = {
      plain: rentalPublicStages({}, RENTAL_STALE_DAYS)[1],
      excluded: rentalPublicStages({}, RENTAL_STALE_DAYS, EXCLUDED_ADVERTS)[1],
    }
    const nowCutoff = cutoffs(atNow.plain)
    expect(nowCutoff).toStrictEqual(['2026-03-05'])
    const pinned: Record<string, string[]> = {}
    try {
      for (const [instant, byStaleDays] of Object.entries(expected)) {
        vi.setSystemTime(new Date(instant))
        for (const staleDays of [RENTAL_STALE_DAYS, 4]) {
          for (const [variant, excluded] of [
            ['plain', undefined],
            ['excluded', EXCLUDED_ADVERTS],
          ] as const) {
            const stage = rentalPublicStages({}, staleDays, excluded)[1]
            const dates = cutoffs(stage)
            expect(dates).toStrictEqual([byStaleDays[staleDays]])
            // Fuera de la fecha, la etapa es la misma que a la hora de `NOW`.
            expect(stage).toStrictEqual(
              JSON.parse(
                JSON.stringify(atNow[variant]).replaceAll(
                  `"${nowCutoff[0]}"`,
                  `"${byStaleDays[staleDays]}"`
                )
              )
            )
            pinned[`${instant} staleDays ${staleDays} ${variant}`] = dates
          }
        }
      }
    } finally {
      vi.setSystemTime(NOW)
    }
    expect(pinned).toMatchSnapshot()
  })

  it('does not keep a reference to the caller’s excluded list', () => {
    const list = [...EXCLUDED_ADVERTS]
    const stages = rentalPublicStages({}, RENTAL_STALE_DAYS, list)
    list.push('rent:infocasas:otro')
    expect(stages).toStrictEqual(rentalPublicStages({}, RENTAL_STALE_DAYS, EXCLUDED_ADVERTS))
  })
})

describe('rentalPublicStages: prefilter and final match, filter by filter', () => {
  const middle = () => rentalPublicStages({}, RENTAL_STALE_DAYS).slice(1, 5)
  const middleExcluded = () =>
    rentalPublicStages({}, RENTAL_STALE_DAYS, EXCLUDED_ADVERTS).slice(1, 5)

  for (const { name, build } of CASES) {
    it(name, () => {
      const built = build()
      const variants: Record<string, Filter> = isBuilt(built)
        ? {
            filter: built.filter,
            nonLocation: built.nonLocation,
            withoutNeighborhood: built.withoutNeighborhood,
          }
        : { filter: built }
      // Por variante: qué claves conserva el prefiltro indexado (fotografiadas), que las conserva
      // con los mismos valores que pasó quien llama, y que la etapa final es el filtro de quien llama
      // sin cambios. El filtro entero se fotografía una vez, el de la variante `filter`: las otras
      // dos son subconjuntos suyos.
      const pinned: Record<string, { prefilterKeys: string[]; match?: unknown }> = {}
      for (const [variant, filter] of Object.entries(variants)) {
        const plain = rentalPublicStages(filter, RENTAL_STALE_DAYS)
        const excluded = rentalPublicStages(filter, RENTAL_STALE_DAYS, EXCLUDED_ADVERTS)
        expect(plain).toHaveLength(6)
        expect(excluded).toHaveLength(6)
        expect(plain.slice(1, 5)).toStrictEqual(middle())
        expect(excluded.slice(1, 5)).toStrictEqual(middleExcluded())
        expect(excluded[0]).toStrictEqual(plain[0])
        expect(excluded[5]).toStrictEqual(plain[5])
        const prefilter = (plain[0] as { $match: Filter }).$match
        const prefilterKeys = Object.keys(prefilter)
        expect(plain[0]).toStrictEqual({
          $match: Object.fromEntries(prefilterKeys.map(key => [key, filter[key]])),
        })
        expect(plain[5]).toStrictEqual({ $match: filter })
        pinned[variant] =
          variant === 'filter' ? { prefilterKeys, match: plain[5] } : { prefilterKeys }
      }
      expect(pinned).toMatchSnapshot()
    })
  }
})

describe('rentalPublicStages: key insertion order', () => {
  // El serializador de la foto ordena las claves; Mongo las respeta en el orden dado (`$set` escribe
  // los campos en ese orden). Estos casos son los que más claves llevan de la matriz, y el camino sin
  // avisos excluidos, que es el de la mayoría de las rutas, va aparte porque arma otra etapa 2.
  it('everything, without excluded adverts', () => {
    const { filter } = fromQuery(EVERYTHING, { zones: SERVICE_ZONES })()
    expect(keyOrder(rentalPublicStages(filter, RENTAL_STALE_DAYS))).toMatchSnapshot()
  })

  it('everything, with excluded adverts', () => {
    const { filter } = fromQuery(EVERYTHING, { zones: SERVICE_ZONES })()
    expect(
      keyOrder(rentalPublicStages(filter, RENTAL_STALE_DAYS, EXCLUDED_ADVERTS))
    ).toMatchSnapshot()
  })

  it('hand-built: every derived key', () => {
    const filter = CASES.find(c => c.name === 'hand-built: every derived key')!.build() as Filter
    expect(keyOrder(rentalPublicStages(filter, RENTAL_STALE_DAYS))).toMatchSnapshot()
  })
})

describe('the snapshot itself is guarded', () => {
  it('its sha256 is the one committed with it', () => {
    const snap = readFileSync(SNAP_FILE, 'utf8').replace(/\r\n/g, '\n')
    expect(createHash('sha256').update(snap).digest('hex')).toBe(SNAPSHOT_SHA256)
  })
})
