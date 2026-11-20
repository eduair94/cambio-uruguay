// app/utils/carOpportunitySummary.ts
// El resumen de TODA la lista de /oportunidades-autos-usados-uruguay, no sólo de la página que se ve.
//
// El HTML canónico traía las 20 tarjetas de la página 1 (todas de comparación sólida) y el total:
// quien leía la URL indexada —un buscador o un asistente de IA— no podía decir cuántas oportunidades
// entran en un presupuesto ni qué modelos tienen alguna, porque las páginas 2 en adelante y cada
// filtro van `noindex` con canonical a la base. Este módulo resume la lista entera a partir del
// mismo snapshot que publica /api/car-opportunities: no agrega ninguna fuente, cuenta lo que ya hay.
//
// Puro (sin Vue ni I/O) y car-prefijado: app/utils es UN espacio de auto-imports.
import { CAR_BUDGETS, type CarBudget } from './carBudget'
import {
  CAR_OPPORTUNITY_FRESH_DAYS,
  carPercent,
  formatCarDate,
  formatCarKm,
  formatCarUsd,
  type CarOpportunitiesResponse,
} from './cars'
import type {
  PublicCarOpportunityItem,
  PublicCarOpportunityPolicy,
  PublicCarOpportunitySnapshot,
  PublicCarOpportunityStats,
  PublicCarTier,
} from './carsPublic'
import type { FaqItem } from './faqAnswers'

/** Cuántos modelos lista la tabla "Modelos con más oportunidades". */
export const CAR_OPPORTUNITY_TOP_MODELS = 12

export interface CarOpportunityBudgetRow {
  budget: CarBudget
  /** Oportunidades que piden hasta `budget` (acumulado: la de US$ 6.000 entra también en 10.000). */
  count: number
  strict: number
  medianGap: number
}

export interface CarOpportunityModelRow {
  marketSlug: string
  brand: string
  model: string
  count: number
  strict: number
  minUsd: number
  maxUsd: number
  yearFrom: number
  yearTo: number
  medianGap: number
}

export interface CarOpportunityCheapest {
  /** `subject.key` del aviso; se llama `id` para no cruzarse con el escáner de secretos. */
  id: string
  title: string
  year: number
  km: number | null
  priceUsd: number
  gap: number
  tier: PublicCarTier
  /** Mediana de sus comparables y cuántos son. */
  median: number
  n: number
}

export interface CarOpportunitySummary {
  total: number
  strict: number
  exploratory: number
  medianGap: number | null
  maxGap: number | null
  minUsd: number | null
  medianUsd: number | null
  maxUsd: number | null
  budgets: CarOpportunityBudgetRow[]
  models: CarOpportunityModelRow[]
  /** Modelos distintos en toda la lista. */
  modelCount: number
  /** Los modelos que no entraron en `models`: cuántos son y el máximo de oportunidades de uno. */
  otherModels: { count: number; maxEach: number } | null
  cheapest: CarOpportunityCheapest | null
}

/** La respuesta de /api/car-opportunities; `summary` es opcional porque el borde cachea 60 s. */
export type CarOpportunitiesWithSummary = CarOpportunitiesResponse & {
  summary?: CarOpportunitySummary
}

/** Los avisos que la API todavía publica: el mismo corte que `queryCarOpportunities`. */
export function carOpportunityFreshItems(
  snapshot: Pick<PublicCarOpportunitySnapshot, 'items'>,
  now = new Date()
): PublicCarOpportunityItem[] {
  const cutoff = now.getTime() - CAR_OPPORTUNITY_FRESH_DAYS * 86_400_000
  return snapshot.items.filter(entry => Date.parse(entry.subject.lastSeen) >= cutoff)
}

