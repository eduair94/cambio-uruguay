// Cuánto sale la cédula de identidad uruguaya: aranceles, exoneraciones y plazos.
//
// Módulo PURO (sin Vue/Nuxt, sin estado global, imports relativos) para que
// `pages/cuanto-sale-la-cedula-de-identidad-uruguaya.vue` no duplique el
// catálogo y vitest lo pueda cargar en Node.
//
// POR QUÉ ESTA PÁGINA. El arancel de la cédula existe, está publicado y es casi
// imposible de encontrar: gub.uy NO lo pone en la ficha «Documento Nacional de
// Identidad», que es la que sale en el buscador y es apenas un selector de
// casos. El importe vive un clic más adentro, repetido en DIECISÉIS fichas —
// diez de renovación y seis de primera vez, una por vía de ciudadanía o
// residencia—, y hay que abrir la que te toca para verlo. Tanto es así que
// `utils/passport.ts` publicaba, de buena fe, que la ficha «no tiene bloque de
// costos: no publica arancel». La ficha índice, en efecto, no lo tiene; las
// dieciséis de abajo, sí.
//
// LAS DOS RESPUESTAS QUE NADIE JUNTA EN UNA PANTALLA:
//
//  1. La renovación ($443) sale MENOS que la primera vez ($456). Es al revés
//     que el pasaporte, donde la primera vez cuesta un 45 % más que renovar.
//  2. El urgente es exactamente el doble del común ($886 = $443 × 2), y sólo
//     existe para la renovación: las seis fichas de primera vez publican un
//     único importe, sin modalidad urgente.
//
// LA REGLA DE LAS CIFRAS. Todo importe de acá sale textual del bloque «Costos»
// de una ficha de trámite de gub.uy, verificado ficha por ficha el
// {@link ID_CARD_VERIFIED_AT}. Las dieciséis se leyeron enteras y NO dicen todas
// lo mismo — ver {@link ID_CARD_DISCREPANCIES}: eso también se publica, porque
// una fuente oficial que se contradice consigo misma es justo el dato que el
// lector no puede ver desde la ficha que abrió.
//
// LO QUE NO SE PUBLICA, A PROPÓSITO (ver {@link ID_CARD_UNPUBLISHED}): la
// vigencia del documento y el recargo operativo de Abitab, Redpagos y Correo.
// Las dos son preguntas que la gente hace y las dos las contestaríamos de
// memoria. Las fichas no las traen, así que la página dice que no las trae.

/** Una fuente primaria: etiqueta legible + URL oficial. */
export interface IdCardSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo este archivo contra las fichas oficiales. */
export const ID_CARD_VERIFIED_AT = '2026-09-08'

/** Ruta de la página; el mismo slug en los tres idiomas (i18n prefija /en y /pt). */
export const ID_CARD_PATH = '/cuanto-sale-la-cedula-de-identidad-uruguaya'

// ---------------------------------------------------------------------------
// Los aranceles
// ---------------------------------------------------------------------------

/** Una fila del cuadro de precios: un trámite y su importe en pesos. */
export interface IdCardFee {
  /** Id estable, usado como `:key`. */
  readonly key: string
  /** Nombre del trámite tal como lo llama la ficha oficial. */
  readonly label: string
  /** Importe en pesos uruguayos, textual del bloque «Costos». */
  readonly arancel: number
  /** Fecha desde la que rige, tal como la rotula la ficha (ISO). */
  readonly desde: string
  /** Qué cubre, en una línea. */
  readonly cubre: string
}

/**
 * Los tres importes que publican las fichas del Documento Nacional de Identidad.
 *
 * No hay un cuarto: la primera vez no tiene modalidad urgente en ninguna de sus
 * seis fichas, y el extravío y el deterioro no son trámites aparte (ver
 * {@link ID_CARD_SAME_AS_RENEWAL}).
 */
