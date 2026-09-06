<template>
  <VDialog
    v-model="isOpen"
    max-width="560"
    scrollable
    :aria-labelledby="headingId"
    @after-enter="heading?.focus({ preventScroll: true })"
    @after-leave="restoreFocus"
  >
    <VCard class="rental-alert-dialog">
      <header class="rental-alert-dialog__header">
        <h2 :id="headingId" ref="heading" tabindex="-1">
          {{ t(draft?.kind === 'rental-opportunity' ? 'opportunityAlert' : 'searchAlert') }}
        </h2>
        <VBtn
          icon="mdi-close"
          variant="text"
          :aria-label="t('close')"
          :disabled="saving"
          @click="isOpen = false"
        />
      </header>
      <div v-if="success" class="rental-alert-dialog__body">
        <VAlert type="success" variant="tonal" role="status">{{ t(success) }}</VAlert>
        <VBtn
          :to="localePath('/cuenta?tab=alerts')"
          variant="text"
          class="mt-4"
          @click="isOpen = false"
          >{{ t('manage') }}</VBtn
        >
      </div>
      <form
        v-else-if="draft"
        id="rental-alert-form"
        class="rental-alert-dialog__body"
        @submit.prevent="submit"
      >
        <VAlert
          v-if="!auth.user || (capabilities && !capabilities.accountEligible)"
          type="info"
          variant="tonal"
          class="mb-5"
        >
          <p class="rental-alert-dialog__notice-title">
            {{ t(!auth.user ? 'loginTitle' : 'accountRequired') }}
          </p>
          <p>{{ t('loginHint') }}</p>
          <VBtn color="primary" class="mt-3" @click="alerts.signIn()">{{ t('login') }}</VBtn>
        </VAlert>
        <section class="rental-alert-dialog__section">
          <h3>{{ t('summary') }}</h3>
          <RentalAlertSummary :kind="draft.kind" :filters="draft.filters" />
          <p class="rental-alert-dialog__hint">{{ t('matchHint') }}</p>
          <p v-if="draft.kind === 'rental-opportunity'" class="rental-alert-dialog__hint">
            {{ t('opportunitiesHint') }}
          </p>
        </section>
        <p v-if="alerts.pending.value" role="status" class="rental-alert-dialog__hint">
          {{ t('loading') }}
        </p>
        <VAlert v-if="alerts.loadError.value" type="warning" variant="tonal" class="mt-4">
          {{ t('loadError') }}<VBtn variant="text" @click="check()">{{ t('checkAgain') }}</VBtn>
        </VAlert>
        <template v-if="auth.user && capabilities?.accountEligible">
          <fieldset class="rental-alert-dialog__channels">
            <legend>{{ t('channels') }}</legend>
            <p class="rental-alert-dialog__hint">{{ t('independentChannels') }}</p>
            <div class="rental-alert-dialog__channel">
              <VCheckbox
                v-model="draft.channels.email"
                :label="t('email')"
                :disabled="(!emailAllowed && !draft.channels.email) || saving"
                hide-details
                color="primary"
              />
              <p v-if="capabilities.email" class="rental-alert-dialog__hint">
                {{ capabilities.email }}
              </p>
              <p v-if="!capabilities.emailVerified" class="rental-alert-dialog__hint">
                {{ t('emailUnverified') }}
              </p>
              <p v-else-if="!capabilities.emailAvailable" class="rental-alert-dialog__hint">
                {{ t('emailUnavailable') }}
              </p>
              <div
                v-if="capabilities.email && !capabilities.emailVerified"
                class="rental-alert-dialog__actions"
              >
                <VBtn variant="outlined" :loading="verifying" @click="verifyEmail">{{
                  t('verifyEmail')
                }}</VBtn>
                <VBtn variant="text" :loading="checking" @click="check(true)">{{
                  t('checkAgain')
                }}</VBtn>
              </div>
            </div>
            <div class="rental-alert-dialog__channel">
              <VCheckbox
                v-model="draft.channels.push"
                :label="t('push')"
                :disabled="(!pushAllowed && !draft.channels.push) || saving"
                hide-details
                color="primary"
              />
              <p v-if="deviceEnabled" class="rental-alert-dialog__hint" role="status">
                {{ t('pushReady') }}
              </p>
              <p v-else-if="!capabilities.pushAvailable" class="rental-alert-dialog__hint">
                {{ t('pushUnavailable') }}
              </p>
              <template v-else>
                <p v-if="support?.permission === 'denied'" class="rental-alert-dialog__hint">
                  {{ t('pushDenied') }}
                </p>
                <p v-else-if="support && !support.supported" class="rental-alert-dialog__hint">
                  {{ t(needsInstall ? 'pushInstall' : 'pushUnsupported') }}
                </p>
                <div class="rental-alert-dialog__actions">
                  <VBtn
                    v-if="support?.supported && support.permission !== 'denied'"
                    variant="outlined"
                    :loading="enabling"
                    @click="enableDevice"
                    >{{ t('pushEnable') }}</VBtn
                  >
                  <VBtn variant="text" :loading="checking" @click="check()">{{
                    t('checkAgain')
                  }}</VBtn>
                </div>
              </template>
            </div>
          </fieldset>
          <VSelect
            v-model="draft.frequency"
            :items="frequencies"
            :label="t('frequency')"
            variant="outlined"
            density="comfortable"
            hide-details
            class="mt-5"
          />
          <p class="rental-alert-dialog__hint">{{ t('frequencyHint') }}</p>
          <VTextField
            v-model="draft.name"
            :label="t('name')"
            maxlength="80"
            variant="outlined"
            density="comfortable"
            hide-details
            class="mt-5"
          />
          <p v-if="!draft.editingId" class="rental-alert-dialog__hint">{{ t('newOnly') }}</p>
        </template>
        <VAlert v-if="notice" type="info" variant="tonal" class="mt-4" role="status">{{
          t(notice)
        }}</VAlert>
        <VAlert v-if="error" type="error" variant="tonal" class="mt-4" role="alert">{{
          t(error)
        }}</VAlert>
        <p v-if="alerts.storageFailed.value" class="rental-alert-dialog__hint" role="status">
          {{ t('draftStorageError') }}
        </p>
      </form>
      <footer class="rental-alert-dialog__footer">
        <VBtn variant="text" :disabled="saving" @click="isOpen = false">{{
          t(success ? 'close' : 'cancel')
        }}</VBtn>
        <VBtn
          v-if="!success && capabilities?.accountEligible && auth.user"
          type="submit"
          form="rental-alert-form"
          color="primary"
          :loading="saving"
          :disabled="!canSave || checking || enabling"
          >{{ t(draft?.editingId && !draft.activateOnSave ? 'saveChannels' : 'activate') }}</VBtn
        >
      </footer>
    </VCard>
  </VDialog>
