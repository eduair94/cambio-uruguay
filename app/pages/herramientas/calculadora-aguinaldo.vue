<template>
  <ToolShell slug="calculadora-aguinaldo" :faq="faq" hide-disclaimer>
    <VCard class="pa-4 pa-sm-6">
      <div class="text-overline text-grey mb-2">Cómo querés calcularlo</div>
      <VBtnToggle
        v-model="mode"
        color="primary"
        mandatory
        divided
        variant="outlined"
        class="seg-toggle mb-6"
      >
        <VBtn value="total" class="seg-btn">
          <VIcon start>mdi-cash-multiple</VIcon>
          Total del semestre
        </VBtn>
        <VBtn value="monthly" class="seg-btn">
          <VIcon start>mdi-calendar-month</VIcon>
          Sueldo mensual fijo
        </VBtn>
      </VBtnToggle>

      <VTextField
        v-if="mode === 'total'"
        v-model.number="totalSemester"
        type="number"
        min="0"
        label="Total nominal ganado en el semestre"
        prefix="$"
        variant="outlined"
        density="comfortable"
        hide-details
      />
      <VRow v-else class="g-input" align="center">
        <VCol cols="12" sm="7">
          <VTextField
            v-model.number="monthly"
            type="number"
            min="0"
            label="Sueldo nominal mensual"
            prefix="$"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="5">
          <VTextField
            v-model.number="months"
            type="number"
            min="1"
            max="6"
            label="Meses trabajados"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
      </VRow>

      <div class="d-flex flex-wrap column-gap-6 mt-3">
        <VCheckbox
          v-model="conHijos"
          label="Tengo hijos a cargo"
          density="compact"
          hide-details
          color="primary"
        />
        <VCheckbox
          v-model="conyugeACargo"
          label="Tengo cónyuge o concubino a cargo en FONASA"
          density="compact"
          hide-details
          color="primary"
        />
      </div>

      <VDivider class="my-6" />

      <div class="result-grid">
        <div class="result-box">
          <div class="text-overline text-grey">Aguinaldo nominal</div>
          <div class="text-h4 font-weight-bold text-primary">{{ formatUYU(aguinaldo) }}</div>
        </div>
        <div class="result-box" data-testid="aguinaldo-liquido">
          <div class="text-overline text-grey">Te queda en mano (estimado)</div>
          <div class="text-h4 font-weight-bold">{{ formatUYU(liquido.liquido) }}</div>
        </div>
      </div>

      <table class="desc-table mt-4" aria-label="Descuentos del aguinaldo">
        <tbody>
          <tr>
            <th scope="row">Aporte jubilatorio (BPS)</th>
            <td>{{ pct(liquido.jubilatorio.rate) }}</td>
            <td>− {{ formatUYU(liquido.jubilatorio.amount) }}</td>
          </tr>
          <tr>
            <th scope="row">FONASA</th>
            <td>{{ pct(liquido.fonasa.rate) }}</td>
            <td>− {{ formatUYU(liquido.fonasa.amount) }}</td>
          </tr>
          <tr>
            <th scope="row">FRL</th>
            <td>{{ pct(liquido.frl.rate) }}</td>
            <td>− {{ formatUYU(liquido.frl.amount) }}</td>
          </tr>
          <tr>
            <th scope="row">IRPF</th>
            <td>{{ pct(liquido.irpf.rate) }}</td>
            <td>− {{ formatUYU(liquido.irpf.amount) }}</td>
          </tr>
        </tbody>
      </table>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        <template v-if="mode === 'total'">
          Para la tasa de FONASA y la de IRPF tomamos como sueldo del mes el promedio del semestre
          ({{ formatUYU(sueldoMensual) }}).
        </template>
        La tasa de FONASA sale del sueldo del mes, sin el aguinaldo, y el IRPF se le aplica aparte,
        a la tasa más alta que ya pagás por tu sueldo. Es una estimación: el recibo puede diferir en
        poco por el crédito de deducciones del IRPF.
        <template v-if="liquido.superaTopeJubilatorio">
          Tu aguinaldo pasa el tope jubilatorio, que tiene uno propio para el aguinaldo: el aporte
          real es menor y lo que te queda, algo más.
        </template>
      </p>
    </VCard>

    <template #content>
      <h2>Cómo se calcula el aguinaldo</h2>
      <p>
        El aguinaldo (sueldo anual complementario) equivale a la <strong>doceava parte</strong> del
        total nominal cobrado en el semestre. La fórmula es simple: sumás lo ganado en el período y
        lo dividís entre 12.
      </p>
      <p>
        Se paga en dos partes al año. En 2026 la primera se pagó dentro de junio, por lo ganado de
        diciembre a mayo, y la segunda vence el 20 de diciembre (Decreto 113/026), por lo ganado del
        1.º de junio al 30 de noviembre. Las fechas de cada sector están en
        <NuxtLink :to="localePath('/cuando-se-cobra-el-aguinaldo-uruguay')"
          >cuándo se cobra el aguinaldo</NuxtLink
        >. Esta estimación toma el nominal; el monto efectivo puede variar por descuentos y partidas
        especiales.
      </p>
      <h2>Cuánto te descuentan del aguinaldo</h2>
      <p>
        El aguinaldo no se cobra entero. Lleva el <strong>aporte jubilatorio del 15 %</strong>, el
        <strong>FONASA</strong> y el <strong>FRL del 0,10 %</strong>, igual que el sueldo: el BPS lo
        dice en su comunicado del ajuste anual del IRPF (las deducciones por aportes jubilatorios,
        Seguro Nacional de Salud y FRL «deben incluir los aportes personales por concepto de
        aguinaldo»). La tasa de FONASA es la que te toca por tu sueldo del mes, porque la prueba de
        las 2,5 BPC se hace sin el aguinaldo. El <strong>IRPF</strong> va aparte: la DGI grava el
        aguinaldo legal a una tasa fija, la marginal más alta que ya pagás por el resto de tu
        sueldo, así que no te sube de franja; con un sueldo de hasta 7 BPC ({{
          formatUYU(sieteBpc)
        }}) es cero. La cuenta de arriba hace exactamente eso.
      </p>
      <p>
        No hay antigüedad mínima: con pocos meses en la empresa cobrás la parte de esos meses, y eso
        es lo que calcula el modo "Sueldo mensual fijo". Si trabajaste en negro, estuviste
        certificado o te fuiste en el semestre, mirá
        <NuxtLink :to="localePath('/guias/aguinaldo-casos-especiales-uruguay')"
          >el aguinaldo en los casos especiales</NuxtLink
        >, y para entender la cuenta,
        <NuxtLink :to="localePath('/guias/como-se-calcula-el-aguinaldo-uruguay')"
          >cómo se calcula el aguinaldo</NuxtLink
        >.
      </p>
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { URUGUAY, computeAguinaldo } from '~/utils/calculators'
import { formatUYU } from '~/utils/format'
import { computeAguinaldoLiquido } from '~/utils/payroll'

