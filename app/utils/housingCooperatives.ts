// app/utils/housingCooperatives.ts
// Lo que hay que cumplir para entrar a una cooperativa de vivienda en Uruguay, y el número que
// decide casi todas las consultas: el tope de ingresos del hogar, que el Estado publica en UR.
//
// POR QUÉ EXISTE. El racimo de vivienda del sitio está casi entero —alquilar, comprar, el crédito
// hipotecario, el ITP, la escrituración, el valor catastral, comprar o alquilar— y la palabra
// «cooperativa» no aparecía en NINGUNA entrada de `siteNav.ts` ni de `searchIndex.ts`. En Uruguay
// la cooperativa es una de las tres puertas a la vivienda propia, y es la única que no se resuelve
// con un préstamo a nombre de una persona: la toma la cooperativa.
//
// EL ÁNGULO PROPIO SON DOS COSAS, Y LAS DOS SALEN DE LEER LAS FICHAS OFICIALES EN LUGAR DE
// RESUMIRLAS:
//
//  1. EL TOPE DE INGRESOS ESTÁ EN UR Y NADIE LO PASA A PESOS. La UR se mueve todos los meses con
//     los salarios, así que «96 UR» no le dice a nadie si entra o no. Este sitio ya publica el
//     valor de la UR del día (`/indicadores/unidad-reajustable`, lectura del BCU), así que la
//     conversión es la única cosa que podemos hacer y las fichas del Estado no.
//
//  2. LAS DOS TABLAS OFICIALES NO COINCIDEN, Y ESO SE PUBLICA COMO LO QUE ES. La ficha del
//     «Programa Cooperativas» del MVOT abre en 60 UR para un integrante y 66 para dos; la ficha
//     «Esquema de ingresos para el acceso a la vivienda» del MISMO ministerio abre en 40 y 60.
//     De tres integrantes en adelante las dos dicen lo mismo (72, 84 y 96 UR). No se promedia, no
//     se elige la más alta y no se esconde: se publican las dos filas discordantes con el enlace a
//     cada ficha, porque un hogar de una o dos personas que planifica con la cifra equivocada
//     planifica mal. La fila que manda en un llamado concreto es la de su resolución de apertura.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA (ver `COOP_UNPUBLISHED`): el porcentaje de ahorro previo o
// de ayuda mutua, el monto del préstamo, el del subsidio a la cuota y los valores de tasación.
// Los tres primeros dependen del decreto reglamentario y la ficha del MVOT remite al Decreto
// 198/2012; el 2026-10-18 el banco de datos de impo.com.uy devolvía un error interno en todas sus
// rutas, así que no se pudo cotejar qué texto está vigente. Sin esa verificación no va el número.
//
// FUENTES, cotejadas el 2026-10-18 contra gub.uy (lista completa en `COOP_SOURCES`).
//
// MÓDULO PURO (sin Vue/Nuxt) para que vitest-node lo cargue con imports relativos.

/** Fecha en la que se cotejó todo este archivo contra las fichas oficiales. */
export const COOP_VERIFIED_AT = '2026-10-18'

/** La ruta de la página, en un solo lugar. */
export const COOP_PATH = '/cooperativas-de-vivienda-uruguay'

export interface CoopSource {
  readonly id: string
  readonly label: string
  readonly url: string
  /** La fecha que la propia ficha muestra, cuando la muestra. */
  readonly shownAt?: string
}

const MVOT_PROGRAMA =
  'https://www.gub.uy/ministerio-vivienda-ordenamiento-territorial/politicas-y-gestion/programa-cooperativas'
const MVOT_ESQUEMA =
  'https://www.gub.uy/ministerio-vivienda-ordenamiento-territorial/politicas-y-gestion/esquema-ingresos-para-acceso-vivienda'
const ANV_SUBSIDIOS = 'https://www.gub.uy/tramites/solicitud-subsidios-cooperativas'

export const COOP_SOURCES: readonly CoopSource[] = Object.freeze([
  {
    id: 'mvot-programa',
    label: 'MVOT — Programa Cooperativas: requisitos, tabla de ingresos y pasos',
    url: MVOT_PROGRAMA,
    shownAt: '2021-07-22',
  },
  {
    id: 'mvot-esquema',
    label: 'MVOT — Esquema de ingresos para el acceso a la vivienda',
    url: MVOT_ESQUEMA,
    shownAt: '2020-07-13',
  },
  {
    id: 'anv-subsidios',
    label: 'ANV — Solicitud de subsidios para cooperativas (trámite)',
    url: ANV_SUBSIDIOS,
    shownAt: '2026-06-05',
  },
])

