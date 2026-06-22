<template>
  <VCard class="summary" elevation="4">
    <VCardItem>
      <VCardTitle class="d-flex align-center text-subtitle-1">
        <VIcon start color="primary">mdi-receipt-text-outline</VIcon>
        {{ t('importCart.summary.title') }}
      </VCardTitle>
    </VCardItem>
    <VDivider />
    <VCardText>
      <dl class="summary-rows">
        <div class="summary-row">
          <dt>{{ t('importCart.summary.subtotal') }}</dt>
          <dd>{{ formatUSD(result.taxableSubtotalUsd) }}</dd>
        </div>
        <div class="summary-row">
          <dt>{{ t('importCart.summary.taxes') }}</dt>
          <dd>{{ formatUSD(result.totalTaxUsd) }}</dd>
        </div>
        <div class="summary-row">
          <dt>
            {{ t('importCart.summary.shipping') }}
            <span v-if="result.totalWeightKg > 0" class="text-caption text-medium-emphasis">
              ({{ result.totalWeightKg }} kg)
            </span>
          </dt>
          <dd>{{ formatUSD(result.shippingUsd) }}</dd>
        </div>
        <VDivider class="my-2" />
        <div class="summary-row summary-row--total">
          <dt>{{ t('importCart.summary.landedUsd') }}</dt>
          <dd data-testid="cart-landed-usd">{{ formatUSD(result.landedCostUsd) }}</dd>
        </div>
        <div v-if="result.landedCostUyu != null" class="summary-row summary-row--uyu">
          <dt>
            {{ t('importCart.summary.landedUyu') }}
            <span class="text-caption text-medium-emphasis d-block">
              {{ t('importCart.summary.atRate', { rate: formatUYU(usdRate, 2) }) }}
            </span>
          </dt>
          <dd class="text-h6 text-primary">
            <CountUp :value="result.landedCostUyu || 0" :format="n => formatUYU(n, 0)" />
          </dd>
        </div>
      </dl>

      <VChip
        v-if="result.effectiveRatePct != null"
        size="small"
        variant="tonal"
        color="info"
        class="mt-3"
      >
        {{ t('importCart.summary.effectiveRate', { pct: result.effectiveRatePct }) }}
      </VChip>

      <VAlert
        v-for="(warn, i) in result.warnings"
        :key="i"
        type="warning"
        density="compact"
        variant="tonal"
        class="mt-3 text-caption"
      >
        {{ warn }}
      </VAlert>

      <VAlert
        v-if="!loggedIn && result.lines.length > 0"
        type="info"
        density="compact"
        variant="tonal"
        class="mt-3 text-caption"
        icon="mdi-content-save-outline"
      >
        {{ t('importCart.summary.saveHint') }}
      </VAlert>
    </VCardText>
  </VCard>
</template>

<script setup lang="ts">
import type { CartResult } from '~/utils/importCart'
import { formatUSD, formatUYU } from '~/utils/format'

defineProps<{ result: CartResult; usdRate: number | null; loggedIn: boolean }>()
const { t } = useI18n()
</script>

<style scoped>
.summary-rows {
  margin: 0;
}
.summary-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.25rem 0;
}
.summary-row dt {
  color: rgba(var(--v-theme-on-surface), 0.75);
}
.summary-row dd {
  margin: 0;
  font-weight: 600;
  text-align: right;
}
.summary-row--total dt,
.summary-row--total dd {
  font-size: 1.05rem;
  font-weight: 700;
}
.summary-row--uyu dd {
  font-weight: 800;
}
</style>
