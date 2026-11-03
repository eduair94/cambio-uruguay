<template>
  <VContainer class="small-claims py-6" style="max-width: 900px">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Reclamar sin abogado', disabled: true },
      ]"
    />

    <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
      Reclamar sin abogado en Uruguay: hasta cuánto y por qué vía
    </h1>

    <p class="text-body-1 mb-4" style="max-width: 68ch">
      La regla del Código General del Proceso es que hay que comparecer con abogado en todos los
      actos del proceso, y el escrito sin su firma se rechaza de plano. Pero hay dos excepciones con
      tope, las dos escritas en unidades reajustables: un reclamo de consumo por la Ley 18.507 y los
      asuntos de cuantía menor a 20 UR ante Juzgados de Paz y de Conciliación.
    </p>

    <!-- Los dos topes, en pesos de hoy -->
    <VCard variant="flat" class="cap-card pa-5 pa-md-6 mb-6">
      <div class="text-overline text-medium-emphasis mb-2">El tope, en pesos de hoy</div>
      <VRow>
        <VCol v-for="r in SMALL_CLAIM_ROUTES" :key="r.id" cols="12" sm="6">
          <div class="text-subtitle-2 font-weight-bold">{{ r.label }}</div>
          <div class="text-h6 font-weight-bold text-primary">
            {{ r.capUr }} UR<template v-if="pesosLabel(r.capUr)">
              · {{ pesosLabel(r.capUr) }}</template
            >
          </div>
          <div class="text-caption text-medium-emphasis">{{ r.articulo }}</div>
        </VCol>
      </VRow>
      <VDivider class="my-4" />
      <p v-if="urKnown" class="text-caption text-medium-emphasis mb-0">
        Calculado con
        <NuxtLink :to="localePath('/indicadores/unidad-reajustable')" class="cu-link">
          el valor de la UR hoy </NuxtLink
        >. Lo que manda es la UR vigente el día del reclamo.
      </p>
      <p v-else class="text-caption text-medium-emphasis mb-0">
        No pudimos leer el valor de la UR en este momento. Consultalo en
        <NuxtLink :to="localePath('/indicadores/unidad-reajustable')" class="cu-link">
          el valor de la UR hoy </NuxtLink
        >y multiplicalo por las UR de cada fila.
      </p>
    </VCard>

    <!-- Las dos puertas -->
    <h2 class="text-h6 font-weight-bold mb-2">Las dos puertas, y en qué se diferencian</h2>
    <div class="table-wrap mb-6">
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th scope="col">Vía</th>
            <th scope="col">Qué entra</th>
            <th scope="col">Ante quién</th>
            <th scope="col">Conciliación previa</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in SMALL_CLAIM_ROUTES" :key="r.id">
            <td data-label="Vía" class="font-weight-medium" style="min-width: 180px">
              {{ r.label }}
              <div class="text-caption text-medium-emphasis">{{ r.articulo }}</div>
            </td>
            <td data-label="Qué entra">{{ r.scope }}</td>
            <td data-label="Ante quién">{{ r.court }}</td>
            <td data-label="Conciliación previa">
              {{ r.conciliacionPrevia ? 'Sí, antes de demandar' : 'No se exige' }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </div>

    <!-- El proceso de consumo -->
    <h2 class="text-h6 font-weight-bold mb-2">El reclamo de consumo, paso por paso</h2>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      Es el procedimiento sumario del artículo 2 de la Ley 18.507, y casi todos sus plazos están en
      la propia ley.
    </p>
    <VTimeline side="end" density="compact" class="mb-6">
      <VTimelineItem
        v-for="s in CONSUMER_CLAIM_STEPS"
        :key="s.id"
        size="x-small"
        dot-color="primary"
      >
        <div class="text-subtitle-2 font-weight-bold">{{ s.label }}</div>
        <p class="text-body-2 mb-1">{{ s.detail }}</p>
        <div class="text-caption text-medium-emphasis">{{ s.articulo }}</div>
      </VTimelineItem>
    </VTimeline>

    <!-- El timbre -->
    <h2 class="text-h6 font-weight-bold mb-2">Cuánto sale: el timbre del 1 %</h2>
    <VCard variant="flat" class="cap-card pa-4 pa-md-5 mb-6">
      <VRow class="align-center">
        <VCol cols="12" sm="6">
          <VTextField
            v-model.number="amount"
            type="number"
            min="0"
            step="100"
            label="Monto que reclamás"
            prefix="$"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6">
          <div class="text-overline text-medium-emphasis">Timbre del Poder Judicial</div>
          <div class="text-h6 font-weight-bold text-primary">{{ stampLabel }}</div>
          <div class="text-caption text-medium-emphasis">{{ capVerdict }}</div>
        </VCol>
      </VRow>
      <VDivider class="my-4" />
      <p class="text-caption text-medium-emphasis mb-0">
        El artículo 4 de la Ley 18.507 dice que las partes «sólo deberán reponer un timbre»
        equivalente al 1 % del monto reclamado. Las costas y costos son, en principio, del vencido
        (art. 2.5).
      </p>
    </VCard>

    <!-- Qué tiene que decir el escrito -->
    <h2 class="text-h6 font-weight-bold mb-2">Qué tiene que decir el escrito</h2>
    <p class="text-body-2 text-medium-emphasis mb-2" style="max-width: 68ch">
      El artículo 2.1 de la Ley 18.507 le pide los requisitos del artículo 117 del CGP, más el monto
      máximo reclamado.
    </p>
    <ol class="content-list mb-6">
      <li v-for="item in CLAIM_CONTENT" :key="item">{{ item }}</li>
    </ol>

    <!-- Inasistencias -->
    <h2 class="text-h6 font-weight-bold mb-2">Si una de las partes no va a la audiencia</h2>
    <div class="table-wrap mb-6">
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th scope="col">Quién falta</th>
            <th scope="col">Qué pasa</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in ABSENCE_OUTCOMES" :key="a.who">
            <td data-label="Quién falta" class="font-weight-medium" style="min-width: 150px">
              {{ a.who }}
              <div class="text-caption text-medium-emphasis">{{ a.articulo }}</div>
            </td>
            <td data-label="Qué pasa">{{ a.outcome }}</td>
          </tr>
        </tbody>
      </VTable>
    </div>

    <!-- Conciliación previa -->
    <h2 class="text-h6 font-weight-bold mb-2">Conciliación previa: de qué asuntos se exceptúa</h2>
    <p class="text-body-2 mb-2" style="max-width: 68ch">
      Antes de iniciar cualquier otro proceso hay que pedir audiencia de conciliación ante el
      Juzgado de Paz o de Conciliación del domicilio del demandado (CGP art. 293). Estos asuntos
      quedan afuera (CGP art. 294):
    </p>
    <ul class="content-list mb-6">
      <li v-for="e in CONCILIATION_EXCEPTIONS" :key="e">{{ e }}</li>
    </ul>

    <VAlert type="info" variant="tonal" density="comfortable" class="mb-6">
      Esta página resume el texto de las normas que cita y no es asesoramiento legal: qué vía te
      sirve depende de tu caso. Si el monto pasa el tope o el asunto no es de consumo, el escrito
      necesita firma de abogado.
    </VAlert>

    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

    <h2 class="text-h6 font-weight-bold mt-8 mb-2">De dónde sale esto</h2>
    <p class="text-body-2 text-medium-emphasis mb-2" style="max-width: 68ch">
      Todo lo de arriba sale del texto actualizado de las normas en IMPO. Última lectura:
      {{ verifiedAt }}.
    </p>
    <ul class="sources mb-6">
      <li v-for="src in SMALL_CLAIMS_SOURCES" :key="src.url">
        <a :href="src.url" target="_blank" rel="noopener" class="cu-link">{{ src.label }}</a>
      </li>
    </ul>

    <h2 class="text-h6 font-weight-bold mb-2">Seguir leyendo</h2>
    <div class="d-flex flex-wrap ga-3 mb-4">
      <NuxtLink :to="localePath('/defensa-al-consumidor-uruguay')" class="cu-link">
        Defensa del Consumidor: qué puede y qué no
      </NuxtLink>
      <NuxtLink :to="localePath('/derechos-consumidor-compras-online')" class="cu-link">
        Derechos en compras online
      </NuxtLink>
      <NuxtLink :to="localePath('/guias/abogado-gratis-uruguay')" class="cu-link">
        Abogado gratis en Uruguay
      </NuxtLink>
      <NuxtLink :to="localePath('/a-quien-le-reclamo-uruguay')" class="cu-link">
        A quién le reclamo
      </NuxtLink>
      <NuxtLink :to="localePath('/indicadores/unidad-reajustable')" class="cu-link">
        Valor de la UR hoy
      </NuxtLink>
    </div>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ExchangeRate } from '~/types/api'
