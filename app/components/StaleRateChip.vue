<!--
  La advertencia de "este precio no se mueve hace días".

  Va donde el defecto se ve, no donde es cómodo ponerlo: la portada ordena por "más barato" y una
  pizarra congelada deriva al extremo de la distribución a medida que el mercado se mueve, así que
  termina encabezando el ranking. Cuanto más vieja, más destacada.

  Decisiones que parecen chicas y no lo son:
  * `variant="flat"` y no `tonal`. El tonal de Vuetify usa el mismo color para relleno y texto, y en
    tarjetas ya coloreadas queda ilegible (nos pasó antes, más de una vez).
  * No comunica sólo con color: ícono + texto. Un chip ámbar sin palabras no dice nada a quien no
    distingue el ámbar del gris.
  * El tooltip cuelga de un elemento enfocable con `aria-label`, así que el dato también llega por
    teclado y por lector de pantalla en vez de vivir sólo en el hover.
  * NO dice "precio incorrecto". No lo sabemos: una casa chica puede tener de verdad el mismo precio
    hace tres semanas. Dice lo único que medimos —hace cuánto no cambia— y sugiere confirmar.
-->
<template>
  <VChip
    v-if="entry"
    :size="dense ? 'x-small' : 'small'"
    color="warning"
    variant="flat"
    prepend-icon="mdi-snowflake"
    tabindex="0"
    :aria-label="tooltipText"
    class="stale-rate-chip"
  >
    {{ label }}
    <VTooltip activator="parent" location="top" max-width="280">
      <span class="stale-rate-tooltip">{{ tooltipText }}</span>
    </VTooltip>
  </VChip>
</template>

<script setup lang="ts">
import type { FrozenEntry } from '~/server/api/frozen-quotes.get'

interface Props {
  entry: FrozenEntry | null
  /** Para las tarjetas del hero, donde el espacio es de verdad poco. */
  dense?: boolean
}

const props = withDefaults(defineProps<Props>(), { dense: false })
const { t } = useI18n()

const label = computed(() => {
  if (!props.entry) return ''
  const days = props.entry.days
  return props.dense
    ? t('staleRate.badgeShort', { days })
    : t(props.entry.capped ? 'staleRate.badgeAtLeast' : 'staleRate.badge', { days })
})

const tooltipText = computed(() => {
  if (!props.entry) return ''
  const days = props.entry.days
  const base = t(props.entry.capped ? 'staleRate.tooltipAtLeast' : 'staleRate.tooltip', { days })
  // Que además encabece el ranking es la mitad importante del problema: es la razón por la que
  // alguien llegaría hasta la puerta de esa casa esperando ese número.
  return props.entry.extreme ? `${base} ${t('staleRate.tooltipLeading')}` : base
})
</script>

<style scoped>
.stale-rate-chip {
  /* El chip vive dentro de tarjetas que son enlaces; sin esto hereda el subrayado del ancestro. */
  text-decoration: none;
  font-weight: 600;
}
.stale-rate-chip:focus-visible {
  outline: 2px solid rgb(var(--v-theme-warning));
  outline-offset: 2px;
}
</style>
