// app/utils/seasonalRental.ts
// El alquiler de temporada en Uruguay: qué contrato es, legalmente, y qué obligaciones nacieron
// con la Ley 20.352 para quien lo ofrece como alojamiento turístico.
//
// POR QUÉ EXISTE. El racimo de alquiler del sitio es el de mejor CTR y está casi entero —garantía,
// depósito, desalojo, clearing, pagar en efectivo, el crédito fiscal, los portales—, pero todo él
// habla del alquiler de vivienda permanente. El contrato de temporada es OTRO régimen, y la norma
// que lo define hoy —la Ley 20.352, de setiembre de 2024— no aparecía en ninguna página: su único
// rastro en el repositorio era un párrafo al pie de la calculadora de costo de vida
// (`utils/costOfLiving.ts`), que la cita para aclarar que esos contratos no entran en sus promedios.
//
// EL ÁNGULO PROPIO son dos cosas que ninguna caja de respuestas de Google da hoy:
//
//  1. QUÉ CONVIERTE A UN ALQUILER EN «DE TEMPORADA» NO ES EL VERANO NI EL NOMBRE DEL CONTRATO: es
//     el art. 28, lit. A del Decreto-Ley 14.219, con la redacción que le dio el art. 5 de la Ley
//     20.352 — inmueble en zona turística y plazo que no supere los 120 días. De ahí cuelga todo lo
//     demás, incluido el desalojo de quince días, que es el dato que decide una consulta.
//
//  2. LA LEY 20.352 YA RIGE Y SU REGLAMENTO TODAVÍA SE ESPERA, Y ESO SE DICE CON FECHAS en vez de
//     resolverlo para un lado o para el otro. La ley está publicada desde el 27/09/2024 y su art. 3
//     manda presentar una declaración jurada en el Registro de Operadores Turísticos del Ministerio
//     de Turismo e incluir el número de inscripción «en toda oferta». Su art. 6 encarga al Poder
//     Ejecutivo reglamentarla; el Ministerio de Turismo comunicó el 24/11/2025 que presentó el
//     PROYECTO de decreto, y el trámite público de inscripción del propio Ministerio —actualizado
//     el 02/03/2026— no lista «vivienda turística» ni «inmueble de uso turístico» entre sus
//     categorías. Las tres cosas son verificables y van las tres, con su fecha.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA (ver `SEASONAL_UNPUBLISHED`): ningún monto de multa, ninguna
// fecha de entrada en vigencia del registro y ninguna lista de «zonas turísticas». No están en la
// ley ni en una norma oficial publicada, y las versiones que circulan salen de notas de prensa
// sobre un proyecto que todavía no es decreto.
//
// FUENTES, cotejadas el 2026-10-19 (lista completa en `SEASONAL_SOURCES`): impo.com.uy para los dos
// textos legales y gub.uy para las dos piezas del Ministerio de Turismo.
//
// MÓDULO PURO (sin Vue/Nuxt) para que vitest-node lo cargue con imports relativos.

/** Fecha en la que se cotejó todo este archivo contra sus fuentes. */
export const SEASONAL_VERIFIED_AT = '2026-10-19'

/** La ruta de la página, en un solo lugar. */
export const SEASONAL_PATH = '/alquiler-de-temporada-uruguay'

/** El plazo máximo que el art. 28, lit. A del Decreto-Ley 14.219 le pone al contrato de temporada. */
export const SEASONAL_MAX_DAYS = 120

/** El plazo de desalojo que ese mismo literal fija para estos contratos. */
export const SEASONAL_EVICTION_DAYS = 15

/** Los años que la Ley 20.352 obliga a conservar los datos de los huéspedes. */
export const SEASONAL_GUEST_DATA_YEARS = 5

export interface SeasonalSource {
  readonly id: string
  readonly label: string
  readonly url: string
  /** La fecha que la propia fuente muestra (promulgación, publicación o última actualización). */
  readonly shownAt?: string
}

const IMPO_ART_28 = 'https://www.impo.com.uy/bases/decretos-ley/14219-1974/28'
const IMPO_ART_76 = 'https://www.impo.com.uy/bases/decretos-ley/14219-1974/76'
const IMPO_LEY_20352 = 'https://www.impo.com.uy/bases/leyes/20352-2024'
const MINTUR_PROYECTO =
  'https://www.gub.uy/ministerio-turismo/comunicacion/noticias/ministerio-turismo-presento-proyecto-regulacion-vivienda-turistica'
