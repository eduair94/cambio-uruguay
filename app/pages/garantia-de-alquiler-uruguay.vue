<template>
  <VContainer class="rental-guarantee py-6" style="max-width: 960px">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Garantía de alquiler', disabled: true },
      ]"
    />

    <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
      Garantía de alquiler en Uruguay: cuánto cuesta cada opción
    </h1>

    <p class="intro text-body-1 mb-4" style="max-width: 68ch">
      Hay tres garantías del Estado, las privadas y un régimen para alquilar sin ninguna. Las del
      Estado son las únicas con precio publicado: una comisión mensual del 3 % del alquiler
      <strong>a cada parte</strong>. Sus topes están en unidades reajustables, así que acá van
      convertidos a pesos con la UR de hoy.
    </p>

    <!-- Los topes en pesos: el número que ningún organismo publica -->
    <VCard variant="flat" class="benchmark-card pa-5 pa-md-6 mb-6">
      <div class="d-flex align-center ga-3 mb-1">
        <VIcon icon="mdi-home-percent-outline" color="primary" size="32" />
        <div class="text-subtitle-1 font-weight-bold">Los topes del Estado, en pesos</div>
      </div>
      <p v-if="urKnown" class="text-body-2 text-medium-emphasis mb-4">
        Calculado con
        <NuxtLink :to="localePath('/indicadores/unidad-reajustable')" class="cu-link">
          el valor de la UR de hoy </NuxtLink
        >. La UR se actualiza todos los meses, así que estos montos se mueven con ella.
      </p>
      <p v-else class="text-body-2 text-medium-emphasis mb-4">
        No pudimos leer el valor de la UR en este momento, así que los topes van sólo en UR.
        Consultá
        <NuxtLink :to="localePath('/indicadores/unidad-reajustable')" class="cu-link">
          el valor de la UR de hoy </NuxtLink
        >y multiplicalo por la cantidad de la tabla.
      </p>
      <VRow dense>
        <VCol v-for="b in UR_BENCHMARKS" :key="b.id" cols="12" sm="6" md="4">
          <div class="benchmark pa-3 h-100">
            <div class="text-caption text-medium-emphasis">{{ b.label }}</div>
            <div class="text-h6 font-weight-bold">
              {{ urText(b.ur) }} UR<template v-if="urKnown"> · {{ pesosText(b.ur) }}</template>
            </div>
            <div class="text-caption text-medium-emphasis mt-1">{{ b.note }}</div>
          </div>
        </VCol>
      </VRow>
    </VCard>

    <!-- La comparación -->
    <h2 class="text-h6 font-weight-bold mb-2">Las cinco opciones, comparadas</h2>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      Un guion significa que el emisor no publica esa cifra. Las garantías privadas cotizan caso a
      caso y no publican precio, así que acá tampoco hay uno inventado.
    </p>
    <div class="table-wrap mb-6">
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th scope="col">Opción</th>
            <th scope="col">Para quién</th>
            <th scope="col">Tope de alquiler</th>
            <th scope="col">Comisión mensual</th>
            <th scope="col">Depósito</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in GUARANTEE_OPTIONS" :key="o.id">
            <td data-label="Opción" class="font-weight-medium" style="min-width: 190px">
              {{ o.name }}
              <div class="text-caption text-medium-emphasis">{{ issuerLabel(o.issuer) }}</div>
            </td>
            <td data-label="Para quién" style="min-width: 220px">{{ o.who }}</td>
            <td data-label="Tope de alquiler" style="min-width: 160px">
              <template v-if="o.maxRentUr != null">
                <span class="font-weight-medium">
                  {{ urText(o.maxRentUr) }} UR<template v-if="urKnown">
                    · {{ pesosText(o.maxRentUr) }}</template
                  >
                </span>
              </template>
              <template v-else>—</template>
              <div v-if="o.maxRentNote" class="text-caption text-medium-emphasis">
                {{ o.maxRentNote }}
              </div>
            </td>
            <td data-label="Comisión mensual">
              <template v-if="o.monthlyFeePct != null">
                {{ o.monthlyFeePct }} % a cada parte
              </template>
              <template v-else>—</template>
            </td>
            <td data-label="Depósito">
              <template v-if="o.depositPct != null">
                {{ o.depositPct }} % de la garantía, por única vez
              </template>
              <template v-else>—</template>
            </td>
          </tr>
        </tbody>
      </VTable>
    </div>

    <!-- Cuánto se lleva el 3 % -->
    <h2 class="text-h6 font-weight-bold mb-2">Qué se lleva el 3 % en un mes</h2>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      La comisión de la CGN se cobra a las dos partes, así que sobre el alquiler el servicio se
      lleva el doble del porcentaje que figura en el folleto. Sobre tres alquileres de ejemplo:
    </p>
    <div class="table-wrap mb-6">
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th scope="col">Alquiler mensual</th>
            <th scope="col">Paga el inquilino</th>
            <th scope="col">Paga el propietario</th>
            <th scope="col">Total al año</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rent in FEE_EXAMPLES" :key="rent">
            <td data-label="Alquiler mensual" class="font-weight-medium">{{ money(rent) }}</td>
            <td data-label="Paga el inquilino">{{ money(feeFor(rent)) }}</td>
            <td data-label="Paga el propietario">{{ money(feeFor(rent)) }}</td>
            <td data-label="Total al año">{{ money(yearlyFeeFor(rent)) }}</td>
          </tr>
        </tbody>
      </VTable>
    </div>

    <!-- El detalle de cada una -->
    <h2 class="text-h6 font-weight-bold mb-3">Qué pide cada una</h2>
    <VExpansionPanels variant="accordion" class="mb-6">
      <VExpansionPanel v-for="o in GUARANTEE_OPTIONS" :key="o.id">
        <VExpansionPanelTitle>
          <span class="font-weight-medium">{{ o.name }}</span>
        </VExpansionPanelTitle>
        <VExpansionPanelText>
          <p class="text-body-2 mb-2">{{ o.who }}</p>
          <ul class="req-list mb-3">
            <li v-for="r in o.requirements" :key="r">{{ r }}</li>
          </ul>
          <a :href="o.source.url" target="_blank" rel="noopener" class="cu-link text-body-2">
            {{ o.source.label }}
          </a>
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>

    <VAlert type="info" variant="tonal" density="comfortable" class="mb-6">
      <div class="text-subtitle-2 font-weight-bold mb-1">
        Alquilar sin garantía no es alquilar sin contrato
      </div>
      <!-- El párrafo sigue a un hermano, así que conserva el `margin-block: 1em` del navegador y se
           iría 16px abajo del título del callout: la regla de DESIGN.md, el bloque se declara el
           suyo. -->
      <p class="callout-body mb-0 text-body-2">
        El régimen de la Ley 19.889 exige contrato escrito con el plazo y el precio expresos y el
        acuerdo por escrito de las dos partes de someterse a esa ley. A cambio, el arrendador no
        puede exigir más de un mes de alquiler adelantado, y es nula la cláusula que le haga
        renunciar al inquilino, por anticipado, a los plazos de desalojo y lanzamiento.
      </p>
    </VAlert>

    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

    <h2 class="text-h6 font-weight-bold mt-8 mb-2">De dónde sale esto</h2>
    <p class="text-body-2 text-medium-emphasis mb-2" style="max-width: 68ch">
      Cada cifra de esta página está leída de la fuente oficial del programa. Última lectura:
      {{ verifiedAt }}. Lo que el emisor no publica queda como un guion: ninguna garantía privada
      publica su precio y acá no hay ninguno estimado.
    </p>
    <ul class="sources mb-6">
      <li v-for="src in RENTAL_GUARANTEE_SOURCES" :key="src.url">
        <a :href="src.url" target="_blank" rel="noopener" class="cu-link">{{ src.label }}</a>
      </li>
    </ul>

    <h2 class="text-h6 font-weight-bold mb-2">Seguir leyendo</h2>
    <div class="d-flex flex-wrap ga-3 mb-4">
      <NuxtLink :to="localePath('/primer-alquiler-uruguay')" class="cu-link">
        Guía del primer alquiler
      </NuxtLink>
      <NuxtLink :to="localePath('/alquilar-sin-recibo-de-sueldo')" class="cu-link">
        Alquilar sin recibo de sueldo
      </NuxtLink>
      <NuxtLink :to="localePath('/alquilar-estando-en-clearing')" class="cu-link">
        Alquilar estando en clearing
      </NuxtLink>
      <NuxtLink :to="localePath('/indicadores/unidad-reajustable')" class="cu-link">
        Valor de la UR hoy
      </NuxtLink>
      <NuxtLink :to="localePath('/alquileres-uruguay')" class="cu-link">
        Alquileres publicados hoy
      </NuxtLink>
    </div>
  </VContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ExchangeRate } from '~/types/api'
