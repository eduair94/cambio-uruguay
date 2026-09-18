<template>
  <VContainer class="miles-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3">
      <VBtn
        :to="localePath('/cuenta-remunerada-uruguay')"
        variant="text"
        size="small"
        class="cu-btn-flush"
      >
        <VIcon start size="small">mdi-arrow-left</VIcon>
        La plata que rinde sola
      </VBtn>
    </div>

    <!-- Hero -->
    <VCard class="overflow-hidden mb-5 hero-card on-dark" elevation="8">
      <div class="hero pa-6 pa-md-8">
        <p class="hero-eyebrow">Millas Volar · Setiembre 2026</p>
        <h1 class="hero-title">
          ¿Cuánto vale una milla de Itaú?
          <span class="hero-title-accent"> Itaú no lo publica, así que hay que despejarlo </span>
        </h1>
        <p class="hero-lead">
          La maniobra: dejar la plata rindiendo en Prex o Mercado Pago y pasarla a Itaú sólo para
          comprar, para que las compras acumulen millas. A diferencia de pagar todo con crédito,
          <strong>ésta puede dejar plata de verdad</strong>: con la Volar de débito cobrás las tres
          cosas a la vez —el rendimiento, los dos puntos de IVA y las millas—. Lo único que no se
          puede calcular es cuánto valen esas millas, porque
          <strong>Itaú no tarifa la milla en ningún lado</strong>. Acá está el umbral que tiene que
          superar la tuya, y cómo medirla en una consulta.
        </p>
        <div class="hero-meta">
          <span class="hero-spoiler">
            <VIcon size="16" class="mr-2">mdi-information-outline</VIcon>
            <span>
              Con débito el umbral son centavos. Con crédito hay que creerle mucho más a la milla.
            </span>
          </span>
        </div>
        <div class="d-flex justify-start justify-md-end mt-4">
          <ShareButtons text="Itaú no publica cuánto vale una milla Volar: así se despeja" />
        </div>
      </div>
    </VCard>

    <!-- The missing number -->
    <VCard variant="flat" class="pa-4 pa-sm-5 mb-5">
      <h2 class="text-h6 font-weight-bold mb-3">El dato que falta, y por qué falta</h2>
      <p class="text-body-2 mb-3">
        Volar publica con precisión cuántas millas ganás y no publica cuánto valen. La ficha del
        producto lo dice con todas las letras:
        <em
          >«sin ratio oficial publicado; el valor efectivo por milla depende del ítem canjeado en el
          catálogo»</em
        >. Por eso Volar está en la lista de programas cuyo rendimiento
        <strong>literalmente no se puede calcular</strong>, junto a OCA Metraje y Credipuntos.
      </p>
      <div class="known-grid">
        <div class="known-box known-box--yes">
          <div class="known-tag">Lo que sí se sabe</div>
          <ul class="known-list">
            <li v-for="r in MILES_EARN" :key="r.card">
              <strong>{{ r.label }}</strong
              >: 1 milla cada US${{ r.usdPerMile }}
            </li>
            <li>Anualidad del crédito: UI {{ ITAU_ANNUAL_FEE_UI }} ≈ ${{ fmtPesos(annualFee) }}</li>
            <li>Las millas vencen a los 5 años</li>
          </ul>
        </div>
        <div class="known-box known-box--no">
          <div class="known-tag">Lo que no se publica</div>
          <ul class="known-list">
            <li>Cuánto vale una milla en pesos</li>
            <li>Cuántas millas pide cada pasaje, sin entrar al catálogo</li>
            <li>Si esa relación cambia entre un canje y otro</li>
          </ul>
        </div>
      </div>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        No inventamos un valor de milla ni acá ni en el ranking de tarjetas. Lo que hacemos es
        despejar cuánto tendría que valer para que la maniobra cierre, que es una afirmación que se
        puede verificar.
      </p>
    </VCard>

    <!-- Calculator 1: what is YOUR mile worth -->
    <VCard id="valor-milla" variant="flat" class="calc-card pa-4 pa-sm-5 mb-5">
      <div class="d-flex align-center ga-2 mb-1">
        <VIcon size="20" color="primary">mdi-airplane-search</VIcon>
        <h2 class="text-h6 font-weight-bold mb-0">Medí cuánto vale TU milla</h2>
      </div>
      <p class="text-caption text-medium-emphasis mb-4">
        Una sola consulta al catálogo: buscá el pasaje que realmente canjearías, mirá cuántas millas
        pide y cuánto sale ese mismo pasaje en pesos. La división es el valor de tu milla. No el
        valor en abstracto: el que compra en el canje que vos harías.
      </p>
      <VRow dense>
        <VCol cols="12" sm="6">
          <VTextField
            v-model.number="redemptionPrice"
            type="number"
            min="0"
            step="1000"
            label="Lo que sale ese pasaje en pesos"
            prefix="$"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6">
          <VTextField
            v-model.number="redemptionMiles"
            type="number"
            min="0"
            step="1000"
            label="Millas que pide"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
      </VRow>
      <div class="mile-out mt-4">
        <div class="mile-cell">
          <span class="mile-lbl">Tu milla vale</span>
          <span class="mile-num">
            {{ measuredValue === null ? '—' : `$ ${fmtMile(measuredValue)}` }}
          </span>
        </div>
        <VBtn
          size="small"
          variant="flat"
          color="primary"
          :disabled="measuredValue === null"
          @click="useMeasured"
        >
          Usar en la cuenta de abajo
        </VBtn>
      </div>
    </VCard>

    <!-- Calculator 2: the strategy -->
    <VCard id="calculadora" variant="flat" class="calc-card pa-4 pa-sm-5 mb-5">
      <div class="d-flex align-center ga-2 mb-1">
        <VIcon size="20" color="primary">mdi-calculator-variant-outline</VIcon>
        <h2 class="text-h6 font-weight-bold mb-0">¿Te deja plata la maniobra?</h2>
      </div>

      <VBtnToggle
        v-model="card"
        mandatory
        divided
        density="comfortable"
        variant="outlined"
        class="calc-modes mt-3 mb-3"
      >
        <VBtn value="debito" size="small">Con débito Volar</VBtn>
        <VBtn value="credito" size="small">Con crédito Volar</VBtn>
      </VBtnToggle>

      <p v-if="card === 'debito'" class="text-caption text-medium-emphasis mb-4">
        Con débito no resignás nada: conservás los dos puntos de IVA y la plata rinde hasta que la
        pasás al banco. Lo único que cuesta es el rendimiento del saldo que queda parado en Itaú
        esperando las compras, y eso lo decidís vos con la frecuencia con la que movés la plata.
      </p>
      <p v-else class="text-caption text-medium-emphasis mb-4">
        Con crédito acumulás el doble de millas y no tenés que adelantar la plata —se paga al
        vencimiento, así que hasta rinde de más—, pero resignás los dos puntos de IVA y pagás la
        anualidad. Las dos cosas juntas suben mucho el umbral.
      </p>

      <VRow dense>
        <VCol cols="12" sm="6" md="3">
          <VTextField
            v-model.number="monthlySpend"
            type="number"
            min="0"
            step="1000"
            label="Gasto mensual con la tarjeta"
            prefix="$"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="6" md="3">
          <VTextField
            v-model.number="usdRate"
            type="number"
            min="1"
            step="0.5"
            label="Dólar"
            prefix="$"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol v-if="card === 'debito'" cols="6" sm="6" md="3">
          <VTextField
            v-model.number="transfersPerMonth"
            type="number"
            min="1"
            step="1"
            label="Veces que pasás plata por mes"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol v-else cols="6" sm="6" md="3">
          <VTextField
            v-model.number="annualCardFee"
            type="number"
            min="0"
            step="100"
            label="Anualidad de la tarjeta"
            prefix="$"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="6" md="3">
          <VTextField
            v-model.number="mileValue"
            type="number"
            min="0"
            step="0.05"
            label="Lo que vale tu milla"
            prefix="$"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
      </VRow>

      <div class="calc-result mt-4">
        <table class="breakdown">
          <tbody>
            <tr>
              <td>Millas que juntás por mes</td>
              <td class="num">{{ fmtPesos(result.milesPerMonth) }}</td>
            </tr>
            <tr>
              <td>En un año</td>
              <td class="num">{{ fmtPesos(result.milesPerYear) }}</td>
            </tr>
            <tr v-if="card === 'debito'">
              <td>
                Rendimiento que perdés
                <span class="muted">
                  (${{ fmtPesos(result.averageIdleUyu) }} parados en el banco)
                </span>
              </td>
              <td class="num neg">− $ {{ fmtPesos(result.lostYieldUyu) }}</td>
            </tr>
            <tr v-if="card === 'credito'">
              <td>Rinde de más hasta el vencimiento</td>
              <td class="num pos">+ $ {{ fmtPesos(result.floatGainUyu) }}</td>
            </tr>
            <tr v-if="result.ivaForgoneUyu > 0">
              <td>IVA que resignás <span class="muted">(2 puntos, sólo débito)</span></td>
              <td class="num neg">− $ {{ fmtPesos(result.ivaForgoneUyu) }}</td>
            </tr>
            <tr v-if="result.cardFeeMonthlyUyu > 0">
              <td>Anualidad, prorrateada</td>
              <td class="num neg">− $ {{ fmtPesos(result.cardFeeMonthlyUyu) }}</td>
            </tr>
            <tr class="total">
              <td>Tu milla tiene que valer al menos</td>
              <td class="num">
                {{
                  result.breakEvenMileValueUyu === null
                    ? '—'
                    : `$ ${fmtMile(result.breakEvenMileValueUyu)}`
                }}
              </td>
            </tr>
            <tr v-if="result.netUyu !== null" class="year-row">
              <td>Con la milla a $ {{ fmtMile(mileValue) }}, te queda por mes</td>
              <td class="num" :class="result.netUyu >= 0 ? 'pos' : 'neg'">
                {{ result.netUyu >= 0 ? '+' : '−' }} $ {{ fmtPesos(Math.abs(result.netUyu)) }}
              </td>
            </tr>
          </tbody>
        </table>

        <VAlert
          :type="result.verdict === 'conviene' ? 'success' : 'warning'"
          variant="tonal"
          density="comfortable"
          border="start"
          class="mt-4"
        >
          <template v-if="result.verdict === 'conviene'">
            Deja <strong>$ {{ fmtPesos(result.netUyu || 0) }} por mes</strong>, o $
            {{ fmtPesos((result.netUyu || 0) * 12) }} al año. Tu milla vale $
            {{ fmtMile(mileValue) }} y el umbral era $
            {{ fmtMile(result.breakEvenMileValueUyu || 0) }}.
          </template>
          <template v-else-if="result.verdict === 'no-conviene'">
            No cierra: tu milla vale $ {{ fmtMile(mileValue) }} y haría falta que valiera
            <strong>$ {{ fmtMile(result.breakEvenMileValueUyu || 0) }}</strong
            >. Cuesta $ {{ fmtPesos(Math.abs(result.netUyu || 0)) }} por mes.
          </template>
          <template v-else>
            Sin el valor de tu milla no hay resultado, y no lo vamos a suponer. Lo único que se
            puede afirmar es el umbral: la milla tiene que valerte más de
            <strong>$ {{ fmtMile(result.breakEvenMileValueUyu || 0) }}</strong> para que esto deje
            plata. Medilo con un canje real arriba.
          </template>
        </VAlert>
      </div>

      <p class="text-caption text-disabled mt-3 mb-0">
        El dólar es un campo editable porque la tasa de Volar está en dólares: cuántas millas junta
        el mismo sueldo depende de la cotización del día. La tasa por defecto del fondo es la TPM
        del BCU en {{ fmtNum(TPM_PCT) }} % anual. No es asesoramiento financiero.
      </p>
    </VCard>

    <!-- The lever -->
    <VCard variant="flat" class="pa-4 pa-sm-5 mb-5">
      <h2 class="text-h6 font-weight-bold mb-1">La palanca es la frecuencia, no la tarjeta</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Con débito, todo el costo de la maniobra es el rendimiento de la plata parada en el banco. Y
        eso no depende de Itaú: depende de cuántas veces por mes movés plata. La transferencia Prex
        → Itaú es gratis, así que moverla más seguido no cuesta nada y baja el umbral en proporción
        directa.
      </p>
      <div class="table-scroll">
        <table class="lever cu-mobile-cards">
          <thead>
            <tr>
              <th scope="col">Cada cuánto pasás plata</th>
              <th scope="col">Queda parado</th>
              <th scope="col">Rendimiento perdido</th>
              <th scope="col">Tu milla tiene que valer</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in leverRows" :key="row.label">
              <td data-label="Cada cuánto pasás plata">{{ row.label }}</td>
              <td data-label="Queda parado">$ {{ fmtPesos(row.idle) }}</td>
              <td data-label="Rendimiento perdido">$ {{ fmtPesos(row.lost) }} / mes</td>
              <td data-label="Tu milla tiene que valer">
                <strong>${{ fmtMile(row.breakEven) }}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Sobre el gasto y el dólar que pusiste arriba. El límite práctico no es económico sino de
        paciencia: nadie transfiere antes de cada compra.
      </p>
    </VCard>

    <!-- Fine print -->
    <VCard variant="flat" class="pa-4 pa-sm-5 mb-5">
      <h2 class="text-h6 font-weight-bold mb-3">La letra chica que mueve la cuenta</h2>
      <VRow dense>
        <VCol v-for="f in FINEPRINT" :key="f.title" cols="12" md="6">
          <div class="fine-item">
            <VIcon size="18" color="primary" class="mr-2">{{ f.icon }}</VIcon>
            <div>
              <strong>{{ f.title }}</strong>
              <p class="text-body-2 mb-0 mt-1">{{ f.body }}</p>
            </div>
          </div>
        </VCol>
      </VRow>
    </VCard>

    <!-- FAQ -->
    <FaqSection :items="faqs" class="mb-5" />

    <!-- Related -->
    <VCard variant="flat" class="pa-4 pa-sm-5 mb-5">
      <h2 class="text-subtitle-1 font-weight-bold mb-3">Seguí por acá</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn :to="localePath('/cuenta-remunerada-uruguay')" variant="tonal" size="small">
          <VIcon start size="small">mdi-chart-line</VIcon>Qué rinde tu saldo
        </VBtn>
        <VBtn
          :to="localePath('/conviene-pagar-todo-con-credito-uruguay')"
          variant="tonal"
          size="small"
        >
          <VIcon start size="small">mdi-credit-card-clock-outline</VIcon>Pagar todo con crédito
        </VBtn>
        <VBtn :to="localePath('/tarjetas-de-credito-uruguay')" variant="tonal" size="small">
          <VIcon start size="small">mdi-credit-card-outline</VIcon>Ranking de tarjetas
        </VBtn>
        <VBtn :to="localePath('/comisiones-de-transferencia-uruguay')" variant="tonal" size="small">
          <VIcon start size="small">mdi-bank-transfer</VIcon>Comisiones de transferencia
        </VBtn>
      </div>
    </VCard>

    <!-- Sources -->
    <VCard variant="flat" class="pa-4 pa-sm-5">
      <div class="d-flex align-center ga-2 mb-2">
        <VIcon size="18" color="primary">mdi-book-open-variant</VIcon>
        <h2 class="text-subtitle-1 font-weight-bold mb-0">Fuentes</h2>
      </div>
      <p class="text-caption text-medium-emphasis mb-3">
        Verificado el {{ fmtDate(MILES_STRATEGY_VERIFIED_AT) }}. La anualidad se convierte con la UI
        del {{ fmtDate(ITAU_ANNUAL_FEE_UI_DATE) }}. Tarifarios y catálogos cambian: confirmá antes
        de decidir.
      </p>
      <ul class="src-list">
        <li v-for="s in SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer" class="src-link">
            <VIcon size="12">mdi-open-in-new</VIcon>{{ s.label }}
          </a>
        </li>
      </ul>
    </VCard>
  </VContainer>
