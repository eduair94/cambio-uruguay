// El valor que Catastro le pone a un padrón, y cómo mirarlo sin pagar.
//
// POR QUÉ ESTA PÁGINA. El sitio ya se apoyaba en este número en dos páginas de
// impuestos —`/contribucion-inmobiliaria-uruguay` ("se calcula sobre el valor
// imponible que fija Catastro") y `/impuesto-de-primaria-uruguay` ("lo tenés en la
// factura")— y en ninguna de las 208 páginas se decía cómo consultarlo. O sea: el
// dato estaba reclamado como base de dos tributos y sin contestar como trámite.
//
// EL ÁNGULO PROPIO es el mismo de `/elecciones-bps-2026`, `/garantia-de-alquiler-uruguay`
// y `/apostillar-un-documento-uruguay`: la tasa catastral está fijada en UR y
// ninguna fuente oficial la publica en pesos. El sitio tiene la UR del día, así que
// puede poner el equivalente al lado — y cuando la lectura viva falla publica los
// 0,5 UR sin convertir, nunca un peso de hace meses presentado como "hoy".
//
// LO QUE NO SE AFIRMA. El valor de Catastro NO es el valor de mercado: eso ya lo
// dicen las dos páginas de impuestos y acá se repite porque es la confusión que
// trae a la gente. Y no se promete que una revisión BAJE el valor: la ficha oficial
// dice que el estudio "puede cambiar" el valor catastral base, en cualquier
// dirección.
//
// Módulo PURO (sin imports de Vue/Nuxt, rutas relativas) para que vitest-node lo
// cargue: ver `app/AGENTS.md`.

/** Fecha en que se cotejó cada dato contra las fichas oficiales de gub.uy. */
export const CADASTRAL_VERIFIED_AT = '2026-10-12'

/** Ruta de la página; el mismo slug en los tres idiomas (i18n prefija /en y /pt). */
export const CADASTRAL_PATH = '/valor-catastral-uruguay'

/** Organismo que fija el valor, tal como lo nombra la ficha. */
export const CADASTRAL_ORGANISMO =
  'Ministerio de Economía y Finanzas — Dirección Nacional de Catastro'

/** La sede electrónica donde se emiten las cédulas, textual de la ficha del MEF. */
export const CADASTRAL_SEDE_URL = 'http://sede.catastro.gub.uy/Sede/'

// ---------------------------------------------------------------------------
// La tasa catastral: el único importe, y está en UR
// ---------------------------------------------------------------------------

/**
 * La tasa catastral, en UR.
 *
 * Es el importe que cobran los trámites que no son gratuitos. Va en UR y NO en
 * pesos a propósito: así lo publica la ficha oficial, y un importe en pesos
 * copiado hoy envejece sin avisar. La conversión a pesos la hace la página con la
 * UR del día.
 */
export const TASA_CATASTRAL_UR = 0.5

/**
 * La vigencia que la ficha oficial declara para ese valor, textual.
 *
 * Se publica junto al importe porque es la mitad del dato: la DNC republica el
 * valor cada semestre, así que un lector que llegue en enero tiene que saber
 * contra qué ventana se verificó. La ficha de la revisión de valor dice
 * «desde el 01/07/2026 al 31/12/2026».
 */
export const TASA_CATASTRAL_VIGENCIA = Object.freeze({
  from: '2026-07-01',
  to: '2026-12-31',
})

/** Cómo se paga un trámite de la DNC. */
export type CadastralCost =
  /** Sin costo, según la ficha. */
  | { readonly kind: 'free' }
  /** En tasas catastrales (cada una, {@link TASA_CATASTRAL_UR} UR). */
  | { readonly kind: 'tasa'; readonly tasas: number }
  /** En timbres profesionales, que la DNC no cobra y no publica en pesos. */
  | { readonly kind: 'timbres'; readonly timbres: number }

