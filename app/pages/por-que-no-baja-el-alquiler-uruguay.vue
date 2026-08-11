<template>
  <VContainer class="housing-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">MERCADO</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Se construye por todos lados: ¿por qué no baja el alquiler?
      </h1>
      <p class="lead mb-6">
        La pregunta se repite en los subs uruguayos y casi siempre arranca de la misma intuición:
        «hay un montón de viviendas vacías». Los datos del Censo {{ CENSUS_YEAR }} dicen otra cosa,
        y el lugar donde la vivienda está vacía <strong>no es el que uno cree</strong>.
      </p>

      <VCard class="quote-card pa-5 pa-md-6" variant="flat">
        <div class="text-overline mb-3">La pregunta, tal como se hace</div>
        <blockquote class="mb-0">
          «Levantan edificios en cualquier lugar, ¿quién vive ahí? Este país no crece, así que la
          gente de un lado va a otro. Si la gente se va de Montevideo, ¿por qué no baja el alquiler?
          ¿Ningún inversor se pregunta qué pasará en 10 años?»
        </blockquote>
      </VCard>
    </header>

    <!-- The counterintuitive fact -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El 19,5 % que todos citan no está donde se cree</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        El Censo {{ CENSUS_YEAR }} relevó
        <strong>{{ formatInt(TOTAL_DWELLINGS) }} viviendas</strong> en el país y encontró un
        <strong>{{ NATIONAL_VACANCY_PCT }} %</strong> desocupadas. Ese promedio esconde dos países
        distintos.
      </p>

      <VCard variant="flat" class="results-card pa-0">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th>Departamento</th>
              <th class="text-right">Viviendas vacías</th>
              <th>Por qué</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="d in VACANCY_EXTREMES"
              :key="d.department"
              :class="{
                'is-high': d.vacancyPct > NATIONAL_VACANCY_PCT,
                'is-low': d.department === 'Montevideo',
              }"
            >
              <td data-label="Departamento" class="font-weight-medium">{{ d.department }}</td>
              <td data-label="Viviendas vacías" class="text-right">
                <strong>{{ d.vacancyPct }} %</strong>
              </td>
              <td data-label="Por qué" class="cu-cell-prose text-medium-emphasis">{{ d.note }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>

      <VAlert type="info" variant="tonal" density="comfortable" class="mt-4">
        Montevideo es el departamento con <strong>menos</strong> vivienda vacía del país: 9,6 %, con
        el 90,4 % de las viviendas ocupadas. El promedio nacional lo empujan Maldonado (45,2 %) y
        Rocha (42,1 %), donde la vivienda vacía es casa de temporada.
      </VAlert>
    </section>

    <!-- Why vacant -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">¿Y las que están vacías, por qué lo están?</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Acá se ve que Montevideo y Maldonado son mercados distintos: en la capital la vivienda vacía
        está mayormente <strong>ofrecida</strong>; en Maldonado está <strong>cerrada</strong>
        esperando el verano.
      </p>
      <VCard variant="flat" class="results-card pa-0">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th>Motivo</th>
              <th class="text-right">Montevideo</th>
              <th class="text-right">Maldonado</th>
              <th>Qué significa</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in VACANCY_REASONS" :key="r.label">
              <td data-label="Motivo" class="font-weight-medium">{{ r.label }}</td>
              <td data-label="Montevideo" class="text-right">{{ r.montevideoPct }} %</td>
              <td data-label="Maldonado" class="text-right">{{ r.maldonadoPct }} %</td>
              <td data-label="Qué significa" class="cu-cell-prose text-medium-emphasis">
                {{ r.detail }}
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
      <p class="text-caption text-medium-emphasis mt-2 mb-0">
        Porcentajes sobre las viviendas desocupadas de cada departamento, no sobre el total.
      </p>
    </section>

    <!-- The incentive -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Qué premia exactamente el régimen</h2>
      <p class="mb-5" style="max-width: 72ch">
        La Ley 18.795 promueve la inversión privada en vivienda con exoneraciones tributarias. Vale
        la pena mirar sobre qué actúan: <strong>sobre el impuesto que paga el propietario</strong>,
        no sobre el precio del alquiler.
      </p>
      <VRow>
        <VCol v-for="b in PROMOTED_HOUSING_BENEFITS" :key="b.tax" cols="12" md="4">
          <VCard variant="flat" class="benefit-card pa-5 h-100">
            <div class="benefit-h">{{ b.tax }}</div>
            <div class="benefit-n">{{ b.benefit }}</div>
            <VChip size="x-small" variant="tonal" color="info" class="mb-3">
              {{ b.duration }}
            </VChip>
            <p class="mb-0 text-medium-emphasis">{{ b.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
      <VAlert type="warning" variant="tonal" density="comfortable" class="mt-4">
        <strong>Los {{ BENEFIT_YEARS }} años del hilo no son casualidad.</strong> Es el plazo de la
        exoneración sobre la renta del alquiler y del Impuesto al Patrimonio. Al año
        {{ BENEFIT_YEARS + 1 }} la unidad tributa como cualquier otra y el rendimiento neto cae
        aunque el alquiler no se mueva. Si estás comprando para alquilar, esa es la parte de la
        cuenta que más se olvida.
      </VAlert>
    </section>

    <!-- Answers -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Las preguntas, una por una</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="a in HOUSING_ANSWERS" :key="a.question">
          <VExpansionPanelTitle>
            <div>
              <div class="font-weight-medium">{{ a.question }}</div>
              <div class="text-caption text-medium-emphasis">{{ a.short }}</div>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>{{ a.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Related -->
    <section class="mb-12">
      <h2 class="text-h6 font-weight-bold mb-3">Si lo tuyo es alquilar o comprar</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn :to="localePath('/alquilar-en-uruguay')" variant="tonal" size="small">
          Guía para alquilar
        </VBtn>
        <VBtn :to="localePath('/alquilar-estando-en-clearing')" variant="tonal" size="small">
          Alquilar estando en el Clearing
        </VBtn>
        <VBtn :to="localePath('/herramientas/costo-de-vida')" variant="tonal" size="small">
          Calculadora de costo de vida
        </VBtn>
        <VBtn :to="localePath('/economia-uruguay')" variant="tonal" size="small">
          Economía de Uruguay
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Datos contrastados el {{ verifiedAt }}. Esta página describe datos públicos y el contenido
        de una norma; no afirma una relación causal entre el régimen y el precio del alquiler.
      </p>
      <ul class="sources-list">
        <li v-for="s in HOUSING_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  BENEFIT_YEARS,
  CENSUS_YEAR,
  HOUSING_ANSWERS,
  HOUSING_SOURCES,
  HOUSING_VERIFIED_AT,
  NATIONAL_VACANCY_PCT,
  PROMOTED_HOUSING_BENEFITS,
  TOTAL_DWELLINGS,
  VACANCY_EXTREMES,
  VACANCY_REASONS,
} from '~/utils/housingMarket'

const localePath = useLocalePath()

const formatInt = (n: number) => n.toLocaleString('es-UY')

const verifiedAt = new Date(HOUSING_VERIFIED_AT).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/por-que-no-baja-el-alquiler-uruguay'
const title = '¿Por qué no baja el alquiler si se construye tanto?'
const description =
  'Los datos del Censo 2023 contra la intuición: Montevideo es el departamento con MENOS vivienda vacía del país (9,6 %), y el 19,5 % nacional lo empujan Maldonado (45,2 %) y Rocha (42,1 %), donde la vivienda vacía es casa de temporada. Además, qué exonera exactamente la Ley 18.795 de vivienda promovida y por qué el horizonte del inversor son 10 años.'

defineOgImageComponent('Cambio', {
  title: '¿Por qué no baja el alquiler?',
  subtitle: 'Censo 2023 y vivienda promovida',
  tag: 'MERCADO',
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
        'por que no baja el alquiler uruguay, viviendas vacias uruguay censo 2023, viviendas desocupadas montevideo, vivienda promovida ley 18795, exoneracion irpf alquiler 10 años, quien vive en los edificios nuevos, se construye y no baja el alquiler, vacancia montevideo maldonado, comprar para alquilar uruguay',
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
                name: '¿Por qué no baja el alquiler?',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: HOUSING_ANSWERS.map(a => ({
              '@type': 'Question',
              name: a.question,
              acceptedAnswer: { '@type': 'Answer', text: a.answer },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.housing-page {
  max-width: 1180px;
}
.lead {
  font-size: 1.075rem;
  line-height: 1.65;
  max-width: 72ch;
  color: rgba(255, 255, 255, 0.82);
}
.v-theme--light .lead {
  color: rgba(0, 0, 0, 0.76);
}

.quote-card,
.results-card,
.benefit-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
}
.v-theme--light .quote-card,
.v-theme--light .results-card,
.v-theme--light .benefit-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}

.quote-card blockquote {
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding-left: 1rem;
  font-style: italic;
  line-height: 1.6;
}

.results-card :deep(tr.is-high) {
  background: rgba(var(--v-theme-warning), 0.07);
}
.results-card :deep(tr.is-low) {
  background: rgba(var(--v-theme-success), 0.09);
}

.benefit-h {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.65;
}
.benefit-n {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 0.5rem;
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.8;
}
</style>
