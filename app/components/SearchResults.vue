<template>
  <!-- Palette: an ARIA combobox popup. Real DOM focus stays on the input; the
       virtual cursor is carried by aria-activedescendant, so we render plain
       listbox/option semantics rather than VList (whose implicit list/listitem
       roles would collide). -->
  <ul
    v-if="mode === 'listbox'"
    id="cu-search-listbox"
    class="search-results search-results--listbox"
    role="listbox"
    :aria-label="$t('search.ariaListbox')"
  >
    <li
      v-for="row in rows"
      :id="`cu-search-opt-${row.idx}`"
      :key="row.doc.id"
      class="search-results__item"
      :class="{ 'search-results__item--active': row.idx === activeIndex }"
      role="option"
      :aria-selected="row.idx === activeIndex"
      @mousemove="onPointerMove($event, row.idx)"
      @click="$emit('select', row.doc)"
    >
      <VIcon class="search-results__icon" size="small">{{ row.doc.icon }}</VIcon>
      <span class="search-results__text">
        <span class="search-results__title">{{ row.doc.title }}</span>
        <span v-if="row.doc.description" class="search-results__desc">
          {{ row.doc.description }}
        </span>
      </span>
      <VChip class="search-results__type" size="x-small" variant="tonal">
        {{ $t(`search.type.${row.doc.type}`) }}
      </VChip>
    </li>
  </ul>

  <!-- /buscar: the same grouping as crawlable anchors, no listbox semantics. -->
  <div v-else class="search-results search-results--links">
    <section v-for="group in groups" :key="group.id" class="search-results__section">
      <h2 class="search-results__heading">{{ $t(`search.section.${group.id}`) }}</h2>
      <ul class="search-results__list">
        <li v-for="row in group.items" :key="row.doc.id" class="search-results__link-item">
          <NuxtLink :to="localePath(row.doc.to ?? '/')" class="search-results__link">
            <VIcon class="search-results__icon" size="small">{{ row.doc.icon }}</VIcon>
            <span class="search-results__text">
              <span class="search-results__title">{{ row.doc.title }}</span>
              <span v-if="row.doc.description" class="search-results__desc">
                {{ row.doc.description }}
              </span>
            </span>
            <VChip class="search-results__type" size="x-small" variant="tonal">
              {{ $t(`search.type.${row.doc.type}`) }}
            </VChip>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ResultGroup, ResultRow, SearchDoc } from '~/utils/siteNav'

defineProps<{
  /** `listbox` renders the palette's flat, strictly best-first option list;
   *  `links` renders the SSR /buscar page's crawlable, section-grouped anchors. */
  mode: 'listbox' | 'links'
  /** Rows in score order. Required in `listbox` mode. */
  rows?: ResultRow[]
  /** Sections in best-hit order. Required in `links` mode. */
  groups?: ResultGroup[]
  /** Index of the virtually focused row (listbox mode only). */
  activeIndex?: number
}>()

const emit = defineEmits<{
  (e: 'select', doc: SearchDoc): void
  (e: 'activate', idx: number): void
}>()

const localePath = useLocalePath()

// Chrome fires a synthetic mousemove when the content under a stationary cursor
// changes. Without this guard, results rendering beneath the pointer silently
// hijack the selection — which is how a query like "100 usd" lost its pinned
// conversion row to whatever landed under the mouse.
let lastX = Number.NaN
let lastY = Number.NaN

function onPointerMove(event: MouseEvent, idx: number) {
  if (event.clientX === lastX && event.clientY === lastY) return
  lastX = event.clientX
  lastY = event.clientY
  emit('activate', idx)
}
</script>

<style scoped lang="scss">
.search-results {
  margin: 0;
  padding: 0;
  list-style: none;
}

.search-results__group,
.search-results__heading {
  padding: 10px 16px 4px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

.search-results__item,
.search-results__link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  border-left: 3px solid transparent;
}

.search-results__item--active,
.search-results__link:hover,
.search-results__link:focus-visible {
  background-color: rgba(var(--v-theme-info), 0.14);
  border-left-color: rgb(var(--v-theme-info));
}

.search-results__icon {
  flex: 0 0 auto;
  opacity: 0.75;
}

.search-results__text {
  display: flex;
  min-width: 0;
  flex-direction: column;
  flex: 1 1 auto;
}

.search-results__title {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-results__desc {
  overflow: hidden;
  font-size: 0.78rem;
  opacity: 0.7;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-results__type {
  flex: 0 0 auto;
}

.search-results__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.search-results__section {
  margin-bottom: 20px;
}

// The site renders dark first (SSR default), so light mode is the override:
// the muted whites above would vanish on a white surface.
:global(.v-theme--light) {
  .search-results__group,
  .search-results__heading {
    color: rgba(0, 0, 0, 0.6);
  }

  .search-results__item--active,
  .search-results__link:hover,
  .search-results__link:focus-visible {
    background-color: rgba(var(--v-theme-info), 0.1);
  }
}
</style>
