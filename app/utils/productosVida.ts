// Formas y lógica pura de /productos-que-te-cambian-la-vida-uruguay y de `GET /api/productos-vida`.
//
// `app/utils` es un namespace de auto-import PLANO: cada export lleva el prefijo `productosVida`/
// `PRODUCTOS_VIDA_`. Sin imports de Nuxt: todo se prueba en Vitest plano.
//
// Dos capas que no se mezclan: el texto del hilo (`productosVidaCatalog.ts`, que viaja en el JS de
// la página) y los precios de hoy (esta respuesta, que viaja en el payload). La página itera el
// CATÁLOGO, no la respuesta, así que los 26 productos se dibujan aunque no haya un solo precio.
//
// La página nunca lee el reloj: `stale`, el corte de 48 h y el «leído el» los decide el servidor y
// llegan en la respuesta. Un `Date.now()` en el render daría un texto en el servidor y otro en el
// cliente, y el HTML se cachea en el borde.

import type { FaqItem } from './faqAnswers'
import { dateLocale } from './format'
import { gridPhotoUrl } from './photoSizes'
import { PRICE_EVENT_CALENDAR } from './priceEvents'
import {
  PRODUCTOS_VIDA_GROUPS,
  PRODUCTOS_VIDA_PRODUCTS,
  PRODUCTOS_VIDA_THREAD,
  type ProductosVidaGroupId,
  type ProductosVidaProductEntry,
} from './productosVidaCatalog'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** `key` del único documento de `productosvidameta` (sin dígitos: ver el catálogo). */
export const PRODUCTOS_VIDA_META_KEY = 'productos-que-te-cambian-la-vida-uruguay'

export const PRODUCTOS_VIDA_BUDGETS = [2000, 5000, 15000] as const
export type ProductosVidaBudget = (typeof PRODUCTOS_VIDA_BUDGETS)[number]

export const PRODUCTOS_VIDA_BASE_PATH = '/productos-que-te-cambian-la-vida-uruguay'

/** Para la API y los tests. La página declara su propio literal (seoContract sólo lee un `const`
 * del mismo archivo). */
export const PRODUCTOS_VIDA_CANONICAL =
  'https://cambio-uruguay.com/productos-que-te-cambian-la-vida-uruguay'

/** Ninguna banda más vieja que esto se imprime: es lo que dice «en los últimos dos días». */
export const PRODUCTOS_VIDA_MAX_AGE_HOURS = 48

/**
 * Cuándo la página avisa que los precios son viejos. El job lee a las 0, 4, 16 y 20 UTC: el hueco
 * más largo, de las 4 a las 16, ya mide 12 h, así que con un umbral de 12 h el aviso se prendía
 * unos minutos en cada corrida normal de las 16. Con 13 h el aviso sale sólo si falló una lectura.
 */
export const PRODUCTOS_VIDA_STALE_HOURS = 13

/** Una variante que la última corrida no refrescó (más de 6 h detrás) dice de cuándo es su banda. */
export const PRODUCTOS_VIDA_SEEN_ON_HOURS = 6

/** Cómo se contó el hilo: la misma oración en «Cómo armamos la lista» y en la primera pregunta. */
export const PRODUCTOS_VIDA_COUNT_RULE =
  'Cada persona cuenta una vez por producto cuando dice que lo tiene o lo usa en una respuesta a favor, o cuando lo nombra en su propia lista; también quien abrió el hilo.'

/** Ofertas por producto en el payload, y el largo máximo de su título. */
export const PRODUCTOS_VIDA_MAX_OFFERS = 4
export const PRODUCTOS_VIDA_TITLE_MAX = 90

const HOUR_MS = 3_600_000
const TZ = 'America/Montevideo'

// ---------------------------------------------------------------------------
// Formas: lo que viene de Mongo (o del JSON del dry run) y lo que sale de la API
// ---------------------------------------------------------------------------

export interface ProductosVidaStoredBand {
  p25: number
  median: number
  p75: number
  min?: number
  n: number
}

export interface ProductosVidaStoredOffer {
  listingId?: string
  seller?: string
  title?: string
  url?: string
  image?: string | null
  price?: number
  currency?: string
  priceUyu?: number
  condition?: string
  source?: string
  observedAt?: string
}

/** Lo que la ruta selecciona de `productosvidaitems` (sin `history`, `products` ni lo usado). */
export interface ProductosVidaItemDoc {
  category: string
  variant: string
  variantLabel: string
  variantRank?: number
  newBand: ProductosVidaStoredBand | null
  offers?: ProductosVidaStoredOffer[]
  lastSeen?: string
  observedAt?: string | null
}

export interface ProductosVidaMetaDoc {
  generatedAt?: string | null
  usdUyu?: number | null
  listings?: number | null
}

export interface ProductosVidaBand {
  p25: number
  median: number
  p75: number
  n: number
}

