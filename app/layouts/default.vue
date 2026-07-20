<template>
  <VApp>
    <!-- Keyboard / screen-reader skip link: first focusable element, jumps past
         the nav straight to the page content. -->
    <a class="skip-link" href="#main">{{ $t('a11y.skipToContent') }}</a>

    <!-- Navigation Drawer for mobile. Every item is generated from NAV_SECTIONS,
         so the drawer can no longer drift away from the desktop nav (it used to
         be a hand-written list that had silently lost /mapa and /estado). -->
    <VNavigationDrawer
      v-model="drawer"
      location="left"
      temporary
      width="288"
      class="mobile-navigation-drawer"
      :aria-label="$t('a11y.primaryNav')"
    >
      <!-- The drawer itself is the <nav> landmark (labelled above). Neutralise
           Vuetify's default role=listbox on the inner list (its mixed link/button/
           divider children aren't listbox options) so it's a plain container — the
           links inside remain the navigable content. -->
      <VList v-model:opened="openGroups" role="presentation" tabindex="-1">
        <VListItem>
          <VListItemTitle class="text-h6"> Menu </VListItemTitle>
          <template #append>
            <div class="d-flex align-center">
              <ThemeToggle />
              <VBtn
                icon="mdi-close"
                variant="text"
                size="small"
                :aria-label="$t('a11y.close')"
                @click="drawer = false"
              />
            </div>
          </template>
        </VListItem>

        <VDivider />

        <VListItem :href="searchHref" @click="onSearchTrigger">
          <template #prepend>
            <VIcon>mdi-magnify</VIcon>
          </template>
          <VListItemTitle>{{ $t('search.triggerLabel') }}</VListItemTitle>
        </VListItem>

        <VDivider />

        <!-- `fluid` zeroes Vuetify's nested indent. Without it the group inherits
             --parent-padding of one prepend-icon width (40px) plus a 16px indent
             step, pushing every sub-item's icon 72px in while the section headers
             sit at 16px. -->
        <VListGroup v-for="section in navSections" :key="section.id" :value="section.id" fluid>
          <template #activator="{ props: activatorProps }">
            <VListItem v-bind="activatorProps">
              <VListItemTitle class="font-weight-medium">
                {{ $t(section.titleKey) }}
              </VListItemTitle>
            </VListItem>
          </template>

          <template v-for="entry in section.entries" :key="entry.to ?? entry.href">
            <VListItem
              v-if="entry.to"
              :to="localePath(entry.to)"
              :exact="entry.exact"
              @click="drawer = false"
            >
              <template #prepend>
                <VIcon>{{ entry.icon }}</VIcon>
              </template>
              <VListItemTitle>{{ $t(entry.labelKey) }}</VListItemTitle>
            </VListItem>
            <VListItem
              v-else
              :href="entry.href"
              target="_blank"
              rel="noopener noreferrer"
              @click="drawer = false"
            >
              <template #prepend>
                <VIcon>{{ entry.icon }}</VIcon>
              </template>
              <VListItemTitle>{{ $t(entry.labelKey) }}</VListItemTitle>
            </VListItem>
          </template>
        </VListGroup>
      </VList>
    </VNavigationDrawer>

    <VAppBar class="app-bar px-2 px-sm-4" flat>
      <!-- Mobile menu button -->
      <VAppBarNavIcon
        class="d-flex d-lg-none mr-1 mr-sm-2"
        :aria-label="$t('a11y.menu')"
        :title="$t('a11y.menu')"
        @click.stop="drawer = !drawer"
      />

      <!-- Mobile search. A real anchor: before hydration a tap navigates to the
           SSR /buscar page (this app drops pre-hydration clicks), after
           hydration the handler cancels that and opens the palette instead. -->
      <a
        class="search-trigger-icon d-flex d-lg-none"
        :href="searchHref"
        :aria-label="$t('search.triggerLabel')"
        :title="$t('search.triggerLabel')"
        data-cta="search-open-mobile"
        @pointerenter="paletteActivated = true"
        @click="onSearchTrigger"
      >
        <VIcon>mdi-magnify</VIcon>
      </a>

      <NuxtLink :to="localePath('/')" class="no_link d-flex logo_link" :aria-label="$t('inicio')">
        <img
          width="227"
          height="33"
          alt="Cambio Uruguay - Logo oficial para comparar cotizaciones de cambio"
          class="logo_image"
          src="/img/logo.webp"
          loading="eager"
        />
      </NuxtLink>

      <!-- Desktop primary navigation (secondary links live under the "Más" menu) -->
      <nav class="primary-nav d-none d-lg-flex align-center ml-6" :aria-label="$t('a11y.menu')">
        <VBtn
          v-for="item in primaryNav"
          :key="item.to"
          :to="localePath(item.to as string)"
          :exact="item.exact"
          variant="text"
          class="nav-btn text-none"
          :class="{ 'nav-btn--active': isActiveRoute(item.to as string) }"
        >
          <VIcon start size="small">{{ item.icon }}</VIcon>
          {{ navLabel(item) }}
        </VBtn>

        <!-- "Más" is grouped by section rather than a flat list of links. The
             panel is a mega-menu of `MEGA_MENU_COLUMNS` explicit columns (not a
             single-column VList) so 11 sections / ~56 links reflow into short
             columns instead of one column behind a ~78vh scrollbar. Columns are
             pre-balanced by entry count (see `bucketIntoColumns` below) rather
             than left to CSS `columns: N`, whose auto-balance heuristic proved
             ~20% less even than a plain greedy bin-pack against this section's
             very uneven section sizes (3 to 8 entries each). -->
        <VMenu location="bottom start" transition="slide-y-transition">
          <template #activator="{ props, isActive }">
            <VBtn
              v-bind="props"
              variant="text"
              class="nav-btn text-none"
              :class="{ 'nav-btn--active': isActive }"
            >
              <VIcon start size="small">mdi-dots-horizontal</VIcon>
              {{ $t('navMore') }}
              <VIcon end size="small">mdi-chevron-down</VIcon>
            </VBtn>
          </template>
          <div class="mega-menu">
            <nav class="mega-menu__grid" :aria-label="$t('navMore')">
              <div v-for="(column, ci) in megaMenuColumns" :key="ci" class="mega-menu__col">
                <div v-for="section in column" :key="section.id" class="mega-menu__section">
                  <p class="mega-menu__heading">{{ $t(section.titleKey) }}</p>
                  <ul class="mega-menu__list">
                    <li v-for="entry in section.entries" :key="entry.to ?? entry.href">
                      <NuxtLink
                        v-if="entry.to"
                        :to="localePath(entry.to)"
                        class="mega-menu__link"
                        :class="{ 'mega-menu__link--active': isActiveRoute(entry.to) }"
                      >
                        <VIcon size="18" class="mega-menu__icon">{{ entry.icon }}</VIcon>
                        <span class="mega-menu__label">{{ $t(entry.labelKey) }}</span>
                        <span
                          v-if="entry.fresh"
                          class="mega-menu__live"
                          :title="$t('nav.liveDataHint')"
                          :aria-label="$t('nav.liveDataHint')"
                        />
                      </NuxtLink>
                      <a
                        v-else
                        :href="entry.href"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="mega-menu__link"
                      >
                        <VIcon size="18" class="mega-menu__icon">{{ entry.icon }}</VIcon>
                        <span class="mega-menu__label">{{ $t(entry.labelKey) }}</span>
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </nav>
            <div class="mega-menu__footer">
              <NuxtLink :to="localePath('/mapa-del-sitio')" class="mega-menu__all">
                {{ $t('nav.viewFullSitemap') }}
                <VIcon size="16">mdi-arrow-right</VIcon>
              </NuxtLink>
            </div>
          </div>
        </VMenu>
      </nav>

      <VSpacer />

      <!-- Account + language cluster: kept together with its own gap so the login
           CTA never collides with the logo or the nav. -->
      <div class="nav-actions d-flex align-center ga-1 ga-sm-2">
        <!-- Desktop search. Same real-anchor trick as the mobile trigger: it is a
             working link to /buscar until Vue takes over the click. -->
        <a
          class="search-trigger d-none d-lg-flex"
          :href="searchHref"
          :aria-label="$t('search.triggerLabel')"
          aria-keyshortcuts="Control+K"
          data-cta="search-open-desktop"
          @pointerenter="paletteActivated = true"
          @click="onSearchTrigger"
        >
          <VIcon size="small">mdi-magnify</VIcon>
          <!-- Label + shortcut hint only from xl up; below that the pill collapses
               to its icon so the full nav + action cluster fits the bar. -->
          <span class="search-trigger__label d-none d-xl-inline">{{
            $t('search.triggerLabel')
          }}</span>
          <kbd class="search-trigger__kbd d-none d-xl-inline">{{ $t('search.triggerHint') }}</kbd>
        </a>
        <!-- Hidden on phones: the drawer header carries its own ThemeToggle, and
             the 48px it costs here is what pushed the language menu off-screen. -->
        <ThemeToggle class="d-none d-sm-flex" />
        <AccountMenu />
        <LanguageMenu />
      </div>
    </VAppBar>

    <ClientOnly>
      <LazySearchPalette v-if="paletteActivated" v-model="paletteOpen" />
    </ClientOnly>

    <ClientOnly>
      <PWAInstallBanner />
    </ClientOnly>

    <VMain id="main" tabindex="-1" :class="formatNameRoute()">
      <div class="container_custom">
        <slot />
      </div>
    </VMain>

    <Footer />
    <ClientOnly><CookieConsent /></ClientOnly>
    <JoinTwitter />
    <ClientOnly><AuthDialog /></ClientOnly>

    <!-- Memory Monitor for debugging (only shows in development) -->
    <!-- <ClientOnly>
      <MemoryMonitor />
    </ClientOnly> -->
  </VApp>
