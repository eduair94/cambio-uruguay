// GET /api/bankos/marca/farmashop
//
// Todo lo que necesita la página de UNA marca, en una sola lectura: qué emisores la descuentan y
// con qué texto, dónde están sus locales, y qué otras marcas del mismo rubro puede mirar quien no
// tiene ninguna de esas tarjetas.
//
// Reusa el mismo catálogo cacheado que /api/bankos/discounts y /api/bankos/brands (live primero,
// snapshot del backend si Bankos está caído), y el corte de qué marcas TIENEN página vive en
// utils/bankosBrandPage, compartido con el sitemap y con los tests: una sola definición, o el
// sitemap termina declarando URLs que contestan 404.
//
// Las coordenadas viajan sólo para esta marca — Farmashop son 96 puntos, no los 4.304 del mapa
// general — así que el payload alcanza para dibujar su mapa sin traer el catálogo entero.
import { getRawCatalog } from '../../../utils/bankos'
import { BANKOS_BANK_BY_ID } from '../../../../utils/bankos'
import { reduceBrands, type BrandsRawData } from '../../../../utils/bankosBrands'
import {
  buildBrandPageIndex,
  findBrandBySlug,
  brandPageRationale,
  type BrandPageEntry,
} from '../../../../utils/bankosBrandPage'

export interface BrandOfferDetail {
  bankId: string
  bankName: string
  color: string
  /** El texto del emisor, sin tocar. Null cuando no publica beneficio para ese medio de pago. */
  credit: string | null
  debit: string | null
  /** Días ISO (1 = lunes … 7 = domingo), o null si el catálogo no declara ninguno. */
  days: number[] | null
}

export interface BrandLocation {
  locationId: string
  lat: number
  lng: number
  rating: number | null
}

export interface BrandSibling {
  slug: string
  name: string
  locations: number
  issuers: number
}

export interface BankosBrandDetail {
  slug: string
  brandId: string
  name: string
  categories: string[]
  locations: number
  rationale: string
  offers: BrandOfferDetail[]
  points: BrandLocation[]
  /** Otras marcas con página del mismo rubro, para que la página no sea un callejón sin salida. */
  siblings: BrandSibling[]
  source: 'live' | 'snapshot' | 'cache'
  generatedAt: string | null
}

const MAX_POINTS = 400
const MAX_SIBLINGS = 12

export default defineEventHandler(async (event): Promise<BankosBrandDetail> => {
  const slug = String(getRouterParam(event, 'slug') || '')
    .trim()
    .toLowerCase()
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Falta la marca' })

  const { catalog, source } = await getRawCatalog()
  const raw = catalog.data as unknown as BrandsRawData
  const reduced = reduceBrands(raw, {})
  const index = buildBrandPageIndex(reduced.brands)
  const entry = findBrandBySlug(index, slug)
  // 404 y no una página vacía: una marca que cae del catálogo tiene que dejar de existir como URL,
  // no quedar como una ficha sin datos que Google siga indexando.
  if (!entry)
    throw createError({ statusCode: 404, statusMessage: 'Marca sin descuentos publicados' })

  const row = reduced.brands.find(b => b.brandId === entry.brandId)!

  const offers: BrandOfferDetail[] = row.offers
    .map(offer => {
      const bank = BANKOS_BANK_BY_ID[offer.bankId]
      const creditTier = offer.credit >= 0 ? reduced.tiers[offer.credit] : null
      const debitTier = offer.debit >= 0 ? reduced.tiers[offer.debit] : null
      return {
        bankId: offer.bankId,
        bankName: bank?.name || offer.bankId,
        color: bank?.color || '#666666',
        credit: creditTier?.text ?? null,
        debit: debitTier?.text ?? null,
        days: offer.days,
      }
    })
    // Con débito primero cuando existe: es el beneficio que menos emisores dan y el que la gente
    // no espera. Después por nombre, para que el orden no dependa del catálogo.
    .sort(
      (a, b) => Number(!!b.debit) - Number(!!a.debit) || a.bankName.localeCompare(b.bankName, 'es')
    )

  const locationIds = raw.brandLocations?.[entry.brandId] || []
  const points: BrandLocation[] = []
  for (const id of locationIds.slice(0, MAX_POINTS)) {
    // Misma forma que lee flattenForBanks: `locations[id].location.coordinates` = [lng, lat].
    const point = (raw as any).locations?.[id]
    const coords = point?.location?.coordinates
    if (!Array.isArray(coords) || coords.length !== 2) continue
    const [lng, lat] = coords
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    points.push({
      locationId: id,
      lat: Number(lat),
      lng: Number(lng),
      rating: Number.isFinite(point?.rating) && point.rating > 0 ? Number(point.rating) : null,
    })
  }

  const category = entry.categories[0] || null
  const siblings: BrandSibling[] = category
    ? index
        .filter(e => e.slug !== entry.slug && e.categories.includes(category))
        .slice(0, MAX_SIBLINGS)
        .map(e => ({ slug: e.slug, name: e.name, locations: e.locations, issuers: e.issuers }))
    : []

  setResponseHeader(event, 'Cache-Control', 'public, max-age=600, s-maxage=3600')

  return {
    slug: entry.slug,
    brandId: entry.brandId,
    name: entry.name,
    categories: entry.categories,
    locations: entry.locations,
    rationale: brandPageRationale(entry as BrandPageEntry),
    offers,
    points,
    siblings,
    source,
    generatedAt: catalog.generatedAt,
  }
})
