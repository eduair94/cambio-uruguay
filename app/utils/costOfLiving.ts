// app/utils/costOfLiving.ts
// Engine + reference data for the interactive cost-of-living / budget tool
// (/herramientas/costo-de-vida). PURE module (no Vue/Nuxt) so the page and tests
// share one source of truth.
//
// Goal: help a person in Uruguay see, for their net income and living situation
// (alone, as a couple, sharing, with kids; renting or not; Montevideo or interior),
// what a realistic monthly budget looks like — and whether their expectation is
// financially viable. Grounds expectations instead of selling a fantasy.
//
// The peso figures in COST_MODEL are typical 2026 references from public sources
// (INE canasta, rental portals, UTE/OSE/Antel, STM); they are ballparks with real
// spread, not quotes. Informational, not financial advice.

export type City = 'montevideo' | 'interior'
export type Situation = 'solo' | 'compartido' | 'pareja' | 'familia'
export type Housing = 'alquila' | 'propia'

export interface BudgetInputs {
  /** Household net monthly income in UYU (sum of both incomes if a couple). */
  netIncome: number
  situation: Situation
  city: City
  housing: Housing
  /** Number of children (only used when situation = 'familia'). */
  children: number
}

export type DwellingType =
  | 'monoambiente'
  | '1_dormitorio'
  | '2_dormitorios'
  | 'habitacion_compartida'

interface CostModel {
  /** Typical monthly rent in UYU, [montevideo, interior] not needed — city factor handles interior. */
  rentMontevideo: Record<DwellingType, number>
  /** Interior rent = Montevideo × this factor. */
  interiorRentFactor: number
  /** Realistic monthly food spend per adult cooking at home (UYU). */
  foodPerAdult: number
  /** Children eat ~this fraction of an adult. */
  childFoodFactor: number
  /** Base monthly utilities for a small dwelling (UTE + OSE + Antel + gastos comunes). */
  utilitiesBase: number
  /** Realistic monthly public-transport spend per commuting adult (Montevideo). */
  transportPerAdult: number
  /** Interior transport factor (shorter distances / more walking). */
  interiorTransportFactor: number
  /** Health co-pagos (tickets/órdenes) buffer per person — FONASA covers the cuota for employees. */
  healthPerPerson: number
  /** Personal care, cleaning, basic clothing per person. */
  miscPerPerson: number
  /** Aspirational savings rate applied when income comfortably covers essentials. */
  savingsRate: number
}

// Typical 2026 references, verified against INE / MTSS / UTE / OSE / Antel / STM /
// InfoCasas (see SALARY_REFERENCE + COST_SOURCES). Ballparks with real spread.
export const COST_MODEL: CostModel = {
  rentMontevideo: {
    monoambiente: 22000, // ~$15k Centro/Cordón → ~$28k costa/amoblado
    '1_dormitorio': 28000, // InfoCasas prom. ~USD 720/mes
    '2_dormitorios': 36000, // InfoCasas prom. ~USD 980/mes
    habitacion_compartida: 12000, // habitación en apto compartido
  },
  interiorRentFactor: 0.68, // interior ~30% más barato (Maldonado/PdE es la excepción)
  foodPerAdult: 13000, // 1 persona cocinando en casa (CBA piso $7k; comer afuera lo eleva)
  childFoodFactor: 0.6,
  utilitiesBase: 8500, // UTE ~$2.000 + OSE ~$1.100 + internet ~$1.650 + celular ~$600 + parte de gastos comunes
  transportPerAdult: 2600, // ~2 tramos/día, ~22 días, boleto STM $52
  interiorTransportFactor: 0.7,
  healthPerPerson: 900, // copagos/tickets (FONASA cubre la cuota de los trabajadores formales)
  miscPerPerson: 3500,
  savingsRate: 0.1,
}

/** National minimum + approximate median net salary (UYU, 2026), for on-page context. */
export const SALARY_REFERENCE = Object.freeze({
  minimoNacional: 25383, // desde 1-jul-2026 (nominal); $24.572 desde ene-2026
  medianaLiquidoAprox: 45000, // aproximado, con incertidumbre (INE publica ingreso, no un "líquido" único)
})

