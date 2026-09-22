<!--
  /que-pasa-si-no-pago-antel — deuda con Antel: bloqueo, supresión, reconexión y el contrato.
  Tres consultas del autocompletado uruguayo con el SERP lleno de foros (job currency-search-demand,
  2026-09-03) más una cuarta del mismo cuadro, "antel cuando vence mi contrato". Segunda lectura el
  2026-09-22: Antel sí publica cuántas facturas hacen falta (tres escaleras, una por servicio) y un
  único plazo en días, en el tarifario de fija. Todos los datos, con su documento, en
  utils/antelDeuda.ts.
-->
<template>
  <VContainer class="antel py-6" style="max-width: 900px">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Deuda con Antel', disabled: true },
      ]"
    />

    <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
      ¿Qué pasa si no pagás la factura de Antel?
    </h1>

    <p class="text-body-1 mb-4" style="max-width: 68ch">
      Antel no corta por días sino por facturas. En telefonía fija, la primera factura adeudada sólo
      genera la multa del 5 % y la segunda impaga bloquea las llamadas salientes; en móvil, una
      factura impaga ya bloquea salientes y dos consecutivas bloquean todo. La mora corre desde el
      mismo día del vencimiento y sin aviso. Pagada la deuda no hay desbloqueo manual: 48 horas
      hábiles el fijo y 72 horas internet, sin cargo de reconexión. Acá están las tres escaleras que
      publica Antel, con el documento al lado, y marcado lo que no publica.
    </p>

    <!-- La secuencia primero: es la pregunta. -->
    <section aria-labelledby="secuencia-title" class="mb-6">
      <h2 id="secuencia-title" class="text-h6 font-weight-bold mb-2">Qué pasa, y en qué orden</h2>
      <VTimeline side="end" density="compact">
        <VTimelineItem
          v-for="(paso, i) in SECUENCIA"
          :key="paso.pregunta"
          :dot-color="paso.sinPublicar ? 'warning' : 'primary'"
          size="x-small"
        >
          <div class="text-subtitle-2 font-weight-bold">{{ i + 1 }}. {{ paso.pregunta }}</div>
          <p class="text-body-2 mb-1" style="max-width: 64ch">{{ paso.respuesta }}</p>
          <div class="text-caption text-medium-emphasis">
            <VChip
              v-if="paso.sinPublicar"
              size="x-small"
              color="warning"
              variant="tonal"
              class="mr-2"
            >
              sin publicar
            </VChip>
            {{ paso.fuente }}
            <a
              v-if="fuentePrincipal(paso)"
              :href="fuentePrincipal(paso)!.url"
              target="_blank"
              rel="noopener noreferrer"
              class="cu-link ml-1"
              >Fuente</a
            >
          </div>
        </VTimelineItem>
      </VTimeline>
    </section>

    <!-- Las tres escaleras: es lo que la primera versión de la página decía que no existía. -->
    <section aria-labelledby="escaleras-title" class="mb-6">
      <h2 id="escaleras-title" class="text-h6 font-weight-bold mb-2">
        Cuándo corta: las tres escaleras de Antel, factura por factura
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
        Tres documentos, tres escaleras que no coinciden, las tres de Antel. La del contrato móvil
        es la más dura; la del tarifario de fija es la única con un plazo en días y la que más tarda
        en suprimir; la tabla general de junio de 2023 ya no está en el sitio. Para internet no hay
        una escalera vigente propia: el reglamento y las condiciones de internet no cuentan
        facturas.
      </p>
      <div class="table-wrap mb-3">
        <VTable density="comfortable" class="cu-mobile-cards escaleras">
          <thead>
            <tr>
              <th>Servicio y documento</th>
              <th>Bloqueo saliente</th>
              <th>Bloqueo total</th>
              <th>Supresión o cancelación</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in ESCALERAS" :key="e.id">
              <td data-label="Servicio y documento" style="min-width: 220px">
                <div class="font-weight-bold">{{ e.servicio }}</div>
                <div class="text-caption">{{ e.documento }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ e.vigencia }}
                  <a
                    v-if="fuentePrincipal(e)"
                    :href="fuentePrincipal(e)!.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="cu-link ml-1"
                    >Fuente</a
                  >
                </div>
              </td>
              <td data-label="Bloqueo saliente" class="text-body-2">{{ e.bloqueoSaliente }}</td>
              <td data-label="Bloqueo total" class="text-body-2">{{ e.bloqueoTotal }}</td>
              <td data-label="Supresión o cancelación" class="text-body-2">{{ e.supresion }}</td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <VAlert type="info" variant="tonal" density="comfortable" class="mb-3">
        <div class="text-subtitle-2 font-weight-bold mb-1">
          Lo que no dice ningún documento de Antel
        </div>
        <div class="text-body-2">
          Que corte "a los tantos días" del vencimiento; que "tres facturas vencidas" sea la regla
          (es la cifra de un sitio de terceros sin fuente, y omite el bloqueo saliente anterior);
          que avise por SMS o correo antes de bloquear; que exista un cargo de reconexión. Si te
          pasó, lo firme es pagar o pedir el convenio antes de que el bloqueo saliente se convierta
          en total.
        </div>
      </VAlert>
      <p class="text-body-2 text-medium-emphasis mb-0" style="max-width: 68ch">
        <strong>{{ ANTECEDENTE_COVID.pregunta }}.</strong> {{ ANTECEDENTE_COVID.respuesta }}
        <span class="text-caption">
          {{ ANTECEDENTE_COVID.fuente }}
          <a
            :href="fuentePrincipal(ANTECEDENTE_COVID)!.url"
            target="_blank"
            rel="noopener noreferrer"
            class="cu-link ml-1"
            >Fuente</a
          >
        </span>
      </p>
    </section>

    <!-- Sanciones por documento: tres fórmulas, no una. -->
    <section aria-labelledby="sanciones-title" class="mb-6">
      <h2 id="sanciones-title" class="text-h6 font-weight-bold mb-2">
        Multas y recargos: cada documento trae su fórmula
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
        El reglamento remite al Código Tributario, el tarifario de fija fija porcentajes propios y
        el contrato móvil trae una tasa atada al BCU. Ninguna es "la de Antel" a secas.
      </p>
      <div class="table-wrap">
        <VTable density="comfortable" class="cu-mobile-cards">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Multa</th>
              <th>Recargo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in SANCIONES" :key="s.id">
              <td data-label="Documento" class="font-weight-medium" style="min-width: 200px">
                {{ s.documento }}
                <a
                  v-if="fuentePrincipal(s)"
                  :href="fuentePrincipal(s)!.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="cu-link text-caption ml-1"
                  >Fuente</a
                >
              </td>
              <td data-label="Multa" class="text-body-2">{{ s.multa }}</td>
              <td data-label="Recargo" class="text-body-2">{{ s.recargo }}</td>
            </tr>
          </tbody>
        </VTable>
      </div>
    </section>

    <!-- Reconexión -->
    <section aria-labelledby="reconexion-title" class="mb-6">
      <h2 id="reconexion-title" class="text-h6 font-weight-bold mb-2">
        Reconexión: cuánto tarda y qué cuesta
      </h2>
      <AntelHechosTabla :hechos="RECONEXION" />
    </section>

    <!-- El contrato -->
    <section aria-labelledby="contrato-title" class="mb-6">
      <h2 id="contrato-title" class="text-h6 font-weight-bold mb-2">
        Cuándo vence tu contrato y cómo saberlo
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
        Los plazos que Antel imprime en la tienda y en el tarifario. La fecha exacta de tu contrato
        no está en ninguna app: está en el contrato.
      </p>
      <div class="table-wrap mb-4">
        <VTable density="compact" class="cu-mobile-cards">
          <thead>
            <tr>
              <th>Plan</th>
              <th>Plazo</th>
              <th>Mensualidad (tarifario Datos 2026)</th>
              <th class="text-right">Fuente</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in PLAZOS_CONTRATO" :key="p.id">
              <td data-label="Plan" class="font-weight-medium">{{ p.plan }}</td>
              <td data-label="Plazo">{{ p.plazo }}</td>
              <td data-label="Mensualidad">{{ p.precio }}</td>
              <td data-label="Fuente" class="text-right text-caption">
                <a
                  v-if="fuentePrincipal(p)"
                  :href="fuentePrincipal(p)!.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="cu-link"
                  >{{ fuentePrincipal(p)!.publisher }}</a
                >
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <AntelHechosTabla :hechos="CONTRATO" />
    </section>

    <!-- Rescisión anticipada -->
    <section aria-labelledby="rescision-title" class="mb-6">
      <h2 id="rescision-title" class="text-h6 font-weight-bold mb-2">
        Irse antes de tiempo: cuánto cuesta
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
        No es un porcentaje ni una parte proporcional: es el saldo entero del contrato, más lo que
        no pagaste al entrar.
      </p>
      <AntelHechosTabla :hechos="RESCISION" />
    </section>

    <!-- Registro de morosos -->
    <section aria-labelledby="morosos-title" class="mb-6">
      <h2 id="morosos-title" class="text-h6 font-weight-bold mb-2">
        El registro de morosos de Antel no es el Clearing
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
        Es la confusión más cara de las dos direcciones: creer que una deuda con Antel te arruina el
        crédito en todos lados, o creer que estar limpio en el Clearing te alcanza para contratar.
      </p>
      <AntelHechosTabla :hechos="REGISTRO_MOROSOS" />
    </section>

    <!-- A favor del cliente -->
    <section aria-labelledby="favor-title" class="mb-6">
      <h2 id="favor-title" class="text-h6 font-weight-bold mb-2">Lo que juega para tu lado</h2>
      <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
        El reintegro por corte no llega solo: sale a solicitud del cliente.
      </p>
      <VList density="comfortable" class="rules" lines="two">
        <VListItem v-for="r in A_FAVOR_DEL_CLIENTE" :key="r.pregunta">
          <template #prepend>
            <VIcon icon="mdi-check-circle-outline" color="success" size="small" />
          </template>
          <VListItemTitle class="font-weight-medium text-wrap">{{ r.pregunta }}</VListItemTitle>
          <VListItemSubtitle class="text-wrap text-body-2">
            {{ r.respuesta }}
            <span class="text-caption text-medium-emphasis d-block">
              {{ r.fuente }}
              <a
                v-if="fuentePrincipal(r)"
                :href="fuentePrincipal(r)!.url"
                target="_blank"
                rel="noopener noreferrer"
                class="cu-link ml-1"
                >Fuente</a
              >
            </span>
          </VListItemSubtitle>
        </VListItem>
      </VList>
    </section>

    <!-- Reclamo -->
    <section aria-labelledby="reclamo-title" class="mb-6">
      <h2 id="reclamo-title" class="text-h6 font-weight-bold mb-2">
        Reclamar: primero Antel, después URSEC
      </h2>
      <VCard
        v-for="(paso, i) in RECLAMO"
        :key="paso.id"
        variant="outlined"
        class="mb-3 pa-4 paso-card"
      >
        <div class="d-flex align-start ga-3 mb-2">
          <VAvatar size="32" color="primary" variant="tonal" class="flex-shrink-0">
            {{ i + 1 }}
          </VAvatar>
          <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ paso.titulo }}</h3>
        </div>
        <p class="text-body-2 mb-1">{{ paso.detalle }}</p>
        <p class="text-caption text-medium-emphasis mb-0">
          {{ paso.fuente }}
          <a
            v-if="fuentePrincipal(paso)"
            :href="fuentePrincipal(paso)!.url"
            target="_blank"
            rel="noopener noreferrer"
            class="cu-link ml-1"
            >Fuente</a
          >
        </p>
      </VCard>
    </section>

    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

    <h2 class="text-h6 font-weight-bold mt-8 mb-2">De dónde sale esto</h2>
    <p class="text-body-2 text-medium-emphasis mb-2" style="max-width: 68ch">
      De los documentos de Antel, de URSEC y de las normas en IMPO, no de un resumen ni de un foro.
      Cada cifra de la página apunta a uno de estos documentos. Última lectura de todos:
      {{ verifiedAt }}.
    </p>
    <ul class="sources mb-6">
      <li v-for="src in ANTEL_DEUDA_SOURCES" :key="src.id">
        <a :href="src.url" target="_blank" rel="noopener noreferrer" class="cu-link">
          {{ src.publisher }}: {{ src.label }}
        </a>
        <span class="text-caption text-medium-emphasis"> (visto el {{ fecha(src.seenOn) }})</span>
      </li>
    </ul>

    <h2 class="text-h6 font-weight-bold mb-2">Seguir leyendo</h2>
    <div class="d-flex flex-wrap ga-3 mb-4">
      <NuxtLink :to="localePath('/factura-de-ute-uruguay')" class="cu-link">
        La factura de UTE
      </NuxtLink>
      <NuxtLink :to="localePath('/factura-de-ose-uruguay')" class="cu-link">
        La factura de OSE
      </NuxtLink>
      <NuxtLink :to="localePath('/salir-del-clearing')" class="cu-link">
        Salir del Clearing
      </NuxtLink>
      <NuxtLink :to="localePath('/saldar-deudas-uruguay')" class="cu-link">
        Negociar una deuda
      </NuxtLink>
      <NuxtLink :to="localePath('/defensa-al-consumidor-uruguay')" class="cu-link">
        Defensa al Consumidor
      </NuxtLink>
      <NuxtLink :to="localePath('/a-quien-le-reclamo-uruguay')" class="cu-link">
        A quién le reclamo
      </NuxtLink>
    </div>
  </VContainer>
