// IASS — el impuesto que le descuentan a las jubilaciones y pensiones.
//
// POR QUÉ ESTE ARCHIVO EXISTE. Las franjas del IASS ya estaban en el sitio, pero
// vivían escritas a mano dentro de `pages/impuestos-inversiones-uruguay.vue`, en
// una sección que su propio texto abre diciendo que «el IASS no grava
// inversiones». O sea: el dato estaba bien y estaba donde quien lo busca no
// entra. Un jubilado que pregunta cuánto le descuentan no busca una página de
// impuestos a las inversiones. Acá la escala pasa a ser un catálogo que las DOS
// páginas importan, así que no puede haber dos versiones de la misma tabla.
//
// LA CONFUSIÓN QUE ESTA PÁGINA TIENE QUE DESARMAR. El IASS es un impuesto ANUAL
// («un impuesto anual de carácter personal y directo», Ley 18.314) y sus franjas
// se publican en BPC ANUALES: 108, 180 y 600. La retención, en cambio, se hace
// mes a mes. Entonces el 108 BPC que devuelve cualquier búsqueda NO es el mínimo
// mensual: mensualizado son 9 BPC. Publicar «hasta 108 BPC exento» al lado de un
// importe en pesos y sin decir «al año» es la forma más fácil de que alguien se
// crea exento por un factor de doce.
//
// LO QUE ESTA PÁGINA AGREGA Y NO ESTABA EN NINGÚN LADO DEL SITIO: la opción del
// que cobra de VARIOS organismos a la vez. Si la suma supera el MNI
// mensualizado, puede pedirle al BPS que le retenga sobre todos sus ingresos con
// otra escala (6 / 41 BPC), y si no la pide cada organismo retiene por separado
// y el ajuste final llega de golpe. Es una opción que hay que SOLICITAR, no un
// régimen que se aplica solo, y esa distinción es el dato.
//
// LA REGLA DE LAS CIFRAS. Los porcentajes y los tramos en BPC salen de la ficha
// del BPS y de la Ley 18.314; los pesos NO están en la fuente y los calcula el
// sitio con la BPC que ya tiene auditada. Nada acá se escribe en pesos a mano.

/** Una fuente primaria: etiqueta legible + URL oficial. */
export interface IassSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó este archivo contra las fuentes oficiales. */
export const IASS_VERIFIED_AT = '2026-10-01'

export const IASS_SOURCES: readonly IassSource[] = Object.freeze([
  {
    label: 'BPS — El Impuesto de Asistencia a la Seguridad Social (IASS)',
    url: 'https://www.bps.gub.uy/18002/el-impuesto-de-asistencia-a-la-seguridad-social-iass.html',
  },
  {
    label: 'Ley N.º 18.314 — Creación del IASS (texto en IMPO)',
    url: 'https://www.impo.com.uy/bases/leyes/18314-2008',
  },
  {
    label:
      'Ley N.º 20.212, art. 661 — baja la primera franja del IASS del 8 % al 6 % desde el 1.º de enero de 2025',
    url: 'https://www.impo.com.uy/bases/leyes/20212-2023',
  },
])

/**
 * Por qué la primera franja es 6 % y no el 8 % que devuelve media internet.
 *
 * El texto de la Ley 18.314 que indexan los buscadores dice 8 % en el primer tramo gravado, y es
 * la trampa de esta página: no es un resumen mal hecho, es la ley —en su redacción anterior—. La
 * Ley 20.212 (6/11/2023) bajó esa tasa al 6 % con vigencia desde el 1.º de enero de 2025, así que
 * la fuente primaria más obvia es justamente la que hace equivocarse. Se publica el 6 % porque es
 * lo que rige y lo que el BPS retiene hoy, y se dice de dónde viene para que quien verifique
 * contra el texto viejo no concluya que esta página está mal.
 */
export const IASS_FIRST_BRACKET_NOTE = Object.freeze({
  previousRatePct: 8,
  currentRatePct: 6,
  since: '2025-01-01',
  amendedBy: 'Ley N.º 20.212',
})

/**
 * Un tramo de la escala.
 *
 * `toBpc: null` es el tramo abierto de arriba. `ratePct: 0` es el tramo exento:
 * existe como fila porque la escala tiene que poder dibujarse entera, y porque
 * un tramo exento con tasa 0 se integra a la misma aritmética marginal que los
 * demás en vez de ser un caso especial antes del bucle.
 */
