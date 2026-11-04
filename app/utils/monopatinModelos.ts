// Los modelos de monopatín: /monopatines-electricos-uruguay/<modelo>, el comparador y la tabla de
// modelos del hub. El catálogo lo arma currency-movilidad-specs cada hora (classes/movilidad/models/);
// acá sólo se lee y se presenta.
//
// `app/utils` es un espacio de auto-import plano: todo lo de acá lleva el prefijo `monopatinModel`/
// `MONOPATIN_MODEL_` para no chocar con equipar ni celulares.
import type { FaqItem } from './faqAnswers'
import { monopatinChargeCostUyu, type MonopatinSpecsPublic } from './monopatinFicha'
import { MONOPATIN_AUTONOMIA_REAL } from './monopatinAsesor'

export type MonopatinConsensusValues = Omit<MonopatinSpecsPublic, 'fromFicha'>
export type MonopatinConsensusField = keyof MonopatinConsensusValues
export type MonopatinNumericField =
  | 'rangeKm'
  | 'maxSpeedKmh'
  | 'motorW'
  | 'motorPeakW'
  | 'batteryV'
  | 'batteryAh'
  | 'batteryWh'
  | 'chargeHours'
  | 'maxLoadKg'
  | 'weightKg'
  | 'wheelInches'
  | 'minAge'

export interface MonopatinModelOffer {
  listingId: string
  title: string
  sellerName: string
  sellerKey: string
  url: string
  price: number
  currency: 'UYU' | 'USD'
  priceUyu: number
  condition: 'new' | 'used'
  source: 'store' | 'mercadolibre'
  image: string | null
  observedAt: string
  freeShipping: boolean | null
  officialStore: boolean
}

export interface MonopatinModelBand {
  min: number
  median: number
  max: number
  n: number
  sellers: number
}

export interface MonopatinConsensus {
  values: MonopatinConsensusValues
  agree: Partial<Record<MonopatinConsensusField, { n: number; of: number }>>
  spread: Partial<Record<MonopatinNumericField, { min: number; max: number }>>
}

export interface MonopatinModelHistoryPoint {
  day: string
  newMin: number
  newMedian: number
  n: number
}

/** Espejo de `MovilidadModelDoc` (classes/movilidad/models/build.ts). */
export interface MonopatinModelDoc {
  slug: string
  name: string
  brandKey: string
  brandLabel: string
  modelLabel: string
  variant: string
  image: string | null
  offers: MonopatinModelOffer[]
  newBand: MonopatinModelBand | null
  usedBand: MonopatinModelBand | null
  specs: MonopatinConsensus | null
  fichas: number
  listings: number
  sellers: number
  indexable: boolean
  firstSeen: string
  lastSeen: string
  generatedAt: string
  history: MonopatinModelHistoryPoint[]
}

/** Lo que la tabla del hub, el selector del comparador y los "Comparalo con" necesitan de un modelo. */
export interface MonopatinModelSummary {
  slug: string
  name: string
  brandLabel: string
  modelLabel: string
  variant: string
  image: string | null
  newMin: number | null
  newMedian: number | null
  usedMin: number | null
  sellers: number
  listings: number
  indexable: boolean
  specs: MonopatinConsensusValues | null
}

/** `GET /api/movilidad/modelos/<slug>`. */
export interface MonopatinModelDetailResponse {
  generatedAt: string
  model: MonopatinModelDoc
  siblings: MonopatinModelSummary[]
}

/** `GET /api/movilidad/modelos`. */
export interface MonopatinModelListResponse {
  generatedAt: string | null
  models: MonopatinModelSummary[]
}

/** Marca y modelo en minúsculas con guiones; "comparar" (una palabra) nunca es un modelo. */
export const MONOPATIN_MODEL_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+){1,6}$/
/** Igual que el job (`MODEL_FRESH_DAYS`): un modelo sin avisos vistos en una semana deja de servirse. */
export const MONOPATIN_MODEL_STALE_DAYS = 7
export const MONOPATIN_COMPARE_MAX = 3

const NB = String.fromCharCode(160)
const money = (value: number) => `$${NB}${Math.round(value).toLocaleString('es-UY')}`
const num = (value: number) => value.toLocaleString('es-UY')

