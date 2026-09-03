<template>
  <VContainer class="nearby py-6" style="max-width: 720px">
    <h1 class="text-h5 font-weight-bold mb-1">¿Tengo descuento acá?</h1>
    <p class="text-body-2 text-medium-emphasis mb-5">
      Un toque y te digo si el comercio donde estás parado tiene descuento con alguna de tus
      tarjetas.
    </p>

    <!-- Sin tarjetas no hay nada que contestar. Es el primer muro y tiene que decir qué hacer. -->
    <VAlert v-if="!cards.length" type="info" variant="tonal" class="mb-4">
      Primero elegí tus tarjetas en el mapa de descuentos. Después volvé y con un toque te digo si
      alguna sirve en este comercio.
      <div class="mt-2">
        <NuxtLink :to="localePath('/descuentos-con-tarjeta-uruguay')" class="cu-link">
          Ir a elegir mis tarjetas
        </NuxtLink>
      </div>
    </VAlert>

    <template v-else>
      <VBtn
        v-if="state !== 'ready'"
        color="primary"
        size="large"
        block
        :loading="state === 'locating' || state === 'loading'"
        prepend-icon="mdi-crosshairs-gps"
        class="mb-3"
        @click="locate"
      >
        {{ state === 'locating' ? 'Buscando dónde estás…' : 'Ver si tengo descuento acá' }}
      </VBtn>

      <!-- Permiso denegado o GPS que no responde: la salida es buscar por nombre, no un callejón. -->
      <VAlert v-if="state === 'denied'" type="warning" variant="tonal" class="mb-4">
        <div class="text-body-2 mb-2">{{ errorMessage }}</div>
        <div class="text-body-2">Podés buscar el comercio por nombre y te digo lo mismo.</div>
      </VAlert>

      <VTextField
        v-if="state === 'denied' || state === 'ready'"
        v-model="query"
        density="comfortable"
        variant="outlined"
        clearable
        hide-details
        placeholder="Buscar el comercio por nombre"
        prepend-inner-icon="mdi-magnify"
        class="mb-4"
      />

      <template v-if="state === 'ready'">
        <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
          <span class="text-caption text-medium-emphasis">
            {{ found }} {{ found === 1 ? 'comercio' : 'comercios' }} en {{ radius }} m
          </span>
          <VBtnToggle v-model="radius" density="compact" variant="outlined" divided mandatory>
            <VBtn v-for="r in NEARBY_RADII" :key="r" :value="r" size="small">{{ r }} m</VBtn>
          </VBtnToggle>
        </div>

        <VAlert v-if="!visible.length" type="info" variant="tonal" class="mb-4">
          <template v-if="query">Ningún comercio cerca se llama así.</template>
          <template v-else>
            Ningún comercio con descuento a {{ radius }} m. Probá con un radio más grande — en un
            shopping el GPS suele errarle por varios metros.
          </template>
        </VAlert>

        <!-- El veredicto por marca. Una tarjeta por comercio, la respuesta arriba de todo y en
             una línea: esto se lee parado en la caja, con una mano. -->
        <VCard
          v-for="brand in visible"
          :key="brand.brandId"
          variant="outlined"
          class="mb-3 pa-4"
          :class="hasBenefit(brand) ? 'verdict-yes' : 'verdict-no'"
        >
          <div class="d-flex align-start justify-space-between ga-3 mb-1">
            <div>
              <div class="text-subtitle-1 font-weight-bold">{{ brand.name }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ distanceLabel(brand.distanceM) }}
                <template v-if="brand.locations > 1"> · {{ brand.locations }} locales acá</template>
                <template v-if="brand.categories.length"> · {{ brand.categories[0] }}</template>
              </div>
            </div>
            <VIcon :color="hasBenefit(brand) ? 'success' : 'medium-emphasis'" size="28">
              {{ hasBenefit(brand) ? 'mdi-check-circle' : 'mdi-minus-circle-outline' }}
            </VIcon>
          </div>

          <div class="text-body-1 font-weight-medium mb-2">{{ verdictFor(brand) }}</div>

          <div v-for="offer in withBenefit(brand)" :key="offer.bankId" class="text-body-2 mb-1">
            <span class="bank-dot" :style="{ background: offer.color }" aria-hidden="true" />
            <strong>{{ offer.bankName }}</strong>
            <template v-if="offer.debit"> · {{ offer.debit }}</template>
            <template v-if="offer.credit"> · {{ offer.credit }}</template>
            <span v-if="dayLabel(offer.days)" class="text-medium-emphasis">
              ({{ dayLabel(offer.days) }})</span
            >
          </div>

          <NuxtLink
            v-if="brand.pageSlug"
            :to="localePath(`/descuentos-con-tarjeta-uruguay/marca/${brand.pageSlug}`)"
            class="cu-link text-body-2"
          >
            Ver todo lo de {{ brand.name }}
          </NuxtLink>
        </VCard>

        <VBtn variant="text" prepend-icon="mdi-refresh" @click="locate">Volver a medir</VBtn>
      </template>
    </template>

    <p class="text-caption text-medium-emphasis mt-6">
      La ubicación se usa sólo para esta consulta y no se guarda en ningún lado. El texto de cada
      beneficio es el que publica el emisor.
    </p>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { dayRestrictionLabel } from '~/utils/bankos'
