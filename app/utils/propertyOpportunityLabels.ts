import type { OpportunityItem, OpportunitySignal } from './propertyOpportunities'
import {
  opportunityDate,
  opportunityMoney,
  opportunityNumber,
  opportunityPrimaryMetric,
  opportunitySignals,
  opportunitySourceLabels,
} from './propertyOpportunityPresentation'

export interface PropertyOpportunityLabel {
  id: OpportunitySignal | 'exploratory' | 'expenses_known'
  label: string
  /** Render as visible, accessible text in the existing comparison details, not only on hover. */
  explanation: string
  tone: 'value' | 'neutral' | 'caution'
}

export interface PropertyOpportunityLabelOptions {
  locale?: string
  selectedSignal?: 'all' | OpportunitySignal
  stale?: boolean
}

const messages = {
  es: {
    monthly: 'Menor costo mensual',
    sale: 'Menor precio',
    area: 'Menor precio por m²',
    exploratory: 'Comparación exploratoria',
    expenses: 'Alquiler + GC informados',
    built: 'superficie construida',
    total: 'superficie total',
    monthlyBasis: 'Se compara alquiler más gastos comunes',
    saleBasis: 'Se compara el precio de venta publicado',
    reference: 'Referencia',
    sources: 'Fuentes de los comparables',
    read: 'Lecturas de los comparables',
    below: (gap: string, n: string, sellers: string) =>
      `${gap}% por debajo de la mediana de ${n} anuncios de ${sellers} anunciantes`,
    asking: 'Son precios publicados; no una tasación ni un ahorro garantizado.',
    limits:
      'La comparación tiene limitaciones de muestra o características. Revisá las diferencias y los anuncios originales.',
    costs: (rent: string, expenses: string) =>
      `Alquiler: ${rent}. Gastos comunes publicados: ${expenses}. No incluye servicios, garantía ni otros gastos.`,
  },
  en: {
    monthly: 'Lower monthly cost',
    sale: 'Lower asking price',
    area: 'Lower price per m²',
    exploratory: 'Exploratory comparison',
    expenses: 'Rent + common expenses stated',
    built: 'built area',
    total: 'total area',
    monthlyBasis: 'The comparison uses rent plus common expenses',
    saleBasis: 'The comparison uses the asking sale price',
    reference: 'Reference',
    sources: 'Comparable sources',
    read: 'Comparable readings',
    below: (gap: string, n: string, sellers: string) =>
      `${gap}% below the median of ${n} listings from ${sellers} advertisers`,
    asking: 'These are asking prices, not an appraisal or a guaranteed saving.',
    limits:
      'This comparison has sample or property-feature limitations. Review the differences and original listings.',
    costs: (rent: string, expenses: string) =>
      `Rent: ${rent}. Published common expenses: ${expenses}. Utilities, rental guarantees and other costs are not included.`,
  },
  pt: {
    monthly: 'Menor custo mensal',
    sale: 'Menor preço anunciado',
    area: 'Menor preço por m²',
    exploratory: 'Comparação exploratória',
    expenses: 'Aluguel + condomínio informados',
    built: 'área construída',
    total: 'área total',
    monthlyBasis: 'A comparação considera aluguel mais condomínio',
    saleBasis: 'A comparação considera o preço de venda anunciado',
    reference: 'Referência',
    sources: 'Fontes dos comparáveis',
    read: 'Leituras dos comparáveis',
    below: (gap: string, n: string, sellers: string) =>
      `${gap}% abaixo da mediana de ${n} anúncios de ${sellers} anunciantes`,
    asking: 'São preços anunciados; não uma avaliação nem uma economia garantida.',
    limits:
      'A comparação tem limitações de amostra ou características. Confira as diferenças e os anúncios originais.',
    costs: (rent: string, expenses: string) =>
      `Aluguel: ${rent}. Condomínio anunciado: ${expenses}. Não inclui serviços, garantia de aluguel ou outros gastos.`,
  },
}

const positive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
const currency = (value: unknown) => value === 'UYU' || value === 'USD'

/**
 * Presentation of already-qualified server signals only. Does not create opportunities,
 * recalculate cohorts, infer demand/exclusivity, or interpret a lower reference as a price cut.
 */