/** Un trámite o servicio de la DNC, como lo describe su ficha. */
export interface CadastralService {
  /** Identificador estable, único en {@link CADASTRAL_SERVICES}. */
  readonly id: string
  /** Nombre del trámite tal como lo titula gub.uy. */
  readonly label: string
  /** Qué te da, en una línea. */
  readonly gives: string
  readonly cost: CadastralCost
  /** Si la vía EN LÍNEA exige usuario registrado en la Sede Electrónica. */
  readonly needsAccount: boolean
  /** La ficha oficial del trámite. */
  readonly url: string
}

/**
 * Los tres trámites que contestan la pregunta de la página, en orden de utilidad.
 *
 * El primero es el que resuelve el caso normal y es gratis; está primero por eso y
 * no por ser el más completo. Los otros dos existen para los dos casos en que la
 * cédula común no alcanza: cuando hace falta el historial del padrón y cuando el
 * valor está mal.
 */
export const CADASTRAL_SERVICES: readonly CadastralService[] = Object.freeze([
  Object.freeze({
    id: 'cedula-catastral',
    label: 'Cédula catastral',
    gives:
      'El documento con valor legal que, según la ficha, «certifica el valor catastral base de un inmueble». Se imprime al final del trámite en línea.',
    cost: Object.freeze({ kind: 'free' as const }),
    needsAccount: false,
    url: 'https://www.gub.uy/tramites/cedula-catastral',
  }),
  Object.freeze({
    id: 'cedula-catastral-informada',
    label: 'Cédula catastral informada',
    gives:
      'Los mismos datos de la cédula más «información complementaria sobre los antecedentes inmediatos del padrón»: el número de padrón anterior o el plano de mensura que lo origina.',
    cost: Object.freeze({ kind: 'tasa' as const, tasas: 1 }),
    needsAccount: true,
    url: 'https://www.gub.uy/tramites/cedula-catastral-informada',
  }),
  Object.freeze({
    id: 'revision-valor-catastral',
    label: 'Revisión de valor catastral',
    gives:
      'El estudio para actualizar el valor, que «puede cambiar el valor catastral base». Termina en una cédula catastral con los valores nuevos.',
    cost: Object.freeze({ kind: 'free' as const }),
    needsAccount: true,
    url: 'https://www.gub.uy/tramites/revision-valor-catastral',
  }),
])

/**
 * Lo que la revisión de valor sí cuesta, que no es la solicitud.
 *
 * La solicitud es gratis para propiedad común y para propiedad horizontal, y por
 * eso {@link CADASTRAL_SERVICES} la marca `free`. El gasto está en la DJCU, que la
 * DNC no cobra pero exige, y que la tiene que hacer un profesional.
 */
export const REVISION_REQUISITOS: readonly string[] = Object.freeze([
  'La solicitud en línea es gratuita para propiedad común y para propiedad horizontal.',
  'Hace falta una DJCU (Declaración Jurada de Caracterización Urbana) firmada por arquitecto o ingeniero agrimensor. La DNC no le cobra costo catastral, pero lleva 2 timbres profesionales.',
  'Para propiedad común o UPH se puede reutilizar una DJCU ya presentada ante la DNC.',
  'La cédula catastral con los valores nuevos no se cobra durante los primeros 10 días desde que esos valores se ingresan. Después se paga 1 tasa catastral por unidad de propiedad horizontal.',
  'La vía en línea exige usuario registrado en la Sede Electrónica. En propiedad horizontal o UPH, la revisión abarca el padrón entero.',
])

/** Los datos que pide la cédula catastral, por régimen del padrón. */
export const CEDULA_DATOS: readonly { readonly regimen: string; readonly datos: string }[] =
  Object.freeze([
    Object.freeze({
      regimen: 'Urbano',
      datos:
        'Departamento, localidad catastral, número de padrón, block, entrepiso o subsuelo y unidad (apartamento).',
    }),
    Object.freeze({
      regimen: 'Rural',
      datos: 'Departamento y número de padrón.',
    }),
  ])

/**
 * Lo que la Sede Electrónica abre SIN usuario registrado, textual de la ficha del MEF.
 *
 * Va en la página porque es la parte que nadie espera: la lista de servicios de
 * acceso libre es más larga que la cédula sola, y tres de ellos (datos de padrón,
 * Geocatastro, datos abiertos) contestan preguntas por las que la gente paga un
 * gestor.
 */
