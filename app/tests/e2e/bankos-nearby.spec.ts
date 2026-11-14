import { expect, test } from '@playwright/test'

test.setTimeout(120_000)

test('choose cards here, keep them on reload, and refresh benefits without another GPS request', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const cardRequests: string[] = []
  await page.addInitScript(() => {
    let calls = 0
    Object.defineProperty(window, '__nearbyGpsCalls', { get: () => calls })
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition(success: PositionCallback) {
          calls += 1
          success({ coords: { latitude: -34.9, longitude: -56.16 } } as GeolocationPosition)
        },
      },
    })
  })
  await page.route('**/api/bankos/cerca?**', async route => {
    const cards = new URL(route.request().url()).searchParams.get('cards') || ''
    cardRequests.push(cards)
    await route.fulfill({
      json: {
        found: 1,
        brands: [
          {
            brandId: 'nearby-fixture',
            name: 'Comercio de prueba',
            distanceM: 12,
            locations: 1,
            categories: [],
            yours: cards.includes('itau_debit')
              ? [
                  {
                    bankId: 'itau',
                    bankName: 'Itaú',
                    color: '#EC7000',
                    credit: null,
                    debit: 'Beneficio con débito',
                    days: null,
                    kinds: ['debit'],
                  },
                ]
              : [],
            others: [{ bankId: 'itau', bankName: 'Itaú' }],
          },
        ],
      },
    })
  })

  await page.goto('/descuentos-con-tarjeta-uruguay/cerca-de-mi')
  const debit = page.getByRole('button', { name: 'Itaú Débito', exact: true })
  // The first interaction can reach SSR before hydration. Retry only while still unselected.
  await expect(async () => {
    if ((await debit.getAttribute('aria-pressed')) !== 'true') await debit.click()
    await expect(debit).toHaveAttribute('aria-pressed', 'true')
  }).toPass({ timeout: 45_000 })
  await expect(page).toHaveURL(/\/descuentos-con-tarjeta-uruguay\/cerca-de-mi$/)
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('bankos_cards_v1') || '[]')))
    .toEqual(['itau_debit'])
  expect(cardRequests).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false
  )
  await page
    .locator('.nearby')
    .screenshot({ path: test.info().outputPath('nearby-cards-mobile.png') })

  await page.reload()
  const picker = page.locator('.cards-picker')
  await expect(picker.locator('summary')).toHaveText('Tus tarjetas (1)')
  await expect(picker).not.toHaveAttribute('open')
  await page.getByRole('button', { name: 'Ver si tengo descuento acá', exact: true }).click()
  await expect(page.getByText('Sí, con tu Itaú débito', { exact: true })).toBeVisible()
  expect(cardRequests).toEqual(['itau_debit'])

  await picker.locator('summary').click()
  const credit = page.getByRole('button', { name: 'BROU Crédito', exact: true })
  await credit.focus()
  await page.keyboard.press('Space')
  await expect(credit).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => cardRequests.at(-1)).toBe('brou_credit,itau_debit')

  await debit.click()
  await expect(
    page.getByText('Con tus tarjetas no. Acá descuenta Itaú', { exact: true })
  ).toBeVisible()
  expect(cardRequests.at(-1)).toBe('brou_credit')
  expect(await page.evaluate(() => (window as any).__nearbyGpsCalls)).toBe(1)

  await page.getByRole('button', { name: 'Quitar todas', exact: true }).click()
  await expect(picker.locator('summary')).toHaveText('Elegí tus tarjetas')
  await expect(picker).toHaveAttribute('open')
  await expect(page.getByText('Comercio de prueba', { exact: true })).not.toBeVisible()
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('bankos_cards_v1') || '[]')))
    .toEqual([])
})
