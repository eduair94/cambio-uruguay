<template>
  <VApp>
    <!-- Navigation Drawer for mobile -->
    <VNavigationDrawer
      v-model="drawer"
      location="left"
      temporary
      width="280"
      class="mobile-navigation-drawer"
    >
      <VList>
        <VListItem>
          <VListItemTitle class="text-h6"> Menu </VListItemTitle>
          <template #append>
            <VBtn
              icon="mdi-close"
              variant="text"
              size="small"
              :aria-label="$t('a11y.close')"
              @click="drawer = false"
            />
          </template>
        </VListItem>

        <VDivider />

        <VListItem :to="localePath('/')" exact @click="drawer = false">
          <template #prepend>
            <VIcon>mdi-home</VIcon>
          </template>
          <VListItemTitle>{{ $t('inicio') }}</VListItemTitle>
        </VListItem>

        <VListItem :to="localePath('/dolar-hoy')" @click="drawer = false">
          <template #prepend>
            <VIcon>mdi-trending-up</VIcon>
          </template>
          <VListItemTitle>{{ $t('dolarHoy.nav') }}</VListItemTitle>
        </VListItem>

        <VListItem :to="localePath('/avanzado')" @click="drawer = false">
          <template #prepend>
            <VIcon>mdi-cog</VIcon>
          </template>
          <VListItemTitle>{{ $t('avanzado') }}</VListItemTitle>
        </VListItem>

        <VListItem :to="localePath('/historico')" @click="drawer = false">
          <template #prepend>
            <VIcon>mdi-chart-line</VIcon>
          </template>
          <VListItemTitle>{{ $t('historico') }}</VListItemTitle>
        </VListItem>

        <VListItem :to="localePath('/sucursales')" @click="drawer = false">
          <template #prepend>
            <VIcon>mdi-bank-outline</VIcon>
          </template>
          <VListItemTitle>{{ $t('sucursalesMenu') }}</VListItemTitle>
        </VListItem>

        <VListItem :to="localePath('/retirar-efectivo-uruguay')" @click="drawer = false">
          <template #prepend>
            <VIcon>mdi-cash-multiple</VIcon>
          </template>
          <VListItemTitle>Retirar efectivo</VListItemTitle>
        </VListItem>

        <VListItem :to="localePath('/noticias')" @click="drawer = false">
          <template #prepend>
            <VIcon>mdi-newspaper-variant-outline</VIcon>
          </template>
          <VListItemTitle>{{ $t('noticias.nav') }}</VListItemTitle>
        </VListItem>

        <VListItem :to="localePath('/comparar')" @click="drawer = false">
          <template #prepend>
            <VIcon>mdi-chart-multiple</VIcon>
          </template>
          <VListItemTitle>{{ $t('compare.nav') }}</VListItemTitle>
        </VListItem>

        <VListItem :to="localePath('/guias')" @click="drawer = false">
          <template #prepend>
            <VIcon>mdi-book-open-variant</VIcon>
          </template>
          <VListItemTitle>{{ $t('guias.nav') }}</VListItemTitle>
        </VListItem>

        <VListItem :to="localePath('/herramientas')" @click="drawer = false">
          <template #prepend>
            <VIcon>mdi-tools</VIcon>
          </template>
          <VListItemTitle>Herramientas</VListItemTitle>
        </VListItem>

        <VListItem :to="localePath('/glosario')" @click="drawer = false">
          <template #prepend>
            <VIcon>mdi-book-alphabet</VIcon>
          </template>
          <VListItemTitle>Glosario</VListItemTitle>
        </VListItem>

        <VListItem :to="localePath('/convertir')" @click="drawer = false">
          <template #prepend>
            <VIcon>mdi-cash-sync</VIcon>
          </template>
          <VListItemTitle>Convertir</VListItemTitle>
        </VListItem>

        <VListItem :to="localePath('/cotizacion')" @click="drawer = false">
          <template #prepend>
            <VIcon>mdi-cash-multiple</VIcon>
          </template>
          <VListItemTitle>Cotizaciones</VListItemTitle>
        </VListItem>

        <VListItem :to="localePath('/indicadores')" @click="drawer = false">
          <template #prepend>
            <VIcon>mdi-finance</VIcon>
          </template>
          <VListItemTitle>Indicadores</VListItemTitle>
        </VListItem>

        <VListItem :to="localePath('/blog')" @click="drawer = false">
          <template #prepend>
            <VIcon>mdi-newspaper-variant-multiple</VIcon>
          </template>
          <VListItemTitle>Blog</VListItemTitle>
        </VListItem>

        <VListItem :to="localePath('/acerca')" @click="drawer = false">
          <template #prepend>
            <VIcon>mdi-information-outline</VIcon>
          </template>
          <VListItemTitle>{{ $t('acerca.nav') }}</VListItemTitle>
        </VListItem>

        <VListItem :to="localePath('/conectar')" @click="drawer = false">
          <template #prepend>
            <VIcon>mdi-connection</VIcon>
          </template>
          <VListItemTitle>{{ $t('conectar.nav') }}</VListItemTitle>
        </VListItem>

        <VListItem
          href="https://ko-fi.com/cambio_uruguay"
          target="_blank"
          rel="noopener noreferrer"
          @click="drawer = false"
        >
          <template #prepend>
            <VIcon>mdi-heart</VIcon>
          </template>
          <VListItemTitle>{{ $t('donar') }}</VListItemTitle>
        </VListItem>

        <VListItem
          href="https://twitter.com/cambio_uruguay"
          target="_blank"
          rel="noopener noreferrer"
          @click="drawer = false"
        >
          <template #prepend>
            <VIcon>mdi-twitter</VIcon>
          </template>
          <VListItemTitle>Síguenos en Twitter</VListItemTitle>
        </VListItem>

        <VDivider class="my-2" />

        <VListItem
          href="https://www.linkedin.com/in/eduardo-airaudo/"
          target="_blank"
          rel="noopener noreferrer"
          @click="drawer = false"
        >
          <template #prepend>
            <VIcon>mdi-account-circle</VIcon>
          </template>
          <VListItemTitle>Acerca del Autor</VListItemTitle>
        </VListItem>
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

      <NuxtLink :to="localePath('/')" class="no_link d-flex logo_link" :aria-label="$t('inicio')">
        <img
          width="227"
          height="33"
          alt="Cambio Uruguay - Logo oficial para comparar cotizaciones de cambio"
          class="logo_image"
          src="/img/logo.png"
          loading="eager"
        />
      </NuxtLink>

      <!-- Desktop primary navigation (secondary links live under the "Más" menu) -->
      <nav class="primary-nav d-none d-lg-flex align-center ml-6" :aria-label="$t('a11y.menu')">
        <VBtn
          v-for="item in primaryNav"
          :key="item.to"
          :to="localePath(item.to)"
          :exact="item.exact"
          variant="text"
          class="nav-btn text-none"
          :class="{ 'nav-btn--active': isActiveRoute(item.to) }"
        >
          <VIcon start size="small">{{ item.icon }}</VIcon>
          {{ navLabel(item) }}
        </VBtn>

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
            <template v-for="item in moreNav" :key="item.label">
              <VListItem v-if="item.to" :to="localePath(item.to)" :active="isActiveRoute(item.to)">
                <template #prepend>
                  <VIcon>{{ item.icon }}</VIcon>
                </template>
                <VListItemTitle>{{ navLabel(item) }}</VListItemTitle>
              </VListItem>
              <VListItem v-else :href="item.href" target="_blank" rel="noopener noreferrer">
                <template #prepend>
                  <VIcon>{{ item.icon }}</VIcon>
                </template>
                <VListItemTitle>{{ navLabel(item) }}</VListItemTitle>
              </VListItem>
            </template>
          </VList>
        </VMenu>
      </nav>

      <VSpacer />

      <!-- Account + language cluster: kept together with its own gap so the login
           CTA never collides with the logo or the nav. -->
      <div class="nav-actions d-flex align-center ga-1 ga-sm-2">
        <AccountMenu />
        <LanguageMenu />
      </div>
    </VAppBar>

    <ClientOnly>
      <PWAInstallBanner />
    </ClientOnly>

    <VMain :class="formatNameRoute()">
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

