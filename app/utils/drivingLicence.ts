// Contenido de `/libreta-de-conducir-uruguay`.
//
// Módulo PURO (sin runtime de Vue/Nuxt, imports relativos) para que vitest lo
// ejecute en Node y la página sólo lo renderice.
//
// POR QUÉ ESTA PÁGINA
//
// «Libreta de conducir» se busca como un precio, igual que el carné de salud, y
// afuera la respuesta viene siempre en la forma «depende de tu intendencia».
// Hace años que dejó de depender: el Congreso de Intendentes y el Sucive
// unificaron el costo de emisión del Permiso Único Nacional de Conducir en
// UR 1,25 a nivel nacional, vigente desde el 1.º de setiembre de 2023, y el
// Texto Ordenado del Sucive 2026 lo sigue diciendo igual.
//
// Lo accionable es que casi nadie paga esa tarifa entera: el importe se cobra en
// proporción al plazo de validez que te otorgan, y ese plazo lo recorta la edad.
//
// DONDE LA FUENTE NACIONAL Y EL MOSTRADOR NO DICEN LO MISMO — y es el motivo por
// el que esta página existe en vez de repetir la tabla de una intendencia. El
// Texto Ordenado ata la rebaja a una condición: «las restricciones en el plazo
// de validez establecidas por patologías médicas del solicitante y/o por edad
// avanzada (a partir de los 65 años cumplidos de edad)». Los trámites que
// publican Maldonado, Cerro Largo y Treinta y Tres en gub.uy publican la misma
// escala SIN esa condición, sólo por meses de vigencia. Las dos cosas se
// publican acá tal como están, separadas y con su fuente, en lugar de elegir una
// y presentarla como si no existiera la otra: abajo de los 65 el porcentaje
// reducido puede no corresponder, y quien lo va a resolver es el mostrador.
//
// REGLA DE FUENTES — cada cifra cita la norma o el trámite que la dice, y las
// citas textuales son transcripciones literales. Dos huecos se declaran como
// huecos en lugar de rellenarse:
//
//   1. El examen médico está EXPRESAMENTE excluido del costo unificado. Ninguna
//      fuente publica un precio nacional, así que la página no publica ninguno.
//   2. Los timbres y sellados que cada intendencia suma aparte NO están
//      unificados: van los dos casos verificados, nombrando el departamento, y
//      no un «promedio» que no describiría a ninguno.

/** Una fuente oficial que respalda una afirmación de la página. */
export interface DrivingLicenceSource {
  label: string
  url: string
  publisher: string
}

/**
 * El orden es el de autoridad: primero la ley nacional, después el texto que fija
 * la tarifa, y al final los trámites departamentales que la publican.
 */
export const DRIVING_LICENCE_SOURCES: readonly DrivingLicenceSource[] = Object.freeze([
  {
    label:
      'Ley 18.191 de Tránsito y Seguridad Vial, artículo 26 — de las habilitaciones para conducir',
    url: 'https://www.impo.com.uy/bases/leyes/18191-2007/26',
    publisher: 'IMPO — Centro de Información Oficial',
  },
  {
    label:
      'Texto Ordenado del Sucive 2026 — «Permiso Único Nacional de Conducir (PUNC)» y «Unificación de Costo del PUNC»',
    url: 'https://www.gub.uy/congreso-intendentes/comunicacion/publicaciones/texto-ordenado-del-sucive-2026',
    publisher: 'Congreso de Intendentes',
  },
  {
    label:
      'Se modificaron los costos de trámites relacionados a licencias de conducir — la unificación nacional, publicada el 1.º de setiembre de 2023',
    url: 'https://www.maldonado.gub.uy/noticias/se-modificaron-los-costos-tramites-relacionados-licencias-conducir',
    publisher: 'Intendencia de Maldonado',
  },
  {
    label:
      'Renovación de permiso único nacional de conducir automóviles categoría «A» — Cerro Largo: costos por plazo, plazos de vigencia por edad y sellados',
    url: 'https://www.gub.uy/tramites/renovacion-permiso-unico-nacional-conducir-automoviles-categoria-cerro-largo',
    publisher: 'gub.uy — trámites del Estado',
  },
  {
    label: 'Licencia de conducir – Primera vez, Maldonado: el costo por tramo de vigencia',
    url: 'https://www.gub.uy/tramites/licencia-conducir-primera-vez-maldonado',
    publisher: 'gub.uy — trámites del Estado',
  },
  {
    label:
      'Libreta de conducir primera vez – Treinta y Tres: UR 1,25 más dos timbres profesionales',
    url: 'https://www.gub.uy/tramites/libreta-conducir-primera-vez-treinta-tres',
    publisher: 'gub.uy — trámites del Estado',
  },
  {
    label:
      'Digesto Departamental de Montevideo, artículo D.554 (Decreto JDM 36.530) — plazos de vigencia del PUNC por edad y categoría',
    url: 'https://normativa.montevideo.gub.uy/articulo/65474',
    publisher: 'Intendencia de Montevideo',
  },
])

