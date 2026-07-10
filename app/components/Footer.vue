<template>
  <VFooter>
    <div class="d-flex footer_content flex-wrap ga-3">
      <div class="d-flex flex-column flex-md-row align-center ga-3 w-100">
        <!-- Copyright Section -->
        <div class="text-center text-md-left">
          <span>Cambio Uruguay &copy; {{ new Date().getFullYear() }}</span>
        </div>

        <VSpacer class="d-none d-md-flex" />

        <!-- API Documentation & Social Media Links.
             Native title (hover hint) + aria-label instead of VTooltip: avoids
             empty role=tooltip overlays that fail the aria-tooltip-name audit.
             flex-wrap so the icon row never forces horizontal scroll on small phones. -->
        <div class="d-flex align-center flex-wrap justify-center ga-2">
          <!-- Site-wide share entry point: lets visitors share the site from
               any page (drives referral traffic + backlinks). -->
          <ShareButtons label variant="text" color="white" />

          <VDivider vertical class="mx-2" />

          <VBtn
            :to="localePath('/desarrolladores')"
            :aria-label="$t('dev.title')"
            :title="$t('dev.title')"
            icon
            size="small"
            variant="text"
            color="white"
          >
            <VIcon>mdi-api</VIcon>
          </VBtn>

          <VDivider vertical class="mx-2" />

          <VBtn
            href="https://twitter.com/cambio_uruguay"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="$t('siguenos.twitter')"
            :title="$t('siguenos.twitter')"
            icon
            size="small"
            variant="text"
            color="white"
          >
            <VIcon>mdi-twitter</VIcon>
          </VBtn>

          <VBtn
            href="https://t.me/cambio_uruguay_bot"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="$t('siguenos.telegram')"
            :title="$t('siguenos.telegram')"
            icon
            size="small"
            variant="text"
            color="white"
          >
            <VIcon>$telegram</VIcon>
          </VBtn>

          <VBtn
            href="https://t.me/cambio_uruguay"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="$t('siguenos.channel')"
            :title="$t('siguenos.channel')"
            icon
            size="small"
            variant="text"
            color="white"
          >
            <VIcon>mdi-bullhorn</VIcon>
          </VBtn>

          <VBtn
            :to="localePath('/conectar')"
            :aria-label="$t('siguenos.mcp')"
            :title="$t('siguenos.mcp')"
            icon
            size="small"
            variant="text"
            color="white"
          >
            <VIcon>mdi-robot-happy</VIcon>
          </VBtn>

          <VBtn
            :to="localePath('/conectar')"
            :aria-label="$t('siguenos.discord')"
            :title="$t('siguenos.discord')"
            icon
            size="small"
            variant="text"
            color="white"
          >
            <VIcon>$discord</VIcon>
          </VBtn>

          <VBtn
            href="https://www.linkedin.com/company/cambio-uruguay/"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="$t('siguenos.linkedin')"
            :title="$t('siguenos.linkedin')"
            icon
            size="small"
            variant="text"
            color="white"
          >
            <VIcon>mdi-linkedin</VIcon>
          </VBtn>

          <VBtn
            href="https://medium.com/@cambio-uruguay"
            target="_blank"
            rel="me noopener noreferrer"
            :aria-label="$t('siguenos.medium')"
            :title="$t('siguenos.medium')"
            icon
            size="small"
            variant="text"
            color="white"
          >
            <VIcon>$medium</VIcon>
          </VBtn>

          <VBtn
            href="https://ko-fi.com/cambio_uruguay"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="$t('siguenos.kofi')"
            :title="$t('siguenos.kofi')"
            icon
            size="small"
            variant="text"
            color="white"
          >
            <VIcon>mdi-heart</VIcon>
          </VBtn>
        </div>

        <VSpacer class="d-none d-md-flex" />

        <!-- Site links, grouped by section and generated from NAV_SECTIONS so the
             footer, the header and the drawer can never disagree about what
             exists. This is where crawlers pick up the long-tail pages. -->
        <nav class="footer-nav">
          <div v-for="section in footerSections" :key="section.id" class="footer-nav__group">
            <h2 class="footer-nav__heading text-caption">{{ $t(section.titleKey) }}</h2>
            <ul class="footer-nav__list">
              <li v-for="entry in section.entries" :key="entry.to">
                <NuxtLink
                  :to="localePath(entry.to as string)"
                  class="footer-link text-caption"
                  :data-cta="entry.to === '/mapa-del-sitio' ? 'footer-sitemap' : undefined"
                >
                  {{ $t(entry.labelKey) }}
                </NuxtLink>
              </li>
            </ul>
          </div>
          <div class="footer-nav__group">
            <h2 class="footer-nav__heading text-caption">{{ $t('consent.settings') }}</h2>
            <ul class="footer-nav__list">
              <li>
                <button
                  type="button"
                  class="footer-link footer-link--btn text-caption"
                  @click="reopenConsent"
                >
                  {{ $t('consent.settings') }}
                </button>
              </li>
            </ul>
          </div>
        </nav>

        <VSpacer class="d-none d-md-flex" />

        <!-- Credits Section -->
        <div class="text-center text-md-right">
          <span class="text-caption">
            {{ $t('hechoConAmor') }}
            <VIcon color="red" size="small">mdi-heart</VIcon>
            {{ $t('porText') }}
            <a
              class="white--text text-decoration-none"
              href="https://www.linkedin.com/in/eduardo-airaudo/"
              target="_blank"
              rel="noopener noreferrer"
              >Eduardo Airaudo</a
            >
            {{ $t('yText') }}
            <a
              class="white--text text-decoration-none"
              href="https://www.linkedin.com/in/reginascagliotti/"
              target="_blank"
              rel="noopener noreferrer"
              >Regina Scagliotti</a
            >
          </span>
        </div>
      </div>
    </div>
  </VFooter>
</template>

<script setup lang="ts">
import { NAV_SECTIONS } from '~/utils/siteNav'

const localePath = useLocalePath()
const { reopen } = useConsent()
const reopenConsent = () => reopen()

// Internal routes only: the external links already have their own icon row above.
const footerSections = computed(() =>
  NAV_SECTIONS.map(section => ({
    ...section,
    entries: section.entries.filter(entry => entry.to),
  }))
)
</script>

<style lang="scss" scoped>
// Footer is a fixed dark brand band. Pin the navy background in BOTH themes so
// the white text/icons stay legible — in light mode VFooter would otherwise
// inherit the white `surface` token and render white-on-white (unreadable).
.v-footer {
  background-color: #0a0e1a;
  color: #fff;
}

.footer_content {
  width: 100%;
  align-items: center;
  padding: 16px;

  // Credit links use Vuetify-2 `white--text` (no-op in Vuetify 3); force white.
  a {
    color: #fff;
  }
}

.footer-nav {
  display: grid;
  width: 100%;
  gap: 20px 28px;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

.footer-nav__heading {
  margin-bottom: 8px;
  color: rgba(255, 255, 255, 0.55);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.footer-nav__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.footer-link {
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: #fff;
    text-decoration: underline;
  }
}

.footer-link--btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font: inherit;
}
</style>
