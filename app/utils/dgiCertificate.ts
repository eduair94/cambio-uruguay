// El Certificado Único de la DGI: qué actos bloquea y a quién no se le emite.
//
// Catálogo puro (sin imports de Vue/Nuxt) para `/certificado-unico-dgi-uruguay`.
//
// REGLA DE ESTE ARCHIVO, la misma que `bpsCertificates.ts`: cada cifra y cada prohibición
// que se publica sale del texto de la norma o de la ficha oficial del trámite, y va con su
// cita textual y su URL. Lo que no se pudo sostener con una fuente no se publica.
//
// POR QUÉ ESTA PÁGINA. El sitio ya tenía `/certificados-bps-uruguay` (el común y el especial
// del BPS) y la guía `/guias/certificado-unico-departamental-uruguay` (el municipal), pero el
// certificado único de la DGI —el que el art. 80 pone como condición para vender un inmueble
// o un auto— no estaba en ninguna parte. Y la consulta que traía a la gente es la que peor
// contestada estaba: el que sólo tiene sueldo y va a vender su apartamento cree que le falta
// un trámite, y lo que pasa es que la DGI NO se lo emite (Res. 4127/015). Que no te lo emitan
// no es una gestión pendiente: es que el régimen no te alcanza.

export const DGI_CERTIFICATE_VERIFIED_AT = '2026-09-27'

export interface DgiSource {
  readonly label: string
  readonly url: string
}

export const DGI_CERTIFICATE_SOURCES: readonly DgiSource[] = Object.freeze([
  {
    label: 'T.O. 1996 — Título 1, art. 80 (régimen de certificado único)',
    url: 'https://www.impo.com.uy/bases/todgi1996/338-1996/80_T1',
  },
  {
    label: 'Resolución DGI N° 4127/015 (a quién no se le emite)',
    url: 'https://www.impo.com.uy/bases/resoluciones-dgi-nd/4127-2015/1',
  },
  {
    label: 'Resolución DGI N° 750/008 (el certificado publicado sustituye al impreso)',
    url: 'https://www.impo.com.uy/bases/resoluciones-dgi-nd/750-2008/1',
  },
  {
    label: 'Trámites — Solicitud de certificado único (Formulario 5000)',
    url: 'https://www.gub.uy/tramites/solicitud-certificado-unico-direccion-general-impositiva',
  },
  {
    label: 'Trámites — Solicitud de Certificado Único Especial (Formulario 5001)',
    url: 'https://www.gub.uy/tramites/solicitud-certificado-unico-especial',
  },
  {
    label: 'DGI — Valor de los timbres',
    url: 'https://www.gub.uy/direccion-general-impositiva/datos-y-estadisticas/datos/valor-timbres',
  },
  {
    label: 'DGI — Consulta de certificado único (servicios en línea)',
    url: 'https://servicios.dgi.gub.uy/serviciosenlinea/dgi--servicios-en-linea--consulta-de-certifcado-unico',
  },
])

/**
 * El importe del timbre profesional que lleva la solicitud.
 *
 * Se publica porque la fuente que lo sostiene está VIGENTE: la tabla «Valor de los timbres»
 * de la DGI lo fija para el período 1/1/2026–31/12/2026 en la línea «Solicitudes de:
 * Inspecciones contables, avaluaciones o certificados referentes a tributos».
 *
 * Es el mismo importe que ya usa `companyTypes.ts` para la unipersonal, y la distinción
 * importa: la ficha del trámite en gub.uy publica $ 260 con validez «del 01 julio 2025 al 31
 * diciembre 2025», o sea un importe vencido. La tabla de timbres es la fuente que se
 * mantiene al día; la ficha, no. Cuando pase el 31/12/2026 este número queda sin respaldo y
 * hay que ir a la tabla, no reusarlo.
 */
export const DGI_TIMBRE_UYU = 270

/** Último día del período de validez que publica la tabla de timbres para `DGI_TIMBRE_UYU`. */
export const DGI_TIMBRE_VALID_UNTIL = '2026-12-31'

/**
 * Días tras los cuales, si el enajenante no pidió el certificado especial, puede pedirlo el
 * adquirente o el profesional interviniente (ficha del Formulario 5001).
 */
export const DGI_BUYER_TAKEOVER_DAYS = 15

/** La multa por distribuir utilidades sin el certificado, y la de la reincidencia (art. 80, inciso B). */
export const DGI_FINE_PERCENT = 50

export interface DgiBlockedAct {
  readonly key: string
  readonly act: string
  readonly detail: string
}

