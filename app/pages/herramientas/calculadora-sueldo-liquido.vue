<template>
  <ToolShell slug="calculadora-sueldo-liquido" :faq="faq" :sources="sources">
    <VCard class="pa-4 pa-sm-6">
      <!-- Mode -->
      <VBtnToggle v-model="mode" mandatory density="comfortable" class="mb-5 mode-toggle">
        <VBtn value="nominal" size="small">
          <VIcon start size="small">mdi-arrow-down</VIcon>
          Sé mi nominal
        </VBtn>
        <VBtn value="liquido" size="small">
          <VIcon start size="small">mdi-arrow-up</VIcon>
          Sé mi líquido
        </VBtn>
      </VBtnToggle>

      <VRow class="g-input">
        <VCol cols="12" sm="6">
          <VTextField
            v-if="mode === 'nominal'"
            v-model.number="nominalInput"
            type="number"
            min="0"
            label="Sueldo nominal mensual"
            prefix="$"
            variant="outlined"
            density="comfortable"
            hint="El de antes de descuentos (el que figura en el contrato)"
            persistent-hint
          />
          <VTextField
            v-else
            v-model.number="liquidoInput"
            type="number"
            min="0"
            label="Sueldo líquido que querés"
            prefix="$"
            variant="outlined"
            density="comfortable"
            hint="Calculamos qué nominal necesitás para cobrar eso en mano"
            persistent-hint
          />
        </VCol>

        <VCol cols="6" sm="3">
          <VTextField
            v-model.number="hijos"
            type="number"
            min="0"
            max="15"
            label="Hijos a cargo"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="3">
          <VTextField
            v-model.number="hijosDiscapacidad"
            type="number"
            min="0"
            max="15"
            label="Con discapacidad"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>

        <VCol cols="12">
          <VSwitch
            v-model="conyugeACargo"
            color="primary"
            density="compact"
            hide-details
            label="Tengo cónyuge o concubino/a a cargo (sin cobertura propia del SNIS)"
          />
        </VCol>
      </VRow>

      <!-- Advanced -->
      <VExpansionPanels flat class="adv-panels mt-2">
        <VExpansionPanel eager>
          <VExpansionPanelTitle class="px-0">
            <span class="text-body-2 font-weight-medium">
              <VIcon size="small" start>mdi-tune</VIcon>
              Otras deducciones (opcional)
            </span>
          </VExpansionPanelTitle>
          <VExpansionPanelText class="px-0">
            <VRow>
              <VCol cols="12" sm="4">
                <VTextField
                  v-model.number="cuotaHipotecariaAnual"
                  type="number"
                  min="0"
                  label="Cuota hipotecaria (al año)"
                  prefix="$"
                  variant="outlined"
                  density="comfortable"
                  :hint="`Vivienda única. Tope ${formatUYU(PAYROLL_UY.hipotecarioTopeBpc * bpc)}/año`"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" sm="4">
                <VTextField
                  v-model.number="otrasDeduccionesAnuales"
                  type="number"
                  min="0"
                  label="Otras deducciones (al año)"
                  prefix="$"
                  variant="outlined"
                  density="comfortable"
                  hint="Fondo de Solidaridad, caja profesional, etc."
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" sm="4">
                <VTextField
                  v-model.number="bpc"
                  type="number"
                  min="1"
                  label="Valor de la BPC"
                  prefix="$"
                  variant="outlined"
                  density="comfortable"
                  hint="BPC 2026"
                  persistent-hint
                />
              </VCol>
            </VRow>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>

      <VDivider class="my-6" />

      <!-- Headline -->
      <div class="headline-grid">
        <div class="head-box">
          <div class="text-overline text-medium-emphasis">Sueldo nominal</div>
          <div class="text-h6 font-weight-bold">{{ formatUYU(r.nominal) }}</div>
        </div>
        <div class="head-box head-box--main">
          <div class="text-overline">Sueldo líquido (en mano)</div>
          <div class="text-h4 font-weight-bold">{{ formatUYU(r.liquido) }}</div>
          <div class="text-caption">Te descuentan {{ r.descuentoPct }}%</div>
        </div>
        <div class="head-box">
          <div class="text-overline text-medium-emphasis">Total descuentos</div>
          <div class="text-h6 font-weight-bold text-error">−{{ formatUYU(r.totalDescuentos) }}</div>
        </div>
      </div>

      <!-- Payslip -->
      <div class="payslip mt-6">
        <div class="slip-row slip-row--head">
          <span>Concepto</span>
          <span class="slip-rate">Tasa</span>
          <span class="slip-amt">Monto</span>
        </div>
        <div class="slip-row">
          <span>Sueldo nominal</span>
          <span class="slip-rate">—</span>
          <span class="slip-amt">{{ formatUYU(r.nominal) }}</span>
        </div>
        <div class="slip-row slip-row--neg">
          <span>
            Aporte jubilatorio (BPS)
            <VChip v-if="r.jubilatorio.topeApplied" size="x-small" color="warning" variant="tonal">
              tope
            </VChip>
          </span>
          <span class="slip-rate">{{ r.jubilatorio.rate }}%</span>
          <span class="slip-amt">−{{ formatUYU(r.jubilatorio.amount) }}</span>
        </div>
        <div class="slip-row slip-row--neg">
          <span>FONASA</span>
          <span class="slip-rate">{{ r.fonasa.rate }}%</span>
          <span class="slip-amt">−{{ formatUYU(r.fonasa.amount) }}</span>
        </div>
        <div class="slip-row slip-row--neg">
          <span>FRL</span>
          <span class="slip-rate">{{ r.frl.rate }}%</span>
          <span class="slip-amt">−{{ formatUYU(r.frl.amount) }}</span>
        </div>
        <div class="slip-row slip-row--neg">
          <span>IRPF retenido</span>
          <span class="slip-rate">—</span>
          <span class="slip-amt">−{{ formatUYU(r.irpf.tax) }}</span>
        </div>
        <div class="slip-row slip-row--total">
          <span>Sueldo líquido</span>
          <span class="slip-rate" />
          <span class="slip-amt">{{ formatUYU(r.liquido) }}</span>
        </div>
      </div>

      <!-- IRPF detail -->
      <VExpansionPanels flat class="adv-panels mt-4">
        <VExpansionPanel eager>
          <VExpansionPanelTitle class="px-0">
            <span class="text-body-2 font-weight-medium">
              <VIcon size="small" start>mdi-calculator-variant-outline</VIcon>
              Cómo salió el IRPF ({{ formatUYU(r.irpf.tax) }})
            </span>
          </VExpansionPanelTitle>
          <VExpansionPanelText class="px-0">
            <p class="text-body-2 mb-3">
              El IRPF se calcula por franjas sobre el <strong>nominal</strong>, y después se le
              resta un <strong>crédito</strong> igual a tus deducciones por
              {{ r.irpf.creditRate }}%. Nunca da negativo.
            </p>
            <div class="irpf-lines">
              <div class="irpf-line">
                <span>Impuesto por franjas (sobre el nominal)</span>
                <span>{{ formatUYU(r.irpf.grossTax) }}</span>
              </div>
              <div class="irpf-line">
                <span>Deducciones del mes (aportes + hijos + otras)</span>
                <span>{{ formatUYU(r.irpf.deductionsMonthly) }}</span>
              </div>
              <div class="irpf-line">
                <span>Crédito ({{ r.irpf.creditRate }}% de las deducciones)</span>
                <span class="text-success">−{{ formatUYU(r.irpf.credit) }}</span>
              </div>
              <div class="irpf-line irpf-line--total">
                <span>IRPF a retener</span>
                <span>{{ formatUYU(r.irpf.tax) }}</span>
              </div>
            </div>
            <p v-if="r.irpf.tax === 0" class="text-caption text-success mt-3 mb-0">
              <VIcon size="14">mdi-check-circle-outline</VIcon>
              Con estas deducciones no te retienen IRPF.
            </p>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>

      <VDivider class="my-6" />

      <!-- Payslip check -->
      <div class="check-box pa-4">
        <div class="d-flex align-center ga-2 mb-2">
          <VIcon color="primary" size="small">mdi-magnify-scan</VIcon>
          <span class="text-subtitle-2 font-weight-bold">¿Te pagaron bien?</span>
        </div>
        <p class="text-caption text-medium-emphasis mb-3">
          Poné lo que realmente te depositaron y lo comparamos con lo que debería darte.
        </p>
        <VRow>
          <VCol cols="12" sm="6">
            <VTextField
              v-model.number="recibido"
              type="number"
              min="0"
              label="Líquido que cobraste"
              prefix="$"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </VCol>
          <VCol cols="12" sm="6" class="d-flex align-center">
            <VAlert
              v-if="checkResult"
              :type="checkResult.tone"
              variant="tonal"
              density="compact"
              class="w-100"
            >
              {{ checkResult.msg }}
            </VAlert>
          </VCol>
        </VRow>
        <p class="text-caption text-medium-emphasis mb-0 mt-2">
          Ojo: horas extra, partidas variables, presentismo, viáticos, embargos o descuentos de la
          empresa cambian el número. Una diferencia chica no significa error.
        </p>
      </div>
    </VCard>

    <template #notes>
      Estimación para <strong>trabajador dependiente</strong> con valores 2026 (BPC
      {{ formatUYU(bpc) }}). Incluye aporte jubilatorio {{ PAYROLL_UY.jubilatorioRate }}% (con tope
      de {{ formatUYU(PAYROLL_UY.jubilatorioTope) }}), FONASA según tu situación familiar, FRL
      {{ PAYROLL_UY.frlRate }}% e IRPF con el crédito por deducciones. No contempla aguinaldo ni
      salario vacacional (tenés la
      <NuxtLink :to="localePath('/herramientas/calculadora-aguinaldo')">
        calculadora de aguinaldo </NuxtLink
      >), ni partidas variables. Informativo, no asesoramiento fiscal: confirmá con tu recibo, BPS o
      tu contador.
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { computePayroll, nominalForLiquido, PAYROLL_UY } from '~/utils/payroll'
import { URUGUAY } from '~/utils/calculators'
import { formatUYU } from '~/utils/format'

