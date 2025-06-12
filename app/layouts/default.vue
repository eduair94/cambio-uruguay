<template>
  <v-app dark>
    <!-- Navigation Drawer for mobile only -->
    <v-navigation-drawer v-model="drawer" absolute>
      <v-list>
        <v-list-item
          v-for="item in items"
          :key="item.title"
          :to="item.external ? undefined : item.to"
          :href="item.external ? item.to : undefined"
          :target="item.external ? '_blank' : undefined"
          :rel="item.external ? 'noopener noreferrer' : undefined"
          router
          exact
          @click="drawer = false"
        >
          <v-list-item-action>
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>{{ item.title }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
    <v-app-bar :clipped-left="clipped" fixed app>
      <!-- Mobile menu button -->
      <v-app-bar-nav-icon
        class="d-flex d-md-none mr-2"
        @click.stop="drawer = !drawer"
      />

      <router-link to="/" class="no_link">
        <v-img
          max-height="90%"
          max-width="55vw"
          contain
          alt="Cambio Uruguay - Logo oficial para comparar cotizaciones de cambio"
          class="logo_image"
          position="left center"
          src="./img/logo.png"
        >
          <template #sources>
            <source srcset="/img/logo.webp" />
          </template>
        </v-img>
      </router-link>
      <!-- Navigation Menu for desktop -->
      <v-toolbar-items class="d-none d-md-flex ml-4">
        <v-btn
          v-for="item in items"
          :key="item.title"
          :to="item.external ? undefined : item.to"
          :href="item.external ? item.to : undefined"
          :target="item.external ? '_blank' : undefined"
          :rel="item.external ? 'noopener noreferrer' : undefined"
          text
          class="text-capitalize"
        >
          <v-icon left small>{{ item.icon }}</v-icon>
          {{ item.title }}
        </v-btn>
      </v-toolbar-items>

      <v-spacer />
      <LanguageMenu />
    </v-app-bar>
    <PWAInstallBanner />
    <v-main>
      <v-container>
        <Nuxt />
      </v-container>
    </v-main>
    <v-footer :fixed="false">
      <div class="d-flex footer_content">
        <span>Cambio Uruguay &copy; {{ new Date().getFullYear() }}</span>
        <v-spacer />
        <span
          >Hecho con <v-icon color="red">mdi-heart</v-icon>
          por
          <a
            class="white--text"
            href="https://www.linkedin.com/in/eduardo-airaudo/"
            >Eduardo Airaudo</a
          >
          y
          <a
            class="white--text"
            href="https://www.linkedin.com/in/reginascagliotti/"
            >Regina Scagliotti</a
          >
        </span>
      </div>
    </v-footer>
    <JoinTwitter />
  </v-app>
</template>

<script lang="ts">
export default {
  name: 'DefaultLayout',
  components: {
    LanguageMenu: () => import('../components/LanguageMenu.vue'),
    JoinTwitter: () => import('../components/JoinTwitter.vue'),
    PWAInstallBanner: () => import('../components/PWAInstallBanner.vue'),
  },
  data() {
    return {
      clipped: false,
      drawer: false,
      fixed: false,
      items: [
        {
          icon: 'mdi-home',
          title: 'Inicio',
          to: '/',
        },
        {
          icon: 'mdi-chart-line',
          title: 'Histórico',
          to: '/historico',
        },
        {
          icon: 'mdi-heart',
          title: 'Donar',
          to: 'https://ko-fi.com/cambio_uruguay',
          external: true,
        },
      ],
      miniVariant: false,
      right: true,
      rightDrawer: false,
      title: 'Cambio Uruguay - encuentra la mejor cotización',
    }
  },
  head() {
    return {
      link: [
        // Preconnect to external domains for performance
        { rel: 'preconnect', href: 'https://api.cambio-uruguay.com' },
        { rel: 'preconnect', href: 'https://www.googletagmanager.com' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: true,
        },
        // Humans.txt for developer credits
        { rel: 'author', href: '/humans.txt', type: 'text/plain' },
        // Alternate languages
        {
          rel: 'alternate',
          hreflang: 'es',
          href: 'https://cambio-uruguay.com/',
        },
        {
          rel: 'alternate',
          hreflang: 'en',
          href: 'https://cambio-uruguay.com/en',
        },
        {
          rel: 'alternate',
          hreflang: 'pt',
          href: 'https://cambio-uruguay.com/pt',
        },
        {
          rel: 'alternate',
          hreflang: 'x-default',
          href: 'https://cambio-uruguay.com/',
        },
        // Feed
        {
          rel: 'alternate',
          type: 'application/json',
          title: 'Cambio Uruguay Feed',
          href: '/.well-known/feed.json',
        },
      ],
      script: [
        {
          type: 'application/ld+json',
          json: {
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
            sameAs: ['https://twitter.com/cambios_uy'],
            address: {
              '@type': 'PostalAddress',
              addressCountry: 'UY',
              addressRegion: 'Montevideo',
            },
          },
        },
      ],
    }
  },
  beforeMount() {
    ;(window as any).startLoading = () => {
      const el = document.getElementById('spinner-wrapper')
      if (el) el.style.display = 'flex'
    }
    ;(window as any).stopLoading = () => {
      const el = document.getElementById('spinner-wrapper')
      if (el) el.style.display = 'none'
    }
  },
  mounted() {
    this.$vuetify.lang.current = this.$i18n.locale
  },
}
</script>

<style>
.logo_image {
  cursor: pointer;
}
._hj_feedback_container {
  z-index: 1;
  position: relative;
}

.no_link {
  text-decoration: none;
}

.link_format {
  text-decoration: underline;
}

.no_link:hover {
  opacity: 0.8;
}

body .v-app-bar.v-app-bar--fixed {
  z-index: 1;
}

#suggestions {
  background: white;
  width: 384px;
  height: 264px;
}

@media (min-width: 768px) {
  .footer_content {
    max-width: calc(100vw - 150px);
    width: 100%;
  }
}

#arc-widget-container iframe {
  display: none !important;
  pointer-events: none !important;
}

@media (max-width: 768px) {
  body .v-footer {
    padding-bottom: 80px;
    height: auto !important;
  }
  body .v-data-table > .v-data-table__wrapper > table > tbody > tr > td,
  .v-data-table > .v-data-table__wrapper > table > thead > tr > td,
  .v-data-table > .v-data-table__wrapper > table > tfoot > tr > td {
    padding-bottom: 12px;
  }
}

/* Mobile navigation drawer styles */
@media (max-width: 959px) {
  .v-navigation-drawer {
    z-index: 2000 !important;
  }

  .v-navigation-drawer .v-list-item {
    padding: 12px 16px;
  }

  .v-navigation-drawer .v-list-item-title {
    font-weight: 500;
  }
}

/* Hide drawer on desktop */
@media (min-width: 960px) {
  .v-navigation-drawer.d-md-none {
    display: none !important;
  }
}
</style>
