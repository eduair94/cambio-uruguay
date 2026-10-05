<template>
  <VContainer class="car-abroad">
    <VRow justify="center">
      <VCol cols="12" md="10">
        <header class="mb-6">
          <VChip class="mb-3" color="primary" size="small" variant="tonal">
            <VIcon start size="small">mdi-car-side</VIcon>
            Auto y frontera
          </VChip>
          <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
            Llevar el auto a Brasil o Argentina: la carta verde y los papeles que te piden
          </h1>
          <p class="lead">
            Afuera no te piden el SOA. Te piden <strong>otro seguro</strong>, el del Mercosur que
            todo el mundo llama carta verde, y la letra chica es que una póliza uruguaya
            <strong>vale sólo en los países donde tu aseguradora tenga representante</strong>. Abajo
            están los seis documentos que la norma enumera, quién puede manejarlo, cuánto puede
            quedarse el auto y los casos en los que el régimen no te ampara.
          </p>
          <p class="note-text text-medium-emphasis">
            Fuentes leídas una por una el {{ verifiedAt }}. Esta página no publica ningún precio de
            la carta verde: la venden aseguradoras privadas, la prima cambia por compañía, vehículo
            y plazo, y no hay arancel oficial que citar.
          </p>
        </header>

        <VCard variant="outlined" class="note-card pa-4 mb-8">
          <h2 class="text-h6 font-weight-bold mb-2">Los dos seguros, que no son el mismo</h2>
          <p class="section-intro">
            El SOA cubre hasta
            <strong>{{ formatUi(SOA_COVERAGE_UI) }} unidades indexadas</strong> por vehículo y por
            accidente<template v-if="soaPesos">
              —{{ pesos(soaPesos) }} al valor de la UI de hoy<template v-if="uiDate">
                ({{ fecha(uiDate) }})</template
              >—</template
            >, y es el que exige Uruguay para circular acá. La carta verde es el que exige el país
            al que entrás. Tener uno no te da el otro.
          </p>
          <p v-if="!soaPesos" class="table-note text-medium-emphasis">
            No pudimos leer el valor de la UI en este momento, así que el tope queda en unidades
            indexadas, como lo escribe la ley. Lo podés ver en
            <NuxtLink :to="localePath('/indicadores/unidad-indexada')" class="car-abroad-link">
              la página de la UI </NuxtLink
            >.
          </p>
          <ul class="plain-list">
            <li v-for="row in insurance" :key="row.id">
              <strong>{{ row.label }}.</strong> {{ row.detail }}
              <a
                v-if="row.source"
                :href="row.source.url"
                target="_blank"
                rel="noopener noreferrer"
                class="source-tag"
                >{{ row.source.short }}</a
              >
            </li>
          </ul>
        </VCard>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-2">
            Los seis documentos que pide la norma
            <VChip size="x-small" variant="tonal" class="ml-1">
              {{ documents.length }}
            </VChip>
          </h2>
          <p class="section-intro text-medium-emphasis">
            El protocolo los lista para «circular en un Estado Parte diferente al del registro o
            matrícula del vehículo», o sea que es la misma lista en los dos sentidos: lo que Uruguay
            le pide a un auto argentino es lo que Argentina le pide al tuyo.
          </p>
          <ol class="plain-list">
            <li v-for="row in documents" :key="row.id">
              <strong>{{ row.label }}.</strong> {{ row.detail }}
              <a
                v-if="row.source"
                :href="row.source.url"
                target="_blank"
                rel="noopener noreferrer"
                class="source-tag"
                >{{ row.source.short }}</a
              >
            </li>
          </ol>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-2">¿Lo puede manejar otro?</h2>
          <p class="section-intro text-medium-emphasis">
            Sí, y la respuesta tiene una condición que sorprende: el cónyuge y los familiares no
            necesitan poder, pero el conductor sí tiene que residir en el país donde está
            matriculado el auto.
          </p>
          <ul class="plain-list">
            <li v-for="row in drivers" :key="row.id">
              <strong>{{ row.label }}.</strong> {{ row.detail }}
              <a
                v-if="row.source"
                :href="row.source.url"
                target="_blank"
                rel="noopener noreferrer"
                class="source-tag"
                >{{ row.source.short }}</a
              >
            </li>
          </ul>
        </section>

        <VCard variant="outlined" class="gap-card pa-4 mb-8">
          <h2 class="text-h6 font-weight-bold mb-2">
            {{ CAR_ABROAD_STAY_DISCREPANCY.question }}
          </h2>
          <p class="section-intro">
            Dos fuentes oficiales uruguayas lo contestan distinto, y acá van las dos sin elegir
            ninguna: resolverlo por nuestra cuenta sería inventar la regla que la administración no
            unificó.
          </p>
          <ul class="plain-list">
            <li v-for="reading in stayReadings" :key="reading.label">
              <strong>{{ reading.label }}.</strong> {{ reading.detail }}
              <a
                v-if="reading.source"
                :href="reading.source.url"
                target="_blank"
                rel="noopener noreferrer"
                class="source-tag"
                >{{ reading.source.short }}</a
              >
            </li>
          </ul>
          <p class="table-note text-medium-emphasis">
            En lo demás coinciden, y son los tres casos de borde que siguen.
          </p>
          <ul class="plain-list">
            <li v-for="row in stayRules" :key="row.id">
              <strong>{{ row.label }}.</strong> {{ row.detail }}
              <a
                v-if="row.source"
                :href="row.source.url"
                target="_blank"
                rel="noopener noreferrer"
                class="source-tag"
                >{{ row.source.short }}</a
              >
            </li>
          </ul>
        </VCard>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-2">Cuándo el régimen no te ampara</h2>
          <p class="section-intro text-medium-emphasis">
            En estos casos el vehículo queda «en situación irregular», y las sanciones las aplica la
            ley del país donde se detecte la infracción.
          </p>
          <ul class="plain-list">
            <li v-for="row in exclusions" :key="row.id">
              <strong>{{ row.label }}.</strong> {{ row.detail }}
              <a
                v-if="row.source"
                :href="row.source.url"
                target="_blank"
                rel="noopener noreferrer"
                class="source-tag"
                >{{ row.source.short }}</a
              >
            </li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-2">Lo que esta página no dice</h2>
          <ul class="plain-list">
            <li>
              <strong>Cuánto sale la carta verde.</strong> No hay arancel oficial: la emiten
              aseguradoras privadas autorizadas por el BCU y cada una pone su prima. Pedí cotización
              nombrando el país y las fechas del viaje.
            </li>
            <li>
              <strong>Qué multa te ponen del otro lado.</strong> La norma del seguro es común a los
              Estados Parte, pero el control y las sanciones las aplica cada país con su propia ley,
              y acá no se leyó ninguna fuente brasileña ni argentina.
            </li>
            <li>
              <strong>Si tu póliza actual ya cubre el Mercosur.</strong> Depende de que tu
              aseguradora tenga el acuerdo de representación del artículo 4 en ese país concreto. Es
              una pregunta para tu aseguradora, no para una guía.
            </li>
          </ul>
        </section>

        <section class="mb-8">
          <h2 class="text-h5 font-weight-bold mb-2">Antes de salir, lo que ya sale del sitio</h2>
          <ul class="plain-list">
            <li>
              <NuxtLink
                :to="localePath('/llevar-dolares-o-reales-a-brasil')"
                class="car-abroad-link"
              >
                Llevar dólares o reales a Brasil
              </NuxtLink>
              — las dos puntas con los precios de hoy y el recargo del turismo medido contra el
              PTAX.
            </li>
            <li>
              <NuxtLink
                :to="localePath('/declarar-dinero-en-efectivo-uruguay')"
                class="car-abroad-link"
              >
                Declarar dinero en efectivo
              </NuxtLink>
              — desde qué monto hay que declararlo al cruzar.
            </li>
            <li>
              <NuxtLink :to="localePath('/peajes-uruguay')" class="car-abroad-link">
                Peajes
              </NuxtLink>
              y
              <NuxtLink :to="localePath('/precio-de-la-nafta-uruguay')" class="car-abroad-link">
                precio de la nafta
              </NuxtLink>
              — lo que cuesta el tramo uruguayo del viaje.
            </li>
            <li>
              <NuxtLink
                :to="localePath('/multas-de-transito-y-patente-uruguay')"
                class="car-abroad-link"
              >
                Multas y patente
              </NuxtLink>
              — el protocolo recuerda que las multas del SUCIVE se ven en su web y su app.
            </li>
            <li>
              <NuxtLink :to="localePath('/franquicia-viajero-uruguay')" class="car-abroad-link">
                Franquicia del viajero
              </NuxtLink>
              — cuánta mercadería podés traer de vuelta sin pagar impuestos.
            </li>
          </ul>
        </section>

        <VCard variant="outlined" class="pa-4">
          <h2 class="text-h6 font-weight-bold mb-2">
            <VIcon start size="small">mdi-file-document-outline</VIcon>
            Fuentes
          </h2>
          <p class="sources-note text-medium-emphasis">
            Las cinco son oficiales uruguayas y se leyeron el {{ verifiedAt }}. Cada afirmación de
            arriba lleva al lado la que la sostiene.
          </p>
          <ul class="sources-list">
            <li v-for="source in CAR_ABROAD_SOURCES" :key="source.id">
              <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
              <span v-if="source.dated" class="text-medium-emphasis">
                — {{ fecha(source.dated) }}
              </span>
            </li>
          </ul>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
