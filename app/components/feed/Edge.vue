<template>
  <!--
    Borde de la ventana del scroll infinito, como hijo directo de la lista (ver
    composables/useInfiniteFeed.ts). Hace tres cosas: marca dónde empiezan y terminan los avisos
    (el composable los cuenta entre los dos bordes), ocupa el alto de las páginas que salieron del
    DOM y, arriba, ofrece las páginas anteriores cuando la lista arrancó en `?page=N`.
    En modo páginas no rinde nada.
  -->
  <component
    :is="tag"
    v-if="feed.active"
    :data-feed-edge="edge"
    class="feed-edge"
    :class="[`feed-edge--${edge}`, { 'feed-edge--empty': !space && !showPrevious }]"
    :style="space ? { height: `${space}px` } : undefined"
    :aria-hidden="showPrevious ? undefined : 'true'"
  >
    <component :is="tag === 'tr' ? 'td' : 'div'" :colspan="tag === 'tr' ? colspan : undefined">
      <div v-if="showPrevious" class="feed-edge__previous">
        <VBtn
          variant="tonal"
          color="primary"
          prepend-icon="mdi-arrow-up"
          :loading="feed.previousStatus === 'loading'"
          data-testid="feed-previous"
          @click="feed.loadPrevious()"
        >
          {{ t('previous') }}
        </VBtn>
        <p v-if="feed.previousStatus === 'error'" role="alert">{{ t('previousError') }}</p>
      </div>
    </component>
  </component>
</template>

<script setup lang="ts">
import type { InfiniteFeed } from '~/composables/useInfiniteFeed'
import { infiniteFeedMessages } from '~/utils/infiniteFeedMessages'

const props = withDefaults(
  defineProps<{
    feed: InfiniteFeed
    edge: 'top' | 'bottom'
    /** `tr` cuando la lista es el `tbody` de una tabla. */
    tag?: 'div' | 'li' | 'tr'
    colspan?: number
  }>(),
  { tag: 'div', colspan: 1 }
)

const { t } = useI18n({ useScope: 'local', messages: infiniteFeedMessages })

const space = computed(() => (props.edge === 'top' ? props.feed.topSpace : props.feed.bottomSpace))
const showPrevious = computed(() => props.edge === 'top' && props.feed.canLoadPrevious)
</script>

<style scoped>
.feed-edge {
  /* Ítem de grilla a todo el ancho; en una columna flex o una lista, un bloque más. */
  grid-column: 1 / -1;
  list-style: none;
  overflow-anchor: none;
  /* En una tabla `cu-mobile-cards` cada fila es una tarjeta con borde y margen: el borde no. */
  margin: 0;
  border: 0;
  background: none;
  box-shadow: none;
}
/* Antes de todo: alquileres adelanta con `order` su primer aviso en el teléfono. */
.feed-edge--top {
  order: -10;
}
.feed-edge--empty {
  display: none;
}
.feed-edge > * {
  padding: 0;
  border: 0;
}
.feed-edge__previous {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 12px;
  padding: 4px 0;
}
.feed-edge__previous p {
  margin: 0;
}
</style>
