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

    <VAppBar class="px-3">
      <!-- Mobile menu button -->
      <VAppBarNavIcon
        class="d-flex d-lg-none mr-2"
        :aria-label="$t('a11y.menu')"
        :title="$t('a11y.menu')"
        @click.stop="drawer = !drawer"
      />

      <NuxtLink :to="localePath('/')" class="no_link d-flex logo_link">
        <img
          width="227"
          height="33"
          alt="Cambio Uruguay - Logo oficial para comparar cotizaciones de cambio"
          class="logo_image"
          src="/img/logo.png"
          loading="eager"
        />
      </NuxtLink>

      <!-- Navigation Menu for desktop -->
      <VToolbarItems class="d-none d-lg-flex ml-4">
        <!-- Inicio -->
        <VBtn
          :to="localePath('/')"
          variant="text"
          exact
          class="text-capitalize nav-btn"
          :class="{ 'nav-btn--active': isActiveRoute('/') }"
        >
          <VIcon start small>mdi-home</VIcon>
          {{ $t('inicio') }}
        </VBtn>

        <!-- Dólar hoy -->
        <VBtn
          :to="localePath('/dolar-hoy')"
          variant="text"
          class="text-capitalize nav-btn"
          :class="{ 'nav-btn--active': isActiveRoute('/dolar-hoy') }"
        >
          <VIcon start small>mdi-trending-up</VIcon>
          {{ $t('dolarHoy.nav') }}
        </VBtn>

        <!-- Avanzado -->
        <VBtn
          :to="localePath('/avanzado')"
          variant="text"
          class="text-capitalize nav-btn"
          :class="{ 'nav-btn--active': isActiveRoute('/avanzado') }"
        >
          <VIcon start small>mdi-cog</VIcon>
          {{ $t('avanzado') }}
        </VBtn>

        <!-- Histórico -->
        <VBtn
          :to="localePath('/historico')"
          variant="text"
          class="text-capitalize nav-btn"
          :class="{ 'nav-btn--active': isActiveRoute('/historico') }"
        >
          <VIcon start small>mdi-chart-line</VIcon>
          {{ $t('historico') }}
        </VBtn>

        <!-- Sucursales -->
        <VBtn
          :to="localePath('/sucursales')"
          variant="text"
          class="text-capitalize nav-btn"
          :class="{ 'nav-btn--active': isActiveRoute('/sucursales') }"
        >
          <VIcon start small>mdi-bank-outline</VIcon>
          {{ $t('sucursalesMenu') }}
        </VBtn>

        <!-- Noticias -->
        <VBtn
          :to="localePath('/noticias')"
          variant="text"
          class="text-capitalize nav-btn"
          :class="{ 'nav-btn--active': isActiveRoute('/noticias') }"
        >
          <VIcon start small>mdi-newspaper-variant-outline</VIcon>
          {{ $t('noticias.nav') }}
        </VBtn>

        <!-- Comparar -->
        <VBtn
          :to="localePath('/comparar')"
          variant="text"
          class="text-capitalize nav-btn"
          :class="{ 'nav-btn--active': isActiveRoute('/comparar') }"
        >
          <VIcon start small>mdi-chart-multiple</VIcon>
          {{ $t('compare.nav') }}
        </VBtn>

        <!-- Guías -->
        <VBtn
          :to="localePath('/guias')"
          variant="text"
          class="text-capitalize nav-btn"
          :class="{ 'nav-btn--active': isActiveRoute('/guias') }"
        >
          <VIcon start small>mdi-book-open-variant</VIcon>
          {{ $t('guias.nav') }}
        </VBtn>

        <!-- Herramientas -->
        <VBtn
          :to="localePath('/herramientas')"
          variant="text"
          class="text-capitalize nav-btn"
          :class="{ 'nav-btn--active': isActiveRoute('/herramientas') }"
        >
          <VIcon start small>mdi-tools</VIcon>
          Herramientas
        </VBtn>

        <!-- Glosario -->
        <VBtn
          :to="localePath('/glosario')"
          variant="text"
          class="text-capitalize nav-btn"
          :class="{ 'nav-btn--active': isActiveRoute('/glosario') }"
        >
          <VIcon start small>mdi-book-alphabet</VIcon>
          Glosario
        </VBtn>

        <!-- Blog -->
        <VBtn
          :to="localePath('/blog')"
          variant="text"
          class="text-capitalize nav-btn"
          :class="{ 'nav-btn--active': isActiveRoute('/blog') }"
        >
          <VIcon start small>mdi-newspaper-variant-multiple</VIcon>
          Blog
        </VBtn>

        <!-- Acerca -->
        <VBtn
          :to="localePath('/acerca')"
          variant="text"
          class="text-capitalize nav-btn"
          :class="{ 'nav-btn--active': isActiveRoute('/acerca') }"
        >
          <VIcon start small>mdi-information-outline</VIcon>
          {{ $t('acerca.nav') }}
        </VBtn>

        <!-- Donar -->
        <VBtn
          href="https://ko-fi.com/cambio_uruguay"
          target="_blank"
          rel="noopener noreferrer"
          variant="text"
          class="text-capitalize nav-btn"
        >
          <VIcon start small>mdi-heart</VIcon>
          {{ $t('donar') }}
        </VBtn>

        <!-- Twitter -->
        <VBtn
          href="https://twitter.com/cambio_uruguay"
          target="_blank"
          rel="noopener noreferrer"
          variant="text"
          class="text-capitalize nav-btn"
        >
          <VIcon start small>mdi-twitter</VIcon>
          Twitter
        </VBtn>

        <!-- Autor -->
        <VBtn
          href="https://www.linkedin.com/in/eduardo-airaudo/"
          target="_blank"
          rel="noopener noreferrer"
          variant="text"
          class="text-capitalize nav-btn"
        >
          <VIcon start small>mdi-account-circle</VIcon>
          Autor
        </VBtn>
      </VToolbarItems>

      <VSpacer />
      <AccountMenu />
      <LanguageMenu />
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
        '@type': 'Organization',
        name: 'Cambio Uruguay',
        alternateName: 'Cambio Uruguay - Cotización del Dólar',
        url: 'https://cambio-uruguay.com',
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
  max-height: 40px;
  max-width: 55vw;
}

/* Navigation Button Styles */
.nav-btn {
  margin: 0 4px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.nav-btn:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
  transform: translateY(-1px);
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
