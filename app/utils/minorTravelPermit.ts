// Permiso de menor para salir de Uruguay: cuándo hace falta, cuánto sale y qué papeles piden.
//
// Módulo PURO (sin Vue/Nuxt, imports relativos) para que
// `pages/permiso-de-menor-para-viajar-uruguay.vue` no duplique el catálogo y vitest lo cargue en
// Node, igual que `utils/birthCertificate.ts` y `utils/passport.ts`.
//
// POR QUÉ ESTA PÁGINA. El sitio ya tenía el racimo del viaje de verano —el presupuesto del viaje,
// cuántos dólares o reales llevar, el auto a Brasil o Argentina, el efectivo que hay que declarar,
// el pasaporte y la partida— y en ninguna parte decía que el chico puede quedar en el mostrador.
// Es el único requisito del grupo que no depende de la plata y que no se arregla en el aeropuerto:
// si el menor viaja con cédula y falta la firma del padre que no viaja, el viaje no sale.
//
// LA RESPUESTA QUE CAMBIA LA DECISIÓN, Y VA ADELANTE: con pasaporte uruguayo común vigente el
// permiso NO se exige. La ficha de gub.uy lo pone entre los casos en que «no se exige» y la propia
// Dirección Nacional de Migración lo repitió en su recordatorio del 25/03/2026. O sea que la
// pregunta «cuánto sale el permiso» tiene, para muchas familias, la misma respuesta que «cuánto
// sale el pasaporte»: conviene mirar los dos números juntos, y el del pasaporte el sitio ya lo
// publica.
//
// LA REGLA DE LAS CIFRAS. El arancel sale textual del bloque «Costos» de las fichas de trámite de
// gub.uy ({@link PERMIT_SOURCES}), leídas el {@link PERMIT_VERIFIED_AT}, y está en UNIDADES
// INDEXADAS, no en pesos: la ficha publica «55.70 U.I.». Por eso el peso del día no se escribe acá
// sino que lo calcula la página con el valor de la UI que el sitio ya lee del BCU
// ({@link permitFeeInPesos}). Una cifra en pesos escrita a mano en este archivo envejecería todos
// los días.
//
// LO QUE NO SE PUBLICA, A PROPÓSITO (ver {@link PERMIT_UNPUBLISHED}): el máximo de salidas que
// admite un formulario y el arancel consular. Ninguna de las dos lo publica hoy la ficha vigente.

/** Una fuente primaria: etiqueta legible + URL oficial. */
export interface PermitSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo este archivo contra las fichas oficiales. */
export const PERMIT_VERIFIED_AT = '2026-10-27'

/** Ruta de la página; el mismo slug en los tres idiomas (i18n prefija /en y /pt). */
export const PERMIT_PATH = '/permiso-de-menor-para-viajar-uruguay'

/** La edad hasta la que se exige el permiso, que es la mayoría de edad de la Ley 16.719. */
export const PERMIT_ADULT_AGE = 18

// ---------------------------------------------------------------------------
// El arancel
// ---------------------------------------------------------------------------

/**
 * El arancel, en Unidades Indexadas, textual del bloque «Costos» de la ficha: «55.70 U.I.».
 *
 * Se cobra POR SALIDA solicitada y POR MENOR: la ficha agrega que «el costo del permiso se calcula
 * a partir de la cantidad de viajes (salidas) solicitados por cada menor».
 */
export const PERMIT_FEE_UI = 55.7

/**
 * El arancel en pesos para `trips` salidas, con el valor de la UI del día.
 *
 * Devuelve `null` sin un valor de UI utilizable: la página prefiere no mostrar monto antes que
 * mostrar uno calculado contra un cero o un `undefined` de la API. El redondeo es a dos decimales
 * porque el arancel no es un precio de lista sino el producto de dos cifras con decimales.
 */
export function permitFeeInPesos(uiValue: number | null | undefined, trips = 1): number | null {
  if (typeof uiValue !== 'number' || !Number.isFinite(uiValue) || uiValue <= 0) return null
  if (!Number.isInteger(trips) || trips < 1) return null
  return Math.round(PERMIT_FEE_UI * uiValue * trips * 100) / 100
}

/** Las cantidades de salidas que la página pone en la tabla de equivalencias. */
export const PERMIT_TRIP_STEPS: readonly number[] = [1, 2, 3, 4]

// ---------------------------------------------------------------------------
// Cuándo NO se exige
// ---------------------------------------------------------------------------

