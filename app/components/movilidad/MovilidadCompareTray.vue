<!--
  La bandeja "Comparar" de /monopatines-electricos-uruguay (y, con `compare-path`, la de
  /bicicletas-electricas-uruguay): aparece fija abajo cuando el lector marca
  un modelo en la tabla, junta hasta MONOPATIN_COMPARE_MAX y lleva al comparador con esos modelos en la
  URL (?m=a,b,c), que es lo que hace que la comparación se pueda compartir.
-->
<template>
  <Transition name="compare-tray">
    <aside v-if="items.length" class="compare-tray" :aria-label="label">
      <div class="compare-tray__inner">
        <p class="compare-tray__count" aria-live="polite">
          <strong>{{ countLabel }}</strong>
          <span class="compare-tray__hint">Hasta {{ MONOPATIN_COMPARE_MAX }} modelos</span>
        </p>
        <ul class="compare-tray__list">
          <li v-for="item in items" :key="item.slug" class="compare-tray__item">
            <span class="compare-tray__name">{{ item.name }}</span>
            <button
              type="button"
              class="compare-tray__remove"
              :aria-label="`Sacar ${item.name} de la comparación`"
              @click="emit('remove', item.slug)"
            >
              <VIcon icon="mdi-close" size="16" aria-hidden="true" />
            </button>
          </li>
        </ul>
        <div class="compare-tray__actions">
          <VBtn variant="text" size="small" @click="emit('clear')">Limpiar</VBtn>
          <VBtn
            color="primary"
            variant="flat"
            :disabled="items.length < 2"
            :to="items.length >= 2 ? link : undefined"
          >
            Comparar
          </VBtn>
        </div>
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { MONOPATIN_COMPARE_MAX } from '~/utils/monopatinModelos'

const props = withDefaults(
  defineProps<{
    items: Array<{ slug: string; name: string }>
    /** El comparador de la categoría; sin él, el de monopatines. */
    comparePath?: string
    label?: string
  }>(),
  { comparePath: '/monopatines-electricos-uruguay/comparar', label: 'Comparar monopatines' }
)
const emit = defineEmits<{ remove: [slug: string]; clear: [] }>()

const countLabel = computed(() =>
  props.items.length === 1
    ? 'Elegí otro modelo para comparar'
    : `${props.items.length} modelos elegidos`
)

// Literal y sin localePath: las páginas de modelo y el comparador son sólo en español, como las
// fichas de celulares.
const link = computed(() => ({
  path: props.comparePath,
  query: { m: props.items.map(item => item.slug).join(',') },
}))
</script>

<style scoped>
.compare-tray {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 1004;
  padding: 0 12px 12px;
  pointer-events: none;
}
.compare-tray__inner {
  pointer-events: auto;
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}
.compare-tray__count {
  display: flex;
  flex-direction: column;
  margin: 0;
  line-height: 1.3;
}
.compare-tray__hint {
  font-size: 0.8125rem;
  opacity: 0.72;
}
.compare-tray__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  flex: 1 1 280px;
}
.compare-tray__item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 4px 4px 12px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.1);
  font-size: 0.875rem;
}
.compare-tray__remove {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: inherit;
}
.compare-tray__remove:hover,
.compare-tray__remove:focus-visible {
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.compare-tray__actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
.compare-tray-enter-active,
.compare-tray-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.compare-tray-enter-from,
.compare-tray-leave-to {
  transform: translateY(16px);
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .compare-tray-enter-active,
  .compare-tray-leave-active {
    transition: none;
  }
}
</style>
