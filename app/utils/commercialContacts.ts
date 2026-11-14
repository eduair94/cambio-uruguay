/** Curated general business lines. Personal sellers and inferred contact details are excluded. */
export interface CommercialContact {
  id: string
  name: string
  sector: 'autos' | 'viviendas'
  phone: string
  phoneScope: 'business'
  sourceUrl: string
  observedAt: string
  platforms: CommercialPlatform[]
}

export interface CommercialPlatform {
  kind: 'mercadolibre' | 'facebook'
  url: string
  evidenceUrl: string
  evidenceKind: 'official_link' | 'indexed_listing'
  observedAt: string
}

export const COMMERCIAL_CONTACT_MAX_AGE_DAYS = 30
const DAY = 86_400_000

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function publicHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048 || /[\r\n\t]/.test(value)) return null
  try {
    const url = new URL(value)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !url.hostname.includes('.') ||
      /^\d+(?:\.\d+){3}$/.test(url.hostname) ||
      url.hostname.startsWith('[') ||
      /(?:^|\.)(?:localhost|local|internal|test|invalid|example|onion)\.?$/i.test(url.hostname) ||
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

function businessPhone(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 60 || !/^[+\d\s().–—-]+$/.test(value)) return null
  let phone = value.replace(/[\s().–—-]/g, '')
  if (phone.startsWith('00598')) phone = `+${phone.slice(2)}`
  if (/^598[249]\d{7}$/.test(phone)) phone = `+${phone}`
  if (/^09\d{7}$/.test(phone)) phone = phone.slice(1)
  if (/^[249]\d{7}$/.test(phone)) phone = `+598${phone}`
  return /^\+598[249]\d{7}$/.test(phone) ? phone : null
}

function recentDate(value: unknown, now: number): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return null
  const at = Date.parse(value)
  return Number.isFinite(at) && at <= now && at >= now - COMMERCIAL_CONTACT_MAX_AGE_DAYS * DAY
    ? new Date(at).toISOString()
    : null
}

function safePlatform(value: unknown, now: number): CommercialPlatform | null {
  const row = record(value)
  if (
    !row ||
    (row.kind !== 'mercadolibre' && row.kind !== 'facebook') ||
    (row.evidenceKind !== 'official_link' && row.evidenceKind !== 'indexed_listing')
  )
    return null
  const url = publicHttpsUrl(row.url)
  const evidenceUrl = publicHttpsUrl(row.evidenceUrl)
  const observedAt = recentDate(row.observedAt, now)
  if (!url || !evidenceUrl || !observedAt) return null
  const hostname = new URL(url).hostname
  const platformHost =
    row.kind === 'mercadolibre'
      ? /(?:^|\.)mercadolibre\.com\.uy$/i
      : /(?:^|\.)(?:facebook\.com|fb\.com)$/i
  if (!platformHost.test(hostname)) return null
  if (
    row.kind === 'facebook' &&
    !/^\/marketplace\/(?:item|profile)\/\d{5,24}\/?$/.test(new URL(url).pathname)
  )
    return null
  return { kind: row.kind, url, evidenceUrl, evidenceKind: row.evidenceKind, observedAt }
}

/**
 * Reconstruct the public fields after admin authentication. The server catalogue's explicit
 * phoneScope attests manual business verification; syntax alone cannot prove who owns a number.
 */
export function safeCommercialContacts(input: unknown, now = Date.now()): CommercialContact[] {
  if (!Array.isArray(input) || !Number.isFinite(now)) return []
  const contacts: CommercialContact[] = []
  const seen = new Set<string>()
  for (const value of input.slice(0, 500)) {
    const row = record(value)
    if (
      !row ||
      row.phoneScope !== 'business' ||
      (row.sector !== 'autos' && row.sector !== 'viviendas') ||
      typeof row.id !== 'string' ||
      !/^[a-z0-9][a-z0-9-]{0,79}$/.test(row.id) ||
      seen.has(row.id) ||
      typeof row.name !== 'string' ||
      !row.name.trim() ||
      row.name.length > 160 ||
      /[<>\r\n]/.test(row.name) ||
      !Array.isArray(row.platforms)
    )
      continue
    const phone = businessPhone(row.phone)
    const sourceUrl = publicHttpsUrl(row.sourceUrl)
    const observedAt = recentDate(row.observedAt, now)
    if (!phone || !sourceUrl || !observedAt) continue
    const platforms: CommercialPlatform[] = []
    for (const item of row.platforms.slice(0, 12)) {
      const platform = safePlatform(item, now)
      if (platform && !platforms.some(other => other.url === platform.url)) platforms.push(platform)
    }
    contacts.push({
      id: row.id,
      name: row.name.trim(),
      sector: row.sector,
      phone,
      phoneScope: 'business',
      sourceUrl,
      observedAt,
      platforms,
    })
    seen.add(row.id)
  }
  return contacts
}
