<!--
THESIS: Alguien busca "precio iphone uruguay" o "conviene traer celular de estados unidos". Responder
con el precio nuevo de hoy por modelo, comparable entre tiendas y Mercado Libre, y la cuenta completa
de las dos formas de traerlo desde EE.UU. con las reglas de aduana que el sitio ya tiene.
OWN-WORLD: Mismas superficies, tipografía y azul de enlace que /equipar-casa-uruguay y
/sillas-escritorio-uruguay, de las que este hub copia la forma.
FIRST VIEWPORT: Migas, H1, cuántos modelos y vendedores hay y cuándo se leyó, después los filtros.
-->
<template>
  <VContainer class="phones-hub py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: DIRECTORIOS_HUB.label, to: localePath(DIRECTORIOS_HUB.path) },
        { title: 'Celulares' },
      ]"
      class="px-0 mb-2"
    />

    <header class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-2">
        Precio de celulares en Uruguay: iPhone, Samsung, Motorola y Xiaomi
      </h1>
      <p class="text-body-1 lead">
        Comparamos el precio nuevo de cada modelo en tiendas uruguayas y Mercado Libre.
        <template v-if="cards.length">
          Hoy hay {{ cards.length }} {{ cards.length === 1 ? 'modelo' : 'modelos' }} con precio
          vigente de {{ totalSellers }} {{ totalSellers === 1 ? 'vendedor' : 'vendedores'
          }}<template v-if="updatedAt"> , última lectura el {{ updatedAt }}</template
          >.
        </template>
      </p>
    </header>

    <!-- ── Filtros ────────────────────────────────────────────────────────── -->
    <section v-if="cards.length" class="filters mb-6">
      <div class="d-flex flex-wrap ga-2 mb-4">
        <VChip
          size="small"
          :color="selectedBrand === null ? 'primary' : undefined"
          :variant="selectedBrand === null ? 'flat' : 'outlined'"
          @click="selectedBrand = null"
        >
          Todas las marcas
        </VChip>
        <VChip
          v-for="brand in brandOptions"
          :key="brand.value"
          size="small"
          :color="selectedBrand === brand.value ? 'primary' : undefined"
          :variant="selectedBrand === brand.value ? 'flat' : 'outlined'"
          @click="selectedBrand = selectedBrand === brand.value ? null : brand.value"
        >
          {{ brand.label }} ({{ brand.count }})
        </VChip>
      </div>
      <div class="price-filter">
        <label class="price-filter__label" for="phones-max-price">
          Hasta {{ phoneMoney(maxPrice) }}
        </label>
        <VSlider
          id="phones-max-price"
          v-model="maxPrice"
          :min="0"
          :max="priceCeiling"
          :step="1000"
          hide-details
          color="primary"
        />
      </div>
    </section>

    <!-- ── Tarjetas ───────────────────────────────────────────────────────── -->
    <VAlert v-if="!cards.length" type="info" variant="tonal" class="mb-6">
      Todavía no tenemos modelos con precio vigente. La página se completa sola con la próxima
      lectura de tiendas y Mercado Libre.
    </VAlert>
    <template v-else>
      <p class="text-body-2 mb-3">
        {{ visibleCards.length }} de {{ cards.length }} modelos con estos filtros.
      </p>
      <p v-if="!visibleCards.length" class="text-body-1 mb-6">
        Ningún modelo entra en ese rango. Subí el precio máximo o probá otra marca.
      </p>
      <div v-else class="phone-grid mb-10">
        <NuxtLink
          v-for="card in visibleCards"
          :key="card.slug"
          :to="localePath(`/celulares-uruguay/${card.slug}`)"
          class="phone-card"
        >
          <span class="phone-card__media">
            <img
              v-if="card.image"
              :src="card.image"
              :alt="card.name"
              loading="lazy"
              decoding="async"
            />
            <VIcon v-else icon="mdi-cellphone" size="40" />
          </span>
          <span class="phone-card__body">
            <strong class="phone-card__name">{{ card.name }}</strong>
            <span class="phone-card__price">
              desde {{ phoneMoney(card.bestNewUyu) }} nuevo en {{ card.newSellers }}
              {{ card.newSellers === 1 ? 'tienda' : 'tiendas' }}
            </span>
          </span>
        </NuxtLink>
      </div>
    </template>

    <!-- ── ¿Conviene traerlo de EE.UU.? ───────────────────────────────────── -->
    <section class="hub-section" aria-labelledby="traer-eeuu-title">
      <h2 id="traer-eeuu-title">¿Conviene traer el celular de Estados Unidos?</h2>
      <p class="section-intro">
        Hay dos caminos sin ser un importador formal, y ninguno es gratis. Los dos suman, además, el
        certificado URSEC que exige traer un celular al país.
      </p>
      <div class="import-paths">
        <article>
          <h3>En la valija (equipaje de viajero)</h3>
          <p>
            Franquicia de <strong>US$ 500</strong> por vía aérea; sobre lo que exceda se paga
            <strong>50 %</strong> de impuesto, declarado y pagado en el propio Aeropuerto de
            Carrasco. El uso personal está en zona gris: la norma habla de cantidad, naturaleza y
            variedad no comercial, sin una lista cerrada.
            <NuxtLink :to="localePath('/franquicia-viajero-uruguay')" class="cel-link">
              Cómo funciona la franquicia de viajero
            </NuxtLink>
          </p>
        </article>
        <article>
          <h3>Por courier (puerta a puerta)</h3>
          <p>
            Franquicia de <strong>US$ 800 al año</strong>, en hasta 3 envíos. Una compra en EE.UU.
            con factura de hasta <strong>US$ 200</strong> queda exonerada de IVA; por encima de ese
            monto paga IVA sobre el total. Por encima de los US$ 800 el envío no entra en ninguno de
            los dos regímenes y pasa al régimen general, que esta página no calcula.
            <NuxtLink :to="localePath('/franquicia-aduana-uruguay')" class="cel-link">
              Franquicia de courier, con la letra chica
            </NuxtLink>
            ·
            <NuxtLink
              :to="localePath('/herramientas/calculadora-impuestos-importacion')"
              class="cel-link"
            >
              Calculadora de impuestos de importación
            </NuxtLink>
          </p>
        </article>
        <article>
          <h3>Certificado URSEC</h3>
          <p>
            Un celular necesita certificado URSEC para entrar (trámite VUCE, costo de $
            {{ URSEC_CERT_UYU }}), en los dos caminos. Sin el certificado, el envío queda fuera de
            los regímenes postales.
          </p>
        </article>
      </div>

      <template v-if="importRows.length">
        <p class="section-intro">
          Con impuesto de venta de EE.UU. del {{ SALES_TAX_MIAMI_PCT }} % (Miami-Dade, Florida), la
          referencia más común para quien compra ahí. Precios de EE.UU. leídos el
          {{ usPricesVerifiedAtLabel }} en
          <a :href="phoneUsPricesSource" target="_blank" rel="noopener noreferrer" class="cel-link">
            apple.com</a
          >; el mejor precio local es el de esta misma lectura. Las columnas "Traído" ya incluyen el
          certificado URSEC ({{ phoneMoney(URSEC_CERT_UYU) }}) sumado al costo de cada camino.
        </p>
        <div class="table-wrap">
          <VTable class="cu-mobile-cards import-table" density="compact">
            <thead>
              <tr>
                <th scope="col">Modelo</th>
                <th scope="col" class="text-right">Factura EE.UU. (7 %)</th>
                <th scope="col" class="text-right">Traído (viajero)</th>
                <th scope="col" class="text-right">Traído (courier)</th>
                <th scope="col" class="text-right">Mejor precio local</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in importRows" :key="row.card.slug">
                <td data-label="Modelo">
                  <NuxtLink
                    :to="localePath(`/celulares-uruguay/${row.card.slug}`)"
                    class="cel-link"
                  >
                    {{ row.card.name }}
                  </NuxtLink>
                </td>
                <td data-label="Factura EE.UU. (7 %)" class="text-right">
                  {{ phoneUsd(row.estimate.invoiceUsd) }}
                </td>
                <!-- `row.totals` = phoneImportTotals(row.estimate): total del camino + certificado
                     URSEC. `row.estimate.traveler.totalUyu`/`courier.totalUyu` NO lo incluyen (ver
                     el doc comment de phoneImportEstimate) y nunca deben mostrarse como "el total". -->
                <td data-label="Traído (viajero)" class="text-right">
                  {{ phoneMoney(row.totals.travelerTotalUyu) }}
                </td>
                <td data-label="Traído (courier)" class="text-right">
                  <template v-if="row.totals.courierTotalUyu != null">
                    {{ phoneMoney(row.totals.courierTotalUyu) }}
                  </template>
                  <span v-else class="muted">Régimen general (no calculado)</span>
                </td>
                <td data-label="Mejor precio local" class="text-right">
                  {{ phoneMoney(row.card.bestNewUyu) }}
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>
      </template>
    </section>

    <!-- ── Qué mirar al comprar ───────────────────────────────────────────── -->
    <section class="hub-section" aria-labelledby="mirar-title">
      <h2 id="mirar-title">Qué mirar antes de comprar</h2>
      <ul class="guide-list">
        <li>
          <strong>Garantía oficial:</strong> la da el importador autorizado de la marca en Uruguay.
          Un equipo traído o comprado como importado paralelo no tiene ese respaldo acá, aunque haya
          venido nuevo de fábrica.
        </li>
        <li>
          <strong>eSIM:</strong> confirmá con tu compañía (Antel, Movistar, Claro) que soporte eSIM
          antes de comprar un equipo que sólo trae esa opción, sin bandeja física.
        </li>
        <li>
          <strong>Liberado:</strong> un celular liberado funciona con cualquier compañía; uno atado
          a un operador de otro país puede no activarse acá.
        </li>
        <li>
          <strong>Caja abierta:</strong> equipo nuevo de fábrica cuyo empaque se abrió (exhibición o
          una devolución sin uso), a veces sin algún accesorio.
        </li>
        <li>
          <strong>Reacondicionado:</strong> equipo usado, reparado y probado por el vendedor o el
          fabricante. Nunca es lo mismo que nuevo, aunque el precio se le acerque.
        </li>
      </ul>
    </section>

    <FaqSection :items="faq" heading="Preguntas frecuentes" :expanded="true" />
  </VContainer>
