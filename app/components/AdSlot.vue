<template>
  <!-- A div, not an <aside aria-label>: with two or three units per page the landmark list read
       "Publicidad" several times (axe landmark-unique on 44 page profiles). The visible label below
       still says what the box is. -->
  <div v-if="enabled && !unfilled" ref="root" class="cu-ad" :class="`cu-ad--${placement}`">
    <span class="cu-ad__label">{{ $t('ads.label') }}</span>
    <ins
      v-if="near"
      ref="insEl"
      class="adsbygoogle"
      :data-ad-client="pubId"
      :data-ad-slot="slotId"
      :data-ad-format="
        placement === 'in-article' ? 'fluid' : placement === 'sidebar' ? undefined : 'auto'
      "
      :data-ad-layout="placement === 'in-article' ? 'in-article' : undefined"
      :data-full-width-responsive="placement === 'sidebar' ? undefined : 'true'"
    />
  </div>
</template>

<script setup lang="ts">
import type { AdPlacement } from '~/composables/useAds'

// One ad, in a place the site picked.
//
// Three things separate this from an auto-placed unit:
//   1. it never loads until the reader is within 400px of it, so an ad below
//      the fold costs nothing on first paint;
//   2. it reserves its height up front, so filling it shifts no text (a layout
//      shift is a Core Web Vitals hit, and that is the traffic half of the
//      trade, not just an annoyance);
//   3. it collapses when AdSense has nothing to serve, instead of leaving a
//      labelled blank rectangle in the middle of the page.
//
// The `sidebar` variant is the same component with a fixed size instead of a
// responsive one: 300x600, no `data-ad-format` and no full-width-responsive,
// because a fixed unit asked to be responsive is served at whatever width the
// rail column happens to have. It is hidden below 1280px with CSS and not with
// the Vuetify display composable: a `display: none` box never intersects, so on a phone the
// observer never fires and no request is made. See useAds.ts for the contract.

const props = withDefaults(defineProps<{ placement?: AdPlacement }>(), {
  placement: 'content-end',
})

const { pubId, canRender, slotIdFor } = useAds()

const enabled = computed(() => canRender(props.placement))
const slotId = computed(() => slotIdFor(props.placement))

const root = ref<HTMLElement | null>(null)
const insEl = ref<HTMLElement | null>(null)
/** Reader is close enough that loading the unit is worth it. */
const near = ref(false)
/** AdSense answered "no ad" — give the space back. */
const unfilled = ref(false)

let io: IntersectionObserver | null = null
let mo: MutationObserver | null = null
/** Waits for an unfilled unit the reader can see to leave the screen. */
let away: IntersectionObserver | null = null

type Place = 'below' | 'above' | 'on-screen'

/**
 * Give the reserved space back, the way that moves nothing the reader can see.
 *
 * Removing the box moves everything under it up by its height. Done while the box is on
 * screen, that moved the FAQ or the footer the reader was looking at: scroll-phase shifts
 * of exactly the unit's height (-407 / -390 px, CLS 0.25-0.48) on ten pages of the
 * 2026-11-19 probe. So:
 *   - below the screen: collapse now, nothing visible sits under it;
 *   - above the screen: collapse now. Chrome's scroll anchoring already scrolls by what was
 *     lost (measured 2026-11-20: 300 of 300 px). Scrolling again on top of that moved the
 *     text a second time, so only what the browser did NOT compensate is scrolled;
 *   - on screen: wait until it is off screen, then apply one of the two above.
 * Measuring never prevents the collapse: if it throws, the box goes as before.
 */
function giveBack(known?: Place) {
  const node = root.value
  const doc = node?.ownerDocument
  const view = doc?.defaultView
  let place: Place = 'below'
  let upperHalf = false
  try {
    if (known) place = known
    // The rail has a column of its own with nothing under it, and it is sticky, so it would
    // never leave the screen: removing it moves nothing, so it goes at once.
    else if (props.placement === 'sidebar') place = 'below'
    else if (node && view) {
      const box = node.getBoundingClientRect()
      place = box.top >= view.innerHeight ? 'below' : box.bottom <= 0 ? 'above' : 'on-screen'
      upperHalf = box.top < view.innerHeight / 2
    }
  } catch {
    place = 'below'
  }
  if (place === 'on-screen' && node && typeof IntersectionObserver !== 'undefined') {
    away = new IntersectionObserver(
      entries => {
        const entry = entries.find(item => !item.isIntersecting)
        if (!entry) return
        away?.disconnect()
        away = null
        giveBack(entry.boundingClientRect.top > 0 ? 'below' : 'above')
      },
      { threshold: 0 }
    )
    away.observe(node)
    return
  }
  // No observer to wait with: collapse now, compensating as before when the box is in the
  // upper half of the screen.
  const compensate = place === 'above' || (place === 'on-screen' && upperHalf)
  let before: { height: number; y: number } | null = null
  try {
    if (compensate && doc && view)
      before = { height: doc.documentElement.scrollHeight, y: view.scrollY }
  } catch {
    before = null
  }
  unfilled.value = true
  if (before && doc && view)
    void nextTick(() => {
      // Reading scrollHeight lays the page out, and with it the browser applies its own
      // scroll anchoring; scrollY then says how much of the loss it already took.
      const lost = before!.height - doc.documentElement.scrollHeight
      const rest = lost - (before!.y - view.scrollY)
      if (rest > 0) view.scrollBy({ top: -rest, behavior: 'instant' })
    })
}

