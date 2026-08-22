<template>
  <VContainer class="page py-6 py-md-10">
    <!-- Hero -->
    <header class="hero on-dark mb-8">
      <p class="eyebrow">Ruta a Brasil · {{ freshness }}</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
        ¿Llevo dólares a Brasil o compro reales acá?
      </h1>
      <p class="hero-lead text-body-1 mb-4">
        Las dos puntas están medidas: lo que cobra hoy una casa de cambio uruguaya por un real, y lo
        que paga un câmbio brasileño por un dólar. Con esos dos precios la pregunta tiene una
        respuesta numérica, y cambia sola cada 20 minutos.
      </p>
      <p v-if="verdict" class="hero-verdict text-body-1 font-weight-medium mb-4">{{ verdict }}</p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          color="white"
          variant="flat"
          size="small"
          prepend-icon="mdi-calculator"
          href="#cuenta"
        >
          Ver la cuenta
        </VBtn>
        <VBtn
          variant="outlined"
          size="small"
          prepend-icon="mdi-earth"
          :to="localePath('/cotizaciones-de-la-region')"
        >
          Tablero regional
        </VBtn>
        <VBtn
          variant="text"
          size="small"
          prepend-icon="mdi-cash-multiple"
          :to="localePath('/cotizacion/real')"
        >
          El real casa por casa
        </VBtn>
      </div>
    </header>

    <VAlert v-if="!brl" type="warning" variant="tonal" density="comfortable" class="mb-8">
      Ahora mismo falta una de las dos puntas de la comparación, así que la página no la inventa.
      Volvé en un rato: el tablero se refresca cada 20 minutos.
    </VAlert>

    <!-- 1. La cuenta -->
    <section id="cuenta" class="mb-10" aria-labelledby="cuenta-h">
      <h2 id="cuenta-h" class="section-heading mb-1">La cuenta, con los precios de hoy</h2>
      <p class="section-lead text-body-2 mb-4">
        Cuántos reales te quedan por la misma plata, según cómo la muevas. Cambiá el monto si querés
        verlo con lo tuyo.
      </p>

      <VCard variant="tonal" class="pa-4 mb-4">
        <div class="d-flex flex-wrap align-center ga-3">
          <VTextField
            v-model.number="amountUyu"
            type="number"
            min="0"
            step="1000"
            density="compact"
            variant="outlined"
            hide-details
            label="Pesos uruguayos"
            style="max-width: 200px"
          />
          <span class="text-body-2 text-medium-emphasis">
            El monto no cambia cuál ruta gana: los dos precios son por unidad.
          </span>
        </div>
      </VCard>

      <VRow>
        <VCol v-for="route in brl?.routes || []" :key="route.kind" cols="12" md="6">
          <VCard
            variant="outlined"
            class="pa-4 h-100"
            :class="{ 'winner-card': brl?.best === route.kind }"
          >
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-subtitle-1 font-weight-bold">{{ routeTitle(route.kind) }}</span>
              <VChip v-if="brl?.best === route.kind" size="small" color="success" variant="flat">
                Más barata
              </VChip>
            </div>
            <p class="rate-big mb-1">
              {{ unitsFor(route) }}
              <span class="rate-unit text-body-2 text-medium-emphasis">reales</span>
            </p>
            <p class="text-caption text-medium-emphasis mb-3">
              {{ regionalRate(route.costPerUnit) }} pesos uruguayos por real
            </p>
            <p class="text-body-2 mb-0">{{ route.note }}</p>
          </VCard>
        </VCol>
      </VRow>

      <VAlert
        v-if="brl?.differencePct !== null && brl?.differencePct !== undefined"
        :type="brl.differencePct < 1 ? 'info' : 'success'"
        variant="tonal"
        density="comfortable"
        icon="mdi-scale-balance"
        class="mt-4"
      >
        <p class="alert-title font-weight-bold mb-1">La diferencia</p>
        <p class="text-body-2 mb-0">{{ regionalRouteVerdict(brl) }}</p>
      </VAlert>
    </section>

    <!-- 2. Los tres dólares de Brasil -->
    <section class="mb-10" aria-labelledby="tres">
      <h2 id="tres" class="section-heading mb-1">
        Brasil tiene más de un dólar, y la diferencia se paga
      </h2>
      <p class="section-lead text-body-2 mb-4">
        Ninguno de estos tres precios es "el dólar en Brasil": son tres cosas distintas y sólo una
        es la que vas a pagar en un mostrador.
      </p>

      <VRow>
        <VCol v-for="market in brMarkets" :key="market.id" cols="12" md="4">
          <VCard variant="outlined" class="pa-4 h-100">
            <div class="d-flex align-center ga-2 mb-2">
              <VChip size="x-small" variant="tonal" :color="market.chipColor">{{
                market.chip
              }}</VChip>
            </div>
            <p class="rate-big mb-1">
              {{ regionalRate(market.quote.avg) }}
              <span class="rate-unit text-body-2 text-medium-emphasis">R$ / USD</span>
            </p>
            <p class="text-subtitle-2 font-weight-bold mb-1">{{ market.quote.label }}</p>
            <p class="text-body-2 mb-0">{{ market.explain }}</p>
          </VCard>
        </VCol>
      </VRow>

      <VAlert
        v-if="turismoGap !== null"
        type="warning"
        variant="tonal"
        density="comfortable"
        icon="mdi-percent-outline"
        class="mt-4"
      >
        <p class="alert-title font-weight-bold mb-1">El recargo del turismo, medido</p>
        <p class="text-body-2 mb-0">
          Hoy el dólar turismo se vende {{ regionalPct(turismoGap, false) }} por encima del fixing
          oficial. Ese recargo es lo que cobra el câmbio por darte billetes, y es la razón por la
          que la ruta de los dólares no gana por tanto como sugeriría comparar contra el PTAX.
          Cualquier página que compare el precio uruguayo contra el PTAX y no contra el turismo te
          está prometiendo un tipo de cambio que en el mostrador no existe.
        </p>
      </VAlert>
    </section>

    <!-- 3. El real acá -->
    <section class="mb-10" aria-labelledby="aca">
      <h2 id="aca" class="section-heading mb-1">Lo que cobra una casa uruguaya por un real</h2>
      <p class="section-lead text-body-2 mb-4">
        La otra punta sale del tablero propio: {{ localBrl?.sample || 'varias' }} casas que
        efectivamente operan reales, con el mejor precio de venta entre ellas.
      </p>
      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="outlined" class="pa-4 h-100">
            <p class="text-subtitle-2 font-weight-bold mb-2">Real en casas uruguayas</p>
            <VTable density="compact">
              <tbody>
                <tr>
                  <td>Mejor compra (te pagan)</td>
                  <td class="text-right font-weight-bold">
                    {{ regionalRate(localBrl?.buy ?? null) }}
                  </td>
                </tr>
                <tr>
                  <td>Mejor venta (te cobran)</td>
                  <td class="text-right font-weight-bold">
                    {{ regionalRate(localBrl?.sell ?? null) }}
                  </td>
                </tr>
                <tr>
                  <td>Spread entre las dos puntas</td>
                  <td class="text-right">{{ regionalPct(localBrl?.spreadPct ?? null, false) }}</td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="outlined" class="pa-4 h-100">
            <p class="text-subtitle-2 font-weight-bold mb-2">Dólar en casas uruguayas</p>
            <VTable density="compact">
              <tbody>
                <tr>
                  <td>Mejor venta (lo que te sale un dólar acá)</td>
                  <td class="text-right font-weight-bold">
                    {{ regionalRate(localUsd?.sell ?? null) }}
                  </td>
                </tr>
                <tr>
                  <td>Reales por dólar en Brasil (turismo)</td>
                  <td class="text-right font-weight-bold">{{ regionalRate(turismoBuy) }}</td>
                </tr>
                <tr>
                  <td>Resultado: pesos por real</td>
                  <td class="text-right font-weight-bold">{{ regionalRate(dollarRouteCost) }}</td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- 4. La serie -->
    <section v-if="ptaxValues.length > 1" class="mb-10" aria-labelledby="serie">
      <h2 id="serie" class="section-heading mb-1">El real, últimos 180 días</h2>
      <p class="section-lead text-body-2 mb-4">
        La serie es el fixing PTAX del Banco Central de Brasil, que es el número contra el que se
        liquidan contratos y tarjetas allá. Nuestra copia arranca en enero de 1995, cuando un dólar
        valía 0,84 reales.
      </p>
      <VCard variant="outlined" class="pa-4">
        <Sparkline :values="ptaxValues" :up="(ptaxChange ?? 0) >= 0" />
        <div class="d-flex flex-wrap justify-space-between mt-2">
          <span class="text-caption text-medium-emphasis">
            {{ ptaxRange.from }} → {{ ptaxRange.to }}
          </span>
          <span class="text-caption">
            {{ regionalRate(ptaxValues[0]) }} →
            {{ regionalRate(ptaxValues[ptaxValues.length - 1]) }} R$/USD ({{
              regionalPct(ptaxChange)
            }})
          </span>
        </div>
      </VCard>
      <p class="text-body-2 mt-3 mb-0">
        Para una ruta esto importa menos de lo que parece: lo que decide la comparación no es dónde
        está el real, sino cuánto se llevan las dos puntas. Un real más caro encarece las dos rutas
        casi por igual.
      </p>
    </section>

    <!-- 5. Cuándo conviene la otra -->
    <section class="mb-10" aria-labelledby="cuando">
      <h2 id="cuando" class="section-heading mb-1">Cuándo conviene igual comprar reales acá</h2>
      <p class="section-lead text-body-2 mb-4">
        La diferencia de precio no es lo único que decide. Estos casos empujan para el otro lado, y
        ninguno aparece en la cuenta de arriba:
      </p>
      <VRow>
        <VCol v-for="item in WHEN_LOCAL" :key="item.title" cols="12" md="6">
          <VCard variant="outlined" class="pa-4 h-100">
            <div class="d-flex align-center ga-2 mb-1">
              <VIcon size="small" color="primary">{{ item.icon }}</VIcon>
              <span class="text-subtitle-2 font-weight-bold">{{ item.title }}</span>
            </div>
            <p class="text-body-2 mb-0">{{ item.text }}</p>
          </VCard>
        </VCol>
      </VRow>

      <VAlert
        type="info"
        variant="tonal"
        density="comfortable"
        icon="mdi-information-outline"
        class="mt-4"
      >
        <p class="alert-title font-weight-bold mb-1">Lo que esta cuenta no incluye</p>
        <p class="text-body-2 mb-0">
          Comisiones fijas por operación, el costo de moverte hasta la casa de cambio, el riesgo de
          llevar efectivo y lo que cambia el precio si operás montos grandes. Tampoco cubre pagar
          con tarjeta: ahí no cambiás plata, la liquida tu banco al tipo de cambio y con los
          recargos que publique tu emisor.
        </p>
      </VAlert>
    </section>

    <!-- 6. Frontera -->
    <section class="mb-10" aria-labelledby="frontera">
      <h2 id="frontera" class="section-heading mb-1">Si cruzás por tierra</h2>
      <p class="section-lead text-body-2 mb-4">
        En la frontera la pregunta cambia de forma: en Rivera, Chuy o Artigas hay casas que operan
        reales todos los días y comercios que cobran en las dos monedas. Estas páginas muestran qué
        casas hay en cada departamento y a cuánto están.
      </p>
      <VRow>
        <VCol v-for="link in FRONTERA" :key="link.to" cols="12" sm="6" md="3">
          <VCard variant="outlined" class="pa-4 h-100" :to="localePath(link.to)">
            <div class="d-flex align-center ga-2 mb-1">
              <VIcon size="small" color="primary">mdi-map-marker-radius-outline</VIcon>
              <span class="text-subtitle-2 font-weight-bold">{{ link.title }}</span>
            </div>
            <p class="text-body-2 text-medium-emphasis mb-0">{{ link.text }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- 7. FAQ -->
    <section class="mb-10">
      <FaqSection :items="FAQ" heading="Preguntas frecuentes" :expanded="true" />
    </section>

    <!-- 8. Fuentes -->
    <section aria-labelledby="fuentes">
      <h2 id="fuentes" class="section-heading mb-3">De dónde salen estos números</h2>
      <ul class="tight-list text-body-2">
        <li>
          <strong>Fixing PTAX y su serie diaria:</strong> Banco Central do Brasil (<a
            href="https://www.bcb.gov.br/estabilidadefinanceira/historicocotacoes"
            target="_blank"
            rel="noopener noreferrer nofollow"
            >bcb.gov.br</a
          >), leído por su API pública.
        </li>
        <li>
          <strong>Dólar comercial y dólar turismo:</strong> AwesomeAPI (<a
            href="https://docs.awesomeapi.com.br/api-de-moedas"
            target="_blank"
            rel="noopener noreferrer nofollow"
            >economia.awesomeapi.com.br</a
          >), que publica el precio de mercado con máximo, mínimo y variación del día.
        </li>
        <li>
          <strong>Real y dólar en casas uruguayas:</strong> el relevamiento propio de este sitio,
          que consulta las casas cada cinco minutos.
        </li>
        <li>
          Todo junto y en JSON, sin registro:
          <NuxtLink :to="localePath('/api-cotizaciones-regionales')">la API regional</NuxtLink>.
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FaqItem } from '~/utils/faqAnswers'
import {
  regionalAge,
  regionalPct,
  regionalRate,
  regionalRouteVerdict,
  regionalSeriesChangePct,
  regionalSeriesValues,
  regionalUnitsFor,
  type RegionalHistoryPoint,
  type RegionalQuote,
  type RegionalRoute,
  type RegionalSnapshot,
} from '~/utils/regional'

