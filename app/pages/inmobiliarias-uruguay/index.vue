<template>
  <VContainer class="agencies-page">
    <header>
      <h1>{{ t('title') }}</h1>
      <p>{{ t('intro') }}</p>
      <NuxtLink :to="localePath('/alquiler-ideal-uruguay')" class="agencies-planner-link">{{
        globalT('nav.rentalFit')
      }}</NuxtLink>
    </header>
    <form class="agencies-search" role="search" @submit.prevent="apply">
      <label>
        <span>{{ t('search') }}</span>
        <input v-model="draft.q" type="search" maxlength="100" :placeholder="t('search')" />
      </label>
      <label
        >{{ t('department')
        }}<select v-model="draft.department">
          <option value="">{{ t('allDepartments') }}</option>
          <option v-for="department in data?.departments || []" :key="department">
            {{ department }}
          </option>
        </select></label
      >
      <label
        >{{ t('operation')
        }}<select v-model="draft.operation">
          <option value="all">{{ t('all') }}</option>
          <option value="rent">{{ t('rent') }}</option>
          <option value="sale">{{ t('sale') }}</option>
        </select></label
      >
      <VBtn type="submit" color="primary" :loading="pending" min-height="44">{{ t('apply') }}</VBtn>
    </form>
    <div v-if="filtered" class="agencies-active">
      <span
        >{{ t('selected') }}:
        {{
          [query.q, query.department, query.operation !== 'all' ? t(query.operation) : '']
            .filter(Boolean)
            .join(' · ')
        }}</span
      ><VBtn variant="text" min-height="44" @click="clear">{{ t('clear') }}</VBtn>
    </div>
    <section aria-live="polite" :aria-busy="pending">
      <p v-if="pending">{{ t('loading') }}</p>
      <div v-else-if="error">
        <h2>{{ t('unavailable') }}</h2>
        <VBtn variant="outlined" min-height="44" @click="refresh()">{{ t('retry') }}</VBtn>
      </div>
      <template v-else-if="data?.items.length">
        <p class="agencies-count">{{ data.total.toLocaleString(locale) }} {{ t('agencies') }}</p>
        <AgenciesAgencyCard v-for="item in data.items" :key="item.agency.key" :item="item" />
      </template>
      <div v-else class="agencies-empty">
        <h2>{{ t('empty') }}</h2>
        <p>{{ t('emptyHint') }}</p>
        <NuxtLink :to="localePath('/alquileres-uruguay')">{{ t('exploreRent') }}</NuxtLink>
      </div>
    </section>
    <nav v-if="data && data.pages > 1" class="agencies-pagination" :aria-label="t('page')">
      <VBtn :disabled="data.page <= 1" :to="pageLink(data.page - 1)" variant="outlined">{{
        t('previous')
      }}</VBtn
      ><span>{{ data.page }} / {{ data.pages }}</span
      ><VBtn :disabled="data.page >= data.pages" :to="pageLink(data.page + 1)" variant="outlined">{{
        t('next')
      }}</VBtn>
    </nav>
    <section class="agencies-about">
      <h2>{{ t('coverage') }}</h2>
      <p>{{ t('coverageHint') }}</p>
      <p>{{ t('freshness') }}</p>
    </section>
  </VContainer>
</template>
<script setup lang="ts">
import { normalizeAgencyQuery, agencyPath, type AgenciesResponse } from '../../utils/agencies'
import { agencyMessage } from '../../utils/agencyMessages'
const { locale, t: globalT } = useI18n(),
  localePath = useLocalePath(),
  route = useRoute()
