<template>
  <div class="teen-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="8">
          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">mdi-account-school-outline</VIcon>
              TRABAJO ADOLESCENTE
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
              Trabajo para menores de edad en Uruguay: cómo ganar plata a los 15
            </h1>
            <p class="text-body-1 teen-lead">
              Se puede trabajar desde los 15 años, con el carné que entrega el INAU. Acá está qué te
              habilita cada edad, qué documentos pide el trámite, cuántas horas podés trabajar, qué
              tareas están prohibidas y qué vías legales hay para ganar dinero.
            </p>
            <ShareButtons
              class="mt-4"
              :url="canonicalUrl"
              text="Trabajo para menores de edad en Uruguay"
            />
            <p class="text-caption text-medium-emphasis mt-3">
              Normas y trámites verificados contra su fuente el {{ verifiedDisplay }}.
            </p>
          </header>

          <VDivider class="mb-6" />

          <!-- 1. Qué habilita cada edad -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Qué te habilita cada edad</h2>
            <p class="text-body-1 teen-prose mb-3">
              La edad mínima para trabajar son 15 años. Antes de esa edad el trabajo está prohibido,
              salvo una excepción que el INAU autoriza caso por caso.
            </p>
            <div class="table-scroll">
              <table class="teen-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Edad</th>
                    <th>Qué podés hacer</th>
                    <th>Con qué condición</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="rule in ageRules" :key="rule.age">
                    <td>{{ rule.age }}</td>
                    <td data-label="Qué podés hacer">{{ rule.allowed }}</td>
                    <td data-label="Condición">{{ rule.condition }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- 2. El carné -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">El carné de trabajo del INAU</h2>
            <p class="text-body-1 teen-prose mb-3">
              Es gratis y es obligatorio. Un detalle que sorprende a casi todos:
              <strong>primero conseguís el trabajo y después tramitás el carné</strong>, porque
              entre los documentos va un formulario que completa el empleador.
            </p>

            <h3 class="text-subtitle-1 font-weight-bold mb-2">Lo que tenés que llevar</h3>
            <ul class="teen-list mb-4">
              <li v-for="req in requirements" :key="req.item">
                <strong>{{ req.item }}</strong>
                <span v-if="req.note"> — {{ req.note }}</span>
              </li>
            </ul>

            <h3 class="text-subtitle-1 font-weight-bold mb-2">Paso a paso</h3>
            <ol class="teen-steps">
              <li v-for="(step, i) in steps" :key="i" class="mb-3">
                <span class="font-weight-bold">{{ step.name }}.</span>
                <span class="teen-prose">{{ ' ' + step.text }}</span>
              </li>
            </ol>

            <VAlert type="info" variant="tonal" density="comfortable" class="mt-4">
              <p class="mb-0 text-body-2">
                Inspección del Trabajo Infantil y Adolescente del INAU:
                <strong>2402 0604</strong> · <strong>insplaboral@inau.gub.uy</strong>. En Montevideo
                el trámite se hace en Fernández Crespo 1796, subsuelo. En el interior lo hace la
                oficina del INAU de cada departamento.
              </p>
            </VAlert>
          </section>

          <!-- 3. Límites de la jornada -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Cuánto podés trabajar</h2>
            <div class="table-scroll">
              <table class="teen-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Regla</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="limit in limits" :key="limit.rule">
                    <td>{{ limit.rule }}</td>
                    <td data-label="Detalle">{{ limit.detail }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- 4. Trabajos prohibidos -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Trabajos que no podés hacer</h2>
            <p class="text-body-1 teen-prose mb-3">
              El INAU tiene una lista de trabajos peligrosos prohibidos para adolescentes. Ninguna
              autorización habilita una tarea de esta lista.
            </p>
            <ul class="teen-list teen-forbidden">
              <li v-for="item in forbidden" :key="item">{{ item }}</li>
            </ul>
          </section>

          <!-- 5. Formas de ganar dinero -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Formas legales de ganar dinero</h2>
            <div v-for="route in routes" :key="route.title" class="teen-route mb-3">
              <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ route.title }}</h3>
              <p class="text-body-2 teen-prose mb-2">{{ route.body }}</p>
              <p class="text-caption teen-requires mb-0">
                <VIcon size="x-small" class="me-1">mdi-check-circle-outline</VIcon>
                Requiere: {{ route.requires }}
              </p>
            </div>
          </section>

          <!-- 6. Consejos -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Antes de aceptar un trabajo</h2>
            <div v-for="tip in tips" :key="tip.title" class="teen-tip mb-3">
              <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ tip.title }}</h3>
              <p class="text-body-2 teen-prose mb-0">{{ tip.body }}</p>
            </div>
          </section>

          <!-- 7. FAQ -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Preguntas frecuentes</h2>
            <VExpansionPanels variant="accordion" class="teen-faqs">
              <VExpansionPanel v-for="(faq, i) in faqs" :key="i">
                <VExpansionPanelTitle class="font-weight-medium">{{ faq.q }}</VExpansionPanelTitle>
                <VExpansionPanelText>
                  <p class="text-body-1 teen-prose mb-0">{{ faq.a }}</p>
                </VExpansionPanelText>
              </VExpansionPanel>
            </VExpansionPanels>
          </section>

          <!-- 8. Fuentes -->
          <VCard variant="flat" class="teen-sources pa-5 mb-6">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">
              <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
              Fuentes
            </h2>
            <ul class="teen-sources-list">
              <li v-for="source in sources" :key="source.url">
                <a :href="source.url" target="_blank" rel="noopener noreferrer">{{
                  source.label
                }}</a>
                <span class="source-publisher"> — {{ source.publisher }}</span>
              </li>
            </ul>
          </VCard>

          <VCard variant="flat" class="teen-related pa-5">
            <h2 class="text-subtitle-1 font-weight-bold mb-3">Seguí leyendo</h2>
            <div class="d-flex flex-wrap ga-2">
              <VChip
                :to="localePath('/herramientas/calculadora-sueldo-liquido')"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">mdi-calculator</VIcon>
                Calculadora de sueldo líquido
              </VChip>
              <VChip
                :to="localePath('/denunciar-trabajo-en-negro-uruguay')"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">mdi-alert-outline</VIcon>
                Denunciar trabajo en negro
              </VChip>
              <VChip
                :to="localePath('/cuanto-me-tienen-que-pagar-uruguay')"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">mdi-cash-check</VIcon>
                Cuánto me tienen que pagar
              </VChip>
              <VChip
                :to="localePath('/salud-financiera')"
                color="primary"
                variant="tonal"
                size="small"
                link
              >
                <VIcon start size="small">mdi-heart-pulse</VIcon>
                Salud financiera
              </VChip>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import {
  CARNE_REQUIREMENTS,
  CARNE_STEPS,
  FORBIDDEN_WORK,
  MONEY_ROUTES,
  TEEN_AGE_RULES,
  TEEN_WORK_FAQS,
  TEEN_WORK_LIMITS,
  TEEN_WORK_SOURCES,
  TEEN_WORK_TIPS,
  TEEN_WORK_VERIFIED_AT,
} from '~/utils/teenWork'

