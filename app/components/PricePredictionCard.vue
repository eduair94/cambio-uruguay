<template>
  <v-card class="price-prediction-card" elevation="4">
    <v-card-title class="d-flex align-center ga-2">
      <v-icon color="primary">mdi-creation</v-icon>
      {{ t('historical.prediction.title') }}
    </v-card-title>
    <v-card-text>
      <v-alert type="warning" variant="tonal" density="compact" class="mb-4">
        {{ t('historical.prediction.disclaimer') }}
      </v-alert>

      <div v-if="pending" class="text-center py-6">
        <v-progress-circular indeterminate color="primary" size="40" />
      </div>

      <template v-else>
        <div v-if="!error && data?.ai" class="mb-4">
          <div class="d-flex align-center ga-2 mb-2 flex-wrap">
            <v-chip :color="leanColor" variant="tonal">
              <v-icon start size="small">{{ leanIcon }}</v-icon>
              {{ t(`historical.prediction.lean${leanLabelSuffix}`) }}
            </v-chip>
            <v-chip variant="outlined" size="small">
              {{ t(`historical.prediction.confidence${confidenceLabelSuffix}`) }}
            </v-chip>
          </div>
          <p class="text-body-2">{{ data.ai.reasoning }}</p>
          <p v-if="data.ai.basedOn?.length" class="text-caption text-grey mt-1">
            {{
              t('historical.prediction.basedOn', {
                period: data.ai.basedOn.map(b => b.period).join('/'),
              })
            }}
          </p>
        </div>
        <p v-else class="text-body-2 text-grey mb-4">
          {{ t('historical.prediction.noAiAnalysis') }}
        </p>

        <div v-if="!error && data?.externalForecasts?.length">
          <p class="text-subtitle-2 mb-2">{{ t('historical.prediction.externalForecasts') }}</p>
          <v-list density="compact" class="bg-transparent">
            <v-list-item
              v-for="(forecast, idx) in data.externalForecasts"
              :key="idx"
              :href="forecast.link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <template #prepend>
                <v-icon
                  size="small"
                  :color="
                    forecast.direction === 'up'
                      ? 'success'
                      : forecast.direction === 'down'
                        ? 'error'
                        : 'grey'
                  "
                >
                  {{
                    forecast.direction === 'up'
                      ? 'mdi-trending-up'
                      : forecast.direction === 'down'
                        ? 'mdi-trending-down'
                        : 'mdi-trending-neutral'
                  }}
                </v-icon>
              </template>
              <v-list-item-title class="text-body-2">{{ forecast.summary }}</v-list-item-title>
              <v-list-item-subtitle>{{ forecast.source }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </div>
      </template>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface PricePredictionResponse {
  currency: string
  date: string
  ai: {
    lean: 'up' | 'down' | 'flat'
    confidence: 'low' | 'medium' | 'high'
    reasoning: string
    basedOn: { period: string; pctChange: number }[]
  } | null
  externalForecasts: {
    source: string
    link: string
    direction: 'up' | 'down' | 'flat' | null
    summary: string
  }[]
}

const props = defineProps<{ currency: string }>()
const { t } = useI18n()

const { data, pending, error } = await useFetch<PricePredictionResponse | null>(
  () => `/api/predictions/${props.currency}`,
  { key: () => `price-prediction-${props.currency}` }
)

const leanLabelSuffix = computed(() => {
  const lean = data.value?.ai?.lean
  return lean === 'up' ? 'Up' : lean === 'down' ? 'Down' : 'Flat'
})
const confidenceLabelSuffix = computed(() => {
  const confidence = data.value?.ai?.confidence
  return confidence === 'high' ? 'High' : confidence === 'low' ? 'Low' : 'Medium'
})
const leanColor = computed(() => {
  const lean = data.value?.ai?.lean
  return lean === 'up' ? 'success' : lean === 'down' ? 'error' : 'grey'
})
const leanIcon = computed(() => {
  const lean = data.value?.ai?.lean
  return lean === 'up'
    ? 'mdi-trending-up'
    : lean === 'down'
      ? 'mdi-trending-down'
      : 'mdi-trending-neutral'
})
</script>

<style scoped>
.price-prediction-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
}

.v-theme--light .price-prediction-card {
  background: #ffffff;
  border-color: rgba(15, 23, 42, 0.1);
}
</style>
