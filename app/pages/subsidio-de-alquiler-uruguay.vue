<!--
THESIS: «Subsidio de alquiler» en Uruguay no es una ayuda para el alquiler que ya pagás: es una
vivienda pública que se sortea y trae el subsidio adentro. Decir ese no primero es lo más útil que
la página puede hacer.
OWN-WORLD: Las dos tablas del MVOT —ingreso del hogar y tope de alquiler— pasadas a pesos con la UR
del día, al lado de la tabla del único llamado publicado, que no coincide con ninguna de las dos.
STORY: Alguien que no llega al alquiler con su sueldo entra preguntando por un trámite y sale
sabiendo que lo que hay es un llamado, cuándo mirar y con qué ingreso entra.
FIRST VIEWPORT: El no, y el tope de un dormitorio en pesos de hoy.
FORM: Página de programa estatal, hermana de /cooperativas-de-vivienda-uruguay.
-->
<template>
  <div class="subsidy-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="8">
          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">mdi-home-heart</VIcon>
              Vivienda
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
              Subsidio de alquiler en Uruguay: qué paga el Estado y quién entra
            </h1>
            <p class="text-body-1 subsidy-lead">
              Empecemos por el no, que es lo que más viaje ahorra: el Estado
              <strong>no subsidia el alquiler que ya estás pagando</strong>. El programa que existe,
              «Abriendo Puertas - Alquiler», pone en alquiler <strong>viviendas del MVOT</strong> y
              el subsidio viaja con esa vivienda. Se entra por un llamado público y, si los
              interesados superan la oferta, por sorteo.
            </p>
            <p class="text-body-1 subsidy-lead mt-3">
              Los dos números que deciden están en Unidades Reajustables, que se mueven todos los
              meses con los salarios: el alquiler de la vivienda no puede pasar de
              <strong>{{ oneBedroomCapUr }} a {{ topCapUr }} UR</strong> según los
              dormitorios<template v-if="oneBedroomPesos"
                >, o sea desde <strong>{{ oneBedroomPesos }}</strong> con la UR de hoy</template
              >, y el ingreso del hogar tiene que estar entre
              <strong>{{ incomeMinUr }} y {{ incomeMaxUr }} UR</strong>.
            </p>
            <ShareButtons
              class="mt-4"
              :url="canonicalUrl"
              text="Subsidio de alquiler en Uruguay: los topes del MVOT, en pesos"
            />
            <p class="text-caption text-medium-emphasis mt-3">
              Requisitos, topes y fechas cotejados contra las fichas del MVOT en gub.uy el
              {{ verifiedDisplay }}.
              <template v-if="urDisplay">
                La UR que usa esta página es la lectura del BCU que publica
                <NuxtLink :to="localePath('/indicadores/unidad-reajustable')" class="cu-link">
                  /indicadores </NuxtLink
                >: {{ urDisplay }}. La propia ficha del MVOT manda a consultarla en la DGI.
              </template>
              <template v-else>
                Hoy no pudimos leer el valor de la UR, así que las tablas van sólo en UR.
              </template>
            </p>
          </header>

          <VDivider class="mb-6" />

          <!-- 1. El tope de alquiler: el número que decide si una vivienda entra -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">El tope de alquiler, por dormitorios</h2>
            <p class="text-body-1 subsidy-prose mb-4">
              Es un tope de la vivienda, no de lo que vas a pagar vos: la ficha lo publica como un
              precio que no se supera. Sirve para una cosa muy concreta, y es la única cuenta que
              podés hacer antes de que abra un llamado: comparar ese techo con lo que piden hoy los
              alquileres que te interesan.
            </p>
            <VTable class="subsidy-table cu-mobile-cards mb-4" density="comfortable">
              <thead>
                <tr>
                  <th>Vivienda</th>
                  <th>Tope en UR</th>
                  <th v-if="urValue">Con la UR de hoy</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in rentRows" :key="row.bedrooms">
                  <td data-label="Vivienda">
                    {{ row.bedrooms }} {{ row.bedrooms === 1 ? 'dormitorio' : 'dormitorios' }}
                  </td>
                  <td data-label="Tope en UR">{{ row.maxUr }} UR</td>
                  <td v-if="urValue" data-label="Con la UR de hoy">{{ row.pesos }}</td>
                </tr>
              </tbody>
            </VTable>
            <p class="text-body-2 text-medium-emphasis subsidy-prose">
              Para ver contra qué se compara, el directorio de
              <NuxtLink :to="localePath('/alquileres-uruguay')" class="cu-link">
                alquileres publicados </NuxtLink
              >tiene el precio pedido de hoy, y
              <NuxtLink :to="localePath('/evolucion-precio-alquileres-uruguay')" class="cu-link">
                la evolución </NuxtLink
              >muestra cómo se movió por zona y dormitorios.
            </p>
          </section>

          <!-- 2. El ingreso del hogar: tiene piso, y eso sorprende -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              El ingreso del hogar: hay techo y hay piso
            </h2>
            <p class="text-body-1 subsidy-prose mb-4">
              El techo sube con la cantidad de integrantes, como en todos los programas del MVOT. Lo
              que no se espera es el piso:
              <strong>{{ incomeMinUr }} UR para todo tamaño de hogar</strong>. No es un descuido, es
              la lógica del programa — la parte del alquiler que el subsidio no cubre la paga quien
              alquila, así que un hogar sin ingreso formal queda fuera de esta puerta y entra por
              otras.
            </p>
            <VTable class="subsidy-table cu-mobile-cards mb-4" density="comfortable">
              <thead>
                <tr>
                  <th>Integrantes</th>
                  <th>Ingreso en UR</th>
                  <th v-if="urValue">Con la UR de hoy</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in incomeRows" :key="row.members">
                  <td data-label="Integrantes">{{ row.label }}</td>
                  <td data-label="Ingreso en UR">{{ row.minUr }} a {{ row.maxUr }} UR</td>
                  <td v-if="urValue" data-label="Con la UR de hoy">{{ row.pesos }}</td>
                </tr>
              </tbody>
            </VTable>
          </section>

          <!-- 3. El hallazgo: la tabla general no es la que rige -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              Ojo: la tabla de arriba no es la que rige en un llamado
            </h2>
            <p class="text-body-1 subsidy-prose mb-4">
              La ficha del programa lo habilita en una línea —cada llamado define sus requisitos
              específicos— y no advierte cuánto puede cambiar. El primer llamado del programa lo
              muestra: pidió <strong>{{ firstCall.rentUr }} UR de alquiler</strong> por un
              apartamento de dos dormitorios, cuando la tabla general topea los dos dormitorios en
              {{ twoBedroomCapUr }} UR y los tres en {{ topCapUr }} UR. Y movió el piso de ingreso
              de {{ incomeMinUr }} UR a 20, 25 y 30 UR según el tamaño del hogar.
            </p>
            <VAlert type="info" variant="tonal" density="comfortable" class="mb-4 on-dark">
              <p class="text-body-2 mb-0">
                <strong>{{ firstCall.name }}</strong> — {{ firstCall.dwelling }}, en
                {{ firstCall.address }}. Alquiler de {{ firstCall.rentUr }} UR<template
                  v-if="firstCallRentPesos"
                >
                  ({{ firstCallRentPesos }} con la UR de hoy)</template
                >. Abrió el {{ displayDate(firstCall.opensOn) }} y cerró el
                {{ displayDate(firstCall.closesOn) }}.
              </p>
            </VAlert>
            <VTable class="subsidy-table cu-mobile-cards mb-4" density="comfortable">
              <thead>
                <tr>
                  <th>Integrantes</th>
                  <th>Ingreso que pidió el llamado</th>
                  <th>Lo que dice la tabla general</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in callRows" :key="row.members">
                  <td data-label="Integrantes">{{ row.members }}</td>
                  <td data-label="Ingreso que pidió el llamado">
                    {{ row.callMinUr }} a {{ row.callMaxUr }} UR
                  </td>
                  <td data-label="Lo que dice la tabla general">
                    <template v-if="row.generalMinUr">
                      {{ row.generalMinUr }} a {{ row.generalMaxUr }} UR
                    </template>
                    <template v-else>—</template>
                  </td>
                </tr>
              </tbody>
            </VTable>
            <p class="text-body-2 text-medium-emphasis subsidy-prose">
              La conclusión práctica: la tabla general sirve para saber si tenés alguna chance, y la
              única cifra que decide es la de las bases del llamado abierto. Las dos se publican acá
              enteras, con el enlace a cada ficha, en vez de elegir una.
            </p>
          </section>

          <!-- 4. A quién va dirigido y qué piden -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">A quién va dirigido</h2>
            <ul class="subsidy-list mb-5">
              <li v-for="group in priorityGroups" :key="group">{{ group }}</li>
            </ul>
            <h3 class="text-h6 font-weight-bold mb-3">Lo que piden además del ingreso</h3>
            <ul class="subsidy-list">
              <li v-for="requirement in requirements" :key="requirement.id">
                <strong>{{ requirement.label }}</strong> — {{ requirement.detail }}
              </li>
            </ul>
            <p class="text-body-2 text-medium-emphasis subsidy-prose mt-4">
              La categoría 5 del BCU y el clearing no son lo mismo, y la diferencia decide
              postulaciones:
              <NuxtLink :to="localePath('/salir-del-clearing')" class="cu-link">
                cómo salir del clearing </NuxtLink
              >explica los dos registros por separado.
            </p>
          </section>

          <!-- 5. Lo que no publicamos -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Tres cosas que acá no vas a encontrar</h2>
            <p class="text-body-1 subsidy-prose mb-4">
              Porque no las pudimos sostener con una fuente oficial vigente, y una cifra sin fuente
              en una decisión de vivienda es peor que ninguna.
            </p>
            <ul class="subsidy-list">
              <li v-for="item in unpublished" :key="item.id">
                <strong>{{ item.what }}</strong> — {{ item.why }}
              </li>
            </ul>
          </section>

          <!-- 6. FAQ -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Preguntas frecuentes</h2>
            <VExpansionPanels variant="accordion">
              <VExpansionPanel v-for="faq in faqs" :key="faq.id" :title="faq.question">
                <template #text>
                  <p class="text-body-2 subsidy-faq">{{ faq.answer }}</p>
                </template>
              </VExpansionPanel>
            </VExpansionPanels>
          </section>

          <!-- 7. Fuentes y vecinos -->
          <section class="mb-4">
            <h2 class="text-h5 font-weight-bold mb-3">Fuentes</h2>
            <ul class="subsidy-list mb-6">
              <li v-for="source in sources" :key="source.id">
                <a :href="source.url" target="_blank" rel="noopener noreferrer" class="cu-link">{{
                  source.label
                }}</a>
                <template v-if="source.shownAt">
                  — la ficha muestra la fecha {{ displayDate(source.shownAt) }}
                </template>
              </li>
            </ul>
            <p class="text-body-2 subsidy-prose">
              Si lo que necesitás es firmar un contrato en el mercado y no te alcanza la garantía,
              la comparación está en
              <NuxtLink :to="localePath('/garantia-de-alquiler-uruguay')" class="cu-link">
                garantía de alquiler </NuxtLink
              >; si el problema es el recibo de sueldo,
              <NuxtLink :to="localePath('/alquilar-sin-recibo-de-sueldo')" class="cu-link">
                alquilar sin recibo </NuxtLink
              >. Y la otra puerta pública a la vivienda, con el mismo tope en UR, son
              <NuxtLink :to="localePath('/cooperativas-de-vivienda-uruguay')" class="cu-link">
                las cooperativas de vivienda </NuxtLink
              >. Las demás páginas del tema están en
              <NuxtLink :to="localePath('/temas/alquiler-y-vivienda-uruguay')" class="cu-link">
                Alquiler y vivienda en Uruguay </NuxtLink
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
  RENTAL_SUBSIDY_FAQ,
  RENTAL_SUBSIDY_PATH,
  RENTAL_SUBSIDY_TITLE,
  RENTAL_SUBSIDY_VERIFIED_AT,
  SUBSIDY_FIRST_CALL,
  SUBSIDY_INCOME_BANDS,
  SUBSIDY_INCOME_MAX_UR,
  SUBSIDY_INCOME_MIN_UR,
  SUBSIDY_ONE_BEDROOM_CAP_UR,
  SUBSIDY_PRIORITY_GROUPS,
  SUBSIDY_RENT_CAPS,
  SUBSIDY_REQUIREMENTS,
  SUBSIDY_SOURCES,
  SUBSIDY_TOP_CAP_UR,
  SUBSIDY_UNPUBLISHED,
  rentalSubsidyDescription,
  subsidyUrInPesos,
} from '~/utils/rentalSubsidy'

