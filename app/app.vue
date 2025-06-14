<template>
  <div>
    <!-- Main App -->
    <NuxtLoadingIndicator />
    <NuxtLayout name="default">
      <NuxtPage />
    </NuxtLayout>

    <!-- PWA Network Status -->
    <PWANetworkStatus />
  </div>
</template>

<script setup lang="ts">
// Handle hydration and errors
onErrorCaptured((error) => {
  console.error('App error captured:', error)
  return false
})

// SEO and Meta Configuration
useHead({
  htmlAttrs: {
    lang: 'es-ES',
  },
  meta: [
    // Basic meta tags
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
    // Favicon and icons
    { rel: 'manifest', href: '/site.webmanifest' },
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
    { rel: 'mask-icon', href: '/safari-pinned-tab.svg', color: '#5bbad5' },

    // Canonical and alternate links
    { rel: 'canonical', href: 'https://cambio-uruguay.com' },
    { rel: 'alternate', hreflang: 'es', href: 'https://cambio-uruguay.com/' },
    { rel: 'alternate', hreflang: 'en', href: 'https://cambio-uruguay.com/en' },
    { rel: 'alternate', hreflang: 'pt', href: 'https://cambio-uruguay.com/pt' },
    {
      rel: 'alternate',
      hreflang: 'x-default',
      href: 'https://cambio-uruguay.com/',
    },

    // Additional links
    { rel: 'author', href: '/humans.txt', type: 'text/plain' },
    { rel: 'sitemap', href: '/sitemap.xml', type: 'application/xml' },

    // Preconnect for performance
    { rel: 'preconnect', href: 'https://api.cambio-uruguay.com' },
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    {
      rel: 'preconnect',
      href: 'https://fonts.gstatic.com',
      crossorigin: 'anonymous',
    },
    { rel: 'preconnect', href: 'https://www.googletagmanager.com' },
  ],
})

// Global error handling
onErrorCaptured((error) => {
  console.error('Global error captured:', error)
  // You can add Sentry error reporting here if needed
  return false
})
</script>
