<template>
  <VCard class="panel pa-4" variant="flat">
    <div class="text-subtitle-1 font-weight-bold mb-3">{{ $t('panel.title') }}</div>
    <VTable density="comfortable" class="panel-table">
      <thead>
        <tr>
          <th>{{ $t('panel.currency') }}</th>
          <th class="text-right">{{ $t('panel.buy') }}</th>
          <th class="text-right">{{ $t('panel.sell') }}</th>
          <th class="trend-col">{{ $t('panel.trend') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in currencies" :key="c">
          <td class="font-weight-medium">{{ c }}</td>
          <td class="text-right">{{ fmt(bestBuy(c)) }}</td>
          <td class="text-right">{{ fmt(bestSell(c)) }}</td>
          <td class="trend-col">
            <Sparkline
              v-if="c === 'USD' && momentum.sparkline.length > 1"
              :values="momentum.sparkline"
              :up="momentum.direction !== 'down'"
            />
            <span v-else class="text-caption text-grey">—</span>
          </td>
        </tr>
      </tbody>
    </VTable>
  </VCard>
</template>

<script setup lang="ts">
import { formatNumber } from '~/utils/format'
import type { CurrencyCode } from '~/utils/currencyPages'

const { bestBuy, bestSell } = useExchangeRates()
const { momentum } = useDollarTrend()
const currencies: CurrencyCode[] = ['USD', 'EUR', 'BRL', 'ARS']
const fmt = (n: number | null) => (n ? formatNumber(n) : '-')
</script>

<style scoped>
.panel {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.panel-table :deep(td),
.panel-table :deep(th) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.trend-col {
  width: 120px;
}
</style>
