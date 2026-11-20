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
  // The drawer is where the orphan options lived, and it now mounts its items only when it opens
  // (the closed SSR drawer ships empty to keep the first HTML light). A test that waits for its
  // section headers on a closed drawer waits forever — so it opens the menu, like a person does.
  //
  // "Open" is read from the button's `aria-expanded`, NOT from the drawer being visible: once the
  // app hydrates, the CLOSED drawer is a box translated off screen, which Playwright already counts
  // as visible. A tap swallowed before hydration followed by that check passed with the menu still
  // shut, its items never mounted, and the wait below timed out (CI, 2026-11-20). The tap is also
  // skipped when the menu is already open, because the button toggles.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const menu = page.locator('.v-app-bar [aria-controls="mobile-navigation"]')
  await expect(async () => {
    if ((await menu.getAttribute('aria-expanded')) !== 'true') await menu.click()
    await expect(menu).toHaveAttribute('aria-expanded', 'true', { timeout: 3_000 })
  }).toPass({ timeout: 60_000 })

  // Gate on the drawer headers themselves, NOT on `[role="option"]`.
  //
  // The first version of this test waited for `[role="option"], [role="listbox"]`
  // to be attached, and that is unsatisfiable on a healthy page: once the drawer
  // stops emitting orphan options there are no options left, and the palette's
  // listbox only exists while the palette is open. It timed out for exactly the
  // reason the fix worked. Anchor on an element that is present once the drawer is open.
  // Since 2026-11-20 the drawer is plain markup (components/MobileNavList.vue): its section
  // headers are <button class="mobile-nav__toggle">, no longer Vuetify list-group headers.
  const headers = page.locator('#mobile-navigation .mobile-nav__toggle')
  await expect(headers.first()).toBeAttached({ timeout: 30_000 })

  // Guard the guard: if the drawer ever stops rendering, the orphan check below
  // would pass vacuously and this test would go green while testing nothing.
  expect(await headers.count()).toBeGreaterThan(0)

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

  // Same family of defect, other role: the drawer's "Menu" header was a bare VListItem, which
  // Vuetify 4 renders as role="listitem" — inside a role="presentation" list, so with no list
  // parent (axe aria-required-parent, critical, on 70 of 72 phone pages probed 2026-11-19).
  const orphanItems = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="listitem"]'))
      .filter(el => !el.closest('[role="list"]'))
      .map(el => {
        const e = el as HTMLElement
        return {
          cls: e.className?.toString().slice(0, 80) || '(sin clase)',
          text: (e.textContent || '').trim().slice(0, 40),
        }
      })
  )
  expect(
    orphanItems,
    `role="listitem" fuera de un list:\n${orphanItems.map(o => `  "${o.text}" — ${o.cls}`).join('\n')}`
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
