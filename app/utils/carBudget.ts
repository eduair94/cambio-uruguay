// app/utils/carBudget.ts
// /autos-usados-uruguay/hasta-<monto>-dolares: qué auto usado se compra GASTANDO un presupuesto.
// Los topes son los del informe del mercado (classes/autos/report.ts, `BUDGETS`): la página no
// calcula nada, publica el tramo que el informe ya dejó en `carreportsnapshots`. El app no importa
// del backend (paquetes separados), así que la lista se copia y un test de paridad la vigila.
// Puro (sin Vue ni I/O) para que cada regla de copy se pruebe en vitest.
import { CARS_PATH, formatCarKm, formatCarUsd } from './cars'
import type { PublicCarListing } from './carsPublic'
import type { FaqItem } from './faqAnswers'

export const CAR_BUDGETS = [6000, 10000, 15000, 20000, 30000] as const
export type CarBudget = (typeof CAR_BUDGETS)[number]
/** Con menos modelos que esto la página existe pero va `noindex`: no contesta "qué comprar". */
export const CAR_BUDGET_MIN_MODELS = 3

/** Presupuesto del `<title>` medido CON la marca, como `tests/unit/seoTitleBudget.test.ts`. */
const MAX_TITLE = 60
const MAX_DESCRIPTION = 155
const withBrand = (title: string) =>
  /cambio uruguay/i.test(title) ? title : `${title} | Cambio Uruguay`

export interface CarBudgetModelRow {
  marketSlug: string
  brand: string
  model: string
  adverts: number
  medianUsd: number
  medianYear: number
  medianKm: number | null
  /** Si el modelo tiene página de precios indexable (mismo criterio que el sitemap). */
  hasPage: boolean
}

export interface CarBudgetResponse {
  budget: CarBudget
  /** Avisos de la franja 80–100 % del tope (no todos los que cuestan menos). */
  adverts: number
  models: CarBudgetModelRow[]
  listings: PublicCarListing[]
  generatedAt: string | null
  indexable: boolean
  others: CarBudget[]
}

/** '6000' → 6000. Sólo los topes del informe, escritos sin ceros adelante ni decimales. */
export function parseCarBudget(raw: unknown): CarBudget | null {
  if (typeof raw !== 'string' || !/^[1-9]\d{3,5}$/.test(raw)) return null
  const value = Number(raw)
  return (CAR_BUDGETS as readonly number[]).includes(value) ? (value as CarBudget) : null
}

export const carBudgetPath = (budget: CarBudget): string => `${CARS_PATH}/hasta-${budget}-dolares`

/** 'US$ 6.000': el agrupado es manual (es-UY no agrupa números de cuatro cifras en todo motor). */
export const formatUsd = (value: number): string => formatCarUsd(value)

export const carBudgetModelName = (row: Pick<CarBudgetModelRow, 'brand' | 'model'>): string =>
  `${row.brand} ${row.model}`

const count = (value: number): string => value.toLocaleString('es-UY')

export function carBudgetTitle(budget: CarBudget): string {
  const variants = [
    `Autos usados hasta ${formatUsd(budget)} en Uruguay`,
    `Autos usados hasta ${formatUsd(budget)}`,
  ]
  return (
    variants.find(title => withBrand(title).length <= MAX_TITLE) ?? variants[variants.length - 1]!
  )
}

/** Los modelos con más avisos primero; el informe ya los trae así, pero no se depende de eso. */
const byAdverts = (models: readonly CarBudgetModelRow[]): CarBudgetModelRow[] =>
  [...models].sort((a, b) => b.adverts - a.adverts || a.medianUsd - b.medianUsd)

/** "Chevrolet Corsa, Chevrolet Spark y Volkswagen Gol". */
function list(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

export function carBudgetDescription(r: CarBudgetResponse): string {
  const usd = formatUsd(r.budget)
  const top = byAdverts(r.models)
  // El dato adelante y los modelos de a uno: se sacan del final hasta que entre en el SERP.
  for (let n = Math.min(top.length, 4); n >= 1; n--) {
    const names = list(top.slice(0, n).map(row => `${carBudgetModelName(row)} ${row.medianYear}`))
    const text = `Qué auto usado se compra con ${usd} en Uruguay: ${names}, según ${count(r.adverts)} avisos vigentes.`
    if (text.length <= MAX_DESCRIPTION) return text
  }
  return `Qué auto usado se compra con ${usd} en Uruguay: modelos y años que paga ese presupuesto, sobre ${count(r.adverts)} avisos vigentes.`
}

/** El rango de años que paga el tramo, entre los modelos publicados; `null` sin modelos. */
function yearRange(r: CarBudgetResponse): { from: number; to: number } | null {
  const years = r.models.map(row => row.medianYear)
  return years.length ? { from: Math.min(...years), to: Math.max(...years) } : null
}

export function carBudgetIntro(r: CarBudgetResponse): string {
  const usd = formatUsd(r.budget)
  const years = yearRange(r)
  const head = `${count(r.adverts)} avisos de autos usados piden hoy entre ${formatUsd(r.budget * 0.8)} y ${usd}.`
  if (!years) return head
  const span =
    years.from === years.to ? `del ${years.from}` : `de entre ${years.from} y ${years.to}`
  return `${head} En los modelos con más avisos de esa franja, ese dinero paga autos ${span}, según el modelo.`
}

export function carBudgetFaq(r: CarBudgetResponse): FaqItem[] {
  const usd = formatUsd(r.budget)
  const top = byAdverts(r.models).slice(0, 5)
  const years = yearRange(r)

  const which = top.length
    ? `Los modelos con más avisos entre ${formatUsd(r.budget * 0.8)} y ${usd} son ${list(
        top.map(
          row =>
            `${carBudgetModelName(row)} (mediana ${formatUsd(row.medianUsd)}, año ${row.medianYear}, ${formatCarKm(row.medianKm)})`
        )
      )}. Son precios pedidos en avisos vigentes, no una tasación.`
    : `Hoy no hay ningún modelo con 8 avisos o más entre ${formatUsd(r.budget * 0.8)} y ${usd}, así que no hay una respuesta firme: mirá los avisos vigentes en el directorio.`

  const year = !years
    ? `No hay suficientes avisos por modelo en esta franja para decir qué año paga ${usd}.`
    : years.from === years.to
      ? `En los modelos con más avisos de la franja, ${usd} paga un auto del ${years.from} (mediana del año de cada modelo).`
      : `Depende del modelo: en los que tienen más avisos de la franja, ${usd} paga autos de entre ${years.from} y ${years.to} (mediana del año de cada modelo). Un modelo más caro de origen llega a un año más viejo.`

  return [
    { id: 'presupuesto-que-auto', question: `¿Qué auto usado comprar con ${usd}?`, answer: which },
    {
      id: 'presupuesto-cuantos',
      question: `¿Cuántos autos usados hay hasta ${usd}?`,
      answer: `Hay ${count(r.adverts)} avisos vigentes que piden entre ${formatUsd(r.budget * 0.8)} y ${usd}, la franja cercana al tope. Los avisos más baratos no se cuentan acá: son lo que se compra con un presupuesto menor.`,
    },
    {
      id: 'presupuesto-anio',
      question: `¿De qué año es un auto usado de ${usd}?`,
      answer: year,
    },
  ]
}