import { NEARBY_RADII, distanceLabel, verdictFor, type NearbyBrand } from '~/utils/bankosNearby'
import { useBankosCardsStore } from '~/stores/bankosCards'

// Herramienta, no documento: la respuesta depende de dónde está parado quien la abre, así que no
// hay nada que indexar. Va enlazada desde el mapa, no desde el sitemap.
definePageMeta({ layout: 'default' })
useHead({
  title: '¿Tengo descuento acá? | Cambio Uruguay',
  meta: [{ name: 'robots', content: 'noindex, follow' }],
})

const localePath = useLocalePath()
const cardsStore = useBankosCardsStore()
const cards = computed(() => cardsStore.cards)

type State = 'idle' | 'locating' | 'loading' | 'ready' | 'denied'
const state = ref<State>('idle')
const errorMessage = ref('')
const radius = ref<number>(NEARBY_RADII[0])
const query = ref('')
const brands = ref<NearbyBrand[]>([])
const found = ref(0)
const coords = ref<{ lat: number; lng: number } | null>(null)

onMounted(() => cardsStore.loadLocal())

/**
 * Una sola lectura, no `watchPosition`.
 *
 * La pregunta es puntual —"¿acá tengo descuento?"— y un seguimiento continuo gastaría batería para
 * reordenar una lista que el visitante está leyendo. `enableHighAccuracy` sí, porque a 40 m de
 * radio la diferencia entre la celda y el GPS decide la respuesta.
 */
function locate() {
  if (!import.meta.client || !navigator.geolocation) {
    state.value = 'denied'
    errorMessage.value = 'Este navegador no permite compartir la ubicación.'
    return
  }
  state.value = 'locating'
  navigator.geolocation.getCurrentPosition(
    pos => {
      coords.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      void fetchNearby()
    },
    err => {
      state.value = 'denied'
      errorMessage.value =
        err.code === err.PERMISSION_DENIED
          ? 'No diste permiso para usar tu ubicación.'
          : 'No se pudo leer tu ubicación (probá al aire libre o con el GPS encendido).'
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  )
}

async function fetchNearby() {
  if (!coords.value) return
  state.value = 'loading'
  try {
    const res = await $fetch<{ brands: NearbyBrand[]; found: number }>('/api/bankos/cerca', {
      query: {
        lat: coords.value.lat,
        lng: coords.value.lng,
        r: radius.value,
        cards: [...cards.value].sort().join(','),
      },
    })
    brands.value = res.brands || []
    found.value = res.found || 0
    state.value = 'ready'
  } catch {
    state.value = 'denied'
    errorMessage.value = 'No se pudo consultar el catálogo de descuentos.'
  }
}

// Cambiar el radio vuelve a preguntar: el filtro vive del lado del servidor, que es lo que hace
// que la respuesta pese kilobytes y no megabytes.
watch(radius, () => {
  if (coords.value) void fetchNearby()
})

const visible = computed(() => {
  const q = query.value?.trim().toLowerCase()
  if (!q) return brands.value
  return brands.value.filter(b => b.name.toLowerCase().includes(q))
})

const withBenefit = (brand: NearbyBrand) => brand.yours.filter(y => y.credit || y.debit)
const hasBenefit = (brand: NearbyBrand) => withBenefit(brand).length > 0
const dayLabel = (days: number[] | null) => dayRestrictionLabel(days)
</script>

<style scoped>
.verdict-yes {
  border-left: 4px solid rgb(var(--v-theme-success));
}
.verdict-no {
  border-left: 4px solid rgba(var(--v-border-color), 0.4);
}
.bank-dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}
.cu-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.cu-link:hover {
  text-decoration: underline;
}
</style>
