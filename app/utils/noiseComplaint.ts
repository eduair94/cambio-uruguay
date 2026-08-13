// app/utils/noiseComplaint.ts
// Datos de /denunciar-ruidos-molestos-uruguay: qué se puede hacer con el vecino que pone la música
// al mango, adónde va cada cosa y cómo lograr que la denuncia NO quede en la nada.
//
// POR QUÉ EXISTE: la pregunta llega tal cual —«tengo unos vecinos que ponen la música al mango, no
// importa si es fin de semana, temprano o tarde, me retumba toda la casa; ya hablé con ellos y las
// clásicas como hacer la denuncia terminan en la nada»—. El sitio no tenía una sola página que la
// contestara con la norma en la mano y con los canales reales.
//
// LA TESIS DE LA PÁGINA: no hay «una» denuncia. Hay TRES puertas que resuelven cosas distintas y no
// se reemplazan entre sí:
//   1. Policía (911 / seccional) → que el ruido PARE ahora. La Ley 17.852 art. 13 obliga a la
//      Policía a actuar de inmediato ante ruidos «extraordinarios o no permanentes» que perturben la
//      tranquilidad. Es el canal del sábado a las 3 de la mañana. No mide, no multa, no arregla lo
//      habitual.
//   2. Intendencia (control ambiental) → que MIDAN, INTIMEN y MULTEN lo habitual. Es la puerta que
//      deja constancia y construye el expediente. En Montevideo la competencia es del Servicio de
//      Instalaciones Mecánicas y Eléctricas; se denuncia por el Buzón Ciudadano, el 1950 o WhatsApp.
//   3. Vía civil (art. 1319 del Código Civil) → cuando lo administrativo no alcanza y hay daño: una
//      acción de cese y/o reparación, con abogado. Es la vía pesada.
//
// LO QUE HACE QUE UNA DENUNCIA «TERMINE EN LA NADA», y por qué la página lo pone adelante: se llama
// al canal equivocado (911 para algo habitual que ya terminó, o la Intendencia para algo que hay que
// frenar YA), no hay un registro de fechas y horas, no se deja que el inspector haga la medición
// oficial de decibeles —que es la prueba que vale— y se abandona tras la primera visita. Todo eso se
// puede corregir, y es el aporte real de la página.
//
// LO QUE NO SE PUBLICA ACÁ, porque no se pudo confirmar en fuente primaria:
//   - NO se promete anonimato: el trámite de la Intendencia de Montevideo pide dirección y teléfono
//     del denunciante, así que decir «denunciá anónimo» expondría a alguien. Se dice lo que sí es
//     verificable: los datos se usan para la inspección.
//   - NO se publican montos de multa. La base sancionatoria existe (Ley 17.852 art. 6 lit. H y el
//     Digesto departamental), pero no se pudo anclar un importe a una fuente abierta.
//   - NO se dice que el ruido sea una «falta» de la Ley 19.120: se leyó el texto y NO lo tipifica.
//   - NO se cita el artículo de «inmisiones» (art. 2618): ese es del Código Civil ARGENTINO. En
//     Uruguay la vía civil se apoya en el art. 1319 (responsabilidad extracontractual).
//   - NO se publican «límites nacionales de decibeles»: la Ley 17.852 nunca fue reglamentada a nivel
//     nacional, así que los límites reales son los departamentales.
//   - El teléfono «1950 5000 / Servicio de Convivencia Departamental / 24 h» que circula en blogs NO
//     se confirmó en fuente oficial; se usa el 1950 y el WhatsApp 099 019500 que sí publica la IM.
//
// FUENTES PRIMARIAS, verificadas el 2026-08-13:
//   - IMPO, Ley 17.852 (contaminación acústica, 2004). Artículos citados verbatim en NOISE_SOURCES.
//     https://www.impo.com.uy/bases/leyes/17852-2004
//   - IMPO, Código Civil, artículo 1319 (responsabilidad extracontractual).
//     https://www.impo.com.uy/bases/codigo-civil/16603-1994/1319
//   - IMPO, Ley 19.120 (Ley de Faltas): se verificó que NO tipifica los ruidos molestos.
//     https://www.impo.com.uy/bases/leyes-originales/19120-2013
//   - Intendencia de Montevideo, «Ruidos molestos» (oficina competente = Servicio de Instalaciones
//     Mecánicas y Eléctricas; umbrales 45 dB de día y 39 dB de noche medidos DENTRO de la vivienda;
//     tel. 1950; WhatsApp 099 019500).
//     https://montevideo.gub.uy/areas-tematicas/convivencia/ruidos-molestos
//   - Intendencia de Montevideo, trámite «Denuncia de molestias: ruidos molestos, humo y olores»
//     (Buzón Ciudadano, presencial en el Servicio o en los Municipios/CCZ, datos requeridos).
//     https://tramites.montevideo.gub.uy/tramites-y-tributos/denuncia/molestias-ruidos-molestos-humo-y-olores
//   - Digesto Departamental de Montevideo, Volumen VI, Título V, Capítulo IX «De los ruidos
//     molestos» (D.1991 a D.2017): D.2011.2 reuniones de interés social ≤ 56 dB(A); D.2008 topes por
//     vehículo; D.2005 bocinas 100 dB(A) a 3 m.
//     https://normativa.montevideo.gub.uy/armado/68899
//   - gub.uy, Ministerio de Ambiente: la competencia ambiental nacional que la Ley 17.852 pone en el
//     «MVOTMA» hoy es del Ministerio de Ambiente (creado por la Ley 19.889 de 2020).
//     https://www.gub.uy/ministerio-ambiente/

