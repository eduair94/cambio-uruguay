<template>
  <VContainer class="blue-page py-8 py-md-12">
    <header class="mb-8">
      <VChip color="primary" variant="flat" size="small" class="mb-4">DÓLAR BLUE</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
        Dólar blue hoy: cuánto está y qué cambia si cruzás a Argentina
      </h1>
      <p class="text-body-1 text-medium-emphasis blue-page__lead mb-3">
        El precio del dólar paralelo y del oficial argentino, actualizados todos los días, y la
        cuenta que casi nadie hace: cuánto te cuesta un peso argentino según cómo lo consigas desde
        Uruguay.
      </p>
      <p v-if="blueDate" class="text-caption text-medium-emphasis mb-0">
        Cotizaciones argentinas al {{ blueDate }} · casas de cambio uruguayas actualizadas hoy
      </p>

      <!-- The Argentine series comes from a third party through a daily task.
           When either stalls, say the date we actually have instead of letting
           the page imply the number is from this morning. -->
      <VAlert v-if="data?.argStale && blueDate" type="warning" variant="tonal" class="mt-4">
        El último dato argentino que tenemos es del {{ blueDate }}. Las cuentas de abajo usan ese
        valor, así que tomalas como referencia y verificá el precio del día antes de operar.
      </VAlert>
    </header>

    <!-- The two Argentine reference rates -->
    <section class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-4">Las dos cotizaciones argentinas</h2>

      <VRow v-if="data?.blue || data?.oficial">
        <VCol cols="12" sm="4">
          <VCard variant="tonal" class="blue-page__stat pa-5 h-100">
            <div class="text-caption text-medium-emphasis mb-1">Dólar blue (paralelo)</div>
            <div class="text-h5 font-weight-bold">
              {{ data?.blue ? `$${formatNumber(data.blue.value, 0)}` : '—' }}
            </div>
            <div class="text-caption text-medium-emphasis">pesos argentinos por dólar</div>
          </VCard>
        </VCol>
        <VCol cols="12" sm="4">
          <VCard variant="tonal" class="blue-page__stat pa-5 h-100">
            <div class="text-caption text-medium-emphasis mb-1">Dólar oficial</div>
            <div class="text-h5 font-weight-bold">
              {{ data?.oficial ? `$${formatNumber(data.oficial.value, 0)}` : '—' }}
            </div>
            <div class="text-caption text-medium-emphasis">pesos argentinos por dólar</div>
          </VCard>
        </VCol>
        <VCol cols="12" sm="4">
          <VCard variant="tonal" class="blue-page__stat pa-5 h-100">
            <div class="text-caption text-medium-emphasis mb-1">Brecha entre las dos</div>
            <div class="text-h5 font-weight-bold">
              {{ brecha !== null ? `${formatNumber(brecha, 1)}%` : '—' }}
            </div>
            <div class="text-caption text-medium-emphasis">
              cuánto más caro es el paralelo que el oficial
            </div>
          </VCard>
        </VCol>
      </VRow>

      <VAlert v-else type="info" variant="tonal" class="mb-0">
        No pudimos leer las cotizaciones argentinas en este momento. Volvé a intentar en unos
        minutos.
      </VAlert>

      <p v-if="brecha !== null" class="text-body-2 text-medium-emphasis mt-4 mb-0">
        <template v-if="brecha < 10">
          Una brecha de {{ formatNumber(brecha, 1) }}% es chica para lo que fue la historia
          argentina: en 2023 llegó a superar el 100%, y ahí sí convenía muchísimo entrar con
          dólares. Hoy la diferencia entre el paralelo y el oficial casi no mueve la aguja —
          <strong>lo que sí la mueve es dónde comprás los pesos</strong>, que es lo que compara la
          tabla de abajo.
        </template>
        <template v-else>
          Con una brecha de {{ formatNumber(brecha, 1) }}%, el mercado paralelo y el oficial son dos
          precios bien distintos, y de qué lado se opere cambia el resultado final.
        </template>
      </p>
    </section>

    <!-- The join: what a peso costs by route -->
    <section v-if="comparison" class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-2">
        Cuánto te sale un peso argentino, según cómo lo consigas
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Todo medido en pesos uruguayos por cada peso argentino. Cuanto más bajo, mejor.
      </p>

      <VTable class="cu-mobile-cards cu-roomy" density="comfortable">
        <thead>
          <tr>
            <th scope="col">Cómo lo conseguís</th>
            <th scope="col" class="text-right">Te cuesta</th>
            <th scope="col">La cuenta</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="route in comparison.routes" :key="route.id">
            <td data-label="">
              <span class="font-weight-medium">{{ route.label }}</span>
              <VChip
                v-if="route.id === comparison.best.id"
                size="x-small"
                color="success"
                variant="tonal"
                class="ml-2 font-weight-bold"
              >
                más barato
              </VChip>
            </td>
            <td data-label="Te cuesta" class="text-right">
              <span class="font-weight-bold">{{ formatNumber(route.costPerArs, 4) }}</span>
              <div class="text-caption text-medium-emphasis">UYU por ARS</div>
            </td>
            <td data-label="La cuenta" class="cu-cell-prose text-caption">{{ route.detail }}</td>
          </tr>
        </tbody>
      </VTable>

      <VAlert
        v-if="comparison.directSurchargePct !== null && comparison.directSurchargePct > 1"
        type="warning"
        variant="tonal"
        class="mt-4"
      >
        Comprar pesos argentinos directamente en una casa de cambio uruguaya te sale hoy
        <strong>{{ formatNumber(comparison.directSurchargePct, 1) }}% más caro</strong> que llevar
        dólares y cambiarlos allá. Sobre 100.000 pesos argentinos son {{ extraCostPer100k }} de más.
      </VAlert>

      <p class="text-caption text-medium-emphasis mt-4 mb-0">
        Cada ruta usa el mejor precio publicado en cada tramo, que casi nunca es la misma casa de
        cambio. No incluye el costo de moverte ni comisiones que cobre quien te cambie, y el mercado
        paralelo argentino es informal: no tiene precio garantizado, ni comprobante, ni a quién
        reclamarle. No es una recomendación, es la cuenta con los precios de hoy.
      </p>
    </section>

    <!-- ARS in Uruguayan casas -->
    <section v-if="arsQuotes.length" class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-2">Pesos argentinos en casas de cambio uruguayas</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Ordenado por el precio de venta, que es el que pagás si vas a comprar pesos. Mostramos
        {{ arsQuotes.length }}
        <template v-if="excludedCount > 0">
          de las {{ data?.arsTotalCount }} casas que publican algo en la columna de pesos
          argentinos</template
        ><template v-else> casas</template>.
      </p>

      <VAlert
        v-if="excludedCount > 0"
        type="info"
        variant="tonal"
        class="mb-4"
        density="comfortable"
      >
        Dejamos afuera <strong>{{ excludedCount }}</strong> pizarras cuyo precio no se corresponde
        con ningún mercado: publican el peso argentino a más del doble o menos de la mitad de lo que
        vale pasando por el dólar. Casi ninguna casa uruguaya opera pesos en volumen y muchas dejan
        el cartel puesto durante meses, así que son carteles viejos, no ofertas. No las nombramos
        porque lo que falla es el dato, no la casa.
      </VAlert>

      <VTable class="cu-mobile-cards cu-roomy" density="comfortable">
        <thead>
          <tr>
            <th scope="col">Casa de cambio</th>
            <th scope="col" class="text-right">Te vende a</th>
            <th scope="col" class="text-right">Te compra a</th>
            <th scope="col" class="text-right">Diferencia</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="q in arsQuotes" :key="q.origin">
            <td data-label="">
              <NuxtLink :to="localePath(`/casa/${q.origin}`)" class="blue-page__link">
                {{ q.name }}
              </NuxtLink>
            </td>
            <td data-label="Te vende a" class="text-right">
              {{ q.sell > 0 ? formatNumber(q.sell, 4) : '—' }}
            </td>
            <td data-label="Te compra a" class="text-right">
              {{ q.buy > 0 ? formatNumber(q.buy, 4) : '—' }}
            </td>
            <td data-label="Diferencia" class="text-right">
              {{ spreadOf(q) !== null ? `${formatNumber(spreadOf(q)!, 0)}%` : '—' }}
            </td>
          </tr>
        </tbody>
      </VTable>

      <!-- The gap is stated, the casa is not named. The column above already
           shows every casa's own number, and on a board where half the pizarras
           turned out to be stale we do not have the evidence to crown a worst
           one by name — that would be publishing a scrape as an accusation. -->
      <VAlert
        v-if="data?.widestSpread && data.widestSpread.pct > 30"
        type="info"
        variant="tonal"
        class="mt-4"
      >
        Mirá la columna de diferencia antes de operar. Entre lo que una casa te vende el peso y lo
        que te lo compra hay hoy hasta
        <strong>{{ formatNumber(data.widestSpread.pct, 0) }}%</strong> de distancia — muchísimo más
        que en el dólar, porque casi ninguna casa uruguaya quiere quedarse con pesos argentinos. Si
        comprás y te arrepentís el mismo día, esa diferencia la perdés entera.
      </VAlert>
    </section>

    <!-- Context -->
    <section v-if="data?.blueChange30d !== null || data?.blueChange365d !== null" class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-4">Cómo viene el blue</h2>
      <VRow>
        <VCol cols="12" sm="6">
          <VCard variant="tonal" class="blue-page__stat pa-5 h-100">
            <div class="text-caption text-medium-emphasis mb-1">Último mes</div>
            <div class="text-h6 font-weight-bold">
              {{ data?.blueChange30d !== null ? signed(data!.blueChange30d!) : '—' }}
            </div>
            <div v-if="data?.blueMonthAgo" class="text-caption text-medium-emphasis">
              estaba $ {{ formatNumber(data.blueMonthAgo.value, 0) }} el
              {{ data.blueMonthAgo.date }}
            </div>
          </VCard>
        </VCol>
        <VCol cols="12" sm="6">
          <VCard variant="tonal" class="blue-page__stat pa-5 h-100">
            <div class="text-caption text-medium-emphasis mb-1">Último año</div>
            <div class="text-h6 font-weight-bold">
              {{ data?.blueChange365d !== null ? signed(data!.blueChange365d!) : '—' }}
            </div>
            <div v-if="data?.blueYearAgo" class="text-caption text-medium-emphasis">
              estaba $ {{ formatNumber(data.blueYearAgo.value, 0) }} el {{ data.blueYearAgo.date }}
            </div>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Explainer -->
    <section class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-4">Qué es el dólar blue, en criollo</h2>
      <div class="blue-page__prose">
        <p>
          En Argentina convivieron durante años dos precios para el mismo dólar: el
          <strong>oficial</strong>, que fija el banco central y al que no cualquiera puede comprar
          la cantidad que quiera, y el <strong>blue</strong> o paralelo, que es el precio del
          mercado informal —las llamadas «cuevas»— donde no hay límite de cantidad pero tampoco hay
          factura, garantía ni reclamo posible.
        </p>
        <p>
          La distancia entre los dos se llama <strong>brecha</strong>, y es el termómetro que usa
          todo el mundo para saber cuánta presión hay sobre el peso argentino. Cuando la brecha es
          grande, entrar al país con dólares rinde muchísimo más; cuando se achica, la ventaja se
          diluye y lo que pasa a pesar es cuánto te cobra por los pesos quien te los venda.
        </p>
        <p>
          Para alguien en Uruguay esto importa por tres motivos concretos: si viajás o cruzás la
          frontera, si cobrás o pagás en pesos argentinos, y si vendés algo a turistas argentinos.
          En los tres casos la pregunta útil no es «cuánto está el blue» sino
          <strong>cuánto termina costándote un peso argentino</strong>, que es lo que resuelve la
          tabla de arriba.
        </p>
        <p class="text-caption text-medium-emphasis mb-0">
          Esta página es informativa. El mercado paralelo argentino es informal y opera fuera del
          circuito bancario; mencionarlo acá es reportar un precio de referencia público, no
          sugerirte que operes en él. Si vas a cambiar plata, la vía formal en Uruguay son las casas
          de cambio y bancos que listamos, con comprobante.
        </p>
      </div>
    </section>

    <!-- Related -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-4">Seguir por acá</h2>
      <VRow>
        <VCol v-for="link in RELATED" :key="link.to" cols="12" sm="6" md="4">
          <VCard
            :to="localePath(link.to)"
            variant="tonal"
            class="blue-page__related pa-4 h-100"
            hover
          >
            <div class="font-weight-medium mb-1">{{ link.title }}</div>
            <div class="text-caption text-medium-emphasis">{{ link.text }}</div>
          </VCard>
        </VCol>
      </VRow>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
