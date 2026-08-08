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

/**
 * Hosts this assertion cannot hold the application responsible for.
 *
 * Cloudflare injects its Web Analytics beacon at the edge, so it appears on
 * production and not on a local build. It is not in the bundle and no app-side
 * change can remove it — only the Cloudflare dashboard can. Allowlisting it
 * keeps the test honest in both environments: without this, the assertion
 * passes locally (giving false comfort) and fails against production (giving a
 * false alarm), which is exactly what happened the first time it ran.
 */
const EDGE_INJECTED = new Set(['static.cloudflareinsights.com'])

test('loads no third-party script and shows no cookie banner', async ({ page }) => {
  const thirdParty: string[] = []
  page.on('request', req => {
    const { hostname } = new URL(req.url())
    if (EDGE_INJECTED.has(hostname)) return
    if (!/(?:^|\.)cambio-uruguay\.com$|^localhost$|^127\.0\.0\.1$/.test(hostname)) {
      thirdParty.push(hostname)
    }
  })

  await page.goto('/pizarra')
  await expect(page.locator('h1')).toBeVisible({ timeout: 90_000 })
  // Tawk self-loads on idle (~8s), Clarity after 3s, and gtag is deferred —
  // give all three their window before concluding they stayed away.
  await page.waitForTimeout(9000)

  expect(
    [...new Set(thirdParty)],
    `unexpected third-party hosts: ${thirdParty.join(', ')}`
  ).toEqual([])
  // No consent UI to dismiss, and no site chrome.
  await expect(page.getByRole('button', { name: /aceptar|accept/i })).toHaveCount(0)
  await expect(page.locator('header.v-app-bar, .v-navigation-drawer')).toHaveCount(0)
})

test('the rest of the site keeps its analytics', async ({ page }) => {
  // The other half of the gtag change: taking GA off the bare routes must not
  // take it off everything. `enabled: false` did exactly that, site-wide, and
  // only a manual check of the home page caught it — so it is a test now.
  const hosts: string[] = []
  page.on('request', req => hosts.push(new URL(req.url()).hostname))

  await page.goto('/')
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 90_000 })
  await page.waitForTimeout(9000)

  expect(hosts, 'gtag did not load on a normal page').toContain('www.googletagmanager.com')

  // And the Consent Mode v2 defaults still travel with it (all denied until the
  // banner grants), which is what makes loading it before consent legitimate.
  // gtag pushes the `arguments` object, NOT a real array — `Array.isArray` is
  // false for those, which silently emptied this filter the first time.
  const consent = await page.evaluate(() =>
    Array.from((window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? [])
      .filter(a => a && (a as ArrayLike<unknown>)[0] === 'consent' && a[1] === 'default')
      .map(a => (a as ArrayLike<unknown>)[2])
  )
  expect(consent).toHaveLength(1)
  expect(consent[0]).toMatchObject({
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  })
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
