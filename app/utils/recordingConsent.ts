// Content + takedown-letter builder for `/grabacion-sin-consentimiento-uruguay`.
//
// PURE module (no Vue/Nuxt runtime, relative imports only) so vitest exercises it
// in plain Node and the page only renders it.
//
// WHAT THE READER IS LIVING — and why the page is shaped the way it is. Somebody
// was filmed without noticing, the video is up on a prank account, they pressed
// "Denunciar" inside the app and nothing happened. That last part is the normal
// outcome, not bad luck, and it is the single most useful thing this page can
// say: the in-app button files the video against the COMMUNITY GUIDELINES queue,
// where a prank clip of an adult in the street usually breaks no rule. The
// privacy/legal webform is a DIFFERENT queue, it asks who you are and which
// right is affected, and it is the one that has to be used. Everything below is
// ordered by that insight: preserve, report through the right door, demand in
// writing, then escalate to an authority.
//
// WRITING RULE FOR THIS FILE — same as `noiseComplaint.ts`: ASD-STE100 adapted to
// rioplatense Spanish, because the reader acts while the problem is happening.
//   - One idea per sentence. Short sentences. Active voice, present tense.
//   - ONE word per meaning: always "video" (never "clip" or "grabación" when the
//     thing is the published file), always "cuenta" (never "perfil" or "usuario"),
//     always "reclamo" for the private demand and "denuncia" for the one that
//     goes to an authority. Those two are NOT synonyms here and the reader has to
//     be able to tell them apart.
//   - Steps are imperative: "Guardá el enlace."
//
// SOURCING RULE — every legal claim carries the article that states it, and what
// no source states, this file does not claim. Four gaps are stated AS gaps,
// because each one is a place where a reader who was promised more would waste
// weeks:
//
//   1. FILMING IN THE STREET IS NOT, BY ITSELF, A CRIME. No Uruguayan norm
//      punishes taking the footage in a public place. What the law grabs is what
//      happens next — publishing it, and the damage it does. A page that opens
//      with "te grabaron, es delito" sends the reader to a comisaría to report
//      something that is not there.
//   2. ART. 21 OF LEY 9.739 IS WRITTEN ABOUT COMMERCE. Its literal prohibition is
//      putting someone's portrait "en el comercio" without express consent. It is
//      the anchor of the right to one's image in Uruguay and it is quoted here as
//      it reads, without stretching it into a general ban on publishing: a
//      monetised account is a real argument, and it is an argument, not a
//      certainty. What does not depend on that reading is the data-protection
//      route, which covers the image as personal data whatever the motive.
//   3. THE CRIMINAL AGGRAVATION OF ART. 335 NAMES "escritos, dibujos o pinturas".
//      It is a 1933 code. A video is not in that list, and criminal law is not
//      extended by analogy. The aggravation may well be argued; it is not
//      promised here.
//   4. GOOGLE DOES NOT DE-INDEX A VIDEO FOR BEING HUMILIATING. Its personal-data
//      removal covers identifiers, documents and doxxing — not "a clip where they
//      laugh at me". De-indexing gets its own honest line instead of a link that
//      looks like a solution.
//
// A FIFTH THING THIS FILE REFUSES TO DO: give the reader a way to find out who is
// behind the account. That is the question everyone asks and there is no lawful
// self-service answer — identification runs through the Fiscalía, with the
// evidence the reader preserved. The page says that instead of hinting at it.

/** An external source backing a claim on the page. */
export interface RecordingSource {
  label: string
  url: string
  publisher: string
}

/**
 * The sources every claim on the page is taken from.
 *
 * Primary law first (IMPO is the official text), then the public procedures, then
 * the platform forms. Order matters for the page: the reader who scrolls to
 * "Fuentes" is checking whether the law part is invented.
 */
