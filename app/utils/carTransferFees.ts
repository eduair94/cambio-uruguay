// Cuánto sale transferir un auto en Uruguay: el importe de la libreta y qué pide
// cada intendencia.
//
// Módulo PURO (sin Vue/Nuxt, sin estado global, imports relativos) para que
// `pages/cuanto-sale-transferir-un-auto-uruguay.vue` no duplique el catálogo y
// vitest lo pueda cargar en Node, igual que `utils/birthCertificate.ts` y
// `utils/idCard.ts`.
//
// POR QUÉ ESTA PÁGINA. El sitio ya tenía la guía `/guias/transferir-un-auto-uruguay`,
// y lo que esa guía contestaba sobre los requisitos era, textual, «Cada intendencia
// puede pedir requisitos algo distintos, así que conviene consultar de antemano en
// la intendencia correspondiente». La transferencia se hace en la intendencia donde
// está empadronado el auto, y las listas de requisitos que publican las intendencias
// no coinciden (y no todas publican una): esta página pone en una pantalla las que
// pudimos leer.
//
// EL PRECIO NO ES DEPARTAMENTAL. La primera versión de esta página (16/11/2026)
// leyó tres importes distintos en las fichas —$1.780, $1.620 y $1.419— y escribió
// que «cada intendencia fija su arancel». No es así: el importe de la libreta (el
// Documento de Identificación Vehicular, DIV) lo fija el Congreso de Intendentes en
// el Texto Ordenado del SUCIVE, que se remite «a todas las Intendencias», y para
// 2026 es {@link CAR_TRANSFER_DIV_2026} ({@link CAR_TRANSFER_DIV_2026_SOURCE}). Las
// cinco fichas actualizadas en 2026 lo publican redondeado; San José publica
// exactamente el importe del Texto Ordenado de 2022 ({@link CAR_TRANSFER_DIV_2022})
// en una ficha que no se toca desde 2022. Los números distintos son fichas viejas,
// no departamentos más baratos, y la página lo dice como hecho.
//
// LA REGLA DE LAS CIFRAS. El importe nacional sale textual del Texto Ordenado. Lo
// que dice cada ficha sale textual de su bloque «Costos», leída una por una el
// {@link CAR_TRANSFER_VERIFIED_AT}, y cada departamento guarda la URL y la fecha de
// «Última actualización» que la propia ficha muestra
// ({@link CarTransferDepartment.fichaUpdatedAt}).
//
// LO QUE NO SE PUBLICA, A PROPÓSITO (ver {@link CAR_TRANSFER_UNPUBLISHED}): el costo
// del escribano (ninguna ficha lo tarifa, porque no lo cobra la intendencia), el
// precio del libre de prenda y de la inspección, y el plazo del Digesto montevideano
// para presentar la transferencia (`normativa.montevideo.gub.uy` no contestó).

/** Una fuente primaria: etiqueta legible + URL oficial. */
export interface CarTransferSource {
  readonly label: string
  readonly url: string
}

/** Una cita textual de una fuente primaria, con su URL. */
export interface CarTransferQuote {
  readonly label: string
  readonly url: string
  readonly quote: string
}

/** Fecha en la que se leyó fuente por fuente todo lo que hay en este archivo. */
export const CAR_TRANSFER_VERIFIED_AT = '2026-11-20'

/** Ruta de la página; el mismo slug en los tres idiomas (i18n prefija /en y /pt). */
export const CAR_TRANSFER_PATH = '/cuanto-sale-transferir-un-auto-uruguay'

/** Cuántos departamentos tiene el país, para decir «N de 19» sin escribir 19 dos veces. */
export const URUGUAY_DEPARTMENTS = 19

// ---------------------------------------------------------------------------
// El importe nacional: Texto Ordenado del SUCIVE
// ---------------------------------------------------------------------------

/** Año de vigencia de {@link CAR_TRANSFER_DIV_2026}. */
export const CAR_TRANSFER_DIV_YEAR = 2026

/**
 * La libreta de propiedad y circulación (DIV) en 2026: 700 unidades de 2013 por el
 * factor de actualización 2,542173922.
 */
export const CAR_TRANSFER_DIV_2026 = 1779.52

/** Las unidades de 2013 que el Texto Ordenado asigna al DIV, y el factor de 2026. */
export const CAR_TRANSFER_DIV_UNITS = 700
export const CAR_TRANSFER_DIV_FACTOR_2026 = 2.542173922

