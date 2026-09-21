<template>
  <!--
    Only once the client has read the list (`ready`): SSR never knows the list, so rendering the
    bar on the server would hydrate against a different tree. Nothing shows while the list is empty.
  -->
  <ClientOnly>
    <div v-if="ready && lines.length" class="eq-bar" role="status" data-testid="equipar-lista-bar">
      <span class="eq-bar__text">
        <strong>{{ lines.length }}</strong> {{ lines.length === 1 ? 'ítem' : 'ítems' }} ·
        <strong>{{ equiparMoneyNbsp(total) }}</strong>
      </span>
      <VBtn
        color="primary"
        size="small"
        :to="localePath(EQUIPAR_LISTA_PATH)"
        prepend-icon="mdi-playlist-check"
        class="eq-bar__btn"
      >
        Ver mi lista
      </VBtn>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { EQUIPAR_LISTA_PATH, equiparListaTotal, equiparMoneyNbsp } from '~/utils/equiparProductos'

const { lines, ready } = useEquiparLista()
const localePath = useLocalePath()
const total = computed(() => equiparListaTotal(lines.value))
</script>

<style scoped>
.eq-bar {
  position: sticky;
  bottom: 0;
  z-index: 7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding: 10px 16px;
  padding-bottom: max(10px, env(safe-area-inset-bottom));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px 12px 0 0;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.08);
}
.eq-bar__text {
  font-size: 0.95rem;
  min-width: 0;
}
.eq-bar__btn {
  text-transform: none;
  letter-spacing: 0;
  flex: 0 0 auto;
}
</style>
