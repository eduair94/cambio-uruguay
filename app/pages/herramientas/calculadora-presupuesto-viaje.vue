<template>
  <ToolShell slug="calculadora-presupuesto-viaje" :faq="faq" hide-disclaimer>
    <VCard class="pa-4 pa-sm-6">
      <VRow class="g-input">
        <VCol cols="6" sm="3">
          <VTextField
            v-model.number="days"
            type="number"
            min="1"
            label="Días"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="5">
          <VTextField
            v-model.number="dailySpend"
            type="number"
            min="0"
            label="Gasto diario (USD)"
            prefix="US$"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="4">
          <VTextField
            v-model.number="extras"
            type="number"
            min="0"
            label="Extras (USD)"
            prefix="US$"
            variant="outlined"
            density="comfortable"
            hide-details
            hint="Pasajes, compras…"
            persistent-hint
          />
        </VCol>
      </VRow>

      <VDivider class="my-6" />

      <div class="result-grid">
        <div class="result-box">
          <div class="text-overline text-grey">Presupuesto total</div>
          <div class="text-h5 font-weight-bold text-primary">{{ formatUSD(totalUsd) }}</div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">En pesos uruguayos</div>
          <div class="text-h5 font-weight-bold text-success">
            {{ totalUyu ? formatUYU(totalUyu) : '—' }}
          </div>
          <div v-if="rate" class="text-caption text-grey-lighten-1">
            Dólar a {{ formatUYU(rate) }} (mejor venta)
          </div>
        </div>
      </div>
    </VCard>

    <template #content>
      <h2>Planificá tu viaje</h2>
      <p>
        Estimá cuántos dólares necesitás: multiplicamos tus <strong>días</strong> por el
        <strong>gasto diario</strong> y sumamos los <strong>extras</strong>. El total se convierte a
        pesos con la mejor cotización de venta en vivo, que es la que te aplican al comprar dólares.
      </p>
      <p>
        Antes de viajar, comprá tus divisas comparando casas de cambio y evitá cambiar en el
        aeropuerto. Más consejos en la guía
        <NuxtLink :to="localePath('/guias/dolares-para-viajar')"
          >Cuántos dólares llevar de viaje</NuxtLink
        >.
      </p>
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatUSD, formatUYU } from '~/utils/format'

const localePath = useLocalePath()
const days = ref(7)
const dailySpend = ref(80)
const extras = ref(500)

const { bestSell } = useExchangeRates()
const rate = computed(() => bestSell('USD'))

const totalUsd = computed(() => (days.value || 0) * (dailySpend.value || 0) + (extras.value || 0))
const totalUyu = computed(() => (rate.value ? totalUsd.value * rate.value : null))

const faq = [
  {
    q: '¿Cuántos dólares debo llevar de viaje?',
    a: 'Una forma simple es estimar tu gasto diario (alojamiento, comida, transporte), multiplicarlo por los días de viaje y sumar un extra para pasajes, compras e imprevistos. Esta calculadora hace esa cuenta y te la muestra en pesos.',
  },
  {
    q: '¿A qué cotización conviene comprar los dólares?',
    a: 'Al comprar dólares te aplican el precio de venta de la casa de cambio. Compará entre casas para conseguir la venta más baja y evitá cambiar en aeropuertos o zonas turísticas, donde el precio suele ser peor.',
  },
]
</script>

<!-- Layout primitives shared from ToolShell (.tool-page namespace). -->
