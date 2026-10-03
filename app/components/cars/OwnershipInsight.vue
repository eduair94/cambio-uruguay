<!--
  Lo que el precio no dice: cuánto pierde el modelo por año, cuánto cuesta tenerlo y los datos que
  ya mide el sitio para el asesor de compra (repuestos, Latin NCAP, negociación). Los números salen
  de utils/carInsight.ts#buildCarInsight; los costos usan la misma función que /que-auto-comprar.
-->
<template>
  <section class="car-owning" data-testid="car-ownership-insight">
    <h2 class="text-h6 mb-3">Lo que el precio no dice</h2>
    <VRow>
      <VCol v-if="insight.depreciation" cols="12" md="6">
        <h3 class="text-subtitle-1 font-weight-bold mb-1">Cuánto pierde por año</h3>
        <p class="text-body-2 mb-3">
          {{
            insight.depreciation.fromMarket
              ? `No hay curva propia del ${car.model}: un auto usado típico pierde`
              : `Un ${car.model} pierde`
          }}
          <strong>{{ percent(insight.depreciation.annualDrop) }} por año</strong>. Al año, este auto
          pediría unos {{ formatCarUsd(insight.depreciation.inOneYearUsd) }} ({{
            formatCarUsd(insight.depreciation.lossPerYearUsd)
          }}
          menos).
        </p>
        <div
          v-if="bars.length >= 3"
          class="car-owning__bars"
          role="img"
          :aria-label="`Precio mediano por año del ${car.model}`"
        >
          <div
            v-for="bar in bars"
            :key="bar.year"
            class="car-owning__bar"
            :class="{ 'car-owning__bar--this': bar.year === car.year }"
            :title="`${bar.year}: ${formatCarUsd(bar.medianUsd)} (${bar.n} avisos)`"
          >
            <span class="car-owning__bar-fill" :style="{ height: `${bar.height}%` }" />
            <span class="car-owning__bar-year">{{ String(bar.year).slice(2) }}</span>
          </div>
        </div>
        <p v-if="bars.length >= 3" class="text-caption text-medium-emphasis mt-1 mb-0">
          Precio mediano pedido por año de modelo; resaltado, el {{ car.year
          }}<template v-if="thisYear"> ({{ formatCarUsd(thisYear.medianUsd) }})</template>.
        </p>
      </VCol>

      <VCol v-if="insight.costs" cols="12" md="6">
        <h3 class="text-subtitle-1 font-weight-bold mb-1">Cuánto cuesta tenerlo</h3>
        <p class="text-body-2 mb-2">
          Haciendo {{ grouped(insight.costs.kmYear) }} km por año:
          <strong>{{ uyu(insight.costs.monthlyCashUyu) }} por mes</strong> de bolsillo, y
          {{ uyu(insight.costs.annualUyu) }} por año contando lo que pierde de valor.
        </p>
        <VTable density="compact" class="car-owning__table">
          <tbody>
            <tr>
              <th scope="row">
                {{ insight.costs.fuel === 'electrico' ? 'Electricidad' : 'Combustible' }}
                <span class="d-block text-caption text-medium-emphasis">{{ fuelNote }}</span>
              </th>
              <td class="text-end">{{ uyu(insight.costs.fuelUyu) }}</td>
            </tr>
            <tr>
              <th scope="row">
                Patente
                <span class="d-block text-caption text-medium-emphasis"
                  >estimada, SUCIVE 2026, antes de bonificaciones</span
                >
              </th>
              <td class="text-end">{{ uyu(insight.costs.patenteUyu) }}</td>
            </tr>
            <tr>
              <th scope="row">Seguro obligatorio (SOA)</th>
              <td class="text-end">{{ uyu(insight.costs.soaUyu) }}</td>
            </tr>
            <tr>
              <th scope="row">
                Mantenimiento
                <span v-if="insight.parts?.index" class="d-block text-caption text-medium-emphasis">
                  ajustado por lo que salen sus repuestos
                </span>
              </th>
              <td class="text-end">{{ uyu(insight.costs.maintenanceUyu) }}</td>
            </tr>
            <tr v-if="insight.costs.depreciationKnown">
              <th scope="row">Pérdida de valor</th>
              <td class="text-end">{{ uyu(insight.costs.depreciationUyu) }}</td>
            </tr>
            <tr class="car-owning__total">
              <th scope="row">Por año</th>
              <td class="text-end">{{ uyu(insight.costs.annualUyu) }}</td>
            </tr>
          </tbody>
        </VTable>
        <p class="text-caption text-medium-emphasis mt-1 mb-0">
          Sin seguro voluntario ni estacionamiento. Compará modelos con tus kilómetros en el
          <NuxtLink :to="localePath(CAR_ADVISOR_PATH)">asesor de compra</NuxtLink> o contra el
          ómnibus en
          <NuxtLink :to="localePath('/conviene-auto-moto-o-omnibus-uruguay')"
            >¿conviene auto, moto u ómnibus?</NuxtLink
          >.
        </p>
      </VCol>
    </VRow>

    <template v-if="facts.length || insight.safety.ncap.length || insight.parts">
      <h3 class="text-subtitle-1 font-weight-bold mt-6 mb-2">Datos para decidir</h3>
      <ul class="car-owning__facts">
        <li v-for="fact in facts" :key="fact" class="text-body-2">{{ fact }}</li>
        <li v-if="insight.parts" class="text-body-2">
          Repuestos en Mercado Libre (medianas, leídas el
          {{ formatCarDate(insight.parts.readAt) }}):
          <span v-for="(part, index) in insight.parts.parts" :key="part.key">
            {{ CAR_PART_LABELS[part.key].toLowerCase() }} {{ uyu(part.median)
            }}{{ index < insight.parts.parts.length - 1 ? ', ' : '.' }}
          </span>
        </li>
        <li v-if="insight.safety.ncap.length" class="text-body-2">
          Latin NCAP ensayó este modelo
          <template v-for="(entry, index) in insight.safety.ncap" :key="entry.url">
            <a :href="entry.url" target="_blank" rel="noopener">{{ latinNcapLabel(entry) }}</a
            >{{ index < insight.safety.ncap.length - 1 ? '; ' : '.' }}
          </template>
          Cada ensayo vale para una versión y un equipamiento: confirmá cuál corresponde a este
          auto.
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { CAR_ADVISOR_PATH, CAR_PART_LABELS, latinNcapLabel } from '~/utils/carAdvisorFigures'
import type { CarInsight } from '~/utils/carInsight'
import { CAR_FUEL_LABELS, formatCarDate, formatCarUsd } from '~/utils/cars'
import type { PublicCarAdvisorShare, PublicCarListing } from '~/utils/carsPublic'

