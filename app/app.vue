<template>
  <div>
    <!-- Main App -->
    <NuxtLoadingIndicator />
    <!-- No explicit name: NuxtLayout reads the layout from route meta, so each
         page's definePageMeta({ layout }) is honored (defaulting to 'default').
         Lets bare pages like /widget opt out of the default app shell. -->
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <!-- PWA Network Status - Client Only -->
    <ClientOnly>
      <PWANetworkStatus />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
// Site-wide default branded OG image. Pages override via defineOgImageComponent.
defineOgImageComponent('Cambio')

// Title template with brand dedup. Pages set a query-matched title (e.g.
// "BROU: cotización del dólar hoy e histórico"); we append "| Cambio Uruguay"
// only when the brand isn't already present. This kills the old double-branding
// ("… - Cambio Uruguay | Cambio Uruguay - Cotización del Dólar", 76 chars) that
// truncated in the SERP and hurt CTR. A function template can't live in
// nuxt.config (it must serialize), so it's registered here and wins by order.
useHead({
  titleTemplate: title => {
    if (!title) return 'Cambio Uruguay: cotización del dólar hoy en Uruguay'
    return /cambio uruguay/i.test(title) ? title : `${title} | Cambio Uruguay`
  },
})

// Site-wide default og:image:alt / twitter:image:alt. nuxt-og-image emits the
// image + dimensions but never an alt, so without this the branded preview has
// no alt text on any page. Pages with a more specific alt override via their
// own useSeoMeta({ ogImageAlt }); this is the floor so every page has one.
useSeoMeta({
  ogImageAlt: 'Cambio Uruguay: cotización del dólar hoy y comparador de casas de cambio',
  twitterImageAlt: 'Cambio Uruguay: cotización del dólar hoy y comparador de casas de cambio',
})

// Google AdSense: inject the loader + account meta only when a publisher id is
// configured (NUXT_PUBLIC_ADSENSE_PUB_ID). Empty by default so nothing loads
// until the AdSense account exists — applying later is a config change, not a
// code change. Personalized-ads behaviour follows the Consent Mode v2 signals
// set by the cookie banner.
const adsensePubId = useRuntimeConfig().public.adsensePubId as string
if (adsensePubId) {
  useHead({
    meta: [{ name: 'google-adsense-account', content: adsensePubId }],
    script: [
      {
        src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsensePubId}`,
        async: true,
        crossorigin: 'anonymous',
      },
    ],
  })
}

// Handle hydration and errors
onErrorCaptured(error => {
  console.error('App error captured:', error)
  return false
})

// Global error handling
onErrorCaptured(error => {
  console.error('Global error captured:', error)
  // You can add Sentry error reporting here if needed
  return false
})

const hideFeedback = () => {
  document.head.insertAdjacentHTML(
    'beforeend',
    `<style type="text/css" class="custom_style_list">
                    ._hj_feedback_container {
                      display:none!important;
                    }
            </style>`
  )
}

const hideWidgets = (att = 0) => {
  const t = (window as any).Tawk_API
  if (t?.hideWidget) {
    localStorage.setItem('hideWidgets', '1')
    t.hideWidget()
    hideFeedback()
  } else {
    nextTick(() => {
      att++
      if (att === 10) {
        console.log('hide widget', att)
        return
      }
      hideWidgets(att)
    })
  }
}

onMounted(() => {
  // This is a good place to initialize any global state or perform actions
  const hasToHideWidgets = localStorage.getItem('hideWidgets')
  if (hasToHideWidgets === 'true') {
    hideWidgets()
  }
})
</script>
