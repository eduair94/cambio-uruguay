<template>
  <component
    :is="bannerOpen ? VDialog : 'div'"
    v-if="visible"
    v-bind="containerProps"
    class="cookie-consent"
  >
    <div class="cookie-consent__card">
      <div class="cookie-consent__text">
        <h2 v-if="bannerOpen" :id="titleId">{{ t('consent.title') }}</h2>
        <p>
          {{ bannerOpen ? t('consent.message') : localT('message') }}
          <NuxtLink
            :to="localePath('/privacidad')"
            class="cookie-consent__link"
            @click="openPolicy"
          >
            {{ t('consent.more') }}
          </NuxtLink>
        </p>
      </div>
      <div class="cookie-consent__actions">
        <VBtn variant="outlined" @click="reject">{{ t('consent.reject') }}</VBtn>
        <VBtn variant="outlined" @click="accept">{{ t('consent.accept') }}</VBtn>
      </div>
    </div>
  </component>
</template>

<script setup lang="ts">
import { VDialog } from 'vuetify/components'
const { t } = useI18n({ useScope: 'global' })
const { t: localT } = useI18n({
  useScope: 'local',
  messages: {
    es: {
      message: 'Cookies para medir visitas y mostrar anuncios.',
    },
    en: {
      message: 'Cookies to measure visits and show ads.',
    },
    pt: {
      message: 'Cookies para medir visitas e mostrar anúncios.',
    },
  },
})
const localePath = useLocalePath()
const { hasDecided, bannerOpen, accept, reject } = useConsent()
const titleId = useId()
const visible = computed(() => !hasDecided.value || bannerOpen.value)
const preferencesTrigger = shallowRef<HTMLElement | null>(null)
watch(
  bannerOpen,
  (open, wasOpen) => {
    if (!import.meta.client) return
    if (open) {
      preferencesTrigger.value =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
    } else if (wasOpen) {
      const trigger = preferencesTrigger.value
      preferencesTrigger.value = null
      nextTick(() => {
        if (trigger?.isConnected) trigger.focus({ preventScroll: true })
      })
    }
  },
  { flush: 'sync' }
)
function openPolicy() {
  // Navigation should reach the policy, without retaining the dialog or
  // returning focus to the footer of the previous page. Consent is unchanged.
  preferencesTrigger.value = null
  bannerOpen.value = false
}
// First visit stays in document flow. Only an explicit footer action opens a
// dialog, so preferences remain reachable without jumping back up the page.
const containerProps = computed(() =>
  bannerOpen.value
    ? {
        modelValue: true,
        'onUpdate:modelValue': (value: boolean) => {
          bannerOpen.value = value
        },
        maxWidth: 560,
        scrollable: true,
        'aria-labelledby': titleId,
      }
    : { role: 'region', 'aria-label': t('consent.title'), 'data-testid': 'cookie-consent-inline' }
)
</script>

<style scoped>
.cookie-consent:not(.v-dialog) {
  max-width: 1200px;
  margin: 0 auto;
  padding: 8px 12px;
}
.cookie-consent:not(.v-dialog) .cookie-consent__card {
  border: 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 0;
  padding: 4px 0 8px;
  background: transparent;
}
.cookie-consent__card {
  display: flex;
  align-items: center;
  gap: 12px 24px;
  padding: 12px 16px;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.16);
  border-radius: 12px;
}
.cookie-consent__text {
  flex: 1;
  min-width: 0;
}
.cookie-consent__text p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
}
.cookie-consent__text h2 {
  margin: 0 0 12px;
  font-size: 1.25rem;
}
.cookie-consent__link {
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
}
.cookie-consent__actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}
.cookie-consent__actions :deep(.v-btn) {
  min-height: 44px;
}
.v-dialog .cookie-consent__card {
  flex-direction: column;
  align-items: stretch;
  padding: 20px;
}
@media (max-width: 599px) {
  .cookie-consent__card {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 10px 12px;
  }
  .cookie-consent__actions .v-btn {
    flex: 1;
  }
}
</style>
