import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as vue from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as sales from '../../utils/propertySales'
import * as salesMessages from '../../utils/propertySalesMessages'
import * as opportunities from '../../utils/propertyOpportunityQuery'
import * as opportunityMessages from '../../utils/propertyOpportunityMessages'
import * as budget from '../../utils/rentalBudget'
import * as budgetMessages from '../../utils/rentalBudgetMessages'
import * as availabilityMessages from '../../utils/rentalAvailabilityMessages'
import * as rentals from '../../utils/rentals'
import * as presentation from '../../utils/rentalPresentation'
import * as saved from '../../utils/rentalSaved'

// Execute the real SFC setup, including watchers and event handlers, without a server.
const imports: Record<string, unknown> = {
  '~/utils/propertySales': sales,
  '~/utils/propertySalesMessages': salesMessages,
  '~/utils/propertyOpportunityQuery': opportunities,
  '~/utils/propertyOpportunityMessages': opportunityMessages,
  '~/utils/rentalBudget': budget,
  '~/utils/rentalBudgetMessages': budgetMessages,
  '~/utils/rentalAvailabilityMessages': availabilityMessages,
  '~/utils/rentals': rentals,
  '~/utils/rentalPresentation': presentation,
  '~/utils/rentalSaved': saved,
}
const teardown: (() => void)[] = []
afterEach(() => teardown.splice(0).forEach(stop => stop()))

async function setup(name: 'sales' | 'opportunities' | 'budget', mobile = true) {
  const component = {
    sales: 'property-sales/SearchFilters.vue',
    opportunities: 'property-opportunities/Filters.vue',
    budget: 'rentals/BudgetRentals.vue',
  }[name]
  const filename = resolve(__dirname, '../../components', component)
  const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
  const script = compileScript(descriptor, { id: `filter-${name}` })
  const { outputText } = ts.transpileModule(
    script.content.replaceAll('import.meta.client', 'false'),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }
  )
  const query =
    name === 'sales'
      ? sales.normalizePropertySalesQuery({
          department: 'Montevideo',
          maxPrice: 200000,
          bedrooms: 0,
          view: 'mapa',
          keys: ['infocasas-123'],
        })
      : name === 'opportunities'
        ? opportunities.normalizeOpportunityQuery({
            operation: 'sale',
            department: 'Montevideo',
            maxPrice: 200000,
            bedrooms: 0,
          })
        : budget.normalizeRentalBudgetQuery({
            department: 'Montevideo',
            band: '13000_16000',
            basis: 'monthly',
            bedrooms: 0,
          })
  const props = vue.reactive({
    query,
    mobile,
    open: false,
    pending: false,
    departments: ['Montevideo', 'Maldonado'],
    neighborhoods: ['Cordón'],
    facets: {
      departments: [],
      localities: [],
      neighborhoods: [],
      sellers: [],
      types: [],
      sources: [],
    },
  })
  const route = vue.reactive({ path: '/oportunidades-inmobiliarias-uruguay', query: { ...query } })
  const push = vi.fn(async (location: { query: typeof query }) => {
    route.query = location.query
  })
  const emit = vi.fn()
  const fetch = vi.fn(async () => ({
    facets: { departments: ['Montevideo', 'Maldonado'], neighborhoods: [] },
  }))
  const smAndDown = vue.ref(mobile)
  const document = { activeElement: {} }
  const context = {
    ...vue,
    exports: {} as any,
    require: (path: string) => {
      if (path === 'vue')
        return { ...vue, withAsyncContext: (fn: () => unknown) => [fn(), () => {}] }
      if (path === 'vuetify') return { useDisplay: () => ({ smAndDown }) }
      if (path === 'vuetify/components') return { VDialog: {} }
      if (path in imports) return imports[path]
      throw new Error(`Unexpected import: ${path}`)
    },
    watch: (...args: Parameters<typeof vue.watch>) => {
      const stop = vue.watch(...args)
      teardown.push(stop)
      return stop
    },
    onMounted: () => {},
    onBeforeUnmount: (fn: () => void) => teardown.push(fn),
    useI18n: () => ({ t: (key: string) => key, locale: vue.ref('es') }),
    useRoute: () => route,
    useRouter: () => ({ push }),
    useLocalePath: () => (path: string) => path,
    useAgencySelection: () => vue.ref(''),
    useRentalAvailability: () => ({
      withRevision: (value: unknown) => value,
      watchChanges: () => {},
    }),
    useAsyncData: async () => ({
      data: vue.ref(null),
      pending: vue.ref(false),
      error: vue.ref(null),
      refresh: vi.fn(),
    }),
    $fetch: fetch,
    window: { innerHeight: 844, addEventListener: () => {}, removeEventListener: () => {} },
    innerHeight: 844,
    document,
  }
  runInNewContext(outputText, context)
  const form = await context.exports.default.setup(props, { expose: () => {}, emit })
  return { form, props, emit, push, route, fetch, smAndDown, descriptor, document }
}

