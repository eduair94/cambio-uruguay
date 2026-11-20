// IndexNow como módulo puro: parsear el índice, elegir el hijo es-ES, filtrar al apex, partir en
// tandas de 10.000 y armar el JSON. Lo que se pinnea es lo que el protocolo exige y lo que la casa
// exige: host apex, clave = el único archivo <hex>.txt de public/, y "sitemap vacío o caído = no
// enviar nada".
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import {
  CHILD_SITEMAP_SUFFIX,
  INDEXNOW_BACKOFF_MAX_MS,
  INDEXNOW_BACKOFF_MS,
  INDEXNOW_ENDPOINT,
  INDEXNOW_ENDPOINTS,
  INDEXNOW_HOST,
  INDEXNOW_RETRY_AFTER_MAX_MS,
  INDEXNOW_KEY_FILE_PATTERN,
  INDEXNOW_MAX_NEW_PER_RUN,
  INDEXNOW_MAX_URLS_PER_POST,
  INDEXNOW_MIN_GAP_MS,
  SITEMAP_INDEX_URL,
  backoffMs,
  buildPayload,
  chunkUrls,
  collectUrls,
  extractLocs,
  filterApexUrls,
  isEnabled,
  keyLocation,
  parseRetryAfter,
  parseState,
  pickChildSitemap,
  planSubmission,
  readEnvFlag,
  readStateFile,
  resolveEndpoint,
  resolveIndexNowKey,
  runIndexNow,
  submitPayloads,
} from '../../scripts/lib/indexnow.mjs'

const publicDir = resolve(__dirname, '../../public')

// Una clave de juguete para los tests de payload; la real se lee de public/ (ver abajo).
const KEY32 = 'f'.repeat(32)

const INDEX_XML = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://cambio-uruguay.com/__sitemap__/en-US.xml</loc></sitemap>
  <sitemap><loc>https://cambio-uruguay.com/__sitemap__/es-ES.xml</loc><lastmod>2026-09-22</lastmod></sitemap>
  <sitemap><loc>https://cambio-uruguay.com/__sitemap__/pt-PT.xml</loc></sitemap>
  <sitemap><loc>https://cambio-uruguay.com/__sitemap__/rentals-0.xml</loc></sitemap>
</sitemapindex>`

const CHILD_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://cambio-uruguay.com/</loc></url>
  <url><loc>
    https://cambio-uruguay.com/guias/conviene-comprar-dolares-hoy
  </loc></url>
  <url><loc>https://cambio-uruguay.com/convertir?from=USD&amp;to=UYU</loc></url>
  <url><loc>https://cambio-uruguay.com/</loc></url>
  <url><loc>https://www.cambio-uruguay.com/avanzado</loc></url>
  <url><loc>http://cambio-uruguay.com/historico</loc></url>
  <url><loc>https://api.cambio-uruguay.com/api-docs</loc></url>
  <url><loc>https://cambio-uruguay.com/glosario#spread</loc></url>
</urlset>`

const APEX_URLS = [
  'https://cambio-uruguay.com/',
  'https://cambio-uruguay.com/guias/conviene-comprar-dolares-hoy',
  'https://cambio-uruguay.com/convertir?from=USD&to=UYU',
]

type FetchLike = (url: string, init?: { method?: string; body?: string }) => Promise<unknown>

function response(status: number, text = '', headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
  }
}

type FakeResponse = { ok: boolean; status: number; text?: () => Promise<string> }

/** Un fetch de mentira que contesta por URL y recuerda cada llamada. */
function fakeFetch(routes: Record<string, FakeResponse>) {
  const calls: Array<{
    url: string
    init?: { method?: string; body?: string; headers?: Record<string, string> }
  }> = []
  const fetchImpl = vi.fn(
    async (
      url: string,
      init?: { method?: string; body?: string; headers?: Record<string, string> }
    ) => {
      calls.push({ url, init })
      return routes[url] ?? response(404)
    }
  )
  return { fetchImpl: fetchImpl as unknown as FetchLike, calls }
}

const HEALTHY = () =>
  fakeFetch({
    [SITEMAP_INDEX_URL]: response(200, INDEX_XML),
    'https://cambio-uruguay.com/__sitemap__/es-ES.xml': response(200, CHILD_XML),
    [INDEXNOW_ENDPOINT]: response(200),
  })

/** Un sitio de mentira con exactamente estas URLs en el es-ES.xml y este endpoint. */
function site(urls: string[], endpointResponse: FakeResponse = response(200)) {
  const child = `<urlset>${urls.map(url => `<url><loc>${url}</loc></url>`).join('')}</urlset>`
  return fakeFetch({
    [SITEMAP_INDEX_URL]: response(200, INDEX_XML),
    'https://cambio-uruguay.com/__sitemap__/es-ES.xml': response(200, child),
    [INDEXNOW_ENDPOINT]: endpointResponse,
  })
}

/** El estado entre corridas, en memoria: lo que el CLI guarda en app/.data/. */
function memoryState(initial: string | null = null) {
  let text = initial
  return {
    read: vi.fn(() => text),
    write: vi.fn((next: string) => {
      text = next
    }),
    get text() {
      return text
    },
  }
}

/** Un estado que ya conoce un sitemap vacío: todo lo de hoy es recién publicado. */
const freshState = () => memoryState(JSON.stringify({ urls: [], known: [] }))

const DAY = 24 * 60 * 60 * 1000
const plus = (iso: string, ms: number) => new Date(Date.parse(iso) + ms).toISOString()
const postedUrls = (calls: ReturnType<typeof fakeFetch>['calls']) =>
  calls
    .filter(call => call.url === INDEXNOW_ENDPOINT)
    .flatMap(call => JSON.parse(call.init!.body!).urlList as string[])

describe('protocol constants', () => {
  it('uses the bare apex host, the public endpoint and the 10k limit', () => {
    expect(INDEXNOW_HOST).toBe('cambio-uruguay.com')
    expect(INDEXNOW_ENDPOINT).toBe('https://api.indexnow.org/indexnow')
    expect(INDEXNOW_MAX_URLS_PER_POST).toBe(10_000)
    expect(SITEMAP_INDEX_URL).toBe('https://cambio-uruguay.com/sitemap_index.xml')
    expect(CHILD_SITEMAP_SUFFIX).toBe('es-ES.xml')
  })
})

