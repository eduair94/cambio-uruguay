<!--
  THESIS: Alguien busca "bicicleta eléctrica uruguay" para saber cuánto sale hoy, no cuál es "la
  mejor". Contestar con la banda de precio por tipo, nuevo y usado, las ofertas más baratas con su
  fecha, y la normativa departamental con su fuente — nunca un ranking de marca.
  OWN-WORLD: Mismas superficies, tipografía y azul de enlace que /monopatines-electricos-uruguay,
  con quien comparte maquinaria y componente de normativa.
  FAMILY: Sólo español (como comparativas, sucursal y tiendas-online-uruguay): el canonical es
  literal, sin prefijo de idioma, aunque la ruta exista bajo /en/ y /pt/ por la estrategia
  `prefix_except_default`.
-->
<template>
  <VContainer class="movilidad-page py-6 py-md-10">
    <VBreadcrumbs class="px-0 pb-2" :items="crumbs" />

    <header class="movilidad-header">
      <h1>Precio de bicicletas eléctricas en Uruguay</h1>
      <p class="lead">{{ intro }}</p>
      <p v-if="asOf" class="as-of">Actualizado el {{ movilidadLongDate(asOf) }}.</p>
    </header>

    <!-- ── Cuánto sale, por tipo ─────────────────────────────────────────── -->
    <section class="movilidad-section" aria-labelledby="variantes-title">
      <h2 id="variantes-title">Cuánto sale hoy, por tipo</h2>
      <p v-if="!variants.length" class="empty-note">
        Todavía no tenemos avisos recientes de bicicletas eléctricas. La página se completa sola con
        la próxima lectura de tiendas y Mercado Libre.
      </p>

      <div v-else class="variant-grid">
        <article v-for="item in variants" :key="item.key" class="variant-card">
          <h3>{{ item.variantLabel }}</h3>

          <template v-if="item.newBand">
            <p class="variant-median">
              <span class="amount">{{ movilidadMoney(item.newBand.median) }}</span>
              <span class="variant-tag">mediana nuevo</span>
            </p>
            <p class="variant-band">
              La mitad de los avisos entre {{ movilidadMoney(item.newBand.p25) }} y
              {{ movilidadMoney(item.newBand.p75) }} ({{ item.newBand.n }} avisos nuevos).
            </p>
          </template>
          <p v-else class="muted">Nuevo: sin datos suficientes.</p>

          <p v-if="item.usedBand" class="variant-used">
            Usado: mediana {{ movilidadMoney(item.usedBand.median) }} ({{
              item.usedBand.n
            }}
            avisos)<span v-if="item.usedSavingPct" class="saving">
              , alrededor de {{ Math.round(item.usedSavingPct) }} % menos que la mediana nueva</span
            >.
          </p>
          <p v-else class="variant-used muted">Usado: sin datos suficientes.</p>
        </article>
      </div>
    </section>

    <!-- ── Los más baratos ───────────────────────────────────────────────── -->
    <section
      v-if="cheapestNew.length || cheapestUsed.length"
      class="movilidad-section"
      aria-labelledby="baratos-title"
    >
      <h2 id="baratos-title">Las ofertas más baratas</h2>
      <p class="section-intro">
        Las ofertas más baratas de la última lectura, con quién la publica y la fecha en que la
        vimos. El precio cambia todos los días: confirmalo en el aviso antes de comprar.
        <template v-if="suspectDropped">
          Dejamos afuera {{ suspectDropped }} {{ suspectDropped === 1 ? 'aviso' : 'avisos' }} con
          precios muy por debajo del resto de su tipo: no entran en las medianas ni en esta lista.
        </template>
      </p>

      <div class="cheap-grid">
        <div v-if="cheapestNew.length">
          <h3>Nuevas</h3>
          <ol class="offer-list">
            <li v-for="row in cheapestNew" :key="row.key">
              <a :href="row.offer.url" target="_blank" rel="nofollow noopener" class="cat-link">{{
                row.offer.title
              }}</a>
              <span class="offer-meta"
                ><NuxtLink
                  v-if="storeKeyFor(row.offer.seller, row.offer.source)"
                  :to="
                    localePath(
                      `/tiendas-online-uruguay/${storeKeyFor(row.offer.seller, row.offer.source)}`
                    )
                  "
                  class="cat-link"
                  >{{ sellerLabel(row.offer) }}</NuxtLink
                ><template v-else>{{ sellerLabel(row.offer) }}</template> · {{ row.variantLabel }} ·
                {{ movilidadShortDate(row.offer.observedAt) }}</span
              >
              <span class="offer-price"
                >{{ movilidadMoney(row.offer.priceUyu)
                }}<span v-if="row.offer.currency === 'USD'" class="offer-usd">{{
                  movilidadUsd(row.offer.price)
                }}</span></span
              >
            </li>
          </ol>
        </div>
        <div v-if="cheapestUsed.length">
          <h3>Usadas</h3>
          <ol class="offer-list">
            <li v-for="row in cheapestUsed" :key="row.key">
              <a :href="row.offer.url" target="_blank" rel="nofollow noopener" class="cat-link">{{
                row.offer.title
              }}</a>
              <span class="offer-meta"
                ><NuxtLink
                  v-if="storeKeyFor(row.offer.seller, row.offer.source)"
                  :to="
                    localePath(
                      `/tiendas-online-uruguay/${storeKeyFor(row.offer.seller, row.offer.source)}`
                    )
                  "
                  class="cat-link"
                  >{{ sellerLabel(row.offer) }}</NuxtLink
                ><template v-else>{{ sellerLabel(row.offer) }}</template> · {{ row.variantLabel }} ·
                {{ movilidadShortDate(row.offer.observedAt) }}</span
              >
              <span class="offer-price"
                >{{ movilidadMoney(row.offer.priceUyu)
                }}<span v-if="row.offer.currency === 'USD'" class="offer-usd">{{
                  movilidadUsd(row.offer.price)
                }}</span></span
              >
            </li>
          </ol>
        </div>
      </div>
    </section>

    <!-- ── Normativa ─────────────────────────────────────────────────────── -->
    <section class="movilidad-section" aria-labelledby="normativa-title">
      <h2 id="normativa-title">Normativa por departamento</h2>
      <MovilidadNormativaTable />
    </section>

    <!-- ── Cómo elegir ───────────────────────────────────────────────────── -->
    <section class="movilidad-section" aria-labelledby="elegir-title">
      <h2 id="elegir-title">Cómo elegir una bicicleta eléctrica</h2>
      <p class="section-intro">
        No recomendamos marcas ni modelos: esto es lo que suele diferenciar una bicicleta eléctrica
        de otra y vale la pena mirar en la ficha del producto antes de comprar.
      </p>
      <ul class="guide-list">
        <li>
          <strong>Autonomía.</strong> Los kilómetros que declara el vendedor por carga completa de
          batería, según el nivel de asistencia usado. El uso real baja con el frío, el peso y las
          subidas.
        </li>
        <li>
          <strong>Peso.</strong> El motor y la batería suman peso a una bicicleta común. Importa si
          hay que subirla escaleras o cargarla en un vehículo.
        </li>
        <li>
          <strong>Potencia del motor.</strong> Los vatios (W) que declara el vendedor son una
          referencia de cuánta asistencia da en subida, no una garantía de rendimiento.
        </li>
        <li>
          <strong>Freno.</strong> Doble freno (delantero y trasero), preferentemente a disco: el
          peso extra del motor y la batería exige más al frenar.
        </li>
        <li>
          <strong>Garantía.</strong> Cuántos meses cubre el vendedor sobre el conjunto motor y
          batería, que suele ser la parte más cara de reponer.
        </li>
      </ul>
    </section>

    <!-- ── Si se rompe ───────────────────────────────────────────────────── -->
    <section class="movilidad-section" aria-labelledby="garantia-title">
      <h2 id="garantia-title">Si se rompe</h2>
      <p class="section-intro">
        Comprada en una tienda o a un vendedor habilitado en Uruguay, una bicicleta eléctrica tiene
        la garantía legal de la Ley 17.250 de Defensa del Consumidor: si llega con un defecto de
        fabricación tenés derecho a la reparación, el cambio o la devolución del dinero. Guardá la
        factura o el comprobante de la compra.
      </p>
      <p class="section-intro">
        <NuxtLink :to="localePath('/derechos-consumidor-compras-online')" class="cat-link">
          Qué hacer si compraste online y no te entregan o el producto llega roto
        </NuxtLink>
      </p>
    </section>

    <FaqSection :items="faqItems" heading="Preguntas frecuentes" :expanded="true" />

    <!-- ── Otras páginas ─────────────────────────────────────────────────── -->
    <section class="movilidad-section related" aria-labelledby="related-title">
      <h2 id="related-title">Seguí leyendo</h2>
      <ul class="related-list">
        <li>
          <NuxtLink :to="localePath('/monopatines-electricos-uruguay')" class="cat-link">
            Precio de monopatines eléctricos en Uruguay
          </NuxtLink>
        </li>
        <li>
          <NuxtLink :to="localePath('/equipar-casa-uruguay')" class="cat-link">
            Equipar una casa vacía: qué comprar y cuánto sale
          </NuxtLink>
        </li>
        <li>
          <NuxtLink :to="localePath('/ciberlunes-y-black-friday-uruguay')" class="cat-link">
            CyberLunes y Black Friday: si el descuento es real
          </NuxtLink>
        </li>
      </ul>
    </section>

    <!-- ── Método ────────────────────────────────────────────────────────── -->
    <section class="movilidad-section" aria-labelledby="metodo-title">
      <h2 id="metodo-title">De dónde salen estos precios</h2>
      <p class="section-intro">
        Relevamos avisos de tiendas online uruguayas y Mercado Libre. Nuevo y usado son dos mercados
        y nunca se promedian: cada uno tiene su propia mediana, y un tipo con pocos avisos dice "sin
        datos suficientes" en vez de inventar un número. Sólo publicamos lo visto en los últimos 4
        días.
      </p>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  movilidadCheapestOffers,
  movilidadLongDate,
  movilidadMoney,
  movilidadPrecioTipicoAnswer,
  movilidadSellerLabel,
  movilidadShortDate,
  movilidadUsadoAnswer,
  movilidadUsd,
  type MovilidadCategoryResponse,
  type MovilidadItemDoc,
  type MovilidadOffer,
} from '~/utils/movilidad'
import { storeSlugForSeller } from '~/utils/storeDirectory'