export interface IassBracket {
  readonly fromBpc: number
  readonly toBpc: number | null
  readonly ratePct: number
}

/** Mínimo no imponible ANUAL, en BPC (ficha del BPS). */
export const IASS_MNI_BPC_ANNUAL = 108

/**
 * Mínimo no imponible MENSUALIZADO, en BPC.
 *
 * El BPS lo publica con ese nombre («MNI mensualizado (9 BPC)») y es exactamente
 * el anual sobre doce. Se declara como constante propia, y un test verifica que
 * siga siendo el anual / 12: si alguna vez la ficha publicara un mensual que no
 * sea la doceava parte del anual, el test cae y hay que leer la norma, no
 * ajustar la división.
 */
export const IASS_MNI_BPC_MONTHLY = 9

/** Los meses del ejercicio. El IASS es anual y la retención mensual. */
export const IASS_MONTHS_PER_YEAR = 12

/**
 * La escala ANUAL, tal como la publica el BPS.
 *
 * Hasta 108 BPC exento, y después 6 %, 24 % y 30 %. Es la que devuelven las
 * búsquedas, y la que mucha gente lee como si fuera mensual.
 */
export const IASS_ANNUAL_BRACKETS: readonly IassBracket[] = Object.freeze([
  { fromBpc: 0, toBpc: IASS_MNI_BPC_ANNUAL, ratePct: 0 },
  { fromBpc: IASS_MNI_BPC_ANNUAL, toBpc: 180, ratePct: 6 },
  { fromBpc: 180, toBpc: 600, ratePct: 24 },
  { fromBpc: 600, toBpc: null, ratePct: 30 },
])

/**
 * La misma escala mensualizada: cada tramo anual sobre doce.
 *
 * Se DERIVA y no se escribe, para que no puedan separarse. Da 9 / 15 / 50 BPC,
 * que es lo que hay que mirar para entender un recibo.
 */
export const IASS_MONTHLY_BRACKETS: readonly IassBracket[] = Object.freeze(
  IASS_ANNUAL_BRACKETS.map(b =>
    Object.freeze({
      fromBpc: b.fromBpc / IASS_MONTHS_PER_YEAR,
      toBpc: b.toBpc === null ? null : b.toBpc / IASS_MONTHS_PER_YEAR,
      ratePct: b.ratePct,
    })
  )
)

/**
 * La escala mensual de la OPCIÓN para quien cobra de varios organismos.
 *
 * Cita textual del BPS: «Cuando la persona perciba pasividades provenientes de
 * distintos organismos en simultáneo, cuya suma supere el mínimo no imponible
 * (MNI) mensualizado (9 BPC), tiene la opción de solicitar que se le descuente
 * IASS en la totalidad de sus ingresos de BPS, según las siguientes franjas».
 *
 * NO tiene tramo exento, y eso no es un error de transcripción: el MNI se usa
 * una sola vez en el año y esta escala es la del descuento, no la del impuesto.
 * El impuesto sigue siendo anual y se cierra con el ajuste final.
 */
export const IASS_MULTI_SOURCE_MONTHLY_BRACKETS: readonly IassBracket[] = Object.freeze([
  { fromBpc: 0, toBpc: 6, ratePct: 6 },
  { fromBpc: 6, toBpc: 41, ratePct: 24 },
  { fromBpc: 41, toBpc: null, ratePct: 30 },
])

/** Lo que cada tramo aportó a la cuenta, para poder mostrarla abierta. */
export interface IassBracketShare {
  readonly bracket: IassBracket
  /** Pesos del ingreso que cayeron en este tramo. */
  readonly baseUyu: number
  /** Impuesto que aportó este tramo. */
  readonly taxUyu: number
}

export interface IassWithholding {
  /** Impuesto del período. */
  readonly taxUyu: number
  /** Lo que queda después del descuento. */
  readonly netUyu: number
  /** Impuesto sobre ingreso, en %. Es SIEMPRE menor que la tasa del último tramo. */
  readonly effectiveRatePct: number
  /** La tasa del tramo más alto que alcanzó el ingreso. */
  readonly marginalRatePct: number
  readonly shares: readonly IassBracketShare[]
}

