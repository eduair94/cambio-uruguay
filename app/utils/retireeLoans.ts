// app/utils/retireeLoans.ts
// Datos y aritmética de /prestamos-para-jubilados-uruguay: quién le presta a un jubilado o a un
// pensionista en Uruguay, a qué tasa, cuánto le pueden descontar de la pasividad y cómo se
// reconoce el préstamo trucho.
//
// POR QUÉ EXISTE. La cola de demanda del sitio (`currency-search-demand`, autocompletado uruguayo)
// trajo «cuando empiezan los préstamos para jubilados en el brou» con un SERP encabezado por foros:
// Google no encontró una página que lo conteste. El sitio tampoco la tenía. Lo que había era un
// recuadro de tres viñetas dentro de `/prestamo-sin-recibo-de-sueldo-uruguay` (que es para otra
// persona: la que no tiene recibo) y una pregunta suelta en el FAQ de `/mejores-prestamos-uruguay`.
// El préstamo social del BPS —el que más jubilados toman, y el único con tasa fijada por un
// organismo público— no aparecía en NINGUNA página: la palabra «préstamo social» sólo estaba
// citada para la Caja Notarial. En Search Console el sitio tenía cero impresiones para consultas
// de préstamos a jubilados en los 90 días al 2026-10-17.
//
// EL ÁNGULO PROPIO, que sale de leer las fuentes en lugar de resumirlas:
//
//  1. LAS DOS TABLAS DE CUOTAS NO MIDEN LO MISMO. La del BPS se reproduce entera con su tasa sola
//     (`bpsCuota`, las 32 celdas al peso). La del BROU se reproduce entera sólo si se le suma el IVA
//     a la tasa y un mes más de interés, porque el banco supone el primer descuento 31 días más
//     tarde (`brouCuotaPublicada`, las 24 celdas dentro del peso). Comparar las dos tablas tal como
//     vienen es comparar cosas distintas; sin ese mes, la cuota del BROU por eBROU con tasa
//     preferencial queda por debajo de la del BPS y la de sucursal con tasa estándar, por encima.
//
//  2. EL TOPE DE CUOTA DEL BPS NO ES UNO. La ficha del préstamo social (actualizada el 6/8/2026)
//     dice 45 %; el reglamento que la MISMA ficha enlaza dice 40 % de los haberes nominales. Se
//     publican los dos con su fuente, como hizo `/cooperativas-de-vivienda-uruguay` con las dos
//     tablas del MVOT: el número que vale para cada uno lo da el simulador de «Gestionar mis
//     préstamos».
//
//  3. EL CALENDARIO ESTÁ ABIERTO AHORA. El BPS habilitó la renovación anticipada del 1 al 31 de
//     octubre de 2026 y anunció una tasa cinco puntos más baja para las pasividades más chicas desde
//     el 1 de noviembre; el BROU hace su campaña de pasivos a fin de año y al 19/10/2026 no había
//     anunciado la de 2026. La página dice en qué estado está cada cosa el día que se la lee
//     (`retireeEventStatus`), en vez de una frase que envejece.
//
// LO QUE NO SE COPIA A MANO. El tope de usura viene de la grilla viva del BCU (`/api/bcu-rates`) y
// las filas que esa grilla no trae —crédito de nómina y retención de haberes— de la lectura fechada
// que ya mantiene `loanNoPayslip.ts`; el piso del 35 % y el orden de prelación, de
// `salaryGarnishment.ts`. Este archivo no repite ninguno de esos números.
//
// FUENTES, leídas el 2026-10-19 (lista completa en `RETIREE_SOURCES`).
//
// MÓDULO PURO (sin Vue/Nuxt) para que vitest-node lo cargue con imports relativos.

import type { BcuCapRow } from './cashAdvance'
import { SITE_TIME_ZONE } from './format'
import {
  BCU_CAPS_IN_FORCE_SINCE,
  BCU_CAPS_PERIOD,
  NOPAYSLIP_CAPS,
  mergeNoPayslipCaps,
  type NoPayslipCapRow,
} from './loanNoPayslip'
import { RETENTION_FLOOR_PCT, RETENTION_FLOOR_PCT_HOUSING } from './salaryGarnishment'

/** Fecha en la que se leyó todo lo de este archivo contra sus fuentes. */
export const RETIREE_VERIFIED_AT = '2026-10-19'

/** La ruta de la página, en un solo lugar. */
export const RETIREE_PATH = '/prestamos-para-jubilados-uruguay'

// ---------------------------------------------------------------------------------------------
// Fuentes
// ---------------------------------------------------------------------------------------------

export interface RetireeSource {
  readonly id: string
  readonly label: string
  readonly url: string
  /** La fecha que el propio documento muestra (actualización, vigencia o publicación). */
  readonly shownAt?: string
}

