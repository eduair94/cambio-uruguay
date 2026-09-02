<template>
  <div class="brand-page">
    <VContainer class="py-6">
      <VBreadcrumbs
        class="px-0 pb-2"
        :items="[
          { title: 'Inicio', to: localePath('/') },
          { title: 'Descuentos con tarjeta', to: localePath('/descuentos-con-tarjeta-uruguay') },
          { title: detail.name, disabled: true },
        ]"
      />

      <h1 class="text-h5 text-md-h4 font-weight-bold mb-2">
        Descuentos en {{ detail.name }} con tarjeta
      </h1>

      <p class="text-body-1 text-medium-emphasis mb-4" style="max-width: 68ch">
        {{ intro }}
      </p>

      <!-- El veredicto. Es lo primero porque es la única pregunta que trae a alguien acá: si la
           tarjeta que tengo en el bolsillo sirve en esta marca. Client-only: la selección vive en
           localStorage y en el servidor no existe. -->
      <ClientOnly>
        <VAlert
          v-if="myCards.length"
          :type="myOffers.length ? 'success' : 'info'"
          variant="tonal"
          class="mb-5"
          density="comfortable"
        >
          <div class="text-subtitle-1 font-weight-bold mb-1">
            {{
              myOffers.length
                ? `Sí: tenés descuento en ${detail.name}`
                : `Con tus tarjetas no hay descuento en ${detail.name}`
            }}
          </div>
          <div v-if="myOffers.length" class="text-body-2">
            <div v-for="offer in myOffers" :key="offer.bankId" class="mb-1">
              <strong>{{ offer.bankName }}</strong>
              <span v-if="offer.credit"> · crédito: {{ offer.credit }}</span>
              <span v-if="offer.debit"> · débito: {{ offer.debit }}</span>
              <span v-if="dayLabel(offer.days)" class="text-medium-emphasis">
                ({{ dayLabel(offer.days) }})</span
              >
            </div>
          </div>
          <div v-else-if="detail.offers.length" class="text-body-2">
            Sí lo dan
            {{ detail.offers.map(o => o.bankName).join(', ') }}. Si tenés alguna de esas, agregala
            arriba en el mapa.
          </div>
          <NuxtLink :to="localePath('/descuentos-con-tarjeta-uruguay')" class="cu-link text-body-2">
            Cambiar mis tarjetas
          </NuxtLink>
        </VAlert>
        <VAlert v-else type="info" variant="tonal" class="mb-5" density="comfortable">
          <span class="text-body-2">
            Elegí tus tarjetas en
            <NuxtLink :to="localePath('/descuentos-con-tarjeta-uruguay')" class="cu-link">
              el mapa de descuentos</NuxtLink
            >
            y esta página te dice de una si tenés descuento acá.
          </span>
        </VAlert>
      </ClientOnly>

      <!-- Quién lo da y cuánto. El texto va TAL CUAL lo publica el emisor: "hasta 30% Off" y
           "30% de descuento" no son lo mismo y no hay regex que sepa la diferencia. -->
      <h2 class="text-h6 font-weight-bold mb-2">Qué emisor da descuento en {{ detail.name }}</h2>
      <div class="table-wrap mb-6">
        <VTable density="comfortable" class="cu-mobile-cards">
          <thead>
            <tr>
              <th>Emisor</th>
              <th>Con crédito</th>
              <th>Con débito</th>
              <th>Días</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="offer in detail.offers" :key="offer.bankId">
              <td data-label="Emisor">
                <span class="bank-dot" :style="{ background: offer.color }" aria-hidden="true" />
                <NuxtLink :to="bankHref(offer.bankId)" class="cu-link font-weight-medium">
                  {{ offer.bankName }}
                </NuxtLink>
              </td>
              <td data-label="Con crédito">{{ offer.credit || '—' }}</td>
              <td data-label="Con débito">{{ offer.debit || '—' }}</td>
              <td data-label="Días">{{ dayLabel(offer.days) || 'Todos los días' }}</td>
            </tr>
          </tbody>
        </VTable>
      </div>

      <template v-if="detail.points.length">
        <h2 class="text-h6 font-weight-bold mb-1">Dónde están los locales de {{ detail.name }}</h2>
        <p class="text-body-2 text-medium-emphasis mb-3">
          {{ detail.points.length }}
          {{ detail.points.length === 1 ? 'local en el mapa' : 'locales en el mapa' }} de Uruguay.
          El catálogo publica la ubicación, no la dirección postal: tocá un punto y abrí "Cómo
          llegar".
        </p>
        <!-- El mapa se pide sólo cuando el visitante llega hasta acá: Leaflet no tiene por qué
             pesar en el primer pintado de una página que se lee. -->
        <ClientOnly>
          <LocationsMap
            v-if="branches.length"
            :branches="branches"
            height="52vh"
            :zoom="detail.points.length > 20 ? 7 : 11"
            :center="mapCenter"
            class="mb-6"
          />
          <template #fallback>
            <VSkeletonLoader type="image" height="52vh" class="mb-6" />
          </template>
        </ClientOnly>
      </template>

      <template v-if="detail.siblings.length">
        <h2 class="text-h6 font-weight-bold mb-2">
          Otras marcas con descuento en {{ primaryCategory }}
        </h2>
        <div class="d-flex flex-wrap ga-2 mb-6">
          <NuxtLink
            v-for="sib in detail.siblings"
            :key="sib.slug"
            :to="localePath(`/descuentos-con-tarjeta-uruguay/marca/${sib.slug}`)"
            class="sibling-chip"
          >
            {{ sib.name }}
          </NuxtLink>
        </div>
      </template>

      <h2 class="text-h6 font-weight-bold mb-2">Seguir buscando</h2>
      <div class="d-flex flex-wrap ga-3 mb-6">
        <NuxtLink :to="localePath('/descuentos-con-tarjeta-uruguay')" class="cu-link">
          Mapa de descuentos con tus tarjetas
        </NuxtLink>
        <NuxtLink v-if="categoryHref" :to="categoryHref" class="cu-link">
          Todos los descuentos en {{ primaryCategory }}
        </NuxtLink>
        <NuxtLink :to="localePath('/que-banco-tiene-mas-descuentos-uruguay')" class="cu-link">
          Qué banco tiene más descuentos
        </NuxtLink>
      </div>

      <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

      <p class="text-caption text-medium-emphasis mt-6">
        Datos del catálogo público de descuentos, leídos
        {{ detail.source === 'snapshot' ? 'de la última copia guardada' : 'en vivo' }}. El texto de
        cada beneficio es el que publica el emisor; las condiciones las fija él y pueden cambiar sin
        aviso.
      </p>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { dayRestrictionLabel, BANKOS_CARDS } from '~/utils/bankos'
