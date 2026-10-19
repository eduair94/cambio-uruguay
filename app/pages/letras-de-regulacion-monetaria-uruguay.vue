<template>
  <VContainer class="lrm py-8" style="max-width: 1100px">
    <VBreadcrumbs :items="crumbs" class="px-0 pb-2" />

    <header class="mb-6">
      <VChip color="primary" variant="tonal" size="small" class="mb-3">
        Inversiones · licitaciones del BCU
      </VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
        Letras de Regulación Monetaria (LRM): tasas y cómo invertir
      </h1>
      <p class="text-body-1 lead">
        Las LRM son la deuda en pesos del Banco Central del Uruguay: letras de cupón cero que el BCU
        licita todas las semanas para regular cuánta plata circula.
        <template v-if="thirty">
          En la última licitación, la de 30 días cortó en
          <strong>{{ pct(thirty.cutRate) }}</strong> ({{ shortDay(thirty.date) }})</template
        ><template v-if="year">
          y la de un año en <strong>{{ pct(year.cutRate) }}</strong> ({{
            shortDay(year.date)
          }})</template
        >.
      </p>
      <p v-if="yearMove" class="text-body-2 text-medium-emphasis lead mt-2">{{ yearMove }}</p>
      <p v-if="nextAuction" class="text-body-2 lead mt-2">
        La próxima licitación es el <strong>{{ longDay(nextAuction.date) }}</strong
        >, a las {{ nextAuction.hour }}: letra a {{ nextAuction.days }} días.
      </p>
    </header>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">
        Tasa de corte de la última licitación, por plazo
      </h2>
      <p class="text-body-2 lead mb-3">
        El BCU adjudica cada licitación a una sola tasa, la de corte: todos los que entran cobran
        esa. Es tasa efectiva anual en pesos, antes de la comisión del banco.
      </p>
      <div class="table-wrap">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th scope="col">Plazo</th>
              <th scope="col">Licitación</th>
              <th scope="col" class="text-right">Días</th>
              <th scope="col" class="text-right">Tasa de corte</th>
              <th scope="col" class="text-right">Hace un año</th>
              <th scope="col" class="text-right">Adjudicado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in latestRows" :key="row.auction.series">
              <td data-label="Plazo">{{ LRM_TERM_LABEL[row.auction.termRef] }}</td>
              <td data-label="Licitación">{{ shortDay(row.auction.date) }}</td>
              <td data-label="Días" class="text-right">{{ row.auction.days }}</td>
              <td data-label="Tasa de corte" class="text-right font-weight-bold">
                {{ pct(row.auction.cutRate) }}
              </td>
              <td data-label="Hace un año" class="text-right">
                {{ row.yearAgo ? pct(row.yearAgo.cutRate) : '—' }}
              </td>
              <td data-label="Adjudicado" class="text-right">
                $ {{ formatNumber(row.auction.awarded, 0) }} millones
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <VAlert v-if="stale" type="info" variant="tonal" density="comfortable" class="mt-3">
        <span class="text-body-2">
          La última licitación que tenemos es del {{ shortDay(newestDate) }}. El BCU licita todas
          las semanas, así que su planilla puede traer una más nueva:
          <a
            :href="snapshot.sources.pageUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="cu-link"
            >mirala en el BCU</a
          >.
        </span>
      </VAlert>
      <p class="text-caption text-medium-emphasis mt-2">
        Fuente: BCU, planilla «Operaciones BCU y MEF local», con todas las licitaciones de LRM desde
        2019. {{ readLabel }}
      </p>
    </section>

    <section v-if="chartRows.length > 4" class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Cómo se movió la tasa en el último año</h2>
      <p v-if="yearMove" class="text-body-2 lead mb-3">{{ yearMove }}</p>
      <div class="chart-wrap">
        <ClientOnly>
          <LineChart
            :chart-data="chartData"
            :options="chartOptions"
            aria-label="Tasa de corte de las Letras de Regulación Monetaria por plazo, licitación por licitación"
          />
          <template #fallback>
            <VSkeletonLoader type="image" />
          </template>
        </ClientOnly>
      </div>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Próximas licitaciones</h2>
      <template v-if="upcoming.length">
        <div class="table-wrap">
          <VTable class="cu-mobile-cards" density="comfortable">
            <thead>
              <tr>
                <th scope="col">Licitación</th>
                <th scope="col" class="text-right">Días</th>
                <th scope="col">Vence</th>
                <th scope="col" class="text-right">A licitar</th>
                <th scope="col" class="text-right">No competitivo</th>
                <th scope="col" class="text-right">Cierre</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in upcoming" :key="item.series">
                <td data-label="Licitación">{{ longDay(item.date) }}</td>
                <td data-label="Días" class="text-right">{{ item.days }}</td>
                <td data-label="Vence">{{ shortDay(item.maturity) }}</td>
                <td data-label="A licitar" class="text-right">
                  $ {{ formatNumber(item.amount, 0) }} millones
                </td>
                <td data-label="No competitivo" class="text-right">
                  $ {{ formatNumber(item.nonCompetitive, 0) }} millones
                </td>
                <td data-label="Cierre" class="text-right">{{ item.hour }}</td>
              </tr>
            </tbody>
          </VTable>
        </div>
        <p class="text-caption text-medium-emphasis mt-2">
          Calendario tentativo del BCU<template v-if="snapshot.calendar?.publishedOn">
            publicado el {{ longDay(snapshot.calendar.publishedOn, true) }}</template
          >. Puede cambiar por feriados o paros; el BCU lo reemplaza cada viernes.
        </p>
      </template>
      <template v-else>
        <p class="text-body-2 lead mb-2">
          El calendario que tenemos ya pasó. Mientras el BCU no publique el próximo (sale los
          viernes), la regla de su documento de instrumentos es esta:
        </p>
        <ul class="plain-list">
          <li v-for="s in LRM_SCHEDULE" :key="s.termRef">
            <strong>{{ LRM_TERM_LABEL[s.termRef] }}:</strong> {{ s.rule }}.
          </li>
        </ul>
      </template>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">
        ¿Le gana a un plazo fijo? Depende de cuánto pongas
      </h2>
      <p class="text-body-2 lead mb-3">
        La letra no paga IRPF y el plazo fijo sí. Pero una persona no compra en la licitación:
        compra por su banco o por un corredor, y la comisión se cobra aparte. Elegí un monto y un
        plazo para ver qué te queda con cada uno, con las tasas de la última licitación.
      </p>
      <VRow dense class="mb-2">
        <VCol cols="12" sm="6">
          <VTextField
            v-model.number="amount"
            label="Monto a invertir"
            prefix="$"
            type="number"
            :min="LRM_MIN_BID"
            :step="LRM_BID_STEP"
            variant="outlined"
            :error-messages="amountError"
            hide-details="auto"
          />
        </VCol>
        <VCol cols="12" sm="6">
          <VSelect
            v-model="term"
            :items="termItems"
            label="Plazo de la letra"
            variant="outlined"
            hide-details
          />
        </VCol>
      </VRow>
      <div v-if="comparison" class="table-wrap">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th scope="col">Opción</th>
              <th scope="col" class="text-right">Ganás en {{ comparison.days }} días</th>
              <th scope="col" class="text-right">Rinde por año</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in comparison.rows" :key="row.id" :class="{ 'best-row': row.best }">
              <td data-label="Opción">
                <span class="font-weight-medium">{{ row.label }}</span>
                <span class="d-block text-caption text-medium-emphasis">{{ row.detail }}</span>
              </td>
              <td data-label="Ganás" class="text-right font-weight-bold">{{ money(row.gain) }}</td>
              <td data-label="Rinde por año" class="text-right">{{ pct(row.annual) }}</td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <p v-if="comparison" class="text-body-2 lead mt-3">{{ comparison.verdict }}</p>

      <h3 class="text-subtitle-1 font-weight-bold mt-6 mb-2">
        Desde cuánto la LRM comprada por el BROU le gana al plazo fijo e-BROU
      </h3>
      <div class="table-wrap">
        <VTable class="cu-mobile-cards" density="compact">
          <thead>
            <tr>
              <th scope="col">Plazo</th>
              <th scope="col" class="text-right">Tasa de corte</th>
              <th scope="col" class="text-right">Pizarra e-BROU</th>
              <th scope="col" class="text-right">La letra gana desde</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in breakEvenRows" :key="row.termRef">
              <td data-label="Plazo">{{ LRM_TERM_LABEL[row.termRef] }}</td>
              <td data-label="Tasa de corte" class="text-right">{{ pct(row.cutRate) }}</td>
              <td data-label="Pizarra e-BROU" class="text-right">
                {{ row.deposit != null ? pct(row.deposit) : '—' }}
              </td>
              <td data-label="La letra gana desde" class="text-right font-weight-bold">
                {{ row.amount != null ? money(row.amount) : 'más de $ 50 millones' }}
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <p class="text-body-2 lead mt-3">
        La comisión mínima del BROU es de {{ money(BROU_MIN_COMMISSION) }} por operación<template
          v-if="smallTicket"
          >: con {{ money(LRM_MIN_BID) }} a {{ smallTicket.days }} días, la letra genera
          {{ money(smallTicket.gross) }} de interés y la comisión es
          {{ smallTicket.eats ? 'más que eso' : money(smallTicket.commission) }}</template
        >. {{ itauSentence }} Si querés el plazo fijo, simulalo con la
        <NuxtLink :to="links.plazoFijo" class="cu-link">calculadora de plazo fijo</NuxtLink>; si
        buscás liquidez diaria en pesos, mirá las
        <NuxtLink :to="links.cuenta" class="cu-link">cuentas remuneradas</NuxtLink>.
      </p>
      <p class="text-caption text-medium-emphasis mt-2">
        Comisiones según los tarifarios publicados: {{ brouTariff.rule }} (BROU);
        {{ itauTariff.rule }}
        (Itaú). Plazo fijo: pizarra e-BROU en pesos vigente desde el
        {{ BROU_DEPOSIT_BOARD.series.UYU.vigenciaMoneda }}, intereses al vencimiento, menos el IRPF
        del {{ DEPOSIT_IRPF_LAW }}. Corredores y otros bancos publican tarifas propias.
      </p>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Cómo compra una persona</h2>
      <ol class="steps">
        <li>
          <strong>Por un banco o un corredor de bolsa, nunca directo.</strong> En la licitación
          compiten sólo los Operadores Primarios que designa el BCU; el resto de los bancos,
          corredores y casas financieras entra en el tramo no competitivo, a la misma tasa de corte
          y por hasta el 20 % de lo licitado. Tu banco o tu corredor te anota ahí, o te vende letras
          ya emitidas en el mercado secundario.
        </li>
        <li>
          <strong>Con un mínimo de {{ money(LRM_MIN_BID) }}.</strong> El sistema del BCU no admite
          propuestas por menos, y exige múltiplos de {{ money(LRM_BID_STEP) }}. El banco puede pedir
          más.
        </li>
        <li>
          <strong>Antes de la hora de cierre.</strong> Las licitaciones cierran a las 14:00 del día
          que marca el calendario; la plata se debita el día de liquidación, que suele ser el mismo
          (el de un año liquida al día siguiente).
        </li>
        <li>
          <strong>Al vencer cobrás el valor nominal.</strong> No hay cupones en el medio: la
          ganancia es la diferencia entre lo que pagaste y lo que cobrás al final. La custodia es
          sin cargo en el BROU y en Itaú.
        </li>
      </ol>
    </section>

    <section v-if="example" class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Cómo se lee la tasa</h2>
      <p class="text-body-2 lead mb-2">
        El BCU calcula lo que se paga hoy con VA = VN / (1 + i)<sup>t/365</sup>: el valor nominal
        que se cobra al vencer, descontado a la tasa de corte por los días del plazo.
      </p>
      <p class="text-body-2 lead">
        Con la última letra a {{ LRM_TERM_LABEL[example.auction.termRef] }} ({{
          example.auction.days
        }}
        días al {{ pct(example.auction.cutRate) }}), para cobrar
        <strong>{{ money(100000) }}</strong> el {{ shortDay(example.auction.maturity) }} se pagaron
        <strong>{{ money(example.price) }}</strong> el {{ shortDay(example.auction.settlement) }}:
        {{ money(100000 - example.price) }} de ganancia antes de la comisión.
      </p>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Impuestos: las LRM no pagan IRPF</h2>
      <p class="text-body-2 lead mb-2">
        El Título 7, art. 38, literal A exonera del IRPF «los intereses de los títulos de deuda
        pública», y también la ganancia por venderlos antes de que venzan. La DGI trata a las LRM
        como títulos de deuda pública (Consulta 6.322 de 2020), y el reglamento con el que el BCU
        las licita las llama así. Un plazo fijo en pesos a menos de un año paga
        {{ pct(depositIrpf, 1) }} de IRPF sobre el interés: esa es toda la ventaja impositiva de la
        letra, y la comisión del banco puede comérsela entera (la cuenta está más arriba).
      </p>
      <p class="text-body-2 lead">
        Para el Impuesto al Patrimonio y el resto de tus rentas de capital, mirá
        <NuxtLink :to="links.impuestos" class="cu-link">impuestos a las inversiones</NuxtLink>.
      </p>
    </section>

    <section v-if="treasury.length" class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">¿Y en UI? Las Notas del Tesoro</h2>
      <p class="text-body-2 lead mb-3">
        Hoy el BCU emite LRM sólo en pesos nominales. Para indexar a la inflación, el instrumento
        del Estado es la Nota del Tesoro del MEF, que el BCU licita en el mismo calendario. Paga
        cupón y dura años, no meses.
      </p>
      <div class="table-wrap">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th scope="col">Moneda</th>
              <th scope="col">Licitación</th>
              <th scope="col">Vence</th>
              <th scope="col" class="text-right">Cupón</th>
              <th scope="col" class="text-right">Tasa de corte</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in treasury" :key="t.currency">
              <td data-label="Moneda">{{ TREASURY_LABEL[t.currency] }}</td>
              <td data-label="Licitación">{{ shortDay(t.date) }} (serie {{ t.series }})</td>
              <td data-label="Vence">{{ shortDay(t.maturity) }}</td>
              <td data-label="Cupón" class="text-right">{{ pct(t.coupon, 3) }}</td>
              <td data-label="Tasa de corte" class="text-right font-weight-bold">
                {{ pct(t.yield) }}{{ t.currency === 'UYU' ? '' : ' real' }}
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <p class="text-caption text-medium-emphasis mt-2">
        Fuente: BCU, misma planilla, hoja «NT MEF». En UI y UP la tasa es por encima de la
        inflación.
        <NuxtLink :to="links.bonos" class="cu-link">Cómo funcionan los bonos</NuxtLink>.
      </p>
    </section>

    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

    <section class="mt-8 mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Fuentes</h2>
      <ul class="sources">
        <li v-for="s in sources" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer" class="cu-link">{{
            s.label
          }}</a>
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis">
        Normas, tarifarios y pizarra verificados el {{ longDay(LRM_VERIFIED_AT, true) }}. Las tasas
        de las licitaciones se leen de la planilla del BCU dos veces por día.
      </p>
    </section>

    <section>
      <h2 class="text-h5 font-weight-bold mb-3">Seguir leyendo</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          v-for="l in related"
          :key="l.to"
          :to="localePath(l.to)"
          variant="tonal"
          color="primary"
          size="small"
        >
          {{ l.label }}
        </VBtn>
      </div>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
