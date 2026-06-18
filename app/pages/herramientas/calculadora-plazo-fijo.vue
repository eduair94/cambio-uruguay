<template>
  <ToolShell slug="calculadora-plazo-fijo" :faq="faq">
    <VCard class="pa-4 pa-sm-6">
      <VRow class="g-input">
        <VCol cols="12" sm="6">
          <VTextField
            v-model.number="principal"
            type="number"
            min="0"
            label="Capital inicial"
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
            label="Plazo (meses)"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12">
          <VSelect
            v-model.number="timesPerYear"
            :items="freqItems"
            label="Capitalización"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
      </VRow>

      <VDivider class="my-6" />

      <div class="result-grid">
        <div class="result-box">
          <div class="text-overline text-grey">Monto final</div>
          <div class="text-h5 font-weight-bold text-success">{{ formatUYU(r.finalAmount) }}</div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Intereses ganados</div>
          <div class="text-h5 font-weight-bold text-primary">{{ formatUYU(r.interest) }}</div>
        </div>
      </div>
    </VCard>

    <template #content>
      <h2>Interés compuesto</h2>
      <p>
        El plazo fijo rinde por <strong>interés compuesto</strong>: los intereses se suman al
        capital y, en los siguientes períodos, generan nuevos intereses. Cuanto más seguido se
        capitaliza y más largo es el plazo, mayor es el efecto.
      </p>
      <p>
        En Uruguay podés constituir plazos fijos en pesos o en dólares. Los de pesos suelen pagar
        más tasa para compensar la inflación. Compará siempre la
        <strong>tasa efectiva</strong> entre bancos.
      </p>
    </template>

    <template #disclaimer>
      Estimación con interés compuesto sobre la tasa que ingresás. No incluye impuestos (como el
      IRPF a la renta de capital) ni comisiones. Consultá las condiciones reales con tu banco.
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { compoundInterest } from '~/utils/calculators'
import { formatUYU } from '~/utils/format'

const principal = ref(100000)
const ratePct = ref(8)
const months = ref(12)
const timesPerYear = ref(12)
const freqItems = [
  { title: 'Mensual', value: 12 },
  { title: 'Trimestral', value: 4 },
  { title: 'Semestral', value: 2 },
  { title: 'Anual', value: 1 },
]

const r = computed(() =>
  compoundInterest(
    principal.value || 0,
    ratePct.value || 0,
    (months.value || 0) / 12,
    timesPerYear.value || 1
  )
)

const faq = [
  {
    q: '¿Cómo funciona el interés compuesto?',
    a: 'Los intereses generados se reinvierten junto al capital, de modo que en cada período se calcula interés sobre un monto mayor. Por eso un plazo fijo a largo plazo crece de forma acelerada.',
  },
  {
    q: '¿Conviene un plazo fijo en pesos o en dólares?',
    a: 'Depende de tus objetivos. Los plazos en pesos pagan más tasa pero enfrentan la inflación; los de dólares pagan menos pero preservan valor. Mirá la tasa frente a la inflación esperada antes de decidir.',
  },
]
</script>

<!-- Layout primitives shared from ToolShell (.tool-page namespace). -->
