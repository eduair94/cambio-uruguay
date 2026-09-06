<template>
  <VAlert
    v-if="alerts.draft.value && !alerts.open.value"
    variant="tonal"
    type="info"
    class="mb-5 rental-alert-resume"
  >
    <p>{{ t('pendingDraft') }}</p>
    <div>
      <VBtn variant="tonal" @click="alerts.open.value = true">{{ t('reopen') }}</VBtn
      ><VBtn variant="text" @click="alerts.discard()">{{ t('discard') }}</VBtn>
    </div>
  </VAlert>
</template>
<script setup lang="ts">
import { rentalAlertMessages } from '~/utils/rentalAlertMessages'
const alerts = useRentalAlerts()
const { t } = useI18n({ useScope: 'local', messages: rentalAlertMessages })
onMounted(alerts.recover)
</script>
<style scoped>
.rental-alert-resume p {
  margin: 0 0 12px;
}
.rental-alert-resume :deep(.v-alert__content) {
  min-width: 0;
}
.rental-alert-resume div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.rental-alert-resume :deep(.v-btn) {
  min-height: 44px;
}
</style>