// Explícito: components/charts/ no se auto-importa plano (sería `ChartsLineChart`).
import LineChart from '~/components/charts/LineChart.vue'
import { formatNumber, formatSiteDateTime } from '~/utils/format'
import { BROU_DEPOSIT_BOARD, DEPOSIT_IRPF_LAW, netOfIrpf } from '~/utils/investments'
import {
  BROKER_TARIFFS,
  BROU_MIN_COMMISSION,
  LRM_BASELINE,
  LRM_BID_STEP,
  LRM_MIN_BID,
  LRM_SCHEDULE,
  LRM_SOURCES,
  LRM_STATIC_DESCRIPTION,
  LRM_TERM_LABEL,
  LRM_VERIFIED_AT,
  breakEvenAmount,
  buildLrmFaq,
  daysBetween,
  depositOutcome,
  latestFor,
  longDay,
  lrmDescription,
  lrmOutcome,
  lrmTitle,
  money,
  pct,
  presentValue,
  shortDay,
  upcomingFrom,
  usableSnapshot,
  yearAgoOf,
  type LrmAuction,
  type LrmSnapshotDoc,
  type LrmTermRef,
} from '~/utils/lrm'

const localePath = useLocalePath()

// Rutas cortas: con `localePath('…')` adentro el enlace no entra en una línea y prettier y
// vue/max-attributes-per-line se pelean por dónde va `class`.
const links = {
  plazoFijo: localePath('/herramientas/calculadora-plazo-fijo'),
  cuenta: localePath('/cuenta-remunerada-uruguay'),
  impuestos: localePath('/impuestos-inversiones-uruguay'),
  bonos: localePath('/guias/bonos-y-renta-fija-uruguay'),
}

