// app/composables/useAds.ts
import { adDensityForPath, maxAdSlots, type AdDensity } from '~/utils/ads'

/**
 * The three places an ad is allowed to be.
 *   - `content-end`  after the article, before the footer. Rendered by the
 *                    default layout on every route that allows ads.
 *   - `in-article`   one unit inside a long read, dropped by the page itself at
 *                    a section break it chose. Only on `normal` density.
 *   - `sidebar`      a fixed 300x600 rail the default layout hangs to the RIGHT
 *                    of the reading column, out of the column and never in it:
 *                    the column gives up 300px plus the gap, the text is never
 *                    interrupted and nothing is pushed down (DESIGN.md → "The
 *                    Rail Is Not The Column Rule"). Desktop only — `display:
 *                    none` under 1280px, so on a phone the IntersectionObserver
 *                    never fires and no request is made — `normal` density
 *                    only, and inert until `NUXT_PUBLIC_ADSENSE_SLOT_SIDEBAR`
 *                    exists: with no slot id the modifier class is never
 *                    applied and the layout is what shipped before the rail.
 * The rail sticks (top: 80px) while the reader scrolls the column. It is the
 * one sticky format kept, and only because it never covers content: it lives
 * in a column of its own. There is still no overlay, no anchor over the text
 * and no interstitial: those are the formats that cost sessions, and sessions
 * are the traffic.
 */
export type AdPlacement = 'content-end' | 'in-article' | 'sidebar'

/** Keys of `runtimeConfig.public.adsenseSlots` (nuxt.config.ts). */
type AdSlotKey = 'contentEnd' | 'inArticle' | 'sidebar'

const SLOT_KEY: Record<AdPlacement, AdSlotKey> = {
  'content-end': 'contentEnd',
  'in-article': 'inArticle',
  sidebar: 'sidebar',
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
  const slots = (publicConfig.adsenseSlots ?? {}) as Partial<Record<AdSlotKey, string>>

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
    // The article unit and the rail are for long reads only: on a `light`
    // route (a quote, a map, a calculator result) the one unit after the
    // content is the whole budget.
    if (placement !== 'content-end' && density.value !== 'normal') return false
    return true
  }

  return { pubId, density, maxSlots, scriptAllowed, slotIdFor, canRender }
}
