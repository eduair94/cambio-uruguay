<template>
  <!-- Logged out: a real CTA pill. Icon-only until xl, where the desktop nav +
       search pill finally leave room for the label; icon + label from xl up. -->
  <VBtn
    v-if="!store.isLoggedIn"
    color="primary"
    variant="flat"
    rounded="pill"
    class="login-btn text-none px-3 px-xl-4"
    :aria-label="$t('auth.login')"
    :title="$t('auth.login')"
    @click="store.openDialog()"
  >
    <VIcon size="20">mdi-account-circle</VIcon>
    <span class="d-none d-xl-inline ml-2">{{ $t('auth.login') }}</span>
  </VBtn>

  <VMenu v-else location="bottom end">
    <template #activator="{ props }">
      <VBtn icon v-bind="props" :aria-label="$t('auth.account')">
        <VAvatar size="34" color="primary">
          <VImg v-if="store.user?.photo" :src="store.user.photo" />
          <span v-else>{{ initials }}</span>
        </VAvatar>
      </VBtn>
    </template>
    <VList>
      <VListItem :to="localePath('/cuenta')">
        <template #prepend><VIcon>mdi-view-dashboard</VIcon></template>
        <VListItemTitle>{{ $t('auth.account') }}</VListItemTitle>
      </VListItem>
      <VDivider />
      <VListItem :disabled="loggingOut" @click="logout">
        <template #prepend><VIcon>mdi-logout</VIcon></template>
        <VListItemTitle>{{ $t('auth.logout') }}</VListItemTitle>
      </VListItem>
    </VList>
  </VMenu>
  <VSnackbar v-model="logoutFailed" :timeout="-1" color="error" location="bottom" role="alert">
    {{ logoutCopy.message }}
    <template #actions>
      <VBtn variant="text" :loading="loggingOut" @click="logout">{{ logoutCopy.retry }}</VBtn>
      <VBtn variant="text" @click="logoutFailed = false">{{ logoutCopy.close }}</VBtn>
    </template>
  </VSnackbar>
</template>

<script setup lang="ts">
import { fbAuth, isSignInWithEmailLink, signInWithEmailLink } from '~/stores/firebaseAuthApi'

const store = useAuthStore()
const localePath = useLocalePath()
const { t, locale } = useI18n()
const loggingOut = ref(false)
const logoutFailed = ref(false)
const logoutCopy = computed(() => {
  const messages = {
    es: {
      message:
        'No pudimos desvincular las notificaciones de este dispositivo. Tu sesión sigue abierta. Comprobá la conexión y volvé a intentar.',
      retry: 'Reintentar',
      close: 'Cerrar',
    },
    en: {
      message:
        'We could not disconnect notifications on this device. You are still signed in. Check your connection and try again.',
      retry: 'Try again',
      close: 'Close',
    },
    pt: {
      message:
        'Não foi possível desvincular as notificações deste dispositivo. Sua sessão continua aberta. Verifique a conexão e tente novamente.',
      retry: 'Tentar novamente',
      close: 'Fechar',
    },
  }
  return messages[locale.value === 'en' || locale.value === 'pt' ? locale.value : 'es']
})

async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  logoutFailed.value = false
  try {
    await store.logout()
  } catch {
    logoutFailed.value = true
  } finally {
    loggingOut.value = false
  }
}

const initials = computed(() => {
  const n = store.user?.name || store.user?.email || '?'
  return n.slice(0, 1).toUpperCase()
})

// Complete a magic-link sign-in when the user lands on the emailed URL.
onMounted(async () => {
  try {
    const href = window.location.href
    if (!isSignInWithEmailLink(fbAuth(), href)) return
    let email = window.localStorage.getItem('cu_magic_email')
    if (!email) email = window.prompt(t('auth.email')) || ''
    if (email) {
      await signInWithEmailLink(fbAuth(), email, href)
      window.localStorage.removeItem('cu_magic_email')
    }
  } catch {
    /* ignore – surfaced via the normal sign-in flow */
  }
})
</script>

<style scoped>
.login-btn {
  font-weight: 700;
  letter-spacing: 0.01em;
}
</style>
