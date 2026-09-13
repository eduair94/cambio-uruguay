<template>
  <div v-if="page" class="entity-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="9">
          <div class="mb-4">
            <VBtn :to="localePath(page.indexPath)" variant="text" size="small" class="cu-btn-flush">
              <VIcon start size="small">mdi-arrow-left</VIcon>
              Ranking de tarjetas de crédito
            </VBtn>
          </div>

          <header class="mb-6">
            <div class="d-flex flex-wrap ga-2 mb-3">
              <VChip color="primary" size="small" variant="tonal">
                <VIcon start size="small">mdi-credit-card-outline</VIcon>
                {{ page.issuerTypeLabel }}
              </VChip>
              <VChip size="small" variant="outlined">{{ page.networks }}</VChip>
              <VChip v-if="page.verified" size="small" variant="outlined">
                <VIcon start size="small">mdi-check-decagram-outline</VIcon>
                Verificado
              </VChip>
            </div>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">{{ page.heading }}</h1>
            <p class="text-body-1 entity-lead mb-0">{{ page.lead }}</p>
            <ShareButtons class="mt-4" :url="canonicalUrl" :text="page.heading" />
          </header>

          <!-- Score: computed by the same rankedPrograms() the ranking renders -->
          <section class="mb-8" aria-labelledby="programa-puntaje">
            <h2 id="programa-puntaje" class="text-h5 font-weight-bold mb-3">
              Puntaje en el ranking
            </h2>
            <div class="entity-score-head mb-4">
              <div class="entity-score-num">
                {{ page.overall }}<span class="entity-score-den">/100</span>
              </div>
              <div>
                <p class="text-subtitle-1 font-weight-bold mb-0">
                  Puesto {{ page.rank }} de {{ page.of }} · tier {{ page.tier }}
                </p>
                <p class="text-body-2 text-medium-emphasis mt-1 mb-0">{{ page.tierBlurb }}</p>
              </div>
            </div>
            <div class="table-scroll">
              <table class="entity-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Eje</th>
                    <th class="num">Peso</th>
                    <th class="num">Puntaje</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in page.scores" :key="row.id">
                    <td data-label="" class="cu-cell-prose">
                      <span class="font-weight-bold">{{ row.label }}</span>
                      <span class="d-block text-caption text-medium-emphasis mt-1">
                        {{ row.what }}
                      </span>
                    </td>
                    <td class="num" data-label="Peso">{{ row.weight }}%</td>
                    <td class="num" data-label="Puntaje">{{ row.score }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-body-2 entity-prose mt-3 mb-0">{{ page.scoreSummary }}</p>
          </section>

          <section v-if="page.rationale" class="mb-8" aria-labelledby="programa-por-que">
            <h2 id="programa-por-que" class="text-h5 font-weight-bold mb-3">Por qué ese puntaje</h2>
            <p class="text-body-1 entity-prose mb-0">{{ page.rationale }}</p>
          </section>

          <!-- The ficha, field by field -->
          <section class="mb-8" aria-labelledby="programa-ficha">
            <h2 id="programa-ficha" class="text-h5 font-weight-bold mb-3">
              Acumulación, canje, descuentos y costo
            </h2>
            <p class="text-body-2 text-medium-emphasis mt-0 mb-2">
              {{ page.catalogName }}
            </p>
            <dl class="entity-facts">
              <div v-for="fact in page.facts" :key="fact.label" class="entity-fact">
                <dt>{{ fact.label }}</dt>
                <dd>{{ fact.value }}</dd>
              </div>
            </dl>
          </section>

          <section class="mb-8" aria-labelledby="programa-pros">
            <h2 id="programa-pros" class="text-h5 font-weight-bold mb-3">A favor y en contra</h2>
            <VRow>
              <VCol cols="12" md="6">
                <VCard variant="flat" class="entity-card pa-4 h-100">
                  <p class="entity-sublabel mb-2">A favor</p>
                  <ul class="entity-bullets mb-0">
                    <li v-for="(item, i) in page.pros" :key="`p-${i}`">{{ item }}</li>
                  </ul>
                </VCard>
              </VCol>
              <VCol cols="12" md="6">
                <VCard variant="flat" class="entity-card pa-4 h-100">
                  <p class="entity-sublabel mb-2">En contra</p>
                  <ul class="entity-bullets mb-0">
                    <li v-for="(item, i) in page.cons" :key="`c-${i}`">{{ item }}</li>
                  </ul>
                </VCard>
              </VCol>
            </VRow>
            <p class="text-body-2 entity-prose mt-4 mb-0">
              <strong>Ideal para:</strong> {{ page.bestFor }}
            </p>
          </section>

          <VCard v-if="page.discounts" variant="flat" class="entity-card pa-5 mb-8">
            <h2 class="text-subtitle-1 font-weight-bold mb-2">
              Dónde están los descuentos de {{ page.discounts.bankName }}
            </h2>
            <p class="text-body-2 entity-prose mt-0 mb-3">
              El mapa entra con las tarjetas de crédito de {{ page.discounts.bankName }} ya elegidas
              y muestra qué comercios tienen descuento hoy.
            </p>
            <div class="d-flex flex-wrap ga-2">
              <VBtn
                :to="localePath(page.discounts.mapPath)"
                color="primary"
                variant="flat"
                size="small"
                prepend-icon="mdi-map-marker-radius-outline"
              >
                Ver en el mapa
              </VBtn>
              <VBtn
                v-if="page.discounts.bankPagePath"
                :to="localePath(page.discounts.bankPagePath)"
                color="primary"
                variant="tonal"
                size="small"
                prepend-icon="mdi-tag-multiple-outline"
              >
                Lista de comercios
              </VBtn>
            </div>
          </VCard>

          <!-- Head-to-heads this programme already takes part in -->
          <section class="mb-8" aria-labelledby="programa-vs">
            <h2 id="programa-vs" class="text-h5 font-weight-bold mb-2">
              {{ page.name }} contra otras tarjetas
            </h2>
            <template v-if="page.comparisons.length">
              <p class="text-body-2 text-medium-emphasis mt-0 mb-3">
                Cada comparación enfrenta los dos programas eje por eje, con la misma rúbrica.
              </p>
              <div class="d-flex flex-wrap ga-2">
                <VChip
                  v-for="link in page.comparisons"
                  :key="link.to"
                  :to="localePath(link.to)"
                  color="primary"
                  variant="tonal"
                  size="small"
                  link
                >
                  {{ link.label }}
                </VChip>
              </div>
            </template>
            <p v-else class="text-body-2 entity-prose mt-0 mb-0">{{ page.comparisonsNote }}</p>
          </section>

          <section v-if="page.siblings.length" class="mb-8" aria-labelledby="programa-otros">
            <h2 id="programa-otros" class="text-h5 font-weight-bold mb-3">
              Otras tarjetas para mirar
            </h2>
            <VRow dense>
              <VCol v-for="link in page.siblings" :key="link.to" cols="12" sm="6">
                <VCard :to="localePath(link.to)" variant="flat" class="entity-card pa-4 h-100">
                  <p class="text-subtitle-1 font-weight-bold mb-0">{{ link.label }}</p>
                  <p v-if="link.hint" class="text-body-2 text-medium-emphasis mt-1 mb-0">
                    {{ link.hint }}
                  </p>
                </VCard>
              </VCol>
            </VRow>
          </section>

          <FaqSection
            :items="page.faq"
            heading="Preguntas frecuentes"
            :emit-schema="false"
            expanded
          />

          <VCard variant="flat" class="entity-card pa-5 mt-8 mb-6">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">Seguí comparando</h2>
            <div class="d-flex flex-wrap ga-2">
              <VChip
                v-for="link in page.tools"
                :key="link.to"
                :to="localePath(link.to)"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                {{ link.label }}
              </VChip>
            </div>
          </VCard>

          <VCard variant="flat" class="entity-card pa-5 mb-6">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">
              <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
              Fuentes
            </h2>
            <ul v-if="page.sources.length" class="entity-link-list">
              <li v-for="source in page.sources" :key="source.url">
                <a :href="source.url" target="_blank" rel="noopener noreferrer">
                  {{ source.label }}
                </a>
              </li>
            </ul>
            <p v-else class="text-body-2 entity-prose mt-0 mb-0">{{ page.sourcesNote }}</p>
          </VCard>

          <VAlert
            type="warning"
            variant="tonal"
            density="comfortable"
            icon="mdi-alert-outline"
            class="mb-2"
          >
            Comparación <strong>informativa</strong>, no asesoramiento financiero; no tenemos
            afiliación con los emisores. Las tasas de acumulación, los valores de canje, los
            descuentos y los costos cambian seguido y varían por categoría de tarjeta y campaña.
            Datos revisados al {{ page.reviewedLabel }}: verificá la letra chica actual en el sitio
            del emisor antes de decidir.
          </VAlert>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { getCardProgramPage } from '~/utils/cardProgramPages'
import { entityIdForSlug } from '~/utils/entityPageSlugs'

// The slug map is static and import-free, so the guard resolves it directly: an unknown programme
// is a real 404 before anything renders, never an empty page answered with 200.
definePageMeta({
  validate: route =>
    Boolean(entityIdForSlug('tarjetas-de-credito', String(route.params.programa ?? ''))),
})

const localePath = useLocalePath()
const route = useRoute()

const page = computed(() => getCardProgramPage(String(route.params.programa ?? '')))

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Tarjeta no encontrada' })
}