</template>

<script setup lang="ts">
import {
  A_FAVOR_DEL_CLIENTE,
  ANTECEDENTE_COVID,
  ANTEL_DEUDA_FAQ,
  ANTEL_DEUDA_SOURCES,
  ANTEL_DEUDA_VERIFIED_AT,
  CONTRATO,
  ESCALERAS,
  PLAZOS_CONTRATO,
  RECLAMO,
  RECONEXION,
  REGISTRO_MOROSOS,
  RESCISION,
  SANCIONES,
  SECUENCIA,
  fuentePrincipal,
} from '~/utils/antelDeuda'
import type { FaqItem } from '~/utils/faqAnswers'

const localePath = useLocalePath()

function fecha(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

const verifiedAt = fecha(ANTEL_DEUDA_VERIFIED_AT)

const faq: FaqItem[] = ANTEL_DEUDA_FAQ.map(f => ({
  id: f.id,
  question: f.question,
  answer: f.answer,
}))

const canonicalUrl = 'https://cambio-uruguay.com/que-pasa-si-no-pago-antel'
const title = 'Antel: cuándo te corta y 72 h para volver'
const description =
  'Antel corta por facturas, no por días: en fijo la 2.ª impaga bloquea salientes, en móvil la 1.ª. ' +
  'Al pagar: 48 h hábiles el fijo, 72 h internet, sin cargo.'

defineOgImageComponent('Cambio', {
  title: 'Deuda con Antel',
  subtitle: 'Cuándo corta, cuánto tarda en volver y cuándo vence el contrato',
  tag: 'SERVICIOS',
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
        'que pasa si no pago antel, cuando antel te corta el servicio, antel cuanto demora en reconectar el internet, antel cuando vence mi contrato, deuda con antel, antel bloqueo por falta de pago, convenio de pago antel, antel clearing, reintegro corte antel, dar de baja antel con deuda, rescindir contrato antel, reclamo ursec antel',
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
                name: 'Inicio',
                item: 'https://cambio-uruguay.com/',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Qué pasa si no pagás Antel',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            dateModified: ANTEL_DEUDA_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            citation: ANTEL_DEUDA_SOURCES.map(s => ({
              '@type': 'CreativeWork',
              name: `${s.publisher}: ${s.label}`,
              url: s.url,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.table-wrap {
  overflow-x: auto;
}
.cu-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.cu-link:hover {
  text-decoration: underline;
}
.escaleras th {
  white-space: nowrap;
}
.sources {
  padding-left: 1.1rem;
  font-size: 0.9rem;
}
.sources li {
  margin-bottom: 4px;
}
.rules :deep(.v-list-item__prepend) {
  align-self: start;
  margin-top: 4px;
}
.paso-card h3 {
  margin-top: 4px;
}
</style>
