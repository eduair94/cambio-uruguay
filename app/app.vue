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
//
// The route gate matters as much as the id: once this script is on the page,
// where the ads go is Google's decision, not ours. Keeping it off the routes
// that must not carry ads (`utils/ads.ts`) is the only code-side control over
// auto placement — /widget renders inside somebody else's site, /pizarra
// promises zero third-party requests, and the account and contact flows are
// worth more finished than monetised. The account meta stays unconditional so
// site verification still works from any URL.
const { pubId: adsensePubId, scriptAllowed } = useAds()
if (adsensePubId) {
  useHead({ meta: [{ name: 'google-adsense-account', content: adsensePubId }] })
  // The loader waits for hydration and never ships in the server HTML: Auto Ads drops its own
  // <div> into <main> the moment it runs, and mid-hydration Vue adopts that div as the layout's
  // container. See `adsenseLoaderScripts`.
  const hydrated = ref(false)
  onNuxtReady(() => {
    hydrated.value = true
  })
  useHead(() => ({
    script: adsenseLoaderScripts(adsensePubId, scriptAllowed.value, hydrated.value),
  }))
}
</script>
