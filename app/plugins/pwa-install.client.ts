interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Capture the browser affordance silently. Only the visitor's install button
// may invoke it; visiting, scrolling, accepting cookies and waiting never do.
export default defineNuxtPlugin(nuxtApp => {
  const promptEvent = shallowRef<InstallPromptEvent | null>(null)
  const displayMode = window.matchMedia('(display-mode: standalone)')
  const standalone = ref(
    displayMode.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const busy = ref(false)
  const available = computed(() => !standalone.value && Boolean(promptEvent.value || ios))

  function capture(event: Event) {
    event.preventDefault()
    if (!standalone.value) promptEvent.value = event as InstallPromptEvent
  }
  function installed() {
    standalone.value = true
    promptEvent.value = null
  }
  function modeChanged(event: MediaQueryListEvent) {
    standalone.value = event.matches
    if (event.matches) promptEvent.value = null
  }
  async function install(): Promise<'accepted' | 'dismissed' | 'instructions' | 'unavailable'> {
    if (standalone.value || busy.value) return 'unavailable'
    const event = promptEvent.value
    if (!event) return ios ? 'instructions' : 'unavailable'
    busy.value = true
    // An install event can be consumed only once, even if its promise rejects.
    promptEvent.value = null
    try {
      await event.prompt()
      const { outcome } = await event.userChoice
      if (outcome === 'accepted') installed()
      return outcome
    } finally {
      busy.value = false
    }
  }

  window.addEventListener('beforeinstallprompt', capture)
  window.addEventListener('appinstalled', installed)
  displayMode.addEventListener('change', modeChanged)
  const dispose = () => {
    window.removeEventListener('beforeinstallprompt', capture)
    window.removeEventListener('appinstalled', installed)
    displayMode.removeEventListener('change', modeChanged)
    promptEvent.value = null
  }
  nuxtApp.vueApp.onUnmount(dispose)
  if (import.meta.hot) import.meta.hot.dispose(dispose)

  return { provide: { pwaInstall: { available, busy, install } } }
})
