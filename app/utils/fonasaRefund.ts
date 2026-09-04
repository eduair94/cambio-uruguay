// app/utils/fonasaRefund.ts
// Datos y aritmética de /devolucion-fonasa-uruguay: el excedente de aportes al FONASA que el BPS
// devuelve una vez por año.
//
// POR QUÉ EXISTE: el sitio hablaba de la devolución de FONASA de pasada en seis páginas
// (`cambiar-de-mutualista-uruguay` la tiene hasta en sus keywords) y no tenía ninguna que la
// explicara. Es una pregunta estacional y masiva —el BPS le pagó a más de 155.000 personas por el
// ejercicio 2024— y la respuesta que circula («si ganás mucho te devuelven») no alcanza para saber
// si te toca ni cuánto.
//
// LO QUE ESTA PÁGINA CONTESTA Y NADIE MÁS: el tope anual NO es un umbral de sueldo. Es la suma del
// costo promedio equivalente (CPE) mensual de la cobertura, incrementada en un 25 %, sumando la
// tuya y la de quienes tenés a cargo. Los «$ 113.167» que publica el BPS son el sueldo desde el
// cual, para el caso más simple (una persona sola, doce meses de cobertura), los aportes superan
// ese tope: no son la regla, son un ejemplo. Por eso alguien con hijos a cargo puede ganar bastante
// más y no tener devolución — su tope es más alto, porque cubre a más gente.
//
// EL CAMBIO QUE VIENE: el Decreto 317/025 (26/12/2025) hizo dos cosas en el mismo texto. Su
// artículo 18 fijó el CPE en $ 6.693 desde el 1.º de enero de 2026, y su artículo 17 sustituyó el
// artículo 13 del Decreto 221/011, o sea la metodología con la que se calcula. El MEF aclaró que el
// cambio de metodología NO toca la devolución que se paga en 2026: recién impacta en la de 2027.
// Es el dato que más se malinterpreta del tema y por eso está en la página, no acá.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA: los umbrales del ejercicio 2025 (los que se pagan en
// setiembre de 2026). Al 19/8/2026 el BPS todavía no los publicó, y estimarlos indexando los de
// 2024 sería inventar una cifra. La página dice qué ejercicio es el último publicado y con qué
// fecha, en vez de rellenar el hueco.
//
// FUENTES PRIMARIAS, verificadas el 2026-08-19 (ver FONASA_SOURCES para la lista completa):
//   - Ley 18.731 art. 3 — la comparación al 31 de diciembre y el excedente a devolver. VIGENTE.
//     https://www.impo.com.uy/bases/leyes/18731-2011/3
//   - Decreto 317/025 arts. 17 y 18 — nueva metodología del CPE y su valor desde el 1/1/2026.
//     https://www.impo.com.uy/bases/decretos-originales/317-2025
//   - MEF, «Preguntas y respuestas sobre el cambio al CPE» (09/01/2026) — el impacto recién en 2027
//   - Presidencia (03/09/2025) — cifras y calendario del ejercicio 2024
//   - BPS — cómo se arma el tope anual y la retención de IRPF sobre lo devuelto

export interface FonasaSource {
  readonly label: string
  readonly url: string
}

export interface FonasaExercise {
  /** Año civil de los aportes que se comparan contra el tope. */
  readonly year: number
  /** Primer día de pago (ISO). */
  readonly paidFrom: string
  /** Personas alcanzadas, según el comunicado oficial. */
  readonly people: number
  /** Total devuelto, en pesos. */
  readonly totalPesos: number
  /** Promedio de ingresos mensuales nominales desde el cual hubo devolución, trabajadores. */
  readonly workerThreshold: number
  /** Ídem para jubilados y pensionistas. */
  readonly retireeThreshold: number
}

/** Fecha en la que se contrastó todo lo de este archivo contra la fuente oficial. */
export const FONASA_VERIFIED_AT = '2026-08-19'

/**
 * El 25 % del artículo 3 de la Ley 18.731: el tope no es el CPE, es el CPE más un cuarto.
 * Expresado como multiplicador porque así se usa en `annualCap`.
 */
export const CPE_UPLIFT = 1.25

/** Costo promedio equivalente mensual, en pesos. Decreto 317/025 art. 18, desde el 1/1/2026. */
export const CPE_MONTHLY = 6693
export const CPE_FROM = '2026-01-01'

