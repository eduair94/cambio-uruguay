<!--
THESIS: A shared selection is an invitation to open the exact page, with enough context to decide.
OWN-WORLD: Existing Vuetify surfaces, Open Sans/Sora and blue actions; light and dark follow the site.
STORY: Read what was shared, open the saved selection, then pass it on if useful.
FIRST VIEWPORT: A single reading column, the shared title and description, then one clear open action.
FORM: The requested narrow preview surface, with no redirect or extra steps before its destination.
-->
<script setup lang="ts">
import { isSharedLinkId, type SharedLinkResponse } from '~/utils/sharedLinks'

const { t, locale } = useI18n({
  useScope: 'local',
  messages: {
    es: {
      shared: 'Te compartieron esta página',
      open: 'Abrir la página compartida',
      selection: 'La selección queda guardada en este enlace.',
      fresh: 'Los precios, las cotizaciones y la disponibilidad pueden cambiar al abrir la página.',
      unavailable: 'No encontramos este enlace',
      unavailableHelp:
        'Revisá que hayas copiado el enlace completo o pedile uno nuevo a quien te lo envió.',
      failed: 'No pudimos cargar el enlace',
      failedHelp: 'El enlace puede seguir disponible. Probá cargarlo de nuevo en unos momentos.',
      retry: 'Volver a intentar',
      home: 'Explorar Cambio Uruguay',
      preview: 'Página compartida',
      defaultDescription:
        'Abrí esta página de Cambio Uruguay con la selección que te compartieron.',
    },
    en: {
      shared: 'Someone shared this page with you',
      open: 'Open the shared page',
      selection: 'This link keeps the saved selection.',
      fresh: 'Prices, exchange rates and availability may change when you open the page.',
      unavailable: 'We could not find this link',
      unavailableHelp: 'Check that you copied the full link, or ask the sender for a new one.',
      failed: 'We could not load this link',
      failedHelp: 'The link may still be available. Try loading it again in a moment.',
      retry: 'Try again',
      home: 'Explore Cambio Uruguay',
      preview: 'Shared page',
      defaultDescription: 'Open this Cambio Uruguay page with the selection shared with you.',
    },
    pt: {
      shared: 'Compartilharam esta página com você',
      open: 'Abrir a página compartilhada',
      selection: 'Este link mantém a seleção salva.',
      fresh: 'Os preços, as cotações e a disponibilidade podem mudar ao abrir a página.',
      unavailable: 'Não encontramos este link',
      unavailableHelp: 'Confira se copiou o link completo ou peça um novo a quem enviou.',
      failed: 'Não foi possível carregar o link',
      failedHelp:
        'O link pode continuar disponível. Tente carregá-lo novamente em alguns instantes.',
      retry: 'Tentar novamente',
      home: 'Explorar Cambio Uruguay',
      preview: 'Página compartilhada',
      defaultDescription:
        'Abra esta página do Cambio Uruguay com a seleção compartilhada com você.',
    },
  },
})
const route = useRoute()
const localePath = useLocalePath()
const id = computed(() => String(route.params.id || ''))
const {
  data: shared,
  error,
  pending,
  refresh,
} = await useAsyncData<SharedLinkResponse>(
  () => `shared-link:${id.value}`,
  () => {
    if (!isSharedLinkId(id.value)) {
      throw createError({ statusCode: 404, statusMessage: 'Shared link not found' })
    }
    return $fetch<SharedLinkResponse>(`/api/share-links/${encodeURIComponent(id.value)}`)
  }
)
const missing = computed(() => {
  const failure = error.value as { statusCode?: number; data?: { statusCode?: number } } | null
  return failure?.statusCode === 404 || failure?.data?.statusCode === 404
})
if (import.meta.server) {
  const event = useRequestEvent()
  useResponseHeader('cache-control').value = 'no-store'
  if (event && error.value) setResponseStatus(event, missing.value ? 404 : 503)
}
const title = computed(() => shared.value?.title || t(missing.value ? 'unavailable' : 'failed'))
const description = computed(() => shared.value?.description || t('defaultDescription'))
const canonical = computed(() => `https://cambio-uruguay.com${localePath(`/s/${id.value}`)}`)
const ogLocale = computed(() =>
  locale.value === 'en' || locale.value === 'pt' ? locale.value : 'es'
)

