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
      hide-details
      :loading="busy"
      @update:model-value="save('email', $event)"
    />
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
const email = ref(false)
const telegram = ref(false)
const telegramLinked = ref(false)
const busy = ref(false)

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
    apply(
      await authFetch<Prefs>('/api/me/newsletter', {
        method: 'PUT',
        body: { [field]: Boolean(value) },
      })
    )
  } catch {
    // Revert the optimistic toggle on error (e.g. 409 telegram-not-linked).
    await refresh()
  } finally {
    busy.value = false
  }
}

onMounted(refresh)
</script>
