// La ficha técnica de un monopatín en el app: la forma pública, el vocabulario de los filtros del
// directorio y el formato de la franja de la tarjeta.
//
// La ficha la lee el job `currency-movilidad-specs` (classes/movilidad/specs/) de la ficha propia
// de cada aviso de Mercado Libre y de las tiendas: es lo que DECLARA el vendedor, no una medición.
// `app/utils` es un espacio de auto-import plano: todo lleva el prefijo `monopatin`/`MONOPATIN_`.
import { UTE_IVA_RATE, uteTariff } from './householdBills'

export interface MonopatinSpecsPublic {
  rangeKm: number | null
  maxSpeedKmh: number | null
  motorW: number | null
  motorPeakW: number | null
  batteryV: number | null
  batteryAh: number | null
  batteryWh: number | null
  chargeHours: number | null
  maxLoadKg: number | null
  weightKg: number | null
  wheelInches: number | null
  minAge: number | null
  foldable: boolean | null
  suspension: boolean | null
  discBrake: boolean | null
  bluetooth: boolean | null
  brakes: string | null
  ipRating: string | null
  /** Algún dato salió de la ficha o la descripción del vendedor (no sólo del título). */
  fromFicha: boolean
}

const NUMERIC = [
  'rangeKm',
  'maxSpeedKmh',
  'motorW',
  'motorPeakW',
  'batteryV',
  'batteryAh',
  'batteryWh',
  'chargeHours',
  'maxLoadKg',
  'weightKg',
  'wheelInches',
  'minAge',
] as const
const BOOLEAN = ['foldable', 'suspension', 'discBrake', 'bluetooth'] as const

/** Saneada campo por campo: lo que no tiene la forma esperada sale como null. */
export function monopatinSpecsPublic(raw: unknown): MonopatinSpecsPublic | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const specs = { fromFicha: false } as MonopatinSpecsPublic
  let any = false
  for (const field of NUMERIC) {
    const number = value[field]
    specs[field] = typeof number === 'number' && Number.isFinite(number) ? number : null
    if (specs[field] !== null) any = true
  }
  for (const field of BOOLEAN) {
    specs[field] = typeof value[field] === 'boolean' ? (value[field] as boolean) : null
    if (specs[field] !== null) any = true
  }
  specs.brakes = typeof value.brakes === 'string' && value.brakes ? value.brakes.slice(0, 80) : null
  specs.ipRating =
    typeof value.ipRating === 'string' && /^IP[X0-9]\d$/.test(value.ipRating)
      ? value.ipRating
      : null
  if (specs.brakes || specs.ipRating) any = true
  if (!any) return null
  const from =
    value.from && typeof value.from === 'object' ? Object.values(value.from as object) : []
  specs.fromFicha = from.some(source => source === 'ficha' || source === 'descripcion')
  return specs
}

// ---------------------------------------------------------------------------------------------
// Filtros

export const MONOPATIN_VELOCIDADES = ['hasta-25', '25-35', 'mas-35'] as const
export const MONOPATIN_POTENCIAS = ['hasta-350', '350-500', '500-800', '800-mas'] as const
export const MONOPATIN_RUEDAS = ['hasta-8', '9-10', 'mas-10'] as const
export const MONOPATIN_RASGOS = ['plegable', 'suspension', 'disco', 'app'] as const
/** Las opciones del panel. El asesor puede pedir cualquier entero dentro de los topes de abajo. */
export const MONOPATIN_AUTONOMIA_OPCIONES = [20, 30, 45, 60] as const
export const MONOPATIN_CARGA_OPCIONES = [100, 120, 150] as const
export const MONOPATIN_PESO_OPCIONES = [12, 15, 20] as const

export type MonopatinVelocidad = (typeof MONOPATIN_VELOCIDADES)[number]
export type MonopatinPotencia = (typeof MONOPATIN_POTENCIAS)[number]
export type MonopatinRueda = (typeof MONOPATIN_RUEDAS)[number]
export type MonopatinRasgo = (typeof MONOPATIN_RASGOS)[number]

