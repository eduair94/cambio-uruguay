<template>
  <VContainer class="page py-6 py-md-10">
    <header class="hero on-dark mb-8">
      <p class="eyebrow">Plan de vida · {{ ratesLabel }}</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">Cómo distribuir tu sueldo</h1>
      <p class="hero-lead text-body-1 mb-4">
        No es una regla del 50/30/20. Es un <strong>orden</strong>, y cada paso se justifica con una
        tasa pública y fechada: hoy la deuda de consumo sin descuento del sueldo tiene
        <strong>{{ pctText(rates.deudaSinDescuento) }}</strong> de tasa media según el BCU, y la
        mejor colocación accesible rinde <strong>{{ pctText(bestPct) }}</strong> real después de
        IRPF e inflación. Pagar la primera rinde más que colocar la plata, y eso no es una opinión:
        es una resta.
      </p>
      <p class="hero-lead text-body-2 mb-0">
        Donde la resta no alcanza para decidir, esta página <strong>no ordena</strong>: te dice qué
        comparación no pudo hacer.
      </p>
    </header>

    <!-- Entradas -->
    <VCard class="pa-4 pa-sm-6 mb-6">
      <div class="cv-section-title">Tu situación</div>
      <VRow class="mb-1">
        <VCol cols="12" md="4">
          <VTextField
            v-model.number="income"
            type="number"
            min="0"
            step="1000"
            label="Ingreso líquido del hogar (por mes)"
            prefix="$"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" md="4">
          <VSelect
            v-model="situation"
            :items="situationItems"
            label="Convivencia"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="6" md="2">
          <VSelect
            v-model="city"
            :items="cityItems"
            label="Región"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="6" md="2">
          <VSelect
            v-model="housing"
            :items="housingItems"
            label="Vivienda"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
      </VRow>

      <VRow>
        <VCol v-if="situation === 'familia'" cols="6" md="3">
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
        <VCol cols="6" md="3">
          <VTextField
            v-model.number="savingsNow"
            type="number"
            min="0"
            step="1000"
            label="Lo que ya tenés ahorrado"
            prefix="$"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" md="6">
          <label class="cv-label">
            Colchón que querés: {{ emergencyMonths }}
            {{ emergencyMonths === 1 ? 'mes' : 'meses' }} de lo esencial
          </label>
          <VSlider
            v-model="emergencyMonths"
            :min="1"
            :max="12"
            :step="1"
            thumb-label
            color="primary"
            density="compact"
            hide-details
            class="mt-2"
          />
        </VCol>
      </VRow>

      <div class="cv-section-title mt-5">Tus deudas</div>
      <p class="text-body-2 text-medium-emphasis mb-3">
        No hace falta que sepas la tasa: elegí el tipo y se completa con la
        <strong>tasa media</strong> que publica el BCU para ese segmento. Es la media y no el tope,
        porque el tope es el máximo que la ley permite cobrar, no lo que se paga. Si conocés tu
        tasa, cargala y gana sobre la media.
      </p>

      <div v-for="(debt, i) in debts" :key="debt.id" class="cv-debt mb-3 pa-3">
        <VRow dense>
          <VCol cols="12" md="4">
            <VSelect
              v-model="debt.kind"
              :items="debtKindItems"
              label="Tipo"
              variant="outlined"
              density="compact"
              :hint="kindHelp(debt.kind)"
              persistent-hint
            />
          </VCol>
          <VCol cols="6" md="3">
            <VTextField
              v-model.number="debt.balance"
              type="number"
              min="0"
              step="1000"
              label="Saldo"
              prefix="$"
              variant="outlined"
              density="compact"
              hide-details
            />
          </VCol>
          <VCol cols="6" md="2">
            <VTextField
              v-model.number="debt.minPayment"
              type="number"
              min="0"
              step="100"
              label="Mínimo mensual"
              prefix="$"
              variant="outlined"
              density="compact"
              hide-details
            />
          </VCol>
          <VCol cols="6" md="2">
            <VTextField
              v-model.number="debt.annualRatePct"
              type="number"
              min="0"
              step="1"
              label="Tasa anual"
              suffix="%"
              variant="outlined"
              density="compact"
              :placeholder="ratePlaceholder(debt.kind)"
              hide-details
            />
          </VCol>
          <VCol cols="6" md="1" class="d-flex align-center">
            <VBtn
              icon="mdi-close"
              variant="text"
              size="small"
              :aria-label="`Quitar deuda ${i + 1}`"
              @click="removeDebt(i)"
            />
          </VCol>
        </VRow>
      </div>

      <VBtn variant="outlined" size="small" prepend-icon="mdi-plus" @click="addDebt">
        Agregar una deuda
      </VBtn>
    </VCard>

    <!-- Veredicto -->
    <VAlert
      v-if="plan.verdict === 'no-alcanza'"
      type="error"
      variant="tonal"
      density="comfortable"
      icon="mdi-alert-octagon-outline"
      class="mb-6"
    >
      <p class="text-subtitle-2 font-weight-bold mb-1">
        Con ese ingreso no hay excedente que ordenar
      </p>
      <p class="text-body-2 mb-3">
        Lo esencial cuesta {{ formatUYU(plan.budget.essentials, 0) }} por mes y te faltan
        <strong>{{ formatUYU(plan.budget.deficit, 0) }}</strong
        >. Antes de repartir un ingreso que no cubre el piso, conviene revisar qué apoyos del Estado
        te corresponden: repartir un faltante no lo hace desaparecer.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn size="small" color="primary" :to="localePath('/vivir-con-25000-pesos-uruguay')">
          Vivir con un ingreso bajo
        </VBtn>
        <VBtn size="small" variant="outlined" :to="localePath('/asignacion-familiar-uruguay')">
          Asignación familiar
        </VBtn>
      </div>
    </VAlert>

    <VAlert
      v-else-if="plan.verdict === 'sin-excedente'"
      type="warning"
      variant="tonal"
      density="comfortable"
      icon="mdi-scale-unbalanced"
      class="mb-6"
    >
      Después de lo esencial y de los mínimos de tus deudas no queda excedente para ordenar. Los
      mínimos son {{ formatUYU(plan.minimums, 0) }} por mes.
    </VAlert>

    <VAlert
      v-if="plan.unresolvedNotes.length"
      type="info"
      variant="tonal"
      density="comfortable"
      icon="mdi-help-circle-outline"
      class="mb-6"
    >
      <p class="text-subtitle-2 font-weight-bold mb-1">Lo que no se pudo comparar</p>
      <ul class="cv-notes mb-0">
        <li v-for="(n, i) in plan.unresolvedNotes" :key="i" class="text-body-2">{{ n }}</li>
      </ul>
    </VAlert>

    <!-- La cascada -->
    <section v-if="plan.verdict !== 'no-alcanza'" class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-2">El orden, peso por peso</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        De tus {{ formatUYU(plan.budget.income, 0) }}, lo esencial y los mínimos son obligación:
        quedan <strong>{{ formatUYU(plan.pot, 0) }}</strong> para repartir. Un paso con
        <strong>$0</strong> igual se muestra: que le toque cero este mes es parte de la respuesta.
      </p>

      <div class="table-scroll">
        <VTable density="comfortable" class="cu-mobile-cards">
          <thead>
            <tr>
              <th>Paso</th>
              <th class="text-right">Por mes</th>
              <th>Por qué va acá</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="step in plan.steps" :key="step.id">
              <td data-label="Paso">
                <strong>{{ step.label }}</strong>
                <VChip v-if="step.committed" size="x-small" variant="tonal" class="ml-1">
                  obligación
                </VChip>
                <VChip
                  v-if="step.unresolved"
                  size="x-small"
                  color="warning"
                  variant="tonal"
                  class="ml-1"
                >
                  sin comparar
                </VChip>
              </td>
              <td data-label="Por mes" class="text-right">
                <strong>{{ formatUYU(step.monthly, 0) }}</strong>
              </td>
              <td data-label="Por qué va acá">
                <span class="text-body-2">{{ step.reason }}</span>
                <span v-if="step.evidence" class="d-block text-caption text-medium-emphasis mt-1">
                  {{ step.evidence }}
                </span>
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>

      <p v-if="plan.payoff && !plan.payoff.neverPaysOff" class="text-body-2 mt-3 mb-0">
        Si le dedicaras <strong>todo</strong> el excedente al pago de deuda, se cancelaría en
        {{ plan.payoff.months }} {{ plan.payoff.months === 1 ? 'mes' : 'meses' }} con
        {{ formatUYU(plan.payoff.totalInterest, 0) }} de interés. No es el plazo de este reparto:
        acá parte del excedente va al colchón.
      </p>
    </section>

    <!-- De dónde salen las tasas -->
    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-2">De dónde sale cada tasa</h2>
      <div class="table-scroll">
        <VTable density="comfortable" class="cu-mobile-cards">
          <thead>
            <tr>
              <th>Tasa</th>
              <th class="text-right">Valor</th>
              <th>Fuente y fecha</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rateRows" :key="row.label">
              <td data-label="Tasa">{{ row.label }}</td>
              <td data-label="Valor" class="text-right">{{ row.value }}</td>
              <td data-label="Fuente">{{ row.source }}</td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Las tasas de referencia se refrescan una vez por semana y las de usura una vez por mes,
        porque la grilla del BCU rige por ventana trimestral móvil. La fecha de cada una está en la
        tabla: no es de hoy y no se hace pasar por de hoy.
      </p>
    </section>

    <FaqSection :items="faq" heading="Preguntas frecuentes" :expanded="true" class="mb-8" />

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Seguí con el detalle</h2>
      <VRow>
        <VCol v-for="link in relatedLinks" :key="link.to" cols="12" sm="6" md="4">
          <VCard variant="outlined" class="pa-4 h-100" :to="localePath(link.to)">
            <p class="text-subtitle-2 font-weight-bold mb-1">{{ link.title }}</p>
            <p class="text-body-2 text-medium-emphasis mb-0">{{ link.body }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-scale-balance">
      <span class="text-body-2">
        Esto es aritmética sobre tasas públicas y fechadas, no asesoramiento financiero. No
        recomienda productos ni instituciones: ordena destinos. Las cifras de lo esencial son
        estimaciones declaradas, salvo la comida y el alquiler, que salen de precios medidos.
      </span>
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FaqItem } from '~/utils/faqAnswers'
import { estimateBudget, type City, type Housing, type Situation } from '~/utils/costOfLiving'
import { formatUYU } from '~/utils/format'
import {
  LIFE_PLAN_DEBT_KINDS,
  LIFE_PLAN_EMERGENCY_MONTHS_DEFAULT,
  buildLifePlan,
  lifePlanBestRealNet,
  lifePlanReturns,
  type LifePlanDebtInput,
  type LifePlanDebtKind,
  type LifePlanRates,
} from '~/utils/lifePlan'

