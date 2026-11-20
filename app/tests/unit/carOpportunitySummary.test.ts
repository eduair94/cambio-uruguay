import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'
import {
  CAR_OPPORTUNITY_TOP_MODELS,
  carOpportunityFaq,
  carOpportunityFreshItems,
  carOpportunityLeadModels,
  carOpportunitySummary,
  formatCarCount,
  formatCarUsdSpan,
  formatCarYearSpan,
} from '../../utils/carOpportunitySummary'
import { queryCarOpportunities } from '../../utils/cars'
import type {
  PublicCarListing,
  PublicCarOpportunityItem,
  PublicCarOpportunityPolicy,
  PublicCarOpportunitySnapshot,
} from '../../utils/carsPublic'

const NOW = new Date('2026-11-20T03:00:00.000Z')

/** Un aviso de la lista; el identificador entra como argumento, nunca como literal con dígitos. */
function item(
  id: string,
  overrides: Partial<PublicCarListing> = {},
  tier: 'strict' | 'exploratory' = 'strict',
  gap = 0.2,
  sample: { median?: number; n?: number } = {}
): PublicCarOpportunityItem {
  return {
    subject: {
      key: id,
      brand: 'Peugeot',
      brandSlug: 'peugeot',
      model: '208',
      modelSlug: '208',
      marketSlug: 'peugeot-208',
      title: 'Peugeot 208',
      year: 2017,
      km: 100000,
      price: 9000,
      currency: 'USD',
      priceUsd: 9000,
      priceConverted: false,
      lastSeen: NOW.toISOString(),
      firstSeen: NOW.toISOString(),
      ...overrides,
    } as PublicCarListing,
    tier,
    gap,
    conservativeGap: 0.1,
    sellerSensitivityGap: 0.12,
    sample: {
      n: sample.n ?? 10,
      sellers: 8,
      dealers: 3,
      privates: 5,
      p25: 10000,
      median: sample.median ?? 11000,
      p75: 12000,
      spread: 0.1,
      kmMedian: 100000,
      kmP75: 120000,
    },
    comparables: [],
    detailReadAt: NOW.toISOString(),
  }
}

const policy: PublicCarOpportunityPolicy = {
  freshDays: 2,
  kmToleranceRatio: 0.3,
  kmToleranceMin: 20000,
  maximumPerSeller: 2,
  maximumGap: 0.45,
  strict: {
    minimumComparables: 8,
    minimumSellers: 4,
    maximumSpread: 0.3,
    minimumGap: 0.15,
    minimumConservativeGap: 0.05,
    minimumSellerSensitivityGap: 0.1,
  },
  exploratory: {
    minimumComparables: 5,
    minimumSellers: 3,
    maximumSpread: 0.3,
    minimumGap: 0.12,
    minimumConservativeGap: 0,
    minimumSellerSensitivityGap: 0.08,
  },
}
const stats = { input: 27550, analyzed: 2254 }

const id = (n: number) => `ml-MLU${n}`
const onix = {
  brand: 'Chevrolet',
  brandSlug: 'chevrolet',
  model: 'Onix',
  marketSlug: 'chevrolet-onix',
}
const uno = { brand: 'Fiat', brandSlug: 'fiat', model: 'Uno', marketSlug: 'fiat-uno' }

const items: PublicCarOpportunityItem[] = [
  item(id(1), { priceUsd: 5000, year: 2012, title: 'Fiat Uno Way', ...uno }, 'exploratory', 0.3, {
    median: 7200,
    n: 6,
  }),
  item(id(2), { priceUsd: 9300, year: 2016 }, 'strict', 0.16),
  item(id(3), { priceUsd: 8000, year: 2018 }, 'exploratory', 0.14),
  item(id(4), { priceUsd: 14000, year: 2019, ...onix }, 'strict', 0.2),
  item(id(5), { priceUsd: 20800, year: 2021, ...onix }, 'exploratory', 0.358),
]
const snapshot = {
  version: 1,
  algorithm: 'car-cohort-v2',
  generatedAt: '2026-11-20T02:39:03.250Z',
  usdUyu: 40,
  policy,
  stats,
  items: [...items, item(id(9), { priceUsd: 3000, lastSeen: '2026-11-10T00:00:00.000Z' })],
} as unknown as PublicCarOpportunitySnapshot

