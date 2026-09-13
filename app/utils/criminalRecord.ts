// Certificado de antecedentes judiciales (CAJ): cuánto sale, cuál de los dos te
// piden y por qué caduca antes de lo que la gente cree.
//
// Módulo PURO (sin Vue/Nuxt, imports relativos) para que
// `pages/certificado-de-antecedentes-judiciales-uruguay.vue` no duplique el
// catálogo y vitest lo pueda cargar en Node.
//
// POR QUÉ ESTA PÁGINA. El certificado se busca en pesos —«cuánto sale el
// certificado de buena conducta»— y la ficha oficial lo contesta en UNIDADES
// INDEXADAS: 26,50 UI el común, 53,10 UI el urgente. La UI se mueve todos los
// días, así que ninguna página que publique un importe fijo en pesos puede estar
// bien más de veinticuatro horas, y la ficha del Estado no convierte. Este sitio
// ya lee el valor de la UI del día, así que la conversión la hace la página con
// el dato del día y la muestra fechada, en vez de congelar un número que envejece.
//
// Hasta ahora la única mención del certificado en el sitio era una LÍNEA de la
// página del pasaporte (`utils/passport.ts`), donde aparece como un añadido de
// $175 que se paga junto con el arancel. Eso hacía que la consulta de marca
// —«certificado de antecedentes judiciales precio»— cayera en una página sobre
// otra cosa. Son dos trámites distintos y se pagan distinto: el del pasaporte lo
// publica la ficha del pasaporte EN PESOS y el que se pide suelto lo publica su
// propia ficha EN UI. Las dos cosas son observables en sus fichas; esta página no
// explica POR QUÉ difieren, porque ninguna de las dos lo dice.
//
// LA SEGUNDA COSA QUE NADIE PONE EN UNA PANTALLA: hay DOS certificados con
// nombres casi iguales. El CAJ común y el de la Ley N° 19.791, que no es un
// certificado «mejor» ni «más completo» sino OTRO: certifica únicamente los
// delitos que lista esa ley, y la ley existe para instituciones que tratan
// directo con niñas, niños, adolescentes, personas con discapacidad y personas
// mayores en situación de dependencia. Pedir el que no es cuesta 26,5 UI y otros
// quince días.
//
// LA REGLA DE LAS CIFRAS. Todo importe sale textual del bloque «Costo» de la
// ficha del trámite en gub.uy. Nada se convierte a pesos acá dentro: este módulo
// guarda el valor EN UI y la conversión la hace {@link pesosForUi} con el valor
// de la UI que la página recibe del API. Un importe en pesos escrito a mano en
// este archivo sería un número viejo el día después de escribirlo.

/** Una fuente primaria: etiqueta legible + URL oficial. */
export interface CajSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo este archivo contra las fuentes oficiales. */
export const CAJ_VERIFIED_AT = '2026-09-13'

/** Ruta de la página; el mismo slug en los tres idiomas (i18n prefija /en y /pt). */
export const CAJ_PATH = '/certificado-de-antecedentes-judiciales-uruguay'

/** Días que el certificado sigue siendo válido, contados desde que se expide. */
export const CAJ_CADUCIDAD_DIAS = 90

/** Organismo que lo emite, tal como lo nombra la ficha. */
export const CAJ_ORGANISMO = 'Ministerio del Interior — Dirección Nacional de Policía Científica'

/** Una modalidad del trámite: su precio EN UI y el plazo que publica la ficha. */
export interface CajFee {
  /** Id estable, usado como `:key`. */
  readonly key: string
  /** Nombre de la modalidad tal como la llama la ficha oficial. */
  readonly label: string
  /** Precio en Unidades Indexadas. Nunca en pesos: ver la nota de cabecera. */
  readonly ui: number
  /** Plazo de entrega, textual de la ficha. */
  readonly plazo: string
  /** `true` si es la modalidad urgente. */
  readonly urgente: boolean
}

/**
 * Las dos modalidades del certificado común, con el precio que publica la ficha.
 *
 * «Para todos los destinos» es de la ficha y es la respuesta a una pregunta
 * frecuente: el precio no cambia según para qué lo pidas, aunque el formulario te
 * haga declarar el destino.
 */
export const CAJ_FEES: readonly CajFee[] = Object.freeze([
  {
    key: 'comun',
    label: 'Común',
    ui: 26.5,
    plazo: '15 días calendario posteriores a la audiencia',
    urgente: false,
  },
  {
    key: 'urgente',
    label: 'Urgente',
    ui: 53.1,
    plazo: '2 días hábiles posteriores a la audiencia',
    urgente: true,
  },
])