export const RETIREE_SOURCES: readonly RetireeSource[] = Object.freeze([
  {
    id: 'bps-prestamo-social',
    label: 'BPS — Préstamos sociales: monto, tasas, cuota máxima, renovación y cobro',
    url: 'https://www.bps.gub.uy/3490/prestamos-sociales.html',
    shownAt: '2026-08-06',
  },
  {
    id: 'bps-tramite',
    label: 'BPS — Trámite de préstamos sociales: requisitos, en línea y presencial',
    url: 'https://www.bps.gub.uy/11390/prestamos-sociales.html',
    shownAt: '2026-09-29',
  },
  {
    id: 'bps-tasas-2026',
    label:
      'BPS — Reduce las tasas de los préstamos sociales y amplía los apoyos para jubilados y pensionistas',
    url: 'https://www.bps.gub.uy/24426/bps-reduce-las-tasas-de-los-prestamos-sociales-y-amplia-los-apoyos-para-jubilados-y-pensionistas.html',
    shownAt: '2026-08-04',
  },
  {
    id: 'bps-renovacion',
    label: 'BPS — Renovación anticipada de préstamos a jubilados y pensionistas',
    url: 'https://www.bps.gub.uy/24603/renovacion-anticipada-de-prestamos-a-jubilados-y-pensionistas.html',
    shownAt: '2026-09-30',
  },
  {
    id: 'bps-limitantes',
    label: 'BPS — Limitantes para gestionar un préstamo social',
    url: 'https://www.bps.gub.uy/19826/limitantes-para-gestionar-un-prestamo-social.html',
    shownAt: '2026-07-31',
  },
  {
    id: 'bps-cancelar',
    label: 'BPS — Cancelar préstamos sociales',
    url: 'https://www.bps.gub.uy/20171/',
  },
  {
    id: 'bps-reglamento',
    label:
      'BPS — Reglamento de préstamos a pasivos (aprobado por la R.D. 42-1/2023): tope del 40 %, piso del 35 %, cancelación por fallecimiento y mora',
    url: 'https://www.bps.gub.uy/bps/file/3490/51/reglamento_prestamos_a_pasivos.pdf',
  },
  {
    id: 'bps-rgg-403',
    label:
      'BPS — Resolución de Gerencia General 403/2024: sin préstamos nuevos para el subsidio transitorio por incapacidad parcial',
    url: 'https://www.bps.gub.uy/bps/file/3490/51/resolucion-gerencia-general-403-2024.pdf',
    shownAt: '2024-08-30',
  },
  {
    id: 'bps-protesis',
    label: 'BPS — Préstamos para prótesis, lentes, audífonos y tratamiento dental',
    url: 'https://www.bps.gub.uy/3491/prestamos-para-protesis.html',
    shownAt: '2026-08-03',
  },
  {
    id: 'bps-descuentos',
    label:
      'BPS — Descuentos de cooperativas, alquileres y asociaciones: consultar una retención que no reconocés',
    url: 'https://www.bps.gub.uy/17618/descuentos-de-cooperativas-alquileres-y-asociaciones-de-jubilados-y-pensionistas.html',
    shownAt: '2026-01-05',
  },
  {
    id: 'bps-phishing',
    label: 'BPS — Alerta por intentos de fraude: qué datos nunca pide',
    url: 'https://www.bps.gub.uy/23839/alerta-por-intentos-de-fraude-phishing.html',
    shownAt: '2026-01-26',
  },
  {
    id: 'bps-numero',
    label: 'BPS — Las llamadas del BPS salen sólo del 2211 1997',
    url: 'https://www.bps.gub.uy/24130/nuevo-numero-de-llamadas-desde-el-bps:-2211-1997.html',
    shownAt: '2026-04-21',
  },
  {
    id: 'bps-maniobras',
    label: 'BPS — Comunicado ante posibles maniobras fraudulentas: no cobra por ningún trámite',
    url: 'https://www.bps.gub.uy/17364/comunicado-del-bps-ante-posibles-maniobras-fraudulentas.html',
    shownAt: '2020-07-01',
  },
  {
    id: 'brou-retencion',
    label: 'BROU — Préstamos con Retención en Pesos: requisitos, edad, afectación y renovación',
    url: 'https://www.brou.com.uy/personas/prestamos/prestamo-consumo/prestamos-con-convenio-en-pesos',
  },
  {
    id: 'brou-tasas',
    label: 'BROU — Tasas de préstamos para personas físicas (PDF, vigentes desde el 1/10/2026)',
    url: 'https://www.brou.com.uy/documents/20182/22237/TASAS_VIGENTES_PRESTAMOS_PERSONAS.pdf/6ed06833-7c12-4f9f-8001-f7fb52f60a60',
    shownAt: '2026-10-01',
  },
  {
    id: 'brou-ui',
    label: 'BROU — Préstamos con Retención en UI (sólo para empleados con convenio)',
    url: 'https://www.brou.com.uy/personas/prestamos/prestamo-consumo/ui',
  },
  {
    id: 'presidencia-brou-2025',
    label:
      'Presidencia — Unos 140.000 jubilados y pensionistas accederán a Préstamos para Pasivos del Banco República',
    url: 'https://www.gub.uy/presidencia/comunicacion/noticias/140000-jubilados-pensionistas-accederan-prestamos-para-pasivos-del-banco',
    shownAt: '2025-12-08',
  },
  {
    id: 'anda',
    label: 'ANDA — Préstamos de nómina para pasivos y adelanto de pasividad',
    url: 'https://anda.com.uy/prestamos/',
  },
  {
    id: 'verde',
    label: 'Verde — Créditos personales',
    url: 'https://verde.com.uy/nuestros_productos_creditos_personales.php',
  },
  {
    id: 'ley-19210',
    label: 'IMPO — Ley 19.210, art. 30: el Crédito de Nómina (20 % de los haberes y tasa topeada)',
    url: 'https://www.impo.com.uy/bases/leyes/19210-2014/30',
  },
  {
    id: 'ley-19210-31',
    label: 'IMPO — Ley 19.210, art. 31: sin consentimiento firmado, el descuento es nulo',
    url: 'https://www.impo.com.uy/bases/leyes/19210-2014/31',
  },
  {
    id: 'bcu-2024-177',
    label:
      'BCU — Comunicación 2024/177: las cinco señales de un ofrecimiento de crédito no autorizado',
    url: 'https://www.bcu.gub.uy/Comunicados/seggco24177.pdf',
    shownAt: '2024-08-20',
  },
  {
    id: 'fiscalia-2020',
    label: 'Fiscalía — 23 condenas por estafas con préstamos falsos ofrecidos por Facebook',
    url: 'https://www.gub.uy/fiscalia-general-nacion/comunicacion/noticias/fiscalia-delitos-economicos-2-turno-logro-23-condenas-estafas-prestamos',
    shownAt: '2020-11-13',
  },
])

export const retireeSource = (id: string): RetireeSource | undefined =>
  RETIREE_SOURCES.find(source => source.id === id)

// ---------------------------------------------------------------------------------------------
// El préstamo social del BPS
// ---------------------------------------------------------------------------------------------

