<!--
  "¿Vale lo que piden?": dónde cae el precio del aviso entre los autos iguales (la barra de la
  comparativa de Mercado Libre, pero con la cohorte a la vista), qué se pide por sus kilómetros y qué
  conviene más por la misma plata. Los números salen de utils/carInsight.ts#buildCarInsight.
-->
<template>
  <section class="car-insight" data-testid="car-price-insight">
    <h2 class="text-h6 mb-3">¿Vale lo que piden?</h2>

    <template v-if="position">
      <div class="car-insight__verdict mb-3">
        <span class="car-insight__badge" :class="`car-insight__badge--${position.verdict}`">
          {{ VERDICT_LABELS[position.verdict] }}
        </span>
        <span class="text-body-2 text-medium-emphasis">{{ cohortLabel }}</span>
      </div>

      <div
        class="car-insight__bar"
        role="img"
        :aria-label="`Rango de ${formatCarUsd(position.min)} a ${formatCarUsd(position.max)}; mediana ${formatCarUsd(position.median)}; este aviso ${formatCarUsd(car.priceUsd)}`"
      >
        <div class="car-insight__track" />
        <div class="car-insight__rail">
          <div
            class="car-insight__band"
            :style="{
              left: `${at(position.p25)}%`,
              width: `${at(position.p75) - at(position.p25)}%`,
            }"
          />
          <div class="car-insight__median" :style="{ left: `${at(position.median)}%` }" />
          <div class="car-insight__marker" :style="{ left: `${at(car.priceUsd)}%` }">
            <span :class="['car-insight__marker-label', markerEdge]">
              Este: {{ formatCarUsd(car.priceUsd) }}
            </span>
          </div>
        </div>
      </div>
      <div class="car-insight__scale text-caption text-medium-emphasis mb-3">
        <span>{{ formatCarUsd(domain.min) }}</span>
        <span>mitad central {{ formatCarUsd(position.p25) }}–{{ formatCarUsd(position.p75) }}</span>
        <span>{{ formatCarUsd(domain.max) }}</span>
      </div>

      <p class="text-body-1 mb-2">
        Hay <strong>{{ position.n }} avisos comparables</strong> sin deuda ni choque declarados: la
        mitad pide menos de <strong>{{ formatCarUsd(position.median) }}</strong
        >. Este aviso pide {{ formatCarUsd(car.priceUsd) }}, {{ gapText(position.gap) }} la mediana,
        y es <strong>{{ cheaperText }}</strong
        >.
      </p>
      <VAlert
        v-if="position.verdict === 'muy-bajo'"
        type="warning"
        variant="outlined"
        density="compact"
        class="mb-2"
      >
        Un precio tan por debajo del resto suele tener un motivo: chapa, papeles, deudas, mecánica o
        que el número publicado sea una entrega. Preguntá antes de entusiasmarte.
      </VAlert>
      <p v-if="declares" class="text-body-2 text-medium-emphasis mb-2">
        Este aviso declara algo (ver arriba) y se compara contra autos que no declaran nada: es
        esperable que pida menos.
      </p>
      <p v-if="car.currencyInferred" class="text-body-2 text-medium-emphasis mb-2">
        Ojo: el aviso no dice la moneda y la dedujimos. Si el vendedor pide pesos y no dólares (o al
        revés), esta comparación no vale: confirmalo antes de sacar conclusiones.
      </p>
    </template>
    <template v-else>
      <p v-if="cohort" class="text-body-1 mb-2">
        Para {{ car.brand }} {{ car.model }} {{ cohort.trim || '' }} {{ car.year }} hay
        {{ cohort.n }} avisos, contando los que declaran deuda o choque: la mitad pide menos de
        <strong>{{ formatCarUsd(cohort.median) }}</strong> y el rango central va de
        {{ formatCarUsd(cohort.p25) }} a {{ formatCarUsd(cohort.p75) }}. Este aviso pide
        {{ formatCarUsd(car.priceUsd) }}.
      </p>
      <p class="text-body-2 text-medium-emphasis mb-2">
        Todavía no hay cinco avisos de {{ car.model }} {{ car.year }} sin deuda ni choque
        declarados, así que no damos un veredicto: con tan pocos, cualquier promedio es ruido.
      </p>
    </template>

    <p v-if="insight.km" class="text-body-1 mb-2" data-testid="car-insight-km">
      <strong>Corregido por kilómetros:</strong> con {{ formatCarKm(car.km) }} (la mediana de
      {{ insight.km.basis === 'version' ? 'su versión' : 'su año' }} es
      {{ formatCarKm(insight.km.kmMedian) }}), el mercado pide entre
      {{ formatCarUsd(insight.km.low) }} y {{ formatCarUsd(insight.km.high) }}, unos
      <strong>{{ formatCarUsd(insight.km.expected) }}</strong
      >. Este aviso está {{ gapText(insight.km.gap) }} eso.
      <template v-if="insight.km.perTenThousandUsd">
        Con lo que descuenta el mercado por kilómetro, en un {{ car.model }} de este año cada 10.000
        km de más son unos {{ formatCarUsd(insight.km.perTenThousandUsd) }} menos.
      </template>
    </p>
    <p v-else-if="insight.kmDoubtful" class="text-body-2 text-medium-emphasis mb-2">
      Los {{ formatCarKm(car.km) }} que dice el aviso son pocos para un auto de {{ car.year }} (o
      parecen un número de relleno), así que no los usamos para comparar: preguntá el kilometraje
      real.
    </p>
    <p v-if="insight.kmValue" class="text-body-2 mb-2">
      Si se ordenan los {{ insight.kmValue.of }} {{ car.model }} de años parecidos por lo que piden
      contra lo esperable para su año y sus km (1º es el que menos pide para lo que es), este queda
      <strong>{{ insight.kmValue.rank }}º</strong>.
    </p>

    <template v-if="sameModelPicks.length">
      <h3 class="text-subtitle-1 font-weight-bold mt-6 mb-1">
        Qué más hay de {{ car.brand }} {{ car.model }}
      </h3>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Sólo avisos vigentes sin deuda, choque ni moneda dudosa. "Por esta plata" es hasta un 5 %
        más de lo que pide este aviso; "el más barato por km recorrido" es el que menos pide contra
        lo esperable para su año y sus km. Pueden ser otra versión, cabina o motor: mirá el título
        antes de comparar.
      </p>
      <div class="car-insight__picks">
        <div v-for="item in sameModelPicks" :key="item.car.key" class="car-insight__pick">
          <p class="car-insight__pick-label">{{ pickLabel(item) }}</p>
          <p class="car-insight__pick-diff">{{ diffText(item.car) }}</p>
          <CarsListingCard :car="item.car" />
        </div>
      </div>
    </template>

    <template v-if="otherPicks.length || insight.alternatives.length">
      <h3 class="text-subtitle-1 font-weight-bold mt-6 mb-1">Otros modelos por la misma plata</h3>
      <p v-if="insight.band" class="text-body-2 text-medium-emphasis mb-3">
        Avisos de {{ formatCarUsd(insight.band.from) }} a {{ formatCarUsd(insight.band.to) }}
        <template v-if="insight.band.body">
          con carrocería {{ CAR_BODY_LABELS[insight.band.body].toLowerCase() }}</template
        >.
      </p>
      <div v-if="otherPicks.length" class="car-insight__picks mb-4">
        <div v-for="item in otherPicks" :key="item.car.key" class="car-insight__pick">
          <p class="car-insight__pick-label">{{ pickLabel(item) }}</p>
          <p class="car-insight__pick-diff">{{ diffText(item.car) }}</p>
          <CarsListingCard :car="item.car" />
        </div>
      </div>
      <VTable
        v-if="insight.alternatives.length"
        density="compact"
        class="car-insight__table cu-mobile-cards"
      >
        <thead>
          <tr>
            <th scope="col">Modelo</th>
            <th scope="col" class="text-end">Avisos</th>
            <th scope="col" class="text-end">Año típico</th>
            <th scope="col" class="text-end">Km típicos</th>
            <th scope="col" class="text-end">Precio típico</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="option in insight.alternatives" :key="option.marketSlug">
            <td data-label="" class="car-insight__model">
              <NuxtLink :to="localePath(carMarketPath(option.marketSlug))">
                {{ option.brand }} {{ option.model }}
              </NuxtLink>
            </td>
            <td class="text-end" data-label="Avisos">{{ option.adverts }}</td>
            <td class="text-end" data-label="Año típico">{{ option.medianYear }}</td>
            <td class="text-end" data-label="Km típicos">{{ formatCarKm(option.medianKm) }}</td>
            <td class="text-end" data-label="Precio típico">
              {{ formatCarUsd(option.medianUsd) }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </template>
  </section>
</template>

<script setup lang="ts">
import type { CarInsight, CarInsightPick, CarInsightVerdict } from '~/utils/carInsight'
import { CAR_BODY_LABELS, carMarketPath, formatCarKm, formatCarUsd } from '~/utils/cars'
import type { PublicCarListing, PublicCarMarketRow } from '~/utils/carsPublic'

const props = defineProps<{
  insight: CarInsight
  car: PublicCarListing
  /** La cohorte del snapshot de mercado (todos los avisos), para cuando no hay veredicto. */
  cohort?: PublicCarMarketRow | null
}>()
const localePath = useLocalePath()

const VERDICT_LABELS: Record<CarInsightVerdict, string> = {
  'muy-bajo': 'Muy por debajo del mercado',
  bajo: 'Por debajo del mercado',
  justo: 'En el precio del mercado',
  alto: 'Por encima del mercado',
  'muy-alto': 'Muy por encima del mercado',
}

const position = computed(() => props.insight.position)
const declares = computed(() => props.car.risks.length > 0 || props.car.flags.length > 0)

const cohortLabel = computed(() => {
  const value = position.value
  if (!value) return ''
  if (value.basis === 'version') return `contra la versión ${value.trim} ${props.car.year}`
  if (value.basis === 'year') return `contra los ${props.car.model} ${props.car.year}`
  return `contra los ${props.car.model} ${value.yearFrom}–${value.yearTo}`
})

/** El dominio de la barra incluye al aviso aunque pida más (o menos) que todos. */
const domain = computed(() => {
  const value = position.value
  if (!value) return { min: 0, max: 1 }
  return {
    min: Math.min(value.min, props.car.priceUsd),
    max: Math.max(value.max, props.car.priceUsd),
  }
})
const at = (price: number): number => {
  const { min, max } = domain.value
  if (max <= min) return 50
  return Math.min(100, Math.max(0, ((price - min) / (max - min)) * 100))
}

/** Cerca de un borde la etiqueta se apoya hacia adentro para no salirse de la página. */
const markerEdge = computed(() => {
  const left = at(props.car.priceUsd)
  return left < 15
    ? 'car-insight__marker-label--start'
    : left > 85
      ? 'car-insight__marker-label--end'
      : ''
})

const percent = (value: number): string => `${Math.round(Math.abs(value) * 100)} %`
const gapText = (gap: number): string =>
  Math.abs(gap) < 0.01
    ? 'justo en'
    : gap < 0
      ? `${percent(gap)} por debajo de`
      : `${percent(gap)} por encima de`

const cheaperText = computed(() => {
  const value = position.value
  if (!value) return ''
  const cheaper = value.cheaperShare
  if (cheaper === 0) return 'el más barato de los comparables'
  // Hacia abajo y nunca 10: si hay un solo comparable más barato, "10 de cada 10" sería falso.
  const ofTen = Math.min(9, Math.floor((1 - cheaper) * 10))
  if (ofTen <= 0) return 'de los más caros de los comparables'
  return `más barato que ${ofTen} de cada 10`
})

const PICK_LABELS: Record<CarInsightPick['kind'], string> = {
  'cheapest-same': 'El más barato del mismo año',
  'best-km-value': 'El más barato por km recorrido',
  'lowest-km-for-price': 'Por esta plata, el de menos km',
  'newest-for-price': 'Por esta plata, el más nuevo',
  'other-newest': 'El más nuevo de otro modelo',
  'other-lowest-km': 'El de menos km de otro modelo',
}
function pickLabel(item: CarInsightPick): string {
  // Si este aviso es el más barato, la tarjeta es el siguiente: "del mismo año" mentiría.
  if (item.kind === 'cheapest-same' && position.value?.cheaperShare === 0)
    return 'El más barato de los demás'
  if (item.kind === 'cheapest-same' && position.value?.basis === 'version')
    return 'El más barato de la misma versión y año'
  if (item.kind === 'cheapest-same' && position.value?.basis === 'years')
    return 'El más barato de años parecidos'
  return PICK_LABELS[item.kind]
}

const sameModelPicks = computed(() =>
  props.insight.picks.filter(item => !item.kind.startsWith('other-'))
)
const otherPicks = computed(() =>
  props.insight.picks.filter(item => item.kind.startsWith('other-'))
)

const grouped = (value: number): string => Math.round(value).toLocaleString('es-UY')
/** Contra este aviso: plata, km y año, en una línea. */
function diffText(other: PublicCarListing): string {
  const parts: string[] = []
  const money = other.priceUsd - props.car.priceUsd
  if (Math.abs(money) >= 50)
    parts.push(`US$ ${grouped(Math.abs(money))} ${money < 0 ? 'menos' : 'más'}`)
  else parts.push('mismo precio')
  if (other.km !== null && props.car.km !== null) {
    const km = other.km - props.car.km
    if (Math.abs(km) >= 500) parts.push(`${grouped(Math.abs(km))} km ${km < 0 ? 'menos' : 'más'}`)
  }
  const years = other.year - props.car.year
  if (years)
    parts.push(
      `${Math.abs(years)} año${Math.abs(years) > 1 ? 's' : ''} ${years > 0 ? 'más nuevo' : 'más viejo'}`
    )
  return `${parts.join(' · ')} que este`
}
</script>

<style scoped>
.car-insight__verdict {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}
.car-insight__badge {
  display: inline-block;
  font-weight: 700;
  font-size: 0.875rem;
  border-radius: 999px;
  padding: 4px 12px;
  border: 1px solid currentColor;
}
.car-insight__badge--muy-bajo,
.car-insight__badge--bajo {
  color: rgb(var(--v-theme-success));
}
.car-insight__badge--justo {
  color: rgb(var(--v-theme-info));
}
.car-insight__badge--alto,
.car-insight__badge--muy-alto {
  color: rgb(var(--v-theme-warning));
}
.car-insight__bar {
  position: relative;
  height: 44px;
  margin: 28px 0 4px;
}
/* El riel va 8px adentro de cada punta para que el marcador (16px) en un extremo no se salga, y la
   pista va al ras: así la barra arranca y termina exactamente donde el texto de arriba y de abajo. */
.car-insight__rail {
  position: absolute;
  inset: 0 8px;
}
.car-insight__track {
  position: absolute;
  left: 0;
  right: 0;
  top: 18px;
  height: 8px;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.1);
}
.car-insight__band {
  position: absolute;
  top: 18px;
  height: 8px;
  border-radius: 4px;
  background: rgba(var(--v-theme-primary), 0.45);
}
.car-insight__median {
  position: absolute;
  top: 12px;
  width: 2px;
  height: 20px;
  margin-left: -1px;
  background: rgb(var(--v-theme-on-surface));
}
.car-insight__marker {
  position: absolute;
  top: 10px;
  width: 16px;
  height: 24px;
  margin-left: -8px;
  border-radius: 8px;
  background: rgb(var(--v-theme-primary));
  border: 2px solid rgb(var(--v-theme-surface));
}
.car-insight__marker-label {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 0.8rem;
  font-weight: 700;
}
.car-insight__marker-label--start {
  left: 0;
  transform: none;
}
.car-insight__marker-label--end {
  left: auto;
  right: 0;
  transform: none;
}
.car-insight__scale {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.car-insight__picks {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}
/* Tres filas compartidas con las vecinas (subgrid): etiqueta, diferencia y tarjeta. Una etiqueta de
   dos líneas baja la fila entera y las tarjetas arrancan a la misma altura. */
.car-insight__pick {
  display: grid;
  grid-row: span 3;
  grid-template-rows: subgrid;
  row-gap: 0;
}
.car-insight__pick-label {
  font-weight: 700;
  font-size: 0.875rem;
  margin: 0;
}
.car-insight__pick-diff {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  margin: 0 0 6px;
}
.car-insight__model {
  font-weight: 500;
}
</style>
