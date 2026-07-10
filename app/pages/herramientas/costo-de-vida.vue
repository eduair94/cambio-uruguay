<template>
  <ToolShell slug="costo-de-vida" :faq="faq">
    <VCard class="pa-4 pa-sm-6">
      <!-- ── Situación ── -->
      <div class="cv-section-title">Tu situación</div>
      <VRow class="mb-1">
        <VCol cols="12" md="6">
          <label class="cv-label">Convivencia</label>
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
      <VRow>
        <VCol v-if="city === 'montevideo' && housing === 'alquila'" cols="12" md="8">
          <VSelect
            v-model="zone"
            :items="zoneItems"
            label="Zona de Montevideo"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol v-if="situation === 'familia'" cols="12" md="4">
          <VTextField
            v-model.number="children"
            type="number"
            min="0"
            max="8"
            label="Hijos a cargo"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
      </VRow>

      <!-- ── Estilo de vida ── -->
      <div class="cv-section-title mt-5">Tu estilo de vida</div>
      <VRow>
        <VCol cols="12" md="5">
          <VSelect
            v-model="transport"
            :items="transportItems"
            label="Transporte"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="7" md="4">
          <label class="cv-label">Estilo de gasto</label>
          <VBtnToggle
            v-model="lifestyle"
            mandatory
            density="comfortable"
            color="primary"
            class="cv-toggle mt-1"
          >
            <VBtn value="austero">Austero</VBtn>
            <VBtn value="moderado">Moderado</VBtn>
            <VBtn value="comodo">Cómodo</VBtn>
          </VBtnToggle>
        </VCol>
        <VCol cols="12" sm="5" md="3">
          <label class="cv-label">Salud</label>
          <VBtnToggle
            v-model="health"
            mandatory
            density="comfortable"
            color="primary"
            class="cv-toggle mt-1"
          >
            <VBtn value="fonasa">FONASA</VBtn>
            <VBtn value="particular">Particular</VBtn>
          </VBtnToggle>
        </VCol>
      </VRow>

      <!-- ── Ingreso ── -->
      <div class="cv-section-title mt-5">Tu ingreso</div>
      <VRow class="align-center">
        <VCol cols="12" sm="4" md="3">
          <label class="cv-label">Moneda</label>
          <VBtnToggle
            v-model="currency"
            mandatory
            density="comfortable"
            color="primary"
            class="cv-toggle mt-1"
          >
            <VBtn value="UYU">Pesos</VBtn>
            <VBtn value="USD">Dólares</VBtn>
          </VBtnToggle>
        </VCol>
        <VCol cols="12" sm="8" md="9">
          <label class="cv-label">
            Ingreso mensual líquido del hogar
            <span class="text-grey-lighten-1">(en la mano, sumando a los dos si son pareja)</span>
          </label>
          <VTextField
            v-model.number="income"
            type="number"
            min="0"
            :step="currency === 'USD' ? 50 : 1000"
            :prefix="currency === 'USD' ? 'US$' : '$'"
            variant="outlined"
            density="comfortable"
            hide-details
            class="mt-1"
          />
          <div class="d-flex flex-wrap align-center ga-2 mt-2">
            <VChip
              v-for="q in quickIncomes"
              :key="q.label"
              size="small"
              variant="tonal"
              @click="income = q.value"
            >
              {{ q.label }}
            </VChip>
            <span
              v-if="currency === 'USD' && usdRate"
              class="text-caption text-grey-lighten-1 ml-1"
            >
              ≈ {{ formatUYU(incomeUYU) }} · dólar a {{ formatUYU(usdRate) }}
            </span>
          </div>
        </VCol>
      </VRow>

      <VDivider class="my-6" />

      <!-- Verdict -->
      <div class="cv-verdict pa-4 mb-4" :class="`cv-${result.verdict}`">
        <div class="d-flex align-center ga-3 mb-1">
          <span class="cv-emoji">{{ meta.emoji }}</span>
          <div>
            <div class="text-caption text-uppercase cv-verdict-eyebrow">Veredicto</div>
            <div class="text-h6 font-weight-bold">{{ meta.label }}</div>
          </div>
        </div>
        <p class="text-body-2 mb-0 cv-verdict-msg">{{ meta.message }}</p>
      </div>

      <!-- Savings highlight -->
      <div
        class="cv-savings pa-4 mb-5"
        :class="result.deficit > 0 ? 'cv-savings-bad' : 'cv-savings-good'"
      >
        <template v-if="result.deficit > 0">
          <div class="cv-savings-eyebrow">Ahorro posible</div>
          <div class="cv-savings-amount cv-savings-neg">−{{ formatUYU(result.deficit) }}/mes</div>
          <p class="text-body-2 mb-0">
            Con este escenario no llegás a fin de mes: primero hay que cerrar ese bache antes de
            pensar en ahorrar. Probá bajar el alquiler, el transporte o el estilo de gasto.
          </p>
        </template>
        <template v-else>
          <div class="cv-savings-eyebrow">Podés ahorrar por mes</div>
          <div class="d-flex align-end flex-wrap ga-3">
            <div class="cv-savings-amount">{{ formatUYU(result.savingsMax) }}</div>
            <div v-if="usdRate && result.savingsMax > 0" class="cv-savings-usd">
              ≈ US$ {{ toUsd(result.savingsMax) }}
            </div>
          </div>
          <p class="text-body-2 mb-0">
            Eso es lo máximo si no gastás nada en gustos. Un objetivo sano y sostenible es apartar
            <strong>{{ formatUYU(result.savingsSuggested) }}/mes</strong> (~{{
              formatUYU(result.savingsMax * 12)
            }}/año como techo) apenas cobrás, y usar el resto para vivir.
          </p>
        </template>
      </div>

      <!-- Distribution bar -->
      <div class="mb-2 d-flex justify-space-between align-center">
        <span class="text-subtitle-2 font-weight-bold">Cómo se reparte tu ingreso</span>
        <span class="text-caption text-grey-lighten-1">
          Ingreso: <strong>{{ formatUYU(result.income) }}</strong>
          <template v-if="usdRate"> · US$ {{ toUsd(result.income) }}</template>
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
        class="mt-5 cv-reality"
        icon="mdi-lightbulb-on-outline"
      >
        <ul class="cv-tips">
          <li v-for="(t, i) in tips" :key="i">{{ t }}</li>
        </ul>
      </VAlert>

      <!-- CTA to the rent finder -->
      <VBtn
        v-if="housing === 'alquila'"
        :to="localePath('/alquilar-en-uruguay')"
        variant="tonal"
        color="primary"
        class="mt-4"
        block
      >
        <VIcon start>mdi-home-search-outline</VIcon>
        Guía para encontrar y alquilar (garantías, zonas, tips)
      </VBtn>

      <div class="d-flex align-center flex-wrap ga-2 mt-4">
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
        mediano líquido aproximado {{ formatUYU(salaryRef.medianaLiquidoAprox) }}. Los montos son
        estimaciones típicas con rango real —alquiler, boleto, salario mínimo y el dólar se
        actualizan solos; tu caso puede variar bastante.
      </p>
    </VCard>

    <template #content>
      <h2>Contempla tu caso, no un promedio</h2>
      <p>
        No hay un solo "cuánto se necesita para vivir": cambia enormemente según dónde vivas, cómo
        te movés y tu estilo de gasto. Por eso podés ajustar la <strong>zona</strong> de Montevideo,
        el <strong>transporte</strong> (a pie, bondi o auto), el <strong>estilo</strong> (austero,
        moderado o cómodo) y la <strong>salud</strong>. Mucha gente vive con menos porque comparte,
        camina y elige una zona accesible; el buscador lo refleja.
      </p>
      <h2>¿Cobrás en dólares?</h2>
      <p>
        Elegí "Dólares" y la herramienta convierte tu ingreso a pesos con la
        <strong>cotización en vivo</strong> del sitio (el mejor precio al que las casas te compran
        los dólares) para armar el presupuesto, y te muestra los equivalentes en USD.
      </p>
      <h2>El ahorro va primero</h2>
      <p>
        El resultado te dice cuánto podés apartar por mes. La regla de oro: pagate a vos primero
        —automatizá el ahorro apenas cobrás— y viví con lo que queda, no al revés.
      </p>
    </template>

    <template #disclaimer>
      Estimación orientativa con valores típicos 2026 (INE, MTSS, UTE/OSE/Antel, STM, portales
      inmobiliarios) y la cotización en vivo del sitio. Los precios reales varían mucho por zona,
      consumo y momento. No es asesoramiento financiero.
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
  ZONE_LABELS,
  TRANSPORT_LABELS,
  type City,
  type Situation,
  type Housing,
  type MvdZone,
  type TransportMode,
  type Lifestyle,
  type HealthMode,
} from '~/utils/costOfLiving'