/** Quiénes lo pueden pedir, en el orden de la ficha del BPS. */
export const BPS_BENEFICIARIES: readonly string[] = Object.freeze([
  'Jubilaciones del BPS',
  'Pensiones de sobrevivencia',
  'Pensiones graciables',
  'Pensión especial reparatoria (Ley 18.033)',
  'Pensiones de vejez o invalidez',
])

/** Hasta cuántos haberes nominales mensuales presta el BPS. Ficha del préstamo social. */
export const BPS_MAX_HABERES = 6

/** El tope en pesos que imprime la ficha (actualizada el 6/8/2026). Se reajusta con las pasividades. */
export const BPS_MAX_AMOUNT = 474_500

/** Tope de cuota según la ficha vigente del préstamo social. */
export const BPS_CUOTA_CAP_FICHA_PCT = 45

/** Tope de cuota según el reglamento que la misma ficha enlaza (art. 8). */
export const BPS_CUOTA_CAP_REGLAMENTO_PCT = 40

/** Préstamos vigentes que una persona puede tener a la vez (reglamento, art. 5 lit. B). */
export const BPS_MAX_OPEN_LOANS = 6

/** Recargo por mora sobre la cuota adeudada (reglamento, art. 27). */
export const BPS_LATE_SURCHARGE_PCT = 10

/** Días que el BPS hace esperar después de un préstamo del BROU (ficha, «Compatibilidad»). */
export const BPS_WAIT_AFTER_BROU_DAYS = 60

export type BpsPlazo = 6 | 12 | 18 | 24

export interface BpsRate {
  readonly cuotas: BpsPlazo
  /** Tasa efectiva anual sobre saldos vigente, en %. */
  readonly teaPct: number
  /** La que regía antes de la rebaja anunciada el 4/8/2026. */
  readonly previousPct: number
  /** La diferencial para pasividades mínimas, desde el 1/11/2026 y por 90 días. */
  readonly differentialPct: number
  /** La cuota de la fila de $ 100.000 de la tabla de ejemplo del BPS. */
  readonly cuotaPor100k: number
  /** Cuotas pagas que pide la escala de renovación. */
  readonly renewAfterPaid: number
}

export const BPS_RATES: readonly BpsRate[] = Object.freeze([
  {
    cuotas: 6,
    teaPct: 21.25,
    previousPct: 23.5,
    differentialPct: 16.25,
    cuotaPor100k: 17_634,
    renewAfterPaid: 3,
  },
  {
    cuotas: 12,
    teaPct: 24.25,
    previousPct: 26.5,
    differentialPct: 19.25,
    cuotaPor100k: 9_365,
    renewAfterPaid: 5,
  },
  {
    cuotas: 18,
    teaPct: 25.25,
    previousPct: 28,
    differentialPct: 20.25,
    cuotaPor100k: 6_609,
    renewAfterPaid: 8,
  },
  {
    cuotas: 24,
    teaPct: 25.25,
    previousPct: 28,
    differentialPct: 20.25,
    cuotaPor100k: 5_224,
    renewAfterPaid: 10,
  },
])

export const BPS_PLAZOS: readonly BpsPlazo[] = Object.freeze(BPS_RATES.map(rate => rate.cuotas))

export const bpsRate = (cuotas: BpsPlazo): BpsRate | undefined =>
  BPS_RATES.find(rate => rate.cuotas === cuotas)

/** La tasa más baja y la más alta del préstamo social, para la descripción y el resumen. */
export const BPS_TEA_MIN = Math.min(...BPS_RATES.map(rate => rate.teaPct))
export const BPS_TEA_MAX = Math.max(...BPS_RATES.map(rate => rate.teaPct))

const usable = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

/**
 * Lo máximo que presta el BPS para un haber nominal: seis haberes, con el tope en pesos de la
 * ficha. `null` sin un haber utilizable: una página que imprime «$ 0» como monto máximo miente con
 * más autoridad que una que no imprime nada.
 */
export function bpsMaxAmount(haberNominal: number | null | undefined): number | null {
  if (!usable(haberNominal)) return null
  return Math.min(BPS_MAX_HABERES * haberNominal, BPS_MAX_AMOUNT)
}

/**
 * La cuota del préstamo social, con la regla que reproduce ENTERA la tabla de ejemplo del BPS:
 * el monto por la cuota de la fila de $ 100.000, redondeado hacia arriba al peso.
 *
 * No es la fórmula de una anualidad a la tasa publicada: ésa da uno o dos pesos menos por cada
 * $ 10.000 y no reproduce la tabla. Ésta reproduce las 32 celdas publicadas (8 montos × 4 plazos),
 * que es lo que `retireeLoans.test.ts` verifica. El margen de 1e-6 evita que un producto exacto
 * («20.000 × 0,09365 = 1.873») suba un peso por el error de coma flotante.
 */
export function bpsCuota(monto: number | null | undefined, cuotas: BpsPlazo): number | null {
  const rate = bpsRate(cuotas)
  if (!rate || !usable(monto)) return null
  return Math.ceil((monto * rate.cuotaPor100k) / 100_000 - 1e-6)
}

/** Qué toca primero al calcular el monto máximo de un plazo. */
export type BpsLimit = 'haberes' | 'tope' | 'cuota'

/**
 * El monto máximo del préstamo social en un plazo: el menor entre seis haberes, el tope en pesos de
 * la ficha y el monto cuya cuota llega al tope de cuota (por defecto el de la ficha), redondeado
 * hacia abajo a la centena.
 *
 * Es la cuenta que la ficha no hace y que cambia la respuesta: en 6 y en 12 cuotas la cuota de seis
 * haberes se come más del 45 % del haber, así que ahí lo que limita es la cuota y no los seis
 * haberes. No resta las retenciones que la persona ya tenga, que pueden achicarlo: el número final
 * lo da el simulador del BPS.
 */
