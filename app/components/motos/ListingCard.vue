<template>
  <!--
    La misma ficha que autos (components/cars/ListingCard.vue): fila con foto en el celular,
    tarjeta con foto 3:2 desde 600 px, y el título como enlace que cubre la tarjeta entera. Lo que
    cambia es lo que se lee: la cilindrada va con su base (≈ si es estimada) y el tipo de moto.
  -->
  <article class="moto-card" :data-moto-key="moto.key">
    <NuxtLink
      :to="localePath(motoAvisoPath(moto.key))"
      class="moto-card__photo"
      :aria-label="moto.title"
    >
      <img
        v-if="moto.picture && !failed"
        :src="moto.picture"
        :alt="moto.title"
        loading="lazy"
        width="360"
        height="240"
        referrerpolicy="no-referrer"
        @error="failed = true"
      />
      <span v-else class="moto-card__nophoto"><VIcon icon="mdi-motorbike" size="40" /></span>
    </NuxtLink>
    <div class="moto-card__body">
      <div v-if="moto.priceDrop || risk || moto.specs?.uniqueOwner" class="moto-card__badges">
        <span v-if="moto.priceDrop" class="moto-badge moto-badge--drop">
          Bajó {{ motoMoney(moto.priceDrop.from - moto.price, moto.currency) }}
        </span>
        <span v-if="risk" class="moto-badge moto-badge--flag">{{ risk }}</span>
        <span v-if="moto.specs?.uniqueOwner" class="moto-badge moto-badge--plain">Único dueño</span>
      </div>
      <h3 class="moto-card__title">
        <NuxtLink :to="localePath(motoAvisoPath(moto.key))">{{ motoName(moto) }}</NuxtLink>
      </h3>
      <p v-if="sellerTitle" class="moto-card__seller-title">«{{ sellerTitle }}»</p>
      <p class="moto-card__price">
        {{ motoMoney(moto.price, moto.currency) }}
        <span v-if="moto.priceConverted" class="text-caption text-medium-emphasis">
          (≈ {{ motoUsd(moto.priceUsd) }})
        </span>
        <span v-if="moto.currencyInferred" class="text-caption text-medium-emphasis">
          (moneda estimada)
        </span>
      </p>
      <p class="moto-card__facts">{{ facts }}</p>
      <p
        v-if="displacement"
        class="moto-card__cc"
        :title="displacementSource ?? undefined"
        data-testid="moto-displacement"
      >
        <VIcon size="16" aria-hidden="true">mdi-engine-outline</VIcon>
        <span class="moto-card__cc-value">{{ displacement }}</span>
        <span v-if="motoDisplacementEstimated(moto)" class="moto-card__cc-note">estimada</span>
      </p>
      <p v-if="place" class="moto-card__place">{{ place }}</p>
      <p class="moto-card__source">{{ moto.sourceName }}</p>
      <MotosCompareLink :moto-key="moto.key" />
    </div>
  </article>
</template>

<script setup lang="ts">
import {
  MOTO_RISK_GUIDE,
  MOTO_TYPE_LABEL,
  motoAvisoPath,
  motoDisplacementEstimated,
  motoDisplacementSource,
  motoDisplacementText,
  motoKmLabel,
  motoMoney,
  motoName,
  motoPlace,
  motoSellerTitle,
  motoUsd,
} from '~/utils/motos'
import type { MotoPublicListing } from '~/utils/motosPublic'

const props = defineProps<{ moto: MotoPublicListing }>()
const localePath = useLocalePath()
const failed = ref(false)
const displacement = computed(() => motoDisplacementText(props.moto))
const displacementSource = computed(() => motoDisplacementSource(props.moto))
const facts = computed(() =>
  [
    String(props.moto.year),
    motoKmLabel(props.moto.km),
    props.moto.type ? MOTO_TYPE_LABEL[props.moto.type] : null,
    props.moto.fuel === 'electrica' ? 'Eléctrica' : null,
  ]
    .filter(Boolean)
    .join(' · ')
)
const place = computed(() => motoPlace(props.moto))
const sellerTitle = computed(() => motoSellerTitle(props.moto))
// `?? []`: durante un despliegue la API todavía puede contestar filas sin `risks`.
const risk = computed(() => {
  const first = (props.moto.risks ?? []).find(item => item.severity === 'alta')
  return first ? (MOTO_RISK_GUIDE[first.category]?.label ?? null) : null
})
</script>

<style scoped>
.moto-card {
  position: relative;
  display: grid;
  grid-template-columns: 116px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  height: 100%;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  padding: 12px;
}
.moto-card__photo {
  position: relative;
  z-index: 1;
  display: block;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.moto-card__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.moto-card__nophoto {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.moto-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.moto-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 4px;
}
/* Radio fijo y no píldora, por lo mismo que en autos: una etiqueta larga envuelve en dos líneas. */
.moto-badge {
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.3;
  border-radius: 8px;
  padding: 3px 10px;
  border: 1px solid currentColor;
}
.moto-badge--drop {
  color: rgb(var(--v-theme-info));
}
.moto-badge--flag {
  color: rgb(var(--v-theme-warning));
}
.moto-badge--plain {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
/* En el tema claro los tokens no llegan a 4,5:1 a 12 px (medido en autos): un tono más oscuro. */
.v-theme--light .moto-badge--flag {
  color: #9a5800;
}
.v-theme--light .moto-badge--drop {
  color: #00695c;
}
.moto-card__title {
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.35;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.moto-card__title a {
  color: inherit;
  text-decoration: none;
}
.moto-card__title a:hover {
  text-decoration: underline;
}
.moto-card__title a::after {
  content: '';
  position: absolute;
  inset: 0;
}
.moto-card__price {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.25;
  margin: 4px 0 0;
}
.moto-card__cc {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
}
.moto-card__cc-note {
  font-size: 0.75rem;
  font-weight: 400;
  opacity: 0.8;
}
.moto-card__seller-title {
  margin: 0;
  font-size: 0.8rem;
  font-style: italic;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.moto-card__facts,
.moto-card__place,
.moto-card__source {
  font-size: 0.8rem;
  margin: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (min-width: 600px) {
  .moto-card {
    display: flex;
    flex-direction: column;
    /* Sin esto la foto diferida mide 0 px hasta cargar y la grilla salta (medido en autos). */
    align-items: stretch;
    padding: 0;
    gap: 0;
  }
  .moto-card__photo {
    aspect-ratio: 3 / 2;
    border-radius: 0;
  }
  .moto-card__body {
    padding: 12px;
  }
  .moto-card__title {
    display: block;
    overflow: visible;
    font-size: 1rem;
    line-height: 1.3;
  }
  .moto-card__price {
    margin: 0;
  }
  .moto-card__facts,
  .moto-card__place,
  .moto-card__source {
    font-size: 0.875rem;
    white-space: normal;
  }
  /* La fuente al pie: el aire de la tarjeta más corta queda arriba de una línea que siempre está. */
  .moto-card__source {
    margin-top: auto;
    padding-top: 4px;
  }
}
</style>
