<template>
  <div v-if="familia" class="familia-nav-wrap">
    <nav class="familia-nav" :aria-label="t('familiaNav.aria')" data-testid="familia-nav">
      <!-- Pantalla ancha: todas las hermanas a la vista, en una fila de chips. -->
      <ul class="familia-nav__list">
        <li v-for="item in familia.items" :key="item.to">
          <span
            v-if="item.current"
            class="familia-nav__item familia-nav__item--current"
            aria-current="page"
          >
            <VIcon size="18" aria-hidden="true">{{ item.icon }}</VIcon>
            {{ etiqueta(item) }}
          </span>
          <NuxtLink
            v-else
            :to="localePath(item.to)"
            class="familia-nav__item"
            @click="trackClick(item.to, 'family_nav')"
          >
            <VIcon size="18" aria-hidden="true">{{ item.icon }}</VIcon>
            {{ etiqueta(item) }}
          </NuxtLink>
        </li>
      </ul>

      <!-- Celular: la página actual y un menú que se despliega hacia abajo. -->
      <details ref="menu" class="familia-nav__menu" @keydown.esc="cerrar(true)">
        <summary class="familia-nav__summary">
          <VIcon class="familia-nav__summary-icon" size="22" aria-hidden="true">
            {{ actual.icon }}
          </VIcon>
          <span class="familia-nav__summary-text">
            <span class="familia-nav__overline">
              {{ t('familiaNav.resumen', { n: familia.items.length }) }}
            </span>
            <span class="familia-nav__summary-current">{{ etiqueta(actual) }}</span>
          </span>
          <VIcon class="familia-nav__chevron" size="24" aria-hidden="true">
            mdi-chevron-down
          </VIcon>
        </summary>
        <ul class="familia-nav__menu-list">
          <li v-for="item in familia.items" :key="item.to">
            <span
              v-if="item.current"
              class="familia-nav__row familia-nav__row--current"
              aria-current="page"
              @click="cerrar(false)"
            >
              <VIcon size="20" aria-hidden="true">{{ item.icon }}</VIcon>
              <span class="familia-nav__row-label">{{ etiqueta(item) }}</span>
              <VIcon size="20" aria-hidden="true">mdi-check</VIcon>
            </span>
            <NuxtLink
              v-else
              :to="localePath(item.to)"
              class="familia-nav__row"
              @click="trackClick(item.to, 'family_nav_menu')"
            >
              <VIcon size="20" aria-hidden="true">{{ item.icon }}</VIcon>
              <span class="familia-nav__row-label">{{ etiqueta(item) }}</span>
            </NuxtLink>
          </li>
        </ul>
      </details>
    </nav>
  </div>
</template>

<script setup lang="ts">
// La barra de la familia arriba de cada página de un directorio: el directorio, sus páginas y sus
// análisis, con la actual marcada. Existe porque el bloque del pie no alcanzaba: la evolución del
// precio del alquiler estaba enlazada desde el directorio a 11.341 px de 15.868.
// Sale del registro (utils/directorios.ts); la lógica es pura, en utils/familiaNav.ts.
//
// Dos formas del mismo menú, una por ancho (la otra queda con display:none, fuera del árbol de
// accesibilidad). En un celular era una fila de chips con scroll lateral: se veían una hermana y
// media, y nada decía que había cuatro más a la derecha. Ahora es el patrón de navegación local de
// siempre: un botón con la página actual que despliega la lista entera, en vertical y con filas de
// 48 px. Es un <details> nativo: abre antes de que la página hidrate y sin JavaScript, y los enlaces
// están en el HTML aunque esté cerrado.
//
// Server-rendered, sin <ClientOnly>: es navegación, tiene que estar en el HTML.
import { familiaNavParaRuta, type FamiliaNavItem } from '~/utils/familiaNav'

const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const track = useTrack()
const menu = ref<HTMLDetailsElement | null>(null)

const familia = computed(() => familiaNavParaRuta(route.path))
const actual = computed(
  () => familia.value!.items.find(item => item.current) ?? familia.value!.items[0]!
)

function etiqueta(item: FamiliaNavItem) {
  return item.labelKey ? t(item.labelKey) : item.label
}

