<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
      <h2 class="text-h6">{{ $t('alerts.title') }}</h2>
      <VBtn
        v-if="deviceLinked"
        class="alerts-device-action"
        variant="text"
        prepend-icon="mdi-bell-off-outline"
        :loading="pushBusy"
        @click="disable"
      >
        {{ $t('engagementAccount.pushDisable') }}
      </VBtn>
      <VBtn
        v-if="
          (!deviceLinked || registrationFailed) &&
          support?.supported &&
          support.permission !== 'denied'
        "
        class="alerts-device-action"
        color="primary"
        variant="tonal"
        prepend-icon="mdi-bell-ring"
        :loading="pushBusy"
        @click="enable"
      >
        {{
          $t(
            support.permission === 'granted' ? 'engagementAccount.pushConnect' : 'alerts.enablePush'
          )
        }}
      </VBtn>
    </div>

    <p class="alerts-intro">{{ $t('engagementAccount.pushIntro') }}</p>
    <p v-if="pushStatus" class="alerts-device-status">{{ pushStatus }}</p>

    <VAlert
      v-if="pushMsg"
      :type="pushType"
      variant="tonal"
      density="comfortable"
      class="mb-4"
      role="status"
    >
      {{ pushMsg }}
    </VAlert>

    <AccountTelegramLink />

    <AccountNewsletterPanel />

    <!-- Create form -->
    <VCard variant="outlined" class="pa-4 mb-4">
      <div class="text-subtitle-2 mb-2">{{ $t('alerts.new') }}</div>
      <VRow dense>
        <VCol cols="6" sm="3">
          <VSelect
            v-model="form.currency"
            :items="currencies"
            :label="$t('alerts.currency')"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="3">
          <VSelect
            v-model="form.kind"
            :items="kindItems"
            item-title="title"
            item-value="value"
            :label="$t('alerts.kind')"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="3">
          <VSelect
            v-model="form.op"
            :items="ops"
            :label="$t('alerts.op')"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="3">
          <VTextField
            v-model.number="form.target"
            type="number"
            :label="$t('alerts.target')"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
      </VRow>
      <div class="d-flex align-center ga-4 mt-2 flex-wrap">
        <VCheckbox v-model="form.push" :label="$t('alerts.push')" density="compact" hide-details />
        <VCheckbox
          v-model="form.email"
          :label="$t('alerts.email')"
          density="compact"
          hide-details
        />
        <VCheckbox
          v-model="form.telegram"
          :label="$t('tg.telegram')"
          density="compact"
          hide-details
        />
        <VSpacer />
        <VBtn
          color="primary"
          :loading="creating"
          :disabled="!form.push && !form.email && !form.telegram"
          @click="create"
          >{{ $t('alerts.create') }}</VBtn
        >
      </div>
    </VCard>

    <!-- List -->
    <!-- A failed read is not "no alerts": saying so would invite creating them again. -->
    <VAlert v-if="loadFailed" type="warning" variant="tonal" class="mb-2" role="status">{{
      $t('alerts.loadFailed')
    }}</VAlert>
    <VAlert v-if="!alerts.length && !loadFailed" type="info" variant="tonal">{{
      $t('alerts.empty')
    }}</VAlert>
    <VList v-if="alerts.length">
      <VListItem v-for="a in alerts" :key="a._id" class="px-0">
        <template #prepend>
          <VIcon :color="a.active ? 'primary' : 'grey'">mdi-bell</VIcon>
        </template>
        <VListItemTitle>
          {{ a.currency }} ·
          {{ a.kind === 'bestBuy' ? $t('alerts.bestBuy') : $t('alerts.bestSell') }}
          {{ a.op }} {{ a.target }}
        </VListItemTitle>
        <VListItemSubtitle v-if="hasChannel(a)">
          {{
            [
              a.channels.push ? $t('alerts.push') : '',
              a.channels.email ? $t('alerts.email') : '',
              a.channels.telegram ? $t('tg.telegram') : '',
            ]
              .filter(Boolean)
              .join(' · ')
          }}
        </VListItemSubtitle>
        <!-- The email unsubscribe link can leave an alert with no channel: say so, offer email back. -->
        <VListItemSubtitle v-else class="d-flex align-center flex-wrap ga-1">
          {{ $t('alerts.noChannel') }}
          <VBtn
            variant="text"
            size="small"
            color="link"
            class="px-1"
            :loading="restoring === a._id"
            @click="emailAgain(a)"
            >{{ $t('alerts.emailAgain') }}</VBtn
          >
        </VListItemSubtitle>
        <template #append>
          <VSwitch
            :model-value="a.active"
            :disabled="!hasChannel(a) && !a.active"
            density="compact"
            hide-details
            color="primary"
            @update:model-value="v => toggle(a, !!v)"
          />
          <VBtn
            icon
            variant="text"
            size="small"
            :aria-label="$t('alerts.delete')"
            @click="remove(a._id)"
          >
            <VIcon>mdi-delete-outline</VIcon>
          </VBtn>
        </template>
      </VListItem>
    </VList>
  </div>
</template>

<script setup lang="ts">
const { authFetch } = useAuthFetch()
const auth = useAuthStore()
const { enablePush, disablePush, getPushSupport } = usePushNotifications()
const { t } = useI18n()
const track = useTrack()

const currencies = ['USD', 'EUR', 'BRL', 'ARS']
const ops = ['<', '>', '<=', '>=']
const kindItems = computed(() => [
  { title: t('alerts.bestBuy'), value: 'bestBuy' },
  { title: t('alerts.bestSell'), value: 'bestSell' },
])

