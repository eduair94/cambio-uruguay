// Cuánto sale la partida de nacimiento en Uruguay: aranceles, plazos y apostilla.
//
// Módulo PURO (sin Vue/Nuxt, sin estado global, imports relativos) para que
// `pages/cuanto-sale-la-partida-de-nacimiento-uruguay.vue` no duplique el
// catálogo y vitest lo pueda cargar en Node, igual que `utils/idCard.ts`.
//
// POR QUÉ ESTA PÁGINA. La partida es el papel que el sitio ya venía nombrando
// como requisito de otra cosa —la ciudadanía legal, la residencia Mercosur, la
// cédula de quien nació afuera, el matrimonio— en `utils/guidesTramites.ts` y
// `utils/residency.ts`, sin que ninguna página contestara cuánto sale ni cómo se
// pide. Era un hueco hacia adentro antes que hacia afuera: media docena de guías
// mandaban a buscar un documento que el sitio no explicaba.
//
// LA RESPUESTA QUE CAMBIÓ Y CASI NADIE SABE: desde el 01/01/2022 la partida es
// DIGITAL y no tiene costo. La pregunta «cuánto sale» ya no se contesta con un
// precio sino con una fecha — la de INSCRIPCIÓN del hecho, no la del trámite—, y
// eso es lo que esta página pone adelante. Para lo anterior sigue habiendo
// arancel: {@link PARTIDA_FEES}.
//
// LA REGLA DE LAS CIFRAS. Todo importe sale textual del bloque «Costos» de una
// ficha de trámite de gub.uy, leída el {@link PARTIDA_VERIFIED_AT}. Las tres
// fichas de partidas (nacimiento, matrimonio y defunción) publican el mismo par
// $153/$612, y por eso la página lo dice: quien busca la de matrimonio encuentra
// acá su número sin que haya que inventarle una página propia.
//
// LO QUE NO SE PUBLICA, A PROPÓSITO (ver {@link PARTIDA_UNPUBLISHED}): el
// recargo del medio de pago y la demora de la agenda. La ficha menciona el
// primero sin cifrarlo y no menciona el segundo.

/** Una fuente primaria: etiqueta legible + URL oficial. */
export interface PartidaSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo este archivo contra las fichas oficiales. */
export const PARTIDA_VERIFIED_AT = '2026-09-23'

/** Ruta de la página; el mismo slug en los tres idiomas (i18n prefija /en y /pt). */
export const PARTIDA_PATH = '/cuanto-sale-la-partida-de-nacimiento-uruguay'

// ---------------------------------------------------------------------------
// La fecha que decide el precio
// ---------------------------------------------------------------------------

/**
 * Desde qué inscripción la partida es digital y gratuita, para hechos ocurridos
 * en Uruguay.
 *
 * Textual de la ficha: «Las partidas de hechos inscriptos a partir del 01 de
 * enero del 2022, se encuentran en formato digital y se descargan directamente
 * en línea y sin costo».
 */
export const PARTIDA_DIGITAL_SINCE = '2022-01-01'

/**
 * El mismo corte para los hechos ocurridos en el EXTRANJERO e inscriptos acá,
 * que la ficha fija siete años antes: «Las partidas del extranjero inscriptas a
 * partir del año 2015 son en formato digital».
 *
 * Es un año y no una fecha porque así lo publica la ficha; inventarle un 1º de
 * enero sería precisión que la fuente no da.
 */
export const PARTIDA_FOREIGN_DIGITAL_SINCE_YEAR = 2015

/**
 * Si un hecho inscripto en esa fecha tiene partida digital (y por lo tanto
 * gratuita) o manuscrita (y por lo tanto con arancel).
 *
 * Lo que se pasa es la fecha de INSCRIPCIÓN del hecho, que para un nacimiento en
 * Uruguay es prácticamente la del nacimiento y para uno del extranjero puede ser
 * muchísimo posterior. De ahí el segundo parámetro.
 */
export function esDigital(inscripcionIso: string, origen: 'uruguay' | 'extranjero'): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inscripcionIso)) return false
  if (origen === 'extranjero') {
    return Number(inscripcionIso.slice(0, 4)) >= PARTIDA_FOREIGN_DIGITAL_SINCE_YEAR
  }
  return inscripcionIso >= PARTIDA_DIGITAL_SINCE
}

