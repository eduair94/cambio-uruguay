<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs
      :items="[{ title: 'Autos usados', to: localePath(CARS_PATH) }, { title: 'Vender tu auto' }]"
      class="px-0 mb-2"
    />

    <header class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-2">Vender tu auto usado en Uruguay</h1>
      <p class="text-body-1 mb-3">
        Antes de publicar el tuyo, esto es lo que dicen
        <strong v-if="report">{{ report.market.adverts.toLocaleString('es-UY') }} avisos</strong>
        <template v-else>los avisos</template> vigentes: cuánto pedir, qué suma y qué resta en el
        precio, cuánto vas a terminar bajando y cuánto te cuesta esperar. Medido sobre el mercado
        real, no sobre una tabla.
      </p>
      <!-- El tasador y el informe del mercado están en la barra "En esta sección". -->
    </header>

    <VAlert v-if="error" type="info" variant="outlined" class="mb-4">
      Los datos del mercado se están calculando. Volvé en unos minutos.
    </VAlert>

    <template v-else-if="report">
      <section class="mb-10">
        <h2 class="text-h5 mb-3">1. Cuánto pedir</h2>
        <p class="text-body-1 mb-3">
          El precio de tu auto no lo fija una tabla sino los otros avisos del mismo modelo y año,
          porque son contra los que el comprador te va a comparar. El
          <NuxtLink :to="localePath(CAR_VALUATION_PATH)">tasador</NuxtLink> te da tres números:
        </p>
        <ul class="text-body-1 pl-5">
          <li class="mb-1">
            <strong>Para vender rápido:</strong> más barato que tres de cada cuatro avisos iguales.
            Te llaman primero.
          </li>
          <li class="mb-1">
            <strong>Precio de mercado:</strong> la mediana. Es donde está la mayoría y donde se
            negocia.
          </li>
          <li class="mb-1">
            <strong>Tope realista:</strong> arriba de eso competís con los más caros, y un comprador
            que compara te deja para el final.
          </li>
        </ul>
        <p class="text-body-2 text-medium-emphasis mt-2 mb-0">
          La mitad del mercado entero pide entre {{ carReportUsd(report.market.price.p25) }} y
          {{ carReportUsd(report.market.price.p75) }}, pero eso no te sirve: lo que importa es la
          cohorte de tu modelo y año, que puede estar en cualquier lado de ese rango.
        </p>
      </section>

      <section class="mb-10">
        <h2 class="text-h5 mb-3">2. Qué suma y qué resta en el precio</h2>
        <p class="text-body-1 mb-3">
          Medido <strong>dentro del mismo modelo y año</strong>: cuánto más o menos se pide por un
          auto que tiene esto, contra su gemelo que no lo tiene. Así lo que se mide es la
          diferencia, no que un auto sea de otra categoría.
        </p>
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th scope="col">Lo que tiene tu auto</th>
              <th scope="col">Efecto en el precio</th>
              <th scope="col">Sobre cuántas comparaciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in levers" :key="row.label">
              <td data-label="Lo que tiene tu auto">{{ row.label }}</td>
              <td data-label="Efecto en el precio">
                <strong>{{ row.effect }}</strong>
              </td>
              <td data-label="Sobre cuántas comparaciones">{{ row.basis }}</td>
            </tr>
          </tbody>
        </VTable>
        <p class="text-body-2 text-medium-emphasis mt-2 mb-0">
          La caja automática se mide dos veces a propósito: contra la manual de la misma versión
          (sólo la caja) y contra la manual del mismo modelo y año (la caja más el equipamiento con
          el que suele venir). El diésel no está: en los modelos que se venden con los dos
          combustibles, el diésel viene en otra versión —4x4, cabina doble— y la diferencia que se
          mide es esa, no la del combustible.
        </p>
      </section>

      <section class="mb-10">
        <h2 class="text-h5 mb-3">3. Cómo elegir el número</h2>
        <p class="text-body-1 mb-3">
          El mercado ya eligió cómo terminan los precios. Publicar con la misma terminación que los
          demás te pone en la misma lista; un número raro no te hace más barato, te hace difícil de
          comparar.
        </p>
        <div class="sell-endings">
          <div v-for="ending in endings" :key="ending.ending" class="sell-ending">
            <p class="text-h6 font-weight-bold mb-0">{{ ending.label }}</p>
            <p class="text-body-2 mb-0">{{ carReportPercent(ending.share, 0) }} de los avisos</p>
          </div>
        </div>
      </section>

      <section class="mb-10">
        <h2 class="text-h5 mb-3">4. Cuánto vas a terminar bajando</h2>
        <p class="text-body-1 mb-2">
          En los últimos {{ report.negotiation.windowDays }} días vimos cambiar el precio a
          {{ report.negotiation.changed.toLocaleString('es-UY') }} avisos:
          <strong>{{ report.negotiation.cut.toLocaleString('es-UY') }} bajaron</strong> y
          {{ report.negotiation.raised.toLocaleString('es-UY') }} subieron. El recorte mediano de
          los que bajaron fue de
          <strong>{{ carReportPercent(report.negotiation.medianCut, 1) }}</strong
          >.
        </p>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Son cambios que vimos nosotros entre dos lecturas del mismo aviso, antes de cualquier
          negociación en persona. Si publicás en el precio de mercado, contá con que ese margen se
          va.
        </p>
      </section>

      <section class="mb-10">
        <h2 class="text-h5 mb-3">5. Cuánto te cuesta esperar</h2>
        <p class="text-body-1 mb-3">
          Cada año de antigüedad el mismo modelo se pide más barato. Si estás dudando en vender,
          esta es la cuenta: lo que pierde tu auto por esperar un año, en dólares.
        </p>
        <VTable class="cu-mobile-cards" density="compact">
          <thead>
            <tr>
              <th scope="col">Modelo</th>
              <th scope="col">Pierde por año</th>
              <th scope="col">Sobre su precio mediano</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in waiting" :key="entry.marketSlug">
              <td data-label="Modelo">{{ entry.brand }} {{ entry.model }}</td>
              <td data-label="Pierde por año">{{ carReportPercent(entry.annualDrop, 1) }}</td>
              <td data-label="Sobre su precio mediano">{{ carReportUsd(entry.loss) }}</td>
            </tr>
          </tbody>
        </VTable>
        <p class="text-body-2 text-medium-emphasis mt-2 mb-0">
          Los modelos con más avisos, ordenados de los que más pierden a los que menos. Tu modelo,
          si no está acá, lo muestra el tasador.
        </p>
      </section>

      <section class="mb-10">
        <h2 class="text-h5 mb-3">6. Automotora o por tu cuenta</h2>
        <p v-if="report.sellerGaps.median !== null" class="text-body-1 mb-2">
          Por el mismo modelo y año, una automotora pide
          <strong>{{ carReportPercent(report.sellerGaps.median, 1) }} más</strong> que un dueño,
          mediana de {{ report.sellerGaps.models.length }} modelos comparables.
          <template v-if="dealerCheaper">
            En {{ dealerCheaper }} se da vuelta: la automotora pide menos que el dueño.
          </template>
        </p>
        <p class="text-body-1 mb-2">
          Eso es lo que <strong>pide</strong> la automotora cuando vende. Lo que te
          <strong>ofrece</strong> por tu auto si se lo dejás en parte de pago es otro número, más
          bajo, y no lo publicamos porque no lo tenemos: ninguna automotora publica cuánto paga.
        </p>
        <p class="text-body-2 text-medium-emphasis mb-0">
          La cuenta que sí podés hacer: el precio de mercado que te da el tasador menos lo que te
          ofrecen es lo que te cuesta no vender por tu cuenta. A veces vale la pena —no tenés que
          mostrarlo, ni cobrar, ni hacer la transferencia—; decidilo sabiendo el número.
        </p>
      </section>

      <section class="mb-10">
        <h2 class="text-h5 mb-3">7. Cuánta competencia vas a tener</h2>
        <p class="text-body-1 mb-3">
          Con un modelo de mucha oferta tu aviso se compara contra cientos: el precio manda y los
          compradores tienen de dónde elegir. Con uno de poca oferta, quien busca ese auto te
          encuentra a vos.
        </p>
        <div class="sell-chips">
          <span v-for="model in crowded" :key="model.marketSlug" class="sell-chip">
            <strong>{{ model.brand }} {{ model.model }}</strong>
            <span>{{ model.adverts.toLocaleString('es-UY') }} avisos</span>
          </span>
        </div>
      </section>

      <section class="mb-10">
        <h2 class="text-h5 mb-3">8. Qué tiene que tener tu aviso</h2>
        <ul class="text-body-1 pl-5">
          <li class="mb-2">
            <strong>Los kilómetros de verdad.</strong> Un "111.111" o un campo vacío no te hacen más
            atractivo: te sacan de toda comparación.
            <template v-if="placeholderKm"
              >Hoy hay {{ placeholderKm.toLocaleString('es-UY') }} avisos con kilometraje de relleno
              que ningún comparador puede usar.</template
            >
          </li>
          <li class="mb-2">
            <strong>La versión en el título.</strong> "Onix 1.4 LT" se compara; "Onix impecable" no.
            <template v-if="withoutTrim"
              >{{ withoutTrim.toLocaleString('es-UY') }} avisos no dicen la versión, y el comprador
              que compara los deja de lado igual que nosotros.</template
            >
          </li>
          <li class="mb-2">
            <strong>Lo que tiene el auto, dicho.</strong>
            Una deuda o un choque no desaparecen por no nombrarlos: aparecen en el certificado del
            SUCIVE y en el registral que pide la escribanía, y la venta se cae ahí, con el comprador
            ya en la mesa.
            <template v-if="debtGap !== null">
              Y declararla te cuesta: los avisos que la declaran se piden
              {{ formatCarRiskGap(debtGap).replace(' más barato', '') }} menos que el mismo auto sin
              nada.
            </template>
          </li>
          <li class="mb-0">
            <strong>El precio en dólares.</strong> Todo el mercado de usados pide en dólares; un
            aviso en pesos obliga a hacer la cuenta y queda fuera de las comparaciones.
          </li>
        </ul>
      </section>

      <section class="mb-10">
        <h2 class="text-h5 mb-3">Lo que todavía no sabemos</h2>
        <ul class="text-body-1 pl-5">
          <li class="mb-1">
            <strong>A cuánto se vende de verdad.</strong> Tenemos precios pedidos. El cierre queda
            entre las partes y no se publica.
          </li>
          <li class="mb-1">
            <strong>Cuánto tarda en venderse.</strong>
            {{
              report.rotation.measurable
                ? `La mitad de los avisos desaparece en ${report.rotation.medianDays} días.`
                : report.rotation.note
            }}
          </li>
          <li class="mb-0">
            <strong>Cuánto paga una automotora por tu auto.</strong> Ninguna lo publica.
          </li>
        </ul>
      </section>

      <section>
        <h2 class="text-h5 mb-3">De dónde salen estos números</h2>
        <p class="text-body-1 mb-0">
          De los avisos vigentes de Mercado Libre, Facebook Marketplace y ocho webs de automotoras y
          clasificados, que leemos todos los días; un mismo auto publicado en varias fuentes cuenta
          una vez. Cada efecto se mide comparando autos del mismo modelo y año y se publica con la
          cantidad de comparaciones que lo sostienen. Datos del {{ formatCarDate(generatedAt) }}. El
          detalle está en el
          <NuxtLink :to="localePath(CAR_REPORT_PATH)">informe del mercado</NuxtLink>.
        </p>
      </section>
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import { CARS_PATH, formatCarDate } from '~/utils/cars'
import {
  CAR_REPORT_PATH,
  carReportPercent,
  carReportTypicalDrop,
  carReportUsd,
  type CarReportResponse,
} from '~/utils/carsReport'
import { formatCarRiskGap, type CarRisksResponse } from '~/utils/carsRisk'
import { CAR_SELL_PATH, CAR_VALUATION_PATH } from '~/utils/carsValuation'

