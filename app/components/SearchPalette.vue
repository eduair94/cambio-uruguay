<template>
  <VDialog
    v-model="open"
    :fullscreen="smAndDown"
    width="640"
    scrollable
    class="search-palette-dialog"
    @after-enter="onOpened"
    @after-leave="onClosed"
  >
    <VCard class="search-palette">
      <div class="search-palette__input-row">
        <VIcon class="search-palette__leading">mdi-magnify</VIcon>
        <input
          ref="inputEl"
          v-model="query"
          class="search-palette__input"
          type="text"
          role="combobox"
          autocomplete="off"
          spellcheck="false"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-controls="cu-search-listbox"
          :aria-expanded="hasResults ? 'true' : 'false'"
          :aria-activedescendant="activeDescendant"
          :aria-label="$t('search.ariaInput')"
          :placeholder="$t('search.placeholder')"
          @keydown="onKeydown"
        />
        <VBtn
          icon="mdi-close"
          variant="text"
          size="small"
          :aria-label="$t('search.close')"
          @click="open = false"
        />
      </div>

      <VDivider />

      <VCardText class="search-palette__body">
        <!-- Pinned numeric conversion, e.g. "100 usd". Rendered above the
             scored rows and reachable with Enter when nothing else matched. -->
        <ul v-if="amountHit" class="search-palette__pinned" role="presentation">
          <li
            class="search-palette__pinned-row"
            :class="{ 'search-palette__pinned-row--active': activeIndex === -1 }"
            @mousemove="onPinnedPointerMove"
            @click="selectAmount"
          >
            <VIcon class="search-palette__leading" size="small">mdi-swap-horizontal</VIcon>
            <span class="search-palette__pinned-text">
              <span class="search-palette__pinned-title">{{ amountHit.title }}</span>
              <span class="search-palette__pinned-value">{{ amountPreview }}</span>
            </span>
            <VChip size="x-small" variant="tonal">{{ $t('search.type.convert') }}</VChip>
          </li>
        </ul>

        <!-- Empty query: recents, then curated suggestions. -->
        <template v-if="!query">
          <template v-if="recents.length">
            <div class="search-palette__group-row">
              <span class="search-palette__group">{{ $t('search.recents') }}</span>
              <VBtn size="x-small" variant="text" @click="clearRecents">
                {{ $t('search.clearRecents') }}
              </VBtn>
            </div>
            <ul class="search-palette__simple" role="presentation">
              <li v-for="item in recents" :key="item.id" @click="go(item.to)">
                <VIcon size="small">{{ item.icon }}</VIcon>
                <span>{{ item.title }}</span>
              </li>
            </ul>
          </template>

          <span class="search-palette__group">{{ $t('search.suggestions') }}</span>
          <ul class="search-palette__simple" role="presentation">
            <li v-for="doc in suggestions" :key="doc.id" @click="onSelect(doc)">
              <VIcon size="small">{{ doc.icon }}</VIcon>
              <span>{{ doc.title }}</span>
            </li>
          </ul>
        </template>

        <!-- The index chunk is still loading on this first open. -->
        <div v-else-if="!docs.length" class="search-palette__skeleton">
          <div v-for="n in 3" :key="n" class="search-palette__skeleton-row" />
        </div>

        <template v-else-if="hasResults">
          <p v-if="isSuggestion" class="search-palette__did-you-mean">
            {{ $t('search.didYouMean') }}
          </p>
          <SearchResults
            mode="listbox"
            :rows="rows"
            :active-index="activeIndex"
            @activate="activeIndex = $event"
            @select="onSelect"
          />
          <NuxtLink
            class="search-palette__see-all"
            data-cta="search-see-all"
            :to="seeAllTo"
            @click="open = false"
          >
            {{ $t('search.seeAll') }}
            <VIcon size="small">mdi-arrow-right</VIcon>
          </NuxtLink>
        </template>

        <div v-else-if="!amountHit" class="search-palette__empty">
          <VIcon size="32">mdi-magnify-close</VIcon>
          <p>{{ $t('search.empty', { q: query }) }}</p>
          <NuxtLink :to="localePath('/mapa-del-sitio')" @click="open = false">
            {{ $t('search.browseSitemap') }}
          </NuxtLink>
        </div>
      </VCardText>

      <p class="sr-only" role="status" aria-live="polite">{{ liveMessage }}</p>
    </VCard>
  </VDialog>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'