export const CADASTRAL_FREE_ACCESS: readonly string[] = Object.freeze([
  'Consultas de datos de padrón',
  'Consultas por expediente',
  'Cédulas de propiedad horizontal (Montevideo e interior)',
  'Emisión de cédulas catastrales',
  'Datos abiertos',
  'Geocatastro',
  'Validación de cédula catastral común',
  'Descarga de formularios',
])

/** La atención presencial, con la salvedad de la agenda previa. */
export const CADASTRAL_OFFICE = Object.freeze({
  address: 'Av. Gral. Rondeau 1437, Montevideo (Mesa de Entrada)',
  hours: 'Lunes a viernes de 9:30 a 15:00',
  note: 'Desde el 2 de agosto de 2021 la atención presencial requiere agenda previa, que se pide desde la Sede Electrónica. En el interior atienden las Oficinas Delegadas en horario de mostrador.',
})

// ---------------------------------------------------------------------------
// Cuentas
// ---------------------------------------------------------------------------

/**
 * Un importe en UR pasado a pesos, o `null` si hoy no se puede saber.
 *
 * `null` no es un cero: es «no tengo la UR viva». La página imprime entonces el
 * importe en UR sin convertir. Es el mismo contrato que `utils/apostille.ts`.
 */
export function pesosForUr(ur: number, urValue: number | null | undefined): number | null {
  if (typeof urValue !== 'number' || !Number.isFinite(urValue) || urValue <= 0) return null
  if (!Number.isFinite(ur) || ur <= 0) return null
  return Math.round(ur * urValue)
}

/** Lo que cuesta un trámite en UR, o `null` si no se paga en UR. */
export function urForCost(cost: CadastralCost): number | null {
  return cost.kind === 'tasa' ? cost.tasas * TASA_CATASTRAL_UR : null
}

/** Lo que cuesta un trámite en pesos de hoy, o `null` si no se puede saber. */
export function pesosForCost(
  cost: CadastralCost,
  urValue: number | null | undefined
): number | null {
  if (cost.kind === 'free') return 0
  const ur = urForCost(cost)
  return ur === null ? null : pesosForUr(ur, urValue)
}

// ---------------------------------------------------------------------------
// Preguntas y abstenciones
// ---------------------------------------------------------------------------

export interface CadastralFaq {
  readonly question: string
  readonly answer: string
}

export const CADASTRAL_FAQ: readonly CadastralFaq[] = Object.freeze([
  Object.freeze({
    question: '¿El valor catastral es lo que vale mi casa?',
    answer:
      'No. Es el valor que fija la Dirección Nacional de Catastro para cada padrón y sirve de base a la contribución inmobiliaria y al impuesto de primaria. No es el precio de mercado ni lo que pagaste por la vivienda, y no se usa para tasar una venta.',
  }),
  Object.freeze({
    question: '¿Cuánto sale consultar el valor de mi padrón?',
    answer:
      'La cédula catastral común no tiene costo: la ficha oficial dice «No tiene costo» y la Sede Electrónica la emite como servicio de acceso libre, sin usuario registrado. Sólo se paga la versión informada, que agrega los antecedentes del padrón.',
  }),
  Object.freeze({
    question: '¿Necesito crear una cuenta para sacar la cédula?',
    answer:
      'Para la cédula catastral común, no: la emisión de cédulas está entre los servicios de acceso libre de la Sede Electrónica. Sí hace falta usuario registrado para la cédula informada y para la revisión de valor cuando se piden en línea.',
  }),
  Object.freeze({
    question: '¿Qué datos tengo que tener a mano?',
    answer:
      'Para un padrón urbano: departamento, localidad catastral, número de padrón, block, entrepiso o subsuelo y unidad. Para uno rural alcanza con departamento y número de padrón. El número de padrón figura en la factura de la contribución inmobiliaria.',
  }),
  Object.freeze({
    question: 'Creo que el valor está mal. ¿Puedo pedir que lo revisen?',
    answer:
      'Sí, con el trámite de revisión de valor catastral, y la solicitud es gratuita para propiedad común y para propiedad horizontal. El costo real está en la DJCU, que tiene que hacer un arquitecto o un ingeniero agrimensor y lleva 2 timbres profesionales. La ficha dice que el estudio «puede cambiar» el valor: no garantiza que baje.',
  }),
  Object.freeze({
    question: '¿Dónde aparece este valor en la factura?',
    answer:
      'En la factura de la contribución inmobiliaria figura como «valor imponible». Es el mismo valor de Catastro con el que se calculan la contribución y el impuesto de primaria, y por eso las dos cuentas cambian cuando ese valor se actualiza.',
  }),
])