export const RECORDING_SOURCES: readonly RecordingSource[] = Object.freeze([
  {
    label: 'Ley 9.739, art. 21 — el retrato de una persona y el consentimiento expreso',
    url: 'https://www.impo.com.uy/bases/leyes/9739-1937/21',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label: 'Ley 18.331 — Protección de Datos Personales y acción de habeas data',
    url: 'https://www.impo.com.uy/bases/leyes/18331-2008',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label: 'Ley 19.580, art. 92 — divulgación de imágenes o grabaciones con contenido íntimo',
    url: 'https://www.impo.com.uy/bases/leyes/19580-2017/92',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label: 'Código Penal, arts. 333 a 339 — difamación, injuria, denuncia del ofendido y plazos',
    url: 'https://www.impo.com.uy/bases/codigo-penal/9155-1933/333',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label: 'Código de la Niñez y la Adolescencia, art. 11 — privacidad de niños y adolescentes',
    url: 'https://www.impo.com.uy/bases/codigo-ninez-adolescencia/17823-2004/11',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label: 'Denuncias ante la URCDP — requisitos, costo y canales',
    url: 'https://www.gub.uy/tramites/denuncias-unidad-reguladora-control-datos-personales-urcdp',
    publisher: 'Unidad Reguladora y de Control de Datos Personales',
  },
  {
    label: 'Decreto 64/020 — alcance de la ley a responsables no establecidos en el país',
    url: 'https://www.impo.com.uy/bases/decretos/64-2020',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label: 'Consultorio Jurídico — a quién atiende, agenda y materias excluidas',
    url: 'https://www.fder.edu.uy/consultorio-juridico/consultante',
    publisher: 'Facultad de Derecho, Udelar',
  },
  {
    label: 'Preguntas frecuentes sobre denuncias — dónde se presentan y si hace falta abogado',
    url: 'https://www.gub.uy/fiscalia-general-nacion/institucional/preguntas-frecuentes/denuncias',
    publisher: 'Fiscalía General de la Nación',
  },
  {
    label: 'Dónde y cómo denunciar',
    url: 'https://www.gub.uy/ministerio-interior/comunicacion/campanas/denunciar',
    publisher: 'Ministerio del Interior',
  },
  {
    label: 'Proceso de reclamación de privacidad de YouTube',
    url: 'https://support.google.com/youtube/answer/142443',
    publisher: 'YouTube',
  },
  {
    label: 'Eliminar información personal de los resultados de la Búsqueda',
    url: 'https://support.google.com/websearch/answer/9673730',
    publisher: 'Google',
  },
])

/** Date every norm, procedure and form on this page was checked against its source. */
export const RECORDING_VERIFIED_AT = '2026-09-14'

// ---------------------------------------------------------------------------
// 1. Qué caso es el tuyo
// ---------------------------------------------------------------------------

/** The four situations that get genuinely different treatment. */
export type RecordingCaseId = 'broma' | 'intimo' | 'menor' | 'comercial'

/**
 * One situation and the route it opens.
 *
 * The split is not cosmetic. These four cases differ in WHO decides, HOW FAST it
 * moves and WHETHER there is a crime at all, and mixing them is what makes most
 * advice on this useless: the answer for an intimate video (a crime with its own
 * article and an express duty on the platform to take it down) is nothing like
 * the answer for a prank clip of an adult in the street (no crime in the filming,
 * a civil and administrative fight over the publication).
 */
export interface RecordingCase {
  id: RecordingCaseId
  /** How the reader recognises their own case, in their words. */
  label: string
  /** The one line that tells them whether this is them. */
  hint: string
  /** Is there a criminal offence on the table, and which. `''` when there is none. */
  crime: string
  /** The legal ground that actually carries the takedown demand. */
  ground: string
  /** What this case changes about the route. */
  route: string
  /** `true` when the case justifies going to the police the same day. */
  urgent: boolean
  /** Index into {@link RECORDING_SOURCES}. */
  sourceIndex: number
}

export const RECORDING_CASES: readonly RecordingCase[] = Object.freeze([
  {
    id: 'broma',
    label: 'Es una broma, una cámara oculta o un video para reírse de mí',
    hint: 'Salís identificable, no hay contenido íntimo y sos mayor de edad. Es el caso del 90 % de las cuentas de bromas.',
    crime: '',
    ground:
      'Tu imagen es un dato personal. La Ley 18.331 te deja exigir que la saquen, y el art. 21 de la Ley 9.739 exige consentimiento expreso para poner tu retrato en el comercio.',
    route:
      'Reclamo escrito al autor y a la plataforma por el formulario de privacidad. Si no lo bajan, denuncia ante la URCDP. Si además te difamaron o te injuriaron, corre un plazo penal corto.',
    urgent: false,
    sourceIndex: 0,
  },
  {
    id: 'intimo',
    label: 'El video tiene contenido íntimo o sexual',
    hint: 'Desnudos, actos sexuales o cualquier imagen íntima, aunque la hayas grabado vos o se la hayas mandado a esa persona.',
    crime: 'Sí. Art. 92 de la Ley 19.580: seis meses de prisión a dos años de penitenciaría.',
    ground:
      'El mismo artículo obliga a la plataforma: notificada de que no hay autorización, si no retira las imágenes de inmediato recibe la misma pena.',
    route:
      'Denuncia penal el mismo día, y el reclamo a la plataforma por escrito para que quede la notificación. No hace falta que la persona no haya participado en la grabación: el delito se configura igual.',
    urgent: true,
    sourceIndex: 2,
  },
  {
    id: 'menor',
    label: 'La persona grabada es menor de 18 años',
    hint: 'Da igual quién la grabó y qué se ve: cambia el marco entero.',
    crime:
      'Depende del contenido. Si es íntimo, el art. 92 agrega que el consentimiento de un menor de 18 años nunca vale.',
    ground:
      'Art. 11 del Código de la Niñez y la Adolescencia: todo niño y adolescente tiene derecho a que se respete la privacidad de su vida y a que no se use su imagen en forma lesiva.',
    route:
      'Reclamá como madre, padre o tutor. La plataforma tiene un canal específico para imágenes de menores y suele ser el más rápido de todos.',
    urgent: true,
    sourceIndex: 4,
  },
  {
    id: 'comercial',
    label: 'Usaron mi imagen para vender algo',
    hint: 'Publicidad, promoción de un local, una marca en el video o una cuenta que cobra por publicar.',
    crime: '',
    ground:
      'Es el caso literal del art. 21 de la Ley 9.739: el retrato no puede ser puesto en el comercio sin consentimiento expreso. Acá no hay que estirar nada.',
    route:
      'Reclamo escrito al anunciante y a la plataforma. Es el caso con mejor pronóstico en una demanda civil por daños, porque el provecho económico está a la vista.',
    urgent: false,
    sourceIndex: 0,
  },
])