describe('the key file in public/ is the single source of truth', () => {
  it('public/ holds exactly one <hex>.txt whose content is its own name, without a newline', () => {
    const resolved = resolveIndexNowKey({
      fileNames: readdirSync(publicDir),
      readFile: name => readFileSync(join(publicDir, name), 'utf8'),
    })
    expect(resolved.ok, (resolved as { reason?: string }).reason).toBe(true)
    const { key, name } = resolved as { key: string; name: string }
    expect(key).toMatch(/^[0-9a-f]{32}$/)
    expect(name).toBe(`${key}.txt`)
    expect(readFileSync(join(publicDir, name), 'utf8')).toBe(key)
    expect(keyLocation(INDEXNOW_HOST, key)).toBe(`https://cambio-uruguay.com/${key}.txt`)
  })

  it('rejects zero, several, unreadable or mismatching key files', () => {
    const readFile = (name: string) => name.replace(/\.txt$/, '')
    expect(resolveIndexNowKey({ fileNames: ['llms.txt', 'robots.txt'], readFile })).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/no <hex>\.txt/),
    })
    expect(
      resolveIndexNowKey({ fileNames: [`${KEY32}.txt`, `${'e'.repeat(32)}.txt`], readFile })
    ).toMatchObject({ ok: false, reason: expect.stringMatching(/more than one/) })
    expect(
      resolveIndexNowKey({ fileNames: [`${KEY32}.txt`], readFile: () => `${KEY32}\n` })
    ).toMatchObject({ ok: false, reason: expect.stringMatching(/exactly its own name/) })
    expect(
      resolveIndexNowKey({
        fileNames: [`${KEY32}.txt`],
        readFile: () => {
          throw new Error('EACCES')
        },
      })
    ).toMatchObject({ ok: false, reason: expect.stringMatching(/EACCES/) })
    expect(resolveIndexNowKey({ fileNames: [`${KEY32}.txt`, 'llms.txt'], readFile })).toEqual({
      ok: true,
      name: `${KEY32}.txt`,
      key: KEY32,
    })
    // Sólo hex minúsculas y .txt: ni mayúsculas, ni otra extensión, ni menos de 8.
    expect(INDEXNOW_KEY_FILE_PATTERN.test('ABCDEF0123456789.txt')).toBe(false)
    expect(INDEXNOW_KEY_FILE_PATTERN.test('abcdef0123456789.json')).toBe(false)
    expect(INDEXNOW_KEY_FILE_PATTERN.test('abcdef0.txt')).toBe(false)
    expect(INDEXNOW_KEY_FILE_PATTERN.test('abcdef01.txt')).toBe(true)
  })
})

describe('sitemap parsing', () => {
  it('extracts every <loc>, trimmed and entity-decoded, in order', () => {
    expect(extractLocs(CHILD_XML)).toEqual([
      'https://cambio-uruguay.com/',
      'https://cambio-uruguay.com/guias/conviene-comprar-dolares-hoy',
      'https://cambio-uruguay.com/convertir?from=USD&to=UYU',
      'https://cambio-uruguay.com/',
      'https://www.cambio-uruguay.com/avanzado',
      'http://cambio-uruguay.com/historico',
      'https://api.cambio-uruguay.com/api-docs',
      'https://cambio-uruguay.com/glosario#spread',
    ])
    expect(extractLocs('')).toEqual([])
    expect(extractLocs('<loc>   </loc>')).toEqual([])
    expect(extractLocs(undefined as unknown as string)).toEqual([])
  })

  it('picks the es-ES child from the index, never en-US, pt-PT or rentals', () => {
    expect(pickChildSitemap(INDEX_XML)).toBe('https://cambio-uruguay.com/__sitemap__/es-ES.xml')
    expect(pickChildSitemap(INDEX_XML.replace('es-ES.xml', 'es-AR.xml'))).toBeNull()
    expect(pickChildSitemap('<sitemapindex></sitemapindex>')).toBeNull()
  })
})

describe('url hygiene', () => {
  it('keeps only https apex URLs, de-duplicated, and reports what it dropped', () => {
    const { kept, dropped } = filterApexUrls(extractLocs(CHILD_XML))
    expect(kept).toEqual(APEX_URLS)
    expect(dropped).toEqual([
      'https://www.cambio-uruguay.com/avanzado',
      'http://cambio-uruguay.com/historico',
      'https://api.cambio-uruguay.com/api-docs',
      'https://cambio-uruguay.com/glosario#spread',
    ])
    expect(filterApexUrls(['not a url']).dropped).toEqual(['not a url'])
  })

  it('chunks at the protocol limit', () => {
    const many = Array.from(
      { length: INDEXNOW_MAX_URLS_PER_POST + 1 },
      (_, i) => `https://cambio-uruguay.com/p${i}`
    )
    const chunks = chunkUrls(many)
    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toHaveLength(INDEXNOW_MAX_URLS_PER_POST)
    expect(chunks[1]).toEqual([`https://cambio-uruguay.com/p${INDEXNOW_MAX_URLS_PER_POST}`])
    expect(chunkUrls([])).toEqual([])
    expect(chunkUrls(['a', 'b', 'c'], 2)).toEqual([['a', 'b'], ['c']])
  })

  it('builds the payload with host, key, keyLocation and every URL on that host', () => {
    const payload = buildPayload(APEX_URLS, { key: KEY32 })
    expect(payload).toEqual({
      host: 'cambio-uruguay.com',
      key: KEY32,
      keyLocation: `https://cambio-uruguay.com/${KEY32}.txt`,
      urlList: APEX_URLS,
    })
    for (const url of payload.urlList) expect(new URL(url).hostname).toBe(payload.host)
    expect(payload.urlList).not.toBe(APEX_URLS)
    expect(() => buildPayload(APEX_URLS)).toThrow(/key/)
  })
})

