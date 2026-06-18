<template>
  <ToolShell slug="calculadora-iva" :faq="faq" hide-disclaimer>
    <VCard class="pa-4 pa-sm-6">
      <div class="text-overline text-grey mb-2">Operación</div>
      <VBtnToggle
        v-model="mode"
        color="primary"
        mandatory
        divided
        variant="outlined"
        class="seg-toggle mb-6"
      >
        <VBtn value="add" class="seg-btn">
          <VIcon start>mdi-plus</VIcon>
          Agregar IVA
        </VBtn>
        <VBtn value="remove" class="seg-btn">
          <VIcon start>mdi-minus</VIcon>
          Quitar IVA
        </VBtn>
      </VBtnToggle>

      <VRow class="g-input" align="center">
        <VCol cols="12" sm="7">
          <VTextField
            v-model.number="amount"
            type="number"
            min="0"
            :label="mode === 'add' ? 'Importe sin IVA' : 'Importe con IVA'"
            prefix="$"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="5">
          <VSelect
            v-model.number="rate"
            :items="rateItems"
            label="Tasa de IVA"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
      </VRow>

      <VDivider class="my-6" />

      <div class="result-grid">
        <div class="result-box">
          <div class="text-overline text-grey">Importe sin IVA</div>
          <div class="text-h5 font-weight-bold">{{ formatUYU(r.net) }}</div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">IVA ({{ rate }}%)</div>
          <div class="text-h5 font-weight-bold text-primary">{{ formatUYU(r.iva) }}</div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Total con IVA</div>
          <div class="text-h5 font-weight-bold text-success">{{ formatUYU(r.gross) }}</div>
        </div>
      </div>
    </VCard>

    <template #content>
      <h2>IVA en Uruguay</h2>
      <p>
        El IVA es el impuesto al consumo más importante de Uruguay. La
        <strong>tasa básica es del 22%</strong> y aplica a la mayoría de bienes y servicios; la
        <strong>tasa mínima del 10%</strong>
        aplica a algunos rubros (ciertos alimentos, salud, entre otros).
      </p>
      <p>
        Para <strong>agregar</strong> IVA, se multiplica el importe por la tasa. Para
        <strong>quitarlo</strong> de un precio que ya lo incluye, se divide entre 1,22 (o 1,10).
      </p>
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { addIva, removeIva } from '~/utils/calculators'
import { formatUYU } from '~/utils/format'

const mode = ref<'add' | 'remove'>('add')
const amount = ref(1000)
const rate = ref(22)
const rateItems = [
  { title: 'Básica (22%)', value: 22 },
  { title: 'Mínima (10%)', value: 10 },
]

const r = computed(() =>
  mode.value === 'add'
    ? addIva(amount.value || 0, rate.value)
    : removeIva(amount.value || 0, rate.value)
)

const faq = [
  {
    q: '¿Cuánto es el IVA en Uruguay?',
    a: 'La tasa básica del IVA es 22% y la mínima 10%. La mayoría de bienes y servicios tributan al 22%.',
  },
  {
    q: '¿Cómo saco el IVA de un precio?',
    a: 'Si el precio ya incluye IVA al 22%, dividís el importe entre 1,22 para obtener el valor sin IVA; la diferencia es el impuesto. Para la tasa mínima dividís entre 1,10.',
  },
]
</script>

<!-- Layout primitives shared from ToolShell (.tool-page namespace). -->
