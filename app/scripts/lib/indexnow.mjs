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
/**
 * Los dos endpoints que nombra indexnow.org/faq; uno basta, el aviso se comparte entre motores.
 * `INDEXNOW_ENDPOINT` en el entorno o en `app/.env` elige entre ESTOS y nada más: la clave viaja
 * en el cuerpo y no se le manda a un host cualquiera por una variable mal escrita.
 */
export const INDEXNOW_ENDPOINTS = Object.freeze([
  INDEXNOW_ENDPOINT,
  'https://www.bing.com/indexnow',
])
export const INDEXNOW_ENDPOINT_VAR = 'INDEXNOW_ENDPOINT'
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
 *
 * Era 100 y bajó a 25 el 19/10/2026: con 100 se aceptaron cinco tandas y la sexta volvió 429, con
 * 3.377 URLs viejas todavía en cola. A 25 por deploy el atraso tarda más, pero el atraso no es lo
 * que importa: una página nueva sale primero (ver `planSubmission`), y es la que Bing no conoce.
 *
 * Desde el 20/11/2026 es el TECHO de la tanda, no la tanda: después de un 429 se vuelve de a 1 y
 * se duplica con cada envío aceptado (`initialBatch`/`batchAfter`), y el atraso ya no se manda.
 */
export const INDEXNOW_MAX_NEW_PER_RUN = 25

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * La primera espera después de un 429: un día. Medido el 22/9/2026: tras dos envíos de 3.691 URLs,
 * el tercero (ya de 500) también volvió 429 media hora después. Un deploy más no lo arregla; el
 * estado guarda `blockedUntil` y hasta esa hora no hay POST.
 *
 * Y un día fijo tampoco alcanzó: del 28/10 al 19/11/2026 los 17 POST de 25 URLs volvieron 429, uno
 * por día, siempre las mismas 25. Ahora la espera se duplica con cada 429 seguido (`backoffMs`).
 */
export const INDEXNOW_BACKOFF_MS = DAY_MS
/**
 * A lo sumo un POST aceptado cada 24 h. El umbral del receptor es POR DÍA ("each participating
 * search engine sets its own daily submission thresholds per site", indexnow.org/faq) y el
 * historial lo confirma (con 100 por deploy se aceptaron cinco tandas y la sexta volvió 429),
 * pero el script corre en cada deploy del app, hasta 8 por día. Sin este espacio el arranque lento
 * duplicaría la tanda por DEPLOY (1+2+4+8+16+25 en una tarde) y volvería al 429 el mismo día. Con
 * él la tanda crece una vez por día: 1, 2, 4, 8, 16, 25. Lo recién publicado que espera no se
 * marca como conocido, así que sale al día siguiente con la misma prioridad.
 */
export const INDEXNOW_MIN_GAP_MS = DAY_MS
/** Tope de la espera exponencial: 1, 2, 4, 8 y desde el quinto 429 seguido, 14 días. */
export const INDEXNOW_BACKOFF_MAX_MS = 14 * DAY_MS
/** Tope a lo que pida un `Retry-After`, para que un valor absurdo no apague el envío para siempre. */
export const INDEXNOW_RETRY_AFTER_MAX_MS = 30 * DAY_MS

/**
 * Cuánto callar después del 429 número `strikes` (seguidos): lo mayor entre la espera exponencial y
 * el `Retry-After` del receptor. indexnow.org/faq: "Pause submissions and retry after the time
 * specified in the Retry-After header".
 */
export function backoffMs(strikes, retryAfterMs = null) {
  const n = Number.isInteger(strikes) && strikes > 0 ? strikes : 1
  const exponential = Math.min(INDEXNOW_BACKOFF_MAX_MS, INDEXNOW_BACKOFF_MS * 2 ** (n - 1))
  const hinted =
    typeof retryAfterMs === 'number' && Number.isFinite(retryAfterMs) && retryAfterMs > 0
      ? Math.min(INDEXNOW_RETRY_AFTER_MAX_MS, retryAfterMs)
      : 0
  return Math.max(exponential, hinted)
}

/** `Retry-After` en ms: segundos enteros o una fecha HTTP. `null` si falta, no parsea o ya pasó. */
export function parseRetryAfter(value, nowMs) {
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text) return null
  if (/^\d+$/.test(text)) {
    const ms = Number(text) * 1000
    return ms > 0 ? ms : null
  }
  if (!/[a-z]/i.test(text)) return null
  const at = Date.parse(text)
  const ms = at - nowMs
  return Number.isFinite(ms) && ms > 0 ? ms : null
}

