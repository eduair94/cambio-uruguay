<template>
  <VFooter class="cu-footer">
    <div class="cu-footer__inner">
      <!-- Top zone: a fixed brand rail beside the dense link directory. This
           two-column split is what replaces the old full-width stacked blocks
           (copyright / icon strip / sitemap / credits), each of which used to
           claim its own row and blow the footer up vertically. -->
      <div class="cu-footer__top">
        <!-- Brand rail: identity + the "connect with us" cluster that drives
             referral traffic and backlinks. -->
        <div class="cu-footer__brand">
          <NuxtLink :to="localePath('/')" class="cu-footer__logo" :aria-label="$t('inicio')">
            <img
              width="176"
              height="26"
              alt="Cambio Uruguay"
              src="/img/logo.webp"
              loading="lazy"
              decoding="async"
            />
          </NuxtLink>

          <p class="cu-footer__tagline">{{ $t('subtitle') }}</p>

          <!-- Site-wide share entry point: lets visitors share the site from
               any page. Kept as its own labelled action above the icon strip so
               it stays discoverable. -->
          <ShareButtons label variant="tonal" color="white" class="cu-footer__share" />

          <!-- External + connect channels. Native title + aria-label instead of
               VTooltip: avoids empty role=tooltip overlays that fail the
               aria-tooltip-name audit. -->
          <nav class="cu-footer__social" :aria-label="$t('search.section.connect')">
            <VBtn
              v-for="link in socialLinks"
              :key="link.key"
              v-bind="link.to ? { to: localePath(link.to) } : linkAttrs(link.href)"
              :aria-label="$t(link.labelKey)"
              :title="$t(link.labelKey)"
              icon
              size="small"
              variant="text"
              class="cu-footer__social-btn"
            >
              <VIcon size="20">{{ link.icon }}</VIcon>
            </VBtn>
          </nav>
        </div>

        <!-- Link directory: every internal route, grouped by section from
             NAV_SECTIONS so the footer, header and drawer can never disagree
             about what exists. This is where crawlers pick up the long-tail
             pages, so the links stay — they're just packed tighter now. -->
        <nav class="cu-footer__dir" :aria-label="$t('nav.sitemap')">
          <div v-for="section in footerSections" :key="section.id" class="cu-footer__col">
            <h2 class="cu-footer__heading">{{ $t(section.titleKey) }}</h2>
            <ul class="cu-footer__list">
              <li v-for="entry in section.entries" :key="entry.to">
                <NuxtLink
                  :to="localePath(entry.to as string)"
                  class="cu-footer__link"
                  :data-cta="entry.to === '/mapa-del-sitio' ? 'footer-sitemap' : undefined"
                >
                  {{ $t(entry.labelKey) }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <!-- Slim bottom bar: copyright + cookie settings on one side, credits on
           the other. Replaces three spacer-separated blocks with a single row. -->
      <div class="cu-footer__bar">
        <div class="cu-footer__meta">
          <span>Cambio Uruguay &copy; {{ new Date().getFullYear() }}</span>
          <span class="cu-footer__dot" aria-hidden="true">·</span>
          <button type="button" class="cu-footer__cookies" @click="reopenConsent">
            {{ $t('consent.settings') }}
          </button>
        </div>

        <p class="cu-footer__credits">
          {{ $t('hechoConAmor') }}
          <VIcon color="#ff5c72" size="14">mdi-heart</VIcon>
          {{ $t('porText') }}
          <a
            href="https://www.linkedin.com/in/eduardo-airaudo/"
            target="_blank"
            rel="noopener noreferrer"
            >Eduardo Airaudo</a
          >
          {{ $t('yText') }}
          <a
            href="https://www.linkedin.com/in/reginascagliotti/"
            target="_blank"
            rel="noopener noreferrer"
            >Regina Scagliotti</a
          >
        </p>
      </div>
    </div>
  </VFooter>
</template>

<script setup lang="ts">
import { NAV_SECTIONS } from '~/utils/siteNav'

const localePath = useLocalePath()
const { reopen } = useConsent()
const reopenConsent = () => reopen()

// Shared attrs for the external (non-routed) social links.
const linkAttrs = (href?: string) => ({
  href,
  target: '_blank',
  rel: 'noopener noreferrer',
})

// The "connect with us" cluster. Internal entries carry `to`; external ones
// carry `href`. Order runs share-adjacent (API, dev channels) → social reach.
const socialLinks = [
  { key: 'api', to: '/desarrolladores', labelKey: 'dev.title', icon: 'mdi-api' },
  {
    key: 'twitter',
    href: 'https://twitter.com/cambio_uruguay',
    labelKey: 'siguenos.twitter',
    icon: 'mdi-twitter',
  },
  {
    key: 'tg-bot',
    href: 'https://t.me/cambio_uruguay_bot',
    labelKey: 'siguenos.telegram',
    icon: '$telegram',
  },
  {
    key: 'tg-channel',
    href: 'https://t.me/cambio_uruguay',
    labelKey: 'siguenos.channel',
    icon: 'mdi-bullhorn',
  },
  { key: 'mcp', to: '/conectar', labelKey: 'siguenos.mcp', icon: 'mdi-robot-happy' },
  { key: 'discord', to: '/conectar', labelKey: 'siguenos.discord', icon: '$discord' },
  {
    key: 'linkedin',
    href: 'https://www.linkedin.com/company/cambio-uruguay/',
    labelKey: 'siguenos.linkedin',
    icon: 'mdi-linkedin',
  },
  {
    key: 'medium',
    href: 'https://medium.com/@cambio-uruguay',
    labelKey: 'siguenos.medium',
    icon: '$medium',
  },
  {
    key: 'kofi',
    href: 'https://ko-fi.com/cambio_uruguay',
    labelKey: 'siguenos.kofi',
    icon: 'mdi-heart',
  },
] as const

// Internal routes only: the external links have their own icon row above.
const footerSections = computed(() =>
  NAV_SECTIONS.map(section => ({
    ...section,
    entries: section.entries.filter(entry => entry.to),
  }))
)
</script>

<style lang="scss" scoped>
// The footer is a permanently-dark brand band in BOTH themes. All colors are
// hardcoded here (not theme tokens) so the light theme can't repaint the
// white-on-navy text — same rationale as the old scoped override, kept.
$ink: #ffffff;
$muted: rgba(255, 255, 255, 0.6);
$faint: rgba(255, 255, 255, 0.5);
$line: rgba(255, 255, 255, 0.09);
$teal: #4dd0e1;

.cu-footer.v-footer {
  display: block;
  padding: 0;
  background-color: #0a0e1a;
  color: $ink;

  // Signature: a single hairline top rule that fades a teal accent out from the
  // left, echoing the site's hero gradients. One accent, nothing else shouts.
  border-top: 1px solid transparent;
  border-image: linear-gradient(
      90deg,
      rgba(77, 208, 225, 0.55) 0%,
      rgba(77, 208, 225, 0.12) 22%,
      rgba(255, 255, 255, 0.06) 55%,
      transparent 100%
    )
    1;
}

.cu-footer__inner {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 40px 24px 20px;
}

// ── Top zone: brand rail + directory ──────────────────────────────────────
.cu-footer__top {
  display: grid;
  grid-template-columns: minmax(0, 240px) 1fr;
  gap: 40px;
}

.cu-footer__brand {
  min-width: 0;
}

.cu-footer__logo {
  display: inline-flex;

  img {
    height: 26px;
    width: auto;
  }
}

.cu-footer__tagline {
  margin: 14px 0 18px;
  max-width: 30ch;
  color: $muted;
  font-size: 0.82rem;
  line-height: 1.55;
}

.cu-footer__share {
  margin-bottom: 14px;
}

.cu-footer__social {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-left: -6px; // pull the icon-button padding back to the rail edge
}

.cu-footer__social-btn {
  color: rgba(255, 255, 255, 0.72);

  &:hover {
    color: $teal;
  }
}

// ── Directory ─────────────────────────────────────────────────────────────
// Explicit column counts (not auto-fill) so the 11 sections stay balanced:
// 6 columns fills two near-full rows (6 + 5) with no orphaned single-section
// row, and the count steps down cleanly with width.
.cu-footer__dir {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px 20px;
}

@media (min-width: 600px) {
  .cu-footer__dir {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .cu-footer__dir {
    grid-template-columns: repeat(6, minmax(0, 1fr));
    column-gap: 24px;
  }
}

.cu-footer__col {
  min-width: 0;
}

.cu-footer__heading {
  margin: 0 0 10px;
  color: $faint;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.cu-footer__list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.cu-footer__link {
  display: inline-block;
  color: $muted;
  font-size: 0.8125rem;
  line-height: 1.35;
  text-decoration: none;
  transition: color 0.18s ease;

  &:hover {
    color: $ink;
  }

  &:focus-visible {
    outline: 2px solid $teal;
    outline-offset: 2px;
    border-radius: 3px;
    color: $ink;
  }
}

// ── Bottom bar ────────────────────────────────────────────────────────────
.cu-footer__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 20px;
  margin-top: 32px;
  padding-top: 18px;
  border-top: 1px solid $line;
  font-size: 0.75rem;
}

.cu-footer__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  color: $faint;
}

.cu-footer__dot {
  color: rgba(255, 255, 255, 0.3);
}

.cu-footer__cookies {
  padding: 0;
  border: none;
  background: none;
  color: $muted;
  font: inherit;
  cursor: pointer;
  transition: color 0.18s ease;

  &:hover {
    color: $ink;
  }

  &:focus-visible {
    outline: 2px solid $teal;
    outline-offset: 2px;
    border-radius: 3px;
    color: $ink;
  }
}

.cu-footer__credits {
  margin: 0;
  color: $faint;

  a {
    color: rgba(255, 255, 255, 0.78);
    text-decoration: none;

    &:hover {
      color: $ink;
      text-decoration: underline;
    }
  }
}

// ── Responsive ────────────────────────────────────────────────────────────
// Below md the rail stops sitting beside the directory — it stacks on top and
// the directory reflows into its own auto-fill grid underneath.
@media (max-width: 959.98px) {
  .cu-footer__top {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}

@media (max-width: 599.98px) {
  .cu-footer__inner {
    padding: 32px 16px 18px;
  }

  .cu-footer__dir {
    gap: 20px 16px;
  }

  .cu-footer__bar {
    justify-content: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cu-footer__link,
  .cu-footer__cookies,
  .cu-footer__social-btn {
    transition: none;
  }
}
</style>
