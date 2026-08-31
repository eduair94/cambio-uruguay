// app/utils/renuncia.ts
// Datos de /renunciar-al-trabajo-uruguay: qué cobra —y qué no— quien se va del trabajo por decisión
// propia, cómo se calcula cada partida, cuándo es exigible la liquidación y qué pasa si no la pagan.
//
// POR QUÉ EXISTE: la familia laboral del sitio ya cuenta el lado del empleador (indemnización por
// despido, seguro de paro) y las partidas del recibo por separado (aguinaldo, salario vacacional,
// licencia). El lado del trabajador que se va por su cuenta no estaba escrito en ninguna página, y
// es la mitad de los egresos. La pregunta que se hace quien renuncia es siempre la misma y tiene
// tres partes: qué me tienen que pagar, cuándo, y qué hago si no me pagan. Las tres tienen respuesta
// oficial y ninguna estaba publicada acá.
//
// EL ERROR QUE ESTA PÁGINA CORRIGE: «si renuncio no cobro nada». Se cobra, y no es poco —la licencia
// no gozada, su salario vacacional y el aguinaldo generado—; lo único que no se cobra es la
// indemnización por despido, porque la indemnización cubre el despido, que lo decide el empleador.
// El segundo error es creer que la empresa tiene todo el tiempo del mundo para liquidar: el MTSS
// resuelve el silencio de la norma laboral remitiendo al art. 1440 del Código Civil (exigible a los
// diez días) y el art. 29 de la Ley 18.572 le pone un recargo automático del 10 % encima.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA (ver RENUNCIA_NO_PUBLICADO):
//   - Ningún plazo de preaviso del trabajador que renuncia. No se encontró una norma general vigente
//     que lo fije, y un número inventado acá le costaría el trabajo a alguien. Lo que se dice es
//     dónde mirar: el laudo del Consejo de Salarios del grupo y el contrato individual.
//   - Ningún monto ni plazo del despido indirecto. La figura existe y se nombra, pero su contenido
//     es doctrina y jurisprudencia, no un texto legal citable: se deriva a la consulta gratuita del
//     MTSS en vez de publicar una cifra.
//   - Ningún importe en pesos. Todas las funciones de este archivo toman el sueldo de quien consulta
//     y devuelven su propio número; no hay una tabla de valores que salga desactualizada.
//
// FUENTES PRIMARIAS, verificadas el 2026-08-31 (lista completa en RENUNCIA_SOURCES):
//   - MTSS, «En materia laboral» (preguntas frecuentes) — qué debe abonar la empresa cuando el
//     vínculo termina por decisión del trabajador, y el plazo de pago de la liquidación.
//   - MTSS, «Despido (régimen común)» y «Método de cálculo» — la indemnización cubre el despido, y
//     los divisores con que se liquidan el aguinaldo y la licencia.
//   - Ley 18.572 (2009), art. 29 — el recargo automático del 10 % por créditos laborales impagos.

export interface RenunciaSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo lo de este archivo contra las fuentes oficiales. */
export const RENUNCIA_VERIFIED_AT = '2026-08-31'

// ---------------------------------------------------------------------------
// El plazo, y el recargo que corre cuando se vence
// ---------------------------------------------------------------------------

/**
 * Días corridos tras el cese a partir de los cuales la liquidación es exigible.
 *
 * No sale de una norma laboral: no hay ninguna que fije el plazo. El MTSS resuelve el silencio
 * remitiendo al art. 1440 del Código Civil, que hace exigible «10 días después de la fecha» la
 * obligación sin plazo estipulado. Es la lectura oficial del ministerio, y así se publica.
 */
export const PLAZO_EXIGIBILIDAD_DIAS = 10

/**
 * Recargo sobre el crédito adeudado, en tanto por uno (Ley 18.572, art. 29).
 *
 * «La omisión de pago de los créditos laborales generará automáticamente, desde su exigibilidad, un
 * recargo del 10% sobre el monto del crédito adeudado». Automáticamente: no hay que pedirlo ni
 * probar culpa, corre desde que la deuda se hizo exigible.
 */
export const RECARGO_POR_MORA = 0.1

/**
 * Fecha a partir de la cual la liquidación es exigible: el cese más
 * {@link PLAZO_EXIGIBILIDAD_DIAS} días CORRIDOS.
 *
 * Corridos y no hábiles porque así los cuenta el art. 1440 del Código Civil, que es de donde el MTSS
 * toma el plazo. Devuelve una fecha nueva; no muta la que recibe.
 */
export function exigibleDesde(cese: Date): Date {
  const fecha = new Date(cese.getTime())
  fecha.setDate(fecha.getDate() + PLAZO_EXIGIBILIDAD_DIAS)
  return fecha
}

