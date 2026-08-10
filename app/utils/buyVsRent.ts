// app/utils/buyVsRent.ts
// Motor de /comprar-o-alquilar-uruguay: la cuenta que la gente pide en los hilos y nadie hace.
//
// POR QUÉ EXISTE: es el último hueco sustancial que quedó del corpus completo — 140 preguntas y
// 1.177 de engagement, con hilos como «tengo X guita… ¿me conviene comprar con crédito
// hipotecario?» (84 comentarios), «¿Hipoteca antes que alquiler?» (55) y «vendo o no vendo, el
// BHU me sangra la vida» (83).
//
// LO QUE YA HABÍA: seis guías sobre la MECÁNICA de comprar (crédito hipotecario, primera
// vivienda, escrituración, BHU, terreno, promesa de compraventa). Ninguna hace la COMPARACIÓN.
//
// LAS TRES COSAS QUE ESTA CUENTA PONE SOBRE LA MESA Y QUE CASI NADIE SUMA:
//   1. La cuota NO es el costo de comprar. Hay que sumarle contribución inmobiliaria, gastos
//      comunes y mantenimiento.
//   2. El anticipo tiene costo de oportunidad: esa plata podía estar rindiendo. Ignorarlo es lo
//      que hace parecer que comprar siempre gana.
//   3. Los gastos de escrituración son de entrada y se reparten entre los años que te quedes.
//      Comprar para irte en tres años casi nunca cierra, y es por esto.
//
// LO QUE NO HACE: no predice el precio de la propiedad ni el del alquiler a futuro. Cualquier
// número de apreciación sería una opinión disfrazada de dato, y este módulo se niega a inventarla:
// las tasas, el alquiler y el rendimiento alternativo los pone el lector.
//
// MÓDULO PURO, testeado en `app/tests/unit/buyVsRent.test.ts`.

/** Fecha en que se revisó el modelo. Las cifras las aporta el usuario: acá no hay tabla que caduque. */
export const BUY_VS_RENT_VERIFIED_AT = '2026-08-10'

export interface BuyVsRentInput {
  /** Precio de la propiedad. */
  price: number
  /** Anticipo que ponés de tu bolsillo. */
  downPayment: number
  /** Tasa efectiva anual del crédito, en porcentaje. */
  annualRatePct: number
  /** Plazo del crédito, en años. */
  years: number
  /** Alquiler mensual del equivalente que estarías alquilando. */
  monthlyRent: number
  /** Contribución inmobiliaria y tributos del inmueble, por mes. */
  monthlyTaxes: number
  /** Gastos comunes por mes, si los hay. */
  monthlyCommonFees: number
  /** Mantenimiento estimado por mes. Lo paga el propietario, no el inquilino. */
  monthlyMaintenance: number
  /** Rendimiento anual NETO que conseguirías con el anticipo si no lo usaras, en porcentaje. */
  altReturnPct: number
  /** Costos de escrituración y gastos de compra, de una sola vez. */
  closingCosts: number
}

export interface BuyVsRentResult {
  /** Monto financiado. */
  loan: number
  /** Cuota mensual del crédito, sistema francés. */
  monthlyPayment: number
  /** Qué parte de la PRIMERA cuota es interés, en porcentaje. */
  firstPaymentInterestPct: number
  /** Costo mensual de comprar, con todo incluido. */
  buyMonthlyCost: number
  /** Costo mensual de alquilar. */
  rentMonthlyCost: number
  /** Costo de oportunidad mensual del anticipo. */
  opportunityCost: number
  /** Diferencia mensual: positiva cuando comprar sale MÁS caro. */
  monthlyGap: number
  /**
   * Años que hay que quedarse para que la ventaja mensual de comprar cubra los gastos de
   * escrituración. `null` cuando comprar no tiene ventaja mensual y por lo tanto nunca los cubre.
   */
  yearsToCoverClosing: number | null
}

const round2 = (n: number): number => Math.round(n * 100) / 100
const clampPos = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0)

/**
 * Cuota del sistema francés. Con tasa 0 es simplemente capital sobre meses — el caso que rompe
 * la fórmula si no se contempla.
 */
export function monthlyPayment(principal: number, annualRatePct: number, years: number): number {
  const p = clampPos(principal)
  const n = Math.round(clampPos(years) * 12)
  if (p === 0 || n === 0) return 0
  const i = clampPos(annualRatePct) / 100 / 12
  if (i === 0) return round2(p / n)
  const factor = Math.pow(1 + i, n)
  return round2((p * i * factor) / (factor - 1))
}

/**
 * Qué porcentaje de la primera cuota se va en intereses. Es el dato que explica el «el BHU me
 * sangra»: al principio casi nada amortiza capital.
 */
export function firstPaymentInterestShare(
  principal: number,
  annualRatePct: number,
  years: number
): number {
  const cuota = monthlyPayment(principal, annualRatePct, years)
  if (cuota === 0) return 0
  const interest = (clampPos(principal) * (clampPos(annualRatePct) / 100)) / 12
  return round2(Math.min(100, (interest / cuota) * 100))
}

/**
 * La comparación. Deliberadamente NO proyecta apreciación de la propiedad ni suba del alquiler:
 * compara el costo de sostener cada opción hoy, con los datos que pone el lector.
 */
