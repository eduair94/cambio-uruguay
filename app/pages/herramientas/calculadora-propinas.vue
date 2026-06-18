<template>
  <ToolShell slug="calculadora-propinas" :faq="faq" hide-disclaimer>
    <VCard class="pa-5">
      <VRow dense>
        <VCol cols="12" sm="5">
          <VTextField
            v-model.number="bill"
            type="number"
            min="0"
            label="Monto de la cuenta"
            prefix="$"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="4">
          <VTextField
            v-model.number="tipPct"
            type="number"
            min="0"
            label="Propina"
            suffix="%"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="3">
          <VTextField
            v-model.number="people"
            type="number"
            min="1"
            label="Personas"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
      </VRow>

      <div class="d-flex flex-wrap ga-2 mt-3">
        <VChip
          v-for="p in [5, 10, 15, 20]"
          :key="p"
          :color="tipPct === p ? 'primary' : undefined"
          variant="tonal"
          size="small"
          @click="tipPct = p"
        >
          {{ p }}%
        </VChip>
      </div>

      <div class="result-grid mt-5">
        <div class="result-box">
          <div class="text-overline text-grey">Propina</div>
          <div class="text-h6 font-weight-bold text-primary">{{ formatUYU(tip) }}</div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Total con propina</div>
          <div class="text-h6 font-weight-bold text-success">{{ formatUYU(total) }}</div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Por persona</div>
          <div class="text-h6 font-weight-bold">{{ formatUYU(perPerson) }}</div>
        </div>
      </div>
    </VCard>

    <template #content>
      <h2>Propina y división de cuenta</h2>
      <p>
        Calculá la propina sobre el total y dividí la cuenta entre todos en segundos. Elegí un
        porcentaje rápido o ingresá el tuyo.
      </p>
      <p>
        En Uruguay la propina es voluntaria y suele rondar el 10%. En restaurantes puede aparecer un
        "cubierto" aparte, que no es propina.
      </p>
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { round } from '~/utils/calculators'
import { formatUYU } from '~/utils/format'

const bill = ref(2000)
const tipPct = ref(10)
const people = ref(2)

const tip = computed(() => round(((bill.value || 0) * (tipPct.value || 0)) / 100))
const total = computed(() => round((bill.value || 0) + tip.value))
const perPerson = computed(() => round(total.value / Math.max(people.value || 1, 1)))

const faq = [
  {
    q: '¿Cuánto se deja de propina en Uruguay?',
    a: 'La propina es voluntaria. Es habitual dejar alrededor del 10% del total cuando el servicio fue bueno, aunque cada persona decide según su criterio.',
  },
  {
    q: '¿La calculadora divide la cuenta?',
    a: 'Sí. Además de calcular la propina, divide el total (cuenta más propina) entre la cantidad de personas que indiques para saber cuánto paga cada una.',
  },
]
</script>

<style scoped>
.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}
.result-box {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 14px 16px;
}
</style>
