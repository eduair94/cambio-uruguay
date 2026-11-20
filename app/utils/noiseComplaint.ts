// Content + template builder for `/denunciar-ruidos-molestos-uruguay`.
//
// PURE module (no Vue/Nuxt runtime, relative imports only) so vitest exercises
// it in plain Node and the page only renders it.
//
// WRITING RULE FOR THIS FILE — the prose follows ASD-STE100 (Simplified
// Technical English) adapted to Spanish, because a reader consults this page
// while a problem is happening and has to act, not interpret:
//
//   - One idea per sentence. Short sentences.
//   - Active voice, present tense: "La Intendencia mide el ruido", never
//     "el ruido es medido".
//   - ONE word per meaning. Always "denuncia" (never "queja" or "reclamo"),
//     always "ruido" (never "sonido", "bullicio" or "estruendo"), always
//     "Intendencia", "local", "vecino", "vivienda".
//   - Steps are numbered and imperative: "Anotá la fecha y la hora."
//   - No ambiguous pronouns. Repeat the noun instead.
//
// SOURCING RULE — every figure below carries the source that states it. What no
// source states, this file does not claim. Two real gaps are stated as gaps
// rather than papered over:
//
//   1. The Intendencia de Montevideo MEASUREMENT procedure (SIME) is written for
//      COMMERCIAL and INDUSTRIAL premises. No equivalent measurement procedure is
//      published for a private neighbour, and pretending otherwise sends the
//      reader to a form that does not fit the case.
//   2. The Ministerio de Ambiente complaint form does not list noise among its
//      subjects, even though Ley 17.852 makes the ministry competent for
//      acoustic quality standards.
//
// WHAT THE FIRST VERSION GOT WRONG (fixed 2026-10-19). It said a neighbour had no
// channel at all, and the page listed one phone number, a weekday office. Two
// channels do exist for the noise that is happening NOW, and they are what the
// searches ask for ("teléfono", "a dónde llamar", "911"): the Intendencia's
// Convivencia Departamental central takes denuncias 24 hours a day on 1950 5000,
// and its own report of 25/08/2026 lists "fiestas o reuniones en fincas
// particulares" among the denuncias it answered; and Ley 17.852 art. 13 obliges
// the Policía Nacional to act at once against the noise of an extraordinary or
// non-permanent activity — a party — which is what 911 is for. Gap 1 above still
// stands: neither channel is a measurement.

/** An external source backing a claim on the page. */
export interface NoiseSource {
  label: string
  url: string
  publisher: string
}

/** The sources every figure on the page is taken from. */
export const NOISE_SOURCES: readonly NoiseSource[] = Object.freeze([
  {
    label: 'Ley 17.852 — Prevención, vigilancia y corrección de la contaminación acústica',
    url: 'https://www.impo.com.uy/bases/leyes/17852-2004',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label: 'Molestias por ruidos, humo y olores — requisitos, canales y oficina',
    url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/denuncia/molestias-ruidos-molestos-humo-y-olores',
    publisher: 'Intendencia de Montevideo',
  },
  {
    label: 'Ruidos molestos — límites en decibeles y qué está prohibido',
    url: 'https://montevideo.gub.uy/areas-tematicas/convivencia/ruidos-molestos',
    publisher: 'Intendencia de Montevideo',
  },
  {
    label: 'Digesto departamental, art. D.2011.1 y D.2011.2 (Dto. JDM 23.845 de 30/12/1987)',
    url: 'https://normativa.montevideo.gub.uy/articulos/69048',
    publisher: 'Normativa Departamental de Montevideo',
  },
  {
    label: 'Denuncias de ambiente — canales, costo y pruebas que piden',
    url: 'https://www.gub.uy/tramites/denuncias-ambiente',
    publisher: 'Ministerio de Ambiente',
  },
  // Appended, never inserted: `sourceIndex` points into this list by position.
  {
    label: 'Servicio de Convivencia Departamental — Central de Radio, denuncias las 24 horas',
    url: 'https://montevideo.gub.uy/institucional/dependencias/servicio-de-convivencia-departamental',
    publisher: 'Intendencia de Montevideo',
  },
  {
    label:
      'Noche de la Nostalgia: la central de Convivencia respondió denuncias por ruidos molestos y por fiestas en fincas particulares (25/08/2026)',
    url: 'https://montevideo.gub.uy/noticias/noche-de-la-nostalgia-2546-vehiculos-fiscalizados-y-129-inspecciones',
    publisher: 'Intendencia de Montevideo',
  },
  {
    label:
      'Ley 17.852, art. 13 — la Policía tiene que hacer cesar el ruido de una actividad extraordinaria',
    url: 'https://www.impo.com.uy/bases/leyes/17852-2004/13',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label: 'Ley 17.852, art. 10 — los límites alcanzan también a las actividades domésticas',
    url: 'https://www.impo.com.uy/bases/leyes/17852-2004/10',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label:
      'Guía de Recursos 2025 — 9-1-1 Emergencia Policial: gratuita, incluso sin saldo, las 24 horas',
    url: 'https://www.gub.uy/ministerio-interior/sites/ministerio-interior/files/documentos/publicaciones/GuiaDeRecursos2025finalizado.pdf',
    publisher: 'Ministerio del Interior',
  },
  // 10–26, added 2026-11-20: the departments outside Montevideo, the case table,
  // the hours and the fines. Appended for the same reason as above.
  {
    label: 'Denuncia de contaminación acústica — Canelones',
    url: 'https://www.gub.uy/tramites/denuncia-contaminacion-acustica-canelones',
    publisher: 'Intendencia de Canelones (gub.uy)',
  },
  {
    label: 'Solicitud de servicios — Maldonado (teléfono, formulario y oficinas)',
    url: 'https://www.gub.uy/tramites/solicitud-servicios-maldonado',
    publisher: 'Intendencia de Maldonado (gub.uy)',
  },
  {
    label: 'Ordenanza sobre ruidos molestos de Maldonado, arts. D.319 a D.358',
    url: 'https://digesto.maldonado.gub.uy/armado-capitulo/293',
    publisher: 'Digesto Departamental de Maldonado',
  },
  {
    label: 'Maldonado, art. R.281 — horarios de alta temporada (diciembre a febrero)',
    url: 'https://digesto.maldonado.gub.uy/detalle-articulo/668',
    publisher: 'Digesto Departamental de Maldonado',
  },
  {
    label: 'Ruidos molestos — Oficina de Ruidos Molestos de Salto',
    url: 'https://salto.gub.uy/servicios/ruidos-molestos',
    publisher: 'Intendencia de Salto',
  },
  {
    label: 'Contaminación acústica — División Medio Ambiente de Rivera',
    url: 'https://www.rivera.gub.uy/medioambiente/informacion/contaminacion/',
    publisher: 'Intendencia de Rivera',
  },
  {
    label: 'Solicitud de inspección — Rivera',
    url: 'https://www.gub.uy/tramites/solicitud-inspeccion-rivera',
    publisher: 'Intendencia de Rivera (gub.uy)',
  },
  {
    label: 'Denuncias de ruidos molestos — Lavalleja',
    url: 'https://www.gub.uy/tramites/denuncias-ruidos-molestos-lavalleja',
    publisher: 'Intendencia de Lavalleja (gub.uy)',
  },
  {
    label:
      'Digesto departamental, Vol. VI, cap. IX «De los ruidos molestos», arts. D.1991 a D.2014.2',
    url: 'https://normativa.montevideo.gub.uy/armado/68899',
    publisher: 'Normativa Departamental de Montevideo',
  },
  {
    label: 'Régimen Punitivo Departamental, sección IX, art. 10 «Ruidos molestos»',
    url: 'https://normativa.montevideo.gub.uy/content/regimen-punitivo-departamental',
    publisher: 'Normativa Departamental de Montevideo',
  },
  {
    label: 'Buzón Ciudadano — WhatsApp y formulario web',
    url: 'https://montevideo.gub.uy/buzon-ciudadano',
    publisher: 'Intendencia de Montevideo',
  },
  {
    label: 'Mediación comunitaria — voluntaria, gratuita y confidencial',
    url: 'https://www.gub.uy/defensoria-de-vecinas-y-vecinos-de-montevideo/programas/mediacion-comunitaria-una-herramienta-para',
    publisher: 'Defensoría de Vecinas y Vecinos de Montevideo',
  },
  {
    label: 'Asuntos, reclamos, consultas y propuestas — teléfonos, WhatsApp y oficina',
    url: 'https://www.gub.uy/tramites/asuntos-reclamos-consultas-yo-propuestas',
    publisher: 'Defensoría de Vecinas y Vecinos de Montevideo',
  },
  {
    label:
      'Ley 10.751 (propiedad horizontal), art. 9 — nadie puede perturbar la tranquilidad de los demás',
    url: 'https://www.impo.com.uy/bases/leyes/10751-1946/9',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label: 'Ley 10.751, art. 10 — la multa que fija el Juez',
    url: 'https://www.impo.com.uy/bases/leyes/10751-1946/10',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label: 'Ley 17.852, art. 14 — responde también quien facilita el ruido',
    url: 'https://www.impo.com.uy/bases/leyes/17852-2004/14',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label: 'Digesto departamental, art. D.4227 — denuncia por instalaciones mecánicas',
    url: 'https://normativa.montevideo.gub.uy/articulo/80514',
    publisher: 'Normativa Departamental de Montevideo',
  },
])

