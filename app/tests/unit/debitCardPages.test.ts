import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { BANKOS_BANK_BY_DEBIT_CARD } from '../../utils/bankos'
import { getComparativaFamily, getComparativaPair } from '../../utils/comparativas'
import {
  DEBIT_EXAMPLE_USD,
  allDebitCardPages,
  commissionPhrase,
  getDebitCardPage,
  type DebitCardPageModel,
} from '../../utils/debitCardPages'
import {
  DEBIT_CARDS,
  DEBIT_CARDS_LAST_REVIEWED,
  estimateIntlCost,
  rankedCards,
} from '../../utils/debitCards'
import { debitCardPagePath } from '../../utils/entityPageSlugs'
import { BRAND_SUFFIX, MAX_TITLE, dateLabel, formatNumberEs } from '../../utils/entityPages'
import { rankingTierForScore } from '../../utils/rankingTiers'

const PAGES = join(__dirname, '..', '..', 'pages')
const pages = allDebitCardPages()
const cardOf = (page: DebitCardPageModel) => DEBIT_CARDS.find(card => card.id === page.id)!

function routeExists(path: string): boolean {
  const clean = (path.split('#')[0] ?? '').split('?')[0] ?? ''
  const family = clean.match(/^\/comparativas\/([^/]+)$/)?.[1]
  if (family) return Boolean(getComparativaFamily(family))
  const rel = clean.replace(/^\//, '')
  return existsSync(join(PAGES, `${rel}.vue`)) || existsSync(join(PAGES, rel, 'index.vue'))
}

const generated = (page: DebitCardPageModel) => [
  page.title,
  page.description,
  page.heading,
  page.scoreSummary,
]

describe('every debit and prepaid card gets a page', () => {
  it('builds one model per card, reachable by its slug', () => {
    expect(pages).toHaveLength(DEBIT_CARDS.length)
    for (const page of pages) {
      expect(getDebitCardPage(page.slug)?.id).toBe(page.id)
      expect(page.path).toBe(debitCardPagePath(page.id))
    }
    expect(getDebitCardPage('no-existe')).toBeUndefined()
  })

  it('fits every title in the SERP with the brand appended', () => {
    for (const page of pages) {
      const rendered = `${page.title}${BRAND_SUFFIX}`
      expect(rendered.length, rendered).toBeLessThanOrEqual(MAX_TITLE)
      expect(page.title.startsWith(page.name)).toBe(true)
    }
  })

  it('keeps titles, headings and descriptions distinct across the family', () => {
    expect(new Set(pages.map(page => page.title)).size).toBe(pages.length)
    expect(new Set(pages.map(page => page.heading)).size).toBe(pages.length)
    expect(new Set(pages.map(page => page.description)).size).toBe(pages.length)
  })

  it('writes a description a SERP can show, dated with the review', () => {
    for (const page of pages) {
      expect(page.description.length, page.description).toBeGreaterThanOrEqual(100)
      expect(page.description.length, page.description).toBeLessThanOrEqual(230)
      expect(page.description).toContain(page.name)
      expect(page.description).toContain(dateLabel(DEBIT_CARDS_LAST_REVIEWED))
    }
  })

  it('never prints a placeholder artefact', () => {
    for (const page of pages) {
      const text = [
        ...generated(page),
        page.example?.position ?? '',
        ...page.facts.map(fact => fact.value),
        ...page.faq.flatMap(item => [item.question, item.answer]),
      ].join(' ')
      expect(text).not.toMatch(/\bundefined\b|\bNaN\b|\bnull\b/)
      for (const line of generated(page)) expect(line).not.toMatch(/\s{2,}/)
    }
  })
})

describe('the figures are the ficha’s and the ranking’s', () => {
  it('matches rankedCards() and the shared score bands', () => {
    const ranked = rankedCards()
    for (const page of pages) {
      const entry = ranked.find(candidate => candidate.id === page.id)!
      expect(page.rank).toBe(entry.rank)
      expect(page.overall).toBe(entry.overall)
      expect(page.of).toBe(ranked.length)
      expect(page.tier).toBe(rankingTierForScore(entry.overall))
    }
  })

  it('states the commission from the ficha’s own fields', () => {
    for (const card of DEBIT_CARDS) {
      const phrase = commissionPhrase(card)
      if (card.comisionExteriorPct === null) {
        expect(phrase).toContain('no publica')
      } else if (card.comisionExteriorPct === 0 && !(card.cargoFijoUsd ?? 0)) {
        expect(phrase).toBe('no cobra comisión por compra en el exterior')
      } else {
        expect(phrase).toContain(`${formatNumberEs(card.comisionExteriorPct)}%`)
        expect(phrase.includes('IVA')).toBe(card.ivaSobreComision)
      }
    }
  })

  it('works the example purchase with the index calculator', () => {
    for (const page of pages) {
      const card = cardOf(page)
      if (card.comisionExteriorPct === null) {
        expect(page.example).toBeNull()
        continue
      }
      const cost = estimateIntlCost({ purchaseUsd: DEBIT_EXAMPLE_USD, card, fxVenta: 1 })
      expect(page.example?.comisionUsd).toBe(cost.comisionUsd)
      expect(page.example?.ivaUsd).toBe(cost.ivaUsd)
      expect(page.example?.subtotalUsd).toBe(cost.subtotalUsd)
      // A commission comparison must say what it leaves out.
      expect(page.example?.position).toContain('sólo de comisión')
      if (cost.comisionUsd === 0 && cost.ivaUsd === 0) expect(page.example?.rank).toBe(1)
    }
  })

  it('answers the dollar-balance question with the ficha’s yes or no', () => {
    for (const page of pages) {
      const answer = page.faq.find(item => item.id === 'saldo-en-dolares')?.answer ?? ''
      expect(answer.startsWith(cardOf(page).fundeaEnUsd ? 'Sí.' : 'No.')).toBe(true)
    }
  })

  it('does not claim a tariff says "no IVA" when it only fails to mention it', () => {
    const brou = getDebitCardPage('brou-debito')
    expect(brou?.facts.find(fact => fact.label === 'IVA sobre la comisión')?.value).toBe(
      'No figura en el tarifario'
    )
  })

  it('links the yield explainer only when there is a fund behind it', () => {
    for (const page of pages) {
      const productId = cardOf(page).yieldOnBalance.productId
      expect(page.yieldLink).toBe(
        productId ? `/cuenta-remunerada-uruguay#producto-${productId}` : null
      )
    }
  })
})

describe('links and sources', () => {
  it('links every head-to-head the card takes part in', () => {
    for (const page of pages) {
      expect(page.comparisons).toHaveLength(DEBIT_CARDS.length - 1)
      for (const link of page.comparisons) {
        const [, , family, slug] = link.to.split('/')
        expect(getComparativaPair(family as string, slug as string), link.to).toBeDefined()
      }
    }
  })

  it('links three to five other cards, never itself', () => {
    for (const page of pages) {
      expect(page.siblings.length).toBeGreaterThanOrEqual(3)
      expect(page.siblings.length).toBeLessThanOrEqual(5)
      for (const link of page.siblings) {
        expect(link.to).not.toBe(page.path)
        expect(pages.some(other => other.path === link.to)).toBe(true)
      }
    }
  })

  it('points to the discounts map only for issuers the map covers', () => {
    for (const page of pages) {
      expect(Boolean(page.discounts)).toBe(Boolean(BANKOS_BANK_BY_DEBIT_CARD[page.id]))
    }
  })

  it('sends readers only to routes that exist', () => {
    for (const page of pages) {
      for (const link of page.tools) expect(routeExists(link.to), link.to).toBe(true)
      if (page.yieldLink) expect(routeExists(page.yieldLink)).toBe(true)
    }
  })

  it('cites exactly the ficha’s own sources', () => {
    for (const page of pages) {
      expect(page.sources.map(source => source.url)).toEqual(
        cardOf(page).sources.map(source => source.url)
      )
      for (const source of page.sources) expect(source.url).toMatch(/^https:\/\//)
    }
  })
})
