<!--
  La foto representativa de un tipo (plegable, urbana, alto rendimiento…) en las tarjetas de banda
  de /monopatines-electricos-uruguay y /bicicletas-electricas-uruguay.

  Existe como componente por una sola razón: cada foto necesita su PROPIO estado de "esta URL se
  murió" para poder caer al ícono sin apagar las demás, y un `v-for` en la página comparte una
  única `ref`. La foto la eligió el backend (`EquiparItem.image`) entre tienda y Mercado Libre,
  nunca de Facebook Marketplace.
-->
<template>
  <span class="mv-thumb">
    <img
      v-if="src && !failed"
      :src="src"
      :alt="alt"
      loading="lazy"
      width="112"
      height="112"
      referrerpolicy="no-referrer"
      @error="failed = true"
    />
    <VIcon v-else :icon="icon" size="26" />
  </span>
</template>

<script setup lang="ts">
defineProps<{
  src: string | null
  alt: string
  icon: string
}>()

const failed = ref(false)
</script>

<style scoped>
.mv-thumb {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.06);
  opacity: 1;
}
.mv-thumb :deep(.v-icon) {
  opacity: 0.5;
}
.mv-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
