<template>
  <div class="apps-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3">
      <VBtn :to="localePath('/herramientas')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Herramientas
      </VBtn>
    </div>

    <!-- Header -->
    <VCard class="overflow-hidden mb-4" elevation="8">
      <div class="bg-gradient-apps pa-6">
        <div class="d-flex align-center ga-4 flex-wrap">
          <VAvatar size="56" class="d-none d-md-flex bg-white">
            <VIcon size="32" color="primary">mdi-cellphone-cog</VIcon>
          </VAvatar>
          <div>
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
              Apps de economía y dinero en Uruguay: directorio
            </h1>
            <p class="text-body-1 text-grey-lighten-2 mb-0 apps-intro">
              Un directorio de las aplicaciones y herramientas útiles para tu plata en Uruguay: apps
              de bancos, billeteras y pagos, inversión, cripto, trámites del Estado, servicios del
              día a día y proyectos hechos por la comunidad. {{ MONEY_APPS.length }} apps y
              contando.
            </p>
          </div>
        </div>
        <div class="d-flex justify-start justify-md-end mt-3">
          <ShareButtons text="Directorio de apps de economía y dinero en Uruguay" />
        </div>
      </div>
    </VCard>

    <!-- Filters -->
    <VCard variant="flat" class="apps-filters pa-4 mb-6">
      <VRow align="center" dense>
        <VCol cols="12" md="6">
          <VTextField
            v-model="q"
            density="comfortable"
            variant="outlined"
            hide-details
            clearable
            placeholder="Buscar app, banco o billetera..."
            prepend-inner-icon="mdi-magnify"
          />
        </VCol>
        <VCol cols="12" md="6">
          <div class="d-flex align-center flex-wrap ga-2 justify-md-end">
            <span class="text-caption text-grey-lighten-1 mr-1">Plataforma:</span>
            <VChip
              v-for="p in platforms"
              :key="p"
              :color="platformFilter.includes(p) ? 'primary' : undefined"
              :variant="platformFilter.includes(p) ? 'flat' : 'outlined'"
              size="small"
              @click="togglePlatform(p)"
            >
              <VIcon start size="14">{{ PLATFORM_META[p].icon }}</VIcon>
              {{ PLATFORM_META[p].label }}
            </VChip>
            <VBtn
              v-if="q || platformFilter.length"
              variant="text"
              size="small"
              @click="clearFilters"
            >
              Limpiar
            </VBtn>
          </div>
        </VCol>
      </VRow>
    </VCard>

    <!-- Results -->
    <template v-if="groups.length">
      <section v-for="group in groups" :key="group.category" class="mb-6">
        <h2 class="text-h6 font-weight-bold mb-3 apps-group-title">
          <VIcon start size="small" color="primary">{{ group.icon }}</VIcon>
          {{ group.label }}
          <span class="text-caption text-grey-lighten-1 font-weight-regular ml-1">
            ({{ group.items.length }})
          </span>
        </h2>
        <VRow>
          <VCol v-for="app in group.items" :key="app.id" cols="12" sm="6" lg="4">
            <VCard class="app-card pa-4 h-100 d-flex flex-column" variant="flat">
              <div class="d-flex align-start justify-space-between ga-2 mb-1">
                <span class="text-subtitle-1 font-weight-bold">{{ app.name }}</span>
                <div class="d-flex flex-column align-end ga-1 flex-shrink-0">
                  <VChip
                    :color="app.official ? 'info' : 'secondary'"
                    size="x-small"
                    variant="tonal"
                  >
                    {{ app.official ? 'Oficial' : 'Comunidad' }}
                  </VChip>
                  <VChip v-if="app.verified" size="x-small" color="success" variant="tonal">
                    <VIcon start size="11">mdi-check-decagram-outline</VIcon>
                    Verificada
                  </VChip>
                </div>
              </div>
              <p class="text-caption text-grey-lighten-1 mb-2">{{ app.developer }}</p>
              <p class="text-body-2 app-desc mb-2">{{ app.description }}</p>
              <p v-if="app.note" class="text-caption app-note mb-2">{{ app.note }}</p>

              <div class="d-flex align-center ga-1 mb-3 flex-wrap">
                <VChip
                  v-for="p in app.platforms"
                  :key="p"
                  size="x-small"
                  variant="outlined"
                  class="app-platform"
                >
                  <VIcon start size="12">{{ PLATFORM_META[p].icon }}</VIcon>
                  {{ PLATFORM_META[p].label }}
                </VChip>
              </div>

              <div class="mt-auto d-flex flex-wrap ga-2">
                <VBtn
                  v-if="app.androidUrl"
                  :href="app.androidUrl"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  size="small"
                  variant="tonal"
                  color="primary"
                >
                  <VIcon start size="16">mdi-google-play</VIcon>
                  Play
                </VBtn>
                <VBtn
                  v-if="app.iosUrl"
                  :href="app.iosUrl"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  size="small"
                  variant="tonal"
                  color="primary"
                >
                  <VIcon start size="16">mdi-apple</VIcon>
                  App Store
                </VBtn>
                <VBtn
                  :href="app.website"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  size="small"
                  variant="text"
                >
                  <VIcon start size="16">mdi-open-in-new</VIcon>
                  Sitio
                </VBtn>
              </div>
            </VCard>
          </VCol>
        </VRow>
      </section>
    </template>

    <VAlert v-else type="info" variant="tonal" class="my-8">
      No encontramos apps que coincidan con tu búsqueda. Probá con otro término o limpiá los
      filtros.
    </VAlert>

    <!-- Disclaimer -->
    <VAlert
      type="warning"
      variant="tonal"
      density="comfortable"
      class="mt-4"
      icon="mdi-alert-outline"
    >
      Este directorio es <strong>informativo</strong>; no tenemos afiliación con las apps listadas
      ni recibimos comisión. La disponibilidad en las tiendas, las funciones y los nombres cambian.
      <strong>Descargá siempre desde la tienda oficial</strong> (Google Play o App Store) y verificá
      el desarrollador antes de instalar. Desconfiá de apps que imiten a un banco o billetera: nunca
      ingreses tus claves en una app que no sea la oficial.
    </VAlert>

    <!-- Cross-links -->
    <VRow class="my-6">
      <VCol cols="12" md="4">
        <VCard :to="localePath('/herramientas')" class="cross-link pa-4 h-100" hover variant="flat">
          <VIcon color="primary" class="mb-2">mdi-tools</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Herramientas y calculadoras</h3>
          <p class="text-body-2 text-grey-lighten-1 mb-0">
            Conversor, IVA, IRPF, plazo fijo, importación y más.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard
          :to="localePath('/salud-financiera')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-heart-pulse</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Salud financiera</h3>
          <p class="text-body-2 text-grey-lighten-1 mb-0">
            Diagnóstico e ideas para ordenar tu plata y ganar más.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard
          :to="localePath('/desarrolladores')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-api</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">API para desarrolladores</h3>
          <p class="text-body-2 text-grey-lighten-1 mb-0">
            ¿Hacés una app de finanzas? Usá nuestra API del dólar gratis.
          </p>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<script setup lang="ts">