export const COST_SOURCES: ReadonlyArray<{ label: string; url: string }> = Object.freeze([
  {
    label: 'MTSS — Salario Mínimo Nacional 2026',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/comunicacion/noticias/salario-minimo-nacional-24572-desde-1o-enero-2026',
  },
  {
    label: 'INE — Estimación de la pobreza (CBA/CBT per cápita)',
    url: 'https://www5.ine.gub.uy/documents/Demograf%C3%ADayEESS/HTML/ECH/Pobreza/2025/Informe%20pobreza%20primer%20semestre%202025.html',
  },
  {
    label: 'InfoCasas — Alquiler de apartamentos en Montevideo',
    url: 'https://www.infocasas.com.uy/alquiler/apartamentos/montevideo',
  },
  {
    label: 'Intendencia de Montevideo — Tarifas del transporte (STM)',
    url: 'https://montevideo.gub.uy/areas-tematicas/sistema-de-transporte-metropolitano/tarifas-del-transporte-colectivo-urbano',
  },
  {
    label: 'UTE — Pliego tarifario 2026',
    url: 'https://www.ute.com.uy/sites/default/files/docs/Pliego%20Tarifario%20Enero%202026.pdf',
  },
  {
    label: 'BPS — Afiliación mutual (FONASA)',
    url: 'https://www.bps.gub.uy/6486/afiliacion-mutual-trabajadores.html',
  },
])

/** Household composition derived from the situation. */
export function household(inputs: BudgetInputs): { adults: number; children: number } {
  const kids = inputs.situation === 'familia' ? Math.max(0, Math.floor(inputs.children || 0)) : 0
  const adults = inputs.situation === 'pareja' || inputs.situation === 'familia' ? 2 : 1
  return { adults, children: kids }
}

/** Standard dwelling assumed for each situation. */
export function dwellingFor(situation: Situation): DwellingType {
  if (situation === 'compartido') return 'habitacion_compartida'
  if (situation === 'pareja') return '1_dormitorio'
  if (situation === 'familia') return '2_dormitorios'
  return 'monoambiente'
}

export type VerdictTier = 'noAlcanza' | 'ajustado' | 'justo' | 'comodo' | 'holgado'

export interface EssentialLine {
  key: string
  label: string
  amount: number
}

export interface BudgetResult {
  adults: number
  children: number
  dwelling: DwellingType
  essentialLines: EssentialLine[]
  /** Sum of essential lines. */
  essentials: number
  income: number
  /** Suggested monthly savings (0 when money is too tight). */
  savingsSuggested: number
  /** Income − essentials − savings; can be negative (a real deficit). */
  discretionary: number
  /** income / essentials. */
  ratio: number
  verdict: VerdictTier
  /** Positive when essentials exceed income (how much is missing per month). */
  deficit: number
}

/** Round to the nearest 100 pesos for tidy display. */
const r100 = (n: number) => Math.round(n / 100) * 100

/**
 * Build a grounded monthly budget for the given situation. Essentials are computed
 * bottom-up from the reference costs (not as a % of income), so the verdict reflects
 * whether the income actually covers a realistic life in that scenario.
 */
export function estimateBudget(inputs: BudgetInputs, model: CostModel = COST_MODEL): BudgetResult {
  const income = Math.max(0, inputs.netIncome || 0)
  const { adults, children } = household(inputs)
  const dwelling = dwellingFor(inputs.situation)
  const cityRentFactor = inputs.city === 'interior' ? model.interiorRentFactor : 1
  const cityTransportFactor = inputs.city === 'interior' ? model.interiorTransportFactor : 1

  // Rent
  let rent = 0
  if (inputs.housing === 'alquila') {
    rent = model.rentMontevideo[dwelling] * cityRentFactor
  }

  // Food scales with everyone in the household
  const foodPeople = adults + children * model.childFoodFactor
  const food = model.foodPerAdult * foodPeople

  // Utilities: base for the dwelling, more people → a bit more; sharing → your share only
  let utilities: number
  if (inputs.situation === 'compartido') {
    utilities = model.utilitiesBase * 0.45
  } else {
    utilities = model.utilitiesBase * (1 + 0.15 * (adults - 1) + 0.1 * children)
  }

  // Transport per commuting adult
  const transport = model.transportPerAdult * adults * cityTransportFactor

  // Health co-pagos + misc per person
  const people = adults + children
  const health = model.healthPerPerson * people
  const misc = model.miscPerPerson * people

  const essentialLines: EssentialLine[] = [
    {
      key: 'vivienda',
      label: inputs.housing === 'alquila' ? 'Alquiler' : 'Vivienda (sin alquiler)',
      amount: r100(rent),
    },
    { key: 'alimentacion', label: 'Alimentación', amount: r100(food) },
    { key: 'servicios', label: 'Servicios (luz, agua, internet)', amount: r100(utilities) },
    { key: 'transporte', label: 'Transporte', amount: r100(transport) },
    { key: 'salud', label: 'Salud (copagos)', amount: r100(health) },
    { key: 'varios', label: 'Higiene, limpieza y varios', amount: r100(misc) },
  ]
  const essentials = essentialLines.reduce((s, l) => s + l.amount, 0)

  const ratio = essentials > 0 ? income / essentials : income > 0 ? Infinity : 0
  const verdict: VerdictTier =
    income < essentials
      ? 'noAlcanza'
      : ratio < 1.15
        ? 'ajustado'
        : ratio < 1.4
          ? 'justo'
          : ratio < 1.8
            ? 'comodo'
            : 'holgado'

  const deficit = Math.max(0, essentials - income)
  // Suggest savings only from the surplus, up to the aspirational rate.
  const surplus = Math.max(0, income - essentials)
  const savingsSuggested = r100(Math.min(surplus, income * model.savingsRate))
  const discretionary = income - essentials - savingsSuggested

  return {
    adults,
    children,
    dwelling,
    essentialLines,
    essentials,
    income,
    savingsSuggested,
    discretionary,
    ratio,
    verdict,
    deficit,
  }
}

