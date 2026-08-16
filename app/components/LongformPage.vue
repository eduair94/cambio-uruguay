<template>
  <div class="longform-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="9" lg="8">
          <!-- Back to the family index -->
          <div class="mb-4">
            <VBtn :to="localePath(family.basePath)" variant="text" size="small" class="px-1">
              <VIcon start size="small">mdi-arrow-left</VIcon>
              {{ backLabel ?? family.breadcrumbLabel }}
            </VBtn>
          </div>

          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">{{ doc.tag }}</VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">{{ doc.title }}</h1>
            <p class="text-body-1 longform-lead">{{ doc.description }}</p>
            <ShareButtons class="mt-4 mb-2" :url="canonicalUrl" :text="doc.title" />
            <p class="text-caption text-medium-emphasis mt-3">
              {{ t('guias.updated', { date: updatedDisplay }) }} · {{ t('guias.byAuthor') }}
              <a
                class="longform-author"
                href="https://www.linkedin.com/in/eduardo-airaudo/"
                target="_blank"
                rel="noopener noreferrer"
                >Eduardo Airaudo</a
              >
            </p>
          </header>

          <VDivider class="mb-6" />

          <!-- Live/data block a family renders above the prose -->
          <slot name="lead" />

          <LongformArticle :doc="doc" :default-related="defaultRelated">
            <template #after-sections>
              <slot name="after-sections" />
            </template>
          </LongformArticle>

          <VCard class="longform-cta my-8 pa-6 text-center" variant="flat">
            <h2 class="text-h6 font-weight-bold mb-2">{{ ctaTitle ?? t('guias.ctaTitle') }}</h2>
            <p class="text-body-2 text-medium-emphasis mb-4">{{ ctaText ?? t('guias.ctaText') }}</p>
            <VBtn :to="localePath(ctaTo ?? '/')" color="primary" variant="elevated">
              <VIcon start>mdi-chart-line</VIcon>
              {{ ctaButton ?? t('guias.ctaButton') }}
            </VBtn>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import type { LongformFamily } from '~/composables/useLongformSeo'
import type { LongformDoc, LongformLink } from '~/utils/longform'

withDefaults(
  defineProps<{
    doc: LongformDoc
    family: LongformFamily
    canonicalUrl: string
    updatedDisplay: string
    defaultRelated?: readonly LongformLink[]
    backLabel?: string
    ctaTitle?: string
    ctaText?: string
    ctaButton?: string
    ctaTo?: string
  }>(),
  { defaultRelated: () => [] }
)

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<style scoped>
.longform-lead {
  line-height: 1.7;
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.longform-author {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
  font-weight: 600;
}
.longform-author:hover {
  text-decoration: underline;
}

.longform-cta {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}
</style>
