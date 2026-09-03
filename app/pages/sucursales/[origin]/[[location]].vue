<template>
  <div>
    <!-- Header Section -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center flex-wrap ga-3 py-4">
            <v-icon class="mr-2" color="primary">mdi-bank</v-icon>
            <!-- Mismo caso que /historico/<casa>: la plantilla no emitía ningún encabezado de
                 nivel 1. /sucursales/brou/montevideo son 11.303 impresiones. -->
            <h1 class="text-h5 text-md-h4 ma-0">
              {{ $t('sucursalesMenu') }} - {{ exchangeHouseName }}
            </h1>
            <v-spacer />
            <v-chip color="success" size="small">
              <v-icon start size="small">mdi-map-marker</v-icon>
              {{ location || $t('todasLasUbicaciones') }}
            </v-chip>
          </v-card-title>

          <!-- Hub cross-link into the comprehensive /casa page (rate + branches
               + reputation) so it gains internal links to rank for "cambio X". -->
          <v-card-text class="pt-0 pb-2">
            <NuxtLink
              :to="localePath(`/casa/${origin}`)"
              class="casa-hub-link d-inline-flex align-center ga-1"
            >
              <v-icon size="small">mdi-bank-outline</v-icon>
              Ver todo sobre {{ exchangeHouseName }}: cotización de hoy, sucursales y opiniones
              <v-icon size="small">mdi-arrow-right</v-icon>
            </NuxtLink>
          </v-card-text>

          <!-- External Maps Button -->
          <v-card-text class="pb-0">
            <v-btn
              v-if="mapsUrl"
              :href="mapsUrl"
              target="_blank"
              rel="noopener noreferrer"
              color="blue-darken-4"
              variant="flat"
              prepend-icon="mdi-google-maps"
              class="mb-4"
            >
              {{ $t('verEnGoogleMaps') }}
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Special Messages for Prex and EBROU -->
    <v-row v-if="specialMessage">
      <v-col cols="12">
        <v-alert type="info" prominent border="start" class="ma-4">
          <h3>{{ $t('informacionImportante') }}</h3>
          <p>{{ specialMessage }}</p>
        </v-alert>
      </v-col>
    </v-row>

    <!-- Loading State -->
    <v-row v-else-if="pending">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4 text-h6">{{ $t('cargandoSucursales') }}</p>
      </v-col>
    </v-row>

    <!-- Error State -->
    <v-row v-else-if="error">
      <v-col cols="12">
        <v-alert type="error" prominent class="ma-4">
          <h3>{{ $t('errorCargarDatos') }}</h3>
          <p>{{ error.message || error }}</p>
        </v-alert>
      </v-col>
    </v-row>

    <!-- Data Table -->
    <v-row v-else>
      <v-col v-if="mapBranches.length" cols="12">
        <LocationsMap
          :branches="mapBranches"
          :zoom="mapBranches.length === 1 ? 14 : 10"
          height="50vh"
          :directions-label="t('map.directions')"
        />
      </v-col>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon start>mdi-table</v-icon>
            {{ $t('listaSucursales') }}
            <v-spacer />
            <span class="text-caption">
              {{ branchesData?.length || 0 }} {{ $t('sucursalesEncontradas') }}
            </span>
          </v-card-title>

          <v-data-table
            v-if="branchesData?.length"
            :headers="headers"
            :items="branchesData"
            :mobile="$vuetify.display.mobile"
            :items-per-page="25"
            :items-per-page-options="[
              { value: 10, title: '10' },
              { value: 25, title: '25' },
              { value: 50, title: '50' },
              { value: 100, title: '100' },
            ]"
            class="elevation-1"
            density="compact"
          >
            <!-- Custom slots for better mobile display -->
            <template #item.NroSucursal="{ item }">
              <v-chip size="small" color="primary" variant="tonal">
                {{ (item as any).NroSucursal }}
              </v-chip>
            </template>

            <template #item.Direccion="{ item }">
              <div class="text-wrap">
                {{ (item as any).Direccion }}
              </div>
            </template>

            <template #item.Telefono="{ item }">
              <div class="text-wrap">
                {{ (item as any).Telefono }}
              </div>
            </template>

            <template #item.Horarios="{ item }">
              <div class="text-wrap text-caption">
                {{ (item as any).Horarios }}
              </div>
            </template>

            <template #item.distance="{ item }">
              <v-chip v-if="(item as any).distance" size="small" color="info" variant="tonal">
                {{ ((item as any).distance / 1000).toFixed(1) }} km
              </v-chip>
            </template>
          </v-data-table>

          <!-- No data state -->
          <v-card-text v-else class="text-center pa-8">
            <v-icon size="64" color="grey-lighten-1" class="mb-4"> mdi-bank-off </v-icon>
            <h3 class="text-h6 mb-2">{{ $t('noSucursalesEncontradas') }}</h3>
            <p class="text-body-2 text-grey">
              {{ $t('noSucursalesDisponibles') }}
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import LocationsMap from '~/components/map/LocationsMap.vue'
import { deptKey, deptLabel, humaniseOrigin, type BranchPage } from '~/utils/branches'

