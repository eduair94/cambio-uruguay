<template>
  <section v-if="series" class="price-history" :aria-labelledby="headingId">
    <h3 :id="headingId" class="price-history__title">{{ title ?? t('title') }}</h3>

    <p v-if="!hasSeries" class="price-history__lead">
      {{ t('noChange', { date: formatDay(series.firstSeen) }) }}
    </p>

    <template v-else>
      <p class="price-history__lead">
        <strong :class="toneClass">{{ changeText }}</strong>
        {{ t('lead', { date: formatDay(series.points[0]!.d), from: money(first), to: money(last) }) }}
      </p>

      <div class="price-history__plot">
        <Sparkline :values="values" :up="(series.changePct ?? 0) > 0" />
        <div class="price-history__bounds">
          <span>{{ t('high', { value: money(high) }) }}</span>
          <span>{{ t('low', { value: money(low) }) }}</span>
        </div>
      </div>

      <p v-if="series.lastChange" class="price-history__last">
        {{
          t('lastChange', {
            date: formatDay(series.lastChange.at),
            from: money(series.lastChange.from),
            to: money(series.lastChange.to),
          })
        }}
      </p>

      <p v-if="series.currencySwitched" class="price-history__note">{{ t('currencyNote') }}</p>
    </template>

    <p class="price-history__note">
      {{ t('method', { points: pointsText, date: formatDay(series.firstSeen) }) }}
    </p>
  </section>
</template>

<script setup lang="ts">
import type { PriceHistorySeries } from '~/utils/priceHistory'
import { priceHistoryMessages } from '~/utils/priceHistoryMessages'

/**
 * La variación del precio de UN aviso, para su ficha. No es la serie del producto ni la del mercado
 * (eso son /evolucion-precio-* y los bloques de modelo): acá el sujeto es el aviso, así que una baja
 * significa que ese vendedor bajó su propio precio y no que entró un vendedor más barato.
 */
const props = defineProps<{
  series: PriceHistorySeries | null
  /** Título propio de la ficha que lo muestra; si no viene, el del bloque. */
  title?: string
  id?: string
}>()

const { t } = useI18n({ useScope: 'local', messages: priceHistoryMessages })

const headingId = computed(() => `${props.id ?? 'price-history'}-title`)
const hasSeries = computed(() => (props.series?.points.length ?? 0) > 1)
const values = computed(() => props.series?.points.map(point => point.p) ?? [])
const first = computed(() => values.value[0] ?? 0)
const last = computed(() => values.value[values.value.length - 1] ?? 0)
const high = computed(() => (values.value.length ? Math.max(...values.value) : 0))
const low = computed(() => (values.value.length ? Math.min(...values.value) : 0))

const toneClass = computed(() => {
  const pct = props.series?.changePct ?? 0
  return pct < 0 ? 'is-down' : pct > 0 ? 'is-up' : ''
})

const changeText = computed(() => {
  const pct = props.series?.changePct ?? null
  if (pct === null || !Number.isFinite(pct) || Math.abs(pct) < 0.01) return t('flat')
  const value = `${Math.abs(pct).toLocaleString('es-UY', { maximumFractionDigits: 1 })} %`
  return pct < 0 ? t('down', { pct: value }) : t('up', { pct: value })
})

const pointsText = computed(() => {
  const count = props.series?.points.length ?? 0
  return count === 1 ? t('onePoint') : t('manyPoints', { count })
})

function money(value: number): string {
  const symbol = props.series?.currency === 'USD' ? 'US$' : '$'
  return `${symbol} ${Math.round(value).toLocaleString('es-UY')}`
}

/**
 * `YYYY-MM-DD` a "22/9/2026" sin construir un Date: una fecha sin hora no tiene zona horaria y
 * `new Date('2026-09-22')` la interpreta en UTC, que del lado del navegador puede caer un día antes
 * (la trampa de fechas es-UY que ya mordió en otras páginas).
 */
function formatDay(day: string): string {
  const [year, month, date] = day.split('-')
  return year && month && date ? `${Number(date)}/${Number(month)}/${year}` : day
}
</script>

<style scoped>
.price-history {
  border: 1px solid rgb(var(--v-border-color, 0 0 0) / 0.18);
  border-radius: 12px;
  padding: 16px;
}
.price-history__title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 8px;
}
.price-history__lead,
.price-history__last {
  margin: 0 0 8px;
  font-size: 0.95rem;
  line-height: 1.5;
}
.price-history__note {
  margin: 8px 0 0;
  font-size: 0.8rem;
  opacity: 0.75;
  line-height: 1.45;
}
.price-history__plot {
  margin: 12px 0;
}
.price-history__bounds {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  opacity: 0.75;
  margin-top: 4px;
}
.is-down {
  color: rgb(var(--v-theme-success));
}
.is-up {
  color: rgb(var(--v-theme-error));
}
</style>
