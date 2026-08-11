// app/utils/residency.ts
// Datos de /mudarme-a-uruguay-residencia: la residencia LEGAL ante Migración, que no es la
// residencia FISCAL, y qué se pide realmente para cada vía.
//
// POR QUÉ EXISTE: «mudarse a Uruguay» es el cluster con más engagement de todo lo que quedaba sin
// cubrir — 165 preguntas y 3.247 de interacción, con hilos como «¿Es viable vivir en Uruguay con
// una oferta de trabajo de USD 5.300 al mes para una familia de cuatro?» (239 comentarios).
//
// LO QUE EL SITIO YA TENÍA: la residencia FISCAL, y bien — Título 7 art. 2, los 183 días, el
// núcleo de intereses, la residencia por inversión. Lo que no estaba en ningún lado era la
// residencia LEGAL ante la Dirección Nacional de Migración. Grep de «residencia legal» sobre
// app/ sólo daba un match incidental.
//
// LA CONFUSIÓN QUE ESTA PÁGINA DESHACE: son dos cosas distintas, con dos organismos distintos y
// dos efectos distintos. Se puede ser residente fiscal sin ser residente legal, y al revés.
//
// EL DATO QUE CORRIGE LA CREENCIA MÁS EXTENDIDA: no hay un monto mínimo de ingreso publicado
// para la residencia. La norma pide acreditar «medios de vida», no una cifra. Los números que
// circulan en los hilos son de otros países o inventados.
//
// LO QUE FALTABA, Y ES LO SEGUNDO QUE MÁS SE PREGUNTA: la cédula. Aparecía una sola vez en todo
// el archivo, de pasada, y ninguna de las preguntas la tocaba — cuando en los hilos la secuencia
// real es «no puedo hacer NADA sin cédula, ¿tengo que esperar a que salga la residencia?».
// La respuesta verificada es que no: el trámite del Documento Nacional de Identidad para personas
// nacidas en el exterior admite el «Certificado de Residencia en trámite expedido por la Dirección
// Nacional de Migración», tanto para sacarla por primera vez como para renovarla.
//
// CUÁNTO VALE ESA CÉDULA, Y POR QUÉ CASI LO PUBLICAMOS MAL: ninguna ficha de gub.uy declara el
// plazo, así que es fácil concluir que no existe. Existe, y hay que seguir la cadena entera. El
// Decreto-Ley 14.193 fue derogado por el DL 14.762 (art. 48), y con él quedó atrás su reglamento
// 583/975 (un año renovable) — pero el 14.762 tiene su propio reglamento, el Decreto 501/978, que
// IMPO da como «Documento Actualizado» sin nota de derogación. Su art. 15 es exactamente este
// caso: al extranjero que no terminó el trámite ante Migración «se le expedirá con carácter de
// provisoria» la cédula. Y el Decreto 208/013 art. 1 (también vigente) elevó la vigencia inicial
// de un año a DOS, «pudiendo renovarse hasta en dos oportunidades, por el plazo de un año cada
// una». Quedarse en el eslabón derogado y publicar «no hay plazo» era una ausencia falsa.
//
// LO QUE NO INFERIMOS: que la cédula «siga al expediente». Que para renovar haya que volver a
// presentar el certificado de Migración dice qué papel se presenta, no de qué depende la vigencia:
// el plazo del 208/013 es fijo y corre solo. De hecho su CONSIDERANDO lo subió justamente porque
// un año no acompañaba lo que hoy demora la residencia permanente.
//
// LO QUE TAMPOCO RESPONDEMOS, A PROPÓSITO: qué banco te abre una cuenta con qué papel. Eso es
// política comercial de cada banco, no norma, y la única respuesta honesta sería «depende».
//
// FUENTES, verificadas el 2026-08-10:
//   - gub.uy, «Residencia Legal - Permanente» (requisitos, costo, dónde)
//     https://www.gub.uy/tramites/residencia-legal-permanente
//   - gub.uy, «Residencia Legal - Temporaria Mercosur»
//     https://www.gub.uy/tramites/residencia-legal-temporaria-mercosur
//   - gub.uy, «Residencia Legal - Permanente Mercosur»
//     https://www.gub.uy/tramites/residencia-legal-permanente-mercosur
//   - gub.uy, «Documento Nacional de Identidad - Primera Vez - Personas nacidas en el exterior con
//     residencia en trámite, legal definitiva, o definitiva Mercosur» (certificado en trámite,
//     partida inscripta en la sección extranjeros, costo $456 desde el 1/7/2026)
//     https://www.gub.uy/tramites/documento-nacional-identidad-primera-vez-personas-nacidas-exterior-residencia-tramite-legal-definitiva-definitiva-mercosur
//   - gub.uy, «Documento Nacional de Identidad - Renovación …» (mismo certificado para renovar)
//     https://www.gub.uy/tramites/documento-nacional-identidad-renovacion-personas-nacidas-exterior-residencia-tramite-legal-definitiva-definitiva-mercosur
//   - IMPO, Decreto 501/978 art. 15 (texto vigente): la cédula provisoria del residente en trámite
//     https://www.impo.com.uy/bases/decretos/501-1978/15
//   - IMPO, Decreto 208/013 art. 1 (texto vigente): dos años iniciales, renovables hasta dos veces
//     https://www.impo.com.uy/bases/decretos/208-2013
//   - Dirección Nacional de Migración
//     https://migracion.minterior.gub.uy/