/**
 * Si a la fecha `hoy` la liquidación de un cese ocurrido en `cese` ya está en mora.
 *
 * El día exacto en que vence el plazo todavía NO es mora: el art. 1440 hace la obligación exigible
 * ese día, y recién incumplirla la pone en mora. Estrictamente posterior, entonces.
 */
export function enMora(cese: Date, hoy: Date): boolean {
  return hoy.getTime() > exigibleDesde(cese).getTime()
}

/**
 * El recargo del art. 29 sobre un monto adeudado. Un monto no positivo o no numérico no genera
 * recargo: es una deuda que no existe.
 */
export function recargoPorMora(montoAdeudado: number): number {
  if (!Number.isFinite(montoAdeudado) || montoAdeudado <= 0) return 0
  return montoAdeudado * RECARGO_POR_MORA
}

// ---------------------------------------------------------------------------
// Las partidas, con los divisores que publica el MTSS
// ---------------------------------------------------------------------------

/** Divisor del aguinaldo: «sueldo mensual dividido 12» por cada mes generado (MTSS). */
export const AGUINALDO_DIVISOR = 12

/** Divisor para llevar el sueldo mensual a valor día: «sueldo mensual dividido 30» (MTSS). */
export const JORNAL_DIVISOR = 30

/** Días de licencia que se generan por mes trabajado cuando corresponden 20 días al año (MTSS). */
export const LICENCIA_DIAS_POR_MES_20 = 1.66

/** Días por mes cuando corresponden 21, es decir con el día complementario por antigüedad (MTSS). */
export const LICENCIA_DIAS_POR_MES_21 = 1.75

/**
 * Aguinaldo generado y no cobrado al momento del cese.
 *
 * El MTSS lo liquida como una alícuota mensual —«sueldo mensual dividido 12»— así que el generado es
 * esa alícuota por los meses corridos del período de aguinaldo en curso. Qué período está en curso
 * lo cuenta /cuando-se-cobra-el-aguinaldo-uruguay; acá sólo se multiplica.
 *
 * Entradas negativas o no numéricas se leen como cero: no se puede deber un aguinaldo negativo.
 */
export function aguinaldoGenerado(sueldoMensual: number, mesesDelPeriodo: number): number {
  const sueldo = Number.isFinite(sueldoMensual) ? Math.max(0, sueldoMensual) : 0
  const meses = Number.isFinite(mesesDelPeriodo) ? Math.max(0, mesesDelPeriodo) : 0
  return (sueldo / AGUINALDO_DIVISOR) * meses
}

/**
 * Días de licencia generados y no gozados al cese.
 *
 * `conDiaComplementario` distingue los dos escalones que publica el MTSS: 1,66 días por mes cuando
 * se generan 20 días al año, 1,75 cuando se generan 21 por antigüedad. Quién tiene derecho al día
 * complementario lo resuelve /salario-vacacional-uruguay (Ley 12.590, art. 2).
 */
export function diasDeLicenciaGenerados(
  mesesTrabajados: number,
  conDiaComplementario = false
): number {
  const meses = Number.isFinite(mesesTrabajados) ? Math.max(0, mesesTrabajados) : 0
  return meses * (conDiaComplementario ? LICENCIA_DIAS_POR_MES_21 : LICENCIA_DIAS_POR_MES_20)
}

/**
 * Importe de la licencia no gozada: el sueldo llevado a valor día por el divisor 30, multiplicado
 * por los días generados.
 *
 * Es exactamente la fórmula del MTSS («sueldo mensual dividido 30, multiplicado por 1,66… o por
 * 1,75»), escrita en dos pasos para que los días queden a la vista: son el número que hay que
 * discutir si la liquidación no cierra.
 */
export function licenciaNoGozadaImporte(
  sueldoMensual: number,
  mesesTrabajados: number,
  conDiaComplementario = false
): number {
  const sueldo = Number.isFinite(sueldoMensual) ? Math.max(0, sueldoMensual) : 0
  return (sueldo / JORNAL_DIVISOR) * diasDeLicenciaGenerados(mesesTrabajados, conDiaComplementario)
}

// ---------------------------------------------------------------------------
// Qué se cobra y qué no
// ---------------------------------------------------------------------------

export interface RenunciaPartida {
  readonly key: string
  readonly label: string
  /** `true` si la partida se cobra al renunciar; `false` si no corresponde. */
  readonly corresponde: boolean
  /** Cómo se calcula, o por qué no corresponde. */
  readonly detail: string
  /** La fuente oficial que lo respalda, en texto corto. */
  readonly source: string
}

