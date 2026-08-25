<template>
  <VContainer class="page py-6 py-md-10">
    <!-- Hero -->
    <header class="hero mb-6">
      <p class="eyebrow">Compras en el exterior · Entrega</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">
        ¿Dónde te entregan el paquete del exterior?
      </h1>
      <p class="text-body-1 text-medium-emphasis mb-4">
        La pregunta parece de logística —"¿me lo pueden dejar en una agencia en vez de en mi casa?"—
        y en realidad es del régimen: el nombre y el domicilio del destinatario son requisitos de la
        franquicia, así que cambiarlos puede costarte el beneficio entero. Acá está qué podés
        elegir, qué no, y qué reloj ya está corriendo.
      </p>
      <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-scale-balance">
        Cada opción dice de dónde sale: <strong>norma</strong> (decreto o resolución),
        <strong>operador</strong> (lo que publica el Correo o el courier de su propio servicio) o
        <strong>práctica</strong> (lo que cuenta la gente). Si algo no está publicado, lo decimos en
        vez de suponerlo.
      </VAlert>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        <VIcon size="14" class="mr-1">mdi-file-sign</VIcon>
        ¿Todavía no sabés quién declara el envío ni cómo?
        <NuxtLink :to="localePath('/declarar-compra-exterior-uruguay')">
          Mirá el paso a paso de la declaración </NuxtLink
        >.
      </p>
    </header>

    <!-- Selector: canal + momento -->
    <section class="mb-8" aria-label="Tu situación">
      <h2 class="section-heading mb-1">Contame tu envío</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Las opciones cambian según por dónde entra y en qué momento estás.
      </p>

      <VCard variant="flat" class="picker pa-4 pa-sm-6">
        <div class="text-overline text-medium-emphasis mb-2">¿Por dónde llega?</div>
        <VBtnToggle
          v-model="channel"
          color="primary"
          mandatory
          divided
          variant="outlined"
          class="w-100 mb-5 flex-wrap"
        >
          <VBtn value="correo-simple" class="flex-grow-1">
            <VIcon start>mdi-mailbox-outline</VIcon>
            Correo no exprés
          </VBtn>
          <VBtn value="correo-ems" class="flex-grow-1">
            <VIcon start>mdi-email-fast-outline</VIcon>
            Correo EMS
          </VBtn>
          <VBtn value="courier" class="flex-grow-1">
            <VIcon start>mdi-truck-fast-outline</VIcon>
            Courier privado
          </VBtn>
        </VBtnToggle>

        <div class="text-overline text-medium-emphasis mb-2">¿En qué momento estás?</div>
        <VBtnToggle
          v-model="stage"
          color="primary"
          mandatory
          divided
          variant="outlined"
          class="w-100 mb-2 flex-wrap"
        >
          <VBtn value="antes-de-comprar" class="flex-grow-1">Todavía no compré</VBtn>
          <VBtn value="en-camino" class="flex-grow-1">Está en camino</VBtn>
          <VBtn value="aviso" class="flex-grow-1">Pasaron y no estaba</VBtn>
          <VBtn value="retenido" class="flex-grow-1">Está retenido</VBtn>
        </VBtnToggle>

        <!-- Veredicto -->
        <VAlert
          :type="VERDICT_TONE[answer.verdict]"
          variant="tonal"
          class="mt-4"
          :icon="VERDICT_ICON[answer.verdict]"
          border="start"
        >
          <p class="text-subtitle-1 font-weight-bold mb-2">{{ answer.headline }}</p>
          <ol v-if="answer.steps.length" class="answer-steps">
            <li v-for="(step, i) in answer.steps" :key="i">{{ step }}</li>
          </ol>
        </VAlert>

        <!-- Relojes corriendo -->
        <div v-if="answer.deadlines.length" class="deadlines mt-4">
          <div
            v-for="deadline in answer.deadlines"
            :key="deadline.id"
            class="deadline-row d-flex align-start ga-3"
          >
            <VIcon size="18" color="warning" class="mt-1">mdi-timer-sand</VIcon>
            <div>
              <p class="text-body-2 font-weight-bold mb-1">{{ deadline.label }}</p>
              <p class="text-body-2 text-medium-emphasis mb-1">
                Corre desde {{ deadline.from }}. Al vencer, {{ deadline.expires }}
              </p>
              <SourceChips :sources="deadline.sources" />
            </div>
          </div>
        </div>
      </VCard>
    </section>

    <!-- Opciones para ese canal -->
    <section v-if="answer.options.length" class="mb-8" aria-label="Vías de entrega">
      <h2 class="section-heading mb-1">Las vías que existen</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Para {{ DELIVERY_CHANNEL_LABEL[channel].toLowerCase() }}.
      </p>
      <VCard
        v-for="option in answer.options"
        :key="option.id"
        variant="flat"
        class="option pa-5 mb-3"
      >
        <div class="d-flex align-center flex-wrap ga-2 mb-2">
          <VChip size="small" :color="VERDICT_COLOR[option.verdict]" variant="flat">
            {{ VERDICT_LABEL[option.verdict] }}
          </VChip>
          <span class="text-subtitle-2 font-weight-bold">{{ option.title }}</span>
        </div>
        <p class="text-body-2 text-medium-emphasis option-what mb-2">{{ option.what }}</p>
        <p class="text-body-2 option-detail mb-2">{{ option.detail }}</p>
        <SourceChips :sources="option.sources" />
      </VCard>
    </section>

    <!-- El riesgo que nadie cuenta -->
    <section class="mb-8" aria-label="Lo que te hace perder la franquicia">
      <h2 class="section-heading mb-1">Cuidado con tocar el nombre o la dirección</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Esto es lo que convierte una pregunta de logística en una de plata.
      </p>
      <div class="table-scroll">
        <table class="risk-table cu-mobile-cards">
          <thead>
            <tr>
              <th>Si hacés esto</th>
              <th>Qué se rompe</th>
              <th>Cuánto cuesta</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="risk in ADDRESS_RISKS" :key="risk.id">
              <td>{{ risk.action }}</td>
              <td data-label="Qué se rompe">
                {{ risk.consequence }}
                <SourceChips :sources="risk.sources" class="mt-2" />
              </td>
              <td data-label="Cuánto cuesta">{{ risk.cost ?? 'No está publicado' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- FAQ -->
    <section v-if="faqs.length" class="mb-8" aria-label="Preguntas frecuentes">
      <h2 class="section-heading mb-3">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion" class="faq-panels">
        <VExpansionPanel v-for="(faq, i) in faqs" :key="i">
          <VExpansionPanelTitle class="font-weight-medium">{{ faq.q }}</VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="text-body-2 text-medium-emphasis faq-answer mb-0">{{ faq.a }}</p>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Fuentes -->
    <VCard variant="flat" class="sources-card pa-5 mb-6">
      <h2 class="text-subtitle-1 font-weight-bold mb-3">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Fuentes
      </h2>
      <ul class="sources-list">
        <li v-for="(source, i) in pageSources" :key="i">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
          <span class="source-kind"> — {{ SOURCE_KIND_LABEL[source.kind] }}</span>
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Contrastado el {{ verifiedDisplay }}. No es asesoramiento profesional: confirmá con la
        Dirección Nacional de Aduanas y con tu operador antes de comprar.
      </p>
    </VCard>

    <!-- Relacionadas -->
    <VCard variant="flat" class="related pa-5">
      <h2 class="text-subtitle-1 font-weight-bold mb-3">Seguir por acá</h2>
      <div class="d-flex flex-wrap ga-2">
        <VChip
          v-for="link in related"
          :key="link.to"
          :to="localePath(link.to)"
          color="primary"
          variant="tonal"
          size="small"
          link
        >
          <VIcon start size="small">{{ link.icon }}</VIcon>
          {{ link.label }}
        </VChip>
      </div>
    </VCard>
  </VContainer>
</template>

<script setup lang="ts">
import {
  ADDRESS_RISKS,
  DELIVERY_CHANNEL_LABEL,
  PARCEL_DELIVERY_FAQS,
  PARCEL_DELIVERY_SOURCES,
  PARCEL_DELIVERY_VERIFIED_AT,
  parcelDeliveryAnswer,
  type DeliveryChannel,
  type DeliveryStage,
  type SourceKind,
  type Verdict,
} from '~/utils/parcelDelivery'

const localePath = useLocalePath()
const { locale } = useI18n()

const channel = ref<DeliveryChannel>('correo-simple')
const stage = ref<DeliveryStage>('antes-de-comprar')

const answer = computed(() => parcelDeliveryAnswer(channel.value, stage.value))

const VERDICT_TONE: Record<Verdict, 'success' | 'warning' | 'error' | 'info'> = {
  si: 'success',
  depende: 'warning',
  no: 'error',
  'sin-fuente': 'info',
}

const VERDICT_ICON: Record<Verdict, string> = {
  si: 'mdi-check-circle-outline',
  depende: 'mdi-alert-circle-outline',
  no: 'mdi-close-circle-outline',
  'sin-fuente': 'mdi-help-circle-outline',
}

const VERDICT_COLOR: Record<Verdict, string> = {
  si: 'success',
  depende: 'warning',
  no: 'error',
  'sin-fuente': 'grey',
}

const VERDICT_LABEL: Record<Verdict, string> = {
  si: 'Se puede',
  depende: 'Depende',
  no: 'No se puede',
  'sin-fuente': 'Sin fuente',
}

const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  norma: 'norma',
  operador: 'lo publica el operador',
  practica: 'práctica reportada',
}

const faqs = PARCEL_DELIVERY_FAQS
const pageSources = PARCEL_DELIVERY_SOURCES

const related = [
  {
    to: '/declarar-compra-exterior-uruguay',
    label: 'Cómo se declara',
    icon: 'mdi-file-sign',
  },
  {
    to: '/problemas-con-la-aduana-uruguay',
    label: 'Paquete retenido',
    icon: 'mdi-clipboard-alert-outline',
  },
  { to: '/couriers-uruguay', label: 'Comparar couriers', icon: 'mdi-truck-fast-outline' },
  { to: '/importar', label: 'Qué paga cada mercadería', icon: 'mdi-package-variant-closed' },
]

const verifiedDisplay = computed(() =>
  new Date(PARCEL_DELIVERY_VERIFIED_AT).toLocaleDateString(locale.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
)

const canonicalUrl = 'https://cambio-uruguay.com/donde-te-entregan-el-paquete-uruguay'
const title = '¿Dónde te entregan el paquete del exterior en Uruguay?'
const description =
  'Si podés recibir una compra del exterior en una sucursal o agencia en vez de tu domicilio, qué pasa si no estabas, cuántos días lo guardan y por qué cambiar el nombre o la dirección puede costarte la franquicia.'

defineOgImageComponent('Cambio', {
  title,
  subtitle: 'Sucursal, agencia o domicilio: qué se puede elegir y qué no',
  tag: 'ENVÍOS',
})

useSeoMeta({
  title: `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

// The page rendered its FAQ accordion and its breadcrumb trail for humans only:
// no structured data was emitted at all. The FAQPage entries below are the same
// objects the accordion renders, so the markup can never drift from the answers
// a reader actually sees.
useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
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
            name: 'Compras en el exterior',
            item: 'https://cambio-uruguay.com/importar',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: '¿Dónde te entregan el paquete?',
            item: canonicalUrl,
          },
        ],
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: PARCEL_DELIVERY_FAQS.map(faq => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
      }),
    },
  ],
})
</script>

<style scoped>
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 4px;
}

.section-heading {
  font-size: 1.25rem;
  font-weight: 700;
}

.picker,
.option,
.sources-card,
.related {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.answer-steps {
  padding-left: 1.1rem;
  line-height: 1.7;
  margin: 0;
}

.answer-steps li + li {
  margin-top: 6px;
}

.deadlines {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-what,
.option-detail,
.faq-answer {
  line-height: 1.7;
}

.table-scroll {
  overflow-x: auto;
}

.risk-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.risk-table th,
.risk-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  text-align: left;
  vertical-align: top;
}

.risk-table thead th {
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.risk-table tbody td:first-child {
  font-weight: 600;
}

.sources-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
  line-height: 1.5;
}

.sources-list a {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
  font-weight: 600;
}

.sources-list a:hover {
  text-decoration: underline;
}

.source-kind {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.faq-panels :deep(.v-expansion-panel-title) {
  line-height: 1.5;
  padding-top: 0.85rem;
  padding-bottom: 0.85rem;
  min-height: 3.25rem;
}
</style>
