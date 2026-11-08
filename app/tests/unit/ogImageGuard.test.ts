import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { resolve } from 'node:path'
import * as h3 from 'h3'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import ogImageMiddleware from '../../server/middleware/og-image-locale'
import {
  asLocation,
  OG_IMAGE_META,
  ogImageRequestTarget,
  stripOgImageQuery,
} from '../../utils/ogImageGuard'

const CARD = '/__og-image__/image/casa/brou/og.png'

describe('ogImageRequestTarget', () => {
  it('lets the module draw a card asked for exactly, with nothing after it', () => {
    expect(ogImageRequestTarget(CARD)).toBeNull()
    expect(ogImageRequestTarget('/__og-image__/image/og.png')).toBeNull()
    expect(ogImageRequestTarget('/__og-image__/image/en/dolar-hoy/og.png')).toBeNull()
    expect(ogImageRequestTarget('/__og-image__/image/s/abc123/og.png')).toBeNull()
  })

  it('sends a card asked with any query to its clean URL, whatever the query carries', () => {
    for (const query of [
      '?title=x',
      '?props={"title":"x"}',
      '?width=4000',
      '?html=<b>x</b>',
      '?_query=%7B%7D',
      '?purge',
      '?fbclid=abc&utm_source=x',
      '?',
      '#x',
    ])
      expect(ogImageRequestTarget(`${CARD}${query}`), query).toEqual({
        status: 301,
        location: CARD,
      })
    expect(ogImageRequestTarget('/__og-image__/image/og.png?x=123')).toEqual({
      status: 301,
      location: '/__og-image__/image/og.png',
    })
    // English and Portuguese keep their own card.
    expect(ogImageRequestTarget('/__og-image__/image/en/dolar-hoy/og.png?fbclid=y')).toEqual({
      status: 301,
      location: '/__og-image__/image/en/dolar-hoy/og.png',
    })
  })

  it('collapses an extra locale in the same single hop', () => {
    expect(ogImageRequestTarget('/__og-image__/image/de/x/og.png?title=y')).toEqual({
      status: 301,
      location: '/__og-image__/image/x/og.png',
    })
    expect(ogImageRequestTarget('/__og-image__/static/de/x/og.png?title=y')).toEqual({
      status: 301,
      location: '/__og-image__/image/x/og.png',
    })
    // A clean extra-locale card is left to the middleware's own locale redirect.
    expect(ogImageRequestTarget('/__og-image__/image/de/x/og.png')).toBeNull()
  })

  it('serves the static flavor of a card from the image URL', () => {
    expect(ogImageRequestTarget('/__og-image__/static/casa/brou/og.png')).toEqual({
      status: 301,
      location: CARD,
    })
    expect(ogImageRequestTarget('/__og-image__/static/og.png')).toEqual({
      status: 301,
      location: '/__og-image__/image/og.png',
    })
  })

  it('refuses every other file or path under the rendering prefixes', () => {
    for (const path of [
      '/__og-image__/image/casa/brou/og.html',
      '/__og-image__/image/casa/brou/og.svg',
      '/__og-image__/image/casa/brou/og.json',
      '/__og-image__/image/casa/brou/og.jpg',
      '/__og-image__/image/casa/brou/og.jpeg',
      '/__og-image__/image/garantia-de-alquiler-uruguay/og.html?width=1',
      '/__og-image__/static/casa/brou/og.html',
      '/__og-image__/image/casa/brou/OG.PNG',
      '/__og-image__/image/casa/brou/og.png/',
      '/__og-image__/image/casa/brou',
      '/__og-image__/image/',
      '/__og-image__/image',
      '/__og-image__/static?x=1',
    ])
      expect(ogImageRequestTarget(path), path).toEqual({ status: 404 })
  })

  it('keeps every redirect on this site, under the card prefix', () => {
    for (const path of [
      '/__og-image__/static//example.invalid/og.png',
      '/__og-image__/image//example.invalid/og.png?x=1',
    ]) {
      const target = ogImageRequestTarget(path)
      expect(target && 'location' in target && target.location, path).toMatch(
        /^\/__og-image__\/image\//
      )
    }
  })

  it('writes the redirect in plain ASCII, whatever the request path decoded to', () => {
    expect(ogImageRequestTarget('/__og-image__/image/€/og.png?x=1')).toEqual({
      status: 301,
      location: '/__og-image__/image/%E2%82%AC/og.png',
    })
    expect(ogImageRequestTarget('/__og-image__/static/paysandú/og.png')).toEqual({
      status: 301,
      location: '/__og-image__/image/paysand%C3%BA/og.png',
    })
    expect(ogImageRequestTarget('/__og-image__/image/\u0000/og.png?x=1')).toEqual({
      status: 301,
      location: '/__og-image__/image/%00/og.png',
    })
    // A line break never reaches a header: a path with one is not a card.
    expect(ogImageRequestTarget('/__og-image__/image/a\r\nb/og.png?x=1')).toEqual({ status: 404 })
  })

  it('leaves alone what is not a rendering route: the font loader, other paths, pages', () => {
    expect(ogImageRequestTarget('/__og-image__/font/x?font=y')).toBeNull()
    expect(ogImageRequestTarget('/__og-image__/font/Sora/700.ttf?font=%7B%7D')).toBeNull()
    expect(ogImageRequestTarget('/__og-image__/debug.json')).toBeNull()
    expect(ogImageRequestTarget('/__og-image__/imagex/og.png?x=1')).toBeNull()
    expect(ogImageRequestTarget('/dolar-hoy?title=x')).toBeNull()
    expect(ogImageRequestTarget('/img/og.png?v=2')).toBeNull()
  })
})

