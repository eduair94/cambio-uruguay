<template>
  <VContainer class="pdp-page py-8 py-md-12">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Prescripción de deudas privadas', disabled: true },
      ]"
    />

    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">DEUDAS</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        ¿Cuándo prescribe una deuda con un banco, una tarjeta o una financiera?
      </h1>
      <p class="lead mb-6">
        No hay un plazo único. Hay <strong>dos relojes sobre la misma deuda</strong> —el derecho a
        ejecutarte se cae a los {{ EXECUTIVE_TERM.months / 12 }} años y la acción personal a los
        {{ ORDINARY_TERM.months / 12 }}— y, encima, el documento que firmaste puede tener uno más
        corto todavía. Acá están los seis plazos con el artículo que fija cada uno.
      </p>

      <!-- Lo primero, porque invierte la conclusión de todo lo demás -->
      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-alert-outline" color="warning" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Lo primero, porque cambia todo</div>
            <p class="mb-2">{{ NOT_AUTOMATIC }}</p>
            <a
              class="text-body-2"
              :href="NOT_AUTOMATIC_SOURCE"
              target="_blank"
              rel="noopener noreferrer"
              >Ver el artículo 1191 en impo.com.uy</a
            >
          </div>
        </div>
      </VCard>
    </header>

    <!-- The six clocks -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Los plazos, de más corto a más largo</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        El plazo lo fija el TÍTULO, no el acreedor: la misma financiera puede tener tres años contra
        quien firmó un vale y diez contra quien quedó debiendo sin documento. El primero que se le
        cae encima al acreedor es el más corto que su título tolere.
      </p>

      <VTable density="comfortable" class="cu-mobile-cards terms-table">
        <thead>
          <tr>
            <th>Plazo</th>
            <th>Qué prescribe</th>
            <th>Desde cuándo</th>
            <th>Norma</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in PRESCRIPTION_TERMS" :key="t.key">
            <td data-label="Plazo" class="font-weight-bold text-no-wrap">{{ t.term }}</td>
            <td data-label="Qué prescribe">{{ t.what }}</td>
            <td data-label="Desde cuándo" class="text-medium-emphasis">{{ t.from }}</td>
            <td data-label="Norma">
              <a :href="t.url" target="_blank" rel="noopener noreferrer">{{ t.article }}</a>
            </td>
          </tr>
        </tbody>
      </VTable>

      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        El cheque tiene su propia página, con el rechazo, el registro de infractores y la
        rehabilitación:
        <NuxtLink :to="localePath('/cheques-uruguay')">cheques en Uruguay</NuxtLink>.
      </p>
    </section>

    <!-- Why two clocks: the one thing readers get wrong -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Por qué son dos plazos y no uno</h2>
      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="term-card pa-5 h-100">
            <div class="term-n">{{ EXECUTIVE_TERM.term }}</div>
            <div class="term-h">Para ejecutarte</div>
            <p class="mb-3">{{ EXECUTIVE_TERM.what }}</p>
            <blockquote class="quote mb-0">{{ EXECUTIVE_TERM.quote }}</blockquote>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="term-card is-long pa-5 h-100">
            <div class="term-n">{{ ORDINARY_TERM.term }}</div>
            <div class="term-h">Para demandarte</div>
            <p class="mb-3">{{ ORDINARY_TERM.what }}</p>
            <blockquote class="quote mb-0">{{ ORDINARY_TERM.quote }}</blockquote>
          </VCard>
        </VCol>
      </VRow>
      <p class="text-body-2 text-medium-emphasis mt-4 mb-0" style="max-width: 72ch">
        Que no puedan ejecutarte no significa que no puedan demandarte. Y el artículo 1217 cierra
        una puerta que se suele intentar: pasados los cinco años, la acción
        <strong>no recupera</strong> el carácter ejecutivo ni por la confesión judicial del deudor
        ni porque reconozca el documento privado.
      </p>
    </section>

    <!-- What resets the clock -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Qué vuelve el contador a cero</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Interrumpir la prescripción significa que el plazo empieza de nuevo. Las dos causales son de
        signo opuesto: una la provoca el acreedor y la otra la puede provocar el propio deudor sin
        darse cuenta.
      </p>
      <VRow>
        <VCol v-for="c in INTERRUPTION_CAUSES" :key="c.article" cols="12" md="6">
          <VCard variant="flat" class="regime-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ c.label }}</h3>
            <p class="mb-3 text-medium-emphasis">{{ c.detail }}</p>
            <a :href="c.url" target="_blank" rel="noopener noreferrer" class="text-body-2">{{
              c.article
            }}</a>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Dated law: why an undated summary is worthless here -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Estos artículos se reescribieron en 2020</h2>
      <VCard variant="flat" class="trap-card pa-5 pa-md-6">
        <p class="mb-3">{{ REWRITTEN_IN_2020 }}</p>
        <a class="text-body-2" :href="REWRITE_SOURCE" target="_blank" rel="noopener noreferrer">
          Ver el artículo 463 de la Ley 19.889 en impo.com.uy
        </a>
      </VCard>
    </section>

    <!-- Prescription is not the Clearing -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Prescribir no es salir del Clearing</h2>
      <VCard variant="flat" class="regime-card pa-5 pa-md-6">
        <p class="mb-3">
          Son dos relojes distintos y no se arrastran. La prescripción es el plazo para reclamar en
          juicio; la permanencia en un registro de incumplimientos tiene su propia norma y su propio
          plazo. Una deuda prescrita puede seguir figurando, y una deuda que ya salió del registro
          puede seguir siendo reclamable.
        </p>
        <div class="d-flex flex-wrap ga-2">
          <VBtn :to="localePath('/salir-del-clearing')" variant="tonal" size="small">
            Cuánto dura el registro del Clearing
          </VBtn>
          <VBtn
            :to="localePath('/prescripcion-de-deudas-con-el-estado-uruguay')"
            variant="tonal"
            size="small"
          >
            Deudas con el Estado
          </VBtn>
        </div>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in PRIVATE_DEBT_FAQ" :key="f.question">
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
        <VBtn :to="localePath('/saldar-deudas-uruguay')" variant="tonal" size="small">
          Negociar y saldar deudas
        </VBtn>
        <VBtn :to="localePath('/ley-de-usura-uruguay')" variant="tonal" size="small">
          Ley de usura: el tope de intereses
        </VBtn>
        <VBtn :to="localePath('/embargo-de-sueldo-uruguay')" variant="tonal" size="small">
          Embargo de sueldo
        </VBtn>
        <VBtn :to="localePath('/guias/estudio-de-cobranza-uruguay')" variant="tonal" size="small">
          Qué puede hacer un estudio de cobranza
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Cada plazo de esta página se contrastó contra el texto oficial en impo.com.uy el
        {{ verifiedAt }}, artículo por artículo. Es información, no asesoramiento: la prescripción
        se discute en un juicio concreto y antes de reconocer o pagar una deuda vieja —o de dejar de
        contestar un reclamo— consultá con un profesional.
      </p>
      <ul class="sources-list">
        <li v-for="s in PRIVATE_DEBT_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  EXECUTIVE_TERM,
  INTERRUPTION_CAUSES,
  NOT_AUTOMATIC,
  NOT_AUTOMATIC_SOURCE,
  ORDINARY_TERM,
  PRESCRIPTION_TERMS,
  PRIVATE_DEBT_FAQ,
  PRIVATE_DEBT_SOURCES,
  PRIVATE_DEBT_VERIFIED_AT,
  REWRITE_SOURCE,
  REWRITTEN_IN_2020,
} from '~/utils/privateDebtPrescription'

