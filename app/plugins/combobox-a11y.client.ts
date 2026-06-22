// Patches two Vuetify 3.9 accessibility gaps that cap the Lighthouse a11y score
// (Vuetify 4 reworks both; we're pinned to 3.x):
//   1. VSelect/VAutocomplete mark BOTH the `.v-field` wrapper AND its inner
//      <input> with role="combobox", but only wire the combobox ARIA
//      (aria-expanded/controls/haspopup) onto the wrapper. The bare, unwired role
//      on the <input> is a duplicate combobox that trips `aria-required-attr`.
//      The wrapper is the real combobox, so strip the redundant input role.
//   2. VSlider's `aria-label` lands on the component root, not on the
//      `role="slider"` thumb (the actual widget), so the thumb has no accessible
//      name (`aria-input-field-name`). Copy the root's label onto the thumb.
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const strip = () => {
    document
      .querySelectorAll('.v-field[role="combobox"] input[role="combobox"]')
      .forEach(el => el.removeAttribute('role'))

    document
      .querySelectorAll<HTMLElement>('.v-slider-thumb[role="slider"]:not([aria-label]):not([aria-labelledby])')
      .forEach(thumb => {
        const label = thumb.closest('.v-input, .v-slider')?.getAttribute('aria-label')
        if (label) thumb.setAttribute('aria-label', label)
      })

    // 3. Vuetify defaults EVERY <VList> to role="listbox", but most are nav/content
    //    lists (links, dividers, plain items) — a listbox with non-option children
    //    that needs a name trips `aria-required-children` + `aria-input-field-name`.
    //    Genuine select/autocomplete dropdowns render their items with
    //    role="option"; leave those alone and demote the rest to a plain container.
    document.querySelectorAll<HTMLElement>('.v-list[role="listbox"]').forEach(list => {
      if (list.querySelector('[role="option"]')) return
      list.setAttribute('role', 'presentation')
      if (list.getAttribute('tabindex') === '0') list.setAttribute('tabindex', '-1')
    })
  }

  let scheduled = false
  const schedule = () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      strip()
    })
  }

  const start = () => {
    strip()
    // Selects can mount at any time (dialogs, menus, lazy sections); re-strip on
    // DOM changes, coalesced to one pass per frame so it stays cheap.
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true })
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', start, { once: true })
  } else {
    start()
  }
})