/** Look up a case by id. Returns `null` for an unknown id. */
export function recordingCase(id: string): RecordingCase | null {
  return RECORDING_CASES.find(item => item.id === id) ?? null
}

// ---------------------------------------------------------------------------
// 2. La prueba
// ---------------------------------------------------------------------------

/** One thing to preserve, and why it matters later. */
export interface EvidenceItem {
  title: string
  body: string
}

/**
 * What to save, before anything else.
 *
 * This section leads the page for a reason that costs people their case: the
 * first instinct is to block the account, and blocking hides the video from you
 * while it stays up for everyone else. The second instinct is to comment on it,
 * which feeds it. Both are covered here because both happen in the first ten
 * minutes, before the reader reaches any legal section.
 */
export const RECORDING_EVIDENCE: readonly EvidenceItem[] = Object.freeze([
  {
    title: 'No bloquees la cuenta todavía',
    body: 'Si la bloqueás dejás de ver el video, pero el video sigue arriba para todos los demás. Guardá primero todo lo que necesitás y bloqueá después.',
  },
  {
    title: 'Guardá el enlace exacto del video y el de la cuenta',
    body: 'El enlace del video, no el de la cuenta sola. Si después lo borran y lo vuelven a subir, el enlace viejo prueba que estuvo publicado.',
  },
  {
    title: 'Descargá el video',
    body: 'Bajalo con la herramienta que tengas a mano y guardá el archivo sin editarlo. Es la única copia que no depende de que la cuenta siga existiendo.',
  },
  {
    title: 'Sacá capturas con la fecha y la hora a la vista',
    body: 'Capturá el video, el nombre de la cuenta, el número de visitas y los comentarios. Que se vea el reloj del teléfono en la captura.',
  },
  {
    title: 'Anotá quién más lo vio',
    body: 'Nombres de personas que lo vieron y te lo mandaron. En un juicio civil el daño se prueba con eso, no con el video solo.',
  },
  {
    title: 'No comentes ni respondas en público',
    body: 'Cada comentario tuyo le da alcance al video y queda en el mismo hilo que después vas a presentar. Todo tu reclamo va por escrito y en privado.',
  },
])

// ---------------------------------------------------------------------------
// 3. La puerta correcta en cada plataforma
// ---------------------------------------------------------------------------

/** One platform, with the two doors it has and the difference between them. */
export interface PlatformRoute {
  id: string
  /** Platform name as the reader knows it. */
  name: string
  /** The button inside the app, and what queue it goes to. */
  inApp: string
  /** The privacy/legal form: the door that actually cites a right. */
  formUrl: string
  /** What the form asks for. */
  asks: string
  /** What the platform commits to, or `''` when it publishes no timeframe. */
  timeframe: string
}

/**
 * The platforms a Uruguayan reader actually ends up on.
 *
 * Every `formUrl` is the PRIVACY route, never the generic help centre: the
 * generic one is the button they already pressed. The `timeframe` column is empty
 * for most of them on purpose — only YouTube publishes a number, and inventing
 * "responden en 48 horas" for the rest would be the kind of detail that makes a
 * reader stop insisting exactly when insisting is the only thing that works.
 */
export const RECORDING_PLATFORMS: readonly PlatformRoute[] = Object.freeze([
  {
    id: 'tiktok',
    name: 'TikTok',
    inApp: 'Mantené apretado el video, "Reportar". Va a la cola de normas de la comunidad.',
    formUrl: 'https://www.tiktok.com/legal/report/privacy',
    asks: 'Quién sos, qué video, en qué segundo aparecés y qué derecho se afecta.',
    timeframe: '',
  },
  {
    id: 'instagram',
    name: 'Instagram y Threads',
    inApp: 'Los tres puntos del posteo, "Reportar".',
    formUrl: 'https://help.instagram.com/contact/512241091300432',
    asks: 'Tu nombre, el enlace del contenido y si aparecés vos o un menor a tu cargo.',
    timeframe: '',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    inApp: 'Los tres puntos del posteo, "Buscar ayuda o reportar publicación".',
    formUrl: 'https://www.facebook.com/help/428478523862899',
    asks: 'El enlace de la foto o el video y en qué consiste la violación de tu privacidad.',
    timeframe: '',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    inApp: 'Los tres puntos del video, "Denunciar".',
    formUrl: 'https://support.google.com/youtube/answer/142443',
    asks: 'Que seas identificable en el video y que marques el minuto exacto donde aparecés.',
    timeframe:
      'YouTube avisa a quien lo subió y le da 48 horas para borrarlo o editarlo. Si no hace nada, decide YouTube.',
  },
])