export interface MovilidadFichaQuery {
  /** Autonomía declarada mínima, km. */
  autonomia: number | null
  velocidad: '' | MonopatinVelocidad
  potencia: '' | MonopatinPotencia
  /** Potencia mínima, W: la que pide el asesor para las subidas (un tramo no la puede expresar). */
  potenciaMin: number | null
  /** Peso que soporta, mínimo, kg. */
  carga: number | null
  /** Peso del monopatín, máximo, kg. */
  peso: number | null
  rueda: '' | MonopatinRueda
  rasgos: MonopatinRasgo[]
  soloFicha: boolean
}

export const MONOPATIN_FICHA_EMPTY: Readonly<MovilidadFichaQuery> = Object.freeze({
  autonomia: null,
  velocidad: '',
  potencia: '',
  potenciaMin: null,
  carga: null,
  peso: null,
  rueda: '',
  rasgos: [],
  soloFicha: false,
})

export type MovilidadFichaKey = keyof MovilidadFichaQuery

/** Rangos como condiciones de Mongo sobre el campo guardado. */
type Range = { $gt?: number; $gte?: number; $lte?: number }

export const MONOPATIN_VELOCIDAD_RANGOS: Readonly<
  Record<MonopatinVelocidad, { label: string; range: Range }>
> = {
  'hasta-25': { label: 'Hasta 25 km/h', range: { $lte: 25 } },
  '25-35': { label: 'De 26 a 35 km/h', range: { $gt: 25, $lte: 35 } },
  'mas-35': { label: 'Más de 35 km/h', range: { $gt: 35 } },
}
export const MONOPATIN_POTENCIA_RANGOS: Readonly<
  Record<MonopatinPotencia, { label: string; range: Range }>
> = {
  'hasta-350': { label: 'Hasta 350 W', range: { $lte: 350 } },
  '350-500': { label: 'De 351 a 500 W', range: { $gt: 350, $lte: 500 } },
  '500-800': { label: 'De 501 a 800 W', range: { $gt: 500, $lte: 800 } },
  '800-mas': { label: 'Más de 800 W', range: { $gt: 800 } },
}
export const MONOPATIN_RUEDA_RANGOS: Readonly<
  Record<MonopatinRueda, { label: string; range: Range }>
> = {
  'hasta-8': { label: 'Hasta 8,5″', range: { $lte: 8.5 } },
  '9-10': { label: 'De 9 a 10″', range: { $gt: 8.5, $lte: 10 } },
  'mas-10': { label: 'Más de 10″', range: { $gt: 10 } },
}
export const MONOPATIN_RASGO_CAMPOS: Readonly<
  Record<MonopatinRasgo, { label: string; field: string }>
> = {
  plegable: { label: 'Plegable', field: 'specs.foldable' },
  suspension: { label: 'Con suspensión', field: 'specs.suspension' },
  disco: { label: 'Freno a disco', field: 'specs.discBrake' },
  app: { label: 'Bluetooth o app', field: 'specs.bluetooth' },
}

export const monopatinAutonomiaLabel = (km: number) => `${km} km o más`
export const monopatinCargaLabel = (kg: number) => `Soporta ${kg} kg o más`
export const monopatinPesoLabel = (kg: number) => `Hasta ${kg} kg`
export const monopatinPotenciaMinLabel = (w: number) => `Potencia desde ${w} W`

const intIn = (raw: unknown, min: number, max: number): number | null => {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const text = String(value).trim()
  if (!/^\d{1,3}$/.test(text)) return null
  const number = Number(text)
  return number >= min && number <= max ? number : null
}

const oneOf = <T extends string>(raw: unknown, options: readonly T[]): '' | T => {
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' && (options as readonly string[]).includes(value)
    ? (value as T)
    : ''
}

