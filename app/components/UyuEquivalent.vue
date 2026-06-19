<template>
  <div v-if="uyu !== null" class="text-caption text-grey-lighten-1">
    <template v-if="showAmount">≈ {{ formatUYU(uyu) }} · </template>dólar a
    {{ formatUYU(rate) }} (mejor venta)
  </div>
</template>

<script setup lang="ts">
// Live "≈ pesos uruguayos" line for any tool whose result is in US dollars.
// Reads the best SELL quote (the price you pay to BUY dollars) from the shared,
// BCU/interbank-free rate source, so every tool converts with the same real rate.
import { formatUYU } from '~/utils/format'

const props = withDefaults(defineProps<{ usd: number; showAmount?: boolean }>(), {
  showAmount: true,
})

const { bestSell } = useExchangeRates()
const rate = computed(() => bestSell('USD'))
const uyu = computed(() => (rate.value ? (props.usd || 0) * rate.value : null))
</script>
