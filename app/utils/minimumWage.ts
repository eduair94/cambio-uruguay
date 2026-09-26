// /vivir-con-el-salario-minimo-uruguay: la cuenta que busca la forma de que el salario mínimo
// alcance, y la forma de la consulta que la cruza con los avisos vigentes del directorio.
//
// POR QUÉ EXISTE: /vivir-con-25000-pesos-uruguay contesta «¿alcanza?» con promedios del INE y
// concluye que solo, alquilando al promedio, no. Esta cuenta contesta la otra pregunta —¿de qué
// forma sí?— y la contesta con los avisos de hoy, no con un promedio.
//
// NO DECLARA CIFRAS: el salario, la comida, el boleto, los copagos, el aguinaldo, el salario
// vacacional, la UR y los topes de las garantías salen de los módulos que ya los mantienen con
// fuente y fecha. La única excepción es SERVICIOS_DESGLOSE, que es el desglose que el propio
// COST_MODEL.utilitiesBase escribe en su comentario, y un test lo ata a ese total.
//
// PURO: sin Vue ni Nuxt, para que lo usen la página, el endpoint y vitest.

import { COST_MODEL, INTERIOR_FOOD_FACTOR } from './costOfLiving'
import { SMN_VIGENTE, TRANSPORTE_MES } from './lowWage'
import { computePayroll } from './payroll'
import { aguinaldoFromCashSalaries } from './aguinaldo'
import { LICENCIA_BASE_DIAS, simularSalarioVacacional } from './salarioVacacional'
import { FGA, UR } from './stateSupport'
import { FGA_JOVENES_MAX_INCOME_SHARE, GUARANTEE_OPTIONS } from './rentalGuarantee'
import { HOUSING_GUARANTEE_CAPS } from './housingAdvisorFigures'
import { RENTAL_DEPARTMENTS, canonicalRentalDepartment, type RentalSource } from './rentals'

export const MINIMUM_WAGE_PATH = '/vivir-con-el-salario-minimo-uruguay'

export type SmnRegion = 'montevideo' | 'interior'
export type TipoVivienda = 'habitacion' | 'casa' | 'apartamento'
export type FormaId = 'pieza' | 'solo-interior' | 'dos-sueldos' | 'solo-montevideo'

const fold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLocaleLowerCase('es')
    .trim()

export const regionDe = (department: string): SmnRegion =>
  fold(department) === 'montevideo' ? 'montevideo' : 'interior'

export const mismoDepartamento = (a: string, b: string): boolean => fold(a) === fold(b)

export interface Forma {
  id: FormaId
  titulo: string
  /** Quién vive así, en una línea. */
  quien: string
  tipos: readonly TipoVivienda[]
  regiones: readonly SmnRegion[]
  /** Personas del hogar; cada una cobra el mínimo. */
  personas: 1 | 2
}

/** En el orden en que la página las presenta: de la más barata de sostener a la más cara. */
export const FORMAS: readonly Forma[] = Object.freeze([
  {
    id: 'pieza',
    titulo: 'Una pieza',
    quien: 'Una habitación en una pensión, una residencia o un apartamento compartido.',
    tipos: ['habitacion'],
    regiones: ['montevideo', 'interior'],
    personas: 1,
  },
  {
    id: 'solo-interior',
    titulo: 'Solo, en el interior',
    quien: 'Una casa o un apartamento a tu nombre, fuera de Montevideo.',
    tipos: ['casa', 'apartamento'],
    regiones: ['interior'],
    personas: 1,
  },
  {
    id: 'dos-sueldos',
    titulo: 'Entre dos sueldos mínimos',
    quien:
      'Una casa o un apartamento para dos personas que cobran el mínimo: pareja, amigos o hermanos.',
    tipos: ['casa', 'apartamento'],
    regiones: ['montevideo', 'interior'],
    personas: 2,
  },
  {
    id: 'solo-montevideo',
    titulo: 'Solo, en Montevideo',
    quien: 'Una casa o un apartamento a tu nombre en Montevideo.',
    tipos: ['casa', 'apartamento'],
    regiones: ['montevideo'],
    personas: 1,
  },
] as Forma[])