describe('stripOgImageQuery', () => {
  it('drops the query and fragment of a card URL', () => {
    expect(
      stripOgImageQuery(
        'https://cambio-uruguay.com/__og-image__/image/dolar-hoy/og.png?fbclid=1&_query=%7B%22fbclid%22:%221%22%7D'
      )
    ).toBe('https://cambio-uruguay.com/__og-image__/image/dolar-hoy/og.png')
    expect(stripOgImageQuery('/__og-image__/image/og.png?x=123#y')).toBe(
      '/__og-image__/image/og.png'
    )
  })

  it('leaves every other image URL exactly as it came', () => {
    for (const url of [
      'https://http2.mlstatic.com/D_NQ_NP_2X_1-MLU1_112026-C.webp?x=1',
      '/img/og-autos.png?v=2',
      'https://cambio-uruguay.com/img/og.png',
      // The card path inside another URL's query is not a card URL.
      'https://cdn.example.invalid/photo.jpg?ref=/__og-image__/image/x/og.png',
      '',
    ])
      expect(stripOgImageQuery(url)).toBe(url)
  })

  it('is idempotent', () => {
    for (const url of [
      'https://cambio-uruguay.com/__og-image__/image/casa/brou/og.png?subtitle=x&_query=%7B%7D',
      'https://http2.mlstatic.com/D_NQ_NP_2X_1-MLU1_112026-C.webp?x=1',
    ]) {
      const once = stripOgImageQuery(url)
      expect(stripOgImageQuery(once)).toBe(once)
    }
  })
})

describe('asLocation', () => {
  it('leaves the characters of a URL as they are', () => {
    for (const path of [
      CARD,
      '/__og-image__/image/og.png',
      "/a-b_c.d~e/!$&'()*+,;=:@/og.png",
      '/a%25b%2Fc/og.png?x=1&y=%7B%7D#z',
    ])
      expect(asLocation(path)).toBe(path)
  })

  it('writes every other character as UTF-8 percent-encoding', () => {
    expect(asLocation('/€/paysandú/')).toBe('/%E2%82%AC/paysand%C3%BA/')
    expect(asLocation('/a\u0000b c\u007F\t/')).toBe('/a%00b%20c%7F%09/')
    expect(asLocation('/"<>\\^`{|}[]/')).toBe('/%22%3C%3E%5C%5E%60%7B%7C%7D%5B%5D/')
    expect(asLocation('/\u{1F600}/')).toBe('/%F0%9F%98%80/')
  })

  it('never throws, and is idempotent', () => {
    expect(asLocation('/\uD83D/')).toBe('/%EF%BF%BD/')
    for (const path of ['/€ "x"/og.png', '/\uDE00\u0000/']) {
      const once = asLocation(path)
      expect(asLocation(once)).toBe(once)
    }
  })
})

