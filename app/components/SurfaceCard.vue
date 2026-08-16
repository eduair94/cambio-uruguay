<script setup lang="ts">
/**
 * SurfaceCard — the tonal authored card this site keeps re-declaring by hand.
 *
 * POR QUÉ EXISTE: casi todas las páginas de contenido escriben, en su propio bloque `<style
 * scoped>`, la misma tarjeta: fondo tonal, borde de 1px sensible al tema, radio de 12px, padding
 * de 20/24px. Copiada a mano, cada página vuelve a tropezar con las MISMAS dos fallas mecánicas:
 *
 *   1. Los márgenes del navegador. Vuetify 4 no resetea `<p>`, `<h3>` ni `<ul>`, así que dentro de
 *      una caja con padding su `margin-block: 1em` no colapsa y manda el ritmo vertical. La regla
 *      global de `critical.css` sólo cubre el `:first-child`; el segundo párrafo sigue trayendo
 *      16px que nadie pidió. Acá el reset es completo y cada gap se declara.
 *   2. La nota de cierre que crece. `.v-alert` trae `flex: 1 1 auto`: dentro de una tarjeta en
 *      columna se estira hasta la altura de la tarjeta más alta de la fila, o se achica por debajo
 *      de su propio texto. El slot `footer` la fija (`flex: 0 0 auto`) y la empuja abajo.
 *
 * `stretch` arma la columna (`h-100` + flex) para las grillas de tarjetas parejas, y `accent`
 * marca la tarjeta que lleva la tesis. El borde de acento va en TODO el contorno, nunca como
 * pestaña lateral (DESIGN.md, "The No Side Tab Rule").
 */
withDefaults(
  defineProps<{
    /** Borde en color primario: la tarjeta que lleva la idea principal. */
    accent?: boolean
    /** Altura completa + columna, para grillas de tarjetas parejas. */
    stretch?: boolean
    /** 16px compacto, 24px estándar, 32px superficie destacada (DESIGN.md, Cards). */
    padding?: 'compact' | 'standard' | 'feature'
  }>(),
  { accent: false, stretch: false, padding: 'standard' }
)
</script>

<template>
  <VCard
    variant="flat"
    class="surface-card"
    :class="[
      `surface-card--${padding}`,
      { 'surface-card--accent': accent, 'h-100 d-flex flex-column': stretch },
    ]"
  >
    <slot />
    <div v-if="$slots.footer" class="surface-card__footer">
      <slot name="footer" />
    </div>
  </VCard>
</template>

<style scoped>
.surface-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
  /* Cualquier item de grilla que pueda contener un título largo o una URL. */
  min-width: 0;
}
.v-theme--light .surface-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.surface-card--accent {
  border-color: rgba(var(--v-theme-primary), 0.45);
}

.surface-card--compact {
  padding: 16px;
}
.surface-card--standard {
  padding: 20px;
}
.surface-card--feature {
  padding: 20px;
}
@media (min-width: 960px) {
  .surface-card--standard {
    padding: 24px;
  }
  .surface-card--feature {
    padding: 32px;
  }
}

/* El ritmo lo declaramos nosotros, no la hoja del navegador. */
.surface-card :deep(:is(p, h2, h3, h4, h5, ul, ol, dl)) {
  margin-top: 0;
}
.surface-card :deep(p) {
  margin-bottom: 12px;
}
.surface-card :deep(p:last-child) {
  margin-bottom: 0;
}

/* La nota de cierre: pegada abajo, y nunca estirada ni comprimida. */
.surface-card__footer {
  margin-top: auto;
  padding-top: 16px;
  flex: 0 0 auto;
}
.surface-card__footer :deep(.v-alert) {
  flex: 0 0 auto;
}
</style>