const localePath = useLocalePath()

const { data } = await useFetch<RegionalSnapshot | null>('/api/regional', {
  key: 'regional-board-br',
  default: () => null,
})
const snapshot = computed(() => (data.value?.quotes?.length ? data.value : null))

const HISTORY_FROM = new Date(Date.now() - 180 * 86_400_000).toISOString().slice(0, 10)
const { data: ptaxHistory } = await useFetch<{ points: RegionalHistoryPoint[] }>(
  '/api/regional-history',
  {
    key: 'regional-ptax-180d',
    query: { country: 'BR', market: 'ptax', base: 'USD', quote: 'BRL', from: HISTORY_FROM },
    default: () => ({ points: [] }),
  }
)

const amountUyu = ref(10000)

const freshness = computed(() => regionalAge(snapshot.value?.generatedAt ?? null))
const brl = computed(() => snapshot.value?.routes.find(route => route.currency === 'BRL') ?? null)
const verdict = computed(() => (brl.value ? regionalRouteVerdict(brl.value) : ''))

const quoteById = (id: string): RegionalQuote | null =>
  snapshot.value?.quotes.find(quote => quote.id === id) ?? null

const localBrl = computed(() => quoteById('UY:casas:BRLUYU'))
const localUsd = computed(() => quoteById('UY:casas:USDUYU'))
const ptax = computed(() => quoteById('BR:ptax:USDBRL'))
const turismo = computed(() => quoteById('BR:turismo:USDBRL'))
const comercial = computed(() => quoteById('BR:comercial:USDBRL'))

