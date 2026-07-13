// Bank/fintech news, proxied from the backend (pm2 `currency-banks-news` generates it daily) and
// cached at the edge. Zero business logic, zero Gemini: this route only forwards and falls back.
import { BANKS_NEWS_FALLBACK, type BanksBriefing } from '../utils/banksNewsFallback'

const LANGS = ['es', 'en', 'pt']

export default defineCachedEventHandler(
  async (event): Promise<BanksBriefing> => {
    let lang = String(getQuery(event).lang || 'es').slice(0, 2)
    if (!LANGS.includes(lang)) lang = 'es'
    const base = useRuntimeConfig().apiBaseServer
    try {
      const res = await $fetch<BanksBriefing>(`${base}/banks-news`, {
        query: { lang },
        timeout: 8000,
      })
      return res?.items?.length ? res : BANKS_NEWS_FALLBACK
    } catch {
      return BANKS_NEWS_FALLBACK
    }
  },
  {
    maxAge: 60 * 60 * 6,
    staleMaxAge: 60 * 60 * 24 * 7,
    name: 'banks-news-uy',
    getKey: event => 'banks-' + String(getQuery(event).lang || 'es').slice(0, 2),
  }
)
