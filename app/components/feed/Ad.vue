<template>
  <!--
    La unidad de un directorio: una fila entera de la grilla, después del aviso número
    `FEED_AD_AFTER` (utils/ads.ts). Va como hijo directo de la lista, igual que las tarjetas, y la
    página la pone dentro del `v-for` con `v-if="index === FEED_AD_AFTER"`.

    Sólo en modo páginas. Con "cargar más al bajar" el composable cuenta los avisos que hay entre
    los dos `FeedEdge` (composables/useInfiniteFeed.ts) y una celda que no es aviso le rompería la
    cuenta; además, la página que sale de la ventana desmonta la unidad y al volver pediría otro
    anuncio sin que nadie haya cambiado de página.
  -->
  <AdSlot v-if="!feed.active" placement="in-article" class="feed-ad" data-testid="feed-ad" />
</template>

<script setup lang="ts">
import type { InfiniteFeed } from '~/composables/useInfiniteFeed'

defineProps<{ feed: InfiniteFeed }>()
</script>

<style scoped>
/* Una fila entera y no una celda: en el escritorio una tarjeta mide ~225px y el formato
   in-article pide al menos 250 (medido en /autos-usados-uruguay a 1366px, 2026-10-31). Sin el
   margen de 32px de `.cu-ad`: el espacio lo pone el `gap` de la grilla. */
.cu-ad.feed-ad {
  grid-column: 1 / -1;
  min-width: 0;
  margin: 0;
}
</style>

<style>
/* La fila entera después del cuarto aviso dejaría huecos en la fila de arriba a 3 o 5 columnas:
   `dense` los llena con los avisos que siguen, así que la unidad cae siempre entre dos filas
   completas. Sólo en la grilla que la contiene, y sólo mientras la contiene. */
:has(> .cu-ad.feed-ad) {
  grid-auto-flow: row dense;
}
</style>
