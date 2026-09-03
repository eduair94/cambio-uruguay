<template>
  <VContainer class="licencias py-6" style="max-width: 900px">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Licencias especiales', disabled: true },
      ]"
    />

    <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
      Licencias especiales en Uruguay: los días que te da la ley
    </h1>

    <p class="text-body-1 mb-4" style="max-width: 68ch">
      Además de los 20 días de licencia anual, la Ley 18.345 le da a todo trabajador de la actividad
      privada una serie de días pagos por situaciones puntuales: un fallecimiento, un casamiento, un
      examen. Son un mínimo, no se descuentan de la licencia anual y no se pueden cambiar por plata.
      Acá está cada una con lo que dice el artículo, y —lo que casi nunca se aclara— también los
      casos en los que la ley <strong>no</strong> te da nada.
    </p>

    <!-- La tabla por parentesco va primero porque es la pregunta que más se busca, y porque las
         filas de 0 días son las que nadie contesta. -->
    <h2 class="text-h6 font-weight-bold mb-2">Días por fallecimiento, según el parentesco</h2>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      El artículo 7 nombra ocho parentescos y ninguno más. Si el tuyo no está en la lista, la ley no
      te da días — aunque el convenio colectivo de tu rama sí puede dártelos.
    </p>
    <div class="table-wrap mb-6">
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th>Parentesco</th>
            <th class="text-right">Días hábiles</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in DUELO_POR_PARENTESCO" :key="row.parentesco">
            <td data-label="Parentesco">{{ row.parentesco }}</td>
            <td data-label="Días hábiles" class="text-right">
              <VChip
                size="small"
                :color="row.dias > 0 ? 'success' : undefined"
                :variant="row.dias > 0 ? 'flat' : 'outlined'"
              >
                {{ row.dias > 0 ? row.dias : 'Ninguno por ley' }}
              </VChip>
            </td>
            <td data-label="Detalle" class="text-body-2 text-medium-emphasis">
              {{ row.nota || '—' }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </div>

    <h2 class="text-h6 font-weight-bold mb-2">Todas las licencias especiales</h2>
    <div class="table-wrap mb-6">
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th>Licencia</th>
            <th>Cuánto da</th>
            <th>Condiciones</th>
            <th class="text-right">Artículo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="lic in LICENCIAS_ESPECIALES" :key="lic.slug">
            <td data-label="Licencia" class="font-weight-medium">
              {{ lic.nombre }}
              <div v-if="lic.verTambien" class="text-caption">
                <NuxtLink :to="localePath(lic.verTambien.to)" class="cu-link">
                  {{ lic.verTambien.label }}
                </NuxtLink>
              </div>
            </td>
            <td data-label="Cuánto da" class="font-weight-medium">{{ lic.dias }}</td>
            <td data-label="Condiciones" class="text-body-2">{{ lic.detalle }}</td>
            <td data-label="Artículo" class="text-right text-medium-emphasis">
              Art. {{ lic.articulo }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </div>

    <h2 class="text-h6 font-weight-bold mb-2">Lo que vale para todas</h2>
    <VList density="comfortable" class="mb-6 rules">
      <VListItem v-for="regla in REGLAS_COMUNES" :key="regla.regla">
        <template #prepend>
          <VIcon icon="mdi-check-circle-outline" color="success" />
        </template>
        <VListItemTitle class="text-body-2" style="white-space: normal">
          {{ regla.regla }}
          <span class="text-medium-emphasis">(art. {{ regla.articulo }})</span>
        </VListItemTitle>
      </VListItem>
    </VList>

    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

    <h2 class="text-h6 font-weight-bold mt-8 mb-2">De dónde salen estos días</h2>
    <p class="text-body-2 text-medium-emphasis mb-2" style="max-width: 68ch">
      Todo lo de esta página sale del texto vigente de la ley, no de un resumen. Última lectura de
      la norma: {{ verifiedAt }}.
    </p>
    <ul class="sources mb-6">
      <li v-for="src in LICENCIAS_SOURCES" :key="src.url">
        <a :href="src.url" target="_blank" rel="noopener" class="cu-link">{{ src.label }}</a>
      </li>
    </ul>

    <h2 class="text-h6 font-weight-bold mb-2">Seguir leyendo</h2>
    <div class="d-flex flex-wrap ga-3 mb-4">
      <NuxtLink :to="localePath('/salario-vacacional-uruguay')" class="cu-link">
        Salario vacacional
      </NuxtLink>
      <NuxtLink :to="localePath('/licencia-por-maternidad-y-paternidad-uruguay')" class="cu-link">
        Maternidad y paternidad
      </NuxtLink>
      <NuxtLink :to="localePath('/renunciar-al-trabajo-uruguay')" class="cu-link">
        Renunciar al trabajo
      </NuxtLink>
      <NuxtLink :to="localePath('/indemnizacion-por-despido-uruguay')" class="cu-link">
        Indemnización por despido
      </NuxtLink>
      <NuxtLink :to="localePath('/cuando-se-cobra-el-aguinaldo-uruguay')" class="cu-link">
        Cuándo se cobra el aguinaldo
      </NuxtLink>
    </div>

    <p class="text-caption text-medium-emphasis">
      Esto es información general sobre la ley, no asesoramiento legal para tu caso. Si tu empleador
      te niega una licencia que la ley te da, la consulta va al Ministerio de Trabajo o a tu
      sindicato.
    </p>
  </VContainer>
</template>

<script setup lang="ts">
import {
  DUELO_POR_PARENTESCO,
  LICENCIAS_ESPECIALES,
  LICENCIAS_FAQ,
  LICENCIAS_SOURCES,
  LICENCIAS_VERIFIED_AT,
  REGLAS_COMUNES,
} from '~/utils/licenciasEspeciales'
import type { FaqItem } from '~/utils/faqAnswers'

const localePath = useLocalePath()

const verifiedAt = new Date(`${LICENCIAS_VERIFIED_AT}T12:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const faq = LICENCIAS_FAQ as unknown as FaqItem[]

const canonicalUrl = 'https://cambio-uruguay.com/licencias-especiales-uruguay'
const title = 'Licencias especiales en Uruguay: días por duelo, matrimonio y estudio'
const description =
  'Por fallecimiento de padre, madre, hijo, cónyuge, concubino o hermano son 3 días hábiles pagos (Ley 18.345, art. 7). Por abuelo, tío o suegro la ley no da ninguno. Matrimonio 3 días, estudio 6, 9 o 12 al año. No se descuentan de la licencia anual ni se cambian por plata.'

defineOgImageComponent('Cambio', {
  title: 'Licencias especiales en Uruguay',
  subtitle: 'Los días que te da la ley, y los que no',
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
        'licencia por duelo uruguay, dias por fallecimiento uruguay, cuantos dias de licencia por fallecimiento, licencia por fallecimiento de abuelo, licencia por matrimonio uruguay, licencia por estudio uruguay, licencias especiales ley 18345, dias por fallecimiento de padre, licencia por duelo hermano',
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
                name: 'Licencias especiales en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            dateModified: LICENCIAS_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            citation: LICENCIAS_SOURCES.map(s => ({
              '@type': 'CreativeWork',
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
