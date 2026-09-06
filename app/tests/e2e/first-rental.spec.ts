import { expect, test } from '@playwright/test'

test.describe('first rental guide', () => {
  test.setTimeout(120_000)

  test('handover list and budget respond after hydration', async ({ page }) => {
    await page.goto('/primer-alquiler-uruguay', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1')).toContainText('Primer alquiler')
    // Retry a meaningful interaction to avoid the site-wide first-click hydration race.
    await expect(async () => {
      await page.locator('#budget-rent').fill('25000')
      await expect(page.getByTestId('rental-monthly')).toContainText('25.750')
    }).toPass()
    await page.locator('#budget-monthly').fill('4000')
    await page.locator('#budget-bimonthly').fill('2400')
    await page.locator('#budget-entry').fill('35000')
    await expect(page.getByTestId('rental-monthly')).toContainText('30.950')
    await expect(page.getByTestId('rental-entry')).toContainText('65.950')
    await page.locator('#budget-cgn').uncheck()
    await expect(page.getByTestId('rental-monthly')).toContainText('30.200')
    await page.locator('#budget-entry').clear()
    await expect(page.getByTestId('rental-entry')).toHaveCount(0)
    await expect(page.getByText('Cálculo parcial:', { exact: false })).toBeVisible()
    await page.locator('#budget-rent').fill('-1')
    await expect(page.locator('#budget-rent')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByTestId('rental-monthly')).toHaveCount(0)
    await page.locator('#check-contract').check()
    await expect(page.getByRole('status').filter({ hasText: '1 de 5 resueltos' })).toBeVisible()
    await page.getByRole('button', { name: 'Desmarcar la lista' }).click()
    await expect(page.locator('#check-contract')).not.toBeChecked()
    await page.getByText('¿Pagar OSE incluye el saneamiento?', { exact: true }).click()
    await expect(page.locator('details[open]')).toContainText('cuentas distintas')
  })

  for (const theme of ['dark', 'light']) {
    test(`fits a phone in ${theme} mode`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.addInitScript(value => localStorage.setItem('cu_theme', value), theme)
      await page.goto('/primer-alquiler-uruguay', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme, { timeout: 90_000 })
      await expect(page.locator('h1')).toBeVisible()
      const rejectCookies = page.getByRole('button', { name: 'Rechazar', exact: true })
      if (await rejectCookies.isVisible()) await rejectCookies.click()
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true)
      await page.screenshot({ path: `../first-rental-mobile-${theme}.png` })
      await page.locator('#presupuesto').screenshot({ path: `../first-rental-budget-${theme}.png` })
    })
  }

  test('localized content, canonical, FAQ and social metadata render', async ({ page }) => {
    for (const [prefix, heading] of [
      ['en', 'first rental'],
      ['pt', 'Primeiro aluguel'],
    ]) {
      const response = await page.goto(`/${prefix}/primer-alquiler-uruguay`, {
        waitUntil: 'domcontentloaded',
      })
      expect(response?.status()).toBe(200)
      await expect(page.locator('h1')).toContainText(heading)
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://cambio-uruguay.com/${prefix}/primer-alquiler-uruguay`
      )
      await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute(
        'content',
        /.+/
      )
      const graphs = await page.locator('script[type="application/ld+json"]').allTextContents()
      expect(
        graphs.some(text =>
          JSON.parse(text)['@graph']?.some(
            (item: { '@type': string }) => item['@type'] === 'FAQPage'
          )
        )
      ).toBe(true)
    }
  })
})
