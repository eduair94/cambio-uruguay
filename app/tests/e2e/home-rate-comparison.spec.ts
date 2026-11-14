import { expect, test, type Page } from '@playwright/test'
import { pickOption } from './support/vuetifySelect'

test.use({ viewport: { width: 1440, height: 1000 } })
test.setTimeout(120_000)

const fixtureRows = [
  ...Array.from({ length: 20 }, (_, i) => ({
    origin: `casa-${i}`,
    code: 'USD',
    buy: 39,
    sell: 41.45,
  })),
  { origin: 'prex', code: 'USD', buy: 39.8, sell: 40.5 },
  { origin: 'cambio_fenix', code: 'USD', buy: 40, sell: 41.4 },
  { origin: 'baluma_cambio', code: 'USD', buy: 37.15, sell: 39.55 },
  // The source publishes only the sale side: reversing must remain recoverable.
  { origin: 'unidad', code: 'UI', buy: 0, sell: 6.6873 },
].map(row => ({ ...row, type: '', name: row.code, date: new Date().toISOString() }))

const fixtureNames: Record<string, string> = {
  prex: 'Prex',
  cambio_fenix: 'Cambio Fénix',
  baluma_cambio: 'Baluma Cambio',
  unidad: 'Unidad',
}
const fixtureLocals = Object.fromEntries(
  fixtureRows.map(row => [
    row.origin,
    {
      name: fixtureNames[row.origin] ?? row.origin,
      departments: ['MONTEVIDEO'],
      bcu: true,
      website: 'https://example.com',
    },
  ])
)

async function openFixtureHome(page: Page) {
  let fetchedRates = false
  await page.route(
    url => url.hostname === 'api.cambio-uruguay.com' && url.pathname === '/',
    async route => {
      fetchedRates = true
      await route.fulfill({ json: fixtureRows })
    }
  )
  await page.route('**/localData', route => route.fulfill({ json: fixtureLocals }))
  await page.route('**/api/og-rate', route => route.fulfill({ json: { buy: 40, sell: 40.5 } }))
  await page.route('**/api/site-top-pages', route => route.fulfill({ json: { guides: [] } }))
  await page.route('**/api/faq?**', route =>
    route.fulfill({ json: { generatedAt: '', items: [] } })
  )
  await page.route('**/api/frozen-quotes', route =>
    route.fulfill({
      json: {
        generatedAt: new Date().toISOString(),
        entries: { 'baluma_cambio|USD|': { days: 118, capped: true, extreme: 'min-sell' } },
      },
    })
  )
  await page.route('**/api/where-to-change?**', route =>
    route.fulfill({ json: { recommendation: null } })
  )

  // A real client navigation makes HTTP fixtures apply to useAsyncData without
  // editing Nuxt/Vue state or the SSR payload. Opening the header menu first
  // proves hydration has completed before clicking its home link.
  await page.goto('/acerca', { waitUntil: 'domcontentloaded', timeout: 90_000 })
  await expect(async () => {
    await page.locator('.primary-nav').getByRole('button', { name: 'Más', exact: true }).click()
    await expect(page.locator('.mega-menu')).toBeVisible({ timeout: 3000 })
  }).toPass({ timeout: 60_000 })
  await page.keyboard.press('Escape')
  await page.locator('.logo_link').click()
  await expect.poll(() => fetchedRates, { timeout: 60_000 }).toBe(true)
  await expect(page.getByTestId('rate-comparison-context')).toBeVisible({ timeout: 60_000 })
}

