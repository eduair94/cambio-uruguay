<template>
  <!-- nofollow: cada tarjeta enlaza a SU comparación (`?motos=<key>`, noindex), una URL por aviso
       que no le sirve a ningún buscador. La misma regla que el botón de autos. -->
  <VBtn
    :to="localePath(motoCompareLocation(motoKey))"
    :rel="motoKey ? 'nofollow' : undefined"
    variant="outlined"
    size="small"
    prepend-icon="mdi-compare-horizontal"
    class="moto-compare-link"
  >
    {{ motoKey ? 'Comparar esta moto' : 'Comparar motos' }}
  </VBtn>
</template>

<script setup lang="ts">
import { motoCompareLocation } from '~/utils/motos'

defineProps<{ motoKey?: string }>()
const localePath = useLocalePath()
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