/** Fecha en que cada afirmación, umbral y canal de este módulo se contrastó con las fuentes. */
export const NOISE_VERIFIED_AT = '2026-08-13'

/* ------------------------------------------------------------------ */
/* Fuentes                                                            */
/* ------------------------------------------------------------------ */

export interface NoiseSource {
  label: string
  url: string
  publisher: string
  /** ley = norma nacional · intendencia = Intendencia de Montevideo · nacional = organismo del Estado */
  kind: 'ley' | 'intendencia' | 'nacional'
}

export const NOISE_SOURCES: readonly NoiseSource[] = Object.freeze([
  {
    kind: 'ley',
    label:
      'Ley N° 17.852, contaminación acústica: art. 8 (prohíbe emitir ruidos por encima de los niveles admisibles) y art. 10 (alcanza expresamente a las actividades de tipo doméstico)',
    url: 'https://www.impo.com.uy/bases/leyes/17852-2004',
    publisher: 'IMPO',
  },
  {
    kind: 'ley',
    label:
      'Ley N° 17.852, art. 7: la zonificación, los permisos, el contralor, la medición y la sanción son competencia de las autoridades departamentales (las Intendencias)',
    url: 'https://www.impo.com.uy/bases/leyes/17852-2004',
    publisher: 'IMPO',
  },
  {
    kind: 'ley',
    label:
      'Ley N° 17.852, art. 13: ante ruidos extraordinarios o no permanentes que perturben la tranquilidad, la Policía Nacional está obligada a actuar de inmediato para hacerlos cesar',
    url: 'https://www.impo.com.uy/bases/leyes/17852-2004',
    publisher: 'IMPO',
  },
  {
    kind: 'ley',
    label:
      'Código Civil, art. 1319: todo hecho ilícito que causa un daño a otro obliga a repararlo. Es la base de la vía civil de cese y reparación entre vecinos',
    url: 'https://www.impo.com.uy/bases/codigo-civil/16603-1994/1319',
    publisher: 'IMPO',
  },
  {
    kind: 'intendencia',
    label:
      'Intendencia de Montevideo — «Ruidos molestos»: la oficina competente es el Servicio de Instalaciones Mecánicas y Eléctricas; umbrales de 45 dB (7 a 22 h) y 39 dB (22 a 7 h) medidos dentro de la vivienda; teléfono 1950 y WhatsApp 099 019500',
    url: 'https://montevideo.gub.uy/areas-tematicas/convivencia/ruidos-molestos',
    publisher: 'Intendencia de Montevideo',
  },
  {
    kind: 'intendencia',
    label:
      'Intendencia de Montevideo — trámite «Denuncia de molestias: ruidos, humo y olores»: cómo denunciar por el Buzón Ciudadano, presencial en el Servicio o en los Municipios y CCZ, y datos que hay que aportar',
    url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/denuncia/molestias-ruidos-molestos-humo-y-olores',
    publisher: 'Intendencia de Montevideo',
  },
  {
    kind: 'intendencia',
    label:
      'Digesto Departamental de Montevideo, Volumen VI, Título V, Capítulo IX «De los ruidos molestos» (artículos D.1991 a D.2017)',
    url: 'https://normativa.montevideo.gub.uy/armado/68899',
    publisher: 'Intendencia de Montevideo',
  },
  {
    kind: 'nacional',
    label:
      'Ministerio de Ambiente: la competencia ambiental nacional que la Ley 17.852 atribuye al «MVOTMA» hoy corresponde a este ministerio, creado en 2020',
    url: 'https://www.gub.uy/ministerio-ambiente/',
    publisher: 'gub.uy',
  },
])