const localePath = useLocalePath()

const mode = ref<'nominal' | 'liquido'>('nominal')
const nominalInput = ref(80000)
const liquidoInput = ref(60000)
const hijos = ref(0)
const hijosDiscapacidad = ref(0)
const conyugeACargo = ref(false)
const cuotaHipotecariaAnual = ref(0)
const otrasDeduccionesAnuales = ref(0)
const bpc = ref(URUGUAY.bpc)
const recibido = ref<number | null>(null)

const opts = computed(() => ({
  hijos: hijos.value || 0,
  hijosDiscapacidad: hijosDiscapacidad.value || 0,
  conyugeACargo: conyugeACargo.value,
  cuotaHipotecariaAnual: cuotaHipotecariaAnual.value || 0,
  otrasDeduccionesAnuales: otrasDeduccionesAnuales.value || 0,
  bpc: bpc.value || URUGUAY.bpc,
}))

/** In "líquido" mode we first solve for the nominal, then run the normal chain. */
const effectiveNominal = computed(() =>
  mode.value === 'nominal'
    ? nominalInput.value || 0
    : nominalForLiquido(liquidoInput.value || 0, opts.value)
)

const r = computed(() => computePayroll({ ...opts.value, nominal: effectiveNominal.value }))

const checkResult = computed(() => {
  const got = recibido.value
  if (!got || got <= 0 || r.value.liquido <= 0) return null
  const diff = got - r.value.liquido
  const pct = Math.abs(diff / r.value.liquido) * 100
  if (pct < 1.5) {
    return { tone: 'success' as const, msg: 'Coincide con lo esperado. Tu recibo cierra.' }
  }
  if (diff < 0) {
    return {
      tone: 'warning' as const,
      msg: `Te pagaron ${formatUYU(Math.abs(diff))} menos de lo esperado (${pct.toFixed(1)}%). Revisá el recibo.`,
    }
  }
  return {
    tone: 'info' as const,
    msg: `Cobraste ${formatUYU(diff)} más de lo esperado (${pct.toFixed(1)}%). Puede ser una partida extra.`,
  }
})

