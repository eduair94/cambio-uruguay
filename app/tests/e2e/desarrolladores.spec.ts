import { test, expect } from '@playwright/test'

// Developer portal: dev-hub header (SSR) + embedded Scalar API reference.
test.describe('/desarrolladores', () => {
  test('renders the dev hub header and serves the OpenAPI spec', async ({ page, request }) => {
    await page.goto('/desarrolladores')

    // Server-rendered hub header is reliable immediately.
    await expect(page.getByRole('heading', { level: 1, name: /Desarrolladores/i })).toBeVisible()
    await expect(page.getByText('https://api.cambio-uruguay.com').first()).toBeVisible()

    // The spec the page (and external tools) consume must be reachable + valid.
    const res = await request.get('/openapi.json')
    expect(res.ok()).toBeTruthy()
    const spec = await res.json()
    expect(spec.openapi).toBe('3.1.0')
  })

  test('mounts the Scalar API reference', async ({ page }) => {
    await page.goto('/desarrolladores')

    // What this test is for: Scalar mounted, fetched /openapi.json client-side,
    // and rendered OUR document — not somebody's placeholder and not an empty
    // shell. So it asserts on values that come from the spec we publish.
    //
    // It used to wait for the operation summary "All current quotes" and timed
    // out for 30s on every run. Scalar was mounting fine the whole time; it just
    // lists operations as method + path (`GET /`, `GET /exchange/{origin}/{code}`)
    // rather than by summary, so that string is nowhere in the document. Which
    // label Scalar chooses to show is its presentation decision and can change on
    // any upgrade — the title and the paths are ours and cannot.
    await expect(
      page.getByRole('heading', { name: 'Cambio Uruguay Public API', level: 1 })
    ).toBeVisible({ timeout: 30_000 })

    // ...and it rendered the operations, not just the document header.
    await expect(page.getByText('/exchange/{origin}/{code}').first()).toBeVisible({
      timeout: 30_000,
    })
  })

  test('/developers alias resolves to the same page', async ({ page }) => {
    const res = await page.goto('/developers')
    expect(res?.status()).toBeLessThan(400)
    await expect(
      page.getByRole('heading', { level: 1, name: /Developers|Desarrolladores/i })
    ).toBeVisible()
  })
})
