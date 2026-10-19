/**
 * What people who use the rental directory tell us: the micro-survey under the results and the
 * property page, the suggestion box, and the survey reached from rental-alert emails and the
 * newsletter. One vocabulary for the client and the server: every answer is checked against these
 * closed lists, so the stored rows can be counted without cleaning them first.
 *
 * Spanish only, like the survey page: the audience searches in Uruguay.
 */

export interface FeedbackOption {
  value: string
  label: string
}

/** Where an answer was given. */
export const FEEDBACK_KINDS = ['micro', 'box', 'survey'] as const
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]

/** The page it was given from (a survey reached from an email names the email instead). */
export const FEEDBACK_SURFACES = [
  'directorio',
  'ficha',
  'mapa',
  'alerta',
  'newsletter',
  'otra',
] as const
export type FeedbackSurface = (typeof FEEDBACK_SURFACES)[number]

export const FOUND_OPTIONS: FeedbackOption[] = [
  { value: 'si', label: 'Sí' },
  { value: 'en-parte', label: 'En parte' },
  { value: 'no', label: 'No' },
]

/** What fell short, for the micro-survey and the suggestion box. */
export const MISSING_REASONS: FeedbackOption[] = [
  { value: 'pocas-opciones', label: 'Pocas opciones en mi zona' },
  { value: 'avisos-viejos', label: 'Avisos que ya no están disponibles' },
  { value: 'presupuesto', label: 'Nada dentro de mi presupuesto' },
  { value: 'falta-info', label: 'Falta información (gastos, garantía, fotos)' },
  { value: 'filtros', label: 'No encontré el filtro que necesitaba' },
  { value: 'datos-mal', label: 'Algún dato está mal (precio, barrio, fotos)' },
  { value: 'dificil', label: 'Me costó usar la página' },
  { value: 'otro', label: 'Otra cosa' },
]

/** The reasons a property page can fall short: a listing's own shortcomings, not the market's. */
export const FICHA_REASONS: FeedbackOption[] = MISSING_REASONS.filter(reason =>
  ['avisos-viejos', 'falta-info', 'datos-mal', 'dificil', 'otro'].includes(reason.value)
)

/** The reasons a search can fall short. */
export const SEARCH_REASONS: FeedbackOption[] = MISSING_REASONS.filter(
  reason => reason.value !== 'datos-mal'
)

/** What someone came to do, for the suggestion box. */
export const GOALS: FeedbackOption[] = [
  { value: 'buscar', label: 'Buscar dónde vivir' },
  { value: 'comparar', label: 'Comparar precios' },
  { value: 'zona', label: 'Conocer una zona' },
  { value: 'publicar', label: 'Publicar o tasar mi propiedad' },
  { value: 'otro', label: 'Otra cosa' },
]

export type SurveyQuestion =
  | { id: string; kind: 'single'; title: string; hint?: string; options: FeedbackOption[] }
  | {
      id: string
      kind: 'multi'
      title: string
      hint?: string
      options: FeedbackOption[]
      max?: number
    }
  | {
      id: string
      kind: 'scale'
      title: string
      hint?: string
      min: number
      max: number
      minLabel: string
      maxLabel: string
    }

