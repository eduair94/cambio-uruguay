// app/utils/licenciaParental.ts
// Datos de /licencia-por-maternidad-y-paternidad-uruguay: cuántos días de licencia paga cada uno,
// desde qué fecha rigen los números nuevos, y en qué días concretos cae la licencia maternal.
//
// POR QUÉ EXISTE: el sitio ya contesta «cuándo se cobra el aguinaldo» y «cuándo se cobra el salario
// vacacional», pero la partida que más gente busca en el peor momento para leer normativa —el mes
// antes de que nazca un hijo— no estaba escrita. Y tiene un problema propio: los números CAMBIARON.
// La Ley 20.312 subió la licencia por paternidad de forma escalonada y el último escalón entró en
// vigencia el 1.º de enero de 2026, así que casi todo lo que está publicado afuera sigue diciendo
// 13 o 14 días cuando hoy son 20. Un número desactualizado en esto no es un detalle: es la
// diferencia entre pedirle a la empresa una semana o dos.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA: ningún monto en pesos y ningún tope. El subsidio es el
// 100 % del promedio de las remuneraciones de la persona, así que el número sale de cada historia
// laboral y no hay una cifra publicable. Tampoco se publica el régimen de la actividad pública:
// cada organismo tiene su estatuto y esta página cubre lo que paga BPS.
//
// FUENTES PRIMARIAS, verificadas el 2026-08-29 (ver LICENCIA_PARENTAL_SOURCES para la lista):
//   - Ley 19.161 (2013), arts. 2, 8 y 12 a 14 — subsidios por maternidad, paternidad y cuidados.
//   - Ley 20.312 (2/8/2024) — sustituye el art. 8 de la Ley 19.161 y agrega el 8-BIS: es la que
//     lleva la licencia por paternidad a su valor actual con fecha de entrada en vigencia.
//   - Ley 20.000 — extensiones por prematurez, bajo peso, nacimiento múltiple o complejidad médica.
//   - BPS, «Subsidio por maternidad», «Subsidio por paternidad» y «Subsidio para cuidados del
//     recién nacido» — la lectura oficial vigente, con los días y la fórmula del monto.
//   - Sistema de Cuidados (gub.uy) — el resumen oficial de las licencias vigentes.

export interface LicenciaParentalSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo lo de este archivo contra las fuentes oficiales. */
export const LICENCIA_PARENTAL_VERIFIED_AT = '2026-08-29'

// ---------------------------------------------------------------------------
// Maternidad (Ley 19.161, art. 2)
// ---------------------------------------------------------------------------

/** Días de licencia ANTES de la fecha presunta de parto: seis semanas. */
export const MATERNIDAD_DIAS_PREPARTO = 42

/** Días de licencia DESPUÉS del parto: ocho semanas. */
export const MATERNIDAD_DIAS_POSPARTO = 56

/** El descanso mínimo: catorce semanas, que es la suma de los dos tramos. */
export const MATERNIDAD_DIAS_TOTAL = MATERNIDAD_DIAS_PREPARTO + MATERNIDAD_DIAS_POSPARTO

/** Semanas hasta las que puede extenderse en los casos del art. 2-BIS (Ley 20.000). */
export const MATERNIDAD_SEMANAS_MAX = 18

/** Semanas de gestación por debajo de las cuales el parto se considera prematuro a estos efectos. */
export const PREMATURO_SEMANAS_GESTACION = 33

/** Semana de embarazo a partir de la cual el prestador de salud ingresa la solicitud ante BPS. */
export const MATERNIDAD_SOLICITUD_DESDE_SEMANA = 32

// ---------------------------------------------------------------------------
// Paternidad (Ley 19.161 art. 8, en la redacción de la Ley 20.312)
// ---------------------------------------------------------------------------

/**
 * Fecha desde la que rige el último escalón de la Ley 20.312. Es el dato que envejece a casi todo
 * lo publicado afuera, y por eso está acá como constante y no como texto suelto en la página.
 */
export const PATERNIDAD_VIGENTE_DESDE = '2026-01-01'

/** Días a cargo de la empresa para el trabajador dependiente privado (Ley 18.345). */
export const PATERNIDAD_DIAS_EMPRESA = 3

