// Los modelos de bicicleta eléctrica: /bicicletas-electricas-uruguay/<modelo>, su comparador y la tabla
// de modelos del hub. Mismo catálogo que monopatines (classes/movilidad/models/, `category:
// bicicleta-electrica`) y el mismo documento: lo genérico (resumen, hermanos, coincidencia de fichas,
// grupos de ofertas, slugs del comparador) se usa de utils/monopatinModelos.ts. Acá está lo que se
// escribe distinto para una bici: el título, la descripción, las filas de la ficha y del comparador,
// las preguntas y la regla de autonomía real (60 %, utils/bicicletaAsesor.ts).
//
// `app/utils` es un espacio de auto-import plano: todo lleva el prefijo `bicicletaModel`/`BICICLETA_MODEL_`.
import type { FaqItem } from './faqAnswers'
import { BICICLETA_AUTONOMIA_REAL, BICICLETA_CORTE_ASISTENCIA_KMH } from './bicicletaAsesor'
import { monopatinChargeCostUyu } from './monopatinFicha'
import type {
  MonopatinCompareRow,
  MonopatinConsensus,
  MonopatinConsensusField,
  MonopatinModelDoc,
  MonopatinModelSummary,
  MonopatinNumericField,
  MonopatinSpecTableRow,
} from './monopatinModelos'

export const BICICLETA_MODEL_HUB = '/bicicletas-electricas-uruguay'
export const BICICLETA_MODEL_COMPARE_PATH = `${BICICLETA_MODEL_HUB}/comparar`

const NB = String.fromCharCode(160)
const money = (value: number) => `$${NB}${Math.round(value).toLocaleString('es-UY')}`
const num = (value: number) => value.toLocaleString('es-UY', { maximumFractionDigits: 1 })
const yesNo = (value: boolean) => (value ? 'Sí' : 'No')

/** El nombre de cada tipo, como lo escribe `classes/movilidad/registry.ts`. */
export const BICICLETA_VARIANT_LABEL: Readonly<Record<string, string>> = {
  infantil: 'Infantil o de equilibrio',
  plegable: 'Plegable',
  urbana: 'Urbana o paseo',
  montana: 'Montaña',
  carga: 'De carga',
}

/** La misma regla del asesor: en la calle, con asistencia media y alguna cuesta, el 60 % de lo declarado. */
export function bicicletaRealRangeKm(km: number | null | undefined): number | null {
  return typeof km === 'number' && km > 0 ? Math.round(km * BICICLETA_AUTONOMIA_REAL) : null
}

/** "Gyroor C3": la marca y el modelo, que es como se busca. */
export const bicicletaModelShortName = (
  model: Pick<MonopatinModelDoc, 'brandLabel' | 'modelLabel'>
): string => `${model.brandLabel} ${model.modelLabel}`

const TITLE_MAX = 60
const TITLE_SUFFIX = ' | Cambio Uruguay'
const fits = (title: string) => (title + TITLE_SUFFIX).length <= TITLE_MAX

/**
 * El título con el precio nuevo más bajo (la misma cifra del encabezado), y "Bicicleta eléctrica"
 * adelante cuando entra: "Gyroor C3" solo no dice qué es. Sin oferta nueva, sin cifra.
 */
export function bicicletaModelTitle(model: MonopatinModelDoc): string {
  const short = bicicletaModelShortName(model)
  const candidates = model.newBand
    ? [
        `Bicicleta eléctrica ${short}: desde ${money(model.newBand.min)}`,
        `Bici eléctrica ${short}: desde ${money(model.newBand.min)}`,
        `${short}: desde ${money(model.newBand.min)}`,
      ]
    : []
  candidates.push(
    `Bicicleta eléctrica ${short}: precio en Uruguay`,
    `Bici eléctrica ${short}: precio en Uruguay`,
    `${short}: precio en Uruguay`
  )
  return candidates.find(fits) ?? `${short}: precio en Uruguay`
}

