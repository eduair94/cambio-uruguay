const CHUNK_MESSAGE =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading (?:CSS )?chunk\b[^\n]+\bfailed|Unable to preload CSS/i

/** Browser/Vite/webpack messages only; an arbitrary application error is not a failed asset. */
export function isChunkLoadError(error: unknown): boolean {
  const seen = new Set<object>()
  let current = error
  for (let depth = 0; depth < 8 && current; depth++) {
    if (typeof current === 'string') return CHUNK_MESSAGE.test(current)
    if (typeof current !== 'object' || seen.has(current)) return false
    seen.add(current)
    const value = current as { name?: unknown; message?: unknown; cause?: unknown }
    if (
      value.name === 'ChunkLoadError' ||
      (typeof value.message === 'string' && CHUNK_MESSAGE.test(value.message))
    )
      return true
    current = value.cause
  }
  return false
}

export interface SsrRecoverySnapshot {
  url: string
  html: string
  title: string
  description: string | null
  canonical: string | null
  robots: string | null
}

/** One browser boot, never a route cache or a value serialized into Nuxt's payload. */
export function createSsrRecovery() {
  let snapshot: SsrRecoverySnapshot | null = null
  let initialized = false
  let startupFailed = false
  let serverError = false
  let reloadRequested = false

  return {
    capture(doc: Document, url: string, serverRendered: boolean, error: unknown) {
      if (initialized) return
      initialized = true
      serverError = Boolean(error)
      const root = doc.getElementById('__nuxt')
      if (!serverRendered || serverError || !root?.innerHTML.trim()) return
      snapshot = {
        url,
        html: root.innerHTML,
        title: doc.title,
        description: doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? null,
        canonical: doc.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
        robots: doc.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null,
      }
    },
    noteStartupError() {
      startupFailed = true
    },
    finishHydration(error: unknown) {
      // ErrorComponent also resolves Suspense. That must not discard its original document.
      if (!startupFailed && !error) snapshot = null
    },
    forUrl(url: string) {
      return snapshot?.url === url ? snapshot : null
    },
    wasServerError() {
      return serverError
    },
    requestReload(reload: () => void) {
      if (reloadRequested) return false
      reloadRequested = true
      reload()
      return true
    },
  }
}

// The client-only plugin is the only writer. Server renders never capture a document here.
export const ssrRecovery = createSsrRecovery()

/** The already-composed SSR title must not receive the site's title template a second time. */
export function recoveredSsrHead(snapshot: SsrRecoverySnapshot) {
  return {
    title: snapshot.title,
    titleTemplate: null,
    meta: [
      { name: 'description', content: snapshot.description },
      { name: 'robots', content: snapshot.robots },
    ],
    link: snapshot.canonical === null ? [] : [{ rel: 'canonical', href: snapshot.canonical }],
  }
}

export function fallbackErrorHead(title: string, statusCode: number, wasServerError: boolean) {
  return {
    title,
    titleTemplate: null,
    // A client error can have statusCode 404 after a successful HTTP 200. It is not an HTTP 404.
    meta:
      wasServerError && statusCode === 404 ? [{ name: 'robots', content: 'noindex, follow' }] : [],
  }
}

/**
 * Make a detached copy of our own pre-hydration SSR readable without Vue handlers.
 * This is not a sanitizer for arbitrary external HTML. Never pass a hydrated DOM or stored HTML.
 */
export function staticSsrHtml(html: string, doc: Document): string {
  const template = doc.createElement('template')
  template.innerHTML = html
  template.content
    .querySelectorAll(
      'script, iframe, object, embed, .cu-ad, .adsbygoogle, .google-auto-placed, [data-ad-slot], [data-adsbygoogle-status]'
    )
    .forEach(element => element.remove())

  for (const element of template.content.querySelectorAll('*')) {
    for (const attribute of Array.from(element.attributes)) {
      if (/^on/i.test(attribute.name) || attribute.name === 'autofocus')
        element.removeAttribute(attribute.name)
    }
    if (element.hasAttribute('contenteditable')) element.setAttribute('contenteditable', 'false')
    if (element.matches('button, input, select, textarea, fieldset, option, optgroup'))
      element.setAttribute('disabled', '')
    if (
      element.matches(
        'form, [role="button"]:not(a[href]), [role="switch"], [role="slider"], [role="combobox"]'
      )
    ) {
      element.setAttribute('aria-disabled', 'true')
      element.setAttribute('tabindex', '-1')
    }
  }
  return template.innerHTML
}
