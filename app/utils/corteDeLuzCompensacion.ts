// app/utils/corteDeLuzCompensacion.ts
// Datos de /compensacion-por-corte-de-luz-uruguay: cuándo UTE tiene que compensar por un corte de
// luz, cómo llega esa plata y qué cortes no cuentan.
//
// POR QUÉ EXISTE: el sitio ya mide los cortes de luz barrio por barrio
// (/cortes-de-luz-por-barrio-uruguay, el libro que UTE no guarda) y ya rutea el reclamo al organismo
// que corresponde (/a-quien-le-reclamo-uruguay dice «luz y agua son URSEA, 15 días hábiles»). Lo que
// no estaba escrito en ninguna de las dos es la pregunta que el lector hace después del corte: si le
// tienen que devolver algo y qué tiene que hacer para cobrarlo. `docs/seo/2026-09-15-google-trends-
// oportunidades.md` lo tenía anotado como hueco con demanda medida («reclamo por corte de luz» +70 %,
// «corte de luz: cómo reclamar y qué compensación corresponde» = 0 en el sitio) y seguía en cero.
//
// LA RESPUESTA, QUE ES CONTRAINTUITIVA Y ESTÁ EN LA FUENTE: la compensación por superar las metas de
// calidad NO se pide. La calcula URSEA al cierre del semestre y UTE la aplica como descuento en la
// factura. URSEA lo escribe con todas las letras: «No es necesario que el usuario realice trámite
// alguno para recibir dicha compensación». O sea que el reclamo que sí sirve es OTRO —el del problema
// concreto, que arranca en UTE— y tiene su propio premio por demora, que es el único porcentaje que
// la norma fija y que esta página puede publicar.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA: el umbral de horas y de cortes a partir del cual nace la
// compensación. Existe (las Tablas 1 y 2 del Reglamento fijan Tca, Fca, Tci, Fci y Dmaxi por
// agrupamiento), pero el texto que publica IMPO anota que la Tabla 1 «se modifica por» la Resolución
// URSEA 88/005 y que las dos tablas se modifican por la 36/006, y el texto ordenado vigente que
// publica URSEA es un PDF ESCANEADO sin capa de texto: no hay forma de afirmar hoy qué número rige
// para cada agrupamiento. Un umbral viejo publicado como vigente es justo el dato con el que alguien
// decidiría que no le corresponde nada. Va el mecanismo, que sí está verificado, y la indicación de
// que el umbral depende del agrupamiento y lo determina URSEA.
//
// Tampoco se publica un monto de compensación por el corte en sí: la norma lo define como una
// fórmula proporcional al desvío respecto de la meta y a la facturación del propio usuario (Título
// III), no como una cifra.
//
// FUENTES PRIMARIAS, verificadas el 2026-10-21 (ver CORTE_LUZ_SOURCES para la lista):
//   - Reglamento de Calidad del Servicio de Distribución de Energía Eléctrica, aprobado por
//     Resolución URSEA 29/003 (texto en IMPO), arts. 13, 14, 17, 18, 19, 48, 49, 61 y 62.
//   - URSEA, «Indicadores de calidad» — el reglamento está «vigente desde 2003 y en aplicación desde
//     2006», la compensación «se efectiviza como descuento en su factura» y «no es necesario que el
//     usuario realice trámite alguno».
//   - gub.uy, «Reclamos ante URSEA» — primero el prestador, después URSEA pasados 15 días hábiles (o
//     antes si la respuesta no fue satisfactoria); los daños eléctricos se reclaman primero a UTE.

export interface CorteLuzSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que todo lo de este archivo se contrastó contra IMPO y URSEA. */
export const CORTE_LUZ_VERIFIED_AT = '2026-10-21'

export const CORTE_LUZ_PATH = '/compensacion-por-corte-de-luz-uruguay'

export const CORTE_LUZ_TITLE = 'Compensación por corte de luz en Uruguay'

/**
 * El porcentaje de la facturación diaria promedio de los últimos seis meses que UTE debe por CADA
 * día de atraso cuando no contesta un reclamo en plazo (Reglamento, art. 62).
 *
 * Es el único porcentaje que la norma fija como número y no como fórmula, y está en el cuerpo del
 * reglamento, no en las tablas que las resoluciones posteriores modificaron. Por eso es el que esta
 * página publica.
 */
export const RETRASO_RESPUESTA_PCT_DIARIO = 30

/** Meses de facturación sobre los que se promedia ese día (art. 62). */
export const RETRASO_PROMEDIO_MESES = 6