export const CAR_TRANSFER_DIV_2026_SOURCE: CarTransferQuote = Object.freeze({
  label:
    'Texto Ordenado del SUCIVE 2026 (Circular DAV 180/2025 del Congreso de Intendentes, aprobado en la 6.ª sesión plenaria del 14/11/2025)',
  url: 'https://www.gub.uy/congreso-intendentes/sites/congreso-intendentes/files/2026-02/CIRCULAR%20DAV%20180-25%20texto%20ordenado%202026,%20info%20sistema%20(23.12.25).pdf',
  quote: 'LIBRETA DE PROPIEDAD Y CIRCULACION 700 x 2,542173922= 1.779,52',
})

/** A quién se remite el Texto Ordenado: a todas las intendencias, no a una. */
export const CAR_TRANSFER_TOS_SCOPE_QUOTE =
  'Se remite a todas las Intendencias, a los efectos de los artículos 273 y 275 de la Constitución, el TEXTO ORDENADO DEL SUCIVE 2026'

/**
 * Artículo 9 del mismo Texto Ordenado: qué se puede cobrar por un trámite de un
 * vehículo. En una transferencia que mantiene la matrícula, lo que se entrega es la
 * libreta nueva.
 */
export const CAR_TRANSFER_TOS_ART9_QUOTE =
  'Por todas las acciones, trámites y/o gestiones que los contribuyentes y/o interesados realicen en las oficinas Departamentales o Municipales referidas a un vehículo de transporte, solo pagarán los siguientes conceptos'

/**
 * La salvedad del mismo artículo 9: las tasas propias de cada intendencia por el
 * servicio al que está afectado el vehículo. Por eso el «no cambia según el
 * departamento» vale para un auto particular y la FAQ lo dice.
 */
export const CAR_TRANSFER_TOS_ART9_EXCEPTION_QUOTE =
  'Sin perjuicio de lo anterior, se abonarán las tasas y/o precios específicos que cada Gobierno Departamental tenga establecido por acciones, trámites y/o gestiones relacionadas con la inscripción, habilitación y/o control exigible como consecuencia del servicio a que está afectado el vehículo.'

/** Artículo 45: la deuda bloquea la transferencia, en todo el SUCIVE. */
export const CAR_TRANSFER_TOS_ART45_QUOTE =
  'No podrá transferirse un vehículo que deba patente, multas, cuotas de convenios interdepartamentales o montos por chapas matrículas o DIV, aunque no haya vencido el plazo para su pago.'

/** El DIV en el Texto Ordenado de 2022, que es el número que publica San José. */
export const CAR_TRANSFER_DIV_2022 = 1419.24

export const CAR_TRANSFER_DIV_2022_SOURCE: CarTransferQuote = Object.freeze({
  label: 'Texto Ordenado del SUCIVE 2022 (publicado por la Intendencia de Montevideo)',
  url: 'https://montevideo.gub.uy/sites/default/files/biblioteca/sucivetextoordenado2022_0.pdf',
  quote: 'Libreta de propiedad y circulación 700x2,027491826= 1.419,24',
})

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
// Un departamento con fuente oficial leída
// ---------------------------------------------------------------------------

export interface CarTransferDepartment {
  /** Slug estable del departamento (no se usa en URLs públicas todavía). */
  readonly slug: string
  readonly departamento: string
  /**
   * El importe que la ficha publica, en pesos uruguayos, o `null` si la ficha
   * existe pero no lo cifra. Es lo que DICE la ficha, no lo que se cobra: el importe
   * vigente es {@link CAR_TRANSFER_DIV_2026} en todas.
   */
  readonly arancel: number | null
  /** Textual del bloque «Costos» de la ficha. */
  readonly arancelTextual: string
  /** Qué cubre ese importe según la propia ficha. */
  readonly arancelCubre: string
  readonly fichaUrl: string
  /** La fecha de «Última actualización» que muestra la ficha, en ISO. */
  readonly fichaUpdatedAt: string
  /** `catalogo` = gub.uy/tramites; `portal-propio` = el sitio de la intendencia. */
  readonly fuente: 'catalogo' | 'portal-propio'
  readonly turno: CarTransferTurno
  readonly requisitos: CarTransferRequisitos
  /** Lo que esta ficha pide y las demás no, en una línea. */
  readonly particularidad: string
}

