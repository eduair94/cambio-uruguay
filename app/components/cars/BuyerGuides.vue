<template>
  <section class="cars-buyer-guides">
    <h2 class="text-h6 mb-2">{{ heading }}</h2>
    <ul class="cars-buyer-guides__list">
      <li v-for="guide in guides" :key="guide.to">
        <NuxtLink :to="localePath(guide.to)">{{ guide.label }}</NuxtLink>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { CAR_BUYER_GUIDES, type CarBuyerGuide } from '~/utils/carBuyerGuides'

// Lista de guías para quien está por comprar un usado. La comparten el tramo de presupuesto, la
// página de modelo y la ficha del aviso: ver `utils/carBuyerGuides.ts`.
withDefaults(
  defineProps<{
    heading?: string
    guides?: readonly CarBuyerGuide[]
  }>(),
  {
    heading: 'Qué revisar antes de comprar',
    guides: () => CAR_BUYER_GUIDES,
  }
)

const localePath = useLocalePath()
</script>

<style scoped>
.cars-buyer-guides__list {
  margin: 0;
  padding-left: 1.25rem;
  display: grid;
  gap: 0.35rem;
}

@media (min-width: 720px) {
  .cars-buyer-guides__list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 2rem;
  }
}
</style>
