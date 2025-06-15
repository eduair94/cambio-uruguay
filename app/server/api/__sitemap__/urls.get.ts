export default defineEventHandler(async (event) => {
  try {
    // Fetch data from the API
    const response = await $fetch('https://api.cambio-uruguay.com')
    const data = response as Array<{
      origin?: string
      code?: string
      type?: string
    }>

    // Define supported locales
    const locales = ['es', 'en', 'pt']
    const defaultLocale = 'es'

    // Extract unique origins, currencies, and types
    const origins = new Set<string>()
    const originCurrencyPairs = new Set<string>()
    const originTypePairs = new Set<string>()

    data.forEach((item) => {
      if (item.origin) {
        origins.add(item.origin)

        if (item.code) {
          originCurrencyPairs.add(`${item.origin}/${item.code}`)
        }

        if (item.type && item.type.trim() !== '') {
          originTypePairs.add(`${item.origin}/${item.type}`)
        }
      }
    })

    const urls: Array<{
      loc: string
      lastmod?: string
      changefreq?: string
      priority?: number
    }> = []

    // Helper function to add URLs for all locales
    const addUrlsForAllLocales = (
      path: string,
      priority: number,
      changefreq: string = 'daily',
    ) => {
      locales.forEach((locale) => {
        if (locale === defaultLocale) {
          // Default locale doesn't have prefix
          urls.push({
            loc: path,
            changefreq,
            priority,
          })
        } else {
          // Non-default locales have /en or /pt prefix
          urls.push({
            loc: `/${locale}${path}`,
            changefreq,
            priority,
          })
        }
      })
    }

    // Add main URLs for all locales
    addUrlsForAllLocales('/', 1.0, 'hourly') // Home page
    addUrlsForAllLocales('/historico', 0.9, 'daily') // Historico main page
    addUrlsForAllLocales('/offline', 0.3, 'monthly') // Offline page

    // Add /historico/:origin routes for all locales
    origins.forEach((origin) => {
      addUrlsForAllLocales(`/historico/${origin}`, 0.8)
    })

    // Add /historico/:origin/:currency routes for all locales
    originCurrencyPairs.forEach((pair) => {
      addUrlsForAllLocales(`/historico/${pair}`, 0.7)
    })

    // Add /historico/:origin/:type routes for all locales
    originTypePairs.forEach((pair) => {
      addUrlsForAllLocales(`/historico/${pair}`, 0.7)
    })

    console.log(
      `Generated ${urls.length} sitemap URLs from API data (${origins.size} origins × ${locales.length} locales)`,
    )
    return urls
  } catch (error) {
    console.error('Error generating sitemap URLs from API:', error)
    return []
  }
})
