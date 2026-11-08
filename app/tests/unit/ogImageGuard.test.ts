import * as h3 from 'h3'
import { describe, expect, it } from 'vitest'
import ogImageMiddleware from '../../server/middleware/og-image-locale'
import { ogImageRequestTarget, stripOgImageQuery } from '../../utils/ogImageGuard'

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

describe('server/middleware/og-image-locale.ts', () => {
  const app = h3.createApp()
  app.use(ogImageMiddleware)
  // Stands in for nuxt-og-image and for every other route: whatever reaches it was let through.
  app.use(h3.eventHandler(event => `reached ${event.path}`))
  const handle = h3.toWebHandler(app)
  const request = (path: string, method = 'GET') =>
    handle(new Request(`http://localhost${path}`, { method, redirect: 'manual' }))

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
})
