// Contenido de `/carne-de-salud-uruguay`.
//
// Módulo PURO (sin runtime de Vue/Nuxt, imports relativos) para que vitest lo
// ejecute en Node y la página sólo lo renderice.
//
// POR QUÉ ESTA PÁGINA
//
// «Carné de salud» se busca como un precio —«cuánto sale», «dónde lo hago
// barato»— y la respuesta que casi nadie conoce es que en el prestador propio
// no se paga: el Decreto 274/017, artículo 3, obliga a los prestadores
// integrales a expedir la constancia «sin costo para el usuario». La gente
// igual lo paga en consultorios privados porque el derecho tiene una condición
// que no está en el decreto sino en la Cartilla de Derechos del MSP (haber
// tenido consulta con médico general en los últimos 12 meses), y esa condición
// es justamente lo que convierte un «es gratis» inútil en algo accionable.
//
// REGLA DE FUENTES — cada cifra y cada obligación cita la norma que la dice, y
// las citas textuales van entre comillas porque son transcripciones literales
// de la fuente, no paráfrasis. Hay dos huecos que se declaran como huecos en
// lugar de rellenarse:
//
//   1. La «tasa moderadora» que cobra un prestador cuando NO se cumple la
//      condición la fija cada institución y ninguna fuente consultada publica
//      un importe único, así que la página no publica ninguno.
//   2. Los precios de los consultorios privados que emiten carné no están
//      publicados de forma oficial. La página no los estima.

/** Una fuente oficial que respalda una afirmación de la página. */
export interface HealthCardSource {
  label: string
  url: string
  publisher: string
}

export const HEALTH_CARD_SOURCES: readonly HealthCardSource[] = Object.freeze([
  {
    label: 'Decreto 274/017 — regulación del Control en Salud (ex Carné de Salud)',
    url: 'https://www.impo.com.uy/bases/decretos-originales/274-2017',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label:
      'Cartilla de Derechos y Deberes de Pacientes y Usuarios del SNIS, artículo 24 — gratuidad del carné',
    url: 'https://www.gub.uy/ministerio-salud-publica/comunicacion/publicaciones/cartilla-derechos-deberes-pacientes-usuarias-usuarios/cartilla-2',
    publisher: 'Ministerio de Salud Pública',
  },
  {
    label: 'Carné de salud — trámite de ASSE: qué es, requisitos y costo',
    url: 'https://www.gub.uy/tramites/carne-salud',
    publisher: 'gub.uy — trámites del Estado',
  },
])

/** Fecha en que se contrastó cada norma contra su fuente. */
export const HEALTH_CARD_VERIFIED_AT = '2026-09-11'

/**
 * Lo que ASSE cobra a quien NO es usuario de ASSE, en Unidades Reajustables.
 *
 * Va en UR y no en pesos a propósito: la fuente lo publica en UR y el importe
 * en pesos cambia todos los meses cuando el INE actualiza la unidad. Publicar
 * un número fijo en pesos sería publicar un número vencido.
 */
export const HEALTH_CARD_ASSE_COST_UR = 0.4

/** Vigencia máxima de la constancia, en meses (Decreto 274/017, art. 3). */
export const HEALTH_CARD_MAX_VALIDITY_MONTHS = 24

/** Vigencia de la constancia provisoria, en meses (Decreto 274/017, art. 4). */
export const HEALTH_CARD_PROVISIONAL_VALIDITY_MONTHS = 6

/** Meses hacia atrás en que debe haber una consulta con médico general. */
export const HEALTH_CARD_CONSULTATION_WINDOW_MONTHS = 12

/**
 * Pasa el costo de ASSE a pesos con el valor de la UR del día.
 *
 * @param urValue valor de una UR en pesos, tal como lo publica el BCU.
 * @returns el costo en pesos, o `null` si el valor de la UR no sirve. Devolver
 *   `null` y no un número aproximado es deliberado: sin UR válida la página
 *   muestra «0,4 UR» a secas en lugar de inventar un importe.
 */