/** Fecha en que requisitos y costo se contrastaron con Migración. */
export const RESIDENCY_VERIFIED_AT = '2026-08-10'

export interface ResidencySource {
  label: string
  url: string
}

export const RESIDENCY_SOURCES: readonly ResidencySource[] = Object.freeze([
  {
    label: 'gub.uy — Residencia Legal Permanente',
    url: 'https://www.gub.uy/tramites/residencia-legal-permanente',
  },
  {
    label: 'gub.uy — Residencia Legal Temporaria Mercosur',
    url: 'https://www.gub.uy/tramites/residencia-legal-temporaria-mercosur',
  },
  {
    label: 'gub.uy — Residencia Legal Permanente Mercosur',
    url: 'https://www.gub.uy/tramites/residencia-legal-permanente-mercosur',
  },
  {
    label: 'gub.uy — Documento Nacional de Identidad, primera vez (residencia en trámite)',
    url: 'https://www.gub.uy/tramites/documento-nacional-identidad-primera-vez-personas-nacidas-exterior-residencia-tramite-legal-definitiva-definitiva-mercosur',
  },
  {
    label: 'gub.uy — Documento Nacional de Identidad, renovación (residencia en trámite)',
    url: 'https://www.gub.uy/tramites/documento-nacional-identidad-renovacion-personas-nacidas-exterior-residencia-tramite-legal-definitiva-definitiva-mercosur',
  },
  {
    label: 'IMPO — Decreto 501/978, art. 15 (cédula provisoria del residente en trámite)',
    url: 'https://www.impo.com.uy/bases/decretos/501-1978/15',
  },
  {
    label: 'IMPO — Decreto 208/013, art. 1 (vigencia inicial de dos años)',
    url: 'https://www.impo.com.uy/bases/decretos/208-2013',
  },
  { label: 'Dirección Nacional de Migración', url: 'https://migracion.minterior.gub.uy/' },
])

// ---------------------------------------------------------------------------
// Las dos residencias que no son la misma
// ---------------------------------------------------------------------------

export interface ResidencyKind {
  id: 'legal' | 'fiscal'
  label: string
  organism: string
  what: string
  effect: string
  /** Ruta interna que lo desarrolla, si el sitio ya la tiene. */
  to?: string
  icon: string
}

export const RESIDENCY_KINDS: readonly ResidencyKind[] = Object.freeze([
  {
    id: 'legal',
    label: 'Residencia legal',
    organism: 'Dirección Nacional de Migración',
    what: 'El permiso para vivir en el país de forma regular.',
    effect:
      'Es lo que te habilita a residir y a trabajar en regla. Se pide con documentación personal, antecedentes y acreditación de medios de vida. La cédula no espera al final: con el certificado de residencia en trámite de Migración ya la podés sacar.',
    icon: 'mdi-passport',
  },
  {
    id: 'fiscal',
    label: 'Residencia fiscal',
    organism: 'DGI',
    what: 'Dónde tributás, que es otra pregunta por completo.',
    effect:
      'Se configura por presencia (más de 183 días en el año civil), por tener acá el núcleo principal de tus intereses, o por inversión. Nada de eso te da permiso para vivir en el país.',
    to: '/impuestos-inversiones-uruguay',
    icon: 'mdi-file-percent-outline',
  },
])

/** La aclaración que hay que hacer antes que nada. */
export const RESIDENCY_NOT_THE_SAME =
  'La residencia legal y la residencia fiscal son dos cosas distintas, las dan dos organismos distintos y sirven para cosas distintas. Podés ser residente fiscal en Uruguay sin tener residencia legal, y podés tener residencia legal sin ser residente fiscal. Confundirlas lleva a hacer el trámite equivocado.'

// ---------------------------------------------------------------------------
// Las vías de la residencia legal
// ---------------------------------------------------------------------------

