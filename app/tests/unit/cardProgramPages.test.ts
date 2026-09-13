import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { BANKOS_BANK_BY_CREDIT_PROGRAM } from '../../utils/bankos'
import { bankPageForBankId } from '../../utils/bankosPages'
import {
  CARD_PROGRAM_HEADLINES,
  CARD_PROGRAM_NAMES,
  allCardProgramPages,
  getCardProgramPage,
  rewardNoun,
  type CardProgramPageModel,
} from '../../utils/cardProgramPages'
import {
  CARD_PROGRAMS,
  CARD_REWARDS_LAST_REVIEWED,
  CARD_REWARDS_SOURCES,
  rankedPrograms,
} from '../../utils/cardRewards'
import { getComparativaFamily, getComparativaPair } from '../../utils/comparativas'
import { cardProgramPagePath } from '../../utils/entityPageSlugs'
import {
  BRAND_SUFFIX,
  MAX_DESCRIPTION,
  MAX_TITLE,
  dateLabel,
  ensurePeriod,
} from '../../utils/entityPages'
import { rankingTierForScore } from '../../utils/rankingTiers'

const PAGES = join(__dirname, '..', '..', 'pages')
const pages = allCardProgramPages()
const programOf = (page: CardProgramPageModel) =>
  CARD_PROGRAMS.find(program => program.id === page.id)!

