<template>
  <!-- Con un aviso, un botón y no un enlace: la misma regla que el de autos
       (components/cars/CompareLink.vue). Una URL `?motos=<key>` por aviso y por idioma es lo que
       recorre la granja que ignora robots.txt y `nofollow`. -->
  <VBtn
    :to="motoKey ? undefined : localePath(motoCompareLocation())"
    variant="outlined"
    size="small"
    prepend-icon="mdi-compare-horizontal"
    class="moto-compare-link"
    @click="openOwnComparison"
  >
    {{ motoKey ? 'Comparar esta moto' : 'Comparar motos' }}
  </VBtn>
</template>

<script setup lang="ts">
import { motoCompareLocation } from '~/utils/motos'

const props = defineProps<{ motoKey?: string }>()
const localePath = useLocalePath()

function openOwnComparison() {
  if (!props.motoKey) return
  return navigateTo(localePath(motoCompareLocation(props.motoKey)))
}
</script>

<style scoped>
.moto-compare-link {
  position: relative;
  /* Encima del enlace que cubre la tarjeta, para que el botón conserve el suyo. */
  z-index: 1;
  align-self: flex-start;
  margin-top: 8px;
}
</style>
