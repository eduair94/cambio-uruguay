<template>
  <nav
    v-if="bloque"
    class="directorio-analisis"
    :aria-labelledby="headingId"
    :data-rol="bloque.rol"
    data-testid="directorio-analisis"
  >
    <h2 :id="headingId" class="directorio-analisis__title text-subtitle-1 font-weight-bold">
      <VIcon start size="small" color="primary" aria-hidden="true">mdi-chart-box-outline</VIcon>
      {{
        t(
          bloque.rol === 'directorio'
            ? 'directorioAnalisis.tituloDirectorio'
            : 'directorioAnalisis.tituloAnalisis'
        )
      }}
    </h2>
    <p class="directorio-analisis__lead text-caption text-medium-emphasis">{{ lead }}</p>

    <ul class="directorio-analisis__list">
      <li v-for="link in bloque.links" :key="link.to">
        <NuxtLink
          :to="localePath(link.to)"
          class="directorio-analisis__link"
          :data-kind="link.kind"
          @click="trackClick(link.to)"
        >
          <VIcon size="20" color="primary" aria-hidden="true">{{ link.icon }}</VIcon>
          <span class="directorio-analisis__text">
            <!-- Sólo cuando la lista mezcla directorio y análisis: en un directorio todo es
                 análisis y el título ya lo dice. -->
            <span v-if="bloque.rol === 'analisis'" class="directorio-analisis__kind">{{
              t(
                link.kind === 'directorio'
                  ? 'directorioAnalisis.directorio'
                  : 'directorioAnalisis.analisis'
              )
            }}</span>
            <span class="directorio-analisis__label">{{ t(link.labelKey) }}</span>
          </span>
        </NuxtLink>
      </li>
    </ul>

    <NuxtLink :to="localePath(DIRECTORIOS_HUB.path)" class="directorio-analisis__all">
      {{ t('directorioAnalisis.todos') }}
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
// El vínculo entre un directorio y sus análisis, en los dos sentidos. Vive en el layout, arriba de
// "Seguí leyendo", por la misma razón que ese bloque: así lo llevan todas las páginas del registro
// sin que nadie tenga que acordarse de pegarlo, y una página de análisis nueva se vincula con una
// línea en `utils/directorios.ts`. La lógica es pura y está en `utils/directorioAnalisis.ts`.
//
// Server-rendered a propósito (sin <ClientOnly>): los enlaces tienen que estar en el HTML que lee
// un buscador, que es la mitad del motivo de vincular.
import { directorioAnalisisParaRuta } from '~/utils/directorioAnalisis'
import { DIRECTORIOS_HUB } from '~/utils/directorios'
import { familiaNavRutas } from '~/utils/familiaNav'

const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const track = useTrack()

const headingId = 'directorio-analisis-title'
// Sin lo que ya enlaza la barra "En esta sección": en una página de una familia este bloque era la
// barra entera repetida al pie, así que ahí queda vacío y no se dibuja. Sigue en los análisis que no
// son de una sola familia (CyberLunes), que no tienen barra.
const bloque = computed(() => {
  const found = directorioAnalisisParaRuta(route.path)
  if (!found) return null
  const enLaBarra = new Set(familiaNavRutas(route.path))
  const links = found.links.filter(link => !enLaBarra.has(link.to))
  return links.length ? { ...found, links } : null
})

const lead = computed(() => {
  const current = bloque.value
  if (!current) return ''
  if (current.rol === 'directorio') return t('directorioAnalisis.leadDirectorio')
  return t(
    current.directorios > 1
      ? 'directorioAnalisis.leadAnalisisVarios'
      : 'directorioAnalisis.leadAnalisis'
  )
})

function trackClick(destination: string) {
  track('related_click', {
    content_path: route.path,
    destination_path: localePath(destination),
    placement: 'directory_analysis',
  })
}
</script>

<style scoped>
.directorio-analisis {
  margin: 2.5rem 0 0.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(var(--v-border-color), 0.2);
}
.directorio-analisis__title {
  display: flex;
  align-items: center;
  margin: 0 0 0.25rem;
}
.directorio-analisis__lead {
  margin: 0 0 1rem !important;
  max-width: 68ch;
}
.directorio-analisis__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.directorio-analisis__link {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 100%;
  min-height: 56px;
  padding: 10px 14px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  color: inherit;
  text-decoration: none;
}
.directorio-analisis__link:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
}
.directorio-analisis__link:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 2px;
}
.directorio-analisis__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.directorio-analisis__kind {
  /* Label (DESIGN.md): metadata. */
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  opacity: 0.75;
}
.directorio-analisis__label {
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.35;
}
.directorio-analisis__all {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-top: 6px;
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
}
</style>
