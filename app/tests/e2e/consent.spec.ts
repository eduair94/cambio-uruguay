// app/tests/e2e/consent.spec.ts
import { test, expect } from '@playwright/test'

// Force Spanish locale: pre-set the i18n language cookie so detectBrowserLanguage
// doesn't redirect the system Chrome (en-US) to /en and translate button labels.
test.use({ extraHTTPHeaders: { 'Accept-Language': 'es-UY,es;q=0.9' } })

test.describe('cookie consent', () => {
  // Each test navigates once and the dev server takes ~50 s per cold load;
  // give 180 s so assertions don't time out on slower machines.
  test.setTimeout(180_000)

  test.beforeEach(async ({ context, page }) => {
    // Pin locale to Spanish before any navigation.
    await context.addCookies([{ name: 'lang', value: 'es', domain: 'localhost', path: '/' }])
    // Suppress the JoinTwitter bottom-sheet before page scripts run (it appears
    // after 20-79 s randomly and can block consent-banner clicks at the headless
    // 1280x720 viewport where both sit at the bottom of the screen).
    await page.addInitScript(() => localStorage.setItem('not_show_twitter', 'true'))
  })

  test('shows the banner on first visit and accepting hides it + persists', async ({ page }) => {
    await page.goto('/')
    const accept = page.getByRole('button', { name: /Aceptar/i })
    await expect(accept).toBeVisible()

    // force:true bypasses Playwright's pointer-event hit-test: the outer
    // .cookie-consent wrapper uses pointer-events:none (so page content
    // beneath the transparent padding stays clickable) while the card and
    // buttons inside use pointer-events:auto — CDP hit-testing sees the
    // wrapper first and can't route to the button without force.
    await accept.click({ force: true })
    await expect(accept).toBeHidden()

    const cookies = await page.context().cookies()
    expect(cookies.find(c => c.name === 'cu_consent')?.value).toBe('granted')

    // Reload: banner must not reappear.
    await page.reload()
    await expect(page.getByRole('button', { name: /Aceptar/i })).toBeHidden()
  })

  test('rejecting persists denied and hides the banner', async ({ page }) => {
    await page.goto('/')
    const reject = page.getByRole('button', { name: /Rechazar/i })
    await expect(reject).toBeVisible()
    await reject.click({ force: true })

    const cookies = await page.context().cookies()
    expect(cookies.find(c => c.name === 'cu_consent')?.value).toBe('denied')
    await expect(reject).toBeHidden()
  })

  test('footer "Configurar cookies" re-opens the banner after a decision', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Aceptar/i }).click({ force: true })
    await expect(page.getByRole('button', { name: /Aceptar/i })).toBeHidden()

    await page.getByRole('button', { name: /Configurar cookies/i }).click()
    await expect(page.getByRole('button', { name: /Aceptar/i })).toBeVisible()
  })
})
