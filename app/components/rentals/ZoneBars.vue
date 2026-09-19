<!--
  Where a listing's official area stands among the other areas with data, one quiet row per figure.
  A fuller bar is always better (fewer reports, cuts or complaints; more mapped shops), so the rows
  read the same way; the exact value and its source ride along for hover and screen readers.
  Deliberately no combined score: each row keeps its own source, period and meaning.
-->
<template>
  <section
    v-if="zone && rows.length"
    class="zone-bars"
    :aria-label="t('region', { name: zone.name })"
    data-testid="rental-zone-bars"
  >
    <p class="zone-bars__heading">
      {{ sameName ? t('heading') : t('headingNamed', { name: zone.name }) }}
    </p>
    <ul class="zone-bars__rows">
      <li
        v-for="row in rows"
        :key="row.attribute"
        class="zone-bars__row"
        :class="{ 'is-measuring': row.measuring }"
        :title="row.detail"
      >
        <span class="zone-bars__label">{{ row.label }}</span>
        <span class="zone-bars__track" aria-hidden="true">
          <span class="zone-bars__fill" :style="{ inlineSize: `${row.percent}%` }" />
        </span>
        <span class="zone-bars__value">{{ row.text }}</span>
        <span class="d-sr-only">{{ row.aria }}</span>
      </li>
    </ul>
    <details class="zone-bars__method">
      <summary>{{ t('method') }}</summary>
      <p>{{ t('methodHint') }}</p>
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
  new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(value)
  )

interface Row {
  attribute: RentalZoneScoreAttribute
  label: string
  percent: number
  text: string
  detail: string
  aria: string
  measuring: boolean
}
const rows = computed<Row[]>(() => {
  if (!zone.value) return []
  const list: Row[] = zone.value.rows.map(row => {
    const n = Math.round(row.betterThan * 100)
    const label = t(`label-${row.attribute}`)
    const detail = t(`detail-${row.attribute}`, { v: decimal(row.value) })
    return {
      attribute: row.attribute,
      label,
      percent: Math.max(2, n),
      text: t('better', { n }),
      detail,
      aria: t('row', { label, n, zones: row.zones, detail }),
      measuring: false,
    }
  })
  // Power has no history anywhere: until two weeks of our own ledger exist, say so instead of hiding it.
  const power = scores.value?.periods.power
  if (power?.status === 'collecting' && power.from && !list.some(row => row.attribute === 'luz')) {
    const label = t('label-luz')
    const text = t('measuring')
    list.splice(Math.min(1, list.length), 0, {
      attribute: 'luz',
      label,
      percent: 0,
      text,
      detail: t('rowMeasuring', { label, date: date(power.from) }),
      aria: t('rowMeasuring', { label, date: date(power.from) }),
      measuring: true,
    })
  }
  return list
})
</script>

<style scoped>
.zone-bars {
  min-width: 0;
  padding-top: 12px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
:where(.zone-bars) :where(p, ul) {
  margin: 0;
  padding: 0;
}
.zone-bars__heading {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  line-height: 1.4;
  color: rgba(var(--v-theme-on-surface), 0.76);
}
.zone-bars__rows {
  list-style: none;
  display: grid;
  gap: 6px;
  margin-top: 8px !important;
}
.zone-bars__row {
  display: grid;
  /* Fixed outer columns so every track starts and ends at the same x down the list. */
  grid-template-columns: 6.5rem minmax(40px, 1fr) 6.25rem;
  align-items: center;
  gap: 10px;
  font-size: 0.75rem;
  line-height: 1.4;
}
.zone-bars__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
</style>
