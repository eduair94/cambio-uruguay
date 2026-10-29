<template>
  <div class="verdicts" :style="{ '--verdict-cols': columns.length }">
    <article
      v-for="(column, index) in columns"
      :key="column.slug"
      class="verdict"
      :aria-labelledby="`verdict-${column.slug}`"
    >
      <header class="verdict__head">
        <h3 :id="`verdict-${column.slug}`" class="verdict__name">
          <CarsCompareKeyMark :index="index" :size="14" />
          <span>
            <span class="verdict__brand">{{ column.brand }}</span>
            {{ column.model }}
          </span>
        </h3>
        <VSelect
          v-if="column.variants.length > 1"
          :model-value="carCompareVariantToken(column.variant.fuel, column.variant.transmission)"
          :items="variantItems(column)"
          label="Combustible y caja"
          density="compact"
          variant="outlined"
          hide-details
          class="verdict__variant-select"
          @update:model-value="value => emit('variant', index, String(value))"
        />
        <p v-else class="verdict__variant">{{ carCompareVariantLabel(column.variant) }}</p>

        <div class="verdict__stat">
          <template v-if="points[index]?.row">
            <span class="verdict__figure">{{ figure(index) }}</span>
            <span class="verdict__figure-note">{{ figureNote(index) }}</span>
          </template>
          <template v-else>
            <span class="verdict__figure verdict__figure--muted">{{ missingFigure(index) }}</span>
            <span class="verdict__figure-note">{{ missingNote(index) }}</span>
          </template>
        </div>
      </header>

      <div class="verdict__body">
        <template v-if="columns.length > 1">
          <h4 class="verdict__label">Por qué elegirlo</h4>
          <ul v-if="verdicts[index]?.wins.length" class="verdict__list">
            <li v-for="reason in verdicts[index]!.wins" :key="reason.key" class="verdict__item">
              <VIcon icon="mdi-check" size="18" class="verdict__icon verdict__icon--win" />
              <span>
                <strong>{{ reason.title }}.</strong>
                {{ reason.detail }}
              </span>
            </li>
          </ul>
          <p v-else class="verdict__empty">
            Contra {{ others(index) }} no gana con diferencia clara en nada de lo que medimos.
          </p>

          <template v-if="verdicts[index]?.losses.length">
            <h4 class="verdict__label verdict__label--minor">Lo que resignás</h4>
            <ul class="verdict__list">
              <li v-for="reason in verdicts[index]!.losses" :key="reason.key" class="verdict__item">
                <VIcon icon="mdi-minus" size="18" class="verdict__icon" />
                <span>
                  <strong>{{ reason.title }}.</strong>
                  {{ reason.detail }}
                </span>
              </li>
            </ul>
          </template>
        </template>
        <p v-else class="verdict__empty">Sumá otro modelo arriba para ver en qué gana cada uno.</p>
      </div>

      <footer class="verdict__foot">
        <VBtn
          color="primary"
          variant="flat"
          block
          :to="localePath({ path: CARS_PATH, query: listingsQuery(index) })"
        >
          Ver los avisos
        </VBtn>
        <NuxtLink :to="localePath(carMarketPath(column.slug))" class="verdict__more">
          Precios de {{ column.brand }} {{ column.model }} por año y versión
        </NuxtLink>
      </footer>
    </article>
  </div>
</template>

<script setup lang="ts">
// El veredicto del comparador, uno por modelo: lo que gana con diferencia clara frente a los otros
// y lo que resigna, cada renglón con su número. Lo arma `compareCars`; acá sólo se dibuja.
import {
  carCompareListingsQuery,
  carCompareVariantLabel,
  carCompareVariantToken,
  type CarCompareColumn,
  type CarCompareMode,
  type CarComparePoint,
  type CarCompareVerdict,
} from '~/utils/carCompare'
import { CARS_PATH, carMarketPath, formatCarUsd } from '~/utils/cars'

const props = defineProps<{
  columns: CarCompareColumn[]
  names: string[]
  points: CarComparePoint[]
  verdicts: CarCompareVerdict[]
  mode: CarCompareMode
  year: number | null
  budget: number | null
}>()
const emit = defineEmits<{ variant: [index: number, token: string] }>()
const localePath = useLocalePath()

const variantItems = (column: CarCompareColumn) =>
  column.variants.map(variant => ({
    title: `${carCompareVariantLabel(variant)} · ${variant.adverts} avisos`,
    value: carCompareVariantToken(variant.fuel, variant.transmission),
  }))

function figure(index: number): string {
  const row = props.points[index]!.row!
  return props.mode === 'plata' ? String(row.year) : formatCarUsd(row.median)
}
function figureNote(index: number): string {
  const point = props.points[index]!
  const row = point.row!
  if (props.mode === 'plata') {
    const stretch = point.stretch ? ` · negociando, un ${point.stretch.year}` : ''
    return `el año al que llegás: se pide ${formatCarUsd(row.median)}${stretch}`
  }
  return `por un ${row.year}, mediana de ${row.n} avisos`
}
function missingFigure(index: number): string {
  return props.points[index]!.status === 'no-alcanza' ? 'No alcanza' : 'Sin avisos'
}
function missingNote(index: number): string {
  const point = props.points[index]!
  if (point.status === 'no-alcanza' && point.cheapest)
    return `el más barato arranca en ${formatCarUsd(point.cheapest.median)} (${point.cheapest.year})`
  return props.year !== null ? `no hay suficientes de ${props.year}` : ''
}
const others = (index: number): string => {
  const names = props.names.filter((_, other) => other !== index)
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names.at(-1)}` : (names[0] ?? '')
}
const listingsQuery = (index: number) =>
  carCompareListingsQuery(
    props.columns[index]!,
    props.points[index]!,
    props.mode === 'plata' ? props.budget : null
  )
</script>

<style scoped>
.verdicts {
  display: grid;
  grid-template-columns: repeat(var(--verdict-cols), minmax(0, 1fr));
  gap: 16px;
}
.verdict {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.verdict__head {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 16px 0;
}
.verdict__name {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.3;
}
.verdict__brand {
  font-weight: 400;
}
.verdict__variant {
  margin: 0;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.verdict__variant-select {
  max-width: 320px;
}
.verdict__stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.verdict__figure {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.verdict__figure--muted {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.verdict__figure-note {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.verdict__body {
  flex: 1;
  padding: 16px;
}
.verdict__label {
  margin: 0 0 8px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.verdict__label--minor {
  margin-top: 24px;
}
.verdict__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.verdict__item {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 8px;
  font-size: 0.875rem;
  line-height: 1.45;
}
.verdict__icon {
  margin-top: 1px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.verdict__icon--win {
  color: rgb(var(--v-theme-success));
}
.verdict__empty {
  margin: 0;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.verdict__foot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 0 16px 16px;
}
.verdict__more {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-link));
  text-align: center;
}

@media (max-width: 959.98px) {
  .verdicts {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
