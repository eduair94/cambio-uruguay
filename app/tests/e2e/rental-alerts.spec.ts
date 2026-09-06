import { expect, test, type Page } from '@playwright/test'
import type { RentalAlertSubscription } from '../../utils/rentalAlerts'

// Every account API is intercepted. These tests never register a real subscription or send mail.
const baseCapabilities = {
  accountEligible: true,
  emailAvailable: true,
  emailVerified: true,
  email: 'test@example.invalid',
  pushAvailable: false,
  pushRegistered: false,
}
const id = '507f1f77bcf86cd799439011'
function subscription(extra: Partial<RentalAlertSubscription> = {}): RentalAlertSubscription {
  return {
    id,
    kind: 'rental-search',
    name: 'Búsqueda de prueba',
    filters: {
      department: 'Montevideo',
      neighborhoods: 'Cordón,Pocitos',
      monthlyMax: '30000',
      garantia: 'anda',
    },
    channels: { email: true, push: false },
    frequency: 'hourly',
    active: true,
    locale: 'es',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastNotifiedAt: null,
    searchUrl: '/alquileres-uruguay?department=Montevideo&monthlyMax=30000',
    ...extra,
  }
}
async function setup(
  page: Page,
  options: { verified?: boolean; items?: RentalAlertSubscription[] } = {}
) {
  await page.context().addCookies([
    { name: 'cu_consent', value: 'denied', domain: '127.0.0.1', path: '/' },
    { name: 'cu_consent', value: 'denied', domain: 'localhost', path: '/' },
  ])
  let items = options.items || []
  const capabilities = { ...baseCapabilities, emailVerified: options.verified !== false }
  const writes: { method: string; body: Record<string, unknown> | null }[] = []
  const state = { failPatch: false, failDelete: false, failCreate: false, capabilities, writes }
  await page.addInitScript(() => {
    localStorage.setItem('cu_theme', 'dark')
    ;(window as any).__permissionRequests = 0
    if ('Notification' in window)
      Notification.requestPermission = async () => {
        ;(window as any).__permissionRequests++
        return 'denied'
      }
  })
  await page.route('**/api/me/**', async route => {
    const request = route.request(),
      url = new URL(request.url()),
      method = request.method()
    if (!url.pathname.includes('/rental-alerts'))
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) })
    if (method === 'GET') return route.fulfill({ json: { items, capabilities, limit: 10 } })
    const body = method === 'DELETE' ? null : request.postDataJSON()
    writes.push({ method, body })
    if (method === 'POST' && state.failCreate)
      return route.fulfill({ status: 429, json: { data: { code: 'too_many_requests' } } })
    if ((method === 'PATCH' && state.failPatch) || (method === 'DELETE' && state.failDelete))
      return route.fulfill({ status: 503, json: { data: { code: 'temporarily_unavailable' } } })
    if (method === 'POST') {
      const item = subscription({ ...body, filters: body.filters })
      items = [item]
      return route.fulfill({ json: { item, alreadyExists: false } })
    }
    if (method === 'PATCH') {
      const item = { ...items[0], ...body }
      items = [item]
      return route.fulfill({ json: { item } })
    }
    items = []
    return route.fulfill({ json: { ok: true } })
  })
  await page.route('**/api/rentals**', route =>
    route.fulfill({
      json: {
        items: [],
        total: 0,
        page: 1,
        pages: 1,
        perPage: 24,
        usdUyu: 41.5,
        medianUyu: null,
        meta: null,
        facets: { departments: [], neighborhoods: [] },
        coverage: null,
      },
    })
  )
  await page.goto(
    '/alquileres-uruguay?department=Montevideo&neighborhoods=Cord%C3%B3n,Pocitos&monthlyMax=30000&garantia=anda&bedrooms=2&bedroomsExact=1',
    { waitUntil: 'domcontentloaded', timeout: 120000 }
  )
  await page.waitForFunction(
    () =>
      Boolean(
        (document.getElementById('__nuxt') as any)?.__vue_app__?.config.globalProperties.$pinia
      ),
    undefined,
    { timeout: 60000 }
  )
  await expect(async () => {
    await page.getByTestId('rental-alert-trigger').first().click()
    await expect(page.getByRole('dialog', { name: 'Nuevos alquileres', exact: true })).toBeVisible({
      timeout: 1000,
    })
  }).toPass({ timeout: 30000 })
  await page
    .getByRole('dialog', { name: 'Nuevos alquileres', exact: true })
    .getByRole('button', { name: 'Cancelar', exact: true })
    .click()
  return state
}
async function signInFixture(page: Page, verified = true) {
  await page.evaluate(verified => {
    const globals = (document.getElementById('__nuxt') as any).__vue_app__.config.globalProperties
    const auth = globals.$pinia._s.get('auth')
    auth.setUser({
      uid: 'ui-rental-alert-test',
      email: 'test@example.invalid',
      emailVerified: verified,
      isAnonymous: false,
      providerData: [{ providerId: 'password' }],
    })
    auth.getToken = async () => 'intercepted-ui-test-token'
    auth.refreshUser = async () => {}
    auth.verifyEmail = async () => true
  }, verified)
}
async function account(page: Page) {
  await page.evaluate(async () => {
    const globals = (document.getElementById('__nuxt') as any).__vue_app__.config.globalProperties
    await globals.$router.push('/cuenta?tab=alerts')
  })
  await expect(
    page.getByRole('heading', { name: 'Alertas de alquiler', exact: true })
  ).toBeVisible()
}

