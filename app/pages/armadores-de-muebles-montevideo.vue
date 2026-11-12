<!--
THESIS: Montevideo es el selector. Los 62 barrios pintados por cuántos armadores tienen base ahí o
lo nombran; tocar el tuyo filtra. Rechaza la grilla de tarjetas con un desplegable de "zona".
OWN-WORLD: el sistema del sitio (Vuetify 4, Open Sans, tokens de DESIGN.md); el mapa usa la rampa
compartida con su leyenda en números; filas como las de /fletes-mudanzas-uruguay (resumen a la
izquierda, panel de precio entintado a la derecha); la escalera de precios con cifras tabulares.
STORY: quien compró muebles ve cuánto cuesta armar cada uno y quién trabaja cerca; elige barrio o
zona y mueble; contacta por el aviso, la ficha o el teléfono.
FIRST VIEWPORT: migas, H1, lead con la mediana del ropero; en escritorio mapa (izquierda) y escalera
de precios (derecha); en el teléfono las pastillas de zona y el mapa, la escalera después.
FORM: mapa-selector, candidato 4 de la lista; semilla ef5594b1; puesta en escena mapa + escalera.
-->
<template>
  <VContainer class="am-page">
    <VBreadcrumbs
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: DIRECTORIOS_HUB.label, to: localePath(DIRECTORIOS_HUB.path) },
        { title: 'Armadores de muebles', disabled: true },
      ]"
      class="px-0 pb-2"
    />

    <header class="am-header">
      <p class="am-eyebrow">Directorio</p>
      <h1 class="am-title">
        Armadores de muebles en Montevideo: precios y quién trabaja en tu zona
      </h1>
      <p class="am-lead">
        <template v-if="roperoRef">
          Armar un ropero cuesta entre {{ armadorMoney(roperoRef.min) }} y
          {{ armadorMoney(roperoRef.max) }}, con mediana de {{ armadorMoney(roperoRef.median) }},
          según los {{ roperoRef.n }} prestadores que publican su tarifa.
        </template>
        Juntamos {{ entries.length || 'los' }} armadores y avisos de Montevideo y el área
        metropolitana: empresas con tarifa por mueble, negocios con ficha en Google Maps y armadores
        independientes que anuncian en Facebook Marketplace y Mercado Libre, cada uno con la zona
        donde dice trabajar.
      </p>
      <div v-if="entries.length" class="am-stats">
        <StatTile label="Armadores y avisos" :value="String(entries.length)" :note="sourcesNote" />
        <StatTile
          label="Con precio publicado"
          :value="String(withPrice)"
          note="tarifa, lista o precio del aviso"
        />
        <StatTile
          label="Actualizado"
          :value="updatedShort"
          note="los avisos se releen todos los días"
        />
      </div>
      <ContentTaskLinks label="En esta página" :items="taskLinks" />
    </header>

    <div v-if="payload" class="am-explore">
      <ArmadoresZoneMap
        class="am-explore__map"
        :counts="barrioCounts"
        :zone-counts="zoneCounts"
        :citywide="citywideCount"
        :zona="state.zona"
        :barrio="state.barrio"
        @select="selectPlace"
      />
      <ArmadoresPriceLadder
        class="am-explore__ladder"
        :reference="reference"
        :mueble="state.mueble"
        @select="selectMueble"
      />
    </div>

    <section id="directorio" class="am-block" aria-labelledby="am-directorio-title">
      <h2 id="am-directorio-title" class="am-section-title">Directorio de armadores</h2>

      <div v-if="payload" class="am-filters">
        <VAutocomplete
          :model-value="state.barrio"
          :items="barrioItems"
          label="Barrio o localidad"
          density="comfortable"
          variant="outlined"
          clearable
          hide-details
          class="am-filters__field"
          @update:model-value="selectBarrio"
        />
        <VSelect
          :model-value="state.mueble ?? 'todos'"
          :items="muebleItems"
          label="Mueble"
          density="comfortable"
          variant="outlined"
          hide-details
          class="am-filters__field"
          @update:model-value="
            (value: string) => selectMueble(value === 'todos' ? null : (value as ArmadorItem))
          "
        />
        <VSelect
          :model-value="state.fuente ?? 'todas'"
          :items="fuenteItems"
          label="Fuente"
          density="comfortable"
          variant="outlined"
          hide-details
          class="am-filters__field"
          @update:model-value="
            (value: string) => (state.fuente = value === 'todas' ? null : (value as ArmadorSource))
          "
        />
        <VTextField
          v-model="state.q"
          label="Buscar (nombre, barrio, mueble)"
          density="comfortable"
          variant="outlined"
          prepend-inner-icon="mdi-magnify"
          clearable
          hide-details
          class="am-filters__field am-filters__field--wide"
          @click:clear="state.q = ''"
        />
        <VSelect
          v-model="state.orden"
          :items="ordenItems"
          label="Ordenar"
          density="comfortable"
          variant="outlined"
          hide-details
          class="am-filters__field"
        />
        <VCheckbox
          v-model="state.precio"
          label="Sólo con precio"
          density="comfortable"
          hide-details
          class="am-filters__check"
        />
      </div>

      <div v-if="payload" class="am-results-head">
        <p class="am-count" aria-live="polite">
          <strong>{{ resultCount }}</strong> {{ resultCount === 1 ? 'resultado' : 'resultados' }}
          <template v-if="placeLabel"> para {{ placeLabel }}</template>
          <template v-if="state.mueble"> · ordenables por el precio de {{ muebleOne }}</template>
        </p>
        <VBtn
          v-if="filtersActive"
          variant="text"
          size="small"
          prepend-icon="mdi-filter-remove-outline"
          @click="clearFilters"
        >
          Limpiar filtros
        </VBtn>
      </div>

      <template v-if="payload && resultCount">
        <section
          v-if="groups.local.length"
          class="am-group"
          :aria-labelledby="state.zona ? 'am-g-local' : undefined"
        >
          <h3 v-if="state.zona" id="am-g-local" class="am-group__title">
            Con base o que dicen trabajar en {{ placeLabel }}
          </h3>
          <ArmadoresProviderRow
            v-for="entry in visibleLocal"
            :key="entry.id"
            :entry="entry"
            :mueble="state.mueble"
            :heading-level="state.zona ? 'h4' : 'h3'"
          />
          <VBtn
            v-if="groups.local.length > visibleLocal.length"
            variant="tonal"
            color="primary"
            class="am-more"
            @click="localLimit += PAGE"
          >
            Mostrar {{ Math.min(PAGE, groups.local.length - visibleLocal.length) }} más
          </VBtn>
        </section>
        <section v-if="groups.citywide.length" class="am-group" aria-labelledby="am-g-city">
          <h3 id="am-g-city" class="am-group__title">Dicen cubrir todo Montevideo</h3>
          <p class="am-group__intro">
            No nombran {{ placeLabel }}, pero anuncian que van a cualquier barrio.
          </p>
          <ArmadoresProviderRow
            v-for="entry in visibleCity"
            :key="entry.id"
            :entry="entry"
            :mueble="state.mueble"
            heading-level="h4"
          />
          <VBtn
            v-if="groups.citywide.length > visibleCity.length"
            variant="tonal"
            color="primary"
            class="am-more"
            @click="cityLimit += PAGE"
          >
            Mostrar {{ Math.min(PAGE, groups.citywide.length - visibleCity.length) }} más
          </VBtn>
        </section>
        <p v-if="groups.hiddenWithoutZone" class="am-hidden-note">
          {{ groups.hiddenWithoutZone }}
          {{ groups.hiddenWithoutZone === 1 ? 'aviso no dice' : 'avisos no dicen' }} en qué zona
          trabajan.
          <a href="#directorio" @click.prevent="showAllZones">Verlos sin filtro de zona</a>
        </p>
      </template>

      <div v-else-if="payload" class="am-empty">
        <VIcon size="48" aria-hidden="true">mdi-sofa-outline</VIcon>
        <p class="am-empty__title">Ningún armador coincide con esos filtros.</p>
        <p>
          Probá con la zona entera en vez del barrio, sacá «Sólo con precio» o limpiá los filtros.
        </p>
        <VBtn color="primary" variant="tonal" @click="clearFilters">Limpiar filtros</VBtn>
      </div>
      <div v-else class="am-empty">
        <VIcon size="48" aria-hidden="true">mdi-progress-clock</VIcon>
        <p class="am-empty__title">El directorio se está actualizando.</p>
        <p>
          Volvé en unos minutos. Mientras tanto, las tarifas de armado de las empresas de mudanza
          están en
          <NuxtLink :to="localePath('/fletes-mudanzas-uruguay?servicio=assembly')"
            >fletes y mudanzas</NuxtLink
          >.
        </p>
      </div>
    </section>

    <section id="antes-de-llamar" class="am-block am-prose" aria-labelledby="am-preguntar-title">
      <h2 id="am-preguntar-title" class="am-section-title">
        Antes de llamar: qué preguntar para comparar
      </h2>
      <p>
        Los precios de arriba son por mueble y casi nunca incluyen lo mismo. Para que dos
        presupuestos se puedan comparar, mandá a cada armador lo mismo y preguntá lo mismo:
      </p>
      <ul class="am-checklist">
        <li>
          <strong>El modelo y la foto de la caja</strong> (o el enlace del producto): un ropero de 2
          puertas y uno de 6 con espejo no son el mismo trabajo.
        </li>
        <li>
          <strong>Si el precio incluye ir hasta tu casa.</strong> Varios cobran la visita o un
          mínimo aparte, sobre todo fuera de su zona.
        </li>
        <li>
          <strong>Si fija a la pared</strong> roperos altos y bibliotecas, y si los tarugos van por
          su cuenta. Un mueble alto sin fijar puede volcar.
        </li>
        <li>
          <strong>Si se lleva las cajas y el cartón</strong>, y si cobra el desarmado del mueble
          viejo.
        </li>
        <li>
          <strong>Un precio cerrado por escrito</strong> (un mensaje alcanza) antes de que empiece,
          con el total por todos los muebles.
        </li>
      </ul>
      <p>
        Si el mueble viene de una tienda, mirá si la tienda ofrece el armado: algunas lo cobran
        aparte y otras lo incluyen, y en ese caso suele correr por cuenta de la tienda si algo sale
        mal. Para la mudanza en sí, el
        <NuxtLink :to="localePath('/fletes-mudanzas-uruguay')"
          >directorio de fletes y mudanzas</NuxtLink
        >
        compara camiones y peones; y para lo que falta en la casa nueva, el de
        <NuxtLink :to="localePath('/equipar-casa-uruguay')">equipar la casa</NuxtLink>.
      </p>
    </section>

    <section id="fuentes" class="am-block am-prose" aria-labelledby="am-fuentes-title">
      <h2 id="am-fuentes-title" class="am-section-title">De dónde sale cada dato</h2>
      <dl class="am-sources">
        <div v-for="s in ARMADOR_SOURCES" :key="s.id">
          <dt>
            {{ s.label }} <span class="am-sources__n">{{ sourceCounts[s.id] ?? 0 }}</span>
          </dt>
          <dd>
            {{ s.claim }}
            <span v-if="sourceDates[s.id]" class="am-muted">{{ sourceDates[s.id] }}</span>
          </dd>
        </div>
      </dl>
      <p>
        La zona es la que el prestador declara o la de su ficha: la base sale de la dirección de
        Google Maps, del barrio que eligió en Mercado Libre o del relevamiento; la cobertura, de los
        barrios que nombra en su aviso. Un aviso que no dice dónde trabaja aparece sólo sin filtro
        de zona. Un aviso que no vimos en 14 días sale del directorio, y un negocio de Google, a los
        30.
      </p>
      <p>
        Estar en esta lista no es una recomendación: no contratamos a nadie para armarla, nadie paga
        por aparecer y no verificamos calidad, seguros ni garantías. Si tenés un servicio de armado
        y querés corregir algo, escribinos desde
        <NuxtLink :to="localePath('/contacto')">contacto</NuxtLink>.
      </p>
    </section>

    <FaqSection :items="faqItems" heading="Preguntas frecuentes" :expanded="true" />

    <div class="am-share">
      <ShareButtons
        text="Armadores de muebles en Montevideo: cuánto cobran por mueble y quién trabaja en tu zona"
        variant="tonal"
        color="primary"
      />
    </div>
  </VContainer>
