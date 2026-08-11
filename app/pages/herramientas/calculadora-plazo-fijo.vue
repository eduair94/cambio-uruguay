<template>
  <ToolShell slug="calculadora-plazo-fijo" :faq="faq" :sources="sources" content-layout="below">
    <VCard class="pa-4 pa-sm-6">
      <VRow class="g-input">
        <VCol cols="12" sm="6">
          <VTextField
            v-model.number="principal"
            type="number"
            min="0"
            label="Capital inicial"
            :prefix="money.prefix"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="3">
          <VTextField
            v-model.number="ratePct"
            type="number"
            min="0"
            step="0.1"
            label="Tasa anual"
            suffix="%"
            variant="outlined"
            density="comfortable"
            :hint="rateHint"
            persistent-hint
          />
        </VCol>
        <VCol cols="6" sm="3">
          <VTextField
            v-model.number="months"
            type="number"
            min="1"
            label="Plazo (meses)"
            variant="outlined"
            density="comfortable"
            :hint="`≈ ${days} días`"
            persistent-hint
          />
        </VCol>
        <VCol cols="12" sm="6">
          <VSelect
            v-model="currency"
            :items="currencyItems"
            label="Moneda"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6">
          <VSelect
            v-model.number="timesPerYear"
            :items="freqItems"
            label="Capitalización"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
      </VRow>

      <!-- Valores de referencia. Existe porque el campo "Tasa anual" no le decía a nadie qué
           número es normal en Uruguay, y el default anterior (8%) no lo paga nada en pesos. -->
      <VCard variant="flat" class="ref-panel mt-5 pa-4">
        <div class="d-flex align-center flex-wrap ga-2 mb-3">
          <VIcon size="small" color="primary">mdi-compass-outline</VIcon>
          <h2 class="text-subtitle-2 font-weight-bold mb-0">
            Cuánto se paga hoy por {{ months || 0 }} {{ (months || 0) === 1 ? 'mes' : 'meses' }} en
            {{ money.name }}
          </h2>
        </div>

        <div class="ref-grid">
          <div class="ref-box">
            <div class="text-overline text-grey">Media de mercado · BCU</div>
            <template v-if="marketBucket && marketRate != null">
              <div class="text-h6 font-weight-bold">
                {{ pct(marketRate) }}
                <span class="text-caption text-medium-emphasis">a personas físicas</span>
              </div>
              <p class="ref-note">
                Tramo <strong>{{ marketBucket.label }}</strong
                >, {{ BCU_DEPOSIT_RATES.period }}. Total del sistema (personas y empresas):
                {{ marketTotal == null ? 'sin dato' : pct(marketTotal) }}.
              </p>
              <VBtn size="small" variant="tonal" color="primary" @click="applyRate(marketRate)">
                Usar esta tasa
              </VBtn>
            </template>
            <template v-else-if="marketBucket">
              <div class="text-h6 font-weight-bold">Sin operaciones</div>
              <p class="ref-note">
                En {{ BCU_DEPOSIT_RATES.period }} el BCU informa <em>sin operaciones</em> en el
                tramo <strong>{{ marketBucket.label }}</strong> en {{ money.name }}. No es un cero:
                no se pactó ningún depósito a ese plazo.
              </p>
            </template>
            <template v-else-if="!plazoValido">
              <div class="text-h6 font-weight-bold">—</div>
              <p class="ref-note">Ingresá un plazo en meses para ver la media de mercado.</p>
            </template>
            <template v-else>
              <div class="text-h6 font-weight-bold">
                {{ pct(marketSeries.promedioPersonaFisica) }}
                <span class="text-caption text-medium-emphasis">promedio de todos los plazos</span>
              </div>
              <p class="ref-note">
                El cuadro de {{ money.name }} corta en <strong>{{ ultimoTramoBcu }}</strong
                >: no hay tramo de más de un año. Lo único publicado para este plazo es el promedio
                general, que mezcla los depósitos cortos con los largos. Tomalo como orden de
                magnitud, no como la tasa de un depósito a {{ months }} meses.
              </p>
            </template>
          </div>

          <div class="ref-box">
            <div class="text-overline text-grey">Pizarra contratable · BROU</div>
            <template v-if="brouTranche">
              <div class="text-h6 font-weight-bold text-success">
                {{ pct(brouTranche.online) }}
                <span class="text-caption text-medium-emphasis">por e-BROU</span>
              </div>
              <p class="ref-note">
                Tramo <strong>{{ brouTranche.label }} días</strong>, intereses al vencimiento,
                mínimo {{ brouSeries.minimum }}. La misma operación en sucursal paga
                <strong>{{ pct(brouTranche.branch) }}</strong
                >. La pizarra de {{ money.name }} no cambia desde el
                <strong>{{ brouSeries.vigenciaMoneda }}</strong
                >; el documento que la publica es el vigente al {{ BROU_DEPOSIT_BOARD.vigencia }}.
              </p>
              <VBtn
                size="small"
                variant="tonal"
                color="success"
                @click="applyRate(brouTranche.online)"
              >
                Usar esta tasa
              </VBtn>
            </template>
            <template v-else-if="!plazoValido">
              <div class="text-h6 font-weight-bold">—</div>
              <p class="ref-note">Ingresá un plazo en meses para ver la pizarra que corresponde.</p>
            </template>
            <template v-else>
              <div class="text-h6 font-weight-bold">No hay tramo</div>
              <p class="ref-note">
                La pizarra del BROU en {{ money.name }} va de <strong>{{ brouRango }} días</strong>.
                Para {{ months }} meses ({{ days }} días) no publica tasa.
              </p>
            </template>
          </div>
        </div>

        <p class="ref-foot mt-3 mb-0">
          Las dos son <strong>tasas efectivas anuales</strong>. La media del BCU es lo que se pactó
          de verdad en el mes, no algo que puedas contratar; la pizarra del BROU sí se contrata, y
          es el precio comercial de un banco entre varios. Verificado el
          {{ DEPOSIT_REFERENCE_VERIFIED_AT }}.
        </p>
      </VCard>

      <VDivider class="my-6" />

      <div class="result-grid">
        <div class="result-box">
          <div class="text-overline text-grey">Monto final</div>
          <div class="text-h5 font-weight-bold text-success">{{ money.format(r.finalAmount) }}</div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Intereses ganados</div>
          <div class="text-h5 font-weight-bold text-primary">{{ money.format(r.interest) }}</div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Intereses netos de IRPF</div>
          <div class="text-h5 font-weight-bold">{{ money.format(netInterest) }}</div>
          <div class="text-caption text-medium-emphasis mt-1">
            IRPF {{ pct(net.taxPct) }} · {{ net.law }}
          </div>
        </div>
      </div>

      <VAlert
        v-if="teaMismatch"
        type="warning"
        variant="tonal"
        density="comfortable"
        class="mt-4"
        icon="mdi-alert-outline"
      >
        Las tasas de referencia de arriba son <strong>efectivas anuales</strong>: ya incluyen el
        efecto de la capitalización. Con capitalización <strong>{{ freqLabel }}</strong> la
        calculadora las trata como nominales y devuelve de más. Para un plazo fijo con intereses al
        vencimiento, elegí <strong>Anual</strong>.
      </VAlert>
    </VCard>

    <!-- Tabla completa por tramo, para la moneda elegida -->
    <VCard variant="flat" class="tool-section mt-6 pa-5">
      <h2 class="text-subtitle-1 font-weight-bold mb-1">
        Tasas de referencia en {{ money.name }}, tramo por tramo
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Media del sistema bancario según el BCU (<time :datetime="BCU_DEPOSIT_RATES.periodIso">{{
          BCU_DEPOSIT_RATES.period
        }}</time
        >, cuadro «{{ marketSeries.cuadro }}», hoja <em>{{ marketSeries.hoja }}</em> de tasas.xls) y
        pizarra del BROU para personas (la de {{ money.name }} rige desde el
        {{ brouSeries.vigenciaMoneda }}, dentro del documento vigente al
        {{ BROU_DEPOSIT_BOARD.vigencia }}). Todas son tasas efectivas anuales.
      </p>
      <div class="table-scroll">
        <VTable density="comfortable" class="breakdown-table cu-mobile-cards">
          <thead>
            <tr>
              <th>Plazo</th>
              <th class="text-right">BCU · personas físicas</th>
              <th class="text-right">BCU · total sistema</th>
              <th class="text-right">BROU · e-BROU</th>
              <th class="text-right">BROU · sucursal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in referenceRows" :key="row.label">
              <td data-label="Plazo">{{ row.label }}</td>
              <td data-label="BCU · personas físicas" class="text-right">{{ row.pf }}</td>
              <td data-label="BCU · total sistema" class="text-right">{{ row.total }}</td>
              <td data-label="BROU · e-BROU" class="text-right">{{ row.online }}</td>
              <td data-label="BROU · sucursal" class="text-right">{{ row.branch }}</td>
            </tr>
            <tr class="total-row">
              <td data-label="Plazo">Promedio de todos los plazos</td>
              <td data-label="BCU · personas físicas" class="text-right">
                {{ pct(marketSeries.promedioPersonaFisica) }}
              </td>
              <td data-label="BCU · total sistema" class="text-right">
                {{ pct(marketSeries.promedioTotalSistema) }}
              </td>
              <td data-label="BROU · e-BROU" class="text-right">—</td>
              <td data-label="BROU · sucursal" class="text-right">—</td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <p class="text-caption text-medium-emphasis mt-3 mb-2">
        «—» es que esa fuente no publica ese tramo. «Sin operaciones» es que el BCU informa que en
        ese plazo no se pactó ningún depósito. El promedio del BCU incluye los plazos de 367 días o
        más, así que no es comparable con ninguna fila de arriba.
      </p>
      <p class="text-caption text-medium-emphasis mb-2">
        <strong>Alcance de la media del BCU.</strong> {{ BCU_DEPOSIT_RATES.weighting }}
        {{ BCU_DEPOSIT_RATES.scope }}
      </p>
      <p class="text-caption text-medium-emphasis mb-2">
        <strong>Vigencias de la pizarra del BROU</strong> (nota iv. del PDF, que las abre por moneda
        y no coinciden con la fecha del documento): {{ vigenciasText }}.
      </p>
      <ul class="text-caption text-medium-emphasis mb-0 pl-4">
        <li v-for="note in BROU_DEPOSIT_BOARD.notes" :key="note">{{ note }}</li>
      </ul>
    </VCard>

    <template #content>
      <div class="tool-article-grid">
        <section>
          <h2>Qué tasa es normal en Uruguay</h2>
          <p>
            El BCU publica todos los meses lo que el sistema bancario pagó de verdad por los
            depósitos a plazo fijo, abierto por moneda y por plazo. En
            {{ BCU_DEPOSIT_RATES.period }}, a personas físicas en pesos, la media fue de
            <strong>{{ pct(hl.uyuMedioAnual) }}</strong> en el tramo de 181 a 366 días. En dólares,
            al mismo plazo, <strong>{{ pct(hl.usdMedioAnual) }}</strong
            >. Si alguien te ofrece 15% o 20% en pesos, no es un plazo fijo uruguayo.
          </p>
          <p>
            En todos los tramos en {{ pfBelowCurrenciesText }}, la media que cobran las personas
            físicas queda por debajo del total del sistema: en pesos a menos de 30 días fue
            <strong>{{ pct(hl.uyuCortoPersonas) }}</strong> contra {{ pct(hl.uyuCortoTotal) }}. El
            total incluye a las personas jurídicas, que colocan montos mayores y consiguen mejores
            tasas en cada tramo. Por eso la referencia que mostramos primero es la de personas
            físicas: es la fila que te corresponde.
          </p>
          <p v-for="tie in pfTies" :key="`${tie.currency}-${tie.bucket.label}`">
            No en todos: en {{ tie.moneda }}, tramo <strong>{{ tie.bucket.label }}</strong
            >, las dos cifras publicadas empatan ({{ cell(tie.bucket.personaFisica) }} contra
            {{ cell(tie.bucket.totalSistema) }}). En la planilla la persona física sigue un pelo
            abajo, pero la diferencia no sobrevive a los dos decimales que el BCU publica, que son
            los que ves en la tabla de arriba. No lo redondeamos a favor del titular.
          </p>
          <p>
            Ojo con confundir la media con una oferta. Nadie te vende el promedio: es un dato de
            diagnóstico para saber si lo que te ofrecen está por arriba o por debajo de plaza.
          </p>
        </section>

        <section>
          <h2>El canal cambia la tasa dentro del mismo banco</h2>
          <p>
            En la pizarra del BROU —la de pesos rige desde el {{ hl.vigenciaPesos }}, dentro del
            documento vigente al {{ BROU_DEPOSIT_BOARD.vigencia }}—, un plazo fijo en pesos de
            {{ hl.largoRango }} días paga <strong>{{ pct(hl.largoOnline) }}</strong> si lo
            constituís por e-BROU y <strong>{{ pct(hl.largoBranch) }}</strong> si lo hacés en una
            sucursal. Mismo banco, mismo depósito, mismo plazo: ir a la ventanilla cuesta
            <strong>{{ formatNumber(hl.largoGap) }} puntos</strong> de tasa.
          </p>
          <p>
            La propia pizarra aclara que la de e-BROU sólo aplica a personas físicas. Y hay una
            segunda decisión que también mueve la tasa: cobrar los intereses de forma
            {{ hl.periodicidad }} en vez de al vencimiento paga menos —{{
              pct(hl.largoPeriodic)
            }}
            en lugar de {{ pct(hl.largoOnline) }} por e-BROU, y {{ pct(hl.largoBranchPeriodic) }} en
            lugar de {{ pct(hl.largoBranch) }} en sucursal— y sube el mínimo de {{ hl.minimo }} a
            {{ hl.minimoPeriodic }}.
          </p>
          <p>
            <strong>La misma pizarra publica otra cosa en pesos que no es un plazo fijo.</strong>
            Se llama {{ ahorro.name }} y paga <strong>{{ pct(ahorro.year1) }}</strong> el primer año
            del contrato, <strong>{{ pct(ahorro.year2) }}</strong> el segundo y
            <strong>{{ pct(ahorro.year3) }}</strong> el tercero: la tasa de pizarra más una prima
            por permanencia de {{ pct(ahorro.primaPct2) }} y {{ pct(ahorro.primaPct3) }}
            <em>sobre esa tasa</em>. Es {{ ahorro.what }}: {{ ahorro.term }}, depósitos mensuales de
            {{ ahorroMin }} a {{ ahorroMax }} y {{ ahorro.channel }}. No entra en la tabla de arriba
            —no colocás un monto único ni queda inmovilizado—, pero es la única tasa en pesos de
            este documento que supera el {{ pct(hl.largoOnline) }}, así que el techo de la tabla no
            es el techo del banco.
            {{ ahorro.requirement }}
          </p>
          <p>
            Es una pizarra de un banco, no un ranking. Otros bancos publican la suya y cambian sin
            aviso: la fecha de vigencia está al lado del número por algo.
          </p>
        </section>

        <section>
          <h2>Interés compuesto, y la trampa de la TEA</h2>
          <p>
            El plazo fijo rinde por <strong>interés compuesto</strong>: los intereses se suman al
            capital y, en los siguientes períodos, generan nuevos intereses. Cuanto más seguido se
            capitaliza y más largo es el plazo, mayor es el efecto.
          </p>
          <p>
            Pero las tasas que publican el BCU y el BROU ya son <strong>efectivas anuales</strong>:
            la capitalización está adentro del número. Si tomás una TEA y arriba le pedís
            capitalización mensual, estás capitalizando dos veces y el resultado sale inflado. Por
            eso el botón «Usar esta tasa» deja la capitalización en Anual, que es lo que reproduce
            un depósito con intereses al vencimiento.
          </p>
        </section>

        <section>
          <h2>El IRPF depende de la moneda y del plazo</h2>
          <p>
            No hay una tasa única: la alícuota depende de la moneda y del plazo. En
            {{ irpfUyu.label }}, {{ irpfRowText(irpfUyu) }}. En {{ irpfUi.label }},
            {{ irpfRowText(irpfUi) }}. En {{ irpfUsd.label }}, {{ irpfRowText(irpfUsd) }}. El
            impuesto se cobra <strong>sobre el interés ganado</strong>, no sobre el capital.
          </p>
          <p>
            Consecuencia contraintuitiva: estirar el plazo baja el impuesto además de subir la tasa.
            Los {{ pct(hl.largoOnline) }} brutos de un plazo fijo en pesos a 24 meses por e-BROU
            quedan en <strong>{{ pct(hl.largoNeto) }}</strong> netos, porque a ese plazo la alícuota
            es {{ pct(hl.largoTaxPct) }} y no {{ pct(irpfUyu.hasta1a) }}. Ojo con la cuenta: es
            multiplicar por {{ formatNumber(1 - hl.largoTaxPct / 100, 3) }}, no dividir entre
            {{ formatNumber(1 + hl.largoTaxPct / 100, 3) }}, que da
            {{ pct(hl.largoOnline / (1 + hl.largoTaxPct / 100)) }} y sobrestima el neto.
          </p>
        </section>

        <section>
          <h2>Lo que no publica el BCU</h2>
          <ul>
            <li v-for="gap in absences" :key="gap.missing">
              <strong>{{ gap.missing }}.</strong> {{ gap.instead }}
              <em class="text-caption d-block mt-1">{{ gap.source }}</em>
            </li>
          </ul>
        </section>

        <section>
          <h2>Un dato que sorprende: el euro</h2>
          <p>
            La pizarra de euros paga
            <strong>{{ pct(BROU_DEPOSIT_BOARD.eur.rate) }}</strong> en todos los plazos.
            {{ BROU_DEPOSIT_BOARD.eur.note }} El mínimo es {{ BROU_DEPOSIT_BOARD.eur.minimum }} y
            esa pizarra rige desde el {{ BROU_DEPOSIT_BOARD.eur.vigencia }}. Si tenés euros y querés
            que rindan, un plazo fijo local no es el instrumento.
          </p>
        </section>
      </div>
    </template>

    <template #disclaimer>
      Estimación con interés compuesto sobre la tasa que ingresás. Las tasas de referencia son
      <strong>datos con fecha</strong>: la media del BCU corresponde a
      {{ BCU_DEPOSIT_RATES.period }} y la pizarra del BROU en {{ money.name }} rige desde el
      {{ brouSeries.vigenciaMoneda }} (documento vigente al {{ BROU_DEPOSIT_BOARD.vigencia }});
      ambas caducan sin aviso. El neto de IRPF usa las alícuotas del {{ DEPOSIT_IRPF_LAW }} y no
      contempla comisiones ni tu situación fiscal particular. Confirmá las condiciones reales con tu
      banco antes de constituir el depósito.
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { compoundInterest } from '~/utils/calculators'
import { formatNumber, formatUSD, formatUYU } from '~/utils/format'
import {
  BCU_DEPOSIT_RATES,
  BROU_DEPOSIT_BOARD,
  DEPOSIT_IRPF_LAW,
  DEPOSIT_REFERENCE_ABSENCES,
  DEPOSIT_REFERENCE_SOURCES,
  DEPOSIT_REFERENCE_VERIFIED_AT,
  brouTrancheFor,
  daysForMonths,
  irpfDepositMatrix,
  irpfMatrixText,
  irpfRowText,
  marketBucketFor,
  netOfIrpf,
  pfNotBelowTotal,
  type DepositCurrency,
} from '~/utils/investments'

