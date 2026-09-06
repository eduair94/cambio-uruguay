import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'lang', value: 'es', domain: 'localhost', path: '/' }])
})

test('home never opens a guided tour after consent, gestures or idle', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install()
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const consent = page.getByTestId('cookie-consent-inline')
  await expect(consent).toBeVisible({ timeout: 45_000 })
  await expect(async () => {
    await consent.getByRole('button', { name: 'Rechazar', exact: true }).click()
    await expect(consent).toBeHidden()
  }).toPass({ timeout: 60_000 })
  await page.mouse.move(30, 300)
  await page.keyboard.press('Tab')
  await page.mouse.wheel(0, 1000)
  await page.clock.fastForward(85000)
  await expect(page.locator('.driver-overlay, .driver-popover')).toHaveCount(0)
  const settings = page.getByRole('button', { name: 'Configurar cookies', exact: true })
  await settings.click()
  await expect(page.getByRole('dialog', { name: 'Tu privacidad' })).toBeVisible()
})

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 1000 },
]) {
  test(`no global support chat after interaction or idle at ${viewport.width}px`, async ({
    page,
    context,
  }) => {
    test.setTimeout(90_000)
    await page.setViewportSize(viewport)
    const requests: string[] = []
    const chatHost = (url: string) => /(?:^|\.)tawk\.to$/i.test(new URL(url).hostname)
    page.on('request', request => {
      if (chatHost(request.url())) requests.push(new URL(request.url()).hostname)
    })
    // A regression is recorded but never initializes the external support service.
    await context.route(/tawk\.to/i, route => route.abort())
    await page.goto('/acerca', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 45_000 })
    // A user control proves hydration without relying on Vue's private DOM fields.
    // The drawer's theme control remains in the DOM while it is off-screen.
    if (viewport.width < 600) {
      await expect(async () => {
        await page.locator('.app-bar .v-app-bar-nav-icon').click()
        await expect(page.locator('.mobile-navigation-drawer')).toBeInViewport()
      }).toPass({ timeout: 45_000 })
    }
    const themeToggle = page.locator(
      viewport.width < 600
        ? '.mobile-navigation-drawer [data-testid="theme-toggle"]'
        : '.nav-actions [data-testid="theme-toggle"]'
    )
    await expect(async () => {
      const previous = await themeToggle.getAttribute('title')
      await themeToggle.click()
      await expect(themeToggle).not.toHaveAttribute('title', previous!)
    }).toPass({ timeout: 45_000 })
    // Cover the old pointer/key/scroll trigger as well as its 6–8 second idle fallback.
    await page.mouse.move(10, 10)
    await page.keyboard.press('Tab')
    await page.mouse.wheel(0, 650)
    await page.waitForTimeout(9500)
    expect(requests).toEqual([])
    await expect(page.locator('iframe[src*="tawk"], [id*="tawk"], [class*="tawk"]')).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: /(?:abrir|open|iniciar|live) chat|chat widget/i })
    ).toHaveCount(0)
    expect(await page.evaluate(() => 'Tawk_API' in window || 'Tawk_LoadStart' in window)).toBe(
      false
    )
    expect(
      await page
        .locator('link[rel="dns-prefetch"], link[rel="preconnect"]')
        .evaluateAll(links => links.some(link => /tawk\.to/i.test((link as HTMLLinkElement).href)))
    ).toBe(false)
  })
}

for (const example of [
  { width: 320, height: 844, theme: 'light' },
  { width: 390, height: 844, theme: 'dark' },
  { width: 1440, height: 1000, theme: 'light' },
]) {
  test(`home donation stays in the document flow at ${example.width}px in ${example.theme}`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: example.width, height: example.height })
    await page.addInitScript(theme => localStorage.setItem('cu_theme', theme), example.theme)
    // A fresh browser has no stored donation preference. It must never overlay the content.
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 45_000 })
    await expect(page.locator('html')).toHaveAttribute('data-theme', example.theme, {
      timeout: 45_000,
    })
    expect(await page.evaluate(() => localStorage.getItem('donationCardMinimized'))).toBeNull()
    const donation = page.locator('.donation-card')
    await expect(donation).toHaveCSS('position', 'static')
    await expect(donation).not.toBeInViewport()
    await donation.scrollIntoViewIfNeeded()
    await expect(donation).toBeInViewport()
    const dimensions = await donation.boundingBox()
    expect(dimensions!.x).toBeGreaterThanOrEqual(0)
    expect(dimensions!.x + dimensions!.width).toBeLessThanOrEqual(example.width + 1)
    const links = donation.locator('a')
    expect(await links.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))).toEqual([
      'https://ko-fi.com/cambio_uruguay',
      'https://mpago.la/19j46vX',
      'https://www.trustpilot.com/review/cambio-uruguay.com',
    ])
    for (const link of await links.all()) {
      await expect(link).toBeVisible()
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    }
    await expect(donation.getByRole('button')).toHaveCount(0)
    await donation.screenshot({ path: testInfo.outputPath('donation-inline.png') })
  })
}
