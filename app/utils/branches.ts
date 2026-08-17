// Pure helpers behind the per-branch pages (`/sucursal/:slug`).
//
// The BCU branch feed (`GET /locations`, proxied by `server/api/locations.get.ts`)
// carries one row per physical counter with a real street address, phone and
// opening-hours string. That is genuinely unique, non-thin content for ~520
// locations, so each one gets its own page instead of being a row in a table.
//
// PURE module (no Vue/Nuxt runtime, relative imports only) so vitest exercises
// it in plain Node and the Nitro sitemap route imports it without pulling the
// app runtime in.
//
// Two data-quality facts drive most of the code here, both learned the hard way:
//
//  1. `locality` is unreliable — the feed returns `locality: "Montevideo"` for
//     branches whose `dept` is RIVERA or ROCHA. We therefore never print the
//     locality; the department (which is consistent with the address) is the
//     geographic label.
//  2. A subset of rows carry the WRONG coordinate: several branches in Río
//     Negro, Rocha and elsewhere are stamped with a Rivera lat/lng. We do not
//     trust a coordinate that sits far from its own department's median, and an
//     untrusted coordinate is dropped from the map AND from the LocalBusiness
//     JSON-LD, because publishing a wrong `geo` is worse than publishing none.

import { slugifyText } from './longform'

/** One physical branch as served by `/api/locations`. */
export interface Branch {
  origin: string
  id: string
  name: string
  dept: string
  locality: string
  address: string
  phone: string
  hours: string
  lat: number
  lng: number
  mapUrl: string
  source?: string
}

/** A branch enriched with its stable page slug and display labels. */
export interface BranchPage extends Branch {
  /** URL slug, unique across the whole feed. */
  slug: string
  /** Display name of the casa/bank (from `localData`), e.g. `'Cambio Gales'`. */
  casaName: string
  /** Department in title case, e.g. `'Río Negro'`. */
  deptLabel: string
  /** Cleaned, single-spaced street address. */
  addressLabel: string
  /** Cleaned phone, or `''` when the feed has none. */
  phoneLabel: string
  /** Cleaned opening-hours text, or `''`. */
  hoursLabel: string
  /** True when the coordinate is plausible for this department (see module doc). */
  hasTrustedCoordinate: boolean
}

/** Uruguay's bounding box, generously padded. Anything outside is not a UY branch. */
const UY_BOUNDS = { minLat: -35.2, maxLat: -29.9, minLng: -58.7, maxLng: -52.9 }

/** Kilometres a branch may sit from its department's median before we distrust it. */
const DEPT_RADIUS_KM = 170

/** Collapse runs of whitespace and trim. The feed is full of padded strings. */
export function tidy(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Department label in Uruguayan title case.
 *
 * The feed spells departments in caps and inconsistently accented (`PAYSANDU`
 * and `PAYSANDÚ` are both present, as are `RIO NEGRO`/`RÍO NEGRO`), so this both
 * normalises the casing and restores the canonical accent.
 */
const DEPT_LABELS: Readonly<Record<string, string>> = Object.freeze({
  artigas: 'Artigas',
  canelones: 'Canelones',
  'cerro largo': 'Cerro Largo',
  colonia: 'Colonia',
  durazno: 'Durazno',
  flores: 'Flores',
  florida: 'Florida',
  lavalleja: 'Lavalleja',
  maldonado: 'Maldonado',
  montevideo: 'Montevideo',
  paysandu: 'Paysandú',
  'rio negro': 'Río Negro',
  rivera: 'Rivera',
  rocha: 'Rocha',
  salto: 'Salto',
  'san jose': 'San José',
  soriano: 'Soriano',
  tacuarembo: 'Tacuarembó',
  'treinta y tres': 'Treinta y Tres',
})

/** Canonical, accent-free department key used for grouping (`'RÍO NEGRO'` -> `'rio negro'`). */
export function deptKey(dept: string): string {
  return slugifyText(dept).replace(/-/g, ' ')
}

/** Human label for a department as spelled by the feed. */
export function deptLabel(dept: string): string {
  const key = deptKey(dept)
  return DEPT_LABELS[key] ?? tidy(dept)
}

/** URL slug for a department, matching what `/dolar/:departamento` expects. */
export function deptSlug(dept: string): string {
  return slugifyText(dept)
}

/** Great-circle-ish distance in kilometres (equirectangular; fine at this scale). */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat = (((aLat + bLat) / 2) * Math.PI) / 180
  const x = dLng * Math.cos(lat)
  return Math.sqrt(dLat * dLat + x * x) * R
}

