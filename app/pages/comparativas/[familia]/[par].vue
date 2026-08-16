<template>
  <div v-if="pair && family" class="comparativa-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="9">
          <div class="mb-4">
            <VBtn
              :to="localePath(`/comparativas/${family.slug}`)"
              variant="text"
              size="small"
              class="px-1"
            >
              <VIcon start size="small">mdi-arrow-left</VIcon>
              Comparativas de {{ family.label }}
            </VBtn>
          </div>

          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">{{ family.icon }}</VIcon>
              {{ family.label }}
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">{{ heading }}</h1>
            <p class="text-body-1 comparativa-lead">{{ summary }}</p>
            <ShareButtons class="mt-4" :url="canonicalUrl" :text="heading" />
          </header>

          <!-- Scores side by side -->
          <section v-if="comparison.rows.length" class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Eje por eje</h2>
            <p class="text-body-2 text-medium-emphasis mb-3">
              {{ family.intro }} Una diferencia menor a {{ TIE_MARGIN }} puntos se cuenta como
              empate: el puntaje es un juicio de investigación, no una medición al decimal.
            </p>
            <div class="table-scroll">
              <table class="comparativa-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Eje (peso)</th>
                    <th>{{ pair.a.shortName }}</th>
                    <th>{{ pair.b.shortName }}</th>
                    <th>Gana</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in comparison.rows" :key="row.dimension.id">
                    <td>{{ row.dimension.label }} ({{ row.dimension.weight }}%)</td>
                    <td :data-label="pair.a.shortName">{{ row.a }}</td>
                    <td :data-label="pair.b.shortName">{{ row.b }}</td>
                    <td data-label="Gana">
                      {{
                        row.winner === 'tie'
                          ? 'Empate'
                          : row.winner === 'a'
                            ? pair.a.shortName
                            : pair.b.shortName
                      }}
                    </td>
                  </tr>
                  <tr v-if="pair.a.overall !== null && pair.b.overall !== null" class="total-row">
                    <td>Puntaje general</td>
                    <td :data-label="pair.a.shortName">{{ Math.round(pair.a.overall) }}</td>
                    <td :data-label="pair.b.shortName">{{ Math.round(pair.b.overall) }}</td>
                    <td data-label="Gana">
                      {{
                        comparison.overallWinner === 'tie'
                          ? 'Empate'
                          : comparison.overallWinner === 'a'
                            ? pair.a.shortName
                            : pair.b.shortName
                      }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Facts side by side -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Los datos, uno al lado del otro</h2>
            <div class="table-scroll">
              <table class="comparativa-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Dato</th>
                    <th>{{ pair.a.shortName }}</th>
                    <th>{{ pair.b.shortName }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in factRows" :key="row.label">
                    <td>{{ row.label }}</td>
                    <td :data-label="pair.a.shortName">{{ row.a }}</td>
                    <td :data-label="pair.b.shortName">{{ row.b }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Pros and cons -->
          <section v-if="hasProsCons" class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">A favor y en contra</h2>
            <VRow>
              <VCol v-for="side in sides" :key="side.slug" cols="12" md="6">
                <VCard variant="flat" class="comparativa-card pa-4 h-100">
                  <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ side.name }}</h3>
                  <p class="text-caption text-medium-emphasis mb-3">{{ side.subtitle }}</p>
                  <template v-if="side.pros.length">
                    <p class="comparativa-sublabel">A favor</p>
                    <ul class="comparativa-bullets mb-3">
                      <li v-for="(item, i) in side.pros" :key="`p-${i}`">{{ item }}</li>
                    </ul>
                  </template>
                  <template v-if="side.cons.length">
                    <p class="comparativa-sublabel">En contra</p>
                    <ul class="comparativa-bullets mb-0">
                      <li v-for="(item, i) in side.cons" :key="`c-${i}`">{{ item }}</li>
                    </ul>
                  </template>
                </VCard>
              </VCol>
            </VRow>
          </section>

          <!-- Verdicts -->
          <section v-if="hasVerdicts" class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Nuestra lectura de cada uno</h2>
            <div v-for="side in sides" :key="`v-${side.slug}`" class="mb-4">
              <template v-if="side.verdict">
                <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ side.shortName }}</h3>
                <p class="text-body-1 comparativa-prose mb-0">{{ side.verdict }}</p>
              </template>
            </div>
          </section>

          <!-- Sources -->
          <VCard v-if="sources.length" variant="flat" class="comparativa-card pa-5 mb-6">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">
              <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
              Fuentes
            </h2>
            <ul class="comparativa-sources">
              <li v-for="source in sources" :key="source.url">
                <a :href="source.url" target="_blank" rel="noopener noreferrer">{{
                  source.label
                }}</a>
                <span v-if="source.publisher" class="source-publisher">
                  — {{ source.publisher }}</span
                >
              </li>
            </ul>
          </VCard>

          <!-- Other pairs -->
          <VCard variant="flat" class="comparativa-card pa-5">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">Otras comparaciones</h2>
            <div class="d-flex flex-wrap ga-2">
              <VChip
                v-for="other in related"
                :key="other.slug"
                :to="localePath(`/comparativas/${other.family}/${other.slug}`)"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                {{ other.a.shortName }} vs {{ other.b.shortName }}
              </VChip>
              <VChip :to="localePath(family.hub)" color="primary" variant="flat" size="small" link>
                <VIcon start size="small">{{ family.icon }}</VIcon>
                Ranking completo
              </VChip>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import {
  TIE_MARGIN,
  comparativaDescription,
  comparativaHeading,
  comparativaSummary,
  compareEntities,
  getComparativaFamily,
  getComparativaPair,
  relatedPairs,
  type ComparableSource,
} from '~/utils/comparativas'