const MINTUR_TRAMITE = 'https://www.gub.uy/tramites/inscripcion-prestador-turistico-alojamientos'

export const SEASONAL_SOURCES: readonly SeasonalSource[] = Object.freeze([
  Object.freeze({
    id: 'impo-28',
    label:
      'IMPO — Decreto-Ley 14.219, art. 28, lit. A: la definición del contrato por temporada, el plazo de 120 días y el desalojo de quince',
    url: IMPO_ART_28,
    shownAt: '2024-09-19',
  }),
  Object.freeze({
    id: 'impo-76',
    label:
      'IMPO — Decreto-Ley 14.219, art. 76, lit. E: la excepción que permite pactar el precio en moneda extranjera',
    url: IMPO_ART_76,
  }),
  Object.freeze({
    id: 'impo-20352',
    label:
      'IMPO — Ley 20.352, «Regulación normativa para las actividades de alojamiento turístico en inmuebles»',
    url: IMPO_LEY_20352,
    shownAt: '2024-09-27',
  }),
  Object.freeze({
    id: 'mintur-proyecto',
    label:
      'Ministerio de Turismo — «El Ministerio de Turismo presentó el proyecto de regulación de vivienda turística»',
    url: MINTUR_PROYECTO,
    shownAt: '2025-11-24',
  }),
  Object.freeze({
    id: 'mintur-tramite',
    label:
      'gub.uy — Inscripción Prestador Turístico, categoría Alojamientos: requisitos, costo y vigencia',
    url: MINTUR_TRAMITE,
    shownAt: '2026-03-02',
  }),
])

export interface SeasonalRule {
  readonly id: string
  readonly label: string
  readonly detail: string
  /** El id de la fuente que sostiene la regla. */
  readonly sourceId: string
}

/**
 * Las reglas del CONTRATO, que son las que le importan a las dos partes de un alquiler de verano.
 *
 * Todas salen del Decreto-Ley 14.219 y ninguna se parafrasea de segunda mano: el literal A del
 * art. 28 tiene hoy la redacción que le dio el art. 5 de la Ley 20.352, y así está anotado en la
 * propia ficha de IMPO.
 */
export const SEASONAL_RULES: readonly SeasonalRule[] = Object.freeze([
  Object.freeze({
    id: 'plazo',
    label: `El plazo no puede pasar de ${SEASONAL_MAX_DAYS} días`,
    detail:
      'Es la definición, no un consejo: el art. 28, lit. A considera contrato por temporada «el arrendamiento de inmuebles en las zonas turísticas, cuyo plazo de vigencia no sea superior a 120 (ciento veinte) días». Un contrato más largo no es de temporada, se llame como se llame.',
    sourceId: 'impo-28',
  }),
  Object.freeze({
    id: 'zona',
    label: 'Tiene que ser en zona turística',
    detail:
      'La condición es doble: el plazo y el lugar. El texto vigente habla de «zonas turísticas», sin enumerarlas; la redacción anterior del mismo literal remitía a las zonas balnearias que delimitaran los Gobiernos Departamentales fuera de Montevideo.',
    sourceId: 'impo-28',
  }),
  Object.freeze({
    id: 'fuera',
    label: 'Queda fuera de la Ley de Arrendamientos, con dos excepciones',
    detail:
      'El encabezado del art. 28 dice que estas situaciones «no estarán comprendidas en las normas de esta ley, con excepción de las contenidas en el Capítulo VII y Sección I del Capítulo VIII». O sea que el plazo mínimo de dos años, el reajuste anual y el resto del régimen protector del inquilino de vivienda no se aplican.',
    sourceId: 'impo-28',
  }),
  Object.freeze({
    id: 'desalojo',
    label: `El desalojo es de ${SEASONAL_EVICTION_DAYS} días`,
    detail:
      'Lo dice el mismo literal, en una sola línea: «En estos casos el plazo de desalojo será de quince días». En un alquiler de vivienda permanente ese plazo se mide en meses o en años según el caso.',
    sourceId: 'impo-28',
  }),
  Object.freeze({
    id: 'retencion',
    label: 'Quedarse de más tiene consecuencia escrita',
    detail:
      'El inquilino que retenga la finca «por más tiempo del acordado en el contrato será responsable de los daños y perjuicios que esa retención indebida irrogue al arrendador». No hay que pactarlo: ya está en la ley.',
    sourceId: 'impo-28',
  }),
  Object.freeze({
    id: 'uso-ilegitimo',
    label: 'Y usar el contrato de temporada para otra cosa también',
    detail:
      'La sanción de ese abuso apunta al ARRENDADOR, no al inquilino: comprobada la «utilización ilegítima del contrato de arrendamiento por temporada», el arrendador «será condenado, preceptivamente, en los tributos y costos y en los daños y perjuicios causados al arrendatario».',
    sourceId: 'impo-28',
  }),
  Object.freeze({
    id: 'moneda',
    label: 'Con turistas extranjeros se puede pactar en moneda extranjera',
    detail:
      'La regla general del art. 76 prohíbe fijar el precio del arrendamiento en moneda extranjera, y su literal E trae la excepción: «Esta disposición no rige para los arrendamientos por temporada celebrados con turistas extranjeros».',
    sourceId: 'impo-76',
  }),
])