interface OpportunityStats {
  stats: { excluded: Record<string, number> }
}

const localePath = useLocalePath()
const { data, error } = await useAsyncData('car-report', () =>
  $fetch<CarReportResponse>('/api/car-report')
)
const { data: risks } = await useAsyncData('car-risks-summary', () =>
  $fetch<CarRisksResponse>('/api/car-risks', { query: { page: 1 } }).catch(() => null)
)
const { data: opportunities } = await useAsyncData('car-opportunity-stats', () =>
  $fetch<OpportunityStats>('/api/car-opportunities', { query: { page: 1 } }).catch(() => null)
)

const report = computed(() => data.value?.data ?? null)
const generatedAt = computed(() => data.value?.generatedAt ?? '')

const riskGap = (category: string): number | null =>
  risks.value?.categories.find(row => row.category === category)?.medianGap ?? null
const riskRange = (category: string) =>
  risks.value?.categories.find(row => row.category === category)
// Sólo con un descuento claro y medido sobre diez avisos o más: con 6-7 avisos la deuda dio −21 % y
// con 13, −2 % con el rango cruzando el cero (2026-09-19). Un número que se da vuelta no se cita.
const debtGap = computed(() => {
  const row = riskRange('deuda')
  return row &&
    row.medianGap !== null &&
    row.p25Gap !== null &&
    row.p25Gap > 0 &&
    row.measured >= 10
    ? row.medianGap
    : null
})

