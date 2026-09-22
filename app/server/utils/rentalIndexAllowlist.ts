import {
  rentalIndexAllowlistFrom,
  type RentalIndexAllowlist,
  type RentalIndexAllowlistDoc,
} from '../../utils/rentalIndexHygiene'
import { SeoIndexAllowlistModel } from '../models/SeoIndexAllowlist'
import { connectDb } from './db'

/** La lista se relee una vez por hora por proceso: el job que la escribe es diario. */
const CACHE_MS = 60 * 60 * 1000
export const RENTAL_INDEX_FAMILY = 'alquileres'

type FindAllowlist = (family: string) => Promise<Partial<RentalIndexAllowlistDoc> | null>

/**
 * Lector con memo en proceso, calcado del de cobertura (`rentalCoverage.ts`): una lectura por TTL,
 * pedidos concurrentes comparten la misma promesa, y un documento ausente o una lectura fallida
 * valen `null` — que del lado de `rentalListingIndexable` significa "sin cambio", nunca "noindex".
 * También se memoriza el `null`: sin eso, un sitio sin documento pegaría a Mongo en cada ficha.
 */
export function createRentalIndexAllowlistReader(find: FindAllowlist, cacheMs = CACHE_MS) {
  let cached: { expires: number; value: RentalIndexAllowlist | null } | null = null
  let pending: Promise<RentalIndexAllowlist | null> | null = null

  return (now: number = Date.now()): Promise<RentalIndexAllowlist | null> => {
    if (cached && cached.expires > now) return Promise.resolve(cached.value)
    if (pending) return pending
    pending = Promise.resolve()
      .then(() => find(RENTAL_INDEX_FAMILY))
      .then(doc => rentalIndexAllowlistFrom(doc, now))
      .catch(error => {
        console.error('[rentals] index allowlist unavailable', error)
        return null
      })
      .then(value => {
        cached = { expires: now + cacheMs, value }
        return value
      })
      .finally(() => {
        pending = null
      })
    return pending
  }
}

export const loadRentalIndexAllowlist = createRentalIndexAllowlistReader(async family => {
  await connectDb()
  return SeoIndexAllowlistModel.findOne({ family })
    .select({ _id: 0, __v: 0 })
    .lean<RentalIndexAllowlistDoc>()
})