import { currentIndicatorValue, indicatorFromSlug } from '~/utils/indicators'
import type { FaqItem } from '~/utils/faqAnswers'
import {
  ABSENCE_OUTCOMES,
  CLAIM_CONTENT,
  CONCILIATION_EXCEPTIONS,
  CONSUMER_CLAIM_CAP_UR,
  CONSUMER_CLAIM_STEPS,
  SMALL_CLAIMS_FAQ,
  SMALL_CLAIMS_SOURCES,
  SMALL_CLAIMS_VERIFIED_AT,
  SMALL_CLAIM_ROUTES,
  consumerClaimStamp,
  smallClaimPesos,
} from '~/utils/smallClaims'

const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()
const ur = indicatorFromSlug('unidad-reajustable')!

// Igual que /elecciones-bps-2026: `currentIndicatorValue` nunca devuelve null (cae al
// `referenceValue` estático del catálogo), así que la guarda de "UR viva" se hace acá, mirando las
// filas crudas. Sin UR viva la página publica sólo las UR y no un peso inventado.
const { data: urValue } = await useAsyncData('reclamar-sin-abogado-ur', async () => {
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

const fmt = (n: number | null) =>
  n == null
    ? null
    : n.toLocaleString('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 })

const pesosLabel = (capUr: number) => fmt(smallClaimPesos(capUr, urValue.value))

// `useAsyncData` ya está esperado arriba, así que al renderizar (en el servidor y en el cliente)
// el valor de la UR ya está resuelto: el snippet se puede armar con constantes y queda legible
// para `seoDescriptionBudget.test.ts`, que mide el texto fijo de las descripciones de plantilla.
const consumerCapPesos = smallClaimPesos(CONSUMER_CLAIM_CAP_UR, urValue.value)
const capNote = consumerCapPesos ? ` (hoy ${fmt(consumerCapPesos)})` : ''

const amount = ref(20000)

const stampLabel = computed(() => fmt(consumerClaimStamp(amount.value)) ?? '—')

const capVerdict = computed(() => {
  if (consumerCapPesos == null)
    return `El tope de la vía de consumo es ${CONSUMER_CLAIM_CAP_UR} UR.`
  if (!Number.isFinite(amount.value) || amount.value <= 0)
    return `El tope de la vía de consumo es ${CONSUMER_CLAIM_CAP_UR} UR${capNote}.`
  return amount.value <= consumerCapPesos
    ? `Entra en las ${CONSUMER_CLAIM_CAP_UR} UR de la Ley 18.507${capNote}.`
    : `Pasa las ${CONSUMER_CLAIM_CAP_UR} UR de la Ley 18.507${capNote}: hace falta abogado.`
})

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedAt = longDate(SMALL_CLAIMS_VERIFIED_AT)
const faq = SMALL_CLAIMS_FAQ as unknown as FaqItem[]

const canonicalUrl = 'https://cambio-uruguay.com/reclamar-sin-abogado-uruguay'
// ≤ 60 con la marca: el tope es lo único que decide si seguís leyendo o llamás a un abogado.
const title = consumerCapPesos
  ? `Reclamar sin abogado: hasta ${fmt(consumerCapPesos)}`
  : 'Reclamar sin abogado: el tope es 100 UR'
const seoDescription = `Hasta 100 UR${capNote} el reclamo de consumo va al Juzgado de Paz sin abogado, con timbre del 1 % y un año de plazo. Fuera del consumo, 20 UR.`

defineOgImageComponent('Cambio', {
  title: 'Reclamar sin abogado',
  subtitle: 'Consumo hasta 100 UR · el resto, 20 UR',
  tag: 'Consumo',
})

useSeoMeta({
  title: `${title} | Cambio Uruguay`,
  description: seoDescription,
  ogTitle: title,
  ogDescription: seoDescription,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: seoDescription,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'reclamar sin abogado uruguay, demandar sin abogado uruguay, juzgado de paz uruguay reclamo, ley 18507, proceso de menor cuantia consumo uruguay, cuanto puedo reclamar sin abogado, conciliacion previa uruguay, timbre poder judicial uruguay',
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
                name: 'Reclamar sin abogado',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: 'Reclamar sin abogado en Uruguay: hasta cuánto y por qué vía',
            description: seoDescription,
            inLanguage: 'es-UY',
            dateModified: SMALL_CLAIMS_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            citation: SMALL_CLAIMS_SOURCES.map(s => ({
              '@type': 'Legislation',
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
.content-list {
  padding-left: 1.2rem;
  margin: 0;
}
.content-list li {
  font-size: 0.9rem;
  margin-bottom: 4px;
}
.cap-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 1);
}
</style>