import type { AmountHit } from '~/utils/searchIndex'
import { amountLabel } from '~/utils/convert'
import type { CurrencyCode } from '~/utils/currencyPages'
import { POPULAR, flattenResults, scoreDocs, type SearchDoc } from '~/utils/siteNav'

const open = defineModel<boolean>({ required: true })

// `useDisplay().mobile` is true below `lg` (1280px), which would make the dialog
// fullscreen on ordinary laptops. Fullscreen is a phone/tablet affordance.
const { smAndDown } = useDisplay()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()
const { cycle, mode } = useThemeMode()
const { bestSell, bestBuy } = useExchangeRates()
const track = useTrack()

const RECENTS_KEY = 'cu_search_recents'
const RECENTS_MAX = 5

interface RecentItem {
  id: string
  to: string
  title: string
  icon: string
}

const inputEl = ref<HTMLInputElement | null>(null)
const query = ref('')
const activeIndex = ref(0)
const docs = ref<SearchDoc[]>([])
const recents = ref<RecentItem[]>([])
const amountHit = ref<AmountHit | null>(null)
/** The element that had focus when the palette opened, restored on close. */
let triggerEl: HTMLElement | null = null
/** The catalogue chunk, imported lazily on first open and kept for rebuilds. */
let indexModule: typeof import('~/utils/searchIndex') | null = null

const results = computed(() => (query.value ? scoreDocs(query.value, docs.value) : []))
const hasResults = computed(() => results.value.length > 0)
const isSuggestion = computed(() => results.value.some(r => r.suggestion))

/** Top 8 rows, strictly best-first, numbered in reading order. */
const layout = computed(() => flattenResults(results.value, 8))
const rows = computed(() => layout.value.rows)
const flatDocs = computed(() => layout.value.docs)

const suggestions = computed(() =>
  POPULAR.map(route => docs.value.find(d => d.to === route)).filter(
    Boolean as unknown as (d: SearchDoc | undefined) => d is SearchDoc
  )
)

/** The pinned conversion row occupies index -1, above the scored rows. */
const minIndex = computed(() => (amountHit.value ? -1 : 0))

const activeDescendant = computed(() =>
  activeIndex.value >= 0 && hasResults.value ? `cu-search-opt-${activeIndex.value}` : undefined
)

const seeAllTo = computed(() => `${localePath('/buscar')}?q=${encodeURIComponent(query.value)}`)

const liveMessage = computed(() => {
  if (!query.value) return ''
  if (!hasResults.value && !amountHit.value) return t('search.noResultsAria')
  const n = results.value.length
  return n === 1 ? t('search.oneResult') : t('search.resultsCount', { n })
})

/** The exact typed amount, converted with today's best public rate. */
const amountPreview = computed(() => {
  const hit = amountHit.value
  if (!hit) return ''
  const foreign = (hit.from === 'UYU' ? hit.to : hit.from) as unknown as CurrencyCode
  const rate = hit.to === 'UYU' ? bestSell(foreign) : bestBuy(foreign)
  const label = amountLabel(hit.amount, hit.from)
  if (!rate) return label
  const converted = hit.to === 'UYU' ? hit.amount * rate : hit.amount / rate
  return `${label} ≈ ${converted.toLocaleString('es-UY', { maximumFractionDigits: 2 })} ${
    hit.to === 'UYU' ? 'UYU' : hit.to
  }`
})

function rebuildIndex() {
  if (!indexModule) return
  docs.value = indexModule.buildSearchIndex({ locale: locale.value, t, themeMode: mode.value })
}

/**
 * Load the catalogue chunk. Deferred to the first open so the ~220-doc index
 * and its catalogues never enter the bundle of a session that never searches.
 */
