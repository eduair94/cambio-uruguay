<template>
  <VContainer class="bvr-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">VIVIENDA</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        ¿Comprar con crédito hipotecario o seguir alquilando?
      </h1>
      <p class="lead mb-6">
        La comparación casera casi siempre es «cuota contra alquiler», y por eso casi siempre da que
        comprar gana. Faltan tres cosas:
        <strong>la cuota no es el costo de comprar</strong>, el anticipo
        <strong>tiene costo de oportunidad</strong> y la escrituración
        <strong>se reparte entre los años que te quedes</strong>. Acá está la cuenta con las tres
        adentro.
      </p>

      <VCard class="honest-card pa-5 pa-md-6" variant="flat">
        <div class="text-overline mb-2">Qué no vas a encontrar acá</div>
        <p class="mb-0">{{ MODEL_LIMITS }}</p>
      </VCard>
    </header>

    <!-- Calculator -->
    <section id="comparador" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El comparador</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Poné tus números. Los importes van todos en la misma moneda: si el precio lo pensás en
        dólares, el alquiler y los gastos también.
      </p>

      <VRow>
        <VCol cols="12" md="5">
          <VCard variant="flat" class="form-card pa-5">
            <div class="text-overline mb-3">La compra</div>
            <VTextField
              v-model.number="form.price"
              type="number"
              label="Precio de la propiedad"
              min="0"
              density="comfortable"
              variant="outlined"
              class="mb-3"
              hide-details
            />
            <VTextField
              v-model.number="form.downPayment"
              type="number"
              label="Anticipo que ponés vos"
              min="0"
              density="comfortable"
              variant="outlined"
              class="mb-3"
              hide-details
            />
            <VRow dense class="mb-3">
              <VCol cols="6">
                <VTextField
                  v-model.number="form.annualRatePct"
                  type="number"
                  label="Tasa anual"
                  suffix="%"
                  min="0"
                  step="0.1"
                  density="comfortable"
                  variant="outlined"
                  hide-details
                />
              </VCol>
              <VCol cols="6">
                <VTextField
                  v-model.number="form.years"
                  type="number"
                  label="Plazo"
                  suffix="años"
                  min="0"
                  density="comfortable"
                  variant="outlined"
                  hide-details
                />
              </VCol>
            </VRow>
            <VTextField
              v-model.number="form.closingCosts"
              type="number"
              label="Gastos de escrituración"
              min="0"
              density="comfortable"
              variant="outlined"
              class="mb-6"
              hide-details
            />

            <div class="text-overline mb-3">Lo que se paga todos los meses</div>
            <VRow dense class="mb-3">
              <VCol cols="6">
                <VTextField
                  v-model.number="form.monthlyTaxes"
                  type="number"
                  label="Contribución"
                  min="0"
                  density="comfortable"
                  variant="outlined"
                  hide-details
                />
              </VCol>
              <VCol cols="6">
                <VTextField
                  v-model.number="form.monthlyCommonFees"
                  type="number"
                  label="Gastos comunes"
                  min="0"
                  density="comfortable"
                  variant="outlined"
                  hide-details
                />
              </VCol>
            </VRow>
            <VTextField
              v-model.number="form.monthlyMaintenance"
              type="number"
              label="Mantenimiento por mes"
              min="0"
              density="comfortable"
              variant="outlined"
              class="mb-6"
              hide-details
            />

            <div class="text-overline mb-3">La alternativa</div>
            <VTextField
              v-model.number="form.monthlyRent"
              type="number"
              label="Alquiler del equivalente"
              min="0"
              density="comfortable"
              variant="outlined"
              class="mb-3"
              hide-details
            />
            <VTextField
              v-model.number="form.altReturnPct"
              type="number"
              label="Rendimiento anual neto del anticipo"
              suffix="%"
              min="0"
              step="0.1"
              density="comfortable"
              variant="outlined"
              hide-details
              hint="Lo que ganarías con esa plata si no la usaras para comprar."
              persistent-hint
            />
          </VCard>
        </VCol>

        <VCol cols="12" md="7">
          <VCard variant="flat" class="verdict-card pa-5 pa-md-6 mb-4">
            <div class="text-overline mb-2">Costo mensual de cada opción</div>
            <div class="cost-grid mb-4">
              <div>
                <div class="text-caption text-medium-emphasis mb-1">Comprar</div>
                <p class="big-n mb-0">{{ money(r.buyMonthlyCost) }}</p>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis mb-1">Alquilar</div>
                <p class="big-n mb-0">{{ money(r.rentMonthlyCost) }}</p>
              </div>
            </div>

            <VAlert
              :type="r.monthlyGap > 0 ? 'warning' : 'success'"
              variant="tonal"
              density="comfortable"
              class="mb-4"
            >
              <template v-if="r.monthlyGap > 0">
                Con estos números,
                <strong>comprar te sale {{ money(r.monthlyGap) }} más caro por mes</strong>. No hay
                plazo que amortice la escrituración por esta vía: si igual querés comprar, que sea
                por otras razones y no por el costo mensual.
              </template>
              <template v-else-if="r.monthlyGap < 0">
                Con estos números,
                <strong>comprar te sale {{ money(-r.monthlyGap) }} más barato por mes</strong>.
                <template v-if="r.yearsToCoverClosing !== null">
                  Esa ventaja cubre los gastos de escrituración en
                  <strong>{{ r.yearsToCoverClosing }} años</strong>: si te vas antes, la compra no
                  llegó a pagarse.
                </template>
              </template>
              <template v-else>
                Con estos números las dos opciones cuestan lo mismo por mes.
              </template>
            </VAlert>

            <VTable density="compact" class="detail-table">
              <tbody>
                <tr>
                  <td>Monto financiado</td>
                  <td class="text-right">{{ money(r.loan) }}</td>
                </tr>
                <tr>
                  <td>Cuota del crédito</td>
                  <td class="text-right">{{ money(r.monthlyPayment) }}</td>
                </tr>
                <tr>
                  <td>Interés en la primera cuota</td>
                  <td class="text-right">{{ r.firstPaymentInterestPct }} %</td>
                </tr>
                <tr>
                  <td>Costo de oportunidad del anticipo</td>
                  <td class="text-right">{{ money(r.opportunityCost) }}</td>
                </tr>
                <tr>
                  <td>Contribución, comunes y mantenimiento</td>
                  <td class="text-right">{{ money(otherMonthly) }}</td>
                </tr>
              </tbody>
            </VTable>
          </VCard>

          <VCard variant="flat" class="plain-card pa-5">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Por qué la deuda parece no bajar</h3>
            <p class="mb-0 text-medium-emphasis">
              De la primera cuota,
              <strong>{{ r.firstPaymentInterestPct }} % se va en intereses</strong> y el resto
              amortiza capital. En el sistema francés esa proporción se va dando vuelta con los
              años, pero al principio la sensación de pagar y que el saldo no se mueva no es una
              impresión: es cómo funciona la tabla.
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Forgotten costs -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Los cuatro costos que la cuenta casera olvida</h2>
      <VRow>
        <VCol v-for="f in FORGOTTEN_COSTS" :key="f.title" cols="12" md="6">
          <VCard variant="flat" class="plain-card pa-5 h-100">
            <VIcon :icon="f.icon" color="primary" class="mb-2" />
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ f.title }}</h3>
            <p class="mb-0 text-medium-emphasis">{{ f.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in BUY_VS_RENT_FAQ" :key="f.question">
          <VExpansionPanelTitle>
            <div>
              <div class="font-weight-medium">{{ f.question }}</div>
              <div class="text-caption text-medium-emphasis">{{ f.short }}</div>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>{{ f.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Related -->
    <section class="mb-12">
      <h2 class="text-h6 font-weight-bold mb-3">Seguir por acá</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn :to="localePath('/guias/credito-hipotecario-uruguay')" variant="tonal" size="small">
          Crédito hipotecario
        </VBtn>
        <VBtn :to="localePath('/guias/bhu-como-funciona')" variant="tonal" size="small">
          Cómo funciona el BHU
        </VBtn>
        <VBtn
          :to="localePath('/guias/comprar-primera-vivienda-uruguay')"
          variant="tonal"
          size="small"
        >
          Comprar la primera vivienda
        </VBtn>
        <VBtn
          :to="localePath('/guias/costos-de-escrituracion-uruguay')"
          variant="tonal"
          size="small"
        >
          Costos de escrituración
        </VBtn>
        <VBtn :to="localePath('/por-que-no-baja-el-alquiler-uruguay')" variant="tonal" size="small">
          Por qué no baja el alquiler
        </VBtn>
        <VBtn :to="localePath('/alquilar-en-uruguay')" variant="tonal" size="small">
          Alquilar en Uruguay
        </VBtn>
      </div>
    </section>

    <!-- Method -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Cómo está hecha la cuenta</h2>
      <p class="text-body-2 text-medium-emphasis mb-0" style="max-width: 76ch">
        La cuota se calcula por sistema francés sobre el monto financiado. Al costo de comprar se le
        suman contribución, gastos comunes, mantenimiento y el costo de oportunidad del anticipo al
        rendimiento que vos indiques. La escrituración no entra en el costo mensual: se amortiza con
        la ventaja mensual, y de ahí sale en cuántos años se cubre. Modelo revisado el
        {{ verifiedAt }}. Ninguna cifra la pone el sitio: todas las ponés vos.
      </p>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  BUY_VS_RENT_FAQ,
  BUY_VS_RENT_VERIFIED_AT,
  FORGOTTEN_COSTS,
  MODEL_LIMITS,
  compareBuyVsRent,
  type BuyVsRentInput,
} from '~/utils/buyVsRent'

const localePath = useLocalePath()

const form = reactive<BuyVsRentInput>({
  price: 150000,
  downPayment: 30000,
  annualRatePct: 6,
  years: 20,
  monthlyRent: 800,
  monthlyTaxes: 60,
  monthlyCommonFees: 90,
  monthlyMaintenance: 50,
  altReturnPct: 4,
  closingCosts: 9000,
})

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

const r = computed(() =>
  compareBuyVsRent({
    price: num(form.price),
    downPayment: num(form.downPayment),
    annualRatePct: num(form.annualRatePct),
    years: num(form.years),
    monthlyRent: num(form.monthlyRent),
    monthlyTaxes: num(form.monthlyTaxes),
    monthlyCommonFees: num(form.monthlyCommonFees),
    monthlyMaintenance: num(form.monthlyMaintenance),
    altReturnPct: num(form.altReturnPct),
    closingCosts: num(form.closingCosts),
  })
)

const otherMonthly = computed(
  () => num(form.monthlyTaxes) + num(form.monthlyCommonFees) + num(form.monthlyMaintenance)
)

const money = (n: number): string =>
  n.toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const verifiedAt = new Date(BUY_VS_RENT_VERIFIED_AT).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/comprar-o-alquilar-uruguay'
const title = 'Comprar o alquilar en Uruguay: la cuenta completa'
const description =
  'Comparar la cuota contra el alquiler siempre da que comprar gana, porque deja tres costos afuera: contribución y gastos comunes, el costo de oportunidad del anticipo y la escrituración repartida entre los años que te quedes. Comparador con las tres adentro, sin proyectar apreciación inventada.'

defineOgImageComponent('Cambio', {
  title: 'Comprar o alquilar',
  subtitle: 'La cuota no es el costo de comprar',
  tag: 'VIVIENDA',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'comprar o alquilar uruguay, conviene comprar con credito hipotecario, cuota vs alquiler, calculadora hipotecario uruguay, costo de oportunidad anticipo, gastos de escrituracion, sistema frances primera cuota interes, bhu conviene',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Comprar o alquilar',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: BUY_VS_RENT_FAQ.map(f => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.bvr-page {
  max-width: 1180px;
}
.lead {
  font-size: 1.075rem;
  line-height: 1.65;
  max-width: 72ch;
  color: rgba(255, 255, 255, 0.82);
}
.v-theme--light .lead {
  color: rgba(0, 0, 0, 0.76);
}

.honest-card,
.form-card,
.verdict-card,
.plain-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
}
.v-theme--light .honest-card,
.v-theme--light .form-card,
.v-theme--light .verdict-card,
.v-theme--light .plain-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.verdict-card {
  border-color: rgba(var(--v-theme-primary), 0.45);
}

.cost-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}
.big-n {
  font-size: 1.9rem;
  font-weight: 700;
  line-height: 1.15;
  color: rgb(var(--v-theme-primary));
  font-variant-numeric: tabular-nums;
}

.detail-table :deep(td) {
  font-size: 0.875rem;
}
.detail-table :deep(td.text-right) {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