/**
 * El tope de ingresos del hogar, en UR, según cada una de las dos fichas del MVOT.
 *
 * `programaUr` es la tabla de la ficha del Programa Cooperativas, que la encabeza con «Los
 * ingresos dependen de la cantidad de integrantes del grupo familiar» y aclara que el criterio
 * rige «para los llamados convocados a partir de la aprobación de la Resolución Ministerial
 * 1573/2017». `esquemaUr` es la tabla de la ficha del esquema general, cuya columna se titula
 * literalmente «Ingresos máximos del hogar en UR» — es la que deja escrito que son TOPES y no
 * mínimos, y la que dice que el máximo se elevó «a un maximo de 96 UR» (sic).
 *
 * Las dos se publican enteras y sin arbitrar: ver el comentario de cabecera.
 */
export interface CoopIncomeCap {
  /** Integrantes del hogar, de 1 a 5. */
  readonly members: number
  /** Tope en UR según la ficha del Programa Cooperativas. */
  readonly programaUr: number
  /** Tope en UR según la ficha del esquema general de ingresos. */
  readonly esquemaUr: number
}

export const COOP_INCOME_CAPS: readonly CoopIncomeCap[] = Object.freeze([
  Object.freeze({ members: 1, programaUr: 60, esquemaUr: 40 }),
  Object.freeze({ members: 2, programaUr: 66, esquemaUr: 60 }),
  Object.freeze({ members: 3, programaUr: 72, esquemaUr: 72 }),
  Object.freeze({ members: 4, programaUr: 84, esquemaUr: 84 }),
  Object.freeze({ members: 5, programaUr: 96, esquemaUr: 96 }),
])

/** True cuando las dos fichas del MVOT dicen lo mismo para ese tamaño de hogar. */
export const coopCapAgrees = (cap: CoopIncomeCap): boolean => cap.programaUr === cap.esquemaUr

/** Las filas en las que las dos fichas coinciden: las únicas que se pueden afirmar sin asterisco. */
export const coopAgreedCaps = (): readonly CoopIncomeCap[] => COOP_INCOME_CAPS.filter(coopCapAgrees)

/** Las filas en las que el Estado se contradice consigo mismo. */
export const coopDisputedCaps = (): readonly CoopIncomeCap[] =>
  COOP_INCOME_CAPS.filter(cap => !coopCapAgrees(cap))

/**
 * El tope en pesos, con el valor de la UR del día.
 *
 * Devuelve `null` sin una lectura válida de la UR: una página que publica «$ 0» o una cifra vieja
 * rotulada «hoy» es peor que una que no publica el peso. Es la misma regla que
 * `liveIndicatorReading` ya aplica en `/indicadores`.
 */
export function coopCapInPesos(
  cap: CoopIncomeCap,
  urValue: number | null | undefined
): { readonly low: number; readonly high: number } | null {
  if (typeof urValue !== 'number' || !Number.isFinite(urValue) || urValue <= 0) return null
  const low = Math.min(cap.programaUr, cap.esquemaUr) * urValue
  const high = Math.max(cap.programaUr, cap.esquemaUr) * urValue
  return { low, high }
}

/** El tope más alto de los publicados, que es el techo del programa. */
export const COOP_MAX_UR = Math.max(
  ...COOP_INCOME_CAPS.map(cap => Math.max(cap.programaUr, cap.esquemaUr))
)

export interface CoopRule {
  readonly id: string
  readonly label: string
  readonly detail: string
}

/**
 * Los requisitos que la ficha del Programa Cooperativas lista para acceder al préstamo
 * hipotecario, además del tope de ingresos.
 */
export const COOP_REQUIREMENTS: readonly CoopRule[] = Object.freeze([
  Object.freeze({
    id: 'socios',
    label: 'Entre 10 y 50 socios (6 si es reciclaje)',
    detail:
      'La ficha pide «un mínimo de diez socios (10) para construir viviendas nuevas y de seis socios (6) si se trata de reciclaje. El máximo en ambos casos es de cincuenta (50)». No es un grupo de amigos: es el tamaño que el programa financia.',
  }),
  Object.freeze({
    id: 'mayores',
    label: 'Socios titulares mayores de edad',
    detail: 'Lo exige la ficha para cada socio titular, no sólo para las autoridades.',
  }),
  Object.freeze({
    id: 'residencia',
    label: 'Residir en el territorio nacional',
    detail: 'No pide ciudadanía: pide residencia en el país.',
  }),
  Object.freeze({
    id: 'no-propietario',
    label: 'No ser propietario de una vivienda',
    detail:
      'Es el filtro que deja afuera a quien ya tiene casa, aunque la alquile o la haya heredado. La ficha lo escribe sin excepciones.',
  }),
  Object.freeze({
    id: 'iat',
    label: 'Contrato firmado con un Instituto de Asistencia Técnica',
    detail:
      'El IAT tiene que estar autorizado por el MVOT, que publica el listado. Es quien hace el proyecto, la dirección de obra y el asesoramiento jurídico y social: sin IAT la cooperativa no avanza.',
  }),
  Object.freeze({
    id: 'anteproyecto',
    label: 'Anteproyecto arquitectónico aprobado en la ANV',
    detail:
      'Es el requisito para participar del sorteo, no para ganarlo. Aprobar el anteproyecto no adjudica ningún préstamo.',
  }),
])