/**
 * Cuándo cambia ese valor, que NO es sólo en enero.
 *
 * El artículo 17 del Decreto 317/025 —el que sustituyó el art. 13 del Decreto 221/011— dice que el
 * CPE «se ajustará en las mismas oportunidades que determine el Poder Ejecutivo para las cuotas
 * salud», y recién «adicionalmente, en enero de cada año» se recalcula incorporando los cambios en
 * las expectativas de vida. O sea que cada ajuste de cuotas salud mueve el CPE, y en Uruguay esos
 * ajustes son típicamente dos por año.
 *
 * La página publicaba «$ 6.693 desde el 1.º de enero de 2026» sin esta parte, lo que lo hacía leer
 * como un valor fijo hasta el enero siguiente. No lo es. Acá no se estima el valor que rija hoy —no
 * encontramos el decreto posterior y estimarlo sería inventar una cifra— pero sí se dice cuál es la
 * regla, que es lo que le permite a alguien saber que tiene que mirar.
 */
export const CPE_ADJUSTMENT_RULE =
  'Ese valor no queda fijo hasta el enero siguiente. El artículo 17 del Decreto 317/025 dispone que el costo promedio equivalente se ajusta en las mismas oportunidades que el Poder Ejecutivo determine para las cuotas salud, y que además, en enero de cada año, se recalcula incorporando los cambios en las expectativas de vida de la población. Si el Ejecutivo ajustó las cuotas salud después de esa fecha, el CPE vigente es más alto que el que figura acá.'
/** Ejercicio al que le corresponde ese CPE (el que se cobra al año siguiente). */
export const CPE_EXERCISE = 2026

/**
 * Retención de IRPF sobre lo devuelto. Es una retención, no un impuesto nuevo: lo que se devuelve
 * fueron aportes que en su momento se dedujeron de la base del IRPF. 8 % desde el ejercicio 2016
 * (Res. DGI 3148/017); entre 2011 y 2015 fue 20 %.
 */
export const IRPF_RETENTION_PCT = 8
export const IRPF_RETENTION_PCT_LEGACY = 20

/** Primer año de pago en el que se nota el cambio de metodología del Decreto 317/025 (MEF). */
export const METHODOLOGY_FIRST_IMPACT_YEAR = 2027

/**
 * Ejercicios con cifras oficiales publicadas. Sólo se agrega un año cuando el BPS o Presidencia
 * publicaron sus números: nunca una proyección.
 */
export const FONASA_EXERCISES: readonly FonasaExercise[] = [
  {
    year: 2024,
    paidFrom: '2025-09-22',
    people: 155000,
    totalPesos: 7_774_000_000,
    workerThreshold: 113167,
    retireeThreshold: 122598,
  },
]

/** El último ejercicio con cifras oficiales. */
export const LATEST_EXERCISE: FonasaExercise = FONASA_EXERCISES[FONASA_EXERCISES.length - 1]!

export interface FonasaStep {
  readonly n: number
  readonly title: string
  readonly detail: string
}

export const FONASA_STEPS: readonly FonasaStep[] = [
  {
    n: 1,
    title: 'El BPS compara, no vos',
    detail:
      'La ley obliga a comparar, al 31 de diciembre de cada año, tus aportes personales al FONASA del año civil contra tu tope anual. Esa cuenta la hace el BPS con la información que ya tiene; no hay un formulario para pedir la devolución del excedente.',
  },
  {
    n: 2,
    title: 'Consultás si te toca',
    detail:
      'Con Usuario Personal BPS ves el monto y el detalle del cálculo en «Consultar detalle de devolución Fonasa». Sin usuario sólo podés saber si estás comprendido o no, por la web, el 0800 2016 o el WhatsApp 092 366 272.',
  },
  {
    n: 3,
    title: 'Elegís dónde cobrar',
    detail:
      'Esto sí depende de vos y es lo único que puede demorarte el cobro. Si tenés cuenta bancaria o instrumento de dinero electrónico registrado, te lo depositan el primer día de pago; si no, cobrás en red de cobranzas según el último dígito de la cédula.',
  },
  {
    n: 4,
    title: 'Te retienen el IRPF',
    detail:
      'Lo que llega a tu cuenta es neto: el BPS retiene 8 % de IRPF sobre la devolución. No es un impuesto extra, es la contracara de que esos aportes en su momento salieron de la base del IRPF.',
  },
  {
    n: 5,
    title: 'Si tenés deuda, queda retenida',
    detail:
      'Cuando hay retención por deuda la devolución no se paga sola: hay que iniciar el trámite en el servicio de solicitudes de ATYR del BPS.',
  },
]

