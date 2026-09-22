// IndexNow como módulo puro: parsear el índice, elegir el hijo es-ES, filtrar al apex, partir en
// tandas de 10.000 y armar el JSON. Lo que se pinnea es lo que el protocolo exige y lo que la casa
// exige: host apex, clave = el único archivo <hex>.txt de public/, y "sitemap vacío o caído = no
// enviar nada".
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import {
  CHILD_SITEMAP_SUFFIX,
  INDEXNOW_ENDPOINT,
  INDEXNOW_HOST,
  INDEXNOW_KEY_FILE_PATTERN,
  INDEXNOW_MAX_NEW_PER_RUN,
  INDEXNOW_MAX_URLS_PER_POST,
  SITEMAP_INDEX_URL,
  buildPayload,
  chunkUrls,
  collectUrls,
  extractLocs,
  filterApexUrls,
  isEnabled,
  keyLocation,
  parseState,
  pickChildSitemap,
  planSubmission,
  readEnvFlag,
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

function response(status: number, text = '') {
  return { ok: status >= 200 && status < 300, status, text: async () => text }
}

/** Un fetch de mentira que contesta por URL y recuerda cada llamada. */
function fakeFetch(routes: Record<string, ReturnType<typeof response>>) {
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
    const result = await runIndexNow({ fetch: fetchImpl, env: ENABLED, argv: [], key: KEY32, log })
    expect(result).toMatchObject({ status: 'submitted', urls: 3, chunks: 1 })
    const post = calls.find(call => call.url === INDEXNOW_ENDPOINT)!
    expect(post.init?.method).toBe('POST')
    expect(post.init?.headers?.['content-type']).toMatch(/^application\/json/)
    expect(JSON.parse(post.init!.body!)).toEqual(buildPayload(APEX_URLS, { key: KEY32 }))
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/POST 3 URLs → HTTP 200/))
  })

  it('--dry-run reads the sitemaps but never POSTs', async () => {
    const { fetchImpl, calls } = HEALTHY()
    const result = await runIndexNow({
      fetch: fetchImpl,
      env: {},
      argv: ['--dry-run'],
      key: KEY32,
      log: vi.fn(),
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

  it('reports a 4xx as rejected and never throws', async () => {
    const { fetchImpl } = fakeFetch({
      [SITEMAP_INDEX_URL]: response(200, INDEX_XML),
      'https://cambio-uruguay.com/__sitemap__/es-ES.xml': response(200, CHILD_XML),
      [INDEXNOW_ENDPOINT]: response(422),
    })
    const log = vi.fn()
    const result = await runIndexNow({ fetch: fetchImpl, env: ENABLED, argv: [], key: KEY32, log })
    expect(result.status).toBe('rejected')
    expect(result.responses).toEqual([{ status: 422, ok: false, urls: 3 }])
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/HTTP 422 \(rejected\)/))
  })

  it('treats 202 as accepted', async () => {
    const { fetchImpl } = fakeFetch({
      [SITEMAP_INDEX_URL]: response(200, INDEX_XML),
      'https://cambio-uruguay.com/__sitemap__/es-ES.xml': response(200, CHILD_XML),
      [INDEXNOW_ENDPOINT]: response(202),
    })
    const result = await runIndexNow({
      fetch: fetchImpl,
      env: ENABLED,
      argv: [],
      key: KEY32,
      log: vi.fn(),
    })
    expect(result.status).toBe('submitted')
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
})

// Medido el 22/9/2026: dos deploys seguidos mandaron las 3.691 URLs del sitemap en un POST y
// api.indexnow.org contestó 429 ("potential spam") las dos veces. Desde entonces se anuncia sólo
// lo que no se anunció antes, de a lo sumo INDEXNOW_MAX_NEW_PER_RUN, y un rechazo no marca nada.
describe('only what is new, capped per run, remembered between deploys', () => {
  const ENABLED = { INDEXNOW_ENABLED: '1' }
  const memoryState = (initial: string | null = null) => {
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

  it('planSubmission sends only unseen URLs, keeps sitemap order and caps the batch', () => {
    const urls = ['a', 'b', 'c', 'd']
    expect(planSubmission(urls, ['b'], 2)).toEqual({
      toSend: ['a', 'c'],
      pending: 1,
      nextState: ['b', 'a', 'c'],
    })
    // Una URL que ya no está en el sitemap sale del estado sola.
    expect(planSubmission(['a'], ['zz', 'a']).nextState).toEqual(['a'])
    expect(INDEXNOW_MAX_NEW_PER_RUN).toBeLessThan(INDEXNOW_MAX_URLS_PER_POST)
  })

  it('parseState tolerates garbage and only keeps string URLs', () => {
    expect(parseState('not json')).toEqual([])
    expect(parseState('{"urls":"x"}')).toEqual([])
    expect(parseState('{"urls":["a",1,"b"]}')).toEqual(['a', 'b'])
  })

  it('first run without state sends at most the cap and persists what was accepted', async () => {
    const { fetchImpl, calls } = HEALTHY()
    const state = memoryState()
    const result = await runIndexNow({
      fetch: fetchImpl,
      env: ENABLED,
      argv: [],
      key: KEY32,
      log: vi.fn(),
      state,
      maxNewPerRun: 2,
      now: () => '2026-09-22T22:00:00.000Z',
    })
    expect(result).toMatchObject({ status: 'submitted', urls: 2, chunks: 1 })
    const post = calls.find(call => call.url === INDEXNOW_ENDPOINT)!
    expect(JSON.parse(post.init!.body!).urlList).toEqual(APEX_URLS.slice(0, 2))
    expect(JSON.parse(state.text!)).toEqual({
      submittedAt: '2026-09-22T22:00:00.000Z',
      urls: APEX_URLS.slice(0, 2),
    })
  })

  it('a later run sends only what the state does not list, and a full state means no POST', async () => {
    const { fetchImpl, calls } = HEALTHY()
    const state = memoryState(JSON.stringify({ urls: APEX_URLS.slice(0, 2) }))
    const result = await runIndexNow({
      fetch: fetchImpl,
      env: ENABLED,
      argv: [],
      key: KEY32,
      log: vi.fn(),
      state,
    })
    expect(result).toMatchObject({ status: 'submitted', urls: 1 })
    expect(
      JSON.parse(calls.find(call => call.url === INDEXNOW_ENDPOINT)!.init!.body!).urlList
    ).toEqual([APEX_URLS[2]])
    expect(JSON.parse(state.text!).urls).toEqual(APEX_URLS)

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

  it('a rejected POST leaves the state untouched so the same URLs are retried next time', async () => {
    const { fetchImpl } = fakeFetch({
      [SITEMAP_INDEX_URL]: response(200, INDEX_XML),
      'https://cambio-uruguay.com/__sitemap__/es-ES.xml': response(200, CHILD_XML),
      [INDEXNOW_ENDPOINT]: response(429),
    })
    const state = memoryState()
    const result = await runIndexNow({
      fetch: fetchImpl,
      env: ENABLED,
      argv: [],
      key: KEY32,
      log: vi.fn(),
      state,
    })
    expect(result.status).toBe('rejected')
    expect(state.write).not.toHaveBeenCalled()
  })

  it('--dry-run neither POSTs nor writes state', async () => {
    const { fetchImpl, calls } = HEALTHY()
    const state = memoryState()
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
