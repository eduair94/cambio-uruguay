<template>
  <ToolShell slug="calculadora-impuestos-importacion" :faq="faq" :sources="sources">
    <VCard class="pa-4 pa-sm-6">
      <!-- Regime selector: full-width segmented control -->
      <div class="text-overline text-grey mb-2">Régimen de importación</div>
      <VBtnToggle
        v-model="regime"
        color="primary"
        mandatory
        divided
        variant="outlined"
        class="seg-toggle mb-6"
      >
        <VBtn value="courier" class="seg-btn">
          <VIcon start>mdi-package-variant-closed</VIcon>
          Compra online <span class="d-none d-sm-inline">&nbsp;(courier)</span>
        </VBtn>
        <VBtn value="general" class="seg-btn">
          <VIcon start>mdi-truck-outline</VIcon>
          Régimen general
        </VBtn>
      </VBtnToggle>

      <!-- Origin (courier only): drives the USA/TIFA IVA exemption -->
      <template v-if="regime === 'courier'">
        <div class="text-overline text-grey mb-2">Origen del envío</div>
        <VBtnToggle
          v-model="origin"
          color="primary"
          mandatory
          divided
          variant="outlined"
          class="seg-toggle mb-6"
        >
          <VBtn value="usa" class="seg-btn">
            <VIcon start>mdi-flag-variant</VIcon>
            Estados Unidos
          </VBtn>
          <VBtn value="other" class="seg-btn">
            <VIcon start>mdi-earth</VIcon>
            Otro país
          </VBtn>
        </VBtnToggle>
      </template>

      <!-- Core inputs -->
      <VRow class="g-input">
        <VCol cols="12" sm="6">
          <VTextField
            v-model.number="value"
            type="number"
            min="0"
            label="Valor de la mercadería"
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
            label="Flete / envío"
            prefix="US$"
            variant="outlined"
            density="comfortable"
            :readonly="regime === 'courier' && shipByWeight"
            :hint="regime === 'courier' && shipByWeight ? 'Calculado por peso abajo' : ''"
            :persistent-hint="regime === 'courier' && shipByWeight"
          />
        </VCol>

        <!-- Courier-specific -->
        <template v-if="regime === 'courier'">
          <VCol cols="12" sm="6" class="d-flex align-center">
            <VSwitch
              v-model="useFranchise"
              color="primary"
              label="Usar franquicia anual (US$ 800)"
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
              label="Franquicia disponible"
              prefix="US$"
              variant="outlined"
              density="comfortable"
              hint="Hasta US$ 800 por año, en 3 envíos"
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
              label="Seguro"
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
              label="Arancel"
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
              label="Tasa consular"
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
              label="IVA"
              suffix="%"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </VCol>
        </template>
      </VRow>

      <!-- Courier shipping by weight -->
      <template v-if="regime === 'courier'">
        <div class="tool-info-box mt-5 pa-4">
          <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-1">
            <div class="d-flex align-center ga-2">
              <VIcon color="primary" size="small">mdi-weight-kilogram</VIcon>
              <span class="text-subtitle-2 font-weight-bold">Estimar flete por peso</span>
            </div>
            <VSwitch v-model="shipByWeight" color="primary" hide-details density="compact" inset />
          </div>
          <p class="text-caption text-grey-lighten-1 mb-3">
            Tarifa de referencia por courier (Miami → Uruguay). Ajustá el valor por kg al de tu
            courier; el resultado completa el flete de arriba.
          </p>
          <VExpandTransition>
            <VRow v-if="shipByWeight" class="g-input">
              <VCol cols="12" sm="5">
                <VSelect
                  v-model="courierId"
                  :items="courierItems"
                  item-title="name"
                  item-value="id"
                  label="Courier"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
              </VCol>
              <VCol cols="6" sm="4">
                <VTextField
                  v-model.number="weightKg"
                  type="number"
                  min="0"
                  step="0.1"
                  label="Peso"
                  suffix="kg"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
              </VCol>
              <VCol cols="6" sm="3">
                <VTextField
                  v-model.number="perKgUsd"
                  type="number"
                  min="0"
                  label="US$/kg"
                  prefix="US$"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
              </VCol>
              <VCol cols="12">
                <div class="d-flex align-center justify-space-between tool-info-row px-3 py-2">
                  <span class="text-body-2 text-grey-lighten-1">Flete estimado</span>
                  <span class="text-subtitle-1 font-weight-bold text-primary">
                    {{ formatUSD(computedShipping) }}
                  </span>
                </div>
              </VCol>
            </VRow>
          </VExpandTransition>
        </div>
      </template>

      <VDivider class="my-6" />

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
      <VTable density="comfortable" class="mt-5 breakdown-table">
        <tbody>
          <tr v-for="(line, i) in result.breakdown" :key="i">
            <td>{{ line.label }}</td>
            <td class="text-right font-weight-medium" :class="{ 'text-success': line.amount < 0 }">
              {{ formatUSD(line.amount) }}
            </td>
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
        <strong>US$ 800 por año</strong> en hasta 3 envíos, sin pagar <em>aranceles</em>. Pero la
        franquicia <strong>sí paga IVA (22%)</strong>, salvo una excepción: los envíos desde
        <strong>Estados Unidos de hasta US$ 200</strong> quedan exonerados de IVA por el acuerdo
        TIFA. Lo que supera la franquicia paga el régimen simplificado del <strong>60%</strong>.
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
      Cálculo de referencia. Régimen de franquicia vigente desde el 1.º de mayo de 2026 (hasta US$
      800 anuales, en 3 envíos): exento de aranceles pero <strong>gravado con IVA 22%</strong>,
      salvo envíos desde EE.UU. de hasta US$ 200 (exonerados de IVA por el acuerdo TIFA). El
      excedente paga el régimen simplificado del 60%. Las tarifas de courier son de referencia.
      Verificá las condiciones vigentes con la Dirección Nacional de Aduanas y tu courier antes de
      comprar. No es asesoramiento profesional.
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { courierImport, generalImport } from '~/utils/importTax'
import { COURIERS, getCourier, shippingCostUsd } from '~/utils/courierShipping'
import { formatUSD, formatUYU } from '~/utils/format'

