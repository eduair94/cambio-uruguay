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
import type { PriceHistorySeries } from './priceHistory'
import type {
  MotoPublicBand,
  MotoPublicCatalogMeta,
  MotoPublicCurrency,
  MotoPublicFuel,
  MotoPublicListing,
  MotoPublicModel,
  MotoPublicRiskCategory,
  MotoPublicSourceCoverage,
  MotoPublicType,
  MotoPublicYearBand,
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

export const MOTO_SORTS = [
  'recent',
  'price_asc',
  'price_desc',
  'km_asc',
  'year_desc',
  'cc_asc',
  'cc_desc',
] as const
export type MotoSort = (typeof MOTO_SORTS)[number]

/** El orden como lo dice el menú (`title`) y el botón de la barra en el celular (`short`). */
export const MOTO_SORT_ITEMS: ReadonlyArray<{ title: string; value: MotoSort; short: string }> = [
  { title: 'Vistos más recientemente', value: 'recent', short: 'Más recientes' },
  { title: 'Menor precio', value: 'price_asc', short: 'Menor precio' },
  { title: 'Mayor precio', value: 'price_desc', short: 'Mayor precio' },
  { title: 'Menos kilómetros', value: 'km_asc', short: 'Menos km' },
  { title: 'Más nuevas', value: 'year_desc', short: 'Más nuevas' },
  { title: 'Menor cilindrada', value: 'cc_asc', short: 'Menos cc' },
  { title: 'Mayor cilindrada', value: 'cc_desc', short: 'Más cc' },
]

/** La ficha de cada aviso. La de cada MODELO sigue en `MOTOS_PATH/<slug>` (está en el sitemap). */
export const MOTO_AVISO_SEGMENT = 'aviso'
export const motoAvisoPath = (key: string): string => `${MOTOS_PATH}/${MOTO_AVISO_SEGMENT}/${key}`
/** Una clave de aviso: `ml-MLU<n>` (Mercado Libre) o `fb-<n>` (Marketplace). Se valida ANTES de
 * tocar la base. */
export const motoAvisoKeyValid = (key: string): boolean =>
  /^(?:ml-MLU\d{6,14}|fb-\d{6,20})$/.test(key)

export const MOTO_SOURCE_LABEL: Readonly<Record<string, string>> = Object.freeze({
  mercadolibre: 'Mercado Libre',
  facebook: 'Facebook Marketplace',
})

/** El aviso original, sólo si es de una fuente conocida: ML Uruguay o un ítem de Marketplace. */
export function motoSafePermalink(url: string | null | undefined): string {
  const value = String(url ?? '')
  return /^https:\/\/moto\.mercadolibre\.com\.uy\/MLU-/.test(value) ||
    /^https:\/\/www\.facebook\.com\/marketplace\/item\/\d{6,20}\/$/.test(value)
    ? value
    : ''
}
export const MOTO_COMPARE_PATH = `${MOTOS_PATH}/comparar`
/** Cuántos avisos entran en el comparador: los mismos tres que autos. */
export const MOTO_COMPARE_MAX = 3

/** Las claves del comparador como llegan en `?motos=a,b,c`: válidas, sin repetir, hasta el tope. */
export function motoCompareKeys(value: unknown): string[] {
  const raw = Array.isArray(value) ? value.join(',') : typeof value === 'string' ? value : ''
  return [...new Set(raw.split(',').map(key => key.trim()))]
    .filter(motoAvisoKeyValid)
    .slice(0, MOTO_COMPARE_MAX)
}

export interface MotoCompareEntry {
  moto: MotoPublicListing
  /** El aviso no se vio dentro de la ventana de frescura: puede estar vendido. */
  stale: boolean
}

export interface MotoCompareResponse {
  items: MotoCompareEntry[]
  missing: string[]
}

/** El orden de quien comparte, aunque Mongo devuelva las filas en otro (como autos). */
export function motoAssembleComparison(
  keys: readonly string[],
  motos: readonly MotoPublicListing[],
  freshDays: number,
  now = Date.now()
): MotoCompareResponse {
  const byKey = new Map(motos.map(moto => [moto.key, moto]))
  const items: MotoCompareEntry[] = []
  const missing: string[] = []
  for (const key of motoCompareKeys(keys.join(','))) {
    const moto = byKey.get(key)
    if (!moto) {
      missing.push(key)
      continue
    }
    const lastSeen = Date.parse(moto.lastSeen)
    items.push({
      moto,
      stale: !Number.isFinite(lastSeen) || now - lastSeen > (freshDays + 1) * 86_400_000,
    })
  }
  return { items, missing }
}

/** A dónde lleva "Comparar": con las claves puestas (una o varias), o al comparador vacío. */
export function motoCompareSelection(keys: readonly string[]) {
  const valid = motoCompareKeys(keys.join(','))
  return valid.length
    ? { path: MOTO_COMPARE_PATH, query: { motos: valid.join(',') } }
    : { path: MOTO_COMPARE_PATH }
}

/** A dónde lleva "Comparar": con la clave del aviso puesta, o al comparador vacío. */
export function motoCompareLocation(key?: string | null) {
  return key && motoAvisoKeyValid(key)
    ? { path: MOTO_COMPARE_PATH, query: { motos: key } }
    : { path: MOTO_COMPARE_PATH }
}

/** Las familias de color de `classes/autos/bodyType.ts`, que es la que usa el job. */
export const MOTO_COLORS = [
  'negro',
  'blanco',
  'rojo',
  'azul',
  'gris',
  'plata',
  'verde',
  'naranja',
  'amarillo',
  'celeste',
  'bordo',
  'beige',
  'marron',
  'dorado',
  'violeta',
] as const
export const MOTO_COLOR_LABEL: Readonly<Record<string, string>> = Object.freeze({
  negro: 'Negro',
  blanco: 'Blanco',
  rojo: 'Rojo',
  azul: 'Azul',
  gris: 'Gris',
  plata: 'Plata',
  verde: 'Verde',
  naranja: 'Naranja',
  amarillo: 'Amarillo',
  celeste: 'Celeste',
  bordo: 'Bordó',
  beige: 'Beige',
  marron: 'Marrón',
  dorado: 'Dorado',
  violeta: 'Violeta',
})

/** Publicados (vistos por primera vez) en los últimos N días. */
export const MOTO_SINCE_STEPS = [1, 3, 7, 30] as const

/** Los flags de título que ya cuentan como "el vendedor declara algo" (vocabulario de autos). */
export const MOTO_RISK_FLAGS = Object.freeze(['damaged', 'paperwork', 'recovered', 'foreign_plate'])

/** Qué quiere decir cada cosa que el vendedor declara, dicho para una MOTO (las de autos hablan de
 * airbags y escribanía de autos). */
export const MOTO_RISK_GUIDE: Readonly<
  Record<MotoPublicRiskCategory, { label: string; meaning: string; check: string }>
> = Object.freeze({
  deuda: {
    label: 'Deuda, prenda o embargo',
    meaning:
      'La patente impaga va con la moto, no con la persona: la hereda quien la compra. Una prenda o un embargo bloquean la transferencia.',
    check: 'Pedí el certificado del SUCIVE con la matrícula antes de señar.',
  },
  papeles: {
    label: 'Falta un papel para transferir',
    meaning:
      'Sin título a nombre de quien vende, o con la matrícula entregada, la moto no se puede transferir ni circular hasta regularizarla.',
    check: 'Pedí título y libreta a nombre de quien vende, y preguntá cuánto sale regularizar.',
  },
  siniestro: {
    label: 'Chocada o con daños',
    meaning: 'El precio ya tiene adentro una reparación que todavía no se hizo.',
    check:
      'Llevala a un taller antes de señar: chasis, horquilla y que el número de motor coincida con los papeles.',
  },
  recupero: {
    label: 'Recuperada de seguro o robo',
    meaning: 'La aseguradora la dio por perdida y después la vendió. Es legal, y es otro mercado.',
    check: 'Preguntá al seguro antes de comprar si la asegura con ese historial.',
  },
  mecanica: {
    label: 'No anda o se vende por partes',
    meaning: 'No es una moto usada barata: es una moto que hoy no circula, o repuestos.',
    check: 'Sacá la cuenta del arreglo con un mecánico antes de ofertar.',
  },
  chapa_extranjera: {
    label: 'Chapa extranjera',
    meaning:
      'Una moto empadronada afuera no circula acá como una uruguaya: hay que importarla y empadronarla.',
    check: 'Averiguá el costo del trámite completo antes de mirar el precio.',
  },
  uso_intensivo: {
    label: 'Uso intensivo',
    meaning:
      'Delivery, reparto o mucho uso diario: el desgaste es mayor que el que dicen los kilómetros.',
    check: 'Mirá embrague, transmisión y cubiertas con un mecánico.',
  },
})

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
  // Desde el 23/11/2026. Las claves de arriba no cambian: las alertas guardadas las usan.
  /** Texto libre sobre el título. */
  q: string
  precioMinUsd: number | null
  kmMax: number | null
  /** Rango de cilindrada en cc, sobre la mejor cilindrada que hay (dato o estimación). */
  ccMin: number | null
  ccMax: number | null
  color: string
  /** Vistas por primera vez en los últimos N días. */
  dias: number | null
  /** Sólo las que bajaron de precio desde que las miramos. */
  bajo: boolean
  /** Sin deuda, choque, papeles ni recupero DECLARADOS por el vendedor. */
  sinRiesgo: boolean
  /** Sólo las que la ficha declara de único dueño. */
  unicoDueno: boolean
  /** De qué fuente: Mercado Libre o Facebook Marketplace. */
  fuente: string
  sort: MotoSort
  page: number
}