export interface FonasaFaq {
  readonly question: string
  readonly short: string
  readonly answer: string
}

export const FONASA_FAQ: readonly FonasaFaq[] = [
  {
    question: '¿Hay que pedir la devolución de FONASA?',
    short: 'El cálculo es de oficio; lo que elegís es dónde cobrar',
    answer:
      'La comparación entre tus aportes y el tope la hace el BPS al 31 de diciembre de cada año, por mandato del artículo 3 de la Ley 18.731. No existe un trámite para pedir el excedente. Lo que sí conviene tener resuelto antes de setiembre es la forma de cobro: con cuenta bancaria o dinero electrónico registrado se deposita el primer día de pago.',
  },
  {
    question: '¿Desde qué sueldo te devuelven?',
    short: 'No hay un sueldo fijo: depende de a cuánta gente cubrís',
    answer: `No hay un umbral único. Por el ejercicio ${LATEST_EXERCISE.year} el BPS informó que tuvieron devolución los trabajadores con un promedio de ingresos mensuales superior a $ ${LATEST_EXERCISE.workerThreshold.toLocaleString('es-UY')} y los jubilados o pensionistas con más de $ ${LATEST_EXERCISE.retireeThreshold.toLocaleString('es-UY')} (valores nominales). Esas cifras corresponden al caso más simple. Si atribuís cobertura a hijos o a tu cónyuge, tu tope anual sube y hace falta ganar más para superarlo.`,
  },
  {
    question: '¿Qué es el CPE y por qué se le suma 25 %?',
    short: 'Es el costo de tu cobertura; el 25 % lo pone la ley',
    answer: `El costo promedio equivalente es lo que le cuesta al Seguro Nacional de Salud atender a cada beneficiario a lo largo de su vida. El artículo 3 de la Ley 18.731 no compara tus aportes contra el CPE pelado: los compara contra el CPE incrementado en un 25 %. Recién por encima de eso hay excedente. Desde el 1.º de enero de 2026 el CPE mensual es de $ ${CPE_MONTHLY.toLocaleString('es-UY')}, fijado por el artículo 18 del Decreto 317/025.`,
  },
  {
    question: '¿Cuentan los hijos y el cónyuge?',
    short: 'Sí, y suben tu tope',
    answer:
      'El tope suma el CPE del beneficiario y el de quienes tienen cobertura a través suyo. En el caso de menores de 18 años o mayores con discapacidad, el CPE se reparte en partes iguales entre quienes generan el beneficio: si ambos padres le dan cobertura al mismo hijo, cada uno computa medio CPE por mes.',
  },
  {
    question: '¿Y si no tuve cobertura los doce meses?',
    short: 'El tope se prorratea por mes',
    answer:
      'Sólo se computan los meses en los que efectivamente tuviste el beneficio. Medio año de cobertura es medio tope, lo que en la práctica hace más fácil superarlo con el mismo sueldo mensual.',
  },
  {
    question: '¿Cuánto te retienen de IRPF?',
    short: '8 % desde el ejercicio 2016',
    answer:
      'El BPS retiene 8 % de IRPF sobre el monto devuelto, según la Res. DGI 3148/017. Entre los ejercicios 2011 y 2015 la retención había sido de 20 %. Se retiene porque esos aportes personales ya se habían deducido de la base del impuesto cuando los pagaste.',
  },
  {
    question: '¿El cambio de metodología del CPE me baja la devolución de este año?',
    short: `No: recién se nota en la de ${METHODOLOGY_FIRST_IMPACT_YEAR}`,
    answer: `El Decreto 317/025 sustituyó, en su artículo 17, la metodología con la que se calcula el CPE —pasó a usar curvas de supervivencia y a promediar la cápita de los 18 años previos en lugar de asumir cobertura desde el nacimiento—. El MEF aclaró que ese cambio no afecta la devolución que se paga en 2026 y que recién impactará en la de ${METHODOLOGY_FIRST_IMPACT_YEAR}, porque la que se cobra ahora se calcula sobre el ejercicio anterior.`,
  },
  {
    question: '¿Qué pasa si tengo deuda con el BPS?',
    short: 'Queda retenida hasta que hagas el trámite',
    answer:
      'Si tu devolución quedó retenida por deuda, no se libera sola: hay que iniciar la gestión a través del servicio «Iniciar solicitudes de trámites» de ATYR en el BPS.',
  },
]

