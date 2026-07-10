<template>
  <ToolShell slug="costo-de-vida" :faq="faq">
    <VCard class="pa-4 pa-sm-6">
      <!-- Inputs -->
      <div class="mb-2 text-subtitle-2 font-weight-bold">Tu situación</div>
      <VRow class="mb-1">
        <VCol cols="12" md="6">
          <label class="cv-label">Situación de convivencia</label>
          <VBtnToggle
            v-model="situation"
            mandatory
            density="comfortable"
            color="primary"
            class="cv-toggle mt-1"
          >
            <VBtn value="solo">Solo/a</VBtn>
            <VBtn value="compartido">Compartido</VBtn>
            <VBtn value="pareja">En pareja</VBtn>
            <VBtn value="familia">Familia</VBtn>
          </VBtnToggle>
        </VCol>
        <VCol cols="6" md="3">
          <label class="cv-label">Ciudad</label>
          <VBtnToggle
            v-model="city"
            mandatory
            density="comfortable"
            color="primary"
            class="cv-toggle mt-1"
          >
            <VBtn value="montevideo">Montevideo</VBtn>
            <VBtn value="interior">Interior</VBtn>
          </VBtnToggle>
        </VCol>
        <VCol cols="6" md="3">
          <label class="cv-label">Vivienda</label>
          <VBtnToggle
            v-model="housing"
            mandatory
            density="comfortable"
            color="primary"
            class="cv-toggle mt-1"
          >
            <VBtn value="alquila">Alquilo</VBtn>
            <VBtn value="propia">Propia</VBtn>
          </VBtnToggle>
        </VCol>
      </VRow>

      <VRow class="align-end">
        <VCol cols="12" :md="situation === 'familia' ? 8 : 12">
          <label class="cv-label">
            Ingreso mensual líquido del hogar
            <span class="text-grey-lighten-1">(en la mano, sumando a los dos si son pareja)</span>
          </label>
          <VTextField
            v-model.number="netIncome"
            type="number"
            min="0"
            step="1000"
            prefix="$"
            variant="outlined"
            density="comfortable"
            hide-details
            class="mt-1"
          />
          <div class="d-flex flex-wrap ga-2 mt-2">
            <VChip
              v-for="q in quickIncomes"
              :key="q.value"
              size="small"
              variant="tonal"
              @click="netIncome = q.value"
            >
              {{ q.label }}
            </VChip>
          </div>
        </VCol>
        <VCol v-if="situation === 'familia'" cols="12" md="4">
          <label class="cv-label">Hijos a cargo</label>
          <VTextField
            v-model.number="children"
            type="number"
            min="0"
            max="8"
            variant="outlined"
            density="comfortable"
            hide-details
            class="mt-1"
          />
        </VCol>
      </VRow>

      <VDivider class="my-6" />

      <!-- Verdict -->
      <div class="cv-verdict pa-4 mb-5" :class="`cv-${result.verdict}`">
        <div class="d-flex align-center ga-3 mb-1">
          <span class="cv-emoji">{{ meta.emoji }}</span>
          <div>
            <div class="text-caption text-uppercase cv-verdict-eyebrow">Veredicto</div>
            <div class="text-h6 font-weight-bold">{{ meta.label }}</div>
          </div>
        </div>
        <p class="text-body-2 mb-0 cv-verdict-msg">{{ meta.message }}</p>
      </div>

      <!-- Distribution bar -->
      <div class="mb-2 d-flex justify-space-between align-center">
        <span class="text-subtitle-2 font-weight-bold">Cómo se reparte tu ingreso</span>
        <span class="text-caption text-grey-lighten-1">
          Ingreso: <strong>{{ formatUYU(result.income) }}</strong>
        </span>
      </div>
      <div class="cv-dist mb-1">
        <div class="cv-dist-seg cv-seg-ess" :style="{ width: segPct(result.essentials) + '%' }" />
        <div
          v-if="result.savingsSuggested > 0"
          class="cv-dist-seg cv-seg-save"
          :style="{ width: segPct(result.savingsSuggested) + '%' }"
        />
        <div
          v-if="result.discretionary > 0"
          class="cv-dist-seg cv-seg-disc"
          :style="{ width: segPct(result.discretionary) + '%' }"
        />
        <div
          v-if="result.deficit > 0"
          class="cv-dist-seg cv-seg-deficit"
          :style="{ width: deficitPct + '%' }"
        />
      </div>
      <div class="d-flex flex-wrap ga-4 mb-5 cv-legend">
        <span v-for="(l, i) in legend" :key="i" :class="{ 'cv-deficit-label': l.danger }">
          <i class="cv-dot" :class="l.cls" />
          {{ l.label }}
        </span>
      </div>

      <!-- Essential breakdown -->
      <div class="text-subtitle-2 font-weight-bold mb-3">Gastos esenciales estimados</div>
      <div class="cv-lines">
        <div v-for="line in result.essentialLines" :key="line.key" class="cv-line">
          <span class="cv-line-label">{{ line.label }}</span>
          <div class="cv-line-track">
            <div class="cv-line-fill" :style="{ width: linePct(line.amount) + '%' }" />
          </div>
          <span class="cv-line-amount">{{ formatUYU(line.amount) }}</span>
        </div>
        <div class="cv-line cv-line-total">
          <span class="cv-line-label">Total esencial</span>
          <div class="cv-line-track" />
          <span class="cv-line-amount">{{ formatUYU(result.essentials) }}</span>
        </div>
      </div>

      <!-- Reality checks -->
      <VAlert
        :type="
          result.verdict === 'noAlcanza'
            ? 'error'
            : result.verdict === 'ajustado'
              ? 'warning'
              : 'info'
        "
        variant="tonal"
        density="comfortable"
        class="mt-5"
        icon="mdi-lightbulb-on-outline"
      >
        <ul class="cv-tips">
          <li v-for="(t, i) in tips" :key="i">{{ t }}</li>
        </ul>
      </VAlert>

      <div class="d-flex align-center flex-wrap ga-2 mt-3">
        <VChip v-if="updatedLabel" size="x-small" color="success" variant="tonal">
          <VIcon start size="12">mdi-autorenew</VIcon>
          Precios actualizados el {{ updatedLabel }}
        </VChip>
        <VChip v-else size="x-small" variant="tonal">
          <VIcon start size="12">mdi-check-decagram-outline</VIcon>
          Valores de referencia verificados
        </VChip>
      </div>
      <p class="text-caption text-grey-lighten-1 mt-2 mb-0">
        Referencia: salario mínimo nacional {{ formatUYU(salaryRef.minimoNacional) }} y salario
        mediano líquido aproximado {{ formatUYU(salaryRef.medianaLiquidoAprox) }} (con
        incertidumbre). Los montos son estimaciones típicas con rango real —alquiler, boleto y
        salario mínimo se actualizan solos a diario; tu caso puede variar bastante.
      </p>
    </VCard>

    <template #content>
      <h2>Cómo leer este presupuesto</h2>
      <p>
        Esta calculadora no reparte tu sueldo con porcentajes abstractos: estima de abajo hacia
        arriba <strong>cuánto cuesta realmente</strong> vivir en tu situación (alquiler, comida,
        servicios, transporte, salud y varios) y lo compara con tu ingreso. Así el veredicto te dice
        si el escenario que imaginás es <strong>financieramente viable</strong>, en vez de venderte
        una expectativa que no cierra.
      </p>
      <h2>La regla del 50/30/20 (adaptada)</h2>
      <p>
        Una guía simple: <strong>50%</strong> a necesidades, <strong>30%</strong> a gustos y
        <strong>20%</strong> a ahorro. En Montevideo, con alquileres altos, muchos arrancan más
        cerca de 60/20/20 y está bien: lo importante es que el ahorro sea una categoría fija, no lo
        que sobra. Automatizalo apenas cobrás.
      </p>
      <h2>Bajá el número si no cierra</h2>
      <p>
        Vivir solo alquilando es lo más caro. Compartir apartamento, elegir un barrio más accesible
        o el interior, o esperar a tener un colchón para el arranque (garantía + primer mes +
        comisión + muebles suelen ser 2 a 3 sueldos juntos) son formas honestas de que la cuenta
        cierre sin empezar endeudado.
      </p>
    </template>

    <template #disclaimer>
      Estimación orientativa con valores típicos 2026 (INE, MTSS, UTE/OSE/Antel, STM, portales
      inmobiliarios). Los precios reales varían mucho por barrio, consumo y momento. No es
      asesoramiento financiero; usala como punto de partida, no como presupuesto exacto.
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatUYU } from '~/utils/format'
import {
  estimateBudget,
  realityChecks,
  VERDICT_META,
  SALARY_REFERENCE,
  COST_MODEL,
  type City,
  type Situation,
  type Housing,
} from '~/utils/costOfLiving'

