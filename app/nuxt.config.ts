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
      // Fallback only — app.vue registers a brand-dedup function titleTemplate
      // that wins at render (a function can't be serialized in nuxt.config).
      titleTemplate: '%s | Cambio Uruguay',
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

        // Open Graph / Facebook. og:image and twitter:image are generated PER PAGE
        // by nuxt-og-image (see `ogImage` config + defineOgImageComponent), so they
        // are intentionally NOT hardcoded here — avoids duplicate/competing tags.
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Cambio Uruguay' },
        { property: 'og:locale', content: 'es_ES' },
        { property: 'og:locale:alternate', content: 'en_US' },
        { property: 'og:locale:alternate', content: 'pt_BR' },

        // Twitter Card
        { name: 'twitter:card', content: 'summary_large_image' },
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
    // Embeddable widget: must be framable from any third-party domain. Clear any
    // X-Frame-Options and allow all frame-ancestors so the iframe snippet works.
    '/widget': {
      ssr: true,
      headers: {
        'cache-control': 's-maxage=300',
        'X-Frame-Options': '',
        'Content-Security-Policy': 'frame-ancestors *',
      },
    },
    // Scalar's standalone reference (the @scalar/nuxt module always mounts one).
    // @scalar/api-reference can't be imported under Node SSR (web-worker shim),
    // so render it client-side only. It's robots-disallowed; the canonical,
    // SSR-chromed entry point is /desarrolladores.
    '/api-reference': { ssr: false },
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
    // Zero-downtime deploys: when NITRO_OUTPUT_DIR is set (by scripts/deploy.sh)
    // the build writes to a staging dir so the live .output keeps serving during
    // the build; the deploy script then atomically swaps it into place. Unset in
    // normal/dev builds -> Nitro keeps its default `.output`.
    ...(process.env.NITRO_OUTPUT_DIR ? { output: { dir: process.env.NITRO_OUTPUT_DIR } } : {}),
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
      // Durable store for the AI daily blog (one post per category per day).
      // Filesystem-backed so posts survive restarts and accumulate as history.
      blog: {
        driver: 'fs',
        base: './.data/blog',
      },
      // Durable store for daily-scraped courier per-kg rates (keeps last good value).
      couriers: {
        driver: 'fs',
        base: './.data/couriers',
      },
      // Durable store for daily-scraped lender TEA rates (keeps last good value).
      loans: {
        driver: 'fs',
        base: './.data/loans',
      },
      // Durable store for the tourist-IVA re-verify watchdog (withdraw:iva-check).
      withdraw: {
        driver: 'fs',
        base: './.data/withdraw',
      },
      // Durable store for refreshed exchange-house review snapshots (casas:reviews).
      'casas-reviews': {
        driver: 'fs',
        base: './.data/casas-reviews',
      },
    },
    experimental: {
      wasm: true,
      tasks: true, // enable Nitro scheduled tasks (daily blog generation)
    },
    scheduledTasks: {
      // 09:30 UTC ≈ 06:30 Uruguay: generate the day's blog posts.
      '30 9 * * *': ['blog:daily'],
      // 12:00 UTC = 09:00 Uruguay: send the daily newsletter to confirmed subs.
      '0 12 * * *': ['newsletter:daily'],
      // Every 10 minutes: evaluate rate alerts and notify (push + email + telegram).
      '*/10 * * * *': ['alerts:check'],
      // 11:00 UTC = 08:00 Uruguay: personalized Telegram summary for linked users.
      '0 11 * * *': ['telegram:summary'],
      // 08:15 UTC ≈ 05:15 Uruguay: refresh courier per-kg shipping rates.
      '15 8 * * *': ['couriers:scrape'],
      // 08:45 UTC ≈ 05:45 Uruguay: refresh lender TEA rates.
      '45 8 * * *': ['loans:scrape'],
      // 09:00 UTC Mondays ≈ 06:00 Uruguay: re-verify tourist-IVA facts watchdog.
      '0 9 * * 1': ['withdraw:iva-check'],
      // 07:30 UTC Mondays ≈ 04:30 Uruguay: refresh exchange-house review snapshots.
      '30 7 * * 1': ['casas:reviews'],
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
    // Scalar API reference. We do NOT use its standalone route — the
    // `ScalarApiReference` component is embedded inside /desarrolladores so the
    // site chrome + a custom dev-hub header wrap the docs. See that page.
    '@scalar/nuxt',
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
        // Google Consent Mode v2: deny all storage by default until the user
        // accepts via the cookie banner (useConsent flips these to granted).
        // wait_for_update gives the banner a moment before tags fire.
        initCommands: [
          [
            'consent',
            'default',
            {
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              ad_storage: 'denied',
              analytics_storage: 'denied',
              wait_for_update: 500,
            },
          ],
        ],
        // No static page_title/page_location here: those would stamp EVERY
        // session's first page_view with the home URL/title regardless of the
        // real landing page, wrecking the "most-visited pages" report. Let GA4
        // read the actual per-page URL + document.title (SPA route changes are
        // captured by GA4 Enhanced Measurement / nuxt-gtag's page tracking).
        // Google Ads conversion tag (v3 multi-destination syntax). Inherits the
        // consent default above — closes the previously ungated tag.
        tags: [
          {
            id: 'AW-972399920',
            config: {
              send_page_view: true,
            },
          },
        ],
      },
    ],
    //'@sentry/nuxt/module',
    [
      '@vite-pwa/nuxt',
      {
        registerType: 'autoUpdate',
        disable: process.env.NODE_ENV === 'development',
        workbox: {
          importScripts: ['firebase-messaging-extra.js'],
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
    // Declarative, spring-physics animations (v-motion directive) for the
    // home hero + card grids. SSR-safe, scroll-triggered via visibleOnce.
    '@vueuse/motion/nuxt',
  ],

  // Web Vitals tracking
  // webVitals: {
  //   provider: 'log', // Can be 'ga' for Google Analytics
  //   debug: process.env.NODE_ENV === 'development',
  //   disabled: false,
  // },

  // Robots Configuration
  robots: {
    disallow: ['/admin/', '/server/', '/_nuxt/', '/api-reference'],
    allow: [
      '/',
      '/avanzado',
      '/historico',
      '/sucursales',
      '/noticias',
      '/comparar',
      '/dolar',
      '/cotizacion',
      '/casa',
      '/guias',
      '/herramientas',
      '/glosario',
      '/convertir',
      '/indicadores',
      '/blog',
      '/acerca',
      '/conectar',
      '/desarrolladores',
    ],
    // Explicitly welcome AI search/answer crawlers so the site can be cited by
    // Google AI Overviews/Gemini, ChatGPT Search, Perplexity and Claude. These
    // are answer engines (not just training scrapers); citation drives traffic.
    groups: [
      {
        userAgent: [
          'GPTBot',
          'OAI-SearchBot',
          'ChatGPT-User',
          'ClaudeBot',
          'Claude-User',
          'anthropic-ai',
          'PerplexityBot',
          'Perplexity-User',
          'Google-Extended',
          'Applebot-Extended',
          'Bingbot',
          'Amazonbot',
          'cohere-ai',
        ],
        allow: ['/'],
        disallow: ['/admin/', '/server/', '/_nuxt/'],
      },
    ],
    sitemap: 'https://cambio-uruguay.com/sitemap.xml',
    credits: false,
  },

  // Sitemap Configuration
  sitemap: {
    sources: ['/api/__sitemap__/urls'],
    // Keep non-search pages out of the sitemap so they don't waste crawl budget
    // or show as "not indexed" in Search Console. These are auto-discovered from
    // pages/; the custom source above no longer emits them either. They're also
    // noindex'd at the page level. Globs cover the /en and /pt locale prefixes.
    exclude: [
      '/offline',
      '/widget',
      '/cuenta',
      '/estado',
      '/api-reference',
      '/*/offline',
      '/*/widget',
      '/*/cuenta',
      '/*/estado',
      '/*/api-reference',
    ],
  },

  // Scalar API reference. The module always registers one standalone page; we
  // park it at /api-reference (full-screen docs of /openapi.json) and rely on
  // the embedded <ScalarApiReference> on /desarrolladores as the canonical,
  // site-chromed entry point. /api-reference is robots-disallowed below to
  // avoid duplicate-content indexing.
  scalar: {
    url: '/openapi.json',
    darkMode: true,
    pathRouting: { basePath: '/api-reference' },
  },

  // OG image generation (nuxt-og-image, bundled with @nuxtjs/seo).
  // Branded per-page social previews via the OgImage/Cambio component.
  ogImage: {
    fonts: ['Open Sans:400', 'Open Sans:600', 'Open Sans:800', 'Sora:700', 'Sora:800'],
    defaults: {
      width: 1200,
      height: 630,
    },
  },

  // i18n Configuration
  i18n: {
    // Required for @nuxtjs/i18n to emit absolute hreflang/canonical alternate
    // links (was missing -> no hreflang tags were rendered).
    baseUrl: 'https://cambio-uruguay.com',
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
    // Self-hosted scraper bases for the weekly casas:reviews refresh (Google
    // Places proxy + Trustpilot API). Baked from .env at build — prod reads
    // useRuntimeConfig, not process.env (runtime env is empty under pm2). Unset
    // -> the task no-ops and /casas-de-cambio serves the researched snapshot.
    casasReviews: {
      gmapsUrl: process.env.CASAS_REVIEWS_GMAPS_URL || '',
      trustpilotUrl: process.env.CASAS_REVIEWS_TRUSTPILOT_URL || '',
    },
    // Server-side API URL (for SSR requests)
    apiBaseServer: process.env.NUXT_API_BASE_SERVER || 'http://104.234.204.107:3528',
    // AI provider (server-only) for the daily blog generator. OpenAI-compatible
    // wormgpt endpoint; defaults to the latest model. Falls back to the backend
    // /ai/insights when no apiKey is present in this app's environment.
    ai: {
      baseUrl:
        process.env.NUXT_AI_BASE_URL ||
        process.env.AI_BASE_URL ||
        'https://wormgpt.checkleaked.com/v1',
      apiKey: process.env.NUXT_AI_API_KEY || process.env.AI_API_KEY || '',
      model: process.env.NUXT_AI_MODEL || 'wormv5.1',
    },
    // User data store + Firebase Admin (server-only secrets)
    mongoUri: process.env.MONGO_URI || '',
    firebase: {
      // base64-encoded service account JSON (optional override).
      // File-based creds use FIREBASE_SERVICE_ACCOUNT_PATH / serviceAccount.json,
      // read directly from env in server/utils/firebaseAdmin.ts.
      serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT || '',
    },
    // Telegram account linking (bot token + deep-link username + internal-API secret)
    telegram: {
      token: process.env.TELEGRAM_BOT_TOKEN || '',
      username: process.env.TELEGRAM_BOT_USERNAME || '',
      secret: process.env.TELEGRAM_BOT_SECRET || '',
      // Optional admin chat id for ops alerts (e.g. withdraw:iva-check re-verify).
      // Empty -> watchdog records state + logs but sends no Telegram.
      adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || '',
    },
    // Discord OAuth2 login (server-side code exchange -> Firebase custom token).
    // Secrets are server-only; the client never sees clientSecret.
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
      redirectUri:
        process.env.DISCORD_REDIRECT_URI || 'https://cambio-uruguay.com/api/auth/discord/callback',
    },
    // Email newsletter (server-only). SMTP creds gate the whole feature: when
    // host/user/from are absent, signup returns 503 and the daily task no-ops.
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: process.env.SMTP_PORT || '587',
      secure: process.env.SMTP_SECURE || 'false',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || '',
    },
    newsletter: {
      delayMs: process.env.NEWSLETTER_SEND_DELAY_MS || '1000',
    },
    // Public keys (exposed to client-side)
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://cambio-uruguay.com',
      // Client-side API URL
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'https://api.cambio-uruguay.com',
      // Leaflet tile source. Default = public OSM tiles (fine for low traffic).
      // Switch to a tile-provider/CDN URL via NUXT_PUBLIC_TILE_URL before heavy traffic
      // (OSM's tile usage policy forbids heavy use of its public tiles).
      tileUrl:
        process.env.NUXT_PUBLIC_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      // Telegram bot username (public) for the Login Widget on /cuenta.
      telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || '',
      // Optional Discord community invite shown on /conectar. Empty -> login-only card.
      discordInviteUrl: process.env.DISCORD_INVITE_URL || '',
      // Microsoft Clarity project id (session replay + heatmaps). Empty -> disabled.
      // Set via env NUXT_PUBLIC_CLARITY_ID. See plugins/clarity.client.ts.
      clarityId: process.env.NUXT_PUBLIC_CLARITY_ID || '',
      // Google AdSense publisher id (ca-pub-XXXXXXXXXXXXXXXX). Empty until the
      // AdSense account is created; when set, app.vue injects the loader script.
      adsensePubId: process.env.NUXT_PUBLIC_ADSENSE_PUB_ID || '',
      // Firebase Web SDK config (public by design)
      firebase: {
        apiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY || '',
        authDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || '',
        appId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID || '',
        messagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      },
      // FCM web-push VAPID public key (Cloud Messaging → Web Push certificates)
      fcmVapidKey: process.env.NUXT_PUBLIC_FCM_VAPID_KEY || '',
    },
  },

  // Dev Tools
  devtools: { enabled: false },
  compatibilityDate: '2024-08-17',
})
