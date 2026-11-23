<!--
THESIS: La ficha de UN aviso de moto usada: lo que dice el aviso, lo que dice su ficha en Mercado
Libre, cómo cambió su precio y cómo está contra la misma moto. Es la página de decidir, no la de
buscar: noindex, como la de autos, porque un aviso vence en semanas.
OWN-WORLD: La forma de /autos-usados-uruguay/<key> (galería a la izquierda, datos a la derecha,
ficha técnica, historia de precio, comparación, parecidas).
-->
<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs :items="breadcrumbs" class="px-0 mb-2" />

    <template v-if="!data || !moto">
      <h1 class="text-h5 font-weight-bold mb-3">
        {{
          failureCode === 404
            ? 'Este aviso ya no está en el directorio'
            : 'No pudimos cargar el aviso'
        }}
      </h1>
      <p class="text-body-1 mb-4">
        {{
          failureCode === 404
            ? 'Los avisos de motos vencen o se venden rápido. Buscá motos parecidas en el directorio.'
            : 'Probá de nuevo en unos minutos.'
        }}
      </p>
      <VBtn color="primary" :to="localePath(MOTOS_PATH)">Ir al directorio</VBtn>
    </template>

    <template v-else>
      <VRow>
        <VCol cols="12" md="6">
          <div class="moto-photo">
            <img
              v-if="activePicture"
              :src="activePicture"
              :alt="moto.title"
              width="720"
              height="480"
              fetchpriority="high"
              decoding="async"
              referrerpolicy="no-referrer"
            />
            <VIcon v-else icon="mdi-motorbike" size="64" />
          </div>
          <div v-if="gallery.length > 1" class="moto-gallery mt-2" data-testid="moto-gallery">
            <button
              v-for="(url, index) in gallery"
              :key="url"
              type="button"
              class="moto-gallery__thumb"
              :class="{ 'moto-gallery__thumb--active': url === activePicture }"
              :aria-label="`Foto ${index + 1} de ${gallery.length}`"
              :aria-pressed="url === activePicture"
              @click="activePicture = url"
            >
              <img
                :src="url"
                alt=""
                loading="lazy"
                width="120"
                height="80"
                referrerpolicy="no-referrer"
              />
            </button>
          </div>
        </VCol>
        <VCol cols="12" md="6">
          <h1 class="text-h5 font-weight-bold mb-1">{{ motoName(moto) }} {{ moto.year }}</h1>
          <p v-if="sellerTitle" class="text-body-2 text-medium-emphasis mb-2">
            Título del aviso: «{{ sellerTitle }}»
          </p>
          <MotosCompareLink :moto-key="moto.key" class="mb-3" />
          <p class="text-h4 font-weight-bold mb-1">{{ motoMoney(moto.price, moto.currency) }}</p>
          <p v-if="moto.priceConverted" class="text-body-2 text-medium-emphasis">
            ≈ {{ motoUsd(moto.priceUsd) }} a la cotización del día
          </p>
          <p v-if="moto.priceDrop" class="text-body-2 mb-2">
            Bajó de {{ motoMoney(moto.priceDrop.from, moto.priceDrop.currency) }} el
            {{ motoLongDate(moto.priceDrop.since) }}.
          </p>
          <VTable density="compact" class="mb-4">
            <tbody>
              <tr>
                <th scope="row">Modelo</th>
                <td>
                  <NuxtLink v-if="data.model" :to="localePath(`${MOTOS_PATH}/${data.model.slug}`)">
                    {{ motoName(moto) }}
                  </NuxtLink>
                  <template v-else>{{
                    moto.model === MOTO_NO_MODEL
                      ? `${moto.brand} (sin modelo informado)`
                      : motoName(moto)
                  }}</template>
                </td>
              </tr>
              <tr>
                <th scope="row">Año</th>
                <td>{{ moto.year }}</td>
              </tr>
              <tr>
                <th scope="row">Kilómetros</th>
                <td>{{ motoKmLabel(moto.km) }}</td>
              </tr>
              <tr data-testid="moto-displacement">
                <th scope="row">Cilindrada</th>
                <td>
                  <template v-if="displacement">
                    <strong>{{ displacement }}</strong>
                    <span class="d-block text-body-2 text-medium-emphasis">
                      {{ motoDisplacementSource(moto) }}
                    </span>
                  </template>
                  <template v-else>No informada</template>
                </td>
              </tr>
              <tr v-if="moto.type">
                <th scope="row">Tipo</th>
                <td>{{ motoTypeLabel(moto.type) }}</td>
              </tr>
              <tr v-if="moto.fuel">
                <th scope="row">Motor</th>
                <td>
                  {{ [motoFuelLabel(moto.fuel), moto.specs?.engine].filter(Boolean).join(' · ') }}
                </td>
              </tr>
              <tr v-if="moto.color">
                <th scope="row">Color</th>
                <td>{{ MOTO_COLOR_LABEL[moto.color] ?? moto.color }}</td>
              </tr>
              <tr>
                <th scope="row">Ubicación</th>
                <td>
                  {{ [moto.neighborhood, moto.department].filter(Boolean).join(', ') || '—' }}
                </td>
              </tr>
              <tr v-if="moto.sellerType">
                <th scope="row">Vende</th>
                <td>{{ MOTO_SELLER_LABEL[moto.sellerType] }}</td>
              </tr>
              <tr>
                <th scope="row">Fuente</th>
                <td>{{ moto.sourceName }}</td>
              </tr>
              <tr>
                <th scope="row">Visto por primera vez</th>
                <td>{{ motoLongDate(moto.firstSeen) }}</td>
              </tr>
              <tr>
                <th scope="row">Última lectura</th>
                <td>{{ motoLongDate(moto.lastSeen) }}</td>
              </tr>
            </tbody>
          </VTable>

          <VAlert
            v-if="moto.currencyInferred"
            type="info"
            variant="outlined"
            density="compact"
            class="mb-3"
          >
            El aviso no dice la moneda: la dedujimos comparando con la misma moto en Mercado Libre.
          </VAlert>
          <section v-if="risks.length" class="moto-declared mb-4" data-testid="moto-risks">
            <h2 class="text-subtitle-1 font-weight-bold mb-2">Lo que declara este aviso</h2>
            <div v-for="risk in risks" :key="risk.category" class="mb-3">
              <p class="text-body-2 font-weight-bold mb-1">
                {{ MOTO_RISK_GUIDE[risk.category]?.label ?? risk.category }}
              </p>
              <blockquote class="moto-declared__quote mb-1">
                <q>{{ risk.quote }}</q>
                <span class="text-caption text-medium-emphasis">
                  — {{ risk.from === 'title' ? 'título del aviso' : 'descripción del aviso' }}
                </span>
              </blockquote>
              <p v-if="MOTO_RISK_GUIDE[risk.category]" class="text-body-2 mb-0">
                {{ MOTO_RISK_GUIDE[risk.category].meaning }}
                <strong>{{ MOTO_RISK_GUIDE[risk.category].check }}</strong>
              </p>
            </div>
            <p class="text-body-2 mb-0">Lo dice el vendedor, no nosotros.</p>
          </section>

          <div class="d-flex flex-wrap ga-2">
            <VBtn
              v-if="safePermalink"
              color="primary"
              :href="safePermalink"
              target="_blank"
              rel="nofollow noopener"
              append-icon="mdi-open-in-new"
            >
              Ver aviso en {{ moto.sourceName }}
            </VBtn>
            <VBtn
              v-if="data.model"
              variant="outlined"
              :to="localePath(`${MOTOS_PATH}/${data.model.slug}`)"
            >
              Precios de la {{ motoName(moto) }}
            </VBtn>
          </div>
        </VCol>
      </VRow>

      <!-- La unidad intermedia, en el primer corte después de lo que la persona vino a ver (fotos,
           precio, datos), como en la ficha de autos. -->
      <AdSlot placement="in-article" />

      <section v-if="specRows.length" class="mt-8" data-testid="moto-specs">
        <h2 class="text-h6 mb-1">Ficha técnica</h2>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Según la ficha del aviso en {{ moto.sourceName }}, leída el
          {{ motoLongDate(moto.specs?.readAt) }}. La cargó el vendedor; no la verificamos.
        </p>
        <VTable density="compact" class="moto-specs__table">
          <tbody>
            <tr v-for="row in specRows" :key="row.label">
              <th scope="row">{{ row.label }}</th>
              <td>{{ row.value }}</td>
            </tr>
          </tbody>
        </VTable>
      </section>

      <section v-if="data.priceHistory" class="mt-8" data-testid="moto-price-history">
        <h2 class="text-h6 mb-2">Cómo cambió el precio de este aviso</h2>
        <PriceHistoryBlock
          id="moto-price-history"
          :series="data.priceHistory"
          title="Lo que pidió este vendedor"
        />
      </section>

      <section class="mt-8" data-testid="moto-price-position">
        <h2 class="text-h6 mb-2">¿Cómo está el precio?</h2>
        <p v-if="yearPosition && data.yearBand" class="text-body-1">
          Para la {{ motoName(moto) }} {{ moto.year }} hay {{ data.yearBand.n }} avisos comparables:
          la mitad pide menos de <strong>{{ motoUsd(data.yearBand.median) }}</strong> y el rango
          central va de {{ motoUsd(data.yearBand.p25) }} a {{ motoUsd(data.yearBand.p75) }}. Este
          aviso pide {{ motoUsd(moto.priceUsd) }}: {{ positionText(yearPosition) }}.
        </p>
        <p v-else-if="modelPosition && data.model?.band" class="text-body-1">
          No hay avisos suficientes de la {{ motoName(moto) }} {{ moto.year }} para comparar el
          mismo año. Contra todos los años del modelo ({{ data.model.band.n }} avisos), la mediana
          es <strong>{{ motoUsd(data.model.band.median) }}</strong> y el rango central va de
          {{ motoUsd(data.model.band.p25) }} a {{ motoUsd(data.model.band.p75) }}; este aviso pide
          {{ motoUsd(moto.priceUsd) }} ({{ positionText(modelPosition) }}). Ojo: mezcla años
          distintos.
        </p>
        <p v-else class="text-body-1">
          Todavía no hay avisos suficientes de este modelo para decir si el precio está alto o bajo:
          preferimos no comparar contra dos o tres avisos.
        </p>
        <p v-if="data.model?.annualDrop != null" class="text-body-2 text-medium-emphasis mb-0">
          En el catálogo, la {{ motoName(moto) }} pierde alrededor de
          {{ Math.round(data.model.annualDrop * 10) / 10 }} % por cada año de antigüedad.
        </p>
      </section>

      <section v-if="data.similar.length" class="mt-8">
        <h2 class="text-h6 mb-3">Otras {{ motoName(moto) }} publicadas</h2>
        <div class="motos-grid">
          <MotosListingCard v-for="other in data.similar" :key="other.key" :moto="other" />
        </div>
      </section>

      <p class="text-body-2 text-medium-emphasis mt-8">
        Datos del aviso publicado en {{ moto.sourceName }}. Es un precio pedido, no una tasación;
        confirmá estado, papeles y deudas de la moto antes de pagar.
      </p>
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import {
  MOTOS_PATH,
  MOTO_COLOR_LABEL,
  MOTO_NO_MODEL,
  MOTO_RISK_GUIDE,
  MOTO_SELLER_LABEL,
  motoAvisoPath,
  motoDisplacementSource,
  motoDisplacementText,
  motoFuelLabel,
  motoKmLabel,
  motoLongDate,
  motoMoney,
  motoName,
  motoPricePosition,
  motoSafePermalink,
  motoSellerTitle,
  motoTypeLabel,
  motoUsd,
  type MotoAvisoResponse,
} from '~/utils/motos'