const props = defineProps<{ insight: CarInsight; car: PublicCarListing }>()
const localePath = useLocalePath()

const grouped = (value: number): string => Math.round(value).toLocaleString('es-UY')
const uyu = (value: number): string => `$ ${grouped(value)}`
const percent = (value: number): string =>
  `${(Math.round(Math.abs(value) * 1000) / 10).toLocaleString('es-UY')} %`

const fuelNote = computed(() => {
  const costs = props.insight.costs
  if (!costs) return ''
  if (costs.fuel === 'electrico')
    return `${costs.consumption} kWh/100 km, tarifa residencial de UTE`
  const liters = costs.consumption?.toLocaleString('es-UY', { maximumFractionDigits: 1 })
  const price = costs.fuel === 'diesel' ? costs.fuelPrices.gasoil50s : costs.fuelPrices.super95
  const source = costs.consumptionEstimated
    ? 'consumo típico'
    : props.car.fuelEconomy?.basis === 'advert'
      ? 'consumo que declara el aviso'
      : 'consumo del modelo'
  const fuel = costs.fuelAssumed
    ? `${CAR_FUEL_LABELS[costs.fuel].toLowerCase()} (el aviso no lo dice)`
    : CAR_FUEL_LABELS[costs.fuel].toLowerCase()
  return `${liters} L/100 km (${source}), ${fuel} a $ ${price.toLocaleString('es-UY')}`
})

const bars = computed(() => {
  const points = props.insight.depreciation?.points ?? []
  const max = Math.max(...points.map(point => point.medianUsd), 1)
  return points.slice(-12).map(point => ({ ...point, height: (point.medianUsd / max) * 100 }))
})

const thisYear = computed(() => bars.value.find(bar => bar.year === props.car.year) ?? null)

const shareText = (label: string, share: PublicCarAdvisorShare | null): string | null =>
  share ? `${label} ${Math.round(share.share * 100)} %` : null

const facts = computed(() => {
  const list: string[] = []
  const { insight, car } = props
  if (insight.parts?.index) {
    const index = insight.parts.index
    const diff = Math.round(Math.abs(index - 1) * 100)
    list.push(
      diff < 5
        ? `Sus repuestos cuestan más o menos lo mismo que los de un auto promedio.`
        : `Sus repuestos salen ${diff} % ${index < 1 ? 'menos' : 'más'} que los de un auto promedio.`
    )
  }
  const equipment = [
    shareText('ABS', insight.safety.abs),
    shareText('airbags', insight.safety.airbags),
    shareText('control de estabilidad', insight.safety.esc),
  ].filter((item): item is string => !!item)
  if (equipment.length)
    list.push(`Entre las fichas de ${car.model} que lo informan: ${equipment.join(', ')}.`)
  if (insight.negotiation) {
    list.push(
      `Negociación: de cada 10 avisos que cambian de precio, ${Math.round(insight.negotiation.cutShare * 10)} bajan, con un recorte mediano de ${percent(insight.negotiation.medianCut)} (últimos ${insight.negotiation.windowDays} días, todo el mercado).`
    )
  }
  if (insight.sellerGap && Math.abs(insight.sellerGap.gap) >= 0.02) {
    const gap = insight.sellerGap.gap
    list.push(
      `En el ${car.model}, las automotoras piden ${percent(gap)} ${gap > 0 ? 'más' : 'menos'} que los particulares por el mismo año y versión${car.sellerType ? ` (este aviso es de ${car.sellerType === 'dealer' ? 'una automotora' : 'un particular'})` : ''}.`
    )
  }
  if (insight.supply.listings) {
    list.push(
      `Oferta: ${insight.supply.listings.toLocaleString('es-UY')} ${car.model} publicados${insight.supply.sameYear ? `, ${insight.supply.sameYear} del ${car.year}` : ''}.`
    )
  }
  return list
})
</script>

<style scoped>
.car-owning__bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 120px;
  padding-bottom: 18px;
  position: relative;
}
.car-owning__bar {
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  position: relative;
}
.car-owning__bar-fill {
  display: block;
  width: 100%;
  max-width: 36px;
  border-radius: 4px 4px 0 0;
  background: rgba(var(--v-theme-on-surface), 0.18);
}
.car-owning__bar--this .car-owning__bar-fill {
  background: rgb(var(--v-theme-primary));
}
.car-owning__bar-year {
  position: absolute;
  bottom: -18px;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.car-owning__bar--this .car-owning__bar-year {
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}
.car-owning__table th {
  font-weight: 400;
}
.car-owning__total th,
.car-owning__total td {
  font-weight: 700;
}
.car-owning__table td {
  white-space: nowrap;
}
.car-owning__facts {
  padding-left: 20px;
  margin: 0;
  display: grid;
  gap: 6px;
}
</style>
