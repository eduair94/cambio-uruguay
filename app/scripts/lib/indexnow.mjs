// IndexNow: la parte PURA del envío, separada de `scripts/indexnow.mjs` para que vitest la
// pruebe sin red (misma división que `og-image-check.mjs` ↔ `check-og-images.mjs`).
//
// Qué es y qué no es. IndexNow (indexnow.org) es el protocolo por el que Bing, Yandex, Seznam,
// Naver y los motores que lo comparten reciben un aviso de "estas URLs cambiaron" en vez de
// esperar al rastreo. Google NO lo lee. En este sitio es una cobertura para los motores de
// respuesta con IA que se apoyan en el índice de Bing, no una palanca de tráfico:
// docs/seo/2026-07-10-organic-growth-plan.md la dejó anotada como higiene y "refutada en impacto".
//
// Las reglas del protocolo que este módulo respeta y los tests pinnean:
//   - `host` es el apex desnudo (`cambio-uruguay.com`) y TODA URL enviada vive en ese host:
//     `server/middleware/canonical-host.ts` redirige www→apex con 301, así que anunciar una URL
//     con www sería anunciar una redirección.
//   - La clave son 8–128 hex; el archivo `https://<host>/<clave>.txt` contiene SOLO la clave y es
//     público a propósito (`app/public/<clave>.txt`, versionado). Sin él, el endpoint contesta 403.
//   - Hasta 10.000 URLs por POST, `Content-Type: application/json`.
//
// La clave NO vive como literal en este archivo: el archivo de `public/` es la única fuente y el
// CLI la descubre ahí (`resolveIndexNowKey`), así el script y el archivo no pueden desincronizarse.
// Y de paso el gate de secretos del repo (`gitleaks`, regla `generic-api-key`) no tiene una línea
// "clave = hex" que marcar — la primera versión la tenía y el gate la marcó.
//
// Y la regla de la casa: un sitemap que no contesta 200 o que viene sin `<loc>` es una FALLA, nunca
// "el sitio no tiene URLs" — `server/plugins/rental-sitemap-status.ts` prefiere un 503 antes que
// cachear un sitemap vacío por la misma razón. Acá se aborta y no se envía nada.

export const INDEXNOW_HOST = 'cambio-uruguay.com'
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
export const INDEXNOW_MAX_URLS_PER_POST = 10_000
/** Se entra por el índice y no por `/__sitemap__/es-ES.xml` a mano: sobrevive a un cambio de prefijo. */
export const SITEMAP_INDEX_URL = `https://${INDEXNOW_HOST}/sitemap_index.xml`
/** El sitemap en español es el de las canónicas; /en y /pt son alternates y rentals es otra familia. */
export const CHILD_SITEMAP_SUFFIX = 'es-ES.xml'
export const INDEXNOW_ENABLED_VAR = 'INDEXNOW_ENABLED'
/** El nombre del archivo de clave en `public/`: sólo hex minúsculas, 8–128, extensión .txt. */
export const INDEXNOW_KEY_FILE_PATTERN = /^([0-9a-f]{8,128})\.txt$/
// 120 s porque el sitemap ES se genera en el momento (3.600+ URLs, ~5-20 s en el propio VPS) y el
// primer dry-run desde el servidor abortó por timeout con el valor anterior (22/9/2026).
const FETCH_TIMEOUT_MS = 120_000

/**
 * Descubre la clave en el listado de `public/`: exactamente UN archivo `<hex>.txt` cuyo contenido
 * es ese mismo hex, sin salto de línea. Cero archivos o más de uno es un error, no una elección.
 */
