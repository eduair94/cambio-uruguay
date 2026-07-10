<template>
  <!-- Removed entirely if the third-party widget fails: a heading with an empty
       box under it is worse than no social proof at all. -->
  <section v-if="!failed" v-reveal class="reviews-section py-12">
    <VContainer>
      <VRow>
        <VCol cols="12" md="10" lg="8" class="mx-auto text-center mb-8">
          <h2 class="text-h4 font-weight-bold mb-4">{{ t('reviews.title') }}</h2>
          <p class="text-body-1 text-grey-lighten-1">{{ t('reviews.subtitle') }}</p>
        </VCol>
      </VRow>

      <VRow justify="center">
        <VCol cols="12" md="10" lg="8">
          <IntersectionWrapper root-margin="200px" show-placeholder>
            <template #placeholder>
              <div class="reviews-skeleton" :style="heightStyle" />
            </template>

            <ClientOnly>
              <div
                ref="mountEl"
                class="reviews-widget"
                :style="heightStyle"
                role="region"
                :aria-label="t('reviews.a11yRegion')"
              />
              <template #fallback>
                <div class="reviews-skeleton" :style="heightStyle" />
              </template>
            </ClientOnly>
          </IntersectionWrapper>
        </VCol>
      </VRow>

      <div class="d-flex justify-center flex-wrap ga-3 mt-6">
        <VBtn
          :href="TRUSTPILOT_REVIEW_URL"
          target="_blank"
          rel="noopener noreferrer"
          color="primary"
          variant="elevated"
          data-cta="trustpilot-write"
        >
          <VIcon start>mdi-star-outline</VIcon>
          {{ t('reviews.write') }}
        </VBtn>
        <VBtn
          :href="TRUSTPILOT_PROFILE_URL"
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
          data-cta="trustpilot-all"
        >
          {{ t('reviews.seeAll') }}
        </VBtn>
      </div>
    </VContainer>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import type { TrustpilotWidgetHandle } from 'trustpilot-iframe-widget/vanilla'
import {
  buildWidgetConfig,
  TRUSTPILOT_PROFILE_URL,
  TRUSTPILOT_REVIEW_URL,
  TRUSTPILOT_WIDGET_HEIGHT,
} from '~/utils/trustpilot'

const { t } = useI18n()
const { applied } = useThemeMode()

/** The iframe is third-party; if it never signals ready, we assume it never will. */
const READY_TIMEOUT_MS = 8_000

const mountEl = ref<HTMLElement>()
const failed = ref(false)
const heightStyle = { minHeight: `${TRUSTPILOT_WIDGET_HEIGHT}px` }

let widget: TrustpilotWidgetHandle | null = null
let readyTimer: ReturnType<typeof setTimeout> | null = null
let mounting = false
let unmounted = false

function clearReadyTimer() {
  if (readyTimer) {
    clearTimeout(readyTimer)
    readyTimer = null
  }
}

// Single teardown path. The soft-fail below removes the section via `v-if`
// WITHOUT unmounting this component (the parent still renders it), so
// `onBeforeUnmount` alone never runs on that path — the widget's autoplay
// interval and listeners would leak for the rest of the visit. Every exit
// (fail, unmount) must route through here to actually release the widget.
function teardown() {
  clearReadyTimer()
  widget?.destroy()
  widget = null
}

function fail() {
  teardown()
  failed.value = true
}

async function mountWidget(target: HTMLElement) {
  if (widget || mounting || unmounted) return
  mounting = true
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  try {
    // The root entry imports React. Always the /vanilla subpath.
    const { createTrustpilotWidget } = await import('trustpilot-iframe-widget/vanilla')
    // The import is uncancellable; if we were torn down while it was in flight,
    // do not create a widget attached to an orphaned node with an unclearable timer.
    if (unmounted) return
    readyTimer = setTimeout(fail, READY_TIMEOUT_MS)
    widget = createTrustpilotWidget({
      target,
      ...buildWidgetConfig({ theme: applied.value, reducedMotion }),
      onReady: clearReadyTimer,
      onError: fail,
    })
  } catch {
    // Chunk fetch blocked (ad-blockers routinely match "trustpilot"), or the
    // service is down. Either way: no section.
    fail()
  } finally {
    mounting = false
  }
}

// IntersectionWrapper only renders its slot once scrolled into view, so the ref
// arrives late. Watching it is what defers the iframe past LCP.
watch(mountEl, el => {
  if (el) void mountWidget(el)
})

watch(applied, theme => widget?.updateConfig({ theme }))

onBeforeUnmount(() => {
  unmounted = true
  teardown()
})
</script>

<style scoped>
.reviews-widget,
.reviews-skeleton {
  width: 100%;
}

.reviews-skeleton {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.v-theme--light .reviews-skeleton {
  background: rgba(15, 23, 42, 0.03);
  border-color: rgba(15, 23, 42, 0.1);
}
</style>
