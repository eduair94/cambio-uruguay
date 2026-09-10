<template>
  <VContainer class="tf-page py-6 py-md-10">
    <header class="hero pa-5 pa-md-8 rounded-lg mb-8">
      <p class="eyebrow mb-2">Transferencias · {{ reviewedLabel }}</p>
      <h1 class="hero-title mb-3">Cuánto cuesta mover tu plata entre bancos</h1>
      <p class="hero-lead text-body-1 mb-4">
        El sitio publica hace años a cuánto compra dólares cada institución. Lo que nunca publicó es
        la otra mitad de la cuenta: aprovechar esa diferencia exige
        <strong>dos transferencias</strong>, y esas transferencias tienen precio. Acá está el
        tarifario de cada una, con la fila textual y el documento del que sale.
      </p>
      <p v-if="headline" class="hero-lead text-body-1 mb-0">
        Hoy la diferencia entre lo que paga <strong>{{ headline.homeLabel }}</strong> por tu dólar
        ({{ money(headline.homeBuy) }}) y lo que paga <strong>{{ headline.viaLabel }}</strong> ({{
          money(headline.viaBuy)
        }}) es de <strong>{{ money(headline.gap) }} por dólar</strong>. Sobre U$S 1.000 son
        <strong>{{ formatUYU(headline.gap * 1000) }}</strong> antes de comisiones.
      </p>
    </header>

    <!-- El caso que originó la página -->
    <VCard variant="tonal" color="primary" class="pa-4 pa-md-6 mb-8">
      <div class="cu-section-title mb-2">De dónde salió esto</div>
      <p class="text-body-2 mb-3">
        Un hilo de r/uruguay del 10 de setiembre de 2026 propuso una ruta de cuatro pasos: mandar
        los dólares de Itaú a Prex, cambiarlos ahí, volver los pesos y pagar la tarjeta. El autor
        decía que «no hay costo de transferencia entre Prex y Itaú». <strong>Tiene razón</strong>, y
        por un motivo más angosto de lo que parece: las dos patas están exoneradas
        <em>por nombre propio</em>, una en cada tarifario.
      </p>
      <VRow class="mb-1">
        <VCol cols="12" md="6">
          <div class="quote-box pa-3 h-100">
            <p class="text-caption text-medium-emphasis mb-1">Manual de tarifas Itaú, §8.5</p>
            <p class="text-body-2 mb-0">
              «Giros a IEDEs por canales digitales OCA Blue y PREX:
              <strong>Sin costo de forma ilimitada en cantidad y monto</strong>, para persona física
              y jurídica. Otras IEDE: 0,85 % por transacción.»
            </p>
          </div>
        </VCol>
        <VCol cols="12" md="6">
          <div class="quote-box pa-3 h-100">
            <p class="text-caption text-medium-emphasis mb-1">Cartilla de uso Prex</p>
            <p class="text-body-2 mb-0">
              «Transferencias a bancos de plaza: $ 45 IVA inc o USD 1,90 IVA inc […]
              <strong>Las transferencias a Banco Itaú son GRATIS.</strong>»
            </p>
          </div>
        </VCol>
      </VRow>
      <p class="text-body-2 mb-0">
        O sea: la ruta es gratis <strong>en ese par y sólo en ese par</strong>. Desde cualquier otro
        banco la ida cuesta lo que cobre ese banco y la vuelta cuesta $ 45 o U$S 1,90. Por eso esta
        página no dice «hacé esto»: pone la cuenta.
      </p>
    </VCard>

    <!-- Calculadora -->
    <section id="calculadora" class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-3">Tu ruta, con las comisiones adentro</h2>

      <VCard class="pa-4 pa-sm-6 mb-5">
        <VRow>
          <VCol cols="12" md="3">
            <VTextField
              v-model.number="amountUsd"
              type="number"
              min="0"
              step="100"
              label="Dólares a cambiar"
              prefix="US$"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
          <VCol cols="12" md="3">
            <VSelect
              v-model="home"
              :items="homeItems"
              label="Dónde tenés los dólares"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
          <VCol cols="12" md="3">
            <VSelect
              v-model="via"
              :items="viaItems"
              label="Dónde los cambiás"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
          <VCol cols="12" md="3" class="d-flex align-center">
            <VSwitch
              v-model="returnLeg"
              color="primary"
              density="comfortable"
              hide-details
              :label="returnLeg ? 'Vuelvo los pesos al banco' : 'Gasto los pesos desde ahí'"
            />
          </VCol>
        </VRow>
      </VCard>

      <VAlert v-if="sameInstitution" type="info" variant="tonal" density="comfortable" class="mb-5">
        Origen y destino son la misma institución: no hay transferencia, y por lo tanto no hay
        comisión ni diferencia de pizarra que capturar.
      </VAlert>

      <template v-else>
        <VRow class="mb-2">
          <VCol cols="12" md="7">
            <VCard variant="outlined" class="pa-4 h-100">
              <div class="cu-section-title mb-3">La cuenta</div>
              <VTable density="comfortable" class="cu-mobile-cards ledger">
                <tbody>
                  <tr>
                    <td data-label="Concepto">
                      Diferencia de pizarra
                      <span class="cu-hint d-block">
                        {{ money(viaBuy) }} −
                        {{ homeBuy === null ? 'sin pizarra' : money(homeBuy) }}
                        por dólar
                      </span>
                    </td>
                    <td data-label="Importe" class="text-right num">
                      {{ homeBuy === null ? 'sin dato' : formatUYU(route.gainUyu) }}
                    </td>
                  </tr>
                  <tr>
                    <td data-label="Concepto">
                      Ida: {{ homeLabel }} → {{ viaLabel }}, en dólares
                      <span class="cu-hint d-block">{{
                        route.outbound.quote || 'sin tarifario publicado'
                      }}</span>
                    </td>
                    <td data-label="Importe" class="text-right num">
                      {{ feeText(route.outbound) }}
                    </td>
                  </tr>
                  <tr v-if="route.ret">
                    <td data-label="Concepto">
                      Vuelta: {{ viaLabel }} → {{ homeLabel }}, en pesos
                      <span class="cu-hint d-block">{{ route.ret.quote }}</span>
                    </td>
                    <td data-label="Importe" class="text-right num">{{ feeText(route.ret) }}</td>
                  </tr>
                  <tr v-else>
                    <td data-label="Concepto">
                      Vuelta
                      <span class="cu-hint d-block">
                        Los pesos se gastan desde {{ viaLabel }}: esta comisión no existe.
                      </span>
                    </td>
                    <td data-label="Importe" class="text-right num">—</td>
                  </tr>
                  <tr class="total-row">
                    <td data-label="Concepto"><strong>Te queda</strong></td>
                    <td data-label="Importe" class="text-right num">
                      <strong :class="route.netUyu > 0 ? 'text-success' : 'text-error'">
                        {{ homeBuy === null ? 'sin dato' : formatUYU(route.netUyu) }}
                      </strong>
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </VCard>
          </VCol>

          <VCol cols="12" md="5">
            <VCard variant="flat" class="verdict pa-5 h-100 d-flex flex-column justify-center">
              <div class="text-overline mb-1">Punto de equilibrio</div>
              <template v-if="route.breakevenUsd !== null">
                <p class="big-n mb-2">US$ {{ route.breakevenUsd.toLocaleString('es-UY') }}</p>
                <p class="text-body-2 mb-0">
                  Por debajo de ese monto, las comisiones de la ruta se comen la diferencia de
                  pizarra y la operación da pérdida.
                </p>
              </template>
              <template v-else-if="homeBuy === null">
                <p class="big-n mb-2">—</p>
                <p class="text-body-2 mb-0">
                  {{ homeLabel }} no publica una pizarra en dólares para este canal, así que no hay
                  diferencia que medir. La comisión sí se puede calcular.
                </p>
              </template>
              <template v-else-if="viaBuy <= (homeBuy ?? 0)">
                <p class="big-n mb-2">Ninguno</p>
                <p class="text-body-2 mb-0">
                  {{ viaLabel }} no paga más que {{ homeLabel }} por el dólar: la ruta pierde plata
                  con cualquier monto, aunque las dos transferencias sean gratis.
                </p>
              </template>
              <template v-else>
                <p class="big-n mb-2">US$ 1</p>
                <p class="text-body-2 mb-0">
                  Las dos patas son gratis en este par, así que la ruta rinde desde el primer dólar.
                </p>
              </template>
            </VCard>
          </VCol>
        </VRow>

        <VAlert
          v-for="(w, i) in route.warnings"
          :key="i"
          type="warning"
          variant="tonal"
          density="comfortable"
          class="mb-2"
        >
          <span class="text-body-2">{{ w }}</span>
        </VAlert>

        <VAlert
          v-if="frozenNotice"
          type="warning"
          variant="tonal"
          density="comfortable"
          class="mb-2"
          icon="mdi-snowflake"
        >
          <span class="text-body-2">{{ frozenNotice }}</span>
        </VAlert>
      </template>
    </section>

    <!-- Ranking de destinos -->
    <section class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-2">
        Desde {{ homeLabel }}, ¿a dónde conviene moverlo?
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-4" style="max-width: 72ch">
        Los mismos {{ amountLabel }}, contra cada institución que publica pizarra y tarifario. La
        columna que importa es la última: es la diferencia de pizarra ya con las dos transferencias
        descontadas.
      </p>
      <div class="table-scroll">
        <VTable density="comfortable" class="cu-mobile-cards">
          <thead>
            <tr>
              <th>Destino</th>
              <th class="text-right">Compra el dólar a</th>
              <th class="text-right">Ida</th>
              <th class="text-right">Vuelta</th>
              <th class="text-right">Te queda</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in ranking" :key="row.origin">
              <td data-label="Destino">
                {{ row.label }}
                <VChip v-if="row.origin === via" size="x-small" color="primary" class="ml-1">
                  elegido
                </VChip>
              </td>
              <td data-label="Compra a" class="text-right num">{{ money(row.viaBuy) }}</td>
              <td data-label="Ida" class="text-right num">{{ feeText(row.result.outbound) }}</td>
              <td data-label="Vuelta" class="text-right num">
                {{ row.result.ret ? feeText(row.result.ret) : '—' }}
              </td>
              <td data-label="Te queda" class="text-right num">
                <strong :class="row.result.netUyu > 0 ? 'text-success' : 'text-error'">
                  {{ homeBuy === null ? 'sin dato' : formatUYU(row.result.netUyu) }}
                </strong>
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Se usa la cotización del canal por el que se opera: la de cuenta (transferencia / eBROU)
        cuando la institución publica una, y la de mostrador cuando es la única que hay. No es lo
        mismo, y en varios bancos la diferencia entre las dos es mayor que toda la comisión.
      </p>
    </section>

    <!-- Tarifarios -->
    <section class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que cobra cada institución por transferir</h2>
      <p class="text-body-2 text-medium-emphasis mb-4" style="max-width: 72ch">
        Salida a otra institución, por canal digital, persona física. Cada fila es la del documento
        oficial, sin reescribir.
      </p>
      <VExpansionPanels variant="accordion" class="mb-3">
        <VExpansionPanel v-for="s in schedules" :key="s.origin">
          <VExpansionPanelTitle>
            <div class="d-flex align-center flex-wrap ga-2">
              <strong>{{ s.label }}</strong>
              <span class="text-caption text-medium-emphasis">{{ s.channel }}</span>
              <VChip v-if="s.freeTo" size="x-small" color="success" variant="tonal">
                exonera {{ s.freeTo.origins.map(labelFor).join(' y ') }}
              </VChip>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <ul class="band-list mb-3">
              <li v-for="(b, i) in s.bands" :key="i" class="mb-2">
                <span class="text-body-2">{{ b.quote }}</span>
              </li>
              <li v-if="s.freeTo" class="mb-2">
                <span class="text-body-2">{{ s.freeTo.quote }}</span>
              </li>
            </ul>
            <div v-if="s.allowances?.length" class="mb-3">
              <p class="text-caption text-medium-emphasis mb-1">Operaciones sin costo</p>
              <ul class="band-list">
                <li v-for="(a, i) in s.allowances" :key="i" class="text-body-2">{{ a.label }}</li>
              </ul>
            </div>
            <div v-if="s.limits?.length" class="mb-3">
              <p class="text-caption text-medium-emphasis mb-1">Lo que la tarifa no dice</p>
              <ul class="band-list">
                <li v-for="(l, i) in s.limits" :key="i" class="text-body-2 mb-1">
                  <strong>{{ l.label }}.</strong> {{ l.detail }}
                </li>
              </ul>
            </div>
            <p v-if="s.inbound" class="text-body-2 mb-3">
              <strong>Al recibir.</strong> {{ s.inbound.note }}
            </p>
            <p class="text-caption text-medium-emphasis mb-0">
              Fuente:
              <a :href="s.source.url" target="_blank" rel="noopener nofollow">{{
                s.source.label
              }}</a>
              · vigencia declarada {{ dateText(s.source.effective) }}
            </p>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Escalones -->
    <section v-if="cliffs.length" class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-2">Los escalones: un peso más y la comisión salta</h2>
      <p class="text-body-2 text-medium-emphasis mb-4" style="max-width: 72ch">
        Ninguna de estas tarifas es continua. En estos cortes, transferir un peso de más cambia de
        banda y multiplica la comisión. Salen calculados del propio tarifario, no de una lista
        escrita a mano: si la institución mueve el corte, el número de acá se mueve con él.
      </p>
      <div class="table-scroll">
        <VTable density="comfortable" class="cu-mobile-cards">
          <thead>
            <tr>
              <th>Institución</th>
              <th class="text-right">Corte</th>
              <th class="text-right">Justo abajo</th>
              <th class="text-right">Justo arriba</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in cliffs" :key="c.origin + c.below">
              <td data-label="Institución">{{ c.label }}</td>
              <td data-label="Corte" class="text-right num">{{ formatUYU(c.below) }}</td>
              <td data-label="Abajo" class="text-right num">{{ feeText(c.feeBelow) }}</td>
              <td data-label="Arriba" class="text-right num">
                <strong class="text-error">{{ feeText(c.feeAbove) }}</strong>
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>
    </section>

    <!-- Otros pro-tips -->
    <section class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-2">Las otras exoneraciones que ya están escritas</h2>
      <p class="text-body-2 text-medium-emphasis mb-4" style="max-width: 72ch">
        Buscando el costo de la ruta aparecieron varias más, en los mismos documentos. Ninguna es un
        truco: son renglones de tarifario que casi nadie lee.
      </p>
      <VRow>
        <VCol v-for="tip in tips" :key="tip.id" cols="12" md="6">
          <VCard variant="outlined" class="pa-4 h-100">
            <p class="text-subtitle-2 font-weight-bold mb-2">{{ tip.title }}</p>
            <p class="text-body-2 mb-2">{{ tip.body }}</p>
            <p class="text-caption text-medium-emphasis mb-0">
              <a :href="tip.source.url" target="_blank" rel="noopener nofollow">
                {{ tip.source.label }}
              </a>
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Lo que no se puede decir -->
    <section class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-3">Lo que esta página no puede decirte</h2>
      <VCard variant="tonal" color="warning" class="pa-4 pa-md-5">
        <ul class="honest-list mb-0">
          <li class="mb-2">
            <strong>La pizarra publicada no siempre es la del homebanking.</strong> En el propio
            hilo un usuario reportó que su app le daba un precio distinto al de la pizarra web de su
            banco, y otro dijo lo mismo del BROU. Acá se usa lo que la institución publica, que es
            lo único verificable desde afuera. El número de tu pantalla manda.
          </li>
          <li class="mb-2">
            <strong>Las comisiones cambian varias veces por año.</strong> Cada fila trae la fecha de
            vigencia de su documento. Si una tiene meses, tratala como una estimación y abrí el
            enlace antes de mover una cifra grande.
          </li>
          <li class="mb-2">
            <strong>Las operaciones sin costo del mes no se cuentan.</strong> Si tu cuenta es de
            Inclusión Financiera tenés 8 transferencias gratis por mes y esta cuenta te va a mostrar
            un costo que quizás no pagues. Va al revés que el error habitual: acá el resultado real
            puede ser mejor, no peor.
          </li>
          <li class="mb-2">
            <strong>No mira impuestos ni el IRPF.</strong> Es la aritmética de la operación, no la
            de tu declaración.
          </li>
          <li class="mb-0">
            <strong>No es una recomendación.</strong> Mover plata entre instituciones tiene
            fricción, demoras de cámara y riesgo operativo que ningún número de acá mide.
          </li>
        </ul>
      </VCard>
    </section>

    <FaqSection :items="faq" heading="Preguntas frecuentes" :expanded="true" class="mb-8" />

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Seguí con el detalle</h2>
      <VRow>
        <VCol v-for="link in relatedLinks" :key="link.to" cols="12" sm="6" md="4">
          <VCard variant="outlined" class="pa-4 h-100" :to="localePath(link.to)">
            <p class="text-subtitle-2 font-weight-bold mb-1">{{ link.title }}</p>
            <p class="text-body-2 text-medium-emphasis mb-0">{{ link.body }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-bank-transfer">
      <span class="text-body-2">
        Aritmética sobre tarifarios públicos y fechados, no asesoramiento financiero. Las
        cotizaciones son las que publica cada institución y se actualizan solas; las comisiones se
        revisaron a mano el {{ dateText(TRANSFER_FEES_LAST_REVIEWED) }}.
      </span>
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ExchangeRate } from '~/types/api'
import { ACCOUNT_ONLY_TYPES } from '~/utils/exchangeChannel'
import type { FaqItem } from '~/utils/faqAnswers'
import { formatUSD, formatUYU } from '~/utils/format'
import {
  evaluateRoute,
  feeCliffs,
  TRANSFER_FEES_LAST_REVIEWED,
  TRANSFER_SCHEDULES,
  TRANSFER_TIPS,
  type FeeResult,
  type RouteResult,
} from '~/utils/transferFees'