export interface SeasonalDuty {
  readonly id: string
  readonly label: string
  readonly detail: string
  /** El artículo de la Ley 20.352 del que sale la obligación. */
  readonly article: string
}

/**
 * Lo que la Ley 20.352 le pide a quien OFRECE el inmueble como alojamiento turístico, que es otra
 * cosa que alquilar por temporada: la ley alcanza al «hospedaje transitorio, en condiciones de
 * inmediata ocupación en el que se ofrezcan uno o más servicios en forma onerosa».
 */
export const SEASONAL_DUTIES: readonly SeasonalDuty[] = Object.freeze([
  Object.freeze({
    id: 'declaracion',
    label: 'Presentar una declaración jurada en el Registro de Operadores Turísticos',
    detail:
      'La presenta el propietario, administrador o explotador del inmueble, ante el Registro de Operadores Turísticos del Ministerio de Turismo.',
    article: 'art. 3',
  }),
  Object.freeze({
    id: 'numero',
    label: 'Poner el número de inscripción en toda oferta',
    detail:
      'El número que otorga el Registro «deberá incluirse en toda oferta», física o electrónica. La ley no dice en qué formato ni en qué lugar del aviso.',
    article: 'art. 3',
  }),
  Object.freeze({
    id: 'controles',
    label: 'Someterse a los controles e inspecciones del Ministerio de Turismo',
    detail:
      'Con el alcance de la Ley 19.253, la ley marco de turismo, y de sus decretos reglamentarios.',
    article: 'art. 4',
  }),
  Object.freeze({
    id: 'informe',
    label: 'Informar cuántos turistas se alojaron y cuántos días',
    detail:
      'Al Ministerio de Turismo, anualmente o cuando se lo requiera, junto con cualquier otra información que fije la reglamentación.',
    article: 'art. 4',
  }),
  Object.freeze({
    id: 'interior',
    label: 'Informar al Ministerio del Interior quiénes son los huéspedes',
    detail: `Nombre, documento y país de procedencia, con copia de los documentos, y conservados por ${SEASONAL_GUEST_DATA_YEARS} años. El turista tiene que dar consentimiento informado previo para el uso de esos datos.`,
    article: 'art. 4',
  }),
])

export interface SeasonalUnpublished {
  readonly id: string
  readonly label: string
  readonly why: string
}

/**
 * Lo que esta página no publica, con el motivo escrito al lado.
 *
 * Las tres cifras que faltan circulan en notas de prensa sobre el proyecto de decreto. Un proyecto
 * no es una norma, y publicar una multa que todavía nadie puede cobrar es exactamente el error que
 * este sitio no comete.
 */