</template>

<script setup lang="ts">
import {
  ITAU_ANNUAL_FEE_UI,
  ITAU_ANNUAL_FEE_UI_DATE,
  MILES_EARN,
  MILES_STRATEGY_VERIFIED_AT,
  estimateMilesStrategy,
  itauAnnualFeeUyu,
  mileValueFromRedemption,
} from '~/utils/milesStrategy'
import { TPM_PCT } from '~/utils/yieldAccounts'

const localePath = useLocalePath()

const annualFee = itauAnnualFeeUyu()

// ── Calculadora 1: el valor de la milla ──
//
// Arranca vacía. Un canje de ejemplo precargado parece inofensivo, pero un click
// en «Usar» lo convertía en un «deja $ 323 por mes» armado con números que nadie
// midió: exactamente el dato inventado que esta página existe para no publicar.
const redemptionPrice = ref<number>(0)
const redemptionMiles = ref<number>(0)

const measuredValue = computed(() =>
  mileValueFromRedemption(redemptionPrice.value || 0, redemptionMiles.value || 0)
)

function useMeasured() {
  if (measuredValue.value !== null) mileValue.value = Math.round(measuredValue.value * 100) / 100
}

// ── Calculadora 2: la maniobra ──
//
// El valor de la milla arranca en cero a propósito: sin ese dato la página no
// tiene resultado que mostrar, y poner un supuesto de arranque sería exactamente
// lo que Itaú no publica y nosotros no vamos a inventar.
const card = ref<'debito' | 'credito'>('debito')
const monthlySpend = ref<number>(42000)
const usdRate = ref<number>(40)
const transfersPerMonth = ref<number>(1)
const annualCardFee = ref<number>(Math.round(annualFee))
const mileValue = ref<number>(0)