const localePath = useLocalePath()

// Server-rendered: el orden y los números SON la página.
const { data: ratesData } = await useFetch<LifePlanRates>('/api/life-plan-rates', {
  key: 'plan-tasas',
  default: () => ({
    plazoFijoBrou: null,
    fondoPesos: null,
    inflacion: null,
    deudaSinDescuento: null,
    deudaConDescuento: null,
    asOfRates: null,
    asOfDebt: null,
  }),
})
const rates = computed<LifePlanRates>(() => ratesData.value)

const income = ref(90_000)
const situation = ref<Situation>('solo')
const city = ref<City>('montevideo')
const housing = ref<Housing>('alquila')
const children = ref(1)
const savingsNow = ref(0)
const emergencyMonths = ref(LIFE_PLAN_EMERGENCY_MONTHS_DEFAULT)

let debtSeq = 1
const debts = ref<LifePlanDebtInput[]>([
  { id: 'd0', name: 'Tarjeta', balance: 60_000, minPayment: 4_000, kind: 'sin_descuento' },
])

const addDebt = () => {
  debts.value.push({
    id: `d${debtSeq++}`,
    name: 'Deuda',
    balance: 0,
    minPayment: 0,
    kind: 'sin_descuento',
  })
}
const removeDebt = (i: number) => {
  debts.value.splice(i, 1)
}