import { BANKOS_BANK_PAGES, categoryPageForCategory } from '~/utils/bankosPages'
import type { FaqItem } from '~/utils/faqAnswers'
import { useBankosCardsStore } from '~/stores/bankosCards'

interface BrandOfferDetail {
  bankId: string
  bankName: string
  color: string
  credit: string | null
  debit: string | null
  days: number[] | null
}
interface BrandDetail {
  slug: string
  brandId: string
  name: string
  categories: string[]
  locations: number
  rationale: string
  offers: BrandOfferDetail[]
  points: { locationId: string; lat: number; lng: number; rating: number | null }[]
  siblings: { slug: string; name: string; locations: number; issuers: number }[]
  source: string
  generatedAt: string | null
}

// Explícito y perezoso: components/map/ no está en el namespace plano de auto-imports (un
// `<LocationsMap>` suelto renderizaría como elemento desconocido, en silencio), y Leaflet no tiene
// por qué entrar en el primer pintado de una página que se lee.
const LocationsMap = defineAsyncComponent(() => import('~/components/map/LocationsMap.vue'))

const route = useRoute()
const localePath = useLocalePath()
const slug = computed(() => String(route.params.marca ?? ''))

// `useFetch` y no `useLazyAsyncData`: el contenido de esta página TIENE que estar en el HTML que
// recibe el buscador. El hub del mapa hace lo contrario y por eso su HTML servido no contiene el
// nombre de una sola marca.
const { data, error } = await useFetch<BrandDetail>(() => `/api/bankos/marca/${slug.value}`, {
  key: `bankos-marca-${slug.value}`,
})

// Una marca que no está en el catálogo deja de existir como URL. Tiene que ser un 404 DE VERDAD:
// sin `fatal`, la primera versión servía 200 con la plantilla vacía para cualquier slug inventado
// — verificado en producción, /marca/no-existe-esta-marca devolvía 200 y 220 KB con el título por
// defecto del sitio. Eso es una fábrica de soft-404: un slug cualquiera es una página indexable.
// También se mira `error`, porque useFetch no lanza: deja el error en su propio ref.
if (error.value || !data.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Marca sin descuentos publicados',
    fatal: true,
  })
}
const detail = computed(() => data.value as BrandDetail)

const primaryCategory = computed(() => detail.value.categories[0] || 'esta categoría')

const intro = computed(() => {
  const d = detail.value
  const issuers = d.offers.map(o => o.bankName)
  const who =
    issuers.length === 1
      ? `${issuers[0]} publica un beneficio`
      : `${issuers.slice(0, -1).join(', ')} y ${issuers[issuers.length - 1]} publican beneficios`
  const where =
    d.locations === 1
      ? 'en su único local del mapa'
      : `en sus ${d.locations} locales del mapa de Uruguay`
  return `${who} ${where}. Abajo está el texto exacto de cada emisor, con qué medio de pago aplica y en qué días.`
})