const currency = ref<DepositCurrency>('UYU')
const principal = ref(100000)
const months = ref(12)
// El default sale de la pizarra, no de un número elegido a ojo: a 12 meses (365 días) el tramo
// del BROU es 181–366. El anterior era 8%, que en pesos no lo paga nada en plaza.
const ratePct = ref(brouTrancheFor('UYU', 12)?.online ?? 0)
// Anual por defecto: las tasas publicadas son efectivas anuales y el plazo fijo típico paga los
// intereses al vencimiento.
const timesPerYear = ref(1)

const freqItems = [
  { title: 'Anual', value: 1 },
  { title: 'Semestral', value: 2 },
  { title: 'Trimestral', value: 4 },
  { title: 'Mensual', value: 12 },
]
const currencyItems = [
  { title: 'Pesos uruguayos', value: 'UYU' },
  { title: 'Dólares (USD)', value: 'USD' },
  { title: 'Unidades indexadas (UI)', value: 'UI' },
]

const MONEY: Record<
  DepositCurrency,
  { name: string; prefix: string; format: (v: number) => string }
> = {
  UYU: { name: 'pesos', prefix: '$', format: v => formatUYU(v) },
  USD: { name: 'dólares', prefix: 'US$', format: v => formatUSD(v) },
  // La UI no es una moneda ISO, así que no hay símbolo que `Intl` sepa poner.
  UI: { name: 'unidades indexadas', prefix: 'UI', format: v => `UI ${formatNumber(v)}` },
}

