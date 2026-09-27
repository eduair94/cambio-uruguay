<template>
  <VContainer class="dgi-cert-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">DGI</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Certificado Único de DGI: qué actos bloquea y a quién no se le emite
      </h1>
      <p class="lead mb-6">
        El art. 80 del Título 1 pone el certificado único como condición para vender un inmueble o
        un auto. Pero a la mitad de la gente que lo busca la DGI
        <strong>no se lo emite</strong>, y eso no es un trámite pendiente: es que el régimen no la
        alcanza.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-account-check-outline" color="warning" class="mr-3 mt-1" />
          <div>
            <p class="warn-title mb-2">Si sólo cobrás sueldo, no te lo van a emitir</p>
            <p class="mb-0">
              El literal d) del art. 1 de la Resolución DGI N° 4127/015 excluye a las personas
              físicas con rentas de trabajo dependiente, y el literal j) a los contribuyentes del
              Impuesto a las Transmisiones Patrimoniales. Qué hay que acreditar en una escritura
              concreta lo determina el <strong>escribano interviniente</strong>, no esta página.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Los actos que bloquea -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Los cinco actos que no se pueden hacer sin él</h2>
      <p class="section-intro mb-5">
        La enumeración es del art. 80 del Título 1 del Texto Ordenado 1996, que crea el régimen: «No
        se podrá enajenar ni gravar bienes inmuebles, enajenar vehículos automotores, distribuir
        utilidades, importar o exportar, o solicitar la expedición o renovación de pasaportes» sin
        obtener antes el certificado único de vigencia anual.
      </p>
      <VRow>
        <VCol v-for="act in DGI_BLOCKED_ACTS" :key="act.key" cols="12" md="6">
          <VCard variant="flat" class="act-card pa-5 h-100">
            <div class="act-h mb-2">{{ act.act }}</div>
            <p class="mb-0 text-medium-emphasis">{{ act.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
      <p class="mt-5 mb-0 text-medium-emphasis">
        Hay una excepción expresa en la propia norma: las escrituras otorgadas por mandato judicial
        no necesitan el certificado, y en ese caso el juzgado informa a la DGI. Y en la enajenación
        de inmuebles «serán solidariamente responsables del impuesto adeudado y obligaciones
        accesorias el comprador y en su caso el prestamista», así que la traba no es sólo del que
        vende.
      </p>
    </section>

    <!-- A quién no se le emite -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">A quién no se le emite</h2>
      <p class="section-intro mb-5">
        Los diez literales del art. 1 de la Resolución DGI N° 4127/015, en el orden de la norma para
        que se puedan verificar fila por fila.
      </p>
      <VTable class="excl-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th class="text-left">Lit.</th>
            <th class="text-left">No se le emite a</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="party in DGI_NOT_ISSUED_TO" :key="party.literal">
            <td data-label="Literal">
              <code>{{ party.literal }})</code>
            </td>
            <td data-label="No se le emite a">
              {{ party.who }}
              <span v-if="party.note" class="d-block text-caption text-medium-emphasis">
                {{ party.note }}
              </span>
            </td>
          </tr>
        </tbody>
      </VTable>

      <VCard class="note-card pa-5 pa-md-6 mt-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-alert-circle-outline" color="info" class="mr-3 mt-1" />
          <div>
            <p class="note-title mb-2">No es una lista de exentos: la salvedad manda</p>
            <p class="mb-3">
              Los de arriba <strong>sí</strong> pueden pedirlo si además son contribuyentes de
              alguno de estos impuestos. Basta uno para que corresponda emitirlo.
            </p>
            <ul class="mb-0">
              <li v-for="tax in DGI_ALSO_ELIGIBLE_IF" :key="tax">{{ tax }}</li>
            </ul>
          </div>
        </div>
      </VCard>
    </section>

    <!-- Vigencia y suspensión -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuánto dura y por qué se puede caer antes</h2>
      <p class="section-intro mb-5">
        El art. 80 lo llama «certificado único y de vigencia anual». Pero el inciso D faculta a la
        DGI a suspender los certificados anuales ya emitidos, y los tres motivos son éstos:
      </p>
      <ul class="reasons mb-5">
        <li v-for="ground in DGI_SUSPENSION_GROUNDS" :key="ground">{{ ground }}</li>
      </ul>
      <p class="mb-0">
        El tercero es el que más sorprende y tiene página propia acá:
        <NuxtLink :to="localePath('/impuesto-de-primaria-uruguay')">
          el impuesto de enseñanza primaria
        </NuxtLink>
        no es un tributo que administre la DGI, y aun así dejar de pagarlo le puede suspender el
        certificado.
      </p>
    </section>

    <!-- El papel no hace falta -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El documento impreso no hace falta</h2>
      <p class="section-intro mb-5">
        Desde la Resolución DGI N° 750/008 la DGI publica en su sitio «el estado del certificado
        único previsto por el artículo 80 del Título 1 del Texto Ordenado 1996, para cada
        contribuyente», y el certificado publicado de esa forma «sustituirá a todos los efectos el
        documento impreso». Quien figure como
        <strong>«Certificado de vigencia anual habilitado»</strong> no tiene que ir a una oficina a
        buscarlo, y quien deba verificarlo consulta el sitio.
      </p>
      <VBtn
        href="https://servicios.dgi.gub.uy/serviciosenlinea/dgi--servicios-en-linea--consulta-de-certifcado-unico"
        target="_blank"
        rel="noopener noreferrer"
        variant="tonal"
        color="primary"
        prepend-icon="mdi-open-in-new"
      >
        Consultar un certificado en la DGI
      </VBtn>
    </section>

    <!-- Cómo se pide y qué cuesta -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cómo se pide y qué cuesta</h2>
      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="cost-card pa-5 h-100">
            <div class="act-h mb-2">Certificado de vigencia anual</div>
            <p class="mb-2 text-medium-emphasis">
              Formulario 5000. En línea las 24 horas, o presencial en oficinas de la DGI con agenda
              previa.
            </p>
            <p class="mb-0">
              Lleva un timbre profesional de
              <strong>$ {{ DGI_TIMBRE_UYU }}</strong>
              , el valor que la tabla de la DGI fija hasta el 31 de diciembre de 2026.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="cost-card pa-5 h-100">
            <div class="act-h mb-2">Certificado único especial</div>
            <p class="mb-2 text-medium-emphasis">
              Formulario 5001, para actos societarios. En una enajenación lo pide el enajenante; si
              no lo hace en {{ DGI_BUYER_TAKEOVER_DAYS }} días, puede pedirlo el adquirente o el
              profesional interviniente.
            </p>
            <ul class="mb-0 ops-list">
              <li v-for="op in DGI_SPECIAL_OPERATIONS" :key="op">{{ op }}</li>
            </ul>
          </VCard>
        </VCol>
      </VRow>
      <p class="mt-5 mb-0 text-medium-emphasis">
        Una aclaración sobre el importe, porque acá es fácil equivocarse: la ficha del trámite en
        gub.uy publica un timbre de $ 260 con validez «del 01 julio 2025 al 31 diciembre 2025», o
        sea un valor vencido. El que vale es el de la tabla «Valor de los timbres», que se actualiza
        por período.
      </p>
    </section>

    <!-- Preguntas -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion" class="faq-panels">
        <VExpansionPanel v-for="item in DGI_CERTIFICATE_FAQ" :key="item.question">
          <VExpansionPanelTitle class="font-weight-medium">
            {{ item.question }}
          </VExpansionPanelTitle>
          <VExpansionPanelText>{{ item.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Relacionadas -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Relacionadas</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn :to="localePath('/certificados-bps-uruguay')" variant="tonal" size="small">
          Certificados del BPS
        </VBtn>
        <VBtn
          :to="localePath('/guias/costos-de-escrituracion-uruguay')"
          variant="tonal"
          size="small"
        >
          Costos de escrituración
        </VBtn>
        <VBtn :to="localePath('/guias/transferir-un-auto-uruguay')" variant="tonal" size="small">
          Transferir un auto
        </VBtn>
        <VBtn :to="localePath('/facturar-en-monotributo-uruguay')" variant="tonal" size="small">
          Facturar en monotributo
        </VBtn>
        <VBtn :to="localePath('/impuesto-de-primaria-uruguay')" variant="tonal" size="small">
          Impuesto de primaria
        </VBtn>
      </div>
    </section>

    <!-- Fuentes -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="section-intro mb-4">
        Toda cifra y toda prohibición de esta página sale de una de estas páginas oficiales.
        Verificado el {{ DGI_CERTIFICATE_VERIFIED_AT }}.
      </p>
      <ul class="sources mb-0">
        <li v-for="source in DGI_CERTIFICATE_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  DGI_ALSO_ELIGIBLE_IF,
  DGI_BLOCKED_ACTS,
  DGI_BUYER_TAKEOVER_DAYS,
  DGI_CERTIFICATE_FAQ,
  DGI_CERTIFICATE_SOURCES,
  DGI_CERTIFICATE_VERIFIED_AT,
  DGI_NOT_ISSUED_TO,
  DGI_SPECIAL_OPERATIONS,
  DGI_SUSPENSION_GROUNDS,
  DGI_TIMBRE_UYU,
} from '~/utils/dgiCertificate'

const localePath = useLocalePath()
const canonicalUrl = 'https://cambio-uruguay.com/certificado-unico-dgi-uruguay'

const title = 'Certificado Único de DGI: cuándo hace falta'
// La descripción arranca por la respuesta y no por lo que la página es: medido en este sitio, un
// snippet con el dato corre a ~1,4 % de CTR y uno genérico a 0,03–0,2 % desde la misma posición.
// Entra entera en los 155 caracteres que el SERP publica (`seoDescriptionBudget`).
const description =
  'La DGI no se lo emite a quien sólo cobra sueldo ni al monotributista. Los cinco actos que bloquea el art. 80 y el timbre de $ 270 de la solicitud.'

defineOgImageComponent('Cambio', {
  title: 'Certificado Único de DGI',
  subtitle: 'Qué actos bloquea y a quién no se le emite',
  tag: 'DGI',
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
        'certificado unico dgi, certificado unico vigencia anual, certificado unico para vender inmueble, certificado unico dgi vender auto, formulario 5000 dgi, formulario 5001 certificado especial, consulta certificado unico dgi, articulo 80 titulo 1, resolucion 4127/015, timbre profesional certificado dgi',
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
                name: 'Certificado Único de DGI',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: DGI_CERTIFICATE_FAQ.map(item => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.lead {
  font-size: 1.1rem;
  line-height: 1.7;
  max-width: 72ch;
  margin-top: 0;
}

.section-intro {
  max-width: 72ch;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.7;
  margin-top: 0;
}

.warn-card {
  border: 1px solid rgba(var(--v-theme-warning), 0.35);
  background: rgba(var(--v-theme-warning), 0.06);
}

.note-card {
  border: 1px solid rgba(var(--v-theme-info), 0.35);
  background: rgba(var(--v-theme-info), 0.06);
}

.warn-title,
.note-title {
  font-weight: 700;
  margin-top: 0;
}

.act-card,
.cost-card {
  border: 1px solid rgba(var(--v-border-color), 0.16);
}

.act-h {
  font-weight: 700;
}

.excl-table code {
  font-size: 0.85rem;
}

.reasons,
.ops-list,
.sources {
  margin-top: 0;
  padding-left: 1.25rem;
}

.reasons li,
.ops-list li,
.sources li {
  margin-top: 0.35rem;
}

.faq-panels {
  max-width: 80ch;
}
</style>
