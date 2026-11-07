import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createSpaLinkHandler } from '../../utils/spaLinks'

function anchor(attrs: Record<string, string>) {
  return {
    target: attrs.target ?? '',
    getAttribute: (name: string) => attrs[name] ?? null,
    hasAttribute: (name: string) => name in attrs,
  }
}

function click(a: ReturnType<typeof anchor> | null, init: Partial<MouseEvent> = {}) {
  const event = {
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    target: { closest: () => a },
    preventDefault: vi.fn(),
    ...init,
  }
  return event as unknown as MouseEvent & { preventDefault: ReturnType<typeof vi.fn> }
}

describe('createSpaLinkHandler', () => {
  it('navigates client-side on a plain left click on an internal link', () => {
    const navigate = vi.fn()
    const event = click(anchor({ href: '/dolar-hoy' }))
    createSpaLinkHandler(navigate)(event)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith('/dolar-hoy')
  })

  it('leaves the browser alone for new-tab gestures, other buttons and handled clicks', () => {
    const navigate = vi.fn()
    const handler = createSpaLinkHandler(navigate)
    for (const init of [
      { metaKey: true },
      { ctrlKey: true },
      { shiftKey: true },
      { altKey: true },
      { button: 1 },
      { defaultPrevented: true },
    ]) {
      const event = click(anchor({ href: '/dolar-hoy' }), init)
      handler(event)
      expect(event.preventDefault, JSON.stringify(init)).not.toHaveBeenCalled()
    }
    expect(navigate).not.toHaveBeenCalled()
  })

  it('never hijacks external, protocol-relative, new-window or download links', () => {
    const navigate = vi.fn()
    const handler = createSpaLinkHandler(navigate)
    for (const attrs of [
      { href: 'https://twitter.com/cambio_uruguay' },
      { href: '//evil.example/x' },
      { href: '/a', target: '_blank' },
      { href: '/archivo.csv', download: '' },
      { href: 'mailto:hola@example.com' },
    ]) {
      handler(click(anchor(attrs)))
    }
    handler(click(null))
    expect(navigate).not.toHaveBeenCalled()
  })
})

describe('the footer link directory', () => {
  // ~245 links: as NuxtLink they were ~490 component instances hydrated on every page (and as
  // many chunk prefetches once visible). Deferring the footer's hydration instead broke Auto Ads
  // (#263), so the directory is plain anchors with one delegated handler.
  const footer = readFileSync(resolve(__dirname, '../../components/Footer.vue'), 'utf8')
  const directory = footer.slice(
    footer.indexOf('class="cu-footer__dir"'),
    footer.indexOf('</nav>', footer.indexOf('class="cu-footer__dir"'))
  )

  it('renders plain anchors handled by createSpaLinkHandler, not NuxtLink', () => {
    expect(directory).not.toMatch(/<NuxtLink|<nuxt-link/)
    expect(directory).toMatch(/<a\s[^>]*:href="localePath\(/)
    expect(footer).toMatch(/@click="onDirectoryClick"/)
    expect(footer).toMatch(/createSpaLinkHandler\(/)
  })
})

describe('the link blocks the layout renders on every page', () => {
  // FamiliaNav (top of every directory), TemaVecinos and DirectorioAnalisis (layout tail): their
  // links hydrate on every page they appear on, so they follow the footer's pattern.
  for (const name of ['FamiliaNav', 'TemaVecinos', 'DirectorioAnalisis']) {
    it(`${name} uses plain anchors with the delegated handler`, () => {
      const source = readFileSync(resolve(__dirname, `../../components/${name}.vue`), 'utf8')
      const template = source.slice(0, source.indexOf('<script'))
      expect(template).not.toMatch(/<NuxtLink|<nuxt-link|\s:to="/)
      expect(template).toMatch(/<nav[^>]*@click="onSpaClick"/)
      expect(source).toMatch(/createSpaLinkHandler\(/)
    })
  }
})