/** Un caso en que la ficha declara que el permiso no se exige, con lo que hay que probar. */
export interface PermitWaiver {
  readonly id: string
  /** El caso, en la voz del lector. */
  readonly caso: string
  /** Qué hay que llevar para que el mostrador lo acepte, o `null` si la ficha no pide nada extra. */
  readonly prueba: string | null
}

/**
 * Los casos en que la ficha de gub.uy dice que el permiso «no se exige».
 *
 * El primero es el que resuelve la mayoría de los viajes familiares y el segundo es el que casi
 * nadie sabe, así que van en ese orden y no en el de la ficha.
 */
export const PERMIT_WAIVERS: readonly PermitWaiver[] = [
  {
    id: 'ambos-padres',
    caso: 'El menor viaja con sus dos padres, o con su tutor',
    prueba:
      'El vínculo: con cédula uruguaya se acredita con la partida de nacimiento, de no más de un año de expedida.',
  },
  {
    id: 'pasaporte-uruguayo',
    caso: 'El menor tiene pasaporte uruguayo común vigente',
    prueba:
      'Nada más ante Migración. El país de destino puede pedir visa o documentación propia: eso se consulta con su representación diplomática.',
  },
  {
    id: 'pasaporte-oficial',
    caso: 'El menor viaja con pasaporte diplomático u oficial, o con título de identidad y viaje uruguayo',
    prueba: 'El documento, en los casos que la ficha detalla.',
  },
  {
    id: 'hijo-de-diplomatico',
    caso: 'Es hijo extranjero de un diplomático acreditado en Uruguay',
    prueba: 'La documentación que la ficha especifica para ese caso.',
  },
  {
    id: 'un-solo-padre',
    caso: 'Viaja con un solo padre porque el otro falleció, o porque fue reconocido por uno solo',
    prueba:
      'La partida de nacimiento, de no más de un año de expedida; si uno de los padres falleció, también la partida de defunción.',
  },
  {
    id: 'menor-casado',
    caso: 'El menor está casado',
    prueba: 'La partida de matrimonio.',
  },
]

// ---------------------------------------------------------------------------
// Quién tiene que ir, y qué lleva
// ---------------------------------------------------------------------------

/** Quién tiene que comparecer, según con quién viaja el menor. */
export interface PermitAppearance {
  readonly viaja: string
  readonly comparece: string
}

/** Textual de la ficha del caso más consultado: el menor que viaja solo o con un solo padre. */
export const PERMIT_APPEARANCES: readonly PermitAppearance[] = [
  { viaja: 'Solo, o con un tercero', comparece: 'Los dos padres' },
  { viaja: 'Con uno de sus padres', comparece: 'El padre que NO viaja, para dar la autorización' },
]

/** Un documento que la ficha pide, con la letra chica que hace que lo acepten o lo rechacen. */
export interface PermitDocument {
  readonly id: string
  readonly nombre: string
  readonly detalle: string
}

/** Los documentos del trámite presencial, de la ficha del menor que viaja solo o con un padre. */
export const PERMIT_DOCUMENTS: readonly PermitDocument[] = [
  {
    id: 'documento-identidad',
    nombre: 'Documento de identidad del menor y de quien tramita',
    detalle:
      'Vigente y en buen estado. No se aceptan documentos vencidos, deteriorados ni reparados —plastificados de nuevo, pegados o perforados— y tampoco una fotocopia de la cédula certificada por escribano.',
  },
  {
    id: 'partida',
    nombre: 'Partida de nacimiento del menor, y una fotocopia',
    detalle:
      'De no más de un año de expedida. Si no llevás la fotocopia el día de la audiencia, el original queda en la Administración. Si la partida es extranjera: traducción cuando corresponda y legalización o apostilla, también con menos de un año.',
  },
  {
    id: 'pasaporte',
    nombre: 'Pasaporte del menor',
    detalle: 'Sólo si el país de destino lo exige.',
  },
  {
    id: 'acompanante',
    nombre: 'Documento de viaje de quien acompaña al menor',
    detalle:
      'Cédula, pasaporte o DNI del mayor de edad autorizado, o su fotocopia. Los datos de todos los documentos tienen que coincidir entre sí; si no coinciden, hay que rectificar antes.',
  },
]

// ---------------------------------------------------------------------------
// La carta poder, que es la salida cuando un padre no puede ir
// ---------------------------------------------------------------------------

/** Cuántos días vale una carta poder según dónde se otorgó, de la ficha de esa variante. */
export interface PermitPowerOfAttorney {
  readonly donde: string
  readonly dias: number
  readonly letraChica: string
}

