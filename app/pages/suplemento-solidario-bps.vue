<template>
  <VContainer class="suplemento-page py-6" style="max-width: 900px">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Suplemento solidario del BPS', disabled: true },
      ]"
    />

    <div class="text-overline text-medium-emphasis mb-2">BPS · Ley 20.130</div>
    <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
      Suplemento solidario del BPS: quién lo cobra y cuánto
    </h1>

    <p class="text-body-1 mb-6" style="max-width: 68ch">
      Es un complemento para las pasividades bajas del régimen nuevo (Ley 20.130): el BPS paga la
      diferencia entre un valor base de {{ formatUYU(BASE_2026, 0) }} y el {{ DEDUCTION_PCT }} % de
      lo que ya cobrás, junto con la jubilación o pensión.
    </p>

    <!-- Calculadora -->
    <h2 class="text-h6 font-weight-bold mb-2">Calculá tu suplemento estimado</h2>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      Es una estimación: el BPS considera todos tus ingresos, y esta cuenta sólo cubre la jubilación
      o pensión de origen y un otro ingreso declarado.
    </p>
    <VRow class="mb-2">
      <VCol cols="12" md="5">
        <VCard variant="flat" class="calc-card pa-5">
          <VTextField
            v-model.number="pension"
            type="number"
            label="Tu jubilación o pensión"
            min="0"
            prefix="$"
            density="comfortable"
            variant="outlined"
            class="mb-4"
          />
          <VTextField
            v-model.number="otherIncome"
            type="number"
            label="Otros ingresos (opcional)"
            min="0"
            prefix="$"
            density="comfortable"
            variant="outlined"
            class="mb-4"
            hide-details
          />
          <VTextField
            v-model.number="age"
            type="number"
            label="Tu edad"
            min="0"
            max="110"
            density="comfortable"
            variant="outlined"
            class="mt-4"
            hide-details
          />
          <p v-if="!hasAge" class="text-caption text-medium-emphasis mt-2 mb-0">
            Sin edad, asumimos 65 años o más (descuento del {{ DEDUCTION_PCT }} % sobre otros
            ingresos).
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="7">
        <VCard variant="flat" class="result-card pa-5 h-100">
          <div class="text-overline mb-2">Suplemento estimado</div>
          <p class="text-h5 font-weight-bold mb-2">
            <template v-if="result === null">Completá los datos con números válidos.</template>
            <template v-else-if="result > 0">{{ formatUYU(result, 0) }} por mes</template>
            <template v-else>No te correspondería suplemento con estos datos.</template>
          </p>
          <p class="mb-0 text-medium-emphasis text-body-2">
            Estimación conservadora. Al valor base se le descuenta el {{ DEDUCTION_PCT }} % de tu
            pasividad y el {{ DEDUCTION_PCT }} % de todos los otros ingresos que declares si tenés
            65 años o más, o el 100 % si tenés menos. El BPS aplica sobre esos otros ingresos un
            tope que no publica en esa página, así que la cifra real puede ser mayor.
          </p>
        </VCard>
      </VCol>
    </VRow>

    <!-- ¿Te corresponde? -->
    <h2 class="text-h6 font-weight-bold mb-2">¿Te corresponde?</h2>
    <ul class="plain-list mb-2">
      <li v-for="e in ELIGIBLE" :key="e">{{ e }}</li>
    </ul>
    <VAlert type="info" variant="tonal" density="comfortable" class="mb-6">
      {{ RESIDENCY_RULE }}
    </VAlert>

    <!-- Cómo se calcula -->
    <h2 class="text-h6 font-weight-bold mb-2">Cómo se calcula</h2>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      Valor base menos el {{ DEDUCTION_PCT }} % de tus prestaciones previsionales. Estos ejemplos
      salen de la misma fórmula que usa la calculadora, sin otros ingresos.
    </p>
    <div class="table-wrap mb-6">
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th scope="col">Jubilación o pensión</th>
            <th scope="col">Suplemento</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in EXAMPLES" :key="e.pension">
            <td data-label="Jubilación o pensión">{{ formatUYU(e.pension, 0) }}</td>
            <td data-label="Suplemento" class="font-weight-medium">
              {{ e.supplement > 0 ? formatUYU(e.supplement, 0) : 'No corresponde' }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </div>

    <!-- Cómo se pide -->
    <h2 class="text-h6 font-weight-bold mb-4">Cómo se pide</h2>
    <VRow class="mb-6">
      <VCol v-for="(s, i) in APPLY_STEPS" :key="s.title" cols="12" md="4">
        <VCard variant="flat" class="step-card pa-4 h-100">
          <div class="step-n">{{ i + 1 }}</div>
          <div class="text-subtitle-1 font-weight-bold mb-1">{{ s.title }}</div>
          <p class="text-body-2 text-medium-emphasis mb-0">{{ s.detail }}</p>
        </VCard>
      </VCol>
    </VRow>

    <!-- Referencias 2026 -->
    <h2 class="text-h6 font-weight-bold mb-2">Referencias 2026</h2>
    <div class="table-wrap mb-6">
      <VTable density="comfortable" class="cu-mobile-cards">
        <tbody>
          <tr>
            <td data-label="Referencia">Jubilación mínima</td>
            <td data-label="Valor" class="font-weight-medium">
              {{ formatUYU(JUBILACION_MINIMA_2026, 0) }}
            </td>
          </tr>
          <tr>
            <td data-label="Referencia">Pensión a la vejez e invalidez</td>
            <td data-label="Valor" class="font-weight-medium">
              {{ formatUYU(PENSION_VEJEZ_INVALIDEZ_2026, 0) }}
            </td>
          </tr>
          <tr>
            <td data-label="Referencia">Aumento general de pasividades 2026</td>
            <td data-label="Valor" class="font-weight-medium">
              {{ AUMENTO_2026_PCT }} % desde el {{ aumentoDesde }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </div>

    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

    <h2 class="text-h6 font-weight-bold mt-8 mb-2">De dónde sale esto</h2>
    <p class="text-body-2 text-medium-emphasis mb-2" style="max-width: 68ch">
      Contrastado contra el BPS. Última lectura: {{ verifiedAt }}.
    </p>
    <ul class="sources mb-6">
      <li v-for="src in SUPLEMENTO_SOURCES" :key="src.url">
        <a :href="src.url" target="_blank" rel="noopener" class="cu-link">{{ src.label }}</a>
      </li>
    </ul>

    <h2 class="text-h6 font-weight-bold mb-2">Seguir leyendo</h2>
    <div class="d-flex flex-wrap ga-3 mb-4">
      <NuxtLink :to="localePath('/cuando-me-puedo-jubilar-uruguay')" class="cu-link">
        Cuándo me puedo jubilar
      </NuxtLink>
      <NuxtLink :to="localePath('/desvincularme-de-la-afap-uruguay')" class="cu-link">
        Desvincularme de una AFAP
      </NuxtLink>
      <NuxtLink :to="localePath('/devolucion-fonasa-uruguay')" class="cu-link">
        Devolución de FONASA
      </NuxtLink>
      <NuxtLink :to="localePath('/elecciones-bps-2026')" class="cu-link">
        Elecciones del BPS 2026
      </NuxtLink>
      <NuxtLink :to="localePath('/asignacion-familiar-uruguay')" class="cu-link">
        Asignación familiar
      </NuxtLink>
    </div>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FaqItem } from '~/utils/faqAnswers'
import { formatUYU } from '~/utils/format'
import {
  APPLY_STEPS,
  AUMENTO_2026_FROM,
  AUMENTO_2026_PCT,
  BASE_2026,
  DEDUCTION_PCT,
  ELIGIBLE,
  EXAMPLES,
  JUBILACION_MINIMA_2026,
  PENSION_VEJEZ_INVALIDEZ_2026,
  RESIDENCY_RULE,
  SUPLEMENTO_FAQ,
  SUPLEMENTO_SOURCES,
  SUPLEMENTO_VERIFIED_AT,
  estimateSupplement,
} from '~/utils/suplementoSolidario'

const localePath = useLocalePath()

const pension = ref(15000)
const otherIncome = ref(0)
// `v-model.number` deja '' (o NaN) cuando el campo queda vacío: sin edad no se le pasa `age` a
// `estimateSupplement`, que entonces asume 65 años o más — no un NaN que se compare como `false`.
const age = ref<number | string | null>(70)

const ageSafe = computed<number | undefined>(() => {
  const raw = age.value
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined
})
const hasAge = computed(() => ageSafe.value !== undefined)

const result = computed(() =>
  estimateSupplement(pension.value, { otherIncome: otherIncome.value, age: ageSafe.value })
)

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedAt = longDate(SUPLEMENTO_VERIFIED_AT)
const aumentoDesde = longDate(AUMENTO_2026_FROM)

const faq = SUPLEMENTO_FAQ as FaqItem[]

const canonicalUrl = 'https://cambio-uruguay.com/suplemento-solidario-bps'
const title = 'Suplemento solidario BPS 2026: quién cobra'
const description = `El BPS paga hasta ${formatUYU(BASE_2026, 0)} menos el ${DEDUCTION_PCT} % de tu pasividad a jubilados y pensionistas del régimen nuevo. Requisitos, ejemplos y cómo pedirlo.`

defineOgImageComponent('Cambio', {
  title: 'Suplemento solidario del BPS',
  subtitle: 'Valor base 2026: $ 17.591',
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
        'suplemento solidario, suplemento solidario bps, suplemento solidario 2026, quienes cobran el suplemento solidario, suplemento solidario requisitos, suplemento solidario monto, ley 20130 suplemento',
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
                name: 'Suplemento solidario del BPS',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            dateModified: SUPLEMENTO_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            citation: SUPLEMENTO_SOURCES.map(s => ({
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
.calc-card,
.result-card,
.step-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 1);
}
.step-card {
  position: relative;
  padding-top: 26px;
}
.step-n {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 6px;
}
</style>