const t = (key: Parameters<typeof agencyMessage>[1]) => agencyMessage(locale.value, key)
const query = computed(() => normalizeAgencyQuery(route.query))
const draft = reactive({
  q: query.value.q,
  department: query.value.department,
  operation: query.value.operation,
})
watch(query, value =>
  Object.assign(draft, { q: value.q, department: value.department, operation: value.operation })
)
const { data, error, pending, refresh } = await useAsyncData(
  'agency-directory',
  () => $fetch<AgenciesResponse>('/api/agencies', { query: query.value }),
  { watch: [query] }
)
if (import.meta.server && error.value) {
  const event = useRequestEvent()
  if (event) {
    setResponseStatus(event, 503)
    useResponseHeader('cache-control').value = 'no-store'
  }
}
const filtered = computed(
  () =>
    !!(
      query.value.q ||
      query.value.department ||
      query.value.operation !== 'all' ||
      query.value.page > 1
    )
)
const params = (page = 1) => ({
  ...(query.value.q ? { q: query.value.q } : {}),
  ...(query.value.department ? { department: query.value.department } : {}),
  ...(query.value.operation !== 'all' ? { operation: query.value.operation } : {}),
  ...(page > 1 ? { page: String(page) } : {}),
})
const pageLink = (page: number) =>
  localePath({ path: '/inmobiliarias-uruguay', query: params(page) })
async function apply() {
  await navigateTo(
    localePath({
      path: '/inmobiliarias-uruguay',
      query: {
        ...(draft.q ? { q: draft.q } : {}),
        ...(draft.department ? { department: draft.department } : {}),
        ...(draft.operation !== 'all' ? { operation: draft.operation } : {}),
      },
    })
  )
}
async function clear() {
  Object.assign(draft, { q: '', department: '', operation: 'all' })
  await navigateTo(localePath('/inmobiliarias-uruguay'))
}
useSeoMeta({
  title: () => t('title'),
  description: () => t('description'),
  ogTitle: () => t('title'),
  ogDescription: () => t('description'),
  robots: () =>
    !error.value && data.value?.items.length && !filtered.value ? 'index,follow' : 'noindex,follow',
})
const canonical = computed(
  () => `https://cambio-uruguay.com${localePath('/inmobiliarias-uruguay')}`
)
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'CollectionPage',
            name: t('title'),
            url: canonical.value,
            description: t('description'),
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: t('home'),
                item: `https://cambio-uruguay.com${localePath('/')}`,
              },
              { '@type': 'ListItem', position: 2, name: t('title'), item: canonical.value },
            ],
          },
          {
            '@type': 'ItemList',
            itemListElement: (data.value?.items || []).map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: item.agency.name,
              url: `https://cambio-uruguay.com${localePath(agencyPath(item.agency.key))}`,
            })),
          },
        ],
      }).replace(/</g, '\\u003c'),
    },
  ],
}))
defineOgImageComponent('Cambio', { title: t('title'), description: t('description') })
</script>
<style scoped>
.agencies-page {
  max-width: 1080px;
  padding: 16px;
  overflow-wrap: anywhere;
}
.agencies-page h1 {
  font-size: clamp(1.55rem, 3vw, 2.15rem);
  line-height: 1.2;
  margin: 0 0 12px;
}
.agencies-page h2 {
  font-size: 1.2rem;
  margin: 0 0 10px;
}
.agencies-page p {
  max-width: 72ch;
  margin: 8px 0;
}
.agencies-search {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  align-items: end;
  gap: 12px;
  margin: 24px 0 12px;
}
.agencies-search label {
  display: grid;
  gap: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  min-width: 0;
}
.agencies-search input,
.agencies-search select {
  width: 100%;
  min-width: 0;
  height: auto;
  min-height: 44px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.48);
  border-radius: 6px;
  padding: 8px 10px;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface));
  font-size: 1rem;
}
.agencies-search input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.agencies-active {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.9rem;
}
.agencies-empty {
  padding: 24px 0;
}
.agencies-empty a {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
}
.agencies-planner-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
}
.agencies-count {
  font-weight: 600;
  padding-top: 12px;
}
.agencies-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 24px;
}
.agencies-about {
  margin-top: 36px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  padding-top: 20px;
}
@media (max-width: 700px) {
  .agencies-search {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr));
    gap: 12px;
  }
  .agencies-search label:first-child {
    grid-column: 1/-1;
  }
  .agencies-search > .v-btn {
    grid-column: 1/-1;
  }
  .agencies-page {
    padding: 4px;
  }
}
</style>