// ---------------------------------------------------------------------------
// Los aranceles
// ---------------------------------------------------------------------------

/** Una fila del cuadro de precios: una modalidad y su importe en pesos. */
export interface PartidaFee {
  /** Id estable, usado como `:key`. */
  readonly key: string
  /** Nombre de la modalidad tal como la llama la ficha oficial. */
  readonly label: string
  /** Importe en pesos uruguayos, textual del bloque «Costos». */
  readonly arancel: number
  /** Qué cubre, en una línea. */
  readonly cubre: string
  /** Cuándo la tenés en la mano, según la vía. */
  readonly entrega: string
}

/**
 * Los tres precios de una partida, incluido el cero.
 *
 * El digital va PRIMERO y con su arancel en 0 a propósito: es el caso mayoritario
 * de quien nació después de 2022 o necesita la partida de un hijo, y una tabla
 * que empieza en $153 le cobra mentalmente un trámite que no tiene que pagar.
 */
export const PARTIDA_FEES: readonly PartidaFee[] = [
  {
    key: 'digital',
    label: 'Partida digital',
    arancel: 0,
    cubre:
      'Hechos ocurridos en Uruguay e inscriptos desde el 1º de enero de 2022, y hechos del extranjero inscriptos desde 2015. «Las partidas digitales no tienen costo».',
    entrega: 'Se descarga en el momento, en línea o por WhatsApp al 091 365 724.',
  },
  {
    key: 'manuscrita-comun',
    label: 'Partida manuscrita, trámite común',
    arancel: 153,
    cubre: 'Todo lo inscripto antes de esas fechas, que se busca a mano en los libros.',
    entrega:
      'Pedida por internet, se retira a partir de 7 días hábiles del pago; con agenda presencial, a partir de 2 días hábiles.',
  },
  {
    key: 'manuscrita-urgente',
    label: 'Partida manuscrita, trámite urgente',
    arancel: 612,
    cubre: 'La misma partida manuscrita, apurada.',
    entrega:
      'Pedida por internet, a partir de 2 días hábiles del pago; con agenda presencial, se entrega en el día.',
  },
]

/** Índice por key, para que la página no busque en el array con `find` en cada render. */
export const PARTIDA_BY_KEY: Readonly<Record<string, PartidaFee>> = Object.freeze(
  Object.fromEntries(PARTIDA_FEES.map(fee => [fee.key, fee]))
)

/**
 * Cuántas veces el urgente sale lo que el común.
 *
 * Se calcula en vez de escribirse, como en `utils/idCard.ts`: si alguna vez se
 * actualiza un arancel no puede quedar un «cuatro veces» viejo al lado de dos
 * importes nuevos. Hoy da 4 exacto ($612 = $153 × 4), que es el dato que la
 * página cuenta: no es un recargo, es otro precio.
 */
export function recargoUrgente(): number {
  return PARTIDA_BY_KEY['manuscrita-urgente']!.arancel / PARTIDA_BY_KEY['manuscrita-comun']!.arancel
}

/** Lo que cuesta, en pesos, adelantar la entrega de 7 días hábiles a 2. */
export function sobreprecioUrgente(): number {
  return PARTIDA_BY_KEY['manuscrita-urgente']!.arancel - PARTIDA_BY_KEY['manuscrita-comun']!.arancel
}

// ---------------------------------------------------------------------------
// Las tres partidas que valen lo mismo
// ---------------------------------------------------------------------------

/**
 * Los hechos que se piden con este mismo trámite y este mismo arancel.
 *
 * Las tres fichas (nacimiento, matrimonio y defunción) publican el par
 * $153/$612 palabra por palabra, así que la página lo afirma con las tres
 * abiertas y no por analogía desde una.
 */
export const PARTIDA_SAME_FEE: readonly string[] = Object.freeze([
  'Nacimiento',
  'Reconocimiento',
  'Matrimonio',
  'Defunción',
])

// ---------------------------------------------------------------------------
// Apostilla y legalización
// ---------------------------------------------------------------------------

