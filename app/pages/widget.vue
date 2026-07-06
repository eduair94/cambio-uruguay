<template>
  <div :class="['widget', themeClass]" data-testid="widget">
    <div class="widget-inner">
      <header class="widget-head">
        <span class="widget-brand">cambio-uruguay.com</span>
        <span class="widget-badge">
          <span class="widget-dot" :class="{ 'widget-dot--live': hasRate }" />
          {{ t('widget.live') }}
        </span>
      </header>

      <div class="widget-body">
        <div class="widget-cell">
          <span class="widget-label">{{ t('widget.buy') }}</span>
          <span class="widget-value" data-testid="widget-buy">{{ buyDisplay }}</span>
        </div>
        <div class="widget-sep" />
        <div class="widget-cell">
          <span class="widget-label">{{ t('widget.sell') }}</span>
          <span class="widget-value" data-testid="widget-sell">{{ sellDisplay }}</span>
        </div>
      </div>

      <footer class="widget-foot">
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
// Embeddable, iframe-friendly widget that shows the live best USD compra/venta.
// Uses the bare `widget` layout (no site nav/footer) and the same cached
// `/api/og-rate` endpoint as the OG image. The backlink to cambio-uruguay.com
// is the whole point of the widget (drives referral traffic + backlinks).
definePageMeta({ layout: 'widget' })

interface OgRate {
  buy: number | null
  sell: number | null
}

const { t } = useI18n()
const route = useRoute()

// Light/dark theme is chosen by the embedding site via ?theme=light|dark.
const themeClass = computed(() =>
  route.query.theme === 'light' ? 'widget--light' : 'widget--dark'
)

const { data: rate, refresh } = await useFetch<OgRate>('/api/og-rate', {
  key: 'widget-og-rate',
  default: (): OgRate => ({ buy: null, sell: null }),
})

const hasRate = computed(() => rate.value.buy !== null || rate.value.sell !== null)

const formatRate = (value: number | null): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return value.toLocaleString('es-UY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const buyDisplay = computed(() => formatRate(rate.value.buy))
const sellDisplay = computed(() => formatRate(rate.value.sell))

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
  border-radius: 10px;
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
  font-size: 0.7rem;
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
</style>
