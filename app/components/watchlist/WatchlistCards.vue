<template>
  <div class="wl-cards">
    <p class="wl-intro">
      Una compra de <strong>US$ {{ formatUsd(amountUsd) }}</strong> en el exterior, pagada desde
      saldo en pesos. Para pasarla a pesos usamos <strong>{{ formatRate(fxVenta) }}</strong
      >, el mejor dólar de tu tablero de hoy
      <template v-if="fxMid"> (referencia: {{ formatRate(fxMid) }})</template>. Lo que ves acá es la
      <strong>comisión</strong> de cada emisor, que es el dato publicado: el margen de cambio que
      cada uno aplica no lo publica nadie y se suma arriba de esto.
    </p>

    <table class="wl-table cu-mobile-cards">
      <thead>
        <tr>
          <th scope="col">Tarjeta</th>
          <th scope="col" class="wl-num">Comisión + IVA</th>
          <th scope="col" class="wl-num">Te sale</th>
          <th scope="col" class="wl-num">Sobrecosto</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, i) in ranked" :key="item.card.id" :class="{ 'wl-row-best': i === 0 }">
          <td data-label="Tarjeta">
            <div class="wl-card-cell">
              <span class="wl-card-name">{{ item.card.name }}</span>
              <VChip
                v-if="i === 0 && ranked.length > 1"
                size="x-small"
                color="success"
                variant="flat"
                label
              >
                <VIcon start size="12">mdi-check-circle</VIcon>La más barata de las tuyas
              </VChip>
              <VChip v-if="item.unknownFee" size="x-small" color="warning" variant="tonal" label>
                Comisión sin publicar
              </VChip>
            </div>
            <p class="wl-card-note">{{ item.card.feeNote }}</p>
          </td>
          <td data-label="Comisión + IVA" class="wl-num">
            {{ formatUsd(item.cost.comisionUsd + item.cost.ivaUsd) }}
            <span class="wl-unit">USD</span>
          </td>
          <td data-label="Te sale" class="wl-num wl-total">
            $ {{ formatPesos(item.cost.totalPesos) }}
          </td>
          <td data-label="Sobrecosto" class="wl-num">
            {{ item.cost.costoEfectivoPct.toFixed(2) }}%
          </td>
        </tr>
      </tbody>
    </table>

    <p class="wl-foot">
      Cálculo con las comisiones publicadas por cada emisor, revisadas el
      {{ DEBIT_CARDS_LAST_REVIEWED }}. El detalle de cada una y sus fuentes está en
      <NuxtLink :to="localePath('/tarjetas-de-debito-uruguay')">tarjetas de débito</NuxtLink>.
    </p>
  </div>
</template>

<script setup lang="ts">
import { DEBIT_CARDS_LAST_REVIEWED } from '~/utils/debitCards'
import type { CardCost } from '~/utils/watchlistBoard'

defineProps<{
  ranked: CardCost[]
  amountUsd: number
  fxVenta: number
  fxMid: number | null
}>()

const localePath = useLocalePath()
const { locale } = useI18n()

function formatUsd(n: number): string {
  return new Intl.NumberFormat(locale.value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatPesos(n: number): string {
  return new Intl.NumberFormat(locale.value, { maximumFractionDigits: 0 }).format(n)
}

function formatRate(n: number): string {
  return new Intl.NumberFormat(locale.value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}
</script>

<style scoped>
.wl-intro {
  margin: 0 0 16px;
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.86);
  max-width: 68ch;
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
  vertical-align: top;
}

.wl-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.wl-total {
  font-size: 0.95rem;
  font-weight: 700;
}

.wl-unit {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.wl-row-best {
  background: rgba(var(--v-theme-success), 0.06);
}

.wl-card-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.wl-card-name {
  font-weight: 600;
}

.wl-card-note {
  margin: 4px 0 0;
  font-size: 0.75rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.72);
  max-width: 60ch;
}

.wl-foot {
  margin: 16px 0 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
</style>
