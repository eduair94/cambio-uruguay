<template>
  <article :id="provider.id" class="provider" :aria-labelledby="`${provider.id}-title`" lang="es">
    <div class="provider-overview">
      <div class="provider-identity">
        <h3 :id="`${provider.id}-title`">{{ provider.name }}</h3>
        <p class="provider-categories" :lang="locale">
          {{ provider.categories.map(category => c.categories[category]).join(' · ') }}
        </p>
        <p>{{ provider.summary }}</p>
        <p class="provider-area">
          <strong :lang="locale">{{ c.coverage }}:</strong>
          {{ provider.coverage.slice(0, 6).join(' · ') || c.unknownArea }}
          <span v-if="provider.coverage.length > 6"> (+{{ provider.coverage.length - 6 }})</span>
          <span v-if="provider.nationwide" :lang="locale"> · {{ c.national }}</span>
        </p>
        <p v-if="provider.baseDepartment" class="provider-meta">
          <span :lang="locale">{{ c.based }}:</span> {{ provider.baseDepartment }}
        </p>
      </div>
      <div class="provider-price">
        <template v-if="firstPrice">
          <span class="provider-meta" :lang="locale">{{ c.prices }}</span>
          <strong class="price-number" :lang="locale">{{ formatPrice(firstPrice) }}</strong>
          <p>{{ firstPrice.label }}</p>
          <p v-if="firstPrice.minimum" class="provider-meta">
            {{ c.minimum }}: {{ firstPrice.minimum }}
          </p>
          <p v-if="firstPrice.conditions" class="provider-meta">{{ firstPrice.conditions }}</p>
          <p v-if="firstPrice.includes?.length" class="provider-meta">
            <strong>{{ c.includes }}:</strong> {{ firstPrice.includes.join('; ') }}
          </p>
          <p v-if="firstPrice.excludes?.length" class="provider-meta">
            <strong>{{ c.excludes }}:</strong> {{ firstPrice.excludes.join('; ') }}
          </p>
          <p class="provider-meta">
            {{ firstPrice.publishedAt ? `${c.published}: ${firstPrice.publishedAt}` : c.undated }} ·
            <a :href="firstPrice.sourceUrl" target="_blank" rel="noopener noreferrer">{{
              c.source
            }}</a>
          </p>
          <p class="provider-meta" :lang="locale">
            {{ c.priceCount.replace('{count}', String(prices.length)) }}
          </p>
        </template>
        <template v-else>
          <strong :lang="locale">{{ c.quote }}</strong>
          <p class="provider-meta" :lang="locale">{{ c.quoteHint }}</p>
        </template>
      </div>
    </div>
    <p v-if="provider.caveats[0]" class="provider-meta">{{ provider.caveats[0] }}</p>

    <div v-if="provider.vehicles.length" class="vehicle-line">
      <strong :lang="locale">{{ c.vehicle }}:</strong>
      <span v-for="(vehicle, index) in provider.vehicles" :key="index">
        {{ vehicle.label
        }}<template v-if="vehicle.dimensions"> · {{ vehicle.dimensions }}</template>
        <template v-if="vehicle.volumeM3"> · {{ vehicle.volumeM3 }} m³</template>
        <template v-if="vehicle.payloadKg"> · {{ vehicle.payloadKg }} kg</template>
        <a :href="vehicle.sourceUrl" target="_blank" rel="noopener noreferrer" :lang="locale">{{
          c.source
        }}</a>
      </span>
    </div>
    <p
      v-else-if="provider.categories.includes('moving') || provider.categories.includes('freight')"
      class="provider-meta"
      :lang="locale"
    >
      {{ c.noVehicle }}
    </p>

    <div class="provider-actions">
      <a :href="provider.website" target="_blank" rel="noopener noreferrer" :lang="locale">{{
        c.website
      }}</a>
      <template v-for="(contact, index) in provider.contacts" :key="index">
        <a
          v-if="movingContactHref(contact)"
          :href="movingContactHref(contact)"
          :aria-label="`${c[contact.kind]} ${provider.name}: ${contact.value}${contact.label ? ` (${contact.label})` : ''}`"
          :target="contact.kind === 'whatsapp' ? '_blank' : undefined"
          rel="noopener noreferrer"
        >
          <span :lang="locale">{{ c[contact.kind] }}</span> · {{ contact.value }}
          <span v-if="contact.label">({{ contact.label }})</span>
        </a>
        <span v-else
          >{{ contact.value }}<template v-if="contact.label"> ({{ contact.label }})</template></span
        >
      </template>
    </div>

    <MovingProviderReviews :provider-id="provider.id" />

    <details class="provider-details">
      <summary :lang="locale">{{ c.details }}</summary>
      <p v-if="provider.coverage.length > 6" class="provider-area">
        <strong>{{ c.coverage }}:</strong> {{ provider.coverage.join(' · ') }}
      </p>
      <ul class="service-list">
        <li v-for="service in provider.services" :key="service">{{ service }}</li>
      </ul>
      <ul v-if="provider.vehicles.some(vehicle => vehicle.notes)" class="service-list">
        <li v-for="(vehicle, index) in provider.vehicles.filter(item => item.notes)" :key="index">
          {{ vehicle.label }}: {{ vehicle.notes }}
        </li>
      </ul>
      <div v-if="provider.caveats.length" class="provider-caveats">
        <strong :lang="locale">{{ c.notes }}</strong>
        <ul>
          <li v-for="note in provider.caveats" :key="note">{{ note }}</li>
        </ul>
      </div>
      <VTextField
        v-if="prices.length > 8"
        v-model="tariffQuery"
        :label="c.searchTariffs"
        variant="outlined"
        density="comfortable"
        hide-details
        clearable
        class="my-4"
        :lang="locale"
      />
      <p v-if="prices.length > 8" class="provider-meta" :lang="locale">
        {{ searchedPrices.length }} / {{ prices.length }} · {{ c.prices }}
      </p>
      <table v-if="searchedPrices.length" class="tariffs cu-mobile-cards">
        <thead>
          <tr>
            <th :lang="locale">{{ c.priceService }}</th>
            <th :lang="locale">{{ c.amount }}</th>
            <th :lang="locale">{{ c.conditions }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(price, index) in visiblePrices" :key="index">
            <td :data-label="c.priceService">{{ price.label }}</td>
            <td :data-label="c.amount">
              <strong class="tariff-amount">{{ formatPrice(price) }}</strong>
            </td>
            <td :data-label="c.conditions">
              <p v-if="price.minimum">
                <strong>{{ c.minimum }}:</strong> {{ price.minimum }}
              </p>
              <p v-if="price.includes?.length">
                <strong>{{ c.includes }}:</strong> {{ price.includes.join('; ') }}
              </p>
              <p v-if="price.excludes?.length">
                <strong>{{ c.excludes }}:</strong> {{ price.excludes.join('; ') }}
              </p>
              <p v-if="price.conditions">{{ price.conditions }}</p>
              <p class="provider-meta">
                {{ price.publishedAt ? `${c.published}: ${price.publishedAt}` : c.undated }}
              </p>
              <a :href="price.sourceUrl" target="_blank" rel="noopener noreferrer" :lang="locale">{{
                c.source
              }}</a>
            </td>
          </tr>
        </tbody>
      </table>
      <VBtn
        v-if="searchedPrices.length > 8 && !allPrices"
        variant="tonal"
        class="mt-4"
        :lang="locale"
        @click="allPrices = true"
        >{{ c.morePrices.replace('{count}', String(searchedPrices.length)) }}</VBtn
      >
      <ul class="provider-sources">
        <li v-for="source in provider.sources" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }}</a>
          <span class="provider-meta"> · {{ c.reviewed }}: {{ source.accessedAt }}</span>
          <p v-if="source.notes" class="provider-meta">{{ source.notes }}</p>
        </li>
      </ul>
    </details>
  </article>
