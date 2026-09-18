import { CarCatalogMetaModel } from '../models/CarCatalogMeta'
import { ChairCatalogMetaModel } from '../models/ChairCatalogMeta'
import { EquiparMetaModel } from '../models/EquiparMeta'
import { MovilidadMetaModel } from '../models/MovilidadMeta'
import { PhoneMetaModel } from '../models/PhoneMeta'
import { PhoneModelModel } from '../models/PhoneModel'
import { PropertySaleCatalogMetaModel } from '../models/PropertySaleCatalog'
import { RentalMetaModel } from '../models/RentalMeta'
import { StoreProfileModel } from '../models/StoreProfile'
import { connectDb } from '../utils/db'
import { CARD_PROGRAMS, CARD_REWARDS_LAST_REVIEWED } from '../../utils/cardRewards'
import { CASAS_LAST_RESEARCHED, CASAS_REPUTATION } from '../../utils/casasDirectory'
import { COURIERS, COURIER_RATES_VERIFIED_AT } from '../../utils/courierShipping'
import { DIRECTORIOS_CON_CIFRA, type DirectorioCifra } from '../../utils/directorios'
import { MOVILIDAD_META_KEY } from '../../utils/movilidad'
import {
  PHONE_LIST_PROJECTION,
  PHONE_META_KEY,
  phoneFreshFloor,
  phonePublishable,
  type PhoneModelDoc,
} from '../../utils/phones'

/**
 * Las cifras de `/directorios-uruguay`: una por directorio, cada una con la fecha de SU dato.
 *
 * Cada job guarda su meta con nombres distintos (`items`, `models`, `products`, `properties`,
 * `total`, `meta.listings`; `generatedAt` o `asOf`), así que hay un adaptador por directorio en vez
 * de una lectura genérica que tendría que adivinar el campo. Cada adaptador cuenta **lo que el
 * lector va a encontrar al hacer clic**, no lo que el job guardó: celulares sigue más de cien
 * modelos pero su página publica sólo los que tienen precio vigente, y la tarjeta dice ese número.
 *
 * Los tres directorios curados a mano (casas, couriers, tarjetas) no tocan la base: su cifra es el
 * largo de la misma lista que dibuja su página, y su fecha es la de la última revisión de esa lista.
 *
 * Cada adaptador corre en paralelo y falla solo: una meta ilegible deja esa tarjeta SIN número
 * (nunca un cero, ver `directorioCifra`) y no le quita la cifra a las demás. Si no se pudo leer
 * NINGUNA cifra relevada, la respuesta no se cachea: un Mongo caído un segundo no puede dejar el hub
 * sin números durante todo el `max-age`.
 */
export interface DirectoriosResponse {
  cifras: Record<string, DirectorioCifra>
}

type Adapter = () => Promise<DirectorioCifra | null>

/** `YYYY-MM-DD` de una fecha ISO guardada por un job, o `null` si no parece una fecha. */
function day(value: unknown): string | null {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  if (value instanceof Date && Number.isFinite(value.getTime()))
    return value.toISOString().slice(0, 10)
  return null
}

function cifra(count: unknown, asOf: unknown): DirectorioCifra {
  return {
    count: typeof count === 'number' && Number.isFinite(count) ? count : null,
    asOf: day(asOf),
  }
}

