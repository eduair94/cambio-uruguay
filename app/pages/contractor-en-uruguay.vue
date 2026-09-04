<template>
  <VContainer class="contractor-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">TRABAJO</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Contractor en Uruguay: la cuenta contra un sueldo, y qué pasa con tu jubilación
      </h1>
      <p class="lead mb-6">
        Dos preguntas que se repiten y casi nunca se responden con números: cuánto tenés que
        facturar para que te convenga contra una oferta en relación de dependencia, y si vas a
        terminar sin jubilación. La segunda tiene una respuesta que casi todos dan al revés.
      </p>

      <VCard class="myth-card pa-5 pa-md-6" variant="flat">
        <div class="text-overline mb-2">El malentendido</div>
        <p class="mb-2">
          «Como contractor aportás sobre una ficta bajita por más que factures, así que te vas a
          jubilar con nada.»
        </p>
        <p class="mb-0"><strong>No es así.</strong> {{ CONTRACTOR_BASE_RULE }}</p>
      </VCard>
    </header>

    <!-- Calculator -->
    <section id="la-cuenta" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">¿Cuánto tenés que facturar para empatar?</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Un dependiente cobra <strong>trece sueldos al año</strong> contando el aguinaldo. Facturar
        exactamente el nominal ya te deja abajo, y eso es <em>antes</em> de impuestos.
      </p>

      <VRow>
        <VCol cols="12" md="5">
          <VCard variant="flat" class="form-card pa-5">
            <VTextField
              v-model.number="form.employeeNominal"
              type="number"
              label="Sueldo nominal de la oferta"
              prefix="$"
              min="0"
              density="comfortable"
              variant="outlined"
              hint="El nominal mensual, no el líquido."
              persistent-hint
              class="mb-4"
            />
            <VTextField
              v-model.number="form.monthlyBilling"
              type="number"
              label="Lo que facturarías por mes"
              prefix="$"
              min="0"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCard>
        </VCol>
        <VCol cols="12" md="7">
          <VCard
            variant="flat"
            class="verdict-card pa-5 mb-4"
            :class="{ 'is-win': result.annualGap > 0 }"
          >
            <div class="text-overline mb-2">El piso de la negociación</div>
            <p class="text-h6 font-weight-bold mb-2">
              Necesitás facturar {{ formatUYU(result.breakEvenBilling) }} por mes sólo para empatar.
            </p>
            <p class="mb-0 text-medium-emphasis">
              <template v-if="result.annualGap > 0">
                Con lo que pusiste facturás {{ formatUYU(result.annualGap) }} más al año que el
                sueldo. Ese excedente es lo que tiene que cubrir todo lo de abajo.
              </template>
              <template v-else-if="result.annualGap < 0">
                Con lo que pusiste estás {{ formatUYU(Math.abs(result.annualGap)) }} por debajo del
                sueldo al año, antes de impuestos y sin nada de lo de abajo.
              </template>
              <template v-else> Con lo que pusiste, empatás justo. </template>
            </p>
          </VCard>

          <VCard variant="flat" class="results-card pa-0">
            <VTable class="cu-mobile-cards" density="comfortable">
              <tbody>
                <tr>
                  <td data-label="Concepto">Facturación al año (12 meses)</td>
                  <td data-label="Importe" class="text-right">
                    {{ formatUYU(result.contractorAnnual) }}
                  </td>
                </tr>
                <tr>
                  <td data-label="Concepto">
                    Sueldo al año ({{ CONTRACTOR_EMPLOYEE_MONTHS_PER_YEAR }} con aguinaldo)
                  </td>
                  <td data-label="Importe" class="text-right">
                    {{ formatUYU(result.employeeAnnual) }}
                  </td>
                </tr>
                <tr>
                  <td data-label="Concepto">Tu facturación, en sueldos equivalentes</td>
                  <td data-label="Importe" class="text-right">
                    {{ result.contractorMonthsEquivalent }}
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
          <p class="text-caption text-medium-emphasis mt-2 mb-0">
            Esta cuenta pone los dos lados en la misma unidad y nada más: no estima impuestos ni
            aportes, que dependen del régimen que elijas. Para eso están las calculadoras del sitio.
          </p>
        </VCol>
      </VRow>
    </section>

    <!-- Lost benefits -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que no viene con la facturación</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        No es un argumento en contra —muchas veces la tarifa compensa de sobra— pero es lo que hay
        que sumarle al sueldo del otro lado para comparar en serio.
      </p>
      <VRow>
        <VCol v-for="b in CONTRACTOR_LOST_BENEFITS" :key="b.label" cols="12" md="6">
          <VCard variant="flat" class="lost-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ b.label }}</h3>
            <p class="mb-2 text-medium-emphasis">{{ b.detail }}</p>
            <VBtn v-if="b.to" :to="localePath(b.to)" variant="tonal" size="x-small">
              Ver el detalle
            </VBtn>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Jubilación -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">La jubilación del contractor</h2>
      <VCard variant="flat" class="highlight-card pa-5 pa-md-6 mb-4">
        <p class="mb-3">{{ CONTRACTOR_BASE_RULE }}</p>
        <div class="rates">
          <div class="rate">
            <div class="rate-n">{{ CONTRACTOR_APORTE_PERSONAL_PCT }} %</div>
            <div class="rate-l">Aporte personal (montepío)</div>
          </div>
          <div class="rate">
            <div class="rate-n">{{ CONTRACTOR_APORTE_PATRONAL_PCT }} %</div>
            <div class="rate-l">Aporte patronal — como contractor lo ponés vos</div>
          </div>
          <div class="rate">
            <div class="rate-n">{{ CONTRACTOR_FICTA_MIN_BFC_SIN_EMPLEADOS }} BFC</div>
            <div class="rate-l">Piso de la ficta, sin empleados</div>
          </div>
        </div>
      </VCard>
      <VAlert type="info" variant="tonal" density="comfortable">
        {{ CONTRACTOR_JUBILACION_TAKEAWAY }}
      </VAlert>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in CONTRACTOR_FAQ" :key="f.question">
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
      <h2 class="text-h6 font-weight-bold mb-3">El lado tributario y las herramientas</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          :to="localePath('/guias/trabajar-para-el-exterior-desde-uruguay')"
          variant="tonal"
          size="small"
        >
          Trabajar para el exterior
        </VBtn>
        <VBtn :to="localePath('/que-empresa-abrir-uruguay')" variant="tonal" size="small">
          Qué empresa abrir
        </VBtn>
        <VBtn
          :to="localePath('/herramientas/calculadora-sueldo-liquido')"
          variant="tonal"
          size="small"
        >
          Calculadora de sueldo líquido
        </VBtn>
        <VBtn :to="localePath('/cobrar-en-dolares-gastar-en-pesos')" variant="tonal" size="small">
          Cobrás en dólares y gastás en pesos
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Contrastado el {{ verifiedAt }}. Informativo: tu caso concreto depende del régimen y
        conviene verlo con un contador.
      </p>
      <ul class="sources-list">
        <li v-for="s in CONTRACTOR_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { formatUYU } from '~/utils/format'