/** Bumped when a question changes, so answers to different wordings are never pooled. */
export const SURVEY_VERSION = '2026-10'

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'uso',
    kind: 'single',
    title: '¿Para qué usás el buscador de alquileres?',
    options: [
      { value: 'vivir', label: 'Buscar dónde vivir' },
      { value: 'comparar', label: 'Comparar precios de mi zona' },
      { value: 'mercado', label: 'Ver el mercado antes de mudarme' },
      { value: 'propietario', label: 'Soy dueño o inmobiliaria' },
      { value: 'otro', label: 'Otra cosa' },
    ],
  },
  {
    id: 'estado',
    kind: 'single',
    title: '¿Cómo va tu búsqueda?',
    options: [
      { value: 'alquile-aca', label: 'Ya alquilé con un aviso que vi acá' },
      { value: 'alquile-otro', label: 'Ya alquilé por otro lado' },
      { value: 'buscando', label: 'Todavía estoy buscando' },
      { value: 'pausa', label: 'La dejé en pausa' },
      { value: 'no-busco', label: 'No estoy buscando' },
    ],
  },
  {
    id: 'recomienda',
    kind: 'scale',
    title: '¿Qué tan probable es que recomiendes el buscador a alguien que busca alquiler?',
    min: 0,
    max: 10,
    minLabel: 'Nada probable',
    maxLabel: 'Muy probable',
  },
  {
    id: 'importa',
    kind: 'multi',
    title: '¿Qué es lo que más te importa al elegir?',
    hint: 'Hasta tres.',
    max: 3,
    options: [
      { value: 'total-mes', label: 'Lo que pago por mes, con gastos comunes' },
      { value: 'barrio', label: 'El barrio y lo que tengo cerca' },
      { value: 'fotos', label: 'Fotos y descripción completas' },
      { value: 'vigente', label: 'Que el aviso siga disponible' },
      { value: 'garantia', label: 'Las garantías que aceptan' },
      { value: 'mascotas', label: 'Que acepten mascotas' },
      { value: 'dueno', label: 'Tratar directo con el dueño' },
      { value: 'contacto', label: 'Poder contactar rápido' },
    ],
  },
  {
    id: 'mejorar',
    kind: 'multi',
    title: '¿Qué mejorarías?',
    hint: 'Marcá todo lo que aplique.',
    options: [
      { value: 'mas-avisos', label: 'Más avisos en mi zona' },
      { value: 'avisos-viejos', label: 'Sacar los avisos que ya no están' },
      { value: 'fotos', label: 'Más fotos' },
      { value: 'filtros', label: 'Más filtros' },
      { value: 'mapa', label: 'El mapa' },
      { value: 'alertas', label: 'Las alertas (cuándo y cuántas llegan)' },
      { value: 'precios', label: 'Que el precio total sea más claro' },
      { value: 'velocidad', label: 'Que cargue más rápido' },
      { value: 'otro', label: 'Otra cosa' },
    ],
  },
]

export const FEEDBACK_COMMENT_MAX = 1000

export interface RentalFeedbackInput {
  kind?: unknown
  surface?: unknown
  path?: unknown
  filters?: unknown
  propertyKey?: unknown
  found?: unknown
  reasons?: unknown
  goal?: unknown
  answers?: unknown
  comment?: unknown
  email?: unknown
  alertId?: unknown
  clientId?: unknown
}

export interface RentalFeedbackRecord {
  kind: FeedbackKind
  surface: FeedbackSurface
  path: string
  /** The search's filters as its chips read them; never the reference address. */
  filters: string[]
  /** The alert's zone, filled by the server for an answer that came from an alert email. */
  zone: string | null
  propertyKey: string | null
  found: string | null
  reasons: string[]
  goal: string | null
  answers: Record<string, string | string[] | number>
  surveyVersion: string | null
  comment: string
  email: string | null
  alertId: string | null
  clientId: string | null
}

const text = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''

const oneOf = (
  value: unknown,
  options: readonly FeedbackOption[] | readonly string[]
): string | null => {
  const values = options.map(option => (typeof option === 'string' ? option : option.value))
  return typeof value === 'string' && values.includes(value) ? value : null
}

const someOf = (
  value: unknown,
  options: readonly FeedbackOption[],
  max = options.length
): string[] => {
  if (!Array.isArray(value)) return []
  const allowed = new Set(options.map(option => option.value))
  return [
    ...new Set(
      value.filter((item): item is string => typeof item === 'string' && allowed.has(item))
    ),
  ].slice(0, max)
}

/** The active filters, as the page's chips label them: what was being looked for, never who looked. */
export function feedbackFilters(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map(item => text(item, 80)).filter(Boolean))].slice(0, 15)
}