const situationItems = [
  { title: 'Solo/a', value: 'solo' },
  { title: 'Compartido', value: 'compartido' },
  { title: 'En pareja', value: 'pareja' },
  { title: 'Familia', value: 'familia' },
]
const cityItems = [
  { title: 'Montevideo', value: 'montevideo' },
  { title: 'Interior', value: 'interior' },
]
const housingItems = [
  { title: 'Alquilo', value: 'alquila' },
  { title: 'Propia', value: 'propia' },
]
const debtKindItems = LIFE_PLAN_DEBT_KINDS.map(k => ({ title: k.label, value: k.id }))

const kindHelp = (kind: LifePlanDebtKind): string =>
  LIFE_PLAN_DEBT_KINDS.find(k => k.id === kind)?.help ?? ''

/** El placeholder muestra la media que se va a usar si no cargás nada. */
const ratePlaceholder = (kind: LifePlanDebtKind): string => {
  if (kind === 'sin_descuento' && rates.value.deudaSinDescuento !== null) {
    return String(rates.value.deudaSinDescuento)
  }
  if (kind === 'con_descuento' && rates.value.deudaConDescuento !== null) {
    return String(rates.value.deudaConDescuento)
  }
  return 'cargala'
}

const budget = computed(() =>
  estimateBudget({
    netIncome: Math.max(0, income.value || 0),
    situation: situation.value,
    city: city.value,
    housing: housing.value,
    children: Math.max(0, children.value || 0),
  })
)

