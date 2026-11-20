/**
 * One click handler for a whole container of plain `<a href>` internal links, navigating
 * client-side the way a NuxtLink would.
 *
 * Why not NuxtLink: each one is two component instances (NuxtLink + RouterLink) that every page
 * load hydrates, and NuxtLink prefetches the page chunk of every link that scrolls into view. The
 * footer's link directory is ~245 links: ~490 instances hydrated on every page (measured
 * 2026-11-07, 570 for the whole footer) and ~245 chunk prefetches for whoever reaches it. Plain
 * anchors keep the exact same href for crawlers, no-JS, middle-click and "open in new tab".
 *
 * Deferring the footer's hydration instead was tried (#262) and reverted (#263): Auto Ads inserts
 * its nodes inside the not-yet-hydrated footer, and the late hydration deleted them as mismatches.
 */
export function createSpaLinkHandler(navigate: (path: string) => unknown) {
  return (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const target = event.target as Element | null
    const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null
    if (!anchor) return
    if ((anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return
    const href = anchor.getAttribute('href') ?? ''
    // Only same-site paths; `//host` is protocol-relative, i.e. another site.
    if (!href.startsWith('/') || href.startsWith('//')) return
    event.preventDefault()
    navigate(href)
  }
}
