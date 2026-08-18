import { expect, test } from '@playwright/test'

test.use({ locale: 'es-UY' })

/**
 * `role="option"` is only meaningful inside a `listbox`. An option anywhere else
 * is orphaned: assistive tech announces "option, 1 of N" for something that is
 * not part of any selection, and the surrounding list stops being announced as
 * a list.
 *
 * This regression exists because of how Vuetify 4 derives the role. `VListGroup`
 * injects its own `value` into the activator `VListItem` (VListGroup.js, the
 * `activatorDefaults` block), and `VListItem` computes
 * `role = isLink ? 'link' : isSelectable ? 'option' : 'listitem'` with
 * `isSelectable = !!list && (root.selectable || root.activatable || props.value != null)`.
 * A `value` is enough. So every collapsible section header in the navigation
 * drawer shipped as `role="option"` inside a `role="presentation"` list from the
 * 3.9 -> 4.1.5 upgrade onward, with nothing to catch it: the E2E suite was not
 * wired into CI until three weeks later, and when it was, this surfaced only
 * indirectly as three unrelated-looking search failures.
 *
 * The assertion is deliberately global rather than drawer-specific. The next
 * component to hand a `value` to a list item will reintroduce this, and the
 * point of the guard is to fail on that too.
 */
test('no element claims role="option" outside a listbox', async ({ page }) => {
  await page.goto('/')

  // Hydration gate: the drawer's VListGroup headers are what regressed, and they
  // are client-rendered. Poll rather than assert once so a slow dev server does
  // not read as a pass.
  await expect(async () => {
    await expect(page.locator('[role="option"], [role="listbox"]').first()).toBeAttached({
      timeout: 2_000,
    })
  }).toPass({ timeout: 60_000 })

  const orphans = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="option"]'))
      .filter(el => !el.closest('[role="listbox"]'))
      .map(el => {
        const e = el as HTMLElement
        return {
          id: e.id || '(sin id)',
          cls: e.className?.toString().slice(0, 80) || '(sin clase)',
          text: (e.textContent || '').trim().slice(0, 40),
        }
      })
  )

  expect(
    orphans,
    `role="option" fuera de un listbox:\n${orphans.map(o => `  ${o.id} — "${o.text}" — ${o.cls}`).join('\n')}`
  ).toEqual([])
})

/**
 * The other half of the contract: the palette's options must stay inside its
 * listbox. If SearchResults.vue ever loses `role="listbox"` the test above would
 * go green for the wrong reason — every option would be an orphan and the filter
 * would still find them, but so would a page with no palette at all.
 */
test('the search palette exposes its options inside its own listbox', async ({ page }) => {
  await page.goto('/')
  const input = page.locator('.search-palette__input')

  await expect(async () => {
    await page.keyboard.press('Control+k')
    await expect(input).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 60_000 })

  await expect(async () => {
    await input.fill('dolar')
    await expect(page.locator('#cu-search-listbox [role="option"]').first()).toBeVisible({
      timeout: 2_000,
    })
  }).toPass({ timeout: 30_000 })

  await expect(page.locator('#cu-search-listbox')).toHaveAttribute('role', 'listbox')
})
