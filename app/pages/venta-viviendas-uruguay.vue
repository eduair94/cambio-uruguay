<template>
  <NuxtPage v-if="route.params.key" />
  <PropertySalesDirectory v-else />
</template>
<script setup lang="ts">
// El directorio usa el ancho del marco (layouts/default.vue); la ficha hija lo apaga.
definePageMeta({ wide: true })
const route = useRoute()
</script>
