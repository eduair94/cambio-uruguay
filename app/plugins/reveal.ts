// `v-reveal`: a soft arrival for blocks the reader scrolls down to.
//
//   <section v-reveal>              the element itself
//   <section v-reveal="120">        … 120 ms after it enters
//   <VRow v-reveal.children>        its element children, one after another: a list that arrives
//                                   as a list. The whole stagger is capped at ~0.4 s, so a row of
//                                   forty links does not keep the reader waiting for the last one.
//
// Content is never hidden by default. The server HTML, a failed script, reduced motion and
// anything already on screen when the page mounts all render exactly as written: only an element
// still BELOW the fold at mount is primed (faded, 14 px low), and it settles as soon as it comes
// into view. Before 2026-11-28 the directive added a CSS class that set `opacity: 0` on every
// element at mount, so a section already on screen blinked out and faded back in.
//
// Universal plugin so SSR template compilation resolves the directive; all the work happens in
// `mounted`, which only runs in the browser. The tween is Motion's `animate` (motion/mini, a thin
// layer over the Web Animations API: it runs on the compositor and is released when it ends),
// imported on demand: this plugin sits in every page's entry chunk, and the library does not need
// to. The import starts the moment something is primed, so it is there when the element enters;
// if it is not there 600 ms after that (offline, a failed chunk) the element is simply shown.
import { EASE_ARRIVE, MOTION_DURATION, motionReduced } from '~/utils/motionPresets'

interface RevealEl extends HTMLElement {
  __revealStop?: VoidFunction
}

type Animate = typeof import('motion/mini').animate

const LIFT = 14 // px, a little more than one line of body text's leading
const STAGGER_CAP = 0.4 // s, the most the last child of a list may wait
const LOAD_GRACE = 600 // ms an entered element may wait for the library before it is just shown

let motion: Promise<Animate> | undefined
const loadAnimate = () => (motion ??= import('motion/mini').then(m => m.animate))

function clear(targets: HTMLElement[]) {
  for (const el of targets) {
    el.style.removeProperty('opacity')
    el.style.removeProperty('transform')
  }
}

export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.vueApp.directive<RevealEl, number | undefined>('reveal', {
    mounted(el, binding) {
      if (!import.meta.client || motionReduced()) return
      if (typeof IntersectionObserver === 'undefined') return
      // On screen already, or above it after a restored scroll: leave it exactly as it is.
      if (el.getBoundingClientRect().top < window.innerHeight) return

      const targets = binding.modifiers.children
        ? (Array.from(el.children).filter(c => c instanceof HTMLElement) as HTMLElement[])
        : [el]
      if (!targets.length) return

      for (const t of targets) {
        t.style.opacity = '0'
        t.style.transform = `translateY(${LIFT}px)`
      }
      const ready = loadAnimate()

      const startDelay = (Number(binding.value) || 0) / 1000
      const step = Math.min(0.06, STAGGER_CAP / targets.length)
      // Any pixel, 8 % up from the bottom edge. Not a ratio: a section ten screens tall can never
      // show 12 % of itself at once, and a ratio threshold would leave it invisible.
      const observer = new IntersectionObserver(
        entries => {
          if (!entries.some(entry => entry.isIntersecting)) return
          observer.disconnect()
          const grace = new Promise<null>(resolve => setTimeout(() => resolve(null), LOAD_GRACE))
          Promise.race([ready, grace])
            .then(animate => {
              if (!animate) return clear(targets)
              return animate(
                targets,
                { opacity: [0, 1], transform: [`translateY(${LIFT}px)`, 'translateY(0px)'] },
                {
                  duration: MOTION_DURATION.arrive,
                  ease: EASE_ARRIVE,
                  delay: (i: number) => startDelay + i * step,
                }
              ).finished.then(() => clear(targets))
            })
            .catch(() => clear(targets))
        },
        { rootMargin: '0px 0px -8% 0px' }
      )
      observer.observe(el)
      el.__revealStop = () => {
        observer.disconnect()
        clear(targets)
      }
    },
    unmounted(el) {
      el.__revealStop?.()
    },
  })
})