// `/dolar-blue-hoy` — the Argentine blue/official rates, and what they mean for
// somebody standing in Uruguay.
//
// The data was already here: `drivers:daily` has been storing both Argentine
// rates every morning since 2011 to attribute moves on the historical charts,
// and the rates API has always carried what Uruguayan casas charge for ARS.
// Neither had a page. Joining them answers the question people actually have
// ("¿cambio pesos acá o llevo dólares?") with two numbers the site already
// refreshes daily, so the page re-prices itself without any new pipeline.
import { computed } from 'vue'
import { formatNumber } from '~/utils/format'
import { brechaPct, spreadPct, type ArsQuote } from '~/utils/blueDollar'

interface BlueResponse {
  blue: { date: string; value: number } | null
  oficial: { date: string; value: number } | null
  blueMonthAgo: { date: string; value: number } | null
  blueYearAgo: { date: string; value: number } | null
  blueChange30d: number | null
  blueChange365d: number | null
  usdSell: number | null
  usdSellHouse: string | null
  arsQuotes: ArsQuote[]
  arsFairValue: number | null
  arsExcludedCount: number
  arsTotalCount: number
  argStale: boolean
  widestSpread: { quote: ArsQuote; pct: number } | null
  comparison: {
    routes: Array<{ id: string; label: string; costPerArs: number; detail: string }>
    best: { id: string }
    directSurchargePct: number | null
  } | null
  updatedAt: string
}

