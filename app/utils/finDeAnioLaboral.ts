// app/utils/finDeAnioLaboral.ts
// Las cuatro fechas del fin de año y qué dice la ley de cada una. Los datos de la guía
// /guias/trabajar-el-24-y-31-de-diciembre-uruguay, que los compone en `guideVeranoFinDeAnio.ts`.
//
// POR QUÉ ESTA GUÍA EXISTE. Cada diciembre se pregunta lo mismo —si el 24 y el 31 son feriados, si
// hay medio día, si se paga doble— y la respuesta de la ley es corta y negativa: ninguno de los dos
// está en la lista del artículo 2 de la Ley 16.805 ni entre los cinco feriados pagos del artículo 18
// de la Ley 12.590. El medio día que mucha gente sí tiene existe, pero no sale de una norma general:
// sale del convenio del grupo de Consejo de Salarios de cada actividad (Ley 10.449, art. 5), que es
// un lugar distinto y consultable. Las dos mitades de esa respuesta estaban en el sitio por separado
// —`/feriados-que-se-corren-uruguay` publica la lista y la regla del corrimiento— y ninguna página
// contestaba la pregunta tal como se escribe.
//
// LA PERTENENCIA A LA LISTA NO SE REESCRIBE ACÁ. Las cuatro filas se arman buscando la fecha en
// `FERIADOS_FIJOS` de `./feriados.ts`, que es donde viven las diez entradas del artículo 2 con sus
// fuentes. Así la afirmación central de la página —«el 24 no es feriado, el 25 sí y además es
// pago»— es un dato DERIVADO del catálogo de la ley y no un texto paralelo que pueda separarse de
// él en silencio. `tests/unit/finDeAnioLaboral.test.ts` lo vigila en los dos sentidos.
//
// LO QUE ESTA PÁGINA NO AFIRMA:
//
//   1. Qué dice NINGÚN convenio en particular. Hay convenios que dan media jornada, otros que fijan
//      hora de cierre y otros que declaran esos días feriado pago para su rama; publicarlos pide
//      leer y fechar cada uno, y son decenas de grupos y subgrupos. La guía dice dónde está el
//      convenio de cada uno y cómo preguntar gratis, que es lo que sí se puede sostener.
//   2. Si abre tu banco, tu oficina pública o tu supermercado. El horario de esos dos días lo
//      publica cada organismo o empresa cada año y es una decisión de atención al público, no una
//      clasificación laboral.
//   3. Ningún monto. Acá no hay cifras de sueldo, de jornal ni de recargo: sólo la regla de pago que
//      la norma escribe y las palabras con que el MTSS la explica.

import { FERIADOS_FIJOS, type FeriadoFijo } from './feriados'

/** Fecha en la que se contrastó todo lo de este archivo contra las fuentes oficiales. */
export const FIN_DE_ANIO_VERIFIED_AT = '2026-11-23'

/** La entrada del artículo 2 de la Ley 16.805 para esta fecha, o `null` si la ley no la nombra. */
export function feriadoDeFecha(mes: number, dia: number): FeriadoFijo | null {
  return FERIADOS_FIJOS.find(f => f.mes === mes && f.dia === dia) ?? null
}

export interface FechaFinDeAnio {
  readonly key: string
  /** Cómo se escribe la fecha en la página. */
  readonly etiqueta: string
  readonly mes: number
  readonly dia: number
  /** La entrada de la ley, si la hay. `null` es la respuesta: no es feriado. */
  readonly feriado: FeriadoFijo | null
  /** Qué se cobra ese día, según la norma que lo rige. */
  readonly queSeCobra: string
  /** La norma que sostiene la fila, en una línea. */
  readonly norma: string
}

const fila = (
  key: string,
  etiqueta: string,
  mes: number,
  dia: number,
  queSeCobra: string,
  norma: string
): FechaFinDeAnio => ({
  key,
  etiqueta,
  mes,
  dia,
  feriado: feriadoDeFecha(mes, dia),
  queSeCobra,
  norma,
})

/**
 * Las cuatro fechas del fin de año, en orden de calendario.
 *
 * Son cuatro y no dos porque la pregunta nunca viene sola: quien busca el 24 está mirando el 25 en
 * la misma semana, y la diferencia entre los dos días es exactamente lo que la página contesta.
 */
