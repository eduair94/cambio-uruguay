<!--
THESIS: Alguien busca "gyroor c3 precio uruguay" o llega desde la tabla de modelos de bicis. Decir
cuánto sale hoy y en cuántos vendedores, todas las ofertas juntas, qué declara su ficha (rodado,
autonomía, potencia, batería removible, si las fichas coinciden), cuánto rinde de verdad y con qué
compararla. Ninguna tienda dice cuánto sale la misma bici en las otras: esa es la página.
OWN-WORLD: Misma familia y mismo esqueleto que /monopatines-electricos-uruguay/[modelo] (el catálogo
es el mismo, `category: bicicleta-electrica`); cambian los textos, la ficha y la regla del 60 %.
FIRST VIEWPORT: migas, foto, H1, "nueva desde" con vendedores, la franja de ficha y los dos botones.
-->
<template>
  <VContainer class="modelo-page py-6 py-md-10">
    <VBreadcrumbs :items="crumbs" class="px-0 mb-2" />

    <header class="modelo-hero">
      <div class="modelo-hero__media">
        <img
          v-if="model.image"
          :src="model.image"
          :alt="model.name"
          width="280"
          height="280"
          fetchpriority="high"
          decoding="async"
        />
        <VIcon v-else icon="mdi-bicycle-electric" size="96" aria-hidden="true" />
      </div>
      <div class="modelo-hero__text">
        <p class="modelo-hero__eyebrow">{{ variantLabel }} · {{ model.listings }} avisos</p>
        <h1 class="modelo-hero__title">Bicicleta eléctrica {{ model.name }}: precio en Uruguay</h1>
        <p class="lead">
          <template v-if="model.newBand">
            Nueva desde
            <strong class="price">{{ movilidadMoney(model.newBand.min) }}</strong>
            en {{ sellersLabel(model.newBand.sellers)
            }}<template v-if="model.newBand.n > 1"
              >; la mitad de las ofertas está en {{ movilidadMoney(model.newBand.median) }} o
              menos</template
            >.
          </template>
          <template v-if="model.usedBand">
            Usada desde <strong class="price">{{ movilidadMoney(model.usedBand.min) }}</strong
            >.
          </template>
          Precios vistos el {{ updated }}.
        </p>
        <MovilidadSpecStrip
          v-if="specsPublic"
          :specs="specsPublic"
          categoria="bicicleta-electrica"
          class="modelo-hero__strip"
        />
        <div class="modelo-hero__actions">
          <VBtn color="primary" variant="flat" href="#ofertas">
            Ver {{ model.sellers === 1 ? 'la oferta' : `los ${model.sellers} vendedores` }}
          </VBtn>
          <VBtn v-if="siblings[0] && !model.retired" variant="tonal" :to="compareTo(siblings[0])">
            Comparar con {{ siblings[0].name }}
          </VBtn>
        </div>
      </div>
    </header>

    <VAlert v-if="model.retired" type="info" variant="tonal" class="mt-6">
      Ya no encontramos avisos de este modelo con dos vendedores o más: sus precios son de la última
      vez que lo vimos y pueden haber cambiado.
      <NuxtLink to="/bicicletas-electricas-uruguay#modelos-title" class="cat-link">
        Ver los modelos a la venta hoy
      </NuxtLink>
    </VAlert>

    <!-- ── Ofertas ────────────────────────────────────────────────────────── -->
    <section id="ofertas" class="modelo-section" aria-labelledby="ofertas-title">
      <h2 id="ofertas-title">Dónde comprarlo</h2>
      <p class="section-intro">
        Cada vendedor con su precio más bajo, el más barato primero, en Mercado Libre y en tiendas
        uruguayas; si publica el mismo modelo más de una vez, sus otras publicaciones quedan abajo.
        El precio es el que publica el vendedor; el envío, el armado, la garantía y si sigue en
        stock se confirman en el aviso.
      </p>
      <div v-for="group in offerGroups" :key="group.key" class="offer-group">
        <h3>
          {{ group.key === 'new' ? 'Nueva' : 'Usada' }}
          <span class="muted">({{ sellersLabel(group.primary.length) }})</span>
        </h3>
        <ul class="offer-list">
          <li
            v-for="offer in [...group.primary, ...group.rest]"
            v-show="!group.rest.includes(offer) || openRest.includes(group.key)"
            :key="offer.listingId"
            class="offer-row"
            :class="{ 'offer-row--rest': group.rest.includes(offer) }"
          >
            <MovilidadVariantThumb
              :src="offer.image"
              :alt="offer.title"
              icon="mdi-bicycle-electric"
            />
            <div class="offer-row__main">
              <a :href="offer.url" target="_blank" rel="nofollow noopener" class="offer-row__title">
                {{ offer.title }}
              </a>
              <span class="offer-row__meta">
                <NuxtLink
                  v-if="storeKeyFor(offer)"
                  :to="localePath(`/tiendas-online-uruguay/${storeKeyFor(offer)}`)"
                  class="cat-link"
                  >{{ sellerLabel(offer) }}</NuxtLink
                ><template v-else>{{ sellerLabel(offer) }}</template> ·
                {{ offer.source === 'store' ? 'Tienda' : 'Mercado Libre' }}
                <template v-if="offer.officialStore"> · Tienda oficial</template>
                <template v-if="offer.freeShipping"> · Envío gratis</template>
                · visto el {{ movilidadShortDate(offer.observedAt) }}
              </span>
            </div>
            <div class="offer-row__price">
              <strong>{{ movilidadMoney(offer.priceUyu) }}</strong>
              <span v-if="offer.currency === 'USD'" class="muted">{{
                movilidadUsd(offer.price)
              }}</span>
            </div>
          </li>
        </ul>
        <VBtn
          v-if="group.rest.length && !openRest.includes(group.key)"
          class="mt-2"
          variant="text"
          size="small"
          append-icon="mdi-chevron-down"
          @click="openRest = [...openRest, group.key]"
        >
          Ver {{ group.rest.length }}
          {{ group.rest.length === 1 ? 'publicación más' : 'publicaciones más' }} de los mismos
          vendedores
        </VBtn>
      </div>
    </section>

    <!-- ── Ficha técnica ──────────────────────────────────────────────────── -->
    <section v-if="specRows.length" class="modelo-section" aria-labelledby="ficha-title">
      <h2 id="ficha-title">Ficha técnica</h2>
      <p class="section-intro">
        Lo que declaran las fichas de {{ model.fichas }} de sus {{ model.listings }} avisos: la
        tabla de características y la descripción de cada vendedor, nunca el título. Cuando los
        vendedores no dicen lo mismo, mostramos el rango en vez de elegir uno.
      </p>
      <VTable class="spec-table" density="compact">
        <tbody>
          <tr v-for="row in specRows" :key="row.key">
            <th scope="row">{{ row.label }}</th>
            <td class="spec-table__value">{{ row.value }}</td>
            <td class="spec-table__note">{{ row.note }}</td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <!-- ── Cuánto rinde ───────────────────────────────────────────────────── -->
    <section v-if="rinde.length" class="modelo-section" aria-labelledby="rinde-title">
      <h2 id="rinde-title">Cuánto rinde de verdad</h2>
      <ul class="facts">
        <li v-for="fact in rinde" :key="fact.key">
          <strong>{{ fact.head }}</strong> {{ fact.body }}
        </li>
      </ul>
    </section>

    <VAlert v-if="over25" type="info" variant="tonal" class="modelo-section">
      Declara {{ speedLabel }}: más que los {{ BICICLETA_CORTE_ASISTENCIA_KMH }} km/h en que la
      norma europea de pedaleo asistido corta la ayuda del motor. Qué pide cada departamento (casco,
      edad, por dónde circular) está en la tabla de normativa.
      <NuxtLink to="/bicicletas-electricas-uruguay#normativa-title" class="cat-link">
        Normativa por departamento
      </NuxtLink>
    </VAlert>

    <!-- ── Comparalo con ──────────────────────────────────────────────────── -->
    <section class="modelo-section" aria-labelledby="comparar-title">
      <h2 id="comparar-title">Comparalo con</h2>
      <p v-if="siblings.length" class="section-intro">
        Modelos del mismo tipo con el precio más parecido. "Comparar" los pone lado a lado, fila por
        fila de la ficha.
      </p>
      <ul v-if="siblings.length" class="siblings">
        <li v-for="sibling in siblings" :key="sibling.slug" class="sibling">
          <MovilidadVariantThumb
            :src="sibling.image ?? null"
            :alt="sibling.name"
            icon="mdi-bicycle-electric"
          />
          <div class="sibling__text">
            <NuxtLink :to="`/bicicletas-electricas-uruguay/${sibling.slug}`" class="cat-link">
              {{ sibling.name }}
            </NuxtLink>
            <span class="muted">{{ siblingPrice(sibling) }}</span>
            <MovilidadSpecStrip
              v-if="sibling.specs"
              :specs="{ ...sibling.specs, fromFicha: true }"
              categoria="bicicleta-electrica"
              compact
            />
          </div>
          <VBtn size="small" variant="outlined" :to="compareTo(sibling)">Comparar</VBtn>
        </li>
      </ul>
      <p>
        <NuxtLink to="/bicicletas-electricas-uruguay#modelos-title" class="cat-link">
          Todos los modelos de bicicleta eléctrica
        </NuxtLink>
      </p>
    </section>

    <FaqSection :items="faqItems" heading="Preguntas frecuentes" :expanded="true" />

    <section class="modelo-section" aria-labelledby="metodo-title">
      <h2 id="metodo-title">De dónde salen estos datos</h2>
      <p class="section-intro">
        Juntamos los avisos de Mercado Libre y de las tiendas que nombran la misma marca y el mismo
        modelo; los que Mercado Libre agrupa en un mismo producto de su catálogo cuentan como el
        mismo modelo. Nunca se une por precio ni por foto, y los avisos de Facebook Marketplace no
        entran: sus títulos no alcanzan para saber qué modelo es. La ficha es lo que declara cada
        vendedor, no una medición nuestra. Se actualiza cada hora.
      </p>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  movilidadMoney,
  movilidadSellerLabel,
  movilidadShortDate,
  movilidadUsd,
} from '~/utils/movilidad'
import { storeSlugForSeller } from '~/utils/storeDirectory'
import {
  MONOPATIN_KWH_UYU,
  monopatinChargeCostUyu,
  type MonopatinSpecsPublic,
} from '~/utils/monopatinFicha'
import {
  MONOPATIN_MODEL_SLUG_RE,
  monopatinOfferGroups,
  type MonopatinModelDetailResponse,
  type MonopatinModelOffer,
  type MonopatinModelSummary,
} from '~/utils/monopatinModelos'
import { BICICLETA_AUTONOMIA_REAL, BICICLETA_CORTE_ASISTENCIA_KMH } from '~/utils/bicicletaAsesor'
import {
  BICICLETA_MODEL_COMPARE_PATH,
  BICICLETA_VARIANT_LABEL,
  bicicletaModelDescription,
  bicicletaModelFaq,
  bicicletaModelTitle,
  bicicletaRealRangeKm,
  bicicletaSpecTableRows,
} from '~/utils/bicicletaModelos'

