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

        <VListGroup v-for="section in navSections" :key="section.id" :value="section.id">
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

        <!-- "Más" is now grouped by section rather than a flat list of 13 links,
             and it carries the pages that used to be footer-only or orphaned. -->
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
          <VList class="more-menu" density="comfortable" nav>
            <template v-for="section in moreGroups" :key="section.id">
              <VListSubheader>{{ $t(section.titleKey) }}</VListSubheader>
              <template v-for="entry in section.entries" :key="entry.to ?? entry.href">
                <VListItem
                  v-if="entry.to"
                  :to="localePath(entry.to)"
                  :active="isActiveRoute(entry.to)"
                >
                  <template #prepend>
                    <VIcon>{{ entry.icon }}</VIcon>
                  </template>
                  <VListItemTitle>{{ $t(entry.labelKey) }}</VListItemTitle>
                </VListItem>
                <VListItem v-else :href="entry.href" target="_blank" rel="noopener noreferrer">
                  <template #prepend>
                    <VIcon>{{ entry.icon }}</VIcon>
                  </template>
                  <VListItemTitle>{{ $t(entry.labelKey) }}</VListItemTitle>
                </VListItem>
              </template>
            </template>
          </VList>
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
          <span class="search-trigger__label">{{ $t('search.triggerLabel') }}</span>
          <kbd class="search-trigger__kbd">{{ $t('search.triggerHint') }}</kbd>
        </a>
        <ThemeToggle />
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
import { NAV_SECTIONS, type NavEntry } from '~/utils/siteNav'

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
   button (and the language menu overflows the viewport). */
@media (max-width: 600px) {
  .logo_image {
    max-height: 30px;
    max-width: 40vw;
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

/* "Más" dropdown panel */
.more-menu {
  min-width: 264px;
  max-height: 78vh;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
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
:global(.v-theme--light) .search-trigger {
  border-color: rgba(0, 0, 0, 0.18);
  background-color: rgba(0, 0, 0, 0.03);
}

:global(.v-theme--light) .search-trigger:hover,
:global(.v-theme--light) .search-trigger:focus-visible {
  background-color: rgba(0, 0, 0, 0.06);
}

:global(.v-theme--light) .search-trigger__kbd {
  border-color: rgba(0, 0, 0, 0.2);
}

:global(.v-theme--light) .search-trigger-icon:hover,
:global(.v-theme--light) .search-trigger-icon:focus-visible {
  background-color: rgba(0, 0, 0, 0.06);
}

/* Keep the account/language cluster from hugging the screen edge on mobile */
.nav-actions {
  flex: 0 0 auto;
}

.container_custom {
  width: 100%;
  padding: 12px;
  margin: 0 auto;
}

.index_main .container_custom {
  padding: 0;
}
</style>