/** Días que paga BPS al trabajador dependiente, a continuación de los tres de la empresa. */
export const PATERNIDAD_DIAS_BPS_DEPENDIENTE = 17

/** Días continuos de licencia por paternidad, iguales para dependientes y no dependientes. */
export const PATERNIDAD_DIAS_TOTAL = PATERNIDAD_DIAS_EMPRESA + PATERNIDAD_DIAS_BPS_DEPENDIENTE

/** Tope al que puede llegar el período en los casos especiales de la Ley 20.000. */
export const PATERNIDAD_DIAS_MAX = 30

export type TipoTrabajador = 'dependiente' | 'no-dependiente'

export interface DesglosePaternidad {
  readonly tipo: TipoTrabajador
  readonly label: string
  /** Días a cargo del empleador. Cero para quien no tiene empleador. */
  readonly empresa: number
  /** Días que paga BPS. */
  readonly bps: number
  /** El total de días continuos de licencia. */
  readonly total: number
  readonly detail: string
}

/**
 * Quién paga cuántos días de la licencia por paternidad, desde el 1.º de enero de 2026.
 *
 * El total es el MISMO para los dos casos —veinte días continuos que arrancan el día del parto— y
 * lo que cambia es de dónde sale la plata. Al dependiente privado los tres primeros días se los
 * paga la empresa por la Ley 18.345 y los diecisiete siguientes BPS; el no dependiente no tiene
 * empleador que ponga esos tres, así que BPS le cubre los veinte.
 *
 * Está escrito como función y no como tabla a mano justamente para que el total no pueda quedar
 * desalineado del desglose: el test verifica que empresa + bps sea siempre el total.
 */
export function diasDePaternidad(tipo: TipoTrabajador): DesglosePaternidad {
  const empresa = tipo === 'dependiente' ? PATERNIDAD_DIAS_EMPRESA : 0
  return {
    tipo,
    label: tipo === 'dependiente' ? 'Trabajador dependiente' : 'Trabajador no dependiente',
    empresa,
    bps: PATERNIDAD_DIAS_TOTAL - empresa,
    total: PATERNIDAD_DIAS_TOTAL,
    detail:
      tipo === 'dependiente'
        ? 'Veinte días continuos que empiezan el día del parto. Los tres primeros los paga la empresa por la Ley 18.345 y los diecisiete siguientes los paga BPS. Por eso el mes viene partido en dos liquidaciones y no es un error.'
        : 'Veinte días continuos desde el nacimiento, íntegramente a cargo de BPS: no hay empleador que ponga los tres días de la Ley 18.345, así que el subsidio cubre el período entero.',
  }
}

/** Las dos filas de la tabla de la página, derivadas de {@link diasDePaternidad}. */
export const PATERNIDAD_DESGLOSE: readonly DesglosePaternidad[] = Object.freeze(
  (['dependiente', 'no-dependiente'] as const).map(diasDePaternidad)
)

// ---------------------------------------------------------------------------
// Medio horario: subsidio parental para cuidados (Ley 19.161, arts. 12 a 14)
// ---------------------------------------------------------------------------

/** Edad del hijo, en meses, hasta la que se puede usar el medio horario. */
export const MEDIO_HORARIO_HASTA_MESES = 6

/** La misma edad cuando la licencia maternal se extendió por los casos de la Ley 20.000. */
export const MEDIO_HORARIO_HASTA_MESES_EXTENDIDO = 9

/** Tope diario de trabajo durante el medio horario. */
export const MEDIO_HORARIO_HORAS_MAX = 4

/** Porcentaje del jornal de liquidación que paga BPS por las horas no trabajadas. */
export const MEDIO_HORARIO_PORCENTAJE = 50

// ---------------------------------------------------------------------------
// Cómo sale el monto
// ---------------------------------------------------------------------------

/** Meses de remuneraciones que promedia BPS para el trabajador dependiente. */
export const PROMEDIO_MESES_DEPENDIENTE = 6

/** Meses de asignaciones computables que promedia BPS para el no dependiente. */
export const PROMEDIO_MESES_NO_DEPENDIENTE = 12

