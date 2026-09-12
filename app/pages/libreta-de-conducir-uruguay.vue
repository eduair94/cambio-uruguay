<template>
  <VContainer class="licence-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">TRÁMITES Y COSTOS</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Cuánto sale la libreta de conducir en Uruguay
      </h1>
      <p class="lead mb-6">
        Deja de depender de tu intendencia: el Congreso de Intendentes y el Sucive unificaron el
        costo de emisión del Permiso Único Nacional de Conducir en
        <strong>UR {{ maxCostUr }}</strong> para todo el país, con vigencia desde el
        {{ unifiedSinceDisplay }}. Lo que casi nadie paga es esa cifra entera, y el motivo no es el
        departamento: es <strong>cuántos años te habilitan</strong>, que baja con la edad.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-card-account-details-star-outline" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">El número que buscabas</div>
            <p class="callout-text mb-0">
              <template v-if="maxCostPesos">
                UR {{ maxCostUr }} son unos <strong>$ {{ maxCostPesos }}</strong> con la Unidad
                Reajustable de hoy, y es el techo: la libreta por un año sale la quinta parte. El
                examen médico y los timbres de tu intendencia van aparte.
              </template>
              <template v-else>
                UR {{ maxCostUr }} es el techo: la libreta por un año sale la quinta parte. El
                examen médico y los timbres de tu intendencia van aparte.
              </template>
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- La escala -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">La escala: se paga por años, no por trámite</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El monto de emisión corresponde a la primera libreta y a las que se dan por 10 años. Cuando
        el plazo se recorta, se cobra una fracción.
      </p>

      <div class="bracket-grid">
        <VCard
          v-for="bracket in brackets"
          :key="bracket.share"
          variant="flat"
          class="price-card pa-4"
        >
          <div class="price-value">UR {{ formatUr(bracket.ur) }}</div>
          <p v-if="pesosFor(bracket.ur)" class="price-pesos mb-1">≈ $ {{ pesosFor(bracket.ur) }}</p>
          <p class="price-case text-body-2 mb-1">{{ bracket.label }}</p>
          <p class="price-detail text-body-2 text-medium-emphasis mb-0">
            {{ bracket.share }} % del costo
          </p>
        </VCard>
      </div>
    </section>

    <!-- La discrepancia -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Dónde la norma y el mostrador no coinciden</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Esto no lo aclara ninguna de las dos fuentes, así que va acá tal cual está. Si tenés menos
        de {{ REDUCTION_FROM_AGE }} años y te otorgan un plazo corto, confirmá el importe antes de
        pagar: puede corresponderte la tarifa entera igual.
      </p>

      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="rule-card pa-5 pa-md-6 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Lo que dice el texto nacional</h3>
            <p class="rule-detail mb-4">
              El Texto Ordenado del Sucive ata la rebaja a una condición: que el plazo se haya
              recortado por patología médica o por edad, y fija esa edad en
              {{ REDUCTION_FROM_AGE }} años cumplidos.
            </p>
            <blockquote class="rule-quote">{{ REDUCTION_QUOTE }}</blockquote>
            <p class="rule-source text-body-2 text-medium-emphasis mb-0">
              <a :href="sourceFor(1).url" target="_blank" rel="noopener noreferrer">
                Texto Ordenado del Sucive 2026
              </a>
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="rule-card pa-5 pa-md-6 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Lo que publican los trámites</h3>
            <p class="rule-detail mb-4">
              Los trámites de Maldonado, Cerro Largo y Treinta y Tres publican exactamente la misma
              escala, pero <strong>sin la condición</strong>: sólo por meses de vigencia otorgada,
              sin mencionar la edad ni la patología. Es la versión que ve quien va al mostrador.
            </p>
            <blockquote class="rule-quote">
              Si la vigencia es menor a 24 meses el costo es U.R. 0,25. […] Si la vigencia es mayor
              de 95 meses el costo es U.R. 1,25.
            </blockquote>
            <p class="rule-source text-body-2 text-medium-emphasis mb-0">
              <a :href="sourceFor(3).url" target="_blank" rel="noopener noreferrer">
                Renovación del PUNC categoría «A», Cerro Largo — gub.uy
              </a>
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Años por edad -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuántos años te dan, y qué sale entonces</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Plazos máximos de las categorías no profesionales (A, G1 y G2). El examen médico puede
        acortarlos, así que lo que vale es el vencimiento impreso en tu libreta. Las categorías
        profesionales tienen una escala más corta y no pueden pasar del día en que cumplís
        {{ PROFESSIONAL_MAX_AGE }} años.
      </p>

      <VCard variant="flat" class="table-card pa-0">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th>Edad</th>
              <th>Plazo máximo</th>
              <th>Costo de emisión</th>
              <th>Amparo de la rebaja</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in ageRows" :key="row.age">
              <td data-label="Edad" class="font-weight-medium">{{ row.age }} años</td>
              <td data-label="Plazo máximo">
                {{ row.years }} {{ row.years === 1 ? 'año' : 'años' }}
              </td>
              <td data-label="Costo de emisión">
                UR {{ formatUr(row.ur) }}
                <span v-if="row.pesos" class="text-medium-emphasis">(≈ $ {{ row.pesos }})</span>
              </td>
              <td data-label="Amparo de la rebaja" class="cu-cell-prose text-medium-emphasis">
                <template v-if="row.share === 100">Tarifa entera, sin rebaja</template>
                <template v-else-if="row.inNationalText">
                  Norma nacional y trámite departamental
                </template>
                <template v-else>Sólo el trámite departamental — confirmalo</template>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </section>

    <!-- Reglas -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Las seis reglas que gobiernan la libreta</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Cada una lleva la transcripción textual de la norma que la dice. Si en la ventanilla te
        responden otra cosa, esta es la letra.
      </p>

      <VRow>
        <VCol v-for="rule in rules" :key="rule.headline" cols="12" md="6">
          <VCard variant="flat" class="rule-card pa-5 pa-md-6 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ rule.headline }}</h3>
            <p class="rule-detail mb-4">{{ rule.detail }}</p>
            <blockquote class="rule-quote">{{ rule.quote }}</blockquote>
            <p class="rule-source text-body-2 text-medium-emphasis mb-0">
              <a
                :href="sourceFor(rule.sourceIndex).url"
                target="_blank"
                rel="noopener noreferrer"
                >{{ rule.article }}</a
              >
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Extras -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que NO está unificado</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Los timbres y sellados los pone cada intendencia y no entraron en la unificación. Van los
        dos casos que publican su importe; no son una tabla nacional y por eso llevan el
        departamento adelante. Sumado al examen médico, es la parte del gasto que sí depende de
        dónde vivís.
      </p>

      <VRow dense>
        <VCol v-for="extra in extras" :key="extra.department" cols="12" md="6">
          <VCard variant="flat" class="extra-card pa-4 h-100">
            <div class="text-overline mb-1">{{ extra.department }}</div>
            <p class="extra-amount font-weight-bold mb-1">{{ extra.amount }}</p>
            <p class="extra-concept text-body-2 text-medium-emphasis mb-0">
              {{ extra.concept }} —
              <a :href="extraUrl(extra)" target="_blank" rel="noopener noreferrer">
                trámite en gub.uy
              </a>
            </p>
          </VCard>
        </VCol>
      </VRow>

      <VAlert type="info" variant="tonal" density="comfortable" class="extra-alert">
        El examen de aptitud psicofísica queda expresamente afuera del costo unificado y podés
        hacerlo en el servicio de la intendencia o en una clínica habilitada. Ninguna fuente oficial
        publica un precio nacional para ese examen, así que esta página no publica ninguno.
      </VAlert>
    </section>

    <!-- Preguntas -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion" class="faq-panels">
        <VExpansionPanel v-for="faq in faqs" :key="faq.q" :title="faq.q">
          <template #text>
            <p class="faq-answer mb-0">{{ faq.a }}</p>
          </template>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Relacionadas -->
    <section class="mb-12">
      <h2 class="text-h6 font-weight-bold mb-3">Seguí por acá</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          v-for="link in related"
          :key="link.to"
          :to="localePath(link.to)"
          variant="tonal"
          size="small"
        >
          {{ link.label }}
        </VBtn>
      </div>
    </section>

    <!-- Fuentes -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Contrastado el {{ verifiedDisplay }}. Esta página es informativa: quien liquida tu trámite
        es la intendencia donde lo hacés.
      </p>
      <ul class="sources-list">
        <li v-for="s in sources" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
          <span class="text-medium-emphasis"> — {{ s.publisher }}</span>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { ExchangeRate } from '~/types/api'
