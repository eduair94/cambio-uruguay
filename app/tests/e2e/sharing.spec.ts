import { expect, test, type Page } from '@playwright/test'

async function openSharing(page: Page) {
  await expect(async () => {
    if (!(await page.getByRole('dialog').isVisible())) {
      // The footer's share button: /buscar has no button of its own, and the footer one shares
      // the current route with its filters, like any other.
      await page
        .locator('.cu-footer')
        .getByRole('button', { name: 'Compartir', exact: true })
        .click()
    }
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 90_000 })
  await expect(page.getByRole('dialog').locator('input')).toBeVisible({ timeout: 20_000 })
  return page.getByRole('dialog')
}

test.describe('public sharing', () => {
  test.setTimeout(150_000)

  test('keeps the current filters in a short link and downloads a real PNG on a narrow phone', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 780 })
    let submitted: Record<string, string> | undefined
    await page.route('**/api/share-links', async route => {
      submitted = route.request().postDataJSON()
      await route.fulfill({
        json: {
          id: 'testshare123',
          url: 'https://cambio-uruguay.com/s/testshare123',
          ...submitted,
        },
      })
    })
    await page.goto('/buscar?q=autos', { waitUntil: 'domcontentloaded' })
    // After hydration: /buscar syncs its own query on mount, which would overwrite the emulation.
    await page.waitForFunction(
      () =>
        !!(document.querySelector('#__nuxt') as unknown as { __vue_app__?: unknown })?.__vue_app__
    )
    await page.waitForTimeout(1000)
    // Emulates catalogues that write history without notifying Vue Router.
    await page.evaluate(() =>
      history.replaceState(history.state, '', '/buscar?q=sillas&utm_source=demo&token=secret')
    )
    const dialog = await openSharing(page)
    expect(submitted?.path).toBe('/buscar?q=sillas')
    await expect(dialog.locator('input')).toHaveValue('https://cambio-uruguay.com/s/testshare123')
    await expect(dialog.getByRole('link', { name: 'Compartir en WhatsApp' })).toHaveAttribute(
      'href',
      /wa\.me.*testshare123/
    )
    const downloadPromise = page.waitForEvent('download')
    await dialog.getByRole('link', { name: 'Descargar tarjeta' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('cambio-uruguay.png')
    const image = dialog.locator('img')
    await expect(image).toBeVisible()
    expect(
      await image.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])
    ).toEqual([1200, 630])
    const overflow = await dialog.evaluate(el => el.scrollWidth > el.clientWidth + 1)
    expect(overflow).toBe(false)
    await page.screenshot({ path: 'test-results/sharing-mobile.png' })
  })

  test('keeps a usable full link on server failure and explains clipboard failure', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.reject(new Error('denied')) },
      })
    })
    await page.route('**/api/share-links', route =>
      route.fulfill({ status: 503, json: { message: 'unavailable' } })
    )
    await page.goto('/buscar?q=autos')
    const dialog = await openSharing(page)
    await expect(
      dialog.getByText('No pudimos crear el enlace corto.', { exact: false })
    ).toBeVisible()
    await expect(dialog.locator('input')).toHaveValue('https://cambio-uruguay.com/buscar?q=autos')
    await dialog.getByRole('button', { name: 'Copiar enlace', exact: true }).click()
    await expect(
      dialog.getByText('No se pudo copiar automáticamente.', { exact: false })
    ).toBeVisible()
    await dialog.locator('input').focus()
    expect(
      await dialog
        .locator('input')
        .evaluate((input: HTMLInputElement) => input.selectionEnd! - input.selectionStart!)
    ).toBeGreaterThan(20)
  })

  test('calls native sharing from a click and treats cancellation quietly', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true })
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: (data: ShareData) => {
          ;(window as unknown as { sharedPayload: unknown }).sharedPayload = {
            ...data,
            activated: navigator.userActivation.isActive,
          }
          return Promise.reject(new DOMException('cancelled', 'AbortError'))
        },
      })
    })
    await page.goto('/buscar')
    const dialog = await openSharing(page)
    await dialog.getByRole('button', { name: 'Compartir con una app', exact: true }).click()
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { sharedPayload: { activated: boolean } }).sharedPayload.activated
      )
    ).toBe(true)
    await expect(dialog.locator('.share-panel__feedback')).toBeEmpty()
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
  })
})
