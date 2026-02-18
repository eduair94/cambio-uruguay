<!-- eslint-disable vue/no-v-html -->
<template>
  <section class="ai-insights-section py-12">
    <v-container>
      <v-row justify="center">
        <v-col cols="12" class="text-center mb-8">
          <h2 class="text-h4 font-weight-bold mb-4">
            {{ t('ai.title') }}
          </h2>
          <p class="text-body-1 text-grey-lighten-1">
            {{ t('ai.subtitle') }}
          </p>
        </v-col>
      </v-row>

      <v-row justify="center">
        <v-col cols="12" md="10" lg="8">
          <v-card class="ai-card pa-4 pa-md-6" elevation="4">
            <!-- Quick Action Chips -->
            <div class="action-chips-grid mb-5">
              <v-chip
                v-for="action in quickActions"
                :key="action.type"
                :color="selectedType === action.type ? 'primary' : 'default'"
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
            <v-row v-if="showCurrencySelector" class="mb-4" justify="center">
              <v-col cols="12" sm="8" md="6">
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
            <v-row v-if="selectedType === 'custom'" class="mb-4" justify="center">
              <v-col cols="12" sm="10" md="8">
                <v-text-field
                  v-model="customPrompt"
                  :label="t('ai.customQuestion')"
                  :placeholder="t('ai.askPlaceholder')"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  prepend-inner-icon="mdi-chat-question"
                  @keydown.enter="runAnalysis"
                />
              </v-col>
            </v-row>

            <!-- Analyze button -->
            <div class="text-center mb-2">
              <v-btn
                :loading="loading"
                :disabled="!canAnalyze"
                color="primary"
                size="large"
                rounded="lg"
                class="analyze-btn px-8"
                :prepend-icon="loading ? '' : 'mdi-creation'"
                @click="runAnalysis"
              >
                {{ loading ? t('ai.analyzing') : t('ai.analyze') }}
              </v-btn>
            </div>

            <!-- Loading state -->
            <div v-if="loading" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" size="48" class="mb-4" />
              <p class="text-body-2 text-grey-lighten-1">
                {{ t('ai.generating') }}
              </p>
            </div>

            <!-- Error state -->
            <v-alert
              v-if="error && !loading"
              type="error"
              variant="tonal"
              class="mb-4 mt-4"
              closable
            >
              {{ error }}
              <template #append>
                <v-btn variant="text" size="small" @click="runAnalysis">
                  {{ t('ai.tryAgain') }}
                </v-btn>
              </template>
            </v-alert>

            <!-- Results -->
            <div v-if="insight && !loading" class="insight-result mt-4">
              <v-divider class="mb-4" />

              <!-- Cached indicator -->
              <div v-if="insight.cached" class="d-flex align-center mb-2">
                <v-icon size="small" color="grey" class="mr-1">mdi-cached</v-icon>
                <span class="text-caption text-grey">{{ t('ai.cached') }}</span>
              </div>

              <!-- Markdown rendered content -->
              <div class="insight-content text-body-1" v-html="renderedInsight" />

              <!-- Actions -->
              <div class="insight-actions d-flex justify-space-between align-center mt-4 pt-3">
                <span class="text-caption text-grey-darken-1">
                  {{ t('ai.disclaimer') }}
                </span>
                <v-btn
                  variant="text"
                  color="primary"
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
import DOMPurify from 'isomorphic-dompurify'
import { marked } from 'marked'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const { loading, error, insight, checkAIStatus, getInsight } = useAIInsights()

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

// Configure marked for clean output
marked.setOptions({
  breaks: true,
  gfm: true,
})

