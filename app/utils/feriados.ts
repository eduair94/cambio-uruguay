// app/utils/feriados.ts
// Datos y aritmética de /feriados-que-se-corren-uruguay: qué feriados uruguayos se corren al lunes,
// cuáles se observan siempre el día que caen, y en qué fecha queda cada uno en un año dado.
//
// POR QUÉ EXISTE: el sitio ya avisa dos veces —en /casas-de-cambio-abiertas-fin-de-semana y en las
// fichas de sucursal— que «un feriado puede mover los horarios», y nunca dijo qué días son feriado
// ni cuáles se corren. Esta es la pieza que faltaba, y es la que decide si el lunes conseguís
// cambiar plata o no.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA:
//
//   1. El calendario completo de feriados uruguayos. La Ley 6.997 (1919) declaró dieciocho fechas y
//      varias dejaron de observarse hace décadas (28 de febrero, 2 y 25 de mayo, 4 y 14 de julio,
//      20 y 21 de setiembre, 8 de diciembre). No encontramos la norma vigente que las deroga una por
//      una, así que acá sólo figuran las fechas que una norma POSTERIOR Y VIGENTE vuelve a nombrar
//      como feriado: las diez del artículo 2 de la Ley 16.805 (con su modificativa, la Ley 17.414) y
//      las tres que ese mismo artículo deja fuera de la excepción, que por lo tanto siguen el
//      corrimiento del artículo 1. Publicar la lista de 1919 como si fuera la de hoy sería repetir
//      un dato derogado.
//
//   2. Si abre tu casa de cambio. Ninguna norma obliga a una casa de cambio a cerrar en feriado ni a
//      abrir: cada casa decide, y eso se mira en la ficha de la sucursal, no acá.
//
// EL ERROR QUE ESTA PÁGINA CORRIGE: medio internet repite que el 18 de mayo «es inamovible» porque
// existe la Ley 18.748. Su artículo único exceptúa «el feriado del 18 de mayo de 2011, fecha en que
// se celebran los 200 años de la Batalla de Las Piedras»: valió para ese año y nada más. El 18 de
// mayo se corre como cualquier otro feriado móvil.
//
// FUENTES PRIMARIAS, verificadas el 2026-08-26 (ver FERIADOS_SOURCES):
//   - Ley 16.805 (24/12/1996), arts. 1 y 2, y su modificativa la Ley 17.414 (08/11/2001) — la regla
//     de corrimiento y la lista de feriados exceptuados de ella.
//   - Ley 18.748 (11/05/2011) — la excepción de un solo año para el 18 de mayo de 2011.
//   - Ley 6.997 (1919) — declara como feriados el 19 de abril, el 18 de mayo y el 12 de octubre,
//     que son los tres que la Ley 16.805 no exceptúa.
//   - MTSS, «Feriados» — los cinco feriados pagos del art. 18 de la Ley 12.590 y cómo se pagan.

export interface FeriadoSource {
  readonly label: string
  readonly url: string
}

/** Fecha en la que se contrastó todo lo de este archivo contra las fuentes oficiales. */
export const FERIADOS_VERIFIED_AT = '2026-08-26'

// ---------------------------------------------------------------------------
// La regla (Ley 16.805, art. 1)
// ---------------------------------------------------------------------------

/** Días de la semana como los devuelve `Date.prototype.getUTCDay()`. */
const SUNDAY = 0
const MONDAY = 1
const TUESDAY = 2
const WEDNESDAY = 3
const THURSDAY = 4
const FRIDAY = 5
const SATURDAY = 6

export type Corrimiento = 'mismo-dia' | 'lunes-anterior' | 'lunes-siguiente'

/**
 * El artículo 1 de la Ley 16.805, en código.
 *
 * Texto: «si coincidieran el sábado, domingo o lunes, se observarán esos días; si ocurrieran en
 * martes o miércoles, se observarán el lunes inmediato anterior; si ocurrieren en jueves o viernes,
 * se observarán el lunes inmediato siguiente».
 *
 * Devuelve QUÉ hace la regla, no la fecha: la fecha la arma `observarFeriado()`. Separarlos es lo
 * que permite que la página explique el porqué de cada fila en vez de mostrar un día pelado.
 */
