<template>
  <VContainer class="def-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">CONSUMO</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Defensa del Consumidor: qué puede hacer por vos y qué no
      </h1>
      <p class="lead mb-6">
        Casi todo el mundo llega al reclamo esperando que le devuelvan la plata, y no es lo que el
        organismo hace. Entender el límite cambia cómo se usa la herramienta — y hay
        <strong>dos palancas en la ley</strong> que casi nadie usa y que sí inclinan el caso.
      </p>

      <VCard class="thesis-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-scale-balance" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Lo primero</div>
            <p class="mb-0">{{ DEFENSE_THESIS }}</p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Powers -->
    <section id="puede" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Lo que puede y lo que no</h2>
      <VRow>
        <VCol cols="12" md="6">
          <div class="text-overline mb-3">Puede</div>
          <div class="d-flex flex-column ga-3">
            <VCard v-for="p in canDo" :key="p.title" variant="flat" class="power-card can pa-4">
              <div class="d-flex align-start">
                <VIcon
                  icon="mdi-check-circle-outline"
                  color="success"
                  size="small"
                  class="mr-3 mt-1"
                />
                <div>
                  <h3 class="text-subtitle-2 font-weight-bold mb-1">{{ p.title }}</h3>
                  <p class="mb-2 text-medium-emphasis text-body-2">{{ p.detail }}</p>
                  <VChip size="x-small" variant="tonal">{{ p.source }}</VChip>
                </div>
              </div>
            </VCard>
          </div>
        </VCol>
        <VCol cols="12" md="6">
          <div class="text-overline mb-3">No puede</div>
          <div class="d-flex flex-column ga-3">
            <VCard
              v-for="p in cannotDo"
              :key="p.title"
              variant="flat"
              class="power-card cannot pa-4"
            >
              <div class="d-flex align-start">
                <VIcon
                  icon="mdi-close-circle-outline"
                  color="warning"
                  size="small"
                  class="mr-3 mt-1"
                />
                <div>
                  <h3 class="text-subtitle-2 font-weight-bold mb-1">{{ p.title }}</h3>
                  <p class="mb-2 text-medium-emphasis text-body-2">{{ p.detail }}</p>
                  <VChip size="x-small" variant="tonal">{{ p.source }}</VChip>
                </div>
              </div>
            </VCard>
          </div>
        </VCol>
      </VRow>
    </section>

    <!-- Levers -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Las dos palancas que casi nadie usa</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Están en la misma ley que todos citan y aparecen poco. Las dos actúan en el momento en que
        la mayoría afloja.
      </p>
      <VRow>
        <VCol v-for="l in DEFENSE_LEVERS" :key="l.title" cols="12" md="6">
          <VCard variant="flat" class="lever-card pa-5 h-100">
            <VIcon icon="mdi-arrow-decision-outline" color="primary" class="mb-2" />
            <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ l.title }}</h3>
            <p class="mb-3 text-medium-emphasis">{{ l.detail }}</p>
            <VChip size="x-small" variant="tonal">{{ l.source }}</VChip>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- In store -->
    <section id="local" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Compraste en el local</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Acá está el malentendido más repetido: el arrepentimiento de cinco días es de la compra a
        distancia, no del mostrador.
      </p>

      <VRow class="mb-2">
        <VCol cols="12" md="6">
          <VCard variant="flat" class="warn-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">
              No hay arrepentimiento en la tienda
            </h3>
            <p class="mb-0">{{ IN_STORE_RETRACT_RULE }}</p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="highlight-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Pero lo que anunció, lo obliga</h3>
            <p class="mb-0">{{ IN_STORE_POLICY_RULE }}</p>
          </VCard>
        </VCol>
      </VRow>

      <VRow>
        <VCol v-for="r in STORE_RULES" :key="r.title" cols="12" md="6">
          <VCard variant="flat" class="plain-card pa-5 h-100">
            <VIcon :icon="r.icon" color="primary" class="mb-2" />
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ r.title }}</h3>
            <p class="mb-3 text-medium-emphasis">{{ r.detail }}</p>
            <VChip size="x-small" variant="tonal">{{ r.source }}</VChip>
          </VCard>
        </VCol>
      </VRow>

      <VAlert type="info" variant="tonal" density="comfortable" class="mt-4">
        {{ IN_STORE_ALWAYS }}
      </VAlert>
    </section>

    <!-- Abusive clauses -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">La letra chica que no vale</h2>
      <VCard variant="flat" class="highlight-card pa-5 pa-md-6 mb-4">
        <p class="mb-0">{{ ABUSIVE_CLAUSE_RULE }}</p>
      </VCard>
      <VCard variant="flat" class="plain-card pa-5">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">Ejemplos que enumera la ley</h3>
        <ul class="mb-0 pl-4 text-medium-emphasis">
          <li v-for="(c, i) in ABUSIVE_CLAUSE_EXAMPLES" :key="i">{{ c }}</li>
        </ul>
      </VCard>
    </section>

    <!-- Steps -->
    <section id="reclamo" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Cómo se hace el reclamo</h2>
      <VRow class="mb-4">
        <VCol v-for="s in DEFENSE_STEPS" :key="s.n" cols="12" md="6">
          <VCard variant="flat" class="step-card pa-5 h-100">
            <div class="d-flex align-baseline mb-1">
              <div class="step-n mr-3">{{ s.n }}</div>
              <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ s.title }}</h3>
            </div>
            <p class="mb-0 text-medium-emphasis">{{ s.detail }}</p>
          </VCard>
        </VCol>
      </VRow>

      <VCard variant="flat" class="tramite-card pa-5 pa-md-6">
        <div class="text-overline mb-3">El trámite</div>
        <VTable density="compact" class="tramite-table mb-4">
          <tbody>
            <tr>
              <td>Costo</td>
              <td>{{ DEFENSE_TRAMITE.cost }}</td>
            </tr>
            <tr>
              <td>Canal</td>
              <td>{{ DEFENSE_TRAMITE.channel }}</td>
            </tr>
            <tr>
              <td>Plazo estimado</td>
              <td>{{ DEFENSE_TRAMITE.estimatedDays }} días</td>
            </tr>
            <tr>
              <td>Consulta de estado</td>
              <td>
                a los {{ DEFENSE_TRAMITE.followUpBusinessDays }} días hábiles, al
                {{ DEFENSE_TRAMITE.phone }}
              </td>
            </tr>
          </tbody>
        </VTable>
        <div class="text-body-2 text-medium-emphasis mb-3">
          Para iniciarlo necesitás alguna de estas identidades:
        </div>
        <div class="d-flex flex-wrap ga-2 mb-4">
          <VChip v-for="id in DEFENSE_TRAMITE.identities" :key="id" size="small" variant="tonal">
            {{ id }}
          </VChip>
        </div>
        <VBtn
          :href="DEFENSE_TRAMITE.url"
          target="_blank"
          rel="noopener noreferrer"
          color="primary"
          variant="flat"
          append-icon="mdi-open-in-new"
        >
          Ir al trámite en gub.uy
        </VBtn>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in DEFENSE_FAQ" :key="f.question">
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
        <VBtn :to="localePath('/derechos-consumidor-compras-online')" variant="tonal" size="small">
          Comprar online: tus derechos
        </VBtn>
        <VBtn :to="localePath('/a-quien-le-reclamo-uruguay')" variant="tonal" size="small">
          A quién le reclamo
        </VBtn>
        <VBtn :to="localePath('/estafas-uruguay')" variant="tonal" size="small">
          Me estafaron
        </VBtn>
        <VBtn :to="localePath('/saldar-deudas-uruguay')" variant="tonal" size="small">
          Saldar deudas
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Artículos, plazos y criterios contrastados el {{ verifiedAt }} con el texto de la Ley 17.250
        y con las publicaciones del Ministerio de Economía y Finanzas. Es información de referencia,
        no asesoramiento legal.
      </p>
      <ul class="sources-list">
        <li v-for="s in DEFENSE_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  ABUSIVE_CLAUSE_EXAMPLES,
  ABUSIVE_CLAUSE_RULE,
  DEFENSE_FAQ,
  DEFENSE_LEVERS,
  DEFENSE_POWERS,
  DEFENSE_SOURCES,
  DEFENSE_STEPS,
  DEFENSE_THESIS,
  DEFENSE_TRAMITE,
  DEFENSE_VERIFIED_AT,
  IN_STORE_ALWAYS,
  IN_STORE_POLICY_RULE,
  IN_STORE_RETRACT_RULE,
  STORE_RULES,
} from '~/utils/consumerDefense'

