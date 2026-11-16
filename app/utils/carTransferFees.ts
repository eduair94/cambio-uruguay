// Cuánto sale transferir un auto en Uruguay: el arancel de la libreta y qué pide
// cada intendencia.
//
// Módulo PURO (sin Vue/Nuxt, sin estado global, imports relativos) para que
// `pages/cuanto-sale-transferir-un-auto-uruguay.vue` no duplique el catálogo y
// vitest lo pueda cargar en Node, igual que `utils/birthCertificate.ts` y
// `utils/idCard.ts`.
//
// POR QUÉ ESTA PÁGINA. El sitio ya tenía la guía `/guias/transferir-un-auto-uruguay`,
// y lo que esa guía contesta sobre los requisitos es, textual, «Cada intendencia
// puede pedir requisitos algo distintos, así que conviene consultar de antemano en
// la intendencia correspondiente». Eso es verdad y no es una respuesta: manda a
// hacer el trabajo a quien vino a que se lo hicieran. La transferencia es un
// trámite DEPARTAMENTAL —el registro de vehículos lo lleva la intendencia donde
// está empadronado el auto—, así que no hay un requisito nacional que listar: hay
// diecinueve listas, cada una en su propia ficha, y nadie las pone en una pantalla.
// Ése es exactamente el SERP institucional e ilegible en el que este sitio sí
// entra.
//
// LA RESPUESTA QUE NINGUNA FICHA SOLA PUEDE DAR: el arancel es el mismo en cinco
// de los siete departamentos que lo publican ({@link CAR_TRANSFER_MODAL_FEE}), y
// los dos que se salen de ese número tienen la ficha más vieja del lote. O sea que
// la dispersión que un lector interpretaría como «en mi departamento sale más
// barato» se explica, al menos en parte, por la FECHA de la ficha y no por el
// departamento: ver {@link CAR_TRANSFER_FEE_SPREAD_NOTE}.
//
// LA REGLA DE LAS CIFRAS. Todo importe sale textual del bloque «Costos» de la
// ficha oficial del trámite, leída una por una el {@link CAR_TRANSFER_VERIFIED_AT},
// y cada departamento guarda la URL y la fecha de «Última actualización» que la
// propia ficha muestra ({@link CarTransferDepartment.fichaUpdatedAt}). No hay
// ningún importe estimado, promediado ni arrastrado de un departamento a otro.
//
// LO QUE NO SE PUBLICA, A PROPÓSITO (ver {@link CAR_TRANSFER_UNPUBLISHED}):
//
//  1. El costo del escribano. Es casi siempre el gasto más grande de la operación
//     y ninguna ficha lo tarifa, porque no lo cobra la intendencia. Publicar un
//     número «de mercado» sería inventarlo.
//  2. El arancel de Montevideo. Su ficha viva (`tramites.montevideo.gub.uy`) no se
//     puede leer de forma automática —responde con una verificación de navegador—,
//     y el documento oficial que sí se lee es el instructivo del Servicio de
//     Contralor y Registro de Vehículos, que lista requisitos pero no costo. Media
//     ciudad del país queda entonces sin cifra publicada acá, y eso se dice en vez
//     de taparlo con el número de otro departamento.
//  3. El plazo del Digesto montevideano para presentar la transferencia. Aparece
//     citado en resúmenes de buscador, pero `normativa.montevideo.gub.uy` no
//     contestó al leerlo el {@link CAR_TRANSFER_VERIFIED_AT}, así que no se afirma.

/** Una fuente primaria: etiqueta legible + URL oficial. */
export interface CarTransferSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se leyó ficha por ficha todo lo que hay en este archivo. */
export const CAR_TRANSFER_VERIFIED_AT = '2026-11-16'

/** Ruta de la página; el mismo slug en los tres idiomas (i18n prefija /en y /pt). */
export const CAR_TRANSFER_PATH = '/cuanto-sale-transferir-un-auto-uruguay'

/** Cuántos departamentos tiene el país, para decir «N de 19» sin escribir 19 dos veces. */
export const URUGUAY_DEPARTMENTS = 19

