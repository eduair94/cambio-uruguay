<template>
  <v-app dark>
    <!-- Custom Mobile Navigation Menu -->
    <div
      v-if="mobileMenuOpen"
      class="mobile-menu-overlay"
      @click="closeMobileMenu"
    >
      <div class="mobile-menu" @click.stop>
        <div class="mobile-menu-header">
          <h3>Menu</h3>
          <v-btn icon @click="closeMobileMenu">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>        <div class="mobile-menu-items">
          <!-- Inicio -->
          <router-link
            :to="localePath('/')"
            class="mobile-menu-item"
            :class="{ 'mobile-menu-item--active': isActiveRoute('/') }"
            @click="handleMobileNavigation"
          >
            <v-icon>mdi-home</v-icon>
            <span>Inicio</span>
          </router-link>

          <!-- Histórico -->
          <router-link
            :to="localePath('/historico')"
            class="mobile-menu-item"
            :class="{ 'mobile-menu-item--active': isActiveRoute('/historico') }"
            @click="handleMobileNavigation"
          >
            <v-icon>mdi-chart-line</v-icon>
            <span>Histórico</span>
          </router-link>

          <!-- Donar -->
          <a
            href="https://ko-fi.com/cambio_uruguay"
            target="_blank"
            rel="noopener noreferrer"
            class="mobile-menu-item"
            @click="closeMobileMenu"
          >
            <v-icon>mdi-heart</v-icon>
            <span>Donar</span>
          </a>
        </div>
      </div>
    </div>

    <v-app-bar :clipped-left="clipped" fixed app>
      <!-- Mobile menu button -->
      <v-app-bar-nav-icon
        class="d-flex d-md-none mr-2"
        @click.stop="toggleMobileMenu"
      />

      <router-link :to="localePath('/')" class="no_link d-flex logo_link">
        <v-img
          max-height="80%"
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
      </router-link>      <!-- Navigation Menu for desktop -->
      <v-toolbar-items class="d-none d-md-flex ml-4">
        <!-- Inicio -->
        <v-btn 
          :to="localePath('/')" 
          text 
          exact
          class="text-capitalize nav-btn"
          :class="{ 'nav-btn--active': isActiveRoute('/') }"
        >
          <v-icon left small>mdi-home</v-icon>
          Inicio
        </v-btn>

        <!-- Histórico -->
        <v-btn 
          :to="localePath('/historico')" 
          text 
          class="text-capitalize nav-btn"
          :class="{ 'nav-btn--active': isActiveRoute('/historico') }"
        >
          <v-icon left small>mdi-chart-line</v-icon>
          Histórico
        </v-btn>

        <!-- Donar -->
        <v-btn
          href="https://ko-fi.com/cambio_uruguay"
          target="_blank"
          rel="noopener noreferrer"
          text
          class="text-capitalize nav-btn"
        >
          <v-icon left small>mdi-heart</v-icon>
          Donar
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
      mobileMenuOpen: false, // Custom mobile menu state
      mobileMenuClosing: false, // Track closing animation
      fixed: false,
      miniVariant: false,
      right: true,
      title: 'Cambio Uruguay - encuentra la mejor cotización',
    }
  },  watch: {
    // Watch for route changes and ensure mobile menu is closed with animation
    $route() {
      if (this.mobileMenuOpen) {
        this.closeMobileMenu()
      }
    },
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
      this.$nextTick(() => {
        const el = document.getElementById('spinner-wrapper')
        if (el) el.style.display = 'none'
      })
    }
  },
  mounted() {
    this.$vuetify.lang.current = this.$i18n.locale
  },  methods: {
    isActiveRoute(path) {
      // Check if current route matches the path
      if (path === '/') {
        // For home page, only match exact path
        return this.$route.path === '/' || this.$route.path === '/es' || this.$route.path === '/en' || this.$route.path === '/pt'
      }
      // For other paths, check if route starts with the path
      return this.$route.path.includes(path)
    },
    toggleMobileMenu() {
      if (this.mobileMenuClosing) return
      this.mobileMenuOpen = !this.mobileMenuOpen
    },
    closeMobileMenu() {
      if (this.mobileMenuClosing) return

      // Start closing animation
      this.mobileMenuClosing = true

      // Add closing classes for animated exit
      const overlayElement = document.querySelector(
        '.mobile-menu-overlay'
      ) as HTMLElement
      const menuElement = document.querySelector('.mobile-menu') as HTMLElement

      if (overlayElement) {
        overlayElement.classList.add('closing')
      }

      if (menuElement) {
        menuElement.classList.add('closing')
        menuElement.style.animation = 'slideOut 0.3s ease-in forwards'
      }

      // After animation completes, hide the menu
      setTimeout(() => {
        this.mobileMenuOpen = false
        this.mobileMenuClosing = false

        // Clean up classes
        if (overlayElement) {
          overlayElement.classList.remove('closing')
        }
        if (menuElement) {
          menuElement.classList.remove('closing')
          menuElement.style.animation = ''
        }
      }, 300)
    },    handleMobileNavigation() {
      // Close menu with animation and allow navigation to proceed
      // The route change will be handled by Vue Router after this method completes
      this.closeMobileMenu()
    },
  },
}
</script>

