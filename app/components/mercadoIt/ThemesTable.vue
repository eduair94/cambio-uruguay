<template>
  <div class="themes" role="table" aria-label="Temas de los últimos 12 meses: peso y tono">
    <div class="row head" role="row">
      <span role="columnheader">Tema</span>
      <span role="columnheader">Peso en la conversación</span>
      <span role="columnheader">Qué parte es negativa</span>
      <span role="columnheader" class="delta">Peso vs 2023</span>
    </div>
    <div v-for="t in rows" :key="t.th" class="row" role="row">
      <span class="name" role="cell">
        {{ THEME_LABELS[t.th] || t.th }}
        <small>{{ fmtInt(t.n12) }} opiniones</small>
      </span>
      <span class="bar" role="cell">
        <b class="ink" :style="{ width: `${((t.share12 ?? 0) / maxShare) * 78}%` }" />
        <em>{{ fmtPct(t.share12) }}</em>
      </span>
      <span class="bar" role="cell">
        <b class="neg" :style="{ width: `${(t.neg12 ?? 0) * 78}%`, background: negColor }" />
        <em>{{ fmtPct(t.neg12) }}</em>
      </span>
      <span class="delta" role="cell">{{ delta(t) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { fmtInt, fmtPct, stanceMeta, THEME_LABELS, type ThemeStat } from '~/utils/charruadevs'

const props = defineProps<{ themes: ThemeStat[] }>()

const rows = computed(() =>
  props.themes
    .filter(t => t.n12 >= 40 && t.share12 != null)
    .sort((a, b) => (b.share12 ?? 0) - (a.share12 ?? 0))
)
const maxShare = computed(() => Math.max(0.01, ...rows.value.map(t => t.share12 ?? 0)))
const negColor = stanceMeta(-1).color

function delta(t: ThemeStat): string {
  const prev = t.byYear['2023']
  if (prev == null || t.share12 == null) return '—'
  const d = Math.round((t.share12 - prev) * 100)
  return `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d)} pts`
}
</script>

<style scoped>
.themes {
  display: grid;
}
.row {
  display: grid;
  grid-template-columns: minmax(150px, 1.2fr) minmax(0, 2fr) minmax(0, 1.6fr) 84px;
  gap: 14px;
  align-items: center;
  padding: 9px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.row.head {
  font-size: 0.75rem;
  letter-spacing: 0.03em;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  padding-top: 0;
}
.name {
  font-weight: 600;
  font-size: 0.9rem;
  line-height: 1.25;
}
.name small {
  display: block;
  font-weight: 400;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.bar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 14px;
}
.bar b {
  display: block;
  height: 12px;
  border-radius: 0 4px 4px 0;
  min-width: 2px;
}
.bar b.ink {
  background: rgba(var(--v-theme-on-surface), 0.62);
}
.bar em {
  font-style: normal;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.delta {
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
@media (max-width: 700px) {
  .row {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    row-gap: 6px;
  }
  .row .name {
    grid-column: 1 / -1;
  }
  .row .delta,
  .row.head .name,
  .row.head .delta {
    display: none;
  }
}
</style>
