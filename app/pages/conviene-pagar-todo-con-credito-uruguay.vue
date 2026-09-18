<template>
  <VContainer class="float-page pb-8">
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
        <p class="hero-eyebrow">La maniobra del flote · Setiembre 2026</p>
        <h1 class="hero-title">
          ¿Conviene pagar todo con la tarjeta de crédito
          <span class="hero-title-accent">y dejar la plata rindiendo hasta el vencimiento?</span>
        </h1>
        <p class="hero-lead">
          La idea suena impecable: el saldo rinde en Prex o en Mercado Pago, la tarjeta no cobra
          nada por esperar, y recién el día del vencimiento transferís lo justo para pagarla. Plata
          gratis por administrar fechas. Pero hay una cuenta del otro lado:
          <strong>pagar con crédito resigna la rebaja de dos puntos de IVA</strong>, que es sólo de
          débito y dinero electrónico. En compras comunes eso es
          <strong>1,64 % del ticket</strong> contra un flote que rinde décimas.
        </p>
        <div class="hero-meta">
          <span class="hero-spoiler">
            <VIcon size="16" class="mr-2">mdi-information-outline</VIcon>
            <span>
              Conviene en dos casos concretos y pierde en el resto. Acá está cuáles, con tus
              números.
            </span>
          </span>
        </div>
        <div class="d-flex justify-start justify-md-end mt-4">
          <ShareButtons
            text="Pagar todo con crédito para que la plata rinda: la cuenta que casi nadie hace"
          />
        </div>
      </div>
    </VCard>

    <!-- The one-line arithmetic -->
    <VCard variant="flat" class="pa-4 pa-sm-5 mb-5">
      <h2 class="text-h6 font-weight-bold mb-3">La cuenta, en dos números</h2>
      <div class="versus">
        <div class="versus-box versus-box--cost">
          <div class="versus-tag">Lo que resignás</div>
          <div class="versus-num">1,64 %</div>
          <p class="versus-txt">
            del ticket, en cada compra común. La rebaja de dos puntos de IVA de la
            <strong>Ley 19.210 art. 87</strong> corre sólo con débito, dinero electrónico o
            instrumentos análogos. Con crédito no corresponde, ni en un pago ni en veinticuatro.
          </p>
        </div>
        <div class="versus-vs">contra</div>
        <div class="versus-box versus-box--gain">
          <div class="versus-tag">Lo que ganás</div>
          <div class="versus-num">{{ fmtNum(gainPctOfSpend) }} %</div>
          <p class="versus-txt">
            del gasto, por dejarlo rindiendo {{ fmtPlain(floatDays) }} días a
            {{ fmtNum(ratePct) }} % anual. Es el promedio del ciclo, no el plazo del vencimiento: la
            compra del día 1 espera casi un ciclo más que la del último.
          </p>
        </div>
      </div>
      <VAlert type="warning" variant="tonal" density="comfortable" border="start" class="mt-4">
        Para empatar esos dos puntos de IVA harían falta
        <strong>{{ fmtPlain(breakEvenGeneralDays) }} días</strong> de flote. Un ciclo de tarjeta da
        {{ fmtPlain(floatDays) }}.
      </VAlert>
    </VCard>

    <!-- Calculator -->
    <VCard id="calculadora" variant="flat" class="calc-card pa-4 pa-sm-5 mb-5">
      <div class="d-flex align-center ga-2 mb-1">
        <VIcon size="20" color="primary">mdi-calculator-variant-outline</VIcon>
        <h2 class="text-h6 font-weight-bold mb-0">Cuánto te deja —o te cuesta— con tu ingreso</h2>
      </div>
      <p class="text-caption text-medium-emphasis mb-4">
        Todo se mide sobre el mismo mes de gasto: lo que el flote rinde contra lo que la rebaja de
        IVA habría descontado. Comparar la ganancia de un año contra la rebaja de un mes es el error
        que hace que la maniobra parezca buena.
      </p>

      <VRow dense>
        <VCol cols="12" sm="6" md="3">
          <VTextField
            v-model.number="ingreso"
            type="number"
            min="0"
            step="1000"
            label="Tu ingreso mensual"
            prefix="$"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="6" md="3">
          <VTextField
            v-model.number="cardPct"
            type="number"
            min="0"
            max="100"
            step="5"
            label="Cuánto pasa por la tarjeta"
            suffix="%"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="6" md="3">
          <VTextField
            v-model.number="gastroPct"
            type="number"
            min="0"
            max="100"
            step="5"
            label="De eso, gastronomía y turismo"
            suffix="%"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="6" md="3">
          <VTextField
            v-model.number="lostDiscountPct"
            type="number"
            min="0"
            max="100"
            step="1"
            label="Descuento que perdés"
            suffix="%"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
      </VRow>

      <VRow dense class="mt-1">
        <VCol cols="6" sm="6" md="3">
          <VTextField
            v-model.number="cycleDays"
            type="number"
            min="1"
            step="1"
            label="Días del ciclo"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="6" md="3">
          <VTextField
            v-model.number="graceDays"
            type="number"
            min="0"
            step="1"
            label="Del cierre al vencimiento"
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
            label="Comisión del fondo"
            suffix="%"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
      </VRow>

      <VSelect
        v-model="routeId"
        :items="routeItems"
        item-title="title"
        item-value="value"
        label="Por dónde volvés la plata para pagar"
        density="comfortable"
        variant="outlined"
        hide-details
        class="mt-3"
      />

      <div class="calc-result mt-4">
        <table class="breakdown">
          <tbody>
            <tr>
              <td>
                Rinde el gasto común
                <span class="muted">($ {{ fmtPesos(spendGeneral) }} por mes)</span>
              </td>
              <td class="num pos">+ $ {{ fmtPesos(general.floatGainUyu) }}</td>
            </tr>
            <tr>
              <td>IVA que resignás <span class="muted">(2 puntos, sólo débito)</span></td>
              <td class="num neg">− $ {{ fmtPesos(general.ivaForgoneUyu) }}</td>
            </tr>
            <tr v-if="general.discountForgoneUyu + gastro.discountForgoneUyu > 0">
              <td>
                Descuentos que perdés
                <span class="muted">({{ fmtNum(lostDiscountPct) }}% del gasto)</span>
              </td>
              <td class="num neg">
                − $ {{ fmtPesos(general.discountForgoneUyu + gastro.discountForgoneUyu) }}
              </td>
            </tr>
            <tr>
              <td>
                Rinde gastronomía y turismo
                <span class="muted">($ {{ fmtPesos(spendGastro) }}, sin resignar IVA)</span>
              </td>
              <td class="num pos">+ $ {{ fmtPesos(gastro.floatGainUyu) }}</td>
            </tr>
            <tr v-if="routeCostUyu > 0">
              <td>Transferencia para pagar la tarjeta</td>
              <td class="num neg">− $ {{ fmtPesos(routeCostUyu) }}</td>
            </tr>
            <tr class="total">
              <td>Te queda por mes</td>
              <td class="num" :class="monthlyNet >= 0 ? 'pos' : 'neg'">
                {{ monthlyNet >= 0 ? '+' : '−' }} $ {{ fmtPesos(Math.abs(monthlyNet)) }}
              </td>
            </tr>
            <tr class="year-row">
              <td>En un año, repitiendo el mismo mes</td>
              <td class="num" :class="monthlyNet >= 0 ? 'pos' : 'neg'">
                {{ monthlyNet >= 0 ? '+' : '−' }} $ {{ fmtPesos(Math.abs(monthlyNet * 12)) }}
              </td>
            </tr>
          </tbody>
        </table>

        <VAlert
          :type="monthlyNet >= 0 ? 'success' : 'error'"
          variant="tonal"
          density="comfortable"
          border="start"
          class="mt-4"
        >
          <template v-if="monthlyNet >= 0">
            Con esta mezcla la maniobra deja
            <strong>$ {{ fmtPesos(monthlyNet) }} por mes</strong>. Fijate que sale de la parte de
            gastronomía y turismo: es el único tramo donde pagar con crédito no resigna la rebaja.
          </template>
          <template v-else>
            Con esta mezcla la maniobra <strong>cuesta</strong> $
            {{ fmtPesos(Math.abs(monthlyNet)) }} por mes, o $
            {{ fmtPesos(Math.abs(monthlyNet * 12)) }} al año. La rebaja de IVA que resignás pesa más
            que todo lo que el flote rinde. Pagando con el débito de la misma billetera, la plata
            rinde igual hasta el momento de la compra y encima te descuentan los dos puntos.
          </template>
        </VAlert>
      </div>

      <p class="text-caption text-disabled mt-3 mb-0">
        Estimación educativa. La tasa por defecto es la Tasa de Política Monetaria del BCU, en
        {{ fmtNum(TPM_PCT) }} % anual, que es la referencia del papel que compran estos fondos y no
        una tasa prometida: ninguno de los dos productos publica una. El ciclo y el vencimiento
        salen de tu propia tarjeta, no de un promedio inventado. No es asesoramiento financiero.
      </p>
    </VCard>

    <!-- Where it wins -->
    <section class="mb-6" aria-labelledby="donde-title">
      <h2 id="donde-title" class="text-h6 font-weight-bold mb-1">Dónde sí cierra</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        La maniobra no es buena ni mala en abstracto: depende de si pagar con crédito te hace
        resignar algo. En estos tres casos no resignás nada.
      </p>
      <VRow dense>
        <VCol v-for="w in WINS" :key="w.title" cols="12" md="4">
          <VCard variant="outlined" class="pa-4 h-100 win-card">
            <VIcon size="22" color="success" class="mb-2">{{ w.icon }}</VIcon>
            <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ w.title }}</h3>
            <p class="text-body-2 mb-0">{{ w.body }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Routes -->
    <VCard variant="flat" class="pa-4 pa-sm-5 mb-5">
      <h2 class="text-h6 font-weight-bold mb-1">Por dónde vuelve la plata</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        La asimetría que decide la elección: Prex exonera un banco por su nombre y cobra a todos los
        demás; Mercado Pago no le cobra a ninguno, pero tampoco acredita en el día.
      </p>
      <div class="table-scroll">
        <table class="routes cu-mobile-cards">
          <thead>
            <tr>
              <th scope="col">Ruta</th>
              <th scope="col">Transferencia</th>
              <th scope="col">Cuándo llega</th>
              <th scope="col">Mínimo</th>
              <th scope="col">Lo que hay que saber</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in FLOAT_ROUTES" :key="r.id">
              <td data-label="Ruta">
                <strong>{{ r.wallet }}</strong>
                <span class="route-dest">→ {{ r.destination }}</span>
              </td>
              <td data-label="Transferencia">
                <strong :class="r.transferCostUyu === 0 ? 'pos' : 'neg'">
                  {{ r.transferCostUyu === 0 ? 'Gratis' : `$ ${fmtPesos(r.transferCostUyu)}` }}
                </strong>
                <span class="route-quote">“{{ r.quote }}”</span>
              </td>
              <td data-label="Cuándo llega">{{ r.settlement }}</td>
              <td data-label="Mínimo">
                {{ r.minFirstUyu ? `$ ${fmtPesos(r.minFirstUyu)} la primera vez` : 'Sin mínimo' }}
              </td>
              <td data-label="Lo que hay que saber">{{ r.caveat }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Las comisiones del fondo van por otro lado y no se ven como línea: el reglamento del fondo
        de Mercado Pago habilita hasta 3 % anual más IVA, y el tope del fondo de Prex no está
        publicado en su ficha. Lo que rinde ya viene neto de eso.
      </p>
    </VCard>

    <!-- The risk -->
    <VCard variant="flat" class="pa-4 pa-sm-5 mb-5 risk">
      <div class="d-flex align-center ga-2 mb-2">
        <VIcon size="20" color="error">mdi-alert-octagon-outline</VIcon>
        <h2 class="text-h6 font-weight-bold mb-0">El día que se te pasa el vencimiento</h2>
      </div>
      <p class="text-body-2 mb-3">
        Toda la maniobra depende de pagar el total el día exacto. Un solo mes de atraso sobre $
        {{ fmtPesos(spendGeneral + spendGastro) }} cuesta cerca de
        <strong>$ {{ fmtPesos(oneMonthLateUyu) }}</strong> al {{ fmtNum(MORA_TEA_PCT) }} % anual de
        mora que publica el tarifario de Santander, contra los
        <strong>$ {{ fmtPesos(Math.abs(monthlyNet * 12)) }}</strong> que la maniobra
        {{ monthlyNet >= 0 ? 'deja' : 'cuesta' }} en un año entero. La relación no es cómoda: se
        arriesga un año de ganancia para ganar décimas por mes.
      </p>
      <p class="text-body-2 mb-0">
        Y hay una trampa de calendario: si el vencimiento cae lunes y la plata está en Mercado Pago,
        el retiro acredita al siguiente día hábil, así que hay que resolverlo el viernes. Los fondos
        rescatan en días hábiles: el fin de semana no es un día más.
      </p>
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
        <VBtn :to="localePath('/conviene-comprar-en-cuotas')" variant="tonal" size="small">
          <VIcon start size="small">mdi-numeric-3-box-multiple-outline</VIcon>Cuotas contra contado
        </VBtn>
        <VBtn
          :to="localePath('/descuento-de-iva-con-tarjeta-uruguay')"
          variant="tonal"
          size="small"
        >
          <VIcon start size="small">mdi-percent-outline</VIcon>El descuento de IVA
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
        Verificado el {{ fmtDate(FLOAT_STRATEGY_VERIFIED_AT) }}. Los tarifarios cambian con preaviso
        y las prórrogas de IVA vencen: confirmá antes de decidir.
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
  FLOAT_ROUTES,
  FLOAT_STRATEGY_VERIFIED_AT,
  MORA_TEA_PCT,
  estimateFloatStrategy,
  floatDaysPerCycle,
  getFloatRoute,
} from '~/utils/floatStrategy'
import { TPM_PCT } from '~/utils/yieldAccounts'

const localePath = useLocalePath()

// ── Calculator ──
//
// La entrada es el ingreso porque así llega la pregunta ("¿cuánto ahorro con mi
// sueldo?"), pero lo que manda es el gasto que PASA por la tarjeta y cómo se parte
// entre los dos regímenes de IVA. Esa partición es todo el resultado.
const ingreso = ref<number>(60000)
const cardPct = ref<number>(70)
const gastroPct = ref<number>(15)
const lostDiscountPct = ref<number>(0)
const cycleDays = ref<number>(30)
const graceDays = ref<number>(10)
const ratePct = ref<number>(TPM_PCT)
const feePct = ref<number>(0)
const routeId = ref<(typeof FLOAT_ROUTES)[number]['id']>('prex-itau')

const routeItems = FLOAT_ROUTES.map(r => ({
  value: r.id,
  title: `${r.wallet} → ${r.destination}`,
}))

const cycle = computed(() => ({
  cycleDays: cycleDays.value || 0,
  graceDays: graceDays.value || 0,
}))

const floatDays = computed(() => floatDaysPerCycle(cycle.value))

const cardSpend = computed(() => ((ingreso.value || 0) * clampPct(cardPct.value)) / 100)
const spendGastro = computed(() => (cardSpend.value * clampPct(gastroPct.value)) / 100)
const spendGeneral = computed(() => Math.max(0, cardSpend.value - spendGastro.value))

const routeCostUyu = computed(() => getFloatRoute(routeId.value)?.transferCostUyu ?? 0)

const general = computed(() =>
  estimateFloatStrategy({
    monthlySpendUyu: spendGeneral.value,
    regime: 'general',
    cycle: cycle.value,
    annualRatePct: ratePct.value || 0,
    feeAnnualPct: feePct.value || 0,
    lostDiscountPct: lostDiscountPct.value || 0,
  })
)

const gastro = computed(() =>
  estimateFloatStrategy({
    monthlySpendUyu: spendGastro.value,
    regime: 'gastronomia',
    cycle: cycle.value,
    annualRatePct: ratePct.value || 0,
    feeAnnualPct: feePct.value || 0,
    lostDiscountPct: lostDiscountPct.value || 0,
  })
)

/** La transferencia se paga una vez por mes, no una por régimen. */
const monthlyNet = computed(() => general.value.netUyu + gastro.value.netUyu - routeCostUyu.value)

/** Lo que el flote rinde, como porcentaje del gasto: el número del titular. */
const gainPctOfSpend = computed(() => {
  const spend = 100000
  const r = estimateFloatStrategy({
    monthlySpendUyu: spend,
    regime: 'sin-iva',
    cycle: cycle.value,
    annualRatePct: ratePct.value || 0,
    feeAnnualPct: feePct.value || 0,
  })
  return (r.floatGainUyu / spend) * 100
})

/** Los días que harían falta para empatar los dos puntos de IVA. */
const breakEvenGeneralDays = computed(() => {
  const spend = 100000
  const r = estimateFloatStrategy({
    monthlySpendUyu: spend,
    regime: 'general',
    cycle: cycle.value,
    annualRatePct: ratePct.value || 0,
    feeAnnualPct: feePct.value || 0,
  })
  return r.breakEvenDays ?? 0
})

/** Lo que cuesta un mes de mora sobre el mismo gasto. */
const oneMonthLateUyu = computed(
  () => cardSpend.value * (Math.pow(1 + MORA_TEA_PCT / 100, 1 / 12) - 1)
)

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, n))
}