const localePath = useLocalePath()

// El nombre del vendedor enlaza a su ficha (/tiendas-online-uruguay/<key>) sólo cuando esa tienda
// tiene ficha propia — la ruta 404s de verdad si no. `storeProfileKeys` es la lista compartida con
// /sillas-escritorio-uruguay/[slug].vue y /equipar-casa-uruguay/[categoria].vue (useStoreProfileKeys.ts).
const storeProfileKeys = useStoreProfileKeys()
// `source` es opcional para que cualquier llamada siga compilando; una oferta de Facebook nunca
// enlaza, aunque el nombre del vendedor resuelva a una tienda curada: el nombre visible de un
// vendedor particular de Marketplace no es la identidad de una empresa (mismo motivo que en las
// páginas hermanas). `storeSlugForSeller` además nunca resuelve "Mercado Libre" a la ficha de
// Mercado Libre (`classes/stores/match.ts`/`storeDirectory.ts`, `EXCLUDED_ALIAS_NORMS`), así que un
// vendedor sin identificar de ML tampoco enlaza aunque no hiciera falta este guard para eso.
const storeKeyFor = (seller: string, source?: string): string | null => {
  if (source === 'facebook') return null
  const key = storeSlugForSeller(seller)
  return key && storeProfileKeys.value.includes(key) ? key : null
}

