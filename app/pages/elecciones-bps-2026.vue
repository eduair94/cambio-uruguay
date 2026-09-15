<template>
  <VContainer class="bps-elections py-6" style="max-width: 900px">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Elecciones del BPS 2026', disabled: true },
      ]"
    />

    <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
      Elecciones del BPS 2026: quién vota y cuánto es la multa
    </h1>

    <p class="text-body-1 mb-4" style="max-width: 68ch">
      {{ WHAT_IS_ELECTED }} Se vota el domingo {{ electionLongDate }}.
    </p>

    <!-- La cuenta regresiva sólo existe en el cliente: Date.now() en SSR desajustaría la hidratación. -->
    <VCard variant="flat" class="date-card pa-5 pa-md-6 mb-6">
      <div class="d-flex align-center flex-wrap ga-4">
        <VIcon icon="mdi-calendar-check" color="primary" size="36" />
        <div>
          <div class="text-overline text-medium-emphasis">Día de la elección</div>
          <div class="text-h6 font-weight-bold">{{ electionLongDate }}</div>
          <ClientOnly>
            <div class="text-body-2 text-medium-emphasis">
              <template v-if="daysLeft > 0">Faltan {{ daysLeft }} días.</template>
              <template v-else-if="daysLeft === 0">Es hoy.</template>
              <template v-else
                >Ya se votó; el plazo para justificar cierra el 21 de enero de 2027.</template
              >
            </div>
          </ClientOnly>
        </div>
      </div>
    </VCard>

    <!-- ¿Tengo que votar? -->
    <h2 class="text-h6 font-weight-bold mb-2">¿Tengo que votar?</h2>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      Hay tres órdenes con padrón propio, cada uno con su corte al 28 de febrero de 2026.
    </p>
    <VRow class="mb-2">
      <VCol v-for="v in VOTERS" :key="v.orden" cols="12" md="4">
        <VCard variant="flat" class="voter-card pa-4 h-100">
          <div class="text-subtitle-1 font-weight-bold mb-2">{{ v.orden }}</div>
          <p class="text-body-2 mb-1">{{ v.who }}</p>
          <p class="text-caption text-medium-emphasis mb-3">Padrón al {{ longDate(v.cutoff) }}.</p>
          <div class="text-caption text-medium-emphasis font-weight-medium mb-1">
            No están en este padrón:
          </div>
          <ul class="excluded-list">
            <li v-for="e in v.excluded" :key="e">{{ e }}</li>
          </ul>
        </VCard>
      </VCol>
    </VRow>

    <VAlert type="info" variant="tonal" class="mb-6" density="comfortable">
      <div class="text-subtitle-2 font-weight-bold mb-1">No están obligados a votar</div>
      <ul class="mb-0">
        <li v-for="e in EXEMPT" :key="e">{{ e }}</li>
      </ul>
    </VAlert>

    <!-- La multa en pesos -->
    <h2 class="text-h6 font-weight-bold mb-2">La multa en pesos, hoy</h2>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      La multa se fija en unidades reajustables (UR); lo que se paga en pesos depende de la UR
      vigente el día del cobro.
    </p>
    <div class="table-wrap mb-3">
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th scope="col">Quién</th>
            <th scope="col">Multa</th>
            <th v-if="urKnown" scope="col">En pesos hoy</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in FINES" :key="f.who">
            <td data-label="Quién" class="font-weight-medium" style="min-width: 220px">
              {{ f.who }}
              <div class="text-caption text-medium-emphasis">{{ f.note }}</div>
            </td>
            <td data-label="Multa">{{ urLabel(f.ur) }} UR</td>
            <td v-if="urKnown" data-label="En pesos hoy" class="font-weight-medium">
              {{ pesosLabel(f.ur) }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </div>
    <VAlert v-if="!urKnown" type="warning" variant="tonal" density="comfortable" class="mb-6">
      No pudimos leer el valor de la UR en este momento. Consultalo en
      <NuxtLink :to="localePath('/indicadores/unidad-reajustable')" class="cu-link">
        el valor de la UR hoy
      </NuxtLink>
      y multiplicalo por la cantidad de UR de la tabla.
    </VAlert>
    <p v-else class="text-caption text-medium-emphasis mb-6">
      Calculado con
      <NuxtLink :to="localePath('/indicadores/unidad-reajustable')" class="cu-link">
        el valor de la UR hoy </NuxtLink
      >. El monto real es el que liquide el BPS el día del cobro.
    </p>

    <!-- Calendario -->
    <h2 class="text-h6 font-weight-bold mb-2">Calendario electoral</h2>
    <VTimeline side="end" density="compact" class="mb-6">
      <VTimelineItem v-for="c in CALENDAR" :key="c.from" size="x-small" dot-color="primary">
        <div class="text-subtitle-2 font-weight-bold">
          {{ longDate(c.from) }}<template v-if="c.to"> al {{ longDate(c.to) }}</template>
        </div>
        <p class="text-body-2 mb-0">{{ c.label }}</p>
      </VTimelineItem>
    </VTimeline>

    <!-- Cómo justificar -->
    <h2 class="text-h6 font-weight-bold mb-2">Cómo justificar el no voto</h2>
    <p class="text-body-2 mb-2" style="max-width: 68ch">
      Ante la Corte Electoral, entre el 23 de noviembre de 2026 y el 21 de enero de 2027, con alguna
      de estas causales:
    </p>
    <ul class="causes-list mb-6">
      <li v-for="c in JUSTIFICATION_CAUSES" :key="c">{{ c }}</li>
    </ul>

    <div class="d-flex flex-wrap ga-3 mb-6">
      <VBtn
        href="https://www.bps.gub.uy/24209/elecciones-de-directores-sociales-2026.html"
        target="_blank"
        rel="noopener"
        color="primary"
        variant="tonal"
        prepend-icon="mdi-open-in-new"
      >
        Consultar el padrón en el BPS
      </VBtn>
      <VBtn
        href="https://www.gub.uy/corte-electoral/comunicacion/publicaciones/calendario-electoral-elecciones-bps-2026"
        target="_blank"
        rel="noopener"
        variant="tonal"
        prepend-icon="mdi-open-in-new"
      >
        Calendario en la Corte Electoral
      </VBtn>
    </div>

    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

    <h2 class="text-h6 font-weight-bold mt-8 mb-2">De dónde sale esto</h2>
    <p class="text-body-2 text-medium-emphasis mb-2" style="max-width: 68ch">
      Contrastado contra el BPS y la Corte Electoral. Última lectura: {{ verifiedAt }}.
    </p>
    <ul class="sources mb-6">
      <li v-for="src in BPS_ELECTIONS_SOURCES" :key="src.url">
        <a :href="src.url" target="_blank" rel="noopener" class="cu-link">{{ src.label }}</a>
      </li>
    </ul>

    <h2 class="text-h6 font-weight-bold mb-2">Seguir leyendo</h2>
    <div class="d-flex flex-wrap ga-3 mb-4">
      <NuxtLink :to="localePath('/indicadores/unidad-reajustable')" class="cu-link">
        Valor de la UR hoy
      </NuxtLink>
      <NuxtLink :to="localePath('/devolucion-fonasa-uruguay')" class="cu-link">
        Devolución de FONASA
      </NuxtLink>
      <NuxtLink :to="localePath('/cuando-me-puedo-jubilar-uruguay')" class="cu-link">
        Cuándo me puedo jubilar
      </NuxtLink>
      <NuxtLink :to="localePath('/asignacion-familiar-uruguay')" class="cu-link">
        Asignación familiar
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
  BPS_ELECTIONS_FAQ,
  BPS_ELECTIONS_SOURCES,
  BPS_ELECTIONS_VERIFIED_AT,
  CALENDAR,
  ELECTION_DATE,
  EXEMPT,
  FINES,
  JUSTIFICATION_CAUSES,
  VOTERS,
  WHAT_IS_ELECTED,
  fineInPesos,
} from '~/utils/bpsElections'

