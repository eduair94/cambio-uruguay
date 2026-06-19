import { describe, expect, it } from 'vitest'
import { buildWidgetEmbed, widgetSrc } from '../../utils/widgetEmbed'

describe('widgetSrc', () => {
  it('defaults to the dark theme on the production origin', () => {
    expect(widgetSrc()).toBe('https://cambio-uruguay.com/widget?theme=dark')
  })

  it('honours the light theme', () => {
    expect(widgetSrc({ theme: 'light' })).toBe('https://cambio-uruguay.com/widget?theme=light')
  })

  it('falls back to dark for an unknown theme', () => {
    // @ts-expect-error testing runtime guard against bad input
    expect(widgetSrc({ theme: 'neon' })).toContain('theme=dark')
  })

  it('allows overriding the base URL (no trailing slash duplication)', () => {
    expect(widgetSrc({ theme: 'dark', baseUrl: 'http://localhost:3000/' })).toBe(
      'http://localhost:3000/widget?theme=dark'
    )
  })
})

describe('buildWidgetEmbed', () => {
  it('produces a valid iframe with src, dims, title, lazy loading', () => {
    const html = buildWidgetEmbed({ theme: 'dark', width: 320, height: 170 })
    expect(html).toContain('<iframe')
    expect(html).toContain('src="https://cambio-uruguay.com/widget?theme=dark"')
    expect(html).toContain('width="320"')
    expect(html).toContain('height="170"')
    expect(html).toContain('loading="lazy"')
    expect(html).toMatch(/title="[^"]+"/)
    expect(html.trim().endsWith('</iframe>')).toBe(true)
  })

  it('supports a responsive 100% width', () => {
    const html = buildWidgetEmbed({ width: '100%', height: 170 })
    expect(html).toContain('width="100%"')
  })

  it('clamps absurd dimensions to sane bounds', () => {
    const html = buildWidgetEmbed({ width: 99999, height: 5 })
    expect(html).not.toContain('width="99999"')
    expect(html).not.toContain('height="5"')
  })

  it('escapes the title so the snippet cannot break out of the attribute', () => {
    const html = buildWidgetEmbed({ title: 'a"><script>x' })
    expect(html).not.toContain('"><script>')
  })
})
