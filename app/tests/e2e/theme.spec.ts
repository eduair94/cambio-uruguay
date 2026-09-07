import { expect, test, type Page } from '@playwright/test'

test.use({
  locale: 'es-UY',
  extraHTTPHeaders: { 'Accept-Language': 'es-UY,es;q=0.9' },
  serviceWorkers: 'block',
})

test.beforeEach(async ({ context }) => {
  // These browser checks never write reports, subscriptions, analytics or auth.
  await context.route('**/*', route =>
    ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())
      ? route.continue()
      : route.abort('blockedbyclient')
  )
})

async function hydrateWithConsentGesture(page: Page) {
  const consent = page.getByTestId('cookie-consent-inline')
  await expect(consent).toBeVisible()
  await expect(async () => {
    if (await consent.isVisible()) {
      await consent.getByRole('button', { name: 'Rechazar', exact: true }).click()
    }
    await expect(consent).toBeHidden()
  }).toPass({ timeout: 60000 })
}

// The light first-visit default does not replace a stored dark/system choice.
test.describe('theme switcher', () => {
  test.setTimeout(120_000)

  test('cycles the theme and persists the choice across reloads', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/acerca')
    await hydrateWithConsentGesture(page)

    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-theme', 'light')
    // The app-bar toggle (the drawer also has one; scope to the visible bar).
    const toggle = page.locator('.nav-actions [data-testid="theme-toggle"]')
    await expect(toggle).toBeVisible({ timeout: 90_000 })

    // Cycle to dark. Retry clicks until hydration has attached the handler and
    // the cycle reaches dark. Checking before each
    // click avoids overshooting past dark -> system.
    await expect(async () => {
      if ((await html.getAttribute('data-theme')) !== 'dark') await toggle.click()
      expect(await html.getAttribute('data-theme')).toBe('dark')
    }).toPass({ timeout: 60_000 })

    // Persisted choice survives a reload.
    await page.reload()
    await expect(html).toHaveAttribute('data-theme', 'dark')
    const stored = await page.evaluate(() => window.localStorage.getItem('cu_theme'))
    expect(stored).toBe('dark')
  })

  test('keeps an explicit system preference and reacts to OS changes', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('cu_theme', 'system'))
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/acerca')
    await hydrateWithConsentGesture(page)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('.v-application')).toHaveClass(/v-theme--dark/)
    await page.emulateMedia({ colorScheme: 'light' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.locator('.v-application')).toHaveClass(/v-theme--light/)
    expect(await page.evaluate(() => localStorage.getItem('cu_theme'))).toBe('system')
  })

  test('footer links and keyboard skip link fit at 320px with 200% text', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 })
    await page.goto('/acerca')
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%'
    })
    const skip = page.locator('.skip-link')
    await expect(skip).not.toBeInViewport()
    await page.keyboard.press('Tab')
    await expect(skip).toBeFocused()
    await expect(skip).toBeInViewport()
    const skipBox = await skip.boundingBox()
    expect(skipBox!.x).toBeGreaterThanOrEqual(0)
    expect(skipBox!.x + skipBox!.width).toBeLessThanOrEqual(320)
    await page.keyboard.press('Enter')
    await expect(page.locator('#main')).toBeFocused()
    await expect(skip).not.toBeInViewport()
    await hydrateWithConsentGesture(page)

    const footer = page.locator('.cu-footer')
    await footer.scrollIntoViewIfNeeded()
    const overflowingLinks = await footer
      .locator('.cu-footer__heading, .cu-footer__link')
      .evaluateAll(elements =>
        elements
          .filter(element => {
            const box = element.getBoundingClientRect()
            return box.left < -1 || box.right > innerWidth + 1
          })
          .map(element => element.textContent)
      )
    expect(overflowingLinks).toEqual([])
    const opportunitiesLink = footer.locator(
      'a.cu-footer__link[href="/oportunidades-inmobiliarias-uruguay"]'
    )
    await opportunitiesLink.focus()
    await expect(opportunitiesLink).toBeFocused()
    await expect(opportunitiesLink).toBeInViewport()
    expect(await footer.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(
      true
    )
  })

  for (const width of [320, 390]) {
    test(`mobile navigation stays closed before and throughout delayed hydration at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 })
      await page.emulateMedia({ colorScheme: 'dark' })
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      await page.addInitScript(() => {
        const state = { allowed: false, flashed: false }
        ;(window as any).__navigationPaint = state
        function inspectPaint() {
          const drawer = document.getElementById('mobile-navigation')
          if (drawer && !state.allowed) {
            const box = drawer.getBoundingClientRect()
            const css = getComputedStyle(drawer)
            if (
              box.width > 0 &&
              box.right > 0 &&
              box.left < innerWidth &&
              css.display !== 'none' &&
              css.visibility !== 'hidden' &&
              Number(css.opacity) > 0
            ) {
              state.flashed = true
            }
          }
          requestAnimationFrame(inspectPaint)
        }
        requestAnimationFrame(inspectPaint)
      })

      let releaseScripts!: () => void
      const scriptsReady = new Promise<void>(resolve => (releaseScripts = resolve))
      await page.route('**/_nuxt/**', async route => {
        if (route.request().resourceType() === 'script') await scriptsReady
        await route.fallback()
      })
      const drawer = page.locator('#mobile-navigation')
      try {
        await page.goto('/acerca', { waitUntil: 'commit' })
        await expect(drawer).toBeAttached()
        await expect(drawer).toBeHidden()
        await expect(drawer).toHaveCSS('width', '288px')
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
        await expect(page.locator('.v-application')).toHaveClass(/v-theme--light/)
        // Deliberate slow network window: observe the SSR state before any app JS.
        await page.waitForTimeout(1000)
        expect(await page.evaluate(() => (window as any).__navigationPaint.flashed)).toBe(false)
      } finally {
        releaseScripts()
      }
      await hydrateWithConsentGesture(page)
      await expect(drawer).not.toBeInViewport()
      await expect(drawer).toHaveAttribute('inert', '')
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
      expect(await page.evaluate(() => localStorage.getItem('cu_theme'))).toBeNull()
      expect(await page.evaluate(() => (window as any).__navigationPaint.flashed)).toBe(false)
      await page.evaluate(() => ((window as any).__navigationPaint.allowed = true))

      const menu = page.locator('.v-app-bar [aria-controls="mobile-navigation"]')
      await expect(menu).toHaveAttribute('aria-expanded', 'false')
      await menu.click()
      await expect(drawer).toBeVisible()
      await expect(menu).toHaveAttribute('aria-expanded', 'true')
      await drawer.getByRole('button', { name: 'Cerrar menú', exact: true }).click()
      await expect(drawer).not.toBeInViewport()
      await expect(menu).toHaveAttribute('aria-expanded', 'false')

      // Vuetify keeps the model closed while the edge swipe is in progress.
      // The panel must already follow the finger, before touchend opens it.
      const touch = await page.context().newCDPSession(page)
      try {
        await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true })
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x: 2, y: 200 }],
        })
        for (const x of [35, 110]) {
          await touch.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: 200 }],
          })
        }
        await expect(drawer).toBeInViewport()
        await expect(menu).toHaveAttribute('aria-expanded', 'false')
      } finally {
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        await touch.detach()
      }
      if ((await menu.getAttribute('aria-expanded')) === 'true') {
        await drawer.getByRole('button', { name: 'Cerrar menú', exact: true }).click()
      }
      await expect(drawer).not.toBeInViewport()
      expect(errors).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false
      )
    })
  }
})