/**
 * Las cuatro partidas del egreso, en el orden en que aparecen en una liquidación.
 *
 * La única que cambia de signo entre renuncia y despido es la indemnización, y es justamente la que
 * hace creer que renunciar no paga nada. Por eso va last: primero lo que sí se cobra.
 */
export const RENUNCIA_PARTIDAS: readonly RenunciaPartida[] = [
  {
    key: 'licencia',
    label: 'Licencia generada y no gozada',
    corresponde: true,
    detail:
      'Los días de licencia que generaste desde el último período y no llegaste a tomarte se pagan en dinero. El MTSS los liquida sobre el sueldo mensual dividido 30, multiplicado por 1,66 días por mes trabajado si te corresponden 20 días al año, o por 1,75 si ya generás 21 por antigüedad.',
    source: 'MTSS, «Método de cálculo»',
  },
  {
    key: 'salario-vacacional',
    label: 'Salario vacacional proporcional',
    corresponde: true,
    detail:
      'La suma para el mejor goce de la licencia acompaña a esos días de licencia no gozada, en la misma proporción. Es la partida que más se olvida, porque quien se va no se está yendo de vacaciones y nadie la asocia con el egreso.',
    source: 'MTSS, «En materia laboral»',
  },
  {
    key: 'aguinaldo',
    label: 'Aguinaldo generado',
    corresponde: true,
    detail:
      'La parte del aguinaldo que corriste dentro del período en curso, sin esperar a junio ni a diciembre. Se liquida como sueldo mensual dividido 12 por cada mes del período, así que irse en mayo o en noviembre no lo hace perder: lo hace proporcional.',
    source: 'MTSS, «Método de cálculo»',
  },
  {
    key: 'indemnizacion',
    label: 'Indemnización por despido',
    corresponde: false,
    detail:
      'Esta no. La indemnización cubre el despido, que es una decisión del empleador; si el vínculo termina porque te vas vos, no se genera. Es la única partida que se pierde al renunciar, y confundirla con toda la liquidación es lo que hace creer que renunciar no paga nada.',
    source: 'MTSS, «Despido (régimen común)» y «En materia laboral»',
  },
]

// ---------------------------------------------------------------------------
// Lo que esta página deliberadamente NO afirma
// ---------------------------------------------------------------------------

export interface RenunciaOmision {
  readonly key: string
  readonly label: string
  /** Por qué no se publica un número, y qué se publica en su lugar. */
  readonly detail: string
}

/**
 * Los dos huecos honestos.
 *
 * Están escritos en la página, no escondidos: quien busca «cuántos días de preaviso tengo que dar»
 * merece saber que no encontramos una norma general que lo fije, en vez de llevarse un número que
 * alguien copió de otro país.
 */
export const RENUNCIA_NO_PUBLICADO: readonly RenunciaOmision[] = [
  {
    key: 'preaviso',
    label: 'Cuántos días de preaviso tenés que dar',
    detail:
      'No publicamos un número. No encontramos una norma general vigente que le fije al trabajador de la actividad privada un plazo de preaviso para renunciar, y las cifras que circulan (quince días, un mes) vienen de contratos, de laudos de un grupo concreto o directamente de la legislación de otro país. Dónde mirar sí lo podemos decir: el laudo del Consejo de Salarios de tu grupo y subgrupo, y tu contrato individual. Si ninguno de los dos dice nada, no hay plazo que aplicarte.',
  },
  {
    key: 'despido-indirecto',
    label: 'Cuánto se cobra por despido indirecto',
    detail:
      'Tampoco publicamos un monto. La figura existe: si te fuiste porque el empleador incumplió gravemente, el reclamo puede tramitarse como un despido y no como una renuncia. Pero su contenido y sus requisitos son doctrina y jurisprudencia, no un artículo que podamos citar, y depende entero de los hechos de cada caso. Para eso está la consulta laboral gratuita del MTSS, que la atiende un profesional y puede incluir la liquidación de tus rubros.',
  },
]

// ---------------------------------------------------------------------------
// Preguntas frecuentes
// ---------------------------------------------------------------------------

export interface RenunciaFaq {
  readonly q: string
  readonly a: string
}

