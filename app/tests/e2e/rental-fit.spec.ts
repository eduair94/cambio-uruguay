import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test'
import type { RentalFitInput, RentalFitResponse, RentalFitResult } from '../../utils/rentalFitTypes'
import type { RentalOffer, RentalPublicProperty } from '../../utils/rentals'

test.use({
  locale: 'es-UY',
  serviceWorkers: 'block',
  extraHTTPHeaders: { 'Accept-Language': 'es-UY,es;q=0.9' },
})
test.setTimeout(120_000)
test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) {
    await page
      .screenshot({ path: info.outputPath('failure.png'), animations: 'disabled' })
      .catch(() => {})
  }
})

const address = 'HOCQUART ESQ DEMOCRACIA, MONTEVIDEO, MONTEVIDEO'
const imageUrl = 'https://example.invalid/fit-fixture.png'
const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
)

// Presentation fixtures only. The pure engine and server suites verify ranking,
// catalogue eligibility, freshness and privacy against their own evidence.
function fixture(input: RentalFitInput): RentalFitResponse {
  const observedAt = new Date().toISOString()
  const results: RentalFitResult[] = Array.from({ length: 8 }, (_, index) => {
    const missing = index === 7
    const offer: RentalOffer = {
      source: 'infocasas',
      listingId: `fit-${index}`,
      title: `Apartamento de prueba ${index + 1}`,
      url: `https://www.infocasas.com.uy/fixture/${index}`,
      price: 18000 + index * 300,
      priceUyu: 18000 + index * 300,
      currency: 'UYU',
      commonExpenses: missing ? null : 2000,
      commonExpensesCurrency: missing ? null : 'UYU',
      sellerName: 'Anunciante de prueba',
      sellerType: 'desconocido',
      image: imageUrl,
      parkingSpaces: null,
      furnished: null,
      publishedAt: observedAt,
      firstSeen: observedAt,
      lastSeen: observedAt,
    }
    const property: RentalPublicProperty = {
      key: `fit-fixture-${index}`,
      title: offer.title,
      propertyType: 'apartamento',
      department: 'Montevideo',
      neighborhood: 'Cordón',
      address: '',
      latitude: missing ? null : -34.9,
      longitude: missing ? null : -56.16,
      bedrooms: 2,
      bathrooms: 1,
      area: 54,
      parkingSpaces: null,
      furnished: null,
      petsAllowed: null,
      guarantees: [],
      price: offer.price,
      priceUyu: offer.priceUyu,
      currency: 'UYU',
      offers: [offer],
      matchingOffer: offer,
      sources: ['infocasas'],
      freshAt: observedAt,
      firstSeen: observedAt,
      lastSeen: observedAt,
    }
    const trips = input.people.flatMap(person =>
      person.destinations
        .filter(place => place.days > 0)
        .map(place => ({
          personId: person.id,
          destinationId: place.id,
          distanceKm: missing ? null : 1.25 + index,
          withinTarget: missing ? null : true,
        }))
    )
    return {
      property,
      offer,
      point: missing ? null : { lat: -34.9, lng: -56.16 },
      score: 77.6479 - index * 4,
      budgetScore: missing ? 0 : 55,
      commuteScore: trips.length && !missing ? 80 : null,
      complete: !missing,
      rentUyu: offer.priceUyu!,
      expensesUyu: missing ? null : 2000,
      monthlyUyu: missing ? null : offer.priceUyu! + 2000,
      remainingUyu: missing ? null : 30500 - index * 300,
      incomeShare: missing ? null : 0.28,
      overBudget: false,
      weeklyDistanceKm: missing ? null : trips.length * 12.5,
      worstPersonDistanceKm: trips.length && !missing ? 1.25 + index : null,
      trips,
      reasons: [trips.length ? 'within_budget' : 'remote_household'],
      warnings: missing
        ? ['unknown_expenses', ...(trips.length ? ['unknown_location' as const] : [])]
        : [],
    }
  })
  return {
    generatedAt: observedAt,
    usdUyu: 40,
    scanned: 1980,
    matched: 38,
    complete: 30,
    incomplete: 8,
    results,
  }
}