const money = computed(() => MONEY[currency.value])
const days = computed(() => daysForMonths(months.value || 0))
const marketSeries = computed(() => BCU_DEPOSIT_RATES.series[currency.value])
const brouSeries = computed(() => BROU_DEPOSIT_BOARD.series[currency.value])
const marketBucket = computed(() => marketBucketFor(currency.value, months.value || 0))
// `null` tiene dos causas distintas y el template las separa: no hay tramo publicado para ese
// plazo, o el tramo existe y el BCU informa "sin operaciones".
const marketRate = computed(() => marketBucket.value?.personaFisica ?? null)
const marketTotal = computed(() => marketBucket.value?.totalSistema ?? null)
const brouTranche = computed(() => brouTrancheFor(currency.value, months.value || 0))
const plazoValido = computed(() => days.value > 0)
/** El último tramo que el BCU abre en esta moneda, para no hardcodear "181 a 366 días". */
const ultimoTramoBcu = computed(() => marketSeries.value.buckets.at(-1)?.label ?? '')
/** Rango completo que cubre la pizarra, leído de los datos y no escrito a mano. */
const brouRango = computed(() => {
  const t = brouSeries.value.tranches
  return `${t[0]?.minDays ?? 0} a ${t.at(-1)?.maxDays ?? 0}`
})
const absences = DEPOSIT_REFERENCE_ABSENCES
const sources = [...DEPOSIT_REFERENCE_SOURCES]

