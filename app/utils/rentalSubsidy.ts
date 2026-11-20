// app/utils/rentalSubsidy.ts
// El subsidio de alquiler del Estado uruguayo: qué es «Abriendo Puertas - Alquiler», a quién le
// toca, y las dos tablas que el MVOT publica SÓLO en UR.
//
// POR QUÉ EXISTE. La palabra «subsidio de alquiler» no aparecía en NINGÚN archivo del sitio, con
// el racimo de alquiler entero construido alrededor (`/alquilar-en-uruguay`,
// `/garantia-de-alquiler-uruguay`, `/alquilar-estando-en-clearing`,
// `/alquilar-sin-recibo-de-sueldo`, `/credito-fiscal-por-alquiler-uruguay`, el directorio de
// `/alquileres-uruguay`). Y es la pregunta que sigue a la que el sitio ya contesta: quien no llega
// al alquiler con su ingreso no pregunta por otra garantía, pregunta si el Estado pone algo.
//
// LO PRIMERO QUE HAY QUE DECIR ES UN NO, Y ES LO MÁS ÚTIL DE LA PÁGINA. El programa no subsidia el
// alquiler que ya estás pagando en el mercado: en su primera etapa pone en alquiler viviendas de
// PROPIEDAD PÚBLICA, en edificios construidos por el MVOT, y el subsidio viaja con esa vivienda.
// Se entra por un llamado público y, si los postulantes superan la oferta, por sorteo. Quien llega
// buscando un trámite para que le bajen el alquiler de su contrato privado se ahorra el viaje.
//
// EL ÁNGULO PROPIO SON DOS COSAS, Y LAS DOS SALEN DE LEER LAS FICHAS EN LUGAR DE RESUMIRLAS:
//
//  1. LOS DOS TOPES ESTÁN EN UR Y NADIE LOS PASA A PESOS. La propia ficha del MVOT, donde dice el
//     tope, manda a consultar el valor de la UR a la página de la DGI: o sea reconoce que la cifra
//     publicada no se entiende sola. La UR se mueve todos los meses con los salarios, así que «38
//     UR» no le dice a nadie si entra. Este sitio publica la lectura del día
//     (`/indicadores/unidad-reajustable`), así que la conversión es lo único que podemos hacer y
//     las fichas del Estado no. Es el mismo lever que `/cooperativas-de-vivienda-uruguay`,
//     `/garantia-de-alquiler-uruguay` y `/elecciones-bps-2026`.
//
//  2. LA TABLA GENERAL NO ES LA QUE RIGE: RIGE LA DEL LLAMADO, Y EL PRIMERO NO COINCIDIÓ. La ficha
//     del programa topea el alquiler en 8/10/12 UR según los dormitorios y abre el ingreso en 15 UR
//     para todo tamaño de hogar. El único llamado publicado hasta hoy (Edificio Casa Rodó, un
//     apartamento de 2 dormitorios accesible) pedía **13 UR de alquiler** —por encima incluso del
//     tope de tres dormitorios— y un ingreso mínimo de 20 UR para un hogar de dos. La ficha general
//     lo habilita en una línea (cada llamado define sus propios requisitos) pero no lo advierte. Se
//     publican las dos, con el enlace a cada una, por la misma razón que las dos tablas discordantes
//     de las cooperativas: quien planifica con la cifra equivocada planifica mal.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA (ver `SUBSIDY_UNPUBLISHED`): cuánto te quedaría pagando. La
// ficha dice que el monto del subsidio sale de la diferencia entre el precio del alquiler efectivo
// de la vivienda y la afectación del ingreso del hogar, y no publica qué porcentaje es esa
// afectación. Sin ese número no hay cuenta posible, y una cuenta inventada acá es el único error
// que esta página no se puede permitir: es el que decide si alguien se anota.
//
// FUENTES, cotejadas el 2026-10-20 contra gub.uy (lista completa en `SUBSIDY_SOURCES`).
//
// MÓDULO PURO (sin Vue/Nuxt) para que vitest-node lo cargue con imports relativos.

/** Fecha en la que se cotejó todo este archivo contra las fichas oficiales. */
export const RENTAL_SUBSIDY_VERIFIED_AT = '2026-10-20'

/** La ruta de la página, en un solo lugar. */
export const RENTAL_SUBSIDY_PATH = '/subsidio-de-alquiler-uruguay'

/** El título del `<h1>` y del `<title>`, sin la marca (la agrega `useSeoMeta`). */
export const RENTAL_SUBSIDY_TITLE = 'Subsidio de alquiler del MVOT: 8 a 12 UR'

export interface SubsidySource {
  readonly id: string
  readonly label: string
  readonly url: string
  /** La fecha que la propia ficha muestra, cuando la muestra. */
  readonly shownAt?: string
}

