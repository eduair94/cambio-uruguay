<template>
  <VCard class="dollar-momentum pa-4" variant="flat">
    <div class="d-flex align-center justify-space-between mb-2">
      <span class="text-overline text-grey">{{ $t('dolarHoy.today') }}</span>
      <NuxtLink :to="localePath('/dolar-hoy')" class="see-more text-caption">
        {{ $t('dolarHoy.seeMore') }} →
      </NuxtLink>
    </div>

    <template v-if="pending">
      <VSkeletonLoader type="text, heading" class="bg-transparent" />
    </template>

    <template v-else>
      <div class="d-flex align-center ga-4 flex-wrap">
        <div>
          <div class="text-caption text-grey">
            {{ $t('dolarHoy.buy') }} / {{ $t('dolarHoy.sell') }}
          </div>
          <div class="text-h6 font-weight-bold">
            {{ buy ? formatUYU(buy) : '-' }} / {{ sell ? formatUYU(sell) : '-' }}
          </div>
        </div>

        <VChip
          v-if="momentum.latest !== null"
          :color="chipColor"
          variant="tonal"
          size="small"
          :prepend-icon="chipIcon"
        >
          {{ changeLabel }}
        </VChip>

        <div class="spark-wrap flex-grow-1">
          <Sparkline
            v-if="momentum.sparkline.length > 1"
            :values="momentum.sparkline"
            :up="momentum.direction !== 'down'"
          />
          <span v-else class="text-caption text-grey">{{ $t('dolarHoy.noTrend') }}</span>
        </div>
      </div>
    </template>
  </VCard>
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
  momentum.value.direction === 'up'
    ? 'success'
    : momentum.value.direction === 'down'
      ? 'error'
      : 'grey'
)
const chipIcon = computed(() =>
  momentum.value.direction === 'up'
    ? 'mdi-trending-up'
    : momentum.value.direction === 'down'
      ? 'mdi-trending-down'
      : 'mdi-trending-neutral'
)
const changeLabel = computed(() => {
  const m = momentum.value
  const word =
    m.direction === 'up'
      ? t('dolarHoy.up')
      : m.direction === 'down'
        ? t('dolarHoy.down')
        : t('dolarHoy.flat')
  const pct = m.direction === 'flat' ? '' : ` ${Math.abs(m.changePct)}%`
  return `${word}${pct} ${t('dolarHoy.vsYesterday')}`
})
</script>

<style scoped>
.dollar-momentum {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.see-more {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
  font-weight: 600;
}
.spark-wrap {
  min-width: 120px;
  max-width: 240px;
}
</style>
