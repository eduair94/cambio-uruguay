<script setup lang="ts">
/**
 * El mapa-selector del directorio de armadores: los 62 barrios INE de Montevideo pintados por
 * cuántos armadores tienen la base ahí o lo nombran como zona de trabajo. Tocar un barrio lo
 * elige (y con él su zona); las pastillas de abajo son la vía de teclado y el área metropolitana,
 * que no está en el mapa.
 *
 * Es una capa de datos, así que usa la rampa de mapas compartida (utils/rentalAnalysisMap.ts, la
 * regla "The Map Ramp Is Data" de DESIGN.md) y siempre lleva su leyenda con los tramos en números:
 * el color nunca dice la cifra solo. Los trazos son aria-hidden: lo accesible son las pastillas y
 * el selector de barrio de los filtros.
 */
import {
  ARMADOR_MAP_BARRIOS,
  ARMADOR_MAP_VIEWBOX,
  type ArmadorMapBarrio,
} from '~/utils/armadoresMapData'
import {
  ARMADOR_MAP_BIN_LABELS,
  ARMADOR_ZONES,
  type ArmadorZone,
  armadorMapBin,
  armadorZoneOf,
} from '~/utils/armadores'
import { RENTAL_ANALYSIS_MAP_PALETTE } from '~/utils/rentalAnalysisMap'

const props = defineProps<{
  counts: Record<string, number>
  zoneCounts: Record<ArmadorZone, number>
  citywide: number
  zona: ArmadorZone | null
  barrio: string | null
}>()
const emit = defineEmits<{ select: [value: { zona: ArmadorZone | null; barrio: string | null }] }>()

/** La tinta del polígono elegido (DESIGN.md, Map Ink): sólo trazo, nunca relleno ni texto. */
const MAP_INK = '#102c4c'

const zoneOf = (b: ArmadorMapBarrio): ArmadorZone | null => armadorZoneOf(b.name)
const countOf = (b: ArmadorMapBarrio): number => props.counts[b.name] ?? 0
const fillOf = (b: ArmadorMapBarrio): string =>
  RENTAL_ANALYSIS_MAP_PALETTE[armadorMapBin(countOf(b))]!
const firstName = (label: string): string => label.split(', ')[0] ?? label
const isSelected = (b: ArmadorMapBarrio): boolean =>
  !!props.barrio && b.name.split(', ').includes(props.barrio)
const selected = computed(() => ARMADOR_MAP_BARRIOS.find(isSelected) ?? null)

const hovered = ref<ArmadorMapBarrio | null>(null)
const readout = computed(() => {
  const b = hovered.value ?? selected.value
  if (!b) return null
  const n = countOf(b)
  return `${b.name}: ${n === 1 ? '1 armador' : `${n} armadores`} con base o que lo nombran`
})

function pick(b: ArmadorMapBarrio) {
  const name = firstName(b.name)
  if (props.barrio === name) emit('select', { zona: zoneOf(b), barrio: null })
  else emit('select', { zona: zoneOf(b), barrio: name })
}

const zoneModel = computed({
  get: () => props.zona ?? 'todas',
  set: (value: string | null) => {
    const zona = !value || value === 'todas' ? null : (value as ArmadorZone)
    emit('select', { zona, barrio: null })
  },
})
</script>

