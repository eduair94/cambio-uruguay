// What /api/banks-news serves when the backend is unreachable. Deliberately empty, not fabricated:
// the page renders the tier list from its own static data and simply shows no news cards. There is
// no honest offline substitute for "what happened to Itaú this month".
export interface GroundedHeadline {
  title: string
  source: string
  link: string
}
export interface BankNewsItem {
  id: string
  name: string
  insight: string | null
  headlines: GroundedHeadline[]
}
export interface BanksBriefing {
  items: BankNewsItem[]
  analysis: string | null
  asOf: string
  unavailable: boolean
}

export const BANKS_NEWS_FALLBACK: BanksBriefing = {
  items: [],
  analysis: null,
  asOf: new Date(0).toISOString(),
  unavailable: true,
}
