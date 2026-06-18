<!-- eslint-disable vue/no-v-html -->
<!--
  "¿Dónde cambiar?" — recommends WHERE to buy/sell a currency.
  Two layers:
   1. Deterministic ranking (utils/recommendation.ts) from live rates. This is the
      reliable core and renders immediately (SSR-friendly once data loads).
   2. An optional AI prose recommendation fetched client-side from
      /api/where-to-change and rendered as sanitized Markdown inside <ClientOnly>.
-->
<template>
  <section class="where-to-change-section py-12" data-testid="where-to-change">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" class="text-center mb-8">
          <h2 class="text-h4 font-weight-bold mb-4">
            {{ t('whereToChange.title') }}
          </h2>
          <p class="text-body-1 text-grey-lighten-1">
            {{ t('whereToChange.subtitle') }}
          </p>
        </VCol>
      </VRow>

      <VRow justify="center">
        <VCol cols="12" md="10" lg="8">
          <VCard class="wtc-card pa-4 pa-md-6" elevation="4">
            <!-- Controls -->
            <VRow class="mb-2" align="center">
              <VCol cols="12" sm="4">
                <VSelect
                  v-model="operation"
                  :items="operationItems"
                  :label="t('whereToChange.operation')"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  item-title="title"
                  item-value="value"
                  data-testid="wtc-operation"
                  prepend-inner-icon="mdi-swap-vertical"
                />
              </VCol>
              <VCol cols="12" sm="4">
                <VAutocomplete
                  v-model="currency"
                  :items="currencyItems"
                  :label="t('whereToChange.currency')"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  item-title="title"
                  item-value="value"
                  data-testid="wtc-currency"
                  prepend-inner-icon="mdi-cash-multiple"
                />
              </VCol>
              <VCol cols="12" sm="4">
                <VTextField
                  v-model="amountDisplay"
                  :label="t('whereToChange.amount')"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  type="text"
                  inputmode="decimal"
                  data-testid="wtc-amount"
                  prepend-inner-icon="mdi-cash"
                />
              </VCol>
            </VRow>

            <!-- Loading the live rates -->
            <div v-if="loadingRates" class="text-center py-8">
              <VProgressCircular indeterminate color="primary" size="48" class="mb-4" />
              <p class="text-body-2 text-grey-lighten-1">{{ t('loading') }}...</p>
            </div>

            <!-- No data for this currency -->
            <VAlert
              v-else-if="!ranking.ranked.length"
              type="info"
              variant="tonal"
              class="mt-4"
              data-testid="wtc-empty"
            >
              {{ t('whereToChange.noData') }}
            </VAlert>

            <!-- Deterministic ranking -->
            <div v-else class="wtc-ranking mt-4" data-testid="wtc-ranking">
              <p class="text-subtitle-1 font-weight-bold mb-3">
                {{ rankingHeading }}
              </p>
              <VList class="wtc-list bg-transparent" lines="two" role="list">
                <VListItem
                  v-for="(house, index) in topRanked"
                  :key="house.origin"
                  class="wtc-item mb-2 px-3"
                  data-testid="wtc-house"
                >
                  <template #prepend>
                    <VAvatar
                      :color="index === 0 ? 'success' : 'primary'"
                      size="40"
                      class="font-weight-bold"
                    >
                      #{{ index + 1 }}
                    </VAvatar>
                  </template>
                  <VListItemTitle class="font-weight-bold" data-testid="wtc-house-name">
                    {{ house.name }}
                  </VListItemTitle>
                  <VListItemSubtitle>
                    {{ operation === 'buy' ? t('sell') : t('buy') }}:
                    {{ formatUyu(house.rate) }}
                    <span v-if="house.savingsVsAvg > 0" class="text-success ml-2">
                      {{ t('whereToChange.savings', { amount: formatUyu(house.savingsVsAvg) }) }}
                    </span>
                  </VListItemSubtitle>
                  <template #append>
                    <div class="text-right">
                      <div class="text-caption text-grey-lighten-1">
                        {{
                          operation === 'buy'
                            ? t('whereToChange.youSpend')
                            : t('whereToChange.youReceive')
                        }}
                      </div>
                      <div class="text-h6 font-weight-bold" data-testid="wtc-house-total">
                        {{ formatUyu(house.total) }}
                      </div>
                    </div>
                  </template>
                </VListItem>
              </VList>

              <p class="text-caption text-grey-lighten-1 mt-2">
                {{ t('whereToChange.marketAverage') }}: {{ formatUyu(ranking.marketAverage) }}
              </p>

              <!-- AI prose recommendation (client-only, never blocks SSR) -->
              <ClientOnly>
                <VDivider class="my-4" />
                <div v-if="aiPending" class="d-flex align-center text-grey-lighten-1">
                  <VProgressCircular
                    indeterminate
                    color="primary"
                    size="20"
                    width="2"
                    class="mr-2"
                  />
                  <span class="text-body-2">{{ t('whereToChange.aiLoading') }}</span>
                </div>
                <div v-else-if="renderedRecommendation" class="wtc-ai" data-testid="wtc-ai">
                  <div class="d-flex align-center mb-2">
                    <VIcon size="small" color="primary" class="mr-1">mdi-creation</VIcon>
                    <span class="text-caption text-grey-lighten-1">
                      {{ t('whereToChange.aiLabel') }}
                    </span>
                  </div>
                  <!-- eslint-disable-next-line vue/no-v-html -->
                  <div class="wtc-ai-content text-body-1" v-html="renderedRecommendation" />
                </div>
              </ClientOnly>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </section>