const canonicalUrl = computed(() => `https://cambio-uruguay.com${page.value?.path ?? ''}`)

defineOgImageComponent('Cambio', {
  title: () => page.value?.name ?? '',
  subtitle: () =>
    page.value ? `Puesto ${page.value.rank} de ${page.value.of} · ${page.value.overall}/100` : '',
  tag: 'TARJETA DE CRÉDITO',
})

useSeoMeta({
  title: () => `${page.value?.title ?? ''} | Cambio Uruguay`,
  description: () => page.value?.description ?? '',
  ogTitle: () => page.value?.heading ?? '',
  ogDescription: () => page.value?.description ?? '',
  ogType: 'article',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() => {
        const model = page.value
        if (!model) return ''
        const graph: Array<Record<string, unknown>> = [
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
                name: model.indexLabel,
                item: `https://cambio-uruguay.com${model.indexPath}`,
              },
              { '@type': 'ListItem', position: 3, name: model.name, item: canonicalUrl.value },
            ],
          },
        ]
        if (model.faq.length) {
          graph.push({
            '@type': 'FAQPage',
            mainEntity: model.faq.map(item => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer },
            })),
          })
        }
        return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
      }),
    },
  ],
})
</script>

<style scoped>
.entity-lead,
.entity-prose {
  line-height: 1.75;
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.entity-card {
  background: rgba(var(--v-theme-on-surface), 0.03);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
}

.entity-score-head {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.entity-score-num {
  font-size: 2.6rem;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.entity-score-den {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.entity-facts {
  margin: 0;
}
.entity-fact {
  display: grid;
  grid-template-columns: minmax(150px, 220px) 1fr;
  gap: 4px 16px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}
@media (max-width: 599.98px) {
  .entity-fact {
    grid-template-columns: 1fr;
  }
}
.entity-fact dt {
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), 0.62);
}
.entity-fact dd {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.entity-sublabel {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(var(--v-theme-on-surface), 0.62);
}
.entity-bullets {
  padding-left: 1.1rem;
  line-height: 1.65;
  font-size: 0.92rem;
  color: rgba(var(--v-theme-on-surface), 0.86);
}
.entity-bullets li {
  margin-bottom: 0.35rem;
}

.table-scroll {
  overflow-x: auto;
}
.entity-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}
.entity-table th,
.entity-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  text-align: left;
  vertical-align: top;
}
.entity-table thead th {
  font-weight: 700;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.entity-table .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.entity-link-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.88rem;
}
.entity-link-list a {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.entity-link-list a:hover {
  text-decoration: underline;
}
</style>
