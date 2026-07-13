import { expect, test } from '@playwright/test'

// End-to-end smoke test for /que-empresa-abrir-uruguay.
//
// SCOPE NOTE: the wizard is a Vuetify VBtnToggle/VSwitch, and this repo has a
// documented Suspense-hydration flake (see nearby-casa-finder / mapa) where the
// toggle's button updates its visual state while its v-model does not propagate —
// under headless Playwright the verdict then never recomputes, though real Chrome
// (and real users) do propagate. So the wizard→verdict *flip* is NOT driven here;
// it is exhaustively covered at the unit level in tests/unit/companyTypes.test.ts
// (evaluate() recommends irpf-servicios for servicios and never a dudoso regime,
// fuzzed over the whole input space). What this file smoke-tests is what renders
// reliably: the page mounts, the default verdict is right, the auditable core is
// present, and — the one invariant that must never break — no régimen is ever
// priced at $0.

test('mounts, recommends monotributo to a shop, and never prints a $0 price', async ({ page }) => {
  await page.goto('/que-empresa-abrir-uruguay')
  await expect(page.locator('h1')).toContainText(/empresa/i, { timeout: 90_000 })

  // Default state (bienes, consumidor final, solo) → monotributo, with a real price.
  const verdict = page.locator('[data-testid="verdict"]')
  await expect(verdict).toContainText(/monotributo/i, { timeout: 90_000 })
  await expect(verdict).toContainText(/\$/)

  // The forbidden string: no price of zero anywhere on the page.
  const body = await page.locator('body').innerText()
  expect(body).not.toMatch(/\$\s*0(?!\d|[.,]\d)/)
})

test('renders the auditable core: every regime, the grey zone, and the honesty card', async ({
  page,
}) => {
  await page.goto('/que-empresa-abrir-uruguay')
  await expect(page.locator('h1')).toContainText(/empresa/i, { timeout: 90_000 })

  // The comparison table lists every regime, including the freelancer's paths —
  // this is the page's auditable core and it renders regardless of wizard state.
  const bodyLoc = page.locator('body')
  await expect(bodyLoc).toContainText('Servicios personales — IRPF Cat. II')
  await expect(bodyLoc).toContainText('SAS')
  await expect(bodyLoc).toContainText('SRL')
  await expect(bodyLoc).toContainText('Sociedad de hecho')

  // The contested Literal E path is surfaced as a grey zone, naming the norm — the
  // page never hides the cheaper-but-contested option, it declines to recommend it.
  await expect(bodyLoc).toContainText('4761')

  // The honesty card ("Lo que no podemos afirmar") is the page's differentiator.
  await expect(bodyLoc).toContainText('Lo que no podemos afirmar')

  // Sources are built from the data and dated.
  await expect(bodyLoc).toContainText('Fuentes primarias')

  // The invariant holds in this state too: no $0 price anywhere.
  const body = await bodyLoc.innerText()
  expect(body).not.toMatch(/\$\s*0(?!\d|[.,]\d)/)
})
