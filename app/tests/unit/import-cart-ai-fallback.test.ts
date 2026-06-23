import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// The import-cart AI utils (estimateWeightKg / classifyProductCategory) call the
// real `chatTextWithFallback`, which uses two Nitro auto-import globals at
// runtime: `useRuntimeConfig()` for credentials/apiBase and `$fetch` for both the
// direct wormgpt call and the backend `/ai/insights` fallback. We stub both so we
// can drive each branch. The whole point of the fix under test: these features
// must work via the `/ai/insights` fallback when this app has NO direct AI key.

const $fetch = vi.fn()
const useRuntimeConfig = vi.fn()
vi.stubGlobal('$fetch', $fetch)
vi.stubGlobal('useRuntimeConfig', useRuntimeConfig)

const { estimateWeightKg } = await import('../../server/utils/weightEstimate')
const { classifyProductCategory } = await import('../../server/utils/productClassify')

// No direct AI key (the deployed reality) -> chatCompletion short-circuits to null
// and the code must fall back to POST {apiBase}/ai/insights.
const NO_KEY_CONFIG = {
  ai: { apiKey: '', baseUrl: 'https://wormgpt.example/v1', model: 'wormv5.1' },
  public: { apiBase: 'https://api.example' },
}
// Direct key present -> chatCompletion calls the wormgpt chat-completions endpoint.
const WITH_KEY_CONFIG = {
  ai: { apiKey: 'sk-test', baseUrl: 'https://wormgpt.example/v1', model: 'wormv5.1' },
  public: { apiBase: 'https://api.example' },
}

beforeEach(() => {
  $fetch.mockReset()
  useRuntimeConfig.mockReset()
})
afterEach(() => {
  vi.clearAllMocks()
})

describe('estimateWeightKg', () => {
  it('falls back to /ai/insights when no direct key, and parses the weight', async () => {
    useRuntimeConfig.mockReturnValue(NO_KEY_CONFIG)
    $fetch.mockResolvedValueOnce({ insight: 'The shipping weight is about 2.5 kg with packaging.' })

    const kg = await estimateWeightKg('RTX 5080')

    expect(kg).toBe(2.5)
    expect($fetch).toHaveBeenCalledTimes(1)
    const [url, opts] = $fetch.mock.calls[0] as [string, any]
    expect(url).toBe('/ai/insights')
    expect(opts.baseURL).toBe('https://api.example')
    expect(opts.method).toBe('POST')
    expect(opts.body.type).toBe('custom')
    // The system instruction must be folded into the single custom prompt.
    expect(opts.body.customPrompt).toContain('shipping weight')
    expect(opts.body.customPrompt).toContain('RTX 5080')
  })

  it('uses the direct wormgpt endpoint when a key is configured', async () => {
    useRuntimeConfig.mockReturnValue(WITH_KEY_CONFIG)
    $fetch.mockResolvedValueOnce({ choices: [{ message: { content: '0.8 kg' } }] })

    const kg = await estimateWeightKg('RTX 5080')

    expect(kg).toBe(0.8)
    const [url] = $fetch.mock.calls[0] as [string, any]
    expect(url).toContain('/chat/completions')
  })

  it('returns null (no fallback attempted) when apiBase is missing', async () => {
    useRuntimeConfig.mockReturnValue({ ai: { apiKey: '' }, public: {} })
    const kg = await estimateWeightKg('RTX 5080')
    expect(kg).toBeNull()
    expect($fetch).not.toHaveBeenCalled()
  })

  it('returns null when the fallback errors (e.g. provider 402)', async () => {
    useRuntimeConfig.mockReturnValue(NO_KEY_CONFIG)
    $fetch.mockRejectedValueOnce(new Error('502 Bad Gateway'))
    const kg = await estimateWeightKg('RTX 5080')
    expect(kg).toBeNull()
  })
})

describe('classifyProductCategory', () => {
  it('falls back to /ai/insights and picks a valid catalog id from prose', async () => {
    useRuntimeConfig.mockReturnValue(NO_KEY_CONFIG)
    // A graphics card is electronics; the pure pickCategoryId tolerates prose.
    $fetch.mockResolvedValueOnce({ insight: 'This product belongs to category: electronica' })

    const id = await classifyProductCategory('RTX 5080')

    expect(id).toBe('electronica')
    const [url, opts] = $fetch.mock.calls[0] as [string, any]
    expect(url).toBe('/ai/insights')
    expect(opts.body.customPrompt).toContain('RTX 5080')
  })

  it('returns null when the reply has no known category id', async () => {
    useRuntimeConfig.mockReturnValue(NO_KEY_CONFIG)
    $fetch.mockResolvedValueOnce({ insight: 'I am not sure what this is.' })
    const id = await classifyProductCategory('RTX 5080')
    expect(id).toBeNull()
  })
})