const cardsStore = useBankosCardsStore()
const myCards = computed(() => cardsStore.cards)
/** Emisores de la marca para los que el visitante tiene alguna tarjeta guardada. */
const myBankIds = computed(
  () => new Set(BANKOS_CARDS.filter(c => myCards.value.includes(c.id)).map(c => c.bankId))
)
const myOffers = computed(() => detail.value.offers.filter(o => myBankIds.value.has(o.bankId)))

const dayLabel = (days: number[] | null) => dayRestrictionLabel(days)

const bankHref = (bankId: string) => {
  const page = BANKOS_BANK_PAGES.find(p => p.bankId === bankId)
  return localePath(
    page
      ? `/descuentos-con-tarjeta-uruguay/${page.slug}`
      : `/descuentos-con-tarjeta-uruguay?banco=${bankId}`
  )
}

const categoryHref = computed(() => {
  const page = categoryPageForCategory(detail.value.categories[0] || '')
  return page ? localePath(`/descuentos-con-tarjeta-uruguay/rubro/${page.slug}`) : null
})

/** Los puntos, en la forma que espera el mapa compartido. Sin dirección: el catálogo no la trae. */
const branches = computed(() =>
  detail.value.points.map(p => ({
    origin: detail.value.brandId,
    id: p.locationId,
    name: detail.value.name,
    dept: '',
    locality: '',
    address: '',
    phone: '',
    hours: '',
    lat: p.lat,
    lng: p.lng,
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`,
    source: 'bankos',
  }))
)

/** Centro en la media de los puntos: una cadena de Maldonado no se ve bien centrada en Montevideo. */
const mapCenter = computed<[number, number]>(() => {
  const pts = detail.value.points
  if (!pts.length) return [-34.9011, -56.1645]
  const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length
  const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length
  return [lat, lng]
})

const faq = computed<FaqItem[]>(() => {
  const d = detail.value
  const issuers = d.offers.map(o => o.bankName).join(', ')
  const items: FaqItem[] = [
    {
      question: `¿Qué tarjeta tiene descuento en ${d.name}?`,
      answer: `Según el catálogo público de descuentos, ${issuers}. El texto de cada beneficio, el medio de pago con el que aplica y los días están en la tabla de esta página.`,
    },
    {
      question: `¿El descuento en ${d.name} aplica con débito?`,
      answer: d.offers.some(o => o.debit)
        ? `Sí, al menos ${d.offers
            .filter(o => o.debit)
            .map(o => o.bankName)
            .join(
              ' y '
            )} publica un beneficio con débito. Los emisores que sólo aparecen en la columna de crédito no lo dan con débito.`
        : `No. Los emisores que descuentan en ${d.name} publican el beneficio sólo con tarjeta de crédito.`,
    },
  ]
  if (d.locations > 1) {
    items.push({
      question: `¿En qué locales de ${d.name} aplica?`,
      answer: `El catálogo marca ${d.locations} locales. Están en el mapa de esta página; el emisor puede excluir alguno, así que conviene confirmarlo en la caja antes de pagar.`,
    })
  }
  return items
})

const title = computed(() => `Descuentos en ${detail.value.name} con tarjeta | Cambio Uruguay`)
const description = computed(() => {
  const d = detail.value
  const issuers = d.offers.map(o => o.bankName).join(', ')
  return `Qué tarjetas tienen descuento en ${d.name}: ${issuers}. Texto del beneficio, si aplica con débito, días y mapa de los locales.`
})
const canonical = computed(
  () => `https://cambio-uruguay.com/descuentos-con-tarjeta-uruguay/marca/${detail.value.slug}`
)

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonical,
  twitterCard: 'summary_large_image',
})

// Sin `Offer`: el catálogo publica una FRASE ("hasta 30% Off"), no un precio ni una vigencia, y
// marcar una oferta sin `price` ni `validThrough` es justo lo que la documentación de resultados
// enriquecidos desaconseja. Migas y FAQ, que sí se pueden llenar con lo que hay.
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Descuentos con tarjeta',
            item: 'https://cambio-uruguay.com/descuentos-con-tarjeta-uruguay',
          },
          { '@type': 'ListItem', position: 2, name: detail.value.name, item: canonical.value },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.table-wrap {
  overflow-x: auto;
}
.bank-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
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
.sibling-chip {
  display: inline-block;
  padding: 4px 12px;
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: 999px;
  font-size: 0.875rem;
  color: rgb(var(--v-theme-link));
  text-decoration: none;
}
.sibling-chip:hover {
  border-color: rgb(var(--v-theme-link));
}
</style>