/** What a câmbio PAYS for a dollar — the side a traveller is on. */
const turismoBuy = computed(() => turismo.value?.buy ?? turismo.value?.avg ?? null)

const dollarRouteCost = computed(() => {
  const usdSell = localUsd.value?.sell
  const perDollar = turismoBuy.value
  if (!usdSell || !perDollar) return null
  return usdSell / perDollar
})

/** Ask-to-ask, which is what the traveller actually pays. */
const turismoGap = computed(() => {
  const reference = ptax.value?.sell ?? ptax.value?.avg
  const traded = turismo.value?.sell ?? turismo.value?.avg
  if (!reference || !traded) return null
  return (traded / reference - 1) * 100
})

const brMarkets = computed(() => {
  const entries: Array<{
    id: string
    quote: RegionalQuote
    chip: string
    chipColor: string
    explain: string
  }> = []
  if (ptax.value)
    entries.push({
      id: ptax.value.id,
      quote: ptax.value,
      chip: 'Oficial',
      chipColor: 'primary',
      explain:
        'El fixing que calcula el Banco Central con las operaciones entre bancos. Es la referencia legal: contratos, impuestos y liquidaciones de tarjeta se escriben contra este número. Nadie te lo da en un mostrador.',
    })
  if (comercial.value)
    entries.push({
      id: comercial.value.id,
      quote: comercial.value,
      chip: 'Mercado',
      chipColor: 'secondary',
      explain:
        'El precio al que se opera el real durante la rueda. Se mueve todo el día y es el que muestran los medios brasileños, pero tampoco es el precio de una casa de cambio.',
    })
  if (turismo.value)
    entries.push({
      id: turismo.value.id,
      quote: turismo.value,
      chip: 'Mostrador',
      chipColor: 'success',
      explain:
        'El dólar turismo: lo que un câmbio brasileño paga por tus billetes. Este es el único de los tres que vas a ver si entrás a cambiar plata, y es el que usa la cuenta de esta página.',
    })
  return entries
})