const situation = ref<Situation>('solo')
const city = ref<City>('montevideo')
const housing = ref<Housing>('alquila')
const netIncome = ref(50000)
const children = ref(1)

// Live figures (salario mínimo, boleto STM, alquileres) refreshed daily via Gemini,
// with the verified static baseline as fallback so the tool always works.
interface LiveCostsResp {
  model: typeof COST_MODEL
  salary: { minimoNacional: number; medianaLiquidoAprox: number }
  asOf: string | null
  updated: string[]
}
const { data: live } = await useFetch<LiveCostsResp>('/api/cost-of-living', {
  key: 'cost-of-living',
  default: () => ({
    model: COST_MODEL,
    salary: SALARY_REFERENCE,
    asOf: null,
    updated: [] as string[],
  }),
})
const model = computed(() => live.value?.model ?? COST_MODEL)
const salaryRef = computed(() => live.value?.salary ?? SALARY_REFERENCE)
const updatedLabel = computed(() => {
  const iso = live.value?.asOf
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-UY', { day: 'numeric', month: 'long' })
})

const quickIncomes = computed(() => [
  {
    label: `Mínimo ${Math.round(salaryRef.value.minimoNacional / 1000)}k`,
    value: salaryRef.value.minimoNacional,
  },
  { label: '$40k', value: 40000 },
  {
    label: `Mediana ${Math.round(salaryRef.value.medianaLiquidoAprox / 1000)}k`,
    value: salaryRef.value.medianaLiquidoAprox,
  },
  { label: '$60k', value: 60000 },
  { label: '$90k', value: 90000 },
])