async function setup(page: Page) {
  const state = {
    requests: [] as RentalFitInput[],
    geocodes: [] as URL[],
    errors: [] as string[],
    pending: false,
    releases: [] as (() => void)[],
    invalidAddress: false,
    status: 200,
  }
  page.on('pageerror', error => state.errors.push(error.message))
  page.on('pageerror', error => console.log(`Browser error: ${error.message}`))
  await page.route('**/*', route => {
    const request = route.request()
    const url = new URL(request.url())
    // No analytics, public reads, login, subscriptions or database writes.
    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method())
    )
      return route.abort('blockedbyclient')
    return route.continue()
  })
  await page.route(imageUrl, route => route.fulfill({ contentType: 'image/png', body: pixel }))
  await page.route(/https:\/\/[^/]*tile\.openstreetmap\.org\//, route =>
    route.fulfill({ contentType: 'image/png', body: pixel })
  )
  await page.route(/\/api\/rentals\/geocode(?:\?|$)/, route => {
    state.geocodes.push(new URL(route.request().url()))
    return route.fulfill({
      json: {
        source: 'IDE Uruguay',
        items: [
          {
            label: address,
            lat: state.invalidAddress ? 0 : -34.88974,
            lng: state.invalidAddress ? 0 : -56.17683,
          },
        ],
      },
    })
  })
  await page.route(/\/api\/rentals\/fit(?:\?|$)/, async route => {
    expect(route.request().method()).toBe('POST')
    const input = route.request().postDataJSON() as RentalFitInput
    state.requests.push(input)
    if (state.pending) await new Promise<void>(resolve => state.releases.push(resolve))
    await route
      .fulfill({
        status: state.status,
        headers: { 'Cache-Control': 'no-store' },
        json: state.status === 200 ? fixture(input) : { statusCode: state.status },
      })
      .catch(() => {})
  })
  await page.goto('/alquiler-ideal-uruguay', { waitUntil: 'domcontentloaded' })
  const consent = page.getByTestId('cookie-consent-inline')
  await expect(consent).toBeVisible()
  await expect(async () => {
    await consent.getByRole('button', { name: 'Rechazar', exact: true }).click()
    await expect(consent).toBeHidden({ timeout: 1000 })
  }).toPass({ timeout: 60000 })
  await expect(page.getByTestId('fit-budget').locator('input')).toHaveValue('20000')
  return state
}

