import { describe, expect, it } from 'vitest'
import { buildDailyTelegram, type DigestData } from '../../server/utils/newsletter'

const data: DigestData = {
  date: '2026-06-18',
  currencies: [
    { code: 'USD', bestSellRate: 40.3, changePct: -0.37, bestBuyHouse: 'Itaú' },
    { code: 'EUR', bestSellRate: 48.47, changePct: 0.12, bestBuyHouse: 'BROU' },
  ],
  news: [{ title: 'Dólar hoy', link: 'https://x', source: 'Infobae' }],
  ai: 'Resumen del mercado.',
}

describe('buildDailyTelegram', () => {
  it('includes date, each currency code, rate and a news item (es)', () => {
    const msg = buildDailyTelegram(data, 'es')
    expect(msg).toContain('2026-06-18')
    expect(msg).toContain('USD')
    expect(msg).toContain('EUR')
    expect(msg).toContain('40,30')
    expect(msg).toContain('Dólar hoy')
  })

  it('renders a down arrow for negative change and up for positive', () => {
    const msg = buildDailyTelegram(data, 'es')
    expect(msg).toContain('🔻')
    expect(msg).toContain('🔺')
  })

  it('uses a localized header per language', () => {
    expect(buildDailyTelegram(data, 'en')).toContain('Daily dollar digest')
    expect(buildDailyTelegram(data, 'pt')).toContain('Resumo do dólar')
  })
})
