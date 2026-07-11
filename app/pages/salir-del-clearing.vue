<template>
  <div class="clearing-page pb-8">
    <div class="mb-3">
      <VBtn :to="localePath('/salud-financiera')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Salud financiera
      </VBtn>
    </div>

    <!-- Hero -->
    <VCard class="overflow-hidden mb-5" elevation="8">
      <div class="hero pa-6 pa-md-8">
        <p class="hero-eyebrow">Deudas y clearing</p>
        <h1 class="hero-title">Estás en el clearing. ¿Y ahora qué?</h1>
        <p class="hero-lead">
          “¿Alguien sabe con quién hablar para salir del clearing?” es una de las preguntas que más
          se repiten, y casi nunca tiene una respuesta clara. Acá va: qué es (y qué
          <em>no</em> es), cómo ver tu situación <strong>gratis</strong>, qué derechos tenés por
          ley, y dos calculadoras para armar tu salida.
        </p>
        <div class="d-flex justify-start justify-md-end mt-4">
          <ShareButtons text="Cómo salir del clearing en Uruguay" />
        </div>
      </div>
    </VCard>

    <!-- The core confusion -->
    <h2 class="section-heading mb-1">Primero: no es un solo registro</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Mucha gente dice “estoy en el clearing” sin saber en cuál. Son dos cosas distintas, con reglas
      distintas.
    </p>
    <VRow class="mb-6">
      <VCol cols="12" md="6">
        <VCard variant="flat" class="reg-card pa-5 h-100">
          <div class="d-flex align-center ga-2 mb-2">
            <VIcon color="warning">mdi-domain</VIcon>
            <h3 class="text-subtitle-1 font-weight-bold mb-0">Clearing de Informes</h3>
            <VChip size="x-small" variant="tonal" color="warning">Privado</VChip>
          </div>
          <p class="text-body-2 mb-2">
            Una <strong>empresa privada</strong> de informes comerciales. Registra incumplimientos
            que le reportan comercios, financieras y empresas. Es el que suelen consultar para
            venderte en cuotas.
          </p>
          <ul class="reg-list">
            <li>Los datos <strong>caducan a los 5 años</strong> (plazo no renovable).</li>
            <li>Podés pedir tus datos <strong>gratis cada 6 meses</strong> (Ley 18.331).</li>
            <li>Te tienen que responder en <strong>5 días hábiles</strong>.</li>
          </ul>
        </VCard>
      </VCol>
      <VCol cols="12" md="6">
        <VCard variant="flat" class="reg-card pa-5 h-100">
          <div class="d-flex align-center ga-2 mb-2">
            <VIcon color="primary">mdi-bank</VIcon>
            <h3 class="text-subtitle-1 font-weight-bold mb-0">Central de Riesgos del BCU</h3>
            <VChip size="x-small" variant="tonal" color="primary">Oficial</VChip>
          </div>
          <p class="text-body-2 mb-2">
            El registro del <strong>Banco Central</strong>. Ahí figuran tus créditos con bancos y
            financieras reguladas, y una <strong>categoría de 1A (mejor) a 5 (peor)</strong>. Es el
            que mira un banco antes de darte un préstamo.
          </p>
          <ul class="reg-list">
            <li>La consulta de tu propia situación es <strong>gratis y online</strong>.</li>
            <li>Tu banco está <strong>obligado a informarte</strong> tu categoría.</li>
            <li>No es lo mismo que el Clearing: podés estar en uno y no en el otro.</li>
          </ul>
        </VCard>
      </VCol>
    </VRow>

    <!-- Check yourself -->
    <VCard variant="flat" class="cta-card pa-5 pa-sm-6 mb-6">
      <div class="d-flex align-center ga-2 mb-2">
        <VIcon color="primary">mdi-file-search-outline</VIcon>
        <h2 class="text-h6 font-weight-bold mb-0">Paso 1: mirá tu situación real (gratis)</h2>
      </div>
      <p class="text-body-2 mb-4">
        No pagues por “consultar tu clearing”. Podés verlo sin gastar un peso.
      </p>
      <VRow>
        <VCol cols="12" sm="6">
          <VBtn
            href="https://consultadeuda.bcu.gub.uy/consultadeuda/"
            target="_blank"
            rel="noopener noreferrer"
            color="primary"
            variant="flat"
            block
          >
            <VIcon start>mdi-open-in-new</VIcon>
            Consultar mi deuda en el BCU
          </VBtn>
          <p class="text-caption text-medium-emphasis mt-2 mb-0">
            Consulta gratuita en línea de la Central de Riesgos.
          </p>
        </VCol>
        <VCol cols="12" sm="6">
          <VBtn
            href="https://www.gub.uy/unidad-reguladora-control-datos-personales/"
            target="_blank"
            rel="noopener noreferrer"
            color="primary"
            variant="outlined"
            block
          >
            <VIcon start>mdi-shield-account-outline</VIcon>
            Mis derechos (URCDP)
          </VBtn>
          <p class="text-caption text-medium-emphasis mt-2 mb-0">
            Unidad Reguladora de Datos Personales: acceso, rectificación y habeas data.
          </p>
        </VCol>
      </VRow>
    </VCard>

    <!-- Rights -->
    <VCard variant="flat" class="section-card pa-5 pa-sm-6 mb-6">
      <h2 class="text-h6 font-weight-bold mb-3">
        <VIcon start color="primary">mdi-scale-balance</VIcon>
        Tus derechos (Ley 18.331)
      </h2>
      <ul class="rights">
        <li><strong>Te tienen que avisar.</strong> No pueden registrarte sin notificarte.</li>
        <li>
          <strong>Acceso gratuito cada 6 meses.</strong> Podés pedir qué datos tuyos tienen, sin
          costo.
        </li>
        <li>
          <strong>Te responden en 5 días hábiles.</strong> Si no te contestan o te lo niegan sin
          razón, se habilita la acción de <strong>habeas data</strong>.
        </li>
        <li>
          <strong>Caducidad a los 5 años.</strong> La información no puede quedar para siempre: el
          plazo máximo es de 5 años y <strong>no es renovable</strong>.
        </li>
        <li>
          <strong>Rectificación.</strong> Si el dato está mal o ya pagaste, podés exigir que lo
          corrijan o lo actualicen.
        </li>
      </ul>
      <VAlert type="info" variant="tonal" density="comfortable" class="mt-4">
        Pagar no te borra del registro al instante: lo que corresponde es que quede asentado como
        <strong>cancelada</strong>. Guardá siempre el comprobante y el convenio por escrito.
      </VAlert>
    </VCard>

    <!-- TOOL 1: payoff planner -->
    <h2 class="section-heading mb-1">Paso 2: armá tu plan de salida</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Cargá tus deudas y cuánto extra podés poner por mes. Te decimos cuándo quedás libre y cuánto
      te cuesta cada estrategia.
    </p>

    <VCard variant="flat" class="section-card pa-4 pa-sm-6 mb-6">
      <div v-for="(d, i) in debts" :key="d.id" class="debt-row">
        <VTextField
          v-model="d.name"
          label="Deuda"
          variant="outlined"
          density="compact"
          hide-details
        />
        <VTextField
          v-model.number="d.balance"
          type="number"
          min="0"
          label="Saldo"
          prefix="$"
          variant="outlined"
          density="compact"
          hide-details
        />
        <VTextField
          v-model.number="d.annualRatePct"
          type="number"
          min="0"
          label="Tasa anual"
          suffix="%"
          variant="outlined"
          density="compact"
          hide-details
        />
        <VTextField
          v-model.number="d.minPayment"
          type="number"
          min="0"
          label="Cuota mínima"
          prefix="$"
          variant="outlined"
          density="compact"
          hide-details
        />
        <VBtn
          icon="mdi-close"
          variant="text"
          size="small"
          :disabled="debts.length === 1"
          :aria-label="`Quitar ${d.name}`"
          @click="debts.splice(i, 1)"
        />
      </div>

      <div class="d-flex flex-wrap align-center ga-3 mt-3">
        <VBtn variant="tonal" size="small" @click="addDebt">
          <VIcon start size="small">mdi-plus</VIcon>
          Agregar deuda
        </VBtn>
        <VTextField
          v-model.number="extra"
          type="number"
          min="0"
          label="Extra por mes"
          prefix="$"
          variant="outlined"
          density="compact"
          hide-details
          class="extra-field"
        />
      </div>

      <VDivider class="my-5" />

      <VAlert
        v-if="plan.avalancha.neverPaysOff"
        type="error"
        variant="tonal"
        icon="mdi-alert-octagon-outline"
      >
        <strong>Con estos pagos la deuda no se termina nunca.</strong> Los intereses crecen más
        rápido de lo que pagás. No es un problema de esfuerzo: necesitás renegociar la tasa,
        unificar deudas o pedir un convenio. Pagar el mínimo sólo alimenta el interés.
      </VAlert>

      <template v-else>
        <div class="plan-grid">
          <div class="plan-box plan-box--main">
            <div class="text-overline">Quedás libre en</div>
            <div class="text-h4 font-weight-bold">{{ monthsLabel(plan.avalancha.months) }}</div>
            <div class="text-caption">con la estrategia avalancha</div>
          </div>
          <div class="plan-box">
            <div class="text-overline text-medium-emphasis">Intereses que pagás</div>
            <div class="text-h6 font-weight-bold text-error">
              {{ formatUYU(plan.avalancha.totalInterest) }}
            </div>
          </div>
          <div class="plan-box">
            <div class="text-overline text-medium-emphasis">Total desembolsado</div>
            <div class="text-h6 font-weight-bold">{{ formatUYU(plan.avalancha.totalPaid) }}</div>
          </div>
        </div>

        <div class="strategy-note mt-4">
          <VIcon size="16" color="primary" class="mr-1">mdi-lightbulb-on-outline</VIcon>
          <span v-if="plan.interestSaved > 0">
            Atacando primero la deuda <strong>más cara</strong> (avalancha) en vez de la más chica
            (bola de nieve) te ahorrás <strong>{{ formatUYU(plan.interestSaved) }}</strong> de
            intereses. La bola de nieve motiva más porque cerrás deudas antes; la avalancha es la
            que te cuesta menos plata.
          </span>
          <span v-else>
            En tu caso las dos estrategias cuestan prácticamente lo mismo: elegí la que te sostenga
            emocionalmente (la bola de nieve cierra deudas chicas antes).
          </span>
        </div>

        <div class="order-list mt-4">
          <div class="text-overline text-medium-emphasis mb-2">Orden en que las cerrás</div>
          <div v-for="(o, i) in plan.avalancha.order" :key="o.id" class="order-row">
            <span class="order-num">{{ i + 1 }}</span>
            <span class="order-name">{{ o.name }}</span>
            <span class="order-month">mes {{ o.paidOffMonth }}</span>
            <span class="order-int">{{ formatUYU(o.interestPaid) }} de interés</span>
          </div>
        </div>
      </template>
    </VCard>

    <!-- TOOL 2: real rate -->
    <h2 class="section-heading mb-1">Paso 3: ¿qué tasa te están cobrando de verdad?</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      La “tasa” del folleto casi nunca es la que pagás. Poné lo que te dieron y lo que devolvés, y
      sacamos la tasa efectiva real.
    </p>

    <VCard variant="flat" class="section-card pa-4 pa-sm-6 mb-6">
      <VRow>
        <VCol cols="12" sm="4">
          <VTextField
            v-model.number="loanPrincipal"
            type="number"
            min="0"
            label="Plata que recibiste"
            prefix="$"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="4">
          <VTextField
            v-model.number="loanPayment"
            type="number"
            min="0"
            label="Cuota mensual"
            prefix="$"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="4">
          <VTextField
            v-model.number="loanMonths"
            type="number"
            min="1"
            label="Cantidad de cuotas"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
      </VRow>

      <VDivider class="my-5" />

      <div v-if="rate" class="rate-grid">
        <div class="plan-box">
          <div class="text-overline text-medium-emphasis">Tasa efectiva mensual</div>
          <div class="text-h6 font-weight-bold">{{ rate.monthlyPct }}%</div>
        </div>
        <div class="plan-box plan-box--main">
          <div class="text-overline">Tasa efectiva anual (TEA)</div>
          <div class="text-h4 font-weight-bold">{{ rate.annualPct }}%</div>
          <div class="text-caption">esta es la que importa</div>
        </div>
        <div class="plan-box">
          <div class="text-overline text-medium-emphasis">Intereses totales</div>
          <div class="text-h6 font-weight-bold text-error">
            {{ formatUYU(rate.totalInterest) }}
          </div>
          <div class="text-caption text-medium-emphasis">
            devolvés {{ formatUYU(rate.totalPaid) }}
          </div>
        </div>
      </div>
      <VAlert v-else type="info" variant="tonal" density="comfortable">
        Cargá los tres datos. Si devolvés lo mismo o menos de lo que recibiste, no hay tasa que
        calcular.
      </VAlert>

      <VAlert type="warning" variant="tonal" density="comfortable" class="mt-4">
        <strong>¿Es usura?</strong> La Ley 18.212 le pone un tope a las tasas, y el BCU lo publica
        <strong>cada trimestre</strong> según el tipo de crédito. Cobrar por encima del tope es
        <strong>delito</strong>. No fijamos el tope acá porque cambia seguido: compará tu TEA con la
        tabla vigente.
        <div class="mt-2">
          <VBtn
            href="https://usuariofinanciero.bcu.gub.uy/tasas/topes-de-tasas-de-interes-y-usura/"
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            variant="flat"
            color="warning"
          >
            <VIcon start size="small">mdi-open-in-new</VIcon>
            Ver topes vigentes del BCU
          </VBtn>
        </div>
      </VAlert>
    </VCard>

    <!-- Steps -->
    <VCard variant="flat" class="section-card pa-5 pa-sm-6 mb-6">
      <h2 class="text-h6 font-weight-bold mb-3">
        <VIcon start color="primary">mdi-format-list-numbered</VIcon>
        Cómo salir, en concreto
      </h2>
      <ol class="steps">
        <li>
          <strong>Averiguá exactamente qué debés y a quién.</strong> Consultá el BCU y pedí tu
          informe al Clearing. Sin eso estás negociando a ciegas.
        </li>
        <li>
          <strong>Chequeá que la deuda sea tuya y esté bien.</strong> Si es un error, ya pagaste, o
          pasaron más de 5 años, pedí la rectificación o baja por escrito.
        </li>
        <li>
          <strong>Calculá la tasa real</strong> (arriba). Si supera el tope del BCU, tenés un
          argumento fuerte y podés denunciarlo.
        </li>
        <li>
          <strong>Negociá un convenio.</strong> Pedí quita de intereses y multas, y una cuota que
          puedas sostener. Que quede <strong>por escrito</strong> antes de pagar nada.
        </li>
        <li>
          <strong>Pagá siguiendo el plan</strong> (avalancha si querés gastar menos). Guardá todos
          los comprobantes.
        </li>
        <li>
          <strong>Exigí que quede como “cancelada”</strong> y verificá dentro de unas semanas que el
          registro se actualizó.
        </li>
      </ol>
      <VAlert type="error" variant="tonal" density="comfortable" class="mt-4" icon="mdi-alert">
        Desconfiá de quien te cobre por “borrarte del clearing”. Nadie puede eliminar un dato
        legítimo antes de tiempo: lo que existe es corregir errores y esperar la caducidad.
      </VAlert>
    </VCard>

    <!-- Sources -->
    <VCard variant="flat" class="section-card pa-5 mb-6">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Fuentes
      </h2>
      <ul class="sources-list">
        <li v-for="(s, i) in sources" :key="i">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </VCard>

    <VAlert type="warning" variant="tonal" density="comfortable" class="mb-6">
      Información <strong>general y educativa</strong>, no asesoramiento legal ni financiero. Cada
      caso tiene particularidades: ante una deuda ejecutada o un embargo, consultá a un abogado o al
      consultorio jurídico gratuito de la Udelar.
    </VAlert>

    <!-- Cross-links -->
    <VRow class="my-6">
      <VCol cols="12" md="4">
        <VCard
          :to="localePath('/prestamos-uruguay')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-hand-coin-outline</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Préstamos en Uruguay</h3>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Comparar tasas antes de firmar es la mejor forma de no volver acá.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard
          :to="localePath('/salud-financiera')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-heart-pulse</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Salud financiera</h3>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Presupuesto, fondo de emergencia y cómo no volver a endeudarte.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard
          :to="localePath('/herramientas/calculadora-sueldo-liquido')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-cash-check</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Tu sueldo líquido</h3>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Cuánto te queda realmente en mano para armar el plan.
          </p>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<script setup lang="ts">