</template>

<script setup lang="ts">
import { useLocalePath } from '#imports'
import { useLoadingStore } from '~/stores/loading'
import { NAV_SECTIONS, type NavEntry, type NavSection } from '~/utils/siteNav'

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const loadingStore = useLoadingStore()

const formatNameRoute = () => {
  // Format the route name to be used in class names
  return (route.name ? (route.name as string).split('_')[0] : 'default') + '_main'
}

// Navigation drawer state
const drawer = ref(false)

// Route change loading management. router.beforeEach/afterEach add GLOBAL guards
// and return their removers; capture them and dispose on scope teardown so a
// layout swap (error/widget layout) or HMR can't stack duplicate guards.
const removeBeforeEach = router.beforeEach((to, from) => {
  // Only show loading if navigating to a different page and we're on client side
  if (to.path !== from.path && typeof window !== 'undefined') {
    loadingStore.showRouteLoading()
  }
})

const removeAfterEach = router.afterEach(() => {
  // Hide loading after route change completes
  if (typeof window !== 'undefined') {
    nextTick(() => {
      loadingStore.hideRouteLoading()
    })
  }
})

onScopeDispose(() => {
  removeBeforeEach()
  removeAfterEach()
})

// Watch for route changes and ensure drawer is closed
watch(
  () => route.path,
  () => {
    if (drawer.value) {
      drawer.value = false
    }
  }
)

