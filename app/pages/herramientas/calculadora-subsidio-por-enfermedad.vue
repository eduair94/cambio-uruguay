<template>
  <ToolShell
    slug="calculadora-subsidio-por-enfermedad"
    :faq="faq"
    :sources="sources"
    content-layout="below"
    heading="Calculadora del subsidio por enfermedad del BPS"
  >
    <VCard class="pa-4 pa-sm-6">
      <VRow class="g-input" align="center">
        <VCol cols="12" sm="7">
          <VTextField
            v-model.number="monthlyBase"
            type="number"
            min="0"
            label="Sueldo nominal mensual (promedio de los últimos 180 días)"
            prefix="$"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="5">
          <VTextField
            v-model.number="certifiedDays"
            type="number"
            min="1"
            label="Días certificados"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
      </VRow>

      <VCheckbox
        v-model="hospitalized"
        label="Hubo internación (en la mutualista o en el domicilio)"
        density="compact"
        hide-details
        color="primary"
        class="mt-3"
      />

      <VDivider class="my-6" />

      <div class="result-grid">
        <div class="result-box" data-testid="subsidio-total">
          <div class="text-overline text-grey">Te paga el BPS (nominal)</div>
          <div class="text-h4 font-weight-bold text-primary">{{ formatUYU(result.total) }}</div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Días que cubre</div>
          <div class="text-h4 font-weight-bold">
            {{ result.paidDays }} <span class="text-h6 font-weight-regular">de {{ days }}</span>
          </div>
        </div>
      </div>

      <table class="desc-table mt-4" aria-label="Detalle del subsidio por enfermedad">
        <tbody>
          <tr>
            <th scope="row">{{ ratePct }} de tu base</th>
            <td>por mes</td>
            <td>{{ formatUYU(result.grossMonthly) }}</td>
          </tr>
          <tr>
            <th scope="row">Tope del BPS ({{ capSince }})</th>
            <td>por mes</td>
            <td>{{ formatUYU(cap) }}</td>
          </tr>
          <tr>
            <th scope="row">Lo que liquida el BPS</th>
            <td>por día</td>
            <td>{{ formatUYU(result.daily) }}</td>
          </tr>
          <tr>
            <th scope="row">Subsidio por {{ result.paidDays }} días</th>
            <td />
            <td>{{ formatUYU(result.subsidy) }}</td>
          </tr>
          <tr>
            <th scope="row">Cuota parte de aguinaldo (1/12)</th>
            <td />
            <td>+ {{ formatUYU(result.aguinaldoShare) }}</td>
          </tr>
          <tr v-if="result.unpaidDays > 0">
            <th scope="row">{{ result.unpaidDays }} primeros días, sin cubrir</th>
            <td />
            <td>− {{ formatUYU(result.lostToWaitingDays) }}</td>
          </tr>
        </tbody>
      </table>

      <VAlert
        v-if="result.cappedByTope"
        type="info"
        variant="tonal"
        density="comfortable"
        class="mt-4"
        icon="mdi-arrow-collapse-down"
      >
        Tu base pasa el tope: el BPS no te paga el {{ ratePct }} sino el tope de
        {{ formatUYU(cap) }} por mes. El {{ ratePct }} empieza a recortarse arriba de
        {{ formatUYU(capBitesAt) }} nominales.
      </VAlert>

      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        El monto es <strong>nominal</strong>: el BPS descuenta los aportes personales al pagar
        (Decreto 7/976, arts. 6 y 8). Y el monto por día es nuestra estimación, no una regla
        publicada: ni el Decreto-Ley 14.407 ni su reglamento fijan cuántos días tiene el mes para
        liquidar, así que acá el monto mensual se divide entre {{ daysPerMonth }}. Si cobrás por
        jornal, el BPS te liquida por jornal y esta cuenta no te sirve tal cual.
      </p>
    </VCard>

    <template #content>
      <h2>Cuánto paga el BPS cuando te certifican</h2>
      <p>
        El subsidio por enfermedad es el <strong>{{ ratePct }}</strong> de lo que cobrás, y no sale
        de tu último sueldo: el BPS lo calcula sobre «el equivalente al {{ ratePct }} de todos sus
        ingresos que constituyan materia gravada», sin el aguinaldo, tomando «el promedio del total
        de lo percibido en los {{ averageWindow }} días anteriores al último día del mes anterior al
        de la enfermedad». Por eso un mes flojo o un mes cargado de horas extra te corre el número.
        El tope vigente que publica el BPS es de <strong>{{ formatUYU(cap) }}</strong> con vigencia
        {{ capSince }}; para los patrones rurales es el {{ ratePct }} del ficto patronal ({{
          formatUYU(ruralCap)
        }}).
      </p>
      <p>
        Ese tope no se calcula, se copia. El artículo 27 del Decreto-Ley 14.407 escribe el máximo
        como «el triple del monto del salario mínimo nacional», la Ley 18.725 lo reescribió en BPC y
        la Ley 19.003 sólo lo indexa desde 2021: hoy la cantidad de BPC ya no es la de la escala
        original, así que multiplicar da otro número. El que se paga es el que el BPS publica cada
        enero. La historia completa de esa cadena está en
        <NuxtLink :to="localePath('/guias/me-certifique-subsidio-por-enfermedad-uruguay')"
          >la guía del subsidio por enfermedad</NuxtLink
        >.
      </p>
      <h2>Desde qué día se paga</h2>
      <p>
        Desde el cuarto. El artículo 14 dice que el beneficiario percibe el subsidio «a partir del
        cuarto día de ausencia provocada por enfermedad o accidente», y el BPS lo repite: «El
        subsidio se abonará a partir del cuarto día de certificación». Los
        <strong>{{ waitingDays }} primeros días</strong> quedan afuera de la prestación, y conviene
        ser exacto con lo que la norma no dice: ni el decreto-ley ni su reglamento los ponen a cargo
        del empleador. Si en tu empresa te los pagan, sale del convenio de tu rama, no de esta ley.
      </p>
      <p>
        La excepción es una sola y es la <strong>internación</strong>: «En los casos que el
        beneficiario haya sido hospitalizado no habrá período de pérdida del subsidio, a partir de
        la internación» (art. 14), y el BPS la aplica también a la internación domiciliaria. Una
        cirugía ambulatoria, sin internación, no aparece amparada por esa excepción en ninguna de
        las fuentes, así que no cuentes con ella sin preguntar antes.
      </p>
      <h2>El aguinaldo del subsidio no se pierde</h2>
      <p>
        Se cobra aparte: el decreto-ley se lo reconoce al beneficiario (art. 28) y su reglamento
        manda pagar «la doceava parte» junto con el subsidio (Decreto 7/976, art. 12). Es la línea
        que esta cuenta suma al final. En un accidente de trabajo la cosa cambia de organismo: el
        Banco de Seguros del Estado cubre dos tercios del jornal (66,67 %) y el BPS agrega el 3,33 %
        restante hasta llegar al {{ ratePct }}.
      </p>
      <h2>Cuánto puede durar</h2>
      <p>
        Hasta un año, «que podrá ser extendido hasta en un año más por votación unánime y fundada de
        los integrantes del Directorio» (art. 14). El máximo a cobrar son
        <strong>{{ maxYears + extensionYears }} años</strong>; los {{ accumulationWindow }} de los
        que habla el BPS son la ventana dentro de la cual se acumulan los tramos de la misma
        dolencia (art. 15), no el techo. Y el trámite no lo hacés vos: tu prestador de salud carga
        la certificación y eso genera la solicitud. Tu parte es avisarle a la empresa.
      </p>
      <p>
        Si lo que te pasó fue un despido y no una enfermedad, la cuenta es otra:
        <NuxtLink :to="localePath('/seguro-de-paro-uruguay')">el seguro de paro</NuxtLink> baja mes
        a mes y tiene un tope distinto para cada uno.
      </p>
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatUYU } from '~/utils/format'
import {
  DAYS_PER_MONTH,
  SICK_LEAVE_ACCUMULATION_WINDOW_YEARS,
  SICK_LEAVE_AVERAGE_WINDOW_DAYS,
  SICK_LEAVE_CAP_SINCE,
  SICK_LEAVE_EXTENSION_YEARS,
  SICK_LEAVE_MAX_YEARS,
  SICK_LEAVE_MONTHLY_CAP,
  SICK_LEAVE_RATE,
  SICK_LEAVE_RURAL_PATRON_CAP,
  SICK_LEAVE_WAITING_DAYS,
  baseWhereCapBites,
  computeSickLeave,
} from '~/utils/sickLeaveBenefit'

