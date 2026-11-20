// ARIA patches for Vuetify 4.2 (installed: 4.2.2). Pure DOM, no Nuxt imports, so
// the plugin (plugins/combobox-a11y.client.ts) only wires it up and the tests run it in jsdom.
//
// 1. VSelect/VAutocomplete/VCombobox pass `role="combobox"` to VTextField, which puts it on BOTH the
//    `.v-field` wrapper (VTextField.js:179) and the <input> (VTextField.js:209). The input is the
//    complete combobox in 4.x: it is the focusable element and filterInputAttrs routes the
//    component's aria-expanded/aria-controls to it (VSelect.js:473-474). The wrapper is a second
//    combobox nobody can focus, and on phones it swallows the label of the VDataTable sort select
//    (axe empty-table-header). On top of that the wrapper is the VMenu activator (`activator:
//    "parent"`, skipping the `data-no-activator` .v-field__input), so useActivator writes
//    aria-haspopup/expanded/controls/owns onto it with setAttribute (useActivator.js:267-276,
//    VMenu.js:170-175) — again on every open and close, outside Vue's vnode diff.
//    So: leave the input alone and strip the combobox ARIA from the wrapper, every time it comes
//    back. Until 2026-11 this patch did the opposite (the Vuetify 3.9 layout) and left a textbox
//    carrying aria-expanded: axe aria-allowed-attr, critical, 211 nodes on 64 page-profiles.
// 2. A VSlider label that lands on the root and not on the `role="slider"` thumb is copied to the
//    thumb. Under 4.2 the label already reaches the thumb; kept because it is a no-op there.
// 3. A `.v-list` is a listbox only when Vuetify made it selectable (VList.js:312) — and VSelect
//    makes its menu selectable only while it has items (VSelect.js:520). A listbox with no
//    option is demoted to a plain container. A `role="list"` whose children are all links
//    (VListItem.js:118 gives an item with href/to `role="link"`, never `listitem`) is a list with
//    no list items (axe aria-required-children): demoted the same way.
//    Demoting must not cost the keyboard its links. A VList is ONE roving tab stop: the list has
//    tabindex 0 (VList.js:311) and forwards focus to its first item (VList.js:208-213), while
//    every clickable item of a list gets tabindex -2 (VListItem.js:251) and is reached with the
//    arrows. With the list at -1 nothing would be tabbable, so each -2 item of the demoted list
//    becomes an ordinary tab stop (0). Vue does not write it back: the item's computed tabindex
//    stays -2, and Vue patches an attribute only when its vnode value changes. (Inside a VMenu
//    this also lets Tab move through the links instead of finding no tabIndex >= 0 element and
//    closing the menu, VMenu.js:107.) The list's own tabindex IS reactive — `disabled ||
//    isFocused ? -1 : 0` — so after focus leaves it Vue writes 0 back; the observer watches
//    `tabindex` and re-demotes such a list. A link list that matters in the server HTML should
//    still get `role="presentation" tabindex="-1"` on the VList and `tabindex="0"` on its
//    items in the template (as pages/sucursal/[slug].vue does): attributes passed to VList win
//    over Vuetify's, so nothing has to be repaired there.

/** Combobox ARIA that the wrapper must not carry once its input is the combobox. */
export const WRAPPER_COMBOBOX_ATTRS = [
  'role',
  'aria-haspopup',
  'aria-expanded',
  'aria-controls',
  'aria-owns',
] as const

function removePresent(el: Element, names: readonly string[]): void {
  for (const name of names) if (el.hasAttribute(name)) el.removeAttribute(name)
}

function demote(list: HTMLElement): void {
  if (list.getAttribute('role') !== 'presentation') list.setAttribute('role', 'presentation')
  if (list.getAttribute('tabindex') === '0') list.setAttribute('tabindex', '-1')
  // The list's own roving items (not those of a nested list) become tab stops of their own.
  list.querySelectorAll<HTMLElement>('[tabindex="-2"]').forEach(item => {
    if (item.closest('.v-list') === list) item.setAttribute('tabindex', '0')
  })
}

/** True when the list has at least one element child and every element child is a link. */
function onlyLinkChildren(list: Element): boolean {
  const children = Array.from(list.children)
  return children.length > 0 && children.every(child => child.getAttribute('role') === 'link')
}

/**
 * Applies the three patches under `root`. Idempotent: it only removes attributes that are present
 * and only touches lists that still carry their Vuetify role or tabindex, so a second run changes
 * nothing.
 */
export function patchComboboxes(root: ParentNode = document): void {
  // Selected through the INPUT, not through `.v-field[role="combobox"]`: once the wrapper's role
  // is gone that selector would no longer find the wrapper when the activator writes its
  // aria-expanded back.
  root.querySelectorAll('.v-field input[role="combobox"]').forEach(input => {
    const field = input.closest('.v-field')
    if (field) removePresent(field, WRAPPER_COMBOBOX_ATTRS)
  })

  root
    .querySelectorAll<HTMLElement>(
      '.v-slider-thumb[role="slider"]:not([aria-label]):not([aria-labelledby])'
    )
    .forEach(thumb => {
      const label = thumb.closest('.v-input, .v-slider')?.getAttribute('aria-label')
      if (label) thumb.setAttribute('aria-label', label)
    })

  root.querySelectorAll<HTMLElement>('.v-list[role="listbox"]').forEach(list => {
    if (list.querySelector('[role="option"]')) return
    demote(list)
  })

  root.querySelectorAll<HTMLElement>('.v-list[role="list"]').forEach(list => {
    if (onlyLinkChildren(list)) demote(list)
  })

  // A demoted link list that Vue made focusable again after focus left it (tabindex back to 0):
  // role=presentation on a focusable element is ignored (axe presentation-role-conflict).
  root.querySelectorAll<HTMLElement>('.v-list[role="presentation"][tabindex="0"]').forEach(list => {
    if (onlyLinkChildren(list)) demote(list)
  })
}

/**
 * Runs the patch now and again after every DOM change under `doc.body`, coalesced to one pass per
 * frame. Watches `aria-expanded` besides child nodes because the VMenu activator rewrites the
 * wrapper's ARIA on each open/close (and once more when it binds on mount) without adding or
 * removing any node, and `tabindex` because VList writes its own back to 0 when focus leaves it.
 * Returns the disconnect.
 */
export function watchComboboxes(
  doc: Document = document,
  frame: (cb: () => void) => unknown = cb => requestAnimationFrame(cb)
): () => void {
  let scheduled = false
  const schedule = () => {
    if (scheduled) return
    scheduled = true
    frame(() => {
      scheduled = false
      patchComboboxes(doc)
    })
  }
  patchComboboxes(doc)
  const view = doc.defaultView ?? window
  const observer = new view.MutationObserver(schedule)
  observer.observe(doc.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-expanded', 'tabindex'],
  })
  return () => observer.disconnect()
}
