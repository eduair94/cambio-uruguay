<template>
  <VContainer class="fines-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">AUTO</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Multas de tránsito: los plazos que casi todos pierden
      </h1>
      <p class="lead mb-6">
        Los dos plazos para defenderte son de diez días — pero
        <strong>uno se cuenta en hábiles y el otro en corridos</strong>. Esa diferencia es la forma
        más común de quedarse sin instancia. Acá están los pasos, la prescripción y qué pasa si
        pagaste algo que no correspondía.
      </p>

      <VCard class="trap-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-alert-outline" color="warning" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">La trampa</div>
            <p class="mb-0">{{ DEADLINE_TRAP }}</p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Steps -->
    <section id="pasos" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">El camino, paso a paso</h2>
      <VRow>
        <VCol v-for="s in FINE_STEPS" :key="s.n" cols="12" md="6">
          <VCard
            variant="flat"
            class="step-card pa-5 h-100"
            :class="{ 'has-deadline': s.deadline }"
          >
            <div class="d-flex align-baseline mb-1">
              <div class="step-n mr-3">{{ s.n }}</div>
              <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ s.title }}</h3>
            </div>
            <VChip
              v-if="s.deadline"
              size="x-small"
              variant="tonal"
              :color="s.businessDays ? 'info' : 'warning'"
              class="mb-2"
            >
              {{ s.deadline }}
            </VChip>
            <p class="mb-0 text-medium-emphasis">{{ s.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Prescription -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">¿Prescriben?</h2>
      <VCard variant="flat" class="highlight-card pa-5 pa-md-6 mb-4">
        <p class="presc-n mb-1">{{ FINE_PRESCRIPTION_YEARS }} años</p>
        <p class="mb-0">{{ FINE_PRESCRIPTION_RULE }}</p>
      </VCard>

      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="plain-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Qué interrumpe el plazo</h3>
            <ul class="mb-0 pl-4 text-medium-emphasis">
              <li v-for="(c, i) in FINE_PRESCRIPTION_INTERRUPTS" :key="i">{{ c }}</li>
            </ul>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="warn-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Cuidado con este gesto</h3>
            <p class="mb-0">{{ FINE_RECOGNITION_WARNING }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Refund -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Si ya pagaste algo que no correspondía</h2>
      <VRow>
        <VCol v-for="r in FINE_REFUND_ROUTES" :key="r.label" cols="12" md="6">
          <VCard variant="flat" class="plain-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ r.label }}</h3>
            <p class="mb-0 text-medium-emphasis">{{ r.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Scope -->
    <section class="mb-12">
      <VAlert type="info" variant="tonal" density="comfortable">
        {{ FINES_SCOPE_NOTE }}
      </VAlert>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in FINES_FAQ" :key="f.question">
          <VExpansionPanelTitle>
            <div>
              <div class="font-weight-medium">{{ f.question }}</div>
              <div class="text-caption text-medium-emphasis">{{ f.short }}</div>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>{{ f.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Related -->
    <section class="mb-12">
      <h2 class="text-h6 font-weight-bold mb-3">Seguir por acá</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          :to="localePath('/prescripcion-de-deudas-con-el-estado-uruguay')"
          variant="tonal"
          size="small"
        >
          Prescripción de deudas con el Estado
        </VBtn>
        <VBtn :to="localePath('/guias/costos-de-tener-auto-uruguay')" variant="tonal" size="small">
          Cuánto cuesta tener auto
        </VBtn>
        <VBtn :to="localePath('/guias/transferir-un-auto-uruguay')" variant="tonal" size="small">
          Transferir un auto
        </VBtn>
        <VBtn :to="localePath('/a-quien-le-reclamo-uruguay')" variant="tonal" size="small">
          A quién le reclamo
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Plazos y procedimiento contrastados el {{ verifiedAt }} con la Intendencia de Montevideo y
        el texto ordenado del SUCIVE. Es información de referencia: lo que resuelve la intendencia
        es lo que vale.
      </p>
      <ul class="sources-list">
        <li v-for="s in FINES_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  DEADLINE_TRAP,
  FINES_FAQ,
  FINES_SCOPE_NOTE,
  FINES_SOURCES,
  FINES_VERIFIED_AT,
  FINE_PRESCRIPTION_INTERRUPTS,
  FINE_PRESCRIPTION_RULE,
  FINE_PRESCRIPTION_YEARS,
  FINE_RECOGNITION_WARNING,
  FINE_REFUND_ROUTES,
  FINE_STEPS,
} from '~/utils/trafficFines'

const localePath = useLocalePath()

const verifiedAt = new Date(FINES_VERIFIED_AT).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/multas-de-transito-y-patente-uruguay'
const title = 'Multas de tránsito en Uruguay: descargos, recursos y prescripción'
const description =
  'Diez días hábiles para el descargo y diez días corridos para el recurso: no es el mismo plazo y es la forma más común de perder la instancia. Los pasos completos, la prescripción a los cinco años que no opera sola y se interrumpe con cualquier reconocimiento, y las dos vías de devolución si pagaste una multa que no correspondía.'

defineOgImageComponent('Cambio', {
  title: 'Multas de tránsito',
  subtitle: 'Diez días hábiles, y después diez corridos',
  tag: 'AUTO',
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
        'multas de transito uruguay, descargo multa montevideo, apelar multa transito, prescripcion multas de transito, sucive multas, deuda de patente, devolucion multa pagada, 10 dias habiles descargo, recurso reposicion apelacion intendente',
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
                name: 'Multas de tránsito y patente',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: FINES_FAQ.map(f => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.fines-page {
  max-width: 1180px;
}
.lead {
  font-size: 1.075rem;
  line-height: 1.65;
  max-width: 72ch;
  color: rgba(255, 255, 255, 0.82);
}
.v-theme--light .lead {
  color: rgba(0, 0, 0, 0.76);
}

.trap-card,
.step-card,
.highlight-card,
.plain-card,
.warn-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
}
.v-theme--light .trap-card,
.v-theme--light .step-card,
.v-theme--light .highlight-card,
.v-theme--light .plain-card,
.v-theme--light .warn-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.trap-card,
.warn-card {
  border-color: rgba(var(--v-theme-warning), 0.5);
}
.highlight-card {
  border-color: rgba(var(--v-theme-primary), 0.45);
}
.step-card.has-deadline {
  border-color: rgba(var(--v-theme-primary), 0.3);
}

.step-n,
.presc-n {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: rgb(var(--v-theme-primary));
  font-variant-numeric: tabular-nums;
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.8;
}
</style>
