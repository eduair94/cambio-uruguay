import { expect, test as base, type Page } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

type Scenario = 'success' | 'failed' | 'partial' | 'empty'
interface ComparisonFixture {
  scenario: Scenario
  phase: 'selection' | 'retry'
  pageErrors: string[]
}

// The initial SSR house selector still uses the server's configured rates API.
// Evolution responses are deterministic: this suite checks UI recovery and the
// Chart.js lifecycle, not the availability of a live upstream history endpoint.
const test = base.extend<{ comparison: ComparisonFixture }>({
  comparison: async ({ page, baseURL }, use, testInfo) => {
    const fixture: ComparisonFixture = { scenario: 'success', phase: 'selection', pageErrors: [] }
    const responses: {
      origin: string
      currency: string
      status: number
      points: number
      phase: string
    }[] = []
    let firstOrigin: string | undefined
    let blockedExternal = 0
    page.on('pageerror', error => fixture.pageErrors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error') fixture.pageErrors.push(message.text())
    })
    await page.route('**/*', route => {
      const url = new URL(route.request().url())
      const match = /^\/evolution\/([^/]+)\/([^/]+)$/.exec(url.pathname)
      if (match) {
        const origin = decodeURIComponent(match[1]!)
        const currency = decodeURIComponent(match[2]!)
        firstOrigin ??= origin
        const failed =
          fixture.scenario === 'failed' ||
          (fixture.scenario === 'partial' && origin === firstOrigin)
        const empty = fixture.scenario === 'empty' && origin === firstOrigin
        const evolution = empty
          ? []
          : ['2026-10-21', '2026-10-22'].map((date, i) => ({
              origin,
              code: currency,
              type: '',
              name: currency,
              date,
              buy: 40 + i,
              sell: 42 + i,
            }))
        responses.push({
          origin,
          currency,
          status: failed ? 503 : 200,
          points: failed ? 0 : evolution.length,
          phase: fixture.phase,
        })
        return route.fulfill({
          status: failed ? 503 : 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify(
            failed
              ? { message: 'Synthetic history service unavailable' }
              : {
                  origin,
                  code: currency,
                  type: null,
                  evolution,
                  statistics: {
                    totalDataPoints: evolution.length,
                    dateRange: { start: '2026-10-21', end: '2026-10-22', periodMonths: 6 },
                    buy: { min: 40, max: 41, avg: 40.5, current: 41, change: 2.5 },
                    sell: { min: 42, max: 43, avg: 42.5, current: 43, change: 2.38 },
                  },
                  localData: { name: origin, website: '', maps: '', bcu: '', departments: [] },
                }
          ),
        })
      }
      if (url.origin !== new URL(baseURL!).origin) {
        blockedExternal++
        return route.abort()
      }
      return route.continue()
    })
    try {
      await use(fixture)
    } finally {
      if (testInfo.status !== testInfo.expectedStatus) {
        const diagnosticsPath = testInfo.outputPath('comparison-diagnostics.json')
        await mkdir(testInfo.outputDir, { recursive: true })
        await writeFile(
          diagnosticsPath,
          JSON.stringify(
            {
              url: page.url(),
              scenario: fixture.scenario,
              phase: fixture.phase,
              blockedExternal,
              responses: responses.slice(-30),
              pageErrors: fixture.pageErrors.slice(-20).map(value => value.slice(0, 400)),
            },
            null,
            2
          )
        )
        await testInfo.attach('comparison-diagnostics', {
          contentType: 'application/json',
          path: diagnosticsPath,
        })
      }
    }
  },
})

test.use({ userAgent: 'CambioUruguayComparisonTest/1.0', serviceWorkers: 'block' })

