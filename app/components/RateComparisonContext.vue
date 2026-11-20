<template>
  <div class="comparison-context" data-testid="rate-comparison-context">
    <p v-if="amount > 0" class="comparison-context__basis">
      {{ t('basis', { amount: formattedAmount, currency }) }}
    </p>
    <p>{{ t('conditions') }}</p>
    <p v-if="selectedOffMarket">{{ t('selected') }}</p>
    <p v-if="excludedCount > 0">
      {{ t('excluded', { count: excludedCount }) }}
      <NuxtLink :to="localePath('/avanzado')">{{ t('allQuotes') }}</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  amount: number
  currency: string
  excludedCount: number
  selectedOffMarket: boolean
}>()
const localePath = useLocalePath()
const { t, locale } = useI18n({
  useScope: 'local',
  messages: {
    es: {
      basis: 'Compará el importe por los mismos {amount} {currency} en cada casa.',
      conditions: 'Importes según la pizarra; no incluyen comisiones. Confirmá con la entidad.',
      selected:
        'El cálculo de la casa que elegiste usa su precio publicado, que está fuera de la referencia del mercado. Confirmalo antes de cambiar.',
      excluded:
        'Cotizaciones fuera de la referencia del mercado que no participan del ranking: {count}.',
      allQuotes: 'Ver todas las cotizaciones',
    },
    en: {
      basis: 'Compare the amount for the same {amount} {currency} at each institution.',
      conditions: 'Published board prices, excluding fees. Confirm terms with the institution.',
      selected:
        'The calculation for your selected institution uses its published quote, which is outside the market reference. Confirm it before exchanging.',
      excluded: 'Quotes outside the market reference excluded from this ranking: {count}.',
      allQuotes: 'See all quotes',
    },
    pt: {
      basis: 'Compare o valor para os mesmos {amount} {currency} em cada instituição.',
      conditions: 'Valores de balcão; não incluem tarifas. Confirme com a instituição.',
      selected:
        'O cálculo da instituição escolhida usa sua cotação publicada, que está fora da referência de mercado. Confirme antes de trocar.',
      excluded: 'Cotações fora da referência de mercado que não participam do ranking: {count}.',
      allQuotes: 'Ver todas as cotações',
    },
  },
})
const formattedAmount = computed(() =>
  new Intl.NumberFormat(
    locale.value === 'en' ? 'en-US' : locale.value === 'pt' ? 'pt-BR' : 'es-UY',
    {
      maximumFractionDigits: 8,
    }
  ).format(props.amount)
)
</script>

<style scoped>
.comparison-context {
  margin: 16px 0;
  text-align: start;
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface));
}
.comparison-context p {
  margin: 4px 0 0;
}
.comparison-context__basis {
  font-weight: 600;
}
.comparison-context a {
  color: rgb(var(--v-theme-link));
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