</template>

<script setup lang="ts">
// VAutocomplete no está en el registro global de plugins/vuetify.ts (pesa): se importa donde se usa.
import { VAutocomplete } from 'vuetify/components'
import { DIRECTORIOS_HUB, directoriosHubListItem } from '~/utils/directorios'
import type { FaqItem } from '~/utils/faqAnswers'
import { ARMADOR_MAP_BARRIOS } from '~/utils/armadoresMapData'
import {
  ARMADOR_ITEMS,
  ARMADOR_SOURCES,
  ARMADOR_ZONES,
  ARMADORES_DEFAULT_STATE,
  type ArmadorItem,
  type ArmadoresPayload,
  type ArmadoresState,
  type ArmadorSource,
  type ArmadorZone,
  armadorBarrioCounts,
  armadorBarrioOptions,
  armadorMoney,
  armadorPriceReference,
  armadorZoneCounts,
  armadorZoneOf,
  armadoresGroups,
  armadoresQueryFromState,
  armadoresStateFromQuery,
} from '~/utils/armadores'

const localePath = useLocalePath()
const route = useRoute()
const BASE_PATH = '/armadores-de-muebles-montevideo'
const canonicalUrl = 'https://cambio-uruguay.com/armadores-de-muebles-montevideo'
const PAGE = 25

