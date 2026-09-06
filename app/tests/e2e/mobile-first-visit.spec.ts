import { expect, test } from '@playwright/test'

test.use({
  extraHTTPHeaders: { 'Accept-Language': 'es-UY,es;q=0.9' },
  serviceWorkers: 'block',
})

for (const width of [320, 390]) {
  test(`first visit stays usable without automatic promotions at ${width}px`, async ({ page }) => {
    test.setTimeout(180000)
    await page.setViewportSize({ width, height: 844 })
    const errors: string[] = []
    const chatRequests: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => {
      if (/tawk\.(?:to|link)/i.test(request.url())) chatRequests.push(request.url())
    })
    await page.goto('/alquileres-uruguay')
    const consent = page.getByTestId('cookie-consent-inline')
    await expect(consent).toBeVisible()
    await expect(consent).toHaveCSS('position', 'static')
    const reject = consent.getByRole('button', { name: 'Rechazar', exact: true })
    // A real action gates hydration. No saved consent, suppressed popups, or force clicks.
    await expect(async () => {
      await reject.click()
      await expect(consent).toBeHidden()
    }).toPass({ timeout: 60000 })

    // Load a real result set before checking persistence through a long list.
    // Review previews can use a different database for their initial SSR payload.
    await page.getByLabel('Ordenar', { exact: true }).click()
    await page.getByRole('option', { name: 'Precio: menor a mayor', exact: true }).click()
    await expect(page.locator('.rental-card').first()).toBeVisible()

    await page.clock.install()
    const captured = await page.evaluate(() => {
      ;(window as any).__installPrompts = 0
      const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
        prompt: async () => {
          ;(window as any).__installPrompts++
        },
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      })
      window.dispatchEvent(event)
      return event.defaultPrevented
    })
    expect(captured).toBe(true)
    await page.evaluate(() => window.scrollTo(0, 1800))
    const trigger = page.getByTestId('rental-mobile-filters-trigger')
    await expect(trigger).toBeInViewport()
    await trigger.click()
    const dialog = page.getByTestId('rental-mobile-filters-dialog')
    await expect(dialog).toBeVisible()

    // The previous social popup opened after 20–79 seconds, including mid-edit.
    await page.clock.fastForward(85000)
    await expect(page.locator('[role="dialog"]:visible')).toHaveCount(1)
    await expect(dialog.getByTestId('rental-filters-apply')).toBeInViewport()
    const unobstructed = await dialog.getByTestId('rental-filters-apply').evaluate(button => {
      const box = button.getBoundingClientRect()
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
      return hit === button || button.contains(hit)
    })
    expect(unobstructed).toBe(true)
    expect(await page.evaluate(() => (window as any).__installPrompts)).toBe(0)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()

    // Installation is still available, in the footer, when the visitor asks for it.
    await page.getByTestId('pwa-install-action').click()
    expect(await page.evaluate(() => (window as any).__installPrompts)).toBe(1)
    expect(chatRequests).toEqual([])
    expect(errors).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  })
}
