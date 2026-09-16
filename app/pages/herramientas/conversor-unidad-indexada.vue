<template>
  <ToolShell
    slug="conversor-unidad-indexada"
    :faq="faq"
    :sources="sources"
    :seo-title="seoTitle"
    :seo-description="seoDescription"
  >
    <VCard class="pa-4 pa-sm-6">
      <div class="ui-today mb-5" data-testid="ui-today">
        <div class="text-overline text-grey">Valor de la UI hoy</div>
        <template v-if="live">
          <div class="text-h5 font-weight-bold">1 UI = {{ formatUYU(live.value, 4) }}</div>
          <div class="text-caption text-grey">
            Banco Central del Uruguay<template v-if="liveDay">, vigente el {{ liveDay }}</template>
          </div>
        </template>
        <div v-else class="text-body-2 text-grey">
          No pudimos leer el valor de hoy. Usamos una referencia ({{ formatUYU(reference, 4) }}):
          corregila con el valor vigente del BCU o el INE.
        </div>
      </div>

      <div class="text-overline text-grey mb-2">Sentido de la conversión</div>
      <VBtnToggle
        v-model="mode"
        color="primary"
        mandatory
        divided
        variant="outlined"
        class="seg-toggle mb-6"
      >
        <VBtn value="uiToPesos" class="seg-btn">
          <VIcon start>mdi-arrow-right</VIcon>
          UI → Pesos
        </VBtn>
        <VBtn value="pesosToUi" class="seg-btn">
          <VIcon start>mdi-arrow-left</VIcon>
          Pesos → UI
        </VBtn>
      </VBtnToggle>

      <VRow class="g-input" align="center">
        <VCol cols="12" sm="7">
          <VTextField
            v-model.number="amount"
            type="number"
            min="0"
            :label="mode === 'uiToPesos' ? 'Cantidad de UI' : 'Monto en pesos'"
            :prefix="mode === 'uiToPesos' ? 'UI' : '$'"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="5">
          <VTextField
            v-model.number="uiValue"
            type="number"
            min="0.0001"
            step="0.0001"
            label="Valor de la UI (BCU)"
            prefix="$"
            variant="outlined"
            density="comfortable"
            hide-details
            :hint="live ? 'Valor de hoy' : 'Valor de referencia'"
            persistent-hint
          />
        </VCol>
      </VRow>

      <VDivider class="my-6" />

      <div class="result-grid">
        <div class="result-box">
          <div class="text-overline text-grey">Resultado</div>
          <div class="text-h4 font-weight-bold text-primary">
            <template v-if="mode === 'uiToPesos'">{{ formatUYU(result) }}</template>
            <template v-else>{{ formatNumber(result, 2) }} UI</template>
          </div>
        </div>
      </div>
    </VCard>

    <VCard v-if="equivalences.length" class="pa-4 pa-sm-6 mt-4">
      <h2 class="text-h6 font-weight-bold mb-1">Cuánto son las UI en pesos uruguayos hoy</h2>
      <p class="text-body-2 text-grey mb-3">
        Con la UI a {{ formatUYU(live!.value, 4)
        }}<template v-if="liveDay"> ({{ liveDay }})</template>.
      </p>
      <VTable class="equiv-table" density="compact" data-testid="ui-equivalences">
        <thead>
          <tr>
            <th scope="col">Unidades indexadas</th>
            <th scope="col" class="text-right">Pesos uruguayos</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rowItem in equivalences" :key="rowItem.units">
            <td>{{ formatNumber(rowItem.units, 0) }} UI</td>
            <td class="text-right">
              {{ rowItem.units === 1 ? formatUYU(live!.value, 4) : formatUYU(rowItem.pesos) }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>

    <template #content>
      <h2>Qué es la Unidad Indexada</h2>
      <p>
        La <strong>Unidad Indexada (UI)</strong> es una unidad de valor que se ajusta diariamente
        según la inflación (IPC). Mantiene el poder de compra en el tiempo, por eso se usa en
        alquileres, créditos hipotecarios, ahorro y contratos de largo plazo.
      </p>
      <p>
        Convertir es directo: multiplicás la cantidad de UI por el <strong>valor del día</strong>.
        El conversor ya viene cargado con el valor que publica el Banco Central; si tu contrato fija
        otra fecha, cambiá el valor por el de ese día.
      </p>
      <p>
        ¿Querés ver cómo evolucionó? En el
        <NuxtLink :to="localePath('/indicadores/unidad-indexada')"
          >valor de la Unidad Indexada hoy</NuxtLink
        >
        está la serie mes a mes de los últimos doce meses.
      </p>
      <p>
        ¿Querés entenderla a fondo? Leé la guía
        <NuxtLink :to="localePath('/guias/unidad-indexada-explicada')"
          >Unidad Indexada explicada</NuxtLink
        >
        o la comparación entre
        <NuxtLink :to="localePath('/guias/ui-ur-bpc-diferencias')">UI, UR y BPC</NuxtLink>. Si estás
        sacando un préstamo en UI, mirá la
        <NuxtLink :to="localePath('/guias/credito-hipotecario-uruguay')"
          >comparativa de créditos hipotecarios</NuxtLink
        >.
      </p>
    </template>

    <template #disclaimer>
      El valor de la UI cambia todos los días y lo toma este conversor del Banco Central del
      Uruguay. Para un contrato, usá el valor de la fecha que fija el propio contrato.
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ExchangeRate } from '~/types/api'
import { round } from '~/utils/calculators'
import { formatNumber, formatUYU } from '~/utils/format'
import {
  EQUIVALENCE_AMOUNTS,
  dayLabelEs,
  equivalenceTable,
  indicatorFromSlug,
  liveIndicatorReading,
} from '~/utils/indicators'