// ---------------------------------------------------------------------------
// El calendario
// ---------------------------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Lee una fecha `yyyy-mm-dd` en UTC, o devuelve null.
 *
 * El ida y vuelta contra `toISOString()` es lo que rechaza un 2026-02-30: `new Date` lo acepta y lo
 * corre al 2 de marzo en silencio, que en un calendario de licencia sería un error invisible.
 */
function parseISODate(iso: string): Date | null {
  if (!ISO_DATE.test(iso)) return null
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10) === iso ? date : null
}

function shiftDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * Suma meses de calendario recortando al último día del mes destino, que es como se cuenta una edad
 * en meses: el 31 de agosto más seis meses es el 28 (o 29) de febrero, no el 3 de marzo.
 */
function shiftMonths(iso: string, months: number): string {
  const date = new Date(`${iso}T00:00:00Z`)
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(day, lastDay))
  return date.toISOString().slice(0, 10)
}

export interface CalendarioMaternidad {
  /** Primer día de licencia: 42 días antes de la fecha presunta de parto. */
  readonly inicioPreparto: string
  /** La fecha presunta que ingresó la persona. */
  readonly fechaPresunta: string
  /** Último día de licencia si el parto ocurre en la fecha presunta. */
  readonly finPosparto: string
  /** Último día del medio horario si se usa entero: los seis meses del bebé. */
  readonly finMedioHorario: string
  readonly diasPreparto: number
  readonly diasPosparto: number
  readonly diasTotal: number
}

/**
 * Las fechas de la licencia maternal a partir de la fecha presunta de parto.
 *
 * Es una PROYECCIÓN, no una liquidación: el tramo de preparto se cuenta hacia atrás desde la fecha
 * presunta, pero los 56 días de posparto corren desde el parto REAL. Si el bebé se adelanta o se
 * atrasa, el final se mueve con él —y por eso la página lo dice al lado del resultado en vez de
 * presentar el último día como si fuera un dato firme.
 *
 * Devuelve null si la fecha no es un `yyyy-mm-dd` real, para que la página no muestre «Invalid Date».
 */
export function calendarioMaternidad(fechaPresuntaISO: string): CalendarioMaternidad | null {
  if (!parseISODate(fechaPresuntaISO)) return null
  return {
    inicioPreparto: shiftDays(fechaPresuntaISO, -MATERNIDAD_DIAS_PREPARTO),
    fechaPresunta: fechaPresuntaISO,
    // El día del parto se cuenta UNA vez, como primer día del posparto. Es lo que hace que el
    // tramo completo mida exactamente los 98 días que publica BPS (42 + 56) y no 99: si el
    // preparto termina la víspera y el posparto empieza al día siguiente, el día del parto queda
    // sin contar en ningún lado y la cuenta deja de cerrar.
    finPosparto: shiftDays(fechaPresuntaISO, MATERNIDAD_DIAS_POSPARTO - 1),
    finMedioHorario: shiftMonths(fechaPresuntaISO, MEDIO_HORARIO_HASTA_MESES),
    diasPreparto: MATERNIDAD_DIAS_PREPARTO,
    diasPosparto: MATERNIDAD_DIAS_POSPARTO,
    diasTotal: MATERNIDAD_DIAS_TOTAL,
  }
}

// ---------------------------------------------------------------------------
// Casos especiales
// ---------------------------------------------------------------------------

export interface CasoEspecial {
  readonly key: 'prematuro' | 'multiple' | 'bajo-peso' | 'complejidad'
  readonly label: string
  readonly efecto: string
  readonly source: string
}