export function healthCardCostInPesos(urValue: number | null | undefined): number | null {
  if (typeof urValue !== 'number' || !Number.isFinite(urValue) || urValue <= 0) return null
  return HEALTH_CARD_ASSE_COST_UR * urValue
}

/** Una regla del régimen, con la cita textual que la sostiene. */
export interface HealthCardRule {
  /** Titular accionable, en la voz de la persona que lo necesita. */
  headline: string
  /** Qué significa en la práctica. */
  detail: string
  /** Transcripción literal de la fuente. */
  quote: string
  /** Artículo o apartado exacto donde está la cita. */
  article: string
  sourceIndex: number
}

/**
 * Las cinco reglas que deciden si alguien paga o no.
 *
 * El orden es el de utilidad, no el del decreto: primero lo que ahorra plata
 * hoy, después la letra chica que explica por qué a veces igual te cobran.
 */
export const HEALTH_CARD_RULES: readonly HealthCardRule[] = Object.freeze([
  {
    headline: 'Tu prestador te lo tiene que dar sin costo',
    detail:
      'Si estás afiliado a una mutualista, a un seguro integral o a ASSE, esa institución tiene la obligación de expedirte la constancia. No es un servicio que te vende: es una obligación del decreto.',
    quote:
      'Los prestadores de servicios integrales de salud deben expedir la constancia de Control en Salud sin costo para el usuario, la que tendrá una vigencia máxima de dos años.',
    article: 'Decreto 274/017, artículo 3',
    sourceIndex: 0,
  },
  {
    headline: 'La gratuidad tiene una condición, y es la que casi nadie cumple',
    detail:
      'El carné sale gratis cada dos años a quien lo necesita por su trabajo, pero el MSP exige haber pasado antes por el médico general. Si hace más de un año que no vas a consulta, pedí primero esa consulta y después el carné: en ese orden no se paga.',
    quote:
      'dichos usuarios deberán haber tenido en los últimos 12 (doce) meses consulta con médico general y haberse realizado las rutinas de control requeridas',
    article: 'Cartilla de Derechos y Deberes del SNIS, artículo 24',
    sourceIndex: 1,
  },
  {
    headline: 'Sirve en todo el país y nadie te lo puede rechazar',
    detail:
      'El carné que te dio tu mutualista vale para cualquier empleador, gimnasio, federación deportiva u organismo del Estado. No necesitás sacar otro porque te lo pidan en otro lado.',
    quote: 'el que deberá ser aceptado como válido por todas las instituciones públicas y privadas',
    article: 'Decreto 274/017, artículo 1',
    sourceIndex: 0,
  },
  {
    headline: 'El provisorio dura 6 meses y no se puede encadenar',
    detail:
      'Si te lo emite una institución que no es tu prestador, no te puede ir dando provisorios uno atrás del otro para estirar el trámite. El provisorio es un puente, no un carné.',
    quote: 'La constancia provisoria tendrá una vigencia de seis (6) meses.',
    article: 'Decreto 274/017, artículo 4',
    sourceIndex: 0,
  },
  {
    headline: 'Dos años es el techo, no el plazo garantizado',
    detail:
      'Te lo pueden dar por menos tiempo según tu edad o si tenés alguna patología. Mirá la fecha de vencimiento que quedó impresa en vez de asumir que son dos años.',
    quote: 'El plazo de vigencia podrá disminuir de acuerdo a la edad y patologías existentes.',
    article: 'Decreto 274/017, artículo 3',
    sourceIndex: 0,
  },
])

/** Un requisito del trámite de ASSE. */
export interface HealthCardRequirement {
  item: string
  note: string
}

/**
 * Lo que pide ASSE. Es la única lista de requisitos publicada de forma oficial
 * y completa; cada mutualista puede pedir lo suyo, así que la página la
 * presenta como la de ASSE y no como «los requisitos» en general.
 */