export function resolveIndexNowKey({ fileNames, readFile }) {
  const candidates = (fileNames ?? []).filter(name => INDEXNOW_KEY_FILE_PATTERN.test(name))
  if (candidates.length === 0) return { ok: false, reason: 'no <hex>.txt key file in public/' }
  if (candidates.length > 1) {
    return { ok: false, reason: `more than one key file in public/: ${candidates.join(', ')}` }
  }
  const name = candidates[0]
  const expected = name.match(INDEXNOW_KEY_FILE_PATTERN)[1]
  let content
  try {
    content = readFile(name)
  } catch (error) {
    return { ok: false, reason: `cannot read ${name}: ${String(error?.message || error)}` }
  }
  if (content !== expected) {
    return { ok: false, reason: `${name} must contain exactly its own name, nothing else` }
  }
  return { ok: true, name, key: expected }
}

/** Dónde el motor va a verificar la clave: `https://<host>/<clave>.txt`, el archivo de `public/`. */
export function keyLocation(host, key) {
  return `https://${host}/${key}.txt`
}

function decodeXmlEntities(text) {
  return text.replace(
    /&(amp|lt|gt|quot|apos|#39);/g,
    entity =>
      ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'" })[
        entity
      ]
  )
}

/** Todos los `<loc>` de un sitemap o de un índice, en orden, con entidades decodificadas. */
export function extractLocs(xml) {
  if (typeof xml !== 'string') return []
  const locs = []
  for (const match of xml.matchAll(/<loc>([^<]*)<\/loc>/gi)) {
    const loc = decodeXmlEntities(match[1]).trim()
    if (loc) locs.push(loc)
  }
  return locs
}

/** El hijo del índice cuyo path termina en `suffix` (`es-ES.xml`), o `null` si el índice no lo lista. */
export function pickChildSitemap(indexXml, suffix = CHILD_SITEMAP_SUFFIX) {
  for (const loc of extractLocs(indexXml)) {
    try {
      if (new URL(loc).pathname.endsWith(`/${suffix}`)) return loc
    } catch {
      // Un <loc> que no parsea como URL no es candidato.
    }
  }
  return null
}

/**
 * Sólo las URLs https del apex, sin duplicados y en el orden del sitemap. Lo que se descarta
 * (www, http, otro host, fragmentos) se devuelve aparte para que el log diga qué quedó afuera.
 */
export function filterApexUrls(urls, host = INDEXNOW_HOST) {
  const kept = []
  const dropped = []
  const seen = new Set()
  for (const raw of urls) {
    let url
    try {
      url = new URL(raw)
    } catch {
      dropped.push(raw)
      continue
    }
    if (url.protocol !== 'https:' || url.hostname !== host || url.hash) {
      dropped.push(raw)
      continue
    }
    const href = url.href
    if (seen.has(href)) continue
    seen.add(href)
    kept.push(href)
  }
  return { kept, dropped }
}

/**
 * Tope de URLs NUEVAS por corrida. Medido el 22/9/2026: dos deploys seguidos mandaron las 3.691
 * URLs del sitemap en un solo POST y api.indexnow.org contestó 429 las dos veces ("potential
 * spam"). El protocolo admite 10.000 por POST, pero re-anunciar todo el sitio en cada deploy es
 * exactamente lo que el receptor castiga. Ahora se anuncia sólo lo que no se anunció antes, de a
 * lo sumo esta cantidad; el resto sale en los deploys siguientes.
 */
export const INDEXNOW_MAX_NEW_PER_RUN = 100

/**
 * Cuánto callar después de un 429. Medido el 22/9/2026: tras dos envíos de 3.691 URLs, el tercero
 * (ya de 500) también volvió 429 media hora después — el receptor castiga al host, no al lote. Un
 * deploy más no lo arregla; un día de silencio sí puede. El estado guarda `blockedUntil` y hasta
 * esa hora no hay POST.
 */
export const INDEXNOW_BACKOFF_MS = 24 * 60 * 60 * 1000

/**
 * Qué mandar en esta corrida: las URLs del sitemap que no figuran en el estado guardado (lo que ya
 * se anunció), en el orden del sitemap, recortadas al tope. Devuelve también el estado que habría
 * que guardar SI el envío sale bien (lo anunciado antes más lo de ahora), para que un rechazo no
 * marque como anunciado lo que no llegó. El estado es sólo un conjunto de URLs; una URL que
 * desaparece del sitemap deja de contar sola.
 */
