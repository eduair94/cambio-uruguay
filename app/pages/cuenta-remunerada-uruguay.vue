<template>
  <div class="yield-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3">
      <VBtn
        :to="localePath('/tarjetas-de-debito-uruguay')"
        variant="text"
        size="small"
        class="px-1"
      >
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Tarjetas de débito
      </VBtn>
    </div>

    <!-- Hero -->
    <VCard class="overflow-hidden mb-5 hero-card on-dark" elevation="8">
      <div class="hero pa-6 pa-md-8">
        <p class="hero-eyebrow">Rendimiento del saldo · Agosto 2026</p>
        <h1 class="hero-title">
          La plata que rinde sola en Uruguay
          <span class="hero-title-accent">(y por qué llamarlo “interés” está mal)</span>
        </h1>
        <p class="hero-lead">
          Prex y Mercado Pago empezaron a pagar por el dinero que dejás quieto en la cuenta. Pero
          <strong>no es un interés sobre tu saldo</strong>: la ley se lo prohíbe. Lo que rinde es un
          <strong>fondo de inversión</strong> al que tu plata se suscribe, y eso cambia el riesgo,
          la garantía y los impuestos. Acá está la diferencia exacta, quién lo ofrece hoy, la letra
          chica y una calculadora que descuenta la comisión y la inflación.
        </p>
        <div class="hero-meta">
          <span class="hero-spoiler">
            <VIcon size="16" class="mr-2">mdi-information-outline</VIcon>
            <span
              >Ningún producto uruguayo publica una tasa fija. Acá no inventamos una: mostramos la
              referencia y de dónde sale.</span
            >
          </span>
        </div>
        <div class="d-flex justify-start justify-md-end mt-4">
          <ShareButtons text="Tu saldo en la billetera no paga intereses: la ley lo prohíbe" />
        </div>
      </div>
    </VCard>

    <!-- The one thing to understand -->
    <VCard variant="flat" class="pa-4 pa-sm-5 mb-5">
      <h2 class="text-h6 font-weight-bold mb-3">Lo que la ley dice, en cuatro palabras</h2>
      <blockquote class="law-quote">
        <p class="law-quote-text">“No genera intereses.”</p>
        <footer class="law-quote-src">
          Ley 19.210, artículo 2, literal E) — dinero electrónico
        </footer>
      </blockquote>
      <p class="text-body-2 mb-4">
        Esa frase es una <strong>característica obligatoria</strong> del dinero electrónico en
        Uruguay. Ni Prex, ni Mercado Pago, ni MiDinero, ni OCA Blue pueden pagarte un interés por
        tener saldo, como haría un banco con un depósito. Entonces, ¿de dónde sale el rendimiento?
        De otro lado: tu plata se <strong>suscribe a un fondo de inversión</strong> autorizado por
        el BCU, que compra papel de cortísimo plazo del Banco Central y del Estado. La billetera
        hace de puerta; el que rinde es el fondo.
      </p>
      <div class="split-grid">
        <div class="split-box split-box--no">
          <div class="split-tag">Lo que NO es</div>
          <ul class="split-list">
            <li>No es un interés sobre tu saldo.</li>
            <li>No es un depósito bancario.</li>
            <li>No tiene garantía de capital.</li>
            <li>No lo cubre el seguro de depósitos (COPAB).</li>
            <li>No hay tasa fija ni prometida.</li>
          </ul>
        </div>
        <div class="split-box split-box--si">
          <div class="split-tag">Lo que SÍ es</div>
          <ul class="split-list">
            <li>Una cuota de un fondo de inversión, supervisado por el BCU.</li>
            <li>Invertido en Letras de Regulación Monetaria y deuda del Estado uruguayo.</li>
            <li>Con rescate diario: la plata sigue disponible para pagar y transferir.</li>
            <li>Con un rendimiento variable, que se acredita en días hábiles.</li>
            <li>Con una comisión que se descuenta adentro del fondo.</li>
          </ul>
        </div>
      </div>
    </VCard>

    <!-- Legal facts -->
    <VExpansionPanels variant="accordion" class="mb-5">
      <VExpansionPanel v-for="fact in LEGAL_FACTS" :key="fact.id">
        <VExpansionPanelTitle>
          <VIcon start size="small" color="primary">mdi-gavel</VIcon>
          {{ fact.claim }}
        </VExpansionPanelTitle>
        <VExpansionPanelText>
          <p class="text-caption text-medium-emphasis mb-2">{{ fact.norm }}</p>
          <p v-if="fact.quote" class="norm-quote mb-2">“{{ fact.quote }}”</p>
          <p class="text-body-2 mb-2">{{ fact.meaning }}</p>
          <a :href="fact.source.url" target="_blank" rel="noopener noreferrer" class="src-link">
            <VIcon size="12">mdi-open-in-new</VIcon>{{ fact.source.label }} —
            {{ fact.source.publisher }}
          </a>
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>

    <!-- Products -->
    <section class="mb-6" aria-labelledby="productos-title">
      <h2 id="productos-title" class="text-h6 font-weight-bold mb-1">
        Quién lo ofrece hoy en Uruguay
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Dos productos, los dos en pesos, los dos con la misma arquitectura: billetera → fondo de
        inversión → papel del BCU y del Estado. Ninguno de los dos publica una tasa.
      </p>

      <VCard
        v-for="p in products"
        :id="`producto-${p.id}`"
        :key="p.id"
        variant="outlined"
        class="prod-card mb-3 pa-4"
      >
        <div class="d-flex align-start flex-wrap ga-2">
          <div class="flex-grow-1">
            <h3 class="text-subtitle-1 font-weight-bold mb-0">
              {{ p.name }} <span class="prod-provider">· {{ p.provider }}</span>
            </h3>
            <p class="text-caption text-medium-emphasis mb-0">
              En Uruguay desde el {{ fmtDate(p.launched) }}
            </p>
          </div>
          <VChip size="small" color="success" variant="tonal" prepend-icon="mdi-chart-line">
            Rendimiento diario
          </VChip>
        </div>

        <p class="text-body-2 mt-3 mb-3">{{ p.howItWorks }}</p>

        <div class="table-scroll">
          <table class="spec cu-mobile-cards">
            <tbody>
              <tr>
                <th scope="row">Vehículo</th>
                <td data-label="Vehículo">
                  {{ p.fundName }} — administrado por {{ p.fundAdmin
                  }}<template v-if="p.fundBroker">, distribuido por {{ p.fundBroker }}</template>
                </td>
              </tr>
              <tr>
                <th scope="row">Qué compra el fondo</th>
                <td data-label="Qué compra el fondo">{{ p.investsIn }}</td>
              </tr>
              <tr>
                <th scope="row">Moneda</th>
                <td data-label="Moneda">{{ CURRENCY_LABELS[p.currency] }}</td>
              </tr>
              <tr>
                <th scope="row">Mínimo</th>
                <td data-label="Mínimo">
                  <template v-if="p.minFirstUyu">
                    ${{ fmtPesos(p.minFirstUyu) }} la primera vez;
                    {{
                      p.minAfterUyu ? `$${fmtPesos(p.minAfterUyu)} después` : 'sin mínimo después'
                    }}
                  </template>
                  <template v-else>Sin mínimo</template>
                </td>
              </tr>
              <tr>
                <th scope="row">Lo que te cobran a vos</th>
                <td data-label="Lo que te cobran a vos">{{ p.userFees }}</td>
              </tr>
              <tr>
                <th scope="row">Comisión dentro del fondo</th>
                <td data-label="Comisión dentro del fondo">
                  <strong v-if="p.fundFeeMaxPct !== null" class="text-warning">
                    Tope de {{ fmtNum(p.fundFeeMaxPct) }}% anual + IVA ({{
                      fmtNum(feeWithIva(p.fundFeeMaxPct))
                    }}% con IVA).
                  </strong>
                  {{ p.fundFeeNote }}
                </td>
              </tr>
              <tr>
                <th scope="row">Tasa</th>
                <td data-label="Tasa">{{ p.rateNote }}</td>
              </tr>
              <tr>
                <th scope="row">Liquidez</th>
                <td data-label="Liquidez">{{ p.liquidity }}</td>
              </tr>
              <tr>
                <th scope="row">Impuestos</th>
                <td data-label="Impuestos">{{ p.taxNote }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <VRow class="mt-1" dense>
          <VCol cols="12" sm="6">
            <ul class="pros">
              <li v-for="(x, i) in p.pros" :key="i">
                <VIcon size="14" color="success">mdi-check</VIcon>{{ x }}
              </li>
            </ul>
          </VCol>
          <VCol cols="12" sm="6">
            <ul class="cons">
              <li v-for="(x, i) in p.cons" :key="i">
                <VIcon size="14" color="error">mdi-close</VIcon>{{ x }}
              </li>
            </ul>
          </VCol>
        </VRow>

        <div class="mt-1">
          <a
            v-for="(s, i) in p.sources"
            :key="i"
            :href="s.url"
            target="_blank"
            rel="noopener noreferrer"
            class="src-link"
          >
            <VIcon size="12">mdi-open-in-new</VIcon>{{ s.publisher }}
          </a>
        </div>
      </VCard>
    </section>

    <!-- Calculator -->
    <VCard id="calculadora" variant="flat" class="calc-card pa-4 pa-sm-5 mb-5">
      <div class="d-flex align-center ga-2 mb-1">
        <VIcon size="20" color="primary">mdi-calculator-variant-outline</VIcon>
        <h2 class="text-h6 font-weight-bold mb-0">¿Cuánto rinde de verdad tu saldo quieto?</h2>
      </div>
      <p class="text-caption text-medium-emphasis mb-4">
        Poné cuánta plata dejás parada y por cuántos días. La calculadora descuenta primero la
        comisión del fondo y después la inflación, que es lo único que dice si ganaste poder de
        compra o solo números.
      </p>

      <VRow dense>
        <VCol cols="12" sm="6" md="3">
          <VTextField
            v-model.number="amount"
            type="number"
            min="0"
            step="1000"
            label="Saldo quieto"
            prefix="$"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="6" md="3">
          <VTextField
            v-model.number="days"
            type="number"
            min="1"
            step="1"
            label="Días"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="6" md="3">
          <VTextField
            v-model.number="ratePct"
            type="number"
            min="0"
            step="0.25"
            label="Tasa bruta anual"
            suffix="%"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="6" md="3">
          <VTextField
            v-model.number="feePct"
            type="number"
            min="0"
            step="0.1"
            label="Comisión anual (con IVA)"
            suffix="%"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
      </VRow>

      <div class="d-flex flex-wrap ga-2 mt-3">
        <VBtn variant="tonal" size="small" @click="loadScenario('sin')">
          <VIcon start size="small">mdi-percent-outline</VIcon>Sin comisión
        </VBtn>
        <VBtn variant="tonal" size="small" @click="loadScenario('tope')">
          <VIcon start size="small">mdi-alert-outline</VIcon>Con el tope de 3% + IVA
        </VBtn>
        <VBtn variant="tonal" size="small" @click="loadScenario('fondo')">
          <VIcon start size="small">mdi-bank-outline</VIcon>Fondo con comisión publicada (1,4%)
        </VBtn>
      </div>

      <div class="calc-result mt-4">
        <table class="breakdown">
          <tbody>
            <tr>
              <td>Rendimiento bruto en {{ fmtPlain(days) }} días</td>
              <td class="num">$ {{ fmtPesos(result.grossUyu) }}</td>
            </tr>
            <tr>
              <td>
                Comisión del fondo <span class="muted">({{ fmtNum(feePct) }}% anual)</span>
              </td>
              <td class="num neg">− $ {{ fmtPesos(result.feeUyu) }}</td>
            </tr>
            <tr class="subtotal">
              <td>Te queda acreditado</td>
              <td class="num">$ {{ fmtPesos(result.netUyu) }}</td>
            </tr>
            <tr>
              <td>
                Lo que hacía falta solo para empatar
                <span class="muted">(inflación {{ fmtNum(IPC_INTERANUAL_PCT) }}%)</span>
              </td>
              <td class="num">$ {{ fmtPesos(result.breakEvenUyu) }}</td>
            </tr>
            <tr class="total">
              <td>Poder de compra ganado</td>
              <td class="num" :class="result.realUyu >= 0 ? 'pos' : 'neg'">
                {{ result.realUyu >= 0 ? '+' : '−' }} $ {{ fmtPesos(Math.abs(result.realUyu)) }}
              </td>
            </tr>
          </tbody>
        </table>
        <div class="calc-headline mt-3">
          <div class="calc-pill" :class="{ 'calc-pill--neg': result.realRatePct < 0 }">
            <span class="calc-pill-num">{{ fmtNum(result.realRatePct) }}%</span>
            <span class="calc-pill-lbl">de tasa real anual</span>
          </div>
          <p class="text-caption text-medium-emphasis mb-0">
            Tasa neta {{ fmtNum(result.netRatePct) }}% descontada la inflación de
            {{ fmtNum(IPC_INTERANUAL_PCT) }}% ({{ IPC_PERIOD }}, INE). Se calcula con la relación
            exacta (1+neta)/(1+inflación)−1, no restando una de otra: restar siempre exagera el
            resultado.
          </p>
        </div>
      </div>

      <VAlert
        v-if="result.realRatePct < 0"
        type="warning"
        variant="tonal"
        density="comfortable"
        class="mt-4"
        border="start"
      >
        Con esa comisión, el rendimiento no le gana a la inflación: la plata crece en pesos y encoge
        en poder de compra. Es exactamente por qué la comisión del fondo importa tanto cuando la
        tasa de partida está cerca del {{ fmtNum(TPM_PCT) }}%.
      </VAlert>

      <p class="text-caption text-disabled mt-3 mb-0">
        Estimación educativa. La tasa por defecto es la Tasa de Política Monetaria del BCU, en
        {{ fmtNum(TPM_PCT) }}% anual: el COPOM la mantuvo en ese nivel en su comunicado del
        {{ fmtDate(TPM_CONFIRMED) }}. Es la referencia del papel que compran estos fondos, no una
        tasa que alguien te prometa. No es asesoramiento financiero.
      </p>
    </VCard>

    <!-- Myth -->
    <VCard v-for="m in RATE_MYTHS" :key="m.figure" variant="flat" class="pa-4 pa-sm-5 mb-5 myth">
      <div class="d-flex align-center ga-2 mb-2">
        <VIcon size="20" color="error">mdi-close-octagon-outline</VIcon>
        <h2 class="text-h6 font-weight-bold mb-0">
          El “{{ m.figure }}” que vas a ver por ahí no es de Uruguay
        </h2>
      </div>
      <p class="text-body-2 mb-2">
        Esa cifra es de <strong>{{ m.belongsTo }}</strong
        >. {{ m.why }}
      </p>
      <a :href="m.source.url" target="_blank" rel="noopener noreferrer" class="src-link">
        <VIcon size="12">mdi-open-in-new</VIcon>{{ m.source.label }} — {{ m.source.publisher }}
      </a>
    </VCard>

    <!-- Benchmarks -->
    <VCard variant="flat" class="pa-4 pa-sm-5 mb-5">
      <h2 class="text-h6 font-weight-bold mb-1">Contra qué se compara</h2>
      <p class="text-caption text-medium-emphasis mb-3">
        La gracia de estos productos no es la tasa: es que rinden <em>sin</em> inmovilizar la plata.
        Un plazo fijo paga parecido, pero te la traba.
      </p>
      <div class="table-scroll">
        <table class="bench cu-mobile-cards">
          <thead>
            <tr>
              <th>Dónde está la plata</th>
              <th class="num">Tasa anual</th>
              <th>¿Disponible hoy?</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            <tr class="bench-row--live">
              <td data-label="Dónde está la plata">
                <strong>Saldo de billetera con rendimiento</strong>
              </td>
              <td class="num" data-label="Tasa anual">Variable, sin publicar</td>
              <td data-label="¿Disponible hoy?"><span class="yes">Sí</span></td>
              <td data-label="Detalle">
                Prex y Mercado Pago. Referencia: la TPM, {{ fmtNum(TPM_PCT) }}% anual.
              </td>
            </tr>
            <tr v-for="b in BENCHMARKS" :key="b.id">
              <td data-label="Dónde está la plata">{{ b.name }}</td>
              <td class="num" data-label="Tasa anual">
                <template v-if="b.ratePct === null">Variable, según el fondo</template>
                <template v-else-if="b.ratePct === 0">0%</template>
                <template v-else>{{ fmtNum(b.ratePct) }}%</template>
              </td>
              <td data-label="¿Disponible hoy?">
                <span :class="b.liquid ? 'yes' : 'no'">{{ b.liquid ? 'Sí' : 'No' }}</span>
              </td>
              <td data-label="Detalle">{{ b.note }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-caption text-disabled mt-2 mb-0">
        Tasas nominales anuales publicadas por cada institución. Verificadas el
        {{ YIELD_LAST_REVIEWED }}; cambian sin aviso.
      </p>
    </VCard>

    <!-- Fine print -->
    <VCard variant="flat" class="pa-4 pa-sm-5 mb-5">
      <h2 class="text-h6 font-weight-bold mb-3">La letra chica que sí importa</h2>
      <ul class="tips">
        <li v-for="(t, i) in fineprint" :key="i">
          <VIcon size="18" color="primary" class="mr-2">{{ t.icon }}</VIcon>
          <span
            ><strong>{{ t.title }}.</strong> {{ t.body }}</span
          >
        </li>
      </ul>
    </VCard>

    <!-- FAQ -->
    <VCard variant="flat" class="pa-4 pa-sm-5 mb-5">
      <h2 class="text-h6 font-weight-bold mb-3">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="(f, i) in faqs" :key="i">
          <VExpansionPanelTitle>{{ f.q }}</VExpansionPanelTitle>
          <VExpansionPanelText>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <p class="text-body-2 mb-0" v-html="f.a" />
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </VCard>

    <!-- Related -->
    <VCard variant="flat" class="pa-4 pa-sm-5 mb-5">
      <h2 class="text-subtitle-1 font-weight-bold mb-3">Seguí leyendo</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn :to="localePath('/tarjetas-de-debito-uruguay')" variant="tonal" size="small">
          <VIcon start size="small">mdi-credit-card-outline</VIcon>Tarjetas de débito (tier list)
        </VBtn>
        <VBtn :to="localePath('/inversiones-uruguay')" variant="tonal" size="small">
          <VIcon start size="small">mdi-chart-areaspline</VIcon>Dónde invertir en Uruguay
        </VBtn>
        <VBtn :to="localePath('/impuestos-inversiones-uruguay')" variant="tonal" size="small">
          <VIcon start size="small">mdi-file-percent-outline</VIcon>Impuestos de inversiones
        </VBtn>
        <VBtn :to="localePath('/mejores-bancos-uruguay')" variant="tonal" size="small">
          <VIcon start size="small">mdi-bank-outline</VIcon>Mejores bancos
        </VBtn>
        <VBtn :to="localePath('/salud-financiera')" variant="tonal" size="small">
          <VIcon start size="small">mdi-heart-pulse</VIcon>Salud financiera
        </VBtn>
      </div>
    </VCard>

    <!-- Sources -->
    <VCard variant="flat" class="pa-4 pa-sm-5">
      <div class="d-flex align-center ga-2 mb-2">
        <VIcon size="18" color="primary">mdi-book-open-variant</VIcon>
        <h2 class="text-subtitle-1 font-weight-bold mb-0">Fuentes y referencias</h2>
      </div>
      <p class="text-caption text-medium-emphasis mb-3">
        Verificado por última vez: {{ YIELD_LAST_REVIEWED }}. Las tasas, comisiones y reglamentos
        cambian; confirmá siempre en la app y en el reglamento del fondo antes de decidir.
      </p>
      <ul class="sources">
        <li v-for="(s, i) in YIELD_SOURCES" :key="i">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
          <span class="muted"> — {{ s.publisher }}</span>
        </li>
      </ul>
    </VCard>
  </div>
</template>

<script setup lang="ts">
import {
  BENCHMARKS,
  IPC_INTERANUAL_PCT,
  IPC_PERIOD,
  LEGAL_FACTS,
  RATE_MYTHS,
  TPM_PCT,
  TPM_CONFIRMED,
  YIELD_LAST_REVIEWED,
  YIELD_SOURCES,
  estimateYield,
  feeWithIva,
  liveProducts,
  type YieldCurrency,
} from '~/utils/yieldAccounts'

const localePath = useLocalePath()

const products = liveProducts()

const CURRENCY_LABELS: Record<YieldCurrency, string> = {
  UYU: 'Solo pesos uruguayos',
  USD: 'Solo dólares',
  ambas: 'Pesos y dólares',
}

// ── Calculator ──
const amount = ref<number>(50000)
const days = ref<number>(365)
const ratePct = ref<number>(TPM_PCT)
const feePct = ref<number>(0)

const result = computed(() =>
  estimateYield({
    amountUyu: amount.value || 0,
    annualRatePct: ratePct.value || 0,
    days: days.value || 0,
    feeAnnualPct: feePct.value || 0,
    inflationPct: IPC_INTERANUAL_PCT,
  })
)

/**
 * Three presets, all at the policy rate, differing only in the commission — the
 * variable that decides whether the real return is positive. 1,4 % is the
 * published, IVA-included fee of BLZ Liquidez Pesos; 3,66 % is the ceiling the
 * BIND fund's rules allow.
 */
function loadScenario(kind: 'sin' | 'tope' | 'fondo') {
  ratePct.value = TPM_PCT
  feePct.value = kind === 'tope' ? feeWithIva(3) : kind === 'fondo' ? 1.4 : 0
}

// ── Static content ──
const fineprint = [
  {
    icon: 'mdi-percent-outline',
    title: 'La comisión se cobra adentro del fondo',
    body: '“Sin comisiones” suele querer decir que no te cobran por abrir, suscribir ni rescatar. La comisión de administración del fondo es otra cosa: se descuenta del patrimonio antes de calcular tu rendimiento. No la ves como línea, la ves como una tasa más chica.',
  },
  {
    icon: 'mdi-shield-off-outline',
    title: 'No hay garantía de capital',
    body: 'Es un fondo, no un depósito. El propio Prex lo dice: no es un depósito bancario ni tiene garantía de capital. Estos fondos compran papel de cortísimo plazo del BCU y del Estado, así que el riesgo es bajo, pero “bajo” no es “cero”: un día puede rendir menos de lo esperado.',
  },
  {
    icon: 'mdi-currency-usd-off',
    title: 'Solo pesos',
    body: 'Los dos productos son en pesos uruguayos. Si tenés dólares en Prex, esos dólares no rinden. Y en Mercado Pago Uruguay directamente no existe el saldo en dólares.',
  },
  {
    icon: 'mdi-clock-outline',
    title: 'La liquidez es buena, pero no es instantánea del todo',
    body: 'Podés pagar y transferir cuando quieras, sí. Pero la acreditación del rendimiento es en días hábiles: Prex avisa que puede demorar hasta 48 horas hábiles. En fines de semana y feriados no se genera rendimiento.',
  },
  {
    icon: 'mdi-file-percent-outline',
    title: 'Impuestos: exonerado, pero por el activo, no por el envase',
    body: 'Los rendimientos de fondos de inversión que provienen de valores públicos están exonerados de IRPF, y los intereses de títulos de deuda pública también. Es porque el fondo compra papel del Estado. Si un fondo cambiara su cartera, cambiaría el tratamiento.',
  },
  {
    icon: 'mdi-target',
    title: 'Para qué sirve de verdad',
    body: 'Para el dinero del mes: el que necesitás disponible y hoy está quieto perdiendo contra la inflación. No reemplaza una estrategia de ahorro a largo plazo, y con la tasa real cerca de cero, la ganancia sobre saldos chicos es de unos pocos pesos por mes.',
  },
]

const faqs = [
  {
    q: '¿Es un interés lo que me paga Mercado Pago o Prex?',
    a: 'No, y no es un detalle semántico. La <strong>Ley 19.210, artículo 2, literal E)</strong> establece que el dinero electrónico “no genera intereses”. Lo que cobrás es el resultado de un <strong>fondo de inversión</strong> al que tu saldo se suscribe. Cambia todo lo importante: no hay garantía de capital, no lo cubre el seguro de depósitos y la tasa no está prometida.',
  },
  {
    q: '¿Cuánto paga exactamente?',
    a: 'Ninguno de los dos publica una tasa. Mercado Pago comunicó que la <strong>referencia</strong> es la Tasa de Política Monetaria del BCU, en 5,75 % anual al lanzamiento; Prex muestra en la app una <strong>tasa indicativa</strong> calculada sobre el desempeño del fondo en los últimos 30 días. Ambas se mueven todos los días. Cualquier número fijo que veas publicado en otro lado conviene chequearlo contra la app.',
  },
  {
    q: '¿Y el 20,81 % de TNA que leí?',
    a: 'Es de <strong>Prex Argentina</strong>, en pesos argentinos. Aparece en notas de medios argentinos que cubren el producto del otro país. En Uruguay es imposible: la TPM está en 5,75 % anual y estos fondos compran papel del BCU y del Estado uruguayo.',
  },
  {
    q: '¿Me conviene contra un plazo fijo?',
    a: 'Depende de si necesitás la plata. Un plazo fijo en pesos por e-BROU paga 5,40 % anual a 181–366 días, más o menos lo mismo que la referencia de estos fondos, pero <strong>te inmoviliza el dinero</strong> hasta el vencimiento. La ventaja del saldo que rinde no es la tasa: es que podés gastarlo mañana.',
  },
  {
    q: '¿Pago impuestos por esto?',
    a: 'Los rendimientos de fondos de inversión que provienen de <strong>valores públicos</strong> están exonerados de IRPF, y los intereses de títulos de deuda pública también. Como estos fondos invierten en Letras de Regulación Monetaria y deuda del Estado uruguayo, no hay retención por ese concepto. Si tu situación es particular, consultá a un contador.',
  },
  {
    q: '¿Qué pasa si quiebra la fintech?',
    a: 'Son dos patrimonios distintos y ninguno pertenece al emisor. El <strong>saldo de la billetera</strong> se radica en cuentas bancarias que la Ley 19.210 art. 5 define como “patrimonios de afectación independientes del patrimonio de la institución emisora”. La <strong>plata invertida</strong> está en el fondo, administrado por una AFISA supervisada por el BCU. Lo que no hay en ningún caso es seguro de depósitos: el COPAB cubre depósitos bancarios, no billeteras ni fondos.',
  },
  {
    q: '¿Sirve para abaratar mis compras en dólares?',
    a: 'No. El rendimiento es en pesos y no toca ninguno de los dos costos de una compra internacional: ni la comisión del emisor ni el spread al pasar pesos a dólares. Por eso en nuestra <a href="/tarjetas-de-debito-uruguay">tier list de tarjetas de débito</a> el rendimiento pesa poco: sirve para estacionar pesos, no para comprar en Steam más barato.',
  },
  {
    q: '¿Los bancos tienen algo equivalente?',
    a: 'No sobre el saldo: la caja de ahorro común en pesos no paga interés. Sí existen <strong>fondos de liquidez</strong> del mismo tipo que hay detrás de estos productos, contratables por tu cuenta en bancos y brókers. Piden mínimo y no viven dentro de la billetera, pero suelen publicar la comisión: <strong>BLZ Liquidez Pesos</strong> de Balanz pide $5.000, cobra 1,4 % anual con IVA incluido y rescata el mismo día (T+0) si pedís antes de las 11:30.',
  },
]

// ── SEO ──
const canonicalUrl = 'https://cambio-uruguay.com/cuenta-remunerada-uruguay'
const title =
  'Cuenta remunerada en Uruguay 2026: el rendimiento del saldo en Prex y Mercado Pago, explicado'
const description =
  'Prex (Inversión Violeta) y Mercado Pago pagan rendimiento diario por el saldo de la cuenta. No es un interés: la Ley 19.210 lo prohíbe, es un fondo de inversión. Qué rinde, qué comisión tiene, qué riesgo corrés y cuánto queda después de la inflación.'

defineOgImageComponent('Cambio', {
  title: 'La plata que rinde sola',
  subtitle: 'Prex y Mercado Pago: qué es y qué no es',
  tag: 'RENDIMIENTO DEL SALDO',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'cuenta remunerada uruguay, rendimientos mercado pago uruguay, inversion violeta prex, rendimiento saldo billetera uruguay, fondo de liquidez inmediata, bind ahorro pesos, interes por tener plata en la cuenta uruguay, plazo fijo vs rendimiento diario uruguay',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Cuenta remunerada y rendimiento del saldo',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'ItemList',
            name: 'Productos que pagan rendimiento sobre el saldo en Uruguay',
            itemListElement: products.map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: `${p.name} — ${p.provider}`,
            })),
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqs.map(f => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/<[^>]+>/g, '') },
            })),
          },
        ],
      }),
    },
  ],
}))

