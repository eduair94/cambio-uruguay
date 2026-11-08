<template>
  <section v-reveal class="reviews-section py-12">
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
              <iframe
                class="reviews-widget"
                :src="widgetUrl"
                :title="t('reviews.a11yRegion')"
                :height="TRUSTPILOT_WIDGET_HEIGHT"
                loading="eager"
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

import {
  buildWidgetUrl,
  TRUSTPILOT_PROFILE_URL,
  TRUSTPILOT_REVIEW_URL,
  TRUSTPILOT_WIDGET_HEIGHT,
} from '~/utils/trustpilot'

const { t } = useI18n()
const { applied } = useThemeMode()

const reducedMotion = ref(false)
const heightStyle = { minHeight: `${TRUSTPILOT_WIDGET_HEIGHT}px` }
const widgetUrl = computed(() =>
  buildWidgetUrl({ theme: applied.value, reducedMotion: reducedMotion.value })
)

// IntersectionWrapper defers the navigation until this section is near view.
// Keep the frame visible while it loads: its `load` event also waits for remote
// assets, so it is not a deadline for displaying reviews that already rendered.
onMounted(() => {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})
</script>

<style scoped>
.reviews-widget,
.reviews-skeleton {
  width: 100%;
}

.reviews-widget {
  display: block;
  border: 0;
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
