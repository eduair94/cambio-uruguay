<template>
  <VContainer class="irpf-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">IMPUESTOS</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Declaración de IRPF: ¿tenés que presentarla y cuándo cobrás la devolución?
      </h1>
      <p class="lead mb-6">
        La propia DGI arranca aclarando que
        <strong>la mayoría de las personas no está obligada</strong>. El problema es el borde: si
        tuviste dos empleadores, si no cobraste en diciembre o si facturaste por tu cuenta, sí. Y
        hay una regla de fechas que decide si cobrás la devolución este mes o el que viene.
      </p>

      <VCard class="dates-card pa-5 pa-md-6" variant="flat">
        <div class="text-overline mb-3">
          Campaña {{ IRPF_CAMPAIGN.campaignYear }} · ingresos {{ IRPF_CAMPAIGN.incomeYear }}
        </div>
        <div class="dates-grid">
          <div class="date-item">
            <div class="date-h">Se habilita</div>
            <div class="date-n">{{ fmt(IRPF_CAMPAIGN.opens) }}</div>
            <p class="mb-0">Dependientes desde el {{ fmt(IRPF_CAMPAIGN.opensForDependents) }}.</p>
          </div>
          <div class="date-item is-deadline">
            <div class="date-h">Último día</div>
            <div class="date-n">{{ fmt(IRPF_CAMPAIGN.deadline) }}</div>
            <p class="mb-0">Después de esa fecha entra la multa por mora.</p>
          </div>
          <div class="date-item is-refund">
            <div class="date-h">Devoluciones desde</div>
            <div class="date-n">{{ fmt(IRPF_CAMPAIGN.refundsFrom) }}</div>
            <p class="mb-0">
              Y ahí entra a jugar la regla del día {{ IRPF_CAMPAIGN.refundCutoffDay }}.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Obligation -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">¿Estás obligado?</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Alcanza con caer en uno de estos casos.
      </p>

      <VCard variant="flat" class="ok-card pa-5 mb-5">
        <div class="d-flex align-start">
          <VIcon icon="mdi-check-circle-outline" color="success" class="mr-3 mt-1" />
          <div>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">El caso más común: no</h3>
            <p class="mb-0 text-medium-emphasis">{{ NOT_OBLIGATED }}</p>
          </div>
        </div>
      </VCard>

      <VRow>
        <VCol v-for="(c, i) in OBLIGATION_CASES" :key="i" cols="12" md="6">
          <VCard variant="flat" class="case-card pa-5 h-100">
            <VChip size="x-small" variant="tonal" :color="kindColor(c.kind)" class="mb-2">
              {{ kindLabel(c.kind) }}
            </VChip>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ c.situation }}</h3>
            <p class="mb-0 text-medium-emphasis">{{ c.detail }}</p>
          </VCard>
        </VCol>
      </VRow>

      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        El tope de ingresos de la campaña {{ IRPF_CAMPAIGN.campaignYear }} (ingresos
        {{ IRPF_CAMPAIGN.incomeYear }}) es de {{ formatUYU(IRPF_CAMPAIGN.incomeThreshold) }}
        nominales anuales. DGI lo fija en cada campaña: para otro año, confirmalo en su resolución.
      </p>
    </section>

    <!-- Forms -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Qué formulario te toca</h2>
      <VCard variant="flat" class="results-card pa-0">
        <VTable class="cu-mobile-cards" density="comfortable">
          <tbody>
            <tr v-for="f in IRPF_FORMS" :key="f.code">
              <td data-label="Formulario" class="font-weight-medium form-code">{{ f.code }}</td>
              <td data-label="Para qué">{{ f.use }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </section>

    <!-- Refund -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">La regla que decide cuándo cobrás</h2>
      <VCard variant="flat" class="highlight-card pa-5 pa-md-6">
        <p class="text-h6 font-weight-bold mb-2">
          Presentá antes del día {{ IRPF_CAMPAIGN.refundCutoffDay }}.
        </p>
        <p class="mb-0">{{ REFUND_RULE }}</p>
      </VCard>
    </section>

    <!-- Mora -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Si te da a pagar y llegás tarde</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        La mora se configura <strong>por el solo vencimiento del plazo</strong>: no hace falta que
        DGI te intime ni que te enteres. La multa escala con el atraso.
      </p>
      <VCard variant="flat" class="results-card pa-0">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th>Cuándo pagás</th>
              <th class="text-right">Multa</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in MORA_TIERS" :key="t.pct">
              <td data-label="Cuándo pagás">{{ t.when }}</td>
              <td data-label="Multa" class="text-right">
                <strong>{{ t.pct }} %</strong>
              </td>
              <td data-label="Detalle" class="text-medium-emphasis">{{ t.detail }}</td>
            </tr>
            <tr>
              <td data-label="Cuándo pagás">Si pedís facilidades de pago</td>
              <td data-label="Multa" class="text-right">
                <strong>{{ MORA_FACILIDADES_PCT }} %</strong>
              </td>
              <td data-label="Detalle" class="text-medium-emphasis">
                En cualquier momento dentro del plazo establecido.
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
      <VAlert type="info" variant="tonal" density="comfortable" class="mt-4">
        {{ RECARGOS_RULE }}
      </VAlert>
      <VAlert type="success" variant="tonal" density="comfortable" class="mt-3">
        {{ GOOD_HISTORY_RELIEF }}
      </VAlert>
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
        <VBtn :to="localePath('/guias/como-funciona-el-irpf-uruguay')" variant="tonal" size="small">
          Cómo funciona el IRPF
        </VBtn>
        <VBtn :to="localePath('/herramientas/calculadora-irpf')" variant="tonal" size="small">
          Calculadora de IRPF
        </VBtn>
        <VBtn
          :to="localePath('/prescripcion-de-deudas-con-el-estado-uruguay')"
          variant="tonal"
          size="small"
        >
          ¿Prescriben las deudas con el Estado?
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Contrastado el {{ verifiedAt }}. Esta página es informativa: lo que resuelve DGI es lo que
        vale.
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
import { formatUYU } from '~/utils/format'
import {
  DGI_FAQ,
  DGI_SOURCES,
  DGI_VERIFIED_AT,
  GOOD_HISTORY_RELIEF,
  IRPF_CAMPAIGN,
  IRPF_FORMS,
  MORA_FACILIDADES_PCT,
  MORA_TIERS,
  NOT_OBLIGATED,
  OBLIGATION_CASES,
  RECARGOS_RULE,
  REFUND_RULE,
  type FilerKind,
} from '~/utils/dgiTaxes'

const localePath = useLocalePath()

/** Esta página responde el trámite; la prescripción vive en su propia página. */
const faq = DGI_FAQ.filter(f => !/prescrib|patente vieja|interrumpe/i.test(f.question))

const kindLabel = (k: FilerKind) =>
  k === 'dependiente'
    ? 'Dependiente'
    : k === 'independiente'
      ? 'Independiente'
      : 'Rentas de capital'
const kindColor = (k: FilerKind) =>
  k === 'dependiente' ? 'primary' : k === 'independiente' ? 'warning' : 'info'

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
const verifiedAt = fmt(DGI_VERIFIED_AT)

const canonicalUrl = 'https://cambio-uruguay.com/declaracion-de-irpf-uruguay'
const title = 'Declaración de IRPF en Uruguay: quién está obligado y cuándo se cobra la devolución'
const description =
  'Quién tiene que presentar la declaración jurada de IRPF y quién no, con los casos que obligan (más de un empleador, sin ingreso en diciembre, formulario 3100, núcleo familiar, servicios personales, rentas de capital), las fechas de la campaña 2026, los formularios 1102/1103/1101, la regla del día 15 que decide cuándo cobrás la devolución, y la multa por mora del artículo 94 del Código Tributario.'

defineOgImageComponent('Cambio', {
  title: '¿Tenés que declarar IRPF?',
  subtitle: 'Obligados, fechas y cuándo cobrás la devolución',
  tag: 'IMPUESTOS',
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
        'declaracion jurada irpf uruguay, quienes estan obligados irpf, formulario 1102, formulario 1103, formulario 1101, devolucion irpf cuando cobro, irpf dos empleadores, formulario 3100, multa por mora dgi, articulo 94 codigo tributario, campaña irpf 2026',
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
              { '@type': 'ListItem', position: 2, name: 'Declaración de IRPF', item: canonicalUrl },
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
.irpf-page {
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

.dates-card,
.results-card,
.case-card,
.ok-card,
.highlight-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
}
.v-theme--light .dates-card,
.v-theme--light .results-card,
.v-theme--light .case-card,
.v-theme--light .ok-card,
.v-theme--light .highlight-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.ok-card {
  border-color: rgba(var(--v-theme-success), 0.45);
}
.highlight-card {
  border-color: rgba(var(--v-theme-primary), 0.45);
}

.dates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.25rem;
}
.date-h {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.65;
}
.date-n {
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 0.25rem;
}
.date-item.is-deadline .date-n {
  color: rgb(var(--v-theme-warning));
}
.date-item.is-refund .date-n {
  color: rgb(var(--v-theme-success));
}

.form-code {
  font-variant-numeric: tabular-nums;
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.8;
}
</style>
