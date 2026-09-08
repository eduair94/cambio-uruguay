import { expect, test, type Page, type TestInfo } from '@playwright/test'

test.use({ locale: 'es-UY', hasTouch: true, serviceWorkers: 'block' })
test.setTimeout(90000)

const confirmedLabel = 'HOCQUART ESQ DEMOCRACIA, MONTEVIDEO, MONTEVIDEO'
const alternativeLabel = 'HOCQUART ESQ MINAS, MONTEVIDEO, MONTEVIDEO'
const streetLabel = 'HOCQUART, MONTEVIDEO, MONTEVIDEO'

async function setup(page: Page) {
  const state = {
    reads: [] as URL[],
    errors: [] as string[],
    delayed: new Set<string>(),
    release: new Map<string, () => void>(),
    status: 200,
    extraPoint: false,
  }
  page.on('pageerror', error => state.errors.push(error.message))
  await page.route('**/*', route => {
    const request = route.request()
    const url = new URL(request.url())
    return ['GET', 'HEAD', 'OPTIONS'].includes(request.method()) &&
      ['localhost', '127.0.0.1'].includes(url.hostname)
      ? route.continue()
      : route.abort('blockedbyclient')
  })
  await page.route(/\/api\/rentals\/geocode(?:\?|$)/, async route => {
    const url = new URL(route.request().url())
    const query = url.searchParams.get('q') || ''
    state.reads.push(url)
    if (state.delayed.has(query))
      await new Promise<void>(resolve => state.release.set(query, resolve))
    const refinement = query === 'Hocq'
    const items = refinement
      ? []
      : [
          {
            label: /Vieja/.test(query) ? 'RESULTADO ANTERIOR' : confirmedLabel,
            lat: -34.88974,
            lng: -56.17683,
            ...(/Hoqcuart/.test(query) ? { suggested: true } : {}),
          },
        ]
    if (state.extraPoint && !refinement)
      items.push({ label: alternativeLabel, lat: -34.892, lng: -56.185 })
    await route
      .fulfill({
        status: state.status,
        json:
          state.status === 200
            ? {
                items,
                refinements: refinement ? [{ label: streetLabel, query: streetLabel }] : [],
                source: 'IDE Uruguay',
              }
            : { statusCode: state.status },
      })
      .catch(() => {})
  })
  await page.goto('/alquiler-ideal-uruguay', { waitUntil: 'domcontentloaded' })
  const consent = page.getByTestId('cookie-consent-inline')
  await expect(consent).toBeVisible()
  await expect(async () => {
    if (await consent.isVisible())
      await consent.getByRole('button', { name: 'Rechazar', exact: true }).click()
    await expect(consent).toBeHidden({ timeout: 1000 })
  }).toPass({ timeout: 60000 })
  await page.getByTestId('fit-next').click()
  await page
    .getByRole('button', { name: 'Agregar trabajo, estudio u otro lugar', exact: true })
    .click()
  await expect(page.getByTestId('rental-reference-address').getByRole('combobox')).toBeVisible()
  return state
}

const input = (page: Page) => page.getByTestId('rental-reference-address').getByRole('combobox')
async function screenshot(page: Page, info: TestInfo, name: string) {
  await page.screenshot({ path: info.outputPath(`${name}.png`), animations: 'disabled' })
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  ).toBeLessThanOrEqual(1)
}

test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) await screenshot(page, info, 'failure').catch(() => {})
})

test('desktop: debounce, minimum length and keyboard selection preserve a confirmed location', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1366, height: 844 })
  const state = await setup(page)
  const field = input(page)
  state.extraPoint = true
  // Control timers after hydration so the debounce assertion does not rely on CPU speed.
  await page.clock.install({ time: new Date('2030-01-01T12:00:00Z') })
  await page.clock.pauseAt(new Date('2030-01-01T12:00:01Z'))
  await field.fill('Hoc')
  await page.clock.runFor(900)
  expect(state.reads).toHaveLength(0)
  await field.fill('Hoqc')
  await page.clock.runFor(400)
  expect(state.reads).toHaveLength(0)
  await field.fill('Hoqcuart y Democracia')
  await page.clock.runFor(599)
  expect(state.reads).toHaveLength(0)
  await page.clock.runFor(2)
  await expect.poll(() => state.reads.length).toBe(1)
  // Resume rendering timers after measuring debounce; overlay focus/visibility
  // transitions must run on the normal browser event loop for keyboard checks.
  await page.clock.resume()
  expect(state.reads[0].searchParams.get('autocomplete')).toBe('1')
  const option = page.getByRole('option', { name: new RegExp(confirmedLabel) })
  await expect(option).toBeVisible()
  await expect(field).toHaveAttribute('aria-expanded', 'true')
  await expect(option).toContainText('Sugerencia')
  await expect(page.locator('.confirmed-point')).toHaveCount(0)
  await field.press('Escape')
  await expect(page.getByRole('listbox')).toBeHidden()
  await expect(field).toHaveValue('Hoqcuart y Democracia')
  await field.press('ArrowUp')
  await expect(option).toBeVisible()
  const alternative = page.getByRole('option', { name: alternativeLabel, exact: true })
  await expect(alternative).toHaveAttribute('aria-selected', 'true')
  await field.press('ArrowDown')
  await expect(option).toHaveAttribute('aria-selected', 'true')
  await field.press('ArrowUp')
  await expect(alternative).toHaveAttribute('aria-selected', 'true')
  await expect(field).toHaveAttribute('aria-activedescendant', /\S/)
  await screenshot(page, info, 'keyboard-1366')
  await field.press('Enter')
  await expect(page.locator('.confirmed-point')).toContainText(alternativeLabel)
  await expect(page.getByRole('listbox')).toBeHidden()
  expect(state.reads).toHaveLength(1)
  await noOverflow(page)
  expect(state.errors).toEqual([])
})