// Sólo español, como las fichas de monopatín y de alquiler: sin esto Nuxt generaba /en/ y /pt/ con
// el mismo cuerpo en castellano.
defineI18nRoute({ locales: ['es'] })

// 404 real para un slug inventado, ANTES de renderizar: mismo patrón que /celulares-uruguay/[modelo].
// El filtro de forma va primero para no gastar una consulta por cada URL basura.
definePageMeta({
  validate: async route => {
    const slug = String(route.params.modelo ?? '')
    if (!MONOPATIN_MODEL_SLUG_RE.test(slug)) return false
    try {
      await $fetch(`/api/movilidad/modelos/${slug}`, {
        query: { categoria: 'bicicleta-electrica' },
      })
      return true
    } catch {
      return false
    }
  },
})

const route = useRoute()
const localePath = useLocalePath()
const slug = computed(() => String(route.params.modelo ?? ''))

// Server-rendered: el precio y las ofertas tienen que estar en el HTML que recibe el buscador.
const { data, error } = await useFetch<MonopatinModelDetailResponse>(
  () => `/api/movilidad/modelos/${slug.value}`,
  { key: () => `bicicleta-modelo-${slug.value}`, query: { categoria: 'bicicleta-electrica' } }
)
// Red de seguridad: `validate` ya filtró los slugs que no existen; llegar acá sin datos es que el
// catálogo se cayó entre la validación y esta lectura, y un 404 es la respuesta honesta igual.
if (error.value || !data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Modelo no encontrado', fatal: true })
}
const detail = computed(() => data.value!)
const model = computed(() => detail.value.model)
const siblings = computed<MonopatinModelSummary[]>(() => detail.value.siblings ?? [])

