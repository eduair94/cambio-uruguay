<template>
  <VContainer class="manipulacion-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">SALUD Y TRABAJO</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Carné de manipulación de alimentos: cuánto sale y cuánto dura en cada departamento
      </h1>
      <p class="lead mb-6">
        No hay un precio nacional porque no hay un carné nacional. Lo emite cada intendencia, y por
        eso el mismo documento sale <strong>$ 0 en Montevideo</strong> y
        <strong>$ 850 en Paysandú</strong>, y vale <strong>5 años</strong> en una y
        <strong>3</strong> en la otra. Acá están las {{ departments.length }} fichas oficiales
        publicadas, con lo que cada una declara y con lo que no.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-card-account-details-outline" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Lo que más se confunde</div>
            <p class="callout-text mb-0">
              El carné de manipulación y el
              <NuxtLink :to="localePath('/carne-de-salud-uruguay')">carné de salud</NuxtLink>
              son documentos distintos y hacen falta los dos. El de salud lo exige una norma
              nacional a todo el personal de cualquier empresa alimentaria y se saca en tu
              prestador; el de manipulación acredita capacitación en inocuidad y lo da tu
              intendencia. Lavalleja, de hecho, pide el de salud vigente para dejarte empezar el
              otro.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- La tabla: el dato de cabeza -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        Lo que cobra y lo que dura cada intendencia que lo publica
      </h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Ordenadas por lo que sale, de menos a más. Los importes en Unidades Reajustables van al
        final porque no se pueden comparar con los de pesos sin inventar una conversión: ninguna de
        esas fichas dice a qué valor de UR se cobran, y la de Canelones aclara que usa una «U.R.
        Municipal» que se ajusta cada seis meses.
      </p>

      <VCard variant="flat" class="table-card pa-0">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th>Departamento</th>
              <th>Cuánto sale</th>
              <th>Cuánto dura</th>
              <th>Cómo se hace</th>
              <th>La letra chica</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in departments" :key="row.department">
              <td data-label="Departamento" class="font-weight-medium">
                {{ row.department }}
                <span class="d-block text-caption text-medium-emphasis">
                  {{ row.documentName }}
                </span>
              </td>
              <td data-label="Cuánto sale" :class="row.costKind === 'sin-costo' ? 'is-free' : ''">
                {{ row.cost }}
              </td>
              <td data-label="Cuánto dura">{{ validityLabel(row.validityYears) }}</td>
              <td data-label="Cómo se hace">{{ channelLabel(row.channel) }}</td>
              <td data-label="La letra chica" class="cu-cell-prose text-medium-emphasis">
                {{ row.note }}
                <span class="d-block mt-2">
                  <a
                    :href="sourceFor(row.sourceIndex).url"
                    target="_blank"
                    rel="noopener noreferrer"
                    >Ficha oficial</a
                  >
                  <template v-if="row.updatedAt">
                    — actualizada el {{ shortDate(row.updatedAt) }}
                  </template>
                  <template v-else> — sin fecha de actualización publicada </template>
                </span>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>

      <VAlert type="info" variant="tonal" density="comfortable" class="table-alert">
        <strong>{{ withoutValidity.length }} de las {{ departments.length }}</strong> fichas —{{
          withoutValidity.join(', ')
        }}— no publican la vigencia del carné. Acá no se les pone «3 años» por parecido con las
        vecinas: vale la fecha impresa en el tuyo.
      </VAlert>
    </section>

    <!-- Los doce que no publican -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        Los otros {{ withoutSheet.length }} departamentos lo exigen igual
      </h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Estos {{ withoutSheet.length }} no tenían ficha del trámite en el catálogo de gub.uy cuando
        se revisó, el {{ checkedDisplay }}. Que no esté publicada no quiere decir que sea gratis ni
        que no haga falta: quiere decir que el importe y el plazo hay que preguntarlos en la
        intendencia.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VChip v-for="name in withoutSheet" :key="name" variant="outlined" size="small">
          {{ name }}
        </VChip>
      </div>
    </section>

    <!-- Lo que sí es nacional -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que sí dice la norma nacional</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El Reglamento Bromatológico Nacional (Decreto 315/994) regula al personal que manipula
        alimentos y nunca nombra un «carné de manipulación»: se leyó su texto consolidado sección
        por sección el {{ checkedDisplay }}. Lo que sí exige es esto, con la transcripción textual
        de cada apartado.
      </p>

      <VRow>
        <VCol v-for="rule in nationalRules" :key="rule.headline" cols="12" md="4">
          <VCard variant="flat" class="rule-card pa-5 pa-md-6 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ rule.headline }}</h3>
            <p class="rule-detail mb-4">{{ rule.detail }}</p>
            <blockquote class="rule-quote">{{ rule.quote }}</blockquote>
            <p class="rule-source text-body-2 text-medium-emphasis mb-0">
              <a
                :href="sourceFor(rule.sourceIndex).url"
                target="_blank"
                rel="noopener noreferrer"
                >{{ rule.article }}</a
              >
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Montevideo, el caso que más gente busca -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Montevideo: gratis, en línea y por cinco años</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Es el único de los siete que no cobra nada, y el único donde el trámite entero —inscripción,
        curso y examen— se resuelve sin pasar por una caja ni por un mostrador. Vale la pena el
        detalle de los plazos: entre que te inscribís y que tenés el certificado pasan dos esperas
        de 15 días hábiles, con el curso en el medio.
      </p>

      <VRow dense>
        <VCol v-for="step in MVD_STEPS" :key="step.title" cols="12" md="4">
          <VCard variant="flat" class="step-card pa-5 h-100">
            <div class="step-figure">{{ step.when }}</div>
            <p class="step-title font-weight-medium mb-1">{{ step.title }}</p>
            <p class="step-detail text-body-2 text-medium-emphasis mb-0">{{ step.detail }}</p>
          </VCard>
        </VCol>
      </VRow>

      <VAlert type="info" variant="tonal" density="comfortable" class="table-alert">
        El certificado se emite en cinco categorías —operario, decisor, transportista, delivery y
        libre de gluten— y hay que elegir la del puesto. Aparte, las empresas alimentarias deben
        acreditar la capacitación de su personal cada 2 años ante el Servicio de Regulación
        Alimentaria, salvo almacenes, quioscos, salones, bares, pubs y toda empresa con menos de 5
        personas empleadas, exonerados de presentar el plan por la Resolución 4506/21.
      </VAlert>
    </section>

    <!-- La unidad intermedia, antes de las preguntas: mismo corte que FaqSection (ver
         docs/seo/adsense-growth-loop.md, 31/10/2026). Sólo dibuja en densidad normal. -->
    <AdSlot placement="in-article" class="mb-6" />

    <!-- Preguntas -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion" class="faq-panels">
        <VExpansionPanel v-for="faq in faqs" :key="faq.q" :title="faq.q">
          <template #text>
            <p class="faq-answer mb-0">{{ faq.a }}</p>
          </template>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Relacionadas -->
    <section class="mb-12">
      <h2 class="text-h6 font-weight-bold mb-3">Seguí por acá</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          v-for="link in related"
          :key="link.to"
          :to="localePath(link.to)"
          variant="tonal"
          size="small"
        >
          {{ link.label }}
        </VBtn>
      </div>
    </section>

    <!-- Fuentes -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Cada ficha se leyó en su fuente oficial el {{ checkedDisplay }}. Esta página es informativa:
        quien resuelve tu trámite es la intendencia de tu departamento.
      </p>
      <ul class="sources-list">
        <li v-for="s in sources" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
          <span class="text-medium-emphasis"> — {{ s.publisher }}</span>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import {
  FOOD_HANDLER_CHECKED_AT,
  FOOD_HANDLER_DEPARTMENTS,
  FOOD_HANDLER_FAQS,
  FOOD_HANDLER_NATIONAL_RULES,
  FOOD_HANDLER_RELATED,
  FOOD_HANDLER_SOURCES,
  FOOD_HANDLER_WITHOUT_SHEET,
  foodHandlerChannelLabel,
  foodHandlerValidityLabel,
  foodHandlerWithoutValidity,
} from '~/utils/foodHandlerCard'

