<template>
  <ToolShell slug="calculadora-aguinaldo" :faq="faq" hide-disclaimer>
    <VCard class="pa-4 pa-sm-6">
      <div class="text-overline text-grey mb-2">Cómo querés calcularlo</div>
      <VBtnToggle
        v-model="mode"
        color="primary"
        mandatory
        divided
        variant="outlined"
        class="seg-toggle mb-6"
      >
        <VBtn value="total" class="seg-btn">
          <VIcon start>mdi-cash-multiple</VIcon>
          Total del semestre
        </VBtn>
        <VBtn value="monthly" class="seg-btn">
          <VIcon start>mdi-calendar-month</VIcon>
          Sueldo mensual fijo
        </VBtn>
      </VBtnToggle>

      <VTextField
        v-if="mode === 'total'"
        v-model.number="totalSemester"
        type="number"
        min="0"
        label="Total nominal ganado en el semestre"
        prefix="$"
        variant="outlined"
        density="comfortable"
        hide-details
      />
      <VRow v-else class="g-input" align="center">
        <VCol cols="12" sm="7">
          <VTextField
            v-model.number="monthly"
            type="number"
            min="0"
            label="Sueldo nominal mensual"
            prefix="$"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="5">
          <VTextField
            v-model.number="months"
            type="number"
            min="1"
            max="6"
            label="Meses trabajados"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
      </VRow>

      <VDivider class="my-6" />

      <div class="result-grid">
        <div class="result-box">
          <div class="text-overline text-grey">Aguinaldo estimado</div>
          <div class="text-h4 font-weight-bold text-primary">{{ formatUYU(aguinaldo) }}</div>
        </div>
      </div>
    </VCard>

    <template #content>
      <h2>Cómo se calcula el aguinaldo</h2>
      <p>
        El aguinaldo (sueldo anual complementario) equivale a la <strong>doceava parte</strong> del
        total nominal cobrado en el semestre. La fórmula es simple: sumás lo ganado en el período y
        lo dividís entre 12.
      </p>
      <p>
        Se paga en dos partes al año. En 2026 la primera se pagó dentro de junio, por lo ganado de
        diciembre a mayo, y la segunda vence el 20 de diciembre (Decreto 113/026), por lo ganado del
        1.º de junio al 30 de noviembre. Las fechas de cada sector están en
        <NuxtLink :to="localePath('/cuando-se-cobra-el-aguinaldo-uruguay')"
          >cuándo se cobra el aguinaldo</NuxtLink
        >. Esta estimación toma el nominal; el monto efectivo puede variar por descuentos y partidas
        especiales.
      </p>
      <p>
        No hay antigüedad mínima: con pocos meses en la empresa cobrás la parte de esos meses, y eso
        es lo que calcula el modo "Sueldo mensual fijo". Si trabajaste en negro, estuviste
        certificado o te fuiste en el semestre, mirá
        <NuxtLink :to="localePath('/guias/aguinaldo-casos-especiales-uruguay')"
          >el aguinaldo en los casos especiales</NuxtLink
        >, y para entender la cuenta,
        <NuxtLink :to="localePath('/guias/como-se-calcula-el-aguinaldo-uruguay')"
          >cómo se calcula el aguinaldo</NuxtLink
        >.
      </p>
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { computeAguinaldo } from '~/utils/calculators'
import { formatUYU } from '~/utils/format'

const localePath = useLocalePath()

const mode = ref<'total' | 'monthly'>('total')
const totalSemester = ref(300000)
const monthly = ref(50000)
const months = ref(6)

const aguinaldo = computed(() =>
  mode.value === 'total'
    ? computeAguinaldo(totalSemester.value || 0)
    : computeAguinaldo((monthly.value || 0) * (months.value || 0))
)

const faq = [
  {
    q: '¿Cómo se calcula el aguinaldo en Uruguay?',
    a: 'El aguinaldo equivale al total nominal ganado en el semestre dividido entre 12. Por ejemplo, si en seis meses cobraste $300.000 nominales, el aguinaldo es de $25.000.',
  },
  {
    q: '¿Cuándo se cobra el aguinaldo?',
    a: 'En dos cuotas: la primera dentro de junio, por lo ganado de diciembre a mayo, y la segunda antes de fin de año, por lo ganado de junio a noviembre. En 2026 la de diciembre se paga hasta el 20 de diciembre (Decreto 113/026).',
  },
  {
    q: '¿Me corresponde aguinaldo si trabajé solo 3 meses?',
    a: 'Sí. La Ley 12.840 no exige antigüedad mínima: cobrás la doceava parte de lo que te pagaron en dinero en los meses trabajados del semestre. Con 3 meses a $ 50.000 nominales, son $ 12.500 nominales.',
  },
  {
    q: '¿Qué pasa si no me pagan el aguinaldo a tiempo?',
    a: 'Desde el día siguiente al vencimiento la deuda lleva un recargo automático del 10 % (Ley 18.572, art. 29), y podés denunciarlo en la Inspección General del Trabajo del MTSS.',
  },
]
</script>

<!-- Layout primitives shared from ToolShell (.tool-page namespace). -->
