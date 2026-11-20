<template>
  <ToolShell
    slug="calculadora-sueldo-liquido"
    :faq="faq"
    :sources="sources"
    :seo-title="snippet.title"
    :seo-description="snippet.description"
    content-layout="below"
  >
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
          <div class="text-caption">Te descuentan {{ pct(r.descuentoPct) }}</div>
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
          <span class="slip-rate">{{ pct(r.jubilatorio.rate) }}</span>
          <span class="slip-amt">−{{ formatUYU(r.jubilatorio.amount) }}</span>
        </div>
        <div class="slip-row slip-row--neg">
          <span>FONASA</span>
          <span class="slip-rate">{{ pct(r.fonasa.rate) }}</span>
          <span class="slip-amt">−{{ formatUYU(r.fonasa.amount) }}</span>
        </div>
        <div class="slip-row slip-row--neg">
          <span>FRL</span>
          <span class="slip-rate">{{ pct(r.frl.rate) }}</span>
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

      <VAlert type="info" variant="tonal" density="comfortable" class="mt-4">
        Esta calculadora es de <strong>IRPF Categoría II</strong> (rentas del trabajo). Si lo que
        querés saber es cuánto pagás por un plazo fijo, un dividendo, un alquiler o tu cuenta en un
        bróker del exterior, eso es <strong>Categoría I</strong>:
        <NuxtLink :to="localePath('/herramientas/calculadora-impuestos-inversiones')">
          calculadora de impuestos sobre inversiones
        </NuxtLink>
        .
      </VAlert>

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
              El IRPF se calcula por franjas sobre el <strong>nominal</strong> (más un 6 % si supera
              10 BPC), y después se le resta un <strong>crédito</strong> igual a tus deducciones por
              {{ pct(r.irpf.creditRate) }}. Nunca da negativo.
            </p>
            <div class="irpf-lines">
              <div v-if="r.irpf.incrementApplied" class="irpf-line">
                <span>Base del impuesto: nominal + 6 % (supera 10 BPC)</span>
                <span>{{ formatUYU(r.irpf.computable) }}</span>
              </div>
              <div class="irpf-line">
                <span>{{ grossTaxLabel }}</span>
                <span>{{ formatUYU(r.irpf.grossTax) }}</span>
              </div>
              <div class="irpf-line">
                <span>Deducciones del mes (aportes + hijos + otras)</span>
                <span>{{ formatUYU(r.irpf.deductionsMonthly) }}</span>
              </div>
              <div class="irpf-line">
                <span>Crédito ({{ pct(r.irpf.creditRate) }} de las deducciones)</span>
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

    <!-- Debajo de la calculadora y DESPUÉS de la unidad de anuncio que ToolShell pone tras el slot
         por defecto: las tablas en el slot por defecto la empujarían hacia abajo. Cada cifra sale
         de `utils/sueldoLiquidoTabla.ts` (computePayroll), fijada por su test. -->
    <template #content>
      <section class="sueldo-bloque">
        <h2>De nominal a líquido en {{ anio }}: cuánto te queda en mano</h2>
        <p>{{ textos.intro }}</p>
        <p>{{ textos.supuestos }}</p>
        <VTable
          density="comfortable"
          class="sueldo-tabla cu-mobile-cards"
          data-testid="sueldo-tabla-nominal"
        >
          <thead>
            <tr>
              <th scope="col">Sueldo nominal</th>
              <th scope="col" class="text-right">Aportes (jubilatorio, FONASA y FRL)</th>
              <th scope="col" class="text-right">IRPF</th>
              <th scope="col" class="text-right">Líquido en mano</th>
              <th scope="col" class="text-right">Te queda</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in filasNominal" :key="f.nominal">
              <td data-label="Sueldo nominal" class="num num--titulo">
                {{ formatUYU(f.nominal, 0) }}
                <div v-if="f.esSalarioMinimo" class="text-caption text-medium-emphasis">
                  salario mínimo nacional
                </div>
              </td>
              <td data-label="Aportes (jubilatorio, FONASA y FRL)" class="num">
                {{ formatUYU(f.aportes, 0) }}
              </td>
              <td data-label="IRPF" class="num">{{ formatUYU(f.irpf, 0) }}</td>
              <td data-label="Líquido en mano" class="num font-weight-bold">
                {{ formatUYU(f.liquido, 0) }}
              </td>
              <td data-label="Te queda" class="num">{{ pct(f.quedaPct) }}</td>
            </tr>
          </tbody>
        </VTable>
        <p class="text-body-2">
          El salario mínimo nacional es {{ formatUYU(SUELDO_TABLA_SMN, 0) }} por mes desde el
          {{ SUELDO_TABLA_SMN_DESDE }} ({{ SUELDO_TABLA_SMN_DECRETO }}):
          <NuxtLink :to="localePath('/guias/salario-minimo-uruguay-cuanto-es')">
            cuánto es el salario mínimo y qué te descuentan</NuxtLink
          >. Las franjas del IRPF se miden en BPC, y
          <NuxtLink :to="localePath('/indicadores/bpc')">la BPC de {{ anio }}</NuxtLink> es
          {{ formatUYU(BPC_REF, 0) }}.
        </p>
      </section>

      <div class="tool-article-grid sueldo-bloque">
        <section>
          <h2>De líquido a nominal: qué sueldo nominal necesitás</h2>
          <p>
            Si te ofrecen un sueldo «en mano», este es el nominal que tiene que figurar en el
            contrato para que te depositen esa cifra, sin hijos ni cónyuge a cargo, redondeado al
            peso hacia arriba (la calculadora lo da con centavos). Para otro monto, usá el modo «Sé
            mi líquido».
          </p>
          <VTable
            density="comfortable"
            class="sueldo-tabla cu-mobile-cards"
            data-testid="sueldo-tabla-inversa"
          >
            <thead>
              <tr>
                <th scope="col">Para cobrar en mano</th>
                <th scope="col" class="text-right">Necesitás un nominal de</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in filasInversa" :key="f.liquido">
                <td data-label="Para cobrar en mano" class="num num--titulo">
                  {{ formatUYU(f.liquido, 0) }}
                </td>
                <td data-label="Necesitás un nominal de" class="num font-weight-bold">
                  {{ formatUYU(f.nominal, 0) }}
                </td>
              </tr>
            </tbody>
          </VTable>
        </section>

        <section>
          <h2>Sueldo nominal y sueldo líquido: cuál es la diferencia</h2>
          <p>
            El <strong>nominal</strong> es el sueldo bruto acordado: la cifra que figura en el
            contrato o en el aviso de trabajo, antes de cualquier descuento. El
            <strong>líquido</strong> es lo que te depositan, el sueldo «en mano», después de los
            aportes al BPS y, si corresponde, de la retención de IRPF.
          </p>
          <p>
            Los descuentos se calculan siempre sobre el nominal: el empleador retiene el IRPF de la
            retribución nominal y vuelca los aportes al BPS en tu nombre. Por eso, cuando compares
            dos ofertas, compará nominal con nominal o líquido con líquido. Para ver
            <NuxtLink :to="localePath('/guias/entender-tu-recibo-de-sueldo-uruguay')">
              cómo leer cada línea del recibo</NuxtLink
            >, tenemos una guía aparte.
          </p>
        </section>
      </div>

      <section class="sueldo-bloque">
        <h2>Con hijos o cónyuge a cargo</h2>
        <p>{{ textos.familia }}</p>
        <p>{{ textos.familiaComparacion }}</p>
        <VTable
          density="comfortable"
          class="sueldo-tabla cu-mobile-cards"
          data-testid="sueldo-tabla-familia"
        >
          <thead>
            <tr>
              <th scope="col">Sueldo nominal</th>
              <th scope="col" class="text-right">Sin cargas</th>
              <th scope="col" class="text-right">Con 1 hijo</th>
              <th scope="col" class="text-right">Con 2 hijos</th>
              <th scope="col" class="text-right">Con cónyuge a cargo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in filasFamilia" :key="f.nominal">
              <td data-label="Sueldo nominal" class="num num--titulo">
                {{ formatUYU(f.nominal, 0) }}
              </td>
              <td data-label="Sin cargas" class="num">{{ formatUYU(f.sinCargas, 0) }}</td>
              <td data-label="Con 1 hijo" class="num">{{ formatUYU(f.unHijo, 0) }}</td>
              <td data-label="Con 2 hijos" class="num">{{ formatUYU(f.dosHijos, 0) }}</td>
              <td data-label="Con cónyuge a cargo" class="num">{{ formatUYU(f.conyuge, 0) }}</td>
            </tr>
          </tbody>
        </VTable>
        <p class="text-body-2">
          Líquido en mano. La deducción por hijo está tomada entera por vos: si la reparten los dos
          padres, cada uno deduce la mitad, y el empleador la aplica cuando se la declarás en el
          formulario 3100. El cónyuge o concubino cuenta a cargo cuando no tiene cobertura propia
          del SNIS.
        </p>
      </section>

      <div class="tool-article-grid sueldo-bloque">
        <section>
          <h2>Qué te descuentan del sueldo</h2>
          <ul>
            <li>
              <strong>Aporte jubilatorio:</strong> {{ pct(PAYROLL_UY.jubilatorioRate) }} del
              nominal, hasta un tope de {{ formatUYU(PAYROLL_UY.jubilatorioTope, 0) }} por mes; por
              encima de ese monto no aportás más jubilatorio.
            </li>
            <li>
              <strong>FONASA:</strong> de {{ pct(fonasaMin) }} a {{ pct(fonasaMax) }}, según tu
              sueldo y tu familia (tabla de abajo). Tiene además un tope anual que puede generarte
              una <NuxtLink :to="localePath('/devolucion-fonasa-uruguay')">devolución</NuxtLink>.
            </li>
            <li>
              <strong>FRL</strong> (Fondo de Reconversión Laboral): {{ pct(PAYROLL_UY.frlRate) }}.
            </li>
            <li>
              <strong>IRPF:</strong> por franjas desde 7 BPC ({{ formatUYU(7 * BPC_REF, 0) }}),
              menos un crédito del {{ pct(PAYROLL_UY.creditRateLow) }} de tus deducciones (el
              {{ pct(PAYROLL_UY.creditRateHigh) }} si tu nominal pasa 15 BPC,
              {{ formatUYU(15 * BPC_REF, 0) }}). Si el nominal del mes pasa 10 BPC ({{
                formatUYU(10 * BPC_REF, 0)
              }}), la base del impuesto sube un {{ pct(PAYROLL_UY.irpfIncrementPct) }}.
            </li>
          </ul>
          <VTable
            density="comfortable"
            class="sueldo-tabla cu-mobile-cards"
            data-testid="sueldo-tabla-fonasa"
          >
            <thead>
              <tr>
                <th scope="col">FONASA según tu situación</th>
                <th scope="col" class="text-right">
                  Hasta 2,5 BPC ({{ formatUYU(2.5 * BPC_REF, 0) }})
                </th>
                <th scope="col" class="text-right">Más de 2,5 BPC</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in filasFonasa" :key="f.id">
                <td data-label="">{{ f.label }}</td>
                <td data-label="Hasta 2,5 BPC" class="num">{{ pct(f.hasta) }}</td>
                <td data-label="Más de 2,5 BPC" class="num">{{ pct(f.masDe) }}</td>
              </tr>
            </tbody>
          </VTable>
        </section>

        <section>
          <h2>La cuenta, paso a paso</h2>
          <p>Con {{ formatUYU(paso.r.nominal, 0) }} nominales, sin hijos ni cónyuge a cargo:</p>
          <ol class="sueldo-pasos">
            <li>
              Aporte jubilatorio: {{ pct(paso.r.jubilatorio.rate) }} =
              {{ pesos(paso.r.jubilatorio.amount) }}.
            </li>
            <li>FONASA: {{ pct(paso.r.fonasa.rate) }} = {{ pesos(paso.r.fonasa.amount) }}.</li>
            <li>FRL: {{ pct(paso.r.frl.rate) }} = {{ pesos(paso.r.frl.amount) }}.</li>
            <li>
              Base del IRPF: como el nominal pasa 10 BPC, se le suma un
              {{ pct(PAYROLL_UY.irpfIncrementPct) }} y queda en {{ pesos(paso.r.irpf.computable) }}.
            </li>
            <li>Escala: {{ pasoEscala }}; en total {{ pesos(paso.r.irpf.grossTax) }}.</li>
            <li>
              Crédito: {{ pct(paso.r.irpf.creditRate) }} de tus deducciones, que acá son los aportes
              ({{ pesos(paso.r.irpf.deductionsMonthly) }}), da {{ pesos(paso.r.irpf.credit) }}. IRPF
              retenido: {{ pesos(paso.r.irpf.grossTax) }} − {{ pesos(paso.r.irpf.credit) }} =
              {{ pesos(paso.r.irpf.tax) }}.
            </li>
            <li>
              Líquido: {{ pesos(paso.r.nominal) }} − {{ pesos(paso.r.aportes) }} −
              {{ pesos(paso.r.irpf.tax) }} = <strong>{{ pesos(paso.r.liquido) }}</strong
              >.
            </li>
          </ol>
          <p>{{ textos.pasoCierre }}</p>
        </section>
      </div>
    </template>

    <template #disclaimer>
      Estimación para <strong>trabajador dependiente</strong> con valores {{ anio }} (BPC
      {{ formatUYU(bpc, 0) }}). Incluye aporte jubilatorio
      {{ pct(PAYROLL_UY.jubilatorioRate) }} (con tope de
      {{ formatUYU(PAYROLL_UY.jubilatorioTope, 0) }}), FONASA según tu situación familiar, FRL
      {{ pct(PAYROLL_UY.frlRate) }} e IRPF con el crédito por deducciones. No contempla aguinaldo ni
      salario vacacional (el aguinaldo tiene su propia calculadora en Herramientas), ni partidas
      variables. Informativo, no asesoramiento fiscal: confirmá con tu recibo, BPS o tu contador.
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { computePayroll, nominalForLiquido, PAYROLL_UY } from '~/utils/payroll'
import { round, URUGUAY } from '~/utils/calculators'
import { formatUYU } from '~/utils/format'
import {
  fonasaTabla,
  nominalNecesarioRows,
  pctUy as pct,
  pesos,
  SUELDO_TABLA_SMN,
  SUELDO_TABLA_SMN_DECRETO,
  SUELDO_TABLA_SMN_DESDE,
  SUELDO_TABLA_SOURCES,
  sueldoFamiliaRows,
  sueldoLiquidoFaqExtra,
  sueldoLiquidoRows,
  sueldoLiquidoTextos,
  sueldoPasoAPaso,
} from '~/utils/sueldoLiquidoTabla'
import { TOOL_SNIPPET_PAYROLL_YEAR, toolSnippetSueldoLiquido } from '~/utils/toolSnippets'