/** Date the norms and procedures on this page were checked against their source. */
export const NOISE_VERIFIED_AT = '2026-11-20'

/** The Intendencia de Montevideo line that takes denuncias at any hour (source index 5). */
export const NOISE_NIGHT_LINE = '1950 5000'

/** One noise limit, with the source that states it. */
export interface NoiseLimit {
  /** What the limit applies to. */
  subject: string
  /** The figure as the source states it. */
  value: string
  /** When it applies, or `''` when it applies always. */
  when: string
  /** Index into {@link NOISE_SOURCES}. */
  sourceIndex: number
}

/**
 * The limits Montevideo publishes.
 *
 * Two things a reader must understand before using them. The limit is measured
 * INSIDE the complainant's dwelling, not at the noise source. And these are
 * departmental limits: Ley 17.852 art. 8 delegates the national levels to the
 * ministry, so what a Montevideo inspector applies is the departmental figure.
 */
export const NOISE_LIMITS: readonly NoiseLimit[] = Object.freeze([
  {
    subject: 'Ruido dentro de tu vivienda',
    value: '45 dB(A)',
    when: 'De 7.00 a 22.00 horas',
    sourceIndex: 1,
  },
  {
    subject: 'Ruido dentro de tu vivienda',
    value: '39 dB(A)',
    when: 'De 22.00 a 7.00 horas',
    sourceIndex: 1,
  },
  {
    subject: 'Bailes y espectáculos públicos de interés social',
    value: '56 dB(A) como tope absoluto',
    when: 'Siempre',
    sourceIndex: 3,
  },
  { subject: 'Motos', value: '88 dB', when: 'Siempre', sourceIndex: 2 },
  {
    subject: 'Vehículos de menos de 3,5 toneladas',
    value: '85 dB',
    when: 'Siempre',
    sourceIndex: 2,
  },
  {
    subject: 'Vehículos de 3,5 toneladas o más',
    value: '92 dB',
    when: 'Siempre',
    sourceIndex: 2,
  },
])

/** A channel that receives the denuncia. */
export interface NoiseChannel {
  id: string
  /** Who receives it. */
  authority: string
  /** What this channel is for. */
  scope: string
  /** How to reach it. */
  how: string
  /**
   * `true` when a source says the channel has no cost, `false` when a source says
   * it has one, `null` when no source says either. The last one is printed as
   * such: a phone line is not "sin costo" just because nobody published a fee.
   */
  free: boolean | null
  /** Contact string (phone or email), or `''`. */
  contact: string
  /** Public URL of the procedure. */
  url: string
  sourceIndex: number
}

/** The cost column, worded from {@link NoiseChannel.free}. */
export function noiseChannelCost(channel: NoiseChannel): string {
  if (channel.free === true) return 'Sin costo'
  if (channel.free === false) return 'Con costo'
  return 'No lo publica'
}

/**
 * Where a denuncia goes.
 *
 * Ordered by how most readers will use them: the two lines that answer while the
 * noise is happening first (that is what "teléfono" and "911" searches ask), then
 * the free municipal channels, the paid measurement counter, and the national
 * environmental route last.
 */