const pct = (v: number) => `${formatNumber(v)}%`
/** Una celda de la serie del BCU: `null` es "sin operaciones", nunca un cero. */
const cell = (v: number | null) => (v == null ? 'Sin operaciones' : pct(v))

/**
 * Las cifras concretas que cita la prosa, resueltas acá y no en el template: el compilador de
 * plantillas de Vue parsea expresiones JS, así que un `!` de TypeScript (`buckets[4]!.x`) ahí
 * adentro no compila. Todas salen de los mismos datos que rinde la tabla, nunca escritas a mano.
 */
const bcuUyu = BCU_DEPOSIT_RATES.series.UYU
const bcuUsd = BCU_DEPOSIT_RATES.series.USD
const brouUyu = BROU_DEPOSIT_BOARD.series.UYU
const largoUyu = brouUyu.tranches[brouUyu.tranches.length - 1]
const netoLargo = netOfIrpf(largoUyu?.online ?? 0, 'UYU', 24)
const hl = {
  /** Pesos, personas físicas, tramo 181–366 días. */
  uyuMedioAnual: bcuUyu.buckets[4]?.personaFisica ?? 0,
  /** Dólares, personas físicas, mismo tramo. */
  usdMedioAnual: bcuUsd.buckets[4]?.personaFisica ?? 0,
  /** Pesos, tramo más corto: la brecha entre personas y el total del sistema. */
  uyuCortoPersonas: bcuUyu.buckets[0]?.personaFisica ?? 0,
  uyuCortoTotal: bcuUyu.buckets[0]?.totalSistema ?? 0,
  /** Pesos, tramo largo de la pizarra (732–1096 días): e-BROU vs sucursal vs pago periódico. */
  largoRango: `${largoUyu?.minDays ?? 0} a ${largoUyu?.maxDays ?? 0}`,
  largoOnline: largoUyu?.online ?? 0,
  largoBranch: largoUyu?.branch ?? 0,
  /** La brecha de canal, restada y no estimada a ojo: 5,50 − 4,13 = 1,37 puntos, no "un punto y medio". */
  largoGap: (largoUyu?.online ?? 0) - (largoUyu?.branch ?? 0),
  largoPeriodic: largoUyu?.onlinePeriodic ?? 0,
  largoBranchPeriodic: largoUyu?.branchPeriodic ?? 0,
  largoNeto: netoLargo.netPct,
  /** La alícuota que produce ese neto, para no volver a escribir "2,5%" a mano. */
  largoTaxPct: netoLargo.taxPct,
  /** Mínimos y periodicidad del producto con pago periódico, en pesos. */
  minimo: brouUyu.minimum,
  minimoPeriodic: brouUyu.minimumPeriodic ?? brouUyu.minimum,
  periodicidad: brouUyu.periodicity ?? 'periódica',
  /** La pizarra de pesos NO rige desde la fecha del documento (nota iv.). */
  vigenciaPesos: brouUyu.vigenciaMoneda,
}