const ptaxValues = computed(() =>
  regionalSeriesValues(ptaxHistory.value?.points ?? [], 'BR:ptax:USDBRL')
)
const ptaxChange = computed(() => regionalSeriesChangePct(ptaxValues.value))
const ptaxRange = computed(() => {
  const points = (ptaxHistory.value?.points ?? []).filter(point => point.key === 'BR:ptax:USDBRL')
  return { from: points[0]?.day ?? '', to: points[points.length - 1]?.day ?? '' }
})

const routeTitle = (kind: 'local' | 'dollars') =>
  kind === 'local' ? 'Comprar reales en Uruguay' : 'Llevar dólares y cambiarlos en Brasil'

function unitsFor(route: RegionalRoute): string {
  const units = regionalUnitsFor(route, amountUyu.value)
  if (units === null) return '—'
  return units.toLocaleString('es-UY', { maximumFractionDigits: 2 })
}

const WHEN_LOCAL = [
  {
    icon: 'mdi-cash-fast',
    title: 'Vas por poca plata',
    text: 'Sobre 100 dólares, una diferencia de 5 % son cinco dólares. Si tenés que hacer una operación extra y buscar un câmbio con buen precio, ese ahorro se lo come el tiempo.',
  },
  {
    icon: 'mdi-airplane-landing',
    title: 'Llegás de noche o a un lugar chico',
    text: 'Los câmbios de aeropuerto y de balneario cobran bastante peor que los del centro. Llegar sin un peso en la moneda local y cambiar en el primer mostrador que aparezca suele salir más caro que el ahorro teórico.',
  },
  {
    icon: 'mdi-file-document-outline',
    title: 'No querés operar dos veces',
    text: 'La ruta de los dólares son dos operaciones: cada una tiene su spread y su comprobante. Si cambiás una sola vez y de un lado solo, el margen extra es el precio de la simplicidad.',
  },
  {
    icon: 'mdi-map-marker-radius-outline',
    title: 'Cruzás por el día a la frontera',
    text: 'Para una compra en Chuy o en Livramento con vuelta el mismo día, importa más qué casa te queda cerca y con qué monedas te reciben en el comercio que la diferencia entre dos rutas.',
  },
]

