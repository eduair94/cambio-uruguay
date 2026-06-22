<template>
  <VContainer class="py-6">
    <VRow justify="center">
      <VCol cols="12" md="9" lg="8">
        <h1 class="text-h5 text-md-h4 font-weight-bold mb-1">{{ $t('dolarRecords.title') }}</h1>
        <p class="text-body-1 text-grey-lighten-1 mb-5">{{ $t('dolarRecords.subtitle') }}</p>

        <div v-if="pending"><VSkeletonLoader type="table" class="bg-transparent" /></div>
        <VAlert v-else-if="records.max === null" type="info" variant="tonal">
          {{ $t('dolarRecords.noData') }}
        </VAlert>
        <div v-else class="records-grid">
          <div class="rec-box">
            <div class="text-overline text-grey">{{ $t('dolarRecords.max') }}</div>
            <div class="text-h5 font-weight-bold text-success">
              {{ formatUYU(records.max.value) }}
            </div>
            <div class="text-caption text-grey">{{ fmtDate(records.max.date) }}</div>
          </div>
          <div class="rec-box">
            <div class="text-overline text-grey">{{ $t('dolarRecords.min') }}</div>
            <div class="text-h5 font-weight-bold text-error">
              {{ formatUYU(records.min.value) }}
            </div>
            <div class="text-caption text-grey">{{ fmtDate(records.min.date) }}</div>
          </div>
          <div v-if="records.yearAgo !== null" class="rec-box">
            <div class="text-overline text-grey">{{ $t('dolarRecords.yearAgo') }}</div>
            <div class="text-h5 font-weight-bold">{{ formatUYU(records.yearAgo) }}</div>
          </div>
          <div v-if="records.monthlyAvg !== null" class="rec-box">
            <div class="text-overline text-grey">{{ $t('dolarRecords.monthlyAvg') }}</div>
            <div class="text-h5 font-weight-bold">{{ formatUYU(records.monthlyAvg) }}</div>
          </div>
        </div>

        <p class="text-body-2 text-grey-lighten-1 mt-5">
          {{ $t('dolarRecords.seeMoreIntro') }}
          <NuxtLink :to="localePath('/dolar-hoy')" class="lnk">{{
            $t('dolarRecords.seeToday')
          }}</NuxtLink>
          {{ $t('dolarRecords.seeMoreOr') }}
          <NuxtLink :to="localePath('/historico')" class="lnk">{{
            $t('dolarRecords.seeHistory')
          }}</NuxtLink
          >.
        </p>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
import { formatUYU } from '~/utils/format'

const localePath = useLocalePath()
const { t } = useI18n()
const { records, pending } = useDollarTrend()

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-UY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const canonical = 'https://cambio-uruguay.com/dolar/records'
defineOgImageComponent('Cambio', {
  title: () => t('dolarRecords.title'),
  subtitle: () => t('dolarRecords.subtitle'),
  tag: 'RÉCORDS',
})
useSeoMeta({
  title: () => t('dolarRecords.metaTitle'),
  description: () => t('dolarRecords.metaDescription'),
  ogTitle: () => t('dolarRecords.metaTitle'),
  ogDescription: () => t('dolarRecords.metaDescription'),
  ogType: 'website',
  ogUrl: canonical,
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('dolarRecords.metaTitle'),
  twitterDescription: () => t('dolarRecords.metaDescription'),
})
useHead({ link: [{ rel: 'canonical', href: canonical }] })
</script>

<style scoped>
.records-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
.rec-box {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 14px 16px;
}
.lnk {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
</style>
