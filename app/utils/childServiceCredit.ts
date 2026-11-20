// El cómputo ficto por hijos de la jubilación uruguaya: cuántos años de servicios suma un hijo.
//
// POR QUÉ ESTE MÓDULO EXISTE Y POR QUÉ NO CALCULA CASI NADA. La regla que casi todos los resúmenes
// citan —el artículo 14 de la Ley 18.395— está DEROGADA: la derogó el propio artículo 43 de la Ley
// 20.130 en su último inciso, y es ese artículo 43 el que hoy manda. Las dos normas dicen cosas
// parecidas sobre el año por hijo, así que citar la vieja no se nota en el número; se nota en todo
// lo demás, que es nuevo (los dos años por hijo con discapacidad severa sin tope, la división entre
// padres, qué cajas quedan comprendidas y qué cajas pueden optar).
//
// Lo único que se calcula acá son los años que el propio artículo 43 manda sumar, con sus dos topes.
// Nada más: el sueldo básico jubilatorio, la tasa de reemplazo y el monto de la pasividad dependen
// de la historia laboral de cada persona y de los veinte años del artículo 44, así que publicar un
// importe sería inventarlo. El artículo 45 se describe en la página y no se modela por la misma
// razón.
//
// PURO (sin Vue ni Nuxt) para que vitest lo cargue directo, como el resto de `utils/`.

/** La ruta de la página, en un solo lugar para que la canónica y los enlaces no se despeguen. */
export const CHILD_CREDIT_PATH = '/computo-por-hijo-jubilacion-uruguay'

/** El día en que se leyeron, uno por uno, los artículos y las páginas del BPS de `CHILD_CREDIT_SOURCES`. */
export const CHILD_CREDIT_VERIFIED_AT = '2026-11-10'

/** Años de servicios que suma cada hijo (Ley 20.130, art. 43, num. 1). */
export const YEARS_PER_CHILD = 1

/** Tope total del cómputo del numeral 1 (Ley 20.130, art. 43, num. 1). */
export const MAX_YEARS = 5

/**
 * Años ADICIONALES por cada hijo en situación de discapacidad severa (art. 43, num. 2).
 *
 * El numeral dice que ese adicional «no se computará a efectos del máximo indicado
 * precedentemente», así que no entra en los cinco años y no tiene tope propio.
 */
export const EXTRA_YEARS_PER_SEVERE_DISABILITY = 2

/** Mínimo en que puede fraccionarse el adicional entre los padres, si hay acuerdo (art. 43, num. 2). */
export const MIN_SPLIT_MONTHS = 6

export interface ChildCreditInput {
  /** Hijos nacidos con vida o adoptados siendo menores o personas con discapacidad. */
  readonly children: number
  /** De esos hijos, cuántos están en situación de discapacidad severa. */
  readonly severeDisability: number
}

export interface ChildCreditResult {
  /** Años del numeral 1, ya topeados en `MAX_YEARS`. */
  readonly baseYears: number
  /** Años del numeral 2. No entran en el tope y no tienen uno propio. */
  readonly extraYears: number
  /** La suma de los dos, que es lo que se agrega a la historia laboral. */
  readonly totalYears: number
  /** `true` cuando el numeral 1 llegó al tope, o sea que un hijo más ya no suma por esa vía. */
  readonly cappedBase: boolean
}

const whole = (value: number): number =>
  Number.isFinite(value) && value > 0 ? Math.floor(value) : 0

/**
 * Los años de servicios fictos que suma el artículo 43: un año por hijo hasta cinco, más dos años
 * por cada hijo con discapacidad severa, que quedan fuera de ese tope.
 *
 * Los hijos con discapacidad severa son un subconjunto de `children`, así que un valor mayor que el
 * total se recorta: no se inventan hijos que no se declararon.
 */
export function childServiceCredit(input: ChildCreditInput): ChildCreditResult {
  const children = whole(input.children)
  const severe = Math.min(whole(input.severeDisability), children)
  const uncapped = children * YEARS_PER_CHILD
  const baseYears = Math.min(uncapped, MAX_YEARS)
  const extraYears = severe * EXTRA_YEARS_PER_SEVERE_DISABILITY
  return {
    baseYears,
    extraYears,
    totalYears: baseYears + extraYears,
    cappedBase: uncapped > MAX_YEARS,
  }
}