const NB = String.fromCharCode(160)
const fmt = (value: number) => value.toLocaleString('es-UY', { maximumFractionDigits: 1 })
const kwhLabel = `$${NB}${MONOPATIN_KWH_UYU.toLocaleString('es-UY', { minimumFractionDigits: 2 })}`

const crumbs = computed(() => [
  { title: 'Inicio', to: localePath('/') },
  { title: 'Bicicletas eléctricas', to: '/bicicletas-electricas-uruguay' },
  { title: model.value.name, disabled: true },
])

const variantLabel = computed(
  () => BICICLETA_VARIANT_LABEL[model.value.variant] ?? 'Bicicleta eléctrica'
)
const sellersLabel = (n: number) => `${n} ${n === 1 ? 'vendedor' : 'vendedores'}`
const updated = computed(() => movilidadShortDate(model.value.generatedAt))

const specsPublic = computed<MonopatinSpecsPublic | null>(() =>
  model.value.specs ? { ...model.value.specs.values, fromFicha: true } : null
)
const specRows = computed(() =>
  model.value.specs ? bicicletaSpecTableRows(model.value.specs) : []
)

// Una fila por vendedor; las demás publicaciones del mismo vendedor quedan en el HTML (v-show) y se
// abren con el botón.
const openRest = ref<string[]>([])
const offerGroups = computed(() => monopatinOfferGroups(model.value.offers))