const localePath = useLocalePath()

const { data } = await useAsyncData('dolar-blue', () =>
  $fetch<BlueResponse>('/api/dolar-blue').catch(() => null)
)

const brecha = computed(() => {
  const b = data.value?.blue?.value
  const o = data.value?.oficial?.value
  if (typeof b !== 'number' || typeof o !== 'number') return null
  return brechaPct({ blue: b, oficial: o })
})

const comparison = computed(() => data.value?.comparison ?? null)
const arsQuotes = computed(() => data.value?.arsQuotes ?? [])
const blueDate = computed(() => data.value?.blue?.date ?? '')
const excludedCount = computed(() => data.value?.arsExcludedCount ?? 0)

const spreadOf = (q: ArsQuote) => spreadPct(q)
const signed = (n: number) => `${n > 0 ? '+' : ''}${formatNumber(n, 1)}%`

/** What 100.000 ARS of surcharge actually costs, so the percent lands. */
const extraCostPer100k = computed(() => {
  const c = comparison.value
  if (!c || c.directSurchargePct === null) return ''
  const direct = c.routes.find(r => r.id === 'directo')
  const best = c.routes.find(r => r.id === c.best.id)
  if (!direct || !best) return ''
  return `${formatNumber((direct.costPerArs - best.costPerArs) * 100_000, 0)} pesos uruguayos`
})

