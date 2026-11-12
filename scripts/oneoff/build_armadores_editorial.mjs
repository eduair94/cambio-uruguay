// Copia el relevamiento de docs/research/armadores/editorial.json al dato que lee el job
// (classes/armadores/editorialData.json), sacando lo que no es un servicio de armado contratable,
// y resuelve el place id de Google de cada prestador por el nombre EXACTO de su ficha (googleName):
// sin eso, "EL ARMADOR" o "ArmadoresMontevideo" no se unen con su ficha y aparecen dos veces.
//
//   node scripts/oneoff/build_armadores_editorial.mjs            # copia y resuelve (proxy :2221)
//   node scripts/oneoff/build_armadores_editorial.mjs --no-google
//
// El proxy se toma de ARMADORES_GMAPS_URL (por defecto el del VPS, público en :2221). Un place id
// se acepta sólo si el nombre que devuelve Google es exactamente el googleName relevado.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const source = JSON.parse(readFileSync(join(root, 'docs/research/armadores/editorial.json'), 'utf8'))
const target = join(root, 'classes/armadores/editorialData.json')
const previous = (() => {
  try {
    return JSON.parse(readFileSync(target, 'utf8'))
  } catch {
    return { providers: [] }
  }
})()

/**
 * No son un servicio de armado que se pueda contratar: tiendas que arman gratis SÓLO lo que venden
 * y no publican tarifa, la tienda que deriva a armadores que ya están con su propia lista, y la
 * plataforma cuyos avisos ya entran por el job. Quedan documentados en docs/research/armadores/notes.md.
 */
const EXCLUDE = new Set([
  'tienda-max', 'mobilart', 'mobili', 'artico-muebles', 'el-bunkker-gostore', 'la-cueva-muebles', 'nyr',
  'mercado-libre-servicios',
])

const GMAPS = (process.env.ARMADORES_GMAPS_URL || 'http://104.234.204.107:2221').replace(/\/+$/, '')
const knownIds = new Map(previous.providers.filter(p => p.googlePlaceId).map(p => [p.id, p.googlePlaceId]))

async function placeIdFor(googleName) {
  const url = `${GMAPS}/findPlaceFromText?input=${encodeURIComponent(googleName)}&inputtype=textquery&fields=place_id,name&language=es`
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) return null
  const body = await response.json()
  const hit = (body.candidates || []).find(c => c.name === googleName)
  return hit ? hit.place_id : null
}

const providers = []
for (const provider of source.providers) {
  if (EXCLUDE.has(provider.id)) continue
  let googlePlaceId = provider.googlePlaceId ?? knownIds.get(provider.id) ?? null
  if (!googlePlaceId && provider.googleName && !process.argv.includes('--no-google')) {
    googlePlaceId = await placeIdFor(provider.googleName).catch(() => null)
    console.log(`${provider.id}: ${provider.googleName} → ${googlePlaceId ?? 'sin coincidencia exacta'}`)
  }
  providers.push({ ...provider, googlePlaceId })
}

writeFileSync(target, JSON.stringify({ reviewedAt: source.reviewedAt, providers }, null, 2) + '\n')
console.log(`editorialData.json: ${providers.length} prestadores (${source.providers.length - providers.length} excluidos), ${providers.filter(p => p.googlePlaceId).length} con place id`)
