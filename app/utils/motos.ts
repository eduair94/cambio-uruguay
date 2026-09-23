// La lógica del app para `/motos-usadas-uruguay`: rutas, filtros, orden, etiquetas y los textos que
// se calculan de los mismos datos que se muestran.
//
// El espejo de las formas guardadas está en `app/utils/motosPublic.ts` — mismo corte que
// `carsPublic.ts` (lo que publica el backend) / `cars.ts` (lo que hace el app con eso).
//
// `app/utils` es un namespace PLANO de auto-imports: todo lo exportado acá lleva prefijo
// `moto`/`MOTO_`. Verificado por grep antes de escribir el archivo: ningún nombre de acá existe ya
// en `utils/` (`movilidad.ts`, `cars.ts` y `phones.ts` son los vecinos más cercanos y usan sus
// propios prefijos).
//
// Dos reglas de la casa que este archivo aplica en varios lugares:
//
//   * **La ausencia no es un veredicto.** Un aviso sin cilindrada no cumple un filtro de cilindrada
//     (no se adivina del modelo, la misma regla que el job); un modelo sin curva suficiente no
//     publica depreciación; una respuesta vacía dice POR QUÉ está vacía.
//   * **La moneda no se mezcla al mostrar.** Cada aviso se imprime en la moneda en la que se
//     publicó. Lo único comparable entre los dos es `priceUsd`, que convierte el job con la
//     cotización de la corrida, y por eso el FILTRO y el ORDEN de precio van en dólares mientras
//     que la CIFRA que se lee es la del aviso — el mismo reparto de `/autos-usados-uruguay`.

import { dateLocale } from './format'
import type {
  MotoPublicBand,
  MotoPublicCatalogMeta,
  MotoPublicCurrency,
  MotoPublicFuel,
  MotoPublicListing,
  MotoPublicModel,
  MotoPublicSourceCoverage,
  MotoPublicType,
} from './motosPublic'

export const MOTOS_PATH = '/motos-usadas-uruguay'
/** El comparador hermano (`docs/superpowers/specs/2026-09-22-comparador-transporte-design.md`), que
 * consume este catálogo como el modo `moto`. Se enlaza desde las dos páginas. */
export const MOTOS_COMPARADOR_PATH = '/conviene-auto-moto-o-omnibus-uruguay'
export const MOTOS_AUTOS_PATH = '/autos-usados-uruguay'

/** El documento publicado de `motocatalogmetas`. Los otros dos (`-harvest`, `-publish`) son de la
 * corrida y esta app no los lee. Se exporta para que las dos rutas nombren el mismo documento. */
export const MOTO_META_ID = 'uy-motos'

/** La `key` reservada del informe dentro de `motomarketsnapshots`. El guion bajo no lo produce
 * nunca el slug de un modelo, así que ninguna ficha puede pisarla — ni aparecer donde no va. */
export const MOTO_REPORT_ID = '_informe'

export const MOTOS_PER_PAGE = 30

/** Piso por si el documento de la corrida no llegó: el job publica su propio `freshDays` y ése
 * manda. Nunca se borra nada, sólo deja de listarse. */
export const MOTO_FRESH_DAYS_FALLBACK = 7

/** Un slug de ficha: minúsculas, dígitos y guiones. Se valida ANTES de tocar la base — una forma
 * que no puede coincidir con ningún documento no debería gastar una ida a Mongo para enterarse. */
export const MOTO_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * El mismo control como función, más la negativa explícita a servir la `key` del informe como si
 * fuera una ficha. `definePageMeta({ validate })` sólo ve IMPORTS, nunca una constante declarada en
 * el `<script setup>` — misma trampa que documenta `carKeyValid`.
 */
export function motoKeyValid(key: string): boolean {
  return MOTO_SLUG_RE.test(key) && key.length <= 120 && key !== MOTO_REPORT_ID
}

export const MOTO_SORTS = ['recent', 'price_asc', 'price_desc', 'year_desc', 'km_asc'] as const
export type MotoSort = (typeof MOTO_SORTS)[number]

