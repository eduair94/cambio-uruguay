<!--
  Un producto de /productos-que-te-cambian-la-vida-uruguay, en dos capas que no se mezclan: lo que
  dijo el hilo (puesto, cuántas personas, por qué, qué mirar) sobre el lienzo, y lo que cuesta hoy
  dentro de UN panel fechado.

  El panel es un gráfico y una lista de precios. El gráfico: una fila por variante (nombre y mitad
  central a la izquierda, el precio típico a la derecha, la regla debajo) y UN eje para todas, al
  final; las variantes sin banda van después del eje, porque no se miden en él. Antes cada variante
  dibujaba su propio eje de $ 100 a $ 1.000.000. La lista: los cuatro avisos más baratos y la
  búsqueda. En el celular van uno debajo del otro; desde 720 px de PANEL (consulta de contenedor,
  nunca el viewport en script) van lado a lado.

  En escritorio la capa del hilo también se parte en dos: puesto y nombre a la izquierda, el porqué a
  la derecha, y el panel entero debajo. Antes el panel iba al costado del texto, y como medía varias
  veces lo que el texto, la columna de la izquierda quedaba casi vacía.

  «Qué mirar antes de comprar» y el directorio propio cierran la capa del hilo, ANTES del panel: son
  del hilo y de este sitio, no de Mercado Libre, y el panel cierra el producto con su búsqueda.

  El `<li>` raíz NO declara `display`: el filtro lo esconde con el atributo `hidden`, y cualquier
  `display` de autor le gana al `[hidden]` del navegador (la página declara además
  `.vida-item[hidden] { display: none !important }`). Las grillas van adentro.
-->
<template>
  <li :id="entry.slug" class="vida-item" :value="rank" :hidden="!visible">
    <article class="vida-product" :aria-labelledby="`vida-${entry.slug}-name`">
      <div class="vida-product__intro">
        <div class="vida-product__id">
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
        </div>

        <div class="vida-product__text">
          <p class="vida-why">{{ entry.why }}</p>

          <div class="vida-product__more">
            <details class="vida-tips">
              <summary class="vida-tips__summary">
                <span>Qué mirar antes de comprar</span>
                <VIcon
                  class="vida-tips__chevron"
                  size="20"
                  aria-hidden="true"
                  icon="mdi-chevron-down"
                />
              </summary>
              <p class="vida-tips__text">{{ entry.lookFor }}</p>
              <p v-if="entry.threadNote" class="vida-tips__text">{{ entry.threadNote }}</p>
            </details>

            <NuxtLink v-if="entry.related" :to="localePath(entry.related.to)" class="vida-related">
              <span>{{ entry.related.label }}</span>
              <VIcon size="16" aria-hidden="true">mdi-arrow-right</VIcon>
            </NuxtLink>
          </div>
        </div>
      </div>

      <section class="vida-panel" :aria-labelledby="`vida-${entry.slug}-panel`">
        <div class="vida-panel__head">
          <h4 :id="`vida-${entry.slug}-panel`" class="vida-panel__title">
            <span class="d-sr-only">{{ entry.name }}: </span>Avisos nuevos en Mercado Libre Uruguay
          </h4>
          <p v-if="product && readOn" class="vida-panel__meta">Leídos el {{ readOn }}</p>
        </div>

        <div class="vida-panel__body" :class="{ 'vida-panel__body--split': hasOffers }">
          <div v-if="product || hasPrices" class="vida-panel__chart">
            <template v-if="banded.length">
              <ul class="vida-variants" role="list">
                <li v-for="variant in banded" :key="variant.id" class="vida-variant">
                  <p class="vida-variant__label">
                    {{ variant.label
                    }}<span v-if="variant.seenOn" class="vida-variant__seen">
                      (leído el {{ variant.seenOn }})</span
                    >
                  </p>
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
                </li>
              </ul>
              <ProductosVidaAxis class="vida-panel__axis" :domain="domain" />
            </template>
            <!-- Las variantes sin banda van después del eje: no tienen regla, y entre la última regla
                 y su eje no puede quedar una fila que no se mide en él. -->
            <ul v-if="thin.length" class="vida-variants vida-variants--thin" role="list">
              <li v-for="variant in thin" :key="variant.id" class="vida-variant vida-variant--thin">
                <p class="vida-variant__label">
                  {{ variant.label
                  }}<span v-if="variant.seenOn" class="vida-variant__seen">
                    (leído el {{ variant.seenOn }})</span
                  >
                </p>
                <p class="vida-variant__thin">
                  Pocos avisos nuevos para dar un precio típico (vimos {{ variant.newOffers }}).
                </p>
              </li>
            </ul>
            <p v-if="!product" class="vida-panel__empty">
              Sin avisos leídos en los últimos dos días. Se completa con la próxima lectura.
            </p>

            <p v-if="fitLine" class="vida-fit">
              <strong>{{ fitLine.head }}</strong
              >{{ fitLine.rest }}
            </p>
          </div>

          <div class="vida-panel__shop">
            <template v-if="hasOffers">
              <p :id="`vida-${entry.slug}-offers`" class="vida-offers__title">
                Los más baratos de esta lectura
              </p>
              <ul class="vida-offers" role="list" :aria-labelledby="`vida-${entry.slug}-offers`">
                <ProductosVidaOffer
                  v-for="offer in product!.offers"
                  :key="offer.url"
                  :offer="offer"
                  :icon="entry.icon"
                  :variant-label="variantLabelOf(offer.variant)"
                  :dated="offer.observedOn !== readDay"
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
          </div>
        </div>
      </section>
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
  type ProductosVidaVariant,
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
  /** La misma fecha como día de Montevideo (`YYYY-MM-DD`), para compararla con la de cada aviso. */
  readDay: string
  eager: boolean
}>()