const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()
const indicator = indicatorFromSlug('unidad-indexada')!
const reference = indicator.referenceValue

// Same read as /indicadores/unidad-indexada. Only the live value may reach the title, the
// description or the table: the reference is a fallback for the calculator, not a quote.
const { data: live } = await useAsyncData('conversor-ui-live', async () => {
  const result = await getProcessedExchangeData('')
  const rows = (result?.exchangeData ?? []) as ExchangeRate[]
  return liveIndicatorReading(rows, indicator)
})

const liveDay = computed(() => (live.value?.date ? dayLabelEs(live.value.date) : null))

const mode = ref<'uiToPesos' | 'pesosToUi'>('uiToPesos')
const amount = ref(1000)
const uiValue = ref(live.value?.value ?? reference)

const sources = [
  { label: 'INE — Unidad Indexada (valor diario oficial)', url: 'https://www.ine.gub.uy' },
  {
    label: 'BCU — Banco Central del Uruguay',
    url: 'https://www.bcu.gub.uy',
  },
]

const result = computed(() => {
  const v = uiValue.value || 0
  if (v <= 0) return 0
  return mode.value === 'uiToPesos'
    ? round((amount.value || 0) * v)
    : round((amount.value || 0) / v, 2)
})

const equivalences = computed(() =>
  live.value ? equivalenceTable(EQUIVALENCE_AMOUNTS['unidad-indexada'] ?? [], live.value.value) : []
)

const seoTitle = computed(() =>
  live.value
    ? `Conversor UI a pesos: 1 UI = ${formatUYU(live.value.value, 4)} hoy | Cambio Uruguay`
    : undefined
)

const seoDescription = computed(() => {
  if (!live.value) return undefined
  const thousand = formatUYU(Math.round(live.value.value * 1000 * 100) / 100)
  const when = liveDay.value ? ` (BCU, ${liveDay.value})` : ' (BCU)'
  return `La Unidad Indexada vale hoy ${formatUYU(live.value.value, 4)}${when}. 1.000 UI = ${thousand}. Convertí UI a pesos uruguayos y viceversa, con tabla de equivalencias.`
})

const faq = computed(() => [
  ...(live.value
    ? [
        {
          q: '¿Cuánto vale 1 UI hoy?',
          a: `1 Unidad Indexada vale ${formatUYU(live.value.value, 4)} según el Banco Central del Uruguay${liveDay.value ? `, valor vigente el ${liveDay.value}` : ''}. 1.000 UI equivalen a ${formatUYU(Math.round(live.value.value * 1000 * 100) / 100)}.`,
        },
      ]
    : []),
  {
    q: '¿Cómo convierto UI a pesos?',
    a: 'Multiplicás la cantidad de Unidades Indexadas por el valor de la UI del día, que publica el Banco Central del Uruguay. Por ejemplo, 1.000 UI a un valor de $6,50 equivalen a $6.500.',
  },
  {
    q: '¿Por qué la UI sube con el tiempo?',
    a: 'Porque su valor se ajusta por la inflación medida con el IPC. Así, una cantidad de UI conserva su poder de compra aunque suban los precios.',
  },
  {
    q: '¿En qué se diferencia de la Unidad Reajustable (UR)?',
    a: 'La UI ajusta por precios (IPC) y la UR por salarios (Índice Medio de Salarios). Por eso pueden evolucionar de forma distinta. La UR se usa habitualmente en alquileres y préstamos del BHU.',
  },
])
</script>

<style scoped>
.equiv-table {
  font-variant-numeric: tabular-nums;
}
</style>

<!-- Layout primitives shared from ToolShell (.tool-page namespace). -->