<template>
  <section class="am-map" aria-labelledby="am-map-title">
    <div class="am-map__head">
      <h2 id="am-map-title" class="am-map__title">¿En qué zona estás?</h2>
      <p class="am-map__readout" aria-live="polite">
        {{ readout ?? 'Tocá tu barrio en el mapa o elegí una zona.' }}
      </p>
    </div>

    <div class="am-map__canvas">
      <svg
        :viewBox="ARMADOR_MAP_VIEWBOX"
        class="am-map__svg"
        role="img"
        aria-label="Mapa de los barrios de Montevideo pintado por cantidad de armadores con base o que nombran cada barrio"
        @pointerleave="hovered = null"
      >
        <g>
          <path
            v-for="b in ARMADOR_MAP_BARRIOS"
            :key="b.code"
            :d="b.d"
            :fill="fillOf(b)"
            class="am-map__barrio"
            :class="{
              'am-map__barrio--dim': !!zona && zona !== 'metropolitana' && zoneOf(b) !== zona,
              'am-map__barrio--zone': !!zona && zoneOf(b) === zona,
            }"
            aria-hidden="true"
            @click="pick(b)"
            @pointerenter="hovered = b"
          />
        </g>
        <path
          v-if="selected"
          :d="selected.d"
          fill="none"
          :stroke="MAP_INK"
          stroke-width="3"
          stroke-linejoin="round"
          pointer-events="none"
          aria-hidden="true"
        />
      </svg>
    </div>

    <div class="am-map__legend">
      <ol class="am-legend" aria-label="Armadores con base en el barrio o que lo nombran">
        <li v-for="(label, index) in ARMADOR_MAP_BIN_LABELS" :key="label" class="am-legend__step">
          <span
            class="am-legend__swatch"
            :style="{ background: RENTAL_ANALYSIS_MAP_PALETTE[index] }"
          />
          {{ label }}
        </li>
      </ol>
      <p class="am-legend__note">
        Armadores con base en el barrio o que lo nombran en su aviso.
        <template v-if="citywide"> Además, {{ citywide }} dicen cubrir todo Montevideo. </template>
      </p>
    </div>

    <VChipGroup
      v-model="zoneModel"
      class="am-zones"
      column
      mandatory
      selected-class="am-zones__chip--on"
      aria-label="Zona"
    >
      <VChip value="todas" variant="tonal" class="am-zones__chip">Toda la ciudad</VChip>
      <VChip
        v-for="zone in ARMADOR_ZONES"
        :key="zone.id"
        :value="zone.id"
        variant="tonal"
        class="am-zones__chip"
        :title="zone.hint"
      >
        {{ zone.label }}
        <span class="am-zones__count">{{ zoneCounts[zone.id] }}</span>
      </VChip>
    </VChipGroup>
  </section>
</template>

<style scoped>
:where(.am-map) :where(p, h2, ol) {
  margin-top: 0;
}
.am-map {
  display: grid;
  gap: 16px;
  min-width: 0;
}
.am-map__head {
  display: grid;
  gap: 4px;
}
.am-map__title {
  margin-bottom: 0;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.4;
}
.am-map__readout {
  min-height: 1.45em;
  margin-bottom: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.875rem;
  line-height: 1.45;
  font-variant-numeric: tabular-nums;
}
/* El lienzo es el "fondo de teselas" del mapa, no una superficie del tema: queda claro en los dos
   temas porque la rampa y la tinta del polígono elegido están calibradas contra un fondo claro
   (DESIGN.md, The Map Ramp Is Data Rule). Sobre el fondo oscuro, la tinta desaparecía. */
.am-map__canvas {
  min-width: 0;
  padding: 8px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: #ffffff;
}
.am-map__svg {
  display: block;
  width: 100%;
  height: auto;
}
.am-map__barrio {
  stroke: #ffffff;
  stroke-width: 1;
  stroke-linejoin: round;
  cursor: pointer;
  transition: opacity 150ms ease-out;
}
.am-map__barrio:hover {
  opacity: 0.82;
}
.am-map__barrio--dim {
  opacity: 0.35;
}
.am-map__barrio--zone {
  stroke: #102c4c;
  stroke-width: 1.25;
}
.am-map__legend {
  display: grid;
  gap: 8px;
}
.am-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}
.am-legend__step {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}
.am-legend__swatch {
  width: 16px;
  height: 12px;
  border-radius: 4px;
  outline: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.am-legend__note {
  margin-bottom: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.8rem;
  line-height: 1.45;
}
.am-zones :deep(.v-slide-group__content) {
  gap: 8px;
}
.am-zones__chip {
  font-weight: 600;
}
.am-zones__chip--on {
  background: rgb(var(--v-theme-primary)) !important;
  color: rgb(var(--v-theme-on-primary)) !important;
}
.am-zones__count {
  margin-left: 8px;
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
}
@media (prefers-reduced-motion: reduce) {
  .am-map__barrio {
    transition: none;
  }
}
</style>
