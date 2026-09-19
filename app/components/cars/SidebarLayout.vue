<template>
  <div class="cars-layout">
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
@media (min-width: 960px) {
  .cars-layout {
    grid-template-columns: minmax(0, 1fr) minmax(0, 3fr);
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
