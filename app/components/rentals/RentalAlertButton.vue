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
    @click="start"
  >
    <VIcon v-if="compact" icon="mdi-bell-plus-outline" />
    <template v-else>{{ t(notify ? 'notify' : 'createAlert') }}</template>
  </VBtn>
  <VSnackbar v-model="failed" timeout="6000">{{ t('unsupportedFilter') }}</VSnackbar>
</template>
<script setup lang="ts">
import { rentalAlertMessages } from '~/utils/rentalAlertMessages'
import type { RentalAlertKind } from '~/utils/rentalAlerts'
const props = defineProps<{
  kind: RentalAlertKind
  filters: Record<string, unknown>
  compact?: boolean
  notify?: boolean
}>()
const { t } = useI18n({ useScope: 'local', messages: rentalAlertMessages })
const alerts = useRentalAlerts()
const id = useId()
const failed = ref(false)
function start() {
  try {
    alerts.begin(props.kind, props.filters)
  } catch {
    failed.value = true
  }
}
</script>
<style scoped>
.rental-alert-trigger {
  min-width: 44px !important;
  min-height: 44px !important;
  flex-shrink: 0;
}
</style>