</template>

<script setup lang="ts">
import { ADUANA_FAQS } from '~/utils/aduanaFaq'
import { DIRECTORIOS_HUB, directoriosHubListItem } from '~/utils/directorios'
import { dateLocale } from '~/utils/format'
import type { FaqItem } from '~/utils/faqAnswers'
import { phoneImportEstimate, phoneImportTotals } from '~/utils/phoneImport'
import { phoneMoney, phoneUsd, type PhoneHubCard, type PhoneHubResponse } from '~/utils/phones'
import {
  PHONE_US_PRICES,
  PHONE_US_PRICES_SOURCE,
  PHONE_US_PRICES_VERIFIED_AT,
} from '~/utils/phoneUsPrices'

const localePath = useLocalePath()

// Server-rendered: los precios tienen que estar en el HTML que lee el buscador, no llegar después
// por un fetch client-only.
const { data } = await useFetch<PhoneHubResponse>('/api/phones', { key: 'phones-hub' })

interface HubCardWithBrand extends PhoneHubCard {
  brand: string
  brandLabel: string
}

const cards = computed<HubCardWithBrand[]>(() =>
  (data.value?.brands ?? []).flatMap(group =>
    group.models.map(model => ({ ...model, brand: group.brand, brandLabel: group.brandLabel }))
  )
)