describe('the INDEXNOW_ENABLED gate', () => {
  it('reads the flag from the process env first, then from a .env text', () => {
    expect(isEnabled({ INDEXNOW_ENABLED: '1' })).toBe(true)
    expect(isEnabled({ INDEXNOW_ENABLED: '0' }, 'INDEXNOW_ENABLED=1')).toBe(false)
    expect(isEnabled({}, 'INDEXNOW_ENABLED=1')).toBe(true)
    expect(isEnabled({}, '')).toBe(false)
    expect(isEnabled({ INDEXNOW_ENABLED: '' }, 'INDEXNOW_ENABLED="1"')).toBe(true)
    expect(isEnabled({ INDEXNOW_ENABLED: 'true' })).toBe(false)
  })

  it('parses .env lines with quotes, export and trailing comments', () => {
    const text = [
      '# comentario',
      'OTHER=abc',
      "export INDEXNOW_ENABLED='1' # habilitado 2026-09-22",
      'INDEXNOW_ENABLED=0',
    ].join('\r\n')
    expect(readEnvFlag(text, 'INDEXNOW_ENABLED')).toBe('1')
    expect(readEnvFlag('INDEXNOW_ENABLED=1 # comment', 'INDEXNOW_ENABLED')).toBe('1')
    expect(readEnvFlag('X=1', 'INDEXNOW_ENABLED')).toBeUndefined()
    expect(readEnvFlag(undefined as unknown as string, 'INDEXNOW_ENABLED')).toBeUndefined()
  })

  it('performs zero network calls when disabled', async () => {
    const { fetchImpl, calls } = HEALTHY()
    const log = vi.fn()
    const result = await runIndexNow({
      fetch: fetchImpl,
      env: {},
      argv: [],
      dotenvText: '',
      key: KEY32,
      log,
    })
    expect(result.status).toBe('disabled')
    expect(calls).toEqual([])
    expect(log).toHaveBeenCalledWith(expect.stringContaining('INDEXNOW_ENABLED'))
  })
})

describe('collectUrls: abort on anything that is not a healthy, non-empty es-ES sitemap', () => {
  it('returns the apex URLs from the es-ES child when everything answers', async () => {
    const { fetchImpl, calls } = HEALTHY()
    const result = await collectUrls({ fetch: fetchImpl })
    expect(result).toMatchObject({
      ok: true,
      childUrl: 'https://cambio-uruguay.com/__sitemap__/es-ES.xml',
      urls: APEX_URLS,
    })
    expect(calls.map(call => call.url)).toEqual([
      SITEMAP_INDEX_URL,
      'https://cambio-uruguay.com/__sitemap__/es-ES.xml',
    ])
  })

  it.each([
    ['index answers 503', { [SITEMAP_INDEX_URL]: response(503) }, /HTTP 503/],
    [
      'index lists no es-ES child',
      { [SITEMAP_INDEX_URL]: response(200, INDEX_XML.replace('es-ES.xml', 'es-AR.xml')) },
      /no child/,
    ],
    [
      'child answers 500',
      {
        [SITEMAP_INDEX_URL]: response(200, INDEX_XML),
        'https://cambio-uruguay.com/__sitemap__/es-ES.xml': response(500),
      },
      /HTTP 500/,
    ],
    [
      'child is empty',
      {
        [SITEMAP_INDEX_URL]: response(200, INDEX_XML),
        'https://cambio-uruguay.com/__sitemap__/es-ES.xml': response(200, '<urlset></urlset>'),
      },
      /no <loc>/,
    ],
    [
      'child has only off-host URLs',
      {
        [SITEMAP_INDEX_URL]: response(200, INDEX_XML),
        'https://cambio-uruguay.com/__sitemap__/es-ES.xml': response(
          200,
          '<urlset><url><loc>https://www.cambio-uruguay.com/</loc></url></urlset>'
        ),
      },
      /no URL/,
    ],
  ])('%s → nothing to submit', async (_label, routes, reason) => {
    const { fetchImpl } = fakeFetch(routes)
    const result = await collectUrls({ fetch: fetchImpl })
    expect(result.ok).toBe(false)
    expect((result as { reason: string }).reason).toMatch(reason)
  })
})