// Una clave con forma imposible es un 404 ANTES de tocar la base. La macro sólo ve imports, nunca
// constantes del `<script setup>` (la trampa que documenta `carKeyValid`).
definePageMeta({
  validate: async route => {
    const motos = await import('~/utils/motos')
    return motos.motoAvisoKeyValid(String(route.params.key ?? ''))
  },
})

const route = useRoute()
const localePath = useLocalePath()
const key = computed(() => String(route.params.key || ''))
const { data, error } = await useAsyncData<MotoAvisoResponse>(
  () => `moto-aviso-${key.value}`,
  () => $fetch<MotoAvisoResponse>(`/api/motos/aviso/${encodeURIComponent(key.value)}`)
)
const failureCode = computed(() => {
  const failure = error.value as { statusCode?: number; data?: { statusCode?: number } } | null
  return failure?.statusCode === 404 || failure?.data?.statusCode === 404 ? 404 : 503
})
if (import.meta.server && (error.value || !data.value)) {
  const event = useRequestEvent()
  if (event) {
    setResponseStatus(event, failureCode.value)
    useResponseHeader('cache-control').value = 'no-store, max-age=0'
  }
}

// Todo lo que cuelga del aviso sigue vivo con `moto === null` (aviso vencido): una lectura ansiosa
// adentro de setup convierte el 404 en un 500 (medido en autos el 22/9/2026).
const moto = computed(() => data.value?.moto ?? null)
const gallery = computed(() => {
  const own = moto.value?.pictures ?? []
  if (own.length) return own
  return moto.value?.picture ? [moto.value.picture] : []
})
const activePicture = ref<string | null>(gallery.value[0] ?? null)
watch(gallery, list => {
  activePicture.value = list[0] ?? null
})
const displacement = computed(() => (moto.value ? motoDisplacementText(moto.value) : null))
const sellerTitle = computed(() => (moto.value ? motoSellerTitle(moto.value) : null))
const risks = computed(() => moto.value?.risks ?? [])
/** El enlace al aviso original, sólo si es de una fuente conocida (ML Uruguay o Marketplace). */
const safePermalink = computed(() => motoSafePermalink(moto.value?.permalink))