export const ID_CARD_FEES: readonly IdCardFee[] = [
  {
    key: 'renovacion-comun',
    label: 'Renovación, trámite común',
    arancel: 443,
    desde: '2026-01-01',
    cubre:
      'Renovar el documento «cualquiera sea su vigencia y estado de conservación», o reponerlo con la constancia policial de hurto o extravío.',
  },
  {
    key: 'renovacion-urgente',
    label: 'Renovación, trámite urgente',
    arancel: 886,
    desde: '2026-01-01',
    cubre: 'La misma renovación, apurada. Es el único importe urgente que publica el trámite.',
  },
  {
    key: 'primera-comun',
    label: 'Primera vez',
    arancel: 456,
    desde: '2026-07-01',
    cubre:
      'Sacar el documento por primera vez. Las seis fichas publican un solo importe: no hay modalidad urgente.',
  },
]

/** Índice por key, para que la página no busque en el array con `find` en cada render. */
export const ID_CARD_BY_KEY: Readonly<Record<string, IdCardFee>> = Object.freeze(
  Object.fromEntries(ID_CARD_FEES.map(fee => [fee.key, fee]))
)

/**
 * Cuántas veces el urgente sale lo que el común.
 *
 * Se calcula en vez de escribirse: si alguna vez se actualiza un arancel, no
 * puede quedar un «el doble» viejo al lado de dos importes nuevos. Hoy da 2
 * exacto, que es justamente lo que la página cuenta.
 */
export function recargoUrgente(): number {
  return ID_CARD_BY_KEY['renovacion-urgente']!.arancel / ID_CARD_BY_KEY['renovacion-comun']!.arancel
}

/** Diferencia en pesos entre sacarla por primera vez y renovarla. Positiva = la primera es más cara. */
export function sobreprecioPrimeraVez(): number {
  return ID_CARD_BY_KEY['primera-comun']!.arancel - ID_CARD_BY_KEY['renovacion-comun']!.arancel
}

// ---------------------------------------------------------------------------
// Lo que NO es un trámite aparte
// ---------------------------------------------------------------------------

/**
 * Las situaciones que la gente busca como si tuvieran arancel propio y no lo
 * tienen: son la renovación de $443.
 *
 * Sale del bloque «Requisitos» de la ficha de renovación, que pide el documento
 * «a renovar, cualquiera sea su vigencia y estado de conservación, o constancia
 * de hurto o extravío expedida por la seccional Policial dentro del territorio
 * nacional». No hay ficha de duplicado ni de deterioro.
 */
export const ID_CARD_SAME_AS_RENEWAL: readonly string[] = Object.freeze([
  'Se me perdió',
  'Me la robaron',
  'Está rota o ilegible',
  'Está vencida hace años',
])

// ---------------------------------------------------------------------------
// Las dos exoneraciones
// ---------------------------------------------------------------------------

/** Un caso en el que el trámite no se paga, con la norma o el organismo que lo habilita. */
export interface IdCardWaiver {
  readonly key: string
  /** A quién le corresponde. */
  readonly quien: string
  /** Qué queda exonerado, sin estirarlo más allá de lo que dice la fuente. */
  readonly alcance: string
  /** Cómo se pide, en una línea. */
  readonly como: string
  /** Norma citada por la propia ficha, o el organismo que lo administra. */
  readonly norma: string
  /** URL oficial. */
  readonly url: string
}

/**
 * Las dos vías por las que la cédula sale $0.
 *
 * Ojo con el alcance de la primera: el decreto exonera la renovación COMÚN. La
 * ficha no dice que cubra el urgente ni la primera vez, así que acá tampoco.
 */