describe('runIndexNow end to end (fetch injected)', () => {
  const ENABLED = { INDEXNOW_ENABLED: '1' }

  it('POSTs one JSON payload per chunk to the endpoint when enabled', async () => {
    const { fetchImpl, calls } = HEALTHY()
    const log = vi.fn()
    const result = await runIndexNow({
      fetch: fetchImpl,
      env: ENABLED,
      argv: [],
      key: KEY32,
      log,
      state: freshState(),
    })
    expect(result).toMatchObject({ status: 'submitted', urls: 3, chunks: 1 })
    const post = calls.find(call => call.url === INDEXNOW_ENDPOINT)!
    expect(post.init?.method).toBe('POST')
    expect(post.init?.headers?.['content-type']).toMatch(/^application\/json/)
    expect(JSON.parse(post.init!.body!)).toEqual(buildPayload(APEX_URLS, { key: KEY32 }))
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/POST 3 URLs → HTTP 200/))
  })

  it('POSTs to the endpoint it is given (the allowlisted Bing one included)', async () => {
    const bing = 'https://www.bing.com/indexnow'
    const { fetchImpl, calls } = fakeFetch({
      [SITEMAP_INDEX_URL]: response(200, INDEX_XML),
      'https://cambio-uruguay.com/__sitemap__/es-ES.xml': response(200, CHILD_XML),
      [bing]: response(202),
    })
    const result = await runIndexNow({
      fetch: fetchImpl,
      env: ENABLED,
      key: KEY32,
      log: vi.fn(),
      state: freshState(),
      endpoint: bing,
    })
    expect(result.status).toBe('submitted')
    expect(calls.filter(call => call.init?.method === 'POST').map(call => call.url)).toEqual([bing])
  })

  it('--dry-run reads the sitemaps but never POSTs', async () => {
    const { fetchImpl, calls } = HEALTHY()
    const result = await runIndexNow({
      fetch: fetchImpl,
      env: {},
      argv: ['--dry-run'],
      key: KEY32,
      log: vi.fn(),
      state: freshState(),
    })
    expect(result).toMatchObject({ status: 'dry-run', urls: 3, chunks: 1 })
    expect(calls.some(call => call.url === INDEXNOW_ENDPOINT)).toBe(false)
    expect(calls.every(call => !call.init?.method || call.init.method === 'GET')).toBe(true)
  })

  it('aborts without a POST when the sitemap is down or empty', async () => {
    const { fetchImpl, calls } = fakeFetch({ [SITEMAP_INDEX_URL]: response(503) })
    const result = await runIndexNow({
      fetch: fetchImpl,
      env: ENABLED,
      argv: [],
      key: KEY32,
      log: vi.fn(),
      state: freshState(),
    })
    expect(result).toMatchObject({ status: 'aborted', urls: 0 })
    expect(calls.some(call => call.url === INDEXNOW_ENDPOINT)).toBe(false)
  })

  it('aborts before any network call when no key was resolved', async () => {
    const { fetchImpl, calls } = HEALTHY()
    const result = await runIndexNow({ fetch: fetchImpl, env: ENABLED, argv: [], log: vi.fn() })
    expect(result).toMatchObject({ status: 'aborted', reason: 'no key' })
    expect(calls).toEqual([])
  })

  it('reports a 4xx as rejected, with its body, and never throws', async () => {
    const { fetchImpl } = fakeFetch({
      [SITEMAP_INDEX_URL]: response(200, INDEX_XML),
      'https://cambio-uruguay.com/__sitemap__/es-ES.xml': response(200, CHILD_XML),
      [INDEXNOW_ENDPOINT]: response(422, '  {"code":"InvalidRequestParameters"}\n'),
    })
    const log = vi.fn()
    const result = await runIndexNow({
      fetch: fetchImpl,
      env: ENABLED,
      argv: [],
      key: KEY32,
      log,
      state: freshState(),
    })
    expect(result.status).toBe('rejected')
    expect(result.responses).toEqual([
      {
        status: 422,
        ok: false,
        urls: 3,
        retryAfter: null,
        body: '{"code":"InvalidRequestParameters"}',
      },
    ])
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/HTTP 422 \(rejected\).*Invalid/))
  })

  it('treats 202 as accepted', async () => {
    const { fetchImpl } = fakeFetch({
      [SITEMAP_INDEX_URL]: response(200, INDEX_XML),
      'https://cambio-uruguay.com/__sitemap__/es-ES.xml': response(200, CHILD_XML),
      [INDEXNOW_ENDPOINT]: response(202),
    })
    const state = freshState()
    const result = await runIndexNow({
      fetch: fetchImpl,
      env: ENABLED,
      argv: [],
      key: KEY32,
      log: vi.fn(),
      state,
    })
    expect(result.status).toBe('submitted')
    expect(JSON.parse(state.text!).lastStatus).toBe(202)
  })

  it('swallows a fetch that throws (network down) and reports aborted', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('ENOTFOUND api.indexnow.org')
    }) as unknown as FetchLike
    const log = vi.fn()
    await expect(
      runIndexNow({ fetch: fetchImpl, env: ENABLED, argv: [], key: KEY32, log })
    ).resolves.toMatchObject({ status: 'aborted' })
    expect(log).toHaveBeenCalledWith(expect.stringContaining('ENOTFOUND'))
    const submitted = await submitPayloads({
      fetch: fetchImpl,
      payloads: [buildPayload(APEX_URLS, { key: KEY32 })],
    })
    expect(submitted[0]).toMatchObject({ status: 0, ok: false, urls: 3 })
  })

  it('aborts without a fetch implementation instead of crashing (never reaches the network)', async () => {
    const result = await runIndexNow({
      fetch: undefined,
      env: ENABLED,
      argv: [],
      key: KEY32,
      log: vi.fn(),
    })
    expect(result.status).toBe('aborted')
  })

  it('a rejection without headers or text() does not throw', async () => {
    const bare = { ok: false, status: 429 }
    const submitted = await submitPayloads({
      fetch: (async () => bare) as unknown as FetchLike,
      payloads: [buildPayload(APEX_URLS, { key: KEY32 })],
    })
    expect(submitted).toEqual([{ status: 429, ok: false, urls: 3, retryAfter: null, body: '' }])
  })
})

describe('INDEXNOW_ENDPOINT: only the two endpoints indexnow.org names', () => {
  it('lists api.indexnow.org first (the default) and bing.com', () => {
    expect(INDEXNOW_ENDPOINTS).toEqual([
      'https://api.indexnow.org/indexnow',
      'https://www.bing.com/indexnow',
    ])
    expect(INDEXNOW_ENDPOINTS[0]).toBe(INDEXNOW_ENDPOINT)
  })

  it('reads the process env first, then .env, and never posts the key to another host', () => {
    expect(resolveEndpoint({}, '')).toEqual({ endpoint: INDEXNOW_ENDPOINT, note: null })
    expect(resolveEndpoint({}, 'INDEXNOW_ENDPOINT=https://www.bing.com/indexnow').endpoint).toBe(
      'https://www.bing.com/indexnow'
    )
    expect(
      resolveEndpoint(
        { INDEXNOW_ENDPOINT: 'https://api.indexnow.org/indexnow' },
        'INDEXNOW_ENDPOINT=https://www.bing.com/indexnow'
      )
    ).toEqual({ endpoint: INDEXNOW_ENDPOINT, note: null })
    const bing = resolveEndpoint({ INDEXNOW_ENDPOINT: ' https://www.bing.com/indexnow ' })
    expect(bing.endpoint).toBe('https://www.bing.com/indexnow')
    expect(bing.note).toMatch(/bing\.com/)
    const evil = resolveEndpoint({ INDEXNOW_ENDPOINT: 'https://collector.example/indexnow' })
    expect(evil.endpoint).toBe(INDEXNOW_ENDPOINT)
    expect(evil.note).toMatch(/not one of/)
    // http:// del mismo host tampoco: la clave no viaja en claro.
    expect(resolveEndpoint({ INDEXNOW_ENDPOINT: 'http://www.bing.com/indexnow' }).endpoint).toBe(
      INDEXNOW_ENDPOINT
    )
    expect(resolveEndpoint(undefined as unknown as Record<string, string>).endpoint).toBe(
      INDEXNOW_ENDPOINT
    )
  })
})