// El layout no se desmonta al navegar: sin esto el menú seguiría abierto en la página nueva.
function cerrar(devolverFoco: boolean) {
  if (!menu.value?.open) return
  menu.value.open = false
  if (devolverFoco) menu.value.querySelector('summary')?.focus()
}
watch(
  () => route.path,
  () => cerrar(false)
)

function trackClick(destination: string, placement: string) {
  track('related_click', {
    content_path: route.path,
    destination_path: localePath(destination),
    placement,
  })
}
</script>

<style scoped>
/* Una franja de navegación de sección, siempre en el mismo lugar, separada del contenido por un
   borde: medido a 1280 px, el título de estas páginas arranca en x=24, 28, 48, 88, 97, 124, 148,
   172 o 356 según la página (cada una tiene su propio contenedor), así que alinear la barra "con la
   página" no existe; un contenedor centrado la dejaba desalineada en la mayoría. */
.familia-nav-wrap {
  padding: 4px 16px 12px;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.15);
}
.familia-nav__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.familia-nav__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 6px 14px 6px 12px;
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
.familia-nav__item:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
}
.familia-nav__item:focus-visible,
.familia-nav__summary:focus-visible,
.familia-nav__row:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 2px;
}
.familia-nav__item--current {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-on-surface));
}

/* El menú del celular. */
.familia-nav__menu {
  display: none;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
}
.familia-nav__summary {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 8px 12px 8px 14px;
  cursor: pointer;
  list-style: none;
  user-select: none;
}
.familia-nav__summary::-webkit-details-marker {
  display: none;
}
.familia-nav__summary-icon {
  color: rgb(var(--v-theme-primary));
}
.familia-nav__summary-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
.familia-nav__overline {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.75rem;
  line-height: 1.3;
}
.familia-nav__summary-current {
  overflow: hidden;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.familia-nav__chevron {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  transition: transform 0.2s ease;
}
.familia-nav__menu[open] .familia-nav__chevron {
  transform: rotate(180deg);
}
.familia-nav__menu-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid rgba(var(--v-border-color), 0.15);
}
.familia-nav__menu-list > li + li {
  border-top: 1px solid rgba(var(--v-border-color), 0.1);
}
.familia-nav__row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 10px 14px;
  color: rgb(var(--v-theme-link));
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1.35;
  text-decoration: none;
}
.familia-nav__row-label {
  flex: 1;
  min-width: 0;
}
.familia-nav__row--current {
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-on-surface));
  font-weight: 600;
}
.familia-nav__row--current .v-icon {
  color: rgb(var(--v-theme-primary));
}
@media (prefers-reduced-motion: reduce) {
  .familia-nav__chevron {
    transition: none;
  }
}

/* Debajo de 960 px, el menú reemplaza a la fila: seis o siete chips no entran en una línea, y ni
   apilados (empujan el título fuera de la pantalla) ni desplazables de costado (esconden la mitad
   sin avisar) sirven. */
@media (max-width: 959px) {
  .familia-nav-wrap {
    padding-bottom: 0;
    border-bottom: 0;
  }
  .familia-nav__list {
    display: none;
  }
  .familia-nav__menu {
    display: block;
  }
}
</style>

<style>
/* El aire entre la barra y la página lo pone la barra (su margin-bottom), no la página. Cada página
   arranca con su propio <VContainer> y su padding-top era de 4, 8, 12, 16, 20 o 24 px, más 4 o 16 de
   las migas si abren la página: medido el 2026-09-21 en las 28 páginas con barra, el contenido
   quedaba de 11 a 61 px debajo del menú en el celular y de 31 a 76 debajo del borde en escritorio.
   Con esto, 13–17 y 25–30 (el resto es el interlineado de la primera línea). Sin scope porque el
   contenedor es de la página, y con !important porque py-6/pa-2/pt-1 de Vuetify lo llevan. */
.familia-nav-wrap + .v-container,
.familia-nav-wrap + * > .v-container:first-child {
  padding-top: 0 !important;
}
.familia-nav-wrap + .v-container > .v-breadcrumbs:first-child,
.familia-nav-wrap + * > .v-container:first-child > .v-breadcrumbs:first-child {
  padding-top: 0 !important;
}
</style>
