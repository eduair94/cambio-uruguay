<template>
  <div v-if="page" class="entity-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="9">
          <div class="mb-4">
            <VBtn :to="localePath(page.indexPath)" variant="text" size="small" class="cu-btn-flush">
              <VIcon start size="small">mdi-arrow-left</VIcon>
              Todos los couriers
            </VBtn>
          </div>

          <header class="mb-6">
            <div class="d-flex flex-wrap ga-2 mb-3">
              <VChip color="primary" size="small" variant="tonal">
                <VIcon start size="small">mdi-truck-fast-outline</VIcon>
                {{ page.modality }}
              </VChip>
              <VChip v-if="page.ratingLabel" size="small" variant="outlined">
                <VIcon start size="small">mdi-star</VIcon>
                {{ page.ratingLabel }} / 5 en reseñas
              </VChip>
            </div>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">{{ page.heading }}</h1>
            <p class="text-body-1 entity-lead mb-0">{{ page.lead }}</p>
            <ShareButtons class="mt-4" :url="canonicalUrl" :text="page.heading" />
          </header>

          <!-- Tariff and conditions, straight from the catalogue row -->
          <section class="mb-8" aria-labelledby="courier-tarifa">
            <h2 id="courier-tarifa" class="text-h5 font-weight-bold mb-3">Tarifa y condiciones</h2>
            <dl class="entity-facts">
              <div v-for="fact in page.facts" :key="fact.label" class="entity-fact">
                <dt>{{ fact.label }}</dt>
                <dd>{{ fact.value }}</dd>
              </div>
            </dl>
            <p class="text-caption text-medium-emphasis mt-3 mb-0">{{ page.verificationNote }}</p>
          </section>

          <!-- Worked parcel: only when the courier publishes a per-kg tariff -->
          <section v-if="page.reference" class="mb-8" aria-labelledby="courier-paquete">
            <h2 id="courier-paquete" class="text-h5 font-weight-bold mb-3">
              Cuánto sale un paquete de {{ page.reference.kg }} kilos
            </h2>
            <div class="table-scroll">
              <table class="entity-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th class="num">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in page.reference.rows"
                    :key="row.label"
                    :class="{
                      'total-row': row.kind === 'total',
                      'aside-row': row.kind === 'aside',
                    }"
                  >
                    <td data-label="">{{ row.label }}</td>
                    <td class="num" data-label="Monto">{{ row.value }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-body-2 entity-prose mt-3 mb-0">{{ page.reference.comparison }}</p>
          </section>
          <VAlert
            v-else-if="page.quoteNote"
            type="info"
            variant="tonal"
            density="comfortable"
            class="mb-8"
            icon="mdi-calculator-variant-outline"
          >
            {{ page.quoteNote }}
          </VAlert>

          <!-- Reputation -->
          <section v-if="page.reviewsNote" class="mb-8" aria-labelledby="courier-opiniones">
            <h2 id="courier-opiniones" class="text-h5 font-weight-bold mb-3">
              Qué dicen los usuarios
            </h2>
            <div v-if="page.ratingLabel" class="d-flex align-center flex-wrap ga-2 mb-2">
              <span
                class="entity-stars"
                role="img"
                :aria-label="`${page.ratingLabel} de 5 según reseñas públicas`"
              >
                <VIcon v-for="n in stars.full" :key="`f${n}`" size="18" color="amber-darken-3">
                  mdi-star
                </VIcon>
                <VIcon v-if="stars.half" size="18" color="amber-darken-3">mdi-star-half-full</VIcon>
                <VIcon v-for="n in stars.empty" :key="`e${n}`" size="18" color="grey">
                  mdi-star-outline
                </VIcon>
              </span>
              <strong>{{ page.ratingLabel }} / 5</strong>
            </div>
            <p class="text-body-1 entity-prose mb-0">{{ page.reviewsNote }}</p>
            <p v-if="page.reviewSources.length" class="text-caption text-medium-emphasis mt-2 mb-0">
              Las reseñas citadas están enlazadas en las fuentes, al pie de la página.
            </p>
          </section>

          <!-- The statutory surcharge, from POSTAL_SURCHARGE: this page never types its acronym -->
          <VAlert
            type="info"
            variant="tonal"
            density="comfortable"
            class="mb-8"
            icon="mdi-receipt-text-outline"
          >
            <p class="mb-1">
              <strong v-if="page.surcharge.included">
                {{ page.name }} publica su tarifa como todo incluido: esta página no le suma el
                {{ page.surcharge.ratePct }}% de {{ page.surcharge.label }} aparte.
              </strong>
              <strong v-else>
                El {{ page.surcharge.ratePct }}% de {{ page.surcharge.label }} que se suma a la
                tarifa es un tributo.
              </strong>
              Es la {{ page.surcharge.name }}: {{ page.surcharge.ratePct }}% sobre
              {{ page.surcharge.base }}. {{ page.surcharge.summary }}
            </p>
            <p class="mt-2 mb-0">
              En la factura puede figurar como {{ page.surcharge.aliases }}: es el mismo cargo.
              <NuxtLink :to="localePath(page.surcharge.faqPath)" class="entity-link">
                Cómo se calcula y cómo controlarla </NuxtLink
              >. Fuente: {{ page.surcharge.source }}.
            </p>
          </VAlert>

          <!-- Head-to-heads this courier already takes part in -->
          <section v-if="page.comparisons.length" class="mb-8" aria-labelledby="courier-vs">
            <h2 id="courier-vs" class="text-h5 font-weight-bold mb-2">
              {{ page.name }} contra otros couriers
            </h2>
            <p class="text-body-2 text-medium-emphasis mt-0 mb-3">
              Cada comparación pone lado a lado la tarifa por kilo, el cargo fijo, la demora y la
              reputación de los dos couriers.
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
          </section>

          <!-- Siblings -->
          <section v-if="page.siblings.length" class="mb-8" aria-labelledby="courier-otros">
            <h2 id="courier-otros" class="text-h5 font-weight-bold mb-3">
              Otros couriers para mirar
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
            <h2 class="text-subtitle-1 font-weight-bold mb-3">Antes de comprar</h2>
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
            <ul class="entity-link-list">
              <li v-for="source in page.sources" :key="source.url">
                <a :href="source.url" target="_blank" rel="noopener noreferrer">
                  {{ source.label }}
                </a>
              </li>
            </ul>
          </VCard>

          <VAlert
            type="warning"
            variant="tonal"
            density="comfortable"
            icon="mdi-alert-outline"
            class="mb-2"
          >
            Las tarifas son <strong>de referencia</strong>, verificadas el
            {{ page.verifiedLabel }} a partir del sitio de {{ page.name }}, y cambian con
            frecuencia. Confirmá el precio exacto con el courier antes de comprar. No es
            asesoramiento profesional y no tenemos afiliación con los couriers listados.
          </VAlert>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { getCourierPage } from '~/utils/courierPages'
import { entityIdForSlug } from '~/utils/entityPageSlugs'
import { starParts } from '~/utils/reviews'

// The slug map is static and import-free, so the guard resolves it directly: an unknown courier
// is a real 404 before anything renders, never an empty page answered with 200. `validate` is
// extracted at build time; editing the slug map needs a dev-server restart.
definePageMeta({
  validate: route => Boolean(entityIdForSlug('couriers', String(route.params.courier ?? ''))),
})

const localePath = useLocalePath()
const route = useRoute()

const page = computed(() => getCourierPage(String(route.params.courier ?? '')))

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Courier no encontrado' })
}

const stars = computed(() => starParts(page.value?.rating ?? null))
const canonicalUrl = computed(() => `https://cambio-uruguay.com${page.value?.path ?? ''}`)

defineOgImageComponent('Cambio', {
  title: () => page.value?.name ?? '',
  subtitle: () => page.value?.modality ?? '',
  tag: 'COURIER',
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
.entity-table .total-row td {
  font-weight: 700;
  border-top: 2px solid rgba(var(--v-border-color), 0.28);
}
/* A fee the note publishes on top: shown next to the total, visibly not part of it. */
.entity-table .aside-row td {
  font-size: 0.86rem;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.entity-stars {
  display: inline-flex;
  align-items: center;
  gap: 1px;
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
.entity-link-list a,
.entity-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.entity-link-list a:hover,
.entity-link:hover {
  text-decoration: underline;
}
</style>
