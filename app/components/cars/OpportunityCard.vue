<template>
  <article class="deal-card">
    <div class="deal-card__head">
      <span class="deal-card__tier" :class="`deal-card__tier--${item.tier}`">
        {{ item.tier === 'strict' ? 'Comparación sólida' : 'Comparación exploratoria' }}
      </span>
      <span class="text-body-2 text-medium-emphasis">
        Ficha revisada el {{ formatCarDate(item.detailReadAt) }}
      </span>
    </div>
    <div class="deal-card__main">
      <img
        v-if="item.subject.picture"
        :src="item.subject.picture"
        :alt="item.subject.title"
        loading="lazy"
        width="160"
        height="107"
        referrerpolicy="no-referrer"
        class="deal-card__photo"
      />
      <div>
        <h3 class="text-subtitle-1 font-weight-bold mb-1">
          <NuxtLink v-if="!hideSubjectLink" :to="localePath(carPath(item.subject.key))">
            {{ item.subject.title }}
          </NuxtLink>
          <template v-else>{{ item.subject.title }}</template>
        </h3>
        <p class="text-body-2 mb-1">{{ facts }}</p>
        <p v-if="fuelEconomy" class="text-body-2 mb-1" data-testid="car-fuel-economy">
          <VIcon size="16" aria-hidden="true">mdi-gas-station-outline</VIcon>
          <strong>{{ fuelEconomy }}</strong>
          <span class="text-medium-emphasis"> · {{ fuelEconomySource }}</span>
        </p>
        <p class="text-h6 font-weight-bold mb-1">{{ formatCarUsd(item.subject.priceUsd) }}</p>
        <p v-if="listedNote" class="text-body-2 mb-1" data-testid="car-listed-price">
          {{ listedNote }}
        </p>
        <p v-if="negotiation" class="text-body-2 mb-1">{{ negotiation }}.</p>
        <p class="text-body-1 mb-0">
          <strong>{{ carPercent(item.gap) }} menos</strong> que la mediana ({{
            formatCarUsd(item.sample.median)
          }}) de {{ item.sample.n }} avisos del mismo modelo, año, versión, motor y caja, de
          {{ item.sample.sellers }} vendedores distintos. Sacando a cualquier vendedor de la
          muestra, la diferencia sigue en {{ carPercent(item.sellerSensitivityGap) }} o más.
        </p>
      </div>
    </div>
    <details class="deal-card__details">
      <summary>Ver los {{ item.comparables.length }} avisos comparables</summary>
      <div class="deal-card__table">
        <VTable class="cu-mobile-cards" density="compact">
          <thead>
            <tr>
              <th scope="col">Aviso</th>
              <th scope="col">Año</th>
              <th scope="col">Km</th>
              <th scope="col">Precio</th>
              <th scope="col">Vende</th>
              <th scope="col">Fuente</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="peer in item.comparables" :key="peer.key">
              <td data-label="">
                <a :href="peer.permalink" target="_blank" rel="nofollow noopener">{{
                  peer.title
                }}</a>
              </td>
              <td data-label="Año">{{ peer.year }}</td>
              <td data-label="Km">{{ formatCarKm(peer.km) }}</td>
              <td data-label="Precio">{{ formatCarUsd(peer.priceUsd) }}</td>
              <td data-label="Vende">
                {{ peer.sellerType ? CAR_SELLER_LABELS[peer.sellerType] : '—' }}
              </td>
              <td data-label="Fuente">{{ peer.sourceName }}</td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <p class="text-body-2 text-medium-emphasis mt-2">
        Rango central de la muestra: {{ formatCarUsd(item.sample.p25) }} –
        {{ formatCarUsd(item.sample.p75) }}. Km mediano {{ formatCarKm(item.sample.kmMedian) }};
        este auto no tiene más km que tres de cada cuatro comparables.
      </p>
    </details>
    <div class="d-flex flex-wrap ga-2 mt-3">
      <VBtn
        size="small"
        color="primary"
        :href="item.subject.permalink"
        target="_blank"
        rel="nofollow noopener"
        append-icon="mdi-open-in-new"
      >
        Ver en {{ item.subject.sourceName }}
      </VBtn>
      <VBtn size="small" variant="outlined" :to="localePath('/comprar-auto-con-deuda-uruguay')">
        Revisar deudas
      </VBtn>
    </div>
  </article>
</template>

<script setup lang="ts">
import {
  CAR_SELLER_LABELS,
  carFuelEconomySource,
  carListedPriceNote,
  carPath,
  carPercent,
  formatCarDate,
  formatCarFuelEconomy,
  formatCarKm,
  formatCarPrice,
  formatCarUsd,
} from '~/utils/cars'
import type { PublicCarOpportunityItem } from '~/utils/carsPublic'

const props = defineProps<{ item: PublicCarOpportunityItem; hideSubjectLink?: boolean }>()
const localePath = useLocalePath()
// El precio de la oportunidad es el de contado que dice el aviso; si el portal muestra otro número
// (casi siempre la entrega), se dice cuál, para que nadie llegue al aviso esperando ese precio.
const listedNote = computed(() => carListedPriceNote(props.item.subject))
const fuelEconomy = computed(() => formatCarFuelEconomy(props.item.subject.fuelEconomy))
const fuelEconomySource = computed(() => carFuelEconomySource(props.item.subject.fuelEconomy))
/**
 * Las dos señales que ya teníamos guardadas y no mostrábamos, y que son justo las que usa quien va a
 * negociar: que el precio YA bajó —lo vimos nosotros, no lo dice el aviso— y cuánto lleva publicado.
 */
const negotiation = computed(() => {
  const subject = props.item.subject
  const parts: string[] = []
  if (subject.priceDrop) {
    const cut = subject.priceDrop.from - subject.price
    parts.push(
      `Bajó ${formatCarPrice({ price: cut, currency: subject.currency })} desde que lo vemos`
    )
  }
  const days = Math.floor((Date.now() - Date.parse(subject.firstSeen)) / 86_400_000)
  if (days >= 21) parts.push(`${parts.length ? 'y l' : 'L'}leva ${days} días publicado`)
  return parts.join(' ')
})

const facts = computed(() =>
  [
    String(props.item.subject.year),
    formatCarKm(props.item.subject.km),
    props.item.subject.trim,
    props.item.subject.engine,
    props.item.subject.department,
  ]
    .filter(Boolean)
    .join(' · ')
)
</script>

<style scoped>
.deal-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  padding: 16px;
  background: rgb(var(--v-theme-surface));
}
.deal-card__head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.deal-card__tier {
  font-size: 0.8rem;
  font-weight: 700;
  border: 1px solid currentColor;
  border-radius: 999px;
  padding: 2px 10px;
}
.deal-card__tier--strict {
  color: rgb(var(--v-theme-success));
}
.deal-card__tier--exploratory {
  color: rgb(var(--v-theme-info));
}
.deal-card__main {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.deal-card__photo {
  width: 160px;
  height: auto;
  border-radius: 8px;
  flex-shrink: 0;
  object-fit: cover;
}
@media (max-width: 599px) {
  .deal-card__main {
    flex-direction: column;
  }
  .deal-card__photo {
    width: 100%;
  }
}
.deal-card__details summary {
  cursor: pointer;
  font-weight: 600;
  margin-top: 12px;
  min-height: 44px;
  display: flex;
  align-items: center;
}
.deal-card__table {
  overflow-x: auto;
}
</style>