</template>

<script setup lang="ts">
import DOMPurify from 'isomorphic-dompurify'
import { marked } from 'marked'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { rankExchanges, type Operation, type RankableRate } from '@/utils/recommendation'

const { t, locale } = useI18n()
const apiService = useApiService()

// A processed row carries the house display name under localData.name.
interface ProcessedRow {
  origin: string
  code: string
  buy?: number
  sell?: number
  type?: string
  localData: { name?: string } | null
}

const operation = ref<Operation>('buy')
const currency = ref<string>('USD')
const amountInput = ref<number>(100)
const loadingRates = ref<boolean>(true)
const rates = ref<RankableRate[]>([])

const operationItems = computed(() => [
  { title: t('buy'), value: 'buy' as Operation },
  { title: t('sell'), value: 'sell' as Operation },
])

// Currency codes present in the live data (UYU excluded — it's the base).
const currencyItems = computed(() => {
  const codes = new Set<string>()
  for (const r of rates.value) {
    if (r.code && r.code !== 'UYU') codes.add(r.code)
  }
  if (!codes.size) codes.add('USD')
  return Array.from(codes)
    .sort()
    .map(code => ({ title: `${code} - ${t('codes.' + code)}`, value: code }))
})

// es-UY formatted amount field bound to the numeric source of truth.
const amountDisplay = computed<string>({
  get: () => (amountInput.value > 0 ? formatNumber(amountInput.value, 0) : ''),
  set: (raw: string) => {
    const cleaned = raw.replace(/\./g, '').replace(',', '.')
    const parsed = Number(cleaned)
    amountInput.value = Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  },
})

const ranking = computed(() =>
  rankExchanges(rates.value, currency.value, operation.value, amountInput.value)
)
const topRanked = computed(() => ranking.value.ranked.slice(0, 5))

const rankingHeading = computed(() =>
  operation.value === 'buy'
    ? `${t('bestToBuy')} ${currency.value}`
    : `${t('bestToSell')} ${currency.value}`
)

function formatNumber(value: number, maximumFractionDigits = 2): string {
  if (!Number.isFinite(value)) return ''
  return new Intl.NumberFormat('es-UY', { minimumFractionDigits: 0, maximumFractionDigits }).format(
    value
  )
}
function formatUyu(value: number): string {
  return `$ ${formatNumber(value, 2)}`
}

// Map locale to the backend language code.
const apiLang = computed<string>(() => {
  const loc = locale.value
  if (loc.startsWith('en')) return 'en'
  if (loc.startsWith('pt')) return 'pt'
  return 'es'
})

// AI prose: lazy, client-only, never blocks SSR. Refetches when the key changes.
const aiUrl = computed(
  () =>
    `/api/where-to-change?currency=${encodeURIComponent(currency.value)}&op=${operation.value}&lang=${apiLang.value}`
)
const { data: aiData, pending: aiPending } = useLazyFetch<{ recommendation: string | null }>(
  aiUrl,
  { server: false }
)

marked.setOptions({ breaks: true, gfm: true })

const renderedRecommendation = computed<string>(() => {
  const text = aiData.value?.recommendation
  if (!text) return ''
  const html = marked.parse(text.replace(/^\s*\w+GPT\s*:\s*/i, '')) as string
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'code'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  })
})

onMounted(async () => {
  try {
    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Montevideo' })
    const data = await apiService.getProcessedExchangeData(date)
    const rows = (data.exchangeData ?? []) as ProcessedRow[]
    // Plain/cash quotes only and carry the display name for the ranking.
    rates.value = rows
      .filter(r => !r.type || r.type === '')
      .map<RankableRate>(r => ({
        origin: r.origin,
        code: r.code,
        buy: r.buy,
        sell: r.sell,
        name: r.localData?.name ?? r.origin,
      }))
    // Default to USD if present, otherwise the first available currency.
    const first = currencyItems.value[0]
    if (first && !rates.value.some(r => r.code === 'USD')) {
      currency.value = first.value
    }
  } catch (error) {
    console.error('WhereToChange: failed to load rates', error)
  } finally {
    loadingRates.value = false
  }
})
</script>

<style scoped>
.where-to-change-section {
  background: #1a1a1a;
}

.wtc-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}

.wtc-item {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.wtc-ai-content {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}

.wtc-ai-content :deep(p) {
  margin-bottom: 0.5rem;
}

.wtc-ai-content :deep(strong) {
  color: #90caf9;
}

.wtc-ai-content :deep(em) {
  color: rgba(255, 255, 255, 0.7);
}
</style>
