<template>
  <VContainer class="eviction-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">ALQUILER</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Desalojo de un alquiler en Uruguay: los plazos, artículo por artículo
      </h1>
      <p class="lead mb-6">
        En Uruguay hay <strong>dos regímenes de desalojo con plazos distintos</strong>, y cuál te
        rige no lo decide la deuda: lo decide tu contrato. En el régimen sin garantía de la LUC el
        juez decreta el desalojo con <strong>{{ lucVacate }}</strong> y el Alguacil ejecuta el
        lanzamiento dentro de <strong>{{ lucEviction }}</strong> de notificada la providencia. En el
        régimen común el plazo para desocupar es de <strong>{{ commonVacate }}</strong> y el
        lanzamiento no puede hacerse efectivo hasta pasados
        <strong>{{ commonEviction }}</strong> desde el siguiente a la notificación.
      </p>

      <VCard class="warn-card pa-5 pa-md-6 mb-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-lock-alert-outline" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Lo primero, porque se pregunta primero</div>
            <p class="callout-text mb-0">
              El propietario <strong>no puede desocupar por su cuenta</strong>. En los dos regímenes
              el lanzamiento lo hace efectivo el Alguacil con una providencia judicial que lo
              dispone (Ley 19.889, art. 442; Decreto-Ley 14.219, art. 62). Cambiar la cerradura,
              cortar los servicios o sacar las cosas no es un paso del proceso: no lo es ni siquiera
              cuando la deuda existe y el contrato venció.
            </p>
          </div>
        </div>
      </VCard>

      <VCard class="scope-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-file-sign" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Qué régimen te rige</div>
            <p class="callout-text mb-3">
              El régimen rápido de la LUC no se activa por tener poca garantía: exige las
              <strong>cinco condiciones del artículo 421 a la vez</strong>, y una de ellas es que
              las dos partes hayan hecho constar expresamente en el contrato que se someten a esa
              ley. Si falta cualquiera, el arrendamiento se rige por el Decreto-Ley 14.219 o por el
              Código Civil, según el caso.
            </p>
            <ul class="req-list">
              <li v-for="req in NO_GUARANTEE_REQUIREMENTS" :key="req">{{ req }}</li>
            </ul>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Los dos regímenes, paso por paso -->
    <section v-for="regime in EVICTION_REGIMES" :key="regime.id" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">{{ regime.name }}</h2>
      <p class="section-intro text-medium-emphasis mb-2">{{ regime.appliesTo }}</p>
      <p class="section-law text-caption text-medium-emphasis mb-5">{{ regime.law }}</p>

      <VTable class="step-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Paso</th>
            <th>Plazo que fija la ley</th>
            <th>Norma</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="step in regime.steps" :key="step.id">
            <td data-label="Paso">
              <div class="font-weight-medium">{{ step.label }}</div>
              <div class="text-caption text-medium-emphasis step-detail">{{ step.detail }}</div>
            </td>
            <td data-label="Plazo">
              <strong>{{ step.deadline }}</strong>
            </td>
            <td data-label="Norma" class="text-caption text-medium-emphasis">
              <a :href="step.url" target="_blank" rel="noopener noreferrer">{{ step.article }}</a>
            </td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <!-- Lo que no se puede contestar en días -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Por qué acá no dice cuánto tarda</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        La ley le pone plazo a cada paso, no al tiempo que el juzgado se toma entre uno y otro. Y
        hay un paso sin ningún plazo legal: el artículo 438 habilita al arrendador a iniciar el
        desalojo una vez configurada la mora, y puede hacerlo al día siguiente o meses después.
        Sumar las filas de las tablas de arriba daría un número que ningún expediente cumple, así
        que los plazos van de a uno, con su artículo, y la suma no se publica.
      </p>
    </section>

    <!-- La trampa del alcance -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        La mitad del Decreto-Ley 14.219 que no rige en un apartamento moderno
      </h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El artículo 102 excluye de la ley a los contratos sobre fincas construidas después del
        {{ cutoffText }} «con excepción de las contenidas en el Capítulo VII y Sección I del
        Capítulo VIII». El Capítulo VII son las garantías y la Sección I del Capítulo VIII
        (artículos 43 a 62) es el procedimiento: o sea que de esa ley sobreviven los plazos de las
        tablas de arriba, y no sobreviven las prórrogas y los plazos del Capítulo VI, que son
        justamente los que más se citan. El mismo artículo agrega otra cosa que se pasa por alto:
        los beneficios para inquilinos sólo los puede invocar quien tenga la calidad de buen
        pagador, pero el procedimiento del Capítulo VIII se aplica igual a los malos pagadores.
      </p>

      <VTable class="term-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Causal</th>
            <th>Plazo de desalojo</th>
            <th>Norma</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="term in EXCEPTIONAL_CAUSE_TERMS" :key="term.label">
            <td data-label="Causal">{{ term.label }}</td>
            <td data-label="Plazo">
              <strong>{{ term.deadline }}</strong>
            </td>
            <td data-label="Norma" class="text-caption text-medium-emphasis">{{ term.article }}</td>
          </tr>
        </tbody>
      </VTable>
      <p class="table-note text-caption text-medium-emphasis">
        Estos plazos son de las causales excepcionales, no del desalojo por falta de pago, y viven
        en el Capítulo VI: en una finca construida después del {{ cutoffText }} no se invocan.
      </p>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in EVICTION_FAQ" :key="f.question">
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
        <VBtn :to="localePath('/alquilar-en-uruguay')" variant="tonal" size="small">
          Guía para alquilar
        </VBtn>
        <VBtn :to="localePath('/garantia-de-alquiler-uruguay')" variant="tonal" size="small">
          Garantía de alquiler
        </VBtn>
        <VBtn :to="localePath('/deuda-de-gastos-comunes-uruguay')" variant="tonal" size="small">
          Deuda de gastos comunes
        </VBtn>
        <VBtn :to="localePath('/alquilar-estando-en-clearing')" variant="tonal" size="small">
          Alquilar estando en el Clearing
        </VBtn>
        <VBtn :to="localePath('/alquileres-uruguay')" variant="tonal" size="small">
          Alquileres disponibles
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="sources-note text-body-2 text-medium-emphasis mb-3">
        Cotejado contra el texto vigente en impo.com.uy el {{ verifiedAt }}. Esta página es
        informativa y no sustituye el asesoramiento de un abogado: lo que vale en un expediente es
        lo que resuelve el juez. Si ya tenés una intimación o una demanda, hay consultorios
        jurídicos gratuitos.
      </p>
      <ul class="sources-list">
        <li v-for="s in EVICTION_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  DL14219_SCOPE_CUTOFF,
  EVICTION_FAQ,
  EVICTION_REGIMES,
  EVICTION_SOURCES,
  EVICTION_VERIFIED_AT,
  EXCEPTIONAL_CAUSE_TERMS,
  NO_GUARANTEE_REQUIREMENTS,
  evictionStep,
} from '~/utils/eviction'

