// La lógica del app para `/computadoras-usadas-uruguay`, su ficha de aviso y
// `/precios-componentes-pc-uruguay`: rutas, filtros, orden, etiquetas y los textos que se calculan
// de los mismos datos que se muestran.
//
// Las formas guardadas están en `app/utils/computadorasPublic.ts` (lo que escribe el job
// `sync_computadoras.ts`); éste es el mismo corte que `motosPublic.ts` / `motos.ts`.
//
// `app/utils` es un namespace PLANO de auto-imports: todo lo exportado acá lleva prefijo
// `computer`/`COMPUTER_`/`COMPUTADORAS_`. Verificado por grep antes de escribir el archivo: ningún
// nombre de acá existe ya en `utils/` ni en `composables/`.
//
// Tres reglas de la casa que este archivo aplica en varios lugares:
//
//   * **Nunca un total parcial presentado como total.** «Armarla nueva sale US$ 400» calculado
//     sobre la mitad de las piezas es el error de la canasta que baja por faltarle ítems
//     (PRECIOS.md). `computerValuationSummary` sólo escribe un total cuando el job lo publicó
//     entero, y si no, cuántas piezas tienen precio y cuáles faltan. `newPartialUsd` no se
//     imprime en ningún lado.
//   * **La ausencia no es un veredicto.** Un aviso sin RAM declarada no cumple un filtro de RAM
//     mínima; un disco del que el aviso no dice el tipo no es «sin SSD» (`hasSsd` queda null y el
//     filtro «sólo SSD» no lo muestra, sin afirmar que no lo tenga).
//   * **La moneda no se mezcla al mostrar.** Cada aviso se imprime en la moneda en la que se
//     publicó, y al lado lo comparable (`priceUsd`, convertido por el job con la cotización de la
//     corrida). El filtro y el orden de precio van en dólares por eso, igual que autos y motos.

import { dateLocale } from './format'
import type {
  ComputerPublicBasis,
  ComputerPublicNotebookReport,
  ComputerPublicOpportunity,
  ComputerPublicComparables,
  ComputerPublicCondition,
  ComputerPublicDrive,
  ComputerPublicFault,
  ComputerPublicKind,
  ComputerPublicListing,
  ComputerPublicMeta,
  ComputerPublicPart,
  ComputerPublicPartRole,
  ComputerPublicPreset,
  ComputerPublicSource,
  ComputerPublicSourceRun,
  ComputerPublicValuation,
  ComputerPublicVerdict,
} from './computadorasPublic'

export const COMPUTADORAS_PATH = '/computadoras-usadas-uruguay'
export const COMPUTER_COMPONENTS_PATH = '/precios-componentes-pc-uruguay'

/** El documento publicado de `computermetas`. Se exporta para que las tres rutas nombren el mismo. */
export const COMPUTER_META_ID = 'uy-computadoras'

export const COMPUTERS_PER_PAGE = 30

/** Piso por si el documento de la corrida no llegó: el job publica su propio `freshDays` (4 hoy,
 * `classes/computadoras/types.ts`) y ése manda. Nunca se borra nada, sólo deja de listarse. */
export const COMPUTER_FRESH_DAYS_FALLBACK = 4

/** La ficha de cada aviso. Noindex: un aviso de Marketplace vence en días. */
export const COMPUTER_AVISO_SEGMENT = 'aviso'
export const computerAvisoPath = (slug: string): string =>
  `${COMPUTADORAS_PATH}/${COMPUTER_AVISO_SEGMENT}/${slug}`

/** Un slug de aviso: `ml-MLU<n>` (Mercado Libre) o `fb-<n>` (Marketplace). Se valida ANTES de
 * tocar la base: una forma que no puede coincidir con ningún documento no gasta una ida a Mongo. */
export const computerAvisoSlugValid = (slug: string): boolean =>
  /^(?:ml-MLU\d{6,14}|fb-\d{6,20})$/.test(slug)

/**
 * El ancla de una pieza en la tabla de componentes. La identidad lleva dos puntos
 * (`cpu:i5-12400f`, `ram:ddr4:16`), que en un `id` son válidos pero en un selector CSS y en algunos
 * lectores de enlaces no; se cambian por guiones. La ficha del aviso usa la MISMA función para
 * enlazar, así que las dos puntas no pueden divergir.
 */
