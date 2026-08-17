/**
 * Reading the weekend out of the BCU feed's free-text opening hours.
 *
 * `hours` arrives as prose typed by each casa, in every shape a human types it:
 * `"Lunes a Viernes 8:30 a 17:30 y Sábado de 08:00 a 12:00"`,
 * `"Lun. a Vie. de 9:00 a 20:00 hs; Sáb. de 9:00 a 18:00 hs"`,
 * `"LUNES A VIERNES DE 9 A 18 HS Y SÁBADOS DE 9 A 13 HS"`, unaccented, in caps,
 * abbreviated, with the times before the days.
 *
 * The question this answers is the one people actually search — is it open on
 * Saturday? — and the trap is that the single most common way a casa says "yes
 * to Saturday" is also the most common way it says "no to Sunday", in the SAME
 * sentence: `"Lunes a Sábados de 09.00 a 19.00 hs - Domingos Cerrado"`. A naive
 * "does the string mention domingo" check calls 92 branches Sunday-open when
 * most of them are stating the opposite. So an explicit closure always wins over
 * a mention, and a day nobody spoke about stays `unknown` rather than being
 * guessed either way.
 */

/** What the casa said about a given day. `unknown` when it said nothing usable. */
export type DayStatus = 'open' | 'closed' | 'unknown'

export interface WeekendHours {
  saturday: DayStatus
  sunday: DayStatus
  /** The Saturday window(s) as written, normalised to `H:MM a H:MM`. Empty when absent. */
  saturdayWindow: string
  /** Same for Sunday. */
  sundayWindow: string
}

/** Day tokens in week order, each matching its own abbreviations. */
const DAY_PATTERNS = [/^lun/, /^mar/, /^mie/, /^jue/, /^vie/, /^sab/, /^dom/] as const

const SATURDAY = 5
const SUNDAY = 6

/**
 * Lowercase, drop accents, collapse whitespace.
 *
 * Accents go because the feed spells the same day both ways (`sábados` and
 * `sabados` are both present, sometimes in the same casa's branches).
 */
