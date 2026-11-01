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

      <!-- El resultado va pegado a los campos. La tabla de bancos viene DESPUÉS: con cinco
           bancos en el teléfono, puesta antes, empujaba el resultado dos pantallas abajo. -->
      <div ref="resultEl" class="result-grid mt-6" aria-live="polite">
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
        Las tasas de los bancos y la media del BCU son <strong>efectivas anuales</strong>: ya
        incluyen el efecto de la capitalización. Con capitalización
        <strong>{{ freqLabel }}</strong> la calculadora las trata como nominales y devuelve de más.
        Para un plazo fijo con intereses al vencimiento, elegí <strong>Anual</strong>.
      </VAlert>
    </VCard>

    <!-- Lo que publica cada banco para ESTE depósito: moneda, monto y plazo de los campos de
         arriba. Las cifras son de utils/plazoFijoBancos.ts, leídas a mano y fechadas: la página
         dice cuándo se consultaron y nunca las presenta como una cotización que se mueve sola. -->
    <VCard variant="flat" class="ref-panel mt-6 pa-4 pa-sm-5">
      <h2 class="ref-title">
        Qué paga cada banco por un plazo fijo en {{ money.name }} a {{ months || 0 }}
        {{ (months || 0) === 1 ? 'mes' : 'meses' }}
      </h2>
      <p class="ref-intro">
        Para <strong>{{ amountText }}</strong> a unos {{ days }} días: la tasa que cada banco
        publica en su propia página para ese monto y ese plazo, de mayor a menor. Tocá
        <strong>Usar</strong> y la calculadora la toma.
      </p>

      <VTable
        v-if="banks.offers.length"
        density="comfortable"
        class="bank-table cu-mobile-cards cu-roomy"
      >
        <thead>
          <tr>
            <th>Banco</th>
            <th>Canal y monto</th>
            <th>Plazo publicado</th>
            <th class="text-right">Tasa efectiva anual</th>
            <th><span class="d-sr-only">Usar la tasa</span></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="offer in banks.offers"
            :key="`${offer.bankId}-${offer.channel}-${offer.bandLabel}`"
          >
            <td data-label="">
              <a
                :href="offer.sourceUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="tool-link"
              >
                {{ offer.bankName }}
              </a>
              <div class="text-caption text-medium-emphasis">
                {{ vigenciaText(offer.vigencia) }}
              </div>
            </td>
            <td data-label="Canal y monto">
              {{ offer.channelLabel }}
              <div class="text-caption text-medium-emphasis">{{ offer.bandLabel }}</div>
            </td>
            <td data-label="Plazo publicado">{{ offer.termLabel }}</td>
            <td data-label="Tasa efectiva anual" class="text-right bank-rate">
              {{ pct(offer.rate) }}
            </td>
            <td data-label="" class="text-right">
              <VBtn
                size="small"
                variant="tonal"
                color="primary"
                :aria-label="`Usar ${pct(offer.rate)} de ${offer.bankName}, ${offer.channelLabel}`"
                @click="applyRate(offer.rate)"
              >
                Usar
              </VBtn>
            </td>
          </tr>
        </tbody>
      </VTable>
      <p v-else class="ref-note">
        Ningún banco de la lista publica una tasa en {{ money.name }} para {{ amountText }} a unos
        {{ days }} días. Abajo, qué publica cada uno.
      </p>

      <template v-if="banks.misses.length">
        <h3 class="ref-subtitle">Sin tasa para este monto y plazo</h3>
        <ul class="ref-list">
          <li v-for="miss in banks.misses" :key="miss.bankId">
            <strong>{{ miss.bankName }}</strong
            >: {{ miss.detail }}.
          </li>
        </ul>
      </template>

      <p class="ref-foot">
        <strong>Son tasas publicadas, con fecha.</strong> Las leímos en la página o el documento de
        cada banco (el enlace está en su nombre), consultadas el {{ reviewedText }}; debajo de cada
        nombre va la vigencia que imprime el banco. Todas son efectivas anuales con intereses al
        vencimiento. Lo que termine rindiendo tu depósito depende de las condiciones de cada banco
        —canal, monto, ser cliente, renovación— y la pizarra cambia sin aviso: confirmala con el
        banco antes de constituirlo.
      </p>
      <p class="ref-foot">
        No figuran {{ excludedNames }}: ninguno publica hoy una pizarra de plazo fijo que se pueda
        verificar. El motivo de cada uno está en la letra chica.
      </p>

      <details class="ref-details">
        <summary>Letra chica de cada banco</summary>
        <ul class="ref-list">
          <li v-for="b in PLAZO_FIJO_BANCOS" :key="b.id">
            <a :href="b.sourceUrl" target="_blank" rel="noopener noreferrer" class="tool-link">
              {{ b.name }} — {{ b.sourceTitle }}</a
            >. {{ b.notes.join(' ') }}
          </li>
        </ul>
        <h3 class="ref-subtitle">Los que no están</h3>
        <ul class="ref-list">
          <li v-for="b in PLAZO_FIJO_BANCOS_FUERA" :key="b.id">
            <a :href="b.sourceUrl" target="_blank" rel="noopener noreferrer" class="tool-link">{{
              b.name
            }}</a
            >: {{ b.reason }}
          </li>
        </ul>
      </details>

      <!-- La media del BCU no se contrata: es el contexto para leer las pizarras de arriba. -->
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
            En {{ BCU_DEPOSIT_RATES.period }} el BCU informa <em>sin operaciones</em> en el tramo
            <strong>{{ marketBucket.label }}</strong> en {{ money.name }}. No es un cero: no se
            pactó ningún depósito a ese plazo.
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
            general, que mezcla los depósitos cortos con los largos. Tomalo como orden de magnitud,
            no como la tasa de un depósito a {{ months }} meses.
          </p>
        </template>
        <p class="ref-note mb-0">
          Es lo que se pactó de verdad en el mes en todo el sistema bancario, no algo que puedas
          contratar: sirve para ver si una pizarra está por arriba o por debajo de plaza. Media del
          BCU verificada el {{ DEPOSIT_REFERENCE_VERIFIED_AT }}.
        </p>
      </div>
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
            Mostramos primero la media de personas físicas. El total del sistema también incluye
            personas jurídicas y puede quedar por encima, por debajo o igual: en pesos a menos de 30
            días, las cifras fueron <strong>{{ pct(hl.uyuCortoPersonas) }}</strong> para personas
            físicas y {{ pct(hl.uyuCortoTotal) }} para el total. Son medias ponderadas de
            operaciones distintas; la diferencia no demuestra que un tipo de cliente consiga siempre
            mejores condiciones.
          </p>
          <p v-for="item in pfExceptions" :key="`${item.currency}-${item.bucket.label}`">
            En {{ item.moneda }}, tramo <strong>{{ item.bucket.label }}</strong
            >, la media de personas físicas no queda por debajo:
            {{ cell(item.bucket.personaFisica) }}, frente a {{ cell(item.bucket.totalSistema) }} del
            total. Se comparan los valores publicados a dos decimales.
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
            <strong>La misma pizarra incluye {{ ahorro.name }}, un ahorro mensual en pesos.</strong>
            Publica {{ pct(ahorro.year1) }} para el primer período y {{ pct(ahorro.year2) }} /
            {{ pct(ahorro.year3) }} con las primas de {{ pct(ahorro.primaPct2) }} /
            {{ pct(ahorro.primaPct3) }} sobre la tasa. En cada renovación se usa la pizarra vigente
            entonces: esos últimos porcentajes no están garantizados para años futuros.
          </p>
          <p>
            Es {{ ahorro.term }}, con depósitos mensuales de {{ ahorroMin }} a {{ ahorroMax }} y
            {{ ahorro.channel }}. El capital está disponible al vencimiento del contrato. No entra
            en esta tabla porque son aportes mensuales, no la colocación inicial única que simula la
            calculadora. {{ ahorro.requirement }}
          </p>
          <p>
            Es la pizarra de un banco. Los demás publican la suya —arriba están las de
            {{ PLAZO_FIJO_BANCOS.length }} bancos, con la fecha en que las consultamos— y cambian
            sin aviso: la vigencia va al lado del número por algo.
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
          <!-- El instrumento en pesos a menos de un año que NO paga este impuesto, y la única razón
               por la que no le gana siempre al plazo fijo: se compra con comisión. -->
          <p>
            En pesos y a menos de un año, lo que compite con el plazo fijo sin pagar IRPF son las
            <NuxtLink :to="localePath('/letras-de-regulacion-monetaria-uruguay')">
              Letras de Regulación Monetaria del BCU</NuxtLink
            >: deuda pública exenta, que se compra por un banco o un corredor que cobra comisión.
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
      {{ brouSeries.vigenciaMoneda }} (documento vigente al {{ BROU_DEPOSIT_BOARD.vigencia }}), y
      las pizarras de cada banco se consultaron el {{ reviewedText }}; todas caducan sin aviso. El
      neto de IRPF usa las alícuotas del {{ DEPOSIT_IRPF_LAW }} y no contempla comisiones ni tu
      situación fiscal particular. Confirmá las condiciones reales con tu banco antes de constituir
      el depósito.
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
import {
  PLAZO_FIJO_BANCOS,
  PLAZO_FIJO_BANCOS_FUERA,
  PLAZO_FIJO_BANCOS_REVIEWED,
  comparePlazoFijo,
  readOnText,
  vigenciaText,
} from '~/utils/plazoFijoBancos'