for (const width of [320, 390])
  test(`mobile ${width}: exact filters, persistent action and safe login draft`, async ({
    page,
  }) => {
    test.setTimeout(180000)
    await page.setViewportSize({ width, height: 844 })
    const state = await setup(page)
    await page.evaluate(() => window.scrollTo(0, 1200))
    const trigger = page.getByTestId('rental-alert-trigger').first()
    await expect(trigger).toBeInViewport()
    const box = await trigger.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Nuevos alquileres', exact: true })
    await expect(dialog).toContainText('Cordón · Pocitos')
    await expect(dialog).toContainText('UYU 30.000')
    await expect(dialog).toContainText('Exactamente 2')
    await expect(dialog).toContainText('ANDA')
    await page.screenshot({
      path: `../.sdd-rental-alert-summary-${width}.png`,
      fullPage: false,
      animations: 'disabled',
    })
    await dialog.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
    const login = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('button', { name: 'Continuar con Google' }) })
    await expect(login).toBeVisible()
    await expect(dialog).not.toBeVisible()
    const saved = await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem('cu_rental_alert_draft_v1') || '{}')
    )
    expect(saved.draft.filters.monthlyMax).toBe('30000')
    expect(saved.draft.channels).toEqual({ email: false, push: false })
    expect(state.writes).toEqual([])
    expect(await page.evaluate(() => (window as any).__permissionRequests)).toBe(0)
    await page.screenshot({
      path: `../.sdd-rental-alert-login-${width}.png`,
      fullPage: false,
      animations: 'disabled',
    })
  })

test('email selection is explicit; unverified state preserves draft until rechecked', async ({
  page,
}) => {
  test.setTimeout(180000)
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await setup(page, { verified: false })
  await signInFixture(page, false)
  await page.getByTestId('rental-alert-trigger').first().click()
  const dialog = page.getByRole('dialog', { name: 'Nuevos alquileres', exact: true })
  await expect(
    dialog.getByRole('checkbox', { name: 'Correo electrónico', exact: true })
  ).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Activar alerta', exact: true })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Enviar correo de verificación' }).click()
  await expect(dialog).toContainText('Te enviamos un enlace de verificación')
  state.capabilities.emailVerified = true
  await dialog.getByRole('button', { name: 'Volver a comprobar', exact: true }).first().click()
  await expect(
    dialog.getByRole('checkbox', { name: 'Correo electrónico', exact: true })
  ).toBeEnabled()
  await expect(
    dialog.getByRole('checkbox', { name: 'Correo electrónico', exact: true })
  ).not.toBeChecked()
  await dialog.getByRole('checkbox', { name: 'Correo electrónico', exact: true }).check()
  await expect(dialog.getByRole('button', { name: 'Activar alerta', exact: true })).toBeEnabled()
  await page.screenshot({
    path: '../.sdd-rental-alert-ready-mobile.png',
    fullPage: false,
    animations: 'disabled',
  })
  await dialog.getByRole('button', { name: 'Activar alerta', exact: true }).click()
  await expect(dialog).toContainText('Alerta activada')
  expect(state.writes).toHaveLength(1)
  expect(state.writes[0].body).toMatchObject({
    kind: 'rental-search',
    channels: { email: true, push: false },
    frequency: 'hourly',
    filters: { monthlyMax: '30000', bedroomsExact: '1' },
  })
  expect(await page.evaluate(() => (window as any).__permissionRequests)).toBe(0)
})

test('account resumes the draft and failed pause/delete preserve the server state', async ({
  page,
}) => {
  test.setTimeout(180000)
  const state = await setup(page, { items: [subscription()] })
  await signInFixture(page)
  await account(page)
  await expect(page.getByRole('button', { name: 'Retomar alerta', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Retomar alerta', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Nuevos alquileres', exact: true })
  await expect(dialog).toContainText('Cordón · Pocitos')
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
  state.failPatch = true
  await page.getByRole('button', { name: 'Pausar', exact: true }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'No pudimos guardar el cambio' })
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible()
  state.failPatch = false
  await page.getByRole('button', { name: 'Pausar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Reanudar', exact: true })).toBeVisible()
  await page.screenshot({
    path: '../.sdd-rental-alert-account.png',
    fullPage: false,
    animations: 'disabled',
  })
  state.failDelete = true
  await page.getByRole('button', { name: 'Eliminar alerta: Búsqueda de prueba' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Eliminar alerta', exact: true })
    .click()
  await expect(page.getByRole('heading', { name: 'Búsqueda de prueba', exact: true })).toBeVisible()
  state.failDelete = false
  await page.getByRole('button', { name: 'Eliminar alerta: Búsqueda de prueba' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Eliminar alerta', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Búsqueda de prueba', exact: true })
  ).not.toBeVisible()
})