const yesNo = (value: boolean | null | undefined) => (value == null ? null : value ? 'Sí' : 'No')
const specRows = computed(() => {
  const specs = moto.value?.specs
  if (!specs) return []
  return [
    { label: 'Motor', value: specs.engine },
    { label: 'Potencia', value: specs.power },
    { label: 'Transmisión', value: specs.transmission },
    { label: 'Velocidades', value: specs.gears ? String(specs.gears) : null },
    { label: 'Frenos', value: specs.brakes },
    { label: 'Único dueño', value: yesNo(specs.uniqueOwner) },
    { label: 'Acepta permuta', value: yesNo(specs.tradeIn) },
    { label: 'Precio negociable', value: yesNo(specs.negotiable) },
  ].filter((row): row is { label: string; value: string } => !!row.value)
})

const yearPosition = computed(() =>
  moto.value ? motoPricePosition(moto.value.priceUsd, data.value?.yearBand ?? null) : null
)
const modelPosition = computed(() =>
  moto.value ? motoPricePosition(moto.value.priceUsd, data.value?.model?.band ?? null) : null
)
function positionText(position: { tier: 'bajo' | 'centro' | 'alto'; vsMedian: number }): string {
  const pct = Math.abs(position.vsMedian)
  if (position.tier === 'bajo') return `${pct} % debajo de la mediana, por debajo del rango central`
  if (position.tier === 'alto') return `${pct} % arriba de la mediana, por encima del rango central`
  if (pct === 0) return 'justo en la mediana'
  return `${pct} % ${position.vsMedian < 0 ? 'debajo' : 'arriba'} de la mediana, dentro del rango central`
}

