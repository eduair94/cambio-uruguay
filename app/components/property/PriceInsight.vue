<!--
  "Comparada con lo que hay cerca", en las fichas de alquiler y de venta. Se pide desde el navegador
  después de pintar la ficha (/api/property-insight/<operación>/<clave>): si tarda o falla, la ficha
  ya está entera y este bloque simplemente no aparece. La lógica vive en utils/propertyInsight.ts.
-->
<template>
  <section
    v-if="mounted && insight"
    class="property-insight"
    data-testid="property-price-insight"
    aria-labelledby="property-insight-title"
  >
    <h2 id="property-insight-title">{{ t('title') }}</h2>

    <template v-if="insight">
      <p class="property-insight__note">
        {{ scopeText }} {{ t(operation === 'alquiler' ? 'rentNote' : 'saleNote') }}
        <template v-if="operation === 'alquiler' && insight.subject.currency === 'USD'">
          {{ t('rentUsdNote') }}
        </template>
      </p>

      <template v-if="position">
        <span
          class="property-insight__badge"
          :class="`property-insight__badge--${position.verdict}`"
        >
          {{ t(VERDICT_KEYS[position.verdict]) }}
        </span>
        <div
          class="property-insight__bar"
          role="img"
          :aria-label="
            t('barLabel', {
              min: money(position.min),
              max: money(position.max),
              median: money(position.median),
              price: money(insight.subject.price),
            })
          "
        >
          <div class="property-insight__track" />
          <div
            class="property-insight__band"
            :style="{
              left: `${at(position.p25)}%`,
              width: `${at(position.p75) - at(position.p25)}%`,
            }"
          />
          <div class="property-insight__median" :style="{ left: `${at(position.median)}%` }" />
          <div class="property-insight__marker" :style="{ left: `${at(insight.subject.price)}%` }">
            <span :class="['property-insight__marker-label', markerEdge]">
              {{ t('thisOne', { price: money(insight.subject.price) }) }}
            </span>
          </div>
        </div>
        <div class="property-insight__scale">
          <span>{{ money(domain.min) }}</span>
          <span>{{ t('middle', { from: money(position.p25), to: money(position.p75) }) }}</span>
          <span>{{ money(domain.max) }}</span>
        </div>
        <p>
          {{
            t('summary', {
              median: money(position.median),
              price: money(insight.subject.price),
              gap: gapText(position.gap),
              cheaper: cheaperText,
            })
          }}
        </p>
        <VAlert
          v-if="position.verdict === 'muy-bajo'"
          type="warning"
          variant="outlined"
          density="compact"
          class="mb-3"
        >
          {{ t('lowWarning') }}
        </VAlert>
      </template>
      <p v-else class="property-insight__note">{{ t('noVerdict') }}</p>

      <h3>{{ t('perM2Title') }}</h3>
      <p v-if="insight.perM2">
        {{
          t('perM2', {
            value: money(insight.perM2.subject),
            median: money(insight.perM2.median),
            n: insight.perM2.n,
            gap: gapText(insight.perM2.gap),
          })
        }}
      </p>
      <p v-else-if="insight.subjectPerM2 !== null">
        {{ t('perM2Alone', { value: money(insight.subjectPerM2) }) }}
      </p>
      <p v-else class="property-insight__note">{{ t('perM2Unknown') }}</p>
      <p v-if="sizeNote" class="property-insight__note">{{ t(sizeNote) }}</p>

      <template v-if="insight.picks.length">
        <h3>{{ t('picksTitle') }}</h3>
        <p class="property-insight__note">{{ t('picksNote') }}</p>
        <ul class="property-insight__picks">
          <li v-for="item in insight.picks" :key="item.listing.key">
            <p class="property-insight__pick-label">{{ t(PICK_KEYS[item.kind]) }}</p>
            <NuxtLink :to="localePath(item.listing.path)" class="property-insight__card">
              <span class="property-insight__media">
                <img
                  v-if="item.listing.image"
                  :src="item.listing.image"
                  :alt="''"
                  width="320"
                  height="200"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                />
                <VIcon v-else icon="mdi-home-city-outline" size="36" aria-hidden="true" />
              </span>
              <span class="property-insight__body">
                <b>{{ shownMoney(item.listing) }}</b>
                <strong>{{ item.listing.title }}</strong>
                <span class="property-insight__specs">{{ specs(item.listing) }}</span>
                <span class="property-insight__diff">{{ diffText(item.listing) }}</span>
              </span>
            </NuxtLink>
          </li>
        </ul>
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import type {
  PropertyInsight,
  PropertyInsightListing,
  PropertyInsightPickKind,
  PropertyInsightVerdict,
} from '~/utils/propertyInsight'
import { propertyInsightMessages } from '~/utils/propertyInsightMessages'
import { rentalMoney } from '~/utils/rentalPresentation'

