// Site-wide feedback: the suggestion box, the bug report and the "¿Te sirvió esta página?" question
// at the end of every page. PURE (no Vue/Nuxt imports) so the server route, the components and
// vitest share the same closed lists and the same rules.
//
// WHY: until 2026-11 the only way to tell the site something was a mailto on /contacto and, on
// the rental directory, its own micro-survey (components/rentals/feedback/MicroSurvey.vue). That
// survey went 20 days with zero answers while it only showed "Enviar", and got answers the moment
// the first tap itself became the answer. Same lesson here: the question is one tap, the text is
// optional and comes after, and a person who already answered is not asked again for a while.
//
// Reviews: the ask for a public Trustpilot review goes to EVERYONE who answers, not only to the
// people who said "Sí". Asking only the happy ones is review gating, which Trustpilot's and
// Google's guidelines forbid; the "Sí" path just leads with it and the "No" path offers it after
// the private message. See `reviewAskFor`.

import { adDensityForPath, normalizeAdPath } from './ads'

export const FEEDBACK_KINDS = ['suggestion', 'bug', 'praise', 'helpful'] as const
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]

/** The kinds a person picks in the form (`helpful` is the one-tap question). */
export const FORM_KINDS = ['suggestion', 'bug', 'praise'] as const
export type FormKind = (typeof FORM_KINDS)[number]

export const HELPFUL_ANSWERS = ['yes', 'no'] as const
export type HelpfulAnswer = (typeof HELPFUL_ANSWERS)[number]

export const MESSAGE_MIN = 3
export const MESSAGE_MAX = 2000
const EMAIL_MAX = 160
const PATH_MAX = 300

/** Days a page is not asked again after its question was answered. */
export const ANSWERED_PATH_DAYS = 120
/** Days no page asks after any answer: one answer is enough for a while, wherever it was given. */
export const ANSWERED_ANY_DAYS = 7
/** Days the review ask stays away after the person opened Trustpilot (or said "ya dejé"). */
export const REVIEW_DONE_DAYS = 365
/** Days the review ask stays away after "Ahora no". */
export const REVIEW_DISMISS_DAYS = 45

/**
 * Pages that already ask their own question, or where asking is wrong: the rental directory has
 * its own micro-survey, /contacto IS the form, and the private dashboards are for one person.
 */
const OWN_QUESTION = [
  '/alquileres-uruguay',
  '/alquileres',
  '/opinion-alquileres',
  '/opiniones-alquileres',
  '/contactos-comerciales',
  '/contacto',
  '/estadisticas-de-busqueda',
  '/estadisticas-por-pagina',
  '/mi-cuenta',
  '/widget',
] as const

/** True when the end-of-page question may render on `path`. */
export function helpfulAllowedForPath(path: string): boolean {
  const clean = normalizeAdPath(path)
  if (OWN_QUESTION.some(entry => clean === entry || clean.startsWith(`${entry}/`))) return false
  // 'none' is a conversion page or plumbing (see utils/ads.ts and utils/capture.ts).
  return adDensityForPath(path) !== 'none'
}

/** What the browser remembers (localStorage, never sent anywhere). */
export interface FeedbackMemory {
  /** path → epoch ms of the answer on that page. */
  answered: Record<string, number>
  /** Epoch ms of the last answer anywhere. */
  lastAnswerAt: number
  /** Epoch ms the person opened the review link. */
  reviewOpenedAt: number
  /** Epoch ms the person dismissed the review ask. */
  reviewDismissedAt: number
}

export const EMPTY_MEMORY: FeedbackMemory = {
  answered: {},
  lastAnswerAt: 0,
  reviewOpenedAt: 0,
  reviewDismissedAt: 0,
}

const DAY = 86_400_000

/** Reads whatever was stored, tolerating garbage from older versions or other tabs. */
export function parseMemory(raw: string | null | undefined): FeedbackMemory {
  if (!raw) return { ...EMPTY_MEMORY, answered: {} }
  try {
    const value = JSON.parse(raw) as Partial<FeedbackMemory>
    const answered: Record<string, number> = {}
    if (value && typeof value.answered === 'object' && value.answered) {
      for (const [key, at] of Object.entries(value.answered))
        if (typeof at === 'number' && Number.isFinite(at)) answered[key] = at
    }
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
    return {
      answered,
      lastAnswerAt: num(value?.lastAnswerAt),
      reviewOpenedAt: num(value?.reviewOpenedAt),
      reviewDismissedAt: num(value?.reviewDismissedAt),
    }
  } catch {
    return { ...EMPTY_MEMORY, answered: {} }
  }
}