export const FIN_DE_ANIO_FECHAS: readonly FechaFinDeAnio[] = [
  fila(
    'nochebuena',
    '24 de diciembre',
    12,
    24,
    'Como un día común: si es tu día de trabajo, cobrás el jornal o el día de sueldo de siempre.',
    'No figura entre los feriados del artículo 2 de la Ley 16.805 ni entre los cinco feriados pagos del artículo 18 de la Ley 12.590.'
  ),
  fila(
    'navidad',
    '25 de diciembre',
    12,
    25,
    'Se cobra como si trabajaras, y si trabajás, paga doble.',
    'Artículo 2 de la Ley 16.805: se observa el día de la semana que caiga. Artículo 18 de la Ley 12.590: feriado pago.'
  ),
  fila(
    'fin-de-anio',
    '31 de diciembre',
    12,
    31,
    'Como un día común: si es tu día de trabajo, cobrás el jornal o el día de sueldo de siempre.',
    'No figura entre los feriados del artículo 2 de la Ley 16.805 ni entre los cinco feriados pagos del artículo 18 de la Ley 12.590.'
  ),
  fila(
    'ano-nuevo',
    '1.º de enero',
    1,
    1,
    'Se cobra como si trabajaras, y si trabajás, paga doble.',
    'Artículo 2 de la Ley 16.805: se observa el día de la semana que caiga. Artículo 18 de la Ley 12.590: feriado pago.'
  ),
]

/** Las dos fechas que la ley NO nombra, que son el sujeto de la página. */
export const FIN_DE_ANIO_LABORABLES = FIN_DE_ANIO_FECHAS.filter(f => f.feriado === null)

/** Las dos que sí, y que además son feriados pagos. */
export const FIN_DE_ANIO_FERIADOS = FIN_DE_ANIO_FECHAS.filter(f => f.feriado !== null)

/**
 * Cómo se llega al convenio de la propia actividad, que es el único lugar donde el medio día puede
 * estar escrito. Los datos del trámite son los que publica su ficha en gub.uy.
 */
export interface PasoConvenio {
  readonly titulo: string
  readonly texto: string
}

export const FIN_DE_ANIO_PASOS: readonly PasoConvenio[] = [
  {
    titulo: 'Averiguá tu grupo y subgrupo',
    texto:
      'Los convenios se negocian por grupo de actividad en los Consejos de Salarios, y el MTSS publica los grupos de industria, comercio y actividades en general. Tu recibo de sueldo suele traer el grupo; si no, lo dice la empresa.',
  },
  {
    titulo: 'Leé el convenio de ese grupo',
    texto:
      'Si tu convenio dice algo del 24 y del 31, lo dice ahí: media jornada, hora de cierre o incluso declararlos feriado pago para la rama. Un grupo puede tenerlo y el de al lado no, y ninguno de los dos está equivocado.',
  },
  {
    titulo: 'Si no lo encontrás, preguntá gratis',
    texto:
      'El trámite «Consulta laboral y salarial» del MTSS no tiene costo y se hace en línea: la respuesta llega por correo en hasta 10 días hábiles. En Montevideo las consultas salariales se atienden sin agenda en Juncal 1511 de 9:00 a 12:00, y se agenda por el 0800 7171 o por WhatsApp al 098 007 171.',
  },
]

export interface FinDeAnioFaq {
  readonly question: string
  readonly answer: string
}