const localePath = useLocalePath()

const situation = ref<Situation>('solo')
const city = ref<City>('montevideo')
const housing = ref<Housing>('alquila')
const zone = ref<MvdZone>('intermedio')
const transport = ref<TransportMode>('publico_diario')
const lifestyle = ref<Lifestyle>('moderado')
const health = ref<HealthMode>('fonasa')
const children = ref(1)
const currency = ref<'UYU' | 'USD'>('UYU')
const income = ref(60000)

const zoneItems = (Object.keys(ZONE_LABELS) as MvdZone[]).map(v => ({
  title: ZONE_LABELS[v],
  value: v,
}))
const transportItems = (Object.keys(TRANSPORT_LABELS) as TransportMode[]).map(v => ({
  title: TRANSPORT_LABELS[v],
  value: v,
}))

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
// Deep-merge the live figures over the baseline so a stale/older-shape stored
// model (e.g. one saved before new fields existed) can never drop a required key.
const model = computed(() => {
  const m = live.value?.model
  if (!m) return COST_MODEL
  return {
    ...COST_MODEL,
    ...m,
    rentMontevideo: { ...COST_MODEL.rentMontevideo, ...(m.rentMontevideo ?? {}) },
    zoneMultiplier: { ...COST_MODEL.zoneMultiplier, ...(m.zoneMultiplier ?? {}) },
    lifestyleFood: { ...COST_MODEL.lifestyleFood, ...(m.lifestyleFood ?? {}) },
    lifestyleMisc: { ...COST_MODEL.lifestyleMisc, ...(m.lifestyleMisc ?? {}) },
  }
})
const salaryRef = computed(() => live.value?.salary ?? SALARY_REFERENCE)
const updatedLabel = computed(() => {
  const iso = live.value?.asOf
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-UY', { day: 'numeric', month: 'long' })
})