const localePath = useLocalePath()

const ageRules = TEEN_AGE_RULES
const requirements = CARNE_REQUIREMENTS
const steps = CARNE_STEPS
const limits = TEEN_WORK_LIMITS
const forbidden = FORBIDDEN_WORK
const routes = MONEY_ROUTES
const tips = TEEN_WORK_TIPS
const faqs = TEEN_WORK_FAQS
const sources = TEEN_WORK_SOURCES

const verifiedDisplay = computed(() =>
  new Date(TEEN_WORK_VERIFIED_AT).toLocaleDateString('es-UY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
)

const canonicalUrl = 'https://cambio-uruguay.com/trabajo-para-menores-de-edad-uruguay'
const title = 'Trabajo para menores de edad en Uruguay'
const description =
  'Se puede trabajar desde los 15 años con el carné del INAU, que es gratis. Hasta 6 horas por día, de 6.00 a 22.00. Qué documentos pide el trámite, qué tareas están prohibidas y qué vías legales hay para ganar dinero.'

defineOgImageComponent('Cambio', { title, subtitle: description, tag: 'TRABAJO' })

useSeoMeta({
  title: `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'HowTo',
            name: 'Cómo sacar el carné de trabajo del INAU en Uruguay',
            description:
              'El trámite es gratuito y presencial. Pide el formulario del empleador, así que primero se consigue el trabajo.',
            inLanguage: 'es-UY',
            step: CARNE_STEPS.map((step, index) => ({
              '@type': 'HowToStep',
              position: index + 1,
              name: step.name,
              text: step.text,
            })),
          },
          {
            '@type': 'FAQPage',
            mainEntity: TEEN_WORK_FAQS.map(faq => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: { '@type': 'Answer', text: faq.a },
            })),
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com',
              },
              { '@type': 'ListItem', position: 2, name: title, item: canonicalUrl },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.teen-lead,
.teen-prose {
  line-height: 1.75;
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.teen-list {
  padding-left: 1.15rem;
  line-height: 1.7;
  color: rgba(var(--v-theme-on-surface), 0.86);
}
.teen-list li {
  margin-bottom: 0.4rem;
}

.teen-steps {
  padding-left: 1.25rem;
  line-height: 1.7;
}
.teen-steps li {
  padding-left: 0.25rem;
}

.teen-route,
.teen-tip,
.teen-sources,
.teen-related {
  background: rgba(var(--v-theme-on-surface), 0.03);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
}
.teen-route,
.teen-tip {
  padding: 14px 16px;
}

.teen-requires {
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.teen-faqs :deep(.v-expansion-panel-title) {
  line-height: 1.5;
  padding-top: 0.85rem;
  padding-bottom: 0.85rem;
  min-height: 3.25rem;
}

.table-scroll {
  overflow-x: auto;
}
.teen-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}
.teen-table th,
.teen-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  text-align: left;
  vertical-align: top;
}
.teen-table thead th {
  font-weight: 700;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.teen-table tbody td:first-child {
  font-weight: 600;
}

.teen-sources-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
  line-height: 1.5;
}
.teen-sources-list a {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
  font-weight: 600;
}
.teen-sources-list a:hover {
  text-decoration: underline;
}
.source-publisher {
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