const { data } = await useFetch<LrmSnapshotDoc | null>('/api/letras-regulacion-monetaria', {
  key: 'lrm',
  default: () => null,
})

// La foto del job si vino entera; si no, la planilla leída a mano, que dice su propia fecha.
const live = computed(() => usableSnapshot(data.value))
const snapshot = computed<LrmSnapshotDoc>(() => live.value ?? LRM_BASELINE)

// El día de hoy en Montevideo, resuelto UNA vez en setup: en el template se reevaluaría en cada
// render y el servidor y el navegador podrían no coincidir.
const TODAY = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Montevideo' })

const thirty = computed(() => latestFor(snapshot.value, 30))
const year = computed(() => latestFor(snapshot.value, 360))
const newestDate = computed(
  () =>
    snapshot.value.latest
      .map(a => a.date)
      .sort()
      .at(-1) ?? ''
)
/** El BCU licita todos los días hábiles: diez días sin una licitación nueva es una planilla vieja. */
const stale = computed(() => Boolean(newestDate.value) && daysBetween(newestDate.value, TODAY) > 10)

const readLabel = computed(() =>
  live.value?.capturedAt
    ? `Leída el ${formatSiteDateTime(live.value.capturedAt, 'es-UY', { day: 'numeric', month: 'long' })}.`
    : `Leída a mano el ${longDay(LRM_VERIFIED_AT, true)}.`
)