// Methods
const isActiveRoute = (path: string) => {
  if (path === '/') {
    return (
      route.path === '/' || route.path === '/es' || route.path === '/en' || route.path === '/pt'
    )
  }
  return route.path.startsWith(path)
}

// Every navigation surface below is a projection of NAV_SECTIONS (app/utils/siteNav.ts):
// the inline bar, the grouped "Más" menu, the mobile drawer and the footer. Add a
// page there and it appears in all of them; a page that is in none fails the
// `siteNav-coverage` unit test.
const { t } = useI18n()
const navSections = NAV_SECTIONS
const primaryNav = computed(() => NAV_SECTIONS.flatMap(s => s.entries.filter(e => e.primary)))
const moreGroups = computed(() =>
  NAV_SECTIONS.map(s => ({ ...s, entries: s.entries.filter(e => !e.primary) })).filter(
    s => s.entries.length > 0
  )
)

/**
 * Split sections into `columnCount` columns balanced by entry count (a header
 * plus one row per entry), longest section first (LPT scheduling) so no
 * single column ends up disproportionately tall. Columns keep each section's
 * relative order intact and are themselves ordered by their earliest section,
 * so column 1 still opens with whatever leads `NAV_SECTIONS`.
 */
function bucketIntoColumns(sections: readonly NavSection[], columnCount: number) {
  const weighted = sections.map((section, index) => ({
    section,
    index,
    weight: section.entries.length + 1,
  }))
  const byWeightDesc = [...weighted].sort((a, b) => b.weight - a.weight)
  const columns = Array.from({ length: columnCount }, () => ({
    items: [] as typeof weighted,
    total: 0,
  }))
  for (const item of byWeightDesc) {
    const shortest = columns.reduce((min, col) => (col.total < min.total ? col : min))
    shortest.items.push(item)
    shortest.total += item.weight
  }
  return columns
    .map(col => ({
      minIndex: Math.min(...col.items.map(item => item.index)),
      sections: col.items.sort((a, b) => a.index - b.index).map(item => item.section),
    }))
    .sort((a, b) => a.minIndex - b.minIndex)
    .map(col => col.sections)
}

