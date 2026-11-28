// A soft arrival for the page after a client-side navigation: the new page's column settles from
// 35 % to full ink in a quarter of a second. It tells the reader "this is a new page" without
// making them wait for it.
//
// Deliberately only opacity, and only on arrival:
// - No leave animation. Nuxt's `pageTransition` with `mode: 'out-in'` holds the old page until the
//   new one resolves, and some directories here take seconds to resolve.
// - No View Transitions. `document.startViewTransition` freezes a screenshot of the old page until
//   the new one finishes, for the same seconds, and nothing on screen answers meanwhile.
// - No transform. A transformed ancestor becomes the containing block of every `position: fixed`
//   descendant, so sticky bars and floating buttons inside the page would jump for the duration.
// The first `page:finish` is the hydration of the server page, which is already on screen.
//
// Motion (motion/mini) is fetched once the app is idle after hydration, never in the entry chunk;
// a navigation that happens before it arrived simply is not animated.
import { EASE_ARRIVE, MOTION_DURATION, motionReduced } from '~/utils/motionPresets'

export default defineNuxtPlugin(nuxtApp => {
  let animate: typeof import('motion/mini').animate | undefined
  onNuxtReady(() => {
    if (motionReduced()) return
    import('motion/mini').then(
      m => (animate = m.animate),
      () => {}
    )
  })

  let hydrated = false
  nuxtApp.hook('page:finish', () => {
    if (!hydrated) {
      hydrated = true
      return
    }
    if (!animate || motionReduced()) return
    const column = document.querySelector<HTMLElement>('#main .container_custom')
    if (!column) return
    animate(
      column,
      { opacity: [0.35, 1] },
      { duration: MOTION_DURATION.state, ease: EASE_ARRIVE }
    ).finished.then(
      () => column.style.removeProperty('opacity'),
      () => column.style.removeProperty('opacity')
    )
  })
})
