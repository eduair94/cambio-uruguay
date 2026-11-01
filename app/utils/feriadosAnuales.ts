// app/utils/feriadosAnuales.ts
// El calendario de feriados de UN año y los fines de semana largos que deja.
//
// POR QUÉ ESTÁ APARTE DE `feriados.ts`. Ese archivo publica la REGLA —qué feriados se corren al
// lunes y por qué— y declara con todas las letras que NO publica el calendario anual. El motivo es
// bueno: dos de las diez entradas del artículo 2 de la Ley 16.805, Carnaval y Semana de Turismo, no
// tienen fecha de calendario (su `mes` y su `dia` son `null`), porque la ley las nombra por su
// posición respecto de la Pascua y no por un día del mes. Un calendario anual que las omita no es
// un calendario, y uno que les invente una fecha es peor.
//
// Esto agrega exactamente esa pieza y nada más: la Pascua se CALCULA con el cómputo gregoriano, que
// es la misma clase de operación que `observarFeriado()` hace con el artículo 1 —aplicar una regla a
// un año, no copiar un dato de ningún lado—. De ahí salen el miércoles de Ceniza (Pascua − 46 días),
// el lunes y martes de Carnaval (los dos días anteriores) y el jueves y viernes de Semana de Turismo
// (Pascua − 3 y − 2). Todo lo demás viene de `feriados.ts`, con sus fuentes.
//
// LO QUE NO SE AFIRMA:
//
//   1. Que el calendario sea una publicación oficial del año. Al 29 de octubre de 2026 el Estado no
//      publicó el de 2027; lo que esta página puede sostener es la ley aplicada al año, y lo dice.
//   2. Que un sábado sea día libre para todo el mundo. El «fin de semana largo» de abajo supone
//      semana de lunes a viernes, que es un supuesto sobre el lector y no una afirmación legal: hay
//      actividades que trabajan sábado, y el feriado no obliga a cerrar a nadie (sólo cambia cómo se
//      paga, y sólo en los cinco pagos del art. 18 de la Ley 12.590).
//   3. Que un feriado en sábado o domingo «se pase». No se pasa: las diez entradas del artículo 2 se
//      observan «en el día de la semana que ocurriere», y las otras tres sólo se corren al lunes
//      cuando caen martes a viernes. Un feriado en domingo se pierde, y eso es el dato.

import { FERIADOS_FIJOS, FERIADOS_MOVILES, observarFeriado, type Corrimiento } from './feriados'

const DIA_MS = 86_400_000

const ISO = (d: Date) => d.toISOString().slice(0, 10)
const fecha = (iso: string) => new Date(`${iso}T00:00:00Z`)
const sumarDias = (iso: string, dias: number) => ISO(new Date(fecha(iso).getTime() + dias * DIA_MS))
/** Día de la semana en UTC (0 = domingo). */
export const diaDeLaSemana = (iso: string) => fecha(iso).getUTCDay()

// ---------------------------------------------------------------------------
// La Pascua, y las dos fechas que cuelgan de ella
// ---------------------------------------------------------------------------

/**
 * Domingo de Pascua del calendario gregoriano, en ISO.
 *
 * Es el cómputo anónimo gregoriano, el mismo que usan los almanaques: aritmética entera sobre el año
 * y nada más. Se verifica en `tests/unit/feriadosAnuales.test.ts` contra fechas conocidas de ocho
 * años seguidos, porque un algoritmo transcripto mal da fechas plausibles en vez de romperse.
 */
export function pascuaDe(year: number): string {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const total = h + l - 7 * m + 114
  const mes = Math.floor(total / 31)
  const dia = (total % 31) + 1
  return ISO(new Date(Date.UTC(year, mes - 1, dia)))
}

/** Miércoles de Ceniza: 46 días antes de la Pascua. */
export function cenizaDe(year: number): string {
  return sumarDias(pascuaDe(year), -46)
}