// The pair catalogue is static and pure, so the guard resolves it directly and
// an unknown pair (or a reversed one — the slug is canonical) 404s without
// rendering. `validate` is extracted at build time; editing the catalogue needs
// a dev-server restart.
definePageMeta({
  validate: route =>
    Boolean(getComparativaPair(String(route.params.familia ?? ''), String(route.params.par ?? ''))),
})

const localePath = useLocalePath()
const route = useRoute()

const familySlug = computed(() => String(route.params.familia ?? ''))
const parSlug = computed(() => String(route.params.par ?? ''))

const family = computed(() => getComparativaFamily(familySlug.value))
const pair = computed(() => getComparativaPair(familySlug.value, parSlug.value))

if (!pair.value || !family.value) {
  throw createError({ statusCode: 404, statusMessage: 'Comparación no encontrada' })
}

const comparison = computed(() =>
  pair.value
    ? compareEntities(pair.value)
    : { rows: [], overallWinner: null, aStrengths: [], bStrengths: [], ties: [] }
)

const heading = computed(() => (pair.value ? comparativaHeading(pair.value) : ''))
const summary = computed(() => (pair.value ? comparativaSummary(pair.value) : ''))
const description = computed(() => (pair.value ? comparativaDescription(pair.value) : ''))

const sides = computed(() => (pair.value ? [pair.value.a, pair.value.b] : []))

const hasProsCons = computed(() => sides.value.some(side => side.pros.length || side.cons.length))
const hasVerdicts = computed(() => sides.value.some(side => side.verdict))

/**
 * Facts aligned by label so the two columns line up.
 *
 * The catalogues do not guarantee the same fact set for both sides (an optional
 * "cuánto vale el punto" exists on some card programs and not others), so a
 * missing value becomes an em dash rather than shifting the rows out of step.
 */
const factRows = computed(() => {
  const a = pair.value?.a
  const b = pair.value?.b
  if (!a || !b) return []
  const labels: string[] = []
  for (const fact of [...a.facts, ...b.facts]) {
    if (!labels.includes(fact.label)) labels.push(fact.label)
  }
  return labels.map(label => ({
    label,
    a: a.facts.find(fact => fact.label === label)?.value ?? '—',
    b: b.facts.find(fact => fact.label === label)?.value ?? '—',
  }))
})

const sources = computed<ComparableSource[]>(() => {
  const seen = new Set<string>()
  const out: ComparableSource[] = []
  for (const source of sides.value.flatMap(side => side.sources)) {
    if (seen.has(source.url)) continue
    seen.add(source.url)
    out.push(source)
  }
  return out
})

const related = computed(() => (pair.value ? relatedPairs(pair.value) : []))

const canonicalUrl = computed(
  () => `https://cambio-uruguay.com/comparativas/${familySlug.value}/${parSlug.value}`
)

defineOgImageComponent('Cambio', {
  title: () => heading.value,
  subtitle: () => family.value?.label ?? '',
  tag: 'COMPARATIVA',
})

useSeoMeta({
  title: () =>
    `${pair.value ? `${pair.value.a.shortName} vs ${pair.value.b.shortName}` : ''} | Cambio Uruguay`,
  description: () => description.value,
  ogTitle: () => heading.value,
  ogDescription: () => description.value,
  ogType: 'article',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Article',
              headline: heading.value,
              description: description.value,
              inLanguage: 'es-UY',
              mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl.value },
              author: {
                '@type': 'Person',
                name: 'Eduardo Airaudo',
                url: 'https://www.linkedin.com/in/eduardo-airaudo/',
              },
              publisher: {
                '@type': 'Organization',
                name: 'Cambio Uruguay',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://cambio-uruguay.com/img/logo.png',
                },
              },
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
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Comparativas',
                  item: 'https://cambio-uruguay.com/comparativas',
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: family.value?.label,
                  item: `https://cambio-uruguay.com/comparativas/${familySlug.value}`,
                },
                { '@type': 'ListItem', position: 4, name: heading.value, item: canonicalUrl.value },
              ],
            },
          ],
        })
      ),
    },
  ],
})
</script>

<style scoped>
.comparativa-lead,
.comparativa-prose {
  line-height: 1.75;
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.comparativa-card {
  background: rgba(var(--v-theme-on-surface), 0.03);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
}

.comparativa-sublabel {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-bottom: 4px;
}

.comparativa-bullets {
  padding-left: 1.1rem;
  line-height: 1.65;
  font-size: 0.92rem;
  color: rgba(var(--v-theme-on-surface), 0.86);
}
.comparativa-bullets li {
  margin-bottom: 0.35rem;
}

.comparativa-sources {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
}
.comparativa-sources a {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
  font-weight: 600;
}
.comparativa-sources a:hover {
  text-decoration: underline;
}
.source-publisher {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.table-scroll {
  overflow-x: auto;
}
.comparativa-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}
.comparativa-table th,
.comparativa-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  text-align: left;
  vertical-align: top;
}
.comparativa-table thead th {
  font-weight: 700;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.comparativa-table tbody td:first-child {
  font-weight: 600;
}
.comparativa-table .total-row td {
  font-weight: 700;
  border-top: 2px solid rgba(var(--v-border-color), 0.28);
}
</style>