const localePath = useLocalePath()

const departments = FOOD_HANDLER_DEPARTMENTS
const withoutSheet = FOOD_HANDLER_WITHOUT_SHEET
const nationalRules = FOOD_HANDLER_NATIONAL_RULES
const faqs = FOOD_HANDLER_FAQS
const related = FOOD_HANDLER_RELATED
const sources = FOOD_HANDLER_SOURCES

const withoutValidity = foodHandlerWithoutValidity()
const channelLabel = foodHandlerChannelLabel
const validityLabel = foodHandlerValidityLabel

const sourceFor = (index: number) => FOOD_HANDLER_SOURCES[index] ?? FOOD_HANDLER_SOURCES[0]!

/**
 * Los tres tramos del trámite de Montevideo, con el plazo que publica la ficha.
 * Van acá y no en el catálogo porque son prosa de esta sección, no un dato que
 * otra página pueda reutilizar.
 */
const MVD_STEPS = [
  {
    when: 'Día 0',
    title: 'Formulario de inscripción',
    detail: 'En línea. Hay que poder entrar al correo que se declara: por ahí llega todo lo demás.',
  },
  {
    when: '15 días hábiles',
    title: 'Llega el acceso al curso',
    detail:
      'El curso es 100 % virtual y autogestionado, desde el celular o la computadora, y queda abierto 3 meses desde la inscripción.',
  },
  {
    when: '+15 días hábiles',
    title: 'Se emite el certificado',
    detail:
      'Después de aprobar la evaluación final. El estado se consulta con el número de documento, y vale 5 años.',
  },
] as const

