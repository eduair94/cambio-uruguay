<!--
  Un aviso nuevo de Mercado Libre en /productos-que-te-cambian-la-vida-uruguay: UN solo enlace por
  aviso (foto y título en el mismo `<a>`, no dos paradas de tabulación con el mismo nombre).

  Existe como componente por la misma razón que MovilidadVariantThumb: cada foto necesita su PROPIO
  estado de «esta URL se murió» para caer al ícono sin apagar las demás. La caja de la foto mide lo
  mismo con foto, sin foto y con la foto rota, así que el cambio no mueve nada.

  Una fila de lista de precios, no una tarjeta: dos tarjetas por renglón medían lo mismo de alto que
  cuatro filas (la foto arriba y el vendedor partido en cuatro renglones de 140 px) y cortaban más el
  título. Según el ancho de la LISTA (consulta de contenedor `vida-offers`, nunca el viewport en
  script) el precio va debajo del título o en una columna a la derecha, donde los cuatro montos
  quedan alineados y se comparan de un vistazo. `.vida-offer__text` es `display: contents`: sus hijos
  son celdas de la grilla del enlace, y el orden del DOM (título, precio, vendedor) es el que lee un
  lector de pantalla en los tres arreglos.
-->
<template>
  <li class="vida-offer-row">
    <a class="vida-offer" :href="offer.url" target="_blank" rel="nofollow noopener">
      <span class="vida-offer__photo" :class="{ 'vida-offer__photo--empty': !showPhoto }">
        <img
          v-if="showPhoto"
          ref="img"
          :src="offer.image!"
          alt=""
          width="144"
          height="144"
          :loading="eager ? 'eager' : 'lazy'"
          decoding="async"
          referrerpolicy="no-referrer"
          @error="failed = true"
        />
        <VIcon v-else size="24" aria-hidden="true">{{ icon }}</VIcon>
      </span>
      <span class="vida-offer__text">
        <span class="vida-offer__title" data-notranslate>{{ offer.title }}</span>
        <span v-if="offer.currency === 'USD'" class="vida-offer__price">
          <span class="vida-offer__amount">{{ productosVidaUsd(offer.price) }}</span>
          <span class="vida-offer__converted">≈ {{ productosVidaMoney(offer.priceUyu) }}</span>
        </span>
        <span v-else class="vida-offer__price">
          <span class="vida-offer__amount">{{ productosVidaMoney(offer.priceUyu) }}</span>
        </span>
        <span class="vida-offer__meta">
          {{ variantLabel ? `${variantLabel}: ` : '' }}{{ productosVidaSellerLabel(offer.seller)
          }}<span :class="dated ? 'vida-offer__date' : 'd-sr-only'"
            >, visto el {{ productosVidaShortDate(offer.observedOn) }}</span
          >
        </span>
        <span class="d-sr-only">, en Mercado Libre, se abre en otra pestaña</span>
      </span>
    </a>
  </li>
</template>

<script setup lang="ts">
import {
  productosVidaMoney,
  productosVidaSellerLabel,
  productosVidaShortDate,
  productosVidaUsd,
  type ProductosVidaOffer,
} from '~/utils/productosVida'

const props = defineProps<{
  offer: ProductosVidaOffer
  /** El ícono del producto, para la caja sin foto. Un nombre `mdi-…` literal del catálogo. */
  icon: string
  /** El rótulo de la variante, sólo cuando el producto tiene más de una. */
  variantLabel: string | null
  /**
   * Si el día del aviso difiere del de la lectura que encabeza el panel («Leídos el …»). Igual,
   * repetir la fecha en las cuatro filas no dice nada: queda sólo para lectores de pantalla.
   */
  dated: boolean
  /** Las fotos del primer producto cargan sin esperar: están en la primera pantalla. */
  eager: boolean
}>()

