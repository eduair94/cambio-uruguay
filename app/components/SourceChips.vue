<template>
  <div v-if="sources.length" class="source-chips">
    <a
      v-for="(source, i) in sources"
      :key="i"
      :href="source.url"
      target="_blank"
      rel="noopener noreferrer"
      class="source-chip"
      :class="`source-chip--${source.kind}`"
    >
      <VIcon size="12" class="mr-1">{{ KIND_ICON[source.kind] }}</VIcon>
      {{ source.label }}
    </a>
  </div>
</template>

<script setup lang="ts">
import type { DeliverySource, SourceKind } from '~/utils/parcelDelivery'

// Chips de fuente con el ORIGEN a la vista. La distinción no es decorativa: una página que mezcla
// "lo dice el decreto" con "lo cuenta alguien en Reddit" le hace creer al lector que tiene un
// derecho que no tiene. El color y el icono separan los tres casos sin que haya que leer la letra.
defineProps<{ sources: readonly DeliverySource[] }>()

const KIND_ICON: Record<SourceKind, string> = {
  norma: 'mdi-scale-balance',
  operador: 'mdi-store-outline',
  practica: 'mdi-account-voice',
}
</script>

<style scoped>
.source-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.source-chip {
  font-size: 0.72rem;
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 999px;
  text-decoration: none;
  line-height: 1.4;
  border: 1px solid transparent;
}

.source-chip:hover {
  text-decoration: underline;
}

/* Norma: el respaldo más fuerte. */
.source-chip--norma {
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  border-color: rgba(var(--v-theme-primary), 0.25);
}

/* Operador: lo publica el Correo o el courier sobre su propio servicio. Puede cambiarlo mañana. */
.source-chip--operador {
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.82);
  border-color: rgba(var(--v-border-color), 0.24);
}

/* Práctica: alguien lo vivió. No es regla y se ve distinto a propósito. */
.source-chip--practica {
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.7);
  border-color: rgba(var(--v-border-color), 0.35);
  border-style: dashed;
}
</style>