// ---------------------------------------------------------------------------
// Los requisitos, como ejes comparables
// ---------------------------------------------------------------------------

/**
 * Qué dice la ficha sobre un requisito.
 *
 * `no-figura` NO quiere decir que la intendencia no lo pida: quiere decir que su
 * ficha no lo lista. Es la misma disciplina que el resto del repo aplica a una
 * fuente caída: la ausencia no es un veredicto. Por eso la página cuenta «N de M
 * fichas lo piden» y nunca «en N departamentos no hace falta».
 */
export type RequisitoEstado = 'si' | 'condicional' | 'no-figura'

/** Los ejes en los que las fichas se pueden comparar entre sí. */
export interface CarTransferRequisitos {
  /** Documento de identidad de quien firma. */
  readonly identidad: RequisitoEstado
  /** DIV / libreta de propiedad del vehículo. */
  readonly div: RequisitoEstado
  /** Seguro Obligatorio de Automotores vigente (Ley 18.412). */
  readonly soa: RequisitoEstado
  /** Patente al día y sin multas ni adeudos. */
  readonly alDia: RequisitoEstado
  /** Título de propiedad o compraventa inscripta en el registro nacional. */
  readonly titulo: RequisitoEstado
  /** Certificado registral de libre de prenda y embargo. */
  readonly libreDePrenda: RequisitoEstado
  /** Hay que presentar el vehículo a inspección. */
  readonly inspeccion: RequisitoEstado
  /** Constancia de domicilio del nuevo titular. */
  readonly domicilio: RequisitoEstado
}

/**
 * Etiqueta de cada eje, en el orden en que la página los muestra.
 *
 * `prose` existe porque `label` va en el encabezado de una tabla y `prose` dentro de una oración, y
 * las dos formas no se obtienen una de la otra: pasar `label` a minúsculas convierte «SOA vigente»
 * en «soa vigente», que es justamente la sigla que esta página cita por su ley.
 */
export const CAR_TRANSFER_REQUISITO_LABELS: readonly {
  readonly field: keyof CarTransferRequisitos
  readonly label: string
  readonly prose: string
}[] = Object.freeze([
  { field: 'identidad', label: 'Documento de identidad', prose: 'documento de identidad' },
  { field: 'soa', label: 'SOA vigente', prose: 'SOA vigente' },
  { field: 'div', label: 'Libreta de propiedad (DIV)', prose: 'libreta de propiedad' },
  { field: 'alDia', label: 'Patente al día y sin multas', prose: 'patente al día y sin multas' },
  {
    field: 'titulo',
    label: 'Título o compraventa inscripta',
    prose: 'título o compraventa inscripta',
  },
  {
    field: 'libreDePrenda',
    label: 'Libre de prenda y embargo',
    prose: 'libre de prenda y embargo',
  },
  { field: 'inspeccion', label: 'Vehículo a inspección', prose: 'vehículo a inspección' },
  { field: 'domicilio', label: 'Constancia de domicilio', prose: 'constancia de domicilio' },
])

/** Cómo se saca turno. */
export type CarTransferTurno = 'agenda-previa' | 'orden-de-llegada' | 'en-linea' | 'no-figura'

// ---------------------------------------------------------------------------
// Un departamento con ficha oficial publicada
// ---------------------------------------------------------------------------

export interface CarTransferDepartment {
  /** Slug estable del departamento (no se usa en URLs públicas todavía). */
  readonly slug: string
  readonly departamento: string
  /**
   * El arancel que la ficha publica, en pesos uruguayos, o `null` si la ficha
   * existe pero no lo cifra.
   */
  readonly arancel: number | null
  /** Textual del bloque «Costos» de la ficha. */
  readonly arancelTextual: string
  /** Qué cubre ese importe según la propia ficha. */
  readonly arancelCubre: string
  readonly fichaUrl: string
  /** La fecha de «Última actualización» que muestra la ficha, en ISO. */
  readonly fichaUpdatedAt: string
  /** `catalogo` = gub.uy; `portal-propio` = el sitio de la intendencia. */
  readonly fuente: 'catalogo' | 'portal-propio'
  readonly turno: CarTransferTurno
  readonly requisitos: CarTransferRequisitos
  /** Lo que esta ficha pide y las demás no, en una línea. */
  readonly particularidad: string
}