async function loadIndex() {
  if (indexModule) return
  indexModule = await import('~/utils/searchIndex')
  rebuildIndex()
  if (query.value) {
    // Someone typed while the chunk was still in flight, so the query watcher
    // ran without a parser. Re-derive the parse and the selection now, or a
    // numeric query keeps a stale cursor on the first scored row.
    amountHit.value = indexModule.parseAmountQuery(query.value)
    activeIndex.value = minIndex.value
  }
}

// `immediate` matters: the layout flips `paletteActivated` and `paletteOpen` in
// the same tick, so this component is created with `open` already true and a
// plain watcher would never see the transition — the index would never load.
watch(
  open,
  isOpen => {
    if (!isOpen) return
    // Capture the opener NOW, synchronously: by `@after-enter` the dialog has
    // already taken focus, so we would restore focus to the dialog itself.
    triggerEl = import.meta.client ? (document.activeElement as HTMLElement | null) : null
    void loadIndex()
  },
  { immediate: true }
)

// The theme action's label names the current mode, so it goes stale the moment
// someone uses it. Rebuild the (cheap, pure) index whenever the mode changes.
watch(mode, rebuildIndex)

watch(query, q => {
  amountHit.value = indexModule ? indexModule.parseAmountQuery(q) : null
  // Index -1 is the pinned conversion row. When someone types "100 usd" that IS
  // the answer, so it must be what Enter picks — otherwise a scored row wins,
  // and "100" happens to be a substring of the prebaked "1000 dólares" page.
  activeIndex.value = minIndex.value
})

// Same synthetic-mousemove guard the results list uses: a cursor resting over
// this row must not re-select it on every re-render.
let lastPinnedX = Number.NaN
let lastPinnedY = Number.NaN

function onPinnedPointerMove(event: MouseEvent) {
  if (event.clientX === lastPinnedX && event.clientY === lastPinnedY) return
  lastPinnedX = event.clientX
  lastPinnedY = event.clientY
  activeIndex.value = -1
}

function onOpened() {
  inputEl.value?.focus()
}

function onClosed() {
  query.value = ''
  activeIndex.value = 0
  amountHit.value = null
  triggerEl?.focus()
  triggerEl = null
}

function onKeydown(event: KeyboardEvent) {
  const total = flatDocs.value.length
  const min = minIndex.value
  const max = total - 1
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      activeIndex.value = activeIndex.value >= max ? min : activeIndex.value + 1
      break
    case 'ArrowUp':
      event.preventDefault()
      activeIndex.value = activeIndex.value <= min ? Math.max(max, min) : activeIndex.value - 1
      break
    case 'Home':
      event.preventDefault()
      activeIndex.value = min
      break
    case 'End':
      event.preventDefault()
      activeIndex.value = Math.max(max, min)
      break
    case 'Enter': {
      event.preventDefault()
      const doc = flatDocs.value[activeIndex.value]
      if (doc) onSelect(doc)
      else if (amountHit.value) selectAmount()
      break
    }
    case 'Escape':
      event.preventDefault()
      open.value = false
      break
  }
}

function rememberRecent(doc: SearchDoc) {
  if (!doc.to) return
  const entry: RecentItem = { id: doc.id, to: doc.to, title: doc.title, icon: doc.icon }
  recents.value = [entry, ...recents.value.filter(r => r.id !== doc.id)].slice(0, RECENTS_MAX)
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.value))
  } catch {
    /* private mode / quota — recents just won't persist */
  }
}

function clearRecents() {
  recents.value = []
  try {
    window.localStorage.removeItem(RECENTS_KEY)
  } catch {
    /* nothing to clear */
  }
}

function go(to: string) {
  open.value = false
  void navigateTo(localePath(to))
}