/** Fecha en que se contrastó cada cifra contra su fuente. */
export const DRIVING_LICENCE_VERIFIED_AT = '2026-09-12'

/** Fecha en que se publicó la tarifa unificada a nivel nacional. */
export const DRIVING_LICENCE_UNIFIED_SINCE = '2023-09-01'

/**
 * El costo de emisión del documento, en Unidades Reajustables.
 *
 * Va en UR y no en pesos porque así lo fija el Texto Ordenado: el importe en
 * pesos cambia cada mes cuando el INE actualiza la unidad, y un número fijo en
 * pesos sería un número vencido.
 */
export const DRIVING_LICENCE_MAX_COST_UR = 1.25

/**
 * Edad desde la que el Texto Ordenado admite la rebaja por «edad avanzada».
 * Es el número que los trámites departamentales no repiten.
 */
export const DRIVING_LICENCE_REDUCTION_FROM_AGE = 65

/** Un tramo de la escala: cuánto se paga según el plazo que te habilitan. */
export interface DrivingLicenceFeeBracket {
  /** Piso del tramo, en meses de vigencia otorgada (inclusive). */
  fromMonths: number
  /** Techo del tramo, en meses (inclusive). `null` = sin techo. */
  toMonths: number | null
  /** Porcentaje del costo máximo que se cobra en este tramo. */
  share: number
  /** El importe resultante, en UR. */
  ur: number
  /** Cómo lo describe la norma, en años. */
  label: string
}

/**
 * La escala, tal como la publican Maldonado y Cerro Largo en meses y el Texto
 * Ordenado en años. Las dos redacciones dicen lo mismo: los cortes son 2, 4, 6 y
 * 8 años exactos, y ocho años justos (96 meses) ya paga la tarifa entera.
 */
export const DRIVING_LICENCE_FEE_BRACKETS: readonly DrivingLicenceFeeBracket[] = Object.freeze([
  { fromMonths: 0, toMonths: 23, share: 20, ur: 0.25, label: 'menos de 2 años' },
  { fromMonths: 24, toMonths: 47, share: 40, ur: 0.5, label: 'de 2 a menos de 4 años' },
  { fromMonths: 48, toMonths: 71, share: 60, ur: 0.75, label: 'de 4 a menos de 6 años' },
  { fromMonths: 72, toMonths: 95, share: 80, ur: 1, label: 'de 6 a menos de 8 años' },
  { fromMonths: 96, toMonths: null, share: 100, ur: 1.25, label: '8 años o más' },
])

/** Un tramo de edad y el plazo máximo que habilita, en años. */
export interface DrivingLicenceAgeBand {
  /** Edad mínima del tramo, en años (inclusive). */
  fromAge: number
  /** Edad máxima del tramo (inclusive). `null` = sin techo. */
  toAge: number | null
  /** Plazo máximo de vigencia que puede otorgarse, en años. */
  years: number
}

/**
 * Los plazos de las categorías NO profesionales (A, G1 y G2).
 *
 * Las profesionales (B, C, D, E, F, H, G3) tienen su propia escala, más corta, y
 * además ninguna puede pasar del día en que el titular cumple 75 años: por eso
 * esta tabla se publica diciendo a qué categorías corresponde y no como «la»
 * tabla de plazos.
 */
export const DRIVING_LICENCE_AGE_BANDS: readonly DrivingLicenceAgeBand[] = Object.freeze([
  { fromAge: 0, toAge: 55, years: 10 },
  { fromAge: 56, toAge: 56, years: 9 },
  { fromAge: 57, toAge: 57, years: 8 },
  { fromAge: 58, toAge: 58, years: 7 },
  { fromAge: 59, toAge: 59, years: 6 },
  { fromAge: 60, toAge: 68, years: 5 },
  { fromAge: 69, toAge: 69, years: 4 },
  { fromAge: 70, toAge: 78, years: 3 },
  { fromAge: 79, toAge: 79, years: 2 },
  { fromAge: 80, toAge: null, years: 1 },
])

/** Edad a partir de la cual el trámite exige además una prueba práctica. */
export const DRIVING_LICENCE_PRACTICAL_TEST_FROM_AGE = 75