/**
 * The rule for a platform that is not in the table above.
 *
 * Four platforms are listed because four are all that could be checked against
 * their own live pages on the verification date. X is the notable absence: it
 * answers nothing from outside a browser session, so its form path could not be
 * confirmed and is not published here rather than sent to a reader as a link that
 * may 404. The rule below is what actually transfers to any platform.
 */
export const RECORDING_OTHER_PLATFORMS =
  'Si el video reapareció en otra red, buscá en su centro de ayuda "privacidad" o "mi imagen", no "denunciar". Son dos colas distintas en todas: el botón del posteo revisa reglas de la comunidad, y el formulario de privacidad revisa derechos de una persona concreta que se identifica.'

/**
 * What de-indexing from Google does and does not cover.
 *
 * Kept as its own constant because it is the piece of advice most repeated on the
 * internet and the one that least applies here. Google removes identifiers,
 * documents and doxxing. "Un video donde se burlan de mí" is not on that list.
 */
export const RECORDING_DEINDEX_LIMIT =
  'Google saca de sus resultados documentos, números de cuenta, direcciones, teléfonos y casos de doxxing. Un video donde se burlan de vos no entra en esa lista. Y aunque lo sacara del buscador, el video seguiría en la plataforma: desindexar no es borrar.'

// ---------------------------------------------------------------------------
// 4. Los plazos
// ---------------------------------------------------------------------------

/** One clock that is already running. */
export interface RecordingDeadline {
  /** What is counting. */
  what: string
  /** The figure as the norm states it. */
  term: string
  /** When it starts. */
  from: string
  /** What happens when it runs out. */
  expires: string
  /** Index into {@link RECORDING_SOURCES}. */
  sourceIndex: number
}

/**
 * The clocks, in the order they bite.
 *
 * The injuria one is the reason this table exists and sits high on the page:
 * three months is short enough that a reader who spends the summer arguing with
 * a support inbox loses the criminal route without ever being told it existed.
 */
export const RECORDING_DEADLINES: readonly RecordingDeadline[] = Object.freeze([
  {
    what: 'Injuria (art. 334 del Código Penal)',
    term: '3 meses',
    from: 'Es el plazo más corto de todos y el más fácil de dejar vencer.',
    expires: 'Se extingue la acción penal (art. 339).',
    sourceIndex: 3,
  },
  {
    what: 'Respuesta al pedido de supresión de tus datos (art. 15 de la Ley 18.331)',
    term: '5 días hábiles',
    from: 'Desde que reclamás por escrito a quien publicó o a la plataforma.',
    expires: 'Si no contestan o se niegan sin motivo, queda habilitada la acción de habeas data.',
    sourceIndex: 1,
  },
  {
    what: 'Difamación (art. 333 del Código Penal)',
    term: '1 año',
    from: 'Si te atribuyeron un hecho concreto que te expone al odio o al desprecio público.',
    expires: 'Se extingue la acción penal (art. 339).',
    sourceIndex: 3,
  },
  {
    what: 'Plazo que YouTube le da a quien subió el video',
    term: '48 horas',
    from: 'Desde que YouTube le notifica tu reclamación de privacidad.',
    expires: 'Si no lo borra ni lo edita, YouTube revisa y decide.',
    sourceIndex: 10,
  },
])

// ---------------------------------------------------------------------------
// 5. Adónde se va cuando la plataforma no contesta
// ---------------------------------------------------------------------------

/** An authority or service that takes the case further. */
export interface RecordingChannel {
  id: string
  /** Who receives it. */
  authority: string
  /** What this channel is for. */
  scope: string
  /** How to reach it. */
  how: string
  /** `true` when it has no cost. */
  free: boolean
  /** `true` when a lawyer is needed to use it. */
  needsLawyer: boolean
  /** Contact string, or `''`. */
  contact: string
  /** Public URL of the procedure. */
  url: string
  sourceIndex: number
}

/**
 * Where the case goes after the platform, ordered by what the reader can do alone.
 *
 * The URCDP leads because it is free, online, takes no lawyer and its subject
 * matter is exactly this. The criminal route follows, and it is deliberately NOT
 * first: for a prank video of an adult there is often no crime to report, and
 * sending someone to a comisaría with nothing to report is how they conclude that
 * "no se puede hacer nada".
 */
