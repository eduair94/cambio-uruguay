// Smoke-checks that every real route's OG image actually renders.
// Route list comes from the site's own live sitemap endpoint, so it can
// never drift from what's actually deployed (unlike a hand-maintained list).
//
// Usage:
//   node scripts/check-og-images.mjs
//   BASE=https://cambio-uruguay.com node scripts/check-og-images.mjs
import {
  evaluateOgImageResponse,
  filterDefaultLocalePaths,
  ogImageUrl,
} from './lib/og-image-check.mjs'

const BASE = process.env.BASE || 'http://localhost:3000'
const CONCURRENCY = 5

async function fetchSitemapPaths() {
  const res = await fetch(`${BASE}/api/__sitemap__/urls`)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${BASE}/api/__sitemap__/urls: HTTP ${res.status}`)
  }
  const urls = await res.json()
  return filterDefaultLocalePaths(urls)
}

async function checkPath(path) {
  const url = ogImageUrl(BASE, path)
  try {
    const res = await fetch(url)
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
  console.log(`Fetching route list from ${BASE}/api/__sitemap__/urls ...`)
  const paths = await fetchSitemapPaths()
  console.log(`Checking ${paths.length} default-locale OG images (concurrency ${CONCURRENCY}) ...`)

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