/**
 * Los tramos de cilindrada del filtro.
 *
 * Son EXACTAMENTE los tres que publica la faceta `ENGINE_DISPLACEMENT` de Mercado Libre, y no los
 * cuatro que tendrían más sentido editorialmente (hasta 125 / 126-200 / 201-400 / más de 400). El
 * motivo es de datos, no de gusto: la cilindrada EXACTA la escribe el título y casi nadie la
 * escribe —medido el 22/9/2026, 2 de 73 avisos publicables—, mientras que el TRAMO lo declara el
 * origen para casi todos. Ofrecer cuatro tramos que sólo puede cumplir el 3 % de los avisos es
 * publicar un filtro que devuelve vacío y parece roto; ofrecer los tres del origen es publicar el
 * filtro que el dato puede sostener.
 *
 * Un aviso cumple un tramo si su cilindrada exacta cae adentro O si el origen lo clasificó en ese
 * tramo. Un aviso sin ninguna de las dos cosas NO cumple ningún tramo — la ausencia no es un
 * veredicto—, y por eso la página publica al lado cuántos están sin el dato
 * (`meta.withoutDisplacementBand`): así "no aparece en ningún tramo" no se lee como "no existe".
 */
export const MOTO_DISPLACEMENT_BUCKETS = Object.freeze([
  { id: 'hasta-125', label: 'Hasta 125 cc', min: 0, max: 125 },
  { id: '126-250', label: '126 a 250 cc', min: 126, max: 250 },
  { id: 'mas-250', label: 'Más de 250 cc', min: 251, max: 100000 },
] as const)

export type MotoDisplacementBucketId = (typeof MOTO_DISPLACEMENT_BUCKETS)[number]['id']

/** Las etiquetas de la faceta `MOTO_TYPE` de Mercado Libre. La taxonomía es del origen: es la que
 * eligió el vendedor, no una nuestra. */
export const MOTO_TYPE_LABEL: Readonly<Record<MotoPublicType, string>> = Object.freeze({
  calle: 'Calle',
  naked: 'Naked',
  scooter: 'Scooter',
  'doble-proposito': 'Doble propósito',
  deportiva: 'Deportiva',
  custom: 'Custom',
  chopper: 'Chopper',
  crucero: 'Crucero',
  cross: 'Cross',
  enduro: 'Enduro',
  trial: 'Trial',
  turismo: 'Turismo',
  mini: 'Mini',
})

export const MOTO_FUEL_LABEL: Readonly<Record<MotoPublicFuel, string>> = Object.freeze({
  nafta: 'Nafta',
  electrica: 'Eléctrica',
  hibrida: 'Híbrida',
  diesel: 'Diésel',
})

export const MOTO_SELLER_LABEL = Object.freeze({
  dealer: 'Agencia',
  private: 'Particular',
})

export interface MotoQuery {
  /** El slug de la marca, tal como lo publica el catálogo. */
  marca: string
  /** `marca-modelo`: la cohorte del modelo. */
  modelo: string
  cilindrada: string
  tipo: string
  combustible: string
  departamento: string
  vendedor: string
  /** Tope de precio EN DÓLARES: es la única escala comparable entre avisos en pesos y en dólares.
   * Lo que se muestra sigue siendo el precio en la moneda del aviso. */
  precioMaxUsd: number | null
  anioDesde: number | null
  anioHasta: number | null
  sort: MotoSort
  page: number
}

function motoInt(value: unknown, min: number, max: number): number | null {
  const parsed = Math.floor(Number(Array.isArray(value) ? value[0] : value))
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null
  return parsed
}

function motoStr(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw.trim().slice(0, 60) : ''
}

/**
 * Normaliza la query de la URL. Lo único que no es forma: el rango de años viene ORDENADO — si
 * alguien escribe desde 2020 hasta 2015 se dan vuelta, en vez de devolver cero resultados por un
 * error de tipeo que la página podía arreglar sola.
 */