for (const width of [320, 390]) {
  test(`touch ${width}px: a street refinement asks for the number or intersection before confirming a point`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 })
    const state = await setup(page)
    const field = input(page)
    await field.fill('Hocq')
    const refinement = page.getByRole('option').filter({ hasText: streetLabel })
    await expect(refinement).toContainText('Agregá un número o una esquina')
    await expect(page.locator('.confirmed-point')).toHaveCount(0)
    await screenshot(page, info, `street-refinement-${width}`)
    await refinement.tap()
    await expect(field).toHaveValue(streetLabel)
    await expect(page.locator('.confirmed-point')).toHaveCount(0)
    expect(await field.evaluate(element => (element as HTMLInputElement).selectionStart)).toBe(
      'HOCQUART'.length
    )
    await field.pressSequentially(' y Democracia')
    await expect(field).toHaveValue('HOCQUART y Democracia, MONTEVIDEO, MONTEVIDEO')
    const option = page.getByRole('option', { name: confirmedLabel, exact: true })
    await expect(option).toBeVisible()
    const box = await option.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1)
    await noOverflow(page)
    await screenshot(page, info, `intersection-options-${width}`)
    await option.tap()
    await expect(page.locator('.confirmed-point')).toContainText(confirmedLabel)
    await page.getByRole('button', { name: 'Cambiar ubicación', exact: true }).tap()
    await expect(page.locator('.confirmed-point')).toHaveCount(0)
    await expect(input(page)).toBeVisible()
    await noOverflow(page)
    expect(state.errors).toEqual([])
  })
}

test('new input and clear discard old responses and never restore an obsolete option', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await setup(page)
  const field = input(page)
  state.delayed.add('Vieja dirección')
  state.delayed.add('Pendiente dirección')
  try {
    await field.fill('Vieja dirección')
    await expect.poll(() => state.release.has('Vieja dirección')).toBe(true)
    await field.fill('Hocquart y Democracia')
    await expect(page.getByRole('option', { name: confirmedLabel, exact: true })).toBeVisible()
    state.release.get('Vieja dirección')!()
    await expect(page.getByRole('option', { name: 'RESULTADO ANTERIOR', exact: true })).toHaveCount(
      0
    )
    await field.fill('Pendiente dirección')
    await expect.poll(() => state.release.has('Pendiente dirección')).toBe(true)
    await page.getByRole('button', { name: 'Limpiar dirección', exact: true }).click()
    state.release.get('Pendiente dirección')!()
    await expect(field).toHaveValue('')
    await expect(page.getByRole('listbox')).toBeHidden()
    await expect(page.locator('.confirmed-point')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Buscar dirección', exact: true })).toBeDisabled()
    await field.fill('Hocquart y Democracia')
    await expect(page.getByRole('option', { name: confirmedLabel, exact: true })).toBeVisible()
    expect(state.reads.every(url => url.searchParams.get('autocomplete') === '1')).toBe(true)
    expect(state.errors).toEqual([])
  } finally {
    state.release.forEach(release => release())
  }
})

test('the search button retries a failed automatic request without changing the entered address', async ({
  page,
}) => {
  const state = await setup(page)
  state.status = 503
  await input(page).fill('Hocquart y Democracia')
  await expect(page.locator('.rental-reference-address [role="alert"]')).toBeVisible()
  expect(state.reads).toHaveLength(1)
  state.status = 200
  await page.getByRole('button', { name: 'Buscar dirección', exact: true }).click()
  await expect(page.getByRole('option', { name: confirmedLabel, exact: true })).toBeVisible()
  await expect(input(page)).toHaveValue('Hocquart y Democracia')
  expect(state.reads).toHaveLength(2)
  await expect(page.locator('.confirmed-point')).toHaveCount(0)
  expect(state.errors).toEqual([])
})

test('Escape dismisses an in-flight suggestion without reopening it when the response arrives', async ({
  page,
}) => {
  const state = await setup(page)
  const query = 'Hocquart y Democracia'
  state.delayed.add(query)
  try {
    await input(page).fill(query)
    await expect.poll(() => state.release.has(query)).toBe(true)
    await expect(input(page)).toHaveAttribute('aria-busy', 'true')
    await input(page).press('Escape')
    state.release.get(query)!()
    await expect(input(page)).toHaveAttribute('aria-busy', 'false')
    await expect(page.getByRole('listbox')).toBeHidden()
    await expect(input(page)).toHaveValue(query)
    state.delayed.delete(query)
    await input(page).press('Enter')
    await expect(page.getByRole('option', { name: confirmedLabel, exact: true })).toBeVisible()
    await expect(page.locator('.confirmed-point')).toHaveCount(0)
    expect(state.errors).toEqual([])
  } finally {
    state.release.forEach(release => release())
  }
})
