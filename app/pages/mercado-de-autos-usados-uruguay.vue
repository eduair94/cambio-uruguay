<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Autos usados', to: localePath(CARS_PATH) },
        { title: 'Informe del mercado' },
      ]"
      class="px-0 mb-2"
    />

    <header class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-2">El mercado de autos usados en Uruguay</h1>
      <p v-if="data" class="text-body-1 mb-3">
        Qué hay a la venta hoy, a qué precio, cuánto pierde por año cada modelo y dónde queda margen
        para negociar. Sale de
        <strong>{{ market.adverts.toLocaleString('es-UY') }} avisos</strong> vigentes de
        {{ market.models.toLocaleString('es-UY') }} modelos, leídos todos los días en Mercado Libre,
        Facebook Marketplace y ocho webs de automotoras y clasificados. Datos del
        {{ formatCarDate(data.generatedAt) }}.
      </p>
      <VAlert type="info" variant="outlined" density="comfortable">
        <strong>Esto mide oferta, no ventas.</strong> Nadie publica en Uruguay cuántos usados se
        venden por modelo, así que cuando acá dice "el modelo con más avisos" quiere decir eso y
        nada más: puede ser el más vendido o el que más cuesta vender.
      </VAlert>
    </header>

    <VAlert v-if="error" type="info" variant="outlined" class="mb-4">
      El informe se está calculando. Volvé en unos minutos.
    </VAlert>

    <template v-else-if="data">
      <section class="mb-10">
        <h2 class="text-h5 mb-3">El mercado en seis números</h2>
        <VRow>
          <VCol v-for="card in headline" :key="card.label" cols="6" md="4" lg="2">
            <div class="report-card">
              <p class="text-caption text-medium-emphasis mb-1">{{ card.label }}</p>
              <p class="text-h6 font-weight-bold mb-0">{{ card.value }}</p>
              <p class="text-caption text-medium-emphasis mb-0">{{ card.note }}</p>
            </div>
          </VCol>
        </VRow>
      </section>

      <section class="mb-10">
        <h2 class="text-h5 mb-3">Cuántos autos hay en cada franja de precio</h2>
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th scope="col">Franja</th>
              <th scope="col">Avisos</th>
              <th scope="col">Parte del mercado</th>
              <th scope="col" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="band in market.priceBands" :key="band.from">
              <td data-label="Franja">{{ carReportBandLabel(band.from, band.to) }}</td>
              <td data-label="Avisos">{{ band.adverts.toLocaleString('es-UY') }}</td>
              <td data-label="Parte del mercado">
                {{ carReportPercent(band.adverts / market.adverts, 1) }}
              </td>
              <td data-label="">
                <span class="report-bar" :style="{ width: `${(band.adverts / maxBand) * 100}%` }" />
              </td>
            </tr>
          </tbody>
        </VTable>
        <p class="text-body-2 text-medium-emphasis mt-2">
          La mitad del mercado pide entre {{ carReportUsd(market.price.p25) }} y
          {{ carReportUsd(market.price.p75) }}. Un auto de la mediana ({{
            carReportUsd(market.price.median)
          }}) es un {{ market.year.median }} con
          {{ market.km ? carReportKm(market.km.median) : 'sin dato de' }} encima.
        </p>
      </section>

      <section class="mb-10">
        <h2 class="text-h5 mb-3">Con qué se vende: combustible, caja y quién vende</h2>
        <VRow>
          <VCol cols="12" md="4">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Combustible</h3>
            <ul class="report-list">
              <li v-for="fuel in market.fuels" :key="fuel.fuel">
                <span>{{ CAR_REPORT_FUEL_LABELS[fuel.fuel] }}</span>
                <strong>{{ carReportPercent(fuel.adverts / market.adverts, 1) }}</strong>
              </li>
            </ul>
          </VCol>
          <VCol cols="12" md="4">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Caja</h3>
            <ul class="report-list">
              <li v-for="box in market.transmissions" :key="box.transmission">
                <span>{{ CAR_REPORT_TRANSMISSION_LABELS[box.transmission] }}</span>
                <strong>{{ carReportPercent(box.adverts / market.adverts, 1) }}</strong>
              </li>
            </ul>
          </VCol>
          <VCol cols="12" md="4">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Quién vende</h3>
            <ul class="report-list">
              <li v-for="seller in sellers" :key="seller.key">
                <span>{{ CAR_REPORT_SELLER_LABELS[seller.key] }}</span>
                <strong>{{ carReportPercent(seller.adverts / market.adverts, 1) }}</strong>
              </li>
            </ul>
            <p v-if="data.data.sellerGaps.median !== null" class="text-body-2 mt-2 mb-0">
              Una automotora pide
              <strong>{{ carReportPercent(data.data.sellerGaps.median, 1) }} más</strong> que un
              dueño por el mismo modelo y año.
            </p>
          </VCol>
        </VRow>
      </section>

      <section class="mb-10">
        <h2 class="text-h5 mb-3">Los modelos con más oferta</h2>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Otra vez: son los que más avisos tienen, no los más vendidos. Sirve igual, y mucho: un
          modelo con cientos de avisos es fácil de comparar, fácil de conseguir en la versión que
          querés y más fácil de revender.
        </p>
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th scope="col">Modelo</th>
              <th scope="col">Avisos</th>
              <th scope="col">Precio mediano</th>
              <th scope="col">Año / km típico</th>
              <th scope="col">Pierde por año</th>
              <th scope="col">Abanico de precios</th>
              <th scope="col">Automática</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="model in topModels" :key="model.marketSlug">
              <td data-label="Modelo">
                <NuxtLink :to="localePath(carMarketPath(model.marketSlug))">
                  {{ model.brand }} {{ model.model }}
                </NuxtLink>
              </td>
              <td data-label="Avisos">{{ model.adverts }}</td>
              <td data-label="Precio mediano">{{ carReportUsd(model.price.median) }}</td>
              <td data-label="Año / km típico">
                {{ model.medianYear }} · {{ carReportKm(model.medianKm) }}
              </td>
              <td data-label="Pierde por año">{{ carReportPercent(model.annualDrop, 1) }}</td>
              <td data-label="Abanico de precios">{{ carReportPercent(model.spread, 0) }}</td>
              <td data-label="Automática">{{ carReportPercent(model.automaticShare, 0) }}</td>
            </tr>
          </tbody>
        </VTable>
        <p class="text-body-2 text-medium-emphasis mt-2">
          <strong>Abanico</strong> es cuánto se estiran los precios del mismo modelo entre el cuarto
          más barato y el cuarto más caro. Arriba del 40 % quiere decir que ahí adentro hay autos
          muy distintos —versiones, motores, estados— y que el precio de lista dice poco por sí
          solo.
        </p>
      </section>

      <section class="mb-10">
        <h2 class="text-h5 mb-3">Cuánto pierde por año cada modelo</h2>
        <p class="text-body-1 mb-3">
          Es la comparación entre lo que pide hoy el mismo modelo año por año. Si vas a tener el
          auto cinco años, esta columna pesa más que el precio de entrada: entre un modelo que
          pierde
          {{ carReportPercent(bestDrop, 1) }} por año y uno que pierde
          {{ carReportPercent(worstDrop, 1) }}, sobre {{ carReportUsd(15000) }} son
          {{ carReportUsd(15000 * (worstDrop - bestDrop) * 5) }} de diferencia en cinco años.
        </p>
        <VRow>
          <VCol cols="12" md="6">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Los que mejor aguantan el valor</h3>
            <VTable class="cu-mobile-cards" density="compact">
              <thead>
                <tr>
                  <th scope="col">Modelo</th>
                  <th scope="col">Pierde por año</th>
                  <th scope="col">Sobre su precio mediano</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in keepsValue" :key="entry.marketSlug">
                  <td data-label="Modelo">{{ entry.brand }} {{ entry.model }}</td>
                  <td data-label="Pierde por año">
                    {{ carReportPercent(entry.annualDrop, 1) }}
                  </td>
                  <td data-label="Sobre su precio mediano">
                    {{ carReportSavingPerYear(medianOf(entry.marketSlug), entry.annualDrop) }}
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCol>
          <VCol cols="12" md="6">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Los que más pierden</h3>
            <VTable class="cu-mobile-cards" density="compact">
              <thead>
                <tr>
                  <th scope="col">Modelo</th>
                  <th scope="col">Pierde por año</th>
                  <th scope="col">Sobre su precio mediano</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in losesValue" :key="entry.marketSlug">
                  <td data-label="Modelo">{{ entry.brand }} {{ entry.model }}</td>
                  <td data-label="Pierde por año">
                    {{ carReportPercent(entry.annualDrop, 1) }}
                  </td>
                  <td data-label="Sobre su precio mediano">
                    {{ carReportSavingPerYear(medianOf(entry.marketSlug), entry.annualDrop) }}
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCol>
        </VRow>
        <p class="text-body-2 text-medium-emphasis mt-2">
          Se calcula con una recta sobre el precio mediano de cada año de fabricación, y sólo se
          publica con seis años de datos y un tramo de cinco. Un modelo que aparece plano casi
          siempre está mezclando versiones distintas, no aguantando el valor.
        </p>
      </section>

      <section class="mb-10">
        <h2 class="text-h5 mb-3">Qué comprás con cada presupuesto</h2>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Modelos cuyos avisos caen entre el 80 % y el 100 % del presupuesto, con el año que ese
          dinero paga hoy. No es "lo más barato que entra": es lo que se compra gastándolo.
        </p>
        <div v-for="budget in data.data.budgets" :key="budget.maxUsd" class="mb-4">
          <h3 class="text-subtitle-1 font-weight-bold mb-2">
            Con {{ carReportUsd(budget.maxUsd) }}
            <span class="text-body-2 text-medium-emphasis font-weight-regular">
              ({{ budget.adverts.toLocaleString('es-UY') }} avisos en esa franja)
            </span>
          </h3>
          <div class="report-chips">
            <span v-for="model in budget.models" :key="model.marketSlug" class="report-chip">
              <strong>{{ model.brand }} {{ model.model }} {{ model.medianYear }}</strong>
              <span>{{ carReportUsd(model.medianUsd) }} · {{ carReportKm(model.medianKm) }}</span>
            </span>
          </div>
        </div>
      </section>

      <section class="mb-10">
        <h2 class="text-h5 mb-3">Cuánto margen hay para negociar</h2>
        <p class="text-body-1 mb-2">
          En los últimos {{ negotiation.windowDays }} días vimos cambiar el precio a
          <strong>{{ negotiation.changed.toLocaleString('es-UY') }} avisos</strong>
          ({{ carReportPercent(negotiation.shareOfMarket, 1) }} de los que seguimos día a día,
          incluidos los que no entran a las tablas de arriba).
          {{ negotiation.cut.toLocaleString('es-UY') }} bajaron y
          {{ negotiation.raised.toLocaleString('es-UY') }} subieron; el recorte mediano fue de
          <strong>{{ carReportPercent(negotiation.medianCut, 1) }}</strong
          >.
        </p>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Son cambios que <strong>vimos nosotros</strong> entre dos lecturas, no rebajas que el
          aviso dice tener. Sirve como piso de lo que se mueve un precio sin que nadie negocie: si
          el vendedor ya bajó solo, hay lugar.
        </p>
      </section>

      <section class="mb-10">
        <h2 class="text-h5 mb-3">Cuánto tarda en venderse</h2>
        <VAlert v-if="!rotation.measurable" type="info" variant="outlined" density="comfortable">
          {{ rotation.note }} Se calcula todos los días y aparece acá solo, sin que haya que tocar
          nada, cuando la serie sea lo bastante larga. Es la medición que más se parece a "cuáles se
          venden", y por eso no la vamos a inventar antes de tiempo.
        </VAlert>
        <p v-else class="text-body-1 mb-0">
          La mitad de los avisos desaparece en
          <strong>{{ rotation.medianDays }} días</strong> o menos, sobre
          {{ rotation.retired.toLocaleString('es-UY') }} avisos que salieron del mercado mientras
          los mirábamos.
        </p>
      </section>

      <section class="mb-10">
        <h2 class="text-h5 mb-3">Lo que los avisos declaran</h2>
        <p class="text-body-1 mb-2">
          {{ data.data.risk.adverts }} avisos ({{ carReportPercent(data.data.risk.share, 1) }})
          dicen algo del auto que cambia lo que estás comprando: deuda, papeles pendientes, choque,
          recupero de seguro, mecánica rota. Están todos, con la frase del vendedor y cuánto cambia
          el precio cada motivo —la deuda abarata; los papeles pendientes, no—, en
          <NuxtLink :to="localePath(CAR_RISKS_PATH)">autos con deuda o chocados</NuxtLink>.
        </p>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Ese porcentaje sube todos los días, y no porque el mercado empeore: todavía estamos
          leyendo la descripción de cada aviso, que es donde el vendedor lo cuenta.
        </p>
      </section>

      <section class="mb-10">
        <h2 class="text-h5 mb-3">Cómo usar esto para elegir</h2>
        <p class="text-body-1 mb-3">
          ¿Estás del otro lado? La
          <NuxtLink :to="localePath(CAR_SELL_PATH)">guía para vender tu auto</NuxtLink> usa estos
          mismos datos para decir cuánto pedir, y el
          <NuxtLink :to="localePath(CAR_VALUATION_PATH)">tasador</NuxtLink> calcula el tuyo.
        </p>
        <ol class="text-body-1 pl-5">
          <li class="mb-2">
            <strong>Fijá el presupuesto y mirá qué año paga.</strong> El mismo dinero compra un
            modelo popular cinco años más nuevo que uno grande y viejo, y el más nuevo va a tener
            repuestos y comparables por años.
          </li>
          <li class="mb-2">
            <strong>Mirá cuánto pierde por año antes que el precio de entrada.</strong> Si lo vas a
            tener cinco años, la depreciación pesa más que los mil dólares que negociaste.
          </li>
          <li class="mb-2">
            <strong>Elegí un modelo con oferta profunda.</strong> Con cientos de avisos podés
            esperar el que tiene la versión y el kilometraje que querés, y comparás precio de
            verdad.
          </li>
          <li class="mb-2">
            <strong>Un abanico ancho no es una oportunidad, es una advertencia.</strong> Cuando el
            mismo modelo va de un precio a otro con 40 % de diferencia, adentro hay autos distintos:
            versión, motor, estado. Compará contra su cohorte, no contra la mediana.
          </li>
          <li class="mb-2">
            <strong>Antes de señar, verificá.</strong> Deuda de patente en SUCIVE, prenda y embargo
            en el certificado registral, y el auto revisado por un mecánico. Lo barato con motivo
            está explicado en <NuxtLink :to="localePath(CAR_RISKS_PATH)">esta otra lista</NuxtLink>;
            lo barato sin motivo declarado, en
            <NuxtLink :to="localePath(CAR_OPPORTUNITIES_PATH)">oportunidades</NuxtLink>.
          </li>
        </ol>
      </section>

      <section>
        <h2 class="text-h5 mb-3">Método y límites</h2>
        <ul class="text-body-1 pl-5">
          <li>
            Son <strong>precios pedidos en avisos</strong>, no precios de venta cerrados ni
            tasaciones.
          </li>
          <li>
            Un mismo auto publicado en varias fuentes cuenta una sola vez. Quedan afuera los avisos
            en pesos y aquellos cuya moneda dedujimos, porque no se pueden comparar en dólares.
          </li>
          <li>
            Un modelo entra a las tablas con 30 avisos o más; cada año de la curva de depreciación
            necesita 3. Debajo de eso la mediana es anécdota.
          </li>
          <li>
            <strong>No medimos ventas.</strong> En Uruguay las transferencias de usados no se
            publican abiertas por modelo, así que nadie —nosotros tampoco— puede decir cuál fue el
            usado más vendido del mes. Lo más cerca que se puede estar es cuánto tarda un aviso en
            desaparecer, y eso lo vamos a publicar cuando la serie lo aguante.
          </li>
          <li>Se recalcula todos los días con la corrida del directorio.</li>
        </ul>
      </section>
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import { CAR_OPPORTUNITIES_PATH, CARS_PATH, carMarketPath, formatCarDate } from '~/utils/cars'
import { CAR_RISKS_PATH } from '~/utils/carsRisk'
import { CAR_SELL_PATH, CAR_VALUATION_PATH } from '~/utils/carsValuation'
import {
  CAR_REPORT_FUEL_LABELS,
  CAR_REPORT_PATH,
  CAR_REPORT_SELLER_LABELS,
  CAR_REPORT_TRANSMISSION_LABELS,
  carReportBandLabel,
  carReportKm,
  carReportPercent,
  carReportSavingPerYear,
  carReportUsd,
  type CarReportResponse,
} from '~/utils/carsReport'