import type { ExchangeRate } from '~/types/api'
import {
  CAR_ABROAD_DOCUMENTS,
  CAR_ABROAD_DRIVERS,
  CAR_ABROAD_EXCLUSIONS,
  CAR_ABROAD_INSURANCE,
  CAR_ABROAD_SOURCES,
  CAR_ABROAD_STAY_DISCREPANCY,
  CAR_ABROAD_STAY_RULES,
  CAR_ABROAD_VERIFIED_AT,
  SOA_COVERAGE_UI,
  soaCoverageInPesos,
  sourceById,
} from '~/utils/carAbroad'
import { indicatorFromSlug, liveIndicatorReading } from '~/utils/indicators'

const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()

/**
 * La UI de hoy, y SÓLO la lectura viva.
 *
 * `currentIndicatorValue` cae al valor de referencia del catálogo, que tiene meses: publicarlo
 * junto a «al valor de la UI de hoy» estamparía una cifra vieja con fecha de hoy. Sin lectura, el
 * tope se publica en UI, que es como lo escribe la ley.
 */
const { data: ui } = await useAsyncData('car-abroad-ui', async () => {
  const indicator = indicatorFromSlug('unidad-indexada')
  if (!indicator) return null
  const result = await getProcessedExchangeData('')
  const rows = (result?.exchangeData ?? []) as ExchangeRate[]
  return liveIndicatorReading(rows, indicator)
})