export function formaPorId(id: FormaId): Forma {
  return FORMAS.find(forma => forma.id === id) ?? FORMAS[0]!
}

// ─── Ingresos ────────────────────────────────────────────────────────────────

/** Líquido de un mes de salario mínimo (aportes e IRPF de `computePayroll`), en pesos enteros. */
export const LIQUIDO_SMN = Math.round(computePayroll({ nominal: SMN_VIGENTE }).liquido)

/**
 * El aguinaldo es la doceava parte de lo cobrado en el año (Ley 12.840): con el mínimo todo el año,
 * un sueldo nominal por año. Paga los mismos aportes, así que su líquido es el de un mes, y
 * prorrateado es un doceavo por mes. Se cobra en junio y en diciembre: sólo vale si se aparta.
 */
export const AGUINALDO_MENSUAL = Math.round(
  computePayroll({ nominal: aguinaldoFromCashSalaries(SMN_VIGENTE * 12) }).liquido / 12
)

/**
 * El salario vacacional mínimo (Ley 16.101): 20 jornales líquidos por año de licencia, sin aportes.
 * Recién se cobra con la licencia generada: el primer año de trabajo no lo trae.
 */
export const VACACIONAL_MENSUAL = Math.round(
  simularSalarioVacacional({ sueldoNominal: SMN_VIGENTE, diasDeLicencia: LICENCIA_BASE_DIAS })
    .neto / 12
)

// ─── Gastos ──────────────────────────────────────────────────────────────────

/**
 * El desglose que el comentario de COST_MODEL.utilitiesBase declara para su total: lo que no está
 * acá es la parte de gastos comunes, que en esta cuenta sale de cada aviso.
 */
export const SERVICIOS_DESGLOSE = Object.freeze({
  ute: 2000,
  ose: 1100,
  internet: 1650,
  celular: 600,
})

/** Dos personas gastan un 15 % más que una en luz y agua (mismo factor que /vivir-con-25000). */
export const SERVICIOS_DOS_PERSONAS = 1.15

export interface Palancas {
  /** Ir a trabajar a pie o en bici en vez de ómnibus. */
  caminar: boolean
  /** Atenderse en ASSE por FONASA: sin órdenes ni tickets. */
  asse: boolean
  /** Apartar cada mes la doceava parte del aguinaldo. */
  aguinaldo: boolean
  /** Apartar cada mes la doceava parte del salario vacacional. */
  vacacional: boolean
  /** Arreglarse con los datos del celular, sin internet en la casa. */
  sinInternet: boolean
}

export const PALANCAS_TODAS: Palancas = Object.freeze({
  caminar: true,
  asse: true,
  aguinaldo: true,
  vacacional: true,
  sinInternet: true,
})
export const PALANCAS_NINGUNA: Palancas = Object.freeze({
  caminar: false,
  asse: false,
  aguinaldo: false,
  vacacional: false,
  sinInternet: false,
})
export const PALANCA_IDS = Object.keys(PALANCAS_TODAS) as (keyof Palancas)[]

export interface Linea {
  id: string
  label: string
  monto: number
}

export interface PlanDelMes {
  forma: FormaId
  region: SmnRegion
  personas: 1 | 2
  ingresos: Linea[]
  ingreso: number
  /** Gastos de las personas: comida, celular, transporte, salud y varios. */
  gastos: Linea[]
  gasto: number
  /** Servicios de una casa o un apartamento propio: luz, agua e internet si se paga. */
  servicios: Linea[]
  servicio: number
  /** Lo máximo que puede costar una pieza (su alquiler). */
  techoPieza: number
  /** Lo máximo que pueden costar alquiler más gastos comunes de una casa o un apartamento. */
  techoVivienda: number
}

const suma = (lineas: Linea[]) => lineas.reduce((total, linea) => total + linea.monto, 0)