export function motoNormalizeQuery(raw: Record<string, unknown>): MotoQuery {
  const sortRaw = motoStr(raw.sort) as MotoSort
  const cilindrada = motoStr(raw.cilindrada)
  const tipo = motoStr(raw.tipo)
  const combustible = motoStr(raw.combustible)
  const vendedor = motoStr(raw.vendedor)
  let anioDesde = motoInt(raw.anioDesde, 1950, 2100)
  let anioHasta = motoInt(raw.anioHasta, 1950, 2100)
  if (anioDesde != null && anioHasta != null && anioDesde > anioHasta) {
    const swap = anioDesde
    anioDesde = anioHasta
    anioHasta = swap
  }
  return {
    marca: motoStr(raw.marca),
    modelo: motoStr(raw.modelo),
    cilindrada: MOTO_DISPLACEMENT_BUCKETS.some(bucket => bucket.id === cilindrada)
      ? cilindrada
      : '',
    tipo: tipo in MOTO_TYPE_LABEL ? tipo : '',
    combustible: combustible in MOTO_FUEL_LABEL ? combustible : '',
    departamento: motoStr(raw.departamento),
    vendedor: vendedor === 'dealer' || vendedor === 'private' ? vendedor : '',
    precioMaxUsd: motoInt(raw.precioMaxUsd, 1, 1_000_000),
    anioDesde,
    anioHasta,
    sort: MOTO_SORTS.includes(sortRaw) ? sortRaw : 'recent',
    page: motoInt(raw.page, 1, 500) ?? 1,
  }
}

/** La query como parámetros de URL, sin los vacíos: una URL corta se puede compartir y no
 * multiplica copias finas de la misma página. */
export function motoQueryParams(query: MotoQuery): Record<string, string> {
  const params: Record<string, string> = {}
  if (query.marca) params.marca = query.marca
  if (query.modelo) params.modelo = query.modelo
  if (query.cilindrada) params.cilindrada = query.cilindrada
  if (query.tipo) params.tipo = query.tipo
  if (query.combustible) params.combustible = query.combustible
  if (query.departamento) params.departamento = query.departamento
  if (query.vendedor) params.vendedor = query.vendedor
  if (query.precioMaxUsd != null) params.precioMaxUsd = String(query.precioMaxUsd)
  if (query.anioDesde != null) params.anioDesde = String(query.anioDesde)
  if (query.anioHasta != null) params.anioHasta = String(query.anioHasta)
  if (query.sort !== 'recent') params.sort = query.sort
  if (query.page > 1) params.page = String(query.page)
  return params
}

/** ¿Hay algún filtro puesto? Decide el `robots` de la página: cada combinación de filtros es una
 * copia fina del directorio y sólo la URL base se indexa. El orden no cuenta: reordenar la misma
 * lista no crea una página nueva. */
export function motoFiltered(query: MotoQuery): boolean {
  return Object.keys(motoQueryParams(query)).some(name => name !== 'sort')
}

export type MotoQueryKey = keyof MotoQuery

/** Saca uno o varios filtros sin tocar el resto (los chips de "filtros activos"). Siempre vuelve a
 * la página 1: la 7 de un listado filtrado no es la 7 del listado sin ese filtro. */
export function motoQueryWithout(query: MotoQuery, keys: readonly MotoQueryKey[]): MotoQuery {
  const next: MotoQuery = { ...query, page: 1 }
  for (const name of keys) {
    if (name === 'precioMaxUsd' || name === 'anioDesde' || name === 'anioHasta') next[name] = null
    else if (name === 'sort') next.sort = 'recent'
    else if (name === 'page') next.page = 1
    else if (name === 'marca') {
      // Sacar la marca saca el modelo: un modelo huérfano de su marca es un filtro que el lector no
      // puede volver a encontrar en ninguna lista.
      next.marca = ''
      next.modelo = ''
    } else next[name] = ''
  }
  return next
}

export interface MotoFilterChip {
  keys: MotoQueryKey[]
  label: string
}

