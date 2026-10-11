<template>
  <VContainer class="survivor-page py-6" style="max-width: 900px">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        {
          title: 'Finanzas personales y jubilación',
          to: localePath('/temas/finanzas-personales-y-jubilacion-uruguay'),
        },
        { title: 'Pensión por sobrevivencia', disabled: true },
      ]"
    />

    <div class="text-overline text-medium-emphasis mb-2">BPS · Pensión de sobrevivencia</div>
    <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
      Pensión por sobrevivencia (viudez) del BPS: quién la cobra y por cuántos años
    </h1>

    <p class="text-body-1 survivor-prose mb-4">
      La pensión por sobrevivencia la genera el trabajo de quien falleció, y la cobran su viuda o
      viudo, su concubina o concubino, la persona divorciada con pensión alimenticia congrua, los
      hijos y los padres incapacitados. No es la pensión a la vejez, que es el piso de quien nunca
      generó jubilación.
    </p>
    <p class="text-body-1 survivor-prose mb-6">
      <strong>Lo primero no es quién sos: es la fecha del fallecimiento.</strong> Desde el
      {{ cutoffDate }} rige la Ley 20.130, que derogó los artículos 25 y 26 de la Ley 16.713. Una
      pensión generada hasta el {{ previousRegimeEnd }} sigue el régimen que estaba en pie ese día,
      y el BPS lo publica en otra página. Todo lo que sigue es el régimen nuevo.
    </p>

    <!-- El plazo primero: es lo que más se busca y lo que peor se entiende. -->
    <h2 class="text-h6 font-weight-bold mb-2">Por cuántos años se cobra</h2>
    <p class="text-body-2 survivor-prose mb-3">
      Lo decide la edad que tenía la persona beneficiaria
      <strong>el día del fallecimiento del causante</strong>, no la que tiene hoy ni la que tenga
      cuando haga el trámite: cumplir 40 después no convierte una pensión de cinco años en
      vitalicia.
    </p>
    <div class="table-wrap mb-3">
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th>Edad al fallecimiento</th>
            <th>Plazo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="term in SURVIVOR_TERMS" :key="term.id">
            <td data-label="Edad al fallecimiento">{{ ageLabel(term) }}</td>
            <td data-label="Plazo">{{ term.label }}</td>
          </tr>
        </tbody>
      </VTable>
    </div>
    <p class="text-caption text-medium-emphasis survivor-prose mb-4">
      Decreto 229/023, art. 17, literales A), B) y C). El resumen del BPS escribe el último tramo
      como «mayores de 40 años de edad», que al pie de la letra dejaría afuera a quien tiene 40
      justos; el decreto dice «40 (cuarenta) o más años de edad», así que los 40 exactos son
      vitalicios.
    </p>

    <VCard variant="tonal" color="primary" class="pa-4 mb-6">
      <h3 class="text-subtitle-1 font-weight-bold mb-2">
        Es vitalicia a cualquier edad en estos casos
      </h3>
      <p class="text-body-2 mb-3">
        El mismo artículo tiene un segundo inciso que ninguna tabla de plazos muestra, y le cambia
        el resultado justo a quien más lo necesita.
      </p>
      <ul class="plain-list mb-0">
        <li v-for="(item, index) in SURVIVOR_LIFELONG_CASES" :key="index">{{ item }}</li>
      </ul>
    </VCard>

    <h2 class="text-h6 font-weight-bold mb-2">Hijos y padres: hasta cuándo</h2>
    <div class="table-wrap mb-6">
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th>Beneficiario</th>
            <th>Período de amparo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in SURVIVOR_OTHER_PERIODS" :key="row.id">
            <td data-label="Beneficiario">{{ row.beneficiary }}</td>
            <td data-label="Período de amparo">{{ row.period }}</td>
          </tr>
        </tbody>
      </VTable>
    </div>

    <h2 class="text-h6 font-weight-bold mb-2">Cuánto es</h2>
    <p class="text-body-2 survivor-prose mb-3">
      El haber base es un porcentaje del <strong>sueldo básico de pensión</strong>, que es la
      jubilación que percibía el causante o la que le hubiera correspondido (Decreto 229/023, art.
      24). El porcentaje depende de quiénes cobran:
    </p>
    <VCard v-for="share in SURVIVOR_SHARES" :key="share.id" variant="outlined" class="pa-4 mb-3">
      <p class="text-h6 font-weight-bold mb-1">{{ share.percent }} %</p>
      <p class="text-body-2 survivor-detail mb-0">{{ share.when }}</p>
    </VCard>
    <VAlert type="info" variant="tonal" density="comfortable" class="mb-3">
      Esta página no calcula cuánto te queda: el sueldo básico de pensión sale de la historia
      laboral del causante, que es un dato que el sitio no tiene. El porcentaje sí es público, y es
      éste.
    </VAlert>
    <p class="text-body-2 survivor-prose mb-6">
      El BPS publica además un mínimo de pensiones por sobrevivencia de
      <strong>{{ minimumAmount }}</strong> para {{ SURVIVOR_MINIMUM_YEAR }}, con una exclusión que
      cambia lo que el número significa: {{ SURVIVOR_MINIMUM_EXCLUSIONS }} Y hay una regla de
      abatimiento cuando el beneficiario tiene otros ingresos (Decreto 229/023, art. 26): existe,
      pero su umbral actualizado no está en la tabla de montos del BPS, así que acá no va ninguna
      cifra para eso.
    </p>

    <h2 class="text-h6 font-weight-bold mb-2">Qué condiciones se piden</h2>
    <VCard
      v-for="item in SURVIVOR_REQUIREMENTS"
      :key="item.id"
      variant="outlined"
      class="pa-4 mb-3"
    >
      <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ item.label }}</h3>
      <p class="text-body-2 survivor-detail mb-2">{{ item.detail }}</p>
      <p class="text-caption text-medium-emphasis mb-0">
        <a :href="sourceUrl(item.sourceId)" target="_blank" rel="noopener" class="cu-link">
          {{ sourceLabel(item.sourceId) }}
        </a>
      </p>
    </VCard>

    <h2 class="text-h6 font-weight-bold mt-8 mb-2">Los topes de ingresos del beneficiario</h2>
    <p class="text-body-2 survivor-prose mb-3">
      La carencia, la dependencia o la interdependencia económica se miden contra topes que el BPS
      publica en pesos y actualiza. Éstos son los del régimen que arranca el {{ cutoffDate }}.
    </p>
    <div class="table-wrap mb-4">
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th>Situación</th>
            <th>Tope de ingresos</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cap in SURVIVOR_INCOME_CAPS" :key="cap.id">
            <td data-label="Situación">{{ cap.label }}</td>
            <td data-label="Tope de ingresos">{{ formatUYU(cap.amount, 0) }}</td>
          </tr>
        </tbody>
      </VTable>
    </div>
    <p class="text-body-2 survivor-prose mb-3">
      El tope de la viuda o concubina que acredita interdependencia económica no es un valor del año
      en curso: el BPS lo fija <strong>por fecha de fallecimiento</strong>, así que el tramo queda
      clavado el día de la causal. Para un fallecimiento de {{ latestCapRange }} son
      <strong>{{ formatUYU(latestCap.amount, 0) }}</strong
      >.
    </p>
    <div class="table-wrap mb-6">
      <VTable density="compact" class="cu-mobile-cards">
        <thead>
          <tr>
            <th>Fecha de fallecimiento o desaparición</th>
            <th>Tope</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cap in SURVIVOR_WIDOW_CAPS" :key="cap.from">
            <td data-label="Fecha de fallecimiento o desaparición">{{ capRange(cap) }}</td>
            <td data-label="Tope">{{ formatUYU(cap.amount, 0) }}</td>
          </tr>
        </tbody>
      </VTable>
    </div>

    <h2 class="text-h6 font-weight-bold mb-2">Plazos, suspensión y pérdida del derecho</h2>
    <VCard v-for="item in SURVIVOR_DEADLINES" :key="item.id" variant="outlined" class="pa-4 mb-3">
      <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ item.label }}</h3>
      <p class="text-body-2 survivor-detail mb-0">{{ item.detail }}</p>
    </VCard>

    <p class="text-body-2 survivor-prose mt-6 mb-6">
      El trámite se inicia en el BPS:
      <a :href="bpsNewUrl" target="_blank" rel="noopener" class="cu-link">
        ficha oficial de la pensión por sobrevivencia
      </a>
      . Si el fallecimiento fue hasta el {{ previousRegimeEnd }}, la que corresponde es
      <a :href="bpsOldUrl" target="_blank" rel="noopener" class="cu-link">
        la del régimen anterior
      </a>
      , donde el período de amparo sigue el art. 26 de la Ley 16.713 — derogado para las causales
      nuevas y vigente para las generadas hasta esa fecha.
    </p>

    <!-- El FAQPage de JSON-LD lo emite este componente (`useFaqSchema`): por eso el `@graph`
         de abajo lleva sólo el BreadcrumbList y el Article. Dos nodos FAQPage en una misma
         página no es el doble de datos estructurados, es un conflicto. -->
    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

    <h2 class="text-h6 font-weight-bold mt-8 mb-2">De dónde sale esto</h2>
    <p class="text-body-2 text-medium-emphasis survivor-prose mb-2">
      Todo lo de esta página sale del BPS y de impo.com.uy, cotejado el {{ verifiedAt }}. Ningún
      monto ni porcentaje de acá es una estimación.
    </p>
    <ul class="sources mb-6">
      <li v-for="src in SURVIVOR_SOURCES" :key="src.id">
        <a :href="src.url" target="_blank" rel="noopener" class="cu-link">{{ src.label }}</a>
        <span v-if="src.updatedAt" class="text-medium-emphasis">
          — actualizada el {{ longDate(src.updatedAt) }}
        </span>
      </li>
    </ul>

    <h2 class="text-h6 font-weight-bold mb-2">Seguir leyendo</h2>
    <div class="d-flex flex-wrap ga-3 mb-4">
      <NuxtLink :to="localePath('/pension-a-la-vejez-uruguay')" class="cu-link">
        Pensión a la vejez
      </NuxtLink>
      <NuxtLink :to="localePath('/suplemento-solidario-bps')" class="cu-link">
        Suplemento solidario del BPS
      </NuxtLink>
      <NuxtLink :to="localePath('/cuando-me-puedo-jubilar-uruguay')" class="cu-link">
        Cuándo me puedo jubilar
      </NuxtLink>
      <NuxtLink :to="localePath('/fecha-de-cobro-bps-uruguay')" class="cu-link">
        Fecha de cobro del BPS
      </NuxtLink>
      <NuxtLink :to="localePath('/certificados-bps-uruguay')" class="cu-link">
        Certificados del BPS
      </NuxtLink>
      <NuxtLink :to="localePath('/iass-uruguay')" class="cu-link">
        IASS: impuesto a las jubilaciones
      </NuxtLink>
    </div>
  </VContainer>
