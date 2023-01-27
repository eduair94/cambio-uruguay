import colors from 'vuetify/es5/util/colors'
import es from 'vuetify/lib/locale/es'
import pt from 'vuetify/lib/locale/pt'
import translations from './translations'

export default {
  type: 'module',
  loading: '~/components/LoadingBar.vue',
  // Global page headers: https://go.nuxtjs.dev/config-head

  head: {
    addSeoAttributes: true,
    htmlAttrs: {
      lang: 'es-ES'
    },
    titleTemplate: '%s - Cambio Uruguay',
    title: 'Cambio Uruguay',
    description:
      'Encuentra las mejores cotizaciones de cambio de divisas en Uruguay',
    meta: [
      { charset: 'utf-8' },
      {
        name: 'twitter:title',
        content: 'Cambio Uruguay'
      },
      {
        name: 'twitter:description',
        content:
          'Cambio Uruguay - Encuentra las mejores casas cambiarias del país, mejores cotizaciones de dólares (USD), pesos argentinos (ARS) y reales brasileños (BRL).'
      },
      {
        name: 'twitter:image',
        content: 'https://cambio-uruguay.com/img/banner.png'
      },
      {
        name: 'twitter:site',
        content: '@cambios_uy'
      },
      {
        name: 'twitter:creator',
        content: '@cambios_uy'
      },
      {
        name: 'og:site_name',
        content: 'Cambio Uruguay'
      },
      {
        name: 'robots',
        content: 'index, follow'
      },
      {
        name: 'viewport',
        content:
          'width=device-width, initial-scale=1, user-scalable=yes, maximum-scale=5'
      },
      {
        hid: 'description',
        name: 'description',
        content:
          'Cambio Uruguay - Encuentra las mejores casas cambiarias de Montevideo / Uruguay, mejores cotizaciones de dólares (USD), pesos argentinos (ARS) y reales brasileros (BRL).'
      },
      {
        hid: 'og:title',
        property: 'og:title',
        content: `Cambio Uruguay`
      },
      {
        hid: 'og:description',
        property: 'og:description',
        content: `Cambio Uruguay - Encuentra las mejores casas cambiarias del país, mejores cotizaciones de dólares (USD), pesos argentinos (ARS) y reales brasileros (BRL).`
      },
      {
        hid: 'og:image',
        property: 'og:image',
        content: `https://cambio-uruguay.com/img/banner.png`
      },
      {
        name: 'referrer',
        content: 'no-referrer'
      },
      {
        name: 'keywords',
        content:
          'cotizaciones uruguay,casa cambiaria,cambio moneda,cambio dólares,cambio pesos argentinos,cambio reales,cambio euros,varlix,prex,gales,cambio montevideo,cambio,donde cambiar dólares en Uruguay,cambio divisas,donde comprar pesos argentinos en uruguay,donde comprar dolares en uruguay'
      },
      {
        name: 'msapplication-TileColor',
        content: '#3B9B85'
      },
      {
        name: 'theme-color',
        content: '#3B9B85'
      }
    ],
    link: [
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png'
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png'
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png'
      },
      {
        rel: 'mask-icon',
        href: '/safari-pinned-tab.svg',
        color: '#5bbad5'
      },
      {
        href: 'https://cdn.maptiler.com/maptiler-geocoder/v1.1.0/maptiler-geocoder.css',
        rel: 'stylesheet'
      }
    ],
    script: [
      {
        async: true,
        src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7038674901615097',
        crossorigin: 'anonymous'
      },
      {
        src: 'https://cdn.maptiler.com/maptiler-geocoder/v1.1.0/maptiler-geocoder.js'
      },
      {
        src:
          process.env.NODE_ENV === 'production'
            ? 'https://arc.io/widget.min.js#63RUbX6J'
            : '',
        async: true
      }
    ]
  },

  server: {
    port: 3311, // default: 3000
    host: '0.0.0.0' // default: localhost
  },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: [],

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [{ src: '~/plugins/vue-plugins', mode: 'client' }],

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
      }
    ],
    '@nuxtjs/google-fonts'
  ],

  googleFonts: {
    families: {
      'Open Sans': [400, 600, 700]
    }
  },

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [
    '@nuxtjs/sentry',
    'nuxt-leaflet',
    '@nuxtjs/i18n',
    '@nuxtjs/sitemap',
    [
      '@nuxtjs/robots',
      {
        UserAgent: '*',
        Disallow: '',
        Sitemap: 'http://cambio-uruguay.com/sitemap.xml'
      }
    ],
    // https://go.nuxtjs.dev/axios
    '@nuxtjs/axios',
    [
      '@netsells/nuxt-hotjar',
      {
        id: '3306157',
        sv: '6'
      }
    ]
  ],

  sentry: {
    dsn: process.env.SENTRY_DSN, // Enter your project's DSN.
    // Additional Module Options.
    config: {
      tracesSampleRate: 1.0,
      browserTracing: {},
      vueOptions: {
        trackComponents: true
      }
      // Optional Sentry SDK configuration.
      // Those options are shared by both the Browser and the Server instances.
      // Browser-onlsy and Server-only options should go
      // into `clientConfig` and `serverConfig` objects respectively.
    }
  },

  // Axios module configuration: https://go.nuxtjs.dev/config-axios
  axios: {
    // Workaround to avoid enforcing hard-coded localhost:3000: https://github.com/nuxt-community/axios-module/issues/308
    baseURL: '/'
  },

  i18n: {
    strategy: 'prefix_except_default',
    baseUrl: 'https://cambio-uruguay.com',
    locales: [
      {
        code: 'en',
        iso: 'en-US',
        name: 'English'
      },
      {
        code: 'es',
        iso: 'es-ES',
        name: 'Español'
      },
      {
        code: 'pt',
        iso: 'pt-BR',
        name: 'Português'
      }
    ],
    defaultLocale: 'es',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root' // recommended
    },
    vueI18n: {
      fallbackLocale: 'es',
      messages: translations
    }
  },

  router: {
    base: '/',
    mode: 'history'
  },

  // PWA module configuration: https://go.nuxtjs.dev/pwa
  pwa: {
    icon: {
      purpose: 'maskable'
    },
    manifest: {
      theme_color: '#272727',
      start_url: 'https://cambio-uruguay.com',
      crossorigin: 'use-credentials',
      name: 'Cambio Uruguay App',
      short_name: 'Cambio Uruguay',
      lang: 'es',
      categories: ['finance', 'business', 'currency'],
      description:
        'Encuentra las mejores cotizaciones de cambio de divisas en Uruguay'
    },
    workbox: {
      workboxURL:
        'https://cdn.jsdelivr.net/npm/workbox-cdn/workbox/workbox-sw.js',
      importScripts:
        process.env.NODE_ENV === 'production'
          ? ['https://arc.io/arc-sw-core.js']
          : [],
      autoRegister: true
    }
  },

  // Vuetify module configuration: https://go.nuxtjs.dev/config-vuetify
  vuetify: {
    lang: {
      locales: { pt, es }
    },
    treeShake: true,
    customVariables: ['~/assets/variables.scss'],
    defaultAssets: {
      font: {
        family: 'Open Sans'
      }
    },
    theme: {
      dark: true,
      themes: {
        dark: {
          primary: colors.blue.darken2,
          accent: colors.grey.darken3,
          secondary: colors.amber.darken3,
          info: colors.teal.lighten1,
          warning: colors.amber.base,
          error: colors.deepOrange.accent4,
          success: colors.green.accent3
        }
      }
    }
  },

  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {
    extend(config, { isClient }) {
      // Extend only webpack config for client-bundle
      if (isClient) {
        config.devtool = 'source-map'
      }
    }
  }
}