/**
 * Las fichas leídas, ordenadas por arancel descendente y, a igual arancel, por
 * fecha de actualización: adelante lo más caro y mejor fechado, que es lo que un
 * lector tiene que presupuestar.
 *
 * Montevideo va al final a propósito y no por orden: es el único cuya fuente no es
 * el catálogo nacional y el único sin arancel publicado, así que cualquier orden
 * que lo mezclara con los demás insinuaría que su casilla vacía es un cero.
 */
export const CAR_TRANSFER_DEPARTMENTS: readonly CarTransferDepartment[] = Object.freeze([
  {
    slug: 'lavalleja',
    departamento: 'Lavalleja',
    arancel: 1780,
    arancelTextual: '1.780 $',
    arancelCubre: 'el trámite de transferencia',
    fichaUrl: 'https://www.gub.uy/tramites/transferencia-vehiculo-lavalleja',
    fichaUpdatedAt: '2026-11-10',
    fuente: 'catalogo',
    turno: 'agenda-previa',
    requisitos: {
      identidad: 'si',
      div: 'no-figura',
      soa: 'si',
      alDia: 'no-figura',
      titulo: 'si',
      libreDePrenda: 'no-figura',
      inspeccion: 'no-figura',
      domicilio: 'no-figura',
    },
    particularidad:
      'La única que pide una promesa de compraventa con firmas certificadas entre quien figura en la libreta y el nuevo titular.',
  },
  {
    slug: 'paysandu',
    departamento: 'Paysandú',
    arancel: 1780,
    arancelTextual: 'Documento de Identificación Vehicular: $ 1780',
    arancelCubre: 'el Documento de Identificación Vehicular',
    fichaUrl: 'https://www.gub.uy/tramites/transferencia-vehiculos-paysandu',
    fichaUpdatedAt: '2026-11-04',
    fuente: 'catalogo',
    turno: 'agenda-previa',
    requisitos: {
      identidad: 'si',
      div: 'si',
      soa: 'si',
      alDia: 'si',
      titulo: 'si',
      libreDePrenda: 'si',
      inspeccion: 'si',
      domicilio: 'no-figura',
    },
    particularidad:
      'Exige el libre de prenda y embargo con vigencia de no más de 24 horas, y exonera de él a las motos y a los tráilers de carga menor a 10.000 kg.',
  },
  {
    slug: 'maldonado',
    departamento: 'Maldonado',
    arancel: 1780,
    arancelTextual: 'Documento de identificación del vehículo: $ 1.780 (para cualquier vehículo)',
    arancelCubre: 'el Documento de Identificación Vehicular',
    fichaUrl: 'https://www.gub.uy/tramites/cambio-titularidad-vehiculo-transferencia-maldonado-0',
    fichaUpdatedAt: '2026-07-16',
    fuente: 'catalogo',
    turno: 'agenda-previa',
    requisitos: {
      identidad: 'si',
      div: 'si',
      soa: 'si',
      alDia: 'si',
      titulo: 'si',
      libreDePrenda: 'no-figura',
      inspeccion: 'condicional',
      domicilio: 'no-figura',
    },
    particularidad:
      'Pide inspección técnica sólo a los modelos anteriores a 2012 cuyo DIV no tiene identificado el número de chasis.',
  },
  {
    slug: 'cerro-largo',
    departamento: 'Cerro Largo',
    arancel: 1780,
    arancelTextual: 'Libreta de propiedad: $U 1780',
    arancelCubre: 'la libreta de propiedad',
    fichaUrl: 'https://www.gub.uy/tramites/transferencia-vehiculos-autos-similares-cerro-largo',
    fichaUpdatedAt: '2026-05-12',
    fuente: 'catalogo',
    turno: 'no-figura',
    requisitos: {
      identidad: 'si',
      div: 'si',
      soa: 'si',
      alDia: 'si',
      titulo: 'si',
      libreDePrenda: 'si',
      inspeccion: 'si',
      domicilio: 'si',
    },
    particularidad:
      'La lista más larga del lote: suma constancia de domicilio en el departamento y, si alguna de las partes es empresa, certificados de BPS y DGI.',
  },
  {
    slug: 'rivera',
    departamento: 'Rivera',
    arancel: 1780,
    arancelTextual: '1780 $',
    arancelCubre: 'el trámite de transferencia',
    fichaUrl: 'https://www.gub.uy/tramites/transferencia-vehiculos-rivera',
    fichaUpdatedAt: '2026-04-16',
    fuente: 'catalogo',
    turno: 'no-figura',
    requisitos: {
      identidad: 'si',
      div: 'no-figura',
      soa: 'si',
      alDia: 'no-figura',
      // Su lista no nombra el título de propiedad: pide una certificación notarial
      // (o del juzgado, si la transferencia es a herederos). No se cuenta como
      // «título» porque no es lo que la ficha escribe.
      titulo: 'no-figura',
      libreDePrenda: 'no-figura',
      inspeccion: 'si',
      domicilio: 'si',
    },
    particularidad:
      'La única que pide la cédula de la pareja del titular cuando hay matrimonio, y la única cuya lista resuelve la titularidad con una certificación notarial sin nombrar el título de propiedad.',
  },
  {
    slug: 'canelones',
    departamento: 'Canelones',
    arancel: 1620,
    arancelTextual: '1620 $',
    arancelCubre: 'el trámite de transferencia',
    fichaUrl:
      'https://www.gub.uy/tramites/cambio-titularidad-vehiculo-transferencia-canelones-titulo-singular-titulo-propiedad',
    fichaUpdatedAt: '2025-02-28',
    fuente: 'catalogo',
    turno: 'en-linea',
    requisitos: {
      identidad: 'si',
      div: 'si',
      soa: 'si',
      alDia: 'si',
      titulo: 'si',
      libreDePrenda: 'no-figura',
      inspeccion: 'no-figura',
      domicilio: 'no-figura',
    },
    particularidad:
      'El único que se puede iniciar en línea, y publica una ficha distinta por caso (con título, por comparecencia de ambas partes, por sucesión, por prescripción).',
  },
  {
    slug: 'san-jose',
    departamento: 'San José',
    arancel: 1419,
    arancelTextual: '1419 $',
    arancelCubre: 'el trámite de transferencia',
    fichaUrl: 'https://www.gub.uy/tramites/cambio-titularidad-transferencias-vehiculos-san-jose',
    fichaUpdatedAt: '2022-07-06',
    fuente: 'catalogo',
    turno: 'orden-de-llegada',
    requisitos: {
      identidad: 'si',
      div: 'si',
      soa: 'si',
      alDia: 'si',
      titulo: 'si',
      libreDePrenda: 'no-figura',
      inspeccion: 'no-figura',
      domicilio: 'no-figura',
    },
    particularidad:
      'El arancel más bajo del lote, y también la ficha más vieja: la suya no se actualiza desde 2022.',
  },
  {
    slug: 'treinta-y-tres',
    departamento: 'Treinta y Tres',
    arancel: null,
    arancelTextual: 'Consultar en dependencia.',
    arancelCubre: 'la ficha no cifra el trámite',
    fichaUrl: 'https://www.gub.uy/tramites/transferencia-municipal-vehicular-treinta-tres',
    fichaUpdatedAt: '2024-02-21',
    fuente: 'catalogo',
    turno: 'orden-de-llegada',
    requisitos: {
      identidad: 'si',
      div: 'no-figura',
      soa: 'si',
      alDia: 'no-figura',
      titulo: 'si',
      libreDePrenda: 'si',
      inspeccion: 'si',
      domicilio: 'no-figura',
    },
    particularidad:
      'Tiene ficha y no publica el arancel: dice «Consultar en dependencia». El pago se hace en la Red de Cobranzas.',
  },
  {
    slug: 'montevideo',
    departamento: 'Montevideo',
    arancel: null,
    arancelTextual: 'el instructivo oficial no publica costo',
    arancelCubre: 'la fuente legible no cifra el trámite',
    fichaUrl:
      'https://montevideo.gub.uy/sites/default/files/biblioteca/cambiodetitularidad-vehiculosregistrables_16.pdf',
    fichaUpdatedAt: '2021-11-16',
    fuente: 'portal-propio',
    turno: 'agenda-previa',
    requisitos: {
      identidad: 'si',
      div: 'si',
      soa: 'si',
      alDia: 'si',
      titulo: 'si',
      libreDePrenda: 'no-figura',
      inspeccion: 'condicional',
      domicilio: 'no-figura',
    },
    particularidad:
      'El único que pide Inspección Técnica Vehicular aprobada a todo vehículo con cinco años o más desde su primer empadronamiento, y exige el título inscripto en la Dirección General de Registros en forma definitiva.',
  },
])