/** El primer día que todavía se sirve, `YYYY-MM-DD`. */
export function monopatinModelFreshFloor(today: string): string {
  const date = new Date(`${today}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() - MONOPATIN_MODEL_STALE_DAYS)
  return date.toISOString().slice(0, 10)
}

export function monopatinModelSummary(doc: MonopatinModelDoc): MonopatinModelSummary {
  return {
    slug: doc.slug,
    name: doc.name,
    brandLabel: doc.brandLabel,
    modelLabel: doc.modelLabel,
    variant: doc.variant,
    image: doc.image ?? null,
    newMin: doc.newBand?.min ?? null,
    newMedian: doc.newBand?.median ?? null,
    usedMin: doc.usedBand?.min ?? null,
    sellers: doc.sellers,
    listings: doc.listings,
    indexable: Boolean(doc.indexable),
    specs: doc.specs?.values ?? null,
  }
}

const refPrice = (model: Pick<MonopatinModelSummary, 'newMin' | 'usedMin'>) =>
  model.newMin ?? model.usedMin

/** Hasta `max` modelos del mismo tipo con el precio más parecido, para "Comparalo con". */
export function monopatinModelSiblings(
  model: MonopatinModelSummary,
  all: readonly MonopatinModelSummary[],
  max = 4
): MonopatinModelSummary[] {
  const price = refPrice(model)
  if (price === null) return []
  return all
    .filter(
      other =>
        other.slug !== model.slug && other.variant === model.variant && refPrice(other) !== null
    )
    .sort(
      (a, b) =>
        Math.abs(refPrice(a)! - price) - Math.abs(refPrice(b)! - price) ||
        a.slug.localeCompare(b.slug)
    )
    .slice(0, max)
}

/** "Xiaomi 6 Pro": el nombre sin la línea ("Electric Scooter"), que es como se busca. */
export function monopatinModelShortName(
  model: Pick<MonopatinModelDoc, 'brandLabel' | 'modelLabel'>
): string {
  return `${model.brandLabel} ${model.modelLabel.replace(/^Electric Scooter /, '')}`
}

const TITLE_MAX = 60
const TITLE_SUFFIX = ' | Cambio Uruguay'
const fits = (title: string) => (title + TITLE_SUFFIX).length <= TITLE_MAX

/**
 * El título con el precio nuevo más bajo (la misma cifra de la descripción y del encabezado), con el
 * nombre corto si el largo no entra; sin oferta nueva, el título sin cifra. Mismo criterio que las
 * fichas de celulares (`docs/seo/experiments.json`, celulares-precio-en-el-titulo).
 */
export function monopatinModelTitle(model: MonopatinModelDoc): string {
  const short = monopatinModelShortName(model)
  const candidates = model.newBand
    ? [
        `${model.name}: desde ${money(model.newBand.min)}`,
        `Monopatín ${short}: desde ${money(model.newBand.min)}`,
        `${short}: desde ${money(model.newBand.min)}`,
      ]
    : []
  candidates.push(`${model.name}: precio en Uruguay`, `Monopatín ${short}: precio en Uruguay`)
  return candidates.find(fits) ?? `${short}: precio en Uruguay`
}

/** La descripción: precio, vendedores y lo central de la ficha, recortada por partes a 155. */
export function monopatinModelDescription(model: MonopatinModelDoc): string {
  const short = monopatinModelShortName(model)
  const v = model.specs?.values
  const sellers = `${model.sellers} ${model.sellers === 1 ? 'vendedor' : 'vendedores'}`
  const head = model.newBand
    ? `${short} nuevo desde ${money(model.newBand.min)} en ${sellers} de Uruguay.`
    : model.usedBand
      ? `${short} usado desde ${money(model.usedBand.min)} en ${sellers} de Uruguay.`
      : `Precio del ${short} en Uruguay.`
  const specs = [
    v?.rangeKm ? `${num(v.rangeKm)}${NB}km de autonomía` : null,
    v?.maxSpeedKmh ? `${num(v.maxSpeedKmh)}${NB}km/h` : null,
    v?.motorW ? `${num(v.motorW)}${NB}W` : null,
    v?.weightKg ? `${num(v.weightKg)}${NB}kg` : null,
  ].filter((part): part is string => Boolean(part))
  const tail = 'Todas las ofertas y su ficha técnica.'
  for (let count = specs.length; count >= 0; count--) {
    const middle = count ? ` Ficha: ${specs.slice(0, count).join(', ')}.` : ''
    for (const end of [` ${tail}`, '']) {
      const text = `${head}${middle}${end}`
      if (text.length <= 155) return text
    }
  }
  return head.slice(0, 155)
}

export interface MonopatinSpecAgreement {
  value: number
  min: number
  max: number
  n: number
  of: number
  /** La mitad de las fichas o más dicen el valor publicado. */
  agrees: boolean
}

/** Cuánto coinciden las fichas en un dato: la página muestra el valor, o el rango si no coinciden. */
export function monopatinSpecAgreement(
  specs: MonopatinConsensus,
  field: MonopatinNumericField
): MonopatinSpecAgreement | null {
  const value = specs.values[field]
  if (typeof value !== 'number') return null
  const agree = specs.agree[field] ?? { n: 1, of: 1 }
  const spread = specs.spread[field]
  return {
    value,
    min: spread?.min ?? value,
    max: spread?.max ?? value,
    n: agree.n,
    of: agree.of,
    agrees: agree.n * 2 >= agree.of,
  }
}

/** La misma regla del asesor: en la calle rinde el 65 % de lo que declara la ficha. */
export function monopatinRealRangeKm(km: number | null | undefined): number | null {
  return typeof km === 'number' && km > 0 ? Math.round(km * MONOPATIN_AUTONOMIA_REAL) : null
}

type CompareRule = 'max' | 'min' | null

interface CompareSpec {
  key: string
  label: string
  rule: CompareRule
  read: (model: MonopatinModelSummary) => number | boolean | string | null
  format?: (value: number) => string
}

const yesNo = (value: boolean) => (value ? 'Sí' : 'No')
const withUnit = (suffix: string) => (value: number) => `${num(value)}${NB}${suffix}`

const COMPARE_SPECS: readonly CompareSpec[] = [
  { key: 'price', label: 'Nuevo desde', rule: 'min', read: m => m.newMin, format: money },
  { key: 'usedMin', label: 'Usado desde', rule: 'min', read: m => m.usedMin, format: money },
  { key: 'sellers', label: 'Vendedores', rule: 'max', read: m => m.sellers, format: num },
  {
    key: 'rangeKm',
    label: 'Autonomía declarada',
    rule: 'max',
    read: m => m.specs?.rangeKm ?? null,
    format: withUnit('km'),
  },
  {
    key: 'realRangeKm',
    label: 'Autonomía estimada en la calle',
    rule: 'max',
    read: m => monopatinRealRangeKm(m.specs?.rangeKm),
    format: withUnit('km'),
  },
  {
    key: 'maxSpeedKmh',
    label: 'Velocidad máxima',
    rule: null,
    read: m => m.specs?.maxSpeedKmh ?? null,
    format: withUnit('km/h'),
  },
  {
    key: 'motorW',
    label: 'Potencia',
    rule: 'max',
    read: m => m.specs?.motorW ?? null,
    format: withUnit('W'),
  },
  {
    key: 'motorPeakW',
    label: 'Potencia máxima',
    rule: 'max',
    read: m => m.specs?.motorPeakW ?? null,
    format: withUnit('W'),
  },
  {
    key: 'batteryWh',
    label: 'Batería',
    rule: 'max',
    read: m => m.specs?.batteryWh ?? null,
    format: withUnit('Wh'),
  },
  {
    key: 'batteryV',
    label: 'Voltaje',
    rule: null,
    read: m => m.specs?.batteryV ?? null,
    format: withUnit('V'),
  },
  {
    key: 'batteryAh',
    label: 'Capacidad',
    rule: null,
    read: m => m.specs?.batteryAh ?? null,
    format: withUnit('Ah'),
  },
  {
    key: 'chargeHours',
    label: 'Tiempo de carga',
    rule: 'min',
    read: m => m.specs?.chargeHours ?? null,
    format: withUnit('h'),
  },
  {
    key: 'weightKg',
    label: 'Peso',
    rule: 'min',
    read: m => m.specs?.weightKg ?? null,
    format: withUnit('kg'),
  },
  {
    key: 'maxLoadKg',
    label: 'Peso que soporta',
    rule: 'max',
    read: m => m.specs?.maxLoadKg ?? null,
    format: withUnit('kg'),
  },
  {
    key: 'wheelInches',
    label: 'Ruedas',
    rule: null,
    read: m => m.specs?.wheelInches ?? null,
    format: value => `${num(value)}"`,
  },
  { key: 'foldable', label: 'Plegable', rule: null, read: m => m.specs?.foldable ?? null },
  { key: 'suspension', label: 'Suspensión', rule: null, read: m => m.specs?.suspension ?? null },
  { key: 'brakes', label: 'Frenos', rule: null, read: m => m.specs?.brakes ?? null },
  { key: 'bluetooth', label: 'App o bluetooth', rule: null, read: m => m.specs?.bluetooth ?? null },
  {
    key: 'ipRating',
    label: 'Resistencia al agua',
    rule: null,
    read: m => m.specs?.ipRating ?? null,
  },
]