export const HEALTH_CARD_REQUIREMENTS: readonly HealthCardRequirement[] = Object.freeze([
  { item: 'Documento de identidad vigente', note: '' },
  { item: 'Una foto carné', note: '' },
  {
    item: 'Muestra de la primera orina de la mañana',
    note: 'En frasco comprado en farmacia o en un frasco limpio.',
  },
  { item: 'Certificado de vacuna antitetánica vigente', note: '' },
  { item: 'Lentes, si usás', note: 'Se controla la vista con la corrección que usás a diario.' },
  {
    item: 'Exámenes previos, si ya te los hiciste',
    note: 'Colesterol total, glicemia, VDRL y examen de orina de otro laboratorio sirven con hasta 6 meses de antigüedad y te ahorran repetirlos.',
  },
  {
    item: 'PAP vigente, en mujeres de 21 a 65 años',
    note: 'Vale con hasta 30 meses de antigüedad.',
  },
])

/** Una pregunta frecuente, emitida además como FAQPage en JSON-LD. */
export interface HealthCardFaq {
  q: string
  a: string
}

export const HEALTH_CARD_FAQS: readonly HealthCardFaq[] = Object.freeze([
  {
    q: '¿Cuánto sale el carné de salud en Uruguay?',
    a: 'En tu prestador integral de salud —tu mutualista, tu seguro o ASSE si sos usuario— no sale nada: el Decreto 274/017 obliga a expedirlo sin costo para el usuario. En ASSE, si no sos usuario de ASSE, el trámite cuesta 0,4 UR. Los consultorios privados que lo emiten cobran su propio precio, que no está regulado ni publicado de forma oficial.',
  },
  {
    q: '¿Por qué mi mutualista me lo cobró si dicen que es gratis?',
    a: 'Porque la gratuidad está atada a una condición: la Cartilla de Derechos del MSP la reconoce a quien necesita el carné por su actividad laboral y tuvo consulta con médico general en los últimos 12 meses, con las rutinas de control hechas. Si no cumplís esa condición, el prestador puede cobrarte la tasa moderadora autorizada por el Poder Ejecutivo más el aporte a la Caja de Profesionales Universitarios. La salida barata suele ser pedir primero la consulta con el médico general y después el carné.',
  },
  {
    q: '¿Cuánto tiempo dura el carné de salud?',
    a: 'Dos años como máximo, contados desde que se expide la constancia. El decreto permite que dure menos según la edad y las patologías existentes, así que el plazo real es el que figura en tu constancia. La constancia provisoria es otra cosa: dura 6 meses.',
  },
  {
    q: '¿El carné de salud es obligatorio para trabajar?',
    a: 'Sí. El trámite oficial lo define como «un examen clínico de aptitud laboral, obligatorio, con el cual todo/a ciudadano/a debe contar para ejercer su actividad laboral». El Decreto 274/017 también alcanza a quienes realizan actividad física y prácticas deportivas.',
  },
  {
    q: '¿Me sirve el carné de mi mutualista si me lo pide otro empleador?',
    a: 'Sí. El Decreto 274/017 dice que el Control en Salud debe ser aceptado como válido por todas las instituciones públicas y privadas de todo el país. No tenés que sacar uno nuevo porque te lo pidan en otro lugar.',
  },
  {
    q: '¿Puedo hacerlo si estoy en el interior?',
    a: 'Sí. La obligación del prestador no depende del departamento. Para el trámite de ASSE en el interior, la propia página del trámite indica comunicarse con los centros asistenciales de cada zona.',
  },
])

/** Un enlace interno relacionado. */
export interface HealthCardRelated {
  to: string
  label: string
}

export const HEALTH_CARD_RELATED: readonly HealthCardRelated[] = Object.freeze([
  { to: '/cambiar-de-mutualista-uruguay', label: 'Cambiar de mutualista: cuándo se puede' },
  { to: '/devolucion-fonasa-uruguay', label: 'Devolución de FONASA: quién cobra y cuándo' },
  { to: '/indicadores/unidad-reajustable', label: 'Cuánto vale hoy la Unidad Reajustable' },
  { to: '/trabajo-para-menores-de-edad-uruguay', label: 'Trabajo para menores de edad' },
])
