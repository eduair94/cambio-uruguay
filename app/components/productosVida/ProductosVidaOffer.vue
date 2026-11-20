<!--
  Un aviso nuevo de Mercado Libre en /productos-que-te-cambian-la-vida-uruguay: UN solo enlace por
  aviso (foto y título en el mismo `<a>`, no dos paradas de tabulación con el mismo nombre).

  Existe como componente por la misma razón que MovilidadVariantThumb: cada foto necesita su PROPIO
  estado de «esta URL se murió» para caer al ícono sin apagar las demás. La caja de la foto mide lo
  mismo con foto, sin foto y con la foto rota, así que el cambio no mueve nada.
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
        <VIcon v-else size="28" aria-hidden="true">{{ icon }}</VIcon>
      </span>
      <span class="vida-offer__text">
        <span class="vida-offer__title" data-notranslate>{{ offer.title }}</span>
        <span v-if="offer.currency === 'USD'" class="vida-offer__price">
          {{ productosVidaUsd(offer.price) }}
          <span class="vida-offer__converted">≈ {{ productosVidaMoney(offer.priceUyu) }}</span>
        </span>
        <span v-else class="vida-offer__price">{{ productosVidaMoney(offer.priceUyu) }}</span>
        <span class="vida-offer__meta">
          {{ variantLabel ? `${variantLabel}: ` : '' }}{{ productosVidaSellerLabel(offer.seller)
          }}<span class="vida-offer__date"
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
.vida-offer {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  min-height: 88px;
  padding: 8px;
  border-radius: 8px;
  color: rgb(var(--v-theme-on-surface));
  text-decoration: none;
  transition: background-color 150ms ease;
}
.vida-offer:hover,
.vida-offer:focus-visible {
  background: rgba(var(--v-theme-primary), 0.06);
}
.vida-offer:hover .vida-offer__title,
.vida-offer:focus-visible .vida-offer__title {
  text-decoration: underline;
  text-underline-offset: 2px;
}
/* Blanco en los dos temas: las fotos de Mercado Libre vienen recortadas sobre blanco, y una caja
   teñida les dibuja un borde alrededor. */
.vida-offer__photo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
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
.vida-offer__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.vida-offer__title {
  display: -webkit-box;
  overflow: hidden;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}
.vida-offer__price {
  display: flex;
  flex-direction: column;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1.3;
}
.vida-offer__converted {
  font-size: 0.8rem;
  font-weight: 400;
}
.vida-offer__meta {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.8rem;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.vida-offer__date {
  white-space: nowrap;
}
@media (prefers-reduced-motion: reduce) {
  .vida-offer {
    transition: none;
  }
}
</style>