export function bpsMaxForPlazo(
  haberNominal: number | null | undefined,
  cuotas: BpsPlazo,
  cuotaCapPct: number = BPS_CUOTA_CAP_FICHA_PCT
): { amount: number; limit: BpsLimit } | null {
  const rate = bpsRate(cuotas)
  const byHaberes = bpsMaxAmount(haberNominal)
  if (!rate || byHaberes == null || !usable(haberNominal) || !usable(cuotaCapPct)) return null
  const cuotaCap = (cuotaCapPct / 100) * haberNominal
  let byCuota = Math.floor((cuotaCap * 100_000) / rate.cuotaPor100k / 100) * 100
  // La cuota se redondea hacia arriba al peso: un monto justo en el borde puede pasarse por uno.
  while (byCuota > 0 && (bpsCuota(byCuota, cuotas) ?? Infinity) > cuotaCap) byCuota -= 100
  const sixHaberes = BPS_MAX_HABERES * haberNominal
  const candidates: { amount: number; limit: BpsLimit }[] = [
    { amount: Math.floor(sixHaberes / 100) * 100, limit: 'haberes' },
    { amount: BPS_MAX_AMOUNT, limit: 'tope' },
    { amount: Math.max(0, byCuota), limit: 'cuota' },
  ]
  // A igual monto gana el orden de la lista: seis haberes, después el tope, después la cuota.
  return candidates.reduce((best, item) => (item.amount < best.amount ? item : best))
}

/** Qué parte del haber nominal se lleva la cuota, en %. */
export function cuotaShareOfHaber(
  cuota: number | null | undefined,
  haberNominal: number | null | undefined
): number | null {
  if (!usable(cuota) || !usable(haberNominal)) return null
  return (cuota / haberNominal) * 100
}

/** Los préstamos para prótesis, lentes, audífonos y tratamiento dental. Ficha del 3/8/2026. */
export const BPS_PROTESIS = Object.freeze({
  teaPct: 12,
  previousPct: 19.5,
  /** El haber máximo para acceder, en BPC y en los pesos que imprime la ficha. */
  maxHaberBpc: 15,
  maxHaberPesos: 102_960,
  /** El monto máximo del préstamo, en BPC y en pesos. */
  maxAmountBpc: 40,
  maxAmountPesos: 274_560,
  plazos: [6, 12, 18, 24] as const,
  /** La fila de $ 10.000 de su tabla de ejemplo. */
  cuotaPor10k: [1_723, 886, 607, 468] as const,
})

// ---------------------------------------------------------------------------------------------
// El BROU
// ---------------------------------------------------------------------------------------------

/** Desde cuándo rige la tabla de tasas del BROU que se publica acá (lo imprime el propio PDF). */
export const BROU_RATES_IN_FORCE_SINCE = '2026-10-01'

/** Días que la tabla del BROU supone entre el cobro y el primer descuento. Lo dice el PDF. */
export const BROU_DEFERRAL_DAYS = 31

/**
 * La tasa básica del IVA. El PDF del BROU dice que a sus tasas «se debe adicionar IVA» y no dice
 * cuánto; con el 22 % la tabla de cuotas cierra en sus 24 celdas, que es la prueba.
 */
export const IVA_BASIC_RATE = 0.22

export interface BrouTramo {
  readonly id: string
  readonly label: string
  /** El plazo más largo del tramo: el de la cuota de ejemplo del PDF. */
  readonly maxCuotas: number
}

export const BROU_TRAMOS: readonly BrouTramo[] = Object.freeze([
  { id: '2-6', label: '2 a 6', maxCuotas: 6 },
  { id: '7-12', label: '7 a 12', maxCuotas: 12 },
  { id: '13-24', label: '13 a 24', maxCuotas: 24 },
  { id: '25-36', label: '25 a 36', maxCuotas: 36 },
  { id: '37-48', label: '37 a 48', maxCuotas: 48 },
  { id: '49-60', label: '49 a 60', maxCuotas: 60 },
])

export interface BrouChannel {
  readonly id:
    'estandar-sucursal' | 'preferencial-sucursal' | 'estandar-ebrou' | 'preferencial-ebrou'
  readonly label: string
  /** TEA por tramo, en %, MÁS IVA. Mismo orden que `BROU_TRAMOS`. */
  readonly teaPct: readonly number[]
  /** La cuota de ejemplo por $ 10.000 en el plazo más largo de cada tramo, tal como la imprime. */
  readonly cuotaPor10k: readonly number[]
}

/**
 * «Pasivos con retención», en pesos, del PDF de tasas del BROU vigente desde el 1/10/2026. La
 * tasa preferencial es para quien cobra sus haberes en una cuenta del BROU.
 */
export const BROU_PASIVOS: readonly BrouChannel[] = Object.freeze([
  {
    id: 'estandar-sucursal',
    label: 'En sucursal, tasa estándar',
    teaPct: [20, 23, 24, 25, 26, 27],
    cuotaPor10k: [1_812, 974, 554, 421, 360, 328],
  },
  {
    id: 'preferencial-sucursal',
    label: 'En sucursal, tasa preferencial',
    teaPct: [19, 22, 23, 24, 25, 26],
    cuotaPor10k: [1_805, 968, 548, 415, 354, 322],
  },
  {
    id: 'estandar-ebrou',
    label: 'Por eBROU, tasa estándar',
    teaPct: [17, 20, 21, 22, 23, 24],
    cuotaPor10k: [1_791, 956, 537, 403, 342, 309],
  },
  {
    id: 'preferencial-ebrou',
    label: 'Por eBROU, tasa preferencial',
    teaPct: [15, 18, 19, 20, 21, 22],
    cuotaPor10k: [1_777, 944, 525, 391, 329, 296],
  },
])

/** El recargo del PDF para los deudores calificados 3 por el BCU, en puntos. */
export const BROU_SPREAD_CALIFICADOS_3 = 1.22