export function isFeedbackEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]{2,}$/.test(value)
}

/**
 * An answer as it may be stored, or the reason it may not. Nothing outside the closed lists is kept,
 * and an answer that says nothing at all (no choice, no comment) is refused.
 */
export function sanitizeRentalFeedback(
  input: RentalFeedbackInput
): { record: RentalFeedbackRecord } | { error: string } {
  const kind = oneOf(input.kind, FEEDBACK_KINDS) as FeedbackKind | null
  if (!kind) return { error: 'kind' }
  const surface = (oneOf(input.surface, FEEDBACK_SURFACES) as FeedbackSurface | null) ?? 'otra'
  const path = text(input.path, 200)
  const propertyKey = text(input.propertyKey, 160) || null
  const found = oneOf(input.found, FOUND_OPTIONS)
  const reasons = someOf(input.reasons, MISSING_REASONS)
  const goal = oneOf(input.goal, GOALS)
  const comment = text(input.comment, FEEDBACK_COMMENT_MAX)
  const rawEmail = text(input.email, 254).toLowerCase()
  if (rawEmail && !isFeedbackEmail(rawEmail)) return { error: 'email' }
  const alertId =
    typeof input.alertId === 'string' && /^[a-f\d]{24}$/i.test(input.alertId)
      ? input.alertId.toLowerCase()
      : null
  const clientId =
    typeof input.clientId === 'string' && /^[a-z\d]{12,40}$/i.test(input.clientId)
      ? input.clientId
      : null

  const answers: Record<string, string | string[] | number> = {}
  if (
    kind === 'survey' &&
    input.answers &&
    typeof input.answers === 'object' &&
    !Array.isArray(input.answers)
  ) {
    const raw = input.answers as Record<string, unknown>
    for (const question of SURVEY_QUESTIONS) {
      const value = raw[question.id]
      if (question.kind === 'single') {
        const picked = oneOf(value, question.options)
        if (picked) answers[question.id] = picked
      } else if (question.kind === 'multi') {
        const picked = someOf(value, question.options, question.max)
        if (picked.length) answers[question.id] = picked
      } else if (
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= question.min &&
        value <= question.max
      ) {
        answers[question.id] = value
      }
    }
  }

  const saysSomething =
    !!found || reasons.length > 0 || !!goal || Object.keys(answers).length > 0 || comment.length > 0
  if (!saysSomething) return { error: 'empty' }
  return {
    record: {
      kind,
      surface,
      path: path.startsWith('/') ? path : '',
      filters: feedbackFilters(input.filters),
      zone: null,
      propertyKey,
      found,
      reasons,
      goal,
      answers,
      surveyVersion: kind === 'survey' ? SURVEY_VERSION : null,
      comment,
      email: rawEmail || null,
      alertId,
      clientId,
    },
  }
}

/** Net Promoter Score of the 0–10 answers: % promoters (9–10) minus % detractors (0–6). */
export function netPromoterScore(scores: readonly number[]): number | null {
  const valid = scores.filter(score => Number.isInteger(score) && score >= 0 && score <= 10)
  if (!valid.length) return null
  const promoters = valid.filter(score => score >= 9).length
  const detractors = valid.filter(score => score <= 6).length
  return Math.round(((promoters - detractors) / valid.length) * 100)
}

/** The survey's address, as an alert email or the newsletter links to it. */
export function rentalSurveyUrl(
  origin: string,
  from: 'alerta' | 'newsletter',
  alertId?: string
): string {
  const params = new URLSearchParams({ origen: from })
  if (alertId && /^[a-f\d]{24}$/i.test(alertId)) params.set('a', alertId)
  return `${origin.replace(/\/+$/, '')}/opinion-alquileres?${params}`
}

export const optionLabel = (options: readonly FeedbackOption[], value: string): string =>
  options.find(option => option.value === value)?.label ?? value
