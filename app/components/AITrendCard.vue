<!-- eslint-disable vue/no-v-html -->
<template>
  <v-card class="ai-trend-card" elevation="4">
    <v-card-title class="d-flex align-center ga-2">
      <v-icon color="primary">mdi-creation</v-icon>
      {{ t('ai.trendAnalysis') }}
      <v-spacer />
      <v-chip v-if="insight?.cached" size="small" color="grey" variant="tonal">
        <v-icon start size="small">mdi-cached</v-icon>
        {{ t('ai.cached') }}
      </v-chip>
    </v-card-title>
    <v-card-text>
      <!-- Initial state -->
      <div v-if="!insight && !loading && !error" class="text-center py-4">
        <p class="text-body-2 text-grey mb-3">
          {{ t('ai.trendAnalysisDesc') }}
        </p>
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-creation"
          :loading="loading"
          @click="$emit('analyze')"
        >
          {{ t('ai.analyze') }}
        </v-btn>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="text-center py-6">
        <v-progress-circular indeterminate color="primary" size="40" class="mb-3" />
        <p class="text-body-2 text-grey">{{ t('ai.generating') }}</p>
      </div>

      <!-- Error state -->
      <v-alert v-if="error && !loading" type="error" variant="tonal" class="mb-2">
        {{ error }}
        <template #append>
          <v-btn variant="text" size="small" @click="$emit('analyze')">
            {{ t('ai.tryAgain') }}
          </v-btn>
        </template>
      </v-alert>

      <!-- Truncation warning -->
      <v-alert
        v-if="insight?.truncated && !loading"
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-2"
      >
        {{ t('ai.truncatedWarning') }}
      </v-alert>

      <!-- Rendered content -->
      <div v-if="insight && !loading" class="ai-insight-content" v-html="renderedInsight" />

      <!-- Footer -->
      <div
        v-if="insight && !loading"
        class="ai-insight-footer mt-3 d-flex justify-space-between align-center"
      >
        <span class="text-caption text-grey">{{ t('ai.disclaimer') }}</span>
        <v-btn
          variant="text"
          color="primary"
          size="small"
          prepend-icon="mdi-refresh"
          @click="$emit('analyze')"
        >
          {{ t('ai.newAnalysis') }}
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import DOMPurify from 'isomorphic-dompurify'
import { marked } from 'marked'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface InsightData {
  insight: string
  cached: boolean
  [key: string]: any
}

const props = defineProps<{
  insight: InsightData | null
  loading: boolean
  error: string | null
}>()

defineEmits<{
  analyze: []
}>()

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
})

const renderedInsight = computed(() => {
  if (!props.insight?.insight) return ''
  let text = props.insight.insight

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
</script>

<style scoped>
.ai-trend-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  transition:
    border-color 0.3s ease,
    box-shadow 0.3s ease;
}

.ai-trend-card:hover {
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.ai-insight-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 8px;
}

.ai-insight-content {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}

.ai-insight-content :deep(h1),
.ai-insight-content :deep(h2),
.ai-insight-content :deep(h3),
.ai-insight-content :deep(h4),
.ai-insight-content :deep(h5),
.ai-insight-content :deep(h6) {
  color: #42a5f5;
  margin-top: 0.75rem;
  margin-bottom: 0.35rem;
  font-weight: 700;
}

.ai-insight-content :deep(h1) {
  font-size: 1.4rem;
}
.ai-insight-content :deep(h2) {
  font-size: 1.25rem;
}
.ai-insight-content :deep(h3) {
  font-size: 1.1rem;
}
.ai-insight-content :deep(h4) {
  font-size: 1rem;
}

.ai-insight-content :deep(p) {
  margin-bottom: 0.5rem;
}

.ai-insight-content :deep(strong) {
  color: #90caf9;
}

.ai-insight-content :deep(em) {
  color: rgba(255, 255, 255, 0.75);
}

/* Lists */
.ai-insight-content :deep(ul),
.ai-insight-content :deep(ol) {
  padding-left: 1.5rem;
  margin-top: 0.2rem;
  margin-bottom: 0.5rem;
}

.ai-insight-content :deep(li) {
  margin-bottom: 0.2rem;
}

.ai-insight-content :deep(li > p) {
  margin-bottom: 0.1rem;
}

/* Tables */
.ai-insight-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  margin: 0.5rem 0;
  overflow-x: auto;
  display: block;
}

.ai-insight-content :deep(th),
.ai-insight-content :deep(td) {
  padding: 0.45rem 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  text-align: left;
  white-space: nowrap;
}

.ai-insight-content :deep(th) {
  background: rgba(66, 165, 245, 0.15);
  color: #42a5f5;
  font-weight: 600;
}

.ai-insight-content :deep(tr:nth-child(even)) {
  background: rgba(255, 255, 255, 0.03);
}

.ai-insight-content :deep(tr:hover) {
  background: rgba(255, 255, 255, 0.07);
}

/* Blockquotes */
.ai-insight-content :deep(blockquote) {
  border-left: 3px solid #42a5f5;
  padding-left: 0.75rem;
  margin: 0.5rem 0;
  color: rgba(255, 255, 255, 0.7);
}

/* Code */
.ai-insight-content :deep(code) {
  background: rgba(255, 255, 255, 0.08);
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  font-size: 0.85em;
}

.ai-insight-content :deep(pre) {
  background: rgba(255, 255, 255, 0.05);
  padding: 0.75rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0.5rem 0;
}

.ai-insight-content :deep(pre code) {
  background: none;
  padding: 0;
}

/* Horizontal rules */
.ai-insight-content :deep(hr) {
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  margin: 0.75rem 0;
}
</style>
