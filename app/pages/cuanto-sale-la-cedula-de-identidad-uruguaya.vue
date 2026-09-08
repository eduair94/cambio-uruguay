<template>
  <VContainer class="idcard-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">CÉDULA</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        ¿Cuánto sale la cédula de identidad uruguaya?
      </h1>
      <p class="lead mb-6">
        Renovarla son <strong>{{ pesos(renovacion.arancel) }}</strong> y el trámite urgente
        <strong>{{ pesos(urgente.arancel) }}</strong
        >, exactamente el doble. Sacarla por primera vez,
        <strong>{{ pesos(primera.arancel) }}</strong
        >: apenas {{ pesos(sobreprecioPrimeraVez()) }} más que renovarla, al revés de lo que pasa
        con el pasaporte. Son los importes que publican las fichas del trámite en gub.uy, leídas una
        por una el {{ verificado }}.
      </p>

      <VCard class="answer-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-card-account-details-outline" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">La respuesta corta</div>
            <p class="callout-text mb-0">
              Renovación común <strong>{{ pesos(renovacion.arancel) }}</strong
              >, urgente <strong>{{ pesos(urgente.arancel) }}</strong
              >, primera vez <strong>{{ pesos(primera.arancel) }}</strong
              >. Si la perdiste, te la robaron o está rota, no hay un arancel aparte: es la misma
              renovación de {{ pesos(renovacion.arancel) }} — y si fue hurto o rapiña, es
              <strong>gratis</strong>.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- El cuadro -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Los tres precios</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Son tres y no cuatro: la primera vez no tiene modalidad urgente. Las seis fichas de primera
        vez publican un único importe.
      </p>

      <VTable class="idcard-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Trámite</th>
            <th class="text-right">Costo</th>
            <th>Qué cubre</th>
            <th class="text-no-wrap">Rige desde</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fee in ID_CARD_FEES" :key="fee.key">
            <td data-label="Trámite">
              <span class="font-weight-medium">{{ fee.label }}</span>
            </td>
            <td data-label="Costo" class="text-right text-no-wrap">
              <VChip
                :color="fee.key === 'renovacion-urgente' ? 'warning' : 'success'"
                variant="tonal"
                size="small"
              >
                {{ pesos(fee.arancel) }}
              </VChip>
            </td>
            <td data-label="Qué cubre">{{ fee.cubre }}</td>
            <td data-label="Rige desde" class="text-no-wrap">{{ fecha(fee.desde) }}</td>
          </tr>
        </tbody>
      </VTable>

      <VCard class="note-card pa-5 pa-md-6 mt-5" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-swap-vertical" color="warning" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">El detalle que sorprende</div>
            <p class="note-text mb-0">
              Acá renovar sale <strong>menos</strong> que sacarla por primera vez, pero por
              {{ pesos(sobreprecioPrimeraVez()) }}: la diferencia es tan chica que no cambia ninguna
              decisión. La que sí la cambia es el urgente, que son {{ veces }} veces el común y no
              un recargo. En el pasaporte los dos números son otra cosa, y por eso conviene mirarlos
              por separado.
            </p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- Perdida, rota, vencida -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        Perdida, rota o vencida: no es un trámite aparte
      </h2>
      <p class="section-intro text-medium-emphasis mb-5">
        No existe una ficha de duplicado ni de deterioro. La de renovación acepta el documento «a
        renovar, cualquiera sea su vigencia y estado de conservación, o constancia de hurto o
        extravío expedida por la seccional Policial dentro del territorio nacional». Las cuatro
        situaciones de abajo se resuelven con la misma renovación de
        {{ pesos(renovacion.arancel) }}.
      </p>

      <div class="d-flex flex-wrap ga-2">
        <VChip
          v-for="caso in ID_CARD_SAME_AS_RENEWAL"
          :key="caso"
          color="primary"
          variant="tonal"
          size="small"
        >
          <VIcon start size="small">mdi-check</VIcon>{{ caso }}
        </VChip>
      </div>
    </section>

    <!-- Exoneraciones -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Los dos casos en que sale $0</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Las dos exoneraciones están publicadas, y ninguna de las dos se pide en el mismo mostrador
        donde se paga el trámite: hay que ir antes a otro lado.
      </p>

      <VRow>
        <VCol v-for="waiver in ID_CARD_WAIVERS" :key="waiver.key" cols="12" md="6">
          <VCard class="waiver-card pa-5 h-100" variant="flat">
            <div class="d-flex align-start mb-3">
              <VIcon icon="mdi-cash-remove" color="success" class="mr-2 mt-1" size="small" />
              <div class="font-weight-bold">{{ waiver.quien }}</div>
            </div>
            <p class="waiver-text mb-3"><strong>Qué cubre:</strong> {{ waiver.alcance }}</p>
            <p class="waiver-text mb-3"><strong>Cómo se pide:</strong> {{ waiver.como }}</p>
            <p class="waiver-text text-medium-emphasis mb-3">{{ waiver.norma }}</p>
            <a
              :href="waiver.url"
              target="_blank"
              rel="noopener noreferrer"
              class="idcard-source-link"
              >Ficha oficial</a
            >
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Plazos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuánto se demora y quién puede ir</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Los plazos, tal como los publica la ficha de primera vez. Miden desde que hacés el trámite
        hasta que retirás el documento, no desde que pedís la audiencia.
      </p>

      <VTable class="idcard-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Caso</th>
            <th>Plazo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in ID_CARD_DEADLINES" :key="row.key">
            <td data-label="Caso">
              <span class="font-weight-medium">{{ row.quien }}</span>
            </td>
            <td data-label="Plazo">{{ row.plazo }}</td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <!-- Discrepancias -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Por qué en gub.uy podés ver otro número</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El importe está repetido en dieciséis fichas —diez de renovación y seis de primera vez, una
        por vía de ciudadanía o de residencia— y quince coinciden. Estas dos no, y como cada persona
        abre la ficha que le toca, conviene saber cuál es cuál.
      </p>

      <VRow>
        <VCol
          v-for="discrepancia in ID_CARD_DISCREPANCIES"
          :key="discrepancia.key"
          cols="12"
          md="6"
        >
          <VCard class="warn-card pa-5 h-100" variant="flat">
            <div class="font-weight-bold mb-2">{{ discrepancia.ficha }}</div>
            <p class="waiver-text mb-2">Dice: {{ discrepancia.dice }}</p>
            <p class="waiver-text text-medium-emphasis mb-3">{{ discrepancia.lectura }}</p>
            <a
              :href="discrepancia.url"
              target="_blank"
              rel="noopener noreferrer"
              class="idcard-source-link"
              >Ver la ficha del trámite</a
            >
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Lo que no publicamos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Tres preguntas que acá no se contestan</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Y no por olvido: la fuente oficial no las contesta, y completarlas de memoria es cómo se
        publica un dato falso con cara de dato oficial.
      </p>

      <VRow>
        <VCol v-for="item in ID_CARD_UNPUBLISHED" :key="item.key" cols="12" md="4">
          <VCard class="unpublished-card pa-5 h-100" variant="flat">
            <div class="font-weight-bold mb-2">{{ item.pregunta }}</div>
            <p class="waiver-text text-medium-emphasis mb-0">{{ item.porQue }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion" class="faq-panels">
        <VExpansionPanel v-for="faq in ID_CARD_FAQ" :key="faq.question" :title="faq.question">
          <VExpansionPanelText>{{ faq.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Seguir -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Otros trámites y costos</h2>
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
        Todos los importes salen del bloque «Costos» de una ficha de trámite de gub.uy. Verificado
        el {{ verificado }}, ficha por ficha. Los aranceles del Estado se actualizan: si vas a hacer
        el trámite, confirmá el importe en la ficha que te corresponde antes de pagar.
      </p>
      <ul class="sources-list">
        <li v-for="source in ID_CARD_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  ID_CARD_BY_KEY,
  ID_CARD_DEADLINES,
  ID_CARD_DISCREPANCIES,
  ID_CARD_FAQ,
  ID_CARD_FEES,
  ID_CARD_SAME_AS_RENEWAL,
  ID_CARD_SOURCES,
  ID_CARD_UNPUBLISHED,
  ID_CARD_VERIFIED_AT,
  ID_CARD_WAIVERS,
  recargoUrgente,
  sobreprecioPrimeraVez,
} from '~/utils/idCard'

const localePath = useLocalePath()

const renovacion = ID_CARD_BY_KEY['renovacion-comun']!
const urgente = ID_CARD_BY_KEY['renovacion-urgente']!
const primera = ID_CARD_BY_KEY['primera-comun']!

const PESOS = new Intl.NumberFormat('es-UY', { minimumFractionDigits: 0 })
const pesos = (amount: number) => `$${PESOS.format(amount)}`

/** «2» — sin decimales cuando la división da entera, que es justamente lo que cuenta la página. */
const veces = recargoUrgente().toLocaleString('es-UY', { maximumFractionDigits: 1 })

const FECHA = new Intl.DateTimeFormat('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const fecha = (iso: string) => FECHA.format(new Date(`${iso}T00:00:00Z`))
const verificado = fecha(ID_CARD_VERIFIED_AT)

const RELATED = [
  { to: '/cuanto-sale-el-pasaporte-uruguayo', label: 'Cuánto sale el pasaporte' },
  { to: '/mudarme-a-uruguay-residencia', label: 'Residencia en Uruguay' },
  { to: '/a-quien-le-reclamo-uruguay', label: 'A quién le reclamo' },
  { to: '/prescripcion-de-deudas-con-el-estado-uruguay', label: 'Deudas con el Estado' },
  { to: '/declarar-dinero-en-efectivo-uruguay', label: 'Declarar efectivo en aduana' },
]

const canonicalUrl = 'https://cambio-uruguay.com/cuanto-sale-la-cedula-de-identidad-uruguaya'
const title = `Cuánto sale la cédula de identidad uruguaya: ${pesos(renovacion.arancel)}`
// 156 caracteres: entra entera en el snippet, y los tres importes van adelante porque son lo
// único que separa a esta descripción de la de cualquier otra guía de trámites.
const description = `Renovar la cédula uruguaya sale ${pesos(renovacion.arancel)} y el urgente ${pesos(urgente.arancel)}, el doble. Primera vez, ${pesos(primera.arancel)}. Perderla no es un trámite aparte, y con denuncia de rapiña sale gratis.`

defineOgImageComponent('Cambio', {
  title: 'Cuánto sale la cédula de identidad uruguaya',
  subtitle: `Renovación ${pesos(renovacion.arancel)}, urgente ${pesos(urgente.arancel)}, primera vez ${pesos(primera.arancel)}`,
  tag: 'CÉDULA',
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
        'cuanto sale la cedula de identidad uruguaya, precio cedula uruguay, costo renovar cedula uruguay, cedula urgente uruguay cuanto sale, cedula primera vez uruguay precio, perdi la cedula uruguay cuanto sale, cedula gratis rapiña uruguay, exoneracion cedula mides, dnic cedula costo, tramite cedula identidad uruguay',
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
                name: 'Cuánto sale la cédula de identidad uruguaya',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: ID_CARD_FAQ.map(faq => ({
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
            dateModified: ID_CARD_VERIFIED_AT,
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            citation: ID_CARD_SOURCES.map(source => ({
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
.idcard-page {
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
.waiver-text {
  margin-top: 0;
  line-height: 1.6;
}

.answer-card,
.note-card,
.warn-card,
.waiver-card,
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
  background: rgba(var(--v-theme-error), 0.05);
}

.idcard-table :deep(th) {
  white-space: nowrap;
}
.idcard-table :deep(td) {
  vertical-align: top;
}

.idcard-source-link {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
  text-decoration: none;
}
.idcard-source-link:hover {
  text-decoration: underline;
}

.sources-list {
  margin-top: 0;
  padding-left: 1.2rem;
  max-width: 80ch;
}
.sources-list li {
  margin-bottom: 0.6rem;
  line-height: 1.5;
}
.sources-list a {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}
.sources-list a:hover {
  text-decoration: underline;
}

.faq-panels {
  border-radius: 14px;
  overflow: hidden;
}
</style>
