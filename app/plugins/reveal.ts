// Registers the `v-reveal` directive used for scroll-reveal animations.
//
// Universal plugin (registered on server + client) so SSR template compilation
// resolves the directive; the IntersectionObserver work only runs on the client
// inside `mounted`. Honors `prefers-reduced-motion` by revealing immediately.
interface RevealEl extends HTMLElement {
  __revealObserver?: IntersectionObserver
}

export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.vueApp.directive('reveal', {
    mounted(el: RevealEl, binding) {
      if (!import.meta.client) return
      el.classList.add('reveal')

      const reducedMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches

      if (reducedMotion || !('IntersectionObserver' in window)) {
        el.classList.add('is-revealed')
        return
      }

      const delay = Number(binding.value) || 0
      const observer = new IntersectionObserver(
        (entries, obs) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            const target = entry.target as HTMLElement
            if (delay) target.style.transitionDelay = `${delay}ms`
            target.classList.add('is-revealed')
            obs.unobserve(target)
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
      )
      observer.observe(el)
      el.__revealObserver = observer
    },
    unmounted(el: RevealEl) {
      el.__revealObserver?.disconnect()
    },
  })
})