interface BranchDirectory {
  branches: BranchPage[]
  casas: Record<string, { name: string }>
  usd: Record<string, { buy: number; sell: number }>
}

// Define page meta for route validation
// Rechaza casas y departamentos inventados en la GUARDA, no en el setup.
//
// Antes alcanzaba con que existiera el parámetro, así que /sucursales/no_existe_casa/montevideo
// respondía 200 con 229 KB, canonical a sí misma y `index, follow` — un espacio de rastreo infinito
// colgando de la segunda familia con más impresiones del sitio (63.359 en 28 días). Lo mismo con un
// departamento inventado en una casa que sí existe.
//
// Va en `validate` y no con `createError` en el setup por lo que ya documenta /sucursal/<slug>:
// lanzar después de un `await` dentro del setup renderiza la página de error pero contesta 200, que
// es exactamente el soft 404 que se quiere evitar. La ruta del directorio está cacheada en Nitro,
// así que la guarda no cuesta una llamada upstream.
definePageMeta({
  validate: async route => {
    const origin = String(route.params.origin ?? '')
    if (!origin) return false
    try {
      const directory = await $fetch<{
        branches: Array<{ origin: string; dept: string }>
        casas: Record<string, unknown>
      }>('/api/branches')
      if (!directory?.casas?.[origin]) return false

      const location = route.params.location
      if (!location) return true

      // Normalizador INLINE, no `deptKey`: `definePageMeta` es una macro que el compilador extrae
      // de este módulo, así que no puede referenciar nada de su ámbito. Es la misma normalización
      // (sin tildes, minúscula, separadores a espacio) que usa utils/branches.ts.
      const norm = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036F]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ' ')
          .trim()

      const wanted = norm(String(location))
      return (directory.branches ?? []).some(
        branch => branch.origin === origin && norm(branch.dept) === wanted
      )
    } catch {
      // Directorio inalcanzable: no se puede 404ear con seguridad, así que se renderiza y degrada.
      return true
    }
  },
})

// Composables
const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { getExchangesByOriginLocation } = useApiService()

// Extract route parameters
const origin = route.params.origin as string
const location = route.params.location as string | undefined

// The cached branch directory: real casa names, real department labels and
// today's USD quote. Search Console showed this page bleeding clicks —
// `/sucursales/gales/montevideo` sits at position 5,1 with 0,69% CTR and
// `/sucursales/brou/montevideo` at 8,9 with 0,36% — because the title was built
// from the URL slug ("Sucursales y horarios de Brou - MONTEVIDEO": a mangled
// brand and a shouting department) and the description said nothing specific.
// BLOCKING on purpose, unlike the table below: the title and description are
// built from this, and a lazy fetch resolves after the SSR render — Google
// would receive the fallback ("Brou", zero branches, no rate), which is exactly
// the snippet being fixed. It reads one Nitro route cached for 30 minutes.
//
// El `transform` recorta a ESTA casa antes de serializar, y no es cosmético: `/api/branches`
// devuelve el directorio entero (todas las casas, sus 528 sucursales y la cotización de cada una),
// y esta página lee tres cosas —el nombre de la casa, sus sucursales y su dólar—. Medido en
// producción el 2026-09-03 sobre /sucursales/brou/montevideo: la página pesaba 595.580 bytes, de
// los cuales 233.275 eran este documento dentro de __NUXT_DATA__. Es la misma lección que dejó la
// familia /historico con 1,18 MB: lo que entra en `data` viaja entero al navegador, se use o no.
//
// La clave del caché incluye el origen porque el contenido ahora depende de él; con la clave
// compartida, la segunda casa renderizada en el mismo proceso se habría quedado con el recorte de
// la primera.
const { data: directory } = await useAsyncData(
  `branch-directory-${origin}`,
  () => $fetch<BranchDirectory>('/api/branches'),
  {
    transform: (all: BranchDirectory): BranchDirectory => ({
      branches: (all?.branches ?? []).filter(branch => branch.origin === origin),
      casas: all?.casas?.[origin] ? { [origin]: all.casas[origin]! } : {},
      usd: all?.usd?.[origin] ? { [origin]: all.usd[origin]! } : {},
    }),
  }
)