/** Un trámite del MRREE que se hace DESPUÉS de tener la partida, con su arancel. */
export interface PartidaApostilla {
  readonly key: string
  readonly label: string
  readonly arancel: number
  readonly paraQue: string
}

/**
 * Lo que sale hacerla valer afuera, que es el segundo tramo del gasto y vive en
 * otro organismo: la partida la emite el Registro Civil y la apostilla la pone
 * Cancillería, en otra dirección y con otra agenda.
 *
 * Importes «actualizados para el año 2026» según la propia ficha.
 */
export const PARTIDA_APOSTILLA: readonly PartidaApostilla[] = [
  {
    key: 'apostilla',
    label: 'Apostilla',
    arancel: 777,
    paraQue:
      'Para presentar la partida en un país del Convenio de La Haya. Se agenda y se paga antes de la cita.',
  },
  {
    key: 'legalizacion',
    label: 'Legalización',
    arancel: 379,
    paraQue: 'La vía para los países que no están en el convenio.',
  },
]

// ---------------------------------------------------------------------------
// Los datos que no son un precio y decidís con ellos igual
// ---------------------------------------------------------------------------

/** Un hecho publicado por la ficha que cambia qué trámite hacés, o si lo hacés. */
export interface PartidaFact {
  readonly key: string
  readonly titulo: string
  readonly detalle: string
}

export const PARTIDA_FACTS: readonly PartidaFact[] = [
  {
    // Sin el número del decreto en la key a propósito: el gate de secretos del repo marca
    // `key: '<algo con dígitos>'` como posible credencial, y un renombrado posterior no alcanza
    // porque el commit viejo sigue en el rango del escaneo. Ver AGENTS.md (raíz).
    key: 'exigibilidad',
    titulo: 'Puede que no te la puedan exigir',
    detalle:
      'La propia ficha abre con el Decreto 353/23: las entidades públicas «no podrán exigir requisitos adicionales a los aquí detallados ni solicitar certificados, constancias, testimonios u otra documentación cuando la información contenida en éstos pueda obtenerse a través de medios digitales seguros de otras entidades». Antes de pagar una manuscrita, preguntá en la oficina que te la pide.',
  },
  {
    key: 'vigencia',
    titulo: 'La partida no vence',
    detalle:
      '«Para la Dirección General del Registro de Estado Civil las partidas no pierden vigencia. La validez depende de la oficina donde sean presentadas las partidas.» O sea: el papel no caduca, pero quien te lo pide puede exigir una emisión reciente. Ese plazo lo pone esa oficina, no el Registro.',
  },
  {
    key: 'divorcio',
    titulo: 'El divorcio uruguayo no tiene partida propia',
    detalle:
      'Para acreditar un divorcio hecho en Uruguay se pide la partida de MATRIMONIO, «la que tendrá en su margen la inscripción del divorcio». Sólo los divorcios realizados en el extranjero se piden como partida aparte.',
  },
  {
    key: 'extranjero',
    titulo: 'Un hecho del exterior se inscribe primero',
    detalle:
      'Si el nacimiento, el matrimonio o la defunción ocurrieron afuera, hay que hacer la inscripción previa en la sección extranjeros; recién después existe una partida uruguaya que pedir. Las inscriptas desde 2015 se buscan en la opción «Datos registrales o actas del extranjero» y son digitales.',
  },
  {
    key: 'oficina',
    titulo: 'Montevideo emite las del interior',
    detalle:
      'La oficina de Avenida Uruguay 933 «emite partidas de cualquier fecha de hechos ocurridos en Montevideo y de hechos ocurridos en el Extranjero, también emite las partidas del interior del país». Atiende de lunes a viernes de 10:15 a 15:00, y para sólo retirar no hace falta agendarse.',
  },
  {
    key: 'whatsapp',
    titulo: 'El WhatsApp es sólo para las digitales',
    detalle:
      'El 091 365 724 contesta de forma automática y, si la partida está digitalizada, la descargás ahí mismo. Si es manuscrita, esa vía no sirve: hay que ir por internet o con agenda.',
  },
]

// ---------------------------------------------------------------------------
// Los plazos
// ---------------------------------------------------------------------------

