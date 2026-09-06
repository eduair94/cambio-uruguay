<template>
  <NuxtPage v-if="route.params.key" />
  <PropertySalesDirectory v-else />
</template>
<script setup lang="ts">
const route = useRoute()
</script>