</template>

<script setup lang="ts">
import { rentalAlertMessages } from '~/utils/rentalAlertMessages'
import RentalAlertSummary from './RentalAlertSummary.vue'
import { rentalAlertErrorCode } from '~/composables/useRentalAlerts'
const alerts = useRentalAlerts()
const auth = useAuthStore()
const { enablePush, getPushSupport } = usePushNotifications()
const { t } = useI18n({ useScope: 'local', messages: rentalAlertMessages })
const localePath = useLocalePath()
const headingId = useId()
const heading = ref<HTMLElement | null>(null)
const isOpen = alerts.open
const draft = alerts.draft
const capabilities = alerts.capabilities
const support = ref<Awaited<ReturnType<typeof getPushSupport>> | null>(null)
const saving = ref(false)
const enabling = ref(false)
const verifying = ref(false)
const checking = ref(false)
const deviceEnabled = ref(false)
const needsInstall = ref(false)
const error = ref('')
const notice = ref('')
const success = ref('')
const emailReady = computed(() =>
  Boolean(
    capabilities.value?.emailAvailable &&
      capabilities.value.emailVerified &&
      capabilities.value.email
  )
)
const pushReady = computed(() =>
  Boolean(capabilities.value?.pushAvailable && capabilities.value.pushRegistered)
)
const previous = computed(() =>
  draft.value?.editingId && !draft.value.activateOnSave
    ? alerts.items.value.find(item => item.id === draft.value?.editingId)
    : undefined
)
// Keeping or removing existing consent remains possible during a channel outage.
// New channels and reactivation still require their current capability checks.
const emailAllowed = computed(() => emailReady.value || previous.value?.channels.email === true)
const pushAllowed = computed(() => pushReady.value || previous.value?.channels.push === true)
const canSave = computed(() =>
  Boolean(
    draft.value &&
      capabilities.value?.accountEligible &&
      (draft.value.channels.email || draft.value.channels.push) &&
      (!draft.value.channels.email || emailAllowed.value) &&
      (!draft.value.channels.push || pushAllowed.value)
  )
)
const frequencies = computed(() => [
  { title: t('hourly'), value: 'hourly' },
  { title: t('daily'), value: 'daily' },
])
const errorMessage: Record<string, string> = {
  auth_required: 'loginTitle',
  account_required: 'accountRequired',
  email_unverified: 'emailUnverified',
  email_unavailable: 'emailUnavailable',
  push_unavailable: 'pushUnavailable',
  push_not_registered: 'pushError',
  unsupported_filter: 'unsupportedFilter',
  limit_reached: 'limitReached',
  invalid_alert: 'saveError',
  temporarily_unavailable: 'saveError',
  too_many_requests: 'retryLater',
}
async function check(refreshUser = false) {
  if (checking.value) return
  checking.value = true
  try {
    needsInstall.value =
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
      !window.matchMedia('(display-mode: standalone)').matches
    if (refreshUser) await auth.refreshUser()
    const [, currentSupport] = await Promise.all([alerts.refresh(), getPushSupport()])
    support.value = currentSupport
    if (refreshUser && capabilities.value?.emailVerified) notice.value = ''
  } catch {
    error.value = 'loadError'
  } finally {
    checking.value = false
  }
}
async function enableDevice() {
  enabling.value = true
  error.value = ''
  notice.value = ''
  try {
    const result = await enablePush()
    deviceEnabled.value = result === 'granted'
    if (result !== 'granted')
      error.value =
        result === 'denied' ? 'pushDenied' : needsInstall.value ? 'pushInstall' : 'pushUnsupported'
    await check()
  } catch {
    error.value = 'pushError'
  } finally {
    enabling.value = false
  }
}
async function verifyEmail() {
  verifying.value = true
  error.value = ''
  notice.value = ''
  try {
    if (await auth.verifyEmail()) notice.value = 'verificationSent'
    else error.value = 'verificationError'
  } catch {
    error.value = 'verificationError'
  } finally {
    verifying.value = false
  }
}
async function submit() {
  if (saving.value) return
  if (!canSave.value) {
    error.value = 'selectChannel'
    return
  }
  saving.value = true
  error.value = ''
  notice.value = ''
  try {
    const editing = Boolean(draft.value?.editingId)
    const result = await alerts.save()
    success.value =
      'alreadyExists' in result && result.alreadyExists
        ? 'alreadyExists'
        : editing
          ? 'savedChanges'
          : 'created'
  } catch (cause) {
    error.value = errorMessage[rentalAlertErrorCode(cause)] || 'saveError'
  } finally {
    saving.value = false
  }
}
function restoreFocus() {
  if (auth.dialogOpen) return
  if (alerts.returnFocusId.value)
    document.getElementById(alerts.returnFocusId.value)?.focus({ preventScroll: true })
}
watch(isOpen, value => {
  if (value) {
    success.value = ''
    error.value = ''
    notice.value = ''
    deviceEnabled.value = false
    void check()
  } else alerts.persist()
})
watch(draft, () => alerts.persist(), { deep: true })
watch(
  () => auth.dialogOpen,
  value => {
    if (!value && alerts.waitingForLogin.value && draft.value) {
      alerts.waitingForLogin.value = false
      isOpen.value = true
    }
  }
)
onMounted(() => {
  alerts.recover()
  if (isOpen.value) void check()
})
</script>

