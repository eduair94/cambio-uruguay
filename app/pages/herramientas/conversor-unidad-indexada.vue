<template>
  <ToolShell slug="conversor-unidad-indexada" :faq="faq" :sources="sources">
    <VCard class="pa-5">
      <VBtnToggle
        v-model="mode"
        color="primary"
        density="comfortable"
        mandatory
        class="mb-5 flex-wrap"
      >
        <VBtn value="uiToPesos">UI → Pesos</VBtn>
        <VBtn value="pesosToUi">Pesos → UI</VBtn>
      </VBtnToggle>

      <VRow dense align="center">
        <VCol cols="12" sm="7">
          <VTextField
            v-model.number="amount"
            type="number"
            min="0"
            :label="mode === 'uiToPesos' ? 'Cantidad de UI' : 'Monto en pesos'"
            :prefix="mode === 'uiToPesos' ? 'UI' : '$'"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="5">
          <VTextField
            v-model.number="uiValue"
            type="number"
            min="0.0001"
            step="0.0001"
            label="Valor de la UI (BCU)"
            prefix="$"
            variant="outlined"
            density="comfortable"
            hide-details
            hint="Valor del día"
            persistent-hint
          />
        </VCol>
      </VRow>

      <div class="result-grid mt-5">
        <div class="result-box">
          <div class="text-overline text-grey">Resultado</div>
          <div class="text-h4 font-weight-bold text-primary">
            <template v-if="mode === 'uiToPesos'">{{ formatUYU(result) }}</template>
            <template v-else>{{ formatNumber(result, 2) }} UI</template>
          </div>
        </div>
      </div>
    </VCard>

    <template #content>
      <h2>Qué es la Unidad Indexada</h2>
      <p>
        La <strong>Unidad Indexada (UI)</strong> es una unidad de valor que se ajusta diariamente
        según la inflación (IPC). Mantiene el poder de compra en el tiempo, por eso se usa en
        alquileres, créditos hipotecarios, ahorro y contratos de largo plazo.
      </p>
      <p>
        Convertir es directo: multiplicás la cantidad de UI por el <strong>valor del día</strong>,
        que publica el Banco Central. Actualizá el valor de la UI con el dato vigente para mayor
        precisión.
      </p>
      <p>
        ¿Querés entenderla a fondo? Leé la guía
        <NuxtLink :to="localePath('/guias/unidad-indexada-explicada')"
          >Unidad Indexada explicada</NuxtLink
        >.
      </p>
    </template>

    <template #disclaimer>
      El valor de la UI cambia todos los días (referencia ≈ $6,58 en junio de 2026). Ingresá el
      valor vigente publicado por el INE o el BCU para un cálculo exacto.
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { round } from '~/utils/calculators'
import { formatNumber, formatUYU } from '~/utils/format'

const localePath = useLocalePath()
const mode = ref<'uiToPesos' | 'pesosToUi'>('uiToPesos')
const amount = ref(1000)
const uiValue = ref(6.58)

const sources = [
  { label: 'INE — Unidad Indexada (valor diario oficial)', url: 'https://www.ine.gub.uy' },
  {
    label: 'BCU — Banco Central del Uruguay',
    url: 'https://www.bcu.gub.uy',
  },
]

const result = computed(() => {
  const v = uiValue.value || 0
  if (v <= 0) return 0
  return mode.value === 'uiToPesos'
    ? round((amount.value || 0) * v)
    : round((amount.value || 0) / v, 2)
})

const faq = [
  {
    q: '¿Cómo convierto UI a pesos?',
    a: 'Multiplicás la cantidad de Unidades Indexadas por el valor de la UI del día, que publica el Banco Central del Uruguay. Por ejemplo, 1.000 UI a un valor de $6,50 equivalen a $6.500.',
  },
  {
    q: '¿Por qué la UI sube con el tiempo?',
    a: 'Porque su valor se ajusta por la inflación medida con el IPC. Así, una cantidad de UI conserva su poder de compra aunque suban los precios.',
  },
  {
    q: '¿En qué se diferencia de la Unidad Reajustable (UR)?',
    a: 'La UI ajusta por precios (IPC) y la UR por salarios (Índice Medio de Salarios). Por eso pueden evolucionar de forma distinta. La UR se usa habitualmente en alquileres y préstamos del BHU.',
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
.tool-link {
  color: #64b5f6;
  font-weight: 600;
  text-decoration: none;
}
.tool-link:hover {
  text-decoration: underline;
}
</style>
