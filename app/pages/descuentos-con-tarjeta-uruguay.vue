<template>
  <v-container fluid class="pa-2 pa-sm-4">
    <h1 class="text-h5 text-sm-h4 mb-2">Descuentos con tarjeta en Uruguay: el mapa por banco</h1>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 70ch">
      Elegí tus tarjetas y mirá en el mapa qué comercios tienen descuento con cada una — Itaú, BROU,
      Santander, BBVA, Scotiabank, OCA, Prex, Mercado Pago, ANDA y Club El País. Los datos son de la
      app <a href="https://bankos.uy" target="_blank" rel="noopener nofollow">Bankos</a>; podés
      agregar todas las tarjetas que quieras y se combinan en un solo mapa.
    </p>

    <!-- Cross-links to the card / bank family -->
    <div class="d-flex flex-wrap ga-2 mb-4">
      <v-chip
        size="small"
        variant="tonal"
        color="primary"
        prepend-icon="mdi-bank-outline"
        :to="localePath('/mejores-bancos-uruguay')"
      >
        Mejores bancos (tier list)
      </v-chip>
      <v-chip
        size="small"
        variant="tonal"
        prepend-icon="mdi-credit-card-multiple-outline"
        :to="localePath('/tarjetas-de-credito-uruguay')"
      >
        Tarjetas de crédito
      </v-chip>
      <v-chip
        size="small"
        variant="tonal"
        prepend-icon="mdi-credit-card-outline"
        :to="localePath('/tarjetas-de-debito-uruguay')"
      >
        Tarjetas de débito
      </v-chip>
      <v-chip
        size="small"
        variant="tonal"
        prepend-icon="mdi-receipt-text-outline"
        :to="localePath('/pagar-cuentas-con-tarjeta')"
      >
        Pagar cuentas con tarjeta
      </v-chip>
      <v-chip
        size="small"
        variant="tonal"
        prepend-icon="mdi-star-outline"
        :to="localePath('/mi-lista')"
      >
        Mi lista
      </v-chip>
    </div>

    <!-- Card selector -->
    <v-card variant="outlined" class="mb-4">
      <v-card-item class="pb-1">
        <v-card-title class="text-subtitle-1 d-flex align-center">
          <v-icon start size="small">mdi-credit-card-plus-outline</v-icon>
          Tus tarjetas
          <v-chip
            v-if="selectedCards.length"
            size="x-small"
            class="ml-2"
            color="primary"
            variant="flat"
          >
            {{ selectedCards.length }}
          </v-chip>
          <v-spacer />
          <v-btn variant="text" @click="selectAll">Todas</v-btn>
          <v-btn v-if="selectedCards.length" variant="text" @click="clearAll">Limpiar</v-btn>
        </v-card-title>
      </v-card-item>
      <v-card-text class="pt-1">
        <div v-for="bank in banks" :key="bank.id" class="mb-2">
          <div class="d-flex flex-wrap align-center ga-2">
            <span class="bank-dot" :style="{ background: bank.color }" />
            <span class="text-caption font-weight-medium mr-1" style="min-width: 92px">{{
              bank.name
            }}</span>
            <v-chip
              v-for="card in cardsByBank[bank.id]"
              :key="card.id"
              size="small"
              :variant="selected.has(card.id) ? 'flat' : 'outlined'"
              :color="selected.has(card.id) ? 'primary' : undefined"
              @click="toggleCard(card.id)"
            >
              <v-icon start size="x-small">{{
                card.type === 'credit' ? 'mdi-credit-card' : 'mdi-card-bulleted-outline'
              }}</v-icon>
              {{ card.type === 'credit' ? 'Crédito' : 'Débito' }}
            </v-chip>
          </div>
        </div>
        <div class="text-caption text-medium-emphasis mt-2 d-flex align-center flex-wrap ga-1">
          <v-icon size="x-small">{{
            isLoggedIn ? 'mdi-cloud-check-outline' : 'mdi-laptop'
          }}</v-icon>
          <span v-if="isLoggedIn">Sincronizado con tu cuenta.</span>
          <span v-else>
            Guardado en este navegador.
            <NuxtLink :to="localePath('/conectar')">Iniciá sesión</NuxtLink> para sincronizarlas en
            tus dispositivos.
          </span>
        </div>
      </v-card-text>
    </v-card>

    <!-- Empty state -->
    <v-alert
      v-if="!selectedBankIds.length"
      type="info"
      variant="tonal"
      density="comfortable"
      class="mb-4"
    >
      Agregá al menos una tarjeta arriba para ver los comercios con descuento en el mapa.
    </v-alert>

    <template v-else>
      <!-- Controls -->
      <v-row dense class="mb-2">
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            v-model="search"
            label="Buscar comercio"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            prepend-inner-icon="mdi-magnify"
          />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="category"
            :items="categoryItems"
            label="Categoría"
            density="compact"
            variant="outlined"
            hide-details
          />
        </v-col>
        <v-col cols="6" sm="6" md="2">
          <v-select
            v-model="sortBy"
            :items="sortItems"
            label="Ordenar"
            density="compact"
            variant="outlined"
            hide-details
          />
        </v-col>
        <v-col cols="6" sm="6" md="3" class="d-flex align-center">
          <v-btn color="primary" :loading="locating" block @click="locate">
            <v-icon start>mdi-crosshairs-gps</v-icon>Cerca mío
          </v-btn>
        </v-col>
      </v-row>

      <v-row v-if="userLocation" dense class="mb-1">
        <v-col cols="12" md="6" class="d-flex align-center">
          <span class="text-caption mr-2">Radio: {{ radiusKm }} km</span>
          <v-slider
            v-model="radiusKm"
            :min="1"
            :max="30"
            :step="1"
            hide-details
            density="compact"
            aria-label="Radio en km"
          />
        </v-col>
      </v-row>

      <v-alert
        v-if="geoError"
        type="warning"
        density="compact"
        class="mb-2"
        closable
        @click:close="geoError = ''"
      >
        {{ geoError }}
      </v-alert>

      <!-- Source / counts -->
      <div class="d-flex flex-wrap align-center ga-2 mb-2 text-caption text-medium-emphasis">
        <v-chip size="x-small" :color="sourceColor" variant="tonal">
          <v-icon start size="x-small">{{ sourceIcon }}</v-icon
          >{{ sourceLabel }}
        </v-chip>
        <span v-if="pending">Cargando descuentos…</span>
        <span v-else
          >{{ filtered.length }} de {{ items.length }} comercios · {{ brandsCount }} marcas</span
        >
        <span v-if="generatedAt">· actualizado {{ formatDate(generatedAt) }}</span>
      </div>

      <v-row>
        <v-col cols="12" md="8">
          <LocationsMap
            ref="mapRef"
            :branches="mapBranches"
            :user-location="userLocation"
            :radius-km="userLocation ? radiusKm : 0"
            :highlight-id="highlightId"
            :popup-for="popupFor"
            height="70vh"
            @marker-click="onMarkerClick"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-card variant="outlined" class="ranked-panel">
            <v-card-title class="text-subtitle-1">
              {{ userLocation ? 'Más cercanos' : 'Comercios con descuento' }}
            </v-card-title>
            <v-card-text v-if="pending" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" />
            </v-card-text>
            <v-card-text v-else-if="!filtered.length">
              Ningún comercio coincide con el filtro.
            </v-card-text>
            <v-card-text v-else class="pa-0">
              <v-list density="compact" lines="two">
                <v-list-item
                  v-for="item in visibleList"
                  :key="item.locationId"
                  :active="item.locationId === highlightId"
                  @click="focus(item.locationId)"
                >
                  <v-list-item-title class="d-flex align-center">
                    {{ item.brandName }}
                    <span v-if="item.rating >= 4.5" class="ml-1 text-amber">★</span>
                    <span
                      v-if="item.distanceKm != null"
                      class="text-caption text-medium-emphasis ml-auto"
                    >
                      {{ item.distanceKm.toFixed(1) }} km
                    </span>
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    <span v-for="b in item.banks" :key="b.bankId" class="mr-1">
                      <v-chip
                        size="x-small"
                        label
                        :style="{ background: b.color, color: readableText(b.color) }"
                        >{{ b.bankName }}</v-chip
                      >
                    </span>
                  </v-list-item-subtitle>
                  <div class="text-caption text-medium-emphasis mt-1">{{ bestDiscount(item) }}</div>
                </v-list-item>
              </v-list>
              <div v-if="filtered.length > visibleList.length" class="text-center pa-2">
                <v-btn size="small" variant="text" @click="listLimit += 200">
                  Ver más ({{ filtered.length - visibleList.length }})
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Context / SEO body -->
    <v-card variant="tonal" class="mt-6">
      <v-card-text style="max-width: 75ch">
        <h2 class="text-h6 mb-2">Cómo funciona</h2>
        <p class="text-body-2 mb-2">
          Cada banco negocia sus propios descuentos con los comercios. Al elegir tus tarjetas, el
          mapa muestra únicamente los locales que tienen beneficio con alguno de tus bancos, con el
          detalle de crédito y débito. Si tenés tarjetas de varios bancos, se combinan: vas a ver la
          unión de todos los beneficios.
        </p>
        <p class="text-body-2 mb-2">
          El descuento real depende de la tarjeta puntual, el día y los topes de cada banco.
          Verificá siempre las condiciones vigentes antes de pagar. Para comparar qué banco te
          conviene por reintegros y app, mirá la
          <NuxtLink :to="localePath('/mejores-bancos-uruguay')">tier list de bancos</NuxtLink> y las
          <NuxtLink :to="localePath('/tarjetas-de-credito-uruguay')"
            >tarjetas de crédito por puntos y beneficios</NuxtLink
          >.
        </p>
        <p class="text-caption text-medium-emphasis">
          Datos de Bankos (bankos.uy). Este sitio no está afiliado a Bankos ni a los bancos
          mencionados.
        </p>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import LocationsMap from '~/components/map/LocationsMap.vue'
