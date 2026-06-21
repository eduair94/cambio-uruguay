// app/tests/e2e/legal.spec.ts
import { test, expect } from '@playwright/test'

// Force Spanish locale: pre-set the i18n language cookie so detectBrowserLanguage
// doesn't redirect the system Chrome (en-US) to /en and translate page content.
test.use({ extraHTTPHeaders: { 'Accept-Language': 'es-UY,es;q=0.9' } })

const pages = [
  { path: '/privacidad', heading: /Política de Privacidad/i },
  { path: '/terminos', heading: /Términos de Uso/i },
  { path: '/contacto', heading: /Contacto/i },
]

test.describe('legal pages', () => {
  // Dev server takes ~50 s per page load; give 180 s so assertions have room.
  test.setTimeout(180_000)

  test.beforeEach(async ({ context, page }) => {
    // Pin locale to Spanish before any navigation.
    await context.addCookies([{ name: 'lang', value: 'es', domain: 'localhost', path: '/' }])
    // Suppress the JoinTwitter bottom-sheet before page scripts run (it appears
    // after 20-79 s randomly and can block consent-banner clicks at the headless
    // 1280x720 viewport where both sit at the bottom of the screen).
    await page.addInitScript(() => localStorage.setItem('not_show_twitter', 'true'))
  })

  for (const p of pages) {
    test(`${p.path} renders with its H1`, async ({ page }) => {
      const res = await page.goto(p.path)
      expect(res?.status()).toBeLessThan(400)
      await expect(page.getByRole('heading', { level: 1, name: p.heading })).toBeVisible()
    })
  }

  test('contact page exposes the admin email', async ({ page }) => {
    await page.goto('/contacto')
    await expect(page.getByRole('link', { name: /admin@cambio-uruguay\.com/i })).toBeVisible()
  })

  test('footer links reach the legal pages', async ({ page }) => {
    await page.goto('/')
    // dismiss banner so it doesn't overlap footer clicks; force:true bypasses
    // the CDP hit-test issue caused by pointer-events:none on the outer wrapper.
    await page.getByRole('button', { name: /Aceptar/i }).click({ force: true })
    await page.getByRole('link', { name: /^Privacidad$/ }).click()
    await expect(page).toHaveURL(/\/privacidad$/)
  })
})