describe('OG_IMAGE_META', () => {
  // plugins/auto-translate.ts keeps a copy of this list for its extra-locale rewrite. A tag added
  // to only one of them would keep its query, or its per-locale card. Once that plugin imports
  // this list instead, this test goes.
  it('names the same tags as the copy in plugins/auto-translate.ts', () => {
    const plugin = readFileSync(resolve(__dirname, '../../plugins/auto-translate.ts'), 'utf8')
    const copy = /const OG_IMAGE_META = new Set\(\[([^\]]*)\]\)/.exec(plugin)?.[1] ?? ''
    expect(new Set([...copy.matchAll(/'([^']+)'/g)].map(match => match[1]))).toEqual(OG_IMAGE_META)
  })
})

describe('server/middleware/og-image-locale.ts', () => {
  // On a real Node server, as in production: Node itself checks every header the middleware
  // writes, and h3 hands the middleware the request path already percent-decoded.
  const errors: unknown[] = []
  const app = h3.createApp({ onError: error => void errors.push(error) })
  app.use(ogImageMiddleware)
  // Stands in for nuxt-og-image and for every other route: whatever reaches it was let through.
  app.use(h3.eventHandler(event => `reached ${event.path}`))
  const server = createServer(h3.toNodeListener(app))
  let origin = ''
  beforeAll(async () => {
    await new Promise<void>(done => server.listen(0, '127.0.0.1', done))
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })
  afterAll(() => new Promise(done => server.close(done)))
  const request = (path: string, method = 'GET') =>
    fetch(`${origin}${path}`, { method, redirect: 'manual' })

  it('lets a clean card through to the module', async () => {
    const response = await request(CARD)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe(`reached ${CARD}`)
  })

  it('answers a card asked with a query with a 301 to the clean card', async () => {
    for (const method of ['GET', 'HEAD']) {
      const response = await request(`${CARD}?subtitle=x`, method)
      expect(response.status, method).toBe(301)
      expect(response.headers.get('location'), method).toBe(CARD)
    }
    const localized = await request('/__og-image__/image/de/x/og.png?title=y')
    expect(localized.status).toBe(301)
    expect(localized.headers.get('location')).toBe('/__og-image__/image/x/og.png')
  })

  it('refuses the debugging views with a fixed 404 that echoes nothing', async () => {
    for (const path of [
      '/__og-image__/image/garantia-de-alquiler-uruguay/og.html',
      '/__og-image__/image/casa/brou/og.svg?width=x',
      '/__og-image__/static/casa/brou/og.json',
    ]) {
      const response = await request(path)
      expect(response.status, path).toBe(404)
      expect(response.headers.get('content-type'), path).toMatch(/^text\/plain/)
      expect(await response.text(), path).toBe('Not Found')
    }
  })

  it('keeps the extra-locale redirect of a clean card', async () => {
    const response = await request('/__og-image__/image/ja/guias/una/og.png')
    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('/__og-image__/image/guias/una/og.png')
  })

  it('leaves the font loader and every page alone', async () => {
    for (const path of ['/__og-image__/font/Sora/700.ttf?font=%7B%7D', '/dolar-hoy?title=x']) {
      const response = await request(path)
      expect(response.status, path).toBe(200)
      expect(await response.text(), path).toBe(`reached ${path}`)
    }
  })

  it('redirects a path that decodes past ASCII with a valid Location, never a 500', async () => {
    errors.length = 0
    for (const [path, location] of [
      ['/__og-image__/image/%E2%82%AC/og.png?x=1', '/__og-image__/image/%E2%82%AC/og.png'],
      ['/__og-image__/image/%00/og.png?x=1', '/__og-image__/image/%00/og.png'],
      ['/__og-image__/static/paysand%C3%BA/og.png', '/__og-image__/image/paysand%C3%BA/og.png'],
      // The extra-locale redirect of a clean card, older than the guard, had the same flaw.
      ['/__og-image__/image/de/%E2%82%AC/og.png', '/__og-image__/image/%E2%82%AC/og.png'],
    ] as const) {
      const response = await request(path)
      expect(response.status, path).toBe(301)
      expect(response.headers.get('location'), path).toBe(location)
    }
    // A line break is never written into a header: that path is not a card.
    expect((await request('/__og-image__/image/a%0D%0Ab/og.png?x=1')).status).toBe(404)
    expect(errors).toEqual([])
  })
})