<style lang="scss">
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

/* Custom Mobile Menu Styles with Animations */
.mobile-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  animation: fadeIn 0.3s ease-out;
}

.mobile-menu-overlay.closing {
  animation: fadeOut 0.3s ease-in forwards;
}

.mobile-menu {
  background-color: #1e1e1e;
  width: 280px;
  height: 100%;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  transform: translateX(-100%);
  animation: slideIn 0.3s ease-out forwards;
}

.mobile-menu.closing {
  animation: slideOut 0.3s ease-in forwards;
}

.mobile-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #333;
  opacity: 0;
  animation: fadeInDown 0.4s ease-out 0.3s forwards;
}

.mobile-menu.closing .mobile-menu-header {
  animation: fadeOutUp 0.2s ease-in forwards;
}

.mobile-menu-header h3 {
  color: white;
  margin: 0;
  font-size: 18px;
}

.mobile-menu-header .v-btn {
  transition: transform 0.2s ease;
}

.mobile-menu-header .v-btn:hover {
  transform: scale(1.1);
}

.mobile-menu-items {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 0;
}

.mobile-menu-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  color: white;
  text-decoration: none;
  transition: all 0.2s ease;
  border-bottom: 1px solid #333;
  opacity: 0;
  transform: translateX(-20px);
  animation: slideInItem 0.4s ease-out forwards;
}

.mobile-menu-item:nth-child(1) {
  animation-delay: 0.1s;
}

.mobile-menu-item:nth-child(2) {
  animation-delay: 0.2s;
}

.mobile-menu-item:nth-child(3) {
  animation-delay: 0.3s;
}

.mobile-menu.closing .mobile-menu-item {
  animation: slideOutItem 0.2s ease-in forwards;
}

.mobile-menu.closing .mobile-menu-item:nth-child(1) {
  animation-delay: 0s;
}

.mobile-menu.closing .mobile-menu-item:nth-child(2) {
  animation-delay: 0.05s;
}

.mobile-menu.closing .mobile-menu-item:nth-child(3) {
  animation-delay: 0.1s;
}

.mobile-menu-item:hover {
  background-color: #333;
  transform: translateX(5px);
}

.mobile-menu-item:active {
  background-color: #444;
  transform: translateX(0px);
}

.mobile-menu-item .v-icon {
  margin-right: 16px;
  color: white;
}

.mobile-menu-item span {
  font-size: 16px;
  font-weight: 500;
  color: white;
}

.mobile-menu-item a {
  color: white;
}

@media (min-width: 960px) {
  .mobile-menu-overlay {
    display: none !important;
  }
}

.logo_link {
  position: relative;
  align-items: center;
  height: 100%;
}

body {
  font-family: 'Open Sans', sans-serif;
}

.no_link {
  text-decoration: none;
}
.website_link {
  word-break: break-all;
  max-width: 100%;
  min-width: 150px;
}

.button_section {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

@media (min-width: 768px) {
  .website_link {
    min-width: 200px;
  }
}

@media (max-width: 1750px) {
  body .container {
    max-width: 100% !important;
  }
}

.v-data-table__mobile-row {
  width: 100%;
}

.money_table
  .v-data-table__mobile-table-row
  > .v-data-table__mobile-row:nth-child(10) {
  flex-direction: column;
  justify-content: flex-start;
  .v-data-table__mobile-row__header {
    width: 100%;
  }
  .v-data-table__mobile-row__cell {
    text-align: left;
    div {
      margin-bottom: 12px;
    }
  }
}

.top_container {
  gap: 12px;
}

.donation_logo {
  transition: ease-in-out 0.3s;
}

.gap-10 {
  gap: 10px;
}

#wrapper2 {
  width: 100%;
  overflow-x: scroll;
  overflow-y: hidden;
}

/* This div allow to make the scroll function and show the scrollbar */
#div2 {
  height: 1px;
  overflow: scroll;
}

.text_info {
  max-width: 490px;
}

@media (max-width: 768px) {
  .button_section {
    gap: 5px !important;
    button,
    a {
      min-width: 30px !important;
      max-width: calc(80vw / 5);
    }
  }
}

.selectExchangeHouse .v-select__selections {
  min-height: 56px !important;
}

/* Navigation Button Styles */
.nav-btn {
  transition: background-color 0.2s ease, transform 0.1s ease;
  border-radius: 8px !important;
  margin: 0 4px;
}

.nav-btn:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
  transform: translateY(-1px);
}

.nav-btn--active {
  background-color: rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
  font-weight: 600 !important;
}

.nav-btn--active .v-icon {
  color: #4CAF50 !important;
}

/* Mobile Menu Item Active Styles */
.mobile-menu-item--active {
  background-color: rgba(255, 255, 255, 0.1) !important;
  border-left: 4px solid #4CAF50 !important;
  font-weight: 600 !important;
}

.mobile-menu-item--active .v-icon {
  color: #4CAF50 !important;
}

.mobile-menu-item--active span {
  color: #ffffff !important;
}

/* Animation Keyframes */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes slideIn {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-100%);
  }
}

@keyframes slideInItem {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideOutItem {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(-20px);
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeOutUp {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-10px);
  }
}
</style>