export interface ProductosVidaOffer {
  /** El título del aviso, cortado a 90 caracteres en un espacio. */
  title: string
  url: string
  image: string | null
  /** En la moneda publicada. */
  price: number
  currency: 'UYU' | 'USD'
  priceUyu: number
  /** Tal cual lo publica Mercado Libre; el rótulo se aplica al dibujar. */
  seller: string
  /** Día de Montevideo en que se vio, `YYYY-MM-DD`. */
  observedOn: string
  /** Id de la variante de la que sale; su rótulo se busca en `variants`. */
  variant: string
}

export interface ProductosVidaVariant {
  id: string
  label: string
  rank: number
  band: ProductosVidaBand | null
  /** Cuántas ofertas nuevas guardó la variante (0..8), tenga banda o no. */
  newOffers: number
  /** «dd/mm» de su lectura cuando la última corrida no la refrescó; si no, null. */
  seenOn: string | null
}

export interface ProductosVidaProduct {
  slug: string
  variants: ProductosVidaVariant[]
  offers: ProductosVidaOffer[]
}

export interface ProductosVidaResponse {
  generatedAt: string | null
  usdUyu: number | null
  listings: number | null
  stale: boolean
  /** Sólo en el camino de error de la ruta (Mongo no se pudo leer). */
  unavailable: boolean
  products: ProductosVidaProduct[]
}

export const PRODUCTOS_VIDA_EMPTY: ProductosVidaResponse = {
  generatedAt: null,
  usdUyu: null,
  listings: null,
  stale: false,
  unavailable: false,
  products: [],
}

// ---------------------------------------------------------------------------
// Fechas y montos
// ---------------------------------------------------------------------------

/** `YYYY-MM-DD` se lee al mediodía UTC: a la medianoche caería el día anterior en Montevideo. */
function productosVidaToDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value
  const time = Date.parse(iso)
  return Number.isNaN(time) ? null : new Date(time)
}

const isInstant = (value: string): boolean => !/^\d{4}-\d{2}-\d{2}$/.test(value)

/** `$ 13.019`, con espacio duro para que el monto nunca se parta en dos renglones. */
export const productosVidaMoney = (value: number): string =>
  `$\u00A0${Math.round(value).toLocaleString('es-UY')}`

export const productosVidaUsd = (value: number): string =>
  `USD\u00A0${Math.round(value).toLocaleString('es-UY')}`

/** «20 de noviembre de 2026». */
export function productosVidaLongDate(value: string | null | undefined): string {
  const date = productosVidaToDate(value)
  return date
    ? date.toLocaleDateString(dateLocale('es'), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: TZ,
      })
    : ''
}

/**
 * «20/11», «01/12»: siempre dd/mm. Se arma con el día de Montevideo y no con `toLocaleDateString`,
 * porque ICU ignora `2-digit` en es-UY y escribe «1/12».
 */
export function productosVidaShortDate(value: string | null | undefined): string {
  if (!productosVidaToDate(value)) return ''
  const day = productosVidaMontevideoDay(value)
  return `${day.slice(8, 10)}/${day.slice(5, 7)}`
}

/** «21:13», sólo para un instante. */
export function productosVidaTime(value: string | null | undefined): string {
  if (!value || !isInstant(value)) return ''
  const date = productosVidaToDate(value)
  return date
    ? date.toLocaleTimeString(dateLocale('es'), {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone: TZ,
      })
    : ''
}

/** «20/11 a las 21:13», sólo para un instante. */
export function productosVidaDateTime(value: string | null | undefined): string {
  const time = productosVidaTime(value)
  return time ? `${productosVidaShortDate(value)} a las ${time}` : ''
}

/** El día de Montevideo de un instante, `YYYY-MM-DD`. Un día suelto vuelve tal cual. */
export function productosVidaMontevideoDay(value: string | null | undefined): string {
  if (!value) return ''
  if (!isInstant(value)) return value
  const date = productosVidaToDate(value)
  if (!date) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: TZ,
  }).formatToParts(date)
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/**
 * Mercado Libre no publica el vendedor de todos los avisos; el backend guarda entonces el literal
 * «Mercado Libre», que leído como vendedor diría que lo vende el propio sitio.
 */
export function productosVidaSellerLabel(seller: string): string {
  return seller.trim() === 'Mercado Libre' ? 'Vendedor sin identificar (Mercado Libre)' : seller
}

export function productosVidaMlSearchUrl(q: string): string {
  return `https://listado.mercadolibre.com.uy/${encodeURIComponent(q.trim().toLowerCase().replace(/\s+/g, '-'))}`
}

/** El título del aviso a lo sumo en `max` caracteres, cortado en un espacio y con «…». */
export function productosVidaShortTitle(title: string, max = PRODUCTOS_VIDA_TITLE_MAX): string {
  const clean = title.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const head = clean.slice(0, max - 1)
  const space = head.lastIndexOf(' ')
  const cut = (space > max / 2 ? head.slice(0, space) : head).replace(/[\s,;:.-]+$/, '')
  return `${cut}…`
}

