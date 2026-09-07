<template>
  <VContainer class="passport-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">PASAPORTE</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">¿Cuánto sale el pasaporte uruguayo?</h1>
      <p class="lead mb-6">
        Renovarlo son <strong>{{ pesos(totalPasaporte(pares.renovacion.comun)) }}</strong> y sacarlo
        por primera vez, <strong>{{ pesos(totalPasaporte(pares.primera.comun)) }}</strong
        >, en los dos casos contando el Certificado de Antecedentes Judiciales que se paga junto con
        el trámite. Apurarlo cuesta un poco más del doble. Son los aranceles oficiales vigentes
        desde el {{ desde }} y valen igual para las tres vías de ciudadanía.
      </p>

      <VCard class="answer-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-passport" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">La respuesta corta</div>
            <p class="callout-text mb-0">
              Renovación común: <strong>{{ pesos(pares.renovacion.comun.arancel) }}</strong> de
              arancel más <strong>{{ pesos(pares.renovacion.comun.certificado) }}</strong> de
              certificado. Urgente:
              <strong>{{ pesos(totalPasaporte(pares.renovacion.urgente)) }}</strong> en total, unas
              <strong>{{ veces(pares.renovacion) }}</strong> veces lo que sale el común.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- El cuadro -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Los cuatro precios</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        La ficha del trámite publica el arancel y el certificado por separado, con un «+» en el
        medio. Acá va la suma, que es lo que se paga en el mostrador.
      </p>

      <VTable class="passport-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Trámite</th>
            <th class="text-right">Arancel</th>
            <th class="text-right">Certificado de Antecedentes</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fee in PASSPORT_FEES" :key="fee.key">
            <td data-label="Trámite">
              <span class="font-weight-medium">{{ fee.label }}</span>
            </td>
            <td data-label="Arancel" class="text-right text-no-wrap">{{ pesos(fee.arancel) }}</td>
            <td data-label="Certificado de Antecedentes" class="text-right text-no-wrap">
              {{ pesos(fee.certificado) }}
            </td>
            <td data-label="Total" class="text-right text-no-wrap">
              <VChip :color="fee.urgente ? 'warning' : 'success'" variant="tonal" size="small">
                {{ pesos(totalPasaporte(fee)) }}
              </VChip>
            </td>
          </tr>
        </tbody>
      </VTable>

      <VCard class="note-card pa-5 pa-md-6 mt-5" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-clock-fast" color="warning" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Lo que se paga por apurar</div>
            <p class="note-text mb-0">
              El urgente no sube sólo el arancel: el Certificado de Antecedentes Judiciales urgente
              cuesta {{ pesos(pares.renovacion.urgente.certificado) }} contra
              {{ pesos(pares.renovacion.comun.certificado) }} del común, ocho veces más. Sumando los
              dos, la renovación urgente sale {{ veces(pares.renovacion) }} veces la común y la
              primera vez urgente, {{ veces(pares.primera) }} veces.
            </p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- Las tres fichas -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuál de los tres trámites te toca</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        gub.uy tiene una ficha distinta según cómo tengas la ciudadanía, y ahí se pierde mucha
        gente. Cambia la documentación que hay que llevar; <strong>el precio no</strong>: las tres
        publican exactamente los mismos aranceles.
      </p>

      <VRow>
        <VCol v-for="applicant in PASSPORT_APPLICANTS" :key="applicant.key" cols="12" md="4">
          <VCard class="applicant-card pa-5 h-100" variant="flat">
            <div class="font-weight-bold mb-2">{{ applicant.label }}</div>
            <p class="applicant-text text-medium-emphasis mb-3">{{ applicant.quien }}</p>
            <a
              :href="applicant.url"
              target="_blank"
              rel="noopener noreferrer"
              class="applicant-link"
              >Ficha del trámite en gub.uy</a
            >
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Plazos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuánto se demora</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Los plazos, tal como los publica la ficha. En Montevideo no hay un plazo de entrega en días:
        el pasaporte se retira el mismo día de la gestión, y lo que depende de la demanda es llegar
        a esa gestión.
      </p>

      <VTable class="passport-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Sede</th>
            <th>Trámite</th>
            <th>Plazo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in PASSPORT_DELIVERY" :key="row.key">
            <td data-label="Sede">
              <span class="font-weight-medium">{{ row.sede }}</span>
            </td>
            <td data-label="Trámite" class="text-no-wrap">{{ row.tramite }}</td>
            <td data-label="Plazo">{{ row.plazo }}</td>
          </tr>
        </tbody>
      </VTable>

      <VCard class="warn-card pa-5 pa-md-6 mt-5" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-fire" color="error" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">El plazo que sí conviene anotar</div>
            <p class="note-text mb-0">
              «El pasaporte no retirado por su titular dentro de los 60 días siguientes a su
              expedición será destruido sin previa comunicación al interesado», dice la ficha. Es el
              único plazo en días que publica para Montevideo, y es el que te hace pagar el trámite
              de nuevo.
            </p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- Lo que no publicamos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Tres preguntas que acá no se contestan</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Y no por olvido: la fuente oficial no las contesta, y completarlas de memoria es cómo se
        publica un dato falso con cara de dato oficial.
      </p>

      <VRow>
        <VCol v-for="item in PASSPORT_UNPUBLISHED" :key="item.key" cols="12" md="4">
          <VCard class="unpublished-card pa-5 h-100" variant="flat">
            <div class="font-weight-bold mb-2">{{ item.pregunta }}</div>
            <p class="applicant-text text-medium-emphasis mb-0">{{ item.porQue }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion" class="faq-panels">
        <VExpansionPanel v-for="faq in PASSPORT_FAQ" :key="faq.question" :title="faq.question">
          <VExpansionPanelText>{{ faq.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Seguir -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Si el pasaporte es para viajar</h2>
      <div class="d-flex flex-wrap ga-2">
        <VChip
          v-for="link in RELATED"
          :key="link.to"
          :to="localePath(link.to)"
          color="primary"
          variant="tonal"
          size="small"
          link
        >
          <VIcon start size="small">mdi-link-variant</VIcon>{{ link.label }}
        </VChip>
      </div>
    </section>

    <!-- Fuentes -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-2">Fuentes</h2>
      <p class="sources-note text-medium-emphasis mb-3">
        Todos los importes salen del bloque «Costo» de las fichas del trámite en gub.uy, que
        encabeza «VALORES A PARTIR DEL 01/07/2026». Verificado el {{ verificado }}. Los aranceles
        del Estado se actualizan: si vas a hacer el trámite, confirmá el importe en la ficha antes
        de pagar.
      </p>
      <ul class="sources-list">
        <li v-for="source in PASSPORT_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  PASSPORT_APPLICANTS,
  PASSPORT_DELIVERY,
  PASSPORT_FAQ,
  PASSPORT_FEES,
  PASSPORT_FEES_EFFECTIVE_FROM,
  PASSPORT_PAIRS,
  PASSPORT_SOURCES,
  PASSPORT_UNPUBLISHED,
  PASSPORT_VERIFIED_AT,
  recargoUrgente,
  totalPasaporte,
  type PassportPair,
} from '~/utils/passport'

const localePath = useLocalePath()

const pares = PASSPORT_PAIRS

const PESOS = new Intl.NumberFormat('es-UY', { minimumFractionDigits: 0 })
const pesos = (amount: number) => `$${PESOS.format(amount)}`

/** «2,2» — con una decimal, que es toda la precisión que aguanta un cociente de dos aranceles. */
const veces = (pair: PassportPair) =>
  recargoUrgente(pair).toLocaleString('es-UY', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

const FECHA = new Intl.DateTimeFormat('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const desde = FECHA.format(new Date(`${PASSPORT_FEES_EFFECTIVE_FROM}T00:00:00Z`))
const verificado = FECHA.format(new Date(`${PASSPORT_VERIFIED_AT}T00:00:00Z`))

const RELATED = [
  { to: '/franquicia-viajero-uruguay', label: 'Franquicia de equipaje' },
  { to: '/declarar-dinero-en-efectivo-uruguay', label: 'Declarar efectivo en aduana' },
  { to: '/herramientas/calculadora-presupuesto-viaje', label: 'Presupuesto de viaje' },
  { to: '/guias/dolares-para-viajar', label: 'Dólares para viajar' },
  { to: '/sala-vip-aeropuerto-uruguay', label: 'Sala VIP en Carrasco' },
]

const canonicalUrl = 'https://cambio-uruguay.com/cuanto-sale-el-pasaporte-uruguayo'
const title = 'Cuánto sale el pasaporte uruguayo: $3.703'
const description =
  'Renovar el pasaporte uruguayo sale $3.703 más $175 del certificado: $3.878. Primera vez, $5.630. Urgente, $8.609 y $12.114. Aranceles vigentes desde el 1/7/2026.'

defineOgImageComponent('Cambio', {
  title: 'Cuánto sale el pasaporte uruguayo',
  subtitle: 'Renovación $3.878, primera vez $5.630 — y el urgente, más del doble',
  tag: 'PASAPORTE',
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
        'cuanto sale el pasaporte uruguayo, precio pasaporte uruguay, costo pasaporte uruguayo 2026, renovar pasaporte uruguay precio, pasaporte urgente uruguay cuanto sale, certificado de antecedentes judiciales precio, dnic pasaporte costo, tramite pasaporte uruguay, pasaporte primera vez uruguay',
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
                name: 'Cuánto sale el pasaporte uruguayo',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: PASSPORT_FAQ.map(faq => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: { '@type': 'Answer', text: faq.answer },
            })),
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            dateModified: PASSPORT_VERIFIED_AT,
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            citation: PASSPORT_SOURCES.map(source => ({
              '@type': 'CreativeWork',
              name: source.label,
              url: source.url,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.passport-page {
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
.note-text,
.applicant-text {
  margin-top: 0;
  line-height: 1.6;
}

.answer-card,
.note-card,
.warn-card,
.applicant-card,
.unpublished-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
  background: rgba(var(--v-theme-surface), 1);
}
.answer-card {
  background: rgba(var(--v-theme-primary), 0.06);
}
.note-card {
  background: rgba(var(--v-theme-warning), 0.06);
}
.warn-card {
  background: rgba(var(--v-theme-error), 0.06);
}

.passport-table :deep(th) {
  white-space: nowrap;
}
.passport-table :deep(td) {
  vertical-align: top;
}

.applicant-link {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
  text-decoration: none;
}
.applicant-link:hover {
  text-decoration: underline;
}

.sources-list {
  padding-left: 1.1rem;
  margin-top: 0;
}
.sources-list li {
  margin-bottom: 6px;
  line-height: 1.5;
}
.sources-list a {
  color: rgb(var(--v-theme-primary));
}
</style>
