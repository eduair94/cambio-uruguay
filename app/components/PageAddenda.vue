<template>
  <section v-if="addendum" class="page-addenda mt-10">
    <h2 class="text-h5 font-weight-bold mb-2">Lo que nos preguntaron</h2>
    <p class="text-body-2 text-medium-emphasis mb-5">
      Dudas que aparecieron sobre este tema y que la página no cubría. Verificadas contra su fuente
      el {{ fmtDate(addendum.updatedAt) }}.
    </p>

    <VExpansionPanels variant="accordion">
      <VExpansionPanel v-for="item in addendum.items" :key="item.question">
        <VExpansionPanelTitle class="font-weight-medium">{{ item.question }}</VExpansionPanelTitle>
        <VExpansionPanelText>
          <p class="text-body-2 addenda-prose mb-3">{{ item.answer }}</p>
          <div v-if="item.sources.length" class="d-flex flex-wrap ga-2">
            <VChip
              v-for="s in item.sources"
              :key="s.url"
              :href="s.url"
              target="_blank"
              rel="noopener nofollow"
              size="x-small"
              variant="tonal"
            >
              <VIcon start size="x-small">mdi-open-in-new</VIcon>
              {{ s.title }}
            </VChip>
          </div>
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>
  </section>
</template>

<script setup lang="ts">
/**
 * Ampliaciones que el bot de Reddit escribió para ESTA ruta.
 *
 * Vive en el layout y no en cada página a propósito: así una página escrita a mano se amplía sin
 * que nadie la edite, y un job automático nunca tiene que parchear markup. Si la ruta no tiene
 * ampliación, no renderiza nada.
 *
 * El bloque va con schema FAQPage propio, que es la mitad del valor: son preguntas que la gente
 * hizo textualmente, así que coinciden con búsquedas reales mucho mejor que un encabezado escrito
 * desde el escritorio.
 */
import { addendumFor } from '~/utils/generated/addenda'

const route = useRoute()

// La ruta llega con prefijo de idioma en /en y /pt; las ampliaciones son de las páginas en español.
const addendum = computed(() => addendumFor(route.path.replace(/^\/(en|pt)(?=\/|$)/, '') || '/'))

const fmtDate = (iso: string): string => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })
}

useHead(() => {
  const current = addendum.value
  if (!current?.items.length) return {}
  return {
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: current.items.map(i => ({
            '@type': 'Question',
            name: i.question,
            acceptedAnswer: { '@type': 'Answer', text: i.answer },
          })),
        }),
      },
    ],
  }
})
</script>

<style scoped>
.page-addenda {
  max-width: 900px;
}
.addenda-prose {
  line-height: 1.7;
}
</style>