function onSelect(doc: SearchDoc) {
  const rank = flatDocs.value.findIndex(d => d.id === doc.id)
  track('search_select', { q: query.value, to: doc.to ?? doc.id, type: doc.type, rank })

  if (doc.action?.kind === 'theme') {
    // Stay open: cycling the theme is a setting, not a destination.
    cycle()
    return
  }
  if (doc.action?.kind === 'lang' && doc.action.arg) {
    track('search_action', { kind: 'lang', to: doc.action.arg })
    open.value = false
    void navigateTo(switchLocalePath(doc.action.arg as 'es' | 'en' | 'pt'))
    return
  }
  if (!doc.to) return
  rememberRecent(doc)
  go(doc.to)
}

function selectAmount() {
  const hit = amountHit.value
  if (!hit) return
  track('search_convert', {
    q: query.value,
    from: hit.from,
    to: hit.to,
    amount: hit.amount,
    prebaked: hit.prebaked,
  })
  go(hit.navTo)
}

// GA4: which queries dead-end? Debounced so a query isn't counted mid-typing.
let noResultTimer: ReturnType<typeof setTimeout> | undefined
watch([query, hasResults, amountHit], () => {
  clearTimeout(noResultTimer)
  if (!query.value || hasResults.value || amountHit.value) return
  noResultTimer = setTimeout(() => track('search_no_results', { q: query.value }), 400)
})

onMounted(() => {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY)
    if (raw) recents.value = JSON.parse(raw) as RecentItem[]
  } catch {
    recents.value = []
  }
})

onUnmounted(() => clearTimeout(noResultTimer))
</script>

<style scoped lang="scss">
.search-palette {
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  // The dialog teleports out of `.v-application`, where it does not reliably
  // pick up the card surface — without this the panel renders see-through and
  // the page shows through the results.
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}

.search-palette__input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
}

.search-palette__input {
  flex: 1 1 auto;
  min-width: 0;
  padding: 6px 0;
  border: 0;
  background: transparent;
  color: rgb(var(--v-theme-on-surface));
  font-size: 1.05rem;
  outline: none;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
}

.search-palette__leading {
  opacity: 0.7;
}

.search-palette__body {
  min-height: 220px;
  padding: 0 0 8px;
}

.search-palette__group-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 8px;
}

.search-palette__group {
  display: block;
  padding: 10px 16px 4px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

.search-palette__simple,
.search-palette__pinned {
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    cursor: pointer;
    border-left: 3px solid transparent;

    &:hover {
      background-color: rgba(var(--v-theme-info), 0.14);
      border-left-color: rgb(var(--v-theme-info));
    }
  }
}

.search-palette__pinned-row--active {
  background-color: rgba(var(--v-theme-info), 0.14);
  border-left-color: rgb(var(--v-theme-info)) !important;
}

.search-palette__pinned-text {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
}

.search-palette__pinned-title {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-palette__pinned-value {
  font-size: 0.82rem;
  color: rgb(var(--v-theme-info));
}

.search-palette__did-you-mean {
  padding: 12px 16px 0;
  font-size: 0.85rem;
  opacity: 0.75;
}

.search-palette__see-all {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  color: rgb(var(--v-theme-info));
  font-size: 0.85rem;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.search-palette__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 36px 16px;
  text-align: center;
  opacity: 0.85;
}

.search-palette__skeleton {
  padding: 16px;
}

.search-palette__skeleton-row {
  height: 40px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  animation: search-pulse 1.2s ease-in-out infinite;
}

@keyframes search-pulse {
  50% {
    opacity: 0.45;
  }
}

@media (prefers-reduced-motion: reduce) {
  .search-palette__skeleton-row {
    animation: none;
  }
}

.sr-only {
  position: absolute;
  overflow: hidden;
  width: 1px;
  height: 1px;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

// SSR paints the dark theme; light mode is the override.
:global(.v-theme--light) {
  .search-palette__input::placeholder,
  .search-palette__group {
    color: rgba(0, 0, 0, 0.6);
  }

  .search-palette__skeleton-row {
    background: rgba(0, 0, 0, 0.06);
  }

  .search-palette__simple li:hover,
  .search-palette__pinned-row--active {
    background-color: rgba(var(--v-theme-info), 0.1);
  }
}
</style>
