import { expect, test } from '@playwright/test'

// The page is Suspense-driven (a top-level `await useFetch` in <script setup>): a click that
// lands before hydration is silently swallowed — the same latent bug already found on /mapa and
// /casa-de-cambio-cerca-de-mi. Confirmed by hand against this exact page (2026-07-13): a click
// fired ~20s after navigation lands fine, but earlier clicks are dropped with no console error and
// no visible sign anything is wrong — the buttons just look clickable and are not yet. This page's
// component tree is heavier than most (12 full legal write-ups render up front), so give hydration
// a longer runway than the site's other Suspense pages. Every interaction below is gated with a
// `toPass` retry loop instead of a single click, per that finding.
test.setTimeout(120_000)

test('the diagnosis tool answers, and the plan links into the norm and testimonios', async ({
  page,
}) => {
  await page.goto('/problemas-con-la-aduana-uruguay')

  // The brief's illustrative selector was /paquete retenido/i, but the real copy (read from
  // app/server/utils/aduanaFallback.ts) is "El paquete quedó retenido sin explicación" — "quedó"
  // sits between the two words, so that literal phrase never matches. "retenido" alone is unique
  // across all 12 symptom labels.
  await expect(async () => {
    await page
      .getByRole('button', { name: /retenido/i })
      .first()
      .click({ timeout: 2000 })
    await expect(page.getByTestId('plan-de-accion')).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 90_000 })

  const plan = page.getByTestId('plan-de-accion')
  await expect(plan.getByRole('listitem').first()).toBeVisible()
  // A real step from the norm, not a placeholder — guards against the plan silently rendering empty.
  await expect(plan).toContainText('Correo Uruguayo')

  // "Ver la norma completa y los testimonios" jumps into the per-problem card, where the
  // testimonios block actually lives (it is not duplicated inside the summary plan).
  await plan.getByRole('button', { name: /norma completa y los testimonios/i }).click()

  const retenidoCard = page.locator('#problema-retenido')
  await expect(retenidoCard).toBeVisible()
  await expect(retenidoCard.getByTestId('testimonios')).toBeVisible()

  // The baseline snapshot carries no Reddit corpus (every problem ships quotes: [] / reports: 0 —
  // see the header comment in app/server/utils/aduanaFallback.ts), so "retenido" today falls
  // through to the honest empty-state copy rather than a reddit.com citation. If the weekly harvest
  // job's data is live behind /api/aduana when this runs, assert the real citation shape instead;
  // either way this is a concrete claim about the rendered DOM, not a skipped assumption.
  const testimonyText = (await retenidoCard.getByTestId('testimonios').textContent()) ?? ''
  if (/juntamos testimonios/i.test(testimonyText)) {
    await expect(retenidoCard.getByTestId('testimonios')).toContainText(
      'Todavía no juntamos testimonios de r/uruguay para esta situación.'
    )
  } else {
    const quoteLinks = retenidoCard.getByTestId('testimonios').locator('.quotes-list a')
    await expect(quoteLinks.first()).toBeVisible()
    const hrefs = await quoteLinks.evaluateAll(as => as.map(a => a.getAttribute('href')))
    expect(hrefs.every(h => h && /reddit\.com/i.test(h))).toBe(true)
  }
})

test('the guide renders every problem and is honest about the data it is showing', async ({
  page,
}) => {
  // Proof, not assertion-by-hand: hit the same cached Nitro route the page itself calls
  // (app/server/api/aduana.get.ts) and confirm which link of the cascade actually answered.
  //
  // THIS TEST USED TO PIN `stale === true`. It was written while the production backend
  // 404'd on GET /aduana, so the run genuinely exercised the catch branch -> ADUANA_FALLBACK,
  // and its comment said in as many words that `stale` flipping was the signal to come back
  // here. The route shipped, `stale` went false, and the signal fired — into a CI job nobody
  // was reading yet. So it is answered now rather than re-pinned: pinning either value makes
  // this test a hostage of whatever the backend happens to be doing, which is exactly how it
  // broke. What is invariant is the CONTRACT — every problem becomes a scenario, the facts
  // appendix counts them, and the footer states the data's provenance truthfully — so that is
  // what gets asserted, with the freshness copy checked against the branch actually taken.
  const apiRes = await page.request.get('/api/aduana')
  expect(apiRes.ok()).toBe(true)
  const payload = await apiRes.json()
  expect(payload.problems.length).toBe(12)
  expect(payload.facts.length).toBeGreaterThan(0)

  await page.goto('/problemas-con-la-aduana-uruguay')

  // Every problem in the payload made it onto the page as a clickable scenario, not a subset.
  await expect(page.locator('.scenario')).toHaveCount(payload.problems.length)

  // The footer never claims a freshness it does not have, in either branch.
  if (payload.updatedAt) {
    await expect(page.getByText(/Actualizado el /)).toBeVisible()
  } else {
    await expect(
      page.getByText('Todavía no tenemos fecha de la última actualización en vivo.')
    ).toBeVisible()
  }

  // The two-week warning is shown when, and only when, the payload is stale.
  const staleWarning = page.getByText(/no se actualizan hace más de dos semanas/)
  if (payload.stale) {
    await expect(staleWarning).toBeVisible()
  } else {
    await expect(staleWarning).toHaveCount(0)
  }

  // The facts appendix reflects every cited fact, not an empty shell.
  await expect(page.getByText(/Todos los datos citados en esta guía \(\d+\)/)).toBeVisible()
})
