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
            <VBtn icon="mdi-close" variant="text" size="small" @click="drawer = false" />
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
      <VAppBarNavIcon class="d-flex d-lg-none mr-2" @click.stop="drawer = !drawer" />

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

    <!-- Memory Monitor for debugging (only shows in development) -->
    <ClientOnly>
      <MemoryMonitor />
    </ClientOnly>
  </VApp>
</template>

<script setup lang="ts">
import { useLocalePath } from '#imports'
import { useLoadingStore } from '~/stores/loading'

const route = useRoute()
console.log('route', route)
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
        url: 'https://cambio-uruguay.com',
        logo: 'https://cambio-uruguay.com/img/logo.png',
        contactPoint: {
          '@type': 'ContactPoint',
          email: 'admin@cambio-uruguay.com',
          contactType: 'Customer Service',
          areaServed: 'UY',
          availableLanguage: ['Spanish', 'English', 'Portuguese'],
        },
        sameAs: ['https://twitter.com/cambio_uruguay'],
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'UY',
          addressRegion: 'Montevideo',
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
