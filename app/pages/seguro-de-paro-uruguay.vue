<template>
  <VContainer class="paro-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">TRABAJO</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Seguro de paro: cuánto cobrás, cuántos meses y por qué baja
      </h1>
      <p class="lead mb-6">
        La pregunta que más se repite no es cuánto cobro: es
        <strong>por qué cada mes me pagan menos</strong>. La respuesta es que el régimen es
        decreciente por diseño —del 66 % al 40 % del promedio— y que además
        <strong>cada mes tiene su propio tope</strong>, que también baja. Acá está la cuenta con los
        porcentajes y los topes {{ capsYear }} que publica BPS.
      </p>

      <VCard class="mechanism-card pa-5 pa-md-6" variant="flat">
        <div class="text-overline mb-3">Las tres causales</div>
        <div class="causal-grid">
          <div v-for="c in CAUSALES" :key="c.id" class="causal-item">
            <div class="causal-h">{{ c.label }}</div>
            <div class="causal-n">{{ c.months }} meses</div>
            <p class="mb-0">{{ c.what }}</p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Calculator -->
    <section id="calculadora" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Calculá lo tuyo</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Se calcula sobre el promedio mensual de tus remuneraciones
        <strong>nominales</strong> de los últimos seis meses, no sobre el líquido.
      </p>

      <VRow>
        <VCol cols="12" md="5">
          <VCard variant="flat" class="form-card pa-5">
            <VTextField
              v-model.number="form.averageNominal"
              type="number"
              label="Promedio nominal de los últimos 6 meses"
              prefix="$"
              min="0"
              density="comfortable"
              variant="outlined"
              class="mb-4"
            />
            <VSelect
              v-model="form.causal"
              :items="causalItems"
              item-title="label"
              item-value="id"
              label="Causal"
              density="comfortable"
              variant="outlined"
              class="mb-4"
            />
            <VTextField
              v-if="form.causal === 'reduccion'"
              v-model.number="form.reducedIncome"
              type="number"
              label="Lo que seguís cobrando de la empresa por mes"
              prefix="$"
              min="0"
              density="comfortable"
              variant="outlined"
              hint="En trabajo reducido el subsidio cubre la diferencia."
              persistent-hint
              class="mb-4"
            />
            <VTextField
              v-model.number="form.age"
              type="number"
              label="Edad al configurarse la causal"
              min="14"
              max="99"
              density="comfortable"
              variant="outlined"
              hint="Con 50 o más se extiende 6 meses."
              persistent-hint
              class="mb-4"
            />
            <VSwitch
              v-model="form.hasDependants"
              color="primary"
              density="comfortable"
              hide-details
              :label="`Tengo cargas familiares (complemento del ${FAMILY_COMPLEMENT_PCT} %)`"
            />
            <p class="text-caption text-medium-emphasis mb-0 mt-2">
              Cónyuge, concubino, hijos menores o personas a cargo con ingresos de hasta 1 BPC ({{
                formatUYU(bpc)
              }}). Se pide en BPS: no sale solo.
            </p>
          </VCard>
        </VCol>

        <VCol cols="12" md="7">
          <VCard variant="flat" class="verdict-card pa-5 mb-4">
            <div class="text-overline mb-2">Tu estimación</div>
            <p class="text-h6 font-weight-bold mb-2">
              {{ formatUYU(result.months[0]?.amount ?? 0) }} el primer mes,
              {{ formatUYU(result.months[result.months.length - 1]?.amount ?? 0) }} el último.
            </p>
            <p class="mb-0 text-medium-emphasis">
              {{ result.totalMonths }} meses en total · {{ formatUYU(result.total) }} sumando todo
              el período. Son importes <strong>nominales</strong>: sobre eso todavía se aporta al
              FONASA.
            </p>
          </VCard>

          <VCard variant="flat" class="results-card pa-0">
            <VTable class="cu-mobile-cards" density="comfortable">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th class="text-right">%</th>
                  <th class="text-right">Tope {{ capsYear }}</th>
                  <th class="text-right">Cobrás</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="m in result.months"
                  :key="m.month"
                  :class="{ 'is-extension': m.isExtension }"
                >
                  <td data-label="Mes">
                    {{ m.month }}
                    <VChip v-if="m.isExtension" size="x-small" variant="tonal" color="info">
                      extensión 50+
                    </VChip>
                  </td>
                  <td data-label="%" class="text-right">{{ m.percentage }} %</td>
                  <td data-label="Tope" class="text-right">
                    <span :class="m.cappedByLimit ? 'text-warning font-weight-medium' : ''">
                      {{ m.cap === null ? '—' : formatUYU(m.cap) }}
                    </span>
                  </td>
                  <td data-label="Cobrás" class="text-right">
                    <strong>{{ formatUYU(m.amount) }}</strong>
                    <div v-if="m.complement > 0" class="text-caption text-medium-emphasis">
                      incluye {{ formatUYU(m.complement) }} de complemento
                    </div>
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>

          <VAlert
            v-for="(n, i) in result.notes"
            :key="i"
            type="info"
            variant="tonal"
            density="comfortable"
            class="mt-3"
          >
            {{ n }}
          </VAlert>
        </VCol>
      </VRow>
    </section>

    <!-- Requirements -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Qué tenés que tener aportado</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        En los <strong>12 meses anteriores</strong> a que se configure la causal.
      </p>
      <VRow>
        <VCol v-for="r in REQUIREMENTS" :key="r.label" cols="12" md="4">
          <VCard variant="flat" class="req-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ r.label }}</h3>
            <p class="mb-0 text-medium-emphasis">{{ r.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Termination -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Qué te corta el subsidio</h2>
      <p class="text-medium-emphasis mb-4" style="max-width: 72ch">
        Es la parte que más sorpresas da, y la causa más común de que después BPS reclame que
        devuelvas lo cobrado.
      </p>
      <VCard variant="flat" class="warn-card pa-5">
        <ul class="mb-0 pl-4">
          <li v-for="(c, i) in TERMINATION_CAUSES" :key="i" class="mb-2">{{ c }}</li>
        </ul>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in UNEMPLOYMENT_FAQ" :key="f.question">
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
        Cifras contrastadas el {{ verifiedAt }}. Los topes los actualiza BPS: esta página es
        informativa y la resolución de BPS es la que vale.
      </p>
      <ul class="sources-list">
        <li v-for="s in UNEMPLOYMENT_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { URUGUAY } from '~/utils/calculators'
import { formatUYU } from '~/utils/format'
import {
  CAUSALES,
  FAMILY_COMPLEMENT_PCT,
  REQUIREMENTS,
  TERMINATION_CAUSES,
  UNEMPLOYMENT_CAPS_YEAR,
  UNEMPLOYMENT_FAQ,
  UNEMPLOYMENT_SOURCES,
  UNEMPLOYMENT_VERIFIED_AT,
  estimateUnemploymentBenefit,
  type BenefitInput,
} from '~/utils/unemploymentBenefit'

const form = reactive<BenefitInput>({
  averageNominal: 60000,
  causal: 'despido',
  age: 35,
  hasDependants: false,
  reducedIncome: 0,
})

/** Un campo numérico vacío es NaN, no 0: el motor nunca debe recibirlo. */
const sane = computed<BenefitInput>(() => ({
  averageNominal: Number.isFinite(form.averageNominal) ? Math.max(0, form.averageNominal) : 0,
  causal: form.causal,
  age: Number.isFinite(form.age) ? form.age : 0,
  hasDependants: form.hasDependants,
  reducedIncome: Number.isFinite(form.reducedIncome ?? 0)
    ? Math.max(0, form.reducedIncome ?? 0)
    : 0,
}))

const result = computed(() => estimateUnemploymentBenefit(sane.value))
const causalItems = CAUSALES.map(c => ({ id: c.id, label: c.label }))
const bpc = URUGUAY.bpc
const capsYear = UNEMPLOYMENT_CAPS_YEAR

const verifiedAt = new Date(UNEMPLOYMENT_VERIFIED_AT).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/seguro-de-paro-uruguay'
const title = 'Seguro de paro en Uruguay: cuánto cobrás y por qué baja cada mes'
const description =
  'Cuánto se cobra de seguro de paro con los porcentajes y topes 2026 de BPS: 66 %, 57 %, 50 %, 45 %, 42 % y 40 % del promedio nominal de los últimos seis meses, con un tope distinto para cada mes. Calculadora por causal (despido, suspensión, trabajo reducido), extensión para 50 o más, complemento del 20 % por cargas familiares, requisitos de aportes y qué corta el subsidio.'

defineOgImageComponent('Cambio', {
  title: 'Seguro de paro: cuánto cobrás',
  subtitle: 'Porcentajes y topes 2026 de BPS',
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
        'seguro de paro uruguay, cuanto cobro seguro de paro, subsidio por desempleo bps, seguro de paro cuantos meses, por que baja el seguro de paro, tope seguro de paro 2026, seguro de paro suspension, trabajo reducido bps, complemento 20 cargas familiares, seguro de paro 50 años, requisitos seguro de paro',
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
              { '@type': 'ListItem', position: 2, name: 'Seguro de paro', item: canonicalUrl },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: UNEMPLOYMENT_FAQ.map(f => ({
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
.paro-page {
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

.mechanism-card,
.form-card,
.verdict-card,
.results-card,
.req-card,
.warn-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
}
.v-theme--light .mechanism-card,
.v-theme--light .form-card,
.v-theme--light .verdict-card,
.v-theme--light .results-card,
.v-theme--light .req-card,
.v-theme--light .warn-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.warn-card {
  border-left: 3px solid rgb(var(--v-theme-warning));
}

.causal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1.25rem;
}
.causal-item {
  padding-left: 0.9rem;
  border-left: 3px solid rgb(var(--v-theme-primary));
}
.causal-h {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.65;
}
.causal-n {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.3;
}

.results-card :deep(tr.is-extension) {
  background: rgba(var(--v-theme-info), 0.07);
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.8;
}
</style>
