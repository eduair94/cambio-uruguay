<template>
  <VContainer class="py-6">
    <VRow justify="center">
      <VCol cols="12" md="10" lg="9">
        <VCard class="overflow-hidden mb-5" elevation="8">
          <div class="hero pa-6 on-dark">
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
              ¿Conviene cambiar dólares en el banco o en una casa de cambio?
            </h1>
            <p class="hero-sub text-body-1 text-grey-lighten-2 mb-3">
              La respuesta no es una opinión: sale de comparar hoy las pizarras de los bancos con
              las de las casas de cambio, mostrador contra mostrador.
            </p>
            <div class="d-flex justify-start justify-md-end">
              <ShareButtons text="¿Banco o casa de cambio? La diferencia de hoy, medida" />
            </div>
          </div>

          <!-- La respuesta, renderizada en el servidor: quién gana hoy y cuánto. Es justo lo que
               una caja de respuesta de Google no puede contestar, porque necesita las pizarras de
               los dos grupos y no la de una institución. -->
          <VCardText v-if="answer" class="cu-answer pa-5">
            <p class="answer-lead text-body-1 mb-2">{{ answer }}</p>
            <p class="answer-note text-body-2 text-medium-emphasis mb-0">
              {{ medianLine }}
              <time v-if="asOfIso" :datetime="asOfIso">Datos del {{ asOfDate }}.</time>
            </p>
          </VCardText>
          <VCardText v-else-if="pending" class="pa-5">
            <VSkeletonLoader type="paragraph" class="bg-transparent" />
          </VCardText>
          <VCardText v-else class="pa-5">
            <p class="answer-lead text-body-1 mb-0">
              Ahora mismo no tenemos las dos pizarras completas para comparar los grupos. La
              comparación mostrador por mostrador sigue disponible en
              <NuxtLink :to="localePath('/casas-de-cambio')">el directorio de casas</NuxtLink>.
            </p>
          </VCardText>
        </VCard>

        <VCard class="mb-5" elevation="2">
          <VCardTitle class="text-subtitle-1 font-weight-bold py-4">
            Lo que publica hoy cada grupo
          </VCardTitle>
          <VCardText>
            <div class="table-scroll">
              <table class="cu-mobile-cards kinds-table">
                <thead>
                  <tr>
                    <th scope="col">Grupo</th>
                    <th scope="col" class="text-end">Pizarras</th>
                    <th scope="col" class="text-end">Mejor venta</th>
                    <th scope="col" class="text-end">Venta mediana</th>
                    <th scope="col" class="text-end">Mejor compra</th>
                    <th scope="col" class="text-end">Compra mediana</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in tableRows" :key="row.kind">
                    <td data-label="Grupo">
                      <NuxtLink v-if="row.href" :to="localePath(row.href)">{{
                        row.label
                      }}</NuxtLink>
                      <span v-else>{{ row.label }}</span>
                    </td>
                    <td data-label="Pizarras" class="text-end">{{ row.count }}</td>
                    <td data-label="Mejor venta" class="text-end">
                      <template v-if="row.bestSell">
                        ${{ row.bestSell.rate }}
                        <span class="d-block text-caption text-medium-emphasis">
                          {{ row.bestSell.name }}
                        </span>
                      </template>
                      <template v-else>—</template>
                    </td>
                    <td data-label="Venta mediana" class="text-end">
                      {{ row.medianSell ? `$${row.medianSell}` : '—' }}
                    </td>
                    <td data-label="Mejor compra" class="text-end">
                      <template v-if="row.bestBuy">
                        ${{ row.bestBuy.rate }}
                        <span class="d-block text-caption text-medium-emphasis">
                          {{ row.bestBuy.name }}
                        </span>
                      </template>
                      <template v-else>—</template>
                    </td>
                    <td data-label="Compra mediana" class="text-end">
                      {{ row.medianBuy ? `$${row.medianBuy}` : '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="table-note text-body-2 text-medium-emphasis">
              «Mejor venta» es el precio más barato al que ese grupo te vende un dólar; «mejor
              compra», el más alto que te paga por uno. La mediana al lado dice si ese mejor precio
              es lo normal del grupo o una excepción de un solo mostrador.
            </p>
            <p v-if="fintechNote" class="table-note text-body-2 text-medium-emphasis">
              {{ fintechNote }}
            </p>
          </VCardText>
        </VCard>

        <VCard class="mb-5" elevation="2">
          <VCardTitle class="text-subtitle-1 font-weight-bold py-4">Cómo está medido</VCardTitle>
          <VCardText>
            <ul class="method-list text-body-2">
              <li>
                <strong>Sólo mostradores.</strong> La pregunta que contesta la respuesta de arriba
                es banco contra casa de cambio para el que va con efectivo, así que se compara el
                precio de contado que cualquiera puede tomar entrando por la puerta. Las
                cotizaciones que exigen ser cliente —el eBROU, el dólar por transferencia entre
                cuentas— quedan afuera: son otra operación, y ponerlas al lado del efectivo mide dos
                cosas distintas.
              </li>
              <li>
                <strong>Las fintech están en la tabla, no en la comparación.</strong> Prex y OCA
                cotizan sólo para sus propios clientes y dentro de su app, así que no son una
                alternativa para el que sale a la calle a cambiar, que es a quien responde esta
                página. Van igual en la tabla porque su precio es un dato útil: si tenés la tarjeta,
                mirá esa fila.
              </li>
              <li>
                <strong>Una pizarra por institución.</strong> Un banco que publica varias
                cotizaciones entra una sola vez, con la de mostrador.
              </li>
              <li>
                <strong>La pizarra fuera de mercado no cuenta.</strong> Una fila que se aparta más
                de {{ OFF_MARKET_PCT }}% de la mediana del mercado no corona ni entra en la mediana
                del grupo. Con cinco bancos, un solo número mal leído daría vuelta la conclusión.
              </li>
              <li>
                <strong>Es el precio de pizarra, no tu precio final.</strong> Hay casas que publican
                tramos preferenciales por encima de cierto monto, y esos precios se ven en
                <NuxtLink :to="localePath('/avanzado')">la vista avanzada</NuxtLink>. Esta página
                compara lo que cada institución tiene publicado en su pizarra.
              </li>
              <li>
                <strong>El precio no es lo único.</strong> Un banco puede quedarte a la vuelta y una
                casa más barata a treinta cuadras; los horarios también difieren. Para eso están
                <NuxtLink :to="localePath('/sucursales')">las sucursales</NuxtLink> y
                <NuxtLink :to="localePath('/mapa')">el mapa</NuxtLink>.
              </li>
            </ul>
          </VCardText>
        </VCard>

        <VCard elevation="2">
          <VCardTitle class="text-subtitle-1 font-weight-bold py-4">Seguí por acá</VCardTitle>
          <VCardText>
            <VList density="comfortable" class="bg-transparent">
              <VListItem
                v-for="link in relatedLinks"
                :key="link.to"
                :to="localePath(link.to)"
                :prepend-icon="link.icon"
                :title="link.title"
                :subtitle="link.subtitle"
              />
            </VList>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
import type { ExchangeRate } from '~/types/api'
import { compareInstitutionKinds, differenceOn, type KindSummary } from '~/utils/bankVsCasa'
import { quotesForCurrency, type CurrencyQuote } from '~/utils/currencyPages'
import { OFF_MARKET_PCT } from '~/utils/marketOutlier'

const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()

/** El monto sobre el que se cuenta la diferencia. Un número redondo que el lector puede escalar. */
const REFERENCE_AMOUNT = 1000

// Bloqueante: la respuesta tiene que estar en el HTML que ve el crawler. Toda la página existe para
// contestar "¿banco o casa?" antes de que nadie haga clic, y una respuesta que llega después de
// hidratar no la ve ni Google ni el que entra y se va.
const { data, pending } = await useAsyncData('banco-o-casa-rates', async () => {
  const result = await getProcessedExchangeData('')
  return { rows: (result?.exchangeData ?? []) as ExchangeRate[] }
})

const rawRows = computed<ExchangeRate[]>(() => data.value?.rows ?? [])

/**
 * El nombre comercial de cada institución.
 *
 * `ExchangeRate.name` es el nombre de la MONEDA ("Dólar USA"), no el de la casa, así que
 * `quotesForCurrency` deja ese texto en `name` y hay que reponerlo desde `localData` — el mismo
 * remapeo que hacen /comparar y /sucursales. Sin esto la tabla diría "Dólar USA" en la columna de
 * quién da el mejor precio.
 */
const nameByOrigin = computed(() => {
  const names = new Map<string, string>()
  for (const row of rawRows.value) {
    const local = (row as { localData?: { name?: string } }).localData?.name
    if (local && !names.has(row.origin)) names.set(row.origin, local)
  }
  return names
})

const prettyOrigin = (origin: string) =>
  nameByOrigin.value.get(origin) ??
  origin
    .split(/[_-]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const usdQuotes = computed<CurrencyQuote[]>(() => quotesForCurrency(rawRows.value, 'USD'))

const comparison = computed(() => compareInstitutionKinds(usdQuotes.value))

const KIND_LABELS: Record<string, { label: string; plural: string; href: string | null }> = {
  casa: {
    label: 'Casas de cambio',
    plural: 'las casas de cambio',
    href: '/casas-de-cambio/casas-de-cambio',
  },
  banco: { label: 'Bancos', plural: 'los bancos', href: '/casas-de-cambio/bancos' },
  fintech: { label: 'Fintech', plural: 'las fintech', href: '/casas-de-cambio/fintech' },
}

const fmtRate = (n: number) =>
  n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtMoney = (n: number) =>
  n.toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const describeSide = (summary: KindSummary, side: 'sell' | 'buy') => {
  const quote = side === 'sell' ? summary.bestSell : summary.bestBuy
  const rate = side === 'sell' ? quote?.sell : quote?.buy
  if (!quote || typeof rate !== 'number') return null
  return { name: prettyOrigin(quote.origin), rate: fmtRate(rate) }
}

const tableRows = computed(() =>
  comparison.value.summaries.map(summary => ({
    kind: summary.kind,
    label: KIND_LABELS[summary.kind]?.label ?? summary.kind,
    href: KIND_LABELS[summary.kind]?.href ?? null,
    count: summary.count,
    bestSell: describeSide(summary, 'sell'),
    bestBuy: describeSide(summary, 'buy'),
    medianSell: summary.medianSell === null ? null : fmtRate(summary.medianSell),
    medianBuy: summary.medianBuy === null ? null : fmtRate(summary.medianBuy),
  }))
)

/**
 * La aclaración que evita que la tabla contradiga a la respuesta.
 *
 * La respuesta de arriba corona entre bancos y casas, que son los dos mostradores a los que se
 * entra caminando. Pero la tabla muestra además la fila de las fintech, y cuando una de ellas
 * vende más barato que las dos —y pasa: la primera lectura real de esta página tenía a Prex en
 * $40,63 contra $40,85 de la mejor casa— el lector ve un titular y abajo un número que lo
 * desmiente. Decirlo es más honesto que esconder la fila o que ampliar la comparación a un precio
 * que exige tener la tarjeta de esa fintech.
 */
const fintechNote = computed(() => {
  const fintech = comparison.value.summaries.find(s => s.kind === 'fintech')
  const best = fintech?.bestSell?.sell
  if (!fintech?.count || typeof best !== 'number' || best <= 0) return ''
  const rivals = comparison.value.summaries
    .filter(s => s.kind !== 'fintech')
    .map(s => s.bestSell?.sell)
    .filter((n): n is number => typeof n === 'number' && n > 0)
  if (!rivals.length || best >= Math.min(...rivals)) return ''
  return (
    `Ojo con la última fila: hoy ${prettyOrigin(fintech.bestSell!.origin)} vende más barato que ` +
    `cualquier banco o casa de cambio, a $${fmtRate(best)}. No entra en la comparación de arriba ` +
    `porque ese precio es sólo para sus clientes y dentro de su app, pero si tenés la tarjeta es ` +
    `el número a mirar.`
  )
})

/**
 * La frase de la respuesta, armada con las dos cifras medidas.
 *
 * El empate se dice como empate. Cuando los dos grupos publican el mismo mejor precio, coronar a
 * uno por una diferencia de cero sería inventar una conclusión que los datos no tienen.
 */
const answer = computed(() => {
  const gap = comparison.value.sell
  if (!gap) return ''
  const winner = KIND_LABELS[gap.winner]?.plural ?? gap.winner
  const loser = KIND_LABELS[gap.loser]?.plural ?? gap.loser
  const best = comparison.value.summaries.find(s => s.kind === gap.winner)
  const rival = comparison.value.summaries.find(s => s.kind === gap.loser)
  const bestQuote = best ? describeSide(best, 'sell') : null
  const rivalQuote = rival ? describeSide(rival, 'sell') : null
  if (!bestQuote || !rivalQuote) return ''

  if (gap.perUnit === 0) {
    return (
      `Hoy da lo mismo: el dólar más barato de ${winner} y el de ${loser} están en el mismo ` +
      `precio, $${bestQuote.rate}. Comprando US$ ${fmtMoney(REFERENCE_AMOUNT)} no hay diferencia ` +
      `entre los dos grupos, así que decidí por cercanía y horario.`
    )
  }

  const total = differenceOn(gap, REFERENCE_AMOUNT)
  return (
    `Hoy comprar dólares sale más barato en ${winner}: ${bestQuote.name} los vende a ` +
    `$${bestQuote.rate} y el mejor precio de ${loser} es $${rivalQuote.rate} ` +
    `(${rivalQuote.name}). Sobre US$ ${fmtMoney(REFERENCE_AMOUNT)} son ` +
    `$${fmtMoney(total ?? 0)} de diferencia, un ${fmtRate(gap.pct)}%.`
  )
})

/** La segunda línea: la mediana, que dice si el mejor precio es la regla o la excepción. */
const medianLine = computed(() => {
  const casa = comparison.value.summaries.find(s => s.kind === 'casa')
  const banco = comparison.value.summaries.find(s => s.kind === 'banco')
  if (!casa?.medianSell || !banco?.medianSell) return ''
  return (
    `Mirando el grupo entero y no sólo al mejor: la venta mediana de ${casa.count} casas de ` +
    `cambio es $${fmtRate(casa.medianSell)} y la de ${banco.count} bancos, ` +
    `$${fmtRate(banco.medianSell)}.`
  )
})

/** La fecha de la lectura más fresca del payload — nunca `new Date()`. */
const asOfIso = computed(() => {
  const dates = rawRows.value
    .map(r => (r.date ? new Date(r.date).getTime() : Number.NaN))
    .filter(Number.isFinite)
  return dates.length ? new Date(Math.max(...dates)).toISOString() : ''
})

const asOfDate = computed(() =>
  asOfIso.value
    ? new Date(asOfIso.value).toLocaleDateString('es-UY', {
        timeZone: 'America/Montevideo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : ''
)

const relatedLinks = [
  {
    to: '/mejor-casa-de-cambio',
    icon: 'mdi-trophy-outline',
    title: 'Qué mostrador tiene hoy el mejor precio',
    subtitle: 'El ranking casa por casa, ya sin agrupar por tipo de institución',
  },
  {
    to: '/casas-de-cambio/bancos',
    icon: 'mdi-bank-outline',
    title: 'Los bancos, uno por uno',
    subtitle: 'Cotización, reseñas y sucursales de cada banco que publica pizarra',
  },
  {
    to: '/casas-de-cambio/casas-de-cambio',
    icon: 'mdi-store-outline',
    title: 'Las casas de cambio, una por una',
    subtitle: 'El mismo detalle para los mostradores que no son bancos',
  },
  {
    to: '/historico',
    icon: 'mdi-chart-line',
    title: 'Cómo se movió cada pizarra',
    subtitle: 'La serie de cada institución, para ver si la diferencia de hoy se repite',
  },
]

const canonical = 'https://cambio-uruguay.com/banco-o-casa-de-cambio-uruguay'

const metaTitle = 'Banco o casa de cambio: dónde conviene cambiar dólares hoy'

/**
 * La descripción lleva la diferencia del día.
 *
 * Está medido en este sitio: una descripción con la cifra del día corre a ~1,4% de CTR y una
 * genérica a 0,03–0,2% desde la misma posición. Cuando la lectura no llegó, vuelve a una frase que
 * describe lo que la página hace sin prometer un número que no tiene.
 */
const metaDescription = computed(() => {
  const gap = comparison.value.sell
  const casa = comparison.value.summaries.find(s => s.kind === 'casa')
  const banco = comparison.value.summaries.find(s => s.kind === 'banco')
  if (!gap || !casa?.medianSell || !banco?.medianSell) {
    return (
      'Comparamos las pizarras de los bancos con las de las casas de cambio de Uruguay: mejor ' +
      'precio y precio mediano de cada grupo, sólo con cotizaciones de mostrador.'
    )
  }
  const total = differenceOn(gap, REFERENCE_AMOUNT) ?? 0
  const winner = gap.winner === 'casa' ? 'en una casa de cambio' : 'en un banco'
  if (gap.perUnit === 0) {
    return (
      `Venta mediana del dólar: $${fmtRate(casa.medianSell)} en ${casa.count} casas de cambio y ` +
      `$${fmtRate(banco.medianSell)} en ${banco.count} bancos. Hoy el mejor precio de los dos ` +
      `grupos es el mismo.`
    )
  }
  return (
    `Venta mediana del dólar: $${fmtRate(casa.medianSell)} en ${casa.count} casas de cambio y ` +
    `$${fmtRate(banco.medianSell)} en ${banco.count} bancos. Hoy conviene comprar ${winner}: ` +
    `$${fmtMoney(total)} de diferencia sobre US$ ${fmtMoney(REFERENCE_AMOUNT)}.`
  )
})

defineOgImageComponent('Cambio', {
  title: metaTitle,
  subtitle: '¿Dónde conviene cambiar hoy?',
  tag: 'BANCO O CASA',
})

useSeoMeta({
  title: metaTitle,
  description: () => metaDescription.value,
  ogTitle: metaTitle,
  ogDescription: () => metaDescription.value,
  ogType: 'website',
  ogUrl: canonical,
  twitterCard: 'summary_large_image',
  twitterTitle: metaTitle,
  twitterDescription: () => metaDescription.value,
})

useHead(() => ({
  link: [{ key: 'i18n-can', hid: 'i18n-can', rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Cambio Uruguay',
            item: 'https://cambio-uruguay.com',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Casas de cambio',
            item: 'https://cambio-uruguay.com/casas-de-cambio',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: 'Banco o casa de cambio',
            item: canonical,
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.hero {
  background: linear-gradient(135deg, #14213d 0%, #1f3a68 100%);
}

/* Vuetify 4 no anula el margen de los bloques de texto, y dentro de una caja con padding el 1em
   del user-agent no colapsa: cada bloque declara el suyo. */
.hero-sub {
  margin-top: 8px;
}

.answer-lead {
  margin-top: 0;
}

.answer-note {
  margin-top: 8px;
}

.table-note {
  margin-top: 12px;
}

.table-scroll {
  overflow-x: auto;
}

.kinds-table {
  width: 100%;
  border-collapse: collapse;
}

.kinds-table th,
.kinds-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.16);
  vertical-align: top;
}

.kinds-table th {
  font-weight: 600;
  white-space: nowrap;
}

.method-list {
  margin-top: 0;
  padding-left: 1.25rem;
}

.method-list li + li {
  margin-top: 10px;
}
</style>
