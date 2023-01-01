<template>
  <v-dialog v-model="dialog" width="700px" hide-overlay>
    <template #activator="{ on, attrs }">
      <v-checkbox
        v-bind="attrs"
        v-model="item.localData.bcu ? true : false"
        class="ma-0 pa-0"
        readonly
        color="green"
        hide-details
        @click="get_data"
        v-on="on"
      ></v-checkbox>
    </template>
    <v-card>
      <v-toolbar dark color="primary">
        <v-toolbar-title>Regulado por BCU</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon dark @click="dialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>
      <div v-if="d" class="px-4 pb-0 pt-3">
        <span class="text-body-1">
          Esta entidad está regulada por el BCU (Banco Central del Uruguay)
        </span>
      </div>
      <v-list v-if="d" three-line subheader>
        <v-list-item>
          <v-list-item-content>
            <v-list-item-title>Razón social</v-list-item-title>
            {{ d.social_reason }}
          </v-list-item-content>
        </v-list-item>
        <v-list-item>
          <v-list-item-content>
            <v-list-item-title>Nombre</v-list-item-title>
            {{ d.name }}</v-list-item-content
          >
        </v-list-item>
        <v-list-item>
          <v-list-item-content>
            <v-list-item-title>Dirección</v-list-item-title>
            <a class="white--text" :href="get_map_link(d.address)">
              {{ d.address }}</a
            >
          </v-list-item-content>
        </v-list-item>
        <v-list-item>
          <v-list-item-content>
            <v-list-item-title>Teléfono</v-list-item-title>
            {{ d.phone }}</v-list-item-content
          >
        </v-list-item>
        <v-list-item>
          <v-list-item-content>
            <v-list-item-title>Sitio Web</v-list-item-title>
            {{ d.website }}
          </v-list-item-content>
        </v-list-item>
        <v-list-item>
          <v-list-item-content>
            <v-list-item-title>E-mail</v-list-item-title>
            <a v-if="d.email" class="white--text" :href="'mailto:' + d.email">{{
              d.email
            }}</a>
            <v-else>
              <span>N/A</span>
            </v-else>
          </v-list-item-content>
        </v-list-item>
      </v-list>
      <div v-if="!loaded" class="px-4 pt-3 text-h5">Cargando...</div>
      <div v-else-if="!d" class="px-4 pt-3 text-h5">
        No hay datos para mostrar, dar clic en el botón de Sitio Web.
      </div>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          class="mb-2"
          color="primary"
          link
          target="_blank"
          :href="item.localData.bcu"
          >SITIO WEB BCU</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
export default {
  props: {
    item: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      loaded: false,
      dialog: false,
      d: null,
    }
  },
  methods: {
    get_map_link(address: string) {
      return 'https://www.google.com.uy/maps/place/' + encodeURI(address)
    },
    async get_data() {
      const url = 'https://cambio.shellix.cc/bcu/' + this.item.origin
      this.d = await this.$axios
        .get(url)
        .then((response) => {
          return response.data
        })
        .catch(() => null)
      this.loaded = true
    },
  },
}
</script>

<style>
.v-input--checkbox input {
  display: none;
}
</style>