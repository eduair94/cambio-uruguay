// app/composables/useAds.ts
import { adDensityForPath, maxAdSlots, type AdDensity } from '~/utils/ads'

/**
 * The two places an ad is allowed to be.
 *   - `content-end`  after the article, before the footer. Rendered by the
 *                    default layout on every route that allows ads.
 *   - `in-article`   one unit inside a long read, dropped by the page itself at
 *                    a section break it chose. Only on `normal` density.
 * There is deliberately no sticky, no overlay and no interstitial placement:
 * those are the formats that cost sessions, and sessions are the traffic.
 */
export type AdPlacement = 'content-end' | 'in-article'

const SLOT_KEY: Record<AdPlacement, 'contentEnd' | 'inArticle'> = {
  'content-end': 'contentEnd',
  'in-article': 'inArticle',
}

/**
 * The AdSense loader for `useHead`, or nothing.
 *
 * Only after hydration. Auto Ads inserts its own `<div class="google-auto-placed">` into `<main>`
 * as soon as the script runs. With the script in the server HTML that happened while Vue was still
 * hydrating, and the div landed exactly where Vue expected the layout's `div.container_custom`.
 * Same tag, so Vue adopted it without touching the class, rendered the page again inside it and
 * removed the real container: every block without a container of its own went edge to edge, and
 * AdSense threw `no_div` for the ad it had just lost. Measured 2026-09-12 on /avanzado and
 * /alquilar-en-uruguay ("Hydration completed but contains mismatches").
 */
export function adsenseLoaderScripts(pubId: string, allowed: boolean, hydrated: boolean) {
  if (!pubId || !allowed || !hydrated) return []
  return [
    {
      src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pubId}`,
      async: true,
      crossorigin: 'anonymous' as const,
    },
  ]
}

export function useAds() {
  const route = useRoute()
  const publicConfig = useRuntimeConfig().public
  const pubId = (publicConfig.adsensePubId as string) || ''
  const slots = (publicConfig.adsenseSlots ?? {}) as Partial<
    Record<'contentEnd' | 'inArticle', string>
  >

  // `definePageMeta({ ads: false })` wins over the route table.
  const density = computed<AdDensity>(() =>
    route.meta.ads === false ? 'none' : adDensityForPath(route.path)
  )

  const maxSlots = computed(() => maxAdSlots(density.value))

  /**
   * Whether the AdSense loader script may run on this route at all. Keeping it
   * off the no-ads routes is the only code-side control over auto ads: once the
   * script is on the page, placement is Google's call, not ours.
   */
  const scriptAllowed = computed(() => Boolean(pubId) && density.value !== 'none')

  const slotIdFor = (placement: AdPlacement) => slots[SLOT_KEY[placement]] || ''

  /**
   * A manual unit renders only when its ad-unit id is configured. Empty by
   * default, on purpose: the slot ids are meant to be filled in *after* auto
   * ads are dialled back in the AdSense console, so the two never stack.
   */
  const canRender = (placement: AdPlacement) => {
    if (!pubId || !slotIdFor(placement)) return false
    if (density.value === 'none') return false
    if (placement === 'in-article' && density.value !== 'normal') return false
    return true
  }

  return { pubId, density, maxSlots, scriptAllowed, slotIdFor, canRender }
}