export const NOISE_CHANNELS: readonly NoiseChannel[] = Object.freeze([
  {
    id: 'convivencia',
    authority: 'Convivencia Departamental (Intendencia de Montevideo)',
    scope:
      'Ruido que está pasando ahora, a cualquier hora: fiestas o reuniones en una vivienda, locales y vía pública',
    how: 'Por teléfono, las 24 horas, o por correo',
    free: null,
    contact: '1950 5000 · denuncias.convivencia@imm.gub.uy',
    url: 'https://montevideo.gub.uy/institucional/dependencias/servicio-de-convivencia-departamental',
    sourceIndex: 5,
  },
  {
    id: 'policia',
    authority: 'Policía (Ministerio del Interior)',
    scope:
      'Una fiesta o un evento puntual que no para. La ley obliga a la Policía a actuar de inmediato para hacer cesar el ruido',
    how: 'Por teléfono, al 911, las 24 horas',
    free: true,
    contact: '911',
    url: 'https://www.impo.com.uy/bases/leyes/17852-2004/13',
    sourceIndex: 7,
  },
  {
    // The trámite (source 1) names the Buzón as a free online channel; its own
    // page (source 20) gives the WhatsApp line and the hours.
    id: 'buzon',
    authority: 'Buzón Ciudadano (Intendencia de Montevideo)',
    scope: 'Ruido de un local comercial o industrial',
    how: 'Formulario web o WhatsApp, de lunes a viernes de 8.00 a 19.00',
    free: true,
    contact: 'WhatsApp 099 019500',
    url: 'https://montevideo.gub.uy/buzon-ciudadano',
    sourceIndex: 20,
  },
  {
    id: 'ccz',
    authority: 'Centro Comunal Zonal',
    scope: 'Ruido de un local comercial o industrial',
    how: 'En persona, en el Centro Comunal Zonal que te corresponde',
    free: true,
    contact: '',
    url: 'https://montevideo.gub.uy/areas-tematicas/convivencia/ruidos-molestos',
    sourceIndex: 2,
  },
  {
    id: 'defensoria',
    authority: 'Defensoría de Vecinas y Vecinos de Montevideo',
    scope:
      'Conflicto con un vecino que se repite. Ofrece mediación comunitaria: voluntaria, gratuita y confidencial',
    how: 'En línea, por teléfono, por WhatsApp o en 25 de Mayo 604, oficina 105, de 10.00 a 16.00',
    free: true,
    contact: '2917 0042 · 0800 1616 · WhatsApp 098 187 301',
    url: 'https://www.gub.uy/tramites/asuntos-reclamos-consultas-yo-propuestas',
    sourceIndex: 22,
  },
  {
    id: 'sime',
    authority: 'Servicio de Instalaciones Mecánicas y Eléctricas (SIME)',
    scope: 'Ruido de un local comercial o industrial. Es la oficina que mide',
    how: 'En persona, con agenda previa. Este canal tiene costo',
    free: false,
    contact: '1950 4686 · sime@imm.gub.uy',
    url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/denuncia/molestias-ruidos-molestos-humo-y-olores',
    sourceIndex: 1,
  },
  {
    id: 'ambiente',
    authority: 'Ministerio de Ambiente',
    scope: 'Denuncia ambiental. Podés hacerla desde cualquier punto del país',
    how: 'En línea, por teléfono o en Juncal 1385, piso 5, de lunes a viernes de 9.15 a 16.00',
    free: true,
    contact: '2917 3380 int. 5051',
    url: 'https://www.gub.uy/tramites/denuncias-ambiente',
    sourceIndex: 4,
  },
])

/** One step of the procedure, emitted as HowToStep JSON-LD. */
export interface NoiseStep {
  name: string
  text: string
}

/** What to do, in order. */
export const NOISE_STEPS: readonly NoiseStep[] = Object.freeze([
  {
    name: 'Registrá cada episodio',
    text: 'Anotá la fecha, la hora de inicio y la hora de fin de cada episodio de ruido. Un registro de varias semanas vale más que una denuncia por una sola noche.',
  },
  {
    name: 'Identificá el origen exacto',
    text: 'Anotá la calle y el número del local o de la vivienda que genera el ruido. La Intendencia pide ese dato para poder inspeccionar.',
  },
  {
    name: 'Guardá pruebas con fecha',
    text: 'Grabá audio o video. El archivo guarda la fecha y la hora. Sacá también fotos de los equipos de sonido si están a la vista.',
  },
  {
    name: 'Hablá primero con quien genera el ruido',
    text: 'Pedí que bajen el volumen. Dejá constancia escrita de ese pedido, por mensaje o por correo. Muchas denuncias se evitan en este paso.',
  },
  {
    name: 'Elegí el canal que corresponde',
    text: 'Si el ruido está pasando ahora, llamá a la central de Convivencia de la Intendencia de Montevideo, al 1950 5000, que atiende las 24 horas. Si es una fiesta o un evento puntual que no para, llamá al 911. Si el ruido viene de un local comercial o industrial y se repite, pedí la medición ante la Intendencia: el buzón ciudadano y el Centro Comunal Zonal no tienen costo.',
  },
  {
    name: 'Presentá la denuncia con los tres datos obligatorios',
    text: 'La Intendencia pide la calle y el número del local denunciado, tu dirección y tu teléfono, y el motivo de la denuncia.',
  },
  {
    name: 'Guardá el número de trámite',
    text: 'Pedí el número de la denuncia. Con ese número reclamás el seguimiento y probás la fecha en que denunciaste.',
  },
  {
    name: 'Pedí la medición',
    text: 'El SIME es la oficina que mide el ruido. La medición se hace dentro de tu vivienda, porque el límite se define ahí.',
  },
])

/** Something to do, or to avoid, before filing. */
export interface NoiseTip {
  title: string
  body: string
}

