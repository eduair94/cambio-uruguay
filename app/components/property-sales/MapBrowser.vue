<template>
  <section class="sale-map" :aria-label="t('map')" :aria-busy="pending">
    <p v-if="data" class="sale-map__count">
      {{ t('mapCount', { located: data.located, total: data.total }) }}
    </p>
    <p class="sale-map__hint">{{ t(data?.points.length ? 'mapHint' : 'zoneHint') }}</p>
    <p v-if="data && data.located > data.shown" class="sale-map__hint">
      {{ t('mapLimit', { n: data.limit }) }}
    </p>
    <VAlert v-if="error" type="error" variant="tonal" class="sale-request-status-message">
      {{ t('error') }}
      <VBtn variant="text" @click="refresh()">{{ t('retry') }}</VBtn>
    </VAlert>
    <div v-else-if="pending" class="sale-map__loading" role="status">
      <VProgressCircular indeterminate color="primary" />
      <span>{{ t('loading') }}</span>
    </div>
    <template v-else-if="data">
      <div
        v-if="data.points.length || data.zones?.length"
        class="sale-map__layout"
        :class="{ 'sale-map__layout--selected': selected }"
      >
        <ClientOnly>
          <LocationsMap
            ref="map"
            :branches="branches"
            :zones="mapZones"
            :popups="false"
            :marker-hit-size="44"
            :highlight-id="selected"
            fit-to-markers
            height="min(65dvh, 620px)"
            @marker-click="selectPoint($event.id)"
            @zone-click="selectMapZone($event.id)"
          />
        </ClientOnly>
        <section
          v-if="selected"
          ref="panel"
          class="sale-map__panel"
          tabindex="-1"
          @keydown.esc.stop="closeDetail()"
        >
          <header>
            <h2>{{ t('facts') }}</h2>
            <VBtn icon="mdi-close" variant="text" :aria-label="t('close')" @click="closeDetail()" />
          </header>
          <div v-if="detailPending" class="sale-map__loading" role="status">
            <VProgressCircular indeterminate color="primary" />
            {{ t('detailsLoading') }}
          </div>
          <VAlert
            v-else-if="detailError"
            type="error"
            variant="tonal"
            class="sale-request-status-message"
          >
            {{ t('mapDetailError') }}
            <VBtn variant="text" @click="selectPoint(selected)">{{ t('retry') }}</VBtn>
          </VAlert>
          <template v-else-if="detail">
            <PropertySalesListingCard :property="detail.property" :area-basis="query.areaBasis" />
            <p class="sale-map__precision">
              {{ t(detail.property.geo?.precision === 'approximate' ? 'approximate' : 'exact') }}
            </p>
            <p v-if="detail.property.description" class="sale-map__description">
              {{ detail.property.description.slice(0, 600)
              }}{{ detail.property.description.length > 600 ? '…' : '' }}
            </p>
            <div class="sale-map__amenities">
              <span v-for="amenity in detail.property.amenities.slice(0, 10)" :key="amenity">
                {{ amenity }}
              </span>
            </div>
            <PropertyAdvertiserContact :publisher="detail.property" />
            <PropertyNearbyServices operation="sale" :property-key="detail.property.key" />
          </template>
        </section>
      </div>
      <VAlert v-else type="info" variant="tonal" class="sale-request-status-message">
        {{ t('mapEmpty') }}
        <VBtn variant="text" @click="$emit('list')">{{ t('list') }}</VBtn>
      </VAlert>
      <div v-if="data.zones?.length" class="sale-map__zones">
        <h2>{{ t('zoneTitle') }}</h2>
        <p>{{ t('zoneHint') }}</p>
        <div>
          <VBtn
            v-for="zone in data.zones"
            :key="`${zone.department}:${zone.neighborhood}`"
            variant="tonal"
            prepend-icon="mdi-map-marker-radius-outline"
            @click="$emit('zone', zone)"
          >
            {{ zone.neighborhood }} · {{ zone.count.toLocaleString() }}
          </VBtn>
        </div>
      </div>
    </template>
  </section>