async function selectTwoHouses(page: Page) {
  await page.goto('/comparar')
  await expect(page.locator('h1')).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => {
        const root = document.getElementById('__nuxt') as HTMLElement & {
          __vue_app__?: { config: { globalProperties: { $nuxt?: { isHydrating: boolean } } } }
        }
        return root?.__vue_app__?.config.globalProperties.$nuxt?.isHydrating === false
      })
    )
    .toBe(true)
  const houses = page.getByTestId('compare-houses')
  const options = page.locator('.v-overlay .v-list-item')
  await expect(async () => {
    await houses.locator('input').click()
    await expect(options.nth(1)).toBeVisible({ timeout: 5000 })
  }).toPass({ timeout: 30_000 })
  const names = [
    ((await options.nth(0).locator('.v-list-item-title').textContent()) ?? '').trim(),
    ((await options.nth(1).locator('.v-list-item-title').textContent()) ?? '').trim(),
  ]
  await options.nth(0).click()
  await options.nth(1).click()
  await page.keyboard.press('Escape')
  await expect(houses.locator('.v-chip')).toHaveCount(2)
  await expect.poll(() => new URL(page.url()).searchParams.get('casas')?.split(',').length).toBe(2)
  return names
}

function expectNoChartCrash(comparison: ComparisonFixture) {
  const crashes = comparison.pageErrors.filter(message =>
    /reading 'save'|Cannot read properties of null/.test(message)
  )
  expect(crashes, `chart draw crashed: ${crashes.join(' | ')}`).toEqual([])
}

test.describe('compare exchange houses', () => {
  test.setTimeout(120_000)

  test('selects a currency + two houses and renders a chart and summary', async ({
    page,
    comparison,
  }) => {
    const names = await selectTwoHouses(page)
    await expect(page.locator('canvas').first()).toBeVisible()
    await expect(page.getByTestId('compare-summary')).toBeVisible()
    await expect(page.getByTestId('compare-summary-house')).toHaveText(names)
    await expect(page.getByTestId('compare-unavailable')).toHaveCount(0)
    expectNoChartCrash(comparison)
  })

  test('a total history failure offers retry and restores the selected comparison', async ({
    page,
    comparison,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    comparison.scenario = 'failed'
    const names = await selectTwoHouses(page)
    const notice = page.getByTestId('compare-unavailable')
    await expect(notice).toBeVisible()
    for (const name of names) await expect(notice).toContainText(name)
    await expect(page.getByTestId('compare-summary')).toHaveCount(0)
    await expect(page.locator('canvas')).toHaveCount(0)
    await expect(page.getByTestId('compare-no-history')).toHaveCount(0)
    const selectedUrl = page.url()
    const houses = page.getByTestId('compare-houses')
    await expect(houses.locator('input[type="text"]')).toBeFocused()
    const focusedHeight = await houses.evaluate(element => element.getBoundingClientRect().height)

    comparison.scenario = 'success'
    comparison.phase = 'retry'
    await page.getByTestId('compare-retry').click()
    await expect(page.getByTestId('compare-summary-house')).toHaveText(names)
    await expect(page.locator('canvas').first()).toBeVisible()
    await expect(notice).toHaveCount(0)
    // Blurring the chip selector must not move the button between pointerdown
    // and pointerup. Keep the original single real click as the recovery proof.
    await expect(houses.locator('input[type="text"]')).not.toBeFocused()
    expect(await houses.evaluate(element => element.getBoundingClientRect().height)).toBe(
      focusedHeight
    )
    expect(page.url()).toBe(selectedUrl)
    await expect(houses.locator('.v-chip')).toHaveCount(2)
    expectNoChartCrash(comparison)
  })

  test('a failed house is named while the other history stays available', async ({
    page,
    comparison,
  }) => {
    comparison.scenario = 'partial'
    const names = await selectTwoHouses(page)
    const notice = page.getByTestId('compare-unavailable')
    await expect(notice).toContainText(names[0]!)
    await expect(notice).not.toContainText(names[1]!)
    await expect(page.getByTestId('compare-summary-house')).toHaveText([names[1]!])
    await expect(page.locator('canvas').first()).toBeVisible()
    await expect(page.getByTestId('compare-no-history')).toHaveCount(0)
    expectNoChartCrash(comparison)
  })

  test('an explicitly empty history is distinguished from a failed request', async ({
    page,
    comparison,
  }) => {
    comparison.scenario = 'empty'
    const names = await selectTwoHouses(page)
    await expect(page.getByTestId('compare-no-history')).toContainText(names[0]!)
    await expect(page.getByTestId('compare-unavailable')).toHaveCount(0)
    await expect(page.getByTestId('compare-retry')).toHaveCount(0)
    await expect(page.getByTestId('compare-summary-house')).toHaveText([names[1]!])
    expectNoChartCrash(comparison)
  })
})
