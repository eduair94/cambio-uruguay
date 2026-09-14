/** A reviewed association with a business profile, never a search query. */
export interface MovingReviewProfile {
  key: string
  providerId: string
  platform: 'google'
  status: 'verified' | 'ambiguous' | 'rejected'
  placeId?: string
  profileUrl: string
  label: string
  expectedNames: string[]
  expectedCountryCode?: string
  expectedPhoneNumbers?: string[]
  identityEvidence?: { kind: string; sourceUrl: string; value?: string }[]
  verifiedAt?: string
  checkedAt?: string
}

export interface MovingReviewAttribution {
  displayName: string
  uri: string | null
}

export type MovingReviewsStatus =
  | 'ok'
  | 'no_reviews'
  | 'unknown_profile'
  | 'profile_required'
  | 'invalid_request'
  | 'not_configured'
  | 'unavailable'
  | 'identity_mismatch'
  | 'rate_limited'
  | 'busy'

/** Ephemeral response: it must not be added to the provider catalog or a cache. */
export interface MovingReviewsResult {
  providerId: string
  profileKey: string | null
  platform: 'google'
  status: MovingReviewsStatus
  rating: number | null
  count: number | null
  profileUrl: string | null
  profileLabel: string | null
  checkedAt: string | null
  attributions: MovingReviewAttribution[]
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function safeLink(value: unknown): string | null {
  if (
    typeof value !== 'string' ||
    value.length > 2048 ||
    [...value].some(character => character.charCodeAt(0) <= 32)
  )
    return null
  try {
    const url = new URL(value)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null
    return url.href
  } catch {
    return null
  }
}

/** Only known Google profile links are suitable for the public source button. */
export function safeMovingGoogleProfileUrl(value: unknown): string | null {
  const safe = safeLink(value)
  if (!safe) return null
  const url = new URL(safe)
  if (url.protocol !== 'https:') return null
  if (['g.page', 'maps.app.goo.gl', 'maps.google.com', 'maps.google.com.uy'].includes(url.hostname))
    return safe
  if (['google.com', 'www.google.com', 'google.com.uy', 'www.google.com.uy'].includes(url.hostname))
    return url.pathname === '/maps' || url.pathname.startsWith('/maps/') ? safe : null
  return url.hostname === 'goo.gl' && url.pathname.startsWith('/maps/') ? safe : null
}

export function movingReviewsResult(
  providerId: string,
  status: MovingReviewsStatus,
  profile: MovingReviewProfile | null = null,
  checkedAt: string | null = null
): MovingReviewsResult {
  return {
    providerId,
    profileKey: profile?.key ?? null,
    platform: 'google',
    status,
    rating: null,
    count: null,
    profileUrl: safeMovingGoogleProfileUrl(profile?.profileUrl),
    profileLabel: profile?.label ?? null,
    checkedAt,
    attributions: [],
  }
}

export function isLiveMovingReviewProfile(profile: MovingReviewProfile): boolean {
  return (
    profile.platform === 'google' &&
    profile.status === 'verified' &&
    typeof profile.placeId === 'string' &&
    /^[\w-]{10,1024}$/.test(profile.placeId) &&
    profile.expectedNames.some(name => name.trim().length > 0) &&
    !!safeMovingGoogleProfileUrl(profile.profileUrl)
  )
}

function normalizedName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function matchesName(value: unknown, expectedNames: string[]): boolean {
  if (typeof value !== 'string' || value.length > 500) return false
  const actual = normalizedName(value)
  return expectedNames.some(name => {
    const expected = normalizedName(name)
    if (!expected) return false
    if (actual === expected) return true
    // Permit a reviewed brand with a service/locality label, not fuzzy token overlap.
    const genericNames = new Set([
      'flete',
      'fletes',
      'mudanza',
      'mudanzas',
      'transporte',
      'transportes',
      'armado',
      'armador',
      'muebles',
      'storage',
      'servicios',
      'limpieza',
      'cleaning',
    ])
    return (
      expected.length >= 5 && !genericNames.has(expected) && ` ${actual} `.includes(` ${expected} `)
    )
  })
}

function normalizedPhone(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const digits = value.replace(/\D/g, '').replace(/^00/, '')
  if (/^0\d{8}$/.test(digits)) return `598${digits.slice(1)}`
  if (/^[249]\d{7}$/.test(digits)) return `598${digits}`
  return /^\d{8,15}$/.test(digits) ? digits : null
}

function countryCode(place: Record<string, unknown>): string | null {
  if (Array.isArray(place.address_components)) {
    for (const value of place.address_components) {
      const component = record(value)
      if (
        Array.isArray(component?.types) &&
        component.types.includes('country') &&
        typeof component.short_name === 'string'
      )
        return component.short_name.toUpperCase()
    }
  }
  return null
}

function plainAttribution(value: string): string {
  return value
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500)
}