const alerts = ref<any[]>([])
const creating = ref(false)
const pushMsg = ref('')
const pushType = ref<'success' | 'error' | 'info'>('info')
const pushBusy = ref(false)
const support = ref<Awaited<ReturnType<typeof getPushSupport>> | null>(null)
const deviceLinked = ref(false)
const registrationFailed = ref(false)
const pushStatus = computed(() => {
  if (!support.value) return ''
  if (support.value.permission === 'denied') return t('engagementAccount.pushDenied')
  if (!support.value.supported) return t('engagementAccount.pushUnsupported')
  if (support.value.permission === 'granted') return t('engagementAccount.pushReady')
  return ''
})

const form = reactive({
  currency: 'USD',
  kind: 'bestBuy',
  op: '>=' as string,
  target: 41,
  push: true,
  email: true,
  telegram: false,
})

const loadFailed = ref(false)

async function load() {
  // A failed read keeps what is on screen and says so: emptying it would show "no alerts yet" and
  // invite the visitor to create them again (review, 2026-11-08).
  const fresh = await authFetch<any[]>('/api/me/alerts').catch(() => null)
  loadFailed.value = !fresh
  if (fresh) alerts.value = fresh
}

async function create() {
  creating.value = true
  try {
    await authFetch('/api/me/alerts', {
      method: 'POST',
      body: {
        currency: form.currency,
        kind: form.kind,
        op: form.op,
        target: form.target,
        channels: { push: form.push, email: form.email, telegram: form.telegram },
      },
    })
    // A GA4 key event. Emitted only after the POST resolves, so a failed create
    // never counts as a conversion. The payload mirrors the alert itself — it is
    // not per-casa, because an alert watches the best rate across all of them.
    track('alert_created', {
      currency: form.currency,
      kind: form.kind,
      op: form.op,
      target: form.target,
    })
    await load()
  } finally {
    creating.value = false
  }
}

const hasChannel = (a: any) =>
  Boolean(a.channels?.push || a.channels?.email || a.channels?.telegram)

async function toggle(a: any, value: boolean) {
  a.active = value
  try {
    await authFetch(`/api/me/alerts/${a._id}`, { method: 'PATCH', body: { active: value } })
  } catch {
    // Refused (409 no-channel: another tab may have changed it) or failed: show what is stored.
    a.active = !value
    await load()
  }
}

const restoring = ref<string | null>(null)

/** Turns email back on (and the alert with it) after the unsubscribe link left it without a channel. */
async function emailAgain(a: any) {
  restoring.value = a._id
  try {
    const updated = await authFetch<any>(`/api/me/alerts/${a._id}`, {
      method: 'PATCH',
      body: {
        active: true,
        channels: {
          push: Boolean(a.channels?.push),
          email: true,
          telegram: Boolean(a.channels?.telegram),
        },
      },
    })
    if (updated) Object.assign(a, updated)
  } catch {
    // Unchanged: the row keeps offering it.
  } finally {
    restoring.value = null
  }
}

async function remove(id: string) {
  await authFetch(`/api/me/alerts/${id}`, { method: 'DELETE' }).catch(() => {})
  alerts.value = alerts.value.filter(a => a._id !== id)
}

async function enable() {
  if (pushBusy.value) return
  pushBusy.value = true
  pushMsg.value = ''
  try {
    // Keep this call in the click gesture: iOS cannot prompt after a support check.
    const result = await enablePush()
    registrationFailed.value = false
    pushType.value = result === 'granted' ? 'success' : 'info'
    pushMsg.value =
      result === 'granted'
        ? t('alerts.pushGranted')
        : result === 'denied'
          ? t('engagementAccount.pushDenied')
          : t('engagementAccount.pushUnsupported')
  } catch {
    // The local token is retained for revocation even when registration fails.
    // Keep an explicit retry available instead of treating that token as success.
    registrationFailed.value = true
    pushType.value = 'error'
    pushMsg.value = t('engagementAccount.pushError')
  } finally {
    await checkPush()
    pushBusy.value = false
  }
}

async function disable() {
  if (pushBusy.value) return
  pushBusy.value = true
  pushMsg.value = ''
  try {
    if (!(await disablePush())) throw new Error('push/revocation-failed')
    pushType.value = 'success'
    pushMsg.value = t('engagementAccount.pushDisabled')
  } catch {
    pushType.value = 'error'
    pushMsg.value = t('engagementAccount.pushError')
  } finally {
    await checkPush()
    pushBusy.value = false
  }
}

async function checkPush() {
  support.value = await getPushSupport().catch(() => null)
  // On demand, like stores/auth.ts: a static import would put the Firebase messaging SDK on the
  // page-load path (tests/unit/firebaseOffEntry.test.ts).
  const { readPushDevice } = await import('~/services/firebaseMessagingApi')
  deviceLinked.value = readPushDevice()?.uid === auth.user?.uid && Boolean(auth.user)
}

onMounted(() => {
  void load()
  void checkPush()
  window.addEventListener('focus', checkPush)
})
onBeforeUnmount(() => window.removeEventListener('focus', checkPush))
watch(() => auth.user?.uid, checkPush)
</script>

<style scoped>
.alerts-intro,
.alerts-device-status {
  margin: 0 0 16px;
  line-height: 1.6;
  max-width: 70ch;
}
.alerts-device-status {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
.alerts-device-action {
  max-width: 100%;
  min-height: 44px;
  height: auto;
  padding-block: 10px;
}
.alerts-device-action :deep(.v-btn__content) {
  white-space: normal;
  text-align: center;
}
</style>
