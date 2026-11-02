/**
 * La Tasa de Política Monetaria (TPM) del BCU: el número del que cuelgan los demás.
 *
 * POR QUÉ EXISTE ESTA PÁGINA. La TPM ya estaba en el sitio, pero SIEMPRE como un parámetro de
 * otra cuenta y nunca como la pregunta: es la tasa por defecto de la calculadora de
 * `/cuenta-remunerada-uruguay`, el ancla con la que `/conviene-pagar-todo-con-credito-uruguay`
 * mide si vale financiarse, la referencia del fondo en `/cuanto-vale-una-milla-itau-uruguay` y el
 * piso contra el que `utils/financingData.ts` descarta una LRM al 8,54 %. Cuatro archivos la
 * usaban y ninguno contestaba en cuánto está ni quién la mueve — exactamente el caso que
 * `utils/solidarityFund.ts` dejó escrito para el Fondo de Solidaridad («aparecía en nueve archivos
 * SIEMPRE como un descuento que hay que meter en otra cuenta, y en ninguno como la pregunta
 * propia»), y que terminó justificando su propia página.
 *
 * Y tiene una segunda mitad que importa más: una cifra que se usa en cuatro lados y no se publica
 * en ninguno no tiene dueño, y envejece sin que nada avise. El 8/10/2026 el COPOM subió la TPM de
 * 5,75 % a 6 % y el sitio siguió publicando 5,75 % durante casi un mes en tres páginas. Esta
 * página es el lugar donde la cifra se lee, así que es también el lugar donde se nota que quedó
 * vieja.
 *
 * REGLA DE LAS CIFRAS. Todo lo de acá sale del comunicado del COPOM que se leyó, con su URL. No se
 * publica ninguna proyección propia: la TPM la decide un Directorio en una reunión con fecha, y
 * cualquier número «esperado» que pongamos sería nuestro, no del BCU. Lo mismo con el «desde
 * cuándo»: sólo se afirma la fecha de la reunión que la MOVIÓ, nunca la de una que la mantuvo (ver
 * `TPM_CONFIRMED` en `utils/yieldAccounts.ts`, que es la constante que ya cargaba ese matiz).
 *
 * Módulo puro: sin imports de Vue/Nuxt, para que vitest-node lo cargue.
 */

export interface PolicyRateSource {
  label: string
  url: string
  publisher: string
}

/** Una decisión del COPOM: la fecha, el nivel en que quedó la TPM y si la movió. */
export interface CopomDecision {
  /** ISO date (YYYY-MM-DD) de la reunión, tal como el BCU fecha su comunicado. */
  date: string
  /** El nivel en que queda la TPM después de la decisión, en % anual. */
  levelPct: number
  /**
   * El cambio en puntos básicos. `0` es «la mantuvo»: es un dato, no un hueco, y por eso no es
   * `null` — el BCU publica un comunicado igual cuando no la mueve, y esas reuniones son la mitad
   * de la respuesta a «¿es verdad que el mes que viene baja?».
   */
  changeBp: number
  /** El titular del comunicado, tal como lo lista el BCU. */
  headline: string
}

/**
 * Las reuniones del COPOM de 2026, en orden, tal como las lista la página del Comité.
 *
 * Son las SIETE celebradas hasta la fecha de revisión, no un calendario de las que vienen: el BCU
 * publica el calendario aparte y una reunión anunciada no es una decisión. Las fechas coinciden una
 * a una con `COPOM_MEETINGS_2026` de `utils/yieldAccounts.ts`, y
 * `tests/unit/monetaryPolicyRate.test.ts` lo exige para que las dos listas no se separen en
 * silencio.
 */
export const COPOM_DECISIONS_2026: readonly CopomDecision[] = Object.freeze([
  {
    date: '2026-01-26',
    levelPct: 6.5,
    changeBp: -100,
    headline: 'El BCU reduce la tasa de interés en 100 puntos básicos hasta 6,5%',
  },
  {
    date: '2026-03-03',
    levelPct: 5.75,
    changeBp: -75,
    headline:
      'El Banco Central del Uruguay reduce la tasa de interés en 75 puntos básicos hasta 5,75%',
  },
  {
    date: '2026-04-21',
    levelPct: 5.75,
    changeBp: 0,
    headline: 'El BCU mantiene la Tasa de Política Monetaria en 5,75%',
  },
  {
    date: '2026-05-26',
    levelPct: 5.75,
    changeBp: 0,
    headline: 'El BCU mantiene la tasa de política monetaria en 5,75%',
  },
  {
    date: '2026-07-01',
    levelPct: 5.75,
    changeBp: 0,
    headline: 'El BCU mantiene la tasa de política monetaria en 5,75%',
  },
  {
    date: '2026-08-18',
    levelPct: 5.75,
    changeBp: 0,
    headline: 'El BCU resolvió mantener la Tasa de Política Monetaria en 5,75%',
  },
  {
    date: '2026-10-08',
    levelPct: 6,
    changeBp: 25,
    headline: 'El BCU incrementa la Tasa de Política Monetaria en 25 puntos básicos hasta 6%',
  },
])

/** La última decisión leída. El nivel vigente sale de acá y no de una constante aparte. */
export const LAST_DECISION: CopomDecision = COPOM_DECISIONS_2026[COPOM_DECISIONS_2026.length - 1]!