export const RENUNCIA_FAQ: readonly RenunciaFaq[] = [
  {
    q: 'Si renuncio, ¿cobro algo?',
    a: 'Sí, y conviene ver de dónde sale. La frase más clara del MTSS está contestando por el abandono del trabajo: dice que «la empresa lo único que debe abonar es la licencia no gozada, el salario vacacional y el aguinaldo generado, y no corresponde la indemnización por despido». Vale igual para la renuncia, porque lo que la indemnización cubre es el despido —una decisión del empleador— y esas tres partidas son las que ya venías generando. El mismo MTSS habla de «liquidación por despido o renuncia» al fijar el plazo de pago. O sea: se pierde una partida de las cuatro, no la liquidación entera.',
  },
  {
    q: '¿En cuánto tiempo me tienen que pagar la liquidación?',
    a: 'No hay un plazo escrito en ninguna norma laboral, y esa es la respuesta honesta. El MTSS resuelve el vacío remitiendo al artículo 1440 del Código Civil: la obligación sin plazo estipulado «será exigible 10 días después de la fecha», contados corridos. Antes de esos diez días no podés reclamar mora; pasados, sí.',
  },
  {
    q: 'Se venció el plazo y no me pagaron. ¿Qué gano esperando?',
    a: 'Un 10 % más, que corre solo. El artículo 29 de la Ley 18.572 dispone que «la omisión de pago de los créditos laborales generará automáticamente, desde su exigibilidad, un recargo del 10% sobre el monto del crédito adeudado». Automáticamente quiere decir que no hay que pedirlo ni probar mala fe: se suma por el solo hecho de no haber pagado a tiempo.',
  },
  {
    q: '¿Cómo sé si el número que me liquidaron está bien?',
    a: 'Pedí el detalle por rubro y revisá los divisores, que son públicos. El aguinaldo va por sueldo mensual dividido 12 por cada mes del período en curso. La licencia va por sueldo mensual dividido 30, multiplicado por 1,66 días por mes trabajado —o por 1,75 si ya generás 21 días de licencia por antigüedad—. Si en la liquidación no aparece el salario vacacional proporcional, ahí suele estar la diferencia.',
  },
  {
    q: '¿El salario vacacional entra en la base de las alícuotas?',
    a: 'Es el punto discutido, y conviene saberlo antes de firmar. El MTSS señala que por un decreto del año 2000 «el salario vacacional no debería incluirse como alícuota por no tener naturaleza salarial», pero aclara en la misma página que «la doctrina y jurisprudencia mayoritaria entienden que el salario vacacional tiene naturaleza salarial, motivo por el cual correspondería incluirse». No es un número que podamos cerrar acá: es un criterio en disputa, y saber que lo está ya te cambia la conversación.',
  },
  {
    q: '¿Puedo cobrar seguro de paro si renuncié?',
    a: 'El subsidio por desempleo del BPS cubre el despido, la suspensión y la reducción de trabajo, no la salida voluntaria. Los requisitos y las causales están en la página del BPS y en la nuestra sobre seguro de paro; si tu salida fue por un incumplimiento del empleador y no una renuncia común, es exactamente el caso que conviene consultar antes de firmar nada.',
  },
]

// ---------------------------------------------------------------------------
// Fuentes
// ---------------------------------------------------------------------------

export const RENUNCIA_SOURCES: readonly RenunciaSource[] = [
  {
    label:
      'MTSS — «En materia laboral» (preguntas frecuentes): qué debe abonar la empresa cuando el vínculo termina por decisión del trabajador —la respuesta está bajo la pregunta por el abandono del trabajo: licencia no gozada, salario vacacional y aguinaldo generado, sin indemnización por despido— y el plazo de pago de la «liquidación por despido o renuncia», que remite al art. 1440 del Código Civil',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/institucional/preguntas-frecuentes/materia-laboral',
  },
  {
    label:
      'MTSS — «Método de cálculo»: aguinaldo por sueldo mensual dividido 12; licencia por sueldo mensual dividido 30 multiplicado por 1,66 (20 días) o 1,75 (21 días); y el criterio discutido sobre el salario vacacional como alícuota',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/derecho-reglamentacion-laboral/derecho-laboral-uruguayo/despido-regimen-comun/metodo-calculo',
  },
  {
    label:
      'MTSS — «Despido (régimen común)»: la indemnización corresponde por despido, con el régimen y los topes que le son propios',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/institucional/derecho-laboral-uruguayo/despido-regimen-comun',
  },
  {
    label:
      'Ley 18.572 (13/09/2009), art. 29 — recargo automático del 10 % sobre los créditos laborales impagos desde su exigibilidad. La suspensión de la Ley 18.623 fue temporal y venció el 31/01/2010; la Ley 18.847 (2011) reformó el proceso laboral sin sacar el recargo, que el MTSS sigue publicando como vigente',
    url: 'https://www.impo.com.uy/bases/leyes/18572-2009/29',
  },
  {
    label:
      'MTSS — «Consultas laborales y salariales»: asesoramiento gratuito con un profesional, que puede incluir la liquidación de los rubros del egreso',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/consultas-laborales-salariales-via-web',
  },
]