/* ------------------------------------------------------------------ */
/* La idea de fondo                                                   */
/* ------------------------------------------------------------------ */

/** La corrección de fondo: el ruido del vecino sí está alcanzado por la ley, y hay más de una vía. */
export const NOISE_CORE_IDEA =
  'La música fuerte del vecino no es un problema sin norma. La Ley 17.852 prohíbe emitir ruidos por encima de los niveles admisibles y aclara, en su artículo 10, que eso alcanza también a las actividades domésticas. Lo que confunde es que no hay una sola puerta: la Policía sirve para que el ruido pare en el momento, la Intendencia para que midan, intimen y multen lo que se repite, y la vía civil para reclamar cuando hay un daño. Elegir la puerta equivocada es la razón número uno por la que una denuncia termina en la nada.'

/* ------------------------------------------------------------------ */
/* Por qué una denuncia queda en la nada                             */
/* ------------------------------------------------------------------ */

export interface NoisePitfall {
  problem: string
  fix: string
}

/** Lo que hace fracasar una denuncia, y el movimiento que lo corrige. Va adelante en la página. */
export const NOISE_PITFALLS: readonly NoisePitfall[] = Object.freeze([
  {
    problem: 'Se llama al canal equivocado.',
    fix: 'La Policía frena el ruido de ahora; la Intendencia mide y multa lo habitual. Un ruido de todos los días no se resuelve con una llamada al 911, y una fiesta de esta madrugada no la para un expediente que tarda semanas. Cada situación tiene su puerta.',
  },
  {
    problem: 'No hay registro de los episodios.',
    fix: 'Anotá fecha, hora de inicio y de fin, y qué tipo de ruido, cada vez. Una denuncia con quince fechas concretas obliga a la oficina a tomarla en serio; una que dice «siempre ponen música fuerte» es fácil de archivar.',
  },
  {
    problem: 'La medición no la hace quien corresponde.',
    fix: 'La prueba que vale es la medición oficial de decibeles que hace el inspector de la Intendencia. Tu grabación y una app de dB sirven como respaldo para pedir la inspección, pero no reemplazan a la medición formal. La denuncia tiene que pedir, expresamente, que vayan a medir.',
  },
  {
    problem: 'Se abandona tras la primera visita.',
    fix: 'Si el ruido sigue, se vuelve a denunciar sumando los episodios nuevos al registro. La reincidencia es lo que empuja de la intimación a la multa. Guardá el número de expediente y hacé el seguimiento.',
  },
])

/* ------------------------------------------------------------------ */
/* Las tres puertas                                                  */
/* ------------------------------------------------------------------ */

export interface NoiseDoorChannel {
  label: string
  value: string
  url?: string
}

export interface NoiseDoor {
  n: number
  /** Ancla en la página. */
  id: string
  organism: string
  /** Qué resuelve esta puerta, en una línea. */
  goal: string
  /** Cuándo es la puerta correcta. */
  when: string
  detail: string
  /** Lo que esta puerta NO hace: la mitad que evita el viaje al organismo equivocado. */
  doesNot: string
  channels: readonly NoiseDoorChannel[]
  /** Norma que respalda lo de arriba. */
  basis: string
}

