<template>
  <ToolShell slug="calculadora-irpf" :faq="faq" :sources="sources">
    <VCard class="pa-4 pa-sm-6">
      <VRow class="g-input">
        <VCol cols="12" sm="7">
          <VTextField
            v-model.number="salary"
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
            v-model.number="bpc"
            type="number"
            min="1"
            label="Valor de la BPC"
            prefix="$"
            variant="outlined"
            density="comfortable"
            hide-details
            hint="Referencia anual"
            persistent-hint
          />
        </VCol>
      </VRow>

      <VDivider class="my-6" />

      <div class="result-grid">
        <div class="result-box">
          <div class="text-overline text-grey">IRPF mensual estimado</div>
          <div class="text-h5 font-weight-bold text-primary">{{ formatUYU(r.total) }}</div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Tasa efectiva</div>
          <div class="text-h5 font-weight-bold">{{ r.effectiveRate }}%</div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Neto aproximado (solo IRPF)</div>
          <div class="text-h5 font-weight-bold text-success">{{ formatUYU(netAfterIrpf) }}</div>
        </div>
      </div>

      <VTable density="comfortable" class="mt-4 breakdown-table">
        <thead>
          <tr>
            <th>Franja</th>
            <th class="text-right">Tasa</th>
            <th class="text-right">Gravado</th>
            <th class="text-right">Impuesto</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, i) in r.detail" :key="i">
            <td>{{ formatUYU(d.from, 0) }} – {{ d.to === null ? '∞' : formatUYU(d.to, 0) }}</td>
            <td class="text-right">{{ d.rate }}%</td>
            <td class="text-right">{{ formatUYU(d.taxable, 0) }}</td>
            <td class="text-right font-weight-medium">{{ formatUYU(d.tax) }}</td>
          </tr>
        </tbody>
      </VTable>

      <VAlert type="info" variant="tonal" density="comfortable" class="mt-4">
        Esta calculadora es de <strong>IRPF Categoría II</strong> (rentas del trabajo). Si lo que
        querés saber es cuánto pagás por un plazo fijo, un dividendo, un alquiler o tu cuenta en un
        bróker del exterior, eso es <strong>Categoría I</strong>:
        <NuxtLink :to="localePath('/herramientas/calculadora-impuestos-inversiones')">
          calculadora de impuestos sobre inversiones
        </NuxtLink>
        .
      </VAlert>
    </VCard>

    <template #content>
      <h2>IRPF sobre el sueldo</h2>
      <p>
        El IRPF de las rentas del trabajo se calcula <strong>por franjas</strong>: cada tramo del
        sueldo paga su propia tasa, de 0% a 36%, de forma progresiva. Las franjas se expresan en
        múltiplos de <strong>BPC</strong>, que se actualiza cada año.
      </p>
      <p>
        Esta calculadora estima el impuesto sobre el <strong>sueldo nominal</strong>. El IRPF real
        considera además <strong>deducciones</strong> (hijos, aportes, etc.) que generan un crédito
        y reducen lo que pagás, por lo que el resultado es una referencia.
      </p>
      <VAlert type="info" variant="tonal" density="comfortable" class="mt-3">
        ¿Querés saber cuánto cobrás <strong>en mano</strong>? La
        <NuxtLink :to="localePath('/herramientas/calculadora-sueldo-liquido')">
          calculadora de sueldo líquido
        </NuxtLink>
        sí aplica las deducciones y te descuenta también BPS, FONASA y FRL.
      </VAlert>
    </template>

    <template #disclaimer>
      Estimación de referencia sobre el nominal, sin deducciones. El cálculo oficial considera
      deducciones y topes que pueden reducir el impuesto. Valores 2026 con BPC de $6.864 (mínimo no
      imponible de 7 BPC = $48.048/mes). Consultá la DGI o tu contador para tu caso concreto.
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { irpfBracketsUyu, progressiveTax, URUGUAY } from '~/utils/calculators'
import { formatUYU } from '~/utils/format'

const localePath = useLocalePath()
const salary = ref(80000)
const bpc = ref(URUGUAY.bpc)

const sources = [
  { label: 'DGI — IRPF (rentas del trabajo)', url: 'https://www.dgi.gub.uy' },
  { label: 'BPS — Escalas y valores IRPF 2026', url: 'https://www.bps.gub.uy' },
]

const r = computed(() =>
  progressiveTax(salary.value || 0, irpfBracketsUyu(bpc.value || URUGUAY.bpc))
)
const netAfterIrpf = computed(() => Math.max((salary.value || 0) - r.value.total, 0))

const faq = [
  {
    q: '¿Cómo se calcula el IRPF en Uruguay?',
    a: 'Se aplica un esquema progresivo por franjas: cada tramo del ingreso mensual paga su propia tasa (de 0% a 36%). Solo la porción del sueldo que cae dentro de cada franja paga la tasa de ese tramo. Las franjas se definen en múltiplos de BPC.',
  },
  {
    q: '¿Qué es la BPC?',
    a: 'La Base de Prestaciones y Contribuciones es una unidad de referencia que se actualiza cada año y se usa para expresar montos de impuestos y prestaciones, incluidas las franjas del IRPF.',
  },
  {
    q: '¿Por qué el resultado es solo una referencia?',
    a: 'Porque el IRPF real considera deducciones (hijos a cargo, aportes jubilatorios, FONASA, etc.) que generan un crédito y reducen el impuesto. Esta calculadora estima sobre el nominal sin esas deducciones.',
  },
]
</script>

<!-- Layout primitives shared from ToolShell (.tool-page namespace). -->
