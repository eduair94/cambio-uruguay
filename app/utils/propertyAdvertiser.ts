/** Public source evidence only. Never expose the raw publisher or property identity objects. */
export interface Agency {
  version: 1
  key: string
  name: string
  profileUrl: string
  listingsUrl?: string
  observedAt: string
}
export interface PublicContact {
  version: 1
  name: string
  channels: Array<{
    kind: 'phone' | 'whatsapp' | 'email' | 'website' | 'profile'
    value: string
    sourceUrl: string
    observedAt: string
  }>
}
export interface OwnerDirect {
  declared: true
  evidence: 'source_field' | 'advert_text'
  sourceUrl: string
  observedAt: string
}
export interface AdvertiserMetadata {
  agency?: Agency | null
  publicContact?: PublicContact | null
  ownerDirect?: OwnerDirect | null
}
/** Paths rather than whole Mixed objects keep future private fields out of Mongo projections. */
export function publicAdvertiserProjection(prefix = '', contact = false): Record<string, 1> {
  const base = prefix ? `${prefix}.` : ''
  const paths = [
    'agency.version',
    'agency.key',
    'agency.name',
    'agency.profileUrl',
    'agency.listingsUrl',
    'agency.observedAt',
    'ownerDirect.declared',
    'ownerDirect.evidence',
    'ownerDirect.sourceUrl',
    'ownerDirect.observedAt',
    ...(contact
      ? [
          'publicContact.version',
          'publicContact.name',
          'publicContact.channels.kind',
          'publicContact.channels.value',
          'publicContact.channels.sourceUrl',
          'publicContact.channels.observedAt',
        ]
      : []),
  ]
  return Object.fromEntries(paths.map(path => [`${base}${path}`, 1]))
}

const sourceHosts: Record<string, readonly string[]> = {
  infocasas: ['infocasas.com.uy', 'www.infocasas.com.uy'],
  casasweb: ['casasweb.com', 'www.casasweb.com'],
  elpais: ['inmuebles.elpais.com.uy'],
  mercadolibre: ['mercadolibre.com.uy', 'www.mercadolibre.com.uy', 'inmueble.mercadolibre.com.uy'],
  facebook: ['facebook.com', 'www.facebook.com'],
}
export const ADVERTISER_EVIDENCE_MAX_AGE_DAYS = 30
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
const plain = (value: unknown, max = 160) =>
  typeof value === 'string'
    ? value
        .replace(/<[^>]*>/g, '')
        .replace(/\p{Cc}/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max)
    : ''

