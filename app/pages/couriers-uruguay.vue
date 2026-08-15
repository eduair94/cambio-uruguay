<template>
  <div class="couriers-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3">
      <VBtn :to="localePath('/herramientas')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Herramientas
      </VBtn>
    </div>

    <!-- Header -->
    <VCard class="overflow-hidden mb-4" elevation="8">
      <div class="bg-gradient-couriers pa-6 on-dark">
        <div class="d-flex align-center ga-4 flex-wrap">
          <VAvatar size="56" class="d-none d-md-flex bg-white">
            <VIcon size="32" color="primary">mdi-truck-fast-outline</VIcon>
          </VAvatar>
          <div>
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
              Couriers para comprar en el exterior desde Uruguay
            </h1>
            <p class="text-body-1 text-grey-lighten-2 mb-0 couriers-intro">
              Comparativa de los principales couriers puerta a puerta (Miami → Uruguay): tarifa de
              referencia por kilo, cargo de manejo y demora. Valores verificados el
              {{ ratesVerifiedLabel }}.
            </p>
          </div>
        </div>
        <div class="d-flex justify-start justify-md-end mt-3">
          <ShareButtons text="Couriers para comprar en el exterior desde Uruguay" />
        </div>
      </div>
    </VCard>

    <!-- How it ties to the import calculator -->
    <VAlert
      type="info"
      variant="tonal"
      density="comfortable"
      class="mb-4"
      icon="mdi-information-outline"
    >
      <p class="mb-1">
        El flete que te cobra el courier <strong>no integra la factura de compra</strong>: en el
        régimen postal el impuesto se calcula sobre el total de la factura original, con todos los
        conceptos que figuren adicionados en ella —el envío que te cobra el vendedor, incluido—.
        Fuera del régimen postal es al revés: ahí la base del IVA es el valor en aduana (el CIF, que
        sí incluye flete y seguro) más el arancel, y si el que importa es un particular esa suma se
        incrementa un 50% (Título 10 del T.O. 2023, art. 13 lit. B).
      </p>
      <p class="mb-0">
        Y ojo con los paquetes chicos: aun usando la franquicia, el IVA de un envío postal
        <strong>no puede ser inferior a US$ 20 por envío</strong> (Título 10 del T.O. 2023, art. 13
        lit. B, inciso agregado por la Ley 20.446 art. 660), salvo que el envío esté integrado
        exclusivamente por bienes exonerados. En la práctica ese piso muerde en toda compra de menos
        de US$ 90,91 a la tasa del 22%. Ni el MEF ni la DNA lo mencionan en sus preguntas frecuentes
        de franquicia: solo lo citan para el 60%.
        <NuxtLink
          :to="localePath('/herramientas/calculadora-impuestos-importacion')"
          class="couriers-link"
        >
          Estimá los impuestos de tu compra
        </NuxtLink>
        antes de comprar.
      </p>
    </VAlert>

    <!-- Comparison -->
    <VCard class="couriers-card pa-4 pa-sm-6">
      <h2 class="text-h6 font-weight-bold mb-1">Comparativa de couriers (puerta a puerta)</h2>
      <p class="text-caption text-grey-lighten-1 mb-4">
        Los couriers cobran por escalas de peso; el valor por kg es la escala de paquete chico.
        Donde figura «Consultar», el courier cotiza desde su propio sitio. Mirá las notas y el sitio
        oficial para el detalle por tramo.
        <template v-if="updatedLabel">
          <br /><strong>Tarifas actualizadas automáticamente el {{ updatedLabel }}.</strong>
        </template>
      </p>

      <!-- Desktop: table -->
      <div class="d-none d-md-block">
        <VTable density="comfortable" class="couriers-table cu-mobile-cards">
          <thead>
            <tr>
              <th>Courier</th>
              <th>Modalidad</th>
              <th class="text-right">US$/kg (ref.)</th>
              <th class="text-right">Cargo fijo</th>
              <th>Demora</th>
              <th>Reputación</th>
              <th>Sitio</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in couriers" :key="c.id">
              <td class="font-weight-medium" data-label="">{{ c.name }}</td>
              <td class="text-grey-lighten-1" data-label="Modalidad">{{ c.modality }}</td>
              <td class="text-right" data-label="US$/kg (ref.)">{{ rateLabel(c.perKgUsd) }}</td>
              <td class="text-right" data-label="Cargo fijo">{{ rateLabel(c.baseUsd) }}</td>
              <td class="text-grey-lighten-1" data-label="Demora">{{ c.transit ?? '—' }}</td>
              <td data-label="Reputación">
                <template v-if="c.rating != null">
                  <span
                    class="courier-stars"
                    role="img"
                    :aria-label="`${c.rating} de 5 según reseñas`"
                  >
                    <VIcon
                      v-for="n in starParts(c.rating).full"
                      :key="`f${n}`"
                      size="14"
                      color="amber"
                      >mdi-star</VIcon
                    >
                    <!-- eslint-disable-next-line vue/max-attributes-per-line -->
                    <VIcon v-if="starParts(c.rating).half" size="14" color="amber"
                      >mdi-star-half-full</VIcon
                    >
                    <VIcon
                      v-for="n in starParts(c.rating).empty"
                      :key="`e${n}`"
                      size="14"
                      color="grey"
                      >mdi-star-outline</VIcon
                    >
                  </span>
                  <small class="d-block text-grey-lighten-1">según reseñas</small>
                </template>
                <template v-else>—</template>
              </td>
              <td data-label="Sitio">
                <a :href="c.source" target="_blank" rel="noopener noreferrer" class="couriers-link">
                  {{ hostOf(c.website) }}
                </a>
              </td>
            </tr>
          </tbody>
        </VTable>
        <ul class="couriers-notes mt-3">
          <li v-for="c in couriers" :key="c.id">
            <strong>{{ c.name }}:</strong> {{ c.note }}
          </li>
        </ul>
      </div>

      <!-- Mobile: stacked cards -->
      <div class="d-md-none">
        <div v-for="c in couriers" :key="c.id" class="courier-card">
          <div class="d-flex align-center justify-space-between ga-2 mb-1">
            <span class="text-subtitle-1 font-weight-bold">{{ c.name }}</span>
            <span class="courier-rate">
              {{ rateLabel(c.perKgUsd) }}<small v-if="c.perKgUsd != null">/kg</small>
            </span>
          </div>
          <div class="text-caption text-grey-lighten-1 mb-2">{{ c.modality }}</div>
          <dl class="courier-specs">
            <div>
              <dt>Cargo fijo</dt>
              <dd>{{ rateLabel(c.baseUsd) }}</dd>
            </div>
            <div>
              <dt>Demora</dt>
              <dd>{{ c.transit ?? '—' }}</dd>
            </div>
          </dl>
          <p v-if="c.note" class="text-caption text-grey-lighten-1 mb-2">{{ c.note }}</p>
          <div v-if="c.rating != null" class="mb-2">
            <span class="courier-stars" role="img" :aria-label="`${c.rating} de 5 según reseñas`">
              <!-- eslint-disable vue/max-attributes-per-line -->
              <VIcon v-for="n in starParts(c.rating).full" :key="`f${n}`" size="14" color="amber"
                >mdi-star</VIcon
              >
              <VIcon v-if="starParts(c.rating).half" size="14" color="amber"
                >mdi-star-half-full</VIcon
              >
              <VIcon v-for="n in starParts(c.rating).empty" :key="`e${n}`" size="14" color="grey"
                >mdi-star-outline</VIcon
              >
              <!-- eslint-enable vue/max-attributes-per-line -->
            </span>
            <small class="text-grey-lighten-1 ml-1">según reseñas</small>
            <p v-if="c.reviewsNote" class="text-caption text-grey-lighten-1 mb-0 mt-1">
              {{ c.reviewsNote }}
            </p>
          </div>
          <a
            :href="c.source"
            target="_blank"
            rel="noopener noreferrer"
            class="couriers-link text-caption"
          >
            {{ hostOf(c.website) }}
          </a>
        </div>
      </div>
    </VCard>

    <!-- What the "+10% ..." in the notes above actually is. The notes named it and nothing
         expanded it, so a reader met an acronym and no tax. -->
    <VAlert
      type="info"
      variant="tonal"
      density="comfortable"
      class="mt-4"
      icon="mdi-receipt-text-outline"
    >
      <p class="mb-1">
        <strong>
          El «+{{ POSTAL_SURCHARGE.ratePct }}% {{ POSTAL_SURCHARGE.label }}» de las notas es un solo
          tributo.
        </strong>
        Es la {{ POSTAL_SURCHARGE.name }}: {{ POSTAL_SURCHARGE.ratePct }}% sobre
        {{ POSTAL_SURCHARGE.base }}. {{ POSTAL_SURCHARGE.summary }}
      </p>
      <p class="mb-0">
        En la factura cada courier la escribe distinto —{{ surchargeAliases }}—, pero es el mismo
        cargo, no varios.
        <NuxtLink :to="localePath(POSTAL_SURCHARGE.faqPath)" class="couriers-link">
          Cómo se calcula y cómo controlarla en la factura </NuxtLink
        >. Fuente: {{ POSTAL_SURCHARGE.source }}.
      </p>
    </VAlert>

    <!-- Correo Uruguayo: the postal channel most guides forget -->
    <VCard variant="flat" class="couriers-section mt-6 pa-5">
      <h2 class="text-subtitle-1 font-weight-bold mb-2">¿Y si llega por el Correo Uruguayo?</h2>
      <p class="text-body-2 text-grey-lighten-1 mb-3">
        No todo llega por un courier privado. El envío estándar o gratis de AliExpress, Shein, Temu
        y el correo común de Etsy o eBay entra como <strong>envío postal</strong> y te lo entrega el
        Correo Uruguayo. Puede ser <strong>exprés</strong> (los EMS y Casilla Mía, con seguimiento
        que empieza con E) o <strong>no exprés</strong> (las modalidades PP y SIMPLE, seguimiento de
        dos letras + nueve números + dos letras, tipo RJ284204981CN). Ahí la declaración la hacés
        vos en la web del Correo, no la gestiona un courier.
      </p>
      <p class="text-body-2 text-grey-lighten-1 mb-0">
        Buena noticia: desde mayo de 2026 <strong>da igual el canal</strong> para el impuesto. El
        Decreto 50/026 regula por igual a los operadores postales públicos y privados, así que el
        tope anual de US$ 800 y el régimen del 60% son los mismos para el Correo y para cualquier
        courier. Cuidado, eso sí:
        <NuxtLink :to="localePath('/franquicia-aduana-uruguay')" class="couriers-link">
          la página del Correo para declarar todavía publica un tope viejo de US$ 50 por envío no
          exprés </NuxtLink
        >, derogado desde el 1.º de mayo de 2026.
        <NuxtLink :to="localePath('/declarar-compra-exterior-uruguay')" class="couriers-link ml-1">
          Ver cómo declarar el paquete paso a paso.
        </NuxtLink>
      </p>
    </VCard>

    <!-- Other options -->
    <VCard variant="flat" class="couriers-section mt-6 pa-5">
      <h2 class="text-subtitle-1 font-weight-bold mb-3">Otras opciones</h2>
      <ul class="couriers-other">
        <li v-for="o in otherOptions" :key="o.name">
          <a :href="o.url" target="_blank" rel="noopener noreferrer" class="couriers-link">{{
            o.name
          }}</a>
          — {{ o.note }}
        </li>
      </ul>
    </VCard>

    <!-- Seguí leyendo: this page used to dead-end into just the calculator -->
    <VCard variant="flat" class="couriers-section mt-6 pa-5">
      <h2 class="text-subtitle-1 font-weight-bold mb-3">Seguí leyendo</h2>
      <div class="d-flex flex-wrap ga-2">
        <VChip
          v-for="link in relatedPages"
          :key="link.to"
          :to="localePath(link.to)"
          color="primary"
          variant="tonal"
          size="small"
          link
        >
          <VIcon start size="small">{{ link.icon }}</VIcon>
          {{ link.label }}
        </VChip>
      </div>
    </VCard>

    <!-- Disclaimer -->
    <VAlert
      type="warning"
      variant="tonal"
      density="comfortable"
      class="mt-4"
      icon="mdi-alert-outline"
    >
      Las tarifas son <strong>de referencia</strong>, verificadas el {{ ratesVerifiedLabel }} a
      partir de los sitios oficiales de cada courier, y cambian con frecuencia. El precio por kilo
      no incluye el costo de despacho aduanero ni el {{ POSTAL_SURCHARGE.ratePct }}% de
      {{ POSTAL_SURCHARGE.label }}, que varios couriers suman aparte (mirá las notas de cada uno).
      Confirmá el precio exacto con tu courier antes de comprar. No es asesoramiento profesional. No
      tenemos afiliación con los couriers listados.
    </VAlert>

    <!-- Sources -->
    <VCard variant="flat" class="couriers-section mt-4 pa-5">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Fuentes y referencias
      </h2>
      <ul class="couriers-sources">
        <li v-for="(src, i) in sources" :key="'o' + i">
          <a :href="src.url" target="_blank" rel="noopener noreferrer">{{ src.label }}</a>
        </li>
        <li v-for="(src, i) in reviewSourcesList" :key="'r' + i">
          <a :href="src.url" target="_blank" rel="noopener noreferrer">{{ src.label }}</a>
        </li>
      </ul>
    </VCard>

    <!-- CTA -->
    <VCard class="cta-couriers mt-6 pa-6 text-center" variant="flat">
      <h2 class="text-h6 font-weight-bold mb-2 text-white">¿Cuánto vas a pagar de impuestos?</h2>
      <p class="text-body-2 text-grey-lighten-1 mb-4">
        Usá la calculadora de impuestos de importación: franquicia anual de US$ 800, el IVA con su
        mínimo de US$ 20 por envío y el flete del courier por separado.
      </p>
      <VBtn
        :to="localePath('/herramientas/calculadora-impuestos-importacion')"
        color="primary"
        variant="elevated"
        class="cta-btn"
      >
        <VIcon start>mdi-calculator</VIcon>
        Calcular impuestos de importación
      </VBtn>
    </VCard>
  </div>