test('re-enabling an email-unsubscribed alert requires choosing a channel', async ({ page }) => {
  test.setTimeout(180000)
  const state = await setup(page, {
    items: [subscription({ active: false, channels: { email: false, push: false } })],
  })
  await signInFixture(page)
  await account(page)
  await page.getByRole('button', { name: 'Reanudar', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Nuevos alquileres', exact: true })
  await expect(dialog.getByRole('button', { name: 'Activar alerta', exact: true })).toBeDisabled()
  expect(state.writes).toEqual([])
  await dialog.getByRole('checkbox', { name: 'Correo electrónico', exact: true }).check()
  await dialog.getByRole('button', { name: 'Activar alerta', exact: true }).click()
  expect(state.writes[0]).toMatchObject({
    method: 'PATCH',
    body: { active: true, channels: { email: true, push: false } },
  })
})

test('a creation rate limit retains the selected channels and exact draft', async ({ page }) => {
  test.setTimeout(180000)
  const state = await setup(page)
  await signInFixture(page)
  await page.getByTestId('rental-alert-trigger').first().click()
  const dialog = page.getByRole('dialog', { name: 'Nuevos alquileres', exact: true })
  await dialog.getByRole('checkbox', { name: 'Correo electrónico', exact: true }).check()
  state.failCreate = true
  await dialog.getByRole('button', { name: 'Activar alerta', exact: true }).click()
  await expect(dialog).toContainText('Esperá un momento')
  await expect(
    dialog.getByRole('checkbox', { name: 'Correo electrónico', exact: true })
  ).toBeChecked()
  expect(
    await page.evaluate(
      () => JSON.parse(sessionStorage.getItem('cu_rental_alert_draft_v1')!).draft.filters.monthlyMax
    )
  ).toBe('30000')
})

test('mobile opportunities retain the evidence filters and offer alerts only for rentals', async ({
  page,
}) => {
  test.setTimeout(180000)
  await page.setViewportSize({ width: 320, height: 844 })
  const state = await setup(page)
  await page.route('**/api/property-opportunities**', route =>
    route.fulfill({
      json: {
        operation: 'rent',
        generatedAt: new Date().toISOString(),
        sourceReadAt: new Date().toISOString(),
        stale: false,
        currency: 'UYU',
        usdUyu: 41.5,
        total: 0,
        pages: 1,
        page: 1,
        perPage: 24,
        items: [],
        stats: { analyzed: 0 },
        coverage: [],
        facets: { departments: [], neighborhoods: [] },
      },
    })
  )
  await page.evaluate(async () => {
    const globals = (document.getElementById('__nuxt') as any).__vue_app__.config.globalProperties
    await globals.$router.push(
      '/oportunidades-inmobiliarias-uruguay?operation=rent&department=Montevideo&maxPrice=30000&signal=price_per_m2&evidence=standard&confidence=supported'
    )
  })
  const trigger = page.getByTestId('rental-alert-trigger')
  await expect(trigger).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 650))
  await expect(trigger).toBeInViewport()
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Nuevas oportunidades de alquiler', exact: true })
  await expect(dialog).toContainText('UYU 30.000')
  const saved = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem('cu_rental_alert_draft_v1')!).draft
  )
  expect(saved).toMatchObject({
    kind: 'rental-opportunity',
    filters: {
      signal: 'price_per_m2',
      evidence: 'standard',
      confidence: 'supported',
    },
  })
  await page.screenshot({
    path: '../.sdd-rental-alert-opportunity-320.png',
    fullPage: false,
    animations: 'disabled',
  })
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await page.getByRole('button', { name: 'Compra', exact: true }).click()
  await expect(trigger).toHaveCount(0)
  expect(state.writes).toEqual([])
})

test('removing email preserves push consent even during a push outage', async ({ page }) => {
  test.setTimeout(180000)
  const state = await setup(page, {
    items: [subscription({ channels: { email: true, push: true } })],
  })
  state.capabilities.emailVerified = false
  state.capabilities.pushAvailable = false
  await signInFixture(page)
  await account(page)
  await page.locator(`#rental-alert-edit-${id}`).click()
  const dialog = page.getByRole('dialog', { name: 'Nuevos alquileres', exact: true })
  await dialog.getByRole('checkbox', { name: 'Correo electrónico', exact: true }).uncheck()
  await dialog.getByRole('button', { name: 'Guardar canales y frecuencia', exact: true }).click()
  expect(state.writes[0]).toMatchObject({
    method: 'PATCH',
    body: { channels: { email: false, push: true } },
  })
})
