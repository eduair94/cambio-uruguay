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

export interface HousingAdvisorData {
  generatedAt: string | null
  usdUyu: number
  zones: HousingZone[]
  power: HousingPowerStatus | null
}

const cache = new Map<string, { expires: number; data: HousingAdvisorData }>()
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
  const [rentZones, sales, scores, meta] = await Promise.all([
    loadRentalZones({ department, propertyType: type, bedrooms: bedroomsBucket(bedrooms) }),
    saleCohorts(department, type, bedrooms),
    loadRentalZoneScores().catch(() => null),
    loadPropertySalesMeta().catch(() => null),
  ])
  const usdUyu = Number((meta as { usdUyu?: number } | null)?.usdUyu) || 0
  if (!(usdUyu > 0)) throw new Error('HOUSING_ADVISOR_NO_RATE')
  const power = scores?.periods?.power
  return {
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
  const pending = loading.get(key)
  if (pending) return pending
  const promise = build(department, type, bedrooms)
    .then(data => {
      if (cache.size > 200) cache.clear()
      cache.set(key, { data, expires: Date.now() + CACHE_MS })
      return data
    })
    .catch(error => {
      if (cached) return cached.data
      throw error
    })
    .finally(() => loading.delete(key))
  loading.set(key, promise)
  return promise
}