const localePath = useLocalePath()

// "$ 50.000 nominales son $ 40.200 en mano en 2026": el ejemplo sale de `computePayroll`, el mismo
// cálculo que la herramienta, así que no puede separarse de lo que la página muestra. Ver
// `utils/toolSnippets.ts`.
const snippet = toolSnippetSueldoLiquido()

// La sección explicativa: valores fijos (BPC vigente, sin cargas salvo donde se dice), calculados
// igual en el servidor y en el navegador.
const anio = TOOL_SNIPPET_PAYROLL_YEAR
const BPC_REF = URUGUAY.bpc
const textos = sueldoLiquidoTextos(anio)
const filasNominal = sueldoLiquidoRows()
const filasInversa = nominalNecesarioRows()
const filasFamilia = sueldoFamiliaRows()
const filasFonasa = fonasaTabla()
const fonasaMin = Math.min(...filasFonasa.map(f => f.hasta))
const fonasaMax = Math.max(...filasFonasa.map(f => f.masDe))
const paso = sueldoPasoAPaso()
const pasoEscala = paso.franjas
  .map(f => `${pct(f.rate)} de lo que va de ${pesos(f.from)} a ${pesos(f.to)} (${pesos(f.tax)})`)
  .join(' y ')

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
const grossTaxLabel = computed(() =>
  r.value.irpf.incrementApplied
    ? 'Impuesto por franjas (sobre la base con el 6 %)'
    : 'Impuesto por franjas (sobre el nominal)'
)