export const ID_CARD_WAIVERS: readonly IdCardWaiver[] = [
  {
    key: 'hurto-rapina',
    quien: 'Víctimas de hurto o rapiña.',
    alcance:
      'La tasa de la renovación común. La ficha no la extiende al trámite urgente ni a la primera vez, y la DNIC evalúa si se cumplen las condiciones.',
    como: 'Radicar la denuncia en la Seccional y llevar la constancia original más una fotocopia. En Montevideo se tramita en Bartolomé Mitre 1434; en el interior, en cualquier oficina salvo Ciudad del Plata, Géant y Las Piedras.',
    norma:
      'Art. 178 inc. final de la Ley Nº 19.355, reglamentado por el Decreto 69/2016, según cita la propia ficha del trámite.',
    url: 'https://www.gub.uy/tramites/documento-nacional-identidad-renovacion-personas-ciudadanas-naturales-uruguayas',
  },
  {
    key: 'mides',
    quien:
      'Personas beneficiarias de programas del Mides (TUS, TUS DOBLE, UCC, SAF Hogar con franja ICC, Jóvenes en Red, ETAF, FOCO, GISC, PASC, PUS, Uruguay Trabaja, VBG y Víctima de Trata) o, en su defecto, en situación de vulnerabilidad socioeconómica.',
    alcance:
      'El costo del trámite, en cualquiera de sus cuatro causales: primera vez, renovación, deterioro y extravío.',
    como: 'Por una Oficina Territorial del Mides, o por WhatsApp al 092 643 370: mandar «hola» y elegir la opción 2 (Tramitar Cédula). El sistema contesta si el documento está exonerado o no antes de agendar.',
    norma: 'Trámite del Ministerio de Desarrollo Social — Dirección General de Secretaría.',
    url: 'https://www.gub.uy/tramites/exoneracion-costo-tramite-cedula-identidad',
  },
]

// ---------------------------------------------------------------------------
// Plazos y forma de pago
// ---------------------------------------------------------------------------

/** Un plazo publicado por la ficha, con a quién le corresponde. */
export interface IdCardDeadline {
  readonly key: string
  readonly quien: string
  readonly plazo: string
}

/**
 * Los plazos, tal como los publica la ficha de primera vez.
 *
 * La de renovación no publica plazo de entrega, así que acá no aparece: el
 * hueco se dice en {@link ID_CARD_UNPUBLISHED}, no se rellena con el de al lado.
 */
export const ID_CARD_DEADLINES: readonly IdCardDeadline[] = [
  {
    key: 'menores-9',
    quien: 'Menores de 9 años',
    plazo: 'Retiran el documento el mismo día que lo tramitan.',
  },
  {
    key: 'mayores-10',
    quien: 'Mayores de 10 años',
    plazo: 'A partir de 5 días hábiles de realizado el trámite, con un plazo máximo de 90 días.',
  },
  {
    key: 'devolucion',
    quien: 'Si pagaste y no fuiste',
    plazo:
      'Pasados los 90 días de la solicitud de la audiencia no se realizan devoluciones de dinero.',
  },
  {
    key: 'menores-14',
    quien: 'Menores de 14 años',
    plazo:
      'El trámite lo hace siempre el titular en persona, acompañado por alguien mayor de edad con documento vigente.',
  },
]

// ---------------------------------------------------------------------------
// Donde la fuente no se pone de acuerdo consigo misma
// ---------------------------------------------------------------------------

/** Una diferencia real entre dos fichas oficiales del mismo trámite. */
export interface IdCardDiscrepancy {
  readonly key: string
  /** Qué ficha discrepa. */
  readonly ficha: string
  /** Qué dice, textual. */
  readonly dice: string
  /** Por qué no cambiamos la respuesta principal por esto. */
  readonly lectura: string
  readonly url: string
}

/**
 * Las dos discrepancias que aparecieron al leer las dieciséis fichas.
 *
 * No invalidan la respuesta —quince de dieciséis coinciden— pero sí explican por
 * qué alguien puede abrir gub.uy y ver otro número, que es exactamente la duda
 * que trae a esta página.
 */