export function computerPartAnchor(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const computerPartLink = (slug: string): string =>
  `${COMPUTER_COMPONENTS_PATH}#${computerPartAnchor(slug)}`

// ── Etiquetas ──────────────────────────────────────────────────────────────

export const COMPUTER_SOURCE_LABEL: Readonly<Record<ComputerPublicSource, string>> = Object.freeze({
  facebook: 'Facebook Marketplace',
  mercadolibre: 'Mercado Libre',
})

export const COMPUTER_MACHINE_KINDS = Object.freeze([
  'notebook',
  'desktop',
  'all-in-one',
  'mini-pc',
] as const)
export const COMPUTER_PART_KINDS = Object.freeze([
  'gpu',
  'cpu',
  'ram',
  'storage',
  'motherboard',
  'psu',
  'combo',
] as const)

export const COMPUTER_KIND_LABEL: Readonly<Record<ComputerPublicKind, string>> = Object.freeze({
  notebook: 'Notebook',
  desktop: 'PC de escritorio',
  'all-in-one': 'All-in-one',
  'mini-pc': 'Mini PC',
  gpu: 'Placa de video',
  cpu: 'Procesador',
  ram: 'Memoria RAM',
  storage: 'Disco',
  motherboard: 'Mother',
  psu: 'Fuente',
  combo: 'Combo mother + procesador',
})

/** El plural de cada tipo, para «Otras PCs de escritorio con Core i5». No se arma bajando a
 * minúsculas la etiqueta: «PC» y «RAM» son siglas y «pc de escritorio» se lee como un error. */
export const COMPUTER_KIND_PLURAL: Readonly<Record<ComputerPublicKind, string>> = Object.freeze({
  notebook: 'notebooks',
  desktop: 'PCs de escritorio',
  'all-in-one': 'all-in-one',
  'mini-pc': 'mini PC',
  gpu: 'placas de video',
  cpu: 'procesadores',
  ram: 'memorias RAM',
  storage: 'discos',
  motherboard: 'mothers',
  psu: 'fuentes',
  combo: 'combos de mother y procesador',
})

export const COMPUTER_ROLE_LABEL: Readonly<Record<ComputerPublicPartRole, string>> = Object.freeze({
  cpu: 'Procesador',
  gpu: 'Placa de video',
  ram: 'Memoria RAM',
  storage: 'Disco',
  motherboard: 'Mother',
  psu: 'Fuente',
  case: 'Gabinete',
})

/** Los títulos de las tablas de `/precios-componentes-pc-uruguay`, en el orden en que se arma una
 * PC: lo que más pesa en el precio primero. */
export const COMPUTER_ROLE_TABLES: ReadonlyArray<{
  role: ComputerPublicPartRole
  title: string
  id: string
}> = Object.freeze([
  { role: 'cpu', title: 'Procesadores', id: 'procesadores' },
  { role: 'gpu', title: 'Placas de video', id: 'placas-de-video' },
  { role: 'ram', title: 'Memoria RAM', id: 'memoria-ram' },
  { role: 'storage', title: 'Discos', id: 'discos' },
  { role: 'motherboard', title: 'Mothers', id: 'mothers' },
  { role: 'psu', title: 'Fuentes', id: 'fuentes' },
  { role: 'case', title: 'Gabinetes', id: 'gabinetes' },
])

export const COMPUTER_CPU_BRAND_LABEL: Readonly<Record<'intel' | 'amd' | 'apple', string>> =
  Object.freeze({ intel: 'Intel', amd: 'AMD', apple: 'Apple' })

/** Las familias que escribe `classes/computadoras/cpu.ts`. Una familia nueva que el job empiece a
 * escribir y no esté acá se muestra igual, con su slug capitalizado: un filtro con un nombre feo
 * es mejor que uno que desaparece. */
const COMPUTER_CPU_FAMILY_LABEL: Readonly<Record<string, string>> = Object.freeze({
  'core-i3': 'Core i3',
  'core-i5': 'Core i5',
  'core-i7': 'Core i7',
  'core-i9': 'Core i9',
  'core-ultra-5': 'Core Ultra 5',
  'core-ultra-7': 'Core Ultra 7',
  'core-ultra-9': 'Core Ultra 9',
  'core-2': 'Core 2',
  'intel-n': 'Intel N',
  celeron: 'Celeron',
  pentium: 'Pentium',
  xeon: 'Xeon',
  'ryzen-3': 'Ryzen 3',
  'ryzen-5': 'Ryzen 5',
  'ryzen-7': 'Ryzen 7',
  'ryzen-9': 'Ryzen 9',
  threadripper: 'Threadripper',
  fx: 'AMD FX',
  athlon: 'Athlon',
  'a-series': 'AMD serie A',
  sempron: 'Sempron',
  phenom: 'Phenom',
  'apple-m': 'Apple M',
})

export function computerCpuFamilyLabel(family: string | null | undefined): string {
  if (!family) return ''
  const known = COMPUTER_CPU_FAMILY_LABEL[family]
  if (known) return known
  const text = family.replace(/-/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export const COMPUTER_CONDITION_LABEL: Readonly<Record<ComputerPublicCondition, string>> =
  Object.freeze({
    new: 'Nuevo',
    'like-new': 'Como nuevo',
    good: 'Buen estado',
    fair: 'Estado aceptable',
  })

/** Lo que el texto del aviso dice que falla, en las palabras con las que se dice. Nunca una
 * conclusión nuestra: la tarjeta lo presenta como «El aviso dice: …». */
export const COMPUTER_FAULT_LABEL: Readonly<Record<ComputerPublicFault, string>> = Object.freeze({
  'no-enciende': 'no enciende',
  'no-da-video': 'no da video',
  'para-repuesto': 'para repuesto',
  pantalla: 'pantalla con problemas',
  teclado: 'teclado con problemas',
  bateria: 'batería con problemas',
  bloqueada: 'bloqueada',
  'sin-disco': 'sin disco',
  'sin-cargador': 'sin cargador',
  falla: 'tiene una falla',
})

export function computerFaultsLine(faults: readonly ComputerPublicFault[] | null | undefined) {
  const list = (faults ?? []).map(fault => COMPUTER_FAULT_LABEL[fault] ?? fault)
  return list.length ? `El aviso dice: ${list.join(', ')}` : null
}

/** De dónde sale cada dato leído. */
export const COMPUTER_BASIS_LABEL: Readonly<Record<ComputerPublicBasis, string>> = Object.freeze({
  title: 'Según el título del aviso',
  description: 'Según la descripción del aviso',
  facebook: 'Según los datos que el vendedor cargó en Facebook',
  mercadolibre: 'Según la ficha de Mercado Libre',
})

// ── Rutas a la fuente ──────────────────────────────────────────────────────

/** El aviso original, sólo si es de una fuente conocida: un ítem de Marketplace o Mercado Libre
 * Uruguay. Cualquier otra cosa no se enlaza (el dato viene de una página de terceros). */
export function computerSafePermalink(url: string | null | undefined): string {
  const value = String(url ?? '')
  return /^https:\/\/www\.facebook\.com\/marketplace\/item\/\d{6,20}\/?$/.test(value) ||
    /^https:\/\/[a-z0-9-]+\.mercadolibre\.com\.uy\/\S*$/.test(value)
    ? value
    : ''
}

/**
 * La oferta nueva más barata de una pieza: Mercado Libre Uruguay o una tienda de informática
 * uruguaya (el job suma las que tienen un catálogo legible, como thotcomputacion.com.uy, medido en
 * la primera corrida real). Se enlaza sólo una URL https con dominio y sin credenciales: el dato
 * viene de una página de terceros y un `javascript:` o un `http://usuario@` no se dibuja nunca.
 */
export function computerSafeOfferUrl(url: string | null | undefined): string {
  const value = String(url ?? '')
  return /^https:\/\/(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?$/i.test(value) ? value : ''
}

/** El sitio de una oferta, para decir dónde está («en thotcomputacion.com.uy»). */
export function computerOfferHost(url: string | null | undefined): string {
  const match = /^https:\/\/(?:www\.)?([^/]+)/i.exec(String(url ?? ''))
  if (!match) return ''
  return /mercadolibre\.com\.uy$/i.test(match[1]!) ? 'Mercado Libre' : match[1]!.toLowerCase()
}

// ── La consulta ────────────────────────────────────────────────────────────

/**
 * `tipo` vacío es la vista por defecto: las computadoras enteras. Las piezas sueltas son otro
 * mercado (una RTX 3080 de US$ 550 al lado de una notebook de US$ 300 desordena cualquier lista
 * por precio), así que se ven pidiéndolas. `piezas` son todas las piezas y `todos` es todo junto.
 */
export const COMPUTER_TIPOS = Object.freeze([
  ...COMPUTER_MACHINE_KINDS,
  ...COMPUTER_PART_KINDS,
  'piezas',
  'todos',
] as const)
export type ComputerTipo = '' | (typeof COMPUTER_TIPOS)[number]

export const COMPUTER_SORTS = Object.freeze([
  'recientes',
  'precio_asc',
  'precio_desc',
  'relacion',
  'completos',
  'ram',
  'ahorro',
  'cpu_nuevo',
  'disco',
] as const)
export type ComputerSort = (typeof COMPUTER_SORTS)[number]

/** El orden como lo dice el menú (`title`) y el botón de la barra en el celular (`short`). */
export const COMPUTER_SORT_ITEMS: ReadonlyArray<{
  title: string
  value: ComputerSort
  short: string
}> = Object.freeze([
  { title: 'Más recientes', value: 'recientes', short: 'Más recientes' },
  { title: 'Menor precio', value: 'precio_asc', short: 'Menor precio' },
  { title: 'Mayor precio', value: 'precio_desc', short: 'Mayor precio' },
  { title: 'Mejor relación', value: 'relacion', short: 'Mejor relación' },
  { title: 'Más datos leídos', value: 'completos', short: 'Más completos' },
  { title: 'Más memoria RAM', value: 'ram', short: 'Más RAM' },
  { title: 'Mayor ahorro', value: 'ahorro', short: 'Mayor ahorro' },
  { title: 'Procesador más nuevo', value: 'cpu_nuevo', short: 'CPU más nuevo' },
  { title: 'Más almacenamiento', value: 'disco', short: 'Más disco' },
])

/** RAM mínima: los tres escalones en los que la gente piensa la memoria hoy. */
export const COMPUTER_RAM_STEPS = Object.freeze([8, 16, 32] as const)
/** Los que acepta la URL además de esos: el informe de notebooks enlaza cada fila de RAM (4, 12,
 * 24 GB…) con su mínimo, y un enlace que el panel no ofrece igual tiene que filtrar. */
const COMPUTER_RAM_ACCEPTED: readonly number[] = Object.freeze([4, 6, 8, 12, 16, 24, 32, 48, 64])
/** «Procesador de 2020 o más nuevo»: el año de la SERIE, que es lo que el aviso deja saber. */
export const COMPUTER_CPU_YEAR_STEPS = Object.freeze([2015, 2018, 2020, 2022, 2024] as const)
export const COMPUTER_DISK_STEPS = Object.freeze([256, 512, 1000] as const)
export const COMPUTER_VRAM_STEPS = Object.freeze([4, 6, 8, 12] as const)
export const COMPUTER_RAM_TYPES = Object.freeze(['ddr3', 'ddr4', 'ddr5'] as const)
/** La pantalla en tres tamaños, como se piensa una notebook: la que se lleva, la de todos los días
 * y la que casi no sale de la casa. El hueco entre 14,5″ y 15″ es a propósito: no hay pantallas ahí. */
export const COMPUTER_SCREEN_SIZES = Object.freeze({
  chica: { label: 'Hasta 14,5″', min: null, max: 14.5 },
  media: { label: 'De 15″ a 16,5″', min: 15, max: 16.5 },
  grande: { label: '17″ o más', min: 17, max: null },
} as const)
export type ComputerScreenSize = keyof typeof COMPUTER_SCREEN_SIZES
export const COMPUTER_SELLER_LABEL = Object.freeze({
  tienda: 'Tienda',
  particular: 'Particular',
} as const)
export const COMPUTER_TIER_LABEL = Object.freeze({
  solida: 'Comparación sólida',
  exploratoria: 'Comparación exploratoria',
} as const)
export type ComputerTier = keyof typeof COMPUTER_TIER_LABEL
/** Publicados en los últimos N días. */
export const COMPUTER_SINCE_STEPS = Object.freeze([1, 3, 7, 30] as const)
/** Los veredictos que cuentan como «pide menos que sus piezas». */
export const COMPUTER_BELOW_VERDICTS: readonly ComputerPublicVerdict[] = Object.freeze([
  'muy-por-debajo',
  'por-debajo',
])

export interface ComputerQuery {
  /** Texto libre sobre el título. */
  q: string
  tipo: ComputerTipo
  /** Marca del procesador. */
  marca: '' | 'intel' | 'amd' | 'apple'
  /** Familia del procesador (`core-i5`, `ryzen-5`…), tal como la publica el catálogo. */
  familia: string
  /** Un procesador exacto (`cpu:i5-12400f`): lo usa la tabla de componentes para enlazar. */
  procesador: string
  /** Una placa de video dedicada exacta (`gpu:rtx-3060`). */
  placa: string
  /** Sólo con placa de video dedicada. */
  dedicada: boolean
  ramMin: number | null
  /** Sólo con algún disco SSD declarado. */
  ssd: boolean
  /** Rango EN DÓLARES: es la única escala comparable entre avisos en pesos y en dólares. */
  precioMinUsd: number | null
  precioMaxUsd: number | null
  departamento: string
  fuente: '' | ComputerPublicSource
  /** Sin fallas DECLARADAS en el texto del aviso. */
  sinFallas: boolean
  /** Pide menos que su referencia —sus piezas o las máquinas iguales— (`muy-por-debajo` o
   * `por-debajo`). */
  debajo: boolean
  /** Publicados en los últimos N días. */
  dias: number | null
  // Desde el 24/11/2026. Las claves de arriba no cambian: hay enlaces compartidos con ellas.
  /** La marca del EQUIPO (Lenovo, Apple…), no la del procesador. */
  marcaEquipo: string
  /** La línea de notebook (`thinkpad`, `macbook-air`…). */
  linea: string
  /** El procesador es de una serie de este año o más nueva. */
  cpuAnio: number | null
  ramTipo: '' | (typeof COMPUTER_RAM_TYPES)[number]
  /** Almacenamiento total mínimo, en GB. */
  discoMin: number | null
  pantalla: '' | ComputerScreenSize
  /** Memoria mínima de la placa de video, en GB. */
  vramMin: number | null
  estado: '' | ComputerPublicCondition
  /** Tienda o particular: sólo lo sabe Mercado Libre. */
  vendedor: '' | keyof typeof COMPUTER_SELLER_LABEL
  /** Al menos tres datos leídos (procesador, RAM, disco…). */
  conDatos: boolean
  /** Incluye monitor. */
  monitor: boolean
  /** Sólo las que el job marcó como oportunidad. */
  oportunidad: boolean
  /** Sólo oportunidades con esa evidencia. */
  evidencia: '' | ComputerTier
  orden: ComputerSort
  pagina: number
}

export type ComputerQueryKey = keyof ComputerQuery

function computerStr(value: unknown, max = 60): string {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw.trim().slice(0, max) : ''
}

function computerInt(value: unknown, min: number, max: number): number | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === '' || raw == null) return null
  const parsed = Math.floor(Number(raw))
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null
  return parsed
}

/** "1.500", "US$ 1.500" y "1 500" es como se escribe un monto acá (misma regla que autos). */
function computerAmount(value: unknown, min: number, max: number): number | null {
  const raw = computerStr(value, 20)
    .replace(/u\$s|us\$|usd|\$/gi, '')
    .replace(/[.,\s]/g, '')
  if (!/^\d+$/.test(raw)) return null
  const number = Number(raw)
  return number >= min && number <= max ? number : null
}

const computerFlag = (value: unknown): boolean => computerStr(value, 4) === '1'

/** Un valor de una lista cerrada, o vacío. */
function computerOneOf<T extends string>(value: unknown, allowed: readonly T[]): T | '' {
  const raw = computerStr(value) as T
  return allowed.includes(raw) ? raw : ''
}

/** Un número de una lista cerrada de escalones, o null. */
function computerStep(value: unknown, allowed: readonly number[]): number | null {
  const parsed = computerInt(value, 1, 100_000)
  return parsed != null && allowed.includes(parsed) ? parsed : null
}

/** La marca del equipo como la escribe el catálogo («Lenovo», «HP», «Apple»): letras, dígitos y
 * pocos signos. Se compara sin distinguir mayúsculas, así que «lenovo» encuentra «Lenovo». */
const COMPUTER_BRAND_RE = /^[\p{L}\p{N}][\p{L}\p{N} .&+-]{0,39}$/u

/** Un slug de faceta: minúsculas, dígitos, guiones y puntos; la identidad de pieza lleva su rol
 * adelante con dos puntos. Cualquier otra forma no puede coincidir con un documento. */
const COMPUTER_FACET_SLUG_RE = /^[a-z0-9][a-z0-9.+-]{0,60}$/
const computerPieceSlug = (value: unknown, role: 'cpu' | 'gpu'): string => {
  const raw = computerStr(value, 80).toLowerCase()
  const [prefix, rest] = [raw.slice(0, role.length + 1), raw.slice(role.length + 1)]
  return prefix === `${role}:` && COMPUTER_FACET_SLUG_RE.test(rest) ? raw : ''
}

/** Normaliza la query de la URL. Un rango de precio dado vuelta se da vuelta: es un error de
 * tipeo que la página arregla sola, en vez de devolver cero resultados. */
export function computerNormalizeQuery(raw: Record<string, unknown>): ComputerQuery {
  const tipo = computerStr(raw.tipo) as ComputerTipo
  const marca = computerStr(raw.marca) as ComputerQuery['marca']
  const familia = computerStr(raw.familia).toLowerCase()
  const fuente = computerStr(raw.fuente) as ComputerQuery['fuente']
  const orden = computerStr(raw.orden) as ComputerSort
  const ramMin = computerInt(raw.ramMin, 1, 1024)
  const dias = computerInt(raw.dias, 1, 365)
  const marcaEquipo = computerStr(raw.marcaEquipo, 40)
  const linea = computerStr(raw.linea).toLowerCase()
  let precioMinUsd = computerAmount(raw.precioMinUsd, 1, 100_000)
  let precioMaxUsd = computerAmount(raw.precioMaxUsd, 1, 100_000)
  if (precioMinUsd != null && precioMaxUsd != null && precioMinUsd > precioMaxUsd)
    [precioMinUsd, precioMaxUsd] = [precioMaxUsd, precioMinUsd]
  return {
    q: computerStr(raw.q, 80),
    tipo: (COMPUTER_TIPOS as readonly string[]).includes(tipo) ? tipo : '',
    marca: marca === 'intel' || marca === 'amd' || marca === 'apple' ? marca : '',
    familia: COMPUTER_FACET_SLUG_RE.test(familia) ? familia : '',
    procesador: computerPieceSlug(raw.procesador, 'cpu'),
    placa: computerPieceSlug(raw.placa, 'gpu'),
    dedicada: computerFlag(raw.dedicada),
    ramMin: ramMin != null && COMPUTER_RAM_ACCEPTED.includes(ramMin) ? ramMin : null,
    ssd: computerFlag(raw.ssd),
    precioMinUsd,
    precioMaxUsd,
    departamento: computerStr(raw.departamento),
    fuente: fuente in COMPUTER_SOURCE_LABEL ? fuente : '',
    sinFallas: computerFlag(raw.sinFallas),
    debajo: computerFlag(raw.debajo),
    dias: dias != null && (COMPUTER_SINCE_STEPS as readonly number[]).includes(dias) ? dias : null,
    marcaEquipo: COMPUTER_BRAND_RE.test(marcaEquipo) ? marcaEquipo : '',
    linea: COMPUTER_FACET_SLUG_RE.test(linea) ? linea : '',
    cpuAnio: computerStep(raw.cpuAnio, COMPUTER_CPU_YEAR_STEPS),
    ramTipo: computerOneOf(raw.ramTipo, COMPUTER_RAM_TYPES),
    discoMin: computerStep(raw.discoMin, COMPUTER_DISK_STEPS),
    pantalla: computerOneOf(
      raw.pantalla,
      Object.keys(COMPUTER_SCREEN_SIZES) as ComputerScreenSize[]
    ),
    vramMin: computerStep(raw.vramMin, COMPUTER_VRAM_STEPS),
    estado: computerOneOf(
      raw.estado,
      Object.keys(COMPUTER_CONDITION_LABEL) as ComputerPublicCondition[]
    ),
    vendedor: computerOneOf(
      raw.vendedor,
      Object.keys(COMPUTER_SELLER_LABEL) as Array<keyof typeof COMPUTER_SELLER_LABEL>
    ),
    conDatos: computerFlag(raw.conDatos),
    monitor: computerFlag(raw.monitor),
    oportunidad: computerFlag(raw.oportunidad),
    evidencia: computerOneOf(raw.evidencia, Object.keys(COMPUTER_TIER_LABEL) as ComputerTier[]),
    orden: (COMPUTER_SORTS as readonly string[]).includes(orden) ? orden : 'recientes',
    pagina: computerInt(raw.pagina, 1, 500) ?? 1,
  }
}

/** La query como parámetros de URL, sin los vacíos: una URL corta se comparte y no multiplica
 * copias finas de la misma página. */
export function computerQueryParams(query: ComputerQuery): Record<string, string> {
  const params: Record<string, string> = {}
  if (query.q) params.q = query.q
  if (query.tipo) params.tipo = query.tipo
  if (query.marca) params.marca = query.marca
  if (query.familia) params.familia = query.familia
  if (query.procesador) params.procesador = query.procesador
  if (query.placa) params.placa = query.placa
  if (query.dedicada) params.dedicada = '1'
  if (query.ramMin != null) params.ramMin = String(query.ramMin)
  if (query.ssd) params.ssd = '1'
  if (query.precioMinUsd != null) params.precioMinUsd = String(query.precioMinUsd)
  if (query.precioMaxUsd != null) params.precioMaxUsd = String(query.precioMaxUsd)
  if (query.departamento) params.departamento = query.departamento
  if (query.fuente) params.fuente = query.fuente
  if (query.sinFallas) params.sinFallas = '1'
  if (query.debajo) params.debajo = '1'
  if (query.dias != null) params.dias = String(query.dias)
  if (query.marcaEquipo) params.marcaEquipo = query.marcaEquipo
  if (query.linea) params.linea = query.linea
  if (query.cpuAnio != null) params.cpuAnio = String(query.cpuAnio)
  if (query.ramTipo) params.ramTipo = query.ramTipo
  if (query.discoMin != null) params.discoMin = String(query.discoMin)
  if (query.pantalla) params.pantalla = query.pantalla
  if (query.vramMin != null) params.vramMin = String(query.vramMin)
  if (query.estado) params.estado = query.estado
  if (query.vendedor) params.vendedor = query.vendedor
  if (query.conDatos) params.conDatos = '1'
  if (query.monitor) params.monitor = '1'
  if (query.oportunidad) params.oportunidad = '1'
  if (query.evidencia) params.evidencia = query.evidencia
  if (query.orden !== 'recientes') params.orden = query.orden
  if (query.pagina > 1) params.pagina = String(query.pagina)
  return params
}

/** ¿Hay algún filtro puesto? Decide el `robots`: cada combinación es una copia fina del
 * directorio y sólo la URL base se indexa. El orden no cuenta: reordenar no crea una página. */
export function computerFiltered(query: ComputerQuery): boolean {
  return Object.keys(computerQueryParams(query)).some(name => name !== 'orden')
}

/** Saca uno o varios filtros sin tocar el resto (los chips). Siempre vuelve a la página 1. */
export function computerQueryWithout(
  query: ComputerQuery,
  keys: readonly ComputerQueryKey[]
): ComputerQuery {
  const next: ComputerQuery = { ...query, pagina: 1 }
  for (const name of keys) {
    if (
      name === 'ramMin' ||
      name === 'precioMinUsd' ||
      name === 'precioMaxUsd' ||
      name === 'dias' ||
      name === 'cpuAnio' ||
      name === 'discoMin' ||
      name === 'vramMin'
    )
      next[name] = null
    else if (
      name === 'dedicada' ||
      name === 'ssd' ||
      name === 'sinFallas' ||
      name === 'debajo' ||
      name === 'conDatos' ||
      name === 'monitor' ||
      name === 'oportunidad'
    )
      next[name] = false
    else if (name === 'orden') next.orden = 'recientes'
    else if (name === 'pagina') next.pagina = 1
    else if (name === 'marca') {
      // Sacar la marca saca la familia y el procesador: una familia huérfana de su marca es un
      // filtro que el lector no puede volver a encontrar en ninguna lista.
      next.marca = ''
      next.familia = ''
      next.procesador = ''
    } else if (name === 'familia') {
      next.familia = ''
      next.procesador = ''
    } else if (name === 'marcaEquipo') {
      // Igual con el equipo: una línea (ThinkPad) sin su marca no se encuentra en ninguna lista.
      next.marcaEquipo = ''
      next.linea = ''
    } else if (name === 'tipo') next.tipo = ''
    else if (name === 'fuente') next.fuente = ''
    else if (name === 'ramTipo') next.ramTipo = ''
    else if (name === 'pantalla') next.pantalla = ''
    else if (name === 'estado') next.estado = ''
    else if (name === 'vendedor') next.vendedor = ''
    else if (name === 'evidencia') next.evidencia = ''
    else if (name === 'q' || name === 'familia' || name === 'procesador' || name === 'placa')
      next[name] = ''
    else if (name === 'departamento' || name === 'linea') next[name] = ''
  }
  return next
}

/** El nombre legible de una identidad de pieza cuando no hay faceta que lo traiga
 * (`gpu:rtx-3060-ti` → «RTX 3060 TI»). Sólo para el chip: la página nunca afirma nada con esto. */
export function computerSlugText(slug: string): string {
  return slug
    .replace(/^[a-z]+:/, '')
    .replace(/-/g, ' ')
    .toUpperCase()
}

/** `macbook-air` → «Macbook air»: el nombre de una línea cuando la faceta no lo trae. */
export function computerSlugTitle(slug: string): string {
  const text = slug.replace(/-/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function computerTipoLabel(tipo: ComputerTipo): string {
  if (!tipo) return 'Computadoras'
  if (tipo === 'piezas') return 'Piezas sueltas'
  if (tipo === 'todos') return 'Computadoras y piezas'
  return COMPUTER_KIND_LABEL[tipo] ?? tipo
}

export interface ComputerFilterChip {
  key: string
  keys: ComputerQueryKey[]
  label: string
}

/** Los filtros activos, en el orden en que la gente los piensa: qué es, qué tiene adentro, cuánto
 * sale y recién después el detalle. La vista por defecto (computadoras) no es un chip. */
export function computerFilterChips(
  query: ComputerQuery,
  facets?: ComputerFacets
): ComputerFilterChip[] {
  const chips: Array<Omit<ComputerFilterChip, 'key'>> = []
  const named = (list: readonly ComputerFacet[] | undefined, slug: string, fallback: string) =>
    list?.find(facet => facet.value === slug)?.label ?? fallback
  if (query.q) chips.push({ keys: ['q'], label: `"${query.q}"` })
  if (query.tipo) chips.push({ keys: ['tipo'], label: computerTipoLabel(query.tipo) })
  if (query.marcaEquipo)
    chips.push({
      keys: ['marcaEquipo'],
      label: named(facets?.brands, query.marcaEquipo, query.marcaEquipo),
    })
  if (query.linea)
    chips.push({
      keys: ['linea'],
      label: named(facets?.lines, query.linea, computerSlugTitle(query.linea)),
    })
  if (query.marca) chips.push({ keys: ['marca'], label: COMPUTER_CPU_BRAND_LABEL[query.marca] })
  if (query.familia)
    chips.push({
      keys: ['familia'],
      label: named(facets?.cpuFamilies, query.familia, computerCpuFamilyLabel(query.familia)),
    })
  if (query.procesador)
    chips.push({ keys: ['procesador'], label: computerSlugText(query.procesador) })
  if (query.placa)
    chips.push({
      keys: ['placa'],
      label: named(facets?.gpus, query.placa, computerSlugText(query.placa)),
    })
  if (query.cpuAnio != null)
    chips.push({ keys: ['cpuAnio'], label: `Procesador de ${query.cpuAnio} o más nuevo` })
  if (query.dedicada) chips.push({ keys: ['dedicada'], label: 'Con placa de video dedicada' })
  if (query.vramMin != null)
    chips.push({ keys: ['vramMin'], label: `Placa con ${query.vramMin} GB o más` })
  if (query.ramMin != null)
    chips.push({ keys: ['ramMin'], label: `${query.ramMin} GB de RAM o más` })
  if (query.ramTipo) chips.push({ keys: ['ramTipo'], label: `RAM ${query.ramTipo.toUpperCase()}` })
  if (query.ssd) chips.push({ keys: ['ssd'], label: 'Con SSD' })
  if (query.discoMin != null)
    chips.push({ keys: ['discoMin'], label: `${computerGbLabel(query.discoMin)} o más de disco` })
  if (query.pantalla)
    chips.push({
      keys: ['pantalla'],
      label: `Pantalla ${COMPUTER_SCREEN_SIZES[query.pantalla].label.toLowerCase()}`,
    })
  if (query.precioMinUsd != null && query.precioMaxUsd != null) {
    chips.push({
      keys: ['precioMinUsd', 'precioMaxUsd'],
      label: `${computerUsd(query.precioMinUsd)}–${computerUsd(query.precioMaxUsd)}`,
    })
  } else if (query.precioMinUsd != null) {
    chips.push({ keys: ['precioMinUsd'], label: `Desde ${computerUsd(query.precioMinUsd)}` })
  } else if (query.precioMaxUsd != null) {
    chips.push({ keys: ['precioMaxUsd'], label: `Hasta ${computerUsd(query.precioMaxUsd)}` })
  }
  if (query.departamento) chips.push({ keys: ['departamento'], label: query.departamento })
  if (query.fuente) chips.push({ keys: ['fuente'], label: COMPUTER_SOURCE_LABEL[query.fuente] })
  if (query.sinFallas) chips.push({ keys: ['sinFallas'], label: 'Sin fallas declaradas' })
  if (query.debajo) chips.push({ keys: ['debajo'], label: 'Pide menos de lo que vale' })
  if (query.oportunidad) chips.push({ keys: ['oportunidad'], label: 'Sólo oportunidades' })
  if (query.evidencia)
    chips.push({ keys: ['evidencia'], label: COMPUTER_TIER_LABEL[query.evidencia] })
  if (query.estado) chips.push({ keys: ['estado'], label: COMPUTER_CONDITION_LABEL[query.estado] })
  if (query.vendedor)
    chips.push({
      keys: ['vendedor'],
      label: `Vende: ${COMPUTER_SELLER_LABEL[query.vendedor].toLowerCase()}`,
    })
  if (query.conDatos) chips.push({ keys: ['conDatos'], label: 'Con al menos tres datos' })
  if (query.monitor) chips.push({ keys: ['monitor'], label: 'Incluye monitor' })
  if (query.dias != null)
    chips.push({
      keys: ['dias'],
      label: query.dias === 1 ? 'Publicados hoy' : `Últimos ${query.dias} días`,
    })
  return chips.map(chip => ({ ...chip, key: chip.keys.join('+') }))
}

// ── El filtro de Mongo, y su evaluador en memoria ──────────────────────────

/** `YYYY-MM-DD` desde el cual un aviso sigue listándose. Se compara como string contra `lastSeen`,
 * que es correcto tanto si el job guarda la fecha sola como si guarda fecha y hora. */
export function computerFreshFloor(today: string, days: number = COMPUTER_FRESH_DAYS_FALLBACK) {
  const base = Date.parse(`${today.slice(0, 10)}T12:00:00Z`)
  if (Number.isNaN(base)) return ''
  return new Date(base - Math.max(1, days) * 86_400_000).toISOString().slice(0, 10)
}

const COMPUTER_ACCENTS: Record<string, string> = {
  a: '[aáàä]',
  e: '[eéèë]',
  i: '[iíìï]',
  o: '[oóòö]',
  u: '[uúùü]',
  n: '[nñ]',
}

/** Un texto literal dentro de una expresión regular. */
export function computerEscapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** El texto como expresión regular que no distingue tildes ("monitor" encuentra "Mónitor"). */
export function computerAccentInsensitive(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/[aeioun]/g, letter => COMPUTER_ACCENTS[letter]!)
}

/**
 * El filtro de Mongo sobre `computercatalog`.
 *
 * Es la ÚNICA definición de qué cumple cada filtro: la ruta lo manda a Mongo y la vista previa de
 * dev lo evalúa en memoria con `computerFilterMatches`, que entiende exactamente los operadores de
 * acá. Una regla escrita dos veces (una en Mongo y otra en un `.filter()`) es una regla que tarde o
 * temprano dice dos cosas.
 */
export function computerMatch(
  query: ComputerQuery,
  today: string,
  freshDays: number
): Record<string, unknown> {
  const match: Record<string, unknown> = {}
  const floor = computerFreshFloor(today, freshDays)
  if (floor) match.lastSeen = { $gte: floor }
  if (!query.tipo) match.kindGroup = 'computer'
  else if (query.tipo === 'piezas') match.kindGroup = 'part'
  else if (query.tipo !== 'todos') match.kind = query.tipo
  if (query.marca) match.cpuBrand = query.marca
  if (query.familia) match.cpuFamily = query.familia
  if (query.procesador) match['cpu.slug'] = query.procesador
  if (query.placa) match.gpuSlug = query.placa
  if (query.dedicada) match.gpuDedicated = true
  // `$gte` ya excluye null: un aviso que no declara la RAM no cumple un mínimo de RAM.
  if (query.ramMin != null) match.ramGb = { $gte: query.ramMin }
  // `true` y nada más: un disco de tipo «no declarado» deja `hasSsd` en null, y no se lo muestra
  // como si tuviera SSD (tampoco se afirma que no lo tenga: simplemente no cumple el filtro).
  if (query.ssd) match.hasSsd = true
  if (query.precioMinUsd != null || query.precioMaxUsd != null) {
    const price: Record<string, number> = {}
    if (query.precioMinUsd != null) price.$gte = query.precioMinUsd
    if (query.precioMaxUsd != null) price.$lte = query.precioMaxUsd
    match.priceUsd = price
  }
  if (query.departamento) match.department = query.departamento
  if (query.fuente) match.source = query.fuente
  // Sin fallas DECLARADAS: no afirma que la máquina ande, sólo que el aviso no dice que falle.
  if (query.sinFallas) match['faults.0'] = { $exists: false }
  if (query.debajo) match['valuation.verdict'] = { $in: [...COMPUTER_BELOW_VERDICTS] }
  if (query.dias != null) {
    // "Hoy" es desde hoy y "últimos 7 días" es hoy y los seis anteriores: se resta N-1.
    const since = Date.parse(`${today.slice(0, 10)}T12:00:00Z`) - (query.dias - 1) * 86_400_000
    if (Number.isFinite(since))
      match.publishedAt = { $gte: new Date(since).toISOString().slice(0, 10) }
  }
  if (query.q) match.title = { $regex: computerAccentInsensitive(query.q), $options: 'i' }
  // La marca del equipo, sin distinguir mayúsculas: el informe enlaza con la etiqueta («Lenovo»)
  // y el catálogo puede guardar otra capitalización. Anclada: «HP» no puede encontrar «HPE».
  if (query.marcaEquipo)
    match.brand = { $regex: `^${computerEscapeRegExp(query.marcaEquipo)}$`, $options: 'i' }
  if (query.linea) match.line = query.linea
  // `$gte` excluye null: un procesador sin año (un «i7» sin modelo) no cumple «de 2020 o más nuevo».
  if (query.cpuAnio != null) match['cpu.year'] = { $gte: query.cpuAnio }
  if (query.ramTipo) match.ramType = query.ramTipo
  if (query.discoMin != null) match.storageGb = { $gte: query.discoMin }
  if (query.pantalla) {
    const size = COMPUTER_SCREEN_SIZES[query.pantalla]
    const inches: Record<string, number> = {}
    if (size.min != null) inches.$gte = size.min
    if (size.max != null) inches.$lte = size.max
    match.screenInches = inches
  }
  if (query.vramMin != null) match['gpu.vramGb'] = { $gte: query.vramMin }
  if (query.estado) match.condition = query.estado
  if (query.vendedor) match.sellerType = query.vendedor
  if (query.conDatos) match.specCount = { $gte: 3 }
  if (query.monitor) match['includes.monitor'] = true
  if (query.oportunidad || query.evidencia) match.opportunity = { $ne: null }
  if (query.evidencia) match['opportunity.tier'] = query.evidencia
  // «Mayor ahorro» y «procesador más nuevo» sólo listan lo que tiene el dato, por la misma razón que
  // «mejor relación»: el null abriría la lista (y en el descendente, la cerraría entera).
  if (query.orden === 'ahorro') match['opportunity.savingsPct'] = { $ne: null }
  if (query.orden === 'cpu_nuevo' && query.cpuAnio == null) match['cpu.year'] = { $ne: null }
  // «Mejor relación» no puede abrir con los avisos sin veredicto: en un orden ascendente de Mongo
  // el null va primero, y arriba quedarían justo los que no se pudieron comparar. Se sacan, como
  // motos con «menor cilindrada». Pedir el veredicto (y no sólo el cociente) deja afuera además lo
  // que el job se niega a juzgar: moneda deducida y fallas declaradas.
  if (query.orden === 'relacion') {
    if (!query.debajo) match['valuation.verdict'] = { $ne: null }
    match['valuation.ratio'] = { $ne: null }
  }
  return match
}

export function computerSortSpec(sort: ComputerSort): Record<string, 1 | -1> {
  switch (sort) {
    case 'precio_asc':
      // En dólares: ordenar por `price` mezclaría escalas y pondría primero cualquier aviso en
      // pesos. El slug al final hace el orden estable entre páginas.
      return { priceUsd: 1, slug: 1 }
    case 'precio_desc':
      return { priceUsd: -1, slug: 1 }
    case 'relacion':
      return { 'valuation.ratio': 1, priceUsd: 1, slug: 1 }
    case 'completos':
      return { specCount: -1, publishedAt: -1, slug: 1 }
    case 'ram':
      // Descendente: el aviso sin RAM declarada (null) va al final solo, que es donde Mongo pone el
      // null en un orden descendente.
      return { ramGb: -1, priceUsd: 1, slug: 1 }
    case 'ahorro':
      return { 'opportunity.savingsPct': -1, priceUsd: 1, slug: 1 }
    case 'cpu_nuevo':
      return { 'cpu.year': -1, priceUsd: 1, slug: 1 }
    case 'disco':
      return { storageGb: -1, priceUsd: 1, slug: 1 }
    default:
      return { publishedAt: -1, lastSeen: -1, slug: 1 }
  }
}

/** Los campos de mongoose que nadie lee y que pesan en cada fila de un listado de 30. */
export const COMPUTER_ROW_PROJECTION = Object.freeze({
  _id: 0,
  __v: 0,
  createdAt: 0,
  updatedAt: 0,
})

/** Un campo con puntos (`valuation.verdict`, `faults.0`), como lo resuelve Mongo. */
function computerFieldValue(doc: unknown, path: string): unknown {
  let current: unknown = doc
  for (const part of path.split('.')) {
    if (current == null) return undefined
    if (Array.isArray(current) && /^\d+$/.test(part)) current = current[Number(part)]
    else if (typeof current === 'object') current = (current as Record<string, unknown>)[part]
    else return undefined
  }
  return current
}

const computerIsOperatorObject = (value: unknown): value is Record<string, unknown> =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).some(key => key.startsWith('$'))

function computerComparable(value: unknown): value is number | string {
  return typeof value === 'number' || typeof value === 'string'
}

/** La igualdad de Mongo: `null` coincide con el campo ausente, y un arreglo con cualquiera de sus
 * elementos. */
function computerEquals(value: unknown, expected: unknown): boolean {
  if (expected === null) return value === null || value === undefined
  if (Array.isArray(value)) return value.includes(expected)
  return value === expected
}

function computerConditionMatches(value: unknown, condition: unknown): boolean {
  if (!computerIsOperatorObject(condition)) return computerEquals(value, condition)
  for (const [operator, operand] of Object.entries(condition)) {
    switch (operator) {
      case '$gte':
      case '$gt':
      case '$lte':
      case '$lt': {
        if (!computerComparable(value) || typeof value !== typeof operand) return false
        const a = value as number | string
        const b = operand as number | string
        if (operator === '$gte' && !(a >= b)) return false
        if (operator === '$gt' && !(a > b)) return false
        if (operator === '$lte' && !(a <= b)) return false
        if (operator === '$lt' && !(a < b)) return false
        break
      }
      case '$ne':
        if (computerEquals(value, operand)) return false
        break
      case '$in':
        if (!(operand as unknown[]).some(item => computerEquals(value, item))) return false
        break
      case '$nin':
        if ((operand as unknown[]).some(item => computerEquals(value, item))) return false
        break
      case '$exists':
        if ((value !== undefined) !== Boolean(operand)) return false
        break
      case '$regex': {
        const flags = String((condition as { $options?: string }).$options ?? '')
        if (typeof value !== 'string' || !new RegExp(String(operand), flags).test(value))
          return false
        break
      }
      case '$options':
        break
      default:
        // Un operador que este evaluador no conoce no puede «coincidir por las dudas»: la vista
        // previa mostraría lo que Mongo no.
        throw new Error(`computerFilterMatches: operador no soportado ${operator}`)
    }
  }
  return true
}

/**
 * Evalúa en memoria un filtro de `computerMatch` contra una fila, con la semántica de Mongo para
 * los operadores que ese filtro usa. Lo usa la vista previa de dev (`COMPUTADORAS_PREVIEW_FILE`),
 * que no puede conectarse a Mongo (el `.env` local apunta a producción), y lo verifica
 * `computadoras.test.ts` contra los mismos filtros que van a la base.
 */
export function computerFilterMatches(filter: Record<string, unknown>, doc: unknown): boolean {
  for (const [key, condition] of Object.entries(filter)) {
    if (key === '$and') {
      if (!(condition as Record<string, unknown>[]).every(sub => computerFilterMatches(sub, doc)))
        return false
    } else if (key === '$or') {
      if (!(condition as Record<string, unknown>[]).some(sub => computerFilterMatches(sub, doc)))
        return false
    } else if (!computerConditionMatches(computerFieldValue(doc, key), condition)) return false
  }
  return true
}

/** El orden de Mongo para un valor: null/ausente primero, después números, después textos. */
function computerSortCompare(a: unknown, b: unknown): number {
  const rank = (value: unknown) =>
    value == null ? 0 : typeof value === 'number' ? 1 : typeof value === 'string' ? 2 : 3
  const ra = rank(a)
  const rb = rank(b)
  if (ra !== rb) return ra - rb
  if (ra === 0 || ra === 3) return 0
  return (a as number | string) < (b as number | string)
    ? -1
    : (a as number | string) > (b as number | string)
      ? 1
      : 0
}

/** Ordena filas en memoria con la misma especificación que `.sort()` de Mongo. */
export function computerSortRows<T>(rows: readonly T[], spec: Record<string, 1 | -1>): T[] {
  const entries = Object.entries(spec)
  return [...rows].sort((a, b) => {
    for (const [field, direction] of entries) {
      const cmp = computerSortCompare(computerFieldValue(a, field), computerFieldValue(b, field))
      if (cmp) return cmp * direction
    }
    return 0
  })
}

// ── Facetas ────────────────────────────────────────────────────────────────

export interface ComputerFacet {
  value: string
  label: string
  count: number
}

export interface ComputerFacets {
  kinds: ComputerFacet[]
  cpuBrands: ComputerFacet[]
  cpuFamilies: ComputerFacet[]
  gpus: ComputerFacet[]
  departments: ComputerFacet[]
  sources: ComputerFacet[]
  /** Un conteo por escalón de RAM mínima, cada uno con el resto de los filtros puestos. */
  rams: ComputerFacet[]
  /** Desde el 24/11/2026. Opcionales: durante un despliegue la API vieja no las manda. */
  brands?: ComputerFacet[]
  /** Las líneas, sólo con una marca de equipo elegida (sin marca serían cien opciones). */
  lines?: ComputerFacet[]
}

export const COMPUTER_EMPTY_FACETS: ComputerFacets = Object.freeze({
  kinds: [],
  cpuBrands: [],
  cpuFamilies: [],
  gpus: [],
  departments: [],
  sources: [],
  rams: [],
  brands: [],
  lines: [],
})

/**
 * Las facetas, cada una contada SIN su propio filtro (igual que `/api/motos`): con su filtro puesto
 * devolvería una sola opción con el total de la pantalla, y el lector no vería cuántos avisos hay
 * del otro lado. `relax` dice qué se saca para contar cada una.
 *
 * El orden de este arreglo es el orden en que las dos rutas las arman: el 23/11/2026 motos sacó a
 * producción dos facetas cruzadas por agregar una en otra posición de un `Promise.all`. Acá no hay
 * desestructuración por posición: cada faceta se guarda por su `name`.
 */
export type ComputerFacetName = Exclude<keyof ComputerFacets, 'rams'>

export const COMPUTER_FACET_SPECS: ReadonlyArray<{
  name: ComputerFacetName
  field: string
  limit: number
  labelField?: string
  relax: (query: ComputerQuery) => ComputerQuery
  /** Si la faceta se cuenta con esta consulta (las líneas, sólo con una marca de equipo). */
  when?: (query: ComputerQuery) => boolean
}> = Object.freeze([
  // El tipo se cuenta sobre TODO (computadoras y piezas): es el control que lleva de una vista a
  // la otra, y contado sólo dentro de las computadoras nunca mostraría cuántas piezas hay.
  { name: 'kinds', field: 'kind', limit: 12, relax: query => ({ ...query, tipo: 'todos' }) },
  // La marca sin la familia ni el procesador: una familia pertenece a una marca, y dejarla puesta
  // daría una sola marca con un solo número.
  {
    name: 'cpuBrands',
    field: 'cpuBrand',
    limit: 3,
    relax: query => ({ ...query, marca: '', familia: '', procesador: '' }),
  },
  {
    name: 'cpuFamilies',
    field: 'cpuFamily',
    limit: 40,
    relax: query => ({ ...query, familia: '', procesador: '' }),
  },
  {
    name: 'gpus',
    field: 'gpuSlug',
    limit: 80,
    labelField: 'gpu.label',
    relax: query => ({ ...query, placa: '' }),
  },
  {
    name: 'departments',
    field: 'department',
    limit: 19,
    relax: query => ({ ...query, departamento: '' }),
  },
  { name: 'sources', field: 'source', limit: 2, relax: query => ({ ...query, fuente: '' }) },
  // La marca del equipo sin la línea, por lo mismo que la del procesador sin la familia.
  {
    name: 'brands',
    field: 'brand',
    limit: 40,
    relax: query => ({ ...query, marcaEquipo: '', linea: '' }),
  },
  {
    name: 'lines',
    field: 'line',
    limit: 60,
    labelField: 'lineLabel',
    relax: query => ({ ...query, linea: '' }),
    when: query => Boolean(query.marcaEquipo),
  },
])

/**
 * El filtro de una faceta: el de la pantalla, sin las filas que no tienen el dato. Sin esto el
 * grupo `null` (en la primera corrida real, 566 computadoras sin procesador leído) ocupaba uno de
 * los tres lugares de la faceta de marca y Apple, con 124 avisos, no aparecía: el `$limit` corta
 * ANTES de que el vacío se descarte.
 */
export function computerFacetMatch(
  match: Record<string, unknown>,
  field: string
): Record<string, unknown> {
  return { $and: [match, { [field]: { $nin: [null, ''] } }] }
}

/** El pipeline de una faceta: lo manda la ruta a Mongo, y la vista previa lo imita en memoria. */
export function computerFacetPipeline(
  match: Record<string, unknown>,
  field: string,
  limit: number,
  labelField?: string
): Record<string, unknown>[] {
  return [
    { $match: computerFacetMatch(match, field) },
    {
      $group: {
        _id: `$${field}`,
        ...(labelField ? { label: { $first: `$${labelField}` } } : {}),
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1, _id: 1 } },
    { $limit: limit },
  ]
}

export type ComputerFacetRow = { _id: unknown; label?: unknown; count: number }

/** El mismo `$group` + `$sort` + `$limit` sobre filas en memoria (vista previa de dev). */
export function computerFacetRowsInMemory(
  rows: readonly unknown[],
  match: Record<string, unknown>,
  field: string,
  limit: number,
  labelField?: string
): ComputerFacetRow[] {
  const groups = new Map<unknown, ComputerFacetRow>()
  const facetMatch = computerFacetMatch(match, field)
  for (const row of rows) {
    if (!computerFilterMatches(facetMatch, row)) continue
    const raw = computerFieldValue(row, field)
    const id = raw === undefined ? null : raw
    const group = groups.get(id)
    if (group) group.count += 1
    else
      groups.set(id, {
        _id: id,
        ...(labelField ? { label: computerFieldValue(row, labelField) ?? null } : {}),
        count: 1,
      })
  }
  return [...groups.values()]
    .sort((a, b) => b.count - a.count || computerSortCompare(a._id, b._id))
    .slice(0, limit)
}

const COMPUTER_FACET_LABELERS: Readonly<
  Record<ComputerFacetName, (value: string, label: string) => string>
> = Object.freeze({
  brands: (_value, label) => label,
  lines: (value, label) => (label && label !== value ? label : computerSlugTitle(value)),
  kinds: value => COMPUTER_KIND_LABEL[value as ComputerPublicKind] ?? value,
  cpuBrands: value => COMPUTER_CPU_BRAND_LABEL[value as 'intel'] ?? value,
  cpuFamilies: value => computerCpuFamilyLabel(value),
  gpus: (value, label) => label || computerSlugText(value),
  departments: (_value, label) => label,
  sources: value => COMPUTER_SOURCE_LABEL[value as ComputerPublicSource] ?? value,
})

/**
 * Una faceta como la muestra el panel. Un valor nulo o vacío nunca se publica como opción: «sin
 * placa leída» no es una placa, y ofrecerlo sería ofrecer una pregunta que el dato no contesta.
 * Las etiquetas de catálogos cerrados se traducen acá y no en la plantilla, para que la misma
 * palabra no se escriba en dos lados.
 */
export function computerLabelFacet(
  name: ComputerFacetName,
  rows: readonly ComputerFacetRow[]
): ComputerFacet[] {
  return rows
    .filter(row => typeof row._id === 'string' && row._id.trim().length > 0)
    .map(row => {
      const value = String(row._id)
      const raw = typeof row.label === 'string' && row.label ? row.label : value
      return { value, label: COMPUTER_FACET_LABELERS[name](value, raw), count: row.count }
    })
}

export function computerRamFacet(counts: readonly number[]): ComputerFacet[] {
  return COMPUTER_RAM_STEPS.map((step, index) => ({
    value: String(step),
    label: `${step} GB o más`,
    count: counts[index] ?? 0,
  }))
}

// ── Respuestas de la API ───────────────────────────────────────────────────

/**
 * Por qué una respuesta puede venir vacía. Son tres cosas distintas y la página dice cuál:
 * `preparing` = el job todavía no publicó nada, `unavailable` = no pudimos leer el catálogo ahora,
 * `ok` = leímos y esto es lo que hay. Sin esto, una base caída se leería como «no hay computadoras
 * usadas en Uruguay», que es afirmar algo que nadie midió.
 */
export type ComputerStatus = 'ok' | 'preparing' | 'unavailable'

/** Lo que las páginas necesitan de la corrida para decir qué se leyó y cuándo. */
export interface ComputerCoverage {
  generatedAt: string
  freshDays: number
  usdUyu: number
  counts: ComputerPublicMeta['counts']
  sources: ComputerPublicSourceRun[]
  partsPriced: number
}

export interface ComputerListResponse {
  status: ComputerStatus
  generatedAt: string
  total: number
  page: number
  perPage: number
  items: ComputerPublicListing[]
  facets: ComputerFacets
  coverage: ComputerCoverage | null
}

const COMPUTER_EMPTY_COUNTS: ComputerPublicMeta['counts'] = Object.freeze({
  total: 0,
  computers: 0,
  parts: 0,
  facebook: 0,
  mercadolibre: 0,
  withValuation: 0,
  withNewTotal: 0,
  withUsedTotal: 0,
  detailRead: 0,
})

export function computerCoverageOf(
  meta: ComputerPublicMeta | null | undefined
): ComputerCoverage | null {
  if (!meta) return null
  return {
    generatedAt: meta.generatedAt ?? '',
    freshDays: typeof meta.freshDays === 'number' ? meta.freshDays : COMPUTER_FRESH_DAYS_FALLBACK,
    usdUyu: typeof meta.usdUyu === 'number' ? meta.usdUyu : 0,
    counts: { ...COMPUTER_EMPTY_COUNTS, ...(meta.counts ?? {}) },
    sources: Array.isArray(meta.sources) ? meta.sources : [],
    partsPriced: typeof meta.partsPriced === 'number' ? meta.partsPriced : 0,
  }
}

export function computerEmptyList(
  query: ComputerQuery,
  status: ComputerStatus = 'preparing'
): ComputerListResponse {
  return {
    status,
    generatedAt: '',
    total: 0,
    page: query.pagina,
    perPage: COMPUTERS_PER_PAGE,
    items: [],
    facets: { ...COMPUTER_EMPTY_FACETS },
    coverage: null,
  }
}

/**
 * El listado entero armado en memoria, con las MISMAS piezas que la ruta manda a Mongo
 * (`computerMatch`, `computerSortSpec`, `COMPUTER_FACET_SPECS`). Lo usa sólo la vista previa de dev.
 */
export function computerListInMemory(
  rows: readonly ComputerPublicListing[],
  meta: ComputerPublicMeta | null,
  query: ComputerQuery,
  today: string
): ComputerListResponse {
  const coverage = computerCoverageOf(meta)
  const freshDays = coverage?.freshDays ?? COMPUTER_FRESH_DAYS_FALLBACK
  const match = computerMatch(query, today, freshDays)
  const matched = computerSortRows(
    rows.filter(row => computerFilterMatches(match, row)),
    computerSortSpec(query.orden)
  )
  const facets: ComputerFacets = { ...COMPUTER_EMPTY_FACETS }
  for (const spec of COMPUTER_FACET_SPECS) {
    if (spec.when && !spec.when(query)) continue
    const facetMatch = computerMatch(spec.relax(query), today, freshDays)
    facets[spec.name] = computerLabelFacet(
      spec.name,
      computerFacetRowsInMemory(rows, facetMatch, spec.field, spec.limit, spec.labelField)
    )
  }
  facets.rams = computerRamFacet(
    COMPUTER_RAM_STEPS.map(
      step =>
        rows.filter(row =>
          computerFilterMatches(computerMatch({ ...query, ramMin: step }, today, freshDays), row)
        ).length
    )
  )
  const start = (query.pagina - 1) * COMPUTERS_PER_PAGE
  return {
    status: meta ? 'ok' : 'preparing',
    generatedAt: coverage?.generatedAt ?? '',
    total: matched.length,
    page: query.pagina,
    perPage: COMPUTERS_PER_PAGE,
    items: matched.slice(start, start + COMPUTERS_PER_PAGE),
    facets,
    coverage,
  }
}

/** La ficha de UN aviso (`/computadoras-usadas-uruguay/aviso/<slug>`). */
export interface ComputerAvisoResponse {
  computer: ComputerPublicListing
  /** Las filas de `computerparts` de las piezas de su valuación (y de la pieza que el aviso ES). */
  parts: ComputerPublicPart[]
  /** Otras del mismo tipo y la misma familia de procesador, las de precio más parecido primero. */
  similar: ComputerPublicListing[]
  generatedAt: string
  usdUyu: number
}

export const COMPUTER_SIMILAR = 6

/** Las identidades de pieza que la ficha necesita: las de su valuación y las del propio aviso. */
export function computerAvisoPartSlugs(computer: ComputerPublicListing): string[] {
  const slugs = new Set<string>()
  for (const part of computer.valuation?.parts ?? []) if (part.slug) slugs.add(part.slug)
  if (computer.cpu?.slug) slugs.add(computer.cpu.slug)
  if (computer.gpuSlug) slugs.add(computer.gpuSlug)
  return [...slugs].slice(0, 20)
}

/** El filtro de las parecidas: mismo tipo y, si se leyó, la misma familia de procesador. */
export function computerSimilarFilter(
  subject: ComputerPublicListing,
  floor: string
): Record<string, unknown> {
  return {
    kind: subject.kind,
    slug: { $ne: subject.slug },
    ...(subject.cpuFamily ? { cpuFamily: subject.cpuFamily } : {}),
    ...(floor ? { lastSeen: { $gte: floor } } : {}),
  }
}

/** Las parecidas de precio más cercano primero; a igual distancia, la más barata. */
export function computerPickSimilar(
  subject: ComputerPublicListing,
  rows: readonly ComputerPublicListing[],
  max = COMPUTER_SIMILAR
): ComputerPublicListing[] {
  return [...rows]
    .filter(row => row.slug !== subject.slug)
    .sort(
      (a, b) =>
        Math.abs(a.priceUsd - subject.priceUsd) - Math.abs(b.priceUsd - subject.priceUsd) ||
        a.priceUsd - b.priceUsd ||
        a.slug.localeCompare(b.slug)
    )
    .slice(0, max)
}

/** La tabla de `/precios-componentes-pc-uruguay`. */
export interface ComputerComponentsResponse {
  status: ComputerStatus
  generatedAt: string
  usdUyu: number
  roles: Array<{
    role: ComputerPublicPartRole
    title: string
    id: string
    parts: ComputerPublicPart[]
  }>
  presets: ComputerPublicPreset[]
  partsPriced: number
}

/** Los campos de `computerparts` que viajan: el historial diario no se dibuja en v1 y pesa. */
export const COMPUTER_PART_PROJECTION = Object.freeze({
  _id: 0,
  __v: 0,
  history: 0,
  createdAt: 0,
})

export function computerEmptyComponents(
  status: ComputerStatus = 'preparing'
): ComputerComponentsResponse {
  return { status, generatedAt: '', usdUyu: 0, roles: [], presets: [], partsPriced: 0 }
}

/**
 * Agrupa las piezas por rol en el orden de `COMPUTER_ROLE_TABLES`. Una pieza sin precio nuevo NI
 * usado no entra: una fila que no dice cuánto sale es una fila que no contesta la pregunta de la
 * página. Dentro de cada tabla, las que más aparecen en el directorio primero (son las que la
 * gente está mirando), y a igual uso la más barata nueva.
 */
export function computerComponentsFrom(
  parts: readonly ComputerPublicPart[],
  meta: ComputerPublicMeta | null
): ComputerComponentsResponse {
  const coverage = computerCoverageOf(meta)
  const priced = parts.filter(part => part.new || part.used)
  const roles = COMPUTER_ROLE_TABLES.map(table => ({
    ...table,
    parts: priced
      .filter(part => part.role === table.role)
      .sort(
        (a, b) =>
          (b.inCatalog ?? 0) - (a.inCatalog ?? 0) ||
          (a.new?.medianUsd ?? Number.MAX_SAFE_INTEGER) -
            (b.new?.medianUsd ?? Number.MAX_SAFE_INTEGER) ||
          a.label.localeCompare(b.label, 'es')
      ),
  })).filter(table => table.parts.length > 0)
  return {
    status: meta || priced.length ? 'ok' : 'preparing',
    generatedAt: coverage?.generatedAt ?? '',
    usdUyu: coverage?.usdUyu ?? 0,
    roles,
    presets: Array.isArray(meta?.presets) ? meta.presets : [],
    partsPriced: coverage?.partsPriced ?? priced.length,
  }
}

// ── Formato ────────────────────────────────────────────────────────────────

/** `US$ 1.250`, con espacio duro para que el celular nunca parta el monto en dos líneas. */
export function computerUsd(value: number): string {
  return `US$\u00A0${Math.round(value).toLocaleString('es-UY')}`
}

/** El precio en la moneda del aviso. */
export function computerMoney(value: number, currency: 'UYU' | 'USD'): string {
  const amount = Math.round(value).toLocaleString('es-UY')
  return currency === 'USD' ? `US$\u00A0${amount}` : `$\u00A0${amount}`
}

/**
 * Lo que la tarjeta y la ficha dicen del precio: la cifra del aviso, el equivalente en dólares
 * cuando el aviso es en pesos (es lo comparable), y la aclaración cuando la moneda la dedujimos.
 * Facebook marca «UYU» por defecto: «PC Gamer Ryzen 5 5600 | RTX 4060 $ 950» son dólares, y el job
 * lo lee así — pero eso es una lectura nuestra y se dice con esas palabras.
 */
export function computerPriceLine(
  listing: Pick<ComputerPublicListing, 'price' | 'currency' | 'priceUsd' | 'currencyInferred'>
): { main: string; usd: string | null; inferred: string | null } {
  return {
    main: computerMoney(listing.price, listing.currency),
    usd:
      listing.currency === 'UYU' && listing.priceUsd > 0
        ? `≈ ${computerUsd(listing.priceUsd)}`
        : null,
    inferred: listing.currencyInferred ? 'precio leído en dólares' : null,
  }
}

/** `512 GB`, `1 TB`, `1,5 TB`. El job puede guardar un tera como 1000 o 1024: los dos son «1 TB». */
export function computerGbLabel(gb: number): string {
  if (gb >= 1000) {
    const tb = gb % 1024 === 0 ? gb / 1024 : gb / 1000
    return `${tb.toLocaleString('es-UY', { maximumFractionDigits: 1 })} TB`
  }
  return `${gb.toLocaleString('es-UY')} GB`
}

const COMPUTER_DRIVE_LABEL: Readonly<Record<ComputerPublicDrive['type'], string>> = Object.freeze({
  nvme: 'SSD NVMe',
  ssd: 'SSD',
  hdd: 'Disco rígido',
  emmc: 'eMMC',
  unknown: 'Disco',
})

/** «SSD NVMe de 512 GB», o «Disco de 1 TB (tipo no declarado)» cuando el aviso dice la capacidad
 * pero no si es SSD o rígido: la capacidad es un dato, el tipo no lo es. */
export function computerDriveLabel(drive: ComputerPublicDrive): string {
  const base = `${COMPUTER_DRIVE_LABEL[drive.type] ?? 'Disco'} de ${computerGbLabel(drive.gb)}`
  return drive.type === 'unknown' ? `${base} (tipo no declarado)` : base
}

export function computerStorageLabel(storage: readonly ComputerPublicDrive[] | null | undefined) {
  const list = (storage ?? []).filter(drive => drive && drive.gb > 0)
  return list.length ? list.map(computerDriveLabel).join(' + ') : null
}

export function computerRamLabel(
  listing: Pick<ComputerPublicListing, 'ramGb' | 'ramType'>
): string | null {
  if (typeof listing.ramGb !== 'number' || listing.ramGb <= 0) return null
  return `${listing.ramGb} GB${listing.ramType ? ` ${listing.ramType.toUpperCase()}` : ' de RAM'}`
}

/** La placa de video: la dedicada por su nombre (con la memoria si el nombre no la trae), la
 * integrada dicha como tal. Sin dato, null: no se escribe «sin placa» de un aviso que no dice. */
export function computerGpuLabel(listing: Pick<ComputerPublicListing, 'gpu'>): string | null {
  const gpu = listing.gpu
  if (!gpu) return null
  if (gpu.integrated)
    return gpu.model ? `Gráficos integrados (${gpu.label})` : 'Gráficos integrados'
  const vram = gpu.vramGb && !/\d\s*gb/i.test(gpu.label) ? ` ${gpu.vramGb} GB` : ''
  return `${gpu.label}${vram}`
}

export function computerScreenLabel(inches: number | null | undefined): string | null {
  return typeof inches === 'number' && inches > 0
    ? `Pantalla de ${inches.toLocaleString('es-UY', { maximumFractionDigits: 1 })}″`
    : null
}

/** Los datos de una tarjeta en el orden en que se lee una computadora. Cada uno sólo si se leyó. */
export function computerSpecChips(listing: ComputerPublicListing): string[] {
  const chips = [
    listing.cpu?.label ?? null,
    computerGpuLabel(listing),
    computerRamLabel(listing),
    computerStorageLabel(listing.storage),
    computerScreenLabel(listing.screenInches),
    listing.kind === 'psu' || listing.kind === 'desktop'
      ? listing.psuWatts
        ? `Fuente de ${listing.psuWatts} W`
        : null
      : null,
    listing.kind === 'motherboard' || listing.kind === 'combo'
      ? listing.chipset
        ? `Chipset ${listing.chipset.toUpperCase()}`
        : null
      : null,
  ]
  return chips.filter((chip): chip is string => !!chip)
}

type ComputerReference = 'used' | 'new' | 'comparables'

/**
 * La referencia de un aviso, normalizada. Las notebooks, all-in-one y mini PC no se arman: contra
 * sus «piezas» no se las puede medir, así que su `used` sólo puede querer decir las máquinas
 * iguales. Las filas escritas antes del 24/11/2026 lo guardaban así, y se leen como `comparables`.
 */
export function computerReferenceOf(
  listing: Pick<ComputerPublicListing, 'kind' | 'kindGroup'>,
  reference: ComputerPublicValuation['reference'] | undefined
): ComputerReference | null {
  if (!reference) return null
  const machine = listing.kindGroup !== 'part' && listing.kind !== 'desktop'
  return machine && reference === 'used' ? 'comparables' : reference
}

/** «PCs iguales», «notebooks iguales»: el nombre de las máquinas contra las que se compara. */
function computerSameKindPlural(listing: Pick<ComputerPublicListing, 'kind' | 'kindGroup'>) {
  switch (listing.kind) {
    case 'notebook':
      return 'notebooks iguales'
    case 'all-in-one':
      return 'all-in-one iguales'
    case 'mini-pc':
      return 'mini PC iguales'
    case 'desktop':
      return 'PCs iguales'
    default:
      return 'la misma pieza en otros avisos'
  }
}

/** Contra qué compara el veredicto, en pocas palabras (la etiqueta de la tarjeta). */
function computerVerdictReference(
  listing: Pick<ComputerPublicListing, 'kind' | 'kindGroup'>,
  reference: ComputerReference
): string {
  if (reference === 'comparables') return computerSameKindPlural(listing)
  const used = reference === 'used'
  if (listing.kind === 'desktop') return used ? 'sus piezas usadas' : 'armarla nueva'
  if (listing.kindGroup === 'part') return used ? 'la misma pieza usada' : 'la misma pieza nueva'
  return used ? 'las usadas iguales' : 'la misma nueva'
}

/**
 * El veredicto en palabras neutras. Nunca «ganga» ni «oportunidad»: dice cómo está el precio
 * contra una referencia medida, no si conviene comprar — eso depende de cosas que el aviso no dice
 * (estado, garantía, si arranca).
 */
export function computerVerdictLabel(
  listing: Pick<ComputerPublicListing, 'kind' | 'kindGroup' | 'valuation'>
): string | null {
  const verdict = listing.valuation?.verdict
  const kind = computerReferenceOf(listing, listing.valuation?.reference)
  if (!verdict || !kind) return null
  const reference = computerVerdictReference(listing, kind)
  switch (verdict) {
    case 'muy-por-debajo':
      return `Pide mucho menos que ${reference}`
    case 'por-debajo':
      return `Pide menos que ${reference}`
    case 'parejo':
      return `Pide lo mismo que ${reference}`
    case 'por-encima':
      return `Pide más que ${reference}`
    default:
      return null
  }
}

export type ComputerVerdictTone = 'below' | 'even' | 'above'
export function computerVerdictTone(
  verdict: ComputerPublicVerdict | null | undefined
): ComputerVerdictTone | null {
  if (verdict === 'muy-por-debajo' || verdict === 'por-debajo') return 'below'
  if (verdict === 'parejo') return 'even'
  if (verdict === 'por-encima') return 'above'
  return null
}

/**
 * «Pide 62 % de lo que valen sus piezas usadas (US$ 540).» Sólo con cociente y referencia, y con el
 * monto de ESA referencia: la suma de sus piezas usadas, lo que cuesta armarla con piezas nuevas
 * (sólo cuando falta el total usado), o la mediana de las máquinas iguales del directorio, con
 * cuántos avisos la forman — una mediana de cuatro no se lee igual que una de cuarenta.
 */
export function computerRatioText(
  listing: Pick<ComputerPublicListing, 'kind' | 'kindGroup' | 'valuation' | 'comparables'>
): string | null {
  const valuation = listing.valuation
  const reference = computerReferenceOf(listing, valuation?.reference)
  if (!valuation || valuation.ratio == null || !reference) return null
  const pct = Math.round(valuation.ratio * 100).toLocaleString('es-UY')
  const usd = (amount: number | null | undefined) =>
    amount != null && amount > 0 ? ` (${computerUsd(amount)})` : ''
  const part = listing.kindGroup === 'part' ? valuation.parts?.[0] : undefined
  if (reference === 'comparables') {
    const comparables = listing.comparables
    const detail =
      comparables && comparables.medianUsd > 0
        ? ` (mediana de ${comparables.n.toLocaleString('es-UY')} ${comparables.n === 1 ? 'aviso' : 'avisos'}: ${computerUsd(comparables.medianUsd)})`
        : ''
    const what =
      listing.kindGroup === 'part'
        ? 'lo que piden por la misma pieza en otros avisos'
        : `lo que piden por ${computerSameKindPlural(listing)}`
    return `Pide ${pct} % de ${what}${detail}.`
  }
  if (listing.kindGroup === 'part') {
    return reference === 'used'
      ? `Pide ${pct} % de lo que vale la misma pieza usada${usd(part?.usedUsd)}.`
      : `Pide ${pct} % de lo que cuesta la misma pieza nueva${usd(valuation.sameNew?.medianUsd ?? part?.newUsd)}.`
  }
  if (listing.kind === 'desktop') {
    return reference === 'used'
      ? `Pide ${pct} % de lo que valen sus piezas usadas${usd(valuation.usedTotalUsd)}.`
      : `Pide ${pct} % de lo que cuesta armarla con piezas nuevas${usd(valuation.newTotalUsd)}.`
  }
  return `Pide ${pct} % de lo que cuesta la misma nueva${usd(valuation.sameNew?.medianUsd)}.`
}

export interface ComputerValuationSummary {
  /** «Armarla con piezas nuevas: US$ 812», sólo si TODAS las piezas tienen precio nuevo. */
  newTotal: string | null
  /** «Sus piezas usadas: US$ 540», sólo si TODAS tienen precio usado. */
  usedTotal: string | null
  /** «5 de 7 piezas con precio»: lo que se dice cuando falta un total. Nunca una suma. */
  coverage: string | null
}

/**
 * El encabezado de la valuación. LA regla de la página: un total sólo existe si el job lo publicó
 * completo (`newTotalUsd`/`usedTotalUsd` no nulos). Sin él no se suma lo que hay
 * (`newPartialUsd` existe en el documento y no se imprime nunca): se dice cuántas piezas tienen
 * precio. Un «armarla nueva sale US$ 400» sobre la mitad de las piezas baja por faltarle ítems y
 * hace parecer cara cualquier PC.
 */
export function computerValuationSummary(
  valuation: ComputerPublicValuation | null | undefined
): ComputerValuationSummary {
  if (!valuation || !valuation.parts?.length)
    return { newTotal: null, usedTotal: null, coverage: null }
  const total = valuation.parts.length
  const newTotal =
    valuation.newTotalUsd != null
      ? `Armarla con piezas nuevas: ${computerUsd(valuation.newTotalUsd)}`
      : null
  const usedTotal =
    valuation.usedTotalUsd != null
      ? `Sus piezas usadas: ${computerUsd(valuation.usedTotalUsd)}`
      : null
  let coverage: string | null = null
  if (valuation.newTotalUsd == null) {
    const priced = valuation.parts.filter(part => part.newUsd != null).length
    coverage = `${priced} de ${total} piezas con precio nuevo`
  } else if (valuation.usedTotalUsd == null) {
    const priced = valuation.parts.filter(part => part.usedUsd != null).length
    coverage = `${priced} de ${total} piezas con precio usado`
  }
  return { newTotal, usedTotal, coverage }
}

/** «Falta el precio nuevo de: Mother, Fuente.» — la lista que acompaña a un total que no existe. */
export function computerMissingLine(
  labels: readonly string[] | null | undefined,
  which: 'nuevo' | 'usado'
): string | null {
  const list = (labels ?? []).filter(Boolean)
  if (!list.length) return null
  return `Falta el precio ${which} de: ${list.join(', ')}.`
}

/** La comparación con avisos iguales, dicha por lo que se comparó. */
export function computerComparablesText(
  comparables: ComputerPublicComparables | null | undefined
): string | null {
  if (!comparables || !(comparables.medianUsd > 0) || !(comparables.n > 0)) return null
  const what =
    comparables.basis === 'cpu+gpu'
      ? 'Otras con el mismo procesador y la misma placa'
      : comparables.basis === 'cpu'
        ? 'Otras con el mismo procesador'
        : comparables.basis === 'model'
          ? 'Otras iguales'
          : 'La misma pieza en otros avisos'
  return `${what}: mediana ${computerUsd(comparables.medianUsd)}, ${comparables.n.toLocaleString('es-UY')} ${comparables.n === 1 ? 'aviso' : 'avisos'}`
}

export function computerSameNewText(valuation: ComputerPublicValuation | null | undefined) {
  const same = valuation?.sameNew
  if (!same || !(same.medianUsd > 0)) return null
  return `La misma nueva hoy: ${computerUsd(same.medianUsd)} (mediana de ${same.n.toLocaleString('es-UY')} ${same.n === 1 ? 'oferta' : 'ofertas'} en Mercado Libre)`
}

/** «serie lanzada en ~2017»: el año es de la SERIE, no del modelo exacto, y se dice así. */
export function computerSeriesYearText(year: number | null | undefined): string | null {
  return typeof year === 'number' && year > 1990 ? `serie lanzada en ~${year}` : null
}

/** Lo que trae además de la computadora, en una línea. */
export function computerIncludesText(
  includes: ComputerPublicListing['includes'] | null | undefined
): string | null {
  if (!includes) return null
  const parts = [
    includes.monitor
      ? `monitor${includes.monitorInches ? ` de ${includes.monitorInches.toLocaleString('es-UY')}″` : ''}`
      : null,
    includes.peripherals ? 'teclado y mouse' : null,
  ].filter(Boolean)
  return parts.length ? `Incluye ${parts.join(' y ')}` : null
}

/** El lugar en una línea: ciudad y departamento sin repetir. */
export function computerPlace(listing: Pick<ComputerPublicListing, 'city' | 'department'>): string {
  const city = listing.city?.trim() ?? ''
  const department = listing.department?.trim() ?? ''
  if (city && department && city.toLowerCase() !== department.toLowerCase())
    return `${city}, ${department}`
  return department || city
}

/** `YYYY-MM-DD` se lee como mediodía UTC: a medianoche caería en el día anterior en Montevideo. */
function computerToDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value
  const time = Date.parse(iso)
  return Number.isNaN(time) ? null : new Date(time)
}

/** La página es sólo en español: `dateLocale('es')` es `'es-UY'` («setiembre»), con la zona
 * explícita para que el servidor y el navegador impriman el mismo día. */
export function computerLongDate(value: string | null | undefined): string {
  const date = computerToDate(value)
  return date
    ? date.toLocaleDateString(dateLocale('es'), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Montevideo',
      })
    : ''
}