const checkResult = computed(() => {
  const got = recibido.value
  if (!got || got <= 0 || r.value.liquido <= 0) return null
  const diff = got - r.value.liquido
  const diffPct = Math.abs(diff / r.value.liquido) * 100
  if (diffPct < 1.5) {
    return { tone: 'success' as const, msg: 'Coincide con lo esperado. Tu recibo cierra.' }
  }
  const diffTxt = pct(round(diffPct, 1))
  if (diff < 0) {
    return {
      tone: 'warning' as const,
      msg: `Te pagaron ${formatUYU(Math.abs(diff))} menos de lo esperado (${diffTxt}). Revisá el recibo.`,
    }
  }
  return {
    tone: 'info' as const,
    msg: `Cobraste ${formatUYU(diff)} más de lo esperado (${diffTxt}). Puede ser una partida extra.`,
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
  ...SUELDO_TABLA_SOURCES,
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
    a: 'Porque el impuesto se calcula por franjas sobre el nominal (si el nominal del mes supera 10 BPC, sobre el nominal más un 6 %, Decreto 148/007 art. 63) y después se le resta un crédito: la suma de tus deducciones (aportes jubilatorios, FONASA, FRL, hijos, cuota hipotecaria...) multiplicada por 14% si tu nominal del mes no supera 15 BPC, u 8% si lo supera. El resultado nunca es negativo.',
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
  ...sueldoLiquidoFaqExtra(anio),
]
</script>

<style scoped>
.mode-toggle {
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
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
  border-radius: 12px;
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
  border-radius: 12px;
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
  font-size: 0.75rem;
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
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.04);
}
.adv-panels :deep(.v-expansion-panel) {
  background: transparent;
}

/* Sección explicativa (slot #content). ToolShell le saca el margen al primer h2 de cada sección,
   así que la separación entre bloques va acá. */
.sueldo-bloque + .sueldo-bloque {
  margin-top: 2.25rem;
}
/* ToolShell arma la grilla con `minmax(280px, 1fr)`, y dentro de la tarjeta (pa-5, overflow
   hidden) una pantalla de 320 px deja ~207 px: la columna de 280 se cortaba a la derecha sin
   barra de scroll. `min(100%, 280px)` deja achicar la única columna al ancho disponible. El
   selector repite la clase para ganarle a `.tool-article[data-v] .tool-article-grid`. */
.tool-article-grid.sueldo-bloque.sueldo-bloque {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
}
.tool-article-grid.sueldo-bloque > section {
  min-width: 0;
}
.sueldo-tabla {
  margin-bottom: 0.9rem;
}
.sueldo-tabla .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.sueldo-tabla td.num--titulo {
  text-align: left;
}
.sueldo-pasos {
  margin: 0 0 0.9rem;
  padding-left: 1.3rem;
}
</style>
