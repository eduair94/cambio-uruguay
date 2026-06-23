<template>
  <!-- Credibility signals: regulator source, coverage, freshness, third-party reviews.
       Rendered server-side (static) so it appears in initial HTML for trust + SEO. -->
  <ul class="trust-bar" :aria-label="$t('trust.regulated')">
    <li class="trust-pill">
      <a
        class="trust-pill__link"
        :href="bcuUrl"
        target="_blank"
        rel="noopener noreferrer"
        :title="$t('trust.regulatedAria')"
      >
        <VIcon size="18" color="success" class="trust-pill__icon">mdi-shield-check</VIcon>
        <span>{{ $t('trust.regulated') }}</span>
      </a>
    </li>

    <li class="trust-pill trust-pill--static">
      <VIcon size="18" color="info" class="trust-pill__icon">mdi-bank-outline</VIcon>
      <span>{{ $t('trust.houses') }}</span>
    </li>

    <li class="trust-pill trust-pill--static">
      <VIcon size="18" color="success" class="trust-pill__icon">mdi-update</VIcon>
      <span>{{ $t('trust.updated') }}</span>
    </li>

    <li class="trust-pill">
      <a
        class="trust-pill__link"
        href="https://www.trustpilot.com/review/cambio-uruguay.com"
        target="_blank"
        rel="noopener noreferrer"
      >
        <VIcon size="18" color="amber" class="trust-pill__icon">mdi-star</VIcon>
        <span>{{ $t('trust.reviews') }}</span>
      </a>
    </li>
  </ul>
</template>

<script setup lang="ts">
// BCU = Banco Central del Uruguay (the regulator). Link to its exchange-house registry.
const bcuUrl = 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/casas_cambio.aspx'
</script>

<style scoped>
.trust-bar {
  list-style: none;
  padding: 0;
  margin: 0 auto 2rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;
  max-width: 760px;
}

.trust-pill {
  display: inline-flex;
}

.trust-pill,
.trust-pill__link {
  align-items: center;
  gap: 0.45rem;
}

.trust-pill__link,
.trust-pill--static {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1;
  color: rgba(255, 255, 255, 0.92);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  text-decoration: none;
  white-space: nowrap;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.trust-pill__link:hover,
.trust-pill__link:focus-visible {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.28);
  transform: translateY(-2px);
  outline: none;
}

.trust-pill__icon {
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .trust-bar {
    gap: 0.45rem;
    margin-bottom: 1.5rem;
  }

  .trust-pill__link,
  .trust-pill--static {
    font-size: 0.74rem;
    padding: 0.35rem 0.7rem;
  }
}

/* Light theme: pills were authored white-on-glass for the dark hero, which is
   invisible on the light canvas. Re-skin to dark ink on a faint solid surface
   with a hairline border (matches the home page light overrides). */
.v-theme--light .trust-pill__link,
.v-theme--light .trust-pill--static {
  color: #16233b;
  background: rgba(255, 255, 255, 0.72);
  border-color: rgba(15, 23, 42, 0.12);
}

.v-theme--light .trust-pill__link:hover,
.v-theme--light .trust-pill__link:focus-visible {
  background: #ffffff;
  border-color: rgba(37, 99, 235, 0.4);
}
</style>
