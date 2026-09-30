<template>
  <nav class="ua-tabs" aria-label="Categorías de apps">
    <!-- Pantalla ancha: todas las categorías a la vista, en pastillas que envuelven. -->
    <ul class="ua-tabs__list">
      <li v-for="tab in tabs" :key="tab.id">
        <a
          :href="tab.href"
          class="ua-tabs__pill"
          :class="{ 'ua-tabs__pill--current': tab.id === current }"
          :aria-current="tab.id === current ? 'true' : undefined"
          @click="onSelect($event, tab.id)"
        >
          <VIcon size="18" aria-hidden="true">{{ tab.icon }}</VIcon>
          <span>{{ tab.label }}</span>
          <span class="ua-tabs__count">{{ tab.count }}</span>
        </a>
      </li>
    </ul>

    <!-- Celular: la categoría actual y la lista entera hacia abajo, con filas de 48 px. -->
    <details ref="menu" class="ua-tabs__menu" @keydown.esc="close(true)">
      <summary class="ua-tabs__summary">
        <VIcon class="ua-tabs__summary-icon" size="22" aria-hidden="true">
          {{ currentTab.icon }}
        </VIcon>
        <span class="ua-tabs__summary-text">
          <span class="ua-tabs__overline">Categoría</span>
          <span class="ua-tabs__summary-current">
            {{ currentTab.label }} · {{ currentTab.count }}
          </span>
        </span>
        <VIcon class="ua-tabs__chevron" size="24" aria-hidden="true">mdi-chevron-down</VIcon>
      </summary>
      <ul class="ua-tabs__menu-list">
        <li v-for="tab in tabs" :key="tab.id">
          <a
            :href="tab.href"
            class="ua-tabs__row"
            :class="{ 'ua-tabs__row--current': tab.id === current }"
            :aria-current="tab.id === current ? 'true' : undefined"
            @click="onSelect($event, tab.id)"
          >
            <VIcon size="20" aria-hidden="true">{{ tab.icon }}</VIcon>
            <span class="ua-tabs__row-label">{{ tab.label }}</span>
            <span class="ua-tabs__count">{{ tab.count }}</span>
          </a>
        </li>
      </ul>
    </details>
  </nav>
</template>

<script setup lang="ts">
// Las pestañas del directorio son ENLACES (`?categoria=…`), no botones: este sitio pierde los toques
// previos a la hidratación, y un enlace que se toca antes navega a la pestaña ya filtrada por el
// servidor. Ya hidratado, el clic se resuelve en el cliente (la página reescribe la URL con
// history.replaceState). Ctrl/⌘-clic y el botón del medio siguen abriendo una pestaña nueva.
//
// Dos formas por ancho, cambiadas por CSS y no por JavaScript (el HTML del servidor es uno solo):
// ≥ 960 px una fila de pastillas que envuelve; debajo, un <details> nativo como FamiliaNav, porque
// una fila con scroll lateral en el celular muestra dos categorías y esconde ocho.
import type { UsefulAppsTab } from '~/utils/usefulApps'
import type { UsefulAppsTabLink } from '~/utils/usefulAppsView'

const props = defineProps<{ tabs: UsefulAppsTabLink[]; current: UsefulAppsTab }>()
const emit = defineEmits<{ select: [tab: UsefulAppsTab] }>()

const menu = ref<HTMLDetailsElement | null>(null)
const currentTab = computed(
  () => props.tabs.find(tab => tab.id === props.current) ?? props.tabs[0]!
)

function close(returnFocus: boolean) {
  if (!menu.value?.open) return
  menu.value.open = false
  if (returnFocus) menu.value.querySelector('summary')?.focus()
}

function onSelect(event: MouseEvent, tab: UsefulAppsTab) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  emit('select', tab)
  // Cerrar el <details> con el foco adentro lo tiraba a <body>: vuelve al resumen, que ahora dice
  // la categoría elegida.
  close(true)
}
</script>

<style scoped>
.ua-tabs__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ua-tabs__pill {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  min-height: 44px;
  padding: 8px 16px 8px 12px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 999px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
  text-decoration: none;
  white-space: nowrap;
}
.ua-tabs__pill:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
}
.ua-tabs__pill--current {
  border-color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}
.ua-tabs__count {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  opacity: 0.8;
}
.ua-tabs__pill:focus-visible,
.ua-tabs__summary:focus-visible,
.ua-tabs__row:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 2px;
}
.ua-tabs__menu {
  display: none;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
}
.ua-tabs__summary {
  display: flex;
  gap: 12px;
  align-items: center;
  min-height: 56px;
  padding: 8px 12px 8px 16px;
  cursor: pointer;
  list-style: none;
  user-select: none;
}
.ua-tabs__summary::-webkit-details-marker {
  display: none;
}
.ua-tabs__summary-icon {
  color: rgb(var(--v-theme-primary));
}
.ua-tabs__summary-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
.ua-tabs__overline {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.75rem;
}
.ua-tabs__summary-current {
  overflow: hidden;
  font-size: 0.95rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ua-tabs__chevron {
  transition: transform 0.2s ease;
}
.ua-tabs__menu[open] .ua-tabs__chevron {
  transform: rotate(180deg);
}
.ua-tabs__menu-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid rgba(var(--v-border-color), 0.15);
}
.ua-tabs__menu-list > li + li {
  border-top: 1px solid rgba(var(--v-border-color), 0.1);
}
.ua-tabs__row {
  display: flex;
  gap: 12px;
  align-items: center;
  min-height: 48px;
  padding: 8px 16px;
  color: rgb(var(--v-theme-link));
  font-size: 0.95rem;
  font-weight: 500;
  text-decoration: none;
}
.ua-tabs__row-label {
  flex: 1;
  min-width: 0;
}
.ua-tabs__row--current {
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-on-surface));
  font-weight: 700;
}
@media (prefers-reduced-motion: reduce) {
  .ua-tabs__chevron {
    transition: none;
  }
}
@media (max-width: 959px) {
  .ua-tabs__list {
    display: none;
  }
  .ua-tabs__menu {
    display: block;
  }
}
</style>