// ── Formatting ──
function fmtNum(n: number): string {
  return (Math.round(n * 100) / 100).toString().replace('.', ',')
}
function fmtPlain(n: number): string {
  return Math.round(n || 0).toString()
}
function fmtPesos(n: number): string {
  return Math.round(n || 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${Number(d)}/${Number(m)}/${y}` : iso
}
</script>

<style scoped>
.yield-page {
  overflow-x: hidden;
}

/* Hero */
.hero-card {
  border-radius: 16px;
}
.hero {
  position: relative;
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(124, 58, 237, 0.38), transparent 55%),
    radial-gradient(120% 160% at 0% 100%, rgba(5, 150, 105, 0.3), transparent 55%),
    linear-gradient(135deg, #241243 0%, #16203a 55%, #0a2c25 100%);
}
.hero-eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  font-weight: 700;
  color: #d8b4fe;
  margin-bottom: 0.5rem;
}
.hero-title {
  color: #fff;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-size: clamp(1.5rem, 4.4vw, 2.5rem);
  margin-bottom: 0.75rem;
  text-wrap: balance;
}
.hero-title-accent {
  display: block;
  font-size: 0.6em;
  font-weight: 600;
  color: #cfe9ff;
  margin-top: 0.2rem;
}
.hero-lead {
  color: rgba(255, 255, 255, 0.9);
  max-width: 760px;
  line-height: 1.6;
  font-size: 1rem;
  margin-bottom: 0.5rem;
}
.hero-meta {
  margin-top: 0.75rem;
}
.hero-spoiler {
  display: inline-flex;
  align-items: flex-start;
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.82rem;
  line-height: 1.5;
}

/* The law quote */
.law-quote {
  border-left: 4px solid rgb(var(--v-theme-primary));
  padding: 0.75rem 0 0.75rem 1rem;
  margin: 0 0 1rem;
}
.law-quote-text {
  font-size: clamp(1.35rem, 4vw, 1.9rem);
  font-weight: 800;
  letter-spacing: -0.01em;
  margin-bottom: 0.35rem;
}
.law-quote-src {
  font-size: 0.8rem;
  opacity: 0.7;
}
.norm-quote {
  border-left: 3px solid rgba(var(--v-theme-primary), 0.5);
  padding-left: 0.75rem;
  font-style: italic;
  font-size: 0.9rem;
}

/* Is / is not */
.split-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.9rem;
}
.split-box {
  border: 1px solid rgba(var(--v-border-color), 0.22);
  border-radius: 12px;
  padding: 1rem 1.1rem;
}
.split-box--no {
  border-left: 4px solid rgb(var(--v-theme-error));
}
.split-box--si {
  border-left: 4px solid rgb(var(--v-theme-success));
}
.split-tag {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.7;
  margin-bottom: 0.5rem;
}
.split-list {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.65;
}

/* Product cards */
.prod-card {
  border-radius: 12px;
}
.prod-provider {
  font-weight: 500;
  opacity: 0.7;
  font-size: 0.9rem;
}
.table-scroll {
  overflow-x: auto;
}
.spec {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}
.spec th,
.spec td {
  text-align: left;
  vertical-align: top;
  padding: 0.6rem 0.7rem;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.16);
  line-height: 1.55;
}
.spec th {
  width: 12rem;
  font-weight: 700;
  white-space: nowrap;
}

/* Calculator */
.calc-card {
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 14px;
}
.breakdown {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}
.breakdown td {
  padding: 0.5rem 0.4rem;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.16);
}
.breakdown .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.breakdown .subtotal td,
.breakdown .total td {
  font-weight: 700;
}
.breakdown .total td {
  border-bottom: none;
  font-size: 1.02rem;
}
.breakdown .muted {
  opacity: 0.65;
  font-size: 0.85em;
}
.pos {
  color: rgb(var(--v-theme-success));
}
.neg {
  color: rgb(var(--v-theme-error));
}
.calc-headline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.9rem;
}
.calc-pill {
  display: inline-flex;
  align-items: baseline;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
  border-radius: 999px;
  background: rgba(var(--v-theme-success), 0.14);
}
.calc-pill--neg {
  background: rgba(var(--v-theme-error), 0.14);
}
.calc-pill-num {
  font-size: 1.35rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.calc-pill-lbl {
  font-size: 0.8rem;
  opacity: 0.8;
}

/* Benchmarks */
.bench {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}
.bench th,
.bench td {
  text-align: left;
  vertical-align: top;
  padding: 0.6rem 0.7rem;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.16);
  line-height: 1.55;
}
.bench th.num,
.bench td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.bench-row--live {
  background: rgba(var(--v-theme-primary), 0.06);
}
.yes {
  color: rgb(var(--v-theme-success));
  font-weight: 700;
}
.no {
  color: rgb(var(--v-theme-error));
  font-weight: 700;
}

/* Shared bits */
.pros,
.cons {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.6;
}
.pros li,
.cons li {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  margin-bottom: 0.2rem;
}
.tips {
  list-style: none;
  padding: 0;
  margin: 0;
}
.tips li {
  display: flex;
  align-items: flex-start;
  margin-bottom: 0.85rem;
  font-size: 0.92rem;
  line-height: 1.6;
}
.src-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  margin-right: 0.9rem;
  opacity: 0.75;
  text-decoration: none;
}
.src-link:hover {
  opacity: 1;
  text-decoration: underline;
}
.sources {
  padding-left: 1.1rem;
  font-size: 0.85rem;
  line-height: 1.7;
}
.muted {
  opacity: 0.65;
}
.myth {
  border-left: 4px solid rgb(var(--v-theme-error));
}
</style>
