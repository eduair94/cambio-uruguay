<!--
THESIS: Fourteen rental pages existed and nothing said in what order a person meets them. This is
the route through them, with the money it takes at each step measured rather than described.
FORM: A money strip fed by two live APIs, then five stages you can walk. Server-rendered so the
figures are in the HTML; the stage you open is session state and nothing is persisted.
-->
<template>
  <section class="journey" aria-labelledby="journey-title">
    <h2 id="journey-title" class="journey-title">Mudarte, de punta a punta</h2>
    <p class="journey-lead">
      Cinco momentos, en el orden en que llegan. Los números de arriba son de hoy y salen del propio
      relevamiento del sitio.
    </p>

    <!-- ── Los números, medidos ─────────────────────────────────────────── -->
    <div class="money-strip">
      <div v-for="figure in figures" :key="figure.key" class="money-cell">
        <span class="money-label">{{ figure.label }}</span>
        <span v-if="figure.valueUyu !== null" class="money-value">{{
          money(figure.valueUyu)
        }}</span>
        <span v-else class="money-value money-value--missing">sin dato</span>
        <span class="money-note">{{ figure.note }}</span>
      </div>

      <div class="money-cell money-cell--total">
        <span class="money-label">Primer desembolso</span>
        <span v-if="firstOutlay !== null" class="money-value">{{ money(firstOutlay) }}</span>
        <span v-else class="money-value money-value--missing">sin dato</span>
        <span class="money-note">
          <template v-if="firstOutlay !== null">primer mes + gastos + equipar</template>
          <template v-else>falta una de las tres partes; no se suma a medias</template>
        </span>
      </div>
    </div>

    <!-- ── Las cinco etapas ─────────────────────────────────────────────── -->
    <div class="stage-tabs" role="tablist" aria-label="Etapas de la mudanza">
      <button
        v-for="(stage, index) in stages"
        :id="`journey-tab-${stage.key}`"
        :key="stage.key"
        type="button"
        role="tab"
        class="stage-tab"
        :class="{ 'stage-tab--active': stage.key === active }"
        :aria-selected="stage.key === active"
        :aria-controls="`journey-panel-${stage.key}`"
        :tabindex="stage.key === active ? 0 : -1"
        @click="active = stage.key"
        @keydown.left.prevent="move(-1)"
        @keydown.right.prevent="move(1)"
        @keydown.home.prevent="active = stages[0]!.key"
        @keydown.end.prevent="active = stages[stages.length - 1]!.key"
      >
        <span class="stage-num" aria-hidden="true">{{ index + 1 }}</span>
        <span class="stage-tab__text">
          <VIcon :icon="stage.icon" size="18" aria-hidden="true" />
          {{ stage.label }}
        </span>
      </button>
    </div>

    <div
      v-for="stage in stages"
      v-show="stage.key === active"
      :id="`journey-panel-${stage.key}`"
      :key="stage.key"
      class="stage-panel"
      role="tabpanel"
      :aria-labelledby="`journey-tab-${stage.key}`"
      tabindex="0"
    >
      <h3 class="stage-question">{{ stage.question }}</h3>
      <p class="stage-blurb">{{ stage.blurb }}</p>

      <ul class="link-grid">
        <li v-for="link in stage.links" :key="link.to">
          <component
            :is="link.to.startsWith('#') ? 'a' : resolveNuxtLink"
            v-bind="link.to.startsWith('#') ? { href: link.to } : { to: localePath(link.to) }"
            class="link-card"
            :class="{ 'link-card--lead': link.lead }"
          >
            <VIcon :icon="link.icon" size="22" aria-hidden="true" class="link-icon" />
            <span class="link-text">
              <span class="link-label">{{ link.label }}</span>
              <span class="link-hint">{{ link.hint }}</span>
            </span>
          </component>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { resolveComponent } from 'vue'
import {
  JOURNEY_STAGES,
  journeyFigures,
  journeyFirstOutlay,
  type JourneyStageKey,
} from '~/utils/rentalJourney'

const localePath = useLocalePath()
const resolveNuxtLink = resolveComponent('NuxtLink')

const stages = JOURNEY_STAGES
const active = ref<JourneyStageKey>(stages[0]!.key)

