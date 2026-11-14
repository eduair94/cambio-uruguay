/** Rules for the optional exit notice. No URL is rewritten or accepted from a query parameter. */
export const EXTERNAL_EXIT_SECONDS = 10
export const EXTERNAL_EXIT_PREFERENCE = 'cu_external_exit_skip_session'

export interface ExternalLinkInput {
  href: string
  target?: string | null
  rel?: string | null
  referrerPolicy?: string | null
  download?: boolean
  skip?: boolean
}

export interface ExternalDestination {
  href: string
  host: string
  target: '_self' | '_blank'
  rel: string
  referrerPolicy: string
  sponsored: boolean
}

const directHosts = [
  'accounts.google.com',
  'appleid.apple.com',
  'login.microsoftonline.com',
  'paypal.com',
  'paypal.me',
  'ko-fi.com',
  'mpago.la',
  'mercadopago.com',
  'mercadopago.com.uy',
  'mercadopago.com.ar',
  'wa.me',
  'whatsapp.com',
  't.me',
  'telegram.me',
]

function isDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`)
}

function isDirectAction(url: URL): boolean {
  if (directHosts.some(host => isDomain(url.hostname, host))) return true
  if (url.pathname.startsWith('/__/auth/')) return true
  if (/\/(?:oauth2?|authorize|checkout)(?:\/|$)/i.test(url.pathname)) return true
  if (url.searchParams.has('client_id') && url.searchParams.has('redirect_uri')) return true
  if (
    ['twitter.com', 'x.com', 'bsky.app'].some(host => isDomain(url.hostname, host)) &&
    url.pathname.startsWith('/intent/')
  )
    return true
  if (isDomain(url.hostname, 'facebook.com') && url.pathname.startsWith('/sharer')) return true
  if (isDomain(url.hostname, 'linkedin.com') && url.pathname.startsWith('/sharing/')) return true
  if (isDomain(url.hostname, 'reddit.com') && url.pathname === '/submit') return true
  return false
}

/** Leave auth, contact/share actions, downloads and frame/named targets to the browser. */
export function externalDestination(
  link: ExternalLinkInput,
  currentHref: string
): ExternalDestination | null {
  if (link.download || link.skip || !link.href.trim()) return null
  const target = (link.target || '_self').toLowerCase()
  if (target !== '_self' && target !== '_blank') return null

  try {
    const current = new URL(currentHref)
    const destination = new URL(link.href, current)
    if (!['https:', 'http:'].includes(destination.protocol)) return null
    if (destination.username || destination.password) return null
    if (destination.origin === current.origin) return null
    if (isDomain(destination.hostname, 'cambio-uruguay.com')) return null
    if (isDirectAction(destination)) return null

    // Preserve sponsorship/nofollow and the original referrer policy, while preventing opener access.
    const rel = new Set((link.rel || '').toLowerCase().split(/\s+/).filter(Boolean))
    rel.add('noopener')
    return {
      href: destination.href,
      host: destination.host,
      target,
      rel: [...rel].join(' '),
      referrerPolicy: rel.has('noreferrer') ? 'no-referrer' : link.referrerPolicy || '',
      sponsored: rel.has('sponsored'),
    }
  } catch {
    return null
  }
}

/** Ctrl/Cmd, middle click and gestures already handled by a component retain native behaviour. */
export function isPlainExternalClick(event: {
  defaultPrevented: boolean
  button: number
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  altKey: boolean
}): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

export function remainingExitSeconds(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000))
}

/** Confirmed exits need no search parameters, fragments or credentials in analytics. */
export function externalExitTracking(destination: ExternalDestination): {
  link_url: string
  link_domain: string
} {
  const url = new URL(destination.href)
  // Origin only, like every outbound event (plugins/track-clicks): a path can carry an id or token.
  return { link_url: url.origin, link_domain: url.hostname }
}