export interface CreditScheme {
  readonly id: string
  readonly name: string
  /** Qué dice el artículo 43 sobre esta caja, en sus propios términos. */
  readonly status: 'comprendida' | 'puede-optar'
  readonly detail: string
}

/**
 * A quién alcanza el artículo 43, que es el dato que ningún resumen trae y el que más cambia la
 * respuesta: en tres cajas rige por ley y en las otras tres es una facultad de cada una.
 */
export const CREDIT_SCHEMES: readonly CreditScheme[] = Object.freeze([
  {
    id: 'bps',
    name: 'Banco de Previsión Social (BPS)',
    status: 'comprendida',
    detail:
      'El artículo 43 alcanza a las personas amparadas por el BPS, estén en el Sistema Previsional Común, en el régimen jubilatorio anterior o en el procedimiento de convergencia de regímenes.',
  },
  {
    id: 'ffaa',
    name: 'Servicio de Retiros y Pensiones de las Fuerzas Armadas',
    status: 'comprendida',
    detail:
      'Nombrado en el mismo inciso del artículo 43, con los mismos tres encuadres. Antes del cambio el cómputo era sólo del régimen del BPS.',
  },
  {
    id: 'policial',
    name: 'Dirección Nacional de Asistencia y Seguridad Social Policial',
    status: 'comprendida',
    detail: 'También nombrada en el artículo 43, en las mismas condiciones.',
  },
  {
    id: 'bancaria',
    name: 'Caja de Jubilaciones y Pensiones Bancarias',
    status: 'puede-optar',
    detail:
      'El artículo 43 dice que «podrá disponer la aplicación» del cómputo en su ámbito, en forma total o parcial, y que debe presentar al Poder Ejecutivo un informe con los fundamentos. No es automático: hay que preguntar en la caja.',
  },
  {
    id: 'notarial',
    name: 'Caja Notarial de Seguridad Social',
    status: 'puede-optar',
    detail: 'Misma facultad y misma obligación de informar al Poder Ejecutivo.',
  },
  {
    id: 'profesionales',
    name: 'Caja de Jubilaciones y Pensiones de Profesionales Universitarios',
    status: 'puede-optar',
    detail: 'Misma facultad y misma obligación de informar al Poder Ejecutivo.',
  },
])

export interface CreditSource {
  readonly label: string
  readonly url: string
}

/** Las fuentes primarias, cada una abierta el día de `CHILD_CREDIT_VERIFIED_AT`. */
export const CHILD_CREDIT_SOURCES: readonly CreditSource[] = Object.freeze([
  {
    label:
      'Ley 20.130, artículo 43 (cómputo ficto por hijos; deroga el art. 14 de la Ley 18.395) — IMPO',
    url: 'https://www.impo.com.uy/bases/leyes/20130-2023/43',
  },
  {
    label:
      'Ley 20.130, artículo 45 (sueldo básico jubilatorio y maternidad: la ventana se puede acortar) — IMPO',
    url: 'https://www.impo.com.uy/bases/leyes/20130-2023/45',
  },
  {
    label: 'Ley 20.130, artículo 6 (vigencia de cada disposición) — IMPO',
    url: 'https://www.impo.com.uy/bases/leyes/20130-2023/6',
  },
  {
    label: 'Ley 18.395, artículo 14 — IMPO lo muestra DEROGADO por la Ley 20.130, art. 43',
    url: 'https://www.impo.com.uy/bases/leyes/18395-2008/14',
  },
  {
    label: 'BPS — Cómputo ficto por cuidados (cómo lo liquida, y el recálculo del 1/12/2023)',
    url: 'https://www.bps.gub.uy/20889/computo-ficto-por-cuidados.html',
  },
  {
    label: 'BPS — ¿Los hijos suman años para la jubilación?',
    url: 'https://www.bps.gub.uy/20575/que-es-el-computo-por-hijos.html',
  },
])
