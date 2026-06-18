<template>
  <ToolShell slug="calculadora-prestamo" :faq="faq">
    <VCard class="pa-5">
      <VRow dense>
        <VCol cols="12" sm="6">
          <VTextField
            v-model.number="principal"
            type="number"
            min="0"
            label="Monto del préstamo"
            prefix="$"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="3">
          <VTextField
            v-model.number="ratePct"
            type="number"
            min="0"
            step="0.1"
            label="Tasa anual"
            suffix="%"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="3">
          <VTextField
            v-model.number="months"
            type="number"
            min="1"
            label="Cuotas (meses)"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
      </VRow>

      <div class="result-grid mt-5">
        <div class="result-box">
          <div class="text-overline text-grey">Cuota mensual</div>
          <div class="text-h5 font-weight-bold text-primary">{{ formatUYU(r.monthlyPayment) }}</div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Total a pagar</div>
          <div class="text-h5 font-weight-bold text-success">{{ formatUYU(r.totalPaid) }}</div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Intereses totales</div>
          <div class="text-h5 font-weight-bold">{{ formatUYU(r.totalInterest) }}</div>
        </div>
      </div>
    </VCard>

    <template #content>
      <h2>Sistema francés</h2>
      <p>
        La calculadora usa el <strong>sistema francés</strong>: cuota fija mensual durante todo el
        préstamo. Al principio pagás más intereses y menos capital, y la proporción se invierte con
        el tiempo.
      </p>
      <p>
        La tasa que ingresás es nominal anual. En la práctica conviene comparar la
        <strong>tasa efectiva</strong> y mirar si hay gastos, seguros o comisiones que encarecen el
        crédito.
      </p>
    </template>

    <template #disclaimer>
      Estimación por sistema francés con la tasa ingresada. No incluye gastos administrativos,
      seguros, IVA sobre intereses ni otros cargos. Pedí siempre el costo financiero total a tu
      institución antes de tomar un préstamo.
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { loanPayment } from '~/utils/calculators'
import { formatUYU } from '~/utils/format'

const principal = ref(200000)
const ratePct = ref(30)
const months = ref(24)

const r = computed(() => loanPayment(principal.value || 0, ratePct.value || 0, months.value || 0))

const faq = [
  {
    q: '¿Cómo se calcula la cuota de un préstamo?',
    a: 'Por el sistema francés, la cuota es fija y se obtiene con una fórmula que reparte capital e intereses a lo largo del plazo. Esta calculadora la computa a partir del monto, la tasa anual y la cantidad de cuotas.',
  },
  {
    q: '¿La tasa que ingreso incluye todos los costos?',
    a: 'No necesariamente. La tasa nominal no incluye gastos, seguros ni comisiones. Para comparar préstamos, pedí el costo financiero total (que incorpora todos los cargos).',
  },
]
</script>

<style scoped>
.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
.result-box {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 16px 18px;
}
</style>