const localePath = useLocalePath()

const { rows } = useExchangeRates(['USD'])
const { frozenFor } = useFrozenQuotes()

const schedules = TRANSFER_SCHEDULES
const tips = TRANSFER_TIPS

const labelFor = (origin: string): string =>
  schedules.find(s => s.origin === origin)?.label ?? origin

/**
 * La cotización del canal por el que se opera.
 *
 * Un banco publica DOS dólares bajo el mismo origen: el de mostrador y el de
 * cuenta (`TRANSFERENCIA` / `EBROU`). Quien hace esta ruta opera desde su cuenta,
 * así que la comparación honesta es contra el segundo. Hoy la diferencia entre
 * los dos, en el mismo banco, es mayor que toda la comisión de la ruta.
 */
const quoteFor = (origin: string): { buy: number | null; type: string } | null => {
  const list = (rows.value ?? []).filter(
    (r: ExchangeRate) => r.origin === origin && r.code === 'USD'
  )
  const account = list.find((r: ExchangeRate) => ACCOUNT_ONLY_TYPES.has(r.type ?? ''))
  const plain = list.find((r: ExchangeRate) => !(r.type ?? ''))
  const chosen = account ?? plain ?? null
  if (!chosen) return null
  return { buy: typeof chosen.buy === 'number' ? chosen.buy : null, type: chosen.type ?? '' }
}

