<template>
  <aside
    v-if="enabled && !unfilled"
    ref="root"
    class="cu-ad"
    :class="`cu-ad--${placement}`"
    :aria-label="$t('ads.label')"
  >
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
  </aside>
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
    if (el.getAttribute('data-ad-status') !== 'unfilled') return
    unfilled.value = true
    mo?.disconnect()
    mo = null
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
  io = null
  mo = null
})
</script>

<style scoped>
.cu-ad {
  display: block;
  width: 100%;
  margin: 32px auto;
  text-align: center;
  /* The reserved box is the anti-CLS measure; keep its layout to itself. */
  contain: layout;
}

.cu-ad__label {
  display: block;
  margin-bottom: 4px;
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.55;
}

.cu-ad :deep(.adsbygoogle) {
  display: block;
  width: 100%;
}

/* Reserved heights match the responsive units AdSense serves at these widths.
   Bigger than the real ad is worse than smaller: it leaves a gap. */
.cu-ad--content-end {
  min-height: 300px;
}

.cu-ad--in-article {
  min-height: 280px;
}

@media (min-width: 960px) {
  .cu-ad--content-end,
  .cu-ad--in-article {
    min-height: 280px;
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
