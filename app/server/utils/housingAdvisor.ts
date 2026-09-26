// La unión de los tres agregados que puntúa el asesor de vivienda (/donde-vivir-uruguay):
// zonas de alquiler, series de venta por barrio y el lugar de cada barrio entre los demás. Los tres
// se calculan una vez por día en otros jobs; acá sólo se leen, se unen y se guardan 10 minutos por
// departamento, tipo y dormitorios. Si la base falla, se sirve lo último bueno.
import {
  currentSaleCohorts,
  joinHousingZones,
  type HousingPowerStatus,
  type HousingSaleCohort,
  type HousingScoresInput,
  type HousingZone,
} from '../../utils/housingAdvisor'
import type { MarketSeriesIndex } from '../../utils/marketSeries'
import { MarketSeriesMetaModel, MarketSeriesModel } from '../models/MarketSeries'
import { connectDb } from './db'
import { loadPropertySalesMeta } from './propertySales'
import { loadRentalZoneScores } from './rentalZoneServices'
import { loadRentalZones } from './rentalZones'

const CACHE_MS = 600_000
/** Lo que se guarda si una parte faltó (datos de barrio o dólar): se reintenta pronto. */
const PARTIAL_CACHE_MS = 60_000
/** Tras una caída, cuánto se espera antes de volver a pedirle a la base. */
const RETRY_MS = 30_000

export interface HousingAdvisorData {
  /** Faltó una parte (datos de barrio o dólar): se sirve, pero se guarda poco. */
  partial: boolean
  generatedAt: string | null
  usdUyu: number
  zones: HousingZone[]
  power: HousingPowerStatus | null
}

const cache = new Map<string, { expires: number; data: HousingAdvisorData }>()
const failures = new Map<string, { until: number; error: unknown }>()
const loading = new Map<string, Promise<HousingAdvisorData>>()

const bedroomsBucket = (bedrooms: number): string => (bedrooms >= 4 ? '4plus' : String(bedrooms))

async function saleCohorts(
  department: string,
  type: string,
  bedrooms: number
): Promise<HousingSaleCohort[]> {
  await connectDb()
  const index = (await MarketSeriesMetaModel.findOne({ key: 'index:venta' })
    .select({ _id: 0, scopes: 1, day: 1 })
    .maxTimeMS(5_000)
    .lean()) as Pick<MarketSeriesIndex, 'scopes' | 'day'> | null
  const tokens = (index?.scopes ?? [])
    .filter(scope => scope.scope === 'neighborhood' && scope.department === department)
    .map(scope => scope.token)
  if (!tokens.length || !index?.day) return []
  const keys = tokens.map(token => `venta|USD|${type}|${bedroomsBucket(bedrooms)}|${token}`)
  const docs = await MarketSeriesModel.find({ key: { $in: keys } })
    .select({ _id: 0, key: 1, labels: 1, latest: 1 })
    .maxTimeMS(8_000)
    .lean()
  return currentSaleCohorts(docs as unknown as HousingSaleCohort[], index.day)
}

async function build(
  department: string,
  type: string,
  bedrooms: number
): Promise<HousingAdvisorData> {
  let partial = false
  const [rentZones, sales, scores, meta] = await Promise.all([
    loadRentalZones({ department, propertyType: type, bedrooms: bedroomsBucket(bedrooms) }),
    saleCohorts(department, type, bedrooms),
    loadRentalZoneScores().catch(() => {
      partial = true
      return null
    }),
    loadPropertySalesMeta().catch(() => null),
  ])
  // Sin dólar alquilar sigue andando; el endpoint corta comprar y comparar.
  const usdUyu = Number((meta as { usdUyu?: number } | null)?.usdUyu) || 0
  if (!(usdUyu > 0)) partial = true
  const power = scores?.periods?.power
  return {
    partial,
    generatedAt: rentZones.generatedAt ?? null,
    usdUyu,
    zones: joinHousingZones(
      rentZones.zones,
      sales,
      scores as HousingScoresInput | null,
      department
    ),
    power: power ? { status: power.status, observedDays: power.observedDays } : null,
  }
}

export async function loadHousingAdvisorData(
  department: string,
  type: string,
  bedrooms: number
): Promise<HousingAdvisorData> {
  const key = `${department}|${type}|${bedrooms}`
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) return cached.data
  // Recién caída y sin nada guardado: fallar ya, en vez de esperar los timeouts en cada pedido.
  const failure = failures.get(key)
  if (!cached && failure && failure.until > Date.now()) throw failure.error
  const pending = loading.get(key)
  if (pending) return pending
  const promise = build(department, type, bedrooms)
    .then(data => {
      if (cache.size > 200) cache.clear()
      failures.delete(key)
      cache.set(key, { data, expires: Date.now() + (data.partial ? PARTIAL_CACHE_MS : CACHE_MS) })
      return data
    })
    .catch(error => {
      if (failures.size > 200) failures.clear()
      failures.set(key, { until: Date.now() + RETRY_MS, error })
      // Con algo guardado se sirve eso, y no se vuelve a probar hasta dentro de un rato.
      if (cached) {
        cached.expires = Date.now() + RETRY_MS
        return cached.data
      }
      throw error
    })
    .finally(() => loading.delete(key))
  loading.set(key, promise)
  return promise
}