// El vendedor enlaza a su ficha de tienda sólo cuando esa tienda tiene ficha propia (mismo criterio
// que el hub y las páginas de equipar).
const storeProfileKeys = useStoreProfileKeys()
function storeKeyFor(offer: MonopatinModelOffer): string | null {
  const key = storeSlugForSeller(offer.sellerName)
  return key && storeProfileKeys.value.includes(key) ? key : null
}
const sellerLabel = (offer: MonopatinModelOffer) =>
  movilidadSellerLabel(offer.sellerName, offer.source)

const speed = computed(() => model.value.specs?.values.maxSpeedKmh ?? null)
const over25 = computed(() => (speed.value ?? 0) > BICICLETA_CORTE_ASISTENCIA_KMH)
const speedLabel = computed(() => (speed.value ? `${fmt(speed.value)}${NB}km/h` : ''))

/** Lo que la ficha permite calcular: autonomía real, costo de carga y precio por km. */
const rinde = computed(() => {
  const v = model.value.specs?.values
  const out: Array<{ key: string; head: string; body: string }> = []
  const real = bicicletaRealRangeKm(v?.rangeKm)
  if (v?.rangeKm && real) {
    out.push({
      key: 'real',
      head: `Unos ${real}${NB}km en la calle`,
      body: `de los ${fmt(v.rangeKm)}${NB}km que declara la ficha: el ${Math.round(BICICLETA_AUTONOMIA_REAL * 100)} % con asistencia media y alguna cuesta, la misma regla del asesor.`,
    })
  }
  const cost = monopatinChargeCostUyu(v?.batteryWh)
  if (v?.batteryWh && cost !== null) {
    out.push({
      key: 'carga',
      head: `${movilidadMoney(cost)} por carga completa`,
      body:
        `para su batería de ${fmt(v.batteryWh)}${NB}Wh a ${kwhLabel} el kWh de UTE (tarifa residencial, con la pérdida del cargador)` +
        (real ? `: unos ${movilidadMoney((cost / real) * 100)} cada 100${NB}km reales.` : '.'),
    })
  }
  if (v?.chargeHours) {
    out.push({
      key: 'horas',
      head: `${fmt(v.chargeHours)} horas de carga`,
      body: 'de cero a lleno, según la ficha.',
    })
  }
  const base = model.value.newBand?.min
  if (base && v?.rangeKm) {
    out.push({
      key: 'km',
      head: `${movilidadMoney(base / v.rangeKm)} por km de autonomía`,
      body: 'el precio nuevo más bajo dividido la autonomía declarada, para comparar modelos entre sí.',
    })
  }
  return out
})

