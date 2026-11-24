<template>
  <!--
    El veredicto en palabras neutras («Pide menos que sus piezas usadas»), nunca «ganga»: dice cómo
    está el precio contra una referencia medida, no si conviene comprar. Un <span> y no un VChip:
    la tarjeta lo pone adentro de líneas de texto, y un VChip dibuja un <div>.
  -->
  <span
    v-if="label"
    class="pc-verdict"
    :class="`pc-verdict--${tone ?? 'even'}`"
    :title="ratio ?? undefined"
    data-testid="pc-verdict"
  >
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computerRatioText, computerVerdictLabel, computerVerdictTone } from '~/utils/computadoras'
import type { ComputerPublicListing } from '~/utils/computadorasPublic'

const props = defineProps<{
  listing: Pick<ComputerPublicListing, 'kind' | 'kindGroup' | 'valuation' | 'comparables'>
}>()
const label = computed(() => computerVerdictLabel(props.listing))
const tone = computed(() => computerVerdictTone(props.listing.valuation?.verdict))
const ratio = computed(() => computerRatioText(props.listing))
</script>

<style scoped>
/* Radio fijo y no píldora, como las etiquetas de autos y motos: una etiqueta larga envuelve en dos
   líneas y una píldora de dos líneas se ve rota. */
.pc-verdict {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.3;
  border-radius: 8px;
  padding: 3px 10px;
  border: 1px solid currentColor;
}
.pc-verdict--below {
  color: rgb(var(--v-theme-success));
}
.pc-verdict--even {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.pc-verdict--above {
  color: rgb(var(--v-theme-warning));
}
/* En el tema claro los tokens no llegan a 4,5:1 a 12 px (medido en autos): un tono más oscuro. */
.v-theme--light .pc-verdict--below {
  color: #1b5e20;
}
.v-theme--light .pc-verdict--above {
  color: #9a5800;
}
</style>