const latestRows = computed(() =>
  [...snapshot.value.latest]
    .sort((a, b) => a.termRef - b.termRef)
    .map(auction => ({ auction, yearAgo: yearAgoOf(snapshot.value.recent, auction) }))
)

const yearMove = computed(() => {
  if (!thirty.value) return ''
  const before = yearAgoOf(snapshot.value.recent, thirty.value)
  if (!before) return ''
  const diff = thirty.value.cutRate - before.cutRate
  if (Math.abs(diff) < 0.005) {
    return `Hace un año, el ${shortDay(before.date)}, la de 30 días cortaba en lo mismo.`
  }
  return `Hace un año, el ${shortDay(before.date)}, la de 30 días cortaba en ${pct(before.cutRate)}: hoy rinde ${formatNumber(Math.abs(diff), 2)} puntos ${diff < 0 ? 'menos' : 'más'}.`
})

const upcoming = computed(() => upcomingFrom(snapshot.value.calendar, TODAY))
const nextAuction = computed(() => upcoming.value[0] ?? null)

// --- La cuenta contra el plazo fijo ---------------------------------------------------------------

const amount = ref(LRM_MIN_BID * 5)
const term = ref<LrmTermRef>(90)
const termItems = computed(() =>
  [...snapshot.value.latest]
    .sort((a, b) => a.termRef - b.termRef)
    .map(a => ({ title: `${LRM_TERM_LABEL[a.termRef]} (${a.days} días)`, value: a.termRef }))
)
const amountError = computed(() =>
  (amount.value || 0) < LRM_MIN_BID
    ? `El BCU no admite propuestas por menos de ${money(LRM_MIN_BID)}.`
    : ''
)

