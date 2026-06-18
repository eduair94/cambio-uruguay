<template>
  <ClientOnly>
    <VBtn
      v-if="!store.isLoggedIn"
      color="primary"
      variant="text"
      class="text-capitalize"
      @click="store.openDialog()"
    >
      <VIcon start>mdi-account-circle</VIcon>
      {{ $t('auth.login') }}
    </VBtn>

    <VMenu v-else location="bottom end">
      <template #activator="{ props }">
        <VBtn icon v-bind="props">
          <VAvatar size="32" color="primary">
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
  </ClientOnly>
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