/** El de Montevideo, que la página trata aparte por no venir del catálogo nacional. */
export const CAR_TRANSFER_MONTEVIDEO = CAR_TRANSFER_DEPARTMENTS.find(
  d => d.slug === 'montevideo'
) as CarTransferDepartment

/** Las fichas del catálogo nacional de trámites (gub.uy), sin Montevideo. */
export const CAR_TRANSFER_CATALOGUE = Object.freeze(
  CAR_TRANSFER_DEPARTMENTS.filter(d => d.fuente === 'catalogo')
)

/** Las que publican un arancel. Las únicas que entran en cualquier estadística de precio. */
export const CAR_TRANSFER_WITH_FEE = Object.freeze(
  CAR_TRANSFER_DEPARTMENTS.filter(
    (d): d is CarTransferDepartment & { arancel: number } => typeof d.arancel === 'number'
  )
)

/** El arancel más bajo publicado. */
export const carTransferMinFee = () => Math.min(...CAR_TRANSFER_WITH_FEE.map(d => d.arancel))

/** El arancel más alto publicado. */
export const carTransferMaxFee = () => Math.max(...CAR_TRANSFER_WITH_FEE.map(d => d.arancel))

/**
 * El arancel que más departamentos publican.
 *
 * Es la MODA y no el promedio a propósito: promediar $1.780 cinco veces con un
 * $1.419 de 2022 devuelve un número que ninguna intendencia cobra, que es
 * exactamente el error que `docs/app/PRECIOS.md` deja escrito sobre las canastas.
 */