// El estado sale de la URL también en el servidor: un enlace compartido llega ya filtrado.
const state = reactive<ArmadoresState>(
  armadoresStateFromQuery(route.query as Record<string, unknown>)
)
usePreciosQuerySync(() => armadoresQueryFromState(state))

const { data: payload } = await useAsyncData<ArmadoresPayload | null>(
  'armadores',
  () =>
    $fetch<ArmadoresPayload | null>('/api/armadores')
      .then(body => body ?? null)
      .catch(() => null),
  { default: () => null }
)
const entries = computed(() => payload.value?.entries ?? [])

const reference = computed(() => armadorPriceReference(entries.value))
const roperoRef = computed(() => reference.value.items.find(row => row.item === 'ropero') ?? null)
const withPrice = computed(() => entries.value.filter(entry => entry.prices.length).length)
const barrioCounts = computed(() =>
  armadorBarrioCounts(
    entries.value,
    ARMADOR_MAP_BARRIOS.map(b => b.name)
  )
)
const zoneCounts = computed(() => armadorZoneCounts(entries.value))
const citywideCount = computed(
  () => entries.value.filter(entry => entry.coverage.allMontevideo).length
)
const sourceCounts = computed(() => {
  const counts: Partial<Record<ArmadorSource, number>> = {}
  for (const entry of entries.value) counts[entry.source] = (counts[entry.source] ?? 0) + 1
  return counts
})

