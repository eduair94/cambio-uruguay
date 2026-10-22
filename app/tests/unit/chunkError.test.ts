// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSsrRecovery, isChunkLoadError, staticSsrHtml } from '../../utils/chunkError'

const URL = 'https://cambio-uruguay.com/precio/papa-rosada'
const failedChunk = new TypeError('Failed to fetch dynamically imported module: /_nuxt/route.js')

beforeEach(() => {
  document.head.innerHTML = `
    <title>Papa rosada | Cambio Uruguay</title>
    <meta name="description" content="El precio publicado por cada comercio.">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${URL}">
  `
  document.body.innerHTML = '<div id="__nuxt"><main><h1>Papa rosada</h1></main></div>'
})

afterEach(() => vi.restoreAllMocks())

describe('failed module detection', () => {
  it.each([
    failedChunk,
    new TypeError('Importing a module script failed.'),
    new TypeError('error loading dynamically imported module: https://example.invalid/route.js'),
    new Error('Loading chunk 17 failed.\n(error: /_nuxt/route.js)'),
    new Error('Loading CSS chunk 17 failed.'),
    new Error('Unable to preload CSS for /_nuxt/route.css'),
    { name: 'ChunkLoadError', message: 'request failed' },
    new Error('Page failed', { cause: new Error('wrapper', { cause: failedChunk }) }),
  ])('recognizes the browser asset failure: %s', error => {
    expect(isChunkLoadError(error)).toBe(true)
  })

  it.each([
    null,
    undefined,
    404,
    new Error('Failed to fetch'),
    new Error('Loading chunk statistics'),
    new Error('Chunk processing failed in our calculator'),
    new Error('Cannot read properties of undefined'),
  ])('does not replace an unrelated error with stale page content: %s', error => {
    expect(isChunkLoadError(error)).toBe(false)
  })

  it('stops at a cyclic cause instead of breaking the error page', () => {
    const error: { message: string; cause?: unknown } = { message: 'not a module error' }
    error.cause = error
    expect(isChunkLoadError(error)).toBe(false)
  })
})

describe('initial SSR lifetime', () => {
  it('captures once, preserves the original head, and never reads blocked storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    const recovery = createSsrRecovery()
    recovery.capture(document, URL, true, null)
    document.title = 'Changed by a partially mounted component'
    document.querySelector('h1')!.textContent = 'Changed content'
    recovery.capture(document, URL, true, null)
    expect(recovery.forUrl(URL)).toMatchObject({
      title: 'Papa rosada | Cambio Uruguay',
      description: 'El precio publicado por cada comercio.',
      robots: 'index, follow',
      canonical: URL,
      html: '<main><h1>Papa rosada</h1></main>',
    })
    const reload = vi.fn()
    expect(recovery.requestReload(reload)).toBe(true)
    expect(recovery.requestReload(reload)).toBe(false)
    expect(reload).toHaveBeenCalledOnce()
  })

  it('never serves the old document for a different route or query', () => {
    const recovery = createSsrRecovery()
    recovery.capture(document, URL, true, null)
    expect(recovery.forUrl(`${URL}?store=other`)).toBeNull()
    expect(recovery.forUrl('https://cambio-uruguay.com/guias')).toBeNull()
  })

  it('releases a healthy boot after hydration', () => {
    const recovery = createSsrRecovery()
    recovery.capture(document, URL, true, null)
    recovery.finishHydration(null)
    expect(recovery.forUrl(URL)).toBeNull()
    recovery.capture(document, URL, true, null)
    expect(recovery.forUrl(URL)).toBeNull()
  })

  it('keeps the original document when resolving Suspense belongs to an error', () => {
    const recovery = createSsrRecovery()
    recovery.capture(document, URL, true, null)
    recovery.noteStartupError()
    // app:error can run before Nuxt assigns payload.error.
    recovery.finishHydration(null)
    expect(recovery.forUrl(URL)?.html).toContain('<h1>Papa rosada</h1>')
  })

  it('also retains the document if payload.error already exists', () => {
    const recovery = createSsrRecovery()
    recovery.capture(document, URL, true, null)
    recovery.finishHydration(failedChunk)
    expect(recovery.forUrl(URL)).not.toBeNull()
  })

  it.each([
    [false, null],
    [true, { statusCode: 404 }],
    [true, { statusCode: 500 }],
  ])('does not capture a client shell or an SSR error (%s, %s)', (serverRendered, error) => {
    const recovery = createSsrRecovery()
    recovery.capture(document, URL, serverRendered, error)
    expect(recovery.forUrl(URL)).toBeNull()
    expect(recovery.wasServerError()).toBe(Boolean(error))
  })
})

describe('static reading copy', () => {
  it('keeps content, CSS attributes and native links without reviving controls or advertising', () => {
    const original = document.getElementById('__nuxt')!
    original.innerHTML = `
      <main data-v-page class="v-main">
        <h1>Papa rosada</h1><a href="/guias" onclick="bad()">Guías</a>
        <form action="/save" method="post"><input name="amount" value="123" autofocus>
          <button type="submit">Guardar</button><select><option>Uno</option></select>
          <textarea>Mensaje</textarea></form>
        <div role="button" tabindex="0" onclick="bad()">Abrir</div>
        <div contenteditable="true">Texto</div>
        <script>window.mustNotRun = true</script><iframe src="https://ads.example.invalid"></iframe>
        <aside class="cu-ad"><ins class="adsbygoogle" data-ad-slot="placeholder"></ins></aside>
        <div class="google-auto-placed">Publicidad</div>
        <object data="https://embed.example.invalid"></object><embed src="https://embed.example.invalid">
      </main>
    `
    const html = staticSsrHtml(original.innerHTML, document)
    const copy = document.createElement('div')
    copy.innerHTML = html
    expect(copy.querySelector('h1')?.textContent).toBe('Papa rosada')
    expect(copy.querySelector('main')?.hasAttribute('data-v-page')).toBe(true)
    expect(copy.querySelector('a')?.getAttribute('href')).toBe('/guias')
    expect(
      copy.querySelectorAll('script, iframe, object, embed, .cu-ad, .google-auto-placed')
    ).toHaveLength(0)
    expect(copy.querySelectorAll('[onclick], [autofocus]')).toHaveLength(0)
    for (const control of copy.querySelectorAll('input, button, select, option, textarea'))
      expect(control.hasAttribute('disabled')).toBe(true)
    expect(copy.querySelector('form')?.getAttribute('aria-disabled')).toBe('true')
    expect(copy.querySelector('[role="button"]')?.getAttribute('tabindex')).toBe('-1')
    expect(copy.querySelector('[contenteditable]')?.getAttribute('contenteditable')).toBe('false')
    // We only change the detached copy. The live document is never an ad-removal target.
    expect(original.querySelector('.cu-ad')).not.toBeNull()
    expect(original.querySelector('button')?.disabled).toBe(false)
  })
})
