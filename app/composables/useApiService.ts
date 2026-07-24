import { saveSnapshot, loadSnapshot, resolveExchangeResult } from '~/utils/ratesSnapshot'
import type { PreferentialRatesCatalog } from '~/types/api'

// Define interfaces for API responses
interface GeocodeData {
  lat: string
  lon: string
}

interface ReverseGeocodeResponse {
  data: Array<{
    label: string
    [key: string]: any // Allow additional properties
  }>
}

interface DistanceResponse {
  distanceData: any
  [key: string]: any // Allow additional properties
}

interface HealthResponse {
  lastSync?: string
  status?: string
  sync?: {
    available?: boolean
    lastSync?: string
    minutesAgo?: number
    [key: string]: any
  }
  [key: string]: any // Allow additional properties
}

// Memory optimization: Use Map for cached responses with cleanup
const responseCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 100 // Limit cache size

// Cleanup expired cache entries periodically
if (typeof window !== 'undefined') {
  const cleanup = () => {
    const now = Date.now()
    const entries = Array.from(responseCache.entries())

    // Remove expired entries
    for (const [key, { timestamp }] of entries) {
      if (now - timestamp > CACHE_DURATION) {
        responseCache.delete(key)
      }
    }

    // If still too many entries, remove oldest
    if (responseCache.size > MAX_CACHE_SIZE) {
      const sortedEntries = entries
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)
        .slice(0, responseCache.size - MAX_CACHE_SIZE)

      for (const [key] of sortedEntries) {
        responseCache.delete(key)
      }
    }
  }

  setInterval(cleanup, 60 * 1000) // Cleanup every minute

  // Clear cache on page unload to prevent memory leaks
  window.addEventListener('beforeunload', () => {
    responseCache.clear()
  })
}