/**
 * Cuánto IASS sale de un ingreso, con una escala y una BPC.
 *
 * Marginal por tramos, como el IRPF: cada peso paga la tasa del tramo en el que
 * cae y no la del tramo que alcanzó. Es la cuenta que hace que la tasa efectiva
 * nunca sea el 30 % aunque el ingreso esté en la franja del 30 %, y confundir
 * las dos es el otro error clásico de las calculadoras.
 *
 * Por defecto usa la escala mensualizada, que es la que explica un recibo. Para
 * la cuenta del año se le pasa {@link IASS_ANNUAL_BRACKETS} y el ingreso anual.
 */
export function iassWithholding(
  incomeUyu: number,
  bpcUyu: number,
  brackets: readonly IassBracket[] = IASS_MONTHLY_BRACKETS
): IassWithholding {
  const income = Number.isFinite(incomeUyu) && incomeUyu > 0 ? incomeUyu : 0
  const bpc = Number.isFinite(bpcUyu) && bpcUyu > 0 ? bpcUyu : 0
  // Sin BPC no hay escala: todos los tramos valdrían cero y el ingreso entero caería en el tramo
  // abierto de arriba, o sea un 30 % inventado. Pasa de verdad si `/api/uy-figures` se cae y algo
  // propaga un 0, y el resultado se le muestra a una persona como lo que le descuentan. Preferimos
  // no afirmar nada: la página esconde la cuenta cuando no hay impuesto que mostrar.
  if (income === 0 || bpc === 0) {
    return { taxUyu: 0, netUyu: 0, effectiveRatePct: 0, marginalRatePct: 0, shares: [] }
  }
  const shares: IassBracketShare[] = []
  let tax = 0
  let marginalRatePct = 0

  for (const bracket of brackets) {
    const floor = bracket.fromBpc * bpc
    const ceiling = bracket.toBpc === null ? Infinity : bracket.toBpc * bpc
    // Lo que de este ingreso cae dentro del tramo. Negativo significa que el
    // ingreso no llegó hasta acá, y entonces no aporta nada.
    const base = Math.max(0, Math.min(income, ceiling) - floor)
    const bracketTax = (base * bracket.ratePct) / 100
    if (base > 0) {
      shares.push({ bracket, baseUyu: round2(base), taxUyu: round2(bracketTax) })
      if (bracket.ratePct > 0) marginalRatePct = bracket.ratePct
    }
    tax += bracketTax
  }

  const taxUyu = round2(tax)
  return {
    taxUyu,
    netUyu: round2(income - taxUyu),
    effectiveRatePct: income > 0 ? round2((taxUyu / income) * 100) : 0,
    marginalRatePct,
    shares,
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Lo que esta página NO publica, a propósito.
 *
 * Mismo criterio que el resto del sitio: si la fuente no lo da, no se estima.
 */
export const IASS_UNPUBLISHED: readonly string[] = Object.freeze([
  'El resultado del ajuste final de cada persona: depende de los doce meses cobrados y de todos los organismos que pagaron, y la ficha del BPS no publica una fórmula que se pueda reproducir acá.',
  'La fecha de la declaración jurada del IASS de cada año: la fija la DGI por resolución y cambia de año a año, así que se manda a buscar al calendario oficial en vez de quedar vieja en esta página.',
  'Cualquier descuento distinto del IASS que aparezca en el recibo (FONASA, cuota mutual, embargos): no son este impuesto y mezclarlos daría un «cuánto me descuentan» que no es el de ninguna ley.',
])

/**
 * La descripción del snippet, armada desde la escala.
 *
 * Los pesos se mueven cada 1.º de enero con la BPC, y un literal escrito a mano
 * quedaría viejo sin que nada falle — el peor modo de fallar. La regla medida en
 * este sitio es que una descripción con el número del día corre a ~1,4 % de CTR
 * contra 0,03–0,2 % de una genérica, así que el número tiene que estar Y tiene
 * que estar bien.
 */
export function iassSeoDescription(bpcUyu: number): string {
  const monthly = Math.round(IASS_MNI_BPC_MONTHLY * bpcUyu)
  const annual = Math.round(IASS_MNI_BPC_ANNUAL * bpcUyu)
  return `Por debajo de ${pesos(monthly)} por mes (${pesos(annual)} al año) la pasividad no paga IASS. Arriba, la escala es 6 %, 24 % y 30 % marginal, y se retiene mes a mes.`
}

/** `$ 61.776`, con el separador de miles uruguayo y sin decimales. */
export function pesos(amount: number): string {
  return `$ ${Math.round(amount).toLocaleString('es-UY', { maximumFractionDigits: 0 })}`
}