function motoInt(value: unknown, min: number, max: number): number | null {
  const parsed = Math.floor(Number(Array.isArray(value) ? value[0] : value))
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null
  return parsed
}

function motoStr(value: unknown, max = 60): string {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw.trim().slice(0, max) : ''
}

/** "15.000", "US$ 15.000" y "15 000" es como se escribe un monto acá (misma regla que autos). */
function motoAmount(value: unknown, min: number, max: number): number | null {
  const raw = motoStr(value, 20)
    .replace(/u\$s|us\$|usd|\$/gi, '')
    .replace(/[.,\s]/g, '')
  if (!/^\d+$/.test(raw)) return null
  const number = Number(raw)
  return number >= min && number <= max ? number : null
}

/** Un interruptor de la URL: sólo "1" lo prende. */
const motoFlag = (value: unknown): boolean => motoStr(value, 4) === '1'

/** Un rango que llega dado vuelta se da vuelta: es un error de tipeo que la página arregla sola. */
function motoOrdered(min: number | null, max: number | null): [number | null, number | null] {
  return min != null && max != null && min > max ? [max, min] : [min, max]
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
  const [anioDesde, anioHasta] = motoOrdered(
    motoInt(raw.anioDesde, 1950, 2100),
    motoInt(raw.anioHasta, 1950, 2100)
  )
  const [precioMinUsd, precioMaxUsd] = motoOrdered(
    motoAmount(raw.precioMinUsd, 1, 1_000_000),
    motoAmount(raw.precioMaxUsd, 1, 1_000_000)
  )
  const [ccMin, ccMax] = motoOrdered(motoAmount(raw.ccMin, 1, 3000), motoAmount(raw.ccMax, 1, 3000))
  const color = motoStr(raw.color)
  const dias = motoInt(raw.dias, 1, 365)
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
    precioMaxUsd,
    anioDesde,
    anioHasta,
    q: motoStr(raw.q, 80),
    precioMinUsd,
    kmMax: motoAmount(raw.kmMax, 1, 1_000_000),
    ccMin,
    ccMax,
    color: (MOTO_COLORS as readonly string[]).includes(color) ? color : '',
    dias: dias != null && (MOTO_SINCE_STEPS as readonly number[]).includes(dias) ? dias : null,
    bajo: motoFlag(raw.bajo),
    sinRiesgo: motoFlag(raw.sinRiesgo),
    unicoDueno: motoFlag(raw.unicoDueno),
    fuente: motoStr(raw.fuente) in MOTO_SOURCE_LABEL ? motoStr(raw.fuente) : '',
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
  if (query.q) params.q = query.q
  if (query.precioMinUsd != null) params.precioMinUsd = String(query.precioMinUsd)
  if (query.kmMax != null) params.kmMax = String(query.kmMax)
  if (query.ccMin != null) params.ccMin = String(query.ccMin)
  if (query.ccMax != null) params.ccMax = String(query.ccMax)
  if (query.color) params.color = query.color
  if (query.dias != null) params.dias = String(query.dias)
  if (query.bajo) params.bajo = '1'
  if (query.sinRiesgo) params.sinRiesgo = '1'
  if (query.unicoDueno) params.unicoDueno = '1'
  if (query.fuente) params.fuente = query.fuente
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
    if (
      name === 'precioMaxUsd' ||
      name === 'precioMinUsd' ||
      name === 'anioDesde' ||
      name === 'anioHasta' ||
      name === 'kmMax' ||
      name === 'ccMin' ||
      name === 'ccMax' ||
      name === 'dias'
    )
      next[name] = null
    else if (name === 'bajo' || name === 'sinRiesgo' || name === 'unicoDueno') next[name] = false
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
  /** Identidad estable para `:key` (la barra de chips es la de autos). */
  key: string
  keys: MotoQueryKey[]
  label: string
}