/** Plazo máximo y afectación máxima del nominal según la edad. Página de préstamos con retención. */
export const BROU_AGE_LIMITS: readonly {
  readonly id: string
  readonly label: string
  readonly maxMeses: number
  readonly maxAfectacionPct: number
}[] = Object.freeze([
  { id: 'hasta-70', label: 'Hasta 70 años', maxMeses: 60, maxAfectacionPct: 35 },
  { id: 'hasta-79', label: 'Hasta 79 años', maxMeses: 48, maxAfectacionPct: 35 },
  { id: 'hasta-89', label: 'Hasta 89 años', maxMeses: 24, maxAfectacionPct: 25 },
  { id: 'desde-90', label: '90 años y más', maxMeses: 12, maxAfectacionPct: 20 },
])

/** Porcentaje de cuotas pagas para renovar (pasivos), y el de quien opera con apoderado. */
export const BROU_RENEW_PAID_PCT = 40
export const BROU_RENEW_PAID_PCT_APODERADO = 90

const monthlyWithIva = (teaPct: number): number =>
  (Math.pow(1 + teaPct / 100, 1 / 12) - 1) * (1 + IVA_BASIC_RATE)

/**
 * La cuota por cada $ 10.000 de un préstamo del BROU con el IVA sumado a la tasa y el primer
 * descuento al mes: la forma comparable con la tabla del BPS.
 */
export function brouCuotaSinDiferir(teaPct: number, cuotas: number): number {
  const i = monthlyWithIva(teaPct)
  return (10_000 * i) / (1 - Math.pow(1 + i, -cuotas))
}

/**
 * La misma cuota con el supuesto del PDF del BROU: el primer descuento llega 31 días más tarde, así
 * que el capital crece ese tramo antes de empezar a amortizarse. Con esto las 24 celdas publicadas
 * cierran dentro del peso, y es la prueba de que la tabla del banco YA incluye el IVA.
 */
export function brouCuotaPublicada(teaPct: number, cuotas: number): number {
  const i = monthlyWithIva(teaPct)
  const principal = 10_000 * Math.pow(1 + i, BROU_DEFERRAL_DAYS / 30)
  return (principal * i) / (1 - Math.pow(1 + i, -cuotas))
}

export interface CuotaComparisonRow {
  readonly cuotas: BpsPlazo
  /** La cuota por $ 10.000 de la tabla del BPS. */
  readonly bps: number
  /** BROU por eBROU con tasa preferencial, con IVA y sin el mes de diferimiento. */
  readonly brouMin: number
  /** BROU en sucursal con tasa estándar, con IVA y sin el mes de diferimiento. */
  readonly brouMax: number
}

/**
 * La cuota por cada $ 10.000 en los tres plazos que los dos publican (6, 12 y 24 cuotas), puesta en
 * el mismo pie: con el IVA adentro y el primer descuento al mes. El BPS no dice si a su tasa se le
 * suma IVA; su propia tabla cierra con la tasa sola, y es la que se usa.
 */
export function cuotaComparison(): CuotaComparisonRow[] {
  const brou = (id: BrouChannel['id'], cuotas: number): number => {
    const channel = BROU_PASIVOS.find(item => item.id === id)!
    const tramo = BROU_TRAMOS.findIndex(item => item.maxCuotas === cuotas)
    return Math.round(brouCuotaSinDiferir(channel.teaPct[tramo]!, cuotas))
  }
  return ([6, 12, 24] as const).map(cuotas => ({
    cuotas,
    bps: bpsCuota(10_000, cuotas)!,
    brouMin: brou('preferencial-ebrou', cuotas),
    brouMax: brou('estandar-sucursal', cuotas),
  }))
}

// ---------------------------------------------------------------------------------------------
// ANDA y Verde: lo que publican en su propio sitio
// ---------------------------------------------------------------------------------------------

export interface OtherLender {
  readonly id: string
  readonly name: string
  readonly product: string
  readonly conditions: readonly string[]
  readonly rate: string
  /** La vigencia que el propio sitio le pone a la tasa. */
  readonly asOf: string
  readonly sourceId: string
}

export const OTHER_LENDERS: readonly OtherLender[] = Object.freeze([
  {
    id: 'anda-nomina',
    name: 'ANDA',
    product: 'Préstamo de nómina para pasivos',
    conditions: [
      'Hasta dos pasividades y media.',
      'Hasta 80 años, cobrando por un banco o una institución de dinero electrónico.',
      'Buenos antecedentes crediticios y el «Contrato Persona» del BPS firmado (se gestiona en sus sucursales).',
    ],
    rate: '29,20 % + IVA (menos de 10.000 UI) y 29,80 % + IVA (10.000 UI o más)',
    asOf: 'octubre de 2026',
    sourceId: 'anda',
  },
  {
    id: 'anda-adelanto',
    name: 'ANDA',
    product: 'Adelanto de pasividad',
    conditions: [
      'Hasta el 50 % del líquido de una pasividad del BPS.',
      'Hay que cobrar la pasividad en ANDA o en su tarjeta prepaga.',
      'Se devuelve entero cuando se cobra la pasividad.',
    ],
    rate: '29,00 % + IVA',
    asOf: 'octubre de 2026',
    sourceId: 'anda',
  },
  {
    id: 'verde',
    name: 'Verde',
    product: 'Crédito «a sola firma, para asalariados, jubilados y pensionistas»',
    conditions: [
      'Su ejemplo publicado: $ 80.000 en 18 cuotas de $ 6.150, a una TEA del 27 %.',
      'Precio total financiado: $ 110.707 con IVA, con una cuota social de $ 330 y cobertura de seguro incluidas.',
      'No dice si cobra por retención sobre la pasividad.',
    ],
    rate: 'TEA 27 % en su ejemplo (mora 41 %)',
    asOf: 'ejemplo válido hasta el 30 de noviembre',
    sourceId: 'verde',
  },
])

/** Crédito de Nómina, Ley 19.210 art. 30: la suma de las cuotas no pasa de este % del nominal. */
export const NOMINA_CUOTA_CAP_PCT = 20

// ---------------------------------------------------------------------------------------------
// El calendario: qué está abierto el día que se lee la página
// ---------------------------------------------------------------------------------------------

export type RetireeEventStatus = 'proximo' | 'vigente' | 'cerrado' | 'anunciado' | 'sin-fecha'