const brouTariff = BROKER_TARIFFS.find(t => t.id === 'brou')!
const itauTariff = BROKER_TARIFFS.find(t => t.id === 'itau')!

const comparison = computed(() => {
  const auction: LrmAuction | null =
    latestFor(snapshot.value, term.value) ?? snapshot.value.latest[0] ?? null
  const invested = Math.max(LRM_MIN_BID, Number(amount.value) || 0)
  if (!auction) return null
  const none = lrmOutcome(invested, auction, 'none')
  const brou = lrmOutcome(invested, auction, 'brou')
  const itau = lrmOutcome(invested, auction, 'itau')
  const deposit = depositOutcome(invested, auction.days)
  const rows = [
    {
      id: 'none',
      label: 'LRM sin comisión',
      detail: `La tasa de corte entera, ${pct(auction.cutRate)}: el techo.`,
      gain: none.netGain,
      annual: none.netAnnualPct,
    },
    {
      id: 'brou',
      label: 'LRM comprada por el BROU',
      detail: `Comisión de ${money(brou.commission)}.`,
      gain: brou.netGain,
      annual: brou.netAnnualPct,
    },
    {
      id: 'itau',
      label: 'LRM comprada por Itaú',
      detail: '2 puntos menos de tasa.',
      gain: itau.netGain,
      annual: itau.netAnnualPct,
    },
  ]
  if (deposit) {
    rows.push({
      id: 'deposit',
      label: 'Plazo fijo e-BROU',
      detail: `Pizarra ${pct(deposit.grossPct)} (${deposit.tranche.label} días), menos ${money(deposit.irpf)} de IRPF.`,
      gain: deposit.netGain,
      annual: deposit.netAnnualPct,
    })
  }
  // La mejor opción contratable: la fila sin comisión es un techo, no algo que se pueda comprar.
  const buyable = rows.filter(r => r.id !== 'none')
  const best = buyable.reduce((a, b) => (b.gain > a.gain ? b : a))
  // La mejor letra que se puede comprar de verdad, para comparar contra el plazo fijo.
  const letters = rows.filter(r => r.id === 'brou' || r.id === 'itau')
  const bestLetter = letters.reduce((a, b) => (b.gain > a.gain ? b : a))
  const letterName = bestLetter.id === 'brou' ? 'el BROU' : 'Itaú'
  const verdict = deposit
    ? best.id === 'deposit'
      ? `Con ${money(invested)} a ${auction.days} días, el plazo fijo por e-BROU te deja ${money(deposit.netGain - bestLetter.gain)} más que la mejor letra comprada por banco (por ${letterName}), aun pagando IRPF.`
      : `Con ${money(invested)} a ${auction.days} días, la letra comprada por ${letterName} te deja ${money(bestLetter.gain - deposit.netGain)} más que el plazo fijo por e-BROU.`
    : ''
  return {
    days: auction.days,
    rows: rows.map(r => ({ ...r, best: r.id === best.id })),
    verdict,
  }
})