</template>
<script setup lang="ts">
import {
  propertySalesQueryToParams,
  propertySaleMoney,
  type PropertySalesQuery,
  type PropertySalesMapResponse,
  type PropertySaleDetailResponse,
} from '~/utils/propertySales'
import { propertySalesMessages } from '~/utils/propertySalesMessages'
const props = defineProps<{ query: PropertySalesQuery }>()
const emit = defineEmits<{ list: []; zone: [zone: { department: string; neighborhood: string }] }>()
const { t, locale } = useI18n({ useScope: 'local', messages: propertySalesMessages })
const LocationsMap = defineAsyncComponent(() => import('~/components/map/LocationsMap.vue'))
const params = computed(() => propertySalesQueryToParams(props.query))
const { data, pending, error, refresh } = await useAsyncData(
  'property-sales-map',
  () => $fetch<PropertySalesMapResponse>('/api/property-sales/mapa', { query: params.value }),
  { server: false, watch: [params] }
)
const selected = ref<string | null>(null)
const detail = ref<PropertySaleDetailResponse | null>(null)
const detailPending = ref(false)
const detailError = ref(false)
const panel = ref<HTMLElement | null>(null)
const map = ref<{ focusMarker: (key: string) => boolean } | null>(null)
let controller: AbortController | null = null
let previousScroll = 0
const mapZones = computed(() =>
  (data.value?.zones || []).map((zone, index) => ({
    id: `sale-zone-${index}`,
    lat: zone.lat,
    lng: zone.lng,
    count: zone.count,
    label: t('zoneLabel', { name: zone.neighborhood, n: zone.count.toLocaleString(locale.value) }),
  }))
)
function selectMapZone(id: string) {
  const zone = data.value?.zones?.[Number(id.replace('sale-zone-', ''))]
  if (zone) emit('zone', zone)
}
const branches = computed(() =>
  (data.value?.points || []).map(point => ({
    id: point.key,
    origin: 'property-sales',
    name: `${propertySaleMoney(point.price.amount, point.price.currency, locale.value)} · ${point.title}`,
    dept: point.department,
    locality: point.locality,
    address: '',
    phone: '',
    hours: '',
    lat: point.lat,
    lng: point.lng,
    mapUrl: '',
    source: 'property-sales',
  }))
)
async function selectPoint(key: string) {
  if (!selected.value) previousScroll = window.scrollY
  controller?.abort()
  const current = new AbortController()
  controller = current
  selected.value = key
  detail.value = null
  detailPending.value = true
  detailError.value = false
  await nextTick()
  panel.value?.focus({ preventScroll: true })
  if (window.innerWidth < 1200) panel.value?.scrollIntoView({ block: 'start', behavior: 'instant' })
  try {
    const result = await $fetch<PropertySaleDetailResponse>(
      `/api/property-sales/ficha/${encodeURIComponent(key)}`,
      { signal: current.signal }
    )
    if (!current.signal.aborted) detail.value = result
  } catch {
    if (!current.signal.aborted) detailError.value = true
  } finally {
    if (!current.signal.aborted) detailPending.value = false
  }
}
function closeDetail(restore = true) {
  const key = selected.value
  controller?.abort()
  selected.value = null
  detail.value = null
  if (key && restore)
    nextTick(() => {
      map.value?.focusMarker(key)
      if (window.innerWidth < 1200) window.scrollTo({ top: previousScroll, behavior: 'instant' })
    })
}
watch(params, () => closeDetail(false))
onBeforeUnmount(() => controller?.abort())
</script>
<style scoped>
:where(.sale-map) :where(p, h2) {
  margin: 0;
}
.sale-map__count {
  font-size: 0.95rem;
  font-weight: 700;
}
.sale-map .sale-map__hint {
  margin-top: 8px;
  margin-bottom: 12px;
  font-size: 0.83rem;
  color: rgba(var(--v-theme-on-surface), 0.73);
}
.sale-map__layout {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.13);
  border-radius: 14px;
  overflow: hidden;
  isolation: isolate;
}
.sale-map__layout--selected {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
}
.sale-map__panel {
  scroll-margin-top: 130px;
  min-width: 0;
  padding: 12px;
  background: rgb(var(--v-theme-surface));
  max-height: 620px;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.sale-map__panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.sale-map h2 {
  font-size: 1.05rem;
}
.sale-map__loading {
  min-height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}
.sale-map .sale-map__precision {
  font-size: 0.78rem;
  margin-top: 12px;
}
.sale-map .sale-map__description {
  font-size: 0.85rem;
  white-space: pre-line;
  margin-top: 16px;
}
.sale-map__amenities {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}
.sale-map__amenities span {
  font-size: 0.75rem;
  padding: 4px 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  border-radius: 6px;
}
.sale-map__zones {
  margin-top: 24px;
}
.sale-map__zones > p {
  font-size: 0.85rem;
  margin-top: 8px;
  margin-bottom: 12px;
}
.sale-map__zones > div {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.sale-map__zones .v-btn {
  min-height: 44px;
}
.sale-map__panel:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}
@media (max-width: 1199px) {
  .sale-map__layout--selected {
    display: block;
  }
  .sale-map__panel {
    max-height: none;
    border-top: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  }
  .sale-map__panel :deep(.sale-card) {
    display: grid;
    grid-template-columns: minmax(180px, 0.8fr) 1fr;
  }
  .sale-map__panel :deep(.sale-card__photo) {
    height: 100%;
  }
}
@media (max-width: 599px) {
  .sale-map__panel :deep(.sale-card) {
    display: block;
  }
  .sale-map__panel {
    padding: 10px;
  }
}
</style>
