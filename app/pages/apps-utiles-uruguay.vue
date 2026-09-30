<!--
THESIS: Alguien necesita la app para un trámite, el ómnibus o la luz. Que en medio minuto encuentre
la OFICIAL, sepa quién la publica en cada tienda y la instale desde el enlace correcto; y que vea de
un vistazo cuáles del Estado le conviene tener.
FIRST VIEWPORT: Migas, título, una línea con el dato y los atajos. El kit abajo; el explorador con
pestañas a un toque.
FORM: Lectura + filtro. Todo se dibuja en el servidor (las pestañas son enlaces `?categoria=` que el
servidor lee); después de hidratar, el filtro es del cliente y la URL se reescribe con
history.replaceState.
-->
<template>
  <VContainer class="ua-page py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: DIRECTORIOS_HUB.label, to: localePath(DIRECTORIOS_HUB.path) },
        { title: 'Apps útiles', disabled: true },
      ]"
      class="px-0 pb-2"
    />

    <header class="ua-header">
      <p class="ua-eyebrow">Directorio</p>
      <h1 class="ua-title">Apps útiles en Uruguay: las del Estado y las del día a día</h1>
      <p class="ua-lead">
        {{ USEFUL_APPS.length }} apps que sirven para vivir en Uruguay —{{ publicCount }} son del
        Estado, de una intendencia o de una empresa pública—, con el desarrollador tal cual figura
        en cada tienda para que instales la oficial. Revisadas una por una el {{ verifiedLabel }}.
      </p>
      <div class="ua-stats">
        <StatTile label="Apps" :value="String(USEFUL_APPS.length)" note="en 10 categorías" />
        <StatTile
          label="Del Estado"
          :value="String(publicCount)"
          note="organismos, intendencias y empresas públicas"
        />
        <StatTile label="Revisado" :value="verifiedShort" :note="storesNote" />
      </div>
      <ContentTaskLinks
        label="En esta página"
        :items="[
          { label: 'Las imprescindibles', to: '#kit' },
          { label: 'Todas por categoría', to: '#explorar' },
          { label: 'Cómo reconocer la oficial', to: '#oficial' },
        ]"
      />
    </header>

    <UsefulAppsKit
      :apps="USEFUL_APPS"
      :facts="facts"
      :platform="platform"
      class="ua-block"
      @tab="openTab"
    />

    <section id="explorar" class="ua-block ua-explorer" aria-labelledby="ua-explorar-title">
      <h2 id="ua-explorar-title" class="ua-section-title">Todas las apps, por categoría</h2>
      <UsefulAppsCategoryNav :tabs="tabLinks" :current="state.tab" @select="selectTab" />
      <UsefulAppsFilters :state="state" :departments="departments" @update="update" />

      <div class="ua-results-head">
        <p class="ua-count" aria-live="polite">
          <strong>{{ usefulAppsCountLabel(results.length) }}</strong>
          <template v-if="currentCategory"> en {{ currentCategory.label }}</template>
          <template v-else-if="state.tab === 'imprescindibles'"> imprescindibles</template>
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
      <p v-if="currentCategory" class="ua-blurb">{{ currentCategory.blurb }}</p>
      <p v-if="state.tab === 'dinero'" class="ua-blurb">
        Acá están las principales. Inversión, cripto y el resto de las apps de plata están en el
        <NuxtLink :to="localePath('/apps-economia-uruguay')"
          >directorio de apps de economía</NuxtLink
        >, y los clubes de puntos en
        <NuxtLink :to="localePath('/apps-de-beneficios-uruguay')">apps de beneficios</NuxtLink>.
      </p>

      <template v-if="results.length">
        <template v-if="grouped">
          <section
            v-for="group in grouped"
            :key="group.category.id"
            class="ua-group"
            :aria-labelledby="`ua-grupo-${group.category.id}`"
          >
            <h3 :id="`ua-grupo-${group.category.id}`" class="ua-group__title">
              <VIcon size="22" aria-hidden="true">{{ group.category.icon }}</VIcon>
              {{ group.category.label }}
              <span class="ua-group__count">{{ group.apps.length }}</span>
            </h3>
            <ul class="ua-grid">
              <li v-for="app in group.apps" :key="app.id">
                <UsefulAppsCard
                  :app="app"
                  :facts="facts[app.id] ?? null"
                  :platform="platform"
                  :today="today"
                  :alternative="alternativeOf(app)"
                  heading-level="h4"
                />
              </li>
            </ul>
            <a class="ua-back" href="#explorar">Volver a las categorías</a>
          </section>
        </template>
        <ul v-else class="ua-grid">
          <li v-for="app in results" :key="app.id">
            <UsefulAppsCard
              :app="app"
              :facts="facts[app.id] ?? null"
              :platform="platform"
              :today="today"
              :alternative="alternativeOf(app)"
              heading-level="h3"
            />
          </li>
        </ul>
      </template>
      <div v-else class="ua-empty">
        <VIcon size="48" aria-hidden="true">mdi-cellphone-remove</VIcon>
        <p class="ua-empty__title">Ninguna app coincide con esa búsqueda.</p>
        <p>Probá con otra palabra (por ejemplo "ómnibus" o "luz") o limpiá los filtros.</p>
        <VBtn color="primary" variant="tonal" @click="clearFilters">Limpiar filtros</VBtn>
      </div>
    </section>

    <section class="ua-block" aria-labelledby="ua-no-app-title">
      <h2 id="ua-no-app-title" class="ua-section-title">Lo que buscás y no es una app</h2>
      <p class="ua-section-intro">
        Estos servicios no tienen app oficial: lo que aparece en las tiendas con su nombre no es de
        ellos. Esto es lo que sí existe.
      </p>
      <ul class="ua-notapps">
        <li v-for="service in USEFUL_APPS_NOT_APPS" :key="service.id">
          <SurfaceCard padding="compact" stretch>
            <h3 class="ua-notapp__name">{{ service.name }}</h3>
            <p class="ua-notapp__looking">{{ service.lookingFor }}</p>
            <p>{{ service.instead }}</p>
            <ul class="ua-notapp__channels">
              <li v-for="channel in service.channels" :key="channel.url">
                {{ channel.label }}:
                <a :href="channel.url" target="_blank" rel="noopener noreferrer nofollow">
                  {{ channel.value }}
                </a>
              </li>
            </ul>
          </SurfaceCard>
        </li>
      </ul>
    </section>

    <section id="oficial" class="ua-block" aria-labelledby="ua-oficial-title">
      <h2 id="ua-oficial-title" class="ua-section-title">Cómo reconocer la app oficial</h2>
      <ol class="ua-steps">
        <li v-for="tip in USEFUL_APPS_SAFETY" :key="tip">{{ tip }}</li>
      </ol>
      <p class="ua-section-intro">
        Si ya te pasó, en
        <NuxtLink :to="localePath('/estafas-uruguay')">estafas en Uruguay</NuxtLink> está qué hacer
        y a quién avisarle.
      </p>
    </section>

    <section class="ua-block" aria-labelledby="ua-criterios-title">
      <h2 id="ua-criterios-title" class="ua-section-title">Cómo elegimos</h2>
      <ul class="ua-steps ua-steps--bullets">
        <li v-for="line in USEFUL_APPS_CRITERIA" :key="line">{{ line }}</li>
      </ul>
      <p class="ua-section-intro">
        La lista se revisó a mano el {{ verifiedLabel }}.
        <template v-if="storesLabel">
          Los íconos, las notas y las fechas de versión se leyeron de las tiendas el
          {{ storesLabel }}.
        </template>
        ¿Falta una app o cambió algo? Escribinos desde
        <NuxtLink :to="localePath('/contacto')">contacto</NuxtLink>.
      </p>
    </section>

    <FaqSection :items="faqItems" heading="Preguntas frecuentes" :expanded="true" />

    <div class="ua-share">
      <ShareButtons
        text="Las apps del Estado que todos deberían tener y las útiles del día a día"
        variant="tonal"
        color="primary"
      />
    </div>
  </VContainer>
