<template>
  <section aria-labelledby="donation-support-title">
    <VContainer class="donation-card">
      <div class="donation-copy">
        <h2 id="donation-support-title">{{ $t('donation.supportProject') }}</h2>
        <p>{{ $t('donation.helpMessage') }}</p>
      </div>
      <div class="donation-actions">
        <VBtn
          href="https://ko-fi.com/cambio_uruguay"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="$t('donation.donatePaypal')"
          variant="tonal"
          color="primary"
          class="donation-link"
          @click="trackDonation('paypal')"
        >
          PayPal
        </VBtn>
        <VBtn
          href="https://mpago.la/19j46vX"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="$t('donation.donateMercadoPago')"
          variant="tonal"
          color="primary"
          class="donation-link"
          @click="trackDonation('mercadopago')"
        >
          MercadoPago
        </VBtn>
        <a
          href="https://www.trustpilot.com/review/cambio-uruguay.com"
          target="_blank"
          rel="noopener noreferrer"
          class="donation-reviews"
          @click="trackDonation('trustpilot')"
        >
          {{ $t('donation.seeReviews') }}
        </a>
      </div>
    </VContainer>
  </section>
</template>

<script setup lang="ts">
const trackDonation = (platform: string) => {
  if (
    typeof window !== 'undefined' &&
    'gtag' in window &&
    typeof (window as any).gtag === 'function'
  ) {
    ;(window as any).gtag('event', 'donation_click', {
      platform,
      currency: 'USD',
      value: 1,
    })
  }
}
</script>

<style scoped>
.donation-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px 24px;
  margin-block: 24px;
  padding-block: 24px;
  border-block-start: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  color: rgb(var(--v-theme-on-surface));
}

.donation-copy {
  flex: 1 1 360px;
  min-width: 0;
}

.donation-copy h2 {
  margin: 0 0 6px;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.4;
}

.donation-copy p {
  margin: 0;
  max-width: 65ch;
  font-size: 1rem;
  line-height: 1.5;
}

.donation-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.donation-link {
  min-height: 44px;
  text-transform: none;
  letter-spacing: normal;
}

.donation-reviews {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 8px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.9375rem;
  line-height: 1.5;
  text-underline-offset: 3px;
}

.donation-actions a:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}

@media print {
  .donation-card {
    display: none;
  }
}
</style>
