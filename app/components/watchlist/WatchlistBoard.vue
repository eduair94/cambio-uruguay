<template>
  <div class="wl-board">
    <div v-for="group in groups" :key="group.code" class="wl-group">
      <div class="wl-group-head">
        <h3 class="wl-group-title">
          {{ group.code }}
          <span class="wl-group-sub">{{ directionLabel }}</span>
        </h3>
        <span class="wl-group-count">{{ group.rows.length }} cotizaciones en tu zona</span>
      </div>

      <table class="wl-table cu-mobile-cards">
        <thead>
          <tr>
            <th scope="col">Casa</th>
            <th scope="col">Cómo se toma</th>
            <th scope="col" class="wl-num">{{ priceHeader }}</th>
            <th scope="col" class="wl-num">Desde tu última visita</th>
            <th scope="col">Dónde</th>
            <th scope="col"><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in visibleRows(group)"
            :key="row.key"
            :class="{ 'wl-row-best': row.best }"
            data-testid="wl-board-row"
          >
            <td data-label="Casa">
              <div class="wl-casa">
                <span class="wl-casa-name">{{ nameFor(row.origin) }}</span>
                <VChip v-if="row.best" size="x-small" color="success" variant="flat" label>
                  <VIcon start size="12">mdi-star</VIcon>Mejor de tu lista
                </VChip>
              </div>
            </td>
            <td data-label="Cómo se toma">
              <span class="wl-op">{{ OPERATION_LABELS[row.operation] }}</span>
              <span v-if="row.requiresAccount" class="wl-op-note">necesitás cuenta</span>
            </td>
            <td data-label="Precio" class="wl-num wl-price">{{ formatRate(row.price) }}</td>
            <td data-label="Desde tu última visita" class="wl-num">
              <span v-if="row.deltaPct == null" class="wl-muted">—</span>
              <span v-else-if="unchanged(row.deltaPct)" class="wl-muted">sin cambios</span>
              <span v-else :class="driftClass(row.deltaPct)">
                <VIcon size="14">{{ driftIcon(row.deltaPct) }}</VIcon>
                {{ row.deltaPct > 0 ? '+' : '' }}{{ row.deltaPct.toFixed(2) }}%
              </span>
            </td>
            <td data-label="Dónde">
              <span v-if="row.distanceKm != null" class="wl-where">
                {{ formatKm(row.distanceKm) }}
                <span v-if="row.branch?.locality" class="wl-muted">
                  · {{ row.branch.locality }}
                </span>
              </span>
              <span v-else class="wl-where wl-where-national">
                <VIcon size="14">mdi-cellphone</VIcon> Desde tu celular
              </span>
            </td>
            <td data-label="Acciones" class="wl-actions">
              <VBtn
                size="small"
                variant="text"
                color="primary"
                prepend-icon="mdi-bell-outline"
                @click="$emit('alert', row)"
              >
                Avisame
              </VBtn>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="group.rows.length > PREVIEW_ROWS" class="wl-more">
        <VBtn
          size="small"
          variant="text"
          color="primary"
          :prepend-icon="expanded.has(group.code) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
          @click="toggleGroup(group.code)"
        >
          {{
            expanded.has(group.code)
              ? 'Mostrar solo las primeras'
              : `Ver las otras ${group.rows.length - PREVIEW_ROWS}`
          }}
        </VBtn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OperationKind } from '~/utils/exchangeChannel'
import type { BoardRow } from '~/utils/watchlistBoard'

const props = defineProps<{
  rows: BoardRow[]
  direction: 'buy' | 'sell'
  /** origin -> display name, from the API's localData. */
  names: Record<string, string>
}>()

defineEmits<{ alert: [row: BoardRow] }>()

const { locale } = useI18n()

const OPERATION_LABELS: Record<OperationKind, string> = {
  cash: 'Efectivo en mostrador',
  transfer: 'Transferencia bancaria',
  app: 'App / saldo',
}

const directionLabel = computed(() => (props.direction === 'sell' ? 'para comprar' : 'para vender'))
const priceHeader = computed(() =>
  props.direction === 'sell' ? 'Te la venden a' : 'Te la compran a'
)

/** One table per currency: comparing a dollar price against a real is meaningless. */
const groups = computed(() => {
  const byCode = new Map<string, BoardRow[]>()
  for (const row of props.rows) {
    const list = byCode.get(row.code) ?? []
    list.push(row)
    byCode.set(row.code, list)
  }
  return [...byCode.entries()].map(([code, rows]) => ({ code, rows }))
})

/**
 * How many quotes a currency shows before asking. The board sorts best-first,
 * so the top of the list is the answer; the rest is there when someone wants to
 * check it. Without this a Montevideo list runs 60 rows — on a phone, where
 * every row becomes a card, that is a page nobody scrolls to the end of.
 */
const PREVIEW_ROWS = 8

const expanded = reactive(new Set<string>())

function toggleGroup(code: string) {
  if (expanded.has(code)) expanded.delete(code)
  else expanded.add(code)
}

function visibleRows(group: { code: string; rows: BoardRow[] }): BoardRow[] {
  return expanded.has(group.code) ? group.rows : group.rows.slice(0, PREVIEW_ROWS)
}

function nameFor(origin: string): string {
  return props.names[origin] || origin
}

function formatRate(n: number): string {
  return new Intl.NumberFormat(locale.value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatKm(km: number): string {
  return km < 1 ? `a ${Math.round(km * 1000)} m` : `a ${km.toFixed(km < 10 ? 1 : 0)} km`
}

/** Below this the price did not really move; "+0,00 %" is noise, not information. */
function unchanged(pct: number): boolean {
  return Math.abs(pct) < 0.01
}

/**
 * A move is good or bad depending on the side you are on: a lower selling price
 * is good news when you are buying currency, and the opposite when selling.
 */
function driftClass(pct: number): string {
  const favourable = props.direction === 'sell' ? pct < 0 : pct > 0
  return favourable ? 'wl-drift wl-drift-good' : 'wl-drift wl-drift-bad'
}

function driftIcon(pct: number): string {
  return pct > 0 ? 'mdi-arrow-top-right' : 'mdi-arrow-bottom-right'
}
</script>

<style scoped>
.wl-group + .wl-group {
  margin-top: 40px;
}

.wl-group-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.wl-group-title {
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.4;
  margin: 0;
}

.wl-group-sub {
  font-size: 0.8rem;
  font-weight: 400;
  color: rgba(var(--v-theme-on-surface), 0.72);
  margin-left: 8px;
}

.wl-group-count {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.wl-table {
  width: 100%;
  border-collapse: collapse;
}

.wl-table th {
  text-align: left;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  color: rgba(var(--v-theme-on-surface), 0.72);
  padding: 8px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  white-space: nowrap;
}

.wl-table td {
  padding: 12px;
  font-size: 0.875rem;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  vertical-align: middle;
}

.wl-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.wl-price {
  font-size: 0.95rem;
  font-weight: 700;
}

.wl-row-best {
  background: rgba(var(--v-theme-success), 0.06);
}

.wl-casa {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.wl-casa-name {
  font-weight: 600;
}

.wl-op {
  display: block;
}

.wl-op-note {
  display: block;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.wl-where {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.wl-where-national {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}

.wl-muted {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.wl-drift {
  font-weight: 700;
  white-space: nowrap;
}

.wl-drift-good {
  color: rgb(var(--v-theme-success));
}

.wl-drift-bad {
  color: rgb(var(--v-theme-error));
}

.wl-actions {
  text-align: right;
  white-space: nowrap;
}

.wl-more {
  margin-top: 8px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