const signed = (value: number | null, up: string, down: string): string => {
  if (value === null) return 'sin datos suficientes'
  const percent = carReportPercent(Math.abs(value), 1)
  return value >= 0 ? `${percent} ${up}` : `${percent} ${down}`
}

const levers = computed(() => {
  const valuation = report.value?.valuation
  if (!valuation) return []
  const rows = [
    {
      label: 'Cada 10.000 km más',
      effect: signed(valuation.km.value === null ? null : -valuation.km.value, 'más', 'menos'),
      basis: `${valuation.km.cohorts} cohortes de modelo y año`,
    },
    {
      label: 'Caja automática, misma versión',
      effect: signed(valuation.automatic.value, 'más', 'menos'),
      basis: `${valuation.automatic.cohorts} cohortes de modelo, año y versión`,
    },
    {
      label: 'Caja automática con la versión que suele traer',
      effect: signed(valuation.automaticWithTrim.value, 'más', 'menos'),
      basis: `${valuation.automaticWithTrim.cohorts} cohortes de modelo y año`,
    },
  ]
  // El mismo cálculo que usa el informe: con dos fórmulas, una página decía 5,3 % y la otra 5,4 %.
  const typicalDrop = carReportTypicalDrop(report.value)
  rows.push({
    label: 'Un año más de antigüedad',
    effect: signed(typicalDrop === null ? null : -typicalDrop, 'más', 'menos'),
    basis: `mediana de ${report.value.depreciation.length} modelos`,
  })
  for (const [category, label] of [
    ['deuda', 'Declara deuda, prenda o embargo'],
    ['siniestro', 'Declara choque o granizo'],
    ['papeles', 'Declara un papel pendiente'],
  ] as const) {
    const row = riskRange(category)
    const gap = riskGap(category)
    rows.push({
      label,
      effect:
        gap === null
          ? 'sin datos suficientes'
          : row && row.p25Gap !== null && row.p75Gap !== null && row.p25Gap <= 0 && row.p75Gap >= 0
            ? 'sin diferencia clara'
            : signed(-gap, 'más', 'menos'),
      basis: row ? `${row.measured} avisos con comparables` : 'sin datos',
    })
  }
  if (report.value.sellerGaps.median !== null) {
    rows.push({
      label: 'Lo publica una automotora en vez del dueño',
      effect: signed(report.value.sellerGaps.median, 'más', 'menos'),
      basis: `${report.value.sellerGaps.models.length} modelos comparables`,
    })
  }
  return rows
})