/** Días hábiles que hay que esperar la respuesta de UTE antes de ir a URSEA (gub.uy, «Reclamos ante URSEA»). */
export const ESPERA_ANTES_DE_URSEA_DIAS_HABILES = 15

/** Días hábiles que tiene UTE para declarar un caso de fuerza mayor ante URSEA, o lo pierde (art. 14). */
export const FUERZA_MAYOR_PLAZO_DIAS_HABILES = 3

/** Plazo máximo para corregir la desviación constatada y verificarla (art. 49). */
export const CORRECCION_PLAZO_DIAS = 120

/**
 * El tope de cortes PROGRAMADOS que entra al cómputo con trato especial, como porcentaje del tiempo
 * total de interrupción del período de control (art. 13).
 */
export const PROGRAMADOS_TOPE_PCT = 15

export interface CorteLuzPaso {
  readonly title: string
  readonly body: string
  /** El artículo o la fuente que lo dice, para imprimirlo al lado. */
  readonly basis: string
}

/**
 * Cómo llega la compensación por superar las metas de calidad. El orden importa: el primer paso es
 * el que corrige la expectativa del lector, que llega creyendo que hay un trámite.
 */
export const CORTE_LUZ_MECANISMO: readonly CorteLuzPaso[] = Object.freeze([
  {
    title: 'No se pide: se descuenta de la factura',
    body: 'URSEA calcula los indicadores al cierre de cada semestre y, si UTE superó las metas, dispone la compensación. UTE la aplica como descuento en la primera factura posterior a esa notificación, y si el monto es mayor que la factura el descuento sigue en las siguientes hasta completarlo. URSEA lo dice sin rodeos: no hace falta que el usuario haga ningún trámite para cobrarla.',
    basis: 'Reglamento, art. 19; URSEA, «Indicadores de calidad»',
  },
  {
    title: 'Se mide por semestre, no por corte',
    body: 'El período de control es el semestre. Lo que se compara contra la meta no es un apagón suelto sino el tiempo total de interrupción y la cantidad de cortes acumulados en esos seis meses, por un lado como promedio del agrupamiento al que pertenece tu suministro y por otro como indicador individual tuyo.',
    basis: 'Reglamento, arts. 17 y 18',
  },
  {
    title: 'Si se pasa de dos metas, se cobra la mayor',
    body: 'Cuando en el mismo período se superan las metas de duración y de frecuencia, se calculan las dos compensaciones y se aplica la más alta de las dos, no la suma. Aparte de eso, la compensación por haber pasado la duración máxima de UNA interrupción corre siempre que se supere, sin importar cómo cerraron los demás indicadores.',
    basis: 'Reglamento, arts. 17 y 18',
  },
  {
    title: 'El monto sale de tu propia factura',
    body: 'La norma no fija un importe: define una fórmula proporcional a cuánto se pasó de la meta y a la facturación del usuario afectado. Dos vecinos con el mismo corte cobran distinto si consumen distinto.',
    basis: 'Reglamento, Título III',
  },
])

export interface CorteLuzExcluido {
  readonly label: string
  readonly detail: string
}

/**
 * Los cortes que no entran al cómputo. Es la mitad que la prensa no cuenta y la que explica por qué
 * después de un temporal con media ciudad a oscuras puede no haber ninguna compensación.
 */
export const CORTE_LUZ_EXCLUIDOS: readonly CorteLuzExcluido[] = Object.freeze([
  {
    label: 'Fuerza mayor, configurada de pleno derecho',
    detail:
      'El reglamento la da por configurada, sin discusión, cuando el corte fue consecuencia de temperaturas superiores a 45 °C o inferiores a −10 °C, de vientos de más de 130 km/h o de inundaciones de carácter excepcional. Las temperaturas son la máxima y la mínima diaria medidas al abrigo meteorológico.',
  },
  {
    label: 'Pero UTE tiene que declararla, y tiene plazo',
    detail: `Debe notificar el caso a URSEA dentro de los ${FUERZA_MAYOR_PLAZO_DIAS_HABILES} días hábiles siguientes, precisando duración y alcance. Si no lo notifica, la omisión se considera renuncia a la fuerza mayor y esas horas vuelven al cómputo.`,
  },
  {
    label: 'Cortes por deuda',
    detail:
      'Si el suministro estaba cortado por mora, ese tiempo no cuenta como interrupción del servicio.',
  },
  {
    label: 'Obras pedidas por el propio usuario',
    detail:
      'Las interrupciones originadas en obras de interés del usuario que lo afectan sólo a él quedan fuera del cómputo.',
  },
  {
    label: 'Cortes ordenados por una autoridad',
    detail:
      'Los dispuestos por URSEA u otra autoridad competente tampoco entran, ni las perturbaciones que configuran un estado anormal de operación del sistema.',
  },
  {
    label: 'Cortes programados, hasta un límite',
    detail: `Los avisados de antemano reciben un trato especial en el régimen de compensaciones mientras no pasen del ${PROGRAMADOS_TOPE_PCT} % del tiempo total de interrupción del período.`,
  },
])

