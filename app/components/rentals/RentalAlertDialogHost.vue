<template>
  <RentalAlertDialog v-if="needed" />
</template>

<script setup lang="ts">
// The alert dialog (its form, the push-support check and, through it, firebase/messaging) is a
// chunk of its own, fetched the first time a visitor opens it. The directories that offer
// alerts render this host instead, so a search page no longer ships the whole dialog to every
// visitor who never asks for an alert. Once opened it stays mounted: its watchers carry the
// "sign in, then come back to the alert" flow.
const RentalAlertDialog = defineAsyncComponent(() => import('./RentalAlertDialog.vue'))
const alerts = useRentalAlerts()
const needed = ref(false)
watch(
  alerts.open,
  open => {
    if (open) needed.value = true
  },
  { immediate: true }
)
// Restores a draft left before a sign-in round trip, as the dialog itself does on mount.
onMounted(() => alerts.recover())
</script>
