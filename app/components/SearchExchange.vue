<template>
  <v-dialog
    v-model="dialog"
    :fullscreen="$vuetify.breakpoint.mobile"
    width="1300px"
  >
    <template #activator="{ on, attrs }">
      <a
        class="white--text"
        :href="maps"
        target="_blank"
        v-bind="attrs"
        @click.prevent="get_data"
        v-on="on"
        >Buscar sucursal</a
      >
    </template>
    <v-card>
      <v-toolbar dark color="primary">
        <v-toolbar-title>
          <div class="d-flex align-center">
            <span class="mr-4">Sucursales{{ getLocation() }}</span>
            <v-btn
              v-if="!$vuetify.breakpoint.mobile"
              color="blue darken-4"
              link
              target="_blank"
              :href="maps"
              >GOOGLE MAPS</v-btn
            >
          </div>
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon dark @click="dialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>
      <v-btn
        v-if="$vuetify.breakpoint.mobile"
        class="w-100"
        color="blue darken-4"
        link
        target="_blank"
        :href="maps"
        >GOOGLE MAPS</v-btn
      >
      <div v-if="!loaded" class="px-4 pt-3 text-h5">Cargando...</div>
      <div v-else>
        <v-data-table
          mobile-breakpoint="1100"
          :headers="getHeaders()"
          :items="d"
          :footer-props="{
            'items-per-page-options': [10, 20, 30, 40, 50],
          }"
          :items-per-page="10"
          class="elevation-0 money_table"
        >
          <template #item.Direccion="{ item }">
            <a target="_blank" class="white--text" :href="getHref(item)">
              {{ item.Direccion }}
            </a>
          </template>
          <template #item.CorreoElectronico="{ item }">
            <a
              v-if="item.CorreoElectronico"
              class="white--text"
              :href="'mailto:' + item.CorreoElectronico"
            >
              {{ item.CorreoElectronico }}
            </a>
          </template>
          <template #item.Telefono="{ item }">
            <span v-if="item.Telefono">
              <a
                v-for="(x, index) in getPhones(item.Telefono)"
                :key="index"
                class="white--text"
                :href="'tel:' + x.phone"
              >
                <span>{{ x.phone }}</span>
                <span v-if="x.int">int. {{ x.int }}</span>
              </a>
            </span>
          </template>
        </v-data-table>
      </div>
      <v-card-actions>
        <v-spacer></v-spacer>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
export default {
  props: {
    maps: {
      type: String,
      required: true,
    },
    origin: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      dialog: false,
      loaded: false,
      d: null,
    }
  },
  methods: {
    capitalize(str: string) {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
    },
    getLocation() {
      return this.location !== 'TODOS'
        ? ' de ' + this.capitalize(this.location)
        : ''
    },
    getInt(phones: string) {
      return phones.split(/y|-/g).map((el) => el.trim().split('int.')[1])
    },
    getPhones(phones: string) {
      return phones.split(/y|-/g).map((el) => {
        const arrEl = el.trim().split('int.')
        return {
          phone: arrEl[0],
          int: arrEl[1],
        }
      })
    },
    getHref(item: any) {
      // Fix BUG Cambial in BCU.
      if (this.origin === 'cambial') {
        return (
          'https://www.google.com.uy/maps/search/' +
          encodeURI(item.Direccion.trim())
        )
      }
      const loc =
        item.Direccion.trim() +
        ', ' +
        item.Localidad.trim() +
        ', ' +
        item.Departamento.trim()
      return 'https://www.google.com.uy/maps/search/' + encodeURI(loc)
    },
    getHeaders() {
      return [
        {
          text: 'Código',
          value: 'NroSucursal',
          width: '30px',
          sortable: false,
        },
        {
          text: 'Nombre',
          align: 'start',
          sortable: false,
          width: 'auto',
          value: 'Nombre',
        },
        { text: 'Departamento', value: 'Departamento' },
        { text: 'Localidad', value: 'Localidad' },
        { text: 'Direccion', value: 'Direccion' },
        { text: 'Teléfono/s', value: 'Telefono' },
        { text: 'E-mail', value: 'CorreoElectronico', sortable: false },
        { text: 'Horarios', value: 'Horarios', sortable: false },
        { text: 'Observaciones', value: 'Observaciones', width: 'auto' },
      ]
    },
    async get_data() {
      this.loaded = false
      const url =
        'https://cambio.shellix.cc/exchanges/' +
        this.origin +
        '/' +
        this.location
      this.d = await this.$axios.get(url).then((res) => res.data)
      this.loaded = true
    },
  },
}
</script>