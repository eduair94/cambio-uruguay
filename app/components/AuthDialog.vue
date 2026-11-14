<template>
  <VDialog v-model="open" max-width="440" scrollable :aria-labelledby="titleId">
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <span :id="titleId">{{ $t('auth.login') }}</span>
        <VBtn
          icon
          variant="text"
          size="small"
          :aria-label="$t('cerrar')"
          @click="store.closeDialog()"
        >
          <VIcon>mdi-close</VIcon>
        </VBtn>
      </VCardTitle>

      <VCardText>
        <p class="auth-benefit">{{ $t('engagementAccount.signInBenefit') }}</p>
        <VBtn
          block
          color="primary"
          class="mb-2"
          prepend-icon="mdi-google"
          :loading="store.googlePending"
          @click="store.signInWithGoogle()"
        >
          {{ $t('auth.continueGoogle') }}
        </VBtn>

        <VBtn
          block
          variant="flat"
          class="mb-4 discord-btn"
          prepend-icon="$discord"
          :disabled="store.googlePending"
          @click="goDiscord"
        >
          {{ $t('auth.continueDiscord') }}
        </VBtn>

        <VTabs v-model="tab" grow class="mb-2">
          <VTab value="password">{{ $t('auth.tabPassword') }}</VTab>
          <VTab value="magic">{{ $t('auth.tabMagic') }}</VTab>
        </VTabs>

        <VTabsWindow v-model="tab">
          <VTabsWindowItem value="password">
            <VTextField
              v-model="email"
              :label="$t('auth.email')"
              type="email"
              variant="outlined"
              density="comfortable"
              class="mt-3"
            />
            <VTextField
              v-model="password"
              :label="$t('auth.password')"
              type="password"
              variant="outlined"
              density="comfortable"
            />
            <div class="auth-password-actions d-flex flex-wrap ga-2">
              <VBtn
                color="primary"
                variant="flat"
                :disabled="store.googlePending"
                @click="store.signInWithEmail(email, password)"
              >
                {{ $t('auth.signIn') }}
              </VBtn>
              <VBtn
                color="primary"
                variant="tonal"
                :disabled="store.googlePending"
                @click="store.register(email, password)"
              >
                {{ $t('auth.register') }}
              </VBtn>
            </div>
            <VBtn
              variant="text"
              size="small"
              class="mt-2 cu-btn-flush"
              :disabled="store.googlePending"
              @click="store.resetPassword(email)"
            >
              {{ $t('auth.forgotPassword') }}
            </VBtn>
          </VTabsWindowItem>

          <VTabsWindowItem value="magic">
            <VTextField
              v-model="email"
              :label="$t('auth.email')"
              type="email"
              variant="outlined"
              density="comfortable"
              class="mt-3"
            />
            <VBtn
              color="primary"
              variant="flat"
              :disabled="store.googlePending"
              @click="store.sendMagicLink(email)"
            >
              {{ $t('auth.sendMagicLink') }}
            </VBtn>
          </VTabsWindowItem>
        </VTabsWindow>

        <p class="auth-choice">{{ $t('engagementAccount.signInChoice') }}</p>

        <VAlert
          v-if="store.notice"
          type="success"
          variant="tonal"
          density="comfortable"
          class="mt-4"
        >
          {{ $t(store.notice) }}
        </VAlert>
        <VAlert v-if="store.error" type="error" variant="tonal" density="comfortable" class="mt-4">
          {{ errorMessage }}
        </VAlert>

        <VDivider class="my-4" />
        <VBtn
          block
          variant="text"
          size="small"
          prepend-icon="mdi-incognito"
          :disabled="store.googlePending"
          @click="store.signInAsGuest()"
        >
          {{ $t('auth.continueGuest') }}
        </VBtn>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<script setup lang="ts">
const store = useAuthStore()
const { t, te } = useI18n()
// The site's own messages are i18n keys (auth.discordUnverified, set by plugins/discordToken);
// Firebase reports codes (auth/wrong-password…), shown after the generic text as before.
const errorMessage = computed(() => {
  const code = store.error
  if (!code) return ''
  return te(code) ? t(code) : `${t('auth.error')} (${code})`
})
const titleId = useId()
const tab = ref('password')
const email = ref('')
const password = ref('')

const open = computed({
  get: () => store.dialogOpen,
  set: v => (v ? store.openDialog() : store.closeDialog()),
})

// Full-page navigation kicks off the server-side Discord OAuth2 flow.
const goDiscord = () => {
  window.location.href = '/api/auth/discord/start'
}
</script>

<style scoped>
.auth-benefit {
  margin: 0 0 20px;
  line-height: 1.6;
}
.auth-choice {
  margin: 20px 0 0;
  font-size: 0.875rem;
  line-height: 1.6;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
.auth-password-actions .v-btn {
  flex: 1 1 auto;
}
.discord-btn {
  background-color: #5865f2;
  color: #fff;
}
</style>