const sources = [
  { label: 'BPS — Tasas de aportes FONASA', url: 'https://www.bps.gub.uy/10314/tasas-fonasa.html' },
  {
    label: 'BPS — Aporte jubilatorio',
    url: 'https://www.bps.gub.uy/10305/aporte-jubilatorio.html',
  },
  {
    label: 'DGI — Deducciones admitidas en la liquidación del IRPF',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/deducciones-admitidas-liquidacion-del-irpf',
  },
  {
    label: 'DGI — IRPF para trabajadores dependientes',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/irpf-para-trabajadores-dependientes',
  },
]

const faq = [
  {
    q: '¿Cuánto me descuentan del sueldo en Uruguay?',
    a: 'A un trabajador dependiente le descuentan aporte jubilatorio (15%), FONASA (entre 3% y 8% según tu ingreso y si tenés hijos o cónyuge a cargo) y FRL (0,1%). Eso da alrededor de 19,6% antes del IRPF. Después se retiene el IRPF, que depende de tu nominal y de tus deducciones.',
  },
  {
    q: '¿Cuál es la tasa de FONASA que me corresponde?',
    a: 'Si ganás hasta 2,5 BPC: 3% (o 5% si tenés cónyuge a cargo). Si ganás más de 2,5 BPC: 4,5% sin dependientes, 6% con hijos a cargo, 6,5% con cónyuge a cargo y 8% con cónyuge e hijos. Ojo: tener hijos sube la tasa de FONASA, pero también te da una deducción de IRPF.',
  },
  {
    q: '¿Por qué el IRPF no es simplemente la tasa de la franja?',
    a: 'Porque el impuesto se calcula por franjas sobre el nominal y después se le resta un crédito: la suma de tus deducciones (aportes jubilatorios, FONASA, FRL, hijos, cuota hipotecaria...) multiplicada por 14% si tu nominal mensual es menor a 15 BPC, u 8% si es mayor. El resultado nunca es negativo.',
  },
  {
    q: '¿Cuánto deduzco por hijo?',
    a: 'Cada hijo menor a cargo deduce 20 BPC al año; si tiene discapacidad, 40 BPC al año. Esa deducción genera un crédito (14% u 8%) que te baja el IRPF.',
  },
  {
    q: '¿Hay un tope de aportes?',
    a: `Sí: por encima de ${formatUYU(PAYROLL_UY.jubilatorioTope)} de nominal mensual (valor 2026) no se aportan más jubilatorios. FONASA además tiene un tope anual que puede generarte una devolución.`,
  },
  {
    q: '¿Sirve para calcular el nominal a partir del líquido?',
    a: 'Sí. Cambiá al modo "Sé mi líquido" y te decimos qué sueldo nominal necesitás para cobrar ese monto en mano. Es útil cuando te ofrecen un trabajo "en mano" y querés saber el nominal equivalente.',
  },
]
</script>

