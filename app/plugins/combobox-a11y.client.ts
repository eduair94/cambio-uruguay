// ARIA patches for Vuetify 4.2 selects, sliders and lists. What each patch does, and the Vuetify
// source lines that justify it, are in utils/comboboxA11y.ts.
//
// Timing: client plugins run before vueApp.mount, while the server DOM is not yet hydrated, so the
// first pass waits for `app:mounted` (it only schedules the patch; hydration itself is not
// delayed). Patching before hydration also worked in production — Vue keeps attributes removed
// from the server DOM, it does not repair attribute mismatches — but logged mismatch warnings in
// dev, and useActivator re-binds the wrapper ARIA on mount anyway. After that first pass the
// MutationObserver keeps patching: selects mount in dialogs, menus and lazy sections, the VMenu
// activator rewrites aria-expanded on every open/close, and VList writes its tabindex back.
import { watchComboboxes } from '~/utils/comboboxA11y'

export default defineNuxtPlugin(nuxtApp => {
  if (!import.meta.client) return

  nuxtApp.hook('app:mounted', () => {
    watchComboboxes(document)
  })
})
