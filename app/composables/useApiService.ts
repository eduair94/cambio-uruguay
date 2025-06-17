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
  [key: string]: any // Allow additional properties
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
      query: { date },
    }).catch((error) => {
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
    }).catch((error) => {
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
   * Fetch both exchange data and local data in parallel
   */
  const getExchangeDataWithLocal = async (date: string) => {
    const [exchangeData, localData] = await Promise.all([
      getExchangeData(date),
      getLocalData(),
    ])

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
        el.isInterBank =
          el.origin === 'bcu' ||
          ['INTERBANCARIO', 'FONDO/CABLE'].includes(el.type)

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
      if (departments && departments.length) {
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
    try {
      const { exchangeData, localData } = await getExchangeDataWithLocal(date)

      // Check for errors in the response
      const exchangeError = exchangeData?.error
      const localDataError = localData?.error

      if (exchangeError || localDataError) {
        return {
          error: exchangeError,
          exchangeData: [],
          localData: localDataError ? {} : localData,
          locations: localDataError ? [] : getLocations(localData),
        }
      }

      return {
        error: null,
        exchangeData: processExchangeData(exchangeData, localData),
        localData,
        locations: getLocations(localData),
      }
    } catch (error: any) {
      console.error('API Error for date', date, ':', error)

      // Create detailed error response
      const errorResponse = {
        message:
          error?.message || 'An error occurred while fetching exchange data',
        status: error?.status || null,
        statusText: error?.statusText || null,
        data: error?.data || null,
        stack: error?.stack || null,
        originalError: error,
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
      const data = await $fetch<GeocodeData[]>(
        'https://api.cambio-uruguay.com/geocoding',
        {
          method: 'POST',
          body: { address },
        },
      )

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
    period: number = 6,
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
    longitude?: number,
  ): Promise<any> => {
    try {
      let url = `/exchanges/${origin}/${location}`
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
    getExchangeDataWithLocal,
    processExchangeData,
    getProcessedExchangeData,
    getEvolutionData,
    getExchangesByOriginLocation,
    extractErrorDetails,
    geocodeAddress,
    reverseGeocode,
    getDistances,
    getHealthStatus,
  }
}