/**
 * Display name of the casa, from `localData` rather than the URL.
 *
 * The slug fallback capitalises naively, which turns `brou` into "Brou" and
 * `itau` into "Itau" — a brand query whose own name is misspelled in the result
 * title is a click nobody makes.
 */
const exchangeHouseName = computed(() => {
  const known = directory.value?.casas?.[origin]?.name
  if (known && known.trim()) return known.trim()
  return humaniseOrigin(origin)
})

/** Branches of this casa, narrowed to the requested department when there is one. */
const directoryBranches = computed(() => {
  const all = (directory.value?.branches ?? []).filter(branch => branch.origin === origin)
  if (!location) return all
  const wanted = deptKey(location)
  return all.filter(branch => deptKey(branch.dept) === wanted)
})

/** The department in title case (`'TREINTA Y TRES'` -> `'Treinta y Tres'`). */
const locationLabel = computed(() => (location ? deptLabel(location) : ''))

/** How many branches the SEO copy can claim, falling back to the live table. */
const branchCount = computed(
  () => directoryBranches.value.length || (branchesData.value?.length ?? 0)
)

/** Today's USD quote for this casa, for the meta description. */
const usdToday = computed(() => directory.value?.usd?.[origin] ?? null)

const seoTitle = computed(() => {
  const name = exchangeHouseName.value
  const count = branchCount.value
  if (!count) {
    return location
      ? `${t('seo.sucursalesTitle', { origin: name })} - ${locationLabel.value}`
      : t('seo.sucursalesTitle', { origin: name })
  }
  return location
    ? t('seo.sucursalesInLocation', { origin: name, location: locationLabel.value, count })
    : t('seo.sucursalesWithCount', { origin: name, count })
})

const seoDescription = computed(() => {
  const name = exchangeHouseName.value
  const count = branchCount.value
  const base = location
    ? t('seo.sucursalesLocationDescription', {
        origin: name,
        location: locationLabel.value,
        count,
      })
    : t('seo.sucursalesDescription', { origin: name, count })

  // Lead with the number when we have it: the pages whose description carries
  // today's buy/sell are the only ones on this site clearing 1% CTR.
  const usd = usdToday.value
  if (!usd) return base
  const money = (value: number) =>
    value.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${name} hoy: dólar $${money(usd.buy)} compra / $${money(usd.sell)} venta. ${base}`.slice(
    0,
    300
  )
})

const mapsUrl = computed(() => {
  if (!location) return null
  const searchQuery = `${exchangeHouseName.value} ${location}`
  return `https://www.google.com.uy/maps/search/${encodeURIComponent(searchQuery)}`
})

// Special message logic for Prex and EBROU
const specialMessage = computed(() => {
  if (origin === 'prex') {
    const messages = {
      es: 'Se requiere la tarjeta prex y realizar el trámite por la aplicación',
      en: 'A prex card is required and the application must be completed.',
      pt: 'O cartão prex é necessário e o requerimento deve ser preenchido através do aplicativo.',
    } as Record<string, string>
    return messages[locale.value] || messages.es
  } else if (origin === 'ebrou') {
    const messages = {
      es: 'Se requiere una cuenta de EBROU, una caja de ahorro en dólares y realizar el cambio por la aplicación',
      en: 'It requires an EBROU account, a savings account in US dollars and exchange through the application.',
      pt: 'É necessária uma conta EBROU, uma conta poupança em dólares e troca através da aplicação.',
    } as Record<string, string>
    return messages[locale.value] || messages.es
  }
  return null
})

