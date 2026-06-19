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

      <!-- Product type: drives IVA, IMESI and required procedures -->
      <div class="text-overline text-grey mb-2">Tipo de producto</div>
      <VSelect
        v-model="productTypeId"
        :items="IMPORT_PRODUCT_TYPES"
        item-title="label"
        item-value="id"
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-shape-outline"
        hide-details
        class="mb-3"
      >
        <template #item="{ props: itemProps, item }">
          <VListItem v-bind="itemProps" :prepend-icon="item.raw.icon" />
        </template>
      </VSelect>

      <!-- Status: IVA treatment, required procedures, prohibitions -->
      <div class="d-flex flex-wrap align-center ga-2 mb-2">
        <VChip
          size="small"
          variant="tonal"
          :color="productType.iva === 'exento' ? 'success' : 'primary'"
          prepend-icon="mdi-cash"
        >
          {{
            productType.iva === 'exento'
              ? 'No paga IVA (exento)'
              : `IVA ${productTax.ivaPct}%`
          }}
        </VChip>
        <VChip
          v-if="productType.imesi"
          size="small"
          variant="tonal"
          color="warning"
          prepend-icon="mdi-fuel"
        >
          Paga IMESI
        </VChip>
        <VChip
          v-for="proc in productType.procedures"
          :key="proc.organism"
          size="small"
          variant="tonal"
          color="info"
          prepend-icon="mdi-file-document-check-outline"
          :href="proc.url"
          target="_blank"
          rel="noopener"
        >
          Trámite: {{ ORGANISM_LABEL[proc.organism] }}
        </VChip>
      </div>

      <VAlert
        v-if="regimeStatus.blocked"
        type="error"
        variant="tonal"
        density="comfortable"
        class="mb-3"
        icon="mdi-cancel"
      >
        {{ regimeStatus.reason }}
      </VAlert>
      <VAlert
        v-else-if="productType.procedures?.length"
        type="info"
        variant="tonal"
        density="comfortable"
        class="mb-3"
        icon="mdi-information-outline"
      >
        Antes de despachar necesitás un trámite ante
        {{ productType.procedures.map(p => ORGANISM_LABEL[p.organism]).join(' y ') }}.
        <span v-if="productType.note">{{ productType.note }}</span>
      </VAlert>
      <p
        v-else-if="productType.note"
        class="text-caption text-grey-lighten-1 mb-3"
      >
        {{ productType.note }}
      </p>

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
          <VCol v-if="showImesiField" cols="12" sm="3">
            <VTextField
              v-model.number="imesiPct"
              type="number"
              min="0"
              label="IMESI"
              suffix="%"
              placeholder="ej. 20"
              variant="outlined"
              density="comfortable"
              hint="Varía mucho según el producto: ingresá la tasa de tu caso."
              persistent-hint
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
          <p class="text-caption text-grey-lighten-1 mb-1">
            Tarifa de referencia por courier (Miami → Uruguay). Ajustá el valor por kg al de tu
            courier; el resultado completa el flete de arriba.
          </p>
          <p class="text-caption text-grey-lighten-1 mb-3">
            El flete es un costo aparte: <strong>no paga IVA</strong> y se suma al total.
            <NuxtLink :to="localePath('/couriers-uruguay')" class="tool-link">
              Comparar couriers en Uruguay
            </NuxtLink>
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

      <!-- When the product can't enter under this regime, the estimate is shown
           dimmed under a warning: the math still illustrates the cost, but it is
           not actionable. -->
      <p v-if="regimeStatus.blocked" class="text-caption text-error mb-3">
        <VIcon size="small" start>mdi-alert</VIcon>
        Estimación a título informativo: este producto no puede importarse por este régimen.
      </p>

      <!-- Result -->
      <div class="result-grid" :class="{ 'result-blocked': regimeStatus.blocked }">
        <div class="result-box">
          <div class="text-overline text-grey">Impuestos estimados</div>
          <div class="text-h5 font-weight-bold text-primary">{{ formatUSD(result.totalTax) }}</div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Costo total (landed)</div>
          <div class="text-h5 font-weight-bold text-success">
            {{ formatUSD(result.landedCost) }}
          </div>
          <UyuEquivalent :usd="result.landedCost" />
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Carga sobre el valor</div>
          <div class="text-h5 font-weight-bold">
            {{ result.effectiveRatePct === null ? '-' : result.effectiveRatePct + '%' }}
          </div>
        </div>
      </div>

      <!-- Breakdown -->
      <VTable
        density="comfortable"
        class="mt-5 breakdown-table"
        :class="{ 'result-blocked': regimeStatus.blocked }"
      >
        <tbody>
          <tr v-for="(line, i) in result.breakdown" :key="i">
            <td>{{ line.label }}</td>
            <td class="text-right font-weight-medium" :class="{ 'text-success': line.amount < 0 }">
              {{ formatUSD(line.amount) }}
            </td>
          </tr>
          <tr class="total-row">
            <td class="font-weight-bold">{{ totalRowLabel }}</td>
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
        En este régimen el IVA y la tasa única se calculan siempre sobre el
        <strong>costo interno del producto</strong> (el valor de la factura del vendedor). El
        <strong>flete del courier no paga IVA</strong>: es un costo aparte que se muestra explícito
        y se suma al total. ¿No sabés qué courier conviene?
        <NuxtLink :to="localePath('/couriers-uruguay')" class="tool-link">
          Compará los couriers disponibles en Uruguay</NuxtLink
        >.
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
      <h2>Tipo de producto: IVA, trámites y prohibidos</h2>
      <p>
        Elegí el <strong>tipo de producto</strong> para ajustar el IVA y ver si necesitás trámites:
      </p>
      <ul>
        <li>
          <strong>No pagan IVA:</strong> libros, diarios y revistas están exentos. Los
          <strong>medicamentos</strong> pagan la tasa mínima del 10%.
        </li>
        <li>
          <strong>Pagan IVA 22%:</strong> el resto de los bienes (electrónica, ropa, juguetes, etc.).
        </li>
        <li>
          <strong>Requieren trámites adicionales:</strong> celulares y equipos con radiofrecuencia,
          drones y GPS necesitan homologación de <strong>URSEC</strong> (vía VUCE); medicamentos,
          suplementos, cosméticos y productos médicos pasan por el <strong>MSP</strong>; semillas,
          plantas, fertilizantes y alimentos por el <strong>MGAP</strong>; armas y réplicas por el
          Servicio de Material y Armamento del Ejército.
        </li>
        <li>
          <strong>Prohibidos por courier:</strong> vaporizadores y cigarrillos electrónicos,
          pirotecnia, inflamables, baterías sueltas y power banks, dinero en efectivo y sustancias
          controladas. Bebidas alcohólicas, tabaco, perfumería y vehículos pagan IMESI y solo
          ingresan por importación formal (régimen general).
        </li>
      </ul>
      <p>
        Las listas son orientativas y <strong>no taxativas</strong>: pueden variar según la cantidad,
        el uso y la normativa vigente. Confirmá siempre con Aduanas y el organismo correspondiente.
      </p>
    </template>

    <template #disclaimer>
      Cálculo de referencia. Régimen de franquicia vigente desde el 1.º de mayo de 2026 (hasta US$
      800 anuales, en 3 envíos): exento de aranceles pero <strong>gravado con IVA 22%</strong>,
      salvo envíos desde EE.UU. de hasta US$ 200 (exonerados de IVA por el acuerdo TIFA). El
      excedente paga el régimen simplificado del 60%. El IVA y la tasa única gravan el valor de la
      mercadería; <strong>el flete del courier no paga IVA</strong> y se suma aparte al costo total.
      Las tarifas de courier son de referencia. Verificá las condiciones vigentes con la Dirección
      Nacional de Aduanas y tu courier antes de comprar. No es asesoramiento profesional.
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { courierImport, generalImport } from '~/utils/importTax'
import {
  IMPORT_PRODUCT_TYPES,
  productRegimeStatus,
  productTypeById,
  resolveProductTax,
} from '~/utils/importProductTypes'
import { ESTIMATOR_COURIERS, shippingCostUsd, type Courier } from '~/utils/courierShipping'
import { formatUSD } from '~/utils/format'

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
const imesiPct = ref(0)

