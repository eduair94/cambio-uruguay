<template>
  <VBtn
    :to="localePath(carComparisonLocation(carKey))"
    variant="outlined"
    size="small"
    prepend-icon="mdi-compare-horizontal"
    class="car-compare-link"
  >
    {{ t(carKey ? 'compareCar' : 'compare') }}
  </VBtn>
</template>

<script setup lang="ts">
import { carComparisonLocation } from '~/utils/carComparison'

defineProps<{ carKey?: string }>()
const localePath = useLocalePath()
const { t } = useI18n({
  useScope: 'local',
  messages: {
    es: { compareCar: 'Comparar este auto', compare: 'Comparar autos' },
    en: { compareCar: 'Compare this car', compare: 'Compare cars' },
    pt: { compareCar: 'Comparar este carro', compare: 'Comparar carros' },
  },
})
</script>

<style scoped>
.car-compare-link {
  position: relative;
  z-index: 1;
  align-self: flex-start;
  margin-top: 8px;
}
</style>