const result = computed(() =>
  estimateMilesStrategy({
    monthlySpendUyu: monthlySpend.value || 0,
    card: card.value,
    usdRateUyu: usdRate.value || 0,
    transfersPerMonth: transfersPerMonth.value || 1,
    annualRatePct: TPM_PCT,
    feeAnnualPct: 0,
    annualCardFeeUyu: card.value === 'credito' ? annualCardFee.value || 0 : 0,
    cycle: { cycleDays: 30, graceDays: 10 },
    mileValueUyu: mileValue.value || undefined,
  })
)

/** La tabla de la palanca: el mismo gasto movido con distinta frecuencia. */
const leverRows = computed(() =>
  [
    { label: 'Una vez por mes', n: 1 },
    { label: 'Cada quince días', n: 2 },
    { label: 'Una vez por semana', n: 4 },
    { label: 'Día por medio', n: 15 },
  ].map(row => {
    const r = estimateMilesStrategy({
      monthlySpendUyu: monthlySpend.value || 0,
      card: 'debito',
      usdRateUyu: usdRate.value || 0,
      transfersPerMonth: row.n,
      annualRatePct: TPM_PCT,
      feeAnnualPct: 0,
      annualCardFeeUyu: 0,
    })
    return {
      label: row.label,
      idle: r.averageIdleUyu,
      lost: r.lostYieldUyu,
      breakEven: r.breakEvenMileValueUyu ?? 0,
    }
  })
)