export const PERMIT_POWERS: readonly PermitPowerOfAttorney[] = [
  {
    donde: 'Otorgada en Uruguay',
    dias: 30,
    letraChica:
      'Pasados los 30 días no hay que hacerla de nuevo: el escribano puede certificar que sigue vigente en todos sus términos —la cláusula de actualización— con su fecha de expedición.',
  },
  {
    donde: 'Otorgada en el exterior',
    dias: 180,
    letraChica:
      'Contados desde su expedición, y además legalizada o apostillada, traducida cuando corresponda y protocolizada por un escribano público uruguayo.',
  },
]

// ---------------------------------------------------------------------------
// Vigencia
// ---------------------------------------------------------------------------

/**
 * Hasta cuánto dura el permiso, en meses.
 *
 * La ficha y el recordatorio de Migración dicen «hasta un año», no «un año»: el plazo lo fijan los
 * padres dentro de ese techo, igual que la cantidad de salidas.
 */
export const PERMIT_MAX_VALIDITY_MONTHS = 12

/** Qué pasa después de emitido, textual de la ficha general del trámite. */
export const PERMIT_REVOCATION =
  'Una vez expedido el permiso de menor, solo podrá ser revocado por disposición judicial.'

// ---------------------------------------------------------------------------
// Las variantes
// ---------------------------------------------------------------------------

/**
 * Los doce tipos de permiso que enumera la ficha general.
 *
 * Están porque son la pregunta real de quien no entra en el caso simple, y porque ninguna página en
 * español los lista juntos: el buscador oficial los muestra de a uno.
 */
export const PERMIT_VARIANTS: readonly string[] = [
  'El menor viaja sin los padres, o con un solo padre',
  'El menor tiene autorización judicial de viaje',
  'El menor está bajo régimen de tutela',
  'Uno de los padres perdió la patria potestad',
  'El menor viaja solo y uno de sus padres falleció',
  'El menor está bajo tutela del INAU',
  'Uno de los padres está internado en un centro de reclusión',
  'Uno o ambos padres residen en el exterior',
  'Uno de los padres fue declarado incapaz',
  'Uno o ambos padres autorizan por carta poder',
  'Los padres residen en ciudades diferentes del país',
  'Uno o ambos padres son menores de edad',
]

// ---------------------------------------------------------------------------
// Lo que no se publica
// ---------------------------------------------------------------------------

/** Un dato que esta página deliberadamente no afirma, con el motivo. */
export interface PermitUnpublished {
  readonly dato: string
  readonly porQue: string
}

/**
 * Dos cifras que circulan y que acá no van.
 *
 * La primera es el tope de salidas por formulario: una página vieja de Migración hablaba de diez,
 * pero esa URL hoy redirige a la portada de la Dirección y la ficha vigente de gub.uy no publica
 * ningún tope. La segunda es el arancel consular, que cada consulado publica en su propia moneda.
 */
export const PERMIT_UNPUBLISHED: readonly PermitUnpublished[] = [
  {
    dato: 'Cuántas salidas admite un mismo formulario',
    porQue:
      'La ficha vigente dice que el costo se calcula por la cantidad de salidas pedidas y que el permiso puede servir para más de un viaje, pero no publica un tope. El número que circulaba estaba en una página de Migración que hoy ya no existe.',
  },
  {
    dato: 'Cuánto sale el permiso en un consulado uruguayo',
    porQue:
      'Cada consulado publica su propio arancel en la moneda del país donde está, y no es el mismo que el de Migración en Uruguay. Hay que mirarlo en el consulado que te toca.',
  },
]

// ---------------------------------------------------------------------------
// Fuentes
// ---------------------------------------------------------------------------

