<script setup lang="ts">
/**
 * PressMentions — quién nos citó afuera, con la cita textual y nuestra respuesta.
 *
 * POR QUÉ EXISTE: cuando alguien con audiencia usa un ranking nuestro como prueba en
 * una discusión pública, esa discusión es contexto para el lector que llega después.
 * Esconderla desperdicia la evidencia; publicarla como sticker de "nos recomendaron"
 * la convierte en autopromoción.
 *
 * El formato resuelve las dos cosas: cita sin editar + link al original + de qué venía
 * el hilo + qué hicimos nosotros con eso (incluido lo que NO pudimos verificar). Es la
 * Evidence Card de DESIGN.md aplicada a una cita: dato, fecha, procedencia y fuente
 * directa, a un gesto de distancia.
 *
 * Una mención nunca toca un puntaje: los puntajes salen de la rúbrica, no de quién
 * nos aplaude.
 */
import { mentionsFor, platformLabel } from '~/utils/pressMentions'

const props = withDefaults(
  defineProps<{
    /** Ruta del sitio (sin locale) cuyas menciones mostrar. */
    page: string
    /** Título del bloque. */
    title?: string
  }>(),
  { title: 'Nos citaron' }
)

const mentions = computed(() => mentionsFor(props.page))

const PLATFORM_ICONS: Record<string, string> = {
  x: 'mdi-twitter',
  prensa: 'mdi-newspaper-variant-outline',
  reddit: 'mdi-reddit',
  youtube: 'mdi-youtube',
}

/** 2026-08-17 → 17 de agosto de 2026. */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'setiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ]
  return `${d} de ${months[m - 1]} de ${y}`
}
</script>

<template>
  <section
    v-if="mentions.length"
    class="press-mentions mb-6"
    aria-labelledby="press-mentions-title"
  >
    <h2 id="press-mentions-title" class="text-h6 font-weight-bold mb-1">{{ title }}</h2>
    <p class="text-body-2 text-medium-emphasis mb-3">
      Discusiones públicas donde esta página se usó como dato. Van con la cita textual, el link al
      original y nuestra respuesta al lado. Ninguna mención mueve un puntaje del ranking.
    </p>

    <SurfaceCard v-for="m in mentions" :key="m.id" class="mb-3">
      <div class="d-flex align-center flex-wrap ga-2 mb-3">
        <VChip size="small" variant="tonal" color="primary">
          <VIcon start size="14">{{ PLATFORM_ICONS[m.platform] ?? 'mdi-link-variant' }}</VIcon>
          {{ platformLabel(m.platform) }}
        </VChip>
        <span class="font-weight-bold text-body-2">{{ m.author }}</span>
        <span v-if="m.handle" class="text-caption text-medium-emphasis">@{{ m.handle }}</span>
        <VChip size="x-small" variant="outlined">{{ m.authorNote }}</VChip>
        <span class="text-caption text-medium-emphasis ml-auto">
          <time :datetime="m.date">{{ formatDate(m.date) }}</time>
        </span>
      </div>

      <blockquote class="mention-quote">
        <p class="text-body-1 mb-0">“{{ m.quote }}”</p>
      </blockquote>

      <p class="text-body-2 mention-context">
        <strong>De qué venía:</strong>
        {{ m.context }}
      </p>

      <div v-if="m.metrics?.length" class="d-flex flex-wrap ga-2 mention-metrics">
        <VChip v-for="(x, i) in m.metrics" :key="i" size="x-small" variant="tonal">
          {{ x.label }}: {{ x.value }}
        </VChip>
      </div>

      <p class="text-body-2 mention-take">
        <VIcon size="14" color="primary" class="mr-1">mdi-comment-check-outline</VIcon>
        <strong>Nuestra respuesta:</strong>
        {{ m.ourTake }}
      </p>

      <div class="d-flex flex-wrap ga-2 mention-actions">
        <VBtn
          :href="m.url"
          target="_blank"
          rel="noopener noreferrer nofollow"
          variant="tonal"
          size="small"
        >
          <VIcon start size="small">mdi-open-in-new</VIcon>
          Ver el posteo original
        </VBtn>
        <VBtn
          v-if="m.threadUrl"
          :href="m.threadUrl"
          target="_blank"
          rel="noopener noreferrer nofollow"
          variant="text"
          size="small"
        >
          Leer el hilo completo
        </VBtn>
      </div>
    </SurfaceCard>
  </section>
</template>

<style scoped>
/* Contorno completo, nunca pestaña lateral (DESIGN.md, "The No Side Tab Rule"). */
.mention-quote {
  border: 1px solid rgba(var(--v-theme-primary), 0.3);
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.06);
  padding: 12px 14px;
  margin: 0 0 12px;
  font-style: italic;
}
.mention-context,
.mention-take {
  margin-bottom: 12px;
}
.mention-metrics {
  margin-bottom: 12px;
}
.mention-actions {
  margin-top: 4px;
}
</style>