/** Lunes y martes de Carnaval: los dos días anteriores al miércoles de Ceniza. */
export function carnavalDe(year: number): { lunes: string; martes: string } {
  const ceniza = cenizaDe(year)
  return { lunes: sumarDias(ceniza, -2), martes: sumarDias(ceniza, -1) }
}

/** Jueves y viernes de Semana de Turismo: el Jueves y el Viernes Santo. */
export function semanaDeTurismoDe(year: number): { jueves: string; viernes: string } {
  const pascua = pascuaDe(year)
  return { jueves: sumarDias(pascua, -3), viernes: sumarDias(pascua, -2) }
}

// ---------------------------------------------------------------------------
// El calendario del año
// ---------------------------------------------------------------------------

/** De dónde sale la fecha de esta fila. */
export type OrigenFecha =
  /** La fecha que declara la ley, observada en el día que cae (art. 2 de la Ley 16.805). */
  | 'ley-fija'
  /** La fecha de la ley, movida —o no— por el artículo 1. */
  | 'ley-movil'
  /** Calculada a partir de la Pascua, porque la ley nombra el día y no la fecha. */
  | 'pascua'

export interface FeriadoDelAnio {
  readonly key: string
  readonly nombre: string
  /** El día en que se observa, en ISO. Es la fecha que importa para planificar. */
  readonly observado: string
  /** La fecha que declara la ley, cuando es distinta de `observado`. */
  readonly declarada: string | null
  readonly diaSemana: number
  /** `true` sólo si el artículo 1 lo movió de día. */
  readonly seCorre: boolean
  readonly corrimiento: Corrimiento | null
  /** Uno de los cinco feriados pagos del art. 18 de la Ley 12.590. */
  readonly pago: boolean
  readonly origen: OrigenFecha
}

/**
 * Las quince fechas de feriado de un año, ordenadas por calendario.
 *
 * Quince y no trece: Carnaval y Semana de Turismo son dos días cada uno, así que una entrada de la
 * ley puede rendir dos filas acá. La página cuenta DÍAS, que es lo que se pregunta.
 */
export function calendarioDe(year: number): FeriadoDelAnio[] {
  const filas: FeriadoDelAnio[] = []

  for (const f of FERIADOS_FIJOS) {
    if (f.mes !== null && f.dia !== null) {
      const observado = ISO(new Date(Date.UTC(year, f.mes - 1, f.dia)))
      filas.push({
        key: f.key,
        nombre: f.nombre,
        observado,
        declarada: null,
        diaSemana: diaDeLaSemana(observado),
        seCorre: false,
        corrimiento: null,
        pago: f.pago,
        origen: 'ley-fija',
      })
      continue
    }
    // Carnaval y Semana de Turismo: la ley nombra los días, la Pascua da la fecha.
    const dias: Array<{ etiqueta: string; observado: string }> =
      f.key === 'carnaval'
        ? [
            { etiqueta: 'lunes de Carnaval', observado: carnavalDe(year).lunes },
            { etiqueta: 'martes de Carnaval', observado: carnavalDe(year).martes },
          ]
        : [
            { etiqueta: 'jueves de Semana de Turismo', observado: semanaDeTurismoDe(year).jueves },
            {
              etiqueta: 'viernes de Semana de Turismo',
              observado: semanaDeTurismoDe(year).viernes,
            },
          ]
    for (const { etiqueta, observado } of dias) {
      filas.push({
        key: `${f.key}-${observado}`,
        nombre: `${f.nombre}: ${etiqueta}`,
        observado,
        declarada: null,
        diaSemana: diaDeLaSemana(observado),
        seCorre: false,
        corrimiento: null,
        pago: f.pago,
        origen: 'pascua',
      })
    }
  }

  for (const f of FERIADOS_MOVILES) {
    const o = observarFeriado(year, f.mes, f.dia)
    filas.push({
      key: f.key,
      nombre: f.nombre,
      observado: o.observado,
      declarada: o.seCorre ? o.fecha : null,
      diaSemana: diaDeLaSemana(o.observado),
      seCorre: o.seCorre,
      corrimiento: o.corrimiento,
      pago: false,
      origen: 'ley-movil',
    })
  }

  return filas.sort((a, b) => a.observado.localeCompare(b.observado))
}