</template>

<script setup lang="ts">
import { formatUYU } from '~/utils/format'
import type { FaqItem } from '~/utils/faqAnswers'
import {
  SURVIVOR_DEADLINES,
  SURVIVOR_FAQ,
  SURVIVOR_INCOME_CAPS,
  SURVIVOR_LIFELONG_CASES,
  SURVIVOR_MINIMUM_AMOUNT,
  SURVIVOR_MINIMUM_EXCLUSIONS,
  SURVIVOR_MINIMUM_YEAR,
  SURVIVOR_OTHER_PERIODS,
  SURVIVOR_PREVIOUS_REGIME_END,
  SURVIVOR_REGIME_CUTOFF,
  SURVIVOR_REQUIREMENTS,
  SURVIVOR_SHARES,
  SURVIVOR_SOURCES,
  SURVIVOR_TERMS,
  SURVIVOR_VERIFIED_AT,
  SURVIVOR_WIDOW_CAPS,
  survivorLatestWidowCap,
  type SurvivorTerm,
  type SurvivorWidowCap,
} from '~/utils/survivorPension'

const localePath = useLocalePath()

const faq = SURVIVOR_FAQ as unknown as FaqItem[]

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', { timeZone: 'UTC' })

const verifiedAt = longDate(SURVIVOR_VERIFIED_AT)
const cutoffDate = longDate(SURVIVOR_REGIME_CUTOFF)
const previousRegimeEnd = longDate(SURVIVOR_PREVIOUS_REGIME_END)
const minimumAmount = formatUYU(SURVIVOR_MINIMUM_AMOUNT, 0)

