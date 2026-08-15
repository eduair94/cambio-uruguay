// List archived newsletter issues (newest first) for `/newsletter/archivo`.
// Also nudges today's issue into existence in the background, so a first visit
// of the day works even when the scheduled task has not fired yet (same
// belt-and-braces as `api/blog/index.get.ts`).
import { countIssues, ensureIssue, listIssues } from '../../../utils/newsletterArchive'

export default defineEventHandler(async event => {
  const q = getQuery(event)
  const limit = Math.max(1, Math.min(Number(q.limit) || 30, 200))
  const offset = Math.max(0, Number(q.offset) || 0)

  const [issues, total] = await Promise.all([listIssues(limit, offset), countIssues()])

  // Fire-and-forget: never blocks or fails the response.
  ensureIssue().catch(() => {})

  return { issues, total, limit, offset }
})