const totalSellers = computed(() => cards.value.reduce((sum, card) => sum + card.newSellers, 0))

const brandOptions = computed(() =>
  (data.value?.brands ?? []).map(group => ({
    value: group.brand,
    label: group.brandLabel,
    count: group.models.length,
  }))
)

const selectedBrand = ref<string | null>(null)

const priceCeiling = computed(() => {
  const max = cards.value.reduce((m, card) => Math.max(m, card.bestNewUyu), 0)
  return Math.max(20000, Math.ceil(max / 1000) * 1000)
})
const maxPrice = ref(0)
// El techo llega recién con la respuesta del fetch; arranca ahí en vez de en 0 (que ocultaría
// todo) y sigue al techo mientras nadie haya movido el control a mano.
watch(
  priceCeiling,
  value => {
    if (maxPrice.value === 0 || maxPrice.value >= priceCeiling.value) maxPrice.value = value
  },
  { immediate: true }
)

const visibleCards = computed(() =>
  cards.value.filter(
    card =>
      (selectedBrand.value === null || card.brand === selectedBrand.value) &&
      card.bestNewUyu <= maxPrice.value
  )
)

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value
  const time = Date.parse(iso)
  return Number.isNaN(time) ? null : new Date(time)
}

function longDate(value: string | null | undefined): string {
  const date = toDate(value)
  return date
    ? date.toLocaleDateString(dateLocale('es'), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Montevideo',
      })
    : ''
}

