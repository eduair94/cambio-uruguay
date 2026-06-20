<template>
  <div v-if="indicator" class="pb-8">
    <!-- Header with the headline value -->
    <v-row>
      <v-col cols="12">
        <v-card class="overflow-hidden" elevation="8">
          <div class="bg-gradient-indicador pa-6">
            <div class="d-flex align-center ga-4 flex-wrap">
              <v-avatar size="56" class="d-none d-md-flex bg-white">
                <v-icon size="32" color="primary">mdi-finance</v-icon>
              </v-avatar>
              <div>
                <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
                  Valor de la {{ indicator.name }} ({{ indicator.abbr }}) hoy en Uruguay
                </h1>
                <p class="text-body-1 text-grey-lighten-2 mb-0 indicador-intro">
                  {{ indicator.shortDef }}
                </p>
              </div>
            </div>
          </div>

          <v-card-text class="py-5">
            <div class="d-flex align-center flex-wrap ga-6">
              <div data-testid="indicador-value">
                <div class="text-overline text-grey">1 {{ indicator.abbr }} equivale a</div>
                <div class="text-h4 font-weight-bold text-primary">{{ formattedValue }}</div>
                <div class="text-caption text-grey">{{ valueLabel }}</div>
              </div>
              <v-spacer class="d-none d-sm-flex" />
              <ShareButtons :url="canonicalUrl" :text="`Valor de la ${indicator.name} hoy`" />
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Two-way converter -->
    <v-row class="mt-2">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center py-3">
            <v-icon start>mdi-calculator-variant</v-icon>
            Conversor de {{ indicator.abbr }} a pesos
          </v-card-title>
          <v-card-text>
            <v-row align="center">
              <v-col cols="12" sm="5">
                <v-text-field
                  v-model.number="unitsInput"
                  type="number"
                  min="0"
                  :label="`Cantidad de ${indicator.abbr}`"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  data-testid="indicador-units-input"
                />
              </v-col>
              <v-col cols="12" sm="2" class="text-center d-none d-sm-block">
                <v-icon size="28" color="grey">mdi-swap-horizontal</v-icon>
              </v-col>
              <v-col cols="12" sm="5">
                <v-text-field
                  v-model.number="pesosInput"
                  type="number"
                  min="0"
                  label="Pesos uruguayos (UYU)"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  data-testid="indicador-pesos-input"
                />
              </v-col>
            </v-row>
            <p class="text-body-2 text-grey mt-3 mb-0">
              {{ unitsInput || 0 }} {{ indicator.abbr }} = <strong>{{ pesosFormatted }}</strong> al
              valor vigente de {{ formattedValue }} por {{ indicator.abbr }}.
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- What it is -->
    <v-row class="mt-2">
      <v-col cols="12" md="7">
        <v-card class="h-100">
          <v-card-title class="d-flex align-center py-3">
            <v-icon start>mdi-information-outline</v-icon>
            ¿Qué es la {{ indicator.name }}?
          </v-card-title>
          <v-card-text>
            <p class="text-body-1 indicador-prose mb-4">{{ indicator.whatItIs }}</p>
            <h3 class="text-subtitle-1 font-weight-bold mb-2">¿Para qué se usa?</h3>
            <v-list density="compact" class="bg-transparent pa-0">
              <v-list-item
                v-for="(use, i) in indicator.usedFor"
                :key="i"
                class="px-0"
                min-height="32"
              >
                <template #prepend>
                  <v-icon size="small" color="primary">mdi-check-circle</v-icon>
                </template>
                <v-list-item-title class="text-body-2">{{ use }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="5">
        <v-card class="h-100">
          <v-card-title class="d-flex align-center py-3">
            <v-icon start>mdi-update</v-icon>
            ¿Cómo se actualiza?
          </v-card-title>
          <v-card-text>
            <p class="text-body-1 indicador-prose mb-0">{{ indicator.howUpdated }}</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- FAQ -->
    <v-row class="mt-2">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center py-3">
            <v-icon start>mdi-frequently-asked-questions</v-icon>
            Preguntas frecuentes sobre la {{ indicator.abbr }}
          </v-card-title>
          <v-expansion-panels variant="accordion" class="pa-2">
            <v-expansion-panel v-for="(faq, i) in indicator.faqs" :key="i">
              <v-expansion-panel-title class="font-weight-medium">
                {{ faq.question }}
              </v-expansion-panel-title>
              <v-expansion-panel-text class="text-body-2">
                {{ faq.answer }}
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card>
      </v-col>
    </v-row>

    <!-- Related links -->
    <v-row class="mt-2">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center py-3">
            <v-icon start>mdi-link-variant</v-icon>
            Seguí explorando
          </v-card-title>
          <v-card-text class="d-flex flex-wrap ga-2">
            <v-chip
              v-for="link in indicator.related"
              :key="link.to"
              :to="localePath(link.to)"
              color="primary"
              variant="tonal"
              size="small"
              link
            >
              {{ link.label }}
            </v-chip>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ExchangeRate } from '~/types/api'