onMounted(() => {
  if (!enabled.value || !root.value) return
  io = new IntersectionObserver(
    entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      near.value = true
      io?.disconnect()
      io = null
    },
    { rootMargin: '400px 0px' }
  )
  io.observe(root.value)
})

watch(near, async isNear => {
  if (!isNear) return
  await nextTick()
  const el = insEl.value
  // `cuPushed` guards the double-push that HMR and a re-activated keep-alive
  // page would otherwise cause; AdSense throws on a second push per <ins>.
  if (!el || el.dataset.cuPushed === '1') return
  el.dataset.cuPushed = '1'
  // Observe BEFORE requesting: an already loaded AdSense runtime can answer
  // during push(). Watching afterwards misses that response permanently.
  const checkStatus = () => {
    if (el.getAttribute('data-ad-status') !== 'unfilled' || !mo) return
    // Once per unit: the observer and the check right after push() can both see the answer.
    // Devolver el espacio reservado sin mover lo que la persona está leyendo: ver giveBack.
    mo.disconnect()
    mo = null
    giveBack()
  }
  mo = new MutationObserver(checkStatus)
  mo.observe(el, { attributes: true, attributeFilter: ['data-ad-status'] })
  try {
    const w = window as unknown as { adsbygoogle?: unknown[] }
    w.adsbygoogle = w.adsbygoogle || []
    w.adsbygoogle.push({})
    checkStatus()
  } catch {
    mo?.disconnect()
    mo = null
  }
})

onBeforeUnmount(() => {
  io?.disconnect()
  mo?.disconnect()
  away?.disconnect()
  io = null
  mo = null
  away = null
})
</script>

<style scoped>
/* The reserve is NOT a min-height on the box: AdSense writes `min-height: 0px !important;
   height: auto !important` inline on the ins's parents (axe samples, 2026-11-19), and an inline
   !important beats the stylesheet, so the box reserved nothing. A pseudo-element cannot carry an
   inline style. `::before` spans both rows and is `--cu-ad-reserve` tall, so the box is
   max(reserve, label + ad), exactly what the min-height gave with the label inside it: the `1fr`
   row takes what the reserve needs beyond the label, and the ad sits right under the label. */
.cu-ad {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto 1fr;
  width: 100%;
  margin: 32px auto;
  text-align: center;
  /* The reserved box is the anti-CLS measure; keep its layout to itself. */
  contain: layout;
}

.cu-ad::before {
  content: '';
  grid-column: 1;
  grid-row: 1 / 3;
  height: var(--cu-ad-reserve, 0px);
  pointer-events: none;
}

.cu-ad__label {
  display: block;
  grid-column: 1;
  grid-row: 1;
  margin-bottom: 4px;
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  /* 0.55 gave #808182 on the page's #f6f7f9: 3.64:1, under the 4.5:1 that 11 px text needs
     (Lighthouse on /alquileres-uruguay, 2026-10-08). 0.72 is ~5.9:1 there, and more on white. */
  opacity: 0.72;
}

/* `start`, not the grid's default stretch: the ins keeps the height AdSense gives it, as in
   block flow, and is never made as tall as the reserve. */
.cu-ad :deep(.adsbygoogle) {
  display: block;
  width: 100%;
  grid-column: 1;
  grid-row: 2;
  align-self: start;
}

/* Reserved heights match the responsive units AdSense serves at these widths.
   Bigger than the real ad is worse than smaller: it leaves a gap. */
.cu-ad--content-end,
.cu-ad--after-tool {
  --cu-ad-reserve: 300px;
}

.cu-ad--in-article {
  --cu-ad-reserve: 280px;
}

@media (min-width: 960px) {
  .cu-ad--content-end,
  .cu-ad--after-tool,
  .cu-ad--in-article {
    --cu-ad-reserve: 280px;
  }
}

/* The rail. Nothing under lg: the layout only builds the second column from
   1280px (layouts/default.vue → `.container_custom--rail`), and a hidden box
   never intersects, so no request leaves a phone. From lg on it is a fixed
   300x600 that reserves its whole height (anti-CLS, same promise as above) and
   sticks 80px under the top: 64px of app bar plus the 16px the page keeps
   between the bar and its content (DESIGN.md → "The Layout Owns The Top Rule").
   Sticky is safe here and only here because the column is the rail's own —
   there is no text under it to cover. */
.cu-ad--sidebar {
  display: none;
}

/* The rail stays a block box with its min-height: its ins is a fixed 300x600 of our own
   stylesheet, so the reserve lives in the ins and the pseudo-element is not needed there. */
.cu-ad--sidebar::before {
  content: none;
}

@media (min-width: 1280px) {
  .cu-ad--sidebar {
    display: block;
    width: 300px;
    margin: 0;
    min-height: 600px;
    position: sticky;
    top: 80px;
  }
  .cu-ad--sidebar :deep(.adsbygoogle) {
    width: 300px;
    height: 600px;
  }
}
</style>
