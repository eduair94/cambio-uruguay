<!--
  Un producto de /productos-que-te-cambian-la-vida-uruguay, en dos capas que no se mezclan: lo que
  dijo el hilo (puesto, cuántas personas, por qué, qué mirar) sobre el lienzo, y lo que cuesta hoy
  dentro de UN panel fechado (una fila por variante, la regla compartida, cuatro avisos y la
  búsqueda).

  El `<li>` raíz NO declara `display`: el filtro lo esconde con el atributo `hidden`, y cualquier
  `display` de autor le gana al `[hidden]` del navegador (la página declara además
  `.vida-item[hidden] { display: none !important }`). La grilla de escritorio va en el `<article>`.
-->
<template>
  <li :id="entry.slug" class="vida-item" :value="rank" :hidden="!visible">
    <article class="vida-product" :aria-labelledby="`vida-${entry.slug}-name`">
      <div class="vida-product__head">
        <span class="vida-rank" aria-hidden="true">{{ rank }}</span>
        <h3 :id="`vida-${entry.slug}-name`" class="vida-product__name">
          <span class="d-sr-only">Puesto {{ rank }}: </span>{{ entry.name }}
        </h3>
      </div>

      <p class="vida-tally">
        <span class="vida-pips" aria-hidden="true">
          <span v-for="pip in pips" :key="pip" class="vida-pip" />
        </span>
        <span>{{ productosVidaCountLabel(entry.mentions, entry.phrase) }}</span>
        <span v-if="tieText" class="d-sr-only">{{ tieText }}</span>
      </p>

      <p class="vida-why">{{ entry.why }}</p>

      <section class="vida-panel" :aria-labelledby="`vida-${entry.slug}-panel`">
        <h4 :id="`vida-${entry.slug}-panel`" class="vida-panel__title">
          {{ entry.name }}: avisos nuevos en Mercado Libre Uruguay
        </h4>
        <p v-if="product && readOn" class="vida-panel__meta">Leídos el {{ readOn }}</p>

        <ul v-if="product" class="vida-variants" role="list">
          <li v-for="variant in product.variants" :key="variant.id" class="vida-variant">
            <p class="vida-variant__label">
              {{ variant.label
              }}<span v-if="variant.seenOn" class="vida-variant__seen">
                (leído el {{ variant.seenOn }})</span
              >
            </p>
            <template v-if="variant.band">
              <p class="vida-variant__median">
                <span class="vida-variant__amount">{{
                  productosVidaMoney(variant.band.median)
                }}</span>
                <span class="vida-variant__typical">precio típico</span>
              </p>
              <p class="vida-variant__range">
                La mitad sale entre {{ productosVidaMoney(variant.band.p25) }} y
                {{ productosVidaMoney(variant.band.p75) }}, en {{ variant.band.n }} avisos.
              </p>
              <ProductosVidaRuler
                class="vida-variant__ruler"
                :band="variant.band"
                :domain="domain"
                :hasta="hasta"
              />
            </template>
            <p v-else class="vida-variant__thin">
              Pocos avisos nuevos para dar un precio típico (vimos {{ variant.newOffers }}).
            </p>
          </li>
        </ul>
        <p v-else-if="hasPrices" class="vida-panel__empty">
          Sin avisos leídos en los últimos dos días. Se completa con la próxima lectura.
        </p>

        <p v-if="fitLine" class="vida-fit">
          <strong>{{ fitLine.head }}</strong
          >{{ fitLine.rest }}
        </p>

        <template v-if="product && product.offers.length">
          <p :id="`vida-${entry.slug}-offers`" class="vida-offers__title">
            Los más baratos de esta lectura
          </p>
          <ul class="vida-offers" role="list" :aria-labelledby="`vida-${entry.slug}-offers`">
            <ProductosVidaOffer
              v-for="offer in product.offers"
              :key="offer.url"
              :offer="offer"
              :icon="entry.icon"
              :variant-label="variantLabelOf(offer.variant)"
              :eager="eager"
            />
          </ul>
        </template>

        <a
          class="vida-search"
          :href="productosVidaMlSearchUrl(entry.searchQuery)"
          target="_blank"
          rel="nofollow noopener"
        >
          <span>{{ productosVidaSearchLabel(entry) }}</span
          ><span class="d-sr-only">, se abre en otra pestaña</span>
          <VIcon size="16" aria-hidden="true">mdi-open-in-new</VIcon>
        </a>
      </section>

      <details class="vida-tips">
        <summary class="vida-tips__summary">
          <span>Qué mirar antes de comprar</span>
          <VIcon class="vida-tips__chevron" size="20" aria-hidden="true">mdi-chevron-down</VIcon>
        </summary>
        <p class="vida-tips__text">{{ entry.lookFor }}</p>
        <p v-if="entry.threadNote" class="vida-tips__text">{{ entry.threadNote }}</p>
      </details>

      <NuxtLink v-if="entry.related" :to="localePath(entry.related.to)" class="vida-related">
        <span>{{ entry.related.label }}</span>
        <VIcon size="16" aria-hidden="true">mdi-arrow-right</VIcon>
      </NuxtLink>
    </article>
  </li>
