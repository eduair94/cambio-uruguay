<script setup lang="ts">
import { useDisplay } from 'vuetify'
import {
  buildPresentation,
  formatPresentationLength,
  presentationPhotos,
  type PresentationSource,
} from '~/utils/listingPresentation'

// El botón y el diálogo viajan con la ficha; el reproductor (canvas, voz, grabación) recién se
// descarga cuando alguien lo abre: `Lazy…` + `v-if`.
const props = defineProps<{ source: PresentationSource }>()
const presentation = computed(() => buildPresentation(props.source))
const hasPhotos = computed(() => presentationPhotos(presentation.value).length > 0)
const open = ref(false)
const { smAndDown } = useDisplay()
</script>

<template>
  <div v-if="hasPhotos" class="presentation-launch">
    <VBtn
      color="primary"
      variant="tonal"
      prepend-icon="mdi-play-circle-outline"
      data-testid="listing-presentation-open"
      @click="open = true"
    >
      Ver presentación
      <span class="presentation-launch__length">
        · {{ formatPresentationLength(presentation.duration) }}
      </span>
    </VBtn>
    <VDialog
      v-model="open"
      :fullscreen="smAndDown"
      max-width="1100"
      scrollable
      aria-label="Presentación en video del aviso"
    >
      <LazyListingPresentationPlayer
        v-if="open"
        :presentation="presentation"
        @close="open = false"
      />
    </VDialog>
  </div>
</template>

<style scoped>
.presentation-launch__length {
  margin-left: 4px;
  font-weight: 400;
  opacity: 0.8;
  text-transform: none;
}
</style>