/**
 * El alcance real de "la persona física paga menos que el total del sistema", derivado de la
 * tabla en vez de afirmado. La frase decía "en todos los tramos" y la propia tabla la desmentía:
 * en UI, a 367 días o más, las dos columnas publican 1,73%.
 */
const CURRENCY_ORDER: DepositCurrency[] = ['UYU', 'USD', 'UI']
const pfBelowCurrencies = CURRENCY_ORDER.filter(c => pfNotBelowTotal(c).length === 0)
const pfBelowCurrenciesText = pfBelowCurrencies
  .map(c => MONEY[c].name)
  .join(pfBelowCurrencies.length > 2 ? ', ' : ' y ')
const pfTies = CURRENCY_ORDER.flatMap(c =>
  pfNotBelowTotal(c).map(bucket => ({ currency: c, moneda: MONEY[c].name, bucket }))
)

/** La matriz de IRPF, resuelta desde capitalTax.ts. Ninguna alícuota se escribe en esta página. */
const irpfRows = irpfDepositMatrix()
const irpfUyu = irpfRows.find(r => r.currency === 'UYU')!
const irpfUi = irpfRows.find(r => r.currency === 'UI')!
const irpfUsd = irpfRows.find(r => r.currency === 'USD')!

/** El otro producto en pesos de la misma pizarra, que la página ignoraba. */
const ahorro = BROU_DEPOSIT_BOARD.ahorroEnSueldo
// Siempre en pesos: la ficha del producto dice "disponible solamente en pesos uruguayos".
const ahorroMin = `${MONEY.UYU.prefix} ${formatNumber(ahorro.minMonthly, 0)}`
const ahorroMax = `${MONEY.UYU.prefix} ${formatNumber(ahorro.maxMonthly, 0)}`

