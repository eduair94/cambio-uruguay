<template>
  <!-- Logged out: a real CTA pill. Icon-only on phones to save the cramped top
       bar; icon + label from the sm breakpoint up. -->
  <VBtn
    v-if="!store.isLoggedIn"
    color="primary"
    variant="flat"
    rounded="pill"
    class="login-btn text-none px-3 px-sm-4"
    :aria-label="$t('auth.login')"
    :title="$t('auth.login')"
    @click="store.openDialog()"
  >
    <VIcon size="20">mdi-account-circle</VIcon>
    <span class="d-none d-sm-inline ml-2">{{ $t('auth.login') }}</span>
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
      <VListItem @click="store.logout()">
        <template #prepend><VIcon>mdi-logout</VIcon></template>
        <VListItemTitle>{{ $t('auth.logout') }}</VListItemTitle>
      </VListItem>
    </VList>
  </VMenu>
</template>

<script setup lang="ts">
import { fbAuth, isSignInWithEmailLink, signInWithEmailLink } from '~/stores/firebaseAuthApi'

const store = useAuthStore()
const localePath = useLocalePath()
const { t } = useI18n()

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