export function corrimientoDe(weekday: number): Corrimiento {
  if (weekday === SATURDAY || weekday === SUNDAY || weekday === MONDAY) return 'mismo-dia'
  if (weekday === TUESDAY || weekday === WEDNESDAY) return 'lunes-anterior'
  if (weekday === THURSDAY || weekday === FRIDAY) return 'lunes-siguiente'
  throw new RangeError(`día de la semana fuera de rango: ${weekday}`)
}

/** Cuántos días hay que sumarle a la fecha original para llegar al día en que se observa. */
function offsetDias(weekday: number): number {
  switch (corrimientoDe(weekday)) {
    case 'mismo-dia':
      return 0
    // Martes → −1, miércoles → −2.
    case 'lunes-anterior':
      return MONDAY - weekday
    // Jueves → +4, viernes → +3. El lunes siguiente, no el de la misma semana.
    case 'lunes-siguiente':
      return MONDAY + 7 - weekday
  }
}

const ISO = (d: Date) => d.toISOString().slice(0, 10)

export interface FeriadoObservado {
  /** La fecha que declara la ley, en ISO (`2027-05-18`). */
  readonly fecha: string
  /** El día en que efectivamente se observa, en ISO. Igual a `fecha` si no se corre. */
  readonly observado: string
  /** Día de la semana (0 = domingo) de la fecha original. */
  readonly diaOriginal: number
  /** Qué hizo la regla con esta fecha. */
  readonly corrimiento: Corrimiento
  /** `true` si la fecha observada NO es la de la ley. */
  readonly seCorre: boolean
}

/**
 * Aplica el artículo 1 a una fecha concreta.
 *
 * Todo en UTC a propósito: un feriado es una fecha del calendario, no un instante, y resolverlo en
 * la zona horaria del visitante haría que la misma página mostrara días distintos según desde dónde
 * se la mire.
 */
export function observarFeriado(year: number, month: number, day: number): FeriadoObservado {
  const original = new Date(Date.UTC(year, month - 1, day))
  const weekday = original.getUTCDay()
  const offset = offsetDias(weekday)
  const observado = new Date(Date.UTC(year, month - 1, day + offset))
  return {
    fecha: ISO(original),
    observado: ISO(observado),
    diaOriginal: weekday,
    corrimiento: corrimientoDe(weekday),
    seCorre: offset !== 0,
  }
}

// ---------------------------------------------------------------------------
// Los feriados
// ---------------------------------------------------------------------------

export interface FeriadoMovil {
  readonly key: string
  readonly nombre: string
  /** Mes calendario, 1-12. */
  readonly mes: number
  readonly dia: number
  /** Qué norma lo declara feriado. */
  readonly norma: string
  readonly detalle: string
}

/**
 * Los TRES feriados que se corren.
 *
 * Son exactamente los que la Ley 6.997 declara feriado y el artículo 2 de la Ley 16.805 no incluye
 * en su lista de excepciones: al no estar exceptuados, les aplica el corrimiento del artículo 1.
 */
export const FERIADOS_MOVILES: readonly FeriadoMovil[] = [
  {
    key: 'desembarco',
    nombre: 'Desembarco de los Treinta y Tres Orientales',
    mes: 4,
    dia: 19,
    norma: 'Ley 6.997 («Día de los Treinta y Tres»)',
    detalle:
      'El 19 de abril no figura entre las excepciones del artículo 2 de la Ley 16.805, así que se corre. Es el feriado que más veces cae en la Semana de Turismo o cerca de ella, y el que más confusión genera.',
  },
  {
    key: 'las-piedras',
    nombre: 'Batalla de Las Piedras',
    mes: 5,
    dia: 18,
    norma: 'Ley 6.997 («Batalla de Las Piedras»)',
    detalle:
      'Sí se corre, aunque se lea lo contrario en todos lados. La Ley 18.748 lo dejó en su fecha una sola vez: su artículo único exceptúa «el feriado del 18 de mayo de 2011, fecha en que se celebran los 200 años de la Batalla de Las Piedras». Fue para el bicentenario y no cambió la regla general.',
  },
  {
    key: 'doce-octubre',
    nombre: '12 de octubre',
    mes: 10,
    dia: 12,
    norma: 'Ley 6.997 («Fiesta de la Raza»)',
    detalle:
      'Tampoco está entre las excepciones del artículo 2, así que se corre. Es el que más veces arma fin de semana largo de los tres.',
  },
]