function siblingPrice(sibling: MonopatinModelSummary): string {
  const price = sibling.newMin
    ? `nueva desde ${movilidadMoney(sibling.newMin)}`
    : sibling.usedMin
      ? `usada desde ${movilidadMoney(sibling.usedMin)}`
      : ''
  return [price, sellersLabel(sibling.sellers)].filter(Boolean).join(' · ')
}

// Literal y sin localePath: la familia es sólo en español (como las fichas de celulares).
const compareTo = (sibling: MonopatinModelSummary) => ({
  path: BICICLETA_MODEL_COMPARE_PATH,
  query: { m: `${model.value.slug},${sibling.slug}` },
})

const faqItems = computed(() => bicicletaModelFaq(model.value))

// ── SEO ──────────────────────────────────────────────────────────────────
const canonical = computed(
  () => `https://cambio-uruguay.com/bicicletas-electricas-uruguay/${slug.value}`
)
const seoTitle = computed(() => bicicletaModelTitle(model.value))
const description = computed(() => bicicletaModelDescription(model.value))

defineOgImageComponent('Cambio', {
  title: () => model.value.name,
  subtitle: 'Bicicletas eléctricas en Uruguay',
  tag: 'BICICLETAS · PRECIOS',
})

useSeoMeta({
  title: () => `${seoTitle.value} | Cambio Uruguay`,
  description,
  ogTitle: seoTitle,
  ogDescription: description,
  ogType: 'article',
  ogUrl: () => canonical.value,
  twitterCard: 'summary_large_image',
  // Un modelo con un solo vendedor o sin ficha no dice nada que su aviso no diga.
  robots: () => (model.value.indexable ? 'index, follow' : 'noindex, follow'),
})

function productProperties() {
  const v = model.value.specs?.values
  if (!v) return []
  const rows: Array<[string, number | null, string]> = [
    ['Rodado', v.wheelInches, 'INH'],
    ['Autonomía', v.rangeKm, 'KMT'],
    ['Velocidad máxima', v.maxSpeedKmh, 'KMH'],
    ['Potencia del motor', v.motorW, 'WTT'],
    ['Peso', v.weightKg, 'KGM'],
    ['Peso máximo soportado', v.maxLoadKg, 'KGM'],
    ['Tiempo de carga', v.chargeHours, 'HUR'],
  ]
  return rows
    .filter(([, value]) => value !== null)
    .map(([name, value, unitCode]) => ({ '@type': 'PropertyValue', name, value, unitCode }))
}

// FAQPage lo emite FaqSection: no se repite acá. Nunca una calificación: este sitio no mide reseñas.
useHead(() => {
  const newOffers = model.value.offers.filter(offer => offer.condition === 'new')
  const band = model.value.newBand
  const properties = productProperties()
  return {
    link: [{ rel: 'canonical', href: canonical.value }],
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
                  name: 'Inicio',
                  item: 'https://cambio-uruguay.com/',
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Bicicletas eléctricas',
                  item: 'https://cambio-uruguay.com/bicicletas-electricas-uruguay',
                },
                { '@type': 'ListItem', position: 3, name: model.value.name, item: canonical.value },
              ],
            },
            ...(band && newOffers.length
              ? [
                  {
                    '@type': 'Product',
                    name: model.value.name,
                    ...(model.value.image ? { image: model.value.image } : {}),
                    brand: { '@type': 'Brand', name: model.value.brandLabel },
                    ...(properties.length ? { additionalProperty: properties } : {}),
                    offers: {
                      '@type': 'AggregateOffer',
                      priceCurrency: 'UYU',
                      lowPrice: Math.round(band.min),
                      highPrice: Math.round(band.max),
                      offerCount: band.n,
                    },
                  },
                ]
              : []),
          ],
        }),
      },
    ],
  }
})
</script>

