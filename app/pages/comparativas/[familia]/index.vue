<template>
  <div v-if="family" class="comparativa-family">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10">
          <div class="mb-4">
            <VBtn :to="localePath('/comparativas')" variant="text" size="small" class="px-1">
              <VIcon start size="small">mdi-arrow-left</VIcon>
              Todas las comparativas
            </VBtn>
          </div>

          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">{{ family.icon }}</VIcon>
              {{ pairs.length }} comparaciones
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">{{ heading }}</h1>
            <p class="text-body-1 family-lead">{{ family.intro }}</p>
            <VBtn
              :to="localePath(family.hub)"
              color="primary"
              variant="tonal"
              size="small"
              class="mt-4"
            >
              <VIcon start size="small">{{ family.icon }}</VIcon>
              Ver el ranking completo
            </VBtn>
          </header>

          <VDivider class="mb-6" />

          <!-- One block per entity: every comparison it takes part in -->
          <section v-for="entity in family.entities" :key="entity.slug" class="mb-7">
            <h2 class="text-h6 font-weight-bold mb-1">{{ entity.name }}</h2>
            <p class="text-caption text-medium-emphasis mb-3">
              {{ entity.subtitle
              }}<span v-if="entity.overall !== null">
                · {{ Math.round(entity.overall) }} puntos</span
              >
            </p>
            <div class="d-flex flex-wrap ga-2">
              <VChip
                v-for="pair in pairsOf(entity.slug)"
                :key="pair.slug"
                :to="localePath(`/comparativas/${family.slug}/${pair.slug}`)"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                vs {{ other(pair, entity.slug) }}
              </VChip>
            </div>
          </section>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { familyPairs, getComparativaFamily, type ComparativaPair } from '~/utils/comparativas'

definePageMeta({
  validate: route => Boolean(getComparativaFamily(String(route.params.familia ?? ''))),
})

const localePath = useLocalePath()
const route = useRoute()

const family = computed(() => getComparativaFamily(String(route.params.familia ?? '')))

if (!family.value) {
  throw createError({ statusCode: 404, statusMessage: 'Categoría no encontrada' })
}

const pairs = computed(() => (family.value ? familyPairs(family.value) : []))

const pairsOf = (slug: string) =>
  pairs.value.filter(pair => pair.a.slug === slug || pair.b.slug === slug)

const other = (pair: ComparativaPair, slug: string) =>
  pair.a.slug === slug ? pair.b.shortName : pair.a.shortName

const heading = computed(() => `Comparativas de ${family.value?.label ?? ''} en Uruguay`)
const description = computed(
  () =>
    `${pairs.value.length} comparaciones uno contra uno de ${family.value?.label ?? ''} en Uruguay, con los mismos criterios y los mismos datos verificados para los dos lados.`
)

const canonicalUrl = computed(
  () => `https://cambio-uruguay.com/comparativas/${family.value?.slug ?? ''}`
)

defineOgImageComponent('Cambio', {
  title: () => heading.value,
  subtitle: () => description.value,
  tag: 'COMPARATIVAS',
})

useSeoMeta({
  title: () => `${heading.value} | Cambio Uruguay`,
  description: () => description.value,
  ogTitle: () => heading.value,
  ogDescription: () => description.value,
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
})
</script>

<style scoped>
.family-lead {
  line-height: 1.75;
  color: rgba(var(--v-theme-on-surface), 0.86);
}
</style>
