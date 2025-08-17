<!-- eslint-disable vue/no-v-html -->
<template>
  <v-dialog v-model="dialog" width="700px" hide-overlay>
    <template #activator="{ props }">
      <v-checkbox
        v-bind="props"
        :model-value="!!item.localData.bcu"
        class="ma-0 pa-0"
        readonly
        color="green"
        hide-details
        @click="get_data"
      />
    </template>
    <v-card>
      <v-toolbar dark color="primary">
        <v-toolbar-title>{{ $t('bcu_regul') }}</v-toolbar-title>
        <v-spacer />
        <v-btn icon dark @click="dialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>
      <div v-if="d" class="px-4 pb-0 pt-3">
        <span class="text-body-1">
          {{ $t('bcu_regul_sub') }}
        </span>
      </div>
      <v-list v-if="d" three-line subheader>
        <v-list-item>
          <v-list-item-title>{{ $t('razonSocial') }}</v-list-item-title>
          {{ d.social_reason }}
        </v-list-item>
        <v-list-item>
          <v-list-item-title> {{ $t('nombre') }}</v-list-item-title>
          {{ d.name }}
        </v-list-item>
        <v-list-item>
          <v-list-item-title>{{ $t('direccion') }}</v-list-item-title>
          <a class="white--text" :href="get_map_link(d.address)"> {{ d.address }}</a>
        </v-list-item>
        <v-list-item>
          <v-list-item-title>{{ $t('telefono') }}</v-list-item-title>
          <a v-if="d.phone" class="white--text" :href="'tel:' + d.phone">{{ d.phone }}</a>
        </v-list-item>
        <v-list-item>
          <v-list-item-title>{{ $t('sitioWeb') }}</v-list-item-title>
          <span v-html="get_linked(d.website)" />
        </v-list-item>
        <v-list-item v-if="d.email">
          <v-list-item-title>{{ $t('email') }}</v-list-item-title>
          <a class="white--text" :href="'mailto:' + d.email">{{ d.email }}</a>
        </v-list-item>
      </v-list>
      <div v-if="!loaded" class="px-4 pt-3 text-h5">{{ $t('cargando') }}...</div>
      <div v-else-if="!d" class="px-4 pt-3 text-h5">
        {{ $t('noData') }}
      </div>
      <v-card-actions>
        <v-spacer />
        <v-btn
class="mb-2"
color="primary" link target="_blank"
:href="item.localData.bcu"
          >{{ $t('sitioWeb') }} BCU</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import Autolinker from 'autolinker'

interface BCUData {
  social_reason: string
  name: string
  address: string
  phone?: string
  website: string
  email?: string
}

interface Props {
  item: {
    origin: string
    localData: {
      bcu?: string
    }
  }
}

const props = defineProps<Props>()

const config = useRuntimeConfig()

const loaded = ref(false)
const dialog = ref(false)
const d = ref<BCUData | null>(null)

const get_linked = (link: string) => {
  const linkedText = Autolinker.link(link, { className: 'white--text' })
  return linkedText
}

const get_map_link = (address: string) => {
  return 'https://www.google.com.uy/maps/place/' + encodeURI(address)
}

const get_data = async () => {
  const url = `${config.public.apiBase}/bcu/${props.item.origin}`
  try {
    const response = await $fetch<BCUData>(url)
    d.value = response
  } catch {
    d.value = null
  }
  loaded.value = true
}
</script>

<style>
.v-input--checkbox input {
  display: none;
}
</style>
