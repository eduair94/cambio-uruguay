<template>
  <VContainer class="agency-detail">
    <NuxtLink class="agency-back" :to="localePath('/inmobiliarias-uruguay')">
      <VIcon icon="mdi-arrow-left" size="20" />
      <span>{{ t('back') }}</span>
    </NuxtLink>
    <section v-if="error || !data" aria-live="polite">
      <h1>{{ t(failureCode === 404 ? 'notFound' : 'unavailable') }}</h1>
      <p>{{ t('notFoundHint') }}</p>
      <VBtn v-if="failureCode !== 404" :loading="pending" variant="outlined" @click="refresh()">{{
        t('retry')
      }}</VBtn>
    </section>
    <template v-else>
      <header>
        <p>{{ t('source') }}: {{ source }}</p>
        <h1>{{ data.agency.name }}</h1>
        <p>{{ data.departments.join(' · ') }}</p>
      </header>
      <p class="agency-count">{{ data.listings.toLocaleString(locale) }} {{ t('listings') }}</p>
      <div class="agency-links">
        <VBtn
          v-if="data.rentals"
          :to="localePath(data.links.rentals)"
          color="primary"
          min-height="44"
          >{{ t('exploreRent') }} ({{ data.rentals.toLocaleString(locale) }})</VBtn
        ><VBtn
          v-if="data.sales"
          :to="localePath(data.links.sales)"
          variant="outlined"
          color="link"
          min-height="44"
          >{{ t('exploreSale') }} ({{ data.sales.toLocaleString(locale) }})</VBtn
        >
      </div>
      <p>{{ t('freshness') }}</p>
      <a
        class="agency-original"
        :href="data.agency.profileUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span>{{ t('original') }}</span>
        <VIcon icon="mdi-open-in-new" size="18" />
      </a>
      <PropertyAdvertiserContact
        v-if="data.publicContact"
        :show-agency="false"
        :publisher="{
          source: data.agency.key.split(':')[0],
          agency: data.agency,
          publicContact: data.publicContact,
        }"
      />
      <p class="agency-date">
        {{ t('updated') }}: {{ date(data.agency.observedAt)
        }}<template v-if="data.lastListingSeen"
          ><br />{{ t('lastSeen') }}: {{ date(data.lastListingSeen) }}</template
        >
      </p>
      <section v-if="data.zones.length" class="agency-zones">
        <h2>{{ t('zones') }}</h2>
        <ul>
          <li v-for="zone in data.zones" :key="`${zone.department}:${zone.neighborhood}`">
            <span>{{ zone.neighborhood }} · {{ zone.department }}</span
            ><span>{{ zone.listings.toLocaleString(locale) }}</span>
          </li>
        </ul>
      </section>
      <section class="agency-about">
        <h2>{{ t('coverage') }}</h2>
        <p>{{ t('coverageHint') }}</p>
      </section>
    </template>
  </VContainer>
</template>
<script setup lang="ts">
import { agencyKey, agencyPath, type PublicContact } from '../../utils/propertyAdvertiser'
import type { AgencySummary } from '../../utils/agencies'
import { agencyMessage } from '../../utils/agencyMessages'
import { RENTAL_SOURCE_LABEL, type RentalSource } from '../../utils/rentals'
const { locale } = useI18n(),
  localePath = useLocalePath(),
  route = useRoute()
const t = (key: Parameters<typeof agencyMessage>[1]) => agencyMessage(locale.value, key)
const key = computed(() => agencyKey(route.params.key))
const { data, error, pending, refresh } = await useAsyncData(
  () => `agency:${key.value}`,
  () => {
    if (!key.value) throw createError({ statusCode: 404, statusMessage: 'Agency not found' })
    return $fetch<
      AgencySummary & {
        publicContact: PublicContact | null
        links: { rentals: string; sales: string }
        indexable: boolean
      }
    >(`/api/agencies/${encodeURIComponent(key.value)}`)
  }
)
const failureCode = computed(() => {
  const failure = error.value as { statusCode?: number; data?: { statusCode?: number } } | null
  return failure?.statusCode === 404 || failure?.data?.statusCode === 404 ? 404 : 503
})
if (import.meta.server && (error.value || !data.value)) {
  const event = useRequestEvent()
  if (event) {
    setResponseStatus(event, failureCode.value)
    useResponseHeader('cache-control').value = 'no-store'
  }
}
const source = computed(
  () => RENTAL_SOURCE_LABEL[data.value?.agency.key.split(':')[0] as RentalSource] || ''
)
const date = (value: string) =>
  new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'long',
    timeZone: /^\d{4}-\d{2}-\d{2}$/.test(value) ? 'UTC' : 'America/Montevideo',
  }).format(new Date(value))
const canonical = computed(
  () =>
    `https://cambio-uruguay.com${localePath(key.value ? agencyPath(key.value) : '/inmobiliarias-uruguay')}`
)
useSeoMeta({
  title: () => data.value?.agency.name || t('notFound'),
  description: () => t('description'),
  ogTitle: () => data.value?.agency.name || t('title'),
  ogDescription: () => t('description'),
  robots: () => (data.value?.indexable && !error.value ? 'index,follow' : 'noindex,follow'),
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script:
    data.value && !error.value
      ? [
          {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'RealEstateAgent',
                  name: data.value.agency.name,
                  url: canonical.value,
                  sameAs: data.value.agency.profileUrl,
                  areaServed: data.value.departments,
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
                    {
                      '@type': 'ListItem',
                      position: 2,
                      name: t('title'),
                      item: `https://cambio-uruguay.com${localePath('/inmobiliarias-uruguay')}`,
                    },
                    {
                      '@type': 'ListItem',
                      position: 3,
                      name: data.value.agency.name,
                      item: canonical.value,
                    },
                  ],
                },
              ],
            }).replace(/</g, '\\u003c'),
          },
        ]
      : [],
}))
defineOgImageComponent('Cambio', {
  title: data.value?.agency.name || t('title'),
  description: t('description'),
})
</script>
<style scoped>
.agency-detail {
  max-width: 900px;
  padding: 16px;
}
.agency-back,
.agency-original {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  color: rgb(var(--v-theme-link));
}
.agency-detail h1 {
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  line-height: 1.2;
  margin: 8px 0 12px;
  overflow-wrap: anywhere;
}
.agency-detail h2 {
  margin: 0 0 12px;
  font-size: 1.25rem;
}
.agency-detail p {
  margin: 10px 0;
  max-width: 72ch;
}
.agency-count {
  font-weight: 650;
  font-size: 1.125rem;
}
.agency-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 18px 0;
}
.agency-links :deep(.v-btn) {
  height: auto;
  min-height: 44px;
  white-space: normal;
  text-align: center;
  padding: 10px 16px;
}
.agency-date {
  font-size: 0.875rem;
}
.agency-zones,
.agency-about {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.2);
}
.agency-zones ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 24px;
}
.agency-zones li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
}
@media (max-width: 600px) {
  .agency-detail {
    padding: 4px;
  }
  .agency-zones ul {
    grid-template-columns: 1fr;
  }
}
</style>