/**
 * La tanda de la próxima corrida, como un arranque lento: después de un 429 arranca en 1 y cada
 * envío aceptado la duplica hasta `cap`; cada 429 la parte al medio. indexnow.org/faq: "each
 * participating search engine sets its own daily submission thresholds per site" — el umbral no se
 * publica y se encuentra así. Medido el 20/11/2026: con la misma clave, 25 URLs daban 429 hacía un
 * mes y 1 URL dio 200 — pero ese POST de 1 salió de OTRA IP que el VPS y un mes después, así que no
 * separa un límite por tamaño de un castigo por IP o por host. Si una tanda de 1 desde el VPS
 * también vuelve 429, la palanca es `INDEXNOW_ENDPOINT` (ver `resolveEndpoint`), no este número.
 * La tanda crece a lo sumo una vez por día (`INDEXNOW_MIN_GAP_MS`).
 * Una tanda que no se llenó (había menos novedades) no achica la siguiente.
 */
export function initialBatch(saved, cap) {
  if (Number.isInteger(saved?.batch)) return Math.min(cap, Math.max(1, saved.batch))
  if (saved?.blockedUntil || saved?.strikes > 0) return 1
  return cap
}

export function batchAfter(accepted, sent, batch, cap) {
  if (accepted) return Math.min(cap, Math.max(1, batch, sent * 2))
  return Math.max(1, Math.floor(sent / 2))
}

/**
 * Qué mandar en esta corrida: las URLs del sitemap que no figuran en el estado guardado (lo que ya
 * se anunció), recortadas al tope. Devuelve también el estado que habría que guardar SI el envío
 * sale bien (lo anunciado antes más lo de ahora), para que un rechazo no marque como anunciado lo
 * que no llegó. Una URL que desaparece del sitemap deja de contar sola como ANUNCIADA, pero sigue
 * en `known`: las fichas de /casa y de catálogo entran y salen del sitemap (200 ↔ 404), y si
 * `known` las olvidara volverían como "recién publicadas" y gastarían la tanda chica re-anunciando
 * páginas que el receptor ya tiene. `known` crece sólo con lo enviado, a lo sumo una tanda por día.
 *
 * Primero va lo RECIÉN PUBLICADO: las URLs que no estaban en ningún sitemap anterior (`known`).
 * Antes iba todo en el orden del sitemap, así que una página publicada hoy esperaba detrás de
 * 3.377 URLs viejas que Bing ya conoce por el sitemap. Lo recién publicado que no entró por el tope
 * NO se marca como conocido, para que siga teniendo prioridad.
 *
 * Con `backlog: false` (lo que usa `runIndexNow` desde el 20/11/2026) lo viejo no se manda NUNCA,
 * ni para llenar la tanda: indexnow.org/faq dice que el protocolo "is not intended for
 * retroactive submission of older changes" y "not designed for submitting every URL on your site
 * at once". Esas URLs Bing las tiene por el sitemap. Sin `known` no hay nada recién publicado.
 */
export function planSubmission(
  urls,
  previous = [],
  cap = INDEXNOW_MAX_NEW_PER_RUN,
  known = null,
  { backlog: withBacklog = true } = {}
) {
  const announced = new Set(previous)
  const fresh = urls.filter(url => !announced.has(url))
  const knownSet = known ? new Set(known) : null
  const brandNew = knownSet ? fresh.filter(url => !knownSet.has(url)) : []
  const older = knownSet ? fresh.filter(url => knownSet.has(url)) : fresh
  const toSend = (withBacklog ? [...brandNew, ...older] : brandNew).slice(0, cap)
  const current = new Set(urls)
  const nextState = [...previous.filter(url => current.has(url)), ...toSend]
  const nextKnown = [...new Set([...(known ?? urls), ...toSend])]
  return {
    toSend,
    pending: fresh.length - toSend.length,
    brandNew: brandNew.length,
    older: older.length,
    nextState,
    nextKnown,
  }
}

/** Una tanda guardada sólo vale si es un entero razonable; lo demás es "no hay tanda guardada". */
const MAX_SAVED_BATCH = 10_000

/**
 * El archivo de estado: `{ submittedAt, urls, known?, blockedUntil?, strikes?, batch?, lastStatus? }`.
 * `urls` es lo anunciado; `known`, todo lo que alguna vez estuvo en el sitemap (`null` si el estado
 * es de antes de que existiera); `strikes`, los 429 seguidos; `batch`, la tanda de la próxima
 * corrida; `submittedAt`, el último POST aceptado (`INDEXNOW_MIN_GAP_MS`). Cualquier cosa ilegible
 * vale "nunca se anunció nada y no hay castigo vigente".
 *
 * Un estado con `blockedUntil` y sin `strikes` es la forma de antes del 20/11/2026, escrita después
 * de un mes de 429 seguidos: cuenta como al menos un 429, así el próximo espera 2 días y no 1.
 */