/** What to resolve before you file. */
export const NOISE_TIPS: readonly NoiseTip[] = Object.freeze([
  {
    title: 'Hablá antes de denunciar',
    body: 'Un pedido directo resuelve la mayoría de los casos. Una denuncia contra un vecino con el que vas a seguir conviviendo tiene un costo que el trámite no te devuelve. Dejá el pedido por escrito: si después denunciás, ese mensaje prueba que intentaste resolverlo.',
  },
  {
    title: 'El registro es la prueba, no tu memoria',
    body: 'Anotá cada episodio en el momento. Fecha, hora de inicio, hora de fin y qué se escucha. Un cuaderno con veinte entradas fechadas sostiene una denuncia. "Todas las noches hacen ruido" no la sostiene.',
  },
  {
    title: 'Una app de decibeles no es una medición',
    body: 'El teléfono no es un sonómetro calibrado. La app te sirve para decidir si vale la pena denunciar. No la presentes como prueba: quien mide es el SIME, y mide dentro de tu vivienda.',
  },
  {
    title: 'Fijate quién genera el ruido',
    body: 'El trámite de medición de la Intendencia está escrito para locales comerciales e industriales. Si el ruido viene de un vecino particular, ese formulario no encaja. Lo que sí encaja es el momento: mientras el ruido está pasando, la central de Convivencia (1950 5000) recibe denuncias las 24 horas, también por fiestas o reuniones en viviendas. Si el problema se repite, consultá en tu Centro Comunal Zonal cuál es la vía en tu caso.',
  },
  {
    title: 'Si vivís en un edificio, leé el reglamento de copropiedad',
    body: 'El reglamento fija horarios y obligaciones entre unidades. La administración puede intimar al propietario antes de que intervenga la Intendencia. Esa vía suele ser más rápida. Si el edificio no tiene reglamento, rige igual la Ley 10.751: ningún propietario ni inquilino puede perturbar la tranquilidad de los demás.',
  },
  {
    title: 'Denunciá con la mayor cantidad de vecinos posible',
    body: 'Varias denuncias por el mismo local pesan más que una. Coordiná con los vecinos afectados y presenten cada uno la suya, con su propia dirección.',
  },
])

/** What to do for one kind of noise source, with the norm that covers it. */
export interface NoiseCase {
  id: string
  /** Who makes the noise. */
  who: string
  /** What to do while the noise is happening. */
  now: string
  /** What to do when the noise repeats. */
  repeated: string
  /** What the norm says, with its article. */
  norm: string
  /** Indexes into {@link NOISE_SOURCES}. */
  sourceIndexes: readonly number[]
}

/**
 * The case table: the visible search tail of this page asks BY CASE ("de un
 * vecino", "en un edificio", "un local de fiestas", "en la calle"). The channels
 * are the Montevideo ones; the norm column names the article, so a reader can
 * check it. Ley 17.852 is national and rules in every department.
 */
export const NOISE_CASES: readonly NoiseCase[] = Object.freeze([
  {
    id: 'vecino',
    who: 'Un vecino en una casa o un apartamento: música, fiesta o reunión',
    now: `Llamá a la central de Convivencia de la Intendencia, al ${NOISE_NIGHT_LINE}, que atiende las 24 horas. Si es una fiesta que no para, llamá al 911.`,
    repeated:
      'Pedile por escrito que baje el volumen y anotá cada episodio. La Defensoría de Vecinas y Vecinos ofrece mediación sin costo. Consultá en tu Centro Comunal Zonal cuál es la vía. Para un vecino particular no hay un trámite de medición publicado.',
    norm: 'El Digesto de Montevideo prohíbe el ruido molesto «en ambientes públicos o privados» (art. D.1991) y lo aplica a toda persona (art. D.1993). La Ley 17.852 aplica los límites también a las actividades domésticas (art. 10).',
    sourceIndexes: [5, 7, 21, 18, 8],
  },
  {
    id: 'edificio',
    who: 'Un vecino del mismo edificio',
    now: `Llamá al ${NOISE_NIGHT_LINE}, las 24 horas, o al 911 si es una fiesta que no para. Avisá a la administración.`,
    repeated:
      'Pedí a la administración que intime al propietario. El administrador o cualquier propietario puede pedirle al Juez una multa y que el ruido cese. Si alquilás, pedíselo al administrador o al propietario.',
    norm: 'Ley 10.751, art. 9: ningún propietario puede «ejecutar acto alguno que perturbe la tranquilidad de los demás propietarios», y rige también para el inquilino. La prohibición está en la ley: rige aunque el edificio no tenga reglamento. Art. 10: el Juez fija una multa entre 0,5 % y 20 % del valor catastral del apartamento y puede disponer que el ruido cese.',
    sourceIndexes: [23, 24, 5, 7],
  },
  {
    id: 'local',
    who: 'Un bar, un boliche, un salón de fiestas, un club o un comercio',
    now: `Llamá a la central de Convivencia, al ${NOISE_NIGHT_LINE}, que atiende las 24 horas.`,
    repeated:
      'Presentá la denuncia sin costo en el Buzón Ciudadano o en el Centro Comunal Zonal. El SIME es la oficina que mide, y ese trámite tiene costo.',
    norm: 'Las salas de espectáculos y de reuniones sociales funcionan solo si tienen la aislación adecuada «para no turbar el reposo o la tranquilidad de los vecinos» (art. D.1997). Responde también quien colabora con la infracción o la facilita (art. D.2012), y la Ley 17.852 dice lo mismo en todo el país (art. 14). La música de los espectáculos públicos la controla el Sector Espectáculos Públicos de la Intendencia.',
    sourceIndexes: [5, 1, 20, 18, 25],
  },
  {
    id: 'maquinas',
    who: 'Máquinas, extractores o equipos de un local',
    now: `La central de Convivencia (${NOISE_NIGHT_LINE}) recibe denuncias por locales las 24 horas.`,
    repeated: 'Presentá la denuncia por escrito ante el SIME, que es la oficina que mide.',
    norm: 'Si la denuncia se comprueba, el propietario de las instalaciones paga las inspecciones (art. D.4227). Una máquina fijada a una pared medianera sin aislación tiene su propia multa (Régimen Punitivo, art. 10).',
    sourceIndexes: [5, 26, 19],
  },
  {
    id: 'calle',
    who: 'En la calle o en un espacio público: parlantes o propaganda con altavoces',
    now: `Llamá al ${NOISE_NIGHT_LINE}, las 24 horas, o al 911 si es un evento que no para.`,
    repeated:
      'Anotá la fecha, la hora y el lugar de cada episodio, y repetí la denuncia en la central de Convivencia cada vez.',
    norm: 'El capítulo de ruidos rige en las vías y espacios públicos (art. D.1994). La propaganda con amplificadores o altavoces está prohibida salvo autorización (arts. D.1998 y D.1999).',
    sourceIndexes: [5, 7, 18],
  },
  {
    id: 'vehiculos',
    who: 'Motos y autos',
    now: 'La página de la Intendencia no publica un canal para denunciar un vehículo: los fiscalizan inspectores del Servicio de Vigilancia.',
    repeated:
      'Si el vehículo supera el límite, el infractor tiene cinco días hábiles para regularizarlo.',
    norm: 'Límites: 88 dB para motos, 85 dB para vehículos de menos de 3,5 toneladas y 92 dB para los de 3,5 toneladas o más. La Intendencia informa una multa superior a $ 6.000, y 10 UR si el vehículo no se regulariza en el plazo.',
    sourceIndexes: [2],
  },
])