export interface RetireeEvent {
  readonly id: string
  readonly who: 'BPS' | 'BROU'
  readonly title: string
  readonly when: string
  /** Primer día (ISO). Ausente = no hay fecha anunciada. */
  readonly from?: string
  /** Último día, inclusive (ISO). Ausente en un anuncio sin fecha de cierre. */
  readonly to?: string
  /** Un anuncio no confirma que la medida esté operativa: se rotula como anuncio. */
  readonly announcementOnly?: boolean
  readonly detail: string
  readonly sourceId: string
}

/** Suma días a una fecha ISO sin pasar por la zona horaria de quien corre el código. */
export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y!, m! - 1, d! + days))
  return date.toISOString().slice(0, 10)
}

/** «Desde el 1/11/2026 y durante 90 días»: del 1/11 al 29/1/2027, los dos inclusive. */
const DIFFERENTIAL_FROM = '2026-11-01'
const DIFFERENTIAL_DAYS = 90

export const RETIREE_EVENTS: readonly RetireeEvent[] = Object.freeze([
  {
    id: 'renovacion-anticipada',
    who: 'BPS',
    title: 'Renovación anticipada del préstamo social',
    when: 'Del 1 al 31 de octubre de 2026',
    from: '2026-10-01',
    to: '2026-10-31',
    detail:
      'Alcanza con haber pagado la primera cuota del préstamo vigente. Se cancela el anterior y se hace uno nuevo que integra el saldo pendiente. Una vez al año y sólo en línea, por «Gestionar mis préstamos».',
    sourceId: 'bps-renovacion',
  },
  {
    id: 'tasa-diferencial',
    who: 'BPS',
    title: 'Tasa cinco puntos más baja para las pasividades más chicas',
    when: 'Desde el 1 de noviembre de 2026, durante 90 días',
    from: DIFFERENTIAL_FROM,
    to: addDaysIso(DIFFERENTIAL_FROM, DIFFERENTIAL_DAYS - 1),
    detail:
      'Para préstamos nuevos de jubilados y pensionistas de menores ingresos que cobraron hace poco el aumento diferencial y adicional: 16,25 % en 6 cuotas, 19,25 % en 12 y 20,25 % en 18 y 24.',
    sourceId: 'bps-tasas-2026',
  },
  {
    id: 'refinanciacion',
    who: 'BPS',
    title: 'Refinanciación de deudas sin intereses ni moras',
    when: 'Anunciada para noviembre de 2026',
    from: '2026-11-01',
    announcementOnly: true,
    detail:
      'Las deudas generadas hasta el 31 de mayo de 2026 se podrán refinanciar con la exoneración total de los intereses, moras y recargos acumulados, en hasta 36 cuotas y a la mitad de la tasa vigente.',
    sourceId: 'bps-tasas-2026',
  },
  {
    id: 'brou-campana',
    who: 'BROU',
    title: 'Campaña «Préstamos para Pasivos» del BROU',
    when: 'Fin de año; la de 2026 sin fecha anunciada',
    detail:
      'La edición 2025 empezó en noviembre, abrió las sucursales el 9 de diciembre —por el dígito verificador de la cédula: del 9 al 15 quienes cobran la pasividad en el BROU, del 16 al 22 los demás— y cerró el 30 de diciembre, a una tasa «en el entorno del 20 % de interés anual en pesos», con una bonificación adicional por eBROU. Quien cobraba menos de $ 30.000 nominales también podía pedirlo por teléfono o WhatsApp, hasta $ 150.000. Al 19 de octubre de 2026 ni el BROU ni Presidencia habían publicado las fechas de la de 2026.',
    sourceId: 'presidencia-brou-2025',
  },
])

/** El estado de un evento un día dado (ISO, en hora de Uruguay). */
export function retireeEventStatus(event: RetireeEvent, todayIso: string): RetireeEventStatus {
  if (!event.from) return 'sin-fecha'
  if (todayIso < event.from) return 'proximo'
  if (event.announcementOnly) return 'anunciado'
  if (event.to && todayIso > event.to) return 'cerrado'
  return 'vigente'
}

/** Hoy en Uruguay, como ISO: la fecha que decide qué está abierto. */
export function uruguayTodayIso(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SITE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  return parts
}

// ---------------------------------------------------------------------------------------------
// Topes de usura: la grilla viva más la lectura fechada que ya mantiene loanNoPayslip.ts
// ---------------------------------------------------------------------------------------------

/** Las filas que le importan a un jubilado: sin retención (viva) contra retención y nómina. */
const RETIREE_CAP_IDS = [
  'sin-descuento-chico-corto',
  'retencion-chico-corto',
  'retencion-chico-largo',
  'nomina-chico-corto',
  'nomina-chico-largo',
] as const

export interface RetireeCapRow extends NoPayslipCapRow {
  /** El período de tasas medias del que sale el número que se muestra. */
  readonly periodo: string
  /** Desde cuándo rige ese número (ISO). */
  readonly vigenteDesde: string
}

export interface LiveCapsMeta {
  readonly periodo?: string | null
  readonly vigenteDesde?: string | null
  readonly rows?: readonly BcuCapRow[] | null
}

/**
 * Las cinco filas de la tabla de topes, con la fila viva cuando la grilla la trae y la lectura
 * fechada en las demás. Cada fila dice de qué período sale, porque una tabla que mezcla dos
 * vigencias bajo una sola fecha es exactamente el error que `un-solo-tope-de-usura` corrigió.
 */
export function retireeUsuryRows(live: LiveCapsMeta | null | undefined): RetireeCapRow[] {
  const merged = mergeNoPayslipCaps(NOPAYSLIP_CAPS, live?.rows ?? null)
  return RETIREE_CAP_IDS.flatMap(id => {
    const row = merged.find(item => item.id === id)
    if (!row) return []
    return [
      {
        ...row,
        periodo: row.live && live?.periodo ? live.periodo : BCU_CAPS_PERIOD,
        vigenteDesde: row.live && live?.vigenteDesde ? live.vigenteDesde : BCU_CAPS_IN_FORCE_SINCE,
      },
    ]
  })
}

