<!--
THESIS: A source-backed business phone directory for a private working session.
OWN-WORLD: Inherit Cambio Uruguay's Open Sans, blue actions and light/dark surfaces.
STORY: Find the company, check the source and copy or open its business phone.
FIRST VIEWPORT: Compact heading, scope, filters, then rows with identity left and phone right.
FORM: Extension of the existing agency directory; no new visual identity or decorative assets.
-->
<template>
  <VContainer class="commercial-contacts">
    <header>
      <p class="text-overline mb-1">{{ t('private') }}</p>
      <h1 class="text-h4">{{ t('title') }}</h1>
      <p class="contacts-intro">{{ t('intro') }}</p>
    </header>

    <section aria-live="polite" :aria-busy="pending">
      <p v-if="pending">{{ t('loading') }}</p>
      <VAlert v-else-if="access === 'login'" type="info" variant="tonal">
        <p>{{ t('login') }}</p>
        <VBtn color="primary" @click="auth.openDialog()">{{ t('signIn') }}</VBtn>
      </VAlert>
      <VAlert v-else-if="access === 'forbidden'" type="warning" variant="tonal">
        {{ t('forbidden') }}
      </VAlert>
      <VAlert v-else-if="access === 'error'" type="error" variant="tonal">
        <p>{{ t('unavailable') }}</p>
        <VBtn variant="outlined" @click="loadContacts">{{ t('retry') }}</VBtn>
      </VAlert>
      <template v-else>
        <p class="contacts-scope">{{ t('scope') }}</p>
        <form class="contacts-filters" role="search" @submit.prevent>
          <VTextField
            v-model="query"
            :label="t('search')"
            type="search"
            variant="outlined"
            hide-details
            clearable
          />
          <VSelect
            v-model="sector"
            :label="t('sector')"
            :items="sectors"
            variant="outlined"
            hide-details
          />
          <VSelect
            v-model="platform"
            :label="t('platform')"
            :items="platforms"
            variant="outlined"
            hide-details
          />
        </form>
        <p class="contacts-count">{{ filtered.length }} {{ t('count') }}</p>
        <p v-if="!hasFacebook" class="text-body-2 mb-4">{{ t('noFacebook') }}</p>

        <div v-if="!filtered.length" class="contacts-empty">
          <h2 class="text-h6">{{ t(contacts.length ? 'empty' : 'emptyCatalogue') }}</h2>
          <VBtn
            v-if="query || sector || platform"
            variant="outlined"
            class="mt-3"
            @click="clearFilters"
            >{{ t('clear') }}</VBtn
          >
        </div>
        <ul v-else class="contacts-list">
          <li v-for="contact in filtered" :key="contact.id" class="contact-row">
            <div class="contact-identity">
              <p class="text-body-2 text-medium-emphasis">{{ t(contact.sector) }}</p>
              <h2 class="text-h6">{{ contact.name }}</h2>
              <div
                v-for="link in contact.platforms"
                :key="link.kind + link.url"
                class="contact-platform"
              >
                <a :href="link.url" target="_blank" rel="noopener noreferrer">{{ t(link.kind) }}</a>
                <span class="text-body-2">{{ t(link.evidenceKind) }}</span>
                <a
                  v-if="link.evidenceUrl !== link.url"
                  :href="link.evidenceUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-body-2"
                  >{{ t('evidence') }}</a
                >
              </div>
              <p v-if="!contact.platforms.length" class="text-body-2">{{ t('noPlatform') }}</p>
            </div>
            <div class="contact-number">
              <span class="text-body-2 text-medium-emphasis">{{ t('phone') }}</span>
              <a :href="`tel:${contact.phone}`" class="contact-phone">{{
                formatPhone(contact.phone)
              }}</a>
              <VBtn variant="outlined" size="small" min-height="44" @click="copyPhone(contact)">{{
                copied === contact.id ? t('copied') : t('copy')
              }}</VBtn>
              <a
                :href="contact.sourceUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-body-2"
                >{{ t('source') }}</a
              >
              <span class="text-body-2"
                >{{ t('observed') }}
                <time :datetime="contact.observedAt">{{
                  formatDate(contact.observedAt)
                }}</time></span
              >
            </div>
          </li>
        </ul>
        <p class="contacts-feedback" role="status">{{ feedback }}</p>
        <footer class="contacts-notes">
          <p>{{ t('coverage') }}</p>
          <p>{{ t('freshness') }}</p>
        </footer>
      </template>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import type { CommercialContact } from '../utils/commercialContacts'
import { commercialContactMessage } from '../utils/commercialContactMessages'