const LONG = new Intl.DateTimeFormat('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Montevideo',
})
const fmtDay = (iso: string | null | undefined): string | null =>
  iso ? LONG.format(new Date(iso.length === 10 ? `${iso}T15:00:00Z` : iso)) : null
const updatedLong = computed(() => fmtDay(payload.value?.capturedAt) ?? '')
const updatedShort = computed(() => updatedLong.value.replace(/ de \d{4}$/, ''))
const sourceDates = computed<Partial<Record<ArmadorSource, string>>>(() => ({
  editorial: payload.value?.editorialReviewedAt
    ? `Relevado el ${fmtDay(payload.value.editorialReviewedAt)}.`
    : undefined,
  google: payload.value?.googleAt ? `Leído el ${fmtDay(payload.value.googleAt)}.` : undefined,
  facebook: payload.value ? `Leído el ${updatedLong.value}.` : undefined,
  mercadolibre: payload.value ? `Leído el ${updatedLong.value}.` : undefined,
}))
const sourcesNote = computed(() => {
  const ads = (sourceCounts.value.facebook ?? 0) + (sourceCounts.value.mercadolibre ?? 0)
  return `${ads} avisos · ${sourceCounts.value.google ?? 0} en Google · ${sourceCounts.value.editorial ?? 0} con tarifa`
})

const groups = computed(() => armadoresGroups(entries.value, state))
const resultCount = computed(() => groups.value.local.length + groups.value.citywide.length)
const localLimit = ref(PAGE)
const cityLimit = ref(PAGE)
watch(
  () => armadoresQueryFromState(state),
  () => {
    localLimit.value = PAGE
    cityLimit.value = PAGE
  },
  { deep: true }
)
const visibleLocal = computed(() => groups.value.local.slice(0, localLimit.value))
const visibleCity = computed(() => groups.value.citywide.slice(0, cityLimit.value))

const placeLabel = computed(() => {
  if (state.barrio) return state.barrio
  const zone = ARMADOR_ZONES.find(z => z.id === state.zona)
  return zone
    ? zone.id === 'metropolitana'
      ? 'el área metropolitana'
      : `la zona ${zone.label.toLowerCase()}`
    : null
})
const muebleOne = computed(() => ARMADOR_ITEMS.find(item => item.id === state.mueble)?.one ?? '')

