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
      :data-ad-format="placement === 'in-article' ? 'fluid' : 'auto'"
      :data-ad-layout="placement === 'in-article' ? 'in-article' : undefined"
      data-full-width-responsive="true"
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
  try {
    const w = window as unknown as { adsbygoogle?: unknown[] }
    w.adsbygoogle = w.adsbygoogle || []
    w.adsbygoogle.push({})
  } catch {
    return
  }
  // AdSense stamps data-ad-status="unfilled" on the <ins> when the auction
  // came back empty. That is the only signal that the reserved box is dead.
  mo = new MutationObserver(() => {
    if (el.getAttribute('data-ad-status') !== 'unfilled') return
    unfilled.value = true
    mo?.disconnect()
    mo = null
  })
  mo.observe(el, { attributes: true, attributeFilter: ['data-ad-status'] })
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
</style>