/** Median of a numeric list; `NaN` for an empty list. */
function median(values: number[]): number {
  if (!values.length) return NaN
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2
}

/**
 * Median coordinate per department, over branches inside the Uruguay bounds.
 *
 * The median (not the mean) is the point of this: a handful of rows stamped with
 * the wrong department's coordinate cannot drag the centre, so they end up far
 * from it and are the ones flagged as untrusted.
 */
export function departmentCentres(
  branches: readonly Branch[]
): Map<string, { lat: number; lng: number }> {
  const groups = new Map<string, { lats: number[]; lngs: number[] }>()
  for (const branch of branches) {
    if (!insideUruguay(branch.lat, branch.lng)) continue
    const key = deptKey(branch.dept)
    if (!key) continue
    const group = groups.get(key) ?? { lats: [], lngs: [] }
    group.lats.push(branch.lat)
    group.lngs.push(branch.lng)
    groups.set(key, group)
  }
  const centres = new Map<string, { lat: number; lng: number }>()
  for (const [key, group] of groups) {
    const lat = median(group.lats)
    const lng = median(group.lngs)
    if (Number.isFinite(lat) && Number.isFinite(lng)) centres.set(key, { lat, lng })
  }
  return centres
}

/** True when a coordinate falls inside Uruguay's padded bounding box. */
export function insideUruguay(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat !== 0 &&
    lng !== 0 &&
    lat >= UY_BOUNDS.minLat &&
    lat <= UY_BOUNDS.maxLat &&
    lng >= UY_BOUNDS.minLng &&
    lng <= UY_BOUNDS.maxLng
  )
}

/**
 * Whether a branch's coordinate can be shown on a map and published as `geo`.
 *
 * Inside Uruguay AND within {@link DEPT_RADIUS_KM} of its department's median.
 * A department we have no centre for (a single branch) only has to clear the
 * bounding-box test.
 */
export function hasTrustedCoordinate(
  branch: Branch,
  centres: Map<string, { lat: number; lng: number }>
): boolean {
  if (!insideUruguay(branch.lat, branch.lng)) return false
  const centre = centres.get(deptKey(branch.dept))
  if (!centre) return true
  return distanceKm(branch.lat, branch.lng, centre.lat, centre.lng) <= DEPT_RADIUS_KM
}

/**
 * Trim an address down to the part that identifies the place.
 *
 * The feed appends the town to some addresses (`'Treinta Y Tres Orientales 1146 - Rivera'`)
 * and pads others; we keep the street and number, which is what a reader
 * searches for and what makes the slug unique.
 */
export function addressForSlug(address: string): string {
  const clean = tidy(address)
    .replace(/\s*[-–—][^-–—]*$/, match => (/\d/.test(match) ? match : ''))
    .replace(/\bs\/?n\b/gi, '')
  return tidy(clean)
}

/**
 * Slug for one branch: casa name + street address, accent-free and hyphenated.
 *
 * Deliberately keyword-shaped (`cambio-gales-21-de-setiembre-2748`) rather than
 * an opaque id, because the searches this family targets are literally
 * "cambio gales 21 de setiembre".
 */