useSeoMeta({
  title: () => `${title.value} | Cambio Uruguay`,
  description: () => description.value,
  ogTitle: () => title.value,
  ogDescription: () => description.value,
  ogUrl: () => canonical.value,
  ogType: 'website',
  robots: 'noindex, follow',
  twitterCard: 'summary_large_image',
})
useHead(() => ({ link: [{ rel: 'canonical', href: canonical.value }] }))
defineOgImageComponent('Shared', {
  title,
  description,
  label: computed(() => t('preview')),
  locale: ogLocale,
  shortPath: computed(() => `/s/${id.value}`),
})
</script>

<template>
  <VContainer class="shared-page py-6 py-sm-10">
    <article v-if="shared" class="shared-page__preview" aria-labelledby="shared-title">
      <p class="shared-page__intro text-link">
        <VIcon size="20" aria-hidden="true">mdi-link-variant</VIcon>
        {{ t('shared') }}
      </p>
      <h1 id="shared-title" class="shared-page__title">{{ shared.title }}</h1>
      <p class="shared-page__description">{{ description }}</p>

      <div class="shared-page__actions">
        <!-- Keep the stored path intact: locale rewriting would change the shared destination. -->
        <VBtn
          :to="shared.path"
          color="primary"
          size="large"
          variant="flat"
          append-icon="mdi-arrow-right"
          class="shared-page__open"
        >
          {{ t('open') }}
        </VBtn>
        <ShareButtons :url="shared.url" :text="shared.title" variant="text" color="link" />
      </div>

      <div class="shared-page__note">
        <p class="shared-page__selection">{{ t('selection') }}</p>
        <p class="shared-page__fresh text-medium-emphasis">{{ t('fresh') }}</p>
      </div>
    </article>

    <section v-else class="shared-page__preview" aria-labelledby="shared-error">
      <h1 id="shared-error" class="shared-page__title">{{ title }}</h1>
      <p class="shared-page__description">
        {{ t(missing ? 'unavailableHelp' : 'failedHelp') }}
      </p>
      <VBtn
        v-if="!missing"
        color="primary"
        variant="flat"
        class="mt-6"
        :loading="pending"
        prepend-icon="mdi-refresh"
        @click="refresh()"
      >
        {{ t('retry') }}
      </VBtn>
    </section>

    <NuxtLink :to="localePath('/')" class="shared-page__home">{{ t('home') }}</NuxtLink>
  </VContainer>
</template>

<style scoped>
.shared-page {
  max-width: 880px;
}

.shared-page__preview {
  padding: clamp(24px, 5vw, 48px);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
}

.shared-page__intro {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px;
  font-size: 0.9375rem;
  font-weight: 600;
}

.shared-page__title {
  margin: 0;
  font-family: Sora, sans-serif;
  font-size: clamp(1.75rem, 4.8vw, 2.75rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.025em;
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.shared-page__description {
  max-width: 65ch;
  margin: 20px 0 0;
  font-size: 1.0625rem;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.shared-page__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 28px;
}

.shared-page__open {
  min-height: 48px;
  max-width: 100%;
  height: auto;
  padding-block: 12px;
  white-space: normal;
}

.shared-page__open :deep(.v-btn__content) {
  white-space: normal;
}

.shared-page__note {
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.shared-page__selection {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
}

.shared-page__fresh {
  margin: 8px 0 0;
  font-size: 0.875rem;
  line-height: 1.6;
}

.shared-page__home {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-top: 16px;
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
}

.shared-page__home:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 4px;
}

@media (max-width: 599px) {
  .shared-page__open {
    width: 100%;
  }
}
</style>