export function planSubmission(urls, previous = [], cap = INDEXNOW_MAX_NEW_PER_RUN) {
  const seen = new Set(previous)
  const fresh = urls.filter(url => !seen.has(url))
  const toSend = fresh.slice(0, cap)
  const current = new Set(urls)
  const nextState = [...previous.filter(url => current.has(url)), ...toSend]
  return { toSend, pending: fresh.length - toSend.length, nextState }
}

/**
 * El archivo de estado: `{ submittedAt, urls: [...], blockedUntil? }`. Cualquier cosa ilegible
 * vale "nunca se anunció nada y no hay castigo vigente".
 */
export function parseState(text) {
  const empty = { urls: [], blockedUntil: null }
  try {
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object') return empty
    const urls = Array.isArray(parsed.urls)
      ? parsed.urls.filter(url => typeof url === 'string')
      : []
    const blockedUntil =
      typeof parsed.blockedUntil === 'string' && !Number.isNaN(Date.parse(parsed.blockedUntil))
        ? parsed.blockedUntil
        : null
    return { urls, blockedUntil }
  } catch {
    return empty
  }
}

/** Tandas de hasta `size` URLs (el protocolo acepta 10.000 por POST). */
export function chunkUrls(urls, size = INDEXNOW_MAX_URLS_PER_POST) {
  const chunks = []
  for (let index = 0; index < urls.length; index += size) {
    chunks.push(urls.slice(index, index + size))
  }
  return chunks
}

/** El cuerpo JSON de un POST: host, clave, dónde verificarla y la lista. */
export function buildPayload(urlList, { host = INDEXNOW_HOST, key } = {}) {
  if (!key) throw new Error('buildPayload: an IndexNow key is required')
  return { host, key, keyLocation: keyLocation(host, key), urlList: [...urlList] }
}

/**
 * Lee `NAME=valor` de un `.env` en texto (comillas simples/dobles opcionales, `export` opcional,
 * comentarios con `#`). Sin dotenv a propósito: el deploy corre `node scripts/indexnow.mjs` con el
 * `node_modules` del app, pero una dependencia más para leer UNA bandera no se justifica.
 */
export function readEnvFlag(dotenvText, name) {
  if (typeof dotenvText !== 'string') return undefined
  const pattern = new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*(.*?)\\s*$`)
  for (const line of dotenvText.split(/\r?\n/)) {
    const match = line.match(pattern)
    if (!match) continue
    const value = match[1]
    // Con comillas: lo que hay entre ellas, ignorando un comentario detrás del cierre.
    const quoted = value.match(/^(['"])(.*?)\1(?:\s+#.*)?$/)
    if (quoted) return quoted[2]
    return value.replace(/\s+#.*$/, '')
  }
  return undefined
}

/**
 * La compuerta. Desplegar este archivo no puede, por sí solo, empezar a llamar a un tercero
 * (la misma disciplina que `CONTENT_PROMO_ENABLED` en bots/): hace falta `INDEXNOW_ENABLED=1`.
 * Se mira el entorno del proceso y, si no está, el `.env` del app — `deploy.sh` corre por SSH no
 * interactivo y no lee ningún perfil, así que una variable puesta en la shell del VPS no llegaría.
 */
export function isEnabled(env = {}, dotenvText = '') {
  const fromProcess = env[INDEXNOW_ENABLED_VAR]
  if (fromProcess !== undefined && fromProcess !== '') return fromProcess === '1'
  return readEnvFlag(dotenvText, INDEXNOW_ENABLED_VAR) === '1'
}

async function fetchText(fetchImpl, url) {
  const res = await fetchImpl(url, {
    headers: { 'user-agent': 'cambio-uruguay-indexnow/1.0 (+https://cambio-uruguay.com)' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!res.ok) return { ok: false, status: res.status }
  return { ok: true, status: res.status, text: await res.text() }
}

/**
 * Índice → hijo `es-ES.xml` → sus `<loc>` filtradas al apex. Cualquier no-200 o un hijo sin
 * `<loc>` devuelve `{ ok: false, reason }`: abortar, no enviar.
 */
export async function collectUrls({
  fetch: fetchImpl,
  indexUrl = SITEMAP_INDEX_URL,
  suffix = CHILD_SITEMAP_SUFFIX,
  host = INDEXNOW_HOST,
} = {}) {
  const index = await fetchText(fetchImpl, indexUrl)
  if (!index.ok) {
    return { ok: false, reason: `sitemap index ${indexUrl} answered HTTP ${index.status}` }
  }
  const childUrl = pickChildSitemap(index.text, suffix)
  if (!childUrl) return { ok: false, reason: `sitemap index lists no child ending in ${suffix}` }
  const child = await fetchText(fetchImpl, childUrl)
  if (!child.ok) {
    return { ok: false, reason: `child sitemap ${childUrl} answered HTTP ${child.status}` }
  }
  const locs = extractLocs(child.text)
  if (locs.length === 0) return { ok: false, reason: `child sitemap ${childUrl} has no <loc>` }
  const { kept, dropped } = filterApexUrls(locs, host)
  if (kept.length === 0) {
    return { ok: false, reason: `no URL in ${childUrl} lives on https://${host}` }
  }
  return { ok: true, childUrl, urls: kept, dropped }
}

