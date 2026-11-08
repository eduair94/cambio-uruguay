<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
      <h2 class="text-h6">{{ $t('alerts.title') }}</h2>
      <VBtn color="primary" variant="tonal" prepend-icon="mdi-bell-ring" @click="enable">
        {{ $t('alerts.enablePush') }}
      </VBtn>
    </div>

    <VAlert v-if="pushMsg" :type="pushType" variant="tonal" density="comfortable" class="mb-4">
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
    <VAlert v-if="!alerts.length" type="info" variant="tonal">{{ $t('alerts.empty') }}</VAlert>
    <VList v-else>
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
const { enablePush } = usePushNotifications()
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

const form = reactive({
  currency: 'USD',
  kind: 'bestBuy',
  op: '>=' as string,
  target: 41,
  push: true,
  email: true,
  telegram: false,
})

async function load() {
  alerts.value = await authFetch<any[]>('/api/me/alerts').catch(() => [])
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
  const r = await enablePush()
  pushType.value = r === 'granted' ? 'success' : r === 'denied' ? 'error' : 'info'
  pushMsg.value =
    r === 'granted'
      ? t('alerts.pushGranted')
      : r === 'denied'
        ? t('alerts.pushDenied')
        : t('alerts.pushUnsupported')
}

onMounted(load)
</script>