/**
 * El reclamo que SÍ se hace, que es el del problema concreto y no el de la compensación semestral.
 * Cada paso lleva su plazo verificado; donde el plazo no está verificado, se dice.
 */
export const CORTE_LUZ_RECLAMO: readonly CorteLuzPaso[] = Object.freeze([
  {
    title: 'Primero, a UTE, y guardá el número',
    body: 'El reclamo arranca en el prestador. UTE tiene que registrarlo con una identificación y dártela, para que tengas referencia y comprobante de haberlo hecho. Los daños eléctricos —el artefacto que se quemó— también se reclaman primero a UTE.',
    basis: 'Reglamento, art. 60; gub.uy, «Reclamos ante URSEA»',
  },
  {
    title: 'La respuesta tiene que decir la causa',
    body: 'No alcanza con contestar: la respuesta debe informar la causa del problema que generó el reclamo y, cuando corresponda, el plazo previsto para solucionarlo. El plazo máximo para contestar no está en este reglamento sino en el Reglamento de Distribución, así que confirmalo al reclamar.',
    basis: 'Reglamento, art. 61',
  },
  {
    title: `Si no contesta en plazo: ${RETRASO_RESPUESTA_PCT_DIARIO} % por día`,
    body: `Cuando UTE incumple el plazo máximo de respuesta, debe compensar al usuario con un monto igual al ${RETRASO_RESPUESTA_PCT_DIARIO} % de su facturación promedio diaria de los últimos ${RETRASO_PROMEDIO_MESES} meses, por cada día de atraso, calculada con los cargos tarifarios vigentes a la fecha de pago.`,
    basis: 'Reglamento, art. 62',
  },
  {
    title: `Después de ${ESPERA_ANTES_DE_URSEA_DIAS_HABILES} días hábiles, a URSEA`,
    body: `Pasados ${ESPERA_ANTES_DE_URSEA_DIAS_HABILES} días hábiles desde el reclamo a UTE —o antes, si la respuesta no fue satisfactoria— el reclamo se puede presentar ante URSEA. El orden no es opcional: si no reclamaste primero al prestador, URSEA archiva la solicitud.`,
    basis: 'gub.uy, «Reclamos ante URSEA»',
  },
  {
    title: 'Corregir tampoco es opcional',
    body: `Además de pagar la compensación, UTE debe tomar las medidas para corregir la desviación constatada, verificarla y comunicárselo a URSEA y al usuario cuyo reclamo la originó. Todo ese proceso no puede llevar más de ${CORRECCION_PLAZO_DIAS} días; incumplirlo habilita sanciones.`,
    basis: 'Reglamento, art. 49',
  },
])

/** Lo que esta página decide no publicar, y por qué. Se imprime: es parte de la respuesta. */
export const CORTE_LUZ_NO_PUBLICADO: readonly CorteLuzExcluido[] = Object.freeze([
  {
    label: 'A partir de cuántas horas de corte nace la compensación',
    detail:
      'El reglamento fija metas por agrupamiento en dos tablas, pero el texto publicado en IMPO anota que la Tabla 1 fue modificada por la Resolución URSEA 88/005 y las dos tablas por la 36/006, y el texto ordenado que publica URSEA es un PDF escaneado sin texto seleccionable. No se puede afirmar hoy qué valor rige para cada agrupamiento, y un umbral vencido publicado como vigente es exactamente el dato que haría desistir a alguien que sí tiene derecho. El umbral depende del agrupamiento de tu suministro y lo determina URSEA.',
  },
  {
    label: 'Cuánta plata es la compensación',
    detail:
      'La norma la define como una fórmula proporcional al desvío respecto de la meta y a tu propia facturación, no como un importe. Cualquier cifra concreta sería inventada.',
  },
  {
    label: 'Cuánto se cobra por un electrodoméstico quemado',
    detail:
      'Es otra vía: un reclamo por daños ante UTE, con su propio trámite y su propia prueba, y no la compensación automática por calidad del servicio. No publicamos montos ni plazos de esa vía porque no los verificamos.',
  },
])