const updatedAt = computed(() => longDate(data.value?.generatedAt))
const usPricesVerifiedAtLabel = computed(() => longDate(PHONE_US_PRICES_VERIFIED_AT))
const phoneUsPricesSource = PHONE_US_PRICES_SOURCE

/** Mismo texto que publica aduanaFaq.ts (ficha `celular-router-drone`), leído con la misma regex que
 *  usa `phoneImport.ts` — así esta cifra nunca queda desincronizada de la fuente. */
const URSEC_CERT_UYU = (() => {
  const faq = ADUANA_FAQS.find(f => f.id === 'celular-router-drone')
  const match = faq?.answer.match(/costo de \$(\d+)/)
  return match ? Number(match[1]) : 239
})()

const SALES_TAX_MIAMI_PCT = 7

// `totals` = `phoneImportTotals(estimate)`: el total de cada camino CON el certificado URSEC ya
// sumado. `estimate.traveler.totalUyu`/`estimate.courier.totalUyu` no lo incluyen a propósito (ver
// el doc comment de `phoneImportEstimate`) y esta tabla nunca debe leerlos directamente — hacerlo
// favorecería sistemáticamente "conviene traerlo" por los $239 del trámite.
const importRows = computed(() => {
  const usdUyu = data.value?.usdUyu || 0
  if (!usdUyu) return []
  return cards.value
    .filter(card => card.slug in PHONE_US_PRICES)
    .map(card => {
      const estimate = phoneImportEstimate({
        usPriceUsd: PHONE_US_PRICES[card.slug]!,
        salesTaxPct: SALES_TAX_MIAMI_PCT,
        usdUyu,
        localBestUyu: card.bestNewUyu,
      })
      return { card, estimate, totals: phoneImportTotals(estimate) }
    })
})

const faq = computed<FaqItem[]>(() => {
  const items: FaqItem[] = [
    {
      id: 'celulares-como-arman-precio',
      question: '¿Cómo arman el precio de cada celular?',
      answer:
        'Juntamos ofertas de tiendas uruguayas y Mercado Libre, las agrupamos por marca, familia y almacenamiento, y publicamos la banda de las ofertas NUEVAS que sobreviven un filtro de precios fuera de lo razonable. Nuevo y usado nunca se promedian: son mercados distintos y cada uno tiene su propia banda.',
    },
    {
      id: 'celulares-conviene-traerlo',
      question: '¿Conviene traer un celular de Estados Unidos?',
      answer:
        'Depende del modelo y de cuánto sale acá. Entra por equipaje de viajero (franquicia de US$ 500, 50 % de impuesto sobre el excedente) o por courier (franquicia de US$ 800 al año en 3 envíos, con IVA si la factura de EE.UU. supera los US$ 200), y en los dos casos hay que sumar el certificado URSEC. La ficha de cada modelo con precio de EE.UU. conocido trae la cuenta completa.',
    },
    {
      id: 'celulares-caja-abierta-reacondicionado',
      question: '¿Qué diferencia hay entre caja abierta y reacondicionado?',
      answer:
        'Caja abierta es un equipo nuevo de fábrica cuyo empaque se abrió, por exhibición o por una devolución sin uso. Reacondicionado es un equipo usado, reparado y probado por el vendedor o el fabricante. Ninguno de los dos es lo mismo que nuevo, aunque el precio se le acerque.',
    },
  ]
  const cheapest = [...cards.value].sort((a, b) => a.bestNewUyu - b.bestNewUyu)[0]
  if (cheapest) {
    items.unshift({
      id: 'celulares-mas-barato',
      question: '¿Cuál es el celular más barato hoy?',
      answer: `Hoy es ${cheapest.name}, desde ${phoneMoney(cheapest.bestNewUyu)} nuevo en ${cheapest.newSellers} ${cheapest.newSellers === 1 ? 'vendedor' : 'vendedores'}.`,
    })
  }
  return items
})