/**
 * Las vigencias de la nota iv., que son POR MONEDA y no coinciden con la fecha del documento.
 * Publicarlas es el punto: decir "pesos vigentes al 01/07/2026" sugiere un cambio que no hubo.
 */
const vigencias = [
  ...CURRENCY_ORDER.map(c => ({
    label: MONEY[c].name,
    date: BROU_DEPOSIT_BOARD.series[c].vigenciaMoneda,
  })),
  { label: 'euros', date: BROU_DEPOSIT_BOARD.eur.vigencia },
  { label: ahorro.name.toLowerCase(), date: ahorro.vigencia },
]
const vigenciasText = vigencias.map(v => `${v.label} ${v.date}`).join(' · ')

const r = computed(() =>
  compoundInterest(
    principal.value || 0,
    ratePct.value || 0,
    (months.value || 0) / 12,
    timesPerYear.value || 1
  )
)

const net = computed(() => netOfIrpf(ratePct.value || 0, currency.value, months.value || 0))
const netInterest = computed(() => r.value.interest * (1 - net.value.taxPct / 100))

const freqLabel = computed(
  () => freqItems.find(f => f.value === timesPerYear.value)?.title.toLowerCase() ?? 'anual'
)
const teaMismatch = computed(() => timesPerYear.value > 1)