const barrioItems = armadorBarrioOptions().flatMap(group => group.barrios)
const muebleItems = [
  { title: 'Todos los muebles', value: 'todos' },
  ...ARMADOR_ITEMS.map(item => ({ title: item.label, value: item.id })),
]
const fuenteItems = [
  { title: 'Todas las fuentes', value: 'todas' },
  ...ARMADOR_SOURCES.map(source => ({ title: source.label, value: source.id })),
]
const ordenItems = computed(() => [
  { title: state.zona ? 'Más cerca primero' : 'Con precio primero', value: 'zona' },
  {
    title: state.mueble
      ? `Precio de ${muebleOne.value}, menor primero`
      : 'Precio más bajo publicado',
    value: 'precio-asc',
  },
  { title: 'Más reseñas en Google', value: 'resenas' },
])

const filtersActive = computed(() => Object.keys(armadoresQueryFromState(state)).length > 0)

function selectPlace(value: { zona: ArmadorZone | null; barrio: string | null }) {
  state.zona = value.zona
  state.barrio = value.barrio
}
function showAllZones() {
  selectPlace({ zona: null, barrio: null })
}
function selectBarrio(value: string | null) {
  state.barrio = value || null
  state.zona = value ? armadorZoneOf(value) : state.zona
}
function selectMueble(value: ArmadorItem | null) {
  state.mueble = value
  if (value && state.orden === 'zona' && !state.zona) state.orden = 'precio-asc'
  if (!value && state.orden === 'precio-asc') state.orden = 'zona'
}
function clearFilters() {
  Object.assign(state, { ...ARMADORES_DEFAULT_STATE })
}

const taskLinks = computed(() => {
  const search = new URLSearchParams(armadoresQueryFromState(state)).toString()
  const prefix = localePath(BASE_PATH) + (search ? '?' + search : '')
  return [
    { label: 'El directorio', to: prefix + '#directorio' },
    { label: 'Qué preguntar antes', to: prefix + '#antes-de-llamar' },
    { label: 'De dónde salen los datos', to: prefix + '#fuentes' },
  ]
})

const faqItems = computed<FaqItem[]>(() => {
  const ropero = roperoRef.value
  const adCard = reference.value.adCard
  return [
    {
      id: 'cuanto-cobra',
      question: '¿Cuánto cobra un armador de muebles en Montevideo?',
      answer: ropero
        ? `Por un ropero, entre ${armadorMoney(ropero.min)} y ${armadorMoney(ropero.max)} según los ${ropero.n} prestadores que publican su tarifa, con una mediana de ${armadorMoney(ropero.median)}. Los muebles chicos (mesas de luz, estantes) cuestan bastante menos y los placares grandes o las cuchetas, más. Los avisos de Marketplace y Mercado Libre suelen poner en la tarjeta el precio desde${adCard ? ` (mediana ${armadorMoney(adCard.median)})` : ''}, que corresponde al mueble más chico.`
        : 'Depende del mueble: los muebles chicos cuestan bastante menos que un ropero o una cucheta. En el directorio cada prestador muestra los precios que publica, con su fuente y su fecha.',
    },
    {
      id: 'que-incluye',
      question: '¿El precio incluye ir hasta mi casa?',
      answer:
        'No siempre. Varios armadores cobran una visita o un mínimo aparte, sobre todo fuera de su zona, y algunos no incluyen fijar el mueble a la pared ni llevarse el cartón. Por eso conviene pedir un precio cerrado por escrito, con el total por todos los muebles, antes de que empiece el trabajo.',
    },
    {
      id: 'tienda',
      question: '¿Conviene el armado de la tienda o un armador independiente?',
      answer:
        'El de la tienda sólo sirve para lo que compraste ahí y a veces está incluido; si algo sale mal, suele responder la tienda. Un armador independiente arma muebles de cualquier lado y suele ir en el día, pero cada uno fija sus condiciones: pedí el precio por escrito y preguntá qué pasa si falta una pieza o algo se daña.',
    },
    {
      id: 'zona',
      question: '¿Cómo sé si un armador trabaja en mi barrio?',
      answer:
        'En el mapa o en el filtro de barrio: primero aparecen los que tienen la base en tu barrio o lo nombran en su aviso, después los que dicen cubrir todo Montevideo. La base sale de la dirección de su ficha de Google Maps, del barrio que eligió en Mercado Libre o de nuestro relevamiento; la cobertura, de lo que escribe en su propio aviso.',
    },
    {
      id: 'aparecer',
      question: '¿Cómo aparezco en el directorio?',
      answer:
        'Los avisos de Facebook Marketplace y Mercado Libre Servicios y las fichas de Google Maps que se llaman «armado» o «armador» de muebles entran solos, y se releen todos los días. Si publicás tu tarifa por mueble en un sitio propio, escribinos desde la página de contacto y la sumamos al relevamiento con su fuente y su fecha.',
    },
  ]
})