const MEGA_MENU_COLUMNS = 4
const megaMenuColumns = computed(() => bucketIntoColumns(moreGroups.value, MEGA_MENU_COLUMNS))
const navLabel = (entry: NavEntry): string => t(entry.labelKey)

// Open the drawer group that owns the current route, so a mobile visitor lands
// inside the section they are already browsing.
const openGroups = ref<string[]>([])
watch(
  () => route.path,
  () => {
    const section = NAV_SECTIONS.find(s =>
      s.entries.some(e => e.to && e.to !== '/' && route.path.startsWith(e.to))
    )
    openGroups.value = section ? [section.id] : ['market']
  },
  { immediate: true }
)

// Search palette. `paletteActivated` defers loading the component (and, inside
// it, the ~220-document index) until the first hint that someone wants to
// search, so the sessions that never search pay nothing for it.
const paletteOpen = ref(false)
const paletteActivated = ref(false)
const searchHref = computed(() => localePath('/buscar'))
const track = useTrack()

function openPalette() {
  paletteActivated.value = true
  paletteOpen.value = true
}

/**
 * Handle a click on a search trigger.
 *
 * The trigger is a real `<a href="/buscar">`. Before hydration no listener is
 * attached, so the browser follows the link to the server-rendered search page —
 * a dropped first click is impossible. After hydration we cancel the navigation
 * and open the palette instead. Modified clicks keep their native meaning.
 */
function onSearchTrigger(event: MouseEvent) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
  event.preventDefault()
  drawer.value = false
  openPalette()
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  )
}

function onGlobalKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    track('search_open', { source: 'hotkey' })
    openPalette()
    return
  }
  if (event.key === '/' && !event.metaKey && !event.ctrlKey && !isTypingTarget(event.target)) {
    event.preventDefault()
    track('search_open', { source: 'hotkey_slash' })
    openPalette()
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalKeydown))
onUnmounted(() => window.removeEventListener('keydown', onGlobalKeydown))

// hreflang alternates: feed @nuxtjs/i18n's localized head (rel=alternate
// hreflang links for es/en/pt + x-default, plus htmlAttrs lang/dir) into useHead
// at the layout level so every page emits them. Kept separate from the static
// useHead below to avoid clobbering the existing canonical/meta/JSON-LD.
const i18nHead = useLocaleHead()
useHead(() => ({
  htmlAttrs: i18nHead.value.htmlAttrs ?? {},
  link: i18nHead.value.link ?? [],
  meta: i18nHead.value.meta ?? [],
}))

