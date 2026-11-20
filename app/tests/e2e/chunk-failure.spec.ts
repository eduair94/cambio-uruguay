import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { JSDOM } from 'jsdom'
import { expect, test } from '@playwright/test'

// A development server has no split route bundles. Exercise the production manifest,
// choosing the route's dynamic entry rather than an arbitrary dependency of the app entry.
async function loadClientManifest() {
  const manifestFile = [
    'node_modules/.cache/nuxt/.nuxt/dist/server/client.manifest.mjs',
    '.nuxt/dist/server/client.manifest.mjs',
    '.nuxt/dist/server/client.manifest.json',
  ]
    .map(path => resolve(path))
    .find(path => existsSync(path))
  if (!manifestFile) {
    if (process.env.E2E_PROD_SERVER === '1')
      throw new Error('Production chunk recovery tests require the built client manifest')
    return null
  }
  return manifestFile.endsWith('.json')
    ? JSON.parse(readFileSync(manifestFile, 'utf8'))
    : (await import(pathToFileURL(manifestFile).href)).default
}
const cases = [
  ['/guias/credito-prendario-auto-uruguay', 'pages/guias/[slug].vue'],
  ['/que-pasa-si-no-pago-antel', 'pages/que-pasa-si-no-pago-antel.vue'],
  ['/precio/papa-rosada', 'pages/precio/[slug].vue'],
  ['/sucursales/itau', 'pages/sucursales/[origin]/[[location]].vue'],
  ['/', 'pages/index.vue'],
]

test.use({ userAgent: 'CambioUruguayRecoveryTest/1.0', serviceWorkers: 'block' })

for (const [path, source] of cases) {
  test(`a missing initial route bundle preserves the server page: ${path}`, async ({
    page,
    request,
    baseURL,
  }) => {
    const manifest = await loadClientManifest()
    test.skip(!manifest, 'Requires a production build')
    const entry = Object.entries(manifest).find(([name, value]) => {
      const row = value as { src?: string; isDynamicEntry?: boolean }
      return row.isDynamicEntry && (name.endsWith(source) || row.src?.endsWith(source))
    })?.[1] as { file: string } | undefined
    expect(entry, `dynamic entry for ${source}`).toBeDefined()
    const origin = new URL(baseURL!).origin
    const asset = new URL(entry!.file, `${origin}/_nuxt/`).pathname
    const response = await request.get(path)
    expect(response.status()).toBe(200)
    const dom = new JSDOM(await response.text())
    const before = dom.window.document
    const title = before.title
    const h1 = before.querySelector('h1')?.textContent?.trim()
    const robots = before.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null
    const canonical = before.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null
    expect(h1).toBeTruthy()
    dom.window.close()

    let blocked = 0
    let documents = 0
    let blockChunk = true
    await page.route('**/*', route => {
      const url = new URL(route.request().url())
      // No advertising, analytics, third-party scripts or external transports in this test.
      if (url.origin !== origin) return route.abort()
      if (blockChunk && url.pathname === asset) {
        blocked++
        return route.fulfill({ status: 404, contentType: 'text/javascript', body: '' })
      }
      if (route.request().isNavigationRequest() && route.request().frame() === page.mainFrame()) {
        documents++
      }
      return route.continue()
    })
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-startup-recovery]')).toBeVisible()
    expect(blocked).toBeGreaterThan(0)
    await expect(page).toHaveTitle(title)
    await expect(page.locator('[data-startup-content] h1').first()).toHaveText(h1!)
    expect(
      await page.evaluate(
        () => document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null
      )
    ).toBe(robots)
    expect(
      await page.evaluate(
        () => document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null
      )
    ).toBe(canonical)
    await expect(
      page.locator('[data-startup-content] script, [data-startup-content] iframe')
    ).toHaveCount(0)
    await expect(
      page.locator('[data-startup-content] button:enabled, [data-startup-content] input:enabled')
    ).toHaveCount(0)
    // Nuxt's existing chunk recovery may reload once even during initial startup.
    // The static fallback adds no automatic reload. Observe the rendered fallback
    // long enough to catch another immediate retry, without demanding zero native retries.
    const settledDocuments = documents
    expect(settledDocuments).toBeGreaterThanOrEqual(1)
    expect(settledDocuments).toBeLessThanOrEqual(2)
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-startup-recovery]')).toBeVisible()
    expect(documents).toBe(settledDocuments)

    if (path === '/que-pasa-si-no-pago-antel') {
      blockChunk = false
      await page.locator('[data-startup-reload]').click()
      await expect.poll(() => documents).toBe(settledDocuments + 1)
      await expect
        .poll(() =>
          page.evaluate(() => {
            const root = document.getElementById('__nuxt') as HTMLElement & {
              __vue_app__?: {
                config: { globalProperties: { $nuxt?: { isHydrating: boolean } } }
              }
            }
            return root?.__vue_app__?.config.globalProperties.$nuxt?.isHydrating === false
          })
        )
        .toBe(true)
      await expect(page.locator('[data-startup-recovery]')).toHaveCount(0)
      await expect(page.locator('h1').first()).toHaveText(h1!)
      await expect(page).toHaveTitle(title)
      await page.waitForTimeout(1500)
      expect(documents).toBe(settledDocuments + 1)
    }
  })
}