export function motoFilterChips(query: MotoQuery, facets?: MotoFacets): MotoFilterChip[] {
  const chips: MotoFilterChip[] = []
  const named = (list: readonly MotoFacet[] | undefined, slug: string) =>
    list?.find(facet => facet.value === slug)?.label ?? slug
  if (query.marca) chips.push({ keys: ['marca'], label: named(facets?.brands, query.marca) })
  if (query.modelo) chips.push({ keys: ['modelo'], label: named(facets?.models, query.modelo) })
  if (query.cilindrada) {
    const bucket = MOTO_DISPLACEMENT_BUCKETS.find(item => item.id === query.cilindrada)
    if (bucket) chips.push({ keys: ['cilindrada'], label: bucket.label })
  }
  if (query.tipo)
    chips.push({ keys: ['tipo'], label: MOTO_TYPE_LABEL[query.tipo as MotoPublicType] })
  if (query.combustible) {
    chips.push({
      keys: ['combustible'],
      label: MOTO_FUEL_LABEL[query.combustible as MotoPublicFuel],
    })
  }
  if (query.departamento) chips.push({ keys: ['departamento'], label: query.departamento })
  if (query.vendedor) {
    chips.push({
      keys: ['vendedor'],
      label: MOTO_SELLER_LABEL[query.vendedor as keyof typeof MOTO_SELLER_LABEL],
    })
  }
  if (query.precioMaxUsd != null) {
    chips.push({ keys: ['precioMaxUsd'], label: `Hasta ${motoUsd(query.precioMaxUsd)}` })
  }
  if (query.anioDesde != null && query.anioHasta != null) {
    chips.push({ keys: ['anioDesde', 'anioHasta'], label: `${query.anioDesde}–${query.anioHasta}` })
  } else if (query.anioDesde != null) {
    chips.push({ keys: ['anioDesde'], label: `Desde ${query.anioDesde}` })
  } else if (query.anioHasta != null) {
    chips.push({ keys: ['anioHasta'], label: `Hasta ${query.anioHasta}` })
  }
  return chips
}

/** `YYYY-MM-DD` desde el cual un aviso sigue listándose. Se compara como string contra `lastSeen`,
 * que es correcto tanto si el job guarda la fecha sola como si guarda fecha y hora. */
export function motoFreshFloor(today: string, days: number = MOTO_FRESH_DAYS_FALLBACK): string {
  const base = Date.parse(`${today.slice(0, 10)}T12:00:00Z`)
  if (Number.isNaN(base)) return ''
  return new Date(base - Math.max(1, days) * 86_400_000).toISOString().slice(0, 10)
}

/** El filtro de Mongo sobre `motocatalog`. */
export function motoMatch(
  query: MotoQuery,
  today: string,
  freshDays: number
): Record<string, unknown> {
  const match: Record<string, unknown> = {}
  const floor = motoFreshFloor(today, freshDays)
  if (floor) match.lastSeen = { $gte: floor }
  if (query.marca) match.brandSlug = query.marca
  if (query.modelo) match.marketSlug = query.modelo
  if (query.tipo) match.type = query.tipo
  if (query.combustible) match.fuel = query.combustible
  if (query.departamento) match.department = query.departamento
  if (query.vendedor) match.sellerType = query.vendedor
  if (query.cilindrada) {
    const bucket = MOTO_DISPLACEMENT_BUCKETS.find(item => item.id === query.cilindrada)
    // Dos vías, y hacen falta las dos: la cilindrada EXACTA del título cuando está (es la mejor
    // evidencia) y el TRAMO que declaró el origen cuando no. `$gte/$lte` ya excluye `null`, así que
    // un aviso sin ninguna de las dos no cumple el filtro — la ausencia no es un veredicto.
    if (bucket) {
      match.$or = [
        { displacement: { $gte: bucket.min, $lte: bucket.max } },
        { displacementBand: bucket.id },
      ]
    }
  }
  if (query.anioDesde != null || query.anioHasta != null) {
    const year: Record<string, number> = {}
    if (query.anioDesde != null) year.$gte = query.anioDesde
    if (query.anioHasta != null) year.$lte = query.anioHasta
    match.year = year
  }
  // El tope va sobre el precio convertido por el job, que es lo único comparable entre un aviso en
  // pesos y uno en dólares. Lo que la tarjeta imprime sigue siendo el precio del aviso.
  if (query.precioMaxUsd != null) match.priceUsd = { $lte: query.precioMaxUsd }
  return match
}

export function motoSortSpec(sort: MotoSort): Record<string, 1 | -1> {
  switch (sort) {
    case 'price_asc':
      // En dólares: ordenar por `price` mezclaría escalas y pondría primero cualquier aviso en
      // pesos. Desempate por año descendente — a igual precio, la más nueva arriba.
      return { priceUsd: 1, year: -1 }
    case 'price_desc':
      return { priceUsd: -1, year: -1 }
    case 'year_desc':
      return { year: -1, priceUsd: 1 }
    case 'km_asc':
      return { km: 1, priceUsd: 1 }
    default:
      return { lastSeen: -1, firstSeen: -1 }
  }
}

