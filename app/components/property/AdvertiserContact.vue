<!-- Contact evidence stays attached to its own advert; opening a channel always requires a click. -->
<script setup lang="ts">
import {
  agencyPath,
  publicAdvertiserMetadata,
  type AdvertiserMetadata,
  type PublicContact,
} from '~/utils/propertyAdvertiser'
import { propertyExperienceMessages } from '~/utils/propertyExperienceMessages'

const props = withDefaults(
  defineProps<{
    publisher: AdvertiserMetadata & { source?: string; sellerType?: string; url?: string }
    showAgency?: boolean
    /**
     * The sticky price card: channels become buttons and the explanatory prose goes away.
     * Source and date stay — provenance travels with the contact wherever it is shown.
     */
    compact?: boolean
  }>(),
  { showAgency: true, compact: false }
)
const { t, locale } = useI18n({ useScope: 'local', messages: propertyExperienceMessages })
const localePath = useLocalePath()
const metadata = computed(() => publicAdvertiserMetadata(props.publisher))
const channels = computed(() => metadata.value.publicContact?.channels ?? [])
const evidence = computed(() => [
  ...new Map(
    channels.value.map(channel => [
      `${channel.sourceUrl}:${channel.observedAt.slice(0, 10)}`,
      channel,
    ])
  ).values(),
])
const visible = computed(
  () =>
    (props.showAgency !== false && metadata.value.agency) ||
    metadata.value.ownerDirect ||
    channels.value.length
)
const channelHref = (channel: PublicContact['channels'][number]) => {
  if (channel.kind === 'phone') return `tel:${channel.value}`
  if (channel.kind === 'whatsapp') return `https://wa.me/${channel.value.replace(/^\+/, '')}`
  if (channel.kind === 'email') return `mailto:${encodeURIComponent(channel.value)}`
  return channel.value
}
const icons = {
  phone: 'mdi-phone-outline',
  whatsapp: 'mdi-whatsapp',
  email: 'mdi-email-outline',
  website: 'mdi-web',
  profile: 'mdi-account-outline',
}
const label = (channel: PublicContact['channels'][number]) =>
  channel.kind === 'phone' ? channel.value : t(channel.kind)
const sourceName = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return t('source')
  }
}
const date = (value: string) =>
  new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeZone: 'America/Montevideo',
  }).format(new Date(value))
</script>

<template>
  <div
    v-if="visible"
    class="advertiser-contact"
    :class="{ 'advertiser-contact--compact': compact }"
    data-testid="property-advertiser-contact"
  >
    <div v-if="metadata.ownerDirect" class="advertiser-contact__owner">
      <p class="advertiser-contact__owner-title">
        <VIcon icon="mdi-account-key-outline" size="20" aria-hidden="true" />
        <strong>{{ t('ownerDeclared') }}</strong>
      </p>
      <template v-if="!compact">
        <p>{{ t('ownerHint') }}</p>
        <a
          :href="metadata.ownerDirect.sourceUrl"
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          {{ t('ownerEvidence') }}
        </a>
      </template>
    </div>
    <NuxtLink
      v-if="showAgency !== false && metadata.agency"
      :to="localePath(agencyPath(metadata.agency.key))"
      class="advertiser-contact__agency"
      :aria-label="compact ? `${t('agency')}: ${metadata.agency.name}` : undefined"
    >
      <VIcon icon="mdi-office-building-outline" size="20" aria-hidden="true" />
      <span>{{ compact ? t('agency') : `${t('agency')}: ${metadata.agency.name}` }}</span>
      <VIcon icon="mdi-arrow-right" size="16" aria-hidden="true" />
    </NuxtLink>
    <template v-if="channels.length">
      <p v-if="!compact" class="advertiser-contact__heading">
        <strong>{{ t('contactTitle') }}</strong>
      </p>
      <ul class="advertiser-contact__channels">
        <li v-for="channel in channels" :key="`${channel.kind}:${channel.value}`">
          <a
            :href="channelHref(channel)"
            :aria-label="channel.kind === 'phone' ? t('call', { phone: channel.value }) : undefined"
            :target="['phone', 'email'].includes(channel.kind) ? undefined : '_blank'"
            rel="noopener noreferrer nofollow"
            class="advertiser-contact__action"
          >
            <VIcon :icon="icons[channel.kind]" size="20" aria-hidden="true" />
            {{ label(channel) }}
          </a>
        </li>
      </ul>
      <div
        v-for="item in evidence"
        :key="`${item.sourceUrl}:${item.observedAt}`"
        class="advertiser-contact__evidence"
      >
        <a :href="item.sourceUrl" target="_blank" rel="noopener noreferrer nofollow">
          {{ t('contactEvidence', { source: sourceName(item.sourceUrl) }) }}
        </a>
        <time :datetime="item.observedAt">{{
          t('contactDate', { date: date(item.observedAt) })
        }}</time>
      </div>
    </template>
  </div>
</template>

<style scoped>
.advertiser-contact {
  margin-block: 16px;
  overflow-wrap: anywhere;
}
.advertiser-contact :is(p, ul) {
  margin: 0;
}
.advertiser-contact a {
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}
.advertiser-contact__owner {
  font-size: 0.85rem;
  line-height: 1.5;
  margin-bottom: 8px;
}
.advertiser-contact .advertiser-contact__owner-title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}
.advertiser-contact__agency {
  gap: 8px;
  font-size: 0.9rem;
}
.advertiser-contact .advertiser-contact__heading {
  margin-top: 8px;
  font-size: 0.9rem;
}
.advertiser-contact__channels {
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0 16px;
}
.advertiser-contact__action {
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 600;
}
.advertiser-contact__evidence {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 12px;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.76);
}
.advertiser-contact__evidence time {
  padding-block: 4px;
}
.advertiser-contact a:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
/* Compact: the price card's contact row. Buttons, not prose. */
.advertiser-contact--compact {
  margin-block: 0;
}
.advertiser-contact--compact .advertiser-contact__owner {
  margin-bottom: 4px;
}
.advertiser-contact--compact .advertiser-contact__agency {
  min-height: 36px;
  font-size: 0.875rem;
}
.advertiser-contact--compact .advertiser-contact__channels {
  gap: 8px;
  margin-top: 8px;
}
.advertiser-contact--compact .advertiser-contact__action {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 4px;
  background: rgba(var(--v-theme-primary), 0.1);
  text-decoration: none;
  font-size: 0.875rem;
  transition: background-color 150ms ease;
}
.advertiser-contact--compact .advertiser-contact__action:hover {
  background: rgba(var(--v-theme-primary), 0.18);
}
.advertiser-contact--compact .advertiser-contact__evidence {
  margin-top: 6px;
}
</style>