// ---------------------------------------------------------------------------
// El armado de la respuesta (puro: lo usan la ruta de Mongo y la vista previa de dev)
// ---------------------------------------------------------------------------

function validBand(band: ProductosVidaStoredBand | null | undefined): ProductosVidaBand | null {
  if (!band) return null
  const { p25, median, p75, n } = band
  const ok = [p25, median, p75, n].every(v => typeof v === 'number' && Number.isFinite(v))
  if (!ok || n <= 0 || p25 <= 0 || !(p25 <= median && median <= p75)) return null
  return { p25, median, p75, n }
}

function toOffer(
  offer: ProductosVidaStoredOffer,
  variant: string,
  fallbackObservedAt: string
): ProductosVidaOffer | null {
  const { url, title, price, priceUyu, currency } = offer
  if (!url || !title) return null
  if (currency !== 'UYU' && currency !== 'USD') return null
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null
  if (typeof priceUyu !== 'number' || !Number.isFinite(priceUyu) || priceUyu <= 0) return null
  const observedOn =
    productosVidaMontevideoDay(offer.observedAt) || productosVidaMontevideoDay(fallbackObservedAt)
  return {
    title: productosVidaShortTitle(title),
    url,
    image: offer.image ? gridPhotoUrl(offer.image) : null,
    price,
    currency,
    priceUyu,
    seller: (offer.seller ?? '').trim() || 'Mercado Libre',
    observedOn,
    variant,
  }
}

/**
 * La respuesta de `GET /api/productos-vida`. Las reglas (SPEC §2.2):
 * 1. sólo categorías del catálogo;
 * 2. ningún ítem leído hace más de 48 h (por su `observedAt`; la ruta ya filtró por día);
 * 3. sólo lo nuevo: ni ofertas usadas ni banda de usados;
 * 4. las ofertas salen SÓLO de variantes con banda: sólo esas pasaron por la criba de precios del
 *    backend, y debajo de 8 precios una variante puede guardar un aviso de $ 1 o un accesorio mal
 *    archivado. Una por variante por vuelta, en orden de variante, la más barata primero, hasta 4;
 * 5. se omite la variante sin banda y sin ofertas nuevas, y el producto sin variantes;
 * 6. `stale` pasadas 13 h de la última lectura;
 * 7. «leído el» cuando la variante quedó más de 6 h detrás de la última lectura;
 * 8. el día de cada oferta es el de Montevideo;
 * 9. `unavailable` lo pone sólo la ruta, cuando Mongo falla.
 */
export function productosVidaResponse(
  meta: ProductosVidaMetaDoc | null | undefined,
  items: readonly ProductosVidaItemDoc[] | null | undefined,
  nowMs: number
): ProductosVidaResponse {
  const generatedAt = typeof meta?.generatedAt === 'string' ? meta.generatedAt : null
  const generatedMs = generatedAt ? Date.parse(generatedAt) : Number.NaN
  const cutoffMs = nowMs - PRODUCTOS_VIDA_MAX_AGE_HOURS * HOUR_MS
  const slugs = new Set(PRODUCTOS_VIDA_PRODUCTS.map(p => p.slug))

  const byCategory = new Map<
    string,
    { variant: ProductosVidaVariant; offers: ProductosVidaOffer[] }[]
  >()
  for (const item of items ?? []) {
    if (!item || !slugs.has(item.category)) continue
    const observedMs = item.observedAt ? Date.parse(item.observedAt) : Number.NaN
    if (!Number.isFinite(observedMs) || observedMs < cutoffMs) continue
    const rows = byCategory.get(item.category) ?? []
    if (rows.some(row => row.variant.id === item.variant)) continue

    const band = validBand(item.newBand)
    const newStored = (item.offers ?? []).filter(offer => offer?.condition === 'new')
    const offers = band
      ? newStored
          .map(offer => toOffer(offer, item.variant, item.observedAt as string))
          .filter((offer): offer is ProductosVidaOffer => offer !== null)
          .sort((a, b) => a.priceUyu - b.priceUyu)
      : []
    const seenOn =
      Number.isFinite(generatedMs) &&
      generatedMs - observedMs > PRODUCTOS_VIDA_SEEN_ON_HOURS * HOUR_MS
        ? productosVidaShortDate(item.observedAt)
        : null
    if (!band && newStored.length === 0) continue
    rows.push({
      variant: {
        id: item.variant,
        label: item.variantLabel,
        rank: typeof item.variantRank === 'number' ? item.variantRank : 1,
        band,
        newOffers: newStored.length,
        seenOn,
      },
      offers,
    })
    byCategory.set(item.category, rows)
  }

  const products: ProductosVidaProduct[] = []
  for (const entry of PRODUCTOS_VIDA_PRODUCTS) {
    const rows = byCategory.get(entry.slug)
    if (!rows?.length) continue
    rows.sort((a, b) => a.variant.rank - b.variant.rank || a.variant.id.localeCompare(b.variant.id))
    // Por vueltas: la más barata de cada variante con banda, después la segunda de cada una…
    const queues = rows.filter(row => row.variant.band).map(row => [...row.offers])
    const picked: ProductosVidaOffer[] = []
    const seen = new Set<string>()
    while (picked.length < PRODUCTOS_VIDA_MAX_OFFERS && queues.some(queue => queue.length)) {
      for (const queue of queues) {
        if (picked.length >= PRODUCTOS_VIDA_MAX_OFFERS) break
        while (queue.length) {
          const offer = queue.shift()!
          if (seen.has(offer.url)) continue
          seen.add(offer.url)
          picked.push(offer)
          break
        }
      }
    }
    products.push({ slug: entry.slug, variants: rows.map(row => row.variant), offers: picked })
  }

  return {
    generatedAt,
    usdUyu: typeof meta?.usdUyu === 'number' && meta.usdUyu > 0 ? meta.usdUyu : null,
    listings: typeof meta?.listings === 'number' && meta.listings >= 0 ? meta.listings : null,
    stale:
      Number.isFinite(generatedMs) && nowMs - generatedMs > PRODUCTOS_VIDA_STALE_HOURS * HOUR_MS,
    unavailable: false,
    products,
  }
}