export const FONASA_SOURCES: readonly FonasaSource[] = [
  {
    label: 'Ley 18.731, artículo 3 — la comparación anual y el excedente a devolver (IMPO)',
    url: 'https://www.impo.com.uy/bases/leyes/18731-2011/3',
  },
  {
    label:
      'Decreto 317/025, artículos 17 y 18 — nueva metodología del CPE y su valor desde el 1/1/2026 (IMPO)',
    url: 'https://www.impo.com.uy/bases/decretos-originales/317-2025',
  },
  {
    label: 'MEF — Preguntas y respuestas sobre el cambio al CPE y su impacto en la devolución',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/preguntas-respuestas-sobre-cambio-costo-promedio-equivalente-su-impacto',
  },
  {
    label:
      'Presidencia — Más de 155.000 personas cobrarán la devolución del excedente (03/09/2025)',
    url: 'https://www.gub.uy/presidencia/comunicacion/noticias/155000-personas-cobraran-devolucion-del-excedente-aportes-fonasa',
  },
  {
    label: 'BPS — Cálculo de la devolución Fonasa (y la retención de IRPF)',
    url: 'https://www.bps.gub.uy/10576/calculo-de-la-devolucion-fonasa.html',
  },
  {
    label: 'BPS — Cálculo del tope anual',
    url: 'https://www.bps.gub.uy/8965/calculo-del-tope-anual.html',
  },
  {
    label: 'BPS — Devolución Fonasa (montos, canales y calendario)',
    url: 'https://www.bps.gub.uy/23298/devolucion-fonasa.html',
  },
  {
    label: 'BPS — Normativa de devolución Fonasa (Leyes 18.731 y 18.922, Res. DGI 3148/017)',
    url: 'https://www.bps.gub.uy/10588/normativa-de-devolucion-fonasa.html',
  },
  {
    label: 'BPS — Consulta de devolución Fonasa',
    url: 'https://devolucionfonasa.bps.gub.uy/',
  },
]

// ---------------------------------------------------------------------------
// Aritmética
// ---------------------------------------------------------------------------

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
const safe = (n: number) => (Number.isFinite(n) ? n : 0)

export interface AnnualCapInput {
  /** CPE mensual en pesos del ejercicio que se calcula. */
  readonly cpeMonthly: number
  /** Meses del año civil con beneficio (0 a 12). */
  readonly months: number
  /** Cuántos CPE mensuales computás: 1 vos, +1 el cónyuge, +0,5 por cada hijo compartido. */
  readonly cpeUnits: number
}

/**
 * Tope anual = suma de los CPE mensuales que te corresponden, incrementada en 25 %.
 *
 * Se redondea al peso porque el resultado se compara contra un aporte que también viene redondeado;
 * arrastrar centésimos daría una falsa precisión sobre una cifra que sólo el BPS puede confirmar.
 */
export function annualCap({ cpeMonthly, months, cpeUnits }: AnnualCapInput): number {
  const cpe = Math.max(0, safe(cpeMonthly))
  const m = clamp(safe(months), 0, 12)
  const units = Math.max(0, safe(cpeUnits))
  return Math.round(cpe * m * units * CPE_UPLIFT)
}

export interface RefundEstimate {
  /** Excedente bruto: lo aportado por encima del tope. Nunca negativo. */
  readonly excess: number
  /** Retención de IRPF sobre el excedente. */
  readonly retention: number
  /** Lo que efectivamente se cobra. */
  readonly net: number
  /** Cuánto falta para llegar al tope cuando no hay excedente. */
  readonly shortfall: number
}

export interface RefundInput {
  /** Aportes personales al FONASA del año civil, en pesos. */
  readonly contributions: number
  /** Tope anual, normalmente el de `annualCap`. */
  readonly cap: number
  /** Retención de IRPF en puntos porcentuales. */
  readonly retentionPct?: number
}

export function estimateRefund({
  contributions,
  cap,
  retentionPct = IRPF_RETENTION_PCT,
}: RefundInput): RefundEstimate {
  const aportes = Math.max(0, safe(contributions))
  const tope = Math.max(0, safe(cap))
  const excess = Math.max(0, Math.round(aportes - tope))
  const retention = Math.round((excess * clamp(safe(retentionPct), 0, 100)) / 100)
  return {
    excess,
    retention,
    net: excess - retention,
    shortfall: excess > 0 ? 0 : Math.round(tope - aportes),
  }
}
