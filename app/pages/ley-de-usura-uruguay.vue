<template>
  <VContainer class="usura py-6" style="max-width: 900px">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Ley de usura', disabled: true },
      ]"
    />

    <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
      Ley de usura en Uruguay: cuál es el tope y qué pasa si te lo pasan
    </h1>

    <p class="text-body-1 mb-4" style="max-width: 68ch">
      El tope no es un número fijo: es un porcentaje por encima de la tasa media que publica el
      Banco Central, y cambia según cómo te cobren el crédito. Acá están los seis topes del artículo
      11, qué entra en la cuenta —que es más de lo que dice el contrato— y qué pasa exactamente
      cuando se configura usura.
    </p>

    <!-- Los topes primero: es la pregunta. -->
    <h2 class="text-h6 font-weight-bold mb-2">Los seis topes de la ley</h2>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      Cada uno es un recargo máximo sobre la tasa media del BCU del trimestre anterior a la fecha en
      que se firmó.
    </p>
    <div class="table-wrap mb-4">
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th>Tu caso</th>
            <th class="text-right">Tope</th>
            <th>Qué significa</th>
            <th class="text-right">Norma</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in TOPES" :key="t.caso">
            <td data-label="Tu caso" class="font-weight-medium">{{ t.caso }}</td>
            <td data-label="Tope" class="text-right">
              <VChip size="small" :color="t.recargo <= 30 ? 'success' : 'primary'" variant="flat">
                +{{ t.recargo }} %
              </VChip>
            </td>
            <td data-label="Qué significa" class="text-body-2">{{ t.detalle }}</td>
            <td data-label="Norma" class="text-right text-caption text-medium-emphasis">
              {{ t.articulo }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </div>

    <!-- La tasa media viva. Es el otro factor del producto y se mueve todos los meses. -->
    <VCard v-if="capsPeriodo" variant="tonal" color="primary" class="pa-4 mb-6">
      <div class="text-subtitle-2 font-weight-bold mb-1">
        La tasa media contra la que se mide, hoy
      </div>
      <p class="text-body-2 mb-2">
        El BCU republica esta tabla todos los meses sobre un trimestre móvil. La que rige desde el
        {{ capsVigenteDesde }} corresponde al período {{ capsPeriodo }}.
      </p>
      <div class="table-wrap">
        <VTable density="compact" class="cu-mobile-cards bg-transparent">
          <thead>
            <tr>
              <th>Crédito al consumo, en pesos</th>
              <th class="text-right">Tasa media</th>
              <th class="text-right">Tope (+55 %)</th>
              <th class="text-right">Tope en mora (+80 %)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in capsRows" :key="row.label">
              <td data-label="Crédito">{{ row.label }}</td>
              <td data-label="Tasa media" class="text-right">{{ row.media }}</td>
              <td data-label="Tope" class="text-right font-weight-medium">{{ row.tope }}</td>
              <td data-label="Tope en mora" class="text-right">{{ row.topeMora }}</td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <p class="text-caption mt-2 mb-0">
        Son las filas de consumo a familias sin autorización de descuento. Para el detalle por
        emisor y una calculadora de cuánto sale un adelanto,
        <NuxtLink :to="localePath('/adelanto-de-efectivo-tarjeta-de-credito')" class="cu-link">
          mirá el adelanto de efectivo
        </NuxtLink>
        .
      </p>
    </VCard>

    <h2 class="text-h6 font-weight-bold mb-2">Qué entra en la cuenta</h2>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      Esta es la parte que más se ignora, y la que cambia el resultado: el tope no se mide contra la
      tasa que dice el contrato.
    </p>
    <VList density="comfortable" class="rules mb-6" lines="two">
      <VListItem v-for="r in QUE_CUENTA" :key="r.titulo">
        <template #prepend>
          <VIcon icon="mdi-calculator-variant-outline" color="primary" size="small" />
        </template>
        <VListItemTitle class="font-weight-medium text-wrap">{{ r.titulo }}</VListItemTitle>
        <VListItemSubtitle class="text-wrap text-body-2">
          {{ r.texto }}
          <span class="text-caption text-medium-emphasis d-block">{{ r.articulo }}</span>
        </VListItemSubtitle>
      </VListItem>
    </VList>

    <h2 class="text-h6 font-weight-bold mb-2">Qué pasa si hay usura</h2>
    <div class="table-wrap mb-6">
      <VTable density="comfortable" class="cu-mobile-cards">
        <tbody>
          <tr v-for="c in CONSECUENCIAS" :key="c.titulo">
            <td data-label="Consecuencia" class="font-weight-medium" style="min-width: 230px">
              {{ c.titulo }}
            </td>
            <td data-label="Qué dice" class="text-body-2">{{ c.texto }}</td>
            <td data-label="Norma" class="text-caption text-medium-emphasis text-right">
              {{ c.articulo }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </div>

    <VAlert type="success" variant="tonal" class="mb-6" density="comfortable">
      <div class="text-subtitle-2 font-weight-bold mb-1">
        El artículo que casi nadie cita, y que resuelve muchas deudas viejas y chicas
      </div>
      <ul class="rights mb-0">
        <li v-for="p in PEQUENOS_CREDITOS" :key="p.titulo">
          <strong>{{ p.titulo }}.</strong> {{ p.texto }}
          <span class="text-caption text-medium-emphasis">({{ p.articulo }})</span>
        </li>
      </ul>
    </VAlert>

    <h2 class="text-h6 font-weight-bold mb-2">A quién reclamarle</h2>
    <VRow class="mb-6">
      <VCol v-for="c in CONTROL" :key="c.titulo" cols="12" md="6">
        <VCard variant="outlined" class="pa-4 h-100">
          <div class="text-subtitle-2 font-weight-bold mb-1">{{ c.titulo }}</div>
          <p class="text-body-2 mb-1">{{ c.texto }}</p>
          <div class="text-caption text-medium-emphasis">{{ c.articulo }}</div>
        </VCard>
      </VCol>
    </VRow>

    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

    <h2 class="text-h6 font-weight-bold mt-8 mb-2">De dónde sale esto</h2>
    <p class="text-body-2 text-medium-emphasis mb-2" style="max-width: 68ch">
      Del texto vigente de la ley, no de un resumen. El artículo 11 tiene la redacción que le dio la
      Ley 19.732 en 2018; la anterior tenía otros topes. Última lectura: {{ verifiedAt }}.
    </p>
    <ul class="sources mb-6">
      <li v-for="src in LEY_USURA_SOURCES" :key="src.url">
        <a :href="src.url" target="_blank" rel="noopener" class="cu-link">{{ src.label }}</a>
      </li>
    </ul>

    <h2 class="text-h6 font-weight-bold mb-2">Seguir leyendo</h2>
    <div class="d-flex flex-wrap ga-3 mb-4">
      <NuxtLink :to="localePath('/saldar-deudas-uruguay')" class="cu-link">
        Negociar una deuda
      </NuxtLink>
      <NuxtLink :to="localePath('/salir-del-clearing')" class="cu-link">
        Salir del Clearing
      </NuxtLink>
      <NuxtLink :to="localePath('/mejores-prestamos-uruguay')" class="cu-link">
        Comparar préstamos
      </NuxtLink>
      <NuxtLink :to="localePath('/adelanto-de-efectivo-tarjeta-de-credito')" class="cu-link">
        Adelanto de efectivo
      </NuxtLink>
    </div>
  </VContainer>
</template>

<script setup lang="ts">
import {
  CONSECUENCIAS,
  CONTROL,
  LEY_USURA_FAQ,
  LEY_USURA_SOURCES,
  LEY_USURA_VERIFIED_AT,
  PEQUENOS_CREDITOS,
  QUE_CUENTA,
  TOPES,
} from '~/utils/leyUsura'
import type { FaqItem } from '~/utils/faqAnswers'

const localePath = useLocalePath()

// El `transform` no es cosmético: sin él Nuxt serializa la respuesta entera en __NUXT_DATA__, y en
// esta página sólo se muestran dos filas de las seis. La familia /historico ya pagó esa lección con
// 1,18 MB de payload que ningún lector usaba.
const { data: caps } = await useFetch('/api/bcu-rates', {
  key: 'usura-bcu-rates',
  server: true,
  default: () => null,
  transform: (res: any) => {
    if (!res?.rows?.length) return null
    const pct = (n: number) =>
      `${(n * 100).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`
    const pick = (bracket: string) =>
      res.rows.find((r: any) => r.bracket === bracket && r.cortoPlazo && r.currency === 'UYU')
    const rows = [
      { label: 'Menos de 10.000 UI', row: pick('menor10kUI') },
      { label: '10.000 UI o más', row: pick('mayor10kUI') },
    ]
      .filter(x => x.row)
      .map(x => ({
        label: x.label,
        media: pct(x.row.media),
        tope: pct(x.row.tope),
        topeMora: pct(x.row.topeMora),
      }))
    return rows.length ? { periodo: res.periodo, vigenteDesde: res.vigenteDesde, rows } : null
  },
})

const capsRows = computed(() => caps.value?.rows ?? [])
const capsPeriodo = computed(() => caps.value?.periodo ?? '')
const capsVigenteDesde = computed(() => {
  const iso = caps.value?.vigenteDesde
  if (!iso) return ''
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
})

const verifiedAt = new Date(`${LEY_USURA_VERIFIED_AT}T12:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const faq = LEY_USURA_FAQ as unknown as FaqItem[]

const canonicalUrl = 'https://cambio-uruguay.com/ley-de-usura-uruguay'
const title = 'Ley de usura en Uruguay: los seis topes y qué pasa si te los pasan'
const description =
  'El tope legal es un recargo sobre la tasa media del BCU: 55 % en un crédito común, 20 % si es Crédito de Nómina, 30 % en otras retenciones, 80 % en mora. Se mide contra la tasa implícita, que incluye comisiones, gastos y seguros. Si hay usura caduca todo lo accesorio y lo ya cobrado se descuenta del capital.'

defineOgImageComponent('Cambio', {
  title: 'Ley de usura en Uruguay',
  subtitle: 'Los seis topes del artículo 11',
  tag: 'CRÉDITO',
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
        'ley usura uruguay, ley 18212, tasa maxima legal uruguay, topes de interes bcu, usura civil, usura penal, intereses usurarios, credito de nomina tope, tasa implicita, caducidad intereses moratorios 24 meses',
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
                name: 'Ley de usura en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            dateModified: LEY_USURA_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            citation: LEY_USURA_SOURCES.map(s => ({
              '@type': 'Legislation',
              name: s.label,
              url: s.url,
            })),
          },
          {
            '@type': 'FAQPage',
            mainEntity: LEY_USURA_FAQ.map(f => ({
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
.rights {
  padding-left: 1.1rem;
}
.rights li {
  margin-bottom: 6px;
}
.rules :deep(.v-list-item__prepend) {
  align-self: start;
  margin-top: 4px;
}
</style>