const breakEvenRows = computed(() =>
  [...snapshot.value.latest]
    .sort((a, b) => a.termRef - b.termRef)
    .map(a => ({
      termRef: a.termRef,
      cutRate: a.cutRate,
      deposit: depositOutcome(LRM_MIN_BID, a.days)?.grossPct ?? null,
      amount: breakEvenAmount(a, 'brou'),
    }))
)

/** Lo que hace la comisión mínima con la letra más chica y más corta. */
const smallTicket = computed(() => {
  if (!thirty.value) return null
  const o = lrmOutcome(LRM_MIN_BID, thirty.value, 'brou')
  return {
    days: thirty.value.days,
    gross: o.grossGain,
    commission: o.commission,
    eats: o.commission >= o.grossGain,
  }
})

/** Si con la tarifa de Itaú la letra le gana alguna vez al plazo fijo, a estas tasas. */
const itauSentence = computed(() => {
  const wins = snapshot.value.latest.filter(a => breakEvenAmount(a, 'itau') != null)
  if (!wins.length) {
    return 'Con la tarifa de Itaú —2 puntos de la tasa— la letra queda por debajo del plazo fijo e-BROU en todos los plazos y montos, con las tasas de esta licitación.'
  }
  const labels = wins.map(a => LRM_TERM_LABEL[a.termRef]).join(', ')
  return `Con la tarifa de Itaú —2 puntos de la tasa— la letra le gana al plazo fijo e-BROU sólo a ${labels}, con las tasas de esta licitación.`
})