/**
 * La fecha en que se leyeron estos comunicados.
 *
 * Importa publicarla: la TPM no tiene fecha de vencimiento, tiene una próxima reunión. Decir «está
 * en 6 %» sin decir cuándo se verificó es la misma frase que el sitio publicó durante casi un mes
 * cuando ya era falsa.
 */
export const POLICY_RATE_REVIEWED = '2026-11-02'

/**
 * Lo que el comunicado del 8/10/2026 dice, en sus propios términos.
 *
 * Son las cifras que el BCU pone al lado de la decisión para explicarla, y no estimaciones
 * nuestras. El IPC es el dato del INE tal como el comunicado lo cita; las expectativas son las de
 * sus propias encuestas.
 */
export const DECISION_CONTEXT = Object.freeze({
  /** La meta de inflación del BCU en el Horizonte de Política Monetaria. */
  metaPct: 4.5,
  /** Horizonte de Política Monetaria, en años. */
  horizonteAnios: 2,
  /** IPC interanual que cita el comunicado, y su mes. */
  ipcInteranualPct: 4.7,
  ipcMes: 'setiembre de 2026',
  /** Expectativas de inflación para el HPM, por tipo de encuestado. */
  expectativas: Object.freeze([
    { quien: 'Analistas', pct: 4.55 },
    { quien: 'Operadores financieros', pct: 4.58 },
    { quien: 'Empresas', pct: 5 },
  ]),
  /** El promedio de las encuestas que publica el comunicado. */
  promedioEncuestasPct: 4.71,
})

/**
 * Las cuatro cosas que la TPM NO es.
 *
 * Es la mitad de la página que más falta hacía, porque los cuatro errores llegan desde una
 * búsqueda: quien escribe «tasa del banco central» muchas veces está buscando lo que le van a
 * cobrar por un préstamo, que es otra cosa y vive en `/ley-de-usura-uruguay`.
 */
export interface RateConfusion {
  /** Con qué se confunde. */
  conQue: string
  /** Por qué no es lo mismo. */
  porQue: string
  /** La página del sitio que sí contesta eso. */
  donde: string
  dondeLabel: string
}

export const RATE_CONFUSIONS: readonly RateConfusion[] = Object.freeze([
  {
    conQue: 'La tasa que te cobra un banco por un préstamo',
    porQue:
      'La TPM es la tasa de referencia de la política monetaria, no un precio al público. Lo que un préstamo puede cobrarte tiene su propio tope legal, que el BCU publica aparte y que se mide en TEA.',
    donde: '/ley-de-usura-uruguay',
    dondeLabel: 'Topes de usura del BCU',
  },
  {
    conQue: 'La tasa de un plazo fijo',
    porQue:
      'Cada banco fija la suya y compite por el depósito, así que puede estar por encima o por debajo de la TPM. La TPM explica hacia dónde se mueven todas, no cuánto paga una.',
    donde: '/herramientas/calculadora-plazo-fijo',
    dondeLabel: 'Simulador de plazo fijo',
  },
  {
    conQue: 'El rendimiento de una cuenta remunerada',
    porQue:
      'Esos fondos compran papel en pesos del BCU y del Estado, así que su rendimiento se mueve cerca de la TPM, pero ninguna app promete una tasa y la comisión se descuenta adentro del fondo.',
    donde: '/cuenta-remunerada-uruguay',
    dondeLabel: 'Cuentas remuneradas en pesos',
  },
  {
    conQue: 'La tasa de corte de una LRM',
    porQue:
      'Las Letras de Regulación Monetaria son el instrumento con el que el BCU ejecuta la política, y se licitan: su tasa la pone el mercado en cada licitación y se mueve alrededor de la TPM, no con ella.',
    donde: '/letras-de-regulacion-monetaria-uruguay',
    dondeLabel: 'Letras de Regulación Monetaria',
  },
])

/** Las fuentes, todas del BCU. */
export const POLICY_RATE_SOURCES: readonly PolicyRateSource[] = Object.freeze([
  {
    label: 'El BCU incrementa la Tasa de Política Monetaria en 25 puntos básicos hasta 6%',
    url: 'https://www.bcu.gub.uy/Comunicaciones/Paginas/Detalle-Noticia.aspx?noticia=554&title=El-BCU-incrementa-la-Tasa-de-Pol%C3%ADtica-Monetaria-en-25-puntos-b%C3%A1sicos-hasta-6',
    publisher: 'Banco Central del Uruguay',
  },
  {
    label: 'Comunicados del Comité de Política Monetaria (COPOM)',
    url: 'https://www.bcu.gub.uy/Politica-Economica-y-Mercados/Paginas/Copom.aspx',
    publisher: 'Banco Central del Uruguay',
  },
])

/** `-25` → «bajó 25 puntos básicos»; `0` → «la mantuvo». */
export function describeChange(changeBp: number): string {
  if (changeBp === 0) return 'La mantuvo'
  const verbo = changeBp > 0 ? 'Subió' : 'Bajó'
  return `${verbo} ${Math.abs(changeBp)} puntos básicos`
}

/** Cuántas de las reuniones leídas movieron la tasa. */
export function movesIn2026(): number {
  return COPOM_DECISIONS_2026.filter(decision => decision.changeBp !== 0).length
}
