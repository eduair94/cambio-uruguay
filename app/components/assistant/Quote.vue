<template>
  <a
    class="quote"
    :href="block.moreUrl"
    target="_blank"
    rel="noopener"
    data-link-area="assistant_cards"
    :aria-label="`${block.label} ${block.value}. ${block.caption}. Ver cotizaciones`"
  >
    <span class="quote-icon">
      <VIcon icon="mdi-swap-horizontal" size="20" />
    </span>
    <span class="quote-text">
      <span class="quote-label">{{ block.label }}</span>
      <span class="quote-value">{{ block.value }}</span>
      <span class="quote-caption">{{ block.caption }}</span>
    </span>
    <VIcon icon="mdi-chevron-right" size="20" class="quote-go" />
  </a>
</template>

<script setup lang="ts">
import type { QuoteBlock } from '~/utils/chatResults'

defineProps<{ block: QuoteBlock }>()
</script>

<style scoped>
.quote {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  text-decoration: none;
  transition: box-shadow 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.quote:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}
.quote-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-link));
}
.quote-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.quote-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  color: rgba(var(--v-theme-on-surface), 0.66);
}
.quote-value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.quote-caption {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.76);
}
.quote-go {
  margin-left: auto;
  color: rgba(var(--v-theme-on-surface), 0.4);
}
</style>