const plan = computed(() =>
  buildLifePlan(
    budget.value,
    debts.value.filter(d => (d.balance || 0) > 0),
    { emergencyMonths: emergencyMonths.value, savingsNow: Math.max(0, savingsNow.value || 0) },
    rates.value
  )
)

const bestPct = computed(() => lifePlanBestRealNet(lifePlanReturns(rates.value))?.pct ?? null)

const pctText = (n: number | null): string => (n === null ? 'sin dato' : `${n.toFixed(2)} %`)

const dateText = (iso: string | null): string => {
  if (!iso) return 'sin fecha'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? 'sin fecha'
    : d.toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })
}

const ratesLabel = computed(() =>
  rates.value.asOfDebt ? `tasas al ${dateText(rates.value.asOfDebt)}` : 'sin tasas'
)

const rateRows = computed(() => [
  {
    label: 'Deuda de consumo sin descuento del sueldo (media)',
    value: pctText(rates.value.deudaSinDescuento),
    source: `BCU, Ley 18.212 · ${dateText(rates.value.asOfDebt)}`,
  },
  {
    label: 'Deuda de consumo con descuento del sueldo (media)',
    value: pctText(rates.value.deudaConDescuento),
    source: `BCU, Ley 18.212 · ${dateText(rates.value.asOfDebt)}`,
  },
  {
    label: 'Depósito a plazo en pesos',
    value: pctText(rates.value.plazoFijoBrou),
    source: `Tasas de referencia · ${dateText(rates.value.asOfRates)}`,
  },
  {
    label: 'Fondo de inversión en pesos',
    value: pctText(rates.value.fondoPesos),
    source: `Tasas de referencia · ${dateText(rates.value.asOfRates)}`,
  },
  {
    label: 'Inflación (IPC interanual)',
    value: pctText(rates.value.inflacion),
    source: `INE, vía tasas de referencia · ${dateText(rates.value.asOfRates)}`,
  },
])