export function normalizeHours(text: string): string {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Index of the day a token names, or -1. */
function dayIndex(token: string): number {
  return DAY_PATTERNS.findIndex(pattern => pattern.test(token))
}

/**
 * A split shift is two windows (morning and afternoon). More than that and the
 * string is not one day's schedule any more — it is a seasonal or per-service
 * table crammed into one field, and joining its windows would present hours
 * that never applied together.
 */
const MAX_WINDOWS = 2

/**
 * Every `H:MM a H:MM` window in a fragment, normalised.
 *
 * The separator is `[:.]` because the feed uses both (`8:30` and `08.30`), and
 * the hour may stand alone (`de 8 a 19 hs`), which becomes `8:00`.
 */
function windowsIn(fragment: string): string[] {
  const found: string[] = []
  const pattern = /(\d{1,2})(?:[:.](\d{2}))?\s*(?:hs?\.?\s*)?a\s*(\d{1,2})(?:[:.](\d{2}))?/g
  let match = pattern.exec(fragment)
  while (match) {
    const from = `${Number(match[1])}:${match[2] ?? '00'}`
    const to = `${Number(match[3])}:${match[4] ?? '00'}`
    // Guard against reading a date or a phone number as a window.
    if (Number(match[1]) <= 24 && Number(match[3]) <= 24) found.push(`${from} a ${to}`)
    match = pattern.exec(fragment)
  }
  return found
}

/**
 * The windows as one displayable string, or empty when there are too many.
 *
 * Deliberately separate from finding them: a fragment holding four spans still
 * PROVES the day is open, it just cannot be summarised into one honest line. If
 * the two decisions shared a return value, capping the display would also drop
 * the branch off the page — which is the opposite of what the reader needs.
 */
function formatWindows(found: readonly string[]): string {
  return found.length > MAX_WINDOWS ? '' : found.join(' y ')
}

/**
 * Classify Saturday and Sunday out of one casa's hours string.
 *
 * Three passes, cheapest signal first and strongest signal last, so that a
 * sentence carrying both an inclusive range and a closure resolves to the
 * closure:
 *
 *  1. `todos los dias` / `lunes a domingo` style ranges open the days they span.
 *  2. A day named on its own alongside a time window is open.
 *  3. `domingos cerrado` (in either order) closes it, overriding the above.
 */
export function parseWeekendHours(hours: string): WeekendHours {
  // Several banks append a SECOND schedule for their teller desks — "Lunes a
  // viernes de 10 a 20 h. y Sábados de 12 a 16 h. Horario de cajas: de L a V de
  // 11 a 19 h." Everything from that phrase on describes a different counter, so
  // reading it as part of the branch's hours hangs a Monday-to-Friday teller
  // window off Saturday.
  const text = normalizeHours(hours).split('horario de cajas')[0]?.trim() ?? ''
  const status: DayStatus[] = Array.from({ length: 7 }, () => 'unknown')
  const windows = ['', '', '', '', '', '', '']

  if (!text || text.includes('sin informar')) {
    return { saturday: 'unknown', sunday: 'unknown', saturdayWindow: '', sundayWindow: '' }
  }

  // 1. Ranges. "todos los dias" is the unbounded form of the same claim.
  if (/todos los dias/.test(text)) {
    status[SATURDAY] = 'open'
    status[SUNDAY] = 'open'
    const span = formatWindows(windowsIn(text))
    windows[SATURDAY] = span
    windows[SUNDAY] = span
  }

  const range =
    /\b(lun|mar|mie|jue|vie|sab|dom)[a-z]*\.?\s+a\s+(lun|mar|mie|jue|vie|sab|dom)[a-z]*/g
  let found = range.exec(text)
  while (found) {
    const from = dayIndex(found[1])
    const to = dayIndex(found[2])
    if (from !== -1 && to !== -1) {
      // The window belongs to whatever follows the range, up to the next clause
      // — cut at the following day token too, or `"Lunes a Sábado de 8 a 21 y
      // Dom de 9 a 21"` reads Sunday's window as a second Saturday window. When
      // the casa wrote the times first ("de 9 a 17 hs de Lunes a Viernes")
      // nothing follows and the day is open with no window recorded here.
      const tail = text.slice(found.index + found[0].length)
      const clause = tail.split(/[;,]|\s-\s|\b(?:lun|mar|mie|jue|vie|sab|dom)[a-z]*/)[0] ?? ''
      const span = formatWindows(windowsIn(clause))
      // `domingo a jueves` wraps around the end of the week rather than being
      // the empty range it looks like.
      const length = from <= to ? to - from : 7 - from + to
      for (let step = 0; step <= length; step++) {
        const day = (from + step) % 7
        status[day] = 'open'
        if (!windows[day]) windows[day] = span
      }
    }
    found = range.exec(text)
  }

  // 2a. The two weekend days sharing one window — `"Sábado y domingo de 8.30 a
  //     13.30"`. Handled before the per-day pass because there the first day's
  //     fragment ends at the second day's token, leaving it with no window and
  //     so, wrongly, unknown.
  const pair = /\b(?:sab|dom)[a-z]*\.?\s+(?:y|e)\s+(?:sab|dom)[a-z]*\.?([^;,]*)/.exec(text)
  if (pair) {
    const span = windowsIn(pair[1] ?? '')
    if (span.length) {
      status[SATURDAY] = 'open'
      status[SUNDAY] = 'open'
      const label = formatWindows(span)
      if (!windows[SATURDAY]) windows[SATURDAY] = label
      if (!windows[SUNDAY]) windows[SUNDAY] = label
    }
  }

  // 2. A weekend day named on its own. Anything up to the next day token or
  //    separator is its fragment — that is where its window lives.
  for (const day of [SATURDAY, SUNDAY] as const) {
    const token = day === SATURDAY ? /\bsab[a-z]*\.?/g : /\bdom[a-z]*\.?/g
    let mention = token.exec(text)
    while (mention) {
      const after = text.slice(mention.index + mention[0].length)
      // Stop at the next day token so a following clause's times are not stolen.
      const fragment = after.split(/\b(?:lun|mar|mie|jue|vie|sab|dom)[a-z]*/)[0] ?? ''
      const span = windowsIn(fragment)
      if (span.length) {
        if (status[day] !== 'closed') status[day] = 'open'
        if (!windows[day]) windows[day] = formatWindows(span)
      }
      mention = token.exec(text)
    }
  }

  // 3. Explicit closure wins, in either word order.
  for (const day of [SATURDAY, SUNDAY] as const) {
    const name = day === SATURDAY ? 'sab[a-z]*' : 'dom[a-z]*'
    const closedAfter = new RegExp(`\\b${name}\\.?(?:\\s+(?:y|e)\\s+[a-z']+)?\\s*[-:,.]?\\s*cerrad`)
    const closedBefore = new RegExp(
      `cerrad[oa]s?\\s+(?:los\\s+|el\\s+)?(?:[a-z']+\\s+y\\s+)?${name}`
    )
    if (closedAfter.test(text) || closedBefore.test(text)) {
      status[day] = 'closed'
      windows[day] = ''
    }
  }

  return {
    saturday: status[SATURDAY],
    sunday: status[SUNDAY],
    saturdayWindow: windows[SATURDAY],
    sundayWindow: windows[SUNDAY],
  }
}

/** Does this branch open on at least one weekend day? */
export function opensOnWeekend(hours: string): boolean {
  const parsed = parseWeekendHours(hours)
  return parsed.saturday === 'open' || parsed.sunday === 'open'
}
