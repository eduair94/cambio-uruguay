// /meal-prep-uruguay: el plan se renderiza en SSR, reacciona a los datos de la
// persona después de hidratar, y lo cargado sobrevive a una recarga.
//
// Cada interacción va adentro de `toPass()`: un clic que cae antes de la
// hidratación no hace nada y no falla (ver cuotas-vs-contado.spec.ts).
import { expect, test } from '@playwright/test'

const URL = '/meal-prep-uruguay'

test.describe('meal prep', () => {
  // El dev server hidrata lento la primera vez (vite optimiza deps y recarga).
  test.setTimeout(180_000)

  test('SSR trae el plan del perfil de ejemplo con precios', async ({ page }) => {
    const response = await page.goto(URL)
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.getByTestId('mp-plan-table').locator('tbody tr')).toHaveCount(7)
    await expect(page.getByTestId('mp-kcal')).toContainText('2.380')
    await expect(page.getByTestId('mp-gondola')).toContainText('$')
  })

  test('el peso cambia las kcal y la semilla cambia el plan', async ({ page }) => {
    await page.goto(URL)
    const weight = page.getByTestId('mp-weight').locator('input')
    await expect(async () => {
      await weight.fill('60')
      await expect(page.getByTestId('mp-kcal')).toContainText('2.130', { timeout: 3_000 })
    }).toPass({ timeout: 90_000 })

    const before = await page.getByTestId('mp-plan-table').textContent()
    await expect(async () => {
      await page.getByTestId('mp-reshuffle').click()
      await expect(page.locator('body')).toContainText('Combinación #2', { timeout: 3_000 })
    }).toPass({ timeout: 30_000 })
    const after = await page.getByTestId('mp-plan-table').textContent()
    expect(after).not.toBe(before)

    await page.reload()
    await expect(page.getByTestId('mp-kcal')).toContainText('2.130', { timeout: 60_000 })
    await expect(page.locator('body')).toContainText('Combinación #2')
  })

  test('sin freezer, los almuerzos y cenas del jueves en adelante se hacen ese día', async ({
    page,
  }) => {
    await page.goto(URL)
    const freezer = page.locator('.v-switch input').first()
    await expect(async () => {
      await freezer.click()
      await expect(page.locator('body')).toContainText('Sin freezer, los tuppers', {
        timeout: 3_000,
      })
    }).toPass({ timeout: 90_000 })
    const rows = page.getByTestId('mp-plan-table').locator('tbody tr')
    for (const i of [3, 4, 5, 6]) {
      await expect(rows.nth(i)).not.toContainText('Freezer')
    }
  })
})