const localePath = useLocalePath()
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
/**
 * Lo que publica cada banco para el depósito de los campos: moneda, plazo y capital. La fila es
 * la del tramo de monto del visitante, nunca la mejor del banco (utils/plazoFijoBancos.ts).
 */
const banks = computed(() => comparePlazoFijo(currency.value, days.value, principal.value || 0))
const reviewedText = readOnText(PLAZO_FIJO_BANCOS_REVIEWED)
/** El capital sin centavos: en la frase del panel, "$ 100.000,00" es ruido. */
const amountText = computed(() => `${money.value.prefix} ${formatNumber(principal.value || 0, 0)}`)
/** "Santander, BTG Pactual (ex HSBC), Bandes ni BHU", leído de la lista y no escrito a mano. */
const excludedNames = (() => {
  const names = PLAZO_FIJO_BANCOS_FUERA.map(b => b.name)
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} ni ${names.at(-1)}` : (names[0] ?? '')
})()
const absences = DEPOSIT_REFERENCE_ABSENCES
const sources = [
  ...DEPOSIT_REFERENCE_SOURCES,
  ...PLAZO_FIJO_BANCOS.filter(b => b.id !== 'brou').map(b => ({
    label: `${b.name} — ${b.sourceTitle}, consultada el ${readOnText(b.readOn)}`,
    url: b.sourceUrl,
  })),
]

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
  /** La brecha de canal, restada y no estimada a ojo: 5,70 − 4,28 = 1,42 puntos, no "un punto y medio". */
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
 * Excepciones a que la media de personas físicas sea menor: pueden ser empates o valores
 * mayores. La prosa muestra ambas cifras sin inventar una relación fija entre los grupos.
 */
const CURRENCY_ORDER: DepositCurrency[] = ['UYU', 'USD', 'UI']
const pfExceptions = CURRENCY_ORDER.flatMap(c =>
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

const resultEl = ref<HTMLElement | null>(null)

/**
 * Deja la tasa elegida y vuelve a capitalización anual, porque la referencia es una TEA. Los
 * botones están DEBAJO del resultado: si el resultado quedó fuera de la pantalla, se lo trae,
 * para que el visitante vea el número cambiar en vez de tener que ir a buscarlo.
 */
function applyRate(value: number) {
  ratePct.value = value
  timesPerYear.value = 1
  const el = resultEl.value
  if (!el || typeof window === 'undefined') return
  const box = el.getBoundingClientRect()
  if (box.top >= 64 && box.bottom <= window.innerHeight) return
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
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

/**
 * Las dos preguntas que trae Search Console ("plazo fijo brou dólares", "simulador plazo fijo"),
 * contestadas con la misma tabla que dibuja la página: ningún número se escribe a mano.
 */
const brouUsdSeries = BROU_DEPOSIT_BOARD.series.USD
const brouUsdAnio = brouTrancheFor('USD', 12)
const brouUsdLargo = brouUsdSeries.tranches[brouUsdSeries.tranches.length - 1]
/** Quién encabeza un caso, nombrando a todos los empatados en la tasa más alta. */
function leaders(offers: ReturnType<typeof comparePlazoFijo>['offers']): string {
  const top = offers[0]
  if (!top) return 'ningún banco de la lista'
  const names = [...new Set(offers.filter(o => o.rate === top.rate).map(o => o.bankName))]
  const who = names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names.at(-1)}` : names[0]
  return `${who}, con ${pct(top.rate)}`
}
const leaderUyu = leaders(comparePlazoFijo('UYU', daysForMonths(12), 100_000).offers)
const leaderUsd = leaders(comparePlazoFijo('USD', daysForMonths(12), 10_000).offers)

