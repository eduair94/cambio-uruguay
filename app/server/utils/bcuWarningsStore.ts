// Weekly refresh of the BCU's advertencias list, stored in MongoDB.
//
// The page reads only what is stored, so a BCU outage never blanks it — and, more importantly,
// we keep OUR OWN record: over nine months of archived snapshots the BCU never removed an entry,
// so if one ever disappears (a retraction, a company clearing its name) we would be the only
// ones holding the before-and-after. `firstSeenAt` is never overwritten.
//
// SAFETY: this module does not judge anybody. It stores the BCU's own headline verbatim and a
// link back to the BCU. See the header of `~/utils/bcuWarnings` for why that distinction is the
// whole legal basis of the page.
import { connectDb } from './db'
import { BcuWarningModel } from '../models/BcuWarning'
import { BCU_WARNINGS_URL, parseBcuWarnings, type BcuWarning } from '../../utils/bcuWarnings'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

/** A listing this small is either right or broken — a sudden collapse means the page changed. */
const MIN_PLAUSIBLE_ROWS = 20

export interface BcuRefreshResult {
  fetched: number
  added: number
  total: number
  /** Entries we hold that the BCU no longer lists. Never deleted — surfaced for a human. */
  disappeared: string[]
  asOf: string
  ok: boolean
}

/** Fetch + parse the BCU listing. Returns [] on any failure: a bad scrape must not wipe the page. */
export async function fetchBcuWarnings(): Promise<BcuWarning[]> {
  try {
    const html = await $fetch<string>(BCU_WARNINGS_URL, {
      headers: { 'User-Agent': UA },
      timeout: 25000,
      responseType: 'text',
    })
    const rows = parseBcuWarnings(html)
    // If the BCU redesigns the page our regexes will quietly return nothing. Publishing "no
    // warnings exist" would be worse than publishing yesterday's list, so we refuse the result.
    if (rows.length < MIN_PLAUSIBLE_ROWS) return []
    return rows
  } catch {
    return []
  }
}

/** Weekly cycle: fetch, upsert what is new, and report anything that vanished. */
export async function refreshBcuWarnings(): Promise<BcuRefreshResult> {
  const now = new Date()
  const rows = await fetchBcuWarnings()

  await connectDb()

  if (!rows.length) {
    const total = await BcuWarningModel.countDocuments({})
    return { fetched: 0, added: 0, total, disappeared: [], asOf: now.toISOString(), ok: false }
  }

  const keyOf = (w: BcuWarning) => `${w.date}::${w.title}`
  const seen = new Set(rows.map(keyOf))

  const before = await BcuWarningModel.find({}).select({ key: 1 }).lean()
  const known = new Set(before.map(d => d.key))
  const added = rows.filter(w => !known.has(keyOf(w))).length

  await BcuWarningModel.bulkWrite(
    rows.map(w => ({
      updateOne: {
        filter: { key: keyOf(w) },
        update: {
          $set: {
            date: w.date,
            title: w.title,
            entities: w.entities,
            kind: w.kind,
            url: w.url,
            sharedSource: w.sharedSource,
            lastSeenAt: now,
          },
          // Our evidence of when we first published a claim about a named company.
          $setOnInsert: { key: keyOf(w), firstSeenAt: now },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  )

  const disappeared = before.map(d => d.key).filter(k => !seen.has(k))
  const total = await BcuWarningModel.countDocuments({})

  return { fetched: rows.length, added, total, disappeared, asOf: now.toISOString(), ok: true }
}

export interface PublishedWarnings {
  warnings: BcuWarning[]
  asOf: string | null
  empty: boolean
}

/** What the API serves: the stored snapshot, never a live call to the BCU. */
export async function getBcuWarnings(): Promise<PublishedWarnings> {
  await connectDb()
  const docs = await BcuWarningModel.find({}).sort({ date: -1 }).lean()
  return {
    warnings: docs.map(d => ({
      date: d.date,
      title: d.title,
      entities: d.entities,
      kind: d.kind,
      url: d.url,
      sharedSource: d.sharedSource,
    })),
    asOf: docs[0]?.lastSeenAt ? new Date(docs[0].lastSeenAt).toISOString() : null,
    empty: docs.length === 0,
  }
}