export function parseState(text) {
  const empty = {
    urls: [],
    known: null,
    blockedUntil: null,
    strikes: 0,
    batch: null,
    submittedAt: null,
  }
  try {
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object') return empty
    const urls = Array.isArray(parsed.urls)
      ? parsed.urls.filter(url => typeof url === 'string')
      : []
    const known = Array.isArray(parsed.known)
      ? parsed.known.filter(url => typeof url === 'string')
      : null
    const blockedUntil =
      typeof parsed.blockedUntil === 'string' && !Number.isNaN(Date.parse(parsed.blockedUntil))
        ? parsed.blockedUntil
        : null
    const strikes =
      Number.isInteger(parsed.strikes) && parsed.strikes >= 0
        ? parsed.strikes
        : blockedUntil
          ? 1
          : empty.strikes
    const batch =
      Number.isInteger(parsed.batch) && parsed.batch >= 1 && parsed.batch <= MAX_SAVED_BATCH
        ? parsed.batch
        : null
    const submittedAt =
      typeof parsed.submittedAt === 'string' && !Number.isNaN(Date.parse(parsed.submittedAt))
        ? parsed.submittedAt
        : null
    return { urls, known, blockedUntil, strikes, batch, submittedAt }
  } catch {
    return empty
  }
}

/**
 * Lee el archivo de estado para el CLI. Sólo "no existe" (`ENOENT`) es un primer deploy y vale
 * `null`; cualquier otro error (permisos, disco) se lanza para que `runIndexNow` aborte sin pisar
 * el archivo y sin perder el castigo vigente.
 */