const props = defineProps<{
  operation: 'alquiler' | 'venta'
  propertyKey: string
}>()

const { t, locale } = useI18n({ useScope: 'local', messages: propertyInsightMessages })
const localePath = useLocalePath()

// Del navegador y sin bloquear: la ficha no espera a la comparativa.
const { data } = useLazyFetch<{ insight: PropertyInsight | null }>(
  () => `/api/property-insight/${props.operation}/${encodeURIComponent(props.propertyKey)}`,
  { server: false, key: `property-insight-${props.operation}-${props.propertyKey}` }
)
// El servidor nunca pinta este bloque; en el cliente la petición ya está en curso durante la
// hidratación, así que sin esta bandera el primer render del cliente no coincide con el del servidor.
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
const insight = computed(() => data.value?.insight ?? null)
const position = computed(() => insight.value?.position ?? null)

const VERDICT_KEYS: Record<PropertyInsightVerdict, string> = {
  'muy-bajo': 'verdictMuyBajo',
  bajo: 'verdictBajo',
  justo: 'verdictJusto',
  alto: 'verdictAlto',
  'muy-alto': 'verdictMuyAlto',
}
const PICK_KEYS: Record<PropertyInsightPickKind, string> = {
  'cheapest-similar': 'pickCheapestSimilar',
  'cheapest-per-m2': 'pickCheapestPerM2',
  'bigger-same-money': 'pickBigger',
  'more-bedrooms-same-money': 'pickMoreBedrooms',
  'closest-similar': 'pickClosest',
}

const money = (value: number) => rentalMoney(value, insight.value?.unit ?? 'UYU', locale.value)
const shownMoney = (listing: PropertyInsightListing) =>
  rentalMoney(listing.shown.amount, listing.shown.currency, locale.value)
const number = (value: number) =>
  new Intl.NumberFormat(
    locale.value === 'en' ? 'en-US' : locale.value === 'pt' ? 'pt-BR' : 'es-UY',
    {
      maximumFractionDigits: 1,
    }
  ).format(value)

const scopeText = computed(() => {
  const value = insight.value
  if (!value) return ''
  return value.scope.kind === 'radius'
    ? t('scopeRadius', { n: value.comparables, km: value.scope.radiusKm })
    : t('scopeNeighborhood', { n: value.comparables, zone: value.scope.neighborhood })
})

/** El dominio de la barra incluye al aviso aunque pida más (o menos) que todos. */
const domain = computed(() => {
  const value = position.value
  const price = insight.value?.subject.price ?? 0
  if (!value) return { min: 0, max: 1 }
  return { min: Math.min(value.min, price), max: Math.max(value.max, price) }
})
const at = (price: number): number => {
  const { min, max } = domain.value
  if (max <= min) return 50
  return Math.min(100, Math.max(0, ((price - min) / (max - min)) * 100))
}
/** Cerca de un borde la etiqueta se apoya hacia adentro para no salirse de la página. */
const markerEdge = computed(() => {
  const left = at(insight.value?.subject.price ?? 0)
  return left < 15
    ? 'property-insight__marker-label--start'
    : left > 85
      ? 'property-insight__marker-label--end'
      : ''
})

// Espacio duro antes del %: "16" y "%" no pueden quedar en renglones distintos.
const pct = (value: number) => `${Math.round(Math.abs(value) * 100)}\u00A0%`
const gapText = (gap: number) =>
  Math.abs(gap) < 0.01
    ? t('gapAt')
    : gap < 0
      ? t('gapBelow', { pct: pct(gap) })
      : t('gapAbove', { pct: pct(gap) })

const cheaperText = computed(() => {
  const value = position.value
  if (!value) return ''
  // Con empates (precios redondos) "el más económico" sólo si nadie pide lo mismo o menos.
  if (value.cheaperShare === 0 && value.pricierShare === 1) return t('cheaperFirst')
  // Hacia abajo y nunca 10: con uno solo más barato, "10 de cada 10" sería falso.
  const ofTen = Math.min(9, Math.floor(value.pricierShare * 10))
  return ofTen <= 0 ? t('cheaperLast') : t('cheaperOf', { n: ofTen })
})

/** Barata en total y cara por m² (o al revés): se explica con el tamaño. */
const sizeNote = computed(() => {
  const value = insight.value
  if (!value?.position || !value.perM2) return null
  const below = (gap: number) => gap <= -0.05
  const above = (gap: number) => gap >= 0.05
  if (below(value.position.gap) && above(value.perM2.gap)) return 'cheapButSmall'
  if (above(value.position.gap) && below(value.perM2.gap)) return 'priceyButBig'
  return null
})