import {
  CONTRACTOR_APORTE_PATRONAL_PCT,
  CONTRACTOR_APORTE_PERSONAL_PCT,
  CONTRACTOR_BASE_RULE,
  CONTRACTOR_FAQ,
  CONTRACTOR_FICTA_MIN_BFC_SIN_EMPLEADOS,
  CONTRACTOR_JUBILACION_TAKEAWAY,
  CONTRACTOR_SOURCES,
  CONTRACTOR_VERIFIED_AT,
  CONTRACTOR_EMPLOYEE_MONTHS_PER_YEAR,
  CONTRACTOR_LOST_BENEFITS,
  compareContractorVsEmployee,
} from '~/utils/contractorUruguay'

const localePath = useLocalePath()

const form = reactive({ employeeNominal: 120000, monthlyBilling: 140000 })

/** Un campo vacío es NaN, no 0. */
const result = computed(() =>
  compareContractorVsEmployee({
    employeeNominal: Number.isFinite(form.employeeNominal) ? form.employeeNominal : 0,
    monthlyBilling: Number.isFinite(form.monthlyBilling) ? form.monthlyBilling : 0,
  })
)

const verifiedAt = new Date(CONTRACTOR_VERIFIED_AT).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/contractor-en-uruguay'
const title = 'Contractor en Uruguay: cuánto facturar'
const description =
  'La cuenta que casi nadie hace: un dependiente cobra trece sueldos al año con el aguinaldo, así que facturar el nominal ya te deja abajo. Más lo que no viene con la facturación (licencia, salario vacacional, despido, seguro de paro) y la verdad sobre la jubilación del contractor: la ficta es un piso, no un techo — se aporta sobre el mayor entre la ficta, los ingresos reales y el mayor sueldo pagado.'

defineOgImageComponent('Cambio', {
  title: 'Contractor o empleado',
  subtitle: 'La cuenta real y la jubilación',
  tag: 'TRABAJO',
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
        'contractor uruguay, contractor o empleado, cuanto facturar para igualar un sueldo, jubilacion contractor uruguay, aporte jubilatorio unipersonal, base ficta de contribucion, 11 bfc unipersonal, facturar al exterior uruguay, charruadevs sueldos',
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
                name: 'Contractor en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: CONTRACTOR_FAQ.map(f => ({
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
.contractor-page {
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

.myth-card,
.form-card,
.verdict-card,
.results-card,
.lost-card,
.highlight-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
}
.v-theme--light .myth-card,
.v-theme--light .form-card,
.v-theme--light .verdict-card,
.v-theme--light .results-card,
.v-theme--light .lost-card,
.v-theme--light .highlight-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.myth-card {
  border-color: rgba(var(--v-theme-warning), 0.5);
}
.verdict-card.is-win {
  border-color: rgba(var(--v-theme-success), 0.55);
}
.highlight-card {
  border-color: rgba(var(--v-theme-primary), 0.45);
}

.rates {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1.25rem;
}
.rate-n {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: rgb(var(--v-theme-primary));
  font-variant-numeric: tabular-nums;
}
.rate-l {
  font-size: 0.82rem;
  opacity: 0.75;
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.8;
}
</style>