export const RECORDING_CHANNELS: readonly RecordingChannel[] = Object.freeze([
  {
    id: 'urcdp',
    authority: 'URCDP — Unidad Reguladora y de Control de Datos Personales',
    scope:
      'Tu imagen publicada sin consentimiento. Es el organismo del tema y puede sancionar con observación, apercibimiento, multa de hasta 500.000 UI y hasta clausura de la base de datos (art. 35 de la Ley 18.331).',
    how: 'En línea con usuario gub.uy o en persona en Liniers 1324, piso 4, Torre Ejecutiva Sur.',
    free: true,
    needsLawyer: false,
    contact: '2901 0065 opción 3 · infourcdp@datospersonales.gub.uy',
    url: 'https://www.gub.uy/tramites/denuncias-unidad-reguladora-control-datos-personales-urcdp',
    sourceIndex: 5,
  },
  {
    id: 'penal',
    authority: 'Denuncia penal — seccional policial o Fiscalía',
    scope:
      'Contenido íntimo (art. 92 de la Ley 19.580), imágenes de menores, amenazas o extorsión. También difamación e injuria, que sólo se persiguen por denuncia del ofendido (art. 338 del Código Penal).',
    how: 'En cualquier seccional o directamente en la Fiscalía. No necesitás abogado: alcanza con tu documento y la documentación que respalde el hecho.',
    free: true,
    needsLawyer: false,
    contact: '911 si hay riesgo inmediato',
    url: 'https://www.gub.uy/fiscalia-general-nacion/institucional/preguntas-frecuentes/denuncias',
    sourceIndex: 8,
  },
  {
    id: 'consultorio',
    authority: 'Consultorio Jurídico de la Facultad de Derecho (Udelar)',
    scope:
      'Asesoramiento y patrocinio gratuito en materia civil. NO atiende materia penal ni violencia doméstica.',
    how: 'Con agenda previa, presencial, en Colonia 1801. Atiende a quien vive en Montevideo y no supera el tope de ingresos que fija cada año (para 2026, $55.000 nominales).',
    free: true,
    needsLawyer: false,
    contact: '0800 3337 · 2408 3311 int. 105 · consultorio.juridico@fder.edu.uy',
    url: 'https://www.fder.edu.uy/consultorio-juridico/consultante',
    sourceIndex: 7,
  },
  {
    id: 'civil',
    authority: 'Juicio civil por daños y perjuicios',
    scope:
      'Que bajen el video y que te indemnicen. También la acción de habeas data si no contestaron tu pedido de supresión en cinco días hábiles (art. 37 de la Ley 18.331).',
    how: 'Con abogado. Es la única vía que puede terminar en una orden judicial de retiro y en dinero.',
    free: false,
    needsLawyer: true,
    contact: '',
    url: 'https://www.impo.com.uy/bases/leyes/18331-2008',
    sourceIndex: 1,
  },
])

// ---------------------------------------------------------------------------
// 6. El paso a paso
// ---------------------------------------------------------------------------

/** One step of the procedure, emitted as HowToStep JSON-LD. */
export interface RecordingStep {
  name: string
  text: string
}

export const RECORDING_STEPS: readonly RecordingStep[] = Object.freeze([
  {
    name: 'Guardá la prueba antes de tocar nada',
    text: 'Enlace del video, enlace de la cuenta, capturas con la fecha visible y el archivo descargado. Si el video desaparece después, esto es todo lo que vas a tener.',
  },
  {
    name: 'Reportá por el formulario de privacidad, no por el botón de la app',
    text: 'El botón "Reportar" del posteo va a la cola de normas de la comunidad. El formulario de privacidad es otra cola: te pide identificarte y decir qué derecho se afecta. Es el que corresponde cuando el problema es que salís vos.',
  },
  {
    name: 'Escribile a la cuenta por privado, una sola vez y por escrito',
    text: 'Pedí que bajen el video y que borren tus datos. No discutas ni amenaces. Ese mensaje es la notificación que después probás, y a partir de ahí corren los cinco días hábiles del art. 15 de la Ley 18.331.',
  },
  {
    name: 'Si hay contenido íntimo o un menor, denunciá el mismo día',
    text: 'No esperes la respuesta de la plataforma. Andá a una seccional o a la Fiscalía con las capturas y el enlace; no necesitás abogado. El art. 92 de la Ley 19.580 también obliga a la plataforma a retirar el contenido una vez notificada.',
  },
  {
    name: 'Denunciá ante la URCDP',
    text: 'Es gratis, se hace en línea y no necesitás abogado. Presentá tu nombre, tu cédula, tu domicilio electrónico, identificá a quien publicó con todo el detalle que tengas y adjuntá las capturas.',
  },
  {
    name: 'Contá el plazo penal si además te difamaron',
    text: 'La injuria prescribe a los tres meses y la difamación al año. Si el video te atribuye un hecho concreto que te expone al desprecio público, ese reloj ya está corriendo.',
  },
  {
    name: 'Consultá por la vía civil',
    text: 'Es la única que puede ordenar el retiro y fijar una indemnización. Si vivís en Montevideo y no superás el tope de ingresos, el Consultorio Jurídico de la Udelar atiende gratis en materia civil.',
  },
])

