import { beforeEach, describe, expect, it, vi } from 'vitest'

import { scrapeAllLenderRates, TEA_PARSERS } from '../../server/utils/loanScraper'
import { fetchLenderRateFromGemini } from '../../server/utils/loanGeminiRate'
import { refreshAllLenderRates } from '../../server/utils/loanRateRefresh'
import { lenderIds } from '../../utils/loans'

vi.mock('../../server/utils/loanScraper', async importOriginal => {
  const actual = await importOriginal<typeof import('../../server/utils/loanScraper')>()
  return { ...actual, scrapeAllLenderRates: vi.fn() }
})
vi.mock('../../server/utils/loanGeminiRate', () => ({
  fetchLenderRateFromGemini: vi.fn(),
}))

const mockScrape = vi.mocked(scrapeAllLenderRates)
const mockGemini = vi.mocked(fetchLenderRateFromGemini)

beforeEach(() => {
  mockScrape.mockReset()
  mockGemini.mockReset()
})

describe('refreshAllLenderRates', () => {
  it('uses the regex result and never calls Gemini when the parser succeeds', async () => {
    mockScrape.mockResolvedValue([
      { id: 'oca', teaPct: 39, ok: true },
      { id: 'pronto', teaPct: 49, ok: true },
      { id: 'cash', teaPct: 63.9, ok: true },
    ])
    mockGemini.mockResolvedValue(null)

    const results = await refreshAllLenderRates()

    const oca = results.find(r => r.id === 'oca')
    expect(oca).toEqual({
      id: 'oca',
      teaPct: 39,
      ok: true,
      method: 'regex',
      sourceUrl: TEA_PARSERS.oca!.url,
    })
    expect(mockGemini).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'oca' }))
  })

  it('falls back to Gemini when the parser fails', async () => {
    mockScrape.mockResolvedValue([
      { id: 'oca', teaPct: null, ok: false },
      { id: 'pronto', teaPct: 49, ok: true },
      { id: 'cash', teaPct: 63.9, ok: true },
    ])
    mockGemini.mockImplementation(async lender =>
      lender.id === 'oca' ? { teaPct: 40, sourceUrl: 'https://redirect/oca' } : null
    )

    const results = await refreshAllLenderRates()

    expect(mockGemini).toHaveBeenCalledWith(expect.objectContaining({ id: 'oca' }))
    expect(results.find(r => r.id === 'oca')).toEqual({
      id: 'oca',
      teaPct: 40,
      ok: true,
      method: 'gemini',
      sourceUrl: 'https://redirect/oca',
    })
  })

  it('calls Gemini for every lender with no regex parser', async () => {
    mockScrape.mockResolvedValue([
      { id: 'oca', teaPct: 39, ok: true },
      { id: 'pronto', teaPct: 49, ok: true },
      { id: 'cash', teaPct: 63.9, ok: true },
    ])
    mockGemini.mockResolvedValue({ teaPct: 36, sourceUrl: 'https://redirect/x' })

    await refreshAllLenderRates()

    const nonParserIds = lenderIds().filter(id => !(id in TEA_PARSERS))
    expect(nonParserIds.length).toBeGreaterThan(0)
    for (const id of nonParserIds) {
      expect(mockGemini).toHaveBeenCalledWith(expect.objectContaining({ id }))
    }
  })

  it('keeps ok:false when both the parser and Gemini fail/are absent', async () => {
    mockScrape.mockResolvedValue([
      { id: 'oca', teaPct: 39, ok: true },
      { id: 'pronto', teaPct: 49, ok: true },
      { id: 'cash', teaPct: 63.9, ok: true },
    ])
    mockGemini.mockResolvedValue(null)

    const results = await refreshAllLenderRates()

    const itau = results.find(r => r.id === 'itau')
    expect(itau).toEqual({ id: 'itau', teaPct: null, ok: false, method: 'gemini' })
  })

  it('covers every lender id exactly once', async () => {
    mockScrape.mockResolvedValue([
      { id: 'oca', teaPct: 39, ok: true },
      { id: 'pronto', teaPct: 49, ok: true },
      { id: 'cash', teaPct: 63.9, ok: true },
    ])
    mockGemini.mockResolvedValue(null)

    const results = await refreshAllLenderRates()

    expect(results.map(r => r.id).sort()).toEqual([...lenderIds()].sort())
  })
})