</template>

<script setup lang="ts">
import {
  movingContactHref,
  movingPricesFor,
  type MovingPrice,
  type MovingProvider,
} from '~/utils/movingServices'
import { movingServicesCopy } from '~/utils/movingServicesCopy'

const props = defineProps<{
  provider: MovingProvider
  category?: string
  query?: string
  sortByPrice?: boolean
  comparisonPrice?: MovingPrice
}>()
const { locale } = useI18n()
const c = computed(() => movingServicesCopy(locale.value))
const prices = computed(() => movingPricesFor(props.provider, props.category, props.query))
const firstPrice = computed(() => (props.sortByPrice ? props.comparisonPrice : prices.value[0]))
const allPrices = ref(false)
const tariffQuery = ref<string | null>('')
const searchedPrices = computed(() => {
  const fold = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036F]/g, '')
      .toLowerCase()
  const terms = fold(tariffQuery.value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return prices.value.filter(price => terms.every(term => fold(price.label).includes(term)))
})
const visiblePrices = computed(() =>
  allPrices.value ? searchedPrices.value : searchedPrices.value.slice(0, 8)
)
watch(
  () => [props.category, props.query],
  () => {
    tariffQuery.value = ''
    allPrices.value = false
  }
)
function formatPrice(price: MovingPrice): string {
  const number = (value: number) =>
    new Intl.NumberFormat(
      locale.value === 'en' ? 'en-US' : locale.value === 'pt' ? 'pt-BR' : 'es-UY',
      { maximumFractionDigits: 2 }
    ).format(value)
  const amount =
    price.kind === 'range' && price.maxAmount !== undefined
      ? `${number(price.amount)}–${number(price.maxAmount)}`
      : number(price.amount)
  return `${price.kind === 'from' ? `${c.value.from} ` : ''}${price.currency} ${amount} / ${c.value.units[price.unit]}`
}
</script>

