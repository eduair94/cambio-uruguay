<template>
  <VDialog v-model="open" max-width="560" scrollable>
    <template #activator="{ props: activator }">
      <VBtn
        v-bind="activator"
        color="primary"
        variant="elevated"
        prepend-icon="mdi-plus"
        data-testid="cart-add-cta"
      >
        {{ t('importCart.add.cta') }}
      </VBtn>
    </template>

    <VCard>
      <VCardTitle class="d-flex align-center">
        <VIcon start>mdi-cart-plus</VIcon>
        {{ t('importCart.add.title') }}
      </VCardTitle>
      <VDivider />
      <VCardText>
        <!-- URL paste + best-effort fetch -->
        <label class="text-caption text-medium-emphasis d-block mb-1" for="add-url">
          {{ t('importCart.add.urlLabel') }}
        </label>
        <div class="d-flex ga-2 align-start">
          <VTextField
            id="add-url"
            v-model="url"
            density="comfortable"
            variant="outlined"
            :placeholder="t('importCart.add.urlPlaceholder')"
            hide-details="auto"
            :error-messages="urlError"
            class="flex-grow-1"
            @keydown.enter.prevent="fetchPreview"
          />
          <VBtn
            :loading="fetching"
            color="primary"
            variant="tonal"
            height="48"
            :aria-label="t('importCart.add.fetch')"
            data-testid="cart-fetch"
            @click="fetchPreview"
          >
            <VIcon>mdi-magnify</VIcon>
          </VBtn>
        </div>
        <p class="text-caption text-medium-emphasis mt-1 mb-4">
          {{ t('importCart.add.urlHint') }}
        </p>

        <VImg
          v-if="form.imageUrl"
          :src="form.imageUrl"
          max-height="120"
          class="mb-4 rounded preview-img"
          contain
        />

        <VTextField
          id="add-name"
          v-model="form.name"
          :label="t('importCart.add.name')"
          variant="outlined"
          density="comfortable"
          class="mb-3"
          hide-details="auto"
        />

        <VRow dense>
          <VCol cols="6">
            <VTextField
              id="add-price"
              v-model.number="form.priceUsd"
              :label="t('importCart.add.priceUsd')"
              type="number"
              min="0"
              step="0.01"
              prefix="US$"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </VCol>
          <VCol cols="6">
            <VTextField
              v-model.number="form.qty"
              :label="t('importCart.add.qty')"
              type="number"
              min="1"
              step="1"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </VCol>
          <VCol cols="6">
            <VTextField
              v-model.number="form.weightKg"
              :label="t('importCart.add.weightKg')"
              type="number"
              min="0"
              step="0.1"
              suffix="kg"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              :messages="weightNote"
            >
              <template #append-inner>
                <VBtn
                  icon
                  size="x-small"
                  variant="text"
                  :loading="estimatingWeight"
                  :disabled="!form.name.trim()"
                  :aria-label="t('importCart.add.estimateWeight')"
                  :title="t('importCart.add.estimateWeight')"
                  data-testid="cart-estimate-weight"
                  @click="estimateWeight"
                >
                  <VIcon size="18">mdi-robot-outline</VIcon>
                </VBtn>
              </template>
            </VTextField>
          </VCol>
          <VCol cols="6">
            <VSelect
              v-model="form.categoryId"
              :items="categoryItems"
              :label="t('importCart.add.category')"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              :messages="categoryNote"
            >
              <template #append-inner>
                <VBtn
                  icon
                  size="x-small"
                  variant="text"
                  :loading="classifying"
                  :disabled="!form.name.trim()"
                  :aria-label="t('importCart.add.detectCategory')"
                  :title="t('importCart.add.detectCategory')"
                  data-testid="cart-detect-category"
                  @click.stop="detectCategory"
                >
                  <VIcon size="18">mdi-robot-outline</VIcon>
                </VBtn>
              </template>
            </VSelect>
          </VCol>
        </VRow>
      </VCardText>
      <VDivider />
      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="open = false">{{ t('importCart.add.cancel') }}</VBtn>
        <VBtn
          color="primary"
          variant="elevated"
          :disabled="!canSubmit"
          data-testid="cart-add-confirm"
          @click="submit"
        >
          {{ t('importCart.add.confirm') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<script setup lang="ts">
import type { CartItem } from '~/utils/importCart'
import { IMPORT_PRODUCT_TYPES } from '~/utils/importProductTypes'
import { isAllowedProductUrl, type ProductPreview } from '~/utils/productScrape'

const emit = defineEmits<{ add: [item: CartItem] }>()
const { t } = useI18n()

const open = ref(false)
const url = ref('')
const urlError = ref('')
const fetching = ref(false)
const estimatingWeight = ref(false)
const weightNote = ref('')
const classifying = ref(false)
const categoryNote = ref('')

const blankForm = () => ({
  name: '',
  priceUsd: null as number | null,
  qty: 1,
  weightKg: null as number | null,
  categoryId: 'general',
  imageUrl: '' as string | undefined,
})
const form = reactive(blankForm())

const categoryItems = IMPORT_PRODUCT_TYPES.map(type => ({ title: type.label, value: type.id }))

const canSubmit = computed(
  () => form.name.trim().length > 0 && typeof form.priceUsd === 'number' && form.priceUsd > 0
)

async function fetchPreview() {
  if (fetching.value) return
  urlError.value = ''
  const link = url.value.trim()
  if (!link) return
  if (!isAllowedProductUrl(link)) {
    urlError.value = t('importCart.add.urlInvalid')
    return
  }
  fetching.value = true
  try {
    const preview = await $fetch<ProductPreview>('/api/import-preview', { query: { url: link } })
    // Ignore a stale response if the user edited the URL while it was in flight.
    if (url.value.trim() !== link) return
    if (preview.title) form.name = preview.title
    if (preview.image) form.imageUrl = preview.image
    // Only auto-fill the price when the scraped currency is USD (or absent).
    // Regional marketplaces (mercadolibre.com.uy, amazon.co.uk, …) return local
    // currency; copying that number into a USD field would corrupt the cart.
    const currency = preview.currency?.toUpperCase()
    if (typeof preview.price === 'number' && (!currency || currency === 'USD')) {
      form.priceUsd = preview.price
    } else if (typeof preview.price === 'number' && currency) {
      urlError.value = t('importCart.add.urlCurrency', { currency })
    } else if (!preview.title && preview.price == null) {
      urlError.value = t('importCart.add.urlNoData')
    }
  } catch {
    urlError.value = t('importCart.add.urlNoData')
  } finally {
    fetching.value = false
  }
}

async function estimateWeight() {
  const name = form.name.trim()
  if (!name || estimatingWeight.value) return
  estimatingWeight.value = true
  weightNote.value = ''
  try {
    const { weightKg } = await $fetch<{ weightKg: number | null }>('/api/estimate-weight', {
      query: { name },
    })
    if (typeof weightKg === 'number' && weightKg > 0) {
      form.weightKg = weightKg
      weightNote.value = t('importCart.add.weightEstimated')
    } else {
      weightNote.value = t('importCart.add.weightFailed')
    }
  } catch {
    weightNote.value = t('importCart.add.weightFailed')
  } finally {
    estimatingWeight.value = false
  }
}

async function detectCategory() {
  const name = form.name.trim()
  if (!name || classifying.value) return
  classifying.value = true
  categoryNote.value = ''
  try {
    const res = await $fetch<{
      categoryId: string | null
      blocked?: boolean
      reason?: string | null
    }>('/api/classify-product', { query: { name } })
    if (res.categoryId) {
      form.categoryId = res.categoryId
      // The AI only suggests the category; the catalog decides taxes/forbidden.
      categoryNote.value =
        res.blocked && res.reason
          ? `${t('importCart.add.categoryDetected')} ⚠ ${res.reason}`
          : t('importCart.add.categoryDetected')
    } else {
      categoryNote.value = t('importCart.add.categoryFailed')
    }
  } catch {
    categoryNote.value = t('importCart.add.categoryFailed')
  } finally {
    classifying.value = false
  }
}

// Monotonic counter so the non-secure-context fallback id can never collide,
// even for two adds within the same millisecond (id is the Vue key + merge key).
let idSeq = 0
function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `i-${Date.now()}-${idSeq++}`
}

function submit() {
  if (!canSubmit.value) return
  emit('add', {
    id: makeId(),
    name: form.name.trim().slice(0, 200),
    url: url.value.trim() || undefined,
    imageUrl: form.imageUrl || undefined,
    priceUsd: Number(form.priceUsd),
    qty: Math.max(1, Math.round(form.qty || 1)),
    weightKg: form.weightKg != null ? Math.max(0, Number(form.weightKg)) : undefined,
    categoryId: form.categoryId,
  })
  // reset for the next add
  url.value = ''
  Object.assign(form, blankForm())
  open.value = false
}
</script>

<style scoped>
.preview-img {
  background: rgba(255, 255, 255, 0.04);
}
</style>
