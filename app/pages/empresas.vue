<template>
  <div>
    <VContainer class="py-8 empresas-page">
      <div class="d-flex align-center ga-2 mb-2">
        <VIcon color="indigo" size="32">mdi-domain</VIcon>
        <h1 class="text-h4 font-weight-bold">Datos de cotizaciones para empresas</h1>
      </div>
      <p class="text-body-1 text-medium-emphasis mb-6 empresas-page__lead">
        Las cotizaciones de más de 40 casas de cambio de Uruguay, leídas cada cinco minutos, con su
        historial dentro del día y el de la región, por una API. Sin clave funciona; con una clave
        gratuita ves tu consumo, y un plan Empresa te da más capacidad y uso comercial.
      </p>
      <div class="d-flex flex-wrap ga-3 mb-10">
        <VBtn
          color="primary"
          variant="flat"
          size="large"
          prepend-icon="mdi-key-plus"
          data-cta="empresas-crear-clave"
          @click="startKey"
        >
          Crear una clave gratis
        </VBtn>
        <VBtn
          :href="mailto"
          variant="tonal"
          size="large"
          prepend-icon="mdi-email-outline"
          data-cta="empresas-contacto"
        >
          Escribinos por un plan Empresa
        </VBtn>
      </div>

      <h2 class="text-h5 font-weight-bold mb-3">Qué datos hay</h2>
      <VRow class="mb-8">
        <VCol v-for="item in DATA" :key="item.title" cols="12" sm="6" md="4">
          <VCard variant="outlined" class="pa-4 h-100">
            <div class="d-flex align-center ga-2 mb-2">
              <VIcon :color="item.color">{{ item.icon }}</VIcon>
              <h3 class="text-subtitle-1 font-weight-bold">{{ item.title }}</h3>
            </div>
            <p class="text-body-2 mb-2">{{ item.text }}</p>
            <code v-if="item.endpoint" class="text-caption">{{ item.endpoint }}</code>
          </VCard>
        </VCol>
      </VRow>

      <h2 class="text-h5 font-weight-bold mb-3">Qué se puede construir</h2>
      <ul class="empresas-page__list text-body-1 mb-8">
        <li v-for="use in USES" :key="use.title">
          <strong>{{ use.title }}.</strong> {{ use.text }}
        </li>
      </ul>

      <h2 class="text-h5 font-weight-bold mb-3">Planes</h2>
      <VRow class="mb-2">
        <VCol v-for="plan in PLANS" :key="plan.id" cols="12" md="4">
          <VCard
            :variant="plan.id === 'free' ? 'tonal' : 'outlined'"
            :color="plan.id === 'free' ? 'primary' : undefined"
            class="pa-4 h-100"
          >
            <h3 class="text-h6 font-weight-bold mb-1">{{ plan.title }}</h3>
            <p class="text-body-2 mb-3">{{ plan.who }}</p>
            <ul class="empresas-page__list text-body-2">
              <li v-for="line in plan.lines" :key="line">{{ line }}</li>
            </ul>
          </VCard>
        </VCol>
      </VRow>
      <p class="text-caption text-medium-emphasis mb-8">
        Los techos se cuentan por minuto y por día (el día de Montevideo). Cada respuesta trae las
        cabeceras <code>X-Plan</code>, <code>X-RateLimit-Limit</code> y
        <code>X-RateLimit-Remaining</code>, y <code>/usage</code> te dice cuánto llevás.
      </p>

      <h2 class="text-h5 font-weight-bold mb-3">Cómo se usa la clave</h2>
      <p class="text-body-2 mb-2">
        En la cabecera <code>X-API-Key</code> (o <code>Authorization: Bearer</code>). Si tu
        herramienta no puede poner cabeceras, como una planilla, va en la dirección con
        <code>?api_key=</code>.
      </p>
      <pre class="empresas-page__code mb-8"><code>{{ CURL }}</code></pre>

      <h2 id="condiciones" class="text-h5 font-weight-bold mb-3">Condiciones de uso</h2>
      <ol class="empresas-page__list text-body-2 mb-8">
        <li v-for="rule in TERMS" :key="rule">{{ rule }}</li>
      </ol>

      <h2 class="text-h5 font-weight-bold mb-3">Preguntas frecuentes</h2>
      <div v-for="item in FAQ" :key="item.question" class="mb-4">
        <h3 class="text-subtitle-1 font-weight-bold">{{ item.question }}</h3>
        <p class="text-body-2">{{ item.answer }}</p>
      </div>

      <p class="text-body-2 mt-8">
        Más para desarrolladores —código abierto, referencia completa de la API y servidor MCP— en
        <NuxtLink :to="localePath('/desarrolladores')">Desarrolladores</NuxtLink>.
      </p>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import {
  API_CONTACT_EMAIL,
  API_PLAN_LABELS,
  API_PLAN_LIMITS,
  API_PUBLIC_BASE,
  MAX_KEYS_PER_ACCOUNT,
  formatCount,
} from '~/utils/apiKeys'
import { TRIAL_DAYS } from '~/utils/competitorMonitor'