export const FIN_DE_ANIO_FAQ: readonly FinDeAnioFaq[] = [
  {
    question: '¿El 24 de diciembre es feriado en Uruguay?',
    answer:
      'No. El artículo 2 de la Ley 16.805 enumera los feriados uruguayos y el 24 de diciembre no está entre ellos; el feriado es el 25, el Día de la Familia. El 24 es un día laborable común: se trabaja el horario de siempre y se cobra como un día cualquiera, salvo que el convenio de tu grupo de Consejo de Salarios diga otra cosa.',
  },
  {
    question: '¿Y el 31 de diciembre?',
    answer:
      'Tampoco. Pasa exactamente lo mismo que con el 24: no figura en la lista de la Ley 16.805 ni entre los cinco feriados pagos del artículo 18 de la Ley 12.590. El feriado es el 1.º de enero.',
  },
  {
    question: '¿Entonces de dónde sale el medio día del 24 y del 31?',
    answer:
      'De los convenios colectivos, no de una ley general. El artículo 5 de la Ley 10.449 habilita a los Consejos de Salarios a fijar condiciones de trabajo cuando lo acuerdan las delegaciones de empleadores y de trabajadores del grupo, y esas decisiones rigen una vez que el Poder Ejecutivo las registra y publica. Por eso hay ramas con media jornada, ramas con hora de cierre y ramas sin nada escrito.',
  },
  {
    question: 'Si trabajo el 24 o el 31, ¿me tienen que pagar doble?',
    answer:
      'La ley no lo exige: la paga doble del artículo 18 de la Ley 12.590 corre en los cinco feriados pagos (1.º de enero, 1.º de mayo, 18 de julio, 25 de agosto y 25 de diciembre), y el 24 y el 31 no son ninguno de ellos. Si trabajás esos días cobrás como un día común, salvo que tu convenio diga otra cosa.',
  },
  {
    question: '¿Y si trabajo el 25 de diciembre o el 1.º de enero?',
    answer:
      'Esos sí son feriados pagos. El artículo 18 de la Ley 12.590 dice que todo trabajador «percibirá remuneración como si trabajara» y que «en caso de trabajar recibirá doble paga». El MTSS lo explica así: «Si el trabajador es jornalero y trabaja un feriado pago recibe doble jornal»; al mensual le corresponde el mes completo más un día, calculado como el sueldo dividido 30.',
  },
  {
    question: '¿El feriado del 25 se corre si cae sábado o domingo?',
    answer:
      'No. El 25 de diciembre es una de las diez entradas del artículo 2 de la Ley 16.805, que «se continuarán observando en el día de la semana que ocurriere, cualquiera que este fuera». Sólo se corren al lunes el 19 de abril, el 18 de mayo y el 12 de octubre.',
  },
  {
    question: '¿Abren los bancos y las oficinas públicas el 24 y el 31?',
    answer:
      'Eso no lo define la ley de feriados: cada organismo y cada empresa publica su horario de atención de esos dos días, y suele anunciarlo en diciembre. Que el día sea laborable no obliga a nadie a abrir al público el horario completo.',
  },
]

export interface FinDeAnioSource {
  readonly label: string
  readonly url: string
  /** Quién la publica, como lo imprime la tarjeta «Fuentes» de la guía. */
  readonly publisher: string
}

export const FIN_DE_ANIO_SOURCES: readonly FinDeAnioSource[] = [
  {
    label:
      'Ley 16.805 (24/12/1996) — art. 2: la lista de feriados uruguayos, que no incluye el 24 ni el 31 de diciembre',
    url: 'https://www.impo.com.uy/bases/leyes/16805-1996',
    publisher: 'IMPO',
  },
  {
    label:
      'Ley 12.590 (11/12/1958) — art. 18: los cinco feriados pagos y la doble paga de quien trabaja en ellos',
    url: 'https://www.impo.com.uy/bases/leyes/12590-1958',
    publisher: 'IMPO',
  },
  {
    label:
      'MTSS — «Feriados»: cómo se paga un feriado pago al jornalero y al mensual, y qué pasa en un feriado laborable',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/institucional/derecho-laboral-uruguayo/feriados',
    publisher: 'MTSS',
  },
  {
    label:
      'Ley 10.449 (12/11/1943) — art. 5: los Consejos de Salarios y su facultad de fijar condiciones de trabajo por grupo',
    url: 'https://www.impo.com.uy/bases/leyes/10449-1943',
    publisher: 'IMPO',
  },
  {
    label: 'MTSS — Consejos de Salarios y negociación colectiva: los grupos y sus convenios',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/tematica/consejos-salarios-negociacion-colectiva',
    publisher: 'MTSS',
  },
  {
    label:
      'MTSS — «Consulta laboral y salarial»: trámite gratuito, en línea, con respuesta por correo en hasta 10 días hábiles',
    url: 'https://www.gub.uy/tramites/consulta-laboral-salarial',
    publisher: 'MTSS',
  },
]