export const NOISE_DOORS: readonly NoiseDoor[] = Object.freeze([
  {
    n: 1,
    id: 'policia',
    organism: 'Policía — 911 o la seccional',
    goal: 'Que el ruido pare ahora',
    when: 'Fiesta, música al mango o parlantes a la madrugada. Ruido puntual y en curso, sobre todo de noche.',
    detail:
      'El artículo 13 de la Ley 17.852 es la base y es fuerte: ante ruidos «extraordinarios o no permanentes» que perturben la tranquilidad o el orden público, la Policía Nacional está obligada a ejercer acción inmediata para hacerlos cesar o impedirlos. O sea que no es un favor que se pide: es un deber. Si el ruido está sonando ahora, este es el canal. Llamá al 911 para lo urgente o a la seccional de la zona; dejá asentada la hora del llamado, porque esa constancia después suma al expediente administrativo.',
    doesNot:
      'No mide decibeles, no aplica multas y no resuelve el problema de fondo si el ruido es de todos los días. Frena el episodio; el patrón que se repite es de la Intendencia.',
    channels: [
      { label: 'Emergencia policial', value: '911' },
      {
        label: 'No urgente',
        value: 'Seccional policial de tu zona',
      },
    ],
    basis: 'Ley 17.852, artículo 13',
  },
  {
    n: 2,
    id: 'intendencia',
    organism:
      'Intendencia — control ambiental (en Montevideo, Instalaciones Mecánicas y Eléctricas)',
    goal: 'Que midan, intimen y multen lo que se repite',
    when: 'Ruido habitual: música fuerte todos los días, un local o boliche, maquinaria, una obra fuera de hora. Lo que necesita quedar documentado.',
    detail:
      'Es la puerta que construye el expediente. El artículo 7 de la Ley 17.852 pone en cabeza de las Intendencias el otorgar permisos, controlar, monitorear, medir y sancionar los ruidos en su jurisdicción. En Montevideo la oficina competente es el Servicio de Instalaciones Mecánicas y Eléctricas, y la denuncia se hace por el Buzón Ciudadano de la web, presencial en el Servicio o en los Municipios y Centros Comunales Zonales, o por teléfono. El mecanismo típico es denuncia → inspección con medición de niveles sonoros → intimación → multa si la infracción se confirma. Por eso la denuncia tiene que pedir, con todas las letras, que vayan a medir.',
    doesNot:
      'No frena el ruido de esta madrugada en el momento —para eso está la Policía— y no te paga una indemnización. Repara la situación por la vía administrativa; el resarcimiento por un daño concreto es de la vía civil.',
    channels: [
      {
        label: 'En línea (Montevideo)',
        value: 'Buzón Ciudadano — denuncia de ruidos, humo y olores, sin costo',
        url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/denuncia/molestias-ruidos-molestos-humo-y-olores',
      },
      { label: 'Teléfono (Montevideo)', value: '1950' },
      { label: 'WhatsApp (Montevideo)', value: '099 019500' },
      {
        label: 'Interior del país',
        value: 'La Intendencia de tu departamento: cada una tiene su propia ordenanza y su canal',
      },
    ],
    basis: 'Ley 17.852, artículo 7 · Digesto de Montevideo, Vol. VI, Cap. IX',
  },
  {
    n: 3,
    id: 'civil',
    organism: 'Justicia civil',
    goal: 'Que cese el daño y, si corresponde, que te lo reparen',
    when: 'Cuando el ruido es grave y persistente, lo administrativo no alcanzó y hay un perjuicio concreto que querés hacer cesar o reparar.',
    detail:
      'Es la vía más pesada y la última en el orden, pero existe. El artículo 1319 del Código Civil hace responsable a quien por su culpa o negligencia causa un daño a otro, con la obligación de repararlo. Sobre esa base, y sobre el principio de la normal tolerancia entre vecinos, se puede promover ante la Justicia una acción para que el ruido cese y, en su caso, para reclamar los daños. Requiere abogado y la prueba pesa: acá es donde el registro de episodios, las constancias policiales y —si existieron— las actuaciones de la Intendencia se vuelven decisivos.',
    doesNot:
      'No es un trámite rápido ni gratuito, y no sustituye a las otras dos puertas: llega mejor cuando ya intentaste frenar el ruido con la Policía y documentarlo con la Intendencia.',
    channels: [
      {
        label: 'Asesoramiento sin costo',
        value: 'Consultorios jurídicos de la Universidad de la República (Facultad de Derecho)',
      },
    ],
    basis: 'Código Civil, artículo 1319',
  },
])

