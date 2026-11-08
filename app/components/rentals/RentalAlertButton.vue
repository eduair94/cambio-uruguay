<template>
  <VBtn
    :id="id"
    :icon="compact ? 'mdi-bell-plus-outline' : undefined"
    :prepend-icon="compact ? undefined : 'mdi-bell-plus-outline'"
    variant="tonal"
    color="primary"
    class="rental-alert-trigger"
    :aria-label="t(notify ? 'notify' : 'createAlert')"
    :title="t(notify ? 'notify' : 'createAlert')"
    aria-haspopup="dialog"
    data-testid="rental-alert-trigger"
    :data-cta="cta"
    @click="start"
  >
    <VIcon v-if="compact" icon="mdi-bell-plus-outline" />
    <template v-else>{{ t(notify ? 'notify' : 'createAlert') }}</template>
  </VBtn>
  <VSnackbar v-model="failed" timeout="6000">{{ t('unsupportedFilter') }}</VSnackbar>
</template>
<script setup lang="ts">
import { rentalAlertButtonMessages } from '~/utils/rentalAlertButtonMessages'
import type { RentalAlertKind } from '~/utils/rentalAlerts'
const props = defineProps<{
  kind: RentalAlertKind
  filters: Record<string, unknown>
  compact?: boolean
  notify?: boolean
}>()
const { t } = useI18n({ useScope: 'local', messages: rentalAlertButtonMessages })
const alerts = useRentalAlerts()
const id = useId()
const failed = ref(false)
// GA4 `cta_click` and Clarity: rental-alert-open, car-alert-open, moto-alert-open, sale-alert-open…
const cta = computed(() => `${props.kind.replace(/-search$/, '')}-alert-open`)
function start() {
  alerts.begin(props.kind, props.filters).catch(() => {
    failed.value = true
  })
}
</script>
<style scoped>
.rental-alert-trigger {
  min-width: 44px !important;
  min-height: 44px !important;
  flex-shrink: 0;
}
</style>
