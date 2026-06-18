<template>
  <VDialog v-model="open" max-width="440">
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <span>{{ $t('auth.login') }}</span>
        <VBtn icon variant="text" size="small" @click="store.closeDialog()">
          <VIcon>mdi-close</VIcon>
        </VBtn>
      </VCardTitle>

      <VCardText>
        <VBtn
          block
          color="primary"
          class="mb-4"
          prepend-icon="mdi-google"
          @click="store.signInWithGoogle()"
        >
          {{ $t('auth.continueGoogle') }}
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
            <div class="d-flex ga-2">
              <VBtn color="primary" variant="flat" @click="store.signInWithEmail(email, password)">
                {{ $t('auth.signIn') }}
              </VBtn>
              <VBtn color="primary" variant="tonal" @click="store.register(email, password)">
                {{ $t('auth.register') }}
              </VBtn>
            </div>
            <VBtn variant="text" size="small" class="mt-2 px-0" @click="store.resetPassword(email)">
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
            <VBtn color="primary" variant="flat" @click="store.sendMagicLink(email)">
              {{ $t('auth.sendMagicLink') }}
            </VBtn>
          </VTabsWindowItem>
        </VTabsWindow>

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
          {{ $t('auth.error') }} ({{ store.error }})
        </VAlert>

        <VDivider class="my-4" />
        <VBtn
          block
          variant="text"
          size="small"
          prepend-icon="mdi-incognito"
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
const tab = ref('password')
const email = ref('')
const password = ref('')

const open = computed({
  get: () => store.dialogOpen,
  set: v => (v ? store.openDialog() : store.closeDialog()),
})
</script>
