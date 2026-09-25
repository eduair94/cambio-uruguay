<template>
  <VContainer class="bps-cert-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">BPS</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Certificados del BPS: el común, el especial y cuánto duran
      </h1>
      <p class="lead mb-6">
        Son dos documentos distintos y se piden para cosas distintas. Los dos vencen:
        <strong>{{ BPS_CERTIFICATE_VALIDITY_DAYS }} días corridos</strong> contados
        <strong>desde el día siguiente</strong> a su expedición, «salvo situaciones especiales». Ese
        día de corrimiento es el que hace que alguien llegue tarde por un día a una escritura.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-calendar-alert-outline" color="warning" class="mr-3 mt-1" />
          <div>
            <p class="warn-title mb-2">El vencimiento que vale es el que dice tu certificado</p>
            <p class="mb-0">
              El BPS publica los {{ BPS_CERTIFICATE_VALIDITY_DAYS }} días como plazo general y se
              reserva expresamente las «situaciones especiales». Si estás por firmar, mirá la fecha
              impresa en el documento y no la cuenta que hiciste vos.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Los dos certificados -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuál es cuál</h2>
      <p class="section-intro mb-5">
        La diferencia no es de trámite, es de qué acredita cada uno: uno dice que estás al día, el
        otro que no debés nada a la fecha del acto que lo motiva.
      </p>
      <VRow>
        <VCol v-for="cert in BPS_CERTIFICATES" :key="cert.key" cols="12" md="6">
          <VCard variant="flat" class="cert-card pa-5 h-100 d-flex flex-column">
            <div class="cert-h mb-3">{{ cert.name }}</div>
            <blockquote class="cert-quote mb-3">
              «{{ cert.quote }}»
              <a
                :href="cert.quoteSource"
                target="_blank"
                rel="noopener noreferrer"
                class="cert-src"
              >
                BPS
              </a>
            </blockquote>
            <p class="mb-0 text-medium-emphasis flex-grow-1">{{ cert.useFor }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Los actos que exigen el especial -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        Los {{ BPS_SPECIAL_OPERATIONS.length }} actos que exigen el certificado especial
      </h2>
      <p class="section-intro mb-5">
        Si tu operación está en esta lista, el común no alcanza. Es la lista que publica el BPS.
      </p>
      <VCard variant="flat" class="ops-card pa-2">
        <VList density="comfortable" bg-color="transparent">
          <VListItem v-for="(op, i) in BPS_SPECIAL_OPERATIONS" :key="op">
            <template #prepend>
              <span class="ops-n">{{ i + 1 }}</span>
            </template>
            <VListItemTitle class="ops-text">{{ op }}</VListItemTitle>
          </VListItem>
        </VList>
      </VCard>
    </section>

    <!-- Los plazos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Los plazos, en números</h2>
      <p class="section-intro mb-5">
        Cada uno sale de una página distinta del BPS o del portal de trámites; abajo están todas.
      </p>
      <VRow>
        <VCol v-for="term in TERMS" :key="term.label" cols="12" sm="6" md="3">
          <VCard variant="flat" class="term-card pa-5 h-100">
            <div class="term-n">{{ term.days }}</div>
            <div class="term-h">{{ term.label }}</div>
            <p class="mb-0 text-medium-emphasis">{{ term.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- El costo -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Qué cuesta</h2>
      <VCard variant="flat" class="cost-card pa-5 pa-md-6">
        <p class="mb-3">
          Un <strong>timbre profesional</strong>, y no se paga aparte: el BPS aclara que «la
          solicitud genera el costo de un timbre profesional, cuyo valor se incluye en la siguiente
          factura de obligaciones», bajo el código de pago 113.
        </p>
        <p class="mb-0 text-medium-emphasis">
          <strong>No publicamos el importe a propósito.</strong> El que figura hoy en el trámite
          viene con un período de vigencia acotado a un semestre y ese período ya venció. Preferimos
          decirte que se paga a decirte cuánto y equivocarnos.
        </p>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-5">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion" class="faq-panels">
        <VExpansionPanel v-for="item in BPS_CERTIFICATE_FAQ" :key="item.question">
          <VExpansionPanelTitle class="faq-q">{{ item.question }}</VExpansionPanelTitle>
          <VExpansionPanelText>{{ item.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Fuentes -->
    <section class="mb-4">
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="section-intro mb-4">
        Verificadas el {{ verifiedAt }}. Si vas a firmar algo, confirmá contra la página del BPS:
        los trámites cambian sin aviso.
      </p>
      <ul class="src-list">
        <li v-for="source in BPS_CERTIFICATE_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
        </li>
      </ul>
    </section>

    <section>
      <VRow>
        <VCol cols="12" sm="6">
          <VBtn :to="localePath('/facturar-en-monotributo-uruguay')" variant="tonal" block>
            Facturar en monotributo
          </VBtn>
        </VCol>
        <VCol cols="12" sm="6">
          <VBtn :to="localePath('/que-empresa-abrir-uruguay')" variant="tonal" block>
            Qué empresa abrir en Uruguay
          </VBtn>
        </VCol>
      </VRow>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  BPS_BUYER_TAKEOVER_DAYS,
  BPS_CERTIFICATES,
  BPS_CERTIFICATE_FAQ,
  BPS_CERTIFICATE_SOURCES,
  BPS_CERTIFICATE_VALIDITY_DAYS,
  BPS_CERTIFICATES_VERIFIED_AT,
  BPS_OBSERVATION_DAYS,
  BPS_RENEWAL_WINDOW_DAYS,
  BPS_SPECIAL_OPERATIONS,
} from '~/utils/bpsCertificates'

const localePath = useLocalePath()

const TERMS = [
  {
    days: BPS_CERTIFICATE_VALIDITY_DAYS,
    label: 'días de vigencia',
    detail: 'Corridos, desde el día siguiente a la expedición, salvo situaciones especiales.',
  },
  {
    days: BPS_OBSERVATION_DAYS,
    label: 'días por una observación',
    detail: 'Corridos desde la fecha de observación para salvarla en el certificado especial.',
  },
  {
    days: BPS_RENEWAL_WINDOW_DAYS,
    label: 'días para renovar antes',
    detail: 'Con el común próximo a vencer se puede pedir la renovación hasta diez días antes.',
  },
  {
    days: BPS_BUYER_TAKEOVER_DAYS,
    label: 'días y lo pide el comprador',
    detail: 'Si el vendedor no lo solicitó tras la toma de posesión, puede hacerlo el comprador.',
  },
]

const verifiedAt = new Date(BPS_CERTIFICATES_VERIFIED_AT).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/certificados-bps-uruguay'
const title = 'Certificados del BPS: común y especial'
// La descripción arranca por la cifra y no por lo que la página es: medido en este sitio, un
// snippet con el número corre a ~1,4 % de CTR y uno genérico a 0,03–0,2 % desde la misma
// posición. Entra entera en los 155 caracteres que el SERP publica (`seoDescriptionBudget`).
const description =
  'Valen 180 días corridos desde el día siguiente a la expedición. Qué actos exigen el especial y los 60 días para salvar una observación.'

defineOgImageComponent('Cambio', {
  title: 'Certificados del BPS',
  subtitle: 'Común y especial: 180 días corridos desde el día siguiente',
  tag: 'BPS',
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
        'certificado comun bps, certificado especial bps, vigencia certificado bps, cuanto dura el certificado del bps, certificado bps 180 dias, renovar certificado comun bps, certificado especial para vender inmueble, estar al dia con bps, timbre profesional certificado bps',
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
                name: 'Certificados del BPS',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: BPS_CERTIFICATE_FAQ.map(item => ({
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
.lead {
  font-size: 1.1rem;
  line-height: 1.7;
  max-width: 72ch;
}

.section-intro {
  max-width: 72ch;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.7;
  margin-top: 0;
}

.warn-card {
  border: 1px solid rgba(var(--v-theme-warning), 0.35);
  background: rgba(var(--v-theme-warning), 0.06);
}

.warn-title {
  font-weight: 700;
  margin-top: 0;
}

.cert-card,
.term-card,
.ops-card,
.cost-card {
  border: 1px solid rgba(var(--v-border-color), 0.16);
}

.cert-h {
  font-weight: 700;
  font-size: 1.05rem;
}

.cert-quote {
  margin: 0;
  padding-left: 0.9rem;
  border-left: 3px solid rgba(var(--v-theme-primary), 0.5);
  font-style: italic;
  line-height: 1.6;
}

.cert-src {
  font-style: normal;
  font-size: 0.8rem;
  white-space: nowrap;
}

.ops-n {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  margin-right: 12px;
  border-radius: 50%;
  font-size: 0.8rem;
  font-weight: 700;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
}

.ops-text {
  white-space: normal;
  line-height: 1.55;
}

.term-n {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.1;
  color: rgb(var(--v-theme-primary));
}

.term-h {
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.faq-q {
  font-weight: 600;
}

.src-list {
  max-width: 72ch;
  margin-top: 0;
  padding-left: 1.2rem;
  line-height: 1.8;
}
</style>