/**
 * Los actos que el art. 80 no deja hacer sin certificado único de vigencia anual.
 *
 * Textual de la norma: «No se podrá enajenar ni gravar bienes inmuebles, enajenar vehículos
 * automotores, distribuir utilidades, importar o exportar, o solicitar la expedición o
 * renovación de pasaportes» sin haberlo obtenido antes.
 */
export const DGI_BLOCKED_ACTS: readonly DgiBlockedAct[] = Object.freeze([
  {
    key: 'inmuebles',
    act: 'Enajenar o gravar un inmueble',
    detail:
      'Es el caso que más se busca: vender una casa o hipotecarla. Los Registros «no podrán recibir ni inscribir documentos» sin el certificado.',
  },
  {
    key: 'vehiculos',
    act: 'Enajenar un vehículo automotor',
    detail: 'La venta del auto, con la misma traba en el registro de inscripción de vehículos.',
  },
  {
    key: 'utilidades',
    act: 'Distribuir utilidades',
    detail: `Hacerlo sin certificado tiene multa: «una multa equivalente al ${String(DGI_FINE_PERCENT)}% (cincuenta por ciento) del tributo impago», y en la reincidencia «una multa igual al tributo impago».`,
  },
  {
    key: 'comercio-exterior',
    act: 'Importar o exportar',
    detail: 'El certificado se exige antes de la operación, no al cierre del ejercicio.',
  },
  {
    key: 'pasaporte',
    act: 'Pedir o renovar el pasaporte',
    detail:
      'Está en la misma enumeración del art. 80, y sorprende porque no es una operación patrimonial.',
  },
])

export interface DgiExcludedParty {
  readonly literal: string
  readonly who: string
  readonly note?: string
}

/**
 * A quién NO se le emite, con el literal del art. 1 de la Resolución DGI N° 4127/015.
 *
 * El orden es el de la resolución. Se conserva el literal porque es la forma de que alguien
 * que edite esto en seis meses pueda verificar fila por fila contra la norma.
 */
export const DGI_NOT_ISSUED_TO: readonly DgiExcludedParty[] = Object.freeze([
  {
    literal: 'a',
    who: 'Quienes no sean contribuyentes de impuestos que administra la DGI',
  },
  { literal: 'b', who: 'Cooperativas de vivienda' },
  { literal: 'c', who: 'Contribuyentes del Monotributo y del Monotributo social MIDES' },
  {
    literal: 'd',
    who: 'Personas físicas con rentas de trabajo dependiente o rentas de Categoría I',
    note: 'El caso del que cobra sueldo y va a vender su apartamento.',
  },
  {
    literal: 'e',
    who: 'Contribuyentes del IRNR por rentas de capital, incrementos patrimoniales o trabajo dependiente',
  },
  { literal: 'f', who: 'Contribuyentes del Impuesto al Patrimonio de las Personas Físicas' },
  { literal: 'g', who: 'Contribuyentes de IVA por agregación de valor' },
  {
    literal: 'h',
    who: 'Integrantes de entidades a quienes se les atribuyen rentas no derivadas del trabajo dependiente',
  },
  { literal: 'i', who: 'Contribuyentes del Impuesto de Asistencia a la Seguridad Social (IASS)' },
  { literal: 'j', who: 'Contribuyentes del Impuesto a las Transmisiones Patrimoniales (ITP)' },
])

/**
 * La salvedad de la misma resolución, y el motivo por el que esto no se puede leer como una
 * lista de exentos: los de arriba SÍ pueden pedirlo si además son contribuyentes de alguno de
 * estos impuestos. La excepción manda sobre la exclusión.
 */
export const DGI_ALSO_ELIGIBLE_IF: readonly string[] = Object.freeze([
  'Impuesto a las Rentas de las Actividades Económicas (IRAE)',
  'ITP por enajenación de bienes agropecuarios',
  'IRNR, con las excepciones del literal e)',
  'IRPF Categoría II por rentas obtenidas fuera de la relación de dependencia',
])

/** Los motivos por los que la DGI puede suspender un certificado anual ya emitido (inciso D). */
export const DGI_SUSPENSION_GROUNDS: readonly string[] = Object.freeze([
  'Atrasos en las obligaciones tributarias',
  'No registrar los estados contables ante el órgano estatal de control (Ley 16.060, art. 97 bis)',
  'No pagar el impuesto de enseñanza primaria',
])

/** Los actos societarios que piden el certificado ESPECIAL (Formulario 5001), no el anual. */
export const DGI_SPECIAL_OPERATIONS: readonly string[] = Object.freeze([
  'Enajenación de casa de comercio',
  'Disolución y liquidación de sociedades',
  'Reforma de estatutos',
  'Fusión y escisión',
  'Cese de bandera de embarcaciones',
  'Inscripción de arrendamientos rurales',
  'Cambio de titularidad de Free Shop',
])