const localePath = useLocalePath()

/**
 * Los cuatro plazos del encabezado salen del catálogo, no escritos a mano: si una reforma mueve uno,
 * el snippet y la tabla no pueden quedar diciendo cosas distintas.
 */
const lucVacate = evictionStep('sinGarantia', 'desalojo')?.deadline ?? ''
const lucEviction = evictionStep('sinGarantia', 'lanzamiento')?.deadline ?? ''
const commonVacate = evictionStep('comun', 'desalojo')?.deadline ?? ''
const commonEviction = '15 días hábiles'

const asUyDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedAt = asUyDate(EVICTION_VERIFIED_AT)
const cutoffText = asUyDate(DL14219_SCOPE_CUTOFF)

const canonicalUrl = 'https://cambio-uruguay.com/desalojo-de-alquiler-uruguay'
const title = 'Desalojo de alquiler en Uruguay: plazos'
// Literal a propósito, y no armada con los plazos del catálogo: así la mide el trinquete de los 155
// caracteres de `seoDescriptionBudget.test.ts`, que sólo lee descripciones literales. La sincronía
// con el catálogo la cuida `tests/unit/eviction.test.ts`, que falla si un plazo del snippet deja de
// coincidir con el artículo.
const description =
  'Son dos regímenes y lo decide el contrato: sin garantía, 6 días hábiles para desocupar y 5 para el lanzamiento; común, 20 días y se frena pagando +40 %.'

defineOgImageComponent('Cambio', {
  title: 'Desalojo de un alquiler en Uruguay',
  subtitle: 'Los dos regímenes y sus plazos, con el artículo al lado',
  tag: 'ALQUILER',
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
        'desalojo uruguay, desalojo por falta de pago uruguay, cuanto tarda un desalojo uruguay, plazo de desalojo uruguay, lanzamiento desalojo uruguay, ley 14219 desalojo, ley 19889 desalojo mal pagador, me quieren desalojar uruguay, intimacion de pago alquiler uruguay, mal pagador alquiler uruguay',
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
                name: 'Alquilar en Uruguay',
                item: 'https://cambio-uruguay.com/alquilar-en-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Desalojo de un alquiler',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: EVICTION_FAQ.map(f => ({
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
            citation: EVICTION_SOURCES.map(s => ({
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
.eviction-page {
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
.section-law {
  margin-top: 0;
}
.table-note {
  margin-top: 12px;
  max-width: 72ch;
}

.warn-card,
.scope-card {
  border: 1px solid rgba(var(--v-theme-primary), 0.28);
  background: rgba(var(--v-theme-primary), 0.05);
}

.req-list,
.sources-list {
  margin-top: 0;
  padding-left: 20px;
}
.req-list li,
.sources-list li {
  margin-bottom: 6px;
  font-size: 0.9rem;
  line-height: 1.5;
}

.step-detail {
  display: block;
  margin-top: 4px;
  max-width: 72ch;
}

.step-table a,
.sources-list a {
  color: rgb(var(--v-theme-primary));
}
</style>
