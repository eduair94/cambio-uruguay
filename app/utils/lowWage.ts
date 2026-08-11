// app/utils/lowWage.ts
// Datos de /vivir-con-25000-pesos-uruguay: «me llaman para ofrecerme 25.000 o 30.000 por 9 horas,
// ¿cómo hacen para vivir así?».
//
// POR QUÉ EXISTE, y por qué no es la página que ya teníamos. `wageCouncils.ts` responde «cuánto
// me TIENEN que pagar» y enseña a encontrar el laudo. Esta responde otras tres, que son las que
// se hacen de verdad cuando suena el teléfono:
//   1. ¿Es real que las ofertas son así, o me tocó mala suerte?
//   2. ¿Nueve horas se puede? ¿Y 25.000?
//   3. Si es legal, ¿cómo hace la gente para vivir con eso?
// Las tres tienen respuesta con datos, y las tres estaban sin responder en el sitio.
//
// LA REGLA DE LA CASA QUE MÁS PESA ACÁ: no se publica un número sin fuente y sin fecha. La
// pregunta original («¿cómo hacen para vivir así?») invita a opinar, y opinar es exactamente lo
// que esta página no hace. Todo lo que sigue es o una norma citada por artículo, o un dato
// publicado por el INE / MTSS, o una medición propia declarada como tal, con su método y sus
// límites escritos al lado.
//
// EL RELEVAMIENTO PROPIO. `BOARD_CENSUS` no es una cita de prensa: se midió leyendo los avisos.
// Está declarado como fotografía de un día, un portal y una ciudad, porque eso es lo que es.
// No se republica el nombre de la empresa de cada aviso. El valor probatorio del ejemplo está en
// el par monto + jornada declarada, no en quién lo publicó, y adosar un nombre propio a una
// lectura automática de un aviso es una acusación que este sitio no está en condiciones de
// sostener. Los agregados van sin nombres por el mismo motivo.
//
// EL HALLAZGO CENTRAL, y la razón por la que la página existe: la ventana de NUEVE horas es la
// más declarada del relevamiento —más frecuente que la de ocho—, y no es ilegal por sí sola. Lo
// que decide es qué pasa en el medio: con una hora de corte no pago son 8 trabajadas y está bien;
// con media hora de corte son 8,5 trabajadas, porque esa media hora se computa como trabajo
// efectivo, y ahí hay media hora extra por día. El tope semanal NO te salva: 42,5 h por semana
// están por debajo de las 44 del comercio y aun así hay hora extra, porque el tope diario de 8
// corre por su cuenta. Esa es la trampa que el sitio no explicaba en ningún lado.
//
// LO QUE NO SE AFIRMA. No se dice que un aviso concreto sea ilegal: un mensual declarado por
// debajo del SMN puede ser un mes parcial, un contrato temporal o un part time mal etiquetado, y
// desde afuera no se distingue. Se publica lo que el aviso dice y la cuenta que el lector tiene
// que hacer. Tampoco se proyecta «cuánto se gana en Uruguay»: para eso está el ingreso de los
// hogares del INE, que ya vive en `costOfLiving.ts` y se referencia, no se duplica.
//
// FUENTES, verificadas el 2026-08-11:
//   - IMPO, Decreto 319/025 (fija el Salario Mínimo Nacional 2026: $ 24.572 desde el 1.º de enero
//     y $ 25.383 desde el 1.º de julio; equivalentes dividiendo entre 25 el jornal y entre 200 la
//     hora). Promulgado 26/12/2025.
//     https://www.impo.com.uy/bases/decretos/319-2025
//   - MTSS, «Salario Mínimo Nacional: $ 24.572 desde el 1.º de enero de 2026»
//     https://www.gub.uy/ministerio-trabajo-seguridad-social/comunicacion/noticias/salario-minimo-nacional-24572-desde-1o-enero-2026
//   - MTSS, «Horario de trabajo» (el doble límite: 8 h diarias, y 44 o 48 semanales según comercio
//     o industria)
//     https://www.gub.uy/ministerio-trabajo-seguridad-social/institucional/derecho-laboral-uruguayo/horario-trabajo
//   - MTSS, «Descansos intermedios» (jornada continua: media hora que SE COMPUTA como trabajo
//     efectivo; jornada discontinua: 2 a 2 h 30, reducible a 1 hora si están de acuerdo obrero y
//     patrono y media comunicación a la Inspección General del Trabajo y de la Seguridad Social)
//     https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/derecho-reglamentacion-laboral/derecho-laboral-uruguayo/descansos-intermedios
//   - MTSS, «Descanso semanal» (industria: 24 h tras 6 días; comercio: 36 h consecutivas tras las
//     44 de trabajo)
//     https://www.gub.uy/ministerio-trabajo-seguridad-social/institucional/derecho-laboral-uruguayo/descanso-semanal
//   - IMPO, Ley 5.350 (jornada de 8 horas, industria)
//     https://www.impo.com.uy/bases/leyes/5350-1915
//   - IMPO, Decreto-Ley 14.320 (régimen del comercio: 44 horas semanales)
//     https://www.impo.com.uy/bases/decretos-ley/14320-1974
//   - IMPO, Ley 15.996 (horas extras: art. 1, son las que exceden el límite horario aplicable, con
//     100 % de recargo en día hábil y 150 % en día de descanso o feriado; art. 5, tope de 8 horas
//     extra semanales; art. 6, excepciones que autoriza el Poder Ejecutivo)
//     https://www.impo.com.uy/bases/leyes/15996-1988
//   - IMPO, Ley 18.345 art. 2 (licencia por estudio: 6, 9 o 12 días anuales según las horas
//     semanales), art. 3 (más de 6 meses de antigüedad; fraccionada de hasta 3 días incluyendo el
//     día del examen) y art. 4 (certificado del instituto). Modificada por la Ley 18.458.
//     https://www.impo.com.uy/bases/leyes/18345-2008
//   - INE, líneas de pobreza e ingreso de los hogares, y alquiler promedio por departamento: ya
//     auditados y fechados en `costOfLiving.ts`, de donde se importan en vez de recopiarse.

import { computePayroll } from './payroll'
import {
  INE_HOUSEHOLD_LINES,
  INE_HOUSEHOLD_LINES_PERIOD,
  INE_HOUSEHOLD_INCOME,
  INE_RENT_BY_DEPARTMENT,
  INE_RENT_PERIOD,
} from './costOfLiving'

