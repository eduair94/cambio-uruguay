import { expect, test } from '@playwright/test'

// /pizarra is the zero-friction board: it has to be readable the instant the
// HTML lands, with no chrome, no third-party script and no JavaScript.

test.setTimeout(120_000)

test('renders the board and the unfiltered market', async ({ page }) => {
  await page.goto('/pizarra')
  await expect(page.locator('h1')).toContainText(/pizarra|d[óo]lar/i, { timeout: 90_000 })

  // Four currencies, each with a buy and a sell figure.
  for (const code of ['USD', 'EUR', 'BRL', 'ARS']) {
    await expect(page.locator(`[data-testid="pizarra-row-${code}"]`)).toBeVisible()
  }
  await expect(async () => {
    const usd = (await page.locator('[data-testid="pizarra-buy-USD"]').allInnerTexts()).join('')
    expect(usd).toMatch(/\d/)
  }).toPass({ timeout: 45_000 })

  // The full table keeps what the rest of the site filters out.
  await expect(async () => {
    const quotes = await page.locator('[data-testid="pizarra-quote"]').count()
    expect(quotes).toBeGreaterThan(40)
  }).toPass({ timeout: 45_000 })

  const body = (await page.locator('body').allInnerTexts()).join(' ')
  expect(body).toMatch(/Referencia BCU|BCU reference/i)
  expect(body).toMatch(/Mayorista|Wholesale/i)
})

test('loads no third-party script and shows no cookie banner', async ({ page }) => {
  const thirdParty: string[] = []
  page.on('request', req => {
    const url = new URL(req.url())
    if (!/(?:^|\.)cambio-uruguay\.com$|^localhost$|^127\.0\.0\.1$/.test(url.hostname)) {
      thirdParty.push(url.hostname)
    }
  })

  await page.goto('/pizarra')
  await expect(page.locator('h1')).toBeVisible({ timeout: 90_000 })
  // Tawk and Clarity both self-load on a timer/idle; give them their window.
  await page.waitForTimeout(9000)

  expect(
    [...new Set(thirdParty)],
    `unexpected third-party hosts: ${thirdParty.join(', ')}`
  ).toEqual([])
  // No consent UI to dismiss, and no site chrome.
  await expect(page.getByRole('button', { name: /aceptar|accept/i })).toHaveCount(0)
  await expect(page.locator('header.v-app-bar, .v-navigation-drawer')).toHaveCount(0)
})

test('the calculator scales the whole board and is shareable', async ({ page }) => {
  await page.goto('/pizarra')
  await expect(page.locator('[data-testid="pizarra-amount"]')).toBeVisible({ timeout: 90_000 })

  const readUsdSell = async () =>
    Number(
      (await page.locator('[data-testid="pizarra-sell-USD"]').allInnerTexts())
        .join('')
        .replace(/\./g, '')
        .replace(',', '.')
    )

  const one = await readUsdSell()
  expect(one).toBeGreaterThan(0)

  await page.locator('[data-testid="pizarra-amount"]').fill('100')
  await page.locator('[data-testid="pizarra-calc"]').click()

  await expect(page).toHaveURL(/c=100/, { timeout: 15_000 })
  await expect(async () => {
    expect(await readUsdSell()).toBeCloseTo(one * 100, 0)
  }).toPass({ timeout: 15_000 })
})

test('works with JavaScript disabled — the server renders the scaled board', async ({
  browser,
}) => {
  // The point of the page: a bare GET must already carry the answer.
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()

  await page.goto('/pizarra?c=100')
  await expect(page.locator('h1')).toBeVisible({ timeout: 90_000 })

  const scaled = (await page.locator('[data-testid="pizarra-sell-USD"]').allInnerTexts())
    .join('')
    .trim()
  expect(scaled).toMatch(/\d/)
  // 100 dollars is a four-digit figure; at c=1 it would be two digits.
  expect(scaled.replace(/\D/g, '').length).toBeGreaterThanOrEqual(5)

  // The comparison table is server-rendered too, not hydrated in.
  expect(await page.locator('[data-testid="pizarra-quote"]').count()).toBeGreaterThan(40)

  await context.close()
})

test('a junk amount degrades to 1 instead of breaking the page', async ({ page }) => {
  await page.goto('/pizarra?c=not-a-number')
  await expect(page.locator('h1')).toBeVisible({ timeout: 90_000 })
  const usd = (await page.locator('[data-testid="pizarra-sell-USD"]').allInnerTexts()).join('')
  expect(usd).not.toMatch(/NaN|Infinity/)
  expect(usd).toMatch(/^\d{1,3},\d{2}$/)
})