// Head configuration
useHead({
  link: [
    {
      rel: 'preconnect',
      href: 'https://api.cambio-uruguay.com',
    },
    {
      rel: 'preconnect',
      href: 'https://www.googletagmanager.com',
    },
    {
      rel: 'preconnect',
      href: 'https://fonts.googleapis.com',
    },
    {
      rel: 'preconnect',
      href: 'https://fonts.gstatic.com',
      crossorigin: 'anonymous',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': 'https://cambio-uruguay.com/#website',
            url: 'https://cambio-uruguay.com',
            name: 'Cambio Uruguay',
            description:
              'Comparador en tiempo real de la cotización del dólar y otras divisas en Uruguay.',
            inLanguage: ['es', 'en', 'pt'],
            publisher: { '@id': 'https://cambio-uruguay.com/#organization' },
            potentialAction: {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: 'https://cambio-uruguay.com/buscar?q={search_term_string}',
              },
              'query-input': 'required name=search_term_string',
            },
          },
          {
            '@type': 'Organization',
            '@id': 'https://cambio-uruguay.com/#organization',
            name: 'Cambio Uruguay',
            alternateName: 'Cambio Uruguay - Cotización del Dólar',
            url: 'https://cambio-uruguay.com',
            foundingDate: '2023',
            areaServed: {
              '@type': 'Country',
              name: 'Uruguay',
              sameAs: 'https://www.wikidata.org/wiki/Q77',
            },
            logo: {
              '@type': 'ImageObject',
              url: 'https://cambio-uruguay.com/img/logo.png',
              width: 227,
              height: 33,
            },
            description:
              'Plataforma líder en Uruguay para comparar cotizaciones del dólar y divisas en más de 40 casas de cambio en tiempo real.',
            contactPoint: {
              '@type': 'ContactPoint',
              email: 'admin@cambio-uruguay.com',
              contactType: 'Customer Service',
              areaServed: 'UY',
              availableLanguage: ['Spanish', 'English', 'Portuguese'],
            },
            sameAs: [
              'https://twitter.com/cambio_uruguay',
              'https://www.linkedin.com/company/cambio-uruguay/',
              'https://github.com/eduair94/cambio-uruguay',
              'https://medium.com/@cambio-uruguay',
            ],
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Montevideo',
              addressLocality: 'Montevideo',
              addressRegion: 'Montevideo',
              postalCode: '11000',
              addressCountry: 'UY',
            },
            founder: {
              '@type': 'Person',
              name: 'Eduardo Airaudo',
              url: 'https://www.linkedin.com/in/eduardo-airaudo/',
              jobTitle: 'Founder & Developer',
            },
            author: {
              '@type': 'Person',
              name: 'Eduardo Airaudo',
              url: 'https://www.linkedin.com/in/eduardo-airaudo/',
            },
            knowsAbout: [
              'Cotización del dólar en Uruguay',
              'Tipo de cambio Uruguay',
              'Casas de cambio Uruguay',
              'Mercado cambiario uruguayo',
              'Peso uruguayo (UYU)',
              'Unidad Indexada (UI)',
              'Unidad Reajustable (UR)',
              'Base de Prestaciones y Contribuciones (BPC)',
              'Cambio de divisas para turistas en Uruguay',
              'Precio del oro en Uruguay',
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.v-toolbar__content {
  padding: 4px 16px;
}

.no_link {
  text-decoration: none;
}

.logo_link {
  align-items: center;
}

.logo_image {
  max-height: 36px;
  max-width: 188px;
}

/* On phones the logo must leave room for the hamburger + account/language
   cluster, otherwise the spacer collapses and the logo butts against the login
   button (and the language menu overflows the viewport).

   599.98px rather than 600px: Vuetify's `d-sm-*` helpers switch on at exactly
   600px, so a `max-width: 600px` query overlapped them by one pixel — the bar
   got the wide desktop cluster and the phone logo at the same time, and the
   language menu spilled past the right edge. */
@media (max-width: 599.98px) {
  .logo_image {
    max-height: 30px;
    max-width: 34vw;
  }
}

/* Below 360px even a 34vw logo leaves the action cluster a few px short. */
@media (max-width: 359.98px) {
  .logo_image {
    max-width: 30vw;
  }
}

/* App bar: subtle bottom hairline + slight blur for a modern, layered feel */
.app-bar {
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* Navigation Button Styles — compact so the full bar fits from the lg
   breakpoint (1280px) without colliding with the account/language cluster. */
.nav-btn {
  margin: 0 4px;
  min-width: 0;
  padding-inline: 14px;
  border-radius: 10px;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

/* Tighten the leading icon's gap inside nav buttons to reclaim width. */
.primary-nav .nav-btn :deep(.v-btn__prepend) {
  margin-inline-end: 6px;
}

.nav-btn:hover {
  background-color: rgba(255, 255, 255, 0.08) !important;
  transform: translateY(-1px);
}

/* Active route: tinted pill + accent underline so the current section reads
   clearly without shouting. */
.nav-btn--active {
  color: rgb(var(--v-theme-info)) !important;
  background-color: rgba(var(--v-theme-info), 0.12) !important;
}

/* "Más" mega-menu panel. `megaMenuColumns` (default.vue script) pre-balances
   sections into MEGA_MENU_COLUMNS real columns, so the panel stays a few
   short columns tall instead of a single ~57-row column capped at 78vh
   behind a scrollbar. A max-height + scroll is kept only as a safety net for
   short viewports. */
.mega-menu {
  width: min(880px, 92vw);
  max-height: 88vh;
  overflow-y: auto;
  padding: 18px 22px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background-color: rgb(var(--v-theme-surface));
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.32);
}

.mega-menu__grid {
  display: flex;
  align-items: flex-start;
  gap: 24px;
}

.mega-menu__col {
  display: flex;
  flex: 1 1 0;
  min-width: 0;
  flex-direction: column;
  gap: 14px;
}

.mega-menu__section {
  min-width: 0;
}

.mega-menu__heading {
  margin: 0 0 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  opacity: 0.55;
}

.mega-menu__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.mega-menu__link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  color: inherit;
  text-decoration: none;
  font-size: 0.86rem;
  line-height: 1.3;
  transition: background-color 0.15s ease;
}

.mega-menu__icon {
  flex: 0 0 auto;
  opacity: 0.7;
}

.mega-menu__label {
  flex: 1 1 auto;
  min-width: 0;
}

.mega-menu__link:hover,
.mega-menu__link:focus-visible {
  background-color: rgba(255, 255, 255, 0.08);
}

.mega-menu__link:focus-visible {
  outline: 2px solid rgb(var(--v-theme-info));
  outline-offset: -2px;
}

.mega-menu__link--active {
  color: rgb(var(--v-theme-info));
  background-color: rgba(var(--v-theme-info), 0.12);
}

/* Live-data signal: a quiet pulse on the ~1 in 4 links backed by data that
   updates on its own (rates, scraped news, daily-refreshed rankings), so
   "fresh" isn't just internal sitemap metadata — it tells the visitor which
   destinations are worth a second look today. */
.mega-menu__live {
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
  margin-inline-start: 4px;
  border-radius: 50%;
  background-color: rgb(var(--v-theme-info));
  animation: mega-menu-live-pulse 2.2s ease-in-out infinite;
}

@keyframes mega-menu-live-pulse {
  0%,
  100% {
    opacity: 0.55;
    transform: scale(0.85);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mega-menu__live {
    animation: none;
  }
}

.mega-menu__footer {
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: flex-end;
}

.mega-menu__all {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: 6px;
  color: rgb(var(--v-theme-info));
  text-decoration: none;
  font-size: 0.82rem;
  font-weight: 600;
}

.mega-menu__all:hover,
.mega-menu__all:focus-visible {
  text-decoration: underline;
}

.v-theme--light .mega-menu {
  border-color: #e3e6ea;
  box-shadow: 0 16px 40px rgba(20, 25, 40, 0.14);
}

.v-theme--light .mega-menu__heading {
  border-bottom-color: #e3e6ea;
}

.v-theme--light .mega-menu__link:hover,
.v-theme--light .mega-menu__link:focus-visible {
  background-color: rgba(0, 0, 0, 0.05);
}

.v-theme--light .mega-menu__footer {
  border-top-color: #e3e6ea;
}

/* Search triggers. Both reserve their footprint in the SSR HTML so hydration
   never shifts the app bar. The desktop one reads as a search field, which is
   what people look for; the mobile one is an icon next to the hamburger. */
.search-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 196px;
  height: 36px;
  padding: 0 8px 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 10px;
  background-color: rgba(255, 255, 255, 0.05);
  color: inherit;
  text-decoration: none;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

/* Collapsed (icon-only) below xl: no reserved label width, square so it reads
   as an icon button rather than a stretched empty field. */
@media (max-width: 1919.98px) {
  .search-trigger {
    min-width: 0;
    width: 36px;
    padding: 0;
    justify-content: center;
  }
}

.search-trigger:hover,
.search-trigger:focus-visible {
  border-color: rgba(var(--v-theme-info), 0.6);
  background-color: rgba(255, 255, 255, 0.09);
}

.search-trigger__label {
  flex: 1 1 auto;
  font-size: 0.86rem;
  opacity: 0.75;
}

.search-trigger__kbd {
  padding: 2px 6px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 5px;
  font-family: inherit;
  font-size: 0.68rem;
  opacity: 0.7;
}

/* Under 360px the bar has no slack left and the logo ends up flush against the
   login pill. The drawer carries its own search row, so this icon is the one
   thing here that can go without losing a destination. */
@media (max-width: 359.98px) {
  .search-trigger-icon {
    display: none !important;
  }
}

.search-trigger-icon {
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: inherit;
  text-decoration: none;
}

.search-trigger-icon:hover,
.search-trigger-icon:focus-visible {
  background-color: rgba(255, 255, 255, 0.08);
}

/* The app bar is dark in both themes, except the trigger borders, which are
   tuned against white text — re-tone them when the light theme is applied. */
.v-theme--light .search-trigger {
  border-color: rgba(0, 0, 0, 0.18);
  background-color: rgba(0, 0, 0, 0.03);
}

.v-theme--light .search-trigger:hover,
.v-theme--light .search-trigger:focus-visible {
  background-color: rgba(0, 0, 0, 0.06);
}

.v-theme--light .search-trigger__kbd {
  border-color: rgba(0, 0, 0, 0.2);
}

.v-theme--light .search-trigger-icon:hover,
.v-theme--light .search-trigger-icon:focus-visible {
  background-color: rgba(0, 0, 0, 0.06);
}

/* Keep the account/language cluster from hugging the screen edge on mobile */
.nav-actions {
  flex: 0 0 auto;
}

.container_custom {
  width: 100%;
  /* Global content cap: keep pages readable + centred on ultra-wide screens
     instead of spanning the whole viewport. Full-bleed pages opt out below. */
  max-width: 1280px;
  padding: 12px;
  margin: 0 auto;
}

/* Full-bleed pages: the home landing, the maps, and the wide all-casas table
   want the whole viewport (VMain gets a `<routeName>_main` class). */
.index_main .container_custom {
  padding: 0;
  max-width: none;
}
.mapa_main .container_custom,
.sucursales_main .container_custom,
.sucursales-origin-location_main .container_custom,
.avanzado_main .container_custom {
  max-width: none;
}
</style>