function routeExists(path: string): boolean {
  const clean = (path.split('#')[0] ?? '').split('?')[0] ?? ''
  const family = clean.match(/^\/comparativas\/([^/]+)$/)?.[1]
  if (family) return Boolean(getComparativaFamily(family))
  const rel = clean.replace(/^\//, '')
  return existsSync(join(PAGES, `${rel}.vue`)) || existsSync(join(PAGES, rel, 'index.vue'))
}

const generated = (page: CardProgramPageModel) => [
  page.title,
  page.description,
  page.heading,
  page.lead,
  page.scoreSummary,
]

describe('every credit-card programme gets a page', () => {
  it('builds one model per programme, reachable by its slug', () => {
    expect(pages).toHaveLength(CARD_PROGRAMS.length)
    for (const page of pages) {
      expect(getCardProgramPage(page.slug)?.id).toBe(page.id)
      expect(page.path).toBe(cardProgramPagePath(page.id))
    }
    expect(getCardProgramPage('no-existe')).toBeUndefined()
  })

  it('names every programme once, the way people search it', () => {
    expect(Object.keys(CARD_PROGRAM_NAMES).sort()).toEqual(
      CARD_PROGRAMS.map(program => program.id).sort()
    )
    const names = Object.values(CARD_PROGRAM_NAMES)
    expect(new Set(names).size).toBe(names.length)
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

  it('fits the description in the SERP, opening with the programme’s own figure', () => {
    for (const page of pages) {
      expect(page.description.length, page.description).toBeGreaterThanOrEqual(60)
      expect(page.description.length, page.description).toBeLessThanOrEqual(MAX_DESCRIPTION)
      expect(page.description.startsWith(`${page.name}: ${CARD_PROGRAM_HEADLINES[page.id]}`)).toBe(
        true
      )
    }
  })

  it('never prints a placeholder artefact, FAQ answers included', () => {
    for (const page of pages) {
      const text = [
        ...generated(page),
        page.comparisonsNote ?? '',
        page.sourcesNote ?? '',
        ...page.facts.map(fact => fact.value),
        ...page.faq.flatMap(item => [item.question, item.answer]),
      ].join(' ')
      expect(text).not.toMatch(/\bundefined\b|\bNaN\b|\bnull\b/)
      for (const line of generated(page)) expect(line).not.toMatch(/\s{2,}/)
    }
  })

  // The query that converts in Search Console: "beneficios mastercard black itau".
  it('answers the Itaú Black query in the title itself', () => {
    const black = getCardProgramPage('itau-volar-black')
    expect(black?.title).toContain('Mastercard Black')
    expect(black?.title).toContain('beneficios')
  })
})

describe('rank, score and tier are the ranking’s own', () => {
  it('matches rankedPrograms() and the shared score bands', () => {
    const ranked = rankedPrograms()
    for (const page of pages) {
      const entry = ranked.find(candidate => candidate.id === page.id)!
      expect(page.rank).toBe(entry.rank)
      expect(page.overall).toBe(entry.overall)
      expect(page.of).toBe(ranked.length)
      expect(page.tier).toBe(rankingTierForScore(entry.overall))
      expect(page.scores.map(row => row.score)).toEqual(
        page.scores.map(row => programOf(page).scores[row.id as keyof typeof entry.scores])
      )
    }
  })

  it('dates the ficha with the catalogue review date', () => {
    for (const page of pages) {
      expect(page.reviewedAt).toBe(CARD_REWARDS_LAST_REVIEWED)
      const status = page.facts.find(fact => fact.label === 'Datos confirmados')
      expect(status?.value).toContain(dateLabel(CARD_REWARDS_LAST_REVIEWED))
    }
  })
})

describe('the description headlines restate the ficha', () => {
  it('has one distinct headline per programme', () => {
    expect(Object.keys(CARD_PROGRAM_HEADLINES).sort()).toEqual(
      CARD_PROGRAMS.map(program => program.id).sort()
    )
    const lines = Object.values(CARD_PROGRAM_HEADLINES)
    expect(new Set(lines).size).toBe(lines.length)
  })

  // Every figure in a headline must be one the programme's own notes print: a headline is a
  // restatement, never a new fact.
  it('uses only numbers the programme’s own notes publish', () => {
    const numbers = (text: string) => text.match(/\d+(?:[.,]\d+)*/g) ?? []
    for (const program of CARD_PROGRAMS) {
      const notes = [
        program.pointsProgramName,
        program.earnRateNote,
        program.pointValueNote ?? '',
        program.redemptionNote,
        program.discountNote,
        program.feeNote,
        program.note ?? '',
      ].join(' ')
      const published = new Set(numbers(notes))
      for (const figure of numbers(CARD_PROGRAM_HEADLINES[program.id] ?? '')) {
        expect(published.has(figure), `${program.id}: ${figure}`).toBe(true)
      }
    }
  })
})

describe('the reward noun follows the programme name', () => {
  it('says millas for airline programmes, nothing for cards without points', () => {
    const noun = (id: string) => rewardNoun(CARD_PROGRAMS.find(program => program.id === id)!)
    expect(noun('itau-volar')).toBe('millas')
    expect(noun('itau-latam-pass-internacional')).toBe('millas')
    expect(noun('scotia-connectmiles')).toBe('millas')
    expect(noun('brou-recompensa')).toBe('puntos')
    expect(noun('cabal-uruguay')).toBeNull()
    expect(noun('tarjeta-lider')).toBeNull()
    expect(noun('btg-uruguay-tdc')).toBeNull()
  })
})

describe('the FAQ quotes the ficha instead of paraphrasing it', () => {
  it('asks about the point value only for a programme that has points and a value note', () => {
    for (const page of pages) {
      const program = programOf(page)
      const expected = Boolean(page.rewardNoun && program.pointValueNote)
      expect(
        page.faq.some(item => item.id === 'valor'),
        page.id
      ).toBe(expected)
      expect(
        page.facts.some(fact => fact.label.startsWith('Cuánto vale')),
        page.id
      ).toBe(expected)
    }
  })

  // Cabal and Líder carry a pointValueNote that says "No aplica": a points question there would
  // contradict the ficha that answers it.
  it.each(['cabal', 'tarjeta-lider'])('asks no points question of %s', slug => {
    const page = getCardProgramPage(slug)
    expect(page?.rewardNoun).toBeNull()
    expect(page?.faq.some(item => item.id === 'valor')).toBe(false)
    expect(page?.faq.some(item => /cuánto vale/i.test(item.question))).toBe(false)
    expect(page?.facts.some(fact => fact.label.startsWith('Cuánto vale'))).toBe(false)
  })

  it('answers with the ficha’s own fields', () => {
    for (const page of pages) {
      const program = programOf(page)
      const answer = (id: string) => page.faq.find(item => item.id === id)?.answer
      expect(answer('acumulacion')).toBe(ensurePeriod(program.earnRateNote))
      expect(answer('canje')).toBe(ensurePeriod(program.redemptionNote))
      expect(answer('costo')).toBe(ensurePeriod(program.feeNote))
      expect(answer('descuentos')).toBe(ensurePeriod(program.discountNote))
      expect(answer('ranking')).toContain(`puesto ${page.rank} de ${page.of}`)
      const ids = page.faq.map(item => item.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const item of page.faq) expect(item.question.endsWith('?')).toBe(true)
    }
  })
})

describe('links', () => {
  const inPairing = new Set(
    (getComparativaFamily('tarjetas-de-credito')?.entities ?? []).map(entity => entity.id)
  )

  it('links every head-to-head, or says why the programme has none', () => {
    for (const page of pages) {
      if (inPairing.has(page.id)) {
        expect(page.comparisons).toHaveLength(inPairing.size - 1)
        expect(page.comparisonsNote).toBeNull()
      } else {
        expect(page.comparisons).toEqual([])
        expect(page.comparisonsNote).toContain(String(inPairing.size))
      }
      for (const link of page.comparisons) {
        const [, , family, slug] = link.to.split('/')
        expect(getComparativaPair(family as string, slug as string), link.to).toBeDefined()
      }
    }
  })

  it('links three to five other programmes, the same issuer first', () => {
    for (const page of pages) {
      expect(page.siblings.length).toBeGreaterThanOrEqual(3)
      expect(page.siblings.length).toBeLessThanOrEqual(5)
      for (const link of page.siblings) {
        expect(link.to).not.toBe(page.path)
        expect(pages.some(other => other.path === link.to)).toBe(true)
      }
    }
    const volar = getCardProgramPage('itau-volar')
    expect(volar?.siblings.every(link => link.label.startsWith('Itaú'))).toBe(true)
  })

  it('points to the discounts map only for issuers the map covers', () => {
    for (const page of pages) {
      const bankId = BANKOS_BANK_BY_CREDIT_PROGRAM[page.id]
      expect(Boolean(page.discounts)).toBe(Boolean(bankId))
      if (!page.discounts || !bankId) continue
      expect(page.discounts.mapPath.startsWith('/descuentos-con-tarjeta-uruguay?banco=')).toBe(true)
      const bankPage = bankPageForBankId(bankId)
      expect(page.discounts.bankPagePath).toBe(
        bankPage ? `/descuentos-con-tarjeta-uruguay/${bankPage.slug}` : null
      )
    }
  })

  it('sends readers only to routes that exist', () => {
    for (const page of pages) {
      for (const link of page.tools) expect(routeExists(link.to), link.to).toBe(true)
      expect(page.tools.map(link => link.to)).toContain('/descuentos-con-tarjeta-uruguay')
      expect(page.tools.map(link => link.to)).toContain('/comparativas/tarjetas-de-credito')
    }
  })
})

describe('sources', () => {
  const programIds = new Set(CARD_PROGRAMS.map(program => program.id))

  it('tags every ranking source with programmes that exist', () => {
    for (const source of CARD_REWARDS_SOURCES) {
      expect(source.url).toMatch(/^https:\/\//)
      expect(source.programs.length).toBeGreaterThan(0)
      for (const id of source.programs)
        expect(programIds.has(id), `${source.label}: ${id}`).toBe(true)
    }
    const urls = CARD_REWARDS_SOURCES.map(source => source.url)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('cites on each page only the sources tagged with that programme', () => {
    for (const page of pages) {
      const expected = CARD_REWARDS_SOURCES.filter(source => source.programs.includes(page.id))
      expect(page.sources.map(source => source.url)).toEqual(expected.map(source => source.url))
      expect(Boolean(page.sourcesNote)).toBe(page.sources.length === 0)
    }
  })

  it('keeps one list: the index page prints the same sources', () => {
    const index = readFileSync(join(PAGES, 'tarjetas-de-credito-uruguay', 'index.vue'), 'utf8')
    expect(index).toContain('CARD_REWARDS_SOURCES')
    expect(index).not.toContain("label: 'Itaú — Programa Volar (millas)'")
  })
})
