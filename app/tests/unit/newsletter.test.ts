import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  bestDigestQuotes,
  buildConfirmEmail,
  buildDailyEmail,
  buildDailyTelegram,
  isValidEmail,
  newToken,
  normalizeEmail,
  type DigestData,
} from '../../server/utils/newsletter'

// 2026-11-09: baluma_cambio's USD board had not moved since July (37,15 / 39,55; the backend's
// staleness check marks it `extreme: "min-sell"`) against a market around 40 / 41,4. It was "la
// mejor venta" of 84 of the 87 archived issues.
describe('bestDigestQuotes', () => {
  const market = Array.from({ length: 12 }, (_, i) => ({
    origin: `casa${i}`,
    buy: 40 + i * 0.05,
    sell: 41.4 + i * 0.05,
  }))
  const frozen = { origin: 'baluma_cambio', buy: 37.15, sell: 39.55 }

  it('never names a dollar board the rest of the site treats as off-market', () => {
    const best = bestDigestQuotes('USD', [...market, frozen])!
    expect(best.bestSell.origin).toBe('casa0')
    expect(best.bestBuy.origin).toBe('casa11')
  })

  // Judged on the side it ranks. Narrow-spread casas buy 3,1–3,3 % above a median the wide-spread
  // majority keeps low (~8 % of days in 2026), and the frozen board never won the best buy.
  it('lets a narrow-spread casa that pays more win the best buy', () => {
    const narrow = { origin: 'cambio_principal', buy: 41.6, sell: 41.9 }
    const best = bestDigestQuotes('USD', [...market, frozen, narrow])!
    expect(best.bestBuy.origin).toBe('cambio_principal')
    expect(best.bestSell.origin).toBe('casa0')
  })

  it('keeps a board whose buy is odd but whose sell is the cheapest', () => {
    const oddBuy = { origin: 'prex', buy: 38, sell: 41.3 }
    expect(bestDigestQuotes('USD', [...market, frozen, oddBuy])!.bestSell.origin).toBe('prex')
  })

  // Each currency with its own band (utils/marketOutlier.ts). A board 5 % under the median is
  // left out of the dollar and the euro, but the real's live casas sell up to 6 % under it, and a
  // 3 % band dropped them on every day measured (BRL 8,45 named while four casas sold at 8,10).
  it('judges each currency with its own band', () => {
    expect(bestDigestQuotes('EUR', [...market, frozen])!.bestSell.origin).toBe('casa0')
    expect(bestDigestQuotes('BRL', [...market, frozen])!.bestSell.origin).toBe('baluma_cambio')
  })

  // The issue of 2026-11-06 named tradelix "la mejor compra" of the Argentine peso: 0,15 against a
  // 0,02 median. A peso quoted to the cent at 0,03 is real and stays in.
  it('leaves out the Argentine peso buy that is not a price, and keeps the one that is', () => {
    const pesos = Array.from({ length: 12 }, (_, i) => ({
      origin: `ars${i}`,
      buy: 0.02,
      sell: 0.05,
    }))
    const best = bestDigestQuotes('ARS', [
      ...pesos,
      { origin: 'tradelix', buy: 0.15, sell: 0.55 },
      { origin: 'prex', buy: 0.03, sell: 0.03 },
    ])!
    expect(best.bestBuy.origin).toBe('prex')
    expect(best.bestSell.origin).toBe('prex')
  })

  it('keeps every board when the market is too thin to judge', () => {
    const best = bestDigestQuotes('USD', [market[0]!, market[1]!, frozen])!
    expect(best.bestSell.origin).toBe('baluma_cambio')
  })

  it('has nothing to say without quotes', () => {
    expect(bestDigestQuotes('USD', [])).toBeNull()
  })

  // What the issue publishes comes out of buildDigestData, which fetches and so is not run here:
  // its loop must pick through bestDigestQuotes and nowhere else.
  it('is the only way buildDigestData picks a best price', () => {
    const source = readFileSync(join(__dirname, '../../server/utils/newsletter.ts'), 'utf8')
    const start = source.indexOf('export async function buildDigestData')
    const body = source.slice(start, source.indexOf('\n}\n', start))
    expect(start).toBeGreaterThan(-1)
    expect(body).toMatch(/bestDigestQuotes\(\s*code,/)
    expect(body).not.toMatch(/\.reduce\(/)
    expect(body).not.toMatch(/Math\.(?:min|max)\(/)
  })
})

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
      // The site, the internal news link and, in the Spanish issue, the rentals survey.
      expect(editorial).toHaveLength(lang === 'es' ? 3 : 2)
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

  it('asks Spanish readers for the rentals survey, with the issue attribution', () => {
    const unsub = 'https://cambio-uruguay.com/api/newsletter/unsubscribe?token=abc'
    const es = buildDailyEmail(sample, 'es', unsub)
    const survey = [...es.html.matchAll(/href="([^"]+)"/g)]
      .map(m => m[1]!.replace(/&amp;/g, '&'))
      .find(link => link.includes('/opinion-alquileres'))!
    const url = new URL(survey)
    expect(url.searchParams.get('origen')).toBe('newsletter')
    expect(url.searchParams.get('utm_source')).toBe('newsletter')
    expect(es.text).toContain(survey)
    // The survey is in Spanish: the other issues do not link it.
    expect(buildDailyEmail(sample, 'en', unsub).html).not.toContain('/opinion-alquileres')
    expect(buildDailyEmail(sample, 'pt', unsub).text).not.toContain('/opinion-alquileres')
  })

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