</template>

<script setup lang="ts">
import { DIRECTORIOS_HUB, directoriosHubListItem } from '~/utils/directorios'
import type { FaqItem } from '~/utils/faqAnswers'
import {
  USEFUL_APP_CATEGORIES,
  USEFUL_APPS_DEFAULT_STATE,
  type UsefulApp,
  type UsefulAppCategoryId,
  type UsefulAppsPlatform,
  type UsefulAppsState,
  type UsefulAppsTab,
  usefulAppIsPublic,
  usefulAppsActiveFilterCount,
  usefulAppsCountLabel,
  usefulAppsDepartmentsIn,
  usefulAppsDetectPlatform,
  usefulAppsFilter,
  usefulAppsGroup,
  usefulAppsQueryFromState,
  usefulAppsSort,
  usefulAppsStateFromQuery,
  usefulAppsTabCounts,
} from '~/utils/usefulApps'
import { USEFUL_APPS, USEFUL_APPS_VERIFIED_AT } from '~/utils/usefulAppsCatalog'
import {
  USEFUL_APPS_CRITERIA,
  USEFUL_APPS_ESSENTIAL_IDS,
  USEFUL_APPS_FAQ,
  USEFUL_APPS_NOT_APPS,
  USEFUL_APPS_SAFETY,
} from '~/utils/usefulAppsContent'
import {
  type UsefulAppsAppFacts,
  type UsefulAppsStoresPayload,
  usefulAppsLatestUpdate,
  usefulAppsLongDate,
} from '~/utils/usefulAppsStores'
import { usefulAppsTabLinks } from '~/utils/usefulAppsView'