/** The visible answer to "hasta qué hora se puede hacer ruido". */
export const NOISE_HOURS_ANSWER =
  'No hay una hora a partir de la cual el ruido pasa a estar permitido: el límite rige todo el día. Lo que cambia a las 22.00 es el límite: en Montevideo baja de 45 a 39 dB(A), medido dentro de la vivienda de quien denuncia. La Intendencia de Montevideo publica el límite por franja horaria, sin un valor distinto para sábados, domingos o feriados.'

/** One rule tied to the hour of the day. */
export interface NoiseHourRule {
  place: 'Montevideo' | 'Maldonado'
  /** What the rule applies to. */
  subject: string
  /** The limit or the prohibition. */
  rule: string
  /** When it applies. */
  when: string
  sourceIndex: number
}

export const NOISE_HOUR_RULES: readonly NoiseHourRule[] = Object.freeze([
  {
    place: 'Montevideo',
    subject: 'Ruido dentro de tu vivienda',
    rule: '45 dB(A)',
    when: 'De 7.00 a 22.00',
    sourceIndex: 1,
  },
  {
    place: 'Montevideo',
    subject: 'Ruido dentro de tu vivienda',
    rule: '39 dB(A)',
    when: 'De 22.00 a 7.00',
    sourceIndex: 1,
  },
  {
    place: 'Montevideo',
    subject: 'Campanas, sirenas o similares',
    rule: 'Prohibidas (art. D.2001)',
    when: 'De 22 a 6',
    sourceIndex: 18,
  },
  {
    place: 'Montevideo',
    subject: 'Carga o descarga ruidosa de mercaderías',
    rule: 'Prohibida, salvo en lugares autorizados (art. D.2006)',
    when: 'De 22 a 6',
    sourceIndex: 18,
  },
  {
    place: 'Maldonado',
    subject: 'Dormitorios de una vivienda',
    rule: '35 dBA',
    when: 'Sin límite horario',
    sourceIndex: 12,
  },
  {
    place: 'Maldonado',
    subject: 'Áreas de relacionamiento de una vivienda',
    rule: '40 dBA',
    when: 'De 0 a 7',
    sourceIndex: 12,
  },
  {
    place: 'Maldonado',
    subject: 'Áreas de relacionamiento de una vivienda',
    rule: '50 dBA',
    when: 'De 7 a 0',
    sourceIndex: 12,
  },
  {
    place: 'Maldonado',
    subject: 'Trabajos que generan ruido, en las zonas urbanizadas costeras',
    rule: 'Prohibidos (art. R.281)',
    when: 'Antes de las 9.00 y después de las 22.00, de diciembre a febrero',
    sourceIndex: 13,
  },
])

/** One fine, as the departmental norm states it. */
export interface NoiseFine {
  jurisdiction: 'Montevideo' | 'Maldonado'
  offence: string
  /** In UR, as the norm states it. Never converted to pesos here. */
  amount: string
  sourceIndex: number
}

/**
 * The fines, in Unidades Reajustables. The vehicle items of the Montevideo
 * Régimen Punitivo (nums. 8, 9 and 13) are left out on purpose: art. D.2014.2
 * sends vehicle noise to another article and the Intendencia's own page states
 * other figures, so vehicles are covered only from that page (NOISE_CASES).
 */
export const NOISE_FINES: readonly NoiseFine[] = Object.freeze([
  {
    jurisdiction: 'Montevideo',
    offence: 'Ruidos excesivos',
    amount: 'Leve 2 UR · mediana 7 UR · grave 15 UR',
    sourceIndex: 19,
  },
  {
    jurisdiction: 'Montevideo',
    offence:
      'Local donde se trabaja de noche sin precauciones para no molestar a las viviendas próximas',
    amount: 'Leve 2 UR · mediana 7 UR · grave 15 UR',
    sourceIndex: 19,
  },
  {
    jurisdiction: 'Montevideo',
    offence: 'Máquina o herramienta fijada a una pared medianera sin aislación',
    amount: 'Leve 2 UR · mediana 7 UR · grave 15 UR',
    sourceIndex: 19,
  },
  {
    jurisdiction: 'Montevideo',
    offence: 'Sala de reuniones sociales sin la aislación adecuada',
    amount: '2 UR',
    sourceIndex: 19,
  },
  {
    jurisdiction: 'Montevideo',
    offence: 'Propaganda con amplificadores o altavoces desde un local hacia el espacio público',
    amount: '15 UR',
    sourceIndex: 19,
  },
  {
    jurisdiction: 'Montevideo',
    offence: 'Campanas, pitos o sirenas entre las 22 y las 6',
    amount: '2 UR',
    sourceIndex: 19,
  },
  {
    jurisdiction: 'Montevideo',
    offence: 'Carga o descarga ruidosa de mercaderías de 22 a 6, fuera de zonas autorizadas',
    amount: '5 UR',
    sourceIndex: 19,
  },
  {
    jurisdiction: 'Montevideo',
    offence:
      'Bailes, espectáculos públicos o reuniones afines cuyo ruido llega a las viviendas vecinas sobre el límite (arts. D.2011.1 a D.2011.3)',
    amount: 'Desde 10 UR, y se puede llegar a la clausura definitiva',
    sourceIndex: 18,
  },
  {
    jurisdiction: 'Maldonado',
    offence: 'Local que supera el nivel de la tabla por hasta 20 dB',
    amount: '5 UR',
    sourceIndex: 12,
  },
  {
    jurisdiction: 'Maldonado',
    offence: 'Local que supera el nivel por más de 20 dB y hasta 30 dB',
    amount: '10 UR',
    sourceIndex: 12,
  },
  {
    jurisdiction: 'Maldonado',
    offence: 'Local que supera el nivel por más de 30 dB',
    amount: '15 UR',
    sourceIndex: 12,
  },
  {
    jurisdiction: 'Maldonado',
    offence:
      'Local cuyo ruido genera un conflicto de convivencia en una zona residencial o balnearia',
    amount: '70 UR',
    sourceIndex: 12,
  },
  {
    jurisdiction: 'Maldonado',
    offence: 'Reiteración en menos de seis meses',
    amount: 'Se duplica la multa',
    sourceIndex: 12,
  },
])