<style scoped>
.rental-alert-dialog {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 24px);
  border-radius: 14px;
}
.rental-alert-dialog__header,
.rental-alert-dialog__footer {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
}
.rental-alert-dialog__header {
  justify-content: space-between;
}
.rental-alert-dialog__header h2 {
  margin: 0;
  font-size: 1.2rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.rental-alert-dialog__body {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px 20px 20px;
}
.rental-alert-dialog__section h3 {
  font-size: 1rem;
  margin: 0 0 16px;
}
.rental-alert-dialog__hint {
  margin: 10px 0 0;
  font-size: 0.85rem;
  line-height: 1.6;
  color: rgba(var(--v-theme-on-surface), 0.78);
  overflow-wrap: anywhere;
}
.rental-alert-dialog__notice-title {
  margin: 0;
  font-weight: 700;
}
.rental-alert-dialog__channels {
  margin: 24px 0 0;
  padding: 0;
  border: 0;
  min-width: 0;
}
.rental-alert-dialog__channels legend {
  font-weight: 700;
  margin-bottom: 8px;
}
.rental-alert-dialog__channel {
  padding: 10px 0;
}
.rental-alert-dialog__channel + .rental-alert-dialog__channel {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.16);
  margin-top: 10px;
}
.rental-alert-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.rental-alert-dialog__footer {
  justify-content: flex-end;
  flex-wrap: wrap;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.16);
}
.rental-alert-dialog :deep(.v-btn) {
  min-height: 44px;
  white-space: normal;
}
.rental-alert-dialog :deep(.v-btn__content) {
  white-space: normal;
  text-align: center;
}
.rental-alert-dialog :deep(input) {
  font-size: 16px;
}
.rental-alert-dialog :deep(a:focus-visible),
.rental-alert-dialog h2:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
@media (max-width: 359px) {
  .rental-alert-dialog__header,
  .rental-alert-dialog__footer {
    padding-inline: 14px;
  }
  .rental-alert-dialog__body {
    padding-inline: 14px;
  }
}
</style>