const MVOT_PROGRAMA =
  'https://www.gub.uy/ministerio-vivienda-ordenamiento-territorial/politicas-y-gestion/abriendo-puertas-alquiler'
const MVOT_LLAMADO =
  'https://www.gub.uy/ministerio-vivienda-ordenamiento-territorial/politicas-y-gestion/edificio-casa-rodo-montevideo'
const DGI_UR =
  'https://www.gub.uy/direccion-general-impositiva/datos-y-estadisticas/datos/unidad-reajustable-ur'

export const SUBSIDY_SOURCES: readonly SubsidySource[] = Object.freeze([
  Object.freeze({
    id: 'mvot-programa',
    label: 'MVOT — Abriendo Puertas - Alquiler: requisitos, ingresos y topes de alquiler',
    url: MVOT_PROGRAMA,
    shownAt: '2026-09-04',
  }),
  Object.freeze({
    id: 'mvot-llamado',
    label: 'MVOT — Llamado del Edificio Casa Rodó (Montevideo): el primero del programa',
    url: MVOT_LLAMADO,
    shownAt: '2026-09-04',
  }),
  Object.freeze({
    id: 'dgi-ur',
    label: 'DGI — Valor de la Unidad Reajustable (la fuente que la propia ficha del MVOT indica)',
    url: DGI_UR,
  }),
])

/**
 * El ingreso del hogar que la ficha del programa exige, en UR.
 *
 * El mínimo es 15 UR para TODO tamaño de hogar: el programa no es para quien no tiene ingreso, es
 * para quien tiene uno formal que no le alcanza para el mercado. `members: 5` es «5 o más».
 */
export interface SubsidyIncomeBand {
  /** Integrantes del hogar. El 5 significa «5 o más». */
  readonly members: number
  readonly minUr: number
  readonly maxUr: number
}

export const SUBSIDY_INCOME_BANDS: readonly SubsidyIncomeBand[] = Object.freeze([
  Object.freeze({ members: 1, minUr: 15, maxUr: 38 }),
  Object.freeze({ members: 2, minUr: 15, maxUr: 48 }),
  Object.freeze({ members: 3, minUr: 15, maxUr: 55 }),
  Object.freeze({ members: 4, minUr: 15, maxUr: 60 }),
  Object.freeze({ members: 5, minUr: 15, maxUr: 65 }),
])

/** El mínimo de ingreso, que es el mismo para todos los tamaños de hogar. */
export const SUBSIDY_INCOME_MIN_UR = 15

/** El techo más alto de la tabla: el hogar de cinco o más. */
export const SUBSIDY_INCOME_MAX_UR = Math.max(...SUBSIDY_INCOME_BANDS.map(band => band.maxUr))

/** El tope de alquiler de la vivienda, en UR, según sus dormitorios. */
export interface SubsidyRentCap {
  readonly bedrooms: number
  readonly maxUr: number
}

export const SUBSIDY_RENT_CAPS: readonly SubsidyRentCap[] = Object.freeze([
  Object.freeze({ bedrooms: 1, maxUr: 8 }),
  Object.freeze({ bedrooms: 2, maxUr: 10 }),
  Object.freeze({ bedrooms: 3, maxUr: 12 }),
])

/**
 * El primer llamado del programa, que es la prueba de que la tabla general no es la que rige.
 *
 * `rentUr` es 13: más que el tope de 10 UR que la ficha general fija para dos dormitorios y más
 * que el de 12 UR de tres. `incomeBands` son las de ESE llamado, con mínimos de 20, 25 y 30 UR
 * donde la tabla general dice 15.
 */
export interface SubsidyCall {
  readonly id: string
  readonly name: string
  readonly address: string
  readonly dwelling: string
  readonly rentUr: number
  readonly opensOn: string
  readonly closesOn: string
  readonly incomeBands: readonly SubsidyIncomeBand[]
  readonly url: string
}

export const SUBSIDY_FIRST_CALL: SubsidyCall = Object.freeze({
  id: 'casa-rodo',
  name: 'Edificio Casa Rodó',
  address: 'Treinta y Tres 1287, esquina Buenos Aires y Reconquista (Montevideo)',
  dwelling: 'Un apartamento de 2 dormitorios accesible para discapacidad motriz',
  rentUr: 13,
  opensOn: '2026-09-07',
  closesOn: '2026-10-19',
  incomeBands: Object.freeze([
    Object.freeze({ members: 2, minUr: 20, maxUr: 60 }),
    Object.freeze({ members: 3, minUr: 25, maxUr: 72 }),
    Object.freeze({ members: 4, minUr: 30, maxUr: 84 }),
  ]),
  url: MVOT_LLAMADO,
})