/** Un plazo de entrega publicado por la ficha, por vía y modalidad. */
export interface PartidaDeadline {
  readonly key: string
  readonly via: string
  readonly plazo: string
}

/**
 * Los cuatro plazos de la manuscrita.
 *
 * La ficha los rotula «de forma transitoria […] hasta nuevo aviso», y la página
 * repite ese matiz: son los plazos de hoy, no una regla estable.
 */
export const PARTIDA_DEADLINES: readonly PartidaDeadline[] = [
  {
    key: 'comun-internet',
    via: 'Común, por internet',
    plazo:
      'Se retira en Uruguay 933 a partir de los 7 días hábiles del pago. A domicilio se suma la demora del Correo Uruguayo, unas 48 horas hábiles más.',
  },
  {
    key: 'comun-agenda',
    via: 'Común, con agenda',
    plazo: 'Se retira a partir de 2 días hábiles, en Uruguay 933.',
  },
  {
    key: 'urgente-internet',
    via: 'Urgente, por internet',
    plazo:
      'Se retira a partir de 2 días hábiles desde efectuado el pago; a domicilio, otra vez más la demora del Correo.',
  },
  {
    key: 'urgente-agenda',
    via: 'Urgente, con agenda',
    plazo: 'Se entrega en el día, en Uruguay 933.',
  },
]

// ---------------------------------------------------------------------------
// Lo que la fuente no publica
// ---------------------------------------------------------------------------

/** Un dato que la gente busca, que la fuente oficial NO publica, y por qué no lo inventamos. */
export interface PartidaUnpublished {
  readonly key: string
  readonly pregunta: string
  readonly porQue: string
}

export const PARTIDA_UNPUBLISHED: readonly PartidaUnpublished[] = [
  {
    key: 'medio-de-pago',
    pregunta: '¿Cuánto me cobra Abitab o Redpagos por pagarla?',
    porQue:
      'La ficha avisa que «a la solicitud de partidas manuscritas en línea se le suma el costo del sistema de pago que usted elija (Abitab, ANTEL, Banred, BROU, Redpagos, Red Nacional de Cobros y Pagos o Santander)» y no lo cifra. Así que $153 es un piso, no el total.',
  },
  {
    key: 'agenda',
    pregunta: '¿Cuánto tardan en darme agenda?',
    porQue:
      'Los plazos publicados van desde el pago hasta el retiro. El que va desde que pedís la agenda web hasta que te la dan no está publicado, y es el que decide si el trámite «urgente con agenda» te sirve de algo.',
  },
  {
    key: 'interior',
    pregunta: '¿Y si voy a la oficina de mi departamento?',
    porQue:
      'La ficha describe la oficina de Montevideo, que emite las partidas de todo el país. No publica ni el horario ni los plazos de las oficinas departamentales, así que acá tampoco: preguntá en la tuya antes de ir.',
  },
]

// ---------------------------------------------------------------------------
// Preguntas frecuentes
// ---------------------------------------------------------------------------

/** Una pregunta frecuente (también sale como Question en el JSON-LD FAQPage). */
export interface PartidaFaq {
  readonly question: string
  readonly answer: string
}