const breadcrumbs = computed(() => [
  { title: 'Inicio', to: localePath('/') },
  { title: 'Motos usadas', to: localePath(MOTOS_PATH) },
  ...(data.value?.model
    ? [
        {
          title: `${data.value.model.brand} ${data.value.model.model}`,
          to: localePath(`${MOTOS_PATH}/${data.value.model.slug}`),
        },
      ]
    : []),
  { title: moto.value ? `${motoName(moto.value)} ${moto.value.year}` : 'Aviso' },
])

const canonical = computed(() => `https://cambio-uruguay.com${motoAvisoPath(key.value)}`)
const title = computed(() =>
  moto.value ? `${motoName(moto.value)} ${moto.value.year} usada` : 'Aviso de moto usada'
)
const description = computed(() =>
  moto.value
    ? `${moto.value.brand} ${moto.value.model} ${moto.value.year}, ${motoKmLabel(moto.value.km)}: ${motoMoney(moto.value.price, moto.value.currency)}. Comparada contra la misma moto en Uruguay.`
    : 'Aviso de moto usada en Uruguay.'
)
useSeoMeta({
  title: () => `${title.value} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonical,
  // Un aviso vence en semanas: la página ayuda a decidir, no pertenece al índice.
  robots: 'noindex, follow',
})
// Una tarjeta estática para todos los avisos, como autos: dibujar una por aviso y por idioma es el
// costo a evitar en páginas noindex que vencen en semanas. og-motos.png es 1200×630.
defineOgImage({ url: '/img/og-motos.png', width: 1200, height: 630 })
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: moto.value
    ? [
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
                    name: 'Inicio',
                    item: 'https://cambio-uruguay.com/',
                  },
                  {
                    '@type': 'ListItem',
                    position: 2,
                    name: 'Motos usadas',
                    item: `https://cambio-uruguay.com${MOTOS_PATH}`,
                  },
                  ...(data.value?.model
                    ? [
                        {
                          '@type': 'ListItem',
                          position: 3,
                          name: `${data.value.model.brand} ${data.value.model.model}`,
                          item: `https://cambio-uruguay.com${MOTOS_PATH}/${data.value.model.slug}`,
                        },
                      ]
                    : []),
                  {
                    '@type': 'ListItem',
                    position: data.value?.model ? 4 : 3,
                    name: moto.value.title,
                    item: canonical.value,
                  },
                ],
              },
              {
                '@type': 'Vehicle',
                name: moto.value.title,
                brand: { '@type': 'Brand', name: moto.value.brand },
                model: moto.value.model,
                vehicleModelDate: String(moto.value.year),
                ...(moto.value.km != null
                  ? {
                      mileageFromOdometer: {
                        '@type': 'QuantitativeValue',
                        value: moto.value.km,
                        unitCode: 'KMT',
                      },
                    }
                  : {}),
                ...(gallery.value[0] ? { image: gallery.value[0] } : {}),
                offers: {
                  '@type': 'Offer',
                  price: moto.value.price,
                  priceCurrency: moto.value.currency,
                  itemCondition: 'https://schema.org/UsedCondition',
                  url: canonical.value,
                },
              },
            ],
          }),
        },
      ]
    : [],
}))
</script>

<style scoped>
.moto-photo {
  aspect-ratio: 3 / 2;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.moto-photo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.moto-gallery {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.moto-gallery__thumb {
  flex: 0 0 auto;
  width: 88px;
  aspect-ratio: 3 / 2;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.moto-gallery__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.moto-gallery__thumb--active {
  border-color: rgb(var(--v-theme-primary));
}
.moto-gallery__thumb:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 2px;
}
/* La cita del vendedor como en la ficha de autos: texto y procedencia apilados, sin adornos. */
.moto-declared__quote {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
}
.moto-specs__table {
  max-width: 560px;
}
.motos-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}
@media (min-width: 600px) {
  .motos-grid {
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 16px;
  }
}
</style>
