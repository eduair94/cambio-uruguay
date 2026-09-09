import { describe, expect, it } from 'vitest'
import {
  buildConfirmEmail,
  buildDailyEmail,
  buildDailyTelegram,
  isValidEmail,
  newToken,
  normalizeEmail,
  type DigestData,
} from '../../server/utils/newsletter'

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  A@B.COM ')).toBe('a@b.com')
  })
})

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
  })
  it('rejects malformed input', () => {
    expect(isValidEmail('nope')).toBe(false)
    expect(isValidEmail('a@b')).toBe(false)
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('a b@c.com')).toBe(false)
  })
})

describe('newToken', () => {
  it('produces unique long hex tokens', () => {
    const a = newToken()
    const b = newToken()
    expect(a).toMatch(/^[0-9a-f]{32,}$/)
    expect(a).not.toBe(b)
  })
})

const sample: DigestData = {
  date: '2026-06-18',
  currencies: [
    { code: 'USD', bestSellRate: 40.5, changePct: 1.23, bestBuyHouse: 'BROU' },
    { code: 'EUR', bestSellRate: 48.7, changePct: -0.5, bestBuyHouse: 'Gales' },
  ],
  news: [{ title: 'Dólar sube', link: 'https://x', source: 'El País' }],
  ai: 'El mercado se mantiene estable hoy.',
}

describe('buildDailyEmail', () => {
  it.each(['es', 'en', 'pt'] as const)(
    'attributes editorial return links to the issue in both %s email formats',
    lang => {
      const internal = 'https://cambio-uruguay.com/historico/brou?period=30#evolucion'
      const external = 'https://example.com/noticia?source=rss#dolar'
      const unsub = 'https://cambio-uruguay.com/api/newsletter/unsubscribe?token=abc'
      const data = {
        ...sample,
        news: [
          { title: 'Evolución', link: internal, source: 'Cambio Uruguay' },
          { title: 'Noticia', link: external, source: 'Otro medio' },
        ],
      }
      const out = buildDailyEmail(data, lang, unsub)
      const links = [...out.html.matchAll(/href="([^"]+)"/g)].map(m => m[1]!.replace(/&amp;/g, '&'))
      const editorial = links.filter(link => new URL(link).searchParams.has('utm_source'))
      expect(editorial).toHaveLength(2)
      for (const link of editorial) {
        const url = new URL(link)
        expect(url.searchParams.get('utm_source')).toBe('newsletter')
        expect(url.searchParams.get('utm_medium')).toBe('email')
        expect(url.searchParams.get('utm_campaign')).toBe('dolar_diario')
        expect(url.searchParams.get('utm_content')).toBe(data.date)
        expect(out.text).toContain(link)
      }
      const article = new URL(editorial.find(link => link.includes('/historico/'))!)
      expect(article.searchParams.get('period')).toBe('30')
      expect(article.hash).toBe('#evolucion')
      expect(links).toContain(external)
      expect(links).toContain(unsub)
      expect(out.text).toContain(external)
      expect(out.text).toContain(unsub)
      expect(data.news[0]!.link).toBe(internal)
    }
  )

  it('keeps account actions and other delivery channels free of email attribution', () => {
    const confirm = 'https://cambio-uruguay.com/api/newsletter/confirm?token=abc'
    const unsub = 'https://cambio-uruguay.com/api/newsletter/unsubscribe?token=abc'
    const data = { ...sample, news: [{ title: 'Enlace', link: confirm, source: 'Cambio Uruguay' }] }
    const out = buildDailyEmail(data, 'es', unsub)
    expect(out.html).toContain(`href="${confirm}"`)
    expect(out.html).toContain(`href="${unsub}"`)
    const confirmation = buildConfirmEmail('es', confirm)
    expect(confirmation.html).toContain(`href="${confirm}"`)
    expect(confirmation.text).toContain(confirm)
    expect(confirmation.html).not.toContain('utm_')
    expect(confirmation.text).not.toContain('utm_')
    expect(buildDailyTelegram(data, 'es')).not.toContain('utm_')
  })

  it('renders a localized email with deltas, AI text and the unsubscribe link', () => {
    const unsub = 'https://cambio-uruguay.com/api/newsletter/unsubscribe?token=abc'
    const out = buildDailyEmail(sample, 'es', unsub)
    expect(out.subject.length).toBeGreaterThan(0)
    expect(out.html).toContain('USD')
    expect(out.html).toContain('%')
    expect(out.html).toContain(unsub)
    expect(out.html).toContain('El mercado se mantiene estable hoy.')
    expect(out.text.length).toBeGreaterThan(0)
    expect(out.text).toContain(unsub)
  })

  it('localizes the unsubscribe label per language', () => {
    const unsub = 'https://x/u'
    expect(buildDailyEmail(sample, 'en', unsub).html.toLowerCase()).toContain('unsubscribe')
    expect(buildDailyEmail(sample, 'pt', unsub).html.toLowerCase()).toContain('cancelar')
  })
})
