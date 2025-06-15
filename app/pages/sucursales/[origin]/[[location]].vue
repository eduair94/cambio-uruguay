<template>
  <div>
    <!-- Header Section -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center flex-wrap ga-3 py-4">
            <v-icon class="mr-2" color="primary">mdi-bank</v-icon>
            <span class="text-h5 text-md-h4">
              {{ $t('sucursalesMenu') }} - {{ exchangeHouseName }}
            </span>
            <v-spacer></v-spacer>
            <v-chip color="success" size="small">
              <v-icon start size="small">mdi-map-marker</v-icon>
              {{ location || $t('todasLasUbicaciones') }}
            </v-chip>
          </v-card-title>

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
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
        ></v-progress-circular>
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
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon start>mdi-table</v-icon>
            {{ $t('listaSucursales') }}
            <v-spacer></v-spacer>
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
              <v-chip
                v-if="(item as any).distance"
                size="small"
                color="info"
                variant="tonal"
              >
                {{ ((item as any).distance / 1000).toFixed(1) }} km
              </v-chip>
            </template>
          </v-data-table>

          <!-- No data state -->
          <v-card-text v-else class="text-center pa-8">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">
              mdi-bank-off
            </v-icon>
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
// Define page meta for route validation
definePageMeta({
  validate: (route) => {
    return !!route.params.origin
  },
})

// Composables
const { t, locale } = useI18n()
const route = useRoute()
const { getExchangesByOriginLocation } = useApiService()

// Extract route parameters
const origin = route.params.origin as string
const location = route.params.location as string | undefined

// Computed properties
const exchangeHouseName = computed(() => {
  // You can add logic here to format the exchange house name
  return origin.charAt(0).toUpperCase() + origin.slice(1).replace(/[-_]/g, ' ')
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
} = await useLazyAsyncData(
  `branches-${origin}-${location || 'all'}`,
  async () => {
    // Skip API call for special cases
    if (origin === 'prex' || origin === 'ebrou') {
      return []
    }

    try {
      return await getExchangesByOriginLocation(
        origin,
        location || '',
        undefined,
        undefined,
      )
    } catch (err) {
      console.error('Error fetching branches data:', err)
      throw err
    }
  },
)

// SEO Meta
useSeoMeta({
  title: () => {
    const baseTitle = t('seo.sucursalesTitle', {
      origin: exchangeHouseName.value,
    })
    return location ? `${baseTitle} - ${location}` : baseTitle
  },
  description: () => {
    return location
      ? t('seo.sucursalesLocationDescription', {
          origin: exchangeHouseName.value,
          location,
        })
      : t('seo.sucursalesDescription', { origin: exchangeHouseName.value })
  },
  ogTitle: () => {
    const baseTitle = t('seo.sucursalesTitle', {
      origin: exchangeHouseName.value,
    })
    return location ? `${baseTitle} - ${location}` : baseTitle
  },
  ogDescription: () => {
    return location
      ? t('seo.sucursalesLocationDescription', {
          origin: exchangeHouseName.value,
          location,
        })
      : t('seo.sucursalesDescription', { origin: exchangeHouseName.value })
  },
})
</script>

<style scoped>
.text-wrap {
  white-space: normal;
  word-wrap: break-word;
}
</style>
