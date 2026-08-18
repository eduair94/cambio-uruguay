import { test, expect } from '@playwright/test'

// Developer portal: dev-hub header (SSR) + embedded Scalar API reference.
//
// The default 30s per-test budget is not enough here: Scalar is a large
// client-side app that mounts, fetches /openapi.json and renders the whole
// document, and on a cold Nuxt dev server that lands around the half-minute
// mark. The suite already treats slow client mounts this way (where-to-change).
test.describe('/desarrolladores', () => {
  test.setTimeout(120_000)

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
    // It used to wait for the operation summary "All current quotes", which was
    // failing two different ways at once and each one hid the other:
    //
    //   1. TIMING. Scalar mounts slowly against the dev server this suite drives.
    //      Measured on run 32194112784 the old assertion passed at 27.8s with a
    //      30s budget, and earlier runs blew past it — a 2-second coin flip, not
    //      a bug. Anything gated on Scalar being fully painted is a flake.
    //   2. ENVIRONMENT. In the production build that string never appears at all:
    //      polled for 40s against cambio-uruguay.com/desarrolladores, the summary
    //      is absent while the title and the paths are both present. The dev build
    //      renders it and the production build does not, so the assertion was also
    //      testing something the deployed site never shows.
    //
    // The environment half is fixed by asserting on what our spec puts on the
    // page instead of on a label Scalar chose: `info.title` as the heading, and a
    // real path. Both are present in the production build, where the summary is
    // not, and neither can be changed by a Scalar upgrade.
    //
    // The timing half needs a bigger budget, and 30s is not it — that was still
    // the old number and this assertion inherited the same coin flip, failing on
    // run 32195300036. Scalar does not paint the header early and fill in the
    // rest; the document appears in one go at around the half-minute mark on this
    // dev server. So the budget has to clear that comfortably rather than land on
    // it, which is the same reason where-to-change runs at 120s.
    await expect(
      page.getByRole('heading', { name: 'Cambio Uruguay Public API', level: 1 })
    ).toBeVisible({ timeout: 90_000 })

    // ...and it rendered the operations, not just the document header. Cheap once
    // the assertion above has already waited out the mount.
    await expect(page.getByText('/exchange/{origin}/{code}').first()).toBeVisible({
      timeout: 15_000,
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
