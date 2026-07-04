<template>
  <ToolShell slug="calculadora-inflacion" :faq="faq" hide-disclaimer>
    <VCard class="pa-4 pa-sm-6">
      <VRow class="g-input">
        <VCol cols="12" sm="5">
          <VTextField
            v-model.number="amount"
            type="number"
            min="0"
            label="Monto actual"
            prefix="$"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="4">
          <VTextField
            v-model.number="inflationPct"
            type="number"
            min="0"
            step="0.1"
            label="Inflación anual"
            suffix="%"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="3">
          <VTextField
            v-model.number="years"
            type="number"
            min="0"
            label="Años"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
      </VRow>

      <VDivider class="my-6" />

      <div class="result-grid">
        <div class="result-box">
          <div class="text-overline text-grey">Valor nominal en {{ years }} años</div>
          <div class="text-h5 font-weight-bold text-primary">{{ formatUYU(r.nominal) }}</div>
          <div class="text-caption text-grey-lighten-1">Lo que costaría lo mismo, más caro</div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Poder de compra real</div>
          <div class="text-h5 font-weight-bold text-warning">
            {{ formatUYU(r.purchasingPower) }}
          </div>
          <div class="text-caption text-grey-lighten-1">
            Lo que valdrían hoy esos pesos del futuro
          </div>
        </div>
      </div>
    </VCard>

    <template #content>
      <h2>El dinero y la inflación</h2>
      <p>
        La <strong>inflación</strong> hace que la misma cantidad de pesos compre menos cosas con el
        paso del tiempo. Esta herramienta muestra dos caras: cuánto costaría en el futuro algo que
        hoy vale ese monto, y cuánto poder de compra real conservaría ese dinero.
      </p>
      <p>
        Es la razón por la que muchos uruguayos ahorran en
        <NuxtLink :to="localePath('/guias/ahorrar-en-dolares-o-pesos')"
          >dólares o en instrumentos indexados</NuxtLink
        >: buscan que su dinero no pierda valor.
      </p>
      <p>
        La
        <NuxtLink :to="localePath('/indicadores/unidad-indexada')">Unidad Indexada (UI)</NuxtLink>
        se ajusta justamente por la inflación, por eso se usa para que alquileres, créditos y
        ahorros mantengan su valor real. Si tenés dudas, mirá la diferencia entre
        <NuxtLink :to="localePath('/guias/ui-ur-bpc-diferencias')">UI, UR y BPC</NuxtLink>.
      </p>
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { adjustByInflation } from '~/utils/calculators'
import { formatUYU } from '~/utils/format'

const localePath = useLocalePath()
const amount = ref(100000)
const inflationPct = ref(7)
const years = ref(5)

const r = computed(() =>
  adjustByInflation(amount.value || 0, inflationPct.value || 0, years.value || 0)
)

const faq = [
  {
    q: '¿Cómo afecta la inflación a mis ahorros?',
    a: 'Si tu dinero no genera un rendimiento que iguale o supere la inflación, pierde poder de compra: con el tiempo, la misma cantidad de pesos compra menos. Por eso conviene buscar opciones que protejan o aumenten el valor real.',
  },
  {
    q: '¿Qué inflación anual debería usar?',
    a: 'Podés usar la inflación reciente como referencia o la inflación esperada. En Uruguay suele ubicarse en un dígito anual; ajustá el porcentaje según el período que quieras analizar.',
  },
]
</script>

<style scoped>
/* Amber `text-warning` (#FF8F00) can't clear AA on the light page even as large
   text. Darken the "purchasing power" figure in light mode; dark mode keeps the
   amber warning tone. */
.v-theme--light .text-warning {
  color: #c25e00 !important;
}
</style>

<!-- Layout primitives shared from ToolShell (.tool-page namespace). -->
