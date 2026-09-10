// Copy shape for /equipar-casa-uruguay. The three locales live in equiparEs/En/Pt, same as the
// other guide pages.

export interface EquiparNavItem {
  id: string
  label: string
}

export interface EquiparNote {
  title: string
  text: string
}

export interface EquiparCopy {
  eyebrow: string
  title: string
  shortTitle: string
  description: string
  intro: string
  navLabel: string
  nav: EquiparNavItem[]

  quickTitle: string
  quickIntro: string
  basketBlurbs: Record<'minima' | 'decente' | 'completa', string>
  basketPartial: string
  basketMissing: string
  basketComplete: string
  basketItems: string
  perMonth: string

  tierTitle: string
  tierIntro: string
  tierNames: Record<'S' | 'A' | 'B' | 'C', { name: string; blurb: string }>
  colItem: string
  colNew: string
  colUsed: string
  colSaving: string
  colWhy: string
  noData: string
  noUsedData: string
  usedNotAdvised: string
  quantityLabel: string
  observations: string

  calcTitle: string
  calcIntro: string
  calcBudget: string
  calcAcceptUsed: string
  calcOwnedTitle: string
  calcOwnedHint: string
  calcReach: string
  calcCut: string
  calcCovered: string
  calcLeftover: string
  calcMissing: string
  calcEmpty: string
  reset: string

  notesTitle: string
  notesIntro: string
  notes: EquiparNote[]
  threadCredit: string

  methodTitle: string
  method: string[]
  sourcesLabel: string

  faqTitle: string
  faq: Array<{ q: string; a: string }>

  updated: string
  noPrices: string
  relatedTitle: string
  related: Array<{ to: string; label: string; hint: string }>
}

export const EQUIPAR_PATH = '/equipar-casa-uruguay'

/** The r/uruguay thread that started this page. Cited, not scraped. */
export const EQUIPAR_THREAD = 'https://www.reddit.com/r/uruguay/comments/1w9c2r6/independizarse/'
