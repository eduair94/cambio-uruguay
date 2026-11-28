<template>
  <div v-if="kind && !privatePage" class="reader-followup">
    <div class="reader-followup-share">
      <div>
        <h2>{{ t('readerFollowUp.shareTitle') }}</h2>
        <p>{{ t('readerFollowUp.shareLead') }}</p>
      </div>
      <ShareButtons label variant="outlined" color="primary" placement="content_end" />
    </div>
    <!-- Experimento A/B `seguimiento` (utils/abTests.ts): en el brazo `b`, donde la página tiene
         tema (una alerta de avisos declarada por la página, o el aviso de jubilaciones), esa
         invitación en vez del newsletter del dólar. Todo esto es del navegador (ClientOnly), así
         que elegir después de montar no mueve nada que ya estuviera pintado. -->
    <ClientOnly v-if="kind === 'newsletter'">
      <template v-if="mounted">
        <TopicFollowUp
          v-if="topicChoice"
          :alert="topicChoice.alert"
          :topic="topicChoice.topic"
        />
        <NewsletterCapture v-else />
      </template>
    </ClientOnly>
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
import { followUpTopicForPath } from '~/utils/followUpTopic'
import { abAssignments } from '~/utils/abTests'

const route = useRoute()
const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()
const configured = Boolean(useRuntimeConfig().public.firebase?.apiKey)
const kind = computed(() => followUpForPath(route.path))
const mounted = ref(false)
const segArm = ref<'a' | 'b' | null>(null)
onMounted(() => {
  segArm.value = abAssignments().seguimiento ?? null
  mounted.value = true
})
const followUpAlert = useFollowUpAlert()
/**
 * Qué invitación por tema le toca a esta página en el brazo `b` (null = la de siempre). En la guía
 * del aumento de jubilaciones, quien está en el brazo `b` de `jubilaciones` ya tiene el mismo aviso
 * arriba: no se repite abajo.
 */
const topicChoice = computed(() => {
  if (segArm.value !== 'b') return null
  if (followUpAlert.value) return { alert: followUpAlert.value, topic: null }
  const topic = followUpTopicForPath(route.path)
  if (!topic) return null
  if (
    route.path.endsWith('/guias/aumento-de-jubilaciones-uruguay') &&
    abAssignments().jubilaciones === 'b'
  )
    return null
  return { alert: null, topic }
})
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
