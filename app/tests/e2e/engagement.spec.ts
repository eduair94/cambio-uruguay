import { expect, test, type Page } from '@playwright/test'

test.use({ extraHTTPHeaders: { 'Accept-Language': 'es-UY,es;q=0.9' }, serviceWorkers: 'block' })

async function ready(page: Page, path = '/acerca') {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  const consent = page.getByTestId('cookie-consent-inline')
  await expect(async () => {
    await consent.getByRole('button', { name: 'Rechazar', exact: true }).click()
    await expect(consent).toBeHidden()
  }).toPass({ timeout: 60000 })
}

async function exitLink(page: Page, target = '_self') {
  await page.evaluate(target => {
    const anchor = document.createElement('a')
    anchor.href = 'https://example.com/verified-source?utm_source=cambio'
    anchor.target = target
    anchor.rel = 'noopener noreferrer sponsored'
    anchor.textContent = 'Fuente de prueba'
    anchor.id = 'exit-fixture'
    document.querySelector('main')!.prepend(anchor)
  }, target)
  return page.locator('#exit-fixture')
}

test('mobile first visit: external countdown can be cancelled and never navigates later', async ({
  page,
}) => {
  test.setTimeout(180000)
  await page.setViewportSize({ width: 320, height: 740 })
  await ready(page)
  await expect(page.locator('[role="dialog"]:visible')).toHaveCount(0)
  const link = await exitLink(page)
  await page.clock.install()
  await link.click()
  const dialog = page.getByRole('dialog', { name: 'Vas a salir de Cambio Uruguay' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('example.com', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Redirigiendo en 10 segundos…')).toBeVisible()
  await page.clock.fastForward(3000)
  await expect(dialog.getByText('Redirigiendo en 7 segundos…')).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancelar salida', exact: true }).last().click()
  await expect(dialog).toBeHidden()
  await page.clock.fastForward(12000)
  await expect(page).toHaveURL(/\/acerca$/)
  await expect(link).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})

test('external countdown opens the exact destination after ten seconds', async ({ page }) => {
  test.setTimeout(180000)
  await page.route('https://example.com/**', route =>
    route.fulfill({ body: '<h1>Destino de prueba</h1>', contentType: 'text/html' })
  )
  await ready(page)
  const link = await exitLink(page)
  await page.clock.install()
  await link.click()
  await expect(page.getByRole('dialog', { name: 'Vas a salir de Cambio Uruguay' })).toBeVisible()
  await page.clock.fastForward(10000)
  await expect(page).toHaveURL('https://example.com/verified-source?utm_source=cambio')
})

test('go now preserves a new tab and the visitor can skip further notices', async ({
  page,
  context,
}) => {
  test.setTimeout(180000)
  await context.route('https://example.com/**', route =>
    route.fulfill({ body: 'Destino de prueba' })
  )
  await ready(page)
  const link = await exitLink(page, '_blank')
  await link.click()
  const dialog = page.getByRole('dialog', { name: 'Vas a salir de Cambio Uruguay' })
  const go = dialog.getByRole('link', { name: 'Ir ahora' })
  await expect(go).toHaveAttribute('rel', /sponsored/)
  await dialog.getByLabel('No volver a mostrar durante esta visita').check()
  const popupPromise = context.waitForEvent('page')
  await go.click()
  const popup = await popupPromise
  await expect(popup).toHaveURL('https://example.com/verified-source?utm_source=cambio')
  await popup.close()
  await expect(page).toHaveURL(/\/acerca$/)
  const nextPopup = context.waitForEvent('page')
  await link.click()
  await (await nextPopup).close()
  await expect(dialog).toBeHidden()
})

test('newsletter asks once, remembers refusal and remains in document flow', async ({ page }) => {
  test.setTimeout(180000)
  await ready(page, '/tarjetas-de-credito-uruguay')
  const invitation = page.getByTestId('newsletter-invitation')
  await expect(invitation).toHaveCount(1)
  await invitation.scrollIntoViewIfNeeded()
  await expect(invitation).toHaveCSS('position', 'static')
  await expect(page.locator('[role="dialog"]:visible')).toHaveCount(0)
  await invitation.getByRole('button', { name: /cerrar|ahora no|ocultar|descartar/i }).click()
  await expect(invitation).toBeHidden()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(invitation).toHaveCount(0)
})