// ── Static content ──
const FINEPRINT = [
  {
    icon: 'mdi-airplane-off',
    title: 'Hay gasto que no acumula',
    body: 'No acumulan los retiros de efectivo, los préstamos a tasa cero, los intereses y cargos del banco ni los pagos por Abitab o Redpagos. Si buena parte de tu gasto pasa por redes de cobranza, la cuenta de arriba está sobreestimando las millas.',
  },
  {
    icon: 'mdi-earth-off',
    title: 'Comprar afuera se come la milla',
    body: 'El recargo por compras en el exterior es de 3 % + IVA (~3,66 %), y en Visa hay un 3 % adicional sobre el tipo de cambio de Visa Internacional. Entre las dos cosas se llevan varias veces lo que la milla devuelve, justo en el gasto que la tarjeta promete premiar. Lo baja el paquete de cuentas, no la tarjeta: con Paquete Full es 1 % + IVA y con Personal Bank no hay recargo.',
  },
  {
    icon: 'mdi-calendar-clock',
    title: 'Las millas vencen a los 5 años',
    body: 'Las bases vigentes dicen cinco años. Hay un PDF alojado en el sitio de Itaú que dice 24 meses, pero es de 2013 y ni menciona la tasa de débito. Publicamos el de las bases vigentes.',
  },
  {
    icon: 'mdi-account-lock-outline',
    title: 'Canjea sólo el titular',
    body: 'Los adicionales no canjean, y las millas se acreditan dentro de los 10 días hábiles posteriores al cierre. Si el gasto de la casa pasa por una adicional, las millas las junta el titular pero el canje también depende de él.',
  },
  {
    icon: 'mdi-swap-horizontal-bold',
    title: 'Adherir el crédito a Volar apaga otros programas',
    body: 'Al adherir la tarjeta de crédito a Volar dejás de acumular en los otros programas del banco, LATAM entre ellos. No son acumulables: es elegir uno.',
  },
  {
    icon: 'mdi-cash-remove',
    title: 'La anualidad del crédito no es chica',
    body: `El primer año es sin costo; después son UI ${ITAU_ANNUAL_FEE_UI} al año, que al valor de la UI publicado son unos $${fmtPesos(annualFee)}, en tres cuotas con IVA incluido. Prorrateada son casi $${fmtPesos(annualFee / 12)} por mes: casi la mitad de lo que las millas tienen que cubrir en el escenario de crédito. Para el débito no encontramos una anualidad publicada aparte, así que el cálculo la deja en cero.`,
  },
]