/**
 * Las situaciones tributarias que decide si la DGI emite el certificado.
 *
 * `excluded` son los literales del art. 1 de la Res. 4127/015; `eligible` son los impuestos de
 * la salvedad. Una persona puede estar en varias a la vez, y por eso la regla no es «¿está en
 * la lista de excluidos?» sino «¿hay alguna de las de la salvedad?».
 */
export type TaxSituation =
  | 'no-contribuyente'
  | 'cooperativa-vivienda'
  | 'monotributo'
  | 'monotributo-mides'
  | 'trabajo-dependiente'
  | 'irnr-capital'
  | 'ippf'
  | 'iva-agregacion-valor'
  | 'rentas-atribuidas'
  | 'iass'
  | 'itp'
  | 'irae'
  | 'itp-agropecuario'
  | 'irnr-otras'
  | 'irpf-cat-ii'

const ELIGIBLE_SITUATIONS: readonly TaxSituation[] = Object.freeze([
  'irae',
  'itp-agropecuario',
  'irnr-otras',
  'irpf-cat-ii',
])

/**
 * ¿Le emite la DGI el certificado único a quien está en estas situaciones?
 *
 * La salvedad de la Res. 4127/015 manda sobre la exclusión, así que basta UNA situación de la
 * salvedad para que corresponda emitirlo, por más excluidos que sean los demás. Sin ninguna
 * situación declarada no se afirma nada: devuelve `null` en vez de adivinar, porque «no sé» y
 * «no te lo emiten» son respuestas distintas y la segunda es la que manda a alguien a la DGI.
 */
export function dgiIssuesCertificate(situations: readonly TaxSituation[]): boolean | null {
  if (situations.length === 0) return null
  if (situations.some(situation => ELIGIBLE_SITUATIONS.includes(situation))) return true
  return false
}

export interface DgiFaqItem {
  readonly question: string
  readonly answer: string
}

export const DGI_CERTIFICATE_FAQ: readonly DgiFaqItem[] = Object.freeze([
  {
    question: '¿Necesito el certificado único de DGI para vender mi casa si sólo cobro sueldo?',
    answer:
      'La DGI no se lo emite a las personas físicas con rentas de trabajo dependiente: es el literal d) del art. 1 de la Resolución DGI N° 4127/015, y el literal j) agrega a los contribuyentes del Impuesto a las Transmisiones Patrimoniales. Que no te lo emitan no es un trámite pendiente. Qué tiene que acreditarse en una escritura concreta lo determina el escribano interviniente, no esta página.',
  },
  {
    question: '¿Cuánto vale el certificado único?',
    answer: `La solicitud lleva un timbre profesional de $ ${String(DGI_TIMBRE_UYU)}, según la tabla «Valor de los timbres» de la DGI para el período que termina el 31 de diciembre de 2026. La ficha del trámite en gub.uy publica un importe menor con una fecha de validez que ya venció, así que el que vale es el de la tabla.`,
  },
  {
    question: '¿Tengo que ir a la DGI a buscar el certificado impreso?',
    answer:
      'No, si figura como «Certificado de vigencia anual habilitado» en el sitio de la DGI. La Resolución DGI N° 750/008 dice que el certificado publicado de esa forma «sustituirá a todos los efectos el documento impreso», y que quien deba verificarlo consulte el sitio.',
  },
  {
    question: '¿Cuánto dura?',
    answer:
      'El art. 80 del Título 1 lo llama «certificado único y de vigencia anual». La DGI puede suspenderlo antes por atrasos tributarios, por no registrar los estados contables ante el órgano estatal de control o por no pagar el impuesto de enseñanza primaria.',
  },
  {
    question: '¿Qué diferencia hay entre el certificado anual y el especial?',
    answer: `El anual (Formulario 5000) es el que habilita los actos del art. 80. El especial (Formulario 5001) se pide para actos societarios: enajenación de casa de comercio, disolución, liquidación, reforma de estatutos, fusión, escisión, cese de bandera y arrendamientos rurales. En una enajenación lo pide el enajenante, y si no lo hace en ${String(DGI_BUYER_TAKEOVER_DAYS)} días puede pedirlo el adquirente o el profesional interviniente.`,
  },
  {
    question: '¿El certificado del BPS es el mismo?',
    answer:
      'No. Son dos organismos y dos certificados distintos: el del BPS acredita estar al día con la seguridad social y vale 180 días corridos; el de la DGI acredita estar al día con los tributos que ella administra y es de vigencia anual. Una escritura puede exigir los dos.',
  },
])
