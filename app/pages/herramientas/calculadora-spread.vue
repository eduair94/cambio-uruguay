<template>
  <ToolShell slug="calculadora-spread" :faq="faq" hide-disclaimer>
    <VCard class="pa-4 pa-sm-6">
      <VRow class="g-input">
        <VCol cols="12" sm="6">
          <VTextField
            v-model.number="buy"
            type="number"
            min="0"
            step="0.01"
            label="Precio de compra (la casa paga)"
            prefix="$"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6">
          <VTextField
            v-model.number="sell"
            type="number"
            min="0"
            step="0.01"
            label="Precio de venta (la casa cobra)"
            prefix="$"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
      </VRow>

      <VDivider class="my-6" />

      <div class="result-grid">
        <div class="result-box">
          <div class="text-overline text-grey">Spread absoluto</div>
          <div class="text-h5 font-weight-bold text-primary">{{ formatNumber(r.abs, 2) }}</div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Spread %</div>
          <div class="text-h5 font-weight-bold text-success">
            {{ r.pct === null ? '-' : r.pct + '%' }}
          </div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Precio medio</div>
          <div class="text-h5 font-weight-bold">{{ formatNumber(r.mid, 2) }}</div>
        </div>
      </div>
    </VCard>

    <template #content>
      <h2>Qué es el spread</h2>
      <p>
        El <strong>spread cambiario</strong> es la diferencia entre el precio de venta y el de
        compra de una moneda. Representa el margen que se queda la casa de cambio en cada operación.
      </p>
      <p>
        Un spread más chico es mejor para vos. Dos casas con una cotización parecida pueden tener
        spreads distintos: la de menor spread suele dejarte mejor parado, tanto si comprás como si
        vendés.
      </p>
      <p>
        Compará el spread real de cada casa en la
        <NuxtLink :to="localePath('/cotizacion/dolar')">cotización del dólar</NuxtLink>.
      </p>
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { computeSpread } from '~/utils/calculators'
import { formatNumber } from '~/utils/format'

const localePath = useLocalePath()
const buy = ref(39.8)
const sell = ref(41.2)
const r = computed(() => computeSpread(buy.value || 0, sell.value || 0))

const faq = [
  {
    q: '¿Qué es el spread cambiario?',
    a: 'Es la diferencia entre el precio de venta y el de compra de una divisa. Indica cuánto gana la casa de cambio por operación: cuanto más chico, mejor para el cliente.',
  },
  {
    q: '¿Un spread bajo siempre conviene?',
    a: 'En general sí, pero conviene mirarlo junto con el precio. Una casa puede tener spread bajo pero precios poco competitivos. Lo ideal es comparar el precio para tu operación (compra o venta) y el spread a la vez.',
  },
]
</script>

<!-- Layout primitives shared from ToolShell (.tool-page namespace). -->
