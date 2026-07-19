<template>
  <ul v-if="shown.length" class="reddit-quotes">
    <li v-for="(q, i) in shown" :key="i">
      <a
        :href="q.permalink"
        target="_blank"
        rel="noopener noreferrer nofollow"
        :class="q.polarity < 0 ? 'q-neg' : 'q-pos'"
      >
        <span class="q-text"
          ><span class="q-mark">“</span>{{ q.text }}<span class="q-mark">”</span></span
        >
        <span class="q-meta">
          r/{{ q.sub }} · {{ q.date }}<template v-if="showVotes"> · {{ q.score }} votos</template>
        </span>
      </a>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { RedditQuote } from '~/composables/useRedditSentiment'

const props = withDefaults(
  defineProps<{
    quotes: readonly RedditQuote[]
    /** How many quotes to show. */
    max?: number
    /** Show the upvote count alongside sub + date. */
    showVotes?: boolean
  }>(),
  { max: 3, showVotes: false }
)

const shown = computed(() => (props.quotes ?? []).slice(0, Math.max(0, props.max)))
</script>

<style scoped>
.reddit-quotes {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.reddit-quotes a {
  display: block;
  font-size: 0.78rem;
  line-height: 1.5;
  text-decoration: none;
  border-radius: 8px;
  padding: 6px 8px;
  background: rgba(var(--v-border-color), 0.08);
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.92;
  /* Reddit text is user-written: URLs and long tokens must never widen the card. */
  overflow-wrap: anywhere;
}
.reddit-quotes a:hover,
.reddit-quotes a:focus-visible {
  background: rgba(var(--v-theme-primary), 0.1);
  opacity: 1;
}
.reddit-quotes a.q-neg {
  border-left: 2px solid rgba(220, 38, 38, 0.75);
}
.reddit-quotes a.q-pos {
  border-left: 2px solid rgba(22, 163, 74, 0.75);
}
.q-text {
  display: block;
}
.q-mark {
  opacity: 0.45;
}
.q-meta {
  display: block;
  font-size: 0.68rem;
  opacity: 0.6;
  margin-top: 3px;
}
</style>
