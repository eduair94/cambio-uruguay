<template>
  <VCard variant="outlined" class="pa-4 mb-4">
    <div class="d-flex align-center ga-2 mb-2">
      <VIcon color="teal">mdi-email-newsletter</VIcon>
      <span class="text-subtitle-2 font-weight-bold">{{ $t('newsletterPanel.title') }}</span>
    </div>
    <VSwitch
      v-model="email"
      :label="$t('newsletterPanel.email')"
      color="teal"
      :hide-details="!unverified"
      :messages="unverified ? $t('newsletterPanel.verifyEmail') : ''"
      :loading="busy"
      @update:model-value="save('email', $event)"
    />
    <div v-if="unverified" class="mb-2">
      <VBtn
        size="small"
        variant="text"
        color="link"
        :loading="sending"
        :disabled="sent"
        @click="sendVerification"
      >
        {{ $t('newsletterPanel.sendVerification') }}
      </VBtn>
      <p v-if="sent" class="text-caption mb-0" role="status">
        {{ $t('newsletterPanel.verificationSent') }}
      </p>
    </div>
    <VSwitch
      v-model="telegram"
      :label="$t('newsletterPanel.telegram')"
      color="info"
      hide-details
      :disabled="!telegramLinked"
      :messages="telegramLinked ? '' : $t('newsletterPanel.telegramHint')"
      :loading="busy"
      @update:model-value="save('telegram', $event)"
    />
  </VCard>
</template>

<script setup lang="ts">
const { authFetch } = useAuthFetch()
const auth = useAuthStore()
const email = ref(false)
const telegram = ref(false)
const telegramLinked = ref(false)
const busy = ref(false)
// The server subscribes an account's address only once Firebase has verified it (409).
const unverified = ref(false)
const sending = ref(false)
const sent = ref(false)

/** Firebase sends the verification mail; turning the switch on again re-reads the account. */
async function sendVerification() {
  sending.value = true
  try {
    sent.value = await auth.verifyEmail()
  } finally {
    sending.value = false
  }
}

type Prefs = { email: boolean; telegram: boolean; telegramLinked: boolean }

function apply(r: Prefs) {
  email.value = r.email
  telegram.value = r.telegram
  telegramLinked.value = r.telegramLinked
}

async function refresh() {
  const r = await authFetch<Prefs>('/api/me/newsletter').catch(() => ({
    email: false,
    telegram: false,
    telegramLinked: false,
  }))
  apply(r)
}

async function save(field: 'email' | 'telegram', value: boolean | null) {
  busy.value = true
  try {
    // A just-verified address only counts with a fresh ID token (the cached one is up to 1 h old).
    if (field === 'email' && value) await auth.refreshUser().catch(() => {})
    apply(
      await authFetch<Prefs>('/api/me/newsletter', {
        method: 'PUT',
        body: { [field]: Boolean(value) },
      })
    )
    if (field === 'email') unverified.value = false
  } catch (error) {
    const failure = error as {
      statusCode?: number
      statusMessage?: string
      data?: { statusMessage?: string }
    }
    unverified.value =
      field === 'email' &&
      failure?.statusCode === 409 &&
      (failure.statusMessage || failure.data?.statusMessage) === 'email-not-verified'
    // Revert the optimistic toggle on error (e.g. 409 telegram-not-linked).
    await refresh()
  } finally {
    busy.value = false
  }
}

onMounted(refresh)
</script>
