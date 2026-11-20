<template>
  <!-- The mobile menu, in plain markup. It used to be a VList of 12 VListGroups and 263 VListItems:
       the first tap on the hamburger built ~1,000 component instances (288 ms median unthrottled,
       5.6 s at 4x CPU, measured 2026-11-19), and because Vuetify's render functions pass slots
       without `$stable`, every later hover, focus or open/close of the drawer re-rendered all of
       them (2-5 s at 4x), charged to whatever the visitor tapped next. Plain elements have no slotted
       children to force-update, and this component takes no slot and only stable props, so the
       drawer re-rendering skips it entirely.
       The links are ordinary <a href> handled by ONE delegated listener (utils/spaLinks.ts, the same
       as the footer). Collapsed sections are `<ul hidden>`: their links stay in the DOM. -->
  <div class="mobile-nav" @click="onLinkClick">
    <div class="mobile-nav__header">
      <span class="mobile-nav__title text-h6">Menu</span>
      <div class="d-flex align-center">
        <ThemeToggle />
        <VBtn
          icon="mdi-close"
          variant="text"
          size="small"
          :aria-label="t('a11y.close')"
          @click="emit('close')"
        />
      </div>
    </div>

    <VDivider />

    <!-- The parent's onSearchTrigger cancels the navigation and opens the palette; the delegated
         handler below then sees `defaultPrevented` and leaves the click alone. -->
    <a class="mobile-nav__row mobile-nav__link" :href="searchHref" @click="emit('search', $event)">
      <i class="mdi mdi-magnify mobile-nav__icon" aria-hidden="true" />
      <span class="mobile-nav__label">{{ t('search.triggerLabel') }}</span>
    </a>

    <VDivider />

    <div v-for="section in sections" :key="section.id" class="mobile-nav__section">
      <button
        :id="`mobile-nav-toggle-${section.id}`"
        type="button"
        class="mobile-nav__row mobile-nav__toggle"
        :aria-expanded="opened.has(section.id)"
        :aria-controls="`mobile-nav-${section.id}`"
        @click="toggle(section.id)"
      >
        <span class="mobile-nav__label mobile-nav__heading">{{ section.title }}</span>
        <i
          class="mdi mobile-nav__chevron"
          :class="opened.has(section.id) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
          aria-hidden="true"
        />
      </button>
      <ul
        :id="`mobile-nav-${section.id}`"
        class="mobile-nav__list"
        :aria-labelledby="`mobile-nav-toggle-${section.id}`"
        :hidden="!opened.has(section.id)"
      >
        <li v-for="entry in section.entries" :key="entry.id">
          <a
            v-if="entry.external"
            :href="entry.href"
            target="_blank"
            rel="noopener noreferrer"
            class="mobile-nav__row mobile-nav__link"
            @click="emit('close')"
          >
            <i class="mdi mobile-nav__icon" :class="entry.icon" aria-hidden="true" />
            <span class="mobile-nav__label">{{ entry.label }}</span>
          </a>
          <a
            v-else
            :href="entry.href"
            class="mobile-nav__row mobile-nav__link"
            :class="{ 'mobile-nav__link--active': entry.href === current?.href }"
            :aria-current="entry.href === current?.href ? current.kind : undefined"
          >
            <i class="mdi mobile-nav__icon" :class="entry.icon" aria-hidden="true" />
            <span class="mobile-nav__label">{{ entry.label }}</span>
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NAV_SECTIONS } from '~/utils/siteNav'
import { createSpaLinkHandler } from '~/utils/spaLinks'

defineProps<{ searchHref: string }>()
const emit = defineEmits<{ close: []; search: [event: MouseEvent] }>()

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

interface MenuEntry {
  id: string
  href: string
  label: string
  icon: string
  external: boolean
  exact: boolean
}

// Resolved once per locale, not once per render: the template only reads strings.
const sections = computed(() =>
  NAV_SECTIONS.map(section => ({
    id: section.id,
    title: t(section.titleKey),
    entries: section.entries.map((entry): MenuEntry => ({
      id: (entry.to ?? entry.href) as string,
      href: entry.to ? localePath(entry.to) : (entry.href as string),
      label: t(entry.labelKey),
      icon: entry.icon,
      external: !entry.to,
      exact: Boolean(entry.exact),
    })),
  }))
)

const trimSlash = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') : path)

/**
 * The one link that is the current page. `exact` entries (the home) match by equality only;
 * the rest also match as a path prefix, on a segment boundary, so `/dolar` never claims
 * `/dolar-hoy` and the home never claims every page. The longest match wins, so a hub and its
 * child page never both read as current. `page` when it IS the page, `true` for its parent.
 */
const current = computed(() => {
  const path = trimSlash(route.path)
  let best: { href: string; section: string; kind: 'page' | 'true' } | null = null
  for (const section of sections.value) {
    for (const entry of section.entries) {
      if (entry.external) continue
      const href = trimSlash(entry.href)
      const equal = path === href
      const prefix = !entry.exact && href !== '/' && path.startsWith(`${href}/`)
      if (!equal && !prefix) continue
      // Equality is always the longest possible match, so the length alone decides.
      if (!best || href.length > trimSlash(best.href).length) {
        best = { href: entry.href, section: section.id, kind: equal ? 'page' : 'true' }
      }
    }
  }
  return best
})

// Open state. The section that owns the current route opens on its own (the market section
// when none does, as before); a section the visitor opened stays open, and nothing is
// reassigned per navigation.
const opened = reactive(new Set<string>())
watch(
  () => current.value?.section ?? 'market',
  id => opened.add(id),
  { immediate: true }
)

function toggle(id: string) {
  if (opened.has(id)) opened.delete(id)
  else opened.add(id)
}

const onLinkClick = createSpaLinkHandler(path => {
  emit('close')
  return navigateTo(path)
})
</script>

<style scoped>
.mobile-nav {
  padding-block: 8px;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
}

.mobile-nav__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 4px 8px 4px 16px;
}

.mobile-nav__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* One row style for the search link, the section toggles and the entries: 48 px tall, the
   label wraps instead of being cut with an ellipsis (a 288 px drawer cut "Cobrás en dólares,
   gast…" and "Comisiones de transfer…"). */
.mobile-nav__row {
  display: flex;
  align-items: center;
  gap: 32px;
  width: 100%;
  min-height: 48px;
  padding: 8px 16px;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-size: 1rem;
  letter-spacing: 0.009375em;
  line-height: 1.3;
  text-align: start;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.mobile-nav__label {
  flex: 1 1 auto;
  min-width: 0;
  white-space: normal;
  overflow-wrap: anywhere;
}

.mobile-nav__heading {
  font-weight: 500;
}

.mobile-nav__icon,
.mobile-nav__chevron {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 24px;
  line-height: 1;
  font-style: normal;
}

.mobile-nav__icon {
  opacity: var(--v-medium-emphasis-opacity);
}

.mobile-nav__row:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.04);
}

.mobile-nav__row:focus-visible {
  outline: 2px solid rgb(var(--v-theme-info));
  outline-offset: -2px;
}

.mobile-nav__link--active,
.mobile-nav__link--active:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.12);
}
</style>
