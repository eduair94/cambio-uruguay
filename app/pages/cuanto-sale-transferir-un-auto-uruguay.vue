<template>
  <VContainer class="transfer-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">VEHÍCULOS</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        ¿Cuánto sale transferir un auto en Uruguay?
      </h1>
      <p class="lead mb-6">
        La transferencia se hace en la intendencia donde está empadronado el auto, y las listas de
        requisitos que publican las intendencias no coinciden. El precio, en cambio, es uno solo: la
        libreta nueva sale <strong>{{ pesos(CAR_TRANSFER_DIV_2026) }}</strong> en
        {{ CAR_TRANSFER_DIV_YEAR }} en cualquier departamento, porque el importe lo fija el
        <strong>Texto Ordenado del SUCIVE</strong> que el Congreso de Intendentes remite a todas las
        intendencias. Las <strong>{{ modalCount }}</strong> fichas oficiales actualizadas en
        {{ CAR_TRANSFER_DIV_YEAR }} lo publican redondeado, {{ pesos(CAR_TRANSFER_MODAL_FEE) }}; las
        que dicen otro número son fichas viejas. Fuentes leídas el {{ verificado }}.
      </p>

      <VCard class="answer-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-car-key" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">La respuesta corta</div>
            <p class="callout-text mb-0">
              <strong>{{ pesos(CAR_TRANSFER_DIV_2026) }}</strong> en cualquier departamento, y eso
              es <strong>lo que cobra la intendencia</strong>: la libreta nueva a nombre del
              comprador. El escribano, el certificado de libre de prenda y la inspección técnica van
              aparte: ninguna de las {{ cubiertos }} fuentes los tarifa. Lo único que piden las
              {{ cubiertos }}: {{ universales }}. Y con deuda de patente o multas no se transfiere
              en ningún departamento.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- El cuadro de aranceles -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que dice cada ficha</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El importe vigente es el mismo en todas; lo que cambia es lo que cada ficha alcanzó a
        escribir. Por eso cada fila trae la fecha que la propia ficha muestra como «Última
        actualización»: las {{ modalCount }} actualizadas en {{ CAR_TRANSFER_DIV_YEAR }} dicen
        {{ pesos(CAR_TRANSFER_MODAL_FEE) }}, y las que dicen otro número son de 2025 o antes.
      </p>

      <VCard class="answer-card pa-5 mb-6" variant="flat">
        <div class="text-overline mb-2">El importe nacional</div>
        <p class="note-text mb-2">
          {{ CAR_TRANSFER_DIV_2026_SOURCE.label }}: <q>{{ CAR_TRANSFER_DIV_2026_SOURCE.quote }}</q
          >.
        </p>
        <a
          :href="CAR_TRANSFER_DIV_2026_SOURCE.url"
          target="_blank"
          rel="noopener noreferrer"
          class="ficha-link text-body-2"
        >
          Leer el Texto Ordenado (PDF, gub.uy)
          <VIcon icon="mdi-open-in-new" size="x-small" />
        </a>
      </VCard>

      <VTable class="transfer-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Departamento</th>
            <th class="text-right">Importe que publica</th>
            <th>Qué cubre</th>
            <th>Turno</th>
            <th>Ficha actualizada</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="dept in CAR_TRANSFER_DEPARTMENTS" :key="dept.slug">
            <td data-label="Departamento">
              <span class="font-weight-medium">{{ dept.departamento }}</span>
            </td>
            <td data-label="Importe que publica" class="text-right text-no-wrap">
              <VChip :color="dept.arancel === null ? 'grey' : 'info'" variant="tonal" size="small">
                {{ dept.arancel === null ? 'No publica' : pesos(dept.arancel) }}
              </VChip>
            </td>
            <td data-label="Qué cubre">{{ dept.arancelCubre }}</td>
            <td data-label="Turno">{{ TURNO_LABEL[dept.turno] }}</td>
            <td data-label="Ficha actualizada" class="text-no-wrap">
              {{ fecha(dept.fichaUpdatedAt) }}
            </td>
          </tr>
        </tbody>
      </VTable>

      <VCard class="note-card pa-5 mt-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-calendar-alert" color="warning" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Por qué dos fichas dicen otro número</div>
            <p class="note-text mb-0">{{ CAR_TRANSFER_FEE_SPREAD_NOTE }}</p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- Los requisitos comparados -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Qué pide cada intendencia</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        «Sí» es lo que la ficha lista; «en algún caso» es lo que pide bajo condición; y un guion
        quiere decir que esa ficha no lo nombra, no que la intendencia no lo pida. La ausencia no es
        un veredicto: si vas a presentarte, la ficha de tu departamento manda.
      </p>

      <VTable class="transfer-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Requisito</th>
            <th class="text-center">Fichas que lo piden</th>
            <th>Departamentos</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="req in requisitoRows" :key="req.field">
            <td data-label="Requisito">
              <span class="font-weight-medium">{{ req.label }}</span>
            </td>
            <td data-label="Fichas que lo piden" class="text-center text-no-wrap">
              <VChip
                :color="req.count === cubiertos ? 'success' : 'info'"
                variant="tonal"
                size="small"
              >
                {{ req.count }} de {{ cubiertos }}
              </VChip>
            </td>
            <td data-label="Departamentos">
              {{ req.quienes }}
              <span v-if="req.condicionales" class="text-medium-emphasis">
                · en algún caso: {{ req.condicionales }}
              </span>
            </td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <!-- Lo propio de cada ficha -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que pide una y no piden las otras</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Las sorpresas que cuestan un viaje de vuelta no están en la lista común: están acá.
      </p>

      <VRow dense>
        <VCol v-for="dept in CAR_TRANSFER_DEPARTMENTS" :key="dept.slug" cols="12" md="6">
          <VCard class="fact-card pa-4 h-100" variant="flat">
            <div class="text-overline mb-1">{{ dept.departamento }}</div>
            <p class="note-text mb-2">{{ dept.particularidad }}</p>
            <a
              :href="dept.fichaUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="ficha-link text-body-2"
            >
              Ficha oficial ({{ dept.fuente === 'catalogo' ? 'gub.uy' : 'portal propio' }})
              <VIcon icon="mdi-open-in-new" size="x-small" />
            </a>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Los que no tienen ficha -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        Los {{ CAR_TRANSFER_NO_FICHA.length }} departamentos sin ficha en el catálogo nacional
      </h2>
      <VCard class="unpublished-card pa-5" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-file-remove-outline" color="grey" class="mr-3 mt-1" />
          <div>
            <p class="note-text mb-3">
              Buscando el {{ verificado }} en el catálogo nacional de trámites (gub.uy/tramites) y
              probando directamente las seis formas de URL que el propio catálogo usa para este
              trámite, no encontramos ficha para <strong>{{ sinFicha }}</strong
              >. El trámite existe en los {{ URUGUAY_DEPARTMENTS }} departamentos y el importe de la
              libreta es el mismo; lo que falta es la lista de requisitos en el catálogo.
            </p>
            <p class="note-text mb-2">
              {{ CAR_TRANSFER_OWN_PORTALS.length }} de ellos publican el trámite en el portal de su
              intendencia (no entran en las tablas de arriba):
            </p>
            <ul class="sources-list mb-3">
              <li v-for="portal in CAR_TRANSFER_OWN_PORTALS" :key="portal.url">
                <a :href="portal.url" target="_blank" rel="noopener noreferrer">{{
                  portal.departamento
                }}</a
                >: {{ portal.publica }}.
              </li>
            </ul>
            <p class="note-text mb-3">En los demás, hay que preguntarlo en la intendencia.</p>
            <p class="note-text mb-0 text-medium-emphasis">
              Si tu intendencia publicó la suya y no está acá, escribinos y la agregamos con su
              fecha.
            </p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- Lo que no publicamos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que esta página no publica</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Preguntas que la gente hace y que contestaríamos de memoria. Las fuentes oficiales no las
        traen, así que acá no hay número.
      </p>
      <VRow dense>
        <VCol v-for="item in CAR_TRANSFER_UNPUBLISHED" :key="item.topic" cols="12" md="6">
          <VCard class="waiver-card pa-4 h-100" variant="flat">
            <div class="text-overline mb-1">{{ item.topic }}</div>
            <p class="waiver-text mb-0">{{ item.why }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels class="faq-panels" variant="accordion">
        <VExpansionPanel v-for="faq in CAR_TRANSFER_FAQ" :key="faq.question" :title="faq.question">
          <VExpansionPanelText>{{ faq.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Seguí leyendo -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Antes de firmar</h2>
      <VRow dense>
        <VCol v-for="link in RELATED" :key="link.to" cols="12" sm="6" md="4">
          <NuxtLink :to="localePath(link.to)" class="related-link d-block pa-4">
            <span class="font-weight-medium">{{ link.label }}</span>
          </NuxtLink>
        </VCol>
      </VRow>
    </section>

    <!-- Fuentes -->
    <section>
      <h2 class="text-h5 font-weight-bold mb-3">Fuentes</h2>
      <p class="sources-note text-medium-emphasis mb-4">
        El importe vigente sale del Texto Ordenado del SUCIVE; lo que publica cada departamento, del
        bloque «Costos» de su ficha. Todo leído el {{ verificado }}. Ninguna cifra está estimada ni
        arrastrada de un departamento a otro.
      </p>
      <ul class="sources-list">
        <li v-for="source in CAR_TRANSFER_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  CAR_TRANSFER_DEPARTMENTS,
  CAR_TRANSFER_DIV_2026,
  CAR_TRANSFER_DIV_2026_SOURCE,
  CAR_TRANSFER_DIV_YEAR,
  CAR_TRANSFER_FAQ,
  CAR_TRANSFER_FEE_SPREAD_NOTE,
  CAR_TRANSFER_MODAL_FEE,
  CAR_TRANSFER_NO_FICHA,
  CAR_TRANSFER_OWN_PORTALS,
  CAR_TRANSFER_REQUISITO_LABELS,
  CAR_TRANSFER_SOURCES,
  CAR_TRANSFER_UNPUBLISHED,
  CAR_TRANSFER_VERIFIED_AT,
  URUGUAY_DEPARTMENTS,
  carTransferCoveredCount,
  carTransferModalCount,
  carTransferRequisitoCount,
  carTransferUniversalRequisitos,
  type CarTransferRequisitos,
  type CarTransferTurno,
} from '~/utils/carTransferFees'

const localePath = useLocalePath()

const PESOS = new Intl.NumberFormat('es-UY', { minimumFractionDigits: 0 })
const pesos = (amount: number) => `$${PESOS.format(amount)}`

const FECHA = new Intl.DateTimeFormat('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const fecha = (iso: string) => FECHA.format(new Date(`${iso}T00:00:00Z`))
const verificado = fecha(CAR_TRANSFER_VERIFIED_AT)

const cubiertos = carTransferCoveredCount()
const modalCount = carTransferModalCount()

const universales = carTransferUniversalRequisitos()
  .map(req => req.prose)
  .join(' y ')

const sinFicha = CAR_TRANSFER_NO_FICHA.join(', ')

const TURNO_LABEL: Record<CarTransferTurno, string> = {
  'agenda-previa': 'Agenda previa',
  'orden-de-llegada': 'Orden de llegada',
  'en-linea': 'Se inicia en línea',
  'no-figura': 'No lo dice',
}

const nombres = (field: keyof CarTransferRequisitos, estado: 'si' | 'condicional') =>
  CAR_TRANSFER_DEPARTMENTS.filter(dept => dept.requisitos[field] === estado)
    .map(dept => dept.departamento)
    .join(', ')

const requisitoRows = CAR_TRANSFER_REQUISITO_LABELS.map(({ field, label }) => ({
  field,
  label,
  count: carTransferRequisitoCount(field),
  quienes: nombres(field, 'si') || '—',
  condicionales: nombres(field, 'condicional'),
}))

const RELATED = [
  { to: '/guias/transferir-un-auto-uruguay', label: 'Cómo transferir un auto, paso a paso' },
  { to: '/comprar-auto-con-deuda-uruguay', label: 'Comprar un auto con deuda' },
  { to: '/vender-mi-auto-uruguay', label: 'Vender mi auto' },
  { to: '/multas-de-transito-y-patente-uruguay', label: 'Multas y patente' },
  { to: '/seguro-obligatorio-de-auto-uruguay', label: 'Seguro obligatorio (SOA)' },
  { to: '/autos-usados-uruguay', label: 'Autos usados' },
]

const canonicalUrl = 'https://cambio-uruguay.com/cuanto-sale-transferir-un-auto-uruguay'
// 40 caracteres, 57 con la marca que agrega `titleTemplate`: entra en los ~60 que publica Google.
// La cifra va adelante porque es la consulta, y «la libreta» aclara qué paga ese importe, que es la
// confusión que la página corrige (no paga el escribano). Es el importe del SUCIVE redondeado al
// peso, como lo publican las fichas al día; el cuerpo y la descripción dan los centésimos.
const title = `Transferencia de auto: ${pesos(CAR_TRANSFER_MODAL_FEE)} la libreta`
// 137 caracteres resueltos, dentro de los 155 que mide `seoDescriptionBudget`. La longitud la
// verifica RESUELTA `tests/unit/carTransferFees.test.ts`, y no es un detalle: el lector de ese
// presupuesto sustituye cada interpolación por vacío, así que a una descripción armada con cifras
// le mide de menos y se le escapa justo cuando crece. La cifra va primero, con quién la fija (es la
// misma en todo el país), y la segunda oración aclara qué NO cubre, que es la confusión que manda
// a la gente a presupuestar de menos.
const description = `La libreta nueva sale ${pesos(CAR_TRANSFER_DIV_2026)} en ${CAR_TRANSFER_DIV_YEAR} en todo el país: la fija el SUCIVE. Qué pide cada intendencia y qué va aparte, como el escribano.`

defineOgImageComponent('Cambio', {
  title: 'Cuánto sale transferir un auto',
  subtitle: `${pesos(CAR_TRANSFER_DIV_2026)} la libreta en ${CAR_TRANSFER_DIV_YEAR} · ${cubiertos} fuentes oficiales`,
  tag: 'VEHÍCULOS',
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
        'cuanto sale transferir un auto uruguay, transferencia de auto uruguay, cambio de titularidad vehiculo uruguay, costo transferencia auto uruguay, libreta de propiedad precio uruguay, div documento de identificacion vehicular, transferir moto uruguay, requisitos transferencia auto intendencia, transferencia vehiculo canelones, transferencia vehiculo maldonado',
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
                name: 'Cuánto sale transferir un auto en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: CAR_TRANSFER_FAQ.map(faq => ({
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
            dateModified: CAR_TRANSFER_VERIFIED_AT,
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            citation: CAR_TRANSFER_SOURCES.map(source => ({
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
.transfer-page {
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
.waiver-card,
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

.transfer-table :deep(th) {
  white-space: nowrap;
}
.transfer-table :deep(td) {
  vertical-align: top;
}

.ficha-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}
.ficha-link:hover {
  text-decoration: underline;
}

.related-link {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px;
  color: inherit;
  text-decoration: none;
  background: rgba(var(--v-theme-surface), 1);
}
.related-link:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
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