/**
 * Las fuentes leídas, ordenadas por importe publicado descendente y, a igual
 * importe, por fecha de actualización.
 *
 * Montevideo va al final a propósito y no por orden: es el único cuya fuente no es
 * el catálogo nacional y su instructivo no cifra el trámite.
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
      'La única que nombra la promesa de compraventa con firmas certificadas, suscrita entre quien figura en la libreta y el nuevo titular, como alternativa a la fotocopia de los títulos.',
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
      'Exonera del libre de prenda y embargo a las motos y a los tráilers de carga menor a 10.000 kg. A los demás se lo pide con no más de 24 horas, como Treinta y Tres.',
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
    // «Retira un número para ser atendido y solicita el trámite.»
    turno: 'orden-de-llegada',
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
    // «Trámite sin agenda, por número en orden de llegada»
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
      'La ficha más vieja del lote, sin actualizar desde 2022: publica $1.419, que es exactamente el importe del Texto Ordenado del SUCIVE de 2022 ($1.419,24).',
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
    // La ficha no dice nada de turnos ni de agenda.
    turno: 'no-figura',
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
      'Tiene ficha y no publica el importe: dice «Consultar en dependencia», y el pago se hace en la Red de Cobranzas. Pide el libre de prendas con vigencia de 24 horas, como Paysandú.',
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

/** Las fichas del catálogo nacional de trámites (gub.uy/tramites), sin Montevideo. */
export const CAR_TRANSFER_CATALOGUE = Object.freeze(
  CAR_TRANSFER_DEPARTMENTS.filter(d => d.fuente === 'catalogo')
)

/** Las que publican un importe. */
export const CAR_TRANSFER_WITH_FEE = Object.freeze(
  CAR_TRANSFER_DEPARTMENTS.filter(
    (d): d is CarTransferDepartment & { arancel: number } => typeof d.arancel === 'number'
  )
)

/**
 * Lo que publican las fichas al día: {@link CAR_TRANSFER_DIV_2026} redondeado al
 * peso. Es el número que imprime el título de la página.
 */
export const CAR_TRANSFER_MODAL_FEE = 1780

/** Las fichas que publican {@link CAR_TRANSFER_MODAL_FEE}. */
export const carTransferCurrentFichas = () =>
  CAR_TRANSFER_WITH_FEE.filter(d => d.arancel === CAR_TRANSFER_MODAL_FEE)

/** Cuántas fichas publican {@link CAR_TRANSFER_MODAL_FEE}. */
export const carTransferModalCount = () => carTransferCurrentFichas().length

/** Las fichas que publican otro número (desactualizadas), de la más cara a la más barata. */
export const carTransferOffModal = () =>
  CAR_TRANSFER_WITH_FEE.filter(d => d.arancel !== CAR_TRANSFER_MODAL_FEE).sort(
    (a, b) => b.arancel - a.arancel
  )

/**
 * Por qué dos fichas dicen otro número. Es un hecho y no una hipótesis: San José
 * publica el importe exacto del Texto Ordenado de 2022, y ninguna de las dos publica
 * el de 2026.
 */
export const CAR_TRANSFER_FEE_SPREAD_NOTE =
  'Los números distintos no son departamentos más baratos: son fichas sin actualizar. San José publica $1.419 en una ficha de 2022, y $1.419,24 es exactamente lo que fijaba el Texto Ordenado del SUCIVE de 2022. Canelones publica $1.620 en una ficha de febrero de 2025. En las dos se paga el importe vigente, que en 2026 es $1.779,52.'

/** Cuántas fichas piden un requisito con «sí» (sin contar las condicionales). */
export const carTransferRequisitoCount = (field: keyof CarTransferRequisitos) =>
  CAR_TRANSFER_DEPARTMENTS.filter(d => d.requisitos[field] === 'si').length

/** Cuántas lo piden siempre o en algún caso. */
export const carTransferRequisitoCountWithConditional = (field: keyof CarTransferRequisitos) =>
  CAR_TRANSFER_DEPARTMENTS.filter(d => d.requisitos[field] !== 'no-figura').length