describe('carOpportunityFreshItems', () => {
  it('retires stale adverts with the same cutoff as the list', () => {
    const fresh = carOpportunityFreshItems(snapshot, NOW)
    expect(fresh.map(entry => entry.subject.key)).toEqual(items.map(entry => entry.subject.key))
    expect(carOpportunitySummary(fresh).total).toBe(queryCarOpportunities(snapshot, {}, NOW).total)
  })
})

describe('carOpportunitySummary', () => {
  const summary = carOpportunitySummary(carOpportunityFreshItems(snapshot, NOW))

  it('counts the whole list and splits it by tier', () => {
    expect(summary.total).toBe(5)
    expect(summary.strict).toBe(2)
    expect(summary.exploratory).toBe(3)
  })

  it('reports price range and medians (odd count = the middle value)', () => {
    expect(summary.minUsd).toBe(5000)
    expect(summary.medianUsd).toBe(9300)
    expect(summary.maxUsd).toBe(20800)
    expect(summary.medianGap).toBe(0.2)
    expect(summary.maxGap).toBe(0.358)
  })

  it('takes the mean of the two middle values for an even count', () => {
    const even = carOpportunitySummary([
      item(id(1), { priceUsd: 8000 }, 'strict', 0.15),
      item(id(2), { priceUsd: 9001 }, 'strict', 0.2),
    ])
    expect(even.medianUsd).toBe(8501)
    expect(even.medianGap).toBe(0.175)
  })

  it('counts budgets cumulatively, drops empty ones and agrees with the price filter', () => {
    expect(summary.budgets.map(row => [row.budget, row.count, row.strict])).toEqual([
      [6000, 1, 0],
      [10000, 3, 1],
      [15000, 4, 2],
      [20000, 4, 2],
      [30000, 5, 2],
    ])
    for (const row of summary.budgets)
      expect(row.count).toBe(
        queryCarOpportunities(snapshot, { priceMax: String(row.budget) }, NOW).total
      )
    expect(summary.budgets.find(row => row.budget === 10000)!.medianGap).toBe(0.16)
  })

  it('groups by model: most deals first, then the cheapest', () => {
    expect(summary.models.map(row => [row.marketSlug, row.count])).toEqual([
      ['peugeot-208', 2],
      ['chevrolet-onix', 2],
      ['fiat-uno', 1],
    ])
    const peugeot = summary.models.find(row => row.marketSlug === 'peugeot-208')!
    expect(peugeot).toMatchObject({
      brand: 'Peugeot',
      model: '208',
      strict: 1,
      minUsd: 8000,
      maxUsd: 9300,
      yearFrom: 2016,
      yearTo: 2018,
      medianGap: 0.15,
    })
    expect(summary.modelCount).toBe(3)
    expect(summary.otherModels).toBeNull()
  })

  it('caps the model table and says what stays out', () => {
    const many = Array.from({ length: CAR_OPPORTUNITY_TOP_MODELS + 3 }, (_, index) =>
      item(id(100 + index), { marketSlug: `marca-modelo${index}`, priceUsd: 7000 + index })
    )
    many.push(item(id(200), { marketSlug: 'marca-modelo0', priceUsd: 9900 }))
    const capped = carOpportunitySummary(many)
    expect(capped.models).toHaveLength(CAR_OPPORTUNITY_TOP_MODELS)
    expect(capped.models[0]!.marketSlug).toBe('marca-modelo0')
    expect(capped.modelCount).toBe(CAR_OPPORTUNITY_TOP_MODELS + 3)
    expect(capped.otherModels).toEqual({ count: 3, maxEach: 1 })
  })

  it('picks the cheapest advert; a tie goes to the larger gap, then to the id', () => {
    expect(summary.cheapest).toEqual({
      id: id(1),
      title: 'Fiat Uno Way',
      year: 2012,
      km: 100000,
      priceUsd: 5000,
      gap: 0.3,
      tier: 'exploratory',
      median: 7200,
      n: 6,
    })
    const tie = carOpportunitySummary([
      item(id(2), { priceUsd: 6000 }, 'strict', 0.2),
      item(id(3), { priceUsd: 6000 }, 'strict', 0.25),
      item(id(1), { priceUsd: 6000 }, 'strict', 0.2),
    ])
    expect(tie.cheapest!.id).toBe(id(3))
    const even = carOpportunitySummary([
      item(id(2), { priceUsd: 6000 }, 'strict', 0.2),
      item(id(1), { priceUsd: 6000 }, 'strict', 0.2),
    ])
    expect(even.cheapest!.id).toBe(id(1))
  })

  it('returns nulls and empty lists for an empty list', () => {
    const empty = carOpportunitySummary([])
    expect(empty).toMatchObject({
      total: 0,
      medianGap: null,
      maxGap: null,
      minUsd: null,
      medianUsd: null,
      maxUsd: null,
      budgets: [],
      models: [],
      modelCount: 0,
      otherModels: null,
      cheapest: null,
    })
    expect(carOpportunityFaq(empty, policy, stats, snapshot.generatedAt)).toEqual([])
  })
})

