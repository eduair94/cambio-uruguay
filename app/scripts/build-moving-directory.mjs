// Editorial import, run manually from either package. Nuxt builds only read the committed snapshot.
// No network, database writes, AI extraction or automatic date renewal.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const research = resolve(app, '../docs/research/moving')
const inputs = ['montevideo', 'interior', 'services', 'marketplace-verified']
const providers = inputs.flatMap(name => {
  const path = resolve(research, `${name}.json`)
  if (name === 'marketplace-verified' && !existsSync(path)) return []
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
})
const ids = new Set()
for (const provider of providers) {
  if (!provider.id || ids.has(provider.id)) throw new Error(`Duplicate/missing id: ${provider.id}`)
  ids.add(provider.id)
  for (const field of [
    'categories',
    'coverage',
    'services',
    'vehicles',
    'prices',
    'contacts',
    'sources',
    'caveats',
  ]) {
    if (!Array.isArray(provider[field])) throw new Error(`${provider.id}: missing ${field}`)
  }
  const sources = new Set(provider.sources.map(source => source.url))
  for (const evidence of [...provider.prices, ...provider.vehicles, ...provider.contacts]) {
    if (!sources.has(evidence.sourceUrl))
      throw new Error(`${provider.id}: unlisted source ${evidence.sourceUrl}`)
  }
  for (const price of provider.prices) {
    if (!Number.isFinite(price.amount) || price.amount < 0 || !price.label || !price.unit) {
      throw new Error(`${provider.id}: invalid price`)
    }
  }
}
providers.sort((a, b) => a.name.localeCompare(b.name, 'es'))
const output = `${JSON.stringify(providers, null, 2)}\n`
const target = resolve(app, 'utils/movingServicesData.json')
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== output)
    throw new Error('Snapshot differs; run build-moving-directory.mjs')
} else {
  writeFileSync(target, output)
}
console.log(
  JSON.stringify({
    providers: providers.length,
    withPrices: providers.filter(p => p.prices.length).length,
    prices: providers.reduce((sum, p) => sum + p.prices.length, 0),
    sources: new Set(providers.flatMap(p => p.sources.map(s => s.url))).size,
  })
)
