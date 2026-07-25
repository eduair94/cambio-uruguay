<!--
THESIS: The price directory is a shopping tool, not a chapter of an essay — it gets its own page so
the facets, the toolbar and 377 chairs stop interrupting the tier list's argument.
OWN-WORLD: Cambio Uruguay navy surfaces and action blue on a catalogue layout people already know.
STORY: Arrive with a chair or a budget in mind, narrow it, open the cheapest seller.
-->
<template>
  <VContainer class="chair-prices pt-1 pt-sm-4 pb-12">
    <VBreadcrumbs :items="breadcrumbs" density="compact" class="px-0 py-1" />

    <ChairsChairMarketDirectory
      heading-tag="h1"
      :products="catalog?.products ?? []"
      :meta="catalog?.meta ?? null"
      :pending="pending"
      :brands="catalog?.facets.brands ?? []"
      :price-max="catalog?.facets.priceMax ?? 0"
    />

    <!-- The two chair pages answer different questions; each one closes by naming the other. -->
    <aside class="prices-close">
      <div>
        <p class="prices-close__kicker">{{ t('chairTiers.boardKicker') }}</p>
        <h2>{{ t('chairMarket.backToTiers') }}</h2>
        <p>{{ t('chairMarket.backToTiersLead') }}</p>
      </div>
      <div class="prices-close__actions">
        <VBtn
          :to="localePath('/sillas-escritorio-uruguay')"
          color="primary"
          variant="flat"
          rounded="lg"
          append-icon="mdi-arrow-right"
        >
          {{ t('chairMarket.backToTiers') }}
        </VBtn>
        <ShareButtons :text="t('chairMarket.shareText')" />
      </div>
    </aside>
  </VContainer>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'
import type { ChairCatalogResponse } from '~/utils/chairCatalog'

const { t } = useI18n()
const localePath = useLocalePath()
const { smAndDown } = useDisplay()

const { data: catalog, pending } = await useAsyncData<ChairCatalogResponse | null>(
  'chair-catalog',
  () => $fetch('/api/chairs')
)

const breadcrumbs = computed(() => {
  const parent = {
    title: t('nav.chairTiers'),
    to: localePath('/sillas-escritorio-uruguay'),
    disabled: false,
  }
  const current = { title: t('chairMarket.breadcrumb'), disabled: true }
  // On a phone the home crumb is the first thing to go: it costs a line and leads nowhere useful.
  return smAndDown.value
    ? [parent, current]
    : [{ title: t('inicio'), to: localePath('/'), disabled: false }, parent, current]
})

const canonicalUrl = computed(
  () => `https://cambio-uruguay.com${localePath('/sillas-escritorio-uruguay/precios')}`
)

defineOgImageComponent('Cambio', {
  title: () => t('chairMarket.title'),
  subtitle: () =>
    catalog.value?.meta
      ? t('chairMarket.ogSubtitle', {
          products: catalog.value.meta.products,
          offers: catalog.value.meta.offers,
        })
      : t('chairMarket.lead'),
  tag: 'SILLAS · PRECIOS',
})

useSeoMeta({
  title: () => t('chairMarket.metaTitle'),
  description: () => t('chairMarket.metaDescription'),
  ogTitle: () => t('chairMarket.metaTitle'),
  ogDescription: () => t('chairMarket.metaDescription'),
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  script: catalog.value?.products.length
    ? [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: t('chairMarket.title'),
            description: t('chairMarket.metaDescription'),
            url: canonicalUrl.value,
            numberOfItems: catalog.value.products.length,
            // Only the first page of results is described; claiming 377 positions Google never
            // sees rendered would be a list it cannot verify.
            itemListElement: catalog.value.products.slice(0, 24).map((product, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: product.name,
              url: `https://cambio-uruguay.com${localePath(`/sillas-escritorio-uruguay/${product.slug}`)}`,
            })),
          }),
        },
      ]
    : [],
}))
</script>

<style scoped>
.chair-prices {
  max-width: 1240px;
}

.prices-close {
  display: flex;
  flex-wrap: wrap;
  gap: 24px 40px;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: clamp(56px, 8vw, 96px);
  padding-top: clamp(24px, 4vw, 40px);
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.prices-close__kicker {
  margin: 0;
  color: rgb(var(--v-theme-link));
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.0333em;
}

.prices-close h2 {
  margin: 5px 0 0;
  max-width: 26ch;
  font-size: clamp(1.5rem, 3vw, 2.125rem);
  font-weight: 300;
  line-height: 1.14;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.prices-close p {
  max-width: 62ch;
  margin: 12px 0 0;
  line-height: 1.65;
  opacity: 0.78;
}

.prices-close__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
</style>
