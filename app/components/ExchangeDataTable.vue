<template>
  <VDataTable
    :item-class="itemClass"
    :headers="headers"
    :mobile="smAndDown"
    :items="items"
    :items-per-page="50"
    :items-per-page-options="[10, 20, 30, 40, 50]"
    class="elevation-1 money_table"
  >
    <template #top>
      <slot name="table-top" />
    </template>

    <template #item.pos="{ item }">
      <span>#{{ item.pos }}</span>
    </template>

    <template #item.code="{ item }">
      <span>{{ item.code }} {{ item.type ? '(' + item.type + ')' : '' }}</span>
    </template>

    <template #item.buy="{ item }">
      <span>{{ formatNumber(item.buy) }}</span>
    </template>

    <template #item.sell="{ item }">
      <span>{{ formatNumber(item.sell) }}</span>
    </template>

    <template #item.condition="{ item }">
      <div v-if="item.condition" class="py-md-1">
        {{ $t(item.condition) }}
      </div>
    </template>

    <template #item.localData.website="{ item }">
      <a
        class="text-white d-block website_link"
        target="_blank"
        :href="item.localData.website"
      >
        {{
          item.localData.website.replace(/(^\w+:|^)\/\//, '').replace(/\/$/, '')
        }}
      </a>
    </template>

    <template #item.localData.location="{ item }">
      <SearchExchange
        :type="item.type"
        :maps="item.localData.maps"
        :origin="item.origin"
        :location="location"
        :latitude="latitude"
        :longitude="longitude"
        :local-data="item.localData"
      />
    </template>

    <template #item.localData.bcu="{ item }">
      <BCU :item="item" />
    </template>

    <template #item.amount="{ item }">
      <VChip :color="getItemColor(item)" class="ma-2">
        {{ formatMoney(item.amount) }}
      </VChip>
    </template>

    <template #item.historical="{ item }">
      <div class="d-flex flex-column py-2 ga-1">
        <VBtn
          v-if="item.origin"
          :to="localePath(`/historico/${item.origin}`)"
          color="primary"
          variant="outlined"
          density="compact"
          class="text-caption mb-2"
        >
          <VIcon size="small" start>mdi-chart-line</VIcon>
          {{ $t('casa') }}
        </VBtn>
        <VBtn
          v-if="item.origin && item.code"
          :to="getLinkHistory(item)"
          color="secondary"
          variant="outlined"
          density="compact"
          class="text-caption"
        >
          <VIcon size="small" start>mdi-chart-line</VIcon>
          {{ $t('monedaBtn') }}
        </VBtn>
      </div>
    </template>

    <template #item.distance="{ item }">
      <a
        v-if="item.distance !== noDistance"
        class="text-white"
        target="_blank"
        :href="getDistanceLink(item)"
      >
        {{ formatDistance(item.distance) }}
      </a>
    </template>

    <template #item.diff="{ item }"> {{ item.diff }}% </template>
  </VDataTable>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'

interface Props {
  items: any[]
  headers: any[]
  location: string
  latitude: number
  longitude: number
  codeWith: string
  amount: number
  lastPos: number
  noDistance: number
}

const props = defineProps<Props>()

const localePath = useLocalePath()

const { smAndDown } = useDisplay()

const itemClass = (item: any) => {
  if (item.isInterBank) {
    return 'bg-purple-darken-4'
  }
  if (item.condition) {
    return 'bg-grey-darken-3'
  }
  return ''
}

const formatNumber = (num: number) => {
  return num.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
}

const formatMoney = (number: number) => {
  return number.toLocaleString('es-ES', {
    style: 'currency',
    currency: props.codeWith,
  })
}

const getItemColor = ({ pos }: { pos: number }) => {
  if (props.amount === 0) return ''
  if (pos === 1) return 'green-darken-3'
  if (pos === props.lastPos) return 'red-darken-3'
  return ''
}

const getLinkHistory = (item: any) => {
  let link = `/historico/${item.origin}/${item.code}`
  if (item.type) {
    link = `/historico/${item.origin}/${item.code}/${item.type}`
  }
  return localePath(link)
}

const getDistanceLink = ({ distanceData, localData, origin }: any) => {
  if (distanceData) {
    const { latitude: lat, longitude: lng, map } = distanceData
    if (map) return map
    return `https://www.google.com.uy/maps/search/${encodeURI(localData.name)}/@${lat},${lng},18.77z`
  }
  return '#'
}

const formatDistance = (distance: number) => {
  if (!distance) return
  if (distance >= 1000) {
    return Math.round(distance / 1000.0) + ' km'
  } else if (distance >= 100) {
    return Math.round(distance) + ' m'
  } else {
    return distance.toFixed(1) + ' m'
  }
}
</script>

<style lang="scss" scoped>
.website_link {
  word-break: break-all;
}
.v-chip {
  font-weight: 600;
  .v-chip__content {
    color: white !important;
  }
}
</style>