/**
 * Los requisitos que piden TODAS las fuentes leídas.
 *
 * Es la única parte de esta página que vale como lista de preparación común: lo
 * que no está acá hay que mirarlo en la ficha del departamento donde está
 * empadronado el auto.
 */
export const carTransferUniversalRequisitos = () =>
  CAR_TRANSFER_REQUISITO_LABELS.filter(
    ({ field }) => carTransferRequisitoCount(field) === CAR_TRANSFER_DEPARTMENTS.length
  )

/** Los departamentos con un turno dado, en el orden del catálogo. */
export const carTransferByTurno = (turno: CarTransferTurno) =>
  CAR_TRANSFER_DEPARTMENTS.filter(d => d.turno === turno).map(d => d.departamento)

// ---------------------------------------------------------------------------
// Los departamentos sin ficha en el catálogo nacional
// ---------------------------------------------------------------------------

/**
 * Los departamentos sin ficha del trámite en el catálogo nacional de trámites
 * (gub.uy/tramites).
 *
 * Buscado en el buscador del catálogo y probando seis formas de URL que el propio
 * catálogo usa para este trámite (`transferencia-vehiculos-<depto>`,
 * `transferencia-vehiculo-<depto>`, `cambio-titularidad-vehiculo-transferencia-<depto>`,
 * `cambio-titularidad-transferencias-vehiculos-<depto>`,
 * `transferencia-municipal-vehicular-<depto>` y
 * `transferencia-cambio-titularidad-vehiculo-<depto>`): ninguna contestó 200.
 *
 * Esto NO dice que el trámite no exista ahí —existe en los diecinueve— ni que la
 * intendencia no lo publique en su propio sitio: tres sí lo hacen
 * ({@link CAR_TRANSFER_OWN_PORTALS}). Dice que el catálogo nacional no lo tiene.
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

export interface CarTransferOwnPortal {
  readonly departamento: string
  readonly url: string
  /** Qué publica esa página, en una línea. */
  readonly publica: string
}

/**
 * Departamentos sin ficha en el catálogo nacional que publican el trámite en el
 * portal propio de la intendencia. No entran en las tablas comparadas (que se
 * armaron sobre las nueve fuentes de {@link CAR_TRANSFER_DEPARTMENTS}); se listan
 * con lo que muestran, leídos el {@link CAR_TRANSFER_VERIFIED_AT}.
 */
export const CAR_TRANSFER_OWN_PORTALS: readonly CarTransferOwnPortal[] = Object.freeze([
  {
    departamento: 'Salto',
    url: 'https://www.salto.gub.uy/servicios/transferencia',
    publica: 'dirección y horario de atención, sin requisitos ni costo',
  },
  {
    departamento: 'Tacuarembó',
    url: 'https://tacuarembo.gub.uy/?p=394',
    publica:
      'los requisitos de la transferencia presencial, por carta poder y por título, sin costo',
  },
  {
    departamento: 'Río Negro',
    url: 'https://www.rionegro.gub.uy/gabinete-2025-2030/departamento-de-transito/',
    publica:
      'los requisitos y una tabla de valores actualizada el 25/01/2024, con «Transferencia $ 1.621»',
  },
])

/** Cuántos departamentos tienen fuente oficial leída y comparada acá. */
export const carTransferCoveredCount = () => CAR_TRANSFER_DEPARTMENTS.length