import {
  BANKOS_BANKS,
  BANKOS_CARDS,
  bankIdsForCards,
  type BankosDiscountsResponse,
  type BankosItem,
} from '~/utils/bankos'
import { useBankosCardsStore } from '~/stores/bankosCards'
import { useAuthStore } from '~/stores/auth'

const localePath = useLocalePath()

const banks = BANKOS_BANKS
const cardsByBank = computed<Record<string, typeof BANKOS_CARDS>>(() => {
  const m: Record<string, typeof BANKOS_CARDS> = {}
  for (const c of BANKOS_CARDS) (m[c.bankId] ||= []).push(c)
  return m
})

// Selection lives in a pinia store: localStorage for anonymous users, synced to the account on
// login (the firebase.client plugin calls hydrateFromAccount, unioning local + saved). The store
// owns persistence, so the page just reads/mutates it.
const cardsStore = useBankosCardsStore()
const auth = useAuthStore()
const isLoggedIn = computed(() => auth.isLoggedIn)

const selectedCards = computed(() => cardsStore.cards)
const selected = computed(() => new Set(cardsStore.cards))
const selectedBankIds = computed(() => bankIdsForCards(cardsStore.cards))

function toggleCard(id: string) {
  cardsStore.toggle(id)
}
function selectAll() {
  cardsStore.selectAll()
}
function clearAll() {
  cardsStore.clear()
}

