<template>
  <ToolShell slug="calculadora-impuestos-importacion" :faq="faq" :sources="sources">
    <VCard class="pa-5">
      <!-- Regime selector -->
      <VBtnToggle
        v-model="regime"
        color="primary"
        density="comfortable"
        mandatory
        class="mb-5 flex-wrap"
      >
        <VBtn value="courier">
          <VIcon start size="small">mdi-package-variant-closed</VIcon>
          Compra online (courier)
        </VBtn>
        <VBtn value="general">
          <VIcon start size="small">mdi-truck-outline</VIcon>
          Régimen general
        </VBtn>
      </VBtnToggle>

      <VRow dense>
        <VCol cols="12" sm="6">
          <VTextField
            v-model.number="value"
            type="number"
            min="0"
            label="Valor de la mercadería (USD)"
            prefix="US$"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6">
          <VTextField
            v-model.number="shipping"
            type="number"
            min="0"
            label="Flete / envío (USD)"
            prefix="US$"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>

        <!-- Courier-specific -->
        <template v-if="regime === 'courier'">
          <VCol cols="12" sm="6" class="d-flex align-center">
            <VSwitch
              v-model="useFranchise"
              color="primary"
              label="Usar franquicia anual (USD 800)"
              hide-details
              density="comfortable"
            />
          </VCol>
          <VCol v-if="useFranchise" cols="12" sm="6">
            <VTextField
              v-model.number="franchiseAvailable"
              type="number"
              min="0"
              max="800"
              label="Franquicia disponible (USD)"
              prefix="US$"
              variant="outlined"
              density="comfortable"
              hide-details
              hint="Hasta USD 800 por año, en 3 envíos"
              persistent-hint
            />
          </VCol>
        </template>

        <!-- General-specific -->
        <template v-else>
          <VCol cols="6" sm="3">
            <VTextField
              v-model.number="insurance"
              type="number"
              min="0"
              label="Seguro (USD)"
              prefix="US$"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </VCol>
          <VCol cols="6" sm="3">
            <VTextField
              v-model.number="arancelPct"
              type="number"
              min="0"
              label="Arancel %"
              suffix="%"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </VCol>
          <VCol cols="6" sm="3">
            <VTextField
              v-model.number="tasaConsularPct"
              type="number"
              min="0"
              label="Tasa consular %"
              suffix="%"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </VCol>
          <VCol cols="6" sm="3">
            <VTextField
              v-model.number="ivaPct"
              type="number"
              min="0"
              label="IVA %"
              suffix="%"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </VCol>
        </template>
      </VRow>

      <VDivider class="my-5" />

      <!-- Result -->
      <div class="result-grid">
        <div class="result-box">
          <div class="text-overline text-grey">Impuestos estimados</div>
          <div class="text-h5 font-weight-bold text-primary">{{ formatUSD(result.totalTax) }}</div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Costo total (landed)</div>
          <div class="text-h5 font-weight-bold text-success">
            {{ formatUSD(result.landedCost) }}
          </div>
          <div v-if="landedUyu" class="text-caption text-grey-lighten-1">
            ≈ {{ formatUYU(landedUyu) }}
          </div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Carga sobre el valor</div>
          <div class="text-h5 font-weight-bold">
            {{ result.effectiveRatePct === null ? '-' : result.effectiveRatePct + '%' }}
          </div>
        </div>
      </div>

      <!-- Breakdown -->
      <VTable density="comfortable" class="mt-4 breakdown-table">
        <tbody>
          <tr v-for="(line, i) in result.breakdown" :key="i">
            <td>{{ line.label }}</td>
            <td class="text-right font-weight-medium">{{ formatUSD(line.amount) }}</td>
          </tr>
          <tr class="total-row">
            <td class="font-weight-bold">Total a pagar (con mercadería)</td>
            <td class="text-right font-weight-bold text-success">
              {{ formatUSD(result.landedCost) }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>

    <template #content>
      <h2>Cómo funciona</h2>
      <p>
        <strong>Compra online (courier):</strong> desde mayo de 2026 podés traer hasta
        <strong>USD 800 por año</strong> en 3 envíos, con un máximo de 20 kg por paquete, sin pagar
        impuestos de importación. Lo que supera la franquicia paga el régimen simplificado: una tasa
        única del <strong>60%</strong> sobre el valor, con un mínimo.
      </p>
      <p>
        <strong>Régimen general:</strong> aplica para importaciones formales. Se calcula el valor
        CIF (mercadería + flete + seguro), se suman el arancel y la tasa consular, y sobre esa base
        se aplica el <strong>IVA del 22%</strong>. Algunos productos pagan además IMESI.
      </p>
      <p>
        Los aranceles dependen del producto y el origen: muchos bienes del Mercosur pagan 0%. Ajustá
        los porcentajes según tu caso o consultá a tu despachante.
      </p>
    </template>

    <template #disclaimer>
      Cálculo de referencia. La normativa de importación cambia y tiene excepciones (tipo de
      producto, origen, exoneraciones). Régimen de franquicia vigente desde el 1.º de mayo de 2026
      (hasta USD 800 anuales, en 3 envíos, máximo 20 kg) y régimen simplificado del 60% sobre el
      excedente. Verificá las condiciones vigentes con la Dirección Nacional de Aduanas y tu courier
      antes de comprar. No es asesoramiento profesional.
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { courierImport, generalImport } from '~/utils/importTax'
import { formatUSD, formatUYU } from '~/utils/format'

const regime = ref<'courier' | 'general'>('courier')
const value = ref(150)
const shipping = ref(0)
const insurance = ref(0)
const useFranchise = ref(true)
const franchiseAvailable = ref(800)
const arancelPct = ref(0)
const tasaConsularPct = ref(5)
const ivaPct = ref(22)

const sources = [
  {
    label: 'Dirección Nacional de Aduanas — Régimen de franquicia',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/24954/3/innova.front/regimen-de-franquicia.html',
  },
  {
    label: 'MEF — Preguntas frecuentes sobre el régimen de envíos postales (franquicias)',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/guia-preguntas-frecuentes-sobre-regimen-envios-postales-franquicias',
  },
  { label: 'DGI — IVA e impuestos', url: 'https://www.dgi.gub.uy' },
]

const { bestSell } = useExchangeRates()

const result = computed(() =>
  regime.value === 'courier'
    ? courierImport({
        value: value.value || 0,
        shipping: shipping.value || 0,
        useFranchise: useFranchise.value,
        franchiseAvailable: franchiseAvailable.value || 0,
      })
    : generalImport({
        value: value.value || 0,
        shipping: shipping.value || 0,
        insurance: insurance.value || 0,
        arancelPct: arancelPct.value || 0,
        tasaConsularPct: tasaConsularPct.value || 0,
        ivaPct: ivaPct.value || 0,
      })
)

// Optional UYU equivalent of the landed cost using the best USD sell rate.
const landedUyu = computed(() => {
  const rate = bestSell('USD')
  return rate ? result.value.landedCost * rate : null
})

const faq = [
  {
    q: '¿Cuánto puedo traer del exterior sin pagar impuestos en Uruguay?',
    a: 'Desde mayo de 2026 rige una franquicia anual de hasta USD 800 por persona, utilizable en hasta 3 envíos por año, con un máximo de 20 kg por paquete, para compras puerta a puerta sin fines comerciales. Lo que supera ese monto tributa.',
  },
  {
    q: '¿Cuánto se paga por encima de la franquicia?',
    a: 'El régimen simplificado de courier aplica una tasa única del 60% sobre el valor declarado de la parte no exenta, con un mínimo. Por ejemplo, si traés USD 1.000 y usás los USD 800 de franquicia, pagás 60% sobre los USD 200 restantes (USD 120).',
  },
  {
    q: '¿Cómo se calculan los impuestos en el régimen general?',
    a: 'Se parte del valor CIF (mercadería + flete + seguro). Sobre el CIF se aplican el arancel (Tasa Global Arancelaria, que varía según el producto y el origen) y la tasa consular. Luego, el IVA del 22% se calcula sobre la suma de CIF + arancel + tasa consular. Algunos bienes pagan además IMESI.',
  },
  {
    q: '¿Los valores de esta calculadora son oficiales?',
    a: 'No. Son estimaciones de referencia con fines informativos. Las tasas y franquicias pueden cambiar y existen excepciones según el producto y el origen. Verificá siempre con Aduanas y tu courier antes de comprar.',
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
  padding: 12px 16px;
}

.breakdown-table :deep(td) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.total-row :deep(td),
.total-row td {
  border-top: 2px solid rgba(255, 255, 255, 0.15);
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