const regime = ref<'courier' | 'general'>('courier')
const origin = ref<'usa' | 'other'>('usa')
const value = ref(150)
const shipping = ref(0)
const insurance = ref(0)
const useFranchise = ref(true)
const franchiseAvailable = ref(800)
const arancelPct = ref(0)
const tasaConsularPct = ref(5)
const ivaPct = ref(22)

// Courier shipping-by-weight
const shipByWeight = ref(false)
const courierId = ref(COURIERS[0]!.id)
const weightKg = ref(1)
const perKgUsd = ref(COURIERS[0]!.perKgUsd)
const courierItems = COURIERS

// When the courier changes, pre-fill its reference per-kg rate.
watch(courierId, id => {
  perKgUsd.value = getCourier(id).perKgUsd
})

const computedShipping = computed(() =>
  shippingCostUsd(perKgUsd.value || 0, getCourier(courierId.value).baseUsd, weightKg.value || 0)
)

// Feed the freight input when estimating by weight.
watch([shipByWeight, computedShipping], () => {
  if (regime.value === 'courier' && shipByWeight.value) shipping.value = computedShipping.value
})

const sources = [
  {
    label: 'Dirección Nacional de Aduanas — Nuevo régimen de franquicias (mayo 2026)',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/28455/1/innova.front/desde-el-1%C2%BA-de-mayo-comienza-a-regir-el-nuevo-regimen-de-franquicias-de-envios-postales-internacionales.html',
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
        origin: origin.value,
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

const landedUyu = computed(() => {
  const rate = bestSell('USD')
  return rate ? result.value.landedCost * rate : null
})

const faq = [
  {
    q: '¿La franquicia de US$ 800 paga impuestos?',
    a: 'Desde mayo de 2026 la franquicia anual de US$ 800 (en hasta 3 envíos) exime de aranceles, pero igual paga IVA del 22%. La única excepción son los envíos desde Estados Unidos de hasta US$ 200 cada uno, que quedan exonerados de IVA por el Acuerdo Marco de Comercio e Inversiones (TIFA).',
  },
  {
    q: '¿Por qué importa si el envío viene de Estados Unidos?',
    a: 'Por el acuerdo TIFA entre Uruguay y EE.UU., los envíos desde Estados Unidos de hasta US$ 200 mantienen la exoneración de IVA. Si el envío de EE.UU. supera los US$ 200, o si proviene de cualquier otro país, se aplica el IVA del 22% sobre la franquicia.',
  },
  {
    q: '¿Cuánto se paga por encima de la franquicia?',
    a: 'El régimen simplificado aplica una tasa única del 60% sobre el valor que supera la franquicia, con un mínimo. Por ejemplo, si traés US$ 1.000 y usás los US$ 800 de franquicia, pagás IVA sobre los 800 más 60% sobre los 200 restantes.',
  },
  {
    q: '¿Cómo se calculan los impuestos en el régimen general?',
    a: 'Se parte del valor CIF (mercadería + flete + seguro). Sobre el CIF se aplican el arancel (Tasa Global Arancelaria, que varía según el producto y el origen) y la tasa consular. Luego, el IVA del 22% se calcula sobre la suma de CIF + arancel + tasa consular. Algunos bienes pagan además IMESI.',
  },
  {
    q: '¿Las tarifas de courier por peso son oficiales?',
    a: 'No. Son valores de referencia para estimar el flete según el peso. Cada courier (USX Cargo, casilleros en Miami, etc.) tiene su propia tarifa por kilo; ajustá el valor por kg al de tu courier para una estimación más precisa.',
  },
]
</script>

<!-- All layout primitives (seg-toggle, result-grid, tool-info-box,
     breakdown-table…) are shared from ToolShell, namespaced under .tool-page. -->
