<template>
  <nav
    v-if="grupos.length"
    class="tema-vecinos"
    :aria-label="t('temaVecinos.aria')"
    data-testid="tema-vecinos"
  >
    <section
      v-for="grupo in grupos"
      :key="grupo.hub.slug"
      class="tema-vecinos__grupo"
      :aria-labelledby="`tema-vecinos-${grupo.hub.slug}`"
    >
      <h2
        :id="`tema-vecinos-${grupo.hub.slug}`"
        class="tema-vecinos__title text-subtitle-1 font-weight-bold"
      >
        <VIcon start size="small" color="primary" aria-hidden="true">{{ grupo.hub.icon }}</VIcon>
        {{ t('temaVecinos.titulo', { tema: grupo.hub.title }) }}
      </h2>

      <ul v-if="grupo.links.length" class="tema-vecinos__list">
        <li v-for="link in grupo.links" :key="link.to">
          <NuxtLink
            :to="localePath(link.to)"
            class="tema-vecinos__link"
            @click="trackClick(link.to)"
          >
            {{ link.labelKey ? t(link.labelKey) : link.label }}
          </NuxtLink>
        </li>
      </ul>

      <p v-if="grupo.terms.length" class="tema-vecinos__terms">
        <span class="tema-vecinos__terms-label">{{ t('temaVecinos.terminos') }}</span>
        <template v-for="(term, index) in grupo.terms" :key="term.slug">
          <NuxtLink
            :to="localePath(`/glosario/${term.slug}`)"
            class="tema-vecinos__term"
            @click="trackClick(`/glosario/${term.slug}`)"
            >{{ term.term }}</NuxtLink
          ><span v-if="index < grupo.terms.length - 1" aria-hidden="true">, </span>
        </template>
      </p>

      <NuxtLink
        :to="localePath(`/temas/${grupo.hub.slug}`)"
        class="tema-vecinos__all"
        @click="trackClick(`/temas/${grupo.hub.slug}`)"
      >
        {{ t('temaVecinos.verTema', { tema: grupo.hub.title }) }}
      </NuxtLink>
    </section>
  </nav>
</template>

<script setup lang="ts">
// "Más sobre este tema": el tema de la página, las demás páginas del tema y sus términos del
// glosario. Vive en el layout, debajo del bloque directorio↔análisis y arriba de "Seguí leyendo",
// así lo lleva toda página que pertenezca a un tema sin que nadie lo pegue a mano. La pertenencia
// sale de `utils/guideHubs.ts` y la lógica es pura, en `utils/temaVecinos.ts`.
//
// Server-rendered a propósito (sin <ClientOnly>): los enlaces tienen que estar en el HTML que lee un
// buscador. No repite lo que ya mostró el bloque de directorios.
import { directorioAnalisisParaRuta } from '~/utils/directorioAnalisis'
import { temaVecinosParaRuta } from '~/utils/temaVecinos'

const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const track = useTrack()

const grupos = computed(() =>
  temaVecinosParaRuta(
    route.path,
    directorioAnalisisParaRuta(route.path)?.links.map(link => link.to) ?? []
  )
)

function trackClick(destination: string) {
  track('related_click', {
    content_path: route.path,
    destination_path: localePath(destination),
    placement: 'topic_neighbours',
  })
}
</script>

<style scoped>
.tema-vecinos {
  margin: 2.5rem 0 0.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(var(--v-border-color), 0.2);
}
.tema-vecinos__grupo + .tema-vecinos__grupo {
  margin-top: 1.75rem;
}
.tema-vecinos__title {
  display: flex;
  align-items: center;
  margin: 0 0 0.75rem;
}
.tema-vecinos__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.tema-vecinos__link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 8px 14px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.35;
  text-decoration: none;
}
.tema-vecinos__link:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
}
.tema-vecinos__link:focus-visible,
.tema-vecinos__term:focus-visible,
.tema-vecinos__all:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 2px;
}
.tema-vecinos__terms {
  margin: 0.875rem 0 0 !important;
  font-size: 0.875rem;
  line-height: 1.9;
}
.tema-vecinos__terms-label {
  /* Label (DESIGN.md): metadata. */
  margin-right: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  opacity: 0.75;
}
.tema-vecinos__term {
  color: rgb(var(--v-theme-link));
}
.tema-vecinos__all {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-top: 6px;
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
}
</style>