import { currentIndicatorValue, indicatorFromSlug } from '~/utils/indicators'
import {
  DRIVING_LICENCE_EXTRAS,
  DRIVING_LICENCE_FAQS,
  DRIVING_LICENCE_FEE_BRACKETS,
  DRIVING_LICENCE_MAX_COST_UR,
  DRIVING_LICENCE_PROFESSIONAL_MAX_AGE,
  DRIVING_LICENCE_REDUCTION_FROM_AGE,
  DRIVING_LICENCE_REDUCTION_QUOTE,
  DRIVING_LICENCE_RELATED,
  DRIVING_LICENCE_RULES,
  DRIVING_LICENCE_SAMPLE_AGES,
  DRIVING_LICENCE_SOURCES,
  DRIVING_LICENCE_UNIFIED_SINCE,
  DRIVING_LICENCE_VERIFIED_AT,
  licenceCostInPesos,
  licenceQuoteForAge,
} from '~/utils/drivingLicence'

const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()

const brackets = DRIVING_LICENCE_FEE_BRACKETS
const rules = DRIVING_LICENCE_RULES
const extras = DRIVING_LICENCE_EXTRAS
const faqs = DRIVING_LICENCE_FAQS
const related = DRIVING_LICENCE_RELATED
const sources = DRIVING_LICENCE_SOURCES