const amountUsd = ref(1_000)
const home = ref('itau')
const via = ref('prex')
const returnLeg = ref(true)

const withQuote = computed(() =>
  schedules
    .map(s => ({ schedule: s, quote: quoteFor(s.origin) }))
    .filter(x => x.quote !== null && x.quote.buy !== null)
)

const homeItems = computed(() => schedules.map(s => ({ title: s.label, value: s.origin })))
const viaItems = computed(() =>
  withQuote.value.map(x => ({
    title: `${x.schedule.label} · compra a ${money(x.quote!.buy)}`,
    value: x.schedule.origin,
  }))
)

const homeLabel = computed(() => labelFor(home.value))
const viaLabel = computed(() => labelFor(via.value))
const sameInstitution = computed(() => home.value === via.value)

const homeBuy = computed<number | null>(() => quoteFor(home.value)?.buy ?? null)
const viaBuy = computed<number>(() => quoteFor(via.value)?.buy ?? 0)

const amount = computed(() => Math.max(0, amountUsd.value || 0))
const amountLabel = computed(() => `US$ ${amount.value.toLocaleString('es-UY')}`)

const route = computed<RouteResult>(() =>
  evaluateRoute({
    amountUsd: amount.value,
    home: home.value,
    via: via.value,
    homeBuy: homeBuy.value,
    viaBuy: viaBuy.value,
    returnLeg: returnLeg.value,
  })
)