/** Países cuyos nacionales entran por la vía MERCOSUR, según el trámite de gub.uy. */
export const MERCOSUR_COUNTRIES: readonly string[] = Object.freeze([
  'Argentina',
  'Brasil',
  'Chile',
  'Bolivia',
  'Paraguay',
  'Perú',
  'Ecuador',
  'Colombia',
  'Venezuela',
  'Surinam',
  'Guyana',
])

export interface ResidencyPath {
  id: 'mercosur-temporaria' | 'mercosur-permanente' | 'no-mercosur-permanente'
  label: string
  who: string
  /** Duración, cuando aplica. */
  duration: string | null
  requirements: readonly string[]
  url: string
}

export const RESIDENCY_PATHS: readonly ResidencyPath[] = Object.freeze([
  {
    id: 'mercosur-temporaria',
    label: 'Temporaria MERCOSUR',
    who: 'Nacionales de los países del MERCOSUR y asociados.',
    duration: 'Hasta 2 años, renovable por el mismo período',
    requirements: [
      'Documento de identidad.',
      'Certificado de antecedentes penales del país de origen y de cualquier país donde hayas residido 6 meses o más en los últimos 5 años, apostillado y traducido.',
      'Partida de nacimiento apostillada y traducida.',
      'Certificado de vacunación.',
    ],
    url: 'https://www.gub.uy/tramites/residencia-legal-temporaria-mercosur',
  },
  {
    id: 'mercosur-permanente',
    label: 'Permanente MERCOSUR',
    who: 'Nacionales del MERCOSUR y asociados, y extranjeros familiares de uruguayos.',
    duration: null,
    requirements: [
      'La misma base documental que la temporaria.',
      'Partida que acredite el vínculo, cuando la vía es por familiar uruguayo.',
    ],
    url: 'https://www.gub.uy/tramites/residencia-permanente-nacionales-mercosur-estados-parte-asociados-extranjeros-familiares-uruguayos',
  },
  {
    id: 'no-mercosur-permanente',
    label: 'Permanente no MERCOSUR',
    who: 'Nacionales del resto del mundo.',
    duration: null,
    requirements: [
      'Documento de identidad vigente.',
      'Certificado de antecedentes penales del país de origen y de donde hayas residido 6 meses o más en los últimos 5 años, apostillado y traducido.',
      'Carné de salud uruguayo y certificado de vacunación de prestadores habilitados.',
      'Acreditación de medios de vida.',
      'Partida de matrimonio o de nacimiento cuando haya que probar un vínculo.',
    ],
    url: 'https://www.gub.uy/tramites/residencia-legal-permanente',
  },
])

/** Costo del trámite de residencia permanente, en Unidades Indexadas. */
export const RESIDENCY_FEE_UI = 557.3

/** Nacionalidades exentas del pago, según el trámite. */
export const RESIDENCY_FEE_EXEMPT: readonly string[] = Object.freeze(['Brasil', 'Paraguay'])

/** Dónde se hace. Importa porque mucha gente lo intenta desde afuera. */
export const RESIDENCY_WHERE =
  'El trámite se inicia en línea y se completa con comparecencia presencial y la documentación original, en Mercedes 1004 (Montevideo) o en las oficinas del interior de la Dirección Nacional de Migración. Es decir: se hace en Uruguay.'

/**
 * EL DATO QUE MÁS SE PREGUNTA Y QUE NO TIENE LA RESPUESTA QUE LA GENTE ESPERA.
 * El trámite exige acreditar «medios de vida» a través de alguna categoría de actividad
 * (dependiente, por cuenta propia, titular de empresa), pero no publica un umbral de ingreso.
 */
export const MEANS_OF_LIVING_RULE =
  'No hay un monto mínimo de ingreso publicado. Lo que se exige es acreditar medios de vida por alguna de las categorías previstas —trabajo en relación de dependencia, por cuenta propia, titularidad de empresa— y no una cifra. Cualquier número que circule como «el ingreso que piden» no sale del trámite oficial.'

export interface ResidencyFaq {
  question: string
  short: string
  answer: string
}