const latestCap = survivorLatestWidowCap()
const capRange = (cap: SurvivorWidowCap) => `${shortDate(cap.from)} al ${shortDate(cap.to)}`
const latestCapRange = capRange(latestCap)

const ageLabel = (term: SurvivorTerm) =>
  term.toAge === null
    ? `${term.fromAge} años o más`
    : term.fromAge === 0
      ? `Menos de ${term.toAge + 1} años`
      : `De ${term.fromAge} a ${term.toAge} años`

const sourceOf = (id: string) => SURVIVOR_SOURCES.find(source => source.id === id)
const sourceUrl = (id: string) => sourceOf(id)?.url ?? ''
const sourceLabel = (id: string) => sourceOf(id)?.label ?? ''

const bpsNewUrl = sourceUrl('bps-nueva')
const bpsOldUrl = sourceUrl('bps-anterior')

const canonicalUrl = 'https://cambio-uruguay.com/pension-por-sobrevivencia-uruguay'
const title = 'Pensión de viudez: 2, 5 años o de por vida'
// Literal a propósito, para que la mida el trinquete de los 155 caracteres de
// `seoDescriptionBudget.test.ts`. La sincronía con el catálogo la cuida
// `tests/unit/survivorPension.test.ts`, que fija los tramos y los porcentajes.
const description =
  'Con 40 o más años al fallecimiento es vitalicia; de 30 a 39, cinco años; con menos de 30, dos. Es el 66 % o 75 % de la jubilación del fallecido.'

defineOgImageComponent('Cambio', {
  title: 'Pensión por sobrevivencia del BPS',
  subtitle: 'Por cuántos años se cobra, y de qué es el 66 %',
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
        'pension por sobrevivencia, pension de viudez uruguay, pension por fallecimiento bps, cuantos anos se cobra la pension de viudez, pension sobrevivencia ley 20130, topes de ingresos pension viudez, pension de viudez concubinato, minimo pension sobrevivencia 2026',
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
                name: 'Finanzas personales y jubilación en Uruguay',
                item: 'https://cambio-uruguay.com/temas/finanzas-personales-y-jubilacion-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Pensión por sobrevivencia del BPS',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            dateModified: SURVIVOR_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            citation: SURVIVOR_SOURCES.map(source => ({
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
.survivor-prose {
  max-width: 68ch;
}

.survivor-detail {
  margin-top: 0.25rem;
}

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
  margin-top: 0.35rem;
}

.plain-list {
  padding-left: 1.1rem;
  margin: 0;
}

.plain-list li {
  margin-top: 0.4rem;
}
</style>