const localePath = useLocalePath()

const canDo = computed(() => DEFENSE_POWERS.filter(p => p.can))
const cannotDo = computed(() => DEFENSE_POWERS.filter(p => !p.can))

const verifiedAt = new Date(DEFENSE_VERIFIED_AT).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/defensa-al-consumidor-uruguay'
const title = 'Defensa del Consumidor en Uruguay: qué puede hacer por vos y qué no'
const description =
  'Defensa del Consumidor concilia y sanciona, pero no ordena que te devuelvan la plata: la multa la cobra el Estado y la restitución la ordena un juez. Las dos palancas de la ley que casi nadie usa, las reglas de la compra presencial (no hay arrepentimiento, el vale no vence, en el cambio vale el precio de lista) y cómo se hace el reclamo.'

defineOgImageComponent('Cambio', {
  title: 'Defensa del Consumidor',
  subtitle: 'Qué puede hacer por vos, y qué no',
  tag: 'CONSUMO',
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
        'defensa del consumidor uruguay, reclamo defensa del consumidor, area defensa del consumidor mef, ley 17250, devolucion tienda fisica uruguay, vale de cambio vencimiento, cambio por talle uruguay, clausulas abusivas uruguay, audiencia administrativa consumidor, 0800 7005',
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
                name: 'Defensa del Consumidor',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: DEFENSE_FAQ.map(f => ({
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
.def-page {
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

.thesis-card,
.power-card,
.lever-card,
.warn-card,
.highlight-card,
.plain-card,
.step-card,
.tramite-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
}
.v-theme--light .thesis-card,
.v-theme--light .power-card,
.v-theme--light .lever-card,
.v-theme--light .warn-card,
.v-theme--light .highlight-card,
.v-theme--light .plain-card,
.v-theme--light .step-card,
.v-theme--light .tramite-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.thesis-card,
.highlight-card {
  border-color: rgba(var(--v-theme-primary), 0.45);
}
.warn-card,
.power-card.cannot {
  border-color: rgba(var(--v-theme-warning), 0.45);
}
.power-card.can {
  border-color: rgba(var(--v-theme-success), 0.35);
}
.lever-card {
  border-color: rgba(var(--v-theme-primary), 0.3);
}

.step-n {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: rgb(var(--v-theme-primary));
  font-variant-numeric: tabular-nums;
}

.tramite-table :deep(td) {
  font-size: 0.875rem;
}
.tramite-table :deep(td:first-child) {
  color: rgba(var(--v-theme-on-surface), 0.7);
  width: 40%;
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.8;
}
</style>
