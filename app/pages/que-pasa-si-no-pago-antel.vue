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
      Caés en mora el mismo día del vencimiento y sin ningún aviso, después te bloquean, y si la
      deuda sigue te dan de baja los servicios. Lo que Antel no dice en ninguna parte es cuántos
      días hay entre una cosa y la otra. Acá está todo lo que sí está escrito, con el artículo al
      lado, y marcado lo que no lo está.
    </p>

    <!-- La secuencia primero: es la pregunta, y el segundo renglón es el que nadie más contesta. -->
    <h2 class="text-h6 font-weight-bold mb-2">Qué pasa, y en qué orden</h2>
    <VTimeline side="end" density="compact" class="mb-6">
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
        </div>
      </VTimelineItem>
    </VTimeline>

    <VAlert type="warning" variant="tonal" class="mb-6" density="comfortable">
      <div class="text-subtitle-2 font-weight-bold mb-1">
        El dato que falta, y por qué la mejor respuesta de Google hoy es un hilo de Reddit
      </div>
      <div class="text-body-2">
        El reglamento dice que la baja definitiva llega si la deuda no se cancela «dentro de los
        plazos establecidos», pero no dice cuáles son. Las preguntas frecuentes de facturación y las
        de telefonía fija tampoco los mencionan. Buscamos el número en los tres documentos públicos
        de Antel y no está: cualquier cantidad de días que leas por ahí no sale de una fuente de
        Antel. Si te pasó, lo único firme es llamar al 121 o pedir el convenio antes de que el
        bloqueo se convierta en supresión.
      </div>
    </VAlert>

    <h2 class="text-h6 font-weight-bold mb-2">El registro de morosos de Antel no es el Clearing</h2>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      Es la confusión más cara de las dos direcciones: creer que una deuda con Antel te arruina el
      crédito en todos lados, o creer que estar limpio en el Clearing te alcanza para contratar.
    </p>
    <div class="table-wrap mb-6">
      <VTable density="comfortable" class="cu-mobile-cards">
        <tbody>
          <tr v-for="r in REGISTRO_MOROSOS" :key="r.pregunta">
            <td data-label="Punto" class="font-weight-medium" style="min-width: 220px">
              {{ r.pregunta }}
            </td>
            <td data-label="Qué dice" class="text-body-2">{{ r.respuesta }}</td>
            <td data-label="Fuente" class="text-caption text-medium-emphasis text-right">
              {{ r.fuente }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </div>

    <h2 class="text-h6 font-weight-bold mb-2">Lo que juega para tu lado</h2>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      El reintegro por corte no llega solo: sale a solicitud del cliente.
    </p>
    <VList density="comfortable" class="rules mb-6" lines="two">
      <VListItem v-for="r in A_FAVOR_DEL_CLIENTE" :key="r.pregunta">
        <template #prepend>
          <VIcon icon="mdi-check-circle-outline" color="success" size="small" />
        </template>
        <VListItemTitle class="font-weight-medium text-wrap">{{ r.pregunta }}</VListItemTitle>
        <VListItemSubtitle class="text-wrap text-body-2">
          {{ r.respuesta }}
          <span class="text-caption text-medium-emphasis d-block">{{ r.fuente }}</span>
        </VListItemSubtitle>
      </VListItem>
    </VList>

    <h2 class="text-h6 font-weight-bold mb-2">Si vas a dar de baja</h2>
    <div class="table-wrap mb-6">
      <VTable density="comfortable" class="cu-mobile-cards">
        <tbody>
          <tr v-for="r in RESCISION" :key="r.pregunta">
            <td data-label="Punto" class="font-weight-medium" style="min-width: 220px">
              {{ r.pregunta }}
            </td>
            <td data-label="Qué dice" class="text-body-2">{{ r.respuesta }}</td>
            <td data-label="Fuente" class="text-caption text-medium-emphasis text-right">
              {{ r.fuente }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </div>

    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

    <h2 class="text-h6 font-weight-bold mt-8 mb-2">De dónde sale esto</h2>
    <p class="text-body-2 text-medium-emphasis mb-2" style="max-width: 68ch">
      De los documentos de la propia Antel, no de un resumen ni de un foro. Última lectura:
      {{ verifiedAt }}.
    </p>
    <ul class="sources mb-6">
      <li v-for="src in ANTEL_DEUDA_SOURCES" :key="src.label">
        <a :href="src.url" target="_blank" rel="noopener" class="cu-link">{{ src.label }}</a>
      </li>
    </ul>

    <h2 class="text-h6 font-weight-bold mb-2">Seguir leyendo</h2>
    <div class="d-flex flex-wrap ga-3 mb-4">
      <NuxtLink :to="localePath('/factura-de-ute-uruguay')" class="cu-link">
        La factura de UTE
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
    </div>
  </VContainer>
</template>

<script setup lang="ts">
import {
  A_FAVOR_DEL_CLIENTE,
  ANTEL_DEUDA_FAQ,
  ANTEL_DEUDA_SOURCES,
  ANTEL_DEUDA_VERIFIED_AT,
  REGISTRO_MOROSOS,
  RESCISION,
  SECUENCIA,
} from '~/utils/antelDeuda'
import type { FaqItem } from '~/utils/faqAnswers'

const localePath = useLocalePath()

const verifiedAt = new Date(`${ANTEL_DEUDA_VERIFIED_AT}T12:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const faq = ANTEL_DEUDA_FAQ as unknown as FaqItem[]

const canonicalUrl = 'https://cambio-uruguay.com/que-pasa-si-no-pago-antel'
const title = 'Qué pasa si no pagás Antel: mora el mismo día, bloqueo y 72 h para volver'
const description =
  'La mora corre el día del vencimiento y sin aviso. Después viene el bloqueo parcial o total, y la supresión definitiva si la deuda sigue. Al pagar, la reconexión tarda 48 horas hábiles en el fijo y 72 en internet. El plazo hasta el corte Antel no lo publica, y acá se dice.'

defineOgImageComponent('Cambio', {
  title: 'Deuda con Antel',
  subtitle: 'Bloqueo, baja y cuánto tarda la reconexión',
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
        'que pasa si no pago antel, cuando antel te corta el servicio, antel cuanto demora en reconectar el internet, deuda con antel, antel bloqueo por falta de pago, convenio de pago antel, antel clearing, reintegro corte antel, dar de baja antel con deuda',
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
              name: s.label,
              url: s.url,
            })),
          },
          {
            '@type': 'FAQPage',
            mainEntity: ANTEL_DEUDA_FAQ.map(f => ({
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
</style>
