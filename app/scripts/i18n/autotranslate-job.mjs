#!/usr/bin/env node
// The page translation memory (utils/autoTranslate.ts): crawl, translate, measure. pm2
// `currency-autotranslate` runs it every 10 minutes from app/ (ecosystem.config.js at the root).
//
//   node scripts/i18n/autotranslate-job.mjs            # one bounded run
//   node scripts/i18n/autotranslate-job.mjs --dry-run  # crawl and count, translate nothing
//
// Each run:
// 1. EMBARGO — the routes of docs/seo/experiments.json rows still inside their 28-day window go
//    to `autotranslationconfig`: those pages are translated but keep their canonical and hreflang.
// 2. CRAWL — up to AUTO_TRANSLATE_CRAWL Spanish pages from the es-ES sitemap, never-seen first and
//    by family priority (lib/autotranslate-plan.mjs), are cut into segments by the app itself
//    (/api/auto-translate/segments), so the keys stored are exactly the keys a render looks up.
// 3. TRANSLATE — what the memory lacks, locale by locale in AUTO_TRANSLATE_LOCALES order (English
//    and Portuguese first), up to AUTO_TRANSLATE_CHARS characters, through tr-file
//    (lib/machine-translate.mjs). A service that keeps refusing ends the run; the next one resumes.
// 4. COVERAGE — per page and locale, the share of Spanish characters with a translation. At
//    AUTO_TRANSLATE_THRESHOLD a page's translated URL becomes canonical and enters the sitemap.
//
// Needs MONGO_URI (the app database) and NUXT_API_ADMIN_TOKEN, read from app/.env like the app.

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'
import mongoose from 'mongoose'
import { embargoRoutes, familyOf } from './lib/autotranslate-plan.mjs'
import { createTranslator } from './lib/machine-translate.mjs'

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
if (existsSync(resolve(APP, '.env'))) process.loadEnvFile(resolve(APP, '.env'))
const jiti = createJiti(import.meta.url, { alias: { '~': APP, '@': APP } })
const { AUTO_TRANSLATE_LOCALES, AUTO_TRANSLATE_THRESHOLD, isEmbargoed } = await jiti.import(
  resolve(APP, 'utils/autoTranslate.ts')
)
const { EXTRA_LOCALES } = await jiti.import(resolve(APP, 'utils/locales.ts'))
const { CASAS_REPUTATION } = await jiti.import(resolve(APP, 'utils/casasDirectory.ts'))

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const env = process.env
const ORIGIN = (env.AUTO_TRANSLATE_ORIGIN || `http://127.0.0.1:${env.PORT || 3311}`).replace(
  /\/$/,
  ''
)
const TOKEN = env.NUXT_API_ADMIN_TOKEN || ''
const CRAWL = Number(env.AUTO_TRANSLATE_CRAWL || 25)
const CHAR_BUDGET = Number(env.AUTO_TRANSLATE_CHARS || 150_000)
const DEADLINE = Date.now() + Number(env.AUTO_TRANSLATE_MINUTES || 8) * 60_000
const RECRAWL_DAYS = Number(env.AUTO_TRANSLATE_RECRAWL_DAYS || 14)
const LOCALES = (env.AUTO_TRANSLATE_LOCALES || AUTO_TRANSLATE_LOCALES.join(','))
  .split(',')
  .filter(code => AUTO_TRANSLATE_LOCALES.includes(code))
const GOOGLE = Object.fromEntries([
  ['en', 'en'],
  ['pt', 'pt'],
  ...EXTRA_LOCALES.map(locale => [locale.code, locale.google]),
])

const log = (...parts) => console.log(new Date().toISOString(), ...parts)

// --------------------------------------------------------------------------------- embargo ---

function embargo() {
  const file = resolve(APP, '../docs/seo/experiments.json')
  if (!existsSync(file)) return []
  return embargoRoutes(JSON.parse(readFileSync(file, 'utf8')).experiments)
}

// ----------------------------------------------------------------------------------- crawl ---