const soaPesos = computed(() => soaCoverageInPesos(ui.value?.value))
const uiDate = computed(() => ui.value?.date ?? null)

/**
 * Cada fila con su fuente ya resuelta.
 *
 * Se hace acá y no en el template para que el enlace al pie de cada afirmación salga del mismo
 * id que el test verifica: una fila cuya fuente no resuelve no imprime un enlace roto, no imprime
 * nada, y el test de `rowsWithUnknownSource()` es el que la delata antes de publicarse.
 */
const withSource = <T extends { sourceId: string }>(rows: readonly T[]) =>
  rows.map(row => ({ ...row, source: sourceById(row.sourceId) }))

const insurance = withSource(CAR_ABROAD_INSURANCE)
const documents = withSource(CAR_ABROAD_DOCUMENTS)
const drivers = withSource(CAR_ABROAD_DRIVERS)
const exclusions = withSource(CAR_ABROAD_EXCLUSIONS)
const stayRules = withSource(CAR_ABROAD_STAY_RULES)
const stayReadings = withSource(CAR_ABROAD_STAY_DISCREPANCY.readings)

const formatUi = (n: number): string => n.toLocaleString('es-UY')

const pesos = (n: number): string =>
  n.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

const fecha = (iso: string): string =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedAt = fecha(CAR_ABROAD_VERIFIED_AT)

const canonicalUrl = 'https://cambio-uruguay.com/llevar-el-auto-a-brasil-o-argentina'
const title = 'Carta verde: llevar el auto a Brasil'
const description =
  'Afuera no te piden el SOA sino la carta verde del Mercosur, y vale sólo si tu aseguradora tiene representante en ese país. Los 6 papeles que lleva el auto.'

defineOgImageComponent('Cambio', {
  title: 'Llevar el auto a Brasil o Argentina',
  subtitle: 'La carta verde del Mercosur y los seis papeles que pide la norma',
  tag: 'AUTO Y FRONTERA',
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
        'carta verde uruguay, carta verde mercosur, llevar el auto a brasil, llevar el auto a argentina, seguro para viajar a brasil en auto, requisitos para salir de uruguay en auto, tarjeta verde seguro, sacar el auto del pais uruguay, papeles para cruzar la frontera en auto, decreto 8/997',
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
                name: 'Llevar el auto a Brasil o Argentina',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            dateModified: CAR_ABROAD_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            citation: CAR_ABROAD_SOURCES.map(source => ({
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
/* Vuetify 4 no cero los márgenes de los bloques de texto, y un <p> que sigue a un hermano se come
   cualquier separación menor a 1em: por eso cada bloque declara el suyo. Ver app/AGENTS.md. */
.lead {
  font-size: 1.075rem;
  line-height: 1.6;
  max-width: 72ch;
  margin-top: 0;
}
.section-intro,
.note-text,
.table-note,
.sources-note {
  max-width: 76ch;
  margin-top: 0;
}
.note-text,
.table-note,
.sources-note {
  font-size: 0.85rem;
  line-height: 1.5;
}
.table-note {
  margin-top: 0.75rem;
}
.plain-list {
  margin-top: 0.75rem;
  padding-left: 1.25rem;
}
.plain-list li {
  margin-bottom: 0.75rem;
  line-height: 1.55;
  max-width: 76ch;
}
.sources-list {
  margin-top: 0.5rem;
  padding-left: 1.25rem;
}
.sources-list li {
  margin-bottom: 0.5rem;
  line-height: 1.5;
  font-size: 0.9rem;
}
.note-card {
  border: 1px solid rgba(var(--v-theme-primary), 0.28);
  border-radius: 12px;
}
.gap-card {
  border: 1px solid rgba(var(--v-theme-warning), 0.35);
  border-radius: 12px;
}
.source-tag {
  display: inline-block;
  margin-left: 0.35rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  white-space: nowrap;
}
.source-tag::before {
  content: '↗ ';
}
.source-tag:hover {
  text-decoration: underline;
}
.car-abroad-link {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
  text-decoration: none;
}
.car-abroad-link:hover {
  text-decoration: underline;
}
</style>