onMounted(() => cardsStore.loadLocal())

// --- Data ---
const banksParam = computed(() => [...selectedBankIds.value].sort().join(','))
const { data, pending, refresh } = await useLazyAsyncData<BankosDiscountsResponse>(
  'bankos-discounts',
  () =>
    banksParam.value
      ? $fetch('/api/bankos/discounts', { query: { banks: banksParam.value } })
      : Promise.resolve({
          source: 'cache',
          generatedAt: null,
          banks: [],
          brandsCount: 0,
          locationsCount: 0,
          items: [],
        }),
  { watch: [banksParam], server: false }
)

const items = computed(() => data.value?.items ?? [])
const brandsCount = computed(() => data.value?.brandsCount ?? 0)
const generatedAt = computed(() => data.value?.generatedAt ?? null)
const source = computed(() => data.value?.source ?? 'cache')

const sourceLabel = computed(() =>
  source.value === 'snapshot' ? 'Datos de respaldo' : 'Datos en vivo'
)
const sourceColor = computed(() => (source.value === 'snapshot' ? 'warning' : 'success'))
const sourceIcon = computed(() =>
  source.value === 'snapshot' ? 'mdi-database-clock-outline' : 'mdi-access-point'
)

// --- Filters ---
const search = ref('')
const category = ref('__all__')
const sortBy = ref<'distance' | 'rating' | 'name'>('rating')
const sortItems = [
  { title: 'Mejor puntuados', value: 'rating' },
  { title: 'Cercanía', value: 'distance' },
  { title: 'Nombre', value: 'name' },
]
const categoryItems = computed(() => {
  const set = new Set<string>()
  for (const it of items.value) for (const c of it.categories) set.add(c)
  return [
    { title: 'Todas las categorías', value: '__all__' },
    ...[...set].sort().map(c => ({ title: c, value: c })),
  ]
})

