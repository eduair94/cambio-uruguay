import { describe, expect, it } from 'vitest'
import { buildShareLinks, SHARE_NETWORKS } from '../../utils/share'

const URL = 'https://cambio-uruguay.com/cotizacion/dolar'
const TEXT = 'Dólar hoy en Uruguay'

describe('buildShareLinks', () => {
  const links = buildShareLinks({ url: URL, text: TEXT })

  it('builds a WhatsApp link with text + url in one message', () => {
    expect(links.whatsapp).toBe('https://wa.me/?text=' + encodeURIComponent(`${TEXT} ${URL}`))
  })

  it('builds an X/Twitter intent with separate text and url params', () => {
    expect(links.twitter).toContain('https://twitter.com/intent/tweet?')
    expect(links.twitter).toContain('text=' + encodeURIComponent(TEXT))
    expect(links.twitter).toContain('url=' + encodeURIComponent(URL))
  })

  it('builds a Telegram share link', () => {
    expect(links.telegram).toBe(
      'https://t.me/share/url?url=' + encodeURIComponent(URL) + '&text=' + encodeURIComponent(TEXT)
    )
  })

  it('builds a Facebook sharer link (url only)', () => {
    expect(links.facebook).toBe(
      'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(URL)
    )
  })

  it('encodes special characters safely', () => {
    const l = buildShareLinks({ url: 'https://x.com/a?b=1&c=2', text: 'a & b' })
    expect(l.facebook).toBe(
      'https://www.facebook.com/sharer/sharer.php?u=' +
        encodeURIComponent('https://x.com/a?b=1&c=2')
    )
    expect(l.whatsapp).not.toContain(' ') // fully encoded
  })
})

describe('SHARE_NETWORKS', () => {
  it('lists each network with an icon, color and label key, matching the builder keys', () => {
    const ids = SHARE_NETWORKS.map(n => n.id)
    expect(ids).toEqual(['whatsapp', 'twitter', 'telegram', 'facebook'])
    for (const n of SHARE_NETWORKS) {
      // `mdi-*` font glyphs OR `$alias` custom SVG icons (telegram/discord were
      // dropped from MDI 7 and re-added as Vuetify aliases).
      expect(n.icon).toMatch(/^(mdi-|\$)/)
      expect(n.labelKey).toContain('share.')
      expect(typeof n.color).toBe('string')
    }
  })
})