// ---------------------------------------------------------------------------
// El puesto en el hilo y los textos del conteo
// ---------------------------------------------------------------------------

export interface ProductosVidaRank {
  slug: string
  rank: number
  /** Los nombres de los OTROS productos con el mismo puesto. */
  tiedWith: string[]
}

/** Puesto de competencia (1, 1, 1, 4, 4, 6 …): a igual cantidad de personas, el mismo número. */
export function productosVidaRanks(
  products: readonly Pick<ProductosVidaProductEntry, 'slug' | 'name' | 'mentions'>[]
): ProductosVidaRank[] {
  return products.map(product => {
    const rank = 1 + products.filter(other => other.mentions > product.mentions).length
    const tiedWith = products
      .filter(other => other.slug !== product.slug && other.mentions === product.mentions)
      .map(other => other.name)
    return { slug: product.slug, rank, tiedWith }
  })
}

const NUMBER_WORDS = [
  '',
  'una',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
]

type Article = 'el' | 'la' | 'los' | 'las'

function articleOf(phrase: string): Article {
  const match = /^(el|la|los|las) /.exec(phrase)
  return (match?.[1] as Article | undefined) ?? 'el'
}

const PRONOUN: Record<Article, string> = { el: 'lo', la: 'la', los: 'los', las: 'las' }

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1)

/** «a, b y c», con «e» delante de un sonido /i/ («Freezer e Isla», no «y Isla»). */
function joinSpanish(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join('')
  const last = parts[parts.length - 1]!
  const and = /^h?i(?![aeiouáéó])/i.test(last) ? 'e' : 'y'
  return `${parts.slice(0, -1).join(', ')} ${and} ${last}`
}

function peopleWords(n: number): { people: string; verb: string } {
  if (n === 1) return { people: 'una persona', verb: 'nombró' }
  return { people: `${NUMBER_WORDS[n] ?? String(n)} personas`, verb: 'nombraron' }
}

/**
 * La bajada: SÓLO el grupo más nombrado, con la cuenta POR PRODUCTO («cada uno»), porque fueron
 * personas distintas; «cuatro personas nombraron a, b y c» se leería como que las mismas cuatro
 * nombraron los tres.
 */
export function productosVidaLead(
  products: readonly Pick<ProductosVidaProductEntry, 'phrase' | 'mentions'>[],
  withPrices: boolean
): string {
  const top = Math.max(0, ...products.map(p => p.mentions))
  const group = products.filter(p => p.mentions === top)
  const second = withPrices
    ? 'Acá está cada producto con lo que piden por él en Mercado Libre.'
    : 'Acá está cada producto con lo que conviene mirar antes de comprarlo.'
  if (!group.length) return second
  const feminine = group.every(p => /^las? /.test(p.phrase))
  const pronoun =
    group.length === 1 ? PRONOUN[articleOf(group[0]!.phrase)] : feminine ? 'las' : 'los'
  const { people, verb } = peopleWords(top)
  const each = group.length > 1 ? (feminine ? ' cada una' : ' cada uno') : ''
  const subject = capitalize(joinSpanish(group.map(p => p.phrase)))
  return `${subject} ${pronoun} ${verb} ${people}${each}. ${second}`
}