// ── SEO ────────────────────────────────────────────────────────────────────
// Absolutas y literales: nunca con localePath (la ruling del controlador para esta familia). La
// navegación de la página sí usa localePath, arriba.
const CANONICAL = 'https://cambio-uruguay.com/celulares-uruguay'
const TITLE = 'Precio de celulares en Uruguay'
const DESCRIPTION =
  'Precio nuevo de iPhone, Samsung, Motorola y Xiaomi en tiendas uruguayas y Mercado Libre, con la cuenta de si conviene traerlo de Estados Unidos.'

defineOgImageComponent('Cambio', {
  title: TITLE,
  subtitle: 'iPhone, Samsung, Motorola y Xiaomi',
  tag: 'CELULARES · PRECIOS',
})

useSeoMeta({
  title: `${TITLE} | Cambio Uruguay`,
  description: DESCRIPTION,
  ogTitle: TITLE,
  ogDescription: DESCRIPTION,
  ogType: 'website',
  ogUrl: CANONICAL,
  twitterCard: 'summary_large_image',
})

const itemListLd = computed(() =>
  cards.value.slice(0, 40).map((card, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: {
      '@type': 'Product',
      name: card.name,
      url: `https://cambio-uruguay.com/celulares-uruguay/${card.slug}`,
      ...(card.image ? { image: card.image } : {}),
      offers: {
        '@type': 'Offer',
        price: Math.round(card.bestNewUyu),
        priceCurrency: 'UYU',
        url: `https://cambio-uruguay.com/celulares-uruguay/${card.slug}`,
      },
    },
  }))
)

// FAQPage lo emite FaqSection: no se repite acá.
useHead(() => ({
  link: [{ rel: 'canonical', href: CANONICAL }],
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
              directoriosHubListItem(2),
              { '@type': 'ListItem', position: 3, name: 'Celulares', item: CANONICAL },
            ],
          },
          ...(itemListLd.value.length
            ? [
                {
                  '@type': 'ItemList',
                  name: 'Modelos de celulares a la venta en Uruguay',
                  numberOfItems: itemListLd.value.length,
                  itemListElement: itemListLd.value,
                },
              ]
            : []),
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.phones-hub {
  max-width: 1120px;
}
.lead {
  max-width: 68ch;
}
.cel-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
.muted {
  opacity: 0.66;
}

/* Filtros */
.price-filter {
  max-width: 340px;
}
.price-filter__label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 4px;
}

/* Tarjetas */
.phone-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
.phone-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  color: inherit;
  text-decoration: none;
}
.phone-card:hover {
  border-color: rgb(var(--v-theme-link));
}
.phone-card__media {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 4 / 3;
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.phone-card__media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 10px;
}
.phone-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
}
.phone-card__name {
  font-size: 0.95rem;
  line-height: 1.3;
}
.phone-card__price {
  font-size: 0.825rem;
  opacity: 0.85;
}

/* Secciones */
.hub-section {
  margin-top: 40px;
}
.hub-section h2 {
  margin: 0 0 8px;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  line-height: 1.25;
}
.hub-section h3 {
  margin: 0 0 4px;
  font-size: 1.05rem;
}
.section-intro {
  max-width: 72ch;
  font-size: 0.95rem;
  opacity: 0.9;
}
.import-paths {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin: 16px 0;
}
.import-paths article p {
  margin: 0;
  font-size: 0.9rem;
}
.table-wrap {
  overflow-x: auto;
}
.import-table {
  margin-top: 12px;
}
.guide-list {
  max-width: 72ch;
  margin: 12px 0 0;
  padding-left: 22px;
  font-size: 0.95rem;
}
.guide-list li {
  padding: 4px 0;
}
</style>