/** True cuando el llamado pide un alquiler por encima del tope más alto de la tabla general. */
export const callExceedsGeneralCap = (call: SubsidyCall): boolean =>
  call.rentUr > Math.max(...SUBSIDY_RENT_CAPS.map(cap => cap.maxUr))

/**
 * Los grupos a los que la ficha le dirige el primer llamado del programa.
 *
 * No es una lista de preferencias nuestra: la ficha los presenta como los grupos prioritarios del
 * programa, y el primer llamado va dirigido a ellos.
 */
export const SUBSIDY_PRIORITY_GROUPS: readonly string[] = Object.freeze([
  'Hogares monoparentales: una persona adulta a cargo de niñas, niños o adolescentes y/o de personas con discapacidad.',
  'Jóvenes de 18 a 29 años, solos, en pareja o en grupos de convivencia de hasta 4 personas.',
])

export interface SubsidyRequirement {
  readonly id: string
  readonly label: string
  readonly detail: string
}

/** Lo que la ficha pide además del ingreso, con lo que cada condición deja afuera. */
export const SUBSIDY_REQUIREMENTS: readonly SubsidyRequirement[] = Object.freeze([
  Object.freeze({
    id: 'mayor',
    label: 'Titulares mayores de 18 años',
    detail:
      'La ficha lo escribe para cada persona titular del contrato, no sólo para quien se anota.',
  }),
  Object.freeze({
    id: 'sin-subsidio',
    label: 'Sin otro subsidio habitacional del Estado vigente',
    detail:
      'Es la condición que vuelve excluyentes entre sí los programas de vivienda: no se acumula con uno que ya estés cobrando.',
  }),
  Object.freeze({
    id: 'sin-deuda',
    label: 'Sin deudas con el MVOT ni con la ANV',
    detail:
      'Alcanza a cualquiera de los dos organismos, así que una deuda vieja de otro programa de vivienda bloquea este.',
  }),
  Object.freeze({
    id: 'bcu',
    label: 'Sin categoría 5 en la Central de Riesgos del BCU',
    detail:
      'Es la peor calificación de la escala del BCU, no «estar en el clearing»: son dos registros distintos, como explica la página de cómo salir del clearing.',
  }),
  Object.freeze({
    id: 'ingreso',
    label: 'Ingreso del hogar dentro de la banda de su tamaño',
    detail:
      'Con un piso además del techo: el programa no es para un hogar sin ingreso formal, porque la parte del alquiler que no cubre el subsidio la paga quien alquila.',
  }),
])

/** Lo que esta página NO publica, y por qué. */
export interface SubsidyUnpublished {
  readonly id: string
  readonly what: string
  readonly why: string
}

export const SUBSIDY_UNPUBLISHED: readonly SubsidyUnpublished[] = Object.freeze([
  Object.freeze({
    id: 'afectacion',
    what: 'Cuánto te quedaría pagando de alquiler',
    why: 'La ficha dice que el subsidio es la diferencia entre el precio del alquiler efectivo y la afectación del ingreso del hogar, y no publica qué porcentaje del ingreso es esa afectación. Sin ese número la cuenta no existe, y la cuenta es justo lo que decide si a alguien le conviene anotarse.',
  }),
  Object.freeze({
    id: 'cuantas-viviendas',
    what: 'Cuántas viviendas tiene el programa',
    why: 'La ficha no publica el padrón de viviendas ni cuántas se van a llamar. El único llamado publicado hasta hoy ofrecía una sola, así que hablar de cupos sería inventar una escala.',
  }),
  Object.freeze({
    id: 'jubilados',
    what: 'Un subsidio de alquiler para jubilados',
    why: 'Se pregunta como si existiera. La ficha de este programa no menciona ninguna línea para pasividades y sus grupos prioritarios publicados son otros dos: los hogares monoparentales y los jóvenes de 18 a 29 años. No encontramos una norma vigente que cree uno, así que acá no va ninguna cifra.',
  }),
])

export interface SubsidyFaq {
  readonly id: string
  readonly question: string
  readonly answer: string
}

/**
 * Las preguntas, con la respuesta que la ficha habilita y ni una palabra más.
 *
 * La primera es la única que importa y es un no: separar «subsidio de alquiler» de «una vivienda
 * pública con subsidio adentro» es lo que le ahorra el viaje a quien llega buscando un trámite.
 */