const localePath = useLocalePath()

const monthlyBase = ref(60000)
const certifiedDays = ref(10)
const hospitalized = ref(false)

const days = computed(() => Math.max(0, Math.floor(certifiedDays.value || 0)))

const result = computed(() =>
  computeSickLeave({
    monthlyBase: monthlyBase.value || 0,
    certifiedDays: certifiedDays.value || 0,
    hospitalized: hospitalized.value,
  })
)

const cap = SICK_LEAVE_MONTHLY_CAP
const capSince = SICK_LEAVE_CAP_SINCE
const ruralCap = SICK_LEAVE_RURAL_PATRON_CAP
const capBitesAt = baseWhereCapBites()
const waitingDays = SICK_LEAVE_WAITING_DAYS
const daysPerMonth = DAYS_PER_MONTH
const averageWindow = SICK_LEAVE_AVERAGE_WINDOW_DAYS
const maxYears = SICK_LEAVE_MAX_YEARS
const extensionYears = SICK_LEAVE_EXTENSION_YEARS
const accumulationWindow = SICK_LEAVE_ACCUMULATION_WINDOW_YEARS
const ratePct = `${(SICK_LEAVE_RATE * 100).toLocaleString('es-UY', { maximumFractionDigits: 2 })} %`

const sources = [
  {
    label: 'BPS — Subsidio por enfermedad (monto, tope 01/2026, cuarto día, duración)',
    url: 'https://www.bps.gub.uy/4774/subsidio-por-enfermedad.html',
  },
  {
    label: 'IMPO — Decreto-Ley 14.407, arts. 13, 14, 15, 27 y 28 (texto vigente)',
    url: 'https://www.impo.com.uy/bases/decretos-ley/14407-1975',
  },
  {
    label: 'IMPO — Decreto 7/976, reglamento: arts. 6, 7, 8 y 12 (la doceava parte de aguinaldo)',
    url: 'https://www.impo.com.uy/bases/decretos/7-1976',
  },
  {
    label: 'IMPO — Ley 18.725, art. 2: la base es la materia gravada desde el 1/1/2011',
    url: 'https://www.impo.com.uy/bases/leyes/18725-2011/2',
  },
]