export const LICENCIA_PARENTAL_CASOS: readonly CasoEspecial[] = [
  {
    key: 'prematuro',
    label: `Parto prematuro (hasta las ${PREMATURO_SEMANAS_GESTACION} semanas de gestación)`,
    efecto: `La licencia no arranca antes: empieza el día del parto y se prolonga hasta completar las ${MATERNIDAD_SEMANAS_MAX} semanas. Los días de preparto que no se llegaron a usar no se pierden, se corren para adelante.`,
    source: 'BPS — Subsidio por maternidad',
  },
  {
    key: 'multiple',
    label: 'Nacimiento múltiple',
    efecto: `El período puede extenderse hasta las ${MATERNIDAD_SEMANAS_MAX} semanas, y del lado paterno hasta ${PATERNIDAD_DIAS_MAX} días continuos.`,
    source: 'Ley 20.000',
  },
  {
    key: 'bajo-peso',
    label: 'Bajo peso al nacer (1,5 kg o menos)',
    efecto: `Misma extensión: hasta ${MATERNIDAD_SEMANAS_MAX} semanas de licencia maternal, y el medio horario puede correr hasta los ${MEDIO_HORARIO_HASTA_MESES_EXTENDIDO} meses del bebé en vez de los ${MEDIO_HORARIO_HASTA_MESES}.`,
    source: 'Ley 20.000 · Ley 19.161, art. 2-BIS',
  },
  {
    key: 'complejidad',
    label: 'Complejidad médica de la madre o del recién nacido',
    efecto: `Con indicación médica el período se extiende, y la licencia por paternidad puede llegar a ${PATERNIDAD_DIAS_MAX} días continuos.`,
    source: 'BPS — Subsidio por paternidad · Ley 20.000',
  },
]

// ---------------------------------------------------------------------------
// Preguntas y fuentes
// ---------------------------------------------------------------------------

export interface LicenciaParentalFaq {
  readonly question: string
  readonly short: string
  readonly answer: string
}

export const LICENCIA_PARENTAL_FAQ: readonly LicenciaParentalFaq[] = [
  {
    question: '¿Cuántos días de licencia por paternidad hay en Uruguay en 2026?',
    short: '20 días corridos, desde el 1.º de enero de 2026',
    answer:
      'Veinte días continuos, que empiezan el día del parto. Para el trabajador dependiente los tres primeros los paga la empresa (Ley 18.345) y los diecisiete siguientes los paga el BPS; para el no dependiente los veinte los paga el BPS. Ese número es nuevo: la Ley 20.312 subió la licencia de forma escalonada y el último escalón entró en vigencia el 1.º de enero de 2026, así que buena parte de lo que sigue publicado afuera todavía dice trece o catorce días.',
  },
  {
    question: '¿Cuánto dura la licencia por maternidad?',
    short: '98 días: 42 antes del parto y 56 después',
    answer:
      'Catorce semanas, o noventa y ocho días: seis semanas (42 días) antes de la fecha presunta de parto y ocho semanas (56 días) después del parto. Es un descanso mínimo, no un máximo, y en los casos de la Ley 20.000 —nacimiento múltiple, bajo peso, complejidad médica— puede extenderse hasta las dieciocho semanas.',
  },
  {
    question: '¿Cuánto me van a pagar de subsidio?',
    short:
      'El 100 % del promedio de los últimos 6 meses, más la cuota parte de licencia, aguinaldo y salario vacacional',
    answer:
      'El subsidio equivale al 100 % del promedio diario o mensual de las remuneraciones de los seis meses anteriores, más la cuota parte de licencia, aguinaldo y salario vacacional generada durante el período de amparo. Para empresarios unipersonales el promedio se toma sobre los últimos doce meses de asignaciones computables. Esta página no publica un monto porque el número sale de tu propia historia laboral: si tuviste meses con horas extra o comisiones que no se repitieron, el promedio de seis meses no va a coincidir con tu último recibo.',
  },
  {
    question: '¿Puedo guardar los días de preparto para después del parto?',
    short: 'No en general, pero el parto prematuro los corre solo',
    answer:
      'El régimen del artículo 2 de la Ley 19.161 es cesar todo trabajo seis semanas antes de la fecha presunta y no reiniciarlo hasta ocho semanas después del parto. Hay un caso en el que los días se corren solos: si el parto es prematuro —hasta las treinta y tres semanas de gestación— la licencia empieza el día del parto y se prolonga hasta completar las dieciocho semanas, así que el tramo de preparto que no se usó no se pierde.',
  },
  {
    question: '¿Qué es el medio horario por cuidados y hasta cuándo dura?',
    short: 'Media jornada, tope 4 horas, hasta los 6 meses del bebé',
    answer:
      'Es el subsidio parental para cuidados: al terminar la licencia maternal se puede volver a trabajar media jornada, y el BPS paga las horas que no se trabajan. En cada empresa la jornada no puede exceder la mitad del horario habitual ni las cuatro horas diarias. Corre hasta que el hijo cumple seis meses —nueve si la licencia se extendió por los casos de la Ley 20.000— y no hasta el año, que es la confusión más común. Lo pueden alternar madre y padre.',
  },
  {
    question: '¿Cuánto paga el BPS por el medio horario?',
    short: 'El 50 % del jornal con el que se liquidó la licencia',
    answer:
      'El monto es el 50 % del jornal de liquidación del subsidio por maternidad o de la licencia por paternidad, multiplicado por la cantidad de días que se van a gozar. Es decir: se cobra medio sueldo de la empresa por las horas trabajadas y el BPS pone la otra mitad por las que no.',
  },
  {
    question: '¿Cuándo se pide el subsidio por maternidad?',
    short: 'Lo ingresa el prestador de salud desde la semana 32',
    answer:
      'La solicitud la ingresa el prestador de salud a partir de las treinta y dos semanas de embarazo, y el subsidio rige desde el día en que empieza la licencia. Conviene confirmar con la mutualista o ASSE que el trámite quedó efectivamente ingresado, porque el que lo inicia no es el trabajador.',
  },
  {
    question: '¿Esto vale también para quien trabaja por su cuenta?',
    short: 'Sí, si aporta: los mismos 20 días y las mismas 14 semanas',
    answer:
      'Sí. El BPS ampara a trabajadoras y trabajadores no dependientes y a cónyuges colaboradores de Industria y Comercio con hasta un dependiente, además de los dependientes de la actividad privada. Los días son los mismos; lo que cambia es quién los paga —en el no dependiente, los veinte de paternidad salen íntegramente del BPS— y el promedio con el que se calcula el monto, que se toma sobre los últimos doce meses.',
  },
]

