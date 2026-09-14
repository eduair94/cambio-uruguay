import { expect, test } from '@playwright/test'

test.describe('moving directory', () => {
  test.setTimeout(240_000)

  test('finds article tariffs, retains conditions and labels branch contacts', async ({ page }) => {
    await page.goto('/fletes-mudanzas-uruguay', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(
      () =>
        Boolean(
          (document.getElementById('__nuxt') as HTMLElement & { __vue_app__?: unknown })
            ?.__vue_app__
        ),
      undefined,
      { timeout: 180_000 }
    )
    await expect(async () => {
      await page
        .getByRole('textbox', { name: 'Empresa, localidad o servicio', exact: true })
        .fill('heladera')
      await expect(page.locator('#depunta .provider-price')).toContainText('Heladera')
    }).toPass()
    await expect(page.locator('#depunta .provider-price')).toContainText('Heladera')
    await expect(page.locator('#depunta .provider-price')).toContainText('Tasa postal')
    await expect(page.locator('#depunta .provider-actions')).toContainText('Montevideo')
    await page.locator('#depunta summary').click()
    await page
      .locator('#depunta')
      .getByRole('textbox', { name: 'Buscar en estas tarifas', exact: true })
      .fill('heladera')
    await expect(page.locator('#depunta tbody tr')).toHaveCount(8)
    await page
      .locator('#depunta')
      .getByRole('textbox', { name: 'Buscar en estas tarifas', exact: true })
      .fill('sincoincidencias123')
    await expect(page.locator('#depunta tbody tr')).toHaveCount(0)
    await page
      .getByRole('textbox', { name: 'Empresa, localidad o servicio', exact: true })
      .fill('sincoincidencias123')
    await expect(page.getByText('No hay coincidencias con estos filtros')).toBeVisible()
    await page.getByRole('button', { name: 'Limpiar filtros' }).first().click()
    await expect(page.locator('.provider')).toHaveCount(18)
  })

  test('assembly filters use assembly prices, with local coverage and reversible filters', async ({
    page,
  }) => {
    await page.goto('/fletes-mudanzas-uruguay?servicio=assembly', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(
      () =>
        Boolean(
          (document.getElementById('__nuxt') as HTMLElement & { __vue_app__?: unknown })
            ?.__vue_app__
        ),
      undefined,
      { timeout: 180_000 }
    )
    await expect(async () => {
      await page
        .getByRole('textbox', { name: 'Empresa, localidad o servicio', exact: true })
        .fill('Dante')
      await expect(page.locator('.provider')).toHaveCount(1)
    }).toPass()
    await expect(page.locator('#empresa-dante .provider-price')).toContainText(
      'Requiere presupuesto'
    )
    await expect(page.locator('#empresa-dante .provider-price')).not.toContainText('3.800')
    await page.getByLabel('Con precios publicados', { exact: true }).check()
    await expect(page.locator('.provider')).toHaveCount(0)
    await page
      .getByRole('textbox', { name: 'Empresa, localidad o servicio', exact: true })
      .fill('DT Transportes')
    await expect(page.locator('#dt-transportes .provider-price')).toContainText('1.200')
    await expect(page.locator('#dt-transportes .provider-price')).toContainText('Armado')
    await page.getByRole('button', { name: 'Limpiar filtros' }).first().click()
    await page.getByLabel('Departamento', { exact: true }).focus()
    await page.getByLabel('Departamento', { exact: true }).press('ArrowDown')
    await page.getByRole('option', { name: 'Canelones', exact: true }).click()
    await page
      .getByRole('textbox', { name: 'Empresa, localidad o servicio', exact: true })
      .fill('Schubert')
    await expect(page.locator('#schubert-pereyra')).toBeVisible()
  })

  for (const theme of ['light', 'dark']) {
    test(`mobile layout and full tariffs in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      // Light is a clean first visit, even on a dark OS. Dark is an explicitly saved preference.
      if (theme === 'dark') await page.addInitScript(() => localStorage.setItem('cu_theme', 'dark'))
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.goto('/fletes-mudanzas-uruguay', { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(
        () =>
          Boolean(
            (document.getElementById('__nuxt') as HTMLElement & { __vue_app__?: unknown })
              ?.__vue_app__
          ),
        undefined,
        { timeout: 180_000 }
      )
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await expect(page.locator('h1')).toBeVisible()
      await page.screenshot({ path: `../.artifacts/moving-mobile-${theme}.png` })
      await expect(async () => {
        await page
          .getByRole('textbox', { name: 'Empresa, localidad o servicio', exact: true })
          .fill('DePunta')
        await expect(page.locator('.provider')).toHaveCount(1)
      }).toPass()
      await page.locator('#depunta summary').click()
      await page
        .locator('#depunta')
        .getByRole('textbox', { name: 'Buscar en estas tarifas', exact: true })
        .fill('heladera')
      await expect(page.locator('#depunta tbody tr')).toHaveCount(8)
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true)
      await page
        .locator('#depunta .tariffs')
        .screenshot({ path: `../.artifacts/moving-tariffs-${theme}.png` })
    })
  }

  test('localized metadata and desktop layout', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    for (const [prefix, title] of [
      ['en', 'Moving, freight'],
      ['pt', 'Fretes, mudanças'],
    ]) {
      const response = await page.goto(`/${prefix}/fletes-mudanzas-uruguay`, {
        waitUntil: 'domcontentloaded',
      })
      expect(response?.status()).toBe(200)
      await expect(page.locator('h1')).toContainText(title)
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://cambio-uruguay.com/${prefix}/fletes-mudanzas-uruguay`
      )
      await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute(
        'content',
        /.+/
      )
      expect(
        (await page.locator('script[type="application/ld+json"]').allTextContents()).some(
          text => JSON.parse(text)['@type'] === 'CollectionPage'
        )
      ).toBe(true)
    }
    await page.goto('/fletes-mudanzas-uruguay', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(
      () =>
        Boolean(
          (document.getElementById('__nuxt') as HTMLElement & { __vue_app__?: unknown })
            ?.__vue_app__
        ),
      undefined,
      { timeout: 180_000 }
    )
    await expect(page.locator('h1')).toBeVisible()
    await page.screenshot({ path: '../.artifacts/moving-desktop.png' })
  })
})