/** El certificado de la Ley N° 19.791, que es otro trámite y otro alcance. */
export const CAJ_LEY_19791 = Object.freeze({
  ui: 26.5,
  plazo: '15 días posteriores a la audiencia y/o revisión',
  /** Título oficial de la ley, textual de IMPO. */
  leyTitulo:
    'Fijación de medidas preventivas para instituciones que impliquen trato directo con niñas, niños, adolescentes, personas con discapacidad y personas mayores en situación de dependencia',
  promulgada: '2019-08-30',
  reglamentada: 'Decreto N° 17/020, del 13 de enero de 2020',
})

/**
 * Convierte un precio en UI a pesos con el valor de la UI del día.
 *
 * Devuelve `null` si no hay valor de UI utilizable, para que la página muestre el
 * precio en UI sin inventar una conversión. Redondea a peso entero: la ficha
 * cobra en UI y el centésimo de la conversión es ruido, no precisión.
 */
export function pesosForUi(ui: number, uiValue: number | null | undefined): number | null {
  if (typeof uiValue !== 'number' || !Number.isFinite(uiValue) || uiValue <= 0) return null
  if (!Number.isFinite(ui) || ui <= 0) return null
  return Math.round(ui * uiValue)
}

/**
 * La fecha en que caduca un certificado expedido en `issuedAt`.
 *
 * Existe porque la caducidad es la trampa práctica del trámite: el certificado
 * vale {@link CAJ_CADUCIDAD_DIAS} días desde que se expide, no desde que lo
 * entregás, así que sacarlo «para tenerlo pronto» antes de una postulación es
 * exactamente la forma de llegar con uno vencido.
 */
export function expiresOn(issuedAt: Date): Date {
  const out = new Date(issuedAt.getTime())
  out.setDate(out.getDate() + CAJ_CADUCIDAD_DIAS)
  return out
}

/** Qué certificado corresponde según quién lo pide. */
export interface CajCase {
  readonly key: string
  readonly situacion: string
  readonly cual: string
  readonly porque: string
}

export const CAJ_CASES: readonly CajCase[] = Object.freeze([
  {
    key: 'empleo-general',
    situacion: 'Un empleador te lo pide para entrar a trabajar',
    cual: 'Certificado de antecedentes judiciales (común)',
    porque:
      'Es el que certifica la existencia o no de antecedentes judiciales en general. Es el que se pide por defecto cuando nadie aclara cuál.',
  },
  {
    key: 'ley-19791',
    situacion:
      'La institución trata directo con niñas, niños, adolescentes, personas con discapacidad o personas mayores en situación de dependencia',
    cual: 'Certificado según Ley N° 19.791',
    porque:
      'La ley obliga a la institución a solicitarlo, y certifica únicamente los delitos que ella lista. El certificado común no lo sustituye.',
  },
  {
    key: 'pasaporte',
    situacion: 'Estás sacando o renovando el pasaporte',
    cual: 'No lo tramitás aparte',
    porque:
      'La ficha del pasaporte cobra el certificado junto con el arancel y lo publica en pesos. No hace falta pedirlo por separado antes de ir.',
  },
  {
    key: 'exterior',
    situacion: 'Te lo piden desde el exterior',
    cual: 'Certificado de antecedentes judiciales (común)',
    porque:
      'El precio es el mismo «para todos los destinos», aunque el formulario te haga declarar para qué lo pedís. Lo que el trámite no resuelve es la apostilla ni la legalización, que son un paso aparte.',
  },
])