// ---------------------------------------------------------------------------------------------
// Errores, estafas, lo que no se publica y preguntas
// ---------------------------------------------------------------------------------------------

export interface RetireeNote {
  readonly id: string
  readonly title: string
  readonly text: string
  readonly sourceId: string
}

/** Los errores que salen de leer los reglamentos, no de una lista genérica. */
export const RETIREE_MISTAKES: readonly RetireeNote[] = Object.freeze([
  {
    id: 'renovar',
    title: 'Renovar no es plata nueva entera',
    text: 'Al renovar, el BPS cancela el préstamo anterior con el nuevo: el saldo que debías se descuenta de lo que te dan. Renovar apenas se habilita deja menos plata en la mano y vuelve a empezar el plazo.',
    sourceId: 'bps-prestamo-social',
  },
  {
    id: 'iva',
    title: 'Comparar una tasa con IVA contra una sin IVA',
    text: 'El BROU y ANDA publican la tasa «más IVA»; con el 22 % sobre el interés, una tasa del 20 % se paga como una cercana al 25 %. El BPS no menciona IVA y su tabla de cuotas cierra con la tasa sola.',
    sourceId: 'brou-tasas',
  },
  {
    id: 'total',
    title: 'Mirar la tasa y no lo que devolvés',
    text: 'Pedí siempre el precio total financiado. En el ejemplo que publica Verde, la TEA es del 27 % y por $ 80.000 se devuelven $ 110.707, porque la cuota incluye IVA, una cuota social y un seguro.',
    sourceId: 'verde',
  },
  {
    id: 'piso',
    title: 'Olvidarse de los descuentos que ya tenés',
    text: 'El piso de lo que cobrás en mano se mide contra todos los descuentos juntos, no contra cada préstamo. Si ya tenés una retención de la mutualista, de una garantía de alquiler o de otro préstamo, el BPS te va a ofrecer menos o no te va a dejar pedir.',
    sourceId: 'bps-limitantes',
  },
  {
    id: 'suspension',
    title: 'Creer que si se corta la pasividad se corta la deuda',
    text: 'Si la pasividad se suspende, se renuncia a ella o el líquido no alcanza para la cuota, el BPS deja de descontar pero el vale sigue vigente: hay que pagar la cuota antes de fin de mes. Si no, se suma un recargo del 10 % por mora y, vencido el plazo, la deuda pasa a Unidades Indexadas.',
    sourceId: 'bps-reglamento',
  },
  {
    id: 'brou-y-bps',
    title: 'Sacar dos préstamos el mismo mes',
    text: 'Los préstamos del BPS y del BROU son compatibles, pero si sacás uno en el BROU el BPS te hace esperar al menos 60 días desde la solicitud, y que la primera cuota ya te la hayan descontado.',
    sourceId: 'bps-prestamo-social',
  },
])

/** Las cinco señales de la Comunicación 2024/177 del BCU, con sus palabras. */
export const BCU_SCAM_SIGNALS: readonly string[] = Object.freeze([
  'Te piden un desembolso de dinero antes de darte el préstamo.',
  'La empresa no tiene local físico, o la dirección que da no es la suya.',
  'Ofrece tasas por debajo de la media del mercado.',
  'Quien ofrece el crédito no está inscripto en el Banco Central.',
  'Usa nombres o distintivos que imitan a una entidad financiera conocida.',
])

export const BPS_ANTIFRAUD: readonly RetireeNote[] = Object.freeze([
  {
    id: 'datos',
    title: 'El BPS no pide datos por WhatsApp, SMS ni correo',
    text: 'Nunca solicita datos confidenciales por correo electrónico, SMS, WhatsApp ni redes sociales: usuarios, contraseñas, números de tarjeta o códigos de verificación.',
    sourceId: 'bps-phishing',
  },
  {
    id: 'pagos',
    title: 'Tampoco cobra por un trámite',
    text: 'El BPS no requiere pagos de ningún tipo para efectuar un trámite, y pedir un préstamo social es un trámite: se hace en línea o en sus oficinas.',
    sourceId: 'bps-maniobras',
  },
  {
    id: 'llamadas',
    title: 'Si te llama, el número es el 2211 1997',
    text: 'Desde abril de 2026 todas las llamadas del BPS, a fijos y a celulares, se identifican únicamente con el 2211 1997. Otro número que dice ser del BPS no lo es.',
    sourceId: 'bps-numero',
  },
  {
    id: 'facebook',
    title: 'El caso que terminó en 23 condenas',
    text: 'La operación «Gota a Gota» ofrecía por Facebook préstamos con condiciones atractivas, seguía por WhatsApp y pedía un giro por «gastos de gestión» antes de prestar, con documentos que llevaban logos de aseguradoras inexistentes.',
    sourceId: 'fiscalia-2020',
  },
])

export interface RetireeUnpublished {
  readonly id: string
  readonly label: string
  readonly why: string
}

/** Lo que esta página NO publica, con el motivo escrito. */
export const RETIREE_UNPUBLISHED: readonly RetireeUnpublished[] = Object.freeze([
  {
    id: 'brou-2026',
    label: 'Las fechas de la campaña 2026 del BROU',
    why: 'Al 19 de octubre de 2026 no estaban anunciadas, y la página del producto en brou.com.uy contestaba «servicio temporalmente no disponible». Las de 2025 las publicó Presidencia; las de este año, cuando se anuncien.',
  },
  {
    id: 'iva-bps',
    label: 'Si a la tasa del BPS se le suma IVA',
    why: 'La ficha del préstamo social no lo dice. Lo que sí se puede afirmar es que su propia tabla de cuotas cierra con la tasa sola, sin IVA, y es la tabla que usa esta página.',
  },
  {
    id: 'lista-completa',
    label: 'La lista completa de cooperativas y financieras que retienen sobre la pasividad',
    why: 'El BPS no publica un registro de esas instituciones. Las que figuran acá son las que lo dicen en su propio sitio; la habilitación de cualquier otra se verifica en los registros del Banco Central.',
  },
  {
    id: 'cuota-diferencial',
    label: 'La cuota con la tasa diferencial de noviembre',
    why: 'El BPS publicó las tasas pero no una tabla de cuotas, y la cuenta con una anualidad no reproduce su tabla vigente: daría un número que el BPS no imprime.',
  },
])

