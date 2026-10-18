<template>
  <div class="coop-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="8">
          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">mdi-home-group</VIcon>
              Vivienda
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
              Cooperativas de vivienda en Uruguay: cuánto podés ganar para entrar
            </h1>
            <p class="text-body-1 coop-lead">
              El MVOT no pide un ingreso mínimo: pone un <strong>techo</strong>, y lo escribe en
              Unidades Reajustables, que se mueven todos los meses con los salarios. Para un hogar
              de cinco son <strong>{{ maxUr }} UR</strong
              ><template v-if="maxPesos"
                >, o sea <strong>{{ maxPesos }}</strong> con la UR de hoy</template
              >. Y para hogares de una y dos personas
              <strong>las dos fichas oficiales no dicen lo mismo</strong>.
            </p>
            <ShareButtons
              class="mt-4"
              :url="canonicalUrl"
              text="Cooperativas de vivienda en Uruguay: el tope de ingresos, en pesos"
            />
            <p class="text-caption text-medium-emphasis mt-3">
              Requisitos y pasos cotejados contra las fichas del MVOT y de la ANV en gub.uy el
              {{ verifiedDisplay }}.
              <template v-if="urDisplay">
                La UR que usa esta página es la lectura del BCU que publica
                <NuxtLink :to="localePath('/indicadores/unidad-reajustable')" class="cu-link">
                  /indicadores </NuxtLink
                >: {{ urDisplay }}.
              </template>
              <template v-else>
                Hoy no pudimos leer el valor de la UR, así que la tabla va sólo en UR.
              </template>
            </p>
          </header>

          <VDivider class="mb-6" />

          <!-- 1. El número que decide la consulta -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">El tope de ingresos del hogar</h2>
            <p class="text-body-1 coop-prose mb-4">
              Es un tope del ingreso de <em>todo</em> el núcleo, no de cada socio, y sube con la
              cantidad de integrantes. La ficha del esquema general del MVOT titula su columna
              «Ingresos máximos del hogar en UR»: es un máximo, no un piso.
            </p>
            <VTable class="coop-table cu-mobile-cards mb-4" density="comfortable">
              <thead>
                <tr>
                  <th>Integrantes</th>
                  <th>Tope en UR</th>
                  <th v-if="urValue">Con la UR de hoy</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in capRows" :key="row.members">
                  <td data-label="Integrantes">{{ row.members }}</td>
                  <td data-label="Tope en UR">
                    <template v-if="row.agrees">{{ row.programaUr }} UR</template>
                    <template v-else>
                      {{ row.programaUr }} UR o {{ row.esquemaUr }} UR
                      <VIcon size="x-small" color="warning" class="ms-1">mdi-alert-outline</VIcon>
                    </template>
                  </td>
                  <td v-if="urValue" data-label="Con la UR de hoy">{{ row.pesos }}</td>
                </tr>
              </tbody>
            </VTable>
            <VAlert type="warning" variant="tonal" density="comfortable" class="mb-4">
              <p class="text-body-2 coop-alert">
                <strong>El Estado se contradice en las dos primeras filas.</strong> La ficha del
                «Programa Cooperativas» abre en 60 UR para un integrante y 66 para dos; la ficha
                «Esquema de ingresos para el acceso a la vivienda», del mismo ministerio, abre en 40
                y 60. De tres integrantes en adelante las dos coinciden. No promediamos ni elegimos
                la más alta: las publicamos las dos, porque un hogar de una o dos personas que
                planifica con la cifra equivocada planifica mal. La que manda en un llamado concreto
                es la de su resolución de apertura, y es lo que conviene preguntarle al IAT.
              </p>
            </VAlert>
          </section>

          <!-- 2. Los requisitos -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Lo demás que pide el MVOT</h2>
            <VCard
              v-for="rule in requirements"
              :key="rule.id"
              variant="outlined"
              class="coop-card pa-4 mb-3"
            >
              <p class="text-subtitle-1 font-weight-bold coop-card-title">{{ rule.label }}</p>
              <p class="text-body-2 coop-card-body">{{ rule.detail }}</p>
            </VCard>
          </section>

          <!-- 3. El camino, y quién resuelve cada paso -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">El camino, y quién decide en cada paso</h2>
            <p class="text-body-1 coop-prose mb-4">
              No es un solo organismo: la personería la da el Registro de Personas Jurídicas, la
              regularidad y el sorteo son del MVOT, y la factibilidad, el proyecto, la escritura y
              la obra son de la ANV. Saber a quién reclamarle es la mitad del trámite.
            </p>
            <ol class="coop-steps">
              <li v-for="step in steps" :key="step.id">
                <div class="coop-step-title d-flex flex-wrap align-center ga-2">
                  <span class="text-subtitle-2 font-weight-bold">{{ step.name }}</span>
                  <VChip size="x-small" variant="tonal">{{ step.who }}</VChip>
                </div>
                <p class="text-body-2 coop-step-body">{{ step.detail }}</p>
              </li>
            </ol>
            <VAlert type="info" variant="tonal" density="comfortable" class="mt-4">
              <p class="text-body-2 coop-alert">
                <strong>Aprobar el anteproyecto no es tener el préstamo.</strong> Lo que da el
                anteproyecto aprobado es el derecho a entrar en el sorteo que hace el MVOT entre las
                cooperativas que además tengan el certificado de regularidad vigente. La que no sale
                tiene que presentar una Declaratoria en la ANV, dentro de la fecha límite de
                presentación de anteproyectos, para volver a participar en el siguiente.
              </p>
            </VAlert>
          </section>

          <!-- 4. Lo que no publicamos -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Cuatro cifras que acá no vas a encontrar</h2>
            <p class="text-body-1 coop-prose mb-4">
              Porque no pudimos sostenerlas con una fuente oficial vigente, y una cifra sin fuente
              en una decisión de este tamaño es peor que ninguna.
            </p>
            <ul class="coop-list">
              <li v-for="item in unpublished" :key="item.id">
                <strong>{{ item.label }}</strong> — {{ item.why }}
              </li>
            </ul>
          </section>

          <!-- 5. FAQ -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Preguntas frecuentes</h2>
            <VExpansionPanels variant="accordion">
              <VExpansionPanel v-for="faq in faqs" :key="faq.question" :title="faq.question">
                <template #text>
                  <p class="text-body-2 coop-faq">{{ faq.answer }}</p>
                </template>
              </VExpansionPanel>
            </VExpansionPanels>
          </section>

          <!-- 6. Fuentes y vecinos -->
          <section class="mb-4">
            <h2 class="text-h5 font-weight-bold mb-3">Fuentes</h2>
            <ul class="coop-list mb-6">
              <li v-for="source in sources" :key="source.id">
                <a :href="source.url" target="_blank" rel="noopener noreferrer" class="cu-link">{{
                  source.label
                }}</a>
                <template v-if="source.shownAt">
                  — la ficha muestra la fecha {{ displayDate(source.shownAt) }}
                </template>
              </li>
            </ul>
            <p class="text-body-2 coop-prose">
              Si lo que comparás es la cooperativa contra comprar con un crédito, la cuenta está en
              <NuxtLink :to="localePath('/prestamo-hipotecario-uruguay')" class="cu-link">
                el préstamo hipotecario </NuxtLink
              >y en
              <NuxtLink :to="localePath('/comprar-o-alquilar-uruguay')" class="cu-link">
                comprar o alquilar </NuxtLink
              >. Las demás páginas del tema están en
              <NuxtLink :to="localePath('/temas/comprar-vivienda-uruguay')" class="cu-link">
                Comprar vivienda en Uruguay </NuxtLink
              >.
            </p>
          </section>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ExchangeRate } from '~/types/api'