// Route change loading management
router.beforeEach((to, from) => {
  // Only show loading if navigating to a different page and we're on client side
  if (to.path !== from.path && typeof window !== 'undefined') {
    loadingStore.showRouteLoading()
  }
})

router.afterEach(() => {
  // Hide loading after route change completes
  if (typeof window !== 'undefined') {
    nextTick(() => {
      loadingStore.hideRouteLoading()
    })
  }
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

// Desktop navigation model. `label` is an i18n key unless `raw` is set (some
// items have no dedicated translation key). Primary items stay inline; the rest
// live under the "Más" dropdown so the bar never overflows.
const { t } = useI18n()
interface NavItem {
  to?: string
  href?: string
  icon: string
  label: string
  raw?: boolean
  exact?: boolean
}
const primaryNav: NavItem[] = [
  { to: '/', icon: 'mdi-home', label: 'inicio', exact: true },
  { to: '/dolar-hoy', icon: 'mdi-trending-up', label: 'dolarHoy.nav' },
  { to: '/historico', icon: 'mdi-chart-line', label: 'historico' },
  { to: '/sucursales', icon: 'mdi-bank-outline', label: 'sucursalesMenu' },
  { to: '/comparar', icon: 'mdi-chart-multiple', label: 'compare.nav' },
]
const moreNav: NavItem[] = [
  { to: '/noticias', icon: 'mdi-newspaper-variant-outline', label: 'noticias.nav' },
  { to: '/avanzado', icon: 'mdi-cog', label: 'avanzado' },
  { to: '/guias', icon: 'mdi-book-open-variant', label: 'guias.nav' },
  {
    to: '/retirar-efectivo-uruguay',
    icon: 'mdi-cash-multiple',
    label: 'Retirar efectivo',
    raw: true,
  },
  { to: '/herramientas', icon: 'mdi-tools', label: 'Herramientas', raw: true },
  { to: '/glosario', icon: 'mdi-book-alphabet', label: 'Glosario', raw: true },
  { to: '/convertir', icon: 'mdi-cash-sync', label: 'Convertir', raw: true },
  { to: '/cotizacion', icon: 'mdi-cash-multiple', label: 'Cotizaciones', raw: true },
  { to: '/indicadores', icon: 'mdi-finance', label: 'Indicadores', raw: true },
  { to: '/blog', icon: 'mdi-newspaper-variant-multiple', label: 'Blog', raw: true },
  { to: '/acerca', icon: 'mdi-information-outline', label: 'acerca.nav' },
  { to: '/conectar', icon: 'mdi-connection', label: 'conectar.nav' },
  { href: 'https://ko-fi.com/cambio_uruguay', icon: 'mdi-heart', label: 'donar' },
  { href: 'https://twitter.com/cambio_uruguay', icon: 'mdi-twitter', label: 'Twitter', raw: true },
  {
    href: 'https://www.linkedin.com/in/eduardo-airaudo/',
    icon: 'mdi-account-circle',
    label: 'Autor',
    raw: true,
  },
]
const navLabel = (item: NavItem): string => (item.raw ? item.label : t(item.label))

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
                urlTemplate: 'https://cambio-uruguay.com/avanzado?search={search_term_string}',
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
  margin: 0 1px;
  min-width: 0;
  padding-inline: 10px;
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
  margin-inline-end: 4px;
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
  min-width: 232px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
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
