// GET /api/bankos/brands?banco=itau  |  ?rubro=Farmacias
//
// La lectura por MARCA que sirven las páginas individuales de descuentos. Reusa el mismo catálogo
// cacheado (live primero, snapshot del backend si Bankos está caído) que /api/bankos/discounts, y
// toda la aritmética vive en utils/bankosBrands para que se pueda testear sin levantar Nitro.
//
// Por qué una ruta aparte y no `?banks=` de discounts: aquélla devuelve una fila por LOCAL con
// coordenadas (4.057 filas, ~2 MB para el catálogo entero) porque alimenta un mapa. Estas páginas
// son texto: 300 marcas con su cuenta de locales dicen lo mismo con dos órdenes de magnitud menos
// de payload, y ese payload viaja en el HTML del SSR.
import { getRawCatalog } from '../../utils/bankos'
import { BANKOS_BANKS } from '../../../utils/bankos'
import {
  reduceBrands,
  type BankosBrandsResult,
  type BrandsRawData,
} from '../../../utils/bankosBrands'
import { buildBrandPageIndex } from '../../../utils/bankosBrandPage'

const VALID_BANKS = new Set(BANKOS_BANKS.map(b => b.id))

export interface BankosBrandsResponse extends Omit<BankosBrandsResult, 'brands'> {
  /** Cada marca con el slug de su página, o null si no tiene (el 85 % del catálogo). */
  brands: Array<BankosBrandsResult['brands'][number] & { pageSlug: string | null }>
  source: 'live' | 'snapshot' | 'cache'
  generatedAt: string | null
  scope: { banco: string | null; rubro: string | null }
}

export default defineEventHandler(async (event): Promise<BankosBrandsResponse> => {
  const q = getQuery(event)
  const bancoRaw = String(q.banco ?? '')
    .trim()
    .toLowerCase()
  const banco = VALID_BANKS.has(bancoRaw) ? bancoRaw : null
  // El rubro llega tal cual lo escribe el catálogo ("Librerías y Papelerías"), porque el slug
  // bonito vive en utils/bankosPages y la traducción la hace la página. Acá sólo se acota el
  // largo: si no matchea ninguna categoría, la reducción devuelve cero marcas y la página lo dice.
  const rubro =
    String(q.rubro ?? '')
      .trim()
      .slice(0, 80) || null

  const { catalog, source } = await getRawCatalog()
  const raw = catalog.data as unknown as BrandsRawData
  const result = reduceBrands(raw, {
    bankIds: banco ? [banco] : undefined,
    category: rubro ?? undefined,
  })

  // El slug de la página de marca se calcula SIEMPRE sobre el catálogo completo, nunca sobre el
  // recorte que se está devolviendo. Es la parte que se rompe sola si no se cuida: tanto el corte
  // (>= 4 locales O >= 2 emisores) como el desempate de una colisión dependen del conjunto, así
  // que la misma marca vista desde la página de Itaú y desde la de Farmacias produciría dos slugs
  // distintos — y uno de los dos sería un enlace a un 404.
  const slugByBrand = new Map(
    buildBrandPageIndex(reduceBrands(raw, {}).brands).map(e => [e.brandId, e.slug])
  )
  const brands = result.brands.map(b => ({ ...b, pageSlug: slugByBrand.get(b.brandId) ?? null }))

  // Igual que /api/bankos/discounts: el catálogo se mueve ~una vez por día y la reducción es pura.
  setResponseHeader(event, 'Cache-Control', 'public, max-age=600, s-maxage=3600')

  return { ...result, brands, source, generatedAt: catalog.generatedAt, scope: { banco, rubro } }
})
