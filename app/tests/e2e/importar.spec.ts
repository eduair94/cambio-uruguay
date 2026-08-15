import { expect, test } from '@playwright/test'

// End-to-end de /importar y de la regresión que originó estas páginas.
//
// EL BUG QUE PROTEGE: el calculador le cobraba 60% (mínimo US$ 20) a un envío de libros, porque
// modelaba cada categoría como una sola tasa de IVA. La importación de libros está exonerada de
// todo tributo nacional (Título 10 del T.O. 2023 art. 41; Ley 15.913 art. 8 lit. C) y la
// prestación única es una OPCIÓN (Ley 20.446 art. 627: "podrán optar"), así que no puede
// desplazarla. La cuenta está fuzzeada en tests/unit/importTax.test.ts y en
// tests/unit/importProductTypes.test.ts; acá se verifica que eso efectivamente LLEGA a la pantalla.
//
// SCOPE: no se manipulan los controles Vuetify (VBtnToggle/VSwitch tienen el flake de hidratación
// documentado en este repo). El estado se fija por querystring, que es SSR puro.

test('la ficha de libros publica la exoneración y cómo declararla', async ({ page }) => {
  await page.goto('/importar/libros')
  await expect(page.locator('h1')).toContainText(/libros/i, { timeout: 90_000 })

  const body = page.locator('body')

  // Los tres caminos, que es la respuesta a "¿cuánto pago?". El primer assert de cada test lleva
  // timeout largo porque en frío el dev server compila la ruta recién en la primera visita.
  await expect(body).toContainText('Cuánto paga, según cómo entre', { timeout: 60_000 })

  // El dato operativo: un libro no se declara como franquicia, va por el tipo de envío J/01
  // (RG DNA 11/2026 num. 28 lit. c). Sin esto la exoneración no se aplica en el mostrador.
  await expect(body).toContainText('J/01')

  // Y la norma que la sostiene, citada.
  await expect(body).toContainText('15.913')

  // La página promete fuentes y las tiene.
  await expect(body).toContainText('Fuentes')
  await expect(page.locator('a[href*="impo.com.uy"]').first()).toBeVisible()
})

test('el calculador da cero por un libro y dice por qué', async ({ page }) => {
  // `?tipo=` precarga la categoría en SSR: es el link que traen las fichas.
  await page.goto('/herramientas/calculadora-impuestos-importacion?tipo=libros')
  await expect(page.locator('h1')).toContainText(/importaci/i, { timeout: 90_000 })

  const body = page.locator('body')
  await expect(body).toContainText('Esta mercadería no paga impuestos de importación', {
    timeout: 60_000,
  })
  await expect(body).toContainText('exonerada de todo tributo nacional')

  // El número, que es lo que el lector mira: cero, no 60%.
  await expect(page.getByText('US$ 0,00').first()).toBeVisible({ timeout: 30_000 })

  // Y que no aparezca el 60% liquidado: es exactamente el bug que originó estas páginas.
  await expect(body).not.toContainText('Prestación única (60%')
})

test('el hub lista las categorías y el slug inventado da 404', async ({ page }) => {
  await page.goto('/importar')
  await expect(page.locator('h1')).toContainText(/importar/i, { timeout: 90_000 })

  // Una tarjeta por ficha publicada. `toPass` porque el conteo recién cierra con la ruta compilada.
  const cards = page.locator('a[href*="/importar/"]')
  await expect(async () => {
    expect(await cards.count()).toBeGreaterThanOrEqual(16)
  }).toPass({ timeout: 60_000 })

  const res = await page.goto('/importar/esto-no-existe')
  expect(res?.status()).toBe(404)
})