const localePath = useLocalePath()
const route = useRoute()
const BASE_PATH = '/apps-utiles-uruguay'
// Literal y absoluta, nunca armada con localePath: /en/ y /pt/ existen y tienen que apuntar a la
// misma canonical (ver tiendas-online-uruguay/index.vue).
const canonicalUrl = 'https://cambio-uruguay.com/apps-utiles-uruguay'

// El estado sale de la URL también en el servidor: un enlace compartido o una pestaña tocada antes
// de hidratar llega ya filtrada. Después se escribe con history.replaceState (router.replace haría
// saltar la página en cada tecla).
const state = reactive<UsefulAppsState>(
  usefulAppsStateFromQuery(route.query as Record<string, unknown>)
)
usePreciosQuerySync(() => usefulAppsQueryFromState(state))

const { data: stores } = await useFetch<UsefulAppsStoresPayload | null>('/api/useful-apps/stores', {
  key: 'useful-apps-stores',
  default: () => null,
})
const facts = computed<Record<string, UsefulAppsAppFacts>>(() => stores.value?.apps ?? {})

// La tienda del lector sólo se sabe en el cliente: el HTML del servidor es el mismo para todos.
const platform = ref<UsefulAppsPlatform | null>(null)
onMounted(() => {
  platform.value = usefulAppsDetectPlatform(
    navigator.userAgent,
    navigator.platform,
    navigator.maxTouchPoints
  )
})

const ctx = { essentialIds: USEFUL_APPS_ESSENTIAL_IDS }
const appsById = new Map(USEFUL_APPS.map(app => [app.id, app]))
const counts = usefulAppsTabCounts(USEFUL_APPS, ctx)
const departments = usefulAppsDepartmentsIn(USEFUL_APPS)
const publicCount = USEFUL_APPS.filter(usefulAppIsPublic).length
const verifiedLabel = usefulAppsLongDate(USEFUL_APPS_VERIFIED_AT)
const verifiedShort = verifiedLabel.replace(/ de \d{4}$/, '')
const today = computed(() => stores.value?.capturedAt ?? USEFUL_APPS_VERIFIED_AT)
const storesLabel = computed(() =>
  stores.value ? usefulAppsLongDate(stores.value.capturedAt) : null
)
const storesNote = computed(() =>
  storesLabel.value ? `tiendas leídas el ${storesLabel.value}` : 'a mano, ficha por ficha'
)

const results = computed(() =>
  usefulAppsSort(usefulAppsFilter(USEFUL_APPS, state, ctx), state.orden, app =>
    usefulAppsLatestUpdate(facts.value[app.id])
  )
)
const grouped = computed(() =>
  state.tab === 'todas' && state.orden === 'utiles' ? usefulAppsGroup(results.value) : null
)
const tabLinks = computed(() => usefulAppsTabLinks(localePath(BASE_PATH), state, counts))
const currentCategory = computed(
  () => USEFUL_APP_CATEGORIES.find(category => category.id === state.tab) ?? null
)
const filtersActive = computed(() => usefulAppsActiveFilterCount(state) > 0)
const faqItems = USEFUL_APPS_FAQ as FaqItem[]

