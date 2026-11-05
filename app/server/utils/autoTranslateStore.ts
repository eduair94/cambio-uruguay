import { readFileSync } from 'node:fs'
import mongoose from 'mongoose'
import { AUTO_TRANSLATE_THRESHOLD } from '../../utils/autoTranslate'
import { connectDb } from './db'

/**
 * The translation memory that `utils/autoTranslate.ts` reads, and what the pages know about it.
 *
 * Written ONLY by the translation job (scripts/i18n/autotranslate-job.mjs, pm2
 * `currency-autotranslate`); the server never calls a translation service. Three collections of
 * the app database:
 *
 * - `autotranslations`: `{ _id: '<locale>|<hash>', t }`, one stored translation per segment.
 * - `autotranslationpages`: `{ _id: '<spanish path>', cov: { en: 0.97, … } }`, the share of the
 *   page's Spanish text that has a translation, per locale.
 * - `autotranslationconfig` `{ _id: 'embargo', routes }`: routes of docs/seo/experiments.json
 *   still inside their 28-day window. Their pages are translated but keep their canonical and
 *   their hreflang as they were, so the measurement is not contaminated.
 *
 * Every read is cached per worker; a database that is down or not configured means "nothing is
 * translated", never an error page. For a local check without Mongo, AUTO_TRANSLATE_FILE points
 * at a JSON file `{ translations: { '<locale>|<hash>': text }, pages: { path: { en: 1 } } }`.
 */

const HIT_TTL = 60 * 60 * 1000
const MISS_TTL = 10 * 60 * 1000
const PAGE_TTL = 10 * 60 * 1000
// The app workers run with a 512 MB heap (ecosystem.config.cjs); ~200 bytes an entry keeps this
// cache around 30 MB at its fullest.
const MAX_CACHED = 150_000

const translationCache = new Map<string, { text: string | null; at: number }>()
const pageCache = new Map<string, { coverage: Record<string, number>; at: number }>()
let embargoCache: { routes: string[]; at: number } | null = null

interface LocalFile {
  translations?: Record<string, string>
  pages?: Record<string, Record<string, number>>
  embargo?: string[]
}
let localFile: { data: LocalFile; at: number } | null = null

function readLocalFile(): LocalFile | null {
  const path = process.env.AUTO_TRANSLATE_FILE
  if (!path) return null
  if (!localFile || Date.now() - localFile.at > 5000) {
    try {
      localFile = { data: JSON.parse(readFileSync(path, 'utf8')) as LocalFile, at: Date.now() }
    } catch {
      localFile = { data: {}, at: Date.now() }
    }
  }
  return localFile.data
}

async function collection(name: string) {
  if (!useRuntimeConfig().mongoUri) return null
  try {
    await connectDb()
    return mongoose.connection.db?.collection(name) ?? null
  } catch {
    return null
  }
}

function remember(key: string, text: string | null) {
  if (translationCache.size >= MAX_CACHED) {
    // Drop the oldest tenth; Map iteration order is insertion order.
    let drop = Math.ceil(MAX_CACHED / 10)
    for (const cached of translationCache.keys()) {
      translationCache.delete(cached)
      if (--drop <= 0) break
    }
  }
  translationCache.set(key, { text, at: Date.now() })
}

/** hash → stored translation (template with {0}…) for the hashes the memory knows. */
export async function lookupTranslations(
  locale: string,
  hashes: readonly string[]
): Promise<Map<string, string>> {
  const found = new Map<string, string>()
  const missing: string[] = []
  const now = Date.now()
  for (const hash of new Set(hashes)) {
    const cached = translationCache.get(`${locale}|${hash}`)
    if (cached && now - cached.at < (cached.text === null ? MISS_TTL : HIT_TTL)) {
      if (cached.text !== null) found.set(hash, cached.text)
    } else {
      missing.push(hash)
    }
  }
  if (!missing.length) return found

  const local = readLocalFile()
  if (local) {
    for (const hash of missing) {
      const text = local.translations?.[`${locale}|${hash}`] ?? null
      if (text !== null) found.set(hash, text)
    }
    return found
  }

  const docs = await collection('autotranslations')
  if (!docs) return found
  try {
    const ids = missing.map(hash => `${locale}|${hash}`)
    const rows = (await docs
      .find({ _id: { $in: ids } } as never, { projection: { t: 1 } })
      .toArray()) as unknown as Array<{ _id: string; t: string }>
    const byId = new Map(rows.map(row => [row._id, row.t]))
    for (const hash of missing) {
      const text = byId.get(`${locale}|${hash}`) ?? null
      remember(`${locale}|${hash}`, text)
      if (text !== null) found.set(hash, text)
    }
  } catch {
    // A failed read is "not translated yet", and is not cached.
  }
  return found
}

/** Share of the page's Spanish text with a translation, per locale (0..1). */
export async function pageCoverage(path: string): Promise<Record<string, number>> {
  const cached = pageCache.get(path)
  if (cached && Date.now() - cached.at < PAGE_TTL) return cached.coverage
  let coverage: Record<string, number> = {}
  const local = readLocalFile()
  if (local) {
    coverage = local.pages?.[path] ?? {}
  } else {
    const docs = await collection('autotranslationpages')
    if (docs) {
      try {
        const row = (await docs.findOne({ _id: path } as never, { projection: { cov: 1 } })) as {
          cov?: Record<string, number>
        } | null
        coverage = row?.cov ?? {}
      } catch {
        return cached?.coverage ?? {}
      }
    }
  }
  if (pageCache.size > 20_000) pageCache.clear()
  pageCache.set(path, { coverage, at: Date.now() })
  return coverage
}

/** Locales in which the page is translated enough to stand on its own. */
export async function translatedLocales(path: string): Promise<string[]> {
  const coverage = await pageCoverage(path)
  return Object.entries(coverage)
    .filter(([, share]) => share >= AUTO_TRANSLATE_THRESHOLD)
    .map(([locale]) => locale)
}

/** Every page with at least one translated locale (the sitemap's input). */
export async function allTranslatedPages(): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  const local = readLocalFile()
  const rows: Array<{ _id: string; cov?: Record<string, number> }> = []
  if (local) {
    for (const [path, cov] of Object.entries(local.pages ?? {})) rows.push({ _id: path, cov })
  } else {
    const docs = await collection('autotranslationpages')
    if (!docs) return out
    try {
      rows.push(
        ...((await docs.find({}, { projection: { cov: 1 } }).toArray()) as unknown as Array<{
          _id: string
          cov?: Record<string, number>
        }>)
      )
    } catch {
      return out
    }
  }
  for (const row of rows) {
    const locales = Object.entries(row.cov ?? {})
      .filter(([, share]) => share >= AUTO_TRANSLATE_THRESHOLD)
      .map(([locale]) => locale)
    if (locales.length) out.set(row._id, locales)
  }
  return out
}

/** Routes of docs/seo/experiments.json inside their 28-day window (written by the job). */
export async function embargoedRoutes(): Promise<string[]> {
  if (embargoCache && Date.now() - embargoCache.at < PAGE_TTL) return embargoCache.routes
  let routes: string[] = []
  const local = readLocalFile()
  if (local) {
    routes = local.embargo ?? []
  } else {
    const docs = await collection('autotranslationconfig')
    if (docs) {
      try {
        const row = (await docs.findOne({ _id: 'embargo' } as never)) as {
          routes?: string[]
        } | null
        routes = row?.routes ?? []
      } catch {
        return embargoCache?.routes ?? []
      }
    }
  }
  embargoCache = { routes, at: Date.now() }
  return routes
}