export interface CoopStep {
  readonly id: string
  readonly name: string
  /** El organismo que resuelve ese paso. */
  readonly who: string
  readonly detail: string
}

/** El camino, en el orden y con el organismo que la ficha del MVOT le asigna a cada paso. */
export const COOP_STEPS: readonly CoopStep[] = Object.freeze([
  Object.freeze({
    id: 'acta',
    name: 'Acta de fundación y estatuto',
    who: 'Escribano + Registro de Personas Jurídicas',
    detail:
      'Se labra el acta con asistencia de escribano público, se aprueba el estatuto, se solicita la personería jurídica y se inscribe el estatuto en el Registro de Personas Jurídicas de la Dirección General de Registros.',
  }),
  Object.freeze({
    id: 'registro',
    name: 'Registro de la cooperativa y Certificado de Regularidad',
    who: 'MVOT',
    detail:
      'El primer Certificado de Regularidad lo tramita la unidad de DINAVI en Montevideo. Las renovaciones van por las oficinas locales, salvo Montevideo, Canelones y San José, que siguen en esa misma unidad.',
  }),
  Object.freeze({
    id: 'factibilidad',
    name: 'Estudio de factibilidad del terreno',
    who: 'ANV',
    detail: 'Antes del proyecto hay que saber si el padrón sirve para lo que se quiere construir.',
  }),
  Object.freeze({
    id: 'anteproyecto',
    name: 'Ingreso del anteproyecto',
    who: 'ANV',
    detail:
      'Las fechas salen en el calendario que publica el MVOT. Se admite presentar el padrón social con uno o dos socios faltantes como máximo, pero igual hay que presentar el 100 % de las viviendas a construir (Oficio N.º 13/2014 del MVOT).',
  }),
  Object.freeze({
    id: 'sorteo',
    name: 'Sorteo de adjudicación del préstamo',
    who: 'MVOT',
    detail:
      'Participan sólo las cooperativas que aprobaron el anteproyecto y tienen certificado de regularidad vigente. La que no sale tiene que presentar una Declaratoria en la ANV, dentro de la fecha límite de presentación de anteproyectos, para volver a entrar en el siguiente sorteo.',
  }),
  Object.freeze({
    id: 'escritura',
    name: 'Escrituración del préstamo',
    who: 'ANV',
    detail:
      'Pide proyecto definitivo aprobado, resolución ministerial del préstamo, permisos de construcción y las extensiones de agua o saneamiento ya construidas.',
  }),
  Object.freeze({
    id: 'obra',
    name: 'Ejecución de la obra',
    who: 'ANV',
    detail:
      'Para el acta de inicio van el registro de obra en el MTSS y en el BPS, la constancia del agrimensor, el acta de asamblea sobre seguridad e higiene y la designación del director de obra.',
  }),
])

export interface CoopUnpublished {
  readonly id: string
  readonly label: string
  readonly why: string
}

/** Lo que esta página NO publica, con el motivo escrito. */
export const COOP_UNPUBLISHED: readonly CoopUnpublished[] = Object.freeze([
  Object.freeze({
    id: 'aporte',
    label: 'El porcentaje de ahorro previo o de ayuda mutua',
    why: 'Lo fija el decreto reglamentario, y la ficha del MVOT remite al Decreto 198/2012. El 18 de octubre de 2026 el banco de datos de impo.com.uy devolvía un error interno en todas sus rutas, así que no pudimos cotejar qué texto está vigente. Preguntalo en el IAT o en el MVOT.',
  }),
  Object.freeze({
    id: 'prestamo',
    label: 'El monto del préstamo y el de la cuota',
    why: 'Dependen del proyecto, del valor de tasación aprobado por la ANV y del régimen de la cooperativa. No hay una cifra única que valga para todas.',
  }),
  Object.freeze({
    id: 'subsidio',
    label: 'Cuánto baja el subsidio a la cuota',
    why: 'El subsidio es socio por socio: lo vota la asamblea y lo resuelve la ANV con la documentación de ingresos de cada núcleo. Publicar un porcentaje general sería inventarlo.',
  }),
  Object.freeze({
    id: 'tasacion',
    label: 'Los valores de tasación vigentes',
    why: 'Los publica el MVOT y se actualizan; una copia acá envejece sin avisar. El enlace de la ficha es la fuente.',
  }),
])