export function readStateFile(readFile, location) {
  try {
    return readFile(location, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
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

/**
 * El endpoint, mismo orden que la compuerta (entorno, después `.env`). Sólo uno de
 * `INDEXNOW_ENDPOINTS`: cualquier otro valor cae al de siempre y devuelve una `note` para el log.
 * Existe para cambiar de receptor desde el VPS sin desplegar código si api.indexnow.org siguiera
 * contestando 429 a una tanda de 1.
 */
export function resolveEndpoint(env = {}, dotenvText = '') {
  const fromProcess = env?.[INDEXNOW_ENDPOINT_VAR]
  const raw =
    fromProcess !== undefined && fromProcess !== ''
      ? fromProcess
      : readEnvFlag(dotenvText, INDEXNOW_ENDPOINT_VAR)
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value) return { endpoint: INDEXNOW_ENDPOINT, note: null }
  if (INDEXNOW_ENDPOINTS.includes(value)) {
    return {
      endpoint: value,
      note:
        value === INDEXNOW_ENDPOINT ? null : `indexnow: ${INDEXNOW_ENDPOINT_VAR} selects ${value}.`,
    }
  }
  return {
    endpoint: INDEXNOW_ENDPOINT,
    note:
      `indexnow: ${INDEXNOW_ENDPOINT_VAR}=${JSON.stringify(value.slice(0, 120))} is not one of ` +
      `${INDEXNOW_ENDPOINTS.join(', ')}; using ${INDEXNOW_ENDPOINT}.`,
  }
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

/** Lo que el log muestra del cuerpo de un rechazo: una línea, a lo sumo 300 caracteres. */
const REJECTION_BODY_MAX = 300

/**
 * POST de cada tanda. Registra el estado; nunca lanza — un 4xx es un resultado, no una excepción.
 * De un rechazo guarda además el `Retry-After` y el cuerpo: durante un mes de 429 el log decía sólo
 * "HTTP 429" y nadie podía ver qué pedía el receptor.
 */
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
      const ok = res.status === 200 || res.status === 202
      const result = { status: res.status, ok, urls: payload.urlList.length }
      if (!ok) {
        result.retryAfter = null
        result.body = ''
        try {
          const header = res.headers?.get?.('retry-after')
          if (typeof header === 'string' && header.trim()) result.retryAfter = header.trim()
        } catch {
          // Sin cabeceras legibles no hay Retry-After; la espera exponencial alcanza.
        }
        try {
          const text = typeof res.text === 'function' ? await res.text() : ''
          result.body = String(text ?? '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, REJECTION_BODY_MAX)
        } catch {
          // Un cuerpo que no se puede leer no cambia el veredicto.
        }
      }
      results.push(result)
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
 *   status: 'disabled' | 'aborted' | 'backoff' | 'spaced' | 'nothing-new' | 'dry-run' | 'submitted'
 *           | 'rejected'
 *   ('spaced' = hubo un POST aceptado hace menos de `INDEXNOW_MIN_GAP_MS`; no se envía ni se escribe)
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
  // persiste. Sin estado inyectado no hay `known`, así que no se envía nada: sin saber qué estaba
  // antes en el sitemap no se puede saber qué es nuevo.
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
    let saved = parseState('')
    try {
      const text = state && typeof state.read === 'function' ? state.read() : null
      if (text) saved = parseState(text)
    } catch (error) {
      // Un archivo que existe y no se puede leer no es un primer deploy: tratarlo así lo pisaría
      // con un estado vacío y perdería el castigo vigente. No se envía ni se escribe nada.
      const reason = `state unreadable: ${String(error?.message || error)}`
      log(`indexnow: ${reason}; nothing sent, state left as it is.`)
      return { status: 'aborted', reason, ...EMPTY }
    }
    const { urls: previous, known, blockedUntil, strikes } = saved
    if (blockedUntil && Date.parse(blockedUntil) > Date.parse(now())) {
      log(
        `indexnow: backing off after ${strikes || 1} consecutive 429(s) until ${blockedUntil}; no POST.`
      )
      return { status: 'backoff', urls: 0, chunks: 0, responses: [] }
    }
    const { submittedAt } = saved
    const elapsed = submittedAt ? Date.parse(now()) - Date.parse(submittedAt) : Number.NaN
    // Una fecha en el futuro (reloj corrido) no traba el envío: sólo cuenta un pasado reciente.
    if (elapsed >= 0 && elapsed < INDEXNOW_MIN_GAP_MS) {
      log(`indexnow: last accepted POST at ${submittedAt}, under 24 h ago; no POST.`)
      return { status: 'spaced', urls: 0, chunks: 0, responses: [] }
    }
    const writeState = next => {
      if (dryRun || !state || typeof state.write !== 'function') return
      try {
        state.write(JSON.stringify(next))
      } catch (error) {
        log(`indexnow: could not persist state: ${String(error?.message || error)}`)
      }
    }
    if (known === null) {
      // Sin la lista de lo que ya estaba en el sitemap no se puede saber qué es nuevo, y mandar
      // el sitio entero es lo que el receptor castiga: se anota el sitemap de hoy y no se envía.
      log(
        `indexnow: no record of earlier sitemaps; recording today's ${collected.urls.length} URLs as known, announcing none.`
      )
      writeState({
        submittedAt,
        urls: previous,
        known: collected.urls,
        strikes,
        ...(saved.batch ? { batch: saved.batch } : {}),
      })
      return { status: 'nothing-new', urls: 0, chunks: 0, responses: [] }
    }
    const cap = Math.max(1, Math.floor(maxNewPerRun) || INDEXNOW_MAX_NEW_PER_RUN)
    const batch = initialBatch(saved, cap)
    const plan = planSubmission(collected.urls, previous, batch, known, { backlog: false })
    const waitingNew = plan.brandNew - plan.toSend.length
    log(
      `indexnow: ${collected.urls.length} URLs in ${collected.childUrl}, ${previous.length} already announced, ` +
        `${plan.brandNew} first published since the last run, ${plan.toSend.length} to send now to ${endpoint} ` +
        `(batch ${batch}${strikes ? ` after ${strikes} strike(s)` : ''})` +
        (waitingNew > 0 ? `, ${waitingNew} new left for the next deploy` : '') +
        (plan.older ? `; ${plan.older} older URLs not re-announced (sitemap covers them)` : '') +
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
        `indexnow: POST ${response.urls} URLs → HTTP ${response.status}${response.ok ? '' : ' (rejected)'}` +
          (response.error ? ` ${response.error}` : '') +
          (response.retryAfter ? ` retry-after=${response.retryAfter}` : '') +
          (response.body ? ` body=${JSON.stringify(response.body)}` : '')
      )
    }
    const allOk = responses.every(response => response.ok)
    const throttle = responses.find(response => response.status === 429)
    const sent = plan.toSend.length
    if (allOk) {
      // Sólo un envío aceptado marca URLs como anunciadas.
      writeState({
        submittedAt: now(),
        urls: plan.nextState,
        known: plan.nextKnown,
        strikes: 0,
        batch: batchAfter(true, sent, batch, cap),
        lastStatus: responses.at(-1)?.status ?? 200,
      })
    } else if (throttle) {
      // Un 429 no marca nada pero deja escrito hasta cuándo callar y con qué tanda volver. `known`
      // queda como estaba: lo recién publicado que no llegó sigue siendo nuevo la próxima vez.
      const nowMs = Date.parse(now())
      const nextStrikes = strikes + 1
      const wait = backoffMs(nextStrikes, parseRetryAfter(throttle.retryAfter, nowMs))
      const nextBatch = batchAfter(false, sent, batch, cap)
      const until = new Date(nowMs + wait).toISOString()
      log(
        `indexnow: throttled (${nextStrikes} consecutive 429s); silent until ${until}, then batch ${nextBatch}.`
      )
      writeState({
        submittedAt: null,
        urls: previous,
        known,
        blockedUntil: until,
        strikes: nextStrikes,
        batch: nextBatch,
        lastStatus: 429,
      })
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