export const SEASONAL_UNPUBLISHED: readonly SeasonalUnpublished[] = Object.freeze([
  Object.freeze({
    id: 'multas',
    label: 'Cuánto es la multa por no registrarse',
    why: 'La Ley 20.352 no fija montos y no hay decreto reglamentario publicado que los fije. La comunicación del Ministerio de Turismo del 24 de noviembre de 2025 dice que el Ministerio será la autoridad de control y aplicará sanciones «bajo criterios de proporcionalidad y razonabilidad», sin una sola cifra.',
  }),
  Object.freeze({
    id: 'vigencia',
    label: 'Desde qué día hay que estar inscripto',
    why: 'El art. 6 de la ley encarga al Poder Ejecutivo reglamentarla, el Ministerio presentó el proyecto de decreto el 24 de noviembre de 2025 y el trámite público de inscripción del propio Ministerio, actualizado el 2 de marzo de 2026, no lista «vivienda turística» ni «inmueble de uso turístico» entre sus categorías. Lo que sí está vigente, porque no depende de ningún decreto, es la definición del contrato por temporada que esta página explica arriba.',
  }),
  Object.freeze({
    id: 'zonas',
    label: 'Qué lugares son «zona turística»',
    why: 'El texto vigente del art. 28, lit. A no enumera ninguna. Una lista armada por nosotros sería una invención con apariencia de dato, y es justo la parte de la que depende si tu contrato entra o no en el régimen.',
  }),
  Object.freeze({
    id: 'irpf',
    label: 'La tasa exacta de IRPF del arrendamiento',
    why: 'No porque no exista, sino porque no es de esta página: el tratamiento cambia según el destino, la duración y los servicios que se presten. La guía de alquiler temporario y la de IRPF lo tratan con sus propias fuentes.',
  }),
])

export interface SeasonalFaq {
  readonly question: string
  readonly answer: string
}

export const SEASONAL_FAQ: readonly SeasonalFaq[] = Object.freeze([
  Object.freeze({
    question: '¿Qué es un contrato de alquiler por temporada en Uruguay?',
    answer:
      'El art. 28, lit. A del Decreto-Ley 14.219 —con la redacción que le dio el art. 5 de la Ley 20.352— considera contrato por temporada el arrendamiento de inmuebles en las zonas turísticas cuyo plazo de vigencia no sea superior a 120 días. Esos contratos quedan fuera de las normas de la Ley de Arrendamientos, salvo las del Capítulo VII y la Sección I del Capítulo VIII.',
  }),
  Object.freeze({
    question: '¿Cuánto es el plazo de desalojo en un alquiler de temporada?',
    answer:
      'Quince días. El mismo literal A lo dice en una línea: «En estos casos el plazo de desalojo será de quince días».',
  }),
  Object.freeze({
    question: '¿Qué pasa si el inquilino se queda más de lo pactado?',
    answer:
      'La ley lo resuelve sin que haya que pactarlo: el inquilino que retenga la finca arrendada por temporada por más tiempo del acordado en el contrato es responsable de los daños y perjuicios que esa retención indebida le cause al arrendador.',
  }),
  Object.freeze({
    question: '¿Se puede pactar el alquiler de temporada en dólares?',
    answer:
      'El art. 76 del Decreto-Ley 14.219 prohíbe en general fijar el precio del arrendamiento en moneda extranjera, y su literal E exceptúa expresamente a los arrendamientos por temporada celebrados con turistas extranjeros.',
  }),
  Object.freeze({
    question: '¿Hay que registrarse para alquilar por Airbnb en Uruguay?',
    answer:
      'La Ley 20.352, publicada el 27 de setiembre de 2024, obliga a quien ofrece hospedaje transitorio con servicios a presentar una declaración jurada en el Registro de Operadores Turísticos del Ministerio de Turismo y a incluir el número de inscripción en toda oferta, física o electrónica. Su art. 6 encarga al Poder Ejecutivo reglamentarla; el Ministerio comunicó el 24 de noviembre de 2025 que presentó el proyecto de decreto, y su trámite público de inscripción, actualizado el 2 de marzo de 2026, todavía no lista una categoría de vivienda turística.',
  }),
  Object.freeze({
    question: '¿Cuánto sale inscribirse como prestador turístico?',
    answer:
      'El trámite «Inscripción Prestador Turístico» del Ministerio de Turismo dice «No tiene costo», se puede hacer en línea con usuario gub.uy o cédula electrónica, y la inscripción tiene una vigencia de 5 años.',
  }),
])