const ranking = computed(() =>
  withQuote.value
    .filter(x => x.schedule.origin !== home.value)
    .map(x => ({
      origin: x.schedule.origin,
      label: x.schedule.label,
      viaBuy: x.quote!.buy as number,
      result: evaluateRoute({
        amountUsd: amount.value,
        home: home.value,
        via: x.schedule.origin,
        homeBuy: homeBuy.value,
        viaBuy: x.quote!.buy as number,
        returnLeg: returnLeg.value,
      }),
    }))
    .sort((a, b) => b.result.netUyu - a.result.netUyu)
)

/** La pizarra que se está usando para decidir, si lleva días quieta. */
const frozenNotice = computed<string | null>(() => {
  const q = quoteFor(via.value)
  if (!q) return null
  const entry = frozenFor(via.value, 'USD', q.type)
  if (!entry) return null
  return `La cotización de ${viaLabel.value} lleva ${entry.days} días publicando el mismo número. Una pizarra quieta puede ser un precio real, pero también puede ser un tablero que dejó de actualizarse: confirmá antes de mover el dinero.`
})

const headline = computed(() => {
  const best = withQuote.value
    .filter(x => x.schedule.origin !== 'itau')
    .sort((a, b) => (b.quote!.buy as number) - (a.quote!.buy as number))[0]
  const itau = quoteFor('itau')
  if (!best || !itau || itau.buy === null) return null
  const gap = (best.quote!.buy as number) - itau.buy
  if (gap <= 0) return null
  return {
    homeLabel: 'Itaú',
    homeBuy: itau.buy,
    viaLabel: best.schedule.label,
    viaBuy: best.quote!.buy as number,
    gap,
  }
})