function specs(listing: PropertyInsightListing): string {
  const parts: string[] = []
  if (listing.bedrooms === 0) parts.push(t('studio'))
  else if (listing.bedrooms !== null) parts.push(t('bedrooms', { n: listing.bedrooms }))
  if (listing.area !== null) parts.push(`${number(listing.area)} m²`)
  if (listing.pricePerM2 !== null) parts.push(t('perM2Short', { value: money(listing.pricePerM2) }))
  if (listing.distanceKm !== null)
    parts.push(
      t('distance', {
        d:
          listing.distanceKm < 1
            ? `${Math.max(50, Math.round((listing.distanceKm * 1000) / 50) * 50)} m`
            : `${number(listing.distanceKm)} km`,
      })
    )
  return parts.join(' · ')
}

function diffText(listing: PropertyInsightListing): string {
  const value = insight.value
  if (!value) return ''
  const parts: string[] = []
  const delta = listing.price - value.subject.price
  const threshold = value.unit === 'USD' ? 500 : 250
  if (Math.abs(delta) < threshold) parts.push(t('diffSame'))
  else parts.push(t(delta < 0 ? 'diffLess' : 'diffMore', { amount: money(Math.abs(delta)) }))
  if (listing.area !== null && value.subject.area !== null) {
    const area = Math.round(listing.area - value.subject.area)
    if (Math.abs(area) >= 3)
      parts.push(t(area > 0 ? 'diffAreaMore' : 'diffAreaLess', { n: Math.abs(area) }))
  }
  return `${parts.join(' · ')} ${t('diffSuffix')}`
}
</script>

<style scoped>
.property-insight {
  margin-top: 32px;
}
.property-insight h2 {
  font-size: 1.25rem;
  margin: 0 0 8px;
}
.property-insight h3 {
  font-size: 1rem;
  margin: 20px 0 6px;
}
.property-insight p {
  margin: 0 0 8px;
}
.property-insight__note {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.875rem;
}
.property-insight__badge {
  display: inline-block;
  font-weight: 700;
  font-size: 0.875rem;
  border-radius: 999px;
  padding: 4px 12px;
  border: 1px solid currentColor;
  margin: 4px 0;
}
.property-insight__badge--muy-bajo,
.property-insight__badge--bajo {
  color: rgb(var(--v-theme-success));
}
.property-insight__badge--justo {
  color: rgb(var(--v-theme-info));
}
.property-insight__badge--alto,
.property-insight__badge--muy-alto {
  color: rgb(var(--v-theme-warning));
}
.property-insight__bar {
  position: relative;
  height: 44px;
  margin: 28px 8px 4px;
}
.property-insight__track {
  position: absolute;
  left: 0;
  right: 0;
  top: 18px;
  height: 8px;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.1);
}
.property-insight__band {
  position: absolute;
  top: 18px;
  height: 8px;
  border-radius: 4px;
  background: rgba(var(--v-theme-primary), 0.45);
}
.property-insight__median {
  position: absolute;
  top: 12px;
  width: 2px;
  height: 20px;
  margin-left: -1px;
  background: rgb(var(--v-theme-on-surface));
}
.property-insight__marker {
  position: absolute;
  top: 10px;
  width: 16px;
  height: 24px;
  margin-left: -8px;
  border-radius: 8px;
  background: rgb(var(--v-theme-primary));
  border: 2px solid rgb(var(--v-theme-surface));
}
.property-insight__marker-label {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 0.8rem;
  font-weight: 700;
}
.property-insight__marker-label--start {
  left: 0;
  transform: none;
}
.property-insight__marker-label--end {
  left: auto;
  right: 0;
  transform: none;
}
.property-insight__scale {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  margin-bottom: 12px;
}
.property-insight__picks {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.property-insight__picks li {
  display: flex;
  flex-direction: column;
}
.property-insight__pick-label {
  font-weight: 700;
  font-size: 0.875rem;
  margin: 0 0 6px;
}
.property-insight__card {
  display: flex;
  flex-direction: column;
  flex: 1;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  overflow: hidden;
  color: inherit;
  text-decoration: none;
  background: rgb(var(--v-theme-surface));
}
.property-insight__media {
  position: relative;
  flex: 0 0 auto;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.property-insight__media img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.property-insight__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px 12px;
}
.property-insight__body b {
  font-size: 1.075rem;
}
.property-insight__body strong {
  font-weight: 500;
  font-size: 0.875rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.property-insight__specs,
.property-insight__diff {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
</style>
