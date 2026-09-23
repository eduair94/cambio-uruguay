<!--
  Una oferta de /monopatines-electricos-uruguay o /bicicletas-electricas-uruguay, con foto.

  Es la MISMA fila que la lista de texto publicaba antes (`MovilidadOffer`, del documento del
  catálogo), no una consulta nueva: la foto viaja desde el 2026-09-22 en la propia oferta
  (`EquiparOffer.image`) y nunca es de Facebook Marketplace, porque esas URLs son del vendedor y
  vencen — una tarjeta construida sobre una de ésas se rompe sola en unos días.

  Tiene su propia tarjeta y no reusa `EquiparListingCard` por dos datos que sólo existen acá: el
  tipo (`variantLabel`, que es lo que la banda de arriba compara) y el enlace a la ficha de la
  tienda cuando esa tienda tiene una.
-->
<template>
  <article class="mv-card">
    <a
      :href="offer.url"
      target="_blank"
      rel="nofollow noopener"
      class="mv-card__photo"
      :aria-label="`${offer.title} (abre el aviso en ${sourceLabel})`"
    >
      <img
        v-if="offer.image && !failed"
        :src="offer.image"
        :alt="offer.title"
        loading="lazy"
        width="320"
        height="320"
        referrerpolicy="no-referrer"
        @error="failed = true"
      />
      <span v-else class="mv-card__nophoto"><VIcon :icon="icon" size="32" /></span>
    </a>

    <div class="mv-card__body">
      <div class="mv-card__badges">
        <span
          class="mv-badge"
          :class="offer.condition === 'used' ? 'mv-badge--used' : 'mv-badge--new'"
        >
          {{ offer.condition === 'used' ? 'Usado' : 'Nuevo' }}
        </span>
        <span class="mv-badge mv-badge--variant">{{ variantLabel }}</span>
      </div>

      <h3 class="mv-card__title">
        <a :href="offer.url" target="_blank" rel="nofollow noopener">{{ offer.title }}</a>
      </h3>

      <p class="mv-card__price">
        {{ movilidadMoney(offer.priceUyu)
        }}<span v-if="offer.currency === 'USD'" class="mv-card__usd">{{
          movilidadUsd(offer.price)
        }}</span>
      </p>
      <p v-if="move" class="mv-card__move" :class="move.down ? 'is-down' : 'is-up'">
        {{ move.text }}
      </p>

      <p class="mv-card__source">
        <NuxtLink v-if="storeKey" :to="localePath(`/tiendas-online-uruguay/${storeKey}`)">{{
          sellerLabel
        }}</NuxtLink>
        <template v-else>{{ sellerLabel }}</template>
        <span class="mv-card__seen"> · visto el {{ movilidadShortDate(offer.observedAt) }}</span>
      </p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { priceChangeLabel } from '~/utils/priceHistory'
import { storeSlugForSeller } from '~/utils/storeDirectory'
import {
  movilidadMoney,
  movilidadSellerLabel,
  movilidadShortDate,
  movilidadUsd,
  type MovilidadOffer,
} from '~/utils/movilidad'

const props = defineProps<{
  offer: MovilidadOffer
  /** El tipo dentro de la categoría ("Urbano o estándar"): es contra esa banda que se compara. */
  variantLabel: string
  /** `monopatin-electrico` / `bicicleta-electrica`: decide el ícono del aviso sin foto. */
  categoria: string
}>()

const localePath = useLocalePath()
const failed = ref(false)

const SOURCE_LABELS: Record<MovilidadOffer['source'], string> = {
  store: 'la tienda',
  mercadolibre: 'Mercado Libre',
  facebook: 'Facebook Marketplace',
}
const sourceLabel = computed(() => SOURCE_LABELS[props.offer.source])
const icon = computed(() =>
  props.categoria === 'bicicleta-electrica' ? 'mdi-bicycle-electric' : 'mdi-scooter-electric'
)

const sellerLabel = computed(() => movilidadSellerLabel(props.offer.seller, props.offer.source))

// El nombre del vendedor enlaza a su ficha sólo si esa tienda TIENE ficha (la ruta 404s de verdad
// si no), y nunca desde Facebook: el nombre visible de un particular de Marketplace no es la
// identidad de una empresa. Misma regla que las páginas hermanas.
const storeProfileKeys = useStoreProfileKeys()
const storeKey = computed(() => {
  if (props.offer.source === 'facebook') return null
  const key = storeSlugForSeller(props.offer.seller)
  return key && storeProfileKeys.value.includes(key) ? key : null
})

/** "bajó 9 %": la variación del PROPIO aviso, cuando tenemos dos lecturas suyas. */
const move = computed(() => {
  const series = props.offer.priceHistory
  const label = priceChangeLabel(series?.changePct ?? null)
  if (!series || !label || series.points.length < 2) return null
  return { text: label, down: (series.changePct ?? 0) < 0 }
})
</script>

<style scoped>
/*
 * Dos formas, como la tarjeta de autos y la de equipar: fila en el celular (foto a la izquierda,
 * cuatro o cinco por pantalla) y foto arriba desde 600px, donde la grilla tiene varias columnas.
 * El orden de lectura no cambia entre las dos, así que no hay `order`.
 */
.mv-card {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  height: 100%;
  padding: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.mv-card__photo {
  display: block;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.mv-card__photo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.mv-card__nophoto {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  opacity: 0.5;
}
/* Cualquier celda de grilla que pueda contener un título largo o una URL lleva min-width: 0. */
.mv-card__body {
  min-width: 0;
}
.mv-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}
.mv-badge {
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.5;
  letter-spacing: 0.0333em;
}
.mv-badge--new {
  background: rgba(var(--v-theme-success), 0.14);
  color: rgb(var(--v-theme-success));
}
.mv-badge--used {
  background: rgba(var(--v-theme-secondary), 0.16);
  color: rgb(var(--v-theme-secondary));
}
.mv-badge--variant {
  background: rgba(var(--v-theme-on-surface), 0.07);
  opacity: 0.86;
}
.mv-card__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.3;
  /* Dos líneas y corta: un título de Mercado Libre trae la ficha técnica entera. */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.mv-card__title a {
  color: inherit;
  text-decoration: none;
}
.mv-card__title a:hover,
.mv-card__title a:focus-visible {
  text-decoration: underline;
}
.mv-card__price {
  margin: 8px 0 0;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.mv-card__usd {
  display: block;
  font-size: 0.75rem;
  font-weight: 400;
  opacity: 0.72;
}
.mv-card__move {
  margin: 2px 0 0;
  font-size: 0.8rem;
  font-weight: 600;
}
.mv-card__move.is-down {
  color: rgb(var(--v-theme-success));
}
.mv-card__move.is-up {
  color: rgb(var(--v-theme-error));
}
.mv-card__source {
  margin: 6px 0 0;
  font-size: 0.8rem;
  opacity: 0.78;
  overflow-wrap: anywhere;
}
.mv-card__source :deep(a) {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
.mv-card__seen {
  white-space: nowrap;
}

@media (min-width: 600px) {
  .mv-card {
    grid-template-columns: minmax(0, 1fr);
    padding: 0 0 14px;
    overflow: hidden;
  }
  .mv-card__photo {
    border-radius: 12px 12px 0 0;
    aspect-ratio: 4 / 3;
  }
  .mv-card__body {
    padding: 0 14px;
  }
}
</style>
