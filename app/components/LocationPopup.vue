<template>
  <div>
    <v-tooltip top>
      <template #activator="{ props }">
        <v-btn
          color="primary"
          v-bind="props"
          :loading="loadingDistances"
          @click="geoLocation"
        >
          <v-icon class="mr-1">mdi-map-marker</v-icon>
          <span>{{ $t('loadDistances') }}</span>
        </v-btn>
      </template>
      <span>{{ $t('locationTooltip') }}</span>
    </v-tooltip>
    <v-dialog v-model="dialog" persistent fullscreen width="700px" hide-overlay>
      <v-card>
        <v-toolbar dark color="primary">
          <v-toolbar-title>{{ $t('confirmarUbicacion') }}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon dark @click="dialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card-text v-if="latitude">
          <div class="address_lookup mt-3 d-flex">
            <input
              id="search"
              ref="searchInput"
              v-model="search"
              :placeholder="$t('direccion')"
              type="text"
              @keyup.enter="onEnter(search)"
            />
            <v-btn
              class="address_lookup_btn"
              color="primary"
              @click="onEnter(search)"
            >
              Search
            </v-btn>
          </div>
          <div class="location_map">
            <client-only>
              <l-map
                ref="map"
                :zoom="13"
                :center="[latitude, longitude]"
                @click="changeMarker"
              >
                <l-tile-layer
                  url="http://{s}.tile.osm.org/{z}/{x}/{y}.png"
                ></l-tile-layer>
                <l-circle
                  v-if="radius"
                  :lat-lng="[latitude, longitude]"
                  :radius="radius * 1000"
                ></l-circle>
                <l-marker :lat-lng="[latitude, longitude]"></l-marker>
              </l-map>
            </client-only>
          </div>
          <v-text-field
            v-model="radius"
            type="number"
            class="mt-2 search_range"
            :label="$t('search_radius')"
            clearable
            hide-details
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="reset">Reset</v-btn>
          <v-btn color="red" @click="dialog = false">{{ $t('cerrar') }}</v-btn>
          <v-btn color="green darken-3" @click="confirmGeo">{{
            $t('confirmar')
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
interface GeocodeData {
  lat: string
  lon: string
}

interface ReverseGeoData {
  data: Array<{
    label: string
  }>
}

interface DistanceData {
  distanceData: any
}

const { $i18n } = useNuxtApp()
const config = useRuntimeConfig()
const apiService = useApiService()

const radius = ref(0)
const loadingDistances = ref(false)
const prevResult = ref('')
const dialog = ref(false)
const latitude = ref(0)
const search = ref('')
const longitude = ref(0)
const apiKey = 'XFXIuNUKjvNkruE6DSkR'

const map = ref<any>(null)
const searchInput = ref<HTMLInputElement | null>(null)

const emit = defineEmits<{
  geoLocationSuccess: [
    {
      distances: any
      lat: number
      lng: number
      distanceData: any
      radius: number
    },
  ]
}>()

// Watch for dialog changes
watch(dialog, (val) => {
  if (val) {
    setMap()
  }
})

const onEnter = async (value: string) => {
  try {
    const response = await apiService.geocodeAddress(value)

    if (response.error) {
      console.error('Geocoding error:', response.error)
      return false
    }

    if (response.data && response.data.length) {
      latitude.value = parseFloat(response.data[0].lat)
      longitude.value = parseFloat(response.data[0].lon)
      return true
    }
    return false
  } catch (e) {
    console.log(e)
    return false
  }
}

const searchAddress = () => {
  // Note: This function uses external maptiler library
  // You may need to install and properly import it
  const geocoder = new (window as any).maptiler.Geocoder({
    input: 'search',
    key: apiKey,
  })
  geocoder.setLanguage($i18n.locale)
  geocoder.setProximity([longitude.value, latitude.value])
  geocoder.on('select', async (item: any) => {
    await nextTick(() => {
      if (searchInput.value) {
        searchInput.value.value = search.value
      }
      latitude.value = item.center[1]
      longitude.value = item.center[0]
    })
  })
}

const setMap = async () => {
  if (!map.value) return setTimeout(setMap, 1000)

  const mapInstance = map.value.mapObject
  if (!mapInstance) return setTimeout(setMap, 500)

  try {
    // For Nuxt 3 with @nuxtjs/leaflet, import Leaflet dynamically
    const L = await import('leaflet')

    L.tileLayer(
      `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${apiKey}`,
      {
        tileSize: 512,
        zoomOffset: -1,
        minZoom: 1,
        attribution:
          '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a>, ' +
          '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
        crossOrigin: true,
      },
    ).addTo(mapInstance)

    searchAddress()
  } catch (error) {
    console.error('Error loading Leaflet:', error)

    // Fallback: try to access L from window (for client-side)
    if (import.meta.client) {
      const L = (window as any).L
      if (L && L.tileLayer) {
        L.tileLayer(
          `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${apiKey}`,
          {
            tileSize: 512,
            zoomOffset: -1,
            minZoom: 1,
            attribution:
              '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a>, ' +
              '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
            crossOrigin: true,
          },
        ).addTo(mapInstance)
        searchAddress()
      } else {
        console.error('Leaflet not available on window object')
      }
    }
  }
}

const changeMarker = (e: any) => {
  latitude.value = e.latlng.lat
  longitude.value = e.latlng.lng
  reverseGeo()
}

const reverseGeo = async () => {
  try {
    const response = await apiService.reverseGeocode(
      latitude.value,
      longitude.value,
    )

    if (response.error) {
      console.error('Reverse geocoding failed:', response.error)
      return
    }

    if (response.data && response.data.data.length) {
      search.value = response.data.data[0].label
    }
  } catch (error) {
    console.error('Reverse geocoding failed:', error)
  }
}

const geoLocationSuccess = async (info: GeolocationPosition) => {
  console.log('Geolocation success:', info)
  latitude.value = info.coords.latitude
  longitude.value = info.coords.longitude
  dialog.value = true
  loadingDistances.value = false
  await reverseGeo()
  setMap()
}

const confirmGeo = async () => {
  try {
    const response = await apiService.getDistances(
      latitude.value,
      longitude.value,
    )

    if (response.error) {
      console.error('Failed to get distances:', response.error)
      return
    }

    const distances = response.data
    const distanceData = distances?.distanceData

    emit('geoLocationSuccess', {
      distances,
      lat: latitude.value,
      lng: longitude.value,
      distanceData: distanceData,
      radius: Number(radius.value) * 1000,
    })
    dialog.value = false
  } catch (error) {
    console.error('Failed to get distances:', error)
  }
}

const geoLocationError = () => {
  loadingDistances.value = false
  latitude.value = -34.88073035118606
  longitude.value = -56.167630709298805
  search.value =
    '2532 Boulevard General Jose Gervasio Artigas, Montevideo, Uruguay'
  setMap()
}

const reset = () => {
  search.value = ''
  navigator.geolocation.getCurrentPosition(geoLocationSuccess, geoLocationError)
}

const geoLocation = () => {
  if (!latitude.value) {
    loadingDistances.value = true
    navigator.geolocation.getCurrentPosition(
      geoLocationSuccess,
      geoLocationError,
    )
  } else {
    dialog.value = true
    loadingDistances.value = false
    setMap()
  }
  dialog.value = true
}
</script>

<style>
#search {
  width: 100%;
  color: white;
  background: black;
  padding: 10px;
  margin-bottom: 12px;
  border: 1px solid white;
  font-size: 16px;
}
.location_map {
  height: calc(100dvh - 310px);
}
.address_lookup .v-input {
  max-width: 600px;
}
.address_lookup_btn {
  height: 44px !important;
}
.search_range {
  max-width: 300px;
}
@media (max-width: 768px) {
  .location_map {
    height: 53dvh;
  }
}
</style>