describe('filter drawer focus after its opening transition', () => {
  it.each(['sales', 'opportunities', 'budget'] as const)(
    '%s keeps an interaction started before the transition finishes',
    async name => {
      const { form, document } = await setup(name)
      const input = document.activeElement
      const focus = vi.fn()
      form.heading.value = {
        closest: () => ({ contains: (element: unknown) => element === input }),
        focus,
      }
      form.focusHeading()
      expect(focus).not.toHaveBeenCalled()
      // A normal open still announces its heading when focus has not entered the form.
      document.activeElement = {}
      form.focusHeading()
      expect(focus).toHaveBeenCalledWith({ preventScroll: true })
    }
  )
})

describe('property filter draft validation', () => {
  it.each(['minPrice', 'maxPrice', 'minArea', 'maxArea'] as const)(
    'rejects invalid %s before query normalization can remove it',
    async key => {
      const { form, emit } = await setup('sales')
      for (const value of [-1, '-0.1', Infinity, NaN, '1e999', 'not-a-number']) {
        form.draft.value[key] = value
        form.submit()
        expect(form.invalid.value).toBe('number')
        expect(form.invalidFields.value).toContain(key)
        expect(emit).not.toHaveBeenCalled()
      }
    }
  )

  it.each([
    ['minPrice', 'maxPrice', 'price'],
    ['minArea', 'maxArea', 'area'],
  ])('checks the raw %s/%s range, including a zero upper bound', async (min, max, kind) => {
    const { form, emit } = await setup('sales')
    for (const [from, to] of [
      [1, 0],
      [100, 20],
      [2e12, 1e12],
    ]) {
      form.draft.value[min] = from
      form.draft.value[max] = to
      form.submit()
      expect(form.invalid.value).toBe(kind)
      expect(emit).not.toHaveBeenCalled()
    }
  })

  it('keeps legitimate zero, equal and decimal sale ranges and maps studio to zero', async () => {
    const { form, emit } = await setup('sales')
    Object.assign(form.draft.value, { minPrice: 0, maxPrice: 0, minArea: '42.5', maxArea: '42.5' })
    form.submit()
    expect(emit.mock.calls).toEqual([
      [
        'search',
        expect.objectContaining({
          minPrice: 0,
          maxPrice: 0,
          minArea: 42.5,
          maxArea: 42.5,
          bedrooms: 0,
          page: 1,
        }),
      ],
    ])
  })

  it('allows blank optional sale fields', async () => {
    const { form, emit } = await setup('sales')
    Object.assign(form.draft.value, { minPrice: '', maxPrice: null, minArea: '', maxArea: null })
    form.submit()
    expect(emit.mock.calls[0][1]).toMatchObject({
      minPrice: null,
      maxPrice: null,
      minArea: null,
      maxArea: null,
    })
  })

  it.each(['sales', 'opportunities'] as const)(
    'does not silently discard incomplete browser number input in %s',
    async name => {
      const { form, emit } = await setup(name)
      form.submit({ currentTarget: { querySelector: () => ({ validity: { badInput: true } }) } })
      expect(name === 'sales' ? form.invalid.value : form.invalidBudget.value).toBeTruthy()
      expect(emit).not.toHaveBeenCalled()
    }
  )

  it('rejects zero, negative and non-finite comparison caps while allowing an empty cap', async () => {
    const { form, emit } = await setup('opportunities')
    for (const value of [0, -1, NaN, Infinity, '1e999']) {
      form.budget.value = value
      form.submit()
      expect(form.invalidBudget.value).toBe(true)
      expect(emit).not.toHaveBeenCalled()
    }
    form.budget.value = ''
    form.submit()
    expect(emit.mock.calls).toEqual([
      ['search', expect.objectContaining({ operation: 'sale', maxPrice: null })],
    ])
  })
})