const FRONTERA = [
  {
    to: '/frontera/real-en-rivera',
    title: 'Rivera',
    text: 'Frontera seca con Santana do Livramento.',
  },
  {
    to: '/frontera/real-en-rocha',
    title: 'Chuy (Rocha)',
    text: 'La frontera con Chuí, de la playa al free shop.',
  },
  { to: '/frontera/real-en-cerro-largo', title: 'Cerro Largo', text: 'Río Branco y Yaguarón.' },
  { to: '/frontera/real-en-artigas', title: 'Artigas', text: 'Quaraí, del otro lado del puente.' },
]

const FAQ: FaqItem[] = [
  {
    id: 'brasil-cual-dolar',
    question:
      '¿Por qué comparan contra el dólar turismo y no contra la cotización que sale en las noticias?',
    answer:
      'Porque la cotización de las noticias es el dólar comercial o el fixing PTAX, y ninguno de los dos se consigue en un mostrador. El dólar turismo es lo que un câmbio brasileño paga por billetes, que es exactamente la operación que hace un uruguayo que cruza con dólares. Comparar contra el PTAX daría una ventaja de varios puntos que después no aparece.',
  },
  {
    id: 'brasil-cuanto-cambia',
    question: '¿Esta respuesta cambia seguido?',
    answer:
      'La diferencia entre las dos rutas se mueve todos los días, porque dependen de tres precios distintos que se mueven por separado: lo que cobra una casa uruguaya por reales, lo que cobra por dólares y el recargo del turismo brasileño. La página se recalcula cada 20 minutos, así que el número de arriba es el de hoy, no el de la última vez que alguien escribió el texto.',
  },
  {
    id: 'brasil-tarjeta',
    question: '¿Y si pago todo con tarjeta?',
    answer:
      'Entonces no cambiás plata: tu banco liquida el consumo al tipo de cambio que aplique y con los recargos que publique tu emisor. Esa comparación es otra y depende de tu tarjeta, no del câmbio brasileño. Lo que sí conviene saber es que el consumo se liquida contra una referencia de mercado, no contra el turismo, y que los recargos por operar en el exterior los define cada emisor.',
  },
  {
    id: 'brasil-reales-sobrantes',
    question: 'Me sobraron reales, ¿los cambio allá o acá?',
    answer:
      'La cuenta se da vuelta: mirá la compra. En Uruguay las casas te pagan por un real bastante menos de lo que te lo venden, y ese spread es el costo de deshacer la operación. Si vas a volver a Brasil en poco tiempo, guardarlos suele salir más barato que cambiarlos dos veces.',
  },
  {
    id: 'brasil-cuanto-efectivo',
    question: '¿Hay un límite para entrar efectivo a Brasil?',
    answer:
      'Brasil exige declarar el ingreso o egreso de dinero en efectivo por encima de un umbral fijado en reales, y Uruguay tiene su propia obligación de declarar al salir o entrar con montos altos. No son multas por llevar la plata: son declaraciones. Antes de viajar con una suma grande conviene verificar el monto vigente en cada aduana, porque se actualiza.',
  },
]