export interface CoopFaq {
  readonly question: string
  readonly answer: string
}

export const COOP_FAQ: readonly CoopFaq[] = Object.freeze([
  Object.freeze({
    question: '¿Cuánto puedo ganar para entrar a una cooperativa de vivienda?',
    answer:
      'El MVOT fija un tope de ingresos del hogar en Unidades Reajustables (UR) que crece con la cantidad de integrantes. Sus dos fichas oficiales coinciden en 72 UR para tres integrantes, 84 UR para cuatro y 96 UR para cinco, y discrepan para hogares de una y dos personas: la ficha del Programa Cooperativas dice 60 y 66 UR, y la del esquema general de ingresos dice 40 y 60 UR. La cifra que manda en un llamado concreto es la de su resolución de apertura.',
  }),
  Object.freeze({
    question: '¿Cuántos socios necesita una cooperativa de vivienda?',
    answer:
      'Un mínimo de diez socios para construir viviendas nuevas y de seis si se trata de reciclaje, con un máximo de cincuenta en los dos casos, según la ficha del Programa Cooperativas del MVOT.',
  }),
  Object.freeze({
    question: 'Si ya tengo una casa, ¿puedo entrar igual?',
    answer:
      'No. La ficha del MVOT pide que los socios titulares no sean propietarios de una vivienda, además de ser mayores de edad y residir en el territorio nacional.',
  }),
  Object.freeze({
    question: 'Aprobamos el anteproyecto, ¿ya tenemos el préstamo?',
    answer:
      'No. Aprobar el anteproyecto en la ANV es lo que habilita a participar del sorteo que hace el MVOT entre las cooperativas que además tengan certificado de regularidad vigente. La cooperativa que no sale sorteada debe presentar una Declaratoria en la ANV para volver a participar en el sorteo siguiente.',
  }),
  Object.freeze({
    question: '¿Qué es un Instituto de Asistencia Técnica (IAT)?',
    answer:
      'Es el equipo técnico que la cooperativa contrata para el proyecto, la dirección de obra y el asesoramiento. Tiene que estar autorizado por el MVOT, que publica el listado, y el contrato firmado con un IAT es uno de los requisitos para acceder al préstamo hipotecario.',
  }),
])

/** El título de la página, en un solo lugar: lo mide `seoTitleBudget`. */
export const COOP_TITLE = 'Cooperativas de vivienda en Uruguay'

/**
 * La descripción, con la cifra del día cuando la UR se pudo leer.
 *
 * La regla medida en este sitio: una descripción con el número del día corre a ~1,4 % de CTR y una
 * genérica a 0,03–0,2 % desde la misma posición. Acá el número propio no es el tope en UR —que
 * está en las dos fichas del Estado y no le dice a nadie si entra— sino el tope en PESOS, que sale
 * de multiplicarlo por la UR que el sitio ya publica.
 *
 * Sin lectura de la UR vuelve la variante en UR: nunca una cifra vieja rotulada «hoy». Las dos
 * variantes se miden contra los 155 caracteres en `housingCooperatives.test.ts`, la viva con una
 * UR muy por encima de la de hoy, porque un presupuesto que sólo entra mientras la UR aguante no
 * es un presupuesto.
 */
export function coopDescription(urValue: number | null | undefined): string {
  const caps = coopAgreedCaps()
  const agreed = caps.map(cap => cap.programaUr).join(', ')
  const members = caps.map(cap => cap.members).join(', ')
  const pesos = coopCapInPesos(COOP_INCOME_CAPS[COOP_INCOME_CAPS.length - 1]!, urValue)
  if (pesos) {
    const amount = Math.round(pesos.high).toLocaleString('es-UY')
    return `Para 5 integrantes el tope de ingresos del hogar es ${COOP_MAX_UR} UR: $ ${amount} con la UR de hoy. Y las dos tablas del MVOT no coinciden para 1 y 2.`
  }
  return `El MVOT topea el ingreso del hogar en ${agreed} UR para ${members} integrantes, y sus dos tablas oficiales no coinciden para hogares de 1 y 2 personas.`
}
