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
// 3. TRANSLATE — what the memory lacks, family by family and, inside each, every locale in
//    AUTO_TRANSLATE_LOCALES order, up to AUTO_TRANSLATE_CHARS characters sent, through tr-file
//    (lib/machine-translate.mjs). A service that keeps refusing ends the run; the next one resumes.
//    A segment whose translation fails the checks is skipped for 30 days
//    (`autotranslationfailures`): retried every run, 88 of them ate half of each run's budget.
// 4. COVERAGE — per page and locale, the share of Spanish characters with a translation. At
//    AUTO_TRANSLATE_THRESHOLD a page's translated URL becomes canonical and enters the sitemap.
//
// Needs MONGO_URI (the app database) and NUXT_API_ADMIN_TOKEN, read from app/.env like the app.

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'
import mongoose from 'mongoose'
import { embargoRoutes, familyOf, giveUp, translationGroups } from './lib/autotranslate-plan.mjs'
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
// 1.676 more pages joined the crawl on 2026-11-06 (blog, newsletter, the directories): 50 a run
// reads them in about six hours, a page or two per second.
const CRAWL = Number(env.AUTO_TRANSLATE_CRAWL || 50)
// Characters actually sent, retries included. Once the failures stopped being retried, 150.000
// took 30 seconds (2026-11-06); 800.000 leaves the run well inside its eight minutes.
const CHAR_BUDGET = Number(env.AUTO_TRANSLATE_CHARS || 800_000)
const FAILURE_RETRY_DAYS = Number(env.AUTO_TRANSLATE_FAILURE_RETRY_DAYS || 30)
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

/**
 * The `<locale>|<hash>` documents of one locale, read as a range of `_id` — the primary index —
 * so it stays an index scan however many locales the collection holds ('}' follows '|').
 */
function idsOf(col, locale, projection = {}) {
  return col
    .find(
      { _id: { $gte: `${locale}|`, $lt: `${locale}}` } },
      { projection: { _id: 1, ...projection } }
    )
    .toArray()
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
  const failuresCol = db.collection('autotranslationfailures')

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

    // 3. Translate. Family by family and, inside each family, every locale in turn: the
    // editorial pages reach all the languages before any language gets the catalogues.
    const pages = (
      await pagesCol
        .find({}, { projection: { segs: 1, tier: 1, at: 1 } })
        .sort({ tier: 1, at: 1 })
        .toArray()
    ).sort((a, b) => reserved(a._id) - reserved(b._id))
    const groups = translationGroups(pages, path => reserved(path) === 1)
    const wantedCount = groups.reduce((sum, group) => sum + group.hashes.length, 0)
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
    const failed = {}
    const retryAfter = Date.now() - FAILURE_RETRY_DAYS * 86_400_000
    for (const locale of LOCALES) {
      have[locale] = new Set(
        (await idsOf(memoryCol, locale)).map(row => row._id.slice(locale.length + 1))
      )
      failed[locale] = new Set(
        (await idsOf(failuresCol, locale, { n: 1, at: 1 }))
          .filter(row => giveUp(row, retryAfter))
          .map(row => row._id.slice(locale.length + 1))
      )
    }
    const spent = () => translator.stats.chars
    const open = () => spent() < CHAR_BUDGET && Date.now() < DEADLINE - 30_000
    let translatedCount = 0
    let failedCount = 0
    let refused = null
    for (const group of DRY_RUN ? [] : groups) {
      for (const locale of LOCALES) {
        if (refused || !open()) break
        const missing = group.hashes.filter(
          hash => !have[locale].has(hash) && !failed[locale].has(hash)
        )
        while (missing.length && open()) {
          const batch = []
          let chars = 0
          const taken = missing.splice(0, 400)
          const rows = await sourcesCol.find({ _id: { $in: taken } }).toArray()
          const sources = new Map(rows.map(row => [row._id, row]))
          const room = Math.min(CHAR_BUDGET - spent(), 20_000)
          for (const [index, hash] of taken.entries()) {
            const source = sources.get(hash)
            if (!source?.s) continue
            if (chars + source.s.length > room && batch.length) {
              missing.unshift(...taken.slice(index))
              break
            }
            batch.push({ id: hash, template: source.s, example: source.x })
            chars += source.s.length
          }
          if (!batch.length) break
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
          // What the service answered but did not survive the checks (a figure lost, a token
          // mangled) fails the same way next time: remember it, so the next runs stop paying
          // for it. A refusal says nothing about the items it cut off.
          const rejected = refused ? [] : batch.filter(item => !result.has(item.id))
          if (rejected.length) {
            await failuresCol.bulkWrite(
              rejected.map(item => ({
                updateOne: {
                  filter: { _id: `${locale}|${item.id}` },
                  update: { $inc: { n: 1 }, $set: { at: new Date() } },
                  upsert: true,
                },
              })),
              { ordered: false }
            )
            for (const item of rejected) failed[locale].add(item.id)
            failedCount += rejected.length
          }
          if (refused) break
        }
      }
    }

    // 4. Coverage.
    const updates = []
    for (const page of pages) {
      const segs = page.segs ?? []
      const total = segs.reduce((sum, [, length]) => sum + length, 0)
      // One field per locale: a run limited by AUTO_TRANSLATE_LOCALES must not erase the
      // coverage of the locales it did not look at (and with it their canonical and sitemap).
      const cov = {}
      for (const locale of LOCALES) {
        if (!total) continue
        const done = segs.reduce(
          (sum, [hash, length]) => sum + (have[locale].has(hash) ? length : 0),
          0
        )
        cov[`cov.${locale}`] = Math.round((done / total) * 1000) / 1000
      }
      if (Object.keys(cov).length) {
        updates.push({ updateOne: { filter: { _id: page._id }, update: { $set: cov } } })
      }
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
      `crawled ${crawled}/${candidates.length}, pages ${pages.length}, segments ${wantedCount},`,
      `translated ${translatedCount}, failed ${failedCount}`,
      `(${spent()} chars, ${translator.stats.requests} requests)`,
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
