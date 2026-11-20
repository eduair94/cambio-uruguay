<template>
  <section class="links" :aria-label="block.title">
    <h3 class="links-title">
      <VIcon
        :icon="
          block.variant === 'news'
            ? 'mdi-newspaper-variant-outline'
            : 'mdi-book-open-page-variant-outline'
        "
        size="18"
      />
      {{ block.title }}
    </h3>
    <ol class="links-list" data-link-area="assistant_sources">
      <li v-for="(item, i) in block.items" :key="item.url">
        <a :href="item.url" target="_blank" rel="noopener" class="link">
          <span class="n" aria-hidden="true">{{ i + 1 }}</span>
          <span class="link-text">
            <span class="link-title">{{ item.title }}</span>
            <span class="link-meta">{{ meta(item) }}</span>
            <span v-if="item.snippet" class="link-snippet">{{ item.snippet }}</span>
          </span>
        </a>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import type { LinkItem, LinksBlock } from '~/utils/chatResults'

defineProps<{ block: LinksBlock }>()

/**
 * Where it lives: the path on this site, or the outlet's domain. A news item's link is Google
 * News's redirect, so its own outlet (already in `meta`) is the only useful "where".
 */
function meta(item: LinkItem): string {
  let where = ''
  try {
    const url = new URL(item.url)
    const host = url.hostname.replace(/^www\./, '')
    where =
      host === 'cambio-uruguay.com' ? url.pathname : /(?:^|\.)news\.google\./.test(host) ? '' : host
  } catch {
    /* no "where" for a URL that does not parse */
  }
  return [where, item.meta].filter(Boolean).join(' · ')
}
</script>

<style scoped>
.links {
  min-width: 0;
}
.links-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
  font-size: 1rem;
  font-weight: 700;
}
.links-title :deep(.v-icon) {
  color: rgb(var(--v-theme-link));
}
.links-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.link {
  display: flex;
  gap: 8px;
  height: 100%;
  min-width: 0;
  padding: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  text-decoration: none;
  transition: border-color 160ms ease-out;
}
.link:hover {
  border-color: rgb(var(--v-theme-primary));
}
.n {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(var(--v-theme-on-surface), 0.08);
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.link-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.link-title {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.4;
  color: rgb(var(--v-theme-link));
}
.link-meta {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.66);
  overflow-wrap: anywhere;
}
.link-snippet {
  font-size: 0.8rem;
  line-height: 1.35;
  color: rgba(var(--v-theme-on-surface), 0.76);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