export const PARTIDA_FAQ: readonly PartidaFaq[] = [
  {
    question: '¿Cuánto sale la partida de nacimiento en Uruguay?',
    answer:
      'Depende de cuándo se inscribió el nacimiento, no de cuándo la pedís. Si fue desde el 1º de enero de 2022 la partida es digital y no tiene costo: se descarga en línea. Si es anterior, es manuscrita y sale $153 el trámite común o $612 el urgente, más el costo del medio de pago que elijas.',
  },
  {
    question: '¿Cómo saco la partida digital gratis?',
    answer:
      'Por el botón «Iniciar trámite en línea» de la ficha de gub.uy, con el número de cédula o con nombres, apellidos y fecha de nacimiento. El sistema te dice si está digitalizada y ahí mismo la descargás o te la manda por mail. La otra vía es el WhatsApp 091 365 724, que funciona sólo para las digitales.',
  },
  {
    question: '¿Cuánto tarda la partida manuscrita?',
    answer:
      'Pedida por internet, el trámite común se retira a partir de 7 días hábiles del pago y el urgente a partir de 2. Con agenda presencial son 2 días hábiles el común y el mismo día el urgente. La ficha aclara que son plazos transitorios, «hasta nuevo aviso». Si la pedís a domicilio, sumá unas 48 horas hábiles de Correo.',
  },
  {
    question: '¿La partida de nacimiento vence?',
    answer:
      'Para el Registro de Estado Civil no: «las partidas no pierden vigencia». Pero la propia ficha agrega que la validez depende de la oficina donde la presentes, así que un banco, un consulado o una escribanía pueden pedirte una emisión reciente aunque el documento en sí no caduque.',
  },
  {
    question: '¿La partida de matrimonio o de defunción sale distinto?',
    answer:
      'No. Las fichas de nacimiento, reconocimiento, matrimonio y defunción publican los mismos $153 y $612, y la misma regla de que lo inscripto desde 2022 es digital y gratis. Para acreditar un divorcio hecho en Uruguay no hay partida propia: se pide la de matrimonio, que lleva el divorcio anotado al margen.',
  },
  {
    question: '¿Cuánto sale apostillar la partida para usarla en el exterior?',
    answer:
      'La apostilla sale $777 y la legalización $379, valores de 2026 publicados por Cancillería. Es otro trámite, en otro organismo y con otra agenda: se hace en el MRREE, Cuareim 1384, de lunes a viernes de 09:30 a 12:30 y de 14:00 a 15:30, y se paga antes de reservar el cupo.',
  },
  {
    question: '¿Me pueden exigir la partida en papel?',
    answer:
      'No siempre. El Decreto 353/23, citado en la propia ficha, prohíbe a las entidades públicas pedir testimonios o constancias cuando esa información se puede obtener por medios digitales seguros de otras entidades. Vale la pena preguntarlo antes de pagar una manuscrita.',
  },
]

// ---------------------------------------------------------------------------
// Fuentes
// ---------------------------------------------------------------------------

/** Las fuentes primarias, verificadas el {@link PARTIDA_VERIFIED_AT}. */
export const PARTIDA_SOURCES: readonly PartidaSource[] = [
  {
    label:
      'gub.uy — Solicitud de partidas, Nacimiento (MEC, Dirección Nacional del Registro de Estado Civil): «Trámite común: $153 (ciento cincuenta y tres pesos uruguayos). Trámite urgente: $ 612 (seiscientos doce pesos uruguayos)», «Las partidas digitales no tienen costo», los cuatro plazos transitorios de entrega, la vigencia y el WhatsApp 091365724. Última actualización de la ficha: 28/07/2026',
    url: 'https://www.gub.uy/tramites/solicitud-partidas-nacimiento',
  },
  {
    label:
      'gub.uy — Solicitud de partidas: el corte digital, «Las partidas de hechos inscriptos a partir del 01 de enero del 2022, se encuentran en formato digital y se descargan directamente en línea y sin costo», y el de las partidas del extranjero inscriptas desde 2015',
    url: 'https://www.gub.uy/tramites/solicitud-partidas',
  },
  {
    label:
      'gub.uy — Solicitud de partidas, Matrimonio: el mismo par $153 / $612 y la misma gratuidad de las digitales, que es lo que permite afirmar que el arancel no cambia según el hecho',
    url: 'https://www.gub.uy/tramites/solicitud-partidas-matrimonio',
  },
  {
    label:
      'gub.uy — Solicitud de partidas, Defunción: idem, más la nota de que a la solicitud en línea se le suma el costo del sistema de pago elegido',
    url: 'https://www.gub.uy/tramites/solicitud-partidas-defuncion',
  },
  {
    label:
      'gub.uy — Apostilla y/o legalización de documentos públicos (MRREE): «Costos actualizados para el año 2026: Apostilla: $777 (pesos uruguayos setecientos setenta y siete). Legalización: $379 (pesos uruguayos trescientos setenta y nueve)», con la dirección de Cuareim 1384 y su horario',
    url: 'https://www.gub.uy/tramites/apostilla-yo-legalizacion-documentos-publicos-uruguayos-extranjeros-produzcan-efectos-exterior-republica',
  },
]