/** Los directorios que un job recalcula: una lectura a la base cada uno. */
const RELEVADOS: Readonly<Record<string, Adapter>> = {
  async alquileres() {
    const doc = (await RentalMetaModel.findOne({ key: 'uy-rentals' })
      .select({ properties: 1, generatedAt: 1 })
      .lean()) as { properties?: number; generatedAt?: string } | null
    return doc ? cifra(doc.properties, doc.generatedAt) : null
  },
  async ventas() {
    const doc = (await PropertySaleCatalogMetaModel.findOne({ key: 'uy-sales' })
      .select({ total: 1, generatedAt: 1 })
      .lean()) as { total?: number; generatedAt?: string } | null
    return doc ? cifra(doc.total, doc.generatedAt) : null
  },
  async autos() {
    const doc = (await CarCatalogMetaModel.findOne({ key: 'uy-cars' })
      .select({ 'meta.listings': 1, generatedAt: 1 })
      .lean()) as { meta?: { listings?: number }; generatedAt?: string } | null
    return doc ? cifra(doc.meta?.listings, doc.generatedAt) : null
  },
  async movilidad() {
    const doc = (await MovilidadMetaModel.findOne({ key: MOVILIDAD_META_KEY })
      .select({ items: 1, generatedAt: 1 })
      .lean()) as { items?: number; generatedAt?: string } | null
    return doc ? cifra(doc.items, doc.generatedAt) : null
  },
  async celulares() {
    // La misma regla que el hub de celulares (`phonePublishable`), no `PhoneMeta.models`: la
    // página dice "N modelos con precio" y esta tarjeta tiene que decir el mismo N.
    const today = new Date().toISOString().slice(0, 10)
    const [meta, rows] = await Promise.all([
      PhoneMetaModel.findOne({ key: PHONE_META_KEY }).select({ generatedAt: 1 }).lean(),
      PhoneModelModel.find({ lastSeen: { $gte: phoneFreshFloor(today) } })
        .select(PHONE_LIST_PROJECTION)
        .lean(),
    ])
    if (!meta) return null
    const publishable = ((rows ?? []) as unknown as PhoneModelDoc[]).filter(model =>
      phonePublishable(model, today)
    ).length
    return cifra(publishable, (meta as { generatedAt?: string }).generatedAt)
  },
  async sillas() {
    const doc = (await ChairCatalogMetaModel.findOne({ key: 'uy-desk-chairs' })
      .select({ products: 1, asOf: 1 })
      .lean()) as { products?: number; asOf?: string } | null
    return doc ? cifra(doc.products, doc.asOf) : null
  },
  async equipar() {
    const doc = (await EquiparMetaModel.findOne({ key: 'equipar-casa-uruguay' })
      .select({ items: 1, generatedAt: 1 })
      .lean()) as { items?: number; generatedAt?: string } | null
    return doc ? cifra(doc.items, doc.generatedAt) : null
  },
  async tiendas() {
    // Toda tienda del registro tiene su ficha (las que todavía no juntan tres señales frescas quedan
    // fuera del sitemap, no fuera del sitio), así que la cifra es el total de perfiles.
    const [count, latest] = await Promise.all([
      StoreProfileModel.countDocuments({}),
      StoreProfileModel.findOne({}).sort({ updatedAt: -1 }).select({ updatedAt: 1 }).lean(),
    ])
    return cifra(count, (latest as { updatedAt?: Date } | null)?.updatedAt)
  },
  async precios() {
    // La ruta del propio sitio, que ya está cacheada media hora: pedirle el catálogo entero al
    // backend otra vez sólo para contarlo sería el doble de tráfico por la misma cifra.
    const data = await $fetch<{ day?: string | null; count?: number }>('/api/precios', {
      timeout: 9000,
    })
    return data?.count ? cifra(data.count, data.day) : null
  },
}

/** Los directorios curados a mano: la cifra es el largo de la lista que dibuja su página. */
const CURADOS: Readonly<Record<string, DirectorioCifra>> = {
  casas: cifra(CASAS_REPUTATION.length, CASAS_LAST_RESEARCHED),
  couriers: cifra(COURIERS.length, COURIER_RATES_VERIFIED_AT),
  tarjetas: cifra(CARD_PROGRAMS.length, CARD_REWARDS_LAST_REVIEWED),
}

export default defineEventHandler(async (event): Promise<DirectoriosResponse> => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=900, s-maxage=900, stale-while-revalidate=86400'
  )

  const cifras: Record<string, DirectorioCifra> = {}
  for (const id of DIRECTORIOS_CON_CIFRA) if (CURADOS[id]) cifras[id] = CURADOS[id]!

  const relevados = DIRECTORIOS_CON_CIFRA.filter(id => RELEVADOS[id])
  let connected = true
  try {
    await connectDb()
  } catch {
    connected = false
  }

  const results = await Promise.all(
    relevados.map(async id => {
      // Precios no toca Mongo: se lee aunque la base esté caída.
      if (!connected && id !== 'precios') return [id, null] as const
      try {
        return [id, await RELEVADOS[id]!()] as const
      } catch {
        return [id, null] as const
      }
    })
  )

  let read = 0
  for (const [id, value] of results) {
    if (value) {
      cifras[id] = value
      read += 1
    }
  }

  if (relevados.length > 0 && read === 0) setResponseHeader(event, 'cache-control', 'no-store')
  return { cifras }
})