import { indicatorFromSlug, liveIndicatorReading } from '~/utils/indicators'
import {
  COOP_FAQ,
  COOP_INCOME_CAPS,
  COOP_MAX_UR,
  COOP_PATH,
  COOP_REQUIREMENTS,
  COOP_SOURCES,
  COOP_STEPS,
  COOP_TITLE,
  COOP_UNPUBLISHED,
  COOP_VERIFIED_AT,
  coopCapAgrees,
  coopCapInPesos,
  coopDescription,
} from '~/utils/housingCooperatives'

const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()

const requirements = COOP_REQUIREMENTS
const steps = COOP_STEPS
const unpublished = COOP_UNPUBLISHED
const faqs = COOP_FAQ
const sources = COOP_SOURCES
const maxUr = COOP_MAX_UR

/**
 * La UR del día, leída igual que en `/indicadores`: `liveIndicatorReading` devuelve `null` cuando
 * la lectura falla, y ese `null` es el que decide que la página no imprima ningún peso. Un tope
 * convertido con un valor viejo y rotulado «hoy» es el único error que esta página no puede
 * permitirse, porque es el número con el que alguien decide si se anota o no.
 */
const { data: ur } = await useAsyncData('coop-ur', async () => {
  const indicator = indicatorFromSlug('unidad-reajustable')
  if (!indicator) return null
  const result = await getProcessedExchangeData('')
  const rows = (result?.exchangeData ?? []) as ExchangeRate[]
  return liveIndicatorReading(rows, indicator)
})