export const ID_CARD_DISCREPANCIES: readonly IdCardDiscrepancy[] = [
  {
    key: 'core-primera-vez',
    ficha: 'Primera vez — personas amparadas a la Comisión de Refugiados (CORE)',
    dice: '«443 $ · Valores a partir del 01/07/2025»',
    lectura:
      'Es la única de las seis fichas de primera vez que sigue en el importe anterior. Su última actualización es del 02/01/2026, seis meses anterior a la de las otras cinco, que pasaron a $456 el 01/07/2026.',
    url: 'https://www.gub.uy/tramites/documento-nacional-identidad-primera-vez-personas-amparadas-comision-refugiados-core',
  },
  {
    key: 'fecha-16021',
    ficha: 'Renovación y primera vez — personas nacionales uruguayas (Ley Nº 16.021)',
    dice: '«Valores a partir del 01/07/2025» en la de renovación y «01/01/2026» en la de primera vez',
    lectura:
      'Los importes son los mismos que en el resto ($443/$886 y $456): lo que quedó desactualizado es el rótulo de la fecha, no el precio.',
    url: 'https://www.gub.uy/tramites/documento-nacional-identidad-renovacion-personas-nacionales-uruguayas-ley-no-16021',
  },
]

// ---------------------------------------------------------------------------
// Lo que la fuente no publica
// ---------------------------------------------------------------------------

/** Un dato que la gente busca, que la fuente oficial NO publica, y por qué no lo inventamos. */
export interface IdCardUnpublished {
  readonly key: string
  readonly pregunta: string
  readonly porQue: string
}

export const ID_CARD_UNPUBLISHED: readonly IdCardUnpublished[] = [
  {
    key: 'vigencia',
    pregunta: '¿Cuántos años dura la cédula?',
    porQue:
      'Ninguna de las dieciséis fichas publica la vigencia del documento. Lo más cerca que están es el requisito de la renovación, que acepta el documento «cualquiera sea su vigencia»: sirve para saber que una cédula vencida hace mucho se renueva igual, no para saber cuánto dura la nueva. Preguntalo en la DNIC al hacer el trámite.',
  },
  {
    key: 'redes-de-cobranza',
    pregunta: '¿Cuánto me cobra Abitab o Redpagos por agendar?',
    porQue:
      'La ficha avisa que las reservas hechas por Red Pagos, Abitab y Correo Uruguayo «tienen costos operativos adicionales», y no los cifra. Lo que sí define es la otra vía: en las oficinas de la DNIC y en las redes de cobranza se paga exclusivamente en moneda nacional, en efectivo o con débito.',
  },
  {
    key: 'espera',
    pregunta: '¿Cuánto tardan en darme audiencia?',
    porQue:
      'Las fichas publican el plazo que va desde el trámite hasta el retiro del documento, no el que va desde que pedís la audiencia hasta que te la dan. Ese segundo plazo no está publicado en ningún lado del trámite.',
  },
]

// ---------------------------------------------------------------------------
// Preguntas frecuentes
// ---------------------------------------------------------------------------

/** Una pregunta frecuente (también sale como Question en el JSON-LD FAQPage). */
export interface IdCardFaq {
  readonly question: string
  readonly answer: string
}