const REDUCTION_FROM_AGE = DRIVING_LICENCE_REDUCTION_FROM_AGE
const REDUCTION_QUOTE = DRIVING_LICENCE_REDUCTION_QUOTE
const PROFESSIONAL_MAX_AGE = DRIVING_LICENCE_PROFESSIONAL_MAX_AGE

const sourceFor = (index: number) => DRIVING_LICENCE_SOURCES[index] ?? DRIVING_LICENCE_SOURCES[0]!
const extraUrl = (extra: { sourceIndex: number }) => sourceFor(extra.sourceIndex).url

const formatUr = (ur: number) => ur.toLocaleString('es-UY', { maximumFractionDigits: 2 })
const maxCostUr = formatUr(DRIVING_LICENCE_MAX_COST_UR)

// El valor de la UR se lee en SSR de la misma API que alimenta /indicadores. Si
// la API no contesta, `currentIndicatorValue` cae al valor de referencia del
// catálogo, y si ni eso sirve la página muestra sólo las UR.
const { data: urValue } = await useAsyncData('libreta-conducir-ur', async () => {
  const indicator = indicatorFromSlug('unidad-reajustable')
  if (!indicator) return null
  const result = await getProcessedExchangeData('')
  const rows = (result?.exchangeData ?? []) as ExchangeRate[]
  return currentIndicatorValue(rows, indicator)
})

const pesosFor = (ur: number) => {
  const pesos = licenceCostInPesos(ur, urValue.value)
  if (pesos === null) return null
  return pesos.toLocaleString('es-UY', { maximumFractionDigits: 0 })
}

const maxCostPesos = computed(() => pesosFor(DRIVING_LICENCE_MAX_COST_UR))