// 60 con la marca: el tope del SERP (seoTitleBudget.test.ts).
const title = 'Armadores de muebles en Montevideo: precios'
const description = computed(() =>
  roperoRef.value
    ? `Armar un ropero en Montevideo: mediana ${armadorMoney(roperoRef.value.median)} entre ${roperoRef.value.n} armadores con tarifa. ${entries.value.length} armadores y avisos por barrio, con precios por mueble.`
    : 'Directorio de armadores de muebles en Montevideo por barrio: empresas con tarifa por mueble, fichas de Google Maps y avisos de Marketplace y Mercado Libre.'
)

defineOgImageComponent('Cambio', {
  title: 'Armadores de muebles en Montevideo',
  subtitle: 'Cuánto cobran por mueble y quién trabaja en tu zona',
  tag: 'DIRECTORIO',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

// El FAQPage lo emite FaqSection: no se repite acá.
useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com/',
              },
              directoriosHubListItem(2),
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Armadores de muebles',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'CollectionPage',
            name: title,
            url: canonicalUrl,
            inLanguage: 'es-UY',
            ...(payload.value ? { dateModified: payload.value.capturedAt } : {}),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
:where(.am-page) :where(p, h1, h2, h3, ul, ol, dl, dd) {
  margin-top: 0;
}
.am-eyebrow {
  margin-bottom: 8px;
  color: rgb(var(--v-theme-link));
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.am-title {
  max-width: 28ch;
  margin-bottom: 16px;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.am-lead {
  max-width: 72ch;
  margin-bottom: 24px;
  font-size: 1.075rem;
  line-height: 1.65;
}
.am-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  gap: 16px;
  max-width: 720px;
  margin-bottom: 24px;
}
.am-explore {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 40px;
  margin-top: 24px;
}
@media (min-width: 960px) {
  .am-explore {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
    gap: 40px;
    align-items: start;
  }
}
.am-block {
  margin-top: 40px;
  scroll-margin-top: 84px;
}
.am-section-title {
  margin-bottom: 16px;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
  line-height: 1.2;
}
.am-filters {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
  gap: 12px 16px;
  align-items: center;
}
.am-filters__field {
  min-width: 0;
}
.am-filters__field--wide {
  grid-column: span 2;
}
@media (max-width: 599px) {
  .am-filters__field--wide {
    grid-column: auto;
  }
}
.am-results-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: center;
  justify-content: space-between;
  margin-top: 24px;
  margin-bottom: 8px;
}
.am-count {
  margin-bottom: 0;
  font-variant-numeric: tabular-nums;
}
.am-group {
  margin-top: 16px;
}
.am-group + .am-group {
  margin-top: 40px;
}
.am-group__title {
  margin-bottom: 4px;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.4;
}
.am-group__intro {
  margin-bottom: 8px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.95rem;
}
.am-more {
  margin-top: 16px;
}
.am-hidden-note {
  margin-top: 24px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.875rem;
}
.am-hidden-note a,
.am-prose a {
  color: rgb(var(--v-theme-link));
}
.am-empty {
  display: grid;
  gap: 8px;
  justify-items: center;
  margin-top: 24px;
  padding: 32px 16px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  text-align: center;
}
.am-empty p {
  max-width: 60ch;
  margin-bottom: 0;
}
.am-empty__title {
  font-weight: 700;
}
.am-prose p {
  max-width: 72ch;
  margin-bottom: 16px;
}
.am-checklist {
  display: grid;
  gap: 8px;
  max-width: 72ch;
  margin-bottom: 16px;
  padding-left: 24px;
}
.am-sources {
  display: grid;
  gap: 16px;
  max-width: 72ch;
  margin-bottom: 24px;
}
.am-sources dt {
  font-weight: 700;
}
.am-sources dd {
  margin: 4px 0 0;
}
.am-sources__n {
  margin-left: 8px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.am-muted {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.am-share {
  margin-top: 40px;
}
</style>