// Server-rendered: las medianas tienen que estar en el HTML que lee el buscador. `bicicleta-electrica`
// es régimen `commodity` (classes/movilidad/registry.ts): no hay modelos identificados, así que esta
// página no pide ni muestra `products` — sólo la banda y las ofertas más baratas.
const { data } = await useFetch('/api/movilidad/bicicleta-electrica', {
  key: 'movilidad-bicicleta',
  transform: (response: MovilidadCategoryResponse): MovilidadCategoryResponse => ({
    ...response,
    items: (response?.items ?? []).map(item => ({ ...item, products: [] })),
  }),
})

const items = computed<MovilidadItemDoc[]>(() => data.value?.items ?? [])
const asOf = computed(() => data.value?.generatedAt ?? null)

const variants = computed(() =>
  [...items.value].sort((a, b) => (a.variantRank ?? 1) - (b.variantRank ?? 1))
)

/** El vendedor sin identificar de Mercado Libre se rotula; el nombre real de una tienda enlaza a
 * su ficha por separado, vía `storeKeyFor` (nunca a partir de este texto rotulado). */
function sellerLabel(offer: MovilidadOffer): string {
  return movilidadSellerLabel(offer.seller, offer.source)
}

const cheapestNew = computed(() => movilidadCheapestOffers(variants.value, 'new', 8))
const cheapestUsed = computed(() => movilidadCheapestOffers(variants.value, 'used', 6))
const suspectDropped = computed(() =>
  items.value.reduce((sum, item) => sum + (item.suspectDropped ?? 0), 0)
)

const intro =
  'Relevamos precios de bicicletas eléctricas en tiendas online uruguayas y Mercado Libre: la ' +
  'banda de precio por tipo, nuevo y usado, y las ofertas más baratas con su fecha. No es un ' +
  'ranking de "la mejor bici eléctrica": es lo que efectivamente se está vendiendo hoy.'

const crumbs = [
  { title: 'Inicio', to: localePath('/') },
  { title: 'Bicicletas eléctricas', disabled: true },
]

