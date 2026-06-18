import { listCurrencySlugs } from '../../../utils/currencyPages'
import { guideSlugs } from '../../../utils/guides'
import { toolSlugs } from '../../../utils/tools'
import { glossarySlugs } from '../../../utils/glossary'
import { convertSlugs } from '../../../utils/convert'
import { listPosts } from '../../utils/blog'

export default defineEventHandler(async _event => {
  try {
    // Fetch data from the API
    const response = await $fetch('https://api.cambio-uruguay.com')
    const data = response as Array<{
      origin?: string
      code?: string
      type?: string
    }>

    // Fetch local data for sucursales routes
    let localData: Record<
      string,
      {
        name?: string
        website?: string
        maps?: string
        bcu?: string
        departments?: string[]
      }
    > = {}

    try {
      const localDataResponse = await $fetch('https://api.cambio-uruguay.com/localData')
      localData = localDataResponse as typeof localData
    } catch (localDataError) {
      console.warn('Failed to fetch localData for sucursales routes:', localDataError)
      // Continue without sucursales routes if localData fails
    }

    // Define supported locales
    const locales = ['es', 'en', 'pt']
    const defaultLocale = 'es'

    // Extract unique origins, currencies, and types
    const origins = new Set<string>()
    const originCurrencyPairs = new Set<string>()
    const originTypePairs = new Set<string>()

    data.forEach(item => {
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

    // Extract sucursales data for sitemap
    const sucursalesOrigins = new Set<string>()
    const sucursalesLocationPairs = new Set<string>()

    // Department slugs for the programmatic /dolar/:departamento pages. Built from
    // the union of all houses' departments, slugified the same way the page does
    // (lowercase, accent-stripped, spaces -> hyphens) so the routes resolve.
    const departmentSlugs = new Set<string>()
    const slugifyDepartment = (name: string): string =>
      name
        .normalize('NFD')
        .replace(/[\u0300-\u036F]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    Object.entries(localData).forEach(([origin, data]) => {
      sucursalesOrigins.add(origin)

      if (data.departments) {
        data.departments.forEach(department => {
          sucursalesLocationPairs.add(`${origin}/${encodeURIComponent(department)}`)

          const deptSlug = slugifyDepartment(department)
          if (deptSlug) {
            departmentSlugs.add(deptSlug)
          }
        })
      }
    })

    const urls: Array<{
      loc: string
      lastmod?: string
      changefreq?: string
      priority?: number
    }> = []

    // Helper function to add URLs for all locales
    const addUrlsForAllLocales = (path: string, priority: number, changefreq: string = 'daily') => {
      locales.forEach(locale => {
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
    addUrlsForAllLocales('/', 1.0, 'hourly') // Home page - Cotización del dólar en Uruguay
    addUrlsForAllLocales('/avanzado', 0.9, 'hourly') // Advanced comparator
    addUrlsForAllLocales('/historico', 0.9, 'daily') // Historico main page
    addUrlsForAllLocales('/sucursales', 0.9, 'daily') // Sucursales main page
    addUrlsForAllLocales('/noticias', 0.7, 'hourly') // Noticias del dólar (news)
    addUrlsForAllLocales('/preguntas-frecuentes', 0.7, 'weekly') // FAQ hub
    addUrlsForAllLocales('/comparar', 0.8, 'daily') // Compare exchange houses over time
    addUrlsForAllLocales('/guias', 0.7, 'weekly') // Editorial guides hub
    addUrlsForAllLocales('/herramientas', 0.8, 'weekly') // Tools / calculators hub
    addUrlsForAllLocales('/glosario', 0.7, 'weekly') // Financial glossary hub
    addUrlsForAllLocales('/convertir', 0.7, 'weekly') // Amount-conversion hub
    addUrlsForAllLocales('/blog', 0.8, 'daily') // AI daily blog hub
    addUrlsForAllLocales('/acerca', 0.6, 'monthly') // Methodology / about page
    addUrlsForAllLocales('/offline', 0.3, 'monthly') // Offline page

    // Add /guias/:slug editorial guide routes for all locales
    guideSlugs().forEach(slug => {
      addUrlsForAllLocales(`/guias/${slug}`, 0.7, 'weekly')
    })

    // Add /herramientas/:slug calculator routes for all locales
    toolSlugs().forEach(slug => {
      addUrlsForAllLocales(`/herramientas/${slug}`, 0.7, 'weekly')
    })

    // Add /glosario/:termino definition routes for all locales
    glossarySlugs().forEach(slug => {
      addUrlsForAllLocales(`/glosario/${slug}`, 0.6, 'monthly')
    })

    // Add /convertir/:slug amount-conversion routes for all locales
    convertSlugs().forEach(slug => {
      addUrlsForAllLocales(`/convertir/${slug}`, 0.6, 'weekly')
    })

    // Add /blog/:slug AI daily-blog posts (default locale only — posts are
    // Spanish-only, so we avoid duplicate-content URLs across locales).
    try {
      const posts = await listPosts()
      posts.forEach(post => {
        urls.push({
          loc: `/blog/${post.slug}`,
          lastmod: post.createdAt,
          changefreq: 'monthly',
          priority: 0.6,
        })
      })
    } catch (blogError) {
      console.warn('Failed to add blog posts to sitemap:', blogError)
    }

    // Add /historico/:origin routes for all locales
    origins.forEach(origin => {
      addUrlsForAllLocales(`/historico/${origin}`, 0.8)
    })

    // Add /historico/:origin/:currency routes for all locales
    originCurrencyPairs.forEach(pair => {
      addUrlsForAllLocales(`/historico/${pair}`, 0.7)
    })

    // Add /historico/:origin/:type routes for all locales
    originTypePairs.forEach(pair => {
      addUrlsForAllLocales(`/historico/${pair}`, 0.7)
    })

    // Add /sucursales/:origin routes for all locales
    sucursalesOrigins.forEach(origin => {
      addUrlsForAllLocales(`/sucursales/${origin}`, 0.8)
    })

    // Add /sucursales/:origin/:location routes for all locales
    sucursalesLocationPairs.forEach(pair => {
      addUrlsForAllLocales(`/sucursales/${pair}`, 0.7)
    })

    // Add /dolar/:departamento programmatic-SEO routes for all locales
    departmentSlugs.forEach(slug => {
      addUrlsForAllLocales(`/dolar/${slug}`, 0.7)
    })

    // Add /cotizacion/:moneda programmatic-SEO routes for all locales
    const currencySlugs = listCurrencySlugs()
    currencySlugs.forEach(slug => {
      addUrlsForAllLocales(`/cotizacion/${slug}`, 0.8)
    })

    // Add /casa/:origin programmatic-SEO routes for all locales (origins come
    // from localData keys, same source as the sucursales routes above).
    sucursalesOrigins.forEach(origin => {
      addUrlsForAllLocales(`/casa/${origin}`, 0.7)
    })

    console.log(
      `Generated ${urls.length} sitemap URLs from API data:`,
      `\n- Main exchange data: ${origins.size} origins`,
      `\n- Historico origins: ${origins.size} routes`,
      `\n- Historico currency pairs: ${originCurrencyPairs.size} routes`,
      `\n- Historico type pairs: ${originTypePairs.size} routes`,
      `\n- LocalData: ${Object.keys(localData).length} exchange houses`,
      `\n- Sucursales origins: ${sucursalesOrigins.size} routes`,
      `\n- Sucursales location pairs: ${sucursalesLocationPairs.size} routes`,
      `\n- Dolar department pages: ${departmentSlugs.size} routes`,
      `\n- Cotizacion currency pages: ${currencySlugs.length} routes`,
      `\n- Casa pages: ${sucursalesOrigins.size} routes`,
      `\n- Editorial guides: ${guideSlugs().length} routes`,
      `\n- Total across ${locales.length} locales: ${urls.length} URLs`
    )
    return urls
  } catch (error) {
    console.error('Error generating sitemap URLs from API:', error)
    console.error(
      'Failed to fetch from https://api.cambio-uruguay.com or https://api.cambio-uruguay.com/localData'
    )
    return []
  }
})
