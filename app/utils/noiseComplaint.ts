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
])

/** Date the norms and procedures on this page were checked against their source. */
export const NOISE_VERIFIED_AT = '2026-10-19'

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
    id: 'buzon',
    authority: 'Intendencia de Montevideo',
    scope: 'Ruido de un local comercial o industrial',
    how: 'Buzón ciudadano, en línea',
    free: true,
    contact: '',
    url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/denuncia/molestias-ruidos-molestos-humo-y-olores',
    sourceIndex: 1,
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
    body: 'El reglamento fija horarios y obligaciones entre unidades. La administración puede intimar al propietario antes de que intervenga la Intendencia. Esa vía suele ser más rápida.',
  },
  {
    title: 'Denunciá con la mayor cantidad de vecinos posible',
    body: 'Varias denuncias por el mismo local pesan más que una. Coordiná con los vecinos afectados y presenten cada uno la suya, con su propia dirección.',
  },
])

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
    a: 'No hay una hora a partir de la cual el ruido pasa a estar permitido: el límite rige todo el día. En Montevideo es 45 dB(A) de 7.00 a 22.00 horas y 39 dB(A) de 22.00 a 7.00 horas, medido dentro de la vivienda de quien denuncia. Las 22.00 no son la hora desde la que se puede denunciar: son la hora en que el límite baja. La Ley 17.852, en su artículo 10, aplica los límites también a las actividades domésticas. En otro departamento rige la norma de su Intendencia.',
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
    a: 'El trámite de medición publicado por la Intendencia de Montevideo está redactado para locales comerciales e industriales. Para un vecino particular no hay un trámite de medición equivalente publicado. Mientras el ruido está pasando, sí tenés dos vías: la central de Convivencia (1950 5000), que recibe denuncias las 24 horas, también por fiestas o reuniones en viviendas, y el 911 si es una fiesta o un evento puntual. Si el problema se repite, consultá en tu Centro Comunal Zonal cuál es la vía en tu caso, y si vivís en un edificio revisá el reglamento de copropiedad.',
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
  lines.push(
    'El ruido supera el límite que fija la Intendencia de Montevideo: 45 dB(A) entre las 7.00 y las 22.00 horas, y 39 dB(A) entre las 22.00 y las 7.00 horas, medidos dentro de la vivienda.'
  )

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
