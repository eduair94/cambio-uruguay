<template>
  <ToolShell slug="calculadora-prestamo" :faq="faq" content-layout="below">
    <VCard class="pa-4 pa-sm-6">
      <VRow class="g-input">
        <VCol cols="12" sm="6">
          <VTextField
            v-model.number="principal"
            type="number"
            min="0"
            label="Monto del préstamo"
            prefix="$"
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
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="3">
          <VTextField
            v-model.number="months"
            type="number"
            min="1"
            label="Cuotas (meses)"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6">
          <VSelect
            v-model="rateKind"
            :items="rateKindItems"
            label="La tasa que ingresás es"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6" class="d-flex align-center">
          <VSwitch
            v-model="withIva"
            color="primary"
            density="comfortable"
            hide-details
            inset
            :label="`Sumar IVA (${ivaPct} %) a los intereses`"
          />
        </VCol>
      </VRow>

      <div class="result-grid mt-6" aria-live="polite">
        <div class="result-box">
          <div class="text-overline text-grey">Cuota mensual</div>
          <div class="text-h5 font-weight-bold text-primary">{{ pesos(r.cuota) }}</div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Total a pagar</div>
          <div class="text-h5 font-weight-bold text-success">{{ pesos(r.total) }}</div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Intereses totales</div>
          <div class="text-h5 font-weight-bold">{{ pesos(r.intereses) }}</div>
        </div>
      </div>
    </VCard>

    <!-- La cuota con cada prestamista, para el monto y las cuotas de arriba. Las tasas son las del
         tablero de /mejores-prestamos-uruguay (utils/loanTierlist.ts + /api/loan-tiers); la cuenta
         y la regla de los rangos viven en utils/loanSimulator.ts. -->
    <VCard variant="flat" class="lenders-panel tool-info-box mt-6 pa-4 pa-sm-5">
      <h2 class="lenders-title">Tu cuota con cada prestamista</h2>
      <p class="lenders-intro">
        Para <strong>{{ pesos(principal || 0) }}</strong> en
        <strong>{{ monthsCount }} {{ monthsCount === 1 ? 'cuota' : 'cuotas' }}</strong
        >, con la tasa efectiva anual que publica cada uno, de menor a mayor costo total. Si publica
        un rango, van las dos cuentas: la del piso y la del techo. Cuál te toca lo decide tu perfil,
        no el aviso.
      </p>

      <VTable
        v-if="comparison.quotes.length"
        density="comfortable"
        class="lenders-table cu-mobile-cards cu-roomy"
      >
        <thead>
          <tr>
            <th>Prestamista</th>
            <th>TEA publicada</th>
            <th class="text-right">Cuota mensual</th>
            <th class="text-right">Total a pagar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="q in comparison.quotes" :key="q.id">
            <td data-label="">
              <a :href="q.sourceUrl" target="_blank" rel="noopener noreferrer" class="tool-link">
                {{ q.name }}
              </a>
              <div class="text-caption text-medium-emphasis">
                {{ SEGMENT_LABELS[q.segment] }}
              </div>
            </td>
            <td data-label="TEA publicada">
              {{ teaBandLabel(q.band, q.ivaOnInterest) }}
              <div v-if="q.band.kind === 'tope'" class="text-caption text-medium-emphasis">
                sin piso publicado o verificado
              </div>
            </td>
            <td data-label="Cuota mensual" class="text-right lender-amount">
              {{ span(q, 'cuota') }}
            </td>
            <td data-label="Total a pagar" class="text-right lender-amount">
              {{ span(q, 'total') }}
            </td>
          </tr>
        </tbody>
      </VTable>
      <p v-else class="lenders-note">
        Ningún prestamista del tablero publica una tasa para {{ pesos(principal || 0) }} en
        {{ monthsCount }} cuotas. Abajo, por qué.
      </p>

      <template v-if="comparison.outOfLimits.length">
        <h3 class="lenders-subtitle">Fuera de lo que prestan</h3>
        <ul class="lenders-list">
          <li v-for="o in comparison.outOfLimits" :key="o.id">
            <strong>{{ o.name }}</strong
            >: {{ o.detail }}.
          </li>
        </ul>
      </template>
      <template v-if="comparison.unpublished.length">
        <h3 class="lenders-subtitle">Sin tasa para hacer la cuenta</h3>
        <ul class="lenders-list">
          <li v-for="o in comparison.unpublished" :key="o.id">
            <a :href="o.sourceUrl" target="_blank" rel="noopener noreferrer" class="tool-link">{{
              o.name
            }}</a
            >: {{ o.detail }}.
          </li>
        </ul>
      </template>

      <p class="lenders-foot">
        <strong>De cuándo son las tasas.</strong> {{ dataDateText }} Cada nombre enlaza la página
        del prestamista de donde salió su tasa. La cuenta pasa la TEA a tasa mensual efectiva y, si
        el prestamista cobra el IVA aparte, se lo suma a los intereses; no incluye seguros,
        comisiones de concesión ni gastos, que varios cobran. El número que obliga es el costo
        financiero total del contrato: pedilo antes de firmar.
      </p>
      <p class="lenders-foot">
        La ley de usura les pone topes a estas tasas, y el BCU los publica:
        <NuxtLink :to="usuraPath" class="tool-link">cómo funcionan y cuáles rigen</NuxtLink>. A
        quién le presta cada uno, si piden el Clearing limpio y la letra chica, en
        <NuxtLink :to="mejoresPath" class="tool-link">Mejores préstamos</NuxtLink>; montos, plazos y
        requisitos, en
        <NuxtLink :to="prestamosPath" class="tool-link">Préstamos en Uruguay</NuxtLink>.
      </p>
    </VCard>

    <template #content>
      <div class="tool-article-grid">
        <section>
          <h2>Sistema francés</h2>
          <p>
            La calculadora usa el <strong>sistema francés</strong>: cuota fija mensual durante todo
            el préstamo. Al principio pagás más intereses y menos capital, y la proporción se
            invierte con el tiempo.
          </p>
        </section>
        <section>
          <h2>TEA o tasa nominal</h2>
          <p>
            Los prestamistas en Uruguay publican la <strong>tasa efectiva anual (TEA)</strong>. Para
            pasarla a la tasa de cada mes no se divide entre 12: se saca la raíz duodécima de (1 +
            TEA). Si lo que tenés es una tasa nominal anual, elegila arriba y la calculadora la
            divide entre 12, que es lo que significa "nominal".
          </p>
        </section>
        <section>
          <h2>El IVA va aparte</h2>
          <p>
            Casi todos cobran el <strong>IVA sobre los intereses</strong> aparte de la TEA ("28 % +
            IVA"): con la llave de IVA prendida, cada cuota paga el {{ ivaPct }} % encima del
            interés de ese mes, como en la tabla de prestamistas.
          </p>
        </section>
      </div>
    </template>

    <template #disclaimer>
      Estimación por sistema francés. La tabla de prestamistas usa las tasas que cada uno publica,
      con la fecha indicada; no incluye seguros, comisiones ni gastos administrativos. Pedí siempre
      el costo financiero total a tu institución antes de tomar un préstamo.
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatNumber, siteTimeZone } from '~/utils/format'
import {
  compareLenders,
  monthlyRate,
  frenchInstallment,
  teaBandLabel,
  type LenderQuote,
} from '~/utils/loanSimulator'
import {
  LENDER_TIERLIST,
  LENDER_TIERLIST_READ_ON,
  SEGMENT_LABELS,
  mergeLenderFacts,
  type LenderEntity,
  type LoanTierSnapshot,
} from '~/utils/loanTierlist'
import { IVA_BASIC_RATE } from '~/utils/retireeLoans'

