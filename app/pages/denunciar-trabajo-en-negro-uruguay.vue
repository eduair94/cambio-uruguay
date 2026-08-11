<template>
  <VContainer class="undeclared-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">TRABAJO</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Me tienen en negro: qué se puede hacer
      </h1>
      <p class="lead mb-6">
        Sí, hay algo que hacer, y no es un solo trámite. Son
        <strong>tres puertas distintas</strong> que resuelven cosas distintas: que la irregularidad
        pare, que tus aportes existan y que te paguen lo que te deben. Cada una pide requisitos
        propios, y una de ellas se cierra el día que dejás de trabajar ahí.
      </p>

      <VCard class="idea-card pa-5 pa-md-6" variant="flat">
        <div class="text-overline mb-2">Lo primero, porque cambia el orden de todo</div>
        <p class="mb-0">{{ UNDECLARED_CORE_IDEA }}</p>
      </VCard>
    </header>

    <!-- Las tres puertas -->
    <section id="puertas" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Las tres puertas</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        No compiten entre sí y se pueden usar las tres. Lo que no conviene es golpear la equivocada:
        la propia página del MTSS enumera los casos en que esa oficina no recibe denuncias.
      </p>

      <VRow>
        <VCol v-for="d in UNDECLARED_DOORS" :key="d.id" cols="12">
          <VCard :id="d.id" variant="flat" class="door-card pa-5 pa-md-6 h-100">
            <div class="d-flex align-start ga-4 mb-3 flex-wrap">
              <div class="door-n">{{ d.n }}</div>
              <div class="flex-grow-1" style="min-width: 220px">
                <div class="text-overline text-medium-emphasis">{{ d.organism }}</div>
                <h3 class="text-h6 font-weight-bold mb-0">{{ d.goal }}</h3>
              </div>
            </div>

            <p class="mb-4">{{ d.detail }}</p>

            <VRow>
              <VCol cols="12" md="6">
                <div class="text-subtitle-2 font-weight-bold mb-2">Qué pide</div>
                <ul class="tight-list mb-0">
                  <li v-for="(r, i) in d.requirements" :key="i">{{ r }}</li>
                </ul>
              </VCol>
              <VCol cols="12" md="6">
                <div class="text-subtitle-2 font-weight-bold mb-2">Por dónde</div>
                <ul class="tight-list mb-0">
                  <li v-for="(c, i) in d.channels" :key="i">
                    <span class="font-weight-medium">{{ c.label }}:</span>
                    <a v-if="c.url" :href="c.url" target="_blank" rel="noopener noreferrer">
                      {{ c.value }}
                    </a>
                    <template v-else>{{ c.value }}</template>
                  </li>
                </ul>
              </VCol>
            </VRow>

            <VAlert type="warning" variant="tonal" density="comfortable" class="mt-4 mb-3">
              <span class="font-weight-bold">Lo que esta puerta no hace.</span> {{ d.doesNot }}
            </VAlert>

            <p class="text-caption text-medium-emphasis mb-0">{{ d.basis }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- El reloj -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El reloj</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Mientras seguís trabajando ahí no corre el plazo para reclamar. Corre desde que te vas, y
        hay un movimiento gratuito que lo frena.
      </p>
      <VRow>
        <VCol v-for="c in UNDECLARED_CLOCK" :key="c.norm" cols="12" md="4">
          <VCard variant="flat" class="clock-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ c.label }}</h3>
            <p class="mb-3 text-medium-emphasis">{{ c.detail }}</p>
            <div class="text-caption norm-tag">{{ c.norm }}</div>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Qué se pierde -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Qué se pierde mientras tanto</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        No son los derechos laborales: es todo lo que el BPS liquida a partir de la actividad
        declarada. Nada de esto se repara solo con el paso del tiempo.
      </p>
      <VRow>
        <VCol v-for="l in UNDECLARED_LOSSES" :key="l.title" cols="12" md="6">
          <VCard variant="flat" class="loss-card pa-5 h-100 d-flex flex-column">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ l.title }}</h3>
            <p class="mb-3 text-medium-emphasis flex-grow-1">{{ l.detail }}</p>
            <VBtn
              v-if="l.to"
              :to="localePath(l.to)"
              variant="tonal"
              size="small"
              class="align-self-start"
            >
              Ver el detalle
            </VBtn>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Lo que igual te deben -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que te deben igual</h2>
      <p class="text-medium-emphasis mb-4" style="max-width: 72ch">
        Estos derechos nacen de haber trabajado, no de figurar en una planilla. Estar en negro no
        los borra: complica probarlos.
      </p>
      <VRow>
        <VCol v-for="o in UNDECLARED_STILL_OWED" :key="o.title" cols="12" sm="6" md="3">
          <VCard
            variant="flat"
            class="owed-card pa-4 h-100"
            :to="o.to ? localePath(o.to) : undefined"
          >
            <h3 class="text-subtitle-2 font-weight-bold mb-1">{{ o.title }}</h3>
            <p class="mb-0 text-caption text-medium-emphasis">{{ o.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Prueba -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Antes de mover nada, juntá prueba</h2>
      <p class="text-medium-emphasis mb-4" style="max-width: 72ch">
        Es el paso que decide el resultado de los otros tres. Lo que se busca no es un contrato: es
        mostrar que trabajabas bajo las órdenes de alguien, en qué horario y por cuánto.
      </p>
      <VCard variant="flat" class="evidence-card pa-5">
        <ul class="mb-0 pl-4">
          <li v-for="(e, i) in UNDECLARED_EVIDENCE" :key="i" class="mb-2">{{ e }}</li>
        </ul>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in UNDECLARED_FAQ" :key="f.question">
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
        <VBtn :to="localePath('/cuanto-me-tienen-que-pagar-uruguay')" variant="tonal" size="small">
          Cuánto me tienen que pagar
        </VBtn>
        <VBtn :to="localePath('/seguro-de-paro-uruguay')" variant="tonal" size="small">
          Seguro de paro
        </VBtn>
        <VBtn :to="localePath('/a-quien-le-reclamo-uruguay')" variant="tonal" size="small">
          A quién le reclamo
        </VBtn>
        <VBtn
          :to="localePath('/guias/entender-tu-recibo-de-sueldo-uruguay')"
          variant="tonal"
          size="small"
        >
          Entender tu recibo de sueldo
        </VBtn>
        <VBtn
          :to="localePath('/temas/sueldo-trabajo-e-impuestos-uruguay')"
          variant="tonal"
          size="small"
        >
          Sueldo, trabajo e impuestos
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Contrastado el {{ verifiedAt }} con el MTSS, el BPS, el INAU y los textos vigentes de IMPO.
        {{ UNDECLARED_DISCLAIMER }}
      </p>
      <ul class="sources-list">
        <li v-for="s in UNDECLARED_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  UNDECLARED_CLOCK,
  UNDECLARED_CORE_IDEA,
  UNDECLARED_DISCLAIMER,
  UNDECLARED_DOORS,
  UNDECLARED_EVIDENCE,
  UNDECLARED_FAQ,
  UNDECLARED_LOSSES,
  UNDECLARED_SOURCES,
  UNDECLARED_STILL_OWED,
  UNDECLARED_VERIFIED_AT,
} from '~/utils/undeclaredWork'

const localePath = useLocalePath()

const verifiedAt = new Date(UNDECLARED_VERIFIED_AT).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/denunciar-trabajo-en-negro-uruguay'
const title = 'Trabajo en negro en Uruguay: cómo denunciarlo y qué reclamar'
const description =
  'Tu empleador no te declara: las tres puertas que resuelven cosas distintas. La denuncia anónima ante la Inspección General del Trabajo (pide vínculo vigente), la denuncia ante BPS para que los años existan en tu historia laboral, y la conciliación previa para cobrar lo que te deben. Con los plazos de prescripción, qué se pierde sin aportes y qué te deben igual.'

defineOgImageComponent('Cambio', {
  title: 'Me tienen en negro',
  subtitle: 'Tres puertas: MTSS, BPS y conciliación',
  tag: 'TRABAJO',
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
        'trabajo en negro uruguay, denunciar empleador trabajo en negro, me tienen en negro, no me aportan al bps, denuncia anonima inspeccion general del trabajo, denuncia bps actividades no declaradas, historia laboral no figura, conciliacion previa mtss, prescripcion creditos laborales',
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
                name: 'Denunciar trabajo en negro',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: UNDECLARED_FAQ.map(f => ({
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
.undeclared-page {
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

.idea-card,
.door-card,
.clock-card,
.loss-card,
.owed-card,
.evidence-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
}
.v-theme--light .idea-card,
.v-theme--light .door-card,
.v-theme--light .clock-card,
.v-theme--light .loss-card,
.v-theme--light .owed-card,
.v-theme--light .evidence-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.idea-card {
  border-color: rgba(var(--v-theme-primary), 0.5);
}
/* El acento va en el borde completo, no en un tab lateral. */
.door-card {
  border-color: rgba(var(--v-theme-primary), 0.45);
}

.door-n {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: rgb(var(--v-theme-primary));
  font-variant-numeric: tabular-nums;
}

.tight-list {
  padding-left: 1.1rem;
  line-height: 1.55;
}
.tight-list li {
  margin-bottom: 0.4rem;
}

.norm-tag {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.8;
}
</style>
