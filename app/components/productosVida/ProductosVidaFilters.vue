<!--
  Los filtros de /productos-que-te-cambian-la-vida-uruguay: presupuesto y tipo, como ENLACES
  (`?hasta=…&tipo=…#lista`) y no como botones, igual que UsefulAppsCategoryNav: este sitio pierde
  los toques previos a la hidratación, y un enlace tocado antes navega a la vista ya filtrada por el
  servidor. Ya hidratado, el clic se resuelve en el cliente y la página reescribe la URL con
  history.replaceState. Ctrl/⌘/Mayús/Alt-clic y el botón del medio siguen abriendo otra pestaña:
  por eso el guardia de `onSelect` y nunca el modificador `.prevent` en el clic.

  Los href salen de `basePath`, que la página arma con localePath: en /en/, /pt/ y los idiomas de
  traducción automática, un clic modificado o un toque antes de hidratar no cambia de idioma.

  El tipo cambia de forma por CSS (el HTML del servidor es uno solo): ≥ 960 px pastillas que
  envuelven; debajo, un <details> nativo con filas de 48 px.
-->
<template>
  <div class="vida-filters">
    <div class="vida-filters__group" role="group" aria-labelledby="vida-budget-label">
      <p id="vida-budget-label" class="vida-filters__label">¿Cuánto querés gastar?</p>
      <ul class="vida-filters__pills vida-filters__pills--budget">
        <li v-for="option in budgets" :key="option.id">
          <a
            v-if="hasPrices"
            :href="option.href"
            class="vida-pill"
            :class="{ 'vida-pill--current': option.current }"
            :aria-current="option.current ? 'true' : undefined"
            @click="onSelect($event, { hasta: option.value })"
          >
            <span v-if="option.value !== null" class="d-sr-only">Hasta </span>{{ option.label }}
          </a>
          <span v-else class="vida-pill vida-pill--disabled" aria-disabled="true">
            {{ option.label }}
          </span>
        </li>
      </ul>
    </div>

    <div class="vida-filters__group" role="group" aria-labelledby="vida-type-label">
      <p id="vida-type-label" class="vida-filters__label vida-filters__label--type">
        Tipo de producto
      </p>
      <ul class="vida-filters__pills vida-filters__pills--types">
        <li v-for="option in types" :key="option.id">
          <span
            v-if="option.count === 0 && !option.current"
            class="vida-pill vida-pill--disabled"
            aria-disabled="true"
          >
            <VIcon size="18" aria-hidden="true">{{ option.icon }}</VIcon>
            <span>{{ option.label }}</span>
            <span class="vida-pill__count">{{ option.count }}</span>
          </span>
          <a
            v-else
            :href="option.href"
            class="vida-pill"
            :class="{ 'vida-pill--current': option.current }"
            :aria-current="option.current ? 'true' : undefined"
            @click="onSelect($event, { tipo: option.value })"
          >
            <VIcon size="18" aria-hidden="true">{{ option.icon }}</VIcon>
            <span>{{ option.label }}</span>
            <span class="vida-pill__count">{{ option.count }}</span>
          </a>
        </li>
      </ul>

      <details ref="menu" class="vida-menu" @keydown.esc="close(true)">
        <summary class="vida-menu__summary">
          <VIcon class="vida-menu__icon" size="22" aria-hidden="true">{{ currentType.icon }}</VIcon>
          <span class="vida-menu__current"
            >Tipo: {{ currentType.label }} · {{ currentType.count }}</span
          >
          <VIcon class="vida-menu__chevron" size="24" aria-hidden="true">mdi-chevron-down</VIcon>
        </summary>
        <ul class="vida-menu__list">
          <li v-for="option in types" :key="option.id">
            <span
              v-if="option.count === 0 && !option.current"
              class="vida-menu__row vida-menu__row--disabled"
              aria-disabled="true"
            >
              <VIcon size="20" aria-hidden="true">{{ option.icon }}</VIcon>
              <span class="vida-menu__row-label">{{ option.label }}</span>
              <span class="vida-pill__count">{{ option.count }}</span>
            </span>
            <a
              v-else
              :href="option.href"
              class="vida-menu__row"
              :class="{ 'vida-menu__row--current': option.current }"
              :aria-current="option.current ? 'true' : undefined"
              @click="onSelect($event, { tipo: option.value })"
            >
              <VIcon size="20" aria-hidden="true">{{ option.icon }}</VIcon>
              <span class="vida-menu__row-label">{{ option.label }}</span>
              <span class="vida-pill__count">{{ option.count }}</span>
            </a>
          </li>
        </ul>
      </details>
    </div>

    <div class="vida-filters__result">
      <p class="vida-count" aria-live="polite">{{ resultLine }}</p>
      <a
        v-if="active"
        :href="clearHref"
        class="vida-clear"
        @click="onSelect($event, { hasta: null, tipo: null })"
      >
        <VIcon size="18" aria-hidden="true">mdi-filter-remove-outline</VIcon>
        <span>Limpiar filtros</span>
      </a>
    </div>
    <p v-if="!hasPrices" class="vida-filters__note">
      Los filtros de presupuesto vuelven cuando haya precios.
    </p>
  </div>
</template>

<script setup lang="ts">
import {
  PRODUCTOS_VIDA_BUDGETS,
  productosVidaFilterHref,
  productosVidaMoney,
  type ProductosVidaState,
} from '~/utils/productosVida'
import { PRODUCTOS_VIDA_GROUPS, type ProductosVidaGroupId } from '~/utils/productosVidaCatalog'