/** Edad tope de las categorías profesionales: ninguna puede pasar de ese día. */
export const DRIVING_LICENCE_PROFESSIONAL_MAX_AGE = 75

/** Edad mínima general para las categorías de automóvil. */
export const DRIVING_LICENCE_MIN_AGE = 18

/** Edad mínima para la categoría G1 (ciclomotores). */
export const DRIVING_LICENCE_MIN_AGE_G1 = 16

/**
 * El plazo máximo, en años, que puede otorgarse a alguien de esta edad.
 *
 * @returns el plazo, o `null` si la edad no es un número de años plausible.
 *   Devolver `null` y no un plazo por defecto es deliberado: la página prefiere
 *   no mostrar nada antes que mostrar el plazo equivocado.
 */
export function maxValidityYearsForAge(age: number): number | null {
  if (!Number.isFinite(age) || age < DRIVING_LICENCE_MIN_AGE_G1 || age > 120) return null
  const band = DRIVING_LICENCE_AGE_BANDS.find(
    b => age >= b.fromAge && (b.toAge === null || age <= b.toAge)
  )
  return band ? band.years : null
}

/** El tramo de la escala que corresponde a un plazo dado, en meses. */
export function feeBracketForMonths(months: number): DrivingLicenceFeeBracket | null {
  if (!Number.isFinite(months) || months < 0) return null
  return (
    DRIVING_LICENCE_FEE_BRACKETS.find(
      b => months >= b.fromMonths && (b.toMonths === null || months <= b.toMonths)
    ) ?? null
  )
}

/** Lo que sale la libreta a esta edad, según lo que publican los trámites. */
export interface DrivingLicenceQuote {
  years: number
  months: number
  bracket: DrivingLicenceFeeBracket
  /**
   * `true` cuando la edad alcanza el umbral de «edad avanzada» del Texto
   * Ordenado y por lo tanto la rebaja está prevista también en la norma
   * nacional. En `false` la rebaja sale sólo de la escala por meses que publican
   * los trámites, y la página tiene que decirlo.
   */
  reductionInNationalText: boolean
}

export function licenceQuoteForAge(age: number): DrivingLicenceQuote | null {
  const years = maxValidityYearsForAge(age)
  if (years === null) return null
  const months = years * 12
  const bracket = feeBracketForMonths(months)
  if (!bracket) return null
  return {
    years,
    months,
    bracket,
    // La tarifa entera no es una rebaja, así que no necesita ampararse en nada.
    reductionInNationalText: bracket.share === 100 || age >= DRIVING_LICENCE_REDUCTION_FROM_AGE,
  }
}

/**
 * Pasa un importe en UR a pesos con el valor de la unidad del día.
 *
 * @returns el importe en pesos, o `null` si el valor de la UR no sirve. La
 *   página muestra entonces sólo las UR, en vez de inventar un importe.
 */
export function licenceCostInPesos(ur: number, urValue: number | null | undefined): number | null {
  if (typeof urValue !== 'number' || !Number.isFinite(urValue) || urValue <= 0) return null
  if (!Number.isFinite(ur) || ur <= 0) return null
  return ur * urValue
}

/** Las edades que la página muestra en la tabla de ejemplo. */
export const DRIVING_LICENCE_SAMPLE_AGES: readonly number[] = Object.freeze([
  30, 57, 59, 63, 69, 72, 79, 82,
])

/** Un cargo que una intendencia suma aparte del costo unificado. */
export interface DrivingLicenceExtra {
  department: string
  concept: string
  amount: string
  sourceIndex: number
}

/**
 * Los cargos que NO están unificados, con el departamento adelante.
 *
 * Sólo van los dos verificados. La página dice explícitamente que son dos
 * ejemplos y no una tabla nacional, porque no lo es.
 */
export const DRIVING_LICENCE_EXTRAS: readonly DrivingLicenceExtra[] = Object.freeze([
  {
    department: 'Cerro Largo',
    concept: 'Sellado común + timbre profesional',
    amount: '$ 282 + $ 44',
    sourceIndex: 3,
  },
  {
    department: 'Treinta y Tres',
    concept: 'Dos timbres profesionales (CJPPU)',
    amount: '$ 160 + $ 260',
    sourceIndex: 5,
  },
])

/** Una regla del régimen, con la cita textual que la sostiene. */
export interface DrivingLicenceRule {
  headline: string
  detail: string
  quote: string
  article: string
  sourceIndex: number
}

