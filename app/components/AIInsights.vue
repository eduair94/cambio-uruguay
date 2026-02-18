<!-- eslint-disable vue/no-v-html -->
<template>
  <section class="ai-insights-section py-12">
    <v-container>
      <v-row justify="center">
        <v-col cols="12" md="10" lg="8">
          <!-- Section Header -->
          <div class="text-center mb-8">
            <v-chip color="purple" variant="flat" class="mb-4" prepend-icon="mdi-robot">
              {{ t('ai.poweredBy') }}
            </v-chip>
            <h2 class="text-h4 text-md-h3 font-weight-bold text-white mb-3">
              ��� {{ t('ai.title') }}
            </h2>
            <p class="text-body-1 text-grey-lighten-1">
              {{ t('ai.subtitle') }}
            </p>
          </div>

          <!-- Analysis Type Selector -->
          <v-card class="ai-card pa-4 pa-md-6 mb-6" elevation="8">
            <!-- Quick Action Chips -->
            <div class="d-flex flex-wrap ga-2 mb-5 justify-center">
              <v-chip
                v-for="action in quickActions"
                :key="action.type"
                :color="selectedType === action.type ? 'purple' : 'default'"
                :variant="selectedType === action.type ? 'flat' : 'outlined'"
                :prepend-icon="action.icon"
                size="large"
                class="action-chip"
                @click="selectType(action.type)"
              >
                {{ action.label }}
              </v-chip>
            </div>

            <!-- Currency selector (for currency-specific analyses) -->
            <v-row
              v-if="showCurrencySelector"
              class="mb-4"
              justify="center"
            >
              <v-col cols="12" sm="6" md="4">
                <v-autocomplete
                  v-model="selectedCurrency"
                  :items="currencyItems"
                  :label="t('ai.selectCurrency')"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  prepend-inner-icon="mdi-currency-usd"
                />
              </v-col>
            </v-row>

            <!-- Custom prompt input -->
            <v-row v-if="selectedType === 'custom'" class="mb-4">
              <v-col cols="12">
                <v-textarea
                  v-model="customPrompt"
                  :label="t('ai.customQuestion')"
                  :placeholder="t('ai.askPlaceholder')"
                  variant="outlined"
                  rows="2"
                  auto-grow
                  max-rows="4"
                  hide-details
                  prepend-inner-icon="mdi-chat-question"
                />
              </v-col>
            </v-row>

            <!-- Analyze button -->
            <div class="text-center mb-4">
              <v-btn
                :loading="loading"
                :disabled="!canAnalyze"
                color="purple"
                size="large"
                rounded="lg"
                class="analyze-btn px-8"
                :prepend-icon="loading ? '' : 'mdi-brain'"
                @click="runAnalysis"
              >
                {{ loading ? t('ai.analyzing') : t('ai.analyze') }}
              </v-btn>
            </div>

            <!-- Loading state -->
            <div v-if="loading" class="text-center py-8">
              <v-progress-circular
                indeterminate
                color="purple"
                size="48"
                class="mb-4"
              />
              <p class="text-body-2 text-grey-lighten-1">
                {{ t('ai.generating') }}
              </p>
            </div>

            <!-- Error state -->
            <v-alert
              v-if="error && !loading"
              type="error"
              variant="tonal"
              class="mb-4"
              closable
            >
              {{ error }}
              <template #append>
                <v-btn
                  variant="text"
                  size="small"
                  @click="runAnalysis"
                >
                  {{ t('ai.tryAgain') }}
                </v-btn>
              </template>
            </v-alert>

            <!-- Results -->
            <div v-if="insight && !loading" class="insight-result">
              <v-divider class="mb-4" />

              <!-- Cached indicator -->
              <div v-if="insight.cached" class="d-flex align-center mb-2">
                <v-icon size="small" color="grey" class="mr-1">mdi-cached</v-icon>
                <span class="text-caption text-grey">{{ t('ai.cached') }}</span>
              </div>

              <!-- Markdown rendered content -->
              <div class="insight-content text-body-1" v-html="renderedInsight" />

              <!-- Actions -->
              <div class="d-flex justify-space-between align-center mt-4 pt-3" style="border-top: 1px solid rgba(255,255,255,0.1)">
                <span class="text-caption text-grey-darken-1">
                  {{ t('ai.disclaimer') }}
                </span>
                <v-btn
                  variant="text"
                  color="purple"
                  size="small"
                  prepend-icon="mdi-refresh"
                  @click="runAnalysis"
                >
                  {{ t('ai.newAnalysis') }}
                </v-btn>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DOMPurify from 'isomorphic-dompurify'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const { loading, error, insight, checkAIStatus, getInsight, aiStatus } = useAIInsights()

const selectedType = ref<string>('market_summary')
const selectedCurrency = ref<string>('USD')
const customPrompt = ref<string>('')
const isAvailable = ref<boolean>(false)