const inputs = computed(() => ({
  netIncome: netIncome.value || 0,
  situation: situation.value,
  city: city.value,
  housing: housing.value,
  children: children.value || 0,
}))
const result = computed(() => estimateBudget(inputs.value, model.value))
const meta = computed(() => VERDICT_META[result.value.verdict])
const tips = computed(() => realityChecks(result.value, inputs.value))

const legend = computed(() => {
  const r = result.value
  const items = [
    { cls: 'cv-seg-ess', label: `Esenciales ${formatUYU(r.essentials)}`, danger: false },
  ]
  if (r.savingsSuggested > 0)
    items.push({
      cls: 'cv-seg-save',
      label: `Ahorro sugerido ${formatUYU(r.savingsSuggested)}`,
      danger: false,
    })
  if (r.discretionary > 0)
    items.push({
      cls: 'cv-seg-disc',
      label: `Libre para gustos ${formatUYU(r.discretionary)}`,
      danger: false,
    })
  if (r.deficit > 0)
    items.push({ cls: 'cv-seg-deficit', label: `Faltan ${formatUYU(r.deficit)}`, danger: true })
  return items
})

// Segment widths as % of income (or of essentials when there is a deficit).
const denom = computed(() => Math.max(result.value.income, result.value.essentials, 1))
const segPct = (n: number) => Math.max(0, Math.min(100, (n / denom.value) * 100))
const deficitPct = computed(() => segPct(result.value.deficit))
const maxLine = computed(() => Math.max(...result.value.essentialLines.map(l => l.amount), 1))
const linePct = (n: number) => Math.max(2, (n / maxLine.value) * 100)

