// The answers from the rental directory, for the private /opiniones-alquileres page: totals,
// "¿encontraste?" split, the reasons people gave, the survey's answers and NPS, and the latest
// answers with their comments. Admin only (requireAdmin): comments and e-mails are private. The
// collection is small (one row per answer), so the counts are taken on request over the last 120 days.
import { connectDb } from '../../utils/db'
import { requireAdmin } from '../../utils/requireAdmin'
import { RentalFeedbackModel } from '../../models/RentalFeedback'
import { netPromoterScore, SURVEY_QUESTIONS } from '../../../utils/rentalFeedback'

type Counts = Record<string, number>

const tally = (values: Iterable<string | null | undefined>): Counts => {
  const out: Counts = {}
  for (const value of values) if (value) out[value] = (out[value] ?? 0) + 1
  return out
}

export default defineEventHandler(async event => {
  await requireAdmin(event)
  setResponseHeaders(event, { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' })
  await connectDb()
  const since = new Date(Date.now() - 120 * 86_400_000)
  const rows = await RentalFeedbackModel.find({ createdAt: { $gte: since } })
    .select('+email')
    .sort({ createdAt: -1 })
    .limit(2_000)
    .lean()

  const survey = rows.filter(row => row.kind === 'survey')
  const answers: Record<string, Counts> = {}
  for (const question of SURVEY_QUESTIONS) {
    if (question.kind === 'scale') continue
    answers[question.id] = tally(
      survey.flatMap(row => {
        const value = (row.answers as Record<string, unknown>)?.[question.id]
        return Array.isArray(value) ? (value as string[]) : typeof value === 'string' ? [value] : []
      })
    )
  }
  const scores = survey
    .map(row => (row.answers as Record<string, unknown>)?.recomienda)
    .filter((value): value is number => typeof value === 'number')

  return {
    since: since.toISOString(),
    total: rows.length,
    byKind: tally(rows.map(row => row.kind)),
    bySurface: tally(rows.map(row => row.surface)),
    found: tally(rows.map(row => row.found)),
    reasons: tally(rows.flatMap(row => row.reasons ?? [])),
    goals: tally(rows.map(row => row.goal)),
    zones: tally(rows.map(row => row.zone)),
    survey: {
      responses: survey.length,
      answers,
      nps: netPromoterScore(scores),
      scores: scores.length,
    },
    latest: rows.slice(0, 200).map(row => ({
      id: String(row._id),
      createdAt: row.createdAt,
      kind: row.kind,
      surface: row.surface,
      path: row.path,
      filters: row.filters ?? [],
      zone: row.zone,
      propertyKey: row.propertyKey,
      found: row.found,
      reasons: row.reasons ?? [],
      goal: row.goal,
      answers: row.answers ?? {},
      comment: row.comment,
      email: row.email ?? null,
    })),
  }
})