export const RESIDENCY_FAQ: readonly ResidencyFaq[] = Object.freeze([
  {
    question: '¿Cuánto ingreso tengo que demostrar para la residencia?',
    short: 'No hay un monto publicado: se acreditan «medios de vida», no una cifra.',
    answer:
      'Es la pregunta que más se repite y la respuesta desarma la expectativa: el trámite exige acreditar medios de vida por alguna de las categorías previstas —relación de dependencia, cuenta propia, titularidad de empresa— pero no publica un umbral de ingreso. Los montos que circulan en los hilos suelen ser de otros países o directamente inventados. Si alguien te dice una cifra exacta, pediles la fuente.',
  },
  {
    question: '¿La residencia legal me hace residente fiscal?',
    short: 'No. Son dos cosas distintas, de dos organismos distintos.',
    answer:
      'La residencia legal la da Migración y es el permiso para vivir acá. La residencia fiscal la determina la DGI y define dónde tributás: se configura por estar más de 183 días en el año civil, por tener acá el núcleo principal de tus intereses, o por inversión. Se puede tener una sin la otra, y confundirlas lleva a hacer el trámite equivocado.',
  },
  {
    question: 'Soy argentino, brasileño o de un país del MERCOSUR: ¿cambia algo?',
    short: 'Sí: hay una vía MERCOSUR con requisitos más simples.',
    answer:
      'Los nacionales de Argentina, Brasil, Chile, Bolivia, Paraguay, Perú, Ecuador, Colombia, Venezuela, Surinam y Guyana entran por la vía MERCOSUR, que tiene una temporaria de hasta dos años renovable y también una permanente. La base documental es más liviana que la de no MERCOSUR: no aparece el requisito de acreditar medios de vida ni el carné de salud uruguayo que sí pide la permanente general.',
  },
  {
    question: '¿Puedo hacer el trámite desde mi país?',
    short: 'No: se completa en Uruguay, con comparecencia presencial.',
    answer:
      'Se inicia en línea, pero se completa presentándote con la documentación original en Mercedes 1004 en Montevideo o en una oficina del interior de la Dirección Nacional de Migración. Hay una tolerancia de diez minutos para la cita y, si te falta un documento requerido, se pierde el pago.',
  },
  {
    question: '¿Tengo que esperar a que salga la residencia para sacar la cédula?',
    short: 'No: alcanza el certificado de residencia EN TRÁMITE de Migración.',
    answer:
      'No, y es de lo poco en este trámite que no te hace esperar. El Documento Nacional de Identidad para personas nacidas en el exterior admite expresamente el «Certificado de Residencia en trámite expedido por la Dirección Nacional de Migración»: no necesitás tener resuelta la residencia legal definitiva ni la definitiva MERCOSUR. Lo otro que te van a pedir es el testimonio de la partida de nacimiento inscripta en la sección extranjeros del Registro Civil uruguayo. El trámite por primera vez figura en $456, vigente desde el 1/7/2026, y los únicos plazos que la ficha publica son los de retiro: los menores de 9 años se llevan el documento el mismo día, y de 10 en adelante se retira a partir de 5 días hábiles, con un máximo de 90 días para pasar a buscarlo. Si tenés residencia temporaria o temporaria MERCOSUR, el trámite es otro y lo que se presenta es el certificado de esa residencia.',
  },
  {
    question: '¿Cuánto dura la cédula que saqué con la residencia en trámite?',
    short: 'Dos años, renovables hasta dos veces por un año cada una.',
    answer:
      'Dos años, y después hasta dos renovaciones de un año cada una: cuatro años de cédula provisoria en total. No lo busques en gub.uy, porque ninguna de las dos fichas de Documento Nacional de Identidad declara el plazo; está en la norma. El Decreto 501/978, reglamentario del Decreto-Ley 14.762, dice en su artículo 15 que al extranjero que todavía no terminó el trámite ante Migración se le expide la cédula «con carácter de provisoria», y el Decreto 208/013 en su artículo 1 elevó ese período de vigencia inicial a dos años, «pudiendo renovarse hasta en dos oportunidades, por el plazo de un año cada una». Es un plazo propio: no depende de cuándo se resuelva tu expediente de residencia. De hecho el considerando del 208/013 subió el plazo justamente porque un año se le había quedado corto a lo que hoy demora obtener la residencia permanente. Para renovarla sí tenés que volver a presentar el certificado de Migración: el de residencia en trámite si todavía no salió, o el de la definitiva cuando salga.',
  },
  {
    question: '¿Cuánto sale?',
    short: '557,30 UI para la permanente, con Brasil y Paraguay exentos.',
    answer:
      'El trámite de residencia permanente tiene un costo de 557,30 Unidades Indexadas, y los nacionales de Brasil y Paraguay están exentos del pago. Como está expresado en UI, el importe en pesos cambia con el valor de la unidad: conviene mirarlo el día que vayas a pagar.',
  },
  {
    question: '¿Y me alcanza para vivir acá?',
    short: 'Esa es otra pregunta, y se responde con números, no con opiniones.',
    answer:
      'Es la otra mitad de lo que la gente pregunta cuando dice que se quiere mudar. Depende de la ciudad, de si alquilás, de cuántos son y del estilo de vida. Para eso está la calculadora de costo de vida del sitio, que arma un presupuesto mensual realista con referencias locales en vez de una impresión.',
  },
])