</template>

<script setup lang="ts">
import {
  productosVidaCountLabel,
  productosVidaFit,
  productosVidaFitLine,
  productosVidaMlSearchUrl,
  productosVidaMoney,
  productosVidaSearchLabel,
  productosVidaTieText,
  type ProductosVidaProduct,
  type ProductosVidaRulerDomain,
} from '~/utils/productosVida'
import type { ProductosVidaProductEntry } from '~/utils/productosVidaCatalog'

const props = defineProps<{
  entry: ProductosVidaProductEntry
  /** Lo que la API trajo de este producto; `undefined` si no hay precios recientes. */
  product: ProductosVidaProduct | undefined
  rank: number
  tiedWith: string[]
  visible: boolean
  /** El presupuesto elegido, ya en `null` si la respuesta no trae ningún precio. */
  hasta: number | null
  /** Si la respuesta trae algún producto: sin ninguno, el aviso de la página ya dice por qué. */
  hasPrices: boolean
  domain: ProductosVidaRulerDomain
  /** «20 de noviembre de 2026», la fecha de la última lectura. */
  readOn: string
  eager: boolean
}>()

const localePath = useLocalePath()

const PIP_CAP = 10
const pips = computed(() =>
  Array.from({ length: Math.min(PIP_CAP, props.entry.mentions) }, (_, i) => i)
)
const tieText = computed(() => productosVidaTieText(props.tiedWith))

const bandCount = computed(
  () => props.product?.variants.filter(variant => variant.band !== null).length ?? 0
)
// «Entra: …» con la primera palabra (hasta los dos puntos) en negrita.
const fitLine = computed(() => {
  const line = productosVidaFitLine(
    productosVidaFit(props.product, props.hasta),
    props.hasta,
    bandCount.value > 1
  )
  if (!line) return null
  const colon = line.indexOf(':') + 1
  return { head: line.slice(0, colon), rest: line.slice(colon) }
})

function variantLabelOf(id: string): string | null {
  const variants = props.product?.variants ?? []
  if (variants.length < 2) return null
  return variants.find(variant => variant.id === id)?.label ?? null
}
</script>