const cliffs = computed(() => feeCliffs(viaBuy.value || 40))

const money = (n: number | null | undefined): string =>
  typeof n === 'number' ? formatUYU(n) : 'sin dato'

/**
 * Una comisión se muestra en la moneda en que el tarifario la cobra.
 *
 * No se convierte a pesos para la vista: Santander y Scotiabank cobran en
 * dólares aunque la transferencia vaya en pesos, y mostrar ese número ya
 * convertido escondería justo el dato que hay que poder contrastar contra el
 * documento.
 */
const feeText = (fee: FeeResult): string => {
  if (fee.schedule === null) return 'sin tarifario'
  if (fee.amount === 0) return 'sin costo'
  return fee.currency === 'USD'
    ? formatUSD(fee.amount)
    : formatUYU(fee.amount, fee.amount < 10 ? 2 : 0)
}

const dateText = (iso: string): string => {
  const d = new Date(`${iso}T12:00:00`)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })
}

const reviewedLabel = `tarifarios al ${dateText(TRANSFER_FEES_LAST_REVIEWED)}`

const relatedLinks = [
  {
    to: '/cobrar-en-dolares-gastar-en-pesos',
    title: 'Cobrás en dólares y gastás en pesos',
    body: 'La otra ruta: dejar que convierta la tarjeta, y cuánto cuesta eso.',
  },
  {
    to: '/casas-de-cambio',
    title: 'Todas las casas de cambio',
    body: 'La comparativa completa, con las pizarras de hoy.',
  },
  {
    to: '/estado',
    title: 'Estado de las pizarras',
    body: 'Cuáles se están actualizando y cuáles llevan días quietas.',
  },
  {
    to: '/adelanto-de-efectivo-tarjeta-de-credito',
    title: 'Adelanto de efectivo',
    body: 'Lo que cuesta sacar plata de la tarjeta, con la grilla del BCU.',
  },
  {
    to: '/cuenta-remunerada-uruguay',
    title: 'Cuentas remuneradas',
    body: 'Dónde rinde algo la plata que queda parada en la cuenta.',
  },
  {
    to: '/plan-de-vida-uruguay',
    title: 'Plan de vida por ingreso',
    body: 'En qué orden usar cada peso, con tasas públicas.',
  },
]