const faq = [
  {
    q: '¿Cuánto sueldo necesito para vivir solo en Montevideo?',
    a: 'De forma realista, entre $45.000 y $70.000 líquidos por mes según el barrio y el estilo de vida. Con un monoambiente o 1 dormitorio en barrios accesibles la cuenta cierra cerca de $45.000-$51.000; en Pocitos o Punta Carretas sube a $60.000-$70.000. Con el salario mínimo es inviable vivir solo, y compartir apartamento baja mucho el número.',
  },
  {
    q: '¿Qué gastos incluye la estimación?',
    a: 'Alquiler (según ciudad y tipo de vivienda), alimentación, servicios (UTE, OSE, internet, celular y una parte de gastos comunes), transporte público, copagos de salud e higiene/limpieza/varios. No incluye el costo de arranque (garantía, depósito, muebles) ni gastos de ocio, que van en la parte "libre para gustos".',
  },
  {
    q: '¿De dónde salen los precios?',
    a: 'De valores típicos 2026 de fuentes públicas: canastas del INE, portales inmobiliarios (InfoCasas), tarifas de UTE, OSE, Antel y del boleto STM, y el salario mínimo del MTSS. Son estimaciones con rango real, no cotizaciones; tu caso puede variar.',
  },
]
</script>

<style scoped>
.cv-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.75);
  display: block;
}
.cv-toggle {
  flex-wrap: wrap;
  height: auto;
}
.cv-toggle :deep(.v-btn) {
  height: 40px;
}

.cv-verdict {
  border-radius: 14px;
  border: 2px solid transparent;
}
.cv-verdict-eyebrow {
  letter-spacing: 0.08em;
  opacity: 0.6;
}
.cv-verdict-msg {
  line-height: 1.55;
}
.cv-emoji {
  font-size: 2rem;
  line-height: 1;
}
.cv-noAlcanza {
  background: rgba(220, 38, 38, 0.1);
  border-color: rgba(220, 38, 38, 0.4);
}
.cv-ajustado {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.4);
}
.cv-justo {
  background: rgba(217, 119, 6, 0.08);
  border-color: rgba(217, 119, 6, 0.35);
}
.cv-comodo {
  background: rgba(33, 150, 243, 0.1);
  border-color: rgba(33, 150, 243, 0.35);
}
.cv-holgado {
  background: rgba(22, 163, 74, 0.12);
  border-color: rgba(22, 163, 74, 0.4);
}

/* Distribution bar */
.cv-dist {
  display: flex;
  height: 26px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.cv-dist-seg {
  height: 100%;
  transition: width 0.35s ease;
}
.cv-seg-ess {
  background: #6366f1;
}
.cv-seg-save {
  background: #16a34a;
}
.cv-seg-disc {
  background: #0ea5e9;
}
.cv-seg-deficit {
  background: repeating-linear-gradient(45deg, #dc2626, #dc2626 6px, #b91c1c 6px, #b91c1c 12px);
}
.cv-legend {
  font-size: 0.82rem;
}
.cv-legend span {
  display: inline-flex;
  align-items: center;
}
.cv-dot {
  width: 11px;
  height: 11px;
  border-radius: 3px;
  display: inline-block;
  margin-right: 6px;
}
.cv-deficit-label {
  font-weight: 700;
  color: #ef4444;
}

/* Essential lines */
.cv-lines {
  display: grid;
  gap: 8px;
}
.cv-line {
  display: grid;
  grid-template-columns: 170px 1fr 96px;
  align-items: center;
  gap: 10px;
}
@media (max-width: 599px) {
  .cv-line {
    grid-template-columns: 120px 1fr 84px;
    gap: 8px;
  }
}
.cv-line-label {
  font-size: 0.82rem;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
.cv-line-track {
  height: 10px;
  border-radius: 6px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  overflow: hidden;
}
.cv-line-fill {
  height: 100%;
  border-radius: 6px;
  background: #6366f1;
  transition: width 0.35s ease;
}
.cv-line-amount {
  font-size: 0.85rem;
  font-weight: 700;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.cv-line-total {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  padding-top: 8px;
  margin-top: 2px;
}
.cv-line-total .cv-line-label,
.cv-line-total .cv-line-amount {
  font-weight: 800;
}

.cv-tips {
  margin: 0;
  padding-left: 1.1rem;
}
.cv-tips li {
  margin-bottom: 0.35rem;
  font-size: 0.88rem;
  line-height: 1.5;
}
.cv-tips li:last-child {
  margin-bottom: 0;
}
</style>
