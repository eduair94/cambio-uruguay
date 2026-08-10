<template>
  <VContainer class="afap-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">JUBILACIÓN</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">¿Cómo me desvinculo de una AFAP?</h1>
      <p class="lead mb-6">
        La respuesta corta es que depende de qué querés deshacer, porque
        <strong>son dos trámites distintos</strong> y casi todo el mundo los mezcla. Acá están las
        condiciones exactas, los pasos y el plazo de {{ AFAP_DECISION_DAYS }} días que hace que
        mucha gente pierda la instancia sin enterarse.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-alert-outline" color="warning" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Lo primero</div>
            <p class="mb-0">{{ AFAP_NOT_THE_SAME }}</p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Two paths -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Las dos cosas que no son la misma</h2>
      <VRow>
        <VCol v-for="p in AFAP_PATHS" :key="p.id" cols="12" md="6">
          <VCard variant="flat" class="path-card pa-5 h-100">
            <div class="d-flex align-start mb-2">
              <VIcon :icon="p.icon" color="primary" class="mr-3 mt-1" />
              <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ p.label }}</h3>
            </div>
            <p class="mb-2">{{ p.what }}</p>
            <p class="mb-0 text-medium-emphasis">{{ p.effect }}</p>
          </VCard>
        </VCol>
      </VRow>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Lo que sigue en esta página es la revocación del artículo 8, que es lo que casi todos están
        buscando.
      </p>
    </section>

    <!-- Checker -->
    <section id="me-corresponde" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">¿Te da para revocar?</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Hay dos condiciones que podés chequear vos y otras que sólo puede confirmar BPS.
      </p>

      <VRow>
        <VCol cols="12" md="5">
          <VCard variant="flat" class="form-card pa-5">
            <VTextField
              v-model.number="age"
              type="number"
              label="Tu edad"
              min="18"
              max="99"
              suffix="años"
              density="comfortable"
              variant="outlined"
              class="mb-4"
            />
            <VSwitch
              v-model="mixedRegime"
              color="primary"
              density="comfortable"
              hide-details
              label="Estoy en el Régimen Mixto"
            />
          </VCard>
        </VCol>
        <VCol cols="12" md="7">
          <VCard
            variant="flat"
            class="verdict-card pa-5 h-100"
            :class="{ 'is-ok': result.possible }"
          >
            <div class="text-overline mb-2">Con lo que se puede medir</div>
            <p class="text-h6 font-weight-bold mb-3">
              <template v-if="result.possible"> Cumplís las dos condiciones medibles. </template>
              <template v-else> Por ahora no da. </template>
            </p>
            <ul v-if="result.blockers.length" class="mb-3 pl-4">
              <li v-for="(b, i) in result.blockers" :key="i">{{ b }}</li>
            </ul>
            <div class="text-overline mb-1">Lo que igual tiene que confirmar BPS</div>
            <ul class="mb-0 pl-4 text-medium-emphasis">
              <li v-for="(c, i) in result.toConfirm" :key="i">{{ c }}</li>
            </ul>
          </VCard>
        </VCol>
      </VRow>

      <VCard variant="flat" class="results-card pa-0 mt-5">
        <div class="pa-4 pb-0 text-overline">Las seis condiciones, completas</div>
        <VTable class="cu-mobile-cards" density="comfortable">
          <tbody>
            <tr v-for="c in AFAP_CONDITIONS" :key="c.id">
              <td data-label="Condición" class="font-weight-medium">{{ c.label }}</td>
              <td data-label="Detalle" class="text-medium-emphasis">{{ c.detail }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </section>

    <!-- Steps -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">El trámite, paso a paso</h2>
      <VRow>
        <VCol v-for="s in AFAP_STEPS" :key="s.n" cols="12" md="6">
          <VCard variant="flat" class="step-card pa-5 h-100">
            <div class="step-n">{{ s.n }}</div>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ s.title }}</h3>
            <p class="mb-0 text-medium-emphasis">{{ s.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
      <VAlert type="warning" variant="tonal" density="comfortable" class="mt-4">
        {{ AFAP_IRREVERSIBLE_WARNING }}
      </VAlert>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in AFAP_FAQ" :key="f.question">
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
          :to="localePath('/guias/reforma-jubilatoria-uruguay-que-cambia')"
          variant="tonal"
          size="small"
        >
          Qué cambió con la reforma
        </VBtn>
        <VBtn
          :to="localePath('/guias/jubilacion-y-afap-como-funciona-uruguay')"
          variant="tonal"
          size="small"
        >
          Cómo funciona la jubilación y la AFAP
        </VBtn>
        <VBtn
          :to="localePath('/guias/elegir-o-cambiar-de-afap-uruguay')"
          variant="tonal"
          size="small"
        >
          Elegir o cambiar de AFAP
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Contrastado el {{ verifiedAt }}. Esta página es informativa: lo que resuelve BPS es lo que
        vale, y el asesoramiento oficial es obligatorio antes de decidir.
      </p>
      <ul class="sources-list">
        <li v-for="s in AFAP_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  AFAP_FAQ,
  AFAP_PATHS,
  AFAP_SOURCES,
  AFAP_VERIFIED_AT,
  AFAP_CONDITIONS,
  AFAP_DECISION_DAYS,
  AFAP_IRREVERSIBLE_WARNING,
  AFAP_NOT_THE_SAME,
  AFAP_STEPS,
  checkRevocation,
} from '~/utils/afapRevocation'

const localePath = useLocalePath()

const age = ref(45)
const mixedRegime = ref(true)

const result = computed(() =>
  checkRevocation({
    age: Number.isFinite(age.value) ? age.value : 0,
    mixedRegime: mixedRegime.value,
  })
)

const verifiedAt = new Date(AFAP_VERIFIED_AT).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/desvincularme-de-la-afap-uruguay'
const title = '¿Cómo me desvinculo de una AFAP? Revocación del artículo 8, paso a paso'
const description =
  'Revocar la opción del artículo 8 no es lo mismo que desafiliarse de la AFAP. Las condiciones exactas de la revocación (40 a 49 años, Régimen Mixto, haber optado sin estar obligado, causal antes de 2043), el asesoramiento obligatorio de BPS y los 90 días corridos que tenés para decidir desde que lo descargás.'

defineOgImageComponent('Cambio', {
  title: '¿Cómo me desvinculo de una AFAP?',
  subtitle: 'Revocar el artículo 8 no es desafiliarse',
  tag: 'JUBILACIÓN',
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
        'desvincularme de la afap, desafiliarse afap uruguay, revocacion articulo 8 ley 16713, revocar afap bps, asesoramiento bps afap, 90 dias revocacion afap, salir de la afap, regimen mixto bps afap, causal jubilatoria 2043',
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
                name: 'Desvincularme de la AFAP',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: AFAP_FAQ.map(f => ({
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
.afap-page {
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
.path-card,
.form-card,
.verdict-card,
.results-card,
.step-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
}
.v-theme--light .warn-card,
.v-theme--light .path-card,
.v-theme--light .form-card,
.v-theme--light .verdict-card,
.v-theme--light .results-card,
.v-theme--light .step-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.warn-card {
  border-color: rgba(var(--v-theme-warning), 0.5);
}
.verdict-card.is-ok {
  border-color: rgba(var(--v-theme-success), 0.55);
}

.step-n {
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