export const CAR_TRANSFER_MODAL_FEE = 1780

/** Cuántos departamentos publican {@link CAR_TRANSFER_MODAL_FEE}. */
export const carTransferModalCount = () =>
  CAR_TRANSFER_WITH_FEE.filter(d => d.arancel === CAR_TRANSFER_MODAL_FEE).length

/** Los que se salen de la moda, del más caro al más barato. */
export const carTransferOffModal = () =>
  CAR_TRANSFER_WITH_FEE.filter(d => d.arancel !== CAR_TRANSFER_MODAL_FEE).sort(
    (a, b) => b.arancel - a.arancel
  )

/**
 * Por qué la dispersión no se lee como «acá sale más barato».
 *
 * Los dos departamentos que se salen de la moda tienen las dos fichas más viejas
 * del lote (Canelones 2025, San José 2022), y las cinco que coinciden en $1.780
 * están todas actualizadas en 2026. La hipótesis más simple es que el arancel se
 * reajusta y las fichas no se reescriben al mismo ritmo. No se afirma como hecho:
 * es lo que se ve, y la página lo dice así.
 */
export const CAR_TRANSFER_FEE_SPREAD_NOTE =
  'Los dos aranceles más bajos son también las dos fichas más viejas: la de Canelones es de 2025 y la de San José, de 2022. Las cinco que coinciden en el importe más alto se actualizaron en 2026. Antes de contar con el número más bajo, confirmalo en la intendencia.'

