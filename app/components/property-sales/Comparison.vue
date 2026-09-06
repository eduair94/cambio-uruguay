<template>
  <VDialog
    :model-value="open"
    max-width="1180"
    :aria-label="t('comparison')"
    scrollable
    @update:model-value="$emit('update:open', $event)"
  >
    <section class="sale-comparison">
      <header>
        <h2>{{ t('comparison') }}</h2>
        <VBtn
          icon="mdi-close"
          variant="text"
          :aria-label="t('close')"
          @click="$emit('update:open', false)"
        />
      </header>
      <p>{{ t('compareHint') }}</p>
      <div class="sale-comparison__scroll">
        <table>
          <caption class="sr-only">
            {{
              t('comparison')
            }}
          </caption>
          <thead>
            <tr>
              <th>{{ t('facts') }}</th>
              <th v-for="item in items" :key="item.key">
                <NuxtLink :to="localePath(propertySalePath(item.key))">{{ item.title }}</NuxtLink>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.key">
              <th scope="row">{{ t(row.key) }}</th>
              <td v-for="item in items" :key="item.key">{{ row.value(item) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </VDialog>
</template>
<script setup lang="ts">
import {
  propertySaleMoney,
  propertySalePath,
  type PropertySaleSummary,
} from '~/utils/propertySales'
import { propertySaleSourceName, propertySalesMessages } from '~/utils/propertySalesMessages'
defineProps<{ open: boolean; items: PropertySaleSummary[] }>()
defineEmits<{ 'update:open': [value: boolean] }>()
const { t, locale } = useI18n({ useScope: 'local', messages: propertySalesMessages })
const localePath = useLocalePath()
const rows = computed(() => [
  {
    key: 'price',
    value: (p: PropertySaleSummary) =>
      propertySaleMoney(p.price.amount, p.price.currency, locale.value),
  },
  {
    key: 'expenses',
    value: (p: PropertySaleSummary) =>
      p.expenses
        ? propertySaleMoney(p.expenses.amount, p.expenses.currency, locale.value)
        : t('unknown'),
  },
  {
    key: 'location',
    value: (p: PropertySaleSummary) =>
      [p.neighborhood, p.locality, p.department]
        .filter((s, i, all) => s && all.indexOf(s) === i)
        .join(' · '),
  },
  { key: 'type', value: (p: PropertySaleSummary) => t(p.propertyType) },
  {
    key: 'bedrooms',
    value: (p: PropertySaleSummary) =>
      p.bedrooms === 0 ? t('studio') : (p.bedrooms ?? t('unknown')),
  },
  { key: 'bathrooms', value: (p: PropertySaleSummary) => p.bathrooms ?? t('unknown') },
  ...(['built', 'total', 'land', 'terrace', 'reported'] as const).map(key => ({
    key,
    value: (p: PropertySaleSummary) => (p.areas[key] ? `${p.areas[key]} m²` : t('unknown')),
  })),
  { key: 'parkingSpaces', value: (p: PropertySaleSummary) => p.parkingSpaces ?? t('unknown') },
  {
    key: 'conditions',
    value: (p: PropertySaleSummary) =>
      p.conditions.length ? p.conditions.map(condition => t(condition)).join(' · ') : t('unknown'),
  },
  { key: 'source', value: (p: PropertySaleSummary) => propertySaleSourceName(p.source) },
  { key: 'seller', value: (p: PropertySaleSummary) => p.sellerName || t('unknown') },
])
</script>
<style scoped>
.sale-comparison {
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  border-radius: 14px;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sale-comparison header {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.sale-comparison h2 {
  font-size: 1.2rem;
  margin: 0;
}
.sale-comparison > p {
  margin: 0;
  padding: 0 16px 16px;
  font-size: 0.85rem;
}
.sale-comparison__scroll {
  overflow: auto;
}
.sale-comparison table {
  border-collapse: collapse;
  width: 100%;
  text-align: left;
  font-size: 0.85rem;
}
.sale-comparison :is(th, td) {
  padding: 16px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  vertical-align: top;
  min-width: 200px;
  max-width: 320px;
  overflow-wrap: anywhere;
}
.sale-comparison tr > :first-child {
  position: sticky;
  left: 0;
  background: rgb(var(--v-theme-surface));
  min-width: 120px;
  max-width: 140px;
  z-index: 1;
}
.sale-comparison a {
  color: rgb(var(--v-theme-link));
  line-height: 1.6;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
@media (max-width: 599px) {
  .sale-comparison :is(th, td) {
    padding: 12px;
    min-width: 180px;
  }
  .sale-comparison tr > :first-child {
    min-width: 100px;
    max-width: 110px;
  }
}
</style>
