import { ref } from 'vue'

interface AIInsightResponse {
  insight: string
  type: string
  timestamp: string
  language: string
  cached: boolean
}

interface AIStatusResponse {
  configured: boolean
  model: string
  availableTypes: string[]
  supportedLanguages: string[]
  cacheEnabled: boolean
  cacheTTL: string
}

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
   * Check if the AI service is available
   */
  const checkAIStatus = async (): Promise<AIStatusResponse | null> => {
    try {
      const data = await $fetch<AIStatusResponse>('/ai/status', {
        baseURL: getApiBaseUrl(),
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
   * Get AI-generated insight
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

    try {
      const body: Record<string, any> = {
        type,
        language,
      }

      if (options.currency) body.currency = options.currency
      if (options.origin) body.origin = options.origin
      if (options.customPrompt) body.customPrompt = options.customPrompt

      const data = await $fetch<AIInsightResponse>('/ai/insights', {
        baseURL: getApiBaseUrl(),
        method: 'POST',
        body,
      })

      insight.value = data
      return data
    } catch (e: any) {
      console.error('AI insight error:', e)
      const errorMsg = e?.data?.message || e?.data?.error || e?.message || 'Unknown error'
      error.value = errorMsg
      return null
    } finally {
      loading.value = false
    }
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