export const DRIVING_LICENCE_RULES: readonly DrivingLicenceRule[] = Object.freeze([
  {
    headline: 'La libreta es una sola y vale en todo el país',
    detail:
      'No existe una libreta «de Montevideo» y otra «de Canelones»: la que te dio tu intendencia habilita en cualquier departamento. Tener dos está prohibido, y el motivo que da la ley es que las sanciones no se diluyan entre autoridades.',
    quote:
      'Todas las autoridades competentes reconocerán la licencia nacional de conducir expedida en cualquiera de los departamentos y en las condiciones que establece la presente ley, la que tendrá el carácter de única y excluyente',
    article: 'Ley 18.191, artículo 26, numeral 7',
    sourceIndex: 0,
  },
  {
    headline: 'La expide tu intendencia, no el Estado central',
    detail:
      'Por eso la agenda, el examen y los timbres se piden en el departamento donde vivís, aunque el documento y su precio de emisión sean nacionales.',
    quote:
      'Todo conductor de un vehículo automotor debe ser titular de una licencia habilitante que le será expedida por la autoridad de tránsito competente en cada departamento.',
    article: 'Ley 18.191, artículo 26, numeral 1',
    sourceIndex: 0,
  },
  {
    headline: 'Los exámenes son los mismos en todo el país',
    detail:
      'Médico, teórico y práctico. No hay departamento «más fácil»: la ley obliga a que tanto las pruebas como los criterios con que se corrigen sean únicos.',
    quote:
      'Los referidos exámenes y los criterios de evaluación de los mismos serán únicos en todo el país.',
    article: 'Ley 18.191, artículo 26, numeral 3',
    sourceIndex: 0,
  },
  {
    headline: 'La tarifa cubre el trámite entero y se paga al retirarla',
    detail:
      'No hay un precio por la teórica, otro por la práctica y otro por el plástico: el monto de la expedición comprende todas las gestiones, y se cobra cuando la intendencia te entrega la libreta.',
    quote:
      'El monto determinado al cobro por la expedición del PUNC, comprenderá todas las acciones, trámites y gestiones que se realicen y se cobrará toda vez que la Intendencia entregue la misma.',
    article: 'Texto Ordenado del Sucive 2026 — Permiso Único Nacional de Conducir (PUNC)',
    sourceIndex: 1,
  },
  {
    headline: 'El examen médico queda AFUERA del costo unificado',
    detail:
      'Las UR 1,25 pagan la emisión del documento. El examen de aptitud psicofísica se cobra aparte y podés hacerlo en el servicio de la intendencia o en una clínica habilitada; su precio no está publicado a nivel nacional y por eso acá no figura ninguno.',
    quote:
      'Se unifica el costo del Permiso Único Nacional de Conducir (PUNC), por concepto de emisión de su documento, a excepción del examen médico habilitante, que podrá gestionarse en clínicas privadas como en los servicios de las Intendencias, en el valor de UR 1,25 según el protocolo vigente para cada categoría.',
    article: 'Texto Ordenado del Sucive 2026 — Unificación de Costo del PUNC',
    sourceIndex: 1,
  },
  {
    headline: 'El duplicado sale la mitad de lo que pagaste vos',
    detail:
      'La mitad de lo que abonaste por la libreta que perdiste, no la mitad de la tarifa máxima: si te habían dado tres años y pagaste UR 0,50, el duplicado sale UR 0,25. Va con denuncia policial.',
    quote:
      'En la duplicación por extravío o hurto, con presentación de denuncia policial correspondiente se abonará el 50% del monto que le correspondiere a la libreta perdida.',
    article: 'Texto Ordenado del Sucive 2026 — Permiso Único Nacional de Conducir (PUNC)',
    sourceIndex: 1,
  },
])

/**
 * La cita que sostiene la discrepancia entre el texto nacional y el mostrador.
 * Vive aparte de las reglas porque la página la muestra en su propio bloque:
 * no es una regla más, es la advertencia de que abajo de los 65 la rebaja puede
 * no corresponder.
 */
export const DRIVING_LICENCE_REDUCTION_QUOTE =
  'Para el caso de las restricciones en el plazo de validez establecidas por patologías médicas del solicitante y/o por edad avanzada (a partir de los 65 años cumplidos de edad), se abonará el 20%, 40%, 60% u 80% de dicho monto si dicho plazo es menor a 2, 4, 6 u 8 años respectivamente.'

/** Una pregunta frecuente, emitida además como FAQPage en JSON-LD. */
export interface DrivingLicenceFaq {
  q: string
  a: string
}

