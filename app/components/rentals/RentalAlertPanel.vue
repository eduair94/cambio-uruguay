<template>
  <section class="rental-alert-panel" :aria-labelledby="headingId">
    <header>
      <h2 :id="headingId">{{ t('alertTitle') }}</h2>
      <span v-if="!alerts.pending.value && !alerts.loadError.value && auth.user"
        >{{ alerts.items.value.length }} / {{ alerts.limit.value }}</span
      >
    </header>
    <p class="rental-alert-panel__hint">{{ t('frequencyHint') }}</p>
    <VProgressLinear
      v-if="alerts.pending.value"
      indeterminate
      color="primary"
      :aria-label="t('loading')"
      class="my-4"
    />
    <VAlert
      v-if="!auth.user || alerts.capabilities.value?.accountEligible === false"
      variant="tonal"
      type="info"
      class="mt-4"
    >
      {{ t(auth.user ? 'accountRequired' : 'loginTitle')
      }}<VBtn variant="text" @click="auth.openDialog()">{{ t('login') }}</VBtn>
    </VAlert>
    <template v-else-if="alerts.loadError.value">
      <VAlert type="warning" variant="tonal" class="mt-4">
        <p>{{ t('loadError') }}</p>
        <VBtn variant="text" @click="alerts.refresh()">{{ t('retry') }}</VBtn>
      </VAlert>
    </template>
    <p v-else-if="!alerts.pending.value && !alerts.items.value.length" class="mt-4">
      {{ t('empty') }}
    </p>
    <div v-if="!alerts.loadError.value" class="rental-alert-panel__list">
      <article
        v-for="item in alerts.items.value"
        :key="item.id"
        class="rental-alert-panel__item"
        :aria-busy="busy === item.id"
      >
        <div class="rental-alert-panel__item-heading">
          <h3>
            {{ item.name || t(item.kind === 'rental-search' ? 'searchAlert' : 'opportunityAlert') }}
          </h3>
          <span :class="{ 'rental-alert-panel__active': item.active }">{{
            t(item.active ? 'active' : 'paused')
          }}</span>
        </div>
        <p>
          {{
            [
              item.channels.push ? t('push') : '',
              item.channels.email ? t('email') : '',
              t(item.frequency),
            ]
              .filter(Boolean)
              .join(' · ')
          }}
        </p>
        <details>
          <summary>{{ t('summary') }}</summary>
          <RentalAlertSummary :kind="item.kind" :filters="item.filters" />
        </details>
        <p class="rental-alert-panel__hint">
          {{
            item.lastNotifiedAt
              ? t('lastNotified', { date: date(item.lastNotifiedAt) })
              : t('notNotified')
          }}
        </p>
        <div class="rental-alert-panel__actions">
          <VBtn :to="item.searchUrl" variant="text" prepend-icon="mdi-magnify">{{
            t('openSearch')
          }}</VBtn>
          <VBtn
            :id="`rental-alert-edit-${item.id}`"
            variant="text"
            prepend-icon="mdi-pencil-outline"
            @click="alerts.edit(item)"
            >{{ t('edit') }}</VBtn
          >
          <VBtn
            :id="`rental-alert-toggle-${item.id}`"
            variant="outlined"
            :prepend-icon="item.active ? 'mdi-pause' : 'mdi-play'"
            :loading="busy === item.id"
            :disabled="!!busy"
            @click="toggle(item)"
            >{{ t(item.active ? 'pause' : 'resume') }}</VBtn
          >
          <VBtn
            variant="text"
            icon="mdi-delete-outline"
            :aria-label="`${t('removeAlert')}: ${item.name || t(item.kind === 'rental-search' ? 'searchAlert' : 'opportunityAlert')}`"
            :disabled="!!busy"
            @click="removing = item"
          />
        </div>
      </article>
    </div>
    <VAlert v-if="error" type="error" variant="tonal" role="alert" class="mt-4">{{
      t(error)
    }}</VAlert>
    <nav class="rental-alert-panel__actions">
      <VBtn :to="localePath('/alquileres-uruguay')" variant="tonal">{{ t('findRentals') }}</VBtn
      ><VBtn
        :to="localePath('/oportunidades-inmobiliarias-uruguay?operation=rent')"
        variant="text"
        >{{ t('findOpportunities') }}</VBtn
      >
    </nav>
    <VDialog
      :model-value="!!removing"
      max-width="440"
      :aria-labelledby="`${headingId}-delete`"
      @update:model-value="
        value => {
          if (!value && !busy) removing = null
        }
      "
    >
      <VCard class="pa-5"
        ><h2 :id="`${headingId}-delete`" class="text-h6">{{ t('removeQuestion') }}</h2>
        <p class="mt-3">{{ t('removeHint') }}</p>
        <div class="rental-alert-panel__actions">
          <VBtn variant="text" :disabled="!!busy" @click="removing = null">{{ t('cancel') }}</VBtn
          ><VBtn color="error" :loading="!!busy" @click="remove">{{ t('removeAlert') }}</VBtn>
        </div></VCard
      >
    </VDialog>
  </section>
