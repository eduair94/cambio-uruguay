<template>
  <div>
    <!-- Dev-hub header: open-source + integration entry points, site-chromed. -->
    <VContainer class="py-8">
      <div class="d-flex align-center ga-2 mb-1">
        <VIcon color="indigo" size="32">mdi-code-tags</VIcon>
        <h1 class="text-h4 font-weight-bold">{{ t('dev.title') }}</h1>
      </div>
      <p class="text-body-1 text-medium-emphasis mb-6" style="max-width: 760px">
        {{ t('dev.subtitle') }}
      </p>

      <VRow>
        <!-- Open source -->
        <VCol cols="12" sm="6" md="4">
          <VCard variant="outlined" class="pa-4 h-100 d-flex flex-column">
            <div class="d-flex align-center ga-2 mb-2">
              <VIcon color="grey-darken-1">mdi-github</VIcon>
              <span class="text-subtitle-1 font-weight-bold">{{ t('dev.openSource') }}</span>
            </div>
            <p class="text-body-2 mb-4 flex-grow-1">{{ t('dev.openSourceText') }}</p>
            <div class="d-flex flex-wrap ga-2">
              <VBtn
                :href="REPO_URL"
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                variant="flat"
                color="grey-darken-3"
                prepend-icon="mdi-github"
              >
                {{ t('dev.viewOnGithub') }}
              </VBtn>
              <VBtn
                :href="`${REPO_URL}/issues`"
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                variant="tonal"
                prepend-icon="mdi-bug-outline"
              >
                {{ t('dev.reportIssue') }}
              </VBtn>
            </div>
          </VCard>
        </VCol>

        <!-- Public API -->
        <VCol cols="12" sm="6" md="4">
          <VCard variant="outlined" class="pa-4 h-100 d-flex flex-column">
            <div class="d-flex align-center ga-2 mb-2">
              <VIcon color="indigo">mdi-api</VIcon>
              <span class="text-subtitle-1 font-weight-bold">{{ t('dev.api') }}</span>
            </div>
            <p class="text-body-2 mb-3 flex-grow-1">{{ t('dev.apiText') }}</p>
            <VTextField
              :model-value="API_BASE"
              readonly
              density="compact"
              variant="outlined"
              hide-details
              class="mb-2 dev-mono"
              append-inner-icon="mdi-content-copy"
              @click:append-inner="copy(API_BASE)"
            />
            <div class="d-flex flex-wrap ga-2">
              <VBtn
                :href="SPEC_URL"
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                variant="tonal"
                color="indigo"
                prepend-icon="mdi-file-code-outline"
              >
                {{ t('dev.openapiJson') }}
              </VBtn>
              <VBtn
                size="small"
                variant="text"
                :prepend-icon="copied ? 'mdi-check' : 'mdi-content-copy'"
                @click="copy(SPEC_URL)"
              >
                {{ copied ? t('dev.copied') : t('dev.copyUrl') }}
              </VBtn>
            </div>
          </VCard>
        </VCol>

        <!-- Local setup -->
        <VCol cols="12" sm="6" md="4">
          <VCard variant="outlined" class="pa-4 h-100 d-flex flex-column">
            <div class="d-flex align-center ga-2 mb-2">
              <VIcon color="teal">mdi-console</VIcon>
              <span class="text-subtitle-1 font-weight-bold">{{ t('dev.runLocally') }}</span>
            </div>
            <p class="text-body-2 mb-3 flex-grow-1">{{ t('dev.runLocallyText') }}</p>
            <pre class="dev-codeblock"><code>git clone {{ REPO_URL }}.git