export function agencyKey(value: unknown): string {
  if (typeof value !== 'string') return ''
  return /^(?:infocasas|casasweb|elpais|mercadolibre):[\w-]{1,100}$/.test(value) ? value : ''
}
export function agencyPath(key: string): string {
  return `/inmobiliarias-uruguay/${encodeURIComponent(agencyKey(key))}`
}
export function publicBusinessUrl(value: unknown, source?: string): string | null {
  if (typeof value !== 'string' || value.length > 2048 || /[\r\n]/.test(value)) return null
  try {
    const url = new URL(value)
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port ||
      !url.hostname.includes('.') ||
      /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(url.hostname) ||
      /^[\d.]+$/.test(url.hostname) ||
      url.hostname.includes(':') ||
      (source && !sourceHosts[source]?.includes(url.hostname))
    )
      return null
    if (
      /\/(?:login|signin|dashboard|account|cuenta|auth|oauth)(?:\/|$)/i.test(url.pathname) ||
      [...url.searchParams.keys()].some(key =>
        /token|auth|secret|session|password|signature|code/i.test(key)
      )
    )
      return null
    url.hash = ''
    return url.href
  } catch {
    return null
  }
}
const observed = (value: unknown, now: number): string | null => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return null
  const time = Date.parse(value)
  return Number.isFinite(time) &&
    time >= now - ADVERTISER_EVIDENCE_MAX_AGE_DAYS * 86_400_000 &&
    time <= now + 300_000
    ? value
    : null
}
export function safeAgency(value: unknown, source?: string, now = Date.now()): Agency | null {
  const row = record(value),
    key = agencyKey(row.key)
  const keySource = key.split(':')[0]
  const profileUrl = publicBusinessUrl(row.profileUrl, keySource)
  const observedAt = observed(row.observedAt, now),
    name = plain(row.name)
  if (
    row.version !== 1 ||
    !key ||
    !name ||
    !profileUrl ||
    !observedAt ||
    (source && keySource !== source)
  )
    return null
  if (
    keySource === 'infocasas' &&
    !new RegExp(`^/inmobiliarias/(?:perfil/)?${key.split(':')[1]}(?:-|/|$)`).test(
      new URL(profileUrl).pathname
    )
  )
    return null
  const listingsUrl = publicBusinessUrl(row.listingsUrl, keySource)
  if (
    listingsUrl &&
    keySource === 'infocasas' &&
    !new RegExp(`^/inmobiliarias/${key.split(':')[1]}(?:-|/|$).*?/propiedades/?$`).test(
      new URL(listingsUrl).pathname
    )
  )
    return null
  return { version: 1, key, name, profileUrl, ...(listingsUrl ? { listingsUrl } : {}), observedAt }
}
export function safeOwnerDirect(
  value: unknown,
  source?: string,
  now = Date.now()
): OwnerDirect | null {
  const row = record(value),
    sourceUrl = publicBusinessUrl(row.sourceUrl, source)
  const observedAt = observed(row.observedAt, now)
  if (
    row.declared !== true ||
    !['source_field', 'advert_text'].includes(String(row.evidence)) ||
    !sourceUrl ||
    !observedAt
  )
    return null
  return {
    declared: true,
    evidence: row.evidence as OwnerDirect['evidence'],
    sourceUrl,
    observedAt,
  }
}
export function safePublicContact(
  value: unknown,
  source?: string,
  now = Date.now()
): PublicContact | null {
  const row = record(value)
  if (row.version !== 1 || !Array.isArray(row.channels)) return null
  const channels: PublicContact['channels'] = []
  const seen = new Set<string>()
  for (const input of row.channels.slice(0, 20)) {
    const channel = record(input),
      sourceUrl = publicBusinessUrl(channel.sourceUrl, source)
    const observedAt = observed(channel.observedAt, now),
      kind = channel.kind
    if (!sourceUrl || !observedAt || typeof channel.value !== 'string') continue
    const raw = channel.value.trim()
    let clean: string | null = null
    if ((kind === 'phone' || kind === 'whatsapp') && /^\+?[\d ()-]{6,28}$/.test(raw)) {
      let digits = raw.replace(/\D/g, '')
      if (digits.startsWith('00598')) digits = digits.slice(2)
      if (/^09\d{7}$/.test(digits)) digits = digits.slice(1)
      if (/^[249]\d{7}$/.test(digits)) digits = `598${digits}`
      if (/^598[249]\d{7}$/.test(digits)) clean = `+${digits}`
    } else if (
      kind === 'email' &&
      raw.length <= 254 &&
      /^[\w.!#$%&'*+/=?^`{|}~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+$/i.test(raw)
    )
      clean = raw
    else if (kind === 'website' || kind === 'profile')
      clean = publicBusinessUrl(raw, kind === 'profile' ? source : undefined)
    if (kind === 'email' && /[?&#%]/.test(raw)) clean = null
    if (!clean || seen.has(`${kind}:${clean}`)) continue
    seen.add(`${kind}:${clean}`)
    channels.push({
      kind: kind as PublicContact['channels'][number]['kind'],
      value: clean,
      sourceUrl,
      observedAt,
    })
    if (channels.length === 5) break
  }
  return channels.length ? { version: 1, name: plain(row.name), channels } : null
}
export function publicAdvertiserMetadata(value: unknown, now = Date.now()): AdvertiserMetadata {
  const row = record(value),
    source = typeof row.source === 'string' ? row.source : undefined
  const agency = row.sellerType === 'particular' ? null : safeAgency(row.agency, source, now)
  const sourceUrls = new Set(
    [publicBusinessUrl(row.url, source), agency?.profileUrl, agency?.listingsUrl].filter(Boolean)
  )
  const contact = safePublicContact(row.publicContact, source, now)
  const channels =
    contact?.channels.filter(
      channel =>
        sourceUrls.has(channel.sourceUrl) &&
        (channel.kind !== 'profile' || sourceUrls.has(channel.value))
    ) || []
  const owner = safeOwnerDirect(row.ownerDirect, source, now)
  return {
    ...('agency' in row ? { agency } : {}),
    ...('publicContact' in row
      ? { publicContact: contact && channels.length ? { ...contact, channels } : null }
      : {}),
    ...('ownerDirect' in row
      ? {
          ownerDirect:
            row.agency ||
            row.sellerType === 'inmobiliaria' ||
            owner?.sourceUrl !== publicBusinessUrl(row.url, source)
              ? null
              : owner,
        }
      : {}),
  }
}

/** Same own-offer rules in search, budgets and saved-search notifications. */
export function advertiserMatches(
  value: unknown,
  query: { agency?: string; owner?: boolean },
  now = Date.now()
): boolean {
  if (!query.agency && !query.owner) return true
  const safe = publicAdvertiserMetadata(value, now)
  return (
    (!query.agency || safe.agency?.key === query.agency) &&
    (!query.owner || safe.ownerDirect?.declared === true)
  )
}

/** Mongo predicate: dates are converted defensively, and no missing evidence means direct owner. */
export function advertiserExpression(
  query: { agency?: string; owner?: boolean },
  prefix = '$',
  now = Date.now()
): Record<string, unknown> {
  const field = (path: string) => `${prefix}${path}`
  const string = (path: string) => ({
    $cond: [{ $eq: [{ $type: field(path) }, 'string'] }, field(path), ''],
  })
  const fresh = (path: string) => {
    const date = { $convert: { input: field(path), to: 'date', onError: null, onNull: null } }
    return {
      $and: [
        { $gte: [date, new Date(now - ADVERTISER_EVIDENCE_MAX_AGE_DAYS * 86400000)] },
        { $lte: [date, new Date(now + 300000)] },
      ],
    }
  }
  const publicSource = (path: string) => ({
    $or: Object.entries(sourceHosts).map(([source, hosts]) => ({
      $and: [
        { $eq: [field('source'), source] },
        {
          $regexMatch: {
            input: string(path),
            regex: `^https?://(?:${hosts.map(host => host.replace(/\./g, '\\.')).join('|')})(?:/|$)`,
          },
        },
      ],
    })),
  })
  const conditions: unknown[] = []
  if (query.agency) {
    const source = query.agency.split(':')[0]
    conditions.push(
      { $eq: [field('agency.key'), query.agency] },
      { $eq: [field('agency.version'), 1] },
      { $ne: [{ $ifNull: [field('sellerType'), ''] }, 'particular'] },
      { $eq: [field('source'), source] },
      { $ne: [string('agency.name'), ''] },
      fresh('agency.observedAt'),
      publicSource('agency.profileUrl')
    )
    if (source === 'infocasas')
      conditions.push({
        $regexMatch: {
          input: string('agency.profileUrl'),
          regex: `^https?://(?:www\\.)?infocasas\\.com\\.uy/inmobiliarias/(?:perfil/)?${query.agency.split(':')[1]}(?:-|/|$)`,
        },
      })
  }
  if (query.owner)
    conditions.push(
      { $eq: [field('ownerDirect.declared'), true] },
      { $in: [field('ownerDirect.evidence'), ['source_field', 'advert_text']] },
      { $eq: [{ $ifNull: [field('agency'), null] }, null] },
      { $ne: [{ $ifNull: [field('sellerType'), ''] }, 'inmobiliaria'] },
      fresh('ownerDirect.observedAt'),
      publicSource('ownerDirect.sourceUrl')
    )
  if (query.owner) conditions.push({ $eq: [string('ownerDirect.sourceUrl'), string('url')] })
  return { $and: conditions.length ? conditions : [true] }
}