const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()

const faqs = RENTAL_SUBSIDY_FAQ
const sources = SUBSIDY_SOURCES
const requirements = SUBSIDY_REQUIREMENTS
const unpublished = SUBSIDY_UNPUBLISHED
const priorityGroups = SUBSIDY_PRIORITY_GROUPS
const firstCall = SUBSIDY_FIRST_CALL
const incomeMinUr = SUBSIDY_INCOME_MIN_UR
const incomeMaxUr = SUBSIDY_INCOME_MAX_UR
const oneBedroomCapUr = SUBSIDY_ONE_BEDROOM_CAP_UR
const topCapUr = SUBSIDY_TOP_CAP_UR
const twoBedroomCapUr = SUBSIDY_RENT_CAPS[1]!.maxUr

/**
 * La UR del día, leída igual que en `/indicadores` y en `/cooperativas-de-vivienda-uruguay`:
 * `liveIndicatorReading` devuelve `null` cuando la lectura falla, y ese `null` es el que decide
 * que la página no imprima ningún peso. Un tope convertido con un valor viejo y rotulado «hoy» es
 * el error que esta página no se puede permitir, porque es el número con el que alguien decide si
 * espera un llamado o no.
 */
const { data: ur } = await useAsyncData('rental-subsidy-ur', async () => {
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

const pesosOf = (ur: number): string | null => {
  const value = subsidyUrInPesos(ur, urValue.value)
  return value === null ? null : formatPesos(value)
}

const rentRows = computed(() =>
  SUBSIDY_RENT_CAPS.map(cap => ({
    bedrooms: cap.bedrooms,
    maxUr: cap.maxUr,
    pesos: pesosOf(cap.maxUr) ?? '—',
  }))
)

const incomeRows = computed(() =>
  SUBSIDY_INCOME_BANDS.map(band => {
    const low = pesosOf(band.minUr)
    const high = pesosOf(band.maxUr)
    return {
      members: band.members,
      label: band.members >= 5 ? '5 o más' : String(band.members),
      minUr: band.minUr,
      maxUr: band.maxUr,
      pesos: low && high ? `${low} a ${high}` : '—',
    }
  })
)

/** El llamado al lado de la tabla general, fila por fila, sin arbitrar entre las dos. */
const callRows = computed(() =>
  firstCall.incomeBands.map(band => {
    const general = SUBSIDY_INCOME_BANDS.find(row => row.members === band.members)
    return {
      members: band.members,
      callMinUr: band.minUr,
      callMaxUr: band.maxUr,
      generalMinUr: general?.minUr ?? null,
      generalMaxUr: general?.maxUr ?? null,
    }
  })
)

const oneBedroomPesos = computed(() => pesosOf(oneBedroomCapUr))
const firstCallRentPesos = computed(() => pesosOf(firstCall.rentUr))

const displayDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedDisplay = displayDate(RENTAL_SUBSIDY_VERIFIED_AT)

const canonicalUrl = `https://cambio-uruguay.com${RENTAL_SUBSIDY_PATH}`

const title = RENTAL_SUBSIDY_TITLE
// La descripción lleva la cifra del día cuando la UR se pudo leer, y vuelve a la variante en UR
// cuando no. Las dos se miden contra los 155 caracteres en `rentalSubsidy.test.ts`.
const description = computed(() => rentalSubsidyDescription(urValue.value))

defineOgImageComponent('Cambio', {
  title: 'Subsidio de alquiler en Uruguay',
  subtitle: `Tope de alquiler: ${oneBedroomCapUr} a ${topCapUr} UR`,
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
        'subsidio de alquiler uruguay, abriendo puertas alquiler mvot, subsidio de alquiler mvot requisitos, llamado alquiler mvot, tope de alquiler en ur, ingresos para subsidio de alquiler, alquiler social uruguay, vivienda publica en alquiler uruguay',
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
                name: 'Alquiler y vivienda en Uruguay',
                item: 'https://cambio-uruguay.com/temas/alquiler-y-vivienda-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Subsidio de alquiler',
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
            dateModified: RENTAL_SUBSIDY_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            citation: sources.map(source => ({
              '@type': 'WebPage',
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
.subsidy-lead,
.subsidy-prose {
  max-width: 68ch;
}
.subsidy-list {
  padding-left: 1.1rem;
  max-width: 72ch;
}
.subsidy-list li {
  margin-top: 0.5rem;
}
.subsidy-faq {
  margin-top: 0;
  max-width: 72ch;
}
.subsidy-table :deep(th) {
  font-weight: 700;
  white-space: nowrap;
}
.cu-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.cu-link:hover {
  text-decoration: underline;
}
</style>