// Map adapter: filter geocoded rows and map to LocationsMap shape
const mapBranches = computed(() =>
  (branchesData.value || [])
    .filter((s: any) => s.latitude && s.longitude)
    .map((s: any) => ({
      origin,
      id: String(s.id ?? `${origin}-${s.NroSucursal}`),
      name: s.Nombre || '',
      dept: s.Departamento || '',
      locality: s.Localidad || '',
      address: s.Direccion || '',
      phone: s.Telefono || '',
      hours: s.Horarios || '',
      lat: Number(s.latitude),
      lng: Number(s.longitude),
      mapUrl: s.map || '',
      source: 'bcu',
    }))
)

// Table headers
const headers = computed(() => [
  { title: t('codigo'), key: 'NroSucursal', width: 100, sortable: true },
  { title: t('nombre'), key: 'Nombre', sortable: true },
  { title: t('departamento'), key: 'Departamento', sortable: true },
  { title: t('localidad'), key: 'Localidad', sortable: true },
  { title: t('direccion'), key: 'Direccion', sortable: false },
  { title: t('telefono'), key: 'Telefono', sortable: false },
  { title: t('horarios'), key: 'Horarios', sortable: false },
])

// Server-side data fetching
const {
  data: branchesData,
  pending,
  error,
} = await useLazyAsyncData(`branches-${origin}-${location || 'all'}`, async () => {
  // Skip API call for special cases
  if (origin === 'prex' || origin === 'ebrou') {
    return []
  }

  try {
    return await getExchangesByOriginLocation(origin, location || '', undefined, undefined)
  } catch (err) {
    console.error('Error fetching branches data:', err)
    throw err
  }
})

// SEO Meta
useSeoMeta({
  title: () => seoTitle.value,
  description: () => seoDescription.value,
  ogTitle: () => seoTitle.value,
  ogDescription: () => seoDescription.value,
  ogImageAlt: () => seoTitle.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => seoTitle.value,
  twitterDescription: () => seoDescription.value,
  twitterImageAlt: () => seoTitle.value,
})

// This family had no canonical at all, so a department reachable under two
// spellings (PAYSANDU / PAYSANDÚ) could be indexed twice.
useHead({
  link: [
    {
      rel: 'canonical',
      href: computed(() =>
        location
          ? `https://cambio-uruguay.com/sucursales/${origin}/${encodeURIComponent(location)}`
          : `https://cambio-uruguay.com/sucursales/${origin}`
      ),
    },
  ],
})

// Branded, copyright-free OG image generated server-side (page had no image).
defineOgImageComponent('Cambio', {
  title: () => t('seo.sucursalesTitle', { origin: exchangeHouseName.value }),
  subtitle: () => locationLabel.value,
  tag: 'Sucursales',
  locale: locale.value as 'es' | 'en' | 'pt',
})

// BreadcrumbList: Inicio > Sucursales > casa (> localidad).
useHead(() => {
  const items = [
    { '@type': 'ListItem', position: 1, name: t('inicio'), item: 'https://cambio-uruguay.com/' },
    {
      '@type': 'ListItem',
      position: 2,
      name: t('sucursalesMenu'),
      item: 'https://cambio-uruguay.com/sucursales',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: exchangeHouseName.value,
      item: `https://cambio-uruguay.com/sucursales/${origin}`,
    },
  ]
  if (location) {
    items.push({
      '@type': 'ListItem',
      position: 4,
      name: String(location),
      item: `https://cambio-uruguay.com/sucursales/${origin}/${location}`,
    })
  }
  return {
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items,
        }),
      },
    ],
  }
})
</script>

<style scoped>
.text-wrap {
  white-space: normal;
  word-wrap: break-word;
}

.casa-hub-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
  line-height: 1.4;
}
.casa-hub-link:hover {
  text-decoration: underline;
}
</style>
