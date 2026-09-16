<template>
  <VContainer class="pension-vejez-page py-6" style="max-width: 900px">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Pensión a la vejez del BPS', disabled: true },
      ]"
    />

    <div class="text-overline text-medium-emphasis mb-2">BPS · Prestación no contributiva</div>
    <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
      Pensión a la vejez del BPS: requisitos y monto
    </h1>

    <p class="text-body-1 mb-6" style="max-width: 68ch">
      Es una prestación no contributiva del BPS para personas mayores que no tienen jubilación ni
      recursos suficientes para vivir. Acá están los requisitos que publica el BPS; la carencia de
      recursos la evalúa el BPS caso por caso, con toda la documentación, no una cuenta que se pueda
      reproducir sola.
    </p>

    <!-- Monto -->
    <VCard variant="flat" class="amount-card pa-5 mb-6">
      <div class="text-overline mb-1">Monto 2026</div>
      <p class="text-h4 font-weight-bold mb-1">{{ formatUYU(AMOUNT_2026, 0) }} por mes</p>
      <p class="text-body-2 text-medium-emphasis mb-0">
        Según la tabla de montos y aumentos de pasividades del BPS, actualizada al
        {{ amountUpdatedAt }}, con el ajuste general de pasividades de
        {{ formatNumber(ADJUSTMENT_2026_PCT) }} % para 2026.
      </p>
    </VCard>

    <!-- ¿Te corresponde? -->
    <h2 class="text-h6 font-weight-bold mb-2">¿Te corresponde por vejez?</h2>
    <p class="text-body-2 text-medium-emphasis mb-2" style="max-width: 68ch">
      Estos son los requisitos de la vía por <strong>vejez</strong>. Si lo tuyo es una incapacidad,
      la vía es otra y <a href="#invalidez" class="cu-link">no tiene edad mínima</a>.
    </p>
    <ul class="plain-list mb-2">
      <li>
        Tener más de {{ AGE_REQUIREMENT.base }} años, o más de {{ AGE_REQUIREMENT.caregiverFrom }}
        con la excepción por cuidados.
      </li>
      <li>Cumplir la regla de residencia en el país.</li>
      <li>No configurar causal jubilatoria en ningún organismo previsional.</li>
      <li>Cumplir la carencia de recursos que evalúa el BPS.</li>
    </ul>
    <VAlert type="info" variant="tonal" density="comfortable" class="mb-3">
      {{ CAREGIVER_DETAIL }}
    </VAlert>
    <VAlert type="info" variant="tonal" density="comfortable" class="mb-6">
      {{ RESIDENCY_RULE }}
    </VAlert>

    <!-- Qué mira el BPS de tus ingresos -->
    <h2 class="text-h6 font-weight-bold mb-2">Qué mira el BPS de tus ingresos</h2>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      Esto no es una calculadora: son las tres reglas de carencia de recursos que el BPS publica
      para la vía por vejez. El BPS decide con la declaración jurada y la documentación de cada
      caso, no con esta página.
    </p>
    <VRow class="mb-3">
      <VCol v-for="rule in MEANS_TEST" :key="rule.id" cols="12" md="4">
        <VCard variant="flat" class="rule-card pa-4 h-100">
          <div class="text-subtitle-1 font-weight-bold mb-1">{{ rule.title }}</div>
          <p class="text-body-2 text-medium-emphasis mb-0">{{ rule.detail }}</p>
        </VCard>
      </VCol>
    </VRow>
    <VAlert type="warning" variant="tonal" density="comfortable" class="mb-6">
      {{ INCOMPATIBILITIES }}
    </VAlert>

    <!-- Pensión por invalidez: la otra vía -->
    <h2 id="invalidez" class="text-h6 font-weight-bold mb-2">
      La otra vía: {{ INVALIDITY_NAME.toLowerCase() }}
    </h2>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      El BPS liquida las dos prestaciones en una sola fila —"Pensión vejez e invalidez",
      {{ formatUYU(INVALIDITY_AMOUNT_2026, 0) }} por mes— y por eso se las confunde. Pero son dos
      prestaciones distintas, con su propia ficha, y los requisitos no son los mismos.
    </p>
    <VAlert type="success" variant="tonal" density="comfortable" class="mb-3">
      {{ INVALIDITY_AGE_RULE }}
    </VAlert>
    <VRow class="mb-3">
      <VCol v-for="route in INVALIDITY_ROUTES" :key="route.id" cols="12" md="6">
        <VCard variant="flat" class="rule-card pa-4 h-100">
          <div class="text-subtitle-1 font-weight-bold mb-1">{{ route.title }}</div>
          <p class="text-body-2 text-medium-emphasis mb-0">{{ route.detail }}</p>
        </VCard>
      </VCol>
    </VRow>
    <ul class="plain-list mb-2">
      <li>
        <strong>Monto:</strong> {{ formatUYU(INVALIDITY_AMOUNT_2026, 0) }} por mes, el mismo que la
        pensión a la vejez.
      </li>
      <li><strong>Quién decide:</strong> {{ INVALIDITY_EVALUATION }}</li>
      <li><strong>Residencia:</strong> {{ INVALIDITY_RESIDENCY_RULE }}</li>
      <li><strong>Ingresos:</strong> {{ INVALIDITY_MEANS_TEST }}</li>
      <li>{{ INVALIDITY_LAPSE_RULE }}</li>
    </ul>
    <p class="text-body-2 text-medium-emphasis mb-6" style="max-width: 68ch">
      Lo que no está acá —cómo trabaja la evaluación médica por dentro, si la prestación es
      vitalicia— el BPS no lo publica en esa ficha, así que no lo afirmamos:
      <a :href="INVALIDITY_URL" target="_blank" rel="noopener" class="cu-link">
        la ficha de la pensión por invalidez del BPS
      </a>
      y el
      <a :href="INVALIDITY_EVALUATION_URL" target="_blank" rel="noopener" class="cu-link">
        trámite de evaluación de incapacidad
      </a>
      son la fuente.
    </p>

    <!-- No la confundas con... -->
    <h2 class="text-h6 font-weight-bold mb-2">No la confundas con…</h2>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      Es la confusión más común del tema: la pensión a la vejez del BPS, la asistencia a la vejez
      del MIDES y la jubilación son tres prestaciones distintas, con distinto organismo y distintos
      requisitos.
    </p>
    <div class="table-wrap mb-6">
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th scope="col">Prestación</th>
            <th scope="col">A cargo de</th>
            <th scope="col">A quién le corresponde</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in VS_OTHERS" :key="row.id">
            <td data-label="Prestación" class="font-weight-medium">{{ row.name }}</td>
            <td data-label="A cargo de">{{ row.managedBy }}</td>
            <td data-label="A quién le corresponde">{{ row.who }}</td>
          </tr>
        </tbody>
      </VTable>
    </div>

    <!-- Cómo se pide -->
    <h2 class="text-h6 font-weight-bold mb-2">Cómo se pide</h2>
    <p class="text-body-2 text-medium-emphasis mb-2" style="max-width: 68ch">
      El trámite se inicia en el BPS, que evalúa la edad, la residencia y la carencia de recursos
      con la documentación de cada caso.
    </p>
    <p class="mb-2">
      <a :href="APPLY_URL" target="_blank" rel="noopener" class="cu-link">
        Ir al trámite en bps.gub.uy
      </a>
    </p>
    <VAlert type="error" variant="tonal" density="comfortable" class="mb-6">
      {{ LAPSE_RULE }}
    </VAlert>

    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

    <h2 class="text-h6 font-weight-bold mt-8 mb-2">De dónde sale esto</h2>
    <p class="text-body-2 text-medium-emphasis mb-2" style="max-width: 68ch">
      Contrastado contra el BPS. Última lectura: {{ verifiedAt }}.
    </p>
    <ul class="sources mb-6">
      <li v-for="src in PENSION_SOURCES" :key="src.url">
        <a :href="src.url" target="_blank" rel="noopener" class="cu-link">{{ src.label }}</a>
      </li>
    </ul>

    <h2 class="text-h6 font-weight-bold mb-2">Seguir leyendo</h2>
    <div class="d-flex flex-wrap ga-3 mb-4">
      <NuxtLink :to="localePath('/suplemento-solidario-bps')" class="cu-link">
        Suplemento solidario del BPS
      </NuxtLink>
      <NuxtLink :to="localePath('/cuando-me-puedo-jubilar-uruguay')" class="cu-link">
        Cuándo me puedo jubilar
      </NuxtLink>
      <NuxtLink :to="localePath('/asignacion-familiar-uruguay')" class="cu-link">
        Asignación familiar
      </NuxtLink>
      <NuxtLink :to="localePath('/devolucion-fonasa-uruguay')" class="cu-link">
        Devolución de FONASA
      </NuxtLink>
      <NuxtLink :to="localePath('/plan-de-vida-uruguay')" class="cu-link">
        Plan de vida por ingreso
      </NuxtLink>
    </div>
  </VContainer>