const failed = ref(false)
const img = ref<HTMLImageElement | null>(null)
const showPhoto = computed(() => Boolean(props.offer.image) && !failed.value)

// Una foto que falló antes de hidratar ya no dispara `@error`: se mira al montar.
onMounted(() => {
  const el = img.value
  if (el && el.complete && el.naturalWidth === 0) failed.value = true
})
</script>

<style scoped>
.vida-offer-row {
  min-width: 0;
}
/* Tres arreglos según el ancho de la LISTA. El de base (menos de 300 px: un teléfono de 320–360) es
   foto | título, precio y vendedor apilados. 56 + 16 de relleno = 72 px de alto mínimo: toda la fila
   es el blanco del toque. */
.vida-offer {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  grid-template-rows: auto auto 1fr;
  grid-template-areas:
    'photo title'
    'photo price'
    'photo meta';
  column-gap: 12px;
  row-gap: 4px;
  align-items: start;
  min-height: 72px;
  padding: 8px;
  border-radius: 8px;
  color: rgb(var(--v-theme-on-surface));
  text-decoration: none;
  transition: background-color 150ms ease;
}
.vida-offer:hover,
.vida-offer:focus-visible {
  background: rgba(var(--v-theme-primary), 0.08);
}
.vida-offer:hover .vida-offer__title,
.vida-offer:focus-visible .vida-offer__title {
  text-decoration: underline;
  text-underline-offset: 2px;
}
.vida-offer__text {
  display: contents;
}
/* Blanco en los dos temas: las fotos de Mercado Libre vienen recortadas sobre blanco, y una caja
   teñida les dibuja un borde alrededor. */
.vida-offer__photo {
  display: flex;
  grid-area: photo;
  align-items: center;
  justify-content: center;
  width: 56px;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  background: #ffffff;
}
.vida-offer__photo img {
  display: block;
  width: 100%;
  height: 100%;
  padding: 4px;
  object-fit: contain;
}
.vida-offer__photo--empty {
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.v-theme--dark .vida-offer__photo:not(.vida-offer__photo--empty) {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}
/* El título de Mercado Libre puede tener 90 caracteres: dos renglones y «…»; el texto entero sigue
   en el HTML (y en el nombre del enlace). */
.vida-offer__title {
  display: -webkit-box;
  grid-area: title;
  min-width: 0;
  overflow: hidden;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}
/* En dólares, el monto publicado manda; la conversión va al lado (o debajo, en su columna), más
   chica, sin negrita y en el tono secundario: una equivalencia, no un segundo precio. */
.vida-offer__price {
  display: flex;
  flex-wrap: wrap;
  grid-area: price;
  gap: 0 8px;
  align-items: baseline;
  font-variant-numeric: tabular-nums;
}
.vida-offer__amount {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
  white-space: nowrap;
}
.vida-offer__converted {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.8rem;
  line-height: 1.35;
  white-space: nowrap;
}
.vida-offer__meta {
  grid-area: meta;
  min-width: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.75rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.vida-offer__date {
  white-space: nowrap;
}
/* Desde 300 px (un teléfono de 390): el precio sube a la derecha del título, en una columna donde
   los cuatro montos quedan alineados, y el vendedor usa todo el ancho de abajo. Una fila menos. */
@container vida-offers (min-width: 300px) {
  .vida-offer {
    grid-template-columns: 56px minmax(0, 1fr) auto;
    grid-template-rows: auto 1fr;
    grid-template-areas:
      'photo title price'
      'photo meta meta';
  }
  .vida-offer__price {
    flex-direction: column;
    align-items: flex-end;
    text-align: right;
  }
}
/* Lista ancha (el panel en escritorio, o una tableta): el precio ocupa su columna entera. */
@container vida-offers (min-width: 400px) {
  .vida-offer {
    grid-template-areas:
      'photo title price'
      'photo meta price';
    column-gap: 16px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .vida-offer {
    transition: none;
  }
}
</style>