const ENDING_LABELS: Record<string, string> = {
  '900': 'Termina en 900',
  '500': 'Termina en 500',
  '990': 'Termina en 990',
  '000': 'Número redondo',
  otro: 'Cualquier otro',
}
const endings = computed(() => {
  const list = report.value?.valuation.endings ?? []
  const total = list.reduce((sum, entry) => sum + entry.adverts, 0) || 1
  return list.map(entry => ({
    ending: entry.ending,
    label: ENDING_LABELS[entry.ending] ?? entry.ending,
    share: entry.adverts / total,
  }))
})

const waiting = computed(() => {
  if (!report.value) return []
  const medians = new Map(report.value.models.map(model => [model.marketSlug, model.price.median]))
  return [...report.value.depreciation]
    .reverse()
    .slice(0, 10)
    .map(entry => ({
      ...entry,
      loss:
        entry.annualDrop === null
          ? null
          : Math.round((medians.get(entry.marketSlug) ?? 0) * entry.annualDrop),
    }))
})
const crowded = computed(() => (report.value?.models ?? []).slice(0, 12))
// Los modelos donde la automotora pide MENOS que el dueño, desde los datos y no escritos a mano.
const dealerCheaper = computed(() => {
  const names = (report.value?.sellerGaps.models ?? [])
    .filter(model => model.gap < 0)
    .map(model => `${model.brand} ${model.model}`)
  if (!names.length) return ''
  if (names.length === 1) return names[0]!
  return `${names.slice(0, 3).slice(0, -1).join(', ')} y ${names.slice(0, 3).at(-1)}`
})
const placeholderKm = computed(() => opportunities.value?.stats.excluded.km_placeholder ?? 0)
const withoutTrim = computed(() => opportunities.value?.stats.excluded.no_trim ?? 0)

const canonical = `https://cambio-uruguay.com${CAR_SELL_PATH}`
const title = 'Vender tu auto usado en Uruguay'
const description =
  'Cuánto pedir por tu auto usado en Uruguay, qué suma y qué resta en el precio, cuánto vas a terminar bajando y cuánto te cuesta esperar, medido sobre los avisos vigentes.'

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
            datePublished: '2026-09-19',
            dateModified: data.value?.generatedAt ?? '2026-09-19',
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
              { '@type': 'ListItem', position: 2, name: 'Vender tu auto', item: canonical },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.sell-endings,
.sell-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.sell-ending,
.sell-chip {
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 12px;
  padding: 10px 14px;
}
.sell-chip {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
}
</style>
