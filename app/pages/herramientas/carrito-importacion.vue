<template>
  <div class="import-cart-page">
    <VContainer>
      <!-- Header -->
      <header class="text-center pt-2 pb-6 py-md-10">
        <VChip class="mb-4" color="primary" size="small" variant="tonal">
          <VIcon start size="small">mdi-cart-outline</VIcon>
          {{ t('importCart.tag') }}
        </VChip>
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">{{ t('importCart.h1') }}</h1>
        <p class="text-body-1 text-medium-emphasis mx-auto page-intro">
          {{ t('importCart.intro') }}
        </p>
        <div class="d-flex justify-center mt-4">
          <ShareButtons :url="canonicalUrl" />
        </div>
      </header>

      <VRow>
        <!-- Cart + add -->
        <VCol cols="12" md="7" lg="8">
          <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
            <h2 class="text-h6 font-weight-bold d-flex align-center mb-0">
              <VIcon start color="primary">mdi-cart</VIcon>
              {{ t('importCart.yourCart') }}
              <VChip v-if="store.items.length" size="small" class="ml-2" variant="tonal">
                {{ store.items.length }}
              </VChip>
            </h2>
            <div class="d-flex ga-2">
              <ImportCartAddProductDialog @add="onAdd" />
              <VBtn
                v-if="store.items.length"
                variant="text"
                color="error"
                size="small"
                @click="store.clear()"
              >
                {{ t('importCart.clear') }}
              </VBtn>
            </div>
          </div>

          <!-- Empty state -->
          <VCard
            v-if="!store.items.length"
            variant="tonal"
            class="empty-state text-center pa-8"
            data-testid="cart-empty"
          >
            <VIcon size="56" color="primary" class="mb-3">mdi-cart-plus</VIcon>
            <p class="text-body-1 mb-1">{{ t('importCart.empty.title') }}</p>
            <p class="text-body-2 text-medium-emphasis">{{ t('importCart.empty.hint') }}</p>
          </VCard>

          <!-- Items -->
          <div v-else class="d-flex flex-column ga-3">
            <ImportCartLineItem
              v-for="line in result.lines"
              :key="line.item.id"
              :line="line"
              @remove="store.removeItem"
              @qty="onQty"
            />
          </div>

          <!-- Settings -->
          <VCard variant="outlined" class="mt-6 pa-4 settings-card">
            <h3 class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
              <VIcon start size="small">mdi-tune</VIcon>
              {{ t('importCart.settings.title') }}
            </h3>

            <div class="mb-4">
              <label class="text-caption text-medium-emphasis d-block mb-1">
                {{ t('importCart.settings.regime') }}
              </label>
              <VBtnToggle
                v-model="store.settings.regime"
                mandatory
                density="comfortable"
                variant="outlined"
                divided
                color="primary"
              >
                <VBtn value="courier" size="small">{{ t('importCart.settings.courier') }}</VBtn>
                <VBtn value="general" size="small">{{ t('importCart.settings.general') }}</VBtn>
              </VBtnToggle>
            </div>

            <!-- Courier-specific -->
            <template v-if="store.settings.regime === 'courier'">
              <div class="mb-4">
                <label class="text-caption text-medium-emphasis d-block mb-1">
                  {{ t('importCart.settings.origin') }}
                </label>
                <VBtnToggle
                  v-model="store.settings.origin"
                  mandatory
                  density="comfortable"
                  variant="outlined"
                  divided
                  color="primary"
                >
                  <VBtn value="usa" size="small">{{ t('importCart.settings.usa') }}</VBtn>
                  <VBtn value="other" size="small">{{ t('importCart.settings.otherOrigin') }}</VBtn>
                </VBtnToggle>
              </div>

              <VSwitch
                v-model="store.settings.useFranchise"
                :label="t('importCart.settings.useFranchise')"
                color="primary"
                density="compact"
                hide-details
                class="mb-2"
              />
              <VTextField
                v-if="store.settings.useFranchise"
                v-model.number="store.settings.franchiseAvailableUsd"
                :label="t('importCart.settings.franchiseAvailable')"
                type="number"
                min="0"
                step="50"
                prefix="US$"
                variant="outlined"
                density="compact"
                hide-details
                class="mb-4"
              />

              <VSelect
                v-model="courierId"
                :items="courierItems"
                :label="t('importCart.settings.courierSelect')"
                variant="outlined"
                density="compact"
                hide-details
                class="mb-3"
              />
              <VTextField
                v-model.number="manualShipping"
                :label="t('importCart.settings.manualShipping')"
                :placeholder="estimatedShipping != null ? String(estimatedShipping) : ''"
                type="number"
                min="0"
                step="1"
                prefix="US$"
                variant="outlined"
                density="compact"
                hide-details
                clearable
              />
              <p class="text-caption text-medium-emphasis mt-1">
                {{ t('importCart.settings.shippingHint') }}
              </p>
            </template>

            <!-- General-specific -->
            <template v-else>
              <VRow dense>
                <VCol cols="6">
                  <VTextField
                    v-model.number="store.settings.arancelPct"
                    :label="t('importCart.settings.arancel')"
                    type="number"
                    min="0"
                    step="1"
                    suffix="%"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </VCol>
                <VCol cols="6">
                  <VTextField
                    v-model.number="store.settings.tasaConsularPct"
                    :label="t('importCart.settings.tasaConsular')"
                    type="number"
                    min="0"
                    step="1"
                    suffix="%"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </VCol>
              </VRow>
            </template>
          </VCard>
        </VCol>

        <!-- Summary -->
        <VCol cols="12" md="5" lg="4">
          <div class="summary-sticky">
            <ImportCartSummary :result="result" :usd-rate="usdRate" :logged-in="loggedIn" />

            <VAlert type="info" variant="tonal" density="compact" class="mt-4 text-caption">
              {{ t('importCart.disclaimer') }}
              <NuxtLink
                :to="localePath('/herramientas/calculadora-impuestos-importacion')"
                class="text-primary"
              >
                {{ t('importCart.fullCalculator') }}
              </NuxtLink>
            </VAlert>
          </div>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import type { CartItem } from '~/utils/importCart'
