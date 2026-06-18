<template>
  <VContainer class="py-6">
    <VRow justify="center">
      <VCol cols="12" md="9" lg="8">
        <VCard class="overflow-hidden mb-5" elevation="8">
          <div class="hero pa-6">
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">{{ $t('dolarHoy.title') }}</h1>
            <p class="text-body-1 text-grey-lighten-2 mb-3">{{ $t('dolarHoy.subtitle') }}</p>
            <div class="d-flex justify-start justify-md-end">
              <ShareButtons :text="$t('dolarHoy.title')" />
            </div>
          </div>
        </VCard>

        <VCard class="pa-5 mb-5">
          <div v-if="pending" class="py-4">
            <VSkeletonLoader type="heading, text" class="bg-transparent" />
          </div>
          <template v-else>
            <div class="d-flex align-center ga-4 flex-wrap mb-4">
              <div>
                <div class="text-overline text-grey">{{ $t('dolarHoy.buy') }}</div>
                <div class="text-h4 font-weight-bold text-primary">{{ buy ? formatUYU(buy) : '-' }}</div>
              </div>
              <div>
                <div class="text-overline text-grey">{{ $t('dolarHoy.sell') }}</div>
                <div class="text-h4 font-weight-bold text-success">{{ sell ? formatUYU(sell) : '-' }}</div>
              </div>
              <VChip v-if="momentum.latest !== null" :color="chipColor" variant="tonal" :prepend-icon="chipIcon" class="ms-auto">
                {{ changeLabel }}
              </VChip>
            </div>

            <div class="text-overline text-grey mb-1">{{ $t('dolarHoy.sevenDays') }}</div>
            <div class="spark-lg">
              <Sparkline v-if="momentum.sparkline.length > 1" :values="momentum.sparkline" :up="momentum.direction !== 'down'" />
              <span v-else class="text-caption text-grey">{{ $t('dolarHoy.noTrend') }}</span>
            </div>
          </template>
        </VCard>

        <VCard class="pa-5" variant="flat">
          <p class="text-body-2 text-grey-lighten-1 mb-2">
            {{ $t('dolarHoy.footNote') }}
            <NuxtLink :to="localePath('/cotizacion/dolar')" class="lnk">{{ $t('dolarHoy.compareCta') }}</NuxtLink>
          </p>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
import { formatUYU } from '~/utils/format'

const localePath = useLocalePath()
const { t } = useI18n()
const { momentum, pending } = useDollarTrend()
const { bestBuy, bestSell } = useExchangeRates()

const buy = computed(() => bestBuy('USD'))
const sell = computed(() => bestSell('USD'))

const chipColor = computed(() =>
  momentum.value.direction === 'up' ? 'success' : momentum.value.direction === 'down' ? 'error' : 'grey'
)
const chipIcon = computed(() =>
  momentum.value.direction === 'up' ? 'mdi-trending-up' : momentum.value.direction === 'down' ? 'mdi-trending-down' : 'mdi-trending-neutral'
)
const changeLabel = computed(() => {
  const m = momentum.value
  const word = m.direction === 'up' ? t('dolarHoy.up') : m.direction === 'down' ? t('dolarHoy.down') : t('dolarHoy.flat')
  const pct = m.direction === 'flat' ? '' : ` ${Math.abs(m.changePct)}%`
  return `${word}${pct} ${t('dolarHoy.vsYesterday')}`
})

const canonical = computed(() => 'https://cambio-uruguay.com/dolar-hoy')

defineOgImageComponent('Cambio', {
  title: () => t('dolarHoy.title'),
  subtitle: () => t('dolarHoy.subtitle'),
  tag: 'DÓLAR HOY',
})

useSeoMeta({
  title: () => t('dolarHoy.metaTitle'),
  description: () => t('dolarHoy.metaDescription'),
  ogTitle: () => t('dolarHoy.metaTitle'),
  ogDescription: () => t('dolarHoy.metaDescription'),
  ogType: 'website',
  ogUrl: () => canonical.value,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [1, 2, 3].map(n => ({
          '@type': 'Question',
          name: t(`dolarHoy.faqQ${n}`),
          acceptedAnswer: { '@type': 'Answer', text: t(`dolarHoy.faqA${n}`) },
        })),
      }),
    },
  ],
}))
</script>

<style scoped>
.hero {
  background: linear-gradient(135deg, #2f81f7 0%, #16c784 100%);
}
.spark-lg :deep(.sparkline) {
  height: 60px;
}
.lnk {
  color: #64b5f6;
  font-weight: 600;
  text-decoration: none;
}
</style>