const currencyItems = [
  { title: 'USD - Dólar', value: 'USD' },
  { title: 'EUR - Euro', value: 'EUR' },
  { title: 'ARS - Peso Argentino', value: 'ARS' },
  { title: 'BRL - Real', value: 'BRL' },
  { title: 'GBP - Libra', value: 'GBP' },
  { title: 'CHF - Franco Suizo', value: 'CHF' },
  { title: 'CAD - Dólar Canadiense', value: 'CAD' },
  { title: 'AUD - Dólar Australiano', value: 'AUD' },
  { title: 'JPY - Yen', value: 'JPY' },
  { title: 'MXN - Peso Mexicano', value: 'MXN' },
]

const quickActions = computed(() => [
  {
    type: 'market_summary',
    label: t('ai.marketSummary'),
    icon: 'mdi-chart-bar',
    desc: t('ai.marketSummaryDesc'),
  },
  {
    type: 'currency_analysis',
    label: t('ai.currencyAnalysis'),
    icon: 'mdi-magnify-scan',
    desc: t('ai.currencyAnalysisDesc'),
  },
  {
    type: 'best_rates',
    label: t('ai.bestRates'),
    icon: 'mdi-star',
    desc: t('ai.bestRatesDesc'),
  },
  {
    type: 'trend_analysis',
    label: t('ai.trendAnalysis'),
    icon: 'mdi-trending-up',
    desc: t('ai.trendAnalysisDesc'),
  },
  {
    type: 'custom',
    label: t('ai.customQuestion'),
    icon: 'mdi-chat-question',
    desc: t('ai.customDesc'),
  },
])

const showCurrencySelector = computed(() => {
  return ['currency_analysis', 'trend_analysis'].includes(selectedType.value)
})

const canAnalyze = computed(() => {
  if (selectedType.value === 'custom' && !customPrompt.value.trim()) return false
  return true
})

// Simple Markdown to HTML renderer (no external dependency)
const renderedInsight = computed(() => {
  if (!insight.value?.insight) return ''
  let html = insight.value.insight

  // Escape HTML first
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h4 class="text-h6 font-weight-bold mt-4 mb-2">$1</h4>')
  html = html.replace(/^## (.+)$/gm, '<h3 class="text-h5 font-weight-bold mt-4 mb-2">$1</h3>')
  html = html.replace(/^# (.+)$/gm, '<h2 class="text-h4 font-weight-bold mt-4 mb-2">$1</h2>')

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul class="insight-list mb-3">$1</ul>')

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')

  // Line breaks (double newline = paragraph)
  html = html.replace(/\n\n/g, '</p><p class="mb-2">')
  html = html.replace(/\n/g, '<br />')

  // Wrap in paragraph if not already
  if (!html.startsWith('<')) {
    html = '<p class="mb-2">' + html + '</p>'
  }

  // Sanitize with DOMPurify using a strict allowlist of only the tags/attributes we generate
  html = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  })

  return html
})

const selectType = (type: string) => {
  selectedType.value = type
}

// Map locale code to API-compatible language
const getLanguage = (): string => {
  const loc = locale.value
  if (loc.startsWith('en')) return 'en'
  if (loc.startsWith('pt')) return 'pt'
  return 'es'
}

const runAnalysis = async () => {
  const lang = getLanguage()
  const options: Record<string, any> = {}

  if (showCurrencySelector.value) {
    options.currency = selectedCurrency.value
  }
  if (selectedType.value === 'custom') {
    options.customPrompt = customPrompt.value
  }

  await getInsight(
    selectedType.value as any,
    lang,
    options
  )
}

// Check AI availability on mount
onMounted(async () => {
  const status = await checkAIStatus()
  isAvailable.value = status?.configured ?? false
})

// Expose availability for parent components
defineExpose({ isAvailable })
</script>

<style scoped>
.ai-insights-section {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  position: relative;
  overflow: hidden;
}

.ai-insights-section::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(
    ellipse at center,
    rgba(156, 39, 176, 0.08) 0%,
    transparent 60%
  );
  animation: pulse-glow 8s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.1); }
}

.ai-card {
  background: rgba(255, 255, 255, 0.05) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(156, 39, 176, 0.2);
  border-radius: 16px !important;
  position: relative;
  z-index: 1;
}

.action-chip {
  transition: all 0.3s ease;
  cursor: pointer;
}

.action-chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(156, 39, 176, 0.3);
}

.analyze-btn {
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.insight-result {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.insight-content {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.7;
}

.insight-content :deep(h2),
.insight-content :deep(h3),
.insight-content :deep(h4) {
  color: #ce93d8;
}

.insight-content :deep(strong) {
  color: #e1bee7;
}

.insight-content :deep(.insight-list) {
  padding-left: 1.5rem;
}

.insight-content :deep(li) {
  margin-bottom: 0.25rem;
}

.insight-content :deep(p) {
  margin-bottom: 0.5rem;
}

/* Responsive */
@media (max-width: 600px) {
  .action-chip {
    font-size: 0.75rem;
  }
}
</style>
