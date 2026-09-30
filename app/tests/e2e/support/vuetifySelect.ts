import type { Locator, Page } from '@playwright/test'

/**
 * Picks an option from the Vuetify select menu that is currently open.
 *
 * The menu renders its rows virtually: since Vuetify 4.2 only the rows in view (plus a small
 * buffer) exist in the DOM, so an option further down the list — Montevideo is the eleventh
 * department, Rivera the fourteenth — has to be scrolled into existence before it can be clicked,
 * exactly as a person would scroll to it.
 *
 * The menu also moves the list by itself when its opening animation ends: it scrolls the selected
 * row to the centre and focuses it. Scrolling before that loses the race — the list jumps back and
 * the row about to be clicked is unmounted — so the helper waits for the menu to finish opening.
 */
export async function pickOption(page: Page, name: string | RegExp) {
  const option = page.getByRole('option', { name, exact: typeof name === 'string' }).first()
  const listbox = page.locator('.v-overlay--active [role="listbox"]').last()
  await listbox.evaluate(element => {
    const menu = element.closest('.v-overlay__content') ?? element
    const opening = menu.getAnimations({ subtree: true }).map(animation => animation.finished)
    return Promise.allSettled(opening).then(() => undefined)
  })
  await settle(listbox)
  for (let step = 0; step < 50 && !(await option.count()); step++) {
    const moved = await listbox.evaluate(element => {
      const before = element.scrollTop
      element.scrollTop = before + Math.max(element.clientHeight / 2, 48)
      return element.scrollTop !== before
    })
    await settle(listbox)
    if (!moved) break
  }
  await option.evaluate(element => element.scrollIntoView({ block: 'center' }))
  await settle(listbox)
  await option.click()
}

/** Resolves once the list has kept the same scroll position and rows for several frames. */
function settle(listbox: Locator) {
  return listbox.evaluate(
    element =>
      new Promise<void>(resolve => {
        const snapshot = () =>
          `${element.scrollTop}|${[...element.querySelectorAll('[role="option"]')].map(row => row.textContent).join('|')}`
        let last = ''
        let calm = 0
        const tick = () => {
          const now = snapshot()
          calm = now === last ? calm + 1 : 0
          last = now
          if (calm >= 5) resolve()
          else requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })
  )
}