/** «Lo nombraron 4 personas», «La nombraron 3 personas», «Lo nombró 1 persona». */
export function productosVidaCountLabel(n: number, phrase: string): string {
  const pronoun = capitalize(PRONOUN[articleOf(phrase)])
  return n === 1 ? `${pronoun} nombró 1 persona` : `${pronoun} nombraron ${n} personas`
}

/** Para lectores de pantalla, después del conteo. Sin género: «puesto compartido con …». */
export function productosVidaTieText(names: readonly string[]): string {
  if (!names.length) return ''
  if (names.length <= 2) return `, puesto compartido con ${joinSpanish(names)}`
  return `, puesto compartido con otros ${names.length} productos`
}

/** «Buscar sartén de acero inoxidable en Mercado Libre»: sale de la frase, nunca de la búsqueda. */
export function productosVidaSearchLabel(entry: Pick<ProductosVidaProductEntry, 'phrase'>): string {
  return `Buscar ${entry.phrase.replace(/^(el|la|los|las) /, '')} en Mercado Libre`
}

// ---------------------------------------------------------------------------
// Filtros (enlaces que el servidor lee de la URL)
// ---------------------------------------------------------------------------

export interface ProductosVidaState {
  hasta: ProductosVidaBudget | null
  tipo: ProductosVidaGroupId | null
}

const firstValue = (value: unknown): string =>
  String(Array.isArray(value) ? (value[0] ?? '') : (value ?? ''))

export function productosVidaStateFromQuery(query: Record<string, unknown>): ProductosVidaState {
  const hastaRaw = firstValue(query.hasta)
  const hasta = (PRODUCTOS_VIDA_BUDGETS as readonly number[]).find(b => String(b) === hastaRaw)
  const tipoRaw = firstValue(query.tipo)
  const tipo = PRODUCTOS_VIDA_GROUPS.find(group => group.id === tipoRaw)?.id ?? null
  return { hasta: (hasta as ProductosVidaBudget | undefined) ?? null, tipo }
}

export function productosVidaQueryFromState(state: ProductosVidaState): Record<string, string> {
  const query: Record<string, string> = {}
  if (state.hasta !== null) query.hasta = String(state.hasta)
  if (state.tipo !== null) query.tipo = state.tipo
  return query
}

/** `${basePath}?…#lista`, o `${basePath}#lista` sin filtros. `basePath` ya viene localizado. */
export function productosVidaFilterHref(
  basePath: string,
  state: ProductosVidaState,
  patch: Partial<ProductosVidaState>
): string {
  const search = new URLSearchParams(productosVidaQueryFromState({ ...state, ...patch })).toString()
  return `${basePath}${search ? `?${search}` : ''}#lista`
}

// ---------------------------------------------------------------------------
// Presupuesto y visibilidad
// ---------------------------------------------------------------------------

export type ProductosVidaFitKind = 'entra' | 'justo' | 'sin-banda' | 'fuera'

export interface ProductosVidaFit {
  kind: ProductosVidaFitKind
  variantLabel?: string
  value?: number
}

const bandedVariants = (product: ProductosVidaProduct | undefined) =>
  (product?.variants ?? []).filter(
    (variant): variant is ProductosVidaVariant & { band: ProductosVidaBand } =>
      variant.band !== null
  )

/**
 * - `entra`: alguna banda tiene la mediana en el presupuesto o abajo (la de más avisos);
 * - `justo`: alguna banda tiene el p25 en el presupuesto pero la mediana arriba;
 * - `sin-banda`: no hay banda; se muestra siempre y nunca se juzga (una oferta sin cribar no
 *   puede decidir qué entra en un presupuesto);
 * - `fuera`: lo demás.
 */
export function productosVidaFit(
  product: ProductosVidaProduct | undefined,
  hasta: number | null
): ProductosVidaFit {
  const banded = bandedVariants(product)
  if (!banded.length) return { kind: 'sin-banda' }
  if (hasta === null) return { kind: 'entra' }
  const largest = (list: typeof banded) => [...list].sort((a, b) => b.band.n - a.band.n)[0]!
  const enters = banded.filter(v => v.band.median <= hasta)
  if (enters.length) {
    const best = largest(enters)
    return { kind: 'entra', variantLabel: best.label, value: best.band.median }
  }
  const close = banded.filter(v => v.band.p25 <= hasta)
  if (close.length) {
    const best = largest(close)
    return { kind: 'justo', variantLabel: best.label, value: best.band.p25 }
  }
  return { kind: 'fuera' }
}

/** El tipo coincide y el presupuesto no lo deja afuera. `hasPrices` falso ignora el presupuesto. */
export function productosVidaVisible(
  entry: Pick<ProductosVidaProductEntry, 'group'>,
  product: ProductosVidaProduct | undefined,
  state: ProductosVidaState,
  hasPrices = true
): boolean {
  if (state.tipo !== null && entry.group !== state.tipo) return false
  if (!hasPrices || state.hasta === null) return true
  return productosVidaFit(product, state.hasta).kind !== 'fuera'
}