const faq = [
  {
    q: '¿Cuánto paga el BROU por un plazo fijo en dólares?',
    a: `Según su pizarra para personas (la de dólares rige desde el ${brouUsdSeries.vigenciaMoneda}), a un año —tramo de ${brouUsdAnio?.label ?? ''} días— paga ${pct(brouUsdAnio?.online ?? 0)} efectivo anual si lo constituís por e-BROU y ${pct(brouUsdAnio?.branch ?? 0)} en sucursal; de ${brouUsdLargo?.label ?? ''} días, ${pct(brouUsdLargo?.online ?? 0)} y ${pct(brouUsdLargo?.branch ?? 0)}. El mínimo es ${brouUsdSeries.minimum}. Sobre el interés en dólares el IRPF es ${irpfRowText(irpfUsd)}. Pizarra consultada el ${reviewedText}.`,
  },
  {
    q: '¿Qué banco paga más por un plazo fijo en Uruguay?',
    a: `Depende del monto, del plazo y del canal, y por eso la tabla se arma con los tuyos. Con las pizarras consultadas el ${reviewedText}, a un año: con $ 100.000 en pesos encabeza ${leaderUyu}; con USD 10.000 en dólares, ${leaderUsd}. Son tasas publicadas por cada banco: ${PLAZO_FIJO_BANCOS_FUERA[0]?.name ?? 'Santander'} no publica la suya y no entra en la comparación.`,
  },
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
    a: `Es el máximo del plazo fijo en pesos de esta pizarra por e-BROU. El PDF también muestra ${ahorro.name}: ${pct(ahorro.year1)} de base y ${pct(ahorro.year2)} / ${pct(ahorro.year3)} con primas. Es ahorro mensual, con capital disponible al vencimiento. Las renovaciones toman la pizarra vigente entonces, más ${pct(ahorro.primaPct2)} / ${pct(ahorro.primaPct3)} sobre esa tasa; no garantizan hoy esos porcentajes futuros.`,
  },
  {
    q: '¿Puedo comparar la tasa de todos los bancos en un cuadro oficial?',
    a: `No existe. El BCU publica las tasas pasivas sólo como total del sistema bancario, sin abrir por institución ni siquiera entre banca pública y privada; las únicas tasas banco por banco que publica son las de tarjeta de crédito, que son del lado de los préstamos. Para comparar plazos fijos hay que mirar la pizarra que publica cada banco por su cuenta, y eso es lo que junta esta calculadora: ${PLAZO_FIJO_BANCOS.map(b => b.name).join(', ')}, leídas en la página de cada uno el ${reviewedText}.`,
  },
  {
    q: '¿Cómo funciona el interés compuesto?',
    a: 'Los intereses generados se reinvierten junto al capital, de modo que en cada período se calcula interés sobre un monto mayor. Ojo: las tasas que publican el BCU y los bancos ya son efectivas anuales, o sea que la capitalización está incluida en el número. Si las cargás con capitalización mensual, el resultado sale inflado.',
  },
]
</script>