<style scoped>
.provider {
  padding: 24px 0;
  border-top: 1px solid rgba(var(--v-border-color), 0.25);
  scroll-margin-top: 90px;
}
.provider-overview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(230px, 0.42fr);
  gap: 24px;
}
.provider h3 {
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.6;
  font-weight: 700;
}
.provider p {
  margin: 8px 0 0;
  max-width: 72ch;
}
.provider-categories {
  color: rgb(var(--v-theme-link));
  font-size: 0.8rem;
  font-weight: 700;
}
.provider-area {
  font-size: 0.875rem;
}
.provider-meta {
  font-size: 0.8rem;
  line-height: 1.5;
}
.provider-price {
  padding: 16px;
  align-self: start;
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.provider-price > strong,
.provider-price > span {
  display: block;
}
.price-number {
  font-size: 1.25rem;
  line-height: 1.6;
  font-variant-numeric: tabular-nums;
}
.vehicle-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 16px;
  font-size: 0.875rem;
}
.vehicle-line a {
  margin-left: 8px;
}
.provider-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 24px;
  margin-top: 16px;
  font-size: 0.875rem;
  align-items: center;
}
.provider-actions a {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  min-height: 44px;
}
.provider a {
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
  overflow-wrap: anywhere;
}
.provider a:focus-visible,
summary:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 4px;
}
.provider-details {
  margin-top: 8px;
}
summary {
  padding: 12px 0;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
}
.service-list {
  margin: 8px 0 16px;
  padding-left: 20px;
  font-size: 0.875rem;
}
.service-list li,
.provider-caveats li {
  margin-top: 4px;
}
.provider-caveats {
  margin: 16px 0;
  padding: 16px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  font-size: 0.875rem;
}
.provider-caveats ul {
  padding-left: 20px;
  margin-top: 8px;
}
.tariffs {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.tariffs th,
.tariffs td {
  text-align: left;
  vertical-align: top;
  padding: 12px 8px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.2);
}
.tariffs th {
  font-weight: 700;
}
.tariffs td:first-child {
  width: 27%;
}
.tariffs td:nth-child(2) {
  width: 22%;
}
.tariffs p {
  margin: 0 0 8px;
}
.tariff-amount {
  font-variant-numeric: tabular-nums;
}
.provider-sources {
  margin: 24px 0 0;
  padding-left: 20px;
  font-size: 0.875rem;
}
.provider-sources li {
  margin-top: 8px;
}
@media (max-width: 700px) {
  .provider-overview {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .provider-price {
    padding: 12px;
  }
  .provider-actions {
    gap: 4px 16px;
  }
  .tariffs td:first-child,
  .tariffs td:nth-child(2) {
    width: auto;
  }
}
</style>