// Markdown to HTML renderer using 'marked' library
const renderedInsight = computed(() => {
  if (!insight.value?.insight) return ''
  let text = insight.value.insight

  // Remove model name prefixes (e.g. "WormGPT:", "ChatGPT:", etc.)
  text = text.replace(/^\s*\w+GPT\s*:\s*/i, '')

  // Convert markdown to HTML
  let html = marked.parse(text) as string

  // Sanitize with DOMPurify
  html = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'br',
      'hr',
      'strong',
      'em',
      'ul',
      'ol',
      'li',
      'div',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'blockquote',
      'code',
      'pre',
    ],
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

  await getInsight(selectedType.value as any, lang, options)
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
  background: #1e1e1e;
}

.ai-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.ai-card:hover {
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.15);
}

.action-chip {
  transition: all 0.3s ease;
  cursor: pointer;
}

.action-chips-grid {
  display: grid;
  grid-template-columns: repeat(3, auto);
  gap: 8px;
  justify-content: center;
}

.action-chip:hover {
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.25);
}

.analyze-btn {
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0.5px;
  min-width: 180px;
}

.insight-result {
  animation: fadeInUp 0.5s ease-out;
}

.insight-actions {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.insight-content {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}

.insight-content :deep(h1),
.insight-content :deep(h2),
.insight-content :deep(h3),
.insight-content :deep(h4),
.insight-content :deep(h5),
.insight-content :deep(h6) {
  color: #42a5f5;
  margin-top: 0.75rem;
  margin-bottom: 0.35rem;
  font-weight: 700;
}

.insight-content :deep(h1) {
  font-size: 1.4rem;
}
.insight-content :deep(h2) {
  font-size: 1.25rem;
}
.insight-content :deep(h3) {
  font-size: 1.1rem;
}
.insight-content :deep(h4) {
  font-size: 1rem;
}

.insight-content :deep(p) {
  margin-bottom: 0.5rem;
}

.insight-content :deep(strong) {
  color: #90caf9;
}

.insight-content :deep(em) {
  color: rgba(255, 255, 255, 0.75);
}

/* Lists */
.insight-content :deep(ul),
.insight-content :deep(ol) {
  padding-left: 1.5rem;
  margin-top: 0.2rem;
  margin-bottom: 0.5rem;
}

.insight-content :deep(li) {
  margin-bottom: 0.2rem;
}

.insight-content :deep(li > p) {
  margin-bottom: 0.1rem;
}

/* Tables */
.insight-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  margin: 0.5rem 0;
  overflow-x: auto;
  display: block;
}

.insight-content :deep(th),
.insight-content :deep(td) {
  padding: 0.45rem 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  text-align: left;
  white-space: nowrap;
}

.insight-content :deep(th) {
  background: rgba(66, 165, 245, 0.15);
  color: #42a5f5;
  font-weight: 600;
}

.insight-content :deep(tr:nth-child(even)) {
  background: rgba(255, 255, 255, 0.03);
}

.insight-content :deep(tr:hover) {
  background: rgba(255, 255, 255, 0.07);
}

/* Blockquotes */
.insight-content :deep(blockquote) {
  border-left: 3px solid #42a5f5;
  padding-left: 0.75rem;
  margin: 0.5rem 0;
  color: rgba(255, 255, 255, 0.7);
}

/* Code */
.insight-content :deep(code) {
  background: rgba(255, 255, 255, 0.08);
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  font-size: 0.85em;
}

.insight-content :deep(pre) {
  background: rgba(255, 255, 255, 0.05);
  padding: 0.75rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0.5rem 0;
}

.insight-content :deep(pre code) {
  background: none;
  padding: 0;
}

/* Horizontal rules */
.insight-content :deep(hr) {
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  margin: 0.75rem 0;
}

/* Accessibility */
.ai-card:focus-within {
  outline: 2px solid #42a5f5;
  outline-offset: 2px;
}

/* Responsive */
@media (max-width: 600px) {
  .action-chips-grid {
    grid-template-columns: repeat(2, auto);
  }

  .action-chip {
    font-size: 0.75rem;
  }

  .analyze-btn {
    min-width: 140px;
  }
}
</style>
