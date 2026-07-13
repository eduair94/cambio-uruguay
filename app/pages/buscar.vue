<template>
  <div class="search-page">
    <VContainer>
      <header class="pt-2 pb-6 py-md-10">
        <VChip class="mb-4" color="primary" size="small" variant="tonal">
          <VIcon start size="small">mdi-magnify</VIcon>
          {{ $t('search.triggerLabel').toUpperCase() }}
        </VChip>
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
          {{ query ? $t('search.resultsFor', { q: query }) : $t('search.pageTitle') }}
        </h1>
        <p v-if="!query" class="text-body-1 text-grey-lighten-1 search-page__intro">
          {{ $t('search.pageIntro') }}
        </p>

        <!-- A real GET form: this page is the no-JS and pre-hydration fallback
             for the palette, and the target of the WebSite SearchAction. -->
        <form class="search-page__form" method="get" :action="localePath('/buscar')" role="search">
          <VIcon class="search-page__form-icon">mdi-magnify</VIcon>
          <input
            v-model="input"
            class="search-page__input"
            type="text"
            name="q"
            autocomplete="off"
            :aria-label="$t('search.ariaInput')"
            :placeholder="$t('search.placeholder')"
          />
          <VBtn type="submit" color="primary" variant="flat">{{ $t('search.triggerLabel') }}</VBtn>
        </form>
      </header>

      <p v-if="query" class="text-body-2 text-grey-lighten-1 mb-4">
        {{
          results.length === 1
            ? $t('search.oneResult')
            : $t('search.resultsCount', { n: results.length })
        }}
      </p>

      <!-- "100 usd": the exact typed amount, linked to a page that really exists. -->
      <VCard v-if="amountHit" class="search-page__amount mb-6" variant="tonal">
        <NuxtLink :to="localePath(amountHit.navTo)" class="search-page__amount-link">
          <VIcon size="28">mdi-swap-horizontal</VIcon>
          <span>
            <strong>{{ amountHit.title }}</strong>
            <span class="d-block text-body-2">{{ $t('search.type.convert') }}</span>
          </span>
          <VIcon>mdi-arrow-right</VIcon>
        </NuxtLink>
      </VCard>

      <p v-if="query && isSuggestion" class="text-body-1 mb-4">{{ $t('search.didYouMean') }}</p>

      <SearchResults v-if="results.length" mode="links" :groups="groups" />

      <VCard
        v-else-if="query && !amountHit"
        class="search-page__empty pa-8 text-center"
        variant="flat"
      >
        <VIcon size="40" class="mb-3">mdi-magnify-close</VIcon>
        <p class="text-body-1 mb-4">{{ $t('search.empty', { q: query }) }}</p>
        <VBtn :to="localePath('/mapa-del-sitio')" color="primary" variant="tonal">
          <VIcon start>mdi-sitemap-outline</VIcon>
          {{ $t('search.browseSitemap') }}
        </VBtn>
      </VCard>

      <!-- No query: an indexable landing that links the whole site. -->
      <section v-else-if="!query" class="search-page__popular">
        <h2 class="text-h6 font-weight-bold mb-4">{{ $t('search.suggestions') }}</h2>
        <VRow>
          <VCol v-for="doc in popular" :key="doc.id" cols="12" sm="6" md="4">
            <VCard :to="localePath(doc.to ?? '/')" class="pa-4 h-100" hover elevation="2">
              <VIcon class="mb-2" color="primary">{{ doc.icon }}</VIcon>
              <h3 class="text-subtitle-1 font-weight-bold">{{ doc.title }}</h3>
            </VCard>
          </VCol>
        </VRow>
        <VBtn class="mt-6" :to="localePath('/mapa-del-sitio')" variant="tonal">
          <VIcon start>mdi-sitemap-outline</VIcon>
          {{ $t('search.browseSitemap') }}
        </VBtn>
      </section>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { buildSearchIndex, parseAmountQuery } from '~/utils/searchIndex'
import { POPULAR, buildResultGroups, scoreDocs, type SearchDoc } from '~/utils/siteNav'

const route = useRoute()
const localePath = useLocalePath()
const { t, locale } = useI18n()
const track = useTrack()

const query = computed(() => String(route.query.q ?? '').trim())
const input = ref(query.value)
watch(query, q => {
  input.value = q
})

// The same pure functions the palette runs, executed during SSR: results land
// in the HTML as crawlable anchors, and the two surfaces can never disagree.
const docs = computed(() => buildSearchIndex({ locale: locale.value, t }))
const results = computed(() => (query.value ? scoreDocs(query.value, docs.value) : []))
const isSuggestion = computed(() => results.value.some(r => r.suggestion))
const amountHit = computed(() => (query.value ? parseAmountQuery(query.value) : null))

const groups = computed(() => buildResultGroups(results.value, 50).groups)

const popular = computed(() =>
  POPULAR.map(r => docs.value.find(d => d.to === r)).filter(
    Boolean as unknown as (d: SearchDoc | undefined) => d is SearchDoc
  )
)

onMounted(() => {
  if (query.value) track('search_results_view', { q: query.value, count: results.value.length })
})

// Result pages are infinite and thin, so they are noindex. The bare landing is
// worth indexing — but go through @nuxtjs/robots rather than emitting the tag
// ourselves: the module already marks every page noindex outside production,
// and a hardcoded `index, follow` here would make the landing indexable on
// staging. Restoring the module's own rule when `q` clears keeps that intact.
const robotsRule = useRobotsRule()
const defaultRobotsRule = robotsRule.value
watchEffect(() => {
  robotsRule.value = query.value ? 'noindex, follow' : defaultRobotsRule
})

const canonicalUrl = 'https://cambio-uruguay.com/buscar'

defineOgImageComponent('Cambio', {
  title: () => t('search.pageTitle'),
  subtitle: () => t('search.pageDescription'),
  tag: 'BÚSQUEDA',
  locale: locale.value as 'es' | 'en' | 'pt',
})

useSeoMeta({
  title: () =>
    query.value
      ? `${t('search.resultsFor', { q: query.value })} | Cambio Uruguay`
      : `${t('search.pageTitle')} | Cambio Uruguay`,
  description: () => t('search.pageDescription'),
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
})
</script>

<style scoped lang="scss">
.search-page__intro {
  max-width: 640px;
}

.search-page__form {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 640px;
  margin-top: 20px;
  padding: 6px 6px 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
}

.search-page__form-icon {
  opacity: 0.7;
}

.search-page__input {
  flex: 1 1 auto;
  min-width: 0;
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: rgb(var(--v-theme-on-surface));
  font-size: 1rem;
  outline: none;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
}

.search-page__amount-link {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  color: inherit;
  text-decoration: none;

  span {
    flex: 1 1 auto;
  }
}

.search-page__empty {
  border: 1px dashed rgba(255, 255, 255, 0.16);
}

.v-theme--light {
  .search-page__form {
    border-color: rgba(0, 0, 0, 0.16);
    background: rgba(0, 0, 0, 0.02);
  }

  .search-page__input::placeholder {
    color: rgba(0, 0, 0, 0.55);
  }

  .search-page__empty {
    border-color: rgba(0, 0, 0, 0.16);
  }
}
</style>