function alternativeOf(app: UsefulApp): UsefulApp | null {
  return app.officialAlternative ? (appsById.get(app.officialAlternative) ?? null) : null
}
function selectTab(tab: UsefulAppsTab) {
  state.tab = tab
}
function update(patch: Partial<UsefulAppsState>) {
  Object.assign(state, patch)
}
function clearFilters() {
  Object.assign(state, { ...USEFUL_APPS_DEFAULT_STATE, tab: state.tab })
}
function openTab(tab: UsefulAppCategoryId) {
  state.tab = tab
  nextTick(() => document.getElementById('explorar')?.scrollIntoView({ block: 'start' }))
}

const title = 'Apps del Estado y apps útiles en Uruguay'
// Abre con el dato que nadie publica junto (la oficial del ómnibus no es la más bajada) y no con lo
// que la página es: medido en este sitio, un snippet con el dato corre a ~1,4 % de CTR y uno
// genérico a 0,03–0,2 % desde la misma posición.
const description =
  'Cómo ir es la app oficial del ómnibus en Montevideo; STM Montevideo no es de la IM. BPS, ASSE, UTE, DGI y más, con el desarrollador de cada tienda.'

defineOgImageComponent('Cambio', {
  title: 'Apps útiles de Uruguay',
  subtitle: 'Las del Estado que todos deberían tener y las del día a día',
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
              { '@type': 'ListItem', position: 3, name: 'Apps útiles', item: canonicalUrl },
            ],
          },
          {
            '@type': 'ItemList',
            name: 'Apps útiles en Uruguay',
            numberOfItems: USEFUL_APPS.length,
            itemListElement: USEFUL_APPS.map((app, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: `${app.name} — ${app.organization}`,
              url: `${canonicalUrl}#${app.id}`,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
/* Reset en :where() también para la raíz (especificidad 0): con :is() el reset le ganaba a los
   márgenes del propio autor (memoria reset-css-is-vs-where, docs/app/CSS_RESET_SPECIFICITY.md). */
:where(.ua-page) :where(p, h1, h2, h3, ul, ol) {
  margin-top: 0;
}
.ua-eyebrow {
  margin-bottom: 8px;
  color: rgb(var(--v-theme-link));
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.ua-title {
  margin-bottom: 16px;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.ua-lead {
  max-width: 72ch;
  margin-bottom: 24px;
  font-size: 1.075rem;
  line-height: 1.65;
}
.ua-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  gap: 16px;
  max-width: 720px;
  margin-bottom: 24px;
}
.ua-block {
  margin-top: 40px;
}
.ua-section-title {
  margin-bottom: 8px;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
  line-height: 1.2;
}
.ua-section-intro {
  max-width: 72ch;
  margin-top: 12px;
}
.ua-results-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: center;
  margin-top: 16px;
}
.ua-count {
  margin-bottom: 0;
}
.ua-blurb {
  max-width: 72ch;
  margin-top: 4px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.ua-blurb a,
.ua-section-intro a,
.ua-back,
.ua-notapp__channels a {
  color: rgb(var(--v-theme-link));
}
.ua-group {
  margin-top: 24px;
}
.ua-group__title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
  font-size: 1.25rem;
  font-weight: 700;
}
.ua-group__count {
  font-size: 0.875rem;
  font-weight: 600;
  opacity: 0.7;
}
.ua-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}
.ua-grid > li {
  min-width: 0;
}
.ua-grid > :deep(.google-auto-placed) {
  grid-column: 1 / -1;
}
@media (min-width: 600px) {
  .ua-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }
}
.ua-back {
  display: inline-block;
  margin-top: 12px;
  font-size: 0.875rem;
  font-weight: 600;
}
.ua-empty {
  display: grid;
  gap: 8px;
  justify-items: center;
  margin-top: 24px;
  padding: 32px 16px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  text-align: center;
}
.ua-empty__title {
  font-weight: 700;
}
.ua-notapps {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
  gap: 12px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}
.ua-notapp__name {
  font-size: 1.125rem;
  font-weight: 700;
}
.ua-notapp__looking {
  margin-top: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.ua-notapp__channels {
  margin-top: 8px;
  padding-left: 18px;
  font-size: 0.875rem;
}
.ua-steps {
  max-width: 72ch;
  margin-top: 12px;
  padding-left: 22px;
  line-height: 1.55;
}
.ua-steps li + li {
  margin-top: 8px;
}
.ua-share {
  margin-top: 32px;
}
</style>