const localePath = useLocalePath()

const verifiedAt = new Date(PRIVATE_DEBT_VERIFIED_AT).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/prescripcion-de-deudas-privadas-uruguay'
// 59 caracteres con la marca puesta. Lleva los dos números porque son la respuesta y porque un
// snippet con la cifra rinde ~1,4 % de CTR contra 0,03–0,2 % de uno genérico desde la misma posición.
const title = 'Deuda privada: prescribe a los 5 y 10 años'
const description =
  'Ejecutar prescribe a los 5 años y la acción personal a los 10 (Código Civil, arts. 1217 y 1216); el vale a los 3 y los atrasos de intereses a los 4.'

defineOgImageComponent('Cambio', {
  title: '¿Cuándo prescribe una deuda privada?',
  subtitle: '5 años para ejecutar · 10 para la acción personal',
  tag: 'DEUDAS',
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
        'cuando prescribe una deuda uruguay, prescripcion de deudas privadas, prescripcion deuda tarjeta de credito uruguay, prescripcion vale pagare uruguay, articulo 1216 codigo civil, articulo 1217 codigo civil, deuda vieja estudio de cobranza, prescripcion acción ejecutiva uruguay',
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
                name: 'Prescripción de deudas privadas',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: PRIVATE_DEBT_FAQ.map(f => ({
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
.pdp-page {
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
.regime-card,
.term-card,
.trap-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
}
.v-theme--light .warn-card,
.v-theme--light .regime-card,
.v-theme--light .term-card,
.v-theme--light .trap-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.warn-card {
  border-color: rgba(var(--v-theme-warning), 0.5);
}
.trap-card {
  border-color: rgba(var(--v-theme-info), 0.45);
}

.term-n {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: rgb(var(--v-theme-primary));
}
.term-card.is-long .term-n {
  color: rgb(var(--v-theme-warning));
}
.term-h {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.65;
  margin-bottom: 0.6rem;
}

/* El bloque de texto se declara su propio margen superior: Vuetify 4 no cero los márgenes de los
   bloques de texto y dentro de una tarjeta con padding el 1em del navegador no colapsa. */
.quote {
  margin-top: 0.75rem;
  border-left: 3px solid rgba(var(--v-theme-primary), 0.5);
  padding-left: 0.85rem;
  font-size: 0.86rem;
  line-height: 1.55;
  opacity: 0.78;
}

.terms-table a {
  font-size: 0.85rem;
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.8;
}
</style>