/** Keeps the stored object small: answers older than the path window are forgotten. */
export function pruneMemory(memory: FeedbackMemory, now: number): FeedbackMemory {
  const answered: Record<string, number> = {}
  for (const [key, at] of Object.entries(memory.answered))
    if (now - at < ANSWERED_PATH_DAYS * DAY) answered[key] = at
  return { ...memory, answered }
}

/** True when the end-of-page question should show on `path` for this browser. */
export function shouldAskHelpful(memory: FeedbackMemory, path: string, now: number): boolean {
  const clean = normalizeAdPath(path)
  const at = memory.answered[clean]
  if (at && now - at < ANSWERED_PATH_DAYS * DAY) return false
  if (memory.lastAnswerAt && now - memory.lastAnswerAt < ANSWERED_ANY_DAYS * DAY) return false
  return true
}

/** Records an answer on `path`. */
export function rememberAnswer(memory: FeedbackMemory, path: string, now: number): FeedbackMemory {
  const clean = normalizeAdPath(path)
  return pruneMemory(
    { ...memory, answered: { ...memory.answered, [clean]: now }, lastAnswerAt: now },
    now
  )
}

/**
 * How the review ask shows after an answer. Never `none` because of WHAT was answered (that would
 * be gating), only because this browser already reviewed or said no recently.
 *  - `lead`: shown first, as the main next step (after "Sí" or a compliment).
 *  - `quiet`: a single line after the private message was sent (after "No", a suggestion or a bug).
 */
export function reviewAskFor(
  memory: FeedbackMemory,
  trigger: HelpfulAnswer | FormKind,
  now: number
): 'lead' | 'quiet' | 'none' {
  if (memory.reviewOpenedAt && now - memory.reviewOpenedAt < REVIEW_DONE_DAYS * DAY) return 'none'
  if (memory.reviewDismissedAt && now - memory.reviewDismissedAt < REVIEW_DISMISS_DAYS * DAY)
    return 'none'
  return trigger === 'yes' || trigger === 'praise' ? 'lead' : 'quiet'
}

export interface FeedbackInput {
  kind?: unknown
  helpful?: unknown
  message?: unknown
  email?: unknown
  path?: unknown
  locale?: unknown
  includeTech?: unknown
  tech?: unknown
  clientId?: unknown
}

export interface FeedbackTech {
  viewport: string | null
  screen: string | null
  theme: string | null
  language: string | null
  online: boolean | null
  referrer: string | null
}

export interface FeedbackRecord {
  kind: FeedbackKind
  helpful: HelpfulAnswer | null
  message: string
  email: string | null
  path: string
  locale: string
  /** Only for bugs, and only when the person left the box checked. */
  tech: FeedbackTech | null
  clientId: string | null
}

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i
// Control characters except tab/newline: they have no business in a message and break mail clients.
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u0008\v\f\u000E-\u001F\u007F]/g

function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.replace(CONTROL_RE, '').replace(/\r\n?/g, '\n').trim().slice(0, max)
}

function shortField(value: unknown, max: number, re?: RegExp): string | null {
  const text = cleanText(value, max)
  if (!text) return null
  if (re && !re.test(text)) return null
  return text
}

function sanitizeTech(value: unknown): FeedbackTech | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const dims = /^\d{2,5}x\d{2,5}(?:@\d(?:\.\d{1,2})?)?$/
  return {
    viewport: shortField(raw.viewport, 20, dims),
    screen: shortField(raw.screen, 20, dims),
    theme: shortField(raw.theme, 10, /^(?:light|dark)$/),
    language: shortField(raw.language, 20, /^[a-z]{2,3}(?:-[a-z\d]{2,8})*$/i),
    online: typeof raw.online === 'boolean' ? raw.online : null,
    referrer: shortField(raw.referrer, 200, /^https?:\/\//),
  }
}