<style scoped>
/* Panel de bancos: mismo lenguaje visual que .tool-info-box de ToolShell. Cada bloque de texto
   declara su propio margen superior (DESIGN.md, The Text Block Owns Its Top Margin Rule). */
.ref-panel {
  background: rgba(33, 150, 243, 0.06);
  border: 1px solid rgba(33, 150, 243, 0.22);
  border-radius: 12px;
}

.ref-panel :where(h2, h3, p, ul) {
  margin-top: 0;
}

.ref-title {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.4;
  margin-bottom: 8px;
}

.ref-intro {
  font-size: 0.95rem;
  line-height: 1.6;
  max-width: 72ch;
  margin-bottom: 16px;
}

.bank-table {
  background: transparent;
}

/* The Number Breathes Rule: la tasa es lo que se compara, alineada y sin cortar. */
.bank-rate {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.ref-subtitle {
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.4;
  margin-top: 16px;
  margin-bottom: 8px;
}

.ref-list {
  font-size: 0.875rem;
  line-height: 1.6;
  padding-left: 16px;
  margin-bottom: 0;
}

.ref-list li + li {
  margin-top: 4px;
}

.ref-note {
  font-size: 0.875rem;
  line-height: 1.6;
  margin: 8px 0 12px;
  color: rgba(255, 255, 255, 0.75);
}

.ref-foot {
  font-size: 0.8rem;
  line-height: 1.6;
  margin-top: 16px;
  margin-bottom: 0;
  color: rgba(255, 255, 255, 0.7);
}

.ref-foot + .ref-foot {
  margin-top: 8px;
}

.ref-details {
  margin-top: 8px;
  font-size: 0.875rem;
}

/* 44px de alto: es un control táctil. */
.ref-details summary {
  min-height: 44px;
  padding: 12px 0;
  cursor: pointer;
  font-weight: 600;
  color: rgb(var(--v-theme-link));
}

.ref-box {
  margin-top: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px;
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