function attributionLinks(value: string): { text: string; href: string }[] {
  const lower = value.toLowerCase()
  const links: { text: string; href: string }[] = []
  let position = 0
  while (position < value.length) {
    const start = lower.indexOf('<a', position)
    if (start < 0) break
    position = start + 2
    if (!/\s/.test(value[position] ?? '')) continue
    const end = lower.indexOf('>', position)
    if (end < 0) break
    const close = lower.indexOf('</a>', end + 1)
    if (close < 0) break
    const attributes = value.slice(position, end)
    const href = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attributes)
    if (href) links.push({ href: href[1] ?? href[2], text: value.slice(end + 1, close) })
    position = close + 4
  }
  return links
}

/** Project attribution HTML into text and safe links; callers must render it as text. */
function attributions(root: Record<string, unknown>, place: Record<string, unknown>) {
  const values = [root.html_attributions, place.html_attributions]
    .flatMap(value => (Array.isArray(value) ? value : []))
    .filter((value): value is string => typeof value === 'string' && value.length <= 4000)
  const result: MovingReviewAttribution[] = []
  const seen = new Set<string>()
  for (const value of values.slice(0, 20)) {
    const links = attributionLinks(value)
    const rows = [
      {
        displayName: plainAttribution(value),
        uri: links.length === 1 ? safeLink(links[0].href.replace(/&amp;/gi, '&')) : null,
      },
      ...(links.length > 1
        ? links.map(link => ({
            displayName: plainAttribution(link.text),
            uri: safeLink(link.href.replace(/&amp;/gi, '&')),
          }))
        : []),
    ]
    for (const row of rows) {
      const key = `${row.displayName}\n${row.uri}`
      if (!row.displayName || seen.has(key)) continue
      seen.add(key)
      result.push(row)
    }
  }
  return result
}

/** Parse only aggregate data from the configured legacy Places proxy. */
export function parseMovingGoogleReview(
  json: unknown,
  profile: MovingReviewProfile,
  checkedAt: string
): MovingReviewsResult {
  const empty = (status: MovingReviewsStatus) =>
    movingReviewsResult(profile.providerId, status, profile, checkedAt)
  if (!isLiveMovingReviewProfile(profile)) return empty('unknown_profile')
  const root = record(json)
  const place = record(root?.result)
  if (root?.status !== 'OK' || !place) return empty('unavailable')
  if (place.place_id !== profile.placeId || !matchesName(place.name, profile.expectedNames))
    return empty('identity_mismatch')

  const country = countryCode(place)
  if (
    country &&
    profile.expectedCountryCode &&
    country !== profile.expectedCountryCode.toUpperCase()
  )
    return empty('identity_mismatch')
  const actualPhones = [place.international_phone_number, place.formatted_phone_number]
    .map(normalizedPhone)
    .filter((phone): phone is string => !!phone)
  const expectedPhones = (profile.expectedPhoneNumbers ?? [])
    .map(normalizedPhone)
    .filter((phone): phone is string => !!phone)
  if (
    actualPhones.length &&
    expectedPhones.length &&
    !actualPhones.some(phone => expectedPhones.includes(phone))
  )
    return empty('identity_mismatch')

  const count = place.user_ratings_total
  const rating = place.rating
  if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0)
    return empty('unavailable')
  const hasRating = rating !== null && rating !== undefined
  const validRating =
    typeof rating === 'number' && Number.isFinite(rating) && rating >= 1 && rating <= 5
  if ((hasRating && !validRating) || (count > 0 && !validRating)) return empty('unavailable')
  return {
    ...empty(count === 0 ? 'no_reviews' : 'ok'),
    rating: count === 0 ? null : (rating as number),
    count,
    attributions: attributions(root, place),
  }
}