export function branchSlug(casaName: string, address: string, dept: string): string {
  // An empty address would leave the casa name alone as the slug, so every
  // address-less branch of the same chain would collide into `brou`, `brou-2`,
  // `brou-3` — URLs that say nothing. Fall back to the department instead.
  const street = slugifyText(addressForSlug(address))
  const base = street ? slugifyText(`${casaName} ${addressForSlug(address)}`) : ''
  const trimmed = base.split('-').filter(Boolean).slice(0, 12).join('-')
  return trimmed || slugifyText(`${casaName} ${dept}`)
}

/**
 * Build the page-ready branch list: slug, labels and coordinate trust.
 *
 * Slug collisions (two counters of the same casa on the same street, or an
 * address the feed left blank) are resolved deterministically by appending
 * `-2`, `-3`… in `id` order, so a given branch keeps its URL across refreshes as
 * long as the feed keeps its id.
 */
export function buildBranchPages(
  branches: readonly Branch[],
  casaNames: Readonly<Record<string, string>> = {}
): BranchPage[] {
  const centres = departmentCentres(branches)
  const ordered = [...branches].sort((a, b) =>
    `${a.origin}/${a.id}`.localeCompare(`${b.origin}/${b.id}`, 'es')
  )
  const used = new Map<string, number>()
  const pages: BranchPage[] = []

  for (const branch of ordered) {
    const casaName = casaNames[branch.origin] ?? humaniseOrigin(branch.origin)
    const base = branchSlug(casaName, branch.address, branch.dept)
    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)
    const slug = seen === 0 ? base : `${base}-${seen + 1}`

    pages.push({
      ...branch,
      slug,
      casaName,
      deptLabel: deptLabel(branch.dept),
      addressLabel: tidy(branch.address),
      phoneLabel: tidy(branch.phone),
      hoursLabel: tidy(branch.hours).replace(/^sin informar$/i, ''),
      hasTrustedCoordinate: hasTrustedCoordinate(branch, centres),
    })
  }

  return pages
}

/**
 * Brands the upstream feed spells without their accent.
 *
 * `localData` returns "Itau" and "Cambio Fenix"; the institutions are Itaú and
 * Cambio Fénix. Both spellings are searched (Search Console records "cambio
 * fenix" 6.984 times and "cambio fénix" 676), and Google matches either way —
 * but a result whose title misspells the brand it is answering for is a trust
 * signal thrown away, and this name is the H1 and the `<title>` of every page in
 * three families.
 *
 * Deliberately tiny: overriding the source of truth is only justified where the
 * source is demonstrably wrong about a proper noun.
 */
const CASA_NAME_OVERRIDES: Readonly<Record<string, string>> = Object.freeze({
  itau: 'Itaú',
  cambio_fenix: 'Cambio Fénix',
})

/** The casa's display name: the feed's, with the known misspellings corrected. */
export function canonicalCasaName(origin: string, feedName?: string | null): string {
  const override = CASA_NAME_OVERRIDES[origin]
  if (override) return override
  const name = tidy(feedName)
  return name || humaniseOrigin(origin)
}