const localePath = useLocalePath()
const usuraPath = localePath('/ley-de-usura-uruguay')
const mejoresPath = localePath('/mejores-prestamos-uruguay')
const prestamosPath = localePath('/prestamos-uruguay')

const principal = ref(200000)
const ratePct = ref(30)
const months = ref(24)
// TEA por defecto: es lo que publican los prestamistas uruguayos, y es la tasa de la tabla de abajo.
const rateKind = ref<'tea' | 'nominal'>('tea')
const withIva = ref(false)
const rateKindItems = [
  { title: 'Efectiva anual (TEA)', value: 'tea' },
  { title: 'Nominal anual', value: 'nominal' },
]
const ivaPct = formatNumber(IVA_BASIC_RATE * 100, 0)

const r = computed(() =>
  frenchInstallment(
    principal.value || 0,
    monthlyRate(ratePct.value || 0, rateKind.value, withIva.value),
    months.value || 0
  )
)
const monthsCount = computed(() => Math.max(Math.floor(months.value || 0), 0))

// Las tasas del tablero de /mejores-prestamos-uruguay, con el parche semanal encima. La ruta
// devuelve null si falta la fila o Mongo no contesta, y entonces queda el catálogo semilla.
const { data: snapshot } = await useFetch<LoanTierSnapshot | null>('/api/loan-tiers', {
  key: 'loan-tiers',
  default: () => null,
})
const lenders = computed<LenderEntity[]>(() =>
  mergeLenderFacts(LENDER_TIERLIST, snapshot.value?.patches)
)
const comparison = computed(() =>
  compareLenders(lenders.value, principal.value || 0, months.value || 0)
)

