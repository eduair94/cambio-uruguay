<template>
  <span class="currency-flag">
    <img
      v-if="isHttpUrl(flagSource)"
      :src="flagSource"
      :alt="item.code"
      class="currency-flag-image"
      loading="lazy"
    />
    <span v-else class="currency-flag-emoji" :title="item.code">
      {{ flagSource }}
    </span>
  </span>
</template>

<script setup lang="ts">
interface CambioItem {
  origin: string
  code: string
  type: string
  buy: number
  sell: number
  name: string
  spread?: number
  amount?: number
  pos?: number
  isInterBank?: boolean
  condition?: string
  diff?: string
  localData?: {
    name?: string
    website?: string
    departments?: string[]
    location?: string
  } | null
  distance?: number
}

interface Props {
  item: CambioItem
}

interface CurrencyFlag {
  [key: string]: string
}

const props = defineProps<Props>()

// Currency flag mapping - can include both HTTP URLs and Unicode emojis
const currencyFlags: Record<string, string> = {
  USD: 'https://flagcdn.com/w20/us.png',
  EUR: 'https://flagcdn.com/w20/eu.png',
  BRL: 'https://flagcdn.com/w20/br.png',
  ARS: 'https://flagcdn.com/w20/ar.png',
  CHF: 'https://flagcdn.com/w20/ch.png',
  GBP: 'https://flagcdn.com/w20/gb.png',
  PYG: 'https://flagcdn.com/w20/py.png',
  XAU: '🥇',
  UR: 'https://flagcdn.com/w20/uy.png',
  UP: 'https://flagcdn.com/w20/uy.png',
  UI: 'https://flagcdn.com/w20/uy.png',
}

// Computed property to get the flag source
const flagSource = computed(() => {
  return currencyFlags[props.item.code] || '💱' // Default to exchange emoji if currency not found
})

// Helper function to check if the source is an HTTP URL
const isHttpUrl = (url: string): boolean => {
  return url.startsWith('http://') || url.startsWith('https://')
}

const getCurrencyFlag = (code: string): string => {
  const flags: CurrencyFlag = {
    USD: 'https://flagcdn.com/w20/us.png',
    EUR: 'https://flagcdn.com/w20/eu.png',
    BRL: 'https://flagcdn.com/w20/br.png',
    ARS: 'https://flagcdn.com/w20/ar.png',
    CHF: 'https://flagcdn.com/w20/ch.png',
    GBP: 'https://flagcdn.com/w20/gb.png',
    PYG: 'https://flagcdn.com/w20/py.png',
    XAU: '🥇',
    UR: 'https://flagcdn.com/w20/uy.png',
    UP: 'https://flagcdn.com/w20/uy.png',
    UI: 'https://flagcdn.com/w20/uy.png',
  }
  return flags[code] || 'https://flagcdn.com/w20/uy.png'
}
</script>

<style scoped>
.currency-flag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.currency-flag-image {
  width: 20px;
  height: 15px;
  object-fit: cover;
  border-radius: 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.currency-flag-emoji {
  font-size: 16px;
  line-height: 1;
  display: inline-block;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .currency-flag-image {
    width: 16px;
    height: 12px;
  }

  .currency-flag-emoji {
    font-size: 14px;
  }
}
</style>
