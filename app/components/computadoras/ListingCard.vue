<template>
  <!--
    La misma ficha que autos y motos: fila con foto en el celular, tarjeta con foto 3:2 desde
    600 px, y el título como enlace que cubre la tarjeta entera. Lo que cambia es lo que se lee:
    qué tiene adentro (procesador, placa, RAM, disco) y cuánto suman sus piezas.
  -->
  <article class="pc-card" :data-computer-slug="computer.slug">
    <NuxtLink
      :to="localePath(computerAvisoPath(computer.slug))"
      class="pc-card__photo"
      :aria-label="computer.title"
      tabindex="-1"
    >
      <img
        v-if="computer.image && !failed"
        :src="computer.image"
        :alt="computer.title"
        loading="lazy"
        width="360"
        height="240"
        referrerpolicy="no-referrer"
        @error="failed = true"
      />
      <span v-else class="pc-card__nophoto"><VIcon :icon="icon" size="40" /></span>
    </NuxtLink>
    <div class="pc-card__body">
      <!-- Con oportunidad, el veredicto se calla: la línea de la oportunidad dice lo mismo con números. -->
      <div v-if="(verdict && !deal) || faults" class="pc-card__badges">
        <ComputadorasVerdictBadge v-if="verdict && !deal" :listing="computer" />
        <span v-if="faults" class="pc-badge pc-badge--flag" data-testid="pc-faults">{{
          faults
        }}</span>
      </div>
      <p class="pc-card__kind">
        {{ kindLine }}
      </p>
      <p v-if="identity" class="pc-card__identity" data-testid="pc-identity">{{ identity }}</p>
      <h3 class="pc-card__title">
        <NuxtLink :to="localePath(computerAvisoPath(computer.slug))">{{ computer.title }}</NuxtLink>
      </h3>
      <p class="pc-card__price">
        {{ price.main }}
        <span v-if="price.usd" class="pc-card__usd">({{ price.usd }})</span>
      </p>
      <p
        v-if="price.inferred"
        class="pc-card__inferred"
        title="Facebook lo marca en pesos, pero el monto sólo cierra en dólares"
      >
        {{ price.inferred }}
      </p>
      <p v-if="deal" class="pc-card__deal" data-testid="pc-opportunity">
        {{ deal.text }}
        <span class="pc-card__deal-tier">· {{ deal.tier }}</span>
      </p>
      <ul v-if="chips.length" class="pc-card__specs" aria-label="Lo que dice el aviso">
        <li v-for="chip in chips" :key="chip">{{ chip }}</li>
      </ul>
      <div v-if="valuationLines.length" class="pc-card__valuation" data-testid="pc-valuation">
        <p
          v-for="line in valuationLines"
          :key="line.text"
          :class="{ 'pc-card__valuation-note': line.note }"
        >
          {{ line.text }}
        </p>
      </div>
      <p v-if="place" class="pc-card__place">{{ place }}</p>
      <p class="pc-card__source">{{ COMPUTER_SOURCE_LABEL[computer.source] }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import {
  COMPUTER_CONDITION_LABEL,
  COMPUTER_KIND_LABEL,
  COMPUTER_SOURCE_LABEL,
  computerAvisoPath,
  computerFaultsLine,
  computerIdentityLine,
  computerOpportunityLine,
  computerPlace,
  computerPriceLine,
  computerSpecChips,
  computerUsd,
  computerValuationSummary,
  computerVerdictLabel,
} from '~/utils/computadoras'
import type { ComputerPublicKind, ComputerPublicListing } from '~/utils/computadorasPublic'

const props = defineProps<{ computer: ComputerPublicListing }>()
const localePath = useLocalePath()
const failed = ref(false)

const ICONS: Record<ComputerPublicKind, string> = {
  notebook: 'mdi-laptop',
  desktop: 'mdi-desktop-tower-monitor',
  'all-in-one': 'mdi-monitor',
  'mini-pc': 'mdi-desktop-classic',
  gpu: 'mdi-expansion-card',
  cpu: 'mdi-cpu-64-bit',
  ram: 'mdi-memory',
  storage: 'mdi-harddisk',
  motherboard: 'mdi-developer-board',
  psu: 'mdi-power-plug-outline',
  combo: 'mdi-developer-board',
}
const icon = computed(() => ICONS[props.computer.kind] ?? 'mdi-laptop')
const kindLine = computed(() =>
  [
    COMPUTER_KIND_LABEL[props.computer.kind] ?? props.computer.kind,
    props.computer.brand,
    props.computer.condition ? COMPUTER_CONDITION_LABEL[props.computer.condition] : null,
  ]
    .filter(Boolean)
    .join(' · ')
)
const price = computed(() => computerPriceLine(props.computer))
// `?? []`: durante un despliegue la API todavía puede contestar filas sin el campo nuevo.
const chips = computed(() =>
  computerSpecChips({ ...props.computer, storage: props.computer.storage ?? [] })
)
const verdict = computed(() => computerVerdictLabel(props.computer))
const faults = computed(() => computerFaultsLine(props.computer.faults ?? []))
const place = computed(() => computerPlace(props.computer))
// `?? null`: una fila escrita antes del 24/11/2026 no trae ni la línea ni la oportunidad.
const identity = computed(() => computerIdentityLine(props.computer))
const deal = computed(() => computerOpportunityLine(props.computer.opportunity ?? null))

/**
 * La valuación en la tarjeta. En una PC de escritorio, los dos totales sólo si existen enteros, y
 * si no, cuántas piezas tienen precio (`computerValuationSummary`: nunca una suma parcial). En una
 * notebook, una Mac o una pieza, la misma cosa nueva hoy, que es con lo que se la compara.
 */
const valuationLines = computed(() => {
  const valuation = props.computer.valuation
  if (!valuation) return []
  const lines: Array<{ text: string; note: boolean }> = []
  if (props.computer.kind === 'desktop') {
    const summary = computerValuationSummary(valuation)
    if (summary.newTotal) lines.push({ text: summary.newTotal, note: false })
    if (summary.usedTotal) lines.push({ text: summary.usedTotal, note: false })
    if (summary.coverage) lines.push({ text: summary.coverage, note: true })
  }
  if (valuation.sameNew && valuation.sameNew.medianUsd > 0)
    lines.push({
      text: `La misma nueva hoy: ${computerUsd(valuation.sameNew.medianUsd)}`,
      note: false,
    })
  return lines
})
</script>

<style scoped>
.pc-card {
  position: relative;
  display: grid;
  grid-template-columns: 116px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  height: 100%;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  padding: 12px;
}
.pc-card__photo {
  position: relative;
  z-index: 1;
  display: block;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.pc-card__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.pc-card__nophoto {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.pc-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.pc-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 4px;
}
.pc-badge {
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.3;
  border-radius: 8px;
  padding: 3px 10px;
  border: 1px solid currentColor;
}
.pc-badge--flag {
  color: rgb(var(--v-theme-warning));
}
.v-theme--light .pc-badge--flag {
  color: #9a5800;
}
.pc-card__kind {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-card__identity {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
}
.pc-card__deal {
  margin: 2px 0 0;
  font-size: 0.8rem;
  font-weight: 700;
  color: rgb(var(--v-theme-success));
}
.v-theme--light .pc-card__deal {
  color: #1b5e20;
}
.pc-card__deal-tier {
  font-weight: 400;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.pc-card__title {
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.35;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.pc-card__title a {
  color: inherit;
  text-decoration: none;
}
.pc-card__title a:hover {
  text-decoration: underline;
}
.pc-card__title a::after {
  content: '';
  position: absolute;
  inset: 0;
}
.pc-card__price {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.25;
  margin: 4px 0 0;
  font-variant-numeric: tabular-nums;
}
.pc-card__usd {
  font-size: 0.8rem;
  font-weight: 400;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  white-space: nowrap;
}
.pc-card__inferred {
  margin: 0;
  font-size: 0.75rem;
  font-style: italic;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.pc-card__specs {
  list-style: none;
  margin: 2px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.pc-card__specs li {
  font-size: 0.75rem;
  line-height: 1.3;
  padding: 2px 8px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-card__valuation {
  margin-top: 4px;
  padding-top: 6px;
  border-top: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity));
}
.pc-card__valuation p {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.pc-card__valuation p.pc-card__valuation-note {
  font-weight: 400;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.pc-card__place,
.pc-card__source {
  font-size: 0.8rem;
  margin: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (min-width: 600px) {
  .pc-card {
    display: flex;
    flex-direction: column;
    /* Sin esto la foto diferida mide 0 px hasta cargar y la grilla salta (medido en autos). */
    align-items: stretch;
    padding: 0;
    gap: 0;
  }
  .pc-card__photo {
    aspect-ratio: 3 / 2;
    border-radius: 0;
  }
  .pc-card__body {
    padding: 12px;
    flex: 1 1 auto;
  }
  .pc-card__title {
    font-size: 1rem;
    line-height: 1.3;
  }
  .pc-card__price {
    margin: 0;
  }
  .pc-card__place,
  .pc-card__source {
    font-size: 0.875rem;
    white-space: normal;
  }
  /* La fuente al pie: el aire de la tarjeta más corta queda arriba de una línea que siempre está. */
  .pc-card__source {
    margin-top: auto;
    padding-top: 4px;
  }
}
</style>