/** Los campos de mongoose que nadie lee y que pesan en cada fila de un listado de 30. */
export const MOTO_ROW_PROJECTION = Object.freeze({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })

// ── Formato ─────────────────────────────────────────────────────────────────

/** `$ 89.000`, con espacio duro entre el signo y la cifra para que el celular nunca parta el monto
 * en dos líneas — misma convención que `movilidadMoney`. */
export function motoMoney(value: number, currency: MotoPublicCurrency = 'UYU'): string {
  const amount = Math.round(value).toLocaleString('es-UY')
  return currency === 'USD' ? `USD\u00A0${amount}` : `$\u00A0${amount}`
}

export function motoUsd(value: number): string {
  return `USD\u00A0${Math.round(value).toLocaleString('es-UY')}`
}

export function motoDisplacementLabel(displacement: number | null | undefined): string {
  return typeof displacement === 'number' && displacement > 0
    ? `${displacement} cc`
    : 'Cilindrada no informada'
}

/** El kilometraje que declara quien vende. `null` es "no informado" y NO es cero: el job ya tiró
 * los valores de relleno (1, 111.111…) y publicar un 0 los volvería a inventar. */
export function motoKmLabel(km: number | null | undefined): string {
  return typeof km === 'number' && km >= 0 ? `${km.toLocaleString('es-UY')} km` : 'km no informado'
}

export function motoTypeLabel(type: MotoPublicType | null | undefined): string {
  return type ? (MOTO_TYPE_LABEL[type] ?? type) : 'Tipo no informado'
}

export function motoFuelLabel(fuel: MotoPublicFuel | null | undefined): string {
  return fuel ? (MOTO_FUEL_LABEL[fuel] ?? fuel) : 'Motor no informado'
}

/** `YYYY-MM-DD` se lee como mediodía UTC: a medianoche caería en el día anterior en Montevideo. */
function motoToDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value
  const time = Date.parse(iso)
  return Number.isNaN(time) ? null : new Date(time)
}

/** La página es sólo en español, así que el locale es siempre `'es'` — `dateLocale('es')` es
 * `'es-UY'`, que es lo que escribe "setiembre" y no "septiembre" (`utils/format.ts`). La zona va
 * explícita: sin ella el servidor imprime un día y el navegador otro. */
export function motoLongDate(value: string | null | undefined): string {
  const date = motoToDate(value)
  return date
    ? date.toLocaleDateString(dateLocale('es'), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Montevideo',
      })
    : ''
}

// ── Respuestas de la API ────────────────────────────────────────────────────

export interface MotoFacet {
  value: string
  label: string
  count: number
}

export interface MotoFacets {
  brands: MotoFacet[]
  models: MotoFacet[]
  departments: MotoFacet[]
  types: MotoFacet[]
  fuels: MotoFacet[]
  sellers: MotoFacet[]
}

export const MOTO_EMPTY_FACETS: MotoFacets = Object.freeze({
  brands: [],
  models: [],
  departments: [],
  types: [],
  fuels: [],
  sellers: [],
})

/** Lo que la página necesita de la corrida para poder decir qué se leyó y cuándo. Es un recorte de
 * `MotoPublicCatalogMeta` y no el documento entero: la lista completa de modelos pesa y sólo se
 * usan los primeros. */
export interface MotoCoverage {
  generatedAt: string
  freshDays: number
  listings: number
  usdUyu: number
  lastReadAt: string | null
  lastFullReadAt: string | null
  reportedTotal: number | null
  withoutDisplacement: number
  withoutDisplacementBand: number
  models: Array<{ slug: string; brand: string; model: string; listings: number }>
  sources: MotoPublicSourceCoverage[]
}

/**
 * Por qué una respuesta puede venir vacía. Son tres cosas distintas y la página dice cuál:
 * `preparing` = el job todavía no publicó nada (el relevamiento arranca), `unavailable` = no
 * pudimos leer el catálogo ahora mismo, `ok` = leímos y esto es lo que hay. Sin esta distinción una
 * base caída se leería como "no hay motos usadas en Uruguay", que es afirmar algo que no medimos.
 */