export function planDelMes(formaId: FormaId, region: SmnRegion, palancas: Palancas): PlanDelMes {
  const forma = formaPorId(formaId)
  const n = forma.personas
  const interior = region === 'interior'
  const porPersona = (monto: number) => Math.round(monto) * n

  const ingresos: Linea[] = [{ id: 'liquido', label: 'Sueldo líquido', monto: LIQUIDO_SMN * n }]
  if (palancas.aguinaldo)
    ingresos.push({
      id: 'aguinaldo',
      label: 'Aguinaldo, apartado por mes',
      monto: AGUINALDO_MENSUAL * n,
    })
  if (palancas.vacacional)
    ingresos.push({
      id: 'vacacional',
      label: 'Salario vacacional, apartado por mes',
      monto: VACACIONAL_MENSUAL * n,
    })

  const gastos: Linea[] = [
    {
      id: 'comida',
      label: 'Comida (perfil austero)',
      monto: porPersona(
        COST_MODEL.foodPerAdult *
          COST_MODEL.lifestyleFood.austero *
          (interior ? INTERIOR_FOOD_FACTOR : 1)
      ),
    },
    { id: 'celular', label: 'Celular', monto: porPersona(SERVICIOS_DESGLOSE.celular) },
    {
      id: 'transporte',
      label: palancas.caminar ? 'A pie o en bici' : 'Ómnibus al trabajo',
      monto: porPersona(
        palancas.caminar
          ? COST_MODEL.aPieBiciMonthly
          : TRANSPORTE_MES * (interior ? COST_MODEL.interiorTransportFactor : 1)
      ),
    },
    {
      id: 'salud',
      label: palancas.asse ? 'Salud en ASSE (sin tickets)' : 'Órdenes y tickets',
      monto: porPersona(palancas.asse ? 0 : COST_MODEL.healthPerPerson),
    },
    {
      id: 'varios',
      label: 'Ropa, higiene y varios',
      monto: porPersona(COST_MODEL.miscPerPerson * COST_MODEL.lifestyleMisc.austero),
    },
  ]

  const factor = n === 2 ? SERVICIOS_DOS_PERSONAS : 1
  const servicios: Linea[] = [
    { id: 'ute', label: 'Luz (UTE)', monto: Math.round(SERVICIOS_DESGLOSE.ute * factor) },
    { id: 'ose', label: 'Agua (OSE)', monto: Math.round(SERVICIOS_DESGLOSE.ose * factor) },
  ]
  if (!palancas.sinInternet)
    servicios.push({
      id: 'internet',
      label: 'Internet en la casa',
      monto: SERVICIOS_DESGLOSE.internet,
    })

  const ingreso = suma(ingresos)
  const gasto = suma(gastos)
  const servicio = suma(servicios)
  return {
    forma: forma.id,
    region,
    personas: n,
    ingresos,
    ingreso,
    gastos,
    gasto,
    servicios,
    servicio,
    techoPieza: ingreso - gasto,
    techoVivienda: ingreso - gasto - servicio,
  }
}

/** El techo que importa para la forma: el de la pieza o el de alquiler más gastos comunes. */
export const techoDeForma = (plan: PlanDelMes): number =>
  formaPorId(plan.forma).tipos.includes('habitacion') ? plan.techoPieza : plan.techoVivienda

/**
 * Cuánto sube el techo de ESTA forma una palanca, con las demás como están. Es lo que la página
 * imprime al lado de cada interruptor: sin internet no mueve nada en una pieza, y en un hogar de
 * dos sueldos caminar vale por los dos.
 */
export function efectoPalanca(
  formaId: FormaId,
  region: SmnRegion,
  palancas: Palancas,
  id: keyof Palancas
): number {
  const con = planDelMes(formaId, region, { ...palancas, [id]: true })
  const sin = planDelMes(formaId, region, { ...palancas, [id]: false })
  return techoDeForma(con) - techoDeForma(sin)
}

// ─── Un aviso contra la cuenta ───────────────────────────────────────────────

export type Veredicto = 'cierra' | 'cierra-si' | 'no-cierra'
export type Falta = 'gastos-comunes' | 'servicios'