const title = '¿Llevar dólares a Brasil o comprar reales en Uruguay?'
const description =
  'La comparación con precios reales de las dos puntas: lo que cobra hoy una casa de cambio uruguaya por un real contra lo que paga un câmbio brasileño por un dólar, con el recargo del dólar turismo medido contra el fixing PTAX.'
const canonicalUrl = 'https://cambio-uruguay.com/llevar-dolares-o-reales-a-brasil'

defineOgImageComponent('Cambio', {
  title: '¿Dólares o reales para Brasil?',
  subtitle: 'La cuenta con precios de las dos puntas, hoy',
  tag: 'RUTA A BRASIL',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: title,
        description,
        url: canonicalUrl,
        inLanguage: 'es-UY',
        author: { '@type': 'Organization', name: 'Cambio Uruguay' },
        publisher: { '@type': 'Organization', name: 'Cambio Uruguay' },
      }),
    },
  ],
}))
</script>

<style scoped>
.hero {
  position: relative;
  isolation: isolate;
  border-radius: 16px;
  padding: 28px 24px;
  background:
    radial-gradient(circle at 80% 20%, rgba(0, 200, 130, 0.22), transparent 36%),
    linear-gradient(135deg, #10261f 0%, #14402f 55%, #123f52 100%);
  color: #f2fbf6;
}
.hero-lead {
  max-width: 74ch;
  margin-top: 0;
  color: rgba(242, 251, 246, 0.88);
}
.hero-verdict {
  max-width: 74ch;
  margin-top: 0;
  color: #d8ffe9;
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  margin-top: 0;
  margin-bottom: 12px;
  padding: 4px 12px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  color: #bff5d8;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.section-heading {
  margin-top: 0;
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.3;
}
.section-lead {
  margin-top: 0;
  max-width: 80ch;
}
.alert-title {
  margin-top: 0;
}
.rate-big {
  margin-top: 0;
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.15;
}
.rate-unit {
  font-weight: 400;
  margin-left: 6px;
}
.winner-card {
  border-color: rgb(var(--v-theme-success));
  border-width: 2px;
}
.tight-list {
  margin-top: 0;
  padding-left: 1.15rem;
}
.tight-list li + li {
  margin-top: 8px;
}
</style>
