export default defineNuxtConfig({
  // SSR Configuration
  ssr: true,

  // Site Configuration (required for @nuxt/sitemap)
  site: {
    url: 'https://cambio-uruguay.com',
    name: 'Cambio Uruguay',
    description:
      'Encuentra las mejores cotizaciones de cambio de divisas en Uruguay. Compara precios de más de 40 casas de cambio en tiempo real.',
    defaultLocale: 'es',
  },

  // App Configuration
  app: {
    head: {
      htmlAttrs: {
        lang: 'es-ES',
      },
      titleTemplate: '%s - Cambio Uruguay',
      title: 'Mejores Cotizaciones de Cambio en Uruguay',
      meta: [
        { charset: 'utf-8' },
        {
          name: 'viewport',
          content:
            'width=device-width, initial-scale=1, user-scalable=yes, maximum-scale=5',
        },
        {
          name: 'description',
          content:
            'Encuentra las mejores cotizaciones de cambio de divisas en Uruguay. Compara precios de más de 40 casas de cambio en tiempo real.',
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
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://cambio-uruguay.com' },
        {
          property: 'og:title',
          content: 'Cambio Uruguay - Mejores Cotizaciones de Cambio',
        },
        {
          property: 'og:description',
          content:
            'Cambio Uruguay - Encuentra las mejores casas cambiarias del país, mejores cotizaciones de dólares (USD), pesos argentinos (ARS) y reales brasileros (BRL).',
        },
        {
          property: 'og:image',
          content: 'https://cambio-uruguay.com/img/banner.png',
        },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        {
          property: 'og:image:alt',
          content: 'Cambio Uruguay - Mejores cotizaciones de cambio',
        },
        { property: 'og:site_name', content: 'Cambio Uruguay' },
        { property: 'og:locale', content: 'es_ES' },
        { property: 'og:locale:alternate', content: 'en_US' },
        { property: 'og:locale:alternate', content: 'pt_BR' },

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
          crossorigin: 'anonymous',
        },
        {
          rel: 'preconnect',
          href: 'https://www.googletagmanager.com',
        },
      ],
    },
  },

  // Global CSS
  css: [
    'vuetify/styles',
    '@mdi/font/css/materialdesignicons.min.css',
    '~/assets/css/critical.css',
  ],
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
  },

  // Vite Configuration
  vite: {
    define: {
      'process.env.DEBUG': false,
    },
    css: {
      devSourcemap: false,
      preprocessorOptions: {
        sass: {
          additionalData: '@use "vuetify/settings" with ($utilities: false)\n',
        },
      },
    },
    server: {
      hmr: {
        overlay: false,
      },
    },
    optimizeDeps: {
      exclude: ['@nuxtjs/i18n'],
      include: ['vuetify', 'vuetify/components', 'vuetify/directives'],
    },
    ssr: {
      noExternal: ['@nuxtjs/i18n', 'vue-i18n', 'vuetify'],
    },
    build: {
      cssCodeSplit: false,
      minify: 'esbuild',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        external: (id) => {
          if (id.includes('node:') && typeof window !== 'undefined') {
            return false
          }
          return false
        },
        output: {
          // Bundle Vuetify into a single chunk
          manualChunks: {
            vuetify: ['vuetify', 'vuetify/components', 'vuetify/directives'],
            vendor: ['vue', '@vue/runtime-core', '@vue/runtime-dom'],
          },
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
      routes: [],
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
    '@nuxtjs/leaflet',
    '@nuxtjs/i18n',
    '@nuxtjs/sitemap',
    '@nuxtjs/robots',
    '@pinia/nuxt',
    [
      '@nuxtjs/google-fonts',
      {
        families: {
          'Open Sans': [400, 600, 700],
        },
        display: 'swap',
        prefetch: true,
        preload: true,
      },
    ],
    [
      'nuxt-gtag',
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
    ], // Replace with your Google Analytics ID
    //'@sentry/nuxt/module',
    [
      '@vite-pwa/nuxt',
      {
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'safari-pinned-tab.svg',
        ],
        client: {
          installPrompt: true,
          periodicSyncForUpdates: 20, // check for updates every 20 seconds
        },
        workbox: {
          navigateFallback: '/',
          globPatterns: ['**/*.{js,css,html,png,svg,ico,woff,woff2}'],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\.cambio-uruguay\.com\/api\//,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 5, // 5 seconds max
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
                networkTimeoutSeconds: 3, // fallback to cache after 3s
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
              },
            },
            {
              urlPattern: /\.(?:png|gif|jpg|jpeg|svg|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            },
          ],
        },
        manifest: {
          name: 'Cambio Uruguay - Mejores Cotizaciones de Cambio',
          short_name: 'Cambio Uruguay',
          description:
            'Encuentra las mejores cotizaciones de cambio de divisas en Uruguay. Compara precios de más de 40 casas de cambio en tiempo real.',
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
        devOptions: {
          enabled: true,
          suppressWarnings: true,
          navigateFallbackAllowlist: [/^\/$/],
          type: 'module',
        },
      },
    ],
  ],

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
    //lazy: true,
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
    apiBaseServer:
      process.env.NUXT_API_BASE_SERVER || 'http://104.234.204.107:3528',
    // Public keys (exposed to client-side)
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://cambio-uruguay.com',
      // Client-side API URL
      apiBase:
        process.env.NUXT_PUBLIC_API_BASE || 'https://api.cambio-uruguay.com',
    },
  },

  // TypeScript Configuration
  typescript: {
    typeCheck: true,
  },

  // Dev Tools
  devtools: { enabled: true },

  // Compatibility
  compatibilityDate: '2024-06-12',
})