/**
 * Los filtros activos, en el orden en que la gente los piensa: qué moto, de qué año, a qué precio,
 * y recién después el detalle. Un slug sin faceta (la marca no tiene avisos hoy) se muestra como
 * slug antes que desaparecer: un filtro invisible es peor que uno mal escrito.
 */
export function motoFilterChips(query: MotoQuery, facets?: MotoFacets): MotoFilterChip[] {
  const chips: Array<Omit<MotoFilterChip, 'key'>> = []
  const named = (list: readonly MotoFacet[] | undefined, slug: string) =>
    list?.find(facet => facet.value === slug)?.label ?? slug
  if (query.q) chips.push({ keys: ['q'], label: `"${query.q}"` })
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
  if (query.ccMin != null && query.ccMax != null) {
    chips.push({ keys: ['ccMin', 'ccMax'], label: `${query.ccMin}–${query.ccMax} cc` })
  } else if (query.ccMin != null) {
    chips.push({ keys: ['ccMin'], label: `Desde ${query.ccMin} cc` })
  } else if (query.ccMax != null) {
    chips.push({ keys: ['ccMax'], label: `Hasta ${query.ccMax} cc` })
  }
  if (query.precioMinUsd != null && query.precioMaxUsd != null) {
    chips.push({
      keys: ['precioMinUsd', 'precioMaxUsd'],
      label: `${motoUsd(query.precioMinUsd)}–${motoUsd(query.precioMaxUsd)}`,
    })
  } else if (query.precioMinUsd != null) {
    chips.push({ keys: ['precioMinUsd'], label: `Desde ${motoUsd(query.precioMinUsd)}` })
  } else if (query.precioMaxUsd != null) {
    chips.push({ keys: ['precioMaxUsd'], label: `Hasta ${motoUsd(query.precioMaxUsd)}` })
  }
  if (query.anioDesde != null && query.anioHasta != null) {
    chips.push({ keys: ['anioDesde', 'anioHasta'], label: `${query.anioDesde}–${query.anioHasta}` })
  } else if (query.anioDesde != null) {
    chips.push({ keys: ['anioDesde'], label: `Desde ${query.anioDesde}` })
  } else if (query.anioHasta != null) {
    chips.push({ keys: ['anioHasta'], label: `Hasta ${query.anioHasta}` })
  }
  if (query.kmMax != null) {
    chips.push({ keys: ['kmMax'], label: `Hasta ${query.kmMax.toLocaleString('es-UY')} km` })
  }
  if (query.color)
    chips.push({ keys: ['color'], label: MOTO_COLOR_LABEL[query.color] ?? query.color })
  if (query.dias != null) {
    chips.push({
      keys: ['dias'],
      label: query.dias === 1 ? 'Vistas hoy' : `Últimos ${query.dias} días`,
    })
  }
  if (query.bajo) chips.push({ keys: ['bajo'], label: 'Bajó de precio' })
  if (query.sinRiesgo) chips.push({ keys: ['sinRiesgo'], label: 'Sin deuda ni choque declarados' })
  if (query.unicoDueno) chips.push({ keys: ['unicoDueno'], label: 'Único dueño' })
  if (query.fuente)
    chips.push({ keys: ['fuente'], label: MOTO_SOURCE_LABEL[query.fuente] ?? query.fuente })
  return chips.map(chip => ({ ...chip, key: chip.keys.join('+') }))
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
  const and: Array<Record<string, unknown>> = []
  if (query.cilindrada) {
    const bucket = MOTO_DISPLACEMENT_BUCKETS.find(item => item.id === query.cilindrada)
    // Manda el TRAMO publicado (el de la faceta del origen, o el de la cilindrada que haya); una
    // fila sin tramo cae a la cilindrada. `$gte/$lte` ya excluye `null`, así que un aviso sin
    // ninguna de las dos no cumple el filtro — la ausencia no es un veredicto.
    if (bucket) {
      and.push({
        $or: [
          { displacementBand: bucket.id },
          { displacementBand: null, displacement: { $gte: bucket.min, $lte: bucket.max } },
        ],
      })
    }
  }
  if (query.ccMin != null || query.ccMax != null) {
    const cc: Record<string, number> = {}
    if (query.ccMin != null) cc.$gte = query.ccMin
    if (query.ccMax != null) cc.$lte = query.ccMax
    match.displacement = cc
  }
  if (query.kmMax != null) match.km = { $ne: null, $lte: query.kmMax }
  if (query.color) match.color = query.color
  if (query.bajo) match.priceDrop = { $ne: null }
  // Sin riesgo DECLARADO: ni en el título ni en la descripción. No afirma que la moto esté limpia,
  // sólo que el vendedor no dijo nada; por eso el filtro se llama así.
  if (query.sinRiesgo) {
    match['risks.0'] = { $exists: false }
    match.flags = { $nin: [...MOTO_RISK_FLAGS] }
  }
  if (query.unicoDueno) match['specs.uniqueOwner'] = true
  if (query.fuente) match.source = query.fuente
  if (query.dias != null) {
    // "Hoy" es desde hoy y "últimos 7 días" es hoy y los seis anteriores: se resta N-1.
    const since = Date.parse(`${today.slice(0, 10)}T12:00:00Z`) - (query.dias - 1) * 86_400_000
    if (Number.isFinite(since))
      match.firstSeen = { $gte: new Date(since).toISOString().slice(0, 10) }
  }
  if (query.q) match.title = { $regex: motoAccentInsensitive(query.q), $options: 'i' }
  if (and.length) match.$and = and
  if (query.anioDesde != null || query.anioHasta != null) {
    const year: Record<string, number> = {}
    if (query.anioDesde != null) year.$gte = query.anioDesde
    if (query.anioHasta != null) year.$lte = query.anioHasta
    match.year = year
  }
  // El tope va sobre el precio convertido por el job, que es lo único comparable entre un aviso en
  // pesos y uno en dólares. Lo que la tarjeta imprime sigue siendo el precio del aviso.
  if (query.precioMaxUsd != null || query.precioMinUsd != null) {
    const price: Record<string, number> = {}
    if (query.precioMinUsd != null) price.$gte = query.precioMinUsd
    if (query.precioMaxUsd != null) price.$lte = query.precioMaxUsd
    match.priceUsd = price
  }
  return match
}