// Product type drives the IVA rate, IMESI applicability and which agencies must
// authorize the shipment. `general` (the default) reproduces the prior behaviour.
const productTypeId = ref('general')
const productType = computed(() => productTypeById(productTypeId.value))
const productTax = computed(() => resolveProductTax(productType.value))
const regimeStatus = computed(() => productRegimeStatus(productType.value, regime.value))
const showImesiField = computed(() => regime.value === 'general' && productType.value.imesi === true)

// Keep the (still editable) IVA field in sync with the chosen product type.
watch(
  productTax,
  tax => {
    ivaPct.value = tax.ivaPct
  },
  { immediate: true }
)
// Reset the IMESI field when a category that does not levy IMESI is selected, so a
// stale rate never lingers in the (now hidden) field.
watch(showImesiField, on => {
  if (!on) imesiPct.value = 0
})

const ORGANISM_LABEL: Record<string, string> = {
  MSP: 'MSP — Salud Pública',
  URSEC: 'URSEC (VUCE)',
  MGAP: 'MGAP — Agricultura',
  SMA: 'Material y Armamento (Ejército)',
}

// Courier shipping-by-weight — only couriers with a published flat per-kg are offered here.
// Rates come from /api/couriers (daily-scraped, freshest), falling back to the static seed.
const { data: couriersData } = await useFetch<{ couriers: Courier[] }>('/api/couriers', {
  default: () => ({ couriers: ESTIMATOR_COURIERS as Courier[] }),
})
const courierItems = computed<Courier[]>(() => {
  const withRate = (couriersData.value?.couriers ?? []).filter(c => c.perKgUsd != null)
  return withRate.length ? withRate : ESTIMATOR_COURIERS
})
function courierById(id: string): Courier {
  return courierItems.value.find(c => c.id === id) ?? courierItems.value[0]!
}