import { compareStrategies, effectiveRate, type Debt } from '~/utils/debt'
import { formatUYU } from '~/utils/format'

const localePath = useLocalePath()

// --- payoff planner ---
let seq = 3
const debts = ref<Debt[]>([
  { id: 'd1', name: 'Tarjeta', balance: 45000, annualRatePct: 90, minPayment: 3000 },
  { id: 'd2', name: 'Préstamo financiera', balance: 80000, annualRatePct: 60, minPayment: 5000 },
])
const extra = ref(3000)

function addDebt() {
  debts.value.push({
    id: `d${seq++}`,
    name: 'Nueva deuda',
    balance: 10000,
    annualRatePct: 60,
    minPayment: 1000,
  })
}

const plan = computed(() => compareStrategies(debts.value, extra.value || 0))

function monthsLabel(m: number): string {
  if (m <= 0) return '—'
  const years = Math.floor(m / 12)
  const rest = m % 12
  if (years === 0) return `${m} ${m === 1 ? 'mes' : 'meses'}`
  if (rest === 0) return `${years} ${years === 1 ? 'año' : 'años'}`
  return `${years}a ${rest}m`
}

// --- real rate ---
const loanPrincipal = ref(50000)
const loanPayment = ref(6500)
const loanMonths = ref(12)
const rate = computed(() =>
  effectiveRate(loanPrincipal.value || 0, loanPayment.value || 0, loanMonths.value || 0)
)

