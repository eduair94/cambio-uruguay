<template>
  <div class="sale-facts">
    <p class="sale-facts__label">{{ t('price') }}</p>
    <p class="sale-facts__price">{{ money(property.price.amount, property.price.currency) }}</p>
    <p v-if="selectedArea" class="sale-facts__muted">
      {{
        t('perArea', {
          price: money(property.price.amount / selectedArea, property.price.currency),
          basis: t(areaBasis),
        })
      }}
    </p>
    <p class="sale-facts__expenses">
      {{
        property.expenses
          ? `${t('expenses')}: ${money(property.expenses.amount, property.expenses.currency)}`
          : t('expensesUnknown')
      }}
    </p>
    <dl class="sale-facts__grid">
      <div>
        <dt>{{ t('bedrooms') }}</dt>
        <dd>{{ property.bedrooms === 0 ? t('studio') : (property.bedrooms ?? t('unknown')) }}</dd>
      </div>
      <div>
        <dt>{{ t('bathrooms') }}</dt>
        <dd>{{ property.bathrooms ?? t('unknown') }}</dd>
      </div>
      <template v-if="!compact">
        <div>
          <dt>{{ t('parkingSpaces') }}</dt>
          <dd>{{ property.parkingSpaces ?? t('unknown') }}</dd>
        </div>
        <div v-for="basis in areaKeys" :key="basis">
          <dt>{{ t(basis) }}</dt>
          <dd>{{ property.areas[basis] ? `${property.areas[basis]} m²` : t('unknown') }}</dd>
        </div>
      </template>
      <div v-else>
        <dt>{{ t(areaBasis) }}</dt>
        <dd>{{ selectedArea ? `${selectedArea} m²` : t('unknown') }}</dd>
      </div>
    </dl>
  </div>
</template>
<script setup lang="ts">
import {
  propertySaleMoney,
  type PropertySaleAreaBasis,
  type PropertySaleSummary,
} from '~/utils/propertySales'
import { propertySalesMessages } from '~/utils/propertySalesMessages'
const props = withDefaults(
  defineProps<{
    property: PropertySaleSummary
    areaBasis?: PropertySaleAreaBasis
    compact?: boolean
  }>(),
  { areaBasis: 'built', compact: false }
)
const { t, locale } = useI18n({ useScope: 'local', messages: propertySalesMessages })
const areaKeys = ['built', 'total', 'land', 'terrace', 'reported'] as const
const selectedArea = computed(() => props.property.areas[props.areaBasis])
const money = (amount: number, currency: 'USD' | 'UYU') =>
  propertySaleMoney(amount, currency, locale.value)
</script>
<style scoped>
.sale-facts :is(p, dl, dt, dd) {
  margin: 0;
}
.sale-facts__label,
.sale-facts__muted {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.sale-facts__price {
  font-size: clamp(1.4rem, 3vw, 1.9rem);
  font-weight: 800;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
}
.sale-facts .sale-facts__expenses {
  margin-top: 8px;
  font-size: 0.85rem;
}
.sale-facts .sale-facts__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(95px, 1fr));
  gap: 12px;
  margin-top: 16px;
}
.sale-facts__grid dt {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.sale-facts__grid dd {
  font-size: 0.9rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}
</style>