export interface MonopatinCompareRow {
  key: string
  label: string
  /** Una celda por modelo, ya formateada; null = la ficha no lo dice. */
  cells: (string | null)[]
  /** Los índices del mejor de la fila; vacío si menos de dos modelos lo dicen o todos dicen lo mismo. */
  best: number[]
}

/**
 * Las filas del comparador. La velocidad no se premia (más de 25 km/h no se puede usar en Montevideo
 * y San José), ni el voltaje, la capacidad o la rueda, que no son "mejores" por ser más grandes.
 */
export function monopatinCompareRows(
  models: readonly MonopatinModelSummary[]
): MonopatinCompareRow[] {
  const rows: MonopatinCompareRow[] = []
  for (const spec of COMPARE_SPECS) {
    const raw = models.map(spec.read)
    if (raw.every(value => value === null)) continue
    const cells = raw.map(value =>
      value === null
        ? null
        : typeof value === 'boolean'
          ? yesNo(value)
          : typeof value === 'number'
            ? (spec.format ?? num)(value)
            : value
    )
    let best: number[] = []
    const numbers = raw.map(value => (typeof value === 'number' ? value : null))
    const present = numbers.filter((value): value is number => value !== null)
    if (spec.rule && present.length >= 2 && new Set(present).size > 1) {
      const target = spec.rule === 'max' ? Math.max(...present) : Math.min(...present)
      best = numbers.flatMap((value, index) => (value === target ? [index] : []))
    }
    rows.push({ key: spec.key, label: spec.label, cells, best })
  }
  return rows
}