const faq = [
  {
    q: '¿Cuánto paga el BPS por enfermedad?',
    a: `El ${ratePct} del promedio de materia gravada de los ${averageWindow} días anteriores al último día del mes anterior a la enfermedad, sin contar el aguinaldo, con un tope de ${formatUYU(cap, 0)} por mes (vigencia ${capSince}). Arriba de ${formatUYU(capBitesAt, 0)} nominales por mes, lo que cobrás es el tope y no el ${ratePct}.`,
  },
  {
    q: '¿Desde qué día me paga el BPS el certificado?',
    a: `Desde el cuarto día de certificación: los ${waitingDays} primeros quedan fuera de la prestación (Decreto-Ley 14.407, art. 14). La única excepción es la internación —en la mutualista o en el domicilio—, y ahí se paga desde el primer día.`,
  },
  {
    q: '¿Quién me paga los tres primeros días?',
    a: 'Ni el Decreto-Ley 14.407 ni su reglamento, el Decreto 7/976, los ponen a cargo del empleador: simplemente quedan fuera del subsidio. Si tu empresa te los paga, sale del convenio colectivo de tu rama o de una política interna, así que preguntá de dónde salen antes de darlo por hecho.',
  },
  {
    q: '¿Cobro aguinaldo por los días que estuve certificado?',
    a: 'Sí, y lo paga el BPS junto con el subsidio: el Decreto 7/976, art. 12, manda pagar «la doceava parte del mismo en concepto de aguinaldo», y el art. 28 del decreto-ley se lo reconoce al beneficiario. Es la última línea de la cuenta de esta página.',
  },
  {
    q: '¿Cuánto tiempo puedo estar cobrando el subsidio por enfermedad?',
    a: `Hasta un año, con un año más de prórroga que el Directorio tiene que votar por unanimidad y fundar (art. 14): ${SICK_LEAVE_MAX_YEARS + SICK_LEAVE_EXTENSION_YEARS} años como máximo. Los ${accumulationWindow} años que el BPS menciona son la ventana dentro de la cual se acumulan los tramos de la misma dolencia (art. 15), no el techo a cobrar.`,
  },
  {
    q: '¿El monto de la calculadora es lo que me llega al banco?',
    a: 'No exactamente. Es nominal: el BPS calcula los aportes «sobre la base del monto del subsidio» y descuenta el aporte obrero al pagar (Decreto 7/976, arts. 6 y 8). Y el monto diario es una estimación nuestra, porque ninguna de las dos normas fija cuántos días tiene el mes para liquidar: acá se divide el mensual entre 30.',
  },
]
</script>

<!-- Layout primitives shared from ToolShell (.tool-page namespace). -->

<style scoped>
.desc-table {
  width: 100%;
  max-width: 32rem;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
  font-size: 0.9rem;
}

.desc-table th {
  text-align: left;
  font-weight: 500;
  padding: 4px 0;
}

.desc-table td {
  text-align: right;
  padding: 4px 0 4px 12px;
  white-space: nowrap;
}

.desc-table tr + tr {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
</style>
