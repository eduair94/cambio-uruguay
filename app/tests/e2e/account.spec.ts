import { test, expect } from '@playwright/test'

// Smoke test: the auth integration mounts and the login entry point renders.
// (Does not require Firebase env — the login button shows whenever no user is
// signed in, which is the default state.)
test('login entry point is visible in the header', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: /Iniciar sesión|Log in|Entrar/ }).first()
  ).toBeVisible()
})

test('the account dashboard route does not crash', async ({ page }) => {
  // With Firebase configured, the auth middleware redirects a logged-out
  // visitor home. Without it, the page renders empty. Either way it must not
  // throw a client error.
  const errors: string[] = []
  page.on('pageerror', e => errors.push(String(e)))
  await page.goto('/cuenta')
  await page.waitForLoadState('networkidle')
  expect(errors).toEqual([])
})