/** El nombre de cada tipo, como lo escribe `classes/movilidad/registry.ts`. */
export const MONOPATIN_VARIANT_LABEL: Readonly<Record<string, string>> = {
  urbano: 'Urbano o estándar',
  'alto-rendimiento': 'Alto rendimiento',
  infantil: 'Infantil',
}

export interface MonopatinSpecTableRow {
  key: MonopatinConsensusField
  label: string
  value: string
  /** "5 de 5 fichas", "Las fichas no coinciden", o null con una sola ficha. */
  note: string | null
}

const SPEC_TABLE: ReadonlyArray<{ key: MonopatinConsensusField; label: string; unit?: string }> = [
  { key: 'rangeKm', label: 'Autonomía declarada', unit: 'km' },
  { key: 'maxSpeedKmh', label: 'Velocidad máxima', unit: 'km/h' },
  { key: 'motorW', label: 'Potencia del motor', unit: 'W' },
  { key: 'motorPeakW', label: 'Potencia máxima', unit: 'W' },
  { key: 'batteryV', label: 'Voltaje de la batería', unit: 'V' },
  { key: 'batteryAh', label: 'Capacidad de la batería', unit: 'Ah' },
  { key: 'batteryWh', label: 'Energía de la batería', unit: 'Wh' },
  { key: 'chargeHours', label: 'Tiempo de carga', unit: 'h' },
  { key: 'maxLoadKg', label: 'Peso máximo que soporta', unit: 'kg' },
  { key: 'weightKg', label: 'Peso del monopatín', unit: 'kg' },
  { key: 'wheelInches', label: 'Tamaño de las ruedas', unit: '"' },
  { key: 'minAge', label: 'Edad mínima', unit: 'años' },
  { key: 'foldable', label: 'Plegable' },
  { key: 'suspension', label: 'Suspensión' },
  { key: 'discBrake', label: 'Freno a disco' },
  { key: 'brakes', label: 'Frenos' },
  { key: 'bluetooth', label: 'App o bluetooth' },
  { key: 'ipRating', label: 'Resistencia al agua' },
]

const measure = (value: number, unit?: string) =>
  unit === '"' ? `${num(value)}"` : unit ? `${num(value)}${NB}${unit}` : num(value)

/** La ficha técnica del modelo, fila por fila, con cuánto coinciden las fichas de sus avisos. */
export function monopatinSpecTableRows(specs: MonopatinConsensus): MonopatinSpecTableRow[] {
  const rows: MonopatinSpecTableRow[] = []
  for (const { key, label, unit } of SPEC_TABLE) {
    const value = specs.values[key]
    if (value === null || value === undefined) continue
    const agree = specs.agree[key]
    const several = agree && agree.of >= 2 ? agree : null
    if (typeof value === 'number') {
      const spread = specs.spread[key as MonopatinNumericField]
      const agrees = !several || several.n * 2 >= several.of
      rows.push({
        key,
        label,
        value:
          agrees || !spread
            ? measure(value, unit)
            : `${num(spread.min)} a ${measure(spread.max, unit)}`,
        note: !several
          ? null
          : agrees
            ? `${several.n} de ${several.of} fichas`
            : 'Las fichas no coinciden',
      })
    } else {
      rows.push({
        key,
        label,
        value: typeof value === 'boolean' ? yesNo(value) : value,
        note: several ? `${several.n} de ${several.of} fichas` : null,
      })
    }
  }
  return rows
}