const ageRows = computed(() =>
  DRIVING_LICENCE_SAMPLE_AGES.map(age => {
    const quote = licenceQuoteForAge(age)
    if (!quote) return null
    return {
      age,
      years: quote.years,
      ur: quote.bracket.ur,
      share: quote.bracket.share,
      inNationalText: quote.reductionInNationalText,
      pesos: pesosFor(quote.bracket.ur),
    }
  }).filter((row): row is NonNullable<typeof row> => row !== null)
)

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-UY', { year: 'numeric', month: 'long', day: 'numeric' })

const verifiedDisplay = computed(() => longDate(DRIVING_LICENCE_VERIFIED_AT))
const unifiedSinceDisplay = longDate(DRIVING_LICENCE_UNIFIED_SINCE)

const canonicalUrl = 'https://cambio-uruguay.com/libreta-de-conducir-uruguay'
// 43 caracteres: con la marca que agrega app.vue quedan 60 justos y el SERP no
// lo corta. El H1 puede ser más largo; el <title> no.
const title = 'Libreta de conducir: sale de 0,25 a 1,25 UR'
const description =
  'La emisión del Permiso Único Nacional de Conducir cuesta UR 1,25 en todo el país desde setiembre de 2023, pero se cobra por tramos: 0,25 UR si te habilitan menos de 2 años, 0,50 hasta 4, 0,75 hasta 6, 1 hasta 8 y 1,25 de ahí en adelante. A los 55 te dan 10 años; a los 80, uno. El examen médico y los timbres van aparte.'

defineOgImageComponent('Cambio', { title, subtitle: description, tag: 'TRÁMITES' })

useSeoMeta({
  title: `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
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
            '@type': 'FAQPage',
            mainEntity: DRIVING_LICENCE_FAQS.map(faq => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: { '@type': 'Answer', text: faq.a },
            })),
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
              { '@type': 'ListItem', position: 2, name: title, item: canonicalUrl },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
/*
 * El reset de Vuetify 4 no anula el `margin-block: 1em` de la UA en `<p>`, y
 * estos párrafos vienen DESPUÉS de un hermano (el h1, el h2, el h3), así que la
 * regla `:first-child` de critical.css no los alcanza y ese 1em pisaría
 * cualquier separación menor que se declare arriba. Ver DESIGN.md → «The Text
 * Block Owns Its Top Margin Rule».
 */
.lead,
.section-intro,
.callout-text,
.rule-detail,
.faq-answer {
  margin-top: 0;
  line-height: 1.75;
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.lead {
  max-width: 74ch;
  font-size: 1.05rem;
}

.section-intro {
  max-width: 72ch;
}

.warn-card {
  background: rgba(var(--v-theme-primary), 0.07);
  border: 1px solid rgba(var(--v-theme-primary), 0.24);
  border-radius: 12px;
}

/* Cinco tramos: dos por fila en el teléfono y los cinco en una sola fila desde
   md. Un VRow de 12 columnas no divide en cinco, así que la grilla va acá. */
.bracket-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

@media (min-width: 960px) {
  .bracket-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.price-card,
.rule-card,
.extra-card,
.table-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}

.price-value {
  margin-bottom: 0.35rem;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.1;
  color: rgb(var(--v-theme-primary));
}

.price-pesos,
.price-case,
.price-detail,
.extra-amount,
.extra-concept,
.rule-source {
  margin-top: 0;
}

.price-pesos {
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.extra-amount {
  font-size: 1.15rem;
}

.extra-alert {
  margin-top: 1.25rem;
}

.rule-quote {
  margin: 0 0 0.85rem;
  padding-left: 0.9rem;
  border-left: 3px solid rgba(var(--v-theme-primary), 0.45);
  font-style: italic;
  line-height: 1.6;
  color: rgba(var(--v-theme-on-surface), 0.74);
}

.sources-list {
  margin-top: 0;
  padding-left: 1.15rem;
  line-height: 1.7;
}

.sources-list li {
  margin-top: 0.35rem;
}

.sources-list a,
.rule-source a,
.extra-concept a {
  color: rgb(var(--v-theme-primary));
}
</style>
