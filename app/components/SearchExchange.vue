<template>
  <v-dialog v-model="dialog" :fullscreen="mobile" width="1500px">
    <template #activator="{ props }">
      <a class="text-white" :href="maps" target="_blank" v-bind="props" @click.prevent="getData">{{
        t('buscarSucursal')
      }}</a>
    </template>
    <v-card>
      <v-toolbar color="primary" theme="dark">
        <v-toolbar-title>
          <div class="d-flex align-center">
            <span class="mr-4">Sucursales{{ getLocation() }}</span>
            <v-btn
              v-if="!mobile"
              link
              variant="flat"
              color="blue-darken-4"
              :href="maps"
              target="_blank"
              >GOOGLE MAPS</v-btn
            >
          </div>
        </v-toolbar-title>
        <v-spacer />
        <v-btn icon @click="dialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>
      <v-btn
        v-if="mobile"
        class="w-100 mt-0"
        variant="flat"
        color="blue-darken-4"
        :href="maps"
        target="_blank"
        >GOOGLE MAPS</v-btn
      >
      <div v-if="!loaded" class="px-4 pt-3 text-h5">{{ t('cargando') }}...</div>
      <div v-else-if="message">
        <p class="ma-0 pa-3 text-h5">
          {{ message }}
        </p>
      </div>
      <div v-else>
        <v-data-table
          v-model:sort-by="sortBy"
          :mobile-breakpoint="1100"
          :headers="getHeaders()"
          :items="d"
          :items-per-page="10"
          :items-per-page-options="[
            { value: 10, title: '10' },
            { value: 20, title: '20' },
            { value: 30, title: '30' },
            { value: 40, title: '40' },
            { value: 50, title: '50' },
          ]"
          class="elevation-0 search_exchange"
        >
          <template #item.Direccion="{ item }">
            <a target="_blank" class="text-white" :href="getHref(item)">
              {{ item.Direccion }}
            </a>
          </template>
          <template #item.CorreoElectronico="{ item }">
            <a
              v-if="item.CorreoElectronico"
              class="text-white"
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
                class="text-white"
                :href="'tel:' + x.phone"
              >
                <span>{{ x.phone }}</span>
                <span v-if="x.int">int. {{ x.int }}</span>
              </a>
            </span>
          </template>
          <template #item.distance="{ item }">
            <a class="text-white" :href="getMaps(item)" target="_blank">
              {{ formatDistance(item.distance) }}</a
            >
          </template>
        </v-data-table>
      </div>
      <v-card-actions>
        <v-spacer />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'
import { notFound } from '../services/not_found'

// Props
interface Props {
  type: string
  maps: string
  origin: string
  location: string
  latitude?: number
  longitude?: number
  localData: { name: string }
}

const props = withDefaults(defineProps<Props>(), {
  latitude: 0,
  longitude: 0,
})

// Composables
const { t, locale } = useI18n()
const { mobile } = useDisplay()
const { getExchangesByOriginLocation } = useApiService()

// Data
const message = ref('')
const sortBy = ref<{ key: string; order: 'asc' | 'desc' }[]>([])
const dialog = ref(false)
const loaded = ref(false)
const d = ref<any[]>([])

// Methods
const getMaps = (item: any) => {
  if (item.map) return item.map
  const latitude = item.latitude
  const longitude = item.longitude
  if (!notFound.includes(props.origin)) {
    return `https://www.google.com.uy/maps/search/${encodeURI(
      props.localData.name
    )}/@${latitude},${longitude},18.77z`
  } else {
    return `https://www.google.com.uy/maps/search/${latitude},${longitude}`
  }
}

const formatDistance = (item: number) => {
  if (!item || item === 9999999) return '-'
  if (item >= 1000) {
    return Math.round(item / 1000.0) + ' km'
  } else if (item >= 100) {
    return Math.round(item) + ' m'
  } else {
    return item.toFixed(1) + ' m'
  }
}

const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

const getLocation = () => {
  return props.location !== 'TODOS' ? ' de ' + capitalize(props.location) : ''
}

const getPhones = (phones: string) => {
  return phones.split(/y|-/).map(el => {
    const arrEl = el.trim().split('int.')
    return {
      phone: arrEl[0],
      int: arrEl[1],
    }
  })
}

const getHref = (item: any) => {
  if (item.map) {
    return item.map
  }
  // Fix BUG Cambial in BCU.
  if (props.origin === 'cambial') {
    return 'https://www.google.com.uy/maps/search/' + encodeURI(item.Direccion.trim())
  }
  if (!item.Direccion) item.Direccion = ''
  if (!item.Localidad) item.Localidad = ''
  if (!item.Departamento) item.Departamento = ''
  const loc = item.Direccion.trim() + ', ' + item.Localidad.trim() + ', ' + item.Departamento.trim()
  return 'https://www.google.com.uy/maps/search/' + encodeURI(loc)
}

const getHeaders = () => {
  const toReturn = [
    {
      title: t('codigo') as string,
      key: 'NroSucursal',
      width: 30,
      sortable: false,
    },
    {
      title: t('nombre') as string,
      align: 'start' as const,
      sortable: false,
      width: 'auto',
      key: 'Nombre',
    },
    { title: t('departamento') as string, key: 'Departamento' },
    { title: t('localidad') as string, key: 'Localidad' },
    { title: t('direccion') as string, key: 'Direccion' },
    { title: t('telefono') as string, key: 'Telefono' },
    { title: t('email') as string, key: 'CorreoElectronico', sortable: false },
    { title: t('horarios') as string, key: 'Horarios', sortable: false },
    {
      title: t('observaciones') as string,
      key: 'Observaciones',
      width: 'auto',
    },
  ]
  if (props.latitude && props.longitude) {
    toReturn.push({
      title: t('distancia') as string,
      key: 'distance',
      width: 'auto',
    })
  }
  return toReturn
}

const getData = async () => {
  loaded.value = false
  message.value = ''

  if (props.origin === 'prex') {
    const loc = {
      es: 'Se requiere la tarjeta prex y realizar el trámite por la aplicación',
      en: 'A prex card is required and the application must be completed.',
      pt: 'O cartão prex é necessário e o requerimento deve ser preenchido através do requerimento.',
    } as Record<string, string>
    message.value = (loc[locale.value] ?? loc.es) || ''
  } else if (props.type === 'EBROU') {
    const loc = {
      es: 'Se requiere una cuenta de EBROU, una caja de ahorro en dólares y realizar el cambio por la aplicación',
      en: 'It requires an EBROU account, a savings account in US dollars and exchange through the application.',
      pt: 'É necessária uma conta EBROU, uma conta poupança em dólares e troca através da aplicação.',
    } as Record<string, string>
    message.value = (loc[locale.value] ?? loc.es) || ''
  } else {
    try {
      if (props.latitude && props.longitude) {
        sortBy.value = [{ key: 'distance', order: 'asc' }]
      }

      const data = await getExchangesByOriginLocation(
        props.origin,
        props.location,
        props.latitude || undefined,
        props.longitude || undefined
      )
      d.value = data as any[]
    } catch (error) {
      console.error('Error fetching data:', error)
      d.value = []
    }
  }
  loaded.value = true
}
</script>
