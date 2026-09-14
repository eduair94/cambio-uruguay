import { expect, test, type Page } from '@playwright/test'

const directory = '/fletes-mudanzas-uruguay?servicio=freight&departamento=Montevideo'

async function ready(page: Page) {
  await page.waitForFunction(
    () => {
      const root = document.getElementById('__nuxt') as HTMLElement & {
        __vue_app__?: { config: { globalProperties: { $nuxt?: { isHydrating: boolean } } } }
      }
      return root?.__vue_app__?.config.globalProperties.$nuxt?.isHydrating === false
    },
    undefined,
    { timeout: 180_000 }
  )
}

function captureErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (/hydration.*mismatch|mismatch.*hydration/i.test(message.text())) errors.push(message.text())
  })
  return errors
}

test.describe('moving directory progressive hydration', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test.setTimeout(240_000)

  test('keeps full SSR and activates tariffs and reviews after scrolling', async ({ page }) => {
    const errors = captureErrors(page)
    let reviewRequests = 0
    await page.route('**/api/moving-reviews/**', async route => {
      reviewRequests++
      const url = new URL(route.request().url())
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          providerId: 'mudanzas-lugo',
          profileKey: url.searchParams.get('profileKey'),
          platform: 'google',
          status: 'no_reviews',
          rating: null,
          count: null,
          checkedAt: null,
          profileUrl: 'https://www.google.com/maps',
          profileLabel: 'Synthetic test profile',
          attributions: [],
        }),
      })
    })
    const response = await page.goto(directory, { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBe(200)
    const html = await response!.text()
    expect(html.match(/<article\b[^>]+\bclass="provider"/g)).toHaveLength(18)
    expect(html).toMatch(/<article\b[^>]+\bid="casuriaga"/)
    expect(html).toContain('Tasa postal')
    expect(html).toContain('CollectionPage')
    await ready(page)
    await expect(page.locator('#mudanzas-lugo')).not.toBeInViewport()
    expect(reviewRequests).toBe(0)

    const tariffs = page.locator('#depunta .provider-details')
    await tariffs.scrollIntoViewIfNeeded()
    await tariffs.locator('summary').click()
    await expect(async () => {
      await tariffs
        .getByRole('textbox', { name: 'Buscar en estas tarifas', exact: true })
        .fill('heladera')
      await expect(tariffs.locator('tbody tr')).toHaveCount(8)
      await expect(tariffs.locator('tbody tr').first()).toContainText('Heladera')
    }).toPass()

    const reviews = page.locator('#mudanzas-lugo .provider-reviews')
    await reviews.scrollIntoViewIfNeeded()
    await reviews.locator('summary').focus()
    await reviews.locator('summary').press('Enter')
    await expect(
      reviews.getByText('Este perfil todavía no tiene opiniones publicadas.')
    ).toBeVisible()
    expect(reviewRequests).toBe(1)
    await expect(page.locator('#mudanzas-lugo .provider-actions a').first()).toHaveAttribute(
      'href',
      /^https?:\/\//
    )
    const email = page.getByRole('link', {
      name: 'Correo Fletes y Mudanzas Lugo: contacto@mudanzaslugo.com.uy',
      exact: true,
    })
    await expect(email).toHaveAttribute('href', 'mailto:contacto@mudanzaslugo.com.uy')
    await expect(email).toHaveText('Correo · contacto@mudanzaslugo.com.uy')
    expect(errors).toEqual([])
  })

  test('updates offscreen row props and preserves filters through history and reload', async ({
    page,
  }) => {
    const errors = captureErrors(page)
    await page.goto(`${directory}&campaign=keep`, { waitUntil: 'domcontentloaded' })
    await ready(page)
    await expect(page.locator('#depunta')).not.toBeInViewport()
    const query = page.getByRole('textbox', { name: 'Empresa, localidad o servicio', exact: true })
    await query.fill('heladera')
    await expect(page.locator('.provider')).toHaveCount(1)
    await expect(page.locator('#depunta .provider-price')).toContainText('Heladera')
    await expect(page).toHaveURL(/q=heladera/)
    await expect(page.locator('#depunta .provider-price')).toContainText('Tasa postal')
    expect(new URL(page.url()).searchParams.get('campaign')).toBe('keep')

    await page.getByLabel('Con precios publicados', { exact: true }).check()
    await expect(page).toHaveURL(/precios=1/)
    await page.goBack()
    await expect(page.getByLabel('Con precios publicados', { exact: true })).not.toBeChecked()
    await expect(query).toHaveValue('heladera')
    await expect(page.locator('#depunta .provider-price')).toContainText('Heladera')
    await page.goForward()
    await expect(page.getByLabel('Con precios publicados', { exact: true })).toBeChecked()

    await page.reload({ waitUntil: 'domcontentloaded' })
    await ready(page)
    await expect(query).toHaveValue('heladera')
    await expect(page.getByLabel('Con precios publicados', { exact: true })).toBeChecked()
    await expect(page.locator('#depunta .provider-price')).toContainText('Heladera')
    await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).first().click()
    await expect(page.locator('.provider')).toHaveCount(18)
    expect([...new URL(page.url()).searchParams.entries()]).toEqual([['campaign', 'keep']])
    expect(errors).toEqual([])
  })
})
