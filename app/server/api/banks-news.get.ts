// Recent news + AI sector analysis for the bank tier list (/mejores-bancos-uruguay).
// Grounded Gemini finds real cited headlines per entity; cost/latency is bounded by
// a long cache TTL (the daily "refresh"), with a generous stale window so a cold or
// failed upstream never leaves the page empty.
import { buildBanksBriefing } from '../utils/banksNews'

const LANGS = ['es', 'en', 'pt']

export default defineCachedEventHandler(
  async event => {
    let lang = String(getQuery(event).lang || 'es').slice(0, 2)
    if (!LANGS.includes(lang)) lang = 'es'
    return buildBanksBriefing(lang)
  },
  {
    maxAge: 60 * 60 * 24, // regenerate at most once a day
    staleMaxAge: 60 * 60 * 24 * 7, // serve stale up to a week if a refresh fails
    name: 'banks-news-uy',
    getKey: event => 'banks-' + String(getQuery(event).lang || 'es').slice(0, 2),
  }
)