// Geolocation
const userLocation = ref<{ lat: number; lng: number } | null>(null)
const radiusKm = ref(5)
const locating = ref(false)
const geoError = ref('')
function locate() {
  if (!import.meta.client || !navigator.geolocation) {
    geoError.value = 'Tu navegador no permite geolocalización.'
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    pos => {
      userLocation.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      if (sortBy.value === 'rating') sortBy.value = 'distance'
      locating.value = false
    },
    () => {
      geoError.value = 'No pudimos obtener tu ubicación; usamos el centro de Montevideo.'
      userLocation.value = { lat: -34.9011, lng: -56.1645 }
      locating.value = false
    },
    { enableHighAccuracy: true, timeout: 8000 }
  )
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

type EnrichedItem = BankosItem & { distanceKm: number | null }

const filtered = computed<EnrichedItem[]>(() => {
  const q = search.value.trim().toLowerCase()
  const cat = category.value
  const here = userLocation.value
  let list: EnrichedItem[] = items.value.map(it => ({
    ...it,
    distanceKm: here ? haversineKm(here, { lat: it.lat, lng: it.lng }) : null,
  }))
  if (q) list = list.filter(it => it.brandName.toLowerCase().includes(q))
  if (cat !== '__all__') list = list.filter(it => it.categories.includes(cat))
  if (here) list = list.filter(it => it.distanceKm == null || it.distanceKm <= radiusKm.value)
  list.sort((a, b) => {
    if (sortBy.value === 'distance' && here) return (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9)
    if (sortBy.value === 'name') return a.brandName.localeCompare(b.brandName)
    return (b.rating || 0) - (a.rating || 0)
  })
  return list
})

const listLimit = ref(200)
watch([search, category, sortBy, banksParam], () => (listLimit.value = 200))
const visibleList = computed(() => filtered.value.slice(0, listLimit.value))

// Map branches (capped so we never hand Leaflet tens of thousands of markers)
const MAP_CAP = 4000
const mapBranches = computed(() =>
  filtered.value.slice(0, MAP_CAP).map(it => ({
    origin: it.banks[0]?.bankId || 'bankos',
    id: it.locationId,
    name: it.brandName,
    dept: '',
    locality: it.categories[0] || '',
    address: '',
    phone: '',
    hours: '',
    lat: it.lat,
    lng: it.lng,
    mapUrl: `https://www.google.com/maps/search/${encodeURIComponent(it.brandName + ' Uruguay')}`,
    source: 'bankos',
    _item: it,
  }))
)

const highlightId = ref<string | null>(null)
const mapRef = ref<any>(null)
function onMarkerClick(b: any) {
  highlightId.value = b.id
}
function focus(id: string) {
  highlightId.value = id
  mapRef.value?.focusBranch(id)
}

function bestDiscount(it: BankosItem): string {
  for (const b of it.banks) {
    if (b.creditDescription) return `${b.bankName}: ${b.creditDescription}`
    if (b.debitDescription) return `${b.bankName}: ${b.debitDescription}`
  }
  return ''
}

/** Foreground (#fff or near-black) that keeps ≥4.5:1 on an arbitrary brand colour. */
function readableText(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return '#ffffff'
  const n = m[1]
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  const L =
    0.2126 * lin(parseInt(n.slice(0, 2), 16) / 255) +
    0.7152 * lin(parseInt(n.slice(2, 4), 16) / 255) +
    0.0722 * lin(parseInt(n.slice(4, 6), 16) / 255)
  // contrast vs white = 1.05/(L+0.05); vs near-black = (L+0.05)/0.05
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.05 ? '#ffffff' : '#1a2027'
}

function popupFor(b: any): string {
  const it: BankosItem = b._item
  const esc = (s: string) =>
    String(s).replace(
      /[&<>"]/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string
    )
  const cats = it.categories?.length ? `<br><em>${esc(it.categories.join(', '))}</em>` : ''
  const lines = it.banks
    .map(bk => {
      const parts: string[] = []
      if (bk.creditDescription) parts.push(`Crédito: ${esc(bk.creditDescription)}`)
      if (bk.debitDescription) parts.push(`Débito: ${esc(bk.debitDescription)}`)
      // Colour lives in a swatch, never the label text — a light brand colour as text
      // fails contrast on the popup's white background (Club El País, Mercado Pago).
      const swatch = `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${esc(bk.color)};margin-right:4px;vertical-align:middle"></span>`
      return `<div style="margin-top:4px">${swatch}<strong>${esc(bk.bankName)}</strong><br>${parts.join('<br>')}</div>`
    })
    .join('')
  const dir = esc(b.mapUrl)
  return (
    `<strong>${esc(it.brandName)}</strong>` +
    (it.rating ? ` ★${it.rating.toFixed(1)}` : '') +
    cats +
    lines +
    `<br><a href="${dir}" target="_blank" rel="noopener">Buscar en Google Maps →</a>`
  )
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-UY', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// Refresh once when the component mounts if cards were restored from storage.
onMounted(() => {
  if (banksParam.value) refresh()
})

// --- SEO ---
const canonicalUrl = 'https://cambio-uruguay.com/descuentos-con-tarjeta-uruguay'
defineOgImageComponent('Cambio', {
  title: 'Descuentos con tarjeta en Uruguay',
  subtitle: 'El mapa de beneficios por banco',
  tag: 'Descuentos',
})
useSeoMeta({
  title: 'Descuentos con tarjeta en Uruguay: mapa por banco | Cambio Uruguay',
  description:
    'Mapa interactivo de descuentos por banco y tarjeta en Uruguay: Itaú, BROU, Santander, BBVA, Scotiabank, OCA, Prex, Mercado Pago, ANDA y Club El País. Agregá tus tarjetas y encontrá comercios con beneficio cerca tuyo.',
  ogTitle: 'Descuentos con tarjeta en Uruguay: el mapa por banco',
  ogDescription:
    'Elegí tus tarjetas y mirá qué comercios tienen descuento con cada banco, en un mapa por cercanía.',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebApplication',
            name: 'Mapa de descuentos con tarjeta — Uruguay',
            applicationCategory: 'FinanceApplication',
            operatingSystem: 'Web',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'UYU' },
            url: canonicalUrl,
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Descuentos con tarjeta',
                item: canonicalUrl,
              },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.ranked-panel {
  max-height: 70vh;
  overflow-y: auto;
}
.bank-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex: 0 0 auto;
}
</style>
