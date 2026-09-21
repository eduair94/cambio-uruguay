<template>
  <article class="car-card" :data-car-key="car.key">
    <NuxtLink :to="localePath(carPath(car.key))" class="car-card__photo" :aria-label="car.title">
      <img
        v-if="car.picture && !failed"
        :src="car.picture"
        :alt="car.title"
        loading="lazy"
        width="360"
        height="240"
        referrerpolicy="no-referrer"
        @error="failed = true"
      />
      <span v-else class="car-card__nophoto"><VIcon icon="mdi-car-outline" size="40" /></span>
    </NuxtLink>
    <div class="car-card__body">
      <div v-if="car.opportunity || car.priceDrop || car.flags.length" class="car-card__badges">
        <span v-if="car.opportunity" class="car-badge car-badge--deal">
          {{ carPercent(car.opportunity.gap) }} bajo la mediana
        </span>
        <span v-if="car.priceDrop" class="car-badge car-badge--drop">
          Bajó
          {{ formatCarPrice({ price: car.priceDrop.from - car.price, currency: car.currency }) }}
        </span>
        <span v-if="car.flags.length" class="car-badge car-badge--flag">
          {{ CAR_FLAG_LABELS[car.flags[0]!] }}
        </span>
      </div>
      <h3 class="car-card__title">
        <NuxtLink :to="localePath(carPath(car.key))">{{ car.title }}</NuxtLink>
      </h3>
      <p class="car-card__price">
        {{ formatCarPrice(car) }}
        <span v-if="car.priceConverted" class="text-caption text-medium-emphasis">
          (≈ {{ formatCarUsd(car.priceUsd) }})
        </span>
        <span v-if="car.currencyInferred" class="text-caption text-medium-emphasis">
          (moneda estimada)
        </span>
      </p>
      <p v-if="listedNote" class="car-card__listed" data-testid="car-listed-price">
        {{ listedNote }}
      </p>
      <p class="car-card__facts">{{ facts }}</p>
      <p
        v-if="fuelEconomy"
        class="car-card__kml"
        :title="fuelEconomySource ?? undefined"
        data-testid="car-fuel-economy"
      >
        <VIcon size="16" aria-hidden="true">mdi-gas-station-outline</VIcon>
        <span class="car-card__kml-label">Consumo</span>
        <span class="car-card__kml-value">{{ fuelEconomy }}</span>
        <span v-if="car.fuelEconomy?.basis !== 'advert'" class="car-card__kml-note">estimado</span>
      </p>
      <p v-if="place" class="car-card__place">{{ place }}</p>
      <p class="car-card__source">{{ car.sourceName }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import {
  carFuelEconomySource,
  carListedPriceNote,
  CAR_FLAG_LABELS,
  CAR_FUEL_LABELS,
  CAR_SELLER_LABELS,
  CAR_TRANSMISSION_LABELS,
  carPath,
  carPercent,
  formatCarBody,
  formatCarFuelEconomy,
  formatCarKm,
  formatCarPrice,
  formatCarUsd,
} from '~/utils/cars'
import type { PublicCarListing } from '~/utils/carsPublic'

const props = defineProps<{ car: PublicCarListing }>()
const listedNote = computed(() => carListedPriceNote(props.car))
const fuelEconomy = computed(() => formatCarFuelEconomy(props.car.fuelEconomy))
const fuelEconomySource = computed(() => carFuelEconomySource(props.car.fuelEconomy))
const localePath = useLocalePath()
const failed = ref(false)
const facts = computed(() =>
  [
    String(props.car.year),
    formatCarKm(props.car.km),
    formatCarBody(props.car.body),
    props.car.transmission && CAR_TRANSMISSION_LABELS[props.car.transmission],
    props.car.fuel && CAR_FUEL_LABELS[props.car.fuel],
  ]
    .filter(Boolean)
    .join(' · ')
)
const place = computed(() =>
  [
    props.car.neighborhood,
    props.car.department,
    props.car.sellerType && CAR_SELLER_LABELS[props.car.sellerType],
  ]
    .filter(Boolean)
    .join(' · ')
)
</script>

<style scoped>
/*
 * Dos formas para la misma ficha. En mobile es una FILA (foto a la izquierda, datos a la
 * derecha): la tarjeta con foto 3:2 a todo el ancho medía 396 px y entraban dos avisos por
 * pantalla, o sea doce pantallas para ver una página de 24. La fila mide ~128 px y entran
 * cinco, que es la densidad con la que la gente ya compara autos en Mercado Libre.
 * De 600 px para arriba vuelve la tarjeta: ahí la grilla tiene varias columnas y la foto
 * grande sí ayuda a elegir. El orden de lectura no cambia entre las dos (qué auto es, cuánto
 * sale, de qué año), así que no hay `order`: es el orden del HTML.
 */
.car-card {
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
  padding: 10px;
}
.car-card__photo {
  position: relative;
  /* Encima del enlace que cubre la fila, para que la foto conserve el suyo. */
  z-index: 1;
  display: block;
  aspect-ratio: 4 / 3;
  /* Sin esto una foto vertical (las webs mandan retratos) estira la celda. */
  overflow: hidden;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.car-card__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.car-card__nophoto {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.car-card__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 0;
}
.car-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 2px;
}
.car-badge {
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 999px;
  padding: 2px 8px;
  border: 1px solid currentColor;
}
.car-badge--deal {
  color: rgb(var(--v-theme-success));
}
.car-badge--drop {
  color: rgb(var(--v-theme-info));
}
.car-badge--flag {
  color: rgb(var(--v-theme-warning));
}
.car-card__title {
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.35;
  margin: 0;
  /* Dos renglones y corta: un título largo de Mercado Libre empujaba el precio fuera de la fila. */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.car-card__title a {
  color: inherit;
  text-decoration: none;
}
.car-card__title a:hover {
  text-decoration: underline;
}
/* El enlace del título cubre la fila entera: en mobile el blanco de la tarjeta es el
   objetivo más grande que hay y tocarlo tiene que llevar al aviso. */
.car-card__title a::after {
  content: '';
  position: absolute;
  inset: 0;
}
.car-card__price {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.25;
  margin: 2px 0 0;
}
.car-card__kml {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  /* Un renglon, siempre: con el icono adentro de un flex, "Consumo ~ 7,3 L/100 km" mas
     "estimado" envolvia y cada ficha quedaba de un alto distinto. */
  white-space: nowrap;
  overflow: hidden;
}
/*
 * En la fila angosta la palabra "Consumo" se comia el dato: quedaba "Consumo ~ 7..." y el
 * numero, que es lo unico que se compara, no entraba. El icono de surtidor ya dice de que
 * se trata, asi que la palabra sale de la vista pero NO del arbol de accesibilidad.
 */
.car-card__kml-label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
.car-card__kml-value {
  overflow: hidden;
  text-overflow: ellipsis;
}
.car-card__kml-note {
  font-size: 0.75rem;
  font-weight: 400;
  opacity: 0.8;
  flex: 0 0 auto;
}
.car-card__listed {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.4;
  /* Es una aclaracion importante (el precio publicado es de contado) pero no puede
     empujar la ficha al doble de alto: dos renglones y corta. */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.car-card__facts,
.car-card__place,
.car-card__source {
  font-size: 0.8rem;
  margin: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.car-card__facts,
.car-card__place,
.car-card__source {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (min-width: 600px) {
  .car-card {
    display: flex;
    flex-direction: column;
    padding: 0;
    gap: 0;
  }
  .car-card__photo {
    aspect-ratio: 3 / 2;
    border-radius: 0;
  }
  .car-card__body {
    padding: 12px 14px 14px;
    gap: 4px;
  }
  .car-card__title {
    display: block;
    overflow: visible;
    font-size: 1rem;
    line-height: 1.3;
  }
  .car-card__price {
    margin: 0;
  }
  .car-card__facts,
  .car-card__place,
  .car-card__source {
    font-size: 0.875rem;
    white-space: normal;
  }
  /*
   * La linea de consumo queda igual de ancha que en mobile y en UN renglon. La palabra
   * "Consumo" sigue oculta a la vista tambien aca: el icono de surtidor ya lo dice, y
   * restituirla partia la linea en dos renglones desalineados ("≈ 7,1" arriba, "Consumo
   * L/100 km" abajo). Sigue estando para el lector de pantalla.
   */
  .car-card__kml {
    flex-wrap: wrap;
    overflow: visible;
  }
  .car-card__kml-value {
    white-space: nowrap;
    overflow: visible;
  }
  /*
   * Las tarjetas de una fila miden todas lo mismo (grilla), asi que la que tiene menos
   * texto dejaba un hueco suelto abajo. Anclando la fuente al pie, ese aire queda ARRIBA
   * de una linea que siempre esta, y la fila lee pareja en vez de rota.
   */
  .car-card__source {
    margin-top: auto;
    padding-top: 4px;
  }
  .car-card__listed {
    display: block;
    overflow: visible;
  }
}
</style>
