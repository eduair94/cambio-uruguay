<template>
  <VCard variant="outlined" class="quote pa-4 h-100">
    <div class="meta">
      <span class="stance"
        ><i :style="{ background: meta.color }" aria-hidden="true" />{{ meta.label }}</span
      >
      <span>{{ quote.date }}</span>
      <span>▲ {{ fmtInt(quote.score) }}</span>
    </div>
    <blockquote class="text">{{ text }}</blockquote>
    <div class="thread">
      En «{{ thread }}» ·
      <a :href="quote.url" target="_blank" rel="noopener nofollow">ver en Reddit</a>
    </div>
  </VCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { fmtInt, stanceMeta, type Quote } from '~/utils/charruadevs'

const props = defineProps<{ quote: Quote }>()

const meta = computed(() => stanceMeta(props.quote.stance))
const text = computed(() =>
  props.quote.text.length > 480
    ? `${props.quote.text.slice(0, 460).replace(/\s+\S*$/, '')} […]`
    : props.quote.text
)
const thread = computed(() =>
  props.quote.thread.length > 90 ? `${props.quote.thread.slice(0, 88)}…` : props.quote.thread
)
</script>

<style scoped>
.quote {
  display: grid;
  gap: 10px;
  align-content: start;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  align-items: center;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.stance {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}
.stance i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}
.text {
  margin: 0;
  font-size: 0.97rem;
  line-height: 1.55;
  overflow-wrap: anywhere;
}
.thread {
  font-size: 0.8rem;
  line-height: 1.35;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.thread a {
  color: rgb(var(--v-theme-link));
}
</style>