export const RENTAL_SUBSIDY_FAQ: readonly SubsidyFaq[] = Object.freeze([
  Object.freeze({
    id: 'mi-alquiler',
    question: '¿Me pueden subsidiar el alquiler que ya estoy pagando?',
    answer:
      'No. En su primera etapa, Abriendo Puertas - Alquiler pone en alquiler viviendas de propiedad pública, en edificios construidos por el MVOT, y el subsidio viaja con esa vivienda. No hay un trámite para pedir un subsidio sobre un contrato privado que ya firmaste: la ficha dice que el subsidio no requiere un trámite específico, porque se resuelve dentro de la adjudicación.',
  }),
  Object.freeze({
    id: 'cuanto-es',
    question: '¿De cuánto es el subsidio?',
    answer:
      'La ficha dice que el monto se calcula por la diferencia entre el precio del alquiler efectivo de la vivienda y la afectación del ingreso del hogar, y no publica qué porcentaje del ingreso es esa afectación. Sin ese dato el monto no se puede anticipar, y acá no lo inventamos. Lo que sí está escrito es que, además de la parte del alquiler que te toque, pagás los gastos comunes y los demás cargos.',
  }),
  Object.freeze({
    id: 'que-ingreso',
    question: '¿Qué ingreso me deja afuera?',
    answer:
      'Por arriba, el techo de tu tamaño de hogar: 38 UR para una persona y hasta 65 UR para cinco o más. Por abajo, 15 UR, porque la parte del alquiler que el subsidio no cubre la paga quien alquila. Y el piso del llamado concreto puede ser más alto: el primero pidió 20 UR de mínimo para un hogar de dos personas.',
  }),
  Object.freeze({
    id: 'como-me-anoto',
    question: '¿Cómo me anoto?',
    answer:
      'Esperando un llamado. El MVOT publica un llamado con las viviendas disponibles, y la inscripción es en línea o en la oficina del ministerio con cita previa. Si las personas interesadas superan la oferta, se hace un sorteo público. El primer llamado del programa abrió el 7 de setiembre de 2026 y cerró el 19 de octubre de 2026.',
  }),
  Object.freeze({
    id: 'cuanto-dura',
    question: '¿Por cuánto tiempo es el contrato?',
    answer:
      'Dos años, renovables por períodos iguales mientras se mantengan las condiciones que justificaron la adjudicación. O sea que el ingreso no se mira una sola vez al entrar.',
  }),
  Object.freeze({
    id: 'vs-garantia',
    question: '¿Es lo mismo que la garantía de alquiler del MVOT?',
    answer:
      'No, y es la confusión más común. La garantía respalda un contrato que firmás en el mercado privado: no pone plata, responde si no pagás. Este programa es al revés: una vivienda pública y un subsidio sobre su alquiler, a la que se entra por llamado y sorteo. Se pueden necesitar las dos cosas en momentos distintos, pero no son la misma.',
  }),
])

/**
 * Un valor en UR pasado a pesos con la UR del día.
 *
 * Devuelve `null` sin una lectura válida: una página que imprime «$ 0» o una cifra vieja rotulada
 * «hoy» es peor que una que no imprime el peso. Misma regla que `coopCapInPesos` y que
 * `liveIndicatorReading` en `/indicadores`.
 */
export function subsidyUrInPesos(ur: number, urValue: number | null | undefined): number | null {
  if (typeof urValue !== 'number' || !Number.isFinite(urValue) || urValue <= 0) return null
  if (!Number.isFinite(ur) || ur <= 0) return null
  return ur * urValue
}

/** El tope de alquiler de un dormitorio, que es el número que encabeza la página. */
export const SUBSIDY_ONE_BEDROOM_CAP_UR = SUBSIDY_RENT_CAPS[0]!.maxUr

/** El tope de alquiler más alto de la tabla general. */
export const SUBSIDY_TOP_CAP_UR = Math.max(...SUBSIDY_RENT_CAPS.map(cap => cap.maxUr))

/**
 * La descripción del snippet: lleva la cifra del día cuando la UR se pudo leer y vuelve a la
 * variante en UR cuando no. Las dos se miden contra los 155 caracteres en el test.
 *
 * Abre por la respuesta, que es un no: el programa no paga el alquiler que ya tenés.
 */
export function rentalSubsidyDescription(urValue: number | null | undefined): string {
  const pesos = subsidyUrInPesos(SUBSIDY_ONE_BEDROOM_CAP_UR, urValue)
  if (pesos) {
    const amount = Math.round(pesos).toLocaleString('es-UY')
    return `No cubre el alquiler que ya pagás: va con viviendas del MVOT que se sortean. Tope de 1 dormitorio, ${SUBSIDY_ONE_BEDROOM_CAP_UR} UR = $ ${amount} hoy.`
  }
  return `No cubre el alquiler que ya pagás: va con viviendas del MVOT y se entra por sorteo. El tope es de ${SUBSIDY_ONE_BEDROOM_CAP_UR} a ${SUBSIDY_TOP_CAP_UR} UR e ingresos de ${SUBSIDY_INCOME_MIN_UR} a ${SUBSIDY_INCOME_MAX_UR} UR.`
}