const faqs = [
  {
    id: 'cuanto-vale-la-milla',
    question: '¿Cuánto vale una milla Volar en pesos?',
    answer:
      'Itaú no lo publica. La ficha del producto dice que no hay ratio oficial y que el valor efectivo depende del ítem que canjees, así que cualquier cifra fija que veas por ahí es de alguien que la estimó, no del emisor. Por eso Volar está en la lista de programas cuyo rendimiento no se puede calcular, junto a OCA Metraje y Credipuntos. La única medición honesta es la tuya: tomá el pasaje que realmente canjearías, dividí su precio en pesos entre las millas que pide y ése es el valor de tu milla.',
  },
  {
    id: 'debito-acumula',
    question: '¿El débito de Itaú también acumula millas?',
    answer:
      'Sí, a la mitad de la tasa: una milla cada US$2, contra una cada US$1 del crédito. Es el dato que cambia toda la estrategia, porque con débito conservás la rebaja de dos puntos de IVA de la Ley 19.210, que con crédito se pierde. Cobrás rendimiento, IVA y millas al mismo tiempo.',
  },
  {
    id: 'cuanto-deja',
    question: 'Entonces, ¿esta maniobra sí genera dinero?',
    answer:
      'Con débito, sí, siempre que la milla valga más que el umbral, y el umbral es bajo: con un gasto de $42.000 por mes, el dólar a $40 y una transferencia mensual, unos 18 centésimos por milla. Moviendo la plata una vez por semana baja a menos de 5 centésimos. Con crédito el umbral sube a cerca de un peso por milla, porque hay que cubrir los dos puntos de IVA y la anualidad antes de empezar a ganar.',
  },
  {
    id: 'cada-cuanto-transferir',
    question: '¿Cada cuánto conviene pasar la plata a Itaú?',
    answer:
      'Lo más seguido que te banques. La transferencia Prex a Itaú es gratis en las dos direcciones, así que el único límite es la paciencia: cada vez que la movés a la mitad de frecuencia, dejás el doble de plata parada sin rendir. Pasar una vez por mes deja parada, en promedio, la mitad del gasto del mes.',
  },
  {
    id: 'vale-la-pena-el-esfuerzo',
    question: '¿Vale la pena el trabajo que da?',
    answer:
      'Depende de la escala de tu gasto y de cuánto te moleste administrar transferencias. Sobre gastos chicos estamos hablando de decenas de pesos por mes, que es real pero no cambia nada. Lo que sí conviene revisar antes es si el gasto que pensás pasar por la tarjeta acumula: los pagos por redes de cobranza, los retiros y los cargos del banco quedan afuera.',
    link: { to: '/tarjetas-de-credito-uruguay', label: 'Ver el ranking de tarjetas' },
  },
]

