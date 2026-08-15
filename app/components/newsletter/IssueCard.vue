<template>
  <VCard
    class="issue-card h-100 d-flex flex-column"
    :to="localePath(`/newsletter/${issue.date}`)"
    elevation="2"
    hover
    data-testid="newsletter-issue-card"
  >
    <div class="pa-5 d-flex flex-column flex-grow-1">
      <div class="d-flex align-center justify-space-between ga-2 mb-3">
        <VChip size="x-small" color="primary" variant="tonal" class="font-weight-bold">
          {{ formatIssueDate(issue.date) }}
        </VChip>
        <VChip
          v-if="issue.usdRate > 0"
          size="x-small"
          :color="trendStyle.color"
          variant="tonal"
          class="font-weight-bold flex-shrink-0"
        >
          <VIcon start size="x-small">{{ trendStyle.icon }}</VIcon>
          {{ formatIssuePct(issue.usdChangePct) }}
        </VChip>
      </div>

      <h3 class="text-subtitle-1 font-weight-bold mb-2 issue-card__title">{{ issue.title }}</h3>
      <p class="text-body-2 text-medium-emphasis mb-3 issue-card__summary">{{ issue.summary }}</p>

      <div class="mt-auto">
        <span class="text-caption text-link font-weight-medium">
          Ver la edición <VIcon size="14">mdi-arrow-right</VIcon>
        </span>
      </div>
    </div>
  </VCard>
</template>

<script setup lang="ts">
// One archived newsletter issue, as a card.
//
// Shared by `/newsletter/archivo` and the `/newsletter` landing teaser so the
// two lists cannot drift apart — the archive is the site's fastest-growing
// internal-link surface (one new node a day) and a card that renders one way on
// the hub and another on the landing page is the kind of drift nobody notices
// until both look wrong.
import { computed } from 'vue'
import {
  formatIssueDate,
  formatIssuePct,
  issueTrend,
  issueTrendStyle,
  type NewsletterIssueSummary,
} from '~/utils/newsletterIssue'

const props = defineProps<{ issue: NewsletterIssueSummary }>()

const localePath = useLocalePath()

const trendStyle = computed(() => issueTrendStyle(issueTrend(props.issue.usdChangePct)))
</script>

<style scoped>
.issue-card {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  /* The Min-Width Zero Rule: the title can be a long single token (a rate plus
     a long month name) and without this the card's min-content floor widens the
     whole grid row past the viewport. */
  min-width: 0;
}
.v-theme--light .issue-card {
  border-color: rgba(0, 0, 0, 0.1);
}
.issue-card__title {
  line-height: 1.35;
  /* Two lines then ellipsis: the titles are near-uniform in shape ("Dólar en
     Uruguay a $X — 15 de agosto de 2026"), so an uncapped third line on one
     card ragged-edges an otherwise even grid. */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.issue-card__summary {
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