</template>
<script setup lang="ts">
import { rentalAlertMessages } from '~/utils/rentalAlertMessages'
import RentalAlertSummary from './RentalAlertSummary.vue'
import { rentalAlertErrorCode } from '~/composables/useRentalAlerts'
import type { RentalAlertSubscription } from '~/utils/rentalAlerts'
const alerts = useRentalAlerts()
const auth = useAuthStore()
const { t, locale } = useI18n({ useScope: 'local', messages: rentalAlertMessages })
const localePath = useLocalePath()
const headingId = useId()
const busy = ref('')
const error = ref('')
const removing = ref<RentalAlertSubscription | null>(null)
const date = (value: string) =>
  new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Montevideo',
  }).format(new Date(value))
function showError(cause: unknown) {
  const code = rentalAlertErrorCode(cause)
  error.value =
    code === 'email_unverified'
      ? 'emailUnverified'
      : code === 'push_not_registered'
        ? 'pushError'
        : code === 'auth_required'
          ? 'loginTitle'
          : 'saveError'
}
async function toggle(item: RentalAlertSubscription) {
  if (!item.active && !item.channels.email && !item.channels.push) {
    alerts.edit(item, true)
    return
  }
  busy.value = item.id
  error.value = ''
  try {
    await alerts.setActive(item, !item.active)
  } catch (cause) {
    showError(cause)
  } finally {
    busy.value = ''
  }
}
async function remove() {
  if (!removing.value || busy.value) return
  busy.value = removing.value.id
  error.value = ''
  try {
    await alerts.remove(removing.value)
    removing.value = null
  } catch (cause) {
    showError(cause)
    removing.value = null
  } finally {
    busy.value = ''
  }
}
onMounted(() => {
  if (auth.user) void alerts.refresh()
})
watch(
  () => auth.user?.uid,
  uid => {
    if (uid) void alerts.refresh()
  }
)
</script>
<style scoped>
.rental-alert-panel {
  margin-bottom: 36px;
  padding-bottom: 28px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.18);
}
.rental-alert-panel header,
.rental-alert-panel__item-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.rental-alert-panel h2 {
  font-size: 1.2rem;
  margin: 0;
}
.rental-alert-panel h3 {
  font-size: 1rem;
  margin: 0;
  overflow-wrap: anywhere;
}
.rental-alert-panel__hint {
  font-size: 0.85rem;
  line-height: 1.6;
  color: rgba(var(--v-theme-on-surface), 0.78);
  margin: 10px 0 0;
}
.rental-alert-panel__list {
  display: grid;
  gap: 16px;
  margin-top: 20px;
}
.rental-alert-panel__item {
  padding: 20px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.18);
  border-radius: 12px;
  min-width: 0;
}
.rental-alert-panel__item > p {
  margin: 12px 0 0;
  overflow-wrap: anywhere;
}
.rental-alert-panel__active {
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
}
.rental-alert-panel details {
  margin-top: 16px;
}
.rental-alert-panel summary {
  cursor: pointer;
  min-height: 44px;
  padding-block: 10px;
}
.rental-alert-panel__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}
.rental-alert-panel :deep(.v-btn) {
  min-height: 44px;
  max-width: 100%;
}
.rental-alert-panel :deep(.v-btn__content) {
  white-space: normal;
  text-align: center;
}
.rental-alert-panel summary:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
</style>