// Live USD rate from the site's exchange infrastructure (best price to sell your dollars).
const { bestBuy } = useExchangeRates()
const usdRate = computed(() => bestBuy('USD'))
const incomeUYU = computed(() =>
  currency.value === 'USD' && usdRate.value
    ? Math.round((income.value || 0) * usdRate.value)
    : income.value || 0
)
const toUsd = (uyu: number) =>
  usdRate.value ? Math.round(uyu / usdRate.value).toLocaleString('es-UY') : ''

const quickIncomes = computed(() => {
  if (currency.value === 'USD') {
    return [500, 1000, 1500, 2500, 4000].map(v => ({
      label: `US$${v.toLocaleString('es-UY')}`,
      value: v,
    }))
  }
  return [
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
  ]
})

const inputs = computed(() => ({
  netIncome: incomeUYU.value,
  situation: situation.value,
  city: city.value,
  housing: housing.value,
  children: children.value || 0,
  zone: zone.value,
  transport: transport.value,
  lifestyle: lifestyle.value,
  health: health.value,
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

const denom = computed(() => Math.max(result.value.income, result.value.essentials, 1))
const segPct = (n: number) => Math.max(0, Math.min(100, (n / denom.value) * 100))
const deficitPct = computed(() => segPct(result.value.deficit))
const maxLine = computed(() => Math.max(...result.value.essentialLines.map(l => l.amount), 1))
const linePct = (n: number) => Math.max(2, (n / maxLine.value) * 100)

const faq = [
  {
    q: '¿Cuánto sueldo necesito para vivir solo en Montevideo?',
    a: 'Depende muchísimo de la zona, el transporte y el estilo de vida. Un monoambiente en una zona económica, moviéndote en bondi y con un estilo austero puede cerrar cerca de $40.000-$48.000; en Pocitos o Carrasco con auto y estilo cómodo trepa por encima de $70.000. Compartir apartamento baja mucho el número. Por eso el buscador te deja ajustar cada variable en vez de darte un promedio.',
  },
  {
    q: '¿Puedo usarlo si cobro en dólares?',
    a: 'Sí. Elegí "Dólares" como moneda del ingreso y la herramienta lo convierte a pesos con la cotización en vivo del sitio (el mejor precio al que las casas de cambio te compran los dólares) para armar el presupuesto, y te muestra los equivalentes en USD.',
  },
  {
    q: '¿Qué gastos incluye la estimación?',
    a: 'Alquiler (según zona y tipo de vivienda), alimentación, servicios (UTE, OSE, internet, celular y parte de gastos comunes), transporte según cómo te movés, salud (copagos FONASA o cuota particular) e higiene/varios. No incluye el costo de arranque de una mudanza (garantía, depósito, muebles) ni gastos de ocio, que van en "libre para gustos".',
  },
]
</script>

<style scoped>
.cv-section-title {
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 8px;
}
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

/* Savings highlight */
.cv-savings {
  border-radius: 14px;
  border: 1px solid transparent;
}
.cv-savings-good {
  background: rgba(22, 163, 74, 0.1);
  border-color: rgba(22, 163, 74, 0.3);
}
.cv-savings-bad {
  background: rgba(148, 163, 184, 0.1);
  border-color: rgba(148, 163, 184, 0.3);
}
.cv-savings-eyebrow {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.7;
  margin-bottom: 2px;
}
.cv-savings-amount {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
  color: #16a34a;
  margin-bottom: 6px;
}
.cv-savings-neg {
  color: #ef4444;
}
.cv-savings-usd {
  font-size: 1rem;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.6);
  padding-bottom: 8px;
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
  grid-template-columns: 190px 1fr 96px;
  align-items: center;
  gap: 10px;
}
@media (max-width: 599px) {
  .cv-line {
    grid-template-columns: 130px 1fr 84px;
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
/* Keep the reality-check text readable on the tinted alert in both themes
   (Vuetify's tonal variant otherwise tints the text with the type colour,
   which is low-contrast on the dark background). */
.cv-reality :deep(.v-alert__content),
.cv-reality .cv-tips li {
  color: rgba(var(--v-theme-on-surface), 0.92);
}
</style>
