<template>
  <section class="ranking-tier-board" :aria-label="ariaLabel">
    <div v-for="tier in RANKING_TIERS" :key="tier.id" class="ranking-tier-row" :data-tier="tier.id">
      <div class="ranking-tier-label" :style="tierStyle(tier.id)">{{ tier.id }}</div>
      <div class="ranking-tier-content">
        <p class="ranking-tier-blurb">{{ tier.blurb }}</p>
        <div class="ranking-tier-items">
          <a
            v-for="item in itemsFor(tier.id)"
            :key="item.id"
            class="ranking-tier-item"
            :href="item.href"
          >
            <span class="ranking-tier-mono" :style="monoStyle(item.brandId ?? item.id)">
              {{ monogram(item.name) }}
            </span>
            <span class="ranking-tier-name">{{ item.name }}</span>
            <span class="ranking-tier-score">{{ item.score }}</span>
          </a>
          <span v-if="!itemsFor(tier.id).length" class="ranking-tier-empty">Sin opciones</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { monogram, monoStyle, readableOn } from '~/utils/brandColors'
import { RANKING_TIERS, rankingTierForScore, type RankingTierId } from '~/utils/rankingTiers'

export interface RankingTierItem {
  id: string
  name: string
  score: number
  href: string
  brandId?: string
}

const props = defineProps<{
  items: readonly RankingTierItem[]
  ariaLabel: string
}>()

const TIER_COLORS: Record<RankingTierId, string> = {
  S: '#0f9f6e',
  A: '#22a447',
  B: '#84a91f',
  C: '#d39a12',
  D: '#e46f16',
  F: '#cf3e45',
}

function itemsFor(tier: RankingTierId): readonly RankingTierItem[] {
  return props.items.filter(item => rankingTierForScore(item.score) === tier)
}

function tierStyle(tier: RankingTierId): Record<string, string> {
  const background = TIER_COLORS[tier]
  return { background, color: readableOn(background) }
}
</script>

<style scoped>
.ranking-tier-board {
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
}

.ranking-tier-row {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  min-height: 108px;
  background: rgba(var(--v-theme-surface), 0.75);
}

.ranking-tier-row + .ranking-tier-row {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.ranking-tier-label {
  display: grid;
  place-items: center;
  font-size: 2rem;
  font-weight: 950;
  letter-spacing: -0.06em;
}

.ranking-tier-content {
  min-width: 0;
  padding: 12px 14px 14px;
}

.ranking-tier-blurb {
  margin: 0 0 9px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.76rem;
  opacity: 0.66;
}

.ranking-tier-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ranking-tier-item {
  display: inline-flex;
  min-width: 164px;
  max-width: 260px;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: rgb(var(--v-theme-surface));
  color: inherit;
  text-decoration: none;
  transition:
    border-color 150ms ease,
    transform 150ms ease;
}

.ranking-tier-item:hover,
.ranking-tier-item:focus-visible {
  border-color: rgb(var(--v-theme-primary));
  transform: translateY(-1px);
}

.ranking-tier-item:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.ranking-tier-mono {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  place-items: center;
  border-radius: 9px;
  font-size: 0.68rem;
  font-weight: 900;
}

.ranking-tier-name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  font-size: 0.78rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ranking-tier-score {
  font-size: 0.78rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.ranking-tier-empty {
  padding: 8px 2px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.76rem;
  opacity: 0.42;
}

@media (max-width: 599px) {
  .ranking-tier-row {
    grid-template-columns: 52px minmax(0, 1fr);
  }

  .ranking-tier-label {
    font-size: 1.55rem;
  }

  .ranking-tier-content {
    padding: 10px;
  }

  .ranking-tier-item {
    width: 100%;
    max-width: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ranking-tier-item {
    transition: none;
  }
}
</style>