// ── FAQ ──────────────────────────────────────────────────────────────────
const faqItems = computed(() => [
  {
    id: 'movilidad-bicicleta-precio',
    question: '¿Cuánto sale una bicicleta eléctrica en Uruguay?',
    answer: movilidadPrecioTipicoAnswer(variants.value, 'bicicletas eléctricas', asOf.value),
  },
  {
    id: 'movilidad-bicicleta-licencia',
    question: '¿Necesito licencia o registro para andar en bicicleta eléctrica?',
    answer:
      'Depende del departamento y de si tu bicicleta entra en la definición local de "vehículo ' +
      'de movilidad personal". En Montevideo y San José hay normas específicas para vehículos de ' +
      'movilidad personal eléctricos, con edad mínima y algunos requisitos; la mayoría de los ' +
      'departamentos no tiene una norma propia que hayamos encontrado. Mirá la tabla de normativa ' +
      'de arriba para el tuyo.',
  },
  {
    id: 'movilidad-bicicleta-donde',
    question: '¿Por dónde puedo circular?',
    answer:
      'Depende del departamento: en Montevideo, la calzada, salvo donde haya infraestructura ' +
      'para bicicletas (ahí es obligatorio usarla); en San José está prohibido circular por ' +
      'veredas, espacios peatonales y rutas nacionales. Donde no encontramos una norma ' +
      'departamental no podemos afirmar una regla.',
  },
  {
    id: 'movilidad-bicicleta-usado',
    question: '¿Conviene comprarla usada?',
    answer: movilidadUsadoAnswer(
      variants.value,
      true,
      'Pedí la fecha y los ciclos de carga de la batería: es la pieza que decide si el precio es ' +
        'bueno.'
    ),
  },
])

// ── SEO ──────────────────────────────────────────────────────────────────
// Absoluto y LITERAL, nunca construido con `localePath` — mismo patrón que
// monopatines-electricos-uruguay.vue y tiendas-online-uruguay/index.vue.
const CANONICAL = 'https://cambio-uruguay.com/bicicletas-electricas-uruguay'

defineOgImageComponent('Cambio', {
  title: 'Precio de bicicletas eléctricas en Uruguay',
  subtitle: 'Nuevo, usado y normativa por departamento',
  tag: 'PRECIOS',
})

const seoTitle = 'Precio de bicicletas eléctricas en Uruguay | Cambio Uruguay'
const seoDescription =
  'Banda de precio por tipo de bicicleta eléctrica en Uruguay, nuevo y usado, las ofertas más ' +
  'baratas por tienda y la normativa vigente por departamento, cada dato con su fuente y su fecha.'

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: 'Precio de bicicletas eléctricas en Uruguay',
  ogDescription: seoDescription,
  ogType: 'website',
  ogUrl: CANONICAL,
  twitterCard: 'summary_large_image',
  twitterTitle: 'Precio de bicicletas eléctricas en Uruguay',
  twitterDescription: seoDescription,
})

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
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com/',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Bicicletas eléctricas',
                item: CANONICAL,
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
.movilidad-page {
  max-width: 1120px;
}
.movilidad-page p {
  margin: 12px 0 0;
}
.movilidad-header h1 {
  margin: 0;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  line-height: 1.2;
  text-wrap: balance;
}
.lead {
  max-width: 68ch;
  font-size: 1.075rem;
}
.as-of {
  font-size: 0.875rem;
  opacity: 0.7;
}
.movilidad-section {
  margin-top: 40px;
}
.movilidad-section h2 {
  margin: 0;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  line-height: 1.25;
}
.movilidad-section h3 {
  margin: 0;
  font-size: 1.05rem;
}
.section-intro {
  max-width: 70ch;
  font-size: 0.95rem;
  opacity: 0.88;
}
.empty-note {
  padding: 16px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  font-size: 0.95rem;
}
.cat-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}

/* Tarjetas por tipo */
.variant-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  margin-top: 18px;
}
.variant-card {
  padding: 20px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.variant-median {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}
.variant-median .amount {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.variant-tag {
  font-size: 0.8rem;
  opacity: 0.7;
}
.variant-band,
.variant-used {
  font-size: 0.875rem;
}
.saving {
  font-weight: 700;
  color: rgb(var(--v-theme-success));
}
.muted {
  opacity: 0.66;
  font-size: 0.875rem;
}

/* Más baratos */
.cheap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px 32px;
  margin-top: 18px;
}
.offer-list {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}
.offer-list li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 2px 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.15);
  font-size: 0.875rem;
}
.offer-list a {
  grid-column: 1;
  overflow-wrap: anywhere;
}
.offer-meta {
  grid-column: 1;
  font-size: 0.75rem;
  opacity: 0.72;
}
.offer-usd {
  display: block;
  font-size: 0.75rem;
  font-weight: 400;
  opacity: 0.72;
  text-align: right;
}
.offer-price {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

/* Guía */
.guide-list {
  max-width: 70ch;
  margin: 12px 0 0;
  padding-left: 22px;
  font-size: 0.95rem;
}
.guide-list li {
  padding: 4px 0;
}

.related-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px 20px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}
</style>