const moneyValue = (text: string) =>
  Number(
    text
      .replace(/[^\d,.-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
  )

async function setAmount(page: Page, amount: string) {
  await expect(async () => {
    await page.getByTestId('amount-input').locator('input').fill(amount)
    await page.getByTestId('convert-btn').click()
    await expect(page.getByTestId('amount-input').locator('input')).toHaveValue(amount)
  }).toPass({ timeout: 30_000 })
}

async function expectTotals(page: Page, quantity: number) {
  await expect(async () => {
    const cards = page.locator('.best-rates-grid .rate-item')
    expect(await cards.count()).toBeGreaterThan(1)
    for (const card of await cards.all()) {
      const rate = Number(
        ((await card.locator('.rate-value').textContent()) ?? '').replace(/[^\d.]/g, '')
      )
      const total = moneyValue((await card.locator('.rate-amount__total').textContent()) ?? '')
      expect(total).toBeCloseTo(Math.round(quantity * rate * 100) / 100, 2)
    }
  }).toPass({ timeout: 30_000 })
}

async function selectCurrency(page: Page, index: number, currency: string) {
  // Vuetify's select renders a hidden input beside the text one.
  const field = page.locator('.currency-select').nth(index).locator('input:not([type="hidden"])')
  await expect(async () => {
    await field.fill(currency)
    await expect(page.getByRole('option', { name: new RegExp(`^${currency} -`) })).toBeVisible()
  }).toPass({ timeout: 30_000 })
  await pickOption(page, new RegExp(`^${currency} -`))
}

test('compares equal foreign amounts, reverses intent and keeps outliers out of best rates', async ({
  page,
}) => {
  await openFixtureHome(page)
  await setAmount(page, '250')

  await expect(page.getByTestId('rate-comparison-context')).toContainText('250 USD')
  const lists = page.locator('.best-rates-card')
  await expect(lists.first().locator('.rate-name').first()).toHaveText('Cambio Fénix')
  await expect(lists.first().locator('.rate-amount__label').first()).toHaveText('Recibís (UYU)')
  await expect(lists.nth(1).locator('.rate-name').first()).toHaveText('Prex')
  await expect(lists.nth(1).locator('.rate-amount__label').first()).toHaveText('Pagás (UYU)')
  await expect(page.locator('.best-rates-grid')).not.toContainText('Baluma')
  await expect(page.getByTestId('wtc-house-name').first()).toHaveText('Prex')
  await expectTotals(page, 250)

  const rightBefore = (await page.getByTestId('result-amount').textContent()) ?? ''
  await page.getByTestId('conversion-result').locator('.direction-toggle').click()
  await expect(lists.first().locator('.rate-amount__label').first()).toHaveText('Pagás (UYU)')
  await expect(lists.first().locator('.rate-name').first()).toHaveText('Prex')
  await expect(page.getByTestId('result-amount')).toHaveText(rightBefore)
  const foreignQuantity = Number(
    await page.getByTestId('amount-input').locator('input').inputValue()
  )
  const comparisonBasis = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 8 }).format(
    foreignQuantity
  )
  await expect(page.getByTestId('rate-comparison-context')).toContainText(`${comparisonBasis} USD`)
  await expectTotals(page, foreignQuantity)
})

test('a peso input compares the foreign quantity shown in the result', async ({ page }) => {
  await openFixtureHome(page)
  await page.getByTestId('swap-btn').click()
  await setAmount(page, '4050')

  await expect(page.getByTestId('rate-comparison-context')).toContainText('100 USD')
  await expect(
    page.locator('.best-rates-card').first().locator('.rate-amount__label').first()
  ).toHaveText('Pagás (UYU)')
  expect(moneyValue((await page.getByTestId('result-amount').textContent()) ?? '')).toBe(100)
  await expectTotals(page, 100)
})

test('a missing reverse quote still lets the reader return without losing their amount', async ({
  page,
}) => {
  await openFixtureHome(page)
  await selectCurrency(page, 0, 'UYU')
  await selectCurrency(page, 1, 'UI')
  await setAmount(page, '668.73')
  await expect(page.getByTestId('conversion-result')).toBeVisible()
  const rightBefore = (await page.getByTestId('result-amount').textContent()) ?? ''
  expect(moneyValue(rightBefore)).toBe(100)

  await page.getByTestId('conversion-result').locator('.direction-toggle').click()
  await expect(page.getByTestId('conversion-unavailable')).toBeVisible()
  await expect(page.getByTestId('conversion-result')).not.toBeVisible()
  await page.getByTestId('conversion-unavailable').locator('.direction-toggle').click()

  await expect(page.getByTestId('conversion-result')).toBeVisible()
  await expect(page.getByTestId('result-amount')).toHaveText(rightBefore)
  await expect(page.getByTestId('amount-input').locator('input')).toHaveValue('668.73')
})
