<template>
  <VCard class="savings pa-5" variant="flat">
    <div class="text-subtitle-1 font-weight-bold mb-3">{{ $t('ahorro.title') }}</div>
    <VRow dense align="center">
      <VCol cols="12" sm="5">
        <VTextField
          v-model.number="amount"
          type="number"
          min="0"
          :label="$t('ahorro.amount')"
          prefix="US$"
          variant="outlined"
          density="comfortable"
          hide-details
        />
      </VCol>
      <VCol cols="12" sm="7">
        <div v-if="best && avg" class="result-box px-4 py-3">
          <div class="text-caption text-grey">{{ $t('ahorro.saving') }}</div>
          <div class="text-h4 font-weight-bold text-success">{{ formatUYU(savings.savings) }}</div>
          <div class="text-caption text-grey-lighten-1">
            {{ $t('ahorro.vsAvg') }} ({{ savings.pct }}%)
          </div>
        </div>
        <div v-else class="text-caption text-grey">{{ $t('ahorro.noData') }}</div>
      </VCol>
    </VRow>
  </VCard>
</template>

<script setup lang="ts">
import { formatUYU } from '~/utils/format'
import { averageSell } from '~/utils/currencyPages'
import { computeSavings } from '~/utils/rateStats'

const { realRows, bestSell } = useExchangeRates()
const amount = ref(1000)

const best = computed(() => bestSell('USD'))
const avg = computed(() => averageSell(realRows.value ?? [], 'USD'))
const savings = computed(() => computeSavings(amount.value || 0, best.value || 0, avg.value || 0))
</script>

<style scoped>
.savings {
  background: rgba(22, 199, 132, 0.06);
  border: 1px solid rgba(22, 199, 132, 0.22);
  border-radius: 12px;
}
.result-box {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
}
</style>
