<template>
  <ToolShell slug="conversor-de-monedas" :faq="faq" hide-disclaimer>
    <VCard class="pa-4 pa-sm-6">
      <VRow class="g-input" align="center">
        <VCol cols="12" sm="5">
          <VTextField
            v-model.number="amount"
            type="number"
            min="0"
            label="Monto"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="7">
          <VSelect
            v-model="code"
            :items="currencyItems"
            item-title="label"
            item-value="code"
            label="Moneda"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
      </VRow>

      <VAlert v-if="pending" type="info" variant="tonal" class="mt-4" density="comfortable">
        Cargando cotización en vivo…
      </VAlert>

      <template v-else>
        <VDivider class="my-6" />

        <div class="result-grid">
          <div class="result-box">
            <div class="text-overline text-grey">Si vendés (te pagan)</div>
            <div class="text-h5 font-weight-bold text-primary">{{ formatUYU(sellResult) }}</div>
            <div class="text-caption text-grey-lighten-1">
              Mejor compra: {{ buyRate ? formatUYU(buyRate) : '-' }} por {{ singular }}
            </div>
          </div>
          <div class="result-box">
            <div class="text-overline text-grey">Si comprás (pagás)</div>
            <div class="text-h5 font-weight-bold text-success">{{ formatUYU(buyResult) }}</div>
            <div class="text-caption text-grey-lighten-1">
              Mejor venta: {{ sellRate ? formatUYU(sellRate) : '-' }} por {{ singular }}
            </div>
          </div>
        </div>

        <p class="text-caption text-grey mt-4 mb-0">
          Cotización en vivo de la mejor casa de cambio para {{ amount }} {{ plural }}. Compará
          todas las casas en la
          <NuxtLink :to="localePath('/')" class="tool-link">portada</NuxtLink>.
        </p>

        <div class="mt-4">
          <SaveResultButton
            kind="conversion"
            tool-slug="conversor-de-monedas"
            :title="`${amount} ${code}`"
            :inputs="{ amount, code }"
            :result="{ buyResult, sellResult }"
            :rates="saveRates"
          />
        </div>
      </template>
    </VCard>

    <template #content>
      <h2>Cómo usar el conversor</h2>
      <p>
        Ingresá un monto y elegí la moneda (dólar, euro, real o peso argentino). El conversor usa la
        <strong>mejor cotización en vivo</strong> de más de 40 casas de cambio de Uruguay.
      </p>
      <p>
        Mostramos dos resultados porque el precio depende de si <strong>vendés</strong> la divisa
        (te aplican el precio de compra de la casa) o la <strong>comprás</strong> (te aplican el de
        venta). La diferencia entre ambos es el spread.
      </p>
      <p>
        ¿Querés ver el detalle por casa de cambio? Mirá la
        <NuxtLink :to="localePath('/cotizacion/dolar')">cotización del dólar</NuxtLink> completa.
      </p>
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatUYU } from '~/utils/format'
import { currencyDisplayName, type CurrencyCode } from '~/utils/currencyPages'
import { CONVERT_CURRENCIES } from '~/utils/convert'
import type { SavedRateRef } from '~/composables/useSavedDrift'

const localePath = useLocalePath()
const amount = ref(100)
const code = ref<CurrencyCode>('USD')

const currencyItems = (['USD', 'EUR', 'BRL', 'ARS'] as CurrencyCode[]).map(c => ({
  code: c,
  label: currencyDisplayName(c, 'es'),
}))

const { bestSell, bestBuy, pending } = useExchangeRates()

const sellRate = computed(() => bestSell(code.value)) // price to BUY the currency
const buyRate = computed(() => bestBuy(code.value)) // price to SELL the currency
const buyResult = computed(() => (sellRate.value ? (amount.value || 0) * sellRate.value : null))
const sellResult = computed(() => (buyRate.value ? (amount.value || 0) * buyRate.value : null))

const singular = computed(() => CONVERT_CURRENCIES[code.value].singular)
const plural = computed(() => CONVERT_CURRENCIES[code.value].plural)

const saveRates = computed<SavedRateRef[]>(() => {
  const out: SavedRateRef[] = []
  if (buyRate.value)
    out.push({ label: 'sell', currency: code.value, rateKind: 'bestBuy', value: buyRate.value })
  if (sellRate.value)
    out.push({ label: 'buy', currency: code.value, rateKind: 'bestSell', value: sellRate.value })
  return out
})

const faq = [
  {
    q: '¿Qué cotización usa el conversor?',
    a: 'Usa la mejor cotización disponible en vivo entre más de 40 casas de cambio de Uruguay: el mejor precio de compra para cuando vendés la divisa y el mejor precio de venta para cuando la comprás.',
  },
  {
    q: '¿Por qué hay dos resultados distintos?',
    a: 'Porque comprar y vender no tienen el mismo precio. Si vendés dólares, la casa te los compra a su precio de compra; si comprás dólares, te los vende a su precio de venta. La diferencia entre ambos es el spread.',
  },
  {
    q: '¿Qué monedas puedo convertir?',
    a: 'Dólar estadounidense (USD), euro (EUR), real brasileño (BRL) y peso argentino (ARS), siempre a pesos uruguayos.',
  },
]
</script>

<!-- Layout primitives shared from ToolShell (.tool-page namespace). -->