/* ------------------------------------------------------------------ */
/* Umbrales de referencia                                            */
/* ------------------------------------------------------------------ */

export interface NoiseThreshold {
  context: string
  limit: string
  note: string
}

/**
 * Umbrales publicados por la Intendencia de Montevideo. OJO: son departamentales, no nacionales
 * (la Ley 17.852 nunca se reglamentó a nivel nacional). Los residenciales 45/39 dB los publica el
 * portal de la IM; los otros están en el Digesto (Cap. IX).
 */
export const NOISE_THRESHOLDS: readonly NoiseThreshold[] = Object.freeze([
  {
    context: 'Dentro de una vivienda, de día (7 a 22 h)',
    limit: '45 dB',
    note: 'Umbral que la Intendencia de Montevideo toma como ruido molesto medido dentro del domicilio afectado.',
  },
  {
    context: 'Dentro de una vivienda, de noche (22 a 7 h)',
    limit: '39 dB',
    note: 'El umbral nocturno es más exigente: la misma música molesta más de noche que de día.',
  },
  {
    context: 'Reuniones de interés social o público',
    limit: '56 dB(A)',
    note: 'Tope del Digesto de Montevideo (D.2011.2) para ese tipo de eventos.',
  },
  {
    context: 'Bocina de un vehículo (a 3 metros)',
    limit: '100 dB(A)',
    note: 'Tope del Digesto de Montevideo (D.2005).',
  },
])

/* ------------------------------------------------------------------ */
/* Prueba                                                             */
/* ------------------------------------------------------------------ */

/** Método, no derecho: cómo se arma la prueba de un ruido que se repite. */
export const NOISE_EVIDENCE: readonly string[] = Object.freeze([
  'Un registro con fecha, hora de inicio y de fin, y tipo de ruido, cada vez que pasa. Es la pieza que convierte «siempre molestan» en un dato que la oficina no puede archivar.',
  'Grabaciones de audio o video con la fecha visible. No reemplazan la medición oficial, pero muestran de qué se habla y justifican la inspección.',
  'La constancia de cada llamada al 911 o a la seccional: la hora del llamado queda asentada y suma al expediente.',
  'La dirección exacta de la fuente del ruido y, si lo sabés, si es una vivienda, un local o un boliche: cambia quién y cómo lo controla.',
  'Testigos: otros vecinos afectados. Una denuncia firmada por varias personas del entorno pesa más que una sola.',
  'El número de expediente de la denuncia anterior, si ya hiciste una: sirve para mostrar reincidencia y pasar de la intimación a la multa.',
])

/* ------------------------------------------------------------------ */
/* Preguntas frecuentes                                              */
/* ------------------------------------------------------------------ */

export interface NoiseFaq {
  question: string
  short: string
  answer: string
}

