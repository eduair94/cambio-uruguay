<template>
  <!-- Con un aviso, un botón y no un enlace: cada tarjeta abría SU comparación (`?autos=<key>`,
       noindex y fuera de robots.txt), una URL por aviso y por idioma. Una granja que ignora
       robots.txt y `nofollow` las recorría igual: del 24 al 25/11/2026 fue 137 de las últimas 250
       sesiones de Clarity, todas de una página y cero toques. Sin `href` no hay URL que descubrir;
       la persona que toca el botón llega a la misma comparación. -->
  <VBtn
    :to="carKey ? undefined : localePath(carComparisonLocation())"
    variant="outlined"
    size="small"
    prepend-icon="mdi-compare-horizontal"
    class="car-compare-link"
    @click="openOwnComparison"
  >
    {{ t(carKey ? 'compareCar' : 'compare') }}
  </VBtn>
</template>

<script setup lang="ts">
import { carComparisonLocation } from '~/utils/carComparison'

const props = defineProps<{ carKey?: string }>()
const localePath = useLocalePath()
const { t } = useI18n({
  useScope: 'local',
  messages: {
    es: { compareCar: 'Comparar este auto', compare: 'Comparar autos' },
    en: { compareCar: 'Compare this car', compare: 'Compare cars' },
    pt: { compareCar: 'Comparar este carro', compare: 'Comparar carros' },
  },
})

function openOwnComparison() {
  if (!props.carKey) return
  return navigateTo(localePath(carComparisonLocation(props.carKey)))
}
</script>

<style scoped>
.car-compare-link {
  position: relative;
  z-index: 1;
  align-self: flex-start;
  margin-top: 8px;
}
</style>
