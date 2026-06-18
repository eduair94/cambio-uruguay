// Load the Tawk.to chat widget lazily — only on the first user interaction (or
// when the browser is idle), never on the critical path. This keeps the widget
// out of FCP/LCP/TBT for the (many) visitors who never open chat, while still
// loading it the moment someone engages.
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  let loaded = false
  const load = () => {
    if (loaded) return
    loaded = true
    cleanup()
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://embed.tawk.to/63c9feb9c2f1ac1e202ea427/1gn6gm1s3'
    script.charset = 'UTF-8'
    script.setAttribute('crossorigin', '*')
    document.head.appendChild(script)
  }

  const events = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'mousemove'] as const
  const cleanup = () => events.forEach(e => window.removeEventListener(e, load))
  events.forEach(e => window.addEventListener(e, load, { once: true, passive: true }))

  // Idle fallback so chat still appears for a fully passive visitor.
  const idle = (window as any).requestIdleCallback as undefined | ((cb: () => void) => void)
  if (idle) idle(() => setTimeout(load, 6000))
  else setTimeout(load, 8000)
})