const localePath = useLocalePath()
const auth = useAuthStore()

// "Crear una clave": con una cuenta (con correo; un invitado no identifica a nadie) va directo a la
// pestaña; si no, abre el acceso y navega apenas hay cuenta, así nadie termina en la portada.
const pendingKey = ref(false)
const keysPath = () => localePath({ path: '/cuenta', query: { tab: 'api' } })
const hasAccount = computed(() => Boolean(auth.user?.email))
function startKey() {
  if (hasAccount.value) return navigateTo(keysPath())
  pendingKey.value = true
  auth.openDialog()
}
watch(hasAccount, loggedIn => {
  if (loggedIn && pendingKey.value) {
    pendingKey.value = false
    navigateTo(keysPath())
  }
})

const mailto = `mailto:${API_CONTACT_EMAIL}?subject=${encodeURIComponent('Plan Empresa de la API — Cambio Uruguay')}`

const perMin = (plan: keyof typeof API_PLAN_LIMITS) => formatCount(API_PLAN_LIMITS[plan].perMinute)
const perDay = (plan: keyof typeof API_PLAN_LIMITS) => formatCount(API_PLAN_LIMITS[plan].perDay)

const DATA = [
  {
    title: 'Cotizaciones',
    icon: 'mdi-cash-multiple',
    color: 'green',
    text: 'Compra y venta de más de 40 casas de cambio y bancos, con la cotización oficial del BCU, leídas cada cinco minutos.',
    endpoint: `${API_PUBLIC_BASE}/`,
  },
  {
    title: 'Intradía',
    icon: 'mdi-chart-timeline-variant',
    color: 'indigo',
    text: 'Cada cambio de pizarra del día con su hora exacta: cuántas veces se movió cada casa y cuándo.',
    endpoint: `${API_PUBLIC_BASE}/intraday?code=USD`,
  },
  {
    title: 'Histórico',
    icon: 'mdi-history',
    color: 'teal',
    text: 'La evolución de cada casa y moneda, día por día, para series y comparaciones.',
    endpoint: `${API_PUBLIC_BASE}/evolution/brou/USD`,
  },
  {
    title: 'Región',
    icon: 'mdi-earth-americas',
    color: 'orange',
    text: 'Los dólares de Argentina, Brasil, Paraguay, Chile y Bolivia, sin promediar mercados distintos.',
    endpoint: `${API_PUBLIC_BASE}/regional`,
  },
  {
    title: 'Indicadores',
    icon: 'mdi-finance',
    color: 'purple',
    text: 'Unidad Indexada, Unidad Reajustable y la cotización oficial del Banco Central.',
    endpoint: `${API_PUBLIC_BASE}/bcu`,
  },
  {
    title: 'Alquileres y autos',
    icon: 'mdi-file-chart-outline',
    color: 'brown',
    text: 'Precio del alquiler por barrio y del auto usado por modelo y año, como informe o extracción a pedido.',
    endpoint: '',
  },
]

const USES = [
  {
    title: 'Pantalla de pizarra',
    text: 'Mostrar en el local las cotizaciones propias o las de la competencia, actualizadas solas.',
  },
  {
    title: 'Planillas y costos',
    text: 'Traer el dólar del día a una planilla de costos o de precios sin copiarlo a mano.',
  },
  {
    title: 'Monitoreo de competencia',
    text: `Avisos por Telegram o correo cuando otra casa mueve su pizarra o cambia tu lugar en el grupo, y un resumen al cierre del día. Probalo ${TRIAL_DAYS} días gratis desde tu cuenta.`,
  },
  {
    title: 'Productos financieros',
    text: 'Apps, bots y paneles que necesitan el precio real de cada casa y no sólo el oficial.',
  },
]