// ---------------------------------------------------------------------------
// 7. Lo que no va a pasar
// ---------------------------------------------------------------------------

/** Something the reader is likely to expect, and the honest answer. */
export interface RecordingLimit {
  title: string
  body: string
}

/**
 * The expectations that fail, said out loud.
 *
 * A help page that only lists routes reads as a promise. These four are the ones
 * that come back as "hice todo y no pasó nada", and each one is cheaper to hear
 * now than after three weeks.
 */
export const RECORDING_LIMITS: readonly RecordingLimit[] = Object.freeze([
  {
    title: 'Grabarte en la calle no es, por sí solo, un delito',
    body: 'Ninguna norma uruguaya castiga el hecho de filmar en un lugar público. Lo que agarra la ley es la publicación y el daño que causa. Por eso el reclamo se arma sobre el video publicado, no sobre el momento en que te grabaron.',
  },
  {
    title: 'Nadie te va a decir quién está detrás de la cuenta',
    body: 'No hay forma legal de averiguarlo por tu cuenta, y los servicios que dicen hacerlo no sirven como prueba. Los datos del titular los pide la Fiscalía dentro de una investigación. Tu trabajo es conservar la prueba para que esa investigación pueda empezar.',
  },
  {
    title: 'Que cierren la cuenta no es lo normal',
    body: 'Las plataformas retiran contenidos mucho más seguido de lo que cierran cuentas. Pedí el retiro del video: es lo que se consigue. El cierre llega cuando la misma cuenta acumula retiros.',
  },
  {
    title: 'La URCDP no borra el video',
    body: 'Investiga, exige explicaciones y puede sancionar. El retiro lo ejecuta la plataforma o lo ordena un juez. La denuncia igual sirve: es la que convierte tu reclamo en un expediente con número.',
  },
])

// ---------------------------------------------------------------------------
// 8. FAQ
// ---------------------------------------------------------------------------

/** One question and its answer, emitted as FAQPage JSON-LD. */
export interface RecordingFaq {
  q: string
  a: string
}

export const RECORDING_FAQS: readonly RecordingFaq[] = Object.freeze([
  {
    q: '¿Es ilegal grabarme sin mi permiso en la calle en Uruguay?',
    a: 'Grabar en un lugar público no está castigado por sí solo. Lo que la ley regula es la publicación: el art. 21 de la Ley 9.739 exige consentimiento expreso para poner el retrato de una persona en el comercio, y la Ley 18.331 trata tu imagen como un dato personal, así que podés exigir que la supriman.',
  },
  {
    q: 'Reporté el video en la app y no pasó nada. ¿Qué hago?',
    a: 'El botón de reportar del posteo va a la cola de normas de la comunidad, donde una broma con un adulto en la vía pública muchas veces no infringe ninguna regla. Usá el formulario de privacidad de la plataforma, que es otra cola: te pide identificarte, decir en qué segundo aparecés y qué derecho se afecta.',
  },
  {
    q: '¿Cuánto cuesta denunciar ante la URCDP?',
    a: 'No tiene costo y no necesitás abogado. Se presenta en línea con usuario gub.uy o en persona en Liniers 1324, piso 4. Te piden nombre completo, cédula, domicilio postal y electrónico, identificar al denunciado con el mayor detalle posible y un relato de los hechos con la prueba adjunta.',
  },
  {
    q: 'La cuenta es de afuera del país. ¿La ley uruguaya sirve igual?',
    a: 'El Decreto 64/020 aplica la ley uruguaya a responsables no establecidos en el país cuando el tratamiento se vincula con la oferta de bienes o servicios dirigida a habitantes de la República o con el análisis de su comportamiento. Eso alcanza a las plataformas grandes. Otra cosa es la velocidad: lo que se consigue rápido es el retiro por el formulario de privacidad.',
  },
  {
    q: '¿Y si el video tiene contenido íntimo?',
    a: 'Cambia todo. El art. 92 de la Ley 19.580 castiga con seis meses de prisión a dos años de penitenciaría a quien difunda, revele, exhiba o ceda imágenes o grabaciones íntimas o sexuales sin autorización, incluso si quien las difunde participó en ellas. El mismo artículo castiga igual a la plataforma que, notificada, no las retira de inmediato. Denunciá el mismo día.',
  },
  {
    q: '¿Sirve de algo si la persona grabada es menor de edad?',
    a: 'Sí, y es el caso que más rápido se mueve. El art. 11 del Código de la Niñez y la Adolescencia protege la privacidad de la vida de niños y adolescentes y prohíbe el uso lesivo de su imagen. Si el contenido es íntimo, el art. 92 de la Ley 19.580 agrega que la autorización de un menor de 18 años nunca vale. Reclamá como madre, padre o tutor.',
  },
  {
    q: '¿Puedo hacer una denuncia penal por difamación?',
    a: 'Sólo si el video te atribuye un hecho concreto que te expone al odio o al desprecio público, y sólo vos podés iniciarla: el art. 338 del Código Penal exige denuncia del ofendido. Mirá el reloj antes de decidir, porque la injuria prescribe a los tres meses y la difamación al año.',
  },
  {
    q: '¿Puedo pedirle a Google que lo saque del buscador?',
    a: 'Google saca documentos, identificadores, direcciones, teléfonos y casos de doxxing. Un video donde se burlan de vos no entra en esas categorías. Y desindexar no es borrar: el video seguiría publicado en la plataforma.',
  },
  {
    q: '¿Y si no tengo plata para un abogado?',
    a: 'El reclamo a la plataforma y la denuncia ante la URCDP no necesitan abogado y no cuestan nada. Para la vía civil, el Consultorio Jurídico de la Facultad de Derecho atiende gratis a quien vive en Montevideo y no supera el tope de ingresos del año, con agenda previa al 0800 3337. No atiende materia penal ni violencia doméstica.',
  },
  {
    q: '¿Me conviene contestarle a la cuenta en los comentarios?',
    a: 'No. Cada comentario le da alcance al video y queda en el mismo hilo que después vas a presentar como prueba. Todo lo tuyo va por escrito, en privado y una sola vez.',
  },
])