export const NOISE_FAQ: readonly NoiseFaq[] = Object.freeze([
  {
    question:
      'El vecino tiene la música al mango ahora, un sábado a las 3 de la mañana. ¿A quién llamo?',
    short: 'A la Policía: el 911 o la seccional. Es el canal del ruido en curso.',
    answer:
      'Al 911 o a la seccional de la zona. El artículo 13 de la Ley 17.852 obliga a la Policía Nacional a actuar de inmediato ante ruidos extraordinarios o no permanentes que perturben la tranquilidad o el orden público: no es discrecional, es un deber. Pediles que dejen constancia de la hora del llamado y de la intervención, porque esa constancia después suma si el problema se vuelve habitual y termina en la Intendencia o en la Justicia.',
  },
  {
    question: 'Es todos los días, pero no siempre puedo denunciar «en el momento». ¿Qué hago?',
    short: 'Ese es el caso de la Intendencia: que vayan a medir e intimen.',
    answer:
      'El ruido que se repite es el terreno de la Intendencia, no de la Policía. Presentá la denuncia ante el control ambiental —en Montevideo, el Servicio de Instalaciones Mecánicas y Eléctricas— con tu registro de fechas y horas, y pedí expresamente que hagan una inspección con medición de niveles sonoros. La Intendencia puede intimar el cese y, si la infracción se confirma o se repite, aplicar una multa. El artículo 7 de la Ley 17.852 le da esa competencia.',
  },
  {
    question: '¿Puedo denunciar sin que sepan que fui yo?',
    short: 'No lo podemos prometer: el trámite de la Intendencia pide tus datos de contacto.',
    answer:
      'Conviene ser honestos con esto. El trámite de denuncia de la Intendencia de Montevideo pide la dirección y el teléfono de quien denuncia, entre otras cosas porque la inspección y la medición se hacen en relación con un domicilio afectado. No encontramos una fuente oficial que garantice que la denuncia pueda tramitarse de forma anónima, así que no te lo vamos a asegurar. Tus datos se usan para la actuación, no se publican. Dos formas de bajar la exposición: que la denuncia la firmen varios vecinos afectados, y usar la vía policial para los episodios puntuales, donde lo que queda registrado es el llamado y la intervención.',
  },
  {
    question: '¿Sirve grabar el ruido o medirlo con una app del celular?',
    short: 'Como respaldo, sí. Como prueba formal, no: la medición que vale es la del inspector.',
    answer:
      'Grabá y documentá todo lo que puedas: ayuda a describir el problema y a justificar que vayan a inspeccionar. Pero la medición que tiene valor formal es la que hace el inspector de la Intendencia con el instrumental oficial, en las condiciones que fija el Digesto. Una app de decibeles en el teléfono no está calibrada y no sustituye esa medición. Por eso la denuncia no tiene que «probar los decibeles» por su cuenta: tiene que pedir, con todas las letras, que la Intendencia vaya a medir.',
  },
  {
    question: '¿Cuánto ruido permite la ley?',
    short:
      'No hay un límite nacional. En Montevideo, 45 dB de día y 39 dB de noche dentro de la vivienda.',
    answer:
      'La Ley 17.852 fija el marco pero nunca fue reglamentada a nivel nacional, así que no hay un número único de decibeles para todo el país. Los límites que rigen son los departamentales. La Intendencia de Montevideo toma como ruido molesto, medido dentro de una vivienda, el que supera 45 dB entre las 7 y las 22 horas y 39 dB entre las 22 y las 7. El umbral nocturno es más exigente. Cada Intendencia del interior tiene sus propios valores en su ordenanza, así que si no estás en Montevideo hay que consultar la de tu departamento.',
  },
  {
    question: 'No vivo en Montevideo. ¿Cambia algo?',
    short: 'Sí: cada Intendencia tiene su propia ordenanza y su propio canal de denuncia.',
    answer:
      'El artículo 7 de la Ley 17.852 reparte la competencia entre las autoridades departamentales, así que cada Intendencia regula los ruidos por su cuenta y tiene su propia oficina y su propio trámite. Canelones, por ejemplo, tiene una ordenanza de prevención y reducción de la contaminación acústica. Lo que no cambia es la lógica de las tres puertas: la Policía para el ruido en curso (el artículo 13 es nacional), la Intendencia de tu departamento para lo habitual, y la Justicia civil para el daño. Buscá en la web de tu Intendencia «ruidos molestos» o «contaminación acústica».',
  },
  {
    question: 'Ya hablé con ellos y no cambió nada. ¿Denunciar sirve de algo?',
    short: 'Sí, si se hace con registro y por el canal correcto, y si se le hace seguimiento.',
    answer:
      'Que la charla no funcione es lo habitual, y no es motivo para no denunciar: es motivo para hacerlo bien. La denuncia que «termina en la nada» suele ser la que no tiene fechas ni horas, la que llega al organismo equivocado o la que se abandona después de la primera visita. La que funciona lleva un registro de episodios, pide expresamente la medición, y si el ruido sigue se vuelve a presentar sumando las fechas nuevas. La reincidencia documentada es lo que empuja de la intimación a la multa. Guardá siempre el número de expediente.',
  },
  {
    question: '¿Y si nada de esto alcanza?',
    short: 'Queda la vía civil: una acción de cese y reparación, con abogado.',
    answer:
      'Si el ruido es grave y persistente y las vías administrativas no lo resolvieron, se puede ir a la Justicia civil. El artículo 1319 del Código Civil responsabiliza a quien por su culpa o negligencia causa un daño, y sobre esa base —más el principio de la normal tolerancia entre vecinos— se puede pedir que el ruido cese y reclamar los daños. Necesitás abogado y la prueba pesa mucho, así que todo lo que documentaste antes (el registro, las constancias policiales, las actuaciones de la Intendencia) es lo que sostiene el reclamo. Los consultorios jurídicos de la Facultad de Derecho de la Udelar asesoran sin costo.',
  },
])

