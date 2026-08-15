// Fetch one archived newsletter issue by date. A missing issue for TODAY is
// generated on demand (a direct visit to today's URL must work before the
// scheduled task has run); a missing issue for any past date is a 404 — we
// never backfill, because the digest is built from live quotes and a
// "yesterday" page built from today's market would be a fabricated record.
import { ensureIssue, getIssue, issueNeighbors } from '../../../utils/newsletterArchive'
import { isIssueDate, montevideoToday } from '../../../../utils/newsletterIssue'

export default defineEventHandler(async event => {
  const date = getRouterParam(event, 'fecha') || ''
  if (!isIssueDate(date)) {
    throw createError({ statusCode: 404, statusMessage: 'Edición no encontrada' })
  }

  let issue = await getIssue(date)
  if (!issue && date === montevideoToday()) issue = await ensureIssue(date)
  if (!issue) {
    throw createError({ statusCode: 404, statusMessage: 'Edición no encontrada' })
  }

  const { prev, next } = await issueNeighbors(date)
  return { ...issue, prev, next }
})