// ---------------------------------------------------------------------------
// Los fines de semana largos
// ---------------------------------------------------------------------------

export interface TramoLibre {
  readonly desde: string
  readonly hasta: string
  /** Cuántos días seguidos sin día hábil, contando sábado y domingo. */
  readonly dias: number
  /** Los feriados que lo arman, por nombre. */
  readonly feriados: readonly string[]
}

const esFinDeSemana = (iso: string) => {
  const d = diaDeLaSemana(iso)
  return d === 0 || d === 6
}

/**
 * Los tramos de tres días o más sin un día hábil en medio.
 *
 * Se arma recorriendo el año día por día en vez de mirando cada feriado: un tramo puede nacer de dos
 * feriados que se tocan (Carnaval) o de uno pegado al fin de semana, y mirar feriado por feriado
 * cuenta el mismo tramo dos veces. Un feriado aislado —el 25 de agosto de 2027 cae miércoles— no es
 * un tramo: queda en un día y no entra.
 *
 * El supuesto está arriba y vale repetirlo: sábado y domingo cuentan como no hábiles, que es cierto
 * para la semana de lunes a viernes y no para todo el mundo.
 */
export function finesDeSemanaLargosDe(year: number): TramoLibre[] {
  const porFecha = new Map<string, string[]>()
  for (const f of calendarioDe(year)) {
    porFecha.set(f.observado, [...(porFecha.get(f.observado) ?? []), f.nombre])
  }

  const tramos: TramoLibre[] = []
  let actual: { desde: string; hasta: string; dias: number; feriados: string[] } | null = null

  const inicio = Date.UTC(year, 0, 1)
  const fin = Date.UTC(year, 11, 31)
  for (let t = inicio; t <= fin; t += DIA_MS) {
    const iso = ISO(new Date(t))
    const feriados = porFecha.get(iso)
    const libre = Boolean(feriados) || esFinDeSemana(iso)
    if (!libre) {
      if (actual && actual.dias >= 3) tramos.push({ ...actual })
      actual = null
      continue
    }
    if (actual) {
      actual.hasta = iso
      actual.dias += 1
      if (feriados) actual.feriados.push(...feriados)
    } else {
      actual = { desde: iso, hasta: iso, dias: 1, feriados: feriados ? [...feriados] : [] }
    }
  }
  if (actual && actual.dias >= 3) tramos.push({ ...actual })

  // Un tramo sin ningún feriado adentro es un fin de semana de tres días que no existe: sólo puede
  // aparecer si el recorrido empieza o termina partido por el borde del año (1.º de enero sábado,
  // 31 de diciembre viernes). No es un fin de semana largo, es el corte del almanaque.
  return tramos.filter(tramo => tramo.feriados.length > 0)
}

export interface ResumenAnual {
  readonly year: number
  /** Cuántos días de feriado tiene el año. */
  readonly dias: number
  /** Cuántos caen sábado o domingo, o sea los que el año se come. */
  readonly enFinDeSemana: number
  /** Cuántos los corre al lunes el artículo 1 de la Ley 16.805. */
  readonly seCorren: number
  /** Los cinco pagos del art. 18 de la Ley 12.590. */
  readonly pagos: number
  readonly finesDeSemanaLargos: number
  /** El más largo del año, en días. `0` si no hay ninguno. */
  readonly tramoMasLargo: number
}

export function resumenDe(year: number): ResumenAnual {
  const filas = calendarioDe(year)
  const tramos = finesDeSemanaLargosDe(year)
  return {
    year,
    dias: filas.length,
    enFinDeSemana: filas.filter(f => esFinDeSemana(f.observado)).length,
    seCorren: filas.filter(f => f.seCorre).length,
    pagos: filas.filter(f => f.pago).length,
    finesDeSemanaLargos: tramos.length,
    tramoMasLargo: tramos.reduce((max, t) => Math.max(max, t.dias), 0),
  }
}