describe('carOpportunityLeadModels', () => {
  const row = (marketSlug: string, brand: string, model: string, count: number) => ({
    marketSlug,
    brand,
    model,
    count,
    strict: 0,
    minUsd: 5000,
    maxUsd: 9000,
    yearFrom: 2012,
    yearTo: 2018,
    medianGap: 0.2,
  })
  const joined = (parts: ReturnType<typeof carOpportunityLeadModels>) =>
    parts.map(part => `${part.name} (${part.count})${part.trail}`).join('')

  it('separates the names with their own spaces and skips models seen once', () => {
    const rows = [
      row('peugeot-208', 'Peugeot', '208', 13),
      row('chevrolet-onix', 'Chevrolet', 'Onix', 9),
      row('fiat-uno', 'Fiat', 'Uno', 7),
      row('vw-gol', 'Volkswagen', 'Gol', 3),
    ]
    expect(joined(carOpportunityLeadModels(rows))).toBe(
      'Peugeot 208 (13), Chevrolet Onix (9) y Fiat Uno (7).'
    )
    expect(joined(carOpportunityLeadModels(rows.slice(0, 2)))).toBe(
      'Peugeot 208 (13) y Chevrolet Onix (9).'
    )
    expect(joined(carOpportunityLeadModels([rows[0]!, row('a', 'A', 'B', 1)]))).toBe(
      'Peugeot 208 (13).'
    )
  })

  it('keeps the spaces once the page template renders them (whitespace condense)', async () => {
    // El fragmento EXACTO de la página, compilado como lo compila Vue: el blanco antes de
    // `</template>` se descarta, así que el espacio tiene que viajar en `trail`.
    const source = readFileSync(
      resolve(__dirname, '../../pages/oportunidades-autos-usados-uruguay.vue'),
      'utf8'
    )
    const fragment = source.match(
      /<template v-if="leadModels\.length">[\s\S]*?<\/template>\s*<\/template>/
    )?.[0]
    expect(fragment).toBeTruthy()
    const { compile } = await import('@vue/compiler-ssr')
    const { code } = compile(`<p>Antes. ${fragment}\n  Cálculo</p>`, { whitespace: 'condense' })
    const vue = await import('vue')
    const serverRenderer = await import('vue/server-renderer')
    // Modo "function" del compilador: `const {…} = require(…)` y `return function ssrRender…`.
    const ssrRender = new Function('require', code)((name: string) =>
      name === 'vue' ? vue : serverRenderer
    )
    const app = vue.createSSRApp({
      ssrRender,
      setup: () => ({
        leadModels: carOpportunityLeadModels([
          row('peugeot-208', 'Peugeot', '208', 13),
          row('chevrolet-onix', 'Chevrolet', 'Onix', 9),
          row('fiat-uno', 'Fiat', 'Uno', 7),
        ]),
      }),
    })
    const html = await serverRenderer.renderToString(app)
    const text = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '')
    expect(text).toBe(
      'Antes. Los modelos que más aparecen: Peugeot 208 (13), Chevrolet Onix (9) y Fiat Uno (7). Cálculo'
    )
  })
})