import { currentIndicatorValue, indicatorFromSlug } from '~/utils/indicators'
import type { FaqItem } from '~/utils/faqAnswers'
import {
  GUARANTEE_OPTIONS,
  RENTAL_GUARANTEE_FAQ,
  RENTAL_GUARANTEE_SOURCES,
  RENTAL_GUARANTEE_VERIFIED_AT,
  UR_BENCHMARKS,
  monthlyFeeInPesos,
  urToPesos,
  type GuaranteeIssuer,
} from '~/utils/rentalGuarantee'

const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()
const ur = indicatorFromSlug('unidad-reajustable')!

// Mismo recaudo que /elecciones-bps-2026: `currentIndicatorValue` nunca devuelve null (cae al
// `referenceValue` estático del catálogo), así que la guarda de "vino viva" se hace ACÁ, mirando
// las filas crudas. Sin UR viva la página muestra los topes sólo en UR y lo dice.
const { data: urValue } = await useAsyncData('garantia-alquiler-ur', async () => {
  const result = await getProcessedExchangeData('')
  const rows = (result?.exchangeData ?? []) as ExchangeRate[]
  const live = rows.some(
    r =>
      r.code === ur.code &&
      ((typeof r.sell === 'number' && r.sell > 0) || (typeof r.buy === 'number' && r.buy > 0))
  )
  return live ? currentIndicatorValue(rows, ur) : null
})