const shipByWeight = ref(false)
const courierId = ref(ESTIMATOR_COURIERS[0]!.id)
const weightKg = ref(1)
const perKgUsd = ref<number>(ESTIMATOR_COURIERS[0]!.perKgUsd ?? 0)

// Pre-fill the per-kg rate when the courier changes, or when fresh rates arrive from the API.
watch([courierId, courierItems], () => {
  const rate = courierById(courierId.value).perKgUsd
  if (rate != null) perKgUsd.value = rate
})

const computedShipping = computed(() =>
  shippingCostUsd(
    perKgUsd.value || 0,
    courierById(courierId.value).baseUsd ?? 0,
    weightKg.value || 0
  )
)

// Feed the freight input while estimating by weight; reset it to 0 when the estimate is turned
// off so a stale weight-based amount never lingers in the (now editable) freight field.
watch(shipByWeight, on => {
  if (regime.value !== 'courier') return
  shipping.value = on ? computedShipping.value : 0
})
watch(computedShipping, v => {
  if (regime.value === 'courier' && shipByWeight.value) shipping.value = v
})

const localePath = useLocalePath()

const sources = [
  {
    label: 'Dirección Nacional de Aduanas — Nuevo régimen de franquicias (mayo 2026)',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/28455/1/innova.front/desde-el-1%C2%BA-de-mayo-comienza-a-regir-el-nuevo-regimen-de-franquicias-de-envios-postales-internacionales.html',
  },
  {
    label: 'MEF — Preguntas frecuentes sobre el régimen de envíos postales (franquicias)',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/guia-preguntas-frecuentes-sobre-regimen-envios-postales-franquicias',
  },
  {
    label: 'Aduanas — Mercaderías controladas por otros organismos',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/25358/15/innova.front/',
  },
  {
    label: 'Aduanas — ¿Qué mercadería no puedo traer bajo encomiendas postales?',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/25107/3/innova.front/que-mercaderia-no-puedo-traer-bajo-el-regimen-de-encomiendas-postales-internacionales.html',
  },
  { label: 'VUCE / URSEC — Homologación de equipos de radiofrecuencia', url: 'https://vuce.gub.uy' },
  { label: 'MSP — Medicamentos, suplementos, cosméticos y productos médicos', url: 'https://www.gub.uy/ministerio-salud-publica/' },
  { label: 'MGAP — Plantas, semillas, fertilizantes y alimentos', url: 'https://www.gub.uy/ministerio-ganaderia-agricultura-pesca/' },
  { label: 'Ejército — Servicio de Material y Armamento (armas y réplicas)', url: 'https://www.ejercito.mil.uy' },
  { label: 'DGI — IVA e impuestos', url: 'https://www.dgi.gub.uy' },
]

