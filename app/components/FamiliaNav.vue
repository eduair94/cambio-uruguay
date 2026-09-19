<template>
  <div v-if="familia" class="familia-nav-wrap">
    <nav class="familia-nav" :aria-label="t('familiaNav.aria')" data-testid="familia-nav">
      <ul class="familia-nav__list">
        <li v-for="item in familia.items" :key="item.to">
          <span
            v-if="item.current"
            class="familia-nav__item familia-nav__item--current"
            aria-current="page"
          >
            {{ item.labelKey ? t(item.labelKey) : item.label }}
          </span>
          <NuxtLink
            v-else
            :to="localePath(item.to)"
            class="familia-nav__item"
            @click="trackClick(item.to)"
          >
            {{ item.labelKey ? t(item.labelKey) : item.label }}
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup lang="ts">
// La barra de la familia arriba de cada página de un directorio: el directorio, sus páginas y sus
// análisis en una fila, con la actual marcada. Existe porque el bloque del pie no alcanzaba: la
// evolución del precio del alquiler estaba enlazada desde el directorio a 11.341 px de 15.868.
// Sale del registro (utils/directorios.ts); la lógica es pura, en utils/familiaNav.ts.
//
// Server-rendered, sin <ClientOnly>: es navegación, tiene que estar en el HTML.
import { familiaNavParaRuta } from '~/utils/familiaNav'

const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const track = useTrack()

const familia = computed(() => familiaNavParaRuta(route.path))

function trackClick(destination: string) {
  track('related_click', {
    content_path: route.path,
    destination_path: localePath(destination),
    placement: 'family_nav',
  })
}
</script>

<style scoped>
/* Una franja de navegación de sección, siempre en el mismo lugar, separada del contenido por un
   borde: medido a 1280 px, el título de estas páginas arranca en x=24, 28, 48, 88, 97, 124, 148,
   172 o 356 según la página (cada una tiene su propio contenedor), así que alinear la barra "con la
   página" no existe; un contenedor centrado la dejaba desalineada en la mayoría. */
.familia-nav-wrap {
  padding: 4px 16px 10px;
  margin-bottom: 8px;
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
  min-height: 44px;
  padding: 6px 14px;
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
.familia-nav__item:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 2px;
}
.familia-nav__item--current {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-on-surface));
}
/* En un celular la fila se desplaza de costado en vez de apilarse: seis o siete hermanas en
   renglones separados empujarían el título de la página fuera de la pantalla. */
@media (max-width: 959px) {
  .familia-nav__list {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: thin;
  }
  .familia-nav__list > li {
    flex: none;
  }
}
</style>
