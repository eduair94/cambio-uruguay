<template>
  <VContainer class="py-8">
    <h1 class="text-h4 font-weight-bold mb-1">{{ t('conectar.title') }}</h1>
    <p class="text-body-1 text-medium-emphasis mb-6">{{ t('conectar.subtitle') }}</p>

    <VRow>
      <VCol v-for="c in cards" :key="c.key" cols="12" sm="6" md="4">
        <VCard variant="outlined" class="pa-4 h-100 d-flex flex-column">
          <div class="d-flex align-center ga-2 mb-2">
            <VIcon :color="c.color">{{ c.icon }}</VIcon>
            <span class="text-subtitle-1 font-weight-bold">{{ c.title }}</span>
          </div>
          <p class="text-body-2 mb-4 flex-grow-1">{{ c.text }}</p>
          <div class="d-flex flex-wrap ga-2">
            <VBtn
              v-for="(a, i) in c.actions"
              :key="i"
              :href="a.href"
              :to="a.to"
              :target="a.href ? '_blank' : undefined"
              :rel="a.href ? 'noopener noreferrer' : undefined"
              size="small"
              :variant="i === 0 ? 'flat' : 'tonal'"
              :color="i === 0 ? c.color : undefined"
              :prepend-icon="a.icon"
            >
              {{ a.label }}
            </VBtn>
          </div>
        </VCard>
      </VCol>
    </VRow>

    <div class="mt-8" style="max-width: 640px">
      <McpConfigCard />
    </div>
  </VContainer>
</template>

<script setup lang="ts">
interface CardAction {
  href?: string
  to?: string
  label: string
  icon: string
}
interface ChannelCard {
  key: string
  icon: string
  color: string
  title: string
  text: string
  actions: CardAction[]
}

const { t } = useI18n()
const localePath = useLocalePath()
const invite = (useRuntimeConfig().public as { discordInviteUrl?: string }).discordInviteUrl || ''

const cards = computed<ChannelCard[]>(() => [
  {
    key: 'web',
    icon: 'mdi-web',
    color: 'primary',
    title: t('conectar.web'),
    text: t('conectar.webText'),
    actions: [{ to: localePath('/'), label: t('conectar.open'), icon: 'mdi-open-in-new' }],
  },
  {
    key: 'api',
    icon: 'mdi-api',
    color: 'indigo',
    title: t('conectar.api'),
    text: t('conectar.apiText'),
    actions: [
      {
        href: 'https://api.cambio-uruguay.com/api-docs',
        label: t('conectar.open'),
        icon: 'mdi-open-in-new',
      },
    ],
  },
  {
    key: 'mcp',
    icon: 'mdi-robot-happy',
    color: 'deep-purple',
    title: t('conectar.mcp'),
    text: t('conectar.mcpText'),
    actions: [{ to: localePath('/acerca'), label: t('conectar.open'), icon: 'mdi-information' }],
  },
  {
    key: 'bot',
    icon: 'mdi-telegram',
    color: 'info',
    title: t('conectar.botTitle'),
    text: t('conectar.botText'),
    actions: [
      {
        href: 'https://t.me/cambio_uruguay_bot',
        label: t('conectar.open'),
        icon: 'mdi-open-in-new',
      },
    ],
  },
  {
    key: 'channel',
    icon: 'mdi-bullhorn',
    color: 'info',
    title: t('conectar.channelTitle'),
    text: t('conectar.channelText'),
    actions: [
      { href: 'https://t.me/cambio_uruguay', label: t('conectar.open'), icon: 'mdi-open-in-new' },
    ],
  },
  {
    key: 'discord',
    icon: 'mdi-discord',
    color: 'deep-purple-accent-3',
    title: t('conectar.discord'),
    text: t('conectar.discordText'),
    actions: [
      { href: '/api/auth/discord/start', label: t('conectar.discordLogin'), icon: 'mdi-login' },
      ...(invite
        ? [{ href: invite, label: t('conectar.discordJoin'), icon: 'mdi-open-in-new' }]
        : []),
    ],
  },
  {
    key: 'newsletter',
    icon: 'mdi-email-newsletter',
    color: 'teal',
    title: t('conectar.newsletter'),
    text: t('conectar.newsletterText'),
    actions: [
      { to: localePath('/newsletter'), label: t('conectar.open'), icon: 'mdi-open-in-new' },
    ],
  },
  {
    key: 'blog',
    icon: 'mdi-rss',
    color: 'orange',
    title: t('conectar.blog'),
    text: t('conectar.blogText'),
    actions: [{ to: localePath('/blog'), label: t('conectar.open'), icon: 'mdi-open-in-new' }],
  },
])

useSeoMeta({
  title: () => t('conectar.title'),
  description: () => t('conectar.subtitle'),
})
</script>
