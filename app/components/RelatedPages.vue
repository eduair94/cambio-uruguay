<template>
  <nav v-if="items.length" class="related-pages" :aria-label="t('related.aria')">
    <h2 class="related-title text-subtitle-1 font-weight-bold mb-1">
      <VIcon start size="small" color="primary">mdi-compass-outline</VIcon>
      {{ t('related.title') }}
    </h2>
    <p class="related-lead text-caption text-medium-emphasis mb-4">{{ t('related.lead') }}</p>

    <!-- `density` y no `dense`: Vuetify 4 avisa por consola en CADA render que `dense` está
         deprecado, y este componente vive en el layout, o sea en todas las páginas. Medido en el
         VPS: 47.095 líneas y ~1 MB de stderr por día, casi todas esta advertencia con su stack de
         componentes, que además tapaba los errores de verdad (el 2026-09-02 había ocho, invisibles
         entre el ruido). -->
    <VRow density="comfortable">
      <VCol v-for="item in items" :key="item.to" cols="12" sm="6" md="4">
        <VCard
          :to="localePath(item.to)"
          class="related-card pa-4 h-100 d-flex flex-column"
          variant="flat"
          hover
          @click="track('related_click', { from: sourcePath, to: item.to })"
        >
          <div class="d-flex align-center ga-2 mb-2">
            <VIcon size="small" color="primary">{{ item.icon }}</VIcon>
            <span class="related-section text-caption text-medium-emphasis">
              {{ t(item.sectionKey) }}
            </span>
          </div>
          <span class="related-label text-body-2 font-weight-medium">{{ t(item.labelKey) }}</span>
        </VCard>
      </VCol>
    </VRow>
  </nav>
</template>

<script setup lang="ts">
// "Seguí leyendo": the crawlable, per-route list of what to read next.
//
// Rendered by the default layout under every content route rather than pasted
// into pages one at a time, because the pages that need it most are the ~1.255
// programmatic ones nobody would ever get around to editing by hand. The route
// policy and the ranking both live in `~/utils/relatedPages` (pure, unit
// tested); this file is only the surface.
//
// Deliberately NOT wrapped in <ClientOnly>: half the point is that the links are
// in the server-rendered HTML, where a crawler can follow them into the long
// tail. The list is a pure function of the path, so SSR and client agree and
// there is nothing to hydrate mismatch.
import { relatedEnabledForPath, relatedFor } from '~/utils/relatedPages'

const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const track = useTrack()

const sourcePath = computed(() => route.path)
const items = computed(() => (relatedEnabledForPath(route.path) ? relatedFor(route.path) : []))
</script>

<style scoped>
.related-pages {
  margin: 2.5rem 0 0.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.v-theme--light .related-pages {
  border-top-color: rgba(0, 0, 0, 0.08);
}

.related-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  text-decoration: none;
  transition: transform 0.2s ease;
}
.v-theme--light .related-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.08);
}
.related-card:hover {
  transform: translateY(-2px);
}

.related-section {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.68rem;
}
.related-label {
  line-height: 1.35;
}
</style>