/* ------------------------------------------------------------------ */
/* Generador de denuncia                                             */
/* ------------------------------------------------------------------ */

export interface NoiseDepartmentOption {
  value: string
  /** Nombre del departamento como se escribe en el encabezado de la denuncia. */
  label: string
  /** Oficina competente, si se conoce. */
  office?: string
}

export const NOISE_DEPARTMENTS: readonly NoiseDepartmentOption[] = Object.freeze([
  {
    value: 'montevideo',
    label: 'Montevideo',
    office: 'Servicio de Instalaciones Mecánicas y Eléctricas',
  },
  { value: 'canelones', label: 'Canelones' },
  { value: 'otro', label: 'Otro departamento' },
])

export interface NoiseSourceTypeOption {
  value: string
  label: string
}

export const NOISE_SOURCE_TYPES: readonly NoiseSourceTypeOption[] = Object.freeze([
  { value: 'musica', label: 'Música o parlantes a alto volumen' },
  { value: 'fiestas', label: 'Fiestas o reuniones' },
  { value: 'local', label: 'Local comercial, bar o boliche' },
  { value: 'obra', label: 'Obra o construcción fuera de hora' },
  { value: 'maquinaria', label: 'Maquinaria o equipos' },
  { value: 'animales', label: 'Animales' },
  { value: 'otro', label: 'Otro' },
])

export interface NoiseFrequencyOption {
  value: string
  label: string
}

export const NOISE_FREQUENCIES: readonly NoiseFrequencyOption[] = Object.freeze([
  { value: 'diaria', label: 'Todos los días' },
  { value: 'finde', label: 'Fines de semana' },
  { value: 'varias', label: 'Varias veces por semana' },
  { value: 'esporadica', label: 'De forma esporádica' },
])

export interface NoiseComplaintInput {
  department: string
  sourceAddress: string
  ownAddress: string
  sourceType: string
  sourceTypeOther: string
  frequency: string
  atNight: boolean
  episodes: string
  talkedToNeighbor: boolean
  fullName: string
  phone: string
}

function labelFor<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string
): string {
  return options.find(o => o.value === value)?.label ?? ''
}

/** Campo obligatorio: devuelve el valor o un marcador ««completar»» visible en el borrador. */
function required(value: string, placeholder: string): string {
  const v = value.trim()
  return v.length > 0 ? v : `«completar: ${placeholder}»`
}

/** Los campos mínimos para que la denuncia se pueda presentar, con su etiqueta para el aviso. */
export function noiseMissingFields(input: NoiseComplaintInput): string[] {
  const missing: string[] = []
  if (!input.sourceAddress.trim()) missing.push('dirección de la fuente del ruido')
  if (!input.ownAddress.trim()) missing.push('tu dirección')
  if (!input.sourceType) missing.push('tipo de ruido')
  if (!input.frequency) missing.push('frecuencia')
  if (!input.episodes.trim()) missing.push('registro de episodios')
  if (!input.fullName.trim()) missing.push('tu nombre')
  if (!input.phone.trim()) missing.push('tu teléfono')
  return missing
}