async function sitemapPaths() {
  const response = await fetch(`${ORIGIN}/__sitemap__/es-ES.xml`, {
    headers: { accept: 'application/xml' },
  })
  if (!response.ok) throw new Error(`es-ES sitemap: HTTP ${response.status}`)
  const xml = await response.text()
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map(match => {
      try {
        return new URL(match[1]).pathname.replace(/(.)\/+$/, '$1')
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

async function segmentsOf(path) {
  const response = await fetch(
    `${ORIGIN}/api/auto-translate/segments?path=${encodeURIComponent(path)}`,
    { headers: { 'x-auto-translate-token': TOKEN, accept: 'application/json' } }
  )
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`segments ${path}: HTTP ${response.status}`)
  return (await response.json()).segments
}

// --------------------------------------------------------------------------------------- run ---

async function main() {
  if (!env.MONGO_URI) throw new Error('MONGO_URI is not configured')
  if (!TOKEN) throw new Error('NUXT_API_ADMIN_TOKEN is not configured')
  await mongoose.connect(env.MONGO_URI, { maxPoolSize: 3 })
  const db = mongoose.connection.db
  const pagesCol = db.collection('autotranslationpages')
  const sourcesCol = db.collection('autotranslationsources')
  const memoryCol = db.collection('autotranslations')
  const configCol = db.collection('autotranslationconfig')

  // One run at a time: a lease that outlives a crashed run by a few minutes at most.
  const now = new Date()
  const lease = await configCol.findOneAndUpdate(
    { _id: 'lease', $or: [{ until: { $lt: now } }, { until: { $exists: false } }] },
    { $set: { until: new Date(DEADLINE + 120_000), pid: process.pid } },
    { upsert: false, returnDocument: 'after' }
  )
  if (!lease) {
    const exists = await configCol.findOne({ _id: 'lease' })
    if (exists) {
      log('another run holds the lease until', exists.until?.toISOString?.())
      return
    }
    await configCol.insertOne({
      _id: 'lease',
      until: new Date(DEADLINE + 120_000),
      pid: process.pid,
    })
  }

  try {
    const routes = embargo()
    await configCol.updateOne(
      { _id: 'embargo' },
      { $set: { routes, at: new Date() } },
      { upsert: true }
    )

    // 2. Crawl.
    const known = new Map(
      (await pagesCol.find({}, { projection: { at: 1 } }).toArray()).map(row => [row._id, row.at])
    )
    const stale = Date.now() - RECRAWL_DAYS * 86_400_000
    // A page reserved by the change log cannot be announced until its window closes, so the
    // pages that can go out now come first (266 reserved routes on the first production run).
    const reserved = path => (isEmbargoed(path, routes) ? 1 : 0)
    const candidates = (await sitemapPaths())
      .map((path, order) => ({ path, order, tier: familyOf(path) }))
      .filter(entry => entry.tier !== null)
      .filter(entry => !known.has(entry.path) || new Date(known.get(entry.path)).getTime() < stale)
      .sort((a, b) => {
        const seenA = known.has(a.path) ? 1 : 0
        const seenB = known.has(b.path) ? 1 : 0
        return (
          seenA - seenB ||
          reserved(a.path) - reserved(b.path) ||
          a.tier - b.tier ||
          a.order - b.order
        )
      })
      .slice(0, CRAWL)
    let crawled = 0
    for (const { path, tier } of candidates) {
      if (Date.now() > DEADLINE - 60_000) break
      let segments
      try {
        segments = await segmentsOf(path)
      } catch (error) {
        log('crawl failed', path, error.message)
        continue
      }
      if (segments === null) {
        await pagesCol.deleteOne({ _id: path })
        continue
      }
      if (segments.length) {
        await sourcesCol.bulkWrite(
          segments.map(({ h, s, x }) => ({
            updateOne: {
              filter: { _id: h },
              update: { $set: x ? { s, x } : { s } },
              upsert: true,
            },
          })),
          { ordered: false }
        )
      }
      await pagesCol.updateOne(
        { _id: path },
        { $set: { segs: segments.map(({ h, s }) => [h, s.length]), tier, at: new Date() } },
        { upsert: true }
      )
      crawled++
    }

    // 3. Translate, in page priority order.
    const pages = (
      await pagesCol
        .find({}, { projection: { segs: 1, tier: 1, at: 1 } })
        .sort({ tier: 1, at: 1 })
        .toArray()
    ).sort((a, b) => reserved(a._id) - reserved(b._id))
    const wanted = []
    const seen = new Set()
    for (const page of pages) {
      for (const [hash] of page.segs ?? []) {
        if (!seen.has(hash)) {
          seen.add(hash)
          wanted.push(hash)
        }
      }
    }
    const translator = createTranslator({
      protectedTerms: [
        'cambio-uruguay.com',
        'Cambio Uruguay',
        'Cambio UY',
        ...CASAS_REPUTATION.map(casa => casa.name),
      ],
      verbose: false,
    })
    const have = {}
    let budget = CHAR_BUDGET
    let translatedCount = 0
    let refused = null
    for (const locale of LOCALES) {
      const existing = await memoryCol.find({ l: locale }, { projection: { h: 1 } }).toArray()
      have[locale] = new Set(existing.map(row => row.h))
      if (refused || DRY_RUN || budget <= 0 || Date.now() > DEADLINE - 30_000) continue
      const missing = wanted.filter(hash => !have[locale].has(hash))
      while (missing.length && budget > 0 && Date.now() < DEADLINE - 30_000) {
        const batch = []
        let chars = 0
        const rows = await sourcesCol.find({ _id: { $in: missing.slice(0, 400) } }).toArray()
        const sources = new Map(rows.map(row => [row._id, row]))
        const taken = missing.splice(0, 400)
        for (const [index, hash] of taken.entries()) {
          const source = sources.get(hash)
          if (!source?.s) continue
          if (chars + source.s.length > Math.min(budget, 20_000) && batch.length) {
            missing.unshift(...taken.slice(index))
            break
          }
          batch.push({ id: hash, template: source.s, example: source.x })
          chars += source.s.length
        }
        if (!batch.length) break
        budget -= chars
        let result
        try {
          result = await translator.translateTemplates(batch, GOOGLE[locale], locale)
        } catch (error) {
          refused = error.message
          result = error.partial ?? new Map()
        }
        if (result.size) {
          await memoryCol.bulkWrite(
            [...result].map(([hash, translation]) => ({
              updateOne: {
                filter: { _id: `${locale}|${hash}` },
                update: { $set: { l: locale, h: hash, t: translation, at: new Date() } },
                upsert: true,
              },
            })),
            { ordered: false }
          )
          for (const hash of result.keys()) have[locale].add(hash)
          translatedCount += result.size
        }
        if (refused) break
      }
    }

    // 4. Coverage.
    const updates = []
    for (const page of pages) {
      const segs = page.segs ?? []
      const total = segs.reduce((sum, [, length]) => sum + length, 0)
      const cov = {}
      for (const locale of LOCALES) {
        if (!total) continue
        const done = segs.reduce(
          (sum, [hash, length]) => sum + (have[locale].has(hash) ? length : 0),
          0
        )
        cov[locale] = Math.round((done / total) * 1000) / 1000
      }
      updates.push({ updateOne: { filter: { _id: page._id }, update: { $set: { cov } } } })
    }
    if (updates.length && !DRY_RUN) await pagesCol.bulkWrite(updates, { ordered: false })
    const ready = Object.fromEntries(
      LOCALES.map(locale => [
        locale,
        pages.filter(page => {
          const segs = page.segs ?? []
          const total = segs.reduce((sum, [, length]) => sum + length, 0)
          const done = segs.reduce(
            (sum, [hash, length]) => sum + (have[locale].has(hash) ? length : 0),
            0
          )
          return total > 0 && done / total >= AUTO_TRANSLATE_THRESHOLD
        }).length,
      ])
    )
    log(
      `crawled ${crawled}/${candidates.length}, pages ${pages.length}, segments ${wanted.length},`,
      `translated ${translatedCount} (${CHAR_BUDGET - budget} chars, ${translator.stats.requests} requests)`,
      `ready ${JSON.stringify(ready)}`,
      `embargo ${routes.length}`,
      refused ? `— stopped: ${refused}` : ''
    )
  } finally {
    await configCol.updateOne({ _id: 'lease' }, { $set: { until: new Date(0) } })
  }
}

main()
  .catch(error => {
    log('failed:', error.message)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect().catch(() => {}))