// ---------------------------------------------------------------------------
// Lo que el importe no incluye, y lo que no se publica
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
    topic: 'El certificado de libre de prenda y la inspección técnica',
    why: 'El libre de prenda figura en tres fichas y la inspección en cuatro (más dos que la piden en algún caso); ninguna de las nueve los cifra: se pagan aparte de la libreta.',
  },
  {
    topic: 'El plazo para presentar la transferencia en Montevideo',
    why: 'No pudimos leer el Digesto departamental (normativa.montevideo.gub.uy no contestó), así que no publicamos un plazo de segunda mano.',
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
      'Lo que cobra la intendencia es la libreta nueva (el Documento de Identificación Vehicular), y en 2026 sale $1.779,52 en cualquier departamento: el importe lo fija el Texto Ordenado del SUCIVE que el Congreso de Intendentes remite a todas las intendencias. Las cinco fichas oficiales actualizadas en 2026 (Lavalleja, Paysandú, Maldonado, Cerro Largo y Rivera) lo publican redondeado, $1.780. El escribano, el libre de prenda y la inspección van aparte y ninguna ficha los tarifa.',
  },
  {
    question: '¿El precio cambia según el departamento?',
    answer:
      'No, para un auto particular. El Texto Ordenado del SUCIVE dice que por los trámites de un vehículo «solo pagarán» las matrículas, el documento de identificación del vehículo (DIV) y los documentos que se pidan, por los importes que fija ese mismo texto, el que el Congreso de Intendentes remite a todas las intendencias. La única salvedad que prevé el mismo artículo son las tasas propias de cada intendencia por la inscripción, habilitación o control que exija «el servicio a que está afectado el vehículo», como un taxi, un remise o un transporte de carga. Si una ficha dice otro número es porque está desactualizada: San José publica $1.419 en una ficha de 2022, que es el importe del Texto Ordenado de 2022 ($1.419,24), y Canelones $1.620 en una ficha de febrero de 2025.',
  },
  {
    question: '¿Qué piden todas las intendencias?',
    answer:
      'Sólo dos cosas figuran en las nueve fuentes leídas: documento de identidad de quien firma y Seguro Obligatorio de Automotores (SOA) vigente. Un título o compraventa que acredite la titularidad aparece en ocho de nueve. Lo demás varía: la libreta de propiedad y la patente al día figuran en seis, la inspección del vehículo en cuatro (más dos que la piden sólo en ciertos casos), el libre de prenda y embargo en tres y la constancia de domicilio en dos.',
  },
  {
    question: '¿Se puede hacer en línea?',
    answer:
      'De las fuentes leídas, sólo Canelones permite iniciar el trámite en línea. Lavalleja, Paysandú, Maldonado y Montevideo piden agenda previa; Cerro Largo y San José atienden por número, en orden de llegada. Que el trámite arranque en línea no evita la firma certificada ni la presentación del vehículo cuando corresponde.',
  },
  {
    question: '¿Puedo transferir un auto con deuda de patente?',
    answer:
      'No, en ningún departamento. El Texto Ordenado del SUCIVE (artículo 45) dice: «No podrá transferirse un vehículo que deba patente, multas, cuotas de convenios interdepartamentales o montos por chapas matrículas o DIV, aunque no haya vencido el plazo para su pago». Es la regla de todo el sistema, aunque sólo seis de las nueve fichas pongan la patente al día en su lista.',
  },
  {
    question: '¿Cuántos departamentos publican su ficha?',
    answer:
      'En el catálogo nacional de trámites (gub.uy/tramites) encontramos ficha para ocho departamentos, y Montevideo publica su instructivo en su propio portal. Los diez restantes —Artigas, Colonia, Durazno, Flores, Florida, Río Negro, Rocha, Salto, Soriano y Tacuarembó— no tienen ficha en el catálogo; Salto, Tacuarembó y Río Negro publican el trámite en el portal de su intendencia, y en los demás hay que preguntarlo en la intendencia.',
  },
])

// ---------------------------------------------------------------------------
// Fuentes
// ---------------------------------------------------------------------------

export const CAR_TRANSFER_SOURCES: readonly CarTransferSource[] = Object.freeze([
  { label: CAR_TRANSFER_DIV_2026_SOURCE.label, url: CAR_TRANSFER_DIV_2026_SOURCE.url },
  { label: CAR_TRANSFER_DIV_2022_SOURCE.label, url: CAR_TRANSFER_DIV_2022_SOURCE.url },
  ...CAR_TRANSFER_DEPARTMENTS.map(d => ({
    label: `${d.departamento} — ${d.arancelTextual} (actualizada ${d.fichaUpdatedAt.split('-').reverse().join('/')})`,
    url: d.fichaUrl,
  })),
  ...CAR_TRANSFER_OWN_PORTALS.map(p => ({
    label: `${p.departamento} — portal de la intendencia: ${p.publica}`,
    url: p.url,
  })),
  {
    label: 'Intendencia de Montevideo — Cambio de titular en libreta de circulación (ficha viva)',
    url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/solicitud/cambio-de-titular-en-libreta-de-circulacion-por-parte-del-vendedor-vehiculos-con-afectacion',
  },
  {
    label: 'Ley 18.412 — Seguro Obligatorio de Automotores, que las nueve fuentes exigen vigente',
    url: 'https://www.impo.com.uy/bases/leyes/18412-2008',
  },
])