</template>

<script setup lang="ts">
import {
  COURIER_RATES_VERIFIED_AT,
  COURIERS,
  POSTAL_SURCHARGE,
  type Courier,
} from '~/utils/courierShipping'
import { starParts } from '~/utils/reviews'

const localePath = useLocalePath()

// POSTAL_SURCHARGE is rendered straight into the template on purpose: the page must not own a
// second name for the 10%. Its disclaimer said "TSPU" while all seven notes said "TFSPU", so one
// tax read as two — and there is no sigla worth hardcoding here, only the module's.
/** «TSPU», «postal» o «URSEC» — the words the reader's own invoice uses, in one readable list. */
const surchargeAliases = computed(() => {
  const quoted = POSTAL_SURCHARGE.aliases.map(alias => `«${alias}»`)
  if (quoted.length < 2) return quoted.join('')
  return `${quoted.slice(0, -1).join(', ')} o ${quoted.at(-1)}`
})

/** dd/mm/yyyy for the seed-rate verification date, rendered from the constant, never retyped. */
const ratesVerifiedLabel = (() => {
  const [yyyy, mm, dd] = COURIER_RATES_VERIFIED_AT.split('-')
  return `${dd}/${mm}/${yyyy}`
})()

// Live data: the catalogue with daily-scraped rates layered on top. Falls back to the static
// seed (and SSRs from it) so the page renders even before the first scrape.
type ApiCourier = Courier & { scrapedAt?: string }
const { data: couriersData } = await useFetch<{ couriers: ApiCourier[]; updatedAt: string | null }>(
  '/api/couriers',
  { default: () => ({ couriers: COURIERS as ApiCourier[], updatedAt: null }) }
)
const couriers = computed<ApiCourier[]>(
  () => couriersData.value?.couriers ?? (COURIERS as ApiCourier[])
)
const updatedAt = computed(() => couriersData.value?.updatedAt ?? null)