/** Fecha en que las normas, el SMN y el relevamiento se contrastaron. */
export const LOWWAGE_VERIFIED_AT = '2026-08-11'

// ─────────────────────────────────────────────────────────────────────────────
// 1. EL PISO LEGAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Salario Mínimo Nacional 2026 (Decreto 319/025). Van los DOS tramos a propósito: el de enero
 * sigue vivo en los avisos publicados antes de julio y en los que nadie actualizó, y reconocerlo
 * es media respuesta —un aviso que ofrece exactamente $ 24.572 no eligió ese número, lo copió.
 */
export const SMN_2026 = Object.freeze({
  decreto: 'Decreto 319/025',
  promulgado: '2025-12-26',
  /** Vigente del 1.º de enero al 30 de junio de 2026. */
  enero: 24572,
  /** Vigente desde el 1.º de julio de 2026. Es el piso de hoy. */
  julio: 25383,
  /** Divisores que fija el propio decreto para pasar el mensual a jornal y a hora. */
  divisorJornal: 25,
  divisorHora: 200,
  aumentoAnualPct: 7.54,
})

/** El piso vigente hoy, en pesos por mes de jornada completa. */
export const SMN_VIGENTE = SMN_2026.julio

/** El piso vigente hoy, por hora: el decreto manda dividir el mensual entre 200. */
export const SMN_HORA = SMN_2026.julio / SMN_2026.divisorHora

/**
 * El doble límite de la jornada. Es doble de verdad: se incumple uno sin incumplir el otro, y es
 * el error de lectura más caro de toda esta página.
 */
export const JORNADA_LIMITES = Object.freeze({
  /** Tope diario, para las dos ramas. No admite compensarse con una semana corta. */
  diario: 8,
  /** Tope semanal del comercio y los servicios (Decreto-Ley 14.320). */
  semanalComercio: 44,
  /** Tope semanal de la industria (Ley 5.350). */
  semanalIndustria: 48,
})

export type Rama = 'comercio' | 'industria'

/** Recargo de la hora extra (Ley 15.996, art. 1), en porcentaje sobre el salario. */
export const HORA_EXTRA = Object.freeze({
  /** Día hábil: la hora extra se paga el doble. */
  recargoHabilPct: 100,
  /** Día de descanso o feriado: dos veces y media. */
  recargoDescansoPct: 150,
  /** Tope semanal de horas extra que el empleador puede disponer (art. 5). */
  topeSemanal: 8,
})

/**
 * El descanso intermedio, que es donde se decide si «9 horas» es legal o no.
 *
 * OJO CON LA ASIMETRÍA, porque es contraintuitiva: el corte CORTO se paga y el LARGO no. En la
 * jornada continua la media hora se computa como trabajo efectivo, así que una ventana de 9 horas
 * con media hora de corte son 8 horas y media TRABAJADAS. En la jornada discontinua el corte de
 * 2 a 2 h 30 —reducible a 1 hora— no se computa, y ahí la misma ventana de 9 horas son 8.
 */
export const DESCANSO_INTERMEDIO = Object.freeze({
  /** Jornada continua: minutos de corte. */
  continuaMin: 30,
  /** Y se computan como trabajo efectivo, o sea, se pagan. */
  continuaEsTrabajoEfectivo: true,
  /** Jornada discontinua: el corte va de 2 a 2 h 30. */
  discontinuaMinHoras: 2,
  discontinuaMaxHoras: 2.5,
  /** Reducible a 1 hora, pero no de palabra: requiere acuerdo Y comunicación a la IGTSS. */
  discontinuaReducibleAHoras: 1,
  requisitoReduccion:
    'Sólo si están de acuerdo obrero y patrono y media comunicación a la Inspección General del Trabajo y de la Seguridad Social.',
  /** En el comercio el corte va después de las primeras cuatro horas de trabajo. */
  comercioTrasHoras: 4,
})

/** Descanso semanal mínimo (MTSS). No es lo mismo en las dos ramas. */
export const DESCANSO_SEMANAL = Object.freeze({
  industriaHoras: 24,
  comercioHoras: 36,
})

/**
 * Licencia por estudio (Ley 18.345, modificada por la Ley 18.458). Está acá porque la pregunta
 * original termina en «y estudiar ni hablemos»: existe un derecho, y escala con las horas que
 * trabajás. Los días son un MÍNIMO legal; el laudo del sector puede dar más.
 */
export const LICENCIA_ESTUDIO = Object.freeze({
  ley: 'Ley 18.345, art. 2 (modificada por la Ley 18.458)',
  /** Días anuales mínimos según las horas semanales de trabajo. */
  tramos: Object.freeze([
    Object.freeze({ hastaHorasSemana: 36, dias: 6 }),
    Object.freeze({ hastaHorasSemana: 48, dias: 9, exclusivo: true }),
    Object.freeze({ hastaHorasSemana: Infinity, dias: 12 }),
  ]),
  antiguedadMinimaMeses: 6,
  fraccionMaximaDias: 3,
  requiereCertificado: true,
})

/**
 * Días de licencia por estudio que corresponden a una carga horaria semanal.
 * El tramo del medio es abierto por los dos lados en el texto legal («más de 36 y menos de 48»),
 * así que 48 exactas caen en el tramo de 12, no en el de 9.
 */
