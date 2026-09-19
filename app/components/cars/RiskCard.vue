<template>
  <article class="risk-card">
    <div class="risk-card__head">
      <span v-for="risk in item.risks" :key="risk.category" class="risk-card__tag">
        {{ CAR_RISK_GUIDE[risk.category].label }}
      </span>
      <span class="text-body-2 text-medium-emphasis">
        {{ CAR_RISK_SEVERITY_LABELS[item.severity] }}
      </span>
    </div>
    <div class="risk-card__main">
      <img
        v-if="item.subject.picture"
        :src="item.subject.picture"
        :alt="item.subject.title"
        loading="lazy"
        width="160"
        height="107"
        referrerpolicy="no-referrer"
        class="risk-card__photo"
      />
      <div>
        <h3 class="text-subtitle-1 font-weight-bold mb-1">
          <NuxtLink :to="localePath(carPath(item.subject.key))">{{ item.subject.title }}</NuxtLink>
        </h3>
        <p class="text-body-2 mb-1">{{ facts }}</p>
        <p v-if="fuelEconomy" class="text-body-2 mb-1" data-testid="car-fuel-economy">
          <VIcon size="16" aria-hidden="true">mdi-gas-station-outline</VIcon>
          Consumo <strong>{{ fuelEconomy }}</strong>
          <span class="text-medium-emphasis"> · {{ fuelEconomySource }}</span>
        </p>
        <p class="text-h6 font-weight-bold mb-1">{{ formatCarUsd(item.subject.priceUsd) }}</p>
        <p v-if="item.gap !== null && item.median !== null" class="text-body-1 mb-0">
          <strong>{{ formatCarRiskGap(item.gap) }}</strong> que la mediana de
          {{ formatCarUsd(item.median) }} de {{ item.n }} avisos del mismo modelo, año, versión,
          motor y caja <strong>que no declaran nada</strong>, de {{ item.sellers }} vendedores.
        </p>
        <p v-else class="text-body-2 text-medium-emphasis mb-0">
          Sin avisos suficientes del mismo auto sin declarar nada: no se publica un descuento que no
          se pudo medir.
        </p>
      </div>
    </div>
    <div class="risk-card__quotes">
      <p class="text-body-2 text-medium-emphasis mb-1">Lo dice el aviso:</p>
      <blockquote v-for="risk in item.risks" :key="risk.category" class="risk-card__quote">
        <q>{{ risk.quote }}</q>
        <span class="text-caption text-medium-emphasis">
          — {{ risk.from === 'title' ? 'título del aviso' : 'descripción del aviso' }}
        </span>
      </blockquote>
    </div>
    <details class="risk-card__details">
      <summary>Qué hay que revisar antes de señar</summary>
      <ul class="pl-5 mt-2">
        <li v-for="risk in item.risks" :key="risk.category" class="mb-2">
          <strong>{{ CAR_RISK_GUIDE[risk.category].label }}:</strong>
          {{ CAR_RISK_GUIDE[risk.category].meaning }}
          {{ CAR_RISK_GUIDE[risk.category].check }}
        </li>
      </ul>
    </details>
    <p v-if="item.photoConfirms" class="text-body-2 mb-0">
      Las fotos del aviso muestran el daño que el aviso declara.
    </p>
    <p class="text-body-2 mb-0">
      <a :href="item.subject.permalink" target="_blank" rel="nofollow noopener">
        Ver el aviso en {{ item.subject.sourceName }}
      </a>
    </p>
  </article>
</template>

<script setup lang="ts">
import type { PublicCarRiskItem } from '~/utils/carsPublic'
import { CAR_RISK_GUIDE, CAR_RISK_SEVERITY_LABELS, formatCarRiskGap } from '~/utils/carsRisk'
import {
  carFuelEconomySource,
  carPath,
  formatCarFuelEconomy,
  formatCarKm,
  formatCarUsd,
} from '~/utils/cars'

const props = defineProps<{ item: PublicCarRiskItem }>()
const localePath = useLocalePath()
const fuelEconomy = computed(() => formatCarFuelEconomy(props.item.subject.fuelEconomy))
const fuelEconomySource = computed(() => carFuelEconomySource(props.item.subject.fuelEconomy))

const facts = computed(() => {
  const subject = props.item.subject
  return [
    subject.year,
    subject.km === null ? null : formatCarKm(subject.km),
    subject.trim,
    subject.engine,
    subject.department,
    subject.sellerType === 'dealer' ? 'automotora' : 'dueño',
  ]
    .filter(Boolean)
    .join(' · ')
})
</script>

<style scoped>
.risk-card {
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.risk-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.risk-card__tag {
  background: rgb(var(--v-theme-warning));
  color: rgb(var(--v-theme-on-warning));
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 0.78rem;
  font-weight: 600;
}
.risk-card__main {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}
.risk-card__photo {
  width: 160px;
  height: 107px;
  object-fit: cover;
  border-radius: 8px;
  flex: none;
}
.risk-card__quotes {
  border-left: 3px solid rgba(var(--v-border-color), 0.35);
  padding-left: 12px;
}
.risk-card__quote {
  margin: 0 0 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.risk-card__details summary {
  cursor: pointer;
  font-weight: 600;
}
@media (max-width: 599px) {
  .risk-card__main {
    flex-direction: column;
  }
  .risk-card__photo {
    width: 100%;
    height: auto;
    aspect-ratio: 3 / 2;
  }
}
</style>
