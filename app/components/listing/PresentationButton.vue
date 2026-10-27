<script setup lang="ts">
import { useDisplay } from 'vuetify'
import {
  buildPresentation,
  formatPresentationLength,
  presentationEnrichment,
  presentationPhotos,
  type PresentationSource,
} from '~/utils/listingPresentation'

// El botón y el diálogo viajan con la ficha; el reproductor (canvas, voz, grabación) recién se
// descarga cuando alguien lo abre: `Lazy…` + `v-if`.
const props = defineProps<{ source: PresentationSource }>()
const presentation = computed(() => buildPresentation(props.source))
const enrichment = computed(() => presentationEnrichment(props.source))
const cover = computed(() => presentationPhotos(presentation.value)[0] ?? null)
const open = ref(false)
// Una foto que no carga deja el botón sin miniatura, nunca con el ícono de imagen rota.
const coverFailed = ref(false)
const { smAndDown } = useDisplay()
</script>

<template>
  <div v-if="cover" class="presentation-launch">
    <!-- Se ve como un video (foto + play) porque eso es lo que abre: un botón plano no lo decía. -->
    <button
      type="button"
      class="presentation-launch__button"
      data-testid="listing-presentation-open"
      @click="open = true"
    >
      <span class="presentation-launch__thumb" aria-hidden="true">
        <img
          v-if="!coverFailed"
          :src="cover"
          alt=""
          width="96"
          height="64"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          @error="coverFailed = true"
        />
        <span class="presentation-launch__play">
          <VIcon icon="mdi-play" size="22" />
        </span>
      </span>
      <span class="presentation-launch__text">
        <strong>Ver presentación</strong>
        <span>
          {{ formatPresentationLength(presentation.duration) }} · se puede mandar por WhatsApp
        </span>
      </span>
    </button>
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
        :enrichment="enrichment"
        @close="open = false"
      />
    </VDialog>
  </div>
</template>

<style scoped>
.presentation-launch__button {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  max-width: 100%;
  padding: 6px 16px 6px 6px;
  border: 1px solid rgba(var(--v-theme-primary), 0.35);
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.06);
  color: rgb(var(--v-theme-on-surface));
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}
.presentation-launch__button:hover {
  background: rgba(var(--v-theme-primary), 0.12);
  border-color: rgba(var(--v-theme-primary), 0.6);
}
.presentation-launch__button:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
.presentation-launch__thumb {
  position: relative;
  flex: none;
  width: 96px;
  height: 64px;
  overflow: hidden;
  border-radius: 8px;
  background: #0d1a2d;
}
.presentation-launch__thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.presentation-launch__play {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #fff;
  background: rgba(8, 15, 28, 0.3);
}
.presentation-launch__play .v-icon {
  padding: 4px;
  border-radius: 50%;
  background: rgba(8, 15, 28, 0.6);
}
.presentation-launch__text {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.presentation-launch__text strong {
  color: rgb(var(--v-theme-primary));
  font-size: 0.975rem;
}
.presentation-launch__text span {
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
@media (prefers-reduced-motion: reduce) {
  .presentation-launch__button {
    transition: none;
  }
}
</style>