<style scoped>
/* Sin `display` en el `<li>` (ver el comentario de arriba); el ancla cae debajo de la barra fija. */
.vida-item {
  scroll-margin-top: 84px;
  padding-block: 24px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.vida-item[hidden] {
  display: none !important;
}
:where(.vida-product) :where(p, h3, h4, ul) {
  margin: 0;
}
.vida-product {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: 'head' 'tally' 'why' 'panel' 'tips' 'related';
}
.vida-product__head {
  display: flex;
  grid-area: head;
  gap: 12px;
  align-items: center;
  min-width: 0;
}
/* Ámbar de relleno (el color de los rankings), número en tinta: ≥ 7:1 en los dos ámbar. */
.vida-rank {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgb(var(--v-theme-secondary));
  color: rgba(0, 0, 0, 0.87);
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}
.vida-product__name {
  min-width: 0;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.3;
  overflow-wrap: anywhere;
}
.vida-tally {
  display: flex;
  flex-wrap: wrap;
  grid-area: tally;
  gap: 8px;
  align-items: center;
  margin-top: 4px;
  padding-left: 52px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.35;
}
.vida-pips {
  display: inline-flex;
  gap: 4px;
}
.vida-pip {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(var(--v-theme-secondary));
}
.vida-why {
  grid-area: why;
  max-width: 60ch;
  margin-top: 8px;
  font-size: 1rem;
  line-height: 1.5;
}
.vida-panel {
  grid-area: panel;
  min-width: 0;
  margin-top: 16px;
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.vida-panel__title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  line-height: 1.4;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.vida-panel__meta {
  margin-top: 4px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.8rem;
  line-height: 1.35;
}
.vida-panel__empty {
  margin-top: 8px;
  font-size: 0.875rem;
  line-height: 1.45;
}
.vida-variants {
  display: grid;
  gap: 16px;
  margin-top: 12px;
  padding: 0;
  list-style: none;
}
.vida-variant {
  min-width: 0;
}
.vida-variant__label {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.45;
}
.vida-variant__seen {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-weight: 400;
}
.vida-variant__median {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
  margin-top: 4px;
}
.vida-variant__amount {
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1.2;
}
.vida-variant__typical {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.8rem;
}
.vida-variant__range,
.vida-variant__thin {
  margin-top: 4px;
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
  line-height: 1.45;
}
.vida-variant__thin {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.vida-variant__ruler {
  margin-top: 12px;
}
.vida-fit {
  margin-top: 12px;
  font-size: 0.875rem;
  line-height: 1.45;
}
.vida-fit strong {
  font-weight: 600;
}
.vida-offers__title {
  margin-top: 16px;
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.45;
}
.vida-offers {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  margin-top: 4px;
  margin-inline: -8px;
  padding: 0;
  list-style: none;
}
.vida-search {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  min-height: 44px;
  margin-top: 8px;
  color: rgb(var(--v-theme-link));
  font-size: 0.875rem;
  font-weight: 600;
  text-underline-offset: 2px;
}
.vida-tips {
  grid-area: tips;
  margin-top: 8px;
}
.vida-tips__summary {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  min-height: 44px;
  color: rgb(var(--v-theme-link));
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  list-style: none;
}
.vida-tips__summary::-webkit-details-marker {
  display: none;
}
.vida-tips__chevron {
  transition: transform 200ms ease;
}
.vida-tips[open] .vida-tips__chevron {
  transform: rotate(180deg);
}
.vida-tips__text {
  max-width: 60ch;
  font-size: 0.95rem;
  line-height: 1.5;
}
.vida-tips__text + .vida-tips__text {
  margin-top: 8px;
}
.vida-related {
  display: inline-flex;
  grid-area: related;
  gap: 4px;
  align-items: center;
  justify-self: start;
  min-height: 44px;
  color: rgb(var(--v-theme-link));
  font-size: 0.95rem;
  font-weight: 600;
  text-underline-offset: 2px;
}
@media (min-width: 600px) {
  .vida-offers {
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
  }
}
/* Escritorio: el texto del hilo a la izquierda y el panel a la derecha en todas las filas. El orden
   del DOM (y del tabulador) sigue siendo el del celular: áreas de grilla, nunca `order`. */
@media (min-width: 960px) {
  .vida-product {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    grid-template-rows: auto auto auto auto auto 1fr;
    grid-template-areas:
      'head panel'
      'tally panel'
      'why panel'
      'tips panel'
      'related panel'
      '. panel';
    column-gap: 32px;
    align-items: start;
  }
  .vida-panel {
    margin-top: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .vida-tips__chevron {
    transition: none;
  }
}
</style>