import { currentIndicatorValue, indicatorFromSlug } from '~/utils/indicators'

definePageMeta({
  validate: route => indicatorFromSlug(String(route.params.indicador ?? '')) !== null,
})

const route = useRoute()
const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()

const indicator = computed(() => indicatorFromSlug(String(route.params.indicador ?? '')))

// SSR fetch of today's rows, reduced to this indicator's current value. Keyed by
// slug so each indicator page caches separately.
const { data: value } = await useAsyncData(
  () => `indicador-${indicator.value?.slug ?? 'na'}`,
  async () => {
    const ind = indicator.value
    if (!ind) return null
    const result = await getProcessedExchangeData('')
    const rows = (result?.exchangeData ?? []) as ExchangeRate[]
    return currentIndicatorValue(rows, ind)
  }
)

if (!indicator.value) {
  throw createError({ statusCode: 404, statusMessage: 'Indicador no encontrado' })
}

const currentValue = computed(() => value.value ?? indicator.value!.referenceValue)

const formatPesos = (n: number, decimals: number): string =>
  n.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

const formattedValue = computed(() => formatPesos(currentValue.value, indicator.value!.decimals))

const valueLabel = computed(() =>
  indicator.value!.code
    ? 'Valor vigente según el Banco Central del Uruguay'
    : indicator.value!.referenceLabel
)

// Two-way converter: `units` is the source of truth; editing pesos derives units.
const unitsInput = ref<number | null>(1)
const pesosInput = computed<number | null>({
  get: () => {
    const u = unitsInput.value
    if (typeof u !== 'number' || Number.isNaN(u)) return null
    return Math.round(u * currentValue.value * 100) / 100
  },
  set: p => {
    if (typeof p !== 'number' || Number.isNaN(p) || currentValue.value <= 0) {
      unitsInput.value = null
      return
    }
    unitsInput.value = Math.round((p / currentValue.value) * 10000) / 10000
  },
})

const pesosFormatted = computed(() => formatPesos(pesosInput.value ?? 0, 2))

const canonicalUrl = computed(
  () => `https://cambio-uruguay.com/indicadores/${indicator.value!.slug}`
)

defineOgImageComponent('Cambio', {
  title: () => `Valor de la ${indicator.value!.name} (${indicator.value!.abbr}) hoy`,
  subtitle: () => indicator.value!.shortDef,
  tag: indicator.value!.tag,
})

useSeoMeta({
  title: () =>
    `Valor de la ${indicator.value!.name} (${indicator.value!.abbr}) Hoy | Cambio Uruguay`,
  description: () => indicator.value!.shortDef,
  ogTitle: () => `Valor de la ${indicator.value!.name} (${indicator.value!.abbr}) hoy`,
  ogDescription: () => indicator.value!.shortDef,
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() => {
        const ind = indicator.value!
        return JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebPage',
              '@id': `${canonicalUrl.value}#webpage`,
              url: canonicalUrl.value,
              name: `Valor de la ${ind.name} (${ind.abbr}) hoy`,
              inLanguage: 'es',
              dateModified: new Date().toISOString(),
              isPartOf: { '@id': 'https://cambio-uruguay.com/#organization' },
              speakable: {
                '@type': 'SpeakableSpecification',
                cssSelector: ['.indicador-intro', '.indicador-prose'],
              },
            },
            {
              '@type': 'DefinedTerm',
              name: `${ind.name} (${ind.abbr})`,
              description: ind.whatItIs,
              inDefinedTermSet: 'https://cambio-uruguay.com/indicadores',
            },
            {
              '@type': 'FAQPage',
              mainEntity: ind.faqs.map(f => ({
                '@type': 'Question',
                name: f.question,
                acceptedAnswer: { '@type': 'Answer', text: f.answer },
              })),
            },
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
                  name: 'Indicadores',
                  item: 'https://cambio-uruguay.com/indicadores',
                },
                { '@type': 'ListItem', position: 3, name: ind.name, item: canonicalUrl.value },
              ],
            },
          ],
        })
      }),
    },
  ],
})
</script>

<style scoped>
.bg-gradient-indicador {
  background: linear-gradient(135deg, #7c4dff 0%, #2f81f7 100%);
}
.indicador-intro {
  max-width: 760px;
  line-height: 1.6;
}
.indicador-prose {
  line-height: 1.7;
}
</style>
