import { expect, test } from '@playwright/test'

test('shared filters, history, grouped prices and live review states', async ({
  page,
  context,
}) => {
  test.setTimeout(300_000)
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  let reviewMode = 'ok'
  let reviewRequests = 0
  // Synthetic values exercise the UI without storing or depending on real Google review content.
  await page.route('**/api/moving-reviews/**', async route => {
    reviewRequests++
    const url = new URL(route.request().url())
    const key = url.searchParams.get('profileKey')!
    await route.fulfill({
      status: reviewMode === 'rate_limited' ? 429 : 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({
        providerId: 'furniture-home',
        profileKey: key,
        platform: 'google',
        status: reviewMode,
        rating: reviewMode === 'ok' ? 4.2 : null,
        count: reviewMode === 'ok' ? 12 : null,
        checkedAt: '2026-09-14T12:00:00.000Z',
        profileUrl: 'https://www.google.com/maps',
        profileLabel: 'Synthetic test branch',
        attributions: [],
      }),
    })
  })
  const query = page.getByRole('textbox', { name: 'Empresa, localidad o servicio', exact: true })
  async function select(label: string, option: string) {
    await page.getByLabel(label, { exact: true }).focus()
    await page.getByLabel(label, { exact: true }).press('ArrowDown')
    await page.getByRole('option', { name: option, exact: true }).click()
  }
  async function ready() {
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
  await page.goto(
    '/fletes-mudanzas-uruguay?servicio=assembly&departamento=Canelones&q=Furniture&precios=1&orden=precio-asc&campaign=keep',
    { waitUntil: 'domcontentloaded' }
  )
  await ready()
  await expect(query).toHaveValue('Furniture')
  await expect(page.locator('.provider')).toHaveCount(1)
  await expect(page.getByLabel('Con precios publicados', { exact: true })).toBeChecked()
  await page.getByRole('button', { name: 'Copiar búsqueda', exact: true }).click()
  await expect(page.getByText('Enlace copiado', { exact: true })).toBeVisible()
  const shared = new URL(await page.evaluate(() => navigator.clipboard.readText()))
  expect(shared.searchParams.get('departamento')).toBe('Canelones')
  expect(shared.searchParams.get('orden')).toBe('precio-asc')
  expect(shared.searchParams.has('campaign')).toBe(false)
  expect(new URL(page.url()).searchParams.get('campaign')).toBe('keep')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await ready()
  await expect(query).toHaveValue('Furniture')
  await expect(page.getByLabel('Departamento', { exact: true })).toHaveValue('Canelones')

  await select('Departamento', 'Montevideo')
  await expect(page).toHaveURL(/departamento=Montevideo/)
  await page.goBack()
  await expect(page.getByLabel('Departamento', { exact: true })).toHaveValue('Canelones')
  await page.goForward()
  await expect(page.getByLabel('Departamento', { exact: true })).toHaveValue('Montevideo')
  // A pending text edit must never overwrite a history entry with the same committed q.
  await query.fill('pendiente')
  await page.goBack()
  await expect(query).toHaveValue('Furniture')
  await page.waitForTimeout(450)
  expect(new URL(page.url()).searchParams.get('q')).toBe('Furniture')

  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).first().click()
  await expect(page.locator('.provider')).toHaveCount(18)
  expect([...new URL(page.url()).searchParams.entries()]).toEqual([['campaign', 'keep']])
  await select('Servicio', 'Mudanzas')
  await page.getByLabel('Con precios publicados', { exact: true }).check()
  await select('Ordenar por', 'Precio publicado: menor a mayor')
  await expect(page).toHaveURL(/orden=precio-asc/)
  async function amountsByGroup() {
    return page.locator('.directory-section').evaluate(section => {
      const groups: { label: string; amounts: number[] }[] = []
      for (const node of section.querySelectorAll('.price-group, .provider')) {
        if (node.classList.contains('price-group'))
          groups.push({ label: node.textContent || '', amounts: [] })
        else {
          const amount = node
            .querySelector('.price-number')
            ?.textContent?.match(/(?:UYU|USD)\s+([\d.,]+)/)?.[1]
          if (amount)
            groups.at(-1)?.amounts.push(Number(amount.replace(/\./g, '').replace(',', '.')))
        }
      }
      return groups
    })
  }
  const asc = await amountsByGroup()
  expect(asc.length).toBeGreaterThan(1)
  for (const group of asc) expect(group.amounts).toEqual([...group.amounts].sort((a, b) => a - b))
  await select('Ordenar por', 'Precio publicado: mayor a menor')
  await expect(page).toHaveURL(/orden=precio-desc/)
  const desc = await amountsByGroup()
  expect(desc.map(group => group.label)).toEqual(asc.map(group => group.label))
  for (const group of desc) expect(group.amounts).toEqual([...group.amounts].sort((a, b) => b - a))

  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).first().click()
  await query.fill('Furniture')
  await expect(page.locator('.provider')).toHaveCount(1)
  expect(reviewRequests).toBe(0)
  const reviews = page.locator('#furniture-home .provider-reviews')
  await reviews.locator('summary').click()
  await expect(reviews.locator('.review-score')).toHaveCount(2)
  expect(reviewRequests).toBe(2)
  await expect(reviews.locator('.review-score').first()).toContainText('12 opiniones')
  await expect(reviews.locator('.google-mark-light').first()).toBeVisible()
  await expect(
    reviews.getByRole('link', { name: 'Abrir perfil: Furniture Home — Canelones', exact: true })
  ).toHaveAttribute('href', /query_place_id=ChIJ/)
  reviewMode = 'identity_mismatch'
  await reviews.getByRole('button', { name: 'Actualizar puntuación', exact: true }).first().click()
  await expect(reviews.getByText(/El perfil ya no coincide/)).toBeVisible()
  await expect(reviews.locator('.review-score')).toHaveCount(1)
  reviewMode = 'rate_limited'
  await reviews.getByRole('button', { name: 'Actualizar puntuación', exact: true }).first().click()
  await expect(reviews.getByText(/Esperá un minuto/)).toBeVisible()
  await reviews.locator('summary').click()
  reviewMode = 'ok'
  await reviews.locator('summary').click()
  await expect(reviews.locator('.review-score')).toHaveCount(2)
  expect(reviewRequests).toBe(6)

  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
  await reviews.screenshot({ path: '../.artifacts/moving-reviews-synthetic-mobile.png' })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByTestId('theme-toggle').last().click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(reviews.locator('.google-mark-dark').first()).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
  await reviews.screenshot({ path: '../.artifacts/moving-reviews-synthetic-dark.png' })
})