const faq: FaqItem[] = [
  {
    id: 'es-legal',
    question: '¿Es legal mover los dólares a otra institución para cambiarlos ahí?',
    answer:
      'Sí. Son transferencias entre cuentas propias dentro del sistema de pagos uruguayo, con el tipo de cambio que cada institución publica. Ninguna de las tarifas citadas prohíbe la operación; al contrario, Itaú y Prex la exoneran expresamente entre ellas.',
  },
  {
    id: 'por-que-gratis',
    question: '¿Por qué Itaú no cobra por mandar plata a Prex?',
    answer:
      'Porque su tarifario lo exonera con nombre propio: "Giros a IEDEs por canales digitales OCA Blue y PREX: Sin costo de forma ilimitada en cantidad y monto". A cualquier otra emisora de dinero electrónico la misma operación paga 0,85 % con un tope de $ 45 o U$S 1. Es una decisión comercial de Itaú, no una regla del sistema, y puede cambiar con 30 días de preaviso.',
  },
  {
    id: 'cuanto-ahorro',
    question: '¿Cuánto se ahorra de verdad?',
    answer:
      'Depende de la diferencia de pizarra del día y del monto. La ganancia es lineal con el monto y las comisiones no: son fijas o topeadas. Por eso hay un punto de equilibrio y por eso la ruta casi nunca sirve para montos chicos, salvo en el par donde las dos transferencias son gratis.',
  },
  {
    id: 'y-si-no-vuelvo',
    question: '¿Hace falta volver los pesos al banco?',
    answer:
      'No, si los vas a gastar desde ahí. Tanto Prex como OCA Blue permiten pagar facturas y tarjetas desde su propia app, y saltear la vuelta elimina una de las dos comisiones. El interruptor de la calculadora hace exactamente esa cuenta.',
  },
  {
    id: 'cuanto-tarda',
    question: '¿Cuánto tarda?',
    answer:
      'Una transferencia inmediata liquida en segundos, pero no todas las instituciones la habilitan para cualquier monto: Scotiabank no admite giros instantáneos por encima de U$S 500 o $ 22.000, y OCA Blue tiene el mismo tope por transferencia. Por encima de esos importes se usa la transferencia común, que liquida por cámara del SPI en horario hábil.',
  },
  {
    id: 'limites',
    question: '¿Hay límites de monto?',
    answer:
      'Sí, y son la restricción que menos se ve. Prex no admite cargas desde banco mayores a U$S 10.000 por día, con un acumulado de U$S 15.000 sin presentar información adicional. OCA Blue tiene un tope diario de transferencia de U$S 3.000. Ninguno de los dos aparece en la tarifa.',
  },
  {
    id: 'confiar-pizarra',
    question: '¿La cotización que muestran acá es la que me va a dar mi banco?',
    answer:
      'Es la que la institución publica. Varios usuarios reportan que la app del banco les da un precio distinto al de la pizarra web, en general mejor. Esta página usa lo publicado porque es lo único verificable desde afuera; el número de tu pantalla al confirmar la operación es el que manda.',
  },
]