const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()
const ur = indicatorFromSlug('unidad-reajustable')!

// Igual que /indicadores/[indicador]: el número en pesos SÓLO si la UR vino viva; null → sólo UR.
// `currentIndicatorValue` nunca devuelve null: si no hay fila UR cae al `referenceValue` estático
// del catálogo (1921.36), así que la guarda real hay que hacerla ACÁ, mirando las filas crudas.
const { data: urValue } = await useAsyncData('elecciones-bps-ur', async () => {
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

const pesos = (n: number | readonly number[]): Array<number | null> =>
  Array.isArray(n)
    ? n.map(x => fineInPesos(x, urValue.value))
    : [fineInPesos(n as number, urValue.value)]

const fmt = (n: number | null) =>
  n == null
    ? null
    : n.toLocaleString('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 })

const urLabel = (fineUr: number | readonly number[]) =>
  Array.isArray(fineUr) ? fineUr.join(', ') : String(fineUr)

const pesosLabel = (fineUr: number | readonly number[]): string => {
  const values = pesos(fineUr)
  const formatted = values.map(fmt)
  return formatted.some(v => v == null) ? '—' : (formatted as string[]).join(' / ')
}

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedAt = longDate(BPS_ELECTIONS_VERIFIED_AT)
const electionLongDate = longDate(ELECTION_DATE)

const daysLeft = computed(() =>
  Math.ceil((Date.parse(`${ELECTION_DATE}T12:00:00-03:00`) - Date.now()) / 86_400_000)
)

const faq = BPS_ELECTIONS_FAQ as FaqItem[]

const canonicalUrl = 'https://cambio-uruguay.com/elecciones-bps-2026'
const title = 'Elecciones del BPS 2026: quién vota y multa'
const description = computed(() => {
  const one = fmt(fineInPesos(1, urValue.value))
  // ≤ 160 caracteres: Google corta la description y el resto no lo lee nadie. Lo que sobrevive al
  // recorte es la fecha, que es obligatorio y cuánto cuesta faltar.
  return `Domingo 22 de noviembre de 2026, voto obligatorio. La multa por no votar es de 1 UR${one ? ` (hoy ${one})` : ''}; 2 UR para públicos y de 6 a 20 UR para empresas.`
})

defineOgImageComponent('Cambio', {
  title: 'Elecciones del BPS 2026',
  subtitle: 'Domingo 22 de noviembre · voto obligatorio',
  tag: 'BPS',
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
        'elecciones bps, elecciones bps 2026, elecciones bps obligatorias, multa por no votar bps, elecciones bps circuitos, padron elecciones bps, quienes votan elecciones bps, justificar no voto bps',
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
                name: 'Elecciones del BPS 2026',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description: description.value,
            inLanguage: 'es-UY',
            dateModified: BPS_ELECTIONS_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            citation: BPS_ELECTIONS_SOURCES.map(s => ({
              '@type': 'WebPage',
              name: s.label,
              url: s.url,
            })),
          },
          {
            '@type': 'Event',
            name: 'Elecciones de directores sociales del BPS 2026',
            startDate: ELECTION_DATE,
            eventStatus: 'https://schema.org/EventScheduled',
            location: { '@type': 'Country', name: 'Uruguay' },
            organizer: { '@type': 'GovernmentOrganization', name: 'Banco de Previsión Social' },
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
.excluded-list,
.causes-list {
  padding-left: 1.1rem;
  margin: 0;
}
.excluded-list li,
.causes-list li {
  font-size: 0.85rem;
  margin-bottom: 2px;
}
.date-card,
.voter-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 1);
}
</style>
