import colors from 'vuetify/es5/util/colors'
import es from 'vuetify/lib/locale/es'
import pt from 'vuetify/lib/locale/pt'
import translations from './translations'

export default {
  type: 'module',
  loading: '~/components/LoadingBar.vue',
  // Global page headers: https://go.nuxtjs.dev/config-head  head: {
  addSeoAttributes: true,
  htmlAttrs: {
    lang: 'es-ES',
  },
  titleTemplate: '%s - Cambio Uruguay',
  title: 'Mejores Cotizaciones de Cambio en Uruguay',
  description:
    'Encuentra las mejores cotizaciones de cambio de divisas en Uruguay. Compara precios de más de 40 casas de cambio en tiempo real.',
  meta: [
    { charset: 'utf-8' },
    {
      name: 'viewport',
      content:
        'width=device-width, initial-scale=1, user-scalable=yes, maximum-scale=5',
    },
    {
      hid: 'description',
      name: 'description',
      content:
        'Cambio Uruguay - Encuentra las mejores casas cambiarias de Montevideo / Uruguay, mejores cotizaciones de dólares (USD), pesos argentinos (ARS) y reales brasileros (BRL).',
    },
    {
      name: 'keywords',
      content:
        'cambio moneda uruguay, cambio divisas uruguay, donde comprar dólares uruguay, donde vender dólares uruguay, vender pesos argentinos uruguay, comprar pesos argentinos uruguay, casas de cambio uruguay, casas de cambio montevideo, casas de cambio punta del este',
    },
    { name: 'author', content: 'Cambio Uruguay' },
    {
      name: 'robots',
      content:
        'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
    },
    { name: 'googlebot', content: 'index, follow' },
    { name: 'bingbot', content: 'index, follow' },
    { name: 'referrer', content: 'no-referrer' },

    // Open Graph / Facebook
    { hid: 'og:type', property: 'og:type', content: 'website' },
    {
      hid: 'og:url',
      property: 'og:url',
      content: 'https://cambio-uruguay.com',
    },
    {
      hid: 'og:title',
      property: 'og:title',
      content: 'Cambio Uruguay - Mejores Cotizaciones de Cambio',
    },
    {
      hid: 'og:description',
      property: 'og:description',
      content:
        'Cambio Uruguay - Encuentra las mejores casas cambiarias del país, mejores cotizaciones de dólares (USD), pesos argentinos (ARS) y reales brasileros (BRL).',
    },
    {
      hid: 'og:image',
      property: 'og:image',
      content: 'https://cambio-uruguay.com/img/banner.png',
    },
    { hid: 'og:image:width', property: 'og:image:width', content: '1200' },
    { hid: 'og:image:height', property: 'og:image:height', content: '630' },
    {
      hid: 'og:image:alt',
      property: 'og:image:alt',
      content: 'Cambio Uruguay - Mejores cotizaciones de cambio',
    },
    {
      hid: 'og:site_name',
      property: 'og:site_name',
      content: 'Cambio Uruguay',
    },
    { hid: 'og:locale', property: 'og:locale', content: 'es_ES' },
    {
      hid: 'og:locale:alternate',
      property: 'og:locale:alternate',
      content: 'en_US',
    },
    {
      hid: 'og:locale:alternate',
      property: 'og:locale:alternate',
      content: 'pt_BR',
    },

    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:url', content: 'https://cambio-uruguay.com' },
    { name: 'twitter:title', content: 'Cambio Uruguay' },
    {
      name: 'twitter:description',
      content:
        'Cambio Uruguay - Encuentra las mejores casas cambiarias del país, mejores cotizaciones de dólares (USD), pesos argentinos (ARS) y reales brasileños (BRL).',
    },
    {
      name: 'twitter:image',
      content: 'https://cambio-uruguay.com/img/banner.png',
    },
    {
      name: 'twitter:image:alt',
      content: 'Cambio Uruguay - Mejores cotizaciones de cambio',
    },
    { name: 'twitter:site', content: '@cambios_uy' },
    { name: 'twitter:creator', content: '@cambios_uy' },

    // Additional SEO meta tags
    { name: 'geo.region', content: 'UY' },
    { name: 'geo.placename', content: 'Uruguay' },
    { name: 'geo.position', content: '-34.9011;-56.1645' },
    { name: 'ICBM', content: '-34.9011, -56.1645' },
    // App meta tags
    { name: 'application-name', content: 'Cambio Uruguay' },
    { name: 'apple-mobile-web-app-title', content: 'Cambio Uruguay' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    {
      name: 'apple-mobile-web-app-status-bar-style',
      content: 'black-translucent',
    },
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'format-detection', content: 'telephone=no' },

    // PWA meta tags
    { name: 'apple-touch-fullscreen', content: 'yes' },
    { name: 'apple-mobile-web-app-orientations', content: 'portrait' },

    // Theme colors
    { name: 'msapplication-TileColor', content: '#272727' },
    { name: 'theme-color', content: '#272727' },
    { name: 'msapplication-navbutton-color', content: '#272727' },
    { name: 'apple-mobile-web-app-status-bar-style', content: '#272727' },
  ],
  link: [
    {
      rel: 'manifest',
      href: '/site.webmanifest',
    },
    {
      rel: 'apple-touch-icon',
      sizes: '180x180',
      href: '/apple-touch-icon.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      href: '/favicon-32x32.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      href: '/favicon-16x16.png',
    },
    {
      rel: 'mask-icon',
      href: '/safari-pinned-tab.svg',
      color: '#5bbad5',
    },
    {
      rel: 'canonical',
      href: 'https://cambio-uruguay.com',
    },
    {
      rel: 'alternate',
      hreflang: 'es',
      href: 'https://cambio-uruguay.com/',
    },
    {
      rel: 'alternate',
      hreflang: 'en',
      href: 'https://cambio-uruguay.com/en',
    },
    {
      rel: 'alternate',
      hreflang: 'pt',
      href: 'https://cambio-uruguay.com/pt',
    },
    {
      rel: 'alternate',
      hreflang: 'x-default',
      href: 'https://cambio-uruguay.com/',
    },
    {
      rel: 'author',
      href: '/humans.txt',
      type: 'text/plain',
    },
    {
      rel: 'preconnect',
      href: 'https://api.cambio-uruguay.com',
    },
    {
      rel: 'preconnect',
      href: 'https://fonts.googleapis.com',
    },
    {
      rel: 'preconnect',
      href: 'https://fonts.gstatic.com',
      crossorigin: true,
    },
    {
      href: 'https://cdn.maptiler.com/maptiler-geocoder/v1.1.0/maptiler-geocoder.css',
      rel: 'stylesheet',
    },
  ],
  script: [
    {
      async: true,
      src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7038674901615097',
      crossorigin: 'anonymous',
    },
    {
      src: 'https://cdn.maptiler.com/maptiler-geocoder/v1.1.0/maptiler-geocoder.js',
    },
  ],

  server: {
    port: 3311, // default: 3000
    host: '0.0.0.0', // default: localhost
  },
  // Global CSS: https://go.nuxtjs.dev/config-css
  css: ['~/assets/css/critical.css'], // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [
    { src: '~/plugins/vue-plugins', mode: 'client' },
    { src: '~/plugins/seo-utils.ts', mode: 'all' },
    { src: '~/plugins/pwa-utils.ts', mode: 'client' },
  ],

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: false,

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: [
    '@nuxtjs/pwa',
    // https://go.nuxtjs.dev/typescript
    '@nuxt/typescript-build',
    // https://go.nuxtjs.dev/vuetify
    '@nuxtjs/vuetify',
    [
      '@nuxtjs/google-gtag',
      {
        id: 'G-F97PNVRMRF',
        additionalAccounts: [
          {
            id: 'AW-972399920',
            config: {
              send_page_view: true, // optional configurations
            },
          },
        ],
      },
    ],
    '@nuxtjs/google-fonts',
  ],

  googleFonts: {
    families: {
      'Open Sans': [400, 600, 700],
    },
  },
  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [
    '@nuxtjs/sentry',
    'nuxt-leaflet',
    '@nuxtjs/i18n',
    '@nuxtjs/sitemap',
    '@nuxtjs/robots',
    // https://go.nuxtjs.dev/axios
    '@nuxtjs/axios',
    [
      '@netsells/nuxt-hotjar',
      {
        id: '3306157',
        sv: '6',
      },
    ],
  ], // Sitemap configuration
  sitemap: {
    hostname: 'https://cambio-uruguay.com',
    i18n: true,
    gzip: true,
    routes: async () => {
      // Add dynamic routes here if needed
      const routes = []

      const locales = ['es', 'en', 'pt']
      function addRoutes(url) {
        // take into account the different locales
        locales.forEach((locale) => {
          let newUrl
          if (locale === 'es') {
            // For Spanish (default locale), use the URL as-is
            newUrl = url
          } else {
            // For other locales, prepend the locale
            newUrl = `/${locale}${url}`
          }

          routes.push({
            url: newUrl,
            changefreq: 'daily',
            priority: 0.6,
            lastmod: new Date(),
          })
        })
      } // Add currency-specific routes
      const currencies = ['USD', 'ARS', 'BRL', 'EUR', 'GBP']
      const locations = ['MONTEVIDEO', 'PUNTA-DEL-ESTE', 'COLONIA', 'SALTO']

      currencies.forEach((currency) => {
        addRoutes(`/?currency=${currency}`)

        locations.forEach((location) => {
          addRoutes(`/?currency=${currency}&location=${location}`)
        })
      }) // Add historical routes

      // Fetch data from API to get all origins and currency codes
      const axios = require('axios')

      try {
        const response = await axios.get('https://api.cambio-uruguay.com')
        const data = response.data // Extract unique origins and currency codes from API data

        // Add main historical page
        addRoutes('/historico')

        const urls = []
        // Add historical routes for each origin
        data.forEach(({ origin, type, code }) => {
          let url = `/historico/${origin}`

          if (!urls.includes(url)) {
            addRoutes(url)
            urls.push(url)
          }

          url = `/historico/${origin}/${code}`

          if (!urls.includes(url)) {
            addRoutes(url)
            urls.push(url)
          }

          if (type) {
            url = `/historico/${origin}/${code}/${type}`
            if (!urls.includes(url)) {
              addRoutes(url)
              urls.push(url)
            }
          }
        })
      } catch (error) {
        console.error('Error fetching API data for sitemap:', error)
        // Still add the basic historical page even if API fails
        addRoutes('/historico')
      } // console.log('routes', routes)

      return routes
    },
    defaults: {
      changefreq: 'daily',
      priority: 1,
      lastmod: new Date(),
    },
  },

  // Robots.txt configuration
  robots: {
    UserAgent: '*',
    Allow: '/',
    Disallow: ['/admin', '/_nuxt'],
    Sitemap: 'https://cambio-uruguay.com/sitemap.xml',
  },

  sentry: {
    dsn: process.env.SENTRY_DSN, // Enter your project's DSN.
    // Additional Module Options.
    config: {
      tracesSampleRate: 1.0,
      browserTracing: {},
      vueOptions: {
        trackComponents: true,
      },
      // Optional Sentry SDK configuration.
      // Those options are shared by both the Browser and the Server instances.
      // Browser-onlsy and Server-only options should go
      // into `clientConfig` and `serverConfig` objects respectively.
    },
  },

  // Axios module configuration: https://go.nuxtjs.dev/config-axios
  axios: {
    // Workaround to avoid enforcing hard-coded localhost:3000: https://github.com/nuxt-community/axios-module/issues/308
    baseURL: '/',
  },

  i18n: {
    strategy: 'prefix_except_default',
    baseUrl: 'https://cambio-uruguay.com',
    locales: [
      {
        code: 'en',
        iso: 'en-US',
        name: 'English',
      },
      {
        code: 'es',
        iso: 'es-ES',
        name: 'Español',
      },
      {
        code: 'pt',
        iso: 'pt-BR',
        name: 'Português',
      },
    ],
    defaultLocale: 'es',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root', // recommended
    },
    vueI18n: {
      fallbackLocale: 'es',
      messages: translations,
    },
  },

  router: {
    base: '/',
    mode: 'history',
  },
  // PWA module configuration: https://go.nuxtjs.dev/pwa
  pwa: {
    icon: {
      purpose: 'maskable',
    },
    meta: {
      name: 'Cambio Uruguay',
      author: 'Cambio Uruguay',
      description:
        'Encuentra las mejores cotizaciones de cambio de divisas en Uruguay',
      theme_color: '#272727',
      lang: 'es',
      ogSiteName: 'Cambio Uruguay',
      ogTitle: 'Cambio Uruguay - Mejores Cotizaciones de Cambio',
      ogDescription:
        'Encuentra las mejores cotizaciones de cambio de divisas en Uruguay',
      ogImage: '/img/banner.png',
      twitterCard: 'summary_large_image',
      twitterSite: '@cambios_uy',
      twitterCreator: '@cambios_uy',
    },
    manifest: {
      name: 'Cambio Uruguay - Mejores Cotizaciones de Cambio',
      short_name: 'Cambio Uruguay',
      description:
        'Encuentra las mejores cotizaciones de cambio de divisas en Uruguay',
      theme_color: '#272727',
      background_color: '#272727',
      start_url: '/',
      display: 'standalone',
      orientation: 'portrait-primary',
      lang: 'es',
      categories: ['finance', 'business', 'currency'],
      crossorigin: 'use-credentials',
    },
    workbox: {
      enabled: true,
      workboxURL:
        'https://cdn.jsdelivr.net/npm/workbox-cdn/workbox/workbox-sw.js',
      importScripts: process.env.NODE_ENV === 'production' ? [] : [],
      autoRegister: true,
      offline: true,
      offlinePage: '/offline',
      offlineStrategy: 'NetworkFirst',
      offlineAnalytics: true,
      cacheAssets: true,
      runtimeCaching: [
        {
          urlPattern: 'https://fonts.googleapis.com/.*',
          handler: 'CacheFirst',
          method: 'GET',
          strategyOptions: {
            cacheName: 'google-fonts-stylesheets',
          },
        },
        {
          urlPattern: 'https://fonts.gstatic.com/.*',
          handler: 'CacheFirst',
          method: 'GET',
          strategyOptions: {
            cacheName: 'google-fonts-webfonts',
            cacheableResponse: {
              statuses: [0, 200],
            },
            expiration: {
              maxAgeSeconds: 60 * 60 * 24 * 365,
              maxEntries: 30,
            },
          },
        },
      ],
    },
  },

  // Vuetify module configuration: https://go.nuxtjs.dev/config-vuetify
  vuetify: {
    lang: {
      locales: { pt, es },
    },
    treeShake: true,
    customVariables: ['~/assets/variables.scss'],
    defaultAssets: {
      font: {
        family: 'Open Sans',
      },
    },
    theme: {
      dark: true,
      themes: {
        dark: {
          primary: colors.blue.darken2,
          accent: colors.white,
          secondary: colors.amber.darken3,
          info: colors.teal.lighten1,
          warning: colors.amber.base,
          error: colors.deepOrange.accent4,
          success: colors.green.accent3,
        },
      },
    },
  },

  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {
    extend(config, { isClient }) {
      // Extend only webpack config for client-bundle
      if (isClient) {
        config.devtool = 'source-map'
      }
    },
  },
}