</template>

<script setup lang="ts">
import { formatNumber, formatUYU } from '~/utils/format'
import type { FaqItem } from '~/utils/faqAnswers'
import {
  ADJUSTMENT_2026_PCT,
  AGE_REQUIREMENT,
  AMOUNT_2026,
  AMOUNT_UPDATED_AT,
  APPLY_URL,
  CAREGIVER_DETAIL,
  INCOMPATIBILITIES,
  INVALIDITY_AGE_RULE,
  INVALIDITY_AMOUNT_2026,
  INVALIDITY_EVALUATION,
  INVALIDITY_EVALUATION_URL,
  INVALIDITY_LAPSE_RULE,
  INVALIDITY_MEANS_TEST,
  INVALIDITY_NAME,
  INVALIDITY_RESIDENCY_RULE,
  INVALIDITY_ROUTES,
  INVALIDITY_URL,
  LAPSE_RULE,
  MEANS_TEST,
  PENSION_FAQ,
  PENSION_SOURCES,
  PENSION_VERIFIED_AT,
  RESIDENCY_RULE,
  VS_OTHERS,
} from '~/utils/pensionVejez'

const localePath = useLocalePath()

const faq = PENSION_FAQ as FaqItem[]

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedAt = longDate(PENSION_VERIFIED_AT)
const amountUpdatedAt = longDate(AMOUNT_UPDATED_AT)

