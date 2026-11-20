<template>
  <nav class="assistant-directories" :aria-label="t('title')" data-testid="assistant-directories">
    <h2 class="text-h6 font-weight-bold mb-2">{{ t('title') }}</h2>
    <p class="text-body-2 text-medium-emphasis mb-3">{{ t('intro') }}</p>
    <ul class="assistant-directories__links">
      <li v-for="topic in ASSISTANT_FEATURED_TOPICS" :key="topic">
        <NuxtLink :to="localePath(ASSISTANT_DIRECTORIES[topic].path)">
          {{ t(`names.${topic}`) }}
          <VIcon icon="mdi-arrow-right" size="16" aria-hidden="true" />
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { ASSISTANT_DIRECTORIES, ASSISTANT_FEATURED_TOPICS } from '~/utils/assistantDirectories'
import { assistantDirectoryMessages } from '~/utils/assistantDirectoryMessages'

const { t } = useI18n({ useScope: 'local', messages: assistantDirectoryMessages })
const localePath = useLocalePath()
</script>

<style scoped>
.assistant-directories__links {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 24px;
  list-style: none;
  padding: 0;
  margin: 0;
}
.assistant-directories__links a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 44px;
  padding-block: 10px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.16);
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
}
.assistant-directories__links a:hover {
  text-decoration: underline;
}
.assistant-directories__links a:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
@media (max-width: 399px) {
  .assistant-directories__links {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