function longDate(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('es-UY', {
        timeZone: siteTimeZone(iso),
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
}
/** La fecha de los datos: la del parche semanal si llegó, si no la del catálogo. */
/** De cuándo son las tasas: la fecha del parche semanal si llegó, si no la del catálogo. */
const dataDate = computed(() => {
  const asOf = snapshot.value?.asOf ? longDate(snapshot.value.asOf) : ''
  return asOf
    ? `reverificadas el ${asOf}`
    : `leídas en la página de cada prestamista en ${LENDER_TIERLIST_READ_ON}`
})
const dataDateText = computed(() => `Son las del tablero de Mejores préstamos, ${dataDate.value}.`)

const pesos = (v: number) => `$ ${formatNumber(Math.round(v || 0), 0)}`

/** "$ 9.800", "$ 9.400 – $ 12.100" o "hasta $ 10.300", según la banda publicada. */
function span(q: LenderQuote, field: 'cuota' | 'total'): string {
  const high = pesos(q.high[field])
  if (q.band.kind === 'tope' || !q.low) return `hasta ${high}`
  if (q.band.kind === 'unica') return high
  return `${pesos(q.low[field])} – ${high}`
}

/**
 * Las dos preguntas que trae Search Console ("simulador de préstamos", "calcular préstamo"),
 * contestadas con la misma tabla que dibuja la página. Ningún número se escribe a mano.
 */
const example = computed(() => compareLenders(lenders.value, 200_000, 24))
const faq = computed(() => {
  const qs = example.value.quotes
  const first = qs[0]
  const last = qs[qs.length - 1]
  const rows =
    first && last
      ? `La más barata de la tabla, contando el techo de lo que publica cada uno, es ${first.name}, con ${teaBandLabel(first.band, first.ivaOnInterest)}: ${span(first, 'cuota')} por mes y ${span(first, 'total')} en total. La más cara es ${last.name}, con ${teaBandLabel(last.band, last.ivaOnInterest)}: ${span(last, 'cuota')} por mes y ${span(last, 'total')} en total.`
      : ''
  return [
    {
      q: '¿Cuánto pago por un préstamo de $ 200.000 en 24 cuotas?',
      a: `Depende de quién te lo dé. ${rows} Las cuentas suman el IVA sobre los intereses cuando va aparte y no incluyen seguros ni comisiones. Tasas del tablero de Mejores préstamos, ${dataDate.value}.`,
    },
    {
      q: '¿Cómo se calcula la cuota de un préstamo?',
      a: 'Por el sistema francés, la cuota es fija y se obtiene con una fórmula que reparte capital e intereses a lo largo del plazo. La tasa de cada mes sale de la tasa efectiva anual (TEA) como la raíz duodécima de (1 + TEA), menos 1; si te dan una tasa nominal anual, se divide entre 12.',
    },
    {
      q: '¿La tasa que ingreso incluye todos los costos?',
      a: 'No necesariamente. La TEA publicada casi nunca incluye el IVA sobre los intereses, ni los seguros ni las comisiones. Para comparar préstamos, pedí el costo financiero total (que incorpora todos los cargos).',
    },
  ]
})
</script>

<style scoped>
/* El fondo y el borde del panel son los de .tool-info-box (ToolShell). Cada bloque de texto
   declara su propio margen superior (DESIGN.md, The Text Block Owns Its Top Margin Rule). */
.lenders-panel :where(h2, h3, p, ul) {
  margin-top: 0;
}

.lenders-title {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.4;
  margin-bottom: 8px;
}

.lenders-intro {
  font-size: 0.95rem;
  line-height: 1.6;
  max-width: 72ch;
  margin-bottom: 16px;
}

.lenders-table {
  background: transparent;
}

/* The Number Breathes Rule: los montos se comparan en columna. */
.lender-amount {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.lenders-subtitle {
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.4;
  margin-top: 16px;
  margin-bottom: 8px;
}

.lenders-list {
  font-size: 0.875rem;
  line-height: 1.6;
  padding-left: 16px;
  margin-bottom: 0;
}

.lenders-list li + li {
  margin-top: 4px;
}

.lenders-note {
  font-size: 0.875rem;
  line-height: 1.6;
  margin-bottom: 0;
}

.lenders-foot {
  font-size: 0.8rem;
  line-height: 1.6;
  margin-top: 16px;
  margin-bottom: 0;
  color: rgba(255, 255, 255, 0.7);
}

.lenders-foot + .lenders-foot {
  margin-top: 8px;
}

.v-theme--light .lenders-foot {
  color: rgba(0, 0, 0, 0.75);
}
</style>

<!-- Layout primitives shared from ToolShell (.tool-page namespace). -->