const canonicalUrl = 'https://cambio-uruguay.com/pension-a-la-vejez-uruguay'
const title = 'Pensión a la vejez del BPS: requisitos'
const description = `La pensión a la vejez del BPS paga ${formatUYU(AMOUNT_2026, 0)} por mes a mayores de 70 años (65 con cuidados) sin jubilación y carencia de recursos. Requisitos y monto 2026.`

defineOgImageComponent('Cambio', {
  title: 'Pensión a la vejez del BPS',
  subtitle: `Monto 2026: ${formatUYU(AMOUNT_2026, 0)}`,
  tag: 'BPS',
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
        'pension a la vejez, pension vejez bps, pension por invalidez bps, requisitos pension a la vejez, monto pension a la vejez 2026, pension no contributiva uruguay, carencia de recursos bps, asistencia a la vejez mides',
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
                name: 'Inicio',
                item: 'https://cambio-uruguay.com/',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Pensión a la vejez del BPS',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            dateModified: PENSION_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            citation: PENSION_SOURCES.map(s => ({
              '@type': 'WebPage',
              name: s.label,
              url: s.url,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.table-wrap {
  overflow-x: auto;
}
.cu-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.cu-link:hover {
  text-decoration: underline;
}
.sources {
  padding-left: 1.1rem;
  font-size: 0.9rem;
}
.sources li {
  margin-bottom: 4px;
}
.plain-list {
  padding-left: 1.1rem;
  margin: 0 0 16px;
}
.plain-list li {
  margin-bottom: 6px;
}
.amount-card,
.rule-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 1);
}
</style>
