<template>
  <VContainer class="partida-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">PARTIDAS</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        ¿Cuánto sale la partida de nacimiento en Uruguay?
      </h1>
      <p class="lead mb-6">
        La pregunta ya no se contesta con un precio sino con una fecha. Si el nacimiento se
        inscribió <strong>desde el 1º de enero de 2022</strong>, la partida es digital y
        <strong>no tiene costo</strong>: se descarga en línea. Si es anterior, es manuscrita y sale
        <strong>{{ pesos(comun.arancel) }}</strong> el trámite común o
        <strong>{{ pesos(urgente.arancel) }}</strong> el urgente — {{ veces }} veces el común, no un
        recargo. Son los importes del bloque «Costos» de las fichas de gub.uy, leídas el
        {{ verificado }}.
      </p>

      <VCard class="answer-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-file-certificate-outline" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">La respuesta corta</div>
            <p class="callout-text mb-0">
              Inscripta desde 2022 (o desde 2015 si el hecho fue en el extranjero):
              <strong>$0</strong>, digital. Antes de eso:
              <strong>{{ pesos(comun.arancel) }}</strong> común o
              <strong>{{ pesos(urgente.arancel) }}</strong> urgente, más el costo del medio de pago
              que elijas. Y antes de pagar nada, fijate si quien te la pide puede exigirla: el
              Decreto 353/23 se lo prohíbe a las entidades públicas cuando el dato ya está en un
              registro digital del Estado.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- El cuadro -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Los tres precios</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El primero es cero, y por eso encabeza: quien nació después de 2022 —o pide la partida de un
        hijo— no tiene que pagar nada, y una tabla que empezara por la manuscrita le cobraría
        mentalmente un trámite que no existe.
      </p>

      <VTable class="partida-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Modalidad</th>
            <th class="text-right">Costo</th>
            <th>Cuándo te toca</th>
            <th>Cuándo la tenés</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fee in PARTIDA_FEES" :key="fee.key">
            <td data-label="Modalidad">
              <span class="font-weight-medium">{{ fee.label }}</span>
            </td>
            <td data-label="Costo" class="text-right text-no-wrap">
              <VChip
                :color="fee.key === 'manuscrita-urgente' ? 'warning' : 'success'"
                variant="tonal"
                size="small"
              >
                {{ fee.arancel === 0 ? 'Sin costo' : pesos(fee.arancel) }}
              </VChip>
            </td>
            <td data-label="Cuándo te toca">{{ fee.cubre }}</td>
            <td data-label="Cuándo la tenés">{{ fee.entrega }}</td>
          </tr>
        </tbody>
      </VTable>

      <VCard class="note-card pa-5 pa-md-6 mt-5" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-cash-clock" color="warning" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Qué estás pagando con el urgente</div>
            <p class="note-text mb-0">
              {{ pesos(sobreprecioUrgente()) }} de diferencia, y lo que comprás es tiempo: la
              manuscrita común pedida por internet se retira a partir de los 7 días hábiles y la
              urgente a partir de 2. Con agenda presencial la brecha se achica muchísimo —2 días
              hábiles contra el mismo día—, así que antes de pagar el urgente conviene mirar si
              conseguís agenda.
            </p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- La fecha -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">La fecha que decide, y no es la de hoy</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Lo que manda es cuándo se <strong>inscribió</strong> el hecho, no cuándo pedís el papel. Y
        hay dos cortes distintos, separados por siete años, porque las actas del exterior se
        digitalizaron antes.
      </p>

      <VRow>
        <VCol cols="12" md="6">
          <VCard class="cut-card pa-5 h-100" variant="flat">
            <div class="text-overline mb-2">Hecho ocurrido en Uruguay</div>
            <p class="cut-figure mb-2">Desde el 1/1/2022</p>
            <p class="waiver-text mb-0">
              Digital y sin costo. Se descarga desde la ficha del trámite con la cédula, o con
              nombres, apellidos y fecha de nacimiento. También por WhatsApp al 091 365 724, que
              responde automáticamente y sirve sólo para las digitalizadas.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard class="cut-card pa-5 h-100" variant="flat">
            <div class="text-overline mb-2">Hecho ocurrido en el extranjero</div>
            <p class="cut-figure mb-2">Inscripto desde {{ PARTIDA_FOREIGN_DIGITAL_SINCE_YEAR }}</p>
            <p class="waiver-text mb-0">
              También digital y sin costo, buscándola en la opción «Datos registrales o actas del
              extranjero». Ojo: primero hay que haber hecho la inscripción del hecho en Uruguay; sin
              eso no existe partida uruguaya que pedir.
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Plazos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuánto se demora la manuscrita</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Los cuatro plazos que publica la ficha, que los rotula como transitorios «hasta nuevo
        aviso». Miden desde que está hecho el pago hasta que la retirás, no desde que pedís la
        agenda.
      </p>

      <VTable class="partida-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Vía</th>
            <th>Plazo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in PARTIDA_DEADLINES" :key="row.key">
            <td data-label="Vía">
              <span class="font-weight-medium">{{ row.via }}</span>
            </td>
            <td data-label="Plazo">{{ row.plazo }}</td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <!-- Mismo arancel -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Matrimonio y defunción salen lo mismo</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Las fichas de los cuatro hechos publican el mismo par
        {{ pesos(comun.arancel) }} / {{ pesos(urgente.arancel) }} y la misma gratuidad de las
        digitales. El divorcio hecho en Uruguay no está en la lista porque no tiene partida propia:
        se pide la de matrimonio, que lleva el divorcio anotado al margen.
      </p>

      <div class="d-flex flex-wrap ga-2">
        <VChip
          v-for="hecho in PARTIDA_SAME_FEE"
          :key="hecho"
          color="primary"
          variant="tonal"
          size="small"
        >
          <VIcon start size="small">mdi-check</VIcon>{{ hecho }}
        </VChip>
      </div>
    </section>

    <!-- Apostilla -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Si la vas a usar en el exterior</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Es el tramo del gasto que casi nadie tiene en cuenta, y es el más caro de los dos: hacerla
        valer afuera sale más que la partida misma. Lo hace Cancillería, en otra dirección y con
        otra agenda —Cuareim 1384, de lunes a viernes de 09:30 a 12:30 y de 14:00 a 15:30— y se paga
        antes de reservar el cupo. Valores de 2026.
      </p>

      <VRow>
        <VCol v-for="item in PARTIDA_APOSTILLA" :key="item.key" cols="12" md="6">
          <VCard class="waiver-card pa-5 h-100" variant="flat">
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="font-weight-bold">{{ item.label }}</div>
              <VChip color="warning" variant="tonal" size="small">{{ pesos(item.arancel) }}</VChip>
            </div>
            <p class="waiver-text mb-0">{{ item.paraQue }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Lo que conviene saber -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Seis cosas que la ficha dice y nadie lee</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Ninguna es un precio y todas cambian el trámite: cuál pedir, dónde, o si hace falta pedirla.
      </p>

      <VRow>
        <VCol v-for="fact in PARTIDA_FACTS" :key="fact.key" cols="12" md="6">
          <VCard class="fact-card pa-5 h-100" variant="flat">
            <div class="font-weight-bold mb-2">{{ fact.titulo }}</div>
            <p class="waiver-text text-medium-emphasis mb-0">{{ fact.detalle }}</p>
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
        <VCol v-for="item in PARTIDA_UNPUBLISHED" :key="item.key" cols="12" md="4">
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
        <VExpansionPanel v-for="faq in PARTIDA_FAQ" :key="faq.question" :title="faq.question">
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
        Todos los importes salen del bloque «Costos» de una ficha de trámite de gub.uy, leída el
        {{ verificado }}. Los aranceles del Estado se actualizan: si vas a hacer el trámite,
        confirmá el importe en la ficha antes de pagar.
      </p>
      <ul class="sources-list">
        <li v-for="source in PARTIDA_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  PARTIDA_APOSTILLA,
  PARTIDA_BY_KEY,
  PARTIDA_DEADLINES,
  PARTIDA_FACTS,
  PARTIDA_FAQ,
  PARTIDA_FEES,
  PARTIDA_FOREIGN_DIGITAL_SINCE_YEAR,
  PARTIDA_SAME_FEE,
  PARTIDA_SOURCES,
  PARTIDA_UNPUBLISHED,
  PARTIDA_VERIFIED_AT,
  recargoUrgente,
  sobreprecioUrgente,
} from '~/utils/birthCertificate'