const props = defineProps<{
  /** `localePath(PRODUCTOS_VIDA_BASE_PATH)`. */
  basePath: string
  /** El estado que se está mostrando (sin precios, `hasta` ya viene en null). */
  state: ProductosVidaState
  counts: Record<ProductosVidaGroupId | 'todos', number>
  hasPrices: boolean
  resultLine: string
  active: boolean
}>()
const emit = defineEmits<{ select: [patch: Partial<ProductosVidaState>] }>()

const menu = ref<HTMLDetailsElement | null>(null)

const budgets = computed(() =>
  [null, ...PRODUCTOS_VIDA_BUDGETS].map(value => ({
    id: value === null ? 'todos' : String(value),
    value,
    label: value === null ? 'Todos' : productosVidaMoney(value),
    current: props.state.hasta === value,
    href: productosVidaFilterHref(props.basePath, props.state, { hasta: value }),
  }))
)

const types = computed(() => [
  {
    id: 'todos',
    value: null as ProductosVidaGroupId | null,
    label: 'Todos',
    icon: 'mdi-format-list-bulleted',
    count: props.counts.todos,
    current: props.state.tipo === null,
    href: productosVidaFilterHref(props.basePath, props.state, { tipo: null }),
  },
  ...PRODUCTOS_VIDA_GROUPS.map(group => ({
    id: group.id,
    value: group.id as ProductosVidaGroupId | null,
    label: group.label,
    icon: group.icon,
    count: props.counts[group.id],
    current: props.state.tipo === group.id,
    href: productosVidaFilterHref(props.basePath, props.state, { tipo: group.id }),
  })),
])
const currentType = computed(() => types.value.find(option => option.current) ?? types.value[0]!)
const clearHref = computed(() =>
  productosVidaFilterHref(props.basePath, props.state, { hasta: null, tipo: null })
)

function close(returnFocus: boolean) {
  if (!menu.value?.open) return
  menu.value.open = false
  if (returnFocus) menu.value.querySelector('summary')?.focus()
}

function onSelect(event: MouseEvent, patch: Partial<ProductosVidaState>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  emit('select', patch)
  // Cerrar el <details> con el foco adentro lo tiraba a <body>: vuelve al resumen.
  close(true)
}
</script>

<style scoped>
:where(.vida-filters) :where(p, ul) {
  margin: 0;
}
.vida-filters__group + .vida-filters__group {
  margin-top: 16px;
}
.vida-filters__label {
  margin-bottom: 8px;
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.45;
}
.vida-filters__pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0;
  list-style: none;
}
.vida-pill {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  min-height: 44px;
  padding: 8px 16px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 999px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  line-height: 1.3;
  text-decoration: none;
  white-space: nowrap;
}
.vida-filters__pills--types .vida-pill {
  padding-left: 12px;
}
/* Los cuatro montos entran en una fila a 390 px (con 16 px de lado pasaban a dos). */
.vida-filters__pills--budget .vida-pill {
  padding-inline: 12px;
}
.vida-pill:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
}
.vida-pill--current {
  border-color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}
.vida-pill--disabled,
.vida-pill--disabled:hover {
  border-color: rgba(var(--v-border-color), 0.15);
  background: transparent;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  cursor: default;
}
.vida-pill__count {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}
.vida-pill:focus-visible,
.vida-menu__summary:focus-visible,
.vida-menu__row:focus-visible,
.vida-clear:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 2px;
}
.vida-menu {
  display: none;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
}
.vida-menu__summary {
  display: flex;
  gap: 12px;
  align-items: center;
  min-height: 48px;
  padding: 4px 12px 4px 16px;
  cursor: pointer;
  list-style: none;
  user-select: none;
}
.vida-menu__summary::-webkit-details-marker {
  display: none;
}
.vida-menu__icon {
  color: rgb(var(--v-theme-primary));
}
.vida-menu__current {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 0.95rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vida-menu__chevron {
  transition: transform 200ms ease;
}
.vida-menu[open] .vida-menu__chevron {
  transform: rotate(180deg);
}
.vida-menu__list {
  padding: 0;
  list-style: none;
  border-top: 1px solid rgba(var(--v-border-color), 0.15);
}
.vida-menu__list > li + li {
  border-top: 1px solid rgba(var(--v-border-color), 0.1);
}
.vida-menu__row {
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
.vida-menu__row-label {
  flex: 1;
  min-width: 0;
}
.vida-menu__row--current {
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-on-surface));
  font-weight: 700;
}
.vida-menu__row--disabled {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.vida-filters__result {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  align-items: center;
  margin-top: 8px;
}
.vida-count {
  flex: 1 1 260px;
  min-width: 0;
  font-size: 0.875rem;
  line-height: 1.45;
}
.vida-clear {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  min-height: 44px;
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
  font-weight: 600;
  text-underline-offset: 2px;
}
.vida-filters__note {
  margin-top: 4px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.8rem;
  line-height: 1.35;
}
@media (prefers-reduced-motion: reduce) {
  .vida-menu__chevron {
    transition: none;
  }
}
/* En el celular el resumen del <details> ya dice «Tipo: …»: el rótulo queda sólo para lectores de
   pantalla (sigue nombrando al grupo) y la primera pantalla gana un renglón. */
@media (max-width: 959px) {
  .vida-filters__pills--types {
    display: none;
  }
  .vida-filters__label--type {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
  .vida-menu {
    display: block;
  }
}
/* Escritorio: rótulo | opciones, para que los dos grupos se alineen. */
@media (min-width: 960px) {
  .vida-filters__group {
    display: grid;
    grid-template-columns: 168px minmax(0, 1fr);
    gap: 0 16px;
    align-items: start;
  }
  .vida-filters__label {
    margin-bottom: 0;
    padding-top: 12px;
  }
}
</style>