/** Cuántos productos mostraría cada tipo con el presupuesto de ahora (`null` = todos). */
export function productosVidaTypeCounts(
  entries: readonly Pick<ProductosVidaProductEntry, 'slug' | 'group'>[],
  bySlug: ReadonlyMap<string, ProductosVidaProduct>,
  hasta: number | null
): Record<ProductosVidaGroupId | 'todos', number> {
  const counts = { todos: 0 } as Record<ProductosVidaGroupId | 'todos', number>
  for (const group of PRODUCTOS_VIDA_GROUPS) counts[group.id] = 0
  for (const entry of entries) {
    if (hasta !== null && productosVidaFit(bySlug.get(entry.slug), hasta).kind === 'fuera') continue
    counts[entry.group]++
    counts.todos++
  }
  return counts
}

/** La línea que dice la fila de un producto con presupuesto, o null si no corresponde. */
export function productosVidaFitLine(
  fit: ProductosVidaFit,
  hasta: number | null,
  nameVariant: boolean
): string | null {
  if (hasta === null || fit.value === undefined) return null
  const variant = nameVariant && fit.variantLabel ? ` (${fit.variantLabel})` : ''
  if (fit.kind === 'entra') {
    return `Entra${variant}: la mitad de los avisos nuevos sale ${productosVidaMoney(fit.value)} o menos.`
  }
  if (fit.kind === 'justo') {
    return `Entra justo${variant}: al menos uno de cada cuatro avisos nuevos está por debajo de ${productosVidaMoney(hasta)}.`
  }
  return null
}

/** La línea de resultados debajo de los filtros. */
export function productosVidaResultLine(
  shown: number,
  sinBanda: number,
  state: ProductosVidaState
): string {
  const group = PRODUCTOS_VIDA_GROUPS.find(g => g.id === state.tipo)
  const de = group ? ` de ${group.label.toLowerCase()}` : ''
  const noun = shown === 1 ? 'producto' : 'productos'
  if (state.hasta === null) {
    return group ? `${shown} ${noun}${de}.` : `${shown} ${noun}, del más nombrado al menos.`
  }
  const money = productosVidaMoney(state.hasta)
  const priced = shown - sinBanda
  const verb = priced === 1 ? 'entra' : 'entran'
  const pricedNoun = priced === 1 ? 'producto' : 'productos'
  const extra =
    sinBanda > 0
      ? ` Se ${sinBanda === 1 ? 'muestra' : 'muestran'} además ${sinBanda} sin precio típico todavía.`
      : ''
  return `${priced} ${pricedNoun}${de} ${verb} con ${money} o menos.${extra} El número de cada uno es su puesto en el hilo.`
}

// ---------------------------------------------------------------------------
// La regla de precios compartida (escala logarítmica, una sola para toda la página)
// ---------------------------------------------------------------------------

export interface ProductosVidaRulerTick {
  value: number
  pct: number
  label: string | null
}

export interface ProductosVidaRulerDomain {
  lo: number
  hi: number
  ticks: ProductosVidaRulerTick[]
}

const MIN_DECADES = 2
const MAX_DECADES = 5

/**
 * `lo` = la potencia de diez debajo del p25 más barato, `hi` = la de arriba del p75 más caro, entre
 * 2 y 5 décadas. Marcas en cada potencia de diez. Con más de 3 marcas se rotulan sólo las que están
 * a una distancia PAR de la última: la última siempre lleva rótulo y dos rótulos quedan siempre a
 * dos décadas, así «$ 10.000» nunca se pega a «$ 100.000» a 320 px.
 */
export function productosVidaRulerDomain(
  products: readonly ProductosVidaProduct[]
): ProductosVidaRulerDomain {
  const bands = products.flatMap(product => bandedVariants(product).map(v => v.band))
  let loExp = 3
  let hiExp = 5
  if (bands.length) {
    loExp = Math.floor(Math.log10(Math.max(1, Math.min(...bands.map(b => b.p25)))))
    hiExp = Math.ceil(Math.log10(Math.max(1, ...bands.map(b => b.p75))))
  }
  if (hiExp - loExp < MIN_DECADES) hiExp = loExp + MIN_DECADES
  if (hiExp - loExp > MAX_DECADES) loExp = hiExp - MAX_DECADES
  const count = hiExp - loExp + 1
  const ticks: ProductosVidaRulerTick[] = []
  for (let i = 0; i < count; i++) {
    const value = 10 ** (loExp + i)
    const labelled = count <= 3 || (count - 1 - i) % 2 === 0
    ticks.push({
      value,
      pct: Math.round((i / (count - 1)) * 1000) / 10,
      label: labelled ? productosVidaMoney(value) : null,
    })
  }
  return { lo: 10 ** loExp, hi: 10 ** hiExp, ticks }
}