const depositIrpf = netOfIrpf(1, 'UYU', 12).taxPct

/** El ejemplo de la fórmula del BCU con la última letra a un año (o la más larga que haya). */
const example = computed(() => {
  const auction =
    year.value ?? [...snapshot.value.latest].sort((a, b) => b.days - a.days)[0] ?? null
  return auction ? { auction, price: presentValue(100000, auction.cutRate, auction.days) } : null
})

const TREASURY_LABEL: Record<'UYU' | 'UI' | 'UP', string> = {
  UYU: 'Pesos',
  UI: 'Unidades indexadas',
  UP: 'Unidades previsionales',
}
const treasury = computed(() => snapshot.value.treasury)

const faq = computed(() =>
  buildLrmFaq(
    snapshot.value,
    nextAuction.value,
    breakEvenRows.value.find(r => r.termRef === 30)?.amount ?? null
  )
)

// --- Gráfico ----------------------------------------------------------------------------------------

const SERIES: { termRef: LrmTermRef; color: string }[] = [
  { termRef: 30, color: '#1976d2' },
  { termRef: 90, color: '#ff8f00' },
  { termRef: 180, color: '#00897b' },
  { termRef: 360, color: '#15517e' },
]

const chartRows = computed(() =>
  [...snapshot.value.recent].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
)

const chartData = computed(() => {
  const labels = [...new Set(chartRows.value.map(a => a.date))]
  return {
    labels: labels.map(shortDay),
    datasets: SERIES.filter(s => chartRows.value.some(a => a.termRef === s.termRef)).map(s => {
      const byDate = new Map(
        chartRows.value.filter(a => a.termRef === s.termRef).map(a => [a.date, a.cutRate])
      )
      return {
        label: LRM_TERM_LABEL[s.termRef],
        data: labels.map(d => byDate.get(d) ?? null),
        borderColor: s.color,
        backgroundColor: s.color,
        spanGaps: true,
        pointRadius: 0,
        tension: 0.2,
      }
    }),
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } },
  scales: {
    x: { ticks: { maxRotation: 0, autoSkipPadding: 16 } },
    y: { ticks: { callback: (v: number) => `${v} %` } },
  },
}

// --- Fuentes, enlaces y SEO ------------------------------------------------------------------------

const sources = [
  {
    label: 'BCU — Operaciones BCU y MEF local (planilla de licitaciones)',
    url: LRM_SOURCES.operationsUrl,
  },
  { label: 'BCU — Calendario tentativo de colocaciones', url: LRM_SOURCES.calendarUrl },
  {
    label: 'BCU — Instrumentos emitidos por el BCU (características y mecanismo de licitación)',
    url: LRM_SOURCES.characteristicsUrl,
  },
  {
    label: 'BCU — Reglamento de Operadores Primarios (junio de 2024)',
    url: LRM_SOURCES.primaryDealersUrl,
  },
  { label: 'IMPO — Título 7, art. 38 (rentas exentas de IRPF)', url: LRM_SOURCES.irpfUrl },
  { label: 'DGI — Consulta tributaria 6.322 (2020)', url: LRM_SOURCES.dgiConsultaUrl },
  { label: brouTariff.sourceLabel, url: brouTariff.source },
  { label: itauTariff.sourceLabel, url: itauTariff.source },
  { label: 'BROU — Pizarras de plazo fijo e-BROU y sucursales', url: BROU_DEPOSIT_BOARD.pdfUrl },
]

