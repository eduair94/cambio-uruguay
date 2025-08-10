<template>
  <VCard 
    class="donation-card" 
    elevation="6"
    :class="{ 'donation-card--minimized': isMinimized }"
  >
    <!-- Minimized state -->
    <div v-if="isMinimized" class="donation-minimized pa-3">
      <VBtn 
        icon 
        size="small" 
        color="red" 
        variant="text"
        @click="toggleCard"
        class="donation-expand-btn"
      >
        <VIcon>mdi-heart</VIcon>
      </VBtn>
    </div>

    <!-- Expanded state -->
    <div v-else class="donation-expanded">
      <!-- Header -->
      <div class="donation-header pa-3 pb-2 d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <VIcon color="red" class="mr-2">mdi-heart</VIcon>
          <span class="text-body-2 font-weight-medium">{{ $t('donation.supportProject') }}</span>
        </div>
        <VBtn 
          icon 
          size="x-small" 
          variant="text" 
          @click="toggleCard"
          class="donation-close-btn"
        >
          <VIcon size="16">mdi-close</VIcon>
        </VBtn>
      </div>

      <!-- Content -->
      <div class="donation-content pa-3 pt-0">
        <p class="text-caption text-grey-lighten-1 mb-3">
          {{ $t('donation.helpMessage') }}
        </p>

        <!-- Donation buttons -->
        <div class="d-flex justify-space-between align-center">
          <a
            target="_blank"
            :aria-label="$t('donation.donatePaypal')"
            class="donation-link"
            href="https://ko-fi.com/cambio_uruguay"
            @click="trackDonation('paypal')"
          >
            <VChip
              size="small"
              color="primary"
              variant="elevated"
              class="donation-chip"
              prepend-icon="mdi-currency-usd"
            >
              PayPal
            </VChip>
          </a>

          <a
            target="_blank"
            :aria-label="$t('donation.donateMercadoPago')"
            class="donation-link"
            href="https://mpago.la/19j46vX"
            @click="trackDonation('mercadopago')"
          >
            <VChip
              size="small"
              color="light-blue"
              variant="elevated"
              class="donation-chip"
              prepend-icon="mdi-credit-card"
            >
              MercadoPago
            </VChip>
          </a>
        </div>

        <!-- Trust link -->
        <div class="text-center mt-2">
          <a
            target="_blank"
            class="text-caption text-grey-lighten-2 text-decoration-none"
            href="https://www.trustpilot.com/review/cambio-uruguay.com"
            @click="trackDonation('trustpilot')"
          >
            <VIcon size="12" class="mr-1">mdi-star</VIcon>
            {{ $t('donation.seeReviews') }}
          </a>
        </div>
      </div>
    </div>
  </VCard>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

// State
const isMinimized = ref(false)

// Methods
const toggleCard = () => {
  isMinimized.value = !isMinimized.value
  // Save preference in localStorage
  localStorage.setItem('donationCardMinimized', isMinimized.value.toString())
}

const trackDonation = (platform: string) => {
  // Track donation clicks (could be used for analytics)
  console.log(`Donation click: ${platform}`)
  
  // You could add Google Analytics or other tracking here
  if (typeof gtag !== 'undefined') {
    gtag('event', 'donation_click', {
      platform: platform,
      currency: 'USD',
      value: 1
    })
  }
}

// Load preference from localStorage
onMounted(() => {
  const savedState = localStorage.getItem('donationCardMinimized')
  if (savedState !== null) {
    isMinimized.value = savedState === 'true'
  }
})
</script>

<style scoped>
.donation-card {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  max-width: 280px;
  background: rgba(18, 18, 18, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  border-radius: 12px;
}

.donation-card--minimized {
  max-width: 50px;
  max-height: 50px;
}

.donation-minimized {
  display: flex;
  align-items: center;
  justify-content: center;
}

.donation-expand-btn {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.donation-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.donation-content {
  background: rgba(255, 255, 255, 0.02);
}

.donation-link {
  text-decoration: none;
  transition: transform 0.2s ease;
}

.donation-link:hover {
  transform: translateY(-2px);
}

.donation-chip {
  font-size: 0.75rem;
  height: 28px;
  transition: all 0.2s ease;
}

.donation-chip:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.donation-close-btn {
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.donation-close-btn:hover {
  opacity: 1;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .donation-card {
    bottom: 80px; /* Above mobile navigation if present */
    right: 15px;
    max-width: 250px;
  }
  
  .donation-card--minimized {
    bottom: 20px;
    right: 15px;
  }
}

@media (max-width: 480px) {
  .donation-card {
    max-width: 220px;
    right: 10px;
    bottom: 70px;
  }
}

/* Accessibility */
.donation-card:focus-within {
  outline: 2px solid #42a5f5;
  outline-offset: 2px;
}

.donation-link:focus {
  outline: 2px solid #42a5f5;
  outline-offset: 2px;
  border-radius: 4px;
}

/* Dark mode compatibility */
@media (prefers-color-scheme: dark) {
  .donation-card {
    background: rgba(30, 30, 30, 0.95);
    border-color: rgba(255, 255, 255, 0.15);
  }
}

/* Smooth animations */
.donation-expanded {
  animation: slideIn 0.3s ease-out;
}

.donation-minimized {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Hide on print */
@media print {
  .donation-card {
    display: none !important;
  }
}
</style>
