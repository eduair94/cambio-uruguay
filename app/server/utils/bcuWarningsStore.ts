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
import { X509Certificate } from 'node:crypto'
import { request as httpsRequest } from 'node:https'
import { rootCertificates } from 'node:tls'
import { connectDb } from './db'
import { BcuWarningModel } from '../models/BcuWarning'
import { BCU_WARNINGS_URL, parseBcuWarnings, type BcuWarning } from '../../utils/bcuWarnings'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

/** A listing this small is either right or broken — a sudden collapse means the page changed. */
const MIN_PLAUSIBLE_ROWS = 20

// ── The BCU's TLS is misconfigured, and this is how we work around it HONESTLY ───────────────
//
// bcu.gub.uy serves ONLY its leaf certificate — it never sends the Abitab intermediate. Browsers
// hide this by chasing the "CA Issuers" URL in the certificate (AIA fetching); Node does not, so
// a plain fetch dies with UNABLE_TO_VERIFY_LEAF_SIGNATURE.
//
// The tempting fix is `rejectUnauthorized: false`. We are NOT doing that: this page publishes
// accusations against named companies, and accepting any certificate would mean anyone able to
// intercept the connection could choose which companies we accuse. So we do what the browser
// does — fetch the missing intermediate from the AIA URL (plain HTTP, so there is no
// chicken-and-egg), add it to the normal root store, and keep verification fully ON.
//
// The gap is TWO certificates deep, not one: the leaf is issued by "Abitab SSL Organization
// Validated", which is itself issued by "Certum Global Services CA SHA2", which is finally issued
// by a real root. So we CHASE the AIA chain rather than hard-coding one URL — that way it keeps
// working when either certificate is rotated.
//
// If any fetch fails, the scrape fails, and the last good list keeps serving. Nothing here can
// silently downgrade to insecure.
const BCU_AIA_START = 'http://repository.certum.pl/abitabov.cer'
const MAX_AIA_HOPS = 4

let cachedCa: string[] | null = null

/** DER (binary) → PEM, the format the TLS stack wants. */
function derToPem(der: Buffer): string {
  const b64 = der.toString('base64').replace(/(.{64})/g, '$1\n')
  return `-----BEGIN CERTIFICATE-----\n${b64}\n-----END CERTIFICATE-----\n`
}

/**
 * Parse a fetched blob into a certificate. AIA endpoints are inconsistent — some serve DER, some
 * PEM, some a PKCS#7 bundle we cannot read. An unparseable blob is not an error: it just means we
 * stop climbing, and by then the next issuer up is a real root that Node already trusts.
 */
function toCertificate(raw: Buffer): { pem: string; nextUrl: string | null } | null {
  const candidates = [derToPem(raw), raw.toString('utf8')]
  for (const pem of candidates) {
    try {
      const cert = new X509Certificate(pem)
      const m = (cert.infoAccess ?? '').match(/CA Issuers - URI:(\S+)/)
      return { pem, nextUrl: m?.[1] ?? null }
    } catch {
      // try the next interpretation
    }
  }
  return null
}

/**
 * The normal root store PLUS every intermediate the BCU forgets to send, walked up from its
 * certificate's AIA pointer until we run out of readable certificates (i.e. we have reached a
 * trusted root).
 */
async function bcuTrustStore(): Promise<string[]> {
  if (cachedCa) return cachedCa

  const chain: string[] = []
  let url: string | null = BCU_AIA_START

  for (let hop = 0; hop < MAX_AIA_HOPS && url; hop++) {
    const res: Response = await fetch(url)
    if (!res.ok) throw new Error(`AIA fetch failed (${url}): ${res.status}`)
    const cert = toCertificate(Buffer.from(await res.arrayBuffer()))
    if (!cert) break // not a certificate we can read — we already have what we need
    chain.push(cert.pem)
    url = cert.nextUrl
  }
  if (!chain.length) throw new Error('AIA chain empty')

  cachedCa = [...rootCertificates, ...chain]
  return cachedCa
}

/** GET over TLS, verifying against the repaired chain. */
function getWithChain(url: string, ca: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      url,
      { method: 'GET', headers: { 'User-Agent': UA }, ca, timeout: 25000 },
      res => {
        if ((res.statusCode ?? 0) >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`))
          res.resume()
          return
        }
        let body = ''
        res.setEncoding('utf8')
        res.on('data', chunk => (body += chunk))
        res.on('end', () => resolve(body))
      }
    )
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.on('error', reject)
    req.end()
  })
}

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
    const ca = await bcuTrustStore()
    const html = await getWithChain(BCU_WARNINGS_URL, ca)
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