export interface FeriadoFijo {
  readonly key: string
  readonly nombre: string
  /** `null` en Carnaval y Semana de Turismo: no tienen fecha de calendario fija. */
  readonly mes: number | null
  readonly dia: number | null
  /** Cómo se nombra la fecha cuando no hay día fijo, o el día del mes cuando lo hay. */
  readonly cuando: string
  /** Uno de los cinco feriados pagos del art. 18 de la Ley 12.590. */
  readonly pago: boolean
}

/**
 * Las diez entradas del artículo 2 de la Ley 16.805: los feriados que «se continuarán observando en
 * el día de la semana que ocurriere, cualquiera que este fuera».
 *
 * El orden es el del calendario, no el del texto legal, porque quien entra a la página está mirando
 * el año, no la norma.
 */
export const FERIADOS_FIJOS: readonly FeriadoFijo[] = [
  { key: 'ano-nuevo', nombre: 'Año Nuevo', mes: 1, dia: 1, cuando: '1.º de enero', pago: true },
  { key: 'reyes', nombre: 'Día de los Niños', mes: 1, dia: 6, cuando: '6 de enero', pago: false },
  {
    key: 'carnaval',
    nombre: 'Carnaval',
    mes: null,
    dia: null,
    cuando: 'Lunes y martes de Carnaval',
    pago: false,
  },
  {
    key: 'turismo',
    nombre: 'Semana de Turismo',
    mes: null,
    dia: null,
    cuando: 'Jueves y viernes de Semana de Turismo',
    pago: false,
  },
  {
    key: 'trabajadores',
    nombre: 'Día de los Trabajadores',
    mes: 5,
    dia: 1,
    cuando: '1.º de mayo',
    pago: true,
  },
  {
    key: 'artigas',
    nombre: 'Natalicio de Artigas',
    mes: 6,
    dia: 19,
    cuando: '19 de junio',
    pago: false,
  },
  {
    key: 'jura',
    nombre: 'Jura de la Constitución',
    mes: 7,
    dia: 18,
    cuando: '18 de julio',
    pago: true,
  },
  {
    key: 'independencia',
    nombre: 'Declaratoria de la Independencia',
    mes: 8,
    dia: 25,
    cuando: '25 de agosto',
    pago: true,
  },
  {
    key: 'difuntos',
    nombre: 'Día de los Difuntos',
    mes: 11,
    dia: 2,
    cuando: '2 de noviembre',
    pago: false,
  },
  {
    key: 'navidad',
    nombre: 'Día de la Familia',
    mes: 12,
    dia: 25,
    cuando: '25 de diciembre',
    pago: true,
  },
]

/** Los cinco feriados pagos del artículo 18 de la Ley 12.590, en orden de calendario. */
export const FERIADOS_PAGOS = FERIADOS_FIJOS.filter(f => f.pago)

export interface FilaAnual extends FeriadoMovil, FeriadoObservado {}

/**
 * Los tres feriados móviles resueltos para un año: en qué día caen y en cuál se observan.
 *
 * Esto no es un dato publicado por nadie: es la regla del artículo 1 aplicada a una fecha, que es
 * justamente lo que la página puede sostener sin inventar nada.
 */
export function feriadosMovilesDe(year: number): FilaAnual[] {
  return FERIADOS_MOVILES.map(f => ({ ...f, ...observarFeriado(year, f.mes, f.dia) }))
}

