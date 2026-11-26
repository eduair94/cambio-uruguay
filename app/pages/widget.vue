<template>
  <div :class="['widget', themeClass]" data-testid="widget">
    <div :class="['widget-inner', { 'widget-inner--table': !classic }]">
      <header class="widget-head">
        <span class="widget-brand">cambio-uruguay.com</span>
        <span class="widget-badge">
          <span class="widget-dot" :class="{ 'widget-dot--live': hasRate }" />
          {{ t('widget.live') }}
        </span>
      </header>

      <!-- El widget de siempre: el dólar solo, mejor precio. Los iframes pegados antes de que
           hubiera opciones caen acá y se ven igual que siempre. -->
      <div v-if="classic" class="widget-body">
        <div class="widget-cell">
          <span class="widget-label">{{ t('widget.buy') }}</span>
          <span class="widget-value" data-testid="widget-buy">{{ format(rows[0]?.buy) }}</span>
        </div>
        <div class="widget-sep" />
        <div class="widget-cell">
          <span class="widget-label">{{ t('widget.sell') }}</span>
          <span class="widget-value" data-testid="widget-sell">{{ format(rows[0]?.sell) }}</span>
        </div>
      </div>

      <!-- Varias monedas, o la pizarra del BROU: una tabla, como el recuadro «Cotización del día»
           que los diarios arman a mano. -->
      <table v-else class="widget-table" data-testid="widget-table">
        <thead>
          <tr>
            <th scope="col" class="widget-table__name">
              <span class="visually-hidden">{{ tl('currency') }}</span>
            </th>
            <th scope="col">{{ t('widget.buy') }}</th>
            <th scope="col">{{ t('widget.sell') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.key" :data-testid="`widget-row-${row.key}`">
            <th scope="row" class="widget-table__name">{{ tl(`names.${row.key}`) }}</th>
            <td>{{ format(row.buy) }}</td>
            <td>{{ format(row.sell) }}</td>
          </tr>
        </tbody>
      </table>

      <footer class="widget-foot">
        <span v-if="!classic" class="widget-source">{{ tl(`source.${origin}`) }}</span>
        <a
          class="widget-link"
          href="https://cambio-uruguay.com"
          target="_blank"
          rel="noopener"
          data-testid="widget-backlink"
        >
          {{ t('widget.backlink') }}
        </a>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
// Embeddable, iframe-friendly widget with the day's rates. Uses the bare `widget` layout (no site
// nav/footer). Options come from the embedding site's URL:
//   ?theme=light|dark
//   ?monedas=USD,EUR,BRL,ARS   (default USD)
//   ?origen=mejor|brou         (default mejor: best buy/sell across the market)
// The data is `/api/widget-rates`: both sources, all four currencies, one 10-minute cache key.
// Rules in utils/widgetRates.ts.
//
// El enlace de acá NO es un backlink: esta página se sirve desde cambio-uruguay.com dentro de un
// iframe y responde `noindex`, así que el enlace es interno y hacia algo que no se indexa. Lo que
// aporta es tráfico de referencia cuando alguien lo toca. Ver el encabezado de
// utils/widgetEmbed.ts, incluida la advertencia de no convertir el snippet en un enlace de texto.
import {
  formatWidgetRate,
  isClassicWidget,
  parseWidgetCurrencies,
  parseWidgetOrigin,
  widgetRows,
  type WidgetRatesPayload,
} from '~/utils/widgetRates'

definePageMeta({ layout: 'widget' })

const { t, locale } = useI18n()
const { t: tl } = useI18n({
  useScope: 'local',
  messages: {
    es: {
      currency: 'Moneda',
      names: {
        USD: 'Dólar',
        EBROU: 'Dólar eBROU',
        EUR: 'Euro',
        BRL: 'Real',
        ARS: 'Peso argentino',
      },
      source: {
        mejor: 'Mejor precio entre más de 40 casas de cambio',
        brou: 'Pizarra del Banco República (BROU)',
      },
    },
    en: {
      currency: 'Currency',
      names: {
        USD: 'US dollar',
        EBROU: 'Dollar (eBROU)',
        EUR: 'Euro',
        BRL: 'Brazilian real',
        ARS: 'Argentine peso',
      },
      source: {
        mejor: 'Best price across 40+ exchange houses',
        brou: 'Banco República (BROU) board',
      },
    },
    pt: {
      currency: 'Moeda',
      names: {
        USD: 'Dólar',
        EBROU: 'Dólar eBROU',
        EUR: 'Euro',
        BRL: 'Real',
        ARS: 'Peso argentino',
      },
      source: {
        mejor: 'Melhor preço entre mais de 40 casas de câmbio',
        brou: 'Cotação do Banco República (BROU)',
      },
    },
  },
})
const route = useRoute()

// Light/dark theme is chosen by the embedding site via ?theme=light|dark.
const themeClass = computed(() =>
  route.query.theme === 'light' ? 'widget--light' : 'widget--dark'
)
const currencies = computed(() => parseWidgetCurrencies(route.query.monedas))
const origin = computed(() => parseWidgetOrigin(route.query.origen))
const classic = computed(() => isClassicWidget(currencies.value, origin.value))

const { data: rates, refresh } = await useFetch<WidgetRatesPayload | null>('/api/widget-rates', {
  key: 'widget-rates',
  default: () => null,
})

const rows = computed(() => widgetRows(rates.value, currencies.value, origin.value))
const hasRate = computed(() => rows.value.some(r => r.buy !== null || r.sell !== null))

const numberLocale = computed(() =>
  locale.value === 'en' ? 'en-US' : locale.value === 'pt' ? 'pt-BR' : 'es-UY'
)
const format = (value: number | null | undefined): string =>
  formatWidgetRate(value ?? null, numberLocale.value)

// Auto-refresh the live rate ~every 60s while the iframe is mounted (client only).
const REFRESH_MS = 60_000
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  timer = setInterval(() => {
    void refresh()
  }, REFRESH_MS)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

useSeoMeta({
  title: () => t('widget.metaTitle'),
  description: () => t('widget.metaDescription'),
  ogTitle: () => t('widget.metaTitle'),
  ogDescription: () => t('widget.metaDescription'),
  ogType: 'website',
  // Embeddable iframe widget — not a search landing page.
  robots: 'noindex, follow',
})
</script>

<style scoped>
.widget {
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1d24;
  font-family:
    'Open Sans',
    system-ui,
    -apple-system,
    sans-serif;
  color: #fff;
}

.widget-inner {
  width: 100%;
  max-width: 320px;
  padding: 14px 16px;
  box-sizing: border-box;
  background: linear-gradient(135deg, #1f2530 0%, #161a21 100%);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}

.widget-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.widget-brand {
  font-size: 0.78rem;
  font-weight: 700;
  color: rgb(var(--v-theme-link));
  letter-spacing: 0.2px;
}

.widget-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.6);
}

.widget-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
}

.widget-dot--live {
  background: #4caf50;
  box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.6);
  animation: widget-pulse 2s infinite;
}

