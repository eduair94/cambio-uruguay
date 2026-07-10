<template>
  <section v-reveal class="ecosystem-section py-10">
    <VContainer>
      <VRow>
        <VCol cols="12" class="text-center mb-6">
          <h2 class="text-h4 font-weight-bold mb-4">{{ t('ecosystem.title') }}</h2>
          <p class="text-body-1 text-grey-lighten-1">{{ t('ecosystem.subtitle') }}</p>
        </VCol>
      </VRow>

      <ul class="ecosystem-list">
        <li v-for="link in ECOSYSTEM_LINKS" :key="link.id" class="ecosystem-item">
          <NuxtLink v-if="link.internal" :to="localePath(link.url)" class="ecosystem-link">
            <VIcon size="18" class="ecosystem-icon">{{ link.icon }}</VIcon>
            <span>{{ t(`ecosystem.links.${link.id}`) }}</span>
          </NuxtLink>
          <a
            v-else
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="ecosystem-link"
          >
            <VIcon size="18" class="ecosystem-icon">{{ link.icon }}</VIcon>
            <span>{{ t(`ecosystem.links.${link.id}`) }}</span>
          </a>
        </li>
      </ul>
    </VContainer>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { ECOSYSTEM_LINKS } from '~/utils/ecosystem'

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<style scoped>
.ecosystem-list {
  list-style: none;
  padding: 0;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;
  max-width: 860px;
}

.ecosystem-item {
  display: inline-flex;
}

/* Mirrors the hero trust pills (see TrustBar.vue) so the two credibility
   surfaces read as one system. */
.ecosystem-link {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.95rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1;
  color: rgba(255, 255, 255, 0.92);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  text-decoration: none;
  white-space: nowrap;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.ecosystem-link:hover,
.ecosystem-link:focus-visible {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.28);
  transform: translateY(-2px);
}

.ecosystem-link:focus-visible {
  outline: 2px solid #7dd3fc;
  outline-offset: 2px;
}

.ecosystem-icon {
  flex-shrink: 0;
}

.v-theme--light .ecosystem-link {
  color: #16233b;
  background: rgba(255, 255, 255, 0.72);
  border-color: rgba(15, 23, 42, 0.12);
}

.v-theme--light .ecosystem-link:hover,
.v-theme--light .ecosystem-link:focus-visible {
  background: #ffffff;
  border-color: rgba(37, 99, 235, 0.4);
}

.v-theme--light .ecosystem-link:focus-visible {
  outline: 2px solid #1d4ed8;
  outline-offset: 2px;
}

@media (max-width: 600px) {
  .ecosystem-link {
    font-size: 0.78rem;
    padding: 0.4rem 0.75rem;
  }
}
</style>
