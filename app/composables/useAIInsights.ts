import { ref } from 'vue'

interface AIInsightResponse {
  insight: string
  type: string
  timestamp: string
  language: string
  cached: boolean
  truncated?: boolean
  finishReason?: string
}

interface AIStatusResponse {
  configured: boolean
  model: string
  availableTypes: string[]
  supportedLanguages: string[]
  cacheEnabled: boolean
  cacheTTL: string
}

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1500
const FETCH_TIMEOUT_MS = 75000 // 75 seconds (server timeout is 60s)

export const useAIInsights = () => {
  const config = useRuntimeConfig()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const insight = ref<AIInsightResponse | null>(null)
  const aiStatus = ref<AIStatusResponse | null>(null)

  const getApiBaseUrl = (): string => {
    return import.meta.server ? config.apiBaseServer : config.public.apiBase
  }

  /**
   * Validate that the AI response is usable (not empty/broken)
   */
  const isValidResponse = (data: AIInsightResponse): boolean => {
    if (!data || !data.insight) return false
    // A valid insight should have meaningful content (at least 20 chars)
    const cleanInsight = data.insight.replace(/\s+/g, ' ').trim()
    return cleanInsight.length >= 20
  }

  /**
   * Check if the AI service is available
   */
  const checkAIStatus = async (): Promise<AIStatusResponse | null> => {
    try {
      const data = await $fetch<AIStatusResponse>('/ai/status', {
        baseURL: getApiBaseUrl(),
        timeout: 10000,
      })
      aiStatus.value = data
      return data
    } catch (e: any) {
      console.error('AI status check failed:', e)
      aiStatus.value = null
      return null
    }
  }

  /**
   * Fetch with timeout support
   */
  const fetchWithTimeout = async <T>(url: string, options: Record<string, any>): Promise<T> => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      return (await $fetch(url, {
        ...options,
        signal: controller.signal,
      })) as T
    } finally {
      clearTimeout(timeout)
    }
  }

  /**
   * Get AI-generated insight with retry logic
   */
  const getInsight = async (
    type: 'market_summary' | 'currency_analysis' | 'best_rates' | 'trend_analysis' | 'custom',
    language: string = 'es',
    options: {
      currency?: string
      origin?: string
      customPrompt?: string
    } = {}
  ): Promise<AIInsightResponse | null> => {
    loading.value = true
    error.value = null
    insight.value = null

    const body: Record<string, any> = {
      type,
      language,
    }

    if (options.currency) body.currency = options.currency
    if (options.origin) body.origin = options.origin
    if (options.customPrompt) body.customPrompt = options.customPrompt

    let lastError: any = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.warn(`AI insight retry attempt ${attempt}/${MAX_RETRIES}`)
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt))
        }

        const data = await fetchWithTimeout<AIInsightResponse>('/ai/insights', {
          baseURL: getApiBaseUrl(),
          method: 'POST',
          body,
        })

        // Validate the response quality
        if (!isValidResponse(data)) {
          console.warn(
            `AI response failed validation (attempt ${attempt + 1}): insight length=${data?.insight?.length || 0}`
          )
          lastError = new Error('AI returned an incomplete response')
          // Don't retry for truncated responses that have some content - show what we have
          if (data?.truncated && data.insight && data.insight.length > 50) {
            insight.value = data
            loading.value = false
            return data
          }
          continue
        }

        insight.value = data
        loading.value = false
        return data
      } catch (e: any) {
        lastError = e
        const isAbort = e?.name === 'AbortError'
        const isTimeout =
          isAbort || e?.message?.includes('timeout') || e?.message?.includes('timed out')
        const isServerError = e?.status >= 500

        console.error(`AI insight error (attempt ${attempt + 1}):`, e?.message || e)

        // Only retry on timeouts and server errors, not on 4xx client errors
        if (!isTimeout && !isServerError) {
          break
        }
      }
    }

    // All attempts failed
    const errorMsg =
      lastError?.data?.message || lastError?.data?.error || lastError?.message || 'Unknown error'
    error.value = errorMsg
    loading.value = false
    return null
  }

  /**
   * Get a market summary insight
   */
  const getMarketSummary = (language: string = 'es') => {
    return getInsight('market_summary', language)
  }

  /**
   * Get a currency-specific analysis
   */
  const getCurrencyAnalysis = (currency: string, language: string = 'es') => {
    return getInsight('currency_analysis', language, { currency })
  }

  /**
   * Get best rates analysis
   */
  const getBestRates = (language: string = 'es') => {
    return getInsight('best_rates', language)
  }

  /**
   * Get trend analysis for a currency
   */
  const getTrendAnalysis = (currency: string, language: string = 'es', origin?: string) => {
    return getInsight('trend_analysis', language, { currency, origin })
  }

  /**
   * Ask a custom question
   */
  const askCustom = (question: string, language: string = 'es') => {
    return getInsight('custom', language, { customPrompt: question })
  }

  return {
    loading,
    error,
    insight,
    aiStatus,
    checkAIStatus,
    getInsight,
    getMarketSummary,
    getCurrencyAnalysis,
    getBestRates,
    getTrendAnalysis,
    askCustom,
  }
}
