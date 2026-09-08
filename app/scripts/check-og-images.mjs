// Smoke-checks a bounded sample of actual published OG images.
// By default routes come from the general sitemap source. Use OG_PATHS for
// targeted detail checks without fetching the separate, large rental sitemap.
//
// Usage:
//   node scripts/check-og-images.mjs
//   BASE=https://cambio-uruguay.com node scripts/check-og-images.mjs
//   OG_PATHS=/alquileres-uruguay,/alquileres/example node scripts/check-og-images.mjs
import {
  evaluateOgImageResponse,
  explicitOgImagePaths,
  filterDefaultLocalePaths,
  pageOgImageUrl,
  sampleOgImagePaths,
} from './lib/og-image-check.mjs'

const BASE = process.env.BASE || 'http://localhost:3000'
const CONCURRENCY = Math.min(5, Math.max(1, Math.floor(Number(process.env.OG_CONCURRENCY) || 3)))
const LIMIT = Math.min(500, Math.max(1, Math.floor(Number(process.env.OG_LIMIT) || 60)))

async function fetchSitemapPaths() {
  const res = await fetch(`${BASE}/api/__sitemap__/urls`)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${BASE}/api/__sitemap__/urls: HTTP ${res.status}`)
  }
  const urls = await res.json()
  return filterDefaultLocalePaths(urls)
}

async function checkPath(path) {
  const pageUrl = new URL(path, BASE).href
  let url = null
  try {
    const page = await fetch(pageUrl, { signal: AbortSignal.timeout(15000) })
    if (!page.ok) return { path, url: pageUrl, ok: false, reason: `page HTTP ${page.status}` }
    url = pageOgImageUrl(await page.text(), pageUrl)
    if (!url) return { path, url: pageUrl, ok: false, reason: 'missing or invalid og:image' }
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    const buf = await res.arrayBuffer()
    const verdict = evaluateOgImageResponse({
      ok: res.ok,
      status: res.status,
      contentType: res.headers.get('content-type'),
      byteLength: buf.byteLength,
    })
    return { path, url, ...verdict }
  } catch (error) {
    return { path, url, ok: false, reason: error.message }
  }
}

async function runPool(items, worker, concurrency) {
  const results = Array.from({ length: items.length })
  let next = 0
  async function runWorker() {
    while (next < items.length) {
      const index = next++
      results[index] = await worker(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker))
  return results
}

async function main() {
  const explicit = explicitOgImagePaths(process.env.OG_PATHS)
  if (!explicit) console.log(`Fetching route list from ${BASE}/api/__sitemap__/urls ...`)
  const allPaths = explicit ?? (await fetchSitemapPaths())
  const paths = sampleOgImagePaths(allPaths, LIMIT)
  console.log(
    `Checking ${paths.length}/${allPaths.length} ${explicit ? 'explicit' : 'general-sitemap'} OG images (concurrency ${CONCURRENCY}; OG_LIMIT=${LIMIT}) ...`
  )

  const results = await runPool(paths, checkPath, CONCURRENCY)
  const failures = results.filter(r => !r.ok)

  console.log(`\n${results.length - failures.length}/${results.length} OG images OK`)

  if (failures.length) {
    console.log('\nFailures:')
    for (const f of failures) {
      console.log(`  ${f.path}  ->  ${f.reason}  (${f.url})`)
    }
    process.exitCode = 1
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
