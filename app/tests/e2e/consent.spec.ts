// app/tests/e2e/consent.spec.ts
import { test, expect } from '@playwright/test'

// Force Spanish locale: pre-set the i18n language cookie so detectBrowserLanguage
// doesn't redirect the system Chrome (en-US) to /en and translate button labels.
test.use({
  extraHTTPHeaders: { 'Accept-Language': 'es-UY,es;q=0.9' },
  viewport: { width: 390, height: 844 },
})

test.describe('cookie consent', () => {
  // Each test navigates once and the dev server takes ~50 s per cold load;
  // give 180 s so assertions don't time out on slower machines.
  test.setTimeout(180_000)

  test.beforeEach(async ({ context }) => {
    // Pin locale to Spanish before any navigation.
    await context.addCookies([{ name: 'lang', value: 'es', domain: 'localhost', path: '/' }])
  })

  test('shows the banner on first visit and accepting hides it + persists', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const accept = page.getByRole('button', { name: /Aceptar/i })
    await expect(accept).toBeVisible()

    await expect(page.getByTestId('cookie-consent-inline')).toHaveCSS('position', 'static')
    await expect(async () => {
      await accept.click()
      await expect(accept).toBeHidden()
    }).toPass({ timeout: 60000 })
    await expect(accept).toBeHidden()

    const cookies = await page.context().cookies()
    expect(cookies.find(c => c.name === 'cu_consent')?.value).toBe('granted')

    // Reload: banner must not reappear.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: /Aceptar/i })).toBeHidden()
  })

  test('rejecting persists denied and hides the banner', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const reject = page.getByRole('button', { name: /Rechazar/i })
    await expect(reject).toBeVisible()
    await expect(async () => {
      await reject.click()
      await expect(reject).toBeHidden()
    }).toPass({ timeout: 60000 })

    const cookies = await page.context().cookies()
    expect(cookies.find(c => c.name === 'cu_consent')?.value).toBe('denied')
    await expect(reject).toBeHidden()
  })

  test('footer "Configurar cookies" re-opens the banner after a decision', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(async () => {
      await page.getByRole('button', { name: /Aceptar/i }).click()
      await expect(page.getByRole('button', { name: /Aceptar/i })).toBeHidden()
    }).toPass({ timeout: 60000 })
    await expect(page.getByRole('button', { name: /Aceptar/i })).toBeHidden()

    const trigger = page.getByRole('button', { name: /Configurar cookies/i })
    const dialog = page.getByRole('dialog', { name: 'Tu privacidad' })
    await trigger.click()
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()

    await trigger.click()
    await dialog.getByRole('button', { name: /Rechazar/i }).click()
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()

    await trigger.click()
    await dialog.getByRole('link').click()
    await expect(page).toHaveURL(/\/privacidad$/)
    await expect(dialog).toBeHidden()
    expect((await page.context().cookies()).find(c => c.name === 'cu_consent')?.value).toBe(
      'denied'
    )
  })
})
