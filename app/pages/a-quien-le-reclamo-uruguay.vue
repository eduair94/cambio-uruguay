<template>
  <VContainer class="routing-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">RECLAMOS</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">¿A quién le reclamo?</h1>
      <p class="lead mb-6">
        Defensa del Consumidor no es competente para todo. Si tu problema es con la luz, el agua, el
        celular, un banco o el trabajo, hay un organismo específico — y presentarlo en el lugar
        equivocado no te redirige: te hace perder meses.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-numeric-1-circle-outline" color="warning" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Antes que nada</div>
            <p class="mb-0">{{ FIRST_STEP_RULE }}</p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Routing -->
    <section id="organismos" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El organismo que te corresponde</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Defensa del Consumidor es el default. Los servicios regulados tienen el suyo.
      </p>
      <VRow>
        <VCol v-for="b in ROUTING_BODIES" :key="b.id" cols="12" md="6">
          <VCard
            variant="flat"
            class="body-card pa-5 h-100 d-flex flex-column"
            :class="{ 'is-default': b.id === 'dnc' }"
          >
            <div class="d-flex align-start mb-2">
              <VIcon :icon="b.icon" color="primary" class="mr-3 mt-1" />
              <div>
                <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ b.name }}</h3>
                <div class="text-caption text-medium-emphasis">{{ b.fullName }}</div>
              </div>
            </div>
            <ul class="mb-3 pl-4 flex-grow-1">
              <li v-for="(c, i) in b.covers" :key="i">{{ c }}</li>
            </ul>
            <div class="d-flex flex-wrap align-center ga-2">
              <VChip v-if="b.waitAfterProvider" size="x-small" variant="tonal" color="info">
                Esperá {{ b.waitAfterProvider }}
              </VChip>
              <VChip v-else size="x-small" variant="tonal"> Confirmá el plazo en su canal </VChip>
              <VBtn
                :href="b.url"
                target="_blank"
                rel="noopener noreferrer"
                variant="tonal"
                size="x-small"
              >
                Ir al trámite
              </VBtn>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Deadlines -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Los plazos no son el mismo</h2>
      <p class="text-medium-emphasis mb-4" style="max-width: 72ch">
        Es el detalle que hace perder la instancia: uno cuenta días hábiles y el otro días corridos.
      </p>
      <VCard variant="flat" class="results-card pa-0">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th>Organismo</th>
              <th>Espera tras reclamar a la empresa</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in ROUTING_BODIES" :key="b.id">
              <td data-label="Organismo" class="font-weight-medium">{{ b.name }}</td>
              <td data-label="Espera">
                <span v-if="b.waitAfterProvider">{{ b.waitAfterProvider }}</span>
                <span v-else class="text-medium-emphasis">Confirmalo en su canal oficial</span>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </section>

    <!-- BCU limits -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que el Banco Central no puede hacer</h2>
      <p class="text-medium-emphasis mb-4" style="max-width: 72ch">
        Vale la pena saberlo antes de poner la expectativa ahí. El BCU lo dice expresamente.
      </p>
      <VCard variant="flat" class="cannot-card pa-5">
        <ul class="mb-3 pl-4">
          <li v-for="(c, i) in BCU_CANNOT" :key="i" class="mb-2">{{ c }}</li>
        </ul>
        <p class="mb-0">
          <strong>{{ BCU_CANNOT_WHERE }}</strong>
        </p>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in ROUTING_FAQ" :key="f.question">
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
      <h2 class="text-h6 font-weight-bold mb-3">El detalle de cada caso</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn :to="localePath('/derechos-consumidor-compras-online')" variant="tonal" size="small">
          Tus derechos al comprar online
        </VBtn>
        <VBtn :to="localePath('/estafas-uruguay')" variant="tonal" size="small">
          Si te estafaron
        </VBtn>
        <VBtn :to="localePath('/factura-de-ute-uruguay')" variant="tonal" size="small">
          Factura de UTE
        </VBtn>
        <VBtn :to="localePath('/cuanto-me-tienen-que-pagar-uruguay')" variant="tonal" size="small">
          Si te pagan menos del laudo
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Competencias y plazos contrastados el {{ verifiedAt }} con cada organismo. Es información de
        referencia: lo que resuelve cada oficina es lo que vale.
      </p>
      <ul class="sources-list">
        <li v-for="b in ROUTING_BODIES" :key="b.id">
          <a :href="b.url" target="_blank" rel="noopener noreferrer">{{ b.fullName }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  BCU_CANNOT,
  BCU_CANNOT_WHERE,
  FIRST_STEP_RULE,
  ROUTING_BODIES,
  ROUTING_FAQ,
  ROUTING_VERIFIED_AT,
} from '~/utils/complaintRouting'

const localePath = useLocalePath()

const verifiedAt = new Date(ROUTING_VERIFIED_AT).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/a-quien-le-reclamo-uruguay'
const title = '¿A quién le reclamo en Uruguay? Defensa del Consumidor, URSEA, URSEC, BCU y MTSS'
const description =
  'Defensa del Consumidor no es competente para todo: la luz y el agua son URSEA, el celular e internet URSEC, los bancos y aseguradoras el Banco Central, y lo laboral el MTSS. Con los plazos de cada uno (URSEA 15 días hábiles, BCU 15 días corridos), el paso previo de reclamar a la empresa y guardar el número, y las cuatro cosas que el BCU dice expresamente que no puede hacer.'

defineOgImageComponent('Cambio', {
  title: '¿A quién le reclamo?',
  subtitle: 'El organismo que corresponde a cada problema',
  tag: 'RECLAMOS',
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
        'a quien le reclamo uruguay, defensa del consumidor mef, reclamo ursea ute ose, reclamo ursec antel, reclamo bcu banco, denuncia usuario financiero, numero de reclamo empresa, 15 dias habiles ursea, 15 dias corridos bcu, consumo desconocido tarjeta bcu',
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
              { '@type': 'ListItem', position: 2, name: 'A quién le reclamo', item: canonicalUrl },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: ROUTING_FAQ.map(f => ({
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
.routing-page {
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
.body-card,
.results-card,
.cannot-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
}
.v-theme--light .warn-card,
.v-theme--light .body-card,
.v-theme--light .results-card,
.v-theme--light .cannot-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.warn-card {
  border-color: rgba(var(--v-theme-warning), 0.5);
}
.cannot-card {
  border-color: rgba(var(--v-theme-error), 0.45);
}
.body-card.is-default {
  border-color: rgba(var(--v-theme-primary), 0.45);
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.8;
}
</style>