const related = [
  { label: 'Calculadora de plazo fijo', to: '/herramientas/calculadora-plazo-fijo' },
  { label: 'Cuenta remunerada', to: '/cuenta-remunerada-uruguay' },
  { label: 'Dónde invertir en Uruguay', to: '/inversiones-uruguay' },
  { label: 'Impuestos a las inversiones', to: '/impuestos-inversiones-uruguay' },
  { label: 'Bonos y renta fija', to: '/guias/bonos-y-renta-fija-uruguay' },
  { label: 'Qué son las LRM (glosario)', to: '/glosario/letras-regulacion-monetaria' },
  { label: 'Valor de la UI hoy', to: '/indicadores/unidad-indexada' },
]

const crumbs = computed(() => [
  { title: 'Inicio', to: localePath('/') },
  { title: 'Inversiones', to: localePath('/inversiones-uruguay') },
  { title: 'Letras de Regulación Monetaria', disabled: true },
])

const canonicalUrl = 'https://cambio-uruguay.com/letras-de-regulacion-monetaria-uruguay'

// La tasa va en el `<title>` sólo si vino un dato: sin él, título estable. Con la foto horneada
// también hay dato, y lleva su fecha en la descripción.
const title = computed(() => lrmTitle(snapshot.value))
const description = computed(() =>
  snapshot.value.latest.length ? lrmDescription(snapshot.value) : LRM_STATIC_DESCRIPTION
)

defineOgImageComponent('Cambio', {
  title: 'Letras de Regulación Monetaria',
  subtitle:
    thirty.value && year.value
      ? `${pct(thirty.value.cutRate)} a 30 días · ${pct(year.value.cutRate)} a un año`
      : 'Tasas de las licitaciones del BCU',
  tag: 'INVERSIÓN',
})

useSeoMeta({
  title: () => `${title.value} | Cambio Uruguay`,
  description: () => description.value,
  ogTitle: () => title.value,
  ogDescription: () => description.value,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: () => title.value,
  twitterDescription: () => description.value,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'letras de regulacion monetaria, tasas lrm uruguay, lrm bcu, licitacion lrm, como comprar lrm, letras del bcu, lrm o plazo fijo, lrm irpf, notas del tesoro ui',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Inicio',
                item: 'https://cambio-uruguay.com/',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Inversiones',
                item: 'https://cambio-uruguay.com/inversiones-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Letras de Regulación Monetaria',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: 'Letras de Regulación Monetaria (LRM): tasas y cómo invertir',
            description: description.value,
            inLanguage: 'es-UY',
            dateModified: newestDate.value || LRM_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            author: { '@type': 'Organization', name: 'Cambio Uruguay' },
            publisher: { '@type': 'Organization', name: 'Cambio Uruguay' },
            citation: sources.map(s => ({ '@type': 'CreativeWork', name: s.label, url: s.url })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.table-wrap {
  overflow-x: auto;
}
.lrm :deep(.v-table) {
  width: 100%;
}
.lead {
  max-width: 68ch;
}
/* El contenedor del canvas mide 100 % de alto: sin una altura acá el gráfico colapsa a cero. */
.chart-wrap {
  position: relative;
  height: clamp(240px, 44vw, 340px);
}
.best-row td {
  background: rgba(var(--v-theme-primary), 0.08);
}
.cu-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.cu-link:hover {
  text-decoration: underline;
}
.steps,
.plain-list {
  padding-left: 1.25rem;
  max-width: 68ch;
}
.steps li,
.plain-list li {
  margin-top: 8px;
}
.sources {
  padding-left: 1.1rem;
  font-size: 0.9rem;
}
.sources li {
  margin-bottom: 4px;
}
</style>
