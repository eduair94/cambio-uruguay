<template>
  <div>
    <v-tooltip top>
      <template #activator="{ on, attrs }">
        <v-btn
          color="primary"
          v-bind="attrs"
          :loading="loadingDistances"
          v-on="on"
          @click="geoLocation"
          >{{ $t('loadDistances') }}</v-btn
        >
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
          <div class="adress_lookup mt-3">
            <input
              id="search"
              v-model="search"
              :placeholder="$t('direccion')"
              type="text"
            />
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
                <l-marker :lat-lng="[latitude, longitude]"></l-marker>
              </l-map>
            </client-only>
          </div>
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

<script>
export default {
  data() {
    return {
      loadingDistances: false,
      dialog: false,
      latitude: 0,
      search: '',
      longitude: 0,
      apiKey: 'XFXIuNUKjvNkruE6DSkR',
    }
  },
  watch: {
    dialog(val) {
      if (val) {
        this.setMap()
      }
    },
  },
  methods: {
    searchAddress() {
      const geocoder = new maptiler.Geocoder({
        input: 'search',
        key: this.apiKey,
      })
      geocoder.setLanguage(this.$i18n.locale)
      geocoder.setProximity([this.longitude, this.latitude])
      geocoder.on('select', (item) => {
        this.search = item.place_name
        this.latitude = item.center[1]
        this.longitude = item.center[0]
      })
    },
    setMap() {
      const apiKey = this.apiKey
      if (!this.$refs.map) return setTimeout(this.setMap, 1000)
      this.$L
        .tileLayer(
          `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${apiKey}`,
          {
            tileSize: 512,
            zoomOffset: -1,
            minZoom: 1,
            attribution:
              '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a>, ' +
              '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
            crossOrigin: true,
          }
        )
        .addTo(this.$refs.map.mapObject)
      this.searchAddress()
    },
    changeMarker(e) {
      this.latitude = e.latlng.lat
      this.longitude = e.latlng.lng
      this.reverseGeo()
    },
    async reverseGeo() {
      const api = 'f2b2a4c548e317a2ed6b4a570fd42241'
      const url = `http://api.positionstack.com/v1/reverse?access_key=${api}&query=${this.latitude},${this.longitude}&limit=1`
      const res = await this.$axios
        .get(url)
        .then((res) => res.data)
        .catch(() => null)
      if (res) {
        const data = res.data
        if (data.length) {
          this.search = data[0].label
        }
        console.log('REVERSE GEO', data)
      }
    },
    async geoLocationSuccess(info) {
      const latitude = info.coords.latitude
      const longitude = info.coords.longitude
      this.latitude = latitude
      this.longitude = longitude
      this.dialog = true
      this.loadingDistances = false
      await this.reverseGeo()
      this.setMap()
    },
    async confirmGeo() {
      const distances = await this.$axios
        .get(
          `https://cambio.shellix.cc/distances?latitude=${this.latitude}&longitude=${this.longitude}`
        )
        .then((res) => res.data)
      const distanceData = distances.distanceData
      this.$emit(
        'geoLocationSuccess',
        distances,
        this.latitude,
        this.longitude,
        distanceData
      )
      this.dialog = false
    },
    geoLocationError() {
      this.loadingDistances = false
      this.latitude = -34.88073035118606
      this.longitude = -56.167630709298805
      this.search =
        '2532 Boulevard General Jose Gervasio Artigas, Montevideo, Uruguay'
      this.setMap()
    },
    reset() {
      this.search = ''
      navigator.geolocation.getCurrentPosition(
        this.geoLocationSuccess,
        this.geoLocationError
      )
    },
    geoLocation() {
      if (!this.latitude) {
        this.loadingDistances = true
        navigator.geolocation.getCurrentPosition(
          this.geoLocationSuccess,
          this.geoLocationError
        )
      } else {
        this.dialog = true
        this.loadingDistances = false
        this.setMap()
      }
      this.dialog = true
    },
  },
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
  height: 80vh;
}
.adress_lookup .v-input {
  max-width: 600px;
}
@media (max-width: 768px) {
  .location_map {
    height: 70vh;
  }
}
</style>