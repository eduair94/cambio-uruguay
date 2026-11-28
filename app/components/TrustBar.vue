<template>
  <!-- Credibility signals: regulator source, coverage, freshness, third-party reviews.
       Rendered server-side (static) so it appears in initial HTML for trust + SEO. -->
  <div class="trust-bar-wrap">
    <ul class="trust-bar" :aria-label="$t('trust.regulated')">
      <li class="trust-pill">
        <a
          class="trust-pill__link"
          :href="bcuUrl"
          target="_blank"
          rel="noopener noreferrer"
          :title="$t('trust.regulatedAria')"
        >
          <VIcon size="16" color="success" class="trust-pill__icon">mdi-shield-check</VIcon>
          <span>{{ $t('trust.regulated') }}</span>
        </a>
      </li>

      <li class="trust-pill trust-pill--static">
        <VIcon size="16" color="info" class="trust-pill__icon">mdi-bank-outline</VIcon>
        <span>{{ $t('trust.houses') }}</span>
      </li>

      <li class="trust-pill trust-pill--static">
        <VIcon size="16" color="success" class="trust-pill__icon">mdi-update</VIcon>
        <span>{{ $t('trust.updated') }}</span>
      </li>

      <!-- Antigüedad probada por un tercero: la sección de /acerca enlaza cada copia que guardó
         Internet Archive desde la primera (utils/archiveHistory.ts). -->
      <li class="trust-pill">
        <NuxtLink
          class="trust-pill__link"
          :to="`${localePath('/acerca')}#trayectoria`"
          :title="$t('trust.sinceAria', { date: firstCaptureDisplay })"
        >
          <VIcon size="16" color="info" class="trust-pill__icon">mdi-archive-clock-outline</VIcon>
          <span>{{ $t('trust.since', { year: firstCaptureYear }) }}</span>
        </NuxtLink>
      </li>

      <li class="trust-pill">
        <a
          class="trust-pill__link"
          href="https://www.trustpilot.com/review/cambio-uruguay.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <VIcon size="16" color="amber" class="trust-pill__icon">mdi-star</VIcon>
          <span>{{ $t('trust.reviews') }}</span>
        </a>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ARCHIVE_FIRST_CAPTURE, waybackDate } from '~/utils/archiveHistory'

// BCU = Banco Central del Uruguay (the regulator). Link to its exchange-house registry.
const bcuUrl = 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/casas_cambio.aspx'

const { locale } = useI18n()
const localePath = useLocalePath()
const firstCaptureIso = waybackDate(ARCHIVE_FIRST_CAPTURE)
const firstCaptureYear = firstCaptureIso.slice(0, 4)
const firstCaptureDisplay = computed(() =>
  new Date(firstCaptureIso).toLocaleDateString(dateLocale(locale.value), {
    timeZone: siteTimeZone(firstCaptureIso),
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
)
</script>

<style scoped>
/* A line of provenance under the title, not a row of glass pills: the four facts read as a
   sentence with hairline separators, in the surface's own ink. The two that are links underline
   on hover and keep a 44 px tall hit area (the text box is padded, not enlarged).

   Five facts since «En línea desde 2022» (2026-11-28): in Spanish the line is ~915 px, English
   ~890, so the cap went from 760 to 960 px to keep it one line on a desktop. Where it does not fit,
   a wrapped line would START on a separator; the container query below drops the separators for a
   plain gap whenever the width available is under that line. */
.trust-bar-wrap {
  container-type: inline-size;
  margin-bottom: 24px;
}

.trust-bar {
  list-style: none;
  padding: 0;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  column-gap: 0;
  row-gap: 0;
  max-width: 960px;
}

.trust-pill {
  display: inline-flex;
  align-items: center;
}

.trust-pill + .trust-pill::before {
  content: '';
  width: 1px;
  height: 14px;
  margin-inline: 12px;
  background: rgba(var(--v-theme-on-surface), 0.18);
}

.trust-pill__link,
.trust-pill--static {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.2;
  color: rgba(var(--v-theme-on-surface), 0.82);
  text-decoration: none;
  white-space: nowrap;
}

.trust-pill--static {
  padding: 0;
}

.trust-pill__link {
  text-decoration-line: underline;
  text-decoration-color: transparent;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
  transition: text-decoration-color 0.2s cubic-bezier(0.2, 0, 0, 1);
}

.trust-pill__link:hover,
.trust-pill__link:focus-visible {
  text-decoration-color: currentColor;
}

.trust-pill__icon {
  flex-shrink: 0;
}

/* Wrapped lines would start on a separator: where the line does not fit, the items just keep
   their distance. */
@container (max-width: 930px) {
  .trust-bar {
    column-gap: 16px;
  }

  .trust-pill + .trust-pill::before {
    display: none;
  }
}

@media (max-width: 600px) {
  .trust-bar-wrap {
    margin-bottom: 16px;
  }

  .trust-pill__link,
  .trust-pill--static {
    font-size: 0.8rem;
  }
}
</style>
