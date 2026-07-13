import { expect, test } from '@playwright/test'

// e2e for the capital-income tax calculator. The page hydrates a Vuetify tab set;
// gate on hydration with toPass retries rather than a fixed wait (the pattern the
// rest of the e2e suite uses).
test.describe('calculadora de impuestos sobre inversiones', () => {
  // Cold Nuxt dev start compiles the route on first hit.
  test.setTimeout(120_000)

  test('modo por instrumento', async ({ page }) => {
    await page.goto('/herramientas/calculadora-impuestos-inversiones')

    await expect(async () => {
      await expect(page.getByTestId('resultado-impuesto')).toBeVisible()
    }).toPass({ timeout: 90_000 })

    // Default scenario must show a real number, not a placeholder.
    await expect(page.getByTestId('resultado-impuesto')).not.toHaveText('—')
    await expect(page.getByTestId('resultado-neto')).toBeVisible()
    await expect(page.getByTestId('resultado-tasa')).toBeVisible()

    // The provenance of the applied rule is a feature: the article + the source.
    await expect(page.getByTestId('resultado-fuente')).toBeVisible()
  })

  test('la cripto no muestra ninguna tasa', async ({ page }) => {
    await page.goto('/herramientas/calculadora-impuestos-inversiones')
    await expect(async () => {
      await expect(page.getByTestId('resultado-impuesto')).toBeVisible()
    }).toPass({ timeout: 90_000 })

    // NOTE: the assertion above only proves the page SSR'd — the result block is
    // server-rendered. The select needs HYDRATION, which on a cold dev server lands
    // ~60s later, so the interaction below carries its own generous retry budget.
    await expect(async () => {
      await page.getByTestId('instrumento').click()
      await page.getByRole('option', { name: /cripto/i }).click({ timeout: 3_000 })
      await expect(page.getByTestId('cripto-no-resuelto')).toBeVisible({ timeout: 3_000 })
    }).toPass({ timeout: 90_000 })

    // No number, anywhere: the whole result block is gone.
    await expect(page.getByTestId('resultado-impuesto')).toHaveCount(0)
    await expect(page.getByTestId('resultado-tasa')).toHaveCount(0)
    await expect(page.getByTestId('resultado-neto')).toHaveCount(0)
  })

  test('la declaración anual suma una renta nueva al total', async ({ page }) => {
    await page.goto('/herramientas/calculadora-impuestos-inversiones')

    await expect(async () => {
      await expect(page.getByTestId('resultado-impuesto')).toBeVisible()
    }).toPass({ timeout: 90_000 })

    // Switch to the annual mode (retry: the tab needs hydration too).
    await expect(async () => {
      await page.getByTestId('tab-anual').click()
      await expect(page.getByTestId('anual-total')).toBeVisible({ timeout: 3_000 })
    }).toPass({ timeout: 90_000 })

    const total = page.getByTestId('anual-total')
    const before = (await total.textContent())?.trim()
    expect(before).toBeTruthy()
    await expect(page.getByTestId('anual-fila')).toHaveCount(1)

    // Add a second income row and give it an amount: the total must move.
    await page.getByTestId('agregar-renta').click()
    await expect(page.getByTestId('anual-fila')).toHaveCount(2)

    await page.getByTestId('anual-monto').nth(1).locator('input').fill('200000')
    await expect(total).not.toHaveText(before as string)
  })

  // ── The two silent-wrong-number traps ──────────────────────────────────────
  // Neither of these fails loudly if it regresses: the page would just publish a
  // number that is wrong. That is exactly why they are pinned here.

  test('venta con régimen real y sin costo: no publica ningún impuesto', async ({ page }) => {
    // `capitalGainTax` now throws for `method: 'real'` when `cost` is missing (or negative)
    // instead of defaulting/clamping it to 0, which would land the tax on the FULL sale price.
    // The page must BLOCK the result before that throw, not guess.
    await page.goto('/herramientas/calculadora-impuestos-inversiones')

    await expect(async () => {
      await expect(page.getByTestId('resultado-impuesto')).toBeVisible()
    }).toPass({ timeout: 90_000 })

    // Hydration gate: the SSR assertion above does not prove the select works.
    await expect(async () => {
      await page.getByTestId('instrumento').click()
      await page.getByRole('option', { name: /venta de acciones/i }).click({ timeout: 3_000 })
      await expect(page.getByTestId('falta-costo')).toBeVisible({ timeout: 3_000 })
    }).toPass({ timeout: 90_000 })

    // Default method is `real` and the cost starts empty: no tax figure may be shown.
    await expect(page.getByTestId('resultado-impuesto')).toHaveCount(0)
    await expect(page.getByTestId('resultado-tasa')).toHaveCount(0)
    await expect(page.getByTestId('resultado-neto')).toHaveCount(0)

    // With a cost, the result comes back — and the rate tile shows the STATUTORY 12%,
    // never the tax/price ratio (which for 500.000 − 400.000 would print 2,4%: the
    // ficto the spec says is NOT the default regime).
    await page.getByTestId('costo-fiscal').locator('input').fill('400000')
    await expect(page.getByTestId('resultado-impuesto')).toBeVisible()
    await expect(page.getByTestId('falta-costo')).toHaveCount(0)
    await expect(page.getByTestId('resultado-tasa')).toHaveText('12%')
  })

  test('un monto negativo no mueve el total anual', async ({ page }) => {
    // `annualIrpfCatI` now guards against negative amounts, but the UI is the first line of
    // defense: a negative amount would otherwise produce a negative "tax" that silently
    // offsets the rest of the year. The UI clamps every amount at 0.
    await page.goto('/herramientas/calculadora-impuestos-inversiones')

    await expect(async () => {
      await expect(page.getByTestId('resultado-impuesto')).toBeVisible()
    }).toPass({ timeout: 90_000 })

    await expect(async () => {
      await page.getByTestId('tab-anual').click()
      await expect(page.getByTestId('anual-total')).toBeVisible({ timeout: 3_000 })
    }).toPass({ timeout: 90_000 })

    const total = page.getByTestId('anual-total')
    const before = (await total.textContent())?.trim()
    expect(before).toBeTruthy()

    await page.getByTestId('agregar-renta').click()
    await expect(page.getByTestId('anual-fila')).toHaveCount(2)

    // Unclamped, −500.000 of "dividendos" would subtract 35.000 from the year's IRPF.
    await page.getByTestId('anual-monto').nth(1).locator('input').fill('-500000')
    await expect(total).toHaveText(before as string)
  })
})