export function propertyOpportunityLabels(
  item: OpportunityItem,
  options: PropertyOpportunityLabelOptions = {}
): { primary: PropertyOpportunityLabel | null; secondary: PropertyOpportunityLabel[] } {
  const empty = { primary: null, secondary: [] }
  if (options.stale) return empty
  const { analysis, subject } = item
  const rent = subject.operation === 'rent'
  const locale = options.locale === 'en' || options.locale === 'pt' ? options.locale : 'es'
  const t = messages[locale]
  const expensesKnown =
    subject.expenses !== null &&
    typeof subject.expenses?.amount === 'number' &&
    Number.isFinite(subject.expenses.amount) &&
    subject.expenses.amount >= 0 &&
    currency(subject.expenses.currency)
  // Fail closed on malformed presentation data; valid server snapshots keep their original rules.
  if (
    !['rent', 'sale'].includes(subject.operation) ||
    analysis.pricingBasis !== (rent ? 'monthly_total' : 'asking_price') ||
    analysis.currency !== (rent ? 'UYU' : 'USD') ||
    !positive(subject.price.amount) ||
    !currency(subject.price.currency) ||
    !positive(subject.comparisonPrice) ||
    (rent && !expensesKnown) ||
    !positive(subject.area.value) ||
    !['built', 'total'].includes(subject.area.basis) ||
    subject.area.basis !== analysis.areaBasis ||
    !Number.isInteger(analysis.distinctN) ||
    analysis.distinctN < 1 ||
    !Number.isInteger(analysis.sellersN) ||
    analysis.sellersN < 1 ||
    analysis.sellersN > analysis.distinctN
  )
    return empty

  const signals = [...new Set(opportunitySignals(item))].filter(
    signal => signal === 'total_price' || signal === 'price_per_m2'
  )
  const ordered = [options.selectedSignal, 'total_price', 'price_per_m2'].filter(
    (signal, index, all): signal is OpportunitySignal =>
      (signal === 'total_price' || signal === 'price_per_m2') &&
      signals.includes(signal) &&
      all.indexOf(signal) === index
  )
  const sourceNames = [...new Set(analysis.sources)]
    .filter(source => Object.hasOwn(opportunitySourceLabels, source))
    .map(source => opportunitySourceLabels[source])
    .join(', ')
  const readings = [analysis.oldestLastSeen, analysis.newestLastSeen]
    .map(value => opportunityDate(value, locale))
    .filter((value, index, all) => value && all.indexOf(value) === index)
    .join(' – ')
  const valueLabels: PropertyOpportunityLabel[] = []
  for (const signal of ordered) {
    const metric = opportunityPrimaryMetric(item, signal)
    if (
      !metric ||
      !positive(metric.value) ||
      !positive(metric.median) ||
      !positive(metric.gapPct) ||
      metric.gapPct >= 100 ||
      metric.value >= metric.median
    )
      continue
    const perArea = signal === 'price_per_m2'
    const basis = perArea ? `; ${subject.area.basis === 'built' ? t.built : t.total}` : ''
    const reference = perArea
      ? `${analysis.currency} ${opportunityNumber(metric.median, locale, 2)}`
      : opportunityMoney({ amount: metric.median, currency: analysis.currency }, locale)
    valueLabels.push({
      id: signal,
      label: perArea ? t.area : rent ? t.monthly : t.sale,
      tone: 'value',
      explanation: [
        `${t.below(opportunityNumber(metric.gapPct, locale, 1), opportunityNumber(analysis.distinctN, locale), opportunityNumber(analysis.sellersN, locale))}.`,
        `${t.reference}: ${reference}${perArea ? '/m²' : ''}${basis}.`,
        `${rent ? t.monthlyBasis : t.saleBasis}.`,
        ...(sourceNames ? [`${t.sources}: ${sourceNames}.`] : []),
        ...(readings ? [`${t.read}: ${readings}.`] : []),
        t.asking,
      ].join(' '),
    })
  }
  const primary = valueLabels.shift() ?? null
  if (!primary) return empty
  const secondary: PropertyOpportunityLabel[] = []
  if (analysis.evidenceTier === 'exploratory')
    secondary.push({
      id: 'exploratory',
      label: t.exploratory,
      explanation: t.limits,
      tone: 'caution',
    })
  secondary.push(...valueLabels)
  if (rent && expensesKnown)
    secondary.push({
      id: 'expenses_known',
      label: t.expenses,
      explanation: t.costs(
        opportunityMoney(subject.price, locale),
        opportunityMoney(subject.expenses!, locale)
      ),
      tone: 'neutral',
    })
  return { primary, secondary: secondary.slice(0, 2) }
}
