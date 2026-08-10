<template>
  <VContainer class="health-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">SALUD Y PLATA</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Cambiar de mutualista: cuándo te toca y la devolución de FONASA
      </h1>
      <p class="lead mb-6">
        No se puede cambiar cuando uno quiere: hay un mes fijo por año según el
        <strong>último dígito de tu cédula</strong>, y hay que llevar
        <strong>{{ MIN_PERMANENCE_MONTHS }} meses</strong> en el prestador actual. Acá está el
        calendario de BPS, las cuatro excepciones que te dejan cambiar fuera de fecha, y la
        devolución de FONASA que mucha gente aporta y no cobra.
      </p>
    </header>

    <!-- Checker -->
    <section id="cuando-me-toca" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">¿Cuándo te toca?</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        El último dígito de tu cédula es el que va después del guión (el verificador).
      </p>

      <VRow>
        <VCol cols="12" md="5">
          <VCard variant="flat" class="form-card pa-5">
            <VSelect
              v-model.number="digit"
              :items="digitItems"
              label="Último dígito de tu cédula"
              density="comfortable"
              variant="outlined"
              class="mb-4"
            />
            <VTextField
              v-model.number="permanence"
              type="number"
              label="Meses que llevás en tu mutualista actual"
              min="0"
              max="600"
              suffix="meses"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCard>
        </VCol>
        <VCol cols="12" md="7">
          <VCard
            variant="flat"
            class="verdict-card pa-5 h-100 d-flex flex-column justify-center"
            :class="{ 'is-ok': answer.canChange }"
          >
            <div class="text-overline mb-2">Tu situación</div>
            <p class="text-h6 font-weight-bold mb-3">{{ answer.verdict }}</p>
            <p class="mb-0 text-medium-emphasis">{{ CHANGE_EFFECTIVE_RULE }}</p>
          </VCard>
        </VCol>
      </VRow>

      <VCard variant="flat" class="results-card pa-0 mt-5">
        <div class="pa-4 pb-0 text-overline">Calendario completo</div>
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Dígito de cédula</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in calendar" :key="row.month" :class="{ 'is-you': row.digit === digit }">
              <td data-label="Mes" class="text-capitalize">{{ row.monthName }}</td>
              <td data-label="Dígito">
                <VChip
                  size="small"
                  variant="tonal"
                  :color="row.digit === digit ? 'primary' : undefined"
                >
                  {{ row.digit }}
                </VChip>
              </td>
            </tr>
          </tbody>
        </VTable>
        <div class="pa-4 pt-2 text-caption text-medium-emphasis">
          En enero y febrero no hay movilidad regulada.
        </div>
      </VCard>
    </section>

    <!-- Requirements -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Qué te va a pedir BPS</h2>
      <VRow>
        <VCol v-for="r in MOBILITY_REQUIREMENTS" :key="r.label" cols="12" md="6">
          <VCard variant="flat" class="req-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ r.label }}</h3>
            <p class="mb-0 text-medium-emphasis">{{ r.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Exceptions -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Las cuatro salidas fuera de fecha</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Si estás en alguna de estas, no tenés que esperar a tu mes.
      </p>
      <VRow>
        <VCol v-for="e in MOBILITY_EXCEPTIONS" :key="e.title" cols="12" md="6">
          <VCard variant="flat" class="exception-card pa-5 h-100">
            <div class="d-flex align-start mb-2">
              <VIcon :icon="e.icon" color="primary" class="mr-3 mt-1" />
              <div>
                <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ e.title }}</h3>
                <VChip size="x-small" variant="tonal" color="info">{{ e.when }}</VChip>
              </div>
            </div>
            <p class="mb-0 text-medium-emphasis">{{ e.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Refund -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">La devolución de FONASA</h2>
      <p class="mb-5" style="max-width: 72ch">
        Aportás al FONASA un porcentaje de tu ingreso, pero la cobertura que comprás tiene un costo
        tope anual. <strong>Si aportaste por encima de ese tope, la diferencia vuelve.</strong> Es
        plata propia, no un beneficio.
      </p>
      <VRow class="mb-4">
        <VCol v-for="f in REFUND_FACTS" :key="f.title" cols="12" md="6">
          <VCard variant="flat" class="req-card pa-5 h-100">
            <div class="d-flex align-start">
              <VIcon :icon="f.icon" color="primary" class="mr-3 mt-1" />
              <div>
                <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ f.title }}</h3>
                <p class="mb-0 text-medium-emphasis">{{ f.detail }}</p>
              </div>
            </div>
          </VCard>
        </VCol>
      </VRow>
      <VAlert type="info" variant="tonal" density="comfortable">
        <p class="mb-1">
          <strong>Último ejercicio publicado por BPS ({{ LAST_PUBLISHED_REFUND.year }}):</strong>
          quedaron comprendidos los trabajadores con ingresos promedio mensuales nominales
          superiores a {{ formatUYU(LAST_PUBLISHED_REFUND.workerThreshold) }} y los jubilados o
          pensionistas por encima de {{ formatUYU(LAST_PUBLISHED_REFUND.retireeThreshold) }}. Se
          puso a disposición desde el {{ refundDate }}.
        </p>
        <p class="mb-0">
          Los umbrales cambian todos los años: no te guíes por el número del año pasado. Consultá
          «¿Estoy comprendido?» en bps.gub.uy o llamá al 0800 2016.
        </p>
      </VAlert>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in HEALTH_FAQ" :key="f.question">
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

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Reglas contrastadas el {{ verifiedAt }}. Esta página es informativa: lo que resuelve BPS o
        la JUNASA es lo que vale.
      </p>
      <ul class="sources-list">
        <li v-for="s in HEALTH_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatUYU } from '~/utils/format'
