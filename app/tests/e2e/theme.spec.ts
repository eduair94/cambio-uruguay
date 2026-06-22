import { expect, test } from '@playwright/test'

// e2e for the dark/light theme switcher. Toggling cycles system -> light -> dark
// and the choice is mirrored onto <html data-theme> and persisted across reloads.
test.describe('theme switcher', () => {
  test.setTimeout(120_000)

  test('cycles the theme and persists the choice across reloads', async ({ page }) => {
    await page.goto('/')

    const html = page.locator('html')
    // The app-bar toggle (the drawer also has one; scope to the visible bar).
    const toggle = page.locator('.nav-actions [data-testid="theme-toggle"]')
    await expect(toggle).toBeVisible({ timeout: 90_000 })

    // Cycle to dark. Retry clicks until hydration has attached the handler and
    // the cycle (system -> light -> dark) reaches dark. Checking before each
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
})