/** Human date (es-UY) for the "actualizado" label. */
const updatedLabel = computed(() =>
  updatedAt.value
    ? new Date(updatedAt.value).toLocaleDateString('es-UY', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null
)

/** Format a USD amount with Uruguayan locale (comma decimals, no trailing zeros). */
function fmt(n: number): string {
  return n.toLocaleString('es-UY', { maximumFractionDigits: 2 })
}

/** A rate cell: `US$ X` for published rates, `Consultar` when the courier only quotes online. */
function rateLabel(n: number | null): string {
  return n == null ? 'Consultar' : `US$ ${fmt(n)}`
}

/** Bare host (without scheme / www) for compact source links. */
function hostOf(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
}

// Internal destinations a courier reader needs next — this page used to link out to nothing but
// the calculator, a near dead-end at the exact moment someone is about to buy.
const relatedPages = [
  {
    label: 'Calculadora de impuestos de importación',
    to: '/herramientas/calculadora-impuestos-importacion',
    icon: 'mdi-calculator',
  },
  {
    label: 'Carrito de importación',
    to: '/herramientas/carrito-importacion',
    icon: 'mdi-cart-outline',
  },
  {
    label: 'Franquicia y aduana: ¿pagás IVA?',
    to: '/franquicia-aduana-uruguay',
    icon: 'mdi-scale-balance',
  },
  {
    label: 'Problemas con la aduana',
    to: '/problemas-con-la-aduana-uruguay',
    icon: 'mdi-package-variant-closed-remove',
  },
  {
    label: 'Cómo importar de AliExpress',
    to: '/guias/importar-de-aliexpress-a-uruguay',
    icon: 'mdi-cart-arrow-down',
  },
]

// Broader landscape, linked but not part of the per-kg estimator.
const otherOptions = [
  {
    name: 'Correo Uruguayo',
    url: 'https://www.correo.com.uy/tarifas',
    note: 'Operador postal oficial; tarifas oficiales y gestión del despacho ante Aduanas.',
  },
  {
    name: 'Logistika.US',
    url: 'https://logistika.us/puerta-a-puerta/',
    note: 'Aéreo puerta a puerta desde US$ 130 más por libra adicional; incluye seguro.',
  },
  {
    name: 'Tiendamia',
    url: 'https://tiendamia.com.uy',
    note: 'Marketplace (Amazon, eBay, Walmart) con envío y, en general, impuestos incluidos.',
  },
  {
    name: 'DHL / UPS / FedEx',
    url: 'https://www.dhl.com/uy-es/home/express.html',
    note: 'Couriers express internacionales; tarifa por cotización según peso y volumen.',
  },
]

// Deduplicated review sources across all couriers
const reviewSourcesList = computed(() => {
  const seen = new Set<string>()
  const out: Array<{ label: string; url: string }> = []
  for (const c of couriers.value) {
    for (const rs of c.reviewSources ?? []) {
      if (!seen.has(rs.url)) {
        seen.add(rs.url)
        out.push(rs)
      }
    }
  }
  return out
})

const sources = [
  {
    label: 'Dirección Nacional de Aduanas — Nuevo régimen de franquicias (mayo 2026)',
    url: 'https://www.aduanas.gub.uy/innovaportal/v/28455/1/innova.front/desde-el-1%C2%BA-de-mayo-comienza-a-regir-el-nuevo-regimen-de-franquicias-de-envios-postales-internacionales.html',
  },
  {
    label: 'MEF — Preguntas frecuentes sobre el régimen de envíos postales (franquicias)',
    url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/guia-preguntas-frecuentes-sobre-regimen-envios-postales-franquicias',
  },
  { label: 'Gripper — Tarifas', url: 'https://www.gripper.com.uy/tarifas' },
  {
    label: 'Envía Mi Compra — Servicios y tarifas',
    url: 'https://www.enviamicompra.com.uy/servicios-tarifas',
  },
  { label: 'Casilla Mía — Tarifas', url: 'https://www.casillamia.uy/Tarifas' },
  { label: 'Punto Mío', url: 'https://www.puntomio.uy' },
  { label: 'Correo Uruguayo — Tarifas', url: 'https://www.correo.com.uy/tarifas' },
  {
    label: 'Correo Uruguayo — Paquetes internacionales (pequeño paquete, EMS, encomienda)',
    url: 'https://www.correo.com.uy/paquetes-internacionales',
  },
  {
    label: 'Correo Uruguayo — Cómo declarar su compra u obsequio (envíos no exprés y EMS)',
    url: 'https://www.correo.com.uy/como-declarar-su-compra-u-obsequio',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/couriers-uruguay'
const title = 'Couriers para comprar en el exterior desde Uruguay (comparativa 2026)'
const description =
  'Comparativa de couriers puerta a puerta de Miami a Uruguay: precio de referencia por kilo, cargo de manejo y demora. Gripper, Envía Mi Compra, Casilla Mía, Punto Mío y más, con fuentes oficiales.'

defineOgImageComponent('Cambio', {
  title: 'Couriers en Uruguay',
  subtitle: 'Comparativa de tarifas puerta a puerta Miami → Uruguay',
  tag: 'GUÍA',
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
        'couriers uruguay, comprar en el exterior uruguay, courier puerta a puerta, casillero miami uruguay, tarifas courier uruguay',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'ItemList',
            name: 'Couriers puerta a puerta en Uruguay',
            itemListElement: couriers.value.map((c, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: c.name,
              url: c.website,
            })),
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com',
              },
              { '@type': 'ListItem', position: 2, name: 'Couriers en Uruguay', item: canonicalUrl },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.bg-gradient-couriers {
  background: linear-gradient(135deg, #2f81f7 0%, #16c784 100%);
}

/* Guard against any child (e.g. the share-buttons row) forcing a few px of horizontal scroll. */
.couriers-page {
  overflow-x: hidden;
}

.couriers-intro {
  max-width: 760px;
  line-height: 1.6;
}

/* Let the CTA label wrap inside the button instead of spilling out on narrow screens. */
.cta-btn {
  height: auto;
  min-height: 44px;
  max-width: 100%;
  white-space: normal;
}
.cta-btn :deep(.v-btn__content) {
  white-space: normal;
  padding-block: 8px;
}

.couriers-card,
.couriers-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.couriers-table :deep(td),
.couriers-table :deep(th) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.couriers-notes,
.couriers-other,
.couriers-sources {
  margin: 0;
  padding-left: 1.1rem;
}

.couriers-notes li,
.couriers-other li,
.couriers-sources li {
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.6;
}

.couriers-link,
.couriers-sources a {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}

.couriers-link:hover,
.couriers-sources a:hover {
  text-decoration: underline;
}

.cta-couriers {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}

/* Mobile card layout for the courier comparison (replaces the table < md). */
.courier-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px 16px;
}

.courier-card + .courier-card {
  margin-top: 12px;
}

.courier-rate {
  font-weight: 700;
  color: #16c784;
  white-space: nowrap;
}

/* Bright brand green (#16c784 ≈ 2:1 on white) fails AA on the near-white mobile
   card in light mode. Darken to an accessible emerald; dark mode keeps the tone. */
.v-theme--light .courier-rate {
  color: #0b7a4a;
}

.courier-rate small {
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
}

.courier-specs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 0 0 8px;
}

.courier-specs dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.5);
}

.courier-specs dd {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.courier-stars {
  display: inline-flex;
  align-items: center;
  gap: 1px;
}

/* Light-mode text-contrast overrides (dark-first hardcoded whites → black at same alpha). */
.v-theme--light .couriers-notes li,
.v-theme--light .couriers-other li,
.v-theme--light .couriers-sources li {
  color: rgba(0, 0, 0, 0.78);
}

.v-theme--light .courier-rate small {
  color: rgba(0, 0, 0, 0.6);
}

.v-theme--light .courier-specs dt {
  color: rgba(0, 0, 0, 0.5);
}

.v-theme--light .courier-specs dd {
  color: rgba(0, 0, 0, 0.85);
}
</style>