/** Las preguntas de la página del modelo: sólo las que su ficha puede contestar. */
export function monopatinModelFaq(model: MonopatinModelDoc): FaqItem[] {
  const short = monopatinModelShortName(model)
  const v = model.specs?.values
  const faq: FaqItem[] = []

  const price: string[] = []
  if (model.newBand) {
    price.push(
      `Nuevo, desde ${money(model.newBand.min)} en ${model.newBand.sellers} ${model.newBand.sellers === 1 ? 'vendedor' : 'vendedores'}` +
        (model.newBand.n > 1
          ? `; la mitad de las ofertas está en ${money(model.newBand.median)} o menos.`
          : '.')
    )
  }
  if (model.usedBand) price.push(`Usado, desde ${money(model.usedBand.min)}.`)
  price.push(
    'Son los precios que publican los vendedores en Mercado Libre y en tiendas uruguayas; el envío y la garantía se confirman en cada aviso.'
  )
  faq.push({
    id: 'monopatin-modelo-precio',
    question: `¿Cuánto sale el ${short} en Uruguay?`,
    answer: price.join(' '),
  })

  if (v?.rangeKm) {
    faq.push({
      id: 'monopatin-modelo-autonomia',
      question: `¿Qué autonomía tiene el ${short}?`,
      answer:
        `La ficha declara ${num(v.rangeKm)} km por carga, medidos por el fabricante en condiciones ideales. ` +
        `En la calle, con un adulto, alguna subida y la velocidad máxima, contá con unos ${monopatinRealRangeKm(v.rangeKm)} km ` +
        `(el 65 % de lo declarado, la misma regla del asesor de la página de monopatines).`,
    })
  }

  if (v?.chargeHours || v?.batteryWh) {
    const parts: string[] = []
    if (v.chargeHours)
      parts.push(`Según la ficha, la carga completa tarda ${num(v.chargeHours)} horas.`)
    const cost = monopatinChargeCostUyu(v.batteryWh)
    if (v.batteryWh && cost !== null) {
      parts.push(
        `La batería es de ${num(v.batteryWh)} Wh: cargarla de cero cuesta unos ${money(cost)} con la tarifa residencial de UTE.`
      )
    }
    faq.push({
      id: 'monopatin-modelo-carga',
      question: `¿Cuánto tarda en cargar el ${short} y cuánto sale cargarlo?`,
      answer: parts.join(' '),
    })
  }

  if (v?.weightKg || v?.maxLoadKg) {
    const parts: string[] = []
    if (v.weightKg) parts.push(`Pesa ${num(v.weightKg)} kg`)
    if (v.maxLoadKg) parts.push(`soporta hasta ${num(v.maxLoadKg)} kg`)
    faq.push({
      id: 'monopatin-modelo-peso',
      question: `¿Cuánto pesa el ${short} y cuánto peso aguanta?`,
      answer: `${parts.join(' y ')}, según la ficha. Para subirlo a un ómnibus o a un apartamento sin ascensor, más de 15 kg ya se siente.`,
    })
  }

  if (v?.maxSpeedKmh) {
    faq.push({
      id: 'monopatin-modelo-montevideo',
      question: `¿Se puede usar el ${short} en Montevideo?`,
      answer:
        v.maxSpeedKmh > 25
          ? `Declara ${num(v.maxSpeedKmh)} km/h, más que los 25 km/h que permiten Montevideo y San José: se puede usar, pero limitado a 25 km/h y con casco.`
          : `Declara ${num(v.maxSpeedKmh)} km/h, dentro de los 25 km/h que permiten Montevideo y San José, donde además el casco es obligatorio.`,
    })
  }
  return faq
}

/**
 * Los modelos del comparador desde `?m=a,b,c` (o `?m=a&m=b`): sólo slugs que existen, sin repetidos,
 * hasta MONOPATIN_COMPARE_MAX. Lo que no se reconoce se descarta en silencio: es una URL compartida.
 */
export function monopatinCompareSlugs(raw: unknown, known: ReadonlySet<string>): string[] {
  const parts = (Array.isArray(raw) ? raw : [raw])
    .filter((value): value is string => typeof value === 'string')
    .flatMap(value => value.split(','))
    .map(value => value.trim())
  const out: string[] = []
  for (const slug of parts) {
    if (out.length >= MONOPATIN_COMPARE_MAX) break
    if (MONOPATIN_MODEL_SLUG_RE.test(slug) && known.has(slug) && !out.includes(slug)) out.push(slug)
  }
  return out
}
