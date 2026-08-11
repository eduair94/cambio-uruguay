<template>
  <VContainer class="residency-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">MUDARSE</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Mudarme a Uruguay: la residencia, sin los números inventados
      </h1>
      <p class="lead mb-6">
        Las dos preguntas que se repiten son «¿cuánto ingreso me piden?» y «¿me alcanza para
        vivir?». La primera tiene una respuesta que desarma la expectativa:
        <strong>no hay un monto mínimo publicado</strong>. La segunda depende de tus números y se
        calcula.
      </p>

      <VCard class="myth-card pa-5 pa-md-6" variant="flat">
        <div class="text-overline mb-2">Antes que nada: no son la misma residencia</div>
        <p class="mb-0">{{ RESIDENCY_NOT_THE_SAME }}</p>
      </VCard>
    </header>

    <!-- Two kinds -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Legal y fiscal: dos organismos, dos efectos</h2>
      <VRow>
        <VCol v-for="k in RESIDENCY_KINDS" :key="k.id" cols="12" md="6">
          <VCard variant="flat" class="kind-card pa-5 h-100 d-flex flex-column">
            <div class="d-flex align-start mb-2">
              <VIcon :icon="k.icon" color="primary" class="mr-3 mt-1" />
              <div>
                <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ k.label }}</h3>
                <div class="text-caption text-medium-emphasis">{{ k.organism }}</div>
              </div>
            </div>
            <p class="mb-2">{{ k.what }}</p>
            <p class="mb-3 text-medium-emphasis flex-grow-1">{{ k.effect }}</p>
            <VBtn
              v-if="k.to"
              :to="localePath(k.to)"
              variant="tonal"
              size="x-small"
              class="align-self-start"
            >
              Ver la residencia fiscal en detalle
            </VBtn>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Means of living -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">«¿Cuánto ingreso me piden?»</h2>
      <VCard variant="flat" class="highlight-card pa-5 pa-md-6">
        <p class="text-h6 font-weight-bold mb-2">No hay una cifra.</p>
        <p class="mb-0">{{ MEANS_OF_LIVING_RULE }}</p>
      </VCard>
    </section>

    <!-- Paths -->
    <section id="vias" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Las tres vías</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Cuál te toca depende de tu nacionalidad. La vía MERCOSUR es sensiblemente más liviana: no
        aparece el requisito de medios de vida ni el carné de salud uruguayo.
      </p>
      <VRow>
        <VCol v-for="p in RESIDENCY_PATHS" :key="p.id" cols="12" md="4">
          <VCard variant="flat" class="path-card pa-5 h-100 d-flex flex-column">
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ p.label }}</h3>
            <p class="text-caption text-medium-emphasis mb-2">{{ p.who }}</p>
            <VChip v-if="p.duration" size="x-small" variant="tonal" color="info" class="mb-3">
              {{ p.duration }}
            </VChip>
            <ul class="mb-3 pl-4 flex-grow-1">
              <li v-for="(r, i) in p.requirements" :key="i">{{ r }}</li>
            </ul>
            <VBtn
              :href="p.url"
              target="_blank"
              rel="noopener noreferrer"
              variant="tonal"
              size="x-small"
              class="align-self-start"
            >
              Ver el trámite
            </VBtn>
          </VCard>
        </VCol>
      </VRow>

      <VCard variant="flat" class="countries-card pa-5 mt-5">
        <div class="text-overline mb-2">Países de la vía MERCOSUR y asociados</div>
        <div class="d-flex flex-wrap ga-2">
          <VChip v-for="c in MERCOSUR_COUNTRIES" :key="c" size="small" variant="tonal">
            {{ c }}
          </VChip>
        </div>
      </VCard>
    </section>

    <!-- Cost + where -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Cuánto sale y dónde se hace</h2>
      <VRow>
        <VCol cols="12" md="5">
          <VCard variant="flat" class="fee-card pa-5 h-100">
            <div class="fee-n">{{ RESIDENCY_FEE_UI }} UI</div>
            <div class="fee-l mb-3">Residencia permanente</div>
            <p class="mb-0 text-medium-emphasis">
              Exentos: {{ RESIDENCY_FEE_EXEMPT.join(' y ') }}. Al estar en Unidades Indexadas, el
              importe en pesos cambia con el valor de la UI.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="7">
          <VCard variant="flat" class="where-card pa-5 h-100 d-flex flex-column justify-center">
            <div class="text-overline mb-2">Dónde</div>
            <p class="mb-0">{{ RESIDENCY_WHERE }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in RESIDENCY_FAQ" :key="f.question">
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
      <h2 class="text-h6 font-weight-bold mb-3">¿Y me alcanza para vivir acá?</h2>
      <p class="text-medium-emphasis mb-3" style="max-width: 72ch">
        La otra mitad de la pregunta, con números en vez de impresiones.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn :to="localePath('/herramientas/costo-de-vida')" variant="tonal" size="small">
          Calculadora de costo de vida
        </VBtn>
        <VBtn :to="localePath('/alquilar-en-uruguay')" variant="tonal" size="small">
          Cómo alquilar
        </VBtn>
        <VBtn :to="localePath('/mejores-bancos-uruguay')" variant="tonal" size="small">
          Abrir cuenta: qué banco
        </VBtn>
        <VBtn :to="localePath('/cambiar-de-mutualista-uruguay')" variant="tonal" size="small">
          Salud: mutualista y FONASA
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Requisitos y costo contrastados el {{ verifiedAt }}. Es información de referencia: lo que
        pide y resuelve la Dirección Nacional de Migración es lo que vale.
      </p>
      <ul class="sources-list">
        <li v-for="s in RESIDENCY_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  MEANS_OF_LIVING_RULE,
  MERCOSUR_COUNTRIES,
  RESIDENCY_FAQ,
  RESIDENCY_FEE_EXEMPT,
  RESIDENCY_FEE_UI,
  RESIDENCY_KINDS,
  RESIDENCY_NOT_THE_SAME,
  RESIDENCY_PATHS,
  RESIDENCY_SOURCES,
  RESIDENCY_VERIFIED_AT,
  RESIDENCY_WHERE,
} from '~/utils/residency'