/** Where to file outside Montevideo, as each Intendencia publishes it. */
export interface NoiseDepartment {
  id: string
  name: string
  /** Channels: phone, online, office. */
  where: string
  /** Hours of each channel. */
  when: string
  /** Same tri-state as {@link NoiseChannel.free}. */
  free: boolean | null
  /** The fee as the source states it, when `free` is `false`. */
  fee: string
  /** What data the procedure asks for. */
  asks: string
  /**
   * The identity data the source says the procedure asks for, or `''` when it
   * does not publish what personal data it asks for.
   */
  identity: string
  /** Extra sourced detail, or `''`. */
  note: string
  /** The official page (also `NOISE_SOURCES[sourceIndex].url`). */
  url: string
  /** The source's own "última actualización", or `''` when it prints none. */
  updated: string
  sourceIndex: number
  /**
   * Other entries of {@link NOISE_SOURCES} that back a claim of the row, when
   * the main page does not state it (Rivera's "no phone complaints" comes from
   * the Intendencia's own site, not from its gub.uy procedure page).
   */
  extraSourceIndexes?: readonly number[]
}

/**
 * The five departments outside Montevideo with a current official page that
 * names a channel for noise. The other thirteen are not listed because, on
 * {@link NOISE_DEPARTMENTS_SEARCHED_AT}, no such page was found for them — a
 * search result, not a statement that no channel exists.
 */
export const NOISE_DEPARTMENTS: readonly NoiseDepartment[] = Object.freeze([
  {
    id: 'canelones',
    name: 'Canelones',
    where:
      'Por teléfono al 1828, interno 83. En línea. En persona, en la Dirección de Contralor (Tolentino González 375)',
    when: 'Teléfono: las 24 horas, todos los días. Oficina: lunes a viernes de 9.00 a 15.30',
    free: true,
    fee: '',
    asks: 'Nombre, cédula, dirección y padrón, teléfono y correo',
    identity: 'nombre, cédula, dirección y padrón',
    note: '',
    url: 'https://www.gub.uy/tramites/denuncia-contaminacion-acustica-canelones',
    updated: '06/10/2026',
    sourceIndex: 10,
  },
  {
    id: 'maldonado',
    name: 'Maldonado',
    where:
      'Por teléfono al 4222 3333, la línea de solicitudes de la Intendencia. Formulario en línea. En persona, en el Centro de Atención a la Comunidad (Acuña de Figueroa y Burnett) o en tu Municipio',
    when: 'Teléfono: las 24 horas, los 365 días. Oficina: lunes a viernes de 9.15 a 14.45',
    free: true,
    fee: '',
    asks: 'El formulario de solicitud. No publica qué datos personales pide',
    identity: '',
    note: 'La ordenanza de ruidos admite la denuncia por escrito o por teléfono, las 24 horas (art. D.351), y la medición dentro de las habitaciones si la pedís (art. D.329).',
    url: 'https://www.gub.uy/tramites/solicitud-servicios-maldonado',
    updated: '23/06/2026',
    sourceIndex: 11,
  },
  {
    id: 'salto',
    name: 'Salto',
    where:
      'Oficina de Ruidos Molestos, Zorrilla y 19 de Abril. Denuncias al 092 343 985. Trámite en línea',
    when: 'Lunes a jueves de 7 a 15. Viernes y sábados de 22 a 6',
    free: null,
    fee: '',
    asks: 'El detalle de la denuncia, en «observaciones». No publica qué datos personales pide',
    identity: '',
    note: '',
    url: 'https://salto.gub.uy/servicios/ruidos-molestos',
    updated: '',
    sourceIndex: 14,
  },
  {
    id: 'rivera',
    name: 'Rivera',
    where:
      'En persona, en la División Medio Ambiente (Bouchacourt 1013, Tribuna Sur del Estadio) o en tu Municipio o Junta. No toma denuncias por teléfono: el 462 31355 es para consultas sobre la ordenanza',
    when: 'Lunes a viernes de 8.15 a 15.00',
    free: true,
    fee: '',
    asks: 'Ser mayor de 18 años y presentar el documento de identidad',
    identity: 'el documento de identidad, y solo lo pueden hacer mayores de 18 años',
    note: '',
    url: 'https://www.gub.uy/tramites/solicitud-inspeccion-rivera',
    updated: '20/04/2026',
    sourceIndex: 16,
    extraSourceIndexes: [15],
  },
  {
    id: 'lavalleja',
    name: 'Lavalleja',
    where:
      'En persona, con una nota escrita, en Reguladora de Trámites (José Batlle y Ordóñez 546, Minas), después de pagar en Tesorería. Teléfono 4442 2752, interno 121',
    when: 'Lunes a viernes de 8.30 a 14.30. En verano, de 8.00 a 14.00',
    free: false,
    fee: '$ 150',
    asks: 'Nombre, cédula, teléfono y correo, el problema, la dirección y un horario para ir',
    identity: 'nombre y cédula',
    note: '',
    url: 'https://www.gub.uy/tramites/denuncias-ruidos-molestos-lavalleja',
    updated: '22/06/2026',
    sourceIndex: 17,
  },
])

/** The day the other thirteen departments were searched without a result. */
export const NOISE_DEPARTMENTS_SEARCHED_AT = '2026-11-19'

/** The cost column of {@link NOISE_DEPARTMENTS}, worded from the tri-state. */
export function noiseDepartmentCost(department: NoiseDepartment): string {
  if (department.free === true) return 'Sin costo'
  if (department.free === false)
    return department.fee ? `Con costo: ${department.fee}` : 'Con costo'
  return 'No lo publica'
}

/** Whether the department's procedure asks who you are, worded from the source. */
export function noiseDepartmentIdentity(department: NoiseDepartment): string {
  return department.identity
    ? `Pide ${department.identity}`
    : 'No publica qué datos personales pide'
}

/** One question and its answer, emitted as FAQPage JSON-LD. */
export interface NoiseFaq {
  q: string
  a: string
}