const MOTO_ACCENTS: Record<string, string> = {
  a: '[aáàä]',
  e: '[eéèë]',
  i: '[iíìï]',
  o: '[oóòö]',
  u: '[uúùü]',
  n: '[nñ]',
}

/** El texto como expresión regular que no distingue tildes ("Electrica" encuentra "Eléctrica"). */
export function motoAccentInsensitive(value: string): string {
  const folded = value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
  return folded
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/[aeioun]/g, letter => MOTO_ACCENTS[letter]!)
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
    case 'cc_asc':
      return { displacement: 1, priceUsd: 1 }
    case 'cc_desc':
      return { displacement: -1, priceUsd: 1 }
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

/** ¿La cilindrada de este aviso es una estimación? Entonces se imprime con "≈". */
export const motoDisplacementEstimated = (
  item: Pick<MotoPublicListing, 'displacementBasis'>
): boolean => item.displacementBasis === 'model' || item.displacementBasis === 'model-name'

/** "150 cc" si lo dice el aviso, "≈ 150 cc" si es una estimación, null si no hay ninguna. */
export function motoDisplacementText(
  item: Pick<MotoPublicListing, 'displacement' | 'displacementBasis'>
): string | null {
  if (typeof item.displacement !== 'number' || item.displacement <= 0) return null
  return `${motoDisplacementEstimated(item) ? '≈ ' : ''}${item.displacement} cc`
}

