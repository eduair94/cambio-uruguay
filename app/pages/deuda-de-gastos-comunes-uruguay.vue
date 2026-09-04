<template>
  <VContainer class="gastos py-6" style="max-width: 900px">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Deuda de gastos comunes', disabled: true },
      ]"
    />

    <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
      Deuda de gastos comunes: qué pueden hacerte y cuándo prescribe
    </h1>

    <p class="text-body-1 mb-4" style="max-width: 68ch">
      Prescriben a los cuatro años, el interés es del 12 % anual y no se capitaliza, y la cuenta que
      aprobó la asamblea ya es título ejecutivo. Lo importante viene después: nada de eso se puede
      cambiar por reglamento, por más que lo hayas firmado.
    </p>

    <!-- El orden público primero como alerta: es lo que invalida la mitad de los reglamentos. -->
    <VAlert type="info" variant="tonal" class="mb-6" density="comfortable">
      <div class="text-subtitle-2 font-weight-bold mb-1">{{ ORDEN_PUBLICO.titulo }}</div>
      <div class="text-body-2">
        {{ ORDEN_PUBLICO.texto }}
        <span class="text-caption text-medium-emphasis d-block mt-1">
          {{ ORDEN_PUBLICO.articulo }}
        </span>
      </div>
    </VAlert>

    <h2 class="text-h6 font-weight-bold mb-2">Qué dice la ley sobre la deuda</h2>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      El artículo 14 del Decreto-Ley 14.560 lleva la redacción que le dio la Ley 19.604 en 2018. La
      anterior decía otra cosa, así que cualquier texto de antes de esa fecha puede estar hablando
      de otro régimen.
    </p>
    <div class="table-wrap mb-6">
      <VTable density="comfortable" class="cu-mobile-cards">
        <tbody>
          <tr v-for="r in LA_DEUDA" :key="r.titulo">
            <td data-label="Punto" class="font-weight-medium" style="min-width: 250px">
              {{ r.titulo }}
            </td>
            <td data-label="Qué dice" class="text-body-2">{{ r.texto }}</td>
            <td data-label="Norma" class="text-caption text-medium-emphasis text-right">
              {{ r.articulo }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </div>

    <h2 class="text-h6 font-weight-bold mb-2">Cómo se reparte lo que se paga</h2>
    <VList density="comfortable" class="rules mb-6" lines="two">
      <VListItem v-for="r in EL_REPARTO" :key="r.titulo">
        <template #prepend>
          <VIcon icon="mdi-home-city-outline" color="primary" size="small" />
        </template>
        <VListItemTitle class="font-weight-medium text-wrap">{{ r.titulo }}</VListItemTitle>
        <VListItemSubtitle class="text-wrap text-body-2">
          {{ r.texto }}
          <span class="text-caption text-medium-emphasis d-block">{{ r.articulo }}</span>
        </VListItemSubtitle>
      </VListItem>
    </VList>

    <!-- La parte honesta: la pregunta más buscada no la contestan estas normas. -->
    <h2 class="text-h6 font-weight-bold mb-2">Lo que estas normas no contestan</h2>
    <VAlert
      v-for="r in SIN_RESPUESTA"
      :key="r.titulo"
      type="warning"
      variant="tonal"
      class="mb-6"
      density="comfortable"
    >
      <div class="text-subtitle-2 font-weight-bold mb-1">{{ r.titulo }}</div>
      <div class="text-body-2">{{ r.texto }}</div>
    </VAlert>

    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

    <h2 class="text-h6 font-weight-bold mt-8 mb-2">De dónde sale esto</h2>
    <p class="text-body-2 text-medium-emphasis mb-2" style="max-width: 68ch">
      Del texto vigente de cada norma, no de un resumen. Última lectura: {{ verifiedAt }}.
    </p>
    <ul class="sources mb-6">
      <li v-for="src in GASTOS_COMUNES_SOURCES" :key="src.url">
        <a :href="src.url" target="_blank" rel="noopener" class="cu-link">{{ src.label }}</a>
      </li>
    </ul>

    <h2 class="text-h6 font-weight-bold mb-2">Seguir leyendo</h2>
    <div class="d-flex flex-wrap ga-3 mb-4">
      <NuxtLink :to="localePath('/alquilar-en-uruguay')" class="cu-link">
        Alquilar en Uruguay
      </NuxtLink>
      <NuxtLink :to="localePath('/comprar-o-alquilar-uruguay')" class="cu-link">
        Comprar o alquilar
      </NuxtLink>
      <NuxtLink :to="localePath('/saldar-deudas-uruguay')" class="cu-link">
        Negociar una deuda
      </NuxtLink>
      <NuxtLink :to="localePath('/ley-de-usura-uruguay')" class="cu-link">Ley de usura</NuxtLink>
    </div>
  </VContainer>
</template>

<script setup lang="ts">
import {
  EL_REPARTO,
  GASTOS_COMUNES_FAQ,
  GASTOS_COMUNES_SOURCES,
  GASTOS_COMUNES_VERIFIED_AT,
  LA_DEUDA,
  ORDEN_PUBLICO,
  SIN_RESPUESTA,
} from '~/utils/gastosComunes'
import type { FaqItem } from '~/utils/faqAnswers'

const localePath = useLocalePath()

const verifiedAt = new Date(`${GASTOS_COMUNES_VERIFIED_AT}T12:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const faq = GASTOS_COMUNES_FAQ as unknown as FaqItem[]

const canonicalUrl = 'https://cambio-uruguay.com/deuda-de-gastos-comunes-uruguay'
const title = 'Deuda de gastos comunes en Uruguay'
const description =
  'La cuenta aprobada por la asamblea es título ejecutivo, la deuda se actualiza aunque nadie reclame, el interés es del 12 % anual y no se capitaliza, y prescribe a los cuatro años. Todo eso es de orden público: el reglamento del edificio no lo puede cambiar.'

defineOgImageComponent('Cambio', {
  title: 'Deuda de gastos comunes',
  subtitle: '4 años, 12 % y sin capitalizar',
  tag: 'VIVIENDA',
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
        'ley gastos comunes uruguay, prescripcion gastos comunes uruguay, deuda de gastos comunes, gastos comunes titulo ejecutivo, interes gastos comunes 12 por ciento, decreto ley 14560 articulo 14, ley 19604, propiedad horizontal uruguay ley 10751, quien paga el ascensor planta baja, comprar apartamento con deuda de gastos comunes',
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
                name: 'Deuda de gastos comunes',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            dateModified: GASTOS_COMUNES_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            citation: GASTOS_COMUNES_SOURCES.map(s => ({
              '@type': 'Legislation',
              name: s.label,
              url: s.url,
            })),
          },
          {
            '@type': 'FAQPage',
            mainEntity: GASTOS_COMUNES_FAQ.map(f => ({
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