describe('formatCarUsdSpan / formatCarYearSpan / formatCarCount', () => {
  it('groups thousands by hand, the same on the server and in the browser', () => {
    expect(formatCarCount(2254)).toBe('2.254')
    expect(formatCarCount(27550)).toBe('27.550')
    expect(formatCarCount(99)).toBe('99')
  })

  it('prints one value when both ends are equal', () => {
    expect(formatCarUsdSpan(6500, 8900)).toBe('US$ 6.500 – US$ 8.900')
    expect(formatCarUsdSpan(6500, 6500)).toBe('US$ 6.500')
    expect(formatCarYearSpan(2014, 2019)).toBe('2014–2019')
    expect(formatCarYearSpan(2014, 2014)).toBe('2014')
  })
})

describe('carOpportunityFaq', () => {
  const summary = carOpportunitySummary(carOpportunityFreshItems(snapshot, NOW))
  const faq = carOpportunityFaq(summary, policy, stats, snapshot.generatedAt)
  const answer = (faqId: string) => faq.find(entry => entry.id === faqId)?.answer

  it('has unique ids', () => {
    expect(new Set(faq.map(entry => entry.id)).size).toBe(faq.length)
    expect(faq).toHaveLength(7)
  })

  it('answers with the published, formatted numbers', () => {
    expect(answer('oportunidades-autos-mas-barato')).toBe(
      'Un Fiat Uno Way 2012 con 100.000 km a US$ 5.000: 30 % menos que la mediana (US$ 7.200) de 6 avisos iguales, con comparación exploratoria. Cálculo del 19 de noviembre de 2026.'
    )
    expect(answer('oportunidades-autos-cuantas')).toBe(
      '5: 2 con comparación sólida y 3 con comparación exploratoria, sobre 27.550 avisos leídos, de los que 2.254 tenían suficientes comparables. Cálculo del 19 de noviembre de 2026.'
    )
    expect(answer('oportunidades-autos-por-presupuesto')).toBe(
      '1 pide hasta US$ 6.000, 3 hasta US$ 10.000 y 4 hasta US$ 15.000. La más cara de la lista pide US$ 20.800 y la mediana es US$ 9.300.'
    )
    expect(answer('oportunidades-autos-cuanto-menos')).toContain(
      'La diferencia mediana es de 20 % y la mayor de la lista del 19 de noviembre de 2026, de 36 %. Entran a la lista desde 12 % con comparación exploratoria y desde 15 % con comparación sólida; una diferencia de más de 45 %'
    )
    // Cada condición de `tierFor`, para las dos: una lista incompleta se lee como suficiente.
    expect(answer('oportunidades-autos-solida-exploratoria')).toBe(
      'La sólida exige 8 avisos iguales o más de al menos 4 vendedores distintos, un precio 15 % o más por debajo de la mediana y 5 % o más por debajo del precio que separa al cuarto más barato de la muestra, y que la diferencia siga en 10 % o más aunque se saque de la muestra a cualquier vendedor. La exploratoria pide desde 5 avisos de al menos 3 vendedores, un precio 12 % o más por debajo de la mediana y no más caro que el precio que separa al cuarto más barato de la muestra, y que la diferencia siga en 8 % o más sin cualquier vendedor. En las dos, la mitad central de los precios de la muestra no puede abarcar más de 30 % de la mediana, y el auto no puede estar entre el cuarto con más kilómetros de sus comparables. Iguales quiere decir mismo modelo, año, versión, motor y caja, con kilómetros dentro de 20.000 km o 30 %, lo que sea mayor.'
    )
    expect(answer('oportunidades-autos-actualizacion')).toBe(
      'Se recalcula cada hora; el cálculo publicado es del 19 de noviembre de 2026. Un aviso que no volvimos a ver en 2 días sale de la lista, y cada oportunidad dice qué día se revisó su ficha.'
    )
  })

  it('says when the km is missing, uses the plural and skips a budget that adds nothing', () => {
    const noKm = carOpportunitySummary([
      item(id(1), { priceUsd: 5500, km: null }),
      item(id(2), { priceUsd: 5800 }),
      item(id(3), { priceUsd: 12000 }),
    ])
    const list = carOpportunityFaq(noKm, policy, stats, snapshot.generatedAt)
    expect(list.find(entry => entry.id === 'oportunidades-autos-mas-barato')!.answer).toContain(
      'con km no informado a US$ 5.500'
    )
    expect(list.find(entry => entry.id === 'oportunidades-autos-por-presupuesto')!.answer).toMatch(
      /^2 piden hasta US\$ 6\.000\. La más cara de la lista pide US\$ 12\.000/
    )
  })

  it('skips the budget question when every deal fits the smallest budget', () => {
    const cheap = carOpportunitySummary([item(id(1), { priceUsd: 5000 })])
    const ids = carOpportunityFaq(cheap, policy, stats, snapshot.generatedAt).map(entry => entry.id)
    expect(ids).not.toContain('oportunidades-autos-por-presupuesto')
  })
})

