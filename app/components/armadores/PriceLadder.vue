<script setup lang="ts">
/**
 * Cuánto cuesta armar cada mueble: por mueble, el rango entre el prestador más barato y el más
 * caro que publican tarifa, con la mediana marcada y cuántos prestadores la sostienen. Una fila es
 * también un botón: elegirla ordena el directorio por el precio de ese mueble.
 *
 * Las barras comparten una sola escala (el máximo de toda la tabla), así que la LONGITUD se puede
 * comparar entre muebles; los números van siempre al lado (The Number Breathes Rule).
 */
import { type ArmadorItem, type ArmadorPriceReference, armadorMoney } from '~/utils/armadores'

const props = defineProps<{
  reference: ArmadorPriceReference
  mueble: ArmadorItem | null
}>()
const emit = defineEmits<{ select: [item: ArmadorItem | null] }>()

const ceiling = computed(() => Math.max(1, ...props.reference.items.map(row => row.max)))
const pct = (value: number): string => `${Math.round((value / ceiling.value) * 1000) / 10}%`
const prestadores = (n: number): string => (n === 1 ? '1 prestador' : `${n} prestadores`)
/** En el teléfono la escalera entera empuja el directorio una pantalla y media: cuatro filas y el resto a un toque. */
const COLLAPSED = 4
const opened = ref(false)
// El mueble elegido nunca queda escondido detrás de "Ver todos".
const expanded = computed(
  () =>
    opened.value || props.reference.items.findIndex(row => row.item === props.mueble) >= COLLAPSED
)
</script>

<template>
  <section class="am-ladder" aria-labelledby="am-ladder-title">
    <div class="am-ladder__head">
      <h2 id="am-ladder-title" class="am-ladder__title">Cuánto cobran por mueble</h2>
      <p class="am-ladder__intro">
        De la tarifa más baja a la más alta que publican, con la mediana marcada. Tocá un mueble
        para ordenar el directorio por su precio.
      </p>
    </div>

    <ul
      v-if="reference.items.length"
      class="am-ladder__rows"
      :class="{ 'am-ladder__rows--collapsed': !expanded }"
    >
      <li v-for="row in reference.items" :key="row.item">
        <button
          type="button"
          class="am-ladder__row"
          :class="{ 'am-ladder__row--on': mueble === row.item }"
          :aria-pressed="mueble === row.item"
          @click="emit('select', mueble === row.item ? null : row.item)"
        >
          <span class="am-ladder__label">{{ row.label }}</span>
          <span class="am-ladder__median">{{ armadorMoney(row.median) }}</span>
          <span class="am-ladder__track" aria-hidden="true">
            <span
              class="am-ladder__range"
              :style="{ left: pct(row.min), width: `calc(${pct(row.max)} - ${pct(row.min)})` }"
            />
            <span class="am-ladder__tick" :style="{ left: pct(row.median) }" />
          </span>
          <span class="am-ladder__meta">
            {{ armadorMoney(row.min) }} a {{ armadorMoney(row.max) }} · {{ prestadores(row.n) }}
          </span>
        </button>
      </li>
    </ul>
    <VBtn
      v-if="!expanded && reference.items.length > COLLAPSED"
      variant="text"
      color="primary"
      size="small"
      class="am-ladder__all cu-btn-flush"
      append-icon="mdi-chevron-down"
      @click="opened = true"
    >
      Ver los {{ reference.items.length }} muebles
    </VBtn>
    <p v-else-if="!reference.items.length" class="am-ladder__empty">
      Todavía no hay tres prestadores con tarifa publicada para el mismo mueble: los precios de cada
      uno están en su ficha, abajo.
    </p>

    <p v-if="reference.adCard" class="am-ladder__ads">
      <strong>Avisos de Marketplace y Mercado Libre:</strong> piden desde
      {{ armadorMoney(reference.adCard.min) }}, con mediana
      {{ armadorMoney(reference.adCard.median) }} ({{ reference.adCard.n }} avisos). Es el precio
      que puso el anunciante en la tarjeta: no dice de qué mueble es ni qué incluye, por eso no
      entra en la tabla.
    </p>
  </section>
</template>

<style scoped>
:where(.am-ladder) :where(p, h2, ul) {
  margin-top: 0;
}
.am-ladder {
  display: grid;
  gap: 16px;
  min-width: 0;
}
.am-ladder__head {
  display: grid;
  gap: 4px;
}
.am-ladder__title {
  margin-bottom: 0;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.4;
}
.am-ladder__intro,
.am-ladder__ads,
.am-ladder__empty {
  margin-bottom: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.875rem;
  line-height: 1.45;
}
.am-ladder__rows {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.am-ladder__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px 16px;
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 150ms ease-out,
    border-color 150ms ease-out;
}
.am-ladder__row:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.am-ladder__row:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
.am-ladder__row--on {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
}
.am-ladder__label {
  font-size: 0.95rem;
  font-weight: 600;
}
.am-ladder__median {
  font-size: 0.95rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.am-ladder__track {
  position: relative;
  grid-column: 1 / -1;
  height: 8px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.am-ladder__range {
  position: absolute;
  top: 0;
  bottom: 0;
  min-width: 4px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.45);
}
.am-ladder__tick {
  position: absolute;
  top: -4px;
  width: 4px;
  height: 16px;
  margin-left: -2px;
  border-radius: 4px;
  background: rgb(var(--v-theme-primary));
}
.am-ladder__meta {
  grid-column: 1 / -1;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}
@media (max-width: 959px) {
  .am-ladder__rows--collapsed > li:nth-child(n + 5) {
    display: none;
  }
}
@media (min-width: 960px) {
  .am-ladder__all {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .am-ladder__row {
    transition: none;
  }
}
</style>