import {
  MONEY_APPS,
  PLATFORM_META,
  moneyAppsByCategory,
  appHaystack,
  type Platform,
} from '~/utils/moneyApps'

const localePath = useLocalePath()

const q = ref('')
const platformFilter = ref<Platform[]>([])
const platforms: Platform[] = ['android', 'ios', 'web']

function togglePlatform(p: Platform) {
  platformFilter.value = platformFilter.value.includes(p)
    ? platformFilter.value.filter(x => x !== p)
    : [...platformFilter.value, p]
}

function clearFilters() {
  q.value = ''
  platformFilter.value = []
}

const normQuery = computed(() =>
  q.value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
)

const filtered = computed(() =>
  MONEY_APPS.filter(app => {
    if (platformFilter.value.length && !platformFilter.value.some(p => app.platforms.includes(p)))
      return false
    if (normQuery.value && !appHaystack(app).includes(normQuery.value)) return false
    return true
  })
)

const groups = computed(() => moneyAppsByCategory(filtered.value))

const canonicalUrl = 'https://cambio-uruguay.com/apps-economia-uruguay'
const title = 'Apps de economía y dinero en Uruguay: directorio de bancos, billeteras y más (2026)'
const description =
  'Directorio de apps útiles para tu plata en Uruguay: aplicaciones de bancos (BROU, Itaú, Santander, BBVA, Scotiabank), billeteras y pagos (Mercado Pago, Prex, MiDinero), inversión, cripto, trámites del Estado (BPS, DGI), servicios útiles y proyectos de la comunidad.'

defineOgImageComponent('Cambio', {
  title: 'Apps de dinero en Uruguay',
  subtitle: 'Bancos, billeteras, inversión, trámites y comunidad',
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

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'apps economia uruguay, apps de dinero uruguay, mejores apps bancarias uruguay, billeteras digitales uruguay, mercado pago uruguay, prex, midinero, app brou, apps finanzas uruguay',
    },
  ],
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
                item: 'https://cambio-uruguay.com',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Apps de economía en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'ItemList',
            name: 'Apps de economía y dinero en Uruguay',
            itemListElement: MONEY_APPS.map((a, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              name: a.name,
              url: a.website,
            })),
          },
          {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: '¿Cuáles son las mejores apps de dinero en Uruguay?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Depende de para qué las necesites: para operar con tu banco, la app oficial de tu banco (BROU, Itaú, Santander, BBVA, Scotiabank); para pagar y transferir, billeteras como Mercado Pago, Prex o MiDinero; para trámites e impuestos, las apps del BPS y de gub.uy; y para invertir, apps como Prex o Balanz. Descargá siempre desde la tienda oficial y verificá el desarrollador.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Cómo saber si una app financiera es segura?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Descargala solo desde Google Play o la App Store, verificá que el desarrollador sea el banco o la empresa oficial, revisá las valoraciones y la cantidad de descargas, y nunca ingreses tus claves bancarias en una app que imite a tu banco. Ante la duda, entrá por el sitio oficial del banco o billetera.',
                },
              },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.bg-gradient-apps {
  background: linear-gradient(135deg, #6d28d9 0%, #0f766e 100%);
}

.apps-page {
  overflow-x: hidden;
}

.apps-intro {
  max-width: 780px;
  line-height: 1.6;
}

.apps-group-title {
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding-left: 10px;
}

.apps-filters,
.app-card,
.cross-link {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.v-theme--light .apps-filters,
.v-theme--light .app-card,
.v-theme--light .cross-link {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.08);
}

.app-card {
  transition: transform 0.2s ease;
}
.app-card:hover {
  transform: translateY(-2px);
}

.app-desc {
  font-size: 0.85rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.82);
}
.v-theme--light .app-desc {
  color: rgba(0, 0, 0, 0.8);
}
.app-note {
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.4;
}
.v-theme--light .app-note {
  color: rgba(0, 0, 0, 0.55);
}
.app-platform {
  opacity: 0.85;
}

.cross-link {
  text-decoration: none;
  transition: transform 0.2s ease;
}
.cross-link:hover {
  transform: translateY(-2px);
}
</style>
