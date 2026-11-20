/* eslint-disable no-control-regex -- Public URLs and metadata must reject invisible controls. */
import { DYNAMIC_ROUTE_KEYS, EXCLUDED_ROUTES, navRoutes, UNLISTED_ROUTES } from './siteNav'

export const SHARED_LINK_ORIGIN = 'https://cambio-uruguay.com'
export const SHARED_LINK_MAX_PATH = 4096
export const SHARED_LINK_TITLE_LENGTH = 140
export const SHARED_LINK_DESCRIPTION_LENGTH = 240

export interface SharedLinkResponse {
  id: string
  url: string
  path: string
  title: string
  description: string
}

export function isSharedLinkId(input: unknown): input is string {
  return typeof input === 'string' && /^[\w-]{12}$/.test(input)
}

/** Metadata is text, never HTML. Strip control/bidi characters before truncating. */
export function normalizeShareText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[<>\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

// Public `noindex` pages that exist to be shared. EXCLUDED_ROUTES keeps them out of the menu and
// the sitemap, but it also lists truly private pages (/cuenta), so it cannot mean "do not share".
const SHAREABLE_EXCLUDED: ReadonlySet<string> = new Set(['/autos-usados-uruguay/comparar'])
const staticRoutes = new Set([
  '/',
  ...navRoutes(),
  ...UNLISTED_ROUTES.map(route => route.to),
  ...SHAREABLE_EXCLUDED,
])
const dynamicRoutes = Object.keys(DYNAMIC_ROUTE_KEYS).map(route => {
  const parts = route.split('/').filter(part => part !== 'index')
  return new RegExp(
    '^' +
      parts
        .map(part =>
          part.startsWith('[[')
            ? '(?:/[^/]+)?'
            : part.startsWith('[')
              ? '/[^/]+'
              : '/' + part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        )
        .join('') +
      '$'
  )
})
const privateRoutes = [
  ...EXCLUDED_ROUTES.filter(route => !SHAREABLE_EXCLUDED.has(route)),
  '/mi-lista',
]
const keys = (value: string) => new Set(value.split(' '))
const carFilters = keys(
  'q brand model yearMin yearMax kmMax l100Max priceMin priceMax fuel transmission body doors color department seller source priceDrop opportunity noRisk sinceDays sort page tier category measured'
)
const rentalFilters = keys(
  'availability q department departamento neighborhood neighborhoods type types source bedrooms bedroomsExact bathrooms areaMin areaMax currency priceMin priceMax monthlyMax expensesMax multi pets parking furnished garantia guarantees comodidades amenities gc withExpenses dueno owner agency servicios sedes radio radioKm sort page perPage view'
)
const propertyFilters = keys(
  'q department locality neighborhood type source bedrooms bathrooms minPrice maxPrice currency minArea maxArea areaBasis parking furnished amenity seller agency dueno owner photos recent sort page perPage view keys'
)
const retailFilters = keys(
  'categoria variante condicion fuente vendedor marca precioMin precioMax q orden page'
)
const queryKeys: Record<string, Set<string>> = {
  '/': keys('from to amount dir house canal dep'),
  '/autos-usados-uruguay': carFilters,
  '/oportunidades-autos-usados-uruguay': carFilters,
  '/autos-chocados-y-con-deuda-uruguay': carFilters,
  '/autos-usados-uruguay/comparar': keys('autos'),
  '/motos-usadas-uruguay': keys(
    'marca modelo cilindrada tipo combustible departamento vendedor precioMaxUsd anioDesde anioHasta sort page'
  ),
  '/alquileres-uruguay': rentalFilters,
  '/venta-viviendas-uruguay': propertyFilters,
  '/oportunidades-inmobiliarias-uruguay': keys(
    'availability operation department neighborhood type bedrooms maxPrice confidence evidence signal sort page perPage mode band basis agency dueno owner'
  ),
  '/analisis-alquileres-uruguay': keys('department neighborhood type bedrooms currency'),
  '/comparar': keys('moneda casas tipo rango'),
  '/avanzado': keys(
    'currency currency_with amount wantTo location date notInterBank notConditional exchangeHouses'
  ),
  '/buscar': keys('q'),
  '/sucursales': keys('location search'),
  '/mapa': keys('cash'),
  '/pizarra': keys('c'),
  '/newsletter/archivo': keys('p'),
  '/cuanto-vale-mi-auto-uruguay': keys('marca modelo anio km version'),
  '/que-auto-comprar-uruguay': keys(
    'presupuesto uso km personas caja combustible carroceria prioridad gastoMes'
  ),
  '/descuentos-con-tarjeta-uruguay': keys('banco categoria tipo'),
  '/monopatines-electricos-uruguay': retailFilters,
  '/bicicletas-electricas-uruguay': retailFilters,
  '/herramientas/calculadora-impuestos-importacion': keys('tipo'),
  '/celulares-uruguay': keys('marca precioMax'),
  '/sillas-escritorio-uruguay/precios': keys('q marca categoria condicion precioMax rating orden'),
  '/apps-utiles-uruguay': keys('categoria tipo plataforma depto orden q'),
  '/precios-de-supermercado-uruguay': keys('q rubro orden dir muestra depto'),
  '/fletes-mudanzas-uruguay': keys('servicio departamento q precios camion local orden'),
  '/inmobiliarias-uruguay': keys('q department operation page perPage'),
  '/mercado-it-uruguay': keys('q s k t ia ev desde hasta orden p'),
  '/casas-de-cambio': keys('orden tipo dep'),
  '/evolucion-precio-autos-usados-uruguay': keys('moneda zona tipo dormitorios modelo anio'),
  '/evolucion-precio-alquileres-uruguay': keys('moneda zona tipo dormitorios modelo anio'),
  '/evolucion-precio-viviendas-uruguay': keys('moneda zona tipo dormitorios modelo anio'),
  '/conviene-auto-moto-o-omnibus-uruguay': keys('km d v h f n t p ph c dep rob llu'),
}

function allowedQueryKeys(path: string): Set<string> | undefined {
  if (
    path === '/equipar-casa-uruguay/productos' ||
    path.startsWith('/equipar-casa-uruguay/productos/')
  )
    return retailFilters
  if (path === '/historico' || path.startsWith('/historico/'))
    return keys('currency type period origin')
  if (path.startsWith('/precio/')) return keys('depto local viejos ofertas orden dir')
  if (path.startsWith('/casas-de-cambio/')) return keys('orden tipo dep')
  if (path.startsWith('/autos-usados-uruguay/precios/'))
    return keys('moneda zona tipo dormitorios modelo anio')
  return queryKeys[path]
}

/**
 * Public routes only, with explicit per-page public filters. Credentials, personal location,
 * unknown parameters and fragments never enter durable links. No URL is fetched here.
 */
export function normalizeSharePath(input: unknown): string | null {
  if (typeof input !== 'string' || !input || input.length > SHARED_LINK_MAX_PATH) return null
  if (/[\\\u0000-\u001F\u007F]/.test(input)) return null
  const rawPath = input.split(/[?#]/)[0]!
  // Reject ambiguous paths before URL() resolves dot segments or encoded separators.
  if (/%(?:2f|5c|25|00)/i.test(rawPath) || /(?:^|\/)(?:\.|%2e){1,2}(?:\/|$)/i.test(rawPath))
    return null
  if (!input.startsWith('/') && !input.startsWith(`${SHARED_LINK_ORIGIN}/`)) return null
  if (input.startsWith('//')) return null
  let url: URL
  try {
    url = new URL(input, SHARED_LINK_ORIGIN)
    if (url.origin !== SHARED_LINK_ORIGIN || url.username || url.password) return null
    decodeURIComponent(url.pathname)
  } catch {
    return null
  }
  const pathname = url.pathname.replace(/\/+$/, '') || '/'
  if (/\/\//.test(pathname)) return null
  const path = pathname.replace(/^\/(?:en|pt|es)(?=\/|$)/, '') || '/'
  if (path === '/s' || path.startsWith('/s/'))
    return isSharedLinkId(path.slice(3)) ? pathname : null
  if (/(?:^|\/)(?:api|admin|auth|account|login|logout|cuenta|_nuxt|_ipx)(?:\/|$)/i.test(path))
    return null
  if (privateRoutes.some(route => path === route || path.startsWith(`${route}/`))) return null
  if (!staticRoutes.has(path) && !dynamicRoutes.some(pattern => pattern.test(path))) return null

  const allowed = allowedQueryKeys(path)
  const params = new URLSearchParams()
  if ([...url.searchParams].length > 64) return null
  for (const [key, value] of url.searchParams) {
    if (!allowed?.has(key)) continue
    if (value.length > 1024 || /[\u0000-\u001F\u007F]/.test(value)) return null
    // Repeated values may mean multiple selected filters; keep their order, just sort keys.
    if (value) params.append(key, value)
  }
  // A distance sort without its intentionally private origin would describe a different search.
  if (path === '/alquileres-uruguay' && params.get('sort') === 'distancia') params.delete('sort')
  params.sort()
  const query = params.toString()
  const result = pathname + (query ? `?${query}` : '')
  return result.length <= SHARED_LINK_MAX_PATH ? result : null
}

export function isShareablePath(input: unknown): boolean {
  return normalizeSharePath(input) !== null
}
