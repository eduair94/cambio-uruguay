<template>
  <div class="indicadores-hub">
    <VContainer>
      <header class="text-center pt-2 pb-6 py-md-12">
        <VChip class="mb-4" color="primary" size="small" variant="tonal">
          <VIcon start size="small">mdi-finance</VIcon>
          INDICADORES
        </VChip>
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
          Indicadores económicos de Uruguay hoy
        </h1>
        <p class="text-body-1 text-grey-lighten-1 mx-auto indicadores-intro">
          Consultá el valor actualizado de la Unidad Indexada (UI), la Unidad Reajustable (UR) y la
          Base de Prestaciones y Contribuciones (BPC). Entendé para qué sirve cada una y convertilas
          a pesos en segundos.
        </p>
        <div class="d-flex justify-center mt-4">
          <ShareButtons :url="canonicalUrl" />
        </div>
      </header>

      <VRow>
        <VCol v-for="item in items" :key="item.slug" cols="12" md="4">
          <VCard
            :to="localePath(`/indicadores/${item.slug}`)"
            class="h-100 indicador-card"
            variant="tonal"
            link
          >
            <VCardItem>
              <template #prepend>
                <VAvatar color="primary" variant="tonal" size="44">
                  <VIcon>mdi-finance</VIcon>
                </VAvatar>
              </template>
              <VCardTitle class="text-body-1 font-weight-bold">{{ item.name }}</VCardTitle>
              <VCardSubtitle>{{ item.abbr }}</VCardSubtitle>
            </VCardItem>
            <VCardText>
              <div class="text-h5 font-weight-bold text-primary mb-1">{{ item.formatted }}</div>
              <div class="text-caption text-grey mb-3">por 1 {{ item.abbr }}</div>
              <p class="text-body-2 text-grey-lighten-1 mb-0">{{ item.shortDef }}</p>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <section class="mb-8">
        <h2 class="text-h6 font-weight-bold mb-4 d-flex align-center">
          <VIcon start color="primary">mdi-frequently-asked-questions</VIcon>
          Preguntas frecuentes sobre los indicadores
        </h2>
        <VExpansionPanels variant="accordion">
          <VExpansionPanel v-for="(faq, i) in faqs" :key="i">
            <VExpansionPanelTitle class="font-weight-medium">
              {{ faq.question }}
            </VExpansionPanelTitle>
            <VExpansionPanelText class="text-body-2">{{ faq.answer }}</VExpansionPanelText>
          </VExpansionPanel>
        </VExpansionPanels>
      </section>

      <VCard class="cta-indicadores my-8 pa-6 text-center" variant="flat">
        <h2 class="text-h6 font-weight-bold mb-2 text-white">
          ¿Querés convertir monedas en lugar de unidades?
        </h2>
        <p class="text-body-2 text-grey-lighten-1 mb-4">
          Mirá la cotización del dólar y otras monedas en las casas de cambio de Uruguay.
        </p>
        <div class="d-flex justify-center flex-wrap ga-2">
          <VBtn :to="localePath('/cotizacion')" color="primary" variant="elevated">
            <VIcon start>mdi-cash-multiple</VIcon>
            Ver cotizaciones
          </VBtn>
          <VBtn :to="localePath('/herramientas')" color="secondary" variant="tonal">
            <VIcon start>mdi-calculator</VIcon>
            Herramientas
          </VBtn>
        </div>
      </VCard>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import type { ExchangeRate } from '~/types/api'
import { currentIndicatorValue, indicators } from '~/utils/indicators'

const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()

const { data: values } = await useAsyncData('indicadores-hub', async () => {
  const result = await getProcessedExchangeData('')
  const rows = (result?.exchangeData ?? []) as ExchangeRate[]
  return Object.fromEntries(indicators.map(ind => [ind.slug, currentIndicatorValue(rows, ind)]))
})

const formatPesos = (n: number, decimals: number): string =>
  n.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

const items = computed(() =>
  indicators.map(ind => ({
    slug: ind.slug,
    name: ind.name,
    abbr: ind.abbr,
    shortDef: ind.shortDef,
    formatted: formatPesos(values.value?.[ind.slug] ?? ind.referenceValue, ind.decimals),
  }))
)

// FAQ aimed at featured snippets / AI Overviews for "indicadores economicos uruguay".
const faqs = [
  {
    question: '¿Qué es la Unidad Indexada (UI)?',
    answer:
      'La Unidad Indexada es una unidad de valor que se ajusta a diario según la inflación (IPC). Se usa en alquileres, préstamos hipotecarios, depósitos y contratos para mantener el valor real frente a la suba de precios.',
  },
  {
    question: '¿Qué es la Unidad Reajustable (UR)?',
    answer:
      'La Unidad Reajustable se ajusta una vez al mes según la evolución de los salarios (Índice Medio de Salarios). Se utiliza sobre todo en alquileres y en préstamos del Banco Hipotecario (BHU).',
  },
  {
    question: '¿Qué es la BPC y para qué sirve?',
    answer:
      'La Base de Prestaciones y Contribuciones (BPC) es un valor que fija el Estado una vez al año. Se usa como referencia en tributos, multas, prestaciones sociales y, sobre todo, en las franjas del IRPF.',
  },
  {
    question: '¿Cómo convierto UI, UR o BPC a pesos?',
    answer:
      'Multiplicá la cantidad de la unidad por su valor vigente. Por ejemplo, 1.000 UI a un valor de $6,58 equivalen a $6.580. En cada indicador encontrás un conversor que hace la cuenta automáticamente.',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/indicadores'

defineOgImageComponent('Cambio', {
  title: 'Indicadores económicos de Uruguay hoy',
  subtitle: 'Valor de la UI, la UR y la BPC, con conversor a pesos',
  tag: 'INDICADORES',
})

useSeoMeta({
  title: 'Indicadores Económicos de Uruguay Hoy: UI, UR y BPC | Cambio Uruguay',
  description:
    'Valor actualizado de la Unidad Indexada (UI), la Unidad Reajustable (UR) y la BPC en Uruguay. Qué son, para qué sirven y conversor a pesos.',
  ogTitle: 'Indicadores económicos de Uruguay hoy: UI, UR y BPC',
  ogDescription:
    'Valor de la Unidad Indexada, la Unidad Reajustable y la BPC, con conversor a pesos uruguayos.',
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebPage',
            '@id': `${canonicalUrl}#webpage`,
            url: canonicalUrl,
            name: 'Indicadores económicos de Uruguay hoy: UI, UR y BPC',
            inLanguage: 'es',
            dateModified: new Date().toISOString(),
            isPartOf: { '@id': 'https://cambio-uruguay.com/#website' },
            speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.indicadores-intro'] },
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
              { '@type': 'ListItem', position: 2, name: 'Indicadores', item: canonicalUrl },
            ],
          },
          {
            '@type': 'ItemList',
            name: 'Indicadores económicos de Uruguay',
            itemListElement: indicators.map((ind, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: `${ind.name} (${ind.abbr})`,
              url: `https://cambio-uruguay.com/indicadores/${ind.slug}`,
            })),
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqs.map(f => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.indicadores-intro {
  max-width: 800px;
  line-height: 1.7;
}
.indicador-card {
  transition: transform 0.15s ease;
}
.indicador-card:hover {
  transform: translateY(-2px);
}
.cta-indicadores {
  background: rgba(124, 77, 255, 0.1);
  border: 1px solid rgba(124, 77, 255, 0.28);
  border-radius: 12px;
}
</style>