/**
 * Lo que esta página NO publica, y por qué.
 *
 * Va impreso en la página a propósito: el sitio ya hace esto en
 * `/apostillar-un-documento-uruguay` y en `/seguro-obligatorio-de-auto-uruguay`.
 * Una ausencia explicada es un dato; una ausencia muda se lee como olvido y
 * empuja al lector a buscar la cifra en una fuente peor.
 */
export const CADASTRAL_UNPUBLISHED: readonly CadastralFaq[] = Object.freeze([
  Object.freeze({
    question: '¿Cuánto vale mi padrón en pesos?',
    answer:
      'No lo publicamos y no lo podemos calcular: el valor es por padrón y sólo lo dice Catastro. La página te lleva al trámite gratuito que lo certifica; cualquier número que pongamos acá sería inventado.',
  }),
  Object.freeze({
    question: '¿Cuánto tarda en salir una revisión de valor?',
    answer:
      'La ficha oficial no publica un plazo de entrega. Sí publica qué hace falta para iniciarla, que es lo que se puede verificar.',
  }),
  Object.freeze({
    question: '¿Cuánto sale un timbre profesional?',
    answer:
      'La DNC no lo cobra ni lo publica: es un timbre de la caja profesional y su importe no sale de la ficha del trámite. Por eso la revisión de valor va con «2 timbres profesionales» y sin equivalente en pesos.',
  }),
])

export interface CadastralSource {
  readonly label: string
  readonly url: string
}

/** Las fuentes primarias, cotejadas el {@link CADASTRAL_VERIFIED_AT}. */
export const CADASTRAL_SOURCES: readonly CadastralSource[] = Object.freeze([
  Object.freeze({
    label:
      'gub.uy — Cédula catastral (DNC): «documento con valor legal» que «certifica el valor catastral base de un inmueble», «No tiene costo», y los datos que pide según el padrón sea urbano o rural',
    url: 'https://www.gub.uy/tramites/cedula-catastral',
  }),
  Object.freeze({
    label:
      'gub.uy — Cédula catastral informada (DNC): los datos de la cédula más «información complementaria sobre los antecedentes inmediatos del padrón», 0,5 UR de tasa catastral y usuario de Sede Electrónica para la vía en línea',
    url: 'https://www.gub.uy/tramites/cedula-catastral-informada',
  }),
  Object.freeze({
    label:
      'gub.uy — Revisión de valor catastral (DNC): la solicitud gratuita para propiedad común y horizontal, la DJCU por arquitecto o ingeniero agrimensor con 2 timbres profesionales, los 10 días sin cargo de la cédula nueva, la tasa catastral de 0,5 UR «desde el 01/07/2026 al 31/12/2026» y la atención en Av. Gral. Rondeau 1437',
    url: 'https://www.gub.uy/tramites/revision-valor-catastral',
  }),
  Object.freeze({
    label:
      'gub.uy — Sede electrónica de la Dirección Nacional de Catastro (MEF): la lista de servicios de acceso libre sin usuario registrado, entre ellos la emisión de cédulas catastrales, las consultas de datos de padrón, Geocatastro y los datos abiertos',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/tramites-y-servicios/servicios/sede-electronica-direccion-nacional-catastro',
  }),
])
