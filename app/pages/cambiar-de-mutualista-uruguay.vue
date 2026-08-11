<template>
  <VContainer class="health-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">SALUD Y PLATA</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Cambiar de mutualista: cuándo te toca y la devolución de FONASA
      </h1>
      <p class="lead mb-6">
        Para pasarte a otra mutualista no se puede cambiar cuando uno quiere: hay un mes fijo por
        año según el <strong>último dígito de tu cédula</strong>, y hay que llevar
        <strong>{{ MIN_PERMANENCE_MONTHS }} meses</strong> en el prestador actual. Pero si a donde
        vas es <strong>ASSE o un seguro integral</strong>, ese calendario no te aplica: ese cambio
        se hace en cualquier momento. Acá está el calendario de BPS, las cinco salidas que te dejan
        cambiar fuera de fecha y la devolución de FONASA que mucha gente aporta y no cobra.
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

      <VAlert type="success" variant="tonal" density="comfortable" class="mt-5">
        <p class="mb-2"><strong>Antes de anotar tu mes:</strong> {{ ASSE_ANYTIME_RULE }}</p>
        <p class="mb-0">{{ POST_CHANGE_LOCK_RULE }}</p>
      </VAlert>

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
      <h2 class="text-h5 font-weight-bold mb-2">Las cinco salidas fuera de fecha</h2>
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
      <VCard variant="flat" class="req-card pa-5 mb-4">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">Cómo sale el tope</h3>
        <p class="mb-3">
          El <strong>Costo Promedio Equivalente</strong> es lo que el sistema considera que cuesta
          en promedio cubrir a una persona. El tope anual de tu aporte se arma así:
        </p>
        <p class="formula mb-3">
          $ {{ formatUYU(CPE_MENSUAL) }} × personas que cubrís × 12 meses + 25 % =
          <strong>{{ formatUYU(topeAnualAporte(1)) }}</strong> para una persona sola
        </p>
        <p class="mb-0 text-medium-emphasis">
          Todo lo que aportaste por encima de eso es lo que se devuelve.
        </p>
      </VCard>

      <VAlert type="warning" variant="tonal" density="comfortable" class="mb-4">
        <p class="mb-2">
          <strong>Ojo, esto cambió:</strong> a fines de 2025 se modificó por decreto la forma de
          calcular el CPE, que pasó de {{ formatUYU(CPE_MENSUAL_ANTERIOR) }} a
          {{ formatUYU(CPE_MENSUAL) }}. Como el tope se calcula sobre el CPE, el tope sube y hay que
          haber aportado bastante más para que sobre algo. La estimación oficial es que se pasaría
          de unas {{ formatInt(REFUND_REACH_BEFORE) }} personas alcanzadas a unas
          {{ formatInt(REFUND_REACH_AFTER) }}.
        </p>
        <ul class="mb-0 pl-4">
          <li v-for="t in REFUND_TIMELINE" :key="t.contributionYear">
            <strong>Aportes {{ t.contributionYear }}</strong> (se cobran en {{ t.paidIn }}): régimen
            {{ t.regime }}. {{ t.note }}
          </li>
        </ul>
      </VAlert>

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

    <!-- Cuando se corta el trabajo -->
    <section id="si-se-cae-el-amparo" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        Si se te cae el amparo: renuncia, despido, fin del paro
      </h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Mientras cobrás el seguro de paro seguís cubierto y el aporte sale del propio subsidio. El
        problema empieza el día después: para el generante no hay período de continuidad publicado.
      </p>
      <VRow>
        <VCol v-for="f in COVERAGE_FALLBACKS" :key="f.title" cols="12" md="6">
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

      <VAlert type="warning" variant="tonal" density="comfortable" class="mt-4">
        <p class="mb-2">
          <strong>Ojo con lo que aparece primero en Google:</strong> la extensión de
          {{ EXTENSION_TRES_MESES_2020.months }} meses del FONASA para despedidos
          <strong>no es un derecho vigente</strong>. Es de {{ EXTENSION_TRES_MESES_2020.year }},
          alcanzaba únicamente a {{ EXTENSION_TRES_MESES_2020.window }} y la financió el
          {{ EXTENSION_TRES_MESES_2020.funding }}.
        </p>
        <p class="mb-0">
          Lo que sí rige es la continuidad de los menores de 18 años y de los mayores con
          discapacidad: {{ MINOR_CONTINUITY_MONTHS }} meses contados desde el mes siguiente al del
          cese (Ley 18.731 art. 30), que BPS computa exigiendo
          {{ MINOR_CONTINUITY_MIN_CONTRIB_MONTHS }} meses de aportes dentro de los
          {{ MINOR_CONTINUITY_WINDOW_MONTHS }} anteriores al cese o al fin del subsidio.
        </p>
      </VAlert>
    </section>

    <!-- Urgencia y emergencia -->
    <section id="urgencia-y-emergencia" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        Urgencia y emergencia en un prestador que no es el tuyo
      </h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        No son la misma regla, y la diferencia decide adónde tenés que ir. Ley 19.535 arts. 145 a
        148 y su Decreto reglamentario 211/018.
      </p>
      <VRow>
        <VCol v-for="r in URGENCY_RULES" :key="r.title" cols="12" md="6">
          <VCard variant="flat" class="req-card pa-5 h-100">
            <div class="d-flex align-start">
              <VIcon :icon="r.icon" color="primary" class="mr-3 mt-1" />
              <div>
                <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ r.title }}</h3>
                <p class="mb-0 text-medium-emphasis">{{ r.detail }}</p>
              </div>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Obligatoriedad -->
    <section id="es-obligatorio" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">¿Es obligatorio el FONASA?</h2>
      <VAlert type="info" variant="tonal" density="comfortable" class="mb-5">
        <p class="mb-2">{{ FONASA_MANDATORY_RULE }}</p>
        <p class="mb-0">{{ FONASA_RATE_RULE }}</p>
      </VAlert>
      <p class="text-medium-emphasis mb-4" style="max-width: 72ch">
        Esto es entre lo que podés elegir sin salir del Seguro Nacional de Salud:
      </p>
      <VRow>
        <VCol v-for="p in SNIS_PROVIDER_KINDS" :key="p.label" cols="12" md="4">
          <VCard variant="flat" class="req-card pa-5 h-100">
            <VIcon :icon="p.icon" color="primary" class="mb-2" />
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ p.label }}</h3>
            <p class="mb-0 text-medium-emphasis">{{ p.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
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
        Movilidad regulada y devolución de FONASA, contrastadas el {{ verifiedAt }}. El bloque de
        cese laboral, urgencias y obligatoriedad se contrastó el {{ coverageVerifiedAt }}. Esta
        página es informativa: lo que resuelve BPS o la JUNASA es lo que vale.
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
  ASSE_ANYTIME_RULE,
  CHANGE_EFFECTIVE_RULE,
  COVERAGE_FALLBACKS,
  POST_CHANGE_LOCK_RULE,
  CPE_MENSUAL,
  CPE_MENSUAL_ANTERIOR,
  DIGIT_MONTH,
  EXTENSION_TRES_MESES_2020,
  FONASA_MANDATORY_RULE,
  FONASA_RATE_RULE,
  HEALTH_COVERAGE_VERIFIED_AT,
  MINOR_CONTINUITY_MIN_CONTRIB_MONTHS,
  MINOR_CONTINUITY_MONTHS,
  MINOR_CONTINUITY_WINDOW_MONTHS,
  REFUND_REACH_AFTER,
  REFUND_REACH_BEFORE,
  REFUND_TIMELINE,
  SNIS_PROVIDER_KINDS,
  URGENCY_RULES,
  topeAnualAporte,
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

const formatInt = (n: number) => n.toLocaleString('es-UY')

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
const coverageVerifiedAt = fmtDate(HEALTH_COVERAGE_VERIFIED_AT)
const refundDate = fmtDate(LAST_PUBLISHED_REFUND.availableFrom)

const canonicalUrl = 'https://cambio-uruguay.com/cambiar-de-mutualista-uruguay'
const title = 'Cambiar de mutualista en Uruguay: cuándo te toca según tu cédula'
const description =
  'El calendario de movilidad regulada de BPS mes a mes según el último dígito de la cédula, los 23 meses de permanencia que piden, y las cinco salidas para cambiar fuera de fecha: el cambio hacia ASSE o un seguro integral se puede hacer en cualquier momento (Decreto 344/020 art. 17), y además están la afiliación de oficio, la mudanza a otro departamento, los problemas asistenciales y los tiempos de espera del Decreto 359/007. Más cómo funciona la devolución de FONASA.'

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
        'cambiar de mutualista uruguay, corralito mutual, movilidad regulada bps, cambio de prestador de salud, calendario digito cedula mutualista, 23 meses permanencia mutualista, cambiar a asse en cualquier momento, pasarse a asse sin esperar, decreto 344/020 articulo 17, cambio a seguro integral, devolucion fonasa, estoy comprendido fonasa, junasa cambio de prestador, decreto 359/007 tiempos de espera',
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
  border-radius: 12px;
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

.formula {
  font-size: 1.05rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.8;
}
</style>
