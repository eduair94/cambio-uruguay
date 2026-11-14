<template>
  <div v-if="comparison" class="rate-amount" data-testid="rate-amount-comparison">
    <span class="rate-amount__label">{{ t(selling ? 'receive' : 'pay') }} (UYU)</span>
    <strong class="rate-amount__total">{{ number(comparison.total) }}</strong>
    <span class="rate-amount__difference">
      {{
        comparison.difference > 0
          ? t(selling ? 'less' : 'more', { amount: money(comparison.difference) })
          : t(first ? 'best' : 'same')
      }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { compareRateAmounts } from '~/utils/rateAmountComparison'

const props = defineProps<{
  amount: number
  rate: number
  bestRate: number
  selling: boolean
  first: boolean
}>()
const { t, locale } = useI18n({
  useScope: 'local',
  messages: {
    es: {
      receive: 'Recibís',
      pay: 'Pagás',
      less: '{amount} menos que la primera',
      more: '{amount} más que la primera',
      best: 'Mejor importe de esta lista',
      same: 'Mismo importe que la primera',
    },
    en: {
      receive: 'You receive',
      pay: 'You pay',
      less: '{amount} less than the first option',
      more: '{amount} more than the first option',
      best: 'Best amount in this list',
      same: 'Same amount as the first option',
    },
    pt: {
      receive: 'Você recebe',
      pay: 'Você paga',
      less: '{amount} a menos que a primeira',
      more: '{amount} a mais que a primeira',
      best: 'Melhor valor desta lista',
      same: 'Mesmo valor da primeira',
    },
  },
})
const comparison = computed(() =>
  compareRateAmounts(props.amount, props.rate, props.bestRate, props.selling)
)
const number = (value: number) =>
  new Intl.NumberFormat(
    locale.value === 'en' ? 'en-US' : locale.value === 'pt' ? 'pt-BR' : 'es-UY',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(value)
const money = (value: number) => `UYU ${number(value)}`
</script>

<style scoped>
.rate-amount {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.16);
  color: rgb(var(--v-theme-on-surface));
}
.rate-amount__label,
.rate-amount__difference {
  font-size: 0.75rem;
  line-height: 1.4;
}
.rate-amount__total {
  font-size: clamp(0.875rem, 2vw, 1rem);
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
</style>