/** `'cambio_gales'` -> `'Cambio Gales'`, the fallback when `localData` has no name. */
export function humaniseOrigin(origin: string): string {
  return tidy(origin)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

// ---------------------------------------------------------------------------
// Opening hours
// ---------------------------------------------------------------------------

/** Schema.org day names, Monday-first. */
export const SCHEMA_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

/** Spanish day labels, Monday-first, aligned with {@link SCHEMA_DAYS}. */
export const DAY_LABELS_ES = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const

/** One parsed opening window: the weekday indexes (0 = Monday) and `HH:MM` bounds. */
export interface OpeningWindow {
  days: number[]
  opens: string
  closes: string
}

const DAY_INDEX: Readonly<Record<string, number>> = Object.freeze({
  lunes: 0,
  lun: 0,
  martes: 1,
  mar: 1,
  miercoles: 2,
  mie: 2,
  jueves: 3,
  jue: 3,
  viernes: 4,
  vie: 4,
  sabado: 5,
  sabados: 5,
  sab: 5,
  domingo: 6,
  domingos: 6,
  dom: 6,
})

/**
 * Normalise a free-text hours string: accent-free, lowercase, single-spaced.
 *
 * Unlike {@link slugifyText} this KEEPS `:`, `.` and `-`, because they are the
 * separators the source uses for times: folding them away turned `09:00-19:00`
 * into `09 00 19 00`, which no range regex can read.
 */
function normaliseHours(text: string): string {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9:.\-/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Inclusive Monday-first day range, wrapping Sunday->Monday spans. */
function dayRange(from: number, to: number): number[] {
  const out: number[] = []
  let cursor = from
  for (let guard = 0; guard < 7; guard++) {
    out.push(cursor)
    if (cursor === to) break
    cursor = (cursor + 1) % 7
  }
  return out
}

/**
 * `'8'`/`'8:30'`/`'8.30'` -> `'08:30'`, or `null` when out of range.
 *
 * `24` is accepted as a CLOSING hour only (several 24-hour airport and shopping
 * counters are published as "de 8 a 24 hs") and normalised to `23:59`, which is
 * what schema.org consumers expect for a day that ends at midnight.
 */
function toClock(hour: string, minute: string | undefined): string | null {
  const h = Number(hour)
  const m = minute === undefined || minute === '' ? 0 : Number(minute)
  if (!Number.isInteger(h) || h < 0 || h > 24) return null
  if (!Number.isInteger(m) || m < 0 || m > 59) return null
  if (h === 24) return m === 0 ? '23:59' : null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Parse a Uruguayan opening-hours string into structured windows.
 *
 * Handles the shapes the BCU feed actually uses: `"Lunes a Viernes de 13 a 18 hs."`,
 * `"L a V 9 a 19. Sáb 9 a 13"`, `"Lunes, Miércoles y Viernes de 13 a 18hs"`,
 * `"Lunes a Viernes de 8 a 19 hs. Sábados 8 a 12.30 hs y 15 a 19 hs"`.
 *
 * Returns `[]` when it cannot parse confidently — the caller then shows the raw
 * string and emits NO `openingHoursSpecification`, because wrong structured data
 * about when a business is open is worse than none at all.
 */
export function parseOpeningHours(raw: string): OpeningWindow[] {
  const text = normaliseHours(raw)
  if (!text || text === 'sin informar' || !/\d/.test(text)) return []

  // Day-spec matcher, longest alternatives first so "lunes a viernes" wins over
  // "lunes". `\.?` after every abbreviation because the feed writes both
  // "Lun. a Vie." and "L a V"; the single-letter forms are only reachable inside
  // an explicit range, so a stray "l" in prose cannot be mistaken for Monday.
  const D = '\\.?\\s*'
  const daySpec = new RegExp(
    [
      `(?:de\\s+)?(?:`,
      `(todos\\s+los\\s+dias)`,
      `|(lunes|lun|l)${D}(?:a|al)\\s*(viernes|vie|v)`,
      `|(lunes|lun|l)${D}(?:a|al)\\s*(sabados?|sab|s)`,
      `|(lunes|lun|l)${D}(?:a|al)\\s*(domingos?|dom|d)`,
      `|(domingos?|dom)${D}(?:a|al)\\s*(jueves|jue)`,
      `|(viernes|vie)${D}y\\s*(sabados?|sab)`,
      // `[\s,]*` rather than `\s*,?\s*`: two adjacent optional-space quantifiers
      // are ambiguous and make the matcher backtrack super-linearly on a long
      // run of spaces. The text is already collapsed to single spaces, so one
      // character class covers "lunes, miercoles" and "lunes miercoles" alike.
      `|(lunes)[\\s,]*(miercoles)\\s*y\\s*(viernes)`,
      `|(lunes|martes|miercoles|jueves|viernes|sabados?|domingos?|sab|dom)`,
      `)`,
    ].join(''),
    'g'
  )

  interface Segment {
    days: number[]
    from: number
    to: number
  }
  const segments: Segment[] = []
  let match: RegExpExecArray | null
  while ((match = daySpec.exec(text)) !== null) {
    const groups = match.slice(1)
    let days: number[] | null = null
    if (groups[0]) days = dayRange(0, 6)
    else if (groups[1] && groups[2]) days = dayRange(0, 4)
    else if (groups[3] && groups[4]) days = dayRange(0, 5)
    else if (groups[5] && groups[6]) days = dayRange(0, 6)
    else if (groups[7] && groups[8]) days = dayRange(6, 3)
    else if (groups[9] && groups[10]) days = [4, 5]
    else if (groups[11] && groups[12] && groups[13]) days = [0, 2, 4]
    else if (groups[14]) {
      const index = DAY_INDEX[groups[14]]
      days = index === undefined ? null : [index]
    }
    if (!days) continue
    segments.push({ days, from: match.index, to: match.index + match[0].length })
  }

  if (!segments.length) return []

  // Time ranges belonging to a day spec are the ones between it and the next.
  const timeRange =
    /(\d{1,2})(?:[:.](\d{2}))?\s*(?:(?:h|hs|hrs|horas)\s*)?(?:a|hasta|-)\s*(\d{1,2})(?:[:.](\d{2}))?/g
  const windows: OpeningWindow[] = []

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i] as Segment
    const end = i + 1 < segments.length ? (segments[i + 1] as Segment).from : text.length
    const slice = text.slice(segment.to, end)
    timeRange.lastIndex = 0
    let time: RegExpExecArray | null
    while ((time = timeRange.exec(slice)) !== null) {
      const opens = toClock(time[1] as string, time[2])
      const closes = toClock(time[3] as string, time[4])
      if (!opens || !closes || opens === closes) continue
      windows.push({ days: segment.days, opens, closes })
    }
  }

  // "Lunes a Viernes de 13 a 18 hs./ Lunes a Viernes de 13 a 18 hs." is a real
  // value in the feed — emit the window once.
  const seen = new Set<string>()
  return windows.filter(window => {
    const key = `${window.days.join(',')}|${window.opens}|${window.closes}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Schema.org `openingHoursSpecification` entries, or `[]` when unparseable. */
export function openingHoursSpecification(raw: string): Array<{
  '@type': 'OpeningHoursSpecification'
  dayOfWeek: string[]
  opens: string
  closes: string
}> {
  return parseOpeningHours(raw).map(window => ({
    '@type': 'OpeningHoursSpecification' as const,
    dayOfWeek: window.days.map(day => SCHEMA_DAYS[day] as string),
    opens: window.opens,
    closes: window.closes,
  }))
}

/** A human-readable weekly table: one row per weekday, `'Cerrado'` when absent. */
export function weeklyHoursTable(raw: string): Array<{ day: string; hours: string }> {
  const windows = parseOpeningHours(raw)
  if (!windows.length) return []
  return DAY_LABELS_ES.map((label, index) => {
    const ranges = windows
      .filter(window => window.days.includes(index))
      .map(window => `${window.opens} a ${window.closes}`)
    return { day: label, hours: ranges.length ? ranges.join(' y ') : 'Cerrado' }
  })
}

/**
 * The hours string worth showing, or `''`.
 *
 * A dozen rows carry an operator's NAME (`'ABITAB SA'`, `'Marcelo Hermida'`) or a
 * placeholder (`'-'`, `'Sin informar'`) in the hours field. Anything with no
 * digit at all cannot be a schedule, so we suppress it instead of printing
 * "Horarios: Marcelo Hermida".
 */
export function displayableHours(raw: string): string {
  const clean = tidy(raw)
  if (!clean || /^[-–—.]+$/.test(clean)) return ''
  if (/^sin informar$/i.test(clean)) return ''
  if (!/\d/.test(clean)) return ''
  return clean
}

/** A phone in `tel:` form: digits only, with Uruguay's +598 country code. */
export function telHref(phone: string): string | null {
  const digits = tidy(phone).replace(/\D/g, '')
  if (digits.length < 7) return null
  return `tel:+598${digits.replace(/^0+/, '')}`
}

// ---------------------------------------------------------------------------
// Page copy derived from the row itself
// ---------------------------------------------------------------------------

/**
 * H1 / document title for a branch.
 *
 * Shaped like the query it answers ("cambio gales 21 de setiembre"): casa first,
 * then the street, then the department for disambiguation. Every branch of a
 * chain therefore gets a different title, which is the whole point — 113 BROU
 * pages titled "BROU sucursales" would be a doorway set.
 */
export function branchTitle(branch: BranchPage): string {
  const where = branch.addressLabel || branch.deptLabel
  return `${branch.casaName} — ${where}, ${branch.deptLabel}`
}

/** Meta description built from the row's own address, hours and phone. */
export function branchDescription(branch: BranchPage): string {
  const parts = [`${branch.casaName} en ${branch.addressLabel || branch.deptLabel}`]
  parts.push(`${branch.deptLabel}`)
  const hours = displayableHours(branch.hoursLabel)
  if (hours) parts.push(`Horario: ${hours.replace(/\.$/, '')}`)
  if (branch.phoneLabel) parts.push(`Tel. ${branch.phoneLabel}`)
  parts.push('Cotización del dólar de hoy y sucursales cercanas')
  return `${parts.join('. ')}.`.replace(/\.{2,}/g, '.').slice(0, 300)
}

// ---------------------------------------------------------------------------
// Relationships between branches
// ---------------------------------------------------------------------------

/** Other branches of the same casa, nearest first when coordinates allow. */
export function siblingBranches(
  branch: BranchPage,
  all: readonly BranchPage[],
  limit = 8
): BranchPage[] {
  const others = all.filter(other => other.origin === branch.origin && other.slug !== branch.slug)
  return sortByProximity(branch, others).slice(0, limit)
}

/** Branches of OTHER casas in the same department — the "compare nearby" block. */
export function nearbyCompetitors(
  branch: BranchPage,
  all: readonly BranchPage[],
  limit = 8
): BranchPage[] {
  const key = deptKey(branch.dept)
  const others = all.filter(other => other.origin !== branch.origin && deptKey(other.dept) === key)
  // One per casa: eight branches of the same bank is not a comparison.
  const seen = new Set<string>()
  const unique: BranchPage[] = []
  for (const other of sortByProximity(branch, others)) {
    if (seen.has(other.origin)) continue
    seen.add(other.origin)
    unique.push(other)
    if (unique.length >= limit) break
  }
  return unique
}

/** Sort by distance when both coordinates are trusted; alphabetically otherwise. */
function sortByProximity(from: BranchPage, list: readonly BranchPage[]): BranchPage[] {
  return [...list].sort((a, b) => {
    if (from.hasTrustedCoordinate && a.hasTrustedCoordinate && b.hasTrustedCoordinate) {
      return (
        distanceKm(from.lat, from.lng, a.lat, a.lng) - distanceKm(from.lat, from.lng, b.lat, b.lng)
      )
    }
    return a.addressLabel.localeCompare(b.addressLabel, 'es')
  })
}

/** Group branch pages by department key, each sorted by casa then address. */
export function groupByDepartment(pages: readonly BranchPage[]): Array<{
  key: string
  label: string
  slug: string
  branches: BranchPage[]
}> {
  const groups = new Map<string, BranchPage[]>()
  for (const page of pages) {
    const key = deptKey(page.dept)
    if (!key) continue
    const list = groups.get(key) ?? []
    list.push(page)
    groups.set(key, list)
  }
  return [...groups.entries()]
    .map(([key, branches]) => ({
      key,
      label: deptLabel(branches[0]?.dept ?? key),
      slug: deptSlug(branches[0]?.dept ?? key),
      branches: branches.sort(
        (a, b) =>
          a.casaName.localeCompare(b.casaName, 'es') ||
          a.addressLabel.localeCompare(b.addressLabel, 'es')
      ),
    }))
    .sort((a, b) => b.branches.length - a.branches.length || a.label.localeCompare(b.label, 'es'))
}