export const LICENCIA_PARENTAL_SOURCES: readonly LicenciaParentalSource[] = [
  {
    label:
      'Ley 19.161 (2013), arts. 2, 8 y 12 a 14 — subsidio por maternidad (seis semanas antes y ocho después del parto), subsidio por paternidad y subsidio parental para cuidados con tope de media jornada y cuatro horas diarias',
    url: 'https://www.impo.com.uy/bases/leyes/19161-2013',
  },
  {
    label:
      'Ley 20.312 (2/8/2024) — sustituye el art. 8 de la Ley 19.161 y agrega el 8-BIS: es la norma que lleva la licencia por paternidad a su valor actual, con entrada en vigencia el 1.º de enero de 2026',
    url: 'https://www.impo.com.uy/bases/leyes/20312-2024',
  },
  {
    label:
      'BPS — «Subsidio por paternidad»: veinte días continuos desde el parto, los tres primeros a cargo de la empresa y los diecisiete siguientes a cargo del BPS, y hasta treinta en los casos de la Ley 20.000',
    url: 'https://www.bps.gub.uy/8958/subsidio-por-paternidad.html',
  },
  {
    label:
      'BPS — «Subsidio por maternidad»: 42 días de preparto y 56 de posparto, extensión a 18 semanas en parto prematuro, y el 100 % del promedio de los seis meses anteriores más la cuota parte de licencia, aguinaldo y salario vacacional',
    url: 'https://www.bps.gub.uy/4804/subsidio-por-maternidad.html',
  },
  {
    label:
      'BPS — «Subsidio para cuidados del recién nacido»: medio horario hasta los seis meses del hijo (nueve con extensión), tope de cuatro horas diarias y 50 % del jornal de liquidación',
    url: 'https://www.bps.gub.uy/8959/subsidio-para-cuidados-del-recien-nacido.html',
  },
  {
    label:
      'Sistema de Cuidados (gub.uy) — «Licencias por maternidad, paternidad, adopción y cuidados en la actividad pública y privada»: el resumen oficial de los veinte días vigentes desde 2026 y de las catorce semanas de licencia maternal',
    url: 'https://www.gub.uy/sistema-cuidados/comunicacion/comunicados/licencias-maternidad-paternidad-adopcion-cuidados-actividad-publica',
  },
]