cd cambio-uruguay
npm install &amp;&amp; cd app &amp;&amp; npm install
npm run dev</code></pre>
          </VCard>
        </VCol>
      </VRow>

      <VCard variant="outlined" class="preferential-api-card pa-4 mt-6">
        <div class="d-flex flex-column flex-md-row align-md-center ga-3">
          <div class="flex-grow-1">
            <div class="d-flex align-center ga-2 mb-1">
              <VIcon color="teal">mdi-layers-triple</VIcon>
              <h2 class="text-subtitle-1 font-weight-bold">
                {{ t('preferentialRates.developerTitle') }}
              </h2>
            </div>
            <p class="text-body-2 text-medium-emphasis mb-2">
              {{ t('preferentialRates.developerText') }}
            </p>
            <div class="text-caption font-weight-medium mb-1">
              {{ t('preferentialRates.developerExample') }}
            </div>
            <code class="preferential-endpoint">{{ PREFERENTIAL_URL }}</code>
          </div>
          <div class="d-flex flex-wrap ga-2">
            <VBtn
              :href="PREFERENTIAL_URL"
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              color="teal"
              variant="tonal"
              prepend-icon="mdi-open-in-new"
            >
              JSON
            </VBtn>
            <VBtn
              size="small"
              variant="text"
              prepend-icon="mdi-content-copy"
              @click="copy(PREFERENTIAL_URL)"
            >
              {{ t('dev.copyUrl') }}
            </VBtn>
          </div>
        </div>
      </VCard>

      <!-- MCP server config (reuses the shared card used on /conectar). -->
      <div class="mt-6" style="max-width: 640px">
        <p class="text-subtitle-2 font-weight-bold mb-2">
          <VIcon size="18" color="deep-purple" class="mr-1">mdi-robot-happy</VIcon>
          {{ t('dev.mcp') }}
        </p>
        <p class="text-body-2 text-medium-emphasis mb-3">{{ t('dev.mcpText') }}</p>
        <McpConfigCard />
      </div>

      <VDivider class="my-8" />

      <h2 class="text-h5 font-weight-bold mb-1">{{ t('dev.reference') }}</h2>
      <p class="text-body-2 text-medium-emphasis mb-0">{{ t('dev.referenceText') }}</p>
    </VContainer>

    <!-- Scalar API reference, full-bleed. Client-only: @scalar/api-reference pulls
         in a web-worker syntax highlighter that can't be imported under Node SSR,
         so we defer it with Lazy + ClientOnly (the header above stays SSR'd for
         SEO). Suspense handles the component's async setup (it fetches the spec).
         Scalar manages its own light/dark toggle, seeded from the site theme. -->
    <div class="dev-scalar">
      <ClientOnly>
        <Suspense>
          <LazyScalarApiReference :configuration="scalarConfig" />
          <template #fallback>
            <div class="py-12 text-center">
              <VProgressCircular indeterminate color="indigo" />
              <p class="text-body-2 text-medium-emphasis mt-3">{{ t('cargando') }}…</p>
            </div>
          </template>
        </Suspense>
        <template #fallback>
          <div class="py-12 text-center">
            <VProgressCircular indeterminate color="indigo" />
            <p class="text-body-2 text-medium-emphasis mt-3">{{ t('cargando') }}…</p>
          </div>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  alias: ['/developers'],
})

const { t } = useI18n()
const config = useRuntimeConfig()

const REPO_URL = 'https://github.com/eduair94/cambio-uruguay'
const API_BASE = (config.public as { apiBase?: string }).apiBase || 'https://api.cambio-uruguay.com'
const SITE_URL = (config.public as { siteUrl?: string }).siteUrl || 'https://cambio-uruguay.com'
const SPEC_URL = `${SITE_URL}/openapi.json`
const PREFERENTIAL_URL = `${API_BASE}/preferential-rates?provider=santander&currency=USD&amount=5000`

// Seed Scalar's dark mode from the site theme. Scalar keeps its own toggle
// afterwards; SSR default is dark, matching the site's dark-first default.
const { applied } = useThemeMode()
const scalarConfig = computed(() => ({
  url: '/openapi.json',
  darkMode: applied.value === 'dark',
  hideClientButton: false,
  layout: 'modern' as const,
}))

const copied = ref(false)
async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  } catch {
    /* clipboard blocked — no-op */
  }
}

defineOgImageComponent('Cambio', {
  title: () => t('dev.title'),
  subtitle: () => t('dev.subtitle'),
  tag: 'API',
})

useSeoMeta({
  title: () => `${t('dev.title')} | Cambio Uruguay`,
  description: () => t('dev.subtitle'),
  ogTitle: () => t('dev.title'),
  ogDescription: () => t('dev.subtitle'),
  ogType: 'website',
  twitterCard: 'summary_large_image',
})
</script>

<style scoped>
.dev-codeblock {
  background: rgba(127, 127, 127, 0.12);
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 0.8rem;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre;
}
.dev-codeblock code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.preferential-api-card {
  border-color: rgba(0, 150, 136, 0.4);
  background:
    linear-gradient(135deg, rgba(0, 121, 107, 0.1), transparent 60%), rgb(var(--v-theme-surface));
}
.preferential-endpoint {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(127, 127, 127, 0.12);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.78rem;
  white-space: nowrap;
}
:deep(.dev-mono input) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.8rem;
}
/* Give Scalar room; it renders its own full sidebar + content layout. */
.dev-scalar {
  min-height: 70vh;
}

/* Scalar's own LIGHT theme uses muted greys (#9ca3af ≈ 2.5:1 on white) for
   sidebar/secondary labels that fail AA. Darken its muted-text design tokens
   (they cascade to Scalar's internals) and hard-override the sidebar label
   class as a fallback in case token names drift between Scalar versions. */
.v-theme--light .dev-scalar {
  --scalar-color-2: #4b5563;
  --scalar-color-3: #5b6472;
  --scalar-sidebar-color-2: #4b5563;
  --scalar-color-disabled: #6b7280;
}
.v-theme--light .dev-scalar :deep(.text-sidebar-c-2),
.v-theme--light .dev-scalar :deep(.text-c-2),
.v-theme--light .dev-scalar :deep(.text-c-3) {
  color: #4b5563 !important;
}
</style>
