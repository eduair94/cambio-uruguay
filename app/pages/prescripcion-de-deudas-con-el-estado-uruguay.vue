<template>
  <VContainer class="presc-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">DEUDAS</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        ¿Prescriben las deudas con el Estado?
      </h1>
      <p class="lead mb-6">
        Sí, pero casi todo lo que se repite sobre esto está mezclado. Hay
        <strong>tres regímenes distintos</strong> y la gente los aplica indistintamente: los
        impuestos de DGI, los tributos de la intendencia y la deuda privada. Y hay una trampa que
        arruina el cálculo: <strong>la prescripción tributaria no se aplica sola</strong>.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-alert-outline" color="warning" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Lo primero, porque cambia todo</div>
            <p class="mb-0">{{ PRESCRIPTION_NOT_AUTOMATIC }}</p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Three regimes -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Tres regímenes, no uno</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Antes de contar años, mirá de qué deuda estamos hablando. El plazo cambia por completo.
      </p>
      <VRow>
        <VCol v-for="r in DEBT_REGIMES" :key="r.label" cols="12" md="4">
          <VCard variant="flat" class="regime-card pa-5 h-100 d-flex flex-column">
            <div class="regime-h">{{ r.label }}</div>
            <p class="regime-who mb-3">{{ r.who }}</p>
            <p class="mb-3 text-medium-emphasis flex-grow-1">{{ r.rule }}</p>
            <VBtn
              v-if="r.to"
              :to="localePath(r.to)"
              variant="tonal"
              size="small"
              class="align-self-start"
            >
              Ver la página de deuda privada
            </VBtn>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- DGI -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Impuestos nacionales: el plazo del artículo 38</h2>
      <VRow class="mb-4">
        <VCol cols="12" md="6">
          <VCard variant="flat" class="term-card pa-5 h-100">
            <div class="term-n">{{ PRESCRIPTION_YEARS }} años</div>
            <div class="term-h">Plazo general</div>
            <p class="mb-0 text-medium-emphasis">{{ PRESCRIPTION_START }}</p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="term-card is-long pa-5 h-100">
            <div class="term-n">{{ PRESCRIPTION_YEARS_EXTENDED }} años</div>
            <div class="term-h">Si se dio alguno de estos supuestos</div>
            <ul class="mb-0 pl-4 text-medium-emphasis">
              <li v-for="(c, i) in EXTENSION_CAUSES" :key="i">{{ c }}</li>
            </ul>
          </VCard>
        </VCol>
      </VRow>

      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="regime-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Qué lo interrumpe</h3>
            <p class="text-medium-emphasis mb-2">
              Interrumpir significa que el plazo vuelve a cero.
            </p>
            <ul class="mb-3 pl-4">
              <li v-for="(c, i) in INTERRUPTION_CAUSES" :key="i">{{ c }}</li>
            </ul>
            <!-- Las dos causales que dependen del propio deudor: son las que se pierden por error. -->
            <VAlert type="warning" variant="tonal" density="compact" class="mb-0">
              <span class="text-body-2">{{ INTERRUPTION_WARNING }}</span>
            </VAlert>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="regime-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Multas e intereses</h3>
            <p class="mb-0 text-medium-emphasis">{{ SANCTIONS_PRESCRIPTION }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- The trap -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">La confusión más cara: la patente</h2>
      <VCard variant="flat" class="trap-card pa-5 pa-md-6">
        <p class="mb-3">{{ DEPARTMENTAL_EXCLUSION }}</p>
        <p class="mb-0 text-medium-emphasis">
          Dicho de otra manera: dejar correr una deuda de patente esperando que se caiga a los cinco
          años es apostar a una norma que no la rige.
        </p>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in faq" :key="f.question">
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
        <VBtn :to="localePath('/saldar-deudas-uruguay')" variant="tonal" size="small">
          Negociar y saldar deudas
        </VBtn>
        <VBtn :to="localePath('/salir-del-clearing')" variant="tonal" size="small">
          Salir del Clearing
        </VBtn>
        <VBtn :to="localePath('/declaracion-de-irpf-uruguay')" variant="tonal" size="small">
          Declaración de IRPF
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Contrastado el {{ verifiedAt }}. Esta página es informativa y no sustituye asesoramiento
        profesional: antes de reconocer o pagar una deuda vieja, consultá.
      </p>
      <ul class="sources-list">
        <li v-for="s in DGI_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  DEBT_REGIMES,
  DEPARTMENTAL_EXCLUSION,
  DGI_FAQ,
  DGI_SOURCES,
  DGI_VERIFIED_AT,
  EXTENSION_CAUSES,
  INTERRUPTION_CAUSES,
  INTERRUPTION_WARNING,
  PRESCRIPTION_NOT_AUTOMATIC,
  PRESCRIPTION_START,
  PRESCRIPTION_YEARS,
  PRESCRIPTION_YEARS_EXTENDED,
  SANCTIONS_PRESCRIPTION,
} from '~/utils/dgiTaxes'

const localePath = useLocalePath()

/** Esta página responde la prescripción; el trámite de la declaración vive en su propia página. */
const faq = DGI_FAQ.filter(f => /prescrib|patente|interrumpe/i.test(f.question))

const verifiedAt = new Date(DGI_VERIFIED_AT).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/prescripcion-de-deudas-con-el-estado-uruguay'
const title = '¿Prescriben las deudas con el Estado?'
const description =
  'Los tres regímenes que se confunden: los impuestos de DGI prescriben a los cinco años desde el fin del año civil del hecho gravado (diez si hubo defraudación o no presentaste declaraciones), pero la prescripción no opera sola — hay que pedirla. Y la patente y la contribución son tributos departamentales, que el Código Tributario excluye expresamente de su ámbito.'

defineOgImageComponent('Cambio', {
  title: '¿Prescriben las deudas con el Estado?',
  subtitle: 'DGI, intendencia y deuda privada son tres cosas distintas',
  tag: 'DEUDAS',
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
        'prescripcion deudas dgi uruguay, articulo 38 codigo tributario, prescribe la patente, deuda de patente prescripcion, contribucion inmobiliaria prescripcion, prescripcion tributaria a peticion de parte, interrupcion prescripcion acta final de inspeccion, deuda vieja con dgi',
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
                name: 'Prescripción de deudas con el Estado',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: faq.map(f => ({
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
.presc-page {
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

.warn-card,
.regime-card,
.term-card,
.trap-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
}
.v-theme--light .warn-card,
.v-theme--light .regime-card,
.v-theme--light .term-card,
.v-theme--light .trap-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.warn-card {
  border-color: rgba(var(--v-theme-warning), 0.5);
}
.trap-card {
  border-color: rgba(var(--v-theme-error), 0.45);
}

.regime-h {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.65;
}
.regime-who {
  font-weight: 600;
  margin-bottom: 0.5rem;
}
.term-n {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: rgb(var(--v-theme-primary));
}
.term-card.is-long .term-n {
  color: rgb(var(--v-theme-warning));
}
.term-h {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.65;
  margin-bottom: 0.6rem;
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.8;
}
</style>