export const PERMIT_SOURCES: readonly PermitSource[] = [
  {
    label: 'gub.uy — Permiso para menor de edad (ficha general: cuándo no se exige y los 12 tipos)',
    url: 'https://www.gub.uy/tramites/permiso-menor-edad',
  },
  {
    label:
      'gub.uy — Permiso para menor de edad: menor que viaja sin los padres o acompañado por un solo padre (documentos, arancel 55,70 U.I., agenda y vigencia)',
    url: 'https://www.gub.uy/tramites/permiso-menor-edad-menor-viaja-sin-padres-acompanado-solo-padre',
  },
  {
    label:
      'gub.uy — Permiso para menor de edad: menor autorizado por carta poder (vigencia de 30 y 180 días)',
    url: 'https://www.gub.uy/tramites/permiso-menor-edad-menor-autorizado-uno-ambos-padres-mediante-carta-poder',
  },
  {
    label:
      'Ministerio del Interior — La Dirección Nacional de Migración recuerda la documentación para viajar con menores (25/03/2026)',
    url: 'https://www.gub.uy/ministerio-interior/comunicacion/noticias/direccion-nacional-migracion-recuerda-documentacion-tener-cuenta-para-viajar',
  },
  {
    label: 'IMPO — Ley 18.250, artículo 29, literal C (la competencia de exigir el permiso)',
    url: 'https://www.impo.com.uy/bases/leyes/18250-2008/29',
  },
  {
    label: 'IMPO — Decreto 394/009, artículo 18 (reglamentación)',
    url: 'https://www.impo.com.uy/bases/decretos/394-2009/18',
  },
  {
    label: 'IMPO — Ley 16.719 (mayoría de edad a los 18 años)',
    url: 'https://www.impo.com.uy/bases/leyes/16719-1995',
  },
]

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

/** Una pregunta de la FAQ: la misma copia alimenta la pantalla y el `FAQPage` de schema.org. */
export interface PermitFaq {
  readonly question: string
  readonly answer: string
}

/**
 * La FAQ, con el arancel del día ya pasado a pesos cuando el valor de la UI está disponible.
 *
 * Se construye y no se declara constante por la misma razón que la del conversor de UI: el único
 * número que el lector quiere es el de hoy, y escribirlo a mano lo dejaría viejo mañana. Sin valor
 * de UI (`null`) la respuesta queda con la cifra en UI, que es la que publica la ficha y no caduca.
 */
export function permitFaq(feeInPesos: string | null): readonly PermitFaq[] {
  const arancel = feeInPesos
    ? `${PERMIT_FEE_UI.toLocaleString('es-UY')} UI por salida, que hoy son ${feeInPesos}`
    : `${PERMIT_FEE_UI.toLocaleString('es-UY')} UI por salida`
  return [
    {
      question: '¿Cuánto sale el permiso de menor en Uruguay?',
      answer: `La ficha de gub.uy publica el arancel en unidades indexadas: ${arancel} y por menor. Al estar en UI, el monto en pesos cambia todos los días con el valor que publica el Banco Central.`,
    },
    {
      question: '¿Un menor con pasaporte uruguayo necesita permiso para salir del país?',
      answer:
        'No. La ficha de gub.uy pone el pasaporte uruguayo común vigente entre los casos en que el permiso no se exige, y el artículo 18 del Decreto 394/009 exceptúa expresamente a quien viaja «en posesión de pasaporte uruguayo válido». El país de destino puede pedir visa o documentación propia: eso se consulta con su representación diplomática.',
    },
    {
      question: '¿Hace falta permiso si el menor viaja con el padre y la madre?',
      answer:
        'No, y tampoco si viaja con su tutor. Lo que sí piden en ese caso es acreditar el vínculo: con cédula uruguaya, la partida de nacimiento del menor con no más de un año de expedida.',
    },
    {
      question: '¿Tiene que ir el menor a hacer el trámite?',
      answer:
        'No. La ficha lo dice expresamente: no es necesario que el menor acompañe a sus padres. Quienes tienen que presentarse son los padres otorgantes, en la fecha y hora agendadas. Si el menor viaja solo van los dos; si viaja con uno de ellos, va el que no viaja.',
    },
    {
      question: '¿Y si uno de los padres no puede ir a firmar?',
      answer:
        'Existe la variante por carta poder. La otorgada en Uruguay vale 30 días, y pasado ese plazo el escribano puede certificar que sigue vigente en todos sus términos en vez de hacerla de nuevo. La otorgada en el exterior vale hasta 180 días desde su expedición, legalizada o apostillada, traducida cuando corresponda y protocolizada por un escribano uruguayo.',
    },
    {
      question: '¿Cuánto dura el permiso de menor?',
      answer:
        'Hasta un año, y puede cubrir más de un viaje: los padres indican cuántas salidas autorizan y con qué persona mayor de edad. El arancel se cobra por cada salida pedida. Una vez expedido, sólo se revoca por disposición judicial.',
    },
    {
      question: '¿Se puede hacer sin agenda previa?',
      answer:
        'En Montevideo la atención es únicamente con agenda previa, con una excepción que la ficha deja escrita: que haya pasajes con fecha anterior a la primera disponible en la agenda. En el interior el trámite se hace en las Inspectorías de Migración.',
    },
  ]
}