describe('/api/car-opportunities', () => {
  it('sends the summary of the unfiltered fresh list on every page, and 503s without a snapshot', async () => {
    const loadCarOpportunities = vi.fn()
    vi.doMock('../../server/utils/cars', () => ({ loadCarOpportunities }))
    const { getQuery } = installNitroGlobals()
    vi.stubGlobal('setResponseHeader', vi.fn())
    const handler = (await import('../../server/api/car-opportunities.get')).default as (
      event: unknown
    ) => Promise<Record<string, unknown>>

    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    try {
      loadCarOpportunities.mockResolvedValue(snapshot)
      getQuery.mockReturnValue({ priceMax: '6000' })
      const response = (await handler({})) as {
        total: number
        summary: { total: number; budgets: unknown[] }
      }
      expect(response.total).toBe(1)
      expect(response.summary.total).toBe(5)
      expect(response.summary.budgets).toHaveLength(5)

      loadCarOpportunities.mockResolvedValue(null)
      await expect(handler({})).rejects.toMatchObject({ statusCode: 503 })
    } finally {
      vi.useRealTimers()
      vi.doUnmock('../../server/utils/cars')
    }
  })
})

describe('pages/oportunidades-autos-usados-uruguay.vue', () => {
  const source = readFileSync(
    resolve(__dirname, '../../pages/oportunidades-autos-usados-uruguay.vue'),
    'utf8'
  )

  it('renders the FAQ without its own ad unit (the page hosts FeedAd)', () => {
    expect(source).toMatch(/<FaqSection[^>]*:ad="false"/)
  })

  it('keeps the sidebar layout, raw budget paths and the dated JSON-LD', () => {
    expect(source).not.toMatch(/<VRow\b/)
    expect(source).not.toContain('localePath(carBudgetPath(')
    expect(source).toContain('dateModified')
    expect(source).toContain('carOpportunityFaq(')
    expect(source.match(/<h1\b/g)).toHaveLength(1)
  })
})