export const NOISE_FAQS: readonly NoiseFaq[] = Object.freeze([
  {
    q: '¿A qué número llamo por ruidos molestos en Montevideo?',
    a: 'Al 1950 5000. Es la central de denuncias de Convivencia Departamental de la Intendencia de Montevideo y atiende las 24 horas. También recibe denuncias por correo, en denuncias.convivencia@imm.gub.uy. El 25 de agosto de 2026 la Intendencia informó que esa central recibió y respondió denuncias por ruidos molestos y por fiestas o reuniones en fincas particulares. El 1950 a secas es la atención general de la Intendencia, en horario de oficina. Si es una fiesta que no para, también podés llamar al 911.',
  },
  {
    q: '¿Puedo llamar al 911 por ruidos molestos?',
    a: 'Sí, si es una fiesta o un evento puntual que no para. La Ley 17.852, en su artículo 13, obliga a la Policía Nacional a actuar de inmediato para hacer cesar el ruido de una actividad extraordinaria o no permanente que perturba la tranquilidad. La llamada al 911 es gratuita, incluso sin saldo, según el Ministerio del Interior. Si el ruido se repite todas las semanas, armá además el registro de episodios y presentá la denuncia ante la Intendencia.',
  },
  {
    q: '¿Hasta qué hora se puede hacer ruido?',
    a: 'No hay una hora a partir de la cual el ruido pasa a estar permitido: el límite rige todo el día. En Montevideo es 45 dB(A) de 7.00 a 22.00 horas y 39 dB(A) de 22.00 a 7.00 horas, medido dentro de la vivienda de quien denuncia. Las 22.00 no son la hora desde la que se puede denunciar: son la hora en que el límite baja. La Ley 17.852, en su artículo 10, aplica los límites también a las actividades domésticas. En otro departamento rige la norma de su Intendencia: en Maldonado, por ejemplo, el límite en los dormitorios es 35 dBA a cualquier hora.',
  },
  {
    q: '¿Cuánto ruido es legal en Montevideo?',
    a: 'La Intendencia de Montevideo considera ruido molesto el que supera 45 dB(A) entre las 7.00 y las 22.00 horas, y 39 dB(A) entre las 22.00 y las 7.00 horas. El límite se mide dentro de la vivienda de quien denuncia, no en la calle ni en el local que genera el ruido. Si el ruido de fondo, con la fuente apagada, ya supera esos valores, el límite pasa a ser ese fondo: con la fuente encendida no lo puede superar.',
  },
  {
    q: '¿La denuncia por ruidos molestos tiene costo?',
    a: 'Depende del canal. El buzón ciudadano en línea y el Centro Comunal Zonal no tienen costo. El trámite en persona ante el SIME sí lo tiene: la Intendencia publica $ 329 a agosto de 2024 y lo actualiza con la Unidad Reajustable, así que consultá el valor vigente antes de ir. La llamada al 911 es gratuita, según el Ministerio del Interior. La central de Convivencia (1950 5000) no publica un costo por la denuncia.',
  },
  {
    q: '¿Puedo denunciar de forma anónima?',
    a: 'Ante el Ministerio de Ambiente sí: el trámite indica que la denuncia puede ser anónima y que los datos del denunciante son opcionales. Ante la Intendencia de Montevideo, el trámite que termina en una medición no: pide tu dirección y tu teléfono, porque la medición se hace dentro de tu vivienda.',
  },
  {
    q: '¿Qué datos me van a pedir?',
    a: 'Para el trámite de medición, la Intendencia de Montevideo pide tres datos: la calle y el número del local denunciado, tu dirección y tu teléfono, y el motivo de la denuncia. Llevá además tu registro de episodios con fechas y horas.',
  },
  {
    q: '¿Y si el ruido viene de un vecino y no de un local?',
    a: 'El trámite de medición publicado por la Intendencia de Montevideo está redactado para locales comerciales e industriales. Para un vecino particular no hay un trámite de medición equivalente publicado. Mientras el ruido está pasando, sí tenés dos vías: la central de Convivencia (1950 5000), que recibe denuncias las 24 horas, también por fiestas o reuniones en viviendas, y el 911 si es una fiesta o un evento puntual. Si el problema se repite, consultá en tu Centro Comunal Zonal cuál es la vía en tu caso, y si vivís en un edificio revisá el reglamento de copropiedad. En Montevideo, la Defensoría de Vecinas y Vecinos ofrece además mediación entre vecinos: es voluntaria, gratuita y confidencial.',
  },
  {
    q: '¿Sirve grabar el ruido con el celular?',
    a: 'Sirve como registro, no como medición. El archivo de audio o video guarda la fecha y la hora, y eso ordena tu denuncia. El nivel en decibeles lo mide el SIME con su propio equipo.',
  },
  {
    q: '¿Qué pasa con el ruido de los vehículos?',
    a: 'La Intendencia de Montevideo publica límites propios: 88 dB para motos, 85 dB para vehículos de menos de 3,5 toneladas y 92 dB para vehículos de 3,5 toneladas o más. El infractor tiene cinco días hábiles para regularizar la situación.',
  },
  {
    q: '¿Qué ley regula el ruido en Uruguay?',
    a: 'La Ley 17.852, del 10 de diciembre de 2004. Fija el objeto: prevenir, vigilar y corregir la contaminación acústica. El artículo 8 delega en el ministerio los niveles concretos, y el artículo 7 deja la zonificación, la habilitación y la fiscalización en manos de la autoridad departamental. Por eso los límites que se aplican en la práctica son los de cada Intendencia.',
  },
  {
    q: '¿Hay un WhatsApp para denunciar ruidos molestos?',
    a: 'En Montevideo, sí. El Buzón Ciudadano de la Intendencia atiende por WhatsApp al 099 019500, de lunes a viernes de 8.00 a 19.00, y también por formulario web. La Defensoría de Vecinas y Vecinos atiende por WhatsApp al 098 187 301 los conflictos con un vecino. Si el ruido está pasando ahora, llamá a la central de Convivencia, al 1950 5000, que atiende las 24 horas, o al 911 si es una fiesta que no para.',
  },
  {
    q: '¿Cuánto es la multa por ruidos molestos?',
    a: 'Depende del departamento y de la infracción, y se fija en Unidades Reajustables (UR), no en pesos. En Montevideo, el Régimen Punitivo fija para los ruidos excesivos 2 UR si la falta es leve, 7 UR si es mediana y 15 UR si es grave. La propaganda con altavoces desde un local son 15 UR, y un baile, espectáculo o reunión cuyo ruido llega a las viviendas vecinas sobre el límite, desde 10 UR y hasta la clausura; para los locales de espectáculos públicos de categorías A, B y C la sanción la fija otro artículo del Digesto (D.3146.54). En Maldonado, un local que supera el nivel por hasta 20 dB paga 5 UR, por más de 20 y hasta 30 dB 10 UR, y por más de 30 dB 15 UR. Si el ruido genera un conflicto de convivencia en una zona residencial o balnearia son 70 UR, y la reiteración en menos de seis meses duplica la multa.',
  },
  {
    q: '¿Qué hago si el ruido viene de otro apartamento y el edificio no tiene reglamento?',
    a: 'Rige igual la Ley 10.751 de propiedad horizontal. Su artículo 9 prohíbe a cada propietario ejecutar cualquier acto que perturbe la tranquilidad de los demás propietarios, y la misma prohibición rige para el inquilino. Según el artículo 10, el administrador o cualquier propietario puede pedirle al Juez una multa de entre 0,5 % y 20 % del valor catastral del apartamento, y que disponga que el ruido cese. Si alquilás, pedíselo al administrador o al propietario. Mientras el ruido está pasando, en Montevideo podés llamar al 1950 5000.',
  },
  {
    q: '¿Dónde denuncio ruidos molestos fuera de Montevideo?',
    a: 'En Canelones, al 1828 interno 83, las 24 horas, o en línea. En Maldonado, al 4222 3333, la línea de solicitudes de la Intendencia, las 24 horas, o con el formulario en línea. En Salto, en la Oficina de Ruidos Molestos, al 092 343 985. En Rivera y en Lavalleja la denuncia se hace en persona; en Lavalleja cuesta $ 150. En todo el país, la Ley 17.852 obliga a la Policía a hacer cesar el ruido de una fiesta o un evento puntual: llamá al 911.',
  },
  {
    q: '¿Se puede denunciar ruidos molestos por internet?',
    a: 'Sí. En Montevideo, el Buzón Ciudadano recibe en línea y sin costo la denuncia por un local comercial o industrial. En Canelones el trámite se inicia en línea, y Maldonado y Salto tienen formulario en línea. El Ministerio de Ambiente recibe en línea la denuncia ambiental, sin costo, y admite que sea anónima, aunque su formulario no nombra el ruido entre sus temas.',
  },
  {
    q: '¿Puedo pedir una mediación con el vecino?',
    a: 'En Montevideo, sí. La Defensoría de Vecinas y Vecinos atiende conflictos de convivencia, entre ellos los ruidos molestos, y ofrece mediación comunitaria. Es voluntaria, gratuita y confidencial. Si hay acuerdo, se redacta un acuerdo de mediación, que no tiene valor judicial. Si el vecino no acepta o no hay acuerdo, la Defensoría entrega un certificado que acredita que intentaste resolverlo con diálogo. Teléfonos: 2917 0042 y 0800 1616. WhatsApp: 098 187 301.',
  },
])