/** POST de cada tanda. Registra el estado; nunca lanza — un 4xx es un resultado, no una excepción. */
export async function submitPayloads({ fetch: fetchImpl, payloads, endpoint = INDEXNOW_ENDPOINT }) {
  const results = []
  for (const payload of payloads) {
    try {
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      // 200 = OK, 202 = aceptado con la clave pendiente de validar; lo demás es rechazo.
      results.push({
        status: res.status,
        ok: res.status === 200 || res.status === 202,
        urls: payload.urlList.length,
      })
    } catch (error) {
      results.push({
        status: 0,
        ok: false,
        urls: payload.urlList.length,
        error: String(error?.message || error),
      })
    }
  }
  return results
}

const EMPTY = { urls: 0, chunks: 0, responses: [] }

/**
 * El programa entero, con todo inyectado (fetch, env, argv, .env, clave, log) para que el test lo
 * corra sin red. Devuelve un resultado con `status` y NUNCA lanza: `deploy.sh` ya está swapeado y
 * sano cuando esto corre, y un tropiezo con un tercero no puede poner el deploy en rojo.
 *
 * `fetch` no tiene default a propósito: el CLI pasa `globalThis.fetch` y un test que no lo pasa
 * tiene que abortar, no salir a Internet (la primera versión hizo un POST real desde vitest).
 *
 *   status: 'disabled' | 'aborted' | 'dry-run' | 'submitted' | 'rejected'
 */