export interface RetireeFaq {
  readonly id: string
  readonly question: string
  readonly answer: string
}

/** `$ 474.500`: pesos redondos, con el punto de miles uruguayo. */
export const retireePesos = (value: number): string =>
  `$ ${Math.round(value).toLocaleString('es-UY')}`

/** `21,25 %`: coma decimal y el espacio antes del signo, como lo escribe el resto del sitio. */
export const retireePct = (value: number): string =>
  `${value.toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} %`

export const RETIREE_FAQ: readonly RetireeFaq[] = Object.freeze([
  {
    id: 'brou-cuando',
    question: '¿Cuándo empiezan los préstamos para jubilados en el BROU?',
    answer: `La línea con retención para pasivos está abierta todo el año, desde el primer mes de cobro, con tasas vigentes desde el 1 de octubre de 2026. Lo que tiene fecha es la campaña «Préstamos para Pasivos» de fin de año: la de 2025 empezó en noviembre, abrió las sucursales el 9 de diciembre por el dígito verificador de la cédula y cerró el 30 de diciembre. Al 19 de octubre de 2026 el BROU no había anunciado las fechas de la de 2026.`,
  },
  {
    id: 'bps-cuanto',
    question: '¿Cuánto le presta el BPS a un jubilado?',
    answer: `Hasta ${BPS_MAX_HABERES} haberes nominales mensuales, con un tope de ${retireePesos(BPS_MAX_AMOUNT)} según la ficha actualizada el 6 de agosto de 2026. La cuota no puede superar el ${BPS_CUOTA_CAP_FICHA_PCT} % (el reglamento publicado dice ${BPS_CUOTA_CAP_REGLAMENTO_PCT} % de los haberes nominales) y en ningún caso puede dejarte cobrando menos del ${RETENTION_FLOOR_PCT} % del nominal, deducidos el aporte al SNIS y el IASS.`,
  },
  {
    id: 'bps-tasa',
    question: '¿Qué tasa cobra el BPS por el préstamo social?',
    answer: `Desde la rebaja anunciada el 4 de agosto de 2026: ${retireePct(bpsRate(6)!.teaPct)} efectiva anual en 6 cuotas, ${retireePct(bpsRate(12)!.teaPct)} en 12, ${retireePct(bpsRate(18)!.teaPct)} en 18 y ${retireePct(bpsRate(24)!.teaPct)} en 24. Desde el 1 de noviembre de 2026 y durante 90 días, los préstamos nuevos de las pasividades de menores ingresos van cinco puntos abajo. Los préstamos para prótesis, lentes, audífonos y dentista cobran ${retireePct(BPS_PROTESIS.teaPct)}.`,
  },
  {
    id: 'descuento',
    question: '¿Cuánto me pueden descontar de la jubilación?',
    answer: `Por la Ley 17.829, todos los descuentos juntos no pueden dejarte cobrando menos del ${RETENTION_FLOOR_PCT} % del nominal, una vez restados los impuestos a la renta y los aportes; el piso baja al ${RETENTION_FLOOR_PCT_HOUSING} % si entre los descuentos hay una garantía de alquiler o actos cooperativos. Un Crédito de Nómina, además, no puede llevarse más del ${NOMINA_CUOTA_CAP_PCT} % de los haberes nominales (Ley 19.210, art. 30).`,
  },
  {
    id: 'bps-y-brou',
    question: '¿Puedo tener un préstamo del BPS y otro del BROU a la vez?',
    answer: `Sí, son compatibles mientras la suma de las cuotas respete el piso del ${RETENTION_FLOOR_PCT} %. Si sacás primero el del BROU, el BPS te hace esperar al menos ${BPS_WAIT_AFTER_BROU_DAYS} días desde la solicitud y que la cuota del banco ya te la hayan descontado.`,
  },
  {
    id: 'fallecimiento',
    question: '¿Qué pasa con el préstamo si fallece el titular?',
    answer:
      'En el BPS el saldo de capital lo cubre un fondo de autoseguro, cuya prima ya está incluida en la tasa. En el BROU, las cuotas del préstamo con retención incluyen la cancelación del saldo adeudado en caso de fallecimiento. En otro prestamista, preguntalo antes de firmar.',
  },
  {
    id: 'whatsapp',
    question: 'Me ofrecieron un préstamo del BPS por WhatsApp. ¿Es real?',
    answer:
      'El BPS no pide datos confidenciales por WhatsApp, SMS, correo ni redes, no cobra por ningún trámite y sus llamadas salen sólo del 2211 1997. Si además te piden plata antes de prestarte, es la primera de las cinco señales de estafa que lista el Banco Central.',
  },
])

// ---------------------------------------------------------------------------------------------
// Título y descripción
// ---------------------------------------------------------------------------------------------

/** El título, en un solo lugar: lo mide `retireeLoans.test.ts` con la marca puesta. */
export const RETIREE_TITLE = 'Préstamos para jubilados: ¿BPS o BROU?'

/**
 * La descripción, con las tres cifras que contestan la consulta: cuánto presta el BPS, a qué tasa,
 * y cuándo es la campaña del BROU. Se mide contra los 155 caracteres en el test.
 */
export const RETIREE_DESCRIPTION = `El BPS presta hasta ${BPS_MAX_HABERES} pasividades (${retireePesos(BPS_MAX_AMOUNT)}) al ${retireePct(BPS_TEA_MIN)}–${retireePct(BPS_TEA_MAX)}; el BROU, todo el año y con campaña a fin de año. Y cuánto te pueden descontar.`
