<template>
  <VContainer class="py-8">
    <VRow justify="center">
      <VCol cols="12" md="7" lg="6">
        <VAlert
          v-if="banner"
          :type="banner.type"
          variant="tonal"
          class="mb-6"
          data-testid="newsletter-banner"
        >
          <div class="font-weight-bold">{{ banner.title }}</div>
          <div>{{ banner.msg }}</div>
        </VAlert>

        <VCard elevation="6" class="overflow-hidden">
          <div class="bg-gradient-news pa-5 text-white on-dark">
            <div class="d-flex align-center ga-3">
              <VIcon size="36">mdi-email-newsletter</VIcon>
              <div>
                <h1 class="text-h5 font-weight-bold mb-1">{{ $t('newsletter.title') }}</h1>
                <p class="text-body-2 mb-0 text-grey-lighten-3">{{ $t('newsletter.subtitle') }}</p>
              </div>
            </div>
          </div>
          <VCardText class="pa-6">
            <NewsletterSignup />
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useSeoMeta } from '#imports'

const { t, locale } = useI18n()
const route = useRoute()

const banner = computed(() => {
  const state = route.query.state
  if (state === 'confirmed')
    return {
      type: 'success' as const,
      title: t('newsletter.confirmedTitle'),
      msg: t('newsletter.confirmedMsg'),
    }
  if (state === 'unsubscribed')
    return {
      type: 'info' as const,
      title: t('newsletter.unsubscribedTitle'),
      msg: t('newsletter.unsubscribedMsg'),
    }
  if (state === 'invalid')
    return {
      type: 'warning' as const,
      title: t('newsletter.invalidTitle'),
      msg: t('newsletter.invalidMsg'),
    }
  return null
})

useSeoMeta({
  title: () => t('newsletter.metaTitle'),
  description: () => t('newsletter.metaDescription'),
  ogTitle: () => t('newsletter.metaTitle'),
  ogDescription: () => t('newsletter.metaDescription'),
})

defineOgImageComponent('Cambio', {
  title: () => t('newsletter.title'),
  subtitle: () => t('newsletter.subtitle'),
  tag: 'NEWSLETTER',
  locale: locale.value as 'es' | 'en' | 'pt',
})
</script>

<style scoped>
.bg-gradient-news {
  background: linear-gradient(135deg, #16c784 0%, #2f81f7 100%);
}
</style>