/** The fields the reader fills to build the denuncia text. */
export interface NoiseComplaintInput {
  /** Street and number of the premises that makes the noise. */
  sourceAddress: string
  /** What the noise is (música, maquinaria, ladridos…). */
  noiseKind: string
  /** When it happens (days and hours). */
  schedule: string
  /** Complainant's full name. */
  name: string
  /** Complainant's address. */
  address: string
  /** Complainant's phone. */
  phone: string
  /** Dated log of episodes, one per line. */
  log: string
  /** `true` when the reader already asked for the noise to stop. */
  askedFirst: boolean
  /**
   * `true` when the denuncia is filed outside Montevideo: the text then does not
   * invoke the Montevideo 45/39 dB(A) limit, which does not rule there.
   */
  outsideMontevideo?: boolean
}

/** An empty form. */
export function emptyNoiseComplaint(): NoiseComplaintInput {
  return {
    sourceAddress: '',
    noiseKind: '',
    schedule: '',
    name: '',
    address: '',
    phone: '',
    log: '',
    askedFirst: false,
    outsideMontevideo: false,
  }
}

/** Placeholder used where the reader left a field empty. */
const BLANK = '[completar]'

const filled = (value: string): string => {
  const clean = value.trim().replace(/\s+/g, ' ')
  return clean || BLANK
}

/**
 * Build the denuncia text.
 *
 * The three fields the Intendencia demands lead the letter, in its own order:
 * the address of the premises, the complainant's address and phone, and the
 * motive. Everything else supports those three. The text stays plain so it
 * survives a paste into a web form, an email and a printed page alike.
 */
export function buildNoiseComplaintText(input: NoiseComplaintInput): string {
  const lines: string[] = []

  lines.push('DENUNCIA POR RUIDOS MOLESTOS')
  lines.push('')
  lines.push(`Local o vivienda denunciada: ${filled(input.sourceAddress)}`)
  lines.push(`Denunciante: ${filled(input.name)}`)
  lines.push(`Dirección del denunciante: ${filled(input.address)}`)
  lines.push(`Teléfono del denunciante: ${filled(input.phone)}`)
  lines.push('')
  lines.push('MOTIVO')
  lines.push(
    `Desde la dirección indicada se genera ruido de ${filled(input.noiseKind)}. El ruido se percibe dentro de mi vivienda. Ocurre ${filled(
      input.schedule
    )}.`
  )
  if (!input.outsideMontevideo) {
    lines.push(
      'El ruido supera el límite que fija la Intendencia de Montevideo: 45 dB(A) entre las 7.00 y las 22.00 horas, y 39 dB(A) entre las 22.00 y las 7.00 horas, medidos dentro de la vivienda.'
    )
  }

  if (input.askedFirst) {
    lines.push(
      'Antes de presentar esta denuncia pedí en forma directa que bajaran el volumen. El ruido continuó.'
    )
  }

  const log = input.log.trim()
  if (log) {
    lines.push('')
    lines.push('REGISTRO DE EPISODIOS')
    for (const entry of log.split('\n')) {
      const clean = entry.trim()
      if (clean) lines.push(`- ${clean}`)
    }
  }

  lines.push('')
  lines.push('SOLICITO')
  lines.push(
    'Solicito que se realice una inspección y una medición del nivel de ruido dentro de mi vivienda, y que se apliquen las medidas que correspondan.'
  )
  lines.push('Quedo a disposición para coordinar el día y la hora de la medición.')

  return lines.join('\n')
}

/** How many of the required fields the reader still has to fill. */
export function missingRequiredFields(input: NoiseComplaintInput): string[] {
  const missing: string[] = []
  if (!input.sourceAddress.trim()) missing.push('Dirección del local o la vivienda denunciada')
  if (!input.address.trim()) missing.push('Tu dirección')
  if (!input.phone.trim()) missing.push('Tu teléfono')
  if (!input.noiseKind.trim()) missing.push('Tipo de ruido')
  return missing
}