import {
  CHANGE_EFFECTIVE_RULE,
  DIGIT_MONTH,
  HEALTH_FAQ,
  HEALTH_SOURCES,
  HEALTH_VERIFIED_AT,
  LAST_PUBLISHED_REFUND,
  MIN_PERMANENCE_MONTHS,
  MOBILITY_EXCEPTIONS,
  MOBILITY_REQUIREMENTS,
  MONTH_NAMES,
  REFUND_FACTS,
  checkMobility,
} from '~/utils/healthProvider'

const digit = ref(3)
const permanence = ref(24)

const answer = computed(() =>
  checkMobility({
    cedulaDigit: digit.value,
    permanenceMonths: Number.isFinite(permanence.value) ? permanence.value : 0,
  })
)

const digitItems = Object.keys(DIGIT_MONTH)
  .map(Number)
  .sort((a, b) => a - b)

/** El calendario ordenado por mes, que es como lo lee la gente. */
const calendar = Object.entries(DIGIT_MONTH)
  .map(([d, m]) => ({ digit: Number(d), month: m, monthName: MONTH_NAMES[m - 1] }))
  .sort((a, b) => a.month - b.month)

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
const verifiedAt = fmtDate(HEALTH_VERIFIED_AT)
const refundDate = fmtDate(LAST_PUBLISHED_REFUND.availableFrom)

const canonicalUrl = 'https://cambio-uruguay.com/cambiar-de-mutualista-uruguay'
const title = 'Cambiar de mutualista en Uruguay: cuándo te toca según tu cédula'
const description =
  'El calendario de movilidad regulada de BPS mes a mes según el último dígito de la cédula, los 23 meses de permanencia que piden, las cuatro excepciones para cambiar fuera de fecha (afiliación de oficio, mudanza, problemas asistenciales y tiempos de espera del Decreto 359/007), y cómo funciona la devolución de FONASA.'

defineOgImageComponent('Cambio', {
  title: 'Cambiar de mutualista',
  subtitle: 'Calendario por dígito de cédula + devolución FONASA',
  tag: 'SALUD Y PLATA',
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
        'cambiar de mutualista uruguay, corralito mutual, movilidad regulada bps, cambio de prestador de salud, calendario digito cedula mutualista, 23 meses permanencia mutualista, devolucion fonasa, estoy comprendido fonasa, junasa cambio de prestador, decreto 359/007 tiempos de espera',
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
                name: 'Cambiar de mutualista',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: HEALTH_FAQ.map(f => ({
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
.health-page {
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

.form-card,
.verdict-card,
.results-card,
.req-card,
.exception-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
}
.v-theme--light .form-card,
.v-theme--light .verdict-card,
.v-theme--light .results-card,
.v-theme--light .req-card,
.v-theme--light .exception-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.verdict-card.is-ok {
  border-color: rgba(var(--v-theme-success), 0.55);
}

.results-card :deep(tr.is-you) {
  background: rgba(var(--v-theme-primary), 0.09);
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.8;
}
</style>