const localePath = useLocalePath()

const mode = ref<'total' | 'monthly'>('total')
const totalSemester = ref(300000)
const monthly = ref(50000)
const months = ref(6)

const aguinaldo = computed(() =>
  mode.value === 'total'
    ? computeAguinaldo(totalSemester.value || 0)
    : computeAguinaldo((monthly.value || 0) * (months.value || 0))
)

const conHijos = ref(false)
const conyugeACargo = ref(false)

// El sueldo del mes decide la tasa de FONASA y la del IRPF del aguinaldo. Con el total del
// semestre no lo sabemos: usamos el promedio, y la página lo dice.
const sueldoMensual = computed(() =>
  mode.value === 'total' ? (totalSemester.value || 0) / 6 : monthly.value || 0
)

const liquido = computed(() =>
  computeAguinaldoLiquido({
    aguinaldo: aguinaldo.value,
    sueldoMensual: sueldoMensual.value,
    hijos: conHijos.value ? 1 : 0,
    conyugeACargo: conyugeACargo.value,
  })
)

const sieteBpc = 7 * URUGUAY.bpc
const pct = (rate: number) => `${rate.toLocaleString('es-UY', { maximumFractionDigits: 2 })} %`

const faq = [
  {
    q: '¿Cómo se calcula el aguinaldo en Uruguay?',
    a: 'El aguinaldo equivale al total nominal ganado en el semestre dividido entre 12. Por ejemplo, si en seis meses cobraste $300.000 nominales, el aguinaldo es de $25.000.',
  },
  {
    q: '¿Cuándo se cobra el aguinaldo?',
    a: 'En dos cuotas: la primera dentro de junio, por lo ganado de diciembre a mayo, y la segunda antes de fin de año, por lo ganado de junio a noviembre. En 2026 la de diciembre se paga hasta el 20 de diciembre (Decreto 113/026).',
  },
  {
    q: '¿Cuánto me descuentan del aguinaldo?',
    a: 'Lo mismo que del sueldo en aportes: 15 % jubilatorio, FONASA a la tasa que te toca por tu sueldo del mes (la prueba de 2,5 BPC se hace sin el aguinaldo) y 0,10 % de FRL. El IRPF va aparte, a la tasa marginal más alta que ya pagás por tu sueldo, y es cero si ganás hasta 7 BPC por mes. Con $ 50.000 por mes y seis meses trabajados, de $ 25.000 de aguinaldo quedan unos $ 17.600.',
  },
  {
    q: '¿Me corresponde aguinaldo si trabajé solo 3 meses?',
    a: 'Sí. La Ley 12.840 no exige antigüedad mínima: cobrás la doceava parte de lo que te pagaron en dinero en los meses trabajados del semestre. Con 3 meses a $ 50.000 nominales, son $ 12.500 nominales.',
  },
  {
    q: '¿Qué pasa si no me pagan el aguinaldo a tiempo?',
    a: 'Desde el día siguiente al vencimiento la deuda lleva un recargo automático del 10 % (Ley 18.572, art. 29), y podés denunciarlo en la Inspección General del Trabajo del MTSS.',
  },
]
</script>

<!-- Layout primitives shared from ToolShell (.tool-page namespace). -->

<style scoped>
.desc-table {
  width: 100%;
  max-width: 28rem;
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