import { computeCart } from '~/utils/importCart'
import { ESTIMATOR_COURIERS, getCourier, shippingCostUsd } from '~/utils/courierShipping'
import { useImportCartStore } from '~/stores/importCart'
import { useAuthStore } from '~/stores/auth'

const { t } = useI18n()
const localePath = useLocalePath()
const store = useImportCartStore()
const auth = useAuthStore()
const { bestSell } = useExchangeRates()

onMounted(() => store.loadLocal())

const loggedIn = computed(() => auth.isLoggedIn)
const usdRate = computed(() => bestSell('USD'))

const courierId = ref('gripper')
const manualShipping = ref<number | null>(null)
const courierItems = ESTIMATOR_COURIERS.map(c => ({
  title: `${c.name} (~US$${c.perKgUsd}/kg)`,
  value: c.id,
}))

const totalWeight = computed(() =>
  store.items.reduce((sum, i) => sum + (i.weightKg || 0) * (i.qty || 0), 0)
)

const estimatedShipping = computed<number | null>(() => {
  if (store.settings.regime !== 'courier') return null
  const c = getCourier(courierId.value)
  if (c.perKgUsd == null) return null
  return shippingCostUsd(c.perKgUsd, c.baseUsd ?? 0, totalWeight.value)
})

const shippingUsd = computed(() => {
  if (typeof manualShipping.value === 'number' && manualShipping.value >= 0) {
    return manualShipping.value
  }
  return estimatedShipping.value ?? 0
})

const result = computed(() =>
  computeCart(store.items, {
    ...store.settings,
    shippingUsd: shippingUsd.value,
    usdToUyu: usdRate.value,
  })
)

function onAdd(item: CartItem) {
  store.addItem(item)
}
function onQty(id: string, qty: number) {
  store.updateItem(id, { qty })
}

// --- SEO -------------------------------------------------------------------
const canonicalUrl = 'https://cambio-uruguay.com/herramientas/carrito-importacion'

defineOgImageComponent('Cambio', {
  title: t('importCart.h1'),
  subtitle: t('importCart.ogSubtitle'),
  tag: t('importCart.tag'),
})

useSeoMeta({
  title: () => `${t('importCart.h1')} | Cambio Uruguay`,
  description: () => t('importCart.metaDescription'),
  ogTitle: () => t('importCart.h1'),
  ogDescription: () => t('importCart.metaDescription'),
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead({ link: [{ rel: 'canonical', href: canonicalUrl }] })
</script>

<style scoped>
.page-intro {
  max-width: 720px;
  line-height: 1.7;
}
.summary-sticky {
  position: sticky;
  top: 88px;
}
.empty-state {
  border: 1px dashed rgba(var(--v-theme-primary), 0.4);
}
.settings-card {
  border-radius: 12px;
}
@media (max-width: 959px) {
  .summary-sticky {
    position: static;
  }
}
</style>