// 40 caracteres: con la marca queda en 57 y entra en el SERP sin recorte.
// Ver tests/unit/seoTitleBudget.test.ts — "en Uruguay" no cabe y vive en la
// descripción, el H1 y la URL.
const title = 'Comisiones de transferencia entre bancos'
const description =
  'Cuánto cobra cada banco y billetera uruguaya por transferir, con la fila textual de su tarifario, y cuánto queda realmente de la diferencia de pizarra al mover dólares entre instituciones.'
const canonicalUrl = 'https://cambio-uruguay.com/comisiones-de-transferencia-uruguay'

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
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
        '@type': 'WebApplication',
        name: title,
        description,
        url: canonicalUrl,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        inLanguage: 'es-UY',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: 0, priceCurrency: 'UYU' },
        creator: { '@type': 'Organization', name: 'Cambio Uruguay' },
      }),
    },
  ],
}))
</script>

<style scoped>
.hero {
  background: linear-gradient(
    135deg,
    rgba(var(--v-theme-primary), 0.16),
    rgba(var(--v-theme-primary), 0.04)
  );
  border: 1px solid rgba(var(--v-border-color), 0.16);
}
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}
.hero-title {
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  font-weight: 800;
  line-height: 1.15;
}
.hero-lead {
  max-width: 68ch;
  line-height: 1.6;
}
.cu-section-title {
  font-weight: 700;
}
.cu-hint {
  font-size: 0.75rem;
  opacity: 0.72;
  line-height: 1.35;
  margin-top: 0.15rem;
}
.quote-box {
  border-left: 3px solid rgba(var(--v-theme-primary), 0.55);
  background: rgba(var(--v-theme-surface), 0.5);
  border-radius: 4px;
}
.verdict {
  background: rgba(var(--v-theme-primary), 0.08);
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 8px;
}
.big-n {
  font-size: clamp(1.75rem, 5vw, 2.5rem);
  font-weight: 800;
  line-height: 1.05;
}
.num {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.ledger td {
  vertical-align: top;
}
.total-row td {
  border-top: 2px solid rgba(var(--v-border-color), 0.3);
}
.table-scroll {
  overflow-x: auto;
}
.band-list {
  padding-left: 1.1rem;
}
.honest-list {
  padding-left: 1.1rem;
  line-height: 1.6;
}
</style>
