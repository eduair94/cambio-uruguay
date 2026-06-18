import { describe, expect, it } from 'vitest'
import {
  buildDailyEmail,
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
