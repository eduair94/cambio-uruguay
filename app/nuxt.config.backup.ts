import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  // SSR Configuration
  ssr: true,

  // Site Configuration (required for @nuxt/sitemap and SEO)
  site: {
    url: 'https://cambio-uruguay.com',
    name: 'Cambio Uruguay',
    description:
      'Encuentra las mejores cotizaciones de cambio de divisas en Uruguay. Compara precios de más de 40 casas de cambio en tiempo real.',
    defaultLocale: 'es',
    identity: {
      type: 'Organization',
    },
    twitter: '@cambio_uruguay',
    trailingSlash: false,
  },

  // App Configuration - keeping existing head config but optimized
  app: {
    head: {
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
        // ... keeping all the existing meta tags
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
        // Only keep essential preconnects
        {
          rel: 'preconnect',
          href: 'https://api.cambio-uruguay.com',
        },
        {
          rel: 'dns-prefetch',
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

  // Build Configuration - Simplified for stability
  build: {
    transpile: ['vuetify'],
  },

  // Vite Configuration - Optimized for performance
  vite: {
    define: {
      'process.env.DEBUG': false,
    },
    css: {
      devSourcemap: false,
    },
    build: {
      cssCodeSplit: true, // Enable CSS code splitting
      minify: 'esbuild',
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          // Improved chunk splitting for performance
          manualChunks: {
            'vuetify-core': ['vuetify'],
            'vuetify-components': ['vuetify/components'],
            'vue-runtime': ['vue', '@vue/runtime-core', '@vue/runtime-dom'],
            i18n: ['vue-i18n'],
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
  },

  nitro: {
    prerender: {
      routes: ['/sitemap.xml'],
      crawlLinks: false,
    },
    compressPublicAssets: {
      gzip: true,
      brotli: true,
    },
    minify: true,
  },

  // Modules - Essential only to avoid build conflicts
  modules: [
    '@nuxtjs/seo',
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
        prefetch: false,
        preload: false,
        download: true,
        inject: true,
      },
    ],
    [
      'nuxt-gtag',
      {
        id: 'G-F97PNVRMRF',
        loadingStrategy: 'defer',
        config: {
          page_title: 'Cambio Uruguay',
          page_location: 'https://cambio-uruguay.com',
        },
      },
    ],
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
          periodicSyncForUpdates: 20,
        },
        workbox: {
          navigateFallback: '/',
          globPatterns: ['**/*.{js,css,html,png,svg,ico,woff,woff2}'],
          cleanupOutdatedCaches: true,
          // Optimized caching for performance
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\.cambio-uruguay\.com\/api\//,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 10,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
                networkTimeoutSeconds: 2,
              },
            },
            {
              urlPattern: /\.(?:png|gif|jpg|jpeg|svg|webp|avif)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
        manifest: {
          name: 'Cambio Uruguay - Mejores Cotizaciones de Cambio',
          short_name: 'Cambio Uruguay',
          description:
            'Encuentra las mejores cotizaciones de cambio de divisas en Uruguay.',
          theme_color: '#272727',
          background_color: '#272727',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          lang: 'es',
        },
      },
    ],
  ],

  // Robots Configuration
  robots: {
    disallow: ['/admin/', '/_nuxt/', '/.nuxt/', '/server/'],
    sitemap: 'https://cambio-uruguay.com/sitemap.xml',
    credits: false,
  },

  // Sitemap Configuration
  sitemap: {
    sources: ['/api/__sitemap__/urls'],
  },

  // i18n Configuration
  i18n: {
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
  },

  // Runtime Config
  runtimeConfig: {
    sentry: {
      dsn: process.env.SENTRY_DSN,
    },
    apiBaseServer:
      process.env.NUXT_API_BASE_SERVER || 'http://104.234.204.107:3528',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://cambio-uruguay.com',
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