export type MotoStatus = 'ok' | 'preparing' | 'unavailable'

export interface MotoListResponse {
  status: MotoStatus
  generatedAt: string
  total: number
  page: number
  perPage: number
  items: MotoPublicListing[]
  facets: MotoFacets
  coverage: MotoCoverage | null
}

export interface MotoDetailResponse {
  status: MotoStatus
  generatedAt: string
  model: MotoPublicModel
  /** Los avisos vigentes de ese modelo, los más baratos primero. */
  listings: MotoPublicListing[]
  /** Cuántos avisos tiene el modelo hoy; puede ser más que los que viajan en `listings`. */
  listingsTotal: number
  siblings: Array<{ slug: string; brand: string; model: string; listings: number }>
  coverage: MotoCoverage | null
}

export function motoEmptyList(
  query: MotoQuery,
  status: MotoStatus = 'preparing'
): MotoListResponse {
  return {
    status,
    generatedAt: '',
    total: 0,
    page: query.page,
    perPage: MOTOS_PER_PAGE,
    items: [],
    facets: { ...MOTO_EMPTY_FACETS },
    coverage: null,
  }
}

export function motoCoverageOf(
  meta: MotoPublicCatalogMeta | null | undefined
): MotoCoverage | null {
  if (!meta) return null
  return {
    generatedAt: meta.generatedAt ?? '',
    freshDays: typeof meta.freshDays === 'number' ? meta.freshDays : MOTO_FRESH_DAYS_FALLBACK,
    listings: meta.listings ?? 0,
    usdUyu: meta.usdUyu ?? 0,
    lastReadAt: meta.lastReadAt ?? null,
    lastFullReadAt: meta.lastFullReadAt ?? null,
    reportedTotal: meta.reportedTotal ?? null,
    withoutDisplacement: meta.withoutDisplacement ?? 0,
    withoutDisplacementBand: meta.withoutDisplacementBand ?? 0,
    models: Array.isArray(meta.models) ? meta.models.slice(0, 60) : [],
    sources: Array.isArray(meta.sources) ? meta.sources : [],
  }
}

// ── Lo que la ficha calcula de su propio documento ──────────────────────────

/** El año más barato y el más caro de la ficha, en dólares, para poder decir el rango en una línea.
 * `null` cuando el modelo no tiene ninguna banda por año: sin bandas no hay rango que afirmar. */
export function motoYearRange(model: Pick<MotoPublicModel, 'years'>): {
  cheapest: MotoPublicBand & { year: number }
  dearest: MotoPublicBand & { year: number }
} | null {
  if (!model.years?.length) return null
  const sorted = [...model.years].sort((a, b) => a.median - b.median)
  return { cheapest: sorted[0]!, dearest: sorted[sorted.length - 1]! }
}

/** El nombre del modelo tal como se lee. La línea eléctrica va dicha, porque su ficha ES otra: si
 * compartieran ficha, la banda de arriba tendría que promediar dos mercados para existir. */
export function motoModelName(
  model: Pick<MotoPublicModel, 'brand' | 'model' | 'propulsion'>
): string {
  const base = `${model.brand} ${model.model}`.trim()
  return model.propulsion === 'electrica' ? `${base} eléctrica` : base
}

/**
 * El slug de la ficha a la que pertenece un aviso. Es la misma regla que aplica el job
 * (`motoModelSlug` en `classes/motos/catalog.ts`): una línea ELÉCTRICA tiene ficha aparte, con el
 * sufijo. Enlazar un aviso eléctrico a `marca-modelo` a secas 404ea cuando el fabricante sólo
 * vende esa línea en eléctrico, y lleva a la ficha equivocada cuando vende las dos.
 */
export function motoFichaSlug(listing: Pick<MotoPublicListing, 'marketSlug' | 'fuel'>): string {
  return listing.fuel === 'electrica' ? `${listing.marketSlug}-electrica` : listing.marketSlug
}

