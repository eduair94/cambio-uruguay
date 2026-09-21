<!--
  Where a listing's official area stands among the other areas with data, one quiet row per figure.
  A fuller bar is always better (fewer reports, cuts or complaints; more mapped shops), so the rows
  read the same way; the exact value and its source ride along for hover and screen readers.
  Deliberately no combined score: each row keeps its own source, period and meaning.

  Inside a results card the seven rows doubled the card's height and pushed the price out of view,
  so the block is a native disclosure: closed it costs two lines and still names the best and the
  worst figure, which is what a reader comparing cards actually uses. Native <details> keeps it
  keyboard-operable and printable without a modal, which would interrupt a scan that needs no
  protected focus. The open/closed choice is shared by every card on the page and remembered: a
  reader who opens one card wants the same rows on the next one, not seven more clicks.
-->
<template>
  <section
    v-if="zone && rows.length"
    class="zone-bars"
    :aria-label="t('region', { name: zone.name })"
    data-testid="rental-zone-bars"
  >
    <details class="zone-bars__disclosure" :open="open" @toggle="onToggle">
      <summary class="zone-bars__summary" data-testid="rental-zone-bars-toggle">
        <span class="zone-bars__summary-text">
          <span class="zone-bars__heading">
            {{ sameName ? t('heading') : t('headingNamed', { name: zone.name }) }}
          </span>
          <span v-if="digest" class="zone-bars__digest">{{ digest }}</span>
        </span>
        <VIcon class="zone-bars__chevron" size="18" aria-hidden="true">mdi-chevron-down</VIcon>
      </summary>
      <ul class="zone-bars__rows">
        <li
          v-for="row in rows"
          :key="row.attribute"
          class="zone-bars__row"
          :class="{ 'is-measuring': row.measuring }"
          :title="row.detail"
        >
          <span class="zone-bars__label" aria-hidden="true">{{ row.label }}</span>
          <span class="zone-bars__measure" aria-hidden="true">{{ row.measure }}</span>
          <span class="zone-bars__track" aria-hidden="true">
            <span class="zone-bars__fill" :style="{ inlineSize: `${row.percent}%` }" />
          </span>
          <span class="zone-bars__value" aria-hidden="true">{{ row.text }}</span>
          <span class="d-sr-only">{{ row.aria }}</span>
        </li>
      </ul>
      <details class="zone-bars__method">
        <summary>{{ t('method') }}</summary>
        <p>{{ t('methodHint') }}</p>
      </details>
    </details>
  </section>
</template>

<script setup lang="ts">
import type { RentalZoneScoreAttribute } from '~/utils/rentalZoneTypes'
import { rentalZoneBarsMessages } from '~/utils/rentalZoneBarsMessages'
import { rentalServiceZoneFold, rentalZoneScoreId } from '~/utils/rentalZoneServices'

const props = defineProps<{
  place: {
    zone?: string | null
    department?: string | null
    neighborhood?: string | null
    locality?: string | null
  }
}>()
const { t, locale } = useI18n({ useScope: 'local', messages: rentalZoneBarsMessages })
const { scores } = useRentalZoneScores()

const id = computed(() => rentalZoneScoreId(scores.value, props.place))
const zone = computed(() => (id.value ? scores.value!.zones[id.value] : null))
const sameName = computed(
  () =>
    !!zone.value &&
    rentalServiceZoneFold(zone.value.name) === rentalServiceZoneFold(props.place.neighborhood || '')
)
const decimal = (value: number) =>
  new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1 }).format(value)
