// GET /api/bankos/cerca?lat=-34.9&lng=-56.16&cards=itau_debit&r=40
//
// La respuesta a "estoy parado acá, ¿tengo descuento?". Devuelve SÓLO las marcas dentro del radio,
// no el catálogo.
//
// Por qué no alcanza con /api/bankos/discounts: aquélla devuelve todos los locales de las tarjetas
// elegidas para poder dibujar un mapa — con dos o tres tarjetas son miles de filas y megabytes. Acá
// el visitante está parado en un lugar y la respuesta útil son dos o tres marcas: el filtro por
// distancia va del lado del servidor y lo que viaja es del orden de unos kilobytes.
//
// El radio se acota a 1 km: más que eso ya no es "acá" y devolvería la mitad de Montevideo.
import { getRawCatalog, flattenForCards } from '../../utils/bankos'
import { BANKOS_CARDS } from '../../../utils/bankos'
import { buildBrandPageIndex } from '../../../utils/bankosBrandPage'
import { reduceBrands, type BrandsRawData } from '../../../utils/bankosBrands'
import { nearbyBrands, type NearbyBrand, type NearbyPoint } from '../../../utils/bankosNearby'

const VALID_CARDS = new Set(BANKOS_CARDS.map(c => c.id))
const MAX_RADIUS_M = 1000
const DEFAULT_RADIUS_M = 40
const MAX_BRANDS = 25

export interface BankosNearbyResponse {
  lat: number
  lng: number
  radiusM: number
  brands: NearbyBrand[]
  /** Marcas dentro del radio en total, antes del recorte. */
  found: number
  source: 'live' | 'snapshot' | 'cache'
  generatedAt: string | null
}

export default defineEventHandler(async (event): Promise<BankosNearbyResponse> => {
  const q = getQuery(event)
  const lat = Number(q.lat)
  const lng = Number(q.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw createError({ statusCode: 400, statusMessage: 'Coordenada inválida' })
  }
  const radiusM = Math.min(MAX_RADIUS_M, Math.max(10, Number(q.r) || DEFAULT_RADIUS_M))

  const cards = [
    ...new Set(
      String(q.cards ?? '')
        .trim()
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(c => VALID_CARDS.has(c))
    ),
  ]
  if (!cards.length) {
    return { lat, lng, radiusM, brands: [], found: 0, source: 'cache', generatedAt: null }
  }

  const { catalog, source } = await getRawCatalog()
  // `flattenForCards` ya deja sólo los locales donde alguna de SUS tarjetas sirve, y marca con
  // cuál — así el veredicto no le muestra el texto de crédito a quien tiene la de débito.
  const points = flattenForCards(catalog.data, cards) as unknown as NearbyPoint[]
  const all = nearbyBrands(points, lat, lng, radiusM)

  // El slug de la página de marca se resuelve acá, sobre el catálogo COMPLETO. Adivinarlo del
  // nombre en la pantalla daría un enlace a un 404 para el 85 % de las marcas, que no tienen
  // página. Sólo se calcula el índice si hay algo cerca: es una reducción del catálogo entero.
  if (all.length) {
    const slugByBrand = new Map(
      buildBrandPageIndex(reduceBrands(catalog.data as unknown as BrandsRawData, {}).brands).map(
        e => [e.brandId, e.slug]
      )
    )
    for (const brand of all) brand.pageSlug = slugByBrand.get(brand.brandId) ?? null
  }

  // Privado y sin caché de borde: la respuesta depende de dónde está parado el visitante.
  setResponseHeader(event, 'Cache-Control', 'private, no-store')

  return {
    lat,
    lng,
    radiusM,
    brands: all.slice(0, MAX_BRANDS),
    found: all.length,
    source,
    generatedAt: catalog.generatedAt,
  }
})