export function motoMedian(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  if (!sorted.length) return 0
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

// ── Textos calculados de los mismos datos que se muestran ───────────────────

/**
 * Respuesta de "¿cuánto sale una moto usada?", armada con los mismos avisos que la página imprime,
 * para que el texto visible y el schema.org no puedan divergir (misma técnica que
 * `movilidadPrecioTipicoAnswer`). Rama de abstención: sin avisos no se estima, se dice.
 */
export function motoPrecioTipicoAnswer(
  items: readonly MotoPublicListing[],
  coverage: MotoCoverage | null
): string {
  const prices = items.map(item => item.priceUsd).filter(price => price > 0)
  if (!prices.length) {
    return 'Todavía no relevamos suficientes avisos de motos usadas en Uruguay: sin datos para publicar una mediana.'
  }
  const fecha = motoLongDate(coverage?.generatedAt ?? null)
  const total = coverage?.listings
    ? `, sobre ${coverage.listings.toLocaleString('es-UY')} avisos vigentes`
    : ''
  return `La mediana de lo que se pide en esta pantalla es ${motoUsd(motoMedian(prices))}${total}. Son precios PEDIDOS en avisos, no precios de venta cerrados, y los avisos en pesos se convierten con la cotización de la corrida sólo para poder compararlos.${fecha ? ` Datos del ${fecha}.` : ''}`
}

/** Respuesta de "¿cuánto pierde de valor por año?". Se abstiene exactamente donde se abstiene el
 * job: sin curva suficiente `annualDrop` viene `null`, y acá no se inventa una. */
export function motoDepreciacionAnswer(model: MotoPublicModel | null): string {
  if (!model) {
    return 'Todavía no publicamos la ficha de ese modelo, así que no podemos decir cuánto pierde por año.'
  }
  const name = motoModelName(model)
  if (model.annualDrop == null) {
    return `Todavía no podemos medir la depreciación de una ${name}: hacen falta varios años distintos con precio publicado y la curva de este modelo no alcanza. Preferimos decirlo antes que estimar una pendiente que no medimos.`
  }
  const pct = Math.round(model.annualDrop * 10) / 10
  return `Una ${name} pierde alrededor de ${pct.toLocaleString('es-UY')} % por cada año de antigüedad, medido sobre los ${model.listings.toLocaleString('es-UY')} avisos vigentes del modelo y sus ${model.years.length} ${model.years.length === 1 ? 'año con banda' : 'años con banda'}.`
}

/** Respuesta de "¿qué cilindrada tiene más oferta?", con la declaración de cuántos avisos no dicen
 * la suya: sin eso, "no aparece en ningún tramo" se lee como "no existe". */
/**
 * Si un aviso cumple un tramo de cilindrada. Lo usan el conteo de la página y el texto que lo
 * explica; la consulta a Mongo hace lo mismo con `$or` y las dos cosas tienen que decir lo mismo.
 */
export function motoMatchesDisplacement(
  item: Pick<MotoPublicListing, 'displacement' | 'displacementBand'>,
  bucketId: MotoDisplacementBucketId
): boolean {
  const bucket = MOTO_DISPLACEMENT_BUCKETS.find(candidate => candidate.id === bucketId)
  if (!bucket) return false
  if (typeof item.displacement === 'number') {
    return item.displacement >= bucket.min && item.displacement <= bucket.max
  }
  return item.displacementBand === bucket.id
}

export function motoCilindradaAnswer(
  items: readonly MotoPublicListing[],
  coverage: MotoCoverage | null
): string {
  const counts = MOTO_DISPLACEMENT_BUCKETS.map(bucket => ({
    label: bucket.label,
    count: items.filter(item => motoMatchesDisplacement(item, bucket.id)).length,
  })).filter(row => row.count > 0)
  if (!counts.length) {
    return 'Todavía no relevamos suficientes avisos con la cilindrada declarada en el título como para decir qué tramo tiene más oferta.'
  }
  const detalle = counts
    .sort((a, b) => b.count - a.count)
    .map(row => `${row.label.toLowerCase()} (${row.count.toLocaleString('es-UY')})`)
    .join('; ')
  const sinDato = coverage?.withoutDisplacementBand
    ? ` ${coverage.withoutDisplacementBand.toLocaleString('es-UY')} avisos del catálogo no entran en ningún tramo: ni declaran la cilindrada en el título ni el vendedor los clasificó por cilindrada en Mercado Libre, y nunca la inferimos del modelo.`
    : ' La cilindrada se lee del título del aviso y nunca se infiere del modelo.'
  return `Por oferta relevada: ${detalle}.${sinDato}`
}