const result = computed(() =>
  regime.value === 'courier'
    ? courierImport({
        value: value.value || 0,
        shipping: shipping.value || 0,
        origin: origin.value,
        useFranchise: useFranchise.value,
        franchiseAvailable: franchiseAvailable.value || 0,
        ivaPct: productTax.value.ivaPct,
      })
    : generalImport({
        value: value.value || 0,
        shipping: shipping.value || 0,
        insurance: insurance.value || 0,
        arancelPct: arancelPct.value || 0,
        tasaConsularPct: tasaConsularPct.value || 0,
        ivaPct: ivaPct.value || 0,
        imesiPct: imesiPct.value || 0,
      })
)

// Make explicit that, for courier shipments with freight, the total already includes it.
const totalRowLabel = computed(() =>
  regime.value === 'courier' && (shipping.value || 0) > 0
    ? 'Total a pagar (mercadería + flete + impuestos)'
    : 'Total a pagar (con mercadería)'
)

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
    q: '¿El flete del courier paga IVA?',
    a: 'No en el régimen courier (compra online): el IVA y la tasa única se calculan siempre sobre el costo interno del producto (el valor de la factura del vendedor), nunca sobre el flete del courier. El envío es un costo aparte que se muestra explícito y se suma al total. Distinto es el régimen general de importación formal, donde el flete sí integra el valor CIF sobre el que se calcula el IVA.',
  },
  {
    q: '¿Qué productos no pagan IVA al importar?',
    a: 'Los libros, diarios y revistas están exentos de IVA. Los medicamentos pagan la tasa mínima del 10% (y requieren autorización del MSP). El resto de los bienes paga el IVA general del 22%. En el régimen courier, además, los envíos desde EE.UU. de hasta US$ 200 quedan exonerados de IVA por el acuerdo TIFA, cualquiera sea el producto.',
  },
  {
    q: '¿Qué productos requieren trámites adicionales para importar?',
    a: 'Los celulares y equipos que emiten radiofrecuencia (también routers, drones y GPS) requieren homologación de URSEC, que se gestiona en la VUCE. Los medicamentos, suplementos, cosméticos y productos médicos pasan por el Ministerio de Salud Pública (MSP). Las semillas, plantas, fertilizantes y alimentos requieren autorización del MGAP. Las armas y réplicas (airsoft) se tramitan ante el Servicio de Material y Armamento del Ejército.',
  },
  {
    q: '¿Qué productos están prohibidos por courier?',
    a: 'No pueden importarse por encomiendas postales: vaporizadores y cigarrillos electrónicos, pirotecnia y explosivos, líquidos inflamables, baterías sueltas y power banks (restricción aérea), dinero en efectivo, sustancias controladas y pornografía. Bebidas alcohólicas, tabaco, perfumería y vehículos pagan IMESI y solo ingresan por importación formal (régimen general), no como envío personal.',
  },
  {
    q: '¿Las tarifas de courier por peso son oficiales?',
    a: 'No. Son valores de referencia (verificados en junio de 2026) para estimar el flete según el peso. Cada courier (Gripper, Envía Mi Compra, Casilla Mía, Punto Mío, etc.) tiene su propia tarifa por kilo y escalas por peso; ajustá el valor por kg al de tu courier o mirá la comparativa de couriers para una estimación más precisa.',
  },
]
</script>

<!-- All layout primitives (seg-toggle, result-grid, tool-info-box,
     breakdown-table…) are shared from ToolShell, namespaced under .tool-page. -->

<style scoped>
/* Prohibited / not-allowed product: the estimate stays visible but dimmed so it
   reads as informational, not actionable. */
.result-blocked {
  opacity: 0.55;
  filter: grayscale(0.4);
}
</style>