const visibleStep = (page: Page) => page.locator('.fit-step:visible')
async function select(page: Page, scope: Locator, label: string, option: string) {
  await scope
    .locator('.v-select')
    .filter({ has: scope.page().getByLabel(label, { exact: true }) })
    .locator('.v-field__append-inner')
    .click()
  await page.getByRole('option', { name: option, exact: true }).click()
}
async function confirmAddress(place: Locator) {
  await place.getByTestId('rental-reference-address').locator('input').fill('Hocquart y Democracia')
  await place.getByRole('button', { name: 'Buscar dirección', exact: true }).click()
  await place.getByRole('button', { name: address, exact: true }).click()
  await expect(place.getByText('Ubicación confirmada', { exact: true })).toBeVisible()
}
async function assertNoOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  ).toBeLessThanOrEqual(1)
}
async function screenshot(page: Page, info: TestInfo, name: string) {
  await page.screenshot({ path: info.outputPath(`${name}.png`), animations: 'disabled' })
}
async function compactResultToolbar(page: Page) {
  const toolbar = page.locator('.result-toolbar')
  const rect = await toolbar.boundingBox()
  expect(rect!.height).toBeLessThanOrEqual(70)
  const buttons = toolbar.getByRole('button')
  const edit = await buttons.nth(0).boundingBox()
  const compare = await buttons.nth(1).boundingBox()
  expect(Math.abs(edit!.y - compare!.y)).toBeLessThanOrEqual(2)
  expect(edit!.height).toBeGreaterThanOrEqual(44)
  expect(compare!.height).toBeGreaterThanOrEqual(44)
}
async function assertPrivate(page: Page) {
  expect(new URL(page.url()).pathname).toBe('/alquiler-ideal-uruguay')
  expect(new URL(page.url()).search).toBe('')
  const persisted = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
      cookie: document.cookie,
    })
  )
  for (const value of [
    'PersonaQAAlfa',
    'PersonaQABeta',
    'Hocquart',
    'HOCQUART',
    '72341',
    '-34.88974',
    '-56.17683',
  ])
    expect(persisted).not.toContain(value)
  const hrefs = await page
    .locator('.fit-private a')
    .evaluateAll(elements => elements.map(element => element.getAttribute('href')).join('|'))
  expect(hrefs).not.toMatch(/Hocquart|HOCQUART|72341|-34\.88974|-56\.17683/)
}
async function comparison(page: Page, info: TestInfo, width: number) {
  const cards = page.locator('.fit-result')
  const compare = page.getByRole('button', { name: 'Comparar seleccionadas (0/3)', exact: true })
  await expect(compare).toBeDisabled()
  await cards.nth(0).getByRole('checkbox').check()
  await cards.nth(1).getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Comparar seleccionadas (2/3)', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('table').locator('thead th')).toHaveCount(3)
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click()
  await cards.nth(2).getByRole('checkbox').check()
  await expect(cards.nth(3).getByRole('checkbox')).toBeDisabled()
  await page.getByRole('button', { name: 'Comparar seleccionadas (3/3)', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('table').locator('thead th')).toHaveCount(4)
  const scroll = dialog.locator('.compare-scroll')
  await expect(scroll).toHaveAttribute('tabindex', '0')
  await expect(scroll).toHaveAttribute('aria-label', 'Comparar seleccionadas')
  await scroll.focus()
  if (width < 600) {
    expect(await scroll.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true)
    await page.keyboard.press('ArrowRight')
    await expect.poll(() => scroll.evaluate(element => element.scrollLeft)).toBeGreaterThan(0)
  }
  await assertNoOverflow(page)
  await screenshot(page, info, `comparison-${width}`)
  await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click()
}

for (const width of [390, 1366]) {
  test(`household, multiple places, transparent results and comparison at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 })
    const state = await setup(page)
    await screenshot(page, info, `household-${width}`)
    await visibleStep(page)
      .getByLabel('Nombre o apodo (opcional)', { exact: true })
      .fill('PersonaQAAlfa')
    await visibleStep(page).getByLabel('Ingreso líquido mensual ($)', { exact: true }).fill('72341')
    await page.getByRole('button', { name: 'Agregar persona', exact: true }).click()
    await visibleStep(page)
      .getByLabel('Nombre o apodo (opcional)', { exact: true })
      .nth(1)
      .fill('PersonaQABeta')
    await visibleStep(page)
      .getByLabel('Ingreso líquido mensual ($)', { exact: true })
      .nth(1)
      .fill('25000')
    await page.getByTestId('fit-budget').locator('input').fill('30000')
    await page.getByText('Lo que necesitan reservar cada mes', { exact: true }).click()
    await page
      .getByLabel('Comida, servicios, deudas y otros gastos ($)', { exact: true })
      .fill('40000')
    await page.getByLabel('Ahorro o reserva mensual ($)', { exact: true }).fill('15000')
    await page.getByLabel('Transporte mensual de todo el hogar ($)', { exact: true }).fill('13000')
    await expect(
      page.getByText('El presupuesto supera lo que queda', { exact: false })
    ).toBeVisible()
    await page.getByTestId('fit-budget').locator('input').fill('27000')
    await expect(
      page.getByText('El presupuesto supera lo que queda', { exact: false })
    ).toBeHidden()
    await page.getByTestId('fit-next').click()
    const people = visibleStep(page).locator('.person-card')
    await people.nth(0).getByLabel('Días por semana desde casa', { exact: true }).fill('2')
    await people.nth(1).getByLabel('Días por semana desde casa', { exact: true }).fill('5')
    for (const [personIndex, kind, label, days] of [
      [0, 'Trabajo', 'OficinaQA', '3'],
      [0, 'Estudio', 'EstudioQA', '2'],
      [1, 'Otro lugar', 'FamiliaQA', '1'],
    ] as const) {
      await people
        .nth(personIndex)
        .getByRole('button', { name: 'Agregar trabajo, estudio u otro lugar', exact: true })
        .click()
      const place = people.nth(personIndex).locator('.fit-destination').last()
      await select(page, place, 'Actividad', kind)
      await place.getByLabel('Referencia (opcional)', { exact: true }).fill(label)
      await confirmAddress(place)
      await place.getByLabel('Visitas por semana', { exact: true }).fill(days)
      await place.getByLabel('Cercanía deseada (km)', { exact: true }).fill('2.5')
    }
    await assertNoOverflow(page)
    await screenshot(page, info, `destinations-${width}`)
    await page.getByTestId('fit-next').click()
    await select(page, visibleStep(page), 'Departamento', 'Montevideo')
    await visibleStep(page)
      .getByRole('radio', { name: 'Acercarnos a nuestros lugares', exact: true })
      .check()
    await page.getByTestId('fit-next').click()
    await expect(page.locator('.fit-result')).toHaveCount(8)
    expect(state.requests).toHaveLength(1)
    expect(state.requests[0]).toMatchObject({
      housingBudgetUyu: 27000,
      department: 'Montevideo',
      priority: 'commute',
      people: [
        {
          label: '',
          remoteDays: 2,
          destinations: [
            { kind: 'work', days: 3 },
            { kind: 'study', days: 2 },
          ],
        },
        { label: '', remoteDays: 5, destinations: [{ kind: 'other', days: 1 }] },
      ],
    })
    expect(state.requests[0]!.people[0]!.destinations[0]).not.toHaveProperty('address')
    expect(state.geocodes).toHaveLength(3)
    expect(
      state.geocodes.every(url => url.searchParams.size === 1 && url.searchParams.has('q'))
    ).toBe(true)
    await expect(
      page.getByTestId('fit-result-0').getByText('Afinidad 78/100', { exact: true })
    ).toBeVisible()
    await page.getByText('Cómo se ordenan estas viviendas', { exact: true }).click()
    await expect(
      page.getByText('Revisamos 1980 viviendas vigentes del índice.', { exact: false })
    ).toBeVisible()
    await page.getByText('Cómo se ordenan estas viviendas', { exact: true }).click()
    await compactResultToolbar(page)
    await assertNoOverflow(page)
    await screenshot(page, info, `results-overview-${width}`)
    await page
      .getByTestId('fit-result-0')
      .getByText('Cercanía para cada persona', { exact: true })
      .click()
    await expect(page.getByTestId('fit-result-0').locator('.trip-details li')).toHaveCount(3)
    await expect(
      page.getByTestId('fit-result-0').getByText('≈ 1.3 km', { exact: true })
    ).toHaveCount(3)
    await screenshot(page, info, `results-${width}`)
    await expect(
      page.getByTestId('fit-result-7').getByText('Faltan los gastos comunes', { exact: true })
    ).toBeVisible()
    await expect(
      page
        .getByTestId('fit-result-7')
        .getByText('No podemos evaluar los traslados', { exact: true })
    ).toBeVisible()
    await assertPrivate(page)
    await comparison(page, info, width)
    await page.getByTestId('fit-result-7').scrollIntoViewIfNeeded()
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(1000)
    const edit = page.getByTestId('fit-edit')
    await expect(edit).toBeInViewport()
    const editBox = await edit.boundingBox()
    expect(editBox!.height).toBeGreaterThanOrEqual(44)
    await edit.click()
    await expect(
      visibleStep(page).getByRole('heading', { name: '¿Qué vivienda buscan?' })
    ).toBeInViewport()
    await page
      .locator('.step-links')
      .getByRole('button', { name: '1 El hogar', exact: false })
      .click()
    await expect(page.getByTestId('fit-budget').locator('input')).toHaveValue('27000')
    await assertPrivate(page)
    await assertNoOverflow(page)
    expect(state.errors).toEqual([])
  })
}

test('320px remote-only household remains usable and comparison scroll stays inside the dialog', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 740 })
  const state = await setup(page)
  await assertNoOverflow(page)
  await screenshot(page, info, 'household-320')
  await page.getByTestId('fit-next').click()
  await visibleStep(page).getByLabel('Días por semana desde casa', { exact: true }).fill('5')
  await expect(page.getByText('Sin destinos presenciales.', { exact: false })).toBeVisible()
  await page.getByTestId('fit-next').click()
  await screenshot(page, info, 'housing-320')
  await page.getByTestId('fit-next').click()
  await expect(page.locator('.fit-result')).toHaveCount(8)
  expect(state.requests[0]!.people[0]).toMatchObject({ remoteDays: 5, destinations: [] })
  await expect(
    page.getByTestId('fit-result-0').getByText('Sin traslados configurados', { exact: true })
  ).toBeVisible()
  await expect(page.locator('.trip-details')).toHaveCount(0)
  await compactResultToolbar(page)
  await assertNoOverflow(page)
  await expect(page.getByTestId('fit-result-0').locator('.price')).toBeInViewport({ ratio: 1 })
  await screenshot(page, info, 'results-320')
  const explanation = page.locator('.ranking-explanation')
  await expect(explanation).not.toHaveAttribute('open', '')
  await explanation.locator('summary').click()
  await expect(explanation).toHaveAttribute('open', '')
  await expect(
    explanation.getByText('Revisamos 1980 viviendas vigentes del índice.', { exact: false })
  ).toBeVisible()
  await expect(
    explanation.getByText('8 opciones necesitan datos adicionales.', { exact: true })
  ).toBeVisible()
  await expect(
    explanation.getByText('Puntaje comparativo con tus prioridades;', { exact: false })
  ).toBeVisible()
  await assertNoOverflow(page)
  await screenshot(page, info, 'results-explanation-320')
  await explanation.locator('summary').click()
  await comparison(page, info, 320)
  await assertPrivate(page)
  expect(state.errors).toEqual([])
})

test('a changed or invalid destination cannot silently reuse its previously confirmed point', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await setup(page)
  await page.getByTestId('fit-next').click()
  await page
    .getByRole('button', { name: 'Agregar trabajo, estudio u otro lugar', exact: true })
    .click()
  const place = page.locator('.fit-destination')
  await confirmAddress(place)
  await place.getByRole('button', { name: 'Cambiar ubicación', exact: true }).click()
  await expect(place.getByText('Ubicación confirmada', { exact: true })).toBeHidden()
  await place
    .getByTestId('rental-reference-address')
    .locator('input')
    .fill('Dirección sin confirmar')
  await page.getByTestId('fit-next').click()
  await page.getByTestId('fit-next').click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Revisá los importes y los lugares' })
  ).toBeVisible()
  expect(state.requests).toHaveLength(0)
  await page
    .locator('.step-links')
    .getByRole('button', { name: '2 Sus lugares', exact: false })
    .click()
  state.invalidAddress = true
  await confirmAddress(place)
  await page.getByTestId('fit-next').click()
  await page.getByTestId('fit-next').click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Revisá los importes y los lugares' })
  ).toBeVisible()
  expect(state.requests).toHaveLength(0)
  await assertPrivate(page)
})

test('reset cancellation preserves the scenario; confirmed reset ignores an in-flight response', async ({
  page,
}) => {
  const state = await setup(page)
  await page.getByRole('button', { name: 'Agregar persona', exact: true }).click()
  await page.getByTestId('fit-budget').locator('input').fill('27000')
  await page.getByRole('button', { name: 'Borrar datos y empezar de nuevo', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(page.getByTestId('fit-budget').locator('input')).toHaveValue('27000')
  await expect(visibleStep(page).locator('.person-card')).toHaveCount(2)
  await page.getByTestId('fit-next').click()
  await page.getByTestId('fit-next').click()
  state.pending = true
  await page.getByTestId('fit-next').click()
  await expect.poll(() => state.requests.length).toBe(1)
  await expect(
    page.getByText('Comparando viviendas del directorio…', { exact: true })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Borrar datos y empezar de nuevo', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Borrar escenario', exact: true })
    .click()
  state.releases.forEach(release => release())
  await expect(page.getByTestId('fit-budget').locator('input')).toHaveValue('20000')
  await expect(visibleStep(page).locator('.person-card')).toHaveCount(1)
  await expect(page.locator('.fit-result')).toHaveCount(0)
  state.pending = false
  await page.getByTestId('fit-next').click()
  await page.getByTestId('fit-next').click()
  await page.getByTestId('fit-next').click()
  await expect(page.locator('.fit-result')).toHaveCount(8)
  expect(state.requests).toHaveLength(2)
  expect(state.requests[1]!.housingBudgetUyu).toBe(20000)
  expect(state.errors).toEqual([])
})

test('manual map selection requires confirmation and API errors keep the entered household', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await setup(page)
  await page.getByTestId('fit-next').click()
  await page
    .getByRole('button', { name: 'Agregar trabajo, estudio u otro lugar', exact: true })
    .click()
  await page.getByRole('button', { name: 'Elegir en el mapa', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.locator('.leaflet-container')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Confirmar punto', exact: true })).toBeDisabled()
  await expect(
    dialog.getByRole('button', { name: 'Usar centro del mapa', exact: true })
  ).toBeEnabled()
  await dialog.getByRole('button', { name: 'Usar centro del mapa', exact: true }).click()
  await screenshot(page, info, 'manual-point-390')
  expect(state.requests).toHaveLength(0)
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(page.locator('.confirmed-point')).toHaveCount(0)
  await page.getByRole('button', { name: 'Elegir en el mapa', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Confirmar punto', exact: true })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Usar centro del mapa', exact: true }).click()
  await dialog.getByRole('button', { name: 'Confirmar punto', exact: true }).click()
  await expect(page.locator('.confirmed-point')).toBeVisible()
  await page.getByTestId('fit-next').click()
  state.status = 429
  await page.getByTestId('fit-next').click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'Hay varias comparaciones en curso.' })
  ).toBeVisible()
  state.status = 200
  await page.getByTestId('fit-next').click()
  await expect(page.locator('.fit-result')).toHaveCount(8)
  expect(state.requests).toHaveLength(2)
  // Leaflet rounds its rendered center to pixels when the dialog changes size.
  expect(state.requests[0]!.people[0]!.destinations[0]!.lat).toBeCloseTo(-34.89, 3)
  expect(state.requests[0]!.people[0]!.destinations[0]!.lng).toBeCloseTo(-56.17, 3)
  expect(state.requests[1]!.people[0]!.destinations[0]).toEqual(
    state.requests[0]!.people[0]!.destinations[0]
  )
  await assertNoOverflow(page)
  expect(state.errors).toEqual([])
})

test('editing a pending comparison cancels it, and cleared optional income stays optional', async ({
  page,
}) => {
  const state = await setup(page)
  await visibleStep(page).getByLabel('Ingreso líquido mensual ($)', { exact: true }).fill('')
  await page.getByTestId('fit-next').click()
  await page.getByTestId('fit-next').click()
  state.pending = true
  await page.getByTestId('fit-next').click()
  await expect.poll(() => state.requests.length).toBe(1)
  await visibleStep(page).getByLabel('Superficie mínima (m²)', { exact: true }).fill('55')
  await expect(page.getByText('Comparando viviendas del directorio…', { exact: true })).toBeHidden()
  state.releases.forEach(release => release())
  await expect(page.locator('.fit-result')).toHaveCount(0)
  state.pending = false
  await page.getByTestId('fit-next').click()
  await expect(page.locator('.fit-result')).toHaveCount(8)
  expect(state.requests).toHaveLength(2)
  expect(state.requests[0]!.minArea).toBe(0)
  expect(state.requests[1]).toMatchObject({ minArea: 55, people: [{ incomeUyu: 0 }] })
  expect(state.errors).toEqual([])
})