/** La descripción: precio, vendedores y lo central de la ficha, recortada por partes a 155. */
export function bicicletaModelDescription(model: MonopatinModelDoc): string {
  const short = bicicletaModelShortName(model)
  const v = model.specs?.values
  const sellers = `${model.sellers} ${model.sellers === 1 ? 'vendedor' : 'vendedores'}`
  const head = model.newBand
    ? `Bicicleta eléctrica ${short} nueva desde ${money(model.newBand.min)} en ${sellers} de Uruguay.`
    : model.usedBand
      ? `Bicicleta eléctrica ${short} usada desde ${money(model.usedBand.min)} en ${sellers} de Uruguay.`
      : `Precio de la bicicleta eléctrica ${short} en Uruguay.`
  const specs = [
    v?.wheelInches ? `rodado ${num(v.wheelInches)}` : null,
    v?.rangeKm ? `${num(v.rangeKm)}${NB}km de autonomía` : null,
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

const SPEC_TABLE: ReadonlyArray<{ key: MonopatinConsensusField; label: string; unit?: string }> = [
  { key: 'wheelInches', label: 'Rodado', unit: '"' },
  { key: 'rangeKm', label: 'Autonomía declarada', unit: 'km' },
  { key: 'maxSpeedKmh', label: 'Velocidad máxima', unit: 'km/h' },
  { key: 'motorW', label: 'Potencia del motor', unit: 'W' },
  { key: 'motorPeakW', label: 'Potencia máxima', unit: 'W' },
  { key: 'centralMotor', label: 'Motor central' },
  { key: 'batteryV', label: 'Voltaje de la batería', unit: 'V' },
  { key: 'batteryAh', label: 'Capacidad de la batería', unit: 'Ah' },
  { key: 'batteryWh', label: 'Energía de la batería', unit: 'Wh' },
  { key: 'removableBattery', label: 'Batería removible' },
  { key: 'chargeHours', label: 'Tiempo de carga', unit: 'h' },
  { key: 'gears', label: 'Cambios' },
  { key: 'throttle', label: 'Acelerador' },
  { key: 'maxLoadKg', label: 'Peso máximo que soporta', unit: 'kg' },
  { key: 'weightKg', label: 'Peso de la bici', unit: 'kg' },
  { key: 'foldable', label: 'Plegable' },
  { key: 'suspension', label: 'Suspensión' },
  { key: 'discBrake', label: 'Freno a disco' },
  { key: 'brakes', label: 'Frenos' },
  { key: 'ipRating', label: 'Resistencia al agua' },
]

const measure = (value: number, unit?: string) =>
  unit === '"' ? `${num(value)}"` : unit ? `${num(value)}${NB}${unit}` : num(value)

/** La ficha técnica del modelo, fila por fila, con cuánto coinciden las fichas de sus avisos. */
export function bicicletaSpecTableRows(specs: MonopatinConsensus): MonopatinSpecTableRow[] {
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

type CompareRule = 'max' | 'min' | null

interface CompareSpec {
  key: string
  label: string
  rule: CompareRule
  read: (model: MonopatinModelSummary) => number | boolean | string | null
  format?: (value: number) => string
}

const withUnit = (suffix: string) => (value: number) => `${num(value)}${NB}${suffix}`

const COMPARE_SPECS: readonly CompareSpec[] = [
  { key: 'price', label: 'Nueva desde', rule: 'min', read: m => m.newMin, format: money },
  { key: 'usedMin', label: 'Usada desde', rule: 'min', read: m => m.usedMin, format: money },
  { key: 'sellers', label: 'Vendedores', rule: 'max', read: m => m.sellers, format: num },
  {
    key: 'wheelInches',
    label: 'Rodado',
    rule: null,
    read: m => m.specs?.wheelInches ?? null,
    format: value => `${num(value)}"`,
  },
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
    read: m => bicicletaRealRangeKm(m.specs?.rangeKm),
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
    key: 'centralMotor',
    label: 'Motor central',
    rule: null,
    read: m => m.specs?.centralMotor ?? null,
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
    key: 'removableBattery',
    label: 'Batería removible',
    rule: null,
    read: m => m.specs?.removableBattery ?? null,
  },
  {
    key: 'chargeHours',
    label: 'Tiempo de carga',
    rule: 'min',
    read: m => m.specs?.chargeHours ?? null,
    format: withUnit('h'),
  },
  { key: 'gears', label: 'Cambios', rule: null, read: m => m.specs?.gears ?? null, format: num },
  { key: 'throttle', label: 'Acelerador', rule: null, read: m => m.specs?.throttle ?? null },
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
  { key: 'foldable', label: 'Plegable', rule: null, read: m => m.specs?.foldable ?? null },
  { key: 'suspension', label: 'Suspensión', rule: null, read: m => m.specs?.suspension ?? null },
  { key: 'brakes', label: 'Frenos', rule: null, read: m => m.specs?.brakes ?? null },
]

/**
 * Las filas del comparador de bicis. No se premian el rodado (uno no es mejor por ser más grande: es
 * otra bici), la velocidad, el voltaje, los cambios ni lo que es sí/no.
 */
export function bicicletaCompareRows(
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

/** Las preguntas de la página del modelo: sólo las que su ficha puede contestar. */
export function bicicletaModelFaq(model: MonopatinModelDoc): FaqItem[] {
  const short = bicicletaModelShortName(model)
  const v = model.specs?.values
  const faq: FaqItem[] = []

  const price: string[] = []
  if (model.newBand) {
    price.push(
      `Nueva, desde ${money(model.newBand.min)} en ${model.newBand.sellers} ${model.newBand.sellers === 1 ? 'vendedor' : 'vendedores'}` +
        (model.newBand.n > 1
          ? `; la mitad de las ofertas está en ${money(model.newBand.median)} o menos.`
          : '.')
    )
  }
  if (model.usedBand) price.push(`Usada, desde ${money(model.usedBand.min)}.`)
  price.push(
    'Son los precios que publican los vendedores en Mercado Libre y en tiendas uruguayas; el envío, el armado y la garantía se confirman en cada aviso.'
  )
  faq.push({
    id: 'bicicleta-modelo-precio',
    question: `¿Cuánto sale la ${short} en Uruguay?`,
    answer: price.join(' '),
  })

  if (v?.rangeKm) {
    faq.push({
      id: 'bicicleta-modelo-autonomia',
      question: `¿Qué autonomía tiene la ${short}?`,
      answer:
        `La ficha declara ${num(v.rangeKm)} km por carga, medidos por el fabricante con la asistencia más baja. ` +
        `Con asistencia media y alguna cuesta, contá con unos ${bicicletaRealRangeKm(v.rangeKm)} km ` +
        `(el 60 % de lo declarado, la misma regla del asesor de la página de bicicletas).`,
    })
  }

  if (v?.chargeHours || v?.batteryWh || v?.removableBattery) {
    const parts: string[] = []
    if (v.chargeHours)
      parts.push(`Según la ficha, la carga completa tarda ${num(v.chargeHours)} horas.`)
    const cost = monopatinChargeCostUyu(v.batteryWh)
    if (v.batteryWh && cost !== null) {
      parts.push(
        `La batería es de ${num(v.batteryWh)} Wh: cargarla de cero cuesta unos ${money(cost)} con la tarifa residencial de UTE.`
      )
    }
    if (v.removableBattery)
      parts.push('La batería se saca: se puede cargar adentro sin subir la bici.')
    faq.push({
      id: 'bicicleta-modelo-carga',
      question: `¿Cuánto tarda en cargar la ${short} y cuánto sale cargarla?`,
      answer: parts.join(' '),
    })
  }

  if (v?.weightKg || v?.maxLoadKg) {
    const parts: string[] = []
    if (v.weightKg) parts.push(`Pesa ${num(v.weightKg)} kg`)
    if (v.maxLoadKg) parts.push(`soporta hasta ${num(v.maxLoadKg)} kg`)
    faq.push({
      id: 'bicicleta-modelo-peso',
      question: `¿Cuánto pesa la ${short} y cuánto peso aguanta?`,
      answer: `${parts.join(' y ')}, según la ficha.${v.foldable ? ' Es plegable.' : ''} Para subirla por una escalera, más de 22 kg ya se siente.`,
    })
  }

  if (v?.maxSpeedKmh) {
    faq.push({
      id: 'bicicleta-modelo-velocidad',
      question: `¿A qué velocidad llega la ${short}?`,
      answer:
        v.maxSpeedKmh > BICICLETA_CORTE_ASISTENCIA_KMH
          ? `Declara ${num(v.maxSpeedKmh)} km/h, más que los ${BICICLETA_CORTE_ASISTENCIA_KMH} km/h en que la norma europea de pedaleo asistido corta la ayuda del motor. La normativa de cada departamento está en la página de bicicletas eléctricas.`
          : `Declara ${num(v.maxSpeedKmh)} km/h, dentro de los ${BICICLETA_CORTE_ASISTENCIA_KMH} km/h de la norma europea de pedaleo asistido. La normativa de cada departamento está en la página de bicicletas eléctricas.`,
    })
  }
  return faq
}