const SOURCES = [
  {
    label: 'Itaú — Programa Volar: tasas de acumulación en crédito y débito',
    url: 'https://www.itau.com.uy/inst/millasItauVolar.html',
  },
  {
    label: 'Itaú — Manual de tarifas: anualidad de la línea Internacional (UI 864)',
    url: 'https://www.itau.com.uy/inst/aci/docs/tarifario.pdf',
  },
  {
    label: 'Tienda Volar — bases vigentes del programa (vencimiento de las millas)',
    url: 'https://www.tiendavolar.com.uy/',
  },
  {
    label: 'DGI — Reducción de IVA para adquisiciones abonadas con medios electrónicos',
    url: 'https://www.gub.uy/direccion-general-impositiva/tramites-y-servicios/servicios/reduccion-iva-para-adquisiciones-que-se-abonen-traves-medios',
  },
  {
    label: 'Cartilla de uso Prex (Econstar S.A.) — la transferencia a Itaú es gratis',
    url: 'https://www.prexcard.com/html/cartillaUso',
  },
  {
    label: 'INE — valor de la Unidad Indexada',
    url: 'https://www5.ine.gub.uy/web/guest/unidad-indexada',
  },
]

// ── SEO ──
const canonicalUrl = 'https://cambio-uruguay.com/cuanto-vale-una-milla-itau-uruguay'
const title = '¿Cuánto vale una milla de Itaú?'
const description =
  'Itaú no publica cuánto vale una milla Volar. Acá está el umbral que tiene que superar la tuya para que rinda dejar la plata en Prex o Mercado Pago y pasarla a Itaú sólo para comprar, y cómo medir la tuya con un canje real.'

