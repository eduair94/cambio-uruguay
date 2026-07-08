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
        <VBtn color="primary" :loading="creating" @click="create">{{ $t('alerts.create') }}</VBtn>
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
        <VListItemSubtitle>
          {{
            [a.channels.push ? $t('alerts.push') : '', a.channels.email ? $t('alerts.email') : '']
              .filter(Boolean)
              .join(' · ')
          }}
        </VListItemSubtitle>
        <template #append>
          <VSwitch
            :model-value="a.active"
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
    await load()
  } finally {
    creating.value = false
  }
}

async function toggle(a: any, value: boolean) {
  a.active = value
  await authFetch(`/api/me/alerts/${a._id}`, {
    method: 'PATCH',
    body: { active: value },
  }).catch(() => {})
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