/** De dónde sale la cilindrada, dicho entero: una estimación nunca se presenta como dato. */
export function motoDisplacementSource(
  item: Pick<
    MotoPublicListing,
    'displacement' | 'displacementBasis' | 'displacementVotes' | 'model'
  >
): string | null {
  if (typeof item.displacement !== 'number') return null
  switch (item.displacementBasis) {
    case 'ficha':
      return 'Según la ficha del aviso.'
    case 'title':
      return 'Según el título del aviso.'
    case 'model':
      return item.displacementVotes
        ? `Estimada: es la que declaran ${item.displacementVotes} avisos del mismo modelo.`
        : 'Estimada: es la que declaran los demás avisos del mismo modelo.'
    case 'model-name':
      return `Estimada por el nombre del modelo (${item.model}); puede no ser la cilindrada exacta.`
    default:
      return null
  }
}

/** La moto como se nombra: marca y modelo del origen. */
/** El modelo de un aviso de Mercado Libre que no lo tiene cargado (`classes/motos/identify.ts`). */
export const MOTO_NO_MODEL = 'Sin modelo'

export function motoName(item: Pick<MotoPublicListing, 'brand' | 'model'>): string {
  // "Honda Sin modelo" no nombra nada: la moto se nombra por la marca y el título va debajo.
  if (item.model === MOTO_NO_MODEL) return item.brand.trim()
  return `${item.brand} ${item.model}`.replace(/\s+/g, ' ').trim()
}