// ---------------------------------------------------------------------------
// 9. El texto del reclamo
// ---------------------------------------------------------------------------

/** Who the generated text is addressed to. */
export type RecordingTarget = 'autor' | 'plataforma' | 'urcdp'

/** The fields the reader fills to build the text. */
export interface RecordingRequestInput {
  /** Which of the four situations applies. */
  caseId: RecordingCaseId
  /** Who receives the text. */
  target: RecordingTarget
  /** Direct URL of the published video. */
  videoUrl: string
  /** Handle of the account that published it. */
  account: string
  /** Platform name. */
  platform: string
  /** Reader's full name. */
  name: string
  /** Reader's cédula — required by the URCDP, optional elsewhere. */
  idNumber: string
  /** Where in the video the reader appears. */
  timestamp: string
  /** When and where it was filmed. */
  context: string
  /** `true` when the reader is claiming for a child in their care. */
  onBehalfOfMinor: boolean
}

/** An empty form. */
export function emptyRecordingRequest(): RecordingRequestInput {
  return {
    caseId: 'broma',
    target: 'plataforma',
    videoUrl: '',
    account: '',
    platform: '',
    name: '',
    idNumber: '',
    timestamp: '',
    context: '',
    onBehalfOfMinor: false,
  }
}

/** Placeholder used where the reader left a field empty. */
const BLANK = '[completar]'

const filled = (value: string): string => {
  const clean = (value ?? '').trim().replace(/\s+/g, ' ')
  return clean || BLANK
}

/**
 * The legal ground each case cites, in the register of a demand letter.
 *
 * Kept apart from {@link RECORDING_CASES} because the page prose explains the
 * ground to a reader and this quotes it to a recipient: same law, different
 * voice. An intimate-content letter names the article that puts the platform
 * itself on the hook, which is the sentence that moves a support queue.
 */
const GROUND_BY_CASE: Record<RecordingCaseId, string> = {
  broma:
    'Mi imagen es un dato personal. La Ley 18.331 de Protección de Datos Personales me reconoce el derecho a solicitar su supresión, y el artículo 21 de la Ley 9.739 exige el consentimiento expreso de la persona retratada. No presté ese consentimiento.',
  intimo:
    'El artículo 92 de la Ley 19.580 castiga con pena de seis meses de prisión a dos años de penitenciaría a quien difunda, revele, exhiba o ceda a terceros imágenes o grabaciones de una persona con contenido íntimo o sexual sin su autorización. El mismo artículo dispone que los administradores de sitios que, notificados de la falta de autorización, no retiren las imágenes de inmediato, serán sancionados con la misma pena. Con esta comunicación quedan notificados.',
  menor:
    'La persona que aparece en el video es menor de dieciocho años. El artículo 11 del Código de la Niñez y la Adolescencia establece que todo niño y adolescente tiene derecho a que se respete la privacidad de su vida y a que no se utilice su imagen en forma lesiva. El artículo 92 de la Ley 19.580 agrega que la autorización otorgada por una persona menor de dieciocho años no se considera válida en ningún caso.',
  comercial:
    'El artículo 21 de la Ley 9.739 establece que el retrato de una persona no puede ser puesto en el comercio sin su consentimiento expreso. El video utiliza mi imagen con fines comerciales y no presté ese consentimiento.',
}

