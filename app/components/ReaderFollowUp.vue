<template>
  <div v-if="kind && !privatePage" class="reader-followup">
    <div class="reader-followup-share">
      <div>
        <h2>{{ t('readerFollowUp.shareTitle') }}</h2>
        <p>{{ t('readerFollowUp.shareLead') }}</p>
      </div>
      <ShareButtons label variant="outlined" color="primary" placement="content_end" />
    </div>
    <NewsletterCapture v-if="kind === 'newsletter'" />
    <ClientOnly v-else>
      <section
        v-if="allowed && auth.ready && configured && !completed && !checkingAlerts"
        ref="element"
        class="reader-followup-account"
        aria-labelledby="reader-followup-title"
        data-testid="account-invitation"
      >
        <h2 id="reader-followup-title">{{ t('readerFollowUp.accountTitle') }}</h2>
        <p>{{ t('readerFollowUp.accountLead') }}</p>
        <div class="reader-followup-actions">
          <VBtn v-if="!auth.isLoggedIn" color="primary" prepend-icon="mdi-google" @click="login">
            {{ t('readerFollowUp.google') }}
          </VBtn>
          <VBtn
            v-else
            :to="localePath({ path: '/cuenta', query: { tab: 'alerts' } })"
            color="primary"
            prepend-icon="mdi-bell-outline"
            @click="engage('configure_alerts')"
          >
            {{ t('readerFollowUp.alerts') }}
          </VBtn>
          <VBtn variant="text" @click="dismiss">{{ t('readerFollowUp.dismiss') }}</VBtn>
        </div>
        <p class="reader-followup-control">{{ t('readerFollowUp.control') }}</p>
      </section>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { followUpForPath } from '~/utils/engagement'

const route = useRoute()
const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()
const configured = Boolean(useRuntimeConfig().public.firebase?.apiKey)
const kind = computed(() => followUpForPath(route.path))
const privatePage = computed(() => {
  const guards = [route.meta.middleware].flat()
  return guards.includes('auth')
})
const { allowed, element, dismiss, engage } = useEngagementPrompt('account')
const completed = ref(false)
const checkingAlerts = ref(false)
const { authFetch } = useAuthFetch()
watch(
  [() => auth.user?.uid, kind],
  async ([uid, currentKind]) => {
    if (!uid || currentKind !== 'account') {
      checkingAlerts.value = false
      return
    }
    checkingAlerts.value = true
    try {
      const alerts = await authFetch<unknown[]>('/api/me/alerts')
      if (auth.user?.uid === uid) completed.value ||= alerts.length > 0
    } catch {
      if (auth.user?.uid === uid) completed.value = true
    } finally {
      if (auth.user?.uid === uid) checkingAlerts.value = false
    }
  },
  { immediate: true }
)
let loginRequested = false
function login() {
  engage('google_signin')
  loginRequested = true
  auth.openDialog()
}
watch(
  () => auth.isLoggedIn,
  value => {
    // Do not replace a successful login with a second promotional ask.
    if (value && loginRequested) completed.value = true
  }
)
</script>

<style scoped>
.reader-followup {
  margin-top: 32px;
}
.reader-followup-share {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  padding-block: 24px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
.reader-followup h2 {
  font-size: 1rem;
  line-height: 1.5;
  margin: 0;
}
.reader-followup p {
  margin: 8px 0 0;
  max-width: 65ch;
  font-size: 0.95rem;
  line-height: 1.5;
}
.reader-followup-account {
  padding: 24px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.reader-followup-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
}
.reader-followup .reader-followup-control {
  margin-top: 16px;
  font-size: 0.875rem;
}
@media (max-width: 599px) {
  .reader-followup-account {
    padding: 16px;
  }
}
</style>