export async function runIndexNow({
  fetch: fetchImpl,
  env = {},
  argv = [],
  dotenvText = '',
  key,
  log = () => {},
  indexUrl = SITEMAP_INDEX_URL,
  endpoint = INDEXNOW_ENDPOINT,
  host = INDEXNOW_HOST,
  // Estado entre corridas (lo ya anunciado): `read()` devuelve el texto o null, `write(text)`
  // persiste. Sin estado inyectado se comporta como si nunca se hubiera anunciado nada, pero igual
  // respeta el tope por corrida.
  state = null,
  maxNewPerRun = INDEXNOW_MAX_NEW_PER_RUN,
  now = () => new Date().toISOString(),
} = {}) {
  const dryRun = argv.includes('--dry-run')
  try {
    if (!isEnabled(env, dotenvText) && !dryRun) {
      log(`indexnow: ${INDEXNOW_ENABLED_VAR} is not 1; nothing sent.`)
      return { status: 'disabled', ...EMPTY }
    }
    if (typeof fetchImpl !== 'function') {
      log('indexnow: no fetch available in this Node; nothing sent.')
      return { status: 'aborted', reason: 'no fetch', ...EMPTY }
    }
    if (!key) {
      log('indexnow: no valid key file in public/; nothing sent.')
      return { status: 'aborted', reason: 'no key', ...EMPTY }
    }
    const collected = await collectUrls({ fetch: fetchImpl, indexUrl, host })
    if (!collected.ok) {
      log(`indexnow: aborted, ${collected.reason}. Nothing sent.`)
      return { status: 'aborted', reason: collected.reason, ...EMPTY }
    }
    let previous = []
    let blockedUntil = null
    try {
      const text = state && typeof state.read === 'function' ? state.read() : null
      const saved = text ? parseState(text) : parseState('')
      previous = saved.urls
      blockedUntil = saved.blockedUntil
    } catch (error) {
      log(
        `indexnow: state unreadable, treating everything as new: ${String(error?.message || error)}`
      )
    }
    if (blockedUntil && Date.parse(blockedUntil) > Date.parse(now())) {
      log(`indexnow: backing off after a 429 until ${blockedUntil}; no POST.`)
      return { status: 'backoff', urls: 0, chunks: 0, responses: [] }
    }
    const plan = planSubmission(collected.urls, previous, maxNewPerRun)
    log(
      `indexnow: ${collected.urls.length} URLs in ${collected.childUrl}, ${previous.length} already announced, ` +
        `${plan.toSend.length} new to send now` +
        (plan.pending ? `, ${plan.pending} left for the next deploy` : '') +
        (collected.dropped.length ? `; ${collected.dropped.length} off-host/duplicate dropped` : '')
    )
    if (plan.toSend.length === 0) {
      log('indexnow: nothing new since the last announcement; no POST.')
      return { status: 'nothing-new', urls: 0, chunks: 0, responses: [] }
    }
    const payloads = chunkUrls(plan.toSend).map(chunk => buildPayload(chunk, { host, key }))
    if (dryRun) {
      log(
        `indexnow: --dry-run, would POST ${plan.toSend.length} URLs in ${payloads.length} POST(s) to ${endpoint} for host ${host} (key file ${keyLocation(host, key)}).`
      )
      for (const url of plan.toSend.slice(0, 10)) log(`  ${url}`)
      if (plan.toSend.length > 10) log(`  … ${plan.toSend.length - 10} more`)
      return {
        status: 'dry-run',
        urls: plan.toSend.length,
        chunks: payloads.length,
        responses: [],
      }
    }
    const responses = await submitPayloads({ fetch: fetchImpl, payloads, endpoint })
    for (const response of responses) {
      log(
        `indexnow: POST ${response.urls} URLs → HTTP ${response.status}${response.ok ? '' : ' (rejected)'}${response.error ? ` ${response.error}` : ''}`
      )
    }
    const allOk = responses.every(response => response.ok)
    const throttled = responses.some(response => response.status === 429)
    if (state && typeof state.write === 'function' && (allOk || throttled)) {
      // Sólo un envío aceptado marca URLs como anunciadas; un 429 no marca nada pero sí deja
      // escrito hasta cuándo callar, para que el deploy siguiente no vuelva a pegar.
      try {
        const next = allOk
          ? { submittedAt: now(), urls: plan.nextState }
          : {
              submittedAt: null,
              urls: previous,
              blockedUntil: new Date(Date.parse(now()) + INDEXNOW_BACKOFF_MS).toISOString(),
            }
        state.write(JSON.stringify(next))
      } catch (error) {
        log(`indexnow: could not persist state: ${String(error?.message || error)}`)
      }
    }
    return {
      status: allOk ? 'submitted' : 'rejected',
      urls: plan.toSend.length,
      chunks: payloads.length,
      responses,
    }
  } catch (error) {
    log(`indexnow: unexpected failure, nothing more sent: ${String(error?.message || error)}`)
    return { status: 'aborted', reason: String(error?.message || error), ...EMPTY }
  }
}