export interface ProductosVidaRulerPositions {
  from: number
  to: number
  mid: number
  cap: number | null
}

export function productosVidaRulerPositions(
  band: Pick<ProductosVidaBand, 'p25' | 'median' | 'p75'>,
  domain: Pick<ProductosVidaRulerDomain, 'lo' | 'hi'>,
  hasta: number | null
): ProductosVidaRulerPositions {
  const lo = Math.log10(domain.lo)
  const span = Math.log10(domain.hi) - lo
  const pct = (value: number): number => {
    const raw = ((Math.log10(Math.max(value, 1e-9)) - lo) / span) * 100
    return Math.round(Math.min(100, Math.max(0, raw)) * 10) / 10
  }
  const from = pct(band.p25)
  const to = Math.max(from, pct(band.p75))
  const mid = Math.min(to, Math.max(from, pct(band.median)))
  return { from, to, mid, cap: hasta === null ? null : pct(hasta) }
}

// ---------------------------------------------------------------------------
// Preguntas frecuentes (respuestas armadas con los datos; nunca un precio sin banda fresca)
// ---------------------------------------------------------------------------

function bandSentence(product: ProductosVidaProduct | undefined): string | null {
  const banded = bandedVariants(product)
  if (!banded.length) return null
  const parts = banded.map(
    v =>
      `${v.label}, ${productosVidaMoney(v.band.median)} de precio típico, la mitad entre ${productosVidaMoney(v.band.p25)} y ${productosVidaMoney(v.band.p75)} (${v.band.n} avisos)`
  )
  return `${parts.join('; ')}.`
}

function pricesClause(response: ProductosVidaResponse): string {
  const date = productosVidaLongDate(response.generatedAt)
  return date
    ? `Precios de los avisos nuevos de Mercado Libre Uruguay leídos el ${date}.`
    : 'Precios de los avisos nuevos de Mercado Libre Uruguay.'
}

function readOnClause(response: ProductosVidaResponse): string {
  const date = productosVidaLongDate(response.generatedAt)
  return date
    ? `En los avisos nuevos de Mercado Libre Uruguay leídos el ${date}`
    : 'En los avisos nuevos de Mercado Libre Uruguay'
}

function blackFridayDates(generatedAt: string | null): string {
  const entry = PRICE_EVENT_CALENDAR.find(e => e.id === 'black-friday-2026')
  if (!entry?.start || !entry.end) return ''
  // Sueltos, ICU escribe el mes con mayúscula («Noviembre»): en medio de una frase va en minúscula.
  const weekday = (day: string) =>
    productosVidaToDate(day)!
      .toLocaleDateString(dateLocale('es'), { weekday: 'long', timeZone: TZ })
      .toLowerCase()
  const dayNum = (day: string) => String(Number(day.slice(8, 10)))
  const month = (day: string) =>
    productosVidaToDate(day)!
      .toLocaleDateString(dateLocale('es'), { month: 'long', timeZone: TZ })
      .toLowerCase()
  const sameMonth = entry.start.slice(0, 7) === entry.end.slice(0, 7)
  const range = `del ${weekday(entry.start)} ${dayNum(entry.start)}${sameMonth ? '' : ` de ${month(entry.start)}`} al ${weekday(entry.end)} ${dayNum(entry.end)} de ${month(entry.end)}`
  const year = entry.start.slice(0, 4)
  if (!generatedAt) return `Las fechas del Black Friday ${year}: ${range}.`
  return productosVidaMontevideoDay(generatedAt) <= entry.end
    ? `El Black Friday ${year} va ${range}.`
    : `En ${year} el Black Friday fue ${range}.`
}