export function monopatinFichaNormalize(raw: Record<string, unknown>): MovilidadFichaQuery {
  const rasgosRaw = Array.isArray(raw.rasgos) ? raw.rasgos[0] : raw.rasgos
  const rasgos =
    typeof rasgosRaw === 'string'
      ? MONOPATIN_RASGOS.filter(rasgo =>
          rasgosRaw
            .split(',')
            .map(s => s.trim())
            .includes(rasgo)
        )
      : []
  const ficha = Array.isArray(raw.ficha) ? raw.ficha[0] : raw.ficha
  return {
    autonomia: intIn(raw.autonomia, 1, 150),
    velocidad: oneOf(raw.velocidad, MONOPATIN_VELOCIDADES),
    potencia: oneOf(raw.potencia, MONOPATIN_POTENCIAS),
    potenciaMin: intIn(raw.potenciaMin, 100, 8000),
    carga: intIn(raw.carga, 30, 200),
    peso: intIn(raw.peso, 3, 80),
    rueda: oneOf(raw.rueda, MONOPATIN_RUEDAS),
    rasgos,
    soloFicha: ficha === '1' || ficha === 'true' || ficha === true,
  }
}

export function monopatinFichaParams(
  ficha: MovilidadFichaQuery | undefined
): Record<string, string> {
  const params: Record<string, string> = {}
  if (!ficha) return params
  if (ficha.autonomia !== null) params.autonomia = String(ficha.autonomia)
  if (ficha.velocidad) params.velocidad = ficha.velocidad
  if (ficha.potencia) params.potencia = ficha.potencia
  if (ficha.potenciaMin !== null) params.potenciaMin = String(ficha.potenciaMin)
  if (ficha.carga !== null) params.carga = String(ficha.carga)
  if (ficha.peso !== null) params.peso = String(ficha.peso)
  if (ficha.rueda) params.rueda = ficha.rueda
  if (ficha.rasgos.length) params.rasgos = ficha.rasgos.join(',')
  if (ficha.soloFicha) params.ficha = '1'
  return params
}

export const monopatinFichaActive = (ficha: MovilidadFichaQuery | undefined): boolean =>
  Boolean(ficha && Object.keys(monopatinFichaParams(ficha)).length)

/**
 * El grupo "Ficha técnica" del panel sólo aparece si algún aviso de la consulta tiene ficha, o si el
 * lector puso un filtro de ficha (ahí tiene que poder sacarlo aunque el resultado sea cero). Antes de
 * la primera corrida del job mostraba seis listas vacías y un interruptor que vaciaba el directorio.
 */
export const monopatinFichaPanelVisible = (
  facets: { conFicha: number } | null | undefined,
  ficha: MovilidadFichaQuery | undefined
): boolean => Boolean(facets && (facets.conFicha > 0 || monopatinFichaActive(ficha)))

/** Campos con dato de ficha que cuentan para "sólo con ficha técnica". */
const FICHA_FIELDS = ['rangeKm', 'maxSpeedKmh', 'motorW', 'maxLoadKg', 'weightKg', 'chargeHours']

/**
 * La parte de ficha del `$match`. `ignore` es la lista de claves `ficha.*` que no se aplican (para
 * contar la faceta de cada una sin su propio filtro).
 */