// ── Static content ──
const WINS = [
  {
    icon: 'mdi-silverware-fork-knife',
    title: 'Gastronomía y turismo',
    body: 'El régimen de nueve puntos de la Ley 17.934 nombra a la tarjeta de crédito entre los medios habilitados, igual que al débito. Ahí no resignás nada y el flote queda limpio. Ojo con el calendario: el Decreto 83/026 los prorrogó hasta el 30 de setiembre de 2026 y desde el 1º de octubre la rebaja pasa a cinco puntos.',
  },
  {
    icon: 'mdi-receipt-text-outline',
    title: 'Lo que no tiene IVA en el medio',
    body: 'Si la compra no tiene rebaja que perder, el flote es ganancia sin contrapartida. Sigue siendo chico —décimas del gasto— pero es positivo, y a diferencia del caso general no hay nada que lo tape.',
  },
  {
    icon: 'mdi-credit-card-clock-outline',
    title: 'Lo que ibas a pagar con crédito igual',
    body: 'Si ya ibas a usar la tarjeta, la rebaja de IVA no estaba en juego y lo único que se decide es cuándo sale la plata de la cuenta que rinde. Ahí sí: pagar el día del vencimiento en vez de adelantarse es gratis y suma.',
  },
]

const faqs = [
  {
    id: 'por-que-no-corre-con-credito',
    question: '¿Por qué la rebaja de IVA no corre con tarjeta de crédito?',
    answer:
      'Porque la norma la ata al instrumento. La Ley 19.210 art. 87, reglamentada por el Decreto 203/014, reduce dos puntos de la tasa del IVA en las compras pagadas con tarjeta de débito, instrumentos de dinero electrónico o análogos. La tarjeta de crédito no está en esa lista, ni en un pago ni en cuotas. Sobre el precio con IVA esos dos puntos son 1,64 %, que es la alícuota ficta que publica la DGI.',
  },
  {
    id: 'cuantos-dias-de-flote',
    question: '¿Cuántos días de flote da realmente una tarjeta?',
    answer:
      'Más de los que parece y menos de los que se dicen. No son los días entre el cierre y el vencimiento: una compra hecha el primer día del ciclo espera todo el ciclo más la gracia, y una del último día espera sólo la gracia. Con el gasto repartido parejo el promedio es gracia más (ciclo menos uno) sobre dos: con un ciclo de 30 días y 10 de gracia, 24,5 días. Y aun así, para empatar los dos puntos de IVA a la Tasa de Política Monetaria harían falta más de cien.',
  },
  {
    id: 'cuotas-sin-interes',
    question: '¿Y si compro en cuotas sin interés? Ahí el flote es de meses.',
    answer:
      'Es cierto que el plazo se estira, y por eso esa decisión tiene su propia página. Pero no alcanza con mirar el plazo: un plan en cuotas mantiene vivo el seguro sobre saldo deudor, 3 por mil mensual sobre lo que todavía debés, y muchas veces resigna el precio contado. Esos dos costos son del mismo orden que todo el arbitraje, así que la cuenta hay que hacerla completa y no por el lado que conviene.',
    link: { to: '/conviene-comprar-en-cuotas', label: 'Ver cuotas contra contado' },
  },
  {
    id: 'prex-o-mercado-pago',
    question: '¿Prex o Mercado Pago?',
    answer:
      'Depende del banco donde pagás la tarjeta. Prex transfiere gratis sólo a Itaú: su cartilla exonera ese banco por su nombre y cobra $ 45 a todos los demás, e Itaú tampoco cobra por mandar plata a Prex, así que el par es gratis en las dos direcciones. Mercado Pago no le cobra a ningún banco, pero acredita dentro del siguiente día hábil, lo que obliga a moverse antes del vencimiento. Y un detalle de costos: el reglamento del fondo de Mercado Pago habilita hasta 3 % anual más IVA de comisión, mientras que el tope del fondo de Prex no está publicado.',
  },
  {
    id: 'que-hago-entonces',
    question: 'Entonces, ¿qué hago con la plata del mes?',
    answer:
      'Dejarla rindiendo igual y pagar con el débito de la propia billetera. La plata rinde hasta el momento exacto de la compra, cobrás los dos puntos de IVA y no tenés que administrar ninguna fecha de vencimiento ni arriesgar una mora. La maniobra del crédito sólo agrega valor donde la rebaja no está en juego.',
    link: { to: '/cuenta-remunerada-uruguay', label: 'Cuánto rinde tu saldo' },
  },
  {
    id: 'cuanto-cuesta-equivocarse',
    question: '¿Cuánto cuesta equivocarse una vez?',
    answer:
      'Mucho más que lo que la maniobra deja. El interés de mora en tarjeta que publica el tarifario de Santander es de 81 % anual, y la financiación normal 69 %. Un mes de atraso cuesta más que un año entero de flote sobre el mismo gasto. Es el motivo por el que esto no es una estrategia de rendimiento sino una optimización de calendario con una penalidad enorme del otro lado.',
  },
]

