<!-- app/components/CookieConsent.vue -->
<template>
  <VFadeTransition>
    <div v-if="visible" class="cookie-consent" role="region" :aria-label="t('consent.title')">
      <VCard class="cookie-consent__card pa-4" elevation="12">
        <div class="d-flex flex-column flex-md-row align-md-center ga-3">
          <div class="cookie-consent__text text-body-2">
            {{ t('consent.message') }}
            <NuxtLink :to="localePath('/privacidad')" class="cookie-consent__link">
              {{ t('consent.more') }}
            </NuxtLink>
          </div>
          <div class="d-flex ga-2 flex-shrink-0">
            <VBtn variant="text" color="grey-lighten-1" @click="reject">
              {{ t('consent.reject') }}
            </VBtn>
            <VBtn color="primary" variant="elevated" @click="accept">
              {{ t('consent.accept') }}
            </VBtn>
          </div>
        </div>
      </VCard>
    </div>
  </VFadeTransition>
</template>

<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const { hasDecided, bannerOpen, accept, reject } = useConsent()

// Show until a decision is made, or when the user re-opens it from the footer.
const visible = computed(() => !hasDecided.value || bannerOpen.value)
</script>

<style scoped>
.cookie-consent {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 2000;
  display: flex;
  justify-content: center;
  padding: 12px;
  pointer-events: none;
}
.cookie-consent__card {
  pointer-events: auto;
  max-width: 920px;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
}
.cookie-consent__text {
  line-height: 1.6;
}
.cookie-consent__link {
  color: #64b5f6;
  text-decoration: none;
  font-weight: 600;
}
.cookie-consent__link:hover {
  text-decoration: underline;
}
</style>
