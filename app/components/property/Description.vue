<!--
  La descripción que el anunciante escribió en el portal, en las fichas de alquiler y de venta.

  Los portales separan cada renglón con una línea en blanco. Con `white-space: pre-line` y el
  interlineado de la ficha, cada renglón ocupaba ~53px y una descripción típica medía 3.500px
  (medido el 2026-10-04): una pared de aire. Acá cada bloque separado por una línea en blanco es un
  párrafo con el espaciado normal, los saltos simples se respetan, y una descripción larga se
  muestra recortada con "Leer todo". El texto completo está siempre en el HTML: recortar es CSS.
-->
<template>
  <div class="property-description">
    <div
      :id="bodyId"
      class="property-description__body"
      :class="{ 'is-collapsed': collapsible && !open }"
    >
      <p v-for="(paragraph, index) in paragraphs" :key="index">{{ paragraph }}</p>
    </div>
    <button
      v-if="collapsible"
      type="button"
      class="property-description__toggle"
      :aria-expanded="open"
      :aria-controls="bodyId"
      @click="open = !open"
    >
      {{ t(open ? 'less' : 'more') }}
      <VIcon :icon="open ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="18" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ text: string }>()

const { t } = useI18n({
  useScope: 'local',
  messages: {
    es: { more: 'Leer todo', less: 'Mostrar menos' },
    en: { more: 'Read all', less: 'Show less' },
    pt: { more: 'Ler tudo', less: 'Mostrar menos' },
  },
})

/** Más que esto se recorta: unas 14 líneas de lectura en la columna de la ficha. */
const COLLAPSE_CHARS = 900
const COLLAPSE_PARAGRAPHS = 10

const paragraphs = computed(() =>
  props.text
    .replace(/\r\n?/g, '\n')
    .split(/\n[\t ]*\n+/)
    .map(paragraph => paragraph.replace(/[\t ]+\n/g, '\n').trim())
    .filter(Boolean)
)
const collapsible = computed(
  () => props.text.length > COLLAPSE_CHARS || paragraphs.value.length > COLLAPSE_PARAGRAPHS
)
const open = ref(false)
const bodyId = useId()
</script>

<style scoped>
.property-description__body {
  max-width: 72ch;
  overflow-wrap: anywhere;
}
.property-description__body p {
  margin: 0 0 0.6em;
  white-space: pre-line;
  line-height: 1.6;
}
.property-description__body p:last-child {
  margin-bottom: 0;
}
/* Recorte con fundido por máscara: no depende del color de fondo, así sirve en los dos temas. */
.property-description__body.is-collapsed {
  max-height: 22.5em;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to bottom, #000 72%, transparent);
  mask-image: linear-gradient(to bottom, #000 72%, transparent);
}
.property-description__toggle {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-height: 44px;
  padding: 0;
  margin-top: 4px;
  border: 0;
  background: none;
  font: inherit;
  font-weight: 600;
  color: rgb(var(--v-theme-link));
  cursor: pointer;
}
.property-description__toggle:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
  border-radius: 4px;
}
</style>