const localePath = useLocalePath()

const comun = PARTIDA_BY_KEY['manuscrita-comun']!
const urgente = PARTIDA_BY_KEY['manuscrita-urgente']!

const PESOS = new Intl.NumberFormat('es-UY', { minimumFractionDigits: 0 })
const pesos = (amount: number) => `$${PESOS.format(amount)}`

/** «4» — sin decimales cuando la división da entera, que es justamente lo que cuenta la página. */
const veces = recargoUrgente().toLocaleString('es-UY', { maximumFractionDigits: 1 })

const FECHA = new Intl.DateTimeFormat('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const verificado = FECHA.format(new Date(`${PARTIDA_VERIFIED_AT}T00:00:00Z`))

const RELATED = [
  { to: '/cuanto-sale-la-cedula-de-identidad-uruguaya', label: 'Cuánto sale la cédula' },
  { to: '/cuanto-sale-el-pasaporte-uruguayo', label: 'Cuánto sale el pasaporte' },
  {
    to: '/certificado-de-antecedentes-judiciales-uruguay',
    label: 'Antecedentes judiciales',
  },
  { to: '/mudarme-a-uruguay-residencia', label: 'Residencia en Uruguay' },
  { to: '/carne-de-salud-uruguay', label: 'Carné de salud' },
]

const canonicalUrl = 'https://cambio-uruguay.com/cuanto-sale-la-partida-de-nacimiento-uruguay'
// 53 caracteres con la marca que agrega `titleTemplate`, dentro de los ~60 que publica Google: el
// «Uruguay» lo pone el sufijo de marca, así que no hace falta gastarlo dos veces en el mismo <title>.
const title = `Partida de nacimiento: gratis o ${pesos(comun.arancel)}`
// 152 caracteres: entra entera en el snippet, y la fecha que decide el precio va adelante porque
// es la respuesta, no el contexto.
const description = `Inscripta desde 2022, la partida es digital y sale $0. Anterior a eso es manuscrita: ${pesos(comun.arancel)} el trámite común y ${pesos(urgente.arancel)} el urgente.`

defineOgImageComponent('Cambio', {
  title: 'Cuánto sale la partida de nacimiento',
  subtitle: `Digital sin costo desde 2022 · manuscrita ${pesos(comun.arancel)} o ${pesos(urgente.arancel)}`,
  tag: 'PARTIDAS',
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
        'partida de nacimiento uruguay, cuanto sale la partida de nacimiento, partida de nacimiento digital uruguay, partida de nacimiento online uruguay, registro de estado civil partidas, partida de matrimonio uruguay costo, partida de defuncion uruguay, apostillar partida de nacimiento uruguay, partida de nacimiento whatsapp uruguay, dgrec partidas',
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
                name: 'Cuánto sale la partida de nacimiento en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: PARTIDA_FAQ.map(faq => ({
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
            dateModified: PARTIDA_VERIFIED_AT,
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            citation: PARTIDA_SOURCES.map(source => ({
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
.partida-page {
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
.cut-figure {
  margin-top: 0;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.3;
  color: rgb(var(--v-theme-primary));
}

.answer-card,
.note-card,
.waiver-card,
.cut-card,
.fact-card,
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
.cut-card {
  background: rgba(var(--v-theme-success), 0.05);
}

.partida-table :deep(th) {
  white-space: nowrap;
}
.partida-table :deep(td) {
  vertical-align: top;
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