const urValue = computed<number | null>(() => ur.value?.value ?? null)

const formatPesos = (value: number): string =>
  value.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

const urDisplay = computed(() =>
  urValue.value
    ? urValue.value.toLocaleString('es-UY', {
        style: 'currency',
        currency: 'UYU',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : null
)

const capRows = computed(() =>
  COOP_INCOME_CAPS.map(cap => {
    const pesos = coopCapInPesos(cap, urValue.value)
    return {
      members: cap.members,
      programaUr: cap.programaUr,
      esquemaUr: cap.esquemaUr,
      agrees: coopCapAgrees(cap),
      pesos: pesos
        ? pesos.low === pesos.high
          ? formatPesos(pesos.high)
          : `${formatPesos(pesos.low)} a ${formatPesos(pesos.high)}`
        : '—',
    }
  })
)

const maxPesos = computed(() => {
  const pesos = coopCapInPesos(COOP_INCOME_CAPS[COOP_INCOME_CAPS.length - 1]!, urValue.value)
  return pesos ? formatPesos(pesos.high) : null
})

const displayDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedDisplay = displayDate(COOP_VERIFIED_AT)

const canonicalUrl = `https://cambio-uruguay.com${COOP_PATH}`

const title = COOP_TITLE
// La descripción lleva la cifra del día cuando la UR se pudo leer, y vuelve a la variante en UR
// cuando no. Las dos se miden contra los 155 caracteres en `housingCooperatives.test.ts`.
const description = computed(() => coopDescription(urValue.value))

defineOgImageComponent('Cambio', {
  title: 'Cooperativas de vivienda en Uruguay',
  subtitle: `Tope de ingresos del hogar: hasta ${COOP_MAX_UR} UR`,
  tag: 'VIVIENDA',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description: () => description.value,
  ogTitle: title,
  ogDescription: () => description.value,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: () => description.value,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'cooperativas de vivienda uruguay, como entrar a una cooperativa de vivienda, tope de ingresos cooperativa vivienda, requisitos cooperativa de vivienda mvot, sorteo de prestamos cooperativas mvot, instituto de asistencia tecnica iat, certificado de regularidad cooperativa, anteproyecto anv cooperativa',
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
                name: 'Comprar vivienda en Uruguay',
                item: 'https://cambio-uruguay.com/temas/comprar-vivienda-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Cooperativas de vivienda',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqs.map(faq => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: { '@type': 'Answer', text: faq.answer },
            })),
          },
          {
            '@type': 'Article',
            headline: title,
            description: description.value,
            inLanguage: 'es-UY',
            dateModified: COOP_VERIFIED_AT,
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            citation: sources.map(source => ({
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
/* Vuetify 4 no anula el margen de los bloques de texto y éste no colapsa dentro de una tarjeta ni
   de un item de flex: cada bloque declara el suyo (DESIGN.md → "The Text Block Owns Its Top
   Margin Rule"). */
.coop-lead,
.coop-prose,
.coop-alert,
.coop-faq,
.coop-card-title,
.coop-step-title {
  margin-top: 0;
}

.coop-lead {
  font-size: 1.0625rem;
  line-height: 1.7;
}

.coop-prose {
  line-height: 1.7;
}

.coop-card-title {
  margin-bottom: 0.35rem;
}

.coop-card-body {
  margin-top: 0;
  margin-bottom: 0;
  line-height: 1.65;
}

.coop-list {
  padding-left: 1.25rem;
  line-height: 1.7;
}

.coop-list li + li {
  margin-top: 0.6rem;
}

.coop-steps {
  padding-left: 1.25rem;
}

.coop-steps li + li {
  margin-top: 1rem;
}

.coop-step-title {
  margin-bottom: 0.25rem;
}

.coop-step-body {
  margin-top: 0;
  margin-bottom: 0;
  line-height: 1.65;
}

.coop-table :deep(th) {
  font-weight: 700;
}
</style>