/** Preguntas frecuentes de la página; alimentan también el JSON-LD `FAQPage`. */
export const CAJ_FAQS = Object.freeze([
  {
    question: '¿Cuánto sale el certificado de antecedentes judiciales?',
    answer:
      'La ficha oficial lo cobra en Unidades Indexadas, no en pesos: 26,50 UI el común y 53,10 UI el urgente, para todos los destinos. Como la UI se ajusta todos los días por inflación, el importe en pesos cambia a diario; esta página lo convierte con el valor de la UI del día y muestra la fecha.',
  },
  {
    question: '¿Cuánto tiempo vale el certificado?',
    answer:
      'Caduca a los 90 días de expedido. El plazo corre desde que se emite, no desde que te lo entregan ni desde que lo presentás, así que sacarlo con mucha anticipación es la forma más común de llegar con uno vencido.',
  },
  {
    question: '¿Se puede hacer todo por internet?',
    answer:
      'Sí, si tenés Identidad digital avanzada. Con usuario de Identidad digital nivel básico o intermedio hay que completar el formulario y agendarse para concurrir a una audiencia, y los plazos de entrega se cuentan desde esa audiencia.',
  },
  {
    question: '¿Es lo mismo que el certificado de la Ley N° 19.791?',
    answer:
      'No. El de la Ley N° 19.791 certifica únicamente los delitos que esa ley lista y existe para instituciones que implican trato directo con niñas, niños, adolescentes, personas con discapacidad y personas mayores en situación de dependencia. Cuesta 26,5 UI y es un trámite aparte: uno no sustituye al otro.',
  },
  {
    question: '¿Es lo mismo que el certificado que se paga con el pasaporte?',
    answer:
      'Es el mismo documento, pero no el mismo trámite ni el mismo precio publicado. La ficha del pasaporte lo cobra junto con el arancel y lo publica en pesos ($175 el común y $1.402 el urgente, vigentes desde el 1/7/2026); la ficha del certificado suelto lo publica en UI. Ninguna de las dos fichas explica la diferencia, así que esta página no la explica tampoco.',
  },
  {
    question: '¿Quién lo emite?',
    answer:
      'El Ministerio del Interior, a través de la Dirección Nacional de Policía Científica. Se puede iniciar en línea o presencialmente en la Dirección Nacional de Policía Científica en Montevideo o en las jefaturas departamentales.',
  },
])

/**
 * Lo que esta página NO contesta, a propósito.
 *
 * Misma política que `utils/passport.ts`: son preguntas reales que se contestarían
 * de memoria o copiando un blog. La ficha oficial no las trae, así que la página
 * dice que no las trae en vez de inventar el dato.
 */
export const CAJ_UNPUBLISHED = Object.freeze([
  {
    question: '¿Hay algún caso exonerado o gratuito?',
    answer:
      'La ficha del trámite publica un único precio por modalidad y no menciona exoneraciones ni gratuidad para ningún grupo. No publicamos una lista de casos exentos porque la fuente oficial no la tiene.',
  },
  {
    question: '¿Cuánto sale apostillarlo para presentarlo en el exterior?',
    answer:
      'La apostilla es un trámite distinto, de otro organismo, y la ficha del certificado no publica su costo. Si te lo piden apostillado, contá un paso y un arancel más de los que dice esta página.',
  },
  {
    question: '¿Qué delitos exactos figuran y cuáles caducan?',
    answer:
      'La ficha no publica el listado de qué antecedentes aparecen ni en qué plazo dejan de figurar. Es la pregunta más repetida y la que menos se puede contestar sin la norma a la vista, así que no la contestamos.',
  },
])

/** Las fuentes primarias, verificadas el {@link CAJ_VERIFIED_AT}. */
export const CAJ_SOURCES: readonly CajSource[] = Object.freeze([
  {
    label:
      'gub.uy — Certificado de antecedentes judiciales: «Urgente (2 días hábiles): 53.10 UI para todos los destinos · Común (15 días corridos): 26,50 UI para todos los destinos», el organismo emisor y «El Certificado de antecedentes judiciales (CAJ) caducará a los 90 días de expedido»',
    url: 'https://www.gub.uy/tramites/certificado-antecedentes-judiciales',
  },
  {
    label:
      'gub.uy — Certificado de antecedentes judiciales según Ley N° 19.791: «Es el documento por el cual se certifica la existencia o no de antecedentes judiciales por la comisión de delitos previstos por la Ley N° 19791», 26,5 U.I. para todos los destinos, mayores de 18 años con documento vigente',
    url: 'https://www.gub.uy/tramites/certificado-antecedentes-judiciales-segun-ley-ndeg19791',
  },
  {
    label:
      'IMPO — Ley N° 19.791, vigente: «Fijación de medidas preventivas para instituciones que impliquen trato directo con niñas, niños, adolescentes, personas con discapacidad y personas mayores en situación de dependencia», promulgada el 30/08/2019 y reglamentada por el Decreto N° 17/020 del 13/01/2020',
    url: 'https://www.impo.com.uy/bases/leyes/19791-2019',
  },
  {
    label:
      'gub.uy — Solicitud de pasaporte, renovación (personas nacionales uruguayas): el Certificado de Antecedentes Judiciales que se paga junto con el arancel, «$ 175» el común y «$ 1.402» el urgente, con valores a partir del 01/07/2026',
    url: 'https://www.gub.uy/tramites/solicitud-pasaporte-renovacion-personas-nacionales-uruguayas',
  },
])