const date = (value: string) =>
  new Intl.DateTimeFormat(dateLocale(locale.value), {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(value))

// One choice for the whole page, kept across visits: the rows are worth the height or they are not.
const OPEN_KEY = 'cu_zone_bars_open'
const open = useState<boolean>('rental-zone-bars-open', () => false)
onMounted(() => {
  try {
    if (localStorage.getItem(OPEN_KEY) === '1') open.value = true
  } catch {
    // Storage blocked: the default still works.
  }
})
const onToggle = (event: Event) => {
  const next = (event.target as HTMLDetailsElement).open
  if (next === open.value) return
  open.value = next
  try {
    localStorage.setItem(OPEN_KEY, next ? '1' : '0')
  } catch {
    // Not remembering the choice is better than not honouring it.
  }
}

interface Row {
  attribute: RentalZoneScoreAttribute
  label: string
  n: number
  percent: number
  /** The measured figure with its unit and period: what the bar is a rank OF. */
  measure: string
  text: string
  detail: string
  aria: string
  measuring: boolean
}
const rows = computed<Row[]>(() => {
  if (!zone.value) return []
  const power = scores.value?.periods.power
  const list: Row[] = zone.value.rows.map(row => {
    const n = Math.round(row.betterThan * 100)
    const label = t(`label-${row.attribute}`)
    // A provisional power figure carries its day count in the row itself, not only on hover: a
    // rate from four days is a real measurement of a short window, and the reader should see which.
    const provisional = row.attribute === 'luz' && power?.status === 'preliminary'
    const days = Math.floor(power?.observedDays ?? 0)
    const detail =
      t(`detail-${row.attribute}`, { v: decimal(row.value) }) +
      (provisional ? ` ${t('provisional', { days, min: power?.minDays ?? 14 })}` : '')
    return {
      attribute: row.attribute,
      label,
      n,
      percent: Math.max(2, n),
      measure: provisional
        ? t('measureLuzProvisional', { v: decimal(row.value), days })
        : t(`measure-${row.attribute}`, { v: decimal(row.value) }),
      text: t('better', { n }),
      detail,
      aria: t('row', { label, n, zones: row.zones, detail }),
      measuring: false,
    }
  })
  // Power has no history anywhere: until three days of our own ledger exist, say so instead of
  // hiding it, and say how far along the ledger is so the reader knows when the row will fill.
  if (power?.status === 'collecting' && power.from && !list.some(row => row.attribute === 'luz')) {
    const label = t('label-luz')
    const progress = {
      label,
      date: date(power.from),
      days: Math.floor(power.observedDays ?? 0),
      min: power.minDays ?? 14,
    }
    list.splice(Math.min(1, list.length), 0, {
      attribute: 'luz',
      label,
      n: 0,
      percent: 0,
      measure: t('measureMeasuring', progress),
      text: t('measuring'),
      detail: t('rowMeasuring', progress),
      aria: t('rowMeasuring', progress),
      measuring: true,
    })
  }
  return list
})
// The closed line quotes two real rows instead of averaging them: the block has no combined score on
// purpose, and a reader comparing cards still learns where this area stands out and where it does not.
const digest = computed(() => {
  const ranked = rows.value.filter(row => !row.measuring)
  if (!ranked.length) return ''
  const best = ranked.reduce((a, b) => (b.n > a.n ? b : a))
  const worst = ranked.reduce((a, b) => (b.n < a.n ? b : a))
  return best === worst
    ? t('digestOne', { label: best.label, n: best.n })
    : t('digest', { best: best.label, worst: worst.label })
})
</script>

<style scoped>
.zone-bars {
  min-width: 0;
  padding-top: 4px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
:where(.zone-bars) :where(p, ul) {
  margin: 0;
  padding: 0;
}
.zone-bars__summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding-block: 4px;
  border-radius: 4px;
  cursor: pointer;
  list-style: none;
}
.zone-bars__summary::-webkit-details-marker {
  display: none;
}
.zone-bars__summary:hover .zone-bars__heading,
.zone-bars__summary:hover .zone-bars__chevron {
  color: rgb(var(--v-theme-link));
}
.zone-bars__summary-text {
  min-width: 0;
  display: grid;
  gap: 2px;
}
.zone-bars__heading {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  line-height: 1.4;
  color: rgba(var(--v-theme-on-surface), 0.76);
}
.zone-bars__digest {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
  line-height: 1.4;
  color: rgba(var(--v-theme-on-surface), 0.76);
}
.zone-bars__chevron {
  color: rgba(var(--v-theme-on-surface), 0.76);
  transition: transform 150ms ease;
}
.zone-bars__disclosure[open] .zone-bars__chevron {
  transform: rotate(180deg);
}
.zone-bars__rows {
  /* On a wide card (opportunities) a full-width track stops reading as a comparison. */
  max-inline-size: 34rem;
  list-style: none;
  display: grid;
  gap: 8px;
  margin-top: 4px !important;
}
/*
 * Two lines per figure: the name and the MEASURED value first, then the bar and its rank. The rank
 * alone ("mejor que 74 %") said where the area stands but not what was measured; the value with its
 * unit is the part a reader can check against their own experience of the barrio.
 */
.zone-bars__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'label measure'
    'track value';
  align-items: center;
  column-gap: 10px;
  row-gap: 3px;
  font-size: 0.75rem;
  line-height: 1.4;
}
.zone-bars__label {
  grid-area: label;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}
.zone-bars__measure {
  grid-area: measure;
  font-variant-numeric: tabular-nums;
  text-align: end;
  white-space: nowrap;
}
.zone-bars__track {
  grid-area: track;
}
.zone-bars__value {
  grid-area: value;
}
.zone-bars__track {
  position: relative;
  display: block;
  block-size: 6px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.12);
  overflow: hidden;
}
.zone-bars__fill {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  border-radius: 999px;
  background: rgb(var(--v-theme-primary));
}
.zone-bars__value {
  font-variant-numeric: tabular-nums;
  text-align: end;
  color: rgba(var(--v-theme-on-surface), 0.76);
  white-space: nowrap;
}
.zone-bars__row.is-measuring .zone-bars__track {
  background: repeating-linear-gradient(
    90deg,
    rgba(var(--v-theme-on-surface), 0.16) 0 4px,
    transparent 4px 8px
  );
}
.zone-bars__method {
  margin-top: 6px;
  font-size: 0.75rem;
  line-height: 1.4;
}
.zone-bars__method summary {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  cursor: pointer;
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
.zone-bars__method p {
  margin-top: 4px;
  color: rgba(var(--v-theme-on-surface), 0.76);
}
@media (max-width: 599px) {
  .zone-bars__summary {
    min-height: 44px;
  }
}
</style>
