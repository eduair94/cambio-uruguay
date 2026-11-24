<template>
  <div class="cars-layout cu-listing">
    <!-- `cu-listing`: en una página `wide` la grilla usa el ancho del marco (layouts/default.vue). -->
    <div class="cars-layout__filters">
      <slot name="filters" />
    </div>
    <div class="cars-layout__results">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
// Filtros a la izquierda, resultados a la derecha, en una grilla con lugar fijo para cada uno.
//
// Era un VRow con dos VCol (md 3/9), y Auto Ads mete su `div.google-auto-placed` ENTRE las dos
// columnas: un tercer hijo de ancho completo en una fila flex que envuelve, así que los resultados
// caían debajo de los filtros y la columna de filtros quedaba sola, angosta, con las etiquetas
// cortadas (medido el 2026-09-19 en /oportunidades-autos-usados-uruguay y
// /autos-chocados-y-con-deuda-uruguay). Con cada columna en su celda, lo que se inserte en el medio
// cae en una fila nueva, a lo ancho, y no mueve nada. Es la misma regla que `critical.css` aplica a
// todo VRow de varias columnas: la unidad queda entera y visible al final de la fila.
</script>

<style scoped>
.cars-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
}
/* En el celular toda página pone sus filtros en un cajón (`v-if="!smAndDown"` en la celda), así que
   la celda queda vacía. Vacía y todo es una fila de la grilla, y el `gap` la cobra: 24 px de aire
   muerto sobre la barra de Filtros/orden, que se sumaban al margen del bloque de arriba (medido el
   2026-11-24 en /computadoras-usadas-uruguay a 400 px: 56 px entre los botones y «Filtros», 32 sin
   esta regla). Una celda vacía no ocupa fila, sea cual sea el ancho. `:empty` aguanta los dos
   rellenos que deja Vue: los comentarios `[` `]` del SSR y los textos vacíos de la navegación. */
.cars-layout__filters:empty {
  display: none;
}
@media (min-width: 960px) {
  .cars-layout {
    /* Un cuarto del ancho, con techo: con 1fr/3fr los filtros crecían con la pantalla (550 px de
       selects en una página de 2200). En las páginas con el tope de 1280 da lo mismo que antes. */
    grid-template-columns: clamp(220px, 25%, 320px) minmax(0, 1fr);
  }
  .cars-layout__filters {
    grid-column: 1;
    grid-row: 1;
  }
  .cars-layout__results {
    grid-column: 2;
    grid-row: 1;
  }
  /* Lo insertado cae en una fila nueva; sin esto ocuparía sólo la celda angosta de los filtros. */
  .cars-layout > :deep(.google-auto-placed) {
    grid-column: 1 / -1;
  }
}
</style>
