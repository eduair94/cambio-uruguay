<!--
THESIS: Una ficha de tarifario permite encontrar la columna propia sin convertir el
menor importe en una promesa de ahorro.
OWN-WORLD: Open Sans, superficies del tema, azul de acción y tablas Vuetify del sitio.
STORY: Elegir institución, afiliación y prestación; leer precio base y condición;
contrastar el máximo autorizado y abrir la fuente antes de consultar al prestador.
FIRST VIEWPORT: Título y fecha, tres controles horizontales y el comienzo del
tarifario. En teléfono, controles y filas apilados con los mismos rótulos.
FORM: Ficha de tarifario, estructura 6, semilla 4d40a583. Composición A de la
comparación visual; staging de registro documental. El dato cambia en su fila,
sin animaciones que retrasen la consulta. Se hereda el sistema visual existente.
-->
<template>
  <VContainer class="mutualista-cost-page py-6 py-md-10" data-clarity-mask="True">
    <header class="page-intro mb-7">
      <p class="source-kicker mb-2">{{ t('mutualistaCosts.kicker') }}</p>
      <h1 class="page-title mb-3">{{ t('mutualistaCosts.title') }}</h1>
      <p class="lead mb-3">{{ t('mutualistaCosts.lead') }}</p>
      <a :href="source.pageUrl" target="_blank" rel="noopener noreferrer" class="source-link">
        {{ t('mutualistaCosts.source') }}
        <VIcon size="16" aria-hidden="true">mdi-open-in-new</VIcon>
      </a>
    </header>

    <section id="tarifario" aria-labelledby="tarifario-title" class="tariff-section">
      <div class="tariff-controls mb-4">
        <VSelect
          v-model="institutionId"
          :items="institutionItems"
          :label="t('mutualistaCosts.institution')"
          variant="outlined"
          density="comfortable"
          hide-details
        />
        <VSelect
          v-model="affiliation"
          :items="affiliationItems"
          :label="t('mutualistaCosts.affiliation')"
          variant="outlined"
          density="comfortable"
          hide-details
        />
        <VSelect
          v-model="conceptId"
          :items="conceptItems"
          :label="t('mutualistaCosts.service')"
          variant="outlined"
          density="comfortable"
          hide-details
        />
      </div>
      <p class="base-notice pa-4 mb-6">{{ t('mutualistaCosts.baseNotice') }}</p>

      <h2 id="tarifario-title" ref="resultHeading" tabindex="-1" class="section-title mb-2">
        {{ institution.name }} · {{ t('mutualistaCosts.resultTitle') }}
      </h2>
      <p class="mb-3">{{ selectedConceptLabel }}</p>
      <p class="reading-width mb-4">{{ t('mutualistaCosts.conditionsNotice') }}</p>
      <p class="sr-only" aria-live="polite" aria-atomic="true">
        {{ t('mutualistaCosts.resultsAnnouncement', { count: rows.length }) }}
      </p>

      <VTable v-if="rows.length" class="cu-mobile-cards tariff-table" density="comfortable">
        <caption class="sr-only">
          {{
            institution.name
          }}
          —
          {{
            selectedConceptLabel
          }}
          —
          {{
            t('mutualistaCosts.baseNotice')
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ t('mutualistaCosts.priceColumn') }}</th>
            <th scope="col" class="text-right">{{ t('mutualistaCosts.baseAmount') }}</th>
            <th scope="col">{{ t('mutualistaCosts.condition') }}</th>
            <th scope="col">{{ t('mutualistaCosts.sourceCell') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.sourceCell">
            <td :data-label="t('mutualistaCosts.priceColumn')" class="cu-cell-prose">
              <strong>{{ row.label }}</strong>
              <span class="d-block table-detail">{{ affiliationLabel(row.affiliation) }}</span>
            </td>
            <td :data-label="t('mutualistaCosts.baseAmount')" class="text-right amount-cell">
              <strong class="amount">{{ money(row.amountUyu) }}</strong>
              <span v-if="row.amountUyu === 0" class="d-block table-detail cu-cell-note value-note">
                {{ t('mutualistaCosts.zeroNote') }}
              </span>
              <span
                v-if="row.exceedsPublishedMaximum"
                class="d-block cu-cell-note value-note contradiction"
              >
                {{ t('mutualistaCosts.contradiction') }}
              </span>
            </td>
            <td :data-label="t('mutualistaCosts.condition')" class="cu-cell-prose">
              {{ row.condition || t('mutualistaCosts.unspecified') }}
            </td>
            <td :data-label="t('mutualistaCosts.sourceCell')" class="source-cell">
              {{ row.sourceCell }}
            </td>
          </tr>
        </tbody>
      </VTable>
      <p v-else role="status" class="empty-state pa-4">{{ t('mutualistaCosts.empty') }}</p>

      <div class="maximum-note mt-4">
        <p class="mb-1">
          <strong
            >{{ t('mutualistaCosts.maximum') }}: {{ money(institution.maxima[conceptId]) }}</strong
          >
          <span class="table-detail"> · {{ maximumCell }}</span>
        </p>
        <p class="mb-0">{{ t('mutualistaCosts.maximumNotice') }}</p>
      </div>
    </section>

    <section class="explanation-section reading-width" aria-labelledby="extras-title">
      <h2 id="extras-title" class="section-title mb-3">{{ t('mutualistaCosts.extraTitle') }}</h2>
      <p class="mb-5">{{ t('mutualistaCosts.extraBody') }}</p>
      <h3 class="text-h6 font-weight-bold mb-2">{{ t('mutualistaCosts.exampleTitle') }}</h3>
      <p class="mb-0">{{ t('mutualistaCosts.exampleBody') }}</p>
    </section>

    <section aria-labelledby="comparison-title" class="comparison-section">
      <h2 id="comparison-title" class="section-title mb-3">
        {{ t('mutualistaCosts.comparisonTitle') }}
      </h2>
      <p class="reading-width mb-5">{{ t('mutualistaCosts.comparisonIntro') }}</p>
      <VSelect
        v-model="conceptId"
        :items="conceptItems"
        :label="t('mutualistaCosts.service')"
        class="comparison-select mb-5"
        variant="outlined"
        density="comfortable"
        hide-details
      />
      <VTable class="cu-mobile-cards comparison-table" density="comfortable">
        <caption class="table-caption">
          {{
            selectedConceptLabel
          }}
          ·
          {{
            t('mutualistaCosts.baseNotice')
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ t('mutualistaCosts.institution') }}</th>
            <th scope="col" class="text-right">{{ t('mutualistaCosts.maximum') }}</th>
            <th scope="col">{{ t('mutualistaCosts.sourceCell') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in institutions"
            :key="item.id"
            :class="{ selected: item.id === institutionId }"
          >
            <td :data-label="t('mutualistaCosts.institution')">
              <a
                href="#tarifario-title"
                :aria-label="`${t('mutualistaCosts.chooseInstitution')}: ${item.name}`"
                @click.prevent="selectInstitution(item.id)"
              >
                {{ item.name }}
              </a>
            </td>
            <td :data-label="t('mutualistaCosts.maximum')" class="text-right amount">
              {{ money(item.maxima[conceptId]) }}
            </td>
            <td :data-label="t('mutualistaCosts.sourceCell')" class="source-cell">
              {{ item.sheet }}!F{{ item.sourceRows[conceptId].row }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <section aria-labelledby="source-title" class="sources-section reading-width">
      <h2 id="source-title" class="section-title mb-3">{{ t('mutualistaCosts.limitsTitle') }}</h2>
      <p class="mb-3">{{ t('mutualistaCosts.limitsBody') }}</p>
      <p class="mb-4">{{ t('mutualistaCosts.sourceLanguage') }}</p>
      <dl class="source-dates mb-5">
        <div>
          <dt>{{ t('mutualistaCosts.effective') }}</dt>
          <dd>{{ date(source.effectiveFrom) }}</dd>
        </div>
        <div>
          <dt>{{ t('mutualistaCosts.published') }}</dt>
          <dd>{{ date(source.publishedAt) }}</dd>
        </div>
        <div>
          <dt>{{ t('mutualistaCosts.verified') }}</dt>
          <dd>{{ date(source.verifiedAt) }}</dd>
        </div>
      </dl>
      <div class="source-actions">
        <a :href="source.pageUrl" target="_blank" rel="noopener noreferrer">{{
          t('mutualistaCosts.source')
        }}</a>
        <a :href="source.downloadUrl" target="_blank" rel="noopener noreferrer">{{
          t('mutualistaCosts.download')
        }}</a>
      </div>
    </section>

    <section class="next-step reading-width" aria-labelledby="next-title">
      <h2 id="next-title" class="section-title mb-3">{{ t('mutualistaCosts.nextTitle') }}</h2>
      <p class="mb-4">{{ t('mutualistaCosts.nextBody') }}</p>
      <ContentTaskLinks
        :label="t('mutualistaCosts.navLabel')"
        :items="[{ label: t('mutualistaCosts.changeLink'), to: '/cambiar-de-mutualista-uruguay' }]"
        placement="mutualista_cost_next_step"
      />
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  MUTUALISTA_COSTS,
  MUTUALISTA_COST_CONCEPTS,
  MUTUALISTA_COST_SOURCE,
  getMutualistaCostRows,
  type MutualistaCostAffiliation,
  type MutualistaCostConceptId,
} from '~/utils/mutualistaCosts'
import { mutualistaCostMessages } from '~/utils/mutualistaCostMessages'

const { t, locale, mergeLocaleMessage } = useI18n()
for (const [lang, messages] of Object.entries(mutualistaCostMessages)) {
  mergeLocaleMessage(lang, { mutualistaCosts: messages })
}
const localePath = useLocalePath()
const source = MUTUALISTA_COST_SOURCE
const institutions = [...MUTUALISTA_COSTS].sort((a, b) => a.name.localeCompare(b.name, 'es'))
const institutionId = ref(institutions[0].id)
const affiliation = ref<MutualistaCostAffiliation | 'all'>('fonasa')
const conceptId = ref<MutualistaCostConceptId>('medicamentos')
const resultHeading = ref<HTMLElement | null>(null)
const institution = computed(
  () => institutions.find(item => item.id === institutionId.value) || institutions[0]
)
const institutionItems = institutions.map(item => ({ title: item.name, value: item.id }))
const conceptKeys: Record<MutualistaCostConceptId, string> = {
  medicamentos: 'medicines',
  'medicina-general': 'generalMedicine',
  especialistas: 'specialists',
  'urgencia-centralizada': 'emergency',
  'consulta-domicilio': 'homeConsultation',
}
const conceptItems = computed(() =>
  MUTUALISTA_COST_CONCEPTS.map(item => ({
    title: t(`mutualistaCosts.${conceptKeys[item.id]}`),
    value: item.id,
  }))
)
const selectedConceptLabel = computed(() => t(`mutualistaCosts.${conceptKeys[conceptId.value]}`))
function affiliationLabel(value: MutualistaCostAffiliation) {
  return t(
    `mutualistaCosts.${value === 'no-fonasa' ? 'noFonasa' : value === 'sanidad-policial' ? 'police' : 'fonasa'}`
  )
}
const affiliationItems = computed(() => [
  { title: t('mutualistaCosts.allAffiliations'), value: 'all' },
  ...(['fonasa', 'no-fonasa', 'sanidad-policial'] as const).map(value => ({
    title: affiliationLabel(value),
    value,
  })),
])
const rows = computed(() =>
  getMutualistaCostRows(
    institutionId.value,
    conceptId.value,
    affiliation.value === 'all' ? undefined : affiliation.value
  )
)
const maximumCell = computed(
  () => `${institution.value.sheet}!F${institution.value.sourceRows[conceptId.value].row}`
)
// Only local UI state: do not put affiliation or the chosen health service in
// query parameters, analytics events or persisted browser preferences.
async function selectInstitution(id: string) {
  institutionId.value = id
  affiliation.value = 'all'
  await nextTick()
  resultHeading.value?.focus({ preventScroll: true })
  document.getElementById('tarifario')?.scrollIntoView({ block: 'start' })
}
const numberLocale = computed(() =>
  locale.value === 'en' ? 'en-US' : locale.value === 'pt' ? 'pt-BR' : 'es-UY'
)
function money(value: number | null) {
  return value === null
    ? t('mutualistaCosts.noData')
    : `$ ${new Intl.NumberFormat(numberLocale.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`
}
function date(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(numberLocale.value, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
const canonicalUrl = computed(
  () => `https://cambio-uruguay.com${localePath('/tickets-mutualistas-uruguay')}`
)
useSeoMeta({
  title: () => `${t('mutualistaCosts.title')} | Cambio Uruguay`,
  description: () => t('mutualistaCosts.description'),
  ogTitle: () => t('mutualistaCosts.title'),
  ogDescription: () => t('mutualistaCosts.description'),
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
})
defineOgImageComponent('Cambio', {
  title: t('mutualistaCosts.title'),
  subtitle: t('mutualistaCosts.kicker'),
  tag: 'MSP · UYU',
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebPage',
            '@id': canonicalUrl.value,
            url: canonicalUrl.value,
            name: t('mutualistaCosts.title'),
            description: t('mutualistaCosts.description'),
            inLanguage: locale.value,
            dateModified: source.verifiedAt,
            citation: source.pageUrl,
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Cambio Uruguay',
                item: `https://cambio-uruguay.com${localePath('/')}`,
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: t('mutualistaCosts.title'),
                item: canonicalUrl.value,
              },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.mutualista-cost-page {
  max-width: 1180px;
}
.mutualista-cost-page p,
.mutualista-cost-page h1,
.mutualista-cost-page h2,
.mutualista-cost-page h3 {
  margin-top: 0;
}
.page-title {
  max-width: 27ch;
  font-size: clamp(1.65rem, 4.4vw, 2.5rem);
  line-height: 1.16;
  font-weight: 800;
  text-wrap: balance;
}
.lead {
  max-width: 70ch;
  font-size: 1.075rem;
  line-height: 1.65;
}
.source-kicker,
.table-detail {
  font-size: 0.875rem;
}
.source-kicker {
  font-weight: 600;
}
.mutualista-cost-page a {
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
}
.source-link,
.source-actions a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
}
.tariff-controls {
  display: grid;
  grid-template-columns: 1fr 0.85fr 1.25fr;
  gap: 16px;
}
.base-notice {
  background: rgba(var(--v-theme-primary), 0.07);
  border-radius: 12px;
  font-weight: 600;
}
.section-title {
  font-size: clamp(1.25rem, 3vw, 1.55rem);
  line-height: 1.3;
  font-weight: 750;
  text-wrap: balance;
}
.reading-width {
  max-width: 72ch;
  line-height: 1.65;
}
.tariff-table td {
  padding-top: 16px !important;
  padding-bottom: 16px !important;
  vertical-align: top;
}
.tariff-table td:first-child {
  width: 24%;
}
.amount {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.value-note {
  max-width: 27ch;
  margin-top: 6px;
  font-size: 0.8125rem;
  text-align: left;
  line-height: 1.5;
}
.contradiction {
  font-weight: 600;
}
.source-cell {
  overflow-wrap: anywhere;
  font-size: 0.8125rem;
}
.maximum-note {
  padding-top: 16px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  line-height: 1.6;
}
.explanation-section,
.comparison-section,
.sources-section,
.next-step {
  margin-top: 48px;
}
.comparison-select {
  max-width: 460px;
}
.table-caption {
  padding: 12px 0;
  text-align: left;
  caption-side: top;
  line-height: 1.5;
}
.comparison-table td:first-child a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-weight: 600;
}
.comparison-table .selected {
  background: rgba(var(--v-theme-primary), 0.05);
}
.source-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 28px;
}
.source-dates dt {
  font-size: 0.875rem;
}
.source-dates dd {
  margin: 0;
  font-weight: 600;
}
.source-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
}
#tarifario {
  scroll-margin-top: 100px;
}
#tarifario-title:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 4px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 760px) {
  .tariff-controls {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 599px) {
  .tariff-table td:first-child {
    width: auto;
  }
  .value-note {
    max-width: none;
  }
  .tariff-table td {
    padding-top: 10px !important;
    padding-bottom: 10px !important;
  }
  .comparison-table .source-cell {
    font-size: 0.8rem;
  }
  .explanation-section,
  .comparison-section,
  .sources-section,
  .next-step {
    margin-top: 36px;
  }
}
</style>