export const CORTE_LUZ_SOURCES: readonly CorteLuzSource[] = Object.freeze([
  {
    label:
      'IMPO — Reglamento de Calidad del Servicio de Distribución de Energía Eléctrica (Resolución URSEA 29/003): arts. 13 y 14 (fuerza mayor y su plazo), 17 a 19 (compensaciones y descuento en factura), 48 y 49 (corrección en 120 días), 60 a 62 (reclamos y 30 % por día de atraso)',
    url: 'https://www.impo.com.uy/bases/resoluciones-ursea-reglamento/29-2003',
  },
  {
    label:
      'URSEA — «Indicadores de calidad»: el reglamento está vigente desde 2003 y en aplicación desde 2006; la compensación se efectiviza como descuento en la factura y no requiere trámite del usuario',
    url: 'https://www.gub.uy/unidad-reguladora-servicios-energia-agua/indicadores-calidad',
  },
  {
    label:
      'gub.uy — «Reclamos ante URSEA»: primero el prestador, URSEA pasados 15 días hábiles o antes si la respuesta no fue satisfactoria; los daños eléctricos se reclaman primero ante UTE',
    url: 'https://www.gub.uy/tramites/reclamos-ursea',
  },
])

export interface CorteLuzFaq {
  readonly question: string
  readonly answer: string
}

export const CORTE_LUZ_FAQ: readonly CorteLuzFaq[] = Object.freeze([
  {
    question: '¿Tengo que pedirle a UTE la compensación por los cortes de luz?',
    answer:
      'No. URSEA calcula los indicadores de calidad al cierre de cada semestre y, si UTE superó las metas, la compensación se aplica como descuento en la factura. URSEA aclara que no es necesario que el usuario realice ningún trámite para recibirla. Lo que sí se reclama es el problema concreto, y ese reclamo arranca en UTE.',
  },
  {
    question: '¿Cuántas horas sin luz tienen que pasar para que me compensen?',
    answer:
      'Depende del agrupamiento al que pertenece tu suministro y lo determina URSEA: el reglamento fija metas distintas según la zona y el nivel de tensión, medidas por semestre y no por corte. No publicamos esos números porque las dos tablas del reglamento fueron modificadas por resoluciones posteriores y el texto ordenado vigente que publica URSEA es un PDF escaneado, así que no se puede verificar qué valor rige hoy para cada agrupamiento.',
  },
  {
    question: '¿Qué pasa si el corte fue por un temporal?',
    answer:
      'El reglamento considera configurada la fuerza mayor de pleno derecho cuando el corte fue consecuencia de temperaturas mayores a 45 °C o menores a −10 °C, vientos de más de 130 km/h o inundaciones de carácter excepcional, y esas interrupciones salen del cómputo. Pero UTE tiene que notificar el caso a URSEA dentro de los 3 días hábiles siguientes: si no lo hace, se considera que renunció a la fuerza mayor y esas horas vuelven a contar.',
  },
  {
    question: '¿Y si UTE no me contesta el reclamo?',
    answer:
      'El reglamento fija una compensación por la demora: 30 % de tu facturación promedio diaria de los últimos seis meses por cada día de atraso en la respuesta, con los cargos tarifarios vigentes a la fecha de pago. Y pasados 15 días hábiles desde que reclamaste a UTE —o antes, si la respuesta no fue satisfactoria— podés presentar el reclamo ante URSEA.',
  },
  {
    question: '¿Puedo reclamar directamente a URSEA?',
    answer:
      'No conviene: el reclamo se presenta en primera instancia ante la empresa prestadora, y gub.uy advierte que si eso no se hizo URSEA no le da trámite a la solicitud y la archiva. Primero UTE, con el número de reclamo guardado; después URSEA.',
  },
  {
    question: '¿Me pagan la heladera que se quemó por el corte?',
    answer:
      'Esa es otra vía y no la compensación automática por calidad del servicio: los daños eléctricos se reclaman primero ante UTE, con su propio trámite y su propia prueba. No publicamos montos ni plazos de ese camino porque no los verificamos.',
  },
])

/**
 * La descripción del snippet. Lleva los dos números que la página puede sostener —el 30 % por día de
 * atraso y los 15 días hábiles— y la respuesta adelante, porque es la que corrige la expectativa con
 * la que se llega. `corteDeLuzCompensacion.test.ts` la mide contra los 155 caracteres.
 */
export function corteDeLuzDescription(): string {
  return (
    `La compensación por cortes no se pide: se descuenta de la factura. Si UTE no contesta el reclamo, ` +
    `${RETRASO_RESPUESTA_PCT_DIARIO} % por día; a los ${ESPERA_ANTES_DE_URSEA_DIAS_HABILES} hábiles, URSEA.`
  )
}