export const useApiService = () => {
  const config = useRuntimeConfig()

  /**
   * Get the appropriate API base URL based on environment
   * Uses server-side URL for SSR, client-side URL for browser
   */
  const getApiBaseUrl = (): string => {
    return import.meta.server ? config.apiBaseServer : config.public.apiBase
  }

  /**
   * Fetch exchange data for a specific date
   */
  const getExchangeData = async (date: string): Promise<any> => {
    return await $fetch('/', {
      baseURL: getApiBaseUrl(),
      query: { date: date || undefined },
    }).catch(error => {
      // Extract detailed error information
      const errorResponse = error.response?.data || error.data || null
      if (errorResponse) {
        return errorResponse
      } else {
        return {
          error: 'Ha ocurrido un error',
        }
      }
    })
  }

  /**
   * Fetch local data (exchange house information)
   */
  const getLocalData = async (): Promise<any> => {
    return await $fetch('/localData', {
      baseURL: getApiBaseUrl(),
    }).catch(error => {
      // Extract detailed error information
      const errorResponse = error.response?.data || error.data || null
      if (errorResponse) {
        return errorResponse
      } else {
        return {
          error: 'Ha ocurrido un error',
        }
      }
    })
  }

  const getAllLocations = async (): Promise<any[]> => {
    try {
      return await $fetch('/api/locations')
    } catch (error) {
      console.error('Error fetching map locations:', error)
      return []
    }
  }

  const getCashPoints = async (): Promise<any[]> => {
    try {
      return await $fetch('/api/cash-points')
    } catch (error) {
      console.error('Error fetching cash points:', error)
      return []
    }
  }

  /**
   * Fetch both exchange data and local data in parallel
   */
  const getExchangeDataWithLocal = async (date: string) => {
    const [exchangeData, localData] = await Promise.all([getExchangeData(date), getLocalData()])

    return {
      exchangeData,
      localData,
    }
  }

  /**
   * Process raw exchange data by adding local data and additional properties
   */
  const processExchangeData = (rawData: any, localData: any) => {
    if (!rawData || (Array.isArray(rawData) && rawData.length === 0)) {
      return []
    }

    // Ensure rawData is an array
    const dataArray = Array.isArray(rawData) ? rawData : [rawData]

    return dataArray
      .map((el: any) => {
        el.localData = localData[el.origin]
        if (!el.localData) {
          el.localData = null
        }

        // Determine if it's an interbank transaction
        el.isInterBank = el.origin === 'bcu' || ['INTERBANCARIO', 'FONDO/CABLE'].includes(el.type)

        // Add condition based on origin/type
        if (el.origin === 'prex') {
          el.condition = 'prex_condition'
        } else if (el.type === 'EBROU') {
          el.condition = 'ebrou_condition'
        } else {
          el.condition = ''
        }

        return el
      })
      .filter((el: any) => el.localData) // Only keep items with valid local data
  }

  const getLocations = (localData: any) => {
    const locations = ['TODOS', 'MONTEVIDEO']

    // Extract departments from localData
    for (const key in localData) {
      const val = localData[key]
      const departments = val.departments
      if (departments?.length) {
        for (const dep of departments) {
          if (!locations.includes(dep)) {
            locations.push(dep)
          }
        }
      }
    }
    return locations
  }

  /**
   * Get processed exchange data for a specific date
   */
  const getProcessedExchangeData = async (date: string) => {
    // "Current" means today's rates — callers pass either '' (default/today) or
    // today's Montevideo date string (e.g. useExchangeRates / the home table).
    const todayMvd = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Montevideo' })
    const isCurrent = date === '' || date === todayMvd
    try {
      const { exchangeData, localData } = await getExchangeDataWithLocal(date)

      // Check for errors in the response
      const exchangeError = exchangeData?.error
      const localDataError = localData?.error

      const live =
        exchangeError || localDataError
          ? {
              error: exchangeError,
              exchangeData: [] as any[],
              localData: localDataError ? {} : localData,
              locations: localDataError ? [] : getLocations(localData),
            }
          : {
              error: null,
              exchangeData: processExchangeData(exchangeData, localData),
              localData,
              locations: getLocations(localData),
            }

      // Snapshot only applies to the current day's rates (date === '').
      if (!isCurrent) return live
      if (import.meta.client && live.error == null && live.exchangeData.length > 0) {
        saveSnapshot({
          exchangeData: live.exchangeData,
          localData: live.localData,
          locations: live.locations,
        })
        return resolveExchangeResult(live, null)
      }
      return resolveExchangeResult(live, import.meta.client ? loadSnapshot() : null)
    } catch (error: any) {
      console.error('API Error for date', date, ':', error)

      // Create detailed error response
      const errorResponse = {
        message: error?.message || 'An error occurred while fetching exchange data',
        status: error?.status || null,
        statusText: error?.statusText || null,
        data: error?.data || null,
        stack: error?.stack || null,
        originalError: error,
      }

      // Offline / network failure for today: serve the last good snapshot if we have one.
      if (isCurrent && import.meta.client) {
        const snap = loadSnapshot()
        if (snap) {
          return resolveExchangeResult(
            { error: errorResponse, exchangeData: [], localData: {}, locations: [] },
            snap
          )
        }
      }

      return {
        exchangeData: [],
        localData: {},
        locations: [],
        error: errorResponse,
      }
    }
  }

  /**
   * Fetch the provider-agnostic amount-band catalog. The comparison applies
   * bands locally so changing the amount does not trigger a network request.
   */
  const getPreferentialRates = async (): Promise<PreferentialRatesCatalog> => {
    try {
      return await $fetch<PreferentialRatesCatalog>('/preferential-rates', {
        baseURL: getApiBaseUrl(),
      })
    } catch (error) {
      console.error('Preferential rates error:', error)
      return {
        currency: null,
        amount: null,
        providers: [],
        providerCount: 0,
        updatedAt: '',
      }
    }
  }

  /**
   * Extract detailed error information from various error types
   */
  const extractErrorDetails = (error: any) => {
    return {
      message: error?.message || error?.statusText || 'Unknown error',
      status: error?.status || error?.response?.status || null,
      statusText: error?.statusText || error?.response?.statusText || null,
      data: error?.data || error?.response?.data || null,
      headers: error?.headers || error?.response?.headers || null,
      url: error?.url || error?.response?.url || error?.config?.url || null,
      stack: error?.stack || null,
      originalError: error,
    }
  }

  /**
   * Geocode an address to get coordinates
   */
  const geocodeAddress = async (address: string) => {
    try {
      const data = await $fetch<GeocodeData[]>('https://api.cambio-uruguay.com/geocoding', {
        method: 'POST',
        body: { address },
      })

      return {
        error: null,
        data: data || [],
      }
    } catch (error: any) {
      console.error('Geocoding error:', error)

      const errorResponse = extractErrorDetails(error)
      return {
        error: errorResponse,
        data: [],
      }
    }
  }

  /**
   * Reverse geocode coordinates to get address information
   */
  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const url = `/position_stack?query=${latitude},${longitude}&limit=1`
      const res = await $fetch<ReverseGeocodeResponse>(url, {
        baseURL: getApiBaseUrl(),
      })

      return {
        error: null,
        data: res || { data: [] },
      }
    } catch (error: any) {
      console.error('Reverse geocoding error:', error)

      const errorResponse = extractErrorDetails(error)
      return {
        error: errorResponse,
        data: { data: [] },
      }
    }
  }

  /**
   * Get distances for coordinates
   */
  const getDistances = async (latitude: number, longitude: number) => {
    try {
      const url = `/distances?latitude=${latitude}&longitude=${longitude}`
      const distances = await $fetch<DistanceResponse>(url, {
        baseURL: getApiBaseUrl(),
      })

      return {
        error: null,
        data: distances,
      }
    } catch (error: any) {
      console.error('Distances error:', error)

      const errorResponse = extractErrorDetails(error)
      return {
        error: errorResponse,
        data: null,
      }
    }
  }

  /**
   * Fetch evolution data for a specific origin and currency
   */
  const getEvolutionData = async (
    origin: string,
    currency: string,
    type?: string,
    period: number = 6
  ) => {
    try {
      // Build the URL with optional type parameter
      let url = `/evolution/${origin}/${currency}`
      if (type) {
        url += `/${type}`
      }

      const data = await $fetch(url, {
        baseURL: getApiBaseUrl(),
        query: { period },
      })

      return {
        error: null,
        data,
      }
    } catch (error: any) {
      console.error('Evolution data error:', error)

      const errorResponse = extractErrorDetails(error)
      return {
        error: errorResponse,
        data: null,
      }
    }
  }

  /**
   * Fetch exchange data for a specific origin and location
   */
  const getExchangesByOriginLocation = async (
    origin: string,
    location: string,
    latitude?: number,
    longitude?: number
  ): Promise<any> => {
    try {
      const url = `/exchanges/${origin}/${location}`
      const query: Record<string, any> = {}

      if (latitude && longitude) {
        query.latitude = latitude
        query.longitude = longitude
      }

      return await $fetch(url, {
        baseURL: getApiBaseUrl(),
        query: Object.keys(query).length > 0 ? query : undefined,
      })
    } catch (error: any) {
      console.error('Error fetching exchanges by origin/location:', error)
      const errorResponse = extractErrorDetails(error)
      throw errorResponse
    }
  }

  /**
   * Fetch health/status information including last sync time
   */
  const getHealthStatus = async () => {
    try {
      const data = await $fetch<HealthResponse>('/health', {
        baseURL: getApiBaseUrl(),
      })

      return {
        error: null,
        data,
      }
    } catch (error: any) {
      console.error('Health status error:', error)

      const errorResponse = extractErrorDetails(error)
      return {
        error: errorResponse,
        data: null,
      }
    }
  }

  return {
    getApiBaseUrl,
    getExchangeData,
    getLocalData,
    getAllLocations,
    getCashPoints,
    getExchangeDataWithLocal,
    processExchangeData,
    getProcessedExchangeData,
    getPreferentialRates,
    getEvolutionData,
    getExchangesByOriginLocation,
    extractErrorDetails,
    geocodeAddress,
    reverseGeocode,
    getDistances,
    getHealthStatus,
  }
}