export const VERDICT_META: Readonly<
  Record<VerdictTier, { label: string; color: string; emoji: string; message: string }>
> = Object.freeze({
  noAlcanza: {
    label: 'No alcanza',
    color: 'error',
    emoji: '🚫',
    message:
      'Con este ingreso, este escenario no es viable: los gastos esenciales superan lo que entra. No es un fracaso personal, es matemática. Mirá las alternativas de abajo antes de decidir.',
  },
  ajustado: {
    label: 'Muy ajustado',
    color: 'warning',
    emoji: '⚠️',
    message:
      'Alcanza justo para lo esencial, pero casi no queda margen para ahorrar ni para imprevistos. Un gasto inesperado (una muela, el termofón) te complica el mes.',
  },
  justo: {
    label: 'Justo',
    color: 'amber',
    emoji: '➗',
    message:
      'Cubrís lo esencial y te queda algo para ahorro y gustos, pero sin lujos. Cuidar los "gastos hormiga" hace la diferencia.',
  },
  comodo: {
    label: 'Cómodo',
    color: 'info',
    emoji: '👍',
    message:
      'Buen equilibrio: cubrís lo esencial, podés ahorrar de forma sostenida y darte gustos. Buen momento para automatizar el ahorro e invertir una parte.',
  },
  holgado: {
    label: 'Holgado',
    color: 'success',
    emoji: '🎉',
    message:
      'Tenés margen de sobra. Enfocate en ahorrar e invertir en serio (contra la inflación) y en objetivos de largo plazo; el consumo puede crecer sin descontrolar el ahorro.',
  },
})

/** Situation-specific, verdict-aware reality-check tips. */
export function realityChecks(result: BudgetResult, inputs: BudgetInputs): string[] {
  const tips: string[] = []
  const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-UY')

  if (result.verdict === 'noAlcanza') {
    tips.push(`Faltan ${fmt(result.deficit)} por mes para cubrir lo esencial en este escenario.`)
    if (inputs.situation === 'solo' && inputs.housing === 'alquila') {
      tips.push(
        'Vivir solo alquilando es lo más caro. Compartir apartamento baja el gasto de vivienda a menos de la mitad.'
      )
    }
    if (inputs.city === 'montevideo') {
      tips.push('El interior o un barrio más alejado del centro pueden bajar bastante el alquiler.')
    }
    tips.push(
      'Sumar ingresos extra o postergar la mudanza hasta tener un colchón suele ser más sano que empezar endeudado.'
    )
  } else if (result.verdict === 'ajustado') {
    tips.push(
      'Armá un fondo de emergencia aunque sea de a poco: es lo que te salva de la deuda cuando aparece un imprevisto.'
    )
    tips.push(
      'Antes de comprometerte a un alquiler, sumá la garantía y el depósito (suelen ser 1-2 meses cada uno).'
    )
  } else {
    if (result.savingsSuggested > 0) {
      tips.push(
        `Con tu ingreso, apuntar a ahorrar ~${fmt(result.savingsSuggested)}/mes es realista. Automatizalo apenas cobrás.`
      )
    }
    tips.push(
      'Protegé el ahorro de la inflación: una parte en UI o dólares mantiene el poder de compra.'
    )
  }
  if (inputs.housing === 'alquila') {
    tips.push(
      'Como regla, que el alquiler no supere ~30% de tu ingreso; por encima de eso, el resto del presupuesto sufre.'
    )
  }
  return tips
}

export const SITUATION_LABELS: Readonly<Record<Situation, string>> = Object.freeze({
  solo: 'Vivir solo/a',
  compartido: 'Compartir (con roommates)',
  pareja: 'En pareja',
  familia: 'En familia (con hijos)',
})

export const CITY_LABELS: Readonly<Record<City, string>> = Object.freeze({
  montevideo: 'Montevideo',
  interior: 'Interior',
})