/** El del medio de los valores ordenados; con una cantidad par, el promedio de los dos del medio. */
function median(values: readonly number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

const gapOf = (value: number | null): number | null =>
  value === null ? null : Math.round(value * 1000) / 1000
const usdOf = (value: number | null): number | null => (value === null ? null : Math.round(value))
const strictCount = (items: readonly PublicCarOpportunityItem[]): number =>
  items.filter(entry => entry.tier === 'strict').length

export function carOpportunitySummary(
  items: readonly PublicCarOpportunityItem[]
): CarOpportunitySummary {
  const prices = items.map(entry => entry.subject.priceUsd)
  const gaps = items.map(entry => entry.gap)

  const budgets: CarOpportunityBudgetRow[] = []
  for (const budget of CAR_BUDGETS) {
    // La misma comparación que el filtro de precio (`carSubjectMatches`): hasta el tope inclusive.
    const within = items.filter(entry => entry.subject.priceUsd <= budget)
    if (!within.length) continue
    budgets.push({
      budget,
      count: within.length,
      strict: strictCount(within),
      medianGap: gapOf(median(within.map(entry => entry.gap)))!,
    })
  }

  const groups = new Map<string, PublicCarOpportunityItem[]>()
  for (const entry of items) {
    const group = groups.get(entry.subject.marketSlug) ?? []
    group.push(entry)
    groups.set(entry.subject.marketSlug, group)
  }
  const allModels: CarOpportunityModelRow[] = [...groups.entries()]
    .map(([marketSlug, group]) => {
      const groupPrices = group.map(entry => entry.subject.priceUsd)
      const years = group.map(entry => entry.subject.year)
      return {
        marketSlug,
        brand: group[0]!.subject.brand,
        model: group[0]!.subject.model,
        count: group.length,
        strict: strictCount(group),
        minUsd: Math.round(Math.min(...groupPrices)),
        maxUsd: Math.round(Math.max(...groupPrices)),
        yearFrom: Math.min(...years),
        yearTo: Math.max(...years),
        medianGap: gapOf(median(group.map(entry => entry.gap)))!,
      }
    })
    .sort(
      (a, b) => b.count - a.count || a.minUsd - b.minUsd || a.marketSlug.localeCompare(b.marketSlug)
    )
  const models = allModels.slice(0, CAR_OPPORTUNITY_TOP_MODELS)
  const rest = allModels.slice(CAR_OPPORTUNITY_TOP_MODELS)

  const cheapestItem = [...items].sort(
    (a, b) =>
      a.subject.priceUsd - b.subject.priceUsd ||
      b.gap - a.gap ||
      a.subject.key.localeCompare(b.subject.key)
  )[0]

  return {
    total: items.length,
    strict: strictCount(items),
    exploratory: items.filter(entry => entry.tier === 'exploratory').length,
    medianGap: gapOf(median(gaps)),
    maxGap: gaps.length ? gapOf(Math.max(...gaps)) : null,
    minUsd: prices.length ? Math.round(Math.min(...prices)) : null,
    medianUsd: usdOf(median(prices)),
    maxUsd: prices.length ? Math.round(Math.max(...prices)) : null,
    budgets,
    models,
    modelCount: allModels.length,
    otherModels: rest.length
      ? { count: rest.length, maxEach: Math.max(...rest.map(row => row.count)) }
      : null,
    cheapest: cheapestItem
      ? {
          id: cheapestItem.subject.key,
          title: cheapestItem.subject.title,
          year: cheapestItem.subject.year,
          km: cheapestItem.subject.km,
          priceUsd: Math.round(cheapestItem.subject.priceUsd),
          gap: cheapestItem.gap,
          tier: cheapestItem.tier,
          median: cheapestItem.sample.median,
          n: cheapestItem.sample.n,
        }
      : null,
  }
}

export interface CarOpportunityLeadModel {
  marketSlug: string
  name: string
  count: number
  /** Lo que va después del paréntesis: ", ", " y " o el punto final, con su espacio. */
  trail: string
}

/**
 * Hasta tres modelos para la primera frase de la página, sólo los que aparecen más de una vez:
 * "Peugeot 208 (13), Chevrolet Onix (9) y Fiat Uno (7)." El espacio va DENTRO de `trail`: en la
 * plantilla, el blanco antes de `</template>` es el último hijo y Vue lo descarta al compilar
 * (whitespace "condense"), así que un separador sin espacio propio pegaba los nombres.
 */
export function carOpportunityLeadModels(
  models: readonly CarOpportunityModelRow[]
): CarOpportunityLeadModel[] {
  const rows = models.filter(row => row.count > 1).slice(0, 3)
  return rows.map((row, index) => ({
    marketSlug: row.marketSlug,
    name: `${row.brand} ${row.model}`,
    count: row.count,
    trail: index === rows.length - 1 ? '.' : index === rows.length - 2 ? ' y ' : ', ',
  }))
}

/** "US$ 6.500 – US$ 8.900", o un solo monto si el mínimo y el máximo coinciden. */
export const formatCarUsdSpan = (min: number, max: number): string =>
  min === max ? formatCarUsd(min) : `${formatCarUsd(min)} – ${formatCarUsd(max)}`

/** "2014–2019", o un solo año. */
export const formatCarYearSpan = (from: number, to: number): string =>
  from === to ? String(from) : `${from}–${to}`

/**
 * "27.550". El agrupado es manual, como en `formatCarUsd`: con `toLocaleString('es-UY')` un motor
 * escribe "2254" y otro "2.254", y estas cifras se dibujan en el servidor y otra vez al hidratar.
 */
export const formatCarCount = (value: number): string =>
  Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const count = formatCarCount
const tierLabel = (tier: PublicCarTier): string => (tier === 'strict' ? 'sólida' : 'exploratoria')

/** "a, b y c". */
function joinList(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`
}

/**
 * Las preguntas de la página, con las cifras del cálculo publicado. Vacío si la lista está vacía:
 * una pregunta que contesta "0" en cada cifra no le sirve a nadie.
 */
export function carOpportunityFaq(
  summary: CarOpportunitySummary,
  policy: PublicCarOpportunityPolicy,
  stats: Pick<PublicCarOpportunityStats, 'input' | 'analyzed'>,
  generatedAt: string
): FaqItem[] {
  if (!summary.total) return []
  const date = formatCarDate(generatedAt)
  const faq: FaqItem[] = []

  const cheapest = summary.cheapest
  if (cheapest) {
    faq.push({
      id: 'oportunidades-autos-mas-barato',
      question: '¿Cuál es el auto usado más barato de la lista?',
      answer: `Un ${cheapest.title} ${cheapest.year} con ${formatCarKm(cheapest.km)} a ${formatCarUsd(cheapest.priceUsd)}: ${carPercent(cheapest.gap)} menos que la mediana (${formatCarUsd(cheapest.median)}) de ${count(cheapest.n)} avisos iguales, con comparación ${tierLabel(cheapest.tier)}. Cálculo del ${date}.`,
    })
  }

  faq.push({
    id: 'oportunidades-autos-cuantas',
    question: '¿Cuántos autos usados piden hoy menos que otros iguales?',
    answer: `${count(summary.total)}: ${count(summary.strict)} con comparación sólida y ${count(summary.exploratory)} con comparación exploratoria, sobre ${count(stats.input)} avisos leídos, de los que ${count(stats.analyzed)} tenían suficientes comparables. Cálculo del ${date}.`,
  })

  // Un tope que no suma ninguna oportunidad sobre el anterior no dice nada nuevo ("4 hasta 15.000 y
  // 4 hasta 20.000"); el último, el que ya las tiene a todas, lo dice la frase de la más cara.
  const partial = summary.budgets.filter(
    (row, index, rows) => row.count < summary.total && row.count !== rows[index - 1]?.count
  )
  if (partial.length && summary.maxUsd !== null && summary.medianUsd !== null) {
    const parts = partial.map(
      (row, index) =>
        `${count(row.count)}${index === 0 ? (row.count === 1 ? ' pide' : ' piden') : ''} hasta ${formatCarUsd(row.budget)}`
    )
    faq.push({
      id: 'oportunidades-autos-por-presupuesto',
      question: '¿Cuántas oportunidades hay según el presupuesto?',
      answer: `${joinList(parts)}. La más cara de la lista pide ${formatCarUsd(summary.maxUsd)} y la mediana es ${formatCarUsd(summary.medianUsd)}.`,
    })
  }

  if (summary.medianGap !== null && summary.maxGap !== null) {
    faq.push({
      id: 'oportunidades-autos-cuanto-menos',
      question: '¿Cuánto menos piden que los autos iguales?',
      answer: `La diferencia mediana es de ${carPercent(summary.medianGap)} y la mayor de la lista del ${date}, de ${carPercent(summary.maxGap)}. Entran a la lista desde ${carPercent(policy.exploratory.minimumGap)} con comparación exploratoria y desde ${carPercent(policy.strict.minimumGap)} con comparación sólida; una diferencia de más de ${carPercent(policy.maximumGap)} no se publica, porque casi siempre esconde un error o un problema.`,
    })
  }

  // Cada condición sale de `policy` (la misma que aplica `tierFor` en classes/autos/analyze.ts): una
  // lista incompleta se lee como suficiente, y esta respuesta viaja tal cual en el FAQPage.
  const { strict, exploratory } = policy
  const quartile = (minimum: number): string =>
    minimum > 0
      ? `${carPercent(minimum)} o más por debajo del precio que separa al cuarto más barato de la muestra`
      : 'no más caro que el precio que separa al cuarto más barato de la muestra'
  const spread =
    strict.maximumSpread === exploratory.maximumSpread
      ? `En las dos, la mitad central de los precios de la muestra no puede abarcar más de ${carPercent(strict.maximumSpread)} de la mediana`
      : `La mitad central de los precios de la muestra no puede abarcar más de ${carPercent(strict.maximumSpread)} de la mediana en la sólida ni de ${carPercent(exploratory.maximumSpread)} en la exploratoria`
  faq.push({
    id: 'oportunidades-autos-solida-exploratoria',
    question: '¿Qué diferencia hay entre comparación sólida y exploratoria?',
    answer: `La sólida exige ${strict.minimumComparables} avisos iguales o más de al menos ${strict.minimumSellers} vendedores distintos, un precio ${carPercent(strict.minimumGap)} o más por debajo de la mediana y ${quartile(strict.minimumConservativeGap)}, y que la diferencia siga en ${carPercent(strict.minimumSellerSensitivityGap)} o más aunque se saque de la muestra a cualquier vendedor. La exploratoria pide desde ${exploratory.minimumComparables} avisos de al menos ${exploratory.minimumSellers} vendedores, un precio ${carPercent(exploratory.minimumGap)} o más por debajo de la mediana y ${quartile(exploratory.minimumConservativeGap)}, y que la diferencia siga en ${carPercent(exploratory.minimumSellerSensitivityGap)} o más sin cualquier vendedor. ${spread}, y el auto no puede estar entre el cuarto con más kilómetros de sus comparables. Iguales quiere decir mismo modelo, año, versión, motor y caja, con kilómetros dentro de ${formatCarKm(policy.kmToleranceMin)} o ${carPercent(policy.kmToleranceRatio)}, lo que sea mayor.`,
  })

  faq.push({
    id: 'oportunidades-autos-por-que',
    question: '¿Por qué un auto pide menos que otros iguales?',
    answer:
      'El aviso no lo dice. De la lista se sacan los avisos que mencionan choque, deuda, recupero de seguro, matrículas entregadas o chapa extranjera, pero un aviso que no declara nada puede tener algo igual: pedí el Certificado SUCIVE, revisá el título y hacé revisar el auto antes de señar.',
  })

  faq.push({
    id: 'oportunidades-autos-actualizacion',
    question: '¿Cada cuánto cambia la lista?',
    // Cada hora: currency-autos-hourly reescribe el snapshot (generatedAt 01:39, 02:39 y 03:39 UTC
    // del 20/11/2026 en /api/car-opportunities).
    answer: `Se recalcula cada hora; el cálculo publicado es del ${date}. Un aviso que no volvimos a ver en ${policy.freshDays} ${policy.freshDays === 1 ? 'día' : 'días'} sale de la lista, y cada oportunidad dice qué día se revisó su ficha.`,
  })

  return faq
}