export function compareBuyVsRent(input: BuyVsRentInput): BuyVsRentResult {
  const price = clampPos(input.price)
  const down = Math.min(clampPos(input.downPayment), price)
  const loan = round2(price - down)

  const cuota = monthlyPayment(loan, input.annualRatePct, input.years)
  const opportunityCost = round2((down * (clampPos(input.altReturnPct) / 100)) / 12)

  const buyMonthlyCost = round2(
    cuota +
      clampPos(input.monthlyTaxes) +
      clampPos(input.monthlyCommonFees) +
      clampPos(input.monthlyMaintenance) +
      opportunityCost
  )
  const rentMonthlyCost = round2(clampPos(input.monthlyRent))
  const monthlyGap = round2(buyMonthlyCost - rentMonthlyCost)

  // Si comprar sale más barato por mes, ¿en cuántos años esa ventaja paga la escrituración?
  const monthlyAdvantage = -monthlyGap
  const closing = clampPos(input.closingCosts)
  const yearsToCoverClosing = monthlyAdvantage > 0 ? round2(closing / monthlyAdvantage / 12) : null

  return {
    loan,
    monthlyPayment: cuota,
    firstPaymentInterestPct: firstPaymentInterestShare(loan, input.annualRatePct, input.years),
    buyMonthlyCost,
    rentMonthlyCost,
    opportunityCost,
    monthlyGap,
    yearsToCoverClosing,
  }
}

export interface BuyVsRentFactor {
  title: string
  detail: string
  icon: string
}

/** Lo que la cuenta incorpora y la conversación de sobremesa suele omitir. */
export const FORGOTTEN_COSTS: readonly BuyVsRentFactor[] = Object.freeze([
  {
    title: 'La cuota no es el costo de comprar',
    detail:
      'Al préstamo hay que sumarle la contribución inmobiliaria, los gastos comunes y el mantenimiento. Eso lo paga el propietario, no el inquilino.',
    icon: 'mdi-plus-box-multiple-outline',
  },
  {
    title: 'El anticipo tiene costo de oportunidad',
    detail:
      'Esa plata podía estar rindiendo en otro lado. Ignorarlo es lo que hace parecer que comprar siempre gana: el anticipo no es gratis por estar «invertido en ladrillo».',
    icon: 'mdi-cash-clock',
  },
  {
    title: 'La escrituración se reparte entre los años que te quedes',
    detail:
      'Son gastos de una sola vez. Si te vas a los tres años, se reparten entre 36 meses; si te quedás quince, entre 180. Por eso comprar para mudarse pronto casi nunca cierra.',
    icon: 'mdi-file-sign',
  },
  {
    title: 'Al principio la cuota casi no amortiza',
    detail:
      'En el sistema francés los primeros años se van sobre todo en intereses. La sensación de «pago y la deuda no baja» no es una impresión: es cómo funciona la tabla.',
    icon: 'mdi-chart-bell-curve',
  },
])

/** El límite del modelo, escrito para que la página no prometa más de lo que puede. */
export const MODEL_LIMITS =
  'Esta cuenta compara el costo de sostener cada opción con los números de hoy. No proyecta cuánto va a valer la propiedad ni cuánto va a subir el alquiler, porque cualquier tasa de apreciación que pusiéramos sería una opinión disfrazada de dato. Si tu apuesta es que la propiedad se revaloriza, esa parte la estás poniendo vos y conviene que sea explícita.'

export interface BuyVsRentFaq {
  question: string
  short: string
  answer: string
}

export const BUY_VS_RENT_FAQ: readonly BuyVsRentFaq[] = Object.freeze([
  {
    question: '¿Me conviene comprar con crédito hipotecario o seguir alquilando?',
    short: 'Depende de cuánto tiempo te quedes y de qué rinde tu anticipo en otro lado.',
    answer:
      'No hay una respuesta general, pero sí una cuenta. Comparás el alquiler contra la suma de cuota, contribución, gastos comunes, mantenimiento y el costo de oportunidad del anticipo. Si comprar sale más barato por mes, esa ventaja tiene que alcanzar además para cubrir la escrituración en los años que pensás quedarte. Con el comparador de esta página ponés tus números y ves el corte.',
  },
  {
    question: 'Pago la cuota y la deuda no baja. ¿Es normal?',
    short: 'Sí: en el sistema francés los primeros años son casi todo interés.',
    answer:
      'La cuota es fija pero su composición no: al principio la mayor parte se va en intereses y muy poco amortiza capital, y con los años se invierte. Por eso a los pocos años de un crédito largo el saldo bajó mucho menos de lo que uno esperaría. El comparador te muestra qué porcentaje de la primera cuota es interés en tu caso.',
  },
  {
    question: '¿Por qué contás el anticipo como un costo?',
    short: 'Porque esa plata podía estar rindiendo, y dejar de ganarlo es un costo real.',
    answer:
      'Es el costo de oportunidad. Si tenés el anticipo en un instrumento que rinde, al usarlo para comprar dejás de percibir ese rendimiento: eso es tan real como una cuota. Omitirlo es el error más común de las comparaciones caseras, y es justo el que hace que comprar parezca ganar siempre. Vos decidís qué rendimiento alternativo poner; el sitio no lo inventa.',
  },
  {
    question: '¿Y si la propiedad se revaloriza?',
    short: 'Puede pasar, pero no lo proyectamos: sería una opinión con forma de dato.',
    answer:
      'Esta cuenta compara el costo de sostener cada opción hoy. No proyecta apreciación de la propiedad ni suba del alquiler porque cualquier tasa que pusiéramos sería una suposición nuestra metida en tu decisión. Si tu apuesta incluye que la propiedad suba, es mejor que sea una decisión consciente y no un supuesto escondido en una calculadora.',
  },
  {
    question: '¿Cuánto tiempo tengo que quedarme para que valga la pena?',
    short: 'El que tarde la ventaja mensual en cubrir los gastos de escrituración.',
    answer:
      'Si comprar te sale más barato por mes, esa diferencia va amortizando los gastos de entrada. El comparador te dice en cuántos años los cubre. Si comprar te sale más caro por mes, no hay plazo que los cubra por esta vía: ahí la compra se justifica por otras razones, no por el costo mensual.',
  },
])