function move(delta: number): void {
  const index = stages.findIndex(stage => stage.key === active.value)
  const next = (index + delta + stages.length) % stages.length
  active.value = stages[next]!.key
  // Roving tabindex: the pattern is only usable if focus follows the selection.
  nextTick(() => document.getElementById(`journey-tab-${active.value}`)?.focus())
}

interface RentalAnalysis {
  summary?: {
    rent?: { median?: number; count?: number }
    expenses?: { median?: number; count?: number }
  }
}
interface EquiparPeek {
  meta?: { baskets?: Array<{ key: string; totalUyu: number; complete: boolean }> } | null
}

// Server-rendered on purpose: the strip is the first thing on the page that proves it is alive, and
// a client-only fetch would show four dashes to a search engine and to anyone on a slow phone.
// Either endpoint failing degrades to "sin dato" for its own figure, never an error for the page.
const { data: analysis } = await useFetch<RentalAnalysis>('/api/rentals/analysis', {
  key: 'journey-rent',
  default: () => ({}),
})
const { data: equipar } = await useFetch<EquiparPeek>('/api/equipar', {
  key: 'journey-equipar',
  default: () => ({}),
})

const minimalBasket = computed(() =>
  (equipar.value?.meta?.baskets ?? []).find(basket => basket.key === 'minima')
)

const figures = computed(() =>
  journeyFigures({
    rentMedian: analysis.value?.summary?.rent?.median ?? null,
    rentCount: analysis.value?.summary?.rent?.count ?? 0,
    expensesMedian: analysis.value?.summary?.expenses?.median ?? null,
    expensesCount: analysis.value?.summary?.expenses?.count ?? 0,
    basketMinUyu: minimalBasket.value?.totalUyu ?? null,
    basketComplete: minimalBasket.value?.complete ?? false,
  })
)
const firstOutlay = computed(() => journeyFirstOutlay(figures.value))

const money = (value: number): string => `$${Math.round(value).toLocaleString('es-UY')}`
</script>

<style scoped>
.journey {
  margin: 0 0 40px;
  padding: 24px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 16px;
  background: rgba(var(--v-theme-on-surface), 0.03);
}
.journey-title {
  margin: 0;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
  line-height: 1.2;
}
.journey-lead {
  margin: 8px 0 0;
  max-width: 62ch;
  font-size: 0.95rem;
  opacity: 0.85;
}

/* Money strip */
.money-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 20px;
}
.money-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), 0.2);
}
.money-cell--total {
  border-color: rgba(var(--v-theme-primary), 0.45);
  background: rgba(var(--v-theme-primary), 0.06);
}
.money-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.7;
}
.money-value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.money-value--missing {
  font-size: 1.075rem;
  opacity: 0.66;
}
.money-note {
  font-size: 0.75rem;
  opacity: 0.7;
}

/* Stage tabs */
.stage-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 24px;
}
.stage-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: 999px;
  background: rgb(var(--v-theme-surface));
  color: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}
.stage-tab:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
}
.stage-tab--active {
  border-color: transparent;
  background: #1565c0;
  color: #ffffff;
}
.v-theme--dark .stage-tab--active {
  background: #64b5f6;
  color: #000000;
}
.stage-tab__text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.stage-num {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.12);
  font-size: 0.75rem;
  font-weight: 700;
}
.stage-tab--active .stage-num {
  background: rgba(255, 255, 255, 0.28);
}

/* Panel */
.stage-panel {
  margin-top: 20px;
}
.stage-panel:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 4px;
}
.stage-question {
  margin: 0;
  font-size: 1.075rem;
  font-weight: 700;
}
.stage-blurb {
  margin: 6px 0 0;
  max-width: 68ch;
  font-size: 0.875rem;
  opacity: 0.85;
}
.link-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 10px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}
.link-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  height: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  color: inherit;
  text-decoration: none;
}
.link-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.55);
  background: rgba(var(--v-theme-primary), 0.05);
}
.link-card--lead {
  border-color: rgba(var(--v-theme-primary), 0.5);
  background: rgba(var(--v-theme-primary), 0.06);
}
.link-icon {
  flex: 0 0 auto;
  margin-top: 2px;
  opacity: 0.75;
}
.link-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.link-label {
  font-size: 0.875rem;
  font-weight: 600;
}
.link-hint {
  font-size: 0.75rem;
  opacity: 0.75;
  text-wrap: pretty;
}

@media (max-width: 599.98px) {
  .journey {
    padding: 16px;
  }
}
</style>
