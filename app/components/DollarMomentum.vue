<template>
  <DollarMomentumSkeleton>
    <template v-if="!pending" #default>
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
  </DollarMomentumSkeleton>
</template>

<script setup lang="ts">
import { formatUYU } from '~/utils/format'

// The card shell (the Hoy row with its link) and the loading bars live in DollarMomentumSkeleton,
// which the home also renders as the <ClientOnly> fallback: while the trend is pending this
// component renders exactly that, and once loaded it fills the same shell with its row.
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
/* The loaded row is this component's slot content, so it carries this scope: the shell and the
   skeleton styles are in DollarMomentumSkeleton.vue. */
.spark-wrap {
  min-width: 120px;
  max-width: 240px;
}
</style>