export function diasLicenciaEstudio(horasSemana: number): number {
  if (horasSemana <= 36) return 6
  if (horasSemana < 48) return 9
  return 12
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. LA JORNADA: qué pasa realmente adentro de una ventana de 9 horas
// ─────────────────────────────────────────────────────────────────────────────

/** Semanas por mes. 52/12, que es la conversión exacta, no «4». */
export const SEMANAS_POR_MES = 52 / 12

export interface JornadaInput {
  /** Hora de entrada, decimal (9,5 = 9:30). */
  entrada: number
  /** Hora de salida, decimal. Si es menor que la entrada se asume que cruza la medianoche. */
  salida: number
  /** Minutos de corte declarados. 0 = sin corte. */
  corteMin: number
  /** Días trabajados por semana. */
  diasPorSemana: number
  rama: Rama
  /** Sueldo mensual nominal ofrecido, para valorizar las extras. */
  nominal: number
}

export interface JornadaResult {
  /** Horas de presencia: salida menos entrada. */
  ventana: number
  /** Si el corte se computa como trabajo efectivo (jornada continua, corte de hasta 30 min). */
  corteEsPago: boolean
  /** Horas efectivamente trabajadas por día. */
  horasDia: number
  horasSemana: number
  horasMes: number
  topeSemanal: number
  excedeTopeDiario: boolean
  excedeTopeSemanal: boolean
  /** Extras por la vía del tope diario, en la semana. */
  extrasPorTopeDiario: number
  /** Extras por la vía del tope semanal. */
  extrasPorTopeSemanal: number
  /** Las que manda: el mayor de los dos caminos (los topes son autónomos). */
  extrasSemana: number
  extrasMes: number
  /** Supera el tope de 8 horas extra semanales del art. 5 de la Ley 15.996. */
  superaTopeExtras: boolean
  /** Valor de la hora simple, nominal/200 (el divisor del propio decreto del SMN). */
  valorHora: number
  /** Lo que esas extras deberían sumar al mes, con el 100 % de recargo del día hábil. */
  deudaExtrasMes: number
  /** Corte declarado que no encaja ni en la jornada continua ni en la discontinua reducida. */
  corteAnomalo: boolean
}

/**
 * Descompone una ventana horaria declarada en un aviso.
 *
 * LA DECISIÓN DE MODELADO que hay que entender: el corte de hasta 30 minutos NO se resta, porque
 * en la jornada continua se computa como trabajo efectivo. Restarlo —que es lo que hace la
 * intuición— es justamente el error que borra la media hora extra diaria.
 *
 * Y las extras se calculan por los DOS topes y se toma el mayor, no la suma: los límites diario y
 * semanal son autónomos, y una misma hora no se cuenta dos veces por exceder los dos.
 */
export function jornadaBreakdown(input: JornadaInput): JornadaResult {
  const entrada = clamp(input.entrada, 0, 24)
  let salida = clamp(input.salida, 0, 24)
  if (salida <= entrada) salida += 24
  const ventana = round2(salida - entrada)

  const corteMin = Math.max(0, input.corteMin || 0)
  const corteEsPago = corteMin <= DESCANSO_INTERMEDIO.continuaMin
  const horasDia = round2(Math.max(0, corteEsPago ? ventana : ventana - corteMin / 60))

  const dias = clamp(input.diasPorSemana, 1, 7)
  const horasSemana = round2(horasDia * dias)
  const horasMes = round2(horasSemana * SEMANAS_POR_MES)

  const topeSemanal =
    input.rama === 'industria' ? JORNADA_LIMITES.semanalIndustria : JORNADA_LIMITES.semanalComercio

  const extrasPorTopeDiario = round2(Math.max(0, horasDia - JORNADA_LIMITES.diario) * dias)
  const extrasPorTopeSemanal = round2(Math.max(0, horasSemana - topeSemanal))
  const extrasSemana = round2(Math.max(extrasPorTopeDiario, extrasPorTopeSemanal))
  const extrasMesExacto = extrasSemana * SEMANAS_POR_MES
  const extrasMes = round2(extrasMesExacto)

  const nominal = Math.max(0, input.nominal || 0)
  const valorHora = round2(nominal / SMN_2026.divisorHora)
  // Se valoriza sobre el mensual SIN redondear: redondear las horas antes de multiplicarlas por el
  // valor hora se come un peso por cada centésima, y acá el resultado es plata que se reclama.
  const deudaExtrasMes = round2(
    extrasMesExacto * valorHora * (1 + HORA_EXTRA.recargoHabilPct / 100)
  )

  return {
    ventana,
    corteEsPago,
    horasDia,
    horasSemana,
    horasMes,
    topeSemanal,
    excedeTopeDiario: horasDia > JORNADA_LIMITES.diario,
    excedeTopeSemanal: horasSemana > topeSemanal,
    extrasPorTopeDiario,
    extrasPorTopeSemanal,
    extrasSemana,
    extrasMes,
    superaTopeExtras: extrasSemana > HORA_EXTRA.topeSemanal,
    valorHora,
    deudaExtrasMes,
    // Entre 31 y 59 minutos no es ninguna de las dos figuras: pasa los 30 de la jornada continua
    // y no llega a la hora del corte discontinuo reducido.
    corteAnomalo:
      corteMin > DESCANSO_INTERMEDIO.continuaMin &&
      corteMin < DESCANSO_INTERMEDIO.discontinuaReducibleAHoras * 60,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. EL PISO: ¿ese nominal llega al mínimo?
// ─────────────────────────────────────────────────────────────────────────────

export interface SmnCheck {
  /** El piso mensual que le corresponde a ese puesto. */
  piso: number
  /** Si el puesto se evaluó como jornada completa (piso = SMN entero) o como reducida. */
  jornadaCompleta: boolean
  /** El piso por la vía horaria: horas del mes por el valor hora del SMN. */
  pisoPorHora: number
  diferencia: number
  bajoElMinimo: boolean
  /** Coincide con el SMN de enero, que desde el 1.º de julio quedó viejo. */
  esElMinimoDeEnero: boolean
}

/**
 * Una jornada es COMPLETA cuando llega al máximo legal diario en una semana estándar.
 *
 * El umbral no es inventado: se ancla en el tope de 8 horas diarias, que es el que la propia ley
 * fija. Quien hace 8 horas cinco días está cumpliendo la jornada máxima diaria — es full time, sin
 * importar que su semana dé 40 y el tope del comercio sea 44. Quien hace 6 horas, no.
 */
export function esJornadaCompleta(horasDia: number, diasPorSemana: number): boolean {
  return horasDia >= JORNADA_LIMITES.diario && diasPorSemana >= 5
}

/**
 * Contrasta el nominal ofrecido contra el SMN.
 *
 * LA DECISIÓN DE MODELADO, porque acá es fácil equivocarse y el error favorece al empleador: el
 * SMN es un MONTO MENSUAL para la jornada completa, no una tarifa por hora que se prorratea. A un
 * mensual de lunes a viernes de 8 horas le corresponde el SMN entero, aunque su mes dé unas 173
 * horas y no 200. Prorratear ahí —dividir 173 sobre 200— rebajaría el piso a unos $ 22.000 y
 * daría por buena justamente la oferta que la página está examinando. No se hace.
 *
 * Los divisores del decreto (25 para el jornal, 200 para la hora) existen para quien cobra POR DÍA
 * o POR HORA, y de ahí sale el piso de la jornada reducida: horas del mes por $ 126,92. Ése es el
 * único prorrateo que tiene respaldo en el texto, y sólo se aplica cuando la jornada no es
 * completa.
 *
 * Trabajar MÁS de 200 horas tampoco sube el SMN: ese exceso se paga por la vía de la hora extra,
 * que `jornadaBreakdown` calcula aparte. Sumarlo acá sería contarlo dos veces.
 *
 * IMPORTANTE, y va escrito en la página, no sólo acá: el SMN es el piso del país, casi nunca es
 * TU piso. Si tu rama tiene Consejo de Salarios, manda el laudo de tu grupo y categoría.
 */
export function smnCheck(nominal: number, horasMes: number, jornadaCompleta: boolean): SmnCheck {
  const pisoPorHora = round2(Math.max(0, horasMes) * SMN_HORA)
  const piso = jornadaCompleta ? SMN_VIGENTE : pisoPorHora
  const n = Math.max(0, nominal || 0)
  return {
    piso,
    jornadaCompleta,
    pisoPorHora,
    diferencia: round2(n - piso),
    bajoElMinimo: n < piso - 0.5,
    esElMinimoDeEnero: Math.abs(n - SMN_2026.enero) < 1,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ¿ALCANZA? La cuenta que responde la pregunta original
// ─────────────────────────────────────────────────────────────────────────────

export type Region = 'montevideo' | 'interior'

export interface SurvivalInput {
  nominal: number
  region: Region
  /** Integrantes del hogar: 1, 2 o 3 (el INE publica la línea del hogar hasta 3). */
  personas: 1 | 2 | 3
  inquilino: boolean
  /** Cuántos sueldos como ese entran al hogar. */
  ingresos: number
}

export interface SurvivalResult {
  liquido: number
  /** Total que entra al hogar: líquido por cantidad de ingresos. */
  ingresoHogar: number
  /** Línea de pobreza del hogar publicada por el INE para esa región y tamaño. */
  lineaPobreza: number
  sobreLaLinea: boolean
  margen: number
  /** Alquiler promedio de los contratos NUEVOS: lo que se firma hoy, no lo que se paga hoy. */
  alquilerNuevo: number
  /** Qué queda del ingreso del hogar después de ese alquiler. */
  restaTrasAlquiler: number
  /** El alquiler se come este porcentaje del ingreso del hogar. */
  alquilerPctIngreso: number
}

/** Alquiler promedio de contratos nuevos que usa la cuenta, por región (INE). */
export function alquilerNuevoRegion(region: Region): number {
  const mvd = INE_RENT_BY_DEPARTMENT.find(d => d.departamento === 'Montevideo')
  if (region === 'montevideo') return mvd ? mvd.nuevos : 0
  // «Interior» es la región del INE, no un departamento: se promedia el resto sin ponderar,
  // y así se declara. La ponderación por contratos vive en costOfLiving.ts y es otra cuenta.
  const resto = INE_RENT_BY_DEPARTMENT.filter(d => d.departamento !== 'Montevideo')
  return Math.round(resto.reduce((a, d) => a + d.nuevos, 0) / resto.length)
}

/**
 * La cuenta completa: del nominal ofrecido al líquido, del líquido al hogar, y del hogar a la
 * línea de pobreza que publica el INE para ese hogar.
 *
 * POR QUÉ CONTRA LA LÍNEA DE POBREZA y no contra un presupuesto inventado: la línea es un dato
 * publicado con fecha y región, y es la única vara que no es opinión nuestra. No es «lo que
 * cuesta vivir bien»: es el umbral por debajo del cual el INE cuenta a un hogar como pobre.
 */
export function survivalCheck(input: SurvivalInput): SurvivalResult {
  const liquido = computePayroll({ nominal: Math.max(0, input.nominal || 0) }).liquido
  const ingresos = clamp(input.ingresos, 1, 4)
  const ingresoHogar = round2(liquido * ingresos)

  const tabla = INE_HOUSEHOLD_LINES[input.region]
  const idx = clamp(input.personas, 1, 3) - 1
  const lineaPobreza = (input.inquilino ? tabla.inquilinos : tabla.noInquilinos)[idx]

  const alquilerNuevo = input.inquilino ? alquilerNuevoRegion(input.region) : 0

  return {
    liquido,
    ingresoHogar,
    lineaPobreza,
    sobreLaLinea: ingresoHogar >= lineaPobreza,
    margen: round2(ingresoHogar - lineaPobreza),
    alquilerNuevo,
    restaTrasAlquiler: round2(ingresoHogar - alquilerNuevo),
    alquilerPctIngreso: ingresoHogar > 0 ? round2((alquilerNuevo / ingresoHogar) * 100) : 0,
  }
}

/** Periodos de los datos del INE que usa la cuenta, para mostrarlos al lado del resultado. */
export const SURVIVAL_PERIODS = Object.freeze({
  lineas: INE_HOUSEHOLD_LINES_PERIOD,
  alquiler: INE_RENT_PERIOD,
  ingresos: INE_HOUSEHOLD_INCOME.period,
})

/** Mediana del ingreso per cápita del país, para dimensionar el sueldo del aviso. */
export const INGRESO_PERCAPITA_MEDIANA = INE_HOUSEHOLD_INCOME.medianaPerCapita

// ─────────────────────────────────────────────────────────────────────────────
// 5. EL RELEVAMIENTO: ¿es real que las ofertas son así?
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Medición propia. Se leyeron los avisos de un portal de empleo, un día, una ciudad, y se anotó
 * lo que cada aviso declaraba. Los límites van publicados con los números, no en una nota al pie:
 * una foto de un día no es «el mercado laboral uruguayo», y decir lo contrario sería el mismo
 * error que esta página le señala a los avisos.
 */
export const BOARD_CENSUS = Object.freeze({
  fuente: 'Computrabajo Uruguay',
  zona: 'Montevideo',
  fecha: '2026-08-11',
  /** Avisos únicos relevados en el listado. */
  avisos: 498,
  /** De ésos, los que traen un salario mensual en el aviso. */
  conSalarioMensual: 119,
  /**
   * El hallazgo que obliga a limpiar la muestra: 51 de esos 119 declaran $ 111.111 o $ 111.110.
   * No es un sueldo, es un relleno para pasar un campo obligatorio, y lo usan nueve empresas
   * distintas de la muestra —una sola aporta 34—. Aparece en puestos donde el número es
   * imposible, del tipo operario de lavado de bandejas.
   */
  centinela111111: 51,
  centinelaEmpresas: 9,
  /** Los que quedan con un número que se puede leer como sueldo. */
  muestraLimpia: 68,
  /** O sea: sólo 1 de cada 7 avisos publica un sueldo utilizable. */
  pctConSueldoUtil: 13.7,
  mediana: 38000,
  p25: 31369,
  p75: 44000,
  minimo: 15000,
  /** Declaran un mensual por debajo del SMN vigente. */
  bajoSmn: 9,
  /** Caen en la banda exacta de la pregunta. */
  entre25y30k: 7,
  /** Hasta 35.000, o sea la mitad de abajo de lo que se publica. */
  hasta35k: 31,
  conComision: 10,
})

/**
 * La segunda medición, y la que contesta el «por 9 horas». Se abrieron 150 avisos y se buscó la
 * franja horaria declarada en el cuerpo del texto («de 9:00 a 18:00»), midiendo la VENTANA de
 * presencia, no las horas trabajadas —que es precisamente lo que el aviso no dice.
 */
export const BOARD_HOURS = Object.freeze({
  avisosLeidos: 150,
  /** De ésos, los que declaran una franja horaria concreta. */
  conVentanaHoraria: 69,
  /** Ventana de 9 horas o más. */
  nueveOMas: 36,
  /** Ventana de 9 horas exactas: es la moda de la distribución. */
  nueveExactas: 30,
  /** Ventana de 8 horas. */
  ocho: 17,
  menorAOcho: 10,
  /** La ventana más frecuente de todas. */
  moda: 9,
})

export interface BoardExample {
  /** Puesto tal como lo titula el aviso. */
  puesto: string
  /** Mensual nominal declarado, en pesos. */
  nominal: number
  /** Si el aviso agrega comisiones al fijo. */
  comisiones?: boolean
  /** Jornada u horario, transcripto del aviso. */
  jornada: string | null
  /** Ventana de presencia que se deduce del horario, en horas. `null` si el aviso no la declara. */
  ventana: number | null
  /** Etiqueta de contrato que puso el propio aviso. */
  contrato: string | null
  /** Qué enseña este aviso. Es lectura nuestra y va marcada como tal. */
  lectura: string
}

/**
 * Ejemplos reales del relevamiento, transcriptos. SIN NOMBRE DE EMPRESA, a propósito: lo que
 * prueba el ejemplo es el par monto + jornada, y ponerle nombre propio a la lectura automática de
 * un aviso es una acusación que no corresponde hacer desde acá. Van ordenados por monto.
 */
export const BOARD_EXAMPLES: readonly BoardExample[] = Object.freeze([
  Object.freeze({
    puesto: 'Oficial de elaboración en panadería (temporal)',
    nominal: 15000,
    jornada: 'Jornadas de 8 horas diarias de 22:00 a 06:00 horas, descanso entre semana.',
    ventana: 8,
    contrato: 'Tiempo completo',
    lectura:
      'Ocho horas declaradas y de noche, con un mensual muy por debajo del SMN. Desde afuera no se sabe si es un mes parcial de un contrato temporal o un incumplimiento: eso es exactamente lo que hay que preguntar antes de aceptar, porque el aviso no lo aclara.',
  }),
  Object.freeze({
    puesto: 'Ejecutivo de recupero',
    nominal: 22000,
    comisiones: true,
    jornada: null,
    ventana: null,
    contrato: 'Tiempo completo',
    lectura:
      'Etiquetado «tiempo completo» y con un fijo por debajo del mínimo. El «+ comisiones» no arregla el piso: el mínimo se mide contra lo que la empresa se obliga a pagar, no contra lo que podrías llegar a ganar.',
  }),
  Object.freeze({
    puesto: 'Vendedor/a de calle',
    nominal: 24349,
    comisiones: true,
    jornada: null,
    ventana: null,
    contrato: null,
    lectura:
      'Sin jornada declarada y con fijo bajo el mínimo. Cuando el aviso no dice las horas, el número mensual no significa nada: puede ser media jornada o puede ser una jornada completa mal paga, y son cosas distintas.',
  }),
  Object.freeze({
    puesto: 'Promotor/a de ventas',
    nominal: 24572,
    jornada: 'Jornada: lunes a viernes de 9:00 a 18:00 hs.',
    ventana: 9,
    contrato: null,
    lectura:
      'El aviso exacto de la pregunta: nueve horas de ventana y un mensual que es, peso por peso, el Salario Mínimo Nacional que rigió hasta el 30 de junio. Desde el 1.º de julio ese número quedó por debajo del piso. No lo eligieron: lo copiaron y no lo actualizaron.',
  }),
  Object.freeze({
    puesto: 'Auxiliar de servicio para planta',
    nominal: 26000,
    jornada: 'Lunes a viernes de 8:00 a 16:00 horas.',
    ventana: 8,
    contrato: 'Tiempo completo',
    lectura:
      'Ocho horas de ventana, cinco días: 40 horas semanales, dentro de los dos topes. Es de los pocos avisos de la banda baja que cierra sin peros — y aun así el líquido no paga el alquiler promedio de Montevideo.',
  }),
  Object.freeze({
    puesto: 'Cadete logístico',
    nominal: 28000,
    jornada: 'Horario: lunes a viernes, 08:00 a 17:00 h.',
    ventana: 9,
    contrato: 'Tiempo completo',
    lectura:
      'La otra ventana de nueve horas. Todo depende del corte que no está escrito: con una hora no paga son 40 horas semanales; con media hora son 42,5 y aparecen 2,5 horas extra por semana que el aviso no menciona.',
  }),
  Object.freeze({
    puesto: 'Reponedor para operador de servicio',
    nominal: 30000,
    jornada: 'Disponibilidad horaria: lunes a viernes de 8 a 16 horas.',
    ventana: 8,
    contrato: 'Tiempo completo',
    lectura:
      'El techo de la banda de la pregunta, con jornada de ocho. Sirve de referencia: en este relevamiento, 30.000 por 40 horas está por debajo del percentil 25 de lo que publican los avisos que sí declaran sueldo.',
  }),
  Object.freeze({
    puesto: 'Telefonista de cabina (guardias)',
    nominal: 30000,
    jornada:
      'Lunes a domingos, guardias de 7 h a coordinar. Valor hora $ 231,19 nominal + presentismo $ 7.610.',
    ventana: 7,
    contrato: null,
    lectura:
      'El contraejemplo útil: la hora vale $ 231,19, casi el doble del piso legal por hora, y el mensual igual queda en 30.000 porque son menos horas y repartidas. Enseña a leer al revés — no preguntes cuánto pagan por mes, preguntá cuánto pagan la hora y cuántas son.',
  }),
  Object.freeze({
    puesto: 'Fiambrero / cajero / repositor',
    nominal: 30150,
    jornada: 'Turno establecido de 14:30 a 22:00, descanso entre semana.',
    ventana: 7.5,
    contrato: null,
    lectura:
      '«Descanso entre semana» significa que el franco no es el domingo: es legal, pero cambia la vida más que el sueldo. En el comercio el descanso semanal son 36 horas consecutivas, no un día suelto.',
  }),
])

// ─────────────────────────────────────────────────────────────────────────────
// 6. LA RESPUESTA A «¿CÓMO HACEN?»
// ─────────────────────────────────────────────────────────────────────────────

export interface Mecanismo {
  titulo: string
  detalle: string
}

/**
 * Las salidas reales, dichas sin épica. La pregunta «¿cómo hacen para vivir así?» tiene una
 * respuesta aritmética incómoda y es la primera de esta lista: en general, no lo hacen solos.
 */
export const MECANISMOS: readonly Mecanismo[] = Object.freeze([
  Object.freeze({
    titulo: 'No es un ingreso de hogar, es medio',
    detalle:
      'Con el mínimo completo, alquilando y viviendo solo en Montevideo, la cuenta no cierra: el líquido queda por debajo de la línea de pobreza que el INE publica para un hogar de una persona inquilina. Ese sueldo funciona cuando entra a un hogar donde ya hay otro ingreso, y esa es la explicación menos épica y más frecuente.',
  }),
  Object.freeze({
    titulo: 'No pagar alquiler cambia todo el resultado',
    detalle:
      'El INE publica dos líneas de pobreza distintas según el hogar sea inquilino o no, y la diferencia es enorme. Quedarse en casa de la familia no es una anécdota generacional: es, en la cuenta, lo que convierte ese sueldo en viable. Por eso «me fui a vivir solo» es el momento exacto en que el mismo sueldo deja de alcanzar.',
  }),
  Object.freeze({
    titulo: 'El interior no es Montevideo',
    detalle:
      'El mismo nominal rinde distinto: el alquiler promedio de los contratos nuevos fuera de Montevideo es marcadamente menor, y la línea de pobreza del interior también. No es que se gane mejor; es que el piso de gasto es más bajo.',
  }),
  Object.freeze({
    titulo: 'El segundo trabajo choca contra el descanso, no contra la ley',
    detalle:
      'Tener dos empleos no está prohibido, y los topes de jornada se miden por empleador. Lo que no se puede es hacer desaparecer el descanso semanal: en el comercio son 36 horas consecutivas y en la industria 24. Con una ventana de nueve horas cinco días, lo que queda no es tiempo de otro empleo de jornada completa, es tiempo de changas.',
  }),
  Object.freeze({
    titulo: 'Estudiar tiene un derecho que casi nadie pide',
    detalle:
      'La licencia por estudio existe, es paga y escala con tus horas: 6 días al año hasta 36 horas semanales, 9 días entre 36 y 48, y 12 días con 48. Se pide con más de seis meses de antigüedad, se toma fraccionada de hasta 3 días por examen incluyendo el día de la prueba, y se justifica con certificado del instituto. No resuelve la carrera, pero es la diferencia entre poder rendir y no poder.',
  }),
  Object.freeze({
    titulo: 'Antes de irte, revisá si te están pagando lo que corresponde',
    detalle:
      'El Salario Mínimo Nacional es el piso del país, casi nunca es tu piso. Si tu rama tiene Consejo de Salarios, el mínimo lo fija el laudo de tu grupo, subgrupo y categoría, y suele ser bastante más alto. El MTSS te dice cuál es el tuyo gratis. Una parte de los sueldos de esta banda no son «lo que paga el mercado»: son categorías mal asignadas.',
  }),
])

/** Los tres pasos concretos, en orden, para quien acaba de recibir una oferta así. */
export const QUE_HACER: readonly Mecanismo[] = Object.freeze([
  Object.freeze({
    titulo: 'Pedí las horas por escrito antes que el sueldo',
    detalle:
      'Preguntá tres cosas: de qué hora a qué hora, cuánto dura el corte, y si ese corte se paga. Con eso ya sabés si el aviso te está ofreciendo 8 horas o 8 y media, y si hay horas extra escondidas en la ventana. Sin eso, el número mensual no se puede evaluar.',
  }),
  Object.freeze({
    titulo: 'Contrastá contra el laudo de tu rama, no contra el SMN',
    detalle:
      'El grupo lo define la actividad de la empresa, no tu tarea. El MTSS da asesoramiento laboral y salarial gratuito por web y te informa los mínimos de tu categoría, las partidas y las fechas de los aumentos.',
  }),
  Object.freeze({
    titulo: 'Si ya estás adentro y no cierra, guardá los recibos',
    detalle:
      'La Inspección General del Trabajo recibe denuncias con dos condiciones: vínculo laboral vigente e infracción en curso. Los recibos de sueldo y el registro de tus horas son la prueba, y se juntan antes de reclamar, no después.',
  }),
])

// ─────────────────────────────────────────────────────────────────────────────
// 7. FAQ
// ─────────────────────────────────────────────────────────────────────────────

export interface LowWageFaq {
  question: string
  short: string
  answer: string
}

export const LOWWAGE_FAQ: readonly LowWageFaq[] = Object.freeze([
  {
    question: '¿Es legal que me ofrezcan 25.000 pesos por jornada completa?',
    short: 'No, si es jornada completa: el mínimo es $ 25.383 desde el 1.º de julio de 2026.',
    answer:
      'El Decreto 319/025 fijó el Salario Mínimo Nacional en $ 24.572 desde el 1.º de enero de 2026 y en $ 25.383 desde el 1.º de julio. Para una jornada completa, un nominal de 25.000 está por debajo de ese piso y no es legal. Tres aclaraciones. La primera desarma la cuenta que suelen hacer para justificarlo: el SMN es un monto MENSUAL para la jornada completa, no una tarifa por hora que se prorratea. Si trabajás de lunes a viernes ocho horas, tu mes da unas 173 horas y no 200, y eso no rebaja tu piso: te corresponde el mínimo entero igual. Los divisores del decreto —25 para el jornal, 200 para la hora, o sea $ 126,92 la hora— existen para quien cobra por día o por hora. La segunda: si el puesto es realmente de jornada reducida, el piso sí se calcula por esa vía horaria, así que 25.000 por 20 horas semanales no es un incumplimiento. La tercera, y es la más importante: el SMN es el piso del país entero y casi nunca es tu piso. Si tu actividad tiene Consejo de Salarios —y la mayor parte de la actividad privada lo tiene—, el mínimo real lo fija el laudo de tu grupo, subgrupo y categoría, y suele estar bastante por encima del mínimo nacional. Cobrar más que el SMN no prueba que te estén pagando bien.',
  },
  {
    question: '¿Y 9 horas de trabajo? ¿Se puede?',
    short: 'Nueve horas de presencia sí; nueve horas trabajadas no.',
    answer:
      'El tope de trabajo efectivo es de 8 horas por día. Una ventana de nueve horas —de 9 a 18, la más común de todas— es legal cuando la hora del medio es descanso intermedio que no se computa: eso es la jornada discontinua, cuyo corte va de 2 a 2 horas y media y sólo puede reducirse a una hora si están de acuerdo trabajador y empleador y media comunicación a la Inspección General del Trabajo. Con ese corte trabajás 8 y estás dentro de la ley. Ahora, si el corte es de media hora, la cosa cambia y en contra de la intuición: en la jornada continua esa media hora se computa como trabajo efectivo, así que la misma ventana de nueve horas son 8 horas y media TRABAJADAS, y esa media hora diaria es hora extra con 100 % de recargo. El corte corto se paga y el largo no: es asimétrico y es donde se pierde plata sin darse cuenta. Un corte declarado de 45 minutos no encaja en ninguna de las dos figuras y conviene preguntarlo por escrito.',
  },
  {
    question:
      'Trabajo 42,5 horas por semana. Estoy por debajo de 44, ¿entonces no hay horas extra?',
    short: 'Sí las hay. El tope diario corre por su cuenta y no se compensa con la semana.',
    answer:
      'Es el error de lectura más caro de esta página. La jornada tiene un doble límite: no más de 8 horas por día Y no más de 44 semanales en el comercio o 48 en la industria. Son dos topes autónomos, no un promedio. Si hacés 8 horas y media cinco días, tu semana da 42,5 —por debajo de las 44— y aun así generaste media hora extra por día, dos horas y media por semana, porque cada día pasaste el tope diario. La Ley 15.996 define la hora extra como la que excede «el límite horario aplicable», y el diario es uno de los aplicables. La misma ley pone un tope de 8 horas extra por semana que el empleador puede disponer, y sólo el Poder Ejecutivo puede autorizar excepciones.',
  },
  {
    question: '¿Cuánto me queda en la mano de 25.000 o de 30.000?',
    short: 'Alrededor de un 19,6 % menos: $ 20.100 y $ 24.120 respectivamente.',
    answer:
      'En esta banda el IRPF da cero, así que el descuento es todo aportes personales: 15 % de jubilatorio, FONASA según tu situación familiar y 0,1 % de Fondo de Reconversión Laboral. Para una persona sola sin hijos son 19,6 puntos. Un nominal de 25.000 deja $ 20.100 líquidos; 30.000 deja $ 24.120; y el Salario Mínimo Nacional completo, $ 25.383, deja $ 20.408. Ese último número es el que conviene mirar de cerca, porque es el que se compara con el alquiler.',
  },
  {
    question: 'Entonces, ¿cómo hace la gente para vivir con eso?',
    short: 'Mayoritariamente, no lo hace sola: ese sueldo es medio ingreso de un hogar.',
    answer:
      'Hay que decirlo con los números y sin épica. El alquiler promedio de los contratos NUEVOS en Montevideo, según el INE, ronda los $ 23.800 por mes. El líquido del Salario Mínimo Nacional completo es $ 20.408. La cuenta no cierra: el sueldo entero no paga el alquiler promedio, y todavía falta comer. El INE publica además la línea de pobreza por hogar, y para un hogar de una persona inquilina en Montevideo está por encima de ese líquido. O sea que la respuesta a la pregunta no es un truco de administración doméstica: con ese sueldo, solo y alquilando en Montevideo, no se vive. Lo que sí ocurre, y es lo que se ve todos los días, es alguna de estas tres: el hogar tiene un segundo ingreso; la persona no paga alquiler, casi siempre porque sigue en casa de la familia —y ahí la línea de pobreza aplicable es mucho más baja y el sueldo sí la supera—; o vive en el interior, donde tanto el alquiler como la línea son menores. Vale como referencia que la mediana del ingreso per cápita del país está bastante por encima de ese líquido: no es que el país entero gane esto, es que esta banda existe y es visible.',
  },
  {
    question: 'Si el sueldo no alcanza, ¿puedo tener otro trabajo?',
    short: 'Sí, pero el límite práctico no es la ley: es el descanso semanal.',
    answer:
      'Tener más de un empleo no está prohibido y los topes de jornada se miden por empleador, así que dos vínculos de media jornada no infringen nada. El que no se puede pisar es el descanso semanal: en el comercio son 36 horas consecutivas y en la industria un día después de seis de trabajo. Con una ventana de nueve horas de lunes a viernes, más el traslado, lo que queda disponible no da para un segundo empleo de jornada completa; da para trabajo por hora, fines de semana o changas. Conviene además revisar si tu contrato tiene cláusula de exclusividad o de no competencia, que es una obligación contractual y no legal, pero existe y se aplica.',
  },
  {
    question: '¿Y estudiar? ¿Tengo derecho a algo?',
    short: 'Sí: licencia por estudio paga, de 6 a 12 días al año según tus horas.',
    answer:
      'La Ley 18.345, con la redacción de la Ley 18.458, da licencia por estudio a los trabajadores de la actividad privada: como mínimo 6 días anuales si trabajás hasta 36 horas semanales, 9 días si hacés más de 36 y menos de 48, y 12 días con 48 horas semanales. Hace falta más de seis meses de antigüedad en la empresa. Se toma fraccionada, hasta 3 días por vez incluyendo el día del examen, prueba de revisión o evaluación, y se justifica con certificado del instituto donde cursás. Es un mínimo legal: el laudo de tu sector puede darte más días, así que conviene mirarlo antes de asumir que son seis.',
  },
  {
    question: '¿De verdad la mayoría de los avisos pide nueve horas, o me tocó a mí?',
    short: 'En el relevamiento propio, nueve horas fue la ventana más declarada de todas.',
    answer:
      'Se leyeron 150 avisos de Montevideo de un portal de empleo en un día. Sesenta y nueve declaraban una franja horaria concreta, y de ésos 36 —algo más de la mitad— declaraban una ventana de nueve horas o más, con 30 avisos en nueve horas exactas contra 17 en ocho. O sea que la ventana de nueve es la más frecuente, por encima de la de ocho. Es una foto de un día, un portal y una ciudad, y así hay que leerla: no mide el mercado laboral del país. Pero alcanza para contestar la pregunta que importaba, que era si la impresión de quien recibe las llamadas es un sesgo suyo. No lo es.',
  },
  {
    question: '¿Por qué tan pocos avisos dicen el sueldo?',
    short: 'De 498 avisos, sólo 68 publicaron un número que sirva: 1 de cada 7.',
    answer:
      'En el mismo relevamiento, 119 de 498 avisos traían un salario mensual. Pero al mirarlos apareció algo que obliga a limpiar la muestra: 51 de esos 119 declaran $ 111.111 o $ 111.110. No es un sueldo, es un relleno para completar un campo obligatorio, y lo usan nueve empresas distintas de la muestra; aparece en puestos donde el número es evidentemente imposible. Descontado eso quedan 68 avisos con un monto legible, o sea el 13,7 % del total. Entre ésos la mediana es $ 38.000 y el primer cuartil $ 31.369. Conviene ser prudente con esa mediana: publicar el sueldo es una herramienta de reclutamiento, así que los avisos que lo muestran no son una muestra al azar de los que existen. Es razonable que la banda de 25.000 a 30.000 esté sobrerrepresentada entre los que NO lo dicen, y ése es justamente el motivo por el que uno se entera recién en la llamada.',
  },
  {
    question: 'Me ofrecen un fijo bajo «más comisiones». ¿Eso arregla el mínimo?',
    short: 'No. El piso se mide contra lo que la empresa se obliga a pagar.',
    answer:
      'En el relevamiento, diez de los avisos con sueldo declarado ofrecen un fijo más comisiones, y varios de los fijos más bajos son de ese tipo. La comisión es variable y depende de resultados; el mínimo, en cambio, es una obligación de piso. Un fijo por debajo del mínimo no se convierte en legal porque exista la posibilidad de ganar más. Si te ofrecen un esquema así, las preguntas concretas son: cuál es el fijo garantizado, cómo se calcula exactamente la comisión, cuándo se liquida, y qué pasa en un mes malo. Y lo mismo que con las horas: por escrito.',
  },
])

export interface LowWageSource {
  label: string
  url: string
}

export const LOWWAGE_SOURCES: readonly LowWageSource[] = Object.freeze([
  {
    label: 'IMPO — Decreto 319/025 (fija el Salario Mínimo Nacional 2026 y sus divisores)',
    url: 'https://www.impo.com.uy/bases/decretos/319-2025',
  },
  {
    label: 'MTSS — Salario Mínimo Nacional desde el 1.º de enero de 2026',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/comunicacion/noticias/salario-minimo-nacional-24572-desde-1o-enero-2026',
  },
  {
    label: 'MTSS — Horario de trabajo (8 horas diarias; 44 en el comercio, 48 en la industria)',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/institucional/derecho-laboral-uruguayo/horario-trabajo',
  },
  {
    label: 'MTSS — Descansos intermedios (la media hora que se computa como trabajo efectivo)',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/derecho-reglamentacion-laboral/derecho-laboral-uruguayo/descansos-intermedios',
  },
  {
    label: 'MTSS — Descanso semanal (24 horas en la industria, 36 consecutivas en el comercio)',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/institucional/derecho-laboral-uruguayo/descanso-semanal',
  },
  {
    label: 'IMPO — Ley 5.350 (jornada de ocho horas)',
    url: 'https://www.impo.com.uy/bases/leyes/5350-1915',
  },
  {
    label: 'IMPO — Decreto-Ley 14.320 (régimen del comercio, 44 horas semanales)',
    url: 'https://www.impo.com.uy/bases/decretos-ley/14320-1974',
  },
  {
    label: 'IMPO — Ley 15.996 (horas extra: 100 % y 150 % de recargo, tope de 8 semanales)',
    url: 'https://www.impo.com.uy/bases/leyes/15996-1988',
  },
  {
    label: 'IMPO — Ley 18.345 (licencia por estudio), con la redacción de la Ley 18.458',
    url: 'https://www.impo.com.uy/bases/leyes/18345-2008',
  },
  {
    label: 'MTSS — Consultas laborales y salariales vía web (gratis)',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/consultas-laborales-salariales-via-web',
  },
  {
    label: 'MTSS — Denuncias en la Inspección General del Trabajo',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/denuncias-laborales',
  },
  {
    label: 'INE — Estimación de la pobreza por el método del ingreso',
    url: 'https://www.gub.uy/instituto-nacional-estadistica/datos-y-estadisticas/estadisticas/estimacion-pobreza-metodo-ingreso',
  },
  {
    label: 'INE — Indicadores de Actividad Inmobiliaria: mercado de alquileres',
    url: 'https://www.gub.uy/instituto-nacional-estadistica/datos-y-estadisticas/estadisticas/series-historicas-indicadores-actividad-inmobiliaria-iai-alquileres',
  },
])

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades internas
// ─────────────────────────────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