export interface AvisoParaEvaluar {
  tipo: TipoVivienda
  alquiler: number
  /** null = el aviso no publica sus gastos comunes con evidencia propia. */
  gastosComunes: number | null
  /** Sólo para piezas: el propio aviso dice que luz, agua o wifi van incluidos. */
  serviciosIncluidos: boolean
}

export interface Evaluacion {
  veredicto: Veredicto
  /** Lo que se sabe que cuesta por mes: alquiler más gastos comunes conocidos. */
  costo: number
  /** Techo menos costo. En `cierra-si`, lo máximo que puede costar lo que falta saber. */
  sobra: number
  falta: Falta | null
}

export function evaluarAviso(plan: PlanDelMes, aviso: AvisoParaEvaluar): Evaluacion {
  const pieza = aviso.tipo === 'habitacion'
  const techo = pieza ? plan.techoPieza : plan.techoVivienda
  const gastosComunes = pieza ? 0 : aviso.gastosComunes
  const costo = Math.round(aviso.alquiler + (gastosComunes ?? 0))
  const sobra = techo - costo
  const falta: Falta | null = pieza
    ? aviso.serviciosIncluidos
      ? null
      : 'servicios'
    : gastosComunes === null
      ? 'gastos-comunes'
      : null
  if (sobra < 0) return { veredicto: 'no-cierra', costo, sobra, falta }
  return { veredicto: falta ? 'cierra-si' : 'cierra', costo, sobra, falta }
}

// ─── Cómo entrar ─────────────────────────────────────────────────────────────

export type PuertaId = 'hospedaje' | 'anda' | 'fga' | 'fga-jovenes' | 'sin-garantia'

const topeUr = (id: string): number =>
  GUARANTEE_OPTIONS.find(option => option.id === id)?.maxRentUr ?? 0

/** El alquiler más alto que ANDA garantiza para este hogar: el 40 % del nominal. */
export const topeAnda = (personas: 1 | 2): number =>
  Math.floor(HOUSING_GUARANTEE_CAPS.anda * SMN_VIGENTE * personas)

/** El alquiler más alto del FGA Jóvenes para una persona sola con el mínimo. */
export const topeFgaJovenes = (): number =>
  Math.floor(Math.min(topeUr('fga-jovenes') * UR.valor, FGA_JOVENES_MAX_INCOME_SHARE * LIQUIDO_SMN))

/** Líquido que el FGA exige al núcleo, en pesos. */
export const minimoFga = (): number => Math.ceil(FGA.ingresoMinUR * UR.valor)

/**
 * Qué garantías publican una regla que este hogar cumple para ESTE alquiler. No es una
 * aprobación: es la cuenta de los requisitos escritos. El régimen sin garantía (Ley 19.889) va
 * siempre porque es legal para cualquier alquiler, pero depende de que el dueño lo acepte.
 */
export function puertasDeEntrada(
  formaId: FormaId,
  aviso: { tipo: TipoVivienda; alquiler: number; pension: boolean },
  joven: boolean
): PuertaId[] {
  if (aviso.tipo === 'habitacion') return aviso.pension ? ['hospedaje'] : []
  const n = formaPorId(formaId).personas
  const liquido = LIQUIDO_SMN * n
  const puertas: PuertaId[] = []
  if (aviso.alquiler <= topeAnda(n)) puertas.push('anda')
  if (liquido >= FGA.ingresoMinUR * UR.valor && aviso.alquiler <= topeUr('fga') * UR.valor)
    puertas.push('fga')
  if (joven && n === 1 && aviso.alquiler <= topeFgaJovenes()) puertas.push('fga-jovenes')
  puertas.push('sin-garantia')
  return puertas
}

// ─── La consulta ─────────────────────────────────────────────────────────────

export interface MinimumWageQuery {
  forma: FormaId
  departamento: string
  palancas: Palancas
  /** Tiene entre 18 y 29 años: sólo cambia qué garantías se muestran. */
  joven: boolean
  page: number
}

const PALANCA_PARAM: Record<keyof Palancas, string> = {
  caminar: 'caminar',
  asse: 'asse',
  aguinaldo: 'aguinaldo',
  vacacional: 'vacacional',
  sinInternet: 'sininternet',
}