const sources = [
  {
    label: 'BCU — Consulta de la Central de Riesgos Crediticios (gratis)',
    url: 'https://consultadeuda.bcu.gub.uy/consultadeuda/',
  },
  {
    label: 'BCU — Topes de tasas de interés y usura (Ley 18.212)',
    url: 'https://usuariofinanciero.bcu.gub.uy/tasas/topes-de-tasas-de-interes-y-usura/',
  },
  {
    label: 'Ley 18.331 — Protección de Datos Personales y acción de Habeas Data',
    url: 'https://www.impo.com.uy/bases/leyes/18331-2008',
  },
  {
    label: 'Unidad Reguladora y de Control de Datos Personales (URCDP)',
    url: 'https://www.gub.uy/unidad-reguladora-control-datos-personales/',
  },
  {
    label: 'BCU — Central de Riesgos',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Central_de_Riesgos.aspx',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/salir-del-clearing'
const title = 'Cómo salir del clearing en Uruguay: derechos, plazos y plan de deudas'
const description =
  'Qué es el Clearing de Informes y en qué se diferencia de la Central de Riesgos del BCU, cómo consultar tu situación gratis, tus derechos por la Ley 18.331 (caducidad a los 5 años, acceso gratuito), un planificador para salir de deudas y una calculadora de la tasa real que te cobran.'

defineOgImageComponent('Cambio', {
  title: 'Salir del clearing',
  subtitle: 'Derechos, plazos y un plan concreto para salir de deudas',
  tag: 'GUÍA',
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
        'salir del clearing uruguay, clearing de informes, central de riesgos bcu, consultar deuda bcu, cuanto tiempo quedo en el clearing, ley 18331 habeas data, usura uruguay ley 18212, plan de deudas, salir de deudas uruguay',
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
              { '@type': 'ListItem', position: 2, name: 'Salir del clearing', item: canonicalUrl },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: '¿Cuánto tiempo quedo en el clearing?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Por la Ley 18.331 los datos tienen un plazo máximo de caducidad de 5 años, y ese plazo no es renovable. Las obligaciones canceladas quedan registradas como tales hasta que se cumple el plazo.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Es lo mismo el Clearing de Informes que la Central de Riesgos del BCU?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'No. El Clearing de Informes es una empresa privada de informes comerciales. La Central de Riesgos es el registro oficial del Banco Central del Uruguay, donde figuran tus créditos con instituciones reguladas y tu categoría de 1A a 5. Podés estar en uno y no en el otro.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Cómo consulto gratis si tengo deudas?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'La Central de Riesgos del BCU se consulta gratis en consultadeuda.bcu.gub.uy. Además, la Ley 18.331 te da derecho a acceder a tus datos de forma gratuita cada 6 meses, y deben responderte en 5 días hábiles.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Me pueden cobrar cualquier tasa de interés?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'No. La Ley 18.212 fija topes máximos de tasa y el BCU los publica trimestralmente según el tipo de crédito. Cobrar por encima del tope es usura, que es un delito.',
                },
              },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.clearing-page {
  overflow-x: hidden;
}
.hero {
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(239, 68, 68, 0.3), transparent 55%),
    linear-gradient(135deg, #3a1220 0%, #10233a 60%, #0b3b2e 100%);
}
.hero-eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  font-weight: 700;
  color: #ffb4a1;
  margin-bottom: 0.5rem;
}
.hero-title {
  color: #fff;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  margin-bottom: 0.75rem;
  text-wrap: balance;
}
.hero-lead {
  color: rgba(255, 255, 255, 0.9);
  max-width: 760px;
  line-height: 1.65;
  margin-bottom: 0;
}

.section-heading {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding-left: 10px;
}
.section-card,
.reg-card,
.cta-card {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 16px;
}
.cta-card {
  background: rgba(var(--v-theme-primary), 0.05);
  border-color: rgba(var(--v-theme-primary), 0.3);
}

.reg-list,
.rights,
.steps {
  padding-left: 20px;
  margin: 0;
}
.reg-list li,
.rights li,
.steps li {
  font-size: 0.88rem;
  line-height: 1.6;
  margin-bottom: 6px;
}
.steps li {
  margin-bottom: 10px;
}

/* Debt rows */
.debt-row {
  display: grid;
  grid-template-columns: 1.3fr 1fr 0.8fr 1fr 40px;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}
@media (max-width: 760px) {
  .debt-row {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    padding-bottom: 10px;
    border-bottom: 1px dashed rgba(var(--v-border-color), 0.2);
  }
}
.extra-field {
  max-width: 190px;
}

.plan-grid,
.rate-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
@media (min-width: 720px) {
  .plan-grid,
  .rate-grid {
    grid-template-columns: 1.4fr 1fr 1fr;
  }
  .rate-grid {
    grid-template-columns: 1fr 1.4fr 1fr;
  }
}
.plan-box {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 14px;
  padding: 14px 16px;
  text-align: center;
}
.plan-box--main {
  background: rgba(var(--v-theme-primary), 0.1);
  border-color: rgba(var(--v-theme-primary), 0.5);
  color: rgb(var(--v-theme-primary));
}
.v-theme--light .plan-box--main {
  color: #0d47a1;
}

.strategy-note {
  font-size: 0.88rem;
  line-height: 1.6;
  background: rgba(var(--v-theme-primary), 0.06);
  border-left: 3px solid rgba(var(--v-theme-primary), 0.7);
  border-radius: 0 8px 8px 0;
  padding: 10px 12px;
}

.order-row {
  display: grid;
  grid-template-columns: 28px 1fr auto auto;
  gap: 10px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px dashed rgba(var(--v-border-color), 0.16);
  font-size: 0.86rem;
}
.order-row:last-child {
  border-bottom: none;
}
.order-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.75rem;
  background: rgba(var(--v-theme-primary), 0.16);
  color: rgb(var(--v-theme-primary));
}
.v-theme--light .order-num {
  color: #0d47a1;
}
.order-name {
  font-weight: 600;
}
.order-month,
.order-int {
  opacity: 0.85;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.order-int {
  font-size: 0.8rem;
}

.sources-list {
  padding-left: 18px;
  margin: 0;
}
.sources-list li {
  font-size: 0.84rem;
  margin-bottom: 5px;
}
.sources-list a {
  color: rgb(var(--v-theme-primary));
}
.v-theme--light .sources-list a {
  color: #0d47a1;
}

.cross-link {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 14px;
  transition:
    transform 0.16s ease,
    border-color 0.16s ease;
}
.cross-link:hover {
  transform: translateY(-3px);
  border-color: rgba(var(--v-theme-primary), 0.6);
}
</style>
