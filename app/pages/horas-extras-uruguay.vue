<template>
  <VContainer class="horas py-6" style="max-width: 900px">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Horas extras', disabled: true },
      ]"
    />

    <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
      Horas extras en Uruguay: cuánto se pagan y cuántas te pueden pedir
    </h1>

    <p class="text-body-1 mb-4" style="max-width: 68ch">
      Una hora extra es la que pasa el límite de jornada que te aplica a vos, y no vale lo mismo un
      martes que un feriado. Acá está lo que dicen las cuatro normas que rigen el tema, con el
      artículo al lado de cada número.
    </p>

    <!-- Los dos recargos primero: es la pregunta. -->
    <h2 class="text-h6 font-weight-bold mb-2">Cuánto se paga</h2>
    <div class="table-wrap mb-6">
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th>Cuándo la hacés</th>
            <th class="text-right">Recargo</th>
            <th>Qué significa</th>
            <th class="text-right">Norma</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in RECARGOS" :key="r.cuando">
            <td data-label="Cuándo" class="font-weight-medium">{{ r.cuando }}</td>
            <td data-label="Recargo" class="text-right">
              <VChip size="small" color="primary" variant="flat">{{ r.recargo }}</VChip>
            </td>
            <td data-label="Qué significa" class="text-body-2">{{ r.detalle }}</td>
            <td data-label="Norma" class="text-right text-caption text-medium-emphasis">
              {{ r.articulo }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </div>

    <h2 class="text-h6 font-weight-bold mb-2">Desde cuándo es extra</h2>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      El límite no es el mismo en toda la actividad privada, y la diferencia entre 44 y 48 horas es
      una jornada entera al mes. La hora extra empieza donde termina el tope que te aplica.
    </p>
    <div class="table-wrap mb-6">
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th>Rama</th>
            <th>Por día</th>
            <th>Por semana</th>
            <th class="text-right">Norma</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in LIMITES_JORNADA" :key="l.rama">
            <td data-label="Rama" class="font-weight-medium">{{ l.rama }}</td>
            <td data-label="Por día">{{ l.diario }}</td>
            <td data-label="Por semana">{{ l.semanal }}</td>
            <td data-label="Norma" class="text-right text-caption text-medium-emphasis">
              {{ l.norma }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </div>

    <h2 class="text-h6 font-weight-bold mb-2">Las reglas que casi nadie sabe</h2>
    <VList density="comfortable" class="mb-6 rules">
      <VListItem v-for="r in REGLAS" :key="r.regla">
        <template #prepend>
          <VIcon icon="mdi-check-circle-outline" color="success" />
        </template>
        <VListItemTitle class="text-body-2" style="white-space: normal">
          {{ r.regla }}
          <span class="text-medium-emphasis">({{ r.articulo }})</span>
        </VListItemTitle>
      </VListItem>
    </VList>

    <h2 class="text-h6 font-weight-bold mb-2">El recargo nocturno es otra cosa</h2>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      Es la confusión más común en lo que hay publicado: el nocturno no es una hora extra, es un
      recargo por el horario, y sale de otra ley. Una misma hora puede ser extra, nocturna, o las
      dos.
    </p>
    <VList density="comfortable" class="mb-6 rules">
      <VListItem v-for="r in NOCTURNIDAD" :key="r.regla">
        <template #prepend>
          <VIcon icon="mdi-weather-night" color="primary" />
        </template>
        <VListItemTitle class="text-body-2" style="white-space: normal">
          {{ r.regla }}
          <span class="text-medium-emphasis">({{ r.articulo }})</span>
        </VListItemTitle>
      </VListItem>
    </VList>

    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

    <h2 class="text-h6 font-weight-bold mt-8 mb-2">De dónde salen estos números</h2>
    <p class="text-body-2 text-medium-emphasis mb-2" style="max-width: 68ch">
      Del texto vigente de cada norma, no de un resumen. Última lectura: {{ verifiedAt }}.
    </p>
    <ul class="sources mb-6">
      <li v-for="src in HORAS_EXTRAS_SOURCES" :key="src.url">
        <a :href="src.url" target="_blank" rel="noopener" class="cu-link">{{ src.label }}</a>
      </li>
    </ul>

    <h2 class="text-h6 font-weight-bold mb-2">Seguir leyendo</h2>
    <div class="d-flex flex-wrap ga-3 mb-4">
      <NuxtLink :to="localePath('/licencias-especiales-uruguay')" class="cu-link">
        Licencias especiales
      </NuxtLink>
      <NuxtLink :to="localePath('/salario-vacacional-uruguay')" class="cu-link">
        Salario vacacional
      </NuxtLink>
      <NuxtLink :to="localePath('/cuando-se-cobra-el-aguinaldo-uruguay')" class="cu-link">
        Cuándo se cobra el aguinaldo
      </NuxtLink>
      <NuxtLink :to="localePath('/herramientas/calculadora-sueldo-liquido')" class="cu-link">
        Calculadora de sueldo líquido
      </NuxtLink>
    </div>

    <p class="text-caption text-medium-emphasis">
      Esto es información general sobre la ley, no asesoramiento legal para tu caso. Si te deben
      horas extras, la consulta va al Ministerio de Trabajo o a tu sindicato.
    </p>
  </VContainer>
</template>

<script setup lang="ts">
import {
  HORAS_EXTRAS_FAQ,
  HORAS_EXTRAS_SOURCES,
  HORAS_EXTRAS_VERIFIED_AT,
  LIMITES_JORNADA,
  NOCTURNIDAD,
  RECARGOS,
  REGLAS,
} from '~/utils/horasExtras'
import type { FaqItem } from '~/utils/faqAnswers'

const localePath = useLocalePath()

const verifiedAt = new Date(`${HORAS_EXTRAS_VERIFIED_AT}T12:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const faq = HORAS_EXTRAS_FAQ as unknown as FaqItem[]

const canonicalUrl = 'https://cambio-uruguay.com/horas-extras-uruguay'
const title = 'Horas extras en Uruguay: 100 % en día hábil, 150 % en feriado'
const description =
  'La hora extra se paga con 100 % de recargo en día hábil y 150 % en feriado o descanso semanal (Ley 15.996). El tope es de 8 por semana y requieren tu consentimiento. La hora extra empieza donde termina tu jornada: 48 horas semanales en la industria, 44 en el comercio.'

defineOgImageComponent('Cambio', {
  title: 'Horas extras en Uruguay',
  subtitle: '100 % en día hábil, 150 % en feriado',
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
        'horas extras uruguay, cuanto se paga la hora extra en uruguay, tope horas extras uruguay, horas extras uruguay ley, me pueden obligar a hacer horas extras, horas extras nocturnas uruguay, recargo 100 por ciento hora extra, ley 15996, jornada laboral uruguay 44 48 horas, trabajo nocturno uruguay 20 por ciento',
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
                name: 'Horas extras en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            dateModified: HORAS_EXTRAS_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            citation: HORAS_EXTRAS_SOURCES.map(s => ({
              '@type': 'Legislation',
              name: s.label,
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