defineOgImageComponent('Cambio', {
  title: 'Cuánto vale una milla de Itaú',
  subtitle: 'El número que el emisor no publica',
  tag: 'MILLAS VOLAR',
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
        'cuanto vale una milla itau, millas volar itau uruguay, itau volar debito millas, canjear millas itau pasajes, acumular millas con debito uruguay, prex itau millas, anualidad itau volar',
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
                name: 'Cuánto vale una milla de Itaú',
                item: canonicalUrl,
              },
            ],
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
function fmtMile(n: number): string {
  return (Math.round((n || 0) * 10000) / 10000).toString().replace('.', ',')
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
.miles-page {
  overflow-x: hidden;
}

/* Hero */
.hero-card {
  border-radius: 16px;
}
.hero {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, #1f2a44 100%);
  color: #fff;
}
.hero-eyebrow {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.85;
  margin-bottom: 0.5rem;
}
.hero-title {
  font-size: clamp(1.45rem, 4vw, 2.1rem);
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 0.75rem;
}
.hero-title-accent {
  display: block;
  font-weight: 600;
  opacity: 0.92;
  font-size: 0.82em;
}
.hero-lead {
  font-size: 0.98rem;
  line-height: 1.6;
  max-width: 62ch;
  margin-bottom: 1rem;
}
.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}
.hero-spoiler {
  display: inline-flex;
  align-items: flex-start;
  padding: 0.5rem 0.8rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 0.86rem;
  line-height: 1.45;
}

/* Known vs unknown */
.known-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
@media (max-width: 720px) {
  .known-grid {
    grid-template-columns: 1fr;
  }
}
.known-box {
  border-radius: 12px;
  padding: 1rem 1.1rem;
  border: 1px solid rgba(var(--v-border-color), 0.2);
}
.known-box--yes {
  background: rgba(var(--v-theme-success), 0.08);
}
.known-box--no {
  background: rgba(var(--v-theme-error), 0.08);
}
.known-tag {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.75;
  margin-bottom: 0.4rem;
}
.known-list {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.88rem;
  line-height: 1.7;
}

/* Calculators */
.calc-card {
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 14px;
}
.calc-modes {
  border-radius: 999px;
  overflow: hidden;
}
.mile-out {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.4rem;
}
.mile-cell {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.mile-lbl {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.7;
}
.mile-num {
  font-size: 1.6rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-primary));
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
.breakdown .total td {
  font-weight: 700;
  font-size: 1.02rem;
  border-bottom: none;
}
.breakdown .year-row td {
  border-bottom: none;
  border-top: 1px dashed rgba(var(--v-border-color), 0.4);
  padding-top: 0.7rem;
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

/* Lever table */
.table-scroll {
  overflow-x: auto;
}
.lever {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}
.lever th,
.lever td {
  text-align: left;
  vertical-align: top;
  padding: 0.6rem 0.7rem;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.16);
}
.lever th {
  font-weight: 700;
  white-space: nowrap;
}

/* Fine print */
.fine-item {
  display: flex;
  align-items: flex-start;
  padding: 0.75rem 0;
}

/* Sources */
.src-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.src-list li {
  margin-bottom: 0.4rem;
}
.src-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}
.src-link:hover {
  text-decoration: underline;
}
</style>