export function computerMedian(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  if (!sorted.length) return 0
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

// ── Textos calculados de los mismos datos que se muestran ──────────────────

/**
 * «¿Cuánto sale una computadora usada?», armada con los mismos avisos que la página imprime, para
 * que el texto visible y el schema.org no puedan divergir. Sin avisos no se estima: se dice.
 */
export function computerPrecioTipicoAnswer(
  items: readonly ComputerPublicListing[],
  coverage: ComputerCoverage | null
): string {
  const prices = items
    .filter(item => item.kindGroup === 'computer' && !item.currencyInferred)
    .map(item => item.priceUsd)
    .filter(price => price > 0)
  if (!prices.length) {
    return 'Todavía no relevamos suficientes avisos de computadoras usadas en Uruguay: sin datos para publicar una mediana.'
  }
  const fecha = computerLongDate(coverage?.generatedAt ?? null)
  const total = coverage?.counts.computers
    ? `, sobre ${coverage.counts.computers.toLocaleString('es-UY')} computadoras publicadas`
    : ''
  return `La mediana de lo que se pide por las computadoras de esta pantalla es ${computerUsd(computerMedian(prices))}${total}. Son precios PEDIDOS en avisos, no precios de venta cerrados, y los avisos en pesos se convierten con la cotización de la corrida sólo para poder compararlos.${fecha ? ` Datos del ${fecha}.` : ''}`
}

/** «¿Cuánto sale armar una PC hoy?», con los tipos que publica el job. Un tipo sin total completo
 * dice qué le falta; no se suma lo que hay. */
export function computerPresetsAnswer(presets: readonly ComputerPublicPreset[]): string {
  const complete = presets.filter(preset => preset.totalUsd != null)
  if (!complete.length) {
    return 'Todavía no tenemos precio nuevo de todas las piezas de una PC tipo, así que no publicamos un total: un total con piezas de menos sale más barato de lo que es.'
  }
  const lines = complete
    .map(preset => `${preset.label.toLowerCase()}, ${computerUsd(preset.totalUsd!)}`)
    .join('; ')
  return `Con las medianas de hoy de las piezas nuevas en Mercado Libre: ${lines}. Cada total suma todas sus piezas; si a una le faltara precio, no lo publicamos.`
}

// ── La tabla de componentes ────────────────────────────────────────────────

const COMPUTER_PART_DRIVE_TYPE_LABEL: Readonly<Record<string, string>> = Object.freeze({
  nvme: 'SSD NVMe',
  ssd: 'SSD SATA',
  hdd: 'Disco rígido',
  emmc: 'eMMC',
})

/** Los datos de una pieza en una línea («serie ~2021 · socket LGA1700 · DDR4»), sólo los que hay. */
export function computerPartFacts(part: Pick<ComputerPublicPart, 'facts' | 'role'>): string {
  const facts = part.facts ?? {}
  return [
    facts.brand ?? null,
    facts.year ? `serie ~${facts.year}` : null,
    facts.socket ? `socket ${facts.socket}` : null,
    facts.chipset ? `chipset ${facts.chipset.toUpperCase()}` : null,
    facts.ramType ? facts.ramType.toUpperCase() : null,
    facts.vramGb ? `${facts.vramGb} GB de memoria` : null,
    facts.driveType ? (COMPUTER_PART_DRIVE_TYPE_LABEL[facts.driveType] ?? facts.driveType) : null,
    facts.gb && part.role !== 'gpu' ? computerGbLabel(facts.gb) : null,
    facts.watts ? `${facts.watts} W` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * El directorio filtrado por esa pieza, para las dos que tienen filtro propio (procesador y placa).
 * Va con `tipo=todos` porque `inCatalog` cuenta los avisos que USAN la pieza y los que la SON (una
 * RTX 3060 suelta): sin eso el enlace abriría sólo las computadoras y mostraría menos avisos que
 * el número que lo acompaña.
 */
export function computerDirectoryLinkForPart(
  part: Pick<ComputerPublicPart, 'slug' | 'role'>
): { path: string; query: Record<string, string> } | null {
  if (part.role === 'cpu' && part.slug.startsWith('cpu:'))
    return { path: COMPUTADORAS_PATH, query: { tipo: 'todos', procesador: part.slug } }
  if (part.role === 'gpu' && part.slug.startsWith('gpu:'))
    return { path: COMPUTADORAS_PATH, query: { tipo: 'todos', placa: part.slug } }
  return null
}

/**
 * La nota del total usado cuando una pieza SUPUESTA entró al precio de la nueva más barata
 * (`usedFromNew`): sin piezas usadas sueltas con qué comparar una mother por socket, una fuente o
 * un gabinete básico, el total usado no existiría nunca, y dejarlas en cero lo bajaría.
 */
export const COMPUTER_USED_FROM_NEW_NOTE =
  'Mother, fuente y gabinete supuestos: a precio de la nueva más barata cuando no hay usadas para comparar.'

export function computerUsesNewForUsed(valuation: ComputerPublicValuation | null | undefined) {
  return (valuation?.parts ?? []).some(part => part.usedFromNew && part.usedUsd != null)
}

// ── Oportunidades e identidad de notebook (24/11/2026) ─────────────────────

export const COMPUTER_OPPORTUNITIES_PATH = '/oportunidades-computadoras-usadas-uruguay'
export const COMPUTER_NOTEBOOKS_PATH = '/precios-notebooks-usadas-uruguay'
/** El documento del informe de notebooks en `computermetas`. */
export const COMPUTER_NOTEBOOK_REPORT_ID = 'uy-computadoras-notebooks'

/** Las palabras con que arranca una referencia y que en el medio de una frase van en minúscula
 * («Pide 30 % menos que notebooks con Apple M1»). Una marca o un modelo no se tocan. */
const COMPUTER_LOWER_STARTS = new Set([
  'sus',
  'su',
  'notebooks',
  'computadoras',
  'otras',
  'otros',
  'la',
  'las',
  'los',
  'el',
  'misma',
  'mismas',
  'mismo',
  'mismos',
  'piezas',
  'pcs',
])

function computerMidSentence(text: string): string {
  const first = text.split(' ')[0] ?? ''
  return COMPUTER_LOWER_STARTS.has(first.toLowerCase()) && first !== 'PCs'
    ? text.charAt(0).toLowerCase() + text.slice(1)
    : text
}

/**
 * «Pide 32 % menos que la mediana de MacBook Air con Apple M2 (19 avisos)», con la evidencia aparte.
 *
 * La frase depende de la referencia: contra sus piezas usadas no hay mediana ni avisos que contar
 * («…que sus piezas usadas, sin contar mother, fuente ni gabinete»); contra las iguales o la misma
 * pieza usada, la referencia ES una mediana y se dice de cuántos avisos.
 */
export function computerOpportunityLine(
  opportunity: ComputerPublicOpportunity | null | undefined
): { text: string; tier: string } | null {
  if (!opportunity || !(opportunity.savingsPct > 0)) return null
  const pct = Math.round(opportunity.savingsPct * 100).toLocaleString('es-UY')
  const label = opportunity.referenceLabel?.trim() || 'su referencia'
  const text =
    opportunity.reference === 'used'
      ? `Pide ${pct} % menos que ${computerMidSentence(label)}`
      : `Pide ${pct} % menos que la mediana de ${label}${
          opportunity.n > 0
            ? ` (${opportunity.n.toLocaleString('es-UY')} ${opportunity.n === 1 ? 'aviso' : 'avisos'})`
            : ''
        }`
  return {
    text,
    tier: opportunity.tier === 'solida' ? 'comparación sólida' : 'comparación exploratoria',
  }
}

/** La referencia en números, para la ficha: cuánto vale, cuánto pide este y cuánto menos. */
export function computerOpportunityDetail(
  listing: Pick<ComputerPublicListing, 'priceUsd' | 'opportunity'>
): string | null {
  const opportunity = listing.opportunity
  if (!opportunity) return null
  const what =
    opportunity.reference === 'used'
      ? `Sus piezas usadas suman ${computerUsd(opportunity.referenceUsd)}`
      : `La mediana de ${opportunity.referenceLabel} es ${computerUsd(opportunity.referenceUsd)}`
  return `${what}; este aviso pide ${computerUsd(listing.priceUsd)}, ${computerUsd(opportunity.savingsUsd)} menos.`
}

/** «MacBook Air · 2017», «ThinkPad · T490»: la línea, el modelo y el año que dijo el título. */
export function computerIdentityLine(
  listing: Pick<ComputerPublicListing, 'lineLabel' | 'model' | 'modelYear'>
): string | null {
  const model = listing.model?.trim() || null
  const year =
    typeof listing.modelYear === 'number' && !(model ?? '').includes(String(listing.modelYear))
      ? String(listing.modelYear)
      : null
  const parts = [listing.lineLabel?.trim() || null, model, year].filter(Boolean)
  return listing.lineLabel && parts.length ? parts.join(' · ') : null
}

// ── /oportunidades-computadoras-usadas-uruguay ─────────────────────────────

/** El tipo en la página de oportunidades: los dos grupos o un tipo concreto. Vacío = todo, porque
 * acá una placa de video barata es tan oportunidad como una notebook. */
export type ComputerDealTipo = '' | 'computadoras' | 'piezas' | ComputerPublicKind
export const COMPUTER_DEAL_SORTS = Object.freeze(['ahorro', 'precio', 'recientes'] as const)
export type ComputerDealSort = (typeof COMPUTER_DEAL_SORTS)[number]
export const COMPUTER_DEAL_SORT_ITEMS: ReadonlyArray<{
  title: string
  value: ComputerDealSort
  short: string
}> = Object.freeze([
  { title: 'Mayor ahorro', value: 'ahorro', short: 'Mayor ahorro' },
  { title: 'Menor precio', value: 'precio', short: 'Menor precio' },
  { title: 'Más recientes', value: 'recientes', short: 'Más recientes' },
])
export const COMPUTER_DEALS_PER_PAGE = 24

export interface ComputerDealQuery {
  tipo: ComputerDealTipo
  evidencia: '' | ComputerTier
  marcaEquipo: string
  precioMaxUsd: number | null
  fuente: '' | ComputerPublicSource
  orden: ComputerDealSort
  pagina: number
}

export function computerDealNormalizeQuery(raw: Record<string, unknown>): ComputerDealQuery {
  const tipo = computerStr(raw.tipo)
  const orden = computerStr(raw.orden) as ComputerDealSort
  const marcaEquipo = computerStr(raw.marcaEquipo, 40)
  const fuente = computerStr(raw.fuente) as ComputerDealQuery['fuente']
  return {
    tipo:
      tipo === 'computadoras' || tipo === 'piezas' || tipo in COMPUTER_KIND_LABEL
        ? (tipo as ComputerDealTipo)
        : '',
    evidencia: computerOneOf(raw.evidencia, Object.keys(COMPUTER_TIER_LABEL) as ComputerTier[]),
    marcaEquipo: COMPUTER_BRAND_RE.test(marcaEquipo) ? marcaEquipo : '',
    precioMaxUsd: computerAmount(raw.precioMaxUsd, 1, 100_000),
    fuente: fuente in COMPUTER_SOURCE_LABEL ? fuente : '',
    orden: (COMPUTER_DEAL_SORTS as readonly string[]).includes(orden) ? orden : 'ahorro',
    pagina: computerInt(raw.pagina, 1, 200) ?? 1,
  }
}

export function computerDealQueryParams(query: ComputerDealQuery): Record<string, string> {
  const params: Record<string, string> = {}
  if (query.tipo) params.tipo = query.tipo
  if (query.evidencia) params.evidencia = query.evidencia
  if (query.marcaEquipo) params.marcaEquipo = query.marcaEquipo
  if (query.precioMaxUsd != null) params.precioMaxUsd = String(query.precioMaxUsd)
  if (query.fuente) params.fuente = query.fuente
  if (query.orden !== 'ahorro') params.orden = query.orden
  if (query.pagina > 1) params.pagina = String(query.pagina)
  return params
}

/** Igual que el directorio: cada combinación de filtros es una copia fina y sólo la URL base se
 * indexa. El orden no cuenta. */
export function computerDealFiltered(query: ComputerDealQuery): boolean {
  return Object.keys(computerDealQueryParams(query)).some(name => name !== 'orden')
}

export function computerDealTipoLabel(tipo: ComputerDealTipo): string {
  if (!tipo) return 'Computadoras y piezas'
  if (tipo === 'computadoras') return 'Computadoras'
  if (tipo === 'piezas') return 'Piezas sueltas'
  return COMPUTER_KIND_LABEL[tipo] ?? tipo
}

/** Los filtros activos de la página de oportunidades, para los chips. */
export function computerDealChips(
  query: ComputerDealQuery
): Array<{ key: string; keys: Array<keyof ComputerDealQuery>; label: string }> {
  const chips: Array<{ keys: Array<keyof ComputerDealQuery>; label: string }> = []
  if (query.tipo) chips.push({ keys: ['tipo'], label: computerDealTipoLabel(query.tipo) })
  if (query.evidencia)
    chips.push({ keys: ['evidencia'], label: COMPUTER_TIER_LABEL[query.evidencia] })
  if (query.marcaEquipo) chips.push({ keys: ['marcaEquipo'], label: query.marcaEquipo })
  if (query.precioMaxUsd != null)
    chips.push({ keys: ['precioMaxUsd'], label: `Hasta ${computerUsd(query.precioMaxUsd)}` })
  if (query.fuente) chips.push({ keys: ['fuente'], label: COMPUTER_SOURCE_LABEL[query.fuente] })
  return chips.map(chip => ({ ...chip, key: chip.keys.join('+') }))
}

/** La base de la página: las filas con oportunidad dentro de la ventana de frescura. */
export function computerDealBaseMatch(today: string, freshDays: number): Record<string, unknown> {
  const floor = computerFreshFloor(today, freshDays)
  return { ...(floor ? { lastSeen: { $gte: floor } } : {}), opportunity: { $ne: null } }
}

/** El filtro de la página de oportunidades, con la misma semántica de Mongo que el directorio (lo
 * evalúa `computerFilterMatches` en la vista previa). */
export function computerDealMatch(
  query: ComputerDealQuery,
  today: string,
  freshDays: number
): Record<string, unknown> {
  const match = computerDealBaseMatch(today, freshDays)
  if (query.tipo === 'computadoras') match.kindGroup = 'computer'
  else if (query.tipo === 'piezas') match.kindGroup = 'part'
  else if (query.tipo) match.kind = query.tipo
  if (query.evidencia) match['opportunity.tier'] = query.evidencia
  if (query.marcaEquipo)
    match.brand = { $regex: `^${computerEscapeRegExp(query.marcaEquipo)}$`, $options: 'i' }
  if (query.precioMaxUsd != null) match.priceUsd = { $lte: query.precioMaxUsd }
  if (query.fuente) match.source = query.fuente
  return match
}

export function computerDealSortSpec(sort: ComputerDealSort): Record<string, 1 | -1> {
  if (sort === 'precio') return { priceUsd: 1, slug: 1 }
  if (sort === 'recientes') return { publishedAt: -1, lastSeen: -1, slug: 1 }
  return { 'opportunity.savingsPct': -1, priceUsd: 1, slug: 1 }
}

/** Lo que el resumen necesita de cada fila: se lee la lista ENTERA, y con esto pesa poco. */
export const COMPUTER_DEAL_SUMMARY_PROJECTION = Object.freeze({
  _id: 0,
  slug: 1,
  priceUsd: 1,
  kind: 1,
  kindGroup: 1,
  brand: 1,
  'opportunity.tier': 1,
  'opportunity.savingsPct': 1,
})

export type ComputerDealSummaryRow = Pick<
  ComputerPublicListing,
  'priceUsd' | 'kind' | 'kindGroup' | 'brand'
> & { opportunity?: Pick<ComputerPublicOpportunity, 'tier' | 'savingsPct'> | null }

/** La lista ENTERA, sin filtros, como el resumen de autos: las páginas filtradas van noindex, así
 * que la URL indexada tiene que describir todo lo que hay y no sólo los primeros 24. */
export interface ComputerDealSummary {
  total: number
  solid: number
  exploratory: number
  minUsd: number | null
  maxUsd: number | null
  medianUsd: number | null
  medianSavingsPct: number | null
  computers: number
  parts: number
  kinds: Array<{ kind: ComputerPublicKind; label: string; count: number }>
  brands: ComputerFacet[]
}

export function computerDealSummary(rows: readonly ComputerDealSummaryRow[]): ComputerDealSummary {
  const deals = rows.filter(row => row.opportunity)
  const prices = deals.map(row => row.priceUsd).filter(price => price > 0)
  const savings = deals.map(row => row.opportunity!.savingsPct).filter(pct => pct > 0)
  const kinds = new Map<ComputerPublicKind, number>()
  const brands = new Map<string, number>()
  for (const row of deals) {
    kinds.set(row.kind, (kinds.get(row.kind) ?? 0) + 1)
    if (row.brand) brands.set(row.brand, (brands.get(row.brand) ?? 0) + 1)
  }
  return {
    total: deals.length,
    solid: deals.filter(row => row.opportunity!.tier === 'solida').length,
    exploratory: deals.filter(row => row.opportunity!.tier === 'exploratoria').length,
    minUsd: prices.length ? Math.min(...prices) : null,
    maxUsd: prices.length ? Math.max(...prices) : null,
    medianUsd: prices.length ? computerMedian(prices) : null,
    medianSavingsPct: savings.length ? computerMedian(savings) : null,
    computers: deals.filter(row => row.kindGroup === 'computer').length,
    parts: deals.filter(row => row.kindGroup === 'part').length,
    kinds: [...kinds.entries()]
      .map(([kind, count]) => ({ kind, label: COMPUTER_KIND_LABEL[kind] ?? kind, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es')),
    brands: [...brands.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es'))
      .slice(0, 40),
  }
}

export interface ComputerDealsResponse {
  status: ComputerStatus
  generatedAt: string
  total: number
  page: number
  perPage: number
  items: ComputerPublicListing[]
  summary: ComputerDealSummary
}

export function computerDealsEmpty(
  query: ComputerDealQuery,
  status: ComputerStatus = 'preparing'
): ComputerDealsResponse {
  return {
    status,
    generatedAt: '',
    total: 0,
    page: query.pagina,
    perPage: COMPUTER_DEALS_PER_PAGE,
    items: [],
    summary: computerDealSummary([]),
  }
}

/** La página entera en memoria, con el mismo filtro y el mismo orden (vista previa de dev). */
export function computerDealsInMemory(
  rows: readonly ComputerPublicListing[],
  meta: ComputerPublicMeta | null,
  query: ComputerDealQuery,
  today: string
): ComputerDealsResponse {
  const coverage = computerCoverageOf(meta)
  const freshDays = coverage?.freshDays ?? COMPUTER_FRESH_DAYS_FALLBACK
  const base = computerDealBaseMatch(today, freshDays)
  const match = computerDealMatch(query, today, freshDays)
  const matched = computerSortRows(
    rows.filter(row => computerFilterMatches(match, row)),
    computerDealSortSpec(query.orden)
  )
  const start = (query.pagina - 1) * COMPUTER_DEALS_PER_PAGE
  return {
    status: meta ? 'ok' : 'preparing',
    generatedAt: coverage?.generatedAt ?? '',
    total: matched.length,
    page: query.pagina,
    perPage: COMPUTER_DEALS_PER_PAGE,
    items: matched.slice(start, start + COMPUTER_DEALS_PER_PAGE),
    summary: computerDealSummary(rows.filter(row => computerFilterMatches(base, row))),
  }
}

/** «32 %», sin decimales: un ahorro de 31,7 % no dice más que uno de 32. */
export function computerPercent(share: number | null | undefined, digits = 0): string {
  if (typeof share !== 'number' || !Number.isFinite(share)) return '—'
  return `${(share * 100).toLocaleString('es-UY', { maximumFractionDigits: digits, minimumFractionDigits: digits })} %`
}

/** El resumen en palabras, para el párrafo de arriba y el FAQ. Sin oportunidades lo dice. */
export function computerDealSummaryText(summary: ComputerDealSummary): string {
  if (!summary.total)
    return 'Hoy no hay ningún aviso que cumpla las condiciones. Es un resultado válido: la regla es exigente a propósito.'
  const head =
    summary.total === 1
      ? `Hay 1 aviso que pide bastante menos que su referencia, con comparación ${summary.solid ? 'sólida' : 'exploratoria'}.`
      : `Hay ${summary.total.toLocaleString('es-UY')} avisos que piden bastante menos que su referencia: ${summary.solid.toLocaleString('es-UY')} con comparación sólida y ${summary.exploratory.toLocaleString('es-UY')} exploratoria.`
  const prices =
    summary.minUsd != null && summary.maxUsd != null && summary.medianUsd != null
      ? ` Piden entre ${computerUsd(summary.minUsd)} y ${computerUsd(summary.maxUsd)} (mediana ${computerUsd(summary.medianUsd)})`
      : ''
  const savings =
    summary.medianSavingsPct != null
      ? `${prices ? ' y' : ''} el ahorro mediano contra su referencia es de ${computerPercent(summary.medianSavingsPct)}.`
      : prices
        ? '.'
        : ''
  const groups =
    summary.computers && summary.parts
      ? ` Son ${summary.computers.toLocaleString('es-UY')} ${summary.computers === 1 ? 'computadora' : 'computadoras'} y ${summary.parts.toLocaleString('es-UY')} ${summary.parts === 1 ? 'pieza suelta' : 'piezas sueltas'}.`
      : ''
  return `${head}${prices}${savings}${groups}`
}

export function computerDealFaq(summary: ComputerDealSummary, generatedAt: string) {
  const fecha = computerLongDate(generatedAt)
  return [
    {
      id: 'pc-oportunidad-que-es',
      question: '¿Qué es una oportunidad en una computadora usada?',
      answer:
        'Un aviso que pide entre el 15 % y el 55 % menos que su referencia: la suma de lo que salen hoy sus mismas piezas usadas (una PC de escritorio), lo que piden por máquinas iguales (una notebook, una all-in-one o una mini PC) o lo que piden por la misma pieza usada. Por debajo de eso queda afuera: un precio tan bajo es más seguido un error, una falla no dicha o una estafa que una ganga.',
    },
    {
      id: 'pc-oportunidad-cuantas',
      question: '¿Cuántas oportunidades hay hoy?',
      answer: `${computerDealSummaryText(summary)}${fecha ? ` Cálculo del ${fecha}.` : ''}`,
    },
    {
      id: 'pc-oportunidad-solida',
      question: '¿Qué diferencia hay entre una comparación sólida y una exploratoria?',
      answer:
        'Cuánta evidencia hay detrás. Es sólida cuando la referencia es la suma completa de sus piezas usadas, o la mediana de al menos seis avisos iguales por procesador, placa o chip, o de al menos cinco piezas usadas iguales. Es exploratoria con menos avisos o con una igualdad más gruesa (la misma línea y familia de procesador, o un Mac por año): sirve para mirar, no para apurarse.',
    },
    {
      id: 'pc-oportunidad-seguro',
      question: '¿Es seguro comprar una oportunidad?',
      answer:
        'No lo sabemos, y nadie lo puede saber desde un aviso. Ninguna oportunidad declara una falla ni tiene la moneda deducida por nosotros, y en Facebook leímos la ficha de cada una, pero un precio bajo puede tener una explicación que el vendedor no escribió. Pedí verla encendida, probá teclado, pantalla y batería, y no pagues señas ni envíos antes de tenerla en la mano.',
    },
  ]
}

// ── /precios-notebooks-usadas-uruguay ──────────────────────────────────────

export interface ComputerNotebookReportResponse {
  status: ComputerStatus
  generatedAt: string
  report: ComputerPublicNotebookReport | null
}

/** El directorio de notebooks con unos filtros puestos: cada fila del informe lleva a sus avisos. */
export function computerNotebookLink(params: Record<string, string | number | null | undefined>) {
  const query: Record<string, string> = { tipo: 'notebook' }
  for (const [key, value] of Object.entries(params))
    if (value != null && value !== '') query[key] = String(value)
  return { path: COMPUTADORAS_PATH, query }
}

/** «Hasta US$ 300», «US$ 300 a US$ 600», «Más de US$ 1.500». */
export function computerBandLabel(minUsd: number, maxUsd: number | null): string {
  if (!minUsd && maxUsd != null) return `Hasta ${computerUsd(maxUsd)}`
  if (maxUsd == null) return `Más de ${computerUsd(minUsd)}`
  return `${computerUsd(minUsd)} a ${computerUsd(maxUsd)}`
}

/** «core-i5-12» → «12.ª generación». */
export function computerGenerationLabel(generation: number): string {
  return `${generation}.ª generación`
}

/**
 * «Lo que dicen los datos»: tres a cinco frases armadas con las celdas del informe, nunca con
 * números escritos a mano. Una frase cuyas celdas no existen (no hay muestra) no se dice: es mejor
 * una frase menos que una frase con un número que el informe no sostiene.
 */
export function computerNotebookFindings(report: ComputerPublicNotebookReport): string[] {
  const findings: string[] = []
  const n = (value: number) => value.toLocaleString('es-UY')

  const brands = [...(report.brands ?? [])].sort((a, b) => a.medianUsd - b.medianUsd)
  if (brands.length >= 2) {
    const cheap = brands[0]!
    const dear = brands[brands.length - 1]!
    findings.push(
      `Por marca, la mediana más baja es la de ${cheap.label} (${computerUsd(cheap.medianUsd)}, ${n(cheap.n)} avisos) y la más alta la de ${dear.label} (${computerUsd(dear.medianUsd)}, ${n(dear.n)} avisos): la marca dice mucho del precio porque arrastra el procesador y la línea.`
    )
  }

  const chip = (line: string, step: string) =>
    (report.macLadder ?? []).find(
      cell => cell.line === line && cell.kind === 'chip' && cell.step.toLowerCase() === step
    )
  for (const line of ['macbook-air', 'macbook-pro']) {
    const m1 = chip(line, 'm1')
    const m2 = chip(line, 'm2')
    if (m1 && m2 && m2.medianUsd > m1.medianUsd) {
      const label = line === 'macbook-air' ? 'MacBook Air' : 'MacBook Pro'
      findings.push(
        `Pasar de una ${label} con M1 a una con M2 cuesta ${computerUsd(m2.medianUsd - m1.medianUsd)} más en mediana (${computerUsd(m1.medianUsd)} contra ${computerUsd(m2.medianUsd)}, con ${n(m1.n)} y ${n(m2.n)} avisos).`
      )
      break
    }
  }

  const i5 = (report.generations ?? [])
    .filter(cell => cell.family === 'core-i5')
    .sort((a, b) => a.generation - b.generation)
  if (i5.length >= 2) {
    const old = i5[0]!
    const recent = i5[i5.length - 1]!
    if (recent.medianUsd > old.medianUsd)
      findings.push(
        `Un Core i5 de ${computerGenerationLabel(recent.generation)} pide ${computerUsd(recent.medianUsd)} en mediana y uno de ${computerGenerationLabel(old.generation)}, ${computerUsd(old.medianUsd)}: la generación pesa más que el número del i5.`
      )
  }

  const ram = [...(report.ram ?? [])].sort((a, b) => a.gb - b.gb)
  const r8 = ram.find(cell => cell.gb === 8)
  const r16 = ram.find(cell => cell.gb === 16)
  if (r8 && r16 && r16.medianUsd > r8.medianUsd)
    findings.push(
      `Con 16 GB de RAM la mediana es ${computerUsd(r16.medianUsd)}, contra ${computerUsd(r8.medianUsd)} con 8 GB: no es lo que cuesta la memoria, es que las de 16 GB suelen ser más nuevas.`
    )

  const shares = (report.usedVsNew ?? []).map(row => row.share).filter(share => share > 0)
  if (shares.length >= 2)
    findings.push(
      `Contra la misma notebook nueva (mismo procesador), la usada pide en mediana el ${computerPercent(computerMedian(shares))} de lo que sale la nueva, sobre ${n(shares.length)} procesadores con las dos medidas.`
    )
  else if (report.headline && report.total)
    findings.push(
      `El ${computerPercent(report.headline.under300Share)} de las notebooks usadas pide menos de ${computerUsd(300)}, y el ${computerPercent(report.headline.dedicatedShare)} declara placa de video dedicada.`
    )
  return findings.slice(0, 5)
}

export function computerNotebookFaq(report: ComputerPublicNotebookReport | null) {
  if (!report || !report.total) return []
  const h = report.headline
  return [
    {
      id: 'notebook-precio',
      question: '¿Cuánto sale una notebook usada en Uruguay?',
      answer: `La mediana de lo que se pide es ${computerUsd(h.medianUsd)}, y la mitad de los avisos pide entre ${computerUsd(h.p25Usd)} y ${computerUsd(h.p75Usd)}, sobre ${report.total.toLocaleString('es-UY')} notebooks publicadas sin fallas declaradas. Son precios pedidos en avisos, no precios de venta.`,
    },
    {
      id: 'notebook-mac',
      question: '¿Cuánto sale una MacBook usada?',
      answer: (() => {
        const cells = (report.macLadder ?? []).filter(cell => cell.kind === 'chip')
        if (!cells.length)
          return 'Todavía no hay avisos suficientes de cada chip para publicar una mediana.'
        return `Depende del chip más que del año: ${cells
          .slice(0, 6)
          .map(cell => `${cell.label}, ${computerUsd(cell.medianUsd)}`)
          .join('; ')}. Cada mediana sale de ${report.ladderSample} avisos o más.`
      })(),
    },
    {
      id: 'notebook-usada-o-nueva',
      question: '¿Conviene una notebook usada o una nueva?',
      answer:
        'Depende de cuánto más barata sea la usada contra la misma nueva. Si la diferencia es chica, la nueva trae garantía y batería sin uso; si es grande, la usada rinde, pero probala antes de pagar: batería, pantalla, teclado y cargador.',
    },
  ]
}