export function monopatinFichaMatch(
  ficha: MovilidadFichaQuery,
  ignore: ReadonlyArray<string> = []
): Record<string, unknown> {
  const skip = (key: MovilidadFichaKey) => ignore.includes(`ficha.${key}`)
  const match: Record<string, unknown> = {}
  if (ficha.autonomia !== null && !skip('autonomia'))
    match['specs.rangeKm'] = { $gte: ficha.autonomia }
  if (ficha.velocidad && !skip('velocidad'))
    match['specs.maxSpeedKmh'] = { ...MONOPATIN_VELOCIDAD_RANGOS[ficha.velocidad].range }
  if (ficha.potencia && !skip('potencia'))
    match['specs.motorW'] = { ...MONOPATIN_POTENCIA_RANGOS[ficha.potencia].range }
  if (ficha.potenciaMin !== null && !skip('potenciaMin'))
    match['specs.motorW'] = {
      ...((match['specs.motorW'] as Record<string, number>) ?? {}),
      $gte: ficha.potenciaMin,
    }
  if (ficha.carga !== null && !skip('carga')) match['specs.maxLoadKg'] = { $gte: ficha.carga }
  if (ficha.peso !== null && !skip('peso')) match['specs.weightKg'] = { $lte: ficha.peso }
  if (ficha.rueda && !skip('rueda'))
    match['specs.wheelInches'] = { ...MONOPATIN_RUEDA_RANGOS[ficha.rueda].range }
  if (!skip('rasgos')) {
    for (const rasgo of ficha.rasgos) match[MONOPATIN_RASGO_CAMPOS[rasgo].field] = true
  }
  if (ficha.soloFicha && !skip('soloFicha')) {
    match.$or = FICHA_FIELDS.map(field => ({
      [`specs.from.${field}`]: { $in: ['ficha', 'descripcion'] },
    }))
  }
  return match
}

// ---------------------------------------------------------------------------------------------
// Formato

const decimal = (value: number): string =>
  value.toLocaleString('es-UY', { maximumFractionDigits: 1 })

/** La franja de la tarjeta: autonomía, velocidad, potencia y peso, en ese orden y sólo lo que hay. */
export function monopatinSpecChips(specs: MonopatinSpecsPublic | null | undefined): string[] {
  if (!specs) return []
  const chips: string[] = []
  if (specs.rangeKm !== null) chips.push(`${decimal(specs.rangeKm)} km`)
  if (specs.maxSpeedKmh !== null) chips.push(`${decimal(specs.maxSpeedKmh)} km/h`)
  if (specs.motorW !== null) chips.push(`${decimal(specs.motorW)} W`)
  else if (specs.motorPeakW !== null) chips.push(`${decimal(specs.motorPeakW)} W máx.`)
  if (specs.weightKg !== null) chips.push(`${decimal(specs.weightKg)} kg`)
  return chips
}

/** La segunda línea de la tarjeta: lo que importa después. */
export function monopatinSpecExtras(specs: MonopatinSpecsPublic | null | undefined): string[] {
  if (!specs) return []
  const extras: string[] = []
  if (specs.maxLoadKg !== null) extras.push(`soporta ${decimal(specs.maxLoadKg)} kg`)
  if (specs.chargeHours !== null) extras.push(`carga en ${decimal(specs.chargeHours)} h`)
  if (specs.wheelInches !== null) extras.push(`ruedas de ${decimal(specs.wheelInches)}″`)
  if (specs.foldable) extras.push('plegable')
  if (specs.suspension) extras.push('suspensión')
  if (specs.discBrake) extras.push('freno a disco')
  return extras
}

/**
 * Precio de la luz para cargar un monopatín: UTE Residencial Simple, escalón 101–600 kWh (el de un
 * hogar típico), con IVA — el mismo supuesto que usa el asesor de autos (carAdvisorFigures.ts).
 */
export const MONOPATIN_KWH_UYU = (() => {
  const simple = uteTariff('simple')
  const bracket = simple.brackets?.[1]?.pricePerKwh ?? 8.452
  return Math.round(bracket * (1 + UTE_IVA_RATE) * 100) / 100
})()

/** Lo que se pierde en el cargador: un supuesto del sitio, publicado al lado de la cifra. */
export const MONOPATIN_CHARGER_LOSS = 0.15

/** Cuánto cuesta una carga completa, en pesos, para una batería de `wh` vatios-hora. */
export function monopatinChargeCostUyu(wh: number | null | undefined): number | null {
  if (typeof wh !== 'number' || !(wh > 0)) return null
  return Math.round((wh / 1000 / (1 - MONOPATIN_CHARGER_LOSS)) * MONOPATIN_KWH_UYU)
}