export const DRIVING_LICENCE_FAQS: readonly DrivingLicenceFaq[] = Object.freeze([
  {
    q: '¿Cuánto sale la libreta de conducir en Uruguay?',
    a: 'La emisión del documento cuesta UR 1,25 y el precio es el mismo en todo el país: el Congreso de Intendentes y el Sucive lo unificaron con vigencia desde el 1.º de setiembre de 2023, y el Texto Ordenado del Sucive 2026 lo mantiene. Esa tarifa corresponde a la primera expedición y a las libretas que se dan por 10 años; cuando el plazo se recorta se paga el 20 %, 40 %, 60 % u 80 % —o sea UR 0,25, 0,50, 0,75 o 1— según sea menor a 2, 4, 6 u 8 años. Aparte van el examen médico y los timbres o sellados de cada intendencia.',
  },
  {
    q: '¿Por qué a mí me cobraron menos que a otra persona?',
    a: 'Porque no pagaron por lo mismo. El importe es un porcentaje del costo de emisión según los años de vigencia que te otorgan, y esos años bajan con la edad: hasta los 55 son 10 años y se paga la tarifa entera; a los 60 son 5 años; a los 70, 3; a los 79, 2; y desde los 80, uno solo. Quien recibe la libreta por un año paga el 20 % de lo que paga quien la recibe por diez.',
  },
  {
    q: '¿Cuántos años me dan de libreta según mi edad?',
    a: 'En las categorías no profesionales (A, G1 y G2): 10 años hasta los 55; 9 a los 56; 8 a los 57; 7 a los 58; 6 a los 59; 5 entre los 60 y los 68; 4 a los 69; 3 entre los 70 y los 78; 2 a los 79; y 1 año desde los 80. Son plazos máximos y el examen médico puede acortarlos. Las categorías profesionales (B, C, D, E, F, H y G3) tienen una escala más corta y no pueden pasar del día en que cumplís 75 años.',
  },
  {
    q: '¿La rebaja por plazo corto se aplica a cualquier edad?',
    a: 'Ahí las fuentes no dicen lo mismo, y conviene saberlo antes de ir. El Texto Ordenado del Sucive ata la rebaja a las restricciones de plazo «por patologías médicas del solicitante y/o por edad avanzada (a partir de los 65 años cumplidos de edad)». Los trámites que publican Maldonado, Cerro Largo y Treinta y Tres en gub.uy publican la misma escala sin esa condición, sólo por meses de vigencia. Si tenés menos de 65 y te otorgan un plazo corto, confirmá el importe en tu intendencia: puede corresponderte la tarifa entera.',
  },
  {
    q: '¿La libreta de mi departamento sirve en Montevideo?',
    a: 'Sí. El artículo 26 de la Ley 18.191 obliga a todas las autoridades competentes a reconocer la licencia expedida en cualquier departamento y le da carácter de única y excluyente. Por eso mismo no podés tener dos libretas de dos intendencias distintas.',
  },
  {
    q: '¿Cuánto sale el duplicado si la perdí?',
    a: 'El 50 % del monto que correspondió a la libreta perdida, presentando la denuncia policial. Como lo que pagaste dependió del plazo que te habían dado, el duplicado también: no es la mitad de UR 1,25 salvo que hubieras pagado la tarifa entera.',
  },
  {
    q: '¿Por qué el precio está en UR y no en pesos?',
    a: 'Porque así lo fija el Texto Ordenado del Sucive y así lo publican los trámites. La Unidad Reajustable la actualiza el INE todos los meses, de modo que el importe en pesos cambia mes a mes sin que nadie toque la tarifa. Publicar un peso fijo sería publicar un número vencido.',
  },
  {
    q: '¿Desde qué edad puedo sacar la libreta?',
    a: 'A los 18 años para las categorías de automóvil y a los 16 para la G1 de ciclomotores. Desde los 75 el trámite exige además una prueba práctica.',
  },
])

/** Un enlace interno relacionado. */
export interface DrivingLicenceRelated {
  to: string
  label: string
}

export const DRIVING_LICENCE_RELATED: readonly DrivingLicenceRelated[] = Object.freeze([
  { to: '/indicadores/unidad-reajustable', label: 'Cuánto vale hoy la Unidad Reajustable' },
  { to: '/multas-de-transito-y-patente-uruguay', label: 'Multas de tránsito y patente' },
  { to: '/carne-de-salud-uruguay', label: 'Carné de salud: cuándo es gratis' },
  {
    to: '/cuanto-sale-la-cedula-de-identidad-uruguaya',
    label: 'Cuánto sale la cédula de identidad',
  },
])