const RELATED = [
  {
    to: '/cotizacion/peso-argentino',
    title: 'Cotización del peso argentino',
    text: 'El precio del ARS en cada casa de cambio uruguaya, con su histórico.',
  },
  {
    // Apuntaba a `/frontera`, que no existe: sólo hay `/frontera/[ruta]`.
    // Desde una página del blue, el cruce que corresponde es el argentino.
    to: '/frontera/peso-argentino-en-salto',
    title: 'Cambiar pesos argentinos en Salto',
    text: 'Qué pagan por el ARS las casas de Salto, el paso más usado hacia Concordia.',
  },
  {
    to: '/herramientas/calculadora-presupuesto-viaje',
    title: 'Presupuesto de viaje',
    text: 'Armá el presupuesto del viaje con las cotizaciones de hoy.',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/dolar-blue-hoy'

defineOgImageComponent('Cambio', {
  title: 'Dólar blue hoy',
  subtitle: 'Blue, oficial y cuánto te sale un peso argentino desde Uruguay',
  tag: 'DÓLAR BLUE',
})

useSeoMeta({
  title: 'Dólar blue hoy: cotización y qué significa desde Uruguay | Cambio Uruguay',
  description:
    'Dólar blue y oficial argentino actualizados a diario, la brecha entre los dos, y la comparación que importa desde Uruguay: cuánto te cuesta un peso argentino según cómo lo consigas.',
  ogTitle: 'Dólar blue hoy: cotización y qué significa desde Uruguay',
  ogDescription:
    'Blue, oficial, brecha y el precio real de un peso argentino comprado en Uruguay o cambiado en Argentina.',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: computed(() =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebPage',
              name: 'Dólar blue hoy',
              description:
                'Cotización del dólar blue y oficial argentino y su impacto para quien cambia pesos argentinos desde Uruguay.',
              inLanguage: 'es-UY',
              '@id': canonicalUrl,
              // The rates change daily; claiming a fixed publish date on a page
              // whose numbers are re-read every morning would be wrong.
              dateModified: data.value?.updatedAt,
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Cambio Uruguay',
                  item: 'https://cambio-uruguay.com',
                },
                { '@type': 'ListItem', position: 2, name: 'Dólar blue hoy', item: canonicalUrl },
              ],
            },
            {
              '@type': 'FAQPage',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: '¿Qué es el dólar blue?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Es el precio del dólar en el mercado informal argentino, fuera del circuito bancario. Convive con el dólar oficial, que fija el banco central argentino. La diferencia entre ambos se llama brecha.',
                  },
                },
                {
                  '@type': 'Question',
                  name: '¿Conviene comprar pesos argentinos en Uruguay o llevar dólares?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Depende del día. Comprar pesos argentinos en una casa de cambio uruguaya suele salir más caro que comprar dólares en Uruguay y cambiarlos en Argentina, porque el precio de venta del peso argentino en Uruguay incluye un margen amplio. La página compara ambas rutas con las cotizaciones del día.',
                  },
                },
                {
                  '@type': 'Question',
                  name: '¿Qué es la brecha cambiaria?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Es cuánto más caro está el dólar paralelo que el oficial, expresado en porcentaje. Llegó a superar el 100% en 2023 y desde entonces se achicó fuertemente.',
                  },
                },
              ],
            },
          ],
        })
      ),
    },
  ],
})
</script>

<style scoped>
.blue-page {
  max-width: 1180px;
}
.blue-page__lead {
  max-width: 68ch;
  line-height: 1.7;
  font-size: 1.05rem;
}
.blue-page__stat,
.blue-page__related {
  border-radius: 12px;
  min-width: 0;
}
.blue-page__prose {
  max-width: 72ch;
  line-height: 1.8;
}
.blue-page__prose p {
  margin-bottom: 1rem;
}
.blue-page__link {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
}
.blue-page__link:hover {
  text-decoration: underline;
}
</style>