@keyframes widget-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.5);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(76, 175, 80, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
  }
}

.widget-body {
  display: flex;
  align-items: stretch;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: 10px 4px;
}

.widget-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.widget-sep {
  width: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 2px 0;
}

.widget-label {
  font-size: 0.66rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: rgba(255, 255, 255, 0.55);
}

.widget-value {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.1;
  color: #fff;
}

.widget-value::before {
  content: '$ ';
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
}

.widget-foot {
  margin-top: 10px;
  text-align: center;
}

.widget-link {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
}

.widget-link:hover {
  color: rgb(var(--v-theme-link));
  text-decoration: underline;
}

/* Light theme (?theme=light) — for embedding on light-background sites. */
.widget--light {
  background: #f4f6fb;
}

.widget--light .widget-inner {
  background: linear-gradient(135deg, #ffffff 0%, #f0f3f9 100%);
  border-color: rgba(33, 150, 243, 0.25);
}

.widget--light .widget-brand {
  color: #1565c0;
}

.widget--light .widget-badge {
  color: rgba(0, 0, 0, 0.5);
}

.widget--light .widget-body {
  background: rgba(0, 0, 0, 0.03);
}

.widget--light .widget-sep {
  background: rgba(0, 0, 0, 0.1);
}

.widget--light .widget-label {
  color: rgba(0, 0, 0, 0.5);
}

.widget--light .widget-value {
  color: #1a1a1a;
}

.widget--light .widget-value::before {
  color: rgba(0, 0, 0, 0.45);
}

.widget--light .widget-link {
  color: rgba(0, 0, 0, 0.6);
}

/* ── Tabla (varias monedas o pizarra del BROU) ─────────────────────────────── */
.widget-inner--table {
  max-width: 420px;
}

.widget-table {
  width: 100%;
  border-collapse: collapse;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  overflow: hidden;
  font-variant-numeric: tabular-nums;
}

.widget-table th,
.widget-table td {
  padding: 6px 10px;
  text-align: right;
  white-space: nowrap;
}

.widget-table thead th {
  font-size: 0.66rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: rgba(255, 255, 255, 0.55);
}

.widget-table tbody tr + tr {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.widget-table .widget-table__name {
  text-align: left;
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.widget-table td {
  font-size: 1rem;
  font-weight: 800;
  color: #fff;
}

.widget-source {
  display: block;
  font-size: 0.66rem;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 2px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.widget--light .widget-table {
  background: rgba(0, 0, 0, 0.03);
}

.widget--light .widget-table thead th,
.widget--light .widget-source {
  color: rgba(0, 0, 0, 0.55);
}

.widget--light .widget-table tbody tr + tr {
  border-top-color: rgba(0, 0, 0, 0.08);
}

.widget--light .widget-table .widget-table__name {
  color: rgba(0, 0, 0, 0.78);
}

.widget--light .widget-table td {
  color: #1a1a1a;
}
</style>
