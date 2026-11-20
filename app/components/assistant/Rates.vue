<template>
  <section class="rates" :aria-label="`Cotizaciones de ${currencyName} hoy`">
    <div class="figures">
      <div v-if="block.bestSell" class="figure">
        <div class="figure-label">Te venden desde</div>
        <div class="figure-value">$ {{ rate(block.bestSell.rate) }}</div>
        <div class="figure-house">{{ block.bestSell.name }}</div>
      </div>
      <div v-if="block.bestBuy" class="figure">
        <div class="figure-label">Te compran hasta</div>
        <div class="figure-value">$ {{ rate(block.bestBuy.rate) }}</div>
        <div class="figure-house">{{ block.bestBuy.name }}</div>
      </div>
    </div>

    <div v-for="row in strips" :key="row.side" class="strip-row">
      <div class="strip-label">
        <span
          >{{ row.side === 'sell' ? 'Venta' : 'Compra' }} en {{ block.houses.length }} casas</span
        >
        <span v-if="row.avg" class="strip-avg">promedio $ {{ rate(row.avg) }}</span>
      </div>
      <div class="strip" role="img" :aria-label="row.summary">
        <div class="strip-track" />
        <span
          v-if="row.strip.avgX !== undefined"
          class="strip-avg-tick"
          :style="{ left: `${row.strip.avgX}%` }"
        />
        <span
          v-for="dot in row.strip.dots"
          :key="dot.name"
          :class="['dot', { best: dot.best, excluded: dot.excluded }]"
          :style="{ left: `${dot.x}%` }"
          :title="`${dot.name}: $ ${rate(dot.value)}${dot.excluded ? ' (no se corona: fuera de mercado o pizarra quieta)' : ''}`"
        />
      </div>
      <div class="strip-ends">
        <span>$ {{ rate(row.low) }}</span>
        <span>$ {{ rate(row.high) }}</span>
      </div>
    </div>

    <footer class="rates-foot">
      <span v-if="hasExcluded" class="legend">
        <span class="dot excluded legend-dot" />
        no se corona: fuera de mercado o pizarra quieta
      </span>
      <VSpacer />
      <a
        :href="block.moreUrl"
        target="_blank"
        rel="noopener"
        class="more"
        data-link-area="assistant_cards"
      >
        Todas las casas
        <VIcon icon="mdi-arrow-top-right" size="16" />
      </a>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { marketStrip } from '~/utils/chatCharts'
import { rate, type RatesBlock } from '~/utils/chatResults'
import { currencyDisplayName } from '~/utils/currencyPages'

const props = defineProps<{ block: RatesBlock }>()

const currencyName = computed(() => {
  try {
    return currencyDisplayName(props.block.currency as never, 'es')
  } catch {
    return props.block.currency
  }
})

const hasExcluded = computed(() => props.block.houses.some(h => h.excluded))

/**
 * The market as two strips of dots, one per board: where the best price sits against everyone
 * else is the point of this panel, and a list of 43 numbers does not show it.
 */
const strips = computed(() =>
  (['sell', 'buy'] as const).flatMap(side => {
    const best = side === 'sell' ? props.block.bestSell : props.block.bestBuy
    const avg = side === 'sell' ? props.block.avgSell : props.block.avgBuy
    const strip = marketStrip(props.block.houses, side, best?.name, avg)
    if (!strip) return []
    const live = props.block.houses.filter(h => !h.excluded).map(h => h[side])
    const low = Math.min(...live)
    const high = Math.max(...live)
    const summary =
      `${side === 'sell' ? 'Venta' : 'Compra'}: de $ ${rate(low)} a $ ${rate(high)} entre ` +
      `${live.length} casas${best ? `; la mejor, ${best.name} a $ ${rate(best.rate)}` : ''}.`
    return [{ side, strip, avg, low, high, summary }]
  })
)
</script>

<style scoped>
.rates {
  min-width: 0;
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.figures {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(136px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}
.figure {
  min-width: 0;
}
.figure-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  color: rgba(var(--v-theme-on-surface), 0.66);
}
.figure-value {
  margin-top: 4px;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.figure-house {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--v-theme-link));
}
.strip-row + .strip-row {
  margin-top: 16px;
}
.strip-label {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0 8px;
  font-size: 0.8rem;
  font-weight: 600;
}
.strip-avg {
  white-space: nowrap;
  font-weight: 400;
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-variant-numeric: tabular-nums;
}
/* 8px of breathing room on each side, so the end dots are not clipped by the panel. */
.strip {
  position: relative;
  height: 24px;
  margin: 4px 8px 0;
}
.strip-track {
  position: absolute;
  inset: 11px 0 auto;
  height: 2px;
  background: rgba(var(--v-theme-on-surface), 0.12);
}
.strip-avg-tick {
  position: absolute;
  top: 4px;
  width: 2px;
  height: 16px;
  margin-left: -1px;
  background: rgba(var(--v-theme-on-surface), 0.4);
}
.dot {
  position: absolute;
  top: 8px;
  width: 8px;
  height: 8px;
  margin-left: -4px;
  border-radius: 50%;
  background: rgba(var(--v-theme-on-surface), 0.36);
}
.dot.best {
  top: 4px;
  width: 16px;
  height: 16px;
  margin-left: -8px;
  background: rgb(var(--v-theme-primary));
  box-shadow:
    0 0 0 3px rgb(var(--v-theme-surface)),
    0 2px 6px 3px rgba(0, 0, 0, 0.2);
}
.dot.excluded {
  background: transparent;
  border: 2px solid rgba(var(--v-theme-on-surface), 0.4);
}
.strip-ends {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-variant-numeric: tabular-nums;
}
.rates-foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.legend {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.66);
}
.legend-dot {
  position: static;
  margin: 0;
}
.more {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 8px;
  border-radius: 4px;
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
}
.more:hover {
  text-decoration: underline;
}
</style>
