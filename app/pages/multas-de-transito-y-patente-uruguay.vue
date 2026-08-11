<template>
  <VContainer class="fines-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">AUTO</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Multas de tránsito y patente: los plazos y los números que casi todos pierden
      </h1>
      <p class="lead mb-6">
        Para defenderte de una multa hay dos plazos de diez días — pero
        <strong>uno se cuenta en hábiles y el otro en corridos</strong>, y esa diferencia es la
        forma más común de quedarse sin instancia. Y del otro lado está la patente: cuánto se paga y
        de dónde sale ese número, qué pasa de verdad si no pagás, y por qué el departamento donde
        empadronás no se elige.
      </p>

      <div class="d-flex flex-wrap ga-2 mb-6">
        <VBtn href="#pasos" variant="tonal" size="small">Multas: los plazos</VBtn>
        <VBtn href="#patente" variant="tonal" size="small">Cuánto es la patente</VBtn>
        <VBtn href="#impago" variant="tonal" size="small">Si no pagás</VBtn>
        <VBtn href="#reempadronar" variant="tonal" size="small">Reempadronar</VBtn>
      </div>

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

    <!-- Patente: cómo se calcula -->
    <section id="patente" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">La patente: de dónde sale ese número</h2>
      <VCard variant="flat" class="highlight-card pa-5 pa-md-6 mb-4">
        <div class="text-overline mb-2">El aforo</div>
        <p class="mb-0">{{ PATENTE_AFORO_RULE }}</p>
      </VCard>

      <h3 class="text-subtitle-1 font-weight-bold mb-2">
        Alícuotas {{ PATENTE_YEAR }}, por categoría
      </h3>
      <VCard variant="flat" class="plain-card pa-0 mb-2">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th>Cat.</th>
              <th>Vehículo</th>
              <th>Alícuota</th>
              <th>Sobre qué</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in PATENTE_RATES" :key="r.vehicle">
              <td data-label="Categoría">{{ r.category }}</td>
              <td data-label="Vehículo" class="font-weight-medium">{{ r.vehicle }}</td>
              <td data-label="Alícuota">{{ r.rate }}</td>
              <td data-label="Sobre qué" class="text-medium-emphasis">{{ r.base }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
      <p class="text-caption text-medium-emphasis mb-6">
        Aprobadas por el Congreso de Intendentes el 14 de noviembre de 2025 para el ejercicio
        {{ PATENTE_YEAR }}. Se revotan todos los años: el mecanismo queda, los números hay que
        volver a mirarlos. Una aclaración sobre los eléctricos usados: la noticia del Congreso de
        Intendentes dice «2,25% sobre Valor de Mercado» a secas y el artículo 2.1 del Texto Ordenado
        del SUCIVE 2026 dice «2,25% del valor de mercado sin IVA». Esta tabla sigue al texto
        ordenado, que es la norma, no a la nota de prensa.
      </p>

      <VRow class="mb-2">
        <VCol cols="12" md="6">
          <VCard variant="flat" class="plain-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">
              Modelos viejos: bandas de valor fijo {{ PATENTE_YEAR }}
            </h3>
            <VTable class="cu-mobile-cards" density="compact">
              <thead>
                <tr>
                  <th>Modelo</th>
                  <th>Patente anual</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="b in PATENTE_FIXED_BANDS" :key="b.years">
                  <td data-label="Modelo">{{ b.years }}</td>
                  <td data-label="Patente anual" class="font-weight-medium">{{ b.amount }}</td>
                </tr>
              </tbody>
            </VTable>
            <p class="mb-0 mt-3 text-medium-emphasis text-body-2">{{ PATENTE_FLOOR_RULE }}</p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="warn-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">
              Motos: la escala por cilindrada que no existe
            </h3>
            <p class="mb-0">{{ MOTO_CILINDRADA_RULE }}</p>
          </VCard>
        </VCol>
      </VRow>

      <VCard variant="flat" class="plain-card pa-5">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">Consultá tu importe</h3>
        <p class="mb-3 text-medium-emphasis">
          El valor de patente y la deuda se consultan gratis con matrícula, padrón y gobierno
          departamental. Es el único lugar donde sale tu número.
        </p>
        <div class="d-flex flex-wrap ga-2">
          <VBtn
            :href="PATENTE_CONSULTA_URL"
            target="_blank"
            rel="noopener noreferrer"
            color="primary"
            variant="flat"
            size="small"
          >
            Valor de patente en el SUCIVE
          </VBtn>
          <VBtn
            :href="PATENTE_DEUDA_URL"
            target="_blank"
            rel="noopener noreferrer"
            variant="tonal"
            size="small"
          >
            Consulta de deuda
          </VBtn>
        </div>
      </VCard>
    </section>

    <!-- Vencimientos y bonificaciones -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Cuándo se paga y cuánto te descuentan</h2>
      <VRow>
        <VCol v-for="b in PATENTE_BONIFICACIONES" :key="b.label" cols="12" md="6">
          <VCard variant="flat" class="highlight-card pa-5 h-100">
            <p class="presc-n mb-1">{{ b.pct }}</p>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ b.label }}</h3>
            <p class="mb-0 text-medium-emphasis">{{ b.detail }}</p>
          </VCard>
        </VCol>
      </VRow>

      <VCard variant="flat" class="warn-card pa-5 mt-4 mb-4">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">No se acumulan</h3>
        <p class="mb-0">{{ PATENTE_BONIFICACION_TRAP }}</p>
      </VCard>

      <VCard variant="flat" class="plain-card pa-5">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">Vencimientos {{ PATENTE_YEAR }}</h3>
        <div class="d-flex flex-wrap ga-2 mb-3">
          <VChip v-for="d in PATENTE_DUE_DATES" :key="d" size="small" variant="tonal">
            {{ d }}
          </VChip>
        </div>
        <p class="mb-0 text-medium-emphasis">{{ PATENTE_DUE_DATE_RULE }}</p>
      </VCard>
    </section>

    <!-- Si no pagás -->
    <section id="impago" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Si no pagás la patente</h2>

      <h3 class="text-subtitle-1 font-weight-bold mb-2">La multa por mora</h3>
      <VCard variant="flat" class="plain-card pa-0 mb-2">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th>Cuándo pagás</th>
              <th>Multa sobre el tributo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in PATENTE_MORA_TIERS" :key="t.when">
              <td data-label="Cuándo pagás">{{ t.when }}</td>
              <td data-label="Multa" class="font-weight-medium">{{ t.multa }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
      <p class="text-body-2 text-medium-emphasis mb-6">{{ PATENTE_MORA_RECARGO_RULE }}</p>

      <h3 class="text-subtitle-1 font-weight-bold mb-2">Y después, los bloqueos</h3>
      <VRow>
        <VCol v-for="c in PATENTE_CONSEQUENCES" :key="c.label" cols="12" md="6">
          <VCard variant="flat" class="step-card pa-5 h-100">
            <h4 class="text-subtitle-1 font-weight-bold mb-1">{{ c.label }}</h4>
            <p class="mb-2 text-medium-emphasis">{{ c.detail }}</p>
            <VChip size="x-small" variant="tonal" color="info">{{ c.norm }}</VChip>
          </VCard>
        </VCol>
      </VRow>

      <VCard variant="flat" class="warn-card pa-5 pa-md-6 mt-4 mb-4">
        <div class="d-flex align-start">
          <VIcon icon="mdi-help-circle-outline" color="warning" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">¿Y el clearing?</div>
            <p class="mb-0">{{ PATENTE_CLEARING_ABSENCE }}</p>
          </div>
        </div>
      </VCard>

      <VCard variant="flat" class="highlight-card pa-5 pa-md-6">
        <p class="presc-n mb-1">{{ PATENTE_PRESCRIPTION_YEARS }} años</p>
        <h3 class="text-subtitle-1 font-weight-bold mb-2">Prescripción de la patente</h3>
        <p class="mb-2">{{ PATENTE_PRESCRIPTION_RULE }}</p>
        <p class="mb-0 text-medium-emphasis">{{ PATENTE_PRESCRIPTION_TRAMITE }}</p>
      </VCard>
    </section>

    <!-- Convenio -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">El convenio de pago</h2>
      <VRow>
        <VCol v-for="c in CONVENIO_FACTS" :key="c.label" cols="12" md="6">
          <VCard variant="flat" class="plain-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ c.label }}</h3>
            <p class="mb-0 text-medium-emphasis">{{ c.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
      <VCard variant="flat" class="warn-card pa-5 mt-4">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">
          Antes de firmar, si mirás la prescripción
        </h3>
        <p class="mb-0">{{ CONVENIO_VS_PRESCRIPCION_NOTE }}</p>
      </VCard>
    </section>

    <!-- Reempadronar -->
    <section id="reempadronar" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Reempadronar en otro departamento</h2>
      <VCard variant="flat" class="highlight-card pa-5 pa-md-6 mb-4">
        <p class="mb-0">{{ REEMPADRONAR_RULE }}</p>
      </VCard>

      <VRow>
        <VCol v-for="r in REEMPADRONAR_FACTS" :key="r.label" cols="12" md="6">
          <VCard variant="flat" class="plain-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ r.label }}</h3>
            <p class="mb-0 text-medium-emphasis">{{ r.detail }}</p>
          </VCard>
        </VCol>
      </VRow>

      <VCard variant="flat" class="plain-card pa-5 mt-4">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">Cuánto cuesta</h3>
        <p class="mb-3 text-medium-emphasis">{{ REEMPADRONAR_COST_NOTE }}</p>
        <VBtn
          :href="REEMPADRONAMIENTO_URL"
          target="_blank"
          rel="noopener noreferrer"
          variant="tonal"
          size="small"
        >
          Solicitud de reempadronamiento
        </VBtn>
      </VCard>
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
        el texto ordenado del SUCIVE. Alícuotas, bandas fijas, vencimientos y bonificaciones de
        {{ PATENTE_YEAR }} contrastados el {{ patenteVerifiedAt }} con el Congreso de Intendentes y
        la Intendencia de Montevideo; los valores de patente se revotan todos los años en noviembre,
        así que el importe manda consultarlo. Es información de referencia: lo que resuelve la
        intendencia es lo que vale.
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
  CONVENIO_FACTS,
  CONVENIO_VS_PRESCRIPCION_NOTE,
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
  MOTO_CILINDRADA_RULE,
  PATENTE_AFORO_RULE,
  PATENTE_BONIFICACIONES,
  PATENTE_BONIFICACION_TRAP,
  PATENTE_CLEARING_ABSENCE,
  PATENTE_CONSEQUENCES,
  PATENTE_CONSULTA_URL,
  PATENTE_DEUDA_URL,
  PATENTE_DUE_DATES,
  PATENTE_DUE_DATE_RULE,
  PATENTE_FIXED_BANDS,
  PATENTE_FLOOR_RULE,
  PATENTE_MORA_RECARGO_RULE,
  PATENTE_MORA_TIERS,
  PATENTE_PRESCRIPTION_RULE,
  PATENTE_PRESCRIPTION_TRAMITE,
  PATENTE_PRESCRIPTION_YEARS,
  PATENTE_RATES,
  PATENTE_VERIFIED_AT,
  PATENTE_YEAR,
  REEMPADRONAMIENTO_URL,
  REEMPADRONAR_COST_NOTE,
  REEMPADRONAR_FACTS,
  REEMPADRONAR_RULE,
} from '~/utils/trafficFines'

const localePath = useLocalePath()

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedAt = fmtDate(FINES_VERIFIED_AT)
const patenteVerifiedAt = fmtDate(PATENTE_VERIFIED_AT)

const canonicalUrl = 'https://cambio-uruguay.com/multas-de-transito-y-patente-uruguay'
const title = 'Multas de tránsito y patente en Uruguay: plazos, cálculo y deuda'
const description =
  'Diez días hábiles para el descargo y diez corridos para el recurso: no es el mismo plazo y es la forma más común de perder la instancia. Y la patente: cómo se calcula sobre el aforo, las alícuotas 2026 por categoría, la escala de motos por cilindrada que no existe, qué pasa si no pagás (mora, bloqueo para transferir, retiro de placas), el convenio, la prescripción a los diez años y por qué el departamento donde empadronás no se elige.'

defineOgImageComponent('Cambio', {
  title: 'Multas de tránsito y patente',
  subtitle: 'Los plazos, el aforo y la deuda que sigue al vehículo',
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
        'multas de transito uruguay, descargo multa montevideo, apelar multa transito, prescripcion multas de transito, sucive multas, deuda de patente, devolucion multa pagada, 10 dias habiles descargo, recurso reposicion apelacion intendente, cuanto pago de patente, como se calcula la patente uruguay, patente de moto cilindrada, aforo patente de rodados, consulta patente por matricula, convenio de pago patente sucive, prescripcion deuda de patente, reempadronar en otro departamento, patente impaga clearing',
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
  border-radius: 12px;
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