const PLANS = [
  {
    id: 'anonymous',
    title: API_PLAN_LABELS.anonymous,
    who: 'Para probar y para uso personal.',
    lines: [
      `${perMin('anonymous')} pedidos por minuto`,
      `${perDay('anonymous')} pedidos por día, por dirección IP`,
      'Sin registro',
    ],
  },
  {
    id: 'free',
    title: `${API_PLAN_LABELS.free}, con clave`,
    who: 'Para proyectos que quieren ver su consumo.',
    lines: [
      `${perMin('free')} pedidos por minuto`,
      `${perDay('free')} pedidos por día`,
      `Consumo medido en tu cuenta, hasta ${MAX_KEYS_PER_ACCOUNT} claves`,
    ],
  },
  {
    id: 'business',
    title: API_PLAN_LABELS.business,
    who: 'Para productos comerciales y para redistribuir el dato.',
    lines: [
      `Desde ${perMin('business')} pedidos por minuto`,
      `Desde ${perDay('business')} pedidos por día`,
      'Límites a medida, uso comercial y contacto directo',
    ],
  },
]

const CURL = `CLAVE=cu_tu_clave
curl -H "X-API-Key: $CLAVE" ${API_PUBLIC_BASE}/exchange/brou/USD
curl "${API_PUBLIC_BASE}/usage?api_key=$CLAVE"`

const TERMS = [
  'La clave es de tu cuenta: no la publiques en el código de una página web. Si se filtra, revocala y creá otra.',
  'Cuando muestres los datos, citá la fuente: «Fuente: Cambio Uruguay», con enlace a cambio-uruguay.com.',
  'Las cotizaciones son las que publica cada casa y pueden tener demoras o errores. No son una oferta de cambio: verificá con la casa antes de operar.',
  'Revender o redistribuir el dato crudo requiere un plan Empresa.',
  'Los techos pueden cambiar; lo avisamos en esta página con 30 días de anticipación.',
  'Medimos cuántos pedidos hace cada clave y a qué rutas, para los límites y el plan. El medidor no guarda direcciones IP.',
]

const FAQ = [
  {
    question: '¿Necesito una clave para usar la API?',
    answer: `No. Sin clave funciona con un techo de ${perMin('anonymous')} pedidos por minuto y ${perDay('anonymous')} por día por dirección IP. La clave te identifica, mide tu consumo y es el camino a un plan con más capacidad.`,
  },
  {
    question: '¿Cuánto cuesta?',
    answer: `La clave gratuita no cuesta nada. El plan Empresa se acuerda según el uso y el producto: escribinos a ${API_CONTACT_EMAIL}.`,
  },
  {
    question: '¿Cada cuánto se actualizan las cotizaciones?',
    answer:
      'Cada casa se consulta cada cinco minutos, y el historial intradía guarda una fila sólo cuando el precio cambió.',
  },
  {
    question: '¿Puedo usarla desde una planilla de Google?',
    answer:
      'Sí, con Apps Script: poné la clave en la dirección con ?api_key= y leé el JSON de la respuesta.',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/empresas'
const title = 'API y datos para empresas en Uruguay'
const description =
  'Cotizaciones de más de 40 casas de cambio cada 5 minutos, historial intradía y de la región, por API. Clave gratis en un minuto y planes para empresas.'

defineOgImageComponent('Cambio', {
  title: 'Datos para empresas',
  subtitle: 'Más de 40 casas de cambio cada 5 minutos, por API',
  tag: 'API',
})

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
              { '@type': 'ListItem', position: 2, name: 'Datos para empresas', item: canonicalUrl },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: FAQ.map(item => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.empresas-page__lead {
  max-width: 760px;
}
.empresas-page__list {
  padding-left: 1.25rem;
  max-width: 820px;
}
.empresas-page__list li {
  margin-bottom: 6px;
}
.empresas-page__code {
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  font-size: 0.85rem;
  overflow-x: auto;
  max-width: 820px;
}
</style>
