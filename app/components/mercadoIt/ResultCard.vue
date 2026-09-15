<template>
  <article class="result">
    <div class="meta">
      <span class="stance"
        ><i :style="{ background: meta.color }" aria-hidden="true" />{{ meta.label }}</span
      >
      <span>{{ item.kind === 'post' ? 'Post' : 'Comentario' }}</span>
      <span>{{ date }}</span>
      <span>▲ {{ fmtInt(item.score) }}</span>
      <span v-for="t in item.themes" :key="t" class="theme">{{ THEME_LABELS[t] || t }}</span>
    </div>
    <div class="title">
      <span v-if="item.kind === 'comment'" class="in">En </span>
      <template v-for="(s, i) in titleSegs" :key="`t${i}`">
        <mark v-if="s.hit">{{ s.text }}</mark>
        <template v-else>{{ s.text }}</template>
      </template>
    </div>
    <p v-if="item.excerpt" class="excerpt">
      <template v-for="(s, i) in bodySegs" :key="`b${i}`">
        <mark v-if="s.hit">{{ s.text }}</mark>
        <template v-else>{{ s.text }}</template>
      </template>
    </p>
    <a :href="item.url" target="_blank" rel="noopener nofollow" class="link">Abrir en Reddit</a>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  fmtInt,
  highlightSegments,
  stanceMeta,
  THEME_LABELS,
  type SearchItem,
} from '~/utils/charruadevs'

const props = defineProps<{ item: SearchItem; terms: string[] }>()

const meta = computed(() => stanceMeta(props.item.stance))
// Fecha fija en UTC: la misma en el servidor y en el navegador, sin baile de hidratación.
const date = computed(() => props.item.createdAt.slice(0, 10))
const titleSegs = computed(() => highlightSegments(props.item.title || '(sin título)', props.terms))
const bodySegs = computed(() => highlightSegments(props.item.excerpt, props.terms))
</script>

<style scoped>
.result {
  display: grid;
  gap: 6px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
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
.theme {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 999px;
  padding: 0 8px;
}
.title {
  font-weight: 600;
  font-size: 0.95rem;
  line-height: 1.35;
}
.title .in {
  font-weight: 400;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.excerpt {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.55;
  overflow-wrap: anywhere;
}
mark {
  background: rgba(var(--v-theme-secondary), 0.22);
  color: inherit;
  border-radius: 4px;
  padding: 0 1px;
}
.link {
  font-size: 0.8rem;
  color: rgb(var(--v-theme-link));
  justify-self: start;
}
</style>