// ---------------------------------------------------------------------------
// Preguntas y fuentes
// ---------------------------------------------------------------------------

export interface FeriadoFaq {
  readonly question: string
  readonly answer: string
}

export const FERIADOS_FAQ: readonly FeriadoFaq[] = [
  {
    question: '¿Qué feriados se corren al lunes en Uruguay?',
    answer:
      'Sólo tres: el 19 de abril (Desembarco de los Treinta y Tres Orientales), el 18 de mayo (Batalla de Las Piedras) y el 12 de octubre. Son los feriados declarados por ley que el artículo 2 de la Ley 16.805 no exceptúa, así que les aplica el corrimiento del artículo 1.',
  },
  {
    question: '¿Cómo se calcula a qué día se corre un feriado?',
    answer:
      'Lo dice el artículo 1 de la Ley 16.805, con su modificativa la Ley 17.414: si el feriado cae sábado, domingo o lunes, se observa ese mismo día; si cae martes o miércoles, se observa el lunes inmediato anterior; y si cae jueves o viernes, se observa el lunes inmediato siguiente.',
  },
  {
    question: '¿El 18 de mayo es feriado inamovible?',
    answer:
      'No. Se repite mucho porque existe la Ley 18.748, pero su artículo único exceptúa del corrimiento «el feriado del 18 de mayo de 2011, fecha en que se celebran los 200 años de la Batalla de Las Piedras». Valió para el bicentenario y para ningún otro año: el 18 de mayo se corre como los demás feriados móviles.',
  },
  {
    question: '¿Qué feriados no se corren nunca?',
    answer:
      'Los que enumera el artículo 2 de la Ley 16.805: Carnaval y Semana de Turismo, y las fechas del 1.º y 6 de enero, 1.º de mayo, 19 de junio, 18 de julio, 25 de agosto, 2 de noviembre y 25 de diciembre. Todos ellos «se continuarán observando en el día de la semana que ocurriere, cualquiera que este fuera».',
  },
  {
    question: '¿Cuáles son los feriados pagos?',
    answer:
      'Cinco: el 1.º de enero, el 1.º de mayo, el 18 de julio, el 25 de agosto y el 25 de diciembre. El artículo 18 de la Ley 12.590 establece que en esos días el trabajador percibe remuneración como si trabajara, y que si trabaja recibe paga doble. Los demás feriados son laborables: se trabaja normalmente y se paga como un día común.',
  },
  {
    question: '¿Abren las casas de cambio en feriado?',
    answer:
      'Depende de cada casa: ninguna norma las obliga a cerrar ni a abrir en feriado, y los horarios de un feriado no siempre son los que figuran publicados. Antes de viajar conviene mirar la ficha de la sucursal y confirmar por teléfono, igual que con los fines de semana.',
  },
]

export const FERIADOS_SOURCES: readonly FeriadoSource[] = [
  {
    label:
      'Ley 16.805 (24/12/1996) — art. 1: la regla de corrimiento al lunes; art. 2: la lista de feriados exceptuados de ella',
    url: 'https://www.impo.com.uy/bases/leyes/16805-1996',
  },
  {
    label: 'Ley 17.414 (08/11/2001) — modificativa de la Ley 16.805',
    url: 'https://www.impo.com.uy/bases/leyes/17414-2001',
  },
  {
    label:
      'Ley 18.748 (11/05/2011) — artículo único: exceptúa del corrimiento el feriado del 18 de mayo DE 2011, por el bicentenario de la Batalla de Las Piedras',
    url: 'https://www.impo.com.uy/bases/leyes/18748-2011/1',
  },
  {
    label:
      'Ley 6.997 (1919) — declara feriados el 19 de abril, el 18 de mayo y el 12 de octubre, los tres que la Ley 16.805 no exceptúa',
    url: 'https://www.impo.com.uy/bases/leyes/6997-1919',
  },
  {
    label:
      'MTSS — «Feriados»: los cinco feriados pagos del art. 18 de la Ley 12.590 y cómo se remuneran',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/institucional/derecho-laboral-uruguayo/feriados',
  },
]
