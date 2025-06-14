export default defineEventHandler(async (event) => {
  // Get runtime config
  const { public: config } = useRuntimeConfig()
  const siteUrl = config.siteUrl || 'https://cambio-uruguay.com'

  // Define languages
  const locales = ['es', 'en', 'pt']
  const defaultLocale = 'es'

  // Define currencies and their codes
  const currencies = [
    { code: 'USD', name: 'dolar' },
    { code: 'ARS', name: 'peso-argentino' },
    { code: 'BRL', name: 'real' },
    { code: 'EUR', name: 'euro' },
  ]

  // Define exchange house origins (based on available cambio classes)
  const origins = [
    'aeromar',
    'alter-cambio',
    'baluma-cambio',
    'bcu',
    'brou',
    'cambial',
    'cambilex',
    'cambio18',
    'cambio-3',
    'cambio-aguerrebere',
    'cambio-argentino',
    'cambio-aspen',
    'cambio-del-litoral',
    'cambio-federal',
    'cambio-fenix',
    'cambio-ingles',
    'cambio-maiorano',
    'cambio-matriz',
    'cambio-minas',
    'cambio-misiones',
    'cambio-obelisco',
    'cambio-openn',
    'cambio-oriental',
    'cambio-pampex',
    'cambio-pando',
    'cambio-pernas',
    'cambio-principal',
    'cambio-regul',
    'cambio-romantico',
    'cambio-salto-grande',
    'cambio-sicurezza',
    'cambio-sir',
    'cambio-velso',
    'cambio-vexel',
    'cambio-young',
    'fortex',
    'gales',
    'indumex',
    'itau',
    'lafavorita',
    'mas-cambio',
    'prex',
    'rynder',
    'suizo',
    'tradelix',
    'varlix',
  ]

  const urls: string[] = []

  // Helper function to generate URL with locale
  const generateUrl = (path: string, locale: string) => {
    const isDefault = locale === defaultLocale
    const localizedPath = isDefault ? path : `/${locale}${path}`
    return `${siteUrl}${localizedPath}`
  }

  // Add homepage for each locale
  locales.forEach((locale) => {
    urls.push(generateUrl('/', locale))
  })

  // Add offline page for each locale
  locales.forEach((locale) => {
    urls.push(generateUrl('/offline', locale))
  })

  // Add historic main page for each locale
  locales.forEach((locale) => {
    urls.push(generateUrl('/historico', locale))
  })

  // Add dynamic historic pages for each origin and currency combination
  origins.forEach((origin) => {
    currencies.forEach((currency) => {
      // Add historic pages for each exchange type (compra/venta)
      const types = ['compra', 'venta']

      types.forEach((type) => {
        locales.forEach((locale) => {
          const path = `/historico/${origin}/${currency.code.toLowerCase()}/${type}`
          urls.push(generateUrl(path, locale))
        })
      })

      // Add historic pages without type (general)
      locales.forEach((locale) => {
        const path = `/historico/${origin}/${currency.code.toLowerCase()}`
        urls.push(generateUrl(path, locale))
      })
    })

    // Add historic pages for each origin (without currency)
    locales.forEach((locale) => {
      const path = `/historico/${origin}`
      urls.push(generateUrl(path, locale))
    })
  })

  // Generate sitemap XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls
  .map((url) => {
    // Extract path from URL for alternate links
    const path = url.replace(siteUrl, '')
    const isLocalized = path.startsWith('/en') || path.startsWith('/pt')
    const basePath = isLocalized ? path.substring(3) : path // Remove locale prefix

    // Determine priority and changefreq based on path
    let priority = 0.5
    let changefreq = 'weekly'

    if (basePath === '/') {
      priority = 1.0
      changefreq = 'daily'
    } else if (basePath === '/offline') {
      priority = 0.3
      changefreq = 'monthly'
    } else if (basePath === '/historico') {
      priority = 0.8
      changefreq = 'weekly'
    } else if (basePath.includes('/historico/')) {
      priority = 0.6
      changefreq = 'weekly'
    }

    // Generate alternate links for i18n
    const alternateLinks = locales
      .map((locale) => {
        const isDefault = locale === defaultLocale
        const altUrl = isDefault
          ? `${siteUrl}${basePath}`
          : `${siteUrl}/${locale}${basePath}`
        const hreflang = isDefault ? 'x-default' : locale
        return `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${altUrl}"/>`
      })
      .join('\n')

    return `  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${alternateLinks}
  </url>`
  })
  .join('\n')}
</urlset>`

  // Set headers
  setHeader(event, 'content-type', 'application/xml')
  setHeader(event, 'cache-control', 'max-age=3600') // Cache for 1 hour

  return sitemap
})