/** Cuántas fichas piden un requisito con «sí» (sin contar las condicionales). */
export const carTransferRequisitoCount = (field: keyof CarTransferRequisitos) =>
  CAR_TRANSFER_DEPARTMENTS.filter(d => d.requisitos[field] === 'si').length

/** Cuántas lo piden siempre o en algún caso. */
export const carTransferRequisitoCountWithConditional = (field: keyof CarTransferRequisitos) =>
  CAR_TRANSFER_DEPARTMENTS.filter(d => d.requisitos[field] !== 'no-figura').length

/**
 * Los requisitos que piden TODAS las fichas leídas.
 *
 * Es la única parte de esta página que vale como lista de preparación nacional: lo
 * que no está acá hay que mirarlo en la ficha del departamento donde está
 * empadronado el auto.
 */
export const carTransferUniversalRequisitos = () =>
  CAR_TRANSFER_REQUISITO_LABELS.filter(
    ({ field }) => carTransferRequisitoCount(field) === CAR_TRANSFER_DEPARTMENTS.length
  )

// ---------------------------------------------------------------------------
// Los departamentos sin ficha publicada
// ---------------------------------------------------------------------------

/**
 * Los departamentos para los que NO se encontró ficha del trámite.
 *
 * Buscado el {@link CAR_TRANSFER_VERIFIED_AT} de dos maneras: el buscador del
 * catálogo nacional y Google restringido a gub.uy, y además una prueba directa de
 * seis formas de URL que el propio catálogo usa para este trámite
 * (`transferencia-vehiculos-<depto>`, `transferencia-vehiculo-<depto>`,
 * `cambio-titularidad-vehiculo-transferencia-<depto>`,
 * `cambio-titularidad-transferencias-vehiculos-<depto>`,
 * `transferencia-municipal-vehicular-<depto>` y
 * `transferencia-cambio-titularidad-vehiculo-<depto>`): ninguna contestó 200.
 *
 * Esto NO dice que el trámite no exista ahí —existe en los diecinueve— ni que la
 * intendencia no lo publique en su propio sitio. Dice que el catálogo nacional, que
 * es donde el buscador manda a quien pregunta, no lo tiene.
 */
export const CAR_TRANSFER_NO_FICHA: readonly string[] = Object.freeze([
  'Artigas',
  'Colonia',
  'Durazno',
  'Flores',
  'Florida',
  'Río Negro',
  'Rocha',
  'Salto',
  'Soriano',
  'Tacuarembó',
])

/** Cuántos departamentos tienen fuente oficial leída acá. */
export const carTransferCoveredCount = () => CAR_TRANSFER_DEPARTMENTS.length

// ---------------------------------------------------------------------------
// Lo que el arancel no incluye, y lo que no se publica
// ---------------------------------------------------------------------------

export interface CarTransferUnpublished {
  readonly topic: string
  readonly why: string
}

export const CAR_TRANSFER_UNPUBLISHED: readonly CarTransferUnpublished[] = Object.freeze([
  {
    topic: 'Cuánto cobra el escribano',
    why: 'No lo cobra la intendencia y ninguna ficha lo tarifa. Suele ser el gasto más grande de la operación, así que ponerle un número de memoria sería el peor lugar para equivocarse.',
  },
  {
    topic: 'El arancel de Montevideo',
    why: 'Su ficha viva responde con una verificación de navegador que no se puede leer de forma automática, y el instructivo oficial del Servicio de Contralor y Registro de Vehículos —que sí se lee— lista requisitos sin costo.',
  },
  {
    topic: 'El certificado de libre de prenda y la inspección técnica',
    why: 'Tres fichas los exigen y ninguna de las nueve los cifra: se pagan aparte del arancel que figura más arriba.',
  },
  {
    topic: 'El plazo para presentar la transferencia en Montevideo',
    why: 'El Digesto departamental fija uno, pero normativa.montevideo.gub.uy no contestó al leerlo, así que no lo publicamos de segunda mano.',
  },
])

// ---------------------------------------------------------------------------
// Preguntas frecuentes
// ---------------------------------------------------------------------------