const localePath = useLocalePath()

const PIP_CAP = 10
const pips = computed(() =>
  Array.from({ length: Math.min(PIP_CAP, props.entry.mentions) }, (_, i) => i)
)
const tieText = computed(() => productosVidaTieText(props.tiedWith))

const hasOffers = computed(() => Boolean(props.product?.offers.length))
type BandedVariant = ProductosVidaVariant & { band: NonNullable<ProductosVidaVariant['band']> }
const banded = computed(() =>
  (props.product?.variants ?? []).filter(
    (variant): variant is BandedVariant => variant.band !== null
  )
)
const thin = computed(() => (props.product?.variants ?? []).filter(variant => !variant.band))
const bandCount = computed(() => banded.value.length)
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
@layer vuetify-overrides.cu-reset {
  :where(.vida-product) :where(p, h3, h4, ul) {
    margin: 0;
  }
}

/* ---- La capa del hilo ---- */
.vida-product__intro {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  row-gap: 8px;
}
.vida-product__id,
.vida-product__text {
  min-width: 0;
}
/* El círculo a la izquierda de los DOS renglones (nombre y conteo), no sólo del nombre: el conteo
   ya no necesita un renglón propio con sangría. El contenedor del nombre es `display: contents` para
   que el círculo y el H3 sean celdas de esta grilla sin cambiar el DOM. */
