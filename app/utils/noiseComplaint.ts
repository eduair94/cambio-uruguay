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
//   1. The Intendencia de Montevideo procedure is written for COMMERCIAL and
//      INDUSTRIAL premises. No equivalent published procedure exists for a
//      private neighbour, and pretending otherwise sends the reader to a form
//      that does not fit the case.
//   2. The Ministerio de Ambiente complaint form does not list noise among its
//      subjects, even though Ley 17.852 makes the ministry competent for
//      acoustic quality standards.

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
])

/** Date the norms and procedures on this page were checked against their source. */
export const NOISE_VERIFIED_AT = '2026-08-17'

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
  /** `true` when the channel has no cost. */
  free: boolean
  /** Contact string (phone or email), or `''`. */
  contact: string
  /** Public URL of the procedure. */
  url: string
  sourceIndex: number
}

/**
 * Where a denuncia goes.
 *
 * Ordered by how most readers will use them: the free municipal channels first,
 * the paid counter after, the national environmental route last.
 */
export const NOISE_CHANNELS: readonly NoiseChannel[] = Object.freeze([
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
    text: 'Si el ruido viene de un local comercial o industrial, denunciá ante la Intendencia. El buzón ciudadano y el Centro Comunal Zonal no tienen costo.',
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
    body: 'El trámite de la Intendencia está escrito para locales comerciales e industriales. Si el ruido viene de un vecino particular, ese formulario no encaja. Consultá en tu Centro Comunal Zonal cuál es la vía en tu caso.',
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
    q: '¿Cuánto ruido es legal en Montevideo?',
    a: 'La Intendencia de Montevideo considera ruido molesto el que supera 45 dB(A) entre las 7.00 y las 22.00 horas, y 39 dB(A) entre las 22.00 y las 7.00 horas. El límite se mide dentro de la vivienda de quien denuncia, no en la calle ni en el local que genera el ruido.',
  },
  {
    q: '¿La denuncia por ruidos molestos tiene costo?',
    a: 'Depende del canal. El buzón ciudadano en línea y el Centro Comunal Zonal no tienen costo. El trámite en persona ante el SIME sí lo tiene. Consultá el valor vigente en el portal de trámites antes de ir.',
  },
  {
    q: '¿Puedo denunciar de forma anónima?',
    a: 'Ante el Ministerio de Ambiente sí: el trámite indica que la denuncia puede ser anónima y que los datos del denunciante son opcionales. Ante la Intendencia de Montevideo no: el trámite pide tu dirección y tu teléfono, porque la medición se hace dentro de tu vivienda.',
  },
  {
    q: '¿Qué datos me van a pedir?',
    a: 'La Intendencia de Montevideo pide tres datos: la calle y el número del local denunciado, tu dirección y tu teléfono, y el motivo de la denuncia. Llevá además tu registro de episodios con fechas y horas.',
  },
  {
    q: '¿Y si el ruido viene de un vecino y no de un local?',
    a: 'El trámite publicado por la Intendencia de Montevideo está redactado para locales comerciales e industriales. Para un vecino particular no hay un trámite equivalente publicado. Consultá en tu Centro Comunal Zonal cuál es la vía en tu caso, y si vivís en un edificio revisá primero el reglamento de copropiedad.',
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