export function productosVidaFaq(
  response: ProductosVidaResponse,
  products: readonly ProductosVidaProductEntry[] = PRODUCTOS_VIDA_PRODUCTS
): FaqItem[] {
  const bySlug = new Map(response.products.map(p => [p.slug, p]))
  const mentionsDesc = [...new Set(products.map(p => p.mentions))].sort((a, b) => b - a)
  const groupOf = (n: number) => products.filter(p => p.mentions === n)
  const top = mentionsDesc[0] ?? 0
  const next = mentionsDesc[1]
  const topGroup = groupOf(top)
  const topPhrases = joinSpanish(topGroup.map(p => p.phrase))
  const topEach =
    topGroup.length > 1
      ? topGroup.every(p => /^las? /.test(p.phrase))
        ? ' cada una'
        : ' cada uno'
      : ''
  const nextText =
    next !== undefined
      ? ` Les ${groupOf(next).length === 1 ? 'sigue' : 'siguen'} ${joinSpanish(groupOf(next).map(p => p.phrase))}, con ${peopleWords(next).people}.`
      : ''
  const readOn = productosVidaLongDate(PRODUCTOS_VIDA_THREAD.readOn)
  const postedOn = productosVidaShortDate(PRODUCTOS_VIDA_THREAD.postedOn)
  const postedYear = PRODUCTOS_VIDA_THREAD.postedOn.slice(0, 4)

  const priceAnswer = (slug: string, noun: string): string => {
    const sentence = bandSentence(bySlug.get(slug))
    return sentence
      ? `${readOnClause(response)}: ${sentence} Son precios pedidos: confirmá en el aviso, con el envío.`
      : `Todavía no tenemos una banda de precios reciente de ${noun}. Se completa con la próxima lectura de Mercado Libre; mientras tanto, el enlace de búsqueda de esta página lleva a los avisos.`
  }

  const secarropas = bandSentence(bySlug.get('secarropas'))
  const lavasecarropas = bandSentence(bySlug.get('lavasecarropas'))
  const dryerPrices =
    secarropas || lavasecarropas
      ? ` ${pricesClause(response)} Secarropas: ${secarropas ?? 'todavía sin banda reciente.'} Lavasecarropas: ${lavasecarropas ?? 'todavía sin banda reciente.'}`
      : ''

  const usd =
    response.usdUyu !== null
      ? ` Los avisos en dólares se pasan a pesos a $\u00A0${response.usdUyu.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} por dólar.`
      : ''
  const listings =
    response.listings !== null && response.generatedAt
      ? ` La lectura del ${productosVidaLongDate(response.generatedAt)} aceptó ${response.listings.toLocaleString('es-UY')} avisos.`
      : ''

  return [
    {
      id: 'vida-mas-nombrado',
      question: '¿Qué producto le cambió la vida a más gente en el hilo de r/uruguay?',
      answer: `${capitalize(topPhrases)}, con ${peopleWords(top).people}${topEach}.${nextText} Leímos el ${readOn} el hilo, publicado en r/uruguay el ${postedOn}/${postedYear}, con los ${PRODUCTOS_VIDA_THREAD.comments} comentarios que tenía ese día. ${PRODUCTOS_VIDA_COUNT_RULE}`,
    },
    {
      id: 'vida-freidora',
      question: '¿Cuánto sale una freidora de aire en Uruguay?',
      answer: priceAnswer('freidora-de-aire', 'freidoras de aire'),
    },
    {
      id: 'vida-lavavajillas',
      question: '¿Cuánto sale un lavavajillas y qué hace falta para instalarlo?',
      answer: `${priceAnswer('lavavajillas', 'lavavajillas')} Para instalarlo hace falta una salida de agua y un desagüe cerca: quien abrió el hilo contó que conectar el suyo, de 6 servicios, sólo llevó sumarle a la pileta una canilla tipo lavarropas para la entrada de agua y un adaptador en el sifón para el desagüe.`,
    },
    {
      id: 'vida-secarropas',
      question: '¿Secarropas o lavasecarropas?',
      answer: `En el hilo, el argumento a favor del secarropas fue el poco lugar para tender en un apartamento: la ropa queda seca y lista en unas horas. Una de esas personas pasó a un lavasecarropas, un aparato que lava y seca y no lleva una manguera hacia afuera; en general, el lavasecarropas seca menos kilos de los que lava.${dryerPrices}`,
      link: {
        label: 'Secarropas, en Equipar una casa',
        to: '/equipar-casa-uruguay/secarropas',
      },
    },
    {
      id: 'vida-black-friday',
      question: '¿Conviene esperar al Black Friday para comprarlos?',
      answer: `${blackFridayDates(response.generatedAt)} En el hilo, una persona contó que compró su freidora de aire, como otros aparatos, esperando una oferta en Mercado Libre. Esta página no puede decir si un descuento es real. El seguimiento de CyberLunes y Black Friday lo hace, comparando cada oferta con su propio precio de los días anteriores, pero sólo para lo que ya medimos: equipar la casa, celulares, sillas, monopatines y bicicletas eléctricas.`,
      link: {
        label: 'CyberLunes y Black Friday en Uruguay',
        to: '/ciberlunes-y-black-friday-uruguay',
      },
    },
    {
      id: 'vida-precios',
      question: '¿De dónde salen estos precios?',
      answer: `De avisos nuevos de Mercado Libre Uruguay, leídos cuatro veces por día. El precio típico es la mediana, y la mitad de los avisos sale entre los dos montos que se muestran debajo; se descartan los repuestos, los accesorios y los precios que no pueden ser del producto.${listings}${usd} No vendemos nada y no cobramos por los enlaces.`,
    },
    {
      id: 'vida-sin-precio',
      question: '¿Por qué no aparecen el auto, la libreta o las apps?',
      answer:
        'Aparecen, pero sin precio: no son algo que se compre en Mercado Libre con un precio comparable, o una banda de precio mezclaría cosas muy distintas. Están en la lista de lo que también se nombró, con enlaces a nuestros directorios de autos y motos usados y a la guía de la libreta de conducir.',
    },
  ]
}
