<template>
  <VCard
    class="line-item"
    :class="{ 'line-item--blocked': line.blocked }"
    variant="tonal"
    :color="line.blocked ? 'error' : undefined"
    data-testid="cart-line"
  >
    <div class="d-flex pa-3 ga-3">
      <VAvatar v-if="line.item.imageUrl" size="56" rounded class="flex-shrink-0">
        <VImg :src="line.item.imageUrl" :alt="line.item.name" cover />
      </VAvatar>
      <VAvatar v-else size="56" rounded color="surface-variant" class="flex-shrink-0">
        <VIcon>{{ line.productType.icon }}</VIcon>
      </VAvatar>

      <div class="flex-grow-1 min-w-0">
        <div class="d-flex align-start justify-space-between ga-2">
          <component
            :is="safeUrl ? 'a' : 'span'"
            :href="safeUrl"
            :target="safeUrl ? '_blank' : undefined"
            :rel="safeUrl ? 'noopener noreferrer nofollow' : undefined"
            class="text-subtitle-2 font-weight-bold line-name"
          >
            {{ line.item.name }}
          </component>
          <VBtn
            icon="mdi-close"
            size="x-small"
            variant="text"
            :aria-label="t('importCart.line.remove')"
            @click="emit('remove', line.item.id)"
          />
        </div>

        <VChip size="x-small" variant="outlined" class="mt-1">
          <VIcon start size="12">{{ line.productType.icon }}</VIcon>
          {{ line.productType.label.split(/[:,(]/)[0]!.trim() }}
        </VChip>

        <div class="d-flex align-center flex-wrap ga-3 mt-2">
          <div class="d-flex align-center qty-stepper">
            <VBtn
              icon="mdi-minus"
              size="x-small"
              variant="tonal"
              :aria-label="t('importCart.line.decrease')"
              @click="setQty(line.item.qty - 1)"
            />
            <span class="mx-2 text-body-2 font-weight-medium qty-value">{{ line.item.qty }}</span>
            <VBtn
              icon="mdi-plus"
              size="x-small"
              variant="tonal"
              :aria-label="t('importCart.line.increase')"
              @click="setQty(line.item.qty + 1)"
            />
          </div>
          <span class="text-caption text-medium-emphasis">
            {{ formatUSD(line.item.priceUsd) }}
            <template v-if="line.item.qty > 1">× {{ line.item.qty }}</template>
            <template v-if="line.item.weightKg"> · {{ line.item.weightKg }} kg</template>
          </span>
        </div>

        <VAlert
          v-if="line.blocked"
          type="warning"
          density="compact"
          variant="text"
          class="mt-2 pa-0 text-caption"
        >
          {{ line.blockedReason }}
        </VAlert>
      </div>

      <div v-if="!line.blocked" class="text-right flex-shrink-0">
        <div class="text-caption text-medium-emphasis">{{ t('importCart.line.landed') }}</div>
        <div class="text-subtitle-2 font-weight-bold">{{ formatUSD(line.tax?.landedCost) }}</div>
        <div class="text-caption text-medium-emphasis">
          +{{ formatUSD(line.tax?.totalTax) }} {{ t('importCart.line.tax') }}
        </div>
      </div>
    </div>
  </VCard>
</template>

<script setup lang="ts">
import type { CartLineResult } from '~/utils/importCart'
import { formatUSD } from '~/utils/format'

const props = defineProps<{ line: CartLineResult }>()
const emit = defineEmits<{ remove: [id: string]; qty: [id: string, qty: number] }>()
const { t } = useI18n()

// Only render the product link when it's an http(s) URL — never a javascript:
// or other scheme that could execute when clicked.
const safeUrl = computed(() => {
  const url = props.line.item.url
  return url && /^https?:\/\//i.test(url) ? url : undefined
})

function setQty(next: number) {
  emit('qty', props.line.item.id, Math.max(1, Math.round(next)))
}
</script>

<style scoped>
.line-name {
  color: inherit;
  text-decoration: none;
  word-break: break-word;
}
.line-item .line-name[href]:hover {
  text-decoration: underline;
}
.min-w-0 {
  min-width: 0;
}
.qty-value {
  min-width: 1.5rem;
  text-align: center;
}
</style>