const flag = (value: unknown, fallback: boolean): boolean =>
  value === '1' || value === 1 || value === true
    ? true
    : value === '0' || value === 0 || value === false
      ? false
      : fallback

export function normalizeMinimumWageQuery(input: Record<string, unknown> = {}): MinimumWageQuery {
  const forma = FORMAS.find(item => item.id === input.forma)?.id ?? 'pieza'
  // Sólo uno de los 19 departamentos: un texto libre multiplicaría las claves de la caché (y Nitro
  // las escapa quitando todo lo que no es letra o dígito, así que dos textos distintos colisionan).
  // Un departamento fuera de la región de la forma se ignora en vez de vaciar la lista.
  const canonical =
    typeof input.departamento === 'string'
      ? canonicalRentalDepartment(input.departamento.trim().slice(0, 60))
      : ''
  const departamento =
    RENTAL_DEPARTMENTS.includes(canonical) &&
    formaPorId(forma).regiones.includes(regionDe(canonical))
      ? canonical
      : ''
  const page = Number(input.page)
  const palancas = Object.fromEntries(
    PALANCA_IDS.map(id => [id, flag(input[PALANCA_PARAM[id]], PALANCAS_TODAS[id])])
  ) as unknown as Palancas
  return {
    forma,
    departamento,
    palancas,
    joven: flag(input.joven, false),
    page: Number.isInteger(page) && page > 0 ? Math.min(page, 500) : 1,
  }
}

export function minimumWageQueryToParams(query: MinimumWageQuery): Record<string, string> {
  const params: Record<string, string> = {}
  if (query.forma !== 'pieza') params.forma = query.forma
  if (query.departamento) params.departamento = query.departamento
  for (const id of PALANCA_IDS)
    if (query.palancas[id] !== PALANCAS_TODAS[id])
      params[PALANCA_PARAM[id]] = query.palancas[id] ? '1' : '0'
  if (query.joven) params.joven = '1'
  if (query.page > 1) params.page = String(query.page)
  return params
}

// ─── Lo que devuelve /api/rentals/salario-minimo ─────────────────────────────

export type Restriccion = 'mujeres' | 'hombres' | 'estudiantes'

export interface MinimumWageListing {
  key: string
  title: string
  tipo: TipoVivienda
  department: string
  neighborhood: string
  bedrooms: number | null
  area: number | null
  alquiler: number
  gastosComunes: number | null
  source: RentalSource
  image: string | null
  lastSeen: string
  serviciosIncluidos: boolean
  piezaCompartida: boolean
  pension: boolean
  restriccion: Restriccion | null
}

export interface MinimumWageItem extends MinimumWageListing {
  evaluacion: Evaluacion
  puertas: PuertaId[]
  /** Cuántos avisos idénticos (título, precio y lugar) representa esta tarjeta. */
  iguales: number
}

export interface FormaResumen {
  id: FormaId
  /** Avisos que cierran con todo el dato a la vista. */
  cierran: number
  /** Avisos que cierran si lo que falta saber no pasa de lo que sobra. */
  condicionados: number
  /** El costo más bajo entre los que cierran o cierran si. */
  desde: number | null
  porDepartamento: { department: string; count: number }[]
  /** Lo mismo sin ninguna palanca: cuánto movieron las decisiones. */
  sinPalancas: number
}

export interface MinimumWageResponse {
  generatedAt: string
  /** Fecha de la foto semanal contra la que se midió la plausibilidad; null si no estaba. */
  analysisAt: string | null
  query: MinimumWageQuery
  /** La cuenta de la forma elegida, una por región que abarca. */
  planes: PlanDelMes[]
  formas: FormaResumen[]
  items: MinimumWageItem[]
  total: number
  page: number
  pages: number
  /** Avisos de la forma elegida: `total` cuenta tarjetas, y una tarjeta puede juntar iguales. */
  avisos: number
  /** Avisos que no se muestran porque su precio no puede ser el de esa vivienda. */
  excluidosPorPrecio: number
  departamentos: string[]
}
