<template>
  <div class="comparativas-index">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10">
          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">mdi-compare-horizontal</VIcon>
              {{ total }} comparaciones
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
              Comparativas: cuál conviene entre dos
            </h1>
            <p class="text-body-1 index-lead">
              Elegir casi nunca es mirar un ranking entero: es tener dos opciones sobre la mesa y
              querer saber cuál rinde más para lo tuyo. Acá está cada par enfrentado con los mismos
              criterios, los mismos pesos y los mismos datos verificados para los dos lados. Nada de
              lo que leas en una comparación es una opinión escrita para ese par: sale del mismo
              relevamiento que alimenta los rankings completos.
            </p>
          </header>

          <VRow>
            <VCol v-for="family in families" :key="family.slug" cols="12" sm="6">
              <NuxtLink :to="localePath(`/comparativas/${family.slug}`)" class="family-tile">
                <div class="d-flex align-center ga-2 mb-2">
                  <VIcon size="small" color="primary">{{ family.icon }}</VIcon>
                  <span class="family-title">{{ capitalize(family.label) }}</span>
                </div>
                <p class="family-count">
                  {{ countOf(family.slug) }} comparaciones · {{ family.entities.length }}
                  {{ family.entities.length === 1 ? 'opción' : 'opciones' }}
                </p>
                <p class="family-intro">{{ family.intro }}</p>
              </NuxtLink>
            </VCol>
          </VRow>

          <section class="mt-8">
            <h2 class="text-h5 font-weight-bold mb-3">Las más buscadas</h2>
            <div class="d-flex flex-wrap ga-2">
              <VChip
                v-for="pair in highlights"
                :key="`${pair.family}/${pair.slug}`"
                :to="localePath(`/comparativas/${pair.family}/${pair.slug}`)"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                {{ pair.a.shortName }} vs {{ pair.b.shortName }}
              </VChip>
            </div>
          </section>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import {
  COMPARATIVA_FAMILY_META,
  allComparativaPairs,
  familyPairs,
  getComparativaFamily,
} from '~/utils/comparativas'

const localePath = useLocalePath()

const families = COMPARATIVA_FAMILY_META
const total = allComparativaPairs().length

const countOf = (slug: string) => {
  const family = getComparativaFamily(slug)
  return family ? familyPairs(family).length : 0
}

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase('es') + text.slice(1)

/**
 * The pairs worth surfacing on the hub: the top of each family's ranking against
 * each other. Ordering the whole 367-pair list would be a wall of chips.
 */
const highlights = computed(() =>
  COMPARATIVA_FAMILY_META.flatMap(family => {
    const top = family.entities.slice(0, 4).map(entity => entity.slug)
    return familyPairs(family)
      .filter(pair => top.includes(pair.a.slug) && top.includes(pair.b.slug))
      .slice(0, 6)
  })
)

const title = 'Comparativas: cuál conviene entre dos'
const description = `${total} comparaciones uno contra uno entre bancos, fintechs, tarjetas de crédito, tarjetas de débito y couriers en Uruguay, con los mismos criterios y datos verificados para los dos lados.`

defineOgImageComponent('Cambio', { title, subtitle: description, tag: 'COMPARATIVAS' })

useSeoMeta({
  title: `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: 'https://cambio-uruguay.com/comparativas',
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://cambio-uruguay.com/comparativas' }],
})
</script>

<style scoped>
.index-lead {
  line-height: 1.75;
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.family-tile {
  display: block;
  height: 100%;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-on-surface), 0.03);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease;
}
.family-tile:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
}
.family-title {
  font-weight: 700;
  font-size: 1.02rem;
}
.family-count {
  font-size: 0.78rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-bottom: 8px;
}
.family-intro {
  font-size: 0.9rem;
  line-height: 1.6;
  color: rgba(var(--v-theme-on-surface), 0.78);
  margin-bottom: 0;
}
</style>