const localePath = useLocalePath()
const { data, error } = await useAsyncData('car-report', () =>
  $fetch<CarReportResponse>('/api/car-report')
)

const market = computed(() => data.value!.data.market)
const negotiation = computed(() => data.value!.data.negotiation)
const rotation = computed(() => data.value!.data.rotation)
const topModels = computed(() => data.value!.data.models.slice(0, 25))
const maxBand = computed(() => Math.max(...market.value.priceBands.map(band => band.adverts), 1))
const sellers = computed(() =>
  (['dealer', 'private', 'unknown'] as const)
    .map(key => ({ key, adverts: market.value.sellers[key] }))
    .filter(entry => entry.adverts > 0)
)
const keepsValue = computed(() => data.value!.data.depreciation.slice(0, 8))
const losesValue = computed(() => [...data.value!.data.depreciation].reverse().slice(0, 8))
const bestDrop = computed(() => keepsValue.value[0]?.annualDrop ?? 0.02)
const worstDrop = computed(() => losesValue.value[0]?.annualDrop ?? 0.1)
const medianOf = (marketSlug: string): number =>
  data.value!.data.models.find(model => model.marketSlug === marketSlug)?.price.median ?? 0

const headline = computed(() => [
  {
    label: 'Avisos vigentes',
    value: market.value.adverts.toLocaleString('es-UY'),
    note: `${market.value.brands} marcas`,
  },
  {
    label: 'Precio mediano',
    value: carReportUsd(market.value.price.median),
    note: `p25 ${carReportUsd(market.value.price.p25)} · p75 ${carReportUsd(market.value.price.p75)}`,
  },
  {
    label: 'Año mediano',
    value: String(market.value.year.median),
    note: `p25 ${market.value.year.p25}`,
  },
  {
    label: 'Kilómetros medianos',
    value: market.value.km ? carReportKm(market.value.km.median) : 'sin dato',
    note: 'de los que lo informan',
  },
  {
    label: 'Vende una automotora',
    value: carReportPercent(market.value.sellers.dealer / market.value.adverts, 0),
    note: `${carReportPercent(market.value.sellers.private / market.value.adverts, 0)} dueño`,
  },
  {
    label: 'Cambiaron de precio',
    value: negotiation.value.changed.toLocaleString('es-UY'),
    note: `en ${negotiation.value.windowDays} días`,
  },
])

const canonical = `https://cambio-uruguay.com${CAR_REPORT_PATH}`
const title = 'Mercado de autos usados en Uruguay'
const description =
  'Informe del mercado de autos usados en Uruguay: precios medianos, modelos con más oferta, cuánto pierde por año cada modelo, qué comprás con cada presupuesto y cuánto margen hay para negociar.'

useSeoMeta({
  title: `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonical,
  ogType: 'article',
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            headline: title,
            description,
            url: canonical,
            datePublished: '2026-09-18',
            dateModified: data.value?.generatedAt ?? '2026-09-18',
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Autos usados',
                item: `https://cambio-uruguay.com${CARS_PATH}`,
              },
              { '@type': 'ListItem', position: 2, name: 'Informe del mercado', item: canonical },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.report-card {
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 12px;
  padding: 12px 14px;
  height: 100%;
}
.report-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.report-list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.15);
}
.report-bar {
  display: block;
  height: 10px;
  min-width: 2px;
  border-radius: 999px;
  background: rgb(var(--v-theme-primary));
}
.report-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.report-chip {
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 0.9rem;
}
.report-chip span {
  color: rgb(var(--v-theme-on-surface-variant, var(--v-theme-on-surface)));
  font-size: 0.8rem;
}
</style>
