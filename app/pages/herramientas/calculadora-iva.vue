<template>
  <ToolShell
    slug="calculadora-iva"
    :faq="faq"
    :sources="sources"
    :seo-title="snippet.title"
    :seo-description="snippet.description"
    hide-disclaimer
  >
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
      <h2>Cuánto es el IVA en Uruguay</h2>
      <p>
        El IVA tiene dos tasas, fijadas en el artículo 34 del Título 10 del Texto Ordenado 2023: la
        <strong>básica, de {{ IVA_TASA_BASICA }} %</strong>, que es la de casi todo, y la
        <strong>mínima, de {{ IVA_TASA_MINIMA }} %</strong>.
      </p>
      <p>
        La mínima es una lista cerrada (artículo 36): pan blanco común, carne, pescado, arroz,
        fideos, aceite, azúcar, yerba, café y té, medicamentos, el hospedaje en hoteles y los
        servicios de salud que se prestan fuera de relación de dependencia, entre otros. Lo que no
        está en esa lista ni exonerado paga la básica.
      </p>
      <p>
        Para <strong>agregar</strong> IVA, se multiplica el importe por la tasa: $&nbsp;1.000 + IVA
        son $&nbsp;1.220. Para <strong>quitarlo</strong> de un precio que ya lo incluye, se divide
        entre 1,22 (o 1,10): de $&nbsp;1.220, $&nbsp;1.000 son el precio y $&nbsp;220 el impuesto.
      </p>
      <p>
        Pagar con tarjeta puede cambiar cuánto IVA pagás en algunos rubros: lo explicamos en
        <NuxtLink :to="localePath('/descuento-de-iva-con-tarjeta-uruguay')"
          >descuento de IVA con tarjeta</NuxtLink
        >.
      </p>
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { addIva, removeIva } from '~/utils/calculators'
import { formatUYU } from '~/utils/format'
import { IVA_TASA_BASICA, IVA_TASA_MINIMA } from '~/utils/ivaTarjeta'
import { TOOL_SNIPPET_IVA_SOURCES, toolSnippetIva } from '~/utils/toolSnippets'

const localePath = useLocalePath()

// Título y descripción que contestan primero ("cuánto es el IVA en Uruguay") con las tasas del
// T.O. 2023 y un ejemplo; ver `utils/toolSnippets.ts`.
const snippet = toolSnippetIva()
const sources = [...TOOL_SNIPPET_IVA_SOURCES]

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
    a: 'La tasa básica del IVA es 22 % y la mínima 10 % (Texto Ordenado 2023, Título 10, artículo 34). Casi todo paga la básica; la mínima es una lista cerrada que incluye pan blanco común, carne, pescado, medicamentos y el hospedaje en hoteles, entre otros.',
  },
  {
    q: '¿Cómo saco el IVA de un precio?',
    a: 'Si el precio ya incluye IVA al 22%, dividís el importe entre 1,22 para obtener el valor sin IVA; la diferencia es el impuesto. Para la tasa mínima dividís entre 1,10.',
  },
]
</script>

<!-- Layout primitives shared from ToolShell (.tool-page namespace). -->