const relatedLinks = [
  {
    to: '/herramientas/costo-de-vida',
    title: 'Costo de vida',
    body: 'El detalle de lo esencial, línea por línea.',
  },
  {
    to: '/saldar-deudas-uruguay',
    title: 'Saldar deudas',
    body: 'Avalancha o bola de nieve, prescripción y negociación.',
  },
  {
    to: '/inversiones-uruguay',
    title: 'Inversiones',
    body: 'Qué instrumentos hay, con su riesgo y su regulación.',
  },
  {
    to: '/precios-de-supermercado-uruguay',
    title: 'Precios de supermercado',
    body: 'Los precios de góndola que alimentan la línea de comida.',
  },
  {
    to: '/alquileres-uruguay',
    title: 'Alquileres',
    body: 'Lo que se pide hoy por zona y tipo de vivienda.',
  },
  {
    to: '/herramientas/calculadora-sueldo-liquido',
    title: 'Sueldo líquido',
    body: 'De lo que dice el contrato a lo que llega a la cuenta.',
  },
]

const faq: FaqItem[] = [
  {
    id: 'por-que-no-50-30-20',
    question: '¿Por qué no usan la regla del 50/30/20?',
    answer:
      'Porque reparte porcentajes sin mirar el piso. Con un ingreso que no cubre lo esencial, un 30 % para "gustos" no existe, y con una deuda al 80 % anual un 20 % de ahorro pierde plata todos los meses. Acá el orden lo decide la comparación entre lo que cuesta tu deuda y lo que rinde colocar la plata, con las dos cifras a la vista.',
  },
  {
    id: 'por-que-deuda-primero',
    question: '¿Por qué conviene pagar la deuda antes de ahorrar?',
    answer:
      'Porque la diferencia de tasas es enorme y es pública. La deuda de consumo sin descuento del sueldo tiene una tasa media que el BCU publica, y la mejor colocación accesible rinde bastante menos después de IRPF e inflación. Cada peso que pagás de esa deuda te "rinde" la tasa que dejás de pagar.',
  },
  {
    id: 'por-que-colchon-antes',
    question: 'Si la deuda rinde más, ¿por qué el colchón va primero?',
    answer:
      'Sólo el primer mes, y por la misma aritmética: si no tenés nada guardado, la próxima urgencia vuelve a la tarjeta. Ese primer mes de colchón no rinde lo que rinde un depósito, rinde lo que evita, que es la tasa de tu deuda. El resto del colchón sí rinde lo del depósito y por eso va después.',
  },
  {
    id: 'no-se-mi-tasa',
    question: 'No sé qué tasa me cobran. ¿Sirve igual?',
    answer:
      'Sí. Elegís el tipo de deuda y se completa con la tasa media que el BCU publica para ese segmento. Es la media, no el tope legal. Si conocés tu tasa real, cargala: gana sobre la media y el orden se recalcula.',
  },
  {
    id: 'que-no-hace',
    question: '¿Esto me dice en qué invertir?',
    answer:
      'No. Ordena destinos por rendimiento real neto, no recomienda productos ni instituciones, y no proyecta cuánto tendrías en cinco años. Tampoco cubre jubilación ni compra de vivienda. Es aritmética sobre tasas públicas, no asesoramiento.',
  },
]

const title = 'Cómo distribuir tu sueldo en Uruguay'
const description =
  'En qué orden conviene usar cada peso del sueldo: lo esencial, la deuda cara, el colchón y el excedente, con la tasa pública y fechada que justifica cada paso.'
const canonicalUrl = 'https://cambio-uruguay.com/plan-de-vida-uruguay'

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: title,
        description,
        url: canonicalUrl,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        inLanguage: 'es-UY',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: 0, priceCurrency: 'UYU' },
        creator: { '@type': 'Organization', name: 'Cambio Uruguay' },
      }),
    },
  ],
}))
</script>

<style scoped>
.table-scroll {
  overflow-x: auto;
}
.cv-section-title {
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.cv-label {
  display: block;
  font-size: 0.8125rem;
  opacity: 0.8;
}
.cv-debt {
  border: 1px solid rgb(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}
.cv-notes {
  padding-left: 1.1rem;
}
</style>