export interface CarTransferFaq {
  readonly question: string
  readonly answer: string
}

export const CAR_TRANSFER_FAQ: readonly CarTransferFaq[] = Object.freeze([
  {
    question: '¿Cuánto sale transferir un auto en Uruguay?',
    answer:
      'Cinco de los nueve departamentos con fuente oficial leída publican $1.780 por la libreta nueva (Lavalleja, Paysandú, Maldonado, Cerro Largo y Rivera), Canelones publica $1.620 y San José $1.419. Treinta y Tres tiene ficha y remite a consultar en la dependencia, y el instructivo de Montevideo que se puede leer no publica costo. Ese importe es el del documento del vehículo: el escribano, el libre de prenda y la inspección van aparte y ninguna ficha los tarifa.',
  },
  {
    question: '¿Por qué el precio cambia según el departamento?',
    answer:
      'Porque la transferencia es un trámite departamental: el registro de vehículos lo lleva la intendencia donde está empadronado el auto, y cada una fija su arancel. Además, los dos importes más bajos son también las dos fichas más viejas (Canelones 2025 y San José 2022), mientras las cinco que coinciden en $1.780 se actualizaron en 2026, así que parte de la diferencia puede ser la fecha de la ficha y no el departamento.',
  },
  {
    question: '¿Qué piden todas las intendencias?',
    answer:
      'Sólo dos cosas figuran en las nueve fichas leídas: documento de identidad de quien firma y Seguro Obligatorio de Automotores (SOA) vigente. Un título o compraventa que acredite la titularidad aparece en ocho de nueve. Lo demás varía: la libreta de propiedad y la patente al día figuran en seis, la inspección del vehículo en cuatro (más dos que la piden sólo en ciertos casos), el libre de prenda y embargo en tres y la constancia de domicilio en dos.',
  },
  {
    question: '¿Se puede hacer en línea?',
    answer:
      'De las fichas leídas, sólo Canelones permite iniciar el trámite en línea. Paysandú, Maldonado, Lavalleja y Montevideo piden agenda previa; San José y Treinta y Tres atienden por orden de llegada. Que el trámite arranque en línea no evita la firma certificada ni la presentación del vehículo cuando corresponde.',
  },
  {
    question: '¿Puedo transferir un auto con deuda de patente?',
    answer:
      'Seis de las nueve fichas exigen estar al día con la patente y sin multas pendientes para hacer el cambio de titular. La deuda sigue al vehículo a través del SUCIVE, así que no desaparece al cambiar de dueño: lo que hace es bloquear el trámite hasta que se pague o se convenga.',
  },
  {
    question: '¿Cuántos departamentos publican su ficha?',
    answer:
      'Buscando el 16 de noviembre de 2026 en el catálogo nacional de trámites encontramos ficha para ocho departamentos, y Montevideo publica su instructivo en su propio portal. Para los diez restantes —Artigas, Colonia, Durazno, Flores, Florida, Río Negro, Rocha, Salto, Soriano y Tacuarembó— no encontramos ficha en gub.uy: el trámite existe igual, hay que preguntarlo en la intendencia.',
  },
])

// ---------------------------------------------------------------------------
// Fuentes
// ---------------------------------------------------------------------------

export const CAR_TRANSFER_SOURCES: readonly CarTransferSource[] = Object.freeze([
  ...CAR_TRANSFER_DEPARTMENTS.map(d => ({
    label: `${d.departamento} — ${d.arancelTextual} (actualizada ${d.fichaUpdatedAt.split('-').reverse().join('/')})`,
    url: d.fichaUrl,
  })),
  {
    label: 'Intendencia de Montevideo — Cambio de titular en libreta de circulación (ficha viva)',
    url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/solicitud/cambio-de-titular-en-libreta-de-circulacion-por-parte-del-vendedor-vehiculos-con-afectacion',
  },
  {
    label: 'Ley 18.412 — Seguro Obligatorio de Automotores, que las nueve fichas exigen vigente',
    url: 'https://www.impo.com.uy/bases/leyes/18412-2008',
  },
])
