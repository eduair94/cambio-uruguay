import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const $fetch = vi.fn()
const useRuntimeConfig = vi.fn()
vi.stubGlobal('$fetch', $fetch)
vi.stubGlobal('useRuntimeConfig', useRuntimeConfig)

const LENDER = {
  id: 'itau',
  name: 'Itaú Uruguay',
  website: 'https://www.itau.com.uy',
  source: 'https://www.itau.com.uy/inst/preAprobados.html',
}

const WITH_KEY = { geminiApiKey: 'test-key' }

function geminiResponse(text: string, chunks: Array<{ uri: string; title: string }> = []) {
  return {
    candidates: [
      {
        content: { parts: [{ text }] },
        groundingMetadata: {
          groundingChunks: chunks.map(c => ({ web: { uri: c.uri, title: c.title } })),
          groundingSupports:
            chunks.length > 0
              ? [
                  {
                    segment: { endIndex: text.length, text },
                    groundingChunkIndices: chunks.map((_, i) => i),
                  },
                ]
              : [],
        },
      },
    ],
  }
}

beforeEach(() => {
  $fetch.mockReset()
  useRuntimeConfig.mockReset()
})

afterEach(() => {
  vi.resetModules()
})

describe('fetchLenderRateFromGemini', () => {
  it('returns null when no Gemini API key is configured', async () => {
    useRuntimeConfig.mockReturnValue({ geminiApiKey: '' })
    const { fetchLenderRateFromGemini } = await import('../../server/utils/loanGeminiRate')
    expect(await fetchLenderRateFromGemini(LENDER)).toBeNull()
    expect($fetch).not.toHaveBeenCalled()
  })

  it('returns the TEA when grounded by a citation matching the lender\'s own domain', async () => {
    useRuntimeConfig.mockReturnValue(WITH_KEY)
    $fetch.mockResolvedValueOnce(
      geminiResponse('TEA: 36%', [{ uri: 'https://redirect.example/AAA', title: 'www.itau.com.uy' }])
    )
    const { fetchLenderRateFromGemini } = await import('../../server/utils/loanGeminiRate')
    expect(await fetchLenderRateFromGemini(LENDER)).toEqual({
      teaPct: 36,
      sourceUrl: 'https://redirect.example/AAA',
    })
  })

  it('rejects when the only citation is off-domain', async () => {
    useRuntimeConfig.mockReturnValue(WITH_KEY)
    $fetch.mockResolvedValueOnce(
      geminiResponse('TEA: 36%', [{ uri: 'https://redirect.example/BBB', title: 'otrapagina.com' }])
    )
    const { fetchLenderRateFromGemini } = await import('../../server/utils/loanGeminiRate')
    expect(await fetchLenderRateFromGemini(LENDER)).toBeNull()
  })

  it('rejects an ungrounded answer (no citations at all)', async () => {
    useRuntimeConfig.mockReturnValue(WITH_KEY)
    $fetch.mockResolvedValueOnce(geminiResponse('TEA: 36%', []))
    const { fetchLenderRateFromGemini } = await import('../../server/utils/loanGeminiRate')
    expect(await fetchLenderRateFromGemini(LENDER)).toBeNull()
  })

  it('rejects an implausible TEA even when grounded on-domain', async () => {
    useRuntimeConfig.mockReturnValue(WITH_KEY)
    $fetch.mockResolvedValueOnce(
      geminiResponse('TEA: 999%', [{ uri: 'https://redirect.example/CCC', title: 'itau.com.uy' }])
    )
    const { fetchLenderRateFromGemini } = await import('../../server/utils/loanGeminiRate')
    expect(await fetchLenderRateFromGemini(LENDER)).toBeNull()
  })

  it('returns null for the "not found" sentinel reply', async () => {
    useRuntimeConfig.mockReturnValue(WITH_KEY)
    $fetch.mockResolvedValueOnce(geminiResponse('TEA: NO ENCONTRADO', []))
    const { fetchLenderRateFromGemini } = await import('../../server/utils/loanGeminiRate')
    expect(await fetchLenderRateFromGemini(LENDER)).toBeNull()
  })

  it('returns null when the Gemini request throws', async () => {
    useRuntimeConfig.mockReturnValue(WITH_KEY)
    $fetch.mockRejectedValueOnce(new Error('502 Bad Gateway'))
    const { fetchLenderRateFromGemini } = await import('../../server/utils/loanGeminiRate')
    expect(await fetchLenderRateFromGemini(LENDER)).toBeNull()
  })
})
