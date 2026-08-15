// Server-only durable store for the daily newsletter's public archive.
//
// One issue per day, persisted to the `newsletter` Nitro storage mount (fs,
// `./.data/newsletter`). `.data` lives beside the build, not inside it, and
// `scripts/deploy.sh` only ever swaps `.output` — so the archive survives every
// deploy and accumulates, which is the whole point of it.
//
// There is deliberately NO index item. The blog's store keeps one
// (`server/utils/blog.ts`) and pays for it with a read-modify-write on every
// save; this app runs pm2 `cluster` with 2 instances (app/ecosystem.config.cjs),
// so both instances fire the same scheduled task in the same second and the
// later write silently drops the earlier one's entry. Here the storage keys ARE
// the index: `issues:<date>` is unique per day, so two concurrent writers of the
// same day write the same thing, and listing is a `getKeys()` away.
// TYPE-ONLY, and `buildDigestData` is imported lazily inside `ensureIssue`
// below. A value import here would pull the whole digest chain (rates client,
// AI client, RSS reader) into every module that only wants to LIST issues — the
// sitemap route reads storage keys and nothing else, and paying for that chain
// on its import made the sitemap handler slow enough to time its own test out.
import type { DigestData } from './newsletter'
import {
  isIssueDate,
  isPublishableIssue,
  montevideoToday,
  toIssueSummary,
  withDerivedCopy,
  type NewsletterIssue,
  type NewsletterIssueSummary,
} from '../../utils/newsletterIssue'

const STORAGE = 'newsletter'
const PREFIX = 'issues'

const keyFor = (date: string) => `${PREFIX}:${date}`

/**
 * Every archived date, newest first.
 *
 * Reads keys only — no issue bodies — so the sitemap can enumerate a year of
 * issues without loading a year of JSON.
 */
export async function listIssueDates(): Promise<string[]> {
  let keys: string[] = []
  try {
    // `useStorage` itself is inside the try: it is a Nitro auto-import, so it is
    // simply absent outside a Nitro runtime (unit tests, a stray script) and
    // throwing a ReferenceError out of a listing helper would take down the
    // whole sitemap rather than costing it one section.
    keys = await useStorage(STORAGE).getKeys(PREFIX)
  } catch {
    return []
  }
  const dates = keys
    // unstorage hands back the full key (`issues:2026-08-15`); some drivers
    // normalise the separator, so take the last segment either way.
    .map(k => k.split(':').pop() ?? '')
    .filter(isIssueDate)
  // Dedupe defensively — a driver that lists both `a:b` and `a/b` would repeat.
  return [...new Set(dates)].sort((a, b) => b.localeCompare(a))
}

/** Read one issue by date, or null when it was never archived. */
export async function getIssue(date: string): Promise<NewsletterIssue | null> {
  if (!isIssueDate(date)) return null
  try {
    return (await useStorage(STORAGE).getItem<NewsletterIssue>(keyFor(date))) || null
  } catch {
    return null
  }
}

/** Persist an issue under its date. Idempotent — same date overwrites in place. */
export async function saveIssue(issue: NewsletterIssue): Promise<void> {
  const store = useStorage(STORAGE)
  await store.setItem(keyFor(issue.date), issue)
}

/**
 * The archive hub's page of summaries, newest first.
 *
 * Reads only the slice asked for. Summaries are derived on read rather than
 * stored, so a change to the card copy applies to the whole back catalogue
 * instead of only to issues archived after the deploy.
 */
export async function listIssues(limit = 30, offset = 0): Promise<NewsletterIssueSummary[]> {
  const dates = await listIssueDates()
  const slice = dates.slice(offset, offset + limit)
  const issues = await Promise.all(slice.map(d => getIssue(d)))
  return issues.filter((i): i is NewsletterIssue => i !== null).map(toIssueSummary)
}

/** How many issues are archived in total (for the hub's pager). */
export async function countIssues(): Promise<number> {
  return (await listIssueDates()).length
}

/**
 * The archived dates immediately before and after `date`.
 *
 * Powers the issue page's prev/next links, which is what stops the archive from
 * becoming a flat pile of orphans reachable only through a paginated hub: with
 * neighbours, every issue is one hop from two others and a crawler can walk the
 * whole back catalogue from any entry point. Keys only — no issue bodies.
 */
export async function issueNeighbors(
  date: string
): Promise<{ prev: string | null; next: string | null }> {
  const dates = await listIssueDates() // newest first
  const i = dates.indexOf(date)
  if (i === -1) return { prev: null, next: null }
  return {
    // `dates` is newest-first, so the OLDER neighbour sits at the higher index.
    prev: dates[i + 1] ?? null,
    next: i > 0 ? (dates[i - 1] ?? null) : null,
  }
}

// Best-effort in-process lock so two concurrent requests for a missing issue
// don't both spend the upstream calls. Mirrors `server/utils/blog.ts`.
const inFlight = new Map<string, Promise<NewsletterIssue | null>>()

/**
 * Build today's issue from the live digest and archive it. Idempotent: an
 * already-archived date is returned untouched and costs nothing.
 *
 * Always builds the Spanish digest regardless of who is subscribed — the
 * archive is a public page on a Spanish-language site, not a per-subscriber
 * artefact, and it must exist on days when nobody is subscribed at all.
 *
 * Returns `null` when the day has no usable market data; see
 * {@link isPublishableIssue} for why a dateless-but-empty page is worse than no
 * page.
 */
export async function ensureIssue(
  date: string = montevideoToday()
): Promise<NewsletterIssue | null> {
  if (!isIssueDate(date)) return null

  const existing = await getIssue(date)
  if (existing) return existing

  const pending = inFlight.get(date)
  if (pending) return pending

  const work = (async (): Promise<NewsletterIssue | null> => {
    try {
      const { buildDigestData } = await import('./newsletter')
      const digest = await buildDigestData('es')
      const issue = withDerivedCopy({
        // Trust the digest's own date when it reports one (it comes from the
        // quote timestamps), but never let it retarget the key we were asked
        // for — that would archive today's build under yesterday's URL.
        date,
        currencies: digest.currencies,
        news: digest.news,
        ai: digest.ai,
        createdAt: new Date().toISOString(),
      })
      if (!isPublishableIssue(issue)) return null
      await saveIssue(issue)
      return issue
    } catch {
      return null
    } finally {
      inFlight.delete(date)
    }
  })()

  inFlight.set(date, work)
  return work
}

/**
 * Project an archived issue back into the shape the email/Telegram builders
 * take, so the Spanish send reuses the digest the archive just built instead of
 * paying for the rates + AI + feeds a second time in the same process.
 */
export function issueToDigest(issue: NewsletterIssue): DigestData {
  return {
    date: issue.date,
    currencies: issue.currencies,
    news: issue.news,
    ai: issue.ai,
  }
}