describe('mobile filter reset is cancellable', () => {
  it.each(['sales', 'opportunities'] as const)(
    '%s resets only the draft, then reopening restores the confirmed query',
    async name => {
      const { form, props, emit } = await setup(name)
      props.open = true
      await vue.nextTick()
      const original = { ...props.query }
      if (name === 'sales') form.reset()
      else form.clear()
      expect(form.draft.value.department).toBe('')
      expect(props.query).toEqual(original)
      expect(
        emit.mock.calls.some(
          ([event]) => event === 'search' || event === 'clear' || event === 'update:open'
        )
      ).toBe(false)
      props.open = false
      await vue.nextTick()
      props.open = true
      await vue.nextTick()
      expect(form.draft.value.department).toBe('Montevideo')
      expect(form.draft.value.bedrooms).toBe(0)
      expect(name === 'sales' ? form.draft.value.maxPrice : form.budget.value).toBe(200000)
    }
  )

  it('applying the cleared comparison draft preserves the sale operation', async () => {
    const { form, emit } = await setup('opportunities')
    form.clear()
    form.submit()
    expect(emit.mock.calls).toEqual([
      [
        'search',
        expect.objectContaining({
          operation: 'sale',
          department: '',
          type: 'all',
          maxPrice: null,
          bedrooms: '',
        }),
      ],
    ])
  })

  it('sale reset preserves map mode and the saved selection, without searching', async () => {
    const { form, emit } = await setup('sales')
    form.reset()
    expect(form.draft.value).toMatchObject({
      view: 'mapa',
      keys: ['infocasas-123'],
      department: '',
    })
    expect(emit.mock.calls).toEqual([['location', form.draft.value]])
  })

  it('budget reset leaves the URL untouched; cancellation discards draft and facets', async () => {
    const { form, push, route } = await setup('budget')
    form.open.value = true
    await vue.nextTick()
    const original = { ...route.query }
    await form.resetFilters()
    expect(form.draft.value.department).toBe('')
    expect(push).not.toHaveBeenCalled()
    expect(route.query).toEqual(original)
    form.open.value = false
    await vue.nextTick()
    expect(form.draft.value).toEqual(original)
    expect(form.facetOverride.value).toBeNull()
  })

  it('budget reset commits only on Apply; the empty-results clear still acts immediately', async () => {
    const { form, push } = await setup('budget')
    await form.resetFilters()
    expect(push).not.toHaveBeenCalled()
    await form.apply()
    expect(push).toHaveBeenCalledTimes(1)
    expect(push.mock.calls[0][0].query).toMatchObject({ operation: 'rent', mode: 'budget' })
    await form.clear()
    expect(push).toHaveBeenCalledTimes(2)
  })

  it('keeps immediate clear for the desktop comparison sidebar', async () => {
    const { form, emit } = await setup('opportunities', false)
    form.clear()
    expect(emit.mock.calls).toEqual([['clear']])
  })
})