const SOURCES = [
  {
    label:
      'DGI — Reducción de IVA para adquisiciones abonadas con medios electrónicos (dos puntos)',
    url: 'https://www.gub.uy/direccion-general-impositiva/tramites-y-servicios/servicios/reduccion-iva-para-adquisiciones-que-se-abonen-traves-medios',
  },
  {
    label: 'Ley 19.210 — Ley de Inclusión Financiera, art. 87',
    url: 'https://www.impo.com.uy/bases/leyes/19210-2014',
  },
  {
    label:
      'Cartilla de uso Prex (Econstar S.A.) — transferencias a bancos y la exoneración de Itaú',
    url: 'https://www.prexcard.com/html/cartillaUso',
  },
  {
    label: 'Manual de tarifas Itaú, §8.4 y §8.5 — giros a IEDEs sin costo',
    url: 'https://www.itau.com.uy/inst/aci/docs/tarifario.pdf',
  },
  {
    label: 'Mercado Pago — Cómo retirar el dinero a tu cuenta bancaria',
    url: 'https://www.mercadopago.com.uy/ayuda/retirar-para-cuenta-bancaria_273',
  },
  {
    label: 'BCU — el COPOM mantiene la Tasa de Política Monetaria en 5,75 %',
    url: 'https://www.bcu.gub.uy/Comunicaciones/Paginas/Comunicado-COPOM.aspx',
  },
]