const urKnown = computed(() => urValue.value != null)

const money = (n: number | null) =>
  n == null
    ? '—'
    : n.toLocaleString('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 })

const urText = (value: number) => value.toLocaleString('es-UY', { maximumFractionDigits: 1 })

const pesosText = (value: number) => money(urToPesos(value, urValue.value))

const issuerLabel = (issuer: GuaranteeIssuer) =>
  issuer === 'estado' ? 'Del Estado' : issuer === 'privado' ? 'Privada' : 'Régimen de contrato'

// Tres alquileres redondos para que la cuenta del 3 % se vea sin calculadora. No son datos de
// mercado ni una afirmación sobre precios: son los ejemplos de la cuenta, y el encabezado lo dice.
const FEE_EXAMPLES = [20000, 30000, 45000] as const
const CGN_FEE_PCT = 3

const feeFor = (rent: number) => monthlyFeeInPesos(rent, CGN_FEE_PCT)
const yearlyFeeFor = (rent: number) => {
  const fee = monthlyFeeInPesos(rent, CGN_FEE_PCT)
  return fee == null ? null : fee * 2 * 12
}

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedAt = longDate(RENTAL_GUARANTEE_VERIFIED_AT)
const faq = RENTAL_GUARANTEE_FAQ as FaqItem[]

const canonicalUrl = 'https://cambio-uruguay.com/garantia-de-alquiler-uruguay'
// 58 caracteres con la marca puesta, dentro de los 60 que publica Google (`seoTitleBudget`). Lleva
// el número porque es lo que se mide: un snippet con la cifra del día corre a ~1,4 % de CTR y uno
// genérico a 0,03–0,2 % desde la misma posición.
const title = 'Garantía de alquiler Uruguay: 3 % mensual'
// El número del día en el snippet: el tope del FGA en pesos con la UR viva. Sin UR se cae al tope
// en UR, que sigue siendo un dato concreto. ≤ 160 caracteres para que Google no lo corte.
const description = computed(() => {
  const cap = urToPesos(18, urValue.value)
  const capText = cap == null ? '18 UR' : `18 UR (hoy ${money(cap)})`
  return `La garantía del Estado cuesta 3 % del alquiler por mes a cada parte y cubre hasta ${capText}; 22,5 UR de 18 a 29 años. Requisitos, depósito y alternativas.`
})

defineOgImageComponent('Cambio', {
  title: 'Garantía de alquiler en Uruguay',
  subtitle: '3 % mensual a cada parte · tope de 18 UR',
  tag: 'Alquileres',
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
        'garantia de alquiler uruguay, garantia de alquiler anda, fondo de garantia de alquiler, garantia contaduria general de la nacion, cuanto cuesta la garantia de alquiler, alquilar sin garantia uruguay, ley 19889 arrendamiento sin garantia, garantia de alquiler para jovenes',
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
                name: 'Garantía de alquiler',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description: description.value,
            inLanguage: 'es-UY',
            dateModified: RENTAL_GUARANTEE_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            citation: RENTAL_GUARANTEE_SOURCES.map(s => ({
              '@type': 'WebPage',
              name: s.label,
              url: s.url,
            })),
          },
          {
            '@type': 'FAQPage',
            mainEntity: RENTAL_GUARANTEE_FAQ.map(item => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer },
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
.intro {
  margin-top: 0;
}
.callout-body {
  margin-top: 4px;
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
.req-list {
  padding-left: 1.1rem;
  margin: 0;
}
.req-list li {
  font-size: 0.9rem;
  margin-bottom: 4px;
}
.benchmark-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 1);
}
.benchmark {
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 10px;
}
</style>