export const ID_CARD_FAQ: readonly IdCardFaq[] = [
  {
    question: '¿Cuánto sale renovar la cédula de identidad uruguaya?',
    answer:
      'El trámite común son $443 y el urgente $886, exactamente el doble. Son los valores que publican las diez fichas de renovación del Documento Nacional de Identidad en gub.uy, vigentes desde el 1 de enero de 2026.',
  },
  {
    question: '¿Sale más caro sacarla por primera vez?',
    answer:
      'Sí, pero por muy poco: $456 contra $443 de la renovación, o sea $13 de diferencia. Es al revés que el pasaporte, donde la primera vez cuesta bastante más que renovar. La primera vez no tiene modalidad urgente: las fichas publican un único importe.',
  },
  {
    question: '¿Cuánto sale la cédula si la perdí o me la robaron?',
    answer:
      'Es la renovación común, $443, con la constancia de hurto o extravío de la seccional policial. No hay un arancel de duplicado ni de deterioro: la ficha acepta renovar el documento cualquiera sea su vigencia y estado de conservación. Y si fuiste víctima de hurto o rapiña, la renovación común está exonerada.',
  },
  {
    question: '¿En qué casos la cédula es gratis?',
    answer:
      'En dos. Las víctimas de hurto o rapiña no pagan la tasa de la renovación común, por el artículo 178 de la Ley Nº 19.355 reglamentado por el Decreto 69/2016, presentando la denuncia policial. Y las personas beneficiarias de programas del Mides, o en situación de vulnerabilidad socioeconómica, no pagan el trámite en ninguna de sus causales.',
  },
  {
    question: '¿Cambia el precio según cómo tenga la ciudadanía o la residencia?',
    answer:
      'No. Las dieciséis fichas —una por vía de ciudadanía o de residencia, entre renovación y primera vez— publican los mismos importes. Lo que cambia entre ellas es la documentación que hay que presentar. La única excepción es la ficha de personas amparadas a la Comisión de Refugiados, que en primera vez sigue mostrando el valor anterior de $443.',
  },
  {
    question: '¿Cómo se paga?',
    answer:
      'La reserva y el pago de la audiencia en las oficinas de la DNIC o en las redes de cobranza son exclusivamente en moneda nacional, en efectivo o con débito. Agendar por Red Pagos, Abitab o Correo Uruguayo suma un costo operativo que la ficha menciona sin cifrar.',
  },
]

// ---------------------------------------------------------------------------
// Fuentes
// ---------------------------------------------------------------------------

/** Las fuentes primarias, verificadas el {@link ID_CARD_VERIFIED_AT}. */
export const ID_CARD_SOURCES: readonly IdCardSource[] = [
  {
    label:
      'gub.uy — Documento Nacional de Identidad, renovación (personas ciudadanas naturales uruguayas): «Valores a partir del 01/01/2026: Trámite común: $ 443 (pesos uruguayos). Trámite urgente: $ 886 (pesos uruguayos)», más el requisito de renovar «cualquiera sea su vigencia y estado de conservación» y la exoneración por hurto o rapiña',
    url: 'https://www.gub.uy/tramites/documento-nacional-identidad-renovacion-personas-ciudadanas-naturales-uruguayas',
  },
  {
    label:
      'gub.uy — Documento Nacional de Identidad, primera vez (personas ciudadanas naturales uruguayas): «456 $ · Valores a partir del 01/07/2026», sin modalidad urgente, con los plazos de retiro de menores de 9 y mayores de 10 años y el límite de 90 días para la devolución del importe',
    url: 'https://www.gub.uy/tramites/documento-nacional-identidad-primera-vez-personas-ciudadanas-naturales-uruguayas',
  },
  {
    label:
      'gub.uy — Documento Nacional de Identidad, renovación: el selector de los diez casos por vía de ciudadanía o residencia, cada uno con su propia ficha y su propio bloque de costos',
    url: 'https://www.gub.uy/tramites/documento-nacional-identidad-renovacion',
  },
  {
    label:
      'gub.uy — Documento Nacional de Identidad, primera vez: el selector de los seis casos equivalentes',
    url: 'https://www.gub.uy/tramites/cedula-identidad',
  },
  {
    label:
      'gub.uy — Exoneración del costo del trámite de Cédula de Identidad (Mides): «No tiene para las personas beneficiarias de los programas anteriormente detallados», con la lista de programas y la vía de WhatsApp',
    url: 'https://www.gub.uy/tramites/exoneracion-costo-tramite-cedula-identidad',
  },
  {
    label:
      'IMPO — Decreto Nº 69/016: reglamenta el art. 178 inc. final de la Ley Nº 19.355 y exonera de la tasa del trámite común de renovación a las víctimas de hurto o rapiña',
    url: 'https://www.impo.com.uy/bases/decretos/69-2016',
  },
]