/**
 * Build the text.
 *
 * Three recipients, one body. The identification block and the closing ask are
 * what change: the platform gets a takedown request, the account owner gets a
 * dated demand that starts the five working days of art. 15, and the URCDP gets
 * the relato de hechos its form asks for, with the cédula that its form requires.
 *
 * The text stays plain so it survives a paste into a web form, an email, a DM and
 * a printed page alike — the same constraint as the denuncia in `noiseComplaint`.
 */
export function buildRemovalRequest(input: RecordingRequestInput): string {
  const lines: string[] = []
  const ground = GROUND_BY_CASE[input.caseId] ?? GROUND_BY_CASE.broma
  const subject = input.onBehalfOfMinor
    ? 'la persona menor de edad a mi cargo'
    : 'mi propia persona'

  if (input.target === 'urcdp') {
    lines.push('DENUNCIA ANTE LA UNIDAD REGULADORA Y DE CONTROL DE DATOS PERSONALES')
    lines.push('')
    lines.push(`Denunciante: ${filled(input.name)}`)
    lines.push(`Cédula de identidad: ${filled(input.idNumber)}`)
    lines.push(`Denunciado: cuenta ${filled(input.account)} en ${filled(input.platform)}`)
  } else if (input.target === 'autor') {
    lines.push('RECLAMO POR PUBLICACIÓN DE MI IMAGEN SIN CONSENTIMIENTO')
    lines.push('')
    lines.push(`A: responsable de la cuenta ${filled(input.account)}`)
    lines.push(`De: ${filled(input.name)}`)
  } else {
    lines.push('SOLICITUD DE RETIRO DE CONTENIDO POR VIOLACIÓN DE LA PRIVACIDAD')
    lines.push('')
    lines.push(`A: ${filled(input.platform)}`)
    lines.push(`De: ${filled(input.name)}`)
    lines.push(`Cuenta que publicó el contenido: ${filled(input.account)}`)
  }

  lines.push(`Video: ${filled(input.videoUrl)}`)
  lines.push('')
  lines.push('HECHOS')
  lines.push(
    `En el video indicado aparece ${subject}, de forma identificable, en ${filled(
      input.timestamp
    )}. La grabación se hizo ${filled(input.context)}, sin aviso y sin consentimiento de ningún tipo. Tampoco se pidió ni se dio autorización para publicarla.`
  )
  lines.push('')
  lines.push('FUNDAMENTO')
  lines.push(ground)
  lines.push('')
  lines.push('SOLICITO')

  if (input.target === 'urcdp') {
    lines.push(
      'Solicito que se investigue el tratamiento de mis datos personales realizado por la cuenta denunciada, que se intime el retiro del video y la supresión de mis datos, y que se apliquen las sanciones que correspondan conforme al artículo 35 de la Ley 18.331.'
    )
    lines.push('Adjunto capturas de pantalla con fecha y hora, y el enlace del video.')
  } else if (input.target === 'autor') {
    lines.push(
      'Solicito que retires el video de forma inmediata, que elimines cualquier copia o recorte publicado en otras cuentas y que suprimas mis datos personales de tus registros.'
    )
    lines.push(
      'Este reclamo es la notificación fehaciente prevista en el artículo 15 de la Ley 18.331: tenés cinco días hábiles para responder. Vencido ese plazo sin retiro, presentaré denuncia ante la Unidad Reguladora y de Control de Datos Personales y evaluaré las acciones judiciales que correspondan.'
    )
  } else {
    lines.push(
      'Solicito el retiro inmediato del video y de cualquier recorte del mismo material publicado por esta u otras cuentas.'
    )
    lines.push(
      'Quedo a disposición para aportar la documentación adicional que necesiten para verificar mi identidad.'
    )
  }

  return lines.join('\n')
}

/**
 * The fields still missing for the chosen recipient.
 *
 * Deliberately per-recipient: the cédula is mandatory in the URCDP form and
 * asking for it to write a DM to a prank account would be both useless and a
 * small privacy lesson taught backwards.
 */
export function missingRecordingFields(input: RecordingRequestInput): string[] {
  const missing: string[] = []
  if (!input.videoUrl.trim()) missing.push('Enlace del video')
  if (!input.account.trim()) missing.push('Cuenta que lo publicó')
  if (!input.name.trim()) missing.push('Tu nombre completo')
  if (input.target === 'urcdp' && !input.idNumber.trim()) {
    missing.push('Tu cédula de identidad (la exige el formulario de la URCDP)')
  }
  if (input.target !== 'autor' && !input.platform.trim()) missing.push('Plataforma')
  return missing
}