<style scoped>
.modelo-page {
  max-width: 1120px;
}
.modelo-page p {
  margin: 12px 0 0;
}
.modelo-hero {
  display: grid;
  grid-template-columns: minmax(0, 280px) minmax(0, 1fr);
  gap: 24px 32px;
  align-items: start;
}
.modelo-hero__media {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  border-radius: 12px;
  background: #fff;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  overflow: hidden;
}
.modelo-hero__media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.modelo-hero__media .v-icon {
  color: rgba(0, 0, 0, 0.4);
}
/* Eyebrow del DESIGN.md: el tipo y cuántos avisos, arriba del nombre. */
.modelo-hero__eyebrow {
  margin: 0 !important;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
}
/* Content Title: el nombre del modelo es contenido, no un rótulo nuestro (DESIGN.md). */
.modelo-hero__title {
  margin: 4px 0 0;
  max-width: 28ch;
  font-size: clamp(1.5rem, 3vw, 2.125rem);
  font-weight: 300;
  line-height: 1.14;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.lead {
  max-width: 64ch;
  font-size: 1.075rem;
}
.price {
  font-variant-numeric: tabular-nums;
}
.modelo-hero__strip {
  margin-top: 16px;
}
.modelo-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
}
.modelo-section {
  margin-top: 40px;
}
.modelo-section h2 {
  margin: 0;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  line-height: 1.25;
}
.section-intro {
  max-width: 70ch;
  font-size: 0.95rem;
  opacity: 0.88;
}
.cat-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
.muted {
  opacity: 0.66;
  font-size: 0.875rem;
}

/* Ofertas */
.offer-group {
  margin-top: 20px;
}
.offer-group h3 {
  margin: 0;
  font-size: 1.05rem;
}
.offer-list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  overflow: hidden;
}
.offer-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px 16px;
  padding: 12px 16px;
}
.offer-row + .offer-row {
  border-top: 1px solid rgba(var(--v-border-color), 0.18);
}
/* Las otras publicaciones de un vendedor que ya tiene fila: un escalón más quietas. */
.offer-row--rest {
  background: rgba(var(--v-theme-on-surface), 0.025);
}
.offer-row__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.offer-row__title {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  overflow-wrap: anywhere;
}
.offer-row__meta {
  font-size: 0.875rem;
  opacity: 0.8;
}
.offer-row__price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.offer-row__price strong {
  font-size: 1.25rem;
  font-weight: 500;
}

/* Ficha */
.spec-table {
  margin-top: 16px;
  max-width: 760px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
}
.spec-table th {
  width: 40%;
  font-weight: 600;
  text-align: left;
}
.spec-table__value {
  font-variant-numeric: tabular-nums;
}
.spec-table__note {
  font-size: 0.8125rem;
  opacity: 0.72;
  text-align: right;
}

/* Rinde */
.facts {
  margin: 16px 0 0;
  padding-left: 20px;
  max-width: 72ch;
}
.facts li + li {
  margin-top: 8px;
}

/* Hermanos */
.siblings {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}
.sibling {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px 12px;
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.sibling__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.sibling .v-btn {
  grid-column: 2;
  justify-self: start;
}

@media (max-width: 700px) {
  .modelo-hero {
    grid-template-columns: minmax(0, 1fr);
  }
  /* En el teléfono el precio tiene que llegar al primer pantallazo: la foto se achica. */
  .modelo-hero__media {
    max-width: 160px;
  }
  .offer-row {
    grid-template-columns: auto minmax(0, 1fr);
  }
  .offer-row__price {
    grid-column: 2;
    align-items: flex-start;
  }
  .spec-table th {
    width: auto;
  }
}
</style>