/** Validates an answer against the closed lists. Returns the record to store or why it was refused. */
export function sanitizeFeedback(
  input: FeedbackInput
): { record: FeedbackRecord } | { error: string } {
  const kind = FEEDBACK_KINDS.find(k => k === input.kind)
  if (!kind) return { error: 'kind' }

  const helpful =
    kind === 'helpful' ? (HELPFUL_ANSWERS.find(a => a === input.helpful) ?? null) : null
  if (kind === 'helpful' && !helpful) return { error: 'helpful' }

  const message = cleanText(input.message, MESSAGE_MAX)
  if (kind !== 'helpful' && message.length < MESSAGE_MIN) return { error: 'message' }

  let email: string | null = null
  if (typeof input.email === 'string' && input.email.trim()) {
    const value = input.email.trim().slice(0, EMAIL_MAX)
    if (!EMAIL_RE.test(value)) return { error: 'email' }
    email = value.toLowerCase()
  }

  const rawPath = cleanText(input.path, PATH_MAX)
  const path = rawPath.startsWith('/') && !rawPath.startsWith('//') ? rawPath : '/'
  const locale = shortField(input.locale, 10, /^[a-z]{2}(?:-[a-z]{2})?$/i) ?? 'es'
  const tech = kind === 'bug' && input.includeTech === true ? sanitizeTech(input.tech) : null
  const clientId =
    typeof input.clientId === 'string' && /^[a-z\d]{12,40}$/i.test(input.clientId)
      ? input.clientId
      : null

  return { record: { kind, helpful, message, email, path, locale, tech, clientId } }
}

/** True when the answer carries something a person has to read (so it is worth an email). */
export function needsAttention(record: Pick<FeedbackRecord, 'message'>): boolean {
  return record.message.length >= MESSAGE_MIN
}

const KIND_LABEL: Record<FeedbackKind, string> = {
  suggestion: 'Sugerencia',
  bug: 'Error reportado',
  praise: 'Comentario positivo',
  helpful: 'Respuesta a "¿Te sirvió?"',
}

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/** The email the owner receives. Plain data, escaped: the message is untrusted input. */
export function feedbackEmail(
  record: FeedbackRecord,
  opts: { siteUrl: string; userAgent?: string | null; at?: Date }
): { subject: string; text: string; html: string } {
  const label = KIND_LABEL[record.kind]
  const helpful = record.helpful ? ` (${record.helpful === 'yes' ? 'Sí' : 'No'})` : ''
  const url = `${opts.siteUrl.replace(/\/$/, '')}${record.path}`
  const firstLine = record.message.split('\n')[0]?.slice(0, 60) ?? ''
  const subject = `[Cambio Uruguay] ${label}${helpful}: ${firstLine || record.path}`.replace(
    /[\r\n]+/g,
    ' '
  )
  const rows: [string, string][] = [
    ['Tipo', `${label}${helpful}`],
    ['Página', url],
    ['Idioma', record.locale],
    ['Correo para responder', record.email ?? '— (no dejó correo)'],
    ['Fecha', (opts.at ?? new Date()).toISOString()],
  ]
  if (record.tech) {
    const t = record.tech
    rows.push(
      ['Ventana', t.viewport ?? '—'],
      ['Pantalla', t.screen ?? '—'],
      ['Tema', t.theme ?? '—'],
      ['Idioma del navegador', t.language ?? '—'],
      ['En línea', t.online === null ? '—' : t.online ? 'sí' : 'no'],
      ['Venía de', t.referrer ?? '—'],
      ['Navegador', (opts.userAgent ?? '—').slice(0, 300)]
    )
  }
  const text = `${record.message}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n`
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#111">
<p style="white-space:pre-wrap;margin:0 0 20px">${escapeHtml(record.message)}</p>
<table style="border-collapse:collapse;font-size:13px;color:#333">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:2px 12px 2px 0;color:#666;vertical-align:top">${escapeHtml(k)}</td><td style="padding:2px 0">${escapeHtml(v)}</td></tr>`
    )
    .join('')}</table>
</div>`
  return { subject, text, html }
}
