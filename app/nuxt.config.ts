export default defineNuxtConfig({
  // Enable Nuxt 4 features
  future: {
    compatibilityVersion: 4,
  },

  // SSR Configuration
  ssr: true,

  // Site Configuration (required for @nuxt/sitemap and SEO)
  site: {
    url: 'https://cambio-uruguay.com',
    name: 'Cambio Uruguay - Cotización del Dólar en Uruguay Hoy',
    description:
      'Cotización del dólar en Uruguay hoy actualizada cada 10 minutos. Compara precios de compra y venta en más de 40 casas de cambio en Montevideo y todo Uruguay.',
    defaultLocale: 'es',
    identity: {
      type: 'Organization',
    },
    twitter: '@cambio_uruguay',
    trailingSlash: false,
  },

  // App Configuration
  app: {
    head: {
      titleTemplate: '%s | Cambio Uruguay - Cotización del Dólar',
      title: 'Cotización del Dólar en Uruguay Hoy | Compara +40 Casas de Cambio',
      meta: [
        { charset: 'utf-8' },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, user-scalable=yes, maximum-scale=5',
        },
        {
          name: 'description',
          content:
            'Cotización del dólar en Uruguay hoy actualizada cada 10 minutos. Compara precios de compra y venta en más de 40 casas de cambio. Dólar, euro, real y peso argentino.',
        },
        {
          name: 'keywords',
          content:
            'cotización del dólar en uruguay, cotización dólar uruguay hoy, precio del dólar en uruguay, dólar en uruguay hoy, casas de cambio uruguay, tipo de cambio uruguay, cotización euro uruguay, cotización real uruguay, cotización peso argentino uruguay, dólar BROU, comprar dólares montevideo, vender dólares uruguay, cambio de moneda uruguay',
        },
        { name: 'author', content: 'Eduardo Airaudo - Cambio Uruguay' },
        { name: 'creator', content: 'Eduardo Airaudo' },
        { name: 'publisher', content: 'Eduardo Airaudo' },
        {
          name: 'robots',
          content: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
        },
        { name: 'googlebot', content: 'index, follow' },
        { name: 'bingbot', content: 'index, follow' },
        { name: 'referrer', content: 'no-referrer' },

        // Open Graph / Facebook - Only truly global properties
        { property: 'og:type', content: 'website' },
        {
          property: 'og:image',
          content: 'https://cambio-uruguay.com/img/og.png',
        },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        {
          property: 'og:image:alt',
          content: 'Cambio Uruguay - Cotización del dólar en Uruguay hoy',
        },
        { property: 'og:site_name', content: 'Cambio Uruguay' },
        { property: 'og:locale', content: 'es_ES' },
        { property: 'og:locale:alternate', content: 'en_US' },
        { property: 'og:locale:alternate', content: 'pt_BR' },

        // Twitter Card - Only truly global properties
        { name: 'twitter:card', content: 'summary_large_image' },
        {
          name: 'twitter:image',
          content: 'https://cambio-uruguay.com/img/banner.png',
        },
        {
          name: 'twitter:image:alt',
          content: 'Cambio Uruguay - Cotización del dólar en Uruguay hoy',
        },
        { name: 'twitter:site', content: '@cambio_uruguay' },
        { name: 'twitter:creator', content: '@cambio_uruguay' },

        // Additional SEO meta tags
        { name: 'geo.region', content: 'UY' },
        { name: 'geo.placename', content: 'Uruguay' },
        { name: 'geo.position', content: '-34.9011;-56.1645' },
        { name: 'ICBM', content: '-34.9011, -56.1645' },

        // App meta tags
        { name: 'application-name', content: 'Cambio Uruguay' },
        { name: 'format-detection', content: 'telephone=no' },

        // Theme colors
        { name: 'msapplication-TileColor', content: '#272727' },
        { name: 'theme-color', content: '#272727' },
      ],
      link: [
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
          rel: 'author',
          href: '/humans.txt',
          type: 'text/plain',
        },
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'manifest', href: '/manifest.webmanifest' }, //
        {
          rel: 'author',
          href: 'https://www.linkedin.com/in/eduardo-airaudo/',
        },
        {
          rel: 'preconnect',
          href: 'https://api.cambio-uruguay.com',
        },
        {
          rel: 'preconnect',
          href: 'https://www.googletagmanager.com',
        },
        {
          rel: 'dns-prefetch',
          href: 'https://embed.tawk.to',
        },
      ],
    },
  },

  // Global CSS
  css: ['vuetify/styles', '@mdi/font/css/materialdesignicons.min.css', '~/assets/css/critical.css'],
  // Server Configuration
  devServer: {
    port: 3311,
    host: '0.0.0.0',
  },

  // Build Configuration
  build: {
    transpile: ['vuetify'],
    analyze: {
      analyzerMode: 'static',
      openAnalyzer: false,
    },
  }, // Vite Configuration
  vite: {
    define: {
      'process.env.DEBUG': false,
    },
    css: {
      devSourcemap: false, // Disable CSS sourcemaps in production
    },
    optimizeDeps: {
      exclude: ['@nuxtjs/i18n'],
    },
    ssr: {
      noExternal: ['@nuxtjs/i18n', 'vue-i18n'],
    },
    build: {
      cssCodeSplit: false, // Disable CSS code splitting to avoid dependency issues
      minify: 'esbuild', // Switch to esbuild for more reliable minification
      chunkSizeWarningLimit: 1000,
      // Remove manual chunking that's causing issues
      rollupOptions: {
        external: (id: string) => {
          // Don't externalize these in the browser build
          if (id.includes('node:') && typeof window !== 'undefined') {
            return false
          }
          return false
        },
      },
    },
  },

  routeRules: {
    '/': {
      ssr: true,
      headers: {
        'cache-control': 's-maxage=3600',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    },
    '/_nuxt/**': {
      headers: { 'cache-control': 'max-age=31536000, immutable' },
    },
    '/favicon.*': {
      headers: { 'cache-control': 'max-age=31536000, immutable' },
    },
    '/**/*.{png,jpg,jpeg,gif,webp,svg,ico}': {
      headers: { 'cache-control': 'max-age=31536000, immutable' },
    },
    '/**/*.{js,css,woff,woff2,ttf,eot}': {
      headers: { 'cache-control': 'max-age=31536000, immutable' },
    },
    '/.well-known/**': {
      headers: {
        'cache-control': 'max-age=86400',
        'Content-Type': 'application/json',
      },
    },
  },

  nitro: {
    prerender: {
      routes: ['/sitemap.xml', '/robots.txt'],
      ignore: ['/manifest.json'],
      crawlLinks: false,
    },
    compressPublicAssets: {
      gzip: true,
      brotli: true,
    },
    minify: true,
    storage: {
      redis: {
        driver: 'memory', // Use memory storage for development
      },
    },
    experimental: {
      wasm: true,
    },
  },

  // Modules
  modules: [
    //'@nuxtjs/web-vitals',
    '@nuxtjs/seo',
    '@nuxtjs/leaflet',
    '@nuxtjs/i18n',
    '@nuxtjs/sitemap',
    '@pinia/nuxt',
    '@nuxtjs/robots',
    [
      '@nuxtjs/google-fonts',
      {
        families: {
          'Open Sans': [400, 600, 700],
        },
        display: 'swap',
        prefetch: false, // Reduce preconnects
        preload: false, // Load fonts only when needed
        download: true, // Download fonts locally
        inject: true,
      },
    ],
    [
      'nuxt-gtag',
      {
        id: 'G-F97PNVRMRF',
        loadingStrategy: 'defer', // Defer loading for better performance
        config: {
          page_title: 'Cambio Uruguay',
          page_location: 'https://cambio-uruguay.com',
        },
        additionalAccounts: [
          {
            id: 'AW-972399920',
            config: {
              send_page_view: true, // optional configurations
            },
          },
        ],
      },
    ], // Replace with your Google Analytics ID
    //'@sentry/nuxt/module',
    [
      '@vite-pwa/nuxt',
      {
        registerType: 'autoUpdate',
        disable: process.env.NODE_ENV === 'development',
        workbox: {
          navigateFallback: '/',
          globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
          cleanupOutdatedCaches: true,
          // Limit file size to prevent memory issues
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB max
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 20, // Increased from 10 but still reasonable
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days instead of 365
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 20, // Increased from 10 but still reasonable
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days instead of 365
                },
              },
            },
            {
              urlPattern: /\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 5, // Reduced from 10
                expiration: {
                  maxEntries: 50, // Increased from 16 for better caching
                  maxAgeSeconds: 300, // Keep 5 minutes
                },
              },
            },
          ],
        },
        client: {
          installPrompt: true,
          periodicSyncForUpdates: 20,
        },
        devOptions: {
          enabled: false,
          suppressWarnings: true,
          navigateFallbackAllowlist: [/^\/$/],
          type: 'module',
        },
        manifest: {
          name: 'Cambio Uruguay - Cotización del Dólar en Uruguay Hoy',
          short_name: 'Cambio Uruguay',
          description:
            'Cotización del dólar en Uruguay hoy. Compara precios de compra y venta en más de 40 casas de cambio en tiempo real.',
          theme_color: '#272727',
          background_color: '#272727',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          lang: 'es',
          categories: ['finance', 'business', 'currency'],
          icons: [
            {
              src: '/android-chrome-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: '/android-chrome-384x384.png',
              sizes: '384x384',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: '/favicon-32x32.png',
              sizes: '32x32',
              type: 'image/png',
            },
            {
              src: '/favicon-16x16.png',
              sizes: '16x16',
              type: 'image/png',
            },
            {
              src: '/icon.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
          shortcuts: [
            {
              name: 'Cotizaciones USD',
              short_name: 'USD',
              description: 'Ver cotizaciones de dólares americanos',
              url: '/?currency=USD',
              icons: [{ src: '/favicon-32x32.png', sizes: '32x32' }],
            },
            {
              name: 'Cotizaciones ARS',
              short_name: 'ARS',
              description: 'Ver cotizaciones de pesos argentinos',
              url: '/?currency=ARS',
              icons: [{ src: '/favicon-32x32.png', sizes: '32x32' }],
            },
          ],
        },
      },
    ],
  ],

  // Web Vitals tracking
  // webVitals: {
  //   provider: 'log', // Can be 'ga' for Google Analytics
  //   debug: process.env.NODE_ENV === 'development',
  //   disabled: false,
  // },

  // Robots Configuration
  robots: {
    disallow: ['/admin/', '/server/', '/_nuxt/'],
    allow: ['/', '/avanzado', '/historico', '/sucursales'],
    sitemap: 'https://cambio-uruguay.com/sitemap.xml',
    credits: false,
  },

  // Sitemap Configuration
  sitemap: {
    sources: ['/api/__sitemap__/urls'],
  },

  // i18n Configuration
  i18n: {
    bundle: {
      optimizeTranslationDirective: false,
    },
    locales: [
      { code: 'en', iso: 'en-US', name: 'English', file: 'en.ts' },
      { code: 'es', iso: 'es-ES', name: 'Español', file: 'es.ts' },
      { code: 'pt', iso: 'pt-PT', name: 'Português', file: 'pt.ts' },
    ],
    defaultLocale: 'es',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'lang',
      alwaysRedirect: true,
      fallbackLocale: 'es',
    },
    // imports: false, // Disable vue-i18n composable auto-imports (removed, not supported)
  },

  // Runtime Config
  runtimeConfig: {
    // Private keys (only available on server-side)
    sentry: {
      dsn: process.env.SENTRY_DSN,
    },
    // Server-side API URL (for SSR requests)
    apiBaseServer: process.env.NUXT_API_BASE_SERVER || 'http://104.234.204.107:3528',
    // Public keys (exposed to client-side)
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://cambio-uruguay.com',
      // Client-side API URL
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'https://api.cambio-uruguay.com',
    },
  },

  // Dev Tools
  devtools: { enabled: false },
  compatibilityDate: '2024-08-17',
})