/**
 * El título del vendedor, sólo si dice algo más que la marca y el modelo. En motos el título suele
 * ser cualquier cosa ("Color Rojo", "Gs", medido el 23/11/2026), así que el encabezado es la moto y
 * el título va debajo, entre comillas, cuando agrega información.
 */
export function motoSellerTitle(
  item: Pick<MotoPublicListing, 'brand' | 'model' | 'title'>
): string | null {
  const fold = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036F]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  const title = fold(item.title ?? '')
  if (!title) return null
  const name = fold(motoName(item))
  return title === name || name.endsWith(title) ? null : item.title.trim()
}

/** Lo que la tarjeta y la ficha dicen del vendedor en una línea. */
export function motoPlace(
  item: Pick<MotoPublicListing, 'neighborhood' | 'department' | 'sellerType'>
): string {
  return [
    item.neighborhood,
    item.department,
    item.sellerType ? MOTO_SELLER_LABEL[item.sellerType] : null,
  ]
    .filter(Boolean)
    .join(' · ')
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
  /** Desde el 23/11/2026. Opcionales: durante un despliegue la API vieja no los manda. */
  colors?: MotoFacet[]
  bands?: MotoFacet[]
  sources?: MotoFacet[]
}

export const MOTO_EMPTY_FACETS: MotoFacets = Object.freeze({
  brands: [],
  models: [],
  departments: [],
  types: [],
  fuels: [],
  sellers: [],
  colors: [],
  bands: [],
  sources: [],
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
  displacementEstimated: number
  withDetail: number
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

/**
 * El mercado en números del directorio: un recorte del informe que el job guarda en
 * `motomarketsnapshots` bajo `_informe`. Sólo lo que el bloque dibuja; el informe entero no viaja.
 */
export interface MotoMarketSummary {
  generatedAt: string
  adverts: number
  displacements: Array<{ band: string; label: string; adverts: number; medianUsd: number | null }>
  types: Array<{ type: MotoPublicType; adverts: number }>
  budgets: Array<{ maxUsd: number; adverts: number }>
}

/** El recorte, con piso para un informe incompleto: un campo que falta es una lista vacía. */
export function motoMarketSummaryOf(report: unknown): MotoMarketSummary | null {
  const value = report as Partial<{
    generatedAt: string
    adverts: number
    displacements: MotoMarketSummary['displacements']
    types: Array<{ type: MotoPublicType | 'sin-dato'; adverts: number }>
    budgets: Array<{ maxUsd: number; adverts: number }>
  }> | null
  if (!value || typeof value.adverts !== 'number' || value.adverts <= 0) return null
  return {
    generatedAt: String(value.generatedAt ?? ''),
    adverts: value.adverts,
    displacements: (value.displacements ?? []).filter(row => row.adverts > 0),
    types: (value.types ?? [])
      .filter((row): row is { type: MotoPublicType; adverts: number } => row.type !== 'sin-dato')
      .filter(row => row.type in MOTO_TYPE_LABEL && row.adverts > 0)
      .slice(0, 8),
    budgets: (value.budgets ?? [])
      .filter(row => row.adverts > 0)
      .map(row => ({ maxUsd: row.maxUsd, adverts: row.adverts })),
  }
}

/** La ficha de UN aviso (`/motos-usadas-uruguay/aviso/<key>`). */
export interface MotoAvisoResponse {
  moto: MotoPublicListing
  /** La ficha del modelo al que pertenece, si está publicada. */
  model: MotoPublicModel | null
  /** La banda del mismo modelo y año, si tiene muestra. */
  yearBand: MotoPublicYearBand | null
  /** Otras del mismo modelo, las de año más parecido primero. */
  similar: MotoPublicListing[]
  /** Cómo cambió el precio de ESTE aviso desde que lo medimos. */
  priceHistory: PriceHistorySeries | null
  generatedAt: string
}

/** Dónde queda el precio de un aviso contra una banda: debajo del p25, en el centro, arriba del p75. */
export function motoPricePosition(
  priceUsd: number,
  band: Pick<MotoPublicBand, 'p25' | 'median' | 'p75'> | null | undefined
): { tier: 'bajo' | 'centro' | 'alto'; vsMedian: number } | null {
  if (!band || !(band.median > 0) || !(priceUsd > 0)) return null
  const tier = priceUsd < band.p25 ? 'bajo' : priceUsd > band.p75 ? 'alto' : 'centro'
  return { tier, vsMedian: Math.round(((priceUsd - band.median) / band.median) * 100) }
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
    displacementEstimated: meta.displacementEstimated ?? 0,
    withDetail: meta.withDetail ?? 0,
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
  // El mismo orden que la consulta: manda el tramo publicado, y sin tramo, la cilindrada.
  if (item.displacementBand) return item.displacementBand === bucket.id
  if (typeof item.displacement === 'number') {
    return item.displacement >= bucket.min && item.displacement <= bucket.max
  }
  return false
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
    ? ` ${coverage.withoutDisplacementBand.toLocaleString('es-UY')} avisos del catálogo no entran en ningún tramo: ni su ficha ni su título dicen la cilindrada, el vendedor no los clasificó por cilindrada en Mercado Libre y no hay con qué estimarla.`
    : ' La cilindrada sale de la ficha o del título del aviso; si no la dicen, se estima con los demás avisos del mismo modelo y se marca con ≈.'
  return `Por oferta relevada: ${detalle}.${sinDato}`
}
