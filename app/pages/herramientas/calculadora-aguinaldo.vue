<template>
  <ToolShell slug="calculadora-aguinaldo" :faq="faq" hide-disclaimer>
    <VCard class="pa-5">
      <VBtnToggle
        v-model="mode"
        color="primary"
        density="comfortable"
        mandatory
        class="mb-5 flex-wrap"
      >
        <VBtn value="total">Total del semestre</VBtn>
        <VBtn value="monthly">Sueldo mensual fijo</VBtn>
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
      <VRow v-else dense align="center">
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

      <div class="result-grid mt-5">
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
        Se paga en dos partes al año (habitualmente antes de las fiestas y a mitad de año). Esta
        estimación toma el nominal; el monto efectivo puede variar por descuentos y partidas
        especiales.
      </p>
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { computeAguinaldo } from '~/utils/calculators'
import { formatUYU } from '~/utils/format'

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
    a: 'Se paga en dos cuotas al año: una antes de fin de año y otra a mitad de año, correspondientes a cada semestre trabajado.',
  },
]
</script>

<style scoped>
.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
.result-box {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 16px 18px;
}
</style>
