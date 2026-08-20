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

const VALID_BANKS = new Set(BANKOS_BANKS.map(b => b.id))

export interface BankosBrandsResponse extends BankosBrandsResult {
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
  const result = reduceBrands(catalog.data as unknown as BrandsRawData, {
    bankIds: banco ? [banco] : undefined,
    category: rubro ?? undefined,
  })

  // Igual que /api/bankos/discounts: el catálogo se mueve ~una vez por día y la reducción es pura.
  setResponseHeader(event, 'Cache-Control', 'public, max-age=600, s-maxage=3600')

  return { ...result, source, generatedAt: catalog.generatedAt, scope: { banco, rubro } }
})
