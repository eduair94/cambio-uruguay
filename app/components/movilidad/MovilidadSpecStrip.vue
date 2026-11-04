<!--
  La franja de ficha técnica de un monopatín o una bicicleta: autonomía, velocidad, potencia y peso
  con su ícono (en una bici, el rodado primero), y en una segunda línea lo que importa después (carga
  soportada, tiempo de carga, ruedas o cambios, plegable). Es lo que DECLARA el vendedor: cuando sólo
  salió del título, la franja lo dice.
-->
<template>
  <div v-if="chips.length || extras.length" class="spec-strip">
    <ul v-if="chips.length" class="spec-strip__main" aria-label="Ficha técnica declarada">
      <li v-for="chip in chips" :key="chip.label" :title="chip.title">
        <VIcon :icon="chip.icon" size="15" aria-hidden="true" />
        <span>{{ chip.label }}</span>
      </li>
    </ul>
    <p v-if="extras.length" class="spec-strip__extra">{{ extras.join(' · ') }}</p>
    <p v-if="uyuPerKm && !compact" class="spec-strip__extra">
      {{ equiparMoneyNbsp(uyuPerKm) }} por km de autonomía
    </p>
    <p v-if="!specs.fromFicha" class="spec-strip__source">Según el título del aviso</p>
  </div>
</template>

<script setup lang="ts">
import { equiparMoneyNbsp } from '~/utils/equiparProductos'
import {
  BICICLETA_CATEGORIA,
  monopatinSpecExtras,
  type MonopatinSpecsPublic,
} from '~/utils/monopatinFicha'

const props = withDefaults(
  defineProps<{
    specs: MonopatinSpecsPublic
    uyuPerKm?: number | null
    /** En una fila de tabla: sin la segunda línea de "por km". */
    compact?: boolean
    /** `bicicleta-electrica` pone el rodado primero y nombra a la bici; cualquier otra, monopatín. */
    categoria?: string | null
  }>(),
  { uyuPerKm: null, compact: false, categoria: null }
)

const bici = computed(() => props.categoria === BICICLETA_CATEGORIA)

const n = (value: number) => value.toLocaleString('es-UY', { maximumFractionDigits: 1 })

const chips = computed(() => {
  const s = props.specs
  const out: Array<{ icon: string; label: string; title: string }> = []
  if (bici.value && s.wheelInches !== null)
    out.push({ icon: 'mdi-bicycle', label: `R${n(s.wheelInches)}`, title: 'Rodado' })
  if (s.rangeKm !== null)
    out.push({
      icon: 'mdi-map-marker-distance',
      label: `${n(s.rangeKm)} km`,
      title: 'Autonomía declarada',
    })
  if (s.maxSpeedKmh !== null)
    out.push({
      icon: 'mdi-speedometer',
      label: `${n(s.maxSpeedKmh)} km/h`,
      title: 'Velocidad máxima',
    })
  if (s.motorW !== null)
    out.push({ icon: 'mdi-flash', label: `${n(s.motorW)} W`, title: 'Potencia del motor' })
  else if (s.motorPeakW !== null)
    out.push({ icon: 'mdi-flash', label: `${n(s.motorPeakW)} W máx.`, title: 'Potencia máxima' })
  if (s.weightKg !== null)
    out.push({
      icon: 'mdi-weight-kilogram',
      label: `${n(s.weightKg)} kg`,
      title: bici.value ? 'Peso de la bici' : 'Peso del monopatín',
    })
  return out
})

const extras = computed(() =>
  props.compact ? [] : monopatinSpecExtras(props.specs, props.categoria)
)
</script>

<style scoped>
.spec-strip {
  margin-top: 6px;
}
.spec-strip__main {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.8rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.spec-strip__main li {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
.spec-strip__main :deep(.v-icon) {
  opacity: 0.7;
}
.spec-strip__extra,
.spec-strip__source {
  margin: 4px 0 0;
  font-size: 0.75rem;
  line-height: 1.4;
  opacity: 0.8;
}
.spec-strip__source {
  font-style: italic;
}
</style>