const localePath = useLocalePath()

const verifiedAt = new Date(RESIDENCY_VERIFIED_AT).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/mudarme-a-uruguay-residencia'
const title = 'Mudarme a Uruguay: residencia legal, requisitos y cuánto ingreso piden'
const description =
  'No hay un monto mínimo de ingreso publicado para la residencia: se acreditan «medios de vida», no una cifra. Las tres vías (temporaria y permanente MERCOSUR, y permanente no MERCOSUR) con sus requisitos, el costo de 557,30 UI con Brasil y Paraguay exentos, dónde se hace el trámite, y la diferencia entre residencia legal y residencia fiscal, que son dos cosas distintas.'

defineOgImageComponent('Cambio', {
  title: 'Mudarme a Uruguay',
  subtitle: 'Residencia: qué piden de verdad',
  tag: 'MUDARSE',
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
        'mudarme a uruguay, residencia legal uruguay, residencia mercosur uruguay, cuanto ingreso piden residencia uruguay, medios de vida migracion, residencia permanente no mercosur, residencia legal vs fiscal, direccion nacional de migracion, vivir en uruguay siendo extranjero',
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
                name: 'Mudarme a Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: RESIDENCY_FAQ.map(f => ({
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
.residency-page {
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

.myth-card,
.kind-card,
.path-card,
.highlight-card,
.fee-card,
.where-card,
.countries-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
}
.v-theme--light .myth-card,
.v-theme--light .kind-card,
.v-theme--light .path-card,
.v-theme--light .highlight-card,
.v-theme--light .fee-card,
.v-theme--light .where-card,
.v-theme--light .countries-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.myth-card {
  border-color: rgba(var(--v-theme-warning), 0.5);
}
.highlight-card {
  border-color: rgba(var(--v-theme-primary), 0.45);
}

.fee-n {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: rgb(var(--v-theme-primary));
  font-variant-numeric: tabular-nums;
}
.fee-l {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.65;
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.8;
}
</style>