// Medido el 22/9/2026: dos deploys seguidos mandaron las 3.691 URLs del sitemap en un POST y
// api.indexnow.org contestó 429 ("potential spam") las dos veces. Desde entonces se anuncia sólo
// lo que no se anunció antes, y un rechazo no marca nada. Y del 28/10 al 19/11/2026 los 17 POST de
// 25 URLs volvieron 429 mientras uno de 1 URL con la misma clave contestaba 200: desde el 20/11 se
// anuncia sólo lo RECIÉN publicado, la tanda arranca en 1 después de un 429 y crece al doble con
// cada envío aceptado, y la espera tras un 429 crece (1, 2, 4, 8, 14 días) o sigue el Retry-After.
describe('only what is new, capped per run, remembered between deploys', () => {
  const ENABLED = { INDEXNOW_ENABLED: '1' }

  it('planSubmission sends only unseen URLs, keeps sitemap order and caps the batch', () => {
    const urls = ['a', 'b', 'c', 'd']
    expect(planSubmission(urls, ['b'], 2)).toEqual({
      toSend: ['a', 'c'],
      pending: 1,
      brandNew: 0,
      older: 3,
      nextState: ['b', 'a', 'c'],
      // Sin `known` previo: la corrida arma el conocido con el sitemap entero.
      nextKnown: ['a', 'b', 'c', 'd'],
    })
    // Una URL que ya no está en el sitemap sale del estado sola.
    expect(planSubmission(['a'], ['zz', 'a']).nextState).toEqual(['a'])
    expect(INDEXNOW_MAX_NEW_PER_RUN).toBeLessThan(INDEXNOW_MAX_URLS_PER_POST)
  })

  // 19/10/2026: una página publicada hoy esperaba detrás de 3.377 URLs viejas que Bing ya conoce.
  it('planSubmission puts URLs first published since the last run ahead of the backlog', () => {
    const urls = ['old1', 'old2', 'old3', 'nueva-a', 'nueva-b']
    const plan = planSubmission(urls, [], 3, ['old1', 'old2', 'old3'])
    expect(plan.toSend).toEqual(['nueva-a', 'nueva-b', 'old1'])
    expect(plan.brandNew).toBe(2)
    // Lo nuevo que no entró por el tope no pasa a "conocido": sigue adelante la próxima vez.
    const tight = planSubmission(urls, [], 1, ['old1', 'old2', 'old3'])
    expect(tight.toSend).toEqual(['nueva-a'])
    expect(tight.nextKnown).toEqual(['old1', 'old2', 'old3', 'nueva-a'])
    expect(planSubmission(urls, ['nueva-a'], 1, tight.nextKnown).toSend).toEqual(['nueva-b'])
  })

  // 20/11/2026: 166 URLs conocidas no estaban en es-ES.xml (fichas de /casa, sillas, celulares que
  // entran y salen del sitemap). Si `known` las olvidara, al volver gastarían la tanda chica.
  it('planSubmission keeps a URL that left the sitemap in known, so its return is not brand-new', () => {
    const gone = planSubmission(['a'], ['a', 'casa-1'], 5, ['a', 'casa-1'], { backlog: false })
    expect(gone.nextState).toEqual(['a'])
    expect(gone.nextKnown).toEqual(['a', 'casa-1'])
    const back = planSubmission(['a', 'casa-1'], gone.nextState, 5, gone.nextKnown, {
      backlog: false,
    })
    expect(back.toSend).toEqual([])
    expect(back.brandNew).toBe(0)
    expect(back.older).toBe(1)
  })

  // indexnow.org/faq: "It is not intended for retroactive submission of older changes".
  it('planSubmission with backlog: false never sends an older URL, not even to fill the batch', () => {
    const urls = ['old1', 'old2', 'old3', 'nueva-a']
    const plan = planSubmission(urls, [], 3, ['old1', 'old2', 'old3'], { backlog: false })
    expect(plan.toSend).toEqual(['nueva-a'])
    expect(plan.older).toBe(3)
    expect(plan.nextKnown).toEqual(['old1', 'old2', 'old3', 'nueva-a'])
    expect(planSubmission(urls, [], 3, null, { backlog: false }).toSend).toEqual([])
  })

  it('parseState tolerates garbage and only keeps valid fields', () => {
    const empty = {
      urls: [],
      known: null,
      blockedUntil: null,
      strikes: 0,
      batch: null,
      submittedAt: null,
    }
    expect(parseState('not json')).toEqual(empty)
    expect(parseState('{"urls":"x"}')).toEqual(empty)
    expect(parseState('{"urls":["a",1,"b"],"blockedUntil":"garbage"}')).toEqual({
      ...empty,
      urls: ['a', 'b'],
    })
    expect(parseState('{"urls":[],"known":["a",2]}').known).toEqual(['a'])
    expect(parseState('{"urls":[],"blockedUntil":"2026-09-23T22:28:00.000Z"}').blockedUntil).toBe(
      '2026-09-23T22:28:00.000Z'
    )
    expect(parseState('{"strikes":3,"batch":4}')).toMatchObject({ strikes: 3, batch: 4 })
    // La forma de antes del 20/11/2026: castigo vigente sin `strikes` cuenta como un 429.
    expect(parseState('{"blockedUntil":"2026-11-20T06:05:25.958Z"}').strikes).toBe(1)
    expect(parseState('{"blockedUntil":"2026-11-20T06:05:25.958Z","strikes":0}').strikes).toBe(0)
    expect(parseState('{"submittedAt":"2026-11-20T07:00:00.000Z"}').submittedAt).toBe(
      '2026-11-20T07:00:00.000Z'
    )
    for (const bad of ['"garbage"', '12', 'null']) {
      expect(parseState(`{"submittedAt":${bad}}`).submittedAt).toBeNull()
    }
    for (const bad of ['-1', '1.5', '"2"', 'null']) {
      expect(parseState(`{"strikes":${bad}}`).strikes).toBe(0)
    }
    for (const bad of ['0', '-3', '2.5', '"4"', '10001']) {
      expect(parseState(`{"batch":${bad}}`).batch).toBeNull()
    }
  })

  it('backoffMs doubles per strike from one day, caps at 14, and lets a longer Retry-After win up to 30', () => {
    expect(INDEXNOW_BACKOFF_MS).toBe(DAY)
    expect(INDEXNOW_BACKOFF_MAX_MS).toBe(14 * DAY)
    expect(INDEXNOW_RETRY_AFTER_MAX_MS).toBe(30 * DAY)
    expect([1, 2, 3, 4, 5, 6, 40].map(strikes => backoffMs(strikes) / DAY)).toEqual([
      1, 2, 4, 8, 14, 14, 14,
    ])
    expect(backoffMs(0)).toBe(DAY)
    expect(backoffMs(1, 3_600_000)).toBe(DAY)
    expect(backoffMs(1, 10 * DAY)).toBe(10 * DAY)
    expect(backoffMs(5, 99 * DAY)).toBe(30 * DAY)
    expect(backoffMs(2, Number.NaN)).toBe(2 * DAY)
  })

  it('parseRetryAfter reads integer seconds or an HTTP-date, and ignores the rest', () => {
    const nowMs = Date.parse('2026-11-20T06:00:00.000Z')
    expect(parseRetryAfter('3600', nowMs)).toBe(3_600_000)
    expect(parseRetryAfter(' 120 ', nowMs)).toBe(120_000)
    expect(parseRetryAfter('Fri, 20 Nov 2026 07:00:00 GMT', nowMs)).toBe(3_600_000)
    expect(parseRetryAfter('Fri, 20 Nov 2026 05:00:00 GMT', nowMs)).toBeNull()
    expect(parseRetryAfter('0', nowMs)).toBeNull()
    expect(parseRetryAfter('-5', nowMs)).toBeNull()
    expect(parseRetryAfter('soon', nowMs)).toBeNull()
    expect(parseRetryAfter('', nowMs)).toBeNull()
    expect(parseRetryAfter(null, nowMs)).toBeNull()
  })

  it('without a list of known URLs it announces nothing and records today’s sitemap as known', async () => {
    const { fetchImpl, calls } = HEALTHY()
    const state = memoryState()
    const result = await runIndexNow({
      fetch: fetchImpl,
      env: ENABLED,
      key: KEY32,
      log: vi.fn(),
      state,
    })
    expect(result.status).toBe('nothing-new')
    expect(calls.some(call => call.url === INDEXNOW_ENDPOINT)).toBe(false)
    expect(JSON.parse(state.text!)).toEqual({
      submittedAt: null,
      urls: [],
      known: APEX_URLS,
      strikes: 0,
    })
    // El deploy siguiente manda sólo lo publicado después.
    const nueva = 'https://cambio-uruguay.com/nueva'
    const next = site([...APEX_URLS, nueva])
    const second = await runIndexNow({
      fetch: next.fetchImpl,
      env: ENABLED,
      key: KEY32,
      log: vi.fn(),
      state,
    })
    expect(second).toMatchObject({ status: 'submitted', urls: 1 })
    expect(postedUrls(next.calls)).toEqual([nueva])
    // Sin estado inyectado tampoco hay POST: no se puede saber qué es nuevo.
    const stateless = HEALTHY()
    expect(
      (await runIndexNow({ fetch: stateless.fetchImpl, env: ENABLED, key: KEY32, log: vi.fn() }))
        .status
    ).toBe('nothing-new')
    expect(stateless.calls.some(call => call.url === INDEXNOW_ENDPOINT)).toBe(false)
    // Y un dry-run sin conocidos no escribe nada.
    const dry = memoryState()
    await runIndexNow({
      fetch: HEALTHY().fetchImpl,
      argv: ['--dry-run'],
      key: KEY32,
      log: vi.fn(),
      state: dry,
    })
    expect(dry.write).not.toHaveBeenCalled()
  })

  it('never POSTs the backlog (known but never announced) and says why', async () => {
    const { fetchImpl, calls } = HEALTHY()
    const state = memoryState(JSON.stringify({ urls: [], known: APEX_URLS }))
    const log = vi.fn()
    const result = await runIndexNow({ fetch: fetchImpl, env: ENABLED, key: KEY32, log, state })
    expect(result.status).toBe('nothing-new')
    expect(calls.some(call => call.url === INDEXNOW_ENDPOINT)).toBe(false)
    expect(state.write).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/3 older URLs not re-announced/))
  })

  it('a later run sends only what is new and unannounced, and a full state means no POST', async () => {
    const { fetchImpl, calls } = HEALTHY()
    const state = memoryState(JSON.stringify({ urls: [], known: APEX_URLS.slice(0, 2) }))
    const result = await runIndexNow({
      fetch: fetchImpl,
      env: ENABLED,
      argv: [],
      key: KEY32,
      log: vi.fn(),
      state,
      now: () => '2026-09-22T22:00:00.000Z',
    })
    expect(result).toMatchObject({ status: 'submitted', urls: 1 })
    expect(postedUrls(calls)).toEqual([APEX_URLS[2]])
    expect(JSON.parse(state.text!)).toEqual({
      submittedAt: '2026-09-22T22:00:00.000Z',
      urls: [APEX_URLS[2]],
      known: APEX_URLS,
      strikes: 0,
      batch: INDEXNOW_MAX_NEW_PER_RUN,
      lastStatus: 200,
    })

    const again = HEALTHY()
    const nothing = await runIndexNow({
      fetch: again.fetchImpl,
      env: ENABLED,
      argv: [],
      key: KEY32,
      log: vi.fn(),
      state,
    })
    expect(nothing.status).toBe('nothing-new')
    expect(again.calls.some(call => call.url === INDEXNOW_ENDPOINT)).toBe(false)
  })

  it('every 429 doubles the silence (1, 2, 4, 8, 14, 14 days), halves the batch, and no POST while blocked', async () => {
    const urls = Array.from({ length: 6 }, (_, i) => `https://cambio-uruguay.com/n${i}`)
    const state = memoryState(JSON.stringify({ urls: [], known: [] }))
    let at = '2026-11-01T00:00:00.000Z'
    const sent: number[] = []
    for (const days of [1, 2, 4, 8, 14, 14]) {
      const throttled = site(urls, response(429))
      const result = await runIndexNow({
        fetch: throttled.fetchImpl,
        env: ENABLED,
        key: KEY32,
        log: vi.fn(),
        state,
        now: () => at,
      })
      expect(result.status).toBe('rejected')
      sent.push(postedUrls(throttled.calls).length)
      const saved = JSON.parse(state.text!)
      expect(saved.blockedUntil).toBe(plus(at, days * DAY))
      expect(saved).toMatchObject({ submittedAt: null, urls: [], known: [], lastStatus: 429 })
      // Un minuto antes de que venza: ni un pedido al endpoint.
      const early = site(urls)
      const blocked = await runIndexNow({
        fetch: early.fetchImpl,
        env: ENABLED,
        key: KEY32,
        log: vi.fn(),
        state,
        now: () => plus(at, days * DAY - 60_000),
      })
      expect(blocked.status).toBe('backoff')
      expect(early.calls.some(call => call.url === INDEXNOW_ENDPOINT)).toBe(false)
      at = plus(at, days * DAY)
    }
    // Arranca en el tope (6 URLs < 25), después floor(6/2) = 3, 1 y se queda en 1.
    expect(sent).toEqual([6, 3, 1, 1, 1, 1])
    expect(JSON.parse(state.text!)).toMatchObject({ strikes: 6, batch: 1 })
    // Aceptado al fin: castigo limpio, strikes a cero, la tanda dobla.
    const ok = site(urls)
    const accepted = await runIndexNow({
      fetch: ok.fetchImpl,
      env: ENABLED,
      key: KEY32,
      log: vi.fn(),
      state,
      now: () => at,
    })
    expect(accepted.status).toBe('submitted')
    const saved = JSON.parse(state.text!)
    expect(saved.blockedUntil).toBeUndefined()
    expect(saved).toMatchObject({ strikes: 0, batch: 2, lastStatus: 200, urls: [urls[0]] })
  })

  it('a Retry-After longer than the exponential wait wins, in seconds or as an HTTP-date, capped at 30 days', async () => {
    const at = '2026-11-20T06:00:00.000Z'
    const cases: Array<[Record<string, string>, number]> = [
      [{ 'retry-after': String(10 * 24 * 3600) }, 10 * DAY],
      [{ 'retry-after': new Date(Date.parse(at) + 20 * DAY).toUTCString() }, 20 * DAY],
      [{ 'retry-after': String(400 * 24 * 3600) }, 30 * DAY],
      [{ 'retry-after': '60' }, DAY],
      [{}, DAY],
    ]
    for (const [headers, wait] of cases) {
      const state = freshState()
      const log = vi.fn()
      await runIndexNow({
        fetch: site(APEX_URLS, response(429, 'Too Many Requests', headers)).fetchImpl,
        env: ENABLED,
        key: KEY32,
        log,
        state,
        now: () => at,
      })
      expect(JSON.parse(state.text!).blockedUntil).toBe(plus(at, wait))
      if (headers['retry-after']) {
        expect(log).toHaveBeenCalledWith(
          expect.stringContaining(`retry-after=${headers['retry-after']}`)
        )
      }
      expect(log).toHaveBeenCalledWith(expect.stringContaining('body="Too Many Requests"'))
    }
  })

  // El estado de producción el 20/11/2026: `blockedUntil` de un 429 de 25 URLs, sin `batch` ni
  // `strikes`. Vencido el castigo, la primera tanda es de UNA URL.
  it('a production-shaped state (blockedUntil, no batch) sends exactly one URL once the block expires', async () => {
    const old = Array.from({ length: 8 }, (_, i) => `https://cambio-uruguay.com/vieja-${i}`)
    const fresh = Array.from({ length: 40 }, (_, i) => `https://cambio-uruguay.com/nueva-${i}`)
    const state = memoryState(
      JSON.stringify({
        submittedAt: null,
        urls: old.slice(0, 5),
        known: old,
        blockedUntil: '2026-11-20T06:05:25.958Z',
      })
    )
    const before = site([...old, ...fresh])
    expect(
      (
        await runIndexNow({
          fetch: before.fetchImpl,
          env: ENABLED,
          key: KEY32,
          log: vi.fn(),
          state,
          now: () => '2026-11-20T06:00:00.000Z',
        })
      ).status
    ).toBe('backoff')
    expect(before.calls.some(call => call.url === INDEXNOW_ENDPOINT)).toBe(false)

    // Cada deploy aceptado dobla la tanda hasta el tope: 1, 2, 4, 8, 16 y 25 entraría con más URLs.
    const sizes: number[] = []
    const logs: string[] = []
    for (let run = 0; run < 6; run++) {
      const deploy = site([...old, ...fresh])
      await runIndexNow({
        fetch: deploy.fetchImpl,
        env: ENABLED,
        key: KEY32,
        log: (line: string) => logs.push(line),
        state,
        now: () => plus('2026-11-20T07:00:00.000Z', run * DAY),
      })
      sizes.push(postedUrls(deploy.calls).length)
    }
    expect(sizes).toEqual([1, 2, 4, 8, 16, 9])
    expect(logs[0]).toMatch(/batch 1/)
    const saved = JSON.parse(state.text!)
    // Las 3 viejas nunca anunciadas no se mandaron: el sitemap las cubre.
    expect(saved.urls).toEqual([...old.slice(0, 5), ...fresh])
    expect(saved).toMatchObject({ strikes: 0, batch: INDEXNOW_MAX_NEW_PER_RUN })
  })

  // Un mes de 429 seguidos sin `strikes` guardado: el primer 429 de la tanda de 1 espera 2 días, no 1.
  it('a production-shaped state whose first one-URL POST gets 429 counts the old block as a strike', async () => {
    const old = ['https://cambio-uruguay.com/vieja']
    const nueva = 'https://cambio-uruguay.com/nueva'
    const state = memoryState(
      JSON.stringify({
        submittedAt: null,
        urls: [],
        known: old,
        blockedUntil: '2026-11-20T06:05:25.958Z',
      })
    )
    const at = '2026-11-20T07:00:00.000Z'
    const throttled = site([...old, nueva], response(429))
    const result = await runIndexNow({
      fetch: throttled.fetchImpl,
      env: ENABLED,
      key: KEY32,
      log: vi.fn(),
      state,
      now: () => at,
    })
    expect(result.status).toBe('rejected')
    expect(postedUrls(throttled.calls)).toEqual([nueva])
    expect(JSON.parse(state.text!)).toMatchObject({
      strikes: 2,
      batch: 1,
      blockedUntil: plus(at, 2 * DAY),
    })
  })

  // El umbral es por día y el script corre en cada deploy (hasta 8 por día): la tanda crece por
  // día, no por deploy.
  it('after an accepted POST, later deploys within 24 h make no POST and write nothing', async () => {
    expect(INDEXNOW_MIN_GAP_MS).toBe(DAY)
    const urls = Array.from({ length: 10 }, (_, i) => `https://cambio-uruguay.com/n${i}`)
    const state = memoryState(JSON.stringify({ urls: [], known: [], batch: 1 }))
    const at = '2026-11-21T07:00:00.000Z'
    const first = site(urls)
    const firstResult = await runIndexNow({
      fetch: first.fetchImpl,
      env: ENABLED,
      key: KEY32,
      state,
      now: () => at,
    })
    expect(firstResult.status).toBe('submitted')
    expect(postedUrls(first.calls)).toEqual([urls[0]])
    const afterFirst = state.text
    expect(JSON.parse(afterFirst!)).toMatchObject({ submittedAt: at, batch: 2 })

    for (const hours of [2, 12, 23.9]) {
      const deploy = site(urls)
      const log = vi.fn()
      const result = await runIndexNow({
        fetch: deploy.fetchImpl,
        env: ENABLED,
        key: KEY32,
        log,
        state,
        now: () => plus(at, hours * 3_600_000),
      })
      expect(result).toMatchObject({ status: 'spaced', urls: 0 })
      expect(deploy.calls.some(call => call.url === INDEXNOW_ENDPOINT)).toBe(false)
      expect(log).toHaveBeenCalledWith(expect.stringMatching(/under 24 h ago; no POST/))
    }
    expect(state.text).toBe(afterFirst)

    // 24 h después sale la tanda doblada, empezando por lo que esperó.
    const nextDay = site(urls)
    await runIndexNow({
      fetch: nextDay.fetchImpl,
      env: ENABLED,
      key: KEY32,
      state,
      now: () => plus(at, DAY),
    })
    expect(postedUrls(nextDay.calls)).toEqual([urls[1], urls[2]])
    expect(JSON.parse(state.text!)).toMatchObject({ submittedAt: plus(at, DAY), batch: 4 })

    // Un `submittedAt` en el futuro (reloj corrido) no traba el envío.
    const skewed = memoryState(
      JSON.stringify({ urls: [], known: [], submittedAt: plus(at, 3 * DAY) })
    )
    const skewedResult = await runIndexNow({
      fetch: site(urls).fetchImpl,
      env: ENABLED,
      key: KEY32,
      state: skewed,
      now: () => at,
    })
    expect(skewedResult.status).toBe('submitted')
  })

  // Sin `known` se anota el sitemap, pero no se borra cuándo fue el último envío aceptado.
  it('recording the sitemap without known keeps the last accepted submittedAt', async () => {
    const state = memoryState(JSON.stringify({ urls: [], submittedAt: '2026-11-19T07:00:00.000Z' }))
    await runIndexNow({
      fetch: HEALTHY().fetchImpl,
      env: ENABLED,
      key: KEY32,
      state,
      now: () => '2026-11-21T07:00:00.000Z',
    })
    expect(JSON.parse(state.text!)).toMatchObject({
      submittedAt: '2026-11-19T07:00:00.000Z',
      known: APEX_URLS,
    })
  })

  it('readStateFile: only a missing file is a first deploy, any other read error throws', () => {
    const fail = (code: string) => () => {
      throw Object.assign(new Error(code), { code })
    }
    expect(readStateFile(() => '{"urls":[]}', 'x')).toBe('{"urls":[]}')
    expect(readStateFile(fail('ENOENT'), 'x')).toBeNull()
    for (const code of ['EACCES', 'EISDIR', 'EIO']) {
      expect(() => readStateFile(fail(code), 'x')).toThrow(code)
    }
  })

  it('a state that exists but cannot be read aborts without a POST and without overwriting it', async () => {
    const { fetchImpl, calls } = HEALTHY()
    const state = {
      read: vi.fn(() => {
        throw new Error('EACCES')
      }),
      write: vi.fn(),
    }
    const log = vi.fn()
    const result = await runIndexNow({ fetch: fetchImpl, env: ENABLED, key: KEY32, log, state })
    expect(result).toMatchObject({ status: 'aborted', urls: 0 })
    expect(calls.some(call => call.url === INDEXNOW_ENDPOINT)).toBe(false)
    expect(state.write).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith(expect.stringContaining('EACCES'))
  })

  it('a batch that was not filled does not shrink the next one', async () => {
    const urls = [...APEX_URLS]
    const state = memoryState(JSON.stringify({ urls: [], known: APEX_URLS.slice(0, 2), batch: 8 }))
    await runIndexNow({ fetch: site(urls).fetchImpl, env: ENABLED, key: KEY32, state })
    expect(JSON.parse(state.text!).batch).toBe(8)
  })

  it('a rejected POST (other than 429) leaves the state untouched so the same URLs are retried next time', async () => {
    const { fetchImpl } = fakeFetch({
      [SITEMAP_INDEX_URL]: response(200, INDEX_XML),
      'https://cambio-uruguay.com/__sitemap__/es-ES.xml': response(200, CHILD_XML),
      [INDEXNOW_ENDPOINT]: response(403, 'UserForbiddedToAccessSite'),
    })
    const state = freshState()
    const log = vi.fn()
    const result = await runIndexNow({
      fetch: fetchImpl,
      env: ENABLED,
      argv: [],
      key: KEY32,
      log,
      state,
    })
    expect(result.status).toBe('rejected')
    expect(state.write).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith(expect.stringContaining('UserForbiddedToAccessSite'))
  })

  it('--dry-run neither POSTs nor writes state', async () => {
    const { fetchImpl, calls } = HEALTHY()
    const state = freshState()
    const result = await runIndexNow({
      fetch: fetchImpl,
      env: {},
      argv: ['--dry-run'],
      key: KEY32,
      log: vi.fn(),
      state,
    })
    expect(result.status).toBe('dry-run')
    expect(calls.some(call => call.url === INDEXNOW_ENDPOINT)).toBe(false)
    expect(state.write).not.toHaveBeenCalled()
  })
})