<style scoped>
.mode-toggle {
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 10px;
}

.headline-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
@media (min-width: 720px) {
  .headline-grid {
    grid-template-columns: 1fr 1.4fr 1fr;
    align-items: stretch;
  }
}
.head-box {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 14px;
  padding: 14px 16px;
  text-align: center;
}
.head-box--main {
  background: rgba(var(--v-theme-primary), 0.1);
  border-color: rgba(var(--v-theme-primary), 0.5);
  color: rgb(var(--v-theme-primary));
}
.v-theme--light .head-box--main {
  color: #0d47a1;
}

/* Payslip */
.payslip {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 14px;
  overflow: hidden;
}
.slip-row {
  display: grid;
  grid-template-columns: 1fr 70px 130px;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  font-size: 0.88rem;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.1);
}
.slip-row:last-child {
  border-bottom: none;
}
.slip-row--head {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  opacity: 0.75;
  background: rgba(var(--v-border-color), 0.06);
}
.slip-rate {
  text-align: right;
  opacity: 0.85;
  font-variant-numeric: tabular-nums;
}
.slip-amt {
  text-align: right;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.slip-row--neg .slip-amt {
  color: #f87171;
}
.v-theme--light .slip-row--neg .slip-amt {
  color: #b91c1c;
}
.slip-row--total {
  font-weight: 800;
  font-size: 1rem;
  background: rgba(var(--v-theme-primary), 0.08);
}

/* IRPF detail */
.irpf-lines {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.irpf-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.86rem;
  padding: 4px 0;
  border-bottom: 1px dashed rgba(var(--v-border-color), 0.16);
}
.irpf-line span:last-child {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.irpf-line--total {
  border-bottom: none;
  font-weight: 800;
  padding-top: 8px;
}

.check-box {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 14px;
  background: rgba(var(--v-theme-primary), 0.04);
}
.adv-panels :deep(.v-expansion-panel) {
  background: transparent;
}
</style>