.vida-product__id {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  column-gap: 12px;
  align-items: center;
}
.vida-product__head {
  display: contents;
}
/* Ámbar de relleno (el color de los rankings), número en tinta: ≥ 7:1 en los dos ámbar. */
.vida-rank {
  display: inline-flex;
  grid-row: span 2;
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
  grid-column: 2;
  min-width: 0;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.3;
  overflow-wrap: anywhere;
  text-wrap: balance;
}
/* Sangría = el círculo (40) + su separación (12): los puntos arrancan bajo el nombre. */
.vida-tally {
  display: flex;
  flex-wrap: wrap;
  grid-column: 2;
  gap: 8px;
  align-items: center;
  margin-top: 4px;
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
  max-width: 65ch;
  font-size: 1rem;
  line-height: 1.5;
}
/* «Qué mirar» y el directorio propio en un renglón cuando entran; si no, uno debajo del otro. */
.vida-product__more {
  display: flex;
  flex-wrap: wrap;
  column-gap: 24px;
  align-items: flex-start;
}
.vida-tips {
  min-width: 0;
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
.vida-tips[open] {
  flex-basis: 100%;
}
.vida-tips[open] .vida-tips__chevron {
  transform: rotate(180deg);
}
.vida-tips__text {
  max-width: 65ch;
  font-size: 0.95rem;
  line-height: 1.5;
}
.vida-tips__text + .vida-tips__text {
  margin-top: 8px;
}
/* En línea y no flex: un texto que se parte en dos renglones dentro de un flex ocupa todo el ancho y
   la flecha quedaba sola contra el borde derecho. Así sigue a la última palabra. 10 + 24 + 10 = 44. */
.vida-related,
.vida-search {
  display: inline-block;
  min-height: 44px;
  padding-block: 10px;
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  line-height: 24px;
  text-underline-offset: 2px;
}
.vida-related {
  font-size: 0.95rem;
}
.vida-related .v-icon,
.vida-search .v-icon {
  margin-inline-start: 4px;
  vertical-align: -3px;
}

/* ---- La capa de los precios: un panel fechado ---- */
.vida-panel {
  container: vida-panel / inline-size;
  min-width: 0;
  margin-top: 12px;
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.vida-panel__head {
  display: flex;
  flex-wrap: wrap;
  gap: 0 16px;
  align-items: baseline;
}
.vida-panel__title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  line-height: 1.4;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.vida-panel__meta {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.75rem;
  line-height: 1.4;
}
.vida-panel__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  row-gap: 16px;
  margin-top: 16px;
}
.vida-panel__chart,
.vida-panel__shop {
  min-width: 0;
}
.vida-panel__empty {
  font-size: 0.875rem;
  line-height: 1.45;
}

/* Una fila por variante: el nombre y la mitad central a la izquierda, el precio típico a la
   derecha, y la regla debajo a todo el ancho, para que todas compartan el eje del final. */
.vida-variants {
  container: vida-variants / inline-size;
  display: grid;
  row-gap: 12px;
  padding: 0;
  list-style: none;
}
.vida-variant {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'label median'
    'range median'
    'ruler ruler';
  column-gap: 16px;
  min-width: 0;
}
.vida-variant--thin {
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    'label'
    'thin';
}
.vida-variant__label {
  grid-area: label;
  min-width: 0;
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
  flex-direction: column;
  grid-area: median;
  align-items: flex-end;
  text-align: right;
}
.vida-variant__amount {
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}
.vida-variant__typical {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.75rem;
  line-height: 1.4;
  white-space: nowrap;
}
.vida-variant__range,
.vida-variant__thin {
  margin-top: 2px;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
}
.vida-variant__range {
  grid-area: range;
  text-wrap: pretty;
}
.vida-variant__thin {
  grid-area: thin;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
/* La caja de la regla mide 16 y la pista va en su mitad: 4 de margen dejan 10 a la vista. */
.vida-variant__ruler {
  grid-area: ruler;
  margin-top: 4px;
}
/* A 320 px la columna del precio le dejaba al texto ~120 px: ahí todo va apilado, con el precio
   típico en su propio renglón. */
@container vida-variants (max-width: 279px) {
  .vida-variant {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'label'
      'median'
      'range'
      'ruler';
  }
  .vida-variant__median {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0 8px;
    align-items: baseline;
    text-align: left;
  }
}
.vida-panel__axis {
  margin-top: 4px;
}
.vida-panel__axis + .vida-variants--thin {
  margin-top: 16px;
}
.vida-fit {
  margin-top: 16px;
  font-size: 0.875rem;
  line-height: 1.45;
}
.vida-fit strong {
  font-weight: 600;
}

/* La lista de precios. */
.vida-offers__title {
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.45;
}
.vida-offers {
  container: vida-offers / inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
  margin-top: 4px;
  margin-inline: -8px;
  padding: 0;
  list-style: none;
}
.vida-search {
  margin-top: 4px;
  font-size: 0.875rem;
}

/* Panel ancho: el gráfico a la izquierda y la lista a la derecha, separados por una línea fina. */
@container vida-panel (min-width: 720px) {
  .vida-panel__body--split {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    column-gap: 32px;
  }
  .vida-panel__body--split .vida-panel__shop {
    position: relative;
  }
  .vida-panel__body--split .vida-panel__shop::before {
    content: '';
    position: absolute;
    inset-block: 0;
    left: -16px;
    width: 1px;
    background: rgba(var(--v-border-color), var(--v-border-opacity));
  }
}

/* Escritorio: puesto y nombre a la izquierda, el porqué a la derecha; el panel, debajo y entero. */
@media (min-width: 960px) {
  .vida-product__intro {
    grid-template-columns: minmax(0, 17rem) minmax(0, 1fr);
    column-gap: 32px;
    align-items: start;
  }
  .vida-panel {
    margin-top: 16px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .vida-tips__chevron {
    transition: none;
  }
}
</style>