const rateHint = computed(() => {
  const t = brouTranche.value
  if (t) return `Referencia: ${pct(t.online)}`
  const b = marketBucket.value
  if (b?.personaFisica != null) return `Referencia: ${pct(b.personaFisica)}`
  return 'Efectiva anual'
})

/** Deja la tasa elegida y vuelve a capitalización anual, porque la referencia es una TEA. */
function applyRate(value: number) {
  ratePct.value = value
  timesPerYear.value = 1
}

/**
 * Una fila por tramo, uniendo las dos fuentes. Los tramos NO coinciden entre el BCU y el BROU
 * (el BCU corta en 367 días, el BROU llega a 1096), así que se listan los del BCU y, aparte, los
 * de la pizarra que quedan fuera de la serie. Forzarlos a una misma grilla sería inventar.
 */
const referenceRows = computed(() => {
  const dash = '—'
  const rows = marketSeries.value.buckets.map(b => {
    const mid = b.maxDays == null ? b.minDays + 1 : Math.floor((b.minDays + b.maxDays) / 2)
    const t = brouSeries.value.tranches.find(x => mid >= x.minDays && mid <= x.maxDays)
    return {
      label: b.label,
      pf: cell(b.personaFisica),
      total: cell(b.totalSistema),
      online: t ? pct(t.online) : dash,
      branch: t ? pct(t.branch) : dash,
    }
  })
  const covered = new Set(
    marketSeries.value.buckets.flatMap(b =>
      brouSeries.value.tranches
        .filter(t => {
          const mid = b.maxDays == null ? b.minDays + 1 : Math.floor((b.minDays + b.maxDays) / 2)
          return mid >= t.minDays && mid <= t.maxDays
        })
        .map(t => t.label)
    )
  )
  for (const t of brouSeries.value.tranches) {
    if (covered.has(t.label)) continue
    rows.push({
      label: `${t.label} días`,
      pf: dash,
      total: dash,
      online: pct(t.online),
      branch: pct(t.branch),
    })
  }
  return rows
})

