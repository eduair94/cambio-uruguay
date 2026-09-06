<template>
  <VContainer class="cheque-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">BANCOS Y PAGOS</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Cheques en Uruguay: plazos para cobrarlos y qué pasa si rebotan
      </h1>
      <p class="lead mb-6">
        El cheque uruguayo lo rige un decreto-ley de 1975 que sigue vigente, y casi todo lo que se
        cree sobre él está ahí escrito al revés. Lo primero:
        <strong>ponerle fecha futura a un cheque común no lo frena</strong>. El artículo 28 dice que
        el cheque «es pagadero a la vista» y que «toda mención contraria se tendrá por no escrita»,
        así que quien lo tiene puede depositarlo hoy. Para pagar más adelante la ley tiene otro
        documento distinto: el <strong>cheque de pago diferido</strong>.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-file-document-alert-outline" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">El dato que casi nadie sabe</div>
            <p class="callout-text mb-0">
              Recibir un cheque «en garantía» de un préstamo o de un alquiler
              <strong>es delito</strong> en Uruguay, y no del que lo firma sino del que lo acepta o
              lo exige. Está en el artículo 60 desde 1975, con pena de seis a veinticuatro meses de
              prisión, y con condena penal la obligación que se quiso garantizar se extingue de
              pleno derecho.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Plazos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuánto tiempo tenés para presentarlo</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        No es un plazo: son cuatro, y el que te toca depende de dónde se libró el cheque y en qué
        moneda está. Los cuatro salen del artículo 29 y se cuentan por
        <strong>días corridos</strong>, incluyendo el de la fecha de creación y los intermedios. Si
        el vencimiento cae en día inhábil o feriado bancario, el cheque se presenta el primer día
        hábil bancario siguiente.
      </p>

      <VRow dense>
        <VCol v-for="d in PRESENTATION_DEADLINES" :key="d.key" cols="12" sm="6" md="3">
          <VCard variant="flat" class="deadline-card pa-5 h-100">
            <div class="deadline-figure">
              <span class="deadline-value">{{ d.days }}</span>
              <span class="deadline-unit">días</span>
            </div>
            <p class="deadline-case font-weight-medium mb-0">{{ d.caseLabel }}</p>
            <p class="deadline-detail text-body-2 text-medium-emphasis mb-0">{{ d.detail }}</p>
          </VCard>
        </VCol>
      </VRow>

      <VAlert type="warning" variant="tonal" density="comfortable" class="deadline-alert">
        Vencido el plazo, el banco <strong>no debe</strong> pagar el cheque y el tenedor
        <strong>pierde toda acción cambiaria</strong>. El crédito de fondo no desaparece —el
        artículo 46 conserva la acción causal— pero el papel deja de ser el título ejecutivo que lo
        hacía cobrable rápido.
      </VAlert>
    </section>

    <!-- Común vs diferido -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cheque común y cheque de pago diferido</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Son las dos únicas clases que reconoce el artículo 1.º. El diferido no es «un cheque con
        fecha»: es un documento con su propio régimen, su propia libreta y una fecha de pago que el
        banco respeta. Entre su creación y esa fecha
        <strong>no pueden pasar más de {{ DEFERRED_MAX_DAYS }} días</strong>.
      </p>

      <VTable class="kind-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th />
            <th>Cheque común</th>
            <th>Cheque de pago diferido</th>
            <th>Norma</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in CHEQUE_KIND_TRAITS" :key="t.key">
            <td data-label="">
              <span class="font-weight-medium">{{ t.label }}</span>
            </td>
            <td data-label="Cheque común" class="text-body-2">{{ t.common }}</td>
            <td data-label="Cheque de pago diferido" class="text-body-2">{{ t.deferred }}</td>
            <td data-label="Norma" class="text-caption text-medium-emphasis text-no-wrap">
              <a :href="articleUrl(t.article)" target="_blank" rel="noopener noreferrer">
                Art. {{ t.article }}
              </a>
            </td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <!-- Cláusulas -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que se le escribe encima para protegerlo</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Cuatro cláusulas que la ley reconoce y que cambian quién puede cobrarlo. Se escriben a mano
        sobre el propio cheque y no cuestan nada, que es exactamente por qué conviene conocerlas
        antes de entregar uno.
      </p>

      <VRow dense>
        <VCol v-for="c in CHEQUE_CLAUSES" :key="c.key" cols="12" md="6">
          <VCard variant="flat" class="clause-card pa-5 h-100">
            <div class="text-overline mb-2">
              <a :href="articleUrl(c.article)" target="_blank" rel="noopener noreferrer">
                Art. {{ c.article }}
              </a>
            </div>
            <p class="clause-label font-weight-medium mb-0">{{ c.label }}</p>
            <p class="clause-what text-body-2 text-medium-emphasis mb-0">{{ c.what }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Rebote -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Rebotó: qué pasa de cada lado</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Las dos preguntas que llegan cuando un cheque no tiene fondos son distintas —«¿y ahora cómo
        cobro?» y «¿qué me va a pasar?»— y viven en artículos distintos. Van separadas por eso.
      </p>

      <VRow>
        <VCol cols="12" md="6">
          <h3 class="side-heading text-subtitle-1 font-weight-bold mb-3">
            Si te lo rebotaron a vos
          </h3>
          <ul class="step-list">
            <li v-for="s in holderSteps" :key="s.key" class="step-item">
              <div class="step-head">
                <span class="step-label font-weight-medium">{{ s.label }}</span>
                <a
                  class="step-article text-caption"
                  :href="articleUrl(s.article)"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Art. {{ s.article }}
                </a>
              </div>
              <p class="step-detail text-body-2 text-medium-emphasis mb-0">{{ s.detail }}</p>
            </li>
          </ul>
        </VCol>

        <VCol cols="12" md="6">
          <h3 class="side-heading text-subtitle-1 font-weight-bold mb-3">
            Si el que lo libró sos vos
          </h3>
          <ul class="step-list">
            <li v-for="s in drawerSteps" :key="s.key" class="step-item">
              <div class="step-head">
                <span class="step-label font-weight-medium">{{ s.label }}</span>
                <a
                  class="step-article text-caption"
                  :href="articleUrl(s.article)"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Art. {{ s.article }}
                </a>
              </div>
              <p class="step-detail text-body-2 text-medium-emphasis mb-0">{{ s.detail }}</p>
            </li>
          </ul>
        </VCol>
      </VRow>
    </section>

    <!-- Penal -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Los dos delitos del capítulo penal</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El decreto-ley no se queda en la sanción bancaria: tiene su propio capítulo penal. El
        segundo de los dos delitos sorprende a casi todo el mundo, porque castiga a quien
        <em>recibe</em> el cheque.
      </p>

      <VRow dense>
        <VCol v-for="o in CHEQUE_OFFENCES" :key="o.key" cols="12" md="6">
          <VCard variant="flat" class="offence-card pa-5 h-100">
            <div class="text-overline mb-2">
              <a :href="articleUrl(o.article)" target="_blank" rel="noopener noreferrer">
                Art. {{ o.article }}
              </a>
            </div>
            <p class="offence-label font-weight-medium mb-0">{{ o.label }}</p>
            <p class="offence-penalty mb-0">{{ o.penalty }}</p>
            <p class="offence-detail text-body-2 text-medium-emphasis mb-0">{{ o.detail }}</p>
          </VCard>
        </VCol>
      </VRow>

      <VCard variant="flat" class="warn-card pa-5 pa-md-6 mt-6">
        <div class="d-flex align-start">
          <VIcon icon="mdi-cash-refund" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Pagarlo apaga la causa, pero no siempre</div>
            <p class="callout-text mb-0">{{ OFFENCE_EXTINCTION.text }}</p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- No publicamos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que esta página no publica, y por qué</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Tres datos que se buscan y que acá no vas a encontrar. Preferimos el hueco antes que un
        número que no podemos sostener con la norma o con un documento oficial.
      </p>

      <ul class="withheld-list">
        <li v-for="w in CHEQUE_NOT_PUBLISHED" :key="w.claim" class="withheld-item">
          <p class="withheld-claim font-weight-medium mb-0">{{ w.claim }}</p>
          <p class="withheld-why text-body-2 text-medium-emphasis mb-0">{{ w.why }}</p>
        </li>
      </ul>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in CHEQUE_FAQ" :key="f.question">
          <VExpansionPanelTitle>
            <span class="font-weight-medium">{{ f.question }}</span>
          </VExpansionPanelTitle>
          <VExpansionPanelText>{{ f.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Related -->
    <section class="mb-12">
      <h2 class="text-h6 font-weight-bold mb-3">Seguir por acá</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn :to="localePath('/salir-del-clearing')" variant="tonal" size="small">
          Salir del clearing
        </VBtn>
        <VBtn :to="localePath('/saldar-deudas-uruguay')" variant="tonal" size="small">
          Negociar y saldar deudas
        </VBtn>
        <VBtn :to="localePath('/prestamos-p2p-uruguay')" variant="tonal" size="small">
          Préstamos entre personas
        </VBtn>
        <VBtn :to="localePath('/ley-de-usura-uruguay')" variant="tonal" size="small">
          Ley de usura: los seis topes
        </VBtn>
        <VBtn :to="localePath('/limite-de-efectivo-uruguay')" variant="tonal" size="small">
          Límite de efectivo
        </VBtn>
        <VBtn :to="localePath('/a-quien-le-reclamo-uruguay')" variant="tonal" size="small">
          A quién le reclamo
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="sources-note text-body-2 text-medium-emphasis mb-3">
        Todo lo de arriba está contrastado artículo por artículo contra el texto actualizado del
        {{ CHEQUE_LAW.kind }} {{ CHEQUE_LAW.number }} publicado en impo.com.uy, el {{ verifiedAt }}.
        Es la norma vigente desde el 1.º de octubre de 1975 (art. 78). Esta página es informativa y
        no sustituye el asesoramiento de un abogado.
      </p>
      <ul class="sources-list">
        <li v-for="s in CHEQUE_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  BOUNCE_STEPS,
  CHEQUE_CLAUSES,
  CHEQUE_FAQ,
  CHEQUE_KIND_TRAITS,
  CHEQUE_LAW,
  CHEQUE_NOT_PUBLISHED,
  CHEQUE_OFFENCES,
  CHEQUE_SOURCES,
  CHEQUE_VERIFIED_AT,
  DEFERRED_MAX_DAYS,
  OFFENCE_EXTINCTION,
  PRESENTATION_DEADLINES,
  articleUrl,
} from '~/utils/cheques'

const localePath = useLocalePath()

const holderSteps = BOUNCE_STEPS.filter(s => s.side === 'tenedor')
const drawerSteps = BOUNCE_STEPS.filter(s => s.side === 'librador')

const verifiedAt = new Date(`${CHEQUE_VERIFIED_AT}T00:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/cheques-uruguay'
const title = 'Cheque en Uruguay: 15 días para cobrarlo'
const description =
  'Un cheque común se paga a la vista aunque le pongas fecha futura (art. 28). Tenés 15 días corridos para presentarlo en la misma plaza, 30 en otra, 60 si se libró en el exterior y 120 si es en moneda extranjera; el diferido admite hasta 180 entre creación y pago. Si rebota, el librador tiene 5 días hábiles antes de quedarse 6 meses sin cuentas corrientes.'

defineOgImageComponent('Cambio', {
  title: 'Cheques en Uruguay',
  subtitle: '15, 30, 60 o 120 días para cobrarlo, y qué pasa si rebota',
  tag: 'BANCOS Y PAGOS',
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
        'cheques uruguay, cuanto tiempo tengo para cobrar un cheque uruguay, cheque de pago diferido uruguay, plazo de presentacion cheque, cheque sin fondos uruguay, me reboto un cheque, cheque cruzado, cheque certificado, cheque en garantia es delito, ley de cheques uruguay, decreto ley 14412, cuentas corrientes clausuradas bcu',
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
                name: 'Cheques en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: CHEQUE_FAQ.map(f => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            citation: CHEQUE_SOURCES.map(s => ({
              '@type': 'CreativeWork',
              name: s.label,
              url: s.url,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.cheque-page {
  max-width: 1180px;
}

/* Vuetify 4 no cero los márgenes de los bloques de texto, y un <p> que sigue a un hermano se come
   cualquier separación menor a 1em: por eso cada uno declara el suyo. Ver app/AGENTS.md. */
.lead {
  font-size: 1.075rem;
  line-height: 1.65;
  max-width: 72ch;
  margin-top: 0;
}
.section-intro,
.sources-note {
  max-width: 72ch;
  margin-top: 0;
}
.callout-text,
.deadline-case,
.clause-label,
.offence-label,
.withheld-claim,
.step-detail {
  margin-top: 0;
}
.deadline-detail,
.clause-what,
.offence-penalty,
.withheld-why {
  margin-top: 8px;
}
.offence-detail {
  margin-top: 10px;
}

.warn-card,
.deadline-card,
.clause-card,
.offence-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
  background: rgba(var(--v-theme-surface), 1);
}
.warn-card {
  background: rgba(var(--v-theme-primary), 0.06);
}

.deadline-figure {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 10px;
}
.deadline-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.1;
  color: rgb(var(--v-theme-primary));
}
.deadline-unit {
  font-size: 0.95rem;
  opacity: 0.72;
}
.deadline-alert {
  margin-top: 20px;
}

.offence-penalty {
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.kind-table :deep(th) {
  white-space: nowrap;
}
.kind-table a,
.clause-card a,
.offence-card a,
.step-article,
.sources-list a {
  color: rgb(var(--v-theme-primary));
}

.side-heading {
  margin-top: 0;
}
.step-list {
  list-style: none;
  padding-left: 0;
  margin-top: 0;
}
.step-item {
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.1);
}
.step-item:last-child {
  border-bottom: none;
}
.step-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
}
.step-detail {
  line-height: 1.55;
}

.withheld-list {
  list-style: none;
  padding-left: 0;
  margin-top: 0;
}
.withheld-item {
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.1);
  max-width: 78ch;
}
.withheld-item:last-child {
  border-bottom: none;
}

.sources-list {
  padding-left: 18px;
  margin-top: 0;
}
.sources-list li {
  margin-top: 6px;
  line-height: 1.5;
}
</style>