// ── SEO ──
const canonicalUrl = 'https://cambio-uruguay.com/conviene-pagar-todo-con-credito-uruguay'
const title = '¿Conviene pagar todo con crédito?'
const description =
  'Dejar la plata rindiendo en Prex o Mercado Pago y pagar todo con la tarjeta de crédito hasta el vencimiento. El flote rinde décimas del gasto; la rebaja de dos puntos de IVA que resignás es 1,64 %. Cuándo conviene, con tus números.'

defineOgImageComponent('Cambio', {
  title: 'Pagar todo con crédito',
  subtitle: 'El flote contra los dos puntos de IVA',
  tag: 'LA CUENTA COMPLETA',
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
        'pagar todo con tarjeta de credito uruguay, inversion violeta prex tarjeta, rendimientos mercado pago pagar tarjeta, descuento iva debito o credito, transferencia prex itau gratis, float tarjeta de credito uruguay, vencimiento tarjeta de credito uruguay',
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
                name: 'Pagar todo con la tarjeta de crédito',
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
.float-page {
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

/* Versus */
.versus {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
}
@media (max-width: 720px) {
  .versus {
    grid-template-columns: 1fr;
  }
}
.versus-box {
  border-radius: 12px;
  padding: 1rem 1.1rem;
  border: 1px solid rgba(var(--v-border-color), 0.2);
}
.versus-box--cost {
  background: rgba(var(--v-theme-error), 0.08);
}
.versus-box--gain {
  background: rgba(var(--v-theme-success), 0.08);
}
.versus-tag {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.75;
}
.versus-num {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}
.versus-txt {
  font-size: 0.88rem;
  line-height: 1.55;
  margin: 0.4rem 0 0;
}
.versus-vs {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.6;
  text-align: center;
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
.breakdown .total td {
  font-weight: 700;
  font-size: 1.02rem;
  border-bottom: none;
}
.breakdown .year-row td {
  border-bottom: none;
  border-top: 1px dashed rgba(var(--v-border-color), 0.4);
  padding-top: 0.7rem;
  opacity: 0.85;
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

/* Wins */
.win-card {
  border-radius: 12px;
}

/* Routes */
.table-scroll {
  overflow-x: auto;
}
.routes {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}
.routes th,
.routes td {
  text-align: left;
  vertical-align: top;
  padding: 0.6rem 0.7rem;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.16);
  line-height: 1.55;
}
.routes th {
  font-weight: 700;
  white-space: nowrap;
}
.route-dest {
  display: block;
  font-size: 0.85em;
  opacity: 0.7;
}
.route-quote {
  display: block;
  font-size: 0.82em;
  opacity: 0.7;
  font-style: italic;
  margin-top: 0.2rem;
}

/* Risk */
.risk {
  border-left: 3px solid rgb(var(--v-theme-error));
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
