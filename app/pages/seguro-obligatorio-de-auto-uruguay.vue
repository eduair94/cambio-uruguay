<template>
  <VContainer class="soa-page">
    <nav aria-label="Ruta de navegación" class="text-caption mb-4">
      <NuxtLink :to="localePath('/')" class="text-decoration-none">Cambio Uruguay</NuxtLink>
      <span class="mx-1 text-grey">›</span>
      <NuxtLink
        :to="localePath('/temas/comprar-y-mantener-auto-uruguay')"
        class="text-decoration-none"
      >
        Comprar y mantener un auto
      </NuxtLink>
      <span class="mx-1 text-grey">›</span>
      <span class="text-grey">Seguro obligatorio (SOA)</span>
    </nav>

    <header class="mb-8">
      <VChip class="mb-4" color="primary" size="small" variant="tonal">
        <VIcon start size="small">mdi-car-emergency</VIcon>
        SEGURO OBLIGATORIO
      </VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Seguro obligatorio de auto (SOA) en Uruguay
      </h1>
      <p class="text-body-1 soa-intro mb-4">
        El SOA es obligatorio para circular y cubre el daño personal, la lesión o la muerte de un
        <strong>tercero</strong>. Las dos cosas que más se malinterpretan: no paga los daños del
        vehículo, y <strong>no te cubre a vos</strong> — la ley saca de la condición de tercero al
        propietario, al conductor y a su familia cercana.
      </p>
      <p class="text-body-2 text-medium-emphasis mb-0">
        Todo lo de esta página sale de la Ley 18.412 y de las leyes que la modificaron, cotejado
        contra el texto vigente en impo.com.uy el {{ verifiedAt }}. Cada dato lleva su artículo.
      </p>
    </header>

    <!-- El tope, que es el único número grande de la página, con la cuenta hecha al valor de la UI
         de hoy cuando la lectura en vivo está disponible. -->
    <VCard class="mb-8 pa-5" variant="tonal" color="primary">
      <h2 class="text-h6 font-weight-bold mb-2">El tope: {{ formatUi(SOA_COVERAGE_UI) }} UI</h2>
      <p class="text-body-2 mb-3">
        Por vehículo asegurado y por accidente (art. 8). Está fijado en unidades indexadas, así que
        en pesos se mueve todos los días con el IPC.
      </p>
      <p v-if="coverageInPesos !== null" class="text-h5 font-weight-bold mb-1">
        ≈ {{ formatPesos(coverageInPesos) }}
      </p>
      <p v-if="coverageInPesos !== null" class="text-caption mb-0">
        Al valor de la UI de hoy ({{ uiValueText }}).
        <NuxtLink :to="localePath('/indicadores/unidad-indexada')" class="text-decoration-none">
          Ver el valor de la Unidad Indexada
        </NuxtLink>
      </p>
      <p v-else class="text-caption mb-0">
        No pudimos leer el valor de la UI de hoy, así que no publicamos la equivalencia en pesos.
        <NuxtLink :to="localePath('/indicadores/unidad-indexada')" class="text-decoration-none">
          Consultá la Unidad Indexada
        </NuxtLink>
        y multiplicá por {{ formatUi(SOA_COVERAGE_UI) }}.
      </p>
    </VCard>

    <section class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-2">A quién no le paga este seguro</h2>
      <p class="text-body-2 text-medium-emphasis soa-block mb-4">
        El artículo 6 enumera quiénes <em>no</em> son terceros. No es una letra chica de la póliza:
        es la ley, y rige igual en cualquier aseguradora.
      </p>
      <VList class="bg-transparent" density="comfortable">
        <VListItem v-for="item in SOA_NON_THIRD_PARTIES" :key="item.id" class="px-0">
          <template #prepend>
            <VIcon color="error">mdi-account-cancel-outline</VIcon>
          </template>
          <VListItemTitle class="font-weight-medium text-wrap">{{ item.label }}</VListItemTitle>
          <VListItemSubtitle class="text-wrap soa-detail">
            {{ item.detail }}
            <a :href="item.url" rel="noopener noreferrer" target="_blank">{{ item.article }}</a>
          </VListItemSubtitle>
        </VListItem>
      </VList>
    </section>

    <section class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-2">Qué cubre, y qué sorprende que cubra</h2>
      <p class="text-body-2 text-medium-emphasis soa-block mb-4">
        La indemnización es por la persona, nunca por la chapa. Pero no exige que haya culpa de
        nadie.
      </p>
      <VRow>
        <VCol v-for="item in SOA_COVERED" :key="item.id" cols="12" md="6">
          <VCard class="h-100" variant="outlined">
            <VCardText>
              <div class="d-flex align-start mb-2">
                <VIcon class="mr-2" color="success">mdi-check-circle-outline</VIcon>
                <span class="font-weight-medium">{{ item.label }}</span>
              </div>
              <p class="text-body-2 mb-2 soa-detail">{{ item.detail }}</p>
              <a :href="item.url" class="text-caption" rel="noopener noreferrer" target="_blank">{{
                item.article
              }}</a>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <section class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-2">Si el otro no tenía seguro, o se fue</h2>
      <p class="text-body-2 text-medium-emphasis soa-block mb-4">
        La ley prevé el caso y el damnificado cobra igual. Lo que cambió con el tiempo es quién
        paga.
      </p>
      <VList class="bg-transparent" density="comfortable">
        <VListItem v-for="item in SOA_SPECIAL_COVERAGE" :key="item.id" class="px-0">
          <template #prepend>
            <VIcon color="info">mdi-shield-search</VIcon>
          </template>
          <VListItemTitle class="font-weight-medium text-wrap">{{ item.label }}</VListItemTitle>
          <VListItemSubtitle class="text-wrap soa-detail">
            {{ item.detail }}
            <a :href="item.url" rel="noopener noreferrer" target="_blank">{{ item.article }}</a>
          </VListItemSubtitle>
        </VListItem>
      </VList>
    </section>

    <section class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-2">Los dos plazos que corren</h2>
      <VTable class="cu-mobile-cards soa-table">
        <thead>
          <tr>
            <th>Qué</th>
            <th>Plazo</th>
            <th>Detalle</th>
            <th>Artículo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in SOA_DEADLINES" :key="item.id">
            <td data-label="Qué">{{ item.label }}</td>
            <td data-label="Plazo" class="font-weight-bold">{{ item.deadline }}</td>
            <td data-label="Detalle" class="soa-detail">{{ item.detail }}</td>
            <td data-label="Artículo">
              <a :href="item.url" rel="noopener noreferrer" target="_blank">{{ item.article }}</a>
            </td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <section class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-2">Circular sin SOA</h2>
      <p class="text-body-2 text-medium-emphasis soa-block mb-4">
        La multa no está fijada en pesos sino en veces el precio del propio seguro, así que acá va
        la regla y no una cuenta nuestra.
      </p>
      <VList class="bg-transparent" density="comfortable">
        <VListItem v-for="item in SOA_ENFORCEMENT" :key="item.id" class="px-0">
          <template #prepend>
            <VIcon color="warning">mdi-alert-outline</VIcon>
          </template>
          <VListItemTitle class="font-weight-medium text-wrap">{{ item.label }}</VListItemTitle>
          <VListItemSubtitle class="text-wrap soa-detail">
            {{ item.detail }}
            <a :href="item.url" rel="noopener noreferrer" target="_blank">{{ item.article }}</a>
          </VListItemSubtitle>
        </VListItem>
      </VList>
    </section>

    <section class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-2">Qué vehículos no lo necesitan</h2>
      <p class="text-body-2 text-medium-emphasis soa-block mb-4">
        La lista del artículo 3 es corta y cerrada. Un ciclomotor que circula por la vía pública no
        está en ella.
      </p>
      <VList class="bg-transparent" density="comfortable">
        <VListItem v-for="item in SOA_EXCLUDED_VEHICLES" :key="item.id" class="px-0">
          <template #prepend>
            <VIcon color="grey">mdi-minus-circle-outline</VIcon>
          </template>
          <VListItemTitle class="font-weight-medium text-wrap">{{ item.label }}</VListItemTitle>
          <VListItemSubtitle class="text-wrap soa-detail">
            {{ item.detail }}
            <a :href="item.url" rel="noopener noreferrer" target="_blank">{{ item.article }}</a>
          </VListItemSubtitle>
        </VListItem>
      </VList>
    </section>

    <section class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-2">El tope cambió dos veces, y ya no cambia</h2>
      <p class="text-body-2 text-medium-emphasis soa-block mb-4">
        Los dos primeros tramos se siguen citando como si fueran el tope de hoy. La escalera del
        artículo 8 terminó: el único vigente es el último.
      </p>
      <VTable class="cu-mobile-cards soa-table">
        <thead>
          <tr>
            <th>Tramo</th>
            <th>Tope</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="step in SOA_COVERAGE_STEPS" :key="step.id">
            <td data-label="Tramo">{{ step.since }}</td>
            <td data-label="Tope" class="font-weight-bold">{{ formatUi(step.ui) }} UI</td>
            <td data-label="Estado">
              <VChip :color="step.current ? 'success' : 'grey'" size="small" variant="tonal">
                {{ step.current ? 'Vigente' : 'Histórico' }}
              </VChip>
            </td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <section class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="(faq, i) in SOA_FAQ" :key="i">
          <VExpansionPanelTitle class="font-weight-medium">
            {{ faq.question }}
          </VExpansionPanelTitle>
          <VExpansionPanelText class="text-body-2">{{ faq.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <section class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que esta página no publica</h2>
      <p class="text-body-2 soa-block mb-0">
        Cuánto sale un SOA. El artículo 11 de la Ley 18.412 consagra la libertad de contratación:
        cada aseguradora fija su prima y el Banco Central aprueba condiciones y primas de referencia
        (art. 10). No hay una cifra oficial que citar, y una cuenta propia no sería un precio: sería
        una estimación nuestra con apariencia de dato. Para el costo mensual de tener un auto, con
        sus supuestos a la vista, está
        <NuxtLink :to="localePath('/conviene-auto-moto-o-omnibus-uruguay')">
          la comparación entre auto, moto y ómnibus </NuxtLink
        >.
      </p>
    </section>

    <section class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-4">Seguir por acá</h2>
      <VRow>
        <VCol v-for="link in relatedLinks" :key="link.to" cols="12" sm="6" md="4">
          <VCard :to="localePath(link.to)" class="h-100" link variant="outlined">
            <VCardText>
              <div class="font-weight-medium mb-1">{{ link.label }}</div>
              <p class="text-body-2 text-medium-emphasis mb-0">{{ link.description }}</p>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <section class="mb-6">
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <ul class="soa-sources text-body-2">
        <li v-for="source in SOA_SOURCES" :key="source.url">
          <a :href="source.url" rel="noopener noreferrer" target="_blank">{{ source.label }}</a>
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Cotejado contra el texto vigente el {{ verifiedAt }}. Esta página explica la ley; no es
        asesoramiento legal ni reemplaza a un abogado.
      </p>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import type { ExchangeRate } from '~/types/api'
import { indicators, liveIndicatorReading } from '~/utils/indicators'
import {
  SOA_COVERAGE_STEPS,
  SOA_COVERAGE_UI,
  SOA_COVERED,
  SOA_DEADLINES,
  SOA_ENFORCEMENT,
  SOA_EXCLUDED_VEHICLES,
  SOA_FAQ,
  SOA_NON_THIRD_PARTIES,
  SOA_SOURCES,
  SOA_SPECIAL_COVERAGE,
  SOA_VERIFIED_AT,
  soaCoverageInPesos,
} from '~/utils/soa'

const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()

const uiIndicator = indicators.find(ind => ind.code === 'UI')

// El tope legal está en UI, así que la equivalencia en pesos sale de la lectura EN VIVO o no sale.
// `liveIndicatorReading` devuelve `null` cuando la lectura falla, y entonces la página publica las
// unidades sin la cuenta: un valor viejo de la UI estampado como "hoy" es el error que esa función
// existe para no cometer (ver `utils/indicators.ts`).
const { data: uiReading } = await useAsyncData('soa-ui', async () => {
  if (!uiIndicator) return null
  const result = await getProcessedExchangeData('')
  const rows = (result?.exchangeData ?? []) as ExchangeRate[]
  return liveIndicatorReading(rows, uiIndicator)
})

const uiValue = computed(() => uiReading.value?.value ?? null)
const coverageInPesos = computed(() => soaCoverageInPesos(uiValue.value))

const formatUi = (n: number) => n.toLocaleString('es-UY')
const formatUiValue = (n: number) =>
  n.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
const formatPesos = (n: number) =>
  n.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

const uiValueText = computed(() => (uiValue.value === null ? null : formatUiValue(uiValue.value)))

const verifiedAt = new Date(`${SOA_VERIFIED_AT}T00:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const relatedLinks = [
  {
    to: '/multas-de-transito-y-patente-uruguay',
    label: 'Multas y patente',
    description: 'Descargo, prescripción y qué mira el SUCIVE.',
  },
  {
    to: '/comprar-auto-con-deuda-uruguay',
    label: 'Comprar un auto con deuda',
    description: 'La deuda no se hereda, pero bloquea la transferencia.',
  },
  {
    to: '/conviene-auto-moto-o-omnibus-uruguay',
    label: '¿Auto, moto u ómnibus?',
    description: 'Cuánto sale por mes cada modo, con el SOA adentro.',
  },
  {
    to: '/indicadores/unidad-indexada',
    label: 'Valor de la Unidad Indexada',
    description: 'La unidad en la que está escrito el tope de este seguro.',
  },
  {
    to: '/autos-usados-uruguay',
    label: 'Autos usados en Uruguay',
    description: 'Avisos vigentes con precio, kilómetros y versión.',
  },
  {
    to: '/monopatines-electricos-uruguay',
    label: 'Monopatines eléctricos',
    description: 'Precio y la normativa de cada departamento.',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/seguro-obligatorio-de-auto-uruguay'
const title = 'Seguro obligatorio de auto (SOA) Uruguay'
// Literal a propósito, y no armada con el tope del catálogo: así la mide el trinquete de los 155
// caracteres de `seoDescriptionBudget.test.ts`, que sólo lee descripciones literales. La sincronía
// con el catálogo la cuida `tests/unit/soa.test.ts`, que falla si el tope del snippet deja de
// coincidir con el artículo 8.
const description =
  'El SOA paga lesiones y muerte de terceros, no los daños del auto: el tope son 250.000 UI por accidente y excluye al dueño, al conductor y a su familia.'

defineOgImageComponent('Cambio', {
  title: 'Seguro obligatorio de auto (SOA)',
  subtitle: 'Qué cubre, a quién no, y el tope de 250.000 UI',
  tag: 'VEHÍCULOS',
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
        'seguro obligatorio de auto uruguay, soa uruguay, que cubre el soa, ley 18412, seguro obligatorio automotores uruguay, multa por circular sin seguro uruguay, me choco un auto sin seguro uruguay, tope del seguro obligatorio uruguay, soa ciclomotor uruguay, prescripcion reclamo soa',
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
                name: 'Comprar y mantener un auto',
                item: 'https://cambio-uruguay.com/temas/comprar-y-mantener-auto-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Seguro obligatorio de auto (SOA)',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: SOA_FAQ.map(faq => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: { '@type': 'Answer', text: faq.answer },
            })),
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            citation: SOA_SOURCES.map(source => ({
              '@type': 'CreativeWork',
              name: source.label,
              url: source.url,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.soa-intro,
.soa-block {
  max-width: 68ch;
}

.soa-detail {
  margin-top: 0.25rem;
}

.soa-sources {
  padding-left: 1.25rem;
}

.soa-sources li {
  margin-top: 0.35rem;
}

.soa-table :deep(td),
.soa-table :deep(th) {
  vertical-align: top;
}
</style>