/**
 * Arma el texto de una denuncia administrativa por ruidos molestos ante la Intendencia. Pide
 * inspección y medición —el movimiento que evita que quede en la nada— y cita la norma sin
 * prometer un resultado. Todo se construye en el navegador; no se envía ni se guarda nada.
 */
export function buildNoiseComplaint(input: NoiseComplaintInput): string {
  const dept = NOISE_DEPARTMENTS.find(d => d.value === input.department)
  const deptLabel = dept?.label ?? '«completar: departamento»'
  const office = dept?.office ? ` (${dept.office})` : ''

  const type =
    input.sourceType === 'otro'
      ? required(input.sourceTypeOther, 'describí el tipo de ruido')
      : labelFor(NOISE_SOURCE_TYPES, input.sourceType) || '«completar: tipo de ruido»'

  const freq = labelFor(NOISE_FREQUENCIES, input.frequency) || '«completar: frecuencia»'
  const franja = input.atNight
    ? 'Los episodios ocurren, entre otros horarios, en la franja nocturna (22 a 7 h), en la que el nivel admisible es más exigente.'
    : ''

  const gestion = input.talkedToNeighbor
    ? 'Dejo constancia de que ya planteé la situación directamente a los responsables, sin resultado.'
    : ''

  const lines = [
    `A la Intendencia de ${deptLabel}${office}`,
    '',
    'DENUNCIA POR RUIDOS MOLESTOS',
    '',
    `Quien suscribe, ${required(input.fullName, 'nombre y apellido')}, con domicilio en ${required(
      input.ownAddress,
      'tu dirección'
    )} y teléfono ${required(
      input.phone,
      'tu teléfono'
    )}, presenta denuncia por ruidos molestos al amparo de la Ley N° 17.852 de contaminación acústica.`,
    '',
    `Fuente del ruido: ${required(input.sourceAddress, 'dirección de la fuente del ruido')}.`,
    `Tipo de ruido: ${type}.`,
    `Frecuencia: ${freq}.`,
    '',
    `Los ruidos descriptos se emiten de forma reiterada y perturban la tranquilidad en mi domicilio. El artículo 8 de la Ley 17.852 prohíbe emitir ruidos por encima de los niveles admisibles, y su artículo 10 alcanza expresamente a las actividades de tipo doméstico.${
      franja ? ' ' + franja : ''
    }`,
    '',
    'Registro de episodios (fecha, hora y descripción):',
    required(input.episodes, 'anotá al menos las fechas y horas que recuerdes'),
    '',
    `SOLICITO: que se realice una inspección y la medición de los niveles sonoros en el lugar y, de constatarse la infracción, se intime el cese y se apliquen las sanciones que correspondan conforme a la normativa departamental. La competencia para el contralor, la medición y la sanción está atribuida a la Intendencia por el artículo 7 de la Ley 17.852.${
      gestion ? ' ' + gestion : ''
    }`,
    '',
    `Quedo a disposición para la inspección en el domicilio afectado. Datos de contacto: ${required(
      input.fullName,
      'nombre'
    )}, teléfono ${required(input.phone, 'teléfono')}.`,
    '',
    'Saluda atentamente.',
  ]

  return lines.join('\n')
}

/* ------------------------------------------------------------------ */
/* Aviso                                                              */
/* ------------------------------------------------------------------ */

/** Aviso obligatorio: orienta, no sustituye asesoramiento. */
export const NOISE_DISCLAIMER =
  'Esta página explica los canales oficiales y cita la norma de cada afirmación. No es asesoramiento jurídico ni promete un resultado: cada caso depende de sus hechos y de la prueba. Los límites de decibeles y el trámite descriptos son los de la Intendencia de Montevideo; en el interior rige la ordenanza de cada departamento. Los consultorios jurídicos de la Udelar asesoran sin costo.'