const { locale } = useI18n()
const t = (key: Parameters<typeof commercialContactMessage>[1]) =>
  commercialContactMessage(locale.value, key)
useHead(() => ({
  title: `${t('title')} — ${t('private')}`,
  meta: [{ name: 'robots', content: 'noindex, nofollow, noarchive' }],
}))
const auth = useAuthStore()
const { authFetch } = useAuthFetch()
const contacts = ref<CommercialContact[]>([])
const pending = ref(true)
const access = ref<'ok' | 'login' | 'forbidden' | 'error'>('login')
const query = ref('')
const sector = ref('')
const platform = ref('')
const copied = ref('')
const feedback = ref('')
const sectors = computed(() => [
  { title: t('all'), value: '' },
  ...(['autos', 'viviendas'] as const).map(value => ({ title: t(value), value })),
])
const platforms = computed(() => [
  { title: t('allPlatforms'), value: '' },
  ...(['mercadolibre', 'facebook'] as const).map(value => ({ title: t(value), value })),
])
const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
const filtered = computed(() =>
  contacts.value.filter(
    contact =>
      (!sector.value || contact.sector === sector.value) &&
      (!platform.value || contact.platforms.some(link => link.kind === platform.value)) &&
      fold(contact.name).includes(fold(query.value || '').trim())
  )
)
const hasFacebook = computed(() =>
  contacts.value.some(contact => contact.platforms.some(link => link.kind === 'facebook'))
)
const formatPhone = (value: string) => value.replace(/^(\+598)(\d{4})(\d{4})$/, '$1 $2 $3')
const formatDate = (value: string) =>
  new Intl.DateTimeFormat(dateLocale(locale.value), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Montevideo',
  }).format(new Date(value))
let request = 0
async function loadContacts() {
  const current = ++request
  contacts.value = []
  pending.value = true
  try {
    const result = await authFetch<{ contacts: CommercialContact[] }>('/api/commercial-contacts')
    if (current !== request) return
    contacts.value = result.contacts
    access.value = 'ok'
  } catch (error: unknown) {
    if (current !== request) return
    const status = (error as { statusCode?: number }).statusCode
    access.value = status === 401 ? 'login' : status === 403 ? 'forbidden' : 'error'
  } finally {
    if (current === request) pending.value = false
  }
}
function clearFilters() {
  query.value = ''
  sector.value = ''
  platform.value = ''
}
async function copyPhone(contact: CommercialContact) {
  try {
    await navigator.clipboard.writeText(contact.phone)
    copied.value = contact.id
    feedback.value = `${contact.name}: ${t('copied')}`
  } catch {
    copied.value = ''
    feedback.value = t('copyFailed')
  }
}
// No contacts in SSR payloads. Clear data immediately when the session changes.
onMounted(() => {
  watch(
    () => [auth.ready, auth.user?.uid] as const,
    ([ready, uid]) => {
      ++request
      contacts.value = []
      feedback.value = ''
      copied.value = ''
      if (!ready) return
      if (uid) void loadContacts()
      else {
        access.value = 'login'
        pending.value = false
      }
    },
    { immediate: true }
  )
})
onBeforeUnmount(() => {
  ++request
})
</script>

<style scoped>
.commercial-contacts {
  max-width: 1100px;
  padding-top: 32px;
  padding-bottom: 48px;
}
.contacts-intro {
  max-width: 70ch;
  margin-top: 12px;
  margin-bottom: 28px;
  line-height: 1.6;
}
.contacts-scope {
  margin: 0 0 20px;
}
.contacts-filters {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 16px;
}
.contacts-count {
  margin: 20px 0 8px;
  font-weight: 600;
}
.contacts-list {
  padding: 0;
  margin: 0;
  list-style: none;
}
.contact-row {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 32px;
  padding: 24px 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.contact-identity > p {
  margin: 0 0 4px;
}
.contact-identity h2 {
  margin: 0 0 12px;
}
.contact-platform {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 4px;
}
.contact-number {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 8px;
}
.contact-phone {
  font-size: 1.2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.commercial-contacts a {
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
  overflow-wrap: anywhere;
}
.commercial-contacts a:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 4px;
}
.contact-platform > a,
.contact-number > a {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
}
.contacts-empty {
  padding: 24px 0;
}
.contacts-feedback {
  min-height: 24px;
  margin: 12px 0;
}
.contacts-notes {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 20px;
  font-size: 0.875rem;
  max-width: 75ch;
  line-height: 1.6;
}
.contacts-notes p {
  margin: 0 0 12px;
}
@media (max-width: 700px) {
  .contacts-filters {
    grid-template-columns: 1fr;
  }
  .contact-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .commercial-contacts {
    padding-top: 24px;
  }
}
</style>
