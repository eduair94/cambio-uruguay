import { expect, test, type Locator, type Page } from '@playwright/test'

test.use({ extraHTTPHeaders: { 'Accept-Language': 'es-UY,es;q=0.9' } })

// Fresh contexts: no cookie/storage seeds, hidden banners, or forced clicks.
const directories = [
  {
    name: 'rentals',
    path: '/alquileres-uruguay?department=Montevideo&monthlyMax=65000',
    trigger: 'rental-mobile-filters-trigger',
    budget: 'Presupuesto mensual máximo ($)',
    parameter: 'monthlyMax',
    original: '65000',
    next: '55000',
    advanced: 'Más filtros',
    apply: 'Aplicar filtros',
    hasMap: true,
    cheapest: 'Precio: menor a mayor',
    card: '.rental-card',
  },
  {
    name: 'sales',
    path: '/venta-viviendas-uruguay?department=Montevideo&maxPrice=2000000',
    trigger: 'sale-filter-trigger',
    budget: 'Precio hasta',
    parameter: 'maxPrice',
    original: '2000000',
    next: '180000',
    advanced: 'Características',
    apply: 'Ver resultados',
    hasMap: true,
    cheapest: 'Menor precio',
    card: '.sale-card',
  },
  {
    name: 'opportunities',
    path: '/oportunidades-inmobiliarias-uruguay?operation=rent&department=Montevideo&maxPrice=65000',
    trigger: 'opportunity-filter-trigger',
    budget: 'Máximo mensual (UYU)',
    parameter: 'maxPrice',
    original: '65000',
    next: '55000',
    advanced: 'Tipo de evidencia',
    apply: 'Ver resultados',
    hasMap: false,
    cheapest: 'Menor precio',
    card: '.opportunity-card',
  },
]

async function clearConsentByChoice(page: Page) {
  const consent = page.getByTestId('cookie-consent-inline')
  await expect(consent).toBeVisible()
  await expect(consent).toHaveCSS('position', 'static')
  // A real gesture gates hydration and preserves the initial visitor experience.
  await expect(async () => {
    await consent.getByRole('button', { name: 'Rechazar', exact: true }).click()
    await expect(consent).toBeHidden({ timeout: 1500 })
  }).toPass({ timeout: 60000 })
}

async function expectReachable(button: Locator) {
  await expect(button).toBeInViewport()
  const state = await button.evaluate(element => {
    const box = element.getBoundingClientRect()
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
    return { width: box.width, height: box.height, clear: hit === element || element.contains(hit) }
  })
  expect(state.width).toBeGreaterThanOrEqual(44)
  expect(state.height).toBeGreaterThanOrEqual(44)
  expect(state.clear).toBe(true)
}

for (const width of [320, 390]) {
  for (const directory of directories) {
    test(`${directory.name} compact mobile filters keep draft, focus and budget at ${width}px`, async ({
      page,
    }) => {
      test.setTimeout(180000)
      await page.setViewportSize({ width, height: 844 })
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(directory.path, { waitUntil: 'domcontentloaded' })
      await clearConsentByChoice(page)
      // Real client navigation also supports review previews whose SSR database
      // differs from the public read-only catalogue used by the browser.
      await page.getByLabel('Ordenar', { exact: true }).click()
      await page.getByRole('option', { name: directory.cheapest, exact: true }).click()
      await expect(page.locator(directory.card).first()).toBeVisible()
      const trigger = page.getByTestId(directory.trigger)
      const dialog = page.getByRole('dialog', { name: 'Filtros', exact: true })
      await expect(dialog).toBeHidden()
      await page.evaluate(() => scrollTo(0, 1200))
      await expectReachable(trigger)
      const origin = await page.evaluate(() => scrollY)
      const url = page.url()
      await trigger.click()
      await expect(dialog).toBeVisible()
      await expect(dialog.locator('details')).not.toHaveAttribute('open', '')
      const budget = dialog.getByRole('spinbutton', { name: directory.budget, exact: true })
      await expect(budget).toHaveValue(directory.original)
      await budget.fill(directory.next)
      expect(page.url()).toBe(url)
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await expect(trigger).toBeFocused()
      expect(Math.abs((await page.evaluate(() => scrollY)) - origin)).toBeLessThan(4)
      expect(page.url()).toBe(url)

      await trigger.click()
      await expect(budget).toHaveValue(directory.original)
      const summary = dialog.locator('summary').filter({ hasText: directory.advanced })
      await summary.click()
      await expect(dialog.locator('details')).toHaveAttribute('open', '')
      await summary.click()
      await budget.fill(directory.next)
      await dialog.getByRole('button', { name: directory.apply, exact: true }).click()
      await expect(dialog).toBeHidden()
      await expect
        .poll(() => new URL(page.url()).searchParams.get(directory.parameter))
        .toBe(directory.next)
      expect(new URL(page.url()).searchParams.get('department')).toBe('Montevideo')

      if (directory.hasMap) {
        await page.getByRole('button', { name: 'Mapa', exact: true }).click()
        await expect.poll(() => new URL(page.url()).searchParams.get('view')).toBe('mapa')
        await expectReachable(trigger)
      }
      await trigger.click()
      await expect(budget).toHaveValue(directory.next)
      await budget.focus()
      await page.setViewportSize({ width, height: 360 })
      await expectReachable(dialog.getByRole('button', { name: directory.apply, exact: true }))
      await expectReachable(dialog.getByRole('button', { name: 'Cerrar filtros', exact: true }))
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false
      )
      expect(errors).toEqual([])
    })
  }
}
