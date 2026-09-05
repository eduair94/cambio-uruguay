<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { rentalPageMessages } from '~/utils/rentalPageMessages'
import { rentalBudget, rentalMoney } from '~/utils/rentalPresentation'
import type { RentalOffer } from '~/utils/rentals'

const props = defineProps<{ offer: RentalOffer; usdUyu: number }>()
const { t, locale } = useI18n({ useScope: 'local', messages: rentalPageMessages })
const values = ref<Record<'expenses' | 'services' | 'entry' | 'budget', string | number>>({
  expenses: '',
  services: '',
  entry: '',
  budget: '',
})
const needsExpenses = computed(
  () =>
    props.offer.commonExpenses === null ||
    (props.offer.commonExpenses !== 0 && !props.offer.commonExpensesCurrency)
)
const rateMissing = computed(
  () =>
    !(props.usdUyu > 0) &&
    (props.offer.currency === 'USD' || props.offer.commonExpensesCurrency === 'USD')
)
const amount = (value: string | number) => (String(value).trim() === '' ? null : Number(value))
const invalid = (value: string | number) =>
  value !== '' &&
  (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 10_000_000)
const hasInvalid = computed(() =>
  Object.entries(values.value).some(
    ([key, value]) => (key !== 'expenses' || needsExpenses.value) && invalid(value)
  )
)
const result = computed(() =>
  rentalBudget(props.offer, props.usdUyu, {
    expenses: amount(values.value.expenses),
    services: amount(values.value.services),
    entry: amount(values.value.entry),
    budget: amount(values.value.budget),
  })
)
const money = (value: number) => rentalMoney(value, 'UYU', locale.value)
watch(
  () => `${props.offer.source}:${props.offer.listingId}`,
  () => {
    values.value.expenses = ''
  }
)
</script>

<template>
  <details class="rental-budget" data-testid="rental-budget">
    <summary>{{ t('planner') }}</summary>
    <p>{{ t('plannerHint') }}</p>
    <div class="rental-budget__inputs">
      <label v-if="needsExpenses"
        >{{ t('estimatedExpenses') }}
        <input
          v-model="values.expenses"
          type="number"
          inputmode="decimal"
          min="0"
          max="10000000"
          step="any"
          :aria-invalid="invalid(values.expenses)"
          :aria-label="t('estimatedExpenses')"
        />
      </label>
      <label
        >{{ t('services') }}
        <input
          v-model="values.services"
          type="number"
          inputmode="decimal"
          min="0"
          max="10000000"
          step="any"
          :aria-invalid="invalid(values.services)"
          :aria-label="t('services')"
        />
      </label>
      <label
        >{{ t('entry') }}
        <input
          v-model="values.entry"
          type="number"
          inputmode="decimal"
          min="0"
          max="10000000"
          step="any"
          :aria-invalid="invalid(values.entry)"
          :aria-label="t('entry')"
        />
      </label>
      <label
        >{{ t('ownBudget') }}
        <input
          v-model="values.budget"
          type="number"
          inputmode="decimal"
          min="0"
          max="10000000"
          step="any"
          :aria-invalid="invalid(values.budget)"
          :aria-label="t('ownBudget')"
        />
      </label>
    </div>
    <div class="rental-budget__result" aria-live="polite" aria-atomic="true">
      <p v-if="hasInvalid" role="alert">{{ t('invalidAmount') }}</p>
      <template v-else>
        <dl>
          <dt>{{ t('calculatedMonthly') }}</dt>
          <dd>{{ result.monthly === null ? t('notPublished') : money(result.monthly) }}</dd>
        </dl>
        <p v-if="result.monthly === null">
          {{ t(rateMissing ? 'rateUnavailable' : 'costUnknown') }}
        </p>
        <dl v-if="result.firstMonth !== null">
          <dt>{{ t('calculatedEntry') }}</dt>
          <dd>{{ money(result.firstMonth) }}</dd>
        </dl>
        <p v-if="result.remaining !== null" class="rental-budget__balance">
          {{
            t(result.remaining < 0 ? 'overBudget' : 'remaining', {
              price: money(Math.abs(result.remaining)),
            })
          }}
        </p>
        <p v-if="result.estimatedExpenses">{{ t('estimatedHint') }}</p>
      </template>
    </div>
  </details>
</template>

<style scoped>
.rental-budget {
  border-block: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-block: 6px 16px;
}
.rental-budget summary {
  cursor: pointer;
  font-weight: 700;
  font-size: 1.125rem;
  min-height: 48px;
  padding-block: 12px;
}
.rental-budget summary:focus-visible,
.rental-budget input:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
.rental-budget p {
  margin: 12px 0;
  line-height: 1.6;
}
.rental-budget__inputs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 20px;
  margin-block: 20px;
}
.rental-budget label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.9375rem;
}
.rental-budget input {
  width: 100%;
  min-height: 48px;
  border: 1px solid rgba(var(--v-border-color), 0.5);
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  padding: 10px 12px;
  font: inherit;
  font-size: 16px;
  margin-top: auto;
}
.rental-budget__result dl {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-block: 14px;
}
.rental-budget__result dd {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.rental-budget__balance {
  font-weight: 700;
}
@media (max-width: 599px) {
  .rental-budget__inputs {
    grid-template-columns: 1fr;
  }
}
</style>