const dateFormat = (iso: string) =>
  new Date(iso).toLocaleDateString('es-UY', {
    timeZone: siteTimeZone(iso),
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-UY', {
    timeZone: siteTimeZone(iso),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

const checkedDisplay = computed(() => dateFormat(FOOD_HANDLER_CHECKED_AT))

const canonicalUrl = 'https://cambio-uruguay.com/carne-de-manipulacion-de-alimentos-uruguay'
// La respuesta en el título, no la pregunta. La consulta de cabeza pide un precio y la respuesta
// honesta es que no hay uno: va el rango de lo que las fichas publican en pesos, que es lo que
// `foodHandlerPesoRange()` calcula sobre el mismo catálogo que imprime la tabla (Montevideo 0,
// Paysandú 850). 37 caracteres: con la marca que agrega app.vue quedan 53.
const title = 'Carné de manipulación: de $ 0 a $ 850'
const description =
  'Lo emite cada intendencia: Montevideo no cobra y dura 5 años, Paysandú cobra $ 850 y dura 3. Las 7 fichas oficiales publicadas, con su fuente.'

defineOgImageComponent('Cambio', { title, subtitle: description, tag: 'SALUD' })

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
            '@type': 'FAQPage',
            mainEntity: FOOD_HANDLER_FAQS.map(faq => ({
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
/*
 * El reset de Vuetify 4 no anula el `margin-block: 1em` de la UA en `<p>`, y
 * estos párrafos vienen DESPUÉS de un hermano (el h1, el h2, el h3), así que
 * la regla `:first-child` de critical.css no los alcanza y ese 1em pisaría
 * cualquier separación menor que se declare arriba. Ver DESIGN.md → «The Text
 * Block Owns Its Top Margin Rule».
 */
.lead,
.section-intro,
.callout-text,
.rule-detail,
.step-detail,
.faq-answer {
  margin-top: 0;
  line-height: 1.75;
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.lead {
  max-width: 74ch;
  font-size: 1.05rem;
}

.section-intro {
  max-width: 72ch;
}

.warn-card {
  background: rgba(var(--v-theme-primary), 0.07);
  border: 1px solid rgba(var(--v-theme-primary), 0.24);
  border-radius: 12px;
}

.table-card,
.rule-card,
.step-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}

.table-card {
  overflow: hidden;
}

.is-free {
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.table-alert {
  margin-top: 20px;
}

.step-figure {
  font-size: 1.1rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 6px;
}

.step-title {
  margin-top: 0;
}

.rule-quote {
  margin: 0 0 12px;
  padding-left: 14px;
  border-left: 3px solid rgba(var(--v-theme-primary), 0.4);
  font-style: italic;
  line-height: 1.7;
  color: rgba(var(--v-theme-on-surface), 0.78);
}

.rule-source {
  margin-top: 0;
}

.sources-list {
  margin-top: 0;
  padding-left: 20px;
  line-height: 1.9;
}

.cu-cell-prose {
  max-width: 44ch;
  white-space: normal;
}
</style>