const faq = [
  {
    q: '¿Qué tasa pone un plazo fijo en Uruguay hoy?',
    a: `Según las tasas medias del BCU de ${BCU_DEPOSIT_RATES.period}, a personas físicas en pesos, ${formatNumber(BCU_DEPOSIT_RATES.series.UYU.buckets[4]!.personaFisica!)}% efectivo anual en el tramo de 181 a 366 días, y ${formatNumber(BCU_DEPOSIT_RATES.series.USD.buckets[4]!.personaFisica!)}% en dólares al mismo plazo. Es el promedio de lo que efectivamente se pactó en el mes, no una oferta: sirve para saber si lo que te ofrecen está por encima o por debajo de plaza.`,
  },
  {
    q: '¿Por qué la calculadora arranca con una tasa y no en cero?',
    a: `Porque el valor por defecto sale de la pizarra de plazo fijo del BROU para personas: a 12 meses (365 días) cae en el tramo de 181 a 366 días, que por e-BROU paga ${formatNumber(BROU_DEPOSIT_BOARD.series.UYU.tranches[3]!.online)}% efectivo anual. Esa pizarra en pesos rige desde el ${hl.vigenciaPesos}, dentro del documento vigente al ${BROU_DEPOSIT_BOARD.vigencia}. Cambiá la moneda o el plazo y la referencia se recalcula.`,
  },
  {
    q: '¿Conviene un plazo fijo en pesos o en dólares?',
    a: `Depende de tus objetivos. Los plazos en pesos pagan más tasa pero enfrentan la inflación; los de dólares pagan menos pero preservan valor frente al tipo de cambio. Mirá la tasa frente a la inflación esperada, y acordate de que el IRPF también es distinto: en ${irpfUyu.label} va de ${pct(irpfUyu.hasta1a)} a ${pct(irpfUyu.mas3a)} según el plazo, y en ${irpfUsd.label} es ${irpfRowText(irpfUsd)}.`,
  },
  {
    q: '¿Cuánto me descuentan de impuestos?',
    a: `El IRPF sobre los intereses depende de la moneda y del plazo (${DEPOSIT_IRPF_LAW}): ${irpfMatrixText()}. Se cobra sobre el interés ganado, no sobre el capital, y el banco lo retiene: el neto es el bruto multiplicado por (1 − alícuota), no dividido por (1 + alícuota).`,
  },
  {
    q: '¿Da lo mismo constituirlo por la app que en la sucursal?',
    a: `No. En la pizarra del BROU en pesos, vigente desde el ${hl.vigenciaPesos}, un plazo fijo de ${hl.largoRango} días paga ${formatNumber(hl.largoOnline)}% por e-BROU y ${formatNumber(hl.largoBranch)}% en sucursal. La propia pizarra aclara que la de e-BROU sólo aplica a personas físicas.`,
  },
  {
    q: `¿${formatNumber(hl.largoOnline)}% es lo máximo que paga el BROU en pesos?`,
    a: `En plazo fijo sí: el tramo más largo (${hl.largoRango} días) paga ${formatNumber(hl.largoOnline)}% por e-BROU y la pizarra no publica ninguno más largo. Pero el mismo PDF publica ${ahorro.name}, que no es un plazo fijo sino ${ahorro.what}: paga ${formatNumber(ahorro.year1)}% el primer año del contrato, ${formatNumber(ahorro.year2)}% el segundo y ${formatNumber(ahorro.year3)}% el tercero, sumándole a la tasa de pizarra una prima por permanencia de ${formatNumber(ahorro.primaPct2)}% y ${formatNumber(ahorro.primaPct3)}% sobre esa tasa. Es en pesos, con ${ahorro.term}, depósitos mensuales de ${ahorroMin} a ${ahorroMax} y ${ahorro.channel}. ${ahorro.requirement}`,
  },
  {
    q: '¿Puedo comparar la tasa de todos los bancos en un cuadro oficial?',
    a: 'No existe. El BCU publica las tasas pasivas sólo como total del sistema bancario, sin abrir por institución ni siquiera entre banca pública y privada; las únicas tasas banco por banco que publica son las de tarjeta de crédito, que son del lado de los préstamos. Para comparar plazos fijos hay que mirar la pizarra que publica cada banco por su cuenta.',
  },
  {
    q: '¿Cómo funciona el interés compuesto?',
    a: 'Los intereses generados se reinvierten junto al capital, de modo que en cada período se calcula interés sobre un monto mayor. Ojo: las tasas que publican el BCU y los bancos ya son efectivas anuales, o sea que la capitalización está incluida en el número. Si las cargás con capitalización mensual, el resultado sale inflado.',
  },
]
</script>

<style scoped>
/* Panel de referencia: mismo lenguaje visual que .tool-info-box de ToolShell, pero con su propia
   grilla de dos tarjetas. */
.ref-panel {
  background: rgba(33, 150, 243, 0.06);
  border: 1px solid rgba(33, 150, 243, 0.22);
  border-radius: 12px;
}

.ref-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.ref-box {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 16px;
}

.ref-note {
  font-size: 0.85rem;
  line-height: 1.6;
  margin: 8px 0 12px;
  color: rgba(255, 255, 255, 0.75);
}

.ref-foot {
  font-size: 0.82rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.7);
}

.v-theme--light .ref-box {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.1);
}

.v-theme--light .ref-note,
.v-theme--light .ref-foot {
  color: rgba(0, 0, 0, 0.75);
}

.table-scroll {
  overflow-x: auto;
}
</style>

<!-- Layout primitives shared from ToolShell (.tool-page namespace). -->
